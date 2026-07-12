"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  db,
  onTheWaySubmissions,
  premobilisations,
  settings,
  type VehicleEntry,
} from "@/db";
import { requireLeader } from "@/lib/auth";
import {
  canApproveArrivals,
  canEnterCounterCount,
  canSubmitArrivals,
} from "@/lib/permissions";
import { getBacentaScope, logAudit } from "@/lib/scope";
import { serviceWeekOf } from "@/lib/week";

const VEHICLE_TYPES = new Set(["Sprinter", "Urvan", "Car"]);

export async function submitPremobAction(formData: FormData) {
  const leader = await requireLeader();
  if (!canSubmitArrivals(leader) || !leader.bacentaId) {
    throw new Error("Only bacenta leaders submit arrivals forms.");
  }
  const photoUrl = String(formData.get("photoUrl") ?? "");
  const attendanceCount = Number(formData.get("attendanceCount") ?? 0) || 0;
  if (!photoUrl) throw new Error("A photo is required for pre-mobilisation.");

  const weekOf = serviceWeekOf();
  const code = await db.query.settings.findFirst({
    where: eq(settings.key, "code_of_the_day"),
  });

  await db
    .insert(premobilisations)
    .values({
      weekOf,
      bacentaId: leader.bacentaId,
      leaderId: leader.id,
      photoUrl,
      attendanceCount,
      codeOfTheDay: code?.value ?? null,
    })
    .onConflictDoUpdate({
      target: [premobilisations.bacentaId, premobilisations.weekOf],
      set: {
        photoUrl,
        attendanceCount,
        leaderId: leader.id,
        codeOfTheDay: code?.value ?? null,
        updatedAt: new Date(),
      },
    });

  await logAudit("premob_submitted", leader.id, "bacenta", leader.bacentaId, {
    weekOf,
    attendanceCount,
  });
  revalidatePath("/arrivals");
  redirect("/arrivals");
}

export async function submitOnTheWayAction(formData: FormData) {
  const leader = await requireLeader();
  if (!canSubmitArrivals(leader) || !leader.bacentaId) {
    throw new Error("Only bacenta leaders submit arrivals forms.");
  }
  if (leader.area !== "area2") {
    throw new Error("On-the-Way applies to Area 2 bacentas only.");
  }
  const weekOf = serviceWeekOf();

  // Strict ordering: Pre-Mobilisation must exist for this week first.
  const premob = await db.query.premobilisations.findFirst({
    where: and(
      eq(premobilisations.bacentaId, leader.bacentaId),
      eq(premobilisations.weekOf, weekOf),
    ),
  });
  if (!premob) {
    throw new Error("Submit Pre-Mobilisation before On-the-Way.");
  }

  const existing = await db.query.onTheWaySubmissions.findFirst({
    where: and(
      eq(onTheWaySubmissions.bacentaId, leader.bacentaId),
      eq(onTheWaySubmissions.weekOf, weekOf),
    ),
  });
  if (existing?.status === "approved") {
    throw new Error("This submission has already been approved and is locked.");
  }

  let vehicles: VehicleEntry[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("vehicles") ?? "[]"));
    if (Array.isArray(parsed)) {
      vehicles = parsed
        .filter((v) => VEHICLE_TYPES.has(v?.type))
        .map((v) => ({
          type: v.type,
          leaderCount: Number(v.leaderCount) || 0,
          photoUrl: typeof v.photoUrl === "string" && v.photoUrl ? v.photoUrl : null,
        }));
    }
  } catch {
    vehicles = [];
  }
  if (vehicles.length === 0) throw new Error("Add at least one vehicle.");

  const values = {
    weekOf,
    bacentaId: leader.bacentaId,
    leaderId: leader.id,
    reportedMembers: Number(formData.get("reportedMembers") ?? 0) || 0,
    reportedVisitors: Number(formData.get("reportedVisitors") ?? 0) || 0,
    vehicles,
    costPesewas: Math.round((Number(formData.get("costCedis") ?? 0) || 0) * 100),
    momoNumber: String(formData.get("momoNumber") ?? "").trim() || null,
    status: "submitted" as const,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(onTheWaySubmissions)
      .set(values)
      .where(eq(onTheWaySubmissions.id, existing.id));
  } else {
    await db.insert(onTheWaySubmissions).values(values);
  }

  await logAudit("on_the_way_submitted", leader.id, "bacenta", leader.bacentaId, {
    weekOf,
    members: values.reportedMembers,
    visitors: values.reportedVisitors,
  });
  revalidatePath("/arrivals");
  revalidatePath("/arrivals/monitor");
  redirect("/arrivals");
}

export async function reviewOnTheWayAction(formData: FormData) {
  const leader = await requireLeader();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid review.");
  }

  const sub = await db.query.onTheWaySubmissions.findFirst({
    where: eq(onTheWaySubmissions.id, id),
  });
  if (!sub) throw new Error("Submission not found.");
  const scope = await getBacentaScope(sub.bacentaId);
  if (!scope || !canApproveArrivals(leader, scope)) {
    // Counters may enter counts but not approve
    if (!(decision === "counted" && canEnterCounterCount(leader))) {
      throw new Error("You cannot review this submission.");
    }
  }

  // Merge reviewer's per-vehicle counter data alongside leader counts.
  const vehicles = (sub.vehicles ?? []).map((v, i) => {
    const counterCount = formData.get(`counterCount_${i}`);
    const inAndOut = String(formData.get(`inAndOut_${i}`) ?? "");
    const topUp = formData.get(`topUp_${i}`);
    return {
      ...v,
      counterCount:
        counterCount !== null && String(counterCount) !== ""
          ? Number(counterCount) || 0
          : (v.counterCount ?? null),
      inAndOut: ["in_and_out", "only_in"].includes(inAndOut)
        ? (inAndOut as "in_and_out" | "only_in")
        : (v.inAndOut ?? null),
      topUp:
        topUp !== null && String(topUp) !== ""
          ? Number(topUp) || 0
          : (v.topUp ?? null),
    };
  });

  const reportedMembers = formData.get("reportedMembers");
  const reportedVisitors = formData.get("reportedVisitors");

  await db
    .update(onTheWaySubmissions)
    .set({
      vehicles,
      reportedMembers:
        reportedMembers !== null && String(reportedMembers) !== ""
          ? Number(reportedMembers) || 0
          : sub.reportedMembers,
      reportedVisitors:
        reportedVisitors !== null && String(reportedVisitors) !== ""
          ? Number(reportedVisitors) || 0
          : sub.reportedVisitors,
      status: decision as "approved" | "rejected",
      reviewNotes: String(formData.get("reviewNotes") ?? "").trim() || null,
      reviewedByLeaderId: leader.id,
      reviewedAt: new Date(),
      arrivedAt: decision === "approved" ? new Date() : sub.arrivedAt,
      updatedAt: new Date(),
    })
    .where(eq(onTheWaySubmissions.id, id));

  await logAudit(`arrival_${decision}`, leader.id, "on_the_way", id, {
    bacentaId: sub.bacentaId,
    weekOf: sub.weekOf,
    submittedByLeaderId: sub.leaderId,
  });
  revalidatePath("/arrivals/monitor");
  redirect("/arrivals/monitor");
}

export async function saveCounterCountsAction(formData: FormData) {
  const leader = await requireLeader();
  if (!canEnterCounterCount(leader)) {
    throw new Error("You cannot enter counter counts.");
  }
  const id = String(formData.get("id") ?? "");
  const sub = await db.query.onTheWaySubmissions.findFirst({
    where: eq(onTheWaySubmissions.id, id),
  });
  if (!sub) throw new Error("Submission not found.");

  const vehicles = (sub.vehicles ?? []).map((v, i) => {
    const counterCount = formData.get(`counterCount_${i}`);
    return {
      ...v,
      counterCount:
        counterCount !== null && String(counterCount) !== ""
          ? Number(counterCount) || 0
          : (v.counterCount ?? null),
    };
  });

  await db
    .update(onTheWaySubmissions)
    .set({ vehicles, updatedAt: new Date() })
    .where(eq(onTheWaySubmissions.id, id));

  await logAudit("counter_counts_saved", leader.id, "on_the_way", id);
  revalidatePath("/arrivals/monitor");
  redirect(`/arrivals/monitor/${id}`);
}
