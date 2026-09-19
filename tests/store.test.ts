import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRESETS } from "@/lib/presets";

vi.mock("@/lib/report", () => ({ report: vi.fn(() => "LC-TEST") }));

import { report } from "@/lib/report";
import { settingsStore } from "@/lib/store";

const KEY = "lazycustom:settings:v1";

describe("settingsStore", () => {
  beforeEach(() => {
    settingsStore._resetForTests();
    localStorage.clear();
    vi.mocked(report).mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("memakai tema awal saat belum ada data tersimpan", () => {
    settingsStore.subscribe(() => undefined);
    const s = settingsStore.getSnapshot();
    expect(s.settings.presetId).toBe("sirup");
    expect(s.issue).toBeNull();
  });

  it("memuat pengaturan valid yang tersimpan", () => {
    localStorage.setItem(KEY, JSON.stringify(PRESETS[3].settings));
    settingsStore.subscribe(() => undefined);
    expect(settingsStore.getSnapshot().settings.presetId).toBe(PRESETS[3].id);
    expect(settingsStore.getSnapshot().issue).toBeNull();
  });

  it("menandai data rusak, memakai tema awal, dan mencatat ke log dengan kode laporan", () => {
    localStorage.setItem(KEY, "{bukan json");
    settingsStore.subscribe(() => undefined);
    const s = settingsStore.getSnapshot();
    expect(s.issue).toBe("STORAGE_CORRUPT");
    expect(s.issueRef).toBe("LC-TEST");
    expect(s.settings.presetId).toBe("sirup");
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ code: "STORAGE_CORRUPT", level: "warn" }));
  });

  it("menandai data yang lolos JSON tapi tidak sesuai skema", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, presetId: "sirup", fontSize: 9999 }));
    settingsStore.subscribe(() => undefined);
    expect(settingsStore.getSnapshot().issue).toBe("STORAGE_CORRUPT");
  });

  it("menangani localStorage yang diblokir saat membaca", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    settingsStore.subscribe(() => undefined);
    const s = settingsStore.getSnapshot();
    expect(s.issue).toBe("STORAGE_BLOCKED");
    expect(s.issueRef).toBe("LC-TEST");
    expect(s.settings.presetId).toBe("sirup");
  });

  it("menyimpan dengan jeda dan hanya sekali untuk banyak perubahan cepat", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    settingsStore.subscribe(() => undefined);
    for (let size = 14; size < 20; size++) settingsStore.update((s) => ({ ...s, fontSize: size }));
    expect(setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(KEY)!).fontSize).toBe(19);
  });

  it("menandai STORAGE_BLOCKED bila penyimpanan gagal, tanpa membuang pengaturan di memori", () => {
    settingsStore.subscribe(() => undefined);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    settingsStore.update((s) => ({ ...s, fontSize: 26 }));
    vi.advanceTimersByTime(400);
    const s = settingsStore.getSnapshot();
    expect(s.issue).toBe("STORAGE_BLOCKED");
    expect(s.settings.fontSize).toBe(26);
  });

  it("memberi tahu pelanggan saat data berubah dan berhenti setelah berhenti berlangganan", () => {
    const listener = vi.fn();
    const off = settingsStore.subscribe(listener);
    settingsStore.update((s) => ({ ...s, gap: 3 }));
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    settingsStore.update((s) => ({ ...s, gap: 4 }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("menutup pesan issue lewat dismissIssue", () => {
    localStorage.setItem(KEY, "rusak");
    settingsStore.subscribe(() => undefined);
    settingsStore.dismissIssue();
    expect(settingsStore.getSnapshot().issue).toBeNull();
    expect(settingsStore.getSnapshot().issueRef).toBeNull();
  });

  it("memberi snapshot server yang stabil", () => {
    expect(settingsStore.getServerSnapshot()).toBe(settingsStore.getServerSnapshot());
  });
});
