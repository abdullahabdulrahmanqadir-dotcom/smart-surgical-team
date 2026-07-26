/**
 * The "immersive moment" for the Topics pages. Deliberately not the home page
 * AnatomyHero: reusing that exact component on a second page makes the site
 * feel smaller than it is. This is the same visual family — contour lines and
 * nodes over a teal field — composed as a wide band rather than a portrait.
 *
 * Purely decorative and static: no animation loop, so it costs nothing at
 * runtime and has nothing to disable for reduced-motion.
 */
export default function TopicHero({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="topic-hero">
      <div className="topic-hero-inner">
        <div className="topic-hero-copy">
          <h1>{title}</h1>
          <p className="topic-hero-intro">{intro}</p>
          {children}
        </div>

        <div className="topic-hero-art" aria-hidden="true">
          <svg viewBox="0 0 620 420" preserveAspectRatio="xMidYMid slice" role="presentation">
          <defs>
            <linearGradient id="th-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--brand-teal)" stopOpacity="0.55" />
              <stop offset="60%" stopColor="var(--brand-teal)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--brand-teal)" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="th-glow" cx="0.7" cy="0.4" r="0.6">
              <stop offset="0%" stopColor="var(--brand-aqua)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--brand-aqua)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="620" height="420" fill="url(#th-glow)" />

          {/* Contour field — concentric arcs suggesting anatomical section. */}
          <g fill="none" stroke="url(#th-fade)" strokeWidth="1.1">
            {Array.from({ length: 14 }, (_, i) => (
              <path
                key={i}
                d={`M ${-48 + i * 14} 420 C ${120 + i * 18} ${300 - i * 11}, ${280 + i * 15} ${
                  350 - i * 14
                }, ${670} ${135 - i * 9}`}
              />
            ))}
          </g>

          {/* Nodes along the field, echoing the home page hero's particles. */}
          <g fill="var(--brand-teal)" opacity="0.35">
            {[
              [118, 236],
              [195, 182],
              [286, 257],
              [374, 156],
              [447, 222],
              [539, 141],
            ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
            ))}
          </g>
        </svg>
        </div>
      </div>
    </section>
  );
}
