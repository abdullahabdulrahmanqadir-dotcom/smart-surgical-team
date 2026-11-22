"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MDT_LIMITS, mdtReplyMailto, teamAlertMissing, type MdtInterest, type MdtRole, type MdtStatus } from "../lib/mdt-inquiries";
import { IconCheck, IconMail, IconSearch, IconUsers } from "./icons";
import "./admin-questions.css";

/**
 * Admin → Inbox → MDT inquiries (Owner and Contributors only; the API refuses
 * everyone else). Replies are written in the team's own mail app through a
 * pre-filled mailto: link; this screen records that contact was made.
 * Shares the patient-question inbox's layout and styles.
 */

type Inquiry = {
  id: string;
  name: string;
  role: MdtRole;
  institution: string;
  country: string;
  email: string;
  phone: string | null;
  interest: MdtInterest;
  message: string;
  locale: "en" | "ar";
  status: MdtStatus;
  contacted_at: string | null;
  internal_note: string | null;
  team_alerted_at: string | null;
  created_at: string;
  contacter?: { full_name: string | null } | null;
};

type Filter = "new" | "contacted" | "closed" | "wrong_form" | "spam" | "all";
type Notice = { text: string; tone: "ok" | "warn" } | null;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "closed", label: "Closed" },
  { id: "wrong_form", label: "Wrong form" },
  { id: "spam", label: "Spam" },
  { id: "all", label: "All" },
];

const STATUS_LABEL: Record<MdtStatus, string> = { new: "new", contacted: "contacted", closed: "closed", spam: "spam", wrong_form: "wrong form" };

const ROLE_LABEL: Record<MdtRole, string> = {
  surgeon: "Surgeon",
  endocrinologist: "Endocrinologist",
  oncologist: "Oncologist",
  radiologist: "Radiologist",
  pathologist: "Pathologist",
  nuclear_medicine: "Nuclear medicine",
  other_doctor: "Other doctor",
  institution: "Representing an institute",
  other: "Other",
};

const INTEREST_LABEL: Record<MdtInterest, string> = {
  present_case: "Presenting a case",
  attend: "Attending regularly",
  observe: "Observing",
  collaborate: "Institutional collaboration",
  other: "Something else",
};

const LANGUAGE_LABEL = { en: "English form", ar: "Arabic form" } as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown>; } catch { return {}; }
}

export default function AdminMdtInquiries({ authHeaders, onCountChange }: {
  authHeaders: () => Promise<Record<string, string>>;
  onCountChange?: (waiting: number) => void;
}) {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("new");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const headersRef = useRef(authHeaders);
  useEffect(() => { headersRef.current = authHeaders; }, [authHeaders]);
  const countRef = useRef(onCountChange);
  useEffect(() => { countRef.current = onCountChange; }, [onCountChange]);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const response = await fetch("/api/admin/mdt", { headers: await headersRef.current() });
      const result = await readJson(response);
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not load the MDT inquiries.");
      const data = Array.isArray(result.data) ? result.data as Inquiry[] : [];
      setRows(data);
      setNow(new Date());
      countRef.current?.(data.filter((row) => row.status === "new").length);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load the MDT inquiries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(({ id }) => [id, id === "all" ? rows.length : rows.filter((row) => row.status === id).length])) as Record<Filter, number>, [rows]);
  const alertFailures = useMemo(() => rows.filter((row) => teamAlertMissing(row.team_alerted_at, row.created_at, now)).length, [rows, now]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((row) => filter === "all" || row.status === filter)
      .filter((row) => !needle || [row.name, row.institution, row.country, row.email, row.message].some((value) => value.toLowerCase().includes(needle)))
      // New inquiries are handled oldest first; everything else reads newest first.
      .sort((a, b) => (filter === "new" ? 1 : -1) * a.created_at.localeCompare(b.created_at));
  }, [rows, filter, search]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const note = selected ? notes[selected.id] ?? selected.internal_note ?? "" : "";

  function select(id: string) {
    setSelectedId(id);
    setNotice(null);
    setConfirmingDelete(false);
    window.requestAnimationFrame(() => detailHeading.current?.focus());
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setBusy(action); setNotice(null);
    try {
      const response = await fetch("/api/admin/mdt", {
        method: "POST",
        headers: await headersRef.current(),
        body: JSON.stringify({ id: selected.id, action, internal_note: note, ...extra }),
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "That did not work. Please try again.");
      setNotice({ text: String(result.message ?? "Done."), tone: "ok" });
      setNotes((current) => { const next = { ...current }; delete next[selected.id]; return next; });
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
      const response = await fetch(`/api/admin/mdt?id=${encodeURIComponent(selected.id)}`, { method: "DELETE", headers: await headersRef.current() });
      const result = await readJson(response);
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not delete this inquiry.");
      setSelectedId(null);
      setNotice({ text: String(result.message ?? "Deleted."), tone: "ok" });
      await load();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Could not delete this inquiry.", tone: "warn" });
    } finally {
      setBusy(null); setConfirmingDelete(false);
    }
  }

  if (loading) return <div className="admin-loading">Loading MDT inquiries...</div>;

  return (
    <div className="aq">
      <p className="aq-privacy">
        Outside doctors, teams and institutes asking to take part in the MDT. Reply from the team mailbox with
        &ldquo;Reply by email&rdquo;, then mark the inquiry as contacted. Anything about a patient is arranged by email,
        never through this form.
      </p>

      {loadError && <p className="admin-notice is-warning" role="alert"><b aria-hidden="true">!</b>{loadError}</p>}
      {alertFailures > 0 && (
        <p className="admin-notice is-warning" role="status">
          <b aria-hidden="true">!</b>
          {alertFailures === 1 ? "1 inquiry arrived" : `${alertFailures} inquiries arrived`} without the team alert email being sent. Check RESEND_API_KEY and MDT_TEAM_EMAIL on the Worker.
        </p>
      )}

      <div className="aq-controls">
        <div className="aq-filters" role="tablist" aria-label="Filter MDT inquiries">
          {FILTERS.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? "is-active" : ""} onClick={() => setFilter(id)}>
              {label}<span>{counts[id]}</span>
            </button>
          ))}
        </div>
        <label className="aq-search">
          <IconSearch size={17} />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, institute, country or text" aria-label="Search MDT inquiries" />
        </label>
      </div>

      <div className="aq-layout">
        <ul className="aq-list" aria-label="MDT inquiries">
          {visible.length === 0 && <li className="aq-empty">{rows.length === 0 ? "No MDT inquiries yet." : "Nothing here."}</li>}
          {visible.map((row) => (
            <li key={row.id}>
              <button type="button" className={`aq-row${row.id === selectedId ? " is-selected" : ""}`} aria-current={row.id === selectedId} onClick={() => select(row.id)}>
                <span className="aq-row-head">
                  <b dir="auto">{row.name}</b>
                  <span className="aq-row-channel" title={row.institution}><IconUsers size={15} /></span>
                </span>
                <span className="aq-row-text">{row.institution} · {row.country}</span>
                <span className="aq-row-meta">
                  <span className={`admin-status is-q-${row.status}`}>{STATUS_LABEL[row.status]}</span>
                  {teamAlertMissing(row.team_alerted_at, row.created_at, now) && <span className="admin-status is-q-overdue">alert failed</span>}
                  <span>{INTEREST_LABEL[row.interest]}</span>
                  <span>{formatDate(row.created_at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className="aq-detail" aria-label="Selected MDT inquiry">
          {!selected ? (
            <div className="aq-placeholder">
              <IconUsers size={26} />
              <p>Choose an inquiry to read it and reply.</p>
            </div>
          ) : (
            <>
              <header className="aq-detail-head">
                <div>
                  <h2 ref={detailHeading} tabIndex={-1} dir="auto">{selected.name}</h2>
                  <p>Received {formatDate(selected.created_at)} · {LANGUAGE_LABEL[selected.locale]}</p>
                </div>
                <span className={`admin-status is-q-${selected.status}`}>{STATUS_LABEL[selected.status]}</span>
              </header>

              {notice && <p className={notice.tone === "warn" ? "admin-notice is-warning" : "admin-notice"} role="status">{notice.tone === "warn" ? <b aria-hidden="true">!</b> : <IconCheck size={17} />}{notice.text}</p>}
              {teamAlertMissing(selected.team_alerted_at, selected.created_at, now) && (
                <p className="admin-notice is-warning" role="status"><b aria-hidden="true">!</b>The team alert email for this inquiry was not sent.</p>
              )}

              <dl className="aq-contact">
                <div><dt>Role</dt><dd>{ROLE_LABEL[selected.role]}</dd></div>
                <div><dt>Institution</dt><dd dir="auto">{selected.institution}</dd></div>
                <div><dt>Country</dt><dd>{selected.country}</dd></div>
                <div><dt>Email</dt><dd><span dir="ltr">{selected.email}</span></dd></div>
                <div><dt>Phone</dt><dd>{selected.phone ? <a href={`tel:${selected.phone}`} dir="ltr">{selected.phone}</a> : <span className="aq-muted">None given</span>}</dd></div>
                <div><dt>Interested in</dt><dd>{INTEREST_LABEL[selected.interest]}</dd></div>
              </dl>

              <div className="aq-question">
                <h3>Message</h3>
                <p dir="auto">{selected.message}</p>
              </div>

              {selected.status === "contacted" && (
                <p className="aq-muted">
                  Contacted by {selected.contacter?.full_name || "a team member"} on {selected.contacted_at ? formatDate(selected.contacted_at) : "an unknown date"}.
                </p>
              )}

              <div className="aq-channels">
                <div className="aq-channel is-preferred">
                  <h3><IconMail size={17} />Reply from the team mailbox</h3>
                  <p className="aq-muted">
                    {selected.status === "wrong_form"
                      ? "Opens your mail app with a reply that points them to the patient question form."
                      : `Opens your mail app with the subject and a greeting in ${selected.locale === "ar" ? "Arabic" : "English"}. Send it from the team address.`}
                  </p>
                  <div className="aq-actions">
                    <a className="btn btn-primary" href={mdtReplyMailto(selected, typeof window === "undefined" ? "" : window.location.origin)}>Reply by email</a>
                    {selected.status !== "contacted" && selected.status !== "spam" && (
                      <button type="button" className="btn btn-outline" disabled={busy !== null} onClick={() => act("mark-contacted")}>
                        {busy === "mark-contacted" ? "Saving..." : "Mark contacted"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <label className="aq-note-field" htmlFor="mdt-note">
                Internal note <span className="aq-muted">(never sent)</span>
              </label>
              <textarea id="mdt-note" className="aq-note-input" rows={3} maxLength={MDT_LIMITS.noteMax} value={note} onChange={(event) => setNotes((current) => ({ ...current, [selected.id]: event.target.value }))} />

              <div className="aq-actions">
                <button type="button" className="btn btn-outline" disabled={busy !== null} onClick={() => act("save")}>{busy === "save" ? "Saving..." : "Save note"}</button>
                {selected.status !== "new" && <button type="button" className="aq-link" disabled={busy !== null} onClick={() => act("set-status", { status: "new" })}>Reopen</button>}
                {(selected.status === "new" || selected.status === "contacted") && <button type="button" className="aq-link" disabled={busy !== null} onClick={() => act("set-status", { status: "closed" })}>Close</button>}
                {selected.status === "new" && <button type="button" className="aq-link" disabled={busy !== null} onClick={() => act("set-status", { status: "wrong_form" })}>Sent by a patient (wrong form)</button>}
                {selected.status !== "spam" && <button type="button" className="aq-link" disabled={busy !== null} onClick={() => act("set-status", { status: "spam" })}>Mark as spam</button>}
              </div>

              <div className="aq-danger">
                <button
                  type="button"
                  className={`aq-link is-danger${confirmingDelete ? " is-confirming" : ""}`}
                  disabled={busy !== null}
                  onClick={() => (confirmingDelete ? void remove() : setConfirmingDelete(true))}
                  onBlur={() => setConfirmingDelete(false)}
                >
                  {confirmingDelete ? "Delete permanently? This cannot be undone." : "Delete inquiry"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
