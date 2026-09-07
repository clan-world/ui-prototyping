import type { StorageLike } from "./types";

export type ClanResource = "timber" | "stone" | "food" | "iron" | "gold";
export type ClanResources = Record<ClanResource, number>;
export type ClanDoctrine = "industry" | "harvest" | "stewardship";
export type Point = { x: number; y: number };
export type Terrain = "grass" | "dirt" | "water" | "sand" | "farm" | "bridge";
export interface Tile {
  terrain: Terrain;
  variant: number;
  height: number;
}
export type ObjectKind =
  "tree" | "pine" | "oak" | "rock" | "iron" | "berry" | "reeds" | "stump";
export interface WorldObject extends Point {
  id: string;
  kind: ObjectKind;
  stock: number;
  maxStock: number;
  variant: number;
}
export type BuildingKind =
  | "hall"
  | "house"
  | "lumber"
  | "mine"
  | "farm"
  | "watchtower"
  | "well"
  | "storehouse"
  | "tavern"
  | "forge"
  | "market"
  | "chapel";
export interface Building extends Point {
  id: string;
  kind: BuildingKind;
  w: number;
  h: number;
  progress: number;
  hp: number;
  stock: number;
}
export interface BuildingSpec {
  name: string;
  w: number;
  h: number;
  cost: Partial<ClanResources>;
  work: number;
  housing: number;
  description: string;
}
export const BUILDING_SPECS: Record<BuildingKind, BuildingSpec> = {
  hall: {
    name: "Elder's hall",
    w: 4,
    h: 3,
    cost: { timber: 180, stone: 100 },
    work: 100,
    housing: 4,
    description: "Clan seat and resource store",
  },
  house: {
    name: "Clansman's cottage",
    w: 3,
    h: 2,
    cost: { timber: 45, stone: 15 },
    work: 30,
    housing: 4,
    description: "Room for four clansmen",
  },
  lumber: {
    name: "Woodcutter's lodge",
    w: 3,
    h: 2,
    cost: { timber: 65, stone: 20 },
    work: 40,
    housing: 0,
    description: "Timber drop-off and faster axes",
  },
  mine: {
    name: "Quarry lodge",
    w: 3,
    h: 2,
    cost: { timber: 65, stone: 40 },
    work: 45,
    housing: 0,
    description: "Stone and iron drop-off",
  },
  farm: {
    name: "Wheat field",
    w: 4,
    h: 3,
    cost: { timber: 35 },
    work: 24,
    housing: 0,
    description: "Regrowing food crop",
  },
  watchtower: {
    name: "Watchtower",
    w: 2,
    h: 2,
    cost: { timber: 55, stone: 60 },
    work: 45,
    housing: 0,
    description: "A safe post for clan guards",
  },
  well: {
    name: "Village well",
    w: 1,
    h: 1,
    cost: { timber: 15, stone: 40 },
    work: 25,
    housing: 0,
    description: "Restores nearby worker energy",
  },
  storehouse: {
    name: "Storehouse",
    w: 3,
    h: 2,
    cost: { timber: 70, stone: 25 },
    work: 40,
    housing: 0,
    description: "Resource drop-off near distant worksites",
  },
  tavern: {
    name: "The Hearth & Stag",
    w: 3,
    h: 3,
    cost: { timber: 95, stone: 45 },
    work: 60,
    housing: 0,
    description: "Raises clan happiness",
  },
  forge: {
    name: "Blacksmith",
    w: 3,
    h: 2,
    cost: { timber: 70, stone: 75, iron: 20 },
    work: 60,
    housing: 0,
    description: "Better tools increase all gathering",
  },
  market: {
    name: "Market stall",
    w: 3,
    h: 2,
    cost: { timber: 75, stone: 25 },
    work: 40,
    housing: 0,
    description: "Earns gold from a thriving clan",
  },
  chapel: {
    name: "Stone chapel",
    w: 3,
    h: 3,
    cost: { timber: 80, stone: 130 },
    work: 80,
    housing: 0,
    description: "Extends the Elder's inspiration",
  },
};
export type ClanOrder =
  | { type: "move" | "guard" | "rally"; x: number; y: number }
  | { type: "gather" | "construct"; targetId: string }
  | { type: "build"; buildingKind: BuildingKind; x: number; y: number }
  | { type: "return" | "follow" | "stop" };
export type UnitRole = "elder" | "clansman" | "guard";
export type UnitStatus =
  | "idle"
  | "walking"
  | "working"
  | "returning"
  | "building"
  | "guarding"
  | "following";
export interface ClanUnit extends Point {
  id: string;
  name: string;
  role: UnitRole;
  job: string;
  status: UnitStatus;
  order: ClanOrder | null;
  queue: ClanOrder[];
  carrying: { resource: ClanResource; amount: number } | null;
  energy: number;
  hp: number;
  path: Point[];
  routeTarget: Point | null;
  phase: "idle" | "travel" | "work" | "return";
  facing: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
  workProgress: number;
  wait: number;
  variant: number;
  homeId: string;
}
export interface ClanLog {
  id: number;
  at: number;
  text: string;
  kind: "order" | "economy" | "build" | "clan";
}
export interface ClanWorld {
  version: 2;
  seed: number;
  width: number;
  height: number;
  tiles: Tile[][];
  objects: WorldObject[];
  buildings: Building[];
  units: ClanUnit[];
  resources: ClanResources;
  elapsed: number;
  day: number;
  population: number;
  maxPopulation: number;
  happiness: number;
  logs: ClanLog[];
  nextId: number;
  rallyUntil: number;
  equippedDoctrine: ClanDoctrine | null;
  stats: {
    gathered: number;
    built: number;
    recruited: number;
    goldProgress: number;
    foodProgress: number;
  };
}
export const CLAN_WORLD_WIDTH = 48;
export const CLAN_WORLD_HEIGHT = 40;
export const CLAN_SAVE_KEY = "clan-world:elder-village:v2";
export const CLAN_CARGO_CAPACITY = 10;
export const CLAN_WALK_SPEED = 1.65;
const RESOURCES: ClanResource[] = ["timber", "stone", "food", "iron", "gold"];
const NAMES = [
  "Aldric",
  "Bryn",
  "Willa",
  "Oswin",
  "Maera",
  "Garrick",
  "Edith",
  "Rowan",
  "Hilda",
  "Cedric",
  "Elowen",
  "Torren",
  "Bran",
  "Sigrid",
  "Ewan",
  "Asta",
  "Leofric",
  "Isolde",
  "Rolf",
  "Freya",
  "Ulric",
  "Agnes",
  "Sten",
  "Mabel",
  "Fenn",
  "Ida",
  "Alaric",
  "Rose",
];
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const key = (x: number, y: number) => y * CLAN_WORLD_WIDTH + x;
const center = (p: Point): Point => ({
  x: Math.floor(p.x) + 0.5,
  y: Math.floor(p.y) + 0.5,
});
const resourceForObject = (object: WorldObject): ClanResource =>
  object.kind === "iron"
    ? "iron"
    : object.kind === "rock"
      ? "stone"
      : object.kind === "berry" || object.kind === "reeds"
        ? "food"
        : "timber";
const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

function randomGenerator(seed: number) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(1664525, n) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

function cloneWorld(state: ClanWorld): ClanWorld {
  return {
    ...state,
    resources: { ...state.resources },
    units: state.units.map((unit) => ({
      ...unit,
      carrying: unit.carrying ? { ...unit.carrying } : null,
      path: [...unit.path],
      queue: [...unit.queue],
    })),
    objects: state.objects.map((object) => ({ ...object })),
    buildings: state.buildings.map((building) => ({ ...building })),
    logs: [...state.logs],
    stats: { ...state.stats },
  };
}

function log(state: ClanWorld, text: string, kind: ClanLog["kind"]) {
  state.logs.push({ id: state.nextId++, at: state.elapsed, text, kind });
  state.logs = state.logs.slice(-30);
}

function createUnit(
  state: ClanWorld,
  name: string,
  role: UnitRole,
  x: number,
  y: number,
  index: number,
): ClanUnit {
  return {
    id: role === "elder" ? "elder" : `clansman-${index}`,
    name,
    role,
    x,
    y,
    job: role === "elder" ? "Elder" : role === "guard" ? "Guard" : "Clansman",
    status: "idle",
    order: null,
    queue: [],
    carrying: null,
    energy: 100,
    hp: 100,
    path: [],
    routeTarget: null,
    phase: "idle",
    facing: "se",
    workProgress: 0,
    wait: 0,
    variant: index % 8,
    homeId:
      state.buildings.find((building) => building.kind === "house")?.id ??
      "hall",
  };
}

export function createClanWorld(seed = 7331): ClanWorld {
  seed = finite(seed) ? Math.floor(seed) >>> 0 : 7331;
  const rng = randomGenerator(seed);
  const tiles: Tile[][] = Array.from({ length: CLAN_WORLD_HEIGHT }, (_, y) =>
    Array.from({ length: CLAN_WORLD_WIDTH }, (_, x) => {
      const riverX = 34.5 + Math.sin(y * 0.18) * 3.3;
      const river = y < 23 && Math.abs(x - riverX) < 1.7;
      const bank = y < 24 && Math.abs(x - riverX) < 2.8;
      return {
        terrain: river ? "water" : bank ? "sand" : "grass",
        variant: Math.floor(rng() * 8),
        height: 0,
      };
    }),
  );
  const paint = (
    x: number,
    y: number,
    w: number,
    h: number,
    terrain: Terrain,
  ) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (tiles[yy]?.[xx])
          tiles[yy][xx].terrain =
            terrain === "dirt" && tiles[yy][xx].terrain === "water"
              ? "bridge"
              : terrain;
  };
  paint(14, 21, 22, 2, "dirt");
  paint(25, 12, 2, 21, "dirt");
  paint(18, 16, 2, 15, "dirt");
  paint(18, 15, 12, 2, "dirt");
  paint(18, 26, 14, 2, "dirt");
  paint(20, 21, 7, 5, "dirt");
  paint(33, 12, 6, 2, "bridge");
  const state: ClanWorld = {
    version: 2,
    seed,
    width: CLAN_WORLD_WIDTH,
    height: CLAN_WORLD_HEIGHT,
    tiles,
    objects: [],
    buildings: [],
    units: [],
    resources: { timber: 180, stone: 110, food: 140, iron: 20, gold: 85 },
    elapsed: 0,
    day: 1,
    population: 13,
    maxPopulation: 16,
    happiness: 86,
    logs: [],
    nextId: 1000,
    rallyUntil: 0,
    equippedDoctrine: null,
    stats: {
      gathered: 0,
      built: 0,
      recruited: 0,
      goldProgress: 0,
      foodProgress: 0,
    },
  };
  const addBuilding = (
    id: string,
    kind: BuildingKind,
    x: number,
    y: number,
  ) => {
    const spec = BUILDING_SPECS[kind];
    state.buildings.push({
      id,
      kind,
      x,
      y,
      w: spec.w,
      h: spec.h,
      progress: 1,
      hp: 100,
      stock: kind === "farm" ? 250 : 0,
    });
    paint(x, y, spec.w, spec.h, kind === "farm" ? "farm" : "dirt");
  };
  addBuilding("hall", "hall", 21, 18);
  addBuilding("house-west", "house", 15, 17);
  addBuilding("house-east", "house", 27, 17);
  addBuilding("house-south", "house", 20, 24);
  addBuilding("lumber-lodge", "lumber", 13, 24);
  addBuilding("quarry-lodge", "mine", 30, 23);
  addBuilding("wheat-field", "farm", 22, 28);
  addBuilding("village-well", "well", 24, 24);
  addBuilding("north-watch", "watchtower", 29, 11);
  const buildingNear = (x: number, y: number, margin = 1) =>
    state.buildings.some(
      (building) =>
        x >= building.x - margin &&
        y >= building.y - margin &&
        x < building.x + building.w + margin &&
        y < building.y + building.h + margin,
    );
  const addObject = (kind: ObjectKind, x: number, y: number, stock: number) => {
    if (
      tiles[y]?.[x]?.terrain !== "grass" ||
      buildingNear(x, y) ||
      state.objects.some(
        (object) => Math.floor(object.x) === x && Math.floor(object.y) === y,
      )
    )
      return;
    state.objects.push({
      id: `resource-${state.objects.length}`,
      kind,
      x: x + 0.5,
      y: y + 0.5,
      stock,
      maxStock: stock,
      variant: Math.floor(rng() * 4),
    });
  };
  for (let y = 2; y < 38; y++)
    for (let x = 2; x < 46; x++) {
      const westGrove = x < 14 && y > 8 && y < 29;
      const northGrove = y < 11 && x < 31;
      const southGrove = y > 32;
      const eastGrove = x > 39;
      const edge = x < 4 || y < 4 || x > 44 || y > 36;
      const chance = westGrove
        ? 0.36
        : northGrove
          ? 0.33
          : southGrove
            ? 0.24
            : eastGrove
              ? 0.3
              : edge
                ? 0.4
                : 0.023;
      if (rng() < chance)
        addObject(
          rng() < 0.2 ? "oak" : rng() < 0.35 ? "pine" : "tree",
          x,
          y,
          75 + Math.floor(rng() * 75),
        );
    }
  for (const [x, y] of [
    [32, 28],
    [34, 27],
    [34, 25],
    [36, 26],
    [33, 30],
    [35, 29],
    [31, 29],
    [37, 28],
  ])
    addObject("rock", x, y, 160);
  for (const [x, y] of [
    [35, 24],
    [37, 25],
    [36, 30],
  ])
    addObject("iron", x, y, 100);
  for (const [x, y] of [
    [16, 29],
    [17, 30],
    [15, 31],
    [28, 30],
    [28, 31],
    [29, 32],
  ])
    addObject("berry", x, y, 80);
  // These young trees guarantee an accessible first logging task near the village.
  for (const [x, y] of [
    [12, 19],
    [11, 20],
    [12, 22],
    [10, 22],
  ])
    addObject("tree", x, y, 100);
  const starts = [
    [23.5, 22.5],
    [17.5, 22.5],
    [19.5, 23.5],
    [25.5, 24.5],
    [28.5, 22.5],
    [26.5, 26.5],
    [20.5, 27.5],
    [17.5, 25.5],
    [29.5, 26.5],
    [22.5, 22.5],
    [25.5, 17.5],
    [18.5, 20.5],
    [27.5, 20.5],
  ];
  starts.forEach(([x, y], index) =>
    state.units.push(
      createUnit(
        state,
        index === 0 ? "Elder Aldric" : NAMES[index],
        index === 0 ? "elder" : index === 12 ? "guard" : "clansman",
        x,
        y,
        index,
      ),
    ),
  );
  state.maxPopulation = state.buildings.reduce(
    (count, building) => count + BUILDING_SPECS[building.kind].housing,
    0,
  );
  log(state, "The clan awaits Elder Aldric's orders.", "clan");
  const woods = state.objects
    .filter((object) => resourceForObject(object) === "timber")
    .sort(
      (a, b) => distance(a, { x: 14, y: 22 }) - distance(b, { x: 14, y: 22 }),
    );
  const rocks = state.objects.filter((object) => object.kind === "rock");
  for (const [index, object] of [
    [1, woods[0]],
    [2, woods[1]],
    [4, rocks[0]],
    [8, rocks[1]],
  ] as const)
    if (object)
      assignOrder(state, state.units[index], {
        type: "gather",
        targetId: object.id,
      });
  assignOrder(state, state.units[5], {
    type: "gather",
    targetId: "wheat-field",
  });
  assignOrder(state, state.units[6], {
    type: "gather",
    targetId: "wheat-field",
  });
  assignOrder(state, state.units[12], { type: "guard", x: 29.5, y: 15.5 });
  return state;
}

export function isClanWalkable(
  state: ClanWorld,
  x: number,
  y: number,
): boolean {
  const tx = Math.floor(x),
    ty = Math.floor(y);
  if (
    !finite(x) ||
    !finite(y) ||
    tx < 0 ||
    ty < 0 ||
    tx >= state.width ||
    ty >= state.height ||
    state.tiles[ty][tx].terrain === "water"
  )
    return false;
  if (
    state.buildings.some(
      (building) =>
        building.kind !== "farm" &&
        tx >= building.x &&
        ty >= building.y &&
        tx < building.x + building.w &&
        ty < building.y + building.h,
    )
  )
    return false;
  return !state.objects.some(
    (object) =>
      object.kind !== "stump" &&
      object.kind !== "reeds" &&
      Math.floor(object.x) === tx &&
      Math.floor(object.y) === ty,
  );
}

function walkableGrid(state: ClanWorld): Uint8Array {
  const grid = new Uint8Array(state.width * state.height).fill(1);
  for (let y = 0; y < state.height; y++)
    for (let x = 0; x < state.width; x++)
      if (state.tiles[y][x].terrain === "water") grid[key(x, y)] = 0;
  for (const building of state.buildings)
    if (building.kind !== "farm")
      for (let y = building.y; y < building.y + building.h; y++)
        for (let x = building.x; x < building.x + building.w; x++)
          grid[key(x, y)] = 0;
  for (const object of state.objects)
    if (object.kind !== "stump" && object.kind !== "reeds")
      grid[key(Math.floor(object.x), Math.floor(object.y))] = 0;
  return grid;
}

function adjacentPoints(
  state: ClanWorld,
  target: WorldObject | Building,
): Point[] {
  const x = Math.floor(target.x),
    y = Math.floor(target.y),
    w = "w" in target ? target.w : 1,
    h = "h" in target ? target.h : 1;
  const result: Point[] = [];
  for (let yy = y - 1; yy <= y + h; yy++)
    for (let xx = x - 1; xx <= x + w; xx++) {
      if (xx >= x && yy >= y && xx < x + w && yy < y + h) continue;
      if (isClanWalkable(state, xx, yy))
        result.push({ x: xx + 0.5, y: yy + 0.5 });
    }
  return result;
}

function closestWalkable(state: ClanWorld, target: Point): Point | null {
  if (!finite(target.x) || !finite(target.y)) return null;
  const x = Math.min(state.width - 1, Math.max(0, Math.floor(target.x))),
    y = Math.min(state.height - 1, Math.max(0, Math.floor(target.y)));
  for (let radius = 0; radius < 10; radius++) {
    const candidates: Point[] = [];
    for (let yy = y - radius; yy <= y + radius; yy++)
      for (let xx = x - radius; xx <= x + radius; xx++)
        if (
          (Math.abs(xx - x) === radius || Math.abs(yy - y) === radius) &&
          isClanWalkable(state, xx, yy)
        )
          candidates.push({ x: xx + 0.5, y: yy + 0.5 });
    if (candidates.length)
      return candidates.sort(
        (a, b) => distance(a, target) - distance(b, target),
      )[0];
  }
  return null;
}

class MinHeap {
  private items: { id: number; score: number }[] = [];
  get length() {
    return this.items.length;
  }
  push(id: number, score: number) {
    const item = { id, score };
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.items[p].score <= score) break;
      this.items[i] = this.items[p];
      i = p;
    }
    this.items[i] = item;
  }
  pop(): number {
    const first = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < this.items.length &&
          this.items[child + 1].score < this.items[child].score
        )
          child++;
        if (this.items[child].score >= last.score) break;
        this.items[i] = this.items[child];
        i = child;
      }
      this.items[i] = last;
    }
    return first.id;
  }
}

/** A* uses eight neighbors and rejects diagonal steps through blocked corners. */
export function findClanPath(
  state: ClanWorld,
  from: Point,
  to: Point,
): Point[] {
  const target = closestWalkable(state, to);
  if (!target || !finite(from.x) || !finite(from.y)) return [];
  const sx = Math.floor(from.x),
    sy = Math.floor(from.y),
    tx = Math.floor(target.x),
    ty = Math.floor(target.y);
  if (sx < 0 || sy < 0 || sx >= state.width || sy >= state.height) return [];
  const start = key(sx, sy),
    end = key(tx, ty);
  if (start === end) return distance(from, target) > 0.05 ? [target] : [];
  const grid = walkableGrid(state);
  const score = new Float64Array(grid.length).fill(Infinity);
  const parents = new Int32Array(grid.length).fill(-1);
  const closed = new Uint8Array(grid.length);
  const open = new MinHeap();
  score[start] = 0;
  open.push(start, distance(from, target));
  while (open.length) {
    const current = open.pop();
    if (closed[current]) continue;
    if (current === end) {
      const path: Point[] = [];
      let n = end;
      while (n !== start && n !== -1) {
        path.push({
          x: (n % state.width) + 0.5,
          y: Math.floor(n / state.width) + 0.5,
        });
        n = parents[n];
      }
      return path.reverse();
    }
    closed[current] = 1;
    const cx = current % state.width,
      cy = Math.floor(current / state.width);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = cx + dx,
          y = cy + dy;
        if (
          x < 0 ||
          y < 0 ||
          x >= state.width ||
          y >= state.height ||
          !grid[key(x, y)]
        )
          continue;
        if (dx && dy && (!grid[key(cx + dx, cy)] || !grid[key(cx, cy + dy)]))
          continue;
        const id = key(x, y),
          next = score[current] + (dx && dy ? Math.SQRT2 : 1);
        if (next >= score[id]) continue;
        parents[id] = current;
        score[id] = next;
        open.push(id, next + Math.hypot(x - tx, y - ty));
      }
  }
  return [];
}

function routeTo(state: ClanWorld, unit: ClanUnit, target: Point): boolean {
  const path = findClanPath(state, unit, target);
  const endpoint = closestWalkable(state, target);
  if (!endpoint || (!path.length && distance(unit, endpoint) > 0.15))
    return false;
  unit.path = path;
  unit.routeTarget = endpoint;
  return true;
}

function routeAdjacent(
  state: ClanWorld,
  unit: ClanUnit,
  target: WorldObject | Building,
): boolean {
  const points = adjacentPoints(state, target).sort((a, b) => {
    const occupied = (p: Point) =>
      state.units.filter(
        (other) =>
          other.id !== unit.id && distance(other.routeTarget ?? other, p) < 0.5,
      ).length * 3;
    return distance(unit, a) + occupied(a) - distance(unit, b) - occupied(b);
  });
  for (const point of points) if (routeTo(state, unit, point)) return true;
  return false;
}

function gatherTarget(
  state: ClanWorld,
  id: string,
): WorldObject | Building | undefined {
  return (
    state.objects.find(
      (object) =>
        object.id === id && object.stock > 0 && object.kind !== "stump",
    ) ??
    state.buildings.find(
      (building) =>
        building.id === id &&
        building.kind === "farm" &&
        building.progress >= 1 &&
        building.stock >= 1,
    )
  );
}

function targetResource(target: WorldObject | Building): ClanResource {
  return "w" in target ? "food" : resourceForObject(target);
}

function idle(unit: ClanUnit) {
  unit.order = null;
  unit.path = [];
  unit.routeTarget = null;
  unit.status = "idle";
  unit.phase = "idle";
  unit.workProgress = 0;
}

function completeOrder(state: ClanWorld, unit: ClanUnit) {
  idle(unit);
  const next = unit.queue.shift();
  if (next) assignOrder(state, unit, next);
}

function returnCargo(state: ClanWorld, unit: ClanUnit): boolean {
  const resource = unit.carrying?.resource;
  const stores = state.buildings
    .filter(
      (building) =>
        building.progress >= 1 &&
        (building.kind === "hall" ||
          building.kind === "storehouse" ||
          (resource === "timber" && building.kind === "lumber") ||
          ((resource === "stone" || resource === "iron") &&
            building.kind === "mine")),
    )
    .sort(
      (a, b) =>
        distance(unit, { x: a.x + a.w / 2, y: a.y + a.h / 2 }) -
        distance(unit, { x: b.x + b.w / 2, y: b.y + b.h / 2 }),
    );
  for (const store of stores)
    if (routeAdjacent(state, unit, store)) {
      unit.phase = "return";
      unit.status = "returning";
      return true;
    }
  idle(unit);
  log(state, `${unit.name} cannot reach a storehouse.`, "economy");
  return false;
}

function assignOrder(state: ClanWorld, unit: ClanUnit, order: ClanOrder) {
  unit.order = { ...order };
  unit.path = [];
  unit.routeTarget = null;
  unit.workProgress = 0;
  unit.wait = 0;
  if (order.type === "stop") {
    idle(unit);
    unit.queue = [];
    return;
  }
  if (
    order.type === "move" ||
    order.type === "guard" ||
    order.type === "rally"
  ) {
    if (routeTo(state, unit, order)) {
      unit.phase = "travel";
      unit.status = "walking";
    } else completeOrder(state, unit);
    return;
  }
  if (order.type === "return") {
    if (!returnCargo(state, unit)) completeOrder(state, unit);
    return;
  }
  if (order.type === "follow") {
    unit.phase = "travel";
    unit.status = "following";
    return;
  }
  if (order.type === "gather") {
    const target = gatherTarget(state, order.targetId);
    if (!target) {
      completeOrder(state, unit);
      return;
    }
    const resource = targetResource(target);
    unit.job =
      resource === "timber"
        ? "Woodcutter"
        : resource === "stone"
          ? "Stonecutter"
          : resource === "iron"
            ? "Miner"
            : "Farmer";
    if (unit.role === "elder") unit.job = "Elder";
    if (
      unit.carrying &&
      (unit.carrying.resource !== resource ||
        unit.carrying.amount >= CLAN_CARGO_CAPACITY)
    ) {
      returnCargo(state, unit);
      return;
    }
    if (routeAdjacent(state, unit, target)) {
      unit.phase = "travel";
      unit.status = "walking";
    } else completeOrder(state, unit);
    return;
  }
  if (order.type === "construct") {
    const building = state.buildings.find(
      (item) => item.id === order.targetId && item.progress < 1,
    );
    if (!building || !routeAdjacent(state, unit, building)) {
      completeOrder(state, unit);
      return;
    }
    unit.job = unit.role === "elder" ? "Elder" : "Builder";
    unit.phase = "travel";
    unit.status = "walking";
  }
}

export function canPlaceBuilding(
  state: ClanWorld,
  kind: BuildingKind,
  x: number,
  y: number,
): { ok: boolean; reason?: string } {
  const spec = BUILDING_SPECS[kind];
  if (!spec || !finite(x) || !finite(y))
    return { ok: false, reason: "Invalid site" };
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 1 || y < 1 || x + spec.w >= state.width || y + spec.h >= state.height)
    return { ok: false, reason: "Outside clan lands" };
  for (let yy = y; yy < y + spec.h; yy++)
    for (let xx = x; xx < x + spec.w; xx++) {
      if (
        !isClanWalkable(state, xx, yy) ||
        state.tiles[yy][xx].terrain === "bridge" ||
        state.buildings.some(
          (building) =>
            xx >= building.x &&
            yy >= building.y &&
            xx < building.x + building.w &&
            yy < building.y + building.h,
        )
      )
        return { ok: false, reason: "Site obstructed" };
      if (
        state.units.some(
          (unit) => Math.floor(unit.x) === xx && Math.floor(unit.y) === yy,
        )
      )
        return { ok: false, reason: "Clansmen in the way" };
    }
  for (const resource of RESOURCES)
    if (state.resources[resource] < (spec.cost[resource] ?? 0))
      return { ok: false, reason: `Need ${spec.cost[resource]} ${resource}` };
  const site: Building = {
    id: "preview",
    kind,
    x,
    y,
    w: spec.w,
    h: spec.h,
    progress: 0,
    hp: 100,
    stock: 0,
  };
  if (!adjacentPoints(state, site).length)
    return { ok: false, reason: "No access to site" };
  return { ok: true };
}

export function issueOrder(
  state: ClanWorld,
  ids: string[],
  order: ClanOrder,
  append = false,
): ClanWorld {
  const selectedIds = new Set(ids);
  if (!state.units.some((unit) => selectedIds.has(unit.id))) return state;
  if (
    (order.type === "move" ||
      order.type === "guard" ||
      order.type === "rally") &&
    (!finite(order.x) || !finite(order.y))
  )
    return state;
  const next = cloneWorld(state);
  const selected = next.units.filter((unit) => selectedIds.has(unit.id));
  let issuedOrder = order;
  if (order.type === "build") {
    const result = canPlaceBuilding(next, order.buildingKind, order.x, order.y);
    if (!result.ok) {
      log(next, result.reason ?? "Cannot build here", "build");
      return next;
    }
    const spec = BUILDING_SPECS[order.buildingKind];
    const building: Building = {
      id: `building-${next.nextId++}`,
      kind: order.buildingKind,
      x: Math.floor(order.x),
      y: Math.floor(order.y),
      w: spec.w,
      h: spec.h,
      progress: 0,
      hp: 100,
      stock: 0,
    };
    // Verify worker access with the new footprint before charging any resources.
    next.buildings.push(building);
    if (
      !selected.some((unit) =>
        adjacentPoints(next, building).some(
          (point) =>
            findClanPath(next, unit, point).length ||
            distance(unit, point) < 0.15,
        ),
      )
    ) {
      next.buildings.pop();
      log(next, "Builders cannot reach this site", "build");
      return next;
    }
    for (const resource of RESOURCES)
      next.resources[resource] -= spec.cost[resource] ?? 0;
    issuedOrder = { type: "construct", targetId: building.id };
    log(
      next,
      `${spec.name} founded. ${selected.length} builders assigned.`,
      "build",
    );
    // Existing routes are recalculated around the new foundation.
    for (const unit of next.units)
      if (unit.order && !selectedIds.has(unit.id))
        assignOrder(next, unit, unit.order);
  } else if (order.type === "rally") {
    next.rallyUntil = next.elapsed + 25;
    log(
      next,
      "The Elder rallies the clan. Work quickens for 25 seconds.",
      "clan",
    );
  } else if (order.type !== "stop") {
    const verb =
      order.type === "gather"
        ? "Gather"
        : order.type === "follow"
          ? "Follow the Elder"
          : order.type === "return"
            ? "Return supplies"
            : order.type === "guard"
              ? "Guard position"
              : "Move";
    log(
      next,
      `${verb}: ${selected.length} ${selected.length === 1 ? "clansman" : "clansmen"}`,
      "order",
    );
  }
  const reserved: Point[] = [];
  selected.forEach((unit, index) => {
    let personal = issuedOrder;
    if (
      issuedOrder.type === "move" ||
      issuedOrder.type === "guard" ||
      issuedOrder.type === "rally"
    ) {
      const offsets =
        index === 0
          ? [{ x: 0, y: 0 }]
          : Array.from({ length: 25 }, (_, n) => ({
              x: (n % 5) - 2,
              y: Math.floor(n / 5) - 2,
            })).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
      let destination: Point | null = null;
      for (const offset of offsets) {
        const candidate = closestWalkable(next, {
          x: issuedOrder.x + offset.x,
          y: issuedOrder.y + offset.y,
        });
        if (
          candidate &&
          !reserved.some((point) => distance(point, candidate) < 0.7)
        ) {
          destination = candidate;
          break;
        }
      }
      if (destination) {
        reserved.push(destination);
        personal = { ...issuedOrder, ...destination };
      }
    }
    if (append && unit.order && personal.type !== "stop") {
      if (unit.queue.length < 16) unit.queue.push({ ...personal });
    } else {
      unit.queue = [];
      assignOrder(next, unit, personal);
    }
  });
  return next;
}

export function elderWorkMultiplier(state: ClanWorld, unit: ClanUnit): number {
  const elder = state.units.find((member) => member.role === "elder");
  const radius = state.buildings.some(
    (building) => building.kind === "chapel" && building.progress >= 1,
  )
    ? 10
    : 6;
  const aura = elder && distance(elder, unit) <= radius ? 1.35 : 1;
  return aura * (state.rallyUntil > state.elapsed ? 1.3 : 1);
}

export function equipClanDoctrine(
  state: ClanWorld,
  doctrine: ClanDoctrine | null,
): ClanWorld {
  if (
    doctrine !== null &&
    !["industry", "harvest", "stewardship"].includes(doctrine)
  )
    return state;
  if (state.equippedDoctrine === doctrine) return state;
  return { ...state, equippedDoctrine: doctrine };
}

function face(unit: ClanUnit, target: Point) {
  const dx = target.x - unit.x,
    dy = target.y - unit.y;
  const angle = Math.atan2(dy, dx);
  const directions: ClanUnit["facing"][] = [
    "e",
    "se",
    "s",
    "sw",
    "w",
    "nw",
    "n",
    "ne",
  ];
  unit.facing = directions[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}

function walk(state: ClanWorld, unit: ClanUnit, seconds: number) {
  let budget =
    CLAN_WALK_SPEED *
    seconds *
    (unit.role === "elder" ? 0.95 : 1) *
    (unit.carrying
      ? 0.87 * (state.equippedDoctrine === "stewardship" ? 1.1 : 1)
      : 1);
  while (budget > 0 && unit.path.length) {
    const target = unit.path[0];
    if (!isClanWalkable(state, target.x, target.y)) {
      if (unit.routeTarget) routeTo(state, unit, unit.routeTarget);
      break;
    }
    const length = distance(unit, target);
    face(unit, target);
    if (length <= budget) {
      unit.x = target.x;
      unit.y = target.y;
      unit.path.shift();
      budget -= length;
    } else {
      unit.x += ((target.x - unit.x) / length) * budget;
      unit.y += ((target.y - unit.y) / length) * budget;
      budget = 0;
    }
  }
}

function retryGather(state: ClanWorld, unit: ClanUnit, depletedId: string) {
  if (unit.carrying?.amount) {
    returnCargo(state, unit);
    return;
  }
  if (unit.queue.length) {
    completeOrder(state, unit);
    return;
  }
  const previous = state.objects.find((object) => object.id === depletedId);
  if (!previous) {
    completeOrder(state, unit);
    return;
  }
  const candidates = state.objects
    .filter(
      (object) =>
        object.stock > 0 &&
        object.kind !== "stump" &&
        resourceForObject(object) === resourceForObject(previous),
    )
    .sort((a, b) => distance(unit, a) - distance(unit, b));
  for (const candidate of candidates.slice(0, 12)) {
    if (routeAdjacent(state, unit, candidate)) {
      unit.order = { type: "gather", targetId: candidate.id };
      unit.phase = "travel";
      unit.status = "walking";
      return;
    }
  }
  completeOrder(state, unit);
}

function advanceUnit(state: ClanWorld, unit: ClanUnit, seconds: number) {
  unit.wait = Math.max(0, unit.wait - seconds);
  const order = unit.order;
  if (!order) {
    unit.energy = Math.min(100, unit.energy + seconds * 1.8);
    return;
  }
  if (order.type === "follow") {
    const elder = state.units.find((member) => member.role === "elder");
    if (!elder || elder.id === unit.id) {
      completeOrder(state, unit);
      return;
    }
    if (distance(unit, elder) > 2.5 && unit.wait <= 0) {
      const offset = (unit.variant % 3) - 1;
      routeTo(state, unit, { x: elder.x + offset, y: elder.y + 1.5 });
      unit.wait = 0.8;
    }
    if (unit.path.length) {
      unit.status = "walking";
      walk(state, unit, seconds);
    } else {
      unit.status = "following";
      unit.energy = Math.min(100, unit.energy + seconds);
    }
    return;
  }
  if (unit.path.length) {
    walk(state, unit, seconds);
    return;
  }
  if (unit.phase === "return") {
    if (unit.carrying) {
      state.resources[unit.carrying.resource] += unit.carrying.amount;
      state.stats.gathered += unit.carrying.amount;
      unit.carrying = null;
    }
    unit.energy = Math.min(100, unit.energy + 12);
    if (order.type === "gather") {
      if (unit.queue.length) completeOrder(state, unit);
      else if (gatherTarget(state, order.targetId))
        assignOrder(state, unit, order);
      else retryGather(state, unit, order.targetId);
    } else completeOrder(state, unit);
    return;
  }
  if (order.type === "move" || order.type === "rally") {
    completeOrder(state, unit);
    return;
  }
  if (order.type === "guard") {
    unit.status = "guarding";
    unit.phase = "work";
    unit.energy = Math.min(100, unit.energy + seconds);
    if (unit.queue.length) completeOrder(state, unit);
    return;
  }
  if (order.type === "construct") {
    const building = state.buildings.find((item) => item.id === order.targetId);
    if (!building || building.progress >= 1) {
      completeOrder(state, unit);
      return;
    }
    unit.phase = "work";
    unit.status = "building";
    face(unit, {
      x: building.x + building.w / 2,
      y: building.y + building.h / 2,
    });
    building.progress = Math.min(
      1,
      building.progress +
        (seconds *
          elderWorkMultiplier(state, unit) *
          (state.equippedDoctrine === "industry" ? 1.2 : 1)) /
          BUILDING_SPECS[building.kind].work,
    );
    unit.workProgress += seconds * 2;
    if (building.progress >= 1) {
      state.stats.built++;
      state.maxPopulation += BUILDING_SPECS[building.kind].housing;
      building.stock = building.kind === "farm" ? 200 : 0;
      log(state, `${BUILDING_SPECS[building.kind].name} complete.`, "build");
      completeOrder(state, unit);
    }
    return;
  }
  if (order.type === "gather") {
    const target = gatherTarget(state, order.targetId);
    if (!target) {
      retryGather(state, unit, order.targetId);
      return;
    }
    unit.phase = "work";
    unit.status = "working";
    face(
      unit,
      "w" in target
        ? { x: target.x + target.w / 2, y: target.y + target.h / 2 }
        : target,
    );
    const resource = targetResource(target);
    const tools = state.buildings.some(
      (building) => building.kind === "forge" && building.progress >= 1,
    )
      ? 1.2
      : 1;
    const lodge =
      resource === "timber" &&
      state.buildings.some(
        (building) =>
          building.kind === "lumber" &&
          building.progress >= 1 &&
          distance(unit, {
            x: building.x + building.w / 2,
            y: building.y + building.h / 2,
          }) < 9,
      )
        ? 1.15
        : 1;
    const rate = resource === "iron" ? 0.8 : resource === "stone" ? 1.2 : 1.7;
    unit.workProgress +=
      seconds *
      rate *
      tools *
      lodge *
      elderWorkMultiplier(state, unit) *
      (state.equippedDoctrine === "harvest" ? 1.2 : 1) *
      (unit.energy < 20 ? 0.75 : 1);
    unit.energy = Math.max(10, unit.energy - seconds * 0.3);
    const amount = Math.min(
      Math.floor(unit.workProgress),
      Math.floor(target.stock),
      CLAN_CARGO_CAPACITY - (unit.carrying?.amount ?? 0),
    );
    if (amount > 0) {
      unit.workProgress -= amount;
      target.stock -= amount;
      unit.carrying = {
        resource,
        amount: (unit.carrying?.amount ?? 0) + amount,
      };
    }
    if (target.stock <= 0 && "maxStock" in target && resource === "timber")
      target.kind = "stump";
    if ((unit.carrying?.amount ?? 0) >= CLAN_CARGO_CAPACITY || target.stock < 1)
      returnCargo(state, unit);
  }
}

function separateUnits(state: ClanWorld) {
  for (let a = 0; a < state.units.length; a++)
    for (let b = a + 1; b < state.units.length; b++) {
      const first = state.units[a],
        second = state.units[b];
      const length = distance(first, second);
      if (length >= 0.34) continue;
      const dx = length < 0.001 ? 1 : (first.x - second.x) / length;
      const dy = length < 0.001 ? 0 : (first.y - second.y) / length;
      const push = (0.34 - length) / 2;
      for (const [unit, sign] of [
        [first, 1],
        [second, -1],
      ] as const) {
        const x = unit.x + dx * push * sign,
          y = unit.y + dy * push * sign;
        if (isClanWalkable(state, x, y)) {
          unit.x = x;
          unit.y = y;
        }
      }
    }
}

export function tickClan(state: ClanWorld, seconds: number): ClanWorld {
  if (!finite(seconds) || seconds <= 0) return state;
  const next = cloneWorld(state);
  let remaining = Math.min(seconds, 300);
  while (remaining > 0.000001) {
    const step = Math.min(remaining, 0.1);
    next.elapsed += step;
    next.day = 1 + Math.floor(next.elapsed / 240);
    for (const building of next.buildings)
      if (building.kind === "farm" && building.progress >= 1)
        building.stock = Math.min(250, building.stock + step * 0.6);
    for (const unit of next.units) advanceUnit(next, unit, step);
    separateUnits(next);
    next.stats.foodProgress += (step * next.population) / 90;
    if (next.stats.foodProgress >= 1) {
      const food = Math.floor(next.stats.foodProgress);
      next.resources.food = Math.max(0, next.resources.food - food);
      next.stats.foodProgress -= food;
    }
    const market = next.buildings.filter(
      (building) => building.kind === "market" && building.progress >= 1,
    ).length;
    next.stats.goldProgress += step * (0.035 + market * 0.18);
    if (next.stats.goldProgress >= 1) {
      next.resources.gold += Math.floor(next.stats.goldProgress);
      next.stats.goldProgress %= 1;
    }
    const tavern = next.buildings.some(
      (building) => building.kind === "tavern" && building.progress >= 1,
    );
    const targetHappiness = Math.min(
      100,
      (next.resources.food > 20 ? 86 : next.resources.food > 0 ? 64 : 35) +
        (tavern ? 12 : 0),
    );
    next.happiness += (targetHappiness - next.happiness) * step * 0.02;
    for (const unit of next.units)
      if (
        next.buildings.some(
          (building) =>
            building.kind === "well" &&
            building.progress >= 1 &&
            distance(unit, { x: building.x + 0.5, y: building.y + 0.5 }) < 4,
        )
      )
        unit.energy = Math.min(100, unit.energy + step * 0.8);
    remaining -= step;
  }
  return next;
}

export function recruitClansman(state: ClanWorld): ClanWorld {
  const next = cloneWorld(state);
  if (state.population >= state.maxPopulation) {
    log(next, "Build a cottage for more clansmen.", "clan");
    return next;
  }
  if (state.resources.food < 30 || state.resources.gold < 20) {
    log(next, "Recruitment needs 30 food and 20 gold.", "clan");
    return next;
  }
  const hall = next.buildings.find(
    (building) => building.kind === "hall" && building.progress >= 1,
  );
  if (!hall) return state;
  const spawn = adjacentPoints(next, hall).sort(
    (a, b) =>
      next.units.filter((unit) => distance(unit, a) < 1).length -
      next.units.filter((unit) => distance(unit, b) < 1).length,
  )[0];
  if (!spawn) return state;
  const index = next.nextId++;
  const name = NAMES[(next.units.length + next.stats.recruited) % NAMES.length];
  next.units.push(createUnit(next, name, "clansman", spawn.x, spawn.y, index));
  next.resources.food -= 30;
  next.resources.gold -= 20;
  next.population++;
  next.stats.recruited++;
  log(next, `${name} joins the clan.`, "clan");
  return next;
}

export function saveClanWorld(state: ClanWorld, storage: StorageLike): boolean {
  try {
    storage.setItem(CLAN_SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function validOrder(order: unknown): order is ClanOrder {
  if (!order || typeof order !== "object" || !("type" in order)) return false;
  const item = order as Record<string, unknown>;
  if (["return", "follow", "stop"].includes(String(item.type))) return true;
  if (["move", "guard", "rally"].includes(String(item.type)))
    return (
      finite(item.x) &&
      finite(item.y) &&
      item.x >= 0 &&
      item.y >= 0 &&
      item.x < CLAN_WORLD_WIDTH &&
      item.y < CLAN_WORLD_HEIGHT
    );
  if (["gather", "construct"].includes(String(item.type)))
    return typeof item.targetId === "string" && item.targetId.length < 100;
  return false;
}

/** Reject malformed saves rather than allowing stale paths or invalid map geometry. */
export function loadClanWorld(storage: StorageLike, seed = 7331): ClanWorld {
  const fresh = () => createClanWorld(seed);
  try {
    const raw = storage.getItem(CLAN_SAVE_KEY);
    if (!raw || raw.length > 2_000_000) return fresh();
    const data = JSON.parse(raw) as ClanWorld;
    if (
      data.version !== 2 ||
      data.width !== CLAN_WORLD_WIDTH ||
      data.height !== CLAN_WORLD_HEIGHT ||
      !finite(data.seed) ||
      !finite(data.elapsed) ||
      data.elapsed < 0 ||
      data.elapsed > 100_000_000
    )
      return fresh();
    if (
      !Array.isArray(data.tiles) ||
      data.tiles.length !== CLAN_WORLD_HEIGHT ||
      data.tiles.some(
        (row) =>
          !Array.isArray(row) ||
          row.length !== CLAN_WORLD_WIDTH ||
          row.some(
            (tile) =>
              !tile ||
              !["grass", "dirt", "water", "sand", "farm", "bridge"].includes(
                tile.terrain,
              ),
          ),
      )
    )
      return fresh();
    if (
      !Array.isArray(data.units) ||
      data.units.length < 1 ||
      data.units.length > 100 ||
      !Array.isArray(data.buildings) ||
      data.buildings.length > 150 ||
      !Array.isArray(data.objects) ||
      data.objects.length > 1500
    )
      return fresh();
    const validPoint = (point: Point) =>
      point &&
      finite(point.x) &&
      finite(point.y) &&
      point.x >= 0 &&
      point.y >= 0 &&
      point.x < CLAN_WORLD_WIDTH &&
      point.y < CLAN_WORLD_HEIGHT;
    if (
      data.buildings.some(
        (building) =>
          !validPoint(building) ||
          typeof building.id !== "string" ||
          building.id.length > 100 ||
          !Object.hasOwn(BUILDING_SPECS, building.kind) ||
          building.w !== BUILDING_SPECS[building.kind].w ||
          building.h !== BUILDING_SPECS[building.kind].h ||
          !finite(building.progress) ||
          building.progress < 0 ||
          building.progress > 1 ||
          building.x + building.w > data.width ||
          building.y + building.h > data.height ||
          !Number.isInteger(building.x) ||
          !Number.isInteger(building.y) ||
          !finite(building.hp) ||
          !finite(building.stock) ||
          building.stock < 0 ||
          building.stock > 250,
      )
    )
      return fresh();
    if (
      !data.buildings.some(
        (building) => building.kind === "hall" && building.progress === 1,
      )
    )
      return fresh();
    if (
      data.objects.some(
        (object) =>
          !validPoint(object) ||
          typeof object.id !== "string" ||
          ![
            "tree",
            "pine",
            "oak",
            "rock",
            "iron",
            "berry",
            "reeds",
            "stump",
          ].includes(object.kind) ||
          !finite(object.stock) ||
          !finite(object.maxStock) ||
          object.stock < 0 ||
          object.stock > object.maxStock ||
          object.maxStock > 10000,
      )
    )
      return fresh();
    if (
      !data.resources ||
      RESOURCES.some(
        (resource) =>
          !finite(data.resources[resource]) ||
          data.resources[resource] < 0 ||
          data.resources[resource] > 100_000_000,
      )
    )
      return fresh();
    if (
      data.units.some(
        (unit) =>
          !validPoint(unit) ||
          typeof unit.id !== "string" ||
          typeof unit.name !== "string" ||
          unit.name.length > 80 ||
          !["elder", "clansman", "guard"].includes(unit.role) ||
          !finite(unit.energy) ||
          !finite(unit.hp) ||
          (unit.order !== null && !validOrder(unit.order)) ||
          !Array.isArray(unit.queue) ||
          unit.queue.length > 16 ||
          !unit.queue.every(validOrder) ||
          !Array.isArray(unit.path) ||
          unit.path.length > 2000 ||
          !unit.path.every(validPoint) ||
          (unit.carrying !== null &&
            (!unit.carrying ||
              !RESOURCES.includes(unit.carrying.resource) ||
              !finite(unit.carrying.amount) ||
              unit.carrying.amount < 0 ||
              unit.carrying.amount > CLAN_CARGO_CAPACITY)) ||
          !["idle", "travel", "work", "return"].includes(unit.phase),
      )
    )
      return fresh();
    if (
      data.units.filter((unit) => unit.role === "elder").length !== 1 ||
      new Set(data.units.map((unit) => unit.id)).size !== data.units.length
    )
      return fresh();
    data.population = data.units.length;
    data.maxPopulation = data.buildings
      .filter((building) => building.progress >= 1)
      .reduce(
        (sum, building) => sum + BUILDING_SPECS[building.kind].housing,
        0,
      );
    data.day = 1 + Math.floor(data.elapsed / 240);
    for (const row of data.tiles)
      for (const tile of row) {
        tile.variant = finite(tile.variant)
          ? Math.abs(Math.floor(tile.variant)) % 8
          : 0;
        tile.height = finite(tile.height)
          ? Math.min(3, Math.max(0, tile.height))
          : 0;
      }
    data.happiness = finite(data.happiness)
      ? Math.max(0, Math.min(100, data.happiness))
      : 86;
    data.rallyUntil = finite(data.rallyUntil)
      ? Math.min(data.rallyUntil, data.elapsed + 25)
      : 0;
    const greatestId = Math.max(
      1000,
      ...[...data.units, ...data.buildings]
        .map((item) => Number(item.id.split("-").at(-1)))
        .filter(Number.isFinite),
    );
    data.nextId = finite(data.nextId)
      ? Math.max(greatestId + 1, Math.floor(data.nextId))
      : greatestId + 100;
    data.logs = Array.isArray(data.logs)
      ? data.logs
          .filter(
            (entry) =>
              typeof entry.text === "string" &&
              entry.text.length < 240 &&
              finite(entry.at) &&
              finite(entry.id),
          )
          .slice(-30)
      : [];
    data.stats =
      data.stats &&
      [
        data.stats.gathered,
        data.stats.built,
        data.stats.recruited,
        data.stats.goldProgress,
        data.stats.foodProgress,
      ].every((value) => finite(value) && value >= 0)
        ? data.stats
        : {
            gathered: 0,
            built: 0,
            recruited: 0,
            goldProgress: 0,
            foodProgress: 0,
          };
    data.equippedDoctrine = ["industry", "harvest", "stewardship"].includes(
      data.equippedDoctrine ?? "",
    )
      ? data.equippedDoctrine
      : null;
    for (const unit of data.units) {
      unit.energy = Math.min(100, Math.max(0, unit.energy));
      unit.hp = Math.min(100, Math.max(0, unit.hp));
      unit.workProgress = finite(unit.workProgress)
        ? Math.max(0, Math.min(10, unit.workProgress))
        : 0;
      unit.wait = 0;
      unit.variant = finite(unit.variant)
        ? Math.abs(Math.floor(unit.variant)) % 8
        : 0;
      if (!isClanWalkable(data, unit.x, unit.y)) {
        const point = closestWalkable(data, unit);
        if (!point) return fresh();
        unit.x = point.x;
        unit.y = point.y;
      }
      const order = unit.order;
      if (order) {
        if (unit.phase === "return") {
          if (!returnCargo(data, unit)) idle(unit);
        } else assignOrder(data, unit, order);
      } else idle(unit);
    }
    return data;
  } catch {
    return fresh();
  }
}
