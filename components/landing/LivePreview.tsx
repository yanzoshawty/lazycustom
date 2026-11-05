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

/** Latar gameplay yang sama dengan backdrop Photo di editor, supaya chat transparan terlihat seperti di atas stream. */
const BACKDROP = {
  backgroundImage: "url(https://picsum.photos/seed/lazycustom-gameplay/1000/800), linear-gradient(135deg, #2c5364, #203a43, #0f2027)",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

/**
 * Simulator chat yang sama dengan editor (iframe bersandbox, tanpa allow-same-origin), dipakai sebagai
 * produk sungguhan di halaman utama. Tidak bisa diklik: ini tontonan, editornya ada di /editor.
 */
export function LivePreview({ design, focus = null, title, className = "" }: Props) {
  const doc = useMemo(() => buildPreviewDoc(generateCss(design), "live"), [design]);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

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
    <div className={`relative overflow-hidden ${className}`} style={BACKDROP}>
      <iframe
        ref={frame}
        title={title}
        srcDoc={doc}
        sandbox="allow-scripts"
        tabIndex={-1}
        className="pointer-events-none mx-auto block h-full w-full max-w-[420px] border-0 bg-transparent"
        style={{ colorScheme: "normal" }}
      />
    </div>
  );
}
