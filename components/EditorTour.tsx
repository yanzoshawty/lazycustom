"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const TOUR_KEY = "lc-tour-done";

interface Step {
  /** Selector kandidat, dipakai yang pertama terlihat (misalnya kolom Properties di layar lebar, tab Properties di HP). */
  targets: string[];
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    targets: ['[data-tour="preview"]'],
    title: "Preview chat",
    body: "Chat contoh bergerak seperti live. Klik bubble atau nama mana pun untuk langsung mengedit bagian itu.",
  },
  {
    targets: ["#tab-roles"],
    title: "Desain global dan per peran",
    body: "Desain Default berlaku untuk semua pesan. Di tab Roles, beri Member, Verified, Moderator, atau Owner bubble sendiri.",
  },
  {
    targets: ["#panel-properties", "#tab-properties"],
    title: "Properties",
    body: "Pengaturan detail ada di sini: warna, bentuk, dekorasi, gambar, dan animasi bagian yang sedang dipilih.",
  },
  {
    targets: ['[data-tour="copy"]'],
    title: "Salin CSS",
    body: "Selesai mendesain? Satu klik menyalin CSS lengkap untuk OBS.",
  },
  {
    targets: ["#export"],
    title: "Pasang di OBS",
    body: "Ikuti empat langkah di sini: salin CSS, buat link chat, tambah Browser Source, tempel di Custom CSS.",
  },
];

function visibleTarget(selectors: string[]): HTMLElement | null {
  for (const s of selectors) {
    const el = document.querySelector<HTMLElement>(s);
    if (el && el.getClientRects().length > 0 && el.offsetParent !== null) return el;
  }
  return null;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Tur singkat editor. Tidak mengunci halaman (aria-modal false, sorotan tidak menangkap klik), jadi user bisa
 * langsung mencoba sambil membaca. Posisi memakai koordinat dokumen, jadi tidak perlu mendengarkan scroll.
 */
export function EditorTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [pop, setPop] = useState<{ top: number; left: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const close = useCallback(() => {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      // Tanpa localStorage tur bisa muncul lagi di kunjungan berikutnya.
    }
    onClose();
  }, [onClose]);

  const place = useCallback(() => {
    const el = visibleTarget(step.targets);
    const cardEl = card.current;
    if (!el || !cardEl) {
      setBox(null);
      setPop(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const sx = window.scrollX;
    const sy = window.scrollY;
    const pad = 6;
    setBox({ top: r.top + sy - pad, left: r.left + sx - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
    const cw = cardEl.offsetWidth;
    const ch = cardEl.offsetHeight;
    const gap = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clampX = (x: number) => Math.min(Math.max(12, x), vw - cw - 12);
    const clampY = (y: number) => Math.min(Math.max(12, y), vh - ch - 12);
    let top: number;
    let left: number;
    if (r.bottom + gap + ch <= vh) {
      top = r.bottom + gap;
      left = clampX(r.left + r.width / 2 - cw / 2);
    } else if (r.top - gap - ch >= 0) {
      top = r.top - gap - ch;
      left = clampX(r.left + r.width / 2 - cw / 2);
    } else {
      // Target setinggi layar (Preview, kolom Properties): taruh di samping yang lebih lega supaya
      // kontrol di dalam target tetap terlihat. Tidak muat di samping: di bagian bawah target.
      const roomRight = vw - r.right - gap;
      const roomLeft = r.left - gap;
      top = clampY(Math.max(r.top, 12) + 24);
      if (roomRight >= cw + 12 || roomLeft >= cw + 12) left = roomRight >= roomLeft ? r.right + gap : r.left - gap - cw;
      else {
        left = clampX(r.left + r.width / 2 - cw / 2);
        top = clampY(Math.min(r.bottom, vh) - ch - 12);
      }
    }
    setPop({ top: top + sy, left: left + sx });
  }, [step]);

  // Gulir target ke tengah layar sekali per langkah, lalu ukur. Instan supaya ukuran langsung benar.
  useLayoutEffect(() => {
    const el = visibleTarget(step.targets);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: r.height > window.innerHeight ? "start" : "center", behavior: "auto" });
    }
    place();
  }, [step, place]);

  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("resize", place);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("keydown", onKey);
    };
  }, [place, close]);

  return (
    <>
      {box ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-40 rounded-panel ring-4 ring-accent transition-all duration-300"
          style={{ ...box, boxShadow: "0 0 0 100vmax rgba(20, 12, 30, 0.35)" }}
        />
      ) : null}
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={`bubble-tail lift z-50 grid w-[min(340px,calc(100vw-24px))] gap-3 border border-line bg-surface p-5 ${pop ? "absolute" : "fixed bottom-6 left-1/2 -translate-x-1/2"}`}
        style={pop ?? undefined}
      >
        <p className="text-xs font-semibold text-ink-3">
          Langkah {index + 1} dari {STEPS.length}
        </p>
        <h2 id="tour-title" className="font-display text-lg font-bold text-ink">
          {step.title}
        </h2>
        <p id="tour-body" className="text-sm text-ink-2">
          {step.body}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <button type="button" onClick={close} className="mr-auto inline-flex h-11 items-center rounded-field px-2 text-sm font-semibold text-ink-2 transition hover:text-accent">
            Lewati
          </button>
          {index > 0 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              className="inline-flex h-11 items-center rounded-field border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              Kembali
            </button>
          ) : null}
          <button
            ref={primary}
            type="button"
            onClick={() => (last ? close() : setIndex((i) => i + 1))}
            className="bubble-tail-sm inline-flex h-11 items-center bg-accent px-5 text-sm font-semibold text-on-accent transition hover:brightness-110 active:scale-95"
          >
            {last ? "Mulai mendesain" : "Lanjut"}
          </button>
        </div>
      </div>
    </>
  );
}
