import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/outfit";
import "./globals.css";

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
    <html lang="id" className={GeistMono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
