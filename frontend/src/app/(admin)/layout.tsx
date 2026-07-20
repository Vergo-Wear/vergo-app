import { RoleRouteGuard } from "@/components/auth/RoleRouteGuard";

export default function AdminRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleRouteGuard allowedRole="admin">{children}</RoleRouteGuard>;
}
