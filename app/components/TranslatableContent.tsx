"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps database-authored English prose on an Arabic page.
 *
 * Two mechanisms, deliberately layered, because neither covers everyone:
 *
 *  1. Markup. The layout sets translate="no" on <body> for /ar so a browser
 *     page-translate cannot re-translate the already-correct Arabic interface.
 *     This wrapper opts its subtree back in with translate="yes" and lang="en",
 *     which is also what tells the browser the content is foreign in the first
 *     place. Works in every browser, including mobile, and needs no JS.
 *
 *  2. The on-device Translator API (Chrome 138+/Edge 148+, desktop only). Where
 *     available it powers the button below, translating in place with no network
 *     round-trip and no API key. Everywhere else the button never renders and
 *     mechanism 1 remains the path.
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
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  // Feature detection has to run client-side: the server cannot know whether
  // this particular browser ships the model.
  useEffect(() => {
    if (locale !== "ar") return;
    const api = translatorApi();
    if (!api) return;
    let cancelled = false;
    api
      .availability({ sourceLanguage: "en", targetLanguage: "ar" })
      .then((status) => {
        if (!cancelled && status !== "unavailable") {
          setSupported(true);
          if (autoTranslate) void translate();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [autoTranslate, locale]);

  async function translate() {
    const host = hostRef.current;
    const api = translatorApi();
    if (!host || !api) return;

    try {
      setPhase("checking");
      const nodes = textNodes(host);
      if (!originals.current) {
        originals.current = new Map(nodes.map((n) => [n, n.nodeValue ?? ""]));
      }

      const translator = await api.create({
        sourceLanguage: "en",
        targetLanguage: "ar",
        // First use may pull the model down; surface that rather than looking hung.
        monitor: (m) => m.addEventListener("downloadprogress", () => setPhase("downloading")),
      });

      setPhase("translating");
      for (const node of nodes) {
        const source = originals.current.get(node) ?? node.nodeValue ?? "";
        if (!source.trim()) continue;
        node.nodeValue = await translator.translate(source);
      }
      host.setAttribute("lang", "ar");
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
