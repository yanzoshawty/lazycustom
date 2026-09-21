import { describe, expect, it } from "vitest";
import { generateCss, scaleLengths } from "@/lib/design/css";
import { designSchema } from "@/lib/design/model";
import { designFromTemplate, TEMPLATES } from "@/lib/design/templates";

/** Semua px yang tersisa di luar string, url(), dan @import (untuk memastikan tidak ada yang terlewat). */
const leftoverPx = (css: string) =>
  css
    .replace(/"(?:[^"\\]|\\.)*"/g, "")
    .replace(/url\([^)]*\)/g, "")
    .replace(/max\(1px, [^)]*\)/g, "")
    .match(/-?\d*\.?\d+px\b/g)
    ?.filter((v) => parseFloat(v) !== 0) ?? [];

describe("scaleLengths", () => {
  it("mengubah px ke vw terhadap lebar acuan", () => {
    expect(scaleLengths("a { font-size: 20px; padding: 8px 12px; }", 400)).toBe("a { font-size: 5vw; padding: 2vw 3vw; }");
  });
  it("mempertahankan nol dan pecahan kecil", () => {
    expect(scaleLengths("a { margin: 0px; letter-spacing: 0.5px; }", 400)).toBe("a { margin: 0px; letter-spacing: 0.125vw; }");
  });
  it("garis tipis (1 sampai 2px) tidak lebih kecil dari 1px", () => {
    expect(scaleLengths("a { border: 1px solid red; }", 400)).toBe("a { border: max(1px, 0.25vw) solid red; }");
  });
  it("bekerja di dalam calc dan nilai negatif", () => {
    expect(scaleLengths("a { padding: 7px calc(12px - 0.225em); margin-left: -8px; }", 400)).toBe(
      "a { padding: 1.75vw calc(3vw - 0.225em); margin-left: -2vw; }",
    );
  });
  it("tidak menyentuh string, url(), dan @import", () => {
    const css = '@import url("https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600&display=swap");\na::before { content: "10px 20px"; background: url("data:image/png;base64,AA12px") 4px 4px; }';
    expect(scaleLengths(css, 400)).toBe(
      '@import url("https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600&display=swap");\na::before { content: "10px 20px"; background: url("data:image/png;base64,AA12px") 1vw 1vw; }',
    );
  });
});

describe("skala otomatis pada desain", () => {
  it("default menyala dengan lebar acuan 400", () => {
    const d = designFromTemplate("crystal");
    expect(d.row.autoScale).toBe(true);
    expect(d.row.refWidth).toBe(400);
  });

  it("desain lama tanpa field baru tetap valid dan mendapat default", () => {
    const d = designFromTemplate("crystal");
    const { autoScale: _a, refWidth: _r, ...oldRow } = d.row;
    const parsed = designSchema.parse({ ...d, row: oldRow });
    expect(parsed.row.autoScale).toBe(true);
    expect(parsed.row.refWidth).toBe(400);
  });

  it("font 20px di lebar acuan 400 menjadi 5vw, dan mengikuti lebar acuan", () => {
    const d = designFromTemplate("crystal");
    expect(generateCss(d)).toMatch(/font-size: 5vw !important/);
    d.row.refWidth = 800;
    expect(generateCss(d)).toMatch(/font-size: 2\.5vw !important/);
  });

  it("dimatikan: px tetap apa adanya", () => {
    const d = designFromTemplate("crystal");
    d.row.autoScale = false;
    const css = generateCss(d);
    expect(css).toMatch(/font-size: 20px !important/);
    expect(css).not.toMatch(/\d vw|\dvw/);
  });

  it.each(TEMPLATES.map((t) => t.id))("template %s: tidak ada px tersisa dan tidak ada nilai rusak", (id) => {
    const css = generateCss(designFromTemplate(id as never));
    expect(leftoverPx(css)).toEqual([]);
    expect(css).not.toMatch(/NaN|undefined|Infinityvw/);
  });
});
