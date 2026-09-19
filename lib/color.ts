/** Utilitas warna kecil. Semua warna di lazycustom disimpan sebagai #RRGGBB. */

export const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Terima "d6336c", "#d63", "#D6336C" dan kembalikan "#D6336C". Null kalau tidak valid. */
export function normalizeHex(input: string): string | null {
  const t = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(t)) {
    return "#" + t.split("").map((c) => c + c).join("").toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(t)) return "#" + t.toUpperCase();
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** rgba() dengan opacity 0-100. Sengaja tanpa sintaks CSS modern supaya aman di OBS. */
export function rgba(hex: string, opacityPct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const a = Math.round(Math.min(100, Math.max(0, opacityPct))) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Warna tepi teks yang kontras dengan warna teks: gelap untuk teks terang, dan sebaliknya. */
export function pickEdge(textHex: string): string {
  return luminance(textHex) > 0.4 ? "#101216" : "#F4F5F8";
}
