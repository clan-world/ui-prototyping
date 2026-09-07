import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export class ClanWorldApi extends HttpApi.make("ClanWorldApi").add(
  HttpApiGroup.make("system").add(
    HttpApiEndpoint.get("health", "/health").addSuccess(
      Schema.Struct({ status: Schema.Literal("ok"), game: Schema.Literal("Clan World"), version: Schema.String }),
    ),
  ),
) {}
