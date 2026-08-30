/**
 * 301s for the URLs of the old ssthyroid.com site.
 *
 * Until the 2026-08-30 nameserver cutover those URLs were answered by
 * Hostinger; now every one of them reaches this Worker, which has no page at
 * those paths. Without this map all 94 of them 404, and the search ranking the
 * old pages had accumulated is lost rather than passed to the new URLs.
 *
 * Keys are the old path with no leading slash — the old site was flat, every
 * public URL was `https://www.ssthyroid.com/<slug>`. Values are the new path
 * *after* the locale segment; "" means the locale home page.
 *
 * Built from `scratch/old/content/_index.json` (81 posts + 12 pages) plus
 * `/gallery`, matched against the live sitemap. Most posts kept their slug
 * through the import; the rest lost a `-copy` suffix, were truncated by the
 * new slugger, or were renamed. Four old posts have no counterpart on the new
 * site and point at the nearest section instead.
 */
const LEGACY_PATHS: Record<string, string> = {
  "48-years-old-female-complain-of-neck-swelling": "library/48-year-old-female-with-neck-swelling",
  "a-46-year-old-female-presented-with-a-3-month-history-of-anterior-neck-swelling-copy-copy": "library/a-46-year-old-female-presented-with-a-3-month-history-of-anterior-neck-swelling",
  "about": "about",
  "about-us": "about",
  "activity": "events",
  "acute-suppurative-thyroiditis-progressing-to-a-thyroid-abscess": "library/acute-suppurative-thyroiditis-progressing-to-a-thyroid-abscess",
  "agenesis-of-thyroid-gland": "library/agenesis-of-thyroid-gland",
  "anaplastic-thyroid-carcinoma-with-high-grade-papillary-components-in-a-72-year-old-female": "library/anaplastic-thyroid-carcinoma-with-high-grade-papillary-components-in-a-72-year-old-female",
  "anaplastic-thyroid-carcinoma-with-squamous-cell-carcinoma-component": "library/anaplastic-thyroid-carcinoma-with-squamous-cell-carcinoma-component",
  "anterior-neck-swelling-in-a-3-year-old-female": "library/anterior-neck-swelling-in-a-3-year-old-female",
  "asymptomatic-thyroglossal-duct-cyst-in-a-20-years-old-male": "library/asymptomatic-thyroglossal-duct-cyst-in-a-20-years-old-male",
  "benign-oncocytic-neoplasm-of-the-right-parotid-gland-in-a-45-year-old-male-copy": "library/benign-oncocytic-neoplasm-of-the-right-parotid-gland-in-a-45-year-old-male",
  "contact": "contact",
  "cystic-nodule-with-multinodular-goiter-and-branchial-cleft-cyst": "library/cystic-nodule-with-multinodular-goiter-and-branchial-cleft-cyst",
  "dermatofibrosarcoma-protuberans-5-times-recurrence-a-case-report-of-a-61-years-old-male-copy": "library/dermatofibrosarcoma-protuberans-5-times-recurrence-a-case-report-of-a-61-years-old-male",
  "dermoid-cyst-with-inflammation-in-a-21-year-old-male": "library/dermoid-cyst-with-inflammation-in-a-21-year-old-male",
  "ectopic-thyroid-tissue-in-a-35-year-old-female": "library/ectopic-thyroid-tissue-in-a-35-year-old-female",
  "ectopic-thyroid-tissue-radiology": "library/ectopic-thyroid-tissue-radiology",
  "elevated-thyroglobulin-in-postoperative-follow-up-of-metastatic-papillary-thyroid-carcinoma-ptc": "library/elevated-thyroglobulin-in-postoperative-follow-up-of-metastatic-papillary-thyroid-carcinoma-ptc",
  "event": "events",
  "exophytic-thyroid-mass-mimicking-paraganglioma-in-a-48-year-old-female-copy": "library/exophytic-thyroid-mass-mimicking-paraganglioma-in-a-48-year-old-female",
  "gallery": "topics",
  "hemangioma-in-a-16-year-old-female": "library/hemangioma-in-a-16-year-old-female",
  "high-grade-adenocarcinoma-of-the-parotid-gland-with-cervical-lymph-node-metastasis-copy": "library/high-grade-adenocarcinoma-of-the-parotid-gland-with-cervical-lymph-node-metastasis",
  "hodgkins-lymphoma-in-a-27-year-old-female": "library/hodgkin-s-lymphoma-in-a-27-year-old-female",
  "home": "",
  "hyperfunctioning-papillary-thyroid-carcinoma": "library/hyperfunctioning-papillary-thyroid-carcinoma",
  "hypothyroidism-and-ectopic-thyroid-tissue-in-a-22-year-old-female": "library/hypothyroidism-and-ectopic-thyroid-tissue-in-a-22-year-old-female",
  "incidental-finding-of-anaplastic-thyroid-carcinoma-in-a-67-year-old-female": "library/incidental-finding-of-anaplastic-thyroid-carcinoma-in-a-67-year-old-female",
  "left-infra-auricular-mass-diagnosed-as-pleomorphic-adenoma": "library/left-infra-auricular-mass-diagnosed-as-pleomorphic-adenoma",
  "left-parotid-av-malformation-in-a-32-year-old-male": "library/left-parotid-av-malformation-in-a-32-year-old-male",
  "left-preauricular-basal-cell-carcinoma": "library/left-preauricular-basal-cell-carcinoma",
  "lipoma-of-the-left-parotid-gland-in-a-38-year-old-male-copy": "library/lipoma-of-the-left-parotid-gland-in-a-38-year-old-male",
  "long-standing-neck-swelling-due-to-multinodular-goiter-with-retrosternal-extension-copy": "library/long-standing-neck-swelling-due-to-multinodular-goiter-with-retrosternal-extension",
  "lymphangioma-of-the-left-neck-in-a-56-year-old-male-copy": "library/lymphangioma-of-the-left-neck-in-a-56-year-old-male",
  "management-of-a-22-year-old-male-with-a-swelling-in-the-right-post-auricular-region": "library/management-of-a-22-year-old-male-with-a-swelling-in-the-right-post-auricular-region",
  "management-of-a-40-year-old-male-with-an-infected-second-branchial-cleft-cyst": "library/management-of-a-40-year-old-male-with-an-infected-second-branchial-cleft-cyst",
  "management-of-a-50-year-old-female-with-palpitation-weight-loss-eye-protrusion-and-incidental-parathyroid-adenoma": "library/management-of-a-50-year-old-female-with-palpitation-weight-loss-eye-protrusion-and-incidental-pa",
  "management-of-a-58-year-old-female-with-recurrent-multinodular-goiter-mng": "library/management-of-a-58-year-old-female-with-recurrent-multinodular-goiter-mng",
  "management-of-a-58-year-old-male-with-a-right-preauricular-mass": "library/management-of-a-58-year-old-male-with-a-right-preauricular-mass",
  "management-of-a-74-year-old-female-with-hyperthyroidism-and-right-preauricular-swelling": "library/management-of-a-74-year-old-female-with-hyperthyroidism-and-right-preauricular-swelling",
  "management-of-a-complicated-thyroglossal-duct-cyst-in-a-5-year-old-child": "library/management-of-a-complicated-thyroglossal-duct-cyst-in-a-5-year-old-child",
  "massive-multinodular-goiter-with-retrosternal-extension-in-a-patient-with-long-standing-thyroid-disease-copy": "library/massive-multinodular-goiter-with-retrosternal-extension-in-a-patient-with-long-standing-thyroid-",
  "met-summit": "events",
  "neurofibroma-of-the-tongue-in-a-14-year-old-female": "library/neurofibroma-of-the-tongue-in-a-14-year-old-female",
  "non-hodgkins-lymphoma-in-an-85-year-old-male": "library/non-hodgkin-s-lymphoma-in-an-85-year-old-male",
  "papillary-thyroid-carcinoma-in-a-pregnant-patient-with-long-standing-graves-disease": "library/papillary-thyroid-carcinoma-in-a-pregnant-patient-with-long-standing-graves-disease",
  "papillary-thyroid-carcinoma-ptc-arising-from-thyroglossal-duct-cyst-tgdc": "library/papillary-thyroid-carcinoma-ptc-arising-from-thyroglossal-duct-cyst-tgdc",
  "papillary-thyroid-carcinoma-with-coexisting-right-branchial-cleft-cyst-in-a-29-year-old-male": "library/papillary-thyroid-carcinoma-with-coexisting-right-branchial-cleft-cyst-in-a-29-year-old-male",
  "papillary-thyroid-carcinoma-with-fibromatosis-desmoid-like-stroma": "library/papillary-thyroid-carcinoma-with-fibromatosis-desmoid-like-stroma",
  "papillary-thyroid-carcinoma-with-thyroglossal-duct-cyst-malignancy-in-a-49-year-old-male-copy": "library/papillary-thyroid-carcinoma-with-thyroglossal-duct-cyst-malignancy-in-a-49-year-old-male",
  "parathyroid-carcinoma-and-papillary-thyroid-carcinoma-in-a-case-of-recurrent-multinodular-goiter": "library/parathyroid-carcinoma-and-papillary-thyroid-carcinoma-in-a-case-of-recurrent-multinodular-goiter",
  "parathyroid-cyst-in-a-46-year-old-female": "library/parathyroid-cyst-in-a-46-year-old-female",
  "pleomorphic-adenoma-of-the-right-parotid-gland-copy-copy": "library/pleomorphic-adenoma-of-the-right-parotid-gland",
  "pleomorphic-adenoma-of-the-right-parotid-gland-in-a-51-year-old-female-with-multinodular-goiter-copy": "library/pleomorphic-adenoma-of-the-right-parotid-gland-in-a-51-year-old-female-with-multinodular-goiter",
  "post-thyroidectomy-sinus-formation-in-a-34-year-old-female": "library/post-thyroidectomy-sinus-formation-in-a-34-year-old-female",
  "ptc-total-thyroidectomy-and-central-and-lateral-ln-neck-dissection": "library/ptc-total-thyroidectomy-and-central-and-lateral-ln-neck-dissection",
  "publication": "research",
  "reclassifying-trab-negative-hyperthyroidism-unveiling-hyperthyroidism-due-to-thyroid-volume-enlargement": "research",
  "recommendations": "",
  "recurrent-moderately-differentiated-squamous-cell-carcinoma-of-the-lower-lip-in-a-58-year-old-male": "library/recurrent-moderately-differentiated-squamous-cell-carcinoma-of-the-lower-lip-in-a-58-year-old-ma",
  "recurrent-multifocal-pleomorphic-adenoma-of-the-right-parotid-gland-in-a-37-year-old-male": "library/recurrent-multifocal-pleomorphic-adenoma-of-the-right-parotid-gland-in-a-37-year-old-male",
  "recurrent-multinodular-goiter-in-a-61-year-old-female": "library/recurrent-multinodular-goiter-in-a-61-year-old-female",
  "recurrent-multinodular-goiter-in-a-patient-with-prior-thyroid-surgery": "library/recurrent-multinodular-goiter-in-a-patient-with-prior-thyroid-surgery",
  "recurrent-multinodular-goiter-post-thyroid-surgery-copy": "library/recurrent-multinodular-goiter-post-thyroid-surgery",
  "recurrent-papillary-thyroid-carcinoma-with-bilateral-lateral-cervical-lymph-node-metastasis-copy": "library/recurrent-papillary-thyroid-carcinoma-with-bilateral-lateral-cervical-lymph-node-metastasis",
  "recurrent-poorly-differentiated-squamous-cell-carcinoma-of-the-lower-lip-in-a-66-year-old-male-copy": "library/recurrent-poorly-differentiated-squamous-cell-carcinoma-of-the-lower-lip-in-a-66-year-old-male",
  "recurrent-suspicion-following-low-grade-mucoepidermoid-carcinoma-of-the-left-parotid-in-a-22-year-old-female-copy": "library/recurrent-suspicion-following-low-grade-mucoepidermoid-carcinoma-of-the-left-parotid-in-a-22-yea",
  "retention-mucous-cyst-ranula-with-nonspecific-sialadenitis-in-a-38-year-old-female": "library/retention-mucous-cyst-ranula-with-nonspecific-sialadenitis-in-a-38-year-old-female",
  "right-lower-eyelid-basal-cell-carcinoma-treated-with-wide-local-excision-and-nasolabial-transposition-flap": "library/right-lower-eyelid-basal-cell-carcinoma-treated-with-wide-local-excision-and-nasolabial-transpos",
  "right-nasal-squamous-cell-carcinoma-with-postoperative-surveillance-and-supra-omohyoid-neck-dissection": "library/right-nasal-squamous-cell-carcinoma-with-postoperative-surveillance-and-supra-omohyoid-neck-diss",
  "right-sided-cervical-lymphangioma-in-a-35-year-old-female-excision-and-benign-outcome": "library/right-sided-cervical-lymphangioma-in-a-35-year-old-female-excision-and-benign-outcome",
  "right-sided-cervical-lymphangioma-in-a-35-year-old-female-excision-and-benign-outcome2": "library/right-sided-cervical-lymphangioma-in-a-35-year-old-female-excision-and-benign-outcome",
  "right-submandibular-mass-oncocytic-cyst": "library/right-submandibular-mass-oncocytic-cyst",
  "right-submandibular-sialolithiasis-with-non-specific-sialadenitis-copy-copy": "library/right-submandibular-sialolithiasis-with-non-specific-sialadenitis-copy-copy",
  "self-assessment": "",
  "spindle-cell-sarcoma-in-an-86-year-old-male-copy": "library/spindle-cell-sarcoma-in-an-86-year-old-male",
  "squamous-cell-carcinoma-of-lower-lip-with-cervical-lymph-node-metastasis": "library/squamous-cell-carcinoma-of-lower-lip-with-cervical-lymph-node-metastasis",
  "statistics": "about",
  "tall-cell-subtype-of-papillary-thyroid-carcinoma": "library/tall-cell-subtype-of-papillary-thyroid-carcinoma",
  "team": "about",
  "tender-left-thyroid-swelling-due-to-hemorrhagic-cyst-in-a-hyperplastic-nodule-a-benign-mimic-of-thyroid-malignancy-copy": "library/tender-left-thyroid-swelling-due-to-hemorrhagic-cyst-in-a-hyperplastic-nodule-a-benign-mimic-of",
  "the-10th-fast-track-review-hypothyroidism": "events",
  "the-5th-fast-track-review-thyroidology": "events",
  "thyroglossal-duct-cyst-tgdc": "library/thyroglossal-duct-cyst-tgdc",
  "thyroid-anatomy": "library/thyroid-anatomy",
  "thyroid-containing-thymus-thymus-containing-parathyroid-and-ultimobranchial-body": "library/thyroid-containing-thymus-thymus-containing-parathyroid-and-ultimobranchial-body",
  "thyroid-imaging-reporting-and-data-system-tirads": "library/thyroid-imaging-reporting-and-data-system-tirads",
  "thyroid-nodulectomy": "topics/thyroid-parathyroid",
  "tuberculous-granulomatous-inflammation-of-parathyroid-adenoma-manifested-as-primary-hyperparathyroidism": "library/tuberculous-granulomatous-inflammation-of-parathyroid-adenoma-with-primary-hyperparathyroidism",
  "vascular-malformation-mimicking-parathyroid-adenoma-in-a-16-year-old-female-with-elevated-pth": "library/vascular-malformation-mimicking-parathyroid-adenoma-in-a-16-year-old-female-with-elevated-pth",
  "vascular-malformation-of-the-right-nasal-wall-and-cheek-copy": "library/vascular-malformation-of-the-right-nasal-wall-and-cheek",
  "vascular-malformation-with-discordant-ultrasound-features-in-a-12-year-old-boy": "library/vascular-malformation-with-discordant-ultrasound-features-in-a-12-year-old-boy",
  "warthin-like-subtype-of-papillary-thyroid-carcinoma": "library/warthin-like-subtype-of-papillary-thyroid-carcinoma",
};

/** Locale prefix every redirect target gets. The old site was English-only. */
const LEGACY_LOCALE = "en";

/** The canonical hostname. Everything else that reaches us folds onto it. */
const CANONICAL_HOST = "ssthyroid.com";

/**
 * Hostnames that serve the same site but must not be indexed as separate
 * copies of it.
 *
 * `www` because the old site was indexed entirely under it. The bare
 * workers.dev hostname because it is still a complete second copy of the site
 * declaring itself canonical, which splits ranking between the two.
 *
 * Matched exactly, never by suffix: wrangler's version-preview hostnames are
 * `<version>-smart.ssteam.workers.dev`, and those have to keep working as the
 * way to reach a deployment directly when the real domain is misbehaving.
 */
const ALIAS_HOSTS = new Set(["www.ssthyroid.com", "smart.ssteam.workers.dev"]);

/**
 * A 301 onto the canonical host and, where the path is an old one, onto its new
 * home — both in a single hop, so an old inbound link never chains redirects.
 *
 * Returns null for anything already canonical, which is every request on the
 * apex that is not a legacy path, plus localhost and the preview hostnames.
 */
export function legacyRedirect(url: URL): Response | null {
  const isAlias = ALIAS_HOSTS.has(url.hostname);
  const key = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, "").toLowerCase();
  const mapped = Object.prototype.hasOwnProperty.call(LEGACY_PATHS, key) ? LEGACY_PATHS[key] : undefined;

  if (mapped === undefined && !isAlias) return null;

  const target = new URL(url.toString());
  if (isAlias) {
    target.hostname = CANONICAL_HOST;
    // The alias may have been reached over http while the apex is https-only.
    target.protocol = "https:";
    target.port = "";
  }
  if (mapped !== undefined) target.pathname = mapped ? `/${LEGACY_LOCALE}/${mapped}` : `/${LEGACY_LOCALE}`;

  if (target.toString() === url.toString()) return null;
  return Response.redirect(target.toString(), 301);
}
