import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorField, FillField, Segmented, SliderField, TextField, ToggleField } from "@/components/controls";
import type { Fill } from "@/lib/design/model";

describe("ColorField", () => {
  it("memanggil onChange saat kode hex lengkap diketik", () => {
    const onChange = vi.fn();
    render(<ColorField label="Warna teks" value="#112233" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Warna teks", { selector: "input[type=text]" }), { target: { value: "#aabbcc" } });
    expect(onChange).toHaveBeenCalledWith("#AABBCC");
  });

  it("tidak memanggil onChange untuk kode setengah jadi, dan menampilkan bantuan saat ditinggalkan", () => {
    const onChange = vi.fn();
    render(<ColorField label="Warna teks" value="#112233" onChange={onChange} />);
    const input = screen.getByLabelText("Warna teks", { selector: "input[type=text]" });
    fireEvent.change(input, { target: { value: "#12" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(screen.getByText(/Kode warna harus 6 karakter/)).toBeInTheDocument();
    expect(input).toHaveValue("#112233");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("menerima kode tanpa tanda # dan mengubahnya menjadi huruf besar", () => {
    const onChange = vi.fn();
    render(<ColorField label="W" value="#000000" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("W", { selector: "input[type=text]" }), { target: { value: "ffcc00" } });
    expect(onChange).toHaveBeenCalledWith("#FFCC00");
  });

  it("pemilih warna bawaan browser mengirim hex huruf besar", () => {
    const onChange = vi.fn();
    render(<ColorField label="W" value="#000000" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("W, pemilih warna"), { target: { value: "#12ab34" } });
    expect(onChange).toHaveBeenCalledWith("#12AB34");
  });

  it("menolak kode yang mencoba menyelipkan CSS", () => {
    const onChange = vi.fn();
    render(<ColorField label="W" value="#000000" onChange={onChange} />);
    const input = screen.getByLabelText("W", { selector: "input[type=text]" });
    fireEvent.change(input, { target: { value: "#FFF;}body" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Segmented dan ToggleField", () => {
  it("memilih opsi memanggil onChange dengan nilainya", () => {
    const onChange = vi.fn();
    render(<Segmented label="Layout" value="inline" onChange={onChange} options={[{ value: "inline", label: "Inline" }, { value: "stacked", label: "Stacked" }]} />);
    expect(screen.getByRole("radio", { name: "Inline" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Stacked" }));
    expect(onChange).toHaveBeenCalledWith("stacked");
  });

  it("switch mengirim status baru", () => {
    const onChange = vi.fn();
    render(<ToggleField label="Tampilkan" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: /Tampilkan/ }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("SliderField dan TextField", () => {
  it("slider mengirim angka, bukan teks", () => {
    const onChange = vi.fn();
    render(<SliderField label="Radius" value={10} min={0} max={32} unit="px" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Radius"), { target: { value: "24" } });
    expect(onChange).toHaveBeenCalledWith(24);
    expect(screen.getByText("10px")).toBeInTheDocument();
  });

  it("TextField menampilkan pesan error dan menandai aria-invalid", () => {
    render(<TextField label="Link" value="x" error="Salah" onChange={() => undefined} />);
    expect(screen.getByLabelText("Link")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Salah")).toBeInTheDocument();
  });
});

describe("FillField", () => {
  const solid: Fill = { mode: "solid", color: "#112233", color2: "#112233", angle: 135, opacity: 80 };
  const gradient: Fill = { mode: "gradient", color: "#112233", color2: "#445566", angle: 90, opacity: 70 };

  it("mode None menyembunyikan warna dan opacity", () => {
    render(<FillField label="Jenis fill" value={{ ...solid, mode: "none" }} onChange={() => undefined} />);
    expect(screen.queryByText("Opacity")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Warna", { selector: "input[type=text]" })).not.toBeInTheDocument();
  });

  it("mode Solid hanya menampilkan satu warna, Gradient menampilkan dua warna dan angle", () => {
    const { rerender } = render(<FillField label="Jenis fill" value={solid} onChange={() => undefined} />);
    expect(screen.queryByText("End color")).not.toBeInTheDocument();
    expect(screen.queryByText("Angle")).not.toBeInTheDocument();
    rerender(<FillField label="Jenis fill" value={gradient} onChange={() => undefined} />);
    expect(screen.getByText("End color")).toBeInTheDocument();
    expect(screen.getByText("Angle")).toBeInTheDocument();
  });

  it("mengganti mode mempertahankan warna dan opacity", () => {
    const onChange = vi.fn();
    render(<FillField label="Jenis fill" value={solid} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Gradient" }));
    expect(onChange).toHaveBeenCalledWith({ ...solid, mode: "gradient" });
  });

  it("warna solid menyamakan warna kedua supaya berpindah ke gradient tetap konsisten", () => {
    const onChange = vi.fn();
    render(<FillField label="Jenis fill" value={solid} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Warna", { selector: "input[type=text]" }), { target: { value: "#ABCDEF" } });
    expect(onChange).toHaveBeenCalledWith({ ...solid, color: "#ABCDEF", color2: "#ABCDEF" });
  });

  it("allowNone=false menyembunyikan pilihan None", () => {
    render(<FillField label="Jenis fill" allowNone={false} value={solid} onChange={() => undefined} />);
    expect(screen.queryByRole("radio", { name: "None" })).not.toBeInTheDocument();
  });
});
