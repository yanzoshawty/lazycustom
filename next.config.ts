import type { NextConfig } from "next";

/**
 * Header keamanan.
 *
 * CSP memakai 'unsafe-inline' untuk script dan style karena Next.js menyisipkan skrip bootstrap dan
 * gaya inline, dan iframe preview (srcdoc) mewarisi kebijakan halaman induknya. Nonce per permintaan
 * akan mengharuskan semua halaman dirender dinamis. Yang tetap dibatasi ketat: host script, objek,
 * form, base URI, embed oleh situs lain, dan koneksi jaringan. Gambar boleh dari https mana pun karena
 * user memasukkan link gambar sendiri. CSP hanya dipasang di produksi karena mode dev butuh eval.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Tidak mengirim alamat halaman ke host gambar milik user.
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    ];
    if (process.env.NODE_ENV === "production") headers.push({ key: "Content-Security-Policy", value: csp });
    return [{ source: "/(.*)", headers }];
  },
};

export default nextConfig;
