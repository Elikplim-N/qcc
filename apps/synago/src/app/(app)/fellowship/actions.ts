"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, fellowshipAttendanceDays } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canRecordAttendance } from "@qcc/core/permissions";
import { getBacentaScope, logAudit } from "@qcc/core/scope";

// Bacenta leader reports fellowship (attendance, income, tithers, photo, etc.)
// Per-member ticking stays in Poimen; this upserts the same fellowship day.
export async function submitFellowshipReportAction(formData: FormData) {
  const leader = await requireLeader();
  const bacentaId = String(formData.get("bacentaId") ?? "");
  const attendanceDate = String(formData.get("attendanceDate") ?? "");
  const attendanceCount = Number(formData.get("attendanceCount") ?? 0) || 0;
  const visitorCount = Number(formData.get("visitorCount") ?? 0) || 0;
  const incomeGhs = Number(formData.get("incomeGhs") ?? 0) || 0;
  const incomePesewas = Math.round(incomeGhs * 100);
  const tithersCount = Number(formData.get("tithersCount") ?? 0) || 0;
  const foreignCurrencyDetails = String(formData.get("foreignCurrencyDetails") ?? "").trim() || null;
  const photoFile = formData.get("photoUrl") as File | null;

  if (!bacentaId || !attendanceDate) throw new Error("Missing bacenta or date.");

  const scope = await getBacentaScope(bacentaId);
  if (!scope || !canRecordAttendance(leader, scope)) {
    throw new Error("You cannot report fellowship for this bacenta.");
  }

  // TODO: Handle photo upload to cloud storage (not implemented in this version)
  // For now, just store the filename or placeholder
  const photoUrl = photoFile?.name ?? null;

  const existing = await db.query.fellowshipAttendanceDays.findFirst({
    where: and(
      eq(fellowshipAttendanceDays.bacentaId, bacentaId),
      eq(fellowshipAttendanceDays.attendanceDate, attendanceDate),
    ),
  });

  if (existing) {
    await db
      .update(fellowshipAttendanceDays)
      .set({
        takenByLeaderId: leader.id,
        attendanceCount,
        visitorCount,
        incomePesewas,
        tithersCount,
        foreignCurrencyDetails,
        photoUrl: photoUrl || existing.photoUrl,
        updatedAt: new Date(),
      })
      .where(eq(fellowshipAttendanceDays.id, existing.id));
  } else {
    await db.insert(fellowshipAttendanceDays).values({
      bacentaId,
      attendanceDate,
      takenByLeaderId: leader.id,
      attendanceCount,
      visitorCount,
      incomePesewas,
      tithersCount,
      foreignCurrencyDetails,
      photoUrl,
      status: "submitted",
    });
  }

  await logAudit("fellowship_reported", leader.id, "bacenta", bacentaId, {
    attendanceDate,
    attendanceCount,
    incomePesewas,
    tithersCount,
  });
  revalidatePath("/fellowship");
}
