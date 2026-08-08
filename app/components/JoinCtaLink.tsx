"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { localePath, type Locale } from "../lib/i18n";
import { IconArrowRight } from "./icons";
import type { Dictionary } from "../lib/dictionaries";

export default function JoinCtaLink({ locale, t }: { locale: Locale; t: Dictionary["joinCta"] }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const client = getSupabaseBrowserClient();
      client.auth.getUser().then(({ data }) => {
        if (active) setSignedIn(Boolean(data.user));
      });
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (active) setSignedIn(Boolean(session?.user));
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // Public browsing still works when Supabase credentials are not configured.
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <Link className="btn btn-primary btn-lg cta-signup-link" href={localePath(locale, signedIn ? "profile" : "sign-up")}>
      {signedIn ? t.profile : t.createAccount}
      <IconArrowRight size={18} />
    </Link>
  );
}
