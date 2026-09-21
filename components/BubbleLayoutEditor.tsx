"use client";

import { GRID_PARTS, type Design, type GridCell, type GridLayout, type GridPart } from "@/lib/design/model";
import { Section, Segmented, SliderField, ToggleField } from "./controls";
import type { Edit } from "./Inspector";

const PART_LABEL: Record<GridPart, string> = {
  timestamp: "Timestamp",
  name: "Name",
  badges: "Badges",
  message: "Message text",
  label1: "Label 1",
  label2: "Label 2",
};

const cell = (col: number, row: number, alignX: GridCell["alignX"] = "start", colSpan = 1, alignY: GridCell["alignY"] = "center"): GridCell => ({
  col,
  row,
  colSpan,
  rowSpan: 1,
  alignX,
  alignY,
});

/** Susunan siap pakai sebagai titik awal kerangka. */
const GRID_PRESETS: Array<{ id: string; label: string; grid: GridLayout }> = [
  {
    id: "stack",
    label: "Nama di atas pesan",
    grid: {
      columns: [1],
      rows: 2,
      gap: 6,
      cells: { name: cell(1, 1), badges: cell(1, 1, "center"), timestamp: cell(1, 1, "end"), message: cell(1, 2, "stretch"), label1: cell(1, 1, "end"), label2: cell(1, 1, "end") },
    },
  },
  {
    id: "side",
    label: "Nama di kiri, pesan di kanan",
    grid: {
      columns: [1, 3],
      rows: 1,
      gap: 10,
      cells: { name: cell(1, 1), badges: cell(1, 1, "end"), timestamp: cell(2, 1, "end"), message: cell(2, 1, "start"), label1: cell(1, 1, "end"), label2: cell(2, 1, "end") },
    },
  },
  {
    id: "header",
    label: "Header di atas, pesan lebar",
    grid: {
      columns: [1, 3],
      rows: 2,
      gap: 6,
      cells: { name: cell(1, 1), badges: cell(2, 1), timestamp: cell(2, 1, "end"), message: cell(1, 2, "stretch", 2), label1: cell(1, 1), label2: cell(2, 1, "end") },
    },
  },
];

interface Props {
  design: Design;
  edit: Edit;
  dragMode: boolean;
  onDragMode: (on: boolean) => void;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

function GridEditor({ design, edit }: Pick<Props, "design" | "edit">) {
  const g = design.message.grid;
  const setGrid = (fn: (x: GridLayout) => GridLayout, key: string) => edit((d) => ({ ...d, message: { ...d.message, grid: fn(d.message.grid) } }), key);
  const setCell = (part: GridPart, patch: Partial<GridCell>, key: string) => setGrid((x) => ({ ...x, cells: { ...x.cells, [part]: { ...x.cells[part], ...patch } } }), key);

  return (
    <div className="grid gap-5">
      <Section title="Grid presets">
        <div className="flex flex-wrap gap-2">
          {GRID_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => edit((d) => ({ ...d, message: { ...d.message, grid: JSON.parse(JSON.stringify(p.grid)) as GridLayout } }))}
              className="h-9 rounded-field border border-line-strong bg-surface px-3 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Grid">
        <SliderField
          label="Columns"
          value={g.columns.length}
          min={1}
          max={3}
          onChange={(n) => setGrid((x) => ({ ...x, columns: n > x.columns.length ? [...x.columns, ...Array(n - x.columns.length).fill(1)] : x.columns.slice(0, n) }), "grid.columns")}
        />
        {g.columns.map((c, i) => (
          <SliderField
            key={i}
            label={`Column ${i + 1} width`}
            value={c}
            min={1}
            max={8}
            unit="fr"
            onChange={(v) => setGrid((x) => ({ ...x, columns: x.columns.map((w, k) => (k === i ? v : w)) }), `grid.col.${i}`)}
          />
        ))}
        <SliderField label="Rows" value={g.rows} min={1} max={3} onChange={(rows) => setGrid((x) => ({ ...x, rows }), "grid.rows")} />
        <SliderField label="Gap" value={g.gap} min={0} max={20} unit="px" onChange={(gap) => setGrid((x) => ({ ...x, gap }), "grid.gap")} />
      </Section>

      <Section title="Cells">
        <ul className="grid gap-2">
          {GRID_PARTS.map((part) => {
            const c = g.cells[part];
            return (
              <li key={part}>
                <details className="group rounded-field border border-line bg-surface-2/50">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 font-display text-sm font-semibold text-ink">
                    <span>{PART_LABEL[part]}</span>
                    <span className="font-mono text-xs font-normal text-ink-3">
                      c{Math.min(c.col, g.columns.length)} r{Math.min(c.row, g.rows)}
                    </span>
                  </summary>
                  <div className="grid gap-4 border-t border-line p-3">
                    <Segmented label="Column" small value={Math.min(c.col, g.columns.length)} options={range(g.columns.length).map((n) => ({ value: n, label: String(n) }))} onChange={(col) => setCell(part, { col }, `grid.${part}.col`)} />
                    <Segmented label="Row" small value={Math.min(c.row, g.rows)} options={range(g.rows).map((n) => ({ value: n, label: String(n) }))} onChange={(row) => setCell(part, { row }, `grid.${part}.row`)} />
                    <Segmented label="Column span" small value={c.colSpan} options={range(g.columns.length).map((n) => ({ value: n, label: String(n) }))} onChange={(colSpan) => setCell(part, { colSpan }, `grid.${part}.colSpan`)} />
                    <Segmented label="Row span" small value={c.rowSpan} options={range(g.rows).map((n) => ({ value: n, label: String(n) }))} onChange={(rowSpan) => setCell(part, { rowSpan }, `grid.${part}.rowSpan`)} />
                    <Segmented
                      label="Align X"
                      small
                      value={c.alignX}
                      options={[
                        { value: "start", label: "Start" },
                        { value: "center", label: "Center" },
                        { value: "end", label: "End" },
                        { value: "stretch", label: "Stretch" },
                      ]}
                      onChange={(alignX) => setCell(part, { alignX }, `grid.${part}.alignX`)}
                    />
                    <Segmented
                      label="Align Y"
                      small
                      value={c.alignY}
                      options={[
                        { value: "start", label: "Start" },
                        { value: "center", label: "Center" },
                        { value: "end", label: "End" },
                      ]}
                      onChange={(alignY) => setCell(part, { alignY }, `grid.${part}.alignY`)}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

function FreeEditor({ design, edit, dragMode, onDragMode }: Props) {
  const f = design.message.free;
  const setFree = (fn: (x: Design["message"]["free"]) => Design["message"]["free"], key: string) => edit((d) => ({ ...d, message: { ...d.message, free: fn(d.message.free) } }), key);
  const setPart = (part: GridPart, patch: Record<string, number>, key: string) =>
    setFree((x) => ({ ...x, parts: { ...x.parts, [part]: { ...x.parts[part], ...patch } } }), key);

  return (
    <div className="grid gap-5">
      <ToggleField label="Drag di preview" hint="Geser nama, pesan, timestamp, dan lencana langsung di preview. Slider di bawah tetap bisa dipakai lewat keyboard." checked={dragMode} onChange={onDragMode} />
      <p className="rounded-field bg-surface-2 px-3 py-2 text-xs text-ink-2">
        Di mode Free ukuran bubble dikunci dan tiap bagian ditaruh di koordinat sendiri. Pesan yang terlalu panjang dipotong sesuai jumlah barisnya.
      </p>
      <Section title="Bubble size">
        <SliderField label="Width" value={f.width} min={160} max={640} unit="px" onChange={(width) => setFree((x) => ({ ...x, width }), "free.width")} />
        <SliderField label="Height" value={f.height} min={32} max={240} unit="px" onChange={(height) => setFree((x) => ({ ...x, height }), "free.height")} />
      </Section>
      <Section title="Parts">
        <ul className="grid gap-2">
          {GRID_PARTS.map((part) => {
            const p = f.parts[part];
            return (
              <li key={part}>
                <details className="rounded-field border border-line bg-surface-2/50">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 font-display text-sm font-semibold text-ink">
                    <span>{PART_LABEL[part]}</span>
                    <span className="font-mono text-xs font-normal text-ink-3">
                      {p.x}, {p.y}
                    </span>
                  </summary>
                  <div className="grid gap-4 border-t border-line p-3">
                    <SliderField label="X" value={p.x} min={-60} max={600} unit="px" onChange={(x) => setPart(part, { x }, `free.${part}.x`)} />
                    <SliderField label="Y" value={p.y} min={-40} max={300} unit="px" onChange={(y) => setPart(part, { y }, `free.${part}.y`)} />
                    {part === "message" ? (
                      <>
                        <SliderField label="Text width" value={f.parts.message.w} min={0} max={600} unit="px" hint="0 berarti mengikuti sisa lebar bubble." onChange={(w) => setPart("message", { w }, "free.message.w")} />
                        <SliderField label="Max lines" value={f.parts.message.lines} min={1} max={6} onChange={(lines) => setPart("message", { lines }, "free.message.lines")} />
                      </>
                    ) : null}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

export function BubbleLayoutEditor(props: Props) {
  const layout = props.design.message.layout;
  if (layout === "grid") return <GridEditor design={props.design} edit={props.edit} />;
  if (layout === "free") return <FreeEditor {...props} />;
  return null;
}
