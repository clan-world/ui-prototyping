"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  BUILDING_SPECS,
  canPlaceBuilding,
  type BuildingKind,
  type ClanWorld,
  type Point,
} from "@clan-world/shared";
import {
  loadVillageArt,
  drawSprite,
  drawClansman,
  BUILDING_ART,
  OBJECT_ART,
  type VillageArt,
} from "../../lib/medieval/sprites";

export type MapTarget = {
  type: "unit" | "object" | "building" | "ground";
  id?: string;
  x: number;
  y: number;
};
export type MapHandle = {
  focus: (point: Point) => void;
  zoom: (change: number) => void;
  reset: () => void;
};
type Props = {
  world: ClanWorld;
  selected: string[];
  buildKind: BuildingKind | null;
  showOrders: boolean;
  showNames: boolean;
  paused: boolean;
  onSelect: (ids: string[], append: boolean) => void;
  onTarget: (target: MapTarget, secondary: boolean, append: boolean) => void;
  onReady: () => void;
};
const TW = 48,
  TH = 24;
export const iso = (x: number, y: number) => ({
  x: ((x - y) * TW) / 2,
  y: ((x + y) * TH) / 2,
});
const uniso = (x: number, y: number) => ({
  x: x / TW + y / TH,
  y: y / TH - x / TW,
});
function random(n: number) {
  const a = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return a - Math.floor(a);
}
function polygon(c: CanvasRenderingContext2D, p: Point[], color: string) {
  c.fillStyle = color;
  c.beginPath();
  p.forEach((v, i) => (i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)));
  c.closePath();
  c.fill();
}
function diamond(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  polygon(
    c,
    [
      { x, y },
      { x: x + w / 2, y: y + h / 2 },
      { x, y: y + h },
      { x: x - w / 2, y: y + h / 2 },
    ],
    color,
  );
}
function rectangle(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

function terrainCache(world: ClanWorld, art?: VillageArt) {
  const canvas = document.createElement("canvas");
  canvas.width = (world.width + world.height) * 24 + 160;
  canvas.height = (world.width + world.height) * 12 + 150;
  const c = canvas.getContext("2d")!;
  const origin = { x: world.height * 24 + 80, y: 48 };
  c.translate(origin.x, origin.y);
  c.imageSmoothingEnabled = false;
  const patterns: Record<string, CanvasPattern | null> = {};
  if (art)
    for (const [material, row, col] of [
      ["grass", 0, 1],
      ["dirt", 1, 1],
      ["sand", 2, 0],
      ["water", 3, 1],
      ["farm", 1, 3],
    ] as const) {
      const swatch = document.createElement("canvas");
      swatch.width = 96;
      swatch.height = 96;
      const sc = swatch.getContext("2d")!;
      sc.imageSmoothingEnabled = false;
      sc.drawImage(
        art.ground,
        col * 313.5 + 7,
        row * 313.5 + 7,
        300,
        300,
        0,
        0,
        96,
        96,
      );
      patterns[material] = c.createPattern(swatch, "repeat");
    }
  for (let depth = 0; depth < world.width + world.height; depth++)
    for (let y = 0; y < world.height; y++) {
      const x = depth - y;
      if (x < 0 || x >= world.width) continue;
      const tile = world.tiles[y]![x]!;
      const p = iso(x, y);
      const n = x * 719 + y * 197;
      const colors =
        tile.terrain === "grass"
          ? ["#607343", "#647646", "#637547", "#68794a"]
          : tile.terrain === "dirt"
            ? ["#998769", "#958265", "#9b896b", "#998568"]
            : tile.terrain === "sand"
              ? ["#a69e78", "#a39b75", "#a89f7b", "#a79d77"]
              : tile.terrain === "farm"
                ? ["#65513a", "#68543c", "#725b3e", "#6e583d"]
                : tile.terrain === "water"
                  ? ["#486c6b", "#456c6b", "#476b6a", "#4a706f"]
                  : ["#92734b", "#92724c", "#876b49", "#9c7d54"];
      diamond(c, p.x, p.y, 48, 24, colors[Math.floor(random(n) * 4)]!);
      const pattern = patterns[tile.terrain];
      if (pattern) {
        c.fillStyle = pattern;
        c.globalAlpha = 0.65;
        c.fill();
        c.globalAlpha = 1;
      }
      const count = art
        ? 0
        : tile.terrain === "water"
          ? 9
          : tile.terrain === "grass"
            ? 34
            : 27;
      for (let i = 0; i < count; i++) {
        const u = random(n + i * 97),
          v = random(n + i * 41 + 21),
          s = iso(x + u, y + v);
        const tint = random(n + i * 313);
        const col =
          tile.terrain === "grass"
            ? tint > 0.82
              ? "#85905a"
              : tint > 0.48
                ? "#70804d"
                : tint > 0.17
                  ? "#596f40"
                  : "#53673b"
            : tile.terrain === "dirt"
              ? tint > 0.5
                ? "#a18e6f"
                : "#86785d"
              : tile.terrain === "sand"
                ? "#bcb086"
                : tile.terrain === "water"
                  ? "#73948b"
                  : "#8b754c";
        rectangle(
          c,
          s.x,
          s.y,
          tile.terrain === "water" ? 4 : 2,
          tile.terrain === "water" ? 1 : 2,
          col,
        );
        if (tile.terrain === "grass" && tint > 0.98) {
          rectangle(c, s.x, s.y - 2, 1, 3, "#879763");
        }
      }
      if (tile.terrain === "bridge") {
        for (let i = 0; i < 5; i++) {
          const q = iso(x + i / 5, y);
          const r = iso(x + i / 5, y + 1);
          c.strokeStyle = i % 2 ? "#67533d" : "#c0a576";
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(q.x, q.y);
          c.lineTo(r.x, r.y);
          c.stroke();
        }
      }
      if (tile.terrain === "dirt") {
        for (let i = 0; i < 5; i++) {
          const s = iso(x + random(n + i * 31), y + random(n + i * 17));
          rectangle(c, s.x, s.y, 3, 1, "#c2b39166");
        }
      }
    }
  return { canvas, origin };
}

function footprint(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  stroke?: string,
) {
  const points = [iso(x, y), iso(x + w, y), iso(x + w, y + h), iso(x, y + h)];
  polygon(c, points, color);
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1;
    c.stroke();
  }
}
function flag(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  red = false,
) {
  rectangle(c, x, y - 32, 2, 31, "#544a35");
  polygon(
    c,
    [
      { x: x + 2, y: y - 32 },
      { x: x + 15, y: y - 31 + Math.sin(t * 3) * 1.5 },
      { x: x + 13, y: y - 23 },
      { x: x + 2, y: y - 24 },
    ],
    red ? "#794638" : "#707c9a",
  );
  rectangle(c, x + 5, y - 29, 2, 4, "#d9c891");
}

export const ClanMap = forwardRef<MapHandle, Props>(
  function ClanMap(props, ref) {
    const canvas = useRef<HTMLCanvasElement>(null),
      live = useRef(props),
      art = useRef<VillageArt | null>(null),
      camera = useRef({ x: 24, y: 22, zoom: 1.35 }),
      size = useRef({ w: 1200, h: 700 });
    const hover = useRef<{ x: number; y: number; target: MapTarget } | null>(
        null,
      ),
      selectionBox = useRef<{
        x: number;
        y: number;
        w: number;
        h: number;
      } | null>(null),
      pointer = useRef<{
        x: number;
        y: number;
        lastX: number;
        lastY: number;
        button: number;
        shift: boolean;
        pan: boolean;
        touch: boolean;
      } | null>(null),
      keys = useRef(new Set<string>()),
      positions = useRef(new Map<string, Point>()),
      hitBoxes = useRef<
        { target: MapTarget; x: number; y: number; w: number; h: number }[]
      >([]),
      pointers = useRef(new Map<number, Point>()),
      pinch = useRef<{ distance: number; zoom: number } | null>(null);
    const [loading, setLoading] = useState(true),
      [error, setError] = useState(false);
    live.current = props;
    useImperativeHandle(
      ref,
      () => ({
        focus(p) {
          camera.current.x = p.x;
          camera.current.y = p.y;
        },
        zoom(change) {
          camera.current.zoom = Math.max(
            0.65,
            Math.min(2.4, camera.current.zoom + change),
          );
        },
        reset() {
          camera.current = {
            x: 24,
            y: 22,
            zoom: window.innerWidth < 700 ? 1.2 : 1.35,
          };
        },
      }),
      [],
    );
    useEffect(() => {
      let disposed = false;
      loadVillageArt()
        .then((value) => {
          if (!disposed) {
            art.current = value;
            setLoading(false);
            live.current.onReady();
          }
        })
        .catch(() => {
          if (!disposed) setError(true);
        });
      return () => {
        disposed = true;
      };
    }, []);
    useEffect(() => {
      const el = canvas.current!;
      const c = el.getContext("2d")!;
      let ground = terrainCache(live.current.world),
        textured = false;
      let frame = 0,
        last = performance.now();
      camera.current.zoom = el.clientWidth < 700 ? 1.25 : 1.35;
      const keyDown = (e: KeyboardEvent) => {
        if (
          document.querySelector("[role=dialog]") ||
          (e.target as HTMLElement)?.matches("input,textarea") ||
          (e.key === " " && (e.target as HTMLElement)?.closest("button"))
        )
          return;
        if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "w",
            "a",
            "s",
            "d",
            " ",
          ].includes(e.key)
        ) {
          e.preventDefault();
          keys.current.add(e.key);
        }
      };
      const keyUp = (e: KeyboardEvent) => keys.current.delete(e.key),
        blur = () => keys.current.clear();
      window.addEventListener("keydown", keyDown);
      window.addEventListener("keyup", keyUp);
      window.addEventListener("blur", blur);
      const draw = (now: number) => {
        frame = requestAnimationFrame(draw);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const { world, selected, showOrders, showNames, buildKind, paused } =
          live.current;
        const a = art.current;
        if (a && !textured) {
          ground = terrainCache(world, a);
          textured = true;
        }
        const w = Math.round(el.clientWidth),
          h = Math.round(el.clientHeight);
        if (w < 1 || h < 1) return;
        if (el.width !== w || el.height !== h) {
          el.width = w;
          el.height = h;
        }
        size.current = { w, h };
        c.imageSmoothingEnabled = false;
        const panSpeed = (dt * 9) / camera.current.zoom;
        let sx = 0,
          sy = 0;
        if (keys.current.has("a") || keys.current.has("ArrowLeft")) sx--;
        if (keys.current.has("d") || keys.current.has("ArrowRight")) sx++;
        if (keys.current.has("w") || keys.current.has("ArrowUp")) sy--;
        if (keys.current.has("s") || keys.current.has("ArrowDown")) sy++;
        camera.current.x = Math.max(
          2,
          Math.min(world.width - 2, camera.current.x + (sx + sy) * panSpeed),
        );
        camera.current.y = Math.max(
          2,
          Math.min(world.height - 2, camera.current.y + (sy - sx) * panSpeed),
        );
        const cam = iso(camera.current.x, camera.current.y),
          z = camera.current.zoom;
        const ox = Math.round(w / 2 - cam.x * z),
          oy = Math.round(h / 2 - cam.y * z);
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = "#344735";
        c.fillRect(0, 0, w, h);
        c.translate(ox, oy);
        c.scale(z, z);
        c.drawImage(ground.canvas, -ground.origin.x, -ground.origin.y);
        const t = world.elapsed;
        if (!a) {
          c.setTransform(1, 0, 0, 1, 0, 0);
          return;
        }
        // Work paths are rendered on the ground before objects and people.
        if (showOrders)
          for (const u of world.units) {
            if (!selected.includes(u.id) || !u.path.length) continue;
            c.strokeStyle = "#e2d7a4a8";
            c.lineWidth = 1;
            c.setLineDash([3, 4]);
            c.beginPath();
            const p = iso(u.x, u.y);
            c.moveTo(p.x, p.y);
            for (const step of u.path) {
              const q = iso(step.x, step.y);
              c.lineTo(q.x, q.y);
            }
            c.stroke();
            c.setLineDash([]);
            const end = u.path.at(-1)!;
            const q = iso(end.x, end.y);
            c.strokeStyle = "#e2d49e";
            c.beginPath();
            c.ellipse(q.x, q.y, 8, 4, 0, 0, Math.PI * 2);
            c.stroke();
          }
        const elder = world.units.find((u) => u.role === "elder");
        if (elder && selected.includes(elder.id)) {
          const p = iso(elder.x, elder.y),
            radius = world.buildings.some(
              (b) => b.kind === "chapel" && b.progress >= 1,
            )
              ? 10
              : 6;
          c.strokeStyle = "#ddc88055";
          c.lineWidth = 1;
          c.setLineDash([2, 5]);
          c.beginPath();
          c.ellipse(p.x, p.y, radius * 24, radius * 12, 0, 0, Math.PI * 2);
          c.stroke();
          c.setLineDash([]);
        }
        const objects: { depth: number; draw: () => void }[] = [];
        hitBoxes.current = [];
        const obscuresSelected = (
          x: number,
          y: number,
          width: number,
          height: number,
          depth: number,
        ) =>
          world.units.some((u) => {
            if (!selected.includes(u.id) || u.x + u.y >= depth) return false;
            const p = iso(u.x, u.y);
            return (
              p.x > x - width / 2 &&
              p.x < x + width / 2 &&
              p.y - 12 > y - height &&
              p.y - 12 < y
            );
          });
        for (const b of world.buildings) {
          const p = iso(b.x + b.w / 2, b.y + b.h / 2);
          p.y += (b.w + b.h) * 6 - 3;
          const width =
            (b.w + b.h) *
            24 *
            (b.kind === "well" ? 1.4 : b.kind === "watchtower" ? 1.2 : 1.1);
          const f = a.buildings.frames[BUILDING_ART[b.kind]]!;
          const height = (f.sh / f.sw) * width;
          if (b.progress < 1)
            footprint(c, b.x, b.y, b.w, b.h, "#b8b59277", "#d9d4ab");
          objects.push({
            depth: b.x + b.y + b.w + b.h - 0.3,
            draw: () => {
              if (hover.current?.target.id === b.id)
                footprint(c, b.x, b.y, b.w, b.h, "#cfcc9c22", "#cec895");
              drawSprite(
                c,
                a.buildings,
                BUILDING_ART[b.kind],
                p.x,
                p.y,
                width,
                b.progress < 1
                  ? 0.2 + 0.5 * b.progress
                  : obscuresSelected(
                        p.x,
                        p.y,
                        width,
                        height,
                        b.x + b.y + b.w + b.h - 0.3,
                      )
                    ? 0.48
                    : 1,
              );
              if (b.progress < 1) {
                const corners = [
                  iso(b.x + 0.2, b.y + 0.2),
                  iso(b.x + b.w - 0.2, b.y + 0.2),
                  iso(b.x + b.w - 0.2, b.y + b.h - 0.2),
                  iso(b.x + 0.2, b.y + b.h - 0.2),
                ];
                for (const v of corners) {
                  rectangle(c, v.x, v.y - 36, 2, 38, "#5a4531");
                  rectangle(c, v.x - 1, v.y - 37, 4, 3, "#ad9362");
                }
                c.strokeStyle = "#a18a60";
                c.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                  const v = corners[i]!,
                    q = corners[(i + 1) % 4]!;
                  c.beginPath();
                  c.moveTo(v.x, v.y - 25);
                  c.lineTo(q.x, q.y - 25);
                  c.stroke();
                }
                rectangle(c, p.x - 22, p.y + 3, 44, 4, "#3a392c");
                rectangle(c, p.x - 21, p.y + 4, 42 * b.progress, 2, "#d5be73");
              }
              if (b.kind === "hall" || b.kind === "watchtower")
                flag(c, p.x + width * 0.22, p.y - height * 0.22, t);
              if (
                b.kind === "hall" ||
                b.kind === "forge" ||
                b.kind === "tavern"
              ) {
                for (let i = 0; i < 4; i++) {
                  const age = (t * 0.38 + i * 0.27) % 1;
                  c.globalAlpha = (1 - age) * 0.23;
                  rectangle(
                    c,
                    p.x + width * 0.18 + Math.sin(t + i) * 3,
                    p.y - height * 0.65 - age * 35,
                    5 + age * 6,
                    4 + age * 3,
                    "#d1d0b7",
                  );
                }
                c.globalAlpha = 1;
              }
              if (showNames || hover.current?.target.id === b.id) {
                c.font = "9px Georgia";
                c.textAlign = "center";
                c.fillStyle = "#26311fde";
                const title = BUILDING_SPECS[b.kind].name;
                const tw = c.measureText(title).width;
                c.fillRect(p.x - tw / 2 - 5, p.y + 6, tw + 10, 13);
                c.fillStyle = "#ece3b8";
                c.fillText(title, p.x, p.y + 16);
              }
              hitBoxes.current.push({
                target: {
                  type: "building",
                  id: b.id,
                  x: b.x + b.w / 2,
                  y: b.y + b.h / 2,
                },
                x: p.x - width / 2,
                y: p.y - height,
                w: width,
                h: height,
              });
            },
          });
        }
        for (const obj of world.objects) {
          const p = iso(obj.x, obj.y);
          const tree = ["tree", "oak", "pine"].includes(obj.kind);
          const width = tree
            ? (obj.kind === "pine" ? 63 : 78) + obj.variant * 5
            : obj.kind === "berry"
              ? 28
              : obj.kind === "stump"
                ? 19
                : obj.kind === "reeds"
                  ? 23
                  : 37;
          const f = a.props.frames[OBJECT_ART[obj.kind]]!;
          const height = (f.sh / f.sw) * width;
          objects.push({
            depth: obj.x + obj.y + 0.4,
            draw: () => {
              drawSprite(
                c,
                a.props,
                OBJECT_ART[obj.kind],
                p.x,
                p.y + 3,
                width,
                obscuresSelected(
                  p.x,
                  p.y + 3,
                  width,
                  height,
                  obj.x + obj.y + 0.4,
                )
                  ? 0.4
                  : 1,
              );
              if (hover.current?.target.id === obj.id) {
                c.strokeStyle = "#dacb8f";
                c.lineWidth = 1;
                c.beginPath();
                c.ellipse(p.x, p.y + 1, 13, 6, 0, 0, Math.PI * 2);
                c.stroke();
              }
              hitBoxes.current.push({
                target: { type: "object", id: obj.id, x: obj.x, y: obj.y },
                x: p.x - width * 0.36,
                y: p.y - Math.min(height, 60),
                w: width * 0.72,
                h: Math.min(height, 60) + 5,
              });
            },
          });
        }
        for (const u of world.units) {
          const old = positions.current.get(u.id) ?? { x: u.x, y: u.y };
          const position = {
            x: old.x + (u.x - old.x) * Math.min(1, dt * 18),
            y: old.y + (u.y - old.y) * Math.min(1, dt * 18),
          };
          positions.current.set(u.id, position);
          const p = iso(position.x, position.y);
          objects.push({
            depth: position.x + position.y + 0.05,
            draw: () => {
              if (selected.includes(u.id)) {
                c.strokeStyle = u.role === "elder" ? "#ebd493" : "#d1e49e";
                c.lineWidth = 1.5;
                c.beginPath();
                c.ellipse(p.x, p.y, 11, 5, 0, 0, Math.PI * 2);
                c.stroke();
              }
              drawClansman(
                c,
                a,
                u,
                p.x,
                p.y,
                paused ? t : t + (now % 100) / 1000,
              );
              if (u.role === "elder") {
                rectangle(c, p.x - 3, p.y - 32, 6, 3, "#cbb26d");
                rectangle(c, p.x - 3, p.y - 35, 1, 3, "#e4cb87");
                rectangle(c, p.x, p.y - 35, 1, 3, "#e4cb87");
                rectangle(c, p.x + 2, p.y - 35, 1, 3, "#e4cb87");
              }
              if (
                showNames ||
                selected.includes(u.id) ||
                hover.current?.target.id === u.id
              ) {
                c.font = "8px monospace";
                c.textAlign = "center";
                const title = u.name.replace("Elder ", "");
                const tw = c.measureText(title).width;
                rectangle(
                  c,
                  p.x - tw / 2 - 3,
                  p.y - 44,
                  tw + 6,
                  12,
                  "#263121cf",
                );
                c.fillStyle = u.role === "elder" ? "#ecce83" : "#e4e3b9";
                c.fillText(title, p.x, p.y - 35);
              }
              if (selected.includes(u.id)) {
                rectangle(c, p.x - 9, p.y + 6, 18, 2, "#394535");
                rectangle(
                  c,
                  p.x - 9,
                  p.y + 6,
                  (18 * u.energy) / 100,
                  2,
                  "#aac984",
                );
                if (u.carrying) {
                  rectangle(
                    c,
                    p.x + 7,
                    p.y - 20,
                    7,
                    5,
                    u.carrying.resource === "timber"
                      ? "#a4874d"
                      : u.carrying.resource === "food"
                        ? "#d9bd6b"
                        : "#a2a59b",
                  );
                }
              }
              hitBoxes.current.push({
                target: { type: "unit", id: u.id, x: u.x, y: u.y },
                x: p.x - 10,
                y: p.y - 29,
                w: 20,
                h: 33,
              });
            },
          });
        }
        objects
          .sort((a, b) => a.depth - b.depth)
          .forEach((item) => item.draw());
        // Shadows and water details belong to the same pixel grid as the sprites.
        for (let i = 0; i < 10; i++) {
          const tx = 34.5 + Math.sin(i * 0.36) * 3.3,
            ty = 3 + i * 1.6;
          if (
            world.tiles[Math.floor(ty)]?.[Math.floor(tx)]?.terrain === "water"
          ) {
            const p = iso(tx, ty);
            rectangle(
              c,
              p.x + Math.sin(t * 0.6 + i) * 6,
              p.y,
              5,
              1,
              "#b9c5aa70",
            );
          }
        }
        if (buildKind && hover.current) {
          const spec = BUILDING_SPECS[buildKind],
            x = Math.floor(hover.current.x - spec.w / 2),
            y = Math.floor(hover.current.y - spec.h / 2);
          const placement = canPlaceBuilding(world, buildKind, x, y);
          const valid =
            typeof placement === "boolean"
              ? placement
              : (placement as { ok?: boolean }).ok;
          footprint(
            c,
            x,
            y,
            spec.w,
            spec.h,
            valid ? "#8aaf6755" : "#b6534c66",
            valid ? "#d0e9a0" : "#efaaa0",
          );
          const p = iso(x + spec.w / 2, y + spec.h / 2);
          p.y += (spec.w + spec.h) * 6 - 3;
          drawSprite(
            c,
            a.buildings,
            BUILDING_ART[buildKind],
            p.x,
            p.y,
            (spec.w + spec.h) * 24 * 1.1,
            0.5,
          );
        }
        c.setTransform(1, 0, 0, 1, 0, 0);
        const box = selectionBox.current;
        if (box) {
          c.strokeStyle = "#e0d7a3";
          c.fillStyle = "#c4d29416";
          c.lineWidth = 1;
          c.fillRect(box.x, box.y, box.w, box.h);
          c.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
        }
      };
      frame = requestAnimationFrame(draw);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("keydown", keyDown);
        window.removeEventListener("keyup", keyUp);
        window.removeEventListener("blur", blur);
      };
    }, []);
    function coords(x: number, y: number) {
      const el = canvas.current!,
        r = el.getBoundingClientRect(),
        cam = iso(camera.current.x, camera.current.y),
        z = camera.current.zoom;
      const sx = (x - r.left - size.current.w / 2) / z + cam.x,
        sy = (y - r.top - size.current.h / 2) / z + cam.y;
      return {
        world: uniso(sx, sy),
        screen: { x: sx, y: sy },
        local: { x: x - r.left, y: y - r.top },
      };
    }
    function targetAt(x: number, y: number): MapTarget {
      const p = coords(x, y);
      const unit = [...hitBoxes.current]
        .reverse()
        .find(
          (b) =>
            b.target.type === "unit" &&
            p.screen.x >= b.x &&
            p.screen.x <= b.x + b.w &&
            p.screen.y >= b.y &&
            p.screen.y <= b.y + b.h,
        );
      const hit =
        unit ??
        [...hitBoxes.current]
          .reverse()
          .find(
            (b) =>
              p.screen.x >= b.x &&
              p.screen.x <= b.x + b.w &&
              p.screen.y >= b.y &&
              p.screen.y <= b.y + b.h,
          );
      return hit?.target ?? { type: "ground", ...p.world };
    }
    function down(e: React.PointerEvent<HTMLCanvasElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = {
          distance: Math.hypot(a!.x - b!.x, a!.y - b!.y),
          zoom: camera.current.zoom,
        };
        pointer.current = null;
        return;
      }
      pointer.current = {
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        button: e.button,
        shift: e.shiftKey,
        pan: e.button === 1 || keys.current.has(" "),
        touch: e.pointerType === "touch",
      };
    }
    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (pointers.current.has(e.pointerId))
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current && pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        camera.current.zoom = Math.max(
          0.65,
          Math.min(
            2.4,
            (pinch.current.zoom * Math.hypot(a!.x - b!.x, a!.y - b!.y)) /
              pinch.current.distance,
          ),
        );
        return;
      }
      const p = pointer.current;
      if (p) {
        const dx = e.clientX - p.lastX,
          dy = e.clientY - p.lastY,
          moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        if (p.pan || (p.touch && moved > 7)) {
          const delta = uniso(
            dx / camera.current.zoom,
            dy / camera.current.zoom,
          );
          camera.current.x -= delta.x;
          camera.current.y -= delta.y;
          p.pan = true;
        } else if (p.button === 0 && moved > 7) {
          const origin = coords(p.x, p.y).local,
            q = coords(e.clientX, e.clientY).local;
          selectionBox.current = {
            x: Math.min(origin.x, q.x),
            y: Math.min(origin.y, q.y),
            w: Math.abs(q.x - origin.x),
            h: Math.abs(q.y - origin.y),
          };
        }
        p.lastX = e.clientX;
        p.lastY = e.clientY;
      }
      const at = coords(e.clientX, e.clientY);
      hover.current = { ...at.world, target: targetAt(e.clientX, e.clientY) };
    }
    function up(e: React.PointerEvent<HTMLCanvasElement>) {
      pointers.current.delete(e.pointerId);
      if (pinch.current) {
        pinch.current = null;
        pointer.current = null;
        return;
      }
      const p = pointer.current;
      if (!p) return;
      const box = selectionBox.current;
      pointer.current = null;
      selectionBox.current = null;
      if (p.pan) return;
      if (box) {
        const cam = iso(camera.current.x, camera.current.y),
          z = camera.current.zoom;
        const ids = live.current.world.units
          .filter((u) => {
            const q = iso(u.x, u.y);
            const x = size.current.w / 2 + (q.x - cam.x) * z,
              y = size.current.h / 2 + (q.y - cam.y) * z;
            return (
              x >= box.x &&
              x <= box.x + box.w &&
              y >= box.y &&
              y <= box.y + box.h
            );
          })
          .map((u) => u.id);
        live.current.onSelect(ids, p.shift);
        return;
      }
      const target = live.current.buildKind
        ? { type: "ground" as const, ...coords(e.clientX, e.clientY).world }
        : targetAt(e.clientX, e.clientY);
      if (target.type === "unit" && e.button !== 2 && !live.current.buildKind) {
        live.current.onSelect([target.id!], p.shift);
        return;
      }
      live.current.onTarget(target, e.button === 2, p.shift);
    }
    return (
      <div className="village-map">
        <canvas
          ref={canvas}
          aria-label="Medieval clan map. Select clansmen, then give orders through the command panel or directly on the map."
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => {
            pointer.current = null;
            selectionBox.current = null;
            pointers.current.clear();
            pinch.current = null;
          }}
          onContextMenu={(e) => e.preventDefault()}
          onWheel={(e) => {
            camera.current.zoom = Math.max(
              0.65,
              Math.min(2.4, camera.current.zoom - e.deltaY * 0.001),
            );
          }}
        />
        {loading && (
          <div className="map-loading">
            <span className="loading-hourglass">⌛</span>
            <strong>
              {error ? "Preparing village artwork" : "Entering Elders’ Reach"}
            </strong>
            <span>
              {error
                ? "Reload when the sprite files are ready."
                : "Unfurling the map…"}
            </span>
          </div>
        )}
      </div>
    );
  },
);

export function MiniMap({
  world,
  onFocus,
}: {
  world: ClanWorld;
  onFocus: (p: Point) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!.getContext("2d")!;
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#344535";
    c.fillRect(0, 0, 192, 128);
    for (let y = 0; y < world.height; y++)
      for (let x = 0; x < world.width; x++) {
        c.fillStyle =
          world.tiles[y]![x]!.terrain === "water"
            ? "#6b9490"
            : world.tiles[y]![x]!.terrain === "dirt"
              ? "#afa077"
              : "#6e8250";
        c.fillRect(x * 4, y * 3.2, 4, 3.2);
      }
    for (const o of world.objects) {
      c.fillStyle =
        o.kind === "rock" || o.kind === "iron" ? "#c1c0a7" : "#3f5c33";
      c.fillRect(o.x * 4, o.y * 3.2, 3, 3);
    }
    for (const b of world.buildings) {
      c.fillStyle = "#c1a77a";
      c.fillRect(b.x * 4, b.y * 3.2, b.w * 4, b.h * 3.2);
    }
    for (const u of world.units) {
      c.fillStyle = u.role === "elder" ? "#f5df83" : "#dce8af";
      c.fillRect(u.x * 4 - 1, u.y * 3.2 - 1, 2, 2);
    }
  }, [world]);
  return (
    <canvas
      ref={ref}
      className="mini-map"
      width={192}
      height={128}
      aria-label="Village overview. Click to move the camera."
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onFocus({
          x: ((e.clientX - r.left) / r.width) * world.width,
          y: ((e.clientY - r.top) / r.height) * world.height,
        });
      }}
    />
  );
}
