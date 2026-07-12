import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import { generateMemberCode } from "../src/lib/member-code";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const conn = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const db = drizzle(conn, { schema });

  const username = (process.env.SEED_ADMIN_USERNAME ?? "chiefadmin").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";

  const existing = await db.query.leaders.findFirst({
    where: eq(schema.leaders.username, username),
  });
  if (existing) {
    console.log(`Chief admin '${username}' already exists — nothing to do.`);
    await conn.end();
    return;
  }

  const [member] = await db
    .insert(schema.members)
    .values({
      memberCode: generateMemberCode("Chief", "Admin", "0000000000"),
      firstName: "Chief",
      lastName: "Admin",
      phoneNumber: "0000000000",
      location: "QCC",
    })
    .returning({ id: schema.members.id });

  await db.insert(schema.leaders).values({
    memberId: member.id,
    role: "chief_admin",
    username,
    passwordHash: hashPassword(password),
  });

  await db
    .insert(schema.settings)
    .values({ key: "code_of_the_day", value: "WELCOME" })
    .onConflictDoNothing();

  console.log(`Seeded chief admin. Username: ${username}  Password: ${password}`);
  console.log("Change this password after first login (re-promote via Leaders page).");
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
