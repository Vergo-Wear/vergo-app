import React from "react";
import Link from "next/link";

interface Props {
  label: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
}

export default function AboutCard({ label, title, subtitle, image, link = "/collection" }: Props) {
  return (
    <Link href={link} className="group relative block bg-[#0a0a0d] rounded-xl overflow-hidden border border-white/10 hover:border-[#50C878]/40 transition-all duration-300 h-80 sm:h-96 shadow-xl">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-6 sm:p-8">
        <div className="w-full flex items-end justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-black tracking-[0.2em] text-[#50C878] uppercase mb-1.5">
              {label}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#a1a1aa] mt-1 font-light line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          <div className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-[#50C878] text-white group-hover:text-black flex items-center justify-center transition-all duration-300 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
