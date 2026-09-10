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
  isClanWalkable,
  isPlayerBuilding,
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

import {
  project,
  unproject,
  TILE_SIZE,
  polygon,
  rectangle,
  terrainCache,
  mountainPeaks,
  drawMountain,
  drawMonument,
  TERRAIN_COLORS,
} from "./map-terrain";

export type MapTarget = {
  type: "unit" | "object" | "building" | "ground";
  id?: string;
  x: number;
  y: number;
};
export type CameraState = Point & {
  zoom: number;
  region: string;
  bounds: Point[];
};
export type MapHandle = {
  focus: (point: Point) => void;
  zoom: (change: number) => void;
  reset: () => void;
  zoomTo: (zoom: number) => void;
};
type Props = {
  world: ClanWorld;
  selected: string[];
  buildKind: BuildingKind | null;
  command?: "context" | "move" | "gather" | "guard" | "rally";
  showOrders: boolean;
  showNames: boolean;
  paused: boolean;
  onSelect: (ids: string[], append: boolean) => void;
  onTarget: (target: MapTarget, secondary: boolean, append: boolean) => void;
  onReady: () => void;
  onCameraChange?: (camera: CameraState) => void;
};
export { project } from "./map-terrain";
const MIN_ZOOM = 0.1, MAX_ZOOM = 2.4;
const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
const CURSORS = {
  arrow: "url('/medieval/cursors/arrow.svg') 4 3, default",
  pointer: "url('/medieval/cursors/pointer.svg') 6 3, pointer",
  grab: "url('/medieval/cursors/grab.svg') 19 20, grab",
  grabbing: "url('/medieval/cursors/grabbing.svg') 19 20, grabbing",
  blocked: "url('/medieval/cursors/blocked.svg') 20 20, not-allowed",
};
function home(world: ClanWorld) {
  const base = world.clans?.find((clan) => clan.player)?.base;
  const elder = world.units.find((unit) => unit.role === "elder");
  return base ? { x: base.x + 3, y: base.y + 3 } : elder ?? { x: world.width / 2, y: world.height / 2 };
}
function regionAt(world: ClanWorld, point: Point) {
  return world.regions?.find(({ bounds: b }) => point.x >= b.x && point.x < b.x + b.w && point.y >= b.y && point.y < b.y + b.h)?.name ?? "The Wildlands";
}
function nameplate(c: CanvasRenderingContext2D, label: string, x: number, y: number, color = "#e4d6a4", large = false) {
  c.save();
  c.font = large ? "600 14px Georgia" : "11px monospace";
  c.textAlign = "center";
  c.lineJoin = "round";
  c.lineWidth = 3;
  c.strokeStyle = "#29271f";
  c.strokeText(label, x, y);
  c.fillStyle = color;
  c.fillText(label, x, y);
  c.restore();
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
  const points = [project(x, y), project(x + w, y), project(x + w, y + h), project(x, y + h)];
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
  color = "#707c9a",
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
    color,
  );
  rectangle(c, x + 5, y - 29, 2, 4, "#d9c891");
}

export const ClanMap = forwardRef<MapHandle, Props>(
  function ClanMap(props, ref) {
    const canvas = useRef<HTMLCanvasElement>(null),
      live = useRef(props),
      art = useRef<VillageArt | null>(null),
      camera = useRef({ ...home(props.world), zoom: 1.25 }),
      size = useRef({ w: 1200, h: 700 });
    const hover = useRef<{ x: number; y: number; target: MapTarget; } | null>(
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
        { target: MapTarget; x: number; y: number; w: number; h: number; }[]
      >([]),
      pointers = useRef(new Map<number, Point>()),
      pinch = useRef<{ distance: number; zoom: number; } | null>(null);
    const feedback = useRef<{ point: Point; at: number; blocked: boolean; } | null>(null);
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
          camera.current.zoom = clampZoom(camera.current.zoom + change);
        },
        zoomTo(zoom) {
          const world = live.current.world;
          camera.current.zoom = clampZoom(zoom <= 0.45 ? Math.min(zoom, size.current.w * 0.88 / (world.width * TILE_SIZE + 160), size.current.h * 0.72 / (world.height * TILE_SIZE + 160)) : zoom);
          if (zoom <= 0.45) {
            camera.current.x = live.current.world.width / 2;
            camera.current.y = live.current.world.height / 2;
          }
        },
        reset() {
          camera.current = { ...home(live.current.world), zoom: 1.25 };
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
        peaks = mountainPeaks(live.current.world),
        groundSeed = live.current.world.seed,
        groundTiles = live.current.world.tiles;
      let lastCameraEvent = 0, lastCameraKey = "";
      let frame = 0,
        last = performance.now();
      camera.current.zoom = el.clientWidth < 700 ? 1.05 : 1.25;
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
          if (e.key === " ") el.style.cursor = CURSORS.grab;
        }
      };
      const keyUp = (e: KeyboardEvent) => { keys.current.delete(e.key); if (e.key === " ") el.style.cursor = CURSORS.arrow; },
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
        if (world.seed !== groundSeed || world.tiles !== groundTiles) {
          if (world.seed !== groundSeed || world.tiles !== groundTiles) camera.current = { ...home(world), zoom: camera.current.zoom };
          ground = terrainCache(world, a ?? undefined);
          peaks = mountainPeaks(world);
          groundSeed = world.seed;
          groundTiles = world.tiles;
          positions.current.clear();
        }
        const w = Math.round(el.clientWidth),
          h = Math.round(el.clientHeight);
        if (w < 1 || h < 1) return;
        const pixelWidth = Math.ceil(w / 2), pixelHeight = Math.ceil(h / 2);
        if (el.width !== pixelWidth || el.height !== pixelHeight) {
          el.width = pixelWidth;
          el.height = pixelHeight;
        }
        const renderScaleX = pixelWidth / w, renderScaleY = pixelHeight / h;
        size.current = { w, h };
        c.imageSmoothingEnabled = false;
        const panSpeed = (dt * 14) / camera.current.zoom;
        let sx = 0,
          sy = 0;
        if (keys.current.has("a") || keys.current.has("ArrowLeft")) sx--;
        if (keys.current.has("d") || keys.current.has("ArrowRight")) sx++;
        if (keys.current.has("w") || keys.current.has("ArrowUp")) sy--;
        if (keys.current.has("s") || keys.current.has("ArrowDown")) sy++;
        camera.current.x = Math.max(
          2,
          Math.min(world.width - 2, camera.current.x + sx * panSpeed),
        );
        camera.current.y = Math.max(
          2,
          Math.min(world.height - 2, camera.current.y + sy * panSpeed),
        );
        const cam = project(camera.current.x, camera.current.y),
          z = camera.current.zoom;
        const ox = Math.round((w / 2 - cam.x * z) / 2) * 2,
          oy = Math.round((h / 2 - cam.y * z) / 2) * 2;
        c.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);
        c.fillStyle = "#384c50";
        c.fillRect(0, 0, w, h);
        c.translate(ox, oy);
        c.scale(z, z);
        c.drawImage(ground.canvas, -ground.origin.x, -ground.origin.y);
        const visible = (x: number, y: number, width: number, height: number) =>
          x + width / 2 > -ox / z && x - width / 2 < (w - ox) / z && y > -oy / z && y - height < (h - oy) / z;
        if (now - lastCameraEvent > 100) {
          lastCameraEvent = now;
          const cameraKey = `${camera.current.x.toFixed(2)}:${camera.current.y.toFixed(2)}:${z.toFixed(3)}:${w}:${h}`;
          if (cameraKey !== lastCameraKey) {
            lastCameraKey = cameraKey;
            live.current.onCameraChange?.({
              ...camera.current, region: z < 0.5 ? "The Clanlands" : regionAt(world, camera.current), bounds: [
                unproject(-ox / z, -oy / z), unproject((w - ox) / z, -oy / z), unproject((w - ox) / z, (h - oy) / z), unproject(-ox / z, (h - oy) / z),
              ]
            });
          }
        }
        const mark = feedback.current;
        if (mark && now - mark.at < 950) {
          const p = project(mark.point.x, mark.point.y), age = (now - mark.at) / 950;
          c.globalAlpha = 1 - age;
          c.strokeStyle = mark.blocked ? "#e68c69" : "#f0d492";
          c.lineWidth = 2 / z;
          c.beginPath(); c.ellipse(p.x, p.y, 12 + age * 10, 6 + age * 5, 0, 0, Math.PI * 2); c.stroke();
          if (mark.blocked) { c.beginPath(); c.moveTo(p.x - 5, p.y - 5); c.lineTo(p.x + 5, p.y + 5); c.moveTo(p.x + 5, p.y - 5); c.lineTo(p.x - 5, p.y + 5); c.stroke(); }
          c.globalAlpha = 1;
        }
        const t = world.elapsed;
        for (const glint of ground.glints) {
          if (!visible(glint.x, glint.y, 30, 12)) continue;
          const wave = Math.sin(now * 0.001 + glint.x * 0.06 + glint.y * 0.05);
          c.globalAlpha = 0.12 + (wave + 1) * 0.08;
          rectangle(c, glint.x + wave * 3, glint.y, 6, 1, "#b5c9b3");
        }
        c.globalAlpha = 1;
        if (!a) {
          c.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);
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
            const p = project(u.x, u.y);
            c.moveTo(p.x, p.y);
            for (const step of u.path) {
              const q = project(step.x, step.y);
              c.lineTo(q.x, q.y);
            }
            c.stroke();
            c.setLineDash([]);
            const end = u.path.at(-1)!;
            const q = project(end.x, end.y);
            c.strokeStyle = "#e2d49e";
            c.beginPath();
            c.ellipse(q.x, q.y, 8, 4, 0, 0, Math.PI * 2);
            c.stroke();
          }
        const elder = world.units.find((u) => u.role === "elder");
        if (elder && selected.includes(elder.id)) {
          const p = project(elder.x, elder.y),
            radius = world.buildings.some(
              (b) => b.kind === "chapel" && b.progress >= 1 && isPlayerBuilding(world, b),
            )
              ? 10
              : 6;
          c.strokeStyle = "#ddc88055";
          c.lineWidth = 1;
          c.setLineDash([2, 5]);
          c.beginPath();
          c.ellipse(p.x, p.y, radius * TILE_SIZE, radius * TILE_SIZE, 0, 0, Math.PI * 2);
          c.stroke();
          c.setLineDash([]);
        }
        const objects: { depth: number; draw: () => void; }[] = [];
        for (const peak of peaks) {
          const p = project(peak.x, peak.y);
          if (!visible(p.x, p.y + 30, 340, 300)) continue;
          objects.push({ depth: peak.depth, draw: () => drawMountain(c, p.x, p.y, peak, a) });
        }
        if (world.monument) {
          const m = world.monument, p = project(m.x + m.w / 2, m.y + m.h);
          if (visible(p.x, p.y + 60, 250, 220)) objects.push({
depth: m.y + m.h - 0.1, draw: () => {
              drawMonument(c, p.x, p.y, t, a);
              if (z >= 0.8) nameplate(c, m.name, p.x, p.y + 25, "#ebd38d", true);
            }
});
        }
        hitBoxes.current = [];
        const obscuresSelected = (
          x: number,
          y: number,
          width: number,
          height: number,
          depth: number,
        ) =>
          world.units.some((u) => {
            if (!selected.includes(u.id) || u.y >= depth) return false;
            const p = project(u.x, u.y);
            return (
              p.x > x - width / 2 &&
              p.x < x + width / 2 &&
              p.y - 12 > y - height &&
              p.y - 12 < y
            );
          });
        for (const b of world.buildings) {
          const p = project(b.x + b.w / 2, b.y + b.h);
          const width = b.w * TILE_SIZE * (b.kind === "well" ? 1.1 : 1.05);
          const f = a.buildings.frames[BUILDING_ART[b.kind]]!;
          const height = (f.sh / f.sw) * width;
          if (!visible(p.x, p.y + 20, width + 40, height + 20)) continue;
          if (b.progress < 1)
            footprint(c, b.x, b.y, b.w, b.h, "#b8b59277", "#d9d4ab");
          objects.push({
            depth: b.y + b.h - 0.3,
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
                    b.y + b.h - 0.3,
                  )
                    ? 0.48
                    : 1,
              );
              if (b.progress < 1) {
                const corners = [
                  project(b.x + 0.2, b.y + 0.2),
                  project(b.x + b.w - 0.2, b.y + 0.2),
                  project(b.x + b.w - 0.2, b.y + b.h - 0.2),
                  project(b.x + 0.2, b.y + b.h - 0.2),
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
                flag(c, p.x + width * 0.22, p.y - height * 0.22, t, world.clans?.find((clan) => clan.id === b.clanId)?.color);
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
              if ((showNames && z > 1) || hover.current?.target.id === b.id) {
                nameplate(c, BUILDING_SPECS[b.kind].name, p.x, p.y + 16, "#e5dab9");
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
          const p = project(obj.x, obj.y);
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
          if (!visible(p.x, p.y + 12, width + 20, height + 20)) continue;
          objects.push({
            depth: obj.y + 0.4,
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
                  obj.y + 0.4,
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
          const p = project(position.x, position.y);
          if (!visible(p.x, p.y + 10, 40, 65)) continue;
          objects.push({
            depth: position.y + 0.05,
            draw: () => {
              if (selected.includes(u.id)) {
                c.strokeStyle = u.role === "elder" ? "#ebd493" : "#e1d6ab";
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
                (showNames && z > 1) ||
                selected.includes(u.id) ||
                hover.current?.target.id === u.id
              ) {
                nameplate(c, u.name.replace("Elder ", ""), p.x, p.y - 39, u.role === "elder" ? "#ebcf8e" : "#ded6b8");
              }
              if (selected.includes(u.id)) {
                rectangle(c, p.x - 9, p.y + 6, 18, 2, "#394535");
                rectangle(
                  c,
                  p.x - 9,
                  p.y + 6,
                  (18 * u.energy) / 100,
                  2,
                  "#bfb075",
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
        for (const clan of world.clans ?? []) {
          const p = project(clan.base.x + 2, clan.base.y + 2);
          if (!visible(p.x, p.y + 100, 200, 250)) continue;
          if (z >= 0.65 && (showNames || z < 1)) nameplate(c, clan.name, p.x, p.y + 78, clan.color);
          else {
            c.fillStyle = clan.color; c.beginPath(); c.arc(p.x, p.y, 7 / z, 0, Math.PI * 2); c.fill();
            c.strokeStyle = "#171d17"; c.lineWidth = 2 / z; c.stroke();
          }
        }
        if (z < 0.65) for (const region of world.regions ?? []) {
          const p = project(region.x, region.y);
          c.save(); c.translate(p.x, p.y); c.scale(1 / z, 1 / z);
          c.font = "600 12px Georgia"; c.textAlign = "center"; c.lineWidth = 4; c.strokeStyle = "#15221e";
          c.strokeText(region.name.toUpperCase(), 0, 0); c.fillStyle = "#dbd5b2"; c.fillText(region.name.toUpperCase(), 0, 0); c.restore();
        }
        if (buildKind && hover.current) {
          const spec = BUILDING_SPECS[buildKind],
            x = Math.floor(hover.current.x - spec.w / 2),
            y = Math.floor(hover.current.y - spec.h / 2);
          const placement = canPlaceBuilding(world, buildKind, x, y);
          const valid =
            typeof placement === "boolean"
              ? placement
              : (placement as { ok?: boolean; }).ok;
          footprint(
            c,
            x,
            y,
            spec.w,
            spec.h,
            valid ? "#8aaf6755" : "#b6534c66",
            valid ? "#d0e9a0" : "#efaaa0",
          );
          const p = project(x + spec.w / 2, y + spec.h);
          drawSprite(
            c,
            a.buildings,
            BUILDING_ART[buildKind],
            p.x,
            p.y,
            spec.w * TILE_SIZE * (buildKind === "well" ? 1.1 : 1.05),
            0.5,
          );
        }
        c.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);
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
        cam = project(camera.current.x, camera.current.y),
        z = camera.current.zoom;
      const sx = (x - r.left - size.current.w / 2) / z + cam.x,
        sy = (y - r.top - size.current.h / 2) / z + cam.y;
      return {
        world: unproject(sx, sy),
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
      if (pointer.current.pan) e.currentTarget.style.cursor = CURSORS.grabbing;
    }
    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (pointers.current.has(e.pointerId))
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current && pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        camera.current.zoom = clampZoom((pinch.current.zoom * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / pinch.current.distance);
        return;
      }
      const p = pointer.current;
      if (p) {
        const dx = e.clientX - p.lastX,
          dy = e.clientY - p.lastY,
          moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        if (p.pan || (p.touch && moved > 7)) {
          const delta = unproject(
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
      const target = targetAt(e.clientX, e.clientY);
      hover.current = { ...at.world, target };
      e.currentTarget.style.cursor = p?.pan ? CURSORS.grabbing : keys.current.has(" ") ? CURSORS.grab : target.type === "unit" ? CURSORS.grab : target.type !== "ground" ? CURSORS.pointer : isClanWalkable(live.current.world, at.world.x, at.world.y) ? CURSORS.arrow : CURSORS.blocked;
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
      if (p.pan) { e.currentTarget.style.cursor = CURSORS.grab; return; }
      if (box) {
        const cam = project(camera.current.x, camera.current.y),
          z = camera.current.zoom;
        const ids = live.current.world.units
          .filter((u) => {
            const q = project(u.x, u.y);
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
      const explicitMove = ["move", "guard", "rally"].includes(live.current.command ?? "context");
      const target = live.current.buildKind || explicitMove
        ? { type: "ground" as const, ...coords(e.clientX, e.clientY).world }
        : targetAt(e.clientX, e.clientY);
      if (target.type === "unit" && e.button !== 2 && !live.current.buildKind && !explicitMove) {
        live.current.onSelect([target.id!], p.shift);
        return;
      }
      feedback.current = { point: target, at: performance.now(), blocked: target.type === "ground" && !isClanWalkable(live.current.world, target.x, target.y) };
      live.current.onTarget(target, e.button === 2, p.shift);
    }
    return (
      <div className="village-map">
        <canvas
          ref={canvas}
          style={{ cursor: CURSORS.arrow, imageRendering: "pixelated" }}
          aria-label="Medieval clan map. Select clansmen, then give orders through the command panel or directly on the map."
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={(e) => {
            e.currentTarget.style.cursor = CURSORS.arrow;
            pointer.current = null;
            selectionBox.current = null;
            pointers.current.clear();
            pinch.current = null;
          }}
          onPointerLeave={() => { if (!pointer.current) hover.current = null; }}
          onContextMenu={(e) => e.preventDefault()}
          onWheel={(e) => {
            const before = coords(e.clientX, e.clientY).world;
            camera.current.zoom = clampZoom(camera.current.zoom * Math.exp(-e.deltaY * 0.0012));
            const after = coords(e.clientX, e.clientY).world;
            camera.current.x += before.x - after.x;
            camera.current.y += before.y - after.y;
          }}
        />
        {loading && (
          <div className="map-loading">
            <span className="loading-hourglass" aria-hidden="true">◆</span>
            <strong>
              {error ? "Artwork unavailable" : "Entering the realm"}
            </strong>
            <span>
              {error ? "Reload to retry" : "Loading artwork"}
            </span>
            <div className="map-loading-progress" role="progressbar" aria-label="Loading world artwork" />
            <small>CLAN WORLD</small>
          </div>
        )}
      </div>
    );
  },
);

export function MiniMap({ world, onFocus, camera }: { world: ClanWorld; onFocus: (p: Point) => void; camera?: CameraState ;}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [art, setArt] = useState<VillageArt | null>(null);
  useEffect(() => {
    let disposed = false;
    loadVillageArt().then(value => { if (!disposed) setArt(value); }).catch(() => {});
    return () => { disposed = true; };
  }, []);
  const ground = useRef<{ seed: number; image: HTMLCanvasElement; tiles: ClanWorld["tiles"] ;} | null>(null);
  useEffect(() => {
    const c = ref.current!.getContext("2d")!, w = 216, h = 160;
    c.imageSmoothingEnabled = false;
    if (!ground.current || ground.current.seed !== world.seed || ground.current.tiles !== world.tiles) {
      const image = document.createElement("canvas"); image.width = w; image.height = h;
      const g = image.getContext("2d")!;
      for (let y = 0; y < world.height; y++)for (let x = 0; x < world.width; x++) {
        g.fillStyle = TERRAIN_COLORS[world.tiles[y]![x]!.terrain];
        g.fillRect(Math.floor(x / world.width * w), Math.floor(y / world.height * h), Math.ceil(w / world.width), Math.ceil(h / world.height));
      }
      ground.current = { seed: world.seed, image, tiles: world.tiles };
    }
    c.drawImage(ground.current.image, 0, 0);
    if (art) {
      c.save();
      c.scale(w / (world.width * TILE_SIZE), h / (world.height * TILE_SIZE));
      const scenery: { depth: number; draw: () => void; }[] = [];
      for (const peak of mountainPeaks(world)) {
        const p = project(peak.x, peak.y);
        scenery.push({ depth: peak.depth, draw: () => drawMountain(c, p.x, p.y, peak, art) });
      }
      for (const o of world.objects) {
        const p = project(o.x, o.y), tree = ["tree", "oak", "pine"].includes(o.kind);
        scenery.push({ depth: o.y, draw: () => drawSprite(c, art.props, OBJECT_ART[o.kind], p.x, p.y, tree ? 78 : 34) });
      }
      for (const b of world.buildings) {
        const p = project(b.x + b.w / 2, b.y + b.h);
        scenery.push({ depth: b.y + b.h, draw: () => drawSprite(c, art.buildings, BUILDING_ART[b.kind], p.x, p.y, b.w * TILE_SIZE * 1.05) });
      }
      scenery.sort((a, b) => a.depth - b.depth).forEach(item => item.draw());
      c.restore();
    } else {
      for (const b of world.buildings) { c.fillStyle = "#b8a57b"; c.fillRect(b.x / world.width * w, b.y / world.height * h, Math.max(2, b.w / world.width * w), Math.max(2, b.h / world.height * h)); }
    }
    for (const clan of world.clans ?? []) {
      const x = clan.base.x / world.width * w, y = clan.base.y / world.height * h;
      c.fillStyle = "#18201b"; c.fillRect(x - 3, y - 3, 7, 7); c.fillStyle = clan.color; c.fillRect(x - 2, y - 2, 5, 5);
    }
    if (world.monument) {
      const m = world.monument, x = (m.x + m.w / 2) / world.width * w, y = (m.y + m.h / 2) / world.height * h;
      polygon(c, [{ x, y: y - 4 }, { x: x + 4, y }, { x, y: y + 4 }, { x: x - 4, y }], "#f0dc91");
    }
    for (const u of world.units) {
      const x = u.x / world.width * w, y = u.y / world.height * h;
      c.beginPath(); c.arc(x, y, u.role === "elder" ? 2 : 1.5, 0, Math.PI * 2);
      c.fillStyle = u.role === "elder" ? "#fff0aa" : "#e9e4d2"; c.fill();
      c.strokeStyle = "#29251e"; c.lineWidth = 0.8; c.stroke();
    }
    if (camera) {
      c.beginPath(); camera.bounds.forEach((p, i) => { const x = p.x / world.width * w, y = p.y / world.height * h; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath();
      c.fillStyle = "#f7e3a714"; c.fill(); c.strokeStyle = "#fff0b9"; c.lineWidth = 1.3; c.stroke();
    }
    c.strokeStyle = "#dec69344"; c.lineWidth = 1; c.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [world, camera, art]);
  function focus(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    onFocus({ x: Math.max(0, Math.min(world.width, ((e.clientX - r.left) / r.width) * world.width)), y: Math.max(0, Math.min(world.height, ((e.clientY - r.top) / r.height) * world.height)) });
  }
  return <canvas ref={ref} className="mini-map" width={216} height={160} style={{ cursor: CURSORS.pointer }} aria-label="Realm overview. Click or drag to move the camera." onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); focus(e); }} onPointerMove={e => { if (e.buttons === 1) focus(e); }} />;
}
