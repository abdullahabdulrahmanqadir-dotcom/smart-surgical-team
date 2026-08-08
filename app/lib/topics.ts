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
      { slug: "papillary-carcinoma", name: "Papillary Thyroid Carcinoma", imageIcon: "/topic-icons/papillary-carcinoma.png" },
      { slug: "goiter", name: "Multinodular Goiter", imageIcon: "/topic-icons/goiter.png" },
      { slug: "thyroglossal-cyst", name: "Thyroglossal & Ectopic Thyroid", imageIcon: "/topic-icons/thyroglossal-cyst.png" },
      { slug: "parathyroid", name: "Parathyroid Disease", imageIcon: "/topic-icons/parathyroid-sst-cropped.png" },
      { slug: "thyroid-nodules", name: "Thyroid Nodules & Cysts" },
      { slug: "anaplastic-carcinoma", name: "Anaplastic & Aggressive Carcinoma" },
      { slug: "revision-thyroid-surgery", name: "Revision & Post-Operative Thyroid" },
    ],
  },
  {
    slug: "salivary-glands", name: "Salivary Glands", blurb: "Parotidectomy approaches and facial nerve dissection.",
    intro: "Surgery of the salivary glands, centred on parotid approaches and the facial nerve dissection that defines the operation.",
    icon: "parotid", imageIcon: "/topic-icons/parotid-sst-cropped.png", featured: true,
    subTopics: [
      { slug: "pleomorphic-adenoma", name: "Pleomorphic Adenoma", imageIcon: "/topic-icons/parotid-sst-cropped.png" },
      { slug: "benign-salivary-tumours", name: "Other Benign Salivary Tumours", imageIcon: "/topic-icons/submandibular-sst-cropped.png" },
      { slug: "salivary-malignancy", name: "Salivary Gland Malignancy" },
      { slug: "sialolithiasis-sialadenitis", name: "Sialolithiasis & Sialadenitis" },
    ],
  },
  {
    slug: "neck-lymphatic", name: "Neck & Lymphatic Surgery", blurb: "Neck dissection by level, staging and nodal disease.",
    intro: "Neck dissection presented level by level, alongside the assessment and staging of nodal disease and the workup of neck masses.",
    icon: "lymph", featured: true,
    subTopics: [
      { slug: "vascular-malformations", name: "Vascular & Lymphatic Malformations" },
      { slug: "congenital-neck-cysts", name: "Congenital Neck Cysts" },
      { slug: "lymphoma", name: "Lymphoma" },
    ],
  },
  {
    slug: "skin-soft-tissue", name: "Skin & Soft Tissue", blurb: "Excision, margins and reconstruction of head & neck skin.",
    intro: "Management of skin and soft tissue lesions of the head and neck, from excision and margin planning through to reconstruction.",
    icon: "skin", featured: true,
    subTopics: [
      { slug: "squamous-cell-carcinoma", name: "Squamous Cell Carcinoma" },
      { slug: "basal-cell-carcinoma", name: "Basal Cell Carcinoma" },
      { slug: "benign-soft-tissue", name: "Benign Soft-Tissue Lesions" },
    ],
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
