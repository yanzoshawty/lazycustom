"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, ArrowCounterClockwise, FlipHorizontal, FlipVertical, X } from "@phosphor-icons/react";
import {
  ASPECTS,
  DEFAULT_EDIT,
  encodeUnderLimit,
  isIdentity,
  renderEdited,
  supportsFilter,
  type EditParams,
  type Rotation,
} from "@/lib/design/image-edit";
import { UPLOAD_MESSAGE } from "@/lib/design/upload";
import { Section, Segmented, SliderField } from "./controls";

interface Props {
  /** Data URI gambar yang disunting (PNG, JPEG, atau WebP). GIF tidak bisa disunting karena animasinya hilang. */
  src: string;
  onApply: (dataUri: string) => void;
  onClose: () => void;
}

const PREVIEW_MAX = 320;
const iconBtn =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-field border border-line-strong bg-surface px-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 aria-pressed:border-accent aria-pressed:bg-accent-soft";

/**
 * Editor gambar ala Canva: putar, flip, crop (rasio, zoom, geser), dan filter. Hasilnya dipanggang ke gambar
 * baru yang dijamin di bawah 100 KB dan lolos pemeriksaan byte yang sama dengan unggahan biasa.
 */
export function ImageEditor({ src, onApply, onClose }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [p, setP] = useState<EditParams>(DEFAULT_EDIT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const filters = supportsFilter();
  const patch = (o: Partial<EditParams>) => setP((x) => ({ ...x, ...o }));

  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.onerror = () => setError("Gambar tidak bisa dibuka untuk disunting.");
    i.src = src;
  }, [src]);

  useEffect(() => {
    if (img && canvasRef.current) renderEdited(img, p, canvasRef.current, PREVIEW_MAX);
  }, [img, p]);

  // Fokus masuk ke dialog, Escape menutup, dan Tab berputar di dalam dialog.
  useEffect(() => {
    const el = dialogRef.current;
    el?.focus();
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus?.();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input, select, [tabindex]:not([tabindex='-1'])")].filter((n) => n.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function apply() {
    if (!img) return;
    setBusy(true);
    setError(null);
    const full = document.createElement("canvas");
    renderEdited(img, p, full);
    const result = await encodeUnderLimit(full);
    setBusy(false);
    if (!result.ok) {
      setError(UPLOAD_MESSAGE[result.reason]);
      return;
    }
    onApply(result.dataUri);
  }

  const rotate = (delta: 90 | -90) => patch({ rotate: (((p.rotate + delta + 360) % 360) as Rotation) });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-editor-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="panel grid max-h-[92dvh] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-b-none sm:rounded-b-[16px]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id="image-editor-title" className="font-display text-lg font-bold text-ink">
            Adjust image
          </h2>
          <button type="button" onClick={onClose} aria-label="Tutup editor gambar" className="inline-flex size-10 items-center justify-center rounded-field text-ink-2 transition hover:bg-surface-2 hover:text-ink">
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="grid content-start gap-3">
            <div className="checker grid min-h-[200px] place-items-center overflow-hidden rounded-field border border-line p-3">
              {img ? <canvas ref={canvasRef} aria-label="Pratinjau hasil sunting" className="max-h-[46dvh] max-w-full" /> : <p className="text-sm text-ink">Memuat gambar...</p>}
            </div>
            <p className="text-xs text-ink-3">Hasil disimpan sebagai gambar diam dan dikecilkan otomatis sampai di bawah 100 KB.</p>
          </div>

          <div className="grid content-start gap-6">
            <Section title="Rotate and flip">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => rotate(-90)} className={iconBtn} aria-label="Putar 90 derajat ke kiri">
                  <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" />
                  Left
                </button>
                <button type="button" onClick={() => rotate(90)} className={iconBtn} aria-label="Putar 90 derajat ke kanan">
                  <ArrowClockwise size={18} weight="bold" aria-hidden="true" />
                  Right
                </button>
                <button type="button" onClick={() => patch({ flipH: !p.flipH })} aria-pressed={p.flipH} className={iconBtn} aria-label="Balik horizontal">
                  <FlipHorizontal size={18} weight="bold" aria-hidden="true" />
                  Flip H
                </button>
                <button type="button" onClick={() => patch({ flipV: !p.flipV })} aria-pressed={p.flipV} className={iconBtn} aria-label="Balik vertikal">
                  <FlipVertical size={18} weight="bold" aria-hidden="true" />
                  Flip V
                </button>
              </div>
            </Section>

            <Section title="Crop">
              <Segmented label="Aspect ratio" small value={p.aspect} options={ASPECTS.map((a) => ({ value: a, label: a === "original" ? "Original" : a }))} onChange={(aspect) => patch({ aspect })} />
              <SliderField label="Zoom" value={p.zoom} min={100} max={400} step={5} unit="%" onChange={(zoom) => patch({ zoom })} />
              <SliderField label="Pan X" value={p.panX} min={0} max={100} unit="%" onChange={(panX) => patch({ panX })} />
              <SliderField label="Pan Y" value={p.panY} min={0} max={100} unit="%" onChange={(panY) => patch({ panY })} />
            </Section>

            <Section title="Filters">
              {filters ? (
                <>
                  <SliderField label="Brightness" value={p.brightness} min={50} max={150} unit="%" onChange={(brightness) => patch({ brightness })} />
                  <SliderField label="Contrast" value={p.contrast} min={50} max={150} unit="%" onChange={(contrast) => patch({ contrast })} />
                  <SliderField label="Saturation" value={p.saturate} min={0} max={200} unit="%" onChange={(saturate) => patch({ saturate })} />
                  <SliderField label="Grayscale" value={p.grayscale} min={0} max={100} unit="%" onChange={(grayscale) => patch({ grayscale })} />
                  <SliderField label="Hue" value={p.hue} min={0} max={360} step={5} unit={"\u00b0"} onChange={(hue) => patch({ hue })} />
                  <SliderField label="Blur" value={p.blur} min={0} max={8} step={0.5} unit="px" onChange={(blur) => patch({ blur })} />
                </>
              ) : (
                <p className="rounded-field bg-surface-2 px-3 py-2 text-sm text-ink-2">Browser ini belum mendukung filter gambar. Rotasi, flip, dan crop tetap bisa dipakai.</p>
              )}
            </Section>

            <Section title="Output">
              <SliderField label="Max size" value={p.maxDim} min={32} max={512} step={16} unit="px" hint="Sisi terpanjang hasil. Gambar tidak pernah diperbesar." onChange={(maxDim) => patch({ maxDim })} />
            </Section>
          </div>
        </div>

        <footer className="grid gap-2 border-t border-line px-4 py-3">
          {error ? (
            <p role="alert" className="rounded-field bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setP(DEFAULT_EDIT)} disabled={isIdentity(p) && p.maxDim === DEFAULT_EDIT.maxDim} className="h-10 rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-45">
              Reset
            </button>
            <button type="button" onClick={onClose} className="h-10 rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95">
              Cancel
            </button>
            <button type="button" onClick={apply} disabled={!img || busy} className="h-10 rounded-field bg-accent px-5 text-sm font-semibold text-on-accent transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Memproses..." : "Apply"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
