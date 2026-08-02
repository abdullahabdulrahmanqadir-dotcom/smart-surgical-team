import { env } from "cloudflare:workers";
import { apiError, getAdminIdentity, slugify } from "../../../lib/admin-server";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) return apiError("You do not have permission to upload files.", 403);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return apiError("Choose a file to upload.");
  if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) return apiError("Use a JPG, PNG, WebP, or PDF no larger than 10 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "file";
  // Folder-like key prefix so the R2 dashboard browses like topic/case/files,
  // even though R2 has no real directories. Re-slugify client-supplied values
  // here rather than trusting them, since they land directly in a storage key.
  const topicSlug = slugify(String(form.get("topicSlug") ?? "")) || "unfiled";
  const caseSlug = slugify(String(form.get("caseSlug") ?? "")) || "untitled";
  const filename = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, "")) || "upload"}.${extension}`;
  const path = `topics/${topicSlug}/${caseSlug}/${filename}`;
  await env.MEDIA_BUCKET.put(path, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return Response.json({ path, publicUrl: `/api/media/${path}`, kind: file.type === "application/pdf" ? "document" : "image" });
}
