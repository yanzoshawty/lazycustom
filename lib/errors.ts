/**
 * Katalog error untuk user. Setiap entri menjawab dua hal: apa yang terjadi dan
 * apa yang bisa dilakukan. Detail teknis tidak pernah tampil di sini, tapi masuk
 * ke log developer lewat kode yang sama.
 */
export type ErrorCode =
  | "COPY_BLOCKED"
  | "IMPORT_INVALID"
  | "IMPORT_TOO_LARGE"
  | "IMPORT_VERSION"
  | "IMPORT_READ"
  | "STORAGE_BLOCKED"
  | "STORAGE_CORRUPT"
  | "URL_INVALID"
  | "SHARE_INVALID"
  | "SHARE_TOO_LARGE"
  | "SHARE_FAILED"
  | "DESIGN_LIMIT"
  | "PREVIEW_FAILED"
  | "RENDER_FAILED"
  | "PAGE_NOT_FOUND"
  | "UNKNOWN";

export type Severity = "error" | "warning";

export interface ErrorInfo {
  title: string;
  body: string;
  action: string;
  severity: Severity;
}

export const ERROR_CATALOG: Record<ErrorCode, ErrorInfo> = {
  COPY_BLOCKED: {
    title: "CSS belum tersalin",
    body: "Browser tidak mengizinkan penyalinan otomatis.",
    action: "Klik kotak CSS, lalu tekan Ctrl+A dan Ctrl+C (Cmd di Mac). Teksnya sudah kami blok untukmu.",
    severity: "error",
  },
  IMPORT_INVALID: {
    title: "File pengaturan tidak bisa dibaca",
    body: "Isi file ini tidak cocok dengan format lazycustom.",
    action: "Pilih file .json yang kamu ekspor dari lazycustom.",
    severity: "error",
  },
  IMPORT_TOO_LARGE: {
    title: "File terlalu besar",
    body: "File pengaturan lazycustom jauh lebih kecil dari ini, jadi kemungkinan yang terpilih file lain.",
    action: "Pastikan kamu memilih file hasil ekspor lazycustom.",
    severity: "error",
  },
  IMPORT_VERSION: {
    title: "Versi file tidak dikenali",
    body: "File ini dibuat oleh versi lazycustom yang berbeda.",
    action: "Ekspor ulang dari versi yang sama, atau atur manual di editor.",
    severity: "error",
  },
  IMPORT_READ: {
    title: "File tidak bisa dibuka",
    body: "Browser gagal membaca file yang kamu pilih.",
    action: "Coba pilih file itu sekali lagi.",
    severity: "error",
  },
  STORAGE_BLOCKED: {
    title: "Pengaturan tidak tersimpan otomatis",
    body: "Browser memblokir penyimpanan lokal, misalnya di mode privat.",
    action: "Klik Ekspor pengaturan sebelum menutup halaman supaya pekerjaanmu tidak hilang.",
    severity: "warning",
  },
  STORAGE_CORRUPT: {
    title: "Pengaturan lama tidak terbaca",
    body: "Data yang tersimpan di browser rusak, jadi lazycustom memakai tema awal.",
    action: "Atur ulang dari awal, atau impor file cadangan kalau kamu punya.",
    severity: "warning",
  },
  URL_INVALID: {
    title: "Link YouTube tidak dikenali",
    body: "Kami tidak menemukan ID video di link itu.",
    action: "Salin link dari address bar saat halaman live terbuka, contoh: youtube.com/watch?v=...",
    severity: "error",
  },
  SHARE_INVALID: {
    title: "Link Share tidak bisa dibuka",
    body: "Link ini rusak, terpotong, atau bukan berasal dari lazycustom.",
    action: "Minta pengirimnya membuat link Share baru, lalu salin utuh dari awal sampai akhir.",
    severity: "error",
  },
  SHARE_TOO_LARGE: {
    title: "Link Share terlalu besar",
    body: "Isi link ini melebihi batas yang aman untuk dibuka.",
    action: "Minta pengirimnya membuat link Share baru, atau kirim file desain lewat Export file.",
    severity: "error",
  },
  SHARE_FAILED: {
    title: "Link Share belum terbuat",
    body: "Desainmu tidak bisa diubah menjadi link di browser ini.",
    action: "Pakai Export file untuk berbagi desain, lalu kirim file .json-nya.",
    severity: "error",
  },
  DESIGN_LIMIT: {
    title: "Batas desain tercapai",
    body: "My Designs menampung maksimal 20 desain di browser ini.",
    action: "Hapus desain yang tidak dipakai, lalu coba lagi.",
    severity: "warning",
  },
  PREVIEW_FAILED: {
    title: "Preview belum tampil",
    body: "Bagian preview mengalami masalah, tapi CSS-mu tetap bisa disalin.",
    action: "Klik Putar ulang. Kalau masih gagal, muat ulang halaman.",
    severity: "warning",
  },
  RENDER_FAILED: {
    title: "Ada bagian yang gagal tampil",
    body: "Halaman mengalami masalah tak terduga.",
    action: "Muat ulang halaman. Sebutkan kode laporan di bawah kalau kamu melapor ke pengembang.",
    severity: "error",
  },
  PAGE_NOT_FOUND: {
    title: "Halaman tidak ditemukan",
    body: "Alamat ini tidak ada di lazycustom.",
    action: "Kembali ke editor.",
    severity: "error",
  },
  UNKNOWN: {
    title: "Terjadi masalah",
    body: "Ada yang tidak berjalan sesuai rencana.",
    action: "Coba lagi. Sebutkan kode laporan di bawah kalau masalahnya berulang.",
    severity: "error",
  },
};

export function errorInfo(code: ErrorCode): ErrorInfo {
  return ERROR_CATALOG[code] ?? ERROR_CATALOG.UNKNOWN;
}

/** Bentuk kode yang boleh masuk ke log. Dipakai juga untuk validasi di server. */
export const ERROR_CODE_RE = /^[A-Z_]{3,32}$/;
