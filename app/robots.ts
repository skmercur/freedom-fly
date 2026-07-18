import type { MetadataRoute } from "next";

// Required so the route emits a static file under `output: export`.
export const dynamic = "force-static";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://freedom-fly.online";

/** Generated to a static /robots.txt at build time (works with output:export). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
