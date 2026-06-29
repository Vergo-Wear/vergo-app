"use client";

import { useState } from "react";
import Image from "next/image";
import "./footer.css";

export default function Footer() {
  const [activeModal, setActiveModal] = useState<"privacy" | "terms" | null>(null);

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-logo">
          <Image
            src="/images/wlogo.png"
            alt="VERGO"
            width={120}
            height={36}
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <div className="footer-nav">
          <button
            type="button"
            onClick={() => setActiveModal("privacy")}
            className="footer-link"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            PRIVACY POLICY
          </button>
          <button
            type="button"
            onClick={() => setActiveModal("terms")}
            className="footer-link"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            TERMS OF SERVICE
          </button>
          <a href="#" className="footer-link">CONTACT US</a>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} VERGO STREETWEAR LABS. ALL RIGHTS RESERVED.</p>
        </div>
      </div>

      {/* Modal Popup overlay */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-x-btn"
              onClick={() => setActiveModal(null)}
              aria-label="Close modal"
            >
              &times;
            </button>
            <h3 className="modal-title">
              {activeModal === "privacy" ? "Privacy Policy" : "Terms of Service"}
            </h3>
            <div className="modal-body">
              {activeModal === "privacy" ? (
                <p>
                  At VERGO STREETWEAR LABS, we value your privacy. We collect only necessary operational data like email, delivery addresses, and purchase history. All transactions are securely processed. We do not sell or share your data with third parties.
                </p>
              ) : (
                <p>
                  Welcome to VERGO. By accessing our platform, you agree to our terms. All products, designs, and content are the intellectual property of VERGO. Orders are subject to availability. Deliveries take 2-4 business days. Returns are accepted within 7 days in original condition.
                </p>
              )}
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setActiveModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}