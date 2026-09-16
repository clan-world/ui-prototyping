import type { NextConfig } from "next";

/**
 * GitHub Pages project site lives at /ui-prototyping.
 * CI sets NEXT_PUBLIC_BASE_PATH; local `next dev` stays at domain root.
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@clan-world/shared"],
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  agentRules: false,
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default config;
