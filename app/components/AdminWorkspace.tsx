"use client";

import { FormEvent, MouseEvent as ReactMouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type ContentFilters = { major: string; subtopic: string; status: string; access: string; from: string; to: string; sort: "published_desc" | "published_asc" | "updated_desc" };
const EMPTY_CONTENT_FILTERS: ContentFilters = { major: "", subtopic: "", status: "", access: "", from: "", to: "", sort: "published_desc" };

function asRecord(value: unknown): RecordItem {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordItem : {};
}

function asRecords(value: unknown): RecordItem[] {
  return Array.isArray(value) ? value.filter((item): item is RecordItem => item !== null && typeof item === "object" && !Array.isArray(item)) : [];
}

function errorMessage(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

// Not every response is JSON. A request the platform rejects before it reaches
// a route comes back as plain text — a 413 body reads "Payload Too Large" —
// which surfaced in the editor as an "Unexpected token 'P'" parse error rather
// than as anything the person uploading could act on.
async function readResponse(response: Response): Promise<RecordItem> {
  const text = await response.text().catch(() => "");
  try {
    return asRecord(JSON.parse(text));
  } catch {
    if (response.ok) return {};
    return { error: response.status === 413 ? "That file is too large to upload. Choose one no larger than 10 MB." : `The server responded with ${response.status}.` };
  }
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

const emptyContent = (): ContentItem => ({ kind: "case_article", status: "published", access_level: "public", title: "", slug: "", summary: "", level: "Clinical education", topic_ids: [], contributor_ids: [], chapters: [], content_media: [] });

// A fixed vocabulary keeps the level badge on the public card consistent; it
// used to be free text and every article spelled it differently.
const CLINICAL_LEVELS: string[][] = [
  ["Clinical education", "Clinical education"],
  ["Foundation", "Foundation"],
  ["Intermediate", "Intermediate"],
  ["Advanced", "Advanced"],
  ["Subspecialty", "Subspecialty"],
];

// Older items were saved with free-text levels; keep whatever they hold as a
// selectable option so editing one cannot silently blank the field.
function clinicalLevelOptions(current: unknown) {
  const value = typeof current === "string" ? current.trim() : "";
  return value && !CLINICAL_LEVELS.some(([option]) => option === value) ? [...CLINICAL_LEVELS, [value, value]] : CLINICAL_LEVELS;
}

// Everything the editor is allowed to produce, mapped to the one tag the
// server-side sanitiser keeps. Browsers emit `<b>`, `<i>` and `<div>` for the
// same intentions, and those used to be stripped on save a which is why bold
// text looked right in the editor and plain on the public page.
const RICH_TAGS: Record<string, string> = {
  P: "p", DIV: "p", BR: "br", STRONG: "strong", B: "strong", EM: "em", I: "em", U: "u",
  A: "a", UL: "ul", OL: "ol", LI: "li", H1: "h2", H2: "h2", H3: "h3", H4: "h3", H5: "h3", H6: "h3",
  BLOCKQUOTE: "blockquote", FONT: "font",
};
const RICH_BLOCKS = new Set(["p", "ul", "ol", "li", "h2", "h3", "blockquote"]);
const RICH_SIZES: [string, string][] = [["2", "Small"], ["3", "Normal"], ["4", "Large"], ["5", "Extra large"]];

function inlineWrappers(element: HTMLElement) {
  const style = element.getAttribute("style") ?? "";
  const wrappers: string[] = [];
  if (/font-weight:\s*(bold|[6-9]00)/i.test(style)) wrappers.push("strong");
  if (/font-style:\s*italic/i.test(style)) wrappers.push("em");
  if (/text-decoration[^;]*underline/i.test(style)) wrappers.push("u");
  return wrappers;
}

function hasBlockChild(element: HTMLElement) {
  return Array.from(element.children).some((child) => RICH_BLOCKS.has(RICH_TAGS[child.tagName] ?? ""));
}

function convertRichNode(node: Node, into: HTMLElement) {
  if (node.nodeType === Node.TEXT_NODE) { into.appendChild(document.createTextNode(node.nodeValue ?? "")); return; }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const source = node as HTMLElement;
  // Unwrapping these would spill their source code into the article as text.
  if (source.tagName === "SCRIPT" || source.tagName === "STYLE" || source.tagName === "NOSCRIPT") return;
  let target = into;
  const mapped = RICH_TAGS[source.tagName];
  if (mapped === "br") { target.appendChild(document.createElement("br")); return; }
  // A wrapper that already holds blocks (the `<div>` browsers put around a whole
  // list, for instance) is unwrapped rather than turned into an invalid `<p>`.
  if (mapped && !(mapped === "p" && hasBlockChild(source))) {
    const href = source.getAttribute("href") ?? "";
    const size = source.getAttribute("size") ?? "";
    const usable = mapped === "a" ? /^(https?:\/\/|mailto:|\/)/i.test(href) : mapped === "font" ? RICH_SIZES.some(([option]) => option === size) : true;
    if (usable) {
      const created = document.createElement(mapped);
      if (mapped === "a") { created.setAttribute("href", href); created.setAttribute("rel", "noreferrer noopener"); created.setAttribute("target", "_blank"); }
      if (mapped === "font") created.setAttribute("size", size);
      target.appendChild(created);
      target = created;
    }
  }
  // Pasted markup carries its styling in `style`; keep the meaning, drop the
  // CSS. This goes inside the block it decorates a an `<em>` wrapped around a
  // `<li>` would sit illegally between the list and its items.
  for (const wrapper of inlineWrappers(source)) { const wrap = document.createElement(wrapper); target.appendChild(wrap); target = wrap; }
  source.childNodes.forEach((child) => convertRichNode(child, target));
}

function normalizeRichText(html: string) {
  if (typeof document === "undefined") return html;
  const source = document.createElement("div");
  source.innerHTML = html;
  const output = document.createElement("div");
  source.childNodes.forEach((child) => convertRichNode(child, output));
  // Unwrapping a browser's invalid `<p><ul>a</ul></p>` leaves empty paragraphs
  // behind, and those render as blank gaps in the article.
  output.querySelectorAll("p, h2, h3, blockquote").forEach((block) => {
    if (!block.textContent?.trim() && !block.querySelector("br, img, a")) block.remove();
  });
  return output.innerHTML;
}

function commandState(command: string) {
  try { return document.queryCommandState(command); } catch { return false; }
}

function blockName() {
  try { return String(document.queryCommandValue("formatBlock") || "p").toLowerCase(); } catch { return "p"; }
}

function RichEditor({ value, onChange, placeholder = "Write the supporting detail..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const element = useRef<HTMLDivElement>(null);
  // What this editor last handed upwards. The contenteditable node a not React
  // state a owns the text while the caret is inside it; rewriting innerHTML on
  // every keystroke is what threw the caret to the start after each Enter.
  //
  // It starts as null, never as the incoming value: seeding it with the value
  // made the first sync below decide the DOM was already up to date, so an
  // existing article opened blank and saving wrote that blank back.
  const emitted = useRef<string | null>(null);
  const [marks, setMarks] = useState({ bold: false, italic: false, underline: false, bullets: false, numbers: false, block: "p" });

  useEffect(() => {
    if (!element.current || value === emitted.current) return;
    element.current.innerHTML = value;
    emitted.current = value;
  }, [value]);

  // Without these, Chrome wraps formatting in `<span style>` and separates
  // paragraphs with bare `<div>`s a both of which the sanitiser discards.
  useEffect(() => {
    try { document.execCommand("styleWithCSS", false, "false"); document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* older engines ignore both */ }
  }, []);

  function selectionInside() {
    const current = window.getSelection();
    return Boolean(current?.rangeCount && element.current?.contains(current.anchorNode));
  }

  const readMarks = useCallback(() => {
    const current = window.getSelection();
    if (!current?.rangeCount || !element.current?.contains(current.anchorNode)) return;
    setMarks({ bold: commandState("bold"), italic: commandState("italic"), underline: commandState("underline"), bullets: commandState("insertUnorderedList"), numbers: commandState("insertOrderedList"), block: blockName() });
  }, []);

  useEffect(() => {
    const listener = () => readMarks();
    document.addEventListener("selectionchange", listener);
    return () => document.removeEventListener("selectionchange", listener);
  }, [readMarks]);

  // execCommand only acts on a selection that lives inside this editor. Clicking
  // "List" with the caret never placed used to do nothing at all; now the caret
  // is put at the end of the text first.
  function focusEditor() {
    const node = element.current;
    if (!node) return;
    if (!selectionInside()) {
      node.focus();
      const current = window.getSelection();
      if (current) { const range = document.createRange(); range.selectNodeContents(node); range.collapse(false); current.removeAllRanges(); current.addRange(range); }
    } else node.focus();
  }

  function emit() {
    const html = normalizeRichText(element.current?.innerHTML ?? "");
    emitted.current = html;
    onChange(html);
  }

  function run(command: string, argument?: string) {
    focusEditor();
    try { document.execCommand(command, false, argument); } catch { /* unsupported command a nothing to apply */ }
    emit();
    readMarks();
  }

  function toggleBlock(tag: string) {
    focusEditor();
    run("formatBlock", blockName() === tag ? "p" : tag);
  }

  function addLink() {
    focusEditor();
    const current = window.getSelection();
    if (!current || current.isCollapsed) { window.alert("Select the words you want to link first."); return; }
    const href = window.prompt("Link address (https://a)", "https://");
    if (!href) return;
    if (!/^(https?:\/\/|mailto:)/i.test(href)) { window.alert("Use a full https:// or mailto: address."); return; }
    run("createLink", href);
  }

  const press = (event: ReactMouseEvent<HTMLElement>, action: () => void) => { event.preventDefault(); action(); };
  const button = (key: string, label: ReactNode, title: string, active: boolean, action: () => void) =>
    <button key={key} type="button" title={title} aria-label={title} aria-pressed={active} className={active ? "is-active" : ""} onMouseDown={(event) => press(event, action)}>{label}</button>;

  return <div className="admin-rich-editor">
    <div className="admin-rich-actions" role="toolbar" aria-label="Text formatting">
      {button("bold", <b>B</b>, "Bold", marks.bold, () => run("bold"))}
      {button("italic", <i>I</i>, "Italic", marks.italic, () => run("italic"))}
      {button("underline", <u>U</u>, "Underline", marks.underline, () => run("underline"))}
      <span className="admin-rich-divider" aria-hidden="true"/>
      {button("h2", "H2", "Section heading", marks.block === "h2", () => toggleBlock("h2"))}
      {button("h3", "H3", "Sub heading", marks.block === "h3", () => toggleBlock("h3"))}
      {button("quote", "", "Quote", marks.block === "blockquote", () => toggleBlock("blockquote"))}
      <span className="admin-rich-divider" aria-hidden="true"/>
      {button("bullets", "a List", "Bulleted list", marks.bullets, () => run("insertUnorderedList"))}
      {button("numbers", "1. List", "Numbered list", marks.numbers, () => run("insertOrderedList"))}
      <span className="admin-rich-divider" aria-hidden="true"/>
      <label className="admin-font-size"><span className="visually-hidden">Text size</span><select defaultValue="" onMouseDown={(event) => event.stopPropagation()} onChange={(event) => { const size = event.target.value; event.target.value = ""; if (size) run("fontSize", size); }}><option value="">Size</option>{RICH_SIZES.map(([size, label]) => <option key={size} value={size}>{label}</option>)}</select></label>
      {button("link", "Link", "Add a link", false, addLink)}
      {button("clear", "Clear", "Remove formatting", false, () => { run("removeFormat"); run("formatBlock", "p"); })}
    </div>
    <div ref={element} className="admin-rich-input" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder}
      onInput={emit}
      onBlur={emit}
      onKeyUp={readMarks}
      onMouseUp={readMarks}
      // Pasted markup is normalised through the same path as typed text so that
      // Word and browser cruft never reaches the sanitiser.
      onPaste={(event) => { event.preventDefault(); const html = event.clipboardData.getData("text/html"); const plain = event.clipboardData.getData("text/plain"); if (html) document.execCommand("insertHTML", false, normalizeRichText(html)); else document.execCommand("insertText", false, plain); emit(); }}
    /></div>;
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
  const [contentFilters, setContentFilters] = useState<ContentFilters>(EMPTY_CONTENT_FILTERS);

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
      const result = await readResponse(response);
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
  // overwrite the newer section's list a leaving, say, content rows on the
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
    const searched = needle ? searchable.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.item) : items;
    if (active !== "content") return searched;
    const childIds = new Set(topics.filter((topic) => String(topic.parent_id ?? "") === contentFilters.major).map((topic) => String(topic.id)));
    const dateOf = (value: unknown) => typeof value === "string" ? value.slice(0, 10) : "";
    return searched.filter((item) => {
      const ids = Array.isArray(item.content_topics) ? item.content_topics.flatMap((entry) => typeof entry === "object" && entry ? [String((entry as RecordItem).topic_id)] : []) : [];
      const date = dateOf(item.published_at);
      return (!contentFilters.major || ids.includes(contentFilters.major) || ids.some((id) => childIds.has(id))) && (!contentFilters.subtopic || ids.includes(contentFilters.subtopic)) && (!contentFilters.status || item.status === contentFilters.status) && (!contentFilters.access || item.access_level === contentFilters.access) && (!contentFilters.from || date >= contentFilters.from) && (!contentFilters.to || date <= contentFilters.to);
    }).sort((a, b) => {
      const field = contentFilters.sort === "updated_desc" ? "updated_at" : "published_at";
      return (contentFilters.sort === "published_asc" ? 1 : -1) * String(a[field] ?? "").localeCompare(String(b[field] ?? ""));
    });
  }, [active, contentFilters, items, search, searchable, topics]);
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
    if (!window.confirm(`Delete a&S${String(item.title ?? item.name ?? item.display_name ?? "this item")}a? This cannot be undone.`)) return;
    try { const headers = await authHeaders(); const response = await fetch(`/api/admin/${active}?id=${encodeURIComponent(String(item.id))}`, { method: "DELETE", headers }); const result = await readResponse(response); if (!response.ok) throw new Error(errorMessage(result.error, "Could not delete this item.")); setNotice("Deleted."); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete this item."); }
  }
  async function signOut() { await getSupabaseBrowserClient().auth.signOut(); window.location.assign("/en/sign-in"); }

  if (access === "checking" && !identity) return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Checking your access...</h1><p>Restoring your staff session.</p></main>;
  if (access === "signed_out") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Sign in to continue</h1><p>{accessMessage}</p><Link className="btn btn-primary" href="/en/sign-in">Sign in</Link></main>;
  if (access === "denied") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Admin access required</h1><p>{accessMessage}</p><div className="admin-access-actions"><button className="btn btn-primary" type="button" onClick={() => { setAccess("checking"); void load("overview"); }}>Try again</button><button className="btn btn-outline" type="button" onClick={signOut}>Sign in as another account</button></div></main>;
  if (access === "unavailable") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>We could not verify your access</h1><p>{accessMessage}</p><div className="admin-access-actions"><button className="btn btn-primary" type="button" onClick={() => { setAccess("checking"); void load("overview"); }}>Try again</button><button className="btn btn-outline" type="button" onClick={signOut}>Sign in again</button></div></main>;
  return <main className="admin-shell"><aside className="admin-sidebar"><Link className="admin-brand" href="/en"><img className="admin-logo" src="/sst-mark.png" alt=""/><span className="admin-brand-copy"><b>Smart Surgical Team</b><small>Admin</small></span></Link><div className="admin-owner"><span>{String(identity?.full_name ?? identity?.name ?? "Owner").split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><div><b>{String(identity?.full_name ?? identity?.name ?? "Smart Surgical Team")}</b><small>{String(identity?.role ?? "owner").replace(/_/g, " ")}</small></div></div><nav aria-label="Admin sections">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "is-active" : ""} type="button" onClick={() => { setActive(id); setEditing(null); setSearch(""); }}><Icon size={18}/>{label}</button>)}</nav><button className="admin-signout" type="button" onClick={signOut}>Sign out</button></aside><section className="admin-main"><header className="admin-topbar"><div><span className="admin-kicker">Content operations</span><h1>{nav.find((item) => item.id === active)?.label}</h1></div>{["content", "topics", "events", "contributors"].includes(active) && <button className="btn btn-primary" type="button" onClick={startNew}><IconPlus size={17}/> Add {active === "content" ? "content" : active === "events" ? "event" : active.slice(0, -1)}</button>}</header>{notice && <p className="admin-notice" role="status"><IconCheck size={17}/>{notice}</p>}{loading ? <div className="admin-loading">Loading workspace...</div> : <>{active === "overview" ? <Overview metrics={metrics} setActive={setActive}/> : editing ? <Editor section={active} value={editing} topics={topics} contributors={contributors} onCancel={() => setEditing(null)} onSave={save}/> : <List section={active} items={filtered} search={search} setSearch={setSearch} topics={topics} filters={contentFilters} setFilters={setContentFilters} onEdit={setEditing} onDelete={remove}/>}</>}</section></main>;
}

function Overview({ metrics, setActive }: { metrics: RecordItem; setActive: (section: Section) => void }) {
  const cards: { key: string; label: string; section: Section }[] = [{ key: "published", label: "Published items", section: "content" }, { key: "drafts", label: "Drafts & unpublishing", section: "content" }, { key: "events", label: "Published events", section: "events" }, { key: "contributors", label: "Contributors", section: "contributors" }, { key: "members", label: "Members", section: "people" }, { key: "messages", label: "Inbox messages", section: "messages" }];
  return <div className="admin-overview"><section className="admin-welcome"><div><span className="admin-kicker">Control room</span><h2>Keep the platform current, carefully.</h2><p>Publish case articles, update the team, and keep events and learning material accurate from one place.</p></div><button className="btn btn-primary" type="button" onClick={() => setActive("content")}>Create a case article <IconArrowRight size={17}/></button></section><div className="admin-metric-grid">{cards.map((card) => <button type="button" onClick={() => setActive(card.section)} key={card.key}><strong>{String(metrics[card.key] ?? 0)}</strong><span>{card.label}</span><IconArrowRight size={16}/></button>)}</div><section className="admin-safety"><h2>Clinical publishing reminder</h2><p>Only publish material that has been de-identified, consented, and approved by the team. Articles are public unless you select Site users only in the content editor.</p></section></div>;
}

function List({ section, items, search, setSearch, topics, filters, setFilters, onEdit, onDelete }: { section: Section; items: RecordItem[]; search: string; setSearch: (value: string) => void; topics: RecordItem[]; filters: ContentFilters; setFilters: (filters: ContentFilters) => void; onEdit: (item: RecordItem) => void; onDelete: (item: RecordItem) => void }) {
  const isMessages = section === "messages";
  const majors = topics.filter((topic) => !topic.parent_id);
  const subtopics = topics.filter((topic) => String(topic.parent_id ?? "") === filters.major);
  const change = (key: keyof ContentFilters, value: string) => setFilters({ ...filters, [key]: value, ...(key === "major" ? { subtopic: "" } : {}) });
  return <div className="admin-list"><div className="admin-list-controls"><label><IconSearch size={17}/><span className="visually-hidden">Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${section}...`}/></label><span>{items.length} items</span></div>{section === "content" ? <div className="admin-content-filters"><label>Topic<select value={filters.major} onChange={(event) => change("major", event.target.value)}><option value="">All topics</option>{majors.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.name)}</option>)}</select></label><label>Subtopic<select value={filters.subtopic} disabled={!filters.major} onChange={(event) => change("subtopic", event.target.value)}><option value="">All subtopics</option>{subtopics.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.name)}</option>)}</select></label><label>Status<select value={filters.status} onChange={(event) => change("status", event.target.value)}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label><label>Access<select value={filters.access} onChange={(event) => change("access", event.target.value)}><option value="">All access</option><option value="public">Public</option><option value="members_only">Members only</option></select></label><label>From<input type="date" value={filters.from} onChange={(event) => change("from", event.target.value)}/></label><label>To<input type="date" value={filters.to} onChange={(event) => change("to", event.target.value)}/></label><label>Order<select value={filters.sort} onChange={(event) => change("sort", event.target.value)}><option value="published_desc">Newest published</option><option value="published_asc">Oldest published</option><option value="updated_desc">Recently updated</option></select></label><button type="button" onClick={() => setFilters(EMPTY_CONTENT_FILTERS)}>Clear filters</button></div> : null}<div className="admin-table">{items.map((item) => <article key={String(item.id)}><div className="admin-item-main"><span className={`admin-status is-${String(item.status ?? "default")}`}>{String(item.status ?? "active")}</span><h2>{String(item.title ?? item.name ?? item.display_name ?? item.email ?? "Untitled")}</h2><p>{String(item.summary ?? item.description ?? item.message ?? "No additional detail.")}</p></div><div className="admin-item-meta">{section === "content" && <span>{item.published_at ? new Date(String(item.published_at)).toLocaleDateString() : "Not published"}</span>}{!isMessages && <div><button type="button" onClick={() => onEdit(item)}>Edit</button>{section !== "people" && <button className="admin-delete" type="button" onClick={() => onDelete(item)}>Delete</button>}</div>}</div></article>)}</div></div>;
}
function Editor({ section, value, topics, contributors, onCancel, onSave }: { section: Section; value: RecordItem; topics: RecordItem[]; contributors: RecordItem[]; onCancel: () => void; onSave: (value: RecordItem) => void }) {
  const [form, setForm] = useState<RecordItem>(() => ({ ...value, topic_ids: Array.isArray(value.content_topics) ? value.content_topics.flatMap((row) => typeof row === "object" && row ? [String((row as RecordItem).topic_id)] : []) : value.topic_ids ?? [], contributor_ids: Array.isArray(value.content_contributors) ? value.content_contributors.flatMap((row) => typeof row === "object" && row ? [String((row as RecordItem).contributor_id)] : []) : value.contributor_ids ?? (value.contributor_id ? [String(value.contributor_id)] : []), chapters: Array.isArray(value.content_chapters) ? value.content_chapters : value.chapters ?? [], content_media: Array.isArray(value.content_media) ? value.content_media : [] }));
  const [uploading, setUploading] = useState(false);
  // A rejected upload used to throw out of an event handler with no catch: the
  // spinner stopped and the editor said nothing at all.
  const [uploadError, setUploadError] = useState("");
  const set = (key: string, next: unknown) => setForm((current) => ({ ...current, [key]: next }));
  async function upload(file: File) { if (file.size > 10 * 1024 * 1024) { setUploadError("Choose a file no larger than 10 MB."); return; } setUploading(true); try { const token = await accessToken(); const body = new FormData(); body.append("file", file); const topicId = (form.topic_ids as string[] | undefined)?.[0]; const topicSlug = topics.find((topic) => String(topic.id) === topicId)?.slug; if (typeof topicSlug === "string") body.append("topicSlug", topicSlug); if (typeof form.title === "string") body.append("caseSlug", form.title); const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` }, body }); const result = await readResponse(response); if (!response.ok) throw new Error(errorMessage(result.error, "Could not upload this file.")); const path = typeof result.path === "string" ? result.path : ""; const publicUrl = typeof result.publicUrl === "string" ? result.publicUrl : ""; const kind = result.kind === "document" ? "document" : result.kind === "image" ? "image" : null; if (!path || !publicUrl || !kind) throw new Error("The upload service returned an incomplete file record."); setUploadError(""); setForm((current) => ({ ...current, content_media: [...(Array.isArray(current.content_media) ? current.content_media as Media[] : []), { storage_path: path, public_url: publicUrl, kind, alt_text: "", caption: "" }] })); } catch (error) { setUploadError(error instanceof Error ? error.message : "Could not upload this file."); } finally { setUploading(false); } }
  function submit(event: FormEvent) { event.preventDefault(); onSave({ ...form, media: form.content_media }); }
  if (section === "content") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit content" : "New content"} onCancel={onCancel}/><div className="admin-editor-grid"><section><Field label="Title" value={form.title} onChange={(value) => set("title", value)} required/><Field label="Card summary" type="textarea" value={form.summary} onChange={(value) => set("summary", value)} required/><div className="admin-field-grid"><Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive'],['scheduled','Schedule']]}/><Select label="Visibility" value={form.access_level} onChange={(value) => set("access_level", value)} options={[['public','Public'],['members_only','Site users only']]}/></div>{form.status === "scheduled" && <Field label="Publish on" type="datetime-local" value={form.scheduled_for} onChange={(value) => set("scheduled_for", value)}/>}<TopicPicker topics={topics} value={(form.topic_ids as string[]) ?? []} onChange={(ids) => set("topic_ids", ids)}/><ContributorPicker contributors={contributors} value={(form.contributor_ids as string[]) ?? []} onChange={(ids) => set("contributor_ids", ids)}/><div className="admin-field-grid"><Field label="Video URL (optional)" hint="Paste a YouTube watch or share link, or a direct .mp4/.webm file URL." type="url" value={form.video_url} onChange={(value) => set("video_url", value)}/><Select label="Clinical level" value={form.level ?? "Clinical education"} onChange={(value) => set("level", value)} options={clinicalLevelOptions(form.level)}/></div><CaseFields form={form} set={set}/></section><aside><MediaManager media={(form.content_media as Media[]) ?? []} setMedia={(media) => set("content_media", media)} upload={upload} uploading={uploading} error={uploadError}/><ThumbnailPicker media={(form.content_media as Media[]) ?? []} source={form.thumbnail_source === "image" ? "image" : "youtube"} selectedPath={String(form.thumbnail_media_path ?? "")} onSource={(source) => set("thumbnail_source", source)} onSelect={(path) => set("thumbnail_media_path", path)}/><Chapters chapters={(form.chapters as { title: string; starts_at_seconds: number }[]) ?? []} setChapters={(chapters) => set("chapters", chapters)}/></aside></div></form>;
  if (section === "topics") return <SimpleEditor title={form.id ? "Edit topic" : "New topic"} fields={[['name','Topic name'],['description','Description'],['sort_order','Display order']]} form={form} set={set} onCancel={onCancel} onSave={submit} topics={topics}/>;
  if (section === "events") return <SimpleEditor title={form.id ? "Edit event" : "New event or webinar"} fields={[['title','Title'],['summary','Summary'],['event_type','Type'],['topic','Topic'],['format','Attendance format'],['status','Status'],['starts_at','Starts at'],['ends_at','Ends at'],['location','Location'],['image_url','Image URL'],['official_url','Official URL'],['registration_url','Registration URL'],['programme_url','Programme URL'],['faculty_url','Faculty page URL'],['highlights','Programme highlights']]} form={{ ...form, highlights: Array.isArray(form.highlights) ? form.highlights.join("\n") : form.highlights }} set={set} onCancel={onCancel} onSave={submit}/>;
  if (section === "people") return <form className="admin-editor admin-simple-editor" onSubmit={submit}><EditorHead title={`Manage ${String(form.full_name ?? form.email)}`} onCancel={onCancel}/><div className="admin-simple-fields"><Field label="Email" value={form.email} onChange={() => {}}/><Select label="Platform role" value={form.role} onChange={(value) => set("role", value)} options={[['owner','Owner'],['content_manager','Content manager'],['editor','Editor'],['contributor','Contributor'],['member','Member']]}/><p className="admin-role-note">Only the Owner can change roles. The designated Owner account cannot be downgraded here.</p></div></form>;
  return <SimpleEditor title={form.id ? "Edit contributor" : "New contributor"} fields={[['display_name','Full name'],['credentials','Credentials'],['role_title','Role'],['group_name','Team group'],['photo_url','Portrait URL'],['biography','Biography'],['sort_order','Display order']]} form={form} set={set} onCancel={onCancel} onSave={submit}/>;
}

// Contributors are picked from a checklist rather than a multi-select: the old
// list needed Ctrl-click to add a second name, and a plain click silently
// replaced the whole selection.
function ContributorPicker({ contributors, value, onChange }: { contributors: RecordItem[]; value: string[]; onChange: (ids: string[]) => void }) {
  const selected = value.filter((id) => contributors.some((person) => String(person.id) === id));
  const nameOf = (id: string) => String(contributors.find((person) => String(person.id) === id)?.display_name ?? "");
  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...selected, id] : selected.filter((entry) => entry !== id));
  }
  return <section className="admin-topic-picker">
    <span className="admin-label-text">Contributors</span>
    {contributors.length
      ? <div className="admin-subtopic-grid">{contributors.map((person) => <label className="admin-checkbox" key={String(person.id)}><input type="checkbox" checked={selected.includes(String(person.id))} onChange={(event) => toggle(String(person.id), event.target.checked)}/>{String(person.display_name)}</label>)}</div>
      : <small>No contributors have been added yet. Create them under a&SContributorsa.</small>}
    <p className="admin-picker-summary">{selected.length ? <>Credited: {selected.map(nameOf).filter(Boolean).join(", ")}. <b>{nameOf(selected[0])}</b> is the lead author.</> : "Nobody selected a this will be credited to Smart Surgical Team."}</p>
  </section>;
}

function TopicPicker({ topics, value, onChange }: { topics: RecordItem[]; value: string[]; onChange: (ids: string[]) => void }) {
  const majors = topics.filter((topic) => !topic.parent_id);
  const parentOf = (id: string) => topics.find((topic) => String(topic.id) === id)?.parent_id;
  const inferredMajor = value.map((id) => (majors.some((major) => String(major.id) === id) ? id : parentOf(id))).find(Boolean);
  const [majorId, setMajorId] = useState<string>(String(inferredMajor ?? majors[0]?.id ?? ""));
  const subTopics = topics.filter((topic) => topic.parent_id != null && String(topic.parent_id) === majorId);
  const selectedSubIds = value.filter((id) => subTopics.some((topic) => String(topic.id) === id));

  // The picker shows a major topic from the moment it opens, so an item saved
  // without touching it must actually be filed there a otherwise it belongs to
  // no topic and never appears in any public list.
  useEffect(() => { if (!value.length && majorId) onChange([majorId]); }, [majorId, value.length, onChange]);

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
function CaseFields({ form, set }: { form: RecordItem; set: (key: string, value: unknown) => void }) { const fields = [['case_presentation','Patient presentation'],['case_imaging','Imaging & workup'],['case_procedure','Surgical management'],['case_histopathology','Histopathology'],['case_outcome','Outcome & follow-up']]; return <section className="admin-case-fields"><h2>Structured case record</h2><p>Every section is optional. Add only reviewed, de-identified material.</p>{fields.map(([key, label]) => <div className="admin-label" key={key}><span className="admin-label-text">{label}</span><RichEditor value={String(form[key] ?? "")} onChange={(value) => set(key, value)} placeholder={`Write the ${label.toLowerCase()}...`}/></div>)}</section>; }
function MediaManager({ media, setMedia, upload, uploading, error }: { media: Media[]; setMedia: (value: Media[]) => void; upload: (file: File) => void; uploading: boolean; error?: string }) { return <section className="admin-media"><h2>Images & PDFs</h2><p>Add a cover image, in-article images, or a downloadable PDF. Maximum file size: 10 MB.</p><label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}/><IconPlus size={18}/>{uploading ? "Uploading..." : "Upload file"}</label>{error && <p className="admin-upload-error" role="alert">{error}</p>}{media.map((item, index) => <div className="admin-media-item" key={item.storage_path}>{item.kind === "image" ? <a className="admin-media-preview" href={item.public_url} target="_blank" rel="noreferrer" aria-label="Open image preview"><img src={item.public_url} alt={item.alt_text || "Uploaded image preview"}/></a> : <span>PDF</span>}<div><input value={item.alt_text ?? ""} onChange={(event) => setMedia(media.map((entry, position) => position === index ? { ...entry, alt_text: event.target.value } : entry))} placeholder="Alt text / file description"/>{item.kind === "image" && <a href={item.public_url} target="_blank" rel="noreferrer">Open preview</a>}</div><button type="button" onClick={() => setMedia(media.filter((_, position) => position !== index))}>Remove</button></div>)}</section>; }
function ThumbnailPicker({ media, source, selectedPath, onSource, onSelect }: { media: Media[]; source: "youtube" | "image"; selectedPath: string; onSource: (source: "youtube" | "image") => void; onSelect: (path: string) => void }) { const images = media.filter((item) => item.kind === "image"); return <section className="admin-media admin-thumbnail-picker"><h2>Topic card thumbnail</h2><p>Choose the YouTube thumbnail, or one of this itema~s uploaded images.</p><label className="admin-checkbox"><input type="radio" name="thumbnail-source" checked={source === "youtube"} onChange={() => onSource("youtube")}/>Use YouTube thumbnail</label><label className="admin-checkbox"><input type="radio" name="thumbnail-source" checked={source === "image"} onChange={() => onSource("image")} disabled={!images.length}/>Use uploaded image</label>{source === "image" && (images.length ? <div className="admin-thumbnail-options">{images.map((item) => <label key={item.storage_path}><input type="radio" name="thumbnail-image" checked={selectedPath === item.storage_path} onChange={() => onSelect(item.storage_path)}/><img src={item.public_url} alt={item.alt_text || "Uploaded image"}/></label>)}</div> : <p className="admin-upload-error">Upload an image first, then select it here.</p>)}</section>; }
function Chapters({ chapters, setChapters }: { chapters: { title: string; starts_at_seconds: number }[]; setChapters: (chapters: { title: string; starts_at_seconds: number }[]) => void }) { return <section className="admin-chapters"><div><h2>Video chapters</h2><button type="button" onClick={() => setChapters([...chapters, { title: "", starts_at_seconds: 0 }])}>Add chapter</button></div>{chapters.length ? chapters.map((chapter, index) => <div className="admin-chapter" key={index}><input value={chapter.title} onChange={(event) => setChapters(chapters.map((entry, position) => position === index ? { ...entry, title: event.target.value } : entry))} placeholder="Chapter title"/><input type="number" value={chapter.starts_at_seconds} onChange={(event) => setChapters(chapters.map((entry, position) => position === index ? { ...entry, starts_at_seconds: Number(event.target.value) } : entry))} aria-label="Start time in seconds"/><button type="button" onClick={() => setChapters(chapters.filter((_, position) => position !== index))}></button></div>) : <p>No chapters added.</p>}</section>; }
// Saving lives in the header, and the header sticks: long case records used to
// hide the only save button several screens below the fold.
function EditorHead({ title, onCancel }: { title: string; onCancel: () => void }) { return <div className="admin-editor-head"><div><span className="admin-kicker">Content editor</span><h2>{title}</h2></div><div className="admin-editor-actions"><button className="btn btn-primary" type="submit">Save changes <IconArrowRight size={17}/></button><button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button></div></div>; }
function Field({ label, value, onChange, type = "text", hint, required = false }: { label: string; value: unknown; onChange: (value: string) => void; type?: string; hint?: string; required?: boolean }) { return <label className="admin-label">{label}{type === "textarea" ? <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required}/> : <input type={type} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required}/>} {hint && <small>{hint}</small>}</label>; }
function Select({ label, value, onChange, options }: { label: string; value: unknown; onChange: (value: string) => void; options: string[][] }) { return <label className="admin-label">{label}<select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function SimpleEditor({ title, fields, form, set, onCancel, onSave, topics }: { title: string; fields: string[][]; form: RecordItem; set: (key: string, value: unknown) => void; onCancel: () => void; onSave: (event: FormEvent) => void; topics?: RecordItem[] }) { return <form className="admin-editor admin-simple-editor" onSubmit={onSave}><EditorHead title={title} onCancel={onCancel}/><div className="admin-simple-fields">{fields.map(([key, label]) => <Field key={key} label={label} hint={key === "highlights" ? "One highlight per line." : undefined} type={key === "summary" || key === "description" || key === "biography" || key === "highlights" ? "textarea" : key.includes("_at") ? "datetime-local" : key.includes("url") ? "url" : key === "sort_order" ? "number" : "text"} value={form[key]} onChange={(value) => set(key, value)}/>) }{topics && <label className="admin-label">Parent topic<select value={String(form.parent_id ?? "")} onChange={(event) => set("parent_id", event.target.value)}><option value="">No parent (top-level topic)</option>{topics.filter((topic) => topic.id !== form.id).map((topic) => <option value={String(topic.id)} key={String(topic.id)}>{String(topic.name)}</option>)}</select></label>}</div></form>; }
