import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type DbConnection = ReturnType<typeof postgres>;
const globalForDb = globalThis as unknown as {
  conn?: DbConnection;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

const postgresConfig: postgres.Options<{}> = {
  // Supabase Supavisor session-mode pooler: keep serverless pools tiny.
  max: 1,
  idle_timeout: 10,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  prepare: false,
  onnotice: () => {},
  transform: { undefined: null },
};

function getDb() {
  if (globalForDb.db) return globalForDb.db;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const conn =
    globalForDb.conn ?? postgres(process.env.DATABASE_URL, postgresConfig);
  globalForDb.conn = conn;
  const instance = drizzle(conn, { schema });
  globalForDb.db = instance;
  return instance;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return (getDb() as never as Record<string | symbol, unknown>)[prop];
  },
});

export * from "./schema";
export { schema };
