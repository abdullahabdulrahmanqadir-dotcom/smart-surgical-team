"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Dictionary } from "../lib/dictionaries";
import { fill } from "../lib/dictionaries";
import type { Locale } from "../lib/i18n";
import {
  QUESTION_LIMITS,
  QUESTION_TOPICS,
  REPLY_WITHIN_WORKING_DAYS,
  validateQuestion,
  type QuestionField,
  type QuestionFieldError,
  type ReplyChannel,
} from "../lib/patient-questions";
import { IconArrowRight, IconCheck, IconMail, IconWhatsApp } from "./icons";
import { isTurnstileUnavailable, useTurnstile } from "./Turnstile";

type AskCopy = Dictionary["ask"];
type Errors = Partial<Record<QuestionField, QuestionFieldError>>;
type Sent = { replyVia: ReplyChannel; emailConfirmation: boolean };

/** Field order, so focus lands on the first problem as the patient reads it. */
const FIELD_ORDER: QuestionField[] = ["name", "email", "phone", "replyVia", "topic", "question"];

function fieldMessage(t: AskCopy, field: QuestionField, error: QuestionFieldError): string {
  switch (field) {
    case "name": return error === "tooLong" ? t.nameTooLong : t.nameRequired;
    case "phone": return error === "invalid" ? t.phoneInvalid : t.phoneNeeded;
    case "email": return error === "invalid" ? t.emailInvalid : t.emailRequired;
    case "replyVia": return t.replyRequired;
    case "topic": return t.topicInvalid;
    case "question":
      if (error === "tooShort") return t.questionTooShort;
      if (error === "tooLong") return fill(t.questionTooLong, { max: String(QUESTION_LIMITS.questionMax) });
      if (error === "tooManyLinks") return fill(t.questionTooManyLinks, { max: String(QUESTION_LIMITS.linksMax) });
      return t.questionRequired;
  }
}

const TOPIC_LABEL = {
  thyroid: "topicThyroid",
  parathyroid: "topicParathyroid",
  breast: "topicBreast",
  appointments: "topicAppointments",
  team: "topicTeam",
  research: "topicResearch",
  other: "topicOther",
} as const satisfies Record<(typeof QUESTION_TOPICS)[number], keyof AskCopy>;

export default function AskQuestionForm({ locale, t }: { locale: Locale; t: AskCopy }) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const sentHeading = useRef<HTMLHeadingElement>(null);
  const turnstile = useTurnstile(locale);

  const [replyVia, setReplyVia] = useState<ReplyChannel>("email");
  const [questionLength, setQuestionLength] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  useEffect(() => {
    if (sent) sentHeading.current?.focus();
  }, [sent]);

  const fieldId = (field: string) => `${id}-${field}`;
  const describedBy = (field: QuestionField, hint?: boolean) =>
    [hint ? fieldId(`${field}-hint`) : null, errors[field] ? fieldId(`${field}-error`) : null].filter(Boolean).join(" ") || undefined;

  function focusFirst(found: Errors) {
    const first = FIELD_ORDER.find((field) => found[field]);
    if (!first) return;
    const target = first === "replyVia"
      ? formRef.current?.querySelector<HTMLInputElement>('input[name="replyVia"]')
      : document.getElementById(fieldId(first));
    target?.focus();
  }

  function clearError(field: QuestionField) {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      replyVia: String(data.get("replyVia") ?? ""),
      topic: String(data.get("topic") ?? ""),
      question: String(data.get("question") ?? ""),
      website: String(data.get("website") ?? ""),
      locale,
    };

    // Same validator as the server, so the patient sees the same answer
    // without a round trip.
    const check = validateQuestion(payload);
    if (!check.ok) {
      setErrors(check.errors);
      setFormError(t.fixErrors);
      focusFirst(check.errors);
      return;
    }
    setErrors({});
    setFormError(null);
    setSending(true);

    let turnstileToken: string | undefined;
    try {
      turnstileToken = await turnstile.getToken();
    } catch (error) {
      setSending(false);
      setFormError(isTurnstileUnavailable(error) ? t.errorBot : t.errorServer);
      return;
    }

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, turnstileToken }),
      });
      const result = await response.json().catch(() => null) as
        | { ok: true; emailConfirmation: boolean }
        | { ok: false; code?: string; errors?: Errors }
        | null;

      if (result?.ok) {
        setSent({ replyVia: check.value.replyVia, emailConfirmation: result.emailConfirmation });
        return;
      }
      turnstile.reset();
      if (result?.code === "invalid" && result.errors) {
        setErrors(result.errors);
        setFormError(t.fixErrors);
        focusFirst(result.errors);
      } else {
        setFormError(
          result?.code === "bot" ? t.errorBot
            : result?.code === "rate" ? t.errorRate
              : result?.code === "unavailable" ? t.errorUnavailable
                : t.errorServer,
        );
      }
    } catch {
      turnstile.reset();
      setFormError(t.errorNetwork);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    const followUp = sent.replyVia === "email" && sent.emailConfirmation
      ? t.sentEmailConfirm
      : sent.replyVia === "email" ? t.sentEmailNoConfirm : t.sentWhatsapp;
    return (
      <section className="ask-card ask-sent" aria-labelledby={fieldId("sent")}>
        <span className="ask-sent-mark" aria-hidden="true"><IconCheck size={26} /></span>
        <h3 id={fieldId("sent")} ref={sentHeading} tabIndex={-1}>{t.sentTitle}</h3>
        <p>{followUp}</p>
        <p className="ask-muted">{fill(t.sentReply, { days: String(REPLY_WITHIN_WORKING_DAYS) })}</p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => { setSent(null); setQuestionLength(0); setReplyVia("email"); }}
        >
          {t.askAnother}
        </button>
      </section>
    );
  }

  const fieldError = (field: QuestionField) => errors[field]
    ? <p className="ask-field-error" id={fieldId(`${field}-error`)}>{fieldMessage(t, field, errors[field]!)}</p>
    : null;

  const nearLimit = questionLength > QUESTION_LIMITS.questionMax * 0.9;

  return (
    <section className="ask-card" aria-labelledby={fieldId("title")}>
      <h3 id={fieldId("title")} className="ask-card-title">{t.formTitle}</h3>
      <form ref={formRef} className="ask-form" noValidate onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor={fieldId("name")}>{t.name} <span aria-hidden="true">*</span></label>
          <div className={`field-control is-plain${errors.name ? " is-invalid" : ""}`}>
            <input
              id={fieldId("name")} name="name" type="text" autoComplete="name" required
              maxLength={QUESTION_LIMITS.nameMax} aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy("name")} onInput={() => clearError("name")}
            />
          </div>
          {fieldError("name")}
        </div>

        <div className="ask-form-pair">
          <div className="form-field">
            <label htmlFor={fieldId("email")}>{t.email} <span aria-hidden="true">*</span></label>
            <div className={`field-control${errors.email ? " is-invalid" : ""}`}>
              <IconMail size={18} />
              <input
                id={fieldId("email")} name="email" type="email" inputMode="email" autoComplete="email" required dir="ltr"
                maxLength={QUESTION_LIMITS.emailMax} aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy("email", true)} onInput={() => clearError("email")}
              />
            </div>
            <small id={fieldId("email-hint")}>{t.emailHint}</small>
            {fieldError("email")}
          </div>

          <div className="form-field">
            <label htmlFor={fieldId("phone")}>{t.phone} <span className="ask-optional">({t.optional})</span></label>
            <div className={`field-control${errors.phone ? " is-invalid" : ""}`}>
              <IconWhatsApp size={18} />
              <input
                id={fieldId("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
                placeholder="07XX XXX XXXX" aria-invalid={Boolean(errors.phone)}
                aria-describedby={describedBy("phone", true)} onInput={() => clearError("phone")}
              />
            </div>
            <small id={fieldId("phone-hint")}>{t.phoneHint}</small>
            {fieldError("phone")}
          </div>
        </div>

        <fieldset className="ask-reply" aria-describedby={errors.replyVia ? fieldId("replyVia-error") : undefined}>
          <legend>{t.replyVia} <span aria-hidden="true">*</span></legend>
          <div className="ask-reply-options">
            {(["email", "whatsapp"] as const).map((channel) => (
              <label key={channel} className={`ask-reply-option${replyVia === channel ? " is-selected" : ""}`}>
                <input
                  type="radio" name="replyVia" value={channel} checked={replyVia === channel}
                  onChange={() => { setReplyVia(channel); clearError("replyVia"); clearError("phone"); }}
                />
                <span className="ask-reply-icon" aria-hidden="true">{channel === "whatsapp" ? <IconWhatsApp size={20} /> : <IconMail size={20} />}</span>
                <span className="ask-reply-text">
                  <strong>{channel === "whatsapp" ? t.replyWhatsapp : t.replyEmail}</strong>
                  <small>{channel === "whatsapp" ? t.replyWhatsappHint : t.replyEmailHint}</small>
                </span>
              </label>
            ))}
          </div>
          {fieldError("replyVia")}
        </fieldset>

        <div className="form-field">
          <label htmlFor={fieldId("topic")}>{t.topic} <span className="ask-optional">({t.optional})</span></label>
          <div className="field-control is-select">
            <select id={fieldId("topic")} name="topic" defaultValue="" aria-describedby={describedBy("topic")}>
              <option value="">{t.topicPlaceholder}</option>
              {QUESTION_TOPICS.map((topic) => <option key={topic} value={topic}>{t[TOPIC_LABEL[topic]]}</option>)}
            </select>
          </div>
          {fieldError("topic")}
        </div>

        <div className="form-field">
          <div className="field-label-row">
            <label htmlFor={fieldId("question")}>{t.question} <span aria-hidden="true">*</span></label>
            <span className={`ask-counter${nearLimit ? " is-near" : ""}`} aria-live={nearLimit ? "polite" : "off"}>
              {fill(t.characters, { count: String(questionLength), max: String(QUESTION_LIMITS.questionMax) })}
            </span>
          </div>
          <div className={`field-control is-textarea${errors.question ? " is-invalid" : ""}`}>
            <textarea
              id={fieldId("question")} name="question" rows={7} required dir="auto"
              maxLength={QUESTION_LIMITS.questionMax} aria-invalid={Boolean(errors.question)}
              aria-describedby={describedBy("question", true)}
              onInput={(event) => { setQuestionLength(event.currentTarget.value.length); clearError("question"); }}
            />
          </div>
          <small id={fieldId("question-hint")}>{t.questionHint}</small>
          {fieldError("question")}
        </div>

        {/* Honeypot: hidden from people and from assistive technology. */}
        <div className="ask-trap" aria-hidden="true">
          <label htmlFor={fieldId("website")}>Website</label>
          <input id={fieldId("website")} name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {turnstile.widget}
        {formError && <p className="form-message is-error" role="alert">{formError}</p>}

        <button className="btn btn-primary ask-submit" type="submit" disabled={sending} aria-busy={sending}>
          {sending ? t.sending : <>{t.submit}<IconArrowRight size={17} /></>}
        </button>
      </form>
    </section>
  );
}
