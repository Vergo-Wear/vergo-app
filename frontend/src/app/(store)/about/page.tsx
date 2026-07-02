import AboutHero from "@/components/About/AboutHero";
import BrandStatement from "@/components/About/BrandStatement";
import CollectionsGrid from "@/components/About/CollectionsGrid";

export const metadata = {
  title: "About — VERGO",
  description: "About VERGO Streetwear Labs",
};

export default function AboutPage() {
  return (
    <main className="w-full min-h-screen text-white">
      <AboutHero />
      <BrandStatement />
      <CollectionsGrid />
    </main>
  );
}
