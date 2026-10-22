import AboutHero from "@/components/About/AboutHero";
import BrandStatement from "@/components/About/BrandStatement";
import OwnerStory from "@/components/About/OwnerStory";
import CollectionsGrid from "@/components/About/CollectionsGrid";
import Newsletter from "@/components/Newsletter/Newsletter";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | The Atelier & Craftsmanship",
  description:
    "Discover VERGO Streetwear Labs. Engineered in Sri Lanka with architectural tailoring, 280 GSM high-density combed cotton, and an uncompromising minimalist streetwear aesthetic.",
  alternates: {
    canonical: "https://vergo.lk/about",
  },
  openGraph: {
    title: "About Us | VERGO Wear Atelier",
    description:
      "Engineered in Sri Lanka with architectural tailoring and 280 GSM high-density cotton. Discover our story and atelier craftsmanship.",
    url: "https://vergo.lk/about",
    type: "website",
    images: [
      {
        url: "/images/showroom.png",
        width: 1200,
        height: 630,
        alt: "VERGO Atelier & Showroom",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | VERGO Wear Atelier",
    description:
      "Discover the story and craftsmanship behind VERGO Streetwear Labs Sri Lanka.",
    images: ["/images/showroom.png"],
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://vergo.lk",
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "About Us",
          "item": "https://vergo.lk/about",
        },
      ],
    },
    {
      "@type": "AboutPage",
      "@id": "https://vergo.lk/about#webpage",
      "url": "https://vergo.lk/about",
      "name": "About VERGO Wear",
      "description":
        "Discover VERGO Streetwear Labs, our founder journey, and atelier craftsmanship in Colombo, Sri Lanka.",
      "publisher": {
        "@type": "Organization",
        "name": "VERGO Wear",
        "url": "https://vergo.lk",
      },
    },
  ],
};


export default function AboutPage() {
  return (
    <main className="w-full min-h-screen text-white bg-[#020202]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <AboutHero />
      <BrandStatement />
      <OwnerStory />
      <CollectionsGrid />
      <Newsletter />
    </main>
  );
}
