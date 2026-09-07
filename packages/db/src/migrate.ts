import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createMigrationClient } from "./client.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required for migrations.");
  process.exitCode = 1;
} else {
  const client = createMigrationClient(url);
  try {
    await migrate(client.db, { migrationsFolder: "./migrations" });
  } finally {
    await client.close();
  }
}
