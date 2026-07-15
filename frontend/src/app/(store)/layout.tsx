import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import AuthStartupReset from "@/components/AuthStartupReset";
import { CartProvider } from "@/context/CartContext";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthStartupReset>
      <CartProvider>
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </CartProvider>
    </AuthStartupReset>
  );
}
