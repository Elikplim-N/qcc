import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../packages/db/src/schema";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("Error: DATABASE_URL environment variable is not set.");
    console.error("Please run the command as:");
    console.error("  DATABASE_URL=\"your_database_url\" npx tsx scripts/list-leaders.ts");
    process.exit(1);
  }

  console.log("Connecting to the database...");
  const conn = postgres(dbUrl, { max: 1, prepare: false });
  const db = drizzle(conn, { schema });

  try {
    const allLeaders = await db.select({
      id: schema.leaders.id,
      username: schema.leaders.username,
      role: schema.leaders.role,
      isActive: schema.leaders.isActive,
      createdAt: schema.leaders.createdAt,
    }).from(schema.leaders);

    if (allLeaders.length === 0) {
      console.log("\n❌ No leaders found in the database. The database has not been seeded yet!");
      console.log("To seed the initial admin, please run:");
      console.log("  DATABASE_URL=\"your_database_url\" SEED_ADMIN_USERNAME=\"your_username\" SEED_ADMIN_PASSWORD=\"your_password\" npm run db:seed");
    } else {
      console.log(`\nFound ${allLeaders.length} leader(s) in the database:`);
      console.table(allLeaders);
    }
  } catch (error) {
    console.error("Error querying database:", error);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
