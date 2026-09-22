import { ANCHORS, type Anchor, type Decoration, type Design, type PanelImage, type RoleId, type Surface } from "./model";
import { PANEL_LIMITS, PIN_LIMITS } from "./gizmo-script";

/**
 * Menemukan dan mengubah satu gambar di desain untuk diatur langsung di canvas. Ada dua jenis: image pin
 * (menempel di bubble atau kartu) dan gambar panel (tetap di panel chat).
 */
export type ImageScope = "default" | RoleId | "superchat" | "membership" | "sticker";
export const IMAGE_SCOPES: readonly ImageScope[] = ["default", "member", "moderator", "owner", "superchat", "membership", "sticker"];

export type ImageRef = { kind: "pin"; scope: ImageScope; id: string } | { kind: "panel"; id: string };

export interface ImageGeometry {
  kind: "pin" | "panel";
  scope: ImageScope;
  id: string;
  url: string;
  anchor: Anchor;
  width: number;
  /** Hanya gambar panel yang punya tinggi sendiri. Tinggi image pin mengikuti proporsi gambar. */
  height: number;
  offsetX: number;
  offsetY: number;
}

export type ImagePatch = Partial<Pick<ImageGeometry, "anchor" | "width" | "height" | "offsetX" | "offsetY">>;

export function surfaceForScope(d: Design, scope: ImageScope): Surface | null {
  switch (scope) {
    case "default":
      return d.bubble;
    case "superchat":
      return d.superChat.surface;
    case "membership":
      return d.membership.surface;
    case "sticker":
      return d.sticker.surface;
    default:
      return d.roleBubbles[scope]?.surface ?? null;
  }
}

/** Mengganti dekorasi satu surface. Mengembalikan desain yang sama bila cakupannya tidak ada (peran tanpa bubble khusus). */
function mapSurface(d: Design, scope: ImageScope, fn: (decorations: Decoration[]) => Decoration[]): Design {
  const upd = <T extends Surface>(s: T): T => ({ ...s, decorations: fn(s.decorations) });
  switch (scope) {
    case "default":
      return { ...d, bubble: upd(d.bubble) };
    case "superchat":
      return { ...d, superChat: { ...d.superChat, surface: upd(d.superChat.surface) } };
    case "membership":
      return { ...d, membership: { ...d.membership, surface: upd(d.membership.surface) } };
    case "sticker":
      return { ...d, sticker: { ...d.sticker, surface: upd(d.sticker.surface) } };
    default: {
      const cur = d.roleBubbles[scope];
      return cur ? { ...d, roleBubbles: { ...d.roleBubbles, [scope]: { ...cur, surface: upd(cur.surface) } } } : d;
    }
  }
}

function pinOf(d: Design, scope: ImageScope, id: string) {
  const dec = surfaceForScope(d, scope)?.decorations.find((x) => x.id === id);
  return dec && dec.kind === "image-pin" ? dec : null;
}

export function findImage(d: Design, ref: ImageRef): ImageGeometry | null {
  if (ref.kind === "pin") {
    const p = pinOf(d, ref.scope, ref.id);
    return p ? { kind: "pin", scope: ref.scope, id: p.id, url: p.url, anchor: p.anchor, width: p.width, height: 0, offsetX: p.offsetX, offsetY: p.offsetY } : null;
  }
  const p = d.panelImages.find((x) => x.id === ref.id);
  return p ? { kind: "panel", scope: "default", id: p.id, url: p.url, anchor: p.anchor, width: p.width, height: p.height, offsetX: p.offsetX, offsetY: p.offsetY } : null;
}

const clampInt = (v: unknown, [lo, hi]: readonly [number, number] | readonly number[], fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;

/** Menerapkan perubahan dari canvas. Nilai dipaksa masuk ke rentang skema, jadi hasilnya selalu desain yang valid. */
export function patchImage(d: Design, ref: ImageRef, patch: ImagePatch): Design {
  const cur = findImage(d, ref);
  if (!cur) return d;
  const anchor = patch.anchor && (ANCHORS as readonly string[]).includes(patch.anchor) ? patch.anchor : cur.anchor;
  const limits = ref.kind === "pin" ? PIN_LIMITS : PANEL_LIMITS;
  const width = clampInt(patch.width, limits.width, cur.width);
  const offsetX = clampInt(patch.offsetX, limits.offset, cur.offsetX);
  const offsetY = clampInt(patch.offsetY, limits.offset, cur.offsetY);
  if (ref.kind === "pin") {
    return mapSurface(d, ref.scope, (list) => list.map((x) => (x.id === ref.id && x.kind === "image-pin" ? { ...x, anchor, width, offsetX, offsetY } : x)));
  }
  const height = clampInt(patch.height, PANEL_LIMITS.height, cur.height);
  return { ...d, panelImages: d.panelImages.map((x): PanelImage => (x.id === ref.id ? { ...x, anchor, width, height, offsetX, offsetY } : x)) };
}

/** Semua image pin dan gambar panel yang punya gambar, untuk daftar "Atur di canvas". */
export function listImageRefs(d: Design): Array<{ ref: ImageRef; label: string }> {
  const out: Array<{ ref: ImageRef; label: string }> = [];
  for (const scope of IMAGE_SCOPES) {
    for (const dec of surfaceForScope(d, scope)?.decorations ?? []) {
      if (dec.kind === "image-pin" && dec.url !== "") out.push({ ref: { kind: "pin", scope, id: dec.id }, label: `Pin, ${scope}` });
    }
  }
  for (const p of d.panelImages) if (p.url !== "") out.push({ ref: { kind: "panel", id: p.id }, label: `Panel, ${p.layer}` });
  return out;
}
