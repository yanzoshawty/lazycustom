"use client";

import { useEffect, useState } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { newRef } from "@/lib/ref";
import { report } from "@/lib/report";
import "./globals.css";

/** Cadangan terakhir kalau layout utama sendiri gagal dimuat. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const [ref] = useState(() => newRef());

  useEffect(() => {
    report({
      code: "RENDER_FAILED",
      error,
      ref,
      context: error.digest ? { digest: error.digest, scope: "global" } : { scope: "global" },
    });
  }, [error, ref]);

  return (
    <html lang="id">
      <body>
        <main className="mx-auto grid min-h-[100dvh] w-full max-w-xl content-center gap-6 px-4 py-10">
          <ErrorNotice code="RENDER_FAILED" refId={ref}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 w-fit rounded-full bg-accent px-5 py-2 text-sm font-semibold text-on-accent"
            >
              Muat ulang halaman
            </button>
          </ErrorNotice>
        </main>
      </body>
    </html>
  );
}
