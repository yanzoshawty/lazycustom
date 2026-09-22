"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import type { ImageScope } from "@/lib/design/image-target";
import type { Decoration, DecorationKind } from "@/lib/design/model";
import { AnchorPicker, ColorField, Segmented, SliderField } from "./controls";
import { CanvasEditButton } from "./CanvasEditButton";
import { ImageSourceField } from "./ImageSourceField";

export const DECORATION_LABEL: Record<DecorationKind, string> = {
  glow: "Glow",
  "gradient-border": "Gradient border",
  "accent-bar": "Accent bar",
  corners: "Corner brackets",
  scanlines: "Scanlines",
  image: "Image (latar)",
  "image-pin": "Image pin",
  halftone: "Halftone",
  stripes: "Stripes",
};

const MAX_DECORATIONS = 8;
const ID_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

function decorationId(kind: DecorationKind): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `${kind}-${Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("")}`;
}

export function newDecoration(kind: DecorationKind): Decoration {
  const id = decorationId(kind);
  switch (kind) {
    case "glow":
      return { id, kind, color: "#7DD3FC", blur: 16, spread: 0, opacity: 35 };
    case "gradient-border":
      return { id, kind, width: 1, color: "#7DD3FC", color2: "#FFFFFF", angle: 135, opacity: 90 };
    case "accent-bar":
      return { id, kind, side: "left", thickness: 3, color: "#7DD3FC", color2: "#7DD3FC" };
    case "corners":
      return { id, kind, size: 10, thickness: 2, color: "#7DD3FC" };
    case "scanlines":
      return { id, kind, gap: 4, opacity: 10, color: "#7DD3FC" };
    case "image":
      return { id, kind, url: "", fit: "cover", position: "center", opacity: 60 };
    case "image-pin":
      return { id, kind, url: "", anchor: "top-right", width: 32, offsetX: 6, offsetY: 6 };
    case "halftone":
      return { id, kind, color: "#FFFFFF", size: 8, opacity: 14 };
    case "stripes":
      return { id, kind, color: "#FFFFFF", width: 6, gap: 10, angle: 45, opacity: 12 };
  }
}

/** Gradient border dan gambar hanya satu per permukaan, karena masing-masing memakai satu pseudo-element. */
const SINGLE: DecorationKind[] = ["gradient-border", "image"];

function Fields({ d, onChange, scope }: { d: Decoration; onChange: (next: Decoration) => void; scope: ImageScope }) {
  switch (d.kind) {
    case "glow":
      return (
        <>
          <ColorField label="Warna" value={d.color} onChange={(color) => onChange({ ...d, color })} />
          <SliderField label="Blur" value={d.blur} min={0} max={48} unit="px" onChange={(blur) => onChange({ ...d, blur })} />
          <SliderField label="Spread" value={d.spread} min={0} max={16} unit="px" onChange={(spread) => onChange({ ...d, spread })} />
          <SliderField label="Opacity" value={d.opacity} min={0} max={100} unit="%" onChange={(opacity) => onChange({ ...d, opacity })} />
        </>
      );
    case "gradient-border":
      return (
        <>
          <ColorField label="Start color" value={d.color} onChange={(color) => onChange({ ...d, color })} />
          <ColorField label="End color" value={d.color2} onChange={(color2) => onChange({ ...d, color2 })} />
          <SliderField label="Angle" value={d.angle} min={0} max={360} step={5} unit={"\u00b0"} onChange={(angle) => onChange({ ...d, angle })} />
          <SliderField label="Thickness" value={d.width} min={1} max={4} unit="px" onChange={(width) => onChange({ ...d, width })} />
          <SliderField label="Opacity" value={d.opacity} min={0} max={100} unit="%" onChange={(opacity) => onChange({ ...d, opacity })} />
        </>
      );
    case "accent-bar":
      return (
        <>
          <Segmented
            label="Side"
            small
            value={d.side}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
            ]}
            onChange={(side) => onChange({ ...d, side })}
          />
          <ColorField label="Start color" value={d.color} onChange={(color) => onChange({ ...d, color })} />
          <ColorField label="End color" value={d.color2} onChange={(color2) => onChange({ ...d, color2 })} />
          <SliderField label="Thickness" value={d.thickness} min={2} max={12} unit="px" onChange={(thickness) => onChange({ ...d, thickness })} />
        </>
      );
    case "corners":
      return (
        <>
          <ColorField label="Warna" value={d.color} onChange={(color) => onChange({ ...d, color })} />
          <SliderField label="Ukuran" value={d.size} min={6} max={24} unit="px" onChange={(size) => onChange({ ...d, size })} />
          <SliderField label="Thickness" value={d.thickness} min={1} max={4} unit="px" onChange={(thickness) => onChange({ ...d, thickness })} />
        </>
      );
    case "scanlines":
      return (
        <>
          <ColorField label="Warna" value={d.color} onChange={(color) => onChange({ ...d, color })} />
          <SliderField label="Line gap" value={d.gap} min={2} max={10} unit="px" onChange={(gap) => onChange({ ...d, gap })} />
          <SliderField label="Opacity" value={d.opacity} min={3} max={40} unit="%" onChange={(opacity) => onChange({ ...d, opacity })} />
        </>
      );
    case "halftone":
      return (
        <>
          <ColorField label="Warna" value={d.color} onChange={(color) => onChange({ ...d, color })} />
          <SliderField label="Dot size" value={d.size} min={4} max={20} unit="px" onChange={(size) => onChange({ ...d, size })} />
          <SliderField label="Opacity" value={d.opacity} min={3} max={60} unit="%" onChange={(opacity) => onChange({ ...d, opacity })} />
        </>
      );
    case "stripes":
      return (
        <>
          <ColorField label="Warna" value={d.color} onChange={(color) => onChange({ ...d, color })} />
          <SliderField label="Stripe width" value={d.width} min={2} max={20} unit="px" onChange={(width) => onChange({ ...d, width })} />
          <SliderField label="Line gap" value={d.gap} min={2} max={30} unit="px" onChange={(gap) => onChange({ ...d, gap })} />
          <SliderField label="Angle" value={d.angle} min={0} max={180} step={5} unit={"\u00b0"} onChange={(angle) => onChange({ ...d, angle })} />
          <SliderField label="Opacity" value={d.opacity} min={3} max={80} unit="%" onChange={(opacity) => onChange({ ...d, opacity })} />
        </>
      );
    case "image-pin":
      return (
        <>
          <ImageSourceField value={d.url} onChange={(url) => onChange({ ...d, url })} />
          <CanvasEditButton imgRef={{ kind: "pin", scope, id: d.id }} disabled={d.url === ""} />
          <AnchorPicker label="Position" value={d.anchor} onChange={(anchor) => onChange({ ...d, anchor })} />
          <SliderField label="Lebar" value={d.width} min={8} max={400} unit="px" onChange={(width) => onChange({ ...d, width })} />
          <SliderField label="Offset X" value={d.offsetX} min={-100} max={400} unit="px" onChange={(offsetX) => onChange({ ...d, offsetX })} />
          <SliderField label="Offset Y" value={d.offsetY} min={-100} max={400} unit="px" onChange={(offsetY) => onChange({ ...d, offsetY })} />
          <p className="text-xs text-ink-3">Tinggi mengikuti proporsi gambar. Bisa lebih dari satu gambar per permukaan. Gambar tidak bisa keluar dari bubble.</p>
        </>
      );
    case "image":
      return (
        <>
          <ImageSourceField value={d.url} onChange={(url) => onChange({ ...d, url })} />
          <Segmented
            label="Fit"
            small
            value={d.fit}
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
              { value: "tile", label: "Tile" },
            ]}
            onChange={(fit) => onChange({ ...d, fit })}
          />
          <Segmented
            label="Position"
            small
            value={d.position}
            options={[
              { value: "center", label: "Center" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
            ]}
            onChange={(position) => onChange({ ...d, position })}
          />
          <SliderField label="Opacity" value={d.opacity} min={5} max={100} unit="%" onChange={(opacity) => onChange({ ...d, opacity })} />
        </>
      );
  }
}

interface Props {
  decorations: Decoration[];
  /**
   * Menerima fungsi pembaharu, bukan array jadi: array baru dihitung dari state TERKINI saat perubahan
   * benar-benar diterapkan, bukan dari `decorations` yang ditutup (closure) saat tombol digambar. Ini
   * penting karena mengunggah gambar tidak instan; dua unggahan yang hampir bersamaan (dua image pin
   * sekaligus) bisa saling menimpa kalau array dihitung lebih awal dari nilai yang sudah basi.
   */
  onChange: (updater: (prev: Decoration[]) => Decoration[], key: string) => void;
  /** Permukaan pemilik dekorasi ini, dipakai untuk mengatur image pin langsung di canvas. */
  scope?: ImageScope;
}

export function DecorationsEditor({ decorations, onChange, scope = "default" }: Props) {
  const full = decorations.length >= MAX_DECORATIONS;
  const kinds = Object.keys(DECORATION_LABEL) as DecorationKind[];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="text-sm font-medium text-ink">Tambah dekorasi</p>
        <div className="flex flex-wrap gap-2">
          {kinds.map((kind) => {
            const taken = SINGLE.includes(kind) && decorations.some((d) => d.kind === kind);
            return (
              <button
                key={kind}
                type="button"
                disabled={full || taken}
                onClick={() => onChange((prev) => [...prev, newDecoration(kind)], `deco.add.${kind}`)}
                title={taken ? `${DECORATION_LABEL[kind]} hanya bisa satu per permukaan` : undefined}
                className="inline-flex h-9 items-center gap-1.5 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:text-ink"
              >
                <Plus size={14} weight="bold" aria-hidden="true" />
                {DECORATION_LABEL[kind]}
              </button>
            );
          })}
        </div>
        {full ? <p className="text-xs text-ink-3">Batas {MAX_DECORATIONS} dekorasi tercapai. Hapus satu untuk menambah lagi.</p> : null}
      </div>

      {decorations.length === 0 ? (
        <p className="rounded-field border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-3">
          Belum ada dekorasi. Tambahkan glow, border gradient, atau bentuk di atas.
        </p>
      ) : (
        <ul className="grid gap-3">
          {decorations.map((d, index) => (
            <li key={d.id} className="grid gap-4 rounded-field border border-line bg-surface-2/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold text-ink">
                  {DECORATION_LABEL[d.kind]}
                  <span className="ml-2 font-mono text-xs font-normal text-ink-3">#{index + 1}</span>
                </p>
                <button
                  type="button"
                  onClick={() => onChange((prev) => prev.filter((x) => x.id !== d.id), `deco.remove.${d.id}`)}
                  aria-label={`Hapus ${DECORATION_LABEL[d.kind]} #${index + 1}`}
                  className="inline-flex size-9 items-center justify-center rounded-field text-ink-2 transition hover:bg-danger-soft hover:text-danger active:scale-95"
                >
                  <Trash size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>
              <Fields
                scope={scope}
                d={d}
                onChange={(next) => onChange((prev) => prev.map((x) => (x.id === d.id ? next : x)), `deco.${d.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
