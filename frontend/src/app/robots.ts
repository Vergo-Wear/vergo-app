import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://vergo.lk";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/collection", "/about"],
        disallow: [
          "/admin",
          "/admin/*",
          "/employee",
          "/employee/*",
          "/api",
          "/api/*",
          "/cart",
          "/checkout",
          "/profile",
          "/auth",
          "/auth/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
