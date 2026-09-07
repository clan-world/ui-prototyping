import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clan World",
    short_name: "Clan World",
    description:
      "Elders’ Reach: command your clan, gather supplies, and build a village.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#30291f",
    theme_color: "#30291f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
