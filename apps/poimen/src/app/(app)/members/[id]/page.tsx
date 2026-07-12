import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import {
  db,
  leaders,
  members,
  serviceAttendanceDays,
  serviceAttendanceEntries,
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
  const canSee =
    leader.role === "chief_admin" || isSelf || (scope && overseesBacenta(leader, scope));
  if (!canSee) {
    return (
      <p className="card text-sm text-zinc-400">
        This member is outside your scope.
      </p>
    );
  }
  const canEdit =
    leader.role === "chief_admin" || isSelf || (scope && overseesBacenta(leader, scope));

  const history = await db
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
    .limit(12);

  const presentCount = history.filter((h) => h.present).length;

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

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Service attendance
          </h2>
          {history.length > 0 ? (
            <span className="text-xs text-zinc-500">
              {presentCount}/{history.length} present (last {history.length})
            </span>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">No attendance records yet.</p>
        ) : (
          <div className="space-y-1">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-zinc-800 px-3 py-1.5 text-sm"
              >
                <span>{formatDate(h.date)}</span>
                <span className={h.present ? "text-emerald-400" : "text-red-400"}>
                  {h.present ? "Present" : "Absent"}
                  {h.remarks ? (
                    <span className="ml-2 text-xs text-zinc-500">{h.remarks}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        )}
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
