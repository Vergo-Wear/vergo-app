import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Collection from "@/components/Collection";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-grow">
        <div className="hero-collection-container">
          <Hero />
          <Collection />
        </div>
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
