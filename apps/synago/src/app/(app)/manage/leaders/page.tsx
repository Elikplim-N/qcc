import { eq, inArray } from "drizzle-orm";

import { db, bacentas, councils, governorships, leaders, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { type Role } from "@qcc/core/permissions";
import { getScopedBacentas } from "@qcc/core/scope";
import { LeadersClient } from "./leaders-client";

export default async function LeadersPage() {
  const actor = await requireLeader();
  if (!["chief_admin", "council_leader", "governor"].includes(actor.role)) {
    return <p className="card text-sm text-zinc-400">Outside your role.</p>;
  }

  const scoped = await getScopedBacentas(actor);
  const scopedIds = scoped.map((b) => b.id);

  const [allLeaders, allCouncils, allGovs, scopedMembers] = await Promise.all([
    db
      .select({
        id: leaders.id,
        role: leaders.role,
        username: leaders.username,
        isActive: leaders.isActive,
        bacentaId: leaders.bacentaId,
        governorshipId: leaders.governorshipId,
        councilId: leaders.councilId,
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(leaders)
      .innerJoin(members, eq(leaders.memberId, members.id)),
    db.select().from(councils).orderBy(councils.name),
    db.select().from(governorships).orderBy(governorships.name),
    scopedIds.length
      ? db
          .select({
            id: members.id,
            firstName: members.firstName,
            lastName: members.lastName,
            phoneNumber: members.phoneNumber,
          })
          .from(members)
          .where(
            actor.role === "chief_admin"
              ? undefined
              : inArray(members.bacentaId, scopedIds),
          )
          .orderBy(members.firstName)
          .limit(500)
      : Promise.resolve([]),
  ]);

  const roleOptions: Role[] =
    actor.role === "chief_admin"
      ? ["chief_admin", "council_leader", "governor", "bacenta_leader", "arrivals_admin", "arrivals_counter"]
      : actor.role === "council_leader"
        ? ["governor", "bacenta_leader"]
        : ["bacenta_leader"];

  const councilOptions =
    actor.role === "chief_admin"
      ? allCouncils
      : allCouncils.filter((c) => c.id === actor.councilId);
  const govOptions =
    actor.role === "chief_admin"
      ? allGovs
      : actor.role === "council_leader"
        ? allGovs.filter((g) => g.councilId === actor.councilId)
        : allGovs.filter((g) => g.id === actor.governorshipId);

  const bacentaName = new Map(scoped.map((b) => [b.id, b.name]));
  const govName = new Map(allGovs.map((g) => [g.id, g.name]));
  const councilName = new Map(allCouncils.map((c) => [c.id, c.name]));

  const visibleLeaders = allLeaders
    .filter((l) => {
      if (actor.role === "chief_admin") return true;
      if (l.bacentaId) return scopedIds.includes(l.bacentaId);
      if (l.governorshipId) return govOptions.some((g) => g.id === l.governorshipId);
      if (l.councilId) return l.councilId === actor.councilId;
      return false;
    })
    .map((l) => ({
      id: l.id,
      role: l.role as Role,
      username: l.username,
      isActive: l.isActive,
      fullName: `${l.firstName} ${l.lastName}`,
      scopeLabel: l.bacentaId
        ? (bacentaName.get(l.bacentaId) ?? "bacenta")
        : l.governorshipId
          ? (govName.get(l.governorshipId) ?? "")
          : l.councilId
            ? (councilName.get(l.councilId) ?? "")
            : "",
    }));

  return (
    <LeadersClient
      actorId={actor.id}
      visibleLeaders={visibleLeaders}
      roleOptions={roleOptions}
      councilOptions={councilOptions}
      govOptions={govOptions}
      scopedBacentas={scoped}
      scopedMembers={scopedMembers}
    />
  );
}
