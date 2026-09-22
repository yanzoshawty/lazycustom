"use client";

import { createContext, useContext, useRef, useState } from "react";
import { ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import { isSafeImageUrl, MAX_DESIGN_DATA_CHARS } from "@/lib/design/model";
import { TextField } from "./controls";
import { LibraryGrid } from "./LibraryGrid";
import { useImageLibrary, useImportImage } from "./useImageLibrary";

/** Jumlah karakter data unggahan yang sudah dipakai desain aktif. Diisi oleh Inspector. */
export const ImageBudgetContext = createContext(0);

const kb = (chars: number) => Math.max(1, Math.round((chars * 0.75) / 1024));

interface Props {
  label?: string;
  value: string;
  onChange: (url: string) => void;
}

/**
 * Sumber gambar: link https yang diketik, atau file dari komputer (maks 100 KB) yang disimpan di dalam
 * desain. Link yang tidak aman ditolak dengan alasan, dan file divalidasi dari byte awalnya.
 */
export function ImageSourceField({ label = "Link gambar atau GIF", value, onChange }: Props) {
  const used = useContext(ImageBudgetContext);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uploaded = value.startsWith("data:");
  const library = useImageLibrary();
  const importImage = useImportImage();

  function typed(text: string) {
    setDraft(text);
    if (isSafeImageUrl(text)) {
      setLinkError(null);
      onChange(text);
    } else {
      setLinkError("Link harus diawali https:// dan tidak boleh berisi spasi, tanda kutip, atau kurung.");
    }
  }

  function blur() {
    if (draft !== null && linkError) setLinkError("Link tidak valid, jadi nilai sebelumnya kami kembalikan.");
    setDraft(null);
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setBusy(true);
    const result = await importImage(file);
    setBusy(false);
    if (!result.ok) {
      setUploadError(result.message);
      return;
    }
    applyLibraryImage(result.item.dataUri);
  }

  function applyLibraryImage(dataUri: string) {
    const others = used - (uploaded ? value.length : 0);
    if (others + dataUri.length > MAX_DESIGN_DATA_CHARS) {
      setUploadError(`Total gambar unggahan di desain ini sudah penuh (maks sekitar ${kb(MAX_DESIGN_DATA_CHARS)} KB). Hapus satu gambar unggahan atau pakai link https.`);
      return;
    }
    setUploadError(null);
    setLinkError(null);
    onChange(dataUri);
  }

  return (
    <div className="grid gap-2.5">
      {uploaded ? (
        <div className="flex items-center justify-between gap-2 rounded-field border border-line bg-surface-2/60 px-3 py-2">
          <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
            <ImageSquare size={18} weight="bold" aria-hidden="true" className="shrink-0 text-accent" />
            <span className="truncate">Gambar unggahan, {kb(value.length)} KB</span>
          </p>
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Hapus gambar unggahan"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-field text-ink-2 transition hover:bg-danger-soft hover:text-danger active:scale-95"
          >
            <Trash size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div onBlur={blur}>
          <TextField
            label={label}
            inputMode="url"
            value={draft ?? value}
            placeholder="https://contoh.com/gambar.gif"
            error={linkError}
            hint="Gambar dimuat dari link ini oleh OBS di komputermu dan oleh preview di browser, jadi pemilik host gambar bisa melihat alamat IP-mu. Pakai host yang stabil dan kamu percaya."
            onChange={typed}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-9 items-center gap-1.5 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:opacity-50"
        >
          <UploadSimple size={16} weight="bold" aria-hidden="true" />
          {busy ? "Membaca..." : uploaded ? "Ganti dengan file lain" : "Upload dari komputer"}
        </button>
        <span className="text-xs text-ink-3">PNG, JPEG, GIF, WebP. Dimampatkan otomatis, disimpan di komputer ini. Tidak ikut link Share.</span>
      </div>
      {library.items.length > 0 ? (
        <div className="grid gap-1.5">
          <p className="text-xs font-semibold text-ink-2">Dari pustaka</p>
          <LibraryGrid items={library.items} limit={8} onPick={(it) => applyLibraryImage(it.dataUri)} />
        </div>
      ) : null}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={pick} className="sr-only" tabIndex={-1} aria-label={`Pilih file untuk ${label}`} />
      {uploadError ? (
        <p role="alert" className="text-xs text-danger">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
