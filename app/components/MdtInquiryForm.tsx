"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from "react";
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
import FilterSelect from "./FilterSelect";
import { IconArrowRight, IconCheck, IconMail, IconPhone } from "./icons";
import MdtWriteText from "./MdtWriteText";
import { isTurnstileUnavailable, useTurnstile } from "./Turnstile";

type MdtCopy = Dictionary["mdt"];
type Errors = Partial<Record<MdtField, MdtFieldError>>;

/** Field order, so focus lands on the first problem as the visitor reads it. */
const FIELD_ORDER: MdtField[] = [
  "name", "role", "institution", "country", "email", "phone", "interest", "message",
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
  }
}

function subscribeMotionPreference(callback: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getMotionAllowed(): boolean {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerMotionAllowed(): boolean {
  return false;
}

export default function MdtInquiryForm({ locale, t }: { locale: Locale; t: MdtCopy }) {
  const id = useId();
  const cardRef = useRef<HTMLElement>(null);
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
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("");
  const [interest, setInterest] = useState("");
  const canAnimate = useSyncExternalStore(
    subscribeMotionPreference,
    getMotionAllowed,
    getServerMotionAllowed,
  );
  const [formWritten, setFormWritten] = useState(false);
  const countries = useMemo(() => countryOptions(locale), [locale]);

  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!canAnimate || formWritten) return;
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setFormWritten(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const bounds = node.getBoundingClientRect();
    if (bounds.top < window.innerHeight * 0.94 && bounds.bottom > 0) {
      let inner = 0;
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => setFormWritten(true));
      });
      return () => {
        window.cancelAnimationFrame(outer);
        window.cancelAnimationFrame(inner);
      };
    }

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setFormWritten(true);
      observer.disconnect();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal();
      },
      { rootMargin: "0px 0px -6%", threshold: 0.06 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [canAnimate, formWritten]);

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
        <h2 id={fieldId("sent")} ref={sentHeading} tabIndex={-1}>
          <MdtWriteText text={t.sentTitle} immediate delayMs={60} stepMs={65} wordDurationMs={340} cursor />
        </h2>
        <p>
          <MdtWriteText text={t.sentBody} immediate delayMs={260} stepMs={26} wordDurationMs={280} />
        </p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => { setSent(false); setMessageLength(0); setRole(""); setCountry(""); setInterest(""); loadedAt.current = Date.now(); }}
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
  const sectionStyle = (index: number) => ({ "--section": index }) as CSSProperties;
  const cardMotionClass = !canAnimate ? "" : formWritten ? " is-written" : " is-armed";

  return (
    <section ref={cardRef} className={`ask-card mdt-form-card${cardMotionClass}`} aria-labelledby={fieldId("title")}>
      <h2 id={fieldId("title")} className="ask-card-title">
        <MdtWriteText text={t.formTitle} delayMs={60} stepMs={75} wordDurationMs={380} cursor />
      </h2>
      <form ref={formRef} className="ask-form" noValidate onSubmit={handleSubmit}>
        <div className="ask-form-pair mdt-form-section" style={sectionStyle(0)}>
          <div className="form-field">
            <label htmlFor={fieldId("name")}>{t.name} {required}</label>
            <div className={`field-control is-plain${errors.name ? " is-invalid" : ""}`}>
              <input
                id={fieldId("name")} name="name" type="text" autoComplete="name" required
                maxLength={MDT_LIMITS.nameMax} aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy("name")} onInput={() => clearError("name")}
              />
            </div>
            {fieldError("name")}
          </div>

          {/* The site's own styled listbox rather than a native select, as on
              /ask: the open native list follows the OS and clashed with the page. */}
          <div className="form-field ask-select">
            <FilterSelect
              id={fieldId("role")}
              label={<>{t.role} {required}</>}
              value={role}
              options={[{ value: "", label: t.rolePlaceholder }, ...MDT_ROLES.map((value) => ({ value, label: t[ROLE_LABEL[value]] }))]}
              onChange={(value) => { setRole(value); clearError("role"); }}
              invalid={Boolean(errors.role)}
              describedBy={describedBy("role")}
              hidePlaceholder
            />
            <input type="hidden" name="role" value={role} />
            {fieldError("role")}
          </div>
        </div>

        <div className="ask-form-pair mdt-form-section" style={sectionStyle(1)}>
          <div className="form-field">
            <label htmlFor={fieldId("institution")}>{t.institution} {required}</label>
            <div className={`field-control is-plain${errors.institution ? " is-invalid" : ""}`}>
              <input
                id={fieldId("institution")} name="institution" type="text" autoComplete="organization" required
                maxLength={MDT_LIMITS.institutionMax} aria-invalid={Boolean(errors.institution)}
                aria-describedby={describedBy("institution")} onInput={() => clearError("institution")}
              />
            </div>
            {fieldError("institution")}
          </div>

          <div className="form-field ask-select">
            <FilterSelect
              id={fieldId("country")}
              label={<>{t.country} {required}</>}
              value={country}
              options={[{ value: "", label: t.countryPlaceholder }, ...countries]}
              onChange={(value) => { setCountry(value); clearError("country"); }}
              invalid={Boolean(errors.country)}
              describedBy={describedBy("country")}
              hidePlaceholder
            />
            <input type="hidden" name="country" value={country} />
            {fieldError("country")}
          </div>
        </div>

        <div className="ask-form-pair mdt-form-section" style={sectionStyle(2)}>
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

        <div className="form-field ask-select mdt-form-section" style={sectionStyle(3)}>
          <FilterSelect
            id={fieldId("interest")}
            label={<>{t.interest} {required}</>}
            value={interest}
            options={[{ value: "", label: t.interestPlaceholder }, ...MDT_INTERESTS.map((value) => ({ value, label: t[INTEREST_LABEL[value]] }))]}
            onChange={(value) => { setInterest(value); clearError("interest"); }}
            invalid={Boolean(errors.interest)}
            describedBy={describedBy("interest")}
            hidePlaceholder
          />
          <input type="hidden" name="interest" value={interest} />
          {fieldError("interest")}
        </div>

        <div className="form-field mdt-form-section" style={sectionStyle(4)}>
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

        {/* Honeypot: hidden from people and from assistive technology. */}
        <div className="ask-trap" aria-hidden="true">
          <label htmlFor={fieldId("website")}>Website</label>
          <input id={fieldId("website")} name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {turnstile.widget}
        {formError && <p className="form-message is-error" role="alert">{formError}</p>}

        <button className="btn btn-primary ask-submit mdt-form-section" style={sectionStyle(5)} type="submit" disabled={sending} aria-busy={sending}>
          {sending ? t.sending : <>{t.submit}<IconArrowRight size={17} /></>}
        </button>
      </form>
    </section>
  );
}
