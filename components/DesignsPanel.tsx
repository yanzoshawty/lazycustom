"use client";

import { useRef, useState } from "react";
import { Check, Copy, DownloadSimple, LinkSimple, Plus, Trash, UploadSimple, CopySimple } from "@phosphor-icons/react";
import { copyText } from "@/lib/clipboard";
import { parseDesign, type Design } from "@/lib/design/model";
import { encodeDesign, shareUrl } from "@/lib/design/share";
import { designStore, MAX_DESIGNS, type Snapshot } from "@/lib/design/store";
import type { ErrorCode } from "@/lib/errors";
import { report } from "@/lib/report";
import { ErrorNotice } from "./ErrorNotice";
import { Section } from "./controls";

const MAX_IMPORT_BYTES = 100 * 1024;

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-45";

function fileSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "desain";
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function DesignRow({ id, name, templateId, updatedAt, active, onDone }: Snapshot["saved"][number] & { active: boolean; onDone: (t: string) => void }) {
  const [confirming, setConfirming] = useState(false);

  function remove() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    designStore.remove(id);
    onDone(`Desain "${name}" dihapus`);
  }

  return (
    <li
      className={`flex items-center gap-1 rounded-field border p-1 ${
        active ? "border-accent bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={() => designStore.open(id)}
        aria-current={active ? "true" : undefined}
        className="grid min-w-0 flex-1 gap-0.5 rounded-field px-2.5 py-1.5 text-left"
      >
        <span className="truncate font-display text-sm font-semibold text-ink">{name}</span>
        <span className="truncate text-xs text-ink-2">
          {active ? "Aktif" : "Buka"} · {templateId === "custom" ? "Custom" : templateId} · {formatDate(updatedAt)}
        </span>
      </button>
      <button
        type="button"
        onClick={remove}
        aria-label={confirming ? `Klik lagi untuk menghapus ${name}` : `Hapus ${name}`}
        className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-field px-2.5 text-xs font-semibold transition active:scale-95 ${
          confirming ? "bg-danger-soft text-danger" : "text-ink-2 hover:bg-danger-soft hover:text-danger"
        }`}
      >
        <Trash size={16} weight="bold" aria-hidden="true" />
        {confirming ? "Yakin?" : null}
      </button>
    </li>
  );
}

export function DesignsPanel({ snap, onNotice }: { snap: Snapshot; onNotice: (text: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<{ code: ErrorCode; ref: string | null } | null>(null);
  const [share, setShare] = useState<{ design: Design; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const atLimit = snap.saved.length >= MAX_DESIGNS;
  const shareStale = share !== null && share.design !== snap.design;

  function fail(code: ErrorCode, error?: unknown, context?: Record<string, string | number | boolean>) {
    setProblem({ code, ref: report({ code, error, level: "warn", context }) });
  }

  async function makeShare() {
    setProblem(null);
    setCopied(false);
    try {
      const code = await encodeDesign(snap.design);
      setShare({ design: snap.design, url: shareUrl(code, { origin: location.origin, pathname: location.pathname }) });
    } catch (error) {
      fail("SHARE_FAILED", error);
    }
  }

  async function copyShare() {
    if (!share) return;
    try {
      await copyText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (error) {
      fail("COPY_BLOCKED", error, { what: "share" });
    }
  }

  function exportFile() {
    const blob = new Blob([JSON.stringify(snap.design, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSlug(snap.design.name)}.lazycustom.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setProblem(null);
    onNotice("File desain diekspor");
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProblem(null);
    if (file.size > MAX_IMPORT_BYTES) {
      fail("IMPORT_TOO_LARGE", undefined, { bytes: file.size });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch (error) {
      fail("IMPORT_READ", error);
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      fail("IMPORT_INVALID", error, { bytes: file.size });
      return;
    }
    const result = parseDesign(json);
    if (!result.ok) {
      fail(result.code, undefined, { bytes: file.size });
      return;
    }
    if (designStore.importDesign(result.design)) onNotice("Desain diimpor sebagai desain baru");
  }

  return (
    <div className="grid gap-7">
      <Section
        title={`My Designs (${snap.saved.length}/${MAX_DESIGNS})`}
        action={
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={atLimit}
              onClick={() => designStore.duplicate() && onNotice("Desain digandakan")}
              className={`${buttonClass} h-9 px-3 text-xs`}
            >
              <CopySimple size={16} weight="bold" aria-hidden="true" />
              Duplicate
            </button>
            <button
              type="button"
              disabled={atLimit}
              onClick={() => designStore.newDesign() && onNotice("Desain baru dibuat")}
              className={`${buttonClass} h-9 px-3 text-xs`}
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
              New
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink-2">Semua desain tersimpan otomatis di browser ini. Klik satu untuk membukanya.</p>
        <ul className="grid gap-1.5">
          {snap.saved.map((s) => (
            <DesignRow key={s.id} {...s} active={s.id === snap.activeId} onDone={onNotice} />
          ))}
        </ul>
      </Section>

      <Section title="Share">
        <p className="text-sm text-ink-2">
          Buat link berisi seluruh desainmu. Siapa pun yang membukanya mendapat salinan sendiri, tanpa akun dan tanpa server.
        </p>
        <button type="button" onClick={makeShare} className={`${buttonClass} w-fit`}>
          <LinkSimple size={18} weight="bold" aria-hidden="true" />
          Buat link Share
        </button>
        {share && !shareStale ? (
          <div className="grid gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                aria-label="Link Share desain"
                value={share.url}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 min-w-0 sm:flex-1 rounded-field border border-line-strong bg-surface-2 px-3 font-mono text-xs text-ink"
              />
              <button type="button" onClick={copyShare} className={buttonClass}>
                {copied ? <Check size={18} weight="bold" aria-hidden="true" /> : <Copy size={18} weight="bold" aria-hidden="true" />}
                {copied ? "Tersalin" : "Copy link"}
              </button>
            </div>
            <p className="text-xs text-ink-3">{share.url.length.toLocaleString("id-ID")} karakter. Link ini berisi desain saat ini.</p>
          </div>
        ) : null}
        {shareStale ? <p className="text-xs text-ink-2">Desain sudah berubah sejak link dibuat. Buat link Share lagi agar isinya terbaru.</p> : null}
      </Section>

      <Section title="File">
        <p className="text-sm text-ink-2">Ekspor desain aktif sebagai file untuk cadangan atau dipindah ke komputer lain.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportFile} className={buttonClass}>
            <DownloadSimple size={18} weight="bold" aria-hidden="true" />
            Export file
          </button>
          <button type="button" disabled={atLimit} onClick={() => fileRef.current?.click()} className={buttonClass}>
            <UploadSimple size={18} weight="bold" aria-hidden="true" />
            Import file
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={importFile} className="sr-only" tabIndex={-1} aria-label="Pilih file desain" />
        </div>
      </Section>

      {problem ? <ErrorNotice code={problem.code} refId={problem.ref} onDismiss={() => setProblem(null)} /> : null}
    </div>
  );
}
