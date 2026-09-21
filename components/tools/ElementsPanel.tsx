"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { DECORATION_KINDS, type DecorationKind, type Design, type Surface } from "@/lib/design/model";
import { DECORATION_LABEL, newDecoration } from "../DecorationsEditor";
import { Section, Segmented, SliderField } from "../controls";
import type { Edit } from "../Inspector";

type Target = "bubble" | "superChat" | "membership" | "sticker";

const TARGETS: Array<{ value: Target; label: string }> = [
  { value: "bubble", label: "Bubble" },
  { value: "superChat", label: "Super Chat" },
  { value: "membership", label: "Membership" },
  { value: "sticker", label: "Sticker" },
];

const DESCRIPTION: Record<DecorationKind, string> = {
  glow: "Cahaya di sekeliling",
  "gradient-border": "Garis tepi gradasi",
  "accent-bar": "Strip warna di satu sisi",
  corners: "Siku ala HUD",
  scanlines: "Garis layar CRT",
  image: "Gambar sebagai latar",
  "image-pin": "Gambar kecil di titik pilihan",
  halftone: "Pola titik komik",
  stripes: "Garis miring berulang",
};

/** Gradient border dan gambar latar hanya satu per permukaan, karena masing-masing memakai satu pseudo-element. */
const SINGLE: DecorationKind[] = ["gradient-border", "image"];
const MAX = 8;

function surfaceOf(d: Design, t: Target): Surface {
  return t === "bubble" ? d.bubble : d[t].surface;
}

interface Props {
  design: Design;
  edit: Edit;
  onOpenLayer: (layer: "panel" | "bubble" | "superchat" | "membership" | "sticker") => void;
  onNotice: (text: string) => void;
}

export function ElementsPanel({ design: d, edit, onOpenLayer, onNotice }: Props) {
  const [target, setTarget] = useState<Target>("bubble");
  const surface = surfaceOf(d, target);

  const setSurface = (fn: (s: Surface) => Surface, key: string) =>
    edit((x) => (target === "bubble" ? { ...x, bubble: { ...x.bubble, ...fn(x.bubble) } } : { ...x, [target]: { ...x[target], surface: fn(x[target].surface) } }), `${target}.${key}`);

  function add(kind: DecorationKind) {
    setSurface((s) => ({ ...s, decorations: [...s.decorations, newDecoration(kind)] }), `elements.add.${kind}`);
    onNotice(`${DECORATION_LABEL[kind]} ditambahkan ke ${TARGETS.find((t) => t.value === target)?.label}`);
  }

  const layerOf = { bubble: "bubble", superChat: "superchat", membership: "membership", sticker: "sticker" } as const;

  return (
    <div className="grid gap-7">
      <p className="text-sm text-ink-2">Klik sebuah elemen untuk menambahkannya ke bubble atau kartu. Pengaturan detailnya ada di Properties.</p>

      <Segmented label="Tambahkan ke" small value={target} options={TARGETS} onChange={setTarget} />

      <Section title="Shape">
        <Segmented
          label="Bentuk sudut"
          small
          value={surface.shape}
          options={[
            { value: "round", label: "Round" },
            { value: "slant", label: "Slant" },
            { value: "chamfer", label: "Chamfer" },
          ]}
          onChange={(shape) => setSurface((s) => ({ ...s, shape }), "shape")}
        />
        {surface.shape !== "round" ? (
          <>
            <SliderField label="Cut size" value={surface.cut} min={4} max={28} unit="px" onChange={(cut) => setSurface((s) => ({ ...s, cut }), "cut")} />
            <p className="text-xs text-ink-3">Bentuk ini memotong sudut dengan clip-path, jadi Glow dan Hard shadow yang keluar dari kotak ikut terpotong.</p>
          </>
        ) : null}
      </Section>

      <Section title={`Elements (${surface.decorations.length}/${MAX})`}>
        <ul className="grid grid-cols-2 gap-2">
          {DECORATION_KINDS.map((kind) => {
            const taken = SINGLE.includes(kind) && surface.decorations.some((x) => x.kind === kind);
            const full = surface.decorations.length >= MAX;
            return (
              <li key={kind}>
                <button
                  type="button"
                  disabled={taken || full}
                  onClick={() => add(kind)}
                  title={taken ? `${DECORATION_LABEL[kind]} hanya bisa satu per permukaan` : undefined}
                  className="grid h-full w-full gap-0.5 rounded-field border border-line-strong bg-surface p-2.5 text-left transition hover:border-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line-strong"
                >
                  <span className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                    <Plus size={14} weight="bold" aria-hidden="true" />
                    {DECORATION_LABEL[kind]}
                  </span>
                  <span className="text-xs text-ink-2">{DESCRIPTION[kind]}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {surface.decorations.length >= MAX ? <p className="text-xs text-ink-3">Batas {MAX} elemen tercapai. Hapus satu di Properties untuk menambah lagi.</p> : null}
      </Section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpenLayer(layerOf[target])}
          className="h-10 rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
        >
          Edit di Properties
        </button>
        <button
          type="button"
          onClick={() => onOpenLayer("panel")}
          className="h-10 rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
        >
          Tambah gambar panel
        </button>
      </div>
    </div>
  );
}
