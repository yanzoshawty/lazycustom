import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Inspector, type Edit } from "@/components/Inspector";
import { LayersPanel } from "@/components/LayersPanel";
import { LAYERS } from "@/lib/design/layers";
import { designFromTemplate, TEMPLATES } from "@/lib/design/templates";
import type { Design } from "@/lib/design/model";

/** Edit palsu yang menerapkan fungsi ke desain dan mencatat hasilnya. */
function harness(start: Design) {
  let current = start;
  const calls: Array<{ key?: string; result: Design }> = [];
  const edit: Edit = (fn, key) => {
    current = fn(current);
    calls.push({ key, result: current });
  };
  return { edit, calls, get design() { return current; } };
}

describe("LayersPanel", () => {
  const start = () => designFromTemplate("crystal");
  const partNames = () =>
    screen.getAllByRole("listitem").filter((li) => li.querySelector('button[aria-label^="Seret"]')).map((li) => li.querySelector("button.flex-1")!.textContent!.replace(/^\d+/, ""));

  it("menampilkan empat bagian pesan sesuai urutan desain", () => {
    const h = harness(start());
    render(<LayersPanel design={h.design} selected="bubble" onSelect={() => undefined} edit={h.edit} />);
    expect(partNames()).toEqual(["Timestamp", "Name", "Badges", "Message text"]);
  });

  it("tombol panah memindahkan bagian dan menghasilkan urutan yang valid", () => {
    const h = harness(start());
    render(<LayersPanel design={h.design} selected={null} onSelect={() => undefined} edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "Pindahkan Timestamp ke bawah" }));
    expect(h.design.message.order).toEqual(["name", "timestamp", "badges", "message"]);
    fireEvent.click(screen.getByRole("button", { name: "Pindahkan Message text ke atas" }));
    expect(new Set(h.design.message.order).size).toBe(4);
  });

  it("bagian pertama tidak bisa naik dan yang terakhir tidak bisa turun", () => {
    const h = harness(start());
    render(<LayersPanel design={h.design} selected={null} onSelect={() => undefined} edit={h.edit} />);
    expect(screen.getByRole("button", { name: "Pindahkan Timestamp ke atas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pindahkan Message text ke bawah" })).toBeDisabled();
  });

  it("mata Timestamp dan Badges mengubah visibilitas, Name dan Message tidak punya mata", () => {
    const h = harness(start());
    render(<LayersPanel design={h.design} selected={null} onSelect={() => undefined} edit={h.edit} />);
    expect(screen.queryByRole("button", { name: /Sembunyikan Name|Tampilkan Name/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sembunyikan Message|Tampilkan Message/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan Timestamp" }));
    expect(h.design.timestamp.show).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan Badges" }));
    expect(h.design.badges.show).toBe(false);
  });

  it("memilih layer memanggil onSelect dan menandai layer aktif", () => {
    const onSelect = vi.fn();
    const h = harness(start());
    render(<LayersPanel design={h.design} selected="superchat" onSelect={onSelect} edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: /^Membership/ }));
    expect(onSelect).toHaveBeenCalledWith("membership");
    expect(screen.getByRole("button", { name: /^Super Chat/ })).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: /Message text$/ }));
    expect(onSelect).toHaveBeenLastCalledWith("text");
  });
});

describe("Inspector", () => {
  it.each(LAYERS)("layer $id tampil tanpa error dengan judul yang benar", ({ id, label }) => {
    const h = harness(designFromTemplate("crystal"));
    render(<Inspector design={h.design} layer={id} edit={h.edit} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(label);
  });

  it.each(TEMPLATES)("template $id: semua layer bisa dirender", ({ design }) => {
    for (const { id } of LAYERS) {
      const h = harness(design);
      const { unmount } = render(<Inspector design={h.design} layer={id} edit={h.edit} />);
      unmount();
    }
  });

  it("slider ukuran font mengubah desain dengan kunci undo yang tetap", () => {
    const h = harness(designFromTemplate("crystal"));
    render(<Inspector design={h.design} layer="panel" edit={h.edit} />);
    fireEvent.change(screen.getByLabelText("Base font size"), { target: { value: "28" } });
    expect(h.design.fontSize).toBe(28);
    expect(h.calls[0].key).toBe("fontSize");
  });

  it("menyediakan seluruh font di daftar pilihan", () => {
    const h = harness(designFromTemplate("crystal"));
    render(<Inspector design={h.design} layer="panel" edit={h.edit} />);
    const options = within(screen.getByLabelText("Font chat")).getAllByRole("option");
    expect(options.length).toBeGreaterThanOrEqual(11);
    expect(options.map((o) => o.textContent).join("|")).toMatch(/Orbitron/);
  });

  it("layout dan posisi avatar mengubah model", () => {
    const h = harness(designFromTemplate("crystal"));
    render(<Inspector design={h.design} layer="row" edit={h.edit} />);
    fireEvent.click(screen.getByRole("radio", { name: "Stacked" }));
    fireEvent.click(screen.getByRole("radio", { name: "Top" }));
    expect(h.design.message.layout).toBe("stacked");
    expect(h.design.row.avatarPosition).toBe("top");
  });

  it("bubble dimatikan menyembunyikan editor surface", () => {
    const h = harness({ ...designFromTemplate("crystal"), bubble: { ...designFromTemplate("crystal").bubble, show: false } });
    render(<Inspector design={h.design} layer="bubble" edit={h.edit} />);
    expect(screen.getByText(/Nyalakan bubble/)).toBeInTheDocument();
    expect(screen.queryByText("Dekorasi")).not.toBeInTheDocument();
  });

  it("peringatan kontras muncul bila teks sulit dibaca di atas bubble pekat", () => {
    const d = designFromTemplate("frost");
    d.text.color = "#EEF6FA";
    const h = harness(d);
    render(<Inspector design={h.design} layer="text" edit={h.edit} />);
    expect(screen.getByText(/hanya berkontras/)).toBeInTheDocument();
  });

  it("tidak ada peringatan kontras untuk template yang terbaca", () => {
    for (const id of ["crystal", "frost", "pulse"] as const) {
      const h = harness(designFromTemplate(id));
      const { unmount } = render(<Inspector design={h.design} layer="text" edit={h.edit} />);
      expect(screen.queryByText(/hanya berkontras/)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("avatar hexagon menyembunyikan pengaturan ring", () => {
    const d = designFromTemplate("holo");
    const h = harness(d);
    render(<Inspector design={h.design} layer="avatar" edit={h.edit} />);
    expect(screen.getByText(/Ring tidak tersedia untuk bentuk Hexagon/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Ring width")).not.toBeInTheDocument();
  });

  describe("kartu", () => {
    it("Super Chat mode tier menyembunyikan warna teks dan fill, mode Custom menampilkannya", () => {
      const d = designFromTemplate("crystal");
      d.superChat.colorMode = "tier";
      const h = harness(d);
      const { rerender } = render(<Inspector design={h.design} layer="superchat" edit={h.edit} />);
      expect(screen.queryByLabelText("Warna nama", { selector: "input[type=text]" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Warna teks", { selector: "input[type=text]" })).not.toBeInTheDocument();
      expect(screen.getByText(/Warna teks mengikuti YouTube/)).toBeInTheDocument();
      rerender(<Inspector design={{ ...d, superChat: { ...d.superChat, colorMode: "custom" } }} layer="superchat" edit={h.edit} />);
      expect(screen.getByLabelText("Warna nama", { selector: "input[type=text]" })).toBeInTheDocument();
      expect(screen.getByLabelText("Warna teks", { selector: "input[type=text]" })).toBeInTheDocument();
    });

    it("Sticker mode tier tetap menampilkan warna nama karena badannya memakai fill template", () => {
      const d = designFromTemplate("crystal");
      d.sticker.colorMode = "tier";
      const h = harness(d);
      render(<Inspector design={h.design} layer="sticker" edit={h.edit} />);
      expect(screen.getByLabelText("Warna nama", { selector: "input[type=text]" })).toBeInTheDocument();
      expect(screen.queryByLabelText("Warna nominal", { selector: "input[type=text]" })).not.toBeInTheDocument();
    });

    it("Membership tidak punya pilihan tier maupun nominal", () => {
      const h = harness(designFromTemplate("crystal"));
      render(<Inspector design={h.design} layer="membership" edit={h.edit} />);
      expect(screen.queryByText("Tier colors")).not.toBeInTheDocument();
      expect(screen.queryByText("Ukuran nominal")).not.toBeInTheDocument();
    });

    it("mengganti sumber warna Super Chat ke Custom mengubah model", () => {
      const d = designFromTemplate("crystal");
      d.superChat.colorMode = "tier";
      const h = harness(d);
      render(<Inspector design={h.design} layer="superchat" edit={h.edit} />);
      fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
      expect(h.design.superChat.colorMode).toBe("custom");
      expect(h.design.membership).toEqual(d.membership);
    });

    it("slider ukuran sticker mengubah ukuran sticker saja", () => {
      const h = harness(designFromTemplate("crystal"));
      render(<Inspector design={h.design} layer="sticker" edit={h.edit} />);
      fireEvent.change(screen.getByLabelText("Ukuran sticker"), { target: { value: "120" } });
      expect(h.design.sticker.size).toBe(120);
      expect(h.design.superChat).toEqual(designFromTemplate("crystal").superChat);
    });
  });

  it("animasi: semua gaya bisa dipilih", () => {
    const h = harness(designFromTemplate("crystal"));
    render(<Inspector design={h.design} layer="animation" edit={h.edit} />);
    const select = screen.getByLabelText("Gaya animasi");
    expect(within(select).getAllByRole("option")).toHaveLength(8);
    fireEvent.change(select, { target: { value: "blur-in" } });
    expect(h.design.animation.style).toBe("blur-in");
  });
});
