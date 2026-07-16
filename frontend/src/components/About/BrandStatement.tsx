"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function BrandStatement() {
  const [badge, setBadge] = useState("Brand Statement");
  const [title, setTitle] = useState("A new standard in streetwear");
  const [description, setDescription] = useState("Since day one we've been rethinking how clothing is made and owned: from design and material sourcing to transparent supply chains and authenticated ownership. Every piece is engineered to last and to tell a story.");

  useEffect(() => {
    fetch(`${API_URL}/customization`)
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.brandStatementBadge) setBadge(data.brandStatementBadge);
          if (data.brandStatementTitle) setTitle(data.brandStatementTitle);
          if (data.brandStatementDescription) setDescription(data.brandStatementDescription);
        }
      })
      .catch((err) => console.error("Failed to load brand statement customizations", err));
  }, []);

  return (
    <section id="brand" className="w-full border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <span className="text-sm font-extrabold tracking-widest text-emerald-400 uppercase">
          {badge}
        </span>
        <h2 className="mt-6 text-3xl md:text-4xl font-extrabold text-white">
          {title}
        </h2>
        <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-4xl mx-auto font-light leading-relaxed">
          {description}
        </p>
      </div>
    </section>
  );
}
