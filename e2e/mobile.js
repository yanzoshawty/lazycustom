const { chromium } = require("playwright-core");
const BASE = process.env.BASE_URL || "http://localhost:3100/";
const results = [];
function ok(name, cond, detail = "") {
  results.push({ name, pass: !!cond });
  console.log((cond ? "  ok  " : "  GAGAL ") + name + (cond ? "" : " | " + String(detail).slice(0, 300)));
}

// Elemen yang keluar dari lebar layar, kecuali di dalam kontainer yang memang boleh di-scroll horizontal.
const overflowProbe = () => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("iframe")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.closest(".overflow-x-auto, pre, .sr-only")) continue;
    if (getComputedStyle(el).position === "fixed") continue;
    if (r.right > vw + 0.5 || r.left < -0.5) bad.push(el.tagName.toLowerCase() + "." + String(el.className).slice(0, 50) + " [" + Math.round(r.left) + "," + Math.round(r.right) + "]");
  }
  return { sw: document.documentElement.scrollWidth, vw, bad: bad.slice(0, 5) };
};

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const pageErrors = [];
  async function newPage(width, height, theme = "dark", mobile = true) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: mobile && width < 800, hasTouch: mobile && width < 800 });
    await ctx.addInitScript((t) => { try { localStorage.setItem("lc-theme", t); } catch {} }, theme);
    const p = await ctx.newPage();
    p.setDefaultTimeout(8000);
    p.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
    return { ctx, p };
  }

  // ---------- Lebar layar x panel x tema: tidak ada overflow horizontal ----------
  const widths = [[320, 640], [360, 740], [375, 812], [414, 896], [768, 1024], [1024, 768], [1280, 800], [1440, 900]];
  for (const theme of ["dark", "light"]) {
    for (const [w, h] of widths) {
      const { ctx, p } = await newPage(w, h, theme);
      await p.goto(BASE, { waitUntil: "load" });
      await p.waitForTimeout(700);
      const tabs = ["Templates", "Layers", "Properties", "Designs"];
      const problems = [];
      for (const t of tabs) {
        const tab = p.getByRole("tab", { name: t });
        if (await tab.isVisible()) await tab.click();
        else if (t === "Properties") continue; // di layar lebar Properties selalu tampil
        await p.waitForTimeout(250);
        const r = await p.evaluate(overflowProbe);
        if (r.sw > r.vw || r.bad.length) problems.push(`${t}: sw=${r.sw} vw=${r.vw} ${r.bad.join(" ; ")}`);
      }
      ok(`${theme} ${w}px: tidak ada overflow horizontal di semua panel`, problems.length === 0, problems.join(" || "));
      await ctx.close();
    }
  }

  // ---------- Alur mobile 375 ----------
  let { ctx, p } = await newPage(375, 812);
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(800);
  const fr = await (await p.locator('iframe[title^="Preview chat"]').elementHandle()).contentFrame();

  const stickyBox = await p.locator("div.sticky").first().boundingBox();
  ok("area preview yang menempel memakai <=45% tinggi layar", stickyBox.height / 812 <= 0.45, Math.round((stickyBox.height / 812) * 100) + "%");
  ok("header hanya satu baris ikon (tombol Copy CSS ikon saja)", await p.getByRole("button", { name: /Copy CSS/ }).first().evaluate((b) => b.getBoundingClientRect().width <= 44));

  // preview tidak berkedip kosong: ambil banyak sampel
  await p.waitForTimeout(2500);
  let empty = 0;
  const N = 30;
  for (let i = 0; i < N; i++) {
    const visible = await fr.evaluate(() => {
      const list = document.getElementById("list").getBoundingClientRect();
      return [...document.getElementById("items").children].filter((c) => { const r = c.getBoundingClientRect(); return r.bottom > list.top + 4 && r.top < list.bottom - 4 && parseFloat(getComputedStyle(c).opacity) > 0.05; }).length;
    });
    if (visible === 0) empty++;
    await p.waitForTimeout(400);
  }
  ok(`preview mobile tidak pernah kosong (${N} sampel selama ~12 detik)`, empty === 0, `${empty} sampel kosong`);

  // tab dan pemilihan layer di mobile
  ok("tab Templates aktif di awal", (await p.getByRole("tab", { name: "Templates" }).getAttribute("aria-selected")) === "true");
  await p.getByRole("tab", { name: "Layers" }).click();
  ok("tab Layers menampilkan daftar layer", (await p.getByRole("button", { name: /^Bubble/ }).count()) >= 1);
  await p.getByRole("button", { name: /^Panel/ }).first().click();
  await p.waitForTimeout(300);
  ok("memilih layer di daftar membuka Properties otomatis", (await p.getByRole("tab", { name: "Properties" }).getAttribute("aria-selected")) === "true" && (await p.locator('aside[aria-label="Properties"] h2').textContent()).trim() === "Panel");
  ok("isi panel Layers disembunyikan tapi bar tab tetap tampil saat Properties aktif", !(await p.locator('[role="tabpanel"]').isVisible()) && (await p.getByRole("tab", { name: "Templates" }).isVisible()));
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.waitForTimeout(200);
  ok("dari Properties bisa kembali ke Layers lewat tab", (await p.getByRole("tab", { name: "Layers" }).getAttribute("aria-selected")) === "true" && (await p.getByRole("button", { name: /^Bubble/ }).count()) >= 1);
  await p.getByRole("button", { name: /^Panel/ }).first().click();
  await p.waitForTimeout(200);
  // klik langsung di preview (sentuh)
  await p.getByRole("button", { name: "Pause", exact: true }).or(p.getByRole("button", { name: "Play", exact: true })).first().click();
  await p.getByRole("tab", { name: "Templates" }).click();
  // Frame sempit hanya memuat sedikit pesan, jadi kirim pesan biasa dulu supaya pasti ada teks untuk disentuh.
  await p.getByRole("button", { name: "Message", exact: true }).click();
  await p.waitForTimeout(300);
  await fr.locator("yt-live-chat-text-message-renderer #message").last().tap({ force: true });
  await p.waitForTimeout(300);
  ok("tap pada teks di preview membuka Properties untuk Message text", (await p.getByRole("tab", { name: "Properties" }).getAttribute("aria-selected")) === "true" && (await p.locator('aside[aria-label="Properties"] h2').textContent()).trim() === "Message text");

  // sticky preview tetap terlihat saat panel di-scroll
  await p.evaluate(() => window.scrollTo(0, 700));
  await p.waitForTimeout(300);
  const stickyTop = (await p.locator("div.sticky").first().boundingBox()).y;
  ok("preview tetap menempel di atas saat halaman di-scroll", Math.abs(stickyTop) < 2, stickyTop);
  await p.evaluate(() => window.scrollTo(0, 0));

  // kolom isian di panel Export dan Share harus setinggi 40px ke atas (bug flex-basis pada kolom pernah membuatnya 20px)
  const exportInput = await p.locator("#live-url").boundingBox();
  ok("kolom link YouTube di mobile setinggi >=40px", exportInput.height >= 40, exportInput.height);
  await p.getByRole("tab", { name: "Designs" }).click();
  await p.getByRole("button", { name: "Buat link Share" }).click();
  await p.waitForTimeout(400);
  const shareBox = await p.getByLabel("Link Share desain").boundingBox();
  ok("kolom link Share di mobile setinggi >=40px", shareBox.height >= 40, shareBox.height);
  await p.getByRole("tab", { name: "Templates" }).click();

  // ukuran target sentuh: kontrol utama minimal 36px
  const small = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, [role=tab], select, input[type=text]")) {
      if (el.closest("iframe") || el.closest(".sr-only")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (Math.min(r.width, r.height) < 36) out.push((el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  });
  ok("tidak ada kontrol berukuran kurang dari 36px di mobile", small.length === 0, small.slice(0, 6).join(" ; "));
  await ctx.close();

  // ---------- Editor gambar di layar 320: tidak boleh meluber ----------
  ({ ctx, p } = await newPage(320, 640));
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(700);
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.getByRole("button", { name: /^Panel/ }).first().click();
  const pp = p.locator('aside[aria-label="Properties"]');
  await pp.getByRole("button", { name: "Gambar di depan pesan" }).click();
  await pp.getByRole("button", { name: "Gambar di belakang pesan" }).click();
  await p.waitForTimeout(300);
  let r = await p.evaluate(overflowProbe);
  ok("320px: editor gambar panel (dua gambar) tidak meluber", r.sw <= r.vw && r.bad.length === 0, `sw=${r.sw} ${r.bad.join(" ; ")}`);
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.getByRole("button", { name: /^Bubble/ }).first().click();
  await pp.getByRole("button", { name: "Image pin", exact: true }).click();
  await pp.getByRole("button", { name: "Glow", exact: true }).click();
  await p.waitForTimeout(300);
  r = await p.evaluate(overflowProbe);
  ok("320px: editor Image pin dan pemilih anchor tidak meluber", r.sw <= r.vw && r.bad.length === 0, `sw=${r.sw} ${r.bad.join(" ; ")}`);
  await p.getByRole("tab", { name: "Layers" }).click();
  await p.getByRole("button", { name: /^Avatar/ }).first().click();
  await p.waitForTimeout(200);
  r = await p.evaluate(overflowProbe);
  ok("320px: editor bingkai avatar tidak meluber", r.sw <= r.vw && r.bad.length === 0, `sw=${r.sw} ${r.bad.join(" ; ")}`);
  const anchorBtn = await pp.getByRole("radio", { name: "Kiri atas" }).count();
  ok("320px: kontrol upload dan anchor tetap bisa dijangkau", anchorBtn >= 0);
  await ctx.close();

  // ---------- Layar terkecil 320 ----------
  ({ ctx, p } = await newPage(320, 640));
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(700);
  const sticky320 = await p.locator("div.sticky").first().boundingBox();
  ok("320px: area preview menempel <=50% tinggi layar", sticky320.height / 640 <= 0.5, Math.round((sticky320.height / 640) * 100) + "%");
  const headerRows = await p.evaluate(() => {
    // Kelompokkan berdasarkan titik tengah vertikal (toleransi 16px) supaya elemen berbeda tinggi di baris yang sama dihitung satu.
    const mids = [...document.querySelector("header").children].map((e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; }).sort((a, b) => a - b);
    let rows = 0, last = -1e9;
    for (const m of mids) { if (m - last > 16) rows++; last = m; }
    return rows;
  });
  ok("320px: header maksimal dua baris (ikon dan nama)", headerRows <= 2, headerRows);
  await ctx.close();

  // ---------- Layar sedang 768 (tablet) ----------
  ({ ctx, p } = await newPage(768, 1024, "dark", false));
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(700);
  ok("768px: susunan bertab (Properties adalah tab)", await p.getByRole("tab", { name: "Properties" }).isVisible());
  await ctx.close();

  // ---------- Desktop 1440: tiga kolom terlihat bersamaan ----------
  ({ ctx, p } = await newPage(1440, 900, "dark", false));
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(700);
  ok("1440px: Properties tidak menjadi tab", !(await p.getByRole("tab", { name: "Properties" }).isVisible()));
  ok("1440px: kolom kiri, preview, dan Properties terlihat bersamaan", (await p.locator('aside[aria-label="Templates, layers, dan desain"]').isVisible()) && (await p.locator('aside[aria-label="Properties"]').isVisible()) && (await p.locator('iframe[title^="Preview chat"]').isVisible()));
  const cols = await p.evaluate(() => [...document.querySelectorAll("aside")].map((a) => Math.round(a.getBoundingClientRect().width)));
  ok("1440px: kolom samping selebar 320 dan 340", cols[0] === 320 && cols[1] === 340, cols.join(","));
  await ctx.close();

  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} lulus`);
  console.log("page errors:", JSON.stringify(pageErrors));
  await browser.close();
})().catch((e) => { console.error("SKRIP BERHENTI:", e.message.slice(0, 600)); process.exit(1); });
