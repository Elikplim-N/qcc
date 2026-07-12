import Link from "next/link";
import { eq } from "drizzle-orm";

import { db, bacentas, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";

export default async function BacentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leader = await requireLeader();

  const isChief = leader.role === "chief_admin";
  if (!isChief) {
    return <p className="card text-sm text-zinc-400">Only chief admin can view this.</p>;
  }

  const bacenta = await db.query.bacentas.findFirst({
    where: eq(bacentas.id, id),
  });

  if (!bacenta) {
    return <p className="card text-sm text-zinc-400">Bacenta not found.</p>;
  }

  const bacentaMembers = await db
    .select()
    .from(members)
    .where(eq(members.bacentaId, id))
    .orderBy(members.firstName);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hierarchy" className="text-indigo-400 hover:underline text-sm mb-2 block">
          ← Back to Governorships
        </Link>
        <h1 className="text-xl font-bold">{bacenta.name}</h1>
        <p className="text-sm text-zinc-400">Members ({bacentaMembers.length})</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {bacentaMembers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                  No members in this bacenta.
                </td>
              </tr>
            ) : (
              bacentaMembers.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/members/${m.id}`} className="text-indigo-400 hover:underline">
                      {m.firstName} {m.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{m.phoneNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      m.status === "committed" ? "bg-emerald-950 text-emerald-300" :
                      m.status === "unstable" ? "bg-amber-950 text-amber-300" :
                      "bg-red-950 text-red-300"
                    }`}>
                      {m.status}
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
