import { apiError, jsonObject, resolveAdminIdentity, safeRichText, slugify } from "../../../lib/admin-server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

type RouteContext = { params: Promise<{ resource: string }> };
const allowedResources = ["overview", "content", "topics", "events", "contributors", "people", "messages"] as const;
type Resource = (typeof allowedResources)[number];

function asResource(value: string): Resource | null {
  return (allowedResources as readonly string[]).includes(value) ? value as Resource : null;
}

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
      .select("id,title,slug,summary,kind,status,access_level,video_url,poster_url,duration_seconds,reading_minutes,level,published_at,scheduled_for,contributor_id,body_html,case_presentation,case_imaging,case_procedure,case_histopathology,case_outcome,content_topics(topic_id),content_chapters(id,title,position,starts_at_seconds),content_media(id,kind,public_url,alt_text,caption,sort_order)")
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
  const { data: users } = await client.auth.admin.listUsers({ perPage: 1000 });
  const emails = new Map((users?.users ?? []).map((user) => [user.id, user.email ?? ""]));
  return Response.json({ data: (profiles ?? []).map((profile) => ({ ...profile, email: emails.get(profile.id) ?? "" })) });
}

export async function POST(request: Request, context: RouteContext) {
  const resource = asResource((await context.params).resource);
  if (!resource || resource === "overview" || resource === "messages") return apiError("This resource cannot be created here.", 404);
  const access = await resolveAdminIdentity(request, resource === "people");
  if (!access.identity) return apiError(access.message, access.status);
  const identity = access.identity;
  const body = jsonObject(await request.json().catch(() => null));
  if (!body) return apiError("The submitted data was invalid.");
  const client = getSupabaseServerClient();

  if (resource === "content") {
    const title = text(body.title);
    if (!title) return apiError("A title is required.");
    const slug = slugify(text(body.slug) || title);
    if (!slug) return apiError("Add a usable title or URL slug.");
    const status = ["draft", "scheduled", "published", "archived"].includes(text(body.status)) ? text(body.status) : "published";
    const item = {
      title, slug, summary: optionalText(body.summary), kind: ["video", "webinar_recording", "poster", "case_article"].includes(text(body.kind)) ? text(body.kind) : "case_article",
      status, access_level: text(body.access_level) === "members_only" ? "members_only" : "public", video_url: optionalText(body.video_url),
      poster_url: optionalText(body.poster_url), duration_seconds: Number.isFinite(Number(body.duration_seconds)) && Number(body.duration_seconds) > 0 ? Number(body.duration_seconds) : null,
      reading_minutes: Number.isFinite(Number(body.reading_minutes)) && Number(body.reading_minutes) > 0 ? Number(body.reading_minutes) : null,
      level: optionalText(body.level), body_html: safeRichText(body.body_html), contributor_id: optionalText(body.contributor_id),
      case_presentation: optionalText(body.case_presentation), case_imaging: optionalText(body.case_imaging), case_procedure: optionalText(body.case_procedure),
      case_histopathology: optionalText(body.case_histopathology), case_outcome: optionalText(body.case_outcome),
      scheduled_for: status === "scheduled" ? date(body.scheduled_for) : null, published_at: status === "published" ? new Date().toISOString() : null, updated_by: identity.id,
    };
    const { data: saved, error } = body.id
      ? await client.from("content_items").update(item).eq("id", text(body.id)).select("id").single()
      : await client.from("content_items").insert(item).select("id").single();
    if (error || !saved) return apiError(error?.message ?? "Could not save this content item.", 500);
    const topicIds = Array.isArray(body.topic_ids) ? body.topic_ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
    await client.from("content_topics").delete().eq("content_id", saved.id);
    if (topicIds.length) await client.from("content_topics").insert(topicIds.map((topic_id) => ({ content_id: saved.id, topic_id })));
    const chapters = Array.isArray(body.chapters) ? body.chapters : [];
    await client.from("content_chapters").delete().eq("content_id", saved.id);
    const validChapters = chapters.flatMap((chapter, position) => {
      const entry = jsonObject(chapter); const chapterTitle = text(entry?.title);
      return chapterTitle ? [{ content_id: saved.id, title: chapterTitle, position, starts_at_seconds: Math.max(0, Number(entry?.starts_at_seconds) || 0) }] : [];
    });
    if (validChapters.length) await client.from("content_chapters").insert(validChapters);
    const media = Array.isArray(body.media) ? body.media : [];
    await client.from("content_media").delete().eq("content_id", saved.id);
    const validMedia = media.flatMap((entry, sort_order) => {
      const item = jsonObject(entry); const public_url = text(item?.public_url); const storage_path = text(item?.storage_path);
      return public_url && storage_path ? [{ content_id: saved.id, storage_path, public_url, kind: text(item?.kind) === "document" ? "document" : "image", alt_text: optionalText(item?.alt_text), caption: optionalText(item?.caption), sort_order }] : [];
    });
    if (validMedia.length) await client.from("content_media").insert(validMedia);
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
    const payload = { title, slug: slugify(text(body.slug) || title), summary: optionalText(body.summary), event_type: optionalText(body.event_type) ?? "Event", topic: optionalText(body.topic), format: optionalText(body.format) ?? "in-person", status: ["draft", "scheduled", "published", "archived"].includes(text(body.status)) ? text(body.status) : "published", starts_at: date(body.starts_at), ends_at: date(body.ends_at), location: optionalText(body.location), image_url: optionalText(body.image_url), official_url: optionalText(body.official_url), registration_url: optionalText(body.registration_url), programme_url: optionalText(body.programme_url), updated_at: new Date().toISOString() };
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
  if (!body.id || !["owner", "content_manager", "editor", "contributor", "member"].includes(role)) return apiError("Choose a valid staff role.");
  if (text(body.email) === "sarkrda.mohammed04@gmail.com" && role !== "owner") return apiError("The designated Owner account cannot be downgraded here.");
  const { data, error } = await client.from("profiles").update({ role }).eq("id", text(body.id)).select("id").single();
  return error ? apiError(error.message, 500) : Response.json({ data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const resource = asResource((await context.params).resource);
  if (!resource || !["content", "topics", "events", "contributors"].includes(resource)) return apiError("This item cannot be deleted here.", 404);
  const access = await resolveAdminIdentity(request);
  if (!access.identity) return apiError(access.message, access.status);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return apiError("Choose an item to delete.");
  const table = resource === "content" ? "content_items" : resource;
  const { error } = await getSupabaseServerClient().from(table).delete().eq("id", id);
  return error ? apiError(error.message, 500) : Response.json({ ok: true });
}
