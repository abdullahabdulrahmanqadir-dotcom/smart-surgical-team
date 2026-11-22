import { notFound, permanentRedirect } from "next/navigation";
import { isLocale, localePath } from "../../lib/i18n";

/**
 * /:locale/ask — the question form now lives on the contact page
 * (/:locale/contact#ask), so contacting the team and asking it a question are
 * one page. This permanent redirect keeps old links and bookmarks working.
 * The email-confirmation page stays at /:locale/ask/confirm, because links in
 * emails already sent point there.
 */
export default async function AskPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  permanentRedirect(`${localePath(locale, "contact")}#ask`);
}
