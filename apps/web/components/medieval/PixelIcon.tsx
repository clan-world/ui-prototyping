import type { CSSProperties } from "react";

export type PixelIconName =
  | "axe"
  | "pick"
  | "hammer"
  | "move"
  | "flag"
  | "shield"
  | "stop"
  | "people"
  | "wood"
  | "stone"
  | "food"
  | "iron"
  | "gold"
  | "return"
  | "crown"
  | "book"
  | "pause"
  | "play"
  | "follow"
  | "eye";
const paths: Record<PixelIconName, string> = {
  axe: "        aa    |       aaaa   |     aaaaaaa  |     aaaaaaa  |    b aaaaa   |   bbb aa     |  bbb        | bbb         |bbb          ",
  pick: "   aaaaaaa    | aaaaaaaaaa  |aaa  bb  aaa |a   bbb    a |   bbb       |  bbb        | bbb         |bbb          ",
  hammer:
    "     aaaaaa   |    aaaaaaaa |     aaaaaa  |     bbb     |    bbb      |   bbb       |  bbb        | bbb         ",
  move: "        aaa   |       aaaa  |      aaaaa  |     aa aaa  |    aa  aaa  |   aa        |  aa         | aa          ",
  flag: "   bbaaaaaaa  |   bbaaaaaa  |   bbaaaaa   |   bbaaaaaa  |   bb        |   bb        |   bb        |   bb        ",
  shield:
    "   aaaaaaa    | aaaaaaaaaaa | aaabbbbbaaa | aaabbbbbaaa |  aabbbbbaa  |   aabbbaa   |    aabaa    |     aaa     ",
  stop: "  aaaaaaa     | aaaaaaaaa   |aaaaaaaaaaa  |aaaaaaaaaaa  |aaaaaaaaaaa  |aaaaaaaaaaa  | aaaaaaaaa   |  aaaaaaa    ",
  people:
    "  aaa   aaa   | aaaaa aaaaa |  aaa   aaa  |             | aaaaa aaaaa |aaaaaa aaaaaa|aaaaaa aaaaaa| aa aa aa aa ",
  wood: "      aaaaa   |    aaaaabb  |  aaaaaabbb  |aaaaaabbbbaa |aaabbbbbaaaa |abbbbbaaaa   |bbbbaaaa     | aaaaa       ",
  stone:
    "     aaaa     |   aaaaaaa   | aaaaaabbaa  |aaaaaabbbbaa |aaaaabbbbaaa | aaabbbbaaa  |  aaaaaaaa   |    aaaaa    ",
  food: "   a   a      |  aaa aaa    |   aaaaa     | aaa aaa aaa |  aaaaaaa    |    aaa      |    aaa      |    aaa      ",
  iron: "    aaaaa     |   aabbaaa   |  aabbbbaaa  | aabbbbaaaa  |aabbbbaaaa   | abbbbaaa    |  aaaaaa     ",
  gold: "   aaaaa      | aabbbbbaa   |aabbabbbaa   |aabaaaabba   |aabbabbbaa   |aabaaaabba   | aabbbbbaa   |   aaaaa     ",
  return:
    "   aa         |  aa         | aaaaaaaaa   |aaaaaaaaaaa  | aaaaa   aaa |  aa     aaa |   aa   aaa  |      aaaa   ",
  crown:
    " a    a    a  | aa  aaa  aa | aaa aaa aaa | aaaaaaaaaaa |  aaaaaaaaa  |  aaaaaaaaa  |  bbbbbbbbb  ",
  book: " aaaaa aaaaa  |aabbbaaabbbaa|aabbbaaabbbaa|aabbbaaabbbaa|aabbbaaabbbaa|aabbbaaabbbaa|aaaaaa aaaaaa| aaaaa aaaaa ",
  pause:
    "  aaa   aaa   |  aaa   aaa  |  aaa   aaa  |  aaa   aaa  |  aaa   aaa  |  aaa   aaa  |  aaa   aaa  ",
  play: "   aa         |   aaaa      |   aaaaaa    |   aaaaaaaa  |   aaaaaa    |   aaaa      |   aa        ",
  follow:
    "  aa      a   |  aaa    aaa |   aa   aaaaa|  aaaa   aaa | aaaaaa   a  | aa  aa      | aa  aa      ",
  eye: "    aaaaa     |  aaa   aaa  | aa  aaa  aa |aa  aaaaa  aa| aa  aaa  aa |  aaa   aaa  |    aaaaa    ",
};
export function PixelIcon({
  name,
  size = 22,
  style,
}: {
  name: PixelIconName;
  size?: number;
  style?: CSSProperties;
}) {
  const rows = paths[name].split("|");
  return (
    <svg
      className={`pixel-icon pixel-${name}`}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={style}
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === " " ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y + 2}
              width="1"
              height="1"
              fill={ch === "a" ? "currentColor" : "var(--pixel-shade, #79684a)"}
            />
          ),
        ),
      )}
    </svg>
  );
}
