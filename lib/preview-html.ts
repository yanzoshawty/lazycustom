/**
 * Dokumen HTML untuk iframe preview.
 *
 * Preview memakai tag kustom yang sama dengan chat YouTube, sehingga CSS keluaran
 * diterapkan apa adanya. CSS dasar di bawah hanya PERKIRAAN gaya bawaan YouTube
 * supaya elemen yang disembunyikan atau diganti terlihat perbedaannya. Tampilan asli
 * di OBS bisa sedikit berbeda, jadi tetap cek sekali di sana.
 */

export type MockRole = "viewer" | "member" | "moderator" | "owner";

interface MockMessage {
  role: MockRole;
  name: string;
  text: string;
  color: string;
}

export const MOCK_MESSAGES: MockMessage[] = [
  { role: "viewer", name: "Bagas Prasetyo", text: "Halo dari Makassar, baru gabung nih!", color: "#4C7DDB" },
  { role: "member", name: "Ayu Lestari", text: "Kameranya jernih banget hari ini", color: "#2E9E6B" },
  {
    role: "moderator",
    name: "Fajar Ramadhan",
    text: "Pengingat: jangan spoiler ending ya, teman-teman.",
    color: "#8A5CC7",
  },
  {
    role: "viewer",
    name: "Nadia Kusuma",
    text: "Comeback-nya gila \u{1F602} aku sampai teriak sendiri di kamar",
    color: "#D9822B",
  },
  {
    role: "owner",
    name: "Kopi Pagi",
    text: "Makasih semuanya yang sudah mampir, lanjut ronde berikutnya!",
    color: "#C24D6B",
  },
  { role: "viewer", name: "Wayan Adi", text: "Boleh request lagu buat sesi santai nanti?", color: "#3E9CA8" },
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Avatar: lingkaran warna dengan inisial, dibuat sebagai data URI supaya tidak butuh jaringan. */
function avatarDataUri(name: string, color: string): string {
  const initial = esc(name.trim().charAt(0).toUpperCase());
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" fill="${color}"/>` +
    `<text x="32" y="42" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text>` +
    `</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function badgeSvg(role: MockRole): string {
  if (role === "moderator") {
    return `<yt-live-chat-author-badge-renderer type="moderator"><svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#5E84F1"/></svg></yt-live-chat-author-badge-renderer>`;
  }
  if (role === "member") {
    return `<yt-live-chat-author-badge-renderer type="member"><svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#0F9D58"/></svg></yt-live-chat-author-badge-renderer>`;
  }
  return "";
}

function messageHtml(m: MockMessage, index: number): string {
  const typeAttr = m.role === "viewer" ? "" : ` author-type="${m.role}"`;
  const nameClass = m.role === "viewer" ? "" : ` class="${m.role}"`;
  const nameType = m.role === "viewer" ? "" : ` type="${m.role}"`;
  const time = `${8 + Math.floor(index / 3)}:${String(12 + index * 4).padStart(2, "0")}`;
  return (
    `<yt-live-chat-text-message-renderer${typeAttr} data-i="${index}">` +
    `<yt-img-shadow id="author-photo"><img id="img" alt="" src="${avatarDataUri(m.name, m.color)}"></yt-img-shadow>` +
    `<div id="content">` +
    `<span id="timestamp">${time}</span>` +
    `<yt-live-chat-author-chip><span id="author-name"${nameClass}${nameType}>${esc(m.name)}</span>` +
    `<span id="chat-badges">${badgeSvg(m.role)}</span></yt-live-chat-author-chip>` +
    `<span id="message">${esc(m.text)}</span>` +
    `</div>` +
    `<div id="menu"></div>` +
    `</yt-live-chat-text-message-renderer>`
  );
}

const BASE_CSS = `
html,body{margin:0;height:100%;overflow:hidden}
body{font-family:Roboto,"Segoe UI",Arial,sans-serif;background:transparent}
yt-live-chat-app,yt-live-chat-renderer{display:block;height:100%}
yt-live-chat-renderer{display:flex;flex-direction:column;background:#f9f9f9;color:#0f0f0f}
yt-live-chat-header-renderer{display:flex;align-items:center;flex:none;height:44px;padding:0 16px;border-bottom:1px solid rgba(0,0,0,.12);font-size:14px;font-weight:500}
yt-live-chat-ticker-renderer{display:flex;flex:none;gap:6px;padding:8px 12px;font-size:12px}
yt-live-chat-ticker-renderer span{padding:4px 10px;border-radius:999px;background:#1e88e5;color:#fff}
yt-live-chat-item-list-renderer{display:flex;flex:1;min-height:0;flex-direction:column;justify-content:flex-end;overflow:hidden}
#items{display:flex;flex-direction:column;padding:4px 0 8px}
yt-live-chat-text-message-renderer{display:block;padding:4px 24px;font-size:13px;line-height:16px;color:#0f0f0f}
yt-live-chat-text-message-renderer #author-photo{float:left;width:24px;height:24px;margin-right:16px;border-radius:50%;overflow:hidden}
yt-live-chat-text-message-renderer #author-photo img{display:block;width:100%;height:100%}
yt-live-chat-text-message-renderer #content{display:block}
yt-live-chat-text-message-renderer #timestamp{display:inline;margin-right:8px;color:rgba(0,0,0,.5)}
yt-live-chat-author-chip{display:inline-flex;align-items:center}
yt-live-chat-text-message-renderer #author-name{font-weight:500;color:rgba(0,0,0,.6)}
yt-live-chat-text-message-renderer #author-name.owner{padding:1px 4px;border-radius:2px;background:#ffd600;color:#0f0f0f}
yt-live-chat-text-message-renderer #author-name.moderator{color:#5e84f1}
yt-live-chat-text-message-renderer #author-name.member{color:#0f9d58}
#chat-badges{display:inline-flex}
yt-live-chat-author-badge-renderer{display:inline-block;width:16px;height:16px;margin-left:4px}
yt-live-chat-text-message-renderer #message{margin-left:8px;color:#0f0f0f}
yt-live-chat-message-input-renderer{display:block;flex:none;padding:10px 16px;border-top:1px solid rgba(0,0,0,.12);font-size:13px;color:rgba(0,0,0,.6)}
`;

/**
 * Dimuat setelah CSS keluaran supaya menang urutan. Ini hanya untuk preview: menghormati
 * pengaturan gerak minimal milik user yang sedang melihat editor.
 */
const MOTION_CSS = "@media (prefers-reduced-motion: reduce){yt-live-chat-text-message-renderer{animation:none!important}}";

/**
 * Skrip kecil di dalam iframe: menerima pembaruan CSS dan perintah putar ulang dari halaman induk.
 * Iframe bisa selesai dimuat sebelum halaman induk siap mendengar, jadi selain mengirim
 * lc-ready saat dimuat, ia juga membalas ping dengan lc-ready.
 */
const BRIDGE_JS = `
(function(){
  var style=document.getElementById('lc-style');
  var STEP=140;
  function rows(){return document.querySelectorAll('yt-live-chat-text-message-renderer');}
  function stagger(){var r=rows();for(var i=0;i<r.length;i++){r[i].style.animationDelay=(i*STEP)+'ms';}}
  function replay(){
    var r=rows();
    for(var i=0;i<r.length;i++){r[i].style.animation='none';}
    void document.body.offsetWidth;
    for(var j=0;j<r.length;j++){r[j].style.animation='';r[j].style.animationDelay=(j*STEP)+'ms';}
  }
  stagger();
  window.addEventListener('message',function(e){
    if(e.source!==window.parent)return;
    var d=e.data;
    if(!d||typeof d!=='object')return;
    if(d.type==='css'&&typeof d.css==='string'){style.textContent=d.css;}
    else if(d.type==='replay'){replay();}
    else if(d.type==='ping'){window.parent.postMessage({type:'lc-ready'},'*');}
  });
  window.parent.postMessage({type:'lc-ready'},'*');
})();
`;

export function buildPreviewHtml(css: string): string {
  const safeCss = css.replace(/<\/style/gi, "<\\/style");
  const items = MOCK_MESSAGES.map(messageHtml).join("");
  return (
    `<!doctype html><html lang="id"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style id="lc-base">${BASE_CSS}</style>` +
    `<style id="lc-style">${safeCss}</style>` +
    `<style id="lc-motion">${MOTION_CSS}</style>` +
    `</head><body>` +
    `<yt-live-chat-app><yt-live-chat-renderer>` +
    `<yt-live-chat-header-renderer>Chat langsung</yt-live-chat-header-renderer>` +
    `<yt-live-chat-ticker-renderer><span>Rp20.000</span></yt-live-chat-ticker-renderer>` +
    `<yt-live-chat-item-list-renderer><div id="items">${items}</div></yt-live-chat-item-list-renderer>` +
    `<yt-live-chat-message-input-renderer>Chat sebagai Kopi Pagi</yt-live-chat-message-input-renderer>` +
    `</yt-live-chat-renderer></yt-live-chat-app>` +
    `<script>${BRIDGE_JS}</script></body></html>`
  );
}
