"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconCheck, IconFile, IconLayers, IconPlus, IconSearch, IconUser, IconUsers } from "./icons";

type Section = "overview" | "content" | "topics" | "events" | "contributors" | "people" | "messages";
type Access = "checking" | "signed_out" | "denied" | "unavailable" | "ready";
const ADMIN_REQUEST_TIMEOUT_MS = 12_000;
class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
type RecordItem = Record<string, unknown>;
type ContentItem = RecordItem & { id?: string; title?: string; status?: string; kind?: string; access_level?: string; topic_ids?: string[]; chapters?: { title: string; starts_at_seconds: number }[]; content_media?: Media[] };
type Media = { storage_path: string; public_url: string; kind: "image" | "document"; alt_text?: string; caption?: string };

function asRecord(value: unknown): RecordItem {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordItem : {};
}

function asRecords(value: unknown): RecordItem[] {
  return Array.isArray(value) ? value.filter((item): item is RecordItem => item !== null && typeof item === "object" && !Array.isArray(item)) : [];
}

function errorMessage(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

const nav: { id: Section; label: string; icon: typeof IconLayers }[] = [
  { id: "overview", label: "Overview", icon: IconLayers }, { id: "content", label: "Content", icon: IconFile },
  { id: "topics", label: "Topics", icon: IconLayers }, { id: "events", label: "Events & webinars", icon: IconPlus },
  { id: "contributors", label: "Contributors", icon: IconUsers }, { id: "people", label: "People & roles", icon: IconUser },
  { id: "messages", label: "Contact inbox", icon: IconFile },
];

// The stored session is restored asynchronously after the page loads, so the
// first request has to wait for it. Sending an empty bearer token instead is
// what used to lock staff out with a spurious "access required" screen.
//
// Whichever source answers first wins, and the timer always fires: getSession
// can stall on its internal lock when another tab holds it, so it must never
// be the only thing this waits on.
function accessToken() {
  const client = getSupabaseBrowserClient();
  return new Promise<string | null>((resolve) => {
    let settled = false;
    let timer = 0;
    let listener: { unsubscribe: () => void } | null = null;
    function finish(token: string | null) {
      if (settled) return;
      settled = true; window.clearTimeout(timer); listener?.unsubscribe(); resolve(token);
    }
    listener = client.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) finish(session.access_token);
    }).data.subscription;
    timer = window.setTimeout(() => finish(null), 4000);
    void client.auth.getSession().then(({ data }) => { if (data.session?.access_token) finish(data.session.access_token); }).catch(() => {});
  });
}

const emptyContent = (): ContentItem => ({ kind: "case_article", status: "published", access_level: "public", title: "", slug: "", summary: "", level: "Clinical education", topic_ids: [], chapters: [], content_media: [] });

function RichEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => { if (element.current && element.current.innerHTML !== value) element.current.innerHTML = value; }, [value]);
  useEffect(() => {
    const toolbar = element.current?.previousElementSibling;
    const preserveSelection = (event: Event) => event.preventDefault();
    // Toolbar buttons must not steal focus: doing so clears the selected text
    // before execCommand runs, which made bold and italic appear broken.
    toolbar?.addEventListener("mousedown", preserveSelection);
    return () => toolbar?.removeEventListener("mousedown", preserveSelection);
  }, []);
  function format(command: string) { element.current?.focus(); document.execCommand(command); onChange(element.current?.innerHTML ?? ""); }
  return <div className="admin-rich-editor"><div className="admin-rich-actions" aria-label="Text formatting"><button type="button" onClick={() => format("bold")}><b>B</b></button><button type="button" onClick={() => format("italic")}><i>I</i></button><button type="button" onClick={() => format("insertUnorderedList")}>List</button><button type="button" onClick={() => format("formatBlock")}>Heading</button></div><div ref={element} className="admin-rich-input" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder="Write the article introduction and supporting detail…" onInput={() => onChange(element.current?.innerHTML ?? "")} /></div>;
}

export default function AdminWorkspace() {
  const [active, setActive] = useState<Section>("overview");
  const [identity, setIdentity] = useState<RecordItem | null>(null);
  const [items, setItems] = useState<RecordItem[]>([]);
  const [topics, setTopics] = useState<RecordItem[]>([]);
  const [contributors, setContributors] = useState<RecordItem[]>([]);
  const [metrics, setMetrics] = useState<RecordItem>({});
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [access, setAccess] = useState<Access>("checking");
  const [accessMessage, setAccessMessage] = useState("");

  async function authHeaders() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${(await accessToken()) ?? ""}` };
  }
  async function request(resource: Section, init?: RequestInit): Promise<RecordItem> {
    const headers = await authHeaders();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ADMIN_REQUEST_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort();
    init?.signal?.addEventListener("abort", abortFromCaller, { once: true });
    try {
      const response = await fetch(`/api/admin/${resource}`, { ...init, signal: controller.signal, headers: { ...headers, ...(init?.headers ?? {}) } });
      const result = asRecord(await response.json().catch(() => ({})));
      if (!response.ok) throw new RequestError(errorMessage(result.error, "Something went wrong."), response.status);
      return result;
    } catch (error) {
      if (controller.signal.aborted && !init?.signal?.aborted) {
        throw new RequestError("The admin service took too long to respond. Please try again.", 504);
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
      init?.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
  // Switching sections quickly used to let a slow earlier response land last and
  // overwrite the newer section's list — leaving, say, content rows on the
  // Events screen, where Delete would then target the wrong table. Every load
  // claims a token and only commits while it is still the newest one.
  const loadToken = useRef(0);
  async function load(resource = active) {
    const token = ++loadToken.current;
    const current = () => loadToken.current === token;
    setLoading(true); setNotice("");
    try {
      if (resource === "overview" && !(await accessToken())) { if (current()) { setAccess("signed_out"); setAccessMessage("Sign in with your staff account to open the workspace."); } return; }
      const result = await request(resource);
      if (!current()) return;
      if (resource === "overview") { setIdentity(asRecord(result.identity)); setMetrics(asRecord(result.metrics)); setAccess("ready"); }
      else {
        setItems(asRecords(result.data));
        if (resource === "content") {
          // Independent lookups: fetched together rather than back to back.
          const [topicResult, contributorResult] = await Promise.all([request("topics"), request("contributors")]);
          if (!current()) return;
          setTopics(asRecords(topicResult.data)); setContributors(asRecords(contributorResult.data));
        }
      }
    } catch (error) {
      if (!current()) return;
      const status = error instanceof RequestError ? error.status : 0;
      const message = error instanceof Error ? error.message : "Unable to load this area.";
      // Only the first identity check can decide that access itself is missing.
      // A rejected section (or a flaky request) must not blank the workspace.
      if (resource === "overview") {
        if (status === 401 || status === 403) setAccess(status === 401 ? "signed_out" : "denied");
        else setAccess("unavailable");
        setAccessMessage(message);
      } else setNotice(message);
    }
    finally { if (current()) setLoading(false); }
  }
  // Reload only when the selected workspace section changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [active]);

  // A session that lands after the first check gave up (slow restore, a sign-in
  // in another tab, a token refresh) should re-open the workspace by itself.
  const accessRef = useRef(access);
  useEffect(() => { accessRef.current = access; }, [access]);
  useEffect(() => {
    const listener = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && accessRef.current !== "ready") { setAccess("checking"); void load("overview"); }
    });
    return () => listener.data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The haystack is built once per list rather than re-serialising every record
  // (including full article bodies) on each keystroke, and it searches the
  // labelling fields instead of raw markup.
  const searchable = useMemo(
    () => items.map((item) => ({ item, haystack: ["title", "name", "display_name", "slug", "summary", "kind", "status", "level", "email", "full_name", "topic", "event_type", "location"].map((key) => typeof item[key] === "string" ? item[key] as string : "").join(" ").toLowerCase() })),
    [items],
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? searchable.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.item) : items;
  }, [searchable, items, search]);
  function startNew() {
    if (active === "content") setEditing(emptyContent());
    else if (active === "topics") setEditing({ name: "", slug: "", description: "", sort_order: 0 });
    else if (active === "events") setEditing({ title: "", slug: "", event_type: "Webinar", format: "online", status: "published" });
    else if (active === "contributors") setEditing({ display_name: "", credentials: "", role_title: "", group_name: "", biography: "", published: true, sort_order: 0 });
    else setEditing(null);
  }
  async function save(value: RecordItem) {
    try {
      await request(active, { method: "POST", body: JSON.stringify(value) }); setNotice("Saved. The public site will reflect published changes without a code release."); setEditing(null); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save this item."); }
  }
  async function remove(item: RecordItem) {
    if (!window.confirm(`Delete “${String(item.title ?? item.name ?? item.display_name ?? "this item")}”? This cannot be undone.`)) return;
    try { const headers = await authHeaders(); const response = await fetch(`/api/admin/${active}?id=${encodeURIComponent(String(item.id))}`, { method: "DELETE", headers }); const result = asRecord(await response.json()); if (!response.ok) throw new Error(errorMessage(result.error, "Could not delete this item.")); setNotice("Deleted."); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete this item."); }
  }
  async function signOut() { await getSupabaseBrowserClient().auth.signOut(); window.location.assign("/en/sign-in"); }

  if (access === "checking" && !identity) return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Checking your access…</h1><p>Restoring your staff session.</p></main>;
  if (access === "signed_out") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Sign in to continue</h1><p>{accessMessage}</p><Link className="btn btn-primary" href="/en/sign-in">Sign in</Link></main>;
  if (access === "denied") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Admin access required</h1><p>{accessMessage}</p><div className="admin-access-actions"><button className="btn btn-primary" type="button" onClick={() => { setAccess("checking"); void load("overview"); }}>Try again</button><button className="btn btn-outline" type="button" onClick={signOut}>Sign in as another account</button></div></main>;
  if (access === "unavailable") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>We couldn’t verify your access</h1><p>{accessMessage}</p><div className="admin-access-actions"><button className="btn btn-primary" type="button" onClick={() => { setAccess("checking"); void load("overview"); }}>Try again</button><button className="btn btn-outline" type="button" onClick={signOut}>Sign in again</button></div></main>;
  return <main className="admin-shell"><aside className="admin-sidebar"><Link className="admin-brand" href="/en"><img className="admin-logo" src="/sst-mark.png" alt=""/><span className="admin-brand-copy"><b>Smart Surgical Team</b><small>Admin</small></span></Link><div className="admin-owner"><span>{String(identity?.full_name ?? identity?.name ?? "Owner").split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><div><b>{String(identity?.full_name ?? identity?.name ?? "Smart Surgical Team")}</b><small>{String(identity?.role ?? "owner").replace(/_/g, " ")}</small></div></div><nav aria-label="Admin sections">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "is-active" : ""} type="button" onClick={() => { setActive(id); setEditing(null); setSearch(""); }}><Icon size={18}/>{label}</button>)}</nav><button className="admin-signout" type="button" onClick={signOut}>Sign out</button></aside><section className="admin-main"><header className="admin-topbar"><div><span className="admin-kicker">Content operations</span><h1>{nav.find((item) => item.id === active)?.label}</h1></div>{["content", "topics", "events", "contributors"].includes(active) && <button className="btn btn-primary" type="button" onClick={startNew}><IconPlus size={17}/> Add {active === "content" ? "content" : active === "events" ? "event" : active.slice(0, -1)}</button>}</header>{notice && <p className="admin-notice" role="status"><IconCheck size={17}/>{notice}</p>}{loading ? <div className="admin-loading">Loading workspace…</div> : <>{active === "overview" ? <Overview metrics={metrics} setActive={setActive}/> : editing ? <Editor section={active} value={editing} topics={topics} contributors={contributors} onCancel={() => setEditing(null)} onSave={save}/> : <List section={active} items={filtered} search={search} setSearch={setSearch} onEdit={setEditing} onDelete={remove}/>}</>}</section></main>;
}

function Overview({ metrics, setActive }: { metrics: RecordItem; setActive: (section: Section) => void }) {
  const cards: { key: string; label: string; section: Section }[] = [{ key: "published", label: "Published items", section: "content" }, { key: "drafts", label: "Drafts & unpublishing", section: "content" }, { key: "events", label: "Published events", section: "events" }, { key: "contributors", label: "Contributors", section: "contributors" }, { key: "members", label: "Members", section: "people" }, { key: "messages", label: "Inbox messages", section: "messages" }];
  return <div className="admin-overview"><section className="admin-welcome"><div><span className="admin-kicker">Control room</span><h2>Keep the platform current, carefully.</h2><p>Publish case articles, update the team, and keep events and learning material accurate from one place.</p></div><button className="btn btn-primary" type="button" onClick={() => setActive("content")}>Create a case article <IconArrowRight size={17}/></button></section><div className="admin-metric-grid">{cards.map((card) => <button type="button" onClick={() => setActive(card.section)} key={card.key}><strong>{String(metrics[card.key] ?? 0)}</strong><span>{card.label}</span><IconArrowRight size={16}/></button>)}</div><section className="admin-safety"><h2>Clinical publishing reminder</h2><p>Only publish material that has been de-identified, consented, and approved by the team. Articles are public unless you select “Site users only” in the content editor.</p></section></div>;
}

function List({ section, items, search, setSearch, onEdit, onDelete }: { section: Section; items: RecordItem[]; search: string; setSearch: (value: string) => void; onEdit: (item: RecordItem) => void; onDelete: (item: RecordItem) => void }) {
  const isMessages = section === "messages";
  return <div className="admin-list"><div className="admin-list-controls"><label><IconSearch size={17}/><span className="visually-hidden">Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${section.replace("people", "people and roles")}…`}/></label><span>{items.length} item{items.length === 1 ? "" : "s"}</span></div>{items.length ? <div className="admin-table">{items.map((item) => <article key={String(item.id)}><div className="admin-item-main"><span className={`admin-status is-${String(item.status ?? item.role ?? "default")}`}>{String(item.status ?? item.role ?? (item.published === false ? "hidden" : "active")).replace(/_/g, " ")}</span><h2>{String(item.title ?? item.name ?? item.display_name ?? item.email ?? "Untitled")}</h2><p>{String(item.summary ?? item.description ?? item.message ?? item.credentials ?? item.role_title ?? item.email ?? "No additional detail.")}</p></div><div className="admin-item-meta">{section === "content" && <><span>{String(item.kind ?? "article").replace(/_/g, " ")}</span><span>{String(item.access_level === "members_only" ? "Site users only" : "Public")}</span></>}{section === "events" && <span>{item.starts_at ? new Date(String(item.starts_at)).toLocaleDateString() : "Date to be confirmed"}</span>}{section === "people" && <span>{String(item.email ?? "")}</span>}{!isMessages && <div><button type="button" onClick={() => onEdit(item)}>Edit</button>{section !== "people" && <button className="admin-delete" type="button" onClick={() => onDelete(item)}>Delete</button>}</div>}</div></article>)}</div> : <div className="admin-empty"><IconFile size={23}/><h2>Nothing here yet</h2><p>Create the first item when you are ready.</p></div>}</div>;
}

function Editor({ section, value, topics, contributors, onCancel, onSave }: { section: Section; value: RecordItem; topics: RecordItem[]; contributors: RecordItem[]; onCancel: () => void; onSave: (value: RecordItem) => void }) {
  const [form, setForm] = useState<RecordItem>(() => ({ ...value, topic_ids: Array.isArray(value.content_topics) ? value.content_topics.flatMap((row) => typeof row === "object" && row ? [String((row as RecordItem).topic_id)] : []) : value.topic_ids ?? [], contributor_ids: Array.isArray(value.content_contributors) ? value.content_contributors.flatMap((row) => typeof row === "object" && row ? [String((row as RecordItem).contributor_id)] : []) : value.contributor_ids ?? (value.contributor_id ? [String(value.contributor_id)] : []), chapters: Array.isArray(value.content_chapters) ? value.content_chapters : value.chapters ?? [], content_media: Array.isArray(value.content_media) ? value.content_media : [] }));
  const [uploading, setUploading] = useState(false);
  // A rejected upload used to throw out of an event handler with no catch: the
  // spinner stopped and the editor said nothing at all.
  const [uploadError, setUploadError] = useState("");
  const set = (key: string, next: unknown) => setForm((current) => ({ ...current, [key]: next }));
  async function upload(file: File) { setUploading(true); try { const token = await accessToken(); const body = new FormData(); body.append("file", file); const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` }, body }); const result = asRecord(await response.json()); if (!response.ok) throw new Error(errorMessage(result.error, "Could not upload this file.")); const path = typeof result.path === "string" ? result.path : ""; const publicUrl = typeof result.publicUrl === "string" ? result.publicUrl : ""; const kind = result.kind === "document" ? "document" : result.kind === "image" ? "image" : null; if (!path || !publicUrl || !kind) throw new Error("The upload service returned an incomplete file record."); setUploadError(""); setForm((current) => ({ ...current, content_media: [...(Array.isArray(current.content_media) ? current.content_media as Media[] : []), { storage_path: path, public_url: publicUrl, kind, alt_text: "", caption: "" }] })); } catch (error) { setUploadError(error instanceof Error ? error.message : "Could not upload this file."); } finally { setUploading(false); } }
  function submit(event: FormEvent) { event.preventDefault(); onSave({ ...form, media: form.content_media }); }
  if (section === "content") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit content" : "New content"} onCancel={onCancel}/><div className="admin-editor-grid"><section><Field label="Title" value={form.title} onChange={(value) => set("title", value)} required/><Field label="URL slug" hint="Leave this blank to generate it from the title." value={form.slug} onChange={(value) => set("slug", value)}/><Field label="Card summary" type="textarea" value={form.summary} onChange={(value) => set("summary", value)} required/><div className="admin-field-grid"><Select label="Format" value={form.kind} onChange={(value) => set("kind", value)} options={[['case_article','Case article'],['video','Video lesson'],['webinar_recording','Recorded webinar'],['poster','E-poster']]}/><Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive'],['scheduled','Schedule']]}/></div>{form.status === "scheduled" && <Field label="Publish on" type="datetime-local" value={form.scheduled_for} onChange={(value) => set("scheduled_for", value)}/>}<Select label="Visibility" value={form.access_level} onChange={(value) => set("access_level", value)} options={[['public','Public'],['members_only','Site users only']]}/><TopicPicker topics={topics} value={(form.topic_ids as string[]) ?? []} onChange={(ids) => set("topic_ids", ids)}/><label className="admin-label">Contributors<select multiple value={(form.contributor_ids as string[]) ?? []} onChange={(event) => set("contributor_ids", Array.from(event.target.selectedOptions).map((option) => option.value))}>{contributors.map((person) => <option value={String(person.id)} key={String(person.id)}>{String(person.display_name)}</option>)}</select><small>Choose every credited contributor. The first selected is the lead author. Leave empty for “Smart Surgical Team”. Hold Ctrl/Cmd to select more than one.</small></label><div className="admin-field-grid"><Field label="Video URL (optional)" hint="Paste a YouTube watch or share link, or a direct .mp4/.webm file URL." type="url" value={form.video_url} onChange={(value) => set("video_url", value)}/><Field label="Reading time (minutes)" type="number" value={form.reading_minutes} onChange={(value) => set("reading_minutes", value)}/></div><Field label="Clinical level" value={form.level} onChange={(value) => set("level", value)}/><label className="admin-label">Article body<RichEditor value={String(form.body_html ?? "")} onChange={(value) => set("body_html", value)}/></label><CaseFields form={form} set={set}/></section><aside><MediaManager media={(form.content_media as Media[]) ?? []} setMedia={(media) => set("content_media", media)} upload={upload} uploading={uploading} error={uploadError}/><Chapters chapters={(form.chapters as { title: string; starts_at_seconds: number }[]) ?? []} setChapters={(chapters) => set("chapters", chapters)}/></aside></div><EditorFoot onCancel={onCancel}/></form>;
  if (section === "topics") return <SimpleEditor title={form.id ? "Edit topic" : "New topic"} fields={[['name','Topic name'],['slug','URL slug'],['description','Description'],['sort_order','Display order']]} form={form} set={set} onCancel={onCancel} onSave={submit} topics={topics}/>;
  if (section === "events") return <SimpleEditor title={form.id ? "Edit event" : "New event or webinar"} fields={[['title','Title'],['slug','URL slug'],['summary','Summary'],['event_type','Type'],['topic','Topic'],['format','Format'],['status','Status'],['starts_at','Starts at'],['ends_at','Ends at'],['location','Location'],['image_url','Image URL'],['official_url','Official URL'],['registration_url','Registration URL'],['programme_url','Programme URL'],['faculty_url','Faculty page URL'],['highlights','Programme highlights']]} form={{ ...form, highlights: Array.isArray(form.highlights) ? form.highlights.join("\n") : form.highlights }} set={set} onCancel={onCancel} onSave={submit}/>;
  if (section === "people") return <form className="admin-editor admin-simple-editor" onSubmit={submit}><EditorHead title={`Manage ${String(form.full_name ?? form.email)}`} onCancel={onCancel}/><div className="admin-simple-fields"><Field label="Email" value={form.email} onChange={() => {}}/><Select label="Platform role" value={form.role} onChange={(value) => set("role", value)} options={[['owner','Owner'],['content_manager','Content manager'],['editor','Editor'],['contributor','Contributor'],['member','Member']]}/><p className="admin-role-note">Only the Owner can change roles. The designated Owner account cannot be downgraded here.</p></div><EditorFoot onCancel={onCancel}/></form>;
  return <SimpleEditor title={form.id ? "Edit contributor" : "New contributor"} fields={[['display_name','Full name'],['credentials','Credentials'],['role_title','Role'],['group_name','Team group'],['photo_url','Portrait URL'],['biography','Biography'],['sort_order','Display order']]} form={form} set={set} onCancel={onCancel} onSave={submit}/>;
}

function TopicPicker({ topics, value, onChange }: { topics: RecordItem[]; value: string[]; onChange: (ids: string[]) => void }) {
  const majors = topics.filter((topic) => !topic.parent_id);
  const parentOf = (id: string) => topics.find((topic) => String(topic.id) === id)?.parent_id;
  const inferredMajor = value.map((id) => (majors.some((major) => String(major.id) === id) ? id : parentOf(id))).find(Boolean);
  const [majorId, setMajorId] = useState<string>(String(inferredMajor ?? majors[0]?.id ?? ""));
  const subTopics = topics.filter((topic) => topic.parent_id != null && String(topic.parent_id) === majorId);
  const selectedSubIds = value.filter((id) => subTopics.some((topic) => String(topic.id) === id));

  function changeMajor(id: string) { setMajorId(id); onChange(id ? [id] : []); }
  function toggleSub(id: string, checked: boolean) {
    const next = checked ? [...selectedSubIds, id] : selectedSubIds.filter((entry) => entry !== id);
    onChange(next.length ? next : majorId ? [majorId] : []);
  }

  return <section className="admin-topic-picker">
    <label className="admin-label">Major topic<select value={majorId} onChange={(event) => changeMajor(event.target.value)}>{majors.map((major) => <option value={String(major.id)} key={String(major.id)}>{String(major.name)}</option>)}</select><small>Choose the one major topic this belongs to.</small></label>
    {subTopics.length > 0 && <div className="admin-subtopic-list"><span className="admin-label-text">Subtopics in this major topic</span><div className="admin-subtopic-grid">{subTopics.map((topic) => <label className="admin-checkbox" key={String(topic.id)}><input type="checkbox" checked={selectedSubIds.includes(String(topic.id))} onChange={(event) => toggleSub(String(topic.id), event.target.checked)}/>{String(topic.name)}</label>)}</div><small>Choose every subtopic that applies. Leave all unchecked to file this under the major topic only.</small></div>}
  </section>;
}
function CaseFields({ form, set }: { form: RecordItem; set: (key: string, value: unknown) => void }) { const fields = [['case_presentation','Patient presentation'],['case_imaging','Imaging & workup'],['case_procedure','Surgical management'],['case_histopathology','Histopathology'],['case_outcome','Outcome & follow-up']]; return <section className="admin-case-fields"><h2>Structured case record</h2><p>Every section is optional. Add only reviewed, de-identified material.</p>{fields.map(([key, label]) => <Field key={key} label={label} type="textarea" value={form[key]} onChange={(value) => set(key, value)}/>)}</section>; }
function MediaManager({ media, setMedia, upload, uploading, error }: { media: Media[]; setMedia: (value: Media[]) => void; upload: (file: File) => void; uploading: boolean; error?: string }) { return <section className="admin-media"><h2>Images & PDFs</h2><p>Add a cover image, in-article images, or a downloadable PDF. Video is optional and entered in the main form.</p><label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}/><IconPlus size={18}/>{uploading ? "Uploading…" : "Upload file"}</label>{error && <p className="admin-upload-error" role="alert">{error}</p>}{media.map((item, index) => <div className="admin-media-item" key={item.storage_path}><span>{item.kind === "image" ? "Image" : "PDF"}</span><input value={item.alt_text ?? ""} onChange={(event) => setMedia(media.map((entry, position) => position === index ? { ...entry, alt_text: event.target.value } : entry))} placeholder="Alt text / file description"/><button type="button" onClick={() => setMedia(media.filter((_, position) => position !== index))}>Remove</button></div>)}</section>; }
function Chapters({ chapters, setChapters }: { chapters: { title: string; starts_at_seconds: number }[]; setChapters: (chapters: { title: string; starts_at_seconds: number }[]) => void }) { return <section className="admin-chapters"><div><h2>Video chapters</h2><button type="button" onClick={() => setChapters([...chapters, { title: "", starts_at_seconds: 0 }])}>Add chapter</button></div>{chapters.length ? chapters.map((chapter, index) => <div className="admin-chapter" key={index}><input value={chapter.title} onChange={(event) => setChapters(chapters.map((entry, position) => position === index ? { ...entry, title: event.target.value } : entry))} placeholder="Chapter title"/><input type="number" value={chapter.starts_at_seconds} onChange={(event) => setChapters(chapters.map((entry, position) => position === index ? { ...entry, starts_at_seconds: Number(event.target.value) } : entry))} aria-label="Start time in seconds"/><button type="button" onClick={() => setChapters(chapters.filter((_, position) => position !== index))}>×</button></div>) : <p>No chapters added.</p>}</section>; }
function EditorHead({ title, onCancel }: { title: string; onCancel: () => void }) { return <div className="admin-editor-head"><div><span className="admin-kicker">Content editor</span><h2>{title}</h2></div><button type="button" className="admin-close" onClick={onCancel}>Close</button></div>; }
function EditorFoot({ onCancel }: { onCancel: () => void }) { return <div className="admin-editor-foot"><button className="btn btn-primary" type="submit">Save changes <IconArrowRight size={17}/></button><button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button></div>; }
function Field({ label, value, onChange, type = "text", hint, required = false }: { label: string; value: unknown; onChange: (value: string) => void; type?: string; hint?: string; required?: boolean }) { return <label className="admin-label">{label}{type === "textarea" ? <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required}/> : <input type={type} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required}/>} {hint && <small>{hint}</small>}</label>; }
function Select({ label, value, onChange, options }: { label: string; value: unknown; onChange: (value: string) => void; options: string[][] }) { return <label className="admin-label">{label}<select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function SimpleEditor({ title, fields, form, set, onCancel, onSave, topics }: { title: string; fields: string[][]; form: RecordItem; set: (key: string, value: unknown) => void; onCancel: () => void; onSave: (event: FormEvent) => void; topics?: RecordItem[] }) { return <form className="admin-editor admin-simple-editor" onSubmit={onSave}><EditorHead title={title} onCancel={onCancel}/><div className="admin-simple-fields">{fields.map(([key, label]) => <Field key={key} label={label} hint={key === "highlights" ? "One highlight per line." : undefined} type={key === "summary" || key === "description" || key === "biography" || key === "highlights" ? "textarea" : key.includes("_at") ? "datetime-local" : key.includes("url") ? "url" : key === "sort_order" ? "number" : "text"} value={form[key]} onChange={(value) => set(key, value)}/>) }{topics && <label className="admin-label">Parent topic<select value={String(form.parent_id ?? "")} onChange={(event) => set("parent_id", event.target.value)}><option value="">No parent (top-level topic)</option>{topics.filter((topic) => topic.id !== form.id).map((topic) => <option value={String(topic.id)} key={String(topic.id)}>{String(topic.name)}</option>)}</select></label>}</div><EditorFoot onCancel={onCancel}/></form>; }
