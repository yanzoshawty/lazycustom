"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, GithubLogo } from "@phosphor-icons/react";
import type { SendKind } from "@/lib/design/preview-doc";
import { TEMPLATES } from "@/lib/design/templates";
import { Logo } from "../Logo";
import ScrollReveal from "../reactbits/ScrollReveal";
import SplitText from "../reactbits/SplitText";
import { Thumb } from "../TemplatesPanel";
import { ThemeToggle } from "../ThemeToggle";
import { demoDesign } from "./demo-design";
import { LivePreview } from "./LivePreview";
import { SmoothScroll } from "./SmoothScroll";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const REPO = "https://github.com/yanzoshawty/lazycustom";

/** Satu label untuk satu niat: semua ajakan membuka editor memakai teks yang sama. */
const CTA_LABEL = "Buka editor";

const primaryCta =
  "bubble-tail inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap bg-accent px-6 text-base font-semibold text-on-accent transition hover:brightness-110 active:translate-y-px";
const secondaryCta =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-field border border-line-strong bg-surface px-6 text-base font-semibold text-ink transition hover:border-accent hover:text-accent active:translate-y-px";

const STEPS: Array<{ kind: SendKind; title: string; body: string }> = [
  { kind: "viewer", title: "Satu desain untuk semua pesan", body: "Atur font, warna, bentuk bubble, dan animasi sekali. Semua pesan ikut desain Default ini." },
  { kind: "member", title: "Member", body: "Beri member bubble sendiri, misalnya hijau mint dengan bayangan pink, supaya dukungan mereka kelihatan." },
  { kind: "verified", title: "Verified", body: "Channel bercentang bisa punya warna nama dan bubble sendiri. Atributnya belum terkonfirmasi di chat YouTube, jadi cek sekali di OBS." },
  { kind: "moderator", title: "Moderator", body: "Pengingat dari moderator langsung terbaca karena bentuknya beda dari chat biasa." },
  { kind: "owner", title: "Owner", body: "Pesanmu sendiri tampil paling menonjol, dengan bubble, label, dan gambar pilihanmu." },
  { kind: "superchat", title: "Super Chat, Membership, Sticker", body: "Kartu berbayar punya pengaturan sendiri: ikut warna tier YouTube atau warna pilihanmu." },
];

const INSTALL: Array<{ title: string; body: string }> = [
  { title: "Desain di editor", body: "Mulai dari template atau dari nol. Klik bubble di preview untuk mengedit peran itu." },
  { title: "Salin CSS", body: "Satu tombol menyalin CSS lengkap, termasuk gambar yang kamu unggah." },
  { title: "Tambah Browser Source", body: "Di OBS, tambah Browser lalu tempel link chat popout dari live YouTube-mu." },
  { title: "Tempel di Custom CSS", body: "Hapus isi kolom Custom CSS di Browser Source, tempel, lalu klik OK." },
];

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <nav aria-label="Navigasi utama" className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" aria-label="Lazycustom Livechat, halaman utama" className="mr-auto inline-flex h-11 items-center rounded-field">
          <Logo compact />
        </Link>
        <a href="#peran" className="hidden h-11 items-center rounded-field px-3 text-sm font-semibold text-ink-2 transition hover:text-accent md:inline-flex">
          Per peran
        </a>
        <a href="#template" className="hidden h-11 items-center rounded-field px-3 text-sm font-semibold text-ink-2 transition hover:text-accent md:inline-flex">
          Template
        </a>
        <a href="#pasang" className="hidden h-11 items-center rounded-field px-3 text-sm font-semibold text-ink-2 transition hover:text-accent md:inline-flex">
          Cara pasang
        </a>
        <ThemeToggle />
        <Link href="/editor" className="bubble-tail-sm inline-flex h-11 items-center bg-accent px-4 text-sm font-semibold text-on-accent transition hover:brightness-110 active:translate-y-px">
          {CTA_LABEL}
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  const root = useRef<HTMLElement>(null);
  const design = useMemo(() => demoDesign(), []);

  // Urutan masuk: judul (SplitText), lalu produk dan penjelasannya. Tombol aksi sengaja tidak dianimasikan
  // supaya selalu terlihat dan bisa diklik sejak frame pertama.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { duration: 0.7, ease: "power3.out" } });
        tl.from(".hero-preview", { y: 32, autoAlpha: 0, scale: 0.97, duration: 0.9 }, 0.15)
          .from(".hero-sub", { y: 16, autoAlpha: 0 }, 0.45);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="hero-title" className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:pt-16 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14 lg:pb-20">
      <div className="grid gap-6">
        <h1 id="hero-title" className="font-display text-[clamp(2.4rem,5.2vw,4.4rem)] font-bold leading-[1.04] tracking-tight text-ink">
          <SplitText text="Chat live YouTube yang terasa punyamu sendiri" tag="span" splitType="words" effect="rise" delay={60} duration={0.9} textAlign="left" trigger="load" className="block" />
        </h1>
        <p className="hero-sub max-w-[46ch] text-lg leading-relaxed text-ink-2">
          Desain bubble untuk viewer, member, moderator, sampai owner. Salin CSS-nya, tempel di OBS. Gratis dan tanpa akun.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/editor" className={primaryCta}>
            {CTA_LABEL}
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
          <a href="#pasang" className={secondaryCta}>
            Lihat cara pasang
          </a>
        </div>
      </div>
      <figure className="hero-preview grid gap-3">
        <LivePreview design={design} title="Simulasi chat dengan desain contoh" className="bubble-tail lift h-[380px] border border-line sm:h-[460px] lg:h-[560px]" />
        <figcaption className="text-sm text-ink-3">Simulasi chat: template Sticker dengan bubble khusus per peran. Semuanya bisa kamu atur di editor.</figcaption>
      </figure>
    </section>
  );
}

function Roles() {
  const root = useRef<HTMLElement>(null);
  const design = useMemo(() => demoDesign(), []);
  const [active, setActive] = useState(0);

  // Setiap langkah yang melewati garis tengah layar memilih jenis pesan yang tampil di preview: cerita peran
  // dibaca sambil melihat bubble-nya berubah. Ini perpindahan state, bukan animasi, jadi tetap jalan
  // saat gerak minimal.
  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".role-step").forEach((el, i) => {
        ScrollTrigger.create({ trigger: el, start: "top center", end: "bottom center", onToggle: (self) => self.isActive && setActive(i) });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="peran" aria-labelledby="peran-title" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        {/* Di layar sempit kolom ini dibuka (contents) supaya preview bisa menempel sepanjang daftar peran. */}
        <div className="max-lg:contents lg:sticky lg:top-24 lg:self-start">
          <h2 id="peran-title" className="font-display text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
            Satu desain global, bubble khusus per peran
          </h2>
          <div className="sticky top-16 z-10 -mx-4 bg-surface px-4 pb-3 pt-2 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-6 lg:p-0">
            <LivePreview
              design={design}
              focus={STEPS[active].kind}
              title={`Simulasi chat: ${STEPS[active].title}`}
              className="bubble-tail h-[220px] border border-line sm:h-[300px] lg:h-[420px]"
            />
          </div>
        </div>
        <ol className="grid gap-4 lg:pt-[30vh] lg:pb-[30vh]">
          {STEPS.map((s, i) => (
            <li key={s.kind} className="role-step grid gap-2 py-6 md:py-10" aria-current={i === active ? "step" : undefined}>
              <h3 className={`font-display text-2xl font-semibold tracking-tight transition-colors duration-300 md:text-3xl ${i === active ? "text-accent" : "text-ink"}`}>{s.title}</h3>
              <p className={`max-w-[52ch] text-lg leading-relaxed transition-colors duration-300 ${i === active ? "text-ink" : "text-ink-3"}`}>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section aria-label="Kenapa dibuat" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 md:py-28">
      <ScrollReveal
        baseOpacity={0.15}
        enableBlur={false}
        baseRotation={0}
        containerClassName="my-0"
        textClassName="!text-[clamp(1.6rem,3.6vw,2.75rem)] !leading-[1.3] !font-semibold tracking-tight text-ink font-display"
      >
        Custom CSS berbayar sering di luar jangkauan streamer yang masih menabung. Lazycustom Livechat dibuat supaya siapa pun bisa punya chat overlay yang rapi tanpa keluar uang.
      </ScrollReveal>
    </section>
  );
}

function Templates() {
  return (
    <section id="template" aria-labelledby="template-title" className="scroll-mt-16 border-t border-line py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:px-6">
        <h2 id="template-title" className="font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
          {TEMPLATES.length} template untuk mulai
        </h2>
        <p className="max-w-[56ch] text-lg text-ink-2">Pilih satu, lalu ubah sesukamu. Setiap kartu membuka editor dengan desain baru dari template itu.</p>
      </div>
      {/* Padding mengikuti tepi kontainer max-w-7xl supaya kartu pertama sejajar dengan judul. */}
      <ul className="mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto pb-4" style={{ paddingInline: "max(1rem, calc((100% - 80rem) / 2 + 1.5rem))" }}>
        {TEMPLATES.map((t) => (
          <li key={t.id} className="w-[260px] shrink-0 snap-start sm:w-[300px]">
            <Link
              href={`/editor?template=${t.id}`}
              className="bubble-tail group grid h-full content-start gap-3 border border-line bg-surface p-3 transition hover:border-accent"
            >
              <Thumb design={t.design} className="h-[132px] rounded-[14px]" />
              <span className="grid gap-0.5 px-1">
                <span className="font-display text-lg font-semibold text-ink group-hover:text-accent">{t.name}</span>
                <span className="line-clamp-2 text-sm text-ink-2">{t.tagline}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Install() {
  return (
    <section id="pasang" aria-labelledby="pasang-title" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="grid content-start gap-4">
          <h2 id="pasang-title" className="font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
            Cara pasang di OBS
          </h2>
          <p className="max-w-[44ch] text-lg text-ink-2">Sekali saja. Setelah itu cukup salin ulang CSS setiap kali desainnya kamu ubah.</p>
        </div>
        <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {INSTALL.map((s, i) => (
            <li key={s.title} className="grid content-start gap-3">
              <span aria-hidden="true" className="bubble-tail-sm grid size-11 place-items-center bg-accent-soft font-display text-lg font-bold text-accent">
                {i + 1}
              </span>
              <h3 className="font-display text-xl font-semibold text-ink">{s.title}</h3>
              <p className="text-ink-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section aria-labelledby="closing-title" className="mx-auto grid max-w-7xl justify-items-start gap-8 px-4 py-24 sm:px-6 md:py-32">
      <h2 id="closing-title" className="max-w-[16ch] font-display text-[clamp(2.4rem,6vw,5rem)] font-bold leading-[1.02] tracking-tight text-ink">
        Mulai dari template, selesai di OBS.
      </h2>
      <Link href="/editor" className={primaryCta}>
        {CTA_LABEL}
        <ArrowRight size={18} weight="bold" aria-hidden="true" />
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm text-ink-2 sm:px-6">
        <Logo />
        <span className="mr-auto">Gratis, tanpa akun, desain tersimpan di browsermu sendiri.</span>
        <a href={REPO} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 font-semibold text-ink transition hover:text-accent">
          <GithubLogo size={18} weight="bold" aria-hidden="true" />
          Kode sumber
        </a>
        <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center font-semibold text-ink transition hover:text-accent">
          Lisensi MIT
        </a>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <>
      <SmoothScroll />
      <Nav />
      <main className="w-full max-w-full overflow-x-clip">
        <Hero />
        <Roles />
        <Why />
        <Templates />
        <Install />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
