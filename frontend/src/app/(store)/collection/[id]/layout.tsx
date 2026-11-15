import type { Metadata } from "next";
import { loadProductById } from "@/lib/products";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const product = await loadProductById(id);

    if (!product) {
      return {
        title: "Product Detail | VERGO Wear",
        description:
          "Discover luxury streetwear and oversized apparel at VERGO Wear Sri Lanka.",
      };
    }

    const title = `${product.name} | VERGO Wear`;
    const description =
      product.description?.trim() ||
      `Shop ${product.name} online at VERGO Wear Sri Lanka. Premium ${product.category || "streetwear"} engineered with heavyweight combed cotton and architectural oversized fit.`;

    const imageUrl = product.images?.[0] || product.image || "/logo.png";
    const fullImageUrl = imageUrl.startsWith("http")
      ? imageUrl
      : `https://vergo.lk${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;

    return {
      title,
      description,
      alternates: {
        canonical: `https://vergo.lk/collection/${id}`,
      },
      openGraph: {
        title,
        description,
        url: `https://vergo.lk/collection/${id}`,
        type: "website",
        images: [
          {
            url: fullImageUrl,
            alt: product.name,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [fullImageUrl],
      },
    };
  } catch {
    return {
      title: "Product | VERGO Wear",
      description: "Premium streetwear from VERGO Sri Lanka.",
    };
  }
}

export default async function ProductDetailLayout({
  children,
  params,
}: LayoutProps) {
  const { id } = await params;
  let productJsonLd: any = null;

  try {
    const product = await loadProductById(id);
    if (product) {
      const rawPrice = product.lkrPrice || product.price || "0";
      const priceNum = parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || 0;
      const images = (product.images && product.images.length > 0
        ? product.images
        : [product.image || "/logo.png"]
      ).map((img) => (img.startsWith("http") ? img : `https://vergo.lk${img.startsWith("/") ? "" : "/"}${img}`));

      productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "image": images,
        "description":
          product.description ||
          `Premium ${product.name} from VERGO Wear Sri Lanka. High-density combed cotton with architectural boxy drape.`,
        "sku": product.id,
        "category": product.category || "Apparel",
        "brand": {
          "@type": "Brand",
          "name": "VERGO",
        },
        "offers": {
          "@type": "Offer",
          "url": `https://vergo.lk/collection/${id}`,
          "priceCurrency": "LKR",
          "price": priceNum,
          "priceValidUntil": "2027-12-31",
          "itemCondition": "https://schema.org/NewCondition",
          "availability": product.isAvailable
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": "VERGO Wear",
          },
        },
      };
    }
  } catch (e) {
    console.warn("Failed to generate Product JSON-LD:", e);
  }

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
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Product",
        "item": `https://vergo.lk/collection/${id}`,
      },
    ],
  };

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
