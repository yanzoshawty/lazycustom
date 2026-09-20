"use client";

import { memo, useMemo } from "react";
import { Check } from "@phosphor-icons/react";
import { generateCss } from "@/lib/design/css";
import type { Design, TemplateId } from "@/lib/design/model";
import { buildPreviewDoc } from "@/lib/design/preview-doc";
import { TEMPLATES, type Template } from "@/lib/design/templates";

/**
 * Thumbnail memakai dokumen preview yang sama dengan editor (mode thumb), jadi yang
 * terlihat di galeri persis hasil generator CSS, termasuk dekorasinya. Template tidak
 * berubah saat diedit, jadi dokumennya cukup dibuat sekali per template.
 */
const Thumb = memo(function Thumb({ design }: { design: Design }) {
  const doc = useMemo(() => buildPreviewDoc(generateCss(design), "thumb"), [design]);
  return (
    <div
      aria-hidden="true"
      className="h-[156px] overflow-hidden rounded-[10px] border border-line"
      style={{ background: "linear-gradient(160deg, #1a1d26, #0d0f14)" }}
    >
      <iframe
        title={`Contoh ${design.name}`}
        srcDoc={doc}
        sandbox="allow-scripts"
        loading="lazy"
        tabIndex={-1}
        className="pointer-events-none block h-full w-full border-0 bg-transparent"
        style={{ colorScheme: "normal" }}
      />
    </div>
  );
});

function Card({ template, active, onPick, onNew }: { template: Template; active: boolean; onPick: (id: TemplateId) => void; onNew: (id: TemplateId) => void }) {
  return (
    <li
      className={`relative grid gap-2.5 rounded-panel border p-2.5 transition ${
        active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <Thumb design={template.design} />
      <div className="flex items-start justify-between gap-2 px-0.5 pb-0.5">
        <div className="grid min-w-0 gap-0.5">
          <p className="font-display text-sm font-bold text-ink">{template.name}</p>
          <p className="text-xs text-ink-2">{template.tagline}</p>
        </div>
        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">
            <Check size={12} weight="bold" aria-hidden="true" />
            Aktif
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onNew(template.id)}
        aria-label={`Buat desain baru dari template ${template.name}`}
        className="relative z-10 h-9 w-full rounded-field border border-line-strong bg-surface text-xs font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-95"
      >
        Buat desain baru dari ini
      </button>
      <button
        type="button"
        onClick={() => onPick(template.id)}
        aria-pressed={active}
        aria-label={`Pakai template ${template.name}`}
        className="absolute inset-0 rounded-panel"
      />
    </li>
  );
}

interface Props {
  activeTemplate: TemplateId;
  /** Terapkan template ke desain yang sedang dibuka. */
  onPick: (id: TemplateId) => void;
  /** Buat desain baru dari template tanpa menyentuh desain yang sedang dibuka. */
  onNew: (id: TemplateId) => void;
}

export function TemplatesPanel({ activeTemplate, onPick, onNew }: Props) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-2">
        Klik template untuk memakainya di desain yang sedang dibuka (bisa dibatalkan dengan Undo), atau buat desain baru darinya supaya desainmu yang sekarang tetap aman. Setelah itu ubah lewat Layers dan Properties.
      </p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {TEMPLATES.map((t) => (
          <Card key={t.id} template={t} active={activeTemplate === t.id} onPick={onPick} onNew={onNew} />
        ))}
      </ul>
    </div>
  );
}
