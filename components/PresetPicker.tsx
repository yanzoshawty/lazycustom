"use client";

import { useId, type CSSProperties } from "react";
import { motion } from "motion/react";
import { rgba } from "@/lib/color";
import { PRESETS } from "@/lib/presets";
import type { PresetId, Settings } from "@/lib/settings";

interface Props {
  value: PresetId;
  modified: boolean;
  onPick: (id: PresetId) => void;
}

/** Contoh bubble kecil berdasarkan nilai preset (bentuk dan warna saja, bukan tangkapan layar). */
function bubbleStyle(s: Settings): CSSProperties {
  const b = s.bubble;
  const shadow =
    b.shadow === "hard"
      ? `2px 2px 0 ${b.shadowColor}`
      : b.shadow === "soft"
        ? `0 2px 6px ${rgba(b.shadowColor, 40)}`
        : "none";
  return {
    background: b.show ? rgba(b.color, b.opacity) : "transparent",
    color: s.textColor,
    border: b.show && b.borderWidth > 0 ? `${Math.min(b.borderWidth, 3)}px solid ${b.borderColor}` : "0",
    borderRadius: Math.min(b.radius, 18),
    boxShadow: b.show ? shadow : "none",
    padding: b.show ? "6px 10px" : "0",
    fontWeight: s.weight,
    textShadow: !b.show && s.edge !== "none" ? "0 1px 2px rgba(0,0,0,0.6)" : undefined,
  };
}

export function PresetPicker({ value, modified, onPick }: Props) {
  const name = useId();
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm text-ink-2">Pilih satu sebagai titik awal, lalu ubah sesukamu.</legend>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((p) => {
          const selected = p.id === value;
          const s = p.settings;
          return (
            <label key={p.id} className="relative block cursor-pointer">
              <input
                type="radio"
                name={name}
                value={p.id}
                checked={selected}
                onChange={() => onPick(p.id)}
                className="peer sr-only"
              />
              <span className="block rounded-panel border border-line bg-surface p-2.5 transition motion-safe:hover:-rotate-1 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                <span
                  aria-hidden="true"
                  className="flex h-20 items-center overflow-hidden rounded-field px-3"
                  style={{ background: "linear-gradient(135deg, #3b4052, #22252f)" }}
                >
                  <span
                    className={`text-[13px] leading-tight ${s.layout === "stacked" ? "grid gap-0.5" : "inline-block"}`}
                    style={bubbleStyle(s)}
                  >
                    <span style={{ color: s.names.viewer, fontWeight: s.nameWeight }}>Ayu </span>
                    <span>Halo semuanya!</span>
                  </span>
                </span>
                <span className="mt-2 block px-1 font-display text-sm font-semibold text-ink">
                  {p.label}
                  {selected && modified ? (
                    <span className="ml-1.5 font-sans text-xs font-normal text-ink-3">(diubah)</span>
                  ) : null}
                </span>
                <span className="block px-1 text-xs text-ink-3">{p.hint}</span>
              </span>
              {selected ? (
                <motion.span
                  layoutId="preset-ring"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="pointer-events-none absolute inset-0 rounded-panel border-2 border-accent"
                />
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
