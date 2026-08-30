"use client";

import ErrorState from "./components/ErrorState";

/**
 * The boundary of last resort: a failure in the root layout itself, which
 * `app/[locale]/error.tsx` sits inside and therefore cannot catch. It replaces
 * the whole document, so it has to supply its own `<html>` and `<body>`.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#faf7f1", color: "#40322a" }}>
        <ErrorState error={error} reset={reset} />
      </body>
    </html>
  );
}
