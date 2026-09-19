"use client";

import { useEffect, useState } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { Logo } from "@/components/Logo";
import { newRef } from "@/lib/ref";
import { report } from "@/lib/report";

/** Error boundary untuk seluruh halaman. User melihat pesan ramah, developer mendapat detailnya di log. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [ref] = useState(() => newRef());

  useEffect(() => {
    report({
      code: "RENDER_FAILED",
      error,
      ref,
      context: error.digest ? { digest: error.digest } : undefined,
    });
  }, [error, ref]);

  return (
    <main className="mx-auto grid min-h-[100dvh] w-full max-w-xl content-center gap-6 px-4 py-10">
      <Logo />
      <ErrorNotice code="RENDER_FAILED" refId={ref}>
        <button
          type="button"
          onClick={reset}
          className="mt-2 w-fit rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent transition active:scale-95"
        >
          Coba lagi
        </button>
      </ErrorNotice>
    </main>
  );
}
