import { describe, expect, it } from "vitest";
import {
  BUILDING_SPECS,
  CLAN_CARGO_CAPACITY,
  CLAN_SAVE_KEY,
  CLAN_WORLD_HEIGHT,
  CLAN_WORLD_WIDTH,
  canPlaceBuilding,
  createClanWorld,
  elderWorkMultiplier,
  equipClanDoctrine,
  findClanPath,
  isClanWalkable,
  isPlayerBuilding,
  issueOrder,
  loadClanWorld,
  recruitClansman,
  saveClanWorld,
  tickClan,
} from "./clan-sim";
import type { ClanWorld, WorldObject } from "./clan-sim";
import type { StorageLike } from "./types";

function storage(): StorageLike {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

function clearing(): ClanWorld {
  const world = createClanWorld(42);
  world.tiles = world.tiles.map((row) =>
    row.map((tile) => ({ ...tile, terrain: "grass" })),
  );
  world.objects = [];
  world.buildings = [
    {
      id: "hall",
      kind: "hall",
      x: 14,
      y: 5,
      w: 4,
      h: 3,
      progress: 1,
      hp: 100,
      stock: 0,
    },
  ];
  world.units = world.units
    .slice(0, 3)
    .map((unit, index) => ({
      ...unit,
      x: 4.5 + index,
      y: 5.5,
      order: null,
      queue: [],
      path: [],
      routeTarget: null,
      status: "idle",
      phase: "idle",
      carrying: null,
    }));
  world.units[0].x = 1.5;
  world.units[0].y = 1.5;
  world.population = 3;
  world.maxPopulation = 4;
  return world;
}

function tree(x: number, y: number, stock = 80): WorldObject {
  return {
    id: `tree-${x}-${y}`,
    kind: "tree",
    x,
    y,
    stock,
    maxStock: stock,
    variant: 0,
  };
}

describe("Elder's clan simulation", () => {
  it("starts a deterministic, populated village with reachable workers and an Elder", () => {
    const world = createClanWorld();
    expect(world).toEqual(createClanWorld());
    expect(world.tiles).toHaveLength(CLAN_WORLD_HEIGHT);
    expect(world.tiles.every((row) => row.length === CLAN_WORLD_WIDTH)).toBe(true);
    expect(world.units).toHaveLength(13);
    expect(world.units.filter((unit) => unit.role === "elder")).toHaveLength(1);
    expect(
      world.units.filter((unit) => unit.order?.type === "gather"),
    ).toHaveLength(6);
    expect(world.objects.length).toBeGreaterThan(150);
    for (const unit of world.units)
      expect(isClanWalkable(world, unit.x, unit.y), unit.name).toBe(true);
    const active = tickClan(world, 90);
    expect(active.stats.gathered).toBeGreaterThan(100);
    expect(world.stats.gathered).toBe(0);
    expect(active.resources.timber).toBeGreaterThan(world.resources.timber);
    expect(active.resources.stone).toBeGreaterThan(world.resources.stone);
    for (const unit of active.units)
      expect(
        isClanWalkable(active, unit.x, unit.y),
        `${unit.name}: ${unit.x},${unit.y}`,
      ).toBe(true);
  });

  it("connects seeded clan bases, both docks, and the monument without crossing terrain or structures", () => {
    for (const seed of [0, 1, 42, 7331, 99999]) {
      const world = createClanWorld(seed);
      const elder = world.units[0];
      expect(world.regions.map((region) => region.id)).toEqual([
        "forest", "mountains", "unicorn-town", "west-farms", "east-farms", "west-docks", "east-docks", "deep-sea",
      ]);
      expect(world.clans).toHaveLength(8);
      expect(new Set(world.clans.map((clan) => `${clan.base.x},${clan.base.y}`)).size).toBe(8);
      expect(world.maxPopulation).toBe(16);
      const destinations = [
        ...world.clans.map((clan) => clan.base),
        { x: 29.5, y: 87.5 }, { x: 82.5, y: 87.5 },
        { x: world.monument.x + 2.5, y: world.monument.y + world.monument.h + 0.5 },
      ];
      for (const destination of destinations) {
        expect(isClanWalkable(world, destination.x, destination.y), `${seed}: ${JSON.stringify(destination)}`).toBe(true);
        const path = findClanPath(world, elder, destination);
        if (destination.x !== elder.x || destination.y !== elder.y) expect(path.length).toBeGreaterThan(0);
        let previous = elder;
        for (const point of path) {
          expect(isClanWalkable(world, point.x, point.y)).toBe(true);
          if (point.x !== previous.x && point.y !== previous.y) {
            expect(isClanWalkable(world, previous.x, point.y)).toBe(true);
            expect(isClanWalkable(world, point.x, previous.y)).toBe(true);
          }
          previous = { ...elder, ...point };
        }
      }
      expect(isClanWalkable(world, world.monument.x + 0.5, world.monument.y + 0.5)).toBe(false);
      for (const terrain of ["water", "mountain", "snow"] as const) {
        const y = world.tiles.findIndex((row) => row.some((tile) => tile.terrain === terrain));
        const x = world.tiles[y].findIndex((tile) => tile.terrain === terrain);
        expect(isClanWalkable(world, x + 0.5, y + 0.5)).toBe(false);
        expect(canPlaceBuilding(world, "well", x, y).ok).toBe(false);
      }
    }
    expect(createClanWorld(1).clans.map((clan) => clan.base)).not.toEqual(createClanWorld(2).clans.map((clan) => clan.base));
  });

  it("keeps neighboring settlements separate from player housing, storage, and production bonuses", () => {
    const world = createClanWorld();
    const own = world.buildings.filter((building) => isPlayerBuilding(world, building));
    expect(own).toHaveLength(9);
    const noNeighbors = { ...world, buildings: own };
    const withNeighbors = tickClan(world, 20);
    const withoutNeighbors = tickClan(noNeighbors, 20);
    expect(withNeighbors.resources).toEqual(withoutNeighbors.resources);
    expect(withNeighbors.happiness).toBe(withoutNeighbors.happiness);
    expect(withNeighbors.maxPopulation).toBe(withoutNeighbors.maxPopulation);
  });

  it("keeps randomized bases inside eligible jurisdictions with nonoverlapping building footprints", () => {
    for (let seed = 0; seed < 32; seed++) {
      const world = createClanWorld(seed);
      for (const clan of world.clans) {
        const region = world.regions.find((item) => item.id === clan.regionId)!;
        expect(["sea", "town"]).not.toContain(region.theme);
        expect(clan.base.x).toBeGreaterThanOrEqual(region.bounds.x);
        expect(clan.base.x).toBeLessThan(region.bounds.x + region.bounds.w);
        expect(clan.base.y).toBeGreaterThanOrEqual(region.bounds.y);
        expect(clan.base.y).toBeLessThan(region.bounds.y + region.bounds.h);
        expect(isClanWalkable(world, clan.base.x, clan.base.y)).toBe(true);
        expect(world.buildings.some((building) => building.clanId === clan.id && building.kind === "hall")).toBe(true);
      }
      const occupied = new Set<string>();
      for (const building of world.buildings)
        for (let y = building.y; y < building.y + building.h; y++)
          for (let x = building.x; x < building.x + building.w; x++) {
            expect(occupied.has(`${x},${y}`), `seed ${seed}, ${building.id}`).toBe(false);
            expect(["water", "mountain", "snow"]).not.toContain(world.tiles[y][x].terrain);
            occupied.add(`${x},${y}`);
          }
    }
  });

  it("migrates a saved 48 by 40 village without losing workers, resources, construction, or time", () => {
    const village = clearing();
    village.width = 48;
    village.height = 40;
    village.tiles = village.tiles.slice(0, 40).map((row) => row.slice(0, 48));
    village.elapsed = 321;
    village.resources.gold = 1245;
    village.stats.built = 7;
    village.units[1].carrying = { resource: "timber", amount: 4 };
    village.objects.push(tree(8.5, 10.5, 33));
    village.buildings.push({ id: "building-1099", kind: "house", x: 35, y: 28, w: 3, h: 2, progress: 0.65, hp: 100, stock: 0 });
    const oldSave = { ...village } as Partial<ClanWorld>;
    delete oldSave.regions;
    delete oldSave.clans;
    delete oldSave.monument;
    const memory = storage();
    memory.setItem(CLAN_SAVE_KEY, JSON.stringify(oldSave));
    const restored = loadClanWorld(memory);
    expect(restored.width).toBe(CLAN_WORLD_WIDTH);
    expect(restored.height).toBe(CLAN_WORLD_HEIGHT);
    expect(restored.elapsed).toBe(321);
    expect(restored.resources).toEqual(village.resources);
    expect(restored.stats.built).toBe(7);
    expect(restored.units.map((unit) => unit.id)).toEqual(village.units.map((unit) => unit.id));
    expect(restored.units[1].carrying).toEqual({ resource: "timber", amount: 4 });
    expect(restored.buildings.find((building) => building.id === "building-1099")?.progress).toBe(0.65);
    expect(restored.objects.find((object) => object.id === "tree-8.5-10.5")?.stock).toBe(33);
    expect(new Set(restored.objects.map((object) => object.id)).size).toBe(restored.objects.length);
    expect(restored.maxPopulation).toBe(4);
    saveClanWorld(restored, memory);
    const again = loadClanWorld(memory);
    expect(again.clans.find((clan) => clan.player)?.base).toEqual(restored.clans.find((clan) => clan.player)?.base);
    expect(again.resources).toEqual(restored.resources);
  });

  it("continues active gathering and delivery after upgrading an original-size saved village", () => {
    const active = tickClan(createClanWorld(), 12);
    const legacy = {
      ...active,
      width: 48,
      height: 40,
      tiles: active.tiles.slice(0, 40).map((row) => row.slice(0, 48)),
      buildings: active.buildings.filter((building) => isPlayerBuilding(active, building)),
      objects: active.objects.filter((object) => object.x < 48 && object.y < 40),
    } as Partial<ClanWorld>;
    delete legacy.regions;
    delete legacy.clans;
    delete legacy.monument;
    const memory = storage();
    memory.setItem(CLAN_SAVE_KEY, JSON.stringify(legacy));
    const migrated = loadClanWorld(memory);
    expect(migrated.elapsed).toBeCloseTo(12);
    expect(migrated.resources).toEqual(active.resources);
    const later = tickClan(migrated, 90);
    expect(later.stats.gathered).toBeGreaterThan(migrated.stats.gathered);
    expect(later.resources.timber).toBeGreaterThan(migrated.resources.timber);
    expect(later.resources.stone).toBeGreaterThan(migrated.resources.stone);
    for (const unit of later.units) expect(isClanWalkable(later, unit.x, unit.y)).toBe(true);
  });

  it("routes across the only bridge and never cuts a blocked diagonal corner", () => {
    const world = clearing();
    for (let y = 0; y < world.height; y++) world.tiles[y][10].terrain = "water";
    world.tiles[9][10].terrain = "bridge";
    const path = findClanPath(world, { x: 5.5, y: 4.5 }, { x: 20.5, y: 4.5 });
    expect(path).toContainEqual({ x: 10.5, y: 9.5 });
    expect(path.at(-1)).toEqual({ x: 20.5, y: 4.5 });
    let previous = { x: 5.5, y: 4.5 };
    for (const point of path) {
      expect(isClanWalkable(world, point.x, point.y)).toBe(true);
      if (point.x !== previous.x && point.y !== previous.y) {
        expect(isClanWalkable(world, previous.x, point.y)).toBe(true);
        expect(isClanWalkable(world, point.x, previous.y)).toBe(true);
      }
      previous = point;
    }
    world.tiles[9][10].terrain = "water";
    expect(
      findClanPath(world, { x: 5.5, y: 4.5 }, { x: 20.5, y: 4.5 }),
    ).toEqual([]);
  });

  it("prevents separation from pushing workers through blocked diagonal corners", () => {
    const world = clearing();
    world.units[1].x = 5.99;
    world.units[1].y = 5.99;
    world.units[2].x = 5.90;
    world.units[2].y = 5.90;
    world.tiles[5][6].terrain = "water";
    world.objects.push(tree(5.5, 6.5));
    const separated = tickClan(world, 0.1);
    expect(separated.units[1].x).toBeLessThan(6);
    expect(separated.units[1].y).toBeLessThan(6);
    for (const unit of separated.units) expect(isClanWalkable(separated, unit.x, unit.y)).toBe(true);
  });

  it("repairs a live diagonal path when an adjacent corner becomes blocked", () => {
    let world = clearing();
    world.units = [world.units[0], { ...world.units[1], x: 5.5, y: 5.5 }];
    const id = world.units[1].id;
    world = issueOrder(world, [id], { type: "move", x: 8.5, y: 8.5 });
    expect(world.units[1].path[0]).toEqual({ x: 6.5, y: 6.5 });
    world.objects.push(tree(6.5, 5.5), tree(5.5, 6.5));
    let previous = { ...world.units[1] };
    for (let i = 0; i < 150; i++) {
      world = tickClan(world, 0.1);
      const unit = world.units[1];
      expect(isClanWalkable(world, unit.x, unit.y)).toBe(true);
      if (Math.floor(unit.x) !== Math.floor(previous.x) && Math.floor(unit.y) !== Math.floor(previous.y)) {
        expect(isClanWalkable(world, unit.x, previous.y)).toBe(true);
        expect(isClanWalkable(world, previous.x, unit.y)).toBe(true);
      }
      previous = { ...unit };
    }
    expect(world.units[1].x).toBeCloseTo(8.5);
    expect(world.units[1].y).toBeCloseTo(8.5);
  });

  it("reroutes workers around a new foundation before construction begins", () => {
    let world = clearing();
    const walker = world.units[1].id, builder = world.units[2].id;
    world = issueOrder(world, [walker], { type: "move", x: 23.5, y: 5.5 });
    expect(world.units[1].path).toContainEqual({ x: 9.5, y: 5.5 });
    world = issueOrder(world, [builder], { type: "build", buildingKind: "house", x: 8, y: 5 });
    expect(world.buildings.find((building) => building.x === 8 && building.y === 5)?.progress).toBe(0);
    for (const point of world.units[1].path) expect(isClanWalkable(world, point.x, point.y)).toBe(true);
    for (let i = 0; i < 180; i++) {
      world = tickClan(world, 0.1);
      for (const unit of world.units) expect(isClanWalkable(world, unit.x, unit.y)).toBe(true);
    }
    expect(world.units[1].x).toBeCloseTo(23.5);
    expect(world.units[1].y).toBeCloseTo(5.5);
  });

  it("walks around a building and stops immediately when ordered", () => {
    const initial = clearing();
    const id = initial.units[1].id;
    const moving = issueOrder(initial, [id], { type: "move", x: 20.5, y: 6.5 });
    expect(initial.units[1].order).toBeNull();
    expect(moving.units[1].path.length).toBeGreaterThan(10);
    const walked = tickClan(moving, 2);
    expect(walked.units[1].x).toBeGreaterThan(initial.units[1].x);
    expect(walked.units[1].x).toBeLessThan(10);
    const stopped = issueOrder(walked, [id], { type: "stop" });
    expect(stopped.units[1].status).toBe("idle");
    expect(stopped.units[1].path).toEqual([]);
    expect(tickClan(stopped, 10).units[1].x).toBe(stopped.units[1].x);
    const arrived = tickClan(moving, 30);
    expect(arrived.units[1].x).toBeCloseTo(20.5);
    expect(arrived.units[1].y).toBeCloseTo(6.5);
    expect(arrived.units[1].order).toBeNull();
  });

  it("queues waypoints in order and separates the destinations of group commands", () => {
    let world = clearing();
    const id = world.units[1].id;
    world = issueOrder(world, [id], { type: "move", x: 8.5, y: 5.5 });
    world = issueOrder(world, [id], { type: "move", x: 8.5, y: 11.5 }, true);
    expect(world.units[1].queue).toHaveLength(1);
    const firstLeg = tickClan(world, 1);
    expect(firstLeg.units[1].y).toBe(5.5);
    const arrived = tickClan(world, 15);
    expect(arrived.units[1].x).toBeCloseTo(8.5);
    expect(arrived.units[1].y).toBeCloseTo(11.5);
    expect(arrived.units[1].queue).toHaveLength(0);
    const formation = issueOrder(
      world,
      world.units.map((unit) => unit.id),
      { type: "move", x: 22.5, y: 18.5 },
    );
    const destinations = formation.units.map((unit) =>
      JSON.stringify(unit.routeTarget),
    );
    expect(new Set(destinations).size).toBe(3);
  });

  it("gathers finite cargo, visibly carries it to storage, deposits it, and repeats", () => {
    let world = clearing();
    world.objects.push(tree(8.5, 5.5));
    const id = world.units[1].id;
    world = issueOrder(world, [id], {
      type: "gather",
      targetId: world.objects[0].id,
    });
    const working = tickClan(world, 4);
    expect(working.units[1].status).toBe("working");
    expect(working.units[1].carrying?.amount).toBeGreaterThan(0);
    expect(working.resources.timber).toBe(world.resources.timber);
    const returning = tickClan(world, 8);
    expect(returning.units[1].status).toBe("returning");
    expect(returning.units[1].carrying?.amount).toBe(CLAN_CARGO_CAPACITY);
    const deposited = tickClan(world, 40);
    expect(deposited.resources.timber).toBeGreaterThanOrEqual(
      world.resources.timber + 20,
    );
    expect(deposited.objects[0].stock).toBeLessThanOrEqual(60);
    expect(world.objects[0].stock).toBe(80);
    expect(deposited.units[1].order?.type).toBe("gather");
    expect(
      deposited.resources.timber -
        world.resources.timber +
        (deposited.units[1].carrying?.amount ?? 0),
    ).toBe(world.objects[0].stock - deposited.objects[0].stock);
  });

  it("finishes partial loads from depleted trees and advances a queued order after delivery", () => {
    let world = clearing();
    world.objects.push(tree(8.5, 5.5, 3));
    const id = world.units[1].id;
    world = issueOrder(world, [id], {
      type: "gather",
      targetId: world.objects[0].id,
    });
    world = issueOrder(world, [id], { type: "move", x: 4.5, y: 12.5 }, true);
    const ended = tickClan(world, 30);
    expect(ended.resources.timber).toBe(world.resources.timber + 3);
    expect(ended.objects[0].kind).toBe("stump");
    expect(ended.objects[0].stock).toBe(0);
    expect(ended.units[1].x).toBeCloseTo(4.5);
    expect(ended.units[1].y).toBeCloseTo(12.5);
    expect(ended.units[1].carrying).toBeNull();
  });

  it("preserves the cargo type when an obstructed store prevents changing work", () => {
    let world = clearing();
    for (let y = 0; y < world.height; y++) world.tiles[y][10].terrain = "water";
    world.objects.push({ ...tree(8.5, 5.5), kind: "rock" });
    const id = world.units[1].id;
    world.units[1].carrying = { resource: "timber", amount: 4 };
    world = issueOrder(world, [id], {
      type: "gather",
      targetId: world.objects[0].id,
    });
    expect(world.units[1].status).toBe("idle");
    expect(world.logs.at(-1)?.text).toContain("cannot reach a storehouse");
    const waiting = tickClan(world, 20);
    expect(waiting.units[1].carrying).toEqual({
      resource: "timber",
      amount: 4,
    });
    expect(waiting.objects[0].stock).toBe(80);
    expect(waiting.resources.stone).toBe(world.resources.stone);
    waiting.buildings.push({
      id: "local-store",
      kind: "storehouse",
      x: 1,
      y: 9,
      w: 3,
      h: 2,
      progress: 1,
      hp: 100,
      stock: 0,
    });
    const restarted = issueOrder(waiting, [id], {
      type: "gather",
      targetId: waiting.objects[0].id,
    });
    const recovered = tickClan(restarted, 40);
    expect(recovered.resources.timber).toBe(waiting.resources.timber + 4);
    expect(recovered.resources.stone).toBeGreaterThan(waiting.resources.stone);
  });

  it("charges one foundation once and requires workers to reach and construct it", () => {
    const initial = clearing();
    const ids = initial.units.slice(1).map((unit) => unit.id);
    const order = {
      type: "build",
      buildingKind: "house",
      x: 8,
      y: 10,
    } as const;
    expect(canPlaceBuilding(initial, "house", 8, 10).ok).toBe(true);
    const founded = issueOrder(initial, ids, order);
    expect(founded.resources.timber).toBe(initial.resources.timber - 45);
    expect(founded.resources.stone).toBe(initial.resources.stone - 15);
    expect(founded.buildings).toHaveLength(2);
    expect(founded.buildings[1].progress).toBe(0);
    const repeated = issueOrder(founded, ids, order);
    expect(repeated.resources).toEqual(founded.resources);
    expect(repeated.buildings).toHaveLength(2);
    const early = tickClan(founded, 1);
    expect(early.buildings[1].progress).toBe(0);
    const done = tickClan(founded, 40);
    expect(done.buildings[1].progress).toBe(1);
    expect(done.maxPopulation).toBe(initial.maxPopulation + 4);
    expect(done.stats.built).toBe(1);
    expect(tickClan(done, 40).maxPopulation).toBe(done.maxPopulation);
    expect(done.units.slice(1).every((unit) => unit.status === "idle")).toBe(
      true,
    );
  });

  it("rejects obstructed and unaffordable sites without spending resources", () => {
    const world = clearing();
    expect(canPlaceBuilding(world, "house", 14, 5).reason).toBe(
      "Site obstructed",
    );
    expect(canPlaceBuilding(world, "house", 5, 5).reason).toBe(
      "Clansmen in the way",
    );
    world.resources.timber = 0;
    const rejected = issueOrder(world, [world.units[1].id], {
      type: "build",
      buildingKind: "house",
      x: 8,
      y: 10,
    });
    expect(rejected.resources).toEqual(world.resources);
    expect(rejected.buildings).toHaveLength(1);
    expect(rejected.logs.at(-1)?.text).toContain("timber");
  });

  it("validates every foundation tile and keeps a one-tile border at the map edge", () => {
    const world = clearing();
    expect(canPlaceBuilding(world, "house", world.width - 4, world.height - 3).ok).toBe(true);
    expect(canPlaceBuilding(world, "house", world.width - 3, world.height - 3).reason).toBe("Outside clan lands");
    expect(canPlaceBuilding(world, "house", 0, 10).reason).toBe("Outside clan lands");
    world.tiles[world.height - 2][world.width - 2].terrain = "water";
    expect(canPlaceBuilding(world, "house", world.width - 4, world.height - 3).reason).toBe("Site obstructed");
    world.tiles[world.height - 2][world.width - 2].terrain = "bridge";
    expect(canPlaceBuilding(world, "house", world.width - 4, world.height - 3).reason).toBe("Site obstructed");
  });

  it("makes Elder position and equipped charters change real production", () => {
    const world = clearing();
    const unit = world.units[1];
    expect(elderWorkMultiplier(world, unit)).toBe(1.35);
    world.units[0].x = 40.5;
    world.units[0].y = 30.5;
    expect(elderWorkMultiplier(world, unit)).toBe(1);
    const rallied = issueOrder(world, [unit.id], {
      type: "rally",
      x: 8.5,
      y: 6.5,
    });
    expect(elderWorkMultiplier(rallied, rallied.units[1])).toBe(1.3);
    expect(elderWorkMultiplier(tickClan(rallied, 26), rallied.units[1])).toBe(
      1,
    );
    world.objects.push(tree(7.5, 5.5));
    const gathering = issueOrder(world, [unit.id], {
      type: "gather",
      targetId: world.objects[0].id,
    });
    const regular = tickClan(gathering, 4);
    const harvest = tickClan(equipClanDoctrine(gathering, "harvest"), 4);
    expect(harvest.objects[0].stock).toBeLessThan(regular.objects[0].stock);
    const construction = issueOrder(world, [unit.id], {
      type: "build",
      buildingKind: "house",
      x: 8,
      y: 10,
    });
    const normalBuild = tickClan(construction, 12);
    const industry = tickClan(equipClanDoctrine(construction, "industry"), 12);
    expect(industry.buildings[1].progress).toBeCloseTo(
      normalBuild.buildings[1].progress * 1.2,
      6,
    );
  });

  it("requires both housing capacity and food and gold to recruit", () => {
    const world = clearing();
    const recruited = recruitClansman(world);
    expect(recruited.population).toBe(4);
    expect(recruited.resources.food).toBe(world.resources.food - 30);
    expect(recruited.resources.gold).toBe(world.resources.gold - 20);
    expect(recruited.units).toHaveLength(4);
    expect(recruitClansman(recruited).units).toHaveLength(4);
    world.resources.gold = 0;
    expect(recruitClansman(world).units).toHaveLength(3);
  });

  it("saves a live economy, repairs transient paths, and rejects malformed saves", () => {
    const memory = storage();
    const active = equipClanDoctrine(
      tickClan(createClanWorld(), 10),
      "harvest",
    );
    expect(saveClanWorld(active, memory)).toBe(true);
    const restored = loadClanWorld(memory);
    expect(restored.resources).toEqual(active.resources);
    expect(restored.elapsed).toBeCloseTo(active.elapsed);
    expect(restored.equippedDoctrine).toBe("harvest");
    expect(restored.units.map((unit) => unit.carrying)).toEqual(
      active.units.map((unit) => unit.carrying),
    );
    expect(tickClan(restored, 60).stats.gathered).toBeGreaterThan(
      restored.stats.gathered,
    );
    memory.setItem(
      CLAN_SAVE_KEY,
      JSON.stringify({
        ...active,
        units: [{ ...active.units[0], path: [{ x: 5000, y: 0 }] }],
      }),
    );
    expect(loadClanWorld(memory).elapsed).toBe(0);
    memory.setItem(CLAN_SAVE_KEY, "broken");
    expect(loadClanWorld(memory).elapsed).toBe(0);
    expect(
      saveClanWorld(active, {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      }),
    ).toBe(false);
  });

  it("ignores invalid time, bounds long background ticks, and preserves nonnegative stocks", () => {
    const world = createClanWorld();
    expect(tickClan(world, NaN)).toBe(world);
    expect(tickClan(world, -1)).toBe(world);
    const later = tickClan(world, 86400);
    expect(later.elapsed).toBeCloseTo(300, 6);
    expect(
      Object.values(later.resources).every(
        (value) => Number.isFinite(value) && value >= 0,
      ),
    ).toBe(true);
    expect(
      later.objects.every(
        (object) => object.stock >= 0 && object.stock <= object.maxStock,
      ),
    ).toBe(true);
    expect(
      later.units.every(
        (unit) => !unit.carrying || unit.carrying.amount <= CLAN_CARGO_CAPACITY,
      ),
    ).toBe(true);
    expect(BUILDING_SPECS.house.housing).toBe(4);
  });
});
