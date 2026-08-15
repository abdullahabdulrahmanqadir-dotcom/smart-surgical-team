const MAX_TEXTS = 24;
const MAX_TEXT_LENGTH = 14_000;
const MAX_TOTAL_LENGTH = 16_000;

type GoogleTranslation = Array<Array<[string, ...unknown[]]>>;

function translatedText(payload: unknown): string | null {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return null;
  const parts = (payload as GoogleTranslation)[0]
    .map((segment) => Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "")
    .join("");
  return parts || null;
}

async function translateToArabic(text: string): Promise<string> {
  const response = await fetch("https://translate.googleapis.com/translate_a/single", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ client: "gtx", sl: "en", tl: "ar", dt: "t", q: text }),
  });

  if (!response.ok) throw new Error(`Translation provider returned ${response.status}`);
  const translated = translatedText(await response.json());
  if (!translated) throw new Error("Translation provider returned an invalid response");
  return translated;
}

/**
 * Same-origin translation fallback for browsers without the on-device
 * Translator API (notably mobile browsers). The small, bounded payload keeps
 * this public route from becoming a general-purpose translation proxy.
 */
export async function POST(request: Request) {
  let body: { texts?: unknown };
  try {
    body = await request.json() as { texts?: unknown };
  } catch {
    return Response.json({ error: "Invalid translation request." }, { status: 400 });
  }

  if (!Array.isArray(body.texts) || body.texts.length < 1 || body.texts.length > MAX_TEXTS) {
    return Response.json({ error: "Invalid translation request." }, { status: 400 });
  }

  const texts = body.texts;
  if (
    texts.some((text) => typeof text !== "string" || !text.trim() || text.length > MAX_TEXT_LENGTH) ||
    texts.reduce((total, text) => total + (typeof text === "string" ? text.length : 0), 0) > MAX_TOTAL_LENGTH
  ) {
    return Response.json({ error: "Translation request is too large." }, { status: 413 });
  }

  try {
    const translations = await Promise.all((texts as string[]).map(translateToArabic));
    return Response.json(
      { translations },
      { headers: { "cache-control": "private, max-age=3600" } },
    );
  } catch {
    return Response.json({ error: "Translation is temporarily unavailable." }, { status: 502 });
  }
}
