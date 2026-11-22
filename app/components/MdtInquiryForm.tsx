"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { countryOptions } from "../lib/countries";
import type { Dictionary } from "../lib/dictionaries";
import { fill } from "../lib/dictionaries";
import type { Locale } from "../lib/i18n";
import {
  MDT_INTERESTS,
  MDT_LIMITS,
  MDT_ROLES,
  validateMdtInquiry,
  type MdtField,
  type MdtFieldError,
  type MdtInterest,
  type MdtRole,
} from "../lib/mdt-inquiries";
import { IconArrowRight, IconCheck, IconGlobe, IconMail, IconPhone, IconUser, IconUsers } from "./icons";
import { isTurnstileUnavailable, useTurnstile } from "./Turnstile";

type MdtCopy = Dictionary["mdt"];
type Errors = Partial<Record<MdtField, MdtFieldError>>;

/** Field order, so focus lands on the first problem as the visitor reads it. */
const FIELD_ORDER: MdtField[] = [
  "name", "role", "institution", "country", "email", "phone", "interest", "message", "noPatientData", "consent",
];

const ROLE_LABEL = {
  surgeon: "roleSurgeon",
  endocrinologist: "roleEndocrinologist",
  oncologist: "roleOncologist",
  radiologist: "roleRadiologist",
  pathologist: "rolePathologist",
  nuclear_medicine: "roleNuclearMedicine",
  other_doctor: "roleOtherDoctor",
  institution: "roleInstitution",
  other: "roleOther",
} as const satisfies Record<MdtRole, keyof MdtCopy>;

const INTEREST_LABEL = {
  present_case: "interestPresent",
  attend: "interestAttend",
  observe: "interestObserve",
  collaborate: "interestCollaborate",
  other: "interestOther",
} as const satisfies Record<MdtInterest, keyof MdtCopy>;

function fieldMessage(t: MdtCopy, field: MdtField, error: MdtFieldError): string {
  switch (field) {
    case "name": return error === "tooLong" ? t.nameTooLong : t.nameRequired;
    case "role": return t.roleRequired;
    case "institution":
      if (error === "invalid") return t.institutionInvalid;
      if (error === "tooLong") return t.institutionTooLong;
      return t.institutionRequired;
    case "country": return t.countryRequired;
    case "email": return error === "invalid" ? t.emailInvalid : t.emailRequired;
    case "phone": return t.phoneInvalid;
    case "interest": return t.interestRequired;
    case "message":
      if (error === "tooShort") return t.messageTooShort;
      if (error === "tooLong") return fill(t.messageTooLong, { max: String(MDT_LIMITS.messageMax) });
      if (error === "tooManyLinks") return fill(t.messageTooManyLinks, { max: String(MDT_LIMITS.linksMax) });
      return t.messageRequired;
    case "noPatientData": return t.noPatientDataRequired;
    case "consent": return t.consentRequired;
  }
}

export default function MdtInquiryForm({ locale, t }: { locale: Locale; t: MdtCopy }) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const sentHeading = useRef<HTMLHeadingElement>(null);
  // Set when the form first renders in the browser; the server treats a
  // submission under a few seconds as a bot.
  const loadedAt = useRef<number | null>(null);
  const turnstile = useTurnstile(locale);

  const [messageLength, setMessageLength] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (sent) sentHeading.current?.focus();
  }, [sent]);

  const fieldId = (field: string) => `${id}-${field}`;
  const describedBy = (field: MdtField, hint?: boolean) =>
    [hint ? fieldId(`${field}-hint`) : null, errors[field] ? fieldId(`${field}-error`) : null].filter(Boolean).join(" ") || undefined;

  function focusFirst(found: Errors) {
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) document.getElementById(fieldId(first))?.focus();
  }

  function clearError(field: MdtField) {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      role: String(data.get("role") ?? ""),
      institution: String(data.get("institution") ?? ""),
      country: String(data.get("country") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      interest: String(data.get("interest") ?? ""),
      message: String(data.get("message") ?? ""),
      noPatientData: data.get("noPatientData") === "on",
      consent: data.get("consent") === "on",
      website: String(data.get("website") ?? ""),
      locale,
    };

    const check = validateMdtInquiry(payload);
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
      const elapsedMs = loadedAt.current === null ? 0 : Date.now() - loadedAt.current;
      const response = await fetch("/api/mdt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, elapsedMs, turnstileToken }),
      });
      const result = await response.json().catch(() => null) as
        | { ok: true }
        | { ok: false; code?: string; errors?: Errors }
        | null;

      if (result?.ok) {
        setSent(true);
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
    return (
      <section className="ask-card ask-sent" aria-labelledby={fieldId("sent")}>
        <span className="ask-sent-mark" aria-hidden="true"><IconCheck size={26} /></span>
        <h2 id={fieldId("sent")} ref={sentHeading} tabIndex={-1}>{t.sentTitle}</h2>
        <p>{t.sentBody}</p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => { setSent(false); setMessageLength(0); loadedAt.current = Date.now(); }}
        >
          {t.sendAnother}
        </button>
      </section>
    );
  }

  const fieldError = (field: MdtField) => errors[field]
    ? <p className="ask-field-error" id={fieldId(`${field}-error`)}>{fieldMessage(t, field, errors[field]!)}</p>
    : null;
  const required = <span aria-hidden="true">*</span>;
  const nearLimit = messageLength > MDT_LIMITS.messageMax * 0.9;

  return (
    <section className="ask-card" aria-labelledby={fieldId("title")}>
      <h2 id={fieldId("title")} className="ask-card-title">{t.formTitle}</h2>
      <form ref={formRef} className="ask-form" noValidate onSubmit={handleSubmit}>
        <div className="ask-form-pair">
          <div className="form-field">
            <label htmlFor={fieldId("name")}>{t.name} {required}</label>
            <div className={`field-control${errors.name ? " is-invalid" : ""}`}>
              <IconUser size={18} />
              <input
                id={fieldId("name")} name="name" type="text" autoComplete="name" required
                maxLength={MDT_LIMITS.nameMax} aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy("name")} onInput={() => clearError("name")}
              />
            </div>
            {fieldError("name")}
          </div>

          <div className="form-field">
            <label htmlFor={fieldId("role")}>{t.role} {required}</label>
            <div className={`field-control is-select${errors.role ? " is-invalid" : ""}`}>
              <select
                id={fieldId("role")} name="role" defaultValue="" required
                aria-invalid={Boolean(errors.role)} aria-describedby={describedBy("role")}
                onChange={() => clearError("role")}
              >
                <option value="" disabled>{t.rolePlaceholder}</option>
                {MDT_ROLES.map((role) => <option key={role} value={role}>{t[ROLE_LABEL[role]]}</option>)}
              </select>
            </div>
            {fieldError("role")}
          </div>
        </div>

        <div className="ask-form-pair">
          <div className="form-field">
            <label htmlFor={fieldId("institution")}>{t.institution} {required}</label>
            <div className={`field-control${errors.institution ? " is-invalid" : ""}`}>
              <IconUsers size={18} />
              <input
                id={fieldId("institution")} name="institution" type="text" autoComplete="organization" required
                maxLength={MDT_LIMITS.institutionMax} aria-invalid={Boolean(errors.institution)}
                aria-describedby={describedBy("institution")} onInput={() => clearError("institution")}
              />
            </div>
            {fieldError("institution")}
          </div>

          <div className="form-field">
            <label htmlFor={fieldId("country")}>{t.country} {required}</label>
            <div className={`field-control is-select${errors.country ? " is-invalid" : ""}`}>
              <IconGlobe size={18} />
              <select
                id={fieldId("country")} name="country" defaultValue="" required
                aria-invalid={Boolean(errors.country)} aria-describedby={describedBy("country")}
                onChange={() => clearError("country")}
              >
                <option value="" disabled>{t.countryPlaceholder}</option>
                {countryOptions(locale).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {fieldError("country")}
          </div>
        </div>

        <div className="ask-form-pair">
          <div className="form-field">
            <label htmlFor={fieldId("email")}>{t.email} {required}</label>
            <div className={`field-control${errors.email ? " is-invalid" : ""}`}>
              <IconMail size={18} />
              <input
                id={fieldId("email")} name="email" type="email" inputMode="email" autoComplete="email" required dir="ltr"
                maxLength={MDT_LIMITS.emailMax} aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy("email", true)} onInput={() => clearError("email")}
              />
            </div>
            <small id={fieldId("email-hint")}>{t.emailHint}</small>
            {fieldError("email")}
          </div>

          <div className="form-field">
            <label htmlFor={fieldId("phone")}>{t.phone} <span className="ask-optional">({t.optional})</span></label>
            <div className={`field-control${errors.phone ? " is-invalid" : ""}`}>
              <IconPhone size={18} />
              <input
                id={fieldId("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
                placeholder="+964 7XX XXX XXXX" aria-invalid={Boolean(errors.phone)}
                aria-describedby={describedBy("phone", true)} onInput={() => clearError("phone")}
              />
            </div>
            <small id={fieldId("phone-hint")}>{t.phoneHint}</small>
            {fieldError("phone")}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor={fieldId("interest")}>{t.interest} {required}</label>
          <div className={`field-control is-select${errors.interest ? " is-invalid" : ""}`}>
            <select
              id={fieldId("interest")} name="interest" defaultValue="" required
              aria-invalid={Boolean(errors.interest)} aria-describedby={describedBy("interest")}
              onChange={() => clearError("interest")}
            >
              <option value="" disabled>{t.interestPlaceholder}</option>
              {MDT_INTERESTS.map((interest) => <option key={interest} value={interest}>{t[INTEREST_LABEL[interest]]}</option>)}
            </select>
          </div>
          {fieldError("interest")}
        </div>

        <div className="form-field">
          <div className="field-label-row">
            <label htmlFor={fieldId("message")}>{t.message} {required}</label>
            <span className={`ask-counter${nearLimit ? " is-near" : ""}`} aria-live={nearLimit ? "polite" : "off"}>
              {fill(t.characters, { count: String(messageLength), max: String(MDT_LIMITS.messageMax) })}
            </span>
          </div>
          <div className={`field-control is-textarea${errors.message ? " is-invalid" : ""}`}>
            <textarea
              id={fieldId("message")} name="message" rows={6} required dir="auto"
              maxLength={MDT_LIMITS.messageMax} aria-invalid={Boolean(errors.message)}
              aria-describedby={describedBy("message", true)}
              onInput={(event) => { setMessageLength(event.currentTarget.value.length); clearError("message"); }}
            />
          </div>
          <small id={fieldId("message-hint")}>{t.messageHint}</small>
          {fieldError("message")}
        </div>

        {(["noPatientData", "consent"] as const).map((field) => (
          <div className="ask-consent-field" key={field}>
            <label className={`ask-consent${errors[field] ? " is-invalid" : ""}`}>
              <input
                id={fieldId(field)} type="checkbox" name={field} required
                aria-invalid={Boolean(errors[field])} aria-describedby={describedBy(field)}
                onChange={() => clearError(field)}
              />
              <span>{t[field]}</span>
            </label>
            {fieldError(field)}
          </div>
        ))}

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
