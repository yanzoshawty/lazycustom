import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/color";
import { PRESETS } from "@/lib/presets";

/** Menjaga kontras WCAG AA agar tidak mundur saat warna diubah. */
describe("kontras tema chat", () => {
  const withBubble = PRESETS.filter((p) => p.settings.bubble.show && p.settings.bubble.opacity >= 90);

  it.each(withBubble)("$id: teks pesan minimal 4.5 terhadap bubble", ({ settings }) => {
    expect(contrastRatio(settings.textColor, settings.bubble.color)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(withBubble)("$id: nama pengirim (tebal) minimal 3 terhadap bubble", ({ settings }) => {
    for (const [role, color] of Object.entries(settings.names)) {
      expect(contrastRatio(color, settings.bubble.color), `nama ${role}`).toBeGreaterThanOrEqual(3);
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
    min("text-3", "surface", 4.5, "teks-3 / surface");
    min("text-3", "surface-2", 4.5, "teks-3 / surface-2");
    min("on-accent", "accent", 4.5, "teks tombol / aksen");
    min("accent", "surface", 3, "aksen / surface");
    min("danger", "danger-soft", 4.5, "danger");
    min("warn", "warn-soft", 4.5, "warn");
  });
});
