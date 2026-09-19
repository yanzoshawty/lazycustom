import { describe, expect, it } from "vitest";
import { contrastRatio, hexToRgb, normalizeHex, pickEdge, rgba } from "@/lib/color";

describe("normalizeHex", () => {
  it.each([
    ["d6336c", "#D6336C"],
    ["#d6336c", "#D6336C"],
    ["#d3c", "#DD33CC"],
    ["  #ABCDEF ", "#ABCDEF"],
  ])("menerima %s", (input, expected) => expect(normalizeHex(input)).toBe(expected));

  it.each(["", "#12", "#12345", "#1234567", "zzzzzz", "#gg0000", "rgb(0,0,0)"])("menolak %s", (input) =>
    expect(normalizeHex(input)).toBeNull(),
  );
});

describe("warna", () => {
  it("mengubah hex ke rgb", () => expect(hexToRgb("#D6336C")).toEqual([214, 51, 108]));
  it("membatasi opacity antara 0 dan 100", () => {
    expect(rgba("#000000", 150)).toBe("rgba(0, 0, 0, 1)");
    expect(rgba("#000000", -5)).toBe("rgba(0, 0, 0, 0)");
    expect(rgba("#FFFFFF", 50)).toBe("rgba(255, 255, 255, 0.5)");
  });
  it("menghitung rasio kontras hitam dan putih sebesar 21", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
  });
  it("memilih tepi gelap untuk teks terang dan sebaliknya", () => {
    expect(pickEdge("#FFFFFF")).toBe("#101216");
    expect(pickEdge("#101010")).toBe("#F4F5F8");
  });
});
