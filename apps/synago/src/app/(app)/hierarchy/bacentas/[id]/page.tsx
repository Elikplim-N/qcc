import Link from "next/link";
import { eq } from "drizzle-orm";

import { db, bacentas, leaders, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { ROLE_LABELS } from "@qcc/core/permissions";

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

  const bacentaLeaders = await db
    .select()
    .from(leaders)
    .where(eq(leaders.bacentaId, id));

  // Get member info for each leader
  const leader_member_map = new Map();
  for (const l of bacentaLeaders) {
    const member = await db.query.members.findFirst({
      where: eq(members.id, l.memberId),
    });
    leader_member_map.set(l.id, member);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hierarchy" className="text-indigo-400 hover:underline text-sm mb-2 block">
          ← Back to Governorships
        </Link>
        <h1 className="text-xl font-bold">{bacenta.name}</h1>
        <p className="text-sm text-zinc-400">Leaders assigned to this bacenta</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Username</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {bacentaLeaders.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                  No leaders assigned to this bacenta.
                </td>
              </tr>
            ) : (
              bacentaLeaders.map((l) => {
                const member = leader_member_map.get(l.id);
                return (
                  <tr key={l.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium">
                      {member?.firstName} {member?.lastName}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{ROLE_LABELS[l.role] || l.role}</td>
                    <td className="px-4 py-3 text-zinc-400">{l.username}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
