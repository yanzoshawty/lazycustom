import { describe, expect, it } from "vitest";
import { generateCss } from "@/lib/design/css";
import { parseDesign, type Design } from "@/lib/design/model";
import { designFromTemplate } from "@/lib/design/templates";

const base = (): Design => {
  const d = designFromTemplate("crystal");
  d.row.autoScale = false;
  return d;
};

describe("peran Verified", () => {
  it("desain v2 lama tanpa verified tetap valid: bubble null, warna ikut viewer", () => {
    const old = JSON.parse(JSON.stringify(base()));
    delete old.roleBubbles.verified;
    delete old.nameStyle.colors.verified;
    const r = parseDesign(old);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.design.roleBubbles.verified).toBeNull();
    expect(r.design.nameStyle.colors.verified).toBeUndefined();
    const css = generateCss(r.design);
    expect(css).not.toContain('[author-type="verified"] #author-name');
    expect(css).not.toContain('[author-type="verified"] #content');
  });

  it("warna nama Verified hanya ditulis saat diisi", () => {
    const d = base();
    d.nameStyle.colors.verified = "#12AB34";
    const css = generateCss(d);
    expect(css).toContain('[author-type="verified"] #author-name');
    expect(css).toContain("#12AB34");
  });

  it("bubble Verified sendiri menghasilkan rule #content dan warna teks", () => {
    const d = base();
    const { show, roleTint, ...surface } = d.bubble;
    void show;
    void roleTint;
    d.roleBubbles.verified = { surface: { ...surface, fill: { ...surface.fill, mode: "solid", color: "#ABCDEF" } }, textColor: "#101010" };
    const css = generateCss(d);
    expect(css).toContain('yt-live-chat-text-message-renderer[author-type="verified"] #content');
    expect(css).toContain('[author-type="verified"] #message');
    expect(css).toContain("#101010");
  });

  it("label khusus Verified lolos skema", () => {
    const d = base();
    d.labels = [
      { id: "label-veri", text: "OK", roles: "verified", position: "start", color: "#FFFFFF", bgColor: "#000000", bgOpacity: 100, size: 80, weight: 700, uppercase: false, spacing: 0, radius: 2, padX: 4 },
    ];
    expect(parseDesign(JSON.parse(JSON.stringify(d))).ok).toBe(true);
    expect(generateCss(d)).toContain('[author-type="verified"] yt-live-chat-author-chip');
  });
});
