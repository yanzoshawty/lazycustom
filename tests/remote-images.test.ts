import { describe, expect, it } from "vitest";
import { remoteImageHosts, remoteImageUrls, stripRemoteImages, stripUploadedImages, type Design } from "@/lib/design/model";
import { designFromTemplate } from "@/lib/design/templates";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

function withImages(): Design {
  const d = designFromTemplate("crystal");
  d.bubble.decorations.push(
    { id: "image-aaaa", kind: "image", url: "https://a.example.com/bg.png", fit: "cover", position: "center", opacity: 50 },
    { id: "image-pin-bbbb", kind: "image-pin", url: "https://b.example.org/pin.gif", anchor: "top-right", width: 32, offsetX: 4, offsetY: 4 },
    { id: "image-pin-cccc", kind: "image-pin", url: PNG, anchor: "top-left", width: 32, offsetX: 4, offsetY: 4 },
  );
  d.avatar.frame = { url: "https://a.example.com/frame.png", scale: 130 };
  d.panelImages = [
    { id: "panel-dddd", url: "https://c.example.net/logo.png", layer: "front", anchor: "top-right", width: 64, height: 64, offsetX: 0, offsetY: 0, opacity: 100, fit: "contain" },
  ];
  return d;
}

describe("gambar dari luar", () => {
  it("desain tanpa gambar tidak memuat apa pun dari luar", () => {
    expect(remoteImageUrls(designFromTemplate("crystal"))).toEqual([]);
    expect(remoteImageHosts(designFromTemplate("crystal"))).toEqual([]);
  });

  it("mengumpulkan semua sumber: dekorasi, bingkai avatar, dan gambar panel, tanpa duplikat", () => {
    const d = withImages();
    d.superChat.surface.decorations.push({ id: "image-pin-eeee", kind: "image-pin", url: "https://a.example.com/bg.png", anchor: "center", width: 20, offsetX: 0, offsetY: 0 });
    const urls = remoteImageUrls(d);
    // Lima slot, tapi satu alamat dipakai dua kali, jadi yang unik empat.
    expect(urls).toHaveLength(4);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("gambar unggahan (data URI) tidak dihitung sebagai gambar luar", () => {
    expect(remoteImageUrls(withImages())).not.toContain(PNG);
  });

  it("host diambil dari alamat dan tanpa duplikat", () => {
    expect(remoteImageHosts(withImages()).sort()).toEqual(["a.example.com", "b.example.org", "c.example.net"]);
  });

  it("stripRemoteImages mengosongkan semua gambar luar di semua slot dan mempertahankan yang lain", () => {
    const d = withImages();
    const { design, removed } = stripRemoteImages(d);
    expect(removed).toBe(4);
    expect(remoteImageUrls(design)).toEqual([]);
    // Unggahan dipertahankan, dan struktur tetap utuh.
    expect(design.bubble.decorations.find((x) => x.id === "image-pin-cccc")).toMatchObject({ url: PNG });
    expect(design.bubble.decorations).toHaveLength(d.bubble.decorations.length);
    expect(design.panelImages).toHaveLength(1);
    expect(design.panelImages[0].url).toBe("");
    expect(design.avatar.frame.url).toBe("");
  });

  it("tidak mengubah desain asli", () => {
    const d = withImages();
    const before = JSON.stringify(d);
    stripRemoteImages(d);
    expect(JSON.stringify(d)).toBe(before);
  });

  it("stripRemoteImages dan stripUploadedImages saling melengkapi", () => {
    const both = stripUploadedImages(stripRemoteImages(withImages()).design).design;
    expect(remoteImageUrls(both)).toEqual([]);
    expect(JSON.stringify(both)).not.toContain("data:image");
  });
});
