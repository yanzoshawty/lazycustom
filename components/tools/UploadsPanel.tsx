"use client";

import { useRef, useState } from "react";
import { PencilSimple, Trash, UploadSimple } from "@phosphor-icons/react";
import {
  dataImageChars,
  imageSources,
  MAX_DESIGN_DATA_CHARS,
  replaceImageSource,
  type Design,
} from "@/lib/design/model";
import { newDecoration } from "../DecorationsEditor";
import { ImageEditor } from "../ImageEditor";
import { newPanelImage } from "../PanelImagesEditor";
import { SelectField, Section } from "../controls";
import type { Edit } from "../Inspector";
import { LibraryGrid } from "../LibraryGrid";
import { useImageLibrary, useImportImage } from "../useImageLibrary";
import { imageLibrary, type LibraryImage } from "@/lib/design/image-library";

type Destination = "pin" | "fill" | "panel-front" | "panel-behind" | "frame";

const DESTINATIONS: Array<{ value: Destination; label: string }> = [
  { value: "pin", label: "Bubble (image pin)" },
  { value: "fill", label: "Bubble (latar)" },
  { value: "panel-front", label: "Panel (depan pesan)" },
  { value: "panel-behind", label: "Panel (belakang pesan)" },
  { value: "frame", label: "Avatar frame" },
];

const MAX_DECORATIONS = 8;
const kb = (chars: number) => Math.max(1, Math.round((chars * 0.75) / 1024));

function mimeOf(src: string): string {
  return src.startsWith("data:") ? src.slice(5, src.indexOf(";")).replace("image/", "").toUpperCase() : "LINK";
}

function hostOf(src: string): string {
  try {
    return new URL(src).host;
  } catch {
    return "link";
  }
}

interface Props {
  design: Design;
  edit: Edit;
  onNotice: (text: string) => void;
}

export function UploadsPanel({ design: d, edit, onNotice }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dest, setDest] = useState<Destination>("pin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const library = useImageLibrary();
  const importImage = useImportImage();
  const sources = imageSources(d);
  const used = dataImageChars(d);

  /** Menaruh gambar baru di tujuan. Mengembalikan pesan alasan bila tujuan penuh. */
  function place(dataUri: string): string | null {
    if (dest === "pin" || dest === "fill") {
      if (d.bubble.decorations.length >= MAX_DECORATIONS && !(dest === "fill" && d.bubble.decorations.some((x) => x.kind === "image"))) {
        return "Bubble sudah memuat 8 dekorasi. Hapus satu dulu.";
      }
      edit((x) => {
        if (dest === "pin") {
          const pin = newDecoration("image-pin");
          return { ...x, bubble: { ...x.bubble, decorations: [...x.bubble.decorations, { ...pin, url: dataUri } as typeof pin] } };
        }
        const existing = x.bubble.decorations.find((y) => y.kind === "image");
        if (existing) {
          return { ...x, bubble: { ...x.bubble, decorations: x.bubble.decorations.map((y) => (y === existing ? { ...y, url: dataUri } : y)) } };
        }
        const fill = newDecoration("image");
        return { ...x, bubble: { ...x.bubble, decorations: [...x.bubble.decorations, { ...fill, url: dataUri } as typeof fill] } };
      }, "uploads.place");
      return null;
    }
    if (dest === "frame") {
      edit((x) => ({ ...x, avatar: { ...x.avatar, frame: { ...x.avatar.frame, url: dataUri } } }), "uploads.place");
      return null;
    }
    const layer = dest === "panel-front" ? "front" : "behind";
    if (d.panelImages.filter((i) => i.layer === layer).length >= 2) return "Panel sudah memuat dua gambar di lapisan itu. Hapus satu dulu.";
    edit((x) => ({ ...x, panelImages: [...x.panelImages, { ...newPanelImage(layer), url: dataUri }] }), "uploads.place");
    return null;
  }

  /** Menaruh satu gambar dari pustaka ke tujuan, dengan pemeriksaan batas total gambar di desain ini. */
  function placeFromLibrary(item: LibraryImage) {
    if (used + item.dataUri.length > MAX_DESIGN_DATA_CHARS) {
      setError(`Total gambar unggahan di desain ini melebihi batas (${kb(MAX_DESIGN_DATA_CHARS)} KB). Hapus gambar yang tidak dipakai dulu.`);
      return;
    }
    const problem = place(item.dataUri);
    if (problem) setError(problem);
    else {
      setError(null);
      onNotice("Gambar ditaruh di desain");
    }
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 10);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setBusy(true);
    let added: LibraryImage | null = null;
    let count = 0;
    const problems: string[] = [];
    for (const file of files) {
      const result = await importImage(file);
      if (result.ok) {
        count += 1;
        added = result.item;
      } else problems.push(`${file.name}: ${result.message}`);
    }
    setBusy(false);
    if (problems.length) setError(problems.join(" "));
    if (count === 0) return;
    onNotice(count === 1 ? "Gambar disimpan di pustaka" : `${count} gambar disimpan di pustaka`);
    // Satu gambar: langsung ditaruh di tujuan, seperti sebelumnya. Beberapa gambar: user memilih sendiri dari pustaka.
    if (files.length === 1 && added) placeFromLibrary(added);
  }

  function applyEdit(dataUri: string) {
    if (editing === null) return;
    const next = replaceImageSource(d, editing, dataUri).design;
    if (dataImageChars(next) > MAX_DESIGN_DATA_CHARS) {
      setError("Hasil sunting membuat total gambar melebihi batas per desain.");
      setEditing(null);
      return;
    }
    edit((x) => replaceImageSource(x, editing, dataUri).design, "uploads.adjust");
    setEditing(null);
    onNotice("Gambar disesuaikan");
  }

  return (
    <div className="grid gap-7">
      <p className="text-sm text-ink-2">
        Unggah PNG, JPEG, GIF, atau WebP. Gambar dimampatkan otomatis dan disimpan di komputer ini (di browser), tidak dikirim ke server. Taruh di bubble, panel, atau avatar, lalu atur posisinya langsung di canvas.
      </p>

      <Section title="Upload">
        <SelectField label="Taruh di" value={dest} options={DESTINATIONS} onChange={setDest} />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-11 w-fit items-center gap-2 rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:opacity-60"
        >
          <UploadSimple size={18} weight="bold" aria-hidden="true" />
          {busy ? "Memampatkan..." : "Pilih gambar"}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" onChange={pick} className="sr-only" tabIndex={-1} aria-label="Pilih file gambar" />
        {error ? (
          <p role="alert" className="rounded-field bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-ink-3">
          Terpakai {kb(used)} dari {kb(MAX_DESIGN_DATA_CHARS)} KB gambar unggahan. Gambar unggahan tidak ikut link Share.
        </p>
      </Section>

      <Section title={`Pustaka gambar (${library.items.length})`}>
        {library.status === "memory" ? (
          <p role="status" className="rounded-field bg-surface-2 px-3 py-2 text-xs text-ink-2">
            Browser ini tidak mengizinkan penyimpanan permanen (mode privat?). Gambar di pustaka hilang saat tab ditutup.
          </p>
        ) : null}
        {library.items.length === 0 ? (
          <p className="rounded-field border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-3">
            Pustaka masih kosong. Gambar yang kamu unggah tersimpan di sini dan bisa dipakai di desain mana pun.
          </p>
        ) : (
          <>
            <LibraryGrid items={library.items} onPick={placeFromLibrary} onRemove={(it) => void imageLibrary.remove(it.id)} />
            <p className="text-xs text-ink-3">Klik gambar untuk menaruhnya di tujuan yang dipilih. Menghapus dari pustaka tidak menghapusnya dari desain yang sudah memakainya.</p>
          </>
        )}
      </Section>

      <Section title={`Images in this design (${sources.length})`}>
        {sources.length === 0 ? (
          <p className="rounded-field border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-3">Belum ada gambar di desain ini.</p>
        ) : (
          <ul aria-label="Images in this design" className="grid gap-2">
            {sources.map((src) => {
              const uploaded = src.startsWith("data:");
              const gif = src.startsWith("data:image/gif");
              const places = replaceImageSource(d, src, src).changed;
              return (
                <li key={src} className="flex items-center gap-3 rounded-field border border-line bg-surface p-2">
                  <div className="checker grid size-14 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-line">
                    {uploaded ? (
                      // Hanya gambar unggahan yang dipratinjau. Gambar dari link tidak dimuat di sini supaya tidak menghubungi server lain.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="px-1 text-center text-[10px] font-semibold text-ink">LINK</span>
                    )}
                  </div>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <p className="truncate font-display text-sm font-semibold text-ink">{uploaded ? `${mimeOf(src)}, ${kb(src.length)} KB` : hostOf(src)}</p>
                    <p className="text-xs text-ink-3">Dipakai di {places} tempat</p>
                  </div>
                  <button
                    type="button"
                    disabled={!uploaded || gif}
                    onClick={() => setEditing(src)}
                    title={gif ? "GIF tidak bisa di-crop atau difilter tanpa kehilangan animasinya" : !uploaded ? "Hanya gambar unggahan yang bisa disesuaikan" : undefined}
                    aria-label={`Adjust gambar ${mimeOf(src)}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-field border border-line-strong bg-surface px-2.5 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:text-ink"
                  >
                    <PencilSimple size={14} weight="bold" aria-hidden="true" />
                    Adjust
                  </button>
                  <button
                    type="button"
                    onClick={() => edit((x) => replaceImageSource(x, src, "").design, "uploads.remove")}
                    aria-label={`Hapus gambar ${uploaded ? mimeOf(src) : hostOf(src)}`}
                    className="inline-flex size-9 items-center justify-center rounded-field text-ink-2 transition hover:bg-danger-soft hover:text-danger active:scale-95"
                  >
                    <Trash size={18} weight="bold" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-ink-3">
          GIF tidak bisa di-crop atau difilter karena animasinya akan hilang. Ukuran, posisi, dan opacity GIF tetap diatur di Properties.
        </p>
      </Section>

      {editing !== null ? <ImageEditor src={editing} onApply={applyEdit} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
