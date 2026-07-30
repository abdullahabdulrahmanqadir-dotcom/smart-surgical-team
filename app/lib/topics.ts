import type { TopicIconName } from "../components/icons";

/** The approved curriculum taxonomy. Content itself is managed in the admin workspace. */
export type SubTopic = {
  slug: string;
  name: string;
  imageIcon?: string;
};

export type TopicGroup = {
  slug: string;
  name: string;
  blurb: string;
  intro: string;
  icon: TopicIconName;
  imageIcon?: string;
  subTopics: SubTopic[];
  featured: boolean;
  visible?: boolean;
};

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    slug: "thyroid-parathyroid", name: "Thyroid & Parathyroid", blurb: "Thyroidectomy, nerve identification and parathyroid preservation.",
    intro: "Operative technique across the thyroid and parathyroid glands, with particular attention to recurrent laryngeal nerve identification, parathyroid preservation and haemostasis.",
    icon: "thyroid", imageIcon: "/topic-icons/thyroid-sst-cropped.png", featured: true,
    subTopics: [
      { slug: "papillary-carcinoma", name: "Papillary Carcinoma", imageIcon: "/topic-icons/papillary-carcinoma.png" },
      { slug: "follicular-carcinoma", name: "Follicular Carcinoma", imageIcon: "/topic-icons/follicular-carcinoma.png" },
      { slug: "medullary-carcinoma", name: "Medullary Carcinoma", imageIcon: "/topic-icons/medullary-carcinoma.png" },
      { slug: "goiter", name: "Goiter", imageIcon: "/topic-icons/goiter.png" },
      { slug: "thyroglossal-cyst", name: "Thyroglossal Cyst", imageIcon: "/topic-icons/thyroglossal-cyst.png" },
      { slug: "parathyroid", name: "Parathyroid", imageIcon: "/topic-icons/parathyroid-sst-cropped.png" },
    ],
  },
  {
    slug: "salivary-glands", name: "Salivary Glands", blurb: "Parotidectomy approaches and facial nerve dissection.",
    intro: "Surgery of the salivary glands, centred on parotid approaches and the facial nerve dissection that defines the operation.",
    icon: "parotid", imageIcon: "/topic-icons/parotid-sst-cropped.png", featured: true,
    subTopics: [{ slug: "parotid", name: "Parotid", imageIcon: "/topic-icons/parotid-sst-cropped.png" }, { slug: "submandibular", name: "Submandibular", imageIcon: "/topic-icons/submandibular-sst-cropped.png" }],
  },
  {
    slug: "neck-lymphatic", name: "Neck & Lymphatic Surgery", blurb: "Neck dissection by level, staging and nodal disease.",
    intro: "Neck dissection presented level by level, alongside the assessment and staging of nodal disease and the workup of neck masses.",
    icon: "lymph", featured: true,
    subTopics: [{ slug: "lymph-nodes", name: "Lymph Nodes" }, { slug: "neck-masses", name: "Neck Masses" }],
  },
  {
    slug: "skin-soft-tissue", name: "Skin & Soft Tissue", blurb: "Excision, margins and reconstruction of head & neck skin.",
    intro: "Management of skin and soft tissue lesions of the head and neck, from excision and margin planning through to reconstruction.",
    icon: "skin", featured: true, subTopics: [{ slug: "skin-lesions", name: "Skin Lesions" }],
  },
  {
    slug: "upper-aerodigestive", name: "Upper Aerodigestive Tract", blurb: "Oral cavity and laryngeal anatomy, access and technique.",
    intro: "Anatomy, access and operative technique across the oral cavity and larynx, with an emphasis on function-preserving approaches.",
    icon: "larynx", featured: false, visible: false, subTopics: [{ slug: "oral-cavity", name: "Oral Cavity" }, { slug: "larynx", name: "Larynx" }],
  },
];

export function getTopicGroup(slug: string): TopicGroup | undefined {
  return TOPIC_GROUPS.find((group) => group.slug === slug);
}

export function getPublicTopicGroup(slug: string): TopicGroup | undefined {
  return PUBLIC_TOPIC_GROUPS.find((group) => group.slug === slug);
}

export const PUBLIC_TOPIC_GROUPS = TOPIC_GROUPS.filter((group) => group.visible !== false);
export const FEATURED_TOPICS = PUBLIC_TOPIC_GROUPS.filter((group) => group.featured);
