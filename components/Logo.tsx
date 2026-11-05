/**
 * Logo Lazycustom Livechat: balon chat berpotongan sudut dengan slider di dalamnya (simbol lama,
 * dipertahankan atas permintaan pemilik). Ide dasarnya: cukup geser, tidak perlu menulis kode.
 * Hanya tiga elemen geometri supaya tetap terbaca di ukuran favicon.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M8 3h13l8 8v8a5 5 0 0 1-5 5H15l-6 5v-5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Z" fill="var(--accent)" />
      <rect x="8" y="11.75" width="16" height="3.5" rx="1.75" fill="var(--on-accent)" opacity="0.55" />
      <circle cx="18.5" cy="13.5" r="3.6" fill="var(--on-accent)" />
    </svg>
  );
}

/** Wordmark: "Livechat" dicetak lebih ringan supaya nama utama tetap terbaca pertama. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-lg leading-none tracking-tight text-ink sm:text-xl ${compact ? "max-sm:sr-only" : "max-[359px]:sr-only"}`}>
        <span className="font-bold">Lazycustom</span> <span className="font-medium text-ink-2">Livechat</span>
      </span>
    </span>
  );
}
