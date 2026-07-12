import Link from "next/link";
import { eq } from "drizzle-orm";

import { db, governorships, bacentas, leaders, members } from "@qcc/db";
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

  // Get leader info for each bacenta
  const bacenta_leader_map = new Map();
  for (const b of govBacentas) {
    const leader_ = await db.query.leaders.findFirst({
      where: eq(leaders.bacentaId, b.id),
    });
    if (leader_) {
      const member = await db.query.members.findFirst({
        where: eq(members.id, leader_.memberId),
      });
      bacenta_leader_map.set(b.id, member?.firstName ?? "");
    }
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
              <th className="px-4 py-3 font-semibold">Leader</th>
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
                  <td className="px-4 py-3 text-zinc-400">{bacenta_leader_map.get(b.id) || "—"}</td>
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
