import { getSupabaseServerClient } from "../../lib/supabase/server";

export type ContentKind = "video" | "webinar_recording" | "poster";

export type ContentChapter = {
  time: string;
  title: string;
  progress: number;
};

export type ContentRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: ContentKind;
  topic: string;
  topicSlug: string;
  duration: string;
  durationSeconds?: number;
  level: string;
  presenter: { name: string; role: string; bio: string; initials: string };
  videoUrl?: string;
  posterUrl?: string;
  chapters: ContentChapter[];
  learnerCount?: number;
  progress?: number;
};

/*
 * Safe, local starter records. They keep the public library useful until the
 * Supabase content manager is connected. When SUPABASE_URL and its service key
 * are present, published records take precedence automatically.
 */
export const SAMPLE_CONTENT: ContentRecord[] = [
  {
    id: "400467",
    slug: "thyroidectomy-step-by-step-masterclass",
    title: "Thyroidectomy: Step-by-Step Masterclass",
    summary: "A practical, step-by-step walkthrough of total thyroidectomy, focused on safe exposure, recurrent laryngeal nerve identification, parathyroid preservation and haemostasis.",
    kind: "video",
    topic: "Thyroid & Parathyroid",
    topicSlug: "thyroid-parathyroid",
    duration: "24:18",
    durationSeconds: 1458,
    level: "Intermediate",
    presenter: { name: "Dr. Karzan Ahmed", role: "Head & Neck Surgeon", bio: "Special interest in thyroid, parathyroid and oncologic surgery at Smart Health Tower.", initials: "KA" },
    chapters: [
      { time: "00:00", title: "Welcome & learning objectives", progress: 0 },
      { time: "02:18", title: "Exposure and surgical landmarks", progress: 12 },
      { time: "08:46", title: "Identifying the recurrent laryngeal nerve", progress: 36 },
      { time: "15:04", title: "Parathyroid preservation", progress: 62 },
      { time: "21:12", title: "Haemostasis and closure", progress: 87 },
    ],
    learnerCount: 480,
    progress: 28,
  },
  {
    id: "safe-parathyroid-preservation",
    slug: "thyroidectomy-safe-parathyroid-preservation",
    title: "Thyroidectomy: Tips for Safe Parathyroid Preservation",
    summary: "Decision points and anatomical cues that help protect parathyroid tissue during thyroid surgery.",
    kind: "video", topic: "Thyroid & Parathyroid", topicSlug: "thyroid-parathyroid", duration: "22:31", durationSeconds: 1351, level: "Intermediate",
    presenter: { name: "Dr. Ava Rashid", role: "Head & Neck Surgeon", bio: "Focused on reconstructive and endocrine surgery.", initials: "AR" },
    chapters: [{ time: "00:00", title: "Introduction", progress: 0 }, { time: "07:25", title: "Vascular supply", progress: 33 }, { time: "15:40", title: "Preservation strategy", progress: 70 }], progress: 80,
  },
  {
    id: "selective-neck-dissection",
    slug: "selective-neck-dissection-levels-ii-iv",
    title: "Selective Neck Dissection: Levels II–IV",
    summary: "A clear operative review of boundaries, planes and key structures in selective neck dissection.",
    kind: "video", topic: "Neck & Lymphatic Surgery", topicSlug: "neck-lymphatic", duration: "14:02", durationSeconds: 842, level: "Intermediate",
    presenter: { name: "Dr. Shwan Omer", role: "Head & Neck Surgeon", bio: "Focused on skull base and oncologic surgery.", initials: "SO" },
    chapters: [{ time: "00:00", title: "Anatomic overview", progress: 0 }, { time: "04:15", title: "Dissection sequence", progress: 30 }, { time: "10:18", title: "Safety checks", progress: 73 }], progress: 42,
  },
  {
    id: "transoral-robotic-surgery",
    slug: "transoral-robotic-surgery-oropharyngeal-cancer",
    title: "Transoral Robotic Surgery for Oropharyngeal Cancer",
    summary: "A focused introduction to patient selection, setup and key operative steps in transoral robotic surgery.",
    kind: "video", topic: "Oncology", topicSlug: "neck-lymphatic", duration: "18:24", durationSeconds: 1104, level: "Advanced",
    presenter: { name: "Dr. Karzan Ahmed", role: "Head & Neck Surgeon", bio: "Special interest in thyroid, parathyroid and oncologic surgery at Smart Health Tower.", initials: "KA" },
    chapters: [{ time: "00:00", title: "Case selection", progress: 0 }, { time: "05:12", title: "Exposure", progress: 28 }, { time: "12:40", title: "Resection", progress: 69 }], progress: 65,
  },
  {
    id: "advanced-airway-webinar",
    slug: "airway-management-advanced-laryngeal-disease",
    title: "Airway Management in Advanced Laryngeal Disease",
    summary: "Recorded webinar covering multidisciplinary planning and airway options in advanced laryngeal disease.",
    kind: "webinar_recording", topic: "Larynx", topicSlug: "upper-aerodigestive", duration: "48:10", durationSeconds: 2890, level: "Intermediate",
    presenter: { name: "Dr. Shwan Omer", role: "Head & Neck Surgeon", bio: "Focused on skull base and oncologic surgery.", initials: "SO" },
    chapters: [{ time: "00:00", title: "Clinical framing", progress: 0 }, { time: "18:30", title: "Airway options", progress: 38 }, { time: "36:10", title: "Panel discussion", progress: 75 }],
  },
  {
    id: "mandibular-reconstruction-webinar",
    slug: "reconstruction-mandibular-defects-panel-discussion",
    title: "Reconstruction of Mandibular Defects: Panel Discussion",
    summary: "Recorded expert panel on planning and reconstruction after mandibular resection.",
    kind: "webinar_recording", topic: "Reconstruction", topicSlug: "skin-soft-tissue", duration: "52:44", durationSeconds: 3164, level: "Advanced",
    presenter: { name: "Dr. Karzan Ahmed", role: "Head & Neck Surgeon", bio: "Special interest in thyroid, parathyroid and oncologic surgery at Smart Health Tower.", initials: "KA" },
    chapters: [{ time: "00:00", title: "Defect classification", progress: 0 }, { time: "17:40", title: "Reconstruction options", progress: 34 }, { time: "39:32", title: "Case discussion", progress: 75 }], progress: 30,
  },
  {
    id: "transoral-robotic-surgery-poster",
    slug: "outcomes-transoral-robotic-surgery-cohort-review",
    title: "Outcomes of Transoral Robotic Surgery: Cohort Review",
    summary: "An e-poster summarising outcomes, complications and functional recovery in a transoral robotic surgery cohort.",
    kind: "poster", topic: "Oncology", topicSlug: "neck-lymphatic", duration: "12 pages", level: "Research",
    presenter: { name: "Dr. Shwan Omer", role: "Head & Neck Surgeon", bio: "Focused on skull base and oncologic surgery.", initials: "SO" }, chapters: [],
  },
  {
    id: "parotid-facial-nerve-poster",
    slug: "parotid-surgery-facial-nerve-mapping-atlas",
    title: "Parotid Surgery: Facial Nerve Mapping Atlas",
    summary: "An illustrated e-poster reviewing landmarks and a systematic approach to facial nerve identification.",
    kind: "poster", topic: "Salivary Glands", topicSlug: "salivary-glands", duration: "8 pages", level: "Clinical atlas",
    presenter: { name: "Dr. Ava Rashid", role: "Head & Neck Surgeon", bio: "Focused on reconstructive and endocrine surgery.", initials: "AR" }, chapters: [],
  },
];

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}` : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function canUseContentDatabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getPublishedContent(): Promise<ContentRecord[] | null> {
  if (!canUseContentDatabase()) return null;

  try {
    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("content_items")
      .select("id,title,slug,summary,kind,video_url,poster_url,duration_seconds,contributors(display_name,credentials,biography),content_topics(topics(name,slug)),content_chapters(title,position,starts_at_seconds)")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error || !data) return null;

    return data.map((row: any) => {
      const contributor = Array.isArray(row.contributors) ? row.contributors[0] : row.contributors;
      const topicLink = Array.isArray(row.content_topics) ? row.content_topics[0] : row.content_topics;
      const topic = Array.isArray(topicLink?.topics) ? topicLink.topics[0] : topicLink?.topics;
      const chapters = [...(row.content_chapters ?? [])]
        .sort((a: any, b: any) => a.position - b.position)
        .map((chapter: any) => ({ time: formatDuration(chapter.starts_at_seconds), title: chapter.title, progress: row.duration_seconds ? Math.round((chapter.starts_at_seconds / row.duration_seconds) * 100) : 0 }));
      const name = contributor?.display_name ?? "Smart Surgical Team";
      return {
        id: row.id, slug: row.slug, title: row.title, summary: row.summary ?? "", kind: row.kind,
        topic: topic?.name ?? "Clinical education", topicSlug: topic?.slug ?? "topics", duration: formatDuration(row.duration_seconds), durationSeconds: row.duration_seconds ?? undefined,
        level: "Clinical education", presenter: { name, role: contributor?.credentials ?? "Contributor", bio: contributor?.biography ?? "", initials: name.split(" ").filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() || "ST" },
        videoUrl: row.video_url ?? undefined, posterUrl: row.poster_url ?? undefined, chapters,
      } satisfies ContentRecord;
    });
  } catch {
    return null;
  }
}

export async function getLibraryContent() {
  return (await getPublishedContent()) ?? SAMPLE_CONTENT;
}

export async function getContent(identifier: string) {
  return (await getLibraryContent()).find((item) => item.id === identifier || item.slug === identifier);
}
