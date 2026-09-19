import { FONTS, fontImport } from "./fonts";
import { pickEdge, rgba } from "./color";
import type { Settings } from "./settings";

/**
 * Generator CSS untuk Browser Source OBS.
 *
 * Aturan yang dijaga di file ini:
 * - Hanya CSS lama yang aman di browser bawaan OBS (tanpa color-mix, :has(), nesting, @layer).
 * - Semua selector khusus YouTube dikumpulkan di objek SEL supaya gampang diperbaiki
 *   kalau YouTube mengubah struktur chat-nya.
 * - Nilai hanya berasal dari Settings yang sudah divalidasi, jadi tidak ada input bebas
 *   yang bisa menyusup ke CSS.
 */

/** Selector internal YouTube. Sumber: struktur chat popout yang dipakai luas oleh komunitas OBS. */
export const SEL = {
  renderer: "yt-live-chat-renderer",
  message: "yt-live-chat-text-message-renderer",
  header: "yt-live-chat-header-renderer",
  input: "yt-live-chat-message-input-renderer",
  inputPanel: "#input-panel",
  ticker: "yt-live-chat-ticker-renderer",
  photo: "#author-photo",
  content: "#content",
  timestamp: "#timestamp",
  chip: "yt-live-chat-author-chip",
  name: "#author-name",
  badges: "#chat-badges",
  badge: "yt-live-chat-author-badge-renderer",
  text: "#message",
  menu: "#menu",
} as const;

const IMP = " !important";
const M = SEL.message;

type Decl = [prop: string, value: string];

function rule(selectors: string | string[], decls: Decl[]): string {
  const sel = Array.isArray(selectors) ? selectors.join(",\n") : selectors;
  const body = decls.map(([p, v]) => `  ${p}: ${v}${IMP};`).join("\n");
  return `${sel} {\n${body}\n}`;
}

/** Selector nama pengirim untuk satu peran, dengan beberapa bentuk untuk jaga-jaga. */
function nameSelectors(role: "member" | "moderator" | "owner"): string[] {
  return [
    `${M}[author-type="${role}"] ${SEL.name}`,
    `${M} ${SEL.name}.${role}`,
    `${M} ${SEL.name}[type="${role}"]`,
  ];
}

function textShadow(s: Settings): string | null {
  if (s.edge === "none") return null;
  const c = pickEdge(s.textColor);
  if (s.edge === "soft") return `0 1px 3px ${rgba(c, 70)}, 0 0 1px ${rgba(c, 50)}`;
  const px = 2;
  const dirs: Array<[number, number]> = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  return dirs.map(([x, y]) => `${x * px}px ${y * px}px 0 ${c}`).join(", ");
}

function boxShadow(s: Settings): string {
  const b = s.bubble;
  if (b.shadow === "soft") return `0 2px 10px ${rgba(b.shadowColor, 35)}`;
  if (b.shadow === "hard") return `3px 3px 0 ${b.shadowColor}`;
  return "none";
}

function avatarRadius(shape: Settings["avatar"]["shape"], size: number): string {
  if (shape === "circle") return "50%";
  if (shape === "rounded") return `${Math.round(size * 0.28)}px`;
  return "0";
}

const KEYFRAMES: Record<Exclude<Settings["animation"], "none">, string> = {
  slide:
    "@keyframes lc-slide {\n  from { opacity: 0; transform: translateY(14px); }\n  to { opacity: 1; transform: none; }\n}",
  pop:
    "@keyframes lc-pop {\n  0% { opacity: 0; transform: scale(0.86); }\n  60% { opacity: 1; transform: scale(1.03); }\n  100% { opacity: 1; transform: none; }\n}",
  fade: "@keyframes lc-fade {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}",
};

const ANIMATION_VALUE: Record<Exclude<Settings["animation"], "none">, string> = {
  slide: "lc-slide 360ms cubic-bezier(0.16, 1, 0.3, 1) both",
  pop: "lc-pop 420ms cubic-bezier(0.16, 1, 0.3, 1) both",
  fade: "lc-fade 300ms ease-out both",
};

export function generateCss(s: Settings): string {
  const out: string[] = [];
  const font = FONTS[s.font];
  const imp = fontImport(s.font);
  const b = s.bubble;

  out.push("/* lazycustom: tempel di OBS, Browser Source, kolom Custom CSS */");
  // @import harus jadi aturan pertama di stylesheet.
  if (imp) out.push(imp);

  // Latar halaman dan panel chat
  out.push(
    "/* Latar */\n" +
      rule("body", [
        ["overflow", "hidden"],
        ["background-color", "rgba(0, 0, 0, 0)"],
      ]) +
      "\n" +
      rule(SEL.renderer, [["background", s.panel.opacity > 0 ? rgba(s.panel.color, s.panel.opacity) : "transparent"]]),
  );

  // Elemen bawaan YouTube yang disembunyikan
  const hidden: string[] = [];
  if (s.hideChrome) hidden.push(SEL.header, SEL.input, SEL.inputPanel);
  if (s.hideTicker) hidden.push(SEL.ticker);
  hidden.push(`${M} ${SEL.menu}`);
  out.push("/* Elemen yang disembunyikan */\n" + rule(hidden, [["display", "none"]]));

  // Baris pesan
  const rowDecls: Decl[] = [
    ["display", "flex"],
    ["align-items", "flex-start"],
    ["padding", `${Math.round(s.gap / 2)}px 6px`],
    ["background", "transparent"],
    ["border", "0"],
    ["color", s.textColor],
    ["font-family", font.stack],
    ["font-size", `${s.fontSize}px`],
    ["font-weight", String(s.weight)],
    ["line-height", "1.35"],
  ];
  const shadow = textShadow(s);
  if (shadow) rowDecls.push(["text-shadow", shadow]);
  if (s.animation !== "none") {
    rowDecls.push(["animation", ANIMATION_VALUE[s.animation]]);
    rowDecls.push(["transform-origin", "left bottom"]);
  }
  const rowSelectors = [
    M,
    `${M}[is-highlighted]`,
    `${M}[author-type="owner"]`,
    `${M}[author-type="moderator"]`,
    `${M}[author-type="member"]`,
  ];
  out.push("/* Baris pesan */\n" + rule(rowSelectors, rowDecls));

  // Avatar
  if (s.avatar.show) {
    out.push(
      "/* Avatar */\n" +
        rule(`${M} ${SEL.photo}`, [
          ["display", "block"],
          ["flex", "none"],
          ["width", `${s.avatar.size}px`],
          ["height", `${s.avatar.size}px`],
          ["margin", "0 8px 0 0"],
          ["border-radius", avatarRadius(s.avatar.shape, s.avatar.size)],
          ["overflow", "hidden"],
        ]) +
        "\n" +
        rule(`${M} ${SEL.photo} img`, [
          ["width", "100%"],
          ["height", "100%"],
          ["object-fit", "cover"],
        ]),
    );
  } else {
    out.push("/* Avatar */\n" + rule(`${M} ${SEL.photo}`, [["display", "none"]]));
  }

  // Bubble (dipasang di #content supaya melebar mengikuti isi pesan)
  const contentDecls: Decl[] = [
    ["display", s.layout === "stacked" ? "flex" : "block"],
    ["min-width", "0"],
    ["box-sizing", "border-box"],
    ["overflow-wrap", "anywhere"],
  ];
  if (s.layout === "stacked") {
    contentDecls.push(["flex-direction", "column"], ["align-items", "flex-start"]);
  }
  if (b.show) {
    contentDecls.push(
      ["background", rgba(b.color, b.opacity)],
      ["border", b.borderWidth > 0 ? `${b.borderWidth}px solid ${b.borderColor}` : "0"],
      ["border-radius", `${b.radius}px`],
      ["padding", `${Math.max(2, Math.round(b.padding * 0.6))}px ${b.padding}px`],
      ["box-shadow", boxShadow(s)],
    );
  } else {
    contentDecls.push(["background", "transparent"], ["border", "0"], ["padding", "0"], ["box-shadow", "none"]);
  }
  out.push("/* Bubble */\n" + rule(`${M} ${SEL.content}`, contentDecls));

  // Warna bubble menurut peran, dengan lapisan gradien supaya tetap aman di CSS lama
  if (b.show && b.roleTint) {
    const roles: Array<["member" | "moderator" | "owner", string]> = [
      ["member", s.names.member],
      ["moderator", s.names.moderator],
      ["owner", s.names.owner],
    ];
    out.push(
      "/* Bubble menurut peran */\n" +
        roles
          .map(([role, color]) => {
            const tint = rgba(color, 24);
            return rule(`${M}[author-type="${role}"] ${SEL.content}`, [
              ["background", `linear-gradient(${tint}, ${tint}), ${rgba(b.color, b.opacity)}`],
            ]);
          })
          .join("\n"),
    );
  }

  // Waktu kirim
  out.push(
    "/* Waktu kirim */\n" +
      (s.showTimestamp
        ? rule(`${M} ${SEL.timestamp}`, [
            ["display", "inline"],
            ["color", rgba(s.textColor, 60)],
            ["font-size", "0.75em"],
            ["font-weight", "400"],
            ["margin-right", "0.6em"],
          ])
        : rule(`${M} ${SEL.timestamp}`, [["display", "none"]])),
  );

  // Nama pengirim
  out.push(
    "/* Nama pengirim */\n" +
      rule(`${M} ${SEL.name}`, [
        ["color", s.names.viewer],
        ["font-size", "1em"],
        ["font-weight", String(s.nameWeight)],
        ["background", "transparent"],
        ["padding", "0"],
        ["margin", "0"],
        ["border-radius", "0"],
      ]) +
      "\n" +
      (["member", "moderator", "owner"] as const)
        .map((role) => rule(nameSelectors(role), [["color", s.names[role]]]))
        .join("\n") +
      "\n" +
      rule(`${M} ${SEL.chip}`, [
        ["display", s.layout === "stacked" ? "block" : "inline"],
        ["margin", s.layout === "stacked" ? "0 0 2px 0" : "0 0.5em 0 0"],
      ]),
  );

  // Lencana
  out.push(
    "/* Lencana */\n" +
      (s.showBadges
        ? rule(`${M} ${SEL.badge}`, [
            ["vertical-align", "middle"],
            ["margin", "0 0 0 0.3em"],
          ])
        : rule([`${M} ${SEL.badges}`, `${M} ${SEL.badge}`], [["display", "none"]])),
  );

  // Isi pesan dan emoji
  out.push(
    "/* Isi pesan */\n" +
      rule(`${M} ${SEL.text}`, [
        ["color", s.textColor],
        ["font-size", "1em"],
        ["font-weight", String(s.weight)],
        // Jarak nama ke pesan diatur oleh margin nama, bukan oleh margin bawaan YouTube.
        ["margin", "0"],
      ]) +
      "\n" +
      rule(`${M} ${SEL.text} img.emoji`, [
        ["width", "1.4em"],
        ["height", "1.4em"],
        ["vertical-align", "text-bottom"],
      ]),
  );

  // Animasi pesan masuk
  if (s.animation !== "none") {
    out.push("/* Animasi pesan masuk */\n" + KEYFRAMES[s.animation]);
  }

  return out.join("\n\n") + "\n";
}
