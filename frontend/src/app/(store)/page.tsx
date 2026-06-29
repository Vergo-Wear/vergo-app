import Hero from "@/components/Hero/Hero";
import Collection from "@/components/Collection/Collection";
import Newsletter from "@/components/Newsletter/Newsletter";

export default function Home() {
  return (
    <>
      <div className="hero-collection-container">
        <Hero />
        <Collection />
      </div>
      <Newsletter />
    </>
  );
}
