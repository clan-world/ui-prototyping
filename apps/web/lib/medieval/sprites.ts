import type { BuildingKind, ObjectKind, ClanUnit } from "@clan-world/shared";
import { assetPath } from "../asset-path";

export interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  footX: number;
  footY: number;
}
export interface Atlas {
  image: HTMLImageElement;
  columns: number;
  rows: number;
  frames: SpriteFrame[];
  medianHeight: number;
  directionMap?: Record<string, { row: number; flipX: boolean }>;
}
export interface VillageArt {
  buildings: Atlas;
  props: Atlas;
  walk: Atlas;
  elder: Atlas;
  work: Atlas;
  landmarks?: Atlas;
}

export const BUILDING_ART: Record<BuildingKind, number> = {
  hall: 0,
  house: 1,
  lumber: 2,
  mine: 3,
  farm: 4,
  watchtower: 5,
  well: 6,
  storehouse: 7,
  tavern: 8,
  forge: 9,
  market: 10,
  chapel: 11,
};
export const OBJECT_ART: Record<ObjectKind, number> = {
  oak: 0,
  tree: 1,
  pine: 2,
  berry: 7,
  rock: 4,
  iron: 5,
  reeds: 7,
  stump: 8,
};

type UnitMeta = {
  image: string;
  columns: number;
  rows: number;
  sourceBodyHeight: number;
  directionMap?: Record<string, { row: number; flipX: boolean }>;
  frames: {
    x: number;
    y: number;
    w: number;
    h: number;
    pivotX: number;
    pivotY: number;
  }[];
};
type WorldMeta = {
  file: string;
  columns: number;
  rows: number;
  cells: { trim: number[]; source: number[]; anchor: number[] }[];
};
async function loadImage(path: string) {
  const img = new Image();
  img.src = assetPath(path);
  await img.decode();
  return img;
}
async function unitAtlas(meta: UnitMeta): Promise<Atlas> {
  return {
    image: await loadImage(meta.image),
    columns: meta.columns,
    rows: meta.rows,
    medianHeight: meta.sourceBodyHeight,
    directionMap: meta.directionMap,
    frames: meta.frames.map((f) => ({
      sx: f.x,
      sy: f.y,
      sw: f.w,
      sh: f.h,
      footX: f.pivotX,
      footY: f.pivotY,
    })),
  };
}
async function worldAtlas(meta: WorldMeta): Promise<Atlas> {
  const frames = meta.cells.map((f) => ({
    sx: f.trim[0]!,
    sy: f.trim[1]!,
    sw: f.trim[2]!,
    sh: f.trim[3]!,
    footX: f.source[0]! + f.anchor[0]! - f.trim[0]!,
    footY: f.source[1]! + f.anchor[1]! - f.trim[1]!,
  }));
  return {
    image: await loadImage("/medieval/" + meta.file),
    columns: meta.columns,
    rows: meta.rows,
    medianHeight: frames[0]!.sh,
    frames,
  };
}
let artPromise: Promise<VillageArt> | undefined;
export function loadVillageArt(): Promise<VillageArt> {
  artPromise ??= (async () => {
    const [units, world] = await Promise.all([
      fetch(assetPath("/medieval/units-atlas.json")).then((r) => {
        if (!r.ok) throw new Error("Unit atlas unavailable");
        return r.json() as Promise<Record<string, UnitMeta>>;
      }),
      fetch(assetPath("/medieval/overhead/atlas.json")).then((r) => {
        if (!r.ok) throw new Error("World atlas unavailable");
        return r.json() as Promise<Record<string, WorldMeta>>;
      }),
    ]);
    const [buildings, props, walk, elder, work, landmarks] = await Promise.all([
      worldAtlas(world.buildings!),
      worldAtlas(world.props!),
      unitAtlas(units.walk!),
      unitAtlas(units.elder!),
      unitAtlas(units.work!),
      world.landmarks ? worldAtlas(world.landmarks) : Promise.resolve(undefined),
    ]);
    return { buildings, props, walk, elder, work, landmarks };
  })().catch((error) => {
    artPromise = undefined;
    throw error;
  });
  return artPromise;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  index: number,
  x: number,
  y: number,
  width: number,
  alpha = 1,
  flip = false,
) {
  const f = atlas.frames[index % atlas.frames.length]!;
  const scale = width / f.sw,
    h = f.sh * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(
    atlas.image,
    f.sx,
    f.sy,
    f.sw,
    f.sh,
    Math.round(-f.footX * scale),
    Math.round(-f.footY * scale),
    Math.round(width),
    Math.round(h),
  );
  ctx.restore();
}

export function drawClansman(
  ctx: CanvasRenderingContext2D,
  art: VillageArt,
  unit: ClanUnit,
  x: number,
  y: number,
  time: number,
  scale = 1,
) {
  const moving =
    unit.status === "walking" ||
    unit.status === "returning" ||
    unit.status === "following";
  const working = unit.status === "working" || unit.status === "building";
  const direction =
    { e: 0, se: 0, s: 0, sw: 1, w: 1, nw: 2, n: 2, ne: 3 }[unit.facing] ?? 0;
  const walkingFrame = moving ? Math.floor(time * 9 + unit.variant) % 8 : 0;
  let atlas = unit.role === "elder" ? art.elder : art.walk,
    index = direction * 8 + walkingFrame,
    flip = false;
  const directionMeta =
    atlas.directionMap?.[["se", "sw", "nw", "ne"][direction]!];
  if (directionMeta) {
    index = directionMeta.row * 8 + walkingFrame;
    flip = directionMeta.flipX;
  }
  if (unit.role !== "elder" && (working || unit.carrying)) {
    atlas = art.work;
    const action =
      unit.status === "building"
        ? 3
        : working
          ? /miner|stone|quarry|iron/i.test(unit.job)
            ? 1
            : 0
          : 2;
    index =
      action * 8 +
      (moving || working ? Math.floor(time * 8 + unit.variant) % 8 : 0);
    flip = direction === 1 || direction === 2;
  }
  const f = atlas.frames[index % atlas.frames.length]!;
  const h = (unit.role === "elder" ? 26 : 23) * scale;
  const w = (h * f.sw) / atlas.medianHeight;
  ctx.save();
  ctx.globalAlpha = 0.17;
  ctx.fillStyle = "#241e19";
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 9 * scale, 3.7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawSprite(ctx, atlas, index, x, y, w, 1, flip);
}
