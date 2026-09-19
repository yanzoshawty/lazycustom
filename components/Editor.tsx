"use client";

import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { contrastRatio } from "@/lib/color";
import { copyText } from "@/lib/clipboard";
import { generateCss } from "@/lib/css";
import { FONT_IDS, FONTS } from "@/lib/fonts";
import { presetById } from "@/lib/presets";
import { report } from "@/lib/report";
import { settingsEqual, type Settings } from "@/lib/settings";
import { settingsStore } from "@/lib/store";
import { BackupPanel } from "./BackupPanel";
import { ErrorNotice } from "./ErrorNotice";
import { Logo } from "./Logo";
import { CopyButton, OutputPanel, type CopyState } from "./OutputPanel";
import { PresetPicker } from "./PresetPicker";
import { Preview } from "./Preview";
import { ThemeToggle } from "./ThemeToggle";
import { ToastProvider, useToast } from "./Toaster";
import { ColorField, Group, Hint, Segmented, SelectField, SliderField, ToggleField } from "./controls";

const TABS = [
  { id: "tema", label: "Tema" },
  { id: "teks", label: "Teks" },
  { id: "bubble", label: "Bubble" },
  { id: "elemen", label: "Elemen" },
  { id: "animasi", label: "Animasi" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const WEIGHT_OPTIONS = [
  { value: 400 as const, label: "Normal" },
  { value: 500 as const, label: "Sedang" },
  { value: 600 as const, label: "Agak tebal" },
  { value: 700 as const, label: "Tebal" },
];

function useSettings() {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot, settingsStore.getServerSnapshot);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Editor() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <EditorScreen />
      </ToastProvider>
    </MotionConfig>
  );
}

function EditorScreen() {
  const { settings, issue, issueRef } = useSettings();
  const deferred = useDeferredValue(settings);
  const css = useMemo(() => generateCss(deferred), [deferred]);
  const toast = useToast();

  const [tab, setTab] = useState<TabId>("tema");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [copyRef, setCopyRef] = useState<string | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const baseId = useId();

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const preset = presetById(settings.presetId);
  const modified = !settingsEqual(settings, preset.settings);
  const lowContrast =
    settings.bubble.show && settings.bubble.opacity >= 60 && contrastRatio(settings.textColor, settings.bubble.color) < 3;

  function selectCode() {
    const el = codeRef.current;
    if (!el) return;
    // Fokus dulu, baru seleksi: di sebagian browser fokus bisa mengosongkan seleksi yang sudah ada.
    el.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  async function copyCss() {
    clearTimeout(resetTimer.current);
    try {
      await copyText(css);
      setCopyRef(null);
      setCopyState("copied");
      resetTimer.current = setTimeout(() => setCopyState("idle"), 2400);
    } catch (error) {
      setCopyRef(report({ code: "COPY_BLOCKED", error, level: "warn", context: { what: "css" } }));
      setCopyState("failed");
      selectCode();
    }
  }

  const update = settingsStore.update;
  const setBubble = (p: Partial<Settings["bubble"]>) => update((s) => ({ ...s, bubble: { ...s.bubble, ...p } }));
  const setAvatar = (p: Partial<Settings["avatar"]>) => update((s) => ({ ...s, avatar: { ...s.avatar, ...p } }));
  const setNames = (p: Partial<Settings["names"]>) => update((s) => ({ ...s, names: { ...s.names, ...p } }));
  const setPanel = (p: Partial<Settings["panel"]>) => update((s) => ({ ...s, panel: { ...s.panel, ...p } }));

  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const index = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? TABS.length - 1
          : (index + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    document.getElementById(`${baseId}-tab-${TABS[next].id}`)?.focus();
  }

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 pb-16 sm:px-6 lg:px-8">
      <header className="flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <CopyButton state={copyState} onCopy={copyCss} />
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pb-6 pt-4 lg:pb-6 lg:pt-6"
      >
        <h1 className="max-w-[20ch] text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-5xl">
          Bikin chat live <span className="whitespace-nowrap">YouTube-mu</span> tampil beda
        </h1>
        <p className="mt-3 max-w-[52ch] text-base text-ink-2">Pilih tema, atur sampai pas, lalu salin CSS-nya ke OBS.</p>
      </motion.div>

      {issue ? (
        <div className="mb-5">
          <ErrorNotice code={issue} refId={issueRef} onDismiss={settingsStore.dismissIssue} />
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 z-10 -mx-4 bg-bg px-4 pb-2 pt-2 sm:-mx-6 sm:px-6 lg:top-4 lg:mx-0 lg:bg-transparent lg:p-0"
        >
          <Preview css={css} animationKey={settings.animation} />
        </motion.div>

        <motion.section
          aria-label="Pengaturan tampilan chat"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-panel border border-line bg-surface"
        >
          <div
            role="tablist"
            aria-label="Kelompok pengaturan"
            onKeyDown={onTabKeyDown}
            className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-2"
          >
            {TABS.map((t) => {
              const selected = t.id === tab;
              return (
                <button
                  key={t.id}
                  id={`${baseId}-tab-${t.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    selected ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                role="tabpanel"
                id={`${baseId}-panel-${tab}`}
                aria-labelledby={`${baseId}-tab-${tab}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="grid gap-6"
              >
                {tab === "tema" ? (
                  <PresetPicker
                    value={settings.presetId}
                    modified={modified}
                    onPick={(id) => settingsStore.set(presetById(id).settings)}
                  />
                ) : null}

                {tab === "teks" ? (
                  <>
                    {lowContrast ? (
                      <Hint>Warna teks dan bubble terlalu mirip, jadi pesan bisa sulit dibaca. Coba warna yang lebih kontras.</Hint>
                    ) : null}
                    <Group>
                      <SelectField
                        label="Font"
                        value={settings.font}
                        options={FONT_IDS.map((id) => ({ value: id, label: `${FONTS[id].label} (${FONTS[id].hint.toLowerCase()})` }))}
                        onChange={(font) => update((s) => ({ ...s, font }))}
                      />
                      <SliderField
                        label="Ukuran teks"
                        value={settings.fontSize}
                        min={12}
                        max={36}
                        unit=" px"
                        onChange={(fontSize) => update((s) => ({ ...s, fontSize }))}
                      />
                      <Segmented
                        label="Ketebalan pesan"
                        value={settings.weight}
                        options={WEIGHT_OPTIONS}
                        onChange={(weight) => update((s) => ({ ...s, weight }))}
                      />
                      <Segmented
                        label="Ketebalan nama"
                        value={settings.nameWeight}
                        options={WEIGHT_OPTIONS}
                        onChange={(nameWeight) => update((s) => ({ ...s, nameWeight }))}
                      />
                    </Group>
                    <Group title="Warna">
                      <ColorField label="Warna pesan" value={settings.textColor} onChange={(textColor) => update((s) => ({ ...s, textColor }))} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <ColorField label="Nama penonton" value={settings.names.viewer} onChange={(viewer) => setNames({ viewer })} />
                        <ColorField label="Nama member" value={settings.names.member} onChange={(member) => setNames({ member })} />
                        <ColorField label="Nama moderator" value={settings.names.moderator} onChange={(moderator) => setNames({ moderator })} />
                        <ColorField label="Nama pemilik channel" value={settings.names.owner} onChange={(owner) => setNames({ owner })} />
                      </div>
                    </Group>
                    <Group title="Bentuk teks">
                      <Segmented
                        label="Tepi teks"
                        value={settings.edge}
                        options={[
                          { value: "none" as const, label: "Tanpa" },
                          { value: "soft" as const, label: "Lembut" },
                          { value: "outline" as const, label: "Garis" },
                        ]}
                        onChange={(edge) => update((s) => ({ ...s, edge }))}
                      />
                      <Segmented
                        label="Susunan"
                        value={settings.layout}
                        options={[
                          { value: "inline" as const, label: "Sebaris" },
                          { value: "stacked" as const, label: "Nama di atas" },
                        ]}
                        onChange={(layout) => update((s) => ({ ...s, layout }))}
                      />
                    </Group>
                  </>
                ) : null}

                {tab === "bubble" ? (
                  <>
                    {lowContrast ? (
                      <Hint>Warna teks dan bubble terlalu mirip, jadi pesan bisa sulit dibaca. Coba warna yang lebih kontras.</Hint>
                    ) : null}
                    <ToggleField
                      label="Pakai bubble"
                      hint="Latar di belakang tiap pesan"
                      checked={settings.bubble.show}
                      onChange={(show) => setBubble({ show })}
                    />
                    {settings.bubble.show ? (
                      <Group>
                        <ColorField label="Warna bubble" value={settings.bubble.color} onChange={(color) => setBubble({ color })} />
                        <SliderField label="Kepekatan" value={settings.bubble.opacity} min={0} max={100} unit="%" onChange={(opacity) => setBubble({ opacity })} />
                        <SliderField label="Kebulatan sudut" value={settings.bubble.radius} min={0} max={28} unit=" px" onChange={(radius) => setBubble({ radius })} />
                        <SliderField label="Ruang dalam" value={settings.bubble.padding} min={4} max={20} unit=" px" onChange={(padding) => setBubble({ padding })} />
                        <SliderField label="Tebal garis tepi" value={settings.bubble.borderWidth} min={0} max={6} unit=" px" onChange={(borderWidth) => setBubble({ borderWidth })} />
                        {settings.bubble.borderWidth > 0 ? (
                          <ColorField label="Warna garis tepi" value={settings.bubble.borderColor} onChange={(borderColor) => setBubble({ borderColor })} />
                        ) : null}
                        <Segmented
                          label="Bayangan"
                          value={settings.bubble.shadow}
                          options={[
                            { value: "none" as const, label: "Tanpa" },
                            { value: "soft" as const, label: "Lembut" },
                            { value: "hard" as const, label: "Keras" },
                          ]}
                          onChange={(shadow) => setBubble({ shadow })}
                        />
                        {settings.bubble.shadow !== "none" ? (
                          <ColorField label="Warna bayangan" value={settings.bubble.shadowColor} onChange={(shadowColor) => setBubble({ shadowColor })} />
                        ) : null}
                        <ToggleField
                          label="Semburat warna sesuai peran"
                          hint="Pesan pemilik, moderator, dan member diberi warna tipis sesuai warna namanya"
                          checked={settings.bubble.roleTint}
                          onChange={(roleTint) => setBubble({ roleTint })}
                        />
                      </Group>
                    ) : null}
                    <SliderField
                      label="Jarak antar pesan"
                      value={settings.gap}
                      min={0}
                      max={24}
                      unit=" px"
                      onChange={(gap) => update((s) => ({ ...s, gap }))}
                    />
                  </>
                ) : null}

                {tab === "elemen" ? (
                  <>
                    <Group title="Foto profil">
                      <ToggleField label="Tampilkan foto profil" checked={settings.avatar.show} onChange={(show) => setAvatar({ show })} />
                      {settings.avatar.show ? (
                        <>
                          <SliderField label="Ukuran foto" value={settings.avatar.size} min={16} max={56} unit=" px" onChange={(size) => setAvatar({ size })} />
                          <Segmented
                            label="Bentuk foto"
                            value={settings.avatar.shape}
                            options={[
                              { value: "circle" as const, label: "Bulat" },
                              { value: "rounded" as const, label: "Membulat" },
                              { value: "square" as const, label: "Kotak" },
                            ]}
                            onChange={(shape) => setAvatar({ shape })}
                          />
                        </>
                      ) : null}
                    </Group>
                    <Group title="Yang ditampilkan">
                      <ToggleField label="Waktu kirim" checked={settings.showTimestamp} onChange={(showTimestamp) => update((s) => ({ ...s, showTimestamp }))} />
                      <ToggleField
                        label="Lencana pengirim"
                        hint="Ikon moderator dan member di samping nama"
                        checked={settings.showBadges}
                        onChange={(showBadges) => update((s) => ({ ...s, showBadges }))}
                      />
                      <ToggleField
                        label="Sembunyikan judul dan kolom kirim pesan"
                        hint="Disarankan aktif untuk overlay OBS"
                        checked={settings.hideChrome}
                        onChange={(hideChrome) => update((s) => ({ ...s, hideChrome }))}
                      />
                      <ToggleField
                        label="Sembunyikan bar Super Chat di atas"
                        hint="Bar yang menampilkan donasi terbaru"
                        checked={settings.hideTicker}
                        onChange={(hideTicker) => update((s) => ({ ...s, hideTicker }))}
                      />
                    </Group>
                    <Group title="Latar panel chat">
                      <ColorField label="Warna latar" value={settings.panel.color} onChange={(color) => setPanel({ color })} />
                      <SliderField
                        label="Kepekatan latar"
                        value={settings.panel.opacity}
                        min={0}
                        max={100}
                        unit="%"
                        hint="0% berarti transparan penuh, gameplay di belakang chat tetap terlihat"
                        onChange={(opacity) => setPanel({ opacity })}
                      />
                    </Group>
                  </>
                ) : null}

                {tab === "animasi" ? (
                  <Group>
                    <Segmented
                      label="Saat pesan baru masuk"
                      value={settings.animation}
                      options={[
                        { value: "none" as const, label: "Tanpa" },
                        { value: "slide" as const, label: "Geser naik" },
                        { value: "pop" as const, label: "Membal" },
                        { value: "fade" as const, label: "Muncul pelan" },
                      ]}
                      onChange={(animation) => update((s) => ({ ...s, animation }))}
                    />
                    <p className="text-sm text-ink-3">Preview diputar ulang otomatis setiap kali kamu mengganti gaya.</p>
                  </Group>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </div>

      <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-12 border-t border-line pt-10">
        <OutputPanel css={css} codeRef={codeRef} copyState={copyState} copyRef={copyRef} onCopy={copyCss} />
        <BackupPanel
          settings={settings}
          presetLabel={preset.label}
          onImport={(s) => settingsStore.set(s)}
          onReset={() => settingsStore.set(presetById(settings.presetId).settings)}
          onNotice={toast}
        />
      </div>

      <footer className="mt-14 text-xs text-ink-3">
        lazycustom adalah alat independen dan tidak berafiliasi dengan YouTube atau OBS Studio.
      </footer>
      <p className="sr-only" role="status">
        {copyState === "copied" ? "CSS tersalin ke clipboard" : ""}
      </p>
    </main>
  );
}
