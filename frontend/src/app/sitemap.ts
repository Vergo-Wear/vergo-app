import type { MetadataRoute } from "next";

export const revalidate = 3600; // Revalidate sitemap at most every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://vergo.lk";
  const now = new Date();

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/collection`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:3001";

  // Dynamic product routes from live catalogue
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${apiUrl}/product-catalogue`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const items = (await res.json()) as Array<{
        product_id?: string;
        id?: string;
        status?: string;
      }>;

      if (Array.isArray(items) && items.length > 0) {
        const productRoutes: MetadataRoute.Sitemap = items
          .filter(
            (item) =>
              (Boolean(item.product_id) || Boolean(item.id)) &&
              item.status !== "hold"
          )
          .map((item) => {
            const id = item.product_id || item.id;
            return {
              url: `${baseUrl}/collection/${id}`,
              lastModified: now,
              changeFrequency: "weekly" as const,
              priority: 0.8,
            };
          });

        return [...staticRoutes, ...productRoutes];
      }
    }
  } catch (error) {
    // If backend is unreachable or local dev is offline, cleanly fall back to static core routes
  }

  return staticRoutes;
}
