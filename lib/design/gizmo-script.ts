/**
 * Skrip yang berjalan di dalam iframe preview untuk mengatur gambar langsung di canvas.
 *
 * Geometri (GEOMETRY_JS) dipisah dari kode DOM (GIZMO_JS) dan disimpan sebagai string, supaya kode yang persis
 * sama dijalankan di iframe dan di uji unit. Semua ditulis ES5 tanpa backtick dan tanpa `${`, karena disisipkan
 * ke dalam template string di preview-doc.ts.
 *
 * Satuan: "design px" adalah nilai di model desain (offset, lebar), "iframe px" adalah piksel layar di iframe.
 * Bila skala otomatis menyala, iframe px = design px * (lebar iframe / lebar acuan).
 */

/** Batas nilai yang diterima skema desain. Dipakai gizmo agar patch tidak pernah ditolak. */
export const PIN_LIMITS = { width: [8, 400], offset: [-100, 800] } as const;
export const PANEL_LIMITS = { width: [16, 600], height: [16, 600], offset: [-1000, 1000] } as const;

export const GEOMETRY_JS = String.raw`
var G=(function(){
  function parts(a){
    return {
      h:a.slice(-4)==='left'?'l':a.slice(-5)==='right'?'r':'c',
      v:a.indexOf('top')===0?'t':a.indexOf('bottom')===0?'b':'m'
    };
  }
  /* Pojok kiri atas kotak (px iframe, relatif ke wadah) dari anchor dan offset (design px). */
  function toBox(anchor,ox,oy,w,h,cw,ch,s){
    var p=parts(anchor);
    var x=p.h==='l'?ox*s:p.h==='r'?cw-w-ox*s:(cw-w)/2+ox*s;
    var y=p.v==='t'?oy*s:p.v==='b'?ch-h-oy*s:(ch-h)/2+oy*s;
    return {x:x,y:y};
  }
  /* Kebalikannya: offset (design px, dibulatkan) supaya kotak berada di x,y untuk anchor tertentu. */
  function fromBox(anchor,x,y,w,h,cw,ch,s){
    var p=parts(anchor);
    var ox=p.h==='l'?x/s:p.h==='r'?(cw-w-x)/s:(x-(cw-w)/2)/s;
    var oy=p.v==='t'?y/s:p.v==='b'?(ch-h-y)/s:(y-(ch-h)/2)/s;
    return {offsetX:Math.round(ox),offsetY:Math.round(oy)};
  }
  /* Anchor terdekat dari titik tengah kotak: sepertiga kiri/tengah/kanan dan atas/tengah/bawah. */
  function pickAnchor(x,y,w,h,cw,ch){
    var cx=x+w/2,cy=y+h/2;
    var hx=cx<cw/3?'left':cx>cw*2/3?'right':'center';
    var vy=cy<ch/3?'top':cy>ch*2/3?'bottom':'middle';
    if(vy==='middle'&&hx==='center')return 'center';
    return vy+'-'+hx;
  }
  /* Menahan kotak tetap di dalam wadah. Bila kotak lebih besar dari wadah, menempel di 0. */
  function clampBox(x,y,w,h,cw,ch){
    return {x:Math.max(0,Math.min(x,cw-w)),y:Math.max(0,Math.min(y,ch-h))};
  }
  function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
  return {toBox:toBox,fromBox:fromBox,pickAnchor:pickAnchor,clampBox:clampBox,clamp:clamp};
})();
`;

export const GIZMO_CSS = `#lc-gz{position:fixed;z-index:2147483600;box-sizing:border-box;border:2px solid #35B3F5;background:rgba(53,179,245,.14);cursor:move;touch-action:none;outline:none;display:none}#lc-gz:focus-visible{box-shadow:0 0 0 3px rgba(255,255,255,.9)}#lc-gz i{position:absolute;right:-9px;bottom:-9px;width:16px;height:16px;box-sizing:border-box;background:#fff;border:2px solid #35B3F5;border-radius:50%;cursor:nwse-resize;touch-action:none}`;

export const GIZMO_JS = String.raw`
var KIND_SEL={
  viewer:'yt-live-chat-text-message-renderer:not([author-type])',
  member:'yt-live-chat-text-message-renderer[author-type="member"]',
  moderator:'yt-live-chat-text-message-renderer[author-type="moderator"]',
  owner:'yt-live-chat-text-message-renderer[author-type="owner"]',
  superchat:'yt-live-chat-paid-message-renderer',
  membership:'yt-live-chat-membership-item-renderer',
  sticker:'yt-live-chat-paid-sticker-renderer'
};
var SCOPE_SEL={
  'default':KIND_SEL.viewer+' #content',
  member:KIND_SEL.member+' #content',
  moderator:KIND_SEL.moderator+' #content',
  owner:KIND_SEL.owner+' #content',
  superchat:KIND_SEL.superchat+' #card',
  membership:KIND_SEL.membership+' #card',
  sticker:KIND_SEL.sticker+' #card'
};
var focusEl=document.getElementById('lc-focus');
var focusKind=null;
function setFocus(kind){
  focusKind=(kind&&KIND_SEL[kind])?kind:null;
  if(!focusKind){focusEl.textContent='';return;}
  var hide=[];
  for(var k in KIND_SEL){if(k!==focusKind)hide.push(KIND_SEL[k]);}
  focusEl.textContent=hide.join(',')+'{display:none!important}';
  if(!items.querySelector(KIND_SEL[focusKind]))add(focusKind);
}
function roleOf(t){
  var el=t&&t.nodeType===1?t:(t&&t.parentElement);
  if(!el||!el.closest)return null;
  var r=el.closest('yt-live-chat-text-message-renderer');
  if(r)return r.getAttribute('author-type')||'viewer';
  var c=layerOf(el);
  return c==='superchat'||c==='membership'||c==='sticker'?c:null;
}

var gz=null,gzEl=null,gzRaf=0,gzAspect=1,gzDrag=null,gzFlush=0,gzQueued=null;
function gzScale(){return gz&&gz.ref>0?window.innerWidth/gz.ref:1;}
function gzContainer(){
  if(!gz)return null;
  if(gz.kind==='panel')return {l:0,t:0,w:window.innerWidth,h:window.innerHeight};
  var list=document.querySelectorAll(SCOPE_SEL[gz.scope]||'#none');
  var el=null;
  for(var i=list.length-1;i>=0;i--){if(list[i].getClientRects().length){el=list[i];break;}}
  if(!el)return null;
  var r=el.getBoundingClientRect();
  /* Posisi background dihitung dari kotak padding, jadi border dikeluarkan. */
  return {l:r.left+el.clientLeft,t:r.top+el.clientTop,w:el.clientWidth,h:el.clientHeight};
}
function gzSize(){
  var s=gzScale(),w=gz.width*s;
  return {w:w,h:gz.kind==='panel'?gz.height*s:w*gzAspect,s:s};
}
function gzLayout(){
  if(!gz||!gzEl)return;
  var c=gzContainer();
  if(!c){gzEl.style.display='none';return;}
  var z=gzSize(),p=G.toBox(gz.anchor,gz.offsetX,gz.offsetY,z.w,z.h,c.w,c.h,z.s);
  gzEl.style.display='block';
  gzEl.style.left=(c.l+p.x)+'px';
  gzEl.style.top=(c.t+p.y)+'px';
  gzEl.style.width=z.w+'px';
  gzEl.style.height=z.h+'px';
}
function gzLoop(){gzLayout();gzRaf=requestAnimationFrame(gzLoop);}
function gzLimits(){
  return gz.kind==='panel'
    ?{wmin:16,wmax:600,off:[-1000,1000]}
    :{wmin:8,wmax:400,off:[-100,800]};
}
/* Terapkan patch (design px) ke keadaan lokal supaya kotak langsung mengikuti, lalu kirim ke aplikasi. */
function gzApply(patch){
  var lim=gzLimits();
  if(patch.width!==undefined)patch.width=G.clamp(Math.round(patch.width),lim.wmin,lim.wmax);
  if(patch.height!==undefined)patch.height=G.clamp(Math.round(patch.height),16,600);
  if(patch.offsetX!==undefined)patch.offsetX=G.clamp(patch.offsetX,lim.off[0],lim.off[1]);
  if(patch.offsetY!==undefined)patch.offsetY=G.clamp(patch.offsetY,lim.off[0],lim.off[1]);
  for(var k in patch)gz[k]=patch[k];
  gzQueued=gzQueued||{};
  for(var q in patch)gzQueued[q]=patch[q];
  if(!gzFlush)gzFlush=requestAnimationFrame(function(){
    gzFlush=0;
    var send=gzQueued;gzQueued=null;
    if(send&&gz)try{window.parent.postMessage({type:'lc-image-set',kind:gz.kind,scope:gz.scope,id:gz.id,patch:send},'*');}catch(e){}
  });
}
function gzStart(mode,e){
  var c=gzContainer();
  if(!c)return null;
  var z=gzSize(),p=G.toBox(gz.anchor,gz.offsetX,gz.offsetY,z.w,z.h,c.w,c.h,z.s);
  return {mode:mode,id:e?e.pointerId:0,x0:e?e.clientX:0,y0:e?e.clientY:0,bx:p.x,by:p.y,w:z.w,h:z.h,c:c,s:z.s,anchor:gz.anchor};
}
function gzMovePatch(d,dx,dy,reanchor){
  var b=G.clampBox(d.bx+dx,d.by+dy,d.w,d.h,d.c.w,d.c.h);
  var a=reanchor?G.pickAnchor(b.x,b.y,d.w,d.h,d.c.w,d.c.h):d.anchor;
  var o=G.fromBox(a,b.x,b.y,d.w,d.h,d.c.w,d.c.h,d.s);
  return {anchor:a,offsetX:o.offsetX,offsetY:o.offsetY};
}
function gzResizePatch(d,dx,reanchor){
  var lim=gzLimits(),ratio=d.h/d.w;
  var w=d.w+dx;
  w=Math.min(w,d.c.w-d.bx,(d.c.h-d.by)/ratio,lim.wmax*d.s);
  w=Math.max(w,lim.wmin*d.s);
  var h=w*ratio;
  var a=reanchor?G.pickAnchor(d.bx,d.by,w,h,d.c.w,d.c.h):d.anchor;
  var o=G.fromBox(a,d.bx,d.by,w,h,d.c.w,d.c.h,d.s);
  var patch={anchor:a,width:w/d.s,offsetX:o.offsetX,offsetY:o.offsetY};
  if(gz.kind==='panel')patch.height=h/d.s;
  return patch;
}
function gzDone(){try{window.parent.postMessage({type:'lc-image-done'},'*');}catch(e){}}
function gzBind(el){
  el.addEventListener('pointerdown',function(e){
    if(e.button!==0||!gz)return;
    e.preventDefault();e.stopPropagation();
    gzDrag=gzStart(e.target&&e.target.tagName==='I'?'resize':'move',e);
    if(gzDrag)try{el.setPointerCapture(e.pointerId);}catch(x){}
  });
  el.addEventListener('pointermove',function(e){
    if(!gzDrag||gzDrag.id!==e.pointerId||!gz)return;
    var dx=e.clientX-gzDrag.x0,dy=e.clientY-gzDrag.y0;
    gzApply(gzDrag.mode==='move'?gzMovePatch(gzDrag,dx,dy,false):gzResizePatch(gzDrag,dx,false));
  });
  function end(e){
    if(!gzDrag||gzDrag.id!==e.pointerId)return;
    var d=gzDrag;gzDrag=null;
    if(!gz)return;
    var dx=e.clientX-d.x0,dy=e.clientY-d.y0;
    /* Saat dilepas, pilih anchor terdekat supaya gambar tetap menempel di sisi yang benar bila panjang pesan berubah. */
    gzApply(d.mode==='move'?gzMovePatch(d,dx,dy,true):gzResizePatch(d,dx,true));
  }
  el.addEventListener('pointerup',end);
  el.addEventListener('pointercancel',function(e){if(gzDrag&&gzDrag.id===e.pointerId)gzDrag=null;});
  el.addEventListener('keydown',function(e){
    if(!gz)return;
    if(e.key==='Escape'){e.preventDefault();gzDone();return;}
    var step=e.shiftKey?10:1,d=gzStart('move',null);
    if(!d)return;
    var s=d.s,dx=0,dy=0;
    if(e.key==='ArrowLeft')dx=-step*s;
    else if(e.key==='ArrowRight')dx=step*s;
    else if(e.key==='ArrowUp')dy=-step*s;
    else if(e.key==='ArrowDown')dy=step*s;
    else if(e.key==='+'||e.key==='='||e.key==='-'||e.key==='_'){
      e.preventDefault();
      gzApply(gzResizePatch(d,(e.key==='+'||e.key==='='?2:-2)*s*(e.shiftKey?5:1),false));
      return;
    }else return;
    e.preventDefault();
    gzApply(gzMovePatch(d,dx,dy,false));
  });
}
function gzOff(){
  gz=null;gzDrag=null;
  if(gzRaf){cancelAnimationFrame(gzRaf);gzRaf=0;}
  if(gzEl){gzEl.remove();gzEl=null;}
}
function imgsel(t,ref){
  if(!t||typeof t!=='object'){gzOff();return;}
  if(gzDrag&&gz)return;
  var prevUrl=gz&&gz.url;
  /* Selama drag, keadaan lokal adalah sumber kebenaran; pembaruan dari aplikasi datang setelahnya dan identik. */
  gz={kind:t.kind==='panel'?'panel':'pin',scope:String(t.scope||'default'),id:String(t.id),url:String(t.url||''),anchor:String(t.anchor||'top-left'),width:Number(t.width)||32,height:Number(t.height)||0,offsetX:Number(t.offsetX)||0,offsetY:Number(t.offsetY)||0,ref:Number(ref)||0};
  if(gz.url!==prevUrl){
    gzAspect=1;
    if(gz.url){
      var im=new Image();
      im.onload=function(){if(gz&&im.naturalWidth)gzAspect=im.naturalHeight/im.naturalWidth;};
      im.src=gz.url;
    }
  }
  if(!gzEl){
    gzEl=document.createElement('div');
    gzEl.id='lc-gz';
    gzEl.tabIndex=0;
    gzEl.setAttribute('role','application');
    gzEl.setAttribute('aria-label','Gambar. Geser untuk memindah, tarik titik di sudut untuk mengubah ukuran, atau pakai tombol panah dan plus minus. Escape untuk selesai.');
    gzEl.innerHTML='<i aria-hidden="true"></i>';
    document.body.appendChild(gzEl);
    gzBind(gzEl);
  }
  if(!gzRaf)gzLoop();
}
`;
