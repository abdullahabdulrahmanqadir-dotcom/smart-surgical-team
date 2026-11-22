import { refuseForeignRequest } from "../../../lib/inbox-server";
import { isWellFormedToken, sha256Hex } from "../../../lib/patient-questions-server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

/**
 * POST /api/questions/confirm — proves a patient owns the email they gave.
 *
 * Reached only by pressing the button on /:locale/ask/confirm, never by
 * opening the emailed link: mail security scanners (Outlook Safe Links, Gmail,
 * corporate gateways) open every link they see, which would confirm any
 * address typed into the form. The token travels in the URL fragment, so it is
 * never sent with the page request or written to a server log either.
 */

type ConfirmStatus = "confirmed" | "already" | "expired" | "invalid";

const NO_STORE = { "cache-control": "no-store" };

function respond(status: ConfirmStatus, httpStatus = 200) {
  return Response.json({ status }, { status: httpStatus, headers: NO_STORE });
}

export async function POST(request: Request) {
  const foreign = refuseForeignRequest(request);
  if (foreign) return respond("invalid", foreign);
  let token: unknown;
  try {
    token = (await request.json() as { token?: unknown }).token;
  } catch {
    return respond("invalid", 400);
  }
  if (!isWellFormedToken(token)) return respond("invalid", 400);

  let client: ReturnType<typeof getSupabaseServerClient>;
  try {
    client = getSupabaseServerClient();
  } catch (error) {
    console.error("[questions/confirm]", error instanceof Error ? error.message : error);
    return Response.json({ status: "error" }, { status: 503, headers: NO_STORE });
  }

  const hash = await sha256Hex(token);
  const { data, error } = await client
    .from("patient_questions")
    .select("id, email_confirmed_at, email_token_expires_at")
    .eq("email_token_hash", hash)
    .maybeSingle();
  if (error) {
    console.error("[questions/confirm] read failed:", error.message);
    return Response.json({ status: "error" }, { status: 500, headers: NO_STORE });
  }
  if (!data) return respond("invalid", 404);
  if (data.email_confirmed_at) return respond("already");
  if (!data.email_token_expires_at || new Date(data.email_token_expires_at).getTime() < Date.now()) return respond("expired", 410);

  const { error: updateError } = await client
    .from("patient_questions")
    .update({ email_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("email_confirmed_at", null);
  if (updateError) {
    console.error("[questions/confirm] update failed:", updateError.message);
    return Response.json({ status: "error" }, { status: 500, headers: NO_STORE });
  }
  return respond("confirmed");
}
