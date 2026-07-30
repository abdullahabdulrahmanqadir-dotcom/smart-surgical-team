import { apiError, getAdminIdentity, slugify } from "../../../lib/admin-server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) return apiError("You do not have permission to upload files.", 403);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return apiError("Choose a file to upload.");
  if (!ACCEPTED_TYPES.includes(file.type) || file.size > 25 * 1024 * 1024) return apiError("Use a JPG, PNG, WebP, or PDF smaller than 25 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "file";
  const path = `${identity.id}/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, "")) || "upload"}.${extension}`;
  const client = getSupabaseServerClient();
  const { error } = await client.storage.from("sst-content").upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return apiError(error.message, 500);
  const { data } = client.storage.from("sst-content").getPublicUrl(path);
  return Response.json({ path, publicUrl: data.publicUrl, kind: file.type === "application/pdf" ? "document" : "image" });
}
