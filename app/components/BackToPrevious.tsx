"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function BackToPrevious({ fallback, children }: { fallback: string; children: ReactNode }) {
  const router = useRouter();
  return <button type="button" className="content-breadcrumb-back" onClick={() => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }}>{children}</button>;
}
