"use client";

import { FormEvent, MouseEvent as ReactMouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { IconArrowRight, IconCheck, IconFile, IconLayers, IconPlus, IconSearch, IconUser, IconUsers } from "./icons";

type Section = "overview" | "content" | "posters" | "topics" | "events" | "contributors" | "people" | "research";
type Access = "checking" | "signed_out" | "denied" | "unavailable" | "ready";
const ADMIN_REQUEST_TIMEOUT_MS = 12_000;
class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
type RecordItem = Record<string, unknown>;
type ContentItem = RecordItem & { id?: string; title?: string; status?: string; kind?: string; access_level?: string; topic_ids?: string[]; chapters?: { title: string; starts_at_seconds: number }[]; content_media?: Media[] };
// `file` and `local_id` are client-only: a picked-but-not-yet-uploaded image
// carries its File and a temporary id, and its `public_url` is an object URL
// used only for the in-editor preview. Nothing reaches R2 until Save commits it.
type Media = { storage_path: string; public_url: string; kind: "image" | "document"; alt_text?: string; caption?: string; file?: File; local_id?: string };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
type ContentFilters = { major: string; subtopic: string; status: string; access: string; from: string; to: string; sort: "published_desc" | "published_asc" | "updated_desc" };
const EMPTY_CONTENT_FILTERS: ContentFilters = { major: "", subtopic: "", status: "", access: "", from: "", to: "", sort: "published_desc" };
type ResearchFilters = { year: string; category: string; status: string };
const EMPTY_RESEARCH_FILTERS: ResearchFilters = { year: "", category: "", status: "" };

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
  { id: "topics", label: "Topics", icon: IconLayers }, { id: "events", label: "Events & webinars", icon: IconPlus },
  { id: "contributors", label: "Contributors", icon: IconUsers }, { id: "people", label: "People & roles", icon: IconUser },
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
  // A warning must not arrive wearing the green tick that means "all done".
  const [noticeTone, setNoticeTone] = useState<"ok" | "warn">("ok");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contentFilters, setContentFilters] = useState<ContentFilters>(EMPTY_CONTENT_FILTERS);
  const [researchFilters, setResearchFilters] = useState<ResearchFilters>(EMPTY_RESEARCH_FILTERS);

  // False once the server reports that `content_items.case_sections` is missing
  // (migration 0010 not applied): renamed headings and added sections cannot be
  // stored, and the editor says so rather than letting a save quietly lose them.
  const [caseSectionsStorable, setCaseSectionsStorable] = useState(true);
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
      } else { setNotice(message); setNoticeTone("warn"); }
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
    () => items.map((item) => ({ item, haystack: ["title", "name", "display_name", "slug", "summary", "kind", "status", "level", "email", "full_name", "topic", "event_type", "location", "authors", "journal", "category"].map((key) => typeof item[key] === "string" ? item[key] as string : "").join(" ").toLowerCase() })),
    [items],
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const searched = needle ? searchable.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.item) : items;
    if (active === "research") {
      return searched.filter((item) => {
        const year = String(item.published_date ?? "").slice(0, 4);
        return (!researchFilters.year || year === researchFilters.year)
          && (!researchFilters.category || item.category === researchFilters.category)
          && (!researchFilters.status || item.status === researchFilters.status);
      }).sort((a, b) => {
        // Newly added research (no publication date yet) sits on top, then by
        // publication date, newest first, then by most recently touched.
        const da = String(a.published_date ?? ""), db = String(b.published_date ?? "");
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
  }, [active, contentFilters, researchFilters, items, search, searchable, topics]);
  function startNew() {
    if (active === "content") setEditing(emptyContent());
    else if (active === "posters") setEditing({ kind: "poster", status: "published", access_level: "public", title: "", slug: "", summary: "", level: "Clinical poster", poster_url: "", poster_cta_text: "", poster_cta_url: "", contributor_ids: [], case_sections: [{ key: "overview", label: "Overview", body: "" }, { key: "findings", label: "Key findings", body: "" }] });
    else if (active === "research") setEditing({ title: "", authors: "", abstract: "", journal: "", category: "Paper", status: "published", published_date: "", link: "", cover_image_url: "", research_media: [] });
    else if (active === "topics") setEditing({ name: "", slug: "", description: "", sort_order: 0 });
    else if (active === "events") setEditing({ title: "", slug: "", event_type: "Webinar", format: "online", status: "published" });
    else if (active === "contributors") setEditing({ display_name: "", credentials: "", role_title: "", group_name: "", biography: "", published: true, sort_order: 0 });
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
    try { const headers = await authHeaders(); const apiResource = active === "posters" ? "content" : active; const response = await fetch(`/api/admin/${apiResource}?id=${encodeURIComponent(String(item.id))}`, { method: "DELETE", headers }); const result = await readResponse(response); if (!response.ok) throw new Error(errorMessage(result.error, "Could not delete this item.")); setNotice("Deleted."); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete this item."); setNoticeTone("warn"); }
  }
  async function signOut() { await getSupabaseBrowserClient().auth.signOut(); window.location.assign("/en/sign-in"); }

  if (access === "checking" && !identity) return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Checking your access...</h1><p>Restoring your staff session.</p></main>;
  if (access === "signed_out") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Sign in to continue</h1><p>{accessMessage}</p><Link className="btn btn-primary" href="/en/sign-in">Sign in</Link></main>;
  if (access === "denied") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>Admin access required</h1><p>{accessMessage}</p><div className="admin-access-actions"><button className="btn btn-primary" type="button" onClick={() => { setAccess("checking"); void load("overview"); }}>Try again</button><button className="btn btn-outline" type="button" onClick={signOut}>Sign in as another account</button></div></main>;
  if (access === "unavailable") return <main className="admin-access"><span className="admin-kicker">Smart Surgical Team</span><h1>We could not verify your access</h1><p>{accessMessage}</p><div className="admin-access-actions"><button className="btn btn-primary" type="button" onClick={() => { setAccess("checking"); void load("overview"); }}>Try again</button><button className="btn btn-outline" type="button" onClick={signOut}>Sign in again</button></div></main>;
  const canCreate = ["content", "posters", "research", "topics", "events", "contributors"].includes(active);
  const createLabel = active === "content" ? "content" : active === "posters" ? "poster" : active === "research" ? "research" : active === "events" ? "event" : active.slice(0, -1);
  return <main className="admin-shell"><aside className="admin-sidebar"><Link className="admin-brand" href="/en"><img className="admin-logo" src="/sst-mark.png" alt=""/><span className="admin-brand-copy"><b>Smart Surgical Team</b><small>Admin</small></span></Link><div className="admin-owner"><span>{String(identity?.full_name ?? identity?.name ?? "Owner").split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><div><b>{String(identity?.full_name ?? identity?.name ?? "Smart Surgical Team")}</b><small>{String(identity?.role ?? "owner").replace(/_/g, " ")}</small></div></div><nav aria-label="Admin sections">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "is-active" : ""} type="button" onClick={() => { setActive(id); setEditing(null); setSearch(""); }}><Icon size={18}/>{label}</button>)}</nav><button className="admin-signout" type="button" onClick={signOut}>Sign out</button></aside><section className="admin-main"><header className="admin-topbar"><div><span className="admin-kicker">Content operations</span><h1>{nav.find((item) => item.id === active)?.label}</h1></div>{canCreate && <button className="btn btn-primary" type="button" onClick={startNew}><IconPlus size={17}/> Add {createLabel}</button>}</header>{notice && <p className={noticeTone === "warn" ? "admin-notice is-warning" : "admin-notice"} role="status">{noticeTone === "warn" ? <b aria-hidden="true">!</b> : <IconCheck size={17}/>}{notice}</p>}{loading ? <div className="admin-loading">Loading workspace...</div> : <>{active === "overview" ? <Overview metrics={metrics} setActive={setActive}/> : editing ? <Editor section={active} value={editing} topics={topics} contributors={contributors} caseSectionsStorable={caseSectionsStorable} onCancel={() => setEditing(null)} onSave={save}/> : <List section={active} items={filtered} search={search} setSearch={setSearch} topics={topics} filters={contentFilters} setFilters={setContentFilters} researchFilters={researchFilters} setResearchFilters={setResearchFilters} onEdit={setEditing} onDelete={remove}/>}</>}</section></main>;
}

function Overview({ metrics, setActive }: { metrics: RecordItem; setActive: (section: Section) => void }) {
  const cards: { key: string; label: string; section: Section }[] = [{ key: "published", label: "Published items", section: "content" }, { key: "drafts", label: "Drafts & unpublishing", section: "content" }, { key: "events", label: "Published events", section: "events" }, { key: "contributors", label: "Contributors", section: "contributors" }, { key: "members", label: "Members", section: "people" }, { key: "research", label: "Research publications", section: "research" }];
  return <div className="admin-overview"><section className="admin-welcome"><div><span className="admin-kicker">Control room</span><h2>Keep the platform current, carefully.</h2><p>Publish case articles, update the team, and keep events and learning material accurate from one place.</p></div><button className="btn btn-primary" type="button" onClick={() => setActive("content")}>Create a case article <IconArrowRight size={17}/></button></section><div className="admin-metric-grid">{cards.map((card) => <button type="button" onClick={() => setActive(card.section)} key={card.key}><strong>{String(metrics[card.key] ?? 0)}</strong><span>{card.label}</span><IconArrowRight size={16}/></button>)}</div><section className="admin-safety"><h2>Clinical publishing reminder</h2><p>Only publish material that has been de-identified, consented, and approved by the team. Articles are public unless you select Site users only in the content editor.</p></section></div>;
}

function List({ section, items, search, setSearch, topics, filters, setFilters, researchFilters, setResearchFilters, onEdit, onDelete }: { section: Section; items: RecordItem[]; search: string; setSearch: (value: string) => void; topics: RecordItem[]; filters: ContentFilters; setFilters: (filters: ContentFilters) => void; researchFilters: ResearchFilters; setResearchFilters: (filters: ResearchFilters) => void; onEdit: (item: RecordItem) => void; onDelete: (item: RecordItem) => void }) {
  // Deleting used to ask through `window.confirm`, which a page can be made to
  // suppress for the rest of the session — after that it returns false and the
  // button silently did nothing. The second click confirms instead.
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const majors = topics.filter((topic) => !topic.parent_id);
  const subtopics = topics.filter((topic) => String(topic.parent_id ?? "") === filters.major);
  const researchYears = section === "research" ? [...new Set(items.map((item) => String(item.published_date ?? "").slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a)) : [];
  const researchCategories = section === "research" ? [...new Set(items.map((item) => String(item.category ?? "")).filter(Boolean))].sort() : [];
  const change = (key: keyof ContentFilters, value: string) => setFilters({ ...filters, [key]: value, ...(key === "major" ? { subtopic: "" } : {}) });
  return <div className="admin-list"><div className="admin-list-controls"><label><IconSearch size={17}/><span className="visually-hidden">Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${section}...`}/></label><span>{items.length} items</span></div>{section === "content" ? <div className="admin-content-filters"><label>Topic<select value={filters.major} onChange={(event) => change("major", event.target.value)}><option value="">All topics</option>{majors.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.name)}</option>)}</select></label><label>Subtopic<select value={filters.subtopic} disabled={!filters.major} onChange={(event) => change("subtopic", event.target.value)}><option value="">All subtopics</option>{subtopics.map((topic) => <option key={String(topic.id)} value={String(topic.id)}>{String(topic.name)}</option>)}</select></label><label>Status<select value={filters.status} onChange={(event) => change("status", event.target.value)}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label><label>Access<select value={filters.access} onChange={(event) => change("access", event.target.value)}><option value="">All access</option><option value="public">Public</option><option value="members_only">Members only</option></select></label><label>From<input type="date" value={filters.from} onChange={(event) => change("from", event.target.value)}/></label><label>To<input type="date" value={filters.to} onChange={(event) => change("to", event.target.value)}/></label><label>Order<select value={filters.sort} onChange={(event) => change("sort", event.target.value)}><option value="published_desc">Newest published</option><option value="published_asc">Oldest published</option><option value="updated_desc">Recently updated</option></select></label><button type="button" onClick={() => setFilters(EMPTY_CONTENT_FILTERS)}>Clear filters</button></div> : null}{section === "research" ? <div className="admin-content-filters"><label>Year<select value={researchFilters.year} onChange={(event) => setResearchFilters({ ...researchFilters, year: event.target.value })}><option value="">All years</option>{researchYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label>Type<select value={researchFilters.category} onChange={(event) => setResearchFilters({ ...researchFilters, category: event.target.value })}><option value="">All types</option>{researchCategories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Status<select value={researchFilters.status} onChange={(event) => setResearchFilters({ ...researchFilters, status: event.target.value })}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label><button type="button" onClick={() => setResearchFilters(EMPTY_RESEARCH_FILTERS)}>Clear filters</button></div> : null}<div className="admin-table">{items.map((item) => <article key={String(item.id)}><div className="admin-item-main"><span className={`admin-status is-${String(item.status ?? "default")}`}>{String(item.status ?? "active")}</span><h2>{String(item.title ?? item.name ?? item.display_name ?? item.email ?? "Untitled")}</h2><p>{plainText(item.summary ?? item.authors ?? item.abstract ?? item.description) || "No additional detail."}</p></div><div className="admin-item-meta">{section === "content" && <span>{item.published_at ? new Date(String(item.published_at)).toLocaleDateString() : "Not published"}</span>}{section === "research" && <span>{item.published_date ? new Date(`${String(item.published_date)}T00:00:00`).toLocaleDateString() : "No date"}</span>}<div><button type="button" onClick={() => onEdit(item)}>Edit</button>{section !== "people" && <button className={`admin-delete${confirmingDelete === String(item.id) ? " is-confirming" : ""}`} type="button" title={confirmingDelete === String(item.id) ? "Click again to delete permanently" : "Delete"} onClick={() => { if (confirmingDelete === String(item.id)) { setConfirmingDelete(null); onDelete(item); } else setConfirmingDelete(String(item.id)); }} onBlur={() => setConfirmingDelete((current) => current === String(item.id) ? null : current)}>{confirmingDelete === String(item.id) ? "Delete permanently?" : "Delete"}</button>}</div></div></article>)}</div></div>;
}
function Editor({ section, value, topics, contributors, caseSectionsStorable = true, onCancel, onSave }: { section: Section; value: RecordItem; topics: RecordItem[]; contributors: RecordItem[]; caseSectionsStorable?: boolean; onCancel: () => void; onSave: (value: RecordItem) => boolean | void | Promise<boolean | void> }) {
  const [form, setForm] = useState<RecordItem>(() => ({ ...value, topic_ids: Array.isArray(value.content_topics) ? value.content_topics.flatMap((row) => typeof row === "object" && row ? [String((row as RecordItem).topic_id)] : []) : value.topic_ids ?? [], contributor_ids: Array.isArray(value.content_contributors) ? value.content_contributors.flatMap((row) => typeof row === "object" && row ? [String((row as RecordItem).contributor_id)] : []) : value.contributor_ids ?? (value.contributor_id ? [String(value.contributor_id)] : []), chapters: Array.isArray(value.content_chapters) ? value.content_chapters : value.chapters ?? [], content_media: Array.isArray(value.content_media) ? value.content_media : [], research_media: Array.isArray(value.research_media) ? value.research_media : [], case_sections: initialCaseSections(value) }));
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
  function pickMedia(files: File | File[], key: "content_media" | "research_media") {
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
  function removeMedia(key: "content_media" | "research_media", target: string) {
    setForm((current) => {
      const list = Array.isArray(current[key]) ? current[key] as Media[] : [];
      const next: Record<string, unknown> = { ...current, [key]: list.filter((item) => (item.storage_path || item.local_id || "") !== target) };
      for (const field of ["thumbnail_media_path", "thumbnail_before_path", "thumbnail_after_path"] as const) {
        if (current[field] === target) next[field] = "";
      }
      return next;
    });
  }
  // The cover fills its URL field with the local preview so the admin sees the
  // image immediately; `cover_file` marks it as not-yet-uploaded until Save.
  function pickCover(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) { setUploadError("Choose a file no larger than 10 MB."); return; }
    setUploadError("");
    const preview = URL.createObjectURL(file);
    previewUrls.current.push(preview);
    setForm((current) => ({ ...current, cover_image_url: preview, cover_file: file }));
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
  // Typing a URL by hand (or clearing the cover) discards any pending file so
  // the typed value wins.
  const setCoverUrl = (url: string) => setForm((current) => ({ ...current, cover_image_url: url, cover_file: undefined }));

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
    if (section === "research" || section === "posters") { body.append("topicSlug", section); } else { const topicId = (form.topic_ids as string[] | undefined)?.[0]; const topicSlug = topics.find((topic) => String(topic.id) === topicId)?.slug; if (typeof topicSlug === "string") body.append("topicSlug", topicSlug); }
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setUploading(true); setUploadError("");
    // One step per file still to upload, plus the record write itself.
    const pending = [...((form.content_media as Media[]) ?? []), ...((form.research_media as Media[]) ?? [])].filter((item) => item.file && !item.storage_path).length
      + (form.cover_file instanceof File ? 1 : 0) + (form.poster_file instanceof File ? 1 : 0);
    const total = pending + 1;
    let done = 0;
    const step = (label: string) => { done += 1; setProgress({ done, total, label }); };
    setProgress({ done: 0, total, label: pending ? `Uploading ${pending} file${pending === 1 ? "" : "s"}...` : "Saving changes..." });
    try {
      const contentMedia = await commitList((form.content_media as Media[]) ?? [], (name) => step(`Uploaded ${name}`));
      const researchMedia = await commitList((form.research_media as Media[]) ?? [], (name) => step(`Uploaded ${name}`));
      let coverImageUrl = String(form.cover_image_url ?? "");
      if (form.cover_file instanceof File) { coverImageUrl = (await sendToStorage(form.cover_file)).publicUrl; step("Uploaded the cover image"); }
      let posterUrl = String(form.poster_url ?? "");
      if (form.poster_file instanceof File) { posterUrl = (await sendToStorage(form.poster_file)).publicUrl; step("Uploaded the poster image"); }
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
      const saved = await onSave({ ...form, ...legacyCaseColumns(section, form), cover_image_url: coverImageUrl, cover_file: undefined, poster_url: posterUrl, poster_file: undefined, content_media: contentMedia, research_media: researchMedia, thumbnail_media_path: thumbnailPath, thumbnail_before_path: beforePath, thumbnail_after_path: afterPath, media: section === "research" ? researchMedia : contentMedia });
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
    <CaseFields title="Written poster details" intro="Write the supporting text readers should see on the poster detail page. Rename, reorder or add sections as needed." sections={(form.case_sections as CaseSection[]) ?? []} setSections={(sections) => set("case_sections", sections)} storable={caseSectionsStorable}/>
  </section><aside><PosterImagePicker value={String(form.poster_url ?? "")} removed={Boolean(form.poster_image_removed)} onRemove={removePosterImage} onPick={pickPoster} uploading={uploading} error={uploadError}/></aside></div></form>;
  if (section === "content") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit content" : "New content"} onCancel={onCancel} busy={uploading} progress={progress}/><div className="admin-editor-grid"><section>{importWarning && <p className="admin-blocked" role="alert">{importWarning}</p>}<CaseJsonImport topics={topics} onApply={applyImport}/><Field label="Title" value={form.title} onChange={(value) => set("title", value)} required/><Field label="Card summary" type="textarea" value={form.summary} onChange={(value) => set("summary", value)} required/><div className="admin-field-grid"><Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive'],['scheduled','Schedule']]}/><Select label="Visibility" value={form.access_level} onChange={(value) => set("access_level", value)} options={[['public','Public'],['members_only','Site users only']]}/></div>{form.status === "scheduled" && <Field label="Publish on" type="datetime-local" value={form.scheduled_for} onChange={(value) => set("scheduled_for", value)}/>}<TopicPicker topics={topics} value={(form.topic_ids as string[]) ?? []} onChange={(ids) => set("topic_ids", ids)}/><ContributorPicker contributors={contributors} value={(form.contributor_ids as string[]) ?? []} onChange={(ids) => set("contributor_ids", ids)}/><div className="admin-field-grid"><Field label="Video URL (optional)" hint="Paste a YouTube watch or share link, or a direct .mp4/.webm file URL." type="url" value={form.video_url} onChange={(value) => set("video_url", value)}/><Select label="Clinical level" value={form.level ?? "Clinical education"} onChange={(value) => set("level", value)} options={clinicalLevelOptions(form.level)}/></div><CaseFields sections={(form.case_sections as CaseSection[]) ?? []} setSections={(sections) => set("case_sections", sections)} storable={caseSectionsStorable}/></section><aside><MediaManager media={(form.content_media as Media[]) ?? []} setMedia={(media) => set("content_media", media)} upload={(file) => pickMedia(file, "content_media")} onDelete={(target) => removeMedia("content_media", target)} uploading={uploading} error={uploadError}/><ThumbnailPicker media={(form.content_media as Media[]) ?? []} source={form.thumbnail_source === "image" || form.thumbnail_source === "before_after" ? form.thumbnail_source : "youtube"} selectedPath={String(form.thumbnail_media_path ?? "")} beforePath={String(form.thumbnail_before_path ?? "")} afterPath={String(form.thumbnail_after_path ?? "")} onSource={(source) => set("thumbnail_source", source)} onSelect={(path) => set("thumbnail_media_path", path)} onSelectBefore={(path) => set("thumbnail_before_path", path)} onSelectAfter={(path) => set("thumbnail_after_path", path)} onDropBefore={(file) => pickPairImage(file, "thumbnail_before_path")} onDropAfter={(file) => pickPairImage(file, "thumbnail_after_path")} onDelete={(target) => removeMedia("content_media", target)}/><Chapters chapters={(form.chapters as { title: string; starts_at_seconds: number }[]) ?? []} setChapters={(chapters) => set("chapters", chapters)}/></aside></div></form>;
  if (section === "research") return <form className="admin-editor" onSubmit={submit}><EditorHead title={form.id ? "Edit research" : "New research"} onCancel={onCancel} busy={uploading} progress={progress}/><div className="admin-editor-grid"><section>
    <Field label="Title" value={form.title} onChange={(value) => set("title", value)} required/>
    <Field label="Authors" hint="Free-text byline, e.g. Dr. A, Dr. B, and colleagues." value={form.authors} onChange={(value) => set("authors", value)}/>
    <div className="admin-label"><span className="admin-label-text">Abstract</span><RichEditor value={String(form.abstract ?? "")} onChange={(value) => set("abstract", value)} placeholder="Write the abstract..."/></div>
    <div className="admin-field-grid"><Field label="Journal" value={form.journal} onChange={(value) => set("journal", value)}/><Field label="Type" hint="e.g. Paper, Case Report, Review." value={form.category} onChange={(value) => set("category", value)}/></div>
    <div className="admin-field-grid"><Field label="Publication date" type="date" value={form.published_date} onChange={(value) => set("published_date", value)}/><Select label="Publishing" value={form.status} onChange={(value) => set("status", value)} options={[['published','Published now'],['draft','Save as draft'],['archived','Unpublish / archive']]}/></div>
    <Field label="External paper link" hint="Full https:// link to the published paper." type="url" value={form.link} onChange={(value) => set("link", value)}/>
  </section><aside>
    <CoverImagePicker value={String(form.cover_image_url ?? "")} onChange={setCoverUrl} onPick={pickCover} uploading={uploading} error={uploadError}/>
    <MediaManager media={(form.research_media as Media[]) ?? []} setMedia={(media) => set("research_media", media)} upload={(file) => pickMedia(file, "research_media")} onDelete={(target) => removeMedia("research_media", target)} uploading={uploading} error={uploadError}/>
  </aside></div></form>;
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
function CaseFields({ sections, setSections, storable = true, title = "Structured case record", intro = "Every section is optional. Rename any heading to suit the case, reorder them, or add your own. Add only reviewed, de-identified material." }: { sections: CaseSection[]; setSections: (sections: CaseSection[]) => void; storable?: boolean; title?: string; intro?: string }) {
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
      <RichEditor value={section.body} onChange={(value) => update(index, { body: value })} placeholder={`Write the ${(section.label || "section").toLowerCase()}...`}/>
      {!section.label.trim() && section.body.trim() ? <small className="admin-upload-error">Give this section a heading, or it will not be published.</small> : null}
    </div>)}
    <button type="button" className="admin-add-section" onClick={add}><IconPlus size={16}/> Add a section</button>
  </section>;
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
        <input value={item.alt_text ?? ""} onChange={(event) => setMedia(media.map((entry, position) => position === index ? { ...entry, alt_text: event.target.value } : entry))} placeholder="Alt text / file description"/>
        {item.kind === "image" && <a href={item.public_url} target="_blank" rel="noreferrer">Open preview</a>}
      </div>
      <div className="admin-media-tools">
        <button type="button" title="Move up" aria-label={`Move ${item.alt_text || `file ${index + 1}`} earlier`} disabled={index === 0} onClick={() => setMedia(moveItem(media, index, index - 1))}>↑</button>
        <button type="button" title="Move down" aria-label={`Move ${item.alt_text || `file ${index + 1}`} later`} disabled={index === media.length - 1} onClick={() => setMedia(moveItem(media, index, index + 1))}>↓</button>
        <DeleteMediaButton stored={Boolean(item.storage_path)} label={item.alt_text || `file ${index + 1}`} onDelete={() => onDelete(item.storage_path || item.local_id || "")}/>
      </div>
    </div>)}
  </section>;
}
function CoverImagePicker({ value, onChange, onPick, uploading, error }: { value: string; onChange: (url: string) => void; onPick: (file: File) => void; uploading: boolean; error?: string }) {
  return <section className="admin-media admin-cover-picker"><h2>Cover image</h2><p>Shown on the research card and at the top of its page. Choose one, or paste an image URL. It uploads when you save.</p>
    {value && <div className="admin-cover-preview"><img src={value} alt="Cover preview"/></div>}
    <label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPick(file); event.target.value = ""; }}/><IconPlus size={18}/>{uploading ? "Saving..." : "Choose cover"}</label>
    {error && <p className="admin-upload-error" role="alert">{error}</p>}
    <Field label="Or image URL" type="url" value={value} onChange={onChange}/>
    {value && <button type="button" className="admin-delete" onClick={() => onChange("")}>Remove cover</button>}
  </section>;
}
function PosterImagePicker({ value, removed, onRemove, onPick, uploading, error }: { value: string; removed: boolean; onRemove: () => void; onPick: (file: File) => void; uploading: boolean; error?: string }) {
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const storedInR2 = value.startsWith("/api/media/");
  return <section className="admin-media admin-cover-picker"><h2>Poster image</h2><p>This is the poster itself. It uploads to the site&apos;s R2 media bucket when you save, then appears in the featured layout, archive card and detail page. Maximum 10 MB.</p>
    {value && <div className="admin-cover-preview"><img src={value} alt="Poster preview"/></div>}
    <label className="admin-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPick(file); event.target.value = ""; }}/><IconPlus size={18}/>{uploading ? "Saving..." : "Choose poster image"}</label>
    {error && <p className="admin-upload-error" role="alert">{error}</p>}
    {value && !confirmingRemoval && <button type="button" className="admin-delete" onClick={() => setConfirmingRemoval(true)}>Delete image from poster and R2</button>}
    {value && confirmingRemoval && <div className="admin-removal-confirm" role="alert"><p>{storedInR2 ? "Saving this change will unpublish the poster and permanently delete its image from R2." : "Saving this change will unpublish the poster and remove its image reference."}</p><div><button type="button" onClick={() => setConfirmingRemoval(false)}>Cancel</button><button type="button" className="admin-delete" onClick={() => { onRemove(); setConfirmingRemoval(false); }}>Mark image for deletion</button></div></div>}
    {removed && <p className="admin-removal-notice" role="status">Image marked for removal. Save to unpublish the poster and delete its stored R2 file. Cancel to keep it.</p>}
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
      {chosen ? <img src={chosen.public_url} alt={`${label} image preview`}/> : <span className="admin-pair-hint">Drag an image here, or click to choose</span>}
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onDropFile(file); event.target.value = ""; }}/>
    </label>
    {images.length > 0 && <select aria-label={`${label} image`} value={selectedPath} onChange={(event) => onSelect(event.target.value)}>
      <option value="">Or reuse a case image…</option>
      {images.map((item, index) => { const key = item.storage_path || item.local_id || ""; return <option key={key} value={key}>{item.alt_text || `Image ${index + 1}`}</option>; })}
    </select>}
    {chosen && <div className="admin-pair-actions">
      {/* Two different intents: keep the image but stop using it here, or get
          rid of the image altogether. */}
      <button type="button" onClick={() => onSelect("")}>Clear slot</button>
      <DeleteMediaButton stored={Boolean(chosen.storage_path)} label={`the ${label.toLowerCase()} image`} onDelete={() => onDelete(chosen.storage_path || chosen.local_id || "")}/>
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
      <label><input type="radio" name="thumbnail-image" checked={selectedPath === key} onChange={() => onSelect(key)}/><img src={item.public_url} alt={item.alt_text || "Uploaded image"}/></label>
      <DeleteMediaButton stored={Boolean(item.storage_path)} label={item.alt_text || "this image"} compact onDelete={() => onDelete(key)}/>
    </div>; })}</div> : <p className="admin-upload-error">Add an image first, then select it here.</p>)}
    {source === "image" && images.length > 0 && !images.some((item) => (item.storage_path || item.local_id || "") === selectedPath) && <p className="admin-upload-error">Choose which image to use, or the card falls back to the YouTube thumbnail.</p>}
    {source === "before_after" && <>
      <div className="admin-pair-grid">
        <PairSlot label="Before" images={images} selectedPath={beforePath} onSelect={onSelectBefore} onDropFile={onDropBefore} onDelete={onDelete}/>
        <PairSlot label="After" images={images} selectedPath={afterPath} onSelect={onSelectAfter} onDropFile={onDropAfter} onDelete={onDelete}/>
      </div>
      <p className="admin-media-hint">Dropped images join this case&apos;s images. Readers see the two halves as one picture; the Before and After captions appear on hover. Both halves are needed — otherwise the card falls back to the YouTube thumbnail.</p>
      {source === "before_after" && (!beforePath || !afterPath) && <p className="admin-upload-error">Choose both a before and an after image.</p>}
    </>}
  </section>;
}
function Chapters({ chapters, setChapters }: { chapters: { title: string; starts_at_seconds: number }[]; setChapters: (chapters: { title: string; starts_at_seconds: number }[]) => void }) { return <section className="admin-chapters"><div><h2>Video chapters</h2><button type="button" onClick={() => setChapters([...chapters, { title: "", starts_at_seconds: 0 }])}>Add chapter</button></div>{chapters.length ? chapters.map((chapter, index) => <div className="admin-chapter" key={index}><input value={chapter.title} onChange={(event) => setChapters(chapters.map((entry, position) => position === index ? { ...entry, title: event.target.value } : entry))} placeholder="Chapter title"/><input type="number" value={chapter.starts_at_seconds} onChange={(event) => setChapters(chapters.map((entry, position) => position === index ? { ...entry, starts_at_seconds: Number(event.target.value) } : entry))} aria-label="Start time in seconds"/><button type="button" onClick={() => setChapters(chapters.filter((_, position) => position !== index))}></button></div>) : <p>No chapters added.</p>}</section>; }
// Saving lives in the header, and the header sticks: long case records used to
// hide the only save button several screens below the fold.
function EditorHead({ title, onCancel, busy = false, progress = null }: { title: string; onCancel: () => void; busy?: boolean; progress?: { done: number; total: number; label: string } | null }) {
  const percent = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;
  return <div className="admin-editor-head"><div><span className="admin-kicker">Content editor</span><h2>{title}</h2></div><div className="admin-editor-actions">
    <div className="admin-save-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving..." : <>Save changes <IconArrowRight size={17}/></>}</button><button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button></div>
    {progress && <div className="admin-save-progress" role="status" aria-live="polite">
      <div className="admin-save-bar"><span style={{ width: `${percent}%` }}/></div>
      <small>{progress.label} · {percent}%</small>
    </div>}
  </div></div>;
}
function Field({ label, value, onChange, type = "text", hint, required = false }: { label: string; value: unknown; onChange: (value: string) => void; type?: string; hint?: string; required?: boolean }) { return <label className="admin-label">{label}{type === "textarea" ? <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required}/> : <input type={type} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required}/>} {hint && <small>{hint}</small>}</label>; }
function Select({ label, value, onChange, options }: { label: string; value: unknown; onChange: (value: string) => void; options: string[][] }) { return <label className="admin-label">{label}<select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function SimpleEditor({ title, fields, form, set, onCancel, onSave, topics }: { title: string; fields: string[][]; form: RecordItem; set: (key: string, value: unknown) => void; onCancel: () => void; onSave: (event: FormEvent) => void; topics?: RecordItem[] }) { return <form className="admin-editor admin-simple-editor" onSubmit={onSave}><EditorHead title={title} onCancel={onCancel}/><div className="admin-simple-fields">{fields.map(([key, label]) => <Field key={key} label={label} hint={key === "highlights" ? "One highlight per line." : undefined} type={key === "summary" || key === "description" || key === "biography" || key === "highlights" ? "textarea" : key.includes("_at") ? "datetime-local" : key.includes("url") ? "url" : key === "sort_order" ? "number" : "text"} value={form[key]} onChange={(value) => set(key, value)}/>) }{topics && <label className="admin-label">Parent topic<select value={String(form.parent_id ?? "")} onChange={(event) => set("parent_id", event.target.value)}><option value="">No parent (top-level topic)</option>{topics.filter((topic) => topic.id !== form.id).map((topic) => <option value={String(topic.id)} key={String(topic.id)}>{String(topic.name)}</option>)}</select></label>}</div></form>; }
