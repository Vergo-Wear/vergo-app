import Image from "next/image";
import "./footer.css";

export default function Footer() {
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
          <a href="#" className="footer-link">RETURNS</a>
          <a href="#" className="footer-link">PRIVACY POLICY</a>
          <a href="#" className="footer-link">TERMS OF SERVICE</a>
          <a href="#" className="footer-link">CONTACT US</a>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} VERGO STREETWEAR LABS. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  );
}