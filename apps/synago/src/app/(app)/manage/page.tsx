import { count } from "drizzle-orm";

import { db, bacentas, councils, governorships, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canCreateCouncil } from "@qcc/core/permissions";
import { ManageClient } from "./manage-client";

export default async function ManagePage() {
  const leader = await requireLeader();
  if (!["chief_admin", "council_leader", "governor"].includes(leader.role)) {
    return <p className="card text-sm text-zinc-400">Outside your role.</p>;
  }

  const [allCouncils, allGovs, allBacentas, memberCounts] = await Promise.all([
    db.select().from(councils).orderBy(councils.name),
    db.select().from(governorships).orderBy(governorships.name),
    db.select().from(bacentas).orderBy(bacentas.name),
    db
      .select({ bacentaId: members.bacentaId, n: count() })
      .from(members)
      .groupBy(members.bacentaId),
  ]);
  const countByBacenta = new Map(memberCounts.map((r) => [r.bacentaId, r.n]));

  // Scope the tree
  const visibleCouncils = allCouncils.filter((c) =>
    leader.role === "chief_admin"
      ? true
      : leader.role === "council_leader"
        ? c.id === leader.councilId
        : allGovs.some((g) => g.councilId === c.id && g.id === leader.governorshipId),
  );

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
      visibleCouncils={visibleCouncils}
      allGovs={allGovs}
      allBacentas={allBacentas}
      countByBacenta={countByBacenta}
      creatableCouncils={creatableCouncils}
      creatableGovs={creatableGovs}
      canCreateCouncil={canCreateCouncil(leader)}
      canCreateGov={["chief_admin", "council_leader"].includes(leader.role)}
    />
  );
}
