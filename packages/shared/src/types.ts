export type Resource = "wood" | "stone" | "essence";
export type Resources = Record<Resource, number>;
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type SiteKind = Resource | "ruins" | "shrine" | "camp";
export type Owner = "neutral" | "player" | "rival";
export type GameStatus = "playing" | "won" | "lost" | "draw";

export interface Card {
  id: string;
  name: string;
  rarity: Rarity;
  role: string;
  kind: "crew" | "spell";
  cost: number;
  power: number;
  description: string;
  artIndex: number;
  affinity: Resource | "any";
  cooldown: number;
  duration: number;
}

export interface Site {
  id: string;
  name: string;
  kind: SiteKind;
  x: number;
  y: number;
  stock: number;
  maxStock: number;
  owner: Owner;
  danger: number;
}

export interface Hero {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetSiteId: string | null;
  moving: boolean;
  facing: "left" | "right";
}

export interface DeployedCrew {
  id: string;
  cardId: string;
  siteId: string;
  remaining: number;
  progress: number;
}

export interface GameEvent {
  id: number;
  at: number;
  kind: "gather" | "deploy" | "spell" | "capture" | "danger" | "system";
  text: string;
  siteId?: string;
  amount?: number;
  resource?: Resource;
}

export interface GameState {
  id: string;
  seed: number;
  rng: number;
  elapsed: number;
  timeLeft: number;
  duration: number;
  status: GameStatus;
  resources: Resources;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  score: number;
  rivalScore: number;
  control: number;
  sites: Site[];
  hero: Hero;
  rival: { x: number; y: number; targetSiteId: string };
  deck: string[];
  cooldowns: Record<string, number>;
  crew: DeployedCrew[];
  events: GameEvent[];
  lastMessage: string;
  gatherCooldown: number;
  rivalProgress: number;
  dangerProgress: number;
  shrineProgress: number;
  nextEventId: number;
  nextCrewId: number;
}

export interface Profile {
  version: 1;
  name: string;
  xp: number;
  level: number;
  coins: number;
  packs: number;
  collection: Record<string, number>;
  deck: string[];
  wins: number;
  runs: number;
  bestScore: number;
  trophies: number;
  claimedRunIds: string[];
  packCounter: number;
}

export interface ExpeditionReward {
  coins: number;
  xp: number;
  trophies: number;
  packs: number;
  score: number;
  won: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
