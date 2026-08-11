import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db, governorships, councils, bacentas, leaders, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { GovernorshipEditClient } from "./governorship-edit-client";

export default async function EditGovernorshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leader = await requireLeader();

  if (leader.role !== "chief_admin") {
    return <p className="card text-sm text-zinc-400">Only Chief Admin can edit governorships.</p>;
  }

  const gov = await db.query.governorships.findFirst({
    where: eq(governorships.id, id),
  });
  if (!gov) notFound();

  const [allCouncils, allGovs, govBacentas, currentGovernorRows] = await Promise.all([
    db.select().from(councils).orderBy(councils.name),
    db.select().from(governorships).orderBy(governorships.name),
    db
      .select({ id: bacentas.id, name: bacentas.name, area: bacentas.area })
      .from(bacentas)
      .where(eq(bacentas.governorshipId, id))
      .orderBy(bacentas.name),
    db
      .select({
        leaderId: leaders.id,
        firstName: members.firstName,
        lastName: members.lastName,
        username: leaders.username,
      })
      .from(leaders)
      .innerJoin(members, eq(leaders.memberId, members.id))
      .where(
        and(
          eq(leaders.governorshipId, id),
          eq(leaders.role, "governor"),
          eq(leaders.isActive, true),
        ),
      )
      .limit(1),
  ]);

  return (
    <GovernorshipEditClient
      governorship={{
        id: gov.id,
        name: gov.name,
        area: gov.area,
        councilId: gov.councilId,
        parentGovernorshipId: gov.parentGovernorshipId,
      }}
      councils={allCouncils.map((c) => ({ id: c.id, name: c.name }))}
      parentOptions={allGovs
        .filter((g) => g.id !== gov.id)
        .map((g) => ({ id: g.id, name: g.name }))}
      bacentas={govBacentas}
      currentGovernor={currentGovernorRows[0] ?? null}
    />
  );
}
