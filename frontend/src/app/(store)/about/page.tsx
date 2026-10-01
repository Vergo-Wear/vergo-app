import AboutHero from "@/components/About/AboutHero";
import BrandStatement from "@/components/About/BrandStatement";
import CollectionsGrid from "@/components/About/CollectionsGrid";
import Craftsmanship from "@/components/Craftsmanship/Craftsmanship";
import Newsletter from "@/components/Newsletter/Newsletter";

export const metadata = {
  title: "About — VERGO ARCHIVAL WEAR",
  description: "Learn about VERGO Streetwear Labs, 280 GSM heavyweight craftsmanship, and decentralized garment verification.",
};

export default function AboutPage() {
  return (
    <main className="w-full min-h-screen text-white bg-[#020202]">
      <AboutHero />
      <BrandStatement />
      <Craftsmanship />
      <CollectionsGrid />
      <Newsletter />
    </main>
  );
}
