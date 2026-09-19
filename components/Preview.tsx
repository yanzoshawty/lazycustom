"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { buildPreviewHtml } from "@/lib/preview-html";
import { report } from "@/lib/report";
import { ErrorNotice } from "./ErrorNotice";
import { Segmented } from "./controls";

type Backdrop = "gelap" | "terang" | "ramai" | "kotak";
type Width = 320 | 400 | 520;

const BACKDROP_STYLE: Record<Backdrop, { className?: string; style?: React.CSSProperties }> = {
  gelap: { style: { background: "linear-gradient(160deg, #1a1d26, #0d0f14)" } },
  terang: { style: { background: "linear-gradient(160deg, #eef0f5, #d8dce6)" } },
  // Foto acak berbasis seed tetap. Hanya diminta saat pilihan ini dipakai.
  ramai: {
    style: {
      backgroundImage:
        "url(https://picsum.photos/seed/lazycustom-gameplay/1000/800), linear-gradient(135deg, #2c5364, #203a43, #0f2027)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  kotak: { className: "checker" },
};

const READY_TIMEOUT_MS = 4000;

type FrameMessage = { type: "css"; css: string } | { type: "replay" } | { type: "ping" };

/** Kirim pesan ke iframe. Gagal cukup dicatat: preview yang macet ditangani timeout siap di bawah. */
function postToFrame(frame: HTMLIFrameElement | null, message: FrameMessage): void {
  try {
    frame?.contentWindow?.postMessage(message, "*");
  } catch (error) {
    report({ code: "PREVIEW_FAILED", error, level: "warn", context: { step: "post" } });
  }
}

interface Props {
  css: string;
  /** Berubah saat gaya animasi diganti, supaya preview memutar ulang otomatis. */
  animationKey: string;
}

export function Preview({ css, animationKey }: Props) {
  const [backdrop, setBackdrop] = useState<Backdrop>("gelap");
  const [width, setWidth] = useState<Width>(400);
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [failRef, setFailRef] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  // Dokumen awal dibuat sekali. Pembaruan berikutnya dikirim lewat postMessage
  // supaya iframe tidak dimuat ulang setiap slider digeser.
  const [initialDoc] = useState(() => buildPreviewHtml(css));

  // Menunggu sinyal siap dari iframe. Kalau tidak datang, tampilkan pesan yang jelas.
  useEffect(() => {
    readyRef.current = false;
    function onMessage(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow) return;
      if ((e.data as { type?: string } | null)?.type === "lc-ready") {
        readyRef.current = true;
        clearTimeout(timer);
        setStatus("ready");
      }
    }
    const timer = setTimeout(() => {
      if (readyRef.current) return;
      setFailRef(report({ code: "PREVIEW_FAILED", level: "warn", context: { run } }));
      setStatus("failed");
    }, READY_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    // Iframe dari HTML server bisa siap sebelum listener ini terpasang. Ping memancing balasan siap.
    postToFrame(frameRef.current, { type: "ping" });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [run]);

  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: "css", css });
  }, [css, status]);

  // Sengaja hanya bergantung pada animationKey: putar ulang saat gaya animasi berganti,
  // bukan setiap CSS berubah.
  useEffect(() => {
    if (readyRef.current) postToFrame(frameRef.current, { type: "replay" });
  }, [animationKey]);

  function retry() {
    setStatus("loading");
    setFailRef(null);
    setRun((r) => r + 1);
  }

  const bg = BACKDROP_STYLE[backdrop];

  return (
    <section aria-label="Preview chat" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Segmented<Backdrop>
          small
          hideLabel
          label="Latar preview"
          value={backdrop}
          onChange={setBackdrop}
          options={[
            { value: "gelap", label: "Gelap" },
            { value: "terang", label: "Terang" },
            { value: "ramai", label: "Foto ramai" },
            { value: "kotak", label: "Transparan" },
          ]}
        />
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <Segmented<Width>
              small
              hideLabel
              label="Lebar chat di preview"
              value={width}
              onChange={setWidth}
              options={[
                { value: 320, label: "Sempit" },
                { value: 400, label: "Sedang" },
                { value: 520, label: "Lebar" },
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() => (status === "failed" ? retry() : postToFrame(frameRef.current, { type: "replay" }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink transition hover:border-ink-3 active:scale-95"
          >
            <ArrowsClockwise size={16} weight="bold" aria-hidden="true" />
            Putar ulang
          </button>
        </div>
      </div>

      <div
        className={`relative h-[34dvh] min-h-[220px] overflow-hidden rounded-panel border border-line lg:h-[min(62dvh,560px)] ${bg.className ?? ""}`}
        style={bg.style}
      >
        <iframe
          key={run}
          ref={frameRef}
          title="Preview chat dengan gayamu"
          srcDoc={initialDoc}
          onLoad={() => postToFrame(frameRef.current, { type: "ping" })}
          sandbox="allow-scripts"
          tabIndex={-1}
          style={{ width, colorScheme: "normal" }}
          className="mx-auto block h-full max-w-full border-0 bg-transparent"
        />
      </div>

      {status === "failed" ? (
        <ErrorNotice code="PREVIEW_FAILED" refId={failRef}>
          <button
            type="button"
            onClick={retry}
            className="mt-1 w-fit rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-on-accent"
          >
            Putar ulang
          </button>
        </ErrorNotice>
      ) : (
        <p className="text-xs text-ink-3">
          Preview mendekati tampilan asli. YouTube mengatur struktur chat-nya sendiri, jadi cek sekali di OBS.
        </p>
      )}
    </section>
  );
}
