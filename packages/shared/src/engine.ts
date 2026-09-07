import { CARD_BY_ID, DECK_SIZE, MAX_CREW, STARTER_DECK } from "./cards";
import type { Card, GameEvent, GameState, Resource, Site } from "./types";

export const EXPEDITION_SECONDS = 180;
export const WORLD_WIDTH = 1200;
export const WORLD_HEIGHT = 760;
export const HERO_SPEED = 185;
export const SITES: Site[] = [
  {
    id: "home",
    name: "Hearthcamp",
    kind: "camp",
    x: 270,
    y: 530,
    stock: 0,
    maxStock: 0,
    owner: "player",
    danger: 0,
  },
  {
    id: "grove",
    name: "Whispering Grove",
    kind: "wood",
    x: 260,
    y: 300,
    stock: 38,
    maxStock: 38,
    owner: "neutral",
    danger: 0,
  },
  {
    id: "quarry",
    name: "Ironroot Quarry",
    kind: "stone",
    x: 780,
    y: 520,
    stock: 32,
    maxStock: 32,
    owner: "neutral",
    danger: 0,
  },
  {
    id: "spring",
    name: "Moonwell",
    kind: "essence",
    x: 880,
    y: 275,
    stock: 25,
    maxStock: 25,
    owner: "neutral",
    danger: 1,
  },
  {
    id: "ruins",
    name: "Elder Ruins",
    kind: "ruins",
    x: 610,
    y: 250,
    stock: 28,
    maxStock: 28,
    owner: "neutral",
    danger: 2,
  },
  {
    id: "shrine",
    name: "Worldheart",
    kind: "shrine",
    x: 600,
    y: 390,
    stock: 100,
    maxStock: 100,
    owner: "neutral",
    danger: 2,
  },
  {
    id: "rival",
    name: "Ashclaw Camp",
    kind: "camp",
    x: 980,
    y: 150,
    stock: 0,
    maxStock: 0,
    owner: "rival",
    danger: 3,
  },
];

const resourceValue: Record<Resource, number> = {
  wood: 1,
  stone: 2,
  essence: 3,
};
let runCounter = 0;

/** A seeded generator lets replays and tests use the same encounter sequence. */
export function nextRandom(seed: number): [number, number] {
  let value = seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  const next = value >>> 0;
  return [next / 4294967296, next || 1];
}

function validDeck(deck: string[]): string[] {
  const selected = [...new Set(deck.filter((id) => CARD_BY_ID[id]))].slice(
    0,
    DECK_SIZE,
  );
  for (const id of STARTER_DECK) {
    if (selected.length >= DECK_SIZE) break;
    if (!selected.includes(id)) selected.push(id);
  }
  return selected;
}

export function startExpedition(
  deck: string[] = STARTER_DECK,
  seed = Date.now(),
): GameState {
  const safeSeed = (Number.isFinite(seed) ? seed >>> 0 : 1) || 1;
  return {
    id: `run-${safeSeed}-${Date.now().toString(36)}-${++runCounter}`,
    seed: safeSeed,
    rng: safeSeed,
    elapsed: 0,
    timeLeft: EXPEDITION_SECONDS,
    duration: EXPEDITION_SECONDS,
    status: "playing",
    resources: { wood: 0, stone: 0, essence: 0 },
    health: 100,
    maxHealth: 100,
    energy: 10,
    maxEnergy: 10,
    score: 0,
    rivalScore: 0,
    control: 50,
    sites: SITES.map((site) => ({ ...site })),
    hero: {
      x: 270,
      y: 530,
      targetX: 270,
      targetY: 530,
      targetSiteId: null,
      moving: false,
      facing: "right",
    },
    rival: { x: 980, y: 150, targetSiteId: "spring" },
    deck: validDeck(deck),
    cooldowns: {},
    crew: [],
    events: [],
    lastMessage: "Choose a resource site to begin.",
    gatherCooldown: 0,
    rivalProgress: 0,
    dangerProgress: 0,
    shrineProgress: 0,
    nextEventId: 1,
    nextCrewId: 1,
  };
}

function clone(state: GameState): GameState {
  return {
    ...state,
    resources: { ...state.resources },
    sites: state.sites.map((site) => ({ ...site })),
    hero: { ...state.hero },
    rival: { ...state.rival },
    deck: [...state.deck],
    cooldowns: { ...state.cooldowns },
    crew: state.crew.map((crew) => ({ ...crew })),
    events: [...state.events],
  };
}

function event(
  state: GameState,
  kind: GameEvent["kind"],
  text: string,
  siteId?: string,
  amount?: number,
  resource?: Resource,
) {
  state.events.push({
    id: state.nextEventId++,
    at: state.elapsed,
    kind,
    text,
    siteId,
    amount,
    resource,
  });
  state.events = state.events.slice(-12);
  state.lastMessage = text;
}

function rejected(state: GameState, message: string): GameState {
  return { ...state, lastMessage: message };
}

function resourceFor(site: Site): Resource | null {
  if (site.kind === "wood" || site.kind === "stone" || site.kind === "essence")
    return site.kind;
  if (site.kind === "ruins" || site.kind === "shrine") return "essence";
  return null;
}

function updateShrine(state: GameState) {
  state.control = Math.max(0, Math.min(100, state.control));
  const shrine = state.sites.find((site) => site.id === "shrine");
  if (!shrine) return;
  const previous = shrine.owner;
  shrine.owner =
    state.control >= 65 ? "player" : state.control <= 35 ? "rival" : "neutral";
  if (shrine.owner === "player" && previous !== "player") {
    event(
      state,
      "capture",
      "Worldheart claimed. +2 points per second.",
      shrine.id,
    );
  }
}

function harvest(state: GameState, site: Site, power: number, card?: Card) {
  const resource = resourceFor(site);
  if (!resource) return;
  const affinityBonus =
    card?.affinity === resource ? (card.id === "mosswood-jack" ? 2 : 1.5) : 1;
  const amount = Math.min(
    Math.floor(site.stock + 0.000001),
    Math.ceil(power * affinityBonus),
  );
  if (amount <= 0) return;
  site.stock = Math.max(0, site.stock - amount);
  state.resources[resource] += amount;
  state.score += amount * resourceValue[resource];
  if (site.kind !== "shrine") site.owner = "player";
  if (site.kind === "shrine") {
    state.control += card?.id === "rune-keeper" ? 18 : 12;
    updateShrine(state);
  }
  if (card?.id === "tide-witch")
    state.health = Math.min(state.maxHealth, state.health + 3);
  if (card?.id === "ironbeak" && site.kind === "ruins") {
    state.resources.essence += 2;
    state.score += 6;
  }
  event(state, "gather", `+${amount} ${resource}`, site.id, amount, resource);
}

/** Selecting a site sends the hero there and starts automatic gathering. */
export function gather(state: GameState, siteId: string): GameState {
  if (state.status !== "playing") return state;
  const target = state.sites.find((site) => site.id === siteId);
  if (!target) return rejected(state, "That site is unavailable.");
  if (siteId === "rival") return rejected(state, "Ashclaw Camp is guarded.");
  const next = clone(state);
  const site = next.sites.find((candidate) => candidate.id === siteId)!;
  next.hero.targetX = site.x;
  next.hero.targetY = site.y;
  next.hero.targetSiteId = site.id;
  const distance = Math.hypot(site.x - next.hero.x, site.y - next.hero.y);
  next.hero.moving = distance > 4;
  if (Math.abs(site.x - next.hero.x) > 1)
    next.hero.facing = site.x < next.hero.x ? "left" : "right";
  next.lastMessage = next.hero.moving
    ? `Traveling to ${site.name}.`
    : site.kind === "camp"
      ? "Recovering at Hearthcamp."
      : `Gathering at ${site.name}.`;
  if (!next.hero.moving && next.gatherCooldown <= 0 && site.kind !== "camp") {
    harvest(next, site, site.kind === "shrine" ? 1 : 3);
    next.gatherCooldown = 2.2;
  }
  return next;
}

export function moveHero(state: GameState, x: number, y: number): GameState {
  if (state.status !== "playing" || !Number.isFinite(x) || !Number.isFinite(y))
    return state;
  const next = clone(state);
  next.hero.targetX = Math.max(60, Math.min(WORLD_WIDTH - 60, x));
  next.hero.targetY = Math.max(80, Math.min(WORLD_HEIGHT - 60, y));
  next.hero.targetSiteId = null;
  next.hero.moving =
    Math.hypot(
      next.hero.targetX - next.hero.x,
      next.hero.targetY - next.hero.y,
    ) > 4;
  if (Math.abs(next.hero.targetX - next.hero.x) > 1)
    next.hero.facing = next.hero.targetX < next.hero.x ? "left" : "right";
  return next;
}

export function canPlayCard(
  state: GameState,
  cardId: string,
  siteId: string,
): { ok: boolean; reason: string } {
  const card = CARD_BY_ID[cardId];
  const site = state.sites.find((candidate) => candidate.id === siteId);
  if (state.status !== "playing")
    return { ok: false, reason: "The expedition has ended." };
  if (!card || !state.deck.includes(cardId))
    return { ok: false, reason: "This card is not in your crew." };
  if (!site || site.kind === "camp")
    return { ok: false, reason: "Select a resource site or the Worldheart." };
  if ((state.cooldowns[cardId] ?? 0) > 0)
    return { ok: false, reason: "This card is recharging." };
  if (state.energy < card.cost)
    return { ok: false, reason: `Need ${card.cost} energy.` };
  if (card.kind === "crew" && state.crew.length >= MAX_CREW)
    return { ok: false, reason: "All four ally slots are occupied." };
  if (card.id === "time-bloom" && state.crew.length === 0)
    return { ok: false, reason: "Deploy an ally first." };
  return { ok: true, reason: "" };
}

export function playCard(
  state: GameState,
  cardId: string,
  siteId: string,
): GameState {
  const permission = canPlayCard(state, cardId, siteId);
  if (!permission.ok) return rejected(state, permission.reason);
  const next = clone(state);
  const card = CARD_BY_ID[cardId]!;
  const site = next.sites.find((candidate) => candidate.id === siteId)!;
  next.energy -= card.cost;
  next.cooldowns[cardId] = card.cooldown;
  if (card.kind === "crew") {
    next.crew.push({
      id: `crew-${next.nextCrewId++}`,
      cardId,
      siteId,
      remaining: card.duration,
      progress: 0,
    });
    if (site.kind !== "shrine") site.owner = "player";
    if (card.id === "elder-stag")
      next.health = Math.min(next.maxHealth, next.health + 25);
    if (site.kind === "shrine") {
      next.control += card.id === "rune-keeper" ? 30 : 15;
      updateShrine(next);
    }
    harvest(next, site, card.power, card);
    event(next, "deploy", `${card.name} deployed.`, site.id);
  } else if (card.id === "wild-growth") {
    site.stock = Math.min(site.maxStock, site.stock + card.power);
    next.health = Math.min(next.maxHealth, next.health + 12);
    event(next, "spell", "Frost Ward restored the land.", site.id);
  } else if (card.id === "time-bloom") {
    for (const crew of next.crew) {
      const ally = CARD_BY_ID[crew.cardId]!;
      const allySite = next.sites.find(
        (candidate) => candidate.id === crew.siteId,
      )!;
      harvest(next, allySite, ally.power * 2, ally);
    }
    event(next, "spell", "Stormcall. Every ally harvests twice.", site.id);
  } else if (card.id === "moonfall") {
    const stolen = Math.min(card.power, next.rivalScore);
    next.rivalScore -= stolen;
    next.score += stolen;
    site.owner = "player";
    if (site.kind === "shrine") {
      next.control = 100;
      updateShrine(next);
    }
    event(next, "spell", `Dragonfall stole ${stolen} points.`, site.id, stolen);
  }
  return next;
}

function advanceHero(state: GameState, dt: number) {
  const hero = state.hero;
  if (hero.moving) {
    const dx = hero.targetX - hero.x;
    const dy = hero.targetY - hero.y;
    const distance = Math.hypot(dx, dy);
    const travel = HERO_SPEED * dt;
    if (distance <= travel + 0.001) {
      hero.x = hero.targetX;
      hero.y = hero.targetY;
      hero.moving = false;
    } else {
      hero.x += (dx / distance) * travel;
      hero.y += (dy / distance) * travel;
    }
  }
  if (!hero.moving && hero.targetSiteId) {
    const site = state.sites.find(
      (candidate) => candidate.id === hero.targetSiteId,
    );
    if (!site) return;
    if (site.id === "home")
      state.health = Math.min(state.maxHealth, state.health + dt * 3);
    else if (state.gatherCooldown <= 0) {
      harvest(state, site, site.kind === "shrine" ? 1 : 3);
      state.gatherCooldown += 2.2;
    }
  }
}

function advanceRival(state: GameState, dt: number) {
  const target = state.sites.find(
    (site) => site.id === state.rival.targetSiteId,
  )!;
  const dx = target.x - state.rival.x;
  const dy = target.y - state.rival.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 1) {
    const travel = Math.min(distance, dt * 105);
    state.rival.x += (dx / distance) * travel;
    state.rival.y += (dy / distance) * travel;
  }
  state.rivalProgress += dt;
  while (state.rivalProgress >= 3 - 0.000001) {
    state.rivalProgress -= 3;
    const [roll, seed] = nextRandom(state.rng);
    state.rng = seed;
    const guarded = state.crew.some(
      (crew) =>
        crew.siteId === target.id &&
        (crew.cardId === "sunblade" || crew.cardId === "granite-guard"),
    );
    if (Math.hypot(target.x - state.rival.x, target.y - state.rival.y) < 12) {
      const resource = resourceFor(target);
      const amount = Math.min(
        Math.floor(target.stock),
        5 + Math.floor(roll * 4),
      );
      if (resource && amount > 0) {
        target.stock -= amount;
        state.rivalScore += Math.floor(
          amount * resourceValue[resource] * (guarded ? 0.5 : 1),
        );
      }
      if (!guarded && target.kind !== "shrine") target.owner = "rival";
      if (!guarded && target.kind === "shrine") {
        state.control -= 18;
        updateShrine(state);
      }
    }
    if (Math.round(state.elapsed / 3) % 5 === 0 || target.stock < 2) {
      const targets = [
        "grove",
        "quarry",
        "spring",
        "ruins",
        "shrine",
        "shrine",
      ];
      const candidates = targets.filter((id) => id !== target.id);
      state.rival.targetSiteId =
        candidates[Math.floor(roll * candidates.length)]!;
    }
  }
}

function advance(state: GameState, dt: number) {
  state.elapsed += dt;
  state.timeLeft = Math.max(0, state.duration - state.elapsed);
  state.energy = Math.min(state.maxEnergy, state.energy + dt * 0.2);
  state.gatherCooldown = Math.max(0, state.gatherCooldown - dt);
  for (const id of Object.keys(state.cooldowns))
    state.cooldowns[id] = Math.max(0, state.cooldowns[id]! - dt);
  for (const site of state.sites) {
    if (site.maxStock > 0)
      site.stock = Math.min(
        site.maxStock,
        site.stock + dt * (site.kind === "shrine" ? 1 : 0.65),
      );
  }
  advanceHero(state, dt);
  for (const crew of state.crew) {
    const aliveTime = Math.min(dt, crew.remaining);
    crew.remaining = Math.max(0, crew.remaining - dt);
    crew.progress += aliveTime;
    const card = CARD_BY_ID[crew.cardId]!;
    const interval = card.id === "ember-fox" ? 3.5 : 5;
    while (crew.progress >= interval - 0.000001) {
      crew.progress -= interval;
      harvest(
        state,
        state.sites.find((site) => site.id === crew.siteId)!,
        card.power,
        card,
      );
    }
  }
  state.crew = state.crew.filter((crew) => crew.remaining > 0.000001);
  advanceRival(state, dt);
  state.dangerProgress += dt;
  if (state.dangerProgress >= 5 - 0.000001) {
    state.dangerProgress -= 5;
    const site = state.sites
      .filter(
        (candidate) =>
          candidate.danger > 0 &&
          Math.hypot(candidate.x - state.hero.x, candidate.y - state.hero.y) <=
            65,
      )
      .sort((a, b) => b.danger - a.danger)[0];
    if (site) {
      const guarded = state.crew.some(
        (crew) =>
          crew.cardId === "granite-guard" || crew.cardId === "elder-stag",
      );
      const damage = Math.max(1, site.danger * 2 - (guarded ? 3 : 0));
      state.health = Math.max(0, state.health - damage);
      event(state, "danger", `-${damage} health`, site.id, damage);
    }
  }
  state.shrineProgress += dt;
  if (state.shrineProgress >= 1 - 0.000001) {
    state.shrineProgress -= 1;
    const shrine = state.sites.find((site) => site.id === "shrine")!;
    if (shrine.owner === "player")
      state.score += state.crew.some(
        (crew) => crew.cardId === "rune-keeper" && crew.siteId === "shrine",
      )
        ? 4
        : 2;
    else if (shrine.owner === "rival") state.rivalScore += 1;
    state.control -= state.rival.targetSiteId === "shrine" ? 0.4 : 0.1;
    updateShrine(state);
  }
}

/** dt is seconds. Large gaps advance the full simulation up to its endpoint. */
export function tickGame(state: GameState, dt: number): GameState {
  if (state.status !== "playing" || !Number.isFinite(dt) || dt <= 0)
    return state;
  const next = clone(state);
  let remaining = Math.min(dt, next.timeLeft);
  while (remaining > 0.000001 && next.health > 0) {
    const step = Math.min(remaining, 0.1);
    advance(next, step);
    remaining -= step;
  }
  if (next.timeLeft <= 0.000001 || next.health <= 0)
    return finishExpedition(next);
  return next;
}

/** An early finish is a retreat and cannot award a victory. */
export function finishExpedition(state: GameState): GameState {
  if (state.status !== "playing") return state;
  const next = clone(state);
  const fullRun = next.timeLeft <= 0.000001;
  next.status =
    next.health <= 0 || !fullRun
      ? "lost"
      : next.score > next.rivalScore
        ? "won"
        : next.score === next.rivalScore
          ? "draw"
          : "lost";
  if (fullRun) {
    next.elapsed = next.duration;
    next.timeLeft = 0;
  }
  next.hero.moving = false;
  event(
    next,
    "system",
    next.status === "won"
      ? "Victory. The Worldheart remembers."
      : next.status === "draw"
        ? "A shared victory. Return stronger."
        : "Expedition complete. Every run makes you stronger.",
  );
  return next;
}
