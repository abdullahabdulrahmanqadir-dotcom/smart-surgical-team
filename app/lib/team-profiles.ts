import type { Locale } from "./i18n";

/**
 * Individual profile pages, written in code so they are reviewed like any other
 * copy change. A roster member gets a page by having an entry here; their name
 * then links to it from the About page, the homepage and paper author lists.
 *
 * Every figure must trace to a source the team has confirmed. Sources as of
 * 2026-10-07: operations total and paper count supplied by the team; citations
 * and h-index from his Google Scholar profile (U8XZfrsAAAAJ); education,
 * awards, memberships and the per-procedure counts from his Wikipedia article,
 * awaiting the team's confirmation.
 */
export type ProfileCopy = {
  /** Shown above the name. */
  kicker: string;
  /** The one-line claim under the name. */
  headline: string;
  intro: string;
  highlights: { value: string; label: string }[];
  sections: { title: string; paragraphs?: string[]; items?: string[] }[];
};

export type TeamProfile = {
  slug: string;
  /** Must equal the roster name in `team.ts`. */
  memberName: string;
  links: { label: string; href: string }[];
  copy: Record<Locale, ProfileCopy>;
};

export const TEAM_PROFILES: TeamProfile[] = [
  {
    slug: "abdulwahid-m-salih",
    memberName: "Prof. Abdulwahid M. Salih",
    links: [
      { label: "Google Scholar", href: "https://scholar.google.com/citations?user=U8XZfrsAAAAJ" },
      { label: "Wikipedia", href: "https://en.wikipedia.org/wiki/Abdulwahid_Muhammed_Salih" },
      { label: "drabdulwahid.com", href: "https://drabdulwahid.com/" },
      { label: "YouTube", href: "https://www.youtube.com/@DrAbdulWahid" },
    ],
    copy: {
      en: {
        kicker: "Founder · Smart Surgical Team",
        headline: "Iraq's best thyroid surgeon",
        intro:
          "Prof. Abdulwahid M. Salih is the founder of Smart Surgical Team and Smart Health Tower in Sulaymaniyah, and a professor at the University of Sulaimani College of Medicine. Over more than two decades he has performed more than 15,000 operations and published more than 200 papers, building the region's leading centre for thyroid and head & neck surgery.",
        highlights: [
          { value: "15,000+", label: "operations performed" },
          { value: "7,000+", label: "total thyroidectomies" },
          { value: "200+", label: "published papers" },
          { value: "2,100+", label: "citations on Google Scholar" },
        ],
        sections: [
          {
            title: "A surgeon patients travel for",
            paragraphs: [
              "Patients come to Prof. Abdulwahid from across Iraq and the wider region for the operations other centres refer on: recurrent goitre, thyroid cancer that has spread to the neck, parotid tumours and complex parathyroid disease. His caseload is among the largest of any thyroid surgeon in the Middle East.",
              "He leads a team of fellowship-trained surgeons, a radiologist, a pathologist and an endocrinologist, so every patient is planned, operated on and followed up by specialists who work side by side at Smart Health Tower.",
            ],
          },
          {
            title: "Surgical experience",
            items: [
              "More than 7,000 total thyroidectomies, including recurrent goitre and thyroid cancer",
              "More than 2,000 thyroid lobectomies",
              "More than 1,700 operations for papillary thyroid carcinoma",
              "More than 900 neck dissections",
              "More than 450 parotid operations",
              "More than 200 parathyroid operations",
              "More than 200 thyroglossal cyst (Sistrunk) operations",
              "More than 1,700 breast operations",
            ],
          },
          {
            title: "Research and teaching",
            paragraphs: [
              "Prof. Abdulwahid has published more than 200 papers, cited more than 2,100 times, with an h-index of 25 on Google Scholar. His work ranges from thyroid and parathyroid surgery to rare head and neck tumours, and every case the team publishes on this site comes from the operating room he leads.",
              "He is President of the Middle East Thyroid Summit, which brought international thyroid and endocrine surgeons to Sulaymaniyah in 2024 and again in August 2026.",
            ],
          },
          {
            title: "Education, awards and memberships",
            items: [
              "M.B.Ch.B., College of Medicine, Salahaddin University (1998)",
              "Ph.D. in Medicine, University of Khartoum (2005)",
              "Professor, College of Medicine, University of Sulaimani",
              "McGowan Award, Royal College of Surgeons in Ireland",
              "Member, Kurdistan Medical Association",
              "Member, Asian Society of Thyroid Surgery",
              "Member, Asian Hernia Society",
              "Member, International Pilonidal Society",
            ],
          },
        ],
      },
      ar: {
        kicker: "المؤسس · Smart Surgical Team",
        headline: "أفضل جرّاح للغدة الدرقية في العراق",
        intro:
          "البروفيسور عبدالواحد محمد صالح هو مؤسس Smart Surgical Team وSmart Health Tower في السليمانية، وأستاذ في كلية الطب بجامعة السليمانية. أجرى على مدى أكثر من عقدين أكثر من 15,000 عملية جراحية، ونشر أكثر من 200 بحث علمي، وبنى المركز الرائد في المنطقة لجراحة الغدة الدرقية والرأس والعنق.",
        highlights: [
          { value: "+15,000", label: "عملية جراحية" },
          { value: "+7,000", label: "استئصال كامل للغدة الدرقية" },
          { value: "+200", label: "بحث منشور" },
          { value: "+2,100", label: "استشهاد على Google Scholar" },
        ],
        sections: [
          {
            title: "جرّاح يقصده المرضى من كل مكان",
            paragraphs: [
              "يقصد المرضى البروفيسور عبدالواحد من مختلف أنحاء العراق والمنطقة للعمليات التي تحيلها المراكز الأخرى: الدراق الناكس، وسرطان الغدة الدرقية المنتشر إلى العنق، وأورام الغدة النكفية، وأمراض جارات الدرق المعقّدة. ويُعدّ عدد العمليات التي أجراها من بين الأعلى لدى جرّاحي الغدة الدرقية في الشرق الأوسط.",
              "يقود فريقًا من الجرّاحين الحاصلين على البورد، وأخصائي أشعة، وأخصائي أمراض، وأخصائي غدد صمّاء، بحيث يُخطَّط لعلاج كل مريض ويُجرى له التدخل الجراحي وتُتابع حالته على أيدي اختصاصيين يعملون جنبًا إلى جنب في Smart Health Tower.",
            ],
          },
          {
            title: "الخبرة الجراحية",
            items: [
              "أكثر من 7,000 عملية استئصال كامل للغدة الدرقية، منها الدراق الناكس وسرطان الغدة الدرقية",
              "أكثر من 2,000 عملية استئصال فص من الغدة الدرقية",
              "أكثر من 1,700 عملية لسرطان الغدة الدرقية الحليمي",
              "أكثر من 900 عملية تجريف للعنق",
              "أكثر من 450 عملية للغدة النكفية",
              "أكثر من 200 عملية لجارات الدرق",
              "أكثر من 200 عملية لكيس القناة الدرقية اللسانية (عملية سيسترانك)",
              "أكثر من 1,700 عملية للثدي",
            ],
          },
          {
            title: "البحث العلمي والتعليم",
            paragraphs: [
              "نشر البروفيسور عبدالواحد أكثر من 200 بحث علمي، استُشهد بها أكثر من 2,100 مرة، ومؤشر h لديه 25 على Google Scholar. تمتد أبحاثه من جراحة الغدة الدرقية وجارات الدرق إلى أورام الرأس والعنق النادرة، وكل حالة ينشرها الفريق على هذا الموقع مصدرها غرفة العمليات التي يقودها.",
              "وهو رئيس قمة الشرق الأوسط للغدة الدرقية التي جمعت جرّاحي الغدة الدرقية والغدد الصمّاء الدوليين في السليمانية عام 2024 ثم في آب/أغسطس 2026.",
            ],
          },
          {
            title: "التعليم والجوائز والعضويات",
            items: [
              "بكالوريوس الطب والجراحة، كلية الطب، جامعة صلاح الدين (1998)",
              "دكتوراه في الطب، جامعة الخرطوم (2005)",
              "أستاذ في كلية الطب، جامعة السليمانية",
              "جائزة ماكغوان، الكلية الملكية للجرّاحين في أيرلندا",
              "عضو نقابة أطباء كردستان",
              "عضو الجمعية الآسيوية لجراحة الغدة الدرقية",
              "عضو الجمعية الآسيوية للفتق",
              "عضو الجمعية الدولية للناسور العصعصي",
            ],
          },
        ],
      },
    },
  },
];

export function getTeamProfile(slug: string) {
  return TEAM_PROFILES.find((profile) => profile.slug === slug);
}

export function profileForMember(name: string) {
  return TEAM_PROFILES.find((profile) => profile.memberName === name);
}
