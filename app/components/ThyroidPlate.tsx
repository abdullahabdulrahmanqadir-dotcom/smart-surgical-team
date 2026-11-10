export default function ThyroidPlate({ label }: { label: string }) {
  return (
    <figure className="editorial-plate">
      <svg viewBox="13 8 364 268" aria-hidden="true" width="364" height="268">
        <defs>
          <radialGradient id="sst-paper"><stop stopColor="currentColor" stopOpacity=".14"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient>
          <linearGradient id="sst-thyroid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="var(--brand-copper)" stopOpacity=".28"/>
            <stop offset="1" stopColor="var(--brand-copper)" stopOpacity=".68"/>
          </linearGradient>
          <pattern id="sst-etching" patternUnits="userSpaceOnUse" width="5" height="5"><path d="M-1 5 5-1M4 6 6 4" fill="none" stroke="var(--thyroid-ink)" strokeWidth=".55" opacity=".42"/></pattern>
          <path id="sst-gland" d="M187 183c-18-2-21-24-28-40-7-15-19-19-28-9-13 15-15 51-10 74 4 18 13 29 26 29 19 1 25-17 30-30 4-11 30-11 35 0 6 13 11 31 30 30 13 0 22-11 26-29 5-23 3-59-10-74-9-10-21-6-28 9-7 16-10 38-28 40z"/>
        </defs>
        <ellipse cx="195" cy="151" rx="177" ry="141" fill="url(#sst-paper)"/>
        <g fill="none" stroke="currentColor">
          <path opacity=".38" strokeWidth="1.5" d="M115 17c4 25 8 45 20 63l-4 70c-3 30-15 48-38 64-22 15-47 24-78 45m260-242c-4 25-8 45-20 63l4 70c3 30 15 48 38 64 22 15 47 24 78 45M135 80c18-5 35-19 60-19s42 14 60 19"/>
          <path opacity=".35" d="M52 246c42-17 82-19 120 0m166 0c-42-17-82-19-120 0M96 246c26-6 49-4 68 6m162-6c-26-6-49-4-68 6M153 89c5 29 0 58-14 81m98-81c-5 29 0 58 14 81M110 217c14-11 24-22 32-37m138 37c-14-11-24-22-32-37"/>
          <path d="M169 103c9 5 18 5 26-2 8 7 17 7 26 2l-7 23-19 12-19-12z" fill="currentColor" fillOpacity=".11" strokeOpacity=".6"/>
          <path d="M178 135q17 10 34 0v113q-17 10-34 0z" fill="currentColor" fillOpacity=".12" strokeOpacity=".46"/>
          <path opacity=".47" d="M178 148q17 9 34 0m-34 12q17 9 34 0m-34 12q17 9 34 0m-34 42q17 9 34 0m-34 12q17 9 34 0m-34 12q17 9 34 0"/>
          <use href="#sst-gland" fill="url(#sst-thyroid)" stroke="var(--thyroid-ink)" strokeWidth="1.7"/>
          <use href="#sst-gland" fill="url(#sst-etching)" stroke="none"/>
          <path opacity=".55" stroke="var(--thyroid-ink)" d="M140 155c-13 24-12 47-2 62m112-62c13 24 12 47 2 62"/>
        </g>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
