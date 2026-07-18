import type { MetadataRoute } from "next";

// Required so the route emits a static file under `output: export`.
export const dynamic = "force-static";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://freedom-fly.online";

/** Generated to a static /sitemap.xml at build time (works with output:export). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
