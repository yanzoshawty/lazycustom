import { describe, expect, it } from "vitest";
import { ERROR_CATALOG, ERROR_CODE_RE, errorInfo, type ErrorCode } from "@/lib/errors";
import { newRef, REF_RE } from "@/lib/ref";

describe("katalog error", () => {
  const codes = Object.keys(ERROR_CATALOG) as ErrorCode[];

  it.each(codes)("%s punya judul, penjelasan, dan tindakan", (code) => {
    const e = ERROR_CATALOG[code];
    expect(e.title.length).toBeGreaterThan(3);
    expect(e.body.length).toBeGreaterThan(10);
    expect(e.action.length).toBeGreaterThan(10);
  });

  it.each(codes)("%s cocok dengan format kode untuk log", (code) => {
    expect(code).toMatch(ERROR_CODE_RE);
  });

  it.each(codes)("%s tidak membocorkan istilah teknis ke user", (code) => {
    const text = Object.values(ERROR_CATALOG[code]).join(" ");
    expect(text).not.toMatch(/exception|stack|undefined|null|TypeError|localStorage|JSON\.|500|traceback/i);
  });

  it.each(codes)("%s tidak memakai em-dash atau en-dash", (code) => {
    expect(Object.values(ERROR_CATALOG[code]).join(" ")).not.toMatch(/[\u2013\u2014]/);
  });

  it("kembali ke UNKNOWN untuk kode yang tidak dikenal", () => {
    expect(errorInfo("TIDAK_ADA" as ErrorCode)).toBe(ERROR_CATALOG.UNKNOWN);
  });
});

describe("kode laporan", () => {
  it("selalu cocok dengan format LC-XXXX dan tanpa karakter membingungkan", () => {
    for (let i = 0; i < 200; i++) {
      const ref = newRef();
      expect(ref).toMatch(REF_RE);
      expect(ref.slice(3)).not.toMatch(/[01OIL]/);
    }
  });
  it("jarang bertabrakan", () => {
    const seen = new Set(Array.from({ length: 300 }, () => newRef()));
    expect(seen.size).toBeGreaterThan(290);
  });
});
