/**
 * Prefix a root-absolute public URL with the GitHub Pages project path.
 * Local `next dev` leaves NEXT_PUBLIC_BASE_PATH unset so paths stay "/…".
 */
export function assetPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
    return normalized;
  }
  return `${prefix}${normalized}`;
}

/** CSS `url(...)` value, optionally with a cursor hotspot and fallback. */
export function cssAssetUrl(
  path: string,
  hotspotAndFallback?: string,
): string {
  const quoted = `url('${assetPath(path)}')`;
  return hotspotAndFallback ? `${quoted} ${hotspotAndFallback}` : quoted;
}

/**
 * Font-face and HUD/cursor URLs that CSS cannot prefix from `basePath`.
 * Injected once from the root layout at build time.
 */
export function publicAssetCss(): string {
  return `
@font-face {
  font-family: "Fragment Mono";
  src: url("${assetPath("/fonts/fragment-mono.woff2")}") format("woff2");
  font-display: swap;
}
@font-face {
  font-family: "Uncial Antiqua";
  src: url("${assetPath("/fonts/uncial-antiqua.ttf")}") format("truetype");
  font-display: swap;
}
@font-face {
  font-family: "Cinzel";
  src: url("${assetPath("/fonts/cinzel.woff2")}") format("woff2");
  font-weight: 400 900;
  font-display: swap;
}
:root {
  --game-arrow: ${cssAssetUrl("/medieval/cursors/arrow.svg", "4 3, default")};
  --game-pointer: ${cssAssetUrl("/medieval/cursors/pointer.svg", "6 3, pointer")};
  --game-grab: ${cssAssetUrl("/medieval/cursors/grab.svg", "19 20, grab")};
  --game-grabbing: ${cssAssetUrl("/medieval/cursors/grabbing.svg", "19 20, grabbing")};
  --game-blocked: ${cssAssetUrl("/medieval/cursors/blocked.svg", "20 20, not-allowed")};
  --realm-stone: ${cssAssetUrl("/medieval/hud/stone-frame.png")};
  --realm-paper: ${cssAssetUrl("/medieval/hud/parchment.png")};
  --realm-wordmark: ${cssAssetUrl("/medieval/hud/wordmark.png")};
  --realm-button: ${cssAssetUrl("/medieval/hud/button.png")};
}
`.trim();
}
