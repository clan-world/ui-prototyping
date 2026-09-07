import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const playerSaves = pgTable("player_saves", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerName: text("player_name").notNull(),
  revision: integer("revision").notNull().default(1),
  state: jsonb("state").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
