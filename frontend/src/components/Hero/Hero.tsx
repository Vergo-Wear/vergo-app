"use client";

import React, { useEffect, useState } from "react";
import "./hero.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Hero() {
  const [badge, setBadge] = useState("AVAILABLE NOW");
  const [title, setTitle] = useState("FALL /\nWINTER\nDROP 01");
  const [subtitle, setSubtitle] = useState("Decentralized inventory. Proof of authenticity for every thread.");
  const [buttonText, setButtonText] = useState("Shop Latest Drop");

  useEffect(() => {
    fetch(`${API_URL}/customization`)
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.heroBadge) setBadge(data.heroBadge);
          if (data.heroTitle) setTitle(data.heroTitle);
          if (data.heroSubtitle) setSubtitle(data.heroSubtitle);
          if (data.heroButtonText) setButtonText(data.heroButtonText);
        }
      })
      .catch((err) => console.error("Failed to load hero customizations", err));
  }, []);

  const handleScrollToCollection = () => {
    const element = document.getElementById("highlights");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="hero">
      <div className="hero-overlay">
        <span className="available">
          {badge}
        </span>

        <h1>
          {title.split("\n").map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < title.split("\n").length - 1 && <br />}
            </React.Fragment>
          ))}
        </h1>

        <p>
          {subtitle}
        </p>

        <button onClick={handleScrollToCollection}>
          {buttonText}
        </button>
      </div>
    </section>
  );
}