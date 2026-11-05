/** Kunci sessionStorage: intro halaman utama sudah diputar di sesi ini. */
export const INTRO_KEY = "lc-intro-seen";

/**
 * Dijalankan sebelum halaman tampil (app/page.tsx): tandai <html> bila intro perlu diputar, supaya lapisan
 * intro sudah menutup halaman sejak frame pertama tanpa kedip. Sekali per sesi, tidak untuk gerak minimal.
 * File biasa (bukan "use client") karena nilainya dibaca server component.
 */
export const INTRO_BOOT = `(function(){try{if(sessionStorage.getItem('${INTRO_KEY}'))return;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.documentElement.classList.add('intro-pending')}catch(e){}})()`;
