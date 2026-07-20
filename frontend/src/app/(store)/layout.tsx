import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { CartProvider } from "@/context/CartContext";
import { StoreRouteGuard } from "@/components/auth/RoleRouteGuard";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreRouteGuard>
      <CartProvider>
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </CartProvider>
    </StoreRouteGuard>
  );
}
