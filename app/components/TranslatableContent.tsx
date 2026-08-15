"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps database-authored English prose on an Arabic page.
 *
 * Three mechanisms, deliberately layered, because no single one covers every
 * browser:
 *
 *  1. Markup. The layout sets translate="no" on <body> for /ar so a browser
 *     page-translate cannot re-translate the already-correct Arabic interface.
 *     This wrapper opts its subtree back in with translate="yes" and lang="en",
 *     which is also what tells the browser the content is foreign in the first
 *     place. Works in every browser, including mobile, and needs no JS.
 *
 *  2. The on-device Translator API (Chrome 138+/Edge 148+). Where
 *     available it powers the button below, translating in place with no network
 *     round-trip and no API key.
 *
 *  3. A same-origin server fallback for mobile browsers and other clients that
 *     do not expose the Translator API. This keeps the same in-place experience
 *     on phones instead of silently leaving the prose in English.
 *
 * The API translates strings, not markup, so this walks text nodes and rewrites
 * them individually — passing the sanitized HTML through wholesale would mangle
 * the tags.
 */

type Phase = "idle" | "checking" | "downloading" | "translating" | "done" | "error";

type TranslatorLike = { translate: (input: string) => Promise<string> };
type TranslatorCtor = {
  availability: (opts: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (opts: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }) => Promise<TranslatorLike>;
};

type TranslationResponse = { translations?: unknown };

function translatorApi(): TranslatorCtor | undefined {
  return (globalThis as unknown as { Translator?: TranslatorCtor }).Translator;
}

/** Every non-empty text node under `root`, skipping script/style. */
function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      const tag = node.parentElement?.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const found: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) found.push(n as Text);
  return found;
}

function preserveOuterWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

async function translateOnServer(texts: string[]): Promise<string[]> {
  const batches: string[][] = [];
  for (const text of texts) {
    const current = batches.at(-1);
    const currentLength = current?.reduce((total, item) => total + item.length, 0) ?? 0;
    if (!current || current.length >= 20 || currentLength + text.length > 14_000) batches.push([text]);
    else current.push(text);
  }

  const translations: string[] = [];
  for (const batch of batches) {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts: batch }),
    });
    if (!response.ok) throw new Error("Server translation failed");

    const payload = await response.json() as TranslationResponse;
    if (
      !Array.isArray(payload.translations) ||
      payload.translations.length !== batch.length ||
      payload.translations.some((value) => typeof value !== "string")
    ) {
      throw new Error("Invalid server translation response");
    }
    translations.push(...payload.translations as string[]);
  }
  return translations;
}

export default function TranslatableContent({
  children,
  locale,
  labels,
  autoTranslate = false,
  className,
}: {
  children: React.ReactNode;
  locale: string;
  labels: { translate: string; translating: string; downloading: string; showOriginal: string; failed: string };
  autoTranslate?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const originals = useRef<Map<Text, string> | null>(null);
  const autoStarted = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const supported = locale === "ar";

  // Translation is available on every Arabic page: the native API is preferred
  // when present, and the same-origin route covers mobile browsers.
  useEffect(() => {
    if (locale !== "ar") return;
    if (autoTranslate && !autoStarted.current) {
      autoStarted.current = true;
      void translate();
    }
  }, [autoTranslate, locale]);

  async function translate() {
    const host = hostRef.current;
    if (!host) return;

    try {
      setPhase("checking");
      const nodes = textNodes(host);
      if (!originals.current) {
        originals.current = new Map(nodes.map((n) => [n, n.nodeValue ?? ""]));
      }

      const sources = nodes.map((node) => originals.current?.get(node) ?? node.nodeValue ?? "");
      const trimmed = sources.map((source) => source.trim());
      let translations: string[] | undefined;
      const api = translatorApi();

      if (api) {
        try {
          const availability = await api.availability({ sourceLanguage: "en", targetLanguage: "ar" });
          if (availability !== "unavailable") {
            const translator = await api.create({
              sourceLanguage: "en",
              targetLanguage: "ar",
              // First use may pull the model down; surface that rather than looking hung.
              monitor: (m) => m.addEventListener("downloadprogress", () => setPhase("downloading")),
            });
            setPhase("translating");
            translations = [];
            for (const source of trimmed) translations.push(await translator.translate(source));
          }
        } catch {
          // The native model can fail to download. Continue with the mobile-safe
          // server path instead of turning that into a visible failure.
        }
      }

      setPhase("translating");
      translations ??= await translateOnServer(trimmed);
      nodes.forEach((node, index) => {
        node.nodeValue = preserveOuterWhitespace(sources[index], translations[index]);
      });
      host.setAttribute("lang", "ar");
      host.setAttribute("dir", "rtl");
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }

  function restore() {
    const host = hostRef.current;
    if (!host || !originals.current) return;
    for (const [node, value] of originals.current) node.nodeValue = value;
    host.setAttribute("lang", "en");
    host.setAttribute("dir", "ltr");
    setPhase("idle");
  }

  const busy = phase === "checking" || phase === "downloading" || phase === "translating";

  return (
    <>
      {supported && !autoTranslate ? (
        <div className="case-translate" translate="no">
          <button
            type="button"
            className="case-translate-button"
            onClick={phase === "done" ? restore : translate}
            disabled={busy}
            aria-live="polite"
          >
            {phase === "done"
              ? labels.showOriginal
              : phase === "downloading"
                ? labels.downloading
                : busy
                  ? labels.translating
                  : labels.translate}
          </button>
          {phase === "error" ? <span className="case-translate-error">{labels.failed}</span> : null}
        </div>
      ) : autoTranslate && phase === "error" ? <span className="case-translate-error" translate="no">{labels.failed}</span> : null}

      {/* lang marks the prose as English so a browser page-translate recognises
          it; translate="yes" re-enables translation inside the /ar opt-out. */}
      <div ref={hostRef} className={className} lang="en" translate="yes">
        {children}
      </div>
    </>
  );
}
