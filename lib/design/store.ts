import type { ErrorCode } from "../errors";
import { report } from "../report";
import { designsEqual, newId, parseDesign, type Design, type TemplateId } from "./model";
import { DEFAULT_DESIGN, DEFAULT_TEMPLATE_ID, designFromTemplate } from "./templates";

/**
 * Penyimpanan desain di browser (localStorage) sebagai external store, dipakai lewat
 * useSyncExternalStore supaya render server dan browser tetap cocok.
 *
 * - Banyak desain tersimpan (My Designs), satu yang aktif.
 * - Undo dan redo hidup di memori untuk desain yang sedang aktif. Perubahan beruntun
 *   dengan kunci yang sama (misalnya menggeser slider) digabung jadi satu langkah.
 */
const KEY = "lazycustom:designs:v2";
export const MAX_DESIGNS = 20;
const SAVE_DELAY_MS = 300;
const HISTORY_LIMIT = 60;
const COALESCE_MS = 800;
const ID_RE = /^d-[a-z0-9]{8}$/;

export type StoreIssue = Extract<
  ErrorCode,
  "STORAGE_BLOCKED" | "STORAGE_CORRUPT" | "SHARE_INVALID" | "SHARE_TOO_LARGE" | "DESIGN_LIMIT"
> | null;
export type StoreNotice = "shared-opened" | null;

export interface SavedMeta {
  id: string;
  name: string;
  templateId: TemplateId;
  updatedAt: number;
}

export interface Snapshot {
  design: Design;
  activeId: string;
  saved: SavedMeta[];
  canUndo: boolean;
  canRedo: boolean;
  issue: StoreIssue;
  /** Kode laporan untuk issue di atas, sama dengan yang tercatat di log developer. */
  issueRef: string | null;
  notice: StoreNotice;
}

interface Entry {
  design: Design;
  updatedAt: number;
}

const SERVER_SNAPSHOT: Snapshot = {
  design: DEFAULT_DESIGN,
  activeId: "server",
  saved: [],
  canUndo: false,
  canRedo: false,
  issue: null,
  issueRef: null,
  notice: null,
};

let snap: Snapshot = SERVER_SNAPSHOT;
let entries = new Map<string, Entry>();
let activeId = "server";
let past: Design[] = [];
let future: Design[] = [];
let lastKey: string | undefined;
let lastAt = 0;
let issue: StoreIssue = null;
let issueRef: string | null = null;
let notice: StoreNotice = null;
let started = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function buildSnapshot(): Snapshot {
  const e = entries.get(activeId);
  return {
    design: e ? e.design : DEFAULT_DESIGN,
    activeId,
    saved: [...entries]
      .map(([id, v]) => ({ id, name: v.design.name, templateId: v.design.templateId, updatedAt: v.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt),
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    issue,
    issueRef,
    notice,
  };
}

function emit(): void {
  snap = buildSnapshot();
  listeners.forEach((l) => l());
}

function raise(code: NonNullable<StoreIssue>, error?: unknown, context?: Record<string, string | number | boolean>): void {
  issue = code;
  issueRef = report({ code, error, level: "warn", context });
}

function freshStart(): void {
  const id = newId();
  entries = new Map([[id, { design: designFromTemplate(DEFAULT_TEMPLATE_ID), updatedAt: Date.now() }]]);
  activeId = id;
}

function load(): void {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (error) {
    raise("STORAGE_BLOCKED", error);
    freshStart();
    return;
  }
  if (raw === null) {
    freshStart();
    return;
  }
  try {
    const data = JSON.parse(raw) as { activeId?: unknown; designs?: Record<string, { design?: unknown; updatedAt?: unknown }> };
    const loaded = new Map<string, Entry>();
    let dropped = 0;
    if (data && typeof data === "object" && data.designs && typeof data.designs === "object") {
      for (const [id, v] of Object.entries(data.designs)) {
        const parsed = ID_RE.test(id) ? parseDesign(v?.design) : null;
        if (parsed?.ok) loaded.set(id, { design: parsed.design, updatedAt: Number(v.updatedAt) || 0 });
        else dropped += 1;
      }
    }
    if (loaded.size > 0) {
      entries = loaded;
      const newest = [...loaded].sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0][0];
      activeId = typeof data.activeId === "string" && loaded.has(data.activeId) ? data.activeId : newest;
      if (dropped > 0) raise("STORAGE_CORRUPT", undefined, { dropped });
      return;
    }
  } catch {
    // Jatuh ke penanganan data rusak di bawah.
  }
  raise("STORAGE_CORRUPT", undefined, { bytes: raw.length });
  freshStart();
}

function save(): void {
  try {
    const designs: Record<string, Entry> = {};
    entries.forEach((v, k) => {
      designs[k] = v;
    });
    localStorage.setItem(KEY, JSON.stringify({ v: 2, activeId, designs }));
  } catch (error) {
    if (issue !== "STORAGE_BLOCKED") {
      raise("STORAGE_BLOCKED", error);
      emit();
    }
  }
}

function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, SAVE_DELAY_MS);
}

function start(): void {
  if (started) return;
  started = true;
  load();
  snap = buildSnapshot();
}

function current(): Design {
  start();
  return entries.get(activeId)?.design ?? DEFAULT_DESIGN;
}

function commit(next: Design, key?: string): void {
  const now = Date.now();
  const merge = key !== undefined && key === lastKey && now - lastAt < COALESCE_MS && past.length > 0;
  if (!merge) {
    past.push(current());
    if (past.length > HISTORY_LIMIT) past.shift();
  }
  future = [];
  lastKey = key;
  lastAt = now;
  entries.set(activeId, { design: next, updatedAt: now });
  scheduleSave();
  emit();
}

function resetHistory(): void {
  past = [];
  future = [];
  lastKey = undefined;
}

function uniqueName(base: string): string {
  const taken = new Set([...entries.values()].map((e) => e.design.name));
  const trimmed = base.trim().slice(0, 40) || "New design";
  if (!taken.has(trimmed)) return trimmed;
  for (let n = 2; n < 1000; n++) {
    const suffix = ` ${n}`;
    const candidate = trimmed.slice(0, 40 - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
  return trimmed;
}

function addDesign(design: Design): boolean {
  start();
  if (entries.size >= MAX_DESIGNS) {
    issue = "DESIGN_LIMIT";
    issueRef = null;
    emit();
    return false;
  }
  const id = newId();
  entries.set(id, { design: { ...design, name: uniqueName(design.name) }, updatedAt: Date.now() });
  activeId = id;
  resetHistory();
  scheduleSave();
  return true;
}

export const designStore = {
  subscribe(listener: () => void): () => void {
    start();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): Snapshot {
    return snap;
  },
  getServerSnapshot(): Snapshot {
    return SERVER_SNAPSHOT;
  },

  /** Ubah desain aktif. `key` menggabungkan perubahan beruntun menjadi satu langkah undo. */
  update(fn: (prev: Design) => Design, key?: string): void {
    const prev = current();
    const next = fn(prev);
    if (designsEqual(prev, next)) return;
    commit(next, key);
  },
  /** Terapkan template ke desain aktif, nama desain dipertahankan. */
  applyTemplate(id: TemplateId): void {
    const prev = current();
    const next = designFromTemplate(id, prev.name);
    if (designsEqual(prev, next)) return;
    commit(next);
  },
  rename(name: string): void {
    const trimmed = name.slice(0, 40);
    if (trimmed.trim().length === 0) return;
    designStore.update((d) => ({ ...d, name: trimmed }), "rename");
  },
  undo(): void {
    const prev = past.pop();
    if (!prev) return;
    future.push(current());
    lastKey = undefined;
    entries.set(activeId, { design: prev, updatedAt: Date.now() });
    scheduleSave();
    emit();
  },
  redo(): void {
    const next = future.pop();
    if (!next) return;
    past.push(current());
    lastKey = undefined;
    entries.set(activeId, { design: next, updatedAt: Date.now() });
    scheduleSave();
    emit();
  },

  newDesign(templateId: TemplateId = DEFAULT_TEMPLATE_ID): boolean {
    const ok = addDesign(designFromTemplate(templateId, "New design"));
    if (ok) emit();
    return ok;
  },
  duplicate(): boolean {
    const d = current();
    const ok = addDesign({ ...JSON.parse(JSON.stringify(d)), name: `${d.name} copy` });
    if (ok) emit();
    return ok;
  },
  open(id: string): void {
    start();
    if (!entries.has(id) || id === activeId) return;
    activeId = id;
    resetHistory();
    scheduleSave();
    emit();
  },
  remove(id: string): void {
    start();
    if (!entries.has(id)) return;
    const wasActive = id === activeId;
    entries.delete(id);
    if (entries.size === 0) freshStart();
    else if (wasActive) activeId = [...entries].sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0][0];
    // Riwayat undo hanya milik desain aktif, jadi hanya dibuang kalau desain aktif berganti.
    if (wasActive) resetHistory();
    scheduleSave();
    emit();
  },
  /** Buka desain dari link Share sebagai desain baru. */
  openShared(design: Design): boolean {
    const ok = addDesign(design);
    if (ok) {
      notice = "shared-opened";
      emit();
    }
    return ok;
  },
  /** Tambah desain dari file impor sebagai desain baru dan jadikan aktif. */
  importDesign(design: Design): boolean {
    const ok = addDesign(design);
    if (ok) emit();
    return ok;
  },

  /** Catat masalah link Share (tidak valid atau terlalu besar) supaya tampil ke user. */
  reportShareProblem(code: "SHARE_INVALID" | "SHARE_TOO_LARGE"): void {
    start();
    raise(code);
    emit();
  },
  dismissIssue(): void {
    if (!issue) return;
    issue = null;
    issueRef = null;
    emit();
  },
  dismissNotice(): void {
    if (!notice) return;
    notice = null;
    emit();
  },
  /** Hanya untuk pengujian. */
  _resetForTests(): void {
    clearTimeout(saveTimer);
    started = false;
    snap = SERVER_SNAPSHOT;
    entries = new Map();
    activeId = "server";
    past = [];
    future = [];
    lastKey = undefined;
    lastAt = 0;
    issue = null;
    issueRef = null;
    notice = null;
    listeners.clear();
  },
};
