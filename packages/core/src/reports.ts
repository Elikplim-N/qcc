import { and, eq, gte, lte } from "drizzle-orm";
import {
  db,
  members,
  serviceAttendanceDays,
  serviceAttendanceEntries,
  fellowshipAttendanceDays,
  fellowshipAttendanceEntries,
  attendanceReports,
} from "@qcc/db";

/** Generates or updates the pre-calculated report for a bacenta and service week. */
export async function generateWeeklyReport(bacentaId: string, weekOf: string) {
  // Get all members currently in the bacenta
  const bacentaMembers = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.bacentaId, bacentaId));
  const totalCount = bacentaMembers.length;
  if (totalCount === 0) return;

  // 1. Service Attendance Counts
  const serviceDay = await db.query.serviceAttendanceDays.findFirst({
    where: and(
      eq(serviceAttendanceDays.bacentaId, bacentaId),
      eq(serviceAttendanceDays.serviceDate, weekOf),
    ),
  });

  let serviceAttended = 0;
  if (serviceDay) {
    const presentEntries = await db
      .select()
      .from(serviceAttendanceEntries)
      .where(
        and(
          eq(serviceAttendanceEntries.dayId, serviceDay.id),
          eq(serviceAttendanceEntries.present, true),
        ),
      );
    serviceAttended = presentEntries.length;
  }
  const serviceMissed = Math.max(0, totalCount - serviceAttended);

  // 2. Fellowship Attendance Counts (Sat-Mon around the Sunday weekOf date)
  // Calculate date range: weekOf - 1 day (Saturday) to weekOf + 1 day (Monday)
  const sunday = new Date(weekOf);
  const sat = new Date(sunday);
  sat.setDate(sunday.getDate() - 1);
  const mon = new Date(sunday);
  mon.setDate(sunday.getDate() + 1);

  const satStr = sat.toISOString().split("T")[0];
  const monStr = mon.toISOString().split("T")[0];

  const fellowshipDay = await db.query.fellowshipAttendanceDays.findFirst({
    where: and(
      eq(fellowshipAttendanceDays.bacentaId, bacentaId),
      gte(fellowshipAttendanceDays.attendanceDate, satStr),
      lte(fellowshipAttendanceDays.attendanceDate, monStr),
    ),
  });

  let fellowshipAttended = 0;
  if (fellowshipDay) {
    const presentEntries = await db
      .select()
      .from(fellowshipAttendanceEntries)
      .where(
        and(
          eq(fellowshipAttendanceEntries.dayId, fellowshipDay.id),
          eq(fellowshipAttendanceEntries.present, true),
        ),
      );
    fellowshipAttended = presentEntries.length;
  }
  const fellowshipMissed = Math.max(0, totalCount - fellowshipAttended);

  // Upsert the report
  await db
    .insert(attendanceReports)
    .values({
      bacentaId,
      weekOf,
      serviceAttended,
      serviceMissed,
      fellowshipAttended,
      fellowshipMissed,
      generatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [attendanceReports.bacentaId, attendanceReports.weekOf],
      set: {
        serviceAttended,
        serviceMissed,
        fellowshipAttended,
        fellowshipMissed,
        generatedAt: new Date(),
      },
    });
}

import { getBacentaScope } from "./scope";
import { inArray } from "drizzle-orm";
import { lastNSundays } from "./week";

export async function getMissingMembers(bacentaIds: string[]) {
  if (bacentaIds.length === 0) return [];

  // Get the last 2 Sundays
  const sundays = lastNSundays(2);
  if (sundays.length < 2) return [];

  // Find the recorded service days for these sundays in our scoped bacentas
  const days = await db
    .select({ id: serviceAttendanceDays.id, serviceDate: serviceAttendanceDays.serviceDate, bacentaId: serviceAttendanceDays.bacentaId })
    .from(serviceAttendanceDays)
    .where(
      and(
        inArray(serviceAttendanceDays.bacentaId, bacentaIds),
        inArray(serviceAttendanceDays.serviceDate, sundays),
      ),
    );

  // Group days by bacenta
  const daysByBacenta = new Map<string, typeof days>();
  for (const d of days) {
    const list = daysByBacenta.get(d.bacentaId) ?? [];
    list.push(d);
    daysByBacenta.set(d.bacentaId, list);
  }

  const flaggedMembers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    bacentaId: string | null;
    bacentaName: string;
    missedDates: string[];
  }> = [];

  for (const [bacentaId, bDays] of daysByBacenta.entries()) {
    // We only care if we have exactly 2 recorded services to check consecutives
    if (bDays.length < 2) continue;

    const dayIds = bDays.map((d) => d.id);

    // Fetch members of this bacenta
    const bMembers = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        bacentaId: members.bacentaId,
      })
      .from(members)
      .where(eq(members.bacentaId, bacentaId));

    if (bMembers.length === 0) continue;

    // Fetch attendance entries for these days
    const entries = await db
      .select()
      .from(serviceAttendanceEntries)
      .where(
        and(
          inArray(serviceAttendanceEntries.dayId, dayIds),
          inArray(serviceAttendanceEntries.memberId, bMembers.map((m) => m.id)),
        ),
      );

    // Map memberId -> dayId -> present
    const attendanceMap = new Map<string, Map<string, boolean>>();
    for (const e of entries) {
      const mMap = attendanceMap.get(e.memberId) ?? new Map<string, boolean>();
      mMap.set(e.dayId, e.present);
      attendanceMap.set(e.memberId, mMap);
    }

    // Get bacenta info
    const scope = await getBacentaScope(bacentaId);
    const bacentaName = scope?.name ?? "Bacenta";

    for (const m of bMembers) {
      const mMap = attendanceMap.get(m.id);
      let missedCount = 0;
      const missedDates: string[] = [];

      for (const d of bDays) {
        const present = mMap?.get(d.id);
        if (present === undefined || present === false) {
          missedCount++;
          missedDates.push(d.serviceDate);
        }
      }

      if (missedCount >= 2) {
        flaggedMembers.push({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          bacentaId: m.bacentaId,
          bacentaName,
          missedDates: missedDates.sort(),
        });
      }
    }
  }

  return flaggedMembers;
}

export async function getWeeklyStats(bacentaIds: string[], weekOf: string) {
  if (bacentaIds.length === 0) return [];

  const reports = await db
    .select()
    .from(attendanceReports)
    .where(
      and(
        inArray(attendanceReports.bacentaId, bacentaIds),
        eq(attendanceReports.weekOf, weekOf),
      ),
    );

  return reports;
}
