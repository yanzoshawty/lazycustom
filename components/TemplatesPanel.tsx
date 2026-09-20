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

function Card({ template, active, onPick }: { template: Template; active: boolean; onPick: (id: TemplateId) => void }) {
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
  onPick: (id: TemplateId) => void;
}

export function TemplatesPanel({ activeTemplate, onPick }: Props) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-2">
        Pilih template sebagai titik awal, lalu ubah lewat Layers dan Properties. Mengganti template bisa dibatalkan dengan Undo.
      </p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {TEMPLATES.map((t) => (
          <Card key={t.id} template={t} active={activeTemplate === t.id} onPick={onPick} />
        ))}
      </ul>
    </div>
  );
}
