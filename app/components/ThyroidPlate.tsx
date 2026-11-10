export default function ThyroidPlate({ description }: { description: string }) {
  return (
    <figure className="editorial-plate">
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
    </figure>
  );
}
