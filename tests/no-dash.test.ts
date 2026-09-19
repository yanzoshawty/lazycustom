import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Aturan desain: tidak ada em-dash atau en-dash di teks yang bisa terlihat user. */
const ROOT = path.resolve(__dirname, "..");
const DIRS = ["app", "components", "lib"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("tanda pisah", () => {
  const files = DIRS.flatMap((d) => walk(path.join(ROOT, d))).filter((f) => /\.(tsx?|css)$/.test(f));

  it("menemukan berkas untuk diperiksa", () => expect(files.length).toBeGreaterThan(20));

  it.each(files.map((f) => path.relative(ROOT, f)))("%s bebas em-dash dan en-dash", (rel) => {
    const text = readFileSync(path.join(ROOT, rel), "utf8");
    const hits = text.split("\n").flatMap((line, i) => (/[\u2013\u2014]/.test(line) ? [`baris ${i + 1}: ${line.trim()}`] : []));
    expect(hits).toEqual([]);
  });
});
