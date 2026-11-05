"use client";

import { useEffect, useRef } from "react";

/**
 * Latar balon chat melayang: motif produk (balon pesan) sebagai gerak latar, atas permintaan pemilik.
 * Canvas 2D di belakang konten, tidak menangkap klik, disembunyikan dari pembaca layar.
 * - Balon naik pelan sambil bergoyang, lalu muncul lagi dari bawah.
 * - Kursor menggeser balon sedikit sesuai kedalamannya (paralaks), dihaluskan supaya tidak menyentak.
 * - Berhenti saat tab tidak terlihat. Gerak minimal: digambar sekali, diam.
 * Tidak menyentuh state React di loop animasi.
 */

type Variant = "vivid" | "dim";

interface Bubble {
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number; // 0.3 (jauh) sampai 1 (dekat)
  speed: number;
  phase: number;
  sway: number;
  tilt: number;
  color: number;
  tailLeft: boolean;
}

// Pink aksen, mint, dan lavender: tiga warna yang juga dipakai template contoh di halaman utama.
const LIGHT = ["207, 26, 105", "52, 178, 132", "132, 102, 230"];
const DARK = ["255, 111, 171", "94, 214, 170", "170, 148, 255"];

const ALPHA: Record<Variant, { light: number; dark: number }> = {
  vivid: { light: 0.13, dark: 0.12 },
  dim: { light: 0.08, dark: 0.07 },
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeBubble(width: number, height: number, anywhere: boolean): Bubble {
  const depth = rand(0.3, 1);
  const w = rand(70, 170) * (0.55 + depth * 0.6);
  return {
    x: rand(-w * 0.3, width - w * 0.7),
    y: anywhere ? rand(-40, height) : height + rand(20, 160),
    w,
    h: w * rand(0.42, 0.6),
    depth,
    speed: rand(9, 20) * (0.4 + depth),
    phase: rand(0, Math.PI * 2),
    sway: rand(8, 26),
    tilt: rand(-0.12, 0.12),
    color: Math.floor(Math.random() * 3),
    tailLeft: Math.random() < 0.6,
  };
}

/** Balon dengan tiga sudut bulat dan ekor di satu sudut bawah, seperti logo dan motif UI. */
function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble, x: number, y: number) {
  const r = Math.min(b.h * 0.42, 26);
  const { w, h } = b;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(b.tilt);
  ctx.translate(-w / 2, -h / 2);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  if (b.tailLeft) {
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r * 1.4, h);
    ctx.lineTo(0, h + h * 0.32);
    ctx.lineTo(r * 0.5, h - r * 0.4);
    ctx.lineTo(0, h - r);
  } else {
    ctx.lineTo(w, h - r);
    ctx.lineTo(w - r * 0.5, h - r * 0.4);
    ctx.lineTo(w, h + h * 0.32);
    ctx.lineTo(w - r * 1.4, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
  }
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function BubbleField({ variant = "vivid" }: { variant?: Variant }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let bubbles: Bubble[] = [];
    let raf = 0;
    let last = 0;
    let t = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const isDark = () => document.documentElement.classList.contains("dark");

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Kepadatan mengikuti luas layar, dibatasi supaya HP tetap ringan.
      const base = variant === "dim" ? 7 : 12;
      const count = Math.max(5, Math.min(base + 6, Math.round((width * height) / (variant === "dim" ? 160_000 : 95_000))));
      bubbles = Array.from({ length: count }, () => makeBubble(width, height, true)).sort((a, b) => a.depth - b.depth);
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const dark = isDark();
      const colors = dark ? DARK : LIGHT;
      const alpha = ALPHA[variant][dark ? "dark" : "light"];
      for (const b of bubbles) {
        const px = pointer.x * 18 * b.depth;
        const py = pointer.y * 12 * b.depth;
        const x = b.x + Math.sin(t * 0.35 + b.phase) * b.sway + px;
        ctx!.fillStyle = `rgba(${colors[b.color]}, ${(alpha * (0.55 + b.depth * 0.6)).toFixed(3)})`;
        drawBubble(ctx!, b, x, b.y + py);
      }
    }

    function frame(now: number) {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      t += dt;
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.speed * dt;
        if (b.y + b.h * 1.4 < -30) bubbles[i] = makeBubble(width, height, false);
      }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (reduce || raf || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    const onResize = () => {
      resize();
      draw();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointer.tx = e.clientX / width - 0.5;
      pointer.ty = e.clientY / height - 0.5;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    // Tema berganti saat animasi diam (gerak minimal) tetap harus menggambar ulang warnanya.
    const themeObserver = new MutationObserver(() => draw());

    resize();
    draw();
    start();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      themeObserver.disconnect();
    };
  }, [variant]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
