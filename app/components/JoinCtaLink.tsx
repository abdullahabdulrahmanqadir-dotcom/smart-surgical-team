"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { localePath, type Locale } from "../lib/i18n";
import { IconArrowRight } from "./icons";

export default function JoinCtaLink({ locale }: { locale: Locale }) {
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
      {signedIn ? "Open your profile" : "Create free account"}
      <IconArrowRight size={18} />
    </Link>
  );
}
