import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { generateCss } from "@/lib/css";
import { PRESETS } from "@/lib/presets";
import type { Settings } from "@/lib/settings";

const FORBIDDEN = [/color-mix\(/, /:has\(/, /@layer/, /@container/, /@property/, /\bnan\b/i, /undefined/, /\[object/, /NaN/];

describe.each(PRESETS)("generateCss: preset $id", ({ settings }) => {
  const css = generateCss(settings);

  it("adalah CSS yang valid", () => {
    expect(() => postcss.parse(css)).not.toThrow();
  });

  it("tidak memakai fitur CSS modern yang berisiko di OBS", () => {
    for (const re of FORBIDDEN) expect(css).not.toMatch(re);
  });

  it("menaruh @import sebagai aturan pertama bila ada", () => {
    const first = postcss.parse(css).nodes.find((n) => n.type !== "comment");
    const hasImport = css.includes("@import");
    if (settings.font === "system") expect(hasImport).toBe(false);
    else expect(first).toMatchObject({ type: "atrule", name: "import" });
  });

  it("membuat latar halaman transparan dan menyembunyikan scrollbar", () => {
    expect(css).toMatch(/body \{[^}]*overflow: hidden !important/);
    expect(css).toMatch(/body \{[^}]*rgba\(0, 0, 0, 0\)/);
  });

  it("memuat warna nama untuk setiap peran", () => {
    for (const role of ["member", "moderator", "owner"] as const) {
      expect(css).toContain(`[author-type="${role}"] #author-name`);
      expect(css).toContain(settings.names[role]);
    }
    expect(css).toContain(settings.names.viewer);
  });

  it("tidak memuat em-dash atau en-dash", () => {
    expect(css).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("generateCss: pengaturan tunggal", () => {
  const base = PRESETS[0].settings;
  const patch = (p: Partial<Settings>): Settings => ({ ...base, ...p });

  it("menyembunyikan header dan kolom kirim hanya bila diminta", () => {
    expect(generateCss(patch({ hideChrome: true }))).toContain("yt-live-chat-header-renderer");
    expect(generateCss(patch({ hideChrome: false }))).not.toContain("yt-live-chat-header-renderer");
  });

  it("menyembunyikan bar Super Chat hanya bila diminta", () => {
    expect(generateCss(patch({ hideTicker: true }))).toContain("yt-live-chat-ticker-renderer");
    expect(generateCss(patch({ hideTicker: false }))).not.toContain("yt-live-chat-ticker-renderer");
  });

  it("mereset margin pesan agar jarak nama dan pesan tidak bergantung pada gaya YouTube", () => {
    expect(generateCss(base)).toMatch(/#message \{[^}]*margin: 0 !important/);
  });

  it("tidak membuat @keyframes saat animasi mati", () => {
    const css = generateCss(patch({ animation: "none" }));
    expect(css).not.toContain("@keyframes");
    expect(css).not.toContain("animation:");
  });

  it.each(["slide", "pop", "fade"] as const)("membuat keyframes yang cocok untuk animasi %s", (animation) => {
    const css = generateCss(patch({ animation }));
    expect(css).toContain(`@keyframes lc-${animation}`);
    expect(css).toContain(`animation: lc-${animation}`);
  });

  it("menyembunyikan avatar, waktu, dan lencana saat dimatikan", () => {
    const css = generateCss(
      patch({ avatar: { ...base.avatar, show: false }, showTimestamp: false, showBadges: false }),
    );
    expect(css).toMatch(/#author-photo \{\s*display: none !important/);
    expect(css).toMatch(/#timestamp \{\s*display: none !important/);
    expect(css).toMatch(/#chat-badges,\nyt-live-chat-text-message-renderer yt-live-chat-author-badge-renderer \{\s*display: none/);
  });

  it("memberi semburat peran hanya saat bubble aktif dan opsi dinyalakan", () => {
    const on = generateCss(patch({ bubble: { ...base.bubble, show: true, roleTint: true } }));
    const off = generateCss(patch({ bubble: { ...base.bubble, show: true, roleTint: false } }));
    const noBubble = generateCss(patch({ bubble: { ...base.bubble, show: false, roleTint: true } }));
    expect(on).toContain("linear-gradient");
    expect(off).not.toContain("linear-gradient");
    expect(noBubble).not.toContain("linear-gradient");
  });

  it("menyusun nama di atas pesan pada layout stacked", () => {
    expect(generateCss(patch({ layout: "stacked" }))).toContain("flex-direction: column");
    expect(generateCss(patch({ layout: "inline" }))).not.toContain("flex-direction: column");
  });

  it("membuat tepi teks garis dari delapan arah", () => {
    const css = generateCss(patch({ edge: "outline", textColor: "#FFFFFF" }));
    const line = css.split("\n").find((l) => l.includes("text-shadow"))!;
    expect(line.split(", ")).toHaveLength(8);
  });

  it("memakai panel latar berwarna bila kepekatan lebih dari nol", () => {
    const css = generateCss(patch({ panel: { color: "#102030", opacity: 40 } }));
    expect(css).toContain("rgba(16, 32, 48, 0.4)");
  });
});
