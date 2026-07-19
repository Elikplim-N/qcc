"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, bacentas, councils, governorships, leaders, members } from "@qcc/db";
import { requireLeader, type SessionLeader } from "@qcc/core/auth";
import { hashPassword } from "@qcc/core/password";
import {
  canCreateBacenta,
  canCreateCouncil,
  canCreateGovernorship,
  type Role,
} from "@qcc/core/permissions";
import { getBacentaScope, logAudit } from "@qcc/core/scope";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function createCouncilAction(formData: FormData) {
  const leader = await requireLeader();
  if (!canCreateCouncil(leader)) throw new Error("Only the Chief Admin creates councils.");
  const name = str(formData, "name");
  if (!name) throw new Error("Name required.");
  const [row] = await db.insert(councils).values({ name }).returning({ id: councils.id });
  await logAudit("council_created", leader.id, "council", row.id, { name });
  revalidatePath("/manage");
}

export async function createGovernorshipAction(formData: FormData) {
  const leader = await requireLeader();
  const councilId = str(formData, "councilId");
  if (!councilId || !canCreateGovernorship(leader, councilId)) {
    throw new Error("You cannot create a governorship in this council.");
  }
  const name = str(formData, "name");
  const area = str(formData, "area") === "area2" ? "area2" : "area1";
  const memberId = str(formData, "memberId");
  if (!name) throw new Error("Name required.");
  const [row] = await db
    .insert(governorships)
    .values({ name, councilId, area })
    .returning({ id: governorships.id });
  await logAudit("governorship_created", leader.id, "governorship", row.id, { name, area });

  // If a member is selected, promote them to governor
  if (memberId) {
    const member = await db.query.members.findFirst({
      where: eq(members.id, memberId),
    });
    if (member) {
      // Generate username if needed
      let cleanFirst = member.firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
      let cleanLast = member.lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
      let generatedUsername = `${cleanFirst}.${cleanLast}`;
      let baseUsername = generatedUsername;
      let suffix = 1;
      while (true) {
        const exists = await db.query.leaders.findFirst({
          where: eq(leaders.username, generatedUsername),
        });
        if (!exists) break;
        generatedUsername = `${baseUsername}${suffix}`;
        suffix++;
      }

      const existing = await db.query.leaders.findFirst({
        where: eq(leaders.memberId, memberId),
      });

      const values = {
        role: "governor" as Role,
        councilId: null,
        governorshipId: row.id,
        bacentaId: null,
        username: generatedUsername,
        passwordHash: hashPassword("change-me-now"),
        isActive: true,
      };

      if (existing) {
        await db.update(leaders).set(values).where(eq(leaders.id, existing.id));
        await logAudit("leader_role_updated", leader.id, "leader", existing.id, { role: "governor" });
      } else {
        const [leaderRow] = await db
          .insert(leaders)
          .values({ memberId, ...values })
          .returning({ id: leaders.id });
        await logAudit("leader_promoted", leader.id, "leader", leaderRow.id, { role: "governor" });
      }
    }
  }

  revalidatePath("/manage");
}

export async function createBacentaAction(formData: FormData) {
  const leader = await requireLeader();
  const governorshipId = str(formData, "governorshipId");
  const gov = governorshipId
    ? await db.query.governorships.findFirst({
        where: eq(governorships.id, governorshipId),
      })
    : null;
  if (
    !gov ||
    !canCreateBacenta(leader, { governorshipId: gov.id, councilId: gov.councilId })
  ) {
    throw new Error("You cannot create a bacenta in this governorship.");
  }
  const name = str(formData, "name");
  const area = str(formData, "area") === "area2" ? "area2" : "area1";
  const memberId = str(formData, "memberId");
  if (!name) throw new Error("Name required.");
  const [row] = await db
    .insert(bacentas)
    .values({
      name,
      governorshipId: gov.id,
      area,
      momoNumber: str(formData, "momoNumber") || null,
      momoName: str(formData, "momoName") || null,
      mobileNetwork: str(formData, "mobileNetwork") || null,
    })
    .returning({ id: bacentas.id });
  await logAudit("bacenta_created", leader.id, "bacenta", row.id, { name, area });

  // If a member is selected, promote them to bacenta_leader
  if (memberId) {
    const member = await db.query.members.findFirst({
      where: eq(members.id, memberId),
    });
    if (member) {
      // Generate username if needed
      let cleanFirst = member.firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
      let cleanLast = member.lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
      let generatedUsername = `${cleanFirst}.${cleanLast}`;
      let baseUsername = generatedUsername;
      let suffix = 1;
      while (true) {
        const exists = await db.query.leaders.findFirst({
          where: eq(leaders.username, generatedUsername),
        });
        if (!exists) break;
        generatedUsername = `${baseUsername}${suffix}`;
        suffix++;
      }

      const existing = await db.query.leaders.findFirst({
        where: eq(leaders.memberId, memberId),
      });

      const values = {
        role: "bacenta_leader" as Role,
        councilId: null,
        governorshipId: null,
        bacentaId: row.id,
        username: generatedUsername,
        passwordHash: hashPassword("change-me-now"),
        isActive: true,
      };

      if (existing) {
        await db.update(leaders).set(values).where(eq(leaders.id, existing.id));
        await logAudit("leader_role_updated", leader.id, "leader", existing.id, { role: "bacenta_leader" });
      } else {
        const [leaderRow] = await db
          .insert(leaders)
          .values({ memberId, ...values })
          .returning({ id: leaders.id });
        await logAudit("leader_promoted", leader.id, "leader", leaderRow.id, { role: "bacenta_leader" });
      }
    }
  }

  revalidatePath("/manage");
}

export async function updateBacentaAction(formData: FormData) {
  const leader = await requireLeader();
  const bacentaId = str(formData, "bacentaId");
  const scope = bacentaId ? await getBacentaScope(bacentaId) : null;
  if (
    !scope ||
    !canCreateBacenta(leader, {
      governorshipId: scope.governorshipId,
      councilId: scope.councilId,
    })
  ) {
    throw new Error("You cannot edit this bacenta.");
  }
  await db
    .update(bacentas)
    .set({
      name: str(formData, "name") || scope.name,
      area: str(formData, "area") === "area2" ? "area2" : "area1",
      momoNumber: str(formData, "momoNumber") || null,
      momoName: str(formData, "momoName") || null,
      mobileNetwork: str(formData, "mobileNetwork") || null,
    })
    .where(eq(bacentas.id, bacentaId));
  await logAudit("bacenta_updated", leader.id, "bacenta", bacentaId);
  revalidatePath("/manage");
  redirect("/manage");
}

// Which roles may the actor assign, and does the target scope fall within theirs?
function assignableRoles(actor: SessionLeader): Role[] {
  switch (actor.role) {
    case "chief_admin":
      return [
        "chief_admin",
        "council_leader",
        "governor",
        "bacenta_leader",
        "arrivals_admin",
        "arrivals_counter",
      ];
    case "council_leader":
      return ["governor", "bacenta_leader"];
    case "governor":
      return ["bacenta_leader"];
    default:
      return [];
  }
}

export async function promoteLeaderAction(formData: FormData) {
  const actor = await requireLeader();
  const memberId = str(formData, "memberId");
  const role = str(formData, "role") as Role;
  let username = str(formData, "username")?.toLowerCase();
  let password = str(formData, "password");

  if (!memberId || !role) {
    throw new Error("Member and role are required.");
  }
  if (!assignableRoles(actor).includes(role)) {
    throw new Error("You cannot assign this role.");
  }

  // Load member to auto-generate username if needed
  const member = await db.query.members.findFirst({
    where: eq(members.id, memberId),
  });
  if (!member) throw new Error("Member not found.");

  if (!username) {
    let cleanFirst = member.firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
    let cleanLast = member.lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
    let generatedUsername = `${cleanFirst}.${cleanLast}`;
    let baseUsername = generatedUsername;
    let suffix = 1;
    while (true) {
      const exists = await db.query.leaders.findFirst({
        where: eq(leaders.username, generatedUsername),
      });
      if (!exists) break;
      generatedUsername = `${baseUsername}${suffix}`;
      suffix++;
    }
    username = generatedUsername;
  }

  if (!password) {
    password = "change-me-now";
  } else if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  // Resolve scope by role
  let councilId: string | null = null;
  let governorshipId: string | null = null;
  let bacentaId: string | null = null;

  if (role === "council_leader") {
    councilId = str(formData, "councilId") || null;
    if (!councilId) throw new Error("Select a council.");
  } else if (role === "governor") {
    governorshipId = str(formData, "governorshipId") || null;
    if (!governorshipId) throw new Error("Select a governorship.");
    const gov = await db.query.governorships.findFirst({
      where: eq(governorships.id, governorshipId),
    });
    if (!gov) throw new Error("Governorship not found.");
    if (actor.role === "council_leader" && gov.councilId !== actor.councilId) {
      throw new Error("That governorship is outside your council.");
    }
  } else if (role === "bacenta_leader") {
    bacentaId = str(formData, "bacentaId") || null;
    if (!bacentaId) throw new Error("Select a bacenta.");
    const scope = await getBacentaScope(bacentaId);
    if (!scope) throw new Error("Bacenta not found.");
    if (actor.role === "council_leader" && scope.councilId !== actor.councilId) {
      throw new Error("That bacenta is outside your council.");
    }
    if (actor.role === "governor" && scope.governorshipId !== actor.governorshipId) {
      throw new Error("That bacenta is outside your governorship.");
    }
  }

  // Never duplicate: one leader row per member, keyed off the member ID.
  const existing = await db.query.leaders.findFirst({
    where: eq(leaders.memberId, memberId),
  });

  const values = {
    role,
    councilId,
    governorshipId,
    bacentaId,
    username,
    passwordHash: hashPassword(password),
    isActive: true,
  };

  if (existing) {
    await db.update(leaders).set(values).where(eq(leaders.id, existing.id));
    await logAudit("leader_role_updated", actor.id, "leader", existing.id, { role });
  } else {
    const [row] = await db
      .insert(leaders)
      .values({ memberId, ...values })
      .returning({ id: leaders.id });
    await logAudit("leader_promoted", actor.id, "leader", row.id, { role });
  }

  revalidatePath("/manage/leaders");
}

// Removing a leader frees up their position (council/governorship/bacenta
// becomes vacant, promotable to someone else) and blocks their login. The
// leader row itself is kept — never deleted — so historical records they
// created (attendance, premobilisations, etc.) stay attributed and intact.
export async function removeLeaderAction(formData: FormData) {
  const actor = await requireLeader();
  const leaderId = str(formData, "leaderId");
  const target = await db.query.leaders.findFirst({ where: eq(leaders.id, leaderId) });
  if (!target) throw new Error("Leader not found.");
  if (!assignableRoles(actor).includes(target.role as Role)) {
    throw new Error("You cannot manage this leader.");
  }
  if (target.id === actor.id) throw new Error("You cannot remove yourself.");
  await db
    .update(leaders)
    .set({ isActive: false, councilId: null, governorshipId: null, bacentaId: null })
    .where(eq(leaders.id, leaderId));
  await logAudit("leader_removed", actor.id, "leader", leaderId);
  revalidatePath("/manage/leaders");
  revalidatePath("/manage");
}
