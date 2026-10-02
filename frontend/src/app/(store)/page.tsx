import Hero from "@/components/Hero/Hero";
import Highlights from "@/components/Highlights/Highlights";
import Craftsmanship from "@/components/Craftsmanship/Craftsmanship";
import Reviews from "@/components/Reviews/Reviews";
import Newsletter from "@/components/Newsletter/Newsletter";

export default function Home() {
  return (
    <>
      {/* 1. Carnage-style Hero: Full-bleed campaign video/image, bold italic headline, dual action buttons */}
      <Hero />

      {/* 2. Shop The Latest Styles: Newly released catalog directly from the database */}
      <Highlights />

      {/* 3. The Vergo Standard Craftsmanship */}
      <Craftsmanship />

      {/* 4. Verified Community Feedbacks (Managed from Admin) */}
      <Reviews />

      {/* 5. Stay In The Loop Newsletter */}
      <Newsletter />
    </>
  );
}
