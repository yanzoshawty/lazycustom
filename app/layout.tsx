import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: "lazycustom: desain chat live YouTube tanpa nulis kode",
  description:
    "Desain sendiri chat live YouTube-mu dengan editor visual atau mulai dari template, lalu salin CSS-nya ke OBS.",
};

export const viewport: Viewport = {
  themeColor: "#101317",
};

// Jalan sebelum halaman tampil supaya tidak berkedip. Bawaannya gelap, sesuai identitas visual lazycustom.
const themeScript = `(function(){try{var t=localStorage.getItem('lc-theme');var d=t?t==='dark':true;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
