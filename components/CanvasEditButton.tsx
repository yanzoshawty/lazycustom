"use client";

import { ArrowsOutCardinal, Check } from "@phosphor-icons/react";
import type { ImageRef } from "@/lib/design/image-target";
import { useCanvas } from "./canvas-context";

const same = (a: ImageRef | null, b: ImageRef) => !!a && a.kind === b.kind && a.id === b.id && (a.kind === "panel" || (b.kind === "pin" && a.scope === b.scope));

interface Props {
  imgRef: ImageRef;
  /** Tanpa gambar belum ada yang bisa diatur. */
  disabled?: boolean;
}

/** Membuka mode atur-di-canvas untuk satu gambar: geser untuk memindah, tarik sudut untuk mengubah ukuran. */
export function CanvasEditButton({ imgRef, disabled = false }: Props) {
  const canvas = useCanvas();
  if (!canvas) return null;
  const active = same(canvas.imageEdit, imgRef);
  return (
    <div className="grid gap-1">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={active}
        onClick={() => (active ? canvas.stopImageEdit() : canvas.startImageEdit(imgRef))}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-field border border-line-strong bg-surface px-3.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent"
      >
        {active ? <Check size={18} weight="bold" aria-hidden="true" /> : <ArrowsOutCardinal size={18} weight="bold" aria-hidden="true" />}
        {active ? "Selesai mengatur" : "Atur di canvas"}
      </button>
      <p className="text-xs text-ink-3">{active ? "Geser gambar di preview, tarik titik di sudutnya untuk ukuran. Panah keyboard menggeser 1 px, Shift 10 px." : disabled ? "Pilih gambar dulu." : "Geser dan ubah ukuran langsung di preview."}</p>
    </div>
  );
}
