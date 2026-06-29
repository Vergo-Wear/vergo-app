import Hero from "@/components/Hero/Hero";
import Highlights from "@/components/Highlights/Highlights";
import Newsletter from "@/components/Newsletter/Newsletter";

export default function Home() {
  return (
    <>
      <div className="hero-collection-container">
        <Hero />
        <Highlights />
      </div>
      <Newsletter />
    </>
  );
}
