"use client";

import { FONT_IDS, FONTS } from "@/lib/fonts";
import { contrastRatio } from "@/lib/color";
import { ANIMATION_STYLES, EASINGS, type AnimationStyle, type Card, type Design, type LayerId, type Surface } from "@/lib/design/model";
import { layerById } from "@/lib/design/layers";
import { ColorField, FillField, Hint, Section, SelectField, Segmented, SliderField, ToggleField } from "./controls";
import { SurfaceEditor } from "./SurfaceEditor";

export type Edit = (fn: (d: Design) => Design, key?: string) => void;

const WEIGHTS = [
  { value: 400 as const, label: "Regular" },
  { value: 500 as const, label: "Medium" },
  { value: 600 as const, label: "Semi" },
  { value: 700 as const, label: "Bold" },
];

const ANIMATION_LABEL: Record<AnimationStyle, string> = {
  none: "None (tanpa animasi)",
  fade: "Fade",
  "slide-up": "Slide up",
  "slide-left": "Slide from left",
  "slide-right": "Slide from right",
  pop: "Pop",
  zoom: "Zoom",
  "blur-in": "Blur in",
};

const EASING_LABEL = { smooth: "Smooth", snappy: "Snappy", bounce: "Bounce", linear: "Linear" } as const;

function bubbleContrast(d: Design): number | null {
  const b = d.bubble;
  if (!b.show || b.fill.mode === "none" || b.fill.opacity < 70) return null;
  const colors = b.fill.mode === "gradient" ? [b.fill.color, b.fill.color2] : [b.fill.color];
  return Math.min(...colors.map((c) => contrastRatio(d.text.color, c)));
}

/* ---------- Kartu ---------- */

type CardKey = "superChat" | "membership" | "sticker";

const CARD_LABEL: Record<CardKey, string> = { superChat: "Super Chat", membership: "Membership", sticker: "Sticker" };

function CardEditor({ kind, design, edit }: { kind: CardKey; design: Design; edit: Edit }) {
  const card = design[kind] as Card;
  const tier = card.colorMode === "tier" && kind !== "membership";
  // Badan kartu Sticker memakai fill template, jadi warna nama dan teksnya tetap bisa diatur di mode tier.
  const tierText = tier && kind === "superChat";
  const patch = (fn: (c: Card) => Card, key: string) =>
    edit((d) => ({ ...d, [kind]: { ...d[kind], ...fn(d[kind] as Card) } }), `${kind}.${key}`);
  const patchSurface = (fn: (s: Surface) => Surface, key: string) =>
    patch((c) => ({ ...c, surface: fn(c.surface) }), key);

  const headerLabel = kind === "sticker" ? "Chip nominal" : "Header";

  return (
    <div className="grid gap-7">
      {kind !== "membership" ? (
        <Section title="Warna">
          <Segmented
            label="Sumber warna"
            small
            value={card.colorMode}
            options={[
              { value: "tier", label: "Tier colors" },
              { value: "custom", label: "Custom" },
            ]}
            onChange={(colorMode) => patch((c) => ({ ...c, colorMode }), "colorMode")}
          />
          {tier ? (
            <p className="text-xs text-ink-3">
              {kind === "superChat"
                ? "Warna header dan badan mengikuti tier nominal dari YouTube. Warna di preview hanya contoh."
                : "Warna chip nominal mengikuti tier dari YouTube. Warna di preview hanya contoh."}
            </p>
          ) : null}
        </Section>
      ) : null}

      {tier && kind === "superChat" ? null : (
        <Section title={headerLabel}>
          <FillField
            label={`Fill ${headerLabel.toLowerCase()}`}
            allowNone={false}
            value={card.headerFill}
            onChange={(headerFill) => patch((c) => ({ ...c, headerFill }), "headerFill")}
          />
        </Section>
      )}

      <SurfaceEditor
        surface={card.surface}
        onChange={patchSurface}
        hideFill={tier && kind === "superChat"}
        fillLabel={kind === "sticker" ? "Fill kartu" : "Fill badan"}
      />

      <Section title="Teks">
        {tierText ? (
          <p className="text-xs text-ink-3">
            Warna teks mengikuti YouTube supaya tetap terbaca di semua tier warna (ada yang terang, ada yang gelap). Pilih Custom di atas kalau ingin mengatur warna teks sendiri.
          </p>
        ) : (
          <ColorField label="Warna nama" value={card.nameColor} onChange={(nameColor) => patch((c) => ({ ...c, nameColor }), "nameColor")} />
        )}
        {kind !== "membership" ? (
          <>
            {tier ? (
              kind === "sticker" ? (
                <p className="text-xs text-ink-3">Warna teks chip nominal mengikuti YouTube.</p>
              ) : null
            ) : (
              <ColorField label="Warna nominal" value={card.amountColor} onChange={(amountColor) => patch((c) => ({ ...c, amountColor }), "amountColor")} />
            )}
            <SliderField label="Jarak nama dan nominal" value={card.amountGap} min={0} max={24} unit="px" onChange={(amountGap) => patch((c) => ({ ...c, amountGap }), "amountGap")} />
            <SliderField label="Ukuran nominal" value={card.amountSize} min={80} max={200} unit="%" onChange={(amountSize) => patch((c) => ({ ...c, amountSize }), "amountSize")} />
            <Segmented label="Ketebalan nominal" small value={card.amountWeight} options={WEIGHTS} onChange={(amountWeight) => patch((c) => ({ ...c, amountWeight }), "amountWeight")} />
          </>
        ) : null}
        {tierText ? null : (
          <ColorField label="Warna teks" value={card.textColor} onChange={(textColor) => patch((c) => ({ ...c, textColor }), "textColor")} />
        )}
      </Section>

      <Section title="Elemen">
        <ToggleField label="Tampilkan avatar" checked={card.showAvatar} onChange={(showAvatar) => patch((c) => ({ ...c, showAvatar }), "showAvatar")} />
        {kind === "sticker" ? (
          <SliderField label="Ukuran sticker" value={design.sticker.size} min={40} max={160} unit="px" onChange={(size) => edit((d) => ({ ...d, sticker: { ...d.sticker, size } }), "sticker.size")} />
        ) : null}
      </Section>

      <Hint>
        Selector {CARD_LABEL[kind]} mengikuti pola yang dipakai komunitas OBS. Cek sekali di OBS dengan donasi atau member sungguhan.
      </Hint>
    </div>
  );
}

/* ---------- Inspector ---------- */

export function Inspector({ design, layer, edit }: { design: Design; layer: LayerId; edit: Edit }) {
  const info = layerById(layer);
  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="font-display text-lg font-bold tracking-tight text-ink">{info.label}</h2>
        <p className="text-sm text-ink-2">{info.hint}</p>
      </header>
      <LayerFields design={design} layer={layer} edit={edit} />
    </div>
  );
}

function LayerFields({ design: d, layer, edit }: { design: Design; layer: LayerId; edit: Edit }) {
  switch (layer) {
    case "panel":
      return (
        <div className="grid gap-7">
          <Section title="Font">
            <SelectField
              label="Font chat"
              value={d.font}
              options={FONT_IDS.map((id) => ({ value: id, label: `${FONTS[id].label} (${FONTS[id].hint})` }))}
              onChange={(font) => edit((x) => ({ ...x, font }))}
            />
            <SliderField label="Ukuran font dasar" value={d.fontSize} min={12} max={36} unit="px" onChange={(fontSize) => edit((x) => ({ ...x, fontSize }), "fontSize")} />
          </Section>
          <Section title="Latar panel">
            <ColorField label="Warna latar" value={d.panel.color} onChange={(color) => edit((x) => ({ ...x, panel: { ...x.panel, color } }), "panel.color")} />
            <SliderField label="Opacity" value={d.panel.opacity} min={0} max={100} unit="%" hint="0% berarti transparan penuh, cocok untuk ditumpuk di atas gameplay." onChange={(opacity) => edit((x) => ({ ...x, panel: { ...x.panel, opacity } }), "panel.opacity")} />
          </Section>
          <Section title="Elemen bawaan YouTube">
            <ToggleField label="Sembunyikan header dan kolom kirim" hint="Biasanya tidak perlu tampil di OBS." checked={d.hideChrome} onChange={(hideChrome) => edit((x) => ({ ...x, hideChrome }))} />
            <ToggleField label="Sembunyikan bar Super Chat" hint="Baris donasi yang menempel di atas chat." checked={d.hideTicker} onChange={(hideTicker) => edit((x) => ({ ...x, hideTicker }))} />
          </Section>
        </div>
      );

    case "row":
      return (
        <div className="grid gap-7">
          <Section title="Susunan pesan">
            <Segmented
              label="Layout"
              small
              value={d.message.layout}
              options={[
                { value: "inline", label: "Inline" },
                { value: "stacked", label: "Stacked" },
              ]}
              onChange={(layout) => edit((x) => ({ ...x, message: { ...x.message, layout } }))}
            />
            <p className="text-xs text-ink-3">Inline: nama dan pesan sebaris. Stacked: pesan turun ke baris sendiri.</p>
            <Segmented
              label="Posisi avatar"
              small
              value={d.row.avatarPosition}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
                { value: "top", label: "Top" },
              ]}
              onChange={(avatarPosition) => edit((x) => ({ ...x, row: { ...x.row, avatarPosition } }))}
            />
            <Segmented
              label="Rata pesan"
              small
              value={d.row.align}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
              onChange={(align) => edit((x) => ({ ...x, row: { ...x.row, align } }))}
            />
          </Section>
          <Section title="Jarak dan lebar">
            <SliderField label="Jarak antar pesan" value={d.row.gap} min={0} max={24} unit="px" onChange={(gap) => edit((x) => ({ ...x, row: { ...x.row, gap } }), "row.gap")} />
            <SliderField label="Lebar maksimum bubble" value={d.row.maxWidth} min={50} max={100} unit="%" onChange={(maxWidth) => edit((x) => ({ ...x, row: { ...x.row, maxWidth } }), "row.maxWidth")} />
          </Section>
          <p className="rounded-field bg-surface-2 px-3 py-2 text-sm text-ink-2">
            Urutan Name, Badges, Timestamp, dan Message diatur dengan drag and drop di tab Layers.
          </p>
        </div>
      );

    case "bubble": {
      const ratio = bubbleContrast(d);
      return (
        <div className="grid gap-7">
          <Section title="Bubble">
            <ToggleField label="Tampilkan bubble" hint="Matikan untuk teks tanpa latar." checked={d.bubble.show} onChange={(show) => edit((x) => ({ ...x, bubble: { ...x.bubble, show } }))} />
            {d.bubble.show ? (
              <ToggleField label="Semburat warna per peran" hint="Member, moderator, dan owner mendapat sedikit warna sesuai peran." checked={d.bubble.roleTint} onChange={(roleTint) => edit((x) => ({ ...x, bubble: { ...x.bubble, roleTint } }))} />
            ) : null}
          </Section>
          {ratio !== null && ratio < 4.5 ? (
            <Hint>
              Teks dan bubble hanya berkontras {ratio.toFixed(1)}:1. Angka di bawah 4.5 biasanya sulit dibaca di layar penonton.
            </Hint>
          ) : null}
          {d.bubble.show ? (
            <SurfaceEditor
              surface={d.bubble}
              onChange={(fn, key) => edit((x) => ({ ...x, bubble: { ...x.bubble, ...fn(x.bubble) } }), `bubble.${key}`)}
            />
          ) : (
            <p className="rounded-field bg-surface-2 px-3 py-2 text-sm text-ink-2">Nyalakan bubble untuk mengatur fill, border, dan dekorasi.</p>
          )}
        </div>
      );
    }

    case "avatar":
      return (
        <div className="grid gap-7">
          <Section title="Avatar">
            <ToggleField label="Tampilkan avatar" checked={d.avatar.show} onChange={(show) => edit((x) => ({ ...x, avatar: { ...x.avatar, show } }))} />
            <SliderField label="Ukuran" value={d.avatar.size} min={16} max={64} unit="px" onChange={(size) => edit((x) => ({ ...x, avatar: { ...x.avatar, size } }), "avatar.size")} />
            <Segmented
              label="Bentuk"
              small
              value={d.avatar.shape}
              options={[
                { value: "circle", label: "Circle" },
                { value: "rounded", label: "Rounded" },
                { value: "square", label: "Square" },
                { value: "hexagon", label: "Hexagon" },
              ]}
              onChange={(shape) => edit((x) => ({ ...x, avatar: { ...x.avatar, shape } }))}
            />
          </Section>
          <Section title="Ring">
            {d.avatar.shape === "hexagon" ? (
              <p className="text-xs text-ink-3">Ring tidak tersedia untuk bentuk Hexagon.</p>
            ) : (
              <>
                <SliderField label="Ketebalan ring" value={d.avatar.ringWidth} min={0} max={4} unit="px" onChange={(ringWidth) => edit((x) => ({ ...x, avatar: { ...x.avatar, ringWidth } }), "avatar.ring")} />
                {d.avatar.ringWidth > 0 ? (
                  <ColorField label="Warna ring" value={d.avatar.ringColor} onChange={(ringColor) => edit((x) => ({ ...x, avatar: { ...x.avatar, ringColor } }), "avatar.ringColor")} />
                ) : null}
              </>
            )}
          </Section>
        </div>
      );

    case "name":
      return (
        <div className="grid gap-7">
          <Section title="Gaya nama">
            <SliderField label="Ukuran" value={d.nameStyle.size} min={70} max={140} unit="%" onChange={(size) => edit((x) => ({ ...x, nameStyle: { ...x.nameStyle, size } }), "name.size")} />
            <Segmented label="Ketebalan" small value={d.nameStyle.weight} options={WEIGHTS} onChange={(weight) => edit((x) => ({ ...x, nameStyle: { ...x.nameStyle, weight } }))} />
            <ToggleField label="Huruf kapital" checked={d.nameStyle.uppercase} onChange={(uppercase) => edit((x) => ({ ...x, nameStyle: { ...x.nameStyle, uppercase } }))} />
            <SliderField label="Jarak huruf" value={d.nameStyle.spacing} min={0} max={4} onChange={(spacing) => edit((x) => ({ ...x, nameStyle: { ...x.nameStyle, spacing } }), "name.spacing")} />
          </Section>
          <Section title="Warna per peran">
            {(["viewer", "member", "moderator", "owner"] as const).map((role) => (
              <ColorField
                key={role}
                label={role === "viewer" ? "Viewer" : role === "member" ? "Member" : role === "moderator" ? "Moderator" : "Owner"}
                value={d.nameStyle.colors[role]}
                onChange={(color) => edit((x) => ({ ...x, nameStyle: { ...x.nameStyle, colors: { ...x.nameStyle.colors, [role]: color } } }), `name.color.${role}`)}
              />
            ))}
          </Section>
        </div>
      );

    case "badges":
      return (
        <Section title="Badges">
          <ToggleField label="Tampilkan badges" hint="Ikon moderator, member, dan verified di samping nama." checked={d.badges.show} onChange={(show) => edit((x) => ({ ...x, badges: { show } }))} />
        </Section>
      );

    case "timestamp":
      return (
        <Section title="Timestamp">
          <ToggleField label="Tampilkan timestamp" hint="Jam kirim pesan." checked={d.timestamp.show} onChange={(show) => edit((x) => ({ ...x, timestamp: { ...x.timestamp, show } }))} />
          {d.timestamp.show ? (
            <>
              <SliderField label="Opacity" value={d.timestamp.opacity} min={20} max={100} unit="%" onChange={(opacity) => edit((x) => ({ ...x, timestamp: { ...x.timestamp, opacity } }), "timestamp.opacity")} />
              <SliderField label="Ukuran" value={d.timestamp.size} min={60} max={100} unit="%" onChange={(size) => edit((x) => ({ ...x, timestamp: { ...x.timestamp, size } }), "timestamp.size")} />
            </>
          ) : null}
        </Section>
      );

    case "text": {
      const ratio = bubbleContrast(d);
      return (
        <div className="grid gap-7">
          <Section title="Teks pesan">
            <ColorField label="Warna teks" value={d.text.color} onChange={(color) => edit((x) => ({ ...x, text: { ...x.text, color } }), "text.color")} />
            <Segmented label="Ketebalan" small value={d.text.weight} options={WEIGHTS} onChange={(weight) => edit((x) => ({ ...x, text: { ...x.text, weight } }))} />
            <SliderField label="Ukuran" value={d.text.size} min={80} max={140} unit="%" onChange={(size) => edit((x) => ({ ...x, text: { ...x.text, size } }), "text.size")} />
            <SliderField label="Tinggi baris" value={d.text.lineHeight} min={100} max={200} unit="%" onChange={(lineHeight) => edit((x) => ({ ...x, text: { ...x.text, lineHeight } }), "text.lineHeight")} />
          </Section>
          {ratio !== null && ratio < 4.5 ? (
            <Hint>Teks dan bubble hanya berkontras {ratio.toFixed(1)}:1. Ubah warna teks atau fill bubble supaya lebih terbaca.</Hint>
          ) : null}
          <Section title="Tepi teks">
            <Segmented
              label="Gaya tepi"
              small
              value={d.edge}
              options={[
                { value: "none", label: "None" },
                { value: "soft", label: "Soft" },
                { value: "outline", label: "Outline" },
              ]}
              onChange={(edge) => edit((x) => ({ ...x, edge }))}
            />
            <p className="text-xs text-ink-3">Tepi membantu teks terbaca di atas gameplay yang ramai. Tidak diperlukan kalau bubble sudah pekat.</p>
          </Section>
        </div>
      );
    }

    case "superchat":
      return <CardEditor kind="superChat" design={d} edit={edit} />;
    case "membership":
      return <CardEditor kind="membership" design={d} edit={edit} />;
    case "sticker":
      return <CardEditor kind="sticker" design={d} edit={edit} />;

    case "animation":
      return (
        <div className="grid gap-7">
          <Section title="Pesan masuk">
            <SelectField
              label="Gaya animasi"
              value={d.animation.style}
              options={ANIMATION_STYLES.map((style) => ({ value: style, label: ANIMATION_LABEL[style] }))}
              onChange={(style) => edit((x) => ({ ...x, animation: { ...x.animation, style } }))}
            />
            <SliderField label="Durasi" value={d.animation.duration} min={120} max={1200} step={20} unit="ms" onChange={(duration) => edit((x) => ({ ...x, animation: { ...x.animation, duration } }), "animation.duration")} />
            <Segmented
              label="Easing"
              small
              value={d.animation.easing}
              options={EASINGS.map((e) => ({ value: e, label: EASING_LABEL[e] }))}
              onChange={(easing) => edit((x) => ({ ...x, animation: { ...x.animation, easing } }))}
            />
          </Section>
          <p className="rounded-field bg-surface-2 px-3 py-2 text-sm text-ink-2">
            Animasi hanya untuk pesan masuk. YouTube langsung menghapus pesan lama, jadi animasi keluar tidak bisa dibuat. Pakai tombol Send di preview untuk melihat animasi berulang.
          </p>
        </div>
      );
  }
}
