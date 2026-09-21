"use client";

import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { isSafeLabelText, type Design, type Label } from "@/lib/design/model";
import { ColorField, Section, Segmented, SliderField, TextField, ToggleField } from "../controls";
import type { Edit } from "../Inspector";

const PRESETS: Array<{ text: string; color: string; bg: string }> = [
  { text: "LIVE", color: "#FFFFFF", bg: "#E11D48" },
  { text: "MEMBER", color: "#04121F", bg: "#7CFFB8" },
  { text: "MOD", color: "#04121F", bg: "#8CC8FF" },
  { text: "NEW", color: "#1A0F00", bg: "#FFD84A" },
  { text: "HOT", color: "#FFFFFF", bg: "#FF6A00" },
  { text: "VIP", color: "#1A0F00", bg: "#FFB02E" },
];

const MAX_LABELS = 2;
const ID_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
const WEIGHTS = [
  { value: 400 as const, label: "Regular" },
  { value: 500 as const, label: "Medium" },
  { value: 600 as const, label: "Semi" },
  { value: 700 as const, label: "Bold" },
];

function labelId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `label-${Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("")}`;
}

/** Kolom teks yang hanya menerapkan isi yang aman. Isi yang ditolak ditampilkan dengan alasan dan tidak masuk ke desain. */
function SafeText({ label, value, placeholder, hint, onCommit }: { label: string; value: string; placeholder?: string; hint?: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div onBlur={() => setDraft(null)}>
      <TextField
        label={label}
        value={draft ?? value}
        placeholder={placeholder}
        hint={hint}
        error={error}
        onChange={(v) => {
          setDraft(v);
          if (isSafeLabelText(v)) {
            setError(null);
            onCommit(v);
          } else {
            setError("Maksimal 24 karakter dan tanpa karakter kontrol.");
          }
        }}
      />
    </div>
  );
}

interface Props {
  design: Design;
  edit: Edit;
}

export function TextPanel({ design: d, edit }: Props) {
  const patch = (id: string, p: Partial<Label>, key: string) => edit((x) => ({ ...x, labels: x.labels.map((l) => (l.id === id ? { ...l, ...p } : l)) }), key);

  function addLabel(p: (typeof PRESETS)[number]) {
    if (d.labels.length >= MAX_LABELS) return;
    const l: Label = {
      id: labelId(),
      text: p.text,
      roles: "all",
      position: "start",
      color: p.color,
      bgColor: p.bg,
      bgOpacity: 100,
      size: 75,
      weight: 700,
      uppercase: true,
      spacing: 1,
      radius: 3,
      padX: 6,
    };
    edit((x) => ({ ...x, labels: [...x.labels, l] }), "label.add");
  }

  const setAffix = (target: "name" | "message", side: "prefix" | "suffix", v: string) =>
    edit((x) => ({ ...x, affixes: { ...x.affixes, [target]: { ...x.affixes[target], [side]: v } } }), `affix.${target}.${side}`);

  const gridLike = d.message.layout === "grid" || d.message.layout === "free";

  return (
    <div className="grid gap-7">
      <p className="text-sm text-ink-2">Tambahkan teks sendiri di bubble, misalnya label LIVE atau MEMBER, atau hiasan di depan dan belakang nama.</p>

      <Section title={`Labels (${d.labels.length}/${MAX_LABELS})`}>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.text}
              type="button"
              disabled={d.labels.length >= MAX_LABELS}
              onClick={() => addLabel(p)}
              className="inline-flex h-9 items-center gap-1.5 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:text-ink"
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
              {p.text}
            </button>
          ))}
        </div>
        {d.labels.length >= MAX_LABELS ? <p className="text-xs text-ink-3">Batas dua label tercapai. Hapus satu untuk menambah lagi.</p> : null}
        {gridLike ? (
          <p className="text-xs text-ink-3">Di layout Grid dan Free, letak label diatur di panel Row, bagian Layout (label 1 dan label 2).</p>
        ) : null}

        {d.labels.length === 0 ? (
          <p className="rounded-field border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-3">Belum ada label. Pilih salah satu preset di atas.</p>
        ) : (
          <ul className="grid gap-3">
            {d.labels.map((l, i) => (
              <li key={l.id} className="grid gap-4 rounded-field border border-line bg-surface-2/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-semibold text-ink">
                    Label {i + 1}
                    <span className="ml-2 font-mono text-xs font-normal text-ink-3">{i === 0 ? "label1" : "label2"}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => edit((x) => ({ ...x, labels: x.labels.filter((y) => y.id !== l.id) }), `label.remove.${l.id}`)}
                    aria-label={`Hapus label ${i + 1}`}
                    className="inline-flex size-9 items-center justify-center rounded-field text-ink-2 transition hover:bg-danger-soft hover:text-danger active:scale-95"
                  >
                    <Trash size={18} weight="bold" aria-hidden="true" />
                  </button>
                </div>
                <SafeText label="Teks label" value={l.text} onCommit={(text) => patch(l.id, { text }, `label.${l.id}.text`)} />
                <Segmented
                  label="Tampil untuk"
                  small
                  value={l.roles}
                  options={[
                    { value: "all", label: "All" },
                    { value: "viewer", label: "Viewer" },
                    { value: "member", label: "Member" },
                    { value: "moderator", label: "Mod" },
                    { value: "owner", label: "Owner" },
                  ]}
                  onChange={(roles) => patch(l.id, { roles }, `label.${l.id}.roles`)}
                />
                <Segmented
                  label="Position"
                  small
                  value={l.position}
                  options={[
                    { value: "start", label: "Start" },
                    { value: "end", label: "End" },
                  ]}
                  onChange={(position) => patch(l.id, { position }, `label.${l.id}.position`)}
                />
                <ColorField label="Text color" value={l.color} onChange={(color) => patch(l.id, { color }, `label.${l.id}.color`)} />
                <ColorField label="Background color" value={l.bgColor} onChange={(bgColor) => patch(l.id, { bgColor }, `label.${l.id}.bgColor`)} />
                <SliderField label="Background opacity" value={l.bgOpacity} min={0} max={100} unit="%" onChange={(bgOpacity) => patch(l.id, { bgOpacity }, `label.${l.id}.bgOpacity`)} />
                <SliderField label="Size" value={l.size} min={60} max={140} unit="%" onChange={(size) => patch(l.id, { size }, `label.${l.id}.size`)} />
                <Segmented label="Weight" small value={l.weight} options={WEIGHTS} onChange={(weight) => patch(l.id, { weight }, `label.${l.id}.weight`)} />
                <ToggleField label="Uppercase" checked={l.uppercase} onChange={(uppercase) => patch(l.id, { uppercase }, `label.${l.id}.uppercase`)} />
                <SliderField label="Letter spacing" value={l.spacing} min={0} max={4} onChange={(spacing) => patch(l.id, { spacing }, `label.${l.id}.spacing`)} />
                <SliderField label="Radius" value={l.radius} min={0} max={12} unit="px" onChange={(radius) => patch(l.id, { radius }, `label.${l.id}.radius`)} />
                <SliderField label="Padding X" value={l.padX} min={0} max={12} unit="px" onChange={(padX) => patch(l.id, { padX }, `label.${l.id}.padX`)} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Prefix and suffix">
        <p className="text-xs text-ink-3">Hiasan teks sebelum dan sesudah nama atau pesan, misalnya bintang atau tanda centang.</p>
        <SafeText label="Name prefix" value={d.affixes.name.prefix} placeholder="contoh: ★ " onCommit={(v) => setAffix("name", "prefix", v)} />
        <SafeText label="Name suffix" value={d.affixes.name.suffix} placeholder="contoh:  ✓" onCommit={(v) => setAffix("name", "suffix", v)} />
        <SafeText label="Message prefix" value={d.affixes.message.prefix} placeholder="contoh: » " onCommit={(v) => setAffix("message", "prefix", v)} />
        <SafeText label="Message suffix" value={d.affixes.message.suffix} placeholder="contoh:  !" onCommit={(v) => setAffix("message", "suffix", v)} />
      </Section>
    </div>
  );
}
