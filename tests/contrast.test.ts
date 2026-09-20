import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/color";
import type { Fill } from "@/lib/design/model";
import { TEMPLATES } from "@/lib/design/templates";

const stops = (f: Fill) => (f.mode === "gradient" ? [f.color, f.color2] : [f.color]);

/** Menjaga kontras WCAG AA agar tidak mundur saat warna template diubah. */
describe("kontras template chat", () => {
  // Bubble yang cukup pekat. Bubble tembus pandang bergantung pada latar di belakangnya.
  const solid = TEMPLATES.filter(({ design: d }) => d.bubble.show && d.bubble.fill.mode !== "none" && d.bubble.fill.opacity >= 80);

  it("ada template dengan bubble pekat yang diuji", () => {
    expect(solid.length).toBeGreaterThanOrEqual(8);
  });

  it.each(solid)("$id: teks pesan minimal 4.5 terhadap seluruh warna bubble", ({ design: d }) => {
    for (const c of stops(d.bubble.fill)) expect(contrastRatio(d.text.color, c), c).toBeGreaterThanOrEqual(4.5);
  });

  it.each(solid)("$id: nama pengirim (tebal) minimal 3 terhadap bubble", ({ design: d }) => {
    for (const [role, color] of Object.entries(d.nameStyle.colors)) {
      for (const c of stops(d.bubble.fill)) expect(contrastRatio(color, c), `${role} di ${c}`).toBeGreaterThanOrEqual(3);
    }
  });

  const custom = TEMPLATES.flatMap(({ id, design: d }) =>
    (["superChat", "membership", "sticker"] as const)
      .filter((k) => d[k].colorMode === "custom" || k === "membership")
      .map((k) => ({ id, kind: k, card: d[k] })),
  );

  it.each(custom)("$id $kind: teks kartu terbaca di header dan badan", ({ card }) => {
    for (const c of stops(card.headerFill)) expect(contrastRatio(card.textColor, c)).toBeGreaterThanOrEqual(4.5);
    if (card.surface.fill.mode !== "none" && card.surface.fill.opacity >= 80) {
      for (const c of stops(card.surface.fill)) expect(contrastRatio(card.textColor, c)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("kontras token antarmuka", () => {
  const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");
  const block = (selector: string) => {
    const m = css.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`))!;
    return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((x) => [x[1], x[2]]));
  };

  it.each([
    [":root", "terang"],
    [".dark", "gelap"],
  ])("mode %s (%s) lolos AA", (selector) => {
    const t = block(selector);
    const min = (fg: string, bg: string, ratio: number, label: string) =>
      expect(contrastRatio(t[fg], t[bg]), label).toBeGreaterThanOrEqual(ratio);
    min("text", "bg", 4.5, "teks / bg");
    min("text", "surface", 4.5, "teks / surface");
    min("text-2", "surface", 4.5, "teks-2 / surface");
    min("text-2", "surface-2", 4.5, "teks-2 / surface-2");
    min("text-3", "surface", 4.5, "teks-3 / surface");
    min("text-3", "surface-2", 4.5, "teks-3 / surface-2");
    min("text-3", "bg", 4.5, "teks-3 / bg");
    min("on-accent", "accent", 4.5, "teks tombol / aksen");
    min("accent", "bg", 4.5, "aksen sebagai teks / bg");
    min("accent", "surface", 4.5, "aksen sebagai teks / surface");
    min("accent", "surface-2", 4.5, "aksen sebagai teks / surface-2");
    min("accent", "accent-soft", 4.5, "aksen / accent-soft");
    min("text", "accent-soft", 4.5, "teks / accent-soft");
    min("danger", "danger-soft", 4.5, "danger");
    min("warn", "warn-soft", 4.5, "warn");
    min("text", "warn-soft", 4.5, "teks / warn-soft");
    // Batas kolom isian dan toggle: komponen UI butuh kontras 3:1 (WCAG 1.4.11).
    min("line-strong", "surface", 3, "batas isian / surface");
    min("line-strong", "bg", 3, "batas isian / bg");
  });
});
