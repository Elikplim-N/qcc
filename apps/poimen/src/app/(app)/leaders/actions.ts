"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, bacentas, councils, governorships, leaders, members } from "@qcc/db";
import { requireLeader, type SessionLeader } from "@qcc/core/auth";
import { hashPassword } from "@qcc/core/password";
import { type Role } from "@qcc/core/permissions";
import { getBacentaScope, logAudit } from "@qcc/core/scope";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

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

  revalidatePath("/leaders");
  redirect("/leaders");
}

export async function setLeaderActiveAction(formData: FormData) {
  const actor = await requireLeader();
  const leaderId = str(formData, "leaderId");
  const active = str(formData, "active") === "true";
  const target = await db.query.leaders.findFirst({ where: eq(leaders.id, leaderId) });
  if (!target) throw new Error("Leader not found.");
  if (!assignableRoles(actor).includes(target.role as any)) {
    throw new Error("You cannot manage this leader.");
  }
  if (target.id === actor.id) throw new Error("You cannot deactivate yourself.");
  await db.update(leaders).set({ isActive: active }).where(eq(leaders.id, leaderId));
  await logAudit(active ? "leader_activated" : "leader_deactivated", actor.id, "leader", leaderId);
  revalidatePath("/leaders");
}
