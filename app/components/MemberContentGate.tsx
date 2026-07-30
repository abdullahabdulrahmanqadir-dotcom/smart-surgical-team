"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import type { ContentRecord } from "../lib/content";
import ContentPlayer from "./ContentPlayer";
import { CASE_SUMMARY_FIELDS } from "../lib/content";

export default function MemberContentGate({ identifier, locale }: { identifier: string; locale: string }) {
  const [content, setContent] = useState<ContentRecord | null>(null);
  const [state, setState] = useState<"loading" | "signed_out" | "error" | "ready">("loading");
  useEffect(() => { void (async () => { try { const { data } = await getSupabaseBrowserClient().auth.getSession(); if (!data.session) { setState("signed_out"); return; } const response = await fetch(`/api/library/${identifier}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setContent(result.data); setState("ready"); } catch { setState("error"); } })(); }, [identifier]);
  if (state !== "ready" || !content) return <section className="member-content-gate"><span className="content-kicker">Members-only learning</span><h1>This item is for site users.</h1><p>{state === "loading" ? "Checking your access…" : state === "signed_out" ? "Sign in or create a free account to view this case article and its teaching material." : "We could not confirm your access. Please sign in again."}</p>{state !== "loading" && <Link className="btn btn-primary" href={`/${locale}/sign-in`}>Sign in to continue</Link>}</section>;
  return <div className="member-content"><div className="content-heading"><div><span className="content-kicker">Members-only · {content.kind.replace(/_/g, " ")}</span><h1>{content.title}</h1><p>{content.summary}</p></div></div><ContentPlayer content={content}/>{content.bodyHtml && <section className="member-rich-content" dangerouslySetInnerHTML={{ __html: content.bodyHtml }} />}{content.media?.filter((item) => item.kind === "image").map((item) => <figure className="member-content-image" key={item.id}><img src={item.publicUrl} alt={item.altText ?? ""}/>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}<section className="case-summary-panel"><div className="section-mini-head"><div><span className="section-kicker">Clinical record</span><h2>Case summary</h2></div></div><dl className="case-summary-list">{CASE_SUMMARY_FIELDS.map(({ key, label }) => content.caseSummary?.[key] ? <div key={key}><dt>{label}</dt><dd>{content.caseSummary[key]}</dd></div> : null)}</dl></section></div>;
}
