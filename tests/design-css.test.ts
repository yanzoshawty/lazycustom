import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { generateCss } from "@/lib/design/css";
import type { Design } from "@/lib/design/model";
import { designFromTemplate, TEMPLATES } from "@/lib/design/templates";

const FORBIDDEN = [/color-mix\(/, /:has\(/, /@layer/, /@container/, /@property/, /backdrop-filter/, /\bNaN\b/, /undefined/, /\[object/];

const clone = (id = "crystal"): Design => {
  const d = designFromTemplate(id as never);
  d.row.autoScale = false;
  return d;
};

describe.each(TEMPLATES)("generateCss: template $id", ({ design }) => {
  const css = generateCss(design);

  it("adalah CSS yang valid", () => {
    expect(() => postcss.parse(css)).not.toThrow();
  });

  it("tidak memakai fitur CSS yang berisiko di OBS", () => {
    for (const re of FORBIDDEN) expect(css).not.toMatch(re);
  });

  it("menaruh @import sebagai aturan pertama bila ada", () => {
    const first = postcss.parse(css).nodes.find((n) => n.type !== "comment");
    if (design.font === "system") expect(css).not.toContain("@import");
    else expect(first).toMatchObject({ type: "atrule", name: "import" });
  });

  it("memuat selector untuk semua jenis pesan", () => {
    for (const tag of [
      "yt-live-chat-text-message-renderer",
      "yt-live-chat-paid-message-renderer",
      "yt-live-chat-membership-item-renderer",
      "yt-live-chat-paid-sticker-renderer",
    ]) {
      expect(css).toContain(tag);
    }
  });

  it("tidak memuat em-dash atau en-dash", () => {
    expect(css).not.toMatch(/[\u2013\u2014]/);
  });

  it("tidak membiarkan rule kosong atau tanda kurung tidak seimbang", () => {
    expect(css.split("{").length).toBe(css.split("}").length);
    expect(css).not.toMatch(/\{\s*\}/);
  });
});

describe("panel dan elemen bawaan", () => {
  it("membuat latar halaman transparan", () => {
    const css = generateCss(clone());
    expect(css).toMatch(/body \{[^}]*overflow: hidden !important/);
    expect(css).toMatch(/body \{[^}]*rgba\(0, 0, 0, 0\)/);
  });

  it("menyembunyikan header dan kolom kirim hanya bila diminta", () => {
    const d = clone();
    d.hideChrome = true;
    expect(generateCss(d)).toContain("yt-live-chat-header-renderer");
    d.hideChrome = false;
    expect(generateCss(d)).not.toContain("yt-live-chat-header-renderer");
  });

  it("menyembunyikan bar Super Chat hanya bila diminta", () => {
    const d = clone();
    d.hideTicker = true;
    expect(generateCss(d)).toContain("yt-live-chat-ticker-renderer");
    d.hideTicker = false;
    expect(generateCss(d)).not.toContain("yt-live-chat-ticker-renderer");
  });

  it("memakai warna panel hanya bila kepekatan lebih dari nol", () => {
    const d = clone();
    d.panel = { color: "#102030", opacity: 40 };
    expect(generateCss(d)).toContain("rgba(16, 32, 48, 0.4)");
    d.panel.opacity = 0;
    expect(generateCss(d)).not.toContain("rgba(16, 32, 48");
  });
});

describe("urutan bagian pesan", () => {
  it("menerjemahkan urutan ke CSS order dan membuka chip dengan display: contents", () => {
    const d = clone();
    d.message.order = ["message", "badges", "name", "timestamp"];
    d.timestamp.show = true;
    const css = generateCss(d);
    expect(css).toMatch(/yt-live-chat-author-chip \{\s*display: contents/);
    expect(css).toMatch(/#message-container,\nyt-live-chat-text-message-renderer #hover-message \{[^}]*order: 0 !important/);
    expect(css).toMatch(/#chat-badges \{[^}]*order: 1 !important/);
    // Struktur asli YouTube: tombol Top Fan mengikuti lencana, badge prepend mengikuti nama.
    expect(css).toMatch(/#before-content-buttons > \* \{[^}]*order: 1 !important/);
    expect(css).toMatch(/#prepend-chat-badges > \* \{[^}]*order: \d+ !important/);
    // #message bukan anak #content, jadi tidak boleh membawa order sendiri.
    expect(css).not.toMatch(/#message \{[^}]*order:/);
    expect(css).toMatch(/#author-name \{[^}]*order: 2 !important/);
    expect(css).toMatch(/#timestamp \{[^}]*order: 3 !important/);
  });

  it("layout stacked memaksa pesan turun ke baris sendiri, inline memberi kolom teks", () => {
    const d = clone();
    d.message.layout = "stacked";
    expect(generateCss(d)).toMatch(/#message-container,[^{]*\{[^}]*flex: 1 1 100% !important/);
    d.message.layout = "inline";
    expect(generateCss(d)).toMatch(/#message-container,[^{]*\{[^}]*flex: 1 1 auto !important/);
  });

  it("menyembunyikan timestamp dan lencana saat dimatikan", () => {
    const d = clone();
    d.timestamp.show = false;
    d.badges.show = false;
    const css = generateCss(d);
    expect(css).toMatch(/#timestamp \{\s*display: none !important/);
    expect(css).toMatch(/#chat-badges,\nyt-live-chat-text-message-renderer #before-content-buttons,\nyt-live-chat-text-message-renderer yt-live-chat-author-badge-renderer \{\s*display: none/);
  });

  it("memberi warna nama untuk setiap peran lewat tiga bentuk selector", () => {
    const d = clone();
    const css = generateCss(d);
    for (const role of ["member", "moderator", "owner"] as const) {
      expect(css).toContain(`[author-type="${role}"] #author-name`);
      expect(css).toContain(`#author-name.${role}`);
      expect(css).toContain(`#author-name[type="${role}"]`);
      expect(css).toContain(d.nameStyle.colors[role]);
    }
  });

  it("mengatur uppercase dan letter-spacing nama", () => {
    const d = clone();
    d.nameStyle.uppercase = true;
    d.nameStyle.spacing = 2;
    const css = generateCss(d);
    expect(css).toMatch(/text-transform: uppercase/);
    expect(css).toMatch(/letter-spacing: 1px/);
  });
});

describe("avatar dan baris", () => {
  it("menaruh avatar di kanan lewat row-reverse dan di atas lewat column", () => {
    const d = clone();
    d.row.avatarPosition = "right";
    expect(generateCss(d)).toMatch(/flex-direction: row-reverse/);
    d.row.avatarPosition = "top";
    expect(generateCss(d)).toMatch(/yt-live-chat-text-message-renderer,[^{]*\{[^}]*flex-direction: column/);
    d.row.avatarPosition = "left";
    expect(generateCss(d)).not.toMatch(/row-reverse/);
  });

  it("meratakan baris ke kanan dengan benar untuk tiap posisi avatar", () => {
    const d = clone();
    d.row.align = "right";
    d.row.avatarPosition = "left";
    expect(generateCss(d)).toMatch(/justify-content: flex-end/);
    d.row.avatarPosition = "right";
    const css = generateCss(d);
    const rowBlock = css.split("/* Avatar */")[0];
    expect(rowBlock).toMatch(/flex-direction: row-reverse/);
    expect(rowBlock).toMatch(/justify-content: flex-start/);
  });

  it("membuat avatar hexagon dengan clip-path dan tanpa ring", () => {
    const d = clone();
    d.avatar.shape = "hexagon";
    d.avatar.ringWidth = 3;
    const css = generateCss(d);
    expect(css).toContain("clip-path: polygon(");
    expect(css).not.toMatch(/#author-photo \{[^}]*0 0 0 3px/);
  });

  it("membuat ring avatar bila bukan hexagon", () => {
    const d = clone();
    d.avatar.shape = "circle";
    d.avatar.ringWidth = 3;
    d.avatar.ringColor = "#123456";
    expect(generateCss(d)).toContain("0 0 0 3px #123456");
  });

  it("menyembunyikan avatar saat dimatikan", () => {
    const d = clone();
    d.avatar.show = false;
    expect(generateCss(d)).toMatch(/yt-live-chat-text-message-renderer #author-photo \{\s*display: none/);
  });

  it("membatasi lebar maksimum bubble", () => {
    const d = clone();
    d.row.maxWidth = 80;
    expect(generateCss(d)).toMatch(/#content \{[^}]*max-width: 80%/);
  });
});

describe("dekorasi bubble", () => {
  it("menjadikan glow sebagai box-shadow bertumpuk", () => {
    const d = clone("aurora");
    const css = generateCss(d);
    expect(css).toMatch(/box-shadow: 0 0 20px 0px rgba\(255, 179, 217, 0\.3\), 0 0 26px 0px rgba\(201, 184, 255, 0\.22\)/);
  });

  it("membuat gradient border lewat ::before bermask", () => {
    const css = generateCss(clone("crystal"));
    expect(css).toMatch(/#content::before \{[^}]*-webkit-mask-composite: xor/);
    expect(css).toMatch(/#content::before \{[^}]*mask-composite: exclude/);
    expect(css).toMatch(/#content::before \{[^}]*z-index: -1/);
    expect(css).toMatch(/#content \{[^}]*isolation: isolate/);
  });

  it("membuat corner brackets sebagai delapan lapisan background", () => {
    const d = clone("plain");
    d.bubble.show = true;
    d.bubble.decorations = [{ id: "c-1", kind: "corners", size: 10, thickness: 2, color: "#7DD3FC" }];
    const css = generateCss(d);
    const sizes = css.match(/background-size: ([^;]+) !important/g)!;
    const bubbleSizes = sizes.find((s) => s.includes("10px 2px"))!;
    expect(bubbleSizes.split(",").filter((x) => /10px 2px|2px 10px/.test(x))).toHaveLength(8);
  });

  it("membuat accent bar di sisi yang dipilih", () => {
    const d = clone("plain");
    d.bubble.show = true;
    d.bubble.decorations = [{ id: "b-1", kind: "accent-bar", side: "right", thickness: 5, color: "#7DD3FC", color2: "#FFFFFF" }];
    const css = generateCss(d);
    expect(css).toContain("background-size: 5px 100%");
    expect(css).toContain("background-position: right top");
    expect(css).toContain("linear-gradient(to bottom, #7DD3FC, #FFFFFF)");
  });

  it("membuat scanlines dengan repeating-linear-gradient", () => {
    const css = generateCss(clone("grid"));
    expect(css).toMatch(/repeating-linear-gradient\(0deg, rgba\(125, 211, 252, 0\.08\) 0px/);
  });

  it("menaruh gambar di ::after dengan opacity, hanya bila link terisi", () => {
    const d = clone("plain");
    d.bubble.show = true;
    d.bubble.decorations = [
      { id: "i-1", kind: "image", url: "https://cdn.example.com/a.gif", fit: "cover", position: "right", opacity: 40 },
    ];
    const css = generateCss(d);
    expect(css).toMatch(/#content::after \{[^}]*background-image: url\("https:\/\/cdn\.example\.com\/a\.gif"\)/);
    expect(css).toMatch(/#content::after \{[^}]*opacity: 0\.4/);
    d.bubble.decorations = [{ id: "i-2", kind: "image", url: "", fit: "cover", position: "center", opacity: 40 }];
    expect(generateCss(d)).not.toContain("::after");
  });

  it("mengabaikan seluruh dekorasi dan fill saat bubble dimatikan", () => {
    const d = clone("crystal");
    d.bubble.show = false;
    const css = generateCss(d);
    const bubble = css.split("/* Bubble */")[1].split("/* Urutan")[0];
    expect(bubble).not.toContain("::before");
    expect(bubble).toMatch(/#content \{[^}]*box-shadow: none/);
    expect(bubble).toMatch(/#content \{[^}]*padding: 0 !important/);
  });

  it("memberi semburat peran hanya saat bubble aktif dan opsi dinyalakan", () => {
    const d = clone("crystal");
    d.bubble.roleTint = true;
    expect(generateCss(d)).toContain("/* Bubble menurut peran */");
    d.bubble.roleTint = false;
    expect(generateCss(d)).not.toContain("/* Bubble menurut peran */");
    d.bubble.roleTint = true;
    d.bubble.show = false;
    expect(generateCss(d)).not.toContain("/* Bubble menurut peran */");
  });

  it("mempertahankan dekorasi bentuk di varian semburat peran", () => {
    const d = clone("grid");
    d.bubble.roleTint = true;
    const css = generateCss(d);
    const tinted = css.split("/* Bubble menurut peran */")[1].split("/* Urutan")[0];
    expect(tinted).toContain("repeating-linear-gradient");
    expect(tinted).toContain("rgba(");
  });
});

describe("kartu", () => {
  it("Super Chat mode tier memakai variabel warna YouTube dengan warna cadangan", () => {
    const d = clone("crystal");
    d.superChat.colorMode = "tier";
    const css = generateCss(d);
    expect(css).toMatch(/var\(--yt-live-chat-paid-message-primary-color, #[0-9A-F]{6}\)/);
    expect(css).toMatch(/var\(--yt-live-chat-paid-message-secondary-color, #[0-9A-F]{6}\)/);
  });

  it("Super Chat mode custom tidak memakai variabel tier", () => {
    const d = clone("crystal");
    d.superChat.colorMode = "custom";
    const sc = generateCss(d).split("/* Super Chat */")[1].split("/* Membership */")[0];
    expect(sc).not.toContain("--yt-live-chat-paid-message");
  });

  it("mode tier tidak menimpa warna teks sama sekali (tier terang harus tetap terbaca)", () => {
    const d = clone("crystal");
    d.superChat.colorMode = "tier";
    d.superChat.nameColor = "#ABCDEF";
    d.superChat.amountColor = "#FEDCBA";
    d.superChat.textColor = "#123456";
    const sc = generateCss(d).split("/* Super Chat */")[1].split("/* Membership */")[0];
    for (const c of ["#ABCDEF", "#FEDCBA", "#123456"]) expect(sc).not.toContain(c);
    expect(sc).not.toMatch(/(^|[\s;{])color:/m);
    // Ukuran dan ketebalan nominal tetap bisa diatur.
    expect(sc).toMatch(/#purchase-amount[^{]*\{[^}]*font-size: 115%/);
  });

  it("mode custom menerapkan warna teks pilihan", () => {
    const d = clone("crystal");
    d.superChat.colorMode = "custom";
    d.superChat.nameColor = "#ABCDEF";
    d.superChat.textColor = "#123456";
    const sc = generateCss(d).split("/* Super Chat */")[1].split("/* Membership */")[0];
    expect(sc).toMatch(/#author-name[^{]*\{[^}]*color: #ABCDEF/);
    expect(sc).toMatch(/#message[^{]*\{[^}]*color: #123456/);
  });

  it("Sticker mode tier menyerahkan teks chip ke YouTube tapi tetap memakai warna nama template", () => {
    const d = clone("crystal");
    d.sticker.colorMode = "tier";
    d.sticker.amountColor = "#FEDCBA";
    d.sticker.nameColor = "#ABCDEF";
    const st = generateCss(d).split("/* Sticker */")[1];
    // Badan kartu Sticker memakai fill template, jadi nama harus tetap terbaca di atasnya.
    expect(st).toMatch(/#author-name[^{]*\{[^}]*color: #ABCDEF/);
    expect(st).not.toContain("#FEDCBA");
  });

  it("Membership tidak pernah memakai mode tier", () => {
    const d = clone("crystal");
    d.membership.colorMode = "tier";
    const m = generateCss(d).split("/* Membership */")[1].split("/* Sticker */")[0];
    expect(m).not.toContain("--yt-live-chat-paid");
  });

  it("Sticker mode tier memakai warna chip YouTube dan mengatur ukuran sticker", () => {
    const d = clone("crystal");
    d.sticker.colorMode = "tier";
    d.sticker.size = 120;
    const st = generateCss(d).split("/* Sticker */")[1];
    expect(st).toContain("var(--yt-live-chat-paid-sticker-chip-background-color");
    expect(st).toMatch(/#sticker img \{[^}]*width: 120px/);
  });

  it("mengatur warna teks, jumlah donasi, dan menyembunyikan avatar kartu", () => {
    const d = clone("crystal");
    d.superChat.colorMode = "custom";
    d.superChat.amountColor = "#112233";
    d.superChat.amountSize = 150;
    d.superChat.showAvatar = false;
    const sc = generateCss(d).split("/* Super Chat */")[1].split("/* Membership */")[0];
    expect(sc).toMatch(/#purchase-amount[^{]*\{[^}]*color: #112233/);
    expect(sc).toMatch(/font-size: 150%/);
    expect(sc).toMatch(/#author-photo \{\s*display: none/);
  });

  it("membuat kartu memakai overflow hidden agar header ikut membulat", () => {
    const sc = generateCss(clone()).split("/* Super Chat */")[1].split("/* Membership */")[0];
    expect(sc).toMatch(/#card \{[^}]*overflow: hidden/);
  });

  it("menerapkan dekorasi surface juga ke kartu", () => {
    const sc = generateCss(clone("crystal")).split("/* Super Chat */")[1].split("/* Membership */")[0];
    expect(sc).toContain("#card::before");
  });
});

describe("jarak nominal", () => {
  it("Sticker: nama dan chip nominal diberi jarak dan boleh turun baris", () => {
    const d = clone("crystal");
    d.sticker.amountGap = 14;
    const st = generateCss(d).split("/* Sticker */")[1];
    expect(st).toMatch(/#author-info \{[^}]*display: flex/);
    expect(st).toMatch(/#author-info \{[^}]*flex-wrap: wrap/);
    expect(st).toMatch(/#author-info \{[^}]*gap: 4px 14px/);
  });

  it("Super Chat: nama dan nominal bertumpuk dengan jarak vertikal", () => {
    const d = clone("crystal");
    d.superChat.amountGap = 6;
    const sc = generateCss(d).split("/* Super Chat */")[1].split("/* Membership */")[0];
    expect(sc).toMatch(/#header-content-primary-column \{[^}]*flex-direction: column/);
    expect(sc).toMatch(/#header-content-primary-column \{[^}]*row-gap: 6px/);
  });

  it("jarak nol berarti tanpa celah, dan Membership tidak terpengaruh", () => {
    const d = clone("crystal");
    d.sticker.amountGap = 0;
    expect(generateCss(d).split("/* Sticker */")[1]).toMatch(/gap: 4px 0px/);
    expect(generateCss(d).split("/* Membership */")[1].split("/* Sticker */")[0]).not.toContain("#author-info");
  });

  it("semua template memberi jarak bawaan pada nominal", () => {
    for (const t of TEMPLATES) {
      expect(t.design.superChat.amountGap, t.id).toBeGreaterThan(0);
      expect(t.design.sticker.amountGap, t.id).toBeGreaterThan(0);
    }
  });
});

describe("bar Super Chat", () => {
  it("semua template menyembunyikannya secara bawaan", () => {
    for (const t of TEMPLATES) {
      expect(t.design.hideTicker, t.id).toBe(true);
      expect(generateCss(t.design), t.id).toContain("yt-live-chat-ticker-renderer");
    }
  });
});

describe("animasi", () => {
  it("tidak membuat @keyframes dan animation saat mati", () => {
    const d = clone();
    d.animation.style = "none";
    const css = generateCss(d);
    expect(css).not.toContain("@keyframes");
    expect(css).not.toContain("animation:");
  });

  it.each(["fade", "slide-up", "slide-left", "slide-right", "pop", "zoom", "blur-in"] as const)(
    "membuat keyframes dan rule untuk %s pada semua jenis pesan",
    (style) => {
      const d = clone();
      d.animation = { style, duration: 500, easing: "bounce" };
      const css = generateCss(d);
      expect(css).toContain(`@keyframes lc-${style}`);
      expect(css).toContain(`animation: lc-${style} 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both`);
      const rule = css.split("/* Animasi pesan masuk */")[1];
      for (const tag of ["text-message", "paid-message", "membership-item", "paid-sticker"]) {
        expect(rule).toContain(`yt-live-chat-${tag}-renderer`);
      }
    },
  );
});

describe("tepi teks dan font", () => {
  it("membuat tepi teks garis dari delapan arah", () => {
    const d = clone();
    d.edge = "outline";
    d.text.color = "#FFFFFF";
    const line = generateCss(d).split("\n").find((l) => l.includes("text-shadow"))!;
    expect(line.split(", ")).toHaveLength(8);
  });

  it("tidak memakai text-shadow bila tepi mati", () => {
    const d = clone();
    d.edge = "none";
    expect(generateCss(d)).not.toContain("text-shadow");
  });

  it("memuat font Google untuk font non-sistem", () => {
    const d = clone();
    d.font = "orbitron";
    expect(generateCss(d)).toContain("family=Orbitron:wght@400;500;600;700");
  });
});
