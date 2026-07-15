import Link from "next/link";
import Image from "next/image";
import { getSupabaseImageUrlById } from "@/lib/supabase-images";

async function getAboutHeroImageUrl() {
  return getSupabaseImageUrlById(4, "/images/hero-bg.jpg");
}

export default async function AboutHero() {
  const heroImageUrl = await getAboutHeroImageUrl();

  return (
    <section className="relative w-full">
      <div className="relative h-[70vh] md:h-[60vh] lg:h-[72vh]">
        <Image
          src={heroImageUrl}
          alt="About background"
          fill
          sizes="100vw"
          className="object-cover"
          loading="eager"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/80 flex items-center">
          <div className="max-w-3xl mx-auto px-6 py-24 text-center">
            <span className="inline-block text-sm font-extrabold tracking-widest text-emerald-400 uppercase">
              Our Philosophy
            </span>
            <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight uppercase">
              Defining Modern Luxury
            </h1>
            <p className="mt-6 text-base md:text-lg text-gray-300 max-w-2xl mx-auto font-light">
              We craft premium streetwear with provenance and purpose — responsibly built,
              intentionally designed, and verifiably authentic.
            </p>

            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/collection"
                className="inline-flex items-center px-6 py-3 bg-emerald-500 text-black font-extrabold rounded-md shadow-md hover:opacity-95"
              >
                Shop Collection
              </Link>
              <a
                href="#brand"
                className="inline-flex items-center px-6 py-3 border border-white/10 text-white font-extrabold rounded-md hover:bg-white/5"
              >
                Our Story
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
