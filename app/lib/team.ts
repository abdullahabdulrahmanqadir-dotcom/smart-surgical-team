import type { Dictionary } from "./dictionaries";

export type TeamMember = {
  name: string;
  credentials: string;
  role: string;
  portrait: string;
  /** Kept in the roster (portraits, research author matching) but not rendered on the About page. */
  hidden?: boolean;
};

export type TeamGroup = {
  title: string;
  intro?: string;
  members: TeamMember[];
};

// Ordered to match the original SST site. Only members with an approved local
// individual portrait are shown; no group photo or substitute image is used.
export const TEAM_GROUPS: TeamGroup[] = [
  {
    title: "Surgical Team",
    members: [
      { name: "Prof. Abdulwahid M. Salih", credentials: "M.D. (General Surgery)", role: "Head & Neck & Thyroid Surgery", portrait: "/staff/Prof. Abdulwahid M. Salih.avif" },
      { name: "Yadgar A. Saeed", credentials: "F.I.B.M.S. (General Surgery)", role: "Head & Neck & Thyroid Surgery", portrait: "/staff/Yadgar A. Saeed.avif" },
      { name: "Aso S. Muhialdeen", credentials: "F.K.B.M.S. (General Surgery)", role: "Head & Neck & Thyroid Surgery", portrait: "/staff/Aso S. Muhialdeen.avif" },
      { name: "Hardi M. Zahir", credentials: "F.I.B.M.S. (General Surgery)", role: "Head & Neck & Thyroid Surgery", portrait: "/staff/Hardi M. Zahir.avif", hidden: true },
      { name: "Karzan M. Salih", credentials: "F.I.B.M.S. (General Surgery)", role: "Head & Neck & Thyroid Surgery", portrait: "/staff/Karzan M. Salih.avif" },
      { name: "Imad S. Sedeeq", credentials: "F.I.B.M.S. (General Surgery)", role: "Head & Neck & Thyroid Surgery", portrait: "/staff/Imad S. Sedeeq.avif", hidden: true },
    ],
  },
  {
    title: "Specialist Contributors",
    intro: "Multidisciplinary expertise supporting surgical assessment, planning and follow-up.",
    members: [
      { name: "Aras J. Qaradaxy", credentials: "M.B.Ch.B. · F.K.B.M.S.", role: "Radiologist", portrait: "/staff/Aras J. Qaradaxy.avif" },
      { name: "Ari M. Abdullah", credentials: "K.B.M.S.-Path. · M.Sc. (Path.) · M.B.Ch.B.", role: "Pathologist", portrait: "/staff/Ari M. Abdullah,.avif" },
      { name: "Shaho F. Ahmed", credentials: "M.B.Ch.B. · F.K.B.M.S. (Internal Medicine, Diabetes & Endocrinology)", role: "Endocrinologist", portrait: "/staff/Shaho F. Ahmed.avif" },
    ],
  },
  {
    title: "Research Staff",
    intro: "Supporting thoughtful clinical research, data analysis and scientific communication.",
    members: [
      { name: "Shko H. Hassan", credentials: "M.B.Ch.B.", role: "Research Staff", portrait: "/staff/Shko H. Hassan.avif" },
      { name: "Abdullah A. Qadr", credentials: "M.B.Ch.B.", role: "Research Staff", portrait: "/staff/Abdullah A. Qadr.avif" },
    ],
  },
  {
    title: "SST Doctors",
    intro: "Clinical care and long-term support for people with thyroid and head and neck conditions.",
    members: [
      { name: "Saeed H. Ali", credentials: "M.B.Ch.B.", role: "Doctor", portrait: "/staff/Saeed H. Ali.avif" },
      { name: "Muhammad H. Ali", credentials: "M.B.Ch.B.", role: "Doctor", portrait: "/staff/Muhammad H. Ali.avif" },
      { name: "Osama A. Ali", credentials: "S.H.O.", role: "Doctor", portrait: "/staff/Osama A. Ali.avif" },
      { name: "Shallaw A. Nasradin", credentials: "S.H.O.", role: "Doctor", portrait: "/staff/Shallaw A. Nasradin.avif" },
      { name: "Kaihan A. Najar", credentials: "M.B.Ch.B.", role: "Doctor", portrait: "/staff/Kaihan A. Najar.avif", hidden: true },
      { name: "Mohammed L. Ahmad", credentials: "M.B.Ch.B.", role: "Doctor", portrait: "/staff/Mohammed L. Ahmad.avif" },
      { name: "Ahmad L. Ali", credentials: "M.B.Ch.B.", role: "Doctor", portrait: "/staff/Ahmad L. Ali.avif", hidden: true },
      { name: "Abdullah O. Hassan", credentials: "S.H.O.", role: "Doctor", portrait: "/staff/Abdullah O. Hassan.avif" },
    ],
  },
];

export function getLocalizedTeamGroups(t: Dictionary["team"]): TeamGroup[] {
  const copyFor = (name: string): Pick<TeamMember, "role" | "credentials"> => {
    switch (name) {
      case "Prof. Abdulwahid M. Salih": return { role: t.profAbdulwahidRole, credentials: t.profAbdulwahidCredentials };
      case "Yadgar A. Saeed": return { role: t.yadgarRole, credentials: t.yadgarCredentials };
      case "Aso S. Muhialdeen": return { role: t.asoRole, credentials: t.asoCredentials };
      case "Hardi M. Zahir": return { role: t.hardiRole, credentials: t.hardiCredentials };
      case "Karzan M. Salih": return { role: t.karzanRole, credentials: t.karzanCredentials };
      case "Imad S. Sedeeq": return { role: t.imadRole, credentials: t.imadCredentials };
      case "Aras J. Qaradaxy": return { role: t.arasRole, credentials: t.arasCredentials };
      case "Ari M. Abdullah": return { role: t.ariRole, credentials: t.ariCredentials };
      case "Shaho F. Ahmed": return { role: t.shahoRole, credentials: t.shahoCredentials };
      case "Shko H. Hassan": return { role: t.shkoRole, credentials: t.shkoCredentials };
      case "Abdullah A. Qadr": return { role: t.abdullahQadrRole, credentials: t.abdullahQadrCredentials };
      case "Saeed H. Ali": return { role: t.saeedRole, credentials: t.saeedCredentials };
      case "Muhammad H. Ali": return { role: t.muhammadRole, credentials: t.muhammadCredentials };
      case "Osama A. Ali": return { role: t.osamaRole, credentials: t.osamaCredentials };
      case "Shallaw A. Nasradin": return { role: t.shallawRole, credentials: t.shallawCredentials };
      case "Kaihan A. Najar": return { role: t.kaihanRole, credentials: t.kaihanCredentials };
      case "Mohammed L. Ahmad": return { role: t.mohammedRole, credentials: t.mohammedCredentials };
      case "Ahmad L. Ali": return { role: t.ahmadRole, credentials: t.ahmadCredentials };
      case "Abdullah O. Hassan": return { role: t.abdullahHassanRole, credentials: t.abdullahHassanCredentials };
      default: {
        const member = TEAM_GROUPS.flatMap((group) => group.members).find((candidate) => candidate.name === name);
        return { role: member?.role ?? "", credentials: member?.credentials ?? "" };
      }
    }
  };
  const groupCopy = [
    { title: t.surgicalTitle },
    { title: t.specialistTitle, intro: t.specialistIntro },
    { title: t.researchTitle, intro: t.researchIntro },
    { title: t.doctorsTitle, intro: t.doctorsIntro },
  ];
  return TEAM_GROUPS.map((group, index) => ({
    ...group,
    ...groupCopy[index],
    members: group.members
      .filter((member) => !member.hidden)
      .map((member) => ({ ...member, ...copyFor(member.name) })),
  }));
}
