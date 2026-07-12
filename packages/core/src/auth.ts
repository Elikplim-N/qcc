import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

import { db, leaders, members, sessions, bacentas, governorships } from "@qcc/db";
import type { Role } from "./permissions";

const SESSION_COOKIE = "qcc_session";
const SESSION_DAYS = 30;

export type SessionLeader = {
  id: string;
  memberId: string;
  role: Role;
  councilId: string | null;
  governorshipId: string | null;
  bacentaId: string | null;
  username: string;
  fullName: string;
  /** Area of the leader's own bacenta/governorship (bacenta leaders & governors). */
  area: "area1" | "area2" | null;
};

export async function createSession(leaderId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(sessions).values({ token, leaderId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
    jar.delete(SESSION_COOKIE);
  }
}

export const getSessionLeader = cache(
  async (): Promise<SessionLeader | null> => {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const rows = await db
      .select({
        session: sessions,
        leader: leaders,
        member: members,
      })
      .from(sessions)
      .innerJoin(leaders, eq(sessions.leaderId, leaders.id))
      .innerJoin(members, eq(leaders.memberId, members.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const row = rows[0];
    if (!row || !row.leader.isActive) return null;

    let area: "area1" | "area2" | null = null;
    if (row.leader.bacentaId) {
      const b = await db.query.bacentas.findFirst({
        where: eq(bacentas.id, row.leader.bacentaId),
        columns: { area: true },
      });
      area = b?.area ?? null;
    } else if (row.leader.governorshipId) {
      const g = await db.query.governorships.findFirst({
        where: eq(governorships.id, row.leader.governorshipId),
        columns: { area: true },
      });
      area = g?.area ?? null;
    }

    return {
      id: row.leader.id,
      memberId: row.leader.memberId,
      role: row.leader.role as Role,
      councilId: row.leader.councilId,
      governorshipId: row.leader.governorshipId,
      bacentaId: row.leader.bacentaId,
      username: row.leader.username,
      fullName: `${row.member.firstName} ${row.member.lastName}`,
      area,
    };
  },
);

export async function requireLeader(): Promise<SessionLeader> {
  const leader = await getSessionLeader();
  if (!leader) redirect("/login");
  return leader;
}
