"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile, the bot check in front of every authentication form.
 *
 * Supabase does the verification: with CAPTCHA protection switched on in the
 * dashboard it rejects any `signUp`, `signInWithPassword`, `resend` or
 * `resetPasswordForEmail` that does not carry a valid `captchaToken`. All this
 * component does is obtain that token.
 *
 * When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset the hook reports itself as not
 * required and hands back `undefined` tokens.
 *
 * **That fallback is no longer safe on its own, and it is why it shouts.** It
 * was written when Supabase's CAPTCHA toggle was off, so a keyless build simply
 * skipped the check and still signed people in. With the toggle on, Supabase
 * rejects every tokenless `signUp`, `signInWithPassword`, `resend` and
 * `resetPasswordForEmail`, so a keyless build cannot sign anyone in at all — it
 * just fails with an error the member cannot act on. The fallback is kept
 * because a local checkout without keys should still render, but a build that
 * reaches a browser without a key is broken, and the console says so.
 *
 * This has bitten production once: a Cloudflare Workers Build deployed from a
 * push, without the `.env.local` that holds the key, and sign-in died silently.
 * The key now lives in the Worker's build variables too. See
 * docs/auth-protection.md.
 */

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Long enough for a slow network, short enough that a member is not left staring. */
const TOKEN_TIMEOUT_MS = 12_000;

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | undefined;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      // appendChild rather than append: the Workers type definitions in this
      // project shadow `append` with the streaming-body overload.
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
}

/** Warned once per page, not once per form, so three forms do not shout thrice. */
let warnedAboutMissingKey = false;

function warnIfUnconfigured(siteKey: string): void {
  if (siteKey || warnedAboutMissingKey || typeof console === "undefined") return;
  warnedAboutMissingKey = true;
  console.error(
    "[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing from this build, so no captcha token can be obtained. " +
      "If Supabase has CAPTCHA protection enabled, sign-in, sign-up, code resend and password reset will all fail. " +
      "The value is inlined at build time: set it in .env.local locally, and in the Worker's build variables for a Workers Build.",
  );
}

export type TurnstileHandle = {
  /** Whether a key is configured at all; false means every token is `undefined`. */
  required: boolean;
  /** Render this where the check should appear — an empty fragment when unconfigured. */
  widget: React.ReactNode;
  /**
   * Resolves with a single-use token, or `undefined` when Turnstile is not
   * configured. Throws only when it is configured and no token arrives in time.
   */
  getToken: () => Promise<string | undefined>;
  /** Tokens burn on use, so call this after every submit that failed. */
  reset: () => void;
};

export function useTurnstile(locale: string): TurnstileHandle {
  const siteKey = turnstileSiteKey();
  const required = Boolean(siteKey);
  const container = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const token = useRef<string | undefined>(undefined);
  // Submits that arrived before the token did, waiting to be released by the
  // widget's callback rather than failing outright.
  const waiting = useRef<((value: string | undefined) => void)[]>([]);
  const [failed, setFailed] = useState(false);

  const settle = useCallback((value: string | undefined) => {
    token.current = value;
    if (value) {
      waiting.current.splice(0).forEach((resolve) => resolve(value));
    }
  }, []);

  // Before the early return below, so a keyless build still says so.
  useEffect(() => warnIfUnconfigured(siteKey), [siteKey]);

  useEffect(() => {
    if (!required) return;
    let cancelled = false;

    void loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: siteKey,
          // Stays out of the way unless Cloudflare actually wants an interaction.
          appearance: "interaction-only",
          // When it does appear it should look like part of the form rather than
          // a 300px island: flexible fills the slot's width.
          size: "flexible",
          language: locale === "ar" ? "ar" : "en",
          theme: "auto",
          callback: (value: string) => settle(value),
          // A token lives about five minutes. Registration is a four-step
          // wizard, so one can easily go stale before the member reaches the
          // submit that needs it — ask for a fresh one straight away.
          "expired-callback": () => {
            settle(undefined);
            if (widgetId.current) window.turnstile?.reset(widgetId.current);
          },
          "timeout-callback": () => settle(undefined),
          "error-callback": () => {
            settle(undefined);
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      const id = widgetId.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* Already gone with the unmounted DOM. */
        }
      }
      widgetId.current = undefined;
    };
  }, [locale, required, settle, siteKey]);

  const reset = useCallback(() => {
    token.current = undefined;
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  const getToken = useCallback(async () => {
    if (!required) return undefined;
    if (token.current) return token.current;
    // The script itself failed to load — an ad blocker, or Cloudflare being
    // unreachable. Better to say so than to submit a request Supabase will
    // reject with a message that means nothing to the member.
    if (failed) throw new Error("turnstile-unavailable");

    return new Promise<string | undefined>((resolve, reject) => {
      waiting.current.push(resolve);
      setTimeout(() => {
        const index = waiting.current.indexOf(resolve);
        if (index === -1) return;
        waiting.current.splice(index, 1);
        reject(new Error("turnstile-unavailable"));
      }, TOKEN_TIMEOUT_MS);
    });
  }, [failed, required]);

  const widget = required ? <div className="turnstile-slot" ref={container} /> : null;

  return { required, widget, getToken, reset };
}

/** True for the error `getToken` throws, so callers can show their own copy. */
export function isTurnstileUnavailable(error: unknown): boolean {
  return error instanceof Error && error.message === "turnstile-unavailable";
}
