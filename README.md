# lazycustom

**Custom CSS chat live YouTube untuk OBS, gratis dan tanpa akun.**

[![Live demo](https://img.shields.io/badge/demo-lazycustom.vercel.app-3ECF8E)](https://lazycustom.vercel.app)
[![Lisensi: MIT](https://img.shields.io/badge/lisensi-MIT-blue)](./LICENSE)

Banyak streamer dan VTuber ingin chat overlay yang enak dilihat, tapi custom CSS berbayar sering di luar
jangkauan, apalagi buat yang masih menabung dulu. lazycustom dibuat supaya siapa pun bisa dapat CSS chat
yang rapi tanpa keluar uang: pilih template atau desain sendiri, atur langsung di preview yang mendekati
tampilan asli, lalu tempel hasilnya ke Browser Source di OBS. Tidak ada akun, tidak ada API key, tidak ada
biaya.

<!-- TODO: ganti dengan screenshot penuh editor (Templates/Layers di kiri, preview di tengah, Properties di
kanan). Lihat docs/screenshot.png -->

## Coba sekarang

**[lazycustom.vercel.app](https://lazycustom.vercel.app)**: langsung di browser, tidak perlu instal apa-apa.

## Fitur

- **16 template siap pakai**, dari beberapa gaya berbeda:
  - *Glass*: Crystal, Frost
  - *VTuber/pastel*: Dreamy, Bloom, Sticker
  - *Editorial/retro*: Broadsheet, Gazette
  - *Esports/gaming*: Arena, Phantom, Cyber, Grid, HUD, Terminal, Quest, Brutal
  - *Netral*: Plain (tanpa bubble, teks bersih)
- **Preview live yang bergerak**: simulasi chat dengan Play/Pause, kecepatan, dan tombol kirim pesan contoh
  (viewer, member, moderator, owner, Super Chat, Membership, Sticker).
- **Klik langsung di preview untuk mengedit**: klik bubble untuk memilih layer dan tab peran yang sesuai
  (Default/Member/Moderator/Owner), lalu atur di panel Properties.
- **Atur gambar langsung di canvas**: geser untuk memindah, tarik titik di sudut untuk mengubah ukuran,
  panah keyboard untuk geser halus. Berlaku untuk image pin di bubble maupun gambar panel.
- **Mode Fokus**: sembunyikan sementara jenis pesan lain di preview supaya yang sedang diedit gampang
  dilihat.
- **Skala otomatis**: seluruh ukuran chat ikut menyesuaikan saat lebar Browser Source di OBS diubah,
  tanpa perlu mengatur ulang satu per satu.
- **Pustaka gambar**: unggahan otomatis dimampatkan ke WebP dan tersimpan di browser komputer sendiri
  (IndexedDB), bisa dipakai ulang di desain lain. Tidak ada yang dikirim ke server mana pun.
- **Gambar dan GIF di mana saja**: di bubble, di kartu Super Chat/Membership/Sticker, sebagai bingkai
  avatar, dan sebagai gambar panel yang tetap di satu tempat (logo, banner).
- **Layers**: seret atau pakai tombol panah untuk mengurutkan Timestamp, Name, Badges, dan Message text.
- **Dekorasi**: glow, gradient border, accent bar, corner brackets, scanlines, halftone, stripes, gambar
  latar, dan image pin (anchor 9 titik).
- **Bubble dari nol**: kerangka Grid atau Free, teks sendiri per peran, bentuk sudut (Round/Slant/Chamfer),
  serta bubble khusus untuk member, moderator, dan owner.
- **Animasi per elemen** (Fade, Rise, Drop, Pan, Wipe, Pop, Blur) dan efek (Float, Pulse, Shimmer,
  Glow pulse, Flicker, Glitch, Shake, Spin, Drift).
- **Adjust image**: gambar upload bisa diputar, di-flip, di-crop, dan difilter sebelum dipakai.
- **My Designs** (maksimal 20 di browser), undo/redo, link Share, serta Export dan Import file.

## Menjalankan

Butuh Node.js 22.

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # typecheck, lint, tes unit, build (jalankan sebelum deploy)
```

## Cara kerja

Semua logika desain ada di `lib/design/`:

- `model.ts`: model desain v2 (Zod, berversi). Satu objek JSON jadi sumber kebenaran. Semua nilai
  dibatasi ketat: warna hanya `#RRGGBB`, angka berbatas, link gambar hanya `https` tanpa karakter yang
  bisa keluar dari `url("...")`. Data dari file impor, penyimpanan lokal, dan link Share divalidasi ulang
  oleh skema ini.
- `templates.ts`: 16 template. Kartu Super Chat/Membership/Sticker diturunkan dari bubble supaya tampil
  sekeluarga.
- `css.ts`: mengubah desain jadi CSS untuk OBS. Semua selector YouTube ada di objek `SEL`, jadi kalau
  YouTube mengubah struktur chat-nya, cukup diperbaiki di satu tempat. Dekorasi dikompilasi ke CSS lama:
  glow ke `box-shadow`, gradient border ke `::before` bermask, gambar ke `::after`. Kalau skala otomatis
  menyala, seluruh panjang px diubah ke `vw` relatif terhadap lebar acuan (`scaleLengths`).
- `preview-doc.ts`: dokumen iframe berisi simulator chat yang meniru DOM YouTube asli (termasuk
  `#prepend-chat-badges`, tombol Top Fan, dan `#message-container`). CSS di dalamnya cuma perkiraan gaya
  YouTube.
- `gizmo-script.ts`: geometri dan interaksi drag/resize gambar langsung di canvas (jangkar 9 titik,
  konversi offset ke posisi kotak dan sebaliknya), dijalankan di dalam iframe lewat `postMessage`.
- `image-compress.ts` / `image-library.ts`: pemampat gambar ke WebP di bawah 100 KB dan pustaka gambar
  di IndexedDB milik user sendiri, tidak pernah menyentuh server.
- `image-target.ts`: mencari dan menambal satu gambar (pin atau panel) di desain, dipakai fitur atur-di-
  canvas.
- `upload.ts`: membaca gambar dari komputer. Tipe file ditentukan dari byte awalnya (bukan ekstensi atau
  `file.type`), SVG ditolak.
- `share.ts`: link Share berupa `#d=` berisi desain terkompresi (`deflate-raw`), tidak pernah dikirim ke
  server.
- `store.ts`: banyak desain di `localStorage`, undo/redo, penggabungan perubahan beruntun.
- `fx.ts`: CSS untuk animasi per elemen, efek, label, kerangka grid/bebas, dan bubble per peran. Teks
  buatan user ditulis sebagai escape heksadesimal, jadi tidak ada karakter yang bisa keluar dari string
  CSS.
- `image-edit.ts`: hitungan crop dan ukuran (murni, diuji tanpa browser) dan pemanggangan lewat canvas.

CSS keluaran sengaja tanpa `color-mix`, `:has()`, nesting, `@layer`, dan `backdrop-filter`, karena browser
bawaan OBS bisa lebih tua dari Chrome biasa dan `backdrop-filter` tidak menangkap gameplay (OBS memadukan
sumber browser sebagai tekstur terpisah). `tests/design-css.test.ts` menjaga batasan ini.

## Pengujian

```bash
npm test             # tes unit dan komponen (vitest)
```

Uji browser sungguhan ada di `e2e/` (Playwright, dijalankan manual, belum diikat ke skrip npm). Perlu
`playwright-core` dan server yang jalan:

```bash
npm i -D playwright-core          # sekali saja
npm run build && npx next start -p 3100
BASE_URL=http://localhost:3100/ node e2e/core.js      # simulasi, klik-pilih layer, drag and drop, dekorasi
BASE_URL=http://localhost:3100/ node e2e/more.js      # My Designs, Share, file, tema, animasi, keyboard
BASE_URL=http://localhost:3100/ node e2e/mobile.js    # overflow di 8 lebar layar, mobile, tap sentuh
BASE_URL=http://localhost:3100/ node e2e/images.js    # gambar, GIF, upload, bingkai avatar, gambar panel
BASE_URL=http://localhost:3100/ node e2e/security.js  # tanpa permintaan ke host luar sebelum setuju, XSS, CSP, header
BASE_URL=http://localhost:3100/ node e2e/tools.js     # tools, animasi, efek, label, grid, editor gambar
BASE_URL=http://localhost:3100/ node e2e/canvas.js    # drag/resize gambar di canvas, mode fokus, tab peran
```

Kalau Chromium tidak ditemukan otomatis, jalankan `npx playwright-core install chromium`. Di lingkungan
tanpa akses ke Google Fonts, font kustom tampil sebagai font cadangan dan ada 403 di konsol. Itu wajar.

## Keamanan

- **Header** (`next.config.ts`): `Content-Security-Policy` (produksi), `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, HSTS, COOP, dan
  `Permissions-Policy` yang mematikan kamera, mikrofon, lokasi, dan sejenisnya.
- **Tidak ada input bebas yang menjadi CSS**: warna hanya `#RRGGBB`, angka berbatas, link gambar hanya
  `https` tanpa karakter yang bisa keluar dari `url("...")`. Gambar unggahan hanya data URI PNG, JPEG,
  GIF, atau WebP dengan pola base64 ketat, dimampatkan ke bawah 100 KB per gambar (sumber boleh sampai
  8 MB sebelum dimampatkan). Semua data dari file impor, penyimpanan lokal, dan link Share divalidasi
  ulang oleh skema.
- **Iframe preview** memakai `sandbox="allow-scripts"` tanpa `allow-same-origin`, jadi kodenya tidak bisa
  menyentuh halaman induk. Pesan antar jendela diverifikasi asalnya.
- **Pustaka gambar** tersimpan di IndexedDB milik browser user sendiri. Tidak ada gambar yang dikirim ke
  server mana pun.
- **`/api/log`**: menolak permintaan lintas situs, tipe konten selain JSON, body di atas 8 KB, dan bentuk
  data yang tidak cocok. Isi file impor, isi link Share, dan gambar unggahan tidak pernah dikirim ke log.
- **Link Share** tidak membawa gambar unggahan, dibatasi ukuran encode dan hasil dekompresinya (anti bom
  dekompresi).
- Dependensi dicek dengan `npm audit`. Versi dikunci eksak di `package.json`.

## Error dan log

User melihat pesan ramah dari `lib/errors.ts` beserta kode laporan seperti `LC-7K2F`. Kode yang sama
tercatat sebagai satu baris JSON di log server lewat `POST /api/log`. Kalau user melapor: buka **Logs** di
Vercel, cari kode itu. Isi file yang diimpor user dan isi link Share tidak pernah dikirim ke log, hanya
ukurannya.

## Deploy ke Vercel

Tidak ada environment variable yang dibutuhkan. Vercel mengenali Next.js otomatis. Versi Node dikunci ke
22.x lewat `engines` di `package.json`.

## Hal yang perlu diketahui

- Selector YouTube berasal dari pola yang dipakai luas oleh komunitas OBS. Nama elemen di dalam kartu
  Membership dan Sticker belum sepenuhnya terkonfirmasi, jadi cek dengan donasi atau member sungguhan di
  OBS.
- Font non-sistem (termasuk Fraunces dan Special Elite) dimuat lewat Google Fonts. OBS perlu internet
  untuk itu.
- Gambar dari link dimuat langsung dari host-nya saat chat tampil di OBS. Gambar unggahan tertanam di CSS:
  aman dari host yang mati, tapi CSS jadi lebih besar dan tidak ikut link Share (ikut Export file).
- Pustaka gambar dan banyak desain dengan gambar unggahan bisa memenuhi penyimpanan browser. Export file
  sebagai cadangan tetap disarankan.
- Mode overlay lewat YouTube Data API sengaja belum dibuat. Alat ini hanya menghasilkan CSS.

## Lisensi

[MIT](./LICENSE): dibuat oleh [yanzoshawty](https://github.com/yanzoshawty). Pakai, ubah, atau distribusikan
ulang bebas, termasuk untuk kebutuhan komersial, selama pemberitahuan lisensi tetap disertakan.
