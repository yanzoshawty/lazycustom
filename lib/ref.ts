/**
 * Kode laporan pendek yang tampil ke user dan tercatat di log developer,
 * misalnya "LC-7K2F". Alfabet tanpa 0/O/1/I/L supaya tidak salah baca.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const REF_RE = /^LC-[A-Z0-9]{4}$/;

export function newRef(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return "LC-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
