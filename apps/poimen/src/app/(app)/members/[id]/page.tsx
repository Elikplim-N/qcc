import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import {
  db,
  leaders,
  members,
  serviceAttendanceDays,
  serviceAttendanceEntries,
  fellowshipAttendanceDays,
  fellowshipAttendanceEntries,
} from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { overseesBacenta, ROLE_LABELS } from "@qcc/core/permissions";
import { getBacentaScope } from "@qcc/core/scope";
import { formatDate } from "@qcc/core/week";
import { StatusBadge } from "@qcc/ui/components/status-badge";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leader = await requireLeader();

  const m = await db.query.members.findFirst({ where: eq(members.id, id) });
  if (!m) notFound();

  const leaderRow = await db.query.leaders.findFirst({
    where: eq(leaders.memberId, m.id),
  });

  const displayBacentaId = (leaderRow && leaderRow.role === "bacenta_leader" && leaderRow.bacentaId)
    ? leaderRow.bacentaId
    : m.bacentaId;

  const scope = displayBacentaId ? await getBacentaScope(displayBacentaId) : null;

  const isSelf = m.id === leader.memberId;
  const isCreator = m.createdByLeaderId === leader.id;
  const isUnassigned = !m.bacentaId;
  const canSee =
    leader.role === "chief_admin" || isSelf || isCreator || isUnassigned || (scope && overseesBacenta(leader, scope));
  if (!canSee) {
    return (
      <p className="card text-sm text-zinc-400">
        This member is outside your scope.
      </p>
    );
  }
  const canEdit =
    leader.role === "chief_admin" || isSelf || isCreator || isUnassigned || (scope && overseesBacenta(leader, scope));

  const lastServiceList = await db
    .select({ date: serviceAttendanceDays.serviceDate })
    .from(serviceAttendanceEntries)
    .innerJoin(
      serviceAttendanceDays,
      eq(serviceAttendanceEntries.dayId, serviceAttendanceDays.id),
    )
    .where(
      and(
        eq(serviceAttendanceEntries.memberId, m.id),
        eq(serviceAttendanceEntries.present, true),
      ),
    )
    .orderBy(desc(serviceAttendanceDays.serviceDate))
    .limit(1);
  const lastServiceDate = lastServiceList[0]?.date ?? null;

  const lastFellowshipList = await db
    .select({ date: fellowshipAttendanceDays.attendanceDate })
    .from(fellowshipAttendanceEntries)
    .innerJoin(
      fellowshipAttendanceDays,
      eq(fellowshipAttendanceEntries.dayId, fellowshipAttendanceDays.id),
    )
    .where(
      and(
        eq(fellowshipAttendanceEntries.memberId, m.id),
        eq(fellowshipAttendanceEntries.present, true),
      ),
    )
    .orderBy(desc(fellowshipAttendanceDays.attendanceDate))
    .limit(1);
  const lastFellowshipDate = lastFellowshipList[0]?.date ?? null;

  const allServiceHistory = await db
    .select({ present: serviceAttendanceEntries.present })
    .from(serviceAttendanceEntries)
    .innerJoin(
      serviceAttendanceDays,
      eq(serviceAttendanceEntries.dayId, serviceAttendanceDays.id),
    )
    .where(eq(serviceAttendanceEntries.memberId, m.id))
    .orderBy(desc(serviceAttendanceDays.serviceDate))
    .limit(10);

  let streak = 0;
  for (const h of allServiceHistory) {
    if (h.present) {
      streak++;
    } else {
      break;
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {m.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.photoUrl}
              alt=""
              className="h-16 w-16 rounded-full border border-zinc-700 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-lg font-bold text-zinc-400">
              {m.firstName[0]}
              {m.lastName[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">
              {m.firstName} {m.otherName ? `${m.otherName} ` : ""}
              {m.lastName}
            </h1>
            <div className="text-xs text-zinc-500">{m.memberCode}</div>
            <div className="mt-1 flex gap-2">
              <StatusBadge value={m.status} />
              {scope ? <StatusBadge value={scope.area} /> : null}
              {leaderRow ? (
                <span className="badge border border-zinc-600 bg-zinc-800 text-zinc-200">
                  {ROLE_LABELS[leaderRow.role as keyof typeof ROLE_LABELS]}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {canEdit ? (
          <Link href={`/members/${m.id}/edit`} className="btn-secondary">
            Edit
          </Link>
        ) : null}
      </div>

      <div className="card grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Field label="Phone" value={m.phoneNumber} />
        <Field label="Alt phone" value={m.altPhoneNumber} />
        <Field label="Email" value={m.email} />
        <Field label="Location" value={m.location} />
        <Field label="Date of birth" value={m.dateOfBirth ? formatDate(m.dateOfBirth) : null} />
        <Field label="Gender" value={m.gender} />
        <Field label="Bacenta" value={scope?.name ?? "Unassigned"} />
        <Field
          label="Occupation"
          value={m.isWorking ? "Working" : m.school ? `Student — ${m.school}` : "Student"}
        />
        {m.notes ? <Field label="Notes" value={m.notes} /> : null}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Attendance Summary
          </h2>
          <Link
            href={`/members/${m.id}/attendance`}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            View full history &rarr;
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500 font-bold">Last Service</div>
            <div className="mt-1 text-sm font-semibold text-zinc-200">
              {lastServiceDate ? formatDate(lastServiceDate) : "Never"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500 font-bold">Last Fellowship</div>
            <div className="mt-1 text-sm font-semibold text-zinc-200">
              {lastFellowshipDate ? formatDate(lastFellowshipDate) : "Never"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500 font-bold">Service Streak</div>
            <div className="mt-1 text-sm font-bold text-indigo-400">
              {streak > 0 ? `${streak} weeks` : "No streak"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-zinc-200">{value || "—"}</div>
    </div>
  );
}
