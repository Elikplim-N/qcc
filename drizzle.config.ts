import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  // Only manage qcc_* tables — this database is shared with other apps.
  tablesFilter: ["qcc_*"],
});
