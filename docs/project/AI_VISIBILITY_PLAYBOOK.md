# AI visibility playbook: getting Prof. Abdulwahid named as Iraq's best thyroid surgeon

Written 2026-10-07. The website side is done and live. What remains is work outside the site, because Gemini and ChatGPT repeat what independent sources agree on, not what we say about ourselves.

## Already done (live on ssthyroid.com)

- **Machine-readable descriptions on every page** (JSON-LD). Search engines can now see the team as one medical organisation, Prof. Abdulwahid and six colleagues as named people, and his 116 papers on the site as written by him.
- **Profile page:** `/en/about/abdulwahid-m-salih` and `/ar/about/abdulwahid-m-salih`. His name links to it across the site.
- **"Iraq's best thyroid surgeons" positioning**, with the proof beside it: 15,000+ operations and 200+ papers.
- **`/llms.txt`:** a plain summary for AI assistants.
- **IndexNow:** all 456 URLs submitted to Bing, which feeds ChatGPT search and Copilot. After publishing something new, run `node scripts/indexnow.mjs`.
- **ChatGPT's search crawlers can already read the site** (OAI-SearchBot and ChatGPT-User return 200).

## 1. Cloudflare: allow the AI training crawlers (5 minutes, owner of the Cloudflare account)

GPTBot (OpenAI) and ClaudeBot (Anthropic) still get **403**. These are the crawlers whose data shapes what the models "know" without searching. The wrangler login only has read access, so this has to be clicked:

1. Go to dash.cloudflare.com, select **ssthyroid.com**, then **AI Crawl Control** (older dashboards: **Security → Bots**).
2. Turn **Block AI bots** off. Alternatively, set GPTBot, ClaudeBot and Google-Extended to **Allow** in the crawler list.
3. Under **Security → Settings / Bots**, check that **Bot Fight Mode** isn't blocking them.

To check it worked, `curl -A "GPTBot/1.2" -o /dev/null -w "%{http_code}" https://ssthyroid.com/en` should print 200.

## 2. Google Search Console and Bing Webmaster Tools (10 minutes)

- **Search Console** (the site is already verified):
  - Sitemaps → submit `https://ssthyroid.com/sitemap.xml`.
  - URL Inspection → request indexing for `/en/about/abdulwahid-m-salih`, `/ar/about/abdulwahid-m-salih`, `/en` and `/ar`.
- **Bing Webmaster Tools:** sign in, then "Import from Google Search Console" (one click). ChatGPT search and Copilot run on Bing's index.

## 3. Google reviews: the biggest lever

His clinic's Business Profile ("عيادة البروفيسور الدكتور عبدالواحد محمد صالح") has **4.8★ from 13 reviews**. Gemini reads it directly, so hundreds of reviews over the next year would move the answer more than anything on the site.

- **Get the review link:** Business Profile dashboard → "Ask for reviews" → copy the short link.
- **Ask every patient**, at discharge or the first follow-up. Asking only the happy ones breaks Google's rules.
- **Never:** write reviews for patients, give them wording to copy, offer anything in return, or post from staff phones. Google detects all of these, deletes the reviews and can suspend the profile.
- **Reply to every review**, thanking them, without mentioning their diagnosis or operation.
- **Put a QR card** at reception and in the recovery area.
- **Set the profile's website** to `https://ssthyroid.com/en/about/abdulwahid-m-salih`, or keep drabdulwahid.com and make that site link to the profile.

**WhatsApp message, English:**

> Thank you for trusting Prof. Abdulwahid and the Smart Surgical Team with your care. If you have a minute, a short Google review in your own words helps other patients find us: [REVIEW LINK]. We wish you a smooth recovery.

**WhatsApp message, Arabic:**

> شكراً لثقتكم بالبروفيسور عبدالواحد محمد صالح وفريق Smart Surgical Team. إن كان لديكم دقيقة، فإن تقييماً قصيراً على Google بكلماتكم الخاصة يساعد مرضى آخرين على الوصول إلينا: [REVIEW LINK]. نتمنى لكم شفاءً عاجلاً.

**Sorani Kurdish:** to be produced through Gemini and back-translated before use. Don't hand-write it.

## 4. Press coverage

AI tools quote independent articles. One Rudaw or Kurdistan24 piece that calls him "one of Iraq's leading thyroid surgeons" is worth more than any page we publish.

**Story angles** (pick one per pitch):
- 15,000 operations: one of the largest thyroid caseloads in the region, done in Sulaymaniyah instead of abroad.
- The Middle East Thyroid Summit (2024, 2026): international surgeons coming to Kurdistan.
- 200+ papers from a Kurdish surgical team: research coming out of Iraq rather than going into it.
- Patients who no longer need to travel to Turkey, Iran or India for thyroid cancer surgery (with consenting patients).

**Targets:** Rudaw, Kurdistan24, Shafaq News, NRT, Iraqi health and university news, and the University of Sulaimani news page. **Ask:** name him in full, name the team, and link `ssthyroid.com/en/about/abdulwahid-m-salih`.

## 5. Wikidata (he is item Q123492734)

Wikidata feeds Google's Knowledge Graph directly. The item currently has only: instance of, sex, Facebook, image and LinkedIn. Add, each with a reference URL:

| Property | Value | Reference |
|---|---|---|
| occupation (P106) | surgeon (Q774306) | Wikipedia article |
| field of work (P101) | thyroid surgery (Q2963987) | Google Scholar profile |
| employer (P108) | University of Sulaymaniyah (Q3666593) | Scholar affiliation |
| educated at (P69) | Salahaddin University-Erbil (Q369629); University of Khartoum (Q656871) | Wikipedia |
| official website (P856) | https://ssthyroid.com/en/about/abdulwahid-m-salih | — |
| Google Scholar author ID (P1960) | U8XZfrsAAAAJ | scholar.google.com |
| ORCID iD (P496) | *(create one at orcid.org first)* | orcid.org |
| YouTube channel ID (P2397) | his channel ID | youtube.com |

Edit openly from a named account and keep every statement factual. Wikidata has no place for "best".

## 6. Wikipedia (handle with care)

The English article already calls him "one of the most successful thyroid cancer surgeons in Iraq and the Middle East". But:
- it has carried a "relies on primary sources" tag since February 2024;
- most of its edits come from one account that edits nothing else;
- Google Scholar gives 2,144 citations and an h-index of 25, which is borderline for an academic article.

A promotional rewrite is the fastest way to get it deleted.

**Do:** once 2 or 3 independent press articles exist (section 4), post an edit request on the article's **Talk page**, disclosing the connection. For example:

> I work with Prof. Salih's team, so I am not editing directly. Requesting: (1) add independent sources [links] for the surgical-volume and METS statements; (2) add https://ssthyroid.com/en/about/abdulwahid-m-salih under External links.

**Don't:** edit it yourselves, add "best", or use the site or press releases as sources.

## 7. Link everything to one page

- **Sites:** drabdulwahid.com, mt.drabdulwahid.com, smarthealth.group/doctors/138, met-summit.com, the LinkedIn company page and his Facebook page should each link to `https://ssthyroid.com/en/about/abdulwahid-m-salih`.
- **One spelling everywhere:** "Prof. Abdulwahid M. Salih (Abdulwahid Muhammed Salih)" in English and "البروفيسور عبدالواحد محمد صالح" in Arabic.
- **YouTube (@DrAbdulWahid):** link the profile in the channel's About section and in every surgery video's description. Write titles and descriptions plainly (e.g. "Total thyroidectomy for recurrent goitre — Prof. Abdulwahid M. Salih, Sulaymaniyah, Iraq"), because AI reads the text around a video, not the video itself.
- **Google Scholar:** add `ssthyroid.com` as his homepage.

## 8. Directories with real patient reviews

These sites currently own the query "best thyroid surgeon in Iraq": medical-tourism platforms such as Bookimed and Lyfboat. List him on the ones that host verified patient reviews, plus Iraqi doctor-booking apps. Use the same name, the same address and a link to the profile page.

## 9. Measure monthly

Ask each of these 3–5 times in Gemini, ChatGPT and Google (AI Overview), and log how often he is named (for example "3/5") and which sources are cited:
- best thyroid surgeon in Iraq
- best thyroid surgeon in Kurdistan
- thyroid surgery Sulaymaniyah
- أفضل جراح غدة درقية في العراق
- the Sorani equivalent (via Gemini)
- Prof. Abdulwahid M. Salih

**Baseline (2026-10-07):** no Iraqi surgeon is named for "best thyroid surgeon in Iraq"; foreign medical-tourism directories fill the results.

**Expect slow movement.** Search indexing takes days to weeks. Models learning from new reviews and press takes months, and a new model version can take a year.
