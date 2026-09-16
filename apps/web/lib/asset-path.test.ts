import { afterEach, describe, expect, it, vi } from "vitest";
import { assetPath, cssAssetUrl, publicAssetCss } from "./asset-path";

describe("assetPath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("leaves root-absolute public paths unchanged without a base path", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    expect(assetPath("/medieval/units-atlas.json")).toBe(
      "/medieval/units-atlas.json",
    );
  });

  it("prefixes GitHub Pages project paths and ignores a trailing slash on the base", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/ui-prototyping/");
    expect(assetPath("/medieval/units-atlas.json")).toBe(
      "/ui-prototyping/medieval/units-atlas.json",
    );
    expect(assetPath("fonts/cinzel.woff2")).toBe(
      "/ui-prototyping/fonts/cinzel.woff2",
    );
    expect(assetPath("/ui-prototyping/icon.svg")).toBe(
      "/ui-prototyping/icon.svg",
    );
  });

  it("does not rewrite remote or data URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/ui-prototyping");
    expect(assetPath("https://example.test/sprite.png")).toBe(
      "https://example.test/sprite.png",
    );
    expect(assetPath("data:image/gif;base64,R0lGODlhAQABAAAAACw=")).toBe(
      "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    );
  });

  it("builds CSS url() values for cursors", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/ui-prototyping");
    expect(cssAssetUrl("/medieval/cursors/arrow.svg", "4 3, default")).toBe(
      "url('/ui-prototyping/medieval/cursors/arrow.svg') 4 3, default",
    );
  });
});

describe("publicAssetCss", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("emits prefixed font and HUD urls for the Pages path", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/ui-prototyping");
    const css = publicAssetCss();
    expect(css).toContain(
      'url("/ui-prototyping/fonts/fragment-mono.woff2")',
    );
    expect(css).toContain(
      "url('/ui-prototyping/medieval/hud/wordmark.png')",
    );
  });
});
