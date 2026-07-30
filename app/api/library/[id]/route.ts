import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { getContentForMember } from "../../../lib/content";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sign in to view this learning item." }, { status: 401 });
  const { data, error } = await getSupabaseServerClient().auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Sign in to view this learning item." }, { status: 401 });
  const content = await getContentForMember((await params).id);
  return content ? Response.json({ data: content }) : Response.json({ error: "Content not found." }, { status: 404 });
}
