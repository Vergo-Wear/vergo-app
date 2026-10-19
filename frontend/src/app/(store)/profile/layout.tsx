import { RoleRouteGuard } from "@/components/auth/RoleRouteGuard";

export default function CustomerProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleRouteGuard allowedRole="customer">{children}</RoleRouteGuard>;
}
