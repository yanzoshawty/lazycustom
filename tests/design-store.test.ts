import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { designFromTemplate, DEFAULT_DESIGN } from "@/lib/design/templates";
import { designStore, MAX_DESIGNS } from "@/lib/design/store";

vi.mock("@/lib/report", () => ({ report: vi.fn(() => "LC-TEST") }));

const KEY = "lazycustom:designs:v2";
const snap = () => designStore.getSnapshot();

function boot() {
  designStore._resetForTests();
  return designStore.subscribe(() => undefined);
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-20T10:00:00Z"));
});
afterEach(() => {
  designStore._resetForTests();
  vi.useRealTimers();
});

describe("mulai", () => {
  it("memberi desain default Crystal saat penyimpanan kosong", () => {
    boot();
    expect(snap().design.templateId).toBe("crystal");
    expect(snap().saved).toHaveLength(1);
    expect(snap().issue).toBeNull();
  });

  it("snapshot server stabil dan sama dengan desain default", () => {
    expect(designStore.getServerSnapshot()).toBe(designStore.getServerSnapshot());
    expect(designStore.getServerSnapshot().design).toBe(DEFAULT_DESIGN);
  });

  it("memulihkan desain yang tersimpan dan mengaktifkan yang terakhir dipakai", () => {
    const off = boot();
    designStore.update((d) => ({ ...d, fontSize: 30 }));
    vi.advanceTimersByTime(400);
    off();
    designStore._resetForTests();
    designStore.subscribe(() => undefined);
    expect(snap().design.fontSize).toBe(30);
  });
});

describe("update, undo, dan redo", () => {
  it("mengubah desain, mengaktifkan undo, dan mengabaikan perubahan yang sama", () => {
    boot();
    const before = snap().design;
    designStore.update((d) => ({ ...d, fontSize: 28 }));
    expect(snap().design.fontSize).toBe(28);
    expect(snap().canUndo).toBe(true);
    designStore.update((d) => ({ ...d, fontSize: 28 }));
    designStore.undo();
    expect(snap().design).toEqual(before);
    expect(snap().canUndo).toBe(false);
    expect(snap().canRedo).toBe(true);
    designStore.redo();
    expect(snap().design.fontSize).toBe(28);
    expect(snap().canRedo).toBe(false);
  });

  it("perubahan baru menghapus riwayat redo", () => {
    boot();
    designStore.update((d) => ({ ...d, fontSize: 24 }));
    designStore.undo();
    designStore.update((d) => ({ ...d, fontSize: 26 }));
    expect(snap().canRedo).toBe(false);
  });

  it("menggabungkan perubahan beruntun dengan kunci sama menjadi satu langkah undo", () => {
    boot();
    const start = snap().design.fontSize;
    for (const v of [21, 22, 23, 24]) {
      designStore.update((d) => ({ ...d, fontSize: v }), "fontSize");
      vi.advanceTimersByTime(100);
    }
    designStore.undo();
    expect(snap().design.fontSize).toBe(start);
    expect(snap().canUndo).toBe(false);
  });

  it("tidak menggabungkan bila jeda melewati batas atau kunci berbeda", () => {
    boot();
    designStore.update((d) => ({ ...d, fontSize: 21 }), "a");
    vi.advanceTimersByTime(1000);
    designStore.update((d) => ({ ...d, fontSize: 22 }), "a");
    designStore.update((d) => ({ ...d, fontSize: 23 }), "b");
    designStore.undo();
    expect(snap().design.fontSize).toBe(22);
    designStore.undo();
    expect(snap().design.fontSize).toBe(21);
  });

  it("membatasi riwayat sampai 60 langkah", () => {
    boot();
    for (let i = 0; i < 80; i++) {
      designStore.update((d) => ({ ...d, fontSize: 13 + (i % 24) }), `k${i}`);
      vi.advanceTimersByTime(1000);
    }
    let steps = 0;
    while (snap().canUndo) {
      designStore.undo();
      steps++;
      if (steps > 200) break;
    }
    expect(steps).toBe(60);
  });

  it("undo dan redo tanpa riwayat tidak melakukan apa-apa", () => {
    boot();
    const before = snap();
    designStore.undo();
    designStore.redo();
    expect(snap()).toBe(before);
  });
});

describe("template dan nama", () => {
  it("menerapkan template dengan mempertahankan nama desain dan bisa di-undo", () => {
    boot();
    designStore.rename("Overlay Kopi");
    designStore.applyTemplate("grid");
    expect(snap().design.templateId).toBe("grid");
    expect(snap().design.name).toBe("Overlay Kopi");
    designStore.undo();
    expect(snap().design.templateId).toBe("crystal");
  });

  it("menandai desain yang diedit sebagai custom hanya bila pemanggil melakukannya", () => {
    boot();
    designStore.update((d) => ({ ...d, templateId: "custom" }));
    expect(snap().design.templateId).toBe("custom");
  });

  it("menolak nama kosong dan memotong nama panjang", () => {
    boot();
    designStore.rename("   ");
    expect(snap().design.name).toBe("Crystal");
    designStore.rename("x".repeat(60));
    expect(snap().design.name).toHaveLength(40);
  });
});

describe("My Designs", () => {
  it("membuat desain baru, mengaktifkannya, dan mereset riwayat", () => {
    boot();
    designStore.update((d) => ({ ...d, fontSize: 30 }));
    expect(designStore.newDesign("hud")).toBe(true);
    expect(snap().design.templateId).toBe("hud");
    expect(snap().saved).toHaveLength(2);
    expect(snap().canUndo).toBe(false);
  });

  it("memberi nama unik saat bentrok", () => {
    boot();
    designStore.newDesign("plain");
    designStore.newDesign("plain");
    designStore.newDesign("plain");
    const names = snap().saved.map((s) => s.name).sort();
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("New design 2");
  });

  it("menggandakan desain aktif tanpa mengubah aslinya", () => {
    boot();
    const originalId = snap().activeId;
    designStore.duplicate();
    expect(snap().activeId).not.toBe(originalId);
    expect(snap().design.name).toBe("Crystal copy");
    designStore.update((d) => ({ ...d, fontSize: 33 }));
    designStore.open(originalId);
    expect(snap().design.fontSize).toBe(DEFAULT_DESIGN.fontSize);
  });

  it("membuka desain lain dan mengabaikan id yang tidak ada", () => {
    boot();
    const first = snap().activeId;
    designStore.newDesign("aurora");
    designStore.open(first);
    expect(snap().activeId).toBe(first);
    designStore.open("d-tidakada1");
    expect(snap().activeId).toBe(first);
  });

  it("menghapus desain aktif dan pindah ke yang lain, riwayat non-aktif dipertahankan", () => {
    boot();
    const first = snap().activeId;
    designStore.newDesign("aurora");
    const second = snap().activeId;
    designStore.remove(second);
    expect(snap().activeId).toBe(first);
    designStore.update((d) => ({ ...d, fontSize: 27 }));
    designStore.newDesign("hud");
    const third = snap().activeId;
    designStore.open(first);
    designStore.update((d) => ({ ...d, fontSize: 29 }));
    designStore.remove(third);
    expect(snap().canUndo).toBe(true);
  });

  it("menghapus satu-satunya desain membuat desain baru, tidak pernah kosong", () => {
    boot();
    designStore.remove(snap().activeId);
    expect(snap().saved).toHaveLength(1);
    expect(snap().design.templateId).toBe("crystal");
  });

  it("menolak desain baru saat batas tercapai dan memberi tahu user", () => {
    boot();
    for (let i = 1; i < MAX_DESIGNS; i++) expect(designStore.newDesign("plain")).toBe(true);
    expect(snap().saved).toHaveLength(MAX_DESIGNS);
    expect(designStore.newDesign("plain")).toBe(false);
    expect(snap().saved).toHaveLength(MAX_DESIGNS);
    expect(snap().issue).toBe("DESIGN_LIMIT");
    expect(snap().issueRef).toBeNull();
    designStore.dismissIssue();
    expect(snap().issue).toBeNull();
  });

  it("membuka desain dari link Share sebagai desain baru dengan pemberitahuan", () => {
    boot();
    const shared = designFromTemplate("holo", "Dari teman");
    expect(designStore.openShared(shared)).toBe(true);
    expect(snap().design.name).toBe("Dari teman");
    expect(snap().notice).toBe("shared-opened");
    designStore.dismissNotice();
    expect(snap().notice).toBeNull();
  });

  it("mengimpor desain sebagai desain baru tanpa pemberitahuan share", () => {
    boot();
    designStore.importDesign(designFromTemplate("terminal", "Impor"));
    expect(snap().design.templateId).toBe("terminal");
    expect(snap().notice).toBeNull();
  });
});

describe("penyimpanan", () => {
  it("menyimpan setelah jeda dan menggabungkan banyak perubahan jadi satu penulisan", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    boot();
    designStore.update((d) => ({ ...d, fontSize: 21 }));
    designStore.update((d) => ({ ...d, fontSize: 22 }));
    expect(setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(setItem).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.v).toBe(2);
    expect(Object.keys(saved.designs)).toHaveLength(1);
    setItem.mockRestore();
  });

  it("menandai STORAGE_BLOCKED saat localStorage menolak menulis dan tetap bisa dipakai", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("penuh", "QuotaExceededError");
    });
    boot();
    designStore.update((d) => ({ ...d, fontSize: 25 }));
    vi.advanceTimersByTime(400);
    expect(snap().issue).toBe("STORAGE_BLOCKED");
    expect(snap().issueRef).toBe("LC-TEST");
    expect(snap().design.fontSize).toBe(25);
    setItem.mockRestore();
  });

  it("menandai STORAGE_BLOCKED saat localStorage tidak bisa dibaca", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("diblokir", "SecurityError");
    });
    boot();
    expect(snap().issue).toBe("STORAGE_BLOCKED");
    expect(snap().design.templateId).toBe("crystal");
    getItem.mockRestore();
  });

  it("memulai dari nol dan melapor bila seluruh data rusak", () => {
    localStorage.setItem(KEY, "{bukan json");
    boot();
    expect(snap().issue).toBe("STORAGE_CORRUPT");
    expect(snap().design.templateId).toBe("crystal");
  });

  it("membuang hanya desain yang rusak dan mempertahankan yang valid", () => {
    const good = designFromTemplate("aurora", "Yang bagus");
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 2,
        activeId: "d-aaaaaaaa",
        designs: {
          "d-aaaaaaaa": { design: good, updatedAt: 10 },
          "d-bbbbbbbb": { design: { v: 2, name: "rusak" }, updatedAt: 20 },
          "id-salah": { design: good, updatedAt: 30 },
        },
      }),
    );
    boot();
    expect(snap().saved.map((s) => s.name)).toEqual(["Yang bagus"]);
    expect(snap().issue).toBe("STORAGE_CORRUPT");
  });

  it("menolak desain tersimpan yang menyelipkan CSS lewat warna", () => {
    const evil = JSON.parse(JSON.stringify(DEFAULT_DESIGN));
    evil.text.color = "#FFFFFF;}body{display:none";
    localStorage.setItem(KEY, JSON.stringify({ v: 2, activeId: "d-aaaaaaaa", designs: { "d-aaaaaaaa": { design: evil, updatedAt: 1 } } }));
    boot();
    expect(snap().design.text.color).not.toContain("}");
    expect(snap().issue).toBe("STORAGE_CORRUPT");
  });

  it("memberi tahu subscriber setiap perubahan dan berhenti setelah unsubscribe", () => {
    designStore._resetForTests();
    const fn = vi.fn();
    const off = designStore.subscribe(fn);
    designStore.update((d) => ({ ...d, fontSize: 26 }));
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    designStore.update((d) => ({ ...d, fontSize: 27 }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("melaporkan masalah link Share ke user", () => {
    boot();
    designStore.reportShareProblem("SHARE_INVALID");
    expect(snap().issue).toBe("SHARE_INVALID");
    expect(snap().issueRef).toBe("LC-TEST");
  });
});
