import { Landing } from "@/components/landing/Landing";

// Link Share lama dibuat saat editor masih di "/": teruskan ke /editor sebelum halaman tampil, hash ikut terbawa.
const shareRedirect = `(function(){if(location.hash.indexOf('#d=')===0)location.replace('/editor'+location.search+location.hash)})()`;

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: shareRedirect }} />
      <Landing />
    </>
  );
}
