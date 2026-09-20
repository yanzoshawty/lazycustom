"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import type { PanelImage } from "@/lib/design/model";
import { AnchorPicker, Segmented, SliderField } from "./controls";
import { ImageSourceField } from "./ImageSourceField";

const ID_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
const MAX_PER_LAYER = 2;

function panelImageId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `panel-${Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("")}`;
}

export function newPanelImage(layer: PanelImage["layer"]): PanelImage {
  return { id: panelImageId(), url: "", layer, anchor: "top-right", width: 120, height: 120, offsetX: 12, offsetY: 12, opacity: 100, fit: "contain" };
}

interface Props {
  images: PanelImage[];
  onChange: (next: PanelImage[], key: string) => void;
}

export function PanelImagesEditor({ images, onChange }: Props) {
  const count = (layer: PanelImage["layer"]) => images.filter((i) => i.layer === layer).length;
  const patch = (id: string, fn: (i: PanelImage) => PanelImage) => onChange(images.map((i) => (i.id === id ? fn(i) : i)), `panel.image.${id}`);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-2">
        Gambar atau GIF yang tetap di satu tempat di panel chat, misalnya logo, banner, atau hiasan latar. Paling banyak dua di belakang pesan dan dua di depan pesan.
      </p>
      <div className="flex flex-wrap gap-2">
        {(["behind", "front"] as const).map((layer) => (
          <button
            key={layer}
            type="button"
            disabled={count(layer) >= MAX_PER_LAYER}
            onClick={() => onChange([...images, newPanelImage(layer)], `panel.image.add.${layer}`)}
            className="inline-flex h-9 items-center gap-1.5 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:text-ink"
          >
            <Plus size={14} weight="bold" aria-hidden="true" />
            {layer === "behind" ? "Gambar di belakang pesan" : "Gambar di depan pesan"}
          </button>
        ))}
      </div>

      {images.length === 0 ? (
        <p className="rounded-field border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-3">Belum ada gambar panel.</p>
      ) : (
        <ul className="grid gap-3">
          {images.map((img, index) => (
            <li key={img.id} className="grid gap-4 rounded-field border border-line bg-surface-2/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold text-ink">
                  Gambar panel <span className="font-mono text-xs font-normal text-ink-3">#{index + 1}</span>
                </p>
                <button
                  type="button"
                  onClick={() => onChange(images.filter((i) => i.id !== img.id), `panel.image.remove.${img.id}`)}
                  aria-label={`Hapus gambar panel #${index + 1}`}
                  className="inline-flex size-9 items-center justify-center rounded-field text-ink-2 transition hover:bg-danger-soft hover:text-danger active:scale-95"
                >
                  <Trash size={18} weight="bold" aria-hidden="true" />
                </button>
              </div>
              <ImageSourceField value={img.url} onChange={(url) => patch(img.id, (i) => ({ ...i, url }))} />
              <Segmented
                label="Layer"
                small
                value={img.layer}
                options={[
                  { value: "behind", label: "Belakang pesan" },
                  { value: "front", label: "Depan pesan" },
                ]}
                onChange={(layer) => {
                  if (layer !== img.layer && count(layer) >= MAX_PER_LAYER) return;
                  patch(img.id, (i) => ({ ...i, layer }));
                }}
              />
              <AnchorPicker label="Position" value={img.anchor} onChange={(anchor) => patch(img.id, (i) => ({ ...i, anchor }))} />
              <SliderField label="Lebar" value={img.width} min={16} max={600} unit="px" onChange={(width) => patch(img.id, (i) => ({ ...i, width }))} />
              <SliderField label="Tinggi" value={img.height} min={16} max={600} unit="px" onChange={(height) => patch(img.id, (i) => ({ ...i, height }))} />
              <SliderField label="Offset X" value={img.offsetX} min={-300} max={300} unit="px" onChange={(offsetX) => patch(img.id, (i) => ({ ...i, offsetX }))} />
              <SliderField label="Offset Y" value={img.offsetY} min={-300} max={300} unit="px" onChange={(offsetY) => patch(img.id, (i) => ({ ...i, offsetY }))} />
              <SliderField label="Opacity" value={img.opacity} min={5} max={100} unit="%" onChange={(opacity) => patch(img.id, (i) => ({ ...i, opacity }))} />
              <Segmented
                label="Fit"
                small
                value={img.fit}
                options={[
                  { value: "contain", label: "Contain" },
                  { value: "cover", label: "Cover" },
                ]}
                onChange={(fit) => patch(img.id, (i) => ({ ...i, fit }))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
