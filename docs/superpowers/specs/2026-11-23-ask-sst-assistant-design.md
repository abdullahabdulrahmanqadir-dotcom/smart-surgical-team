# Ask SST — a free AI assistant grounded in the team's own material

**Status:** proposal, awaiting the owner's approval. Nothing here is built.
**Date:** 2026-11-23
**Reference:** the "Ask TOSIC" assistant on tosicollaborative.org (the site the
November editorial redesign was benchmarked against). Patterns only; none of
its copy, code or branding.

## 1. What we are building

A box on the contact page with three tabs, in the order a visitor needs them:

| Tab | What happens |
|---|---|
| **Ask the AI** (default) | An instant answer, written only from material the team has approved, in the visitor's language, with numbered links to the pages it used. |
| **Ask our team** | The existing question form, unchanged. A person replies by WhatsApp or email. |
| **Email** | `mailto:` the team address. |

The AI never replaces the team: every answer ends with a one-tap route to
"Ask our team", and every refusal or failure lands there too.

## 2. Why it can be free

| Piece | Service | Free allowance (checked 2026-11-23) |
|---|---|---|
| Writing the answer | Cloudflare Workers AI, bound to the existing Worker `smart` | 10,000 Neurons per day on Workers Free; resets 00:00 UTC (03:00 Baghdad). Over quota, calls fail; nothing is charged. |
| Finding the right passages | Cloudflare Vectorize | 30M queried and 5M stored vector dimensions a month |
| Turning text into searchable vectors | Workers AI `@cf/baai/bge-m3` (multilingual) | ~1,075 Neurons per million tokens, negligible per question |
| Bot check | Turnstile (already on the forms) | free |

No API key is shipped and no card is needed. Cloudflare states it does not use
Workers AI inputs or outputs to train models.

**Capacity.** One answer is about 3k tokens of passages in and 400 tokens out.
On the free quota that is roughly:

| Candidate model (free plan) | Answers per day |
|---|---|
| `@cf/qwen/qwen3-30b-a3b-fp8` | ~380 |
| `@cf/google/gemma-4-26b-a4b-it` | ~260 |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | ~95 |
| `@cf/openai/gpt-oss-120b` | ~80 |

The model is chosen in Phase 0 by measured answer quality in Arabic and
English, not by capacity. Cloudflare's managed "AI Search" was considered and
rejected: its free plan allows about 1,000 queries a month (~33 a day).

## 3. The rule it must not break

PRODUCT.md: *publish only what the team can stand behind.* An AI that answers
from general medical knowledge breaks that rule. So:

1. **It answers only from the Answer Pack** (section 4): team-approved
   entries. It is told to say "I can't answer that from our material" rather
   than fill the gap, and the server enforces it: if no passage scores above a
   threshold, the model is not called at all and the visitor gets the
   "Ask our team" route.
2. **Every answer shows its sources.** No sources, no answer.
3. **Red flags skip the AI.** A keyword list in English and Arabic (bleeding
   after surgery, can't breathe, neck swelling after thyroidectomy, tingling
   lips/cramps after parathyroid or thyroid surgery, etc. — wording to be
   approved by a surgeon) returns the emergency notice and **122** immediately.
4. **No personal medicine.** It declines diagnosis, reading results, and
   dosing, and says why, in the same words the current form uses ("what we
   can't answer online").
5. **Visible disclaimer** above the box, matching TOSIC's level: general
   information, not a diagnosis, do not type personal details.

## 4. The Answer Pack — the real prerequisite

Today the site has almost nothing written *for patients*: research abstracts
and case pages are written for surgeons. Grounding a patient assistant on
abstracts would produce technical, unhelpful answers.

**Proposal:** a new Admin-editable collection, *Answer Pack*: short
question-and-answer entries (EN + AR), each with an approving surgeon and a
"published" switch. Sources for the first batch:

- the questions patients already send through the form and the team's replies
  (with identifying details removed, and only with the replying surgeon's
  sign-off);
- plain-language versions of the topic pages (thyroid nodules, thyroidectomy,
  parathyroid, breast, head and neck);
- "before / after surgery" guidance the team already gives verbally.

Target for launch: **30–40 entries per language.** Research abstracts and case
pages are indexed too, but only as *further reading* links, never as the basis
of a patient answer.

Arabic entries are reviewed by a native reader before they are published.
Sorani Kurdish is **out of scope**: the answer is given in Arabic or English
with a line saying Kurdish is not supported yet.

## 5. How it works

```
Visitor question
  → /api/ask (POST, Worker)
      1. size + Turnstile + rate limit          (cheap refusals first)
      2. red-flag check                          → emergency notice, stop
      3. embed question (bge-m3)
      4. Vectorize: top 5 Answer Pack passages   → below threshold? "Ask our team", stop
      5. Workers AI model, system prompt + passages + last 2 turns
      6. return { answer, sources[] }
  ← rendered with numbered source links
```

- **Indexing** runs when an Answer Pack entry is saved or unpublished in the
  Admin, and from a one-off script for the first load. Never per visitor.
- **Worker CPU:** the AI and Vectorize calls are network waits, not CPU, so
  the free CPU limit that caused the August outage is not at risk. Measured
  in Phase 1 before launch.
- **Caching:** `/api/ask` is a POST with `no-store`. The contact page stays a
  cached, code-defined page; the box is a client component. The page-cache
  whitelist (`page-cache.ts`, `sw.js`) does not change.
- **Quota exhaustion:** a global daily cap set just under the free quota, plus
  handling of Workers AI's out-of-quota error. Either way the tab says the
  assistant is resting until tomorrow and opens "Ask our team".
- **Rate limits:** per hashed IP (e.g. 5 a minute, 30 a day) plus a site-wide
  daily cap. Counters hold only the IP hash and a timestamp, never the
  question.

## 6. Privacy

Default: **questions and answers are not stored.** Only counters (hashed IP,
time) are kept for rate limiting. The privacy policy and terms gain a short
section naming Cloudflare Workers AI as the processor and stating that.

Optional (owner's decision): keep anonymised question + answer + sources for
30 days so the team can spot wrong answers and gaps in the Answer Pack.

## 7. Phases

Each phase stops for review; nothing reaches the live site until Phase 3.

| Phase | Work | Touches the site? |
|---|---|---|
| **0. Content and model trial** | Draft the first Answer Pack entries with the team. Build a 40-question test set (20 EN, 20 AR, including red-flag, out-of-scope and "personal results" questions). Run it against the four candidate models through the Workers AI REST API. A native Arabic reader and a surgeon grade the answers; pick the model or stop. | No |
| **1. Backend behind a switch** | Migration `0028_answer_pack` (table + RLS), Admin editor, indexing, `AI` and `VECTORIZE` bindings, `/api/ask`, guardrails, limits, tests. Feature flag `ASK_AI_ENABLED` off. | Deployed, invisible |
| **2. The three-tab box** | Contact page UI: tabs, starter questions, "Reading our material…" state, sources list, quota and refusal states, RTL, dark mode, keyboard, screen-reader announcements. | Behind the flag |
| **3. Launch** | Privacy/terms update, surgeon sign-off on the red-flag list and disclaimer, flag on, watch quota and refusals for two weeks. | Yes |

## 8. Rollback

Turn `ASK_AI_ENABLED` off: the tabs disappear and the contact page is exactly
as it is today. Full removal is a revert of the Phase 1–2 commits plus
dropping the two bindings; the Answer Pack table can stay, since it is also
useful as a public FAQ.

## 9. Decisions for the owner

1. **Approve the approach** (Workers AI + Vectorize, free tier, behind a flag).
2. **Who writes and signs off the Answer Pack**, and in what order of topics.
3. **Store anonymised Q&A for 30 days for review, or store nothing?**
4. **Breast questions:** the question form already accepts them; should the AI
   answer them too, or only thyroid, parathyroid and head and neck?
5. **If the free quota proves too small** after launch, cap it (default) or
   move to Workers Paid ($5/month plus usage)?

## Sources

- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Models that need Workers Paid: https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
- Vectorize pricing: https://developers.cloudflare.com/vectorize/platform/pricing/
- AI Search limits: https://developers.cloudflare.com/ai-search/platform/limits-pricing
- Workers AI privacy: https://developers.cloudflare.com/workers-ai/privacy/
