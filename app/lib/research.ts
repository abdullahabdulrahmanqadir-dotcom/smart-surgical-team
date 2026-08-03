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
};

type ApiPublication = {
  id: number; title: string; link?: string; imageUrl?: string; authorsFreeText?: string;
  abstract?: string; publishYearString?: string; publishYear?: string; englishCategory?: string; isActive?: boolean;
  authors?: { userProfileName?: string }[];
};

const FALLBACK_PUBLICATIONS: Publication[] = [
  { id: 1360, title: "Pomegranate peel extract and Helicobacter pylori eradication: an in vitro investigation", link: "https://www.pagepressjournals.org/jbr/article/view/14853/", imageUrl: "https://smarthealth.group/api/Images/Researches/a8020467-f1de-44b4-8e80-f9a34102723d.webp", authors: "Dr. Hoshmand Rahman Asaad, Dr. Sivan Hussein Salih, Dr. Dana Taib Gharib, Dr. Karokh Fazil Hama Hussien, Ayman Majid Mustafa", abstract: "This pilot study investigates the antibacterial effect of pomegranate peel extracts against Helicobacter pylori isolates collected from gastric biopsies.", date: "2026-07-07", year: "2026", category: "Paper" },
  { id: 1358, title: "Warthin-like variant of Papillary Thyroid Carcinoma", link: "https://academic.oup.com/rescon/advance-article/doi/10.1093/rescon/vmag089/8702819?login=false", imageUrl: "https://smarthealth.group/api/Images/Researches/97fe701a-a490-4694-b12e-b34cc520d3e4.webp", authors: "Dr. Aras Jamal Qadir, Ari Mohammed Abdullah, Dr. Hiwa Omer Ahmed, Dr. Abdulwahid M. Salih, and colleagues", abstract: "A retrospective case series examining the clinical, surgical and histopathological features of the rare Warthin-like variant of papillary thyroid carcinoma.", date: "2026-06-29", year: "2026", category: "Case Report" },
  { id: 1357, title: "Physical activity and functional rehabilitation in lower limb soft tissue sarcoma survivors", link: "https://www.sciencedirect.com/science/article/pii/S2949916X26000113", imageUrl: "https://smarthealth.group/api/Images/Researches/aa7177a4-7d9a-4750-9085-327ef9d22655.webp", authors: "Dr. Abdullah Kamal Ghafour, Fahmi H. Kakamad, Hawkar A. Nasralla, and colleagues", abstract: "A study of physical activity and functional rehabilitation in people recovering from lower-limb soft-tissue sarcoma.", date: "2026-06-20", year: "2026", category: "Paper" },
  { id: 1257, title: "Small bowel leiomyosarcoma: a case report and review of the literature", link: "https://academic.oup.com/jscr/article/2025/5/rjaf269/8124673?login=false", imageUrl: "https://smarthealth.group/api/Images/Researches/d5230acb-84eb-476a-b275-9fe2de6cf1ab-541x1080.png", authors: "Rebaz O Mohammed, Rawa M Ali, Deari A Ismaeil, Fahmi H Kakamad, and colleagues", abstract: "A clinical case report and review of the literature exploring the diagnosis and management of a rare small-bowel malignancy.", date: "2025-05-03", year: "2025", category: "Paper" },
];

const EXCLUDED_TITLES = new Set([
  "giant malignant phyllodes tumor with ulceration: a case report and brief review of the literature",
]);

function plainText(html = "") { return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }

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
    if (!abdulwahidPapers.length) return FALLBACK_PUBLICATIONS.filter((paper) => /abdulwahid/i.test(paper.authors));
    return abdulwahidPapers.map((item) => {
      const date = item.publishYearString ?? item.publishYear?.slice(0, 10) ?? "";
      return { id: item.id, title: item.title, link: item.link!, imageUrl: item.imageUrl ?? "", authors: item.authorsFreeText ?? "Smart Health research team", abstract: plainText(item.abstract), date, year: date.slice(0, 4) || "Research", category: item.englishCategory ?? "Publication" };
    }).sort((a, b) => b.date.localeCompare(a.date));
  } catch { return FALLBACK_PUBLICATIONS; }
}
