"use client";

import type { Surface } from "@/lib/design/model";
import { ColorField, FillField, Section, Segmented, SliderField } from "./controls";
import { DecorationsEditor } from "./DecorationsEditor";

interface Props {
  surface: Surface;
  /** Terapkan perubahan pada surface. `key` dipakai untuk menggabungkan langkah undo. */
  onChange: (fn: (s: Surface) => Surface, key: string) => void;
  /** Sembunyikan fill, misalnya saat warnanya datang dari tier YouTube. */
  hideFill?: boolean;
  fillLabel?: string;
}

export function SurfaceEditor({ surface, onChange, hideFill = false, fillLabel = "Fill" }: Props) {
  return (
    <div className="grid gap-7">
      {hideFill ? null : (
        <Section title={fillLabel}>
          <FillField label="Jenis fill" value={surface.fill} onChange={(fill) => onChange((s) => ({ ...s, fill }), "surface.fill")} />
        </Section>
      )}

      <Section title="Bentuk">
        <SliderField label="Radius" value={surface.radius} min={0} max={32} unit="px" onChange={(radius) => onChange((s) => ({ ...s, radius }), "surface.radius")} />
        <SliderField label="Padding" value={surface.padding} min={4} max={24} unit="px" onChange={(padding) => onChange((s) => ({ ...s, padding }), "surface.padding")} />
      </Section>

      <Section title="Border dan shadow">
        <SliderField label="Border" value={surface.borderWidth} min={0} max={6} unit="px" onChange={(borderWidth) => onChange((s) => ({ ...s, borderWidth }), "surface.border")} />
        {surface.borderWidth > 0 ? (
          <ColorField label="Warna border" value={surface.borderColor} onChange={(borderColor) => onChange((s) => ({ ...s, borderColor }), "surface.borderColor")} />
        ) : null}
        <Segmented
          label="Shadow"
          small
          value={surface.shadow}
          options={[
            { value: "none", label: "None" },
            { value: "soft", label: "Soft" },
            { value: "hard", label: "Hard" },
          ]}
          onChange={(shadow) => onChange((s) => ({ ...s, shadow }), "surface.shadow")}
        />
        {surface.shadow !== "none" ? (
          <ColorField label="Warna shadow" value={surface.shadowColor} onChange={(shadowColor) => onChange((s) => ({ ...s, shadowColor }), "surface.shadowColor")} />
        ) : null}
      </Section>

      <Section title="Dekorasi">
        <DecorationsEditor
          decorations={surface.decorations}
          onChange={(decorations, key) => onChange((s) => ({ ...s, decorations }), key)}
        />
      </Section>
    </div>
  );
}
