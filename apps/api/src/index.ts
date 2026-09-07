import { createServer } from "node:http";
import { HttpApiBuilder, HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";
import { ApiLive } from "./api/live.js";

HttpApiBuilder.serve().pipe(
  Layer.provide(ApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: Number(process.env.API_PORT ?? 3011), host: "127.0.0.1" })),
  Layer.launch,
  NodeRuntime.runMain,
);
