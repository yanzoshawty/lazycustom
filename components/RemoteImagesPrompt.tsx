"use client";

import { ShieldWarning } from "@phosphor-icons/react";

interface Props {
  source: "share" | "file";
  count: number;
  hosts: string[];
  /** true: buka dengan gambar dari luar. false: buka tanpa gambar dari luar. */
  onChoose: (withImages: boolean) => void;
}

/**
 * Pertanyaan sebelum membuka desain dari orang lain yang memuat gambar dari server luar.
 * Memuat gambar memberi server itu alamat IP pembukanya (pola pelacakan yang umum), jadi
 * pilihan yang aman, buka tanpa gambar, ada di depan dan mendapat fokus.
 */
export function RemoteImagesPrompt({ source, count, hosts, onChoose }: Props) {
  const shown = hosts.slice(0, 3).join(", ");
  const more = hosts.length > 3 ? ` dan ${hosts.length - 3} lainnya` : "";
  const from = source === "share" ? "Link Share ini" : "File ini";
  return (
    <section
      role="alertdialog"
      aria-labelledby="remote-images-title"
      aria-describedby="remote-images-body"
      className="flex gap-3 rounded-field border border-warn/40 bg-warn-soft p-3.5 text-sm"
    >
      <ShieldWarning size={22} weight="fill" className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
      <div className="grid min-w-0 flex-1 gap-2.5">
        <p id="remote-images-title" className="font-semibold text-warn">
          Desain ini memuat gambar dari alamat luar
        </p>
        <p id="remote-images-body" className="text-ink">
          {from} memakai {count} gambar dari <span className="break-all font-mono text-xs">{shown}</span>
          {more}. Begitu dimuat, pemilik server itu bisa melihat alamat IP-mu. Buka tanpa gambar dulu kalau kamu tidak mengenal pengirimnya.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => onChoose(false)}
            className="h-10 rounded-field bg-accent px-4 text-sm font-semibold text-on-accent transition hover:brightness-110 active:scale-95"
          >
            Buka tanpa gambar
          </button>
          <button
            type="button"
            onClick={() => onChoose(true)}
            className="h-10 rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
          >
            Buka dengan gambar
          </button>
        </div>
      </div>
    </section>
  );
}
