"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import type { ContentRecord } from "../lib/content";
import ContentPlayer from "./ContentPlayer";
import { CASE_SUMMARY_FIELDS } from "../lib/content";

function responseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function MemberContentGate({ identifier, locale }: { identifier: string; locale: string }) {
  const [content, setContent] = useState<ContentRecord | null>(null);
  const [state, setState] = useState<"loading" | "signed_out" | "error" | "ready">("loading");

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await getSupabaseBrowserClient().auth.getSession();
        if (!data.session) { setState("signed_out"); return; }
        const response = await fetch(`/api/library/${identifier}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const result = responseRecord(await response.json());
        if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Unable to load this item.");
        if (!result.data || typeof result.data !== "object" || Array.isArray(result.data)) throw new Error("The library returned an invalid item.");
        setContent(result.data as ContentRecord);
        setState("ready");
      } catch { setState("error"); }
    })();
  }, [identifier]);

  if (state !== "ready" || !content) return <section className="member-content-gate"><span className="content-kicker">Members-only learning</span><h1>This item is for site users.</h1><p>{state === "loading" ? "Checking your access…" : state === "signed_out" ? "Sign in or create a free account to view this case article and its teaching material." : "We could not confirm your access. Please sign in again."}</p>{state !== "loading" && <Link className="btn btn-primary" href={`/${locale}/sign-in`}>Sign in to continue</Link>}</section>;

  const documents = content.media?.filter((item) => item.kind === "document") ?? [];
  return <div className="member-content"><div className="content-heading"><div><span className="content-kicker">Members-only · {content.kind.replace(/_/g, " ")}</span><h1>{content.title}</h1><p>{content.summary}</p></div></div><ContentPlayer content={content}/>{content.bodyHtml && <section className="member-rich-content" dangerouslySetInnerHTML={{ __html: content.bodyHtml }} />}{content.media?.filter((item) => item.kind === "image").map((item) => <figure className="member-content-image" key={item.id}><img src={item.publicUrl} alt={item.altText ?? ""}/>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}{documents.length ? <section className="content-downloads"><div className="section-mini-head"><div><span className="section-kicker">Resources</span><h2>Downloads</h2></div></div><ul>{documents.map((item) => <li key={item.id}><a href={item.publicUrl} target="_blank" rel="noreferrer">{item.caption || item.altText || "Download document"}</a></li>)}</ul></section> : null}<section className="case-summary-panel"><div className="section-mini-head"><div><span className="section-kicker">Clinical record</span><h2>Case summary</h2></div></div><dl className="case-summary-list">{CASE_SUMMARY_FIELDS.map(({ key, label }) => content.caseSummary?.[key] ? <div key={key}><dt>{label}</dt><dd dangerouslySetInnerHTML={{ __html: content.caseSummary[key] }} /></div> : null)}</dl></section></div>;
}
