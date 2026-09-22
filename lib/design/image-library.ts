import { isDataImage, MAX_UPLOAD_BYTES } from "./model";
import type { ImageMime } from "./upload";

/**
 * Pustaka gambar milik user, disimpan di IndexedDB browser di komputernya sendiri. Tidak ada gambar yang
 * dikirim ke server. Gambar dipakai dengan menyalin data URI-nya ke desain, karena OBS memuat halaman dari
 * youtube.com dan Chromium memblokir file lokal (file://) dari halaman https, jadi gambar harus ikut
 * tertanam di CSS agar muncul di OBS.
 */
export interface LibraryImage {
  id: string;
  name: string;
  mime: ImageMime;
  bytes: number;
  width: number;
  height: number;
  dataUri: string;
  createdAt: number;
}

export type LibraryStatus = "loading" | "ready" | "memory";
export interface LibrarySnapshot {
  items: LibraryImage[];
  status: LibraryStatus;
}

export const MAX_LIBRARY_ITEMS = 60;
export const MAX_LIBRARY_BYTES = 12 * 1024 * 1024;

/** Penyimpanan kunci-nilai minimal, supaya IndexedDB bisa diganti memori untuk uji dan saat IndexedDB tidak tersedia. */
export interface Backend {
  readonly persistent: boolean;
  all(): Promise<LibraryImage[]>;
  put(item: LibraryImage): Promise<void>;
  del(id: string): Promise<void>;
  clear(): Promise<void>;
}

export function memoryBackend(): Backend {
  const map = new Map<string, LibraryImage>();
  return {
    persistent: false,
    all: async () => [...map.values()],
    put: async (i) => void map.set(i.id, i),
    del: async (id) => void map.delete(id),
    clear: async () => map.clear(),
  };
}

const DB_NAME = "lazycustom-images";
const STORE = "images";

const wrap = <T,>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

/** IndexedDB, atau null bila tidak ada (mode privat di beberapa browser, atau dinonaktifkan). */
export async function openIndexedDb(): Promise<Backend | null> {
  if (typeof indexedDB === "undefined") return null;
  let db: IDBDatabase;
  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("blocked"));
    });
  } catch {
    return null;
  }
  const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
  return {
    persistent: true,
    all: () => wrap(tx("readonly").getAll() as IDBRequest<LibraryImage[]>),
    put: async (i) => void (await wrap(tx("readwrite").put(i))),
    del: async (id) => void (await wrap(tx("readwrite").delete(id))),
    clear: async () => void (await wrap(tx("readwrite").clear())),
  };
}

const ID_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
function newId(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("");
}

/** Nama tampilan: tanpa karakter kontrol, tanpa ekstensi, maksimal 40 karakter. */
export function cleanName(raw: string): string {
  const base = raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").replace(/\.[a-z0-9]{2,5}$/i, "").trim();
  return (base || "Gambar").slice(0, 40);
}

export type AddInput = Pick<LibraryImage, "name" | "mime" | "bytes" | "width" | "height" | "dataUri">;
export type AddResult =
  | { ok: true; item: LibraryImage; duplicate: boolean }
  | { ok: false; reason: "INVALID" | "FULL" | "STORAGE_FAILED" };

export function createImageLibrary(openBackend: () => Promise<Backend | null> = openIndexedDb) {
  let snapshot: LibrarySnapshot = { items: [], status: "loading" };
  let backend: Backend | null = null;
  let starting: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const emit = (next: LibrarySnapshot) => {
    snapshot = next;
    listeners.forEach((l) => l());
  };
  const sorted = (items: LibraryImage[]) => [...items].sort((a, b) => b.createdAt - a.createdAt);

  function start(): Promise<void> {
    starting ??= (async () => {
      backend = (await openBackend()) ?? memoryBackend();
      let items: LibraryImage[] = [];
      try {
        items = (await backend.all()).filter((i) => isDataImage(i.dataUri));
      } catch {
        backend = memoryBackend();
      }
      emit({ items: sorted(items), status: backend.persistent ? "ready" : "memory" });
    })();
    return starting;
  }

  return {
    subscribe(cb: () => void) {
      listeners.add(cb);
      void start();
      return () => void listeners.delete(cb);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: (): LibrarySnapshot => ({ items: [], status: "loading" }),
    ready: start,

    async add(input: AddInput): Promise<AddResult> {
      await start();
      if (!isDataImage(input.dataUri) || input.bytes > MAX_UPLOAD_BYTES) return { ok: false, reason: "INVALID" };
      const same = snapshot.items.find((i) => i.dataUri === input.dataUri);
      if (same) return { ok: true, item: same, duplicate: true };
      const total = snapshot.items.reduce((n, i) => n + i.bytes, 0);
      if (snapshot.items.length >= MAX_LIBRARY_ITEMS || total + input.bytes > MAX_LIBRARY_BYTES) return { ok: false, reason: "FULL" };
      const item: LibraryImage = { ...input, name: cleanName(input.name), id: newId(), createdAt: Date.now() };
      try {
        await backend!.put(item);
      } catch {
        return { ok: false, reason: "STORAGE_FAILED" };
      }
      emit({ ...snapshot, items: sorted([...snapshot.items, item]) });
      return { ok: true, item, duplicate: false };
    },

    async remove(id: string): Promise<boolean> {
      await start();
      try {
        await backend!.del(id);
      } catch {
        return false;
      }
      emit({ ...snapshot, items: snapshot.items.filter((i) => i.id !== id) });
      return true;
    },

    async clear(): Promise<boolean> {
      await start();
      try {
        await backend!.clear();
      } catch {
        return false;
      }
      emit({ ...snapshot, items: [] });
      return true;
    },
  };
}

export const imageLibrary = createImageLibrary();
