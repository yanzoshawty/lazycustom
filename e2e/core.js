const { chromium } = require("playwright-core");
const fs = require("fs");
const BASE = process.env.BASE_URL || "http://localhost:3100/";
const results = [];
function ok(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail: cond ? "" : String(detail).slice(0, 300) });
  console.log((cond ? "  ok  " : "  GAGAL ") + name + (cond ? "" : " | " + String(detail).slice(0, 200)));
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const pageErrors = [];
  const badLocal = [];

  async function newPage(opts = {}, theme = "dark") {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...opts });
    await ctx.addInitScript((t) => { try { if (!localStorage.getItem("lc-theme")) localStorage.setItem("lc-theme", t); } catch {} }, theme);
    const p = await ctx.newPage();
    p.setDefaultTimeout(8000);
    p.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
    p.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) badLocal.push(r.status() + " " + r.url()); });
    return { ctx, p };
  }
  const frameOf = async (p) => (await p.locator('iframe[title^="Preview chat"]').elementHandle()).contentFrame();
  const props = (p) => p.locator('aside[aria-label="Properties"]');
  const heading = async (p) => (await props(p).locator("h2").first().textContent()).trim();
  const cssText = (p) => p.locator("pre code").first().textContent();
  // Jeda hanya bila sedang berjalan (Restart tidak mengubah status jeda).
  const pause = async (p) => {
    const b = p.getByRole("button", { name: "Pause", exact: true });
    if (await b.isVisible()) await b.click();
  };

  // ---------- 1. Muat halaman dan simulasi berjalan ----------
  let { ctx, p } = await newPage();
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(600);
  let fr = await frameOf(p);
  ok("halaman tampil dengan judul dan template default Crystal", (await p.title()).includes("lazycustom") && (await p.inputValue("#design-name")) === "Crystal");
  const count = () => fr.evaluate(() => window.__lc.count());
  await p.waitForTimeout(3500);
  const c1 = await count();
  ok("simulator memuat pesan otomatis", c1 >= 2, c1);
  const kinds = new Set();
  for (let i = 0; i < 14; i++) {
    kinds.add(await fr.evaluate(() => document.getElementById("items").lastElementChild.tagName.toLowerCase()));
    await p.waitForTimeout(700);
  }
  ok("simulator menampilkan beberapa jenis pesan seiring waktu", kinds.size >= 2, [...kinds].join(","));

  await pause(p);
  const lastBefore = await fr.evaluate(() => document.getElementById("items").lastElementChild.textContent);
  await p.waitForTimeout(2200);
  const lastAfter = await fr.evaluate(() => document.getElementById("items").lastElementChild.textContent);
  ok("Pause menghentikan pesan baru", lastBefore === lastAfter);
  ok("tombol jadi Play saat dijeda", await p.getByRole("button", { name: "Play", exact: true }).isVisible());
  await p.getByRole("button", { name: "Play", exact: true }).click();
  await p.waitForTimeout(2600);
  const lastResumed = await fr.evaluate(() => document.getElementById("items").lastElementChild.textContent);
  ok("Play melanjutkan pesan baru", lastResumed !== lastAfter);

  await pause(p);
  for (const [label, sel] of [["Super Chat", "yt-live-chat-paid-message-renderer"], ["Membership", "yt-live-chat-membership-item-renderer"], ["Sticker", "yt-live-chat-paid-sticker-renderer"]]) {
    await p.getByRole("button", { name: label, exact: true }).click();
    await p.waitForTimeout(250);
    ok(`tombol Send ${label} menambah kartu`, (await fr.locator(sel).count()) >= 1);
  }
  await p.getByRole("button", { name: "Message", exact: true }).click();
  await p.getByRole("button", { name: "Owner", exact: true }).click();
  await p.waitForTimeout(250);
  ok("Send Owner memakai author-type owner", (await fr.locator('yt-live-chat-text-message-renderer[author-type="owner"]').count()) >= 1);
  await p.getByRole("button", { name: "Mulai ulang simulasi" }).click();
  await p.waitForTimeout(1500);
  ok("Restart mengosongkan lalu memulai ulang", (await count()) <= 5);
  await p.getByRole("button", { name: "Kosongkan chat" }).click();
  await p.waitForTimeout(200);
  ok("Clear mengosongkan chat", (await count()) === 0);

  // ---------- 2. Klik elemen di preview memilih layer ----------
  await p.getByRole("button", { name: "Mulai ulang simulasi" }).click();
  await p.waitForTimeout(1600);
  await pause(p);
  for (const kind of ["Member", "Super Chat", "Membership", "Sticker"]) await p.getByRole("button", { name: kind, exact: true }).click();
  await p.waitForTimeout(300);
  const pick = async (sel, expected, label) => {
    await fr.locator(sel).last().click({ force: true, timeout: 5000 });
    await p.waitForTimeout(150);
    const h = await heading(p);
    ok(`klik ${label} memilih layer ${expected}`, h === expected, h);
  };
  await pick('yt-live-chat-text-message-renderer[author-type="member"] #message', "Message text", "teks pesan");
  await pick('yt-live-chat-text-message-renderer[author-type="member"] #author-name', "Name", "nama");
  await pick('yt-live-chat-text-message-renderer[author-type="member"] #author-photo', "Avatar", "avatar");
  await pick("yt-live-chat-paid-message-renderer #purchase-amount", "Super Chat", "kartu Super Chat");
  await pick("yt-live-chat-membership-item-renderer #header-subtext", "Membership", "kartu Membership");
  await pick("yt-live-chat-paid-sticker-renderer #sticker", "Sticker", "kartu Sticker");
  // area bubble: klik di tepi kiri dalam bubble (padding), bukan pada teks
  const bub = fr.locator('yt-live-chat-text-message-renderer[author-type="member"] #content').last();
  const bb = await bub.boundingBox();
  await p.mouse.click(bb.x + 3, bb.y + bb.height / 2);
  await p.waitForTimeout(150);
  ok("klik padding bubble memilih layer Bubble", (await heading(p)) === "Bubble", await heading(p));
  // sorotan layer terpilih
  const hl = await fr.evaluate(() => document.getElementById("lc-hl").textContent);
  ok("layer terpilih disorot di preview", hl.includes("outline"), hl);

  // ---------- 3. Edit properti langsung mengubah preview dan CSS ----------
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.getByRole("button", { name: /Message text$/ }).click();
  ok("memilih layer lewat daftar Layers", (await heading(p)) === "Message text");
  const colorInput = props(p).getByLabel("Warna teks", { exact: true }).first();
  await colorInput.fill("#FF0000");
  await p.waitForTimeout(400);
  ok("edit warna teks masuk ke CSS", (await cssText(p)).includes("color: #FF0000"));
  const inFrame = await fr.evaluate(() => document.getElementById("lc-style").textContent.includes("#FF0000"));
  ok("edit warna teks sampai ke iframe preview", inFrame);
  const computed = await fr.evaluate(() => getComputedStyle(document.querySelector("yt-live-chat-text-message-renderer #message")).color);
  ok("warna teks benar-benar tampil merah di preview", computed === "rgb(255, 0, 0)", computed);
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  await p.waitForTimeout(300);
  ok("Undo mengembalikan warna", !(await cssText(p)).includes("color: #FF0000"));
  await p.getByRole("button", { name: "Redo", exact: true }).click();
  await p.waitForTimeout(300);
  ok("Redo menerapkan lagi", (await cssText(p)).includes("color: #FF0000"));
  await p.getByRole("tab", { name: "Templates" }).click();
  const activeTemplates = await p.locator('button[aria-label^="Pakai template"][aria-pressed="true"]').count();
  ok("edit menandai desain sebagai custom (tidak ada template yang Aktif)", activeTemplates === 0, activeTemplates);
  await p.getByRole("tab", { name: "Layers" }).click();

  // ---------- 4. Template ----------
  await p.getByRole("tab", { name: "Templates" }).click();
  await p.getByRole("button", { name: "Pakai template Grid" }).click();
  await p.waitForTimeout(400);
  ok("template Grid diterapkan (font Rajdhani)", (await cssText(p)).includes("family=Rajdhani"));
  ok("nama desain dipertahankan saat ganti template", (await p.inputValue("#design-name")) === "Crystal");
  ok("template aktif ditandai", await p.getByRole("button", { name: "Pakai template Grid" }).getAttribute("aria-pressed") === "true");
  ok("perubahan warna teks hilang setelah template", !(await cssText(p)).includes("color: #FF0000"));
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  await p.waitForTimeout(250);
  ok("Undo membatalkan pergantian template", (await cssText(p)).includes("color: #FF0000"));

  // ---------- 5. Layers: urutan bagian pesan ----------
  await p.getByRole("button", { name: "Pakai template Crystal" }).click();
  await p.getByRole("tab", { name: "Layers" }).click();
  const order = async () => p.locator('[aria-labelledby="parts-title"] ul > li').evaluateAll((els) => els.map((e) => e.textContent.replace(/^\s*\d+/, "").trim()));
  const before = await order();
  ok("urutan awal: Timestamp, Name, Badges, Message text", before.join("|") === "Timestamp|Name|Badges|Message text", before.join("|"));
  await p.getByRole("button", { name: "Pindahkan Message text ke atas" }).click();
  await p.waitForTimeout(300);
  const after = await order();
  ok("tombol panah memindahkan bagian", after.join("|") === "Timestamp|Name|Message text|Badges", after.join("|"));
  ok("urutan baru masuk ke CSS (message order: 2)", /#message-container,[^{]*\{[^}]*order: 2 !important/.test(await cssText(p)));
  // drag & drop dengan mouse
  const handle = p.getByRole("button", { name: "Seret Timestamp untuk mengubah urutan" });
  const target = p.getByRole("button", { name: "Seret Badges untuk mengubah urutan" });
  const hb = await handle.boundingBox();
  const tb = await target.boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await p.mouse.down();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 10, { steps: 4 });
  await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height + 12, { steps: 14 });
  await p.mouse.up();
  await p.waitForTimeout(500);
  const dragged = await order();
  ok("drag and drop memindahkan Timestamp ke bawah", dragged[0] !== "Timestamp" && dragged.indexOf("Timestamp") > 1, dragged.join("|"));
  // toggle visibilitas
  await p.getByRole("button", { name: "Tampilkan Timestamp" }).click();
  await p.waitForTimeout(250);
  ok("mata Timestamp menampilkan timestamp di CSS", /#timestamp \{[^}]*display: block/.test(await cssText(p)));

  // ---------- 6. Dekorasi ----------
  await p.getByRole("button", { name: "Pakai template Crystal" }).click().catch(async () => { await p.getByRole("tab", { name: "Templates" }).click(); await p.getByRole("button", { name: "Pakai template Crystal" }).click(); });
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.getByRole("button", { name: /^Bubble/ }).first().click();
  await props(p).getByRole("button", { name: "Corner brackets", exact: true }).click();
  await p.waitForTimeout(300);
  ok("tambah Corner brackets masuk ke CSS", /background-size:[^;]*[\d.]+(?:px|vw)[^,;]*[\d.]+(?:px|vw)/.test(await cssText(p)));
  await props(p).getByRole("button", { name: "Scanlines", exact: true }).click();
  await p.waitForTimeout(250);
  ok("tambah Scanlines masuk ke CSS", (await cssText(p)).includes("repeating-linear-gradient"));
  await props(p).getByRole("button", { name: "Image (latar)", exact: true }).click();
  const url = props(p).getByLabel("Link gambar atau GIF", { exact: true });
  await url.fill('https://x.test/a.png")}body{display:none');
  await p.waitForTimeout(250);
  ok("link gambar berbahaya ditolak dengan pesan", (await props(p).getByText(/harus diawali https/).count()) === 1);
  ok("link berbahaya tidak masuk ke CSS", !(await cssText(p)).includes("display:none") && !(await cssText(p)).includes("x.test"));
  await url.fill("https://cdn.example.com/hiasan.gif");
  await p.waitForTimeout(300);
  ok("link gambar valid masuk ke CSS", (await cssText(p)).includes('url("https://cdn.example.com/hiasan.gif")'));
  ok("Image hanya satu per permukaan (tombol nonaktif)", await props(p).getByRole("button", { name: "Image (latar)", exact: true }).isDisabled());
  await props(p).getByRole("button", { name: /Hapus Scanlines/ }).click();
  await p.waitForTimeout(250);
  ok("hapus dekorasi menghilangkannya dari CSS", !(await cssText(p)).includes("repeating-linear-gradient"));

  await ctx.close();

  // ---------- Ringkasan ----------
  fs.writeFileSync("/tmp/e2e_core.json", JSON.stringify({ results, pageErrors, badLocal }, null, 1));
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} lulus`);
  for (const f of failed) console.log("GAGAL:", f.name, "|", f.detail);
  console.log("page errors:", JSON.stringify(pageErrors));
  console.log("respons lokal gagal:", JSON.stringify(badLocal));
  await browser.close();
})().catch((e) => { console.error("SKRIP BERHENTI:", e.message.slice(0, 500)); process.exit(1); });
