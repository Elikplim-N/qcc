import { eq, inArray } from "drizzle-orm";

import { db, auditLogs, bacentas, governorships } from "@qcc/db";
import type { SessionLeader } from "./auth";

export type ScopedBacenta = {
  id: string;
  name: string;
  area: "area1" | "area2";
  governorshipId: string;
  governorshipName: string;
  councilId: string;
};

/** All bacentas within this leader's scope (church-wide roles see all). */
export async function getScopedBacentas(
  leader: SessionLeader,
): Promise<ScopedBacenta[]> {
  const rows = await db
    .select({
      id: bacentas.id,
      name: bacentas.name,
      area: bacentas.area,
      governorshipId: bacentas.governorshipId,
      governorshipName: governorships.name,
      councilId: governorships.councilId,
    })
    .from(bacentas)
    .innerJoin(governorships, eq(bacentas.governorshipId, governorships.id))
    .orderBy(governorships.name, bacentas.name);

  switch (leader.role) {
    case "chief_admin":
    case "arrivals_admin":
    case "arrivals_counter":
      return rows;
    case "council_leader":
      return rows.filter((r) => r.councilId === leader.councilId);
    case "governor":
      return rows.filter((r) => r.governorshipId === leader.governorshipId);
    case "bacenta_leader":
      return rows.filter((r) => r.id === leader.bacentaId);
    default:
      return [];
  }
}

export function scopedBacentaIds(list: ScopedBacenta[]): string[] {
  return list.map((b) => b.id);
}

/** Find one bacenta with its hierarchy scope, or null. */
export async function getBacentaScope(bacentaId: string) {
  const rows = await db
    .select({
      id: bacentas.id,
      name: bacentas.name,
      area: bacentas.area,
      governorshipId: bacentas.governorshipId,
      councilId: governorships.councilId,
      momoNumber: bacentas.momoNumber,
      momoName: bacentas.momoName,
      mobileNetwork: bacentas.mobileNetwork,
    })
    .from(bacentas)
    .innerJoin(governorships, eq(bacentas.governorshipId, governorships.id))
    .where(eq(bacentas.id, bacentaId))
    .limit(1);
  return rows[0] ?? null;
}

export async function logAudit(
  action: string,
  actorLeaderId: string,
  targetType?: string,
  targetId?: string,
  detail?: unknown,
) {
  await db.insert(auditLogs).values({
    action,
    actorLeaderId,
    targetType,
    targetId,
    detail: detail ?? null,
  });
}

/** Filter helper for member queries: undefined = unrestricted (church-wide). */
export function memberBacentaFilter(
  leader: SessionLeader,
  scoped: ScopedBacenta[],
): string[] | undefined {
  if (leader.role === "chief_admin") return undefined;
  return scopedBacentaIds(scoped);
}

export { inArray };
