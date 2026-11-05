import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Outfit lewat next/font: di-preload dan diberi font cadangan berukuran sama, jadi pertukaran font tidak
// menggeser layout. Subset latin cukup untuk teks antarmuka; chat di preview memuat fontnya sendiri.
const outfit = localFont({
  src: "../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lazycustom Livechat: desain chat live YouTube untuk OBS",
  description:
    "Desain bubble chat live YouTube per peran, dari viewer sampai owner, lalu tempel CSS-nya ke OBS. Gratis, tanpa akun.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9fe" },
    { media: "(prefers-color-scheme: dark)", color: "#15111c" },
  ],
};

// Jalan sebelum halaman tampil supaya tidak berkedip. Pilihan user menang, kalau belum ada ikut tema sistem.
const themeScript = `(function(){try{var t=localStorage.getItem('lc-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${outfit.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
