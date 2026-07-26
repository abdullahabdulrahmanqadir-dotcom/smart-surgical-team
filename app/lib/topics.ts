import type { TopicIconName } from "../components/icons";

/**
 * The surgical taxonomy from PROJECT_BRIEF.md — five groups, each with its own
 * sub-topics. This is the single source of truth: the home page teaser, the
 * Topics index and the topic detail pages all read from here, so they cannot
 * drift apart.
 *
 * Scope note: no breast content, and total laryngectomy is never presented as
 * a Smart Surgical Team procedure.
 *
 * PLACEHOLDER: blurbs are written to be clinically accurate but are awaiting
 * review by the team. Content counts are deliberately absent until Phase 2
 * supplies real numbers.
 */

export type SubTopic = {
  slug: string;
  name: string;
};

export type TopicGroup = {
  slug: string;
  name: string;
  /** One line on the Topics index card. */
  blurb: string;
  /** Longer introduction shown on the group's own page. */
  intro: string;
  icon: TopicIconName;
  subTopics: SubTopic[];
  /** Shown on the home page's curated teaser grid. */
  featured: boolean;
};

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    slug: "thyroid-parathyroid",
    name: "Thyroid & Parathyroid",
    blurb: "Thyroidectomy, nerve identification and parathyroid preservation.",
    intro:
      "Operative technique across the thyroid and parathyroid glands, with particular attention to recurrent laryngeal nerve identification, parathyroid preservation and haemostasis.",
    icon: "thyroid",
    subTopics: [
      { slug: "thyroid", name: "Thyroid" },
      { slug: "parathyroid", name: "Parathyroid" },
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
    subTopics: [{ slug: "parotid", name: "Parotid" }],
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
      { slug: "lymph-nodes", name: "Lymph Nodes" },
      { slug: "neck-masses", name: "Neck Masses" },
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
    subTopics: [{ slug: "skin-lesions", name: "Skin Lesions" }],
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
      { slug: "oral-cavity", name: "Oral Cavity" },
      { slug: "larynx", name: "Larynx" },
    ],
    featured: false,
  },
];

export function getTopicGroup(slug: string): TopicGroup | undefined {
  return TOPIC_GROUPS.find((group) => group.slug === slug);
}

/** The curated subset shown on the home page, kept to a four-card grid. */
export const FEATURED_TOPICS = TOPIC_GROUPS.filter((group) => group.featured);
