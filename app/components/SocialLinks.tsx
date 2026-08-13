import { IconLinkedin } from "./icons";
import type { Dictionary } from "../lib/dictionaries";

const SMART_HEALTH_SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/smart-thyroid-subspecialty/", Icon: IconLinkedin },
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
