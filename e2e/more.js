const { chromium } = require("playwright-core");
const fs = require("fs");
const BASE = process.env.BASE_URL || "http://localhost:3100/";
const results = [];
function ok(name, cond, detail = "") {
  results.push({ name, pass: !!cond });
  console.log((cond ? "  ok  " : "  GAGAL ") + name + (cond ? "" : " | " + String(detail).slice(0, 240)));
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const pageErrors = [];
  async function newPage(opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...opts });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("lc-theme")) localStorage.setItem("lc-theme", "dark"); } catch {} });
    const p = await ctx.newPage();
    p.setDefaultTimeout(8000);
    p.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
    return { ctx, p };
  }
  const frameOf = async (p) => (await p.locator('iframe[title^="Preview chat"]').elementHandle()).contentFrame();
  const props = (p) => p.locator('aside[aria-label="Properties"]');
  const cssText = (p) => p.locator("pre code").first().textContent();

  // ---------- A. My Designs ----------
  let { ctx, p } = await newPage();
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.getByRole("tab", { name: "Designs" }).click();
  ok("My Designs menampilkan 1/20 awalnya", (await p.getByText("My Designs (1/20)").count()) === 1);
  await p.getByRole("button", { name: "New", exact: true }).click();
  await p.waitForTimeout(300);
  ok("New membuat desain kedua dan mengaktifkannya", (await p.getByText("My Designs (2/20)").count()) === 1 && (await p.inputValue("#design-name")) === "New design");
  await p.fill("#design-name", "Overlay Kopi");
  await p.waitForTimeout(200);
  ok("nama desain bisa diganti", (await p.getByText("Overlay Kopi", { exact: false }).count()) >= 1);
  await p.fill("#design-name", "");
  ok("kolom nama boleh dikosongkan sementara", (await p.inputValue("#design-name")) === "");
  await p.fill("#design-name", "Overlay Kopi");
  await p.getByRole("button", { name: "Duplicate", exact: true }).click();
  await p.waitForTimeout(300);
  ok("Duplicate membuat 'Overlay Kopi copy'", (await p.inputValue("#design-name")) === "Overlay Kopi copy");
  ok("jumlah desain menjadi 3", (await p.getByText("My Designs (3/20)").count()) === 1);
  await p.waitForTimeout(600);
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(500);
  ok("desain aktif tersimpan setelah reload", (await p.inputValue("#design-name")) === "Overlay Kopi copy");
  await p.getByRole("tab", { name: "Designs" }).click();
  ok("ketiga desain tersimpan setelah reload", (await p.getByText("My Designs (3/20)").count()) === 1);
  // buka desain lain
  await p.getByRole("button", { name: /^Overlay Kopi\s*Buka/ }).first().click();
  await p.waitForTimeout(250);
  ok("membuka desain lain dari daftar", (await p.inputValue("#design-name")) === "Overlay Kopi");
  // hapus dua langkah
  const delBtn = p.getByRole("button", { name: "Hapus Overlay Kopi copy" });
  await delBtn.click();
  ok("hapus butuh klik kedua", (await p.getByRole("button", { name: "Klik lagi untuk menghapus Overlay Kopi copy" }).count()) === 1 && (await p.getByText("My Designs (3/20)").count()) === 1);
  await p.getByRole("button", { name: "Klik lagi untuk menghapus Overlay Kopi copy" }).click();
  await p.waitForTimeout(250);
  ok("klik kedua menghapus desain", (await p.getByText("My Designs (2/20)").count()) === 1);
  // batas 20
  for (let i = 0; i < 18; i++) await p.getByRole("button", { name: "New", exact: true }).click();
  await p.waitForTimeout(300);
  ok("batas 20 desain: tombol New dan Duplicate nonaktif", (await p.getByText("My Designs (20/20)").count()) === 1 && (await p.getByRole("button", { name: "New", exact: true }).isDisabled()) && (await p.getByRole("button", { name: "Duplicate", exact: true }).isDisabled()));
  await ctx.close();

  // ---------- B. Share ----------
  ({ ctx, p } = await newPage({ permissions: ["clipboard-read", "clipboard-write"] }));
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(500);
  await p.fill("#design-name", "Desain Dibagikan");
  await p.getByRole("tab", { name: "Templates" }).click();
  await p.getByRole("button", { name: "Pakai template Holo" }).click();
  await p.getByRole("tab", { name: "Designs" }).click();
  await p.getByRole("button", { name: "Buat link Share" }).click();
  const link = await p.getByLabel("Link Share desain").inputValue();
  ok("link Share terbentuk dengan #d=", /#d=z\./.test(link), link.slice(0, 60));
  ok("link Share ringkas (<3000 karakter)", link.length < 3000, link.length);
  await p.getByRole("button", { name: "Copy link" }).click();
  await p.waitForTimeout(200);
  ok("Copy link menyalin ke clipboard", (await p.evaluate(() => navigator.clipboard.readText())) === link);
  await p.fill("#design-name", "Sudah Diubah");
  await p.waitForTimeout(200);
  ok("link Share ditandai usang setelah desain berubah", (await p.getByText(/Desain sudah berubah sejak link dibuat/).count()) === 1);

  const other = await newPage();
  await other.p.goto(link, { waitUntil: "load" });
  await other.p.waitForTimeout(1200);
  ok("membuka link Share: desain Holo dengan nama asli", (await other.p.inputValue("#design-name")) === "Desain Dibagikan");
  ok("pemberitahuan desain dari link Share muncul", (await other.p.getByText(/dibuka sebagai desain baru/).count()) === 1);
  ok("alamat dibersihkan dari hash", !(await other.p.evaluate(() => location.hash)));
  ok("CSS desain terbagi memakai font Chakra Petch (Holo)", (await cssText(other.p)).includes("family=Chakra+Petch"));
  ok("desain bersama tersimpan sebagai desain baru", await (async () => { await other.p.getByRole("tab", { name: "Designs" }).click(); return (await other.p.getByText("My Designs (2/20)").count()) === 1; })());
  await other.ctx.close();

  const bad = await newPage();
  await bad.p.goto(BASE + "#d=z.rusakrusak", { waitUntil: "load" });
  await bad.p.waitForTimeout(1000);
  ok("link Share rusak menampilkan pesan error dengan kode laporan", (await bad.p.getByText("Link Share tidak bisa dibuka").count()) === 1 && (await bad.p.getByText(/Kode laporan: LC-/).count()) === 1);
  ok("link rusak tidak membuat desain baru", (await bad.p.inputValue("#design-name")) === "Crystal");
  await bad.ctx.close();
  const huge = await newPage();
  await huge.p.goto(BASE + "#d=z." + "A".repeat(13000), { waitUntil: "load" });
  await huge.p.waitForTimeout(800);
  ok("link Share terlalu besar ditolak dengan pesan yang tepat", (await huge.p.getByText("Link Share terlalu besar").count()) === 1);
  await huge.ctx.close();

  // ---------- C. Export/Import file ----------
  await p.getByRole("tab", { name: "Designs" }).click();
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Export file" }).click()]);
  const file = "/tmp/desain-export.json";
  await dl.saveAs(file);
  ok("nama file ekspor dari nama desain", dl.suggestedFilename() === "sudah-diubah.lazycustom.json", dl.suggestedFilename());
  const exported = JSON.parse(fs.readFileSync(file, "utf8"));
  ok("isi file ekspor adalah desain v2", exported.v === 2 && exported.name === "Sudah Diubah");
  const imp = await newPage();
  await imp.p.goto(BASE, { waitUntil: "load" });
  await imp.p.getByRole("tab", { name: "Designs" }).click();
  await imp.p.locator('input[type="file"]').setInputFiles(file);
  await imp.p.waitForTimeout(600);
  ok("impor file membuat desain baru yang aktif", (await imp.p.inputValue("#design-name")) === "Sudah Diubah" && (await imp.p.getByText("My Designs (2/20)").count()) === 1);
  fs.writeFileSync("/tmp/rusak.json", "{bukan json");
  await imp.p.locator('input[type="file"]').setInputFiles("/tmp/rusak.json");
  await imp.p.waitForTimeout(400);
  ok("impor file rusak menampilkan pesan dan kode laporan", (await imp.p.getByText(/File itu|tidak bisa dibaca|tidak valid|rusak/i).count()) >= 1 && (await imp.p.getByText(/Kode laporan: LC-/).count()) === 1);
  fs.writeFileSync("/tmp/lawas.json", JSON.stringify({ v: 1 }));
  await imp.p.locator('input[type="file"]').setInputFiles("/tmp/lawas.json");
  await imp.p.waitForTimeout(400);
  ok("impor file versi lain ditolak", (await imp.p.locator('[data-error-code="IMPORT_VERSION"]').count()) === 1);
  await imp.ctx.close();

  // ---------- D. Salin CSS ----------
  await p.getByRole("button", { name: /Copy CSS|Tersalin/ }).first().click();
  await p.waitForTimeout(200);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok("Copy CSS menyalin persis isi kotak CSS", clip === (await cssText(p)) && clip.includes("yt-live-chat-text-message-renderer"));
  ok("tombol berubah jadi Tersalin", (await p.getByRole("button", { name: /Tersalin/ }).count()) >= 1);
  await ctx.close();

  // ---------- E. Tema ----------
  ({ ctx, p } = await newPage());
  await p.goto(BASE, { waitUntil: "load" });
  ok("tema bawaan gelap", await p.evaluate(() => document.documentElement.classList.contains("dark")));
  await p.getByRole("button", { name: "Mode gelap" }).click();
  ok("toggle beralih ke terang", !(await p.evaluate(() => document.documentElement.classList.contains("dark"))));
  await p.reload({ waitUntil: "load" });
  ok("pilihan tema terang bertahan setelah reload", !(await p.evaluate(() => document.documentElement.classList.contains("dark"))));
  await ctx.close();

  // ---------- F. Animasi terlihat di preview ----------
  ({ ctx, p } = await newPage());
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(500);
  const fr = await frameOf(p);
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.getByRole("button", { name: /^Animation/ }).click();
  for (const [label, name] of [["Fade", "lc-fade"], ["Slide up", "lc-slide-up"], ["Slide from left", "lc-slide-left"], ["Slide from right", "lc-slide-right"], ["Pop", "lc-pop"], ["Zoom", "lc-zoom"], ["Blur in", "lc-blur-in"], ["None (tanpa animasi)", "none"]]) {
    await props(p).getByLabel("Gaya animasi").selectOption({ label });
    await p.getByRole("button", { name: "Message", exact: true }).click();
    const anim = await fr.evaluate(() => getComputedStyle(document.getElementById("items").lastElementChild).animationName);
    ok(`animasi ${label} benar-benar berjalan di pesan baru`, anim === name, anim);
  }
  // animasi bergerak sungguhan: transform/opacity berubah selama durasi
  await props(p).getByLabel("Gaya animasi").selectOption({ label: "Slide up" });
  await props(p).getByLabel("Durasi").fill("1000");
  await p.getByRole("button", { name: "Message", exact: true }).click();
  const samples = await fr.evaluate(async () => {
    const el = document.getElementById("items").lastElementChild;
    const out = [];
    for (let i = 0; i < 5; i++) { out.push(getComputedStyle(el).opacity); await new Promise((r) => setTimeout(r, 150)); }
    return out;
  });
  ok("opacity pesan naik selama animasi (terlihat bergerak)", parseFloat(samples[0]) < parseFloat(samples[samples.length - 1]), samples.join(","));
  await ctx.close();

  // ---------- G. Gerak minimal ----------
  ({ ctx, p } = await newPage({ reducedMotion: "reduce" }));
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(700);
  const frr = await frameOf(p);
  ok("prefers-reduced-motion: notifikasi toggle muncul", (await p.getByText("Tampilkan animasi di preview").count()) === 1);
  ok("animasi preview dimatikan saat gerak minimal", (await frr.evaluate(() => document.getElementById("lc-motion").textContent)).includes("animation:none"));
  await p.getByRole("switch", { name: /Tampilkan animasi di preview/ }).check({ force: true });
  await p.waitForTimeout(300);
  ok("pengguna bisa tetap menyalakan animasi preview", (await frr.evaluate(() => document.getElementById("lc-motion").textContent)) === "");
  await ctx.close();

  // ---------- H. Keyboard ----------
  ({ ctx, p } = await newPage());
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(500);
  const tabbed = [];
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press("Tab");
    tabbed.push(await p.evaluate(() => document.activeElement.tagName));
  }
  ok("iframe preview bukan tab stop keyboard", !tabbed.includes("IFRAME"), tabbed.join(","));
  ok("fokus keyboard tidak macet di body", tabbed.filter((t) => t !== "BODY").length >= 25);
  await ctx.close();

  fs.writeFileSync("/tmp/e2e_more.json", JSON.stringify({ results, pageErrors }, null, 1));
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} lulus`);
  console.log("page errors:", JSON.stringify(pageErrors));
  await browser.close();
})().catch((e) => { console.error("SKRIP BERHENTI:", e.message.slice(0, 600)); process.exit(1); });
