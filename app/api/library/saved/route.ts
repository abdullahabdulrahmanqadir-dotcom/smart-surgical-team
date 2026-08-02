import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { getContentForMember } from "../../../lib/content";

function savedSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).slug === "string" ? [(item as Record<string, unknown>).slug as string] : []))];
}

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sign in to view saved learning." }, { status: 401 });
  try {
    const { data, error } = await getSupabaseServerClient().auth.getUser(token);
    if (error || !data.user) return Response.json({ error: "Sign in to view saved learning." }, { status: 401 });
    const slugs = savedSlugs(data.user.user_metadata.saved_cases);
    const records = await Promise.all(slugs.map((slug) => getContentForMember(slug)));
    const live = records.flatMap((record) => record ? [record] : []);
    const liveSlugs = new Set(live.map((record) => record.slug));
    const staleRemoved = slugs.length !== live.length;
    if (staleRemoved) {
      const savedCases = Array.isArray(data.user.user_metadata.saved_cases) ? data.user.user_metadata.saved_cases.filter((item: unknown) => item && typeof item === "object" && typeof (item as Record<string, unknown>).slug === "string" && liveSlugs.has((item as Record<string, unknown>).slug as string)) : [];
      await getSupabaseServerClient().auth.admin.updateUserById(data.user.id, { user_metadata: { ...data.user.user_metadata, saved_cases: savedCases } });
    }
    return Response.json({ data: live });
  } catch { return Response.json({ error: "Saved learning is temporarily unavailable." }, { status: 503 }); }
}
