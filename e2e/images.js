// Uji browser: gambar dan GIF (pin, bingkai avatar, panel), upload, jarak nominal, dan CSP.
const { chromium } = require("playwright-core");
const path = require("path");
const zlib = require("zlib");

/** PNG solid-color asli (bisa didekode) pada dimensi tertentu, dipakai untuk menguji jalur pemampatan otomatis. */
function solidPng(w, h, rgb) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3).map((_, i) => rgb[i % 3])]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const idat = zlib.deflateSync(raw);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
const BASE = process.env.BASE_URL || "http://localhost:3100/";
const FX = (n) => path.join(__dirname, "fixtures", n);
const results = [];
function ok(name, cond, detail = "") {
  results.push({ name, pass: !!cond });
  console.log((cond ? "  ok  " : "  GAGAL ") + name + (cond ? "" : " | " + String(detail).slice(0, 260)));
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addInitScript(() => { try { localStorage.setItem("lc-theme", "dark"); } catch {} });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  const csp = [], pageErrors = [];
  p.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text().slice(0, 200)); });
  p.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(700);
  const fr = await (await p.locator('iframe[title^="Preview chat"]').elementHandle()).contentFrame();
  const props = p.locator('aside[aria-label="Properties"]');
  const layerBtn = (re) => p.locator('aside[aria-label^="Templates"]').getByRole("button", { name: re }).first();
  const code = () => p.locator("pre code").first().textContent();
  const pseudo = (sel, pe, prop) => fr.evaluate(([s, q, pr]) => { const el = document.querySelector(s); return el ? getComputedStyle(el, q)[pr] : "TIDAK ADA ELEMEN"; }, [sel, pe, prop]);
  const pause = async () => { const b = p.getByRole("button", { name: "Pause", exact: true }); if (await b.isVisible()) await b.click(); };
  await pause();

  // ---------- bawaan ----------
  ok("bar Super Chat tersembunyi secara bawaan di preview", (await fr.evaluate(() => getComputedStyle(document.querySelector("yt-live-chat-ticker-renderer")).display)) === "none");
  ok("chip Rp20.000 tidak terlihat", !(await fr.locator("yt-live-chat-ticker-renderer span").isVisible()));

  // ---------- jarak nama dan nominal (Sticker) ----------
  await p.getByRole("button", { name: "Kosongkan chat" }).click();
  await p.getByRole("button", { name: "Sticker", exact: true }).click();
  await p.waitForTimeout(300);
  const gapOf = () => fr.evaluate(() => { const n = document.querySelector("yt-live-chat-paid-sticker-renderer #author-name").getBoundingClientRect(); const c = document.querySelector("yt-live-chat-paid-sticker-renderer #purchase-amount-chip").getBoundingClientRect(); return Math.round(c.left - n.right); });
  const g8 = await gapOf();
  ok("nama dan chip nominal Sticker tidak lagi menempel (jarak bawaan >= 6px)", g8 >= 6, g8);
  await p.getByRole("tab", { name: "Layers" }).click();
  await layerBtn(/^Sticker/).click();
  await props.getByLabel("Amount gap").fill("20");
  await p.waitForTimeout(300);
  const g20 = await gapOf();
  ok("slider jarak nominal mengubah jarak di preview", g20 > g8 && g20 >= 18, `${g8} -> ${g20}`);

  // ---------- gambar panel dari upload ----------
  await layerBtn(/^Panel/).click();
  await props.getByRole("button", { name: "Gambar di depan pesan" }).click();
  await props.locator('input[type="file"]').first().setInputFiles(FX("logo.png"));
  await p.waitForTimeout(600);
  ok("upload panel: tampil sebagai gambar unggahan dengan ukuran KB", (await props.getByText(/Gambar unggahan, \d+ KB/).count()) === 1);
  const bg = await pseudo("yt-live-chat-renderer", "::after", "backgroundImage");
  ok("gambar panel (depan) benar-benar dirender di preview lewat data URI", /url\("data:image\/png;base64,/.test(bg), bg.slice(0, 80));
  ok("gambar panel tidak menangkap klik dan berposisi fixed", (await pseudo("yt-live-chat-renderer", "::after", "pointerEvents")) === "none" && (await pseudo("yt-live-chat-renderer", "::after", "position")) === "fixed");
  await props.getByRole("button", { name: "Gambar di belakang pesan" }).click();
  await props.locator('input[type="file"]').nth(1).setInputFiles(FX("anim.gif"));
  await p.waitForTimeout(500);
  const bgBehind = await pseudo("yt-live-chat-renderer", "::before", "backgroundImage");
  ok("gambar panel (belakang) berupa GIF dan dirender di ::before", /data:image\/gif/.test(bgBehind), bgBehind.slice(0, 80));

  // tampilan kode disingkat, salinan utuh
  const shown = await code();
  ok("kotak kode menyingkat data gambar", /disingkat/.test(shown) && !/base64,[A-Za-z0-9+/]{100}/.test(shown), shown.length);
  ok("catatan ukuran CSS dan jumlah gambar disingkat tampil", (await p.getByText(/2 gambar unggahan disingkat/).count()) === 1);
  await p.getByRole("button", { name: /Copy CSS/ }).first().click();
  await p.waitForTimeout(250);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok("Copy CSS menyalin data gambar UTUH", /url\("data:image\/png;base64,[A-Za-z0-9+/=]{100,}"\)/.test(clip) && /data:image\/gif;base64,/.test(clip));

  // ---------- bingkai avatar dari upload ----------
  await p.getByRole("tab", { name: "Layers" }).click();
  await layerBtn(/^Avatar/).click();
  await props.locator('input[type="file"]').first().setInputFiles(FX("frame.png"));
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: "Kosongkan chat" }).click();
  await p.getByRole("button", { name: "Message", exact: true }).click();
  await p.getByRole("button", { name: "Super Chat", exact: true }).click();
  await p.waitForTimeout(400);
  const af = await pseudo("yt-live-chat-text-message-renderer #author-photo", "::after", "backgroundImage");
  ok("bingkai avatar dirender di ::after avatar pesan", /data:image\/png/.test(af), af.slice(0, 60));
  const afc = await pseudo("yt-live-chat-paid-message-renderer #author-photo", "::after", "backgroundImage");
  ok("bingkai avatar juga dirender di avatar kartu Super Chat", /data:image\/png/.test(afc), afc.slice(0, 60));
  const box = await fr.evaluate(() => { const h = document.querySelector("yt-live-chat-text-message-renderer #author-photo"); const w = h.getBoundingClientRect().width; const a = getComputedStyle(h, "::after"); return { host: Math.round(w), frame: Math.round(parseFloat(a.width)) }; });
  ok("bingkai 130% lebih besar dari foto dan tidak terpotong (overflow visible)", box.frame > box.host && (await fr.evaluate(() => getComputedStyle(document.querySelector("yt-live-chat-text-message-renderer #author-photo")).overflow)) === "visible", JSON.stringify(box));

  // ---------- image pin di bubble, beberapa sekaligus ----------
  await p.getByRole("tab", { name: "Layers" }).click();
  await layerBtn(/^Bubble/).click();
  for (let i = 0; i < 2; i++) await props.getByRole("button", { name: "Image pin", exact: true }).click();
  await p.waitForTimeout(300);
  const files = props.locator('input[type="file"]');
  await files.nth(0).setInputFiles(FX("pin.png"));
  await files.nth(1).setInputFiles(FX("anim.gif"));
  await p.waitForTimeout(600);
  await p.getByRole("radio", { name: "Kiri bawah" }).first().click().catch(() => {});
  const bubbleBg = await fr.evaluate(() => getComputedStyle(document.querySelector("yt-live-chat-text-message-renderer #content")).backgroundImage);
  ok("dua image pin bertumpuk sebagai lapisan background bubble", (bubbleBg.match(/url\("data:image/g) || []).length === 2, bubbleBg.slice(0, 120));
  const bubbleSize = await fr.evaluate(() => getComputedStyle(document.querySelector("yt-live-chat-text-message-renderer #content")).backgroundSize);
  // Chrome menyerialkan "32px auto" sebagai "32px", jadi yang dicek adalah dua pin selebar 32px lalu satu lapisan fill.
  ok("ukuran dua pin diterapkan (lebar 32px, tinggi mengikuti proporsi)", /^32px, 32px, auto$/.test(bubbleSize), bubbleSize);

  // ---------- keamanan upload ----------
  const badInput = props.locator('input[type="file"]').first();
  await badInput.setInputFiles({ name: "aman.png", mimeType: "image/png", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>") });
  await p.waitForTimeout(400);
  ok("SVG berpura-pura .png ditolak dari isinya", (await props.getByText(/Format tidak didukung/).count()) >= 1);
  // Sumber di atas 8 MB ditolak langsung, tanpa mencoba membaca isinya.
  const tooLargeSource = Buffer.concat([solidPng(4, 4, [0, 0, 0]), Buffer.alloc(9 * 1024 * 1024)]);
  await badInput.setInputFiles({ name: "raksasa.png", mimeType: "image/png", buffer: tooLargeSource });
  await p.waitForTimeout(400);
  ok("file sumber di atas 8 MB ditolak dengan pesan ukuran", (await props.getByText(/lebih dari 8 MB/).count()) >= 1);
  // File dengan byte mentah di atas 100 KB (dulu ditolak langsung) sekarang dimampatkan otomatis dan diterima,
  // karena batas 100 KB berlaku untuk hasil akhir, bukan lagi untuk file sumber.
  const bigButValid = Buffer.concat([solidPng(60, 60, [10, 120, 200]), Buffer.alloc(110 * 1024)]);
  ok("file uji ini sungguh di atas 100 KB", bigButValid.length > 100 * 1024, bigButValid.length);
  await badInput.setInputFiles({ name: "besar-tapi-sah.png", mimeType: "image/png", buffer: bigButValid });
  await p.waitForTimeout(600);
  ok("file besar tapi sah dimampatkan otomatis, tidak ditolak", (await props.getByRole("alert").count()) === 0);
  ok("CSS tidak memuat script atau isi file yang ditolak", !/alert\(1\)|<svg/.test(clip) && !/alert\(1\)/.test(await code()));

  // ---------- tidak ada pelanggaran CSP saat gambar data dipakai ----------
  ok("tidak ada pelanggaran CSP saat memakai gambar unggahan", csp.length === 0, csp.join(" | "));

  // ---------- Share: unggahan tidak ikut ----------
  await p.getByRole("tab", { name: "Designs" }).click();
  ok("catatan: gambar unggahan tidak ikut link Share", (await p.getByText(/gambar unggahan tidak ikut link Share/).count()) === 1);
  await p.getByRole("button", { name: "Buat link Share" }).click();
  const link = await p.getByLabel("Link Share desain").inputValue();
  const other = await ctx.newPage();
  other.setDefaultTimeout(8000);
  await other.goto(link, { waitUntil: "load" });
  await other.waitForTimeout(1200);
  const otherCss = await other.locator("pre code").first().textContent();
  ok("desain dari link Share tidak membawa gambar unggahan", !/data:image/.test(otherCss) && !/disingkat/.test(otherCss), otherCss.length);
  ok("link Share tetap membawa pengaturan lain (jarak nominal 20px)", /gap: [\d.]+(?:px|vw) [\d.]+(?:px|vw)/.test(otherCss));

  // ---------- Export file membawa unggahan, impor memulihkannya ----------
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Export file" }).click()]);
  await dl.saveAs("/tmp/dengan-gambar.json");
  const exported = JSON.parse(require("fs").readFileSync("/tmp/dengan-gambar.json", "utf8"));
  ok("file ekspor membawa gambar unggahan", JSON.stringify(exported).includes("data:image/png;base64,"));
  // Konteks baru = komputer lain (penyimpanan browser terpisah).
  const ictx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const imp = await ictx.newPage();
  imp.setDefaultTimeout(8000);
  await imp.goto(BASE, { waitUntil: "load" });
  await imp.getByRole("tab", { name: "Designs" }).click();
  await imp.locator('input[type="file"]').setInputFiles("/tmp/dengan-gambar.json");
  await imp.waitForTimeout(800);
  ok("impor file memulihkan gambar unggahan di komputer lain", (await imp.getByText(/gambar unggahan disingkat/).count()) === 1);

  // ---------- desain baru dari template ----------
  await p.getByRole("tab", { name: "Templates" }).click();
  await p.getByRole("button", { name: "Buat desain baru dari template Grid" }).click();
  await p.waitForTimeout(400);
  ok("Buat desain baru dari template: desain baru aktif tanpa gambar unggahan", (await p.inputValue("#design-name")) === "New design" && !/disingkat/.test(await p.locator("pre code").first().textContent()) && (await p.locator("pre code").first().textContent()).includes("Rajdhani"));
  await p.getByRole("tab", { name: "Designs" }).click();
  await p.getByRole("button", { name: "New", exact: true }).click();
  await p.waitForTimeout(300);
  await p.getByRole("tab", { name: "Templates" }).click();
  ok("New membuat desain kosong (Plain, tanpa bubble)", !/box-shadow: 0 0 18px/.test(await p.locator("pre code").first().textContent()) && (await p.getByRole("button", { name: "Pakai template Plain" }).getAttribute("aria-pressed")) === "true");
  ok("tidak ada pelanggaran CSP sepanjang sesi", csp.length === 0, csp.join(" | "));

  await p.screenshot({ path: "/home/claude/lazycustom/shots/img-final.png" }).catch(() => {});
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} lulus`);
  console.log("page errors:", JSON.stringify(pageErrors));
  await browser.close();
})().catch((e) => { console.error("SKRIP BERHENTI:", e.message.slice(0, 700)); process.exit(1); });
