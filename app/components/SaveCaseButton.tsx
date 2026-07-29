"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconCheck } from "./icons";

type SavedCase = {
  slug: string;
  title: string;
  summary: string;
  topic: string;
  format: string;
  duration: string;
};

function savedCasesFrom(value: unknown): SavedCase[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (!["slug", "title", "summary", "topic", "format", "duration"].every((key) => typeof candidate[key] === "string")) return [];
    return [{ slug: candidate.slug as string, title: candidate.title as string, summary: candidate.summary as string, topic: candidate.topic as string, format: candidate.format as string, duration: candidate.duration as string }];
  });
}

export default function SaveCaseButton({ locale, item }: { locale: string; item: SavedCase }) {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    try {
      const client = getSupabaseBrowserClient();
      client.auth.getUser().then(({ data }) => {
        if (!active) return;
        setIsSaved(savedCasesFrom(data.user?.user_metadata.saved_cases).some((savedCase) => savedCase.slug === item.slug));
      }).catch(() => { /* the click handler will surface a configuration or network error */ });
    } catch {
      /* The click handler will surface a configuration or network error. */
    }
    return () => { active = false; };
  }, [item.slug]);

  async function saveCase() {
    if (isSaved || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const client = getSupabaseBrowserClient();
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        window.location.assign(`/${locale}/sign-in`);
        return;
      }
      const savedCases = savedCasesFrom(user.user_metadata.saved_cases);
      const nextSavedCases = savedCases.some((savedCase) => savedCase.slug === item.slug) ? savedCases : [...savedCases, item];
      const { error } = await client.auth.updateUser({ data: { saved_cases: nextSavedCases } });
      if (error) throw error;
      setIsSaved(true);
      window.dispatchEvent(new CustomEvent("sst-saved-cases-changed", { detail: nextSavedCases }));
    } catch {
      setMessage("We couldn’t save this case. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="save-case-control"><button className={`save-button${isSaved ? " is-saved" : ""}`} type="button" onClick={saveCase} disabled={saving || isSaved} aria-live="polite"><span>{isSaved ? <IconCheck size={18} /> : "+"}</span>{saving ? "Saving…" : isSaved ? "Saved to profile" : "Save for later"}</button>{message && <p role="alert">{message}</p>}</div>;
}
