import { expect, it } from "@effect/vitest";
import { HttpApiBuilder } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { ApiLive } from "../api/live.js";

it.effect("serves a schema-encoded health response through the HTTP API", () =>
  Effect.acquireUseRelease(
    Effect.sync(() => HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiLive, NodeHttpServer.layerContext))),
    ({ handler }) => Effect.gen(function* () {
      const response = yield* Effect.promise(() => handler(new Request("http://localhost/health")));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = yield* Effect.promise(() => response.json());
      expect(body).toEqual({ status: "ok", game: "Clan World", version: "0.1.0" });
      const missing = yield* Effect.promise(() => handler(new Request("http://localhost/missing")));
      expect(missing.status).toBe(404);
    }),
    ({ dispose }) => Effect.promise(dispose),
  ),
);
