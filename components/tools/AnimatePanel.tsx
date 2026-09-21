"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import {
  EFFECT_KINDS,
  ELEMENT_ANIMS,
  ELEMENT_IDS,
  type Design,
  type Effect,
  type EffectKind,
  type ElementAnimStyle,
  type ElementId,
} from "@/lib/design/model";
import { SelectField, Section, SliderField } from "../controls";
import type { Edit } from "../Inspector";

const ELEMENT_LABEL: Record<ElementId, string> = {
  avatar: "Avatar",
  name: "Name",
  badges: "Badges",
  timestamp: "Timestamp",
  message: "Message text",
};

const ANIM_LABEL: Record<ElementAnimStyle, string> = {
  none: "None",
  fade: "Fade",
  rise: "Rise",
  drop: "Drop",
  pan: "Pan",
  wipe: "Wipe",
  pop: "Pop",
  blur: "Blur",
};

export const EFFECT_INFO: Record<EffectKind, { label: string; hint: string }> = {
  float: { label: "Float", hint: "Bubble naik turun pelan." },
  pulse: { label: "Pulse", hint: "Avatar berdenyut membesar dan mengecil." },
  shimmer: { label: "Shimmer", hint: "Gradient border berkilau. Butuh dekorasi Gradient border." },
  "glow-pulse": { label: "Glow pulse", hint: "Bubble terang dan redup bergantian." },
  flicker: { label: "Neon flicker", hint: "Nama berkedip seperti lampu neon." },
  glitch: { label: "Glitch", hint: "Nama bergetar dengan pecahan warna RGB." },
  shake: { label: "Shake", hint: "Bubble bergetar sekali setelah animasi masuk." },
  spin: { label: "Spin", hint: "Bingkai avatar berputar. Butuh Avatar frame." },
  drift: { label: "Drift", hint: "Gambar latar bergeser pelan. Butuh Image latar." },
};

const MAX_EFFECTS = 6;
const ID_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

function effectId(kind: EffectKind): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `fx-${kind}-${Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("")}`;
}

/** Apakah syarat efek terpenuhi di desain ini. Efek yang syaratnya belum ada tidak menulis CSS apa pun. */
export function effectReady(kind: EffectKind, d: Design): boolean {
  if (kind === "shimmer") {
    const has = (s: Design["bubble"]) => s.decorations.some((x) => x.kind === "gradient-border");
    return (d.bubble.show && has(d.bubble)) || has(d.superChat.surface as Design["bubble"]) || has(d.membership.surface as Design["bubble"]) || has(d.sticker.surface as Design["bubble"]);
  }
  if (kind === "spin") return d.avatar.frame.url !== "";
  if (kind === "drift") return d.bubble.show && d.bubble.decorations.some((x) => x.kind === "image" && x.url !== "");
  return true;
}

interface Props {
  design: Design;
  edit: Edit;
  onOpenLayer: (layer: "animation") => void;
}

export function AnimatePanel({ design: d, edit, onOpenLayer }: Props) {
  const setEl = (id: ElementId, patch: Partial<Design["elements"][ElementId]>, key: string) =>
    edit((x) => ({ ...x, elements: { ...x.elements, [id]: { ...x.elements[id], ...patch } } }), key);

  /** Satu preset untuk semua elemen dengan jeda bertahap, seperti "Animate all" di Canva. */
  function applyAll(style: ElementAnimStyle) {
    edit((x) => {
      const next = { ...x.elements };
      ELEMENT_IDS.forEach((id, i) => {
        next[id] = { style, duration: x.elements[id].duration, delay: style === "none" ? 0 : i * 90 };
      });
      return { ...x, elements: next };
    });
  }

  function addEffect(kind: EffectKind) {
    if (d.effects.length >= MAX_EFFECTS) return;
    const e: Effect = { id: effectId(kind), kind, speed: 5, intensity: 5 };
    edit((x) => ({ ...x, effects: [...x.effects, e] }), `fx.add.${kind}`);
  }

  const patchEffect = (id: string, patch: Partial<Effect>, key: string) =>
    edit((x) => ({ ...x, effects: x.effects.map((e) => (e.id === id ? { ...e, ...patch } : e)) }), key);

  return (
    <div className="grid gap-7">
      <p className="text-sm text-ink-2">
        Beri gerak pada tiap bagian pesan. Animasi masuk jalan setiap ada pesan baru. Tekan tombol Send di preview untuk melihatnya berulang.
      </p>

      <Section title="Animate all">
        <div className="flex flex-wrap gap-2">
          {ELEMENT_ANIMS.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => applyAll(style)}
              className="h-9 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
            >
              {ANIM_LABEL[style]}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3">Menerapkan satu preset ke semua elemen dengan jeda bertahap.</p>
      </Section>

      <Section title="Entrance per element">
        <ul className="grid gap-3">
          {ELEMENT_IDS.map((id) => {
            const a = d.elements[id];
            return (
              <li key={id} className="grid gap-3 rounded-field border border-line bg-surface-2/50 p-3">
                <SelectField
                  label={ELEMENT_LABEL[id]}
                  value={a.style}
                  options={ELEMENT_ANIMS.map((s) => ({ value: s, label: ANIM_LABEL[s] }))}
                  onChange={(style) => setEl(id, { style }, `el.${id}.style`)}
                />
                {a.style !== "none" ? (
                  <>
                    <SliderField label="Duration" value={a.duration} min={120} max={1200} step={20} unit="ms" onChange={(duration) => setEl(id, { duration }, `el.${id}.duration`)} />
                    <SliderField label="Delay" value={a.delay} min={0} max={1500} step={20} unit="ms" onChange={(delay) => setEl(id, { delay }, `el.${id}.delay`)} />
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={`Effects (${d.effects.length}/${MAX_EFFECTS})`}>
        <div className="flex flex-wrap gap-2">
          {EFFECT_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={d.effects.length >= MAX_EFFECTS}
              onClick={() => addEffect(kind)}
              title={EFFECT_INFO[kind].hint}
              className="inline-flex h-9 items-center gap-1.5 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:text-ink"
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
              {EFFECT_INFO[kind].label}
            </button>
          ))}
        </div>
        {d.effects.length === 0 ? (
          <p className="rounded-field border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-3">
            Belum ada efek. Tambahkan glow berdenyut, glitch, atau neon flicker di atas.
          </p>
        ) : (
          <ul className="grid gap-3">
            {d.effects.map((e, i) => {
              const ready = effectReady(e.kind, d);
              return (
                <li key={e.id} className="grid gap-3 rounded-field border border-line bg-surface-2/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm font-semibold text-ink">
                      {EFFECT_INFO[e.kind].label}
                      <span className="ml-2 font-mono text-xs font-normal text-ink-3">#{i + 1}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => edit((x) => ({ ...x, effects: x.effects.filter((f) => f.id !== e.id) }), `fx.remove.${e.id}`)}
                      aria-label={`Hapus efek ${EFFECT_INFO[e.kind].label} #${i + 1}`}
                      className="inline-flex size-9 items-center justify-center rounded-field text-ink-2 transition hover:bg-danger-soft hover:text-danger active:scale-95"
                    >
                      <Trash size={18} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                  <p className={`text-xs ${ready ? "text-ink-3" : "text-warn"}`}>
                    {ready ? EFFECT_INFO[e.kind].hint : `Belum aktif. ${EFFECT_INFO[e.kind].hint}`}
                  </p>
                  <SliderField label="Speed" value={e.speed} min={1} max={10} onChange={(speed) => patchEffect(e.id, { speed }, `fx.${e.id}.speed`)} />
                  <SliderField label="Intensity" value={e.intensity} min={1} max={10} onChange={(intensity) => patchEffect(e.id, { intensity }, `fx.${e.id}.intensity`)} />
                </li>
              );
            })}
          </ul>
        )}
        {d.effects.length > 3 ? (
          <p className="rounded-field bg-warn-soft px-3 py-2 text-xs text-ink">
            Efek yang berulang terus memakai CPU di OBS. Tiga efek atau kurang biasanya aman untuk chat yang ramai.
          </p>
        ) : null}
      </Section>

      <button
        type="button"
        onClick={() => onOpenLayer("animation")}
        className="h-10 w-fit rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
      >
        Atur animasi bubble masuk
      </button>
    </div>
  );
}
