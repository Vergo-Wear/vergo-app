import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#020202",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://vergo.lk"),
  title: {
    default: "VERGO | Premium Streetwear Sri Lanka | Oversized Essentials",
    template: "%s | VERGO Wear",
  },
  description:
    "VERGO is Sri Lanka's premier minimalist streetwear atelier. Discover oversized heavyweight tees, structured hoodies, and contemporary urban apparel engineered for modern aesthetics. Islandwide delivery at vergo.lk.",
  applicationName: "VERGO Wear",
  keywords: [
    "VERGO",
    "VERGO Wear",
    "vergo.lk",
    "streetwear Sri Lanka",
    "oversized t-shirts Sri Lanka",
    "heavyweight cotton tees",
    "luxury streetwear Colombo",
    "minimalist clothing Sri Lanka",
    "unisex streetwear Sri Lanka",
    "oversized hoodie Sri Lanka",
    "Sri Lankan streetwear brand",
    "urban fashion Sri Lanka",
    "carnage alternative Sri Lanka",
    "Colombo streetwear clothing",
  ],
  authors: [{ name: "VERGO Wear", url: "https://vergo.lk" }],
  creator: "VERGO Wear",
  publisher: "VERGO Wear",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://vergo.lk",
  },
  openGraph: {
    title: "VERGO | Premium Streetwear Sri Lanka | Oversized Essentials",
    description:
      "Modern minimalist streetwear and oversized essentials engineered in Sri Lanka. Shop luxury tees, hoodies, and silhouettes online at vergo.lk.",
    url: "https://vergo.lk",
    siteName: "VERGO Wear",
    locale: "en_LK",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "VERGO Wear - Premium Minimalist Streetwear Sri Lanka",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VERGO | Premium Streetwear Sri Lanka",
    description:
      "Modern minimalist streetwear and oversized essentials engineered in Sri Lanka. Shop online at vergo.lk.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  verification: {
    google: "googlea10ff89dd79763b9",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VERGO Wear",
    "alternateName": "VERGO",
    "url": "https://vergo.lk",
    "logo": "https://vergo.lk/logo.png",
    "description":
      "Premium minimalist streetwear atelier and oversized apparel engineered in Sri Lanka.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "No. 42 Atelier District",
      "addressLocality": "Colombo",
      "postalCode": "00700",
      "addressCountry": "LK",
    },
    "sameAs": [
      "https://instagram.com",
      "https://facebook.com",
      "https://x.com",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "VERGO Wear",
    "url": "https://vergo.lk",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://vergo.lk/collection?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased min-w-[320px]`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full min-w-[320px] flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

