# lazycustom

Editor visual untuk mendesain chat live YouTube di OBS. Mulai dari template atau desain sendiri:
klik bagian chat di preview, atur gayanya, ubah urutan bagiannya, tambah dekorasi, lalu salin CSS-nya
ke Browser Source. Tanpa akun, tanpa API key.

## Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # typecheck, lint, tes, build (jalankan sebelum deploy)
```

## Fitur

- **11 template** (Crystal, Aurora, Holo, Grid, HUD, Terminal, Pulse, Lite Glass, Frost, Sticker Pop, Plain).
- **Preview live yang bergerak**: simulasi chat dengan Play/Pause, kecepatan, dan tombol kirim pesan contoh
  (viewer, member, moderator, owner, Super Chat, Membership, Sticker).
- **Klik elemen di preview untuk memilih layer**, lalu atur di Properties.
- **Layers**: seret atau pakai tombol panah untuk mengurutkan Timestamp, Name, Badges, dan Message text.
- **Dekorasi**: glow, gradient border, accent bar, corner brackets, scanlines, gambar latar, dan **Image pin**
  (beberapa gambar atau GIF per permukaan dengan anchor 9 titik, lebar, dan jarak dari tepi).
- **Gambar dan GIF di mana saja**: di bubble, di kartu Super Chat, Membership, dan Sticker, sebagai **bingkai avatar**,
  dan sebagai **gambar panel** yang tetap di satu tempat (logo, banner; dua di belakang dan dua di depan pesan).
  Sumbernya link https atau upload dari komputer (PNG, JPEG, GIF, WebP, maks 100 KB).
- **Kartu** Super Chat, Membership, dan Sticker, masing-masing bisa didesain.
- **My Designs** (maksimal 20 di browser), undo dan redo, **link Share**, serta Export dan Import file.
- **Tools ala Canva** di sisi kiri: Templates, Elements, Text, Uploads, Animate, Layers, Designs.
- **Template bergaya**: Brutal (brutalism), Phantom (merah, hitam, potongan miring), Quest (kotak dialog RPG),
  Arena (HUD esports), dan Cyber (neon dengan efek), selain template futuristik lainnya.
- **Animasi per elemen** (preset Fade, Rise, Drop, Pan, Wipe, Pop, Blur dengan durasi dan jeda) dan **efek**
  berulang atau khusus (Float, Pulse, Shimmer, Glow pulse, Neon flicker, Glitch, Shake, Spin, Drift).
- **Bubble dari nol**: kerangka Grid (kolom, baris, sel per bagian), kerangka Free (koordinat tiap bagian, bisa
  digeser langsung di preview dengan mouse atau sentuhan), teks sendiri (dua label per peran, awalan dan akhiran nama
  dan pesan), bentuk sudut (Round, Slant, Chamfer), dekorasi Halftone dan Stripes, serta bubble khusus untuk member,
  moderator, dan owner.
- **Adjust image**: gambar upload bisa diputar, di-flip, di-crop (rasio, zoom, geser), dan difilter. Hasilnya dipanggang
  ke gambar baru di bawah 100 KB. GIF tidak bisa disunting dengan cara ini karena animasinya hilang.

## Cara kerja

Semua ada di `lib/design/`:

- `model.ts`: model desain v2 (Zod, berversi). Satu objek JSON yang menjadi sumber kebenaran. Semua nilai
  dibatasi ketat: warna hanya `#RRGGBB`, angka berbatas, link gambar hanya `https` tanpa karakter yang bisa
  keluar dari `url("...")`. Data dari file impor, penyimpanan lokal, dan link Share divalidasi ulang oleh skema ini.
- `templates.ts`: 11 template. Kartu diturunkan dari bubble supaya tampil sekeluarga.
- `css.ts`: mengubah desain menjadi CSS untuk OBS. **Semua selector YouTube ada di objek `SEL`**, jadi kalau
  YouTube mengubah struktur chat-nya, cukup perbaiki di satu tempat. Dekorasi dikompilasi ke CSS lama:
  glow ke `box-shadow`, gradient border ke `::before` bermask, bentuk ke lapisan `background`, gambar ke `::after`.
  Urutan bagian pesan memakai `order` dan `display: contents` pada `yt-live-chat-author-chip`.
- `preview-doc.ts`: dokumen iframe berisi simulator chat yang meniru DOM YouTube. CSS dasar di dalamnya hanya
  perkiraan gaya YouTube. Deteksi tap memakai `pointerdown` dan `pointerup`, bukan `click`, karena di iframe
  bersandbox browser sentuh tidak selalu membuat `click`.
- `upload.ts`: membaca gambar dari komputer. Tipe file ditentukan dari **byte awalnya** (bukan ekstensi atau
  `file.type`), SVG ditolak, dan ukuran dibatasi 100 KB per gambar dan sekitar 225 KB per desain.
- `share.ts`: link Share berupa `#d=` yang berisi desain terkompresi (`deflate-raw`) dan tidak pernah dikirim
  ke server. Ukuran dibatasi untuk menolak bom dekompresi.
- `store.ts`: banyak desain di `localStorage`, undo dan redo, penggabungan perubahan beruntun (geseran slider).
- `fx.ts`: CSS untuk animasi per elemen, efek, label, kerangka grid dan bebas, dan bubble per peran. Ditambahkan di akhir
  stylesheet. Teks buatan user ditulis ke CSS sebagai escape heksadesimal, jadi tanda kutip atau kurung apa pun tidak bisa
  keluar dari string CSS. Label memakai pseudo-element pada `yt-live-chat-author-chip` (yang `display: contents`),
  jadi ikut menjadi item flex atau grid milik bubble.
- `image-edit.ts`: hitungan crop dan ukuran (murni, diuji tanpa browser) dan pemanggangan lewat canvas.
- CSS keluaran sengaja tanpa `color-mix`, `:has()`, nesting, `@layer`, dan `backdrop-filter`. Browser bawaan OBS
  bisa lebih tua dari Chrome biasa, dan `backdrop-filter` tidak menangkap gameplay karena OBS memadukan sumber
  browser sebagai tekstur terpisah. `tests/design-css.test.ts` menjaga ini.
- Mode tier pada Super Chat sengaja **tidak menimpa warna teks**: YouTube memilih warna latar sesuai nominal
  (ada yang terang) dan menyetel teks yang cocok. Menimpanya membuat tier terang tidak terbaca.

## Pengujian

```bash
npm test             # tes unit dan komponen (vitest)
```

Uji browser sungguhan ada di `e2e/` (Playwright). Perlu browser Chromium dan server yang berjalan:

```bash
npm i -D playwright-core          # sekali saja
npm run build && npx next start -p 3100
BASE_URL=http://localhost:3100/ node e2e/core.js      # simulasi, klik-pilih layer, drag and drop, dekorasi
BASE_URL=http://localhost:3100/ node e2e/more.js      # My Designs, Share, file, tema, animasi, keyboard
BASE_URL=http://localhost:3100/ node e2e/mobile.js    # overflow di 8 lebar layar, mobile, tap sentuh
BASE_URL=http://localhost:3100/ node e2e/images.js    # gambar, GIF, upload, bingkai avatar, gambar panel
BASE_URL=http://localhost:3100/ node e2e/security.js  # tanpa permintaan ke host luar sebelum setuju, XSS, CSP, header
BASE_URL=http://localhost:3100/ node e2e/tools.js     # tools, animasi, efek, label, grid, geser di preview, bubble per peran, editor gambar
BASE_URL=http://localhost:3100/ node e2e/images.js    # gambar, GIF, upload, bingkai avatar, CSP
```

Kalau Chromium tidak ditemukan otomatis, jalankan `npx playwright-core install chromium`. Di lingkungan
tanpa akses ke Google Fonts, font kustom tampil sebagai font cadangan dan ada 403 di konsol. Itu wajar.

## Keamanan

- **Header** (`next.config.ts`): `Content-Security-Policy` (produksi), `X-Frame-Options: DENY`, `frame-ancestors 'none'`,
  `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, HSTS, COOP, dan `Permissions-Policy` yang mematikan kamera,
  mikrofon, lokasi, dan sejenisnya. CSP memakai `'unsafe-inline'` untuk script dan style karena Next.js menyisipkan
  skrip bootstrap dan iframe preview (`srcdoc`) mewarisi kebijakan halaman induknya. Yang tetap ketat: tanpa host script
  luar, tanpa `eval`, tanpa objek, `form-action` dan `base-uri` hanya asal sendiri, dan `connect-src 'self'`.
  Nonce per permintaan akan mengharuskan semua halaman dirender dinamis, dan itu belum dipilih.
- **Tidak ada input bebas yang menjadi CSS**: warna hanya `#RRGGBB`, angka berbatas, dan link gambar hanya `https`
  tanpa karakter yang bisa keluar dari `url("...")`. Gambar unggahan hanya data URI PNG, JPEG, GIF, atau WebP dengan
  pola base64 ketat. Semua data dari file impor, penyimpanan lokal, dan link Share divalidasi ulang oleh skema.
- **Iframe preview** memakai `sandbox="allow-scripts"` tanpa `allow-same-origin`, jadi kodenya tidak bisa menyentuh
  halaman induk. Teks dan nama contoh di-escape, dan pesan antar jendela diverifikasi asalnya.
- **`/api/log`**: menolak permintaan lintas situs (`Sec-Fetch-Site`), tipe konten selain JSON, body di atas 8 KB, dan
  bentuk data yang tidak cocok. Pembatas laju memakai header IP milik Vercel yang tidak bisa dipalsukan pengirim.
  Isi file impor, isi link Share, dan gambar unggahan tidak pernah dikirim ke log.
- **Link Share** tidak membawa gambar unggahan, dibatasi ukuran encode dan hasil dekompresinya (anti bom dekompresi),
  dan hasil decode dibersihkan dari data URI walau lolos skema.
- **Privasi gambar**: gambar dari link dimuat dari server milik pemilik link, oleh OBS di komputermu dan oleh preview
  di browser siapa pun yang membuka desainnya. Jadi pemilik host bisa melihat alamat IP pemuatnya. Penonton stream
  tidak memuat gambar itu (mereka hanya melihat video). Karena desain dari link Share atau file impor bisa dipakai
  untuk melacak pembukanya, desain yang memuat gambar dari luar **tidak dibuka langsung**: user ditanya dulu,
  dengan pilihan "Buka tanpa gambar" sebagai bawaan. Gambar unggahan tidak punya masalah ini karena tertanam di CSS,
  tapi membuat CSS lebih besar.
- Dependensi dicek dengan `npm audit` (saat ini 0 kerentanan). Versi dikunci eksak di `package.json`.

## Error dan log

User melihat pesan ramah dari `lib/errors.ts` (apa yang terjadi dan apa yang bisa dilakukan) beserta
**kode laporan** seperti `LC-7K2F`. Kode yang sama tercatat sebagai satu baris JSON di log server lewat
`POST /api/log`, jadi:

1. User menyebut kode laporan.
2. Di Vercel, buka **Logs** lalu cari kode itu. Setiap baris memuat `level`, `code`, `ref`, `message`,
   `stack`, `path`, dan `ua`.

Tidak ada file log karena filesystem Vercel tidak persisten. Endpoint `/api/log` membatasi ukuran body
(8 KB), bentuk data, dan laju (20 per menit per alamat). Pembatas laju hidup di memori satu instance,
jadi sifatnya upaya terbaik, bukan jaminan global.

Isi file yang diimpor user dan isi link Share **tidak pernah** dikirim ke log, hanya ukurannya.

## Deploy ke Vercel

Tidak ada environment variable yang dibutuhkan. Vercel mengenali Next.js otomatis. Versi Node dikunci
ke 22.x lewat `engines` di `package.json`.

## Hal yang perlu diketahui

- Selector YouTube berasal dari pola yang dipakai luas oleh komunitas OBS dan belum bisa diuji otomatis
  terhadap YouTube langsung. Nama elemen di dalam kartu Membership dan Sticker belum sepenuhnya
  terkonfirmasi, jadi cek dengan donasi atau member sungguhan di OBS, dan cek lagi kalau chat tiba-tiba
  tampil berbeda.
- Font non-sistem dimuat lewat Google Fonts (`@import` di CSS keluaran, dan saat dipilih di preview).
  OBS perlu internet untuk itu.
- Gambar dari link dimuat langsung dari host-nya saat chat tampil di OBS, jadi pakai host yang stabil. Gambar unggahan
  tertanam di CSS: aman dari host yang mati, tapi CSS jadi besar dan tidak ikut link Share (ikut Export file).
- Menyimpan banyak desain dengan gambar unggahan bisa memenuhi penyimpanan browser (sekitar 5 MB). Kalau itu terjadi,
  muncul pesan dan desain tetap bisa dipakai, tapi gunakan Export file sebagai cadangan.
- Warna tier di preview hanya contoh.
- Mode overlay lewat YouTube Data API sengaja belum dibuat. Alat ini hanya menghasilkan CSS.
