"use client";

import { useCallback, useSyncExternalStore } from "react";
import { compressImageFile, COMPRESS_MESSAGE } from "@/lib/design/image-compress";
import { imageLibrary, type LibraryImage, type LibrarySnapshot } from "@/lib/design/image-library";

export function useImageLibrary(): LibrarySnapshot {
  return useSyncExternalStore(imageLibrary.subscribe, imageLibrary.getSnapshot, imageLibrary.getServerSnapshot);
}

const FULL_MESSAGE = "Pustaka gambar penuh (maks 60 gambar atau 12 MB). Hapus gambar yang tidak dipakai dulu.";
const STORAGE_MESSAGE = "Browser menolak menyimpan gambar ini (penyimpanan penuh atau diblokir). Hapus gambar lain, atau izinkan penyimpanan situs.";

export type ImportOutcome = { ok: true; item: LibraryImage; note: string } | { ok: false; message: string };

/** Mampatkan file, simpan ke pustaka di komputer user, dan kembalikan itemnya. */
export function useImportImage() {
  return useCallback(async (file: File): Promise<ImportOutcome> => {
    const c = await compressImageFile(file);
    if (!c.ok) return { ok: false, message: COMPRESS_MESSAGE[c.reason] };
    const r = await imageLibrary.add({ name: file.name, mime: c.mime, bytes: c.bytes, width: c.width, height: c.height, dataUri: c.dataUri });
    if (!r.ok) return { ok: false, message: r.reason === "FULL" ? FULL_MESSAGE : r.reason === "STORAGE_FAILED" ? STORAGE_MESSAGE : "Gambar tidak valid." };
    const kb = Math.max(1, Math.round(c.bytes / 1024));
    const shrunk = c.sourceBytes > c.bytes * 1.2 ? `, dimampatkan dari ${Math.max(1, Math.round(c.sourceBytes / 1024))} KB` : "";
    return { ok: true, item: r.item, note: r.duplicate ? "Gambar ini sudah ada di pustaka" : `Disimpan di pustaka: ${kb} KB${shrunk}` };
  }, []);
}
