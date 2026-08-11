"use server";

import { eq } from "drizzle-orm";
import postgres from "postgres";

import { db, members, leaders } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";

// Reuse normalization from CLI script
function normName(v: string | null): string | null {
  if (!v) return null;
  const n = v.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  return n.length ? n : null;
}

function normEmail(v: string | null): string | null {
  if (!v) return null;
  const n = v.trim().toLowerCase();
  return n.length ? n : null;
}

function normPhone(v: string | null): string | null {
  if (!v) return null;
  let d = v.replace(/\D/g, "");
  if (d.startsWith("233") && d.length === 12) d = "0" + d.slice(3);
  if (d.length === 9) d = "0" + d;
  return d.length >= 9 ? d : null;
}

interface Person {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string;
  created_at: Date;
  is_leader: boolean;
  is_member: boolean;
  is_visitor: boolean;
}

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    let p = this.parent.get(x) ?? x;
    if (p !== x) {
      p = this.find(p);
      this.parent.set(x, p);
    }
    return p;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

export async function findDuplicatesAction() {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") {
    throw new Error("Only chief admins can view duplicates.");
  }

  try {
    const peopleList = await db.select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      otherName: members.otherName,
      email: members.email,
      phoneNumber: members.phoneNumber,
      createdAt: members.createdAt,
      leaderId: leaders.id,
    })
    .from(members)
    .leftJoin(leaders, eq(leaders.memberId, members.id));

    const people: Person[] = peopleList.map((p) => {
      const parts = [p.firstName, p.otherName, p.lastName].filter(Boolean);
      const fullName = parts.join(" ");
      return {
        id: p.id,
        full_name: fullName,
        email: p.email,
        phone_number: p.phoneNumber || "",
        created_at: p.createdAt,
        is_leader: p.leaderId !== null,
        is_member: true,
        is_visitor: false,
      };
    });

    const uf = new UnionFind();
    const byEmail = new Map<string, string>();
    const byPhoneName = new Map<string, string>();

    for (const p of people) {
      const email = normEmail(p.email);
      if (email) {
        const seen = byEmail.get(email);
        if (seen) uf.union(seen, p.id);
        else byEmail.set(email, p.id);
      }
      const phone = normPhone(p.phone_number);
      const name = normName(p.full_name);
      if (phone && name) {
        const key = `${phone}|${name}`;
        const seen = byPhoneName.get(key);
        if (seen) uf.union(seen, p.id);
        else byPhoneName.set(key, p.id);
      }
    }

    const groups = new Map<string, Person[]>();
    for (const p of people) {
      const root = uf.find(p.id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(p);
    }

    const dupGroups = [...groups.values()]
      .filter((g) => g.length > 1)
      .map((g) => {
        const canon = pickCanonical(g);
        return {
          canonicalId: canon.id,
          people: g.map((p) => ({
            id: p.id,
            fullName: p.full_name,
            email: p.email,
            phone: p.phone_number,
            isLeader: p.is_leader,
            isMember: p.is_member,
            isVisitor: p.is_visitor,
            createdAt: p.created_at,
          })),
        };
      });

    return dupGroups;
  } catch (err: any) {
    console.error("findDuplicatesAction error:", err);
    throw err;
  }
}

export async function mergeDuplicatesAction(canonicalId: string, duplicateIds: string[]) {
  const leader = await requireLeader();
  if (leader.role !== "chief_admin") {
    throw new Error("Only chief admins can merge duplicates.");
  }

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const dbConn = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

  try {
    await dbConn.begin(async (txDb) => {
      const tx = txDb as any;

      // Discover FK columns pointing at qcc_members(id)
      const memberRefs = await tx`
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
        JOIN information_schema.constraint_column_usage ccu USING (constraint_name, table_schema)
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'qcc_members' AND ccu.column_name = 'id'
          AND tc.table_schema = 'public'`;

      // Re-point all FKs to canonical
      for (const ref of memberRefs) {
        const table = tx(ref.table_name);
        const column = tx(ref.column_name);
        try {
          await tx`UPDATE ${table} SET ${column} = ${canonicalId} WHERE ${column} = ANY(${duplicateIds})`;
        } catch (err: any) {
          if (err?.code === "23505") {
            // Unique constraint violation: delete the duplicate child
            const rows = await tx<{ ctid: string }[]>`SELECT ctid FROM ${table} WHERE ${column} = ANY(${duplicateIds})`;
            for (const row of rows) {
              try {
                await tx`UPDATE ${table} SET ${column} = ${canonicalId} WHERE ctid = ${row.ctid}::tid`;
              } catch (err2: any) {
                if (err2?.code === "23505") {
                  await tx`DELETE FROM ${table} WHERE ctid = ${row.ctid}::tid`;
                }
              }
            }
          } else {
            throw err;
          }
        }
      }

      // Delete duplicates from qcc_members
      await tx`DELETE FROM qcc_members WHERE id = ANY(${duplicateIds})`;
    });

    return { success: true, mergedCount: duplicateIds.length };
  } finally {
    await dbConn.end();
  }
}

function pickCanonical(group: Person[]): Person {
  return [...group].sort((a, b) => {
    const rank = (p: Person) => (p.is_leader ? 3 : p.is_member ? 2 : p.is_visitor ? 1 : 0);
    const aRank = rank(a);
    const bRank = rank(b);
    if (aRank !== bRank) return bRank - aRank;
    const aComplete = [a.full_name, a.email].filter((x) => x).length;
    const bComplete = [b.full_name, b.email].filter((x) => x).length;
    if (aComplete !== bComplete) return bComplete - aComplete;
    return a.created_at.getTime() - b.created_at.getTime();
  })[0];
}
