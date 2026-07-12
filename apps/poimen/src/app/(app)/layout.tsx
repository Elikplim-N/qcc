import { requireLeader } from "@qcc/core/auth";
import { bacentaLeaderTitle, ROLE_LABELS } from "@qcc/core/permissions";
import { Shell, type NavItem } from "@qcc/ui/components/shell";
import { logoutAction } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const leader = await requireLeader();

  const items: NavItem[] = [{ href: "/", label: "Dashboard", icon: "home" }];
  const pastoral = [
    "chief_admin",
    "council_leader",
    "governor",
    "bacenta_leader",
  ].includes(leader.role);
  if (pastoral) {
    items.push({ href: "/members", label: "Members", icon: "users" });
    items.push({ href: "/attendance", label: "Attendance", icon: "check" });
  }

  const roleLabel =
    leader.role === "bacenta_leader"
      ? bacentaLeaderTitle(leader.area)
      : ROLE_LABELS[leader.role];

  return (
    <Shell
      items={items}
      fullName={leader.fullName}
      roleLabel={roleLabel}
      logout={logoutAction}
      appName="Poimen"
    >
      {children}
    </Shell>
  );
}
