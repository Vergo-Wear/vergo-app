"use client";

import "./hero.css";

export default function Hero() {
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
          AVAILABLE NOW
        </span>

        <h1>
          FALL /
          <br />
          WINTER
          <br />
          DROP 01
        </h1>

        <p>
          Decentralized inventory.
          Proof of authenticity for every thread.
        </p>

        <button onClick={handleScrollToCollection}>
          Shop Latest Drop
        </button>

      </div>
    </section>
  );
}