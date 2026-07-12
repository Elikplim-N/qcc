import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import {
  db,
  members,
  serviceAttendanceDays,
  serviceAttendanceEntries,
  fellowshipAttendanceDays,
  fellowshipAttendanceEntries,
} from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { overseesBacenta } from "@qcc/core/permissions";
import { getBacentaScope } from "@qcc/core/scope";
import { formatDate } from "@qcc/core/week";

export default async function MemberAttendanceHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type = "service" } = await searchParams;
  const isService = type !== "fellowship";

  const leader = await requireLeader();
  const m = await db.query.members.findFirst({ where: eq(members.id, id) });
  if (!m) notFound();

  const scope = m.bacentaId ? await getBacentaScope(m.bacentaId) : null;

  // Scope check
  const isSelf = m.id === leader.memberId;
  const isCreator = m.createdByLeaderId === leader.id;
  const isUnassigned = !m.bacentaId;
  const canSee =
    leader.role === "chief_admin" || isSelf || isCreator || isUnassigned || (scope && overseesBacenta(leader, scope));
  if (!canSee) {
    return (
      <p className="card text-sm text-zinc-400">
        This member's history is outside your scope.
      </p>
    );
  }

  // Load Sunday service history
  const serviceHistory = isService
    ? await db
        .select({
          date: serviceAttendanceDays.serviceDate,
          present: serviceAttendanceEntries.present,
          remarks: serviceAttendanceEntries.remarks,
        })
        .from(serviceAttendanceEntries)
        .innerJoin(
          serviceAttendanceDays,
          eq(serviceAttendanceEntries.dayId, serviceAttendanceDays.id),
        )
        .where(eq(serviceAttendanceEntries.memberId, m.id))
        .orderBy(desc(serviceAttendanceDays.serviceDate))
        .limit(50)
    : [];

  // Load fellowship history
  const fellowshipHistory = !isService
    ? await db
        .select({
          date: fellowshipAttendanceDays.attendanceDate,
          present: fellowshipAttendanceEntries.present,
          remarks: fellowshipAttendanceEntries.remarks,
        })
        .from(fellowshipAttendanceEntries)
        .innerJoin(
          fellowshipAttendanceDays,
          eq(fellowshipAttendanceEntries.dayId, fellowshipAttendanceDays.id),
        )
        .where(eq(fellowshipAttendanceEntries.memberId, m.id))
        .orderBy(desc(fellowshipAttendanceDays.attendanceDate))
        .limit(50)
    : [];

  const history = isService ? serviceHistory : fellowshipHistory;
  const presentCount = history.filter((h) => h.present).length;

  return (
    <div className="max-w-2xl space-y-6 animate-[slide-up_0.2s_ease-out]">
      <div className="flex items-center gap-3">
        <Link href={`/members/${m.id}`} className="text-zinc-500 hover:text-zinc-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Attendance History — {m.firstName} {m.lastName}
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            Member Code: {m.memberCode}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <Link
          href={`/members/${m.id}/attendance?type=service`}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            isService
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Sunday Service
        </Link>
        <Link
          href={`/members/${m.id}/attendance?type=fellowship`}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            !isService
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Weekly Fellowship
        </Link>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            {isService ? "Service Log" : "Fellowship Log"}
          </h2>
          {history.length > 0 ? (
            <span className="text-xs font-semibold text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
              {presentCount}/{history.length} present (last {history.length})
            </span>
          ) : null}
        </div>

        {history.length === 0 ? (
          <div className="empty-state py-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="font-semibold text-zinc-400">No logs found</p>
            <p className="text-xs text-zinc-500 mt-0.5">No attendance sheets recorded for this member yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-zinc-800/80 px-4 py-3 text-sm hover:bg-zinc-900/20 transition duration-150"
              >
                <div>
                  <div className="font-semibold text-zinc-200">{formatDate(h.date)}</div>
                  {h.remarks ? (
                    <div className="text-xs text-zinc-500 mt-0.5">Remark: {h.remarks}</div>
                  ) : null}
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 ${
                    h.present
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30"
                      : "bg-red-950/40 text-red-400 border border-red-950/20"
                  }`}
                >
                  {h.present ? "Present" : "Absent"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
