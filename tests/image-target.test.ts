import { describe, expect, it } from "vitest";
import { findImage, IMAGE_SCOPES, listImageRefs, patchImage } from "@/lib/design/image-target";
import { designFromTemplate } from "@/lib/design/templates";
import { newDecoration } from "@/components/DecorationsEditor";
import { newPanelImage } from "@/components/PanelImagesEditor";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function withPin() {
  const d = designFromTemplate("crystal");
  const pin = { ...newDecoration("image-pin"), url: PNG } as ReturnType<typeof newDecoration>;
  return { ...d, bubble: { ...d.bubble, decorations: [...d.bubble.decorations, pin] } };
}

function withPanel() {
  const d = designFromTemplate("crystal");
  return { ...d, panelImages: [{ ...newPanelImage("front"), url: PNG }] };
}

describe("findImage", () => {
  it("menemukan image pin di bubble utama", () => {
    const d = withPin();
    const id = d.bubble.decorations.find((x) => x.kind === "image-pin")!.id;
    const g = findImage(d, { kind: "pin", scope: "default", id });
    expect(g?.url).toBe(PNG);
    expect(g?.kind).toBe("pin");
  });

  it("menemukan gambar panel", () => {
    const d = withPanel();
    const g = findImage(d, { kind: "panel", id: d.panelImages[0].id });
    expect(g?.kind).toBe("panel");
    expect(g?.height).toBe(d.panelImages[0].height);
  });

  it("null bila id tidak ada atau peran tidak punya bubble khusus", () => {
    const d = withPin();
    expect(findImage(d, { kind: "pin", scope: "default", id: "tidak-ada" })).toBeNull();
    expect(findImage(d, { kind: "pin", scope: "member", id: d.bubble.decorations[0].id })).toBeNull();
  });
});

describe("patchImage", () => {
  it("mengubah anchor, lebar, dan offset image pin", () => {
    const d = withPin();
    const id = d.bubble.decorations.find((x) => x.kind === "image-pin")!.id;
    const next = patchImage(d, { kind: "pin", scope: "default", id }, { anchor: "bottom-right", width: 60, offsetX: 10, offsetY: 20 });
    const dec = next.bubble.decorations.find((x) => x.id === id);
    expect(dec).toMatchObject({ anchor: "bottom-right", width: 60, offsetX: 10, offsetY: 20 });
  });

  it("memaksa nilai ke rentang skema pin, tidak pernah menghasilkan desain tidak valid", () => {
    const d = withPin();
    const id = d.bubble.decorations.find((x) => x.kind === "image-pin")!.id;
    const next = patchImage(d, { kind: "pin", scope: "default", id }, { width: 99999, offsetX: -99999, offsetY: 99999 });
    const dec = next.bubble.decorations.find((x) => x.id === id);
    if (dec?.kind !== "image-pin") throw new Error("bukan image-pin");
    expect(dec.width).toBe(400);
    expect(dec.offsetX).toBe(-100);
    expect(dec.offsetY).toBe(800);
  });

  it("memaksa nilai ke rentang skema panel, termasuk tinggi", () => {
    const d = withPanel();
    const id = d.panelImages[0].id;
    const next = patchImage(d, { kind: "panel", id }, { width: 99999, height: 99999, offsetX: -99999 });
    expect(next.panelImages[0]).toMatchObject({ width: 600, height: 600, offsetX: -1000 });
  });

  it("mengabaikan anchor yang tidak dikenal dan tidak mengubah field yang tidak dikirim", () => {
    const d = withPin();
    const before = d.bubble.decorations.find((x) => x.kind === "image-pin" && x.url === PNG)!;
    const id = before.id;
    // @ts-expect-error sengaja mengirim anchor tidak valid untuk menguji pertahanan
    const next = patchImage(d, { kind: "pin", scope: "default", id }, { anchor: "diagonal" });
    const dec = next.bubble.decorations.find((x) => x.id === id);
    if (dec?.kind !== "image-pin" || before.kind !== "image-pin") throw new Error("bukan image-pin");
    expect(dec.anchor).toBe(before.anchor);
    expect(dec.width).toBe(before.width);
  });

  it("desain sama saja bila ref tidak ditemukan", () => {
    const d = withPin();
    const next = patchImage(d, { kind: "panel", id: "tidak-ada" }, { width: 50 });
    expect(next).toBe(d);
  });

  it("bubble peran: patch masuk ke roleBubbles, bukan ke bubble utama", () => {
    let d = designFromTemplate("crystal");
    const pin = { ...newDecoration("image-pin"), url: PNG } as ReturnType<typeof newDecoration>;
    d = { ...d, roleBubbles: { ...d.roleBubbles, owner: { surface: { ...d.bubble, decorations: [pin] }, textColor: null } } };
    const next = patchImage(d, { kind: "pin", scope: "owner", id: pin.id }, { width: 55 });
    const dec = next.roleBubbles.owner?.surface.decorations.find((x) => x.id === pin.id);
    if (dec?.kind !== "image-pin") throw new Error("bukan image-pin");
    expect(dec.width).toBe(55);
    expect(next.bubble.decorations).toEqual(d.bubble.decorations);
  });
});

describe("listImageRefs", () => {
  it("kosong bila tidak ada gambar", () => {
    expect(listImageRefs(designFromTemplate("crystal"))).toEqual([]);
  });

  it("mendaftar pin dan gambar panel, mengabaikan yang url-nya kosong", () => {
    const d = withPanel();
    const pin = { ...newDecoration("image-pin"), url: PNG } as ReturnType<typeof newDecoration>;
    const emptyPin = newDecoration("image-pin");
    const withBoth = { ...d, bubble: { ...d.bubble, decorations: [pin, emptyPin] } };
    const refs = listImageRefs(withBoth);
    expect(refs).toHaveLength(2);
    expect(refs.some((r) => r.ref.kind === "pin" && r.ref.id === pin.id)).toBe(true);
    expect(refs.some((r) => r.ref.kind === "panel")).toBe(true);
  });

  it("mencakup semua scope yang terdaftar", () => {
    expect(IMAGE_SCOPES).toEqual(["default", "member", "moderator", "owner", "superchat", "membership", "sticker"]);
  });
});
