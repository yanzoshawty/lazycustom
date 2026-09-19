import { describe, expect, it } from "vitest";
import { generateCss } from "@/lib/css";
import { PRESETS } from "@/lib/presets";
import { buildPreviewHtml, MOCK_MESSAGES } from "@/lib/preview-html";

describe("buildPreviewHtml", () => {
  const css = generateCss(PRESETS[0].settings);
  const html = buildPreviewHtml(css);
  const doc = new DOMParser().parseFromString(html, "text/html");

  it("membuat satu baris pesan untuk tiap pesan contoh", () => {
    expect(doc.querySelectorAll("yt-live-chat-text-message-renderer")).toHaveLength(MOCK_MESSAGES.length);
  });

  it("memuat setiap peran dengan atribut yang sama seperti YouTube", () => {
    for (const role of ["owner", "moderator", "member"]) {
      expect(doc.querySelector(`yt-live-chat-text-message-renderer[author-type="${role}"] #author-name.${role}`)).not.toBeNull();
    }
  });

  it("menyertakan elemen yang bisa disembunyikan agar efeknya terlihat", () => {
    expect(doc.querySelector("yt-live-chat-header-renderer")).not.toBeNull();
    expect(doc.querySelector("yt-live-chat-message-input-renderer")).not.toBeNull();
    expect(doc.querySelector("yt-live-chat-ticker-renderer")).not.toBeNull();
  });

  it("menaruh CSS keluaran apa adanya di style lc-style", () => {
    expect(doc.getElementById("lc-style")?.textContent).toBe(css);
  });

  it("tidak membiarkan penutup style menyusup lewat CSS", () => {
    const evil = buildPreviewHtml("body{}</style><script>alert(1)</script>");
    const d = new DOMParser().parseFromString(evil, "text/html");
    expect(d.querySelectorAll("script")).toHaveLength(1); // hanya skrip jembatan milik kita
  });

  it("membalas ping dengan lc-ready dan mengirim lc-ready saat dimuat", () => {
    const script = doc.querySelector("script")!.textContent!;
    expect(script).toContain("d.type==='ping'");
    expect(script.match(/lc-ready/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it("tidak memuat gambar dari jaringan", () => {
    for (const img of doc.querySelectorAll("img")) expect(img.getAttribute("src")).toMatch(/^data:/);
  });
});
