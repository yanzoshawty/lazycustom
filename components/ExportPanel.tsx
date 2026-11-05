"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { Check, Copy, LinkSimple } from "@phosphor-icons/react";
import { copyText } from "@/lib/clipboard";
import { shortenForDisplay } from "@/lib/design/css";
import { report } from "@/lib/report";
import { extractVideoId, popoutChatUrl } from "@/lib/youtube-url";
import { ErrorNotice } from "./ErrorNotice";
import ClickSpark from "./reactbits/ClickSpark";

export type CopyState = "idle" | "copied" | "failed";

interface Props {
  css: string;
  codeRef: RefObject<HTMLPreElement | null>;
  copyState: CopyState;
  onCopy: () => void;
}

export function CopyButton({
  state,
  onCopy,
  className = "",
  compact = false,
}: {
  state: CopyState;
  onCopy: () => void;
  className?: string;
  /** Di layar sempit tampil sebagai tombol ikon saja. */
  compact?: boolean;
}) {
  const done = state === "copied";
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`bubble-tail-sm inline-flex h-11 items-center gap-2 whitespace-nowrap bg-accent px-5 text-sm font-semibold text-on-accent transition hover:brightness-110 active:scale-95 ${compact ? "max-sm:w-11 max-sm:justify-center max-sm:px-0" : ""} ${className}`}
    >
      {done ? <Check size={18} weight="bold" aria-hidden="true" /> : <Copy size={18} weight="bold" aria-hidden="true" />}
      <span className={compact ? "max-sm:sr-only" : ""}>{done ? "Tersalin" : "Copy CSS"}</span>
    </button>
  );
}

/** Pembuat link chat popout dari link video YouTube. */
function ChatLinkBuilder() {
  const [input, setInput] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState<string | null>(null);

  function build(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    setCopyFailed(null);
    const id = extractVideoId(input);
    if (!id) {
      setLink(null);
      setError(report({ code: "URL_INVALID", level: "warn", context: { length: input.length } }));
      return;
    }
    setError(null);
    setLink(popoutChatUrl(id));
  }

  async function copyLink() {
    if (!link) return;
    try {
      await copyText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (err) {
      setCopyFailed(report({ code: "COPY_BLOCKED", error: err, level: "warn", context: { what: "link" } }));
    }
  }

  return (
    <div className="grid gap-3">
      <form onSubmit={build} className="grid gap-2">
        <label htmlFor="live-url" className="text-sm font-medium text-ink">
          Link live YouTube-mu
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="live-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="youtube.com/watch?v=..."
            aria-invalid={error !== null}
            className="h-11 min-w-0 sm:flex-1 rounded-field border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 aria-[invalid=true]:border-danger"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-field border border-line-strong bg-surface px-5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
          >
            <LinkSimple size={18} weight="bold" aria-hidden="true" />
            Buat link chat
          </button>
        </div>
      </form>

      {error ? <ErrorNotice code="URL_INVALID" refId={error} /> : null}

      {link ? (
        <div className="grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              aria-label="Link chat untuk OBS"
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 min-w-0 sm:flex-1 rounded-field border border-line-strong bg-surface-2 px-3 font-mono text-xs text-ink"
            />
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-field border border-line-strong bg-surface px-5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
            >
              {copied ? <Check size={18} weight="bold" aria-hidden="true" /> : <Copy size={18} weight="bold" aria-hidden="true" />}
              {copied ? "Tersalin" : "Salin link chat"}
            </button>
          </div>
          {copyFailed ? <ErrorNotice code="COPY_BLOCKED" refId={copyFailed} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Canvas tidak membaca variabel CSS: dua nilai aksen (terang dan gelap) terlihat di kedua tema. */
const SPARK = ["#CF1A69", "#FF6FAB"];

/** Satu langkah pasang. Label berupa kata kerja, nomor hanya penanda urutan untuk pembaca layar dan mata. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-2">
      <span aria-hidden="true" className="bubble-tail-sm grid size-9 place-items-center bg-accent-soft font-display text-base font-bold text-accent">
        {n}
      </span>
      <div className="grid min-w-0 gap-2">
        <h3 className="font-display text-lg font-semibold leading-9 text-ink">{title}</h3>
        {children}
      </div>
    </li>
  );
}

export function ExportPanel({ css, codeRef, copyState, onCopy }: Props) {
  const view = shortenForDisplay(css);
  const sizeKb = Math.max(1, Math.round(css.length / 1024));
  return (
    <section id="export" aria-labelledby="output-title" className="grid scroll-mt-6 gap-8">
      <div className="grid gap-2">
        <h2 id="output-title" className="font-display text-3xl font-bold tracking-tight text-ink">
          Pasang di OBS
        </h2>
        <p className="max-w-[60ch] text-ink-2">Empat langkah, sekali saja. Setelah itu cukup salin ulang CSS setiap kali desainnya kamu ubah.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12">
        <ol className="grid content-start gap-8">
          <Step n={1} title="Salin CSS">
            <div className="flex flex-wrap items-center gap-3">
              <ClickSpark sparkColor={SPARK} sparkRadius={26} sparkCount={10} className="!h-auto !w-auto">
                <CopyButton state={copyState} onCopy={onCopy} className="h-12 px-6 text-base" />
              </ClickSpark>
              <span className="text-sm text-ink-2">
                {sizeKb} KB{view.shortened > 0 ? `, ${view.shortened} gambar unggahan disingkat di tampilan, tetap tersalin utuh` : ""}
              </span>
            </div>
            <pre
              ref={codeRef}
              tabIndex={0}
              aria-label="Kode CSS hasil desainmu"
              className="max-h-[280px] w-full min-w-0 max-w-full overflow-auto rounded-field border border-line bg-surface-2 p-4 font-mono text-xs leading-relaxed text-ink"
            >
              <code>{view.text}</code>
            </pre>
            {sizeKb > 250 ? <p className="text-sm text-warn">CSS cukup besar. Kalau OBS terasa berat, pakai link gambar https sebagai ganti unggahan.</p> : null}
          </Step>
        </ol>

        <ol start={2} className="grid content-start gap-8">
          <Step n={2} title="Buat link chat">
            <ChatLinkBuilder />
          </Step>
          <Step n={3} title="Tambah Browser Source">
            <p className="text-sm text-ink-2">Di OBS, klik tanda + di kotak Sources, pilih Browser, lalu tempel link chat di kolom URL. Atur lebar dan tinggi sesuai layoutmu.</p>
          </Step>
          <Step n={4} title="Tempel di Custom CSS">
            <p className="text-sm text-ink-2">Di properti Browser Source yang sama, hapus isi kolom Custom CSS lalu tempel CSS dari langkah 1. Klik OK.</p>
            <p className="rounded-field bg-surface-2 px-3 py-2 text-sm text-ink-2">Chat belum berubah? Klik Refresh cache of current page di properti Browser Source.</p>
          </Step>
        </ol>
      </div>
    </section>
  );
}
