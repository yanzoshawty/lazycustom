import { describe, expect, it } from "vitest";
import { PRESETS } from "@/lib/presets";
import { parseSettings, settingsEqual } from "@/lib/settings";

describe("parseSettings", () => {
  it.each(PRESETS)("menerima preset $id", ({ settings }) => {
    const r = parseSettings(JSON.parse(JSON.stringify(settings)));
    expect(r.ok).toBe(true);
  });

  it.each([null, undefined, 42, "teks", [], true])("menolak nilai bukan objek: %j", (input) => {
    expect(parseSettings(input)).toEqual({ ok: false, code: "IMPORT_INVALID" });
  });

  it("menolak objek tanpa nomor versi sebagai rusak", () => {
    expect(parseSettings({})).toEqual({ ok: false, code: "IMPORT_INVALID" });
  });

  it("membedakan versi berbeda dari file rusak", () => {
    expect(parseSettings({ v: 2 })).toEqual({ ok: false, code: "IMPORT_VERSION" });
    expect(parseSettings({ v: 0 })).toEqual({ ok: false, code: "IMPORT_VERSION" });
  });

  it("menolak nilai di luar batas", () => {
    const base = JSON.parse(JSON.stringify(PRESETS[0].settings));
    expect(parseSettings({ ...base, fontSize: 500 }).ok).toBe(false);
    expect(parseSettings({ ...base, fontSize: 20.5 }).ok).toBe(false);
    expect(parseSettings({ ...base, bubble: { ...base.bubble, opacity: 101 } }).ok).toBe(false);
  });

  it("menolak warna dan nama font yang tidak dikenal", () => {
    const base = JSON.parse(JSON.stringify(PRESETS[0].settings));
    expect(parseSettings({ ...base, textColor: "red" }).ok).toBe(false);
    expect(parseSettings({ ...base, textColor: "#abcdef" }).ok).toBe(false); // huruf kecil ditolak, harus normal
    expect(parseSettings({ ...base, font: "comic-sans" }).ok).toBe(false);
  });

  it("menolak payload yang mencoba menyelipkan CSS lewat nilai warna", () => {
    const base = JSON.parse(JSON.stringify(PRESETS[0].settings));
    expect(parseSettings({ ...base, textColor: "#FFFFFF; } body { display:none" }).ok).toBe(false);
  });
});

describe("settingsEqual", () => {
  it("mengenali pengaturan yang sama dan berbeda", () => {
    const a = PRESETS[0].settings;
    expect(settingsEqual(a, JSON.parse(JSON.stringify(a)))).toBe(true);
    expect(settingsEqual(a, { ...a, fontSize: a.fontSize + 1 })).toBe(false);
  });
});
