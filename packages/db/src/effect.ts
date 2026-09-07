import * as PgDrizzle from "@effect/sql-drizzle/Pg";
import * as PgClient from "@effect/sql-pg/PgClient";
import { Config, Layer } from "effect";

export const DbLive = PgDrizzle.layer.pipe(
  Layer.provide(PgClient.layerConfig({ url: Config.redacted("DATABASE_URL") })),
);

export { PgDrizzle };
