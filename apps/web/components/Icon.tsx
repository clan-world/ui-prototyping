import type { CSSProperties } from "react";

export type IconName =
  | "wood"
  | "stone"
  | "essence"
  | "cards"
  | "pack"
  | "map"
  | "home"
  | "sword"
  | "crown"
  | "sound"
  | "mute"
  | "help"
  | "close"
  | "arrow"
  | "check"
  | "fullscreen"
  | "pause"
  | "play"
  | "flag"
  | "spark"
  | "settings"
  | "shield"
  | "bolt";
const paths: Record<IconName, string> = {
  wood: "M5 16 16 5l4 4L9 20H5v-4Zm3 1 9-9M6 7l3-3 3 3-3 3-3-3Z",
  stone: "m3 15 4-9 8-3 6 9-5 8H7l-4-5Zm4-9 6 7 8-1M3 15l10-2 3 7",
  essence: "m12 2 7 10-7 10-7-10 7-10Zm0 0v20M5 12h14",
  cards: "M7 3h13v17H7V3ZM3 6v16h13M11 7h5M11 11h5M11 15h3",
  pack: "M5 3h14v18H5V3ZM5 6h14M5 18h14m-7-9 3 3-3 3-3-3 3-3Z",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
  home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8",
  sword: "m5 19 12-12M5 14l5 5M4 20l2-2M10 9l8-6 3 1-1 3-6 8",
  crown: "m3 6 5 5 4-7 4 7 5-5-3 13H6L3 6Zm3 10h12",
  sound: "M4 9h4l5-4v14l-5-4H4V9Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  mute: "M4 9h4l5-4v14l-5-4H4V9Zm12 0 5 6m0-6-5 6",
  help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3v1M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  fullscreen: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  pause: "M8 5v14M16 5v14",
  play: "m7 4 14 8-14 8V4Z",
  flag: "M5 22V3h14l-3 5 3 5H5",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  shield: "m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Z",
  bolt: "m14 2-9 12h6l-1 8 9-13h-6l1-7Z",
};
export function Icon({
  name,
  size = 20,
  style,
  className = "",
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
