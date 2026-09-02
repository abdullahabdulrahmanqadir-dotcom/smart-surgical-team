type IconProps = {
  className?: string;
  size?: number;
};

function svgProps({ className, size = 20 }: IconProps) {
  return {
    className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...svgProps(props)} fill="currentColor" stroke="none">
      <path d="M8 5.6c0-.8.9-1.3 1.6-.9l8 6.4c.6.4.6 1.4 0 1.8l-8 6.4c-.7.4-1.6-.1-1.6-.9V5.6Z" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconFullscreen(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M8.5 4.5h-4v4M15.5 4.5h4v4M19.5 15.5v4h-4M4.5 15.5v4h4" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3.5 19.5a6 6 0 0 1 12 0" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.5a6 6 0 0 1 3 5" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="m4 8 7.1 4.7a1.7 1.7 0 0 0 1.8 0L20 8" />
    </svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M19 10.5c0 5-7 10.5-7 10.5S5 15.5 5 10.5a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10.3" r="2.6" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.4 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.4-3.3-8.5S9.8 5.9 12 3.5Z" />
    </svg>
  );
}

export function IconYoutube(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="2.8" y="5.5" width="18.4" height="13" rx="4" />
      <path d="m10.4 9.4 4.6 2.6-4.6 2.6V9.4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLinkedin(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 10.5v6M8 7.6v.1M12 16.5v-6M12 13a2.5 2.5 0 0 1 5 0v3.5" />
    </svg>
  );
}

export function IconFacebook(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M14.5 21v-7.8h2.8l.4-3.2h-3.2V8c0-.9.3-1.6 1.6-1.6H18V3.6c-.4-.1-1.2-.1-2.2-.1-2.5 0-4.2 1.5-4.2 4.4v2.3H9v3.2h2.6V21" />
    </svg>
  );
}

export function IconInstagram(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M17.4 6.7h.1" strokeWidth="2.5" />
    </svg>
  );
}

export function IconTikTok(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M14.5 4.2c.6 2.2 2.2 3.8 4.4 4.3v3c-1.6-.1-3.1-.7-4.4-1.6v5.7a4.8 4.8 0 1 1-4.2-4.8v3.1a1.8 1.8 0 1 0 1.2 1.7V4.2h3Z" />
    </svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10.4 13.6a3.9 3.9 0 0 0 5.6 0l2.7-2.7a3.9 3.9 0 0 0-5.5-5.6l-1.3 1.3" />
      <path d="M13.6 10.4a3.9 3.9 0 0 0-5.6 0l-2.7 2.7a3.9 3.9 0 0 0 5.5 5.6l1.3-1.3" />
    </svg>
  );
}

export function IconWhatsApp(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M20.4 11.8a8.4 8.4 0 0 1-12.4 7.4l-4.4 1.2 1.2-4.3A8.4 8.4 0 1 1 20.4 11.8Z" />
      <path d="M9.4 8.8c.5-.2 1 .1 1.2.5l.5 1a.9.9 0 0 1-.2 1l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4a.9.9 0 0 1 1-.2l1 .5c.4.2.7.7.5 1.2-.2.7-.9 1.2-1.7 1.1a7.5 7.5 0 0 1-5.7-5.7c-.1-.8.4-1.5 1.1-1.7Z" />
    </svg>
  );
}

export function IconTelegram(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M20.7 4.4 3.4 11c-.6.2-.6 1.1 0 1.3l4.3 1.4 1.6 4.9c.2.5.9.6 1.2.2l2.3-2.5 4.3 3.2c.4.3 1 .1 1.1-.4l3-13.9c.1-.5-.4-1-1-.8Z" />
      <path d="m7.7 13.7 11-8-8 9" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M5 4.2 18.6 19.8M18.6 4.2 5 19.8" strokeWidth="2" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.1M12 19.1v2.1M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M2.8 12h2.1M19.1 12h2.1M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4.5 7h15M9 7V4.5h6V7M7 7l.8 13h8.4L17 7" />
      <path d="M10 10.5v6M14 10.5v6" />
    </svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.3l-1.8-5.7L4.5 10.8 10.2 9 12 3.5Z" />
      <path d="M18.5 3.5v3M20 5h-3" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M13.5 3.5H7a2.5 2.5 0 0 0-2.5 2.5v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5l-6-6Z" />
      <path d="M13.5 3.5v6h6M8.5 13.5h7M8.5 16.5h4.5" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m12 3.5 8.5 4.3-8.5 4.4-8.5-4.4L12 3.5Z" />
      <path d="m3.5 12.2 8.5 4.4 8.5-4.4M3.5 16.4l8.5 4.4 8.5-4.4" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 1 1 8 0V10M12 14v2" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3.5 12s3.1-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3.1 5.5-8.5 5.5S3.5 12 3.5 12Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 4 20 20M9.9 6.7A9.8 9.8 0 0 1 12 6.5c5.4 0 8.5 5.5 8.5 5.5a15.2 15.2 0 0 1-3.1 3.7M6.2 8.2A15.1 15.1 0 0 0 3.5 12s3.1 5.5 8.5 5.5c.8 0 1.5-.1 2.2-.3" />
      <path d="M9.6 9.6a3.4 3.4 0 0 0 4.8 4.8" />
    </svg>
  );
}

export function IconBookmark(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5V21L12 17.4 6.5 21V4.5Z" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M18.5 10.5a6.5 6.5 0 0 0-13 0c0 7-2.5 7.5-2.5 8.5h18c0-1-2.5-1.5-2.5-8.5ZM10 21h4" />
    </svg>
  );
}

export function IconSliders(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 7h5M14 7h6M4 17h9M18 17h2M9 4v6M13 14v6" />
    </svg>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H10M13.5 8l4 4-4 4M17 12H8" />
    </svg>
  );
}

/* ---------- Topic glyphs ---------- */

export function IconThyroid(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M8.6 6.5c-2 1.3-2.9 3.4-2.6 5.6.3 2.4 1.9 4.3 4 4.3 1.2 0 2-.8 2-2 0 1.2.8 2 2 2 2.1 0 3.7-1.9 4-4.3.3-2.2-.6-4.3-2.6-5.6" />
      <path d="M12 14.4v5.1M9.5 4.5h5" />
    </svg>
  );
}

export function IconSalivary(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3.8c3 3.4 5 6.1 5 8.6a5 5 0 0 1-10 0c0-2.5 2-5.2 5-8.6Z" />
      <path d="M9.8 12.8a2.4 2.4 0 0 0 2.3 3" />
    </svg>
  );
}

export function IconLarynx(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9 3.5v3.2c0 1-1.6 1.6-1.6 3.3v7.2A3.3 3.3 0 0 0 10.7 20.5h2.6a3.3 3.3 0 0 0 3.3-3.3V10c0-1.7-1.6-2.3-1.6-3.3V3.5" />
      <path d="M7.6 11.5h8.8M7.6 15h8.8" />
    </svg>
  );
}

export function IconOral(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3.8 12c2.6-3.4 5.3-5.1 8.2-5.1s5.6 1.7 8.2 5.1c-2.6 3.4-5.3 5.1-8.2 5.1S6.4 15.4 3.8 12Z" />
      <path d="M7.5 10.4c3-1 6-1 9 0M8.5 14.6c2.4.8 4.6.8 7 0" />
    </svg>
  );
}

export function IconOncology(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" />
    </svg>
  );
}

export function IconSkull(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3.5a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.2 4 2.4 5 .7.6 1.1 1.2 1.1 2v1.5h8v-1.5c0-.8.4-1.4 1.1-2 1.2-1 2.4-2.4 2.4-5A7.5 7.5 0 0 0 12 3.5Z" />
      <circle cx="9.3" cy="11.2" r="1.5" />
      <circle cx="14.7" cy="11.2" r="1.5" />
    </svg>
  );
}

export function IconSinus(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 4v7.3c0 1.3.6 2 1.7 2.5 1.4.6 2 1.6 1.7 2.8-.3 1.3-1.5 2-3.4 2H12" />
      <path d="M8.4 16.6c-1.9 0-3.1-.7-3.4-2-.3-1.2.3-2.2 1.7-2.8" />
      <path d="M8.5 20h7" />
    </svg>
  );
}

/**
 * Three reniform nodes threaded on the jugular chain, each keeping the hilar
 * notch a real node has. Drawn as solid ink rather than outline so it carries
 * the same weight as the thyroid and parotid marks beside it — a hairline
 * drawing next to those two silhouettes was why the row read as four unrelated
 * icons. The nodes are deliberately spaced: touching, they fuse into one blob.
 */
export function IconLymphNodes(props: IconProps) {
  return (
    <svg {...svgProps(props)} fill="currentColor" stroke="none">
      <path
        d="M21.6 2.2C20.5 3.2 19.4 4.2 18.3 5.2 16.3 7.5 14.2 9.7 12.2 12 10 14.3 7.8 16.6 5.6 18.9c-1 .9-2 1.8-2.9 2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.15}
        strokeLinecap="round"
      />
      <path
        transform="rotate(-32 18.3 5.2)"
        d="M18.3 2.7C20.71 2.7 21.66 3.9 21.66 5.2C21.66 6.5 20.71 7.7 18.3 7.7C15.94 7.7 14.51 7.06 17.16 5.2C14.51 3.34 15.94 2.7 18.3 2.7Z"
      />
      <path
        transform="rotate(-32 12.2 12)"
        d="M12.2 8.95C15.15 8.95 16.3 10.41 16.3 12C16.3 13.59 15.15 15.05 12.2 15.05C9.32 15.05 7.58 14.27 10.81 12C7.58 9.73 9.32 8.95 12.2 8.95Z"
      />
      <path
        transform="rotate(-32 5.6 18.9)"
        d="M5.6 16.15C8.26 16.15 9.29 17.47 9.29 18.9C9.29 20.33 8.26 21.65 5.6 21.65C3.01 21.65 1.44 20.94 4.34 18.9C1.44 16.86 3.01 16.15 5.6 16.15Z"
      />
    </svg>
  );
}

/**
 * Skin in section: a raised lesion with the epidermal plane running up and
 * over it, the deep plane beneath, and the lobulated subcutaneous layer at the
 * bottom. Two things keep it from reading as a hat — the planes follow the
 * lesion rather than passing under it, and the sides run to the edge of the
 * box, so it reads as a section rather than an object.
 */
export function IconSkinLayers(props: IconProps) {
  return (
    <svg {...svgProps(props)} fill="currentColor" stroke="none" fillRule="evenodd">
      <path d="M1.6 10.4H5.4C7.2 10.4 7.6 6.6 9.9 6.5C12.5 6.4 13.1 10 15.2 10.4C16.7 10.7 16.9 10.7 18.2 10.6H22.4V18.6C22.4 20.3 21.2 21 19.9 21C18.7 21 17.9 20.45 17.2 20.45C16.5 20.45 15.8 21 14.6 21C13.4 21 12.7 20.45 12 20.45C11.3 20.45 10.6 21 9.4 21C8.2 21 7.5 20.45 6.8 20.45C6.1 20.45 5.4 21 4.2 21C2.9 21 1.6 20.3 1.6 18.6ZM1.6 12.7H5.4C7.2 12.7 7.6 8.9 9.9 8.8C12.5 8.7 13.1 12.3 15.2 12.7C16.7 13 16.9 13 18.2 12.9H22.4V13.9H18.2C16.8 14 16.5 14 15 13.7C12.9 13.2 12.4 9.8 9.9 9.9C7.8 10 7.4 13.9 5.4 13.9H1.6ZM1.6 16.6H22.4V17.5H1.6Z" />
    </svg>
  );
}

export function IconPediatric(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="8" r="4.5" />
      <path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0" />
      <path d="M10.3 7.6v.1M13.7 7.6v.1M10.6 10.2a2.4 2.4 0 0 0 2.8 0" />
    </svg>
  );
}

export const topicIcons = {
  thyroid: IconThyroid,
  parotid: IconSalivary,
  lymph: IconLymphNodes,
  skin: IconSkinLayers,
  larynx: IconLarynx,
  oral: IconOral,
  oncology: IconOncology,
  skull: IconSkull,
  sinus: IconSinus,
  pediatric: IconPediatric,
} as const;

export type TopicIconName = keyof typeof topicIcons;

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/sst-mark.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="brand-mark"
    />
  );
}
