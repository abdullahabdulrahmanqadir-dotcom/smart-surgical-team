"use client";

import { useEffect, useState } from "react";

type Labels = { days: string; hours: string; minutes: string; live: string; past: string; until: string };

function remaining(target: number, now: number) {
  const total = Math.max(0, target - now);
  const minutes = Math.floor(total / 60_000);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
}

/**
 * Days, hours and minutes to the summit's opening day.
 *
 * The page may be served from cache, so the server's numbers can be up to a
 * cache window old; the client recomputes on mount and every 30 seconds. The
 * numbers carry `suppressHydrationWarning` for exactly that gap. Without
 * JavaScript the server's figures still read correctly to the day.
 */
export default function SummitCountdown({ opensAt, closesAt, labels, locale }: { opensAt: string; closesAt: string; labels: Labels; locale: string }) {
  const target = new Date(opensAt).getTime();
  const end = new Date(closesAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (now >= end) return <p className="summit-countdown-state">{labels.past}</p>;
  if (now >= target) return <p className="summit-countdown-state summit-countdown-live"><span aria-hidden="true" />{labels.live}</p>;

  const left = remaining(target, now);
  const format = new Intl.NumberFormat(locale === "ar" ? "ar" : "en", { minimumIntegerDigits: 2 });
  const units = [
    [left.days, labels.days],
    [left.hours, labels.hours],
    [left.minutes, labels.minutes],
  ] as const;

  return (
    <div className="summit-countdown">
      <p className="summit-countdown-label">{labels.until}</p>
      {/* Read as one sentence by assistive tech; the ticking digits are hidden
          so a screen reader is not interrupted every half minute. */}
      <p className="visually-hidden" suppressHydrationWarning>{units.map(([value, label]) => `${value} ${label}`).join(", ")}</p>
      <ol className="summit-countdown-units" aria-hidden="true">
        {units.map(([value, label]) => (
          <li key={label}>
            <span className="summit-countdown-value" suppressHydrationWarning>{format.format(value)}</span>
            <span className="summit-countdown-unit">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
