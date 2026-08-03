import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { TEAM_GROUPS } from "./team";

/**
 * Server-side research reads.
 *
 * Research is DB-backed: the admin manages `public.researches` and the site
 * reads published rows through a short shared cache, exactly like `content.ts`.
 * The external smarthealth.group feed is no longer used — its papers were
 * imported once by migration 0009.
 */

export type Publication = {
  id: number;
  title: string;
  link: string;
  imageUrl: string;
  authors: string;
  abstract: string;
  date: string;
  year: string;
  category: string;
  journal: string;
  contributors?: { name: string; portraitUrl?: string }[];
  media?: { publicUrl: string; altText?: string; caption?: string }[];
};

const STAFF = TEAM_GROUPS.flatMap((group) => group.members);
const STAFF_NAME_ALIASES: Record<string, string> = {
  "aras jamal qadir": "Aras J. Qaradaxy",
  "aras j qaradakhy": "Aras J. Qaradaxy",
  "abdullah abdulrahman qadir": "Abdullah A. Qadr",
  "abdullah abdueahman qadir": "Abdullah A. Qadr",
};

function nameKey(name: string) {
  return name.toLocaleLowerCase().replace(/\b(?:dr|prof|mr|ms)\.?\s*/g, "").replace(/[^a-z]+/g, " ").trim();
}

function staffPortraitFor(name: string) {
  const key = nameKey(name);
  const aliasedName = STAFF_NAME_ALIASES[key];
  if (aliasedName) return STAFF.find((member) => member.name === aliasedName)?.portrait;
  const tokens = key.split(" ");
  const first = tokens[0];
  const last = tokens.at(-1);
  return STAFF.find((member) => {
    const memberTokens = nameKey(member.name).split(" ");
    const memberFirst = memberTokens[0];
    const memberLast = memberTokens.at(-1);
    return (key === nameKey(member.name)) || (first === memberFirst && last === memberLast) || (first === memberFirst && last && memberLast && (last.startsWith(memberLast.slice(0, 4)) || memberLast.startsWith(last.slice(0, 4))));
  })?.portrait;
}

function contributorsFromNames(authors: string) {
  return authors.split(/,|\band\b/i).map((name) => name.trim()).filter((name) => name && !/^colleagues$/i.test(name)).map((name) => ({ name, portraitUrl: staffPortraitFor(name) }));
}

function withStaffPortraits(paper: Publication): Publication {
  return { ...paper, contributors: contributorsFromNames(paper.authors) };
}

function canUseDatabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const REVALIDATE_SECONDS = 60;
const RESEARCH_CACHE_TAG = "published-research";

type ResearchRow = {
  id: number; title: string; authors: string | null; abstract: string | null;
  journal: string | null; category: string | null; link: string | null;
  published_date: string | null; cover_image_url: string | null;
  research_media: { public_url: string; alt_text: string | null; caption: string | null; sort_order: number }[] | null;
};

const RESEARCH_SELECT =
  "id,title,authors,abstract,journal,category,link,published_date,cover_image_url," +
  "research_media(public_url,alt_text,caption,sort_order)";

function mapRow(row: ResearchRow): Publication {
  const date = row.published_date ?? "";
  const media = [...(row.research_media ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ publicUrl: item.public_url, altText: item.alt_text ?? undefined, caption: item.caption ?? undefined }));
  return withStaffPortraits({
    id: row.id,
    title: row.title,
    link: row.link ?? "",
    imageUrl: row.cover_image_url ?? "",
    authors: row.authors ?? "Smart Health research team",
    abstract: row.abstract ?? "",
    date,
    year: date.slice(0, 4) || "Research",
    category: row.category ?? "Publication",
    journal: row.journal ?? "Journal website",
    media,
  });
}

async function fetchResearches(): Promise<Publication[]> {
  if (!canUseDatabase()) return [];
  try {
    const { data, error } = await getSupabaseServerClient()
      .from("researches")
      .select(RESEARCH_SELECT)
      .eq("status", "published")
      .order("published_date", { ascending: false });
    if (error) { console.error("published researches query failed:", error.message); return []; }
    return (data as unknown as ResearchRow[]).map(mapRow);
  } catch { return []; }
}

const cachedResearches = unstable_cache(fetchResearches, ["published-researches"], { revalidate: REVALIDATE_SECONDS, tags: [RESEARCH_CACHE_TAG] });

export async function getResearches(): Promise<Publication[]> {
  return cachedResearches();
}

/** Finds one publication for its public, stable detail URL. */
export async function getResearchById(id: string): Promise<Publication | undefined> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return undefined;
  return (await cachedResearches()).find((paper) => paper.id === numericId);
}
