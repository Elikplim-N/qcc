"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, fellowshipAttendanceDays } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canRecordAttendance } from "@qcc/core/permissions";
import { getBacentaScope, logAudit } from "@qcc/core/scope";

// Bacenta leader reports that a fellowship happened (date + visitors).
// Per-member ticking stays in Poimen; this upserts the same fellowship day,
// so a Poimen recording for the same date is one and the same submission.
export async function submitFellowshipReportAction(formData: FormData) {
  const leader = await requireLeader();
  const bacentaId = String(formData.get("bacentaId") ?? "");
  const attendanceDate = String(formData.get("attendanceDate") ?? "");
  const visitorCount = Number(formData.get("visitorCount") ?? 0) || 0;
  if (!bacentaId || !attendanceDate) throw new Error("Missing bacenta or date.");

  const scope = await getBacentaScope(bacentaId);
  if (!scope || !canRecordAttendance(leader, scope)) {
    throw new Error("You cannot report fellowship for this bacenta.");
  }

  const existing = await db.query.fellowshipAttendanceDays.findFirst({
    where: and(
      eq(fellowshipAttendanceDays.bacentaId, bacentaId),
      eq(fellowshipAttendanceDays.attendanceDate, attendanceDate),
    ),
  });

  if (existing) {
    await db
      .update(fellowshipAttendanceDays)
      .set({ takenByLeaderId: leader.id, visitorCount, updatedAt: new Date() })
      .where(eq(fellowshipAttendanceDays.id, existing.id));
  } else {
    await db.insert(fellowshipAttendanceDays).values({
      bacentaId,
      attendanceDate,
      takenByLeaderId: leader.id,
      visitorCount,
      status: "submitted",
    });
  }
  await logAudit("fellowship_reported", leader.id, "bacenta", bacentaId, {
    attendanceDate,
  });
  revalidatePath("/fellowship");
}
