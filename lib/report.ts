import type { ErrorCode } from "./errors";
import { newRef } from "./ref";

/**
 * Pelapor error dari browser. Mengirim ringkasan teknis ke /api/log supaya masuk
 * ke Vercel Logs. Tidak pernah melempar error sendiri: kegagalan melapor tidak
 * boleh membuat masalah baru bagi user.
 */
export interface ReportInput {
  code: ErrorCode;
  error?: unknown;
  ref?: string;
  level?: "error" | "warn";
  /** Hanya nilai sederhana. Jangan masukkan isi file, pengaturan, atau data pribadi. */
  context?: Record<string, string | number | boolean>;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 500);
  if (typeof error === "string") return error.slice(0, 500);
  return "(tanpa detail)";
}

export function report(input: ReportInput): string {
  const ref = input.ref ?? newRef();
  try {
    const payload = {
      level: input.level ?? "error",
      code: input.code,
      ref,
      message: messageOf(input.error),
      stack: input.error instanceof Error ? input.error.stack?.slice(0, 2000) : undefined,
      path: typeof location !== "undefined" ? location.pathname.slice(0, 200) : undefined,
      ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : undefined,
      ctx: input.context,
    };
    if (process.env.NODE_ENV !== "production") console.error("[lazycustom]", payload);
    const body = JSON.stringify(payload);
    const sent =
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon("/api/log", new Blob([body], { type: "application/json" }));
    if (!sent) {
      void fetch("/api/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // Sengaja dibiarkan kosong.
  }
  return ref;
}
