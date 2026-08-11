import { env } from "cloudflare:workers";
import { revalidateTag } from "next/cache";
import { apiError, canDelete, canWrite, jsonObject, resolveAdminIdentity, roleLabel, safeRichText, slugify } from "../../../lib/admin-server";
import { CACHE_TAGS, type PublicCacheTag } from "../../../lib/cache-tags";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

type RouteContext = { params: Promise<{ resource: string }> };
const allowedResources = ["overview", "content", "topics", "events", "contributors", "people", "research"] as const;
type Resource = (typeof allowedResources)[number];

function asResource(value: string): Resource | null {
  return (allowedResources as readonly string[]).includes(value) ? value as Resource : null;
}

const PROTECTED_OWNER_EMAIL = "sarkrda.mohammed04@gmail.com";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
// Research rows key on a numeric id, so `text()` would drop it and every save
// would insert a new row instead of updating the edited one. Coerce numbers.
function idValue(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? String(value) : text(value); }
function optionalText(value: unknown) { const result = text(value); return result || null; }
function date(value: unknown) { const result = text(value); return result || null; }
function externalUrl(value: unknown) {
  const url = text(value);
  if (!url) return null;
  try { return ["http:", "https:"].includes(new URL(url).protocol) ? url : null; } catch { return null; }
}

// Uploaded media lives in R2 under the same key we store as `storage_path`; a
// cover is kept as its `/api/media/<key>` URL. Map a URL back to its key so a
// pasted external link (http...) is never treated as a bucket object.
const MEDIA_URL_PREFIX = "/api/media/";
function storageKeyFromUrl(value: unknown) {
  const url = text(value);
  return url.startsWith(MEDIA_URL_PREFIX) ? url.slice(MEDIA_URL_PREFIX.length) : "";
}
// Best-effort R2 cleanup. It runs after the database is already the source of
// truth, so a storage hiccup must not fail an otherwise-successful save; the
// orphaned object is logged rather than surfaced as a broken operation.
// Migration 0010 adds `content_items.case_sections`. Until it is applied, both
// reading and writing that column fails the whole statement — which would take
// the content section of the workspace down rather than just the new feature.
// The first such failure is remembered and the operation is retried without it,
// so editors keep working against the five legacy columns in the meantime.
let caseSectionsColumn = true;
function missingCaseSections(message: string | undefined) { return Boolean(message) && /case_sections/.test(message!) && /does not exist|find the .* column|schema cache/i.test(message!); }
let posterCtaColumns = true;
function missingPosterCtaColumns(message: string | undefined) { return Boolean(message) && /poster_cta_(text|url)/.test(message!) && /does not exist|find the .* column|schema cache/i.test(message!); }

async function deleteFromStorage(keys: unknown[]) {
  const unique = [...new Set(keys.map((key) => text(key)).filter(Boolean))];
  if (!unique.length) return;
  try { await env.MEDIA_BUCKET.delete(unique); } catch (error) { console.error("R2 cleanup failed:", error); }
}

function cacheTagsFor(resource: Resource): PublicCacheTag[] {
  if (resource === "content" || resource === "topics" || resource === "contributors") return [CACHE_TAGS.content];
  if (resource === "events") return [CACHE_TAGS.events];
  if (resource === "research") return [CACHE_TAGS.research];
  return [];
}

/** Public reads are stored by vinext in VINEXT_CACHE (Cloudflare KV). Expire
    the affected tag after a successful Supabase write so a newly published or
    edited poster is visible immediately instead of waiting for the 60s TTL. */
async function invalidatePublicCache(resource: Resource) {
  try {
    await Promise.all(cacheTagsFor(resource).map((tag) => revalidateTag(tag, { expire: 0 })));
  } catch (error) {
    // The database remains the source of truth. If KV is temporarily
    // unavailable, the normal short TTL still heals the public read.
    console.error("Public cache invalidation failed:", error);
  }
}

export async function GET(request: Request, context: RouteContext) {
  const resource = asResource((await context.params).resource);
  if (!resource) return apiError("Unknown admin resource.", 404);
  const access = await resolveAdminIdentity(request, resource === "people");
  if (!access.identity) return apiError(access.message, access.status);
  const identity = access.identity;
  const client = getSupabaseServerClient();

  if (resource === "overview") {
    const [content, drafts, events, contributors, members, research] = await Promise.all([
      client.from("content_items").select("id", { count: "exact", head: true }).eq("status", "published"),
      client.from("content_items").select("id", { count: "exact", head: true }).neq("status", "published"),
      client.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
      client.from("contributors").select("id", { count: "exact", head: true }),
      client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
      client.from("researches").select("id", { count: "exact", head: true }).eq("status", "published"),
    ]);
    return Response.json({ identity, metrics: { published: content.count ?? 0, drafts: drafts.count ?? 0, events: events.count ?? 0, contributors: contributors.count ?? 0, members: members.count ?? 0, research: research.count ?? 0 } });
  }

  if (resource === "content") {
    const contentSelect = () => "id,title,slug,summary,kind,status,access_level,video_url,poster_url,"
      + (posterCtaColumns ? "poster_cta_text,poster_cta_url," : "")
      + "thumbnail_source,thumbnail_media_path,duration_seconds,reading_minutes,level,published_at,scheduled_for,created_at,updated_at,contributor_id,case_presentation,case_imaging,case_procedure,case_histopathology,case_outcome,"
      + (caseSectionsColumn ? "case_sections," : "")
      + "content_topics(topic_id),content_contributors(contributor_id),content_chapters(id,title,position,starts_at_seconds),content_media(id,storage_path,kind,public_url,alt_text,caption,sort_order)";
    const read = () => client.from("content_items").select(contentSelect()).order("updated_at", { ascending: false });
    let { data, error } = await read();
    if (error && caseSectionsColumn && missingCaseSections(error.message)) { caseSectionsColumn = false; ({ data, error } = await read()); }
    if (error && posterCtaColumns && missingPosterCtaColumns(error.message)) { posterCtaColumns = false; ({ data, error } = await read()); }
    if (error && caseSectionsColumn && missingCaseSections(error.message)) { caseSectionsColumn = false; ({ data, error } = await read()); }
    if (error) return apiError(error.message, 500);
    // The workspace needs to know whether custom case sections can be stored at
    // all, so it can say so up front rather than after a save silently drops
    // them. See migration 0010.
    return Response.json({ data, capabilities: { caseSections: caseSectionsColumn } });
  }
  if (resource === "topics") {
    const { data, error } = await client.from("topics").select("id,name,slug,parent_id,description,sort_order,created_at").order("sort_order");
    if (error) return apiError(error.message, 500);
    return Response.json({ data });
  }
  if (resource === "events") {
    const { data, error } = await client.from("events").select("*").order("starts_at", { ascending: false });
    if (error) return apiError(error.message, 500);
    return Response.json({ data });
  }
  if (resource === "contributors") {
    const { data, error } = await client.from("contributors").select("*").order("sort_order");
    if (error) return apiError(error.message, 500);
    return Response.json({ data });
  }
  if (resource === "research") {
    const { data, error } = await client.from("researches")
      .select("id,title,authors,abstract,journal,category,link,published_date,status,cover_image_url,created_at,updated_at,research_media(id,storage_path,public_url,kind,alt_text,caption,sort_order)")
      .order("updated_at", { ascending: false });
    if (error) return apiError(error.message, 500);
    return Response.json({ data });
  }

  const { data: profiles, error } = await client.from("profiles").select("id,full_name,phone,city,profession,role,created_at").order("created_at", { ascending: false });
  if (error) return apiError(error.message, 500);
  // Page through the auth directory: a single 1000-row request silently
  // truncated, leaving later accounts with blank emails and no indication why.
  const emails = new Map<string, string>();
  for (let page = 1; page <= 20; page += 1) {
    const { data: users, error: usersError } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (usersError) return apiError(`Could not read the account directory: ${usersError.message}`, 500);
    const batch = users?.users ?? [];
    for (const user of batch) emails.set(user.id, user.email ?? "");
    if (batch.length < 200) break;
  }
  return Response.json({ data: (profiles ?? []).map((profile) => ({ ...profile, email: emails.get(profile.id) ?? "" })) });
}

export async function POST(request: Request, context: RouteContext) {
  const resource = asResource((await context.params).resource);
  if (!resource || resource === "overview") return apiError("This resource cannot be created here.", 404);
  const access = await resolveAdminIdentity(request, resource === "people");
  if (!access.identity) return apiError(access.message, access.status);
  const identity = access.identity;
  if (!canWrite(identity.role, resource)) return apiError(`${roleLabel(identity.role)} accounts cannot change ${resource}. Ask the Owner or a Content manager.`, 403);
  const body = jsonObject(await request.json().catch(() => null));
  if (!body) return apiError("The submitted data was invalid.");
  const client = getSupabaseServerClient();

  if (resource === "content") {
    const title = text(body.title);
    if (!title) return apiError("A title is required.");
    // An unrecognised status must not publish clinical material by accident; a
    // malformed save parks the item as a draft instead.
    const status = ["draft", "scheduled", "published", "archived"].includes(text(body.status)) ? text(body.status) : "draft";
    const existingId = idValue(body.id);
    const posterUrl = text(body.poster_url);
    const posterCtaText = optionalText(body.poster_cta_text);
    const posterCtaUrl = externalUrl(body.poster_cta_url);
    const priorPoster = existingId
      ? await client.from("content_items").select("poster_url").eq("id", existingId).maybeSingle()
      : null;
    const priorPosterUrl = text(priorPoster?.data?.poster_url);
    if (text(body.kind) === "poster" && status === "published" && !posterUrl) return apiError("A published poster requires an image. Add one or save it as a draft.");
    if (text(body.kind) === "poster" && Boolean(posterCtaText) !== Boolean(posterCtaUrl)) return apiError("Add both the optional link text and a valid http(s) URL, or leave both blank.");
    if (text(body.kind) === "poster" && text(body.poster_cta_url) && !posterCtaUrl) return apiError("The optional reader link must use a valid http:// or https:// URL.");
    // New and replacement poster images must be uploaded through the R2 route.
    // Existing legacy static images may remain unchanged until an editor
    // replaces them, preventing an old record from becoming uneditable.
    if (text(body.kind) === "poster" && !storageKeyFromUrl(posterUrl) && posterUrl !== priorPosterUrl) {
      return apiError("Choose a poster image file so it can be stored in the R2 media bucket.");
    }
    const posterStorageKey = storageKeyFromUrl(posterUrl);
    if (text(body.kind) === "poster" && posterStorageKey && !await env.MEDIA_BUCKET.head(posterStorageKey)) {
      return apiError("The poster image was not found in the R2 media bucket. Choose the file again and save.");
    }
    const slug = slugify(text(body.slug) || title);
    if (!slug) return apiError("Add a usable title or URL slug.");
    // Re-editing a published item must not reshuffle it to the top of the
    // public library, so an existing publication date is preserved.
    const priorPosterKey = storageKeyFromUrl(priorPosterUrl);
    let publishedAt: string | null = null;
    if (status === "published") {
      const previous = existingId ? await client.from("content_items").select("published_at").eq("id", existingId).maybeSingle() : null;
      publishedAt = text(previous?.data?.published_at) || new Date().toISOString();
    }
    // The case record arrives as an ordered list of named sections. Labels are
    // the editor's own words; bodies go through the same sanitiser as before.
    // The five built-in keys are mirrored into their legacy columns so readers
    // that have not been updated — and the import script — still see them.
    const caseSections = (Array.isArray(body.case_sections) ? body.case_sections : []).flatMap((entry, index) => {
      const section = jsonObject(entry);
      const label = text(section?.label);
      const sectionBody = safeRichText(section?.body);
      const key = text(section?.key) || slugify(label) || `section-${index + 1}`;
      return label && sectionBody ? [{ key, label, body: sectionBody }] : [];
    });
    const legacySection = (key: string) => caseSections.find((section) => section.key === key)?.body ?? null;
    const contributorIds = Array.isArray(body.contributor_ids) ? body.contributor_ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
    const item = {
      // The editor has no kind selector, so a case's kind follows its video: a
      // YouTube/video link makes it a "case video", its absence a "case study".
      // Webinar and poster kinds are honoured when explicitly set (e.g. editing
      // an existing record of that kind).
      title, slug, summary: optionalText(body.summary), kind: ["webinar_recording", "poster"].includes(text(body.kind)) ? text(body.kind) : optionalText(body.video_url) ? "video" : "case_article",
      status, access_level: text(body.access_level) === "members_only" ? "members_only" : "public", video_url: optionalText(body.video_url),
      poster_url: optionalText(body.poster_url), thumbnail_source: text(body.thumbnail_source) === "image" ? "image" : "youtube",
      poster_cta_text: text(body.kind) === "poster" ? posterCtaText : null, poster_cta_url: text(body.kind) === "poster" ? posterCtaUrl : null,
      thumbnail_media_path: text(body.thumbnail_source) === "image" ? optionalText(body.thumbnail_media_path) : null, duration_seconds: Number.isFinite(Number(body.duration_seconds)) && Number(body.duration_seconds) > 0 ? Number(body.duration_seconds) : null,
      reading_minutes: Number.isFinite(Number(body.reading_minutes)) && Number(body.reading_minutes) > 0 ? Number(body.reading_minutes) : null,
      level: optionalText(body.level), contributor_id: contributorIds[0] ?? optionalText(body.contributor_id),
      case_sections: caseSections.length ? caseSections : null,
      // A save that carries sections defines the legacy columns entirely: a
      // built-in section the editor removed or renamed away must clear its
      // column rather than keep a stale copy on the row.
      case_presentation: caseSections.length ? legacySection("presentation") : safeRichText(body.case_presentation) || null,
      case_imaging: caseSections.length ? legacySection("imaging") : safeRichText(body.case_imaging) || null,
      case_procedure: caseSections.length ? legacySection("procedure") : safeRichText(body.case_procedure) || null,
      case_histopathology: caseSections.length ? legacySection("histopathology") : safeRichText(body.case_histopathology) || null,
      case_outcome: caseSections.length ? legacySection("outcome") : safeRichText(body.case_outcome) || null,
      scheduled_for: status === "scheduled" ? date(body.scheduled_for) : null, published_at: publishedAt, updated_by: identity.id,
      // Without this the admin list, which orders by `updated_at desc`, never
      // reorders: there is no database trigger maintaining the column.
      updated_at: new Date().toISOString(),
    };
    const write = () => {
      // Custom headings and extra sections need the column; without it the five
      // built-ins still save to their own columns and nothing else is lost.
      const row: Record<string, unknown> = { ...item };
      if (!caseSectionsColumn) delete row.case_sections;
      if (!posterCtaColumns) { delete row.poster_cta_text; delete row.poster_cta_url; }
      return existingId
        ? client.from("content_items").update(row).eq("id", existingId).select("id").single()
        : client.from("content_items").insert(row).select("id").single();
    };
    let { data: saved, error } = await write();
    if (error && caseSectionsColumn && missingCaseSections(error.message)) { caseSectionsColumn = false; ({ data: saved, error } = await write()); }
    if (error || !saved) return apiError(error?.message ?? "Could not save this content item.", 500);
    const topicIds = Array.isArray(body.topic_ids) ? body.topic_ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
    const chapters = Array.isArray(body.chapters) ? body.chapters : [];
    const validChapters = chapters.flatMap((chapter, position) => {
      const entry = jsonObject(chapter); const chapterTitle = text(entry?.title);
      return chapterTitle ? [{ content_id: saved.id, title: chapterTitle, position, starts_at_seconds: Math.max(0, Number(entry?.starts_at_seconds) || 0) }] : [];
    });
    const media = Array.isArray(body.media) ? body.media : [];
    const validMedia = media.flatMap((entry, sort_order) => {
      const item = jsonObject(entry); const public_url = text(item?.public_url); const storage_path = text(item?.storage_path);
      return public_url && storage_path ? [{ content_id: saved.id, storage_path, public_url, kind: text(item?.kind) === "document" ? "document" : "image", alt_text: optionalText(item?.alt_text), caption: optionalText(item?.caption), sort_order }] : [];
    });

    // Images dropped from the media list must leave R2, not just the database.
    // Work out which stored keys the save no longer keeps before the rows are
    // rewritten below, then remove those objects once the write succeeds.
    const keptMediaPaths = new Set(validMedia.map((entry) => entry.storage_path));
    const { data: priorMedia } = await client.from("content_media").select("storage_path").eq("content_id", saved.id);
    const removedMediaKeys = (priorMedia ?? []).map((row) => text(row.storage_path)).filter((path) => path && !keptMediaPaths.has(path));

    // These relations are rewritten as delete-then-insert. Their errors used to
    // be discarded, so a failed insert after a successful delete reported
    // "Saved." while the item silently lost every topic, credit or chapter.
    const relations: [string, Record<string, unknown>[]][] = [
      ["content_topics", topicIds.map((topic_id) => ({ content_id: saved.id, topic_id }))],
      ["content_contributors", contributorIds.map((contributor_id) => ({ content_id: saved.id, contributor_id }))],
      ["content_chapters", validChapters],
      ["content_media", validMedia],
    ];
    for (const [table, rows] of relations) {
      const removed = await client.from(table).delete().eq("content_id", saved.id);
      if (removed.error) return apiError(`Saved the item, but could not update ${table.replace("content_", "")}: ${removed.error.message}`, 500);
      if (!rows.length) continue;
      const inserted = await client.from(table).insert(rows);
      if (inserted.error) return apiError(`Saved the item, but could not update ${table.replace("content_", "")}: ${inserted.error.message}`, 500);
    }
    await deleteFromStorage(removedMediaKeys);
    const nextPosterKey = storageKeyFromUrl(body.poster_url);
    if (priorPosterKey && priorPosterKey !== nextPosterKey) await deleteFromStorage([priorPosterKey]);
    // Saving against a database without migration 0010 keeps the five built-in
    // sections (they have their own columns) but silently drops renamed
    // headings and added sections. Say so rather than report a clean save.
    const sectionsLost = !caseSectionsColumn && caseSections.length > 0;
    const ctaLost = !posterCtaColumns && Boolean(posterCtaText || posterCtaUrl);
    await invalidatePublicCache(resource);
    return Response.json({ data: saved, warning: ctaLost ? "Saved, but the optional reader link was not stored because the database is missing the poster CTA columns. Apply migration 0015_poster_cta.sql, then save again." : sectionsLost ? "Saved, but custom section headings and added sections were not stored: the database is missing the case_sections column. Apply migration 0010_case_sections.sql, then save again." : undefined });
  }

  if (resource === "research") {
    const title = text(body.title);
    if (!title) return apiError("A research title is required.");
    const status = ["draft", "scheduled", "published", "archived"].includes(text(body.status)) ? text(body.status) : "draft";
    const payload = {
      title,
      authors: optionalText(body.authors),
      abstract: safeRichText(body.abstract) || null,
      journal: optionalText(body.journal),
      category: optionalText(body.category) ?? "Publication",
      link: optionalText(body.link),
      published_date: date(body.published_date),
      status,
      cover_image_url: optionalText(body.cover_image_url),
      updated_by: identity.id,
      updated_at: new Date().toISOString(),
    };
    const existingId = idValue(body.id);
    // Snapshot the cover before the update overwrites it, so a replaced or
    // removed cover can be cleaned out of R2 further down.
    const priorCoverKey = existingId
      ? storageKeyFromUrl((await client.from("researches").select("cover_image_url").eq("id", existingId).maybeSingle()).data?.cover_image_url)
      : "";
    const { data: saved, error } = existingId
      ? await client.from("researches").update(payload).eq("id", existingId).select("id").single()
      : await client.from("researches").insert(payload).select("id").single();
    if (error || !saved) return apiError(error?.message ?? "Could not save this research.", 500);

    const media = Array.isArray(body.media) ? body.media : [];
    const validMedia = media.flatMap((entry, sort_order) => {
      const item = jsonObject(entry); const public_url = text(item?.public_url); const storage_path = text(item?.storage_path);
      return public_url && storage_path ? [{ research_id: saved.id, storage_path, public_url, kind: text(item?.kind) === "document" ? "document" : "image", alt_text: optionalText(item?.alt_text), caption: optionalText(item?.caption), sort_order }] : [];
    });
    // Gallery images dropped from the save are removed from R2 too, worked out
    // before the rows are rewritten.
    const keptMediaPaths = new Set(validMedia.map((entry) => entry.storage_path));
    const { data: priorMedia } = await client.from("research_media").select("storage_path").eq("research_id", saved.id);
    const removedMediaKeys = (priorMedia ?? []).map((row) => text(row.storage_path)).filter((path) => path && !keptMediaPaths.has(path));
    // Rewritten as delete-then-insert, surfacing insert failures so a wiped
    // gallery is never reported as a clean save.
    const removed = await client.from("research_media").delete().eq("research_id", saved.id);
    if (removed.error) return apiError(`Saved the research, but could not update its images: ${removed.error.message}`, 500);
    if (validMedia.length) {
      const inserted = await client.from("research_media").insert(validMedia);
      if (inserted.error) return apiError(`Saved the research, but could not update its images: ${inserted.error.message}`, 500);
    }
    // A cover that changed (replaced or cleared) leaves its old object behind.
    const newCoverKey = storageKeyFromUrl(payload.cover_image_url);
    const removedCoverKeys = priorCoverKey && priorCoverKey !== newCoverKey ? [priorCoverKey] : [];
    await deleteFromStorage([...removedMediaKeys, ...removedCoverKeys]);
    await invalidatePublicCache(resource);
    return Response.json({ data: saved });
  }

  if (resource === "topics") {
    const name = text(body.name);
    if (!name) return apiError("A topic name is required.");
    const payload = { name, slug: slugify(text(body.slug) || name), parent_id: optionalText(body.parent_id), description: optionalText(body.description), sort_order: Number(body.sort_order) || 0 };
    const { data, error } = idValue(body.id) ? await client.from("topics").update(payload).eq("id", idValue(body.id)).select("id").single() : await client.from("topics").insert(payload).select("id").single();
    if (error) return apiError(error.message, 500);
    await invalidatePublicCache(resource);
    return Response.json({ data });
  }

  if (resource === "events") {
    const title = text(body.title);
    if (!title) return apiError("An event title is required.");
    const highlights = typeof body.highlights === "string" ? body.highlights.split("\n").map((line) => line.trim()).filter(Boolean) : Array.isArray(body.highlights) ? body.highlights : [];
    const payload = { title, slug: slugify(text(body.slug) || title), summary: optionalText(body.summary), event_type: optionalText(body.event_type) ?? "Event", topic: optionalText(body.topic), format: optionalText(body.format) ?? "in-person", status: ["draft", "scheduled", "published", "archived"].includes(text(body.status)) ? text(body.status) : "published", starts_at: date(body.starts_at), ends_at: date(body.ends_at), location: optionalText(body.location), image_url: optionalText(body.image_url), official_url: optionalText(body.official_url), registration_url: optionalText(body.registration_url), programme_url: optionalText(body.programme_url), faculty_url: optionalText(body.faculty_url), highlights, updated_at: new Date().toISOString() };
    const { data, error } = idValue(body.id) ? await client.from("events").update(payload).eq("id", idValue(body.id)).select("id").single() : await client.from("events").insert(payload).select("id").single();
    if (error) return apiError(error.message, 500);
    await invalidatePublicCache(resource);
    return Response.json({ data });
  }

  if (resource === "contributors") {
    const display_name = text(body.display_name);
    if (!display_name) return apiError("A contributor name is required.");
    const payload = { display_name, credentials: optionalText(body.credentials), biography: safeRichText(body.biography), photo_url: optionalText(body.photo_url), role_title: optionalText(body.role_title), group_name: optionalText(body.group_name), sort_order: Number(body.sort_order) || 0, published: body.published !== false, updated_at: new Date().toISOString() };
    const { data, error } = idValue(body.id) ? await client.from("contributors").update(payload).eq("id", idValue(body.id)).select("id").single() : await client.from("contributors").insert(payload).select("id").single();
    if (error) return apiError(error.message, 500);
    await invalidatePublicCache(resource);
    return Response.json({ data });
  }

  const role = text(body.role);
  const targetId = text(body.id);
  if (!targetId || !["owner", "content_manager", "editor", "contributor", "member"].includes(role)) return apiError("Choose a valid staff role.");
  // The guard used to compare against `body.email`, which the caller supplies:
  // omitting that one field skipped the check entirely. Resolve the address
  // from the auth record instead so it cannot be spoofed.
  if (role !== "owner") {
    const { data: target } = await client.auth.admin.getUserById(targetId);
    if (target?.user?.email === PROTECTED_OWNER_EMAIL) return apiError("The designated Owner account cannot be downgraded here.");
  }
  const { data, error } = await client.from("profiles").update({ role }).eq("id", targetId).select("id").single();
  return error ? apiError(error.message, 500) : Response.json({ data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const resource = asResource((await context.params).resource);
  if (!resource || !["content", "topics", "events", "contributors", "research"].includes(resource)) return apiError("This item cannot be deleted here.", 404);
  const access = await resolveAdminIdentity(request);
  if (!access.identity) return apiError(access.message, access.status);
  if (!canDelete(access.identity.role, resource)) return apiError(`${roleLabel(access.identity.role)} accounts cannot delete ${resource}. Ask the Owner or a Content manager.`, 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return apiError("Choose an item to delete.");
  const client = getSupabaseServerClient();
  const table = resource === "content" ? "content_items" : resource === "research" ? "researches" : resource;

  // Gather every R2 object this item owns before the row (and its cascading
  // media rows) is gone, so nothing is left orphaned in the bucket. Uploaded
  // events/contributor portraits are cleaned too; pasted external URLs are not.
  let storageKeys: string[] = [];
  if (resource === "content") {
    const [media, row] = await Promise.all([
      client.from("content_media").select("storage_path").eq("content_id", id),
      client.from("content_items").select("poster_url").eq("id", id).maybeSingle(),
    ]);
    storageKeys = [...(media.data ?? []).map((entry) => text(entry.storage_path)), storageKeyFromUrl(row.data?.poster_url)];
  } else if (resource === "research") {
    const [gallery, row] = await Promise.all([
      client.from("research_media").select("storage_path").eq("research_id", id),
      client.from("researches").select("cover_image_url").eq("id", id).maybeSingle(),
    ]);
    storageKeys = [...(gallery.data ?? []).map((entry) => text(entry.storage_path)), storageKeyFromUrl(row.data?.cover_image_url)];
  } else if (resource === "events") {
    const { data } = await client.from("events").select("image_url").eq("id", id).maybeSingle();
    storageKeys = [storageKeyFromUrl(data?.image_url)];
  } else if (resource === "contributors") {
    const { data } = await client.from("contributors").select("photo_url").eq("id", id).maybeSingle();
    storageKeys = [storageKeyFromUrl(data?.photo_url)];
  }

  const { error } = await client.from(table).delete().eq("id", id);
  if (error) return apiError(error.message, 500);
  await deleteFromStorage(storageKeys);
  await invalidatePublicCache(resource);
  return Response.json({ ok: true });
}
