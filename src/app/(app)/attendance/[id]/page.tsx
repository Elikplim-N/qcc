import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, members, serviceAttendanceDays, serviceAttendanceEntries } from "@/db";
import { requireLeader } from "@/lib/auth";
import { overseesBacenta } from "@/lib/permissions";
import { getBacentaScope } from "@/lib/scope";
import { formatDate } from "@/lib/week";
import { StatusBadge } from "@/components/status-badge";
import { reviewAttendanceAction } from "../actions";

export default async function AttendanceDayPage({
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
  if (!scope || !(leader.role === "chief_admin" || overseesBacenta(leader, scope))) {
    return <p className="card text-sm text-zinc-400">Outside your scope.</p>;
  }

  const entries = await db
    .select({
      present: serviceAttendanceEntries.present,
      remarks: serviceAttendanceEntries.remarks,
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
    })
    .from(serviceAttendanceEntries)
    .innerJoin(members, eq(serviceAttendanceEntries.memberId, members.id))
    .where(eq(serviceAttendanceEntries.dayId, id))
    .orderBy(members.firstName);

  const present = entries.filter((e) => e.present).length;
  const canReview =
    ["chief_admin", "council_leader", "governor"].includes(leader.role) &&
    day.status === "submitted";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{scope.name}</h1>
          <p className="text-sm text-zinc-400">{formatDate(day.serviceDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={day.status} />
          <Link
            href={`/attendance/record?bacenta=${day.bacentaId}&date=${day.serviceDate}`}
            className="btn-secondary"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="card flex gap-6 text-sm">
        <div>
          <span className="text-2xl font-bold text-emerald-400">{present}</span>
          <span className="text-zinc-500"> / {entries.length} present</span>
        </div>
        <div>
          <span className="text-2xl font-bold">{day.visitorCount}</span>
          <span className="text-zinc-500"> visitors</span>
        </div>
      </div>

      {canReview ? (
        <div className="card flex items-center gap-3">
          <span className="text-sm text-zinc-300">Review this submission:</span>
          <form action={reviewAttendanceAction}>
            <input type="hidden" name="dayId" value={day.id} />
            <input type="hidden" name="decision" value="approved" />
            <button className="btn">Approve</button>
          </form>
          <form action={reviewAttendanceAction}>
            <input type="hidden" name="dayId" value={day.id} />
            <input type="hidden" name="decision" value="rejected" />
            <button className="btn-danger">Reject</button>
          </form>
        </div>
      ) : null}

      <div className="card divide-y divide-zinc-800 p-0">
        {entries.map((e) => (
          <Link
            key={e.memberId}
            href={`/members/${e.memberId}`}
            className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-zinc-900"
          >
            <span>
              {e.firstName} {e.lastName}
            </span>
            <span className={e.present ? "text-emerald-400" : "text-red-400"}>
              {e.present ? "Present" : "Absent"}
              {e.remarks ? (
                <span className="ml-2 text-xs text-zinc-500">{e.remarks}</span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
