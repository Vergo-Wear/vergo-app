import Image from "next/image";

interface Props {
  label: string;
  title: string;
  image: string;
}

export default function AboutCard({ label, title, image }: Props) {
  return (
    <article className="relative bg-white/5 rounded-lg overflow-hidden shadow-sm h-72 md:h-80">
      <Image src={image} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6">
        <div>
          <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase">{label}</span>
          <h3 className="mt-2 text-xl font-extrabold uppercase">{title}</h3>
        </div>
      </div>
    </article>
  );
}
