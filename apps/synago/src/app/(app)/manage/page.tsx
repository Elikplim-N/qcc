import { count, eq } from "drizzle-orm";

import { db, bacentas, councils, governorships, leaders, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canCreateCouncil } from "@qcc/core/permissions";
import { getScopedBacentas } from "@qcc/core/scope";
import { ManageClient } from "./manage-client";

export default async function ManagePage() {
  const leader = await requireLeader();
  if (!["chief_admin", "council_leader", "governor"].includes(leader.role)) {
    return <p className="card text-sm text-zinc-400">Outside your role.</p>;
  }

  const scoped = await getScopedBacentas(leader);

  const [allCouncils, allGovs, allBacentas, memberCounts, activeLeaders] = await Promise.all([
    db.select().from(councils).orderBy(councils.name),
    db.select().from(governorships).orderBy(governorships.name),
    db.select().from(bacentas).orderBy(bacentas.name),
    db
      .select({ bacentaId: members.bacentaId, n: count() })
      .from(members)
      .groupBy(members.bacentaId),
    db
      .select({
        bacentaId: leaders.bacentaId,
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(leaders)
      .innerJoin(members, eq(leaders.memberId, members.id))
      .where(eq(leaders.isActive, true)),
  ]);
  const countByBacenta = new Map(
    memberCounts
      .filter((r) => r.bacentaId !== null)
      .map((r) => [r.bacentaId as string, r.n]),
  );
  const bacentaLeaderName = new Map(
    activeLeaders
      .filter((l) => l.bacentaId !== null)
      .map((l) => [l.bacentaId as string, `${l.firstName} ${l.lastName}`]),
  );

  const govById = new Map(allGovs.map((g) => [g.id, g]));
  const councilNameById = new Map(allCouncils.map((c) => [c.id, c.name]));

  // Scope to what this leader may see
  const visibleGovIds = new Set(
    leader.role === "chief_admin"
      ? allGovs.map((g) => g.id)
      : leader.role === "council_leader"
        ? allGovs.filter((g) => g.councilId === leader.councilId).map((g) => g.id)
        : allGovs.filter((g) => g.id === leader.governorshipId).map((g) => g.id),
  );

  const visibleBacentas = allBacentas
    .filter((b) => visibleGovIds.has(b.governorshipId))
    .map((b) => {
      const gov = govById.get(b.governorshipId);
      return {
        id: b.id,
        name: b.name,
        area: b.area,
        governorshipName: gov?.name ?? "",
        councilName: gov ? (councilNameById.get(gov.councilId) ?? "") : "",
        memberCount: countByBacenta.get(b.id) ?? 0,
        leaderName: bacentaLeaderName.get(b.id),
      };
    });

  // Visible governorships — all of them for chief_admin, only within their
  // council/governorship for others.
  const visibleGovs = allGovs
    .filter((g) => visibleGovIds.has(g.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      area: g.area,
      councilName: councilNameById.get(g.councilId) ?? null,
    }));

  const isChiefAdmin = leader.role === "chief_admin";

  // Creation scopes for the forms
  const creatableCouncils =
    leader.role === "chief_admin"
      ? allCouncils
      : allCouncils.filter((c) => c.id === leader.councilId);
  const creatableGovs =
    leader.role === "chief_admin"
      ? allGovs
      : leader.role === "council_leader"
        ? allGovs.filter((g) => g.councilId === leader.councilId)
        : allGovs.filter((g) => g.id === leader.governorshipId);

  return (
    <ManageClient
      visibleBacentas={visibleBacentas}
      visibleGovs={visibleGovs}
      creatableCouncils={creatableCouncils}
      creatableGovs={creatableGovs}
      canCreateCouncil={canCreateCouncil(leader)}
      canCreateGov={["chief_admin", "council_leader"].includes(leader.role)}
      isChiefAdmin={isChiefAdmin}
    />
  );
}
