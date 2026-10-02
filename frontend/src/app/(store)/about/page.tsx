import AboutHero from "@/components/About/AboutHero";
import BrandStatement from "@/components/About/BrandStatement";
import OwnerStory from "@/components/About/OwnerStory";
import CollectionsGrid from "@/components/About/CollectionsGrid";
import Newsletter from "@/components/Newsletter/Newsletter";

export const metadata = {
  title: "About — VERGO ARCHIVAL WEAR",
  description: "Learn about VERGO Streetwear Labs, founder journey, and atelier craftsmanship.",
};

export default function AboutPage() {
  return (
    <main className="w-full min-h-screen text-white bg-[#020202]">
      <AboutHero />
      <BrandStatement />
      <OwnerStory />
      <CollectionsGrid />
      <Newsletter />
    </main>
  );
}
