export default function ThyroidPlate({
  description,
  structures,
}: {
  description: string;
  structures: readonly string[];
}) {
  return (
    <figure className="editorial-plate">
      <div className="editorial-plate-art">
        {/* The local WebP variants already match the displayed image sizes. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/thyroid-atlas-1024.webp"
          srcSet="/thyroid-atlas-640.webp 640w, /thyroid-atlas-1024.webp 1024w"
          sizes="(max-width: 425px) calc(100vw - 2.5rem), (max-width: 740px) 24rem, min(43vw, 32rem)"
          alt={description}
          width={1024}
          height={768}
          fetchPriority="high"
        />
        <svg className="editorial-plate-markers" viewBox="0 0 1448 1086" aria-hidden="true"
          textAnchor="middle" dominantBaseline="central">
          <circle cx="558" cy="574" r="42" />
          <text x="558" y="574">1</text>
          <circle cx="756" cy="360" r="42" />
          <text x="756" y="360">2</text>
          <circle cx="722" cy="824" r="42" />
          <text x="722" y="824">3</text>
        </svg>
      </div>
      <figcaption>
        <ol className="editorial-plate-key">
          {structures.map((name, index) => (
            <li key={name}><span aria-hidden="true">{index + 1}</span>{name}</li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
