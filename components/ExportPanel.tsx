"use client";

import { useState, type RefObject } from "react";
import { Check, Copy, LinkSimple } from "@phosphor-icons/react";
import { copyText } from "@/lib/clipboard";
import { report } from "@/lib/report";
import { extractVideoId, popoutChatUrl } from "@/lib/youtube-url";
import { ErrorNotice } from "./ErrorNotice";

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
      className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-field bg-accent px-5 text-sm font-semibold text-on-accent transition hover:brightness-110 active:scale-95 ${compact ? "max-sm:w-10 max-sm:justify-center max-sm:px-0" : ""} ${className}`}
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

export function ExportPanel({ css, codeRef, copyState, onCopy }: Props) {
  return (
    <section id="export" aria-labelledby="output-title" className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="output-title" className="font-display text-2xl font-bold tracking-tight text-ink">
            Export ke OBS
          </h2>
          <CopyButton state={copyState} onCopy={onCopy} />
        </div>
        <pre
          ref={codeRef}
          tabIndex={0}
          aria-label="Kode CSS hasil desainmu"
          className="max-h-[360px] w-full min-w-0 max-w-full overflow-auto panel p-4 font-mono text-xs leading-relaxed text-ink"
        >
          <code>{css}</code>
        </pre>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Pasang di OBS</h2>
        <ChatLinkBuilder />
        <div className="grid gap-4 text-sm text-ink-2">
          <div className="grid gap-1">
            <h3 className="font-display text-base font-semibold text-ink">Tambah Browser Source</h3>
            <p>Di OBS, klik tanda + di kotak Sources, pilih Browser, lalu tempel link chat di kolom URL.</p>
          </div>
          <div className="grid gap-1">
            <h3 className="font-display text-base font-semibold text-ink">Tempel CSS</h3>
            <p>Di kolom Custom CSS, hapus isinya lalu tempel CSS dari kotak di samping. Atur lebar dan tinggi sesuai layoutmu.</p>
          </div>
          <p className="rounded-field bg-surface-2 px-3 py-2 text-ink-2">
            Chat belum berubah? Di properti Browser Source, klik Refresh cache of current page.
          </p>
        </div>
      </div>
    </section>
  );
}
