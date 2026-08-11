// Centralized permission logic — the single "can this leader act on this
// unit" module used everywhere. Do not duplicate role checks in pages.

export type Role =
  | "chief_admin"
  | "council_leader"
  | "governor"
  | "bacenta_leader"
  | "arrivals_admin"
  | "arrivals_counter";

export const ROLE_LABELS: Record<Role, string> = {
  chief_admin: "Chief Admin",
  council_leader: "Council Leader",
  governor: "Governor",
  bacenta_leader: "Bacenta Leader",
  arrivals_admin: "Arrivals Admin",
  arrivals_counter: "Arrivals Counter",
};

type LeaderLike = {
  role: Role;
  councilId: string | null;
  governorshipId: string | null;
  bacentaId: string | null;
  area?: "area1" | "area2" | null;
};

type BacentaScope = {
  id: string;
  governorshipId: string | null;
  councilId: string | null;
};

/** Church-wide pastoral oversight (sees everything). */
export function isChurchWide(l: LeaderLike): boolean {
  return l.role === "chief_admin";
}

/** Can see/approve arrivals submissions church-wide. */
export function canReviewArrivals(l: LeaderLike): boolean {
  return ["chief_admin", "arrivals_admin", "arrivals_counter"].includes(l.role);
}

/** Can enter physical counter counts at point of arrival. */
export function canEnterCounterCount(l: LeaderLike): boolean {
  return canReviewArrivals(l);
}

/** Can finally approve/reject an on-the-way submission. */
export function canApproveArrivals(
  l: LeaderLike,
  b?: BacentaScope | null,
): boolean {
  if (["chief_admin", "arrivals_admin"].includes(l.role)) return true;
  // Governors / council leaders can approve within their own scope.
  if (b && (l.role === "governor" || l.role === "council_leader")) {
    return overseesBacenta(l, b);
  }
  return false;
}

/** Does this leader's scope include the given bacenta? */
export function overseesBacenta(l: LeaderLike, b: BacentaScope): boolean {
  switch (l.role) {
    case "chief_admin":
      return true;
    case "council_leader":
      return l.councilId === b.councilId;
    case "governor":
      return l.governorshipId === b.governorshipId;
    case "bacenta_leader":
      return l.bacentaId === b.id;
    default:
      return false;
  }
}

/** Pastoral roles that see the members/attendance sections. */
export function isPastoral(l: LeaderLike): boolean {
  return ["chief_admin", "council_leader", "governor", "bacenta_leader"].includes(
    l.role,
  );
}

/** Can create/edit hierarchy units and assign leaders (scoped). */
export function canManageHierarchy(l: LeaderLike): boolean {
  return ["chief_admin", "council_leader", "governor"].includes(l.role);
}

/** Can create a council (church-wide only). */
export function canCreateCouncil(l: LeaderLike): boolean {
  return l.role === "chief_admin";
}

/**
 * Can create a governorship under the given council. `councilId: null` means
 * a chief_admin quick-create with routing deferred — only chief_admin may do
 * that.
 */
export function canCreateGovernorship(l: LeaderLike, councilId: string | null): boolean {
  if (l.role === "chief_admin") return true;
  if (councilId === null) return false;
  return l.role === "council_leader" && l.councilId === councilId;
}

/**
 * Can create a bacenta under the given governorship/council. A null
 * governorshipId (or a governorship that itself has no council yet) means a
 * chief_admin quick-create with routing deferred — only chief_admin may do
 * that.
 */
export function canCreateBacenta(
  l: LeaderLike,
  scope: { governorshipId: string | null; councilId: string | null },
): boolean {
  if (l.role === "chief_admin") return true;
  if (scope.governorshipId === null) return false;
  // A governor may create bacentas in their own governorship even before the
  // governorship has been routed into a council.
  if (l.role === "governor") return l.governorshipId === scope.governorshipId;
  if (scope.councilId === null) return false;
  if (l.role === "council_leader") return l.councilId === scope.councilId;
  return false;
}

/** Can add/edit members of the given bacenta (bacenta leaders manage their own). */
export function canManageMembersOf(l: LeaderLike, b: BacentaScope): boolean {
  return overseesBacenta(l, b);
}

/** Can record service attendance for the given bacenta. */
export function canRecordAttendance(l: LeaderLike, b: BacentaScope): boolean {
  return overseesBacenta(l, b);
}

/** Can submit arrivals forms (pre-mob / on-the-way) — bacenta leaders only. */
export function canSubmitArrivals(l: LeaderLike): boolean {
  return l.role === "bacenta_leader";
}

/** Area 2 bacenta leaders handle bussing; Area 1 (Shepherds) do not. */
export function showsBussingUi(l: LeaderLike): boolean {
  return l.role === "bacenta_leader" && l.area === "area2";
}

/** Can manage arrivals settings (code of the day, counters). */
export function canManageArrivalsSettings(l: LeaderLike): boolean {
  return ["chief_admin", "arrivals_admin"].includes(l.role);
}

/** Can assign roles at any level. */
export function canAssignAnyRole(l: LeaderLike): boolean {
  return l.role === "chief_admin";
}

/** Human title for a bacenta leader depends on their bacenta's area. */
export function bacentaLeaderTitle(area: "area1" | "area2" | null): string {
  return area === "area1" ? "Shepherd" : "Bacenta Leader";
}
