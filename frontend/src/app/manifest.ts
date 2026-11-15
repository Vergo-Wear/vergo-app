import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VERGO | Premium Streetwear Sri Lanka",
    short_name: "VERGO",
    description:
      "Modern minimalist streetwear and oversized essentials engineered in Sri Lanka. Shop luxury tees, hoodies, and premium silhouettes online at vergo.lk.",
    start_url: "/",
    display: "standalone",
    background_color: "#020202",
    theme_color: "#020202",
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
