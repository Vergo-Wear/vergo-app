"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import "./footer.css";

export default function Footer() {
  const pathname = usePathname();
  const [hideFooter, setHideFooter] = useState(false);
  const [activeModal, setActiveModal] = useState<"privacy" | "terms" | "contact" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && pathname === "/auth/reset-password") {
      const urlParams = new URLSearchParams(window.location.search);
      const isRequired = urlParams.get("required") === "true";
      const rawUser = sessionStorage.getItem("vergo_user");
      let storedUser: any = null;
      if (rawUser) {
        try {
          storedUser = JSON.parse(rawUser);
        } catch (e) {}
      }
      if (isRequired || Boolean(storedUser?.mustChangePassword)) {
        setHideFooter(true);
        return;
      }
    }
    setHideFooter(false);
  }, [pathname]);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "General Inquiry",
    message: "",
  });
  const [contactError, setContactError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    window.open(
      "https://docs.google.com/forms/d/e/1FAIpQLScQm8fXIOkrtj5nlmwMWzneAcll5u4PudqJjCw9LhNn0aSfOg/viewform?usp=pp_url",
      "_blank",
      "noopener,noreferrer"
    );
    setFormData({
      fullName: "",
      email: "",
      subject: "General Inquiry",
      message: "",
    });
    setActiveModal(null);
  };

  if (hideFooter) return null;

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
          <button
            type="button"
            onClick={() => setActiveModal("contact")}
            className="footer-link"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            CONTACT US
          </button>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} VERGO STREETWEAR LABS. ALL RIGHTS RESERVED.</p>
        </div>
      </div>

      {/* Modal Popup overlay */}
      {activeModal && activeModal !== "contact" && (
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

      {/* Contact Us Modal overlay */}
      {activeModal === "contact" && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-x-btn"
              onClick={() => setActiveModal(null)}
              aria-label="Close modal"
            >
              &times;
            </button>
            <div className="contact-modal-grid">
              {/* Left Column: Form */}
              <div className="contact-form-section">
                <h2 className="contact-title">
                  GET IN <span className="text-accent-green">TOUCH</span>
                </h2>
                <p className="contact-desc">
                  Whether you're looking for order updates, exclusive collaborations, or private styling, our concierge team is on standby.
                </p>
                <form onSubmit={handleContactSubmit} className="contact-form">
                  {contactError && <p className="error-message">{contactError}</p>}
                  <div className="form-group">
                    <label htmlFor="fullName">FULL NAME</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="ALEXANDER VERGO"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="CONCIERGE@VERGO.COM"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subject">SUBJECT</label>
                    <div className="select-wrapper">
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Order Status">Order Status</option>
                        <option value="Collaborations">Collaborations</option>
                        <option value="Private Styling">Private Styling</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">MESSAGE</label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="HOW CAN WE ASSIST?"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button type="submit" className="contact-submit-btn">
                      CONTINUE TO GOOGLE FORM
                    </button>
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLScQm8fXIOkrtj5nlmwMWzneAcll5u4PudqJjCw9LhNn0aSfOg/viewform?usp=pp_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-center text-[#8e8e93] hover:text-white underline mt-2 block"
                    >
                      Or click here to open official Contact Form directly
                    </a>
                  </div>
                </form>
              </div>

              {/* Right Column: Info & Image */}
              <div className="contact-info-section">
                <div className="info-block">
                  <h4 className="info-title">HEADQUARTERS</h4>
                  <p className="info-text">
                    No. 42 Atelier District,<br />
                    Colombo 00700,<br />
                    Sri Lanka
                  </p>
                </div>

                <div className="info-block">
                  <h4 className="info-title">CONNECT</h4>
                  <div className="social-links-grid">
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="social-icon-link">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-svg">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                    <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="social-icon-link">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="social-svg-fill">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="social-icon-link">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="social-svg-fill">
                        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.8z"/>
                      </svg>
                    </a>
                  </div>
                </div>

                <div className="showroom-image-container">
                  <Image
                    src="/images/showroom.png"
                    alt="VERGO Showroom"
                    width={400}
                    height={220}
                    priority
                    style={{ objectFit: "cover", width: "100%", height: "auto" }}
                    className="showroom-image"
                  />
                  <p className="showroom-caption">EST. 2024 — VERGO GLOBAL</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
