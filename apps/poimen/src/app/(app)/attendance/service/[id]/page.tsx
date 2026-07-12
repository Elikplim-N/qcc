import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import {
  db,
  members,
  serviceAttendanceDays,
  serviceAttendanceEntries,
  leaders,
} from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canRecordAttendance } from "@qcc/core/permissions";
import { getBacentaScope } from "@qcc/core/scope";
import { formatDate } from "@qcc/core/week";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import { reviewAttendanceAction } from "../../actions"; // We'll link the actions properly

export default async function ServiceAttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leader = await requireLeader();

  const day = await db.query.serviceAttendanceDays.findFirst({
    where: eq(serviceAttendanceDays.id, id),
  });
  if (!day) notFound();

  const scope = await getBacentaScope(day.bacentaId);
  if (!scope) notFound();

  // Scope check
  const isChief = leader.role === "chief_admin";
  const canSee = isChief || canRecordAttendance(leader, scope);
  if (!canSee) {
    return (
      <p className="card text-sm text-zinc-400">
        This attendance record is outside your scope.
      </p>
    );
  }

  const recorder = await db.query.leaders.findFirst({
    where: eq(leaders.id, day.takenByLeaderId),
  });

  const entries = await db
    .select({
      id: serviceAttendanceEntries.id,
      present: serviceAttendanceEntries.present,
      remarks: serviceAttendanceEntries.remarks,
      firstName: members.firstName,
      lastName: members.lastName,
    })
    .from(serviceAttendanceEntries)
    .innerJoin(members, eq(serviceAttendanceEntries.memberId, members.id))
    .where(eq(serviceAttendanceEntries.dayId, day.id))
    .orderBy(members.firstName, members.lastName);

  const presentCount = entries.filter((e) => e.present).length;
  const absentCount = entries.filter((e) => !e.present).length;

  const canReview =
    isChief ||
    (["council_leader", "governor"].includes(leader.role) &&
      canRecordAttendance(leader, scope));

  return (
    <div className="max-w-2xl space-y-6 animate-[slide-up_0.2s_ease-out]">
      <div className="flex items-center gap-3">
        <Link href="/attendance?type=service" className="text-zinc-500 hover:text-zinc-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            {scope.name} — Service Attendance
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            Service Date: {formatDate(day.serviceDate)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-zinc-500 font-bold">Status</div>
          <div className="mt-1">
            <StatusBadge value={day.status} />
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-zinc-500 font-bold">Present / Total</div>
          <div className="mt-1 text-lg font-bold text-zinc-100">
            {presentCount} <span className="text-sm font-normal text-zinc-500">/ {entries.length}</span>
          </div>
        </div>
        <div className="card col-span-2 sm:col-span-1">
          <div className="text-xs uppercase tracking-wide text-zinc-500 font-bold">Visitors</div>
          <div className="mt-1 text-lg font-bold text-zinc-100">{day.visitorCount}</div>
        </div>
      </div>

      <div className="card border-zinc-800/80 p-0 overflow-hidden">
        <div className="border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/10 flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Attendance Roll ({entries.length} total)
          </h2>
          <span className="text-xs font-semibold text-emerald-400">{presentCount} present · {absentCount} absent</span>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {entries.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No members recorded in this session.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-semibold text-zinc-200">
                  {e.firstName} {e.lastName}
                  {e.remarks ? (
                    <span className="ml-2 text-xs text-zinc-500 font-normal">({e.remarks})</span>
                  ) : null}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 ${
                    e.present
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30"
                      : "bg-red-950/40 text-red-400 border border-red-950/20"
                  }`}
                >
                  {e.present ? "✓ Present" : "✕ Absent"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/attendance/record?bacenta=${day.bacentaId}&date=${day.serviceDate}&type=service`}
          className="btn-secondary text-sm"
        >
          Edit record
        </Link>
      </div>

      {/* Review Section */}
      {canReview && day.status === "submitted" ? (
        <div className="card border border-indigo-900/30 bg-indigo-950/5 p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200">Review Attendance Submission</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            As a supervisor, review this attendance report. Approved logs are locked and reported to dashboards.
          </p>
          <form action={reviewAttendanceAction} className="flex gap-2">
            <input type="hidden" name="dayId" value={day.id} />
            <button
              name="decision"
              value="approved"
              className="btn text-xs px-3.5 py-1.5 font-bold cursor-pointer"
            >
              Approve
            </button>
            <button
              name="decision"
              value="rejected"
              className="btn-danger text-xs px-3.5 py-1.5 font-bold cursor-pointer"
            >
              Reject
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
