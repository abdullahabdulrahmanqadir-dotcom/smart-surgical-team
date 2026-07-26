/* These are small, fixed local PNGs. vinext's Next Image compatibility route
   does not currently serve them reliably, so direct static delivery is the
   more robust Cloudflare Workers path. */
/* eslint-disable @next/next/no-img-element */
import { topicIcons, type TopicIconName } from "./icons";

export default function TopicGlyph({
  icon,
  imageIcon,
  size,
}: {
  icon: TopicIconName;
  imageIcon?: string;
  size: number;
}) {
  if (imageIcon) {
    return (
      <img
        className="topic-image-icon"
        src={imageIcon}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
      />
    );
  }

  const Glyph = topicIcons[icon];
  return <Glyph size={size} />;
}
