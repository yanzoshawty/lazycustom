import { LAYERS } from "./layers";

/**
 * Dokumen HTML untuk iframe preview dan thumbnail template.
 *
 * Isinya memakai tag kustom yang sama dengan chat YouTube, sehingga CSS keluaran
 * diterapkan apa adanya. CSS dasar di bawah hanya PERKIRAAN gaya bawaan YouTube
 * supaya elemen yang disembunyikan atau diganti terlihat bedanya. Tampilan asli di
 * OBS bisa sedikit berbeda, jadi tetap cek sekali di sana.
 *
 * Mode "live": simulator chat yang terus berjalan, bisa diklik untuk memilih layer.
 * Mode "thumb": dua pesan statis tanpa animasi, dipakai untuk thumbnail template.
 */

export type PreviewMode = "live" | "thumb";

export const SEND_KINDS = ["viewer", "member", "moderator", "owner", "superchat", "membership", "sticker"] as const;
export type SendKind = (typeof SEND_KINDS)[number];

/** Kecepatan simulasi: jeda rata-rata antar pesan (milidetik). */
export const SPEEDS = { slow: 2400, normal: 1400, fast: 700 } as const;
export type SpeedId = keyof typeof SPEEDS;

const NAMES = [
  "Bagas Prasetyo",
  "Ayu Lestari",
  "Fajar Ramadhan",
  "Nadia Kusuma",
  "Wayan Adi",
  "Rizky Aulia",
  "Siti Rahma",
  "Dimas Pratama",
  "Putri Anjani",
  "Kevin Halim",
  "Maya Sari",
  "Arif Hidayat",
];

const TEXTS = [
  "Halo dari Makassar, baru gabung nih!",
  "Kameranya jernih banget hari ini",
  "Comeback-nya gila \u{1F602} aku sampai teriak sendiri",
  "Boleh request lagu buat sesi santai nanti?",
  "Tadi bagian boss terakhir seru banget, aku sampai lupa minum",
  "Salam dari Surabaya, semangat terus ya!",
  "Mic-nya sudah enak, suaranya nggak pecah lagi",
  "Overlay chat-nya bagus, bikin sendiri?",
  "GG! Timing dodge-nya pas banget \u{1F44F}",
  "Ada yang tahu ini game-nya rilis kapan?",
];

const MOD_TEXTS = [
  "Pengingat: jangan spoiler ending ya, teman-teman.",
  "Yang mau request lagu, tulis judulnya di chat ya.",
];

const OWNER_TEXTS = ["Makasih semuanya yang sudah mampir, lanjut ronde berikutnya!", "Sebentar lagi kita mulai sesi tanya jawab."];

const AVATAR_COLORS = ["#4C7DDB", "#2E9E6B", "#8A5CC7", "#D9822B", "#C24D6B", "#3E9CA8"];

/** Tier Super Chat: warna primary, secondary, dan warna teks. Tier terang berteks gelap seperti di YouTube. Hanya contoh. */
const TIERS = [
  ["rgba(30,136,229,1)", "rgba(21,101,192,1)", "#fff"],
  ["rgba(0,229,255,1)", "rgba(0,184,212,1)", "rgba(0,0,0,0.87)"],
  ["rgba(29,233,182,1)", "rgba(0,191,165,1)", "rgba(0,0,0,0.87)"],
  ["rgba(255,202,40,1)", "rgba(255,179,0,1)", "rgba(0,0,0,0.87)"],
  ["rgba(245,124,0,1)", "rgba(230,81,0,1)", "#fff"],
  ["rgba(233,30,99,1)", "rgba(194,24,91,1)", "#fff"],
];

const AMOUNTS = ["Rp20.000", "Rp50.000", "Rp100.000", "Rp250.000", "Rp500.000", "Rp1.000.000"];
const SC_TEXTS = ["Semangat terus streamnya!", "Buat beli kopi, jangan begadang ya", "Salam dari komunitas Surabaya", ""];

const BASE_CSS = `
html,body{margin:0;height:100%;overflow:hidden}
body{font-family:Roboto,"Segoe UI",Arial,sans-serif;background:transparent}
yt-live-chat-app,yt-live-chat-renderer{display:block;height:100%}
yt-live-chat-renderer{display:flex;flex-direction:column;background:#f9f9f9;color:#0f0f0f}
yt-live-chat-header-renderer{display:flex;align-items:center;flex:none;height:44px;padding:0 16px;border-bottom:1px solid rgba(0,0,0,.12);font-size:14px;font-weight:500}
yt-live-chat-ticker-renderer{display:flex;flex:none;gap:6px;padding:8px 12px;font-size:12px}
yt-live-chat-ticker-renderer span{padding:4px 10px;border-radius:999px;background:#1e88e5;color:#fff}
yt-live-chat-item-list-renderer{display:flex;flex:1;min-height:0;flex-direction:column;justify-content:flex-end;overflow:hidden}
#items{display:flex;flex:none;flex-direction:column;padding:4px 0 8px}
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
yt-live-chat-paid-message-renderer,yt-live-chat-membership-item-renderer,yt-live-chat-paid-sticker-renderer{display:block;padding:4px 24px;margin:0;font-size:13px;line-height:16px;color:#fff}
yt-live-chat-paid-message-renderer #card,yt-live-chat-paid-sticker-renderer #card{border-radius:4px;background:var(--yt-live-chat-paid-message-secondary-color,#1565c0);overflow:hidden}
yt-live-chat-paid-message-renderer #header{display:flex;align-items:center;padding:8px 16px;background:var(--yt-live-chat-paid-message-primary-color,#1e88e5)}
yt-live-chat-membership-item-renderer #card{border-radius:4px;background:#0f9d58;overflow:hidden}
yt-live-chat-membership-item-renderer #header{display:flex;align-items:center;padding:8px 16px}
yt-live-chat-paid-message-renderer #author-photo,yt-live-chat-membership-item-renderer #author-photo,yt-live-chat-paid-sticker-renderer #author-photo{flex:none;width:40px;height:40px;margin-right:16px;border-radius:50%;overflow:hidden}
yt-live-chat-paid-message-renderer #author-photo img,yt-live-chat-membership-item-renderer #author-photo img,yt-live-chat-paid-sticker-renderer #author-photo img{display:block;width:100%;height:100%}
#header-content{flex:1;min-width:0}
yt-live-chat-paid-message-renderer #author-name,yt-live-chat-membership-item-renderer #author-name,yt-live-chat-paid-sticker-renderer #author-name{font-weight:500;opacity:.9}
#purchase-amount{font-weight:500}
#header-subtext{font-size:12px;opacity:.85}
yt-live-chat-paid-message-renderer #content{padding:8px 16px}
yt-live-chat-paid-message-renderer #timestamp{display:none}
yt-live-chat-paid-sticker-renderer #card{display:flex;align-items:center;padding:8px 16px}
yt-live-chat-paid-sticker-renderer #author-info{flex:1;min-width:0}
#purchase-amount-chip{display:inline-block;margin-top:2px;padding:1px 8px;border-radius:999px;background:rgba(0,0,0,.25);font-size:12px}
yt-live-chat-paid-sticker-renderer #sticker{flex:none;width:80px;height:80px}
yt-live-chat-paid-sticker-renderer #sticker img{display:block;width:100%;height:100%}
yt-live-chat-message-input-renderer{display:block;flex:none;padding:10px 16px;border-top:1px solid rgba(0,0,0,.12);font-size:13px;color:rgba(0,0,0,.6)}
`;

const MOTION_CSS = "*{animation:none!important}";

/** Sorotan hover hanya untuk bagian kecil. Panel, row, dan bubble dipilih lewat klik. */
const HOVER_LAYERS = ["avatar", "name", "badges", "timestamp", "text", "superchat", "membership", "sticker"];

function hoverCss(): string {
  const sels = LAYERS.filter((l) => HOVER_LAYERS.includes(l.id)).flatMap((l) => l.targets.map((t) => `${t}:hover`));
  return `${sels.join(",")}{outline:1px dashed rgba(53,179,245,.85);outline-offset:2px;cursor:pointer}`;
}

const SCRIPT = `
(function(){
var C=__CFG__;
var items=document.getElementById('items');
var list=document.getElementById('list');
var styleEl=document.getElementById('lc-style');
var hlEl=document.getElementById('lc-hl');
var motionEl=document.getElementById('lc-motion');
var live=!C.thumb;
var playing=live;
var gap=1400;
var timer=null;
var cursors={};
var cycle=0;
var SEQ=['viewer','viewer','member','viewer','moderator','viewer','superchat','viewer','owner','viewer','membership','viewer','sticker','viewer','member','viewer'];

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pick(arr,key){cursors[key]=((cursors[key]===undefined?-1:cursors[key])+1)%arr.length;return arr[cursors[key]];}
function avatar(name){
  var color=C.colors[name.length%C.colors.length];
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="'+color+'"/><text x="32" y="42" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">'+esc(name.charAt(0).toUpperCase())+'</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function stickerSvg(){
  var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect x="6" y="6" width="84" height="84" rx="22" fill="#FFD54F"/><text x="48" y="60" font-family="Arial,sans-serif" font-size="36" font-weight="800" fill="#3E2723" text-anchor="middle">GG</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
var clock=8*60+12;
function time(){clock+=1;var h=Math.floor(clock/60)%24,m=clock%60;return h+':'+(m<10?'0':'')+m;}
function badge(role){
  if(role==='moderator')return '<yt-live-chat-author-badge-renderer type="moderator"><svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#5E84F1"/></svg></yt-live-chat-author-badge-renderer>';
  if(role==='member')return '<yt-live-chat-author-badge-renderer type="member"><svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7" fill="#0F9D58"/></svg></yt-live-chat-author-badge-renderer>';
  return '';
}
function photo(name){return '<yt-img-shadow id="author-photo"><img id="img" alt="" src="'+avatar(name)+'"></yt-img-shadow>';}
function tierStyle(t){return ' style="--yt-live-chat-paid-message-primary-color:'+t[0]+';--yt-live-chat-paid-message-secondary-color:'+t[1]+';--yt-live-chat-paid-sticker-chip-background-color:'+t[0]+';color:'+t[2]+';"';}

function msg(role){
  var name=role==='owner'?C.owner:pick(C.names,'n');
  var pool=role==='owner'?C.ownerTexts:role==='moderator'?C.modTexts:C.texts;
  var text=pick(pool,'t'+role);
  var attr=role==='viewer'?'':' author-type="'+role+'"';
  var cls=role==='viewer'?'':' class="'+role+'" type="'+role+'"';
  return '<yt-live-chat-text-message-renderer'+attr+'>'+photo(name)+'<div id="content"><span id="timestamp">'+time()+'</span><yt-live-chat-author-chip><span id="author-name"'+cls+'>'+esc(name)+'</span><span id="chat-badges">'+badge(role)+'</span></yt-live-chat-author-chip><span id="message">'+esc(text)+'</span></div><div id="menu"></div></yt-live-chat-text-message-renderer>';
}
function superchat(){
  var name=pick(C.names,'n'),tier=pick(C.tiers,'tier'),amount=pick(C.amounts,'amt'),text=pick(C.scTexts,'sc');
  return '<yt-live-chat-paid-message-renderer'+tierStyle(tier)+'><div id="card"><div id="header">'+photo(name)+'<div id="header-content"><div id="header-content-primary-column"><div id="author-name-chip"><span id="author-name">'+esc(name)+'</span></div><div id="purchase-amount">'+amount+'</div></div><span id="timestamp">'+time()+'</span></div></div>'+(text?'<div id="content"><div id="message">'+esc(text)+'</div></div>':'')+'</div></yt-live-chat-paid-message-renderer>';
}
function membership(){
  var name=pick(C.names,'n');
  return '<yt-live-chat-membership-item-renderer><div id="card"><div id="header">'+photo(name)+'<div id="header-content"><div id="header-content-primary-column"><div id="header-content-inner-column"><yt-live-chat-author-chip><span id="author-name">'+esc(name)+'</span></yt-live-chat-author-chip><div id="header-subtext">'+esc(C.memberText)+'</div></div></div></div></div></div></yt-live-chat-membership-item-renderer>';
}
function sticker(){
  var name=pick(C.names,'n'),tier=pick(C.tiers,'tier'),amount=pick(C.amounts,'amt');
  return '<yt-live-chat-paid-sticker-renderer'+tierStyle(tier)+'><div id="card">'+photo(name)+'<div id="author-info"><span id="author-name">'+esc(name)+'</span><div id="purchase-amount-chip">'+amount+'</div></div><yt-img-shadow id="sticker"><img id="img" alt="" src="'+stickerSvg()+'"></yt-img-shadow></div></yt-live-chat-paid-sticker-renderer>';
}
function build(kind){
  if(kind==='superchat')return superchat();
  if(kind==='membership')return membership();
  if(kind==='sticker')return sticker();
  return msg(kind);
}
function trim(){
  // Pesan lama dibuang hanya kalau sudah sepenuhnya keluar dari area terlihat, seperti chat asli.
  // Dibuang lebih awal membuat frame sempit berkedip kosong saat pesan baru mulai muncul.
  while(items.children.length>1){
    var first=items.firstElementChild;
    if(items.getBoundingClientRect().height-first.getBoundingClientRect().height<=list.clientHeight)break;
    items.removeChild(first);
  }
  while(items.children.length>40){items.removeChild(items.firstElementChild);}
}
function add(kind){
  items.insertAdjacentHTML('beforeend',build(kind));
  var el=items.lastElementChild;
  trim();
  return el;
}
function schedule(){
  clearTimeout(timer);
  if(!playing||!live)return;
  timer=setTimeout(function(){add(SEQ[cycle++%SEQ.length]);schedule();},gap*(0.75+Math.random()*0.5));
}
function play(){playing=true;schedule();}
function pause(){playing=false;clearTimeout(timer);}
function seed(){
  items.innerHTML='';
  if(!live){add('viewer');add('member');return;}
  var first=['viewer','member','viewer','superchat'];
  for(var i=0;i<first.length;i++){(function(k,n){setTimeout(function(){add(k);},n*260);})(first[i],i);}
  cycle=0;
  setTimeout(schedule,first.length*260);
}
function layerOf(t){
  var el=t&&t.nodeType===1?t:(t&&t.parentElement);
  if(!el||!el.closest)return 'panel';
  if(el.closest('#author-photo'))return 'avatar';
  var card=el.closest('yt-live-chat-paid-message-renderer,yt-live-chat-membership-item-renderer,yt-live-chat-paid-sticker-renderer');
  if(card){
    var tag=card.tagName.toLowerCase();
    return tag==='yt-live-chat-paid-message-renderer'?'superchat':tag==='yt-live-chat-membership-item-renderer'?'membership':'sticker';
  }
  if(el.closest('#chat-badges'))return 'badges';
  if(el.closest('#author-name'))return 'name';
  if(el.closest('#timestamp'))return 'timestamp';
  if(el.closest('#message'))return 'text';
  if(el.closest('#content'))return 'bubble';
  if(el.closest('yt-live-chat-text-message-renderer'))return 'row';
  return 'panel';
}
function select(layer){
  var sel=layer&&C.targets[layer];
  hlEl.textContent=sel?sel.join(',')+'{outline:2px solid #35B3F5!important;outline-offset:2px!important}':'';
}
function ready(){try{window.parent.postMessage({type:'lc-ready'},'*');}catch(e){}}

window.addEventListener('message',function(e){
  if(e.source!==window.parent)return;
  var d=e.data;
  if(!d||typeof d!=='object')return;
  switch(d.type){
    case 'css':if(typeof d.css==='string')styleEl.textContent=d.css;break;
    case 'ping':ready();break;
    case 'play':play();break;
    case 'pause':pause();break;
    case 'speed':gap=Math.min(6000,Math.max(300,Number(d.ms)||1400));break;
    case 'send':if(C.kinds.indexOf(d.kind)>=0)add(d.kind);break;
    case 'clear':items.innerHTML='';break;
    case 'restart':seed();break;
    case 'select':select(typeof d.layer==='string'?d.layer:null);break;
    case 'motion':motionEl.textContent=d.reduce?C.motionCss:'';break;
  }
});
if(live){
  // Tap dideteksi sendiri dari pointerdown dan pointerup, bukan lewat event click. Di iframe bersandbox
  // browser sentuh tidak selalu membuat click. Geser (scroll halaman) atau tekan lama tidak dihitung tap.
  var down=null;
  document.addEventListener('pointerdown',function(e){
    down={x:e.clientX,y:e.clientY,t:Date.now(),id:e.pointerId,target:e.target};
  },true);
  document.addEventListener('pointercancel',function(){down=null;},true);
  document.addEventListener('pointerup',function(e){
    var d=down;down=null;
    if(!d||d.id!==e.pointerId||e.button>0)return;
    var dx=e.clientX-d.x,dy=e.clientY-d.y;
    if(dx*dx+dy*dy>100||Date.now()-d.t>700)return;
    try{window.parent.postMessage({type:'lc-select',layer:layerOf(d.target)},'*');}catch(x){}
  },true);
}else{
  motionEl.textContent=C.motionCss;
}
window.__lc={add:add,count:function(){return items.children.length;},layerOf:layerOf,select:select,play:play,pause:pause,isPlaying:function(){return playing;},seed:seed};
seed();
ready();
})();
`;

export function buildPreviewDoc(css: string, mode: PreviewMode = "live"): string {
  const targets: Record<string, string[]> = {};
  for (const l of LAYERS) targets[l.id] = l.targets;
  const cfg = {
    thumb: mode === "thumb",
    targets,
    names: NAMES,
    texts: TEXTS,
    modTexts: MOD_TEXTS,
    ownerTexts: OWNER_TEXTS,
    owner: "Kopi Pagi",
    colors: AVATAR_COLORS,
    tiers: TIERS,
    amounts: AMOUNTS,
    scTexts: SC_TEXTS,
    memberText: "Member baru",
    kinds: SEND_KINDS,
    motionCss: MOTION_CSS,
  };
  const cfgJson = JSON.stringify(cfg).replace(/</g, "\\u003c");
  const safeCss = css.replace(/<\/style/gi, "<\\/style");
  const chrome =
    mode === "thumb"
      ? ""
      : `<yt-live-chat-header-renderer>Chat langsung</yt-live-chat-header-renderer>` +
        `<yt-live-chat-ticker-renderer><span>Rp20.000</span></yt-live-chat-ticker-renderer>`;
  const input = mode === "thumb" ? "" : `<yt-live-chat-message-input-renderer>Chat sebagai Kopi Pagi</yt-live-chat-message-input-renderer>`;
  return (
    `<!doctype html><html lang="id"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style id="lc-base">${BASE_CSS}</style>` +
    `<style id="lc-style">${safeCss}</style>` +
    `<style id="lc-hover">${mode === "live" ? hoverCss() : ""}</style>` +
    `<style id="lc-hl"></style>` +
    `<style id="lc-motion"></style>` +
    `</head><body>` +
    `<yt-live-chat-app><yt-live-chat-renderer>${chrome}` +
    `<yt-live-chat-item-list-renderer id="list"><div id="items"></div></yt-live-chat-item-list-renderer>` +
    `${input}</yt-live-chat-renderer></yt-live-chat-app>` +
    `<script>${SCRIPT.replace("__CFG__", () => cfgJson)}</script></body></html>`
  );
}
