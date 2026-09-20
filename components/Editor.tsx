"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowArcLeft, ArrowArcRight } from "@phosphor-icons/react";
import { copyText } from "@/lib/clipboard";
import { generateCss } from "@/lib/design/css";
import { designsEqual, type LayerId, type TemplateId } from "@/lib/design/model";
import { decodeDesign, readShareHash } from "@/lib/design/share";
import { designStore } from "@/lib/design/store";
import { templateById } from "@/lib/design/templates";
import { report } from "@/lib/report";
import { DesignsPanel } from "./DesignsPanel";
import { ErrorNotice } from "./ErrorNotice";
import { CopyButton, ExportPanel, type CopyState } from "./ExportPanel";
import { Inspector, type Edit } from "./Inspector";
import { LayersPanel } from "./LayersPanel";
import { Logo } from "./Logo";
import { Stage } from "./Stage";
import { TemplatesPanel } from "./TemplatesPanel";
import { ThemeToggle } from "./ThemeToggle";
import { ToastProvider, useToast } from "./Toaster";

type Tab = "templates" | "layers" | "designs";
type MobileTab = Tab | "properties";

const TABS: Array<{ id: MobileTab; label: string }> = [
  { id: "templates", label: "Templates" },
  { id: "layers", label: "Layers" },
  { id: "properties", label: "Properties" },
  { id: "designs", label: "Designs" },
];

const iconButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-field border border-line-strong bg-surface text-ink-2 transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong disabled:hover:text-ink-2";

/** Nama desain: boleh kosong sementara saat mengetik, nilai valid terakhir dipertahankan. */
function NameField({ name }: { name: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="min-w-0 flex-1 basis-full sm:basis-auto">
      <label htmlFor="design-name" className="sr-only">
        Nama desain
      </label>
      <input
        id="design-name"
        type="text"
        value={draft ?? name}
        maxLength={40}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          setDraft(e.target.value);
          designStore.rename(e.target.value);
        }}
        onBlur={() => setDraft(null)}
        className="h-10 w-full min-w-0 rounded-field border border-line bg-surface px-3 font-display text-sm font-semibold text-ink placeholder:text-ink-3 hover:border-line-strong sm:max-w-sm"
      />
    </div>
  );
}

function EditorInner() {
  const snap = useSyncExternalStore(designStore.subscribe, designStore.getSnapshot, designStore.getServerSnapshot);
  const design = snap.design;
  const css = useMemo(() => generateCss(design), [design]);
  const toast = useToast();

  const [selected, setSelected] = useState<LayerId>("bubble");
  const [panel, setPanel] = useState<MobileTab>("templates");
  const [leftTab, setLeftTab] = useState<Tab>("templates");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [copyRef, setCopyRef] = useState<string | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const handledShare = useRef(false);

  // Membuka link Share (#d=...) sekali saat halaman dimuat, lalu membersihkan alamatnya.
  useEffect(() => {
    if (handledShare.current) return;
    const code = readShareHash(location.hash);
    if (code === null) return;
    handledShare.current = true;
    history.replaceState(null, "", location.pathname + location.search);
    void decodeDesign(code).then((r) => {
      if (r.ok) designStore.openShared(r.design);
      else designStore.reportShareProblem(r.code);
    });
  }, []);

  const edit = useCallback<Edit>((fn, key) => {
    designStore.update((d) => {
      const next = fn(d);
      if (designsEqual(next, d)) return d;
      return next.templateId === "custom" ? next : { ...next, templateId: "custom" };
    }, key);
  }, []);

  // Mengklik bagian chat di preview atau layer di daftar memilih layer. Di layar sempit
  // pengaturannya langsung dibuka, di layar lebar Properties sudah tampil di kanan.
  const selectLayer = useCallback((layer: LayerId) => {
    setSelected(layer);
    if (!window.matchMedia("(min-width: 1280px)").matches) setPanel("properties");
  }, []);

  function pickTab(tab: MobileTab) {
    setPanel(tab);
    if (tab !== "properties") setLeftTab(tab);
  }

  function pickTemplate(id: TemplateId) {
    designStore.applyTemplate(id);
    toast(`Template ${templateById(id).name} diterapkan`);
  }

  async function copyCss() {
    try {
      await copyText(css);
      setCopyState("copied");
      setCopyRef(null);
      setTimeout(() => setCopyState("idle"), 2400);
    } catch (error) {
      setCopyRef(report({ code: "COPY_BLOCKED", error, level: "warn", context: { what: "css" } }));
      setCopyState("failed");
    }
  }

  const propertiesHidden = panel === "properties" ? "" : "max-xl:hidden";
  const leftHidden = panel === "properties" ? "max-xl:hidden" : "";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-16 sm:px-5">
      <header className="flex flex-wrap items-center gap-2 py-3">
        <Logo />
        <div className="ml-auto flex items-center gap-1.5 sm:order-last sm:ml-0">
          <button type="button" onClick={() => designStore.undo()} disabled={!snap.canUndo} aria-label="Undo" title="Undo" className={iconButton}>
            <ArrowArcLeft size={20} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => designStore.redo()} disabled={!snap.canRedo} aria-label="Redo" title="Redo" className={iconButton}>
            <ArrowArcRight size={20} weight="bold" aria-hidden="true" />
          </button>
          <ThemeToggle />
          <CopyButton state={copyState} onCopy={copyCss} compact />
        </div>
        {/* key: ganti desain aktif selalu mereset draft ketikan, tanpa bergantung pada pindah fokus */}
        <NameField key={snap.activeId} name={design.name} />
      </header>

      <div className="grid gap-2.5 empty:hidden">
        {snap.notice === "shared-opened" ? (
          <p role="status" className="flex items-start justify-between gap-3 rounded-field border border-accent/50 bg-accent-soft px-3.5 py-2.5 text-sm text-ink">
            <span>Desain dari link Share dibuka sebagai desain baru di My Designs. Desain lamamu tetap aman.</span>
            <button type="button" onClick={() => designStore.dismissNotice()} className="shrink-0 font-semibold text-accent underline underline-offset-2">
              Tutup
            </button>
          </p>
        ) : null}
        {snap.issue ? <ErrorNotice code={snap.issue} refId={snap.issueRef} onDismiss={() => designStore.dismissIssue()} /> : null}
        {copyState === "failed" ? <ErrorNotice code="COPY_BLOCKED" refId={copyRef} onDismiss={() => setCopyState("idle")} /> : null}
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        {/* Preview: menempel di atas saat halaman di-scroll */}
        <div className="order-1 sticky top-0 z-20 -mx-3 border-b border-line bg-bg px-3 pb-2.5 pt-2 sm:-mx-5 sm:px-5 xl:order-2 xl:top-4 xl:mx-0 xl:self-start xl:border-0 xl:bg-transparent xl:p-0">
          <Stage
            css={css}
            selected={selected}
            onSelect={selectLayer}
            frameClassName="h-[22dvh] min-h-[150px] sm:h-[32dvh] xl:h-[min(66dvh,620px)]"
          />
        </div>

        {/* Kolom kiri selalu tampil supaya bar tab tidak hilang saat Properties dibuka di layar sempit */}
        <aside aria-label="Templates, layers, dan desain" className="order-2 min-w-0 xl:order-1 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start xl:overflow-y-auto">
          <div className="panel grid gap-4 p-3 sm:p-4">
            <div role="tablist" aria-label="Panel editor" className="grid grid-cols-4 gap-1 rounded-field bg-surface-2 p-1 xl:grid-cols-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={t.id === "properties" ? panel === "properties" : leftTab === t.id && panel !== "properties"}
                  aria-controls={t.id === "properties" ? "panel-properties" : `panel-${t.id}`}
                  onClick={() => pickTab(t.id)}
                  className={`h-10 rounded-[7px] px-1.5 text-xs font-semibold text-ink-2 transition hover:text-ink aria-selected:bg-accent aria-selected:text-on-accent sm:text-sm ${
                    t.id === "properties" ? "xl:hidden" : ""
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`panel-${leftTab}`} aria-labelledby={`tab-${leftTab}`} className={`min-w-0 ${leftHidden}`}>
              {leftTab === "templates" ? <TemplatesPanel activeTemplate={design.templateId} onPick={pickTemplate} /> : null}
              {leftTab === "layers" ? <LayersPanel design={design} selected={selected} onSelect={selectLayer} edit={edit} /> : null}
              {leftTab === "designs" ? <DesignsPanel snap={snap} onNotice={toast} /> : null}
            </div>
          </div>
        </aside>

        <aside id="panel-properties" aria-label="Properties" className={`order-3 min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start xl:overflow-y-auto ${propertiesHidden}`}>
          <div className="panel p-3 sm:p-5">
            <Inspector design={design} layer={selected} edit={edit} />
          </div>
        </aside>
      </div>

      <div className="panel mt-10 p-4 sm:p-7">
        <ExportPanel css={css} codeRef={codeRef} copyState={copyState} onCopy={copyCss} />
      </div>
    </div>
  );
}

export function Editor() {
  return (
    <ToastProvider>
      <EditorInner />
    </ToastProvider>
  );
}
