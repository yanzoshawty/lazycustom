"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateCss } from "@/lib/design/css";
import type { Design } from "@/lib/design/model";
import { buildPreviewDoc, type SendKind } from "@/lib/design/preview-doc";

interface Props {
  design: Design;
  /** Jenis pesan yang ditampilkan saja. null berarti simulasi chat campuran. */
  focus?: SendKind | null;
  title: string;
  className?: string;
}

/** Latar solid ungu tua (permintaan pemilik): tenang, satu keluarga dengan palet situs, dan bubble terang tetap menonjol di kedua tema. */
const BACKDROP = { backgroundColor: "#231C30" };

/**
 * Simulator chat yang sama dengan editor (iframe bersandbox, tanpa allow-same-origin), dipakai sebagai
 * produk sungguhan di halaman utama. Tidak bisa diklik: ini tontonan, editornya ada di /editor.
 */
export function LivePreview({ design, focus = null, title, className = "", lazy = false }: Props & { lazy?: boolean }) {
  const doc = useMemo(() => buildPreviewDoc(generateCss(design), "live"), [design]);
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  // lazy: simulator baru dinyalakan saat bingkainya mendekati layar, supaya tidak ikut membebani muat awal.
  const [near, setNear] = useState(!lazy);

  useEffect(() => {
    if (near || !box.current) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "400px 0px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data && typeof e.data === "object" && (e.data as { type?: unknown }).type === "lc-ready") setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const win = frame.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "focus", kind: focus }, "*");
    // Gerak minimal: chat berhenti mengalir, pesan yang sudah ada tetap tampil.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      win.postMessage({ type: "motion", reduce: true }, "*");
      win.postMessage({ type: "pause" }, "*");
    }
  }, [ready, focus]);

  return (
    <div ref={box} className={`relative overflow-hidden ${className}`} style={BACKDROP}>
      {near ? (
        <iframe
          ref={frame}
          title={title}
          srcDoc={doc}
          sandbox="allow-scripts"
          tabIndex={-1}
          className="pointer-events-none mx-auto block h-full w-full max-w-[420px] border-0 bg-transparent"
          style={{ colorScheme: "normal" }}
        />
      ) : null}
    </div>
  );
}
