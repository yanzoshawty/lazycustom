// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/log/route";

const valid = {
  level: "error",
  code: "COPY_BLOCKED",
  ref: "LC-7K2F",
  message: "NotAllowedError: Document is not focused",
  path: "/",
  ua: "Mozilla/5.0 (test)",
  ctx: { what: "css" },
};

let ipCounter = 0;
function req(body: unknown, init: { ip?: string; raw?: string } = {}): Request {
  return new Request("http://localhost/api/log", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": init.ip ?? `10.0.0.${++ipCounter}` },
    body: init.raw ?? JSON.stringify(body),
  });
}

describe("POST /api/log", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("menerima laporan valid dan menulis satu baris JSON ke stderr", async () => {
    const res = await POST(req(valid));
    expect(res.status).toBe(204);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const line = String(errorSpy.mock.calls[0][0]);
    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toMatchObject({
      app: "lazycustom",
      source: "client",
      level: "error",
      code: "COPY_BLOCKED",
      ref: "LC-7K2F",
      ctx: { what: "css" },
    });
    expect(JSON.parse(line).ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("menulis level warn ke console.warn", async () => {
    await POST(req({ ...valid, level: "warn" }));
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("menjaga satu kejadian tetap satu baris walau pesan berisi baris baru", async () => {
    await POST(req({ ...valid, message: "baris satu\nbaris dua\r\nbaris tiga", stack: "a\nb\nc" }));
    const line = String(errorSpy.mock.calls[0][0]);
    expect(line.split("\n")).toHaveLength(1);
    expect(JSON.parse(line).message).toContain("baris dua");
  });

  it("menolak JSON rusak", async () => {
    expect((await POST(req(null, { raw: "{bukan json" }))).status).toBe(400);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["level tidak dikenal", { ...valid, level: "info" }],
    ["kode berformat salah", { ...valid, code: "kode kecil" }],
    ["ref berformat salah", { ...valid, ref: "XX-1234" }],
    ["field asing", { ...valid, password: "rahasia" }],
    ["pesan terlalu panjang", { ...valid, message: "x".repeat(501) }],
    ["ctx terlalu banyak", { ...valid, ctx: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, i])) }],
    ["ctx berisi objek", { ...valid, ctx: { a: { b: 1 } } }],
    ["bukan objek", ["array"]],
  ])("menolak %s dengan 400", async (_name, body) => {
    expect((await POST(req(body))).status).toBe(400);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("menolak body lebih dari 8 KB dengan 413", async () => {
    const res = await POST(req(null, { raw: JSON.stringify({ ...valid, stack: "x".repeat(9000) }) }));
    expect(res.status).toBe(413);
  });

  it("membatasi 20 laporan per menit per alamat dan tidak mengganggu alamat lain", async () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < 20; i++) expect((await POST(req(valid, { ip }))).status).toBe(204);
    const blocked = await POST(req(valid, { ip }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    expect((await POST(req(valid, { ip: "203.0.113.10" }))).status).toBe(204);
  });
});

describe("GET /api/log", () => {
  it("ditolak dengan 405", () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });
});
