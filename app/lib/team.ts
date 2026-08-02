export type TeamMember = {
  name: string;
  credentials: string;
  role: string;
  portrait: string;
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
      { name: "Hardi M. Zahir", credentials: "F.I.B.M.S. (General Surgery)", role: "Head & Neck & Thyroid Surgery", portrait: "/staff/Hardi M. Zahir.avif" },
      { name: "Karzan M. Salih", credentials: "F.I.B.M.S. (General Surgery)", role: "Head & Neck & Thyroid Surgery", portrait: "/staff/Karzan M. Salih.avif" },
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
      { name: "Mohammed L. Ahmad", credentials: "M.B.Ch.B.", role: "Doctor", portrait: "/staff/Mohammed L. Ahmad.avif" },
      { name: "Abdullah O. Hassan", credentials: "S.H.O.", role: "Doctor", portrait: "/staff/Abdullah O. Hassan.avif" },
    ],
  },
];
