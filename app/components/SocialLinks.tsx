import {
  IconFacebook,
  IconInstagram,
  IconLinkedin,
  IconTikTok,
  IconX,
  IconYoutube,
} from "./icons";
import type { Dictionary } from "../lib/dictionaries";

const SMART_HEALTH_SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/SmartHTA", Icon: IconFacebook },
  { label: "Instagram", href: "https://www.instagram.com/smarthealthtowerarabic/", Icon: IconInstagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/smart-health-tower/", Icon: IconLinkedin },
  { label: "TikTok", href: "https://www.tiktok.com/@smarthealthtowerarabic?_t=8cT8B1EIlHy&_r=1", Icon: IconTikTok },
  { label: "X", href: "https://twitter.com/smarthealthtow2", Icon: IconX },
  { label: "YouTube", href: "https://www.youtube.com/channel/UC03cV_1kafDf1uyZPXx93CA", Icon: IconYoutube },
];

export default function SocialLinks({ className, t }: { className: string; t: Dictionary["social"] }) {
  return (
    <div className={className} aria-label={t.ariaLabel}>
      {SMART_HEALTH_SOCIALS.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}
