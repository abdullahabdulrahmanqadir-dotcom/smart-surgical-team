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
};

type ApiPublication = {
  id: number; title: string; link?: string; imageUrl?: string; authorsFreeText?: string;
  abstract?: string; publishYearString?: string; publishYear?: string; englishCategory?: string; isActive?: boolean;
  authors?: { userProfileName?: string; imageUrl?: string }[];
};

const FALLBACK_PUBLICATIONS: Publication[] = [
  { id: 1360, title: "Pomegranate peel extract and Helicobacter pylori eradication: an in vitro investigation", link: "https://www.pagepressjournals.org/jbr/article/view/14853/", imageUrl: "https://smarthealth.group/api/Images/Researches/a8020467-f1de-44b4-8e80-f9a34102723d.webp", authors: "Dr. Hoshmand Rahman Asaad, Dr. Sivan Hussein Salih, Dr. Dana Taib Gharib, Dr. Karokh Fazil Hama Hussien, Ayman Majid Mustafa", abstract: "This pilot study investigates the antibacterial effect of pomegranate peel extracts against Helicobacter pylori isolates collected from gastric biopsies.", date: "2026-07-07", year: "2026", category: "Paper", journal: "Journal of Biological Research" },
  { id: 1358, title: "Warthin-like variant of Papillary Thyroid Carcinoma", link: "https://academic.oup.com/rescon/advance-article/doi/10.1093/rescon/vmag089/8702819?login=false", imageUrl: "https://smarthealth.group/api/Images/Researches/97fe701a-a490-4694-b12e-b34cc520d3e4.webp", authors: "Dr. Aras Jamal Qadir, Ari Mohammed Abdullah, Dr. Hiwa Omer Ahmed, Dr. Abdulwahid M. Salih, and colleagues", abstract: "A retrospective case series examining the clinical, surgical and histopathological features of the rare Warthin-like variant of papillary thyroid carcinoma.", date: "2026-06-29", year: "2026", category: "Case Report", journal: "Research Connections" },
  { id: 1357, title: "Physical activity and functional rehabilitation in lower limb soft tissue sarcoma survivors", link: "https://www.sciencedirect.com/science/article/pii/S2949916X26000113", imageUrl: "https://smarthealth.group/api/Images/Researches/aa7177a4-7d9a-4750-9085-327ef9d22655.webp", authors: "Dr. Abdullah Kamal Ghafour, Fahmi H. Kakamad, Hawkar A. Nasralla, and colleagues", abstract: "A study of physical activity and functional rehabilitation in people recovering from lower-limb soft-tissue sarcoma.", date: "2026-06-20", year: "2026", category: "Paper", journal: "Journal of Medicine, Surgery, and Public Health" },
  { id: 1257, title: "Small bowel leiomyosarcoma: a case report and review of the literature", link: "https://academic.oup.com/jscr/article/2025/5/rjaf269/8124673?login=false", imageUrl: "https://smarthealth.group/api/Images/Researches/d5230acb-84eb-476a-b275-9fe2de6cf1ab-541x1080.png", authors: "Rebaz O Mohammed, Rawa M Ali, Deari A Ismaeil, Fahmi H Kakamad, and colleagues", abstract: "A clinical case report and review of the literature exploring the diagnosis and management of a rare small-bowel malignancy.", date: "2025-05-03", year: "2025", category: "Paper", journal: "Journal of Surgical Case Reports" },
];

const EXCLUDED_TITLES = new Set([
  "giant malignant phyllodes tumor with ulceration: a case report and brief review of the literature",
]);

function plainText(html = "") { return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
function journalFromLink(link: string) {
  if (/pagepressjournals\.org\/jbr/i.test(link)) return "Journal of Biological Research";
  if (/academic\.oup\.com\/rescon/i.test(link)) return "Research Connections";
  if (/academic\.oup\.com\/jscr/i.test(link)) return "Journal of Surgical Case Reports";
  if (/sciencedirect\.com\/science\/article\/pii\/S2949916X/i.test(link)) return "Journal of Medicine, Surgery, and Public Health";
  return "Journal website";
}
function readableAuthors(authors: string) {
  return authors && authors === authors.toUpperCase() ? authors.toLocaleLowerCase().replace(/\b[a-z]/g, (letter) => letter.toLocaleUpperCase()) : authors;
}

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

function sameAuthor(firstName: string, secondName: string) {
  const first = nameKey(firstName).split(" ");
  const second = nameKey(secondName).split(" ");
  const firstLast = first.at(-1);
  const secondLast = second.at(-1);
  return nameKey(firstName) === nameKey(secondName) || (first[0] === second[0] && firstLast === secondLast) || (first[0] === second[0] && firstLast && secondLast && (firstLast.startsWith(secondLast.slice(0, 4)) || secondLast.startsWith(firstLast.slice(0, 4))));
}

function contributorsFromNames(authors: string, authorRecords: ApiPublication["authors"] = []) {
  return authors.split(/,|\band\b/i).map((name) => name.trim()).filter((name) => name && !/^colleagues$/i.test(name)).map((name) => {
    const matchingRecord = authorRecords.find((author) => author.userProfileName && sameAuthor(name, author.userProfileName));
    return { name, portraitUrl: matchingRecord?.imageUrl || staffPortraitFor(name) };
  });
}

function withStaffPortraits(paper: Publication): Publication {
  return { ...paper, contributors: paper.contributors?.length ? paper.contributors.map((contributor) => ({ ...contributor, portraitUrl: contributor.portraitUrl || staffPortraitFor(contributor.name) })) : contributorsFromNames(paper.authors) };
}

export async function getResearches(): Promise<Publication[]> {
  try {
    const response = await fetch("https://smarthealth.group/api/api/Researches/GetResearchsGrouped?skip=0&take=100", { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error("Research archive unavailable");
    const data = await response.json() as { groups?: { items?: ApiPublication[] }[] };
    const items = (data.groups ?? []).flatMap((group) => group.items ?? []).filter((item) => item.isActive && item.link && item.title);
    // This archive is dedicated to Dr. Abdulwahid's published work. Check both
    // the free-text byline and structured author records because older imports
    // do not always populate both fields consistently.
    const abdulwahidPapers = items.filter((item) => /abdulwahid/i.test(`${item.authorsFreeText ?? ""} ${(item.authors ?? []).map((author) => author.userProfileName ?? "").join(" ")}`) && !EXCLUDED_TITLES.has(item.title.trim().toLocaleLowerCase()));
    if (!abdulwahidPapers.length) return FALLBACK_PUBLICATIONS.filter((paper) => /abdulwahid/i.test(paper.authors)).map(withStaffPortraits);
    return abdulwahidPapers.map((item) => {
      const date = item.publishYearString ?? item.publishYear?.slice(0, 10) ?? "";
      const paperAuthors = readableAuthors(item.authorsFreeText ?? "Smart Health research team");
      return withStaffPortraits({ id: item.id, title: item.title, link: item.link!, imageUrl: item.imageUrl ?? "", authors: paperAuthors, abstract: plainText(item.abstract), date, year: date.slice(0, 4) || "Research", category: item.englishCategory ?? "Publication", journal: journalFromLink(item.link!), contributors: contributorsFromNames(paperAuthors, item.authors) });
    }).sort((a, b) => b.date.localeCompare(a.date));
  } catch { return FALLBACK_PUBLICATIONS.map(withStaffPortraits); }
}

/** Finds one publication for its public, stable detail URL. */
export async function getResearchById(id: string): Promise<Publication | undefined> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return undefined;
  return (await getResearches()).find((paper) => paper.id === numericId);
}
import { TEAM_GROUPS } from "./team";
