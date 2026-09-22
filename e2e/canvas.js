// Uji browser: atur gambar langsung di canvas (drag, resize, keyboard) dan mode fokus per bubble.
const { chromium } = require("playwright-core");
const path = require("path");
const BASE = process.env.BASE_URL || "http://localhost:3100/";
const FX = (n) => path.join(__dirname, "fixtures", n);
const results = [];
function ok(name, cond, detail = "") {
  results.push({ name, pass: !!cond });
  console.log((cond ? "  ok  " : "  GAGAL ") + name + (cond ? "" : " | " + String(detail).slice(0, 260)));
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("lc-theme", "dark"); } catch {} });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  const pageErrors = [];
  p.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));

  const props = p.locator('aside[aria-label="Properties"]');
  const frameOf = async () => (await p.locator('iframe[title^="Preview chat"]').elementHandle()).contentFrame();
  const layerBtn = (re) => p.locator('aside[aria-label^="Templates"]').getByRole("button", { name: re });
  const code = () => p.locator("pre code").first().textContent();

  /** Rect layar dari #lc-gz (gizmo) dan tombol resize-nya, gabungan offset iframe + posisi fixed di dalamnya. */
  async function gizmoRects() {
    const ifb = await p.locator('iframe[title^="Preview chat"]').boundingBox();
    const fr = await frameOf();
    const r = await fr.evaluate(() => {
      const g = document.getElementById("lc-gz");
      if (!g) return null;
      const gb = g.getBoundingClientRect();
      const i = g.querySelector("i").getBoundingClientRect();
      return { g: { x: gb.x, y: gb.y, w: gb.width, h: gb.height }, i: { x: i.x + i.width / 2, y: i.y + i.height / 2 } };
    });
    if (!r) return null;
    return {
      center: { x: ifb.x + r.g.x + r.g.w / 2, y: ifb.y + r.g.y + r.g.h / 2 },
      handle: { x: ifb.x + r.i.x, y: ifb.y + r.i.y },
      w: r.g.w,
      h: r.g.h,
    };
  }
  const waitGizmo = async () => {
    const fr = await frameOf();
    try {
      await fr.locator("#lc-gz").waitFor({ state: "attached", timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  };
  const noGizmo = async () => {
    const fr = await frameOf();
    try {
      await fr.locator("#lc-gz").waitFor({ state: "hidden", timeout: 4000 });
      return true;
    } catch {
      return (await fr.locator("#lc-gz").count()) === 0;
    }
  };
  const roleAttrs = async () => {
    const fr = await frameOf();
    // getComputedStyle karena mode fokus menyembunyikan pesan lain lewat CSS (display:none), tidak menghapusnya dari DOM.
    return fr.evaluate(() =>
      [...document.querySelectorAll("yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer, yt-live-chat-membership-item-renderer, yt-live-chat-paid-sticker-renderer")]
        .filter((e) => getComputedStyle(e).display !== "none")
        .map((e) => (e.tagName === "YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER" ? e.getAttribute("author-type") || "viewer" : e.tagName.toLowerCase())),
    );
  };

  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(600);

  // ---------- 1. Image pin: atur di canvas (drag, resize, keyboard, selesai) ----------
  await p.getByRole("tab", { name: "Layers" }).click();
  await layerBtn(/^Bubble/).click();
  await props.getByRole("button", { name: "Image pin", exact: true }).click();
  await props.locator('input[type="file"]').first().setInputFiles(FX("pin.png"));
  await p.waitForTimeout(500);
  // Anchor Kiri atas dulu, supaya ada ruang tumbuh ke kanan/bawah untuk resize dan drag di bawah.
  // (Default-nya Kanan atas, dekat tepi bubble, sehingga resize/drag ke kanan langsung mentok.)
  await props.getByRole("radio", { name: "Kiri atas" }).check({ force: true });
  await p.waitForTimeout(200);

  const offX = () => props.getByLabel("Offset X").inputValue();
  const offY = () => props.getByLabel("Offset Y").inputValue();
  const widthOf = () => props.getByLabel("Lebar").inputValue();

  await props.getByRole("button", { name: "Atur di canvas" }).click();
  ok("gizmo muncul di preview setelah klik Atur di canvas", !!(await waitGizmo()));
  ok("tombol berubah jadi Selesai mengatur", await props.getByRole("button", { name: "Selesai mengatur" }).isVisible());

  let rect = await gizmoRects();
  ok("gizmo terukur (punya lebar dan tinggi)", !!rect && rect.w > 0 && rect.h > 0, JSON.stringify(rect));

  // Keyboard dulu (geseran kecil, aman dari tepi): fokus gizmo, panah kanan beberapa kali.
  const fr1 = await frameOf();
  await fr1.locator("#lc-gz").focus();
  const beforeKey = Number(await offX());
  for (let i = 0; i < 5; i++) await fr1.locator("#lc-gz").press("ArrowRight");
  await p.waitForTimeout(250);
  const afterKey = Number(await offX());
  ok("panah kanan menggeser Offset X", afterKey > beforeKey, JSON.stringify({ beforeKey, afterKey }));

  // Resize: tarik titik sudut untuk menambah lebar. Masih dekat kiri atas, jadi ruang tumbuh cukup.
  rect = await gizmoRects();
  const widthBefore = Number(await widthOf());
  await p.mouse.move(rect.handle.x, rect.handle.y);
  await p.mouse.down();
  await p.mouse.move(rect.handle.x + 30, rect.handle.y + 30, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  const widthAfter = Number(await widthOf());
  ok("resize menambah Lebar", widthAfter > widthBefore, JSON.stringify({ widthBefore, widthAfter }));

  // Drag: geser gizmo ~30px ke kanan-bawah. Dilakukan terakhir karena boleh mendekati tepi.
  rect = await gizmoRects();
  const beforeDrag = { x: await offX(), y: await offY() };
  await p.mouse.move(rect.center.x, rect.center.y);
  await p.mouse.down();
  await p.mouse.move(rect.center.x + 30, rect.center.y + 20, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  const afterDrag = { x: await offX(), y: await offY() };
  ok("drag mengubah Offset X/Y di Properties", afterDrag.x !== beforeDrag.x || afterDrag.y !== beforeDrag.y, JSON.stringify({ beforeDrag, afterDrag }));

  // Batas: nilai tidak pernah melebihi rentang skema (pin: width 8..400, offset -100..800).
  ok("Offset X tidak melebihi batas skema", afterKey <= 800 && afterKey >= -100, afterKey);
  ok("Lebar tidak melebihi batas skema", widthAfter <= 400, widthAfter);

  // Escape menutup mode atur, gizmo hilang.
  await fr1.locator("#lc-gz").press("Escape");
  await p.waitForTimeout(250);
  ok("Escape menutup mode atur di canvas", !!(await noGizmo()));
  ok("tombol kembali ke Atur di canvas", await props.getByRole("button", { name: "Atur di canvas" }).isVisible());

  // CSS akhirnya benar-benar membawa offset dan lebar yang baru (bukan cuma tampilan Properties).
  const css1 = await code();
  ok("CSS memuat lebar image pin yang baru", new RegExp(`${widthAfter}px`).test(css1) || /vw/.test(css1), widthAfter);

  // ---------- 2. Tombol Selesai di banner mengakhiri mode atur ----------
  await props.getByRole("button", { name: "Atur di canvas" }).click();
  ok("gizmo muncul lagi", !!(await waitGizmo()));
  await p.getByRole("button", { name: "Selesai", exact: true }).click();
  await p.waitForTimeout(250);
  ok("tombol Selesai di banner menutup mode atur", !!(await noGizmo()));

  // ---------- 3. Gambar panel: atur di canvas juga bekerja ----------
  await p.getByRole("tab", { name: "Properties" }).click().catch(() => {});
  await layerBtn(/^Panel/).click();
  await props.getByRole("button", { name: "Gambar di depan pesan" }).click();
  await props.locator('input[type="file"]').first().setInputFiles(FX("frame.png"));
  await p.waitForTimeout(500);
  await props.getByRole("button", { name: "Atur di canvas" }).click();
  ok("gizmo gambar panel muncul", !!(await waitGizmo()));
  const panelWidthBefore = Number(await props.getByLabel("Lebar").inputValue());
  const prect = await gizmoRects();
  await p.mouse.move(prect.handle.x, prect.handle.y);
  await p.mouse.down();
  await p.mouse.move(prect.handle.x + 40, prect.handle.y + 40, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  const panelWidthAfter = Number(await props.getByLabel("Lebar").inputValue());
  ok("resize gambar panel menambah Lebar", panelWidthAfter > panelWidthBefore, JSON.stringify({ panelWidthBefore, panelWidthAfter }));
  await props.getByRole("button", { name: "Selesai mengatur" }).click();
  await p.waitForTimeout(200);

  // ---------- 4. Mode Fokus: hanya satu jenis pesan yang tampil ----------
  await p.getByRole("tab", { name: "Layers" }).click();
  await layerBtn(/Message text$/).click();
  await p.getByRole("button", { name: "Owner", exact: true }).click().catch(() => {});
  await p.waitForTimeout(200);
  const focusBtn = p.getByRole("button", { name: /^Fokus/ });
  ok("tombol Fokus tersedia saat mengedit bagian pesan", await focusBtn.isVisible());
  await focusBtn.click();
  await p.waitForTimeout(400);
  const kindsAfterFocus = await roleAttrs();
  ok("mode fokus hanya menampilkan satu jenis pesan", new Set(kindsAfterFocus).size === 1, JSON.stringify(kindsAfterFocus));
  await focusBtn.click();
  await p.waitForTimeout(600);
  const kindsAfterUnfocus = await roleAttrs();
  ok("mematikan fokus mengembalikan variasi pesan", new Set(kindsAfterUnfocus).size > 1, JSON.stringify(kindsAfterUnfocus));

  // ---------- 5. Klik bubble Member di preview memilih tab peran Member ----------
  await p.getByRole("button", { name: "Kosongkan chat" }).click();
  await p.getByRole("button", { name: "Member", exact: true }).click();
  await p.waitForTimeout(300);
  const fr2 = await frameOf();
  const box = await fr2.locator('yt-live-chat-text-message-renderer[author-type="member"] #content').first().boundingBox();
  await p.mouse.click(box.x + 5, box.y + 5);
  await p.waitForTimeout(300);
  ok("klik bubble Member membuka Properties Bubble", (await props.locator("h2").first().textContent())?.trim() === "Bubble");
  ok("tab peran ikut berpindah ke Member", await props.getByRole("radio", { name: "Member", exact: true }).isChecked());

  // Memilih Bubble lewat Layers (tanpa info peran) kembali ke Default, tidak diam-diam memakai Member.
  await p.getByRole("tab", { name: "Layers" }).click();
  await layerBtn(/^Bubble/).click();
  await p.waitForTimeout(200);
  ok("memilih Bubble lewat Layers kembali ke tab Default", await props.getByRole("radio", { name: "Default", exact: true }).isChecked());

  ok("tidak ada page error sepanjang uji", pageErrors.length === 0, pageErrors.join(" | "));

  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`${results.length - fails.length}/${results.length} lulus`);
  if (fails.length) process.exit(1);
})().catch((e) => {
  console.log("SKRIP BERHENTI:", e.message || e);
  process.exit(1);
});
