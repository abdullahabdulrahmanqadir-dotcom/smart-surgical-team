"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { READY_REPLIES, readyReplyText, whatsappOpening } from "../lib/patient-question-replies";
import { isOverdue, QUESTION_LIMITS, REPLY_WITHIN_WORKING_DAYS, whatsappLink, workingDaysSince, type QuestionStatus } from "../lib/patient-questions";
import { IconCheck, IconMail, IconSearch, IconWhatsApp } from "./icons";
import "./admin-questions.css";

/**
 * Admin → Questions: the patient-question inbox (Owner and Contributors only;
 * the API refuses everyone else, this screen just isn't offered to them).
 *
 * Self-contained: it loads and writes through /api/admin/questions and keeps
 * its own state, so the shared workspace only has to mount it. Drafts are kept
 * per question while the tab is open, so switching between questions never
 * loses a half-written answer.
 */

type Question = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  reply_via: "email" | "whatsapp";
  topic: string | null;
  question: string;
  locale: "en" | "ar";
  status: QuestionStatus;
  email_confirmed_at: string | null;
  answer: string | null;
  answered_at: string | null;
  answered_via: "email" | "whatsapp" | null;
  internal_note: string | null;
  created_at: string;
  answerer?: { full_name: string | null } | null;
};

type Filter = "waiting" | "overdue" | "answered" | "closed" | "spam" | "all";
type Draft = { answer: string; note: string };
type Notice = { text: string; tone: "ok" | "warn" } | null;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "waiting", label: "Waiting" },
  { id: "overdue", label: "Overdue" },
  { id: "answered", label: "Answered" },
  { id: "closed", label: "Closed" },
  { id: "spam", label: "Spam" },
  { id: "all", label: "All" },
];

const TOPIC_LABEL: Record<string, string> = { thyroid: "Thyroid", parathyroid: "Parathyroid", breast: "Breast", other: "Other" };
const LANGUAGE_LABEL = { en: "English form", ar: "Arabic form" } as const;

function matches(filter: Filter, row: Question, now: Date) {
  switch (filter) {
    case "waiting": return row.status === "new";
    case "overdue": return isOverdue(row.status, new Date(row.created_at), now);
    case "all": return true;
    default: return row.status === filter;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function waitingLabel(createdAt: string, now: Date) {
  const days = workingDaysSince(new Date(createdAt), now);
  return days === 0 ? "Today" : days === 1 ? "1 working day" : `${days} working days`;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown>; } catch { return {}; }
}

export default function AdminQuestions({ authHeaders }: { authHeaders: () => Promise<Record<string, string>> }) {
  const [rows, setRows] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("waiting");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState<"answer" | "phone" | null>(null);
  const [now, setNow] = useState(() => new Date());
  const detailHeading = useRef<HTMLHeadingElement>(null);
  // The workspace re-creates its header helper on every render; holding it in
  // a ref keeps `load` stable, so the inbox loads once instead of in a loop.
  const headersRef = useRef(authHeaders);
  useEffect(() => { headersRef.current = authHeaders; }, [authHeaders]);
  const authHeadersNow = () => headersRef.current();

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const response = await fetch("/api/admin/questions", { headers: await headersRef.current() });
      const result = await readJson(response);
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not load the questions.");
      setRows(Array.isArray(result.data) ? result.data as Question[] : []);
      setNow(new Date());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load the questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(({ id }) => [id, rows.filter((row) => matches(id, row, now)).length])) as Record<Filter, number>, [rows, now]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((row) => matches(filter, row, now))
      .filter((row) => !needle || [row.name, row.phone, row.email ?? "", row.question].some((value) => value.toLowerCase().includes(needle)))
      // Waiting questions are answered oldest first; everything else reads newest first.
      .sort((a, b) => (filter === "waiting" || filter === "overdue" ? 1 : -1) * a.created_at.localeCompare(b.created_at));
  }, [rows, filter, search, now]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const draft: Draft = selected ? drafts[selected.id] ?? { answer: selected.answer ?? "", note: selected.internal_note ?? "" } : { answer: "", note: "" };

  function select(id: string) {
    setSelectedId(id);
    setNotice(null);
    setConfirmingDelete(false);
    setCopied(null);
    window.requestAnimationFrame(() => detailHeading.current?.focus());
  }

  function setDraft(patch: Partial<Draft>) {
    if (!selected) return;
    setDrafts((current) => ({ ...current, [selected.id]: { ...draft, ...patch } }));
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setBusy(action); setNotice(null);
    try {
      const response = await fetch("/api/admin/questions", {
        method: "POST",
        headers: await authHeadersNow(),
        body: JSON.stringify({ id: selected.id, action, answer: draft.answer, internal_note: draft.note, ...extra }),
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "That did not work. Please try again.");
      const warning = typeof result.warning === "string" ? result.warning : "";
      setNotice({ text: warning || String(result.message ?? "Done."), tone: warning ? "warn" : "ok" });
      // The stored row is now the truth; drop the local draft so it reloads from it.
      setDrafts((current) => { const next = { ...current }; delete next[selected.id]; return next; });
      await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "That did not work. Please try again.", tone: "warn" });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!selected) return;
    setBusy("delete"); setNotice(null);
    try {
      const response = await fetch(`/api/admin/questions?id=${encodeURIComponent(selected.id)}`, { method: "DELETE", headers: await authHeadersNow() });
      const result = await readJson(response);
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not delete this question.");
      setSelectedId(null);
      setNotice({ text: String(result.message ?? "Deleted."), tone: "ok" });
      await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Could not delete this question.", tone: "warn" });
    } finally {
      setBusy(null); setConfirmingDelete(false);
    }
  }

  async function copy(kind: "answer" | "phone", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => current === kind ? null : current), 2500);
    } catch {
      setNotice({ text: "The browser blocked copying. Select the text and copy it by hand.", tone: "warn" });
    }
  }

  function insertReply(text: string) {
    const current = draft.answer.trim();
    setDraft({ answer: current ? `${current}\n\n${text}` : text });
  }

  if (loading) return <div className="admin-loading">Loading questions...</div>;

  return (
    <div className="aq">
      <p className="aq-privacy">
        Patients&apos; health questions. Only the Owner and Contributors can open this inbox. Answers are general
        information; anything about a patient&apos;s own case gets a &ldquo;please book a visit&rdquo; reply.
        We aim to reply within {REPLY_WITHIN_WORKING_DAYS} working days.
      </p>

      {loadError && <p className="admin-notice is-warning" role="alert"><b aria-hidden="true">!</b>{loadError}</p>}

      <div className="aq-controls">
        <div className="aq-filters" role="tablist" aria-label="Filter questions">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id} type="button" role="tab" aria-selected={filter === id}
              className={`${filter === id ? "is-active" : ""}${id === "overdue" && counts.overdue > 0 ? " is-alert" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}<span>{counts[id]}</span>
            </button>
          ))}
        </div>
        <label className="aq-search">
          <IconSearch size={17} />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone or text" aria-label="Search questions" />
        </label>
      </div>

      <div className="aq-layout">
        <ul className="aq-list" aria-label="Questions">
          {visible.length === 0 && <li className="aq-empty">{rows.length === 0 ? "No questions yet." : "Nothing here."}</li>}
          {visible.map((row) => {
            const overdue = isOverdue(row.status, new Date(row.created_at), now);
            return (
              <li key={row.id}>
                <button type="button" className={`aq-row${row.id === selectedId ? " is-selected" : ""}`} aria-current={row.id === selectedId} onClick={() => select(row.id)}>
                  <span className="aq-row-head">
                    <b>{row.name}</b>
                    <span className="aq-row-channel" title={row.reply_via === "email" ? "Prefers email" : "Prefers WhatsApp"}>
                      {row.reply_via === "email" ? <IconMail size={15} /> : <IconWhatsApp size={15} />}
                    </span>
                  </span>
                  <span className="aq-row-text" dir="auto">{row.question}</span>
                  <span className="aq-row-meta">
                    <span className={`admin-status is-q-${row.status}`}>{row.status === "new" ? "waiting" : row.status}</span>
                    {overdue && <span className="admin-status is-q-overdue">overdue</span>}
                    {row.topic && <span>{TOPIC_LABEL[row.topic] ?? row.topic}</span>}
                    <span>{row.status === "new" ? waitingLabel(row.created_at, now) : formatDate(row.created_at)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <section className="aq-detail" aria-label="Selected question">
          {!selected ? (
            <div className="aq-placeholder">
              <IconMail size={26} />
              <p>Choose a question to read and answer it.</p>
            </div>
          ) : (
            <>
              <header className="aq-detail-head">
                <div>
                  <h2 ref={detailHeading} tabIndex={-1}>{selected.name}</h2>
                  <p>
                    Received {formatDate(selected.created_at)} · {LANGUAGE_LABEL[selected.locale]}
                    {selected.topic ? ` · ${TOPIC_LABEL[selected.topic] ?? selected.topic}` : ""}
                  </p>
                </div>
                <span className={`admin-status is-q-${selected.status}`}>{selected.status === "new" ? "waiting" : selected.status}</span>
              </header>

              {notice && <p className={notice.tone === "warn" ? "admin-notice is-warning" : "admin-notice"} role="status">{notice.tone === "warn" ? <b aria-hidden="true">!</b> : <IconCheck size={17} />}{notice.text}</p>}

              <dl className="aq-contact">
                <div>
                  <dt>Phone (WhatsApp)</dt>
                  <dd><a href={`tel:${selected.phone}`} dir="ltr">{selected.phone}</a><button type="button" className="aq-link" onClick={() => copy("phone", selected.phone)}>{copied === "phone" ? "Copied" : "Copy"}</button></dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    {selected.email ? <><span dir="ltr">{selected.email}</span>{selected.email_confirmed_at ? <span className="aq-badge is-ok"><IconCheck size={13} />Confirmed</span> : <span className="aq-badge">Not confirmed</span>}</> : <span className="aq-muted">None given</span>}
                  </dd>
                </div>
                <div>
                  <dt>Wants the reply by</dt>
                  <dd>{selected.reply_via === "email" ? "Email" : "WhatsApp"}</dd>
                </div>
              </dl>

              <div className="aq-question">
                <h3>Question</h3>
                <p dir="auto">{selected.question}</p>
              </div>

              {selected.status === "answered" ? (
                <div className="aq-answered">
                  <h3>Answer sent</h3>
                  <p className="aq-muted">
                    By {selected.answerer?.full_name || "a team member"} on {selected.answered_at ? formatDate(selected.answered_at) : "an unknown date"} via {selected.answered_via === "email" ? "email" : "WhatsApp"}.
                  </p>
                  <p dir="auto" className="aq-answer-text">{selected.answer}</p>
                  {selected.internal_note && <p className="aq-note"><b>Internal note:</b> {selected.internal_note}</p>}
                  <div className="aq-actions">
                    <button type="button" className="btn btn-outline" disabled={busy !== null} onClick={() => act("set-status", { status: "new" })}>Reopen</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="aq-compose">
                    <div className="aq-compose-head">
                      <label htmlFor="aq-answer">Answer</label>
                      <span className="aq-muted">Write in {selected.locale === "ar" ? "Arabic (or Kurdish, if they wrote in Kurdish)" : "English (or the language they wrote in)"} · {draft.answer.length}/{QUESTION_LIMITS.answerMax}</span>
                    </div>
                    <div className="aq-replies" aria-label="Ready-made replies">
                      {READY_REPLIES.map((reply) => (
                        <button key={reply.id} type="button" onClick={() => insertReply(readyReplyText(reply, selected.locale, window.location.origin))}>+ {reply.label}</button>
                      ))}
                    </div>
                    <textarea id="aq-answer" dir="auto" rows={8} maxLength={QUESTION_LIMITS.answerMax} value={draft.answer} onChange={(event) => setDraft({ answer: event.target.value })} placeholder="General information only. For anything about their own case, ask them to book a visit." />
                  </div>

                  <div className="aq-channels">
                    <div className={`aq-channel${selected.reply_via === "email" ? " is-preferred" : ""}`}>
                      <h3><IconMail size={17} />Email{selected.reply_via === "email" && <small>preferred</small>}</h3>
                      {!selected.email ? <p className="aq-muted">No email address was given.</p>
                        : !selected.email_confirmed_at ? <p className="aq-muted">Waiting for the patient to confirm {selected.email}. Nothing can be sent until they do.</p>
                          : <p className="aq-muted">Sends the answer to {selected.email}, with their question and the &ldquo;general information&rdquo; notice.</p>}
                      <button type="button" className="btn btn-primary" disabled={busy !== null || !selected.email_confirmed_at || !draft.answer.trim() || selected.status === "spam"} onClick={() => act("send-email")}>
                        {busy === "send-email" ? "Sending..." : "Send answer by email"}
                      </button>
                    </div>

                    <div className={`aq-channel${selected.reply_via === "whatsapp" ? " is-preferred" : ""}`}>
                      <h3><IconWhatsApp size={17} />WhatsApp{selected.reply_via === "whatsapp" && <small>preferred</small>}</h3>
                      <ol className="aq-steps">
                        <li><a className="aq-link" href={whatsappLink(selected.phone, whatsappOpening(selected.locale, selected.name))} target="_blank" rel="noreferrer">Open the chat</a> and ask whether they sent the question. Wait for a yes.</li>
                        <li><button type="button" className="aq-link" disabled={!draft.answer.trim()} onClick={() => copy("answer", draft.answer)}>{copied === "answer" ? "Answer copied" : "Copy the answer"}</button> and send it from the team phone.</li>
                        <li>Then record it here.</li>
                      </ol>
                      <button type="button" className="btn btn-outline" disabled={busy !== null || !draft.answer.trim() || selected.status === "spam"} onClick={() => act("mark-whatsapp")}>
                        {busy === "mark-whatsapp" ? "Saving..." : "Mark answered on WhatsApp"}
                      </button>
                    </div>
                  </div>

                  <label className="aq-note-field" htmlFor="aq-note">
                    Internal note <span className="aq-muted">(never sent to the patient)</span>
                  </label>
                  <textarea id="aq-note" className="aq-note-input" rows={2} maxLength={QUESTION_LIMITS.noteMax} value={draft.note} onChange={(event) => setDraft({ note: event.target.value })} />

                  <div className="aq-actions">
                    <button type="button" className="btn btn-outline" disabled={busy !== null} onClick={() => act("save")}>{busy === "save" ? "Saving..." : "Save draft"}</button>
                    {selected.status === "new" && <button type="button" className="aq-link" disabled={busy !== null} onClick={() => act("set-status", { status: "closed" })}>Close without answer</button>}
                    {selected.status !== "spam"
                      ? <button type="button" className="aq-link" disabled={busy !== null} onClick={() => act("set-status", { status: "spam" })}>Mark as spam</button>
                      : <button type="button" className="aq-link" disabled={busy !== null} onClick={() => act("set-status", { status: "new" })}>Not spam — reopen</button>}
                    {selected.status === "closed" && <button type="button" className="aq-link" disabled={busy !== null} onClick={() => act("set-status", { status: "new" })}>Reopen</button>}
                  </div>
                </>
              )}

              <div className="aq-danger">
                <button
                  type="button"
                  className={`aq-link is-danger${confirmingDelete ? " is-confirming" : ""}`}
                  disabled={busy !== null}
                  onClick={() => (confirmingDelete ? void remove() : setConfirmingDelete(true))}
                  onBlur={() => setConfirmingDelete(false)}
                >
                  {confirmingDelete ? "Delete permanently? This cannot be undone." : "Delete question"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
