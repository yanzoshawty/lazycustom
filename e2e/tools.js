// Uji browser: tools ala Canva (Elements, Text, Uploads, Animate), animasi per elemen, efek, label,
// layout grid dan bebas (termasuk geser di preview), bubble per peran, dan editor gambar dengan canvas sungguhan.
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
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
  const tabpanel = p.locator('[role="tabpanel"]');
  const code = () => p.locator("pre code").first().textContent();
  const tab = (n) => p.getByRole("tab", { name: n, exact: true }).click();
  const send = (k) => p.getByRole("button", { name: k, exact: true }).click();
  const pause = async () => { const b = p.getByRole("button", { name: "Pause", exact: true }); if (await b.isVisible()) await b.click(); };
  const clear = () => p.getByRole("button", { name: "Kosongkan chat" }).click();
  const M = "yt-live-chat-text-message-renderer";
  const pseudo = (sel, pe, prop) => fr.evaluate(([s, q, pr]) => { const el = [...document.querySelectorAll(s)].pop(); return el ? getComputedStyle(el, q)[pr] : "TIDAK ADA"; }, [sel, pe, prop]);
  const rectOf = (sel) => fr.evaluate((s) => { const e = [...document.querySelectorAll(s)].pop(); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
  await pause();

  // ---------- 1. Bar tools ----------
  const names = await p.getByRole("tab").allTextContents();
  ok("tujuh tab tools terlihat di desktop, Properties punya kolom sendiri", names.join("|") === "Templates|Elements|Text|Uploads|Animate|Layers|Designs", names.join("|"));
  ok("tab Properties ada di DOM tapi tersembunyi di desktop", (await p.locator('[role="tab"]#tab-properties').count()) === 1 && !(await p.locator('[role="tab"]#tab-properties').isVisible()));
  for (const [t, heading] of [["Elements", /Shape/], ["Text", /Labels/], ["Uploads", /Upload/], ["Animate", /Animate all/]]) {
    await tab(t);
    ok(`tab ${t} menampilkan isinya`, (await tabpanel.getByText(heading).count()) >= 1);
  }

  // ---------- 2. Animasi per elemen ----------
  await tab("Animate");
  await tabpanel.getByRole("button", { name: "Rise", exact: true }).click();
  ok("Animate all Rise masuk ke CSS untuk elemen", /lc-el-rise/.test(await code()) && /#author-name \{[^}]*animation: lc-el-rise/.test(await code()));
  await clear(); await send("Message"); await p.waitForTimeout(80);
  const names1 = await fr.evaluate(() => getComputedStyle([...document.querySelectorAll("yt-live-chat-text-message-renderer #author-name")].pop()).animationName);
  const msgDelay = await fr.evaluate(() => getComputedStyle([...document.querySelectorAll("yt-live-chat-text-message-renderer #message")].pop()).animationDelay);
  ok("animasi nama dan pesan benar-benar berjalan di preview", names1.includes("lc-el-rise"), names1);
  ok("jeda bertahap: pesan tertunda lebih lama dari nama", parseFloat(msgDelay) > 0, msgDelay);
  const opac = await fr.evaluate(async () => { const el = [...document.querySelectorAll("yt-live-chat-text-message-renderer #message")].pop(); const out = []; for (let i = 0; i < 6; i++) { out.push(Number(getComputedStyle(el).opacity)); await new Promise((r) => setTimeout(r, 90)); } return out; });
  ok("opacity pesan naik selama animasi (terlihat bergerak)", opac[opac.length - 1] > opac[0], opac.join(","));

  // ---------- 3. Efek ----------
  await tabpanel.getByRole("button", { name: "Float", exact: true }).click();
  await tabpanel.getByRole("button", { name: "Glitch", exact: true }).click();
  ok("efek Float dan Glitch masuk ke CSS", /lc-fx-float-0/.test(await code()) && /lc-fx-glitch-1/.test(await code()));
  await clear(); await send("Message"); await p.waitForTimeout(400);
  const tf = await fr.evaluate(async () => { const el = [...document.querySelectorAll("yt-live-chat-text-message-renderer #content")].pop(); const s = new Set(); for (let i = 0; i < 12; i++) { s.add(getComputedStyle(el).transform); await new Promise((r) => setTimeout(r, 110)); } return s.size; });
  ok("efek Float menggerakkan bubble (transform berubah seiring waktu)", tf > 1, tf);
  const combined = await fr.evaluate(() => getComputedStyle([...document.querySelectorAll("yt-live-chat-text-message-renderer #author-name")].pop()).animationName);
  ok("animasi masuk dan efek pada nama digabung, tidak saling menimpa", /lc-el-rise/.test(combined) && /lc-fx-glitch-1/.test(combined), combined);
  await tabpanel.getByRole("button", { name: "Hapus efek Float #1" }).click();
  ok("menghapus efek menghilangkannya dari CSS", !/lc-fx-float/.test(await code()));

  // ---------- 4. Label dan teks sendiri ----------
  await tab("Text");
  await tabpanel.getByRole("button", { name: "LIVE", exact: true }).click();
  await clear(); await send("Message"); await p.waitForTimeout(150);
  ok("label LIVE tampil sebagai pseudo-element di preview", (await pseudo(`${M} yt-live-chat-author-chip`, "::before", "content")) === '"LIVE"');
  ok("label memakai warna latar yang diatur", (await pseudo(`${M} yt-live-chat-author-chip`, "::before", "backgroundColor")) === "rgb(225, 29, 72)");
  await tabpanel.getByRole("radio", { name: "Member", exact: true }).check({ force: true });
  await clear(); await send("Message"); await send("Member"); await p.waitForTimeout(150);
  const viewerLbl = await fr.evaluate((m) => getComputedStyle(document.querySelector(m + ":not([author-type]) yt-live-chat-author-chip"), "::before").content, M);
  const memberLbl = await fr.evaluate((m) => getComputedStyle(document.querySelector(m + '[author-type="member"] yt-live-chat-author-chip'), "::before").content, M);
  ok("label khusus Member tidak muncul di Viewer", viewerLbl === "none" && memberLbl === '"LIVE"', `${viewerLbl} / ${memberLbl}`);
  // teks jahat tidak bisa merusak CSS
  await tabpanel.getByLabel("Teks label").fill('"}body{display:none}/*');
  await p.waitForTimeout(250);
  const evilCss = await code();
  // Ambil isi content khusus label (bukan content: "" milik ring gradient border).
  const labelContent = (evilCss.match(/author-chip::before \{[^}]*?content: ([^;]+?) !important/) || [])[1] || "";
  ok("teks label berisi tanda kutip dan kurung dikirim sebagai escape heksadesimal", /^"(?:[A-Za-z0-9]|\\[0-9a-f]+ )+"$/.test(labelContent) && labelContent.startsWith('"\\22 \\7d body'), labelContent);
  ok("isi label tidak memuat kurung kurawal atau tanda kutip mentah", !/[{}]/.test(labelContent) && (labelContent.match(/"/g) || []).length === 2, labelContent);
  const bodyDisplay = await fr.evaluate(() => getComputedStyle(document.body).display);
  ok("body preview tidak ikut tersembunyi oleh teks jahat", bodyDisplay !== "none", bodyDisplay);
  await tabpanel.getByLabel("Teks label").fill("LIVE");
  await tabpanel.getByLabel("Name prefix").fill("\u2605 ");
  await p.waitForTimeout(200);
  ok("awalan nama tampil di preview", (await pseudo(`${M} #author-name`, "::before", "content")).includes("\u2605"));

  // ---------- 5. Elements: dekorasi dan bentuk ----------
  await tab("Elements");
  await tabpanel.getByRole("button", { name: /Halftone/ }).click();
  ok("Halftone ditambahkan ke bubble dan masuk CSS", /radial-gradient\(circle/.test(await code()));
  await tabpanel.getByRole("radio", { name: "Chamfer", exact: true }).check({ force: true });
  await clear(); await send("Message"); await p.waitForTimeout(150);
  ok("bentuk Chamfer memakai clip-path di preview", (await pseudo(`${M} #content`, null, "clipPath")).startsWith("polygon"));
  await tabpanel.getByRole("radio", { name: "Super Chat", exact: true }).check({ force: true });
  await tabpanel.getByRole("button", { name: /Stripes/ }).click();
  ok("target Super Chat menambah stripes ke kartu, bukan bubble", /Super Chat \*\/[\s\S]*repeating-linear-gradient\(45deg/.test(await code()));

  // ---------- 6. Layout grid dan bebas ----------
  await tab("Layers");
  await p.locator('aside[aria-label^="Templates"]').getByRole("button", { name: /^Message row/ }).click();
  await props.getByRole("radio", { name: "Grid", exact: true }).check({ force: true });
  await props.getByRole("button", { name: "Nama di atas pesan" }).click();
  await clear(); await send("Message"); await p.waitForTimeout(200);
  const nm = await rectOf(`${M} #author-name`), ms = await rectOf(`${M} #message`);
  ok("grid 'Nama di atas pesan': pesan berada di bawah nama", ms.y >= nm.y + nm.h - 2 && Math.abs(ms.x - nm.x) < 12, JSON.stringify({ nm, ms }));
  await props.getByRole("radio", { name: "Free", exact: true }).check({ force: true });
  await p.waitForTimeout(150);
  const free0 = await fr.evaluate((m) => { const e = document.querySelector(m); const c = e.querySelector("#content").getBoundingClientRect(); const n = e.querySelector("#author-name").getBoundingClientRect(); return { cw: Math.round(c.width), ch: Math.round(c.height), nx: Math.round(n.left - c.left), ny: Math.round(n.top - c.top) }; }, M);
  ok("layout Free: ukuran bubble terkunci dan nama di koordinat awal", free0.cw === 340 && free0.ch === 72 && free0.nx === 10 && free0.ny === 8, JSON.stringify(free0));
  // geser lewat slider (keyboard-accessible)
  const nameRow = props.getByText("Name", { exact: true }).locator("xpath=ancestor::details[1]");
  await nameRow.locator("summary").click();
  await nameRow.getByLabel("X").fill("60");
  await p.waitForTimeout(200);
  const free1 = await fr.evaluate((m) => { const e = document.querySelector(m); return Math.round(e.querySelector("#author-name").getBoundingClientRect().left - e.querySelector("#content").getBoundingClientRect().left); }, M);
  ok("slider X memindahkan nama ke koordinat baru", free1 === 60, free1);
  // geser langsung di preview dengan mouse
  await props.getByRole("switch", { name: /Drag di preview/ }).check({ force: true });
  await p.waitForTimeout(200);
  const before = await rectOf(`${M} #author-name`);
  const frBox = await (await p.locator('iframe[title^="Preview chat"]').elementHandle()).boundingBox();
  const sx = frBox.x + before.x + before.w / 2, sy = frBox.y + before.y + before.h / 2;
  await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx + 15, sy + 5, { steps: 4 }); await p.mouse.move(sx + 40, sy + 12, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(400);
  const after = await rectOf(`${M} #author-name`);
  ok("seret nama dengan mouse di preview memindahkannya sekitar 40px ke kanan", after.x - before.x >= 34 && after.x - before.x <= 46, `${before.x} -> ${after.x}`);
  ok("nilai X di Properties ikut berubah (sekitar 100)", Number(await nameRow.getByLabel("X").inputValue()) >= 94, await nameRow.getByLabel("X").inputValue());
  // geser dengan sentuhan (CDP)
  const cdp = await ctx.newCDPSession(p);
  const b2 = await rectOf(`${M} #author-name`);
  // Tepi kiri nama: setelah seretan mouse, nama sudah menumpuk di atas lencana, jadi titik tengahnya bisa mengenai lencana.
  const tx = frBox.x + b2.x + 6, ty = frBox.y + b2.y + 3; // bagian atas nama, di atas kotak pesan yang menimpanya di bawah
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tx, y: ty, id: 0 }] });
  await p.waitForTimeout(60);
  for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: tx - i * 4, y: ty, id: 0 }] }); await p.waitForTimeout(24); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(400);
  const a2 = await rectOf(`${M} #author-name`);
  ok("seret nama dengan sentuhan memindahkannya ke kiri sekitar 32px", b2.x - a2.x >= 26 && b2.x - a2.x <= 38, `${b2.x} -> ${a2.x}`);
  await p.evaluate(() => window.scrollTo(0, 0));
  await props.getByRole("switch", { name: /Drag di preview/ }).uncheck({ force: true });
  await props.getByRole("radio", { name: "Inline", exact: true }).check({ force: true });

  // ---------- 7. Bubble berbeda per peran ----------
  await p.locator('aside[aria-label^="Templates"]').getByRole("button", { name: /^Bubble/ }).click();
  await props.getByRole("radio", { name: "Member", exact: true }).check({ force: true });
  await props.getByRole("switch", { name: /Custom bubble untuk Member/ }).check({ force: true });
  await props.getByRole("radio", { name: "Solid", exact: true }).first().check({ force: true });
  await props.getByLabel("Warna", { exact: true }).first().fill("#FF0000");
  await clear(); await send("Message"); await send("Member"); await p.waitForTimeout(250);
  const bgs = await fr.evaluate((m) => ({ v: getComputedStyle(document.querySelector(m + ":not([author-type]) #content")).backgroundImage, m: getComputedStyle(document.querySelector(m + '[author-type="member"] #content')).backgroundImage }), M);
  ok("bubble Member merah, bubble Viewer tetap dari template", bgs.m.includes("rgba(255, 0, 0") && !bgs.v.includes("rgba(255, 0, 0"), JSON.stringify(bgs).slice(0, 160));

  // ---------- 8. Uploads dan editor gambar (canvas sungguhan) ----------
  await tab("Uploads");
  await tabpanel.locator('input[type="file"]').setInputFiles(FX("logo.png"));
  await p.waitForTimeout(600);
  ok("upload menambah gambar ke daftar dengan jenis dan ukuran", (await tabpanel.getByText(/^PNG, \d+ KB/).count()) === 1);
  await tabpanel.locator('input[type="file"]').setInputFiles(FX("anim.gif"));
  await p.waitForTimeout(500);
  ok("Adjust nonaktif untuk GIF", await tabpanel.getByRole("button", { name: "Adjust gambar GIF" }).isDisabled());
  await tabpanel.getByRole("button", { name: "Adjust gambar PNG" }).click();
  const dlg = p.getByRole("dialog", { name: "Adjust image" });
  await dlg.waitFor();
  await dlg.locator("canvas").waitFor(); // canvas baru ada setelah gambar selesai dimuat
  ok("editor gambar terbuka dengan pratinjau canvas", (await dlg.locator("canvas").count()) === 1 && (await dlg.locator("canvas").evaluate((c) => c.width > 0)));
  const srcBefore = await p.evaluate(() => [...document.querySelectorAll('[role="tabpanel"] img')].map((i) => i.src)[0]);
  await dlg.getByRole("button", { name: "Putar 90 derajat ke kanan" }).click();
  await dlg.getByRole("button", { name: "Balik horizontal" }).click();
  await dlg.getByRole("radio", { name: "1:1", exact: true }).check({ force: true });
  await dlg.getByLabel("Grayscale").fill("100");
  await dlg.getByLabel("Max size").fill("96");
  await p.waitForTimeout(250);
  const prev = await dlg.locator("canvas").evaluate((c) => ({ w: c.width, h: c.height }));
  ok("pratinjau berbentuk persegi setelah crop 1:1", prev.w === prev.h && prev.w > 0, JSON.stringify(prev));
  await dlg.getByRole("button", { name: "Apply", exact: true }).click();
  await p.waitForTimeout(800);
  ok("dialog tertutup setelah Apply", (await p.getByRole("dialog").count()) === 0);
  const srcAfter = await p.evaluate(() => [...document.querySelectorAll('[role="tabpanel"] img')].map((i) => i.src));
  const edited = srcAfter.find((s) => s !== srcBefore && /^data:image\/(png|webp)/.test(s));
  ok("gambar diganti menjadi data URI baru yang valid", !!edited, srcAfter.map((s) => s.slice(0, 30)).join(" | "));
  if (edited) {
    const info = await p.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return { w: i.naturalWidth, h: i.naturalHeight, chars: src.length }; }, edited);
    ok("hasil sunting persegi, tidak lebih dari 96px, dan di bawah batas ukuran", info.w === info.h && info.w <= 96 && info.chars <= 140000, JSON.stringify(info));
    const grey = await p.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = document.createElement("canvas"); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext("2d"); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let colored = 0, n = 0; for (let k = 0; k < d.length; k += 4) { if (d[k + 3] > 200) { n++; if (Math.abs(d[k] - d[k + 1]) > 6 || Math.abs(d[k + 1] - d[k + 2]) > 6) colored++; } } return { n, colored }; }, edited);
    ok("filter grayscale 100% benar-benar membuat piksel abu-abu", grey.n > 0 && grey.colored / grey.n < 0.02, JSON.stringify(grey));
  }
  // dialog: Escape, dan fokus kembali
  await tabpanel.getByRole("button", { name: /Adjust gambar (PNG|WEBP)/ }).click();
  await p.getByRole("dialog").waitFor();
  await p.keyboard.press("Escape");
  ok("Escape menutup editor gambar", (await p.getByRole("dialog").count()) === 0);

  // ---------- 9. Template baru ----------
  await tab("Templates");
  const cards = await p.locator('button[aria-label^="Pakai template"]').count();
  ok("galeri memuat 16 template", cards === 16, cards);
  for (const [t, check] of [["Phantom", /clip-path: polygon\(16px 0/], ["Quest", /display: grid/], ["Cyber", /lc-fx-shimmer-0/], ["Arena", /author-type="moderator"\] #content/], ["Brutal", /lc-fx-shake-0/]]) {
    await p.getByRole("button", { name: `Pakai template ${t}` }).click();
    await p.waitForTimeout(250);
    ok(`template ${t} memakai fitur khasnya di CSS`, check.test(await code()));
  }
  await p.getByRole("button", { name: "Pakai template Cyber" }).click();
  await clear(); await send("Message"); await p.waitForTimeout(500);
  const shim = await pseudo(`${M} #content`, "::before", "backgroundSize");
  ok("Cyber: gradient border berkilau (background-size 260%)", /260%/.test(shim), shim);

  ok("tidak ada pelanggaran CSP selama semua alur di atas", csp.length === 0, csp.join(" | "));
  ok("tidak ada page error", pageErrors.length === 0, pageErrors.join(" | "));

  // ---------- 10. Mobile ----------
  const m = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.addInitScript(() => { try { localStorage.setItem("lc-theme", "dark"); } catch {} });
  const mp = await m.newPage(); mp.setDefaultTimeout(8000);
  await mp.goto(BASE, { waitUntil: "load" }); await mp.waitForTimeout(700);
  const tabH = await mp.getByRole("tab").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  ok("mobile: kedelapan tab terlihat dan cukup besar untuk disentuh", tabH.length === 8 && tabH.every((h) => h >= 44), tabH.join(","));
  for (const t of ["Elements", "Text", "Uploads", "Animate"]) {
    await mp.getByRole("tab", { name: t, exact: true }).click();
    await mp.waitForTimeout(150);
    const o = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    ok(`mobile: tab ${t} tidak menyebabkan overflow horizontal`, o.sw <= o.vw, JSON.stringify(o));
  }
  await mp.getByRole("tab", { name: "Uploads", exact: true }).click();
  await mp.locator('[role="tabpanel"] input[type="file"]').setInputFiles(FX("logo.png"));
  await mp.waitForTimeout(500);
  await mp.getByRole("button", { name: "Adjust gambar PNG" }).click();
  const d2 = mp.getByRole("dialog", { name: "Adjust image" });
  await d2.waitFor();
  const box = await d2.boundingBox();
  ok("mobile: editor gambar muat di layar dan tombol Apply terlihat", box.x >= 0 && box.x + box.width <= 376 && box.y + box.height <= 813 && (await d2.getByRole("button", { name: "Apply", exact: true }).isVisible()), JSON.stringify(box));
  const ov = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
  ok("mobile: tidak ada overflow horizontal saat editor gambar terbuka", ov.sw <= ov.vw, JSON.stringify(ov));
  await d2.getByRole("button", { name: "Tutup editor gambar" }).click();
  await m.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} lulus`);
  await browser.close();
})().catch((e) => { console.error("SKRIP BERHENTI:", e.message.slice(0, 700)); process.exit(1); });
