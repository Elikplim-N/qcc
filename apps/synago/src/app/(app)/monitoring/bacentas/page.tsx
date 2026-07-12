import Link from "next/link";
import { and, count, eq, gte, inArray, lte } from "drizzle-orm";

import { db, fellowshipAttendanceDays, premobilisations, onTheWaySubmissions } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { serviceWeekOf, formatDate } from "@qcc/core/week";

export default async function BacentasMonitoringPage() {
  const leader = await requireLeader();
  const pastoral = ["chief_admin", "council_leader", "governor", "bacenta_leader"].includes(
    leader.role,
  );
  if (!pastoral) {
    return <p className="card text-sm text-zinc-400">Outside your role.</p>;
  }

  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const weekOf = serviceWeekOf();

  const sunday = new Date(weekOf);
  const sat = new Date(sunday);
  sat.setDate(sunday.getDate() - 1);
  const mon = new Date(sunday);
  mon.setDate(sunday.getDate() + 1);
  const satStr = sat.toISOString().split("T")[0];
  const monStr = mon.toISOString().split("T")[0];

  const days = ids.length
    ? await db
        .select({
          bacentaId: fellowshipAttendanceDays.bacentaId,
          status: fellowshipAttendanceDays.status,
        })
        .from(fellowshipAttendanceDays)
        .where(
          and(
            inArray(fellowshipAttendanceDays.bacentaId, ids),
            gte(fellowshipAttendanceDays.attendanceDate, satStr),
            lte(fellowshipAttendanceDays.attendanceDate, monStr),
          ),
        )
    : [];

  const premobs = ids.length
    ? await db
        .select({ bacentaId: premobilisations.bacentaId })
        .from(premobilisations)
        .where(
          and(
            inArray(premobilisations.bacentaId, ids),
            eq(premobilisations.weekOf, weekOf),
          ),
        )
    : [];

  const otws = ids.length
    ? await db
        .select({
          bacentaId: onTheWaySubmissions.bacentaId,
          status: onTheWaySubmissions.status,
        })
        .from(onTheWaySubmissions)
        .where(
          and(
            inArray(onTheWaySubmissions.bacentaId, ids),
            eq(onTheWaySubmissions.weekOf, weekOf),
          ),
        )
    : [];

  const premobIds = new Set(premobs.map((p) => p.bacentaId));
  const otwSubmittedIds = new Set(otws.filter((o) => o.status === "submitted").map((o) => o.bacentaId));
  const otwRejectedIds = new Set(otws.filter((o) => o.status === "rejected").map((o) => o.bacentaId));
  const arrivedIds = new Set(otws.filter((o) => o.status === "approved").map((o) => o.bacentaId));

  // Categories based on progression: Premob → Otw (Area 2) or Mobilised (Area 1)
  const noActivity = scoped.filter((b) => !premobIds.has(b.id)).length;
  const mobilising = scoped.filter((b) => premobIds.has(b.id) && !otwSubmittedIds.has(b.id) && !otwRejectedIds.has(b.id) && !arrivedIds.has(b.id)).length;
  const onTheWay = scoped.filter((b) => otwSubmittedIds.has(b.id)).length;
  const didntBus = scoped.filter((b) => otwRejectedIds.has(b.id)).length;
  const arrived = arrivedIds.size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Arrivals</h1>
        <p className="text-sm text-zinc-400">Monitor bussing and approve arrivals for today's service.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Bacenta Monitoring</h2>

        <div className="space-y-2">
          <CategoryCard
            label="Bacentas With No Activity"
            count={noActivity}
            color="text-red-400"
            borderColor="border-red-500/30"
          />
          <CategoryCard
            label="Bacentas Mobilising"
            count={mobilising}
            color="text-amber-400"
            borderColor="border-amber-500/30"
          />
          <CategoryCard
            label="Bacentas On The Way"
            count={onTheWay}
            color="text-sky-400"
            borderColor="border-sky-500/30"
          />
          <CategoryCard
            label="Bacentas That Didn't Bus"
            count={didntBus}
            color="text-orange-400"
            borderColor="border-orange-500/30"
          />
          <CategoryCard
            label="Bacentas That Have Arrived"
            count={arrived}
            color="text-emerald-400"
            borderColor="border-emerald-500/30"
          />
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  label,
  count,
  color,
  borderColor,
}: {
  label: string;
  count: number;
  color: string;
  borderColor: string;
}) {
  return (
    <div className={`card flex items-center justify-between p-4 border-l-4 ${borderColor}`}>
      <div className="flex items-center gap-4">
        <div className={`text-3xl font-bold ${color} w-12 h-12 flex items-center justify-center rounded border ${borderColor}`}>
          {count}
        </div>
        <span className={`text-lg font-medium ${color}`}>{label}</span>
      </div>
      <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-300">
        View
      </Link>
    </div>
  );
}
