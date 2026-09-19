/**
 * Penulis log sisi server. Vercel menangkap stdout dan stderr fungsi serverless,
 * jadi satu baris JSON per kejadian sudah cukup untuk dicari di Vercel Logs.
 * Tidak ada file log karena filesystem Vercel tidak persisten.
 */
export interface LogLine {
  level: "error" | "warn";
  source: "client" | "server";
  code: string;
  ref?: string;
  message: string;
  stack?: string;
  path?: string;
  ua?: string;
  ctx?: Record<string, string | number | boolean>;
}

export function writeLog(line: LogLine): void {
  // JSON.stringify meloloskan baris baru, jadi satu kejadian selalu satu baris log.
  const text = JSON.stringify({ ts: new Date().toISOString(), app: "lazycustom", ...line });
  if (line.level === "error") console.error(text);
  else console.warn(text);
}
