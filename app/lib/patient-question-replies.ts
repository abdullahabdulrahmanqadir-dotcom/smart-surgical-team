/**
 * Ready-made replies and the WhatsApp opening message for the Admin inbox.
 *
 * DRAFT TEXT — the clinical team must read and approve every reply before
 * launch (docs/patient-questions-plan.md, "Still open"). Kept in code rather
 * than the database so a change is reviewed like any other wording change.
 *
 * Each reply exists in the two languages a question can arrive in. `{booking}`
 * is replaced with the booking phone when one is configured, or the contact
 * page link otherwise.
 */
import { ASK_CONTACT } from "./patient-questions";

type Locale = "en" | "ar";
type Reply = { id: string; label: string; text: Record<Locale, string> };

export const READY_REPLIES: Reply[] = [
  {
    id: "visit",
    label: "Needs a clinic visit",
    text: {
      en: "Thank you for your question. To answer it properly, one of our surgeons would need to examine you and look at your results, which we cannot do online. Please book a visit at the clinic. {booking}",
      ar: "شكراً لسؤالك. للإجابة عنه بشكل صحيح، يحتاج أحد جرّاحينا إلى فحصك والاطّلاع على نتائجك، وهذا غير ممكن عبر الإنترنت. يرجى حجز موعد في العيادة. {booking}",
    },
  },
  {
    id: "book",
    label: "How to book",
    text: {
      en: "You can book a visit with our team at Smart Health Tower in Sulaymaniyah, Saturday to Thursday. {booking}",
      ar: "يمكنك حجز موعد مع فريقنا في Smart Health Tower في السليمانية، من السبت إلى الخميس. {booking}",
    },
  },
  {
    id: "emergency",
    label: "Emergency",
    text: {
      en: "What you describe may need urgent care. Please do not wait for an online answer: go to the nearest emergency department now.",
      ar: "ما تصفه قد يحتاج إلى رعاية عاجلة. يرجى عدم انتظار إجابة عبر الإنترنت: توجّه الآن إلى أقرب قسم طوارئ.",
    },
  },
  {
    id: "scope",
    label: "Outside what we answer online",
    text: {
      en: "Thank you for your question. We cannot answer it online, because it needs a diagnosis or a decision about your own treatment. Please book a visit with us, or speak to the doctor who is treating you. {booking}",
      ar: "شكراً لسؤالك. لا يمكننا الإجابة عنه عبر الإنترنت، لأنه يتطلّب تشخيصاً أو قراراً بشأن علاجك الخاص. يرجى حجز موعد لدينا، أو التحدّث إلى الطبيب المعالج. {booking}",
    },
  },
];

const BOOKING = {
  phone: { en: "To book, call {phone}.", ar: "للحجز، اتصل على الرقم {phone}." },
  link: { en: "Our contact details: {link}", ar: "تفاصيل التواصل معنا: {link}" },
} as const;

/** A reply with `{booking}` filled in for the patient's language. */
export function readyReplyText(reply: Reply, locale: Locale, origin: string): string {
  const booking = ASK_CONTACT.bookingPhone
    ? BOOKING.phone[locale].replace("{phone}", ASK_CONTACT.bookingPhone)
    : BOOKING.link[locale].replace("{link}", `${origin}/${locale}/contact`);
  return reply.text[locale].replace("{booking}", booking).trim();
}

/**
 * The team's first WhatsApp message. It confirms the number belongs to the
 * person who asked before any answer is sent to it.
 */
export function whatsappOpening(locale: Locale, name: string): string {
  return locale === "ar"
    ? `مرحباً ${name}، معك Smart Surgical Team. هل أرسلت إلينا سؤالاً عبر موقعنا الإلكتروني؟ إذا كان الأمر كذلك، فردّ بـ«نعم» وسنرسل إليك إجابتنا هنا.`
    : `Hello ${name}, this is Smart Surgical Team. Did you send us a question through our website? If so, reply yes and we will send our answer here.`;
}
