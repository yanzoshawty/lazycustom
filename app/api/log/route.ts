import { z } from "zod";
import { ERROR_CODE_RE } from "@/lib/errors";
import { writeLog } from "@/lib/log-server";
import { REF_RE } from "@/lib/ref";

/**
 * Menerima laporan error dari browser dan menuliskannya ke log server (Vercel Logs).
 * Endpoint ini publik, jadi dibatasi: ukuran body kecil, bentuk data ketat,
 * dan pembatasan laju per alamat (per instance, upaya terbaik).
 */
const MAX_BODY_BYTES = 8 * 1024;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

const hits = new Map<string, { count: number; resetAt: number }>();

function limited(key: string, now: number): boolean {
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const ctxValue = z.union([z.string().max(200), z.number(), z.boolean()]);

const bodySchema = z
  .object({
    level: z.enum(["error", "warn"]),
    code: z.string().regex(ERROR_CODE_RE),
    ref: z.string().regex(REF_RE),
    message: z.string().max(500),
    stack: z.string().max(2000).optional(),
    path: z.string().max(200).optional(),
    ua: z.string().max(200).optional(),
    ctx: z
      .record(z.string().max(40), ctxValue)
      .refine((r) => Object.keys(r).length <= 10)
      .optional(),
  })
  .strict();

const NO_STORE = { "cache-control": "no-store" };

/** Alamat klien. Header milik Vercel diutamakan karena tidak bisa diisi sendiri oleh pengirim. */
function clientKey(request: Request): string {
  const h = request.headers;
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(request: Request): Promise<Response> {
  // Laporan hanya datang dari halaman kita sendiri. Permintaan lintas situs ditolak.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return new Response(null, { status: 403, headers: NO_STORE });
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) return new Response(null, { status: 415, headers: NO_STORE });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413, headers: NO_STORE });

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413, headers: NO_STORE });

  const key = clientKey(request);
  if (limited(key, Date.now())) {
    return new Response(null, { status: 429, headers: { "retry-after": "60", ...NO_STORE } });
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400, headers: NO_STORE });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400, headers: NO_STORE });

  writeLog({ source: "client", ...parsed.data });
  return new Response(null, { status: 204, headers: NO_STORE });
}

// Method lain ditolak dengan jelas, bukan dibiarkan jatuh ke halaman 404.
export function GET(): Response {
  return new Response(null, { status: 405, headers: { allow: "POST", ...NO_STORE } });
}
