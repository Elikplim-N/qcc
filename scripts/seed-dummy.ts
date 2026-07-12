import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { inArray, or, like } from "drizzle-orm";

import * as schema from "../packages/db/src/schema";
import { hashPassword } from "../packages/core/src/password";
import { generateMemberCode } from "../packages/core/src/member-code";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const conn = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const db = drizzle(conn, { schema });

  console.log("Cleaning up old dummy data...");

  // 1. Delete old dummy leaders
  await db
    .delete(schema.leaders)
    .where(
      or(
        like(schema.leaders.username, "leader.%"),
        like(schema.leaders.username, "governor.%"),
        like(schema.leaders.username, "council.%"),
        like(schema.leaders.username, "arrivals.%")
      )
    );

  // 2. Delete old dummy councils (will cascade to governorships, bacentas, and members)
  await db
    .delete(schema.councils)
    .where(
      inArray(schema.councils.name, ["Accra North Council", "Accra South Council"])
    );

  console.log("Seeding dummy data...");

  // 1. Create Councils
  const [c1] = await db
    .insert(schema.councils)
    .values({ name: "Accra North Council" })
    .returning();
  const [c2] = await db
    .insert(schema.councils)
    .values({ name: "Accra South Council" })
    .returning();
  console.log("Created 2 Councils.");

  // 2. Create Governorships
  const [g1] = await db
    .insert(schema.governorships)
    .values({ name: "Alpha Governorship (Area 1)", councilId: c1.id, area: "area1" })
    .returning();
  const [g2] = await db
    .insert(schema.governorships)
    .values({ name: "Beta Governorship (Area 2)", councilId: c1.id, area: "area2" })
    .returning();
  const [g3] = await db
    .insert(schema.governorships)
    .values({ name: "Gamma Governorship (Area 2)", councilId: c2.id, area: "area2" })
    .returning();
  console.log("Created 3 Governorships.");

  // 3. Create Bacentas
  const [b1] = await db
    .insert(schema.bacentas)
    .values({ name: "Grace Bacenta", governorshipId: g1.id, area: "area1" })
    .returning();
  const [b2] = await db
    .insert(schema.bacentas)
    .values({ name: "Hope Bacenta", governorshipId: g1.id, area: "area1" })
    .returning();
  const [b3] = await db
    .insert(schema.bacentas)
    .values({ name: "Victory Bacenta", governorshipId: g2.id, area: "area2", momoNumber: "0244111222", momoName: "Victory momo", mobileNetwork: "MTN" })
    .returning();
  const [b4] = await db
    .insert(schema.bacentas)
    .values({ name: "Joy Bacenta", governorshipId: g2.id, area: "area2", momoNumber: "0505111222", momoName: "Joy momo", mobileNetwork: "Vodafone" })
    .returning();
  const [b5] = await db
    .insert(schema.bacentas)
    .values({ name: "Peace Bacenta", governorshipId: g3.id, area: "area2" })
    .returning();
  console.log("Created 5 Bacentas.");

  // 4. Create Members
  const memberData = [
    // Grace Bacenta (Area 1)
    { first: "John", last: "Doe", phone: "0240000001", bacentaId: b1.id, school: "Legon", isWorking: false },
    { first: "Jane", last: "Smith", phone: "0240000002", bacentaId: b1.id, school: null, isWorking: true },
    { first: "Robert", last: "Johnson", phone: "0240000003", bacentaId: b1.id, school: "UPSA", isWorking: false },
    { first: "Mary", last: "Williams", phone: "0240000004", bacentaId: b1.id, school: null, isWorking: true },
    { first: "Grace", last: "Leader", phone: "0240000005", bacentaId: b1.id, school: null, isWorking: true },

    // Hope Bacenta (Area 1)
    { first: "Michael", last: "Brown", phone: "0240000006", bacentaId: b2.id, school: "Legon", isWorking: false },
    { first: "David", last: "Miller", phone: "0240000007", bacentaId: b2.id, school: null, isWorking: true },
    { first: "James", last: "Wilson", phone: "0240000008", bacentaId: b2.id, school: "Legon", isWorking: false },
    { first: "Patricia", last: "Hope", phone: "0240000009", bacentaId: b2.id, school: null, isWorking: true },

    // Victory Bacenta (Area 2)
    { first: "Daniel", last: "Davis", phone: "0240000010", bacentaId: b3.id, school: "Kness", isWorking: false },
    { first: "Sarah", last: "Garcia", phone: "0240000011", bacentaId: b3.id, school: null, isWorking: true },
    { first: "Kevin", last: "Martinez", phone: "0240000012", bacentaId: b3.id, school: "ATU", isWorking: false },
    { first: "Elizabeth", last: "Rodriguez", phone: "0240000013", bacentaId: b3.id, school: null, isWorking: true },
    { first: "Victor", last: "Leader", phone: "0240000014", bacentaId: b3.id, school: null, isWorking: true },

    // Joy Bacenta (Area 2)
    { first: "Matthew", last: "Hernandez", phone: "0240000015", bacentaId: b4.id, school: "Legon", isWorking: false },
    { first: "Lisa", last: "Lopez", phone: "0240000016", bacentaId: b4.id, school: null, isWorking: true },
    { first: "Mark", last: "Gonzalez", phone: "0240000017", bacentaId: b4.id, school: "Legon", isWorking: false },
    { first: "Joy", last: "Leader", phone: "0240000018", bacentaId: b4.id, school: null, isWorking: true },

    // Peace Bacenta (Area 2)
    { first: "Paul", last: "Anderson", phone: "0240000019", bacentaId: b5.id, school: null, isWorking: true },
    { first: "Sandra", last: "Thomas", phone: "0240000020", bacentaId: b5.id, school: "Legon", isWorking: false },
    { first: "Peace", last: "Leader", phone: "0240000021", bacentaId: b5.id, school: null, isWorking: true },

    // General Leaders / Admins (unassigned members)
    { first: "Council", last: "LeaderOne", phone: "0240000022", bacentaId: null, school: null, isWorking: true },
    { first: "Governor", last: "AlphaLeader", phone: "0240000023", bacentaId: null, school: null, isWorking: true },
    { first: "Governor", last: "BetaLeader", phone: "0240000024", bacentaId: null, school: null, isWorking: true },
    { first: "Arrivals", last: "AdminUser", phone: "0240000025", bacentaId: null, school: null, isWorking: true },
    { first: "Arrivals", last: "CounterUser", phone: "0240000026", bacentaId: null, school: null, isWorking: true },
  ];

  const dbMembers = [];
  for (const m of memberData) {
    const [row] = await db
      .insert(schema.members)
      .values({
        memberCode: generateMemberCode(m.first, m.last, m.phone),
        firstName: m.first,
        lastName: m.last,
        phoneNumber: m.phone,
        bacentaId: m.bacentaId,
        school: m.school,
        isWorking: m.isWorking,
        location: "Accra",
      })
      .returning();
    dbMembers.push(row);
  }
  console.log(`Created ${dbMembers.length} Members.`);

  // Find members designated as leaders
  const graceLeaderMem = dbMembers.find((m) => m.phoneNumber === "0240000005")!;
  const hopeLeaderMem = dbMembers.find((m) => m.phoneNumber === "0240000009")!;
  const victoryLeaderMem = dbMembers.find((m) => m.phoneNumber === "0240000014")!;
  const joyLeaderMem = dbMembers.find((m) => m.phoneNumber === "0240000018")!;
  const peaceLeaderMem = dbMembers.find((m) => m.phoneNumber === "0240000021")!;

  const councilLeaderMem = dbMembers.find((m) => m.phoneNumber === "0240000022")!;
  const govAlphaMem = dbMembers.find((m) => m.phoneNumber === "0240000023")!;
  const govBetaMem = dbMembers.find((m) => m.phoneNumber === "0240000024")!;
  const arrAdminMem = dbMembers.find((m) => m.phoneNumber === "0240000025")!;
  const arrCounterMem = dbMembers.find((m) => m.phoneNumber === "0240000026")!;

  const pHash = hashPassword("change-me-now");

  const leaderValues = [
    // Bacenta Leaders
    { memberId: graceLeaderMem.id, role: "bacenta_leader" as const, bacentaId: b1.id, username: "leader.grace" },
    { memberId: hopeLeaderMem.id, role: "bacenta_leader" as const, bacentaId: b2.id, username: "leader.hope" },
    { memberId: victoryLeaderMem.id, role: "bacenta_leader" as const, bacentaId: b3.id, username: "leader.victory" },
    { memberId: joyLeaderMem.id, role: "bacenta_leader" as const, bacentaId: b4.id, username: "leader.joy" },
    { memberId: peaceLeaderMem.id, role: "bacenta_leader" as const, bacentaId: b5.id, username: "leader.peace" },

    // Governors
    { memberId: govAlphaMem.id, role: "governor" as const, governorshipId: g1.id, username: "governor.alpha" },
    { memberId: govBetaMem.id, role: "governor" as const, governorshipId: g2.id, username: "governor.beta" },

    // Council Leader
    { memberId: councilLeaderMem.id, role: "council_leader" as const, councilId: c1.id, username: "council.leader" },

    // Arrivals roles
    { memberId: arrAdminMem.id, role: "arrivals_admin" as const, username: "arrivals.admin" },
    { memberId: arrCounterMem.id, role: "arrivals_counter" as const, username: "arrivals.counter" },
  ];

  for (const l of leaderValues) {
    await db.insert(schema.leaders).values({
      ...l,
      passwordHash: pHash,
    });
  }

  console.log("Created 10 Leaders across all roles with default password 'change-me-now'.");
  console.log("Roles and Usernames seeded:");
  console.log(" - Council Leader:   council.leader");
  console.log(" - Governor (A1):    governor.alpha");
  console.log(" - Governor (A2):    governor.beta");
  console.log(" - Bacenta Grace:    leader.grace");
  console.log(" - Bacenta Victory:  leader.victory");
  console.log(" - Arrivals Admin:   arrivals.admin");
  console.log(" - Arrivals Counter: arrivals.counter");

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
