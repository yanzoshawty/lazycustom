import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/report", () => ({ report: vi.fn(() => "LC-TEST") }));

import { BackupPanel } from "@/components/BackupPanel";
import { ColorField } from "@/components/controls";
import { Editor } from "@/components/Editor";
import { ErrorNotice } from "@/components/ErrorNotice";
import { Preview } from "@/components/Preview";
import { PRESETS } from "@/lib/presets";
import { report } from "@/lib/report";
import { settingsStore } from "@/lib/store";

const reportMock = vi.mocked(report);

beforeEach(() => {
  reportMock.mockClear();
  settingsStore._resetForTests();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ErrorNotice", () => {
  it("menampilkan judul, penjelasan, tindakan, dan kode laporan", () => {
    render(<ErrorNotice code="IMPORT_INVALID" refId="LC-7K2F" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("File pengaturan tidak bisa dibaca");
    expect(alert).toHaveTextContent("Pilih file .json");
    expect(alert).toHaveTextContent("LC-7K2F");
  });

  it("memakai role status untuk peringatan yang tidak mendesak", () => {
    render(<ErrorNotice code="STORAGE_BLOCKED" />);
    expect(screen.getByRole("status")).toHaveTextContent("Pengaturan tidak tersimpan otomatis");
    expect(screen.queryByText(/Kode laporan/)).toBeNull();
  });

  it("bisa ditutup", () => {
    const onDismiss = vi.fn();
    render(<ErrorNotice code="COPY_BLOCKED" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Tutup pesan" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("ColorField", () => {
  function Harness() {
    const [v, setV] = useState("#D6336C");
    return <ColorField label="Warna pesan" value={v} onChange={setV} />;
  }

  it("mengembalikan nilai lama dan menjelaskan saat kode salah", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Warna pesan");
    fireEvent.change(input, { target: { value: "zzz" } });
    fireEvent.blur(input);
    expect(screen.getByText(/Kode warna harus 6 karakter/)).toBeInTheDocument();
    expect(input).toHaveValue("#D6336C");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("menerima kode 3 karakter saat ditinggalkan dan menormalkannya", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Warna pesan");
    fireEvent.change(input, { target: { value: "#abc" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("#AABBCC");
    expect(screen.queryByText(/Kode warna harus/)).toBeNull();
  });

  it("menerapkan kode 6 karakter langsung saat mengetik", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Warna pesan");
    fireEvent.change(input, { target: { value: "12ab34" } });
    expect(screen.getByLabelText("Warna pesan, pemilih warna")).toHaveValue("#12ab34");
  });
});

describe("Preview", () => {
  it("menampilkan pesan jelas dengan kode laporan bila iframe tidak pernah siap", () => {
    vi.useFakeTimers();
    render(<Preview css="body{}" animationKey="pop" />);
    expect(screen.queryByText("Preview belum tampil")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByText("Preview belum tampil")).toBeInTheDocument();
    expect(screen.getByText("LC-TEST")).toBeInTheDocument();
    expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ code: "PREVIEW_FAILED", level: "warn" }));
  });

  it("pulih setelah klik Putar ulang dan bisa siap pada percobaan berikutnya", () => {
    vi.useFakeTimers();
    render(<Preview css="body{}" animationKey="pop" />);
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    const retry = within(screen.getByRole("status")).getByRole("button", { name: "Putar ulang" });
    fireEvent.click(retry);
    expect(screen.queryByText("Preview belum tampil")).toBeNull();
    const frame = screen.getByTitle("Preview chat dengan gayamu") as HTMLIFrameElement;
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: { type: "lc-ready" }, source: frame.contentWindow }));
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Preview belum tampil")).toBeNull();
  });

  it("mengabaikan pesan dari sumber lain", () => {
    vi.useFakeTimers();
    render(<Preview css="body{}" animationKey="pop" />);
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: { type: "lc-ready" }, source: window }));
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByText("Preview belum tampil")).toBeInTheDocument();
  });

  it("mengirim ping ke iframe saat dipasang, supaya sinyal siap yang terlanjur lewat tetap didapat", () => {
    const spy = vi.spyOn(window, "postMessage");
    render(<Preview css="body{}" animationKey="pop" />);
    const frame = screen.getByTitle("Preview chat dengan gayamu") as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    fireEvent.load(frame);
    expect(post).toHaveBeenCalledWith({ type: "ping" }, "*");
    spy.mockRestore();
  });

  it("menjalankan iframe dengan sandbox yang hanya mengizinkan skrip", () => {
    render(<Preview css="body{}" animationKey="pop" />);
    const frame = screen.getByTitle("Preview chat dengan gayamu");
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
  });
});

describe("BackupPanel", () => {
  const setup = () => {
    const props = {
      settings: PRESETS[0].settings,
      presetLabel: "Sirup",
      onImport: vi.fn(),
      onReset: vi.fn(),
      onNotice: vi.fn(),
    };
    render(<BackupPanel {...props} />);
    return props;
  };
  const pick = (file: File) =>
    fireEvent.change(screen.getByLabelText("Pilih file pengaturan"), { target: { files: [file] } });

  it("menolak file lebih dari 100 KB tanpa membacanya", async () => {
    const props = setup();
    pick(new File([new Uint8Array(101 * 1024)], "besar.json", { type: "application/json" }));
    expect(await screen.findByText("File terlalu besar")).toBeInTheDocument();
    expect(props.onImport).not.toHaveBeenCalled();
    expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ code: "IMPORT_TOO_LARGE" }));
  });

  it.each([
    ["bukan JSON", "ini bukan json", "File pengaturan tidak bisa dibaca", "IMPORT_INVALID"],
    ["JSON dengan bentuk salah", "{}", "File pengaturan tidak bisa dibaca", "IMPORT_INVALID"],
    ["array", "[1,2,3]", "File pengaturan tidak bisa dibaca", "IMPORT_INVALID"],
    ["versi berbeda", '{"v":2}', "Versi file tidak dikenali", "IMPORT_VERSION"],
  ])("menjelaskan masalah untuk file %s", async (_n, content, title, code) => {
    const props = setup();
    pick(new File([content], "x.json", { type: "application/json" }));
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText("LC-TEST")).toBeInTheDocument();
    expect(props.onImport).not.toHaveBeenCalled();
    expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ code, level: "warn" }));
  });

  it("tidak membocorkan isi file ke log", async () => {
    setup();
    pick(new File(['{"rahasia":"isi pribadi"}'], "x.json"));
    await screen.findByText("File pengaturan tidak bisa dibaca");
    const logged = JSON.stringify(reportMock.mock.calls);
    expect(logged).not.toContain("isi pribadi");
    expect(logged).not.toContain("x.json");
  });

  it("mengimpor file valid dan memberi kabar", async () => {
    const props = setup();
    pick(new File([JSON.stringify(PRESETS[2].settings)], "ok.json", { type: "application/json" }));
    await waitFor(() => expect(props.onImport).toHaveBeenCalledOnce());
    expect(props.onImport.mock.calls[0][0].presetId).toBe(PRESETS[2].id);
    expect(props.onNotice).toHaveBeenCalledWith("Pengaturan diimpor");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("meminta klik kedua sebelum mengembalikan pengaturan", () => {
    vi.useFakeTimers();
    const props = setup();
    const btn = () => screen.getByRole("button", { name: /Kembalikan ke Sirup|Klik lagi untuk yakin/ });
    fireEvent.click(btn());
    expect(props.onReset).not.toHaveBeenCalled();
    expect(btn()).toHaveTextContent("Klik lagi untuk yakin");
    fireEvent.click(btn());
    expect(props.onReset).toHaveBeenCalledOnce();
    expect(props.onNotice).toHaveBeenCalledWith("Kembali ke tema Sirup");
  });

  it("membatalkan konfirmasi bila tidak diklik lagi dalam 4 detik", () => {
    vi.useFakeTimers();
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Kembalikan ke Sirup" }));
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByRole("button", { name: "Kembalikan ke Sirup" })).toBeInTheDocument();
    expect(props.onReset).not.toHaveBeenCalled();
  });
});

describe("Editor", () => {
  it("menampilkan judul, tab, dan CSS untuk tema awal", () => {
    render(<Editor />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bikin chat live YouTube-mu tampil beda");
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByLabelText("Kode CSS hasil pengaturanmu").textContent).toContain("rgba(204, 44, 101");
  });

  it("mengganti tema dan memperbarui CSS", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("radio", { name: /Jeruk Nipis/ }));
    expect(screen.getByLabelText("Kode CSS hasil pengaturanmu").textContent).toContain("rgba(190, 232, 74");
  });

  it("berpindah tab dengan panah keyboard dan Home/End", () => {
    render(<Editor />);
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveFocus();
    fireEvent.keyDown(tabs[1], { key: "End" });
    expect(tabs[4]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tabs[4], { key: "ArrowRight" });
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
    expect(tabs[4]).toHaveAttribute("aria-selected", "true");
  });

  it("menyembunyikan kontrol bubble saat bubble dimatikan", async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("tab", { name: "Bubble" }));
    expect(await screen.findByLabelText("Warna bubble")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /Pakai bubble/ }));
    await waitFor(() => expect(screen.queryByLabelText("Warna bubble")).toBeNull());
    expect(screen.getByLabelText("Kode CSS hasil pengaturanmu").textContent).not.toContain("border-radius: 22px");
  });

  it("memperingatkan bila warna teks dan bubble terlalu mirip", async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("tab", { name: "Teks" }));
    const field = await screen.findByLabelText("Warna pesan");
    fireEvent.change(field, { target: { value: "CC2C65" } });
    expect(await screen.findByText(/terlalu mirip/)).toBeInTheDocument();
  });

  it("menandai tema sebagai diubah setelah pengaturan digeser", async () => {
    render(<Editor />);
    expect(screen.queryByText("(diubah)")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Teks" }));
    fireEvent.change(await screen.findByLabelText("Ukuran teks"), { target: { value: "28" } });
    fireEvent.click(screen.getByRole("tab", { name: "Tema" }));
    expect(await screen.findByText("(diubah)")).toBeInTheDocument();
  });

  describe("menyalin CSS", () => {
    it("menampilkan Tersalin saat berhasil", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      render(<Editor />);
      fireEvent.click(screen.getAllByRole("button", { name: "Salin CSS" })[0]);
      await waitFor(() => expect(screen.getAllByRole("button", { name: "Tersalin" }).length).toBeGreaterThan(0));
      expect(writeText).toHaveBeenCalledOnce();
      expect(writeText.mock.calls[0][0]).toContain("yt-live-chat-text-message-renderer");
      expect(screen.queryByText("CSS belum tersalin")).toBeNull();
    });

    it("menampilkan cara manual dengan kode laporan bila semua cara gagal", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) },
        configurable: true,
      });
      document.execCommand = vi.fn(() => false);
      render(<Editor />);
      fireEvent.click(screen.getAllByRole("button", { name: "Salin CSS" })[0]);
      expect(await screen.findByText("CSS belum tersalin")).toBeInTheDocument();
      expect(screen.getByText("LC-TEST")).toBeInTheDocument();
      expect(reportMock).toHaveBeenCalledWith(
        expect.objectContaining({ code: "COPY_BLOCKED", level: "warn", context: { what: "css" } }),
      );
      expect(window.getSelection()?.toString()).toContain("yt-live-chat-renderer");
    });

    it("memakai cara lama bila API clipboard modern ditolak tapi execCommand berhasil", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
        configurable: true,
      });
      document.execCommand = vi.fn(() => true);
      render(<Editor />);
      fireEvent.click(screen.getAllByRole("button", { name: "Salin CSS" })[1]);
      await waitFor(() => expect(screen.getAllByRole("button", { name: "Tersalin" }).length).toBeGreaterThan(0));
      expect(document.execCommand).toHaveBeenCalledWith("copy");
    });
  });

  describe("pembuat link chat", () => {
    it("menjelaskan bila link bukan milik YouTube dan mencatat tanpa isi link", () => {
      render(<Editor />);
      fireEvent.change(screen.getByLabelText("Link live YouTube-mu"), { target: { value: "https://example.com/x" } });
      fireEvent.click(screen.getByRole("button", { name: "Buat link chat" }));
      expect(screen.getByText("Link YouTube tidak dikenali")).toBeInTheDocument();
      expect(reportMock).toHaveBeenCalledWith(expect.objectContaining({ code: "URL_INVALID", context: { length: 21 } }));
      expect(JSON.stringify(reportMock.mock.calls)).not.toContain("example.com");
    });

    it("membuat link popout dari link video dan menghapus error sebelumnya", () => {
      render(<Editor />);
      const input = screen.getByLabelText("Link live YouTube-mu");
      fireEvent.change(input, { target: { value: "salah" } });
      fireEvent.click(screen.getByRole("button", { name: "Buat link chat" }));
      expect(screen.getByText("Link YouTube tidak dikenali")).toBeInTheDocument();
      fireEvent.change(input, { target: { value: "https://youtu.be/dQw4w9WgXcQ" } });
      fireEvent.click(screen.getByRole("button", { name: "Buat link chat" }));
      expect(screen.queryByText("Link YouTube tidak dikenali")).toBeNull();
      expect(screen.getByLabelText("Link chat untuk OBS")).toHaveValue(
        "https://www.youtube.com/live_chat?is_popout=1&v=dQw4w9WgXcQ",
      );
    });
  });

  it("menampilkan peringatan saat penyimpanan browser diblokir, lengkap dengan kode laporan", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    render(<Editor />);
    expect(await screen.findByText("Pengaturan tidak tersimpan otomatis")).toBeInTheDocument();
    expect(screen.getAllByText("LC-TEST").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Tutup pesan" }));
    await waitFor(() => expect(screen.queryByText("Pengaturan tidak tersimpan otomatis")).toBeNull());
  });

  it("menampilkan peringatan saat data tersimpan rusak dan tetap memakai tema awal", async () => {
    localStorage.setItem("lazycustom:settings:v1", "{rusak");
    render(<Editor />);
    expect(await screen.findByText("Pengaturan lama tidak terbaca")).toBeInTheDocument();
    expect(screen.getByLabelText("Kode CSS hasil pengaturanmu").textContent).toContain("rgba(204, 44, 101");
  });
});
