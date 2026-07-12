import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";

import * as schema from "../packages/db/src/schema";
import { verifyPassword } from "../packages/core/src/password";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not set. Run as:");
    console.error('  DATABASE_URL="your_url" npx tsx scripts/test-login.ts');
    process.exit(1);
  }

  const username = (process.env.TEST_USERNAME ?? "chiefadmin").toLowerCase().trim();
  const password = process.env.TEST_PASSWORD ?? "change-me-now";

  console.log(`\n🔍 Testing login for username: "${username}"`);
  console.log(`   Password: "${password}"\n`);

  const conn = postgres(dbUrl, { max: 1, prepare: false });
  const db = drizzle(conn, { schema });

  // Step 1: Check if leader exists
  const leader = await db.query.leaders.findFirst({
    where: eq(schema.leaders.username, username),
  });

  if (!leader) {
    console.log("❌ FAIL: No leader found with that username.");
    console.log("\n📋 All leaders in the database:");
    const all = await db.select({
      username: schema.leaders.username,
      role: schema.leaders.role,
      isActive: schema.leaders.isActive,
    }).from(schema.leaders);
    if (all.length === 0) {
      console.log("   (none — the database has not been seeded)");
    } else {
      console.table(all);
    }
    await conn.end();
    return;
  }

  console.log("✅ Leader found:");
  console.log(`   ID:       ${leader.id}`);
  console.log(`   Username: ${leader.username}`);
  console.log(`   Role:     ${leader.role}`);
  console.log(`   Active:   ${leader.isActive}`);
  console.log(`   Hash:     ${leader.passwordHash.substring(0, 40)}...`);

  // Step 2: Check isActive
  if (!leader.isActive) {
    console.log("\n❌ FAIL: Leader exists but isActive = false. Login will be rejected.");
    console.log("   Fix: UPDATE qcc_leaders SET is_active = true WHERE username = '" + username + "';");
    await conn.end();
    return;
  }

  // Step 3: Verify password
  const hashParts = leader.passwordHash.split(":");
  console.log(`\n🔐 Hash format check:`);
  console.log(`   Contains ':' separator: ${hashParts.length === 2 ? "✅ Yes" : "❌ No (BAD — not a valid scrypt hash)"}`);
  if (hashParts.length === 2) {
    console.log(`   Salt (hex, 32 chars): ${hashParts[0]} (${hashParts[0].length} chars)`);
    console.log(`   Hash (hex, 128 chars): ${hashParts[1].substring(0, 40)}... (${hashParts[1].length} chars)`);
  } else {
    console.log(`   Raw value: "${leader.passwordHash}"`);
    console.log("   ⚠️  This is NOT a valid scrypt hash. It must be in the format 'salt:hash'.");
    console.log("   The password was probably stored as plain text.");
    await conn.end();
    return;
  }

  const match = verifyPassword(password, leader.passwordHash);
  if (match) {
    console.log(`\n✅ SUCCESS: Password "${password}" matches the stored hash!`);
    console.log("   The login should work. If it still fails on Vercel, check:");
    console.log("   1. DATABASE_URL env var on Vercel points to THIS database");
    console.log("   2. Redeploy after setting the env var");
  } else {
    console.log(`\n❌ FAIL: Password "${password}" does NOT match the stored hash.`);
    console.log("   The hash in the database does not correspond to this password.");
    console.log("   To fix, run this to generate a new correct hash:");
    console.log(`   npx tsx -e 'import{hashPassword}from"./packages/core/src/password";console.log(hashPassword("${password}"))'`);
  }

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
