import {
  CARDS,
  CARD_BY_ID,
  DECK_SIZE,
  PACK_COST,
  PACK_SIZE,
  STARTER_DECK,
} from "./cards";
import { nextRandom } from "./engine";
import type {
  Card,
  ExpeditionReward,
  GameState,
  Profile,
  Rarity,
  StorageLike,
} from "./types";

export const SAVE_KEY = "clan-world:v1";

export function createProfile(): Profile {
  return {
    version: 1,
    name: "Mossborn",
    xp: 0,
    level: 1,
    coins: 120,
    packs: 3,
    collection: Object.fromEntries(STARTER_DECK.map((id) => [id, 1])),
    deck: [...STARTER_DECK],
    wins: 0,
    runs: 0,
    bestScore: 0,
    trophies: 0,
    claimedRunIds: [],
    packCounter: 0,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown, fallback = 0, max = 1_000_000): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.floor(value)))
    : fallback;
}

export function normalizeProfile(value: unknown): Profile {
  const fallback = createProfile();
  if (!record(value) || value.version !== 1) return fallback;
  const collection: Record<string, number> = {};
  const savedCollection = record(value.collection) ? value.collection : {};
  for (const card of CARDS) {
    const copies = count(savedCollection[card.id], 0, 10_000);
    if (copies > 0) collection[card.id] = copies;
  }
  for (const id of STARTER_DECK)
    collection[id] = Math.max(1, collection[id] ?? 0);
  const deck = Array.isArray(value.deck)
    ? [
        ...new Set(
          value.deck.filter(
            (id): id is string =>
              typeof id === "string" && !!CARD_BY_ID[id] && !!collection[id],
          ),
        ),
      ].slice(0, DECK_SIZE)
    : [];
  for (const id of STARTER_DECK) {
    if (deck.length >= DECK_SIZE) break;
    if (!deck.includes(id)) deck.push(id);
  }
  const xp = count(value.xp, 0, 1_000_000_000);
  const runs = count(value.runs);
  return {
    version: 1,
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim().slice(0, 24)
        : fallback.name,
    xp,
    level: 1 + Math.floor(xp / 250),
    coins: count(value.coins, fallback.coins, 10_000_000),
    packs: count(value.packs, fallback.packs, 10_000),
    collection,
    deck,
    wins: Math.min(runs, count(value.wins)),
    runs,
    bestScore: count(value.bestScore),
    trophies: count(value.trophies),
    claimedRunIds: Array.isArray(value.claimedRunIds)
      ? [
          ...new Set(
            value.claimedRunIds.filter(
              (id): id is string =>
                typeof id === "string" && id.length > 0 && id.length < 128,
            ),
          ),
        ]
      : [],
    packCounter: count(value.packCounter),
  };
}

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof globalThis.localStorage === "undefined"
      ? undefined
      : globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadProfile(storage?: StorageLike): Profile {
  try {
    const raw = (storage ?? defaultStorage())?.getItem(SAVE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : createProfile();
  } catch {
    return createProfile();
  }
}

/** Returns false if browser storage is unavailable or full. */
export function saveProfile(profile: Profile, storage?: StorageLike): boolean {
  try {
    const target = storage ?? defaultStorage();
    if (!target) return false;
    target.setItem(SAVE_KEY, JSON.stringify(normalizeProfile(profile)));
    return true;
  } catch {
    return false;
  }
}

export function validateDeck(
  profile: Profile,
  deck: string[],
): { ok: boolean; reason: string } {
  if (deck.length !== DECK_SIZE)
    return { ok: false, reason: `Choose exactly ${DECK_SIZE} cards.` };
  if (new Set(deck).size !== DECK_SIZE)
    return { ok: false, reason: "Choose six different cards." };
  if (deck.some((id) => !CARD_BY_ID[id] || !profile.collection[id]))
    return { ok: false, reason: "You can only equip collected cards." };
  if (!deck.some((id) => CARD_BY_ID[id]!.kind === "crew"))
    return { ok: false, reason: "Your deck needs at least one ally." };
  return { ok: true, reason: "" };
}

export function setDeck(profile: Profile, deck: string[]): Profile {
  if (!validateDeck(profile, deck).ok) return profile;
  return { ...profile, deck: [...deck] };
}

export function craftPack(profile: Profile): Profile {
  if (profile.coins < PACK_COST) return profile;
  return {
    ...profile,
    coins: profile.coins - PACK_COST,
    packs: profile.packs + 1,
  };
}

/** Every three-card pack guarantees at least one rare or better. */
export function openPack(
  profile: Profile,
  seed = Date.now() + profile.packCounter * 7919,
): { profile: Profile; cards: Card[] } {
  if (profile.packs <= 0) return { profile, cards: [] };
  let rng = (Number.isFinite(seed) ? seed >>> 0 : 1) || 1;
  const random = () => {
    const [value, next] = nextRandom(rng);
    rng = next;
    return value;
  };
  const cards: Card[] = [];
  for (let index = 0; index < PACK_SIZE; index++) {
    const roll = random();
    const guaranteed = index === PACK_SIZE - 1;
    const rarity: Rarity = guaranteed
      ? roll < 0.65
        ? "rare"
        : roll < 0.92
          ? "epic"
          : "legendary"
      : roll < 0.58
        ? "common"
        : roll < 0.86
          ? "rare"
          : roll < 0.97
            ? "epic"
            : "legendary";
    const pool = CARDS.filter((card) => card.rarity === rarity);
    cards.push(pool[Math.floor(random() * pool.length)]!);
  }
  const collection = { ...profile.collection };
  for (const card of cards)
    collection[card.id] = (collection[card.id] ?? 0) + 1;
  return {
    profile: {
      ...profile,
      collection,
      packs: profile.packs - 1,
      packCounter: profile.packCounter + 1,
    },
    cards,
  };
}

export function previewReward(
  state: GameState,
  firstRun = false,
): ExpeditionReward {
  const won = state.status === "won";
  const retreat = state.timeLeft > 0 && state.health > 0;
  const participation = retreat
    ? Math.max(0, Math.min(1, state.elapsed / state.duration))
    : 1;
  return {
    coins: Math.floor(
      (30 + Math.floor(state.score * 0.12) + (won ? 40 : 0)) * participation,
    ),
    xp: Math.floor((50 + Math.floor(state.score * 0.25)) * participation),
    trophies: won ? 25 : state.status === "draw" ? 5 : -8,
    packs: !retreat && (won || firstRun) ? 1 : 0,
    score: Math.floor(state.score),
    won,
  };
}

/** A run's identifier can be claimed only once, including after a reload. */
export function endExpedition(
  profile: Profile,
  state: GameState,
): { profile: Profile; reward: ExpeditionReward | null } {
  if (state.status === "playing" || profile.claimedRunIds.includes(state.id))
    return { profile, reward: null };
  const reward = previewReward(state, profile.runs === 0);
  const xp = profile.xp + reward.xp;
  return {
    profile: {
      ...profile,
      xp,
      level: 1 + Math.floor(xp / 250),
      coins: profile.coins + reward.coins,
      packs: profile.packs + reward.packs,
      trophies: Math.max(0, profile.trophies + reward.trophies),
      wins: profile.wins + (reward.won ? 1 : 0),
      runs: profile.runs + 1,
      bestScore: Math.max(profile.bestScore, reward.score),
      claimedRunIds: [...profile.claimedRunIds, state.id],
    },
    reward,
  };
}
