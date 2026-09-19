import { DEFAULT_SETTINGS } from "./presets";
import { report } from "./report";
import { parseSettings, type Settings } from "./settings";

/**
 * Penyimpanan pengaturan di browser (localStorage) sebagai external store,
 * dipakai lewat useSyncExternalStore supaya render server dan browser tetap cocok.
 */
const KEY = "lazycustom:settings:v1";
const SAVE_DELAY_MS = 300;

export type StoreIssue = "STORAGE_BLOCKED" | "STORAGE_CORRUPT" | null;

export interface Snapshot {
  settings: Settings;
  issue: StoreIssue;
  /** Kode laporan untuk issue di atas, sama dengan yang tercatat di log developer. */
  issueRef: string | null;
}

const SERVER_SNAPSHOT: Snapshot = { settings: DEFAULT_SETTINGS, issue: null, issueRef: null };

let snap: Snapshot = SERVER_SNAPSHOT;
let started = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(next: Snapshot): void {
  snap = next;
  listeners.forEach((l) => l());
}

function load(): void {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (error) {
    const ref = report({ code: "STORAGE_BLOCKED", error, level: "warn" });
    snap = { settings: DEFAULT_SETTINGS, issue: "STORAGE_BLOCKED", issueRef: ref };
    return;
  }
  if (raw === null) return;
  try {
    const parsed = parseSettings(JSON.parse(raw));
    if (parsed.ok) {
      snap = { settings: parsed.settings, issue: null, issueRef: null };
      return;
    }
  } catch {
    // Jatuh ke penanganan data rusak di bawah.
  }
  const ref = report({ code: "STORAGE_CORRUPT", level: "warn", context: { bytes: raw.length } });
  snap = { settings: DEFAULT_SETTINGS, issue: "STORAGE_CORRUPT", issueRef: ref };
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snap.settings));
  } catch (error) {
    if (snap.issue !== "STORAGE_BLOCKED") {
      const ref = report({ code: "STORAGE_BLOCKED", error, level: "warn" });
      emit({ ...snap, issue: "STORAGE_BLOCKED", issueRef: ref });
    }
  }
}

function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, SAVE_DELAY_MS);
}

export const settingsStore = {
  subscribe(listener: () => void): () => void {
    if (!started) {
      started = true;
      load();
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): Snapshot {
    return snap;
  },
  getServerSnapshot(): Snapshot {
    return SERVER_SNAPSHOT;
  },
  set(next: Settings): void {
    emit({ ...snap, settings: next });
    scheduleSave();
  },
  update(fn: (prev: Settings) => Settings): void {
    settingsStore.set(fn(snap.settings));
  },
  dismissIssue(): void {
    if (snap.issue) emit({ ...snap, issue: null, issueRef: null });
  },
  /** Hanya untuk pengujian. */
  _resetForTests(): void {
    clearTimeout(saveTimer);
    started = false;
    snap = SERVER_SNAPSHOT;
    listeners.clear();
  },
};
