"use client";

import { useParams } from "next/navigation";
import { isLocale, type Locale } from "../lib/i18n";

export default function LocalizedLoadingStatus({
  labels,
  className,
  children,
}: {
  labels: Record<Locale, string>;
  className?: string;
  children: React.ReactNode;
}) {
  const params = useParams<{ locale?: string }>();
  const locale: Locale = isLocale(params?.locale ?? "") ? params.locale as Locale : "en";

  return (
    <main id="main-content" className={className} role="status" aria-label={labels[locale]}>
      {children}
    </main>
  );
}
