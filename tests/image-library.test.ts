import { describe, expect, it } from "vitest";
import { cleanName, createImageLibrary, memoryBackend, MAX_LIBRARY_ITEMS } from "@/lib/design/image-library";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const WEBP = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
const input = (dataUri = PNG, name = "logo.png") => ({ name, mime: "image/png" as const, bytes: 90, width: 1, height: 1, dataUri });

describe("pustaka gambar", () => {
  it("dimulai kosong, lalu menyimpan dan mengurutkan yang terbaru di depan", async () => {
    const lib = createImageLibrary(async () => memoryBackend());
    await lib.ready();
    expect(lib.getSnapshot().items).toEqual([]);
    const a = await lib.add(input(PNG, "satu.png"));
    await new Promise((r) => setTimeout(r, 3));
    const b = await lib.add(input(WEBP, "dua.webp"));
    expect(a.ok && b.ok).toBe(true);
    expect(lib.getSnapshot().items.map((i) => i.name)).toEqual(["dua", "satu"]);
  });

  it("gambar yang sama tidak disimpan dua kali", async () => {
    const lib = createImageLibrary(async () => memoryBackend());
    const first = await lib.add(input());
    const second = await lib.add(input());
    expect(first.ok && second.ok && second.duplicate && second.item.id === first.item.id).toBe(true);
    expect(lib.getSnapshot().items).toHaveLength(1);
  });

  it("menolak yang bukan gambar data atau melebihi batas 100 KB", async () => {
    const lib = createImageLibrary(async () => memoryBackend());
    expect(await lib.add(input("https://contoh.com/a.png"))).toEqual({ ok: false, reason: "INVALID" });
    expect(await lib.add(input("javascript:alert(1)"))).toEqual({ ok: false, reason: "INVALID" });
    expect(await lib.add({ ...input(), bytes: 200 * 1024 })).toEqual({ ok: false, reason: "INVALID" });
  });

  it("menolak saat jumlah maksimum tercapai", async () => {
    const lib = createImageLibrary(async () => memoryBackend());
    for (let i = 0; i < MAX_LIBRARY_ITEMS; i++) {
      const r = await lib.add(input(`data:image/png;base64,${"QUJD".repeat(i + 1)}`, `g${i}`));
      expect(r.ok).toBe(true);
    }
    expect(await lib.add(input("data:image/png;base64,ZZZZ"))).toEqual({ ok: false, reason: "FULL" });
  });

  it("menghapus satu gambar dan mengosongkan semuanya", async () => {
    const lib = createImageLibrary(async () => memoryBackend());
    const a = await lib.add(input(PNG));
    await lib.add(input(WEBP));
    if (!a.ok) throw new Error("gagal");
    expect(await lib.remove(a.item.id)).toBe(true);
    expect(lib.getSnapshot().items).toHaveLength(1);
    expect(await lib.clear()).toBe(true);
    expect(lib.getSnapshot().items).toHaveLength(0);
  });

  it("status memory bila IndexedDB tidak tersedia, dan tetap bekerja", async () => {
    const lib = createImageLibrary(async () => null);
    await lib.ready();
    expect(lib.getSnapshot().status).toBe("memory");
    expect((await lib.add(input())).ok).toBe(true);
  });

  it("memuat gambar yang sudah tersimpan dan membuang data yang rusak", async () => {
    const backend = memoryBackend();
    await backend.put({ ...input(), id: "aaaaaaaaaa", createdAt: 1 });
    await backend.put({ ...input("javascript:x"), id: "bbbbbbbbbb", createdAt: 2 });
    const lib = createImageLibrary(async () => backend);
    await lib.ready();
    expect(lib.getSnapshot().items.map((i) => i.id)).toEqual(["aaaaaaaaaa"]);
  });

  it("gagal menyimpan ke backend dilaporkan, bukan diam-diam", async () => {
    const backend = { ...memoryBackend(), persistent: true, put: async () => { throw new Error("quota"); } };
    const lib = createImageLibrary(async () => backend);
    expect(await lib.add(input())).toEqual({ ok: false, reason: "STORAGE_FAILED" });
    expect(lib.getSnapshot().items).toHaveLength(0);
  });

  it("nama dibersihkan dari karakter kontrol, ekstensi, dan dipotong", () => {
    expect(cleanName("logo\u0000 keren.PNG")).toBe("logo keren");
    expect(cleanName("   ")).toBe("Gambar");
    expect(cleanName("x".repeat(100))).toHaveLength(40);
  });
});
