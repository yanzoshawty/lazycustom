"use client";

import { useCallback, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { LogoMark } from "../Logo";
import { INTRO_KEY } from "./intro-boot";

gsap.registerPlugin(useGSAP);

const LINES = [
  { text: "Halo! Baru mulai streaming?", side: "left" },
  { text: "Chat-nya mau dibikin beda per peran", side: "right" },
  { text: "Tinggal desain, salin, tempel di OBS", side: "left" },
] as const;

/**
 * Intro singkat: tiga balon chat muncul seperti percakapan, lalu nama produk, lalu lapisan naik membuka halaman.
 * Urutan memakai satu timeline dengan label supaya waktunya mudah diatur. Bisa dilewati (tombol atau Escape).
 */
export function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Tanpa sessionStorage intro bisa tampil lagi di kunjungan berikutnya. Tidak apa-apa.
    }
    document.documentElement.classList.remove("intro-pending");
  }, []);

  const skip = useCallback(() => {
    if (tl.current && tl.current.progress() < 1) tl.current.seek("exit").play();
    else finish();
  }, [finish]);

  useGSAP(
    () => {
      if (!document.documentElement.classList.contains("intro-pending")) return;
      const t = gsap.timeline({ defaults: { ease: "back.out(1.6)", duration: 0.45 }, onComplete: finish });
      t.from(".intro-mark", { scale: 0.4, autoAlpha: 0, duration: 0.5 })
        .addLabel("bubbles", "+=0.05")
        .from(".intro-bubble", { y: 18, scale: 0.85, autoAlpha: 0, stagger: 0.32 }, "bubbles")
        .addLabel("brand", "+=0.15")
        .from(".intro-brand", { y: 14, autoAlpha: 0, duration: 0.5, ease: "power3.out" }, "brand")
        .addLabel("exit", "+=0.55")
        .to(".intro-stage", { y: -24, autoAlpha: 0, duration: 0.35, ease: "power2.in" }, "exit")
        .to(root.current, { yPercent: -100, duration: 0.6, ease: "power3.inOut" }, "exit+=0.15");
      tl.current = t;
    },
    { scope: root },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.documentElement.classList.contains("intro-pending")) skip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [skip]);

  return (
    <div ref={root} className="intro-overlay fixed inset-0 z-50 hidden flex-col items-center justify-center bg-bg px-4" role="presentation">
      <div className="intro-stage grid w-full max-w-sm gap-3" aria-hidden="true">
        <div className="intro-mark mx-auto">
          <LogoMark size={56} />
        </div>
        <ul className="mt-4 grid gap-2.5">
          {LINES.map((l) => (
            <li
              key={l.text}
              className={`intro-bubble w-fit max-w-[85%] px-4 py-2.5 text-base font-semibold ${
                l.side === "left" ? "bubble-tail border border-line bg-surface text-ink" : "ml-auto rounded-[20px_20px_6px_20px] bg-accent text-on-accent"
              }`}
            >
              {l.text}
            </li>
          ))}
        </ul>
        <p className="intro-brand mt-6 text-center font-display text-3xl tracking-tight text-ink">
          <span className="font-bold">Lazycustom</span> <span className="font-medium text-ink-2">Livechat</span>
        </p>
      </div>
      <button
        type="button"
        onClick={skip}
        className="absolute bottom-6 right-4 inline-flex h-11 items-center rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent sm:right-6"
      >
        Lewati intro
      </button>
    </div>
  );
}
