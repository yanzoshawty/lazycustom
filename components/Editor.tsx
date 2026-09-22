"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowArcLeft,
  ArrowArcRight,
  FolderSimple,
  Shapes,
  SlidersHorizontal,
  Sparkle,
  SquaresFour,
  Stack,
  TextT,
  UploadSimple,
  type Icon,
} from "@phosphor-icons/react";
import { copyText } from "@/lib/clipboard";
import { generateCss } from "@/lib/design/css";
import { findImage, patchImage, type ImagePatch, type ImageRef, type ImageScope } from "@/lib/design/image-target";
import type { SendKind } from "@/lib/design/preview-doc";
import { designsEqual, type GridPart, remoteImageHosts, remoteImageUrls, stripRemoteImages, type Design, type LayerId, type TemplateId } from "@/lib/design/model";
import { decodeDesign, readShareHash } from "@/lib/design/share";
import { designStore } from "@/lib/design/store";
import { templateById } from "@/lib/design/templates";
import { report } from "@/lib/report";
import { CanvasContext, type BubbleScope, type CanvasApi } from "./canvas-context";
import { DesignsPanel } from "./DesignsPanel";
import { ErrorNotice } from "./ErrorNotice";
import { CopyButton, ExportPanel, type CopyState } from "./ExportPanel";
import { Inspector, type Edit } from "./Inspector";
import { LayersPanel } from "./LayersPanel";
import { Logo } from "./Logo";
import { RemoteImagesPrompt } from "./RemoteImagesPrompt";
import { Stage } from "./Stage";
import { TemplatesPanel } from "./TemplatesPanel";
import { ThemeToggle } from "./ThemeToggle";
import { ToastProvider, useToast } from "./Toaster";
import { AnimatePanel } from "./tools/AnimatePanel";
import { ElementsPanel } from "./tools/ElementsPanel";
import { TextPanel } from "./tools/TextPanel";
import { UploadsPanel } from "./tools/UploadsPanel";

type Tab = "templates" | "elements" | "text" | "uploads" | "animate" | "layers" | "designs";
type MobileTab = Tab | "properties";

/** Tools di sisi kiri ala Canva. Properties hanya jadi tab di layar sempit, di layar lebar ia punya kolom sendiri. */
const TABS: Array<{ id: MobileTab; label: string; Icon: Icon }> = [
  { id: "templates", label: "Templates", Icon: SquaresFour },
  { id: "elements", label: "Elements", Icon: Shapes },
  { id: "text", label: "Text", Icon: TextT },
  { id: "uploads", label: "Uploads", Icon: UploadSimple },
  { id: "animate", label: "Animate", Icon: Sparkle },
  { id: "layers", label: "Layers", Icon: Stack },
  { id: "designs", label: "Designs", Icon: FolderSimple },
  { id: "properties", label: "Properties", Icon: SlidersHorizontal },
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
  // Desain dari orang lain yang memuat gambar dari server luar menunggu keputusan user sebelum dibuka.
  const [pending, setPending] = useState<{ design: Design; source: "share" | "file" } | null>(null);

  const openDesign = useCallback((design: Design, source: "share" | "file") => {
    if (source === "share") return designStore.openShared(design);
    return designStore.importDesign(design);
  }, []);

  // Desain tanpa gambar dari luar langsung dibuka. Yang memuatnya ditanyakan dulu.
  const requestOpen = useCallback(
    (design: Design, source: "share" | "file") => {
      if (remoteImageUrls(design).length === 0) {
        if (openDesign(design, source) && source === "file") toast("Desain diimpor sebagai desain baru");
        return;
      }
      setPending({ design, source });
    },
    [openDesign, toast],
  );

  function choosePending(withImages: boolean) {
    if (!pending) return;
    const design = withImages ? pending.design : stripRemoteImages(pending.design).design;
    const ok = openDesign(design, pending.source);
    setPending(null);
    if (ok && pending.source === "file") toast(withImages ? "Desain diimpor dengan gambar" : "Desain diimpor tanpa gambar dari luar");
  }

  // Membuka link Share (#d=...) sekali saat halaman dimuat, lalu membersihkan alamatnya.
  useEffect(() => {
    if (handledShare.current) return;
    const code = readShareHash(location.hash);
    if (code === null) return;
    handledShare.current = true;
    history.replaceState(null, "", location.pathname + location.search);
    void decodeDesign(code).then((r) => {
      if (r.ok) requestOpen(r.design, "share");
      else designStore.reportShareProblem(r.code);
    });
  }, [requestOpen]);

  const edit = useCallback<Edit>((fn, key) => {
    designStore.update((d) => {
      const next = fn(d);
      if (designsEqual(next, d)) return d;
      return next.templateId === "custom" ? next : { ...next, templateId: "custom" };
    }, key);
  }, []);

  // Bubble yang sedang diedit (utama atau satu peran), mode fokus, dan gambar yang diatur di canvas.
  const [scope, setScope] = useState<BubbleScope>("default");
  const [focusOn, setFocusOn] = useState(false);
  const [imageEdit, setImageEdit] = useState<ImageRef | null>(null);

  // Mengklik bagian chat di preview atau layer di daftar memilih layer. Klik di pesan juga memilih
  // bubble peran pemilik pesan itu. Di layar sempit pengaturannya langsung dibuka, di layar lebar
  // Properties sudah tampil di kanan.
  const selectLayer = useCallback((layer: LayerId, role?: string | null) => {
    setSelected(layer);
    if (role === "viewer") setScope("default");
    else if (role === "member" || role === "moderator" || role === "owner") setScope(role);
    // Layer Bubble dipilih lewat Layers, Elements, atau Animate (tanpa info peran dari klik preview):
    // kembali ke Default, supaya tab peran yang tersisa dari klik sebelumnya tidak diam-diam terbawa.
    else if (layer === "bubble") setScope("default");
    if (!window.matchMedia("(min-width: 1280px)").matches) setPanel("properties");
  }, []);

  const imageTarget = useMemo(() => (imageEdit ? findImage(design, imageEdit) : null), [design, imageEdit]);
  // Gambar dihapus, atau desain diganti, saat sedang diatur: turunan ini langsung jadi null, tanpa
  // perlu menyinkronkan state di efek (imageEdit mentah tidak pernah dibaca di luar berkas ini).
  const activeImageEdit = imageTarget ? imageEdit : null;
  useEffect(() => {
    if (!activeImageEdit) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setImageEdit(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeImageEdit]);

  const onImageSet = useCallback(
    (ref: { kind: "pin" | "panel"; scope: string; id: string }, patch: ImagePatch) => {
      const target: ImageRef = ref.kind === "panel" ? { kind: "panel", id: ref.id } : { kind: "pin", scope: ref.scope as ImageScope, id: ref.id };
      edit((d) => patchImage(d, target, patch), `img.${ref.id}`);
    },
    [edit],
  );

  const canvas = useMemo<CanvasApi>(
    () => ({ scope, setScope, imageEdit: activeImageEdit, startImageEdit: setImageEdit, stopImageEdit: () => setImageEdit(null) }),
    [scope, activeImageEdit],
  );

  // Jenis pesan yang ditampilkan saja di preview. Mengatur gambar di bubble selalu memfokuskan bubble itu.
  const layerKind: SendKind | null =
    selected === "superchat" || selected === "membership" || selected === "sticker"
      ? selected
      : ["bubble", "name", "text", "badges", "timestamp", "avatar", "row"].includes(selected)
        ? scope === "default"
          ? "viewer"
          : scope
        : null;
  const imageKind: SendKind | null = imageEdit?.kind === "pin" ? (imageEdit.scope === "default" ? "viewer" : imageEdit.scope) : null;
  const focusKind = imageKind ?? (focusOn ? layerKind : null);
  const FOCUS_NAME: Record<SendKind, string> = { viewer: "Message", member: "Member", moderator: "Moderator", owner: "Owner", superchat: "Super Chat", membership: "Membership", sticker: "Sticker" };
  const focusLabel = layerKind ? `Fokus ${FOCUS_NAME[layerKind]}` : "Fokus bubble";

  // Mode geser bagian langsung di preview. Hanya berlaku untuk layout Free.
  const [dragMode, setDragMode] = useState(false);
  const freeDrag = dragMode && design.message.layout === "free";

  const movePart = useCallback(
    (part: string, dx: number, dy: number) => {
      const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
      edit((d) => {
        if (d.message.layout !== "free") return d;
        const key = part as GridPart;
        const cur = d.message.free.parts[key];
        if (!cur) return d;
        const next = { ...cur, x: clamp(cur.x + dx, -60, 600), y: clamp(cur.y + dy, -40, 300) };
        return { ...d, message: { ...d.message, free: { ...d.message.free, parts: { ...d.message.free.parts, [key]: next } } } };
      }, `free.${part}.drag`);
    },
    [edit],
  );

  function pickTab(tab: MobileTab) {
    setPanel(tab);
    if (tab !== "properties") setLeftTab(tab);
  }

  function pickTemplate(id: TemplateId) {
    designStore.applyTemplate(id);
    toast(`Template ${templateById(id).name} diterapkan`);
  }

  function newFromTemplate(id: TemplateId) {
    if (designStore.newDesign(id)) toast(`Desain baru dari template ${templateById(id).name} dibuat`);
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
        {pending ? (
          <RemoteImagesPrompt source={pending.source} count={remoteImageUrls(pending.design).length} hosts={remoteImageHosts(pending.design)} onChoose={choosePending} />
        ) : null}
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

      <CanvasContext.Provider value={canvas}>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        {/* Preview: menempel di atas saat halaman di-scroll */}
        <div className="order-1 sticky top-0 z-20 -mx-3 border-b border-line bg-bg px-3 pb-2.5 pt-2 sm:-mx-5 sm:px-5 xl:order-2 xl:top-4 xl:mx-0 xl:self-start xl:border-0 xl:bg-transparent xl:p-0">
          <Stage
            css={css}
            selected={selected}
            onSelect={selectLayer}
            scaleRef={design.row.autoScale ? design.row.refWidth : 0}
            focusKind={focusKind}
            focusOn={focusOn}
            onFocusToggle={layerKind ? () => setFocusOn((v) => !v) : undefined}
            focusLabel={focusLabel}
            imageTarget={imageTarget}
            onImageSet={onImageSet}
            onImageDone={canvas.stopImageEdit}
            freeDrag={freeDrag}
            onMovePart={movePart}
            frameClassName="h-[22dvh] min-h-[150px] sm:h-[32dvh] xl:h-[min(66dvh,620px)]"
          />
        </div>

        {/* Kolom kiri selalu tampil supaya bar tab tidak hilang saat Properties dibuka di layar sempit */}
        <aside aria-label="Templates, layers, dan desain" className="order-2 min-w-0 xl:order-1 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start xl:overflow-y-auto">
          <div className="panel grid gap-4 p-3 sm:p-4">
            <div role="tablist" aria-label="Panel editor" className="grid grid-cols-4 gap-1 rounded-field bg-surface-2 p-1">
              {TABS.map(({ id, label, Icon: TabIcon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={id === "properties" ? panel === "properties" : leftTab === id && panel !== "properties"}
                  aria-controls={id === "properties" ? "panel-properties" : `panel-${id}`}
                  onClick={() => pickTab(id)}
                  className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[7px] px-1 py-1.5 text-[11px] font-semibold leading-tight text-ink-2 transition hover:text-ink aria-selected:bg-accent aria-selected:text-on-accent ${
                    id === "properties" ? "xl:hidden" : ""
                  }`}
                >
                  <TabIcon size={18} weight="bold" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`panel-${leftTab}`} aria-labelledby={`tab-${leftTab}`} className={`min-w-0 ${leftHidden}`}>
              {leftTab === "templates" ? <TemplatesPanel activeTemplate={design.templateId} onPick={pickTemplate} onNew={newFromTemplate} /> : null}
              {leftTab === "elements" ? <ElementsPanel design={design} edit={edit} onOpenLayer={selectLayer} onNotice={toast} /> : null}
              {leftTab === "text" ? <TextPanel design={design} edit={edit} /> : null}
              {leftTab === "uploads" ? <UploadsPanel design={design} edit={edit} onNotice={toast} /> : null}
              {leftTab === "animate" ? <AnimatePanel design={design} edit={edit} onOpenLayer={selectLayer} /> : null}
              {leftTab === "layers" ? <LayersPanel design={design} selected={selected} onSelect={selectLayer} edit={edit} /> : null}
              {leftTab === "designs" ? <DesignsPanel snap={snap} onNotice={toast} onImportDesign={(d) => requestOpen(d, "file")} /> : null}
            </div>
          </div>
        </aside>

        <aside id="panel-properties" aria-label="Properties" className={`order-3 min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start xl:overflow-y-auto ${propertiesHidden}`}>
          <div className="panel p-3 sm:p-5">
            <Inspector design={design} layer={selected} edit={edit} dragMode={dragMode} onDragMode={setDragMode} />
          </div>
        </aside>
      </div>
      </CanvasContext.Provider>

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
