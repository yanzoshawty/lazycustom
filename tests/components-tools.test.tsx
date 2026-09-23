import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BubbleLayoutEditor } from "@/components/BubbleLayoutEditor";
import type { Edit } from "@/components/Inspector";
import { RoleBubbleEditor } from "@/components/RoleBubbleEditor";
import { AnimatePanel } from "@/components/tools/AnimatePanel";
import { ElementsPanel } from "@/components/tools/ElementsPanel";
import { TextPanel } from "@/components/tools/TextPanel";
import { UploadsPanel } from "@/components/tools/UploadsPanel";
import { parseDesign, type Design } from "@/lib/design/model";
import { designFromTemplate } from "@/lib/design/templates";

function harness(start: Design) {
  let current = start;
  const calls: Array<{ key?: string }> = [];
  const edit: Edit = (fn, key) => {
    current = fn(current);
    calls.push({ key });
  };
  return { edit, calls, get design() { return current; } };
}

/** Setelah tiap perubahan, desain harus tetap lolos skema. Ini menjaga semua panel dari menghasilkan data rusak. */
const stillValid = (d: Design) => expect(parseDesign(JSON.parse(JSON.stringify(d))).ok).toBe(true);

describe("AnimatePanel", () => {
  const setup = (t = "crystal") => {
    const h = harness(designFromTemplate(t as never));
    const open = vi.fn();
    const utils = render(<AnimatePanel design={h.design} edit={h.edit} onOpenLayer={open} />);
    return { h, open, ...utils };
  };

  it("Animate all menerapkan satu preset ke kelima elemen dengan jeda bertahap", () => {
    const { h } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Rise" }));
    expect(Object.values(h.design.elements).map((e) => e.style)).toEqual(["rise", "rise", "rise", "rise", "rise"]);
    expect(Object.values(h.design.elements).map((e) => e.delay)).toEqual([0, 90, 180, 270, 360]);
    stillValid(h.design);
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    expect(Object.values(h.design.elements).every((e) => e.style === "none" && e.delay === 0)).toBe(true);
  });

  it("memilih preset per elemen memunculkan slider durasi dan jeda", () => {
    const { h, rerender } = setup();
    expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "wipe" } });
    expect(h.design.elements.name.style).toBe("wipe");
    rerender(<AnimatePanel design={h.design} edit={h.edit} onOpenLayer={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "700" } });
    fireEvent.change(screen.getByLabelText("Delay"), { target: { value: "200" } });
    expect(h.design.elements.name).toEqual({ style: "wipe", duration: 700, delay: 200 });
    stillValid(h.design);
  });

  it("menambah dan menghapus efek, dan efek baru langsung valid", () => {
    const { h, rerender } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Glitch" }));
    expect(h.design.effects).toHaveLength(1);
    expect(h.design.effects[0]).toMatchObject({ kind: "glitch", speed: 5, intensity: 5 });
    stillValid(h.design);
    rerender(<AnimatePanel design={h.design} edit={h.edit} onOpenLayer={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus efek Glitch #1" }));
    expect(h.design.effects).toEqual([]);
  });

  it("membatasi efek enam", () => {
    const d = designFromTemplate("crystal");
    d.effects = Array.from({ length: 6 }, (_, i) => ({ id: `fx-float-${i}abc`, kind: "float" as const, speed: 5, intensity: 5 }));
    const h = harness(d);
    render(<AnimatePanel design={h.design} edit={h.edit} onOpenLayer={() => undefined} />);
    expect(screen.getByRole("button", { name: "Float" })).toBeDisabled();
    expect(screen.getByText(/Efek yang berulang terus memakai CPU/)).toBeInTheDocument();
  });

  it("efek yang syaratnya belum ada diberi tahu, dan yang siap tidak", () => {
    const d = designFromTemplate("plain");
    d.effects = [
      { id: "fx-shimmer-aaaa", kind: "shimmer", speed: 5, intensity: 5 },
      { id: "fx-spin-bbbb", kind: "spin", speed: 5, intensity: 5 },
      { id: "fx-float-cccc", kind: "float", speed: 5, intensity: 5 },
    ];
    const h = harness(d);
    render(<AnimatePanel design={h.design} edit={h.edit} onOpenLayer={() => undefined} />);
    expect(screen.getAllByText(/^Belum aktif/)).toHaveLength(2);
  });

  it("slider speed dan intensity mengubah efek yang dipilih saja", () => {
    const d = designFromTemplate("crystal");
    d.effects = [
      { id: "fx-float-aaaa", kind: "float", speed: 5, intensity: 5 },
      { id: "fx-pulse-bbbb", kind: "pulse", speed: 5, intensity: 5 },
    ];
    const h = harness(d);
    render(<AnimatePanel design={h.design} edit={h.edit} onOpenLayer={() => undefined} />);
    fireEvent.change(screen.getAllByLabelText("Speed")[1], { target: { value: "9" } });
    expect(h.design.effects[0].speed).toBe(5);
    expect(h.design.effects[1].speed).toBe(9);
  });

  it("tombol atur animasi bubble membuka layer animation", () => {
    const { open } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Atur animasi bubble masuk" }));
    expect(open).toHaveBeenCalledWith("animation");
  });
});

describe("TextPanel", () => {
  const setup = (d = designFromTemplate("crystal")) => {
    const h = harness(d);
    const utils = render(<TextPanel design={h.design} edit={h.edit} />);
    return { h, ...utils };
  };

  it("menambah label dari preset dengan gaya siap pakai dan membatasi dua", () => {
    const { h, rerender } = setup();
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    expect(h.design.labels[0]).toMatchObject({ text: "LIVE", roles: "all", position: "start" });
    stillValid(h.design);
    rerender(<TextPanel design={h.design} edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "VIP" }));
    rerender(<TextPanel design={h.design} edit={h.edit} />);
    expect(h.design.labels).toHaveLength(2);
    expect(screen.getByRole("button", { name: "HOT" })).toBeDisabled();
    expect(screen.getByText(/Batas dua label tercapai/)).toBeInTheDocument();
  });

  it("mengubah teks label yang aman langsung masuk desain", () => {
    const d = designFromTemplate("crystal");
    const h0 = harness(d);
    const { rerender } = render(<TextPanel design={h0.design} edit={h0.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "MOD" }));
    rerender(<TextPanel design={h0.design} edit={h0.edit} />);
    fireEvent.change(screen.getByLabelText("Teks label"), { target: { value: "STAR \u2605" } });
    expect(h0.design.labels[0].text).toBe("STAR \u2605");
    stillValid(h0.design);
  });

  // Baris baru tidak diuji: kolom teks membuangnya sebelum sampai ke aplikasi, jadi tidak bisa masuk sama sekali.
  it.each([["a".repeat(25)], ["a\u0000b"], ["a\u2028b"]])("menolak teks label tidak aman %j dengan pesan dan tanpa mengubah desain", (bad) => {
    const d = designFromTemplate("crystal");
    const h = harness(d);
    const { rerender } = render(<TextPanel design={h.design} edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "NEW" }));
    rerender(<TextPanel design={h.design} edit={h.edit} />);
    fireEvent.change(screen.getByLabelText("Teks label"), { target: { value: bad } });
    expect(screen.getByText(/Maksimal 24 karakter/)).toBeInTheDocument();
    expect(h.design.labels[0].text).toBe("NEW");
  });

  it("peran, posisi, dan warna label mengubah label yang benar", () => {
    const h = harness(designFromTemplate("crystal"));
    const { rerender } = render(<TextPanel design={h.design} edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "MEMBER" }));
    rerender(<TextPanel design={h.design} edit={h.edit} />);
    fireEvent.click(screen.getByRole("radio", { name: "Member" }));
    fireEvent.click(screen.getByRole("radio", { name: "End" }));
    expect(h.design.labels[0]).toMatchObject({ roles: "member", position: "end" });
    stillValid(h.design);
  });

  it("menghapus label", () => {
    const h = harness(designFromTemplate("crystal"));
    const { rerender } = render(<TextPanel design={h.design} edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "LIVE" }));
    rerender(<TextPanel design={h.design} edit={h.edit} />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus label 1" }));
    expect(h.design.labels).toEqual([]);
  });

  it("awalan dan akhiran nama serta pesan tersimpan terpisah", () => {
    const h = harness(designFromTemplate("crystal"));
    render(<TextPanel design={h.design} edit={h.edit} />);
    fireEvent.change(screen.getByLabelText("Name prefix"), { target: { value: "\u2605 " } });
    fireEvent.change(screen.getByLabelText("Message suffix"), { target: { value: " !" } });
    expect(h.design.affixes).toEqual({ name: { prefix: "\u2605 ", suffix: "" }, message: { prefix: "", suffix: " !" } });
    stillValid(h.design);
  });

  it("memberi petunjuk bahwa letak label diatur di Row saat layout grid atau free", () => {
    const d = designFromTemplate("crystal");
    d.message.layout = "grid";
    setup(d);
    expect(screen.getByText(/letak label diatur di panel Row/)).toBeInTheDocument();
  });
});

describe("ElementsPanel", () => {
  const setup = (d = designFromTemplate("plain")) => {
    const h = harness(d);
    const open = vi.fn();
    const notice = vi.fn();
    const utils = render(<ElementsPanel design={h.design} edit={h.edit} onOpenLayer={open} onNotice={notice} />);
    return { h, open, notice, ...utils };
  };

  it("menambah dekorasi ke bubble dan memberi tahu", () => {
    const { h, notice } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Halftone/ }));
    expect(h.design.bubble.decorations.some((x) => x.kind === "halftone")).toBe(true);
    expect(notice).toHaveBeenCalledWith("Halftone ditambahkan ke Bubble");
    stillValid(h.design);
  });

  it("target Super Chat menambah ke surface kartu itu, bukan bubble", () => {
    const { h } = setup();
    fireEvent.click(screen.getByRole("radio", { name: "Super Chat" }));
    fireEvent.click(screen.getByRole("button", { name: /Stripes/ }));
    expect(h.design.superChat.surface.decorations.some((x) => x.kind === "stripes")).toBe(true);
    expect(h.design.bubble.decorations.some((x) => x.kind === "stripes")).toBe(false);
    stillValid(h.design);
  });

  it("gradient border hanya satu per permukaan", () => {
    const d = designFromTemplate("crystal");
    setup(d);
    expect(screen.getByRole("button", { name: /Gradient border/ })).toBeDisabled();
  });

  it("mengubah bentuk sudut dan menampilkan ukuran potongan", () => {
    const { h, rerender } = setup();
    expect(screen.queryByLabelText("Cut size")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Chamfer" }));
    expect(h.design.bubble.shape).toBe("chamfer");
    rerender(<ElementsPanel design={h.design} edit={h.edit} onOpenLayer={() => undefined} onNotice={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Cut size"), { target: { value: "20" } });
    expect(h.design.bubble.cut).toBe(20);
    stillValid(h.design);
  });

  it("tombol pintasan membuka Properties yang sesuai", () => {
    const { open } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Edit di Properties" }));
    expect(open).toHaveBeenLastCalledWith("bubble");
    fireEvent.click(screen.getByRole("button", { name: "Tambah gambar panel" }));
    expect(open).toHaveBeenLastCalledWith("panel");
  });

  it("batas delapan elemen menonaktifkan semua tombol tambah", () => {
    const d = designFromTemplate("plain");
    d.bubble.decorations = Array.from({ length: 8 }, (_, i) => ({ id: `glow-${i}abc`, kind: "glow" as const, color: "#FFFFFF", blur: 4, spread: 0, opacity: 20 }));
    setup(d);
    expect(screen.getByRole("button", { name: /Scanlines/ })).toBeDisabled();
  });
});

describe("BubbleLayoutEditor", () => {
  it("tidak menampilkan apa pun untuk layout inline atau stacked", () => {
    const h = harness(designFromTemplate("crystal"));
    const { container } = render(<BubbleLayoutEditor design={h.design} edit={h.edit} dragMode={false} onDragMode={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  describe("grid", () => {
    const grid = () => {
      const d = designFromTemplate("crystal");
      d.message.layout = "grid";
      return harness(d);
    };

    it("preset kerangka mengganti seluruh grid dengan salinan", () => {
      const h = grid();
      render(<BubbleLayoutEditor design={h.design} edit={h.edit} dragMode={false} onDragMode={() => undefined} />);
      fireEvent.click(screen.getByRole("button", { name: "Nama di atas pesan" }));
      expect(h.design.message.grid.columns).toEqual([1]);
      expect(h.design.message.grid.cells.message).toMatchObject({ col: 1, row: 2, alignX: "stretch" });
      stillValid(h.design);
    });

    it("jumlah kolom menambah atau memotong lebar kolom", () => {
      const h = grid();
      const { rerender } = render(<BubbleLayoutEditor design={h.design} edit={h.edit} dragMode={false} onDragMode={() => undefined} />);
      fireEvent.change(screen.getByLabelText("Columns"), { target: { value: "3" } });
      expect(h.design.message.grid.columns).toHaveLength(3);
      rerender(<BubbleLayoutEditor design={h.design} edit={h.edit} dragMode={false} onDragMode={() => undefined} />);
      fireEvent.change(screen.getByLabelText("Column 2 width"), { target: { value: "5" } });
      expect(h.design.message.grid.columns[1]).toBe(5);
      fireEvent.change(screen.getByLabelText("Columns"), { target: { value: "1" } });
      expect(h.design.message.grid.columns).toHaveLength(1);
      stillValid(h.design);
    });

    it("mengubah sel sebuah bagian hanya mengubah bagian itu", () => {
      const h = grid();
      render(<BubbleLayoutEditor design={h.design} edit={h.edit} dragMode={false} onDragMode={() => undefined} />);
      const before = JSON.stringify(h.design.message.grid.cells.message);
      const nameCell = screen.getByText("Name").closest("details")!;
      const alignX = within(nameCell).getByRole("group", { name: "Align X", hidden: true });
      fireEvent.click(within(alignX).getByRole("radio", { name: "Center", hidden: true }));
      expect(h.design.message.grid.cells.name.alignX).toBe("center");
      expect(JSON.stringify(h.design.message.grid.cells.message)).toBe(before);
      stillValid(h.design);
    });
  });

  describe("free", () => {
    const free = () => {
      const d = designFromTemplate("crystal");
      d.message.layout = "free";
      return harness(d);
    };

    it("mengatur ukuran bubble dan koordinat bagian", () => {
      const h = free();
      render(<BubbleLayoutEditor design={h.design} edit={h.edit} dragMode={false} onDragMode={() => undefined} />);
      fireEvent.change(screen.getByLabelText("Width"), { target: { value: "400" } });
      fireEvent.change(screen.getByLabelText("Height"), { target: { value: "90" } });
      expect(h.design.message.free).toMatchObject({ width: 400, height: 90 });
      const nameRow = screen.getByText("Name").closest("details")!;
      fireEvent.change(within(nameRow).getByLabelText("X"), { target: { value: "55" } });
      expect(h.design.message.free.parts.name.x).toBe(55);
      stillValid(h.design);
    });

    it("pesan punya lebar teks dan jumlah baris maksimum", () => {
      const h = free();
      render(<BubbleLayoutEditor design={h.design} edit={h.edit} dragMode={false} onDragMode={() => undefined} />);
      const msg = screen.getByText("Message text").closest("details")!;
      fireEvent.change(within(msg).getByLabelText("Max lines"), { target: { value: "4" } });
      expect(h.design.message.free.parts.message.lines).toBe(4);
    });

    it("toggle Drag di preview memanggil onDragMode", () => {
      const h = free();
      const onDrag = vi.fn();
      render(<BubbleLayoutEditor design={h.design} edit={h.edit} dragMode={false} onDragMode={onDrag} />);
      fireEvent.click(screen.getByRole("switch", { name: /Drag di preview/ }));
      expect(onDrag).toHaveBeenCalledWith(true);
    });
  });
});

describe("RoleBubbleEditor", () => {
  const setup = () => {
    const h = harness(designFromTemplate("crystal"));
    const utils = render(
      <RoleBubbleEditor design={h.design} edit={h.edit}>
        <p>EDITOR-DEFAULT</p>
      </RoleBubbleEditor>,
    );
    return { h, ...utils };
  };

  it("tab Default menampilkan editor bubble utama", () => {
    setup();
    expect(screen.getByText("EDITOR-DEFAULT")).toBeInTheDocument();
  });

  it("tab peran tanpa override menjelaskan bahwa ia memakai bubble Default", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Owner" }));
    expect(screen.queryByText("EDITOR-DEFAULT")).not.toBeInTheDocument();
    expect(screen.getByText(/Owner saat ini memakai bubble Default/)).toBeInTheDocument();
  });

  it("menyalakan custom bubble menyalin bubble utama tanpa show dan roleTint", () => {
    const { h } = setup();
    fireEvent.click(screen.getByRole("radio", { name: "Member" }));
    fireEvent.click(screen.getByRole("switch", { name: /Custom bubble untuk Member/ }));
    const o = h.design.roleBubbles.member!;
    expect(o.surface.fill).toEqual(h.design.bubble.fill);
    expect(o.surface.decorations).toEqual(h.design.bubble.decorations);
    expect(o.surface).not.toHaveProperty("show");
    expect(o.surface).not.toHaveProperty("roleTint");
    expect(o.textColor).toBeNull();
    stillValid(h.design);
    // Salinan dalam: mengubah override tidak boleh mengubah bubble utama.
    o.surface.decorations.pop();
    expect(h.design.bubble.decorations.length).toBeGreaterThan(o.surface.decorations.length);
  });

  it("mematikan custom bubble mengembalikan override menjadi null", () => {
    const { h, rerender } = setup();
    fireEvent.click(screen.getByRole("radio", { name: "Moderator" }));
    fireEvent.click(screen.getByRole("switch", { name: /Custom bubble untuk Moderator/ }));
    expect(h.design.roleBubbles.moderator).not.toBeNull();
    rerender(
      <RoleBubbleEditor design={h.design} edit={h.edit}>
        <p>EDITOR-DEFAULT</p>
      </RoleBubbleEditor>,
    );
    fireEvent.click(screen.getByRole("switch", { name: /Custom bubble untuk Moderator/ }));
    expect(h.design.roleBubbles.moderator).toBeNull();
    stillValid(h.design);
  });
});

describe("UploadsPanel", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
  const GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  const withImages = () => {
    const d = designFromTemplate("crystal");
    d.bubble.decorations.push({ id: "image-pin-aaaa", kind: "image-pin", url: PNG, anchor: "top-left", width: 20, offsetX: 0, offsetY: 0 });
    d.avatar.frame = { url: GIF, scale: 130 };
    d.panelImages = [{ id: "panel-bbbb", url: "https://cdn.example.com/x.png", layer: "front", anchor: "top-right", width: 40, height: 40, offsetX: 0, offsetY: 0, opacity: 100, fit: "contain" }];
    return harness(d);
  };

  it("menampilkan keadaan kosong tanpa gambar", () => {
    const h = harness(designFromTemplate("crystal"));
    render(<UploadsPanel design={h.design} edit={h.edit} onNotice={() => undefined} />);
    expect(screen.getByText("Belum ada gambar di desain ini.")).toBeInTheDocument();
  });

  it("mendaftar semua gambar dengan jenis, ukuran, dan jumlah pemakaian", () => {
    const h = withImages();
    render(<UploadsPanel design={h.design} edit={h.edit} onNotice={() => undefined} />);
    expect(screen.getByText(/Gambar di desain ini \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/^PNG, \d+ KB/)).toBeInTheDocument();
    expect(screen.getByText("cdn.example.com")).toBeInTheDocument();
    expect(screen.getAllByText(/Dipakai di 1 tempat/)).toHaveLength(3);
  });

  it("hanya gambar unggahan yang dipratinjau, gambar dari link tidak dimuat", () => {
    const h = withImages();
    const { container } = render(<UploadsPanel design={h.design} edit={h.edit} onNotice={() => undefined} />);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs).toEqual([PNG, GIF]);
    expect(srcs.join()).not.toContain("https://");
  });

  it("Adjust nonaktif untuk GIF dan link, aktif untuk PNG", () => {
    const h = withImages();
    render(<UploadsPanel design={h.design} edit={h.edit} onNotice={() => undefined} />);
    expect(screen.getByRole("button", { name: "Adjust gambar PNG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Adjust gambar GIF" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adjust gambar LINK" })).toBeDisabled();
  });

  it("Adjust membuka editor gambar dan Cancel menutupnya", () => {
    const h = withImages();
    render(<UploadsPanel design={h.design} edit={h.edit} onNotice={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Adjust gambar PNG" }));
    expect(screen.getByRole("dialog", { name: "Adjust image" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("editor gambar dirender di body lewat portal, bukan di dalam kolom yang menampungnya", () => {
    const h = withImages();
    const { container } = render(
      <aside data-testid="kolom">
        <UploadsPanel design={h.design} edit={h.edit} onNotice={() => undefined} />
      </aside>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Adjust gambar PNG" }));
    const dialog = screen.getByRole("dialog", { name: "Adjust image" });
    // Di dalam kolom yang menempel modal terkurung stacking context dan tertutup area preview.
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.closest("aside")).toBeNull();
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("menghapus gambar mengosongkan semua slot yang memakainya", () => {
    const h = withImages();
    render(<UploadsPanel design={h.design} edit={h.edit} onNotice={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus gambar PNG" }));
    expect(JSON.stringify(h.design)).not.toContain(PNG);
    expect(h.design.bubble.decorations.filter((x) => x.kind === "image-pin")).toHaveLength(1);
    stillValid(h.design);
  });
});
