import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@clan-world/shared"],
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  agentRules: false,
};

export default config;
