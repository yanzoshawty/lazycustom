"use client";

import { useRef, useState } from "react";
import { ArrowCounterClockwise, DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import type { ErrorCode } from "@/lib/errors";
import { report } from "@/lib/report";
import { parseSettings, type Settings } from "@/lib/settings";
import { ErrorNotice } from "./ErrorNotice";

const MAX_IMPORT_BYTES = 100 * 1024;

interface Props {
  settings: Settings;
  presetLabel: string;
  onImport: (settings: Settings) => void;
  onReset: () => void;
  onNotice: (text: string) => void;
}

const buttonClass =
  "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:border-ink-3 active:scale-95";

export function BackupPanel({ settings, presetLabel, onImport, onReset, onNotice }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<{ code: ErrorCode; ref: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  function fail(code: ErrorCode, error?: unknown, context?: Record<string, string | number | boolean>) {
    setProblem({ code, ref: report({ code, error, level: "warn", context }) });
  }

  function exportFile() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lazycustom-pengaturan.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setProblem(null);
    onNotice("Pengaturan diekspor");
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
    const result = parseSettings(json);
    if (!result.ok) {
      fail(result.code, undefined, { bytes: file.size });
      return;
    }
    onImport(result.settings);
    onNotice("Pengaturan diimpor");
  }

  function reset() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setConfirming(false);
    onReset();
    onNotice(`Kembali ke tema ${presetLabel}`);
  }

  return (
    <section aria-labelledby="backup-title" className="grid gap-3">
      <h3 id="backup-title" className="font-display text-base font-semibold text-ink">
        Simpan atau kembalikan pengaturan
      </h3>
      <p className="text-sm text-ink-2">
        Pengaturan tersimpan otomatis di browser ini. Ekspor kalau mau memindahkannya ke komputer lain.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportFile} className={buttonClass}>
          <DownloadSimple size={18} weight="bold" aria-hidden="true" />
          Ekspor pengaturan
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={buttonClass}>
          <UploadSimple size={18} weight="bold" aria-hidden="true" />
          Impor pengaturan
        </button>
        <button type="button" onClick={reset} className={buttonClass}>
          <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" />
          {confirming ? "Klik lagi untuk yakin" : `Kembalikan ke ${presetLabel}`}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={importFile}
          className="sr-only"
          tabIndex={-1}
          aria-label="Pilih file pengaturan"
        />
      </div>
      {problem ? <ErrorNotice code={problem.code} refId={problem.ref} onDismiss={() => setProblem(null)} /> : null}
    </section>
  );
}
