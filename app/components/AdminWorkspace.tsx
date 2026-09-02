"use client";

import { FormEvent, MouseEvent as ReactMouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconCheck, IconFile, IconLayers, IconPlus, IconSearch } from "./icons";

// The sections the sidebar offers. Contributors and People & roles were retired
// from the workspace: roles are changed directly in Supabase, and the two topic
// taxonomies are now edited inline from the editors that use them.
type Section = "overview" | "content" | "posters" | "events" | "research" | "news";
// The taxonomies are still read and written through the same admin API; they
// simply no longer have a screen of their own. News categories behave the same
// way: they are managed from inside the news editor that files items under them.
type Taxonomy = "topics" | "research-topics";
type ManagedList = Taxonomy | "news-categories";
type Resource = Section | ManagedList | "contributors";
type Access = "checking" | "signed_out" | "denied" | "unavailable" | "ready";
const ADMIN_REQUEST_TIMEOUT_MS = 12_000;
class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
type RecordItem = Record<string, unknown>;
type ContentItem = RecordItem & { id?: string; title?: string; status?: string; kind?: string; access_level?: string; is_teaching?: boolean; topic_ids?: string[]; chapters?: { title: string; starts_at_seconds: number }[]; content_media?: Media[] };
// `file` and `local_id` are client-only: a picked-but-not-yet-uploaded image
// carries its File and a temporary id, and its `public_url` is an object URL
// used only for the in-editor preview. Nothing reaches R2 until Save commits it.
type Media = { storage_path: string; public_url: string; kind: "image" | "document"; alt_text?: string; caption?: string; file?: File; local_id?: string };
// Every list an image can belong to. Keyed by the form field it is held in,
// which is also the name the record's own media table is filled from.
type MediaField = "content_media" | "research_media" | "news_media";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
type ContentFilters = { major: string; subtopic: string; status: string; access: string; from: string; to: string; sort: "published_desc" | "published_asc" | "updated_desc" };
const EMPTY_CONTENT_FILTERS: ContentFilters = { major: "", subtopic: "", status: "", access: "", from: "", to: "", sort: "published_desc" };
type ResearchFilters = { year: string; topic: string; status: string };
const EMPTY_RESEARCH_FILTERS: ResearchFilters = { year: "", topic: "", status: "" };
type NewsFilters = { category: string; status: string };
const EMPTY_NEWS_FILTERS: NewsFilters = { category: "", status: "" };

function asRecord(value: unknown): RecordItem {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordItem : {};
}

function asRecords(value: unknown): RecordItem[] {
  return Array.isArray(value) ? value.filter((item): item is RecordItem => item !== null && typeof item === "object" && !Array.isArray(item)) : [];
}

function errorMessage(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

// Rich-text fields (the research abstract, case sections) hold HTML; list
// previews want a clean one-line excerpt without the tags.
function plainText(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  { id: "posters", label: "Posters", icon: IconFile },
  { id: "research", label: "Research", icon: IconFile },
  { id: "news", label: "News", icon: IconFile },
  { id: "events", label: "Events & webinars", icon: IconPlus },
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

// The case record an editor sees. `key` decides which legacy column a built-in
// section still writes to and never changes when the label is renamed, so a
// section called "MDT outcome" keeps landing in `case_outcome`.
type CaseSection = { key: string; label: string; body: string };
const DEFAULT_CASE_SECTIONS: { key: string; label: string; column: string }[] = [
  { key: "presentation", label: "Presentation", column: "case_presentation" },
  { key: "imaging", label: "Imaging & workup", column: "case_imaging" },
  { key: "procedure", label: "Procedure", column: "case_procedure" },
  { key: "histopathology", label: "Histopathology", column: "case_histopathology" },
  { key: "outcome", label: "Outcome & follow-up", column: "case_outcome" },
];

// An item saved before custom sections existed has no `case_sections`; it is
// opened as the five defaults carrying whatever its legacy columns hold, so the
// first save migrates it without the editor noticing.
function initialCaseSections(value: RecordItem): CaseSection[] {
  const stored = Array.isArray(value.case_sections) ? value.case_sections : [];
  const restored = stored.flatMap((entry) => {
    const row = asRecord(entry);
    const label = typeof row.label === "string" ? row.label : "";
    return label ? [{ key: String(row.key || label.toLowerCase()), label, body: typeof row.body === "string" ? row.body : "" }] : [];
  });
  if (restored.length) return restored;
  return DEFAULT_CASE_SECTIONS.map(({ key, label, column }) => ({ key, label, body: String(value[column] ?? "") }));
}

// The record still carries the five legacy `case_*` fields it was loaded with.
// Restating them from the section list keeps them honest — otherwise deleting
// every section would leave the old column values behind on the row, and the
// case would come back from the dead on the public page.
function legacyCaseColumns(section: Section, form: RecordItem): RecordItem {
  if (section !== "content") return {};
  const sections = Array.isArray(form.case_sections) ? form.case_sections as CaseSection[] : [];
  return Object.fromEntries(DEFAULT_CASE_SECTIONS.map(({ key, column }) => [column, sections.find((entry) => entry.key === key)?.body ?? ""]));
}

// ---------------------------------------------------------------------------
// Importing an archived case from its `case.json`
//
// The team's existing archive stores one folder per case: a `case.json`
// describing the write-up, and the case's images beside it. The importer reads
// that file into the editor's fields and reports everything it could not use,
// so nothing is dropped silently. It never uploads anything: the images are
// listed by name for the editor to pick with the normal file chooser.
// ---------------------------------------------------------------------------
type CaseImport = { patch: RecordItem; applied: string[]; issues: string[] };

function escapeHtml(value: string) {
  return value.replace(/[&<>]/g, (character) => character === "&" ? "&amp;" : character === "<" ? "&lt;" : "&gt;");
}

// The archive stores each section's text as plain text with a tag hint. Blank
// lines become separate paragraphs and single newlines become breaks, so the
// imported body reads the way it did in the source.
function richTextFromPlain(value: string, tag: string): string {
  const block = ["h2", "h3", "blockquote"].includes(tag) ? tag : "p";
  const paragraphs = value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (!paragraphs.length) return "";
  if (tag === "li" || tag === "ul" || tag === "ol") {
    const list = tag === "ol" ? "ol" : "ul";
    return `<${list}>${paragraphs.map((part) => `<li>${escapeHtml(part).replace(/\n/g, "<br>")}</li>`).join("")}</${list}>`;
  }
  return paragraphs.map((part) => `<${block}>${escapeHtml(part).replace(/\n/g, "<br>")}</${block}>`).join("");
}

function readCaseJson(text: string, topics: RecordItem[]): CaseImport | { error: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { error: "That file is not valid JSON. Export it again, or open it in a text editor to check it." }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { error: "That JSON file does not describe a case (the top level must be an object)." };
  const source = parsed as RecordItem;
  const patch: RecordItem = {};
  const applied: string[] = [];
  const issues: string[] = [];
  const stringAt = (key: string) => typeof source[key] === "string" ? (source[key] as string).trim() : "";

  const title = stringAt("title");
  if (title) { patch.title = title; applied.push("Title"); } else issues.push("No “title” in the file — type one yourself; the case cannot be saved without it.");
  const summary = stringAt("summary");
  if (summary) { patch.summary = summary; applied.push("Card summary"); } else issues.push("No “summary” in the file — write the card summary yourself.");

  // Sections. `order` decides the sequence; entries with no text (the archive
  // uses an empty "Gallery" marker where the image strip went) are dropped.
  const rawSections = Array.isArray(source.sections_and_text) ? source.sections_and_text : [];
  if (!rawSections.length) issues.push("No “sections_and_text” list in the file — the case record was left as it is.");
  const ordered = rawSections
    .map((entry, index) => ({ entry: asRecord(entry), index }))
    .sort((a, b) => (Number(a.entry.order ?? a.index) - Number(b.entry.order ?? b.index)) || (a.index - b.index));
  const usedKeys = new Set<string>();
  const sections: CaseSection[] = [];
  // The archive writes a heading as its own entry with no text, and puts the
  // paragraphs and bullets that belong under it in the following entries, which
  // carry no heading of their own. Those are collected into the heading above
  // them rather than orphaned as "Section 12".
  let collecting: { section: CaseSection; heading: string; index: number } | null = null;
  const newKey = (name: string, index: number) => {
    // Two sections sharing a heading would share a key, and the second would
    // overwrite the first on save.
    let key = slugKey(name || `section-${index + 1}`);
    while (usedKeys.has(key)) key = `${key}-${usedKeys.size + 1}`;
    usedKeys.add(key);
    return key;
  };
  for (const { entry, index } of ordered) {
    const name = typeof entry.section_name === "string" ? entry.section_name.trim() : "";
    const content = typeof entry.content === "string" ? entry.content.trim() : "";
    const tag = typeof entry.tag === "string" ? entry.tag.toLowerCase() : "p";
    // A heading followed straight away by another heading is a grouping title
    // the flat section list cannot hold. Its text is not lost — everything
    // under it keeps its own heading — but say so, so it can be put back.
    if (name && collecting && !collecting.section.body) {
      issues.push(`“${collecting.heading}” is a heading with no text of its own; the sections that followed it were imported under their own headings. Add it back if you want it.`);
      sections.pop(); usedKeys.delete(collecting.section.key);
    }
    if (name) {
      const section = { key: newKey(name, index), label: name, body: content ? richTextFromPlain(content, tag) : "" };
      sections.push(section);
      // A heading that arrived with its own text is complete; only an empty one
      // keeps collecting what follows.
      collecting = content ? null : { section, heading: name, index };
      continue;
    }
    if (!content) continue;
    if (collecting) { collecting.section.body += richTextFromPlain(content, tag); continue; }
    issues.push(`Section ${index + 1} has no “section_name” — it was imported as “Section ${index + 1}”; give it a heading before saving.`);
    sections.push({ key: newKey("", index), label: `Section ${index + 1}`, body: richTextFromPlain(content, tag) });
    if (!["p", "h2", "h3", "blockquote", "li", "ul", "ol"].includes(tag)) issues.push(`Section ${index + 1} uses an unrecognised tag “${tag}” — its text was imported as paragraphs.`);
  }
  // A trailing heading with nothing under it (the archive's empty "Gallery"
  // marker, where the image strip used to sit).
  if (collecting && !collecting.section.body) {
    issues.push(`“${collecting.heading}” is a heading with nothing under it and was skipped.`);
    sections.pop();
  }
  if (sections.length) { patch.case_sections = sections; applied.push(`${sections.length} case section${sections.length === 1 ? "" : "s"}`); }

  const videoUrl = stringAt("youtube_url") || (stringAt("youtube_id") ? `https://www.youtube.com/watch?v=${stringAt("youtube_id")}` : "");
  if (videoUrl) { patch.video_url = videoUrl; applied.push("Video link"); }
  else if (source.has_video === true) issues.push("The file says this case has a video but gives no link — paste the video URL yourself.");

  const minutes = Number(String(source.reading_time ?? "").match(/\d+/)?.[0] ?? "");
  if (Number.isFinite(minutes) && minutes > 0) { patch.reading_minutes = minutes; applied.push("Reading time"); }

  // Everything below is reported rather than applied: it needs a decision the
  // file cannot make.
  const categories = Array.isArray(source.categories) ? source.categories.map((value) => String(value)) : [];
  if (categories.length) {
    const known = categories.filter((name) => topics.some((topic) => String(topic.name).toLowerCase() === name.toLowerCase()));
    issues.push(`Categories in the file (${categories.join(", ")}) were not applied${known.length ? ` — “${known.join("”, “")}” matches a topic you can select above` : ""}. Choose the topic and subtopics yourself.`);
  }
  const images = Array.isArray(source.images) ? source.images : [];
  if (images.length) issues.push(`${images.length} image${images.length === 1 ? " is" : "s are"} listed in the file. Images are not uploaded by the import — choose them with “Choose files”, from the same folder as this case.json, then drag them into the order the file lists.`);
  if (stringAt("published_date")) issues.push(`The file's publication date (${stringAt("published_date")}) was not applied — publishing sets the date.`);
  if (stringAt("source_url")) issues.push(`Source page: ${stringAt("source_url")}`);
  return { patch, applied, issues };
}

// Section keys are matched against the five built-in ones, so a file whose
// heading is "Histopathology" keeps writing to the legacy column.
function slugKey(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return slug || "section";
}

// Moving an item within a list, used by both the section list and the image
// order. Out-of-range targets are a no-op rather than a silent duplication.
function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

const emptyContent = (): ContentItem => ({ kind: "case_article", status: "published", access_level: "public", is_teaching: false, justify_body: true, title: "", slug: "", summary: "", level: "Clinical education", topic_ids: [], contributor_ids: [], chapters: [], content_media: [] });

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

// Google Docs and Word wrap whole passages in `<b style="font-weight:normal">`
// (and similar), which would otherwise turn every pasted paragraph bold. When a
// tag's own inline style cancels the emphasis it stands for, keep the text but
// drop the emphasis. Real bold/italic/underline carry no such reset and survive.
function emphasisSuppressed(element: HTMLElement, mapped: string) {
  const style = element.getAttribute("style") ?? "";
  if (mapped === "strong") return /font-weight:\s*(normal|lighter|[1-5]0?0)\b/i.test(style);
  if (mapped === "em") return /font-style:\s*normal\b/i.test(style);
  if (mapped === "u") return /text-decoration[^;]*:\s*none\b/i.test(style);
  return false;
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
  if (mapped && !(mapped === "p" && hasBlockChild(source)) && !emphasisSuppressed(source, mapped)) {
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
  // Word and Google Docs carry their source indentation and leading &nbsp; into
  // the fragment as real characters, which show up as stray spaces in front of a
  // paste. Collapse non-breaking spaces to ordinary ones and trim the very start
  // of the content so a paste begins flush like typed text.
  const firstText = document.createTreeWalker(output, NodeFilter.SHOW_TEXT).nextNode();
  output.querySelectorAll("*").forEach((el) => { if (el.childNodes.length === 0 && !/^(br|img|hr)$/i.test(el.tagName)) el.remove(); });
  if (firstText) firstText.nodeValue = (firstText.nodeValue ?? "").replace(/ /g, " ").replace(/^\s+/, "");
  return output.innerHTML.replace(/&nbsp;/g, " ");
}

// `body` holds markup, so an untouched editor is rarely the empty string — a
// browser leaves `<p></p>` or `<br>` behind. Testing the markup with `.trim()`
// called an empty section "written" and sent it down the confirm path.
function richTextHasContent(html: string) {
  if (!html.trim()) return false;
  if (typeof document === "undefined") return Boolean(html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());
  const probe = document.createElement("div");
  probe.innerHTML = html;
  return Boolean((probe.textContent ?? "").replace(/ /g, " ").trim()) || Boolean(probe.querySelector("img"));
}

function commandState(command: string) {
  try { return document.queryCommandState(command); } catch { return false; }
}

function blockName() {
  try { return String(document.queryCommandValue("formatBlock") || "p").toLowerCase(); } catch { return "p"; }
}

function RichEditor({ value, onChange, placeholder = "Write the supporting detail...", dir }: { value: string; onChange: (value: string) => void; placeholder?: string; dir?: "auto" }) {
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
    <div ref={element} className="admin-rich-input" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder} dir={dir}
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
  // The research topic tree, loaded alongside the papers so the editor can
  // offer it and the list can filter by it.
  const [researchTopics, setResearchTopics] = useState<RecordItem[]>([]);
  // The news category list, loaded alongside the items so the editor can offer
  // it and the list can filter by it.
  const [newsCategories, setNewsCategories] = useState<RecordItem[]>([]);
  const [contributors, setContributors] = useState<RecordItem[]>([]);
  const [metrics, setMetrics] = useState<RecordItem>({});
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [notice, setNotice] = useState<string>("");
  // A warning must not arrive wearing the green tick that means "all done".
  const [noticeTone, setNoticeTone] = useState<"ok" | "warn">("ok");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contentFilters, setContentFilters] = useState<ContentFilters>(EMPTY_CONTENT_FILTERS);
  const [researchFilters, setResearchFilters] = useState<ResearchFilters>(EMPTY_RESEARCH_FILTERS);
  const [newsFilters, setNewsFilters] = useState<NewsFilters>(EMPTY_NEWS_FILTERS);

  // False once the server reports that `content_items.case_sections` is missing
  // (migration 0010 not applied): renamed headings and added sections cannot be
  // stored, and the editor says so rather than letting a save quietly lose them.
  const [caseSectionsStorable, setCaseSectionsStorable] = useState(true);
  const [access, setAccess] = useState<Access>("checking");
  const [accessMessage, setAccessMessage] = useState("");

  async function authHeaders() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${(await accessToken()) ?? ""}` };
  }
  async function request(resource: Resource, init?: RequestInit): Promise<RecordItem> {
    const headers = await authHeaders();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ADMIN_REQUEST_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort();
    init?.signal?.addEventListener("abort", abortFromCaller, { once: true });
    try {
      const apiResource = resource === "posters" ? "content" : resource;
      const response = await fetch(`/api/admin/${apiResource}`, { ...init, signal: controller.signal, headers: { ...headers, ...(init?.headers ?? {}) } });
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
    setLoading(true); setNotice(""); setNoticeTone("ok");
    try {
      if (resource === "overview" && !(await accessToken())) { if (current()) { setAccess("signed_out"); setAccessMessage("Sign in with your staff account to open the workspace."); } return; }
      const result = await request(resource);
      if (!current()) return;
      if (resource === "overview") { setIdentity(asRecord(result.identity)); setMetrics(asRecord(result.metrics)); setAccess("ready"); }
      else {
        const rows = asRecords(result.data);
        setItems(resource === "posters" ? rows.filter((item) => item.kind === "poster") : resource === "content" ? rows.filter((item) => item.kind !== "poster") : rows);
        if (resource === "content" || resource === "posters") {
          setCaseSectionsStorable(asRecord(result.capabilities).caseSections !== false);
          // Poster records use contributors but do not belong to a surgical topic.
          const [topicResult, contributorResult] = resource === "content"
            ? await Promise.all([request("topics"), request("contributors")])
            : [{ data: [] }, await request("contributors")];
          if (!current()) return;
          setTopics(asRecords(topicResult.data)); setContributors(asRecords(contributorResult.data));
        }
        // The paper editor files a paper into this tree, so the two lists have
        // to arrive together or the topic selects open empty.
        if (resource === "research") {
          const topicResult = await request("research-topics");
          if (!current()) return;
          setResearchTopics(asRecords(topicResult.data));
        }
        // News items are filed under a category, so the two lists have to
        // arrive together or the category select opens empty.
        if (resource === "news") {
          const categoryResult = await request("news-categories");
          if (!current()) return;
          setNewsCategories(asRecords(categoryResult.data));
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
      } else {
        // A failed section load used to leave the previous section's rows on
        // screen: the list showed, say, content items under News, where Edit
        // opened them in the wrong editor and Delete addressed the wrong table.
        // An unreadable section shows nothing but its reason.
        setItems([]);
        setNotice(message); setNoticeTone("warn");
      }
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
    () => items.map((item) => ({ item, haystack: ["title", "title_ar", "name", "display_name", "slug", "summary", "kind", "status", "level", "email", "full_name", "topic", "event_type", "location", "authors", "journal", "category", "link_url"].map((key) => typeof item[key] === "string" ? item[key] as string : "").join(" ").toLowerCase() })),
    [items],
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const searched = needle ? searchable.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.item) : items;
    if (active === "research") {
      return searched.filter((item) => {
        const year = String(item.published_date ?? "").slice(0, 4);
        return (!researchFilters.year || year === researchFilters.year)
          && (!researchFilters.topic || item.topic_id === researchFilters.topic)
          && (!researchFilters.status || item.status === researchFilters.status);
      }).sort((a, b) => {
        // Newly added research (no publication date yet) sits on top, then by
        // publication date, newest first, then by most recently touched.
        const da = String(a.published_date ?? ""), db = String(b.published_date ?? "");
        if (da !== db) { if (!da) return -1; if (!db) return 1; return db.localeCompare(da); }
        return String(b.updated_at ?? b.created_at ?? "").localeCompare(String(a.updated_at ?? a.created_at ?? ""));
      });
    }
    if (active === "news") {
      return searched.filter((item) => (!newsFilters.category || String(item.category_id ?? "") === newsFilters.category) && (!newsFilters.status || item.status === newsFilters.status))
        .sort((a, b) => {
          // A pinned item is what the homepage is showing right now, so it sits
          // on top where it can be found and unpinned. Then undated drafts,
          // then by publication date, newest first.
          if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
          const da = String(a.published_at ?? ""), db = String(b.published_at ?? "");
          if (da !== db) { if (!da) return -1; if (!db) return 1; return db.localeCompare(da); }
          return String(b.updated_at ?? b.created_at ?? "").localeCompare(String(a.updated_at ?? a.created_at ?? ""));
        });
    }
    if (active === "posters") return searched.sort((a, b) => String(b.published_at ?? b.created_at ?? "").localeCompare(String(a.published_at ?? a.created_at ?? "")));
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
  }, [active, contentFilters, researchFilters, newsFilters, items, search, searchable, topics]);
  function startNew() {
    if (active === "content") setEditing(emptyContent());
    else if (active === "posters") setEditing({ kind: "poster", status: "published", access_level: "public", justify_body: true, title: "", slug: "", summary: "", level: "Clinical poster", poster_url: "", poster_cta_text: "", poster_cta_url: "", contributor_ids: [], case_sections: [{ key: "overview", label: "Overview", body: "" }, { key: "findings", label: "Key findings", body: "" }] });
    else if (active === "research") setEditing({ title: "", authors: "", abstract: "", journal: "", status: "published", justify_body: true, published_date: "", link: "", topic_id: "", subtopic_id: "", research_media: [] });
    else if (active === "events") setEditing({ title: "", slug: "", event_type: "Webinar", format: "online", status: "published" });
    // A new item starts as a draft with today's date and one empty section: the
    // commonest news item is a short written announcement, and a press item
    // simply removes the section and pastes a link instead.
    else if (active === "news") setEditing({ title: "", title_ar: "", slug: "", summary: "", summary_ar: "", category_id: String(newsCategories[0]?.id ?? ""), status: "draft", justify_body: true, published_at: new Date().toISOString().slice(0, 10), link_url: "", cover_media_path: "", pinned: false, related_type: "", related_ref: "", body: [{ key: "story", label: "The story", body: "" }], body_ar: [], news_media: [] });
    else setEditing(null);
  }
  async function save(value: RecordItem): Promise<boolean> {
    try {
      const payload = active === "posters" ? { ...value, kind: "poster", access_level: "public" } : value;
      const result = await request(active, { method: "POST", body: JSON.stringify(payload) });
      const warning = typeof result.warning === "string" ? result.warning : "";
      setNotice(warning || "Saved. The public site will reflect published changes without a code release."); setNoticeTone(warning ? "warn" : "ok");
      setEditing(null); await load();
      return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save this item."); setNoticeTone("warn"); return false; }
  }
  async function remove(item: RecordItem) {
    // The list's Delete button confirms in-page before calling this.
    try { const headers = await authHeaders(); const apiResource = active === "posters" ? "content" : active; const response = await fetch(`/api/admin/${apiResource}?id=${encodeURIComponent(String(item.id))}`, { method: "DELETE", headers }); const result = await readResponse(response); if (!response.ok) throw new Error(errorMessage(result.error, "Could not delete this item.")); const warning = typeof result.warning === "string" ? result.warning : ""; setNotice(warning || "Deleted, including its images."); setNoticeTone(warning ? "warn" : "ok"); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete this item."); setNoticeTone("warn"); }
  }
  async function signOut() { await getSupabaseBrowserClient().auth.signOut(); window.location.assign("/en/sign-in"); }

  // Subtopics are edited from inside the editor that uses them, so the taxonomy
  // writes are handed down rather than driven by a section of their own. The
  // reload afterwards is what makes a rename appear immediately in the picker,
  // the list filters and — once the API has expired the public cache tag — every
  // card and filter on the site.
  const taxonomy: TaxonomyAdmin = {
    async save(resource, payload) { await request(resource, { method: "POST", body: JSON.stringify(payload) }); },
    async remove(resource, id) {
      const headers = await authHeaders();
      const response = await fetch(`/api/admin/${resource}?id=${encodeURIComponent(id)}`, { method: "DELETE", headers });
      const result = await readResponse(response);
      if (!response.ok) throw new RequestError(errorMessage(result.error, "Could not delete this subtopic."), response.status);
    },
    async reload(resource) {
      const rows = asRecords((await request(resource)).data);
      if (resource === "topics") setTopics(rows);
      else if (resource === "news-categories") setNewsCategories(rows);
      else setResearchTopics(rows);
    },
  };

  // The related-record picker offers cases, events and papers, and each list is
  // a full admin read. Fetching all three on entering the News section would
  // slow the list view for a field most items never use, so a list is read the
  // first time a type is chosen and kept for the rest of the session.
  // Held stable so the picker's effect keys on the chosen type alone: an
  // identity that changed every render would fire a second read while the
  // first was still in flight, before the cache below could answer.
  const relatedOptions = useRef<Partial<Record<"content" | "events" | "research", RelatedOption[]>>>({});
  const loadRelatedOptions = useCallback(async function loadRelatedOptions(type: NewsRelationType): Promise<RelatedOption[]> {
    const resource = type === "event" ? "events" : type === "research" ? "research" : "content";
    const cached = relatedOptions.current[resource];
    if (cached) return cached;
    const rows = asRecords((await request(resource)).data);
    // A case is addressed by slug on the public site; a paper by its numeric id.
    const options = rows.flatMap((row) => {
      const ref = resource === "research" ? String(row.id ?? "") : String(row.slug ?? "");
      const label = String(row.title ?? "Untitled");
      return ref ? [{ ref, label, status: String(row.status ?? "") }] : [];
    });
    relatedOptions.current[resource] = options;
    return options;
    // `request` is re-created on every render but never closes over state — it
    // reads the session token itself — so an empty list is what keeps this
    // callback stable, which is the whole point of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (access === "checking" && !identity) return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Checking your access...</h1><p>Restoring your staff session.</p></main>;
  if (access === "signed_out") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Sign in to continue</h1><p>{accessMessage}</p><Link className="btn btn-primary" href="/en/sign-in">Sign in</Link></main>;
  if (access === "denied") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Admin access required</h1><p>{accessMessage}</p><div className="admin-access-actions"><button className="btn btn-primary" type="button" onClick={() => { setAccess("checking"); void load("overview"); }}>Try again</button><button className="btn btn-outline" type="button" onClick={signOut}>Sign in as another account</button></div></main>;
  if (access === "unavailable") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>We could not verify your access</h1><p>{accessMessage}</p><div className="admin-access-actions"><button className="btn btn-primary" type="button" onClick={() => { setAccess("checking"); void load("overview"); }}>Try again</button><button className="btn btn-outline" type="button" onClick={signOut}>Sign in again</button></div></main>;
  const canCreate = ["content", "posters", "research", "events", "news"].includes(active);
  const createLabel = active === "content" ? "content" : active === "posters" ? "poster" : active === "research" ? "research" : active === "news" ? "news item" : "event";
  return <main className="admin-shell"><aside className="admin-sidebar"><Link className="admin-brand" href="/en"><img className="admin-logo" src="/sst-mark.png" alt=""/><span className="admin-brand-copy"><b>Smart Surgical Team</b><small>Admin</small></span></Link><div className="admin-owner"><span>{String(identity?.full_name ?? identity?.name ?? "Owner").split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><div><b>{String(identity?.full_name ?? identity?.name ?? "Smart Surgical Team")}</b><small>{String(identity?.role ?? "owner").replace(/_/g, " ")}</small></div></div><nav aria-label="Admin sections">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "is-active" : ""} type="button" onClick={() => { setActive(id); setEditing(null); setSearch(""); }}><Icon size={18}/>{label}</button>)}</nav><button className="admin-signout" type="button" onClick={signOut}>Sign out</button></aside><section className="admin-main"><header className="admin-topbar"><div><span className="admin-kicker">Content operations</span><h1>{nav.find((item) => item.id === active)?.label}</h1></div>{canCreate && <button className="btn btn-primary" type="button" onClick={startNew}><IconPlus size={17}/> Add {createLabel}</button>}</header>{notice && <p className={noticeTone === "warn" ? "admin-notice is-warning" : "admin-notice"} role="status">{noticeTone === "warn" ? <b aria-hidden="true">!</b> : <IconCheck size={17}/>}{notice}</p>}{loading ? <div className="admin-loading">Loading workspace...</div> : <>{active === "overview" ? <Overview metrics={metrics} setActive={setActive}/> : editing ? <Editor section={active} value={editing} topics={topics} researchTopics={researchTopics} newsCategories={newsCategories} contributors={contributors} caseSectionsStorable={caseSectionsStorable} taxonomy={taxonomy} loadRelatedOptions={loadRelatedOptions} onCancel={() => setEditing(null)} onSave={save}/> : <List section={active} items={filtered} search={search} setSearch={setSearch} topics={topics} researchTopics={researchTopics} newsCategories={newsCategories} filters={contentFilters} setFilters={setContentFilters} researchFilters={researchFilters} setResearchFilters={setResearchFilters} newsFilters={newsFilters} setNewsFilters={setNewsFilters} onEdit={setEditing} onDelete={remove}/>}</>}</section></main>;
}

function Overview({ metrics, setActive }: { metrics: RecordItem; setActive: (section: Section) => void }) {
  const cards: { key: string; label: string; section: Section }[] = [{ key: "published", label: "Published items", section: "content" }, { key: "drafts", label: "Drafts & unpublishing", section: "content" }, { key: "events", label: "Published events", section: "events" }, { key: "research", label: "Research publications", section: "research" }, { key: "news", label: "Published news", section: "news" }];
  return <div className="admin-overview"><section className="admin-welcome"><div><span className="admin-kicker">Control room</span><h2>Keep the platform current, carefully.</h2><p>Publish case articles, update the team, and keep events and learning material accurate from one place.</p></div><button className="btn btn-primary" type="button" onClick={() => setActive("content")}>Create a case article <IconArrowRight size={17}/></button></section><div className="admin-metric-grid">{cards.map((card) => <button type="button" onClick={() => setActive(card.section)} key={card.key}><strong>{String(metrics[card.key] ?? 0)}</strong><span>{card.label}</span><IconArrowRight size={16}/></button>)}</div><section className="admin-safety"><h2>Clinical publishing reminder</h2><p>Only publish material that has been de-identified, consented, and approved by the team. Articles are public unless you select Site users only in the content editor.</p></section></div>;
}

function List({ section, items, search, setSearch, topics, researchTopics, newsCategories, filters, setFilters, researchFilters, setResearchFilters, newsFilters, setNewsFilters, onEdit, onDelete }: { section: Section; items: RecordItem[]; search: string; setSearch: (value: string) => void; topics: RecordItem[]; researchTopics: RecordItem[]; newsCategories: RecordItem[]; filters: ContentFilters; setFilters: (filters: ContentFilters) => void; researchFilters: ResearchFilters; setResearchFilters: (filters: ResearchFilters) => void; newsFilters: NewsFilters; setNewsFilters: (filters: NewsFilters) => void; onEdit: (item: RecordItem) => void; onDelete: (item: RecordItem) => void }) {
  // Deleting used to ask through `window.confirm`, which a page can be made to
  // suppress for the rest of the session — after that it returns false and the
  // button silently did nothing. The second click confirms instead.
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const majors = topics.filter((topic) => !topic.parent_id);
  const subtopics = topics.filter((topic) => String(topic.parent_id ?? "") === filters.major);
  const researchYears = section === "research" ? [...new Set(items.map((item) => String(item.published_date ?? "").slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a)) : [];
  const researchMajors = researchTopics.filter((topic) => !topic.parent_id);
  const researchTopicName = (id: unknown) => { const name = researchTopics.find((topic) => String(topic.id) === String(id ?? ""))?.name; return typeof name === "string" ? name : undefined; };
  const newsCategoryName = (id: unknown) => { const name = newsCategories.find((category) => String(category.id) === String(id ?? ""))?.name; return typeof name === "string" ? name : undefined; };
  const change = (key: keyof ContentFilters, value: string) => setFilters({ ...filters, [key]: value, ...(key === "major" ? { subtopic: "" } : {}) });
  return <div className="admin-list">
    <div className="admin-list-controls"><label><IconSearch size={17}/><span className="visually-hidden">Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${section}...`}/></label><span>{items.length} items</span></div>
    {section === "content" ? <div className="admin-content-filters">
      <label>Topic<select value={filters.major} onChange={(event) => change("major", event.target.value)}><option value="">All topics</option>{majors.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.name)}</option>)}</select></label>
      <label>Subtopic<select value={filters.subtopic} disabled={!filters.major} onChange={(event) => change("subtopic", event.target.value)}><option value="">All subtopics</option>{subtopics.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.name)}</option>)}</select></label>
      <label>Status<select value={filters.status} onChange={(event) => change("status", event.target.value)}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label>
      <label>Access<select value={filters.access} onChange={(event) => change("access", event.target.value)}><option value="">All access</option><option value="public">Public</option><option value="members_only">Members only</option></select></label>
      <label>From<input type="date" value={filters.from} onChange={(event) => change("from", event.target.value)}/></label>
      <label>To<input type="date" value={filters.to} onChange={(event) => change("to", event.target.value)}/></label>
      <label>Order<select value={filters.sort} onChange={(event) => change("sort", event.target.value)}><option value="published_desc">Newest published</option><option value="published_asc">Oldest published</option><option value="updated_desc">Recently updated</option></select></label>
      <button type="button" onClick={() => setFilters(EMPTY_CONTENT_FILTERS)}>Clear filters</button>
    </div> : null}
    {section === "research" ? <div className="admin-content-filters">
      <label>Year<select value={researchFilters.year} onChange={(event) => setResearchFilters({ ...researchFilters, year: event.target.value })}><option value="">All years</option>{researchYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      <label>Topic<select value={researchFilters.topic} onChange={(event) => setResearchFilters({ ...researchFilters, topic: event.target.value })}><option value="">All topics</option>{researchMajors.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.name)}</option>)}</select></label>
      <label>Status<select value={researchFilters.status} onChange={(event) => setResearchFilters({ ...researchFilters, status: event.target.value })}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
      <button type="button" onClick={() => setResearchFilters(EMPTY_RESEARCH_FILTERS)}>Clear filters</button>
    </div> : null}
    {section === "news" ? <div className="admin-content-filters">
      <label>Category<select value={newsFilters.category} onChange={(event) => setNewsFilters({ ...newsFilters, category: event.target.value })}><option value="">All categories</option>{newsCategories.map((category) => <option key={String(category.id)} value={String(category.id)}>{String(category.name)}</option>)}</select></label>
      <label>Status<select value={newsFilters.status} onChange={(event) => setNewsFilters({ ...newsFilters, status: event.target.value })}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
      <button type="button" onClick={() => setNewsFilters(EMPTY_NEWS_FILTERS)}>Clear filters</button>
    </div> : null}
    <div className="admin-table">{items.map((item) => <article key={String(item.id)}><div className="admin-item-main"><span className={`admin-status is-${String(item.status ?? "default")}`}>{String(item.status ?? "active")}</span><h2>{String(item.title ?? item.name ?? item.display_name ?? item.email ?? "Untitled")}</h2><p>{plainText(item.summary ?? item.authors ?? item.abstract ?? item.description) || "No additional detail."}</p></div><div className="admin-item-meta">{section === "content" && <span>{item.published_at ? new Date(String(item.published_at)).toLocaleDateString() : "Not published"}</span>}{section === "research" && <span>{researchTopicName(item.topic_id) ?? "Unfiled"}</span>}{section === "research" && <span>{item.published_date ? new Date(`${String(item.published_date)}T00:00:00`).toLocaleDateString() : "No date"}</span>}{section === "news" && <span>{newsCategoryName(item.category_id) ?? "Unfiled"}</span>}{section === "news" && <span>{item.published_at ? new Date(`${String(item.published_at).slice(0, 10)}T12:00:00`).toLocaleDateString() : "No date"}</span>}{section === "news" && item.pinned === true && <span className="admin-status is-published">Pinned</span>}{/* The same rule the public card reads: no body and a link means the card goes straight to the outside article. */}
      {section === "news" && Boolean(String(item.link_url ?? "")) && !(Array.isArray(item.body) && item.body.length > 0) && <span>Links out ↗</span>}<div><button type="button" onClick={() => onEdit(item)}>Edit</button><button className={`admin-delete${confirmingDelete === String(item.id) ? " is-confirming" : ""}`} type="button" title={confirmingDelete === String(item.id) ? "Click again to delete permanently" : "Delete"} onClick={() => { if (confirmingDelete === String(item.id)) { setConfirmingDelete(null); onDelete(item); } else setConfirmingDelete(String(item.id)); }} onBlur={() => setConfirmingDelete((current) => current === String(item.id) ? null : current)}>{confirmingDelete === String(item.id) ? "Delete permanently?" : "Delete"}</button></div></div></article>)}</div>
  </div>;
}
/**
 * The key of the image a saved news item uses as its cover.
 *
 * `cover_url` stores the whole `/api/media/<key>` URL, so the editor finds the
 * matching image and works in `storage_path` from there — the same currency the
 * case thumbnail picker uses, and the only one a not-yet-uploaded image has.
 * Empty when the item has no cover, or when its cover points at an image that is
 * no longer attached.
 */
function newsCoverKey(value: RecordItem): string {
  const media = Array.isArray(value.news_media) ? value.news_media as Media[] : [];
  return media.find((item) => item.public_url === value.cover_url)?.storage_path ?? "";
}

function Editor({ section, value, topics, researchTopics, newsCategories, contributors, caseSectionsStorable = true, taxonomy, loadRelatedOptions, onCancel, onSave }: { section: Section; value: RecordItem; topics: RecordItem[]; researchTopics: RecordItem[]; newsCategories: RecordItem[]; contributors: RecordItem[]; caseSectionsStorable?: boolean; taxonomy: TaxonomyAdmin; loadRelatedOptions: (type: NewsRelationType) => Promise<RelatedOption[]>; onCancel: () => void; onSave: (value: RecordItem) => boolean | void | Promise<boolean | void> }) {
  const [form, setForm] = useState<RecordItem>(() => ({ ...value, topic_ids: Array.isArray(value.content_topics) ? value.content_topics.flatMap((row) => typeof row === "object" && row ? [String((row as RecordItem).topic_id)] : []) : value.topic_ids ?? [], contributor_ids: Array.isArray(value.content_contributors) ? value.content_contributors.flatMap((row) => typeof row === "object" && row ? [String((row as RecordItem).contributor_id)] : []) : value.contributor_ids ?? (value.contributor_id ? [String(value.contributor_id)] : []), chapters: Array.isArray(value.content_chapters) ? value.content_chapters : value.chapters ?? [], content_media: Array.isArray(value.content_media) ? value.content_media : [], research_media: Array.isArray(value.research_media) ? value.research_media : [], news_media: Array.isArray(value.news_media) ? value.news_media : [], cover_media_path: newsCoverKey(value), case_sections: initialCaseSections(value), body: Array.isArray(value.body) ? value.body : [], body_ar: Array.isArray(value.body_ar) ? value.body_ar : [], published_at: section === "news" && typeof value.published_at === "string" ? value.published_at.slice(0, 10) : value.published_at }));
  const [uploading, setUploading] = useState(false);
  // Saving a case can take a while: every pending image is uploaded to R2 one
  // at a time before the record itself is written. Without this the admin had a
  // dead button and no way to tell a slow save from a stuck one.
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  // A rejected upload used to throw out of an event handler with no catch: the
  // spinner stopped and the editor said nothing at all.
  const [uploadError, setUploadError] = useState("");
  const set = (key: string, next: unknown) => setForm((current) => ({ ...current, [key]: next }));
  // Object URLs minted for pending previews are revoked when the editor closes.
  const previewUrls = useRef<string[]>([]);
  useEffect(() => () => { previewUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  // Picking a file no longer uploads anything: it stores the File and shows a
  // local preview. The real R2 upload happens once, on Save, in `commitList`.
  function pickMedia(files: File | File[], key: MediaField) {
    const list = Array.isArray(files) ? files : [files];
    if (list.some((file) => file.size > MAX_UPLOAD_BYTES)) { setUploadError("Choose files no larger than 10 MB each."); return; }
    setUploadError("");
    const additions: Media[] = list.map((file, offset) => {
      const kind: Media["kind"] = file.type === "application/pdf" ? "document" : "image";
      const preview = URL.createObjectURL(file);
      previewUrls.current.push(preview);
      const local_id = `local-${Date.now()}-${offset}-${Math.random().toString(36).slice(2)}`;
      return { storage_path: "", public_url: preview, kind, alt_text: "", caption: "", file, local_id };
    });
    setForm((current) => ({ ...current, [key]: [...(Array.isArray(current[key]) ? current[key] as Media[] : []), ...additions] }));
  }
  // Dropping an image onto the before or after slot adds it to the case's own
  // image list — these are the same album images, not a separate upload — and
  // points that slot at it straight away.
  function pickPairImage(file: File, field: "thumbnail_before_path" | "thumbnail_after_path") {
    if (file.size > MAX_UPLOAD_BYTES) { setUploadError("Choose a file no larger than 10 MB."); return; }
    if (file.type === "application/pdf") { setUploadError("Before and after slots take images, not PDFs."); return; }
    setUploadError("");
    const preview = URL.createObjectURL(file);
    previewUrls.current.push(preview);
    const local_id = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const addition: Media = { storage_path: "", public_url: preview, kind: "image", alt_text: "", caption: "", file, local_id };
    setForm((current) => ({
      ...current,
      content_media: [...(Array.isArray(current.content_media) ? current.content_media as Media[] : []), addition],
      [field]: local_id,
    }));
  }
  // Deleting an image takes it out of the item entirely: its row leaves the
  // media list, so saving drops the stored object from R2 as well. Any cover
  // choice pointing at that image is cleared in the same step — a dangling path
  // would silently fall the card back to the YouTube thumbnail, which looks
  // like the chosen cover being ignored for no reason.
  function removeMedia(key: MediaField, target: string) {
    setForm((current) => {
      const list = Array.isArray(current[key]) ? current[key] as Media[] : [];
      const next: Record<string, unknown> = { ...current, [key]: list.filter((item) => (item.storage_path || item.local_id || "") !== target) };
      for (const field of ["thumbnail_media_path", "thumbnail_before_path", "thumbnail_after_path", "cover_media_path"] as const) {
        if (current[field] === target) next[field] = "";
      }
      return next;
    });
  }
  function pickPoster(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) { setUploadError("Choose a poster image no larger than 10 MB."); return; }
    setUploadError("");
    const preview = URL.createObjectURL(file);
    previewUrls.current.push(preview);
    setForm((current) => ({ ...current, poster_url: preview, poster_file: file, poster_image_removed: false }));
  }
  function removePosterImage() {
    const currentUrl = String(form.poster_url ?? "");
    setForm((current) => ({
      ...current,
      poster_url: "",
      poster_file: undefined,
      poster_image_removed: Boolean(currentUrl),
      status: current.status === "published" ? "draft" : current.status,
    }));
  }
  // An import overwrites work in progress, so it asks first when there is any.
  // The question is asked in the page rather than through `window.confirm`: a
  // suppressed dialog returns false, which silently cancelled the import.
  const [importWarning, setImportWarning] = useState<string | null>(null);
  function applyImport(patch: RecordItem): boolean {
    const replaced: string[] = [];
    if (patch.title !== undefined && String(form.title ?? "").trim()) replaced.push("the title");
    if (patch.summary !== undefined && String(form.summary ?? "").trim()) replaced.push("the card summary");
    if (patch.video_url !== undefined && String(form.video_url ?? "").trim()) replaced.push("the video link");
    if (patch.case_sections !== undefined && ((form.case_sections as CaseSection[]) ?? []).some((entry) => entry.body.trim())) replaced.push("every case section already written here");
    if (replaced.length && !importWarning) { setImportWarning(`Importing this file replaces ${replaced.join(", ")}. Press "Import into the editor" again to confirm.`); return false; }
    setImportWarning(null);
    setForm((current) => ({ ...current, ...patch }));
    return true;
  }

  // The single point that actually writes to R2. Returns the stored record.
  async function sendToStorage(file: File): Promise<{ path: string; publicUrl: string; kind: "image" | "document" }> {
    const token = await accessToken();
    const body = new FormData();
    body.append("file", file);
    if (section === "research" || section === "posters" || section === "news") { body.append("topicSlug", section); } else { const topicId = (form.topic_ids as string[] | undefined)?.[0]; const topicSlug = topics.find((topic) => String(topic.id) === topicId)?.slug; if (typeof topicSlug === "string") body.append("topicSlug", topicSlug); }
    if (typeof form.title === "string") body.append("caseSlug", form.title);
    const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` }, body });
    const result = await readResponse(response);
    if (!response.ok) throw new Error(errorMessage(result.error, "Could not upload this file."));
    const path = typeof result.path === "string" ? result.path : "";
    const publicUrl = typeof result.publicUrl === "string" ? result.publicUrl : "";
    const kind = result.kind === "document" ? "document" : result.kind === "image" ? "image" : null;
    if (!path || !publicUrl || !kind) throw new Error("The upload service returned an incomplete file record.");
    return { path, publicUrl, kind };
  }
  // Uploads every pending file in a media list, leaving already-stored items
  // (those with a storage_path) untouched.
  async function commitList(list: Media[], step: (name: string) => void): Promise<Media[]> {
    const committed: Media[] = [];
    for (const item of list) {
      if (item.file && !item.storage_path) {
        const stored = await sendToStorage(item.file);
        step(item.file.name);
        committed.push({ storage_path: stored.path, public_url: stored.publicUrl, kind: stored.kind, alt_text: item.alt_text ?? "", caption: item.caption ?? "", local_id: item.local_id });
      } else committed.push(item);
    }
    return committed;
  }

  // A before/after cover needs both halves. Saving a half-finished pair used to
  // be accepted and quietly downgraded to the YouTube thumbnail, so the admin
  // was told "Saved" and then found the cover they had just set was not the one
  // on the card. The save is refused instead, naming both ways out.
  const PAIR_INCOMPLETE = "This cover needs both a before and an after image. Choose the missing one, or pick a different cover option above — the YouTube thumbnail or a single uploaded image.";
  function pairIsIncomplete() {
    return section === "content" && form.thumbnail_source === "before_after"
      && !(String(form.thumbnail_before_path ?? "") && String(form.thumbnail_after_path ?? ""));
  }

  // A pinned draft would put an item on the homepage banner that has no page to
  // open. The server refuses it; saying so here means the editor is told before
  // the round trip rather than after it.
  const newsPinBlocked = section === "news" && form.pinned === true && form.status !== "published"
    ? "Only a published item can be pinned to the homepage. Publish it, or clear the pin."
    : "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pairIsIncomplete()) { setUploadError(PAIR_INCOMPLETE); return; }
    if (newsPinBlocked) { setUploadError(newsPinBlocked); return; }
    setUploading(true); setUploadError("");
    // One step per file still to upload, plus the record write itself.
    const pending = [...((form.content_media as Media[]) ?? []), ...((form.research_media as Media[]) ?? []), ...((form.news_media as Media[]) ?? [])].filter((item) => item.file && !item.storage_path).length
      + (form.poster_file instanceof File ? 1 : 0);
    const total = pending + 1;
    let done = 0;
    const step = (label: string) => { done += 1; setProgress({ done, total, label }); };
    setProgress({ done: 0, total, label: pending ? `Uploading ${pending} file${pending === 1 ? "" : "s"}...` : "Saving changes..." });
    try {
      const contentMedia = await commitList((form.content_media as Media[]) ?? [], (name) => step(`Uploaded ${name}`));
      const researchMedia = await commitList((form.research_media as Media[]) ?? [], (name) => step(`Uploaded ${name}`));
      const newsMedia = await commitList((form.news_media as Media[]) ?? [], (name) => step(`Uploaded ${name}`));
      let posterUrl = String(form.poster_url ?? "");
      if (form.poster_file instanceof File) { posterUrl = (await sendToStorage(form.poster_file)).publicUrl; step("Uploaded the poster image"); }
      // The cover is one of the item's own images, held as a key while the
      // editor is open because an image not yet uploaded has no public URL to
      // point at. `commitList` has just given every one of them a real one — and
      // a key minted before that upload is a `local-` id, which the committed
      // row keeps alongside the storage path it has now been given.
      const coverKey = String(form.cover_media_path ?? "");
      const coverImage = coverKey.startsWith("local-")
        ? newsMedia.find((item) => item.local_id === coverKey)
        : newsMedia.find((item) => item.storage_path === coverKey);
      const coverUrl = coverKey ? coverImage?.public_url ?? "" : "";
      // A thumbnail chosen from a pending image referenced its temporary id;
      // repoint it at the real storage path now that the image is uploaded.
      const storedPath = (value: unknown) => {
        if (typeof value !== "string" || !value) return value;
        return value.startsWith("local-") ? contentMedia.find((item) => item.local_id === value)?.storage_path ?? "" : value;
      };
      const thumbnailPath = storedPath(form.thumbnail_media_path);
      const beforePath = storedPath(form.thumbnail_before_path);
      const afterPath = storedPath(form.thumbnail_after_path);
      setProgress({ done, total, label: "Writing to the database..." });
      // A rejected save keeps the editor open, so the bar must not be left
      // sitting at "Saved" over a record that never landed.
      const saved = await onSave({ ...form, ...legacyCaseColumns(section, form), poster_url: posterUrl, poster_file: undefined, cover_url: coverUrl, content_media: contentMedia, research_media: researchMedia, news_media: newsMedia, thumbnail_media_path: thumbnailPath, thumbnail_before_path: beforePath, thumbnail_after_path: afterPath, media: section === "research" ? researchMedia : section === "news" ? newsMedia : contentMedia });
      if (saved === false) setProgress(null); else step("Saved");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload the attached files.");
      setProgress(null);
    } finally { setUploading(false); }
  }
  if (section === "posters") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit poster" : "New poster"} onCancel={onCancel} busy={uploading} progress={progress}/><div className="admin-editor-grid"><section>
    <Field label="Poster title" value={form.title} onChange={(value) => set("title", value)} required/>
    <Field label="Card summary" hint="A short introduction shown beside the featured poster and on archive cards." type="textarea" value={form.summary} onChange={(value) => set("summary", value)} required/>
    <div className="admin-field-grid"><Field label="Study label" hint="e.g. 5-patient cohort study · 2020–2025" value={form.level} onChange={(value) => set("level", value)}/><Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive']]}/></div>
    <section className="admin-optional-link"><h2>Optional reader link</h2><p>Appears directly below the poster image. Add both fields to link readers to the full paper or another resource.</p><Field label="Button text" hint="e.g. Read the full research paper" value={form.poster_cta_text} onChange={(value) => set("poster_cta_text", value)}/><Field label="Link URL" hint="Use a full https:// link." type="url" value={form.poster_cta_url} onChange={(value) => set("poster_cta_url", value)}/></section>
    <ContributorPicker contributors={contributors} value={(form.contributor_ids as string[]) ?? []} onChange={(ids) => set("contributor_ids", ids)}/>
    <JustifyToggle value={form.justify_body} onChange={(next) => set("justify_body", next)} what="the written poster details"/>
    <CaseFields title="Written poster details" intro="Write the supporting text readers should see on the poster detail page. Rename, reorder or add sections as needed." sections={(form.case_sections as CaseSection[]) ?? []} setSections={(sections) => set("case_sections", sections)} storable={caseSectionsStorable}/>
  </section><aside><PosterImagePicker value={String(form.poster_url ?? "")} removed={Boolean(form.poster_image_removed)} onRemove={removePosterImage} onPick={pickPoster} uploading={uploading} error={uploadError}/></aside></div></form>;
  if (section === "content") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit content" : "New content"} onCancel={onCancel} busy={uploading} progress={progress} blocked={pairIsIncomplete() ? PAIR_INCOMPLETE : ""}/><div className="admin-editor-grid"><section>{importWarning && <p className="admin-blocked" role="alert">{importWarning}</p>}<CaseJsonImport topics={topics} onApply={applyImport}/><Field label="Title" value={form.title} onChange={(value) => set("title", value)} required/><Field label="Card summary" type="textarea" value={form.summary} onChange={(value) => set("summary", value)} required/><div className="admin-field-grid"><Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive'],['scheduled','Schedule']]}/><Select label="Visibility" value={form.access_level} onChange={(value) => set("access_level", value)} options={[['public','Public'],['members_only','Site users only']]}/></div>{form.status === "scheduled" && <Field label="Publish on" type="datetime-local" value={form.scheduled_for} onChange={(value) => set("scheduled_for", value)}/>}<TopicPicker topics={topics} value={(form.topic_ids as string[]) ?? []} onChange={(ids) => set("topic_ids", ids)} taxonomy={taxonomy}/><ContributorPicker contributors={contributors} value={(form.contributor_ids as string[]) ?? []} onChange={(ids) => set("contributor_ids", ids)}/><div className="admin-field-grid"><Field label="Video URL (optional)" hint="Paste a YouTube watch or share link, or a direct .mp4/.webm file URL." type="url" value={form.video_url} onChange={(value) => set("video_url", value)}/><Select label="Clinical level" value={form.level ?? "Clinical education"} onChange={(value) => set("level", value)} options={clinicalLevelOptions(form.level)}/></div><Select label="Record type" hint="Teaching and reference material is filed under the same topics as cases but is filtered separately in the topic library." value={form.is_teaching ? "teaching" : "case"} onChange={(value) => set("is_teaching", value === "teaching")} options={[['case','Clinical case'],['teaching','Teaching & reference']]}/><JustifyToggle value={form.justify_body} onChange={(next) => set("justify_body", next)} what="the written case sections"/><CaseFields sections={(form.case_sections as CaseSection[]) ?? []} setSections={(sections) => set("case_sections", sections)} storable={caseSectionsStorable}/></section><aside><MediaManager media={(form.content_media as Media[]) ?? []} setMedia={(media) => set("content_media", media)} upload={(file) => pickMedia(file, "content_media")} onDelete={(target) => removeMedia("content_media", target)} uploading={uploading} error={uploadError}/><ThumbnailPicker media={(form.content_media as Media[]) ?? []} source={form.thumbnail_source === "image" || form.thumbnail_source === "before_after" ? form.thumbnail_source : "youtube"} selectedPath={String(form.thumbnail_media_path ?? "")} beforePath={String(form.thumbnail_before_path ?? "")} afterPath={String(form.thumbnail_after_path ?? "")} onSource={(source) => set("thumbnail_source", source)} onSelect={(path) => set("thumbnail_media_path", path)} onSelectBefore={(path) => set("thumbnail_before_path", path)} onSelectAfter={(path) => set("thumbnail_after_path", path)} onDropBefore={(file) => pickPairImage(file, "thumbnail_before_path")} onDropAfter={(file) => pickPairImage(file, "thumbnail_after_path")} onDelete={(target) => removeMedia("content_media", target)}/><Chapters chapters={(form.chapters as { title: string; starts_at_seconds: number }[]) ?? []} setChapters={(chapters) => set("chapters", chapters)}/></aside></div></form>;
  if (section === "research") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit research" : "New research"} onCancel={onCancel} busy={uploading} progress={progress}/><div className="admin-editor-grid"><section>
    <Field label="Title" value={form.title} onChange={(value) => set("title", value)} required/>
    <Field label="Authors" hint="Free-text byline, e.g. Dr. A, Dr. B, and colleagues." value={form.authors} onChange={(value) => set("authors", value)}/>
    <JustifyToggle value={form.justify_body} onChange={(next) => set("justify_body", next)} what="the abstract"/>
    <div className="admin-label"><span className="admin-label-text">Abstract</span><RichEditor value={String(form.abstract ?? "")} onChange={(value) => set("abstract", value)} placeholder="Write the abstract..."/></div>
    <Field label="Journal" hint="Shown at the top of the paper's generated cover." value={form.journal} onChange={(value) => set("journal", value)}/>
    <ResearchTopicPicker topics={researchTopics} topicId={String(form.topic_id ?? "")} subtopicId={String(form.subtopic_id ?? "")} taxonomy={taxonomy} onChange={(topicId, subtopicId) => setForm((current) => ({ ...current, topic_id: topicId, subtopic_id: subtopicId }))}/>
    <div className="admin-field-grid"><Field label="Publication date" type="date" value={form.published_date} onChange={(value) => set("published_date", value)}/><Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive']]}/></div>
    <Field label="External paper link" hint="Full https:// link to the published paper." type="url" value={form.link} onChange={(value) => set("link", value)}/>
  </section><aside>
    <MediaManager media={(form.research_media as Media[]) ?? []} setMedia={(media) => set("research_media", media)} upload={(file) => pickMedia(file, "research_media")} onDelete={(target) => removeMedia("research_media", target)} uploading={uploading} error={uploadError}/>
  </aside></div></form>;
  if (section === "news") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit news item" : "New news item"} onCancel={onCancel} busy={uploading} progress={progress} blocked={newsPinBlocked}/><div className="admin-editor-grid"><section>
    <Field label="Headline" value={form.title} onChange={(value) => set("title", value)} required/>
    <Field label="Headline in Arabic" hint="Optional. Left blank, the Arabic page shows the English headline with the reader’s translate button." dir="auto" value={form.title_ar} onChange={(value) => set("title_ar", value)}/>
    <Field label="Card summary" hint="One or two sentences. This is what the feed card and the search preview show." type="textarea" value={form.summary} onChange={(value) => set("summary", value)} required/>
    <Field label="Card summary in Arabic" hint="Optional, same rule as the headline." type="textarea" dir="auto" value={form.summary_ar} onChange={(value) => set("summary_ar", value)}/>
    <div className="admin-field-grid">
      <Select label="Category" hint="Sets which filter chip this appears under." value={form.category_id} onChange={(value) => set("category_id", value)} options={[["", newsCategories.length ? "Unfiled" : "No categories yet"], ...newsCategories.map((category) => [String(category.id), String(category.name)] as [string, string])]}/>
      <Field label="Publication date" hint="The date readers see, and what the feed is ordered by. Backdate a recap or a press clipping to when it happened." type="date" value={form.published_at} onChange={(value) => set("published_at", value)}/>
    </div>
    <NewsCategoryManager categories={newsCategories} taxonomy={taxonomy} onRemoved={(id) => { if (String(form.category_id ?? "") === id) set("category_id", ""); }}/>
    <div className="admin-field-grid">
      <Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive']]}/>
      <Field label="External link (optional)" hint="Use a full https:// link — the outside article, TV segment or announcement." type="url" value={form.link_url} onChange={(value) => set("link_url", value)}/>
    </div>
    <section className="admin-optional-link"><h2>Homepage banner</h2>
      <p>One item at a time can sit in a banner across the top of the homepage. Pinning this one releases whichever item is pinned now. Readers can dismiss the banner, and it stays dismissed for them until you pin something else.</p>
      <label className="admin-checkbox"><input type="checkbox" checked={form.pinned === true} onChange={(event) => set("pinned", event.target.checked)}/>Pin this item to the homepage</label>
      {newsPinBlocked ? <p className="admin-upload-error" role="alert">{newsPinBlocked}</p> : null}
      {form.pinned === true && !newsPinBlocked ? <small>The site caches its pages, so a new pin can take up to an hour to reach every reader.</small> : null}
    </section>
    <RelatedRecordPicker type={String(form.related_type ?? "")} reference={String(form.related_ref ?? "")} loadOptions={loadRelatedOptions} onChange={(type, reference) => setForm((current) => ({ ...current, related_type: type, related_ref: reference }))}/>
    <JustifyToggle value={form.justify_body} onChange={(next) => set("justify_body", next)} what="the story, in both languages"/>
    <CaseFields title="The story" intro="Write the item as one or more named sections — rename a heading, reorder them, or add your own. Leave this empty and paste an external link above, and the card takes readers straight to that article instead of opening a page here." sections={(form.body as CaseSection[]) ?? []} setSections={(sections) => set("body", sections)}/>
    <CaseFields title="The story in Arabic" intro="Optional. Written here, the Arabic page shows this instead of the English text; left empty, it shows the English with the reader’s translate button. The two lists are independent — headings do not have to match." sections={(form.body_ar as CaseSection[]) ?? []} setSections={(sections) => set("body_ar", sections)} dir="auto"/>
  </section><aside>
    <MediaManager media={(form.news_media as Media[]) ?? []} setMedia={(media) => set("news_media", media)} upload={(file) => pickMedia(file, "news_media")} onDelete={(target) => removeMedia("news_media", target)} uploading={uploading} error={uploadError}/>
    <NewsCoverPicker media={(form.news_media as Media[]) ?? []} selectedKey={String(form.cover_media_path ?? "")} onSelect={(key) => set("cover_media_path", key)}/>
  </aside></div></form>;
  return <SimpleEditor title={form.id ? "Edit event" : "New event or webinar"} fields={[['title','Title'],['summary','Summary'],['event_type','Type'],['topic','Topic'],['format','Attendance format'],['status','Status'],['starts_at','Starts at'],['ends_at','Ends at'],['location','Location'],['image_url','Image URL'],['official_url','Official URL'],['registration_url','Registration URL'],['programme_url','Programme URL'],['faculty_url','Faculty page URL'],['highlights','Programme highlights']]} form={{ ...form, highlights: Array.isArray(form.highlights) ? form.highlights.join("\n") : form.highlights }} set={set} onCancel={onCancel} onSave={submit}/>;
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
      : <small>No contributors have been added yet. They are managed directly in Supabase.</small>}
    <p className="admin-picker-summary">{selected.length ? <>Credited: {selected.map(nameOf).filter(Boolean).join(", ")}. <b>{nameOf(selected[0])}</b> is the lead author.</> : "Nobody selected a this will be credited to Smart Surgical Team."}</p>
  </section>;
}

function TopicPicker({ topics, value, onChange, taxonomy }: { topics: RecordItem[]; value: string[]; onChange: (ids: string[]) => void; taxonomy: TaxonomyAdmin }) {
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
  // Ticking a subtopic adds to the filing, it does not replace it. This used to
  // drop the major topic from the item, which took the item off the major
  // topic's page and out of every list built from it.
  function toggleSub(id: string, checked: boolean) {
    const next = checked ? [...selectedSubIds, id] : selectedSubIds.filter((entry) => entry !== id);
    onChange(majorId ? [majorId, ...next] : next);
  }

  return <section className="admin-topic-picker">
    <label className="admin-label">Major topic<select value={majorId} onChange={(event) => changeMajor(event.target.value)}>{majors.map((major) => <option value={String(major.id)} key={String(major.id)}>{String(major.name)}</option>)}</select><small>Choose the one major topic this belongs to.</small></label>
    {majorId && <div className="admin-subtopic-list">
      <span className="admin-label-text">Subtopics in this major topic</span>
      {subTopics.length > 0
        ? <div className="admin-subtopic-grid">{subTopics.map((topic) => <label className="admin-checkbox" key={String(topic.id)}><input type="checkbox" checked={selectedSubIds.includes(String(topic.id))} onChange={(event) => toggleSub(String(topic.id), event.target.checked)}/>{String(topic.name)}</label>)}</div>
        : <small>This major topic has no subtopics yet.</small>}
      <small>Choose every subtopic that applies. Leave all unchecked to file this under the major topic only.</small>
      <SubtopicManager key={majorId} resource="topics" parentId={majorId} parentName={String(majors.find((major) => String(major.id) === majorId)?.name ?? "this topic")} subtopics={subTopics} taxonomy={taxonomy} onRemoved={(id) => onChange(value.filter((entry) => entry !== id))}/>
    </div>}
  </section>;
}

// ---------------------------------------------------------------------------
// Editing the subtopics in place
//
// The taxonomy no longer has a screen of its own: subtopics are reworded and
// added from the editor that files things under them, which is where their
// wording is actually being judged. Only subtopics are editable — the major
// topics are the site's fixed structure and are deliberately not touchable
// here, in either taxonomy.
//
// Changes are held as a draft until "Save subtopic changes", so a half-typed
// rename never reaches the site. Saving writes each change, then reloads the
// taxonomy, so the checkboxes above, the list filters and — the API expires the
// public cache tag on every write — the cards and filters across the site all
// show the new wording without a reload or a code release.
// ---------------------------------------------------------------------------
type TaxonomyAdmin = {
  save: (resource: ManagedList, payload: RecordItem) => Promise<void>;
  remove: (resource: ManagedList, id: string) => Promise<void>;
  reload: (resource: ManagedList) => Promise<void>;
};
/** One choice in the related-record picker: what to store, and what to show. */
type RelatedOption = { ref: string; label: string; status: string };
type NewsRelationType = "content" | "event" | "research";
type SubtopicDraft = { id: string; name: string; original: string; slug: string; sort_order: number; removed: boolean };

function toDrafts(subtopics: RecordItem[]): SubtopicDraft[] {
  return subtopics.map((topic) => ({ id: String(topic.id), name: String(topic.name ?? ""), original: String(topic.name ?? ""), slug: String(topic.slug ?? ""), sort_order: Number(topic.sort_order) || 0, removed: false }));
}

function SubtopicManager({ resource, parentId, parentName, subtopics, taxonomy, onRemoved }: { resource: Taxonomy; parentId: string; parentName: string; subtopics: RecordItem[]; taxonomy: TaxonomyAdmin; onRemoved?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<SubtopicDraft[]>(() => toDrafts(subtopics));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  // Reopening — or switching to another major topic — starts from what the
  // database currently holds rather than from a stale draft of another family.
  //
  // `subtopics` is filtered fresh on every parent render, so its identity is
  // never stable; keying the reset on a signature of the rows instead is what
  // keeps this from re-seeding the draft (and re-rendering) forever.
  // Switching the major topic remounts this panel — it is keyed on `parentId`
  // by both callers — so the previous family's drafts can never be left on
  // screen and saved under the new parent.
  const latest = useRef(subtopics);
  // Declared before the reset below so the rows it reads are this render's.
  useEffect(() => { latest.current = subtopics; });
  const signature = subtopics.map((topic) => `${String(topic.id)}:${String(topic.name)}:${String(topic.sort_order)}`).join("|");
  useEffect(() => { if (!open) setDrafts(toDrafts(latest.current)); }, [open, signature]);

  const update = (index: number, patch: Partial<SubtopicDraft>) => setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, ...patch } : draft));
  // The display order is never typed. Existing subtopics keep whatever order
  // they were given, and a new one is placed after the last of them, so adding
  // one is a single decision — its name — rather than a guess at a number.
  function add() {
    setDrafts((current) => [...current, { id: "", name: "", original: "", slug: "", sort_order: current.reduce((highest, draft) => Math.max(highest, draft.sort_order), 0) + 1, removed: false }]);
  }
  const pending = drafts.some((draft) => draft.removed || (draft.id ? draft.name.trim() !== draft.original : draft.name.trim().length > 0));

  async function commit() {
    setError(""); setDone("");
    const blank = drafts.find((draft) => !draft.removed && draft.id && !draft.name.trim());
    if (blank) { setError(`“${blank.original}” needs a name. Type one, or remove the subtopic.`); return; }
    setSaving(true);
    try {
      for (const draft of drafts) {
        const name = draft.name.trim();
        if (draft.removed) { if (draft.id) { await taxonomy.remove(resource, draft.id); onRemoved?.(draft.id); } continue; }
        if (!draft.id) { if (name) await taxonomy.save(resource, { name, parent_id: parentId, sort_order: draft.sort_order }); continue; }
        // The stored slug is sent back unchanged: it is the address of the
        // subtopic's public page, and regenerating it from a reworded name
        // would break every link already pointing there.
        if (name !== draft.original) await taxonomy.save(resource, { id: draft.id, name, slug: draft.slug, parent_id: parentId, sort_order: draft.sort_order });
      }
      await taxonomy.reload(resource);
      // Closing hands the panel back to the reset effect above, so it re-opens
      // on the saved rows — including the real ids of any subtopic just added.
      setDone("Saved. The new wording is live everywhere these subtopics appear.");
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save these subtopics.");
      // Whatever did land is already in the database; re-read so the panel
      // shows the real state rather than a draft that partly failed.
      await taxonomy.reload(resource).catch(() => {});
    } finally { setSaving(false); }
  }

  if (!open) return <div className="admin-subtopic-edit-row">
    <button type="button" className="admin-subtopic-edit" onClick={() => { setOpen(true); setError(""); setDone(""); }}>Edit subtopics</button>
    {done && <span className="admin-subtopic-done" role="status"><IconCheck size={15}/> {done}</span>}
    {error && <span className="admin-upload-error" role="alert">{error}</span>}
  </div>;
  return <div className="admin-subtopic-editor">
    <div className="admin-subtopic-editor-head">
      <b>Subtopics of {parentName}</b>
      <button type="button" onClick={() => setOpen(false)} disabled={saving}>Close</button>
    </div>
    <p>Rename a subtopic, or add one — a new subtopic is listed after the existing ones automatically. The major topics themselves are fixed and cannot be changed here.</p>
    {drafts.map((draft, index) => <div className={`admin-subtopic-row${draft.removed ? " is-removed" : ""}`} key={draft.id || `new-${index}`}>
      <input value={draft.name} disabled={draft.removed || saving} onChange={(event) => update(index, { name: event.target.value })} placeholder="Subtopic name" aria-label={draft.id ? `Name for ${draft.original}` : "New subtopic name"}/>
      {draft.removed
        ? <button type="button" disabled={saving} onClick={() => update(index, { removed: false })}>Keep</button>
        : <button type="button" className="admin-delete" disabled={saving} onClick={() => draft.id ? update(index, { removed: true }) : setDrafts((current) => current.filter((_, position) => position !== index))}>Remove</button>}
    </div>)}
    {drafts.some((draft) => draft.removed) && <p className="admin-upload-error" role="alert">Removing a subtopic un-files everything currently filed under it. Those items keep their major topic.</p>}
    <div className="admin-subtopic-editor-actions">
      <button type="button" className="admin-add-section" disabled={saving} onClick={add}><IconPlus size={16}/> Add a subtopic</button>
      <button type="button" className="btn btn-primary" disabled={saving || !pending} onClick={() => void commit()}>{saving ? "Saving…" : "Save subtopic changes"}</button>
    </div>
    {error && <p className="admin-upload-error" role="alert">{error}</p>}
  </div>;
}
// Reading a case.json is a two-step action on purpose: the file is parsed and
// what it will do — and everything it could not do — is shown before anything
// in the editor is touched.
function CaseJsonImport({ topics, onApply }: { topics: RecordItem[]; onApply: (patch: RecordItem) => boolean }) {
  const [result, setResult] = useState<CaseImport | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState(false);

  async function pick(file: File) {
    setError(""); setResult(null); setDone(false); setFileName(file.name);
    try {
      const parsed = readCaseJson(await file.text(), topics);
      if ("error" in parsed) { setError(parsed.error); return; }
      setResult(parsed);
    } catch { setError("That file could not be read."); }
  }

  return <section className="admin-case-import">
    <h2>Import from case.json</h2>
    <p>Fills the title, card summary and case sections from an archived case file. Images are never uploaded by the import — anything the file cannot set is listed for you.</p>
    <label className="admin-upload"><input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void pick(file); event.target.value = ""; }}/><IconPlus size={18}/>Choose a case.json</label>
    {error && <p className="admin-upload-error" role="alert">{error}</p>}
    {result && <div className="admin-import-report">
      <b>{fileName}</b>
      {done
        ? <p className="admin-import-done"><IconCheck size={15}/> Imported. Review every section before saving.</p>
        : <>
            <p>{result.applied.length ? <>Will fill: {result.applied.join(", ")}.</> : "Nothing in this file can be filled in automatically."}</p>
            {result.applied.length ? <button type="button" className="btn btn-primary admin-import-apply" onClick={() => { if (onApply(result.patch)) setDone(true); }}>Import into the editor</button> : null}
          </>}
      {result.issues.length ? <><span className="admin-import-flag">Check these {result.issues.length} point{result.issues.length === 1 ? "" : "s"}</span><ul>{result.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></> : <p>Nothing was flagged.</p>}
    </div>}
  </section>;
}

// The case record is fully editable: every heading can be renamed, sections can
// be reordered or removed, and new ones (an MDT outcome, a second follow-up
// note) can be appended. Each section gets the same rich-text editor, so the
// added ones behave exactly like the built-in five.
function CaseFields({ sections, setSections, storable = true, title = "Structured case record", intro = "Every section is optional. Rename any heading to suit the case, reorder them, or add your own. Add only reviewed, de-identified material.", dir }: { sections: CaseSection[]; setSections: (sections: CaseSection[]) => void; storable?: boolean; title?: string; intro?: string; dir?: "auto" }) {
  const update = (index: number, patch: Partial<CaseSection>) => setSections(sections.map((section, position) => position === index ? { ...section, ...patch } : section));
  // Removal used to be gated behind `window.confirm`. Chrome lets a page
  // suppress further dialogs for the rest of the session, after which confirm
  // returns false without ever showing: the button did nothing, silently. The
  // second click of this in-page pair is the confirmation instead.
  const [confirming, setConfirming] = useState<string | null>(null);
  function remove(index: number, section: CaseSection) {
    if (richTextHasContent(section.body) && confirming !== section.key) { setConfirming(section.key); return; }
    setConfirming(null);
    setSections(sections.filter((_, position) => position !== index));
  }
  function add() {
    // Keys must stay unique: they are how a section is identified across a
    // rename, and how the five built-ins keep their legacy database columns.
    const key = `section-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setSections([...sections, { key, label: "", body: "" }]);
  }
  return <section className="admin-case-fields">
    <h2>{title}</h2>
    <p>{intro}</p>
    {!storable && <p className="admin-blocked" role="alert"><b>Renamed headings and added sections will not be saved yet.</b> The database is missing the <code>case_sections</code> column: run <code>supabase/migrations/0010_case_sections.sql</code> in the Supabase SQL editor, then reload this page. The five standard sections below save normally in the meantime.</p>}
    {sections.map((section, index) => <div className="admin-case-section" key={section.key}>
      <div className="admin-case-section-head">
        <input className="admin-case-section-name" value={section.label} onChange={(event) => update(index, { label: event.target.value })} placeholder="Section heading (e.g. MDT outcome)" aria-label={`Heading for section ${index + 1}`}/>
        <div className="admin-case-section-tools">
          <button type="button" title="Move up" aria-label={`Move ${section.label || "section"} up`} disabled={index === 0} onClick={() => setSections(moveItem(sections, index, index - 1))}>↑</button>
          <button type="button" title="Move down" aria-label={`Move ${section.label || "section"} down`} disabled={index === sections.length - 1} onClick={() => setSections(moveItem(sections, index, index + 1))}>↓</button>
          <button type="button" className={`admin-delete${confirming === section.key ? " is-confirming" : ""}`} title={confirming === section.key ? "Click again to remove this section and its text" : "Remove section"} aria-label={confirming === section.key ? `Confirm removing ${section.label || "section"} and its text` : `Remove ${section.label || "section"}`} onClick={() => remove(index, section)} onBlur={() => setConfirming((current) => current === section.key ? null : current)}>{confirming === section.key ? "Remove?" : "Remove"}</button>
        </div>
      </div>
      <RichEditor value={section.body} onChange={(value) => update(index, { body: value })} placeholder={`Write the ${(section.label || "section").toLowerCase()}...`} dir={dir}/>
      {!section.label.trim() && section.body.trim() ? <small className="admin-upload-error">Give this section a heading, or it will not be published.</small> : null}
    </div>)}
    <button type="button" className="admin-add-section" onClick={add}><IconPlus size={16}/> Add a section</button>
  </section>;
}
/**
 * The file's own name, as the admin recognises it from their own machine.
 *
 * A file still waiting to upload has its File object to hand. A stored one is
 * named by its R2 key, whose final segment the upload route builds as
 * `<epoch>-<slugified name>.<ext>` — the timestamp is there to keep keys
 * unique, so it is plumbing rather than part of the name and is trimmed off.
 */
function mediaName(item: Media): string {
  if (item.file?.name) return item.file.name;
  const base = decodeURIComponent((item.storage_path || "").split("/").pop() ?? "");
  return base.replace(/^\d{10,}-/, "") || item.alt_text || "Untitled file";
}

/**
 * Deletes one image or file for good.
 *
 * A file already in R2 is gone permanently once the item is saved, so the
 * button asks first — the same two-step confirmation the poster image uses. A
 * file still waiting to be uploaded has nothing stored behind it yet, so it is
 * dropped straight away without ceremony.
 */
function DeleteMediaButton({ stored, label, compact = false, onDelete }: { stored: boolean; label: string; compact?: boolean; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!stored) return <button type="button" className="admin-delete" aria-label={`Remove ${label}`} onClick={onDelete}>{compact ? "✕" : "Remove"}</button>;
  if (!confirming) return <button type="button" className="admin-delete" aria-label={`Delete ${label} from this item and R2`} title="Delete permanently" onClick={() => setConfirming(true)}>{compact ? "✕" : "Delete"}</button>;
  return <span className="admin-media-confirm" role="alert">
    <span>Delete for good?</span>
    <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
    <button type="button" className="admin-delete" onClick={() => { setConfirming(false); onDelete(); }}>Delete</button>
  </span>;
}

// Files are shown, and published, in the order they appear here — the order is
// saved as each row's `sort_order`. Picking six images rarely picks them in the
// right order, so a row can be dragged into place (or nudged with the arrows,
// which is also the keyboard route).
function MediaManager({ media, setMedia, upload, onDelete, uploading, error }: { media: Media[]; setMedia: (value: Media[]) => void; upload: (files: File[]) => void; onDelete: (target: string) => void; uploading: boolean; error?: string }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  function drop(target: number) {
    if (dragging !== null) setMedia(moveItem(media, dragging, target));
    setDragging(null); setOver(null);
  }
  return <section className="admin-media">
    <h2>Images & PDFs</h2>
    <p>Add in-article images or a downloadable PDF. Maximum 10 MB each. Select several at once. Files upload when you save, and deleting one removes it from storage when you save.</p>
    <label className="admin-upload"><input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) upload(files); event.target.value = ""; }}/><IconPlus size={18}/>{uploading ? "Saving..." : "Choose files"}</label>
    {error && <p className="admin-upload-error" role="alert">{error}</p>}
    {media.length > 1 && <p className="admin-media-hint">Drag a file to change the order it appears in, or use the arrows.</p>}
    {media.map((item, index) => <div
      className={`admin-media-item${dragging === index ? " is-dragging" : ""}${over === index && dragging !== null && dragging !== index ? " is-drop-target" : ""}`}
      key={item.local_id ?? item.storage_path}
      draggable
      onDragStart={(event) => { setDragging(index); event.dataTransfer.effectAllowed = "move"; }}
      onDragEnd={() => { setDragging(null); setOver(null); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setOver(index); }}
      onDrop={(event) => { event.preventDefault(); drop(index); }}
    >
      <span className="admin-media-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
      <span className="admin-media-position" aria-hidden="true">{index + 1}</span>
      {item.kind === "image" ? <a className="admin-media-preview" href={item.public_url} target="_blank" rel="noreferrer" aria-label="Open image preview"><img src={item.public_url} alt={item.alt_text || "Uploaded image preview"}/></a> : <span className="admin-media-kind">PDF</span>}
      <div>
        <span className="admin-media-name" title={mediaName(item)}>{mediaName(item)}</span>
        <input value={item.alt_text ?? ""} onChange={(event) => setMedia(media.map((entry, position) => position === index ? { ...entry, alt_text: event.target.value } : entry))} placeholder="Alt text / file description"/>
        {item.kind === "image" && <a href={item.public_url} target="_blank" rel="noreferrer">Open preview</a>}
      </div>
      <div className="admin-media-tools">
        <button type="button" title="Move up" aria-label={`Move ${mediaName(item)} earlier`} disabled={index === 0} onClick={() => setMedia(moveItem(media, index, index - 1))}>↑</button>
        <button type="button" title="Move down" aria-label={`Move ${mediaName(item)} later`} disabled={index === media.length - 1} onClick={() => setMedia(moveItem(media, index, index + 1))}>↓</button>
        <DeleteMediaButton stored={Boolean(item.storage_path)} label={mediaName(item)} onDelete={() => onDelete(item.storage_path || item.local_id || "")}/>
      </div>
    </div>)}
  </section>;
}
/**
 * Files a paper into the research topic tree.
 *
 * The topic is the only classification the public site uses: it drives the
 * archive's filters and the colour of the paper's generated cover. Choosing a
 * different topic clears the subtopic, because a subtopic only ever belongs to
 * one parent and keeping a stale one would file the paper under two unrelated
 * headings.
 */
function ResearchTopicPicker({ topics, topicId, subtopicId, taxonomy, onChange }: { topics: RecordItem[]; topicId: string; subtopicId: string; taxonomy: TaxonomyAdmin; onChange: (topicId: string, subtopicId: string) => void }) {
  const parents = topics.filter((topic) => !topic.parent_id);
  const children = topics.filter((topic) => String(topic.parent_id ?? "") === topicId);
  return <section className="admin-topic-picker">
    <div className="admin-field-grid">
      <Select label="Topic" hint="Sets the colour and design of this paper's cover." value={topicId} onChange={(value) => onChange(value, "")} options={[["", parents.length ? "Unfiled" : "No topics yet"], ...parents.map((topic) => [String(topic.id), String(topic.name)] as [string, string])]}/>
      <Select label="Subtopic" value={children.length ? subtopicId : ""} onChange={(value) => onChange(topicId, value)} options={[["", children.length ? "None" : topicId ? "This topic has no subtopics" : "Choose a topic first"], ...children.map((topic) => [String(topic.id), String(topic.name)] as [string, string])]}/>
    </div>
    {topicId && <SubtopicManager key={topicId} resource="research-topics" parentId={topicId} parentName={String(parents.find((topic) => String(topic.id) === topicId)?.name ?? "this topic")} subtopics={children} taxonomy={taxonomy} onRemoved={(id) => { if (id === subtopicId) onChange(topicId, ""); }}/>}
  </section>;
}

// ---------------------------------------------------------------------------
// News categories
//
// Managed from inside the news editor that files items under them, the way
// subtopics are — this is where their wording is actually being judged. Unlike
// the surgical and research taxonomies there is nothing fixed here: the admin
// owns the whole list, because the four seeded categories were a starting
// point rather than the site's structure.
//
// Changes are held as a draft until "Save category changes", so a half-typed
// rename never reaches the public filter chips.
// ---------------------------------------------------------------------------
type CategoryDraft = { id: string; name: string; original: string; nameAr: string; originalAr: string; slug: string; sort_order: number; removed: boolean };

function toCategoryDrafts(categories: RecordItem[]): CategoryDraft[] {
  return categories.map((category) => ({
    id: String(category.id),
    name: String(category.name ?? ""), original: String(category.name ?? ""),
    nameAr: String(category.name_ar ?? ""), originalAr: String(category.name_ar ?? ""),
    slug: String(category.slug ?? ""), sort_order: Number(category.sort_order) || 0, removed: false,
  }));
}

function NewsCategoryManager({ categories, taxonomy, onRemoved }: { categories: RecordItem[]; taxonomy: TaxonomyAdmin; onRemoved?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<CategoryDraft[]>(() => toCategoryDrafts(categories));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  // Reopening starts from what the database currently holds rather than from a
  // stale draft. `categories` is a fresh array on every parent render, so the
  // reset is keyed on a signature of the rows instead of the array identity —
  // otherwise this re-seeds, and re-renders, forever.
  const latest = useRef(categories);
  useEffect(() => { latest.current = categories; });
  const signature = categories.map((category) => `${String(category.id)}:${String(category.name)}:${String(category.name_ar ?? "")}`).join("|");
  useEffect(() => { if (!open) setDrafts(toCategoryDrafts(latest.current)); }, [open, signature]);

  const update = (index: number, patch: Partial<CategoryDraft>) => setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, ...patch } : draft));
  // The order is never typed: a new category is placed after the last existing
  // one, so adding one is a single decision — its name.
  function add() {
    setDrafts((current) => [...current, { id: "", name: "", original: "", nameAr: "", originalAr: "", slug: "", sort_order: current.reduce((highest, draft) => Math.max(highest, draft.sort_order), 0) + 1, removed: false }]);
  }
  const pending = drafts.some((draft) => draft.removed || (draft.id ? draft.name.trim() !== draft.original || draft.nameAr.trim() !== draft.originalAr : draft.name.trim().length > 0));

  async function commit() {
    setError(""); setDone("");
    const blank = drafts.find((draft) => !draft.removed && draft.id && !draft.name.trim());
    if (blank) { setError(`“${blank.original}” needs a name. Type one, or remove the category.`); return; }
    setSaving(true);
    try {
      for (const draft of drafts) {
        const name = draft.name.trim();
        const nameAr = draft.nameAr.trim();
        if (draft.removed) { if (draft.id) { await taxonomy.remove("news-categories", draft.id); onRemoved?.(draft.id); } continue; }
        if (!draft.id) { if (name) await taxonomy.save("news-categories", { name, name_ar: nameAr, sort_order: draft.sort_order }); continue; }
        // The stored slug is sent back unchanged: it addresses the public
        // filter chip, so regenerating it from a reworded name would break a
        // shared filtered link.
        if (name !== draft.original || nameAr !== draft.originalAr) await taxonomy.save("news-categories", { id: draft.id, name, name_ar: nameAr, slug: draft.slug, sort_order: draft.sort_order });
      }
      await taxonomy.reload("news-categories");
      setDone("Saved. The new wording is live everywhere these categories appear.");
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save these categories.");
      await taxonomy.reload("news-categories").catch(() => {});
    } finally { setSaving(false); }
  }

  if (!open) return <div className="admin-subtopic-edit-row">
    <button type="button" className="admin-subtopic-edit" onClick={() => { setOpen(true); setError(""); setDone(""); }}>Edit categories</button>
    {done && <span className="admin-subtopic-done" role="status"><IconCheck size={15}/> {done}</span>}
    {error && <span className="admin-upload-error" role="alert">{error}</span>}
  </div>;
  return <div className="admin-subtopic-editor">
    <div className="admin-subtopic-editor-head">
      <b>News categories</b>
      <button type="button" onClick={() => setOpen(false)} disabled={saving}>Close</button>
    </div>
    <p>These are the filter chips readers see above the news feed, and the label on every card. Rename one, translate it, or add your own — a new category is listed after the existing ones automatically. The Arabic name is optional; without it the Arabic page shows the English name.</p>
    {drafts.map((draft, index) => <div className={`admin-subtopic-row${draft.removed ? " is-removed" : ""}`} key={draft.id || `new-${index}`}>
      <input value={draft.name} disabled={draft.removed || saving} onChange={(event) => update(index, { name: event.target.value })} placeholder="Category name" aria-label={draft.id ? `Name for ${draft.original}` : "New category name"}/>
      <input dir="auto" value={draft.nameAr} disabled={draft.removed || saving} onChange={(event) => update(index, { nameAr: event.target.value })} placeholder="Arabic name (optional)" aria-label={draft.id ? `Arabic name for ${draft.original}` : "New category Arabic name"}/>
      {draft.removed
        ? <button type="button" disabled={saving} onClick={() => update(index, { removed: false })}>Keep</button>
        : <button type="button" className="admin-delete" disabled={saving} onClick={() => draft.id ? update(index, { removed: true }) : setDrafts((current) => current.filter((_, position) => position !== index))}>Remove</button>}
    </div>)}
    {drafts.some((draft) => draft.removed) && <p className="admin-upload-error" role="alert">Removing a category un-files every item currently in it. Those items keep their page and appear under no chip until you refile them.</p>}
    <div className="admin-subtopic-editor-actions">
      <button type="button" className="admin-add-section" disabled={saving} onClick={add}><IconPlus size={16}/> Add a category</button>
      <button type="button" className="btn btn-primary" disabled={saving || !pending} onClick={() => void commit()}>{saving ? "Saving…" : "Save category changes"}</button>
    </div>
    {error && <p className="admin-upload-error" role="alert">{error}</p>}
  </div>;
}

/**
 * Attaches one related record to a news item — usually the event a recap is
 * about, sometimes the case or paper a milestone refers to.
 *
 * The options for a type are read the first time that type is chosen, not when
 * the editor opens: most items have no related record, and each list is a full
 * admin read. `loadOptions` caches per type for the session, and this only
 * asks again when the chosen type changes, so a re-render never re-fetches.
 */
function RelatedRecordPicker({ type, reference, loadOptions, onChange }: { type: string; reference: string; loadOptions: (type: NewsRelationType) => Promise<RelatedOption[]>; onChange: (type: string, reference: string) => void }) {
  const [state, setState] = useState<{ type: string; options: RelatedOption[]; error: string }>({ type: "", options: [], error: "" });
  const ready = Boolean(type) && state.type === type;
  useEffect(() => {
    if (!type || state.type === type) return;
    let cancelled = false;
    void loadOptions(type as NewsRelationType)
      .then((options) => { if (!cancelled) setState({ type, options, error: "" }); })
      .catch((error) => { if (!cancelled) setState({ type, options: [], error: error instanceof Error ? error.message : "Could not load those records." }); });
    return () => { cancelled = true; };
  }, [type, state.type, loadOptions]);

  const label = (option: RelatedOption) => option.status && option.status !== "published" ? `${option.label} (${option.status})` : option.label;
  return <section className="admin-topic-picker">
    <span className="admin-label-text">Related record (optional)</span>
    <div className="admin-field-grid">
      <Select label="Kind" value={type} onChange={(value) => onChange(value, "")} options={[["", "None"], ["event", "Event"], ["content", "Case or article"], ["research", "Research paper"]]}/>
      <Select label="Record" value={ready ? reference : ""} onChange={(value) => onChange(type, value)} options={
        !type ? [["", "Choose a kind first"]]
          : state.error ? [["", "Could not load — reopen the editor"]]
          : !ready ? [["", "Loading…"]]
          : [["", state.options.length ? "None" : "Nothing published to link to yet"], ...state.options.map((option) => [option.ref, label(option)] as [string, string])]
      }/>
    </div>
    {state.error && <p className="admin-upload-error" role="alert">{state.error}</p>}
    <small>Shown as a card at the foot of this item&apos;s page — the summit a recap covers, or the paper a milestone announces.</small>
  </section>;
}

function PosterImagePicker({ value, removed, onRemove, onPick, uploading, error }: { value: string; removed: boolean; onRemove: () => void; onPick: (file: File) => void; uploading: boolean; error?: string }) {
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const storedInR2 = value.startsWith("/api/media/");
  // Removing a poster's image unpublishes it: the image *is* the poster, so
  // there is nothing left to show once it is gone.
  const removalWarning = storedInR2
    ? "Saving this change will unpublish the poster and permanently delete its image from R2."
    : "Saving this change will unpublish the poster and remove its image reference.";
  return <section className="admin-media admin-cover-picker"><h2>Poster image</h2><p>This is the poster itself. It uploads to the site&apos;s R2 media bucket when you save, then appears in the featured layout, archive card and detail page. Maximum 10 MB.</p>
    {value && <div className="admin-cover-preview"><img src={value} alt="Poster preview"/></div>}
    <label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPick(file); event.target.value = ""; }}/><IconPlus size={18}/>{uploading ? "Saving..." : "Choose poster image"}</label>
    {error && <p className="admin-upload-error" role="alert">{error}</p>}
    {value && !confirmingRemoval && <button type="button" className="admin-delete" onClick={() => setConfirmingRemoval(true)}>Delete image from poster and R2</button>}
    {value && confirmingRemoval && <div className="admin-removal-confirm" role="alert"><p>{removalWarning}</p><div><button type="button" onClick={() => setConfirmingRemoval(false)}>Cancel</button><button type="button" className="admin-delete" onClick={() => { onRemove(); setConfirmingRemoval(false); }}>Mark image for deletion</button></div></div>}
    {removed && <p className="admin-removal-notice" role="status">Image marked for removal. Save to unpublish the poster and delete its stored R2 file. Cancel to keep it.</p>}
  </section>;
}

/**
 * Picks a news item's cover from the photographs already attached to it.
 *
 * A cover used to be its own separate upload, which stored the same photograph
 * twice when it was also wanted in the gallery, and made choosing the third
 * image as the cover a hunt for the file on disk again. It is now a choice among
 * the images already attached: nothing is uploaded here, the cover inherits that
 * image's alt text, and the strip on the item page drops whichever one is chosen
 * so the same photograph is never shown twice.
 *
 * The choice is held as the image's key — its R2 `storage_path`, or the
 * temporary `local_id` of one still waiting to be uploaded — and resolved to a
 * URL on save, once every pending file has a real one.
 */
function NewsCoverPicker({ media, selectedKey, onSelect }: { media: Media[]; selectedKey: string; onSelect: (key: string) => void }) {
  const images = media.filter((item) => item.kind === "image");
  const chosen = images.find((item) => (item.storage_path || item.local_id || "") === selectedKey);
  return <section className="admin-media admin-thumbnail-picker">
    <h2>Cover photo</h2>
    <p>The photograph on this item&apos;s feed card and at the top of its page, chosen from the images above. Without one the site draws a generated typographic cover instead.</p>
    {images.length
      ? <>
          <div className="admin-thumbnail-options">{images.map((item) => { const key = item.storage_path || item.local_id || ""; return <div className="admin-thumbnail-option" key={key}>
            <label title={mediaName(item)}><input type="radio" name="news-cover" checked={selectedKey === key} onChange={() => onSelect(key)}/><img src={item.public_url} alt={item.alt_text || mediaName(item)}/><span className="admin-thumbnail-name">{mediaName(item)}</span></label>
          </div>; })}</div>
          <label className="admin-checkbox"><input type="radio" name="news-cover" checked={!chosen} onChange={() => onSelect("")}/>No cover photo &mdash; draw a generated one</label>
        </>
      : <p className="admin-media-hint">Add an image under &ldquo;Images &amp; PDFs&rdquo; above, then choose it here.</p>}
  </section>;
}
type ThumbnailSource = "youtube" | "image" | "before_after";

/** One half of the before/after pair: drop an image on it, choose a file, or
    pick one of the images already attached to this case. */
function PairSlot({ label, images, selectedPath, onSelect, onDropFile, onDelete }: { label: string; images: Media[]; selectedPath: string; onSelect: (path: string) => void; onDropFile: (file: File) => void; onDelete: (target: string) => void }) {
  const [over, setOver] = useState(false);
  const chosen = images.find((item) => (item.storage_path || item.local_id || "") === selectedPath);
  const inputId = `pair-slot-${label.toLowerCase()}`;
  return <div className="admin-pair-slot">
    <label
      className={`admin-pair-drop${over ? " is-over" : ""}${chosen ? " has-image" : ""}`}
      htmlFor={inputId}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault(); setOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onDropFile(file);
      }}
    >
      <span className="admin-pair-title">{label}</span>
      {chosen ? <><img src={chosen.public_url} alt={`${label} image preview`}/><span className="admin-pair-name" title={mediaName(chosen)}>{mediaName(chosen)}</span></> : <span className="admin-pair-hint">Drag an image here, or click to choose</span>}
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onDropFile(file); event.target.value = ""; }}/>
    </label>
    {images.length > 0 && <select aria-label={`${label} image`} value={selectedPath} onChange={(event) => onSelect(event.target.value)}>
      <option value="">Or reuse a case image…</option>
      {images.map((item) => { const key = item.storage_path || item.local_id || ""; return <option key={key} value={key}>{mediaName(item)}</option>; })}
    </select>}
    {chosen && <div className="admin-pair-actions">
      {/* Two different intents: keep the image but stop using it here, or get
          rid of the image altogether. */}
      <button type="button" onClick={() => onSelect("")}>Clear slot</button>
      <DeleteMediaButton stored={Boolean(chosen.storage_path)} label={mediaName(chosen)} onDelete={() => onDelete(chosen.storage_path || chosen.local_id || "")}/>
    </div>}
  </div>;
}

function ThumbnailPicker({ media, source, selectedPath, beforePath, afterPath, onSource, onSelect, onSelectBefore, onSelectAfter, onDropBefore, onDropAfter, onDelete }: { media: Media[]; source: ThumbnailSource; selectedPath: string; beforePath: string; afterPath: string; onSource: (source: ThumbnailSource) => void; onSelect: (path: string) => void; onSelectBefore: (path: string) => void; onSelectAfter: (path: string) => void; onDropBefore: (file: File) => void; onDropAfter: (file: File) => void; onDelete: (target: string) => void }) {
  const images = media.filter((item) => item.kind === "image");
  return <section className="admin-media admin-thumbnail-picker">
    <h2>Topic card thumbnail</h2>
    <p>Choose the YouTube thumbnail, one of this item&apos;s uploaded images, or a before/after pair shown as one split image.</p>
    <label className="admin-checkbox"><input type="radio" name="thumbnail-source" checked={source === "youtube"} onChange={() => onSource("youtube")}/>Use YouTube thumbnail</label>
    <label className="admin-checkbox"><input type="radio" name="thumbnail-source" checked={source === "image"} onChange={() => onSource("image")} disabled={!images.length}/>Use uploaded image</label>
    <label className="admin-checkbox"><input type="radio" name="thumbnail-source" checked={source === "before_after"} onChange={() => onSource("before_after")}/>Use a before &amp; after pair</label>
    {source === "image" && (images.length ? <div className="admin-thumbnail-options">{images.map((item) => { const key = item.storage_path || item.local_id || ""; return <div className="admin-thumbnail-option" key={key}>
      <label title={mediaName(item)}><input type="radio" name="thumbnail-image" checked={selectedPath === key} onChange={() => onSelect(key)}/><img src={item.public_url} alt={item.alt_text || mediaName(item)}/><span className="admin-thumbnail-name">{mediaName(item)}</span></label>
      <DeleteMediaButton stored={Boolean(item.storage_path)} label={mediaName(item)} compact onDelete={() => onDelete(key)}/>
    </div>; })}</div> : <p className="admin-upload-error">Add an image first, then select it here.</p>)}
    {source === "image" && images.length > 0 && !images.some((item) => (item.storage_path || item.local_id || "") === selectedPath) && <p className="admin-upload-error">Choose which image to use, or the card falls back to the YouTube thumbnail.</p>}
    {source === "before_after" && <>
      <div className="admin-pair-grid">
        <PairSlot label="Before" images={images} selectedPath={beforePath} onSelect={onSelectBefore} onDropFile={onDropBefore} onDelete={onDelete}/>
        <PairSlot label="After" images={images} selectedPath={afterPath} onSelect={onSelectAfter} onDropFile={onDropAfter} onDelete={onDelete}/>
      </div>
      <p className="admin-media-hint">Dropped images join this case&apos;s images. Readers see the two halves as one picture; the Before and After captions appear on hover.</p>
      {(!beforePath || !afterPath) && <p className="admin-upload-error" role="alert">
        {!beforePath && !afterPath ? "Choose a before and an after image" : !beforePath ? "Choose the before image" : "Choose the after image"} to use this cover, or switch back to the YouTube thumbnail or a single uploaded image. The case cannot be saved until then.
      </p>}
    </>}
  </section>;
}
function Chapters({ chapters, setChapters }: { chapters: { title: string; starts_at_seconds: number }[]; setChapters: (chapters: { title: string; starts_at_seconds: number }[]) => void }) { return <section className="admin-chapters"><div><h2>Video chapters</h2><button type="button" onClick={() => setChapters([...chapters, { title: "", starts_at_seconds: 0 }])}>Add chapter</button></div>{chapters.length ? chapters.map((chapter, index) => <div className="admin-chapter" key={index}><input value={chapter.title} onChange={(event) => setChapters(chapters.map((entry, position) => position === index ? { ...entry, title: event.target.value } : entry))} placeholder="Chapter title"/><input type="number" value={chapter.starts_at_seconds} onChange={(event) => setChapters(chapters.map((entry, position) => position === index ? { ...entry, starts_at_seconds: Number(event.target.value) } : entry))} aria-label="Start time in seconds"/><button type="button" onClick={() => setChapters(chapters.filter((_, position) => position !== index))}></button></div>) : <p>No chapters added.</p>}</section>; }
// Saving lives in the header, and the header sticks: long case records used to
// hide the only save button several screens below the fold.
function EditorHead({ title, onCancel, busy = false, progress = null, blocked = "" }: { title: string; onCancel: () => void; busy?: boolean; progress?: { done: number; total: number; label: string } | null; blocked?: string }) {
  const percent = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;
  return <div className="admin-editor-head"><div><span className="admin-kicker">Content editor</span><h2>{title}</h2></div><div className="admin-editor-actions">
    <div className="admin-save-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving..." : <>Save changes <IconArrowRight size={17}/></>}</button><button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button></div>
    {blocked && <p className="admin-blocked admin-save-blocked" role="alert">{blocked}</p>}
    {progress && <div className="admin-save-progress" role="status" aria-live="polite">
      <div className="admin-save-bar"><span style={{ width: `${percent}%` }}/></div>
      <small>{progress.label} · {percent}%</small>
    </div>}
  </div></div>;
}
/**
 * One record's reading layout.
 *
 * Justified is the default and the site-wide intent — even edges read more
 * easily in a column — so this is an opt-out rather than an opt-in. The
 * occasional record whose body is a few short fragments or a bare list reads
 * worse justified, which is why the choice is per record and not a setting.
 *
 * `value !== false` rather than `value === true`: a record saved before the
 * column existed, and a form that has not been touched, are both justified.
 */
function JustifyToggle({ value, onChange, what }: { value: unknown; onChange: (next: boolean) => void; what: string }) {
  return <section className="admin-optional-link"><h2>Reading layout</h2>
    <p>Justified text lines up both edges of {what}, which reads more evenly in a column. Turn it off to leave the right edge ragged — better when the text is a few short fragments or a list.</p>
    <label className="admin-checkbox"><input type="checkbox" checked={value !== false} onChange={(event) => onChange(event.target.checked)}/>Justify this text on the public page</label>
  </section>;
}

function Field({ label, value, onChange, type = "text", hint, required = false, dir }: { label: string; value: unknown; onChange: (value: string) => void; type?: string; hint?: string; required?: boolean; dir?: "auto" }) { return <label className="admin-label">{label}{type === "textarea" ? <textarea dir={dir} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required}/> : <input dir={dir} type={type} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required}/>} {hint && <small>{hint}</small>}</label>; }
function Select({ label, value, onChange, options, hint }: { label: string; value: unknown; onChange: (value: string) => void; options: string[][]; hint?: string }) { return <label className="admin-label">{label}<select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>{hint && <small>{hint}</small>}</label>; }
function SimpleEditor({ title, fields, form, set, onCancel, onSave }: { title: string; fields: string[][]; form: RecordItem; set: (key: string, value: unknown) => void; onCancel: () => void; onSave: (event: FormEvent) => void }) { return <form className="admin-editor admin-simple-editor" onSubmit={onSave}><EditorHead title={title} onCancel={onCancel}/><div className="admin-simple-fields">{fields.map(([key, label]) => <Field key={key} label={label} hint={key === "highlights" ? "One highlight per line." : undefined} type={key === "summary" || key === "description" || key === "biography" || key === "highlights" ? "textarea" : key.includes("_at") ? "datetime-local" : key.includes("url") ? "url" : key === "sort_order" ? "number" : "text"} value={form[key]} onChange={(value) => set(key, value)}/>) }</div></form>; }
