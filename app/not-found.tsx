import Link from "next/link";
import { ErrorNotice } from "@/components/ErrorNotice";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[100dvh] w-full max-w-xl content-center gap-6 px-4 py-10">
      <Logo />
      <ErrorNotice code="PAGE_NOT_FOUND">
        <Link
          href="/"
          className="mt-2 w-fit rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent transition active:scale-95"
        >
          Kembali ke editor
        </Link>
      </ErrorNotice>
    </main>
  );
}
