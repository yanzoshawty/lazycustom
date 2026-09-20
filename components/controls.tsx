"use client";

import { useId, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { normalizeHex } from "@/lib/color";
import type { Fill } from "@/lib/design/model";

/** Kelompok kontrol dengan judul kecil ala panel instrumen. */
export function Section({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      {title ? (
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h3>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  onChange: (value: number) => void;
}

export function SliderField({ label, value, min, max, step = 1, unit = "", hint, onChange }: SliderProps) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-xs tabular-nums text-ink-2">
          {value}
          {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer"
      />
      {hint ? (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface ColorProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

/**
 * Warna dengan pemilih bawaan browser dan kolom kode hex.
 * Kode yang belum lengkap dibiarkan saat mengetik. Kalau kolom ditinggalkan dengan
 * kode yang salah, nilai lama dikembalikan dan pesan bantuan tampil.
 */
export function ColorField({ label, value, onChange }: ColorProps) {
  const id = useId();
  const errorId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const shown = draft ?? value;

  function handleText(text: string) {
    setDraft(text);
    setShowError(false);
    const normalized = normalizeHex(text);
    if (normalized && text.replace("#", "").length === 6) onChange(normalized);
  }

  function handleBlur() {
    if (draft === null) return;
    const normalized = normalizeHex(draft);
    if (normalized) onChange(normalized);
    else setShowError(true);
    setDraft(null);
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label}, pemilih warna`}
          value={value.toLowerCase()}
          onChange={(e) => {
            setDraft(null);
            setShowError(false);
            onChange(e.target.value.toUpperCase());
          }}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-field border border-line-strong bg-surface p-1"
        />
        <input
          id={id}
          type="text"
          value={shown}
          maxLength={7}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={showError}
          aria-describedby={showError ? errorId : undefined}
          onChange={(e) => handleText(e.target.value)}
          onBlur={handleBlur}
          className="h-10 w-full min-w-0 rounded-field border border-line-strong bg-surface px-3 font-mono text-sm uppercase text-ink placeholder:text-ink-3 aria-[invalid=true]:border-danger"
        />
      </div>
      {showError ? (
        <p id={errorId} className="text-xs text-danger">
          Kode warna harus 6 karakter, contoh #7DD3FC. Nilai sebelumnya kami kembalikan.
        </p>
      ) : null}
    </div>
  );
}

interface SegmentedProps<T extends string | number> {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  small?: boolean;
  /** Sembunyikan label secara visual tapi tetap terbaca oleh pembaca layar. */
  hideLabel?: boolean;
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  small = false,
  hideLabel = false,
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className="grid min-w-0 gap-1.5">
      <legend className={hideLabel ? "sr-only" : "mb-1.5 text-sm font-medium text-ink"}>{label}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-field bg-surface-2 p-1">
        {options.map((o) => (
          <label key={String(o.value)} className="relative">
            <input
              type="radio"
              name={name}
              value={String(o.value)}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={`block cursor-pointer whitespace-nowrap rounded-[7px] text-ink-2 transition peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:text-ink peer-checked:hover:text-on-accent ${
                small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
              }`}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleField({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="grid gap-0.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-[8px] bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-[6px] bg-surface shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-11 w-full cursor-pointer appearance-none rounded-field border border-line-strong bg-surface pl-3 pr-10 text-sm text-ink"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <CaretDown
          size={16}
          weight="bold"
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2"
        />
      </div>
    </div>
  );
}

interface TextProps {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  inputMode?: "text" | "url";
  onChange: (value: string) => void;
}

export function TextField({ label, value, placeholder, hint, error, inputMode = "text", onChange }: TextProps) {
  const id = useId();
  const noteId = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? noteId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-field border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 aria-[invalid=true]:border-danger"
      />
      {error ? (
        <p id={noteId} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Petunjuk non-blokir, misalnya peringatan kontras warna. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-field bg-warn-soft px-3 py-2 text-sm text-ink">
      {children}
    </p>
  );
}

interface FillProps {
  label: string;
  value: Fill;
  onChange: (fill: Fill) => void;
  allowNone?: boolean;
}

/** Fill kosong, solid, atau gradient dengan opacity. Dipakai bubble, kartu, dan header kartu. */
export function FillField({ label, value, onChange, allowNone = true }: FillProps) {
  const modes = [
    ...(allowNone ? [{ value: "none" as const, label: "None" }] : []),
    { value: "solid" as const, label: "Solid" },
    { value: "gradient" as const, label: "Gradient" },
  ];
  return (
    <div className="grid gap-3">
      <Segmented label={label} small options={modes} value={value.mode} onChange={(mode) => onChange({ ...value, mode })} />
      {value.mode !== "none" ? (
        <>
          <ColorField
            label={value.mode === "gradient" ? "Warna awal" : "Warna"}
            value={value.color}
            onChange={(color) => onChange({ ...value, color, ...(value.mode === "solid" ? { color2: color } : {}) })}
          />
          {value.mode === "gradient" ? (
            <>
              <ColorField label="Warna akhir" value={value.color2} onChange={(color2) => onChange({ ...value, color2 })} />
              <SliderField label="Angle" value={value.angle} min={0} max={360} step={5} unit={"\u00b0"} onChange={(angle) => onChange({ ...value, angle })} />
            </>
          ) : null}
          <SliderField label="Opacity" value={value.opacity} min={0} max={100} unit="%" onChange={(opacity) => onChange({ ...value, opacity })} />
        </>
      ) : null}
    </div>
  );
}
