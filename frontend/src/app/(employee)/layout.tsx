import { RoleRouteGuard } from "@/components/auth/RoleRouteGuard";

export default function EmployeeRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleRouteGuard allowedRole="employee">{children}</RoleRouteGuard>;
}
