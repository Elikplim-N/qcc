import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";

import { db, onTheWaySubmissions, premobilisations } from "@/db";
import { requireLeader } from "@/lib/auth";
import { getScopedBacentas } from "@/lib/scope";
import { cediFromPesewas, formatDate, serviceWeekOf } from "@/lib/week";
import { StatusBadge } from "@/components/status-badge";

export default async function ArrivalsMonitorPage() {
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const byId = new Map(scoped.map((b) => [b.id, b]));
  const weekOf = serviceWeekOf();

  const [premobs, otws] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(premobilisations)
          .where(
            and(
              inArray(premobilisations.bacentaId, ids),
              eq(premobilisations.weekOf, weekOf),
            ),
          ),
        db
          .select()
          .from(onTheWaySubmissions)
          .where(
            and(
              inArray(onTheWaySubmissions.bacentaId, ids),
              eq(onTheWaySubmissions.weekOf, weekOf),
            ),
          ),
      ])
    : [[], []];

  const premobByBacenta = new Map(premobs.map((p) => [p.bacentaId, p]));
  const otwByBacenta = new Map(otws.map((o) => [o.bacentaId, o]));

  const pending = otws.filter((o) => o.status === "submitted");
  const arrived = otws
    .filter((o) => o.status === "approved")
    .reduce((s, o) => s + o.reportedMembers + o.reportedVisitors, 0);
  const onTheWayCount = pending.reduce(
    (s, o) => s + o.reportedMembers + o.reportedVisitors,
    0,
  );

  const area2 = scoped.filter((b) => b.area === "area2");
  const area1 = scoped.filter((b) => b.area === "area1");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Arrivals monitor</h1>
        <p className="text-sm text-zinc-400">Service week of {formatDate(weekOf)}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">Arrived</div>
          <div className="text-2xl font-bold text-emerald-400">{arrived}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">On the way</div>
          <div className="text-2xl font-bold text-amber-400">{onTheWayCount}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">Pending review</div>
          <div className="text-2xl font-bold">{pending.length}</div>
        </div>
      </div>

      {pending.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Pending confirmations
          </h2>
          {pending.map((o) => (
            <Link
              key={o.id}
              href={`/arrivals/monitor/${o.id}`}
              className="card flex items-center justify-between transition hover:border-zinc-600"
            >
              <div>
                <div className="text-sm font-medium">
                  {byId.get(o.bacentaId)?.name ?? "Bacenta"}
                </div>
                <div className="text-xs text-zinc-500">
                  {o.reportedMembers} members + {o.reportedVisitors} visitors ·{" "}
                  {o.vehicles.length} vehicle{o.vehicles.length === 1 ? "" : "s"} ·{" "}
                  {cediFromPesewas(o.costPesewas)}
                </div>
              </div>
              <span className="btn-secondary">Review →</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="card p-0">
        <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Area 2 — bussing ({area2.length})
        </h2>
        <div className="divide-y divide-zinc-800">
          {area2.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No Area 2 bacentas in scope.</p>
          ) : (
            area2.map((b) => {
              const p = premobByBacenta.get(b.id);
              const o = otwByBacenta.get(b.id);
              return (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={p ? "text-emerald-400" : "text-zinc-500"}>
                      {p ? `✓ Pre-mob (${p.attendanceCount})` : "No pre-mob"}
                    </span>
                    {o ? (
                      <Link href={`/arrivals/monitor/${o.id}`} className="flex items-center gap-2">
                        <StatusBadge value={o.status} />
                        <span className="text-zinc-400 underline">
                          {o.reportedMembers + o.reportedVisitors} on board
                        </span>
                      </Link>
                    ) : (
                      <span className="text-zinc-500">No on-the-way</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="card p-0">
        <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Area 1 — pre-mobilisation ({area1.length})
        </h2>
        <div className="divide-y divide-zinc-800">
          {area1.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No Area 1 bacentas in scope.</p>
          ) : (
            area1.map((b) => {
              const p = premobByBacenta.get(b.id);
              return (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm font-medium">{b.name}</div>
                  <span className={`text-xs ${p ? "text-emerald-400" : "text-zinc-500"}`}>
                    {p ? `✓ Submitted (${p.attendanceCount} mobilised)` : "Pending"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
