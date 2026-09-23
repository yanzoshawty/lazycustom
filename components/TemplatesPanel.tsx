"use client";

import { memo, useMemo } from "react";
import { Check, CopySimple } from "@phosphor-icons/react";
import { generateCss } from "@/lib/design/css";
import type { Design, TemplateId } from "@/lib/design/model";
import { buildPreviewDoc } from "@/lib/design/preview-doc";
import { TEMPLATES, type Template } from "@/lib/design/templates";

/**
 * Thumbnail memakai dokumen preview yang sama dengan editor (mode thumb), jadi yang
 * terlihat di galeri persis hasil generator CSS, termasuk dekorasinya. Template tidak
 * berubah saat diedit, jadi dokumennya cukup dibuat sekali per template. Tingginya
 * dibikin rendah dengan sengaja: ini kartu di galeri, bukan preview penuh, jadi cukup
 * kelihatan sekilas seperti apa bentuknya, bukan menampilkan dua pesan utuh.
 */
const Thumb = memo(function Thumb({ design }: { design: Design }) {
  const doc = useMemo(() => buildPreviewDoc(generateCss(design), "thumb"), [design]);
  return (
    <div
      aria-hidden="true"
      className="h-[68px] overflow-hidden rounded-[8px] border border-line"
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
    <li className="group relative">
      <button
        type="button"
        onClick={() => onPick(template.id)}
        aria-pressed={active}
        aria-label={`Pakai template ${template.name}`}
        title={template.tagline}
        className={`grid w-full gap-1.5 rounded-panel border p-1.5 text-left transition ${
          active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
        }`}
      >
        <Thumb design={template.design} />
        <div className="flex min-w-0 items-center justify-between gap-1 px-0.5">
          <p className="truncate font-display text-xs font-bold text-ink">{template.name}</p>
          {active ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-on-accent">
              <Check size={9} weight="bold" aria-hidden="true" />
              Aktif
            </span>
          ) : null}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onNew(template.id)}
        aria-label={`Buat desain baru dari template ${template.name}`}
        title="Buat desain baru dari ini"
        className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full border border-line-strong bg-surface text-ink-2 opacity-100 shadow-sm transition hover:border-accent hover:text-accent active:scale-95 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        <CopySimple size={14} weight="bold" aria-hidden="true" />
      </button>
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
    <div className="grid gap-3">
      <p className="text-sm text-ink-2">
        Klik template untuk memakainya (bisa dibatalkan dengan Undo). Tombol salin di pojok kartu membuat
        desain baru darinya tanpa mengubah yang sedang dibuka.
      </p>
      <ul className="grid grid-cols-2 gap-2.5">
        {TEMPLATES.map((t) => (
          <Card key={t.id} template={t} active={activeTemplate === t.id} onPick={onPick} onNew={onNew} />
        ))}
      </ul>
    </div>
  );
}
