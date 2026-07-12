import Link from "next/link";
import { desc, eq, inArray, sql } from "drizzle-orm";

import {
  db,
  serviceAttendanceDays,
  serviceAttendanceEntries,
  fellowshipAttendanceDays,
  fellowshipAttendanceEntries,
} from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { formatDate } from "@qcc/core/week";
import { StatusBadge } from "@qcc/ui/components/status-badge";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type = "service" } = await searchParams;
  const isService = type !== "fellowship";

  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const bacentaName = new Map(scoped.map((b) => [b.id, b.name]));

  const empty = ids.length === 0;

  // Query service attendance if requested
  const serviceDays =
    !isService || empty
      ? []
      : await db
          .select({
            id: serviceAttendanceDays.id,
            serviceDate: serviceAttendanceDays.serviceDate,
            bacentaId: serviceAttendanceDays.bacentaId,
            status: serviceAttendanceDays.status,
            visitorCount: serviceAttendanceDays.visitorCount,
            present: sql<number>`count(*) filter (where ${serviceAttendanceEntries.present})`,
            total: sql<number>`count(${serviceAttendanceEntries.id})`,
          })
          .from(serviceAttendanceDays)
          .leftJoin(
            serviceAttendanceEntries,
            eq(serviceAttendanceEntries.dayId, serviceAttendanceDays.id),
          )
          .where(inArray(serviceAttendanceDays.bacentaId, ids))
          .groupBy(serviceAttendanceDays.id)
          .orderBy(desc(serviceAttendanceDays.serviceDate))
          .limit(50);

  // Query fellowship attendance if requested
  const fellowshipDays =
    isService || empty
      ? []
      : await db
          .select({
            id: fellowshipAttendanceDays.id,
            attendanceDate: fellowshipAttendanceDays.attendanceDate,
            bacentaId: fellowshipAttendanceDays.bacentaId,
            status: fellowshipAttendanceDays.status,
            visitorCount: fellowshipAttendanceDays.visitorCount,
            present: sql<number>`count(*) filter (where ${fellowshipAttendanceEntries.present})`,
            total: sql<number>`count(${fellowshipAttendanceEntries.id})`,
          })
          .from(fellowshipAttendanceDays)
          .leftJoin(
            fellowshipAttendanceEntries,
            eq(fellowshipAttendanceEntries.dayId, fellowshipAttendanceDays.id),
          )
          .where(inArray(fellowshipAttendanceDays.bacentaId, ids))
          .groupBy(fellowshipAttendanceDays.id)
          .orderBy(desc(fellowshipAttendanceDays.attendanceDate))
          .limit(50);

  return (
    <div className="space-y-6 animate-[slide-up_0.2s_ease-out]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">Attendance</h1>
        <Link
          href={`/attendance/record?type=${isService ? "service" : "fellowship"}`}
          className="btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Record {isService ? "Service" : "Fellowship"}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <Link
          href="/attendance?type=service"
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            isService
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Sunday Service
        </Link>
        <Link
          href="/attendance?type=fellowship"
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            !isService
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Weekly Fellowship
        </Link>
      </div>

      <div className="card divide-y divide-zinc-800/60 p-0 overflow-hidden">
        {isService ? (
          serviceDays.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <p className="font-semibold text-zinc-400">No service attendance recorded yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">Click "Record Service" above to add one.</p>
            </div>
          ) : (
            serviceDays.map((d) => (
              <Link
                key={d.id}
                href={`/attendance/service/${d.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-zinc-900/60"
              >
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {bacentaName.get(d.bacentaId) ?? "Bacenta"}
                  </div>
                  <div className="text-xs text-zinc-500 font-medium">
                    {formatDate(d.serviceDate)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    <span className="font-semibold text-emerald-400">{d.present}</span>
                    <span className="text-zinc-500">/{d.total}</span>
                    {d.visitorCount > 0 ? (
                      <span className="ml-2 text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/30">
                        +{d.visitorCount} visitors
                      </span>
                    ) : null}
                  </span>
                  <StatusBadge value={d.status} />
                </div>
              </Link>
            ))
          )
        ) : (
          fellowshipDays.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <p className="font-semibold text-zinc-400">No fellowship attendance recorded yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">Click "Record Fellowship" above to add one.</p>
            </div>
          ) : (
            fellowshipDays.map((d) => (
              <Link
                key={d.id}
                href={`/attendance/fellowship/${d.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-zinc-900/60"
              >
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {bacentaName.get(d.bacentaId) ?? "Bacenta"}
                  </div>
                  <div className="text-xs text-zinc-500 font-medium">
                    {formatDate(d.attendanceDate)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    <span className="font-semibold text-emerald-400">{d.present}</span>
                    <span className="text-zinc-500">/{d.total}</span>
                    {d.visitorCount > 0 ? (
                      <span className="ml-2 text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/30">
                        +{d.visitorCount} visitors
                      </span>
                    ) : null}
                  </span>
                  <StatusBadge value={d.status} />
                </div>
              </Link>
            ))
          )
        )}
      </div>
    </div>
  );
}
