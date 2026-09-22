"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowsClockwise, Crosshair, Pause, Play, Trash } from "@phosphor-icons/react";
import type { ImageGeometry, ImagePatch } from "@/lib/design/image-target";
import { LAYER_IDS } from "@/lib/design/layers";
import type { LayerId } from "@/lib/design/model";
import { buildPreviewDoc, SEND_KINDS, SPEEDS, type SendKind, type SpeedId } from "@/lib/design/preview-doc";
import { report } from "@/lib/report";
import { ErrorNotice } from "./ErrorNotice";
import { Segmented, ToggleField } from "./controls";

type Backdrop = "dark" | "light" | "photo" | "checker";
type Width = 320 | 400 | 520;

const BACKDROP_STYLE: Record<Backdrop, { className?: string; style?: React.CSSProperties }> = {
  dark: { style: { background: "linear-gradient(160deg, #1a1d26, #0d0f14)" } },
  light: { style: { background: "linear-gradient(160deg, #eef0f5, #d8dce6)" } },
  // Foto acak berbasis seed tetap. Hanya diminta saat pilihan ini dipakai.
  photo: {
    style: {
      backgroundImage:
        "url(https://picsum.photos/seed/lazycustom-gameplay/1000/800), linear-gradient(135deg, #2c5364, #203a43, #0f2027)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  checker: { className: "checker" },
};

const SEND_LABEL: Record<SendKind, string> = {
  viewer: "Message",
  member: "Member",
  moderator: "Moderator",
  owner: "Owner",
  superchat: "Super Chat",
  membership: "Membership",
  sticker: "Sticker",
};

const READY_TIMEOUT_MS = 4000;

type FrameMessage =
  | { type: "css"; css: string }
  | { type: "ping" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "speed"; ms: number }
  | { type: "send"; kind: SendKind }
  | { type: "clear" }
  | { type: "restart" }
  | { type: "select"; layer: LayerId | null }
  | { type: "motion"; reduce: boolean }
  | { type: "free"; on: boolean }
  | { type: "focus"; kind: SendKind | null }
  | { type: "imgsel"; target: ImageGeometry | null; ref: number };

/** Kirim pesan ke iframe. Gagal cukup dicatat: preview yang macet ditangani timeout siap di bawah. */
function postToFrame(frame: HTMLIFrameElement | null, message: FrameMessage): void {
  try {
    frame?.contentWindow?.postMessage(message, "*");
  } catch (error) {
    report({ code: "PREVIEW_FAILED", error, level: "warn", context: { step: "post" } });
  }
}

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getReduced = () => window.matchMedia(reducedQuery).matches;

const toolButton =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-field border border-line-strong bg-surface px-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95";

const ROLE_KINDS = ["viewer", "member", "moderator", "owner", "superchat", "membership", "sticker"];
const ANCHOR_SET = new Set(["top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right"]);

/** Patch dari iframe diperiksa lagi di sini. Hanya angka hingga dan anchor yang dikenal yang lolos. */
function cleanPatch(raw: unknown): ImagePatch | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const out: ImagePatch = {};
  for (const k of ["width", "height", "offsetX", "offsetY"] as const) {
    if (r[k] === undefined) continue;
    if (typeof r[k] !== "number" || !Number.isFinite(r[k]) || Math.abs(r[k] as number) > 5000) return null;
    out[k] = r[k] as number;
  }
  if (r.anchor !== undefined) {
    if (typeof r.anchor !== "string" || !ANCHOR_SET.has(r.anchor)) return null;
    out.anchor = r.anchor as ImagePatch["anchor"];
  }
  return Object.keys(out).length ? out : null;
}

interface Props {
  css: string;
  selected: LayerId | null;
  /** role: peran pesan yang diklik di preview (viewer, member, ...), bila ada. */
  onSelect: (layer: LayerId, role?: string | null) => void;
  /** Lebar acuan skala otomatis, atau 0 bila skala mati. Dipakai gizmo gambar untuk menghitung ukuran. */
  scaleRef?: number;
  /** Hanya tampilkan satu jenis pesan di preview. Null berarti semua. */
  focusKind?: SendKind | null;
  focusOn?: boolean;
  onFocusToggle?: () => void;
  focusLabel?: string;
  /** Gambar yang sedang diatur di canvas. Simulasi chat dijeda selama itu. */
  imageTarget?: ImageGeometry | null;
  onImageSet?: (ref: { kind: "pin" | "panel"; scope: string; id: string }, patch: ImagePatch) => void;
  onImageDone?: () => void;
  /** Kelas tinggi untuk area preview, diatur oleh layout induk. */
  frameClassName: string;
  /** Mode geser bagian pesan langsung di preview (layout Free). */
  freeDrag?: boolean;
  onMovePart?: (part: string, dx: number, dy: number) => void;
}

export function Stage({
  css,
  selected,
  onSelect,
  frameClassName,
  freeDrag = false,
  onMovePart,
  scaleRef = 0,
  focusKind = null,
  focusOn = false,
  onFocusToggle,
  focusLabel = "Fokus bubble",
  imageTarget = null,
  onImageSet,
  onImageDone,
}: Props) {
  const [backdrop, setBackdrop] = useState<Backdrop>("dark");
  const [width, setWidth] = useState<Width>(400);
  const [speed, setSpeed] = useState<SpeedId>("normal");
  const [playing, setPlaying] = useState(true);
  const [forceMotion, setForceMotion] = useState(false);
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [failRef, setFailRef] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => false);
  const reduceInFrame = reduced && !forceMotion;
  // Dokumen awal dibuat sekali. Pembaruan berikutnya lewat postMessage supaya iframe
  // tidak dimuat ulang setiap slider digeser.
  const [initialDoc] = useState(() => buildPreviewDoc(css, "live"));

  // Menunggu sinyal siap dari iframe dan menerima pilihan layer dari klik di preview.
  useEffect(() => {
    readyRef.current = false;
    function onMessage(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow) return;
      const data = e.data as { type?: string; layer?: unknown; role?: unknown } | null;
      if (data?.type === "lc-ready") {
        readyRef.current = true;
        clearTimeout(timer);
        setStatus("ready");
      } else if (data?.type === "lc-move") {
        const m = data as { part?: unknown; dx?: unknown; dy?: unknown };
        const parts = ["name", "message", "timestamp", "badges"];
        if (typeof m.part === "string" && parts.includes(m.part) && typeof m.dx === "number" && typeof m.dy === "number" && Number.isFinite(m.dx) && Number.isFinite(m.dy) && Math.abs(m.dx) < 2000 && Math.abs(m.dy) < 2000) {
          onMovePart?.(m.part, m.dx, m.dy);
        }
      } else if (data?.type === "lc-select" && typeof data.layer === "string") {
        const layer = data.layer as LayerId;
        const role = typeof data.role === "string" && ROLE_KINDS.includes(data.role) ? data.role : null;
        if (LAYER_IDS.includes(layer) && layer !== "animation") onSelect(layer, role);
      } else if (data?.type === "lc-image-set") {
        const m = data as { kind?: unknown; scope?: unknown; id?: unknown; patch?: unknown };
        const patch = cleanPatch(m.patch);
        if ((m.kind === "pin" || m.kind === "panel") && typeof m.scope === "string" && typeof m.id === "string" && patch) onImageSet?.({ kind: m.kind, scope: m.scope, id: m.id }, patch);
      } else if (data?.type === "lc-image-done") {
        onImageDone?.();
      }
    }
    const timer = setTimeout(() => {
      if (readyRef.current) return;
      setFailRef(report({ code: "PREVIEW_FAILED", level: "warn", context: { run } }));
      setStatus("failed");
    }, READY_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    // Iframe dari HTML server bisa siap sebelum listener ini terpasang. Ping memancing balasan siap.
    postToFrame(frameRef.current, { type: "ping" });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [run, onSelect, onMovePart, onImageSet, onImageDone]);

  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: "css", css });
  }, [css, status]);

  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: "select", layer: selected });
  }, [selected, status]);

  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: "motion", reduce: reduceInFrame });
  }, [reduceInFrame, status]);

  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: "speed", ms: SPEEDS[speed] });
  }, [speed, status]);

  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: "free", on: freeDrag });
  }, [freeDrag, status]);

  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: "focus", kind: focusKind });
  }, [focusKind, status]);

  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: "imgsel", target: imageTarget, ref: scaleRef });
  }, [imageTarget, scaleRef, status]);

  // Selama gambar diatur di canvas, pesan baru berhenti masuk supaya gambarnya tidak bergeser dari bawah kursor.
  const running = playing && imageTarget === null;
  useEffect(() => {
    if (status === "ready") postToFrame(frameRef.current, { type: running ? "play" : "pause" });
  }, [running, status]);

  function retry() {
    setStatus("loading");
    setFailRef(null);
    setPlaying(true);
    setRun((r) => r + 1);
  }

  const bg = BACKDROP_STYLE[backdrop];

  return (
    <section aria-label="Preview chat" className="grid min-w-0 gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          className={`${toolButton} max-sm:w-9 max-sm:px-0`}
        >
          {playing ? <Pause size={16} weight="fill" aria-hidden="true" /> : <Play size={16} weight="fill" aria-hidden="true" />}
          <span className="max-sm:sr-only">{playing ? "Pause" : "Play"}</span>
        </button>
        <Segmented<SpeedId>
          small
          hideLabel
          label="Kecepatan chat"
          value={speed}
          onChange={setSpeed}
          options={[
            { value: "slow", label: "Slow" },
            { value: "normal", label: "Normal" },
            { value: "fast", label: "Fast" },
          ]}
        />
        <button
          type="button"
          onClick={() => (status === "failed" ? retry() : postToFrame(frameRef.current, { type: "restart" }))}
          aria-label="Mulai ulang simulasi"
          className={`${toolButton} px-2.5`}
        >
          <ArrowsClockwise size={16} weight="bold" aria-hidden="true" />
          <span className="max-sm:sr-only">Restart</span>
        </button>
        <button
          type="button"
          onClick={() => postToFrame(frameRef.current, { type: "clear" })}
          aria-label="Kosongkan chat"
          className={`${toolButton} px-2.5 max-sm:hidden`}
        >
          <Trash size={16} weight="bold" aria-hidden="true" />
          <span className="max-sm:sr-only">Clear</span>
        </button>
        {onFocusToggle ? (
          <button
            type="button"
            onClick={onFocusToggle}
            aria-pressed={focusOn}
            title="Tampilkan hanya jenis pesan yang sedang kamu edit, supaya gampang dilihat"
            className={`${toolButton} px-2.5 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent`}
          >
            <Crosshair size={16} weight="bold" aria-hidden="true" />
            <span className="max-sm:sr-only">{focusLabel}</span>
          </button>
        ) : null}
        <label className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-ink-2 max-sm:hidden">
          <span className="max-[420px]:sr-only">Backdrop</span>
          <select
            value={backdrop}
            onChange={(e) => setBackdrop(e.target.value as Backdrop)}
            className="h-9 cursor-pointer rounded-field border border-line-strong bg-surface px-2 text-sm text-ink"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="photo">Photo</option>
            <option value="checker">Checker</option>
          </select>
        </label>
        <div className="hidden lg:block">
          <Segmented<Width>
            small
            hideLabel
            label="Lebar chat di preview"
            value={width}
            onChange={setWidth}
            options={[
              { value: 320, label: "S" },
              { value: 400, label: "M" },
              { value: 520, label: "L" },
            ]}
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Kirim pesan contoh"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        <span className="flex shrink-0 items-center pr-1 text-xs font-medium text-ink-3">Send</span>
        {SEND_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => postToFrame(frameRef.current, { type: "send", kind })}
            className="h-9 shrink-0 whitespace-nowrap rounded-field border border-line bg-surface px-2.5 text-xs font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-95"
          >
            {SEND_LABEL[kind]}
          </button>
        ))}
        <label className="ml-1 inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-ink-3 sm:hidden">
          Backdrop
          <select
            value={backdrop}
            onChange={(e) => setBackdrop(e.target.value as Backdrop)}
            className="h-9 cursor-pointer rounded-field border border-line-strong bg-surface px-1.5 text-xs text-ink"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="photo">Photo</option>
            <option value="checker">Checker</option>
          </select>
        </label>
      </div>

      {imageTarget ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-field border border-accent bg-accent-soft px-3 py-2 text-sm text-ink">
          <span>Mengatur gambar di canvas. Geser untuk memindah, tarik titik di sudutnya untuk mengubah ukuran.</span>
          <button type="button" onClick={onImageDone} className="h-9 rounded-field bg-accent px-4 text-sm font-semibold text-on-accent transition active:scale-95">
            Selesai
          </button>
        </div>
      ) : null}

      <div
        className={`hud-frame relative overflow-hidden rounded-panel border border-line ${frameClassName} ${bg.className ?? ""}`}
        style={bg.style}
      >
        <iframe
          key={run}
          ref={frameRef}
          title="Preview chat dengan gayamu"
          srcDoc={initialDoc}
          onLoad={() => postToFrame(frameRef.current, { type: "ping" })}
          sandbox="allow-scripts"
          tabIndex={-1}
          style={{ width, colorScheme: "normal" }}
          className="mx-auto block h-full max-w-full border-0 bg-transparent"
        />
      </div>

      {reduced ? (
        <div className="rounded-field bg-surface-2 px-3 py-2">
          <ToggleField
            label="Tampilkan animasi di preview"
            hint="Perangkatmu meminta gerak minimal, jadi animasi preview dimatikan. Nyalakan kalau kamu ingin melihatnya."
            checked={forceMotion}
            onChange={setForceMotion}
          />
        </div>
      ) : null}

      {status === "failed" ? (
        <ErrorNotice code="PREVIEW_FAILED" refId={failRef}>
          <button
            type="button"
            onClick={retry}
            className="mt-1 w-fit rounded-field bg-accent px-4 py-1.5 text-sm font-semibold text-on-accent"
          >
            Putar ulang
          </button>
        </ErrorNotice>
      ) : (
        <p className="text-xs text-ink-3 max-sm:hidden">
          Klik bagian chat di preview untuk mengeditnya. Preview mendekati tampilan asli, jadi cek sekali di OBS.
        </p>
      )}
    </section>
  );
}
