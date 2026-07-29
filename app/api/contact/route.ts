import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "edge";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const source = String(form.get("source") ?? "website").trim().slice(0, 80);

  if (!isEmail(email)) return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });

  try {
    const { error } = await getSupabaseServerClient().from("contact_messages").insert({ email, name: name || null, message: message || null, source });
    if (error) throw error;
  } catch (error) {
    console.error("Contact form submission failed", error);
    return NextResponse.json({ error: "We could not save your details. Please try again shortly." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
