import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { CartProvider } from "@/context/CartContext";
import { StoreRouteGuard } from "@/components/auth/RoleRouteGuard";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import FloatingActions from "@/components/FloatingActions/FloatingActions";

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
        <FloatingActions />
        <OnboardingTour role="customer" />
      </CartProvider>
    </StoreRouteGuard>
  );
}
