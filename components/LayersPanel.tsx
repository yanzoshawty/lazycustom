"use client";

import { CaretDown, CaretUp, DotsSixVertical, Eye, EyeSlash } from "@phosphor-icons/react";
import { Reorder, useDragControls } from "motion/react";
import { layerById, PART_LABELS, PART_LAYER } from "@/lib/design/layers";
import type { Design, LayerId, PartId } from "@/lib/design/model";
import type { Edit } from "./Inspector";

interface Props {
  design: Design;
  selected: LayerId | null;
  onSelect: (layer: LayerId) => void;
  edit: Edit;
}

function LayerRow({
  layer,
  selected,
  onSelect,
  indent = false,
}: {
  layer: LayerId;
  selected: boolean;
  onSelect: (layer: LayerId) => void;
  indent?: boolean;
}) {
  const info = layerById(layer);
  return (
    <li className={indent ? "ml-4 border-l border-line pl-2" : ""}>
      <button
        type="button"
        onClick={() => onSelect(layer)}
        aria-current={selected ? "true" : undefined}
        className={`grid w-full gap-0.5 rounded-field border px-3 py-2 text-left transition ${
          selected
            ? "border-accent bg-accent-soft text-ink"
            : "border-transparent text-ink hover:border-line-strong hover:bg-surface-2"
        }`}
      >
        <span className="font-display text-sm font-semibold">{info.label}</span>
        <span className="text-xs text-ink-2">{info.hint}</span>
      </button>
    </li>
  );
}

const iconButton =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-field text-ink-2 xl:size-8 transition hover:bg-surface-2 hover:text-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-2";

function PartRow({
  part,
  index,
  total,
  selected,
  visible,
  onSelect,
  onToggle,
  onMove,
}: {
  part: PartId;
  index: number;
  total: number;
  selected: boolean;
  /** null berarti bagian ini tidak bisa disembunyikan. */
  visible: boolean | null;
  onSelect: (layer: LayerId) => void;
  onToggle: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const controls = useDragControls();
  const label = PART_LABELS[part];
  const layer = PART_LAYER[part];
  return (
    <Reorder.Item
      as="li"
      value={part}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}
      className={`relative flex items-center gap-1 rounded-field border bg-surface py-1 pl-1 pr-1 ${
        selected ? "border-accent bg-accent-soft" : "border-line"
      }`}
    >
      <button
        type="button"
        aria-label={`Seret ${label} untuk mengubah urutan`}
        onPointerDown={(e) => controls.start(e)}
        className={`${iconButton} cursor-grab touch-none active:cursor-grabbing`}
      >
        <DotsSixVertical size={18} weight="bold" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onSelect(layer)}
        aria-current={selected ? "true" : undefined}
        className="min-w-0 flex-1 truncate rounded-field px-2 py-1.5 text-left text-sm font-semibold text-ink"
      >
        <span className="mr-2 font-mono text-xs font-normal text-ink-3">{index + 1}</span>
        {label}
      </button>
      {visible !== null ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={visible}
          aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
          className={iconButton}
        >
          {visible ? <Eye size={18} weight="bold" aria-hidden="true" /> : <EyeSlash size={18} weight="bold" aria-hidden="true" />}
        </button>
      ) : null}
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label={`Pindahkan ${label} ke atas`}
        className={iconButton}
      >
        <CaretUp size={16} weight="bold" aria-hidden="true" />
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label={`Pindahkan ${label} ke bawah`}
        className={iconButton}
      >
        <CaretDown size={16} weight="bold" aria-hidden="true" />
      </button>
    </Reorder.Item>
  );
}

export function LayersPanel({ design, selected, onSelect, edit }: Props) {
  const order = design.message.order;

  function setOrder(next: PartId[]) {
    edit((d) => ({ ...d, message: { ...d.message, order: next as Design["message"]["order"] } }), "parts.order");
  }

  function move(from: number, to: number) {
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    edit((d) => ({ ...d, message: { ...d.message, order: next as Design["message"]["order"] } }));
  }

  const visibility: Record<PartId, boolean | null> = {
    timestamp: design.timestamp.show,
    name: null,
    badges: design.badges.show,
    message: null,
  };

  function toggle(part: PartId) {
    if (part === "timestamp") edit((d) => ({ ...d, timestamp: { ...d.timestamp, show: !d.timestamp.show } }));
    if (part === "badges") edit((d) => ({ ...d, badges: { show: !d.badges.show } }));
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-2">Pilih layer untuk mengeditnya di Properties. Kamu juga bisa mengklik langsung bagian chat di preview.</p>

      <ul className="grid gap-1">
        <LayerRow layer="panel" selected={selected === "panel"} onSelect={onSelect} />
        <LayerRow layer="row" selected={selected === "row"} onSelect={onSelect} />
        <LayerRow layer="bubble" selected={selected === "bubble"} onSelect={onSelect} indent />
        <LayerRow layer="avatar" selected={selected === "avatar"} onSelect={onSelect} indent />
      </ul>

      <section className="grid gap-2 rounded-panel border border-line bg-surface-2/40 p-3" aria-labelledby="parts-title">
        <div className="grid gap-0.5">
          <h3 id="parts-title" className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">
            Urutan bagian pesan
          </h3>
          <p className="text-xs text-ink-2">Seret ikon titik, atau pakai tombol panah, untuk mengatur urutan dari kiri ke kanan.</p>
        </div>
        <Reorder.Group axis="y" values={order} onReorder={setOrder} as="ul" className="grid gap-1.5">
          {order.map((part, index) => (
            <PartRow
              key={part}
              part={part}
              index={index}
              total={order.length}
              selected={selected === PART_LAYER[part]}
              visible={visibility[part]}
              onSelect={onSelect}
              onToggle={() => toggle(part)}
              onMove={move}
            />
          ))}
        </Reorder.Group>
      </section>

      <ul className="grid gap-1">
        <LayerRow layer="superchat" selected={selected === "superchat"} onSelect={onSelect} />
        <LayerRow layer="membership" selected={selected === "membership"} onSelect={onSelect} />
        <LayerRow layer="sticker" selected={selected === "sticker"} onSelect={onSelect} />
        <LayerRow layer="animation" selected={selected === "animation"} onSelect={onSelect} />
      </ul>
    </div>
  );
}
