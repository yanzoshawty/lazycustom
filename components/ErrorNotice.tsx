"use client";

import type { ReactNode } from "react";
import { Warning, WarningCircle, X } from "@phosphor-icons/react";
import { errorInfo, type ErrorCode } from "@/lib/errors";

interface Props {
  code: ErrorCode;
  /** Kode laporan yang juga tercatat di log developer. */
  refId?: string | null;
  onDismiss?: () => void;
  children?: ReactNode;
}

/** Pesan error untuk user: apa yang terjadi, apa yang bisa dilakukan, dan kode laporan. */
export function ErrorNotice({ code, refId, onDismiss, children }: Props) {
  const info = errorInfo(code);
  const isError = info.severity === "error";
  const Icon = isError ? WarningCircle : Warning;
  const tone = isError
    ? "border-danger/40 bg-danger-soft [--tone:var(--danger)]"
    : "border-warn/40 bg-warn-soft [--tone:var(--warn)]";

  return (
    <div
      role={isError ? "alert" : "status"}
      data-error-code={code}
      className={`flex gap-3 rounded-field border p-3.5 text-sm ${tone}`}
    >
      <Icon size={22} weight="fill" className="mt-0.5 shrink-0 text-[var(--tone)]" aria-hidden="true" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="font-semibold text-[var(--tone)]">{info.title}</p>
        <p className="text-ink">
          {info.body} {info.action}
        </p>
        {refId ? (
          <p className="font-mono text-xs text-ink-2">
            Kode laporan: <span className="select-all font-semibold text-ink">{refId}</span>
          </p>
        ) : null}
        {children}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup pesan"
          className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-field text-ink-2 hover:text-ink"
        >
          <X size={16} weight="bold" />
        </button>
      ) : null}
    </div>
  );
}
