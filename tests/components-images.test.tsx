import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnchorPicker } from "@/components/controls";
import { ImageBudgetContext, ImageSourceField } from "@/components/ImageSourceField";
import { Inspector, type Edit } from "@/components/Inspector";
import { newPanelImage, PanelImagesEditor } from "@/components/PanelImagesEditor";
import { decodeDesign, encodeDesign } from "@/lib/design/share";
import { countUploadedImages, MAX_DESIGN_DATA_CHARS, type Design, type PanelImage } from "@/lib/design/model";
import { designFromTemplate } from "@/lib/design/templates";
import { toDataUri } from "@/lib/design/upload";

/** jsdom tidak punya createImageBitmap dan encode canvas, jadi hasil pemampatan disediakan uji. Validasi byte tetap nyata. */
const compress = vi.hoisted(() => ({ fake: null as null | ((f: File) => Promise<unknown>) }));
vi.mock("@/lib/design/image-compress", async (orig) => {
  const actual = await orig<typeof import("@/lib/design/image-compress")>();
  return { ...actual, compressImageFile: (f: File) => (compress.fake ? compress.fake(f) : actual.compressImageFile(f)) };
});

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PNG_URI = toDataUri("image/png", PNG_BYTES);
const file = (bytes: Uint8Array | string, name: string, type = "image/png") => new File([bytes as BlobPart], name, { type });
const compressed = () => ({ ok: true, dataUri: PNG_URI, bytes: 12, mime: "image/png", width: 1, height: 1, sourceBytes: 5000 });
beforeEach(() => {
  compress.fake = null;
});
const pickFile = (label: RegExp | string, f: File) => fireEvent.change(screen.getByLabelText(label, { selector: "input[type=file]" }), { target: { files: [f] } });

describe("ImageSourceField", () => {
  it("link https yang aman langsung diterapkan", () => {
    const onChange = vi.fn();
    render(<ImageSourceField value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Link gambar atau GIF"), { target: { value: "https://cdn.example.com/a.gif" } });
    expect(onChange).toHaveBeenCalledWith("https://cdn.example.com/a.gif");
  });

  it("link tidak aman ditolak dengan alasan", () => {
    const onChange = vi.fn();
    render(<ImageSourceField value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Link gambar atau GIF"), { target: { value: "http://a.com/x.png" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/harus diawali https/)).toBeInTheDocument();
  });

  it("link tidak boleh berupa data URI yang diketik", () => {
    const onChange = vi.fn();
    render(<ImageSourceField value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Link gambar atau GIF"), { target: { value: PNG_URI } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("upload PNG yang sah dimampatkan, masuk pustaka, lalu menjadi data URI", async () => {
    compress.fake = async () => compressed();
    const onChange = vi.fn();
    render(<ImageSourceField value="" onChange={onChange} />);
    pickFile(/Pilih file/, file(PNG_BYTES, "logo.png"));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0]).toBe(PNG_URI);
  });

  it("file yang menyamar sebagai gambar (SVG atau HTML berekstensi .png) ditolak dari isinya", async () => {
    const onChange = vi.fn();
    render(<ImageSourceField value="" onChange={onChange} />);
    pickFile(/Pilih file/, file("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "aman.png", "image/png"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Format tidak didukung/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("file sumber di atas 8 MB ditolak dengan pesan ukuran", async () => {
    const onChange = vi.fn();
    render(<ImageSourceField value="" onChange={onChange} />);
    const big = file(PNG_BYTES, "besar.png");
    Object.defineProperty(big, "size", { value: 9 * 1024 * 1024 });
    pickFile(/Pilih file/, big);
    expect(await screen.findByRole("alert")).toHaveTextContent(/lebih dari 8 MB/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("gambar yang gagal dimampatkan menampilkan alasannya", async () => {
    compress.fake = async () => ({ ok: false, reason: "CANNOT_FIT" });
    const onChange = vi.fn();
    render(<ImageSourceField value="" onChange={onChange} />);
    pickFile(/Pilih file/, file(PNG_BYTES, "rumit.png"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/di bawah 100 KB/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("menolak upload bila total data unggahan desain sudah penuh", async () => {
    compress.fake = async () => compressed();
    const onChange = vi.fn();
    render(
      <ImageBudgetContext.Provider value={MAX_DESIGN_DATA_CHARS}>
        <ImageSourceField value="" onChange={onChange} />
      </ImageBudgetContext.Provider>,
    );
    pickFile(/Pilih file/, file(PNG_BYTES, "logo.png"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/sudah penuh/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("mengganti gambar unggahan tidak menghitung gambar lama dua kali", async () => {
    compress.fake = async () => compressed();
    const onChange = vi.fn();
    render(
      <ImageBudgetContext.Provider value={PNG_URI.length}>
        <ImageSourceField value={PNG_URI} onChange={onChange} />
      </ImageBudgetContext.Provider>,
    );
    pickFile(/Pilih file/, file(PNG_BYTES, "baru.png"));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it("menampilkan gambar unggahan dengan tombol hapus, tanpa menampilkan isi base64", () => {
    const onChange = vi.fn();
    render(<ImageSourceField value={PNG_URI} onChange={onChange} />);
    expect(screen.getByText(/Gambar unggahan, \d+ KB/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("base64");
    fireEvent.click(screen.getByRole("button", { name: "Hapus gambar unggahan" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("menyatakan dengan jelas bahwa upload tidak ikut link Share dan host bisa melihat IP", () => {
    render(<ImageSourceField value="" onChange={() => undefined} />);
    expect(screen.getByText(/Tidak ikut link Share/)).toBeInTheDocument();
    // Yang memuat gambar adalah OBS di komputer user dan preview di browser, bukan penonton stream.
    expect(screen.getByText(/alamat IP-mu/)).toBeInTheDocument();
    expect(screen.queryByText(/penonton/)).not.toBeInTheDocument();
  });
});

describe("AnchorPicker", () => {
  it("menampilkan sembilan titik dan memilih salah satunya", () => {
    const onChange = vi.fn();
    render(<AnchorPicker label="Posisi" value="center" onChange={onChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(9);
    expect(screen.getByRole("radio", { name: "Tengah" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Kanan bawah" }));
    expect(onChange).toHaveBeenCalledWith("bottom-right");
  });
});

describe("PanelImagesEditor", () => {
  const img = (o: Partial<PanelImage> = {}): PanelImage => ({ ...newPanelImage("front"), ...o });
  /** onChange sekarang menerima fungsi pembaharu; tes membaca hasilnya dengan menerapkannya ke array sebelum-nya. */
  const appliedImgs = (onChange: ReturnType<typeof vi.fn>, before: PanelImage[], call = 0): PanelImage[] =>
    (onChange.mock.calls[call][0] as (prev: PanelImage[]) => PanelImage[])(before);

  it("menambah gambar di belakang dan di depan pesan", () => {
    const onChange = vi.fn();
    render(<PanelImagesEditor images={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Gambar di belakang pesan" }));
    fireEvent.click(screen.getByRole("button", { name: "Gambar di depan pesan" }));
    expect(appliedImgs(onChange, [], 0)[0].layer).toBe("behind");
    expect(appliedImgs(onChange, [], 1)[0].layer).toBe("front");
  });

  it("dua gambar per lapisan adalah batasnya", () => {
    const two = [img({ id: "a-1" }), img({ id: "a-2" })];
    render(<PanelImagesEditor images={two} onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "Gambar di depan pesan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Gambar di belakang pesan" })).toBeEnabled();
  });

  it("memindahkan gambar ke lapisan yang sudah penuh tidak diizinkan", () => {
    const onChange = vi.fn();
    const images = [img({ id: "a-1", layer: "front" }), img({ id: "b-1", layer: "behind" }), img({ id: "b-2", layer: "behind" })];
    render(<PanelImagesEditor images={images} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole("radio", { name: "Belakang pesan" })[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("menghapus hanya gambar yang dipilih dan mengubah posisi lewat anchor", () => {
    const onChange = vi.fn();
    const a = img({ id: "a-1", anchor: "top-right" });
    const b = img({ id: "a-2", layer: "behind" });
    render(<PanelImagesEditor images={[a, b]} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole("radio", { name: "Kiri bawah" })[0]);
    expect(appliedImgs(onChange, [a, b], 0)[0].anchor).toBe("bottom-left");
    fireEvent.click(screen.getByRole("button", { name: "Hapus gambar panel #1" }));
    expect(appliedImgs(onChange, [a, b], 1).map((i) => i.id)).toEqual(["a-2"]);
  });

  it("gambar baru punya nilai bawaan yang lolos skema", () => {
    for (const layer of ["behind", "front"] as const) {
      const i = newPanelImage(layer);
      expect(i.url).toBe("");
      expect(i.id).toMatch(/^[a-z0-9-]{3,24}$/);
    }
  });
});

describe("Inspector: bingkai avatar dan gambar panel", () => {
  const run = (d: Design) => {
    let current = d;
    const edit: Edit = (fn) => { current = fn(current); };
    return { edit, get design() { return current; } };
  };

  it("bingkai avatar: link diterapkan dan slider ukuran muncul hanya setelah ada link", () => {
    const h = run(designFromTemplate("crystal"));
    const { rerender } = render(<Inspector design={h.design} layer="avatar" edit={h.edit} />);
    expect(screen.queryByLabelText("Ukuran bingkai")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Link gambar bingkai"), { target: { value: "https://cdn.example.com/frame.png" } });
    expect(h.design.avatar.frame.url).toBe("https://cdn.example.com/frame.png");
    rerender(<Inspector design={h.design} layer="avatar" edit={h.edit} />);
    fireEvent.change(screen.getByLabelText("Ukuran bingkai"), { target: { value: "160" } });
    expect(h.design.avatar.frame.scale).toBe(160);
  });

  it("layer Panel menyediakan editor gambar panel", () => {
    const h = run(designFromTemplate("crystal"));
    render(<Inspector design={h.design} layer="panel" edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "Gambar di depan pesan" }));
    expect(h.design.panelImages).toHaveLength(1);
    expect(h.design.panelImages[0].layer).toBe("front");
  });

  it("kartu memakai editor dekorasi yang sama, termasuk Image pin", () => {
    const h = run(designFromTemplate("crystal"));
    render(<Inspector design={h.design} layer="superchat" edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "Image pin" }));
    expect(h.design.superChat.surface.decorations.some((d) => d.kind === "image-pin")).toBe(true);
  });

  it("slider jarak nama dan nominal ada di kartu dan mengubah model", () => {
    const h = run(designFromTemplate("crystal"));
    render(<Inspector design={h.design} layer="sticker" edit={h.edit} />);
    fireEvent.change(screen.getByLabelText("Amount gap"), { target: { value: "16" } });
    expect(h.design.sticker.amountGap).toBe(16);
  });
});

describe("link Share dan gambar unggahan", () => {
  it("encode membuang gambar unggahan tapi mempertahankan gambar dari link https", async () => {
    const d = designFromTemplate("crystal");
    d.avatar.frame.url = PNG_URI;
    d.panelImages = [{ ...newPanelImage("front"), id: "up-1", url: PNG_URI }, { ...newPanelImage("behind"), id: "web-1", url: "https://cdn.example.com/bg.png" }];
    expect(countUploadedImages(d)).toBe(2);
    const r = await decodeDesign(await encodeDesign(d));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(countUploadedImages(r.design)).toBe(0);
      expect(r.design.avatar.frame.url).toBe("");
      expect(r.design.panelImages.find((i) => i.id === "web-1")!.url).toBe("https://cdn.example.com/bg.png");
    }
    expect(countUploadedImages(d)).toBe(2);
  });

  it("link Share yang membawa data URI tertanam tetap dibersihkan saat dibuka", async () => {
    const d = designFromTemplate("crystal");
    d.avatar.frame.url = PNG_URI;
    const raw = "j." + Buffer.from(JSON.stringify(d)).toString("base64url");
    const r = await decodeDesign(raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.design.avatar.frame.url).toBe("");
  });
});
