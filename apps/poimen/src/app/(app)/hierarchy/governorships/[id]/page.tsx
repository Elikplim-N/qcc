import Link from "next/link";
import { eq, count } from "drizzle-orm";

import { db, governorships, bacentas, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";

export default async function GovernorshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leader = await requireLeader();

  const isChief = leader.role === "chief_admin";
  if (!isChief) {
    return <p className="card text-sm text-zinc-400">Only chief admin can view this.</p>;
  }

  const gov = await db.query.governorships.findFirst({
    where: eq(governorships.id, id),
  });

  if (!gov) {
    return <p className="card text-sm text-zinc-400">Governorship not found.</p>;
  }

  const govBacentas = await db
    .select()
    .from(bacentas)
    .where(eq(bacentas.governorshipId, id))
    .orderBy(bacentas.name);

  const memberCounts = await db
    .select({ bacentaId: members.bacentaId, count: count() })
    .from(members)
    .where(eq(members.bacentaId, govBacentas[0]?.id ?? ""))
    .groupBy(members.bacentaId);

  const countsMap = new Map(memberCounts.map((c) => [c.bacentaId, c.count]));

  // Get all counts for all bacentas at once
  const allCounts = govBacentas.length > 0
    ? await db
        .select({ bacentaId: members.bacentaId, count: count() })
        .from(members)
        .where(eq(members.bacentaId, govBacentas[0]?.id ?? ""))
        .groupBy(members.bacentaId)
    : [];

  const bacenta_count_map = new Map();
  for (const b of govBacentas) {
    const c = await db
      .select({ n: count() })
      .from(members)
      .where(eq(members.bacentaId, b.id));
    bacenta_count_map.set(b.id, c[0]?.n ?? 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hierarchy" className="text-indigo-400 hover:underline text-sm mb-2 block">
          ← Back
        </Link>
        <h1 className="text-xl font-bold">{gov.name}</h1>
        <p className="text-sm text-zinc-400">Bacentas in this governorship</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Bacenta</th>
              <th className="px-4 py-3 font-semibold">Members</th>
              <th className="px-4 py-3 font-semibold">Area</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {govBacentas.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                  No bacentas in this governorship.
                </td>
              </tr>
            ) : (
              govBacentas.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <Link href={`/hierarchy/bacentas/${b.id}`} className="text-indigo-400 hover:underline font-medium">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{bacenta_count_map.get(b.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${b.area === "area1" ? "bg-violet-950 text-violet-300" : "bg-amber-950 text-amber-300"}`}>
                      {b.area === "area1" ? "Area 1" : "Area 2"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
