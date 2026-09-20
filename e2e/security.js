// Uji keamanan di browser: tidak ada permintaan ke host gambar luar sebelum user setuju, XSS, CSP, header, dan pesan asing.
const { chromium } = require("playwright-core");
const BASE = process.env.BASE_URL || "http://localhost:3100/";
const TRACKER = "pelacak.example.net";
const results = [];
function ok(name, cond, detail = "") {
  results.push({ name, pass: !!cond });
  console.log((cond ? "  ok  " : "  GAGAL ") + name + (cond ? "" : " | " + String(detail).slice(0, 260)));
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const newCtx = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
    await ctx.addInitScript(() => { try { localStorage.setItem("lc-theme", "dark"); } catch {} });
    return ctx;
  };
  const hits = { list: [] };
  const watch = async (ctx) => { await ctx.route(`**://${TRACKER}/**`, (route) => { hits.list.push(route.request().url()); route.abort(); }); };

  // ---------- 1. Buat link Share yang memuat gambar dari server "pelacak" ----------
  let ctx = await newCtx();
  let p = await ctx.newPage(); p.setDefaultTimeout(8000);
  await p.goto(BASE, { waitUntil: "load" }); await p.waitForTimeout(600);
  const props = p.locator('aside[aria-label="Properties"]');
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.locator('aside[aria-label^="Templates"]').getByRole("button", { name: /^Bubble/ }).first().click();
  await props.getByRole("button", { name: "Image pin", exact: true }).click();
  await props.getByRole("textbox", { name: "Link gambar atau GIF" }).fill(`https://${TRACKER}/piksel.gif`);
  await p.waitForTimeout(400);
  await p.fill("#design-name", "Dari Orang Lain");
  await p.getByRole("tab", { name: "Designs" }).click();
  await p.getByRole("button", { name: "Buat link Share" }).click();
  const link = await p.getByLabel("Link Share desain").inputValue();
  ok("link Share berisi gambar dari host luar dibuat", /#d=z\./.test(link));
  await ctx.close();

  // ---------- 2. Penerima membuka link: tidak ada permintaan ke host luar sebelum setuju ----------
  ctx = await newCtx(); await watch(ctx);
  p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const dialogs = [];
  p.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
  await p.goto(link, { waitUntil: "load" });
  await p.waitForTimeout(3500);
  ok("pertanyaan tampil dengan nama host dan peringatan IP", (await p.getByText("Desain ini memuat gambar dari alamat luar").count()) === 1 && (await p.getByText(TRACKER).count()) >= 1 && (await p.getByText(/alamat IP-mu/).count()) === 1);
  ok("SEBELUM setuju: nol permintaan jaringan ke host pelacak", hits.list.length === 0, hits.list.join(","));
  ok("desain belum dibuka (masih Crystal) dan CSS tidak memuat host luar", (await p.inputValue("#design-name")) === "Crystal" && !(await p.locator("pre code").first().textContent()).includes(TRACKER));
  ok("alamat #d= dibersihkan walau menunggu keputusan", !(await p.evaluate(() => location.hash)));
  await p.getByRole("button", { name: "Buka tanpa gambar" }).click();
  await p.waitForTimeout(3000);
  ok("setelah Buka tanpa gambar: desain terbuka, tetap nol permintaan ke pelacak", (await p.inputValue("#design-name")) === "Dari Orang Lain" && hits.list.length === 0, hits.list.join(","));
  ok("CSS desain yang dibuka tidak memuat host pelacak", !(await p.locator("pre code").first().textContent()).includes(TRACKER));
  const frame = await (await p.locator('iframe[title^="Preview chat"]').elementHandle()).contentFrame();
  ok("preview juga tidak memuat host pelacak", !(await frame.evaluate(() => document.getElementById("lc-style").textContent)).includes(TRACKER));
  await ctx.close();

  // ---------- 3. Pilih "Buka dengan gambar": barulah dimuat ----------
  hits.list.length = 0;
  ctx = await newCtx(); await watch(ctx);
  p = await ctx.newPage(); p.setDefaultTimeout(8000);
  await p.goto(link, { waitUntil: "load" });
  await p.getByRole("button", { name: "Buka dengan gambar" }).click();
  await p.waitForTimeout(3000);
  ok("hanya setelah Buka dengan gambar, permintaan ke host pelacak terjadi", hits.list.length >= 1, hits.list.length);
  await ctx.close();

  // ---------- 4. XSS lewat nama desain ----------
  ctx = await newCtx();
  p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const dlg = [];
  p.on("dialog", (d) => { dlg.push(d.message()); d.dismiss(); });
  await p.goto(BASE, { waitUntil: "load" }); await p.waitForTimeout(500);
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  await p.fill("#design-name", evil);
  await p.getByRole("tab", { name: "Designs" }).click();
  await p.getByRole("button", { name: "Buat link Share" }).click();
  await p.waitForTimeout(600);
  ok("nama berisi HTML ditampilkan sebagai teks, bukan elemen", (await p.locator("aside img[src='x']").count()) === 0 && (await p.getByText("<img src=x", { exact: false }).count()) >= 1);
  const link2 = await p.getByLabel("Link Share desain").inputValue();
  const other = await ctx.newPage();
  other.on("dialog", (d) => { dlg.push(d.message()); d.dismiss(); });
  await other.goto(link2, { waitUntil: "load" });
  await other.waitForTimeout(1200);
  ok("membuka link Share dengan nama berbahaya tidak menjalankan skrip", dlg.length === 0, dlg.join("|"));
  ok("tidak ada elemen script atau img liar di halaman", (await other.locator("body script:not([src])").evaluateAll((els) => els.filter((e) => /alert/.test(e.textContent)).length)) === 0 && (await other.locator("img[src='x']").count()) === 0);

  // ---------- 5. Pesan dari jendela asing tidak dipercaya ----------
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.locator('aside[aria-label^="Templates"]').getByRole("button", { name: /^Panel/ }).first().click();
  const before = await p.locator('aside[aria-label="Properties"] h2').textContent();
  await p.evaluate(() => { window.postMessage({ type: "lc-select", layer: "sticker" }, "*"); window.postMessage({ type: "lc-ready" }, "*"); });
  await p.waitForTimeout(400);
  ok("pesan lc-select dari jendela sendiri (bukan iframe preview) diabaikan", (await p.locator('aside[aria-label="Properties"] h2').textContent()) === before);
  await ctx.close();

  // ---------- 6. Header dan CSP terkirim dan tidak ada pelanggaran ----------
  ctx = await newCtx();
  p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const viol = [];
  p.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) viol.push(m.text().slice(0, 160)); });
  const res = await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(1500);
  const h = res.headers();
  ok("CSP dan header keamanan terkirim", !!h["content-security-policy"] && h["x-frame-options"] === "DENY" && h["x-content-type-options"] === "nosniff" && h["referrer-policy"] === "no-referrer" && !h["x-powered-by"], JSON.stringify(Object.keys(h)));
  ok("CSP melarang embed oleh situs lain dan objek", /frame-ancestors 'none'/.test(h["content-security-policy"]) && /object-src 'none'/.test(h["content-security-policy"]));
  ok("tidak ada pelanggaran CSP saat halaman dan preview berjalan", viol.length === 0, viol.join(" | "));
  await ctx.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} lulus`);
  await browser.close();
})().catch((e) => { console.error("SKRIP BERHENTI:", e.message.slice(0, 600)); process.exit(1); });
