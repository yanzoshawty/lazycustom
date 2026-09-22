"use client";

import { Trash } from "@phosphor-icons/react";
import type { LibraryImage } from "@/lib/design/image-library";

const kb = (bytes: number) => Math.max(1, Math.round(bytes / 1024));

interface Props {
  items: LibraryImage[];
  /** Klik gambar untuk memakainya. */
  onPick: (item: LibraryImage) => void;
  onRemove?: (item: LibraryImage) => void;
  actionLabel?: string;
  /** Batasi jumlah yang ditampilkan (untuk strip ringkas). */
  limit?: number;
}

/** Kisi thumbnail pustaka. Tiap gambar adalah tombol, jadi bisa dipakai lewat keyboard. */
export function LibraryGrid({ items, onPick, onRemove, actionLabel = "Pakai", limit }: Props) {
  const shown = limit ? items.slice(0, limit) : items;
  if (shown.length === 0) return null;
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2" aria-label="Pustaka gambar">
      {shown.map((it) => (
        <li key={it.id} className="group relative">
          <button
            type="button"
            onClick={() => onPick(it)}
            aria-label={`${actionLabel} ${it.name}, ${it.width} kali ${it.height}, ${kb(it.bytes)} KB`}
            title={`${it.name} · ${it.width}×${it.height} · ${kb(it.bytes)} KB`}
            className="checker grid aspect-square w-full place-items-center overflow-hidden rounded-[8px] border border-line transition hover:border-accent focus-visible:border-accent active:scale-95"
          >
            {/* Data URI dari komputer user sendiri, tidak menghubungi server mana pun. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.dataUri} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
          </button>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(it)}
              aria-label={`Hapus ${it.name} dari pustaka`}
              className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border border-line-strong bg-surface text-ink-2 opacity-100 shadow-sm transition hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            >
              <Trash size={12} weight="bold" aria-hidden="true" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
