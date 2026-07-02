import AboutCard from "./AboutCard";

export default function CollectionsGrid() {
  return (
    <section className="w-full">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <span className="text-sm font-extrabold tracking-widest text-emerald-400 uppercase">Collections</span>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold">Explore our signature collections</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AboutCard label="Featured" title="Signature Drop" image="/images/hoodie.png" />
          <AboutCard label="Explore" title="Essentials Line" image="/images/tee.png" />
        </div>
      </div>
    </section>
  );
}
