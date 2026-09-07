import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clan World",
    short_name: "Clan World",
    description: "The Wildwood chronicles: gather, collect, and conquer.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b1c15",
    theme_color: "#0b1c15",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
