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
- **Dekorasi**: glow, gradient border, accent bar, corner brackets, scanlines, dan gambar atau GIF dari link https.
- **Kartu** Super Chat, Membership, dan Sticker, masing-masing bisa didesain.
- **My Designs** (maksimal 20 di browser), undo dan redo, **link Share**, serta Export dan Import file.

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
- `share.ts`: link Share berupa `#d=` yang berisi desain terkompresi (`deflate-raw`) dan tidak pernah dikirim
  ke server. Ukuran dibatasi untuk menolak bom dekompresi.
- `store.ts`: banyak desain di `localStorage`, undo dan redo, penggabungan perubahan beruntun (geseran slider).
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
```

Kalau Chromium tidak ditemukan otomatis, jalankan `npx playwright-core install chromium`. Di lingkungan
tanpa akses ke Google Fonts, font kustom tampil sebagai font cadangan dan ada 403 di konsol. Itu wajar.

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
- Gambar dekorasi dimuat langsung dari link yang kamu masukkan saat chat tampil di OBS. Pakai host yang stabil.
- Warna tier di preview hanya contoh.
- Mode overlay lewat YouTube Data API sengaja belum dibuat. Alat ini hanya menghasilkan CSS.
