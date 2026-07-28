import type { TopicIconName } from "../components/icons";

/**
 * The surgical taxonomy from PROJECT_BRIEF.md — five groups, each broken into
 * conditions, and each condition holding the case videos that teach it. This is
 * the single source of truth: the home page teaser, the Topics index and the
 * topic detail pages all read from here, so they cannot drift apart.
 *
 * Scope note: no breast content, and total laryngectomy is never presented as
 * a Smart Surgical Team procedure.
 *
 * PLACEHOLDER: the `cases` below are real examples pulled from the team's
 * current archive (ssthyroid.com) purely to show the populated layout. They are
 * NOT the new library's content and carry no real destinations yet. Phase 2
 * replaces every one with approved case records that link to real videos.
 * Blurbs and condition names are clinically written but still await team review.
 */

export type CaseVideo = {
  slug: string;
  /** Real case title (PLACEHOLDER example — see file header). */
  title: string;
  /** One-line clinical summary. */
  summary: string;
  /** Human month/year, e.g. "Dec 2025". */
  date: string;
  readMinutes: number;
  hasVideo: boolean;
};

export type SubTopic = {
  slug: string;
  /** A condition within the group, e.g. "Papillary Carcinoma". */
  name: string;
  imageIcon?: string;
  /** Example case videos for this condition (PLACEHOLDER until Phase 2). */
  cases?: CaseVideo[];
};

export type TopicGroup = {
  slug: string;
  name: string;
  /** One line on the Topics index card. */
  blurb: string;
  /** Longer introduction shown on the group's own page. */
  intro: string;
  icon: TopicIconName;
  /** Approved artwork used for a topic card when provided. */
  imageIcon?: string;
  subTopics: SubTopic[];
  /** Shown on the home page's curated teaser grid. */
  featured: boolean;
  /**
   * Keeps a planned taxonomy group in the data model without publishing it
   * before its programme is ready.
   */
  visible?: boolean;
};

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    slug: "thyroid-parathyroid",
    name: "Thyroid & Parathyroid",
    blurb: "Thyroidectomy, nerve identification and parathyroid preservation.",
    intro:
      "Operative technique across the thyroid and parathyroid glands, with particular attention to recurrent laryngeal nerve identification, parathyroid preservation and haemostasis.",
    icon: "thyroid",
    imageIcon: "/topic-icons/thyroid-sst-cropped.png",
    subTopics: [
      {
        slug: "papillary-carcinoma",
        name: "Papillary Carcinoma",
        imageIcon: "/topic-icons/papillary-carcinoma.png",
        cases: [
          {
            slug: "recurrent-papillary-carcinoma-nodal-metastasis",
            title:
              "Recurrent Papillary Thyroid Carcinoma with Bilateral Lateral Cervical Lymph Node Metastasis",
            summary:
              "A 35-year-old woman with recurrence three years after thyroidectomy and radioactive iodine for papillary thyroid carcinoma.",
            date: "Jun 2025",
            readMinutes: 2,
            hasVideo: true,
          },
        ],
      },
      {
        slug: "follicular-carcinoma",
        name: "Follicular Carcinoma",
        imageIcon: "/topic-icons/follicular-carcinoma.png",
        cases: [],
      },
      {
        slug: "medullary-carcinoma",
        name: "Medullary Carcinoma",
        imageIcon: "/topic-icons/medullary-carcinoma.png",
        cases: [],
      },
      {
        slug: "goiter",
        name: "Goiter",
        imageIcon: "/topic-icons/goiter.png",
        cases: [
          {
            slug: "multinodular-goiter-retrosternal-extension",
            title:
              "Massive Multinodular Goiter With Retrosternal Extension in Long-Standing Thyroid Disease",
            summary:
              "Progressive neck swelling with dysphagia in a patient with a ten-year history of thyroid disease and compressive symptoms.",
            date: "Dec 2025",
            readMinutes: 2,
            hasVideo: true,
          },
        ],
      },
      {
        slug: "thyroglossal-cyst",
        name: "Thyroglossal Cyst",
        imageIcon: "/topic-icons/thyroglossal-cyst.png",
        cases: [
          {
            slug: "papillary-carcinoma-in-thyroglossal-duct-cyst",
            title:
              "Papillary Thyroid Carcinoma with Thyroglossal Duct Cyst Malignancy in a 49-Year-Old Male",
            summary:
              "A one-year history of anterior midline neck swelling, with malignancy identified within a thyroglossal duct cyst.",
            date: "Jun 2025",
            readMinutes: 2,
            hasVideo: false,
          },
        ],
      },
      {
        slug: "parathyroid",
        name: "Parathyroid",
        imageIcon: "/topic-icons/parathyroid-sst-cropped.png",
        cases: [
          {
            slug: "parathyroid-carcinoma-with-papillary-carcinoma",
            title:
              "Parathyroid Carcinoma and Papillary Thyroid Carcinoma in Recurrent Multinodular Goiter",
            summary:
              "A 70-year-old woman with biochemical hyperparathyroidism and markedly elevated calcium and PTH on a background of recurrent goiter.",
            date: "Jun 2025",
            readMinutes: 2,
            hasVideo: true,
          },
          {
            slug: "vascular-malformation-mimicking-parathyroid-adenoma",
            title:
              "Vascular Malformation Mimicking Parathyroid Adenoma in a 16-Year-Old Female with Elevated PTH",
            summary:
              "A one-year history of anterior neck swelling with elevated PTH, where imaging suggested a parathyroid lesion.",
            date: "Dec 2025",
            readMinutes: 2,
            hasVideo: true,
          },
        ],
      },
    ],
    featured: true,
  },
  {
    slug: "salivary-glands",
    name: "Salivary Glands",
    blurb: "Parotidectomy approaches and facial nerve dissection.",
    intro:
      "Surgery of the salivary glands, centred on parotid approaches and the facial nerve dissection that defines the operation.",
    icon: "parotid",
    imageIcon: "/topic-icons/parotid-sst-cropped.png",
    subTopics: [
      {
        slug: "parotid",
        name: "Parotid",
        imageIcon: "/topic-icons/parotid-sst-cropped.png",
        cases: [
          {
            slug: "recurrent-pleomorphic-adenoma-parotid",
            title: "Recurrent Multifocal Pleomorphic Adenoma of the Right Parotid Gland",
            summary:
              "A slow-growing infra-auricular swelling recurring fifteen years after prior parotid surgery in a 37-year-old male.",
            date: "Dec 2025",
            readMinutes: 2,
            hasVideo: true,
          },
          {
            slug: "oncocytic-neoplasm-parotid",
            title: "Benign Oncocytic Neoplasm of the Right Parotid Gland in a 45-Year-Old Male",
            summary:
              "A two-year infra-auricular swelling with reduced salivary output and pain radiating to the tongue.",
            date: "Aug 2025",
            readMinutes: 2,
            hasVideo: true,
          },
          {
            slug: "lipoma-parotid",
            title: "Lipoma of the Left Parotid Gland in a 38-Year-Old Male",
            summary:
              "An eighteen-month, slow-growing, painless infra-auricular mass without systemic symptoms.",
            date: "Sep 2025",
            readMinutes: 1,
            hasVideo: true,
          },
          {
            slug: "parotid-av-malformation",
            title: "Left Parotid AV Malformation in a 32-Year-Old Male",
            summary:
              "A four-year preauricular swelling with pulsatile tinnitus, consistent with an arteriovenous malformation.",
            date: "Jul 2026",
            readMinutes: 2,
            hasVideo: true,
          },
        ],
      },
      {
        slug: "submandibular",
        name: "Submandibular",
        imageIcon: "/topic-icons/submandibular-sst-cropped.png",
        cases: [
          {
            slug: "submandibular-sialolithiasis",
            title: "Right Submandibular Sialolithiasis with Non-Specific Sialadenitis",
            summary:
              "Chronic right submandibular swelling in a 48-year-old male, managed operatively.",
            date: "Nov 2025",
            readMinutes: 1,
            hasVideo: true,
          },
        ],
      },
    ],
    featured: true,
  },
  {
    slug: "neck-lymphatic",
    name: "Neck & Lymphatic Surgery",
    blurb: "Neck dissection by level, staging and nodal disease.",
    intro:
      "Neck dissection presented level by level, alongside the assessment and staging of nodal disease and the workup of neck masses.",
    icon: "lymph",
    subTopics: [
      { slug: "lymph-nodes", name: "Lymph Nodes", cases: [] },
      {
        slug: "neck-masses",
        name: "Neck Masses",
        cases: [
          {
            slug: "cervical-lymphangioma-56m",
            title: "Lymphangioma of the Left Neck in a 56-Year-Old Male",
            summary:
              "A one-year, progressively enlarging, painless left lateral neck mass, excised with a benign outcome.",
            date: "Sep 2025",
            readMinutes: 2,
            hasVideo: true,
          },
          {
            slug: "cervical-lymphangioma-35f",
            title: "Right-Sided Cervical Lymphangioma in a 35-Year-Old Female",
            summary:
              "A one-year anterior neck swelling without compressive symptoms; excision with a benign outcome.",
            date: "May 2025",
            readMinutes: 2,
            hasVideo: false,
          },
        ],
      },
    ],
    featured: true,
  },
  {
    slug: "skin-soft-tissue",
    name: "Skin & Soft Tissue",
    blurb: "Excision, margins and reconstruction of head & neck skin.",
    intro:
      "Management of skin and soft tissue lesions of the head and neck, from excision and margin planning through to reconstruction.",
    icon: "skin",
    subTopics: [
      {
        slug: "skin-lesions",
        name: "Skin Lesions",
        cases: [
          {
            slug: "eyelid-bcc-nasolabial-flap",
            title:
              "Right Lower Eyelid Basal Cell Carcinoma — Wide Local Excision and Nasolabial Transposition Flap",
            summary:
              "A six-month, progressively enlarging lower-eyelid lesion excised and reconstructed with a transposition flap.",
            date: "Jul 2025",
            readMinutes: 2,
            hasVideo: false,
          },
          {
            slug: "nasal-scc-neck-dissection",
            title:
              "Right Nasal Squamous Cell Carcinoma with Supra-omohyoid Neck Dissection",
            summary:
              "Postoperative surveillance and locoregional assessment after excision of a nasal SCC in a 36-year-old male.",
            date: "Jun 2025",
            readMinutes: 2,
            hasVideo: false,
          },
          {
            slug: "recurrent-lower-lip-scc",
            title: "Recurrent Squamous Cell Carcinoma of the Lower Lip in a 66-Year-Old Male",
            summary:
              "An advanced, ulcerated lower-lip lesion recurring after two prior resections with involved margins.",
            date: "Jun 2025",
            readMinutes: 3,
            hasVideo: false,
          },
          {
            slug: "dermatofibrosarcoma-protuberans-recurrence",
            title: "Dermatofibrosarcoma Protuberans with Fivefold Recurrence",
            summary:
              "A chest-wall recurrence after four prior operations and radiotherapy in a 61-year-old male.",
            date: "Jun 2025",
            readMinutes: 3,
            hasVideo: false,
          },
        ],
      },
    ],
    featured: true,
  },
  {
    slug: "upper-aerodigestive",
    name: "Upper Aerodigestive Tract",
    blurb: "Oral cavity and laryngeal anatomy, access and technique.",
    intro:
      "Anatomy, access and operative technique across the oral cavity and larynx, with an emphasis on function-preserving approaches.",
    icon: "larynx",
    subTopics: [
      { slug: "oral-cavity", name: "Oral Cavity", cases: [] },
      { slug: "larynx", name: "Larynx", cases: [] },
    ],
    featured: false,
    visible: false,
  },
];

export function getTopicGroup(slug: string): TopicGroup | undefined {
  return TOPIC_GROUPS.find((group) => group.slug === slug);
}

export function getPublicTopicGroup(slug: string): TopicGroup | undefined {
  return PUBLIC_TOPIC_GROUPS.find((group) => group.slug === slug);
}

/** Groups currently published in the curriculum index and public navigation. */
export const PUBLIC_TOPIC_GROUPS = TOPIC_GROUPS.filter((group) => group.visible !== false);

/** The curated subset shown on the home page, kept to a four-card grid. */
export const FEATURED_TOPICS = PUBLIC_TOPIC_GROUPS.filter((group) => group.featured);
