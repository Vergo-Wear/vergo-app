import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collection | Premium Oversized Streetwear & Essentials",
  description:
    "Explore the full VERGO streetwear collection. Featuring 280 GSM heavyweight combed cotton tees, architectural boxy fits, and signature minimalist apparel engineered in Sri Lanka.",
  alternates: {
    canonical: "https://vergo.lk/collection",
  },
  openGraph: {
    title: "Collection | VERGO Wear Sri Lanka",
    description:
      "Explore the full VERGO streetwear catalog. Heavyweight cotton tees, boxy silhouettes, and signature drops available islandwide.",
    url: "https://vergo.lk/collection",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "VERGO Wear Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Collection | VERGO Wear Sri Lanka",
    description:
      "Explore the full VERGO streetwear catalog. Heavyweight cotton tees and boxy silhouettes.",
    images: ["/logo.png"],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
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
      "name": "Collection",
      "item": "https://vergo.lk/collection",
    },
  ],
};

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
