import { getSupabaseServerClient } from "../../../lib/supabase/server";

const PROTECTED_OWNER_EMAIL = "sarkrda.mohammed04@gmail.com";

export async function DELETE(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sign in again before deleting your account." }, { status: 401 });

  let body: { confirmation?: unknown } = {};
  try { body = await request.json() as { confirmation?: unknown }; } catch { /* handled by confirmation check */ }
  if (body.confirmation !== "DELETE") return Response.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });

  try {
    const client = getSupabaseServerClient();
    const { data, error: userError } = await client.auth.getUser(token);
    if (userError || !data.user) return Response.json({ error: "Your session has expired. Sign in again before deleting your account." }, { status: 401 });
    if (data.user.email === PROTECTED_OWNER_EMAIL) return Response.json({ error: "The designated Owner account cannot be deleted while it owns the workspace." }, { status: 403 });

    const { error: signOutError } = await client.auth.admin.signOut(token, "global");
    if (signOutError) return Response.json({ error: "Could not close your active sessions. Your account was not deleted." }, { status: 502 });
    const { error: deleteError } = await client.auth.admin.deleteUser(data.user.id);
    if (deleteError) return Response.json({ error: "Could not delete your account. Please contact the team." }, { status: 502 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Account deletion is temporarily unavailable." }, { status: 503 });
  }
}
