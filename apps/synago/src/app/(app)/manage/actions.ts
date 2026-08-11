"use server";

import { and, eq, ilike, inArray, sql } from "drizzle-orm";
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
import { getBacentaScope, getScopedBacentas, scopedBacentaIds, logAudit } from "@qcc/core/scope";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

// Live search over the member list, scoped to what the actor may promote —
// chief_admin and council_leader search church-wide, governor/bacenta_leader
// are limited to members in their own bacentas. Replaces the old
// client-side selects backed by a capped 500-row preload, which silently
// hid anyone past the cutoff (alphabetically) or added after the page loaded.
export async function searchMembersAction(query: string): Promise<
  { id: string; firstName: string; lastName: string; phoneNumber: string | null }[]
> {
  const leader = await requireLeader();
  const q = query.trim().replace(/[%_]/g, "");
  if (q.length < 2) return [];

  const unrestricted = ["chief_admin", "council_leader"].includes(leader.role);
  const scopedIds = unrestricted
    ? undefined
    : scopedBacentaIds(await getScopedBacentas(leader));

  const nameMatch = ilike(sql`${members.firstName} || ' ' || ${members.lastName}`, `%${q}%`);

  return db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      phoneNumber: members.phoneNumber,
    })
    .from(members)
    .where(
      scopedIds
        ? and(nameMatch, inArray(members.bacentaId, scopedIds.length ? scopedIds : [""]))
        : nameMatch,
    )
    .orderBy(members.firstName, members.lastName)
    .limit(8);
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
  // Empty councilId = chief_admin quick-create, routed to a council later.
  const councilId = str(formData, "councilId") || null;
  if (!canCreateGovernorship(leader, councilId)) {
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
  await logAudit("governorship_created", leader.id, "governorship", row.id, {
    name,
    area,
    councilId,
  });

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
  // Empty governorshipId = chief_admin quick-create, routed to a
  // governorship later.
  const governorshipId = str(formData, "governorshipId") || null;
  const gov = governorshipId
    ? await db.query.governorships.findFirst({
        where: eq(governorships.id, governorshipId),
      })
    : null;
  if (
    (governorshipId && !gov) ||
    !canCreateBacenta(leader, {
      governorshipId: gov?.id ?? null,
      councilId: gov?.councilId ?? null,
    })
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
      governorshipId: gov?.id ?? null,
      area,
      momoNumber: str(formData, "momoNumber") || null,
      momoName: str(formData, "momoName") || null,
      mobileNetwork: str(formData, "mobileNetwork") || null,
    })
    .returning({ id: bacentas.id });
  await logAudit("bacenta_created", leader.id, "bacenta", row.id, {
    name,
    area,
    governorshipId: gov?.id ?? null,
  });

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

// Chief-admin-only: route a governorship created unassigned (no council yet)
// into a council.
export async function assignGovernorshipCouncilAction(formData: FormData) {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") {
    throw new Error("Only Chief Admin can reassign a governorship's council.");
  }
  const governorshipId = str(formData, "governorshipId");
  const councilId = str(formData, "councilId");
  if (!governorshipId || !councilId) throw new Error("Governorship and council required.");
  await db
    .update(governorships)
    .set({ councilId })
    .where(eq(governorships.id, governorshipId));
  await logAudit("governorship_routed", leader.id, "governorship", governorshipId, {
    councilId,
  });
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
  // Only chief_admin may re-route a bacenta to a different governorship
  // (e.g. assigning one created unassigned from raw onboarding data).
  const governorshipIdRaw = formData.get("governorshipId");
  let governorshipId: string | null | undefined = undefined;
  if (governorshipIdRaw !== null) {
    if (leader.role !== "chief_admin") {
      throw new Error("Only Chief Admin can reassign a bacenta's governorship.");
    }
    governorshipId = str(formData, "governorshipId") || null;
  }
  await db
    .update(bacentas)
    .set({
      name: str(formData, "name") || scope.name,
      area: str(formData, "area") === "area2" ? "area2" : "area1",
      momoNumber: str(formData, "momoNumber") || null,
      momoName: str(formData, "momoName") || null,
      mobileNetwork: str(formData, "mobileNetwork") || null,
      ...(governorshipId !== undefined ? { governorshipId } : {}),
    })
    .where(eq(bacentas.id, bacentaId));
  await logAudit("bacenta_updated", leader.id, "bacenta", bacentaId, { governorshipId });
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

export async function updateGovernorshipAction(formData: FormData) {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") {
    throw new Error("Only Chief Admin can edit governorships.");
  }
  const governorshipId = str(formData, "governorshipId");
  const name = str(formData, "name");
  const area = str(formData, "area") === "area2" ? "area2" : "area1";
  const councilId = str(formData, "councilId") || null;
  const parentGovernorshipId = str(formData, "parentGovernorshipId") || null;
  if (!governorshipId || !name) throw new Error("Governorship and name required.");
  if (parentGovernorshipId === governorshipId) {
    throw new Error("A governorship cannot be its own senior.");
  }

  const gov = await db.query.governorships.findFirst({
    where: eq(governorships.id, governorshipId),
  });
  if (!gov) throw new Error("Governorship not found.");

  await db
    .update(governorships)
    .set({ name, area, councilId, parentGovernorshipId })
    .where(eq(governorships.id, governorshipId));
  await logAudit("governorship_updated", leader.id, "governorship", governorshipId, {
    name,
    area,
    councilId,
    parentGovernorshipId,
  });
  revalidatePath("/manage");
}

export async function deleteGovernorshipAction(formData: FormData) {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") {
    throw new Error("Only Chief Admin can delete governorships.");
  }
  const governorshipId = str(formData, "governorshipId");
  if (!governorshipId) throw new Error("Governorship required.");

  const gov = await db.query.governorships.findFirst({
    where: eq(governorships.id, governorshipId),
  });
  if (!gov) throw new Error("Governorship not found.");

  // Block deletion while the governorship still has bacentas or a governor —
  // move/remove those first so nothing is silently orphaned.
  const bacentaCount = await db.query.bacentas.findMany({
    where: eq(bacentas.governorshipId, governorshipId),
  });
  if (bacentaCount.length > 0) {
    throw new Error(
      "Cannot delete a governorship that has bacentas. Move or delete bacentas first.",
    );
  }

  const leaderCount = await db.query.leaders.findMany({
    where: eq(leaders.governorshipId, governorshipId),
  });
  if (leaderCount.length > 0) {
    throw new Error("Cannot delete a governorship that has a governor. Remove the governor first.");
  }

  await db.delete(governorships).where(eq(governorships.id, governorshipId));
  await logAudit("governorship_deleted", leader.id, "governorship", governorshipId, {
    name: gov.name,
  });
  revalidatePath("/manage");
}

export async function updateCouncilAction(formData: FormData) {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") {
    throw new Error("Only Chief Admin can edit councils.");
  }
  const councilId = str(formData, "councilId");
  const name = str(formData, "name");
  if (!councilId || !name) throw new Error("Council and name required.");

  const council = await db.query.councils.findFirst({
    where: eq(councils.id, councilId),
  });
  if (!council) throw new Error("Council not found.");

  await db.update(councils).set({ name }).where(eq(councils.id, councilId));
  await logAudit("council_updated", leader.id, "council", councilId, { name });
  revalidatePath("/manage");
}

export async function deleteCouncilAction(formData: FormData) {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") {
    throw new Error("Only Chief Admin can delete councils.");
  }
  const councilId = str(formData, "councilId");
  if (!councilId) throw new Error("Council required.");

  const council = await db.query.councils.findFirst({
    where: eq(councils.id, councilId),
  });
  if (!council) throw new Error("Council not found.");

  const govCount = await db.query.governorships.findMany({
    where: eq(governorships.councilId, councilId),
  });
  if (govCount.length > 0) {
    throw new Error("Cannot delete a council that has governorships. Move or delete governorships first.");
  }

  const leaderCount = await db.query.leaders.findMany({
    where: eq(leaders.councilId, councilId),
  });
  if (leaderCount.length > 0) {
    throw new Error("Cannot delete a council that has a council leader. Remove the leader first.");
  }

  await db.delete(councils).where(eq(councils.id, councilId));
  await logAudit("council_deleted", leader.id, "council", councilId, { name: council.name });
  revalidatePath("/manage");
}

// Live search over bacentas by name — used to find and move a misrouted
// bacenta into the right governorship. Chief-admin only, since only
// Chief Admin can reassign a bacenta's governorship (see
// assignBacentaToGovernorshipAction below).
export async function searchBacentasAction(query: string): Promise<
  { id: string; name: string; area: string; governorshipName: string | null }[]
> {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") return [];
  const q = query.trim().replace(/[%_]/g, "");
  if (q.length < 2) return [];

  return db
    .select({
      id: bacentas.id,
      name: bacentas.name,
      area: bacentas.area,
      governorshipName: governorships.name,
    })
    .from(bacentas)
    .leftJoin(governorships, eq(bacentas.governorshipId, governorships.id))
    .where(ilike(bacentas.name, `%${q}%`))
    .orderBy(bacentas.name)
    .limit(8);
}

// Chief-admin-only: move a bacenta into a (possibly different) governorship —
// the quick fix for one enrolled under the wrong governorship.
export async function assignBacentaToGovernorshipAction(formData: FormData) {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") {
    throw new Error("Only Chief Admin can reassign a bacenta's governorship.");
  }
  const bacentaId = str(formData, "bacentaId");
  const governorshipId = str(formData, "governorshipId");
  if (!bacentaId || !governorshipId) throw new Error("Bacenta and governorship required.");

  const bacenta = await db.query.bacentas.findFirst({ where: eq(bacentas.id, bacentaId) });
  if (!bacenta) throw new Error("Bacenta not found.");
  const gov = await db.query.governorships.findFirst({ where: eq(governorships.id, governorshipId) });
  if (!gov) throw new Error("Governorship not found.");

  await db.update(bacentas).set({ governorshipId }).where(eq(bacentas.id, bacentaId));
  await logAudit("bacenta_updated", leader.id, "bacenta", bacentaId, { governorshipId });
  revalidatePath("/manage");
  revalidatePath(`/manage/governorships/${governorshipId}`);
}
