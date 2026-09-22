import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@/components/Editor";
import { generateCss } from "@/lib/design/css";
import { encodeDesign } from "@/lib/design/share";
import { designStore } from "@/lib/design/store";
import { designFromTemplate } from "@/lib/design/templates";
import { remoteImageUrls, type Design } from "@/lib/design/model";

vi.mock("@/lib/report", () => ({ report: vi.fn(() => "LC-TEST") }));

const codeText = () => document.querySelector("pre code")!.textContent!;
const nameInput = () => screen.getByLabelText("Nama desain") as HTMLInputElement;

beforeEach(() => {
  localStorage.clear();
  designStore._resetForTests();
  history.replaceState(null, "", "/");
});
afterEach(() => {
  designStore._resetForTests();
  history.replaceState(null, "", "/");
});

describe("Editor: keadaan awal", () => {
  it("memuat template Crystal dan menampilkan CSS-nya", () => {
    render(<Editor />);
    expect(nameInput().value).toBe("Crystal");
    expect(codeText()).toBe(generateCss(designFromTemplate("crystal")));
  });

  it("Undo dan Redo nonaktif di awal", () => {
    render(<Editor />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("menyediakan tools ala Canva dan template bawaan ditandai aktif", () => {
    render(<Editor />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Templates",
      "Elements",
      "Text",
      "Uploads",
      "Animate",
      "Layers",
      "Designs",
      "Properties",
    ]);
    expect(screen.getByRole("button", { name: "Pakai template Crystal" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Editor: template, edit, dan undo", () => {
  it("mengganti template mengubah CSS, mempertahankan nama, dan bisa di-undo", () => {
    render(<Editor />);
    fireEvent.change(nameInput(), { target: { value: "Overlay Kopi" } });
    fireEvent.click(screen.getByRole("button", { name: "Pakai template Grid" }));
    expect(codeText()).toContain("family=Rajdhani");
    expect(nameInput().value).toBe("Overlay Kopi");
    expect(screen.getByRole("button", { name: "Pakai template Grid" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(codeText()).not.toContain("family=Rajdhani");
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(codeText()).toContain("family=Rajdhani");
  });

  it("memilih layer lewat tab Layers membuka Properties yang sesuai dan edit masuk ke CSS", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("tab", { name: "Layers" }));
    fireEvent.click(screen.getByRole("button", { name: /Message text$/ }));
    const props = screen.getByRole("complementary", { name: "Properties" });
    expect(within(props).getByRole("heading", { level: 2 })).toHaveTextContent("Message text");
    fireEvent.change(within(props).getByLabelText("Warna teks", { selector: "input[type=text]" }), { target: { value: "#FF0000" } });
    expect(codeText()).toContain("color: #FF0000");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(codeText()).not.toContain("color: #FF0000");
  });

  it("edit menandai desain sebagai custom sehingga tidak ada template yang aktif", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("tab", { name: "Layers" }));
    fireEvent.click(screen.getByRole("button", { name: /^Panel/ }));
    const props = screen.getByRole("complementary", { name: "Properties" });
    fireEvent.change(within(props).getByLabelText("Base font size"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));
    expect(document.querySelectorAll('button[aria-label^="Pakai template"][aria-pressed="true"]')).toHaveLength(0);
  });

  it("perubahan slider beruntun digabung menjadi satu langkah undo", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("tab", { name: "Layers" }));
    fireEvent.click(screen.getByRole("button", { name: /^Panel/ }));
    const props = screen.getByRole("complementary", { name: "Properties" });
    const slider = within(props).getByLabelText("Base font size");
    for (const v of ["21", "22", "23", "24"]) fireEvent.change(slider, { target: { value: v } });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(codeText()).toContain("font-size: 5vw");
  });

  it("menambah dekorasi dari Properties bubble masuk ke CSS", () => {
    render(<Editor />);
    const props = screen.getByRole("complementary", { name: "Properties" });
    fireEvent.click(within(props).getByRole("button", { name: "Corner brackets" }));
    expect(codeText()).toMatch(/background-size:[^;]*2\.5vw max\(1px, 0\.5vw\)/);
  });
});

describe("Editor: nama desain", () => {
  it("nama boleh dikosongkan sementara tanpa mengubah nama tersimpan", () => {
    render(<Editor />);
    fireEvent.change(nameInput(), { target: { value: "Baru" } });
    fireEvent.change(nameInput(), { target: { value: "" } });
    expect(nameInput().value).toBe("");
    expect(designStore.getSnapshot().design.name).toBe("Baru");
    fireEvent.blur(nameInput());
    expect(nameInput().value).toBe("Baru");
  });
});

describe("Editor: Copy CSS", () => {
  it("menyalin CSS persis dan menampilkan status Tersalin", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<Editor />);
    fireEvent.click(screen.getAllByRole("button", { name: /Copy CSS/ })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(generateCss(designFromTemplate("crystal"))));
    await waitFor(() => expect(screen.getAllByText("Tersalin").length).toBeGreaterThan(0));
  });

  it("menampilkan pesan error dengan kode laporan bila clipboard diblokir", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("ditolak")) }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(false);
    render(<Editor />);
    fireEvent.click(screen.getAllByRole("button", { name: /Copy CSS/ })[0]);
    expect(await screen.findByText(/Kode laporan/)).toBeInTheDocument();
    expect(document.querySelector('[data-error-code="COPY_BLOCKED"]')).not.toBeNull();
  });
});

describe("Editor: link Share", () => {
  it("membuka desain dari #d= sebagai desain baru dengan pemberitahuan dan membersihkan alamat", async () => {
    const shared = designFromTemplate("holo", "Dari Teman");
    const code = await encodeDesign(shared);
    history.replaceState(null, "", "/#d=" + code);
    render(<Editor />);
    await waitFor(() => expect(nameInput().value).toBe("Dari Teman"));
    expect(screen.getByText(/dibuka sebagai desain baru/)).toBeInTheDocument();
    expect(location.hash).toBe("");
    expect(codeText()).toContain("family=Fraunces");
    expect(designStore.getSnapshot().saved).toHaveLength(2);
  });

  it("link rusak menampilkan pesan error dan tidak membuat desain baru", async () => {
    history.replaceState(null, "", "/#d=z.rusakrusak");
    render(<Editor />);
    expect(await screen.findByText("Link Share tidak bisa dibuka")).toBeInTheDocument();
    expect(screen.getByText("LC-TEST")).toBeInTheDocument();
    expect(nameInput().value).toBe("Crystal");
    expect(designStore.getSnapshot().saved).toHaveLength(1);
  });

  it("link yang sama tidak diproses dua kali", async () => {
    const code = await encodeDesign(designFromTemplate("aurora", "Sekali Saja"));
    history.replaceState(null, "", "/#d=" + code);
    const { rerender } = render(<Editor />);
    await waitFor(() => expect(nameInput().value).toBe("Sekali Saja"));
    rerender(<Editor />);
    await act(async () => undefined);
    expect(designStore.getSnapshot().saved).toHaveLength(2);
  });
});

describe("Editor: My Designs", () => {
  it("membuat desain baru dan berpindah antar desain", () => {
    render(<Editor />);
    fireEvent.change(nameInput(), { target: { value: "Pertama" } });
    fireEvent.click(screen.getByRole("tab", { name: "Designs" }));
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(nameInput().value).toBe("New design");
    expect(screen.getByText("My Designs (2/20)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Pertama/ }));
    expect(nameInput().value).toBe("Pertama");
  });

  it("menghapus desain butuh dua klik", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("tab", { name: "Designs" }));
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus New design" }));
    expect(screen.getByText("My Designs (2/20)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Klik lagi untuk menghapus New design" }));
    expect(screen.getByText("My Designs (1/20)")).toBeInTheDocument();
  });
});

function designWithRemoteImage(name: string): Design {
  const d = designFromTemplate("aurora", name);
  d.bubble.decorations.push({ id: "image-pin-zzzz", kind: "image-pin", url: "https://pelacak.example.net/p.gif", anchor: "top-right", width: 24, offsetX: 0, offsetY: 0 });
  d.avatar.frame = { url: "https://cdn.example.org/frame.png", scale: 130 };
  return d;
}

describe("Editor: gambar dari luar pada desain orang lain", () => {
  it("link Share yang memuat gambar luar menunggu keputusan dan belum membuka apa pun", async () => {
    history.replaceState(null, "", "/#d=" + (await encodeDesign(designWithRemoteImage("Dari Orang"))));
    render(<Editor />);
    expect(await screen.findByText("Desain ini memuat gambar dari alamat luar")).toBeInTheDocument();
    expect(screen.getByText("pelacak.example.net", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/alamat IP-mu/)).toBeInTheDocument();
    // Belum dibuka: desain aktif masih Crystal, dan CSS tidak memuat alamat luar.
    expect(nameInput().value).toBe("Crystal");
    expect(designStore.getSnapshot().saved).toHaveLength(1);
    expect(codeText()).not.toContain("pelacak.example.net");
  });

  it("pilihan aman (Buka tanpa gambar) mendapat fokus dan membuka desain tanpa satu pun alamat luar", async () => {
    history.replaceState(null, "", "/#d=" + (await encodeDesign(designWithRemoteImage("Dari Orang"))));
    render(<Editor />);
    const safe = await screen.findByRole("button", { name: "Buka tanpa gambar" });
    expect(safe).toHaveFocus();
    fireEvent.click(safe);
    await waitFor(() => expect(nameInput().value).toBe("Dari Orang"));
    expect(remoteImageUrls(designStore.getSnapshot().design)).toEqual([]);
    expect(codeText()).not.toContain("pelacak.example.net");
    expect(codeText()).not.toContain("cdn.example.org");
    expect(screen.queryByText("Desain ini memuat gambar dari alamat luar")).not.toBeInTheDocument();
  });

  it("Buka dengan gambar mempertahankan gambar luar", async () => {
    history.replaceState(null, "", "/#d=" + (await encodeDesign(designWithRemoteImage("Dari Orang"))));
    render(<Editor />);
    fireEvent.click(await screen.findByRole("button", { name: "Buka dengan gambar" }));
    await waitFor(() => expect(nameInput().value).toBe("Dari Orang"));
    expect(remoteImageUrls(designStore.getSnapshot().design)).toHaveLength(2);
    expect(codeText()).toContain("https://pelacak.example.net/p.gif");
  });

  it("link Share tanpa gambar luar tetap langsung terbuka tanpa pertanyaan", async () => {
    history.replaceState(null, "", "/#d=" + (await encodeDesign(designFromTemplate("holo", "Polos"))));
    render(<Editor />);
    await waitFor(() => expect(nameInput().value).toBe("Polos"));
    expect(screen.queryByText("Desain ini memuat gambar dari alamat luar")).not.toBeInTheDocument();
  });

  it("file impor yang memuat gambar luar juga ditanyakan dulu", async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("tab", { name: "Designs" }));
    const file = new File([JSON.stringify(designWithRemoteImage("Dari File"))], "d.json", { type: "application/json" });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(await screen.findByText("Desain ini memuat gambar dari alamat luar")).toBeInTheDocument();
    expect(screen.getByText(/File ini memakai 2 gambar/)).toBeInTheDocument();
    expect(nameInput().value).toBe("Crystal");
    fireEvent.click(screen.getByRole("button", { name: "Buka tanpa gambar" }));
    await waitFor(() => expect(nameInput().value).toBe("Dari File"));
    expect(remoteImageUrls(designStore.getSnapshot().design)).toEqual([]);
  });
});
