"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, serviceAttendanceDays, serviceAttendanceEntries } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canRecordAttendance } from "@qcc/core/permissions";
import { getBacentaScope, logAudit } from "@qcc/core/scope";

export async function saveAttendanceAction(formData: FormData) {
  const leader = await requireLeader();
  const bacentaId = String(formData.get("bacentaId") ?? "");
  const serviceDate = String(formData.get("serviceDate") ?? "");
  if (!bacentaId || !serviceDate) throw new Error("Missing bacenta or date.");

  const scope = await getBacentaScope(bacentaId);
  if (!scope || !canRecordAttendance(leader, scope)) {
    throw new Error("You cannot record attendance for this bacenta.");
  }

  const memberIds = formData.getAll("memberIds").map(String);
  const visitorCount = Number(formData.get("visitorCount") ?? 0) || 0;

  // Upsert the day
  const existing = await db.query.serviceAttendanceDays.findFirst({
    where: and(
      eq(serviceAttendanceDays.bacentaId, bacentaId),
      eq(serviceAttendanceDays.serviceDate, serviceDate),
    ),
  });

  let dayId: string;
  if (existing) {
    dayId = existing.id;
    await db
      .update(serviceAttendanceDays)
      .set({
        takenByLeaderId: leader.id,
        visitorCount,
        status: "submitted",
        updatedAt: new Date(),
      })
      .where(eq(serviceAttendanceDays.id, dayId));
    await db
      .delete(serviceAttendanceEntries)
      .where(eq(serviceAttendanceEntries.dayId, dayId));
  } else {
    const [row] = await db
      .insert(serviceAttendanceDays)
      .values({
        serviceDate,
        bacentaId,
        takenByLeaderId: leader.id,
        visitorCount,
      })
      .returning({ id: serviceAttendanceDays.id });
    dayId = row.id;
  }

  const entries = memberIds.map((memberId) => ({
    dayId,
    memberId,
    present: formData.get(`present_${memberId}`) === "on",
    remarks:
      String(formData.get(`remarks_${memberId}`) ?? "").trim() || null,
  }));
  if (entries.length > 0) {
    await db.insert(serviceAttendanceEntries).values(entries);
  }

  await logAudit("attendance_recorded", leader.id, "attendance_day", dayId, {
    bacentaId,
    serviceDate,
    entries: entries.length,
  });
  revalidatePath("/attendance");
  redirect(`/attendance/${dayId}`);
}

export async function reviewAttendanceAction(formData: FormData) {
  const leader = await requireLeader();
  const dayId = String(formData.get("dayId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!dayId || !["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid review.");
  }
  const day = await db.query.serviceAttendanceDays.findFirst({
    where: eq(serviceAttendanceDays.id, dayId),
  });
  if (!day) throw new Error("Not found.");
  const scope = await getBacentaScope(day.bacentaId);
  const canReview =
    leader.role === "chief_admin" ||
    (scope &&
      ["council_leader", "governor"].includes(leader.role) &&
      canRecordAttendance(leader, scope));
  if (!canReview) throw new Error("You cannot review this submission.");

  await db
    .update(serviceAttendanceDays)
    .set({
      status: decision as "approved" | "rejected",
      reviewedByLeaderId: leader.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(serviceAttendanceDays.id, dayId));

  await logAudit(`attendance_${decision}`, leader.id, "attendance_day", dayId);
  revalidatePath("/attendance");
  revalidatePath(`/attendance/${dayId}`);
}
