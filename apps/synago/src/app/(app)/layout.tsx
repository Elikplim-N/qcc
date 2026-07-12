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

  const items: NavItem[] = [];
  const pastoral = [
    "chief_admin",
    "council_leader",
    "governor",
    "bacenta_leader",
  ].includes(leader.role);

  items.push({ href: "/", label: "Dashboard", icon: "home" });
  if (pastoral) {
    items.push({ href: "/attendance", label: "Attendance", icon: "check" });
  }
  if (leader.role === "bacenta_leader") {
    items.push({ href: "/arrivals", label: "Arrivals", icon: "bus" });
  }
  if (
    ["chief_admin", "council_leader", "governor", "arrivals_admin", "arrivals_counter"].includes(
      leader.role,
    )
  ) {
    items.push({ href: "/arrivals/monitor", label: "Monitor", icon: "radar" });
  }
  if (["chief_admin", "council_leader", "governor"].includes(leader.role)) {
    items.push({ href: "/manage", label: "Manage", icon: "grid" });
  }
  if (["chief_admin", "arrivals_admin"].includes(leader.role)) {
    items.push({ href: "/settings", label: "Settings", icon: "gear" });
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
      appName="Synago"
    >
      {children}
    </Shell>
  );
}
