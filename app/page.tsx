import { preload } from "react-dom";
import { INTRO_BOOT } from "@/components/landing/intro-boot";
import { Landing } from "@/components/landing/Landing";

// Link Share lama dibuat saat editor masih di "/": teruskan ke /editor sebelum halaman tampil, hash ikut terbawa.
const shareRedirect = `(function(){if(location.hash.indexOf('#d=')===0)location.replace('/editor'+location.search+location.hash)})()`;

export default function Home() {
  // Foto di balik preview hero adalah elemen terbesar di layar pertama: minta sejak <head>.
  preload("/backdrop-gameplay.webp", { as: "image", type: "image/webp" });
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: shareRedirect }} />
      <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
      <Landing />
    </>
  );
}
