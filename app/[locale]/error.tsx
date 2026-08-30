"use client";

import ErrorState from "../components/ErrorState";

/**
 * Catches a failed render of any page under `/:locale`, keeping the failure
 * inside the page area — the layout, and so the header and footer, survive.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} />;
}
