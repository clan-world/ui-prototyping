import type { BuildingKind, ClanDoctrine } from "@clan-world/shared";
export interface Charter {
  id: string;
  name: string;
  doctrine: ClanDoctrine;
  rarity: "common" | "rare" | "legendary";
  building?: BuildingKind;
  object?: number;
  effect: string;
  symbol: string;
}
export const CHARTERS: Charter[] = [
  {
    id: "forester",
    name: "The Forester",
    doctrine: "harvest",
    rarity: "common",
    object: 1,
    effect: "+20% gathering speed",
    symbol: "I",
  },
  {
    id: "stonecutters",
    name: "Stonecutters’ Guild",
    doctrine: "harvest",
    rarity: "rare",
    building: "mine",
    effect: "+20% gathering speed",
    symbol: "II",
  },
  {
    id: "master-builder",
    name: "The Master Builder",
    doctrine: "industry",
    rarity: "rare",
    building: "hall",
    effect: "+20% construction speed",
    symbol: "II",
  },
  {
    id: "caravan",
    name: "The Caravan",
    doctrine: "stewardship",
    rarity: "common",
    object: 10,
    effect: "+10% carrying speed",
    symbol: "I",
  },
  {
    id: "harvest-feast",
    name: "The Harvest Feast",
    doctrine: "harvest",
    rarity: "common",
    building: "farm",
    effect: "+20% gathering speed",
    symbol: "I",
  },
  {
    id: "elder-seal",
    name: "The Elder’s Seal",
    doctrine: "industry",
    rarity: "legendary",
    building: "chapel",
    effect: "+20% construction speed",
    symbol: "III",
  },
  {
    id: "roadwardens",
    name: "Roadwardens",
    doctrine: "stewardship",
    rarity: "rare",
    building: "watchtower",
    effect: "+10% carrying speed",
    symbol: "II",
  },
  {
    id: "iron-fellowship",
    name: "The Iron Fellowship",
    doctrine: "industry",
    rarity: "common",
    building: "forge",
    effect: "+20% construction speed",
    symbol: "I",
  },
  {
    id: "woodland-pact",
    name: "The Woodland Pact",
    doctrine: "harvest",
    rarity: "legendary",
    object: 0,
    effect: "+20% gathering speed",
    symbol: "III",
  },
];
export interface CharterArchive {
  version: 1;
  packs: number;
  owned: Record<string, number>;
  active: string | null;
  earned: number;
  opened: number;
}
export const CHARTER_SAVE_KEY = "clan-world:charters:v2";
export function createArchive(): CharterArchive {
  return {
    version: 1,
    packs: 3,
    owned: { forester: 1 },
    active: "forester",
    earned: 0,
    opened: 0,
  };
}
export function readArchive(): CharterArchive {
  try {
    const raw = localStorage.getItem(CHARTER_SAVE_KEY);
    if (!raw) return createArchive();
    const data = JSON.parse(raw) as CharterArchive;
    if (
      data.version !== 1 ||
      !data.owned ||
      typeof data.owned !== "object" ||
      !Number.isInteger(data.packs) ||
      data.packs < 0 ||
      data.packs > 1000 ||
      !Number.isInteger(data.earned) ||
      data.earned < 0 ||
      !Number.isInteger(data.opened) ||
      data.opened < 0
    )
      return createArchive();
    const owned = Object.fromEntries(
      CHARTERS.filter(
        (c) =>
          Number.isInteger(data.owned[c.id]) &&
          data.owned[c.id]! > 0 &&
          data.owned[c.id]! < 10000,
      ).map((c) => [c.id, data.owned[c.id]!]),
    );
    return {
      ...data,
      owned,
      active: data.active && owned[data.active] ? data.active : null,
    };
  } catch {
    return createArchive();
  }
}
export function ripCharters(
  archive: CharterArchive,
  random: () => number = Math.random,
): { archive: CharterArchive; cards: Charter[] } {
  if (archive.packs < 1) return { archive, cards: [] };
  const cards: Charter[] = [];
  for (let i = 0; i < 3; i++) {
    const rare = i === 2 || random() > 0.68;
    const pool = CHARTERS.filter((c) =>
      rare ? c.rarity !== "common" : c.rarity === "common",
    );
    cards.push(
      pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!,
    );
  }
  const owned = { ...archive.owned };
  for (const card of cards) owned[card.id] = (owned[card.id] ?? 0) + 1;
  return {
    archive: {
      ...archive,
      packs: archive.packs - 1,
      owned,
      opened: archive.opened + 1,
    },
    cards,
  };
}
