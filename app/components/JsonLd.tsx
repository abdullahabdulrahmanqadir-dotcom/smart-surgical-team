import { serializeJsonLd } from "../lib/structured-data";

/** One schema.org block. The serializer escapes `<`, so database text cannot close the tag. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
