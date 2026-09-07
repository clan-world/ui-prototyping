import { Context, Effect, Layer } from "effect";

export class Health extends Context.Tag("ClanWorld/Health")<Health, {
  readonly status: Effect.Effect<{ readonly status: "ok"; readonly game: "Clan World"; readonly version: string }>;
}>() {}

export const HealthLive = Layer.succeed(Health, {
  status: Effect.succeed({ status: "ok", game: "Clan World", version: "0.1.0" } as const),
});
