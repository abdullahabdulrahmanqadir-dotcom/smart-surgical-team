import { apiError, canDelete, canWrite, jsonObject, resolveAdminIdentity, roleLabel, safeRichText, slugify } from "../../../lib/admin-server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

type RouteContext = { params: Promise<{ resource: string }> };
const allowedResources = ["overview", "content", "topics", "events", "contributors", "people", "messages"] as const;
type Resource = (typeof allowedResources)[number];

function asResource(value: string): Resource | null {
  return (allowedResources as readonly string[]).includes(value) ? value as Resource : null;
}

const PROTECTED_OWNER_EMAIL = "sarkrda.mohammed04@gmail.com";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const result = text(value); return result || null; }
function date(value: unknown) { const result = text(value); return result || null; }

export async function GET(request: Request, context: RouteContext) {
  const resource = asResource((await context.params).resource);
  if (!resource) return apiError("Unknown admin resource.", 404);
  const access = await resolveAdminIdentity(request, resource === "people");
  if (!access.identity) return apiError(access.message, access.status);
  const identity = access.identity;
  const client = getSupabaseServerClient();

  if (resource === "overview") {
    const [content, drafts, events, contributors, members, messages] = await Promise.all([
      client.from("content_items").select("id", { count: "exact", head: true }).eq("status", "published"),
      client.from("content_items").select("id", { count: "exact", head: true }).neq("status", "published"),
      client.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
      client.from("contributors").select("id", { count: "exact", head: true }),
      client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
      client.from("contact_messages").select("id", { count: "exact", head: true }),
    ]);
    return Response.json({ identity, metrics: { published: content.count ?? 0, drafts: drafts.count ?? 0, events: events.count ?? 0, contributors: contributors.count ?? 0, members: members.count ?? 0, messages: messages.count ?? 0 } });
  }

  if (resource === "content") {
    const { data, error } = await client.from("content_items")
      .select("id,title,slug,summary,kind,status,access_level,video_url,poster_url,thumbnail_source,thumbnail_media_path,duration_seconds,reading_minutes,level,published_at,scheduled_for,contributor_id,case_presentation,case_imaging,case_procedure,case_histopathology,case_outcome,content_topics(topic_id),content_contributors(contributor_id),content_chapters(id,title,position,starts_at_seconds),content_media(id,storage_path,kind,public_url,alt_text,caption,sort_order)")
      .order("updated_at", { ascending: false });
    if (error) return apiError(error.message, 500);
    return Response.json({ data });
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
  if (resource === "messages") {
    const { data, error } = await client.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);
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
  if (!resource || resource === "overview" || resource === "messages") return apiError("This resource cannot be created here.", 404);
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
    const slug = slugify(text(body.slug) || title);
    if (!slug) return apiError("Add a usable title or URL slug.");
    // An unrecognised status must not publish clinical material by accident; a
    // malformed save parks the item as a draft instead.
    const status = ["draft", "scheduled", "published", "archived"].includes(text(body.status)) ? text(body.status) : "draft";
    // Re-editing a published item must not reshuffle it to the top of the
    // public library, so an existing publication date is preserved.
    const existingId = text(body.id);
    let publishedAt: string | null = null;
    if (status === "published") {
      const previous = existingId ? await client.from("content_items").select("published_at").eq("id", existingId).maybeSingle() : null;
      publishedAt = text(previous?.data?.published_at) || new Date().toISOString();
    }
    const contributorIds = Array.isArray(body.contributor_ids) ? body.contributor_ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
    const item = {
      title, slug, summary: optionalText(body.summary), kind: ["video", "webinar_recording", "poster", "case_article"].includes(text(body.kind)) ? text(body.kind) : "case_article",
      status, access_level: text(body.access_level) === "members_only" ? "members_only" : "public", video_url: optionalText(body.video_url),
      poster_url: optionalText(body.poster_url), thumbnail_source: text(body.thumbnail_source) === "image" ? "image" : "youtube",
      thumbnail_media_path: text(body.thumbnail_source) === "image" ? optionalText(body.thumbnail_media_path) : null, duration_seconds: Number.isFinite(Number(body.duration_seconds)) && Number(body.duration_seconds) > 0 ? Number(body.duration_seconds) : null,
      reading_minutes: Number.isFinite(Number(body.reading_minutes)) && Number(body.reading_minutes) > 0 ? Number(body.reading_minutes) : null,
      level: optionalText(body.level), contributor_id: contributorIds[0] ?? optionalText(body.contributor_id),
      case_presentation: safeRichText(body.case_presentation) || null, case_imaging: safeRichText(body.case_imaging) || null, case_procedure: safeRichText(body.case_procedure) || null,
      case_histopathology: safeRichText(body.case_histopathology) || null, case_outcome: safeRichText(body.case_outcome) || null,
      scheduled_for: status === "scheduled" ? date(body.scheduled_for) : null, published_at: publishedAt, updated_by: identity.id,
      // Without this the admin list, which orders by `updated_at desc`, never
      // reorders: there is no database trigger maintaining the column.
      updated_at: new Date().toISOString(),
    };
    const { data: saved, error } = existingId
      ? await client.from("content_items").update(item).eq("id", existingId).select("id").single()
      : await client.from("content_items").insert(item).select("id").single();
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
    return Response.json({ data: saved });
  }

  if (resource === "topics") {
    const name = text(body.name);
    if (!name) return apiError("A topic name is required.");
    const payload = { name, slug: slugify(text(body.slug) || name), parent_id: optionalText(body.parent_id), description: optionalText(body.description), sort_order: Number(body.sort_order) || 0 };
    const { data, error } = body.id ? await client.from("topics").update(payload).eq("id", text(body.id)).select("id").single() : await client.from("topics").insert(payload).select("id").single();
    return error ? apiError(error.message, 500) : Response.json({ data });
  }

  if (resource === "events") {
    const title = text(body.title);
    if (!title) return apiError("An event title is required.");
    const highlights = typeof body.highlights === "string" ? body.highlights.split("\n").map((line) => line.trim()).filter(Boolean) : Array.isArray(body.highlights) ? body.highlights : [];
    const payload = { title, slug: slugify(text(body.slug) || title), summary: optionalText(body.summary), event_type: optionalText(body.event_type) ?? "Event", topic: optionalText(body.topic), format: optionalText(body.format) ?? "in-person", status: ["draft", "scheduled", "published", "archived"].includes(text(body.status)) ? text(body.status) : "published", starts_at: date(body.starts_at), ends_at: date(body.ends_at), location: optionalText(body.location), image_url: optionalText(body.image_url), official_url: optionalText(body.official_url), registration_url: optionalText(body.registration_url), programme_url: optionalText(body.programme_url), faculty_url: optionalText(body.faculty_url), highlights, updated_at: new Date().toISOString() };
    const { data, error } = body.id ? await client.from("events").update(payload).eq("id", text(body.id)).select("id").single() : await client.from("events").insert(payload).select("id").single();
    return error ? apiError(error.message, 500) : Response.json({ data });
  }

  if (resource === "contributors") {
    const display_name = text(body.display_name);
    if (!display_name) return apiError("A contributor name is required.");
    const payload = { display_name, credentials: optionalText(body.credentials), biography: safeRichText(body.biography), photo_url: optionalText(body.photo_url), role_title: optionalText(body.role_title), group_name: optionalText(body.group_name), sort_order: Number(body.sort_order) || 0, published: body.published !== false, updated_at: new Date().toISOString() };
    const { data, error } = body.id ? await client.from("contributors").update(payload).eq("id", text(body.id)).select("id").single() : await client.from("contributors").insert(payload).select("id").single();
    return error ? apiError(error.message, 500) : Response.json({ data });
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
  if (!resource || !["content", "topics", "events", "contributors"].includes(resource)) return apiError("This item cannot be deleted here.", 404);
  const access = await resolveAdminIdentity(request);
  if (!access.identity) return apiError(access.message, access.status);
  if (!canDelete(access.identity.role, resource)) return apiError(`${roleLabel(access.identity.role)} accounts cannot delete ${resource}. Ask the Owner or a Content manager.`, 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return apiError("Choose an item to delete.");
  const table = resource === "content" ? "content_items" : resource;
  const { error } = await getSupabaseServerClient().from(table).delete().eq("id", id);
  return error ? apiError(error.message, 500) : Response.json({ ok: true });
}
