"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, members, leaders } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { generateMemberCode } from "@qcc/core/member-code";
import { canManageMembersOf } from "@qcc/core/permissions";
import { getBacentaScope, logAudit } from "@qcc/core/scope";

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

async function assertCanManage(bacentaId: string) {
  const leader = await requireLeader();
  const scope = await getBacentaScope(bacentaId);
  if (!scope || !canManageMembersOf(leader, scope)) {
    throw new Error("You do not have permission to manage members of this bacenta.");
  }
  return leader;
}

export async function createMemberAction(formData: FormData) {
  const bacentaId = str(formData, "bacentaId");
  let leader;
  if (bacentaId) {
    leader = await assertCanManage(bacentaId);
  } else {
    leader = await requireLeader();
  }

  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  const phoneNumber = str(formData, "phoneNumber");
  if (!firstName || !lastName || !phoneNumber) {
    throw new Error("First name, last name and phone number are required.");
  }

  const [row] = await db
    .insert(members)
    .values({
      memberCode: generateMemberCode(firstName, lastName, phoneNumber),
      firstName,
      lastName,
      otherName: str(formData, "otherName"),
      gender: (str(formData, "gender") as "male" | "female" | null) ?? null,
      phoneNumber,
      altPhoneNumber: str(formData, "altPhoneNumber"),
      email: str(formData, "email"),
      location: str(formData, "location"),
      dateOfBirth: str(formData, "dateOfBirth"),
      isWorking: formData.get("isWorking") === "on",
      school: str(formData, "school"),
      status:
        (str(formData, "status") as "committed" | "unstable" | "lost" | null) ??
        "committed",
      photoUrl: str(formData, "photoUrl"),
      bacentaId,
      notes: str(formData, "notes"),
      createdByLeaderId: leader.id,
    })
    .returning({ id: members.id });

  await logAudit("member_created", leader.id, "member", row.id);
  revalidatePath("/members");
  redirect(`/members/${row.id}`);
}

export async function updateMemberAction(formData: FormData) {
  const memberId = str(formData, "memberId");
  if (!memberId) throw new Error("Missing member.");

  const existing = await db.query.members.findFirst({
    where: eq(members.id, memberId),
  });
  if (!existing) throw new Error("Member not found.");

  const leader = await requireLeader();
  const isSelf = existing.id === leader.memberId;
  const isCreator = existing.createdByLeaderId === leader.id;

  const currentBacentaId = existing.bacentaId;
  const targetBacentaId = str(formData, "bacentaId");

  if (!isSelf && !isCreator && leader.role !== "chief_admin") {
    if (targetBacentaId) {
      const scope = await getBacentaScope(targetBacentaId);
      if (!scope || !canManageMembersOf(leader, scope)) {
        throw new Error("You do not have permission to manage members of this bacenta.");
      }
    }
    if (currentBacentaId && currentBacentaId !== targetBacentaId) {
      const src = await getBacentaScope(currentBacentaId);
      if (!src || !canManageMembersOf(leader, src)) {
        throw new Error("You cannot move a member out of a bacenta you do not oversee.");
      }
    }
  }

  await db
    .update(members)
    .set({
      firstName: str(formData, "firstName") ?? existing.firstName,
      lastName: str(formData, "lastName") ?? existing.lastName,
      otherName: str(formData, "otherName"),
      gender: (str(formData, "gender") as "male" | "female" | null) ?? null,
      phoneNumber: str(formData, "phoneNumber") ?? existing.phoneNumber,
      altPhoneNumber: str(formData, "altPhoneNumber"),
      email: str(formData, "email"),
      location: str(formData, "location"),
      dateOfBirth: str(formData, "dateOfBirth"),
      isWorking: formData.get("isWorking") === "on",
      school: str(formData, "school"),
      status:
        (str(formData, "status") as "committed" | "unstable" | "lost" | null) ??
        existing.status,
      photoUrl: str(formData, "photoUrl") ?? existing.photoUrl,
      bacentaId: targetBacentaId,
      notes: str(formData, "notes"),
      updatedAt: new Date(),
    })
    .where(eq(members.id, memberId));

  // Sync leadership record if this member is a bacenta_leader
  const leaderRow = await db.query.leaders.findFirst({
    where: eq(leaders.memberId, memberId),
  });
  if (leaderRow && leaderRow.role === "bacenta_leader") {
    await db
      .update(leaders)
      .set({ bacentaId: targetBacentaId })
      .where(eq(leaders.id, leaderRow.id));
  }

  await logAudit("member_updated", leader.id, "member", memberId);
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  redirect(`/members/${memberId}`);
}
