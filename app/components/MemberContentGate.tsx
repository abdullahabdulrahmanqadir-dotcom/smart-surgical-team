"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
// From `content-types`, not `content`: this is a client component, and
// `content` pulls in `next/cache`, which has no browser equivalent.
import { resolveCaseSections, type ContentRecord } from "../lib/content-types";
import ContentPlayer from "./ContentPlayer";
import type { Dictionary } from "../lib/dictionaries";

function responseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function MemberContentGate({ identifier, locale, t, mediaT, caseSummaryT }: { identifier: string; locale: string; t: Dictionary["memberContent"]; mediaT: Dictionary["media"]; caseSummaryT: Dictionary["caseSummary"] }) {
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

  if (state !== "ready" || !content) return <section className="member-content-gate"><span className="content-kicker">{t.membersOnlyLearning}</span><h1>{t.usersOnlyTitle}</h1><p>{state === "loading" ? t.checkingAccess : state === "signed_out" ? t.signInPrompt : t.accessError}</p>{state !== "loading" && <Link className="btn btn-primary" href={`/${locale}/sign-in`}>{t.signInContinue}</Link>}</section>;

  const documents = content.media?.filter((item) => item.kind === "document") ?? [];
  const kindLabel = content.kind === "webinar_recording" ? t.webinarRecording : content.kind === "case_article" ? t.caseArticle : content.kind === "poster" ? t.poster : t.video;
  return <div className="member-content"><div className="content-heading"><div><span className="content-kicker">{t.membersOnly} · {kindLabel}</span><h1>{content.title}</h1><p>{content.summary}</p></div></div><ContentPlayer content={content} t={mediaT}/>{content.media?.filter((item) => item.kind === "image").map((item) => <figure className="member-content-image" key={item.id}><img src={item.publicUrl} alt={item.altText ?? ""}/>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}{documents.length ? <section className="content-downloads"><div className="section-mini-head"><div><span className="section-kicker">{t.resources}</span><h2>{t.downloads}</h2></div></div><ul>{documents.map((item) => <li key={item.id}><a href={item.publicUrl} target="_blank" rel="noreferrer">{item.caption || item.altText || t.downloadDocument}</a></li>)}</ul></section> : null}<section className="case-summary-panel"><div className="section-mini-head"><div><span className="section-kicker">{t.clinicalRecord}</span><h2>{t.caseSummary}</h2></div></div><dl className="case-summary-list">{resolveCaseSections(content, caseSummaryT).map(({ key, label, body }) => <div key={key}><dt>{label}</dt><dd dangerouslySetInnerHTML={{ __html: body }} /></div>)}</dl></section></div>;
}
