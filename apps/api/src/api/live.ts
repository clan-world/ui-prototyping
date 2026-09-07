import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer } from "effect";
import { ClanWorldApi } from "./definition.js";
import { Health, HealthLive } from "../services/health.js";

const SystemLive = HttpApiBuilder.group(ClanWorldApi, "system", (handlers) =>
  handlers.handle("health", () => Effect.flatMap(Health, (health) => health.status)),
).pipe(Layer.provide(HealthLive));

export const ApiLive = HttpApiBuilder.api(ClanWorldApi).pipe(Layer.provide(SystemLive));
