/* Uji urutan bagian pesan memakai struktur elemen pesan YouTube yang asli (e2e/fixtures/yt-text-message.html).
   Jalankan setelah CSS semua template ditulis ke CSS_DIR (lihat catatan di bawah). */
const { chromium } = require("playwright-core");
const fs = require("fs");
const CSS_DIR = process.env.CSS_DIR || "/tmp/css";
const fixture = fs.readFileSync(__dirname + "/fixtures/yt-text-message.html", "utf8");
const meta = JSON.parse(fs.readFileSync(CSS_DIR + "/meta.json", "utf8"));
const base = "html,body{margin:0}yt-live-chat-author-chip{display:inline-flex}yt-live-chat-text-message-renderer{display:block}#content{display:block}#menu{display:block}";
const SEL = { timestamp: "#timestamp", name: "#author-name", badges: "#before-content-buttons > *", message: "#message-container" };
(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  let fail = 0;
  for (const m of meta) {
    const p = await b.newPage({ viewport: { width: 900, height: 400 } });
    const css = fs.readFileSync(`${CSS_DIR}/${m.id}.css`, "utf8").replace(/@import[^;]+;/g, "");
    await p.setContent(`<style>${base}</style><style>${css}</style><yt-live-chat-item-list-renderer><div id="items">${fixture}</div></yt-live-chat-item-list-renderer>`);
    const r = await p.evaluate((SEL) => {
      const out = {};
      for (const [k, s] of Object.entries(SEL)) {
        const e = document.querySelector(s);
        const bb = e && e.getBoundingClientRect();
        out[k] = bb && bb.width > 0 && bb.height > 0 ? { x: bb.x, cy: bb.y + bb.height / 2 } : null;
      }
      const c = document.querySelector("#content").getBoundingClientRect();
      const msg = document.querySelector("#message").getBoundingClientRect();
      out.inside = msg.width > 0 && msg.x >= c.x - 1 && msg.right <= c.right + 1;
      return out;
    }, SEL);
    // Timestamp dimatikan: bagian pertama harus rata dengan tepi konten. Yang boleh tersisa hanya
    // setengah celah (margin bagian itu sendiri). Teks tak terlihat (U+200B) di DOM asli tidak boleh
    // menambah jarak, dan karena itu fixture memang menyertakannya.
    await p.addStyleTag({ content: "yt-live-chat-text-message-renderer #timestamp{display:none!important}" });
    const lead = await p.evaluate(() => {
      const c = document.querySelector("#content"), cs = getComputedStyle(c);
      const xs = ["#author-name", "#message-container", "#before-content-buttons > *"].map((q) => document.querySelector(q)).filter(Boolean).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => r.x);
      const left = c.getBoundingClientRect().x + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      return { off: Math.min(...xs) - left, half: parseFloat(getComputedStyle(document.querySelector("#author-name")).fontSize) * 0.225 };
    });
    let problem = "";
    if (m.layout === "inline" && lead.off > lead.half + 1.5) problem += ` jarak kosong ${Math.round(lead.off)}px di kiri (batas ${Math.round(lead.half)}px);`;
    if (m.layout === "inline" || m.layout === "stacked") {
      const seq = m.order.filter((k) => r[k]);
      for (let i = 0; i + 1 < seq.length; i++) {
        const a = r[seq[i]], c = r[seq[i + 1]];
        const before = a.cy < c.cy - 8 || (Math.abs(a.cy - c.cy) <= 8 && a.x < c.x);
        if (!before) problem += ` ${seq[i]} harus sebelum ${seq[i + 1]};`;
      }
    } else if (!r.inside || !r.message) problem = " pesan keluar dari bubble/tersembunyi";
    if (!r.message) problem += " pesan tidak terlihat;";
    if (problem) fail++;
    console.log((problem ? "  GAGAL " : "  ok  ") + m.id + " [" + m.layout + "] " + m.order.join(">") + (problem ? " |" + problem : ""));
    await p.close();
  }
  // Ukuran: bubble pas dengan isinya, tidak melebihi panel, dan ikut lebar panel (skala otomatis).
  const noTop = fixture.replace(/<div id="before-content-buttons"[\s\S]*?<\/yt-button-view-model><\/div>/, '<div id="before-content-buttons"></div>').replace("@CalvinDDD", "@yanzoshawtych").replace("halo bang yanzo", "test");
  const longText = "ini pesan yang cukup panjang supaya harus turun baris beberapa kali di dalam bubble tanpa keluar dari panel chat ".repeat(3);
  const long = fixture.replace("halo bang yanzo", longText);
  const measure = async (p, W, html, css) => {
    await p.setViewportSize({ width: W, height: 500 });
    await p.setContent(`<style>${base}</style><style>${css}</style><style>yt-live-chat-text-message-renderer{animation:none!important}#timestamp{display:none!important}</style><yt-live-chat-item-list-renderer><div id="items">${html}</div></yt-live-chat-item-list-renderer>`);
    return p.evaluate(() => {
      const c = document.querySelector("#content"), cs = getComputedStyle(c), bb = c.getBoundingClientRect();
      const rg = document.createRange(); rg.selectNodeContents(document.querySelector("#message"));
      const inner = bb.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
      const row = document.querySelector("yt-live-chat-text-message-renderer");
      const limit = row.getBoundingClientRect().right - parseFloat(getComputedStyle(row).paddingRight);
      return { capped: bb.right >= limit - 1, right: bb.right, scrollW: document.documentElement.scrollWidth, font: parseFloat(cs.fontSize), slack: inner - rg.getBoundingClientRect().right, half: parseFloat(cs.fontSize) * 0.225, lines: rg.getClientRects().length };
    });
  };
  for (const m of meta.filter((x) => x.layout === "inline" && x.order[0] !== "message")) {
    const p = await b.newPage();
    const css = fs.readFileSync(`${CSS_DIR}/${m.id}.css`, "utf8").replace(/@import[^;]+;/g, "");
    let problem = "";
    const w4 = await measure(p, 400, fixture, css), w8 = await measure(p, 800, fixture, css);
    const ratio = w8.font / w4.font;
    if (Math.abs(ratio - 2) > 0.08) problem += ` skala ${ratio.toFixed(2)}x (harusnya 2x);`;
    for (const [label, html] of [["dengan #1", fixture], ["tanpa #1", noTop]]) for (const W of [400, 800]) {
      const r = await measure(p, W, html, css);
      // Bubble yang sudah menyentuh batas panel sah memenggal baris; "pas dengan isi" berlaku selama belum mentok.
      if (!r.capped && r.slack > r.half * 2 + 3) problem += ` bubble ${label} @${W}px kelebihan ${Math.round(r.slack)}px;`;
    }
    for (const W of [240, 320, 400, 800]) {
      const r = await measure(p, W, long, css);
      if (r.right > W + 0.5 || r.scrollW > W) problem += ` pesan panjang melebihi panel @${W}px (kanan ${Math.round(r.right)}, scroll ${r.scrollW});`;
      if (r.lines < 2) problem += ` pesan panjang tidak turun baris @${W}px;`;
    }
    if (problem) fail++;
    console.log((problem ? "  GAGAL ukuran " : "  ok  ukuran ") + m.id + (problem ? " |" + problem : ""));
    await p.close();
  }
  await b.close();
  console.log(fail ? fail + " template gagal" : "semua template lolos");
  process.exit(fail ? 1 : 0);
})();
