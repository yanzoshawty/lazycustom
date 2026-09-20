import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DecorationsEditor, newDecoration } from "@/components/DecorationsEditor";
import { DECORATION_KINDS, decorationSchema, type Decoration } from "@/lib/design/model";

describe("newDecoration", () => {
  it.each(DECORATION_KINDS)("%s: nilai bawaan lolos validasi skema", (kind) => {
    const d = newDecoration(kind);
    expect(d.kind).toBe(kind);
    expect(decorationSchema.safeParse(d).success).toBe(true);
    expect(d.id).toMatch(/^[a-z0-9-]{3,24}$/);
  });

  it("membuat id yang berbeda tiap kali", () => {
    expect(new Set(Array.from({ length: 50 }, () => newDecoration("glow").id)).size).toBe(50);
  });
});

describe("DecorationsEditor", () => {

  it("menampilkan keadaan kosong dan menambah dekorasi dengan kunci undo yang jelas", () => {
    const onChange = vi.fn();
    render(<DecorationsEditor decorations={[]} onChange={onChange} />);
    expect(screen.getByText(/Belum ada dekorasi/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Corner brackets" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [next, key] = onChange.mock.calls[0] as [Decoration[], string];
    expect(next).toHaveLength(1);
    expect(next[0].kind).toBe("corners");
    expect(key).toBe("deco.add.corners");
  });

  it("gradient border dan gambar hanya bisa satu per permukaan", () => {
    const ring = newDecoration("gradient-border");
    const img = newDecoration("image");
    render(<DecorationsEditor decorations={[ring, img]} onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "Gradient border" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Image" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Glow" })).toBeEnabled();
  });

  it("batas delapan dekorasi menonaktifkan semua tombol tambah dan memberi penjelasan", () => {
    const eight = Array.from({ length: 8 }, () => newDecoration("glow"));
    render(<DecorationsEditor decorations={eight} onChange={() => undefined} />);
    for (const name of ["Glow", "Accent bar", "Corner brackets", "Scanlines"]) expect(screen.getByRole("button", { name })).toBeDisabled();
    expect(screen.getByText(/Batas 8 dekorasi tercapai/)).toBeInTheDocument();
  });

  it("menghapus dekorasi yang dipilih saja", () => {
    const a = newDecoration("glow");
    const b = newDecoration("scanlines");
    const onChange = vi.fn();
    render(<DecorationsEditor decorations={[a, b]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus Glow #1" }));
    const [next] = onChange.mock.calls[0] as [Decoration[]];
    expect(next.map((d) => d.id)).toEqual([b.id]);
  });

  it("mengubah nilai slider glow menghasilkan dekorasi baru tanpa mengubah yang lain", () => {
    const a = newDecoration("glow");
    const b = newDecoration("scanlines");
    const onChange = vi.fn();
    render(<DecorationsEditor decorations={[a, b]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Blur"), { target: { value: "30" } });
    const [next] = onChange.mock.calls[0] as [Decoration[]];
    expect(next[0]).toMatchObject({ kind: "glow", blur: 30 });
    expect(next[1]).toEqual(b);
  });

  describe("link gambar", () => {
    const image: Extract<Decoration, { kind: "image" }> = { id: "image-test", kind: "image", url: "", fit: "cover", position: "center", opacity: 60 };

    it("link https yang aman langsung diterapkan", () => {
      const onChange = vi.fn();
      render(<DecorationsEditor decorations={[image]} onChange={onChange} />);
      fireEvent.change(screen.getByLabelText("Link gambar atau GIF"), { target: { value: "https://cdn.example.com/a.gif" } });
      const [next] = onChange.mock.calls[0] as [Decoration[]];
      expect(next[0]).toMatchObject({ kind: "image", url: "https://cdn.example.com/a.gif" });
    });

    it.each([
      "http://example.com/a.png",
      "javascript:alert(1)",
      "https://a.com/x.png\")}body{display:none",
      "https://a.com/a b.png",
      "https://a.com/(x).png",
      "data:image/png;base64,AAAA",
    ])("menolak %j dan menampilkan alasannya", (bad) => {
      const onChange = vi.fn();
      render(<DecorationsEditor decorations={[image]} onChange={onChange} />);
      fireEvent.change(screen.getByLabelText("Link gambar atau GIF"), { target: { value: bad } });
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText(/harus diawali https/)).toBeInTheDocument();
      expect(screen.getByLabelText("Link gambar atau GIF")).toHaveAttribute("aria-invalid", "true");
    });

    it("meninggalkan kolom dengan link tidak valid mengembalikan nilai sebelumnya", () => {
      const onChange = vi.fn();
      render(<DecorationsEditor decorations={[{ ...image, url: "https://ok.example.com/a.png" }]} onChange={onChange} />);
      const input = screen.getByLabelText("Link gambar atau GIF");
      fireEvent.change(input, { target: { value: "bukan link" } });
      fireEvent.blur(input);
      expect(input).toHaveValue("https://ok.example.com/a.png");
      expect(screen.getByText(/nilai sebelumnya kami kembalikan/)).toBeInTheDocument();
    });
  });
});
