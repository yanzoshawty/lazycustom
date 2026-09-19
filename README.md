# lazycustom

Generator CSS untuk chat live YouTube di OBS. Pilih tema, atur warna, font, bubble, dan animasi
dengan preview langsung, lalu salin CSS-nya ke Browser Source di OBS. Tanpa akun, tanpa API key.

## Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # typecheck, lint, tes, build (jalankan sebelum deploy)
```

## Cara kerja

- `lib/settings.ts` skema pengaturan (Zod, berversi). `lib/presets.ts` enam tema awal.
- `lib/css.ts` mengubah pengaturan menjadi CSS untuk OBS. **Semua selector YouTube ada di objek `SEL`**,
  jadi kalau YouTube mengubah struktur chat-nya, cukup perbaiki di satu tempat.
- `lib/preview-html.ts` membuat dokumen iframe yang meniru struktur DOM chat YouTube. CSS dasar di
  dalamnya hanya perkiraan gaya YouTube, bukan salinan resmi.
- CSS keluaran sengaja tanpa `color-mix`, `:has()`, nesting, dan `@layer` karena browser bawaan OBS
  bisa lebih tua dari Chrome biasa. Tes di `tests/css.test.ts` menjaga ini.

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

Isi file yang diimpor user dan isi link yang ditempel **tidak pernah** dikirim ke log, hanya ukurannya.

## Deploy ke Vercel

Tidak ada environment variable yang dibutuhkan. Vercel mengenali Next.js otomatis.

## Hal yang perlu diketahui

- Selector YouTube berasal dari pola yang dipakai luas oleh komunitas OBS dan belum bisa diuji otomatis
  terhadap YouTube langsung. Cek sekali di OBS setelah deploy, dan cek lagi kalau chat tiba-tiba
  tampil berbeda.
- Font non-sistem dimuat lewat Google Fonts (`@import` di CSS keluaran, dan saat dipilih di preview).
  OBS perlu internet untuk itu.
- Mode overlay lewat YouTube Data API sengaja belum dibuat. Alat ini hanya menghasilkan CSS.
