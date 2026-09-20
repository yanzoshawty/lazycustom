// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

async function headersFor(env: "production" | "development"): Promise<Record<string, string>> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  const config = (await import("@/next.config")).default;
  const rules = await config.headers!();
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe("/(.*)");
  return Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
}

afterEach(() => vi.unstubAllEnvs());

describe("header keamanan produksi", () => {
  it("memasang header dasar", async () => {
    const h = await headersFor("production");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("no-referrer");
    expect(h["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}/);
  });

  it("mematikan fitur perangkat yang tidak dipakai", async () => {
    const p = (await headersFor("production"))["Permissions-Policy"];
    for (const f of ["camera=()", "microphone=()", "geolocation=()", "payment=()", "usb=()"]) expect(p).toContain(f);
    // Salin ke clipboard harus tetap berjalan.
    expect(p).not.toContain("clipboard-write");
  });

  describe("CSP", () => {
    const directive = async (name: string) => {
      const csp = (await headersFor("production"))["Content-Security-Policy"];
      const part = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + " ") || s === name);
      return part ?? null;
    };

    it("melarang di-embed situs lain, objek, dan base URI luar", async () => {
      expect(await directive("frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(await directive("object-src")).toBe("object-src 'none'");
      expect(await directive("base-uri")).toBe("base-uri 'self'");
      expect(await directive("form-action")).toBe("form-action 'self'");
    });

    it("membatasi script ke asal sendiri tanpa eval dan tanpa host luar", async () => {
      const s = (await directive("script-src"))!;
      expect(s).toContain("'self'");
      expect(s).not.toContain("'unsafe-eval'");
      expect(s).not.toMatch(/https?:/);
      expect(s).not.toContain("*");
    });

    it("membatasi koneksi jaringan ke asal sendiri", async () => {
      expect(await directive("connect-src")).toBe("connect-src 'self'");
    });

    it("mengizinkan Google Fonts, gambar https dan data, dan tidak lebih dari itu", async () => {
      expect(await directive("style-src")).toContain("https://fonts.googleapis.com");
      expect(await directive("font-src")).toContain("https://fonts.gstatic.com");
      const img = (await directive("img-src"))!;
      expect(img).toContain("https:");
      expect(img).toContain("data:");
      expect(img).not.toContain("http:");
    });

    it("tidak mengizinkan semua sumber lewat wildcard di default-src", async () => {
      expect(await directive("default-src")).toBe("default-src 'self'");
    });
  });
});

describe("header keamanan dev", () => {
  it("tidak memasang CSP di mode dev karena HMR butuh eval, header lain tetap ada", async () => {
    const h = await headersFor("development");
    expect(h["Content-Security-Policy"]).toBeUndefined();
    expect(h["X-Frame-Options"]).toBe("DENY");
  });
});
