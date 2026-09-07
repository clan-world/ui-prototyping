import { describe, expect, it } from "vitest";
import {
  CARDS,
  MAX_CREW,
  PACK_COST,
  RARITY_ORDER,
  SAVE_KEY,
  STARTER_DECK,
  canPlayCard,
  craftPack,
  createProfile,
  endExpedition,
  finishExpedition,
  gather,
  loadProfile,
  moveHero,
  openPack,
  playCard,
  saveProfile,
  setDeck,
  startExpedition,
  tickGame,
  validateDeck,
} from "./index";
import type { GameState, StorageLike } from "./types";

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function activeRun(seed: number): GameState {
  let game = gather(startExpedition(STARTER_DECK, seed), "shrine");
  for (let second = 0; second < 180 && game.status === "playing"; second++) {
    if (game.health < 34 && game.hero.targetSiteId !== "home")
      game = gather(game, "home");
    if (game.health > 87 && game.hero.targetSiteId === "home")
      game = gather(game, "shrine");
    const actions: [string, string][] = [
      ["rune-keeper", "shrine"],
      ["granite-guard", "quarry"],
      ["tide-witch", "spring"],
      ["mosswood-jack", "grove"],
    ];
    for (const [cardId, siteId] of actions) {
      if (canPlayCard(game, cardId, siteId).ok)
        game = playCard(game, cardId, siteId);
    }
    game = tickGame(game, 1);
  }
  return game;
}

describe("expedition simulation", () => {
  it("walks to a selected site, gathers automatically, and keeps the input immutable", () => {
    const initial = startExpedition(STARTER_DECK, 42);
    const walking = gather(initial, "grove");
    expect(walking.hero.moving).toBe(true);
    expect(initial.hero.targetSiteId).toBeNull();
    expect(initial.resources.wood).toBe(0);
    const arrived = tickGame(walking, 2);
    expect(arrived.hero.x).toBe(260);
    expect(arrived.hero.y).toBe(300);
    expect(arrived.hero.moving).toBe(false);
    expect(arrived.resources.wood).toBe(3);
    const working = tickGame(arrived, 5);
    expect(working.resources.wood).toBeGreaterThan(3);
  });

  it("does not let repeated clicks bypass the gathering cooldown", () => {
    let game = tickGame(gather(startExpedition(), "grove"), 2);
    const amount = game.resources.wood;
    for (let click = 0; click < 30; click++) game = gather(game, "grove");
    expect(game.resources.wood).toBe(amount);
  });

  it("caps stock, health, energy, and run duration without negative resources", () => {
    let game = startExpedition(STARTER_DECK, 92);
    game = playCard(game, "mosswood-jack", "grove");
    game = gather(game, "grove");
    const ended = tickGame(game, 86_400);
    expect(ended.elapsed).toBe(180);
    expect(ended.timeLeft).toBe(0);
    expect(ended.status).not.toBe("playing");
    expect(ended.energy).toBeLessThanOrEqual(ended.maxEnergy);
    expect(ended.health).toBeLessThanOrEqual(ended.maxHealth);
    for (const site of ended.sites) {
      expect(site.stock).toBeGreaterThanOrEqual(0);
      expect(site.stock).toBeLessThanOrEqual(site.maxStock);
    }
    expect(
      Object.values(ended.resources).every(
        (value) => value >= 0 && Number.isInteger(value),
      ),
    ).toBe(true);
    expect(tickGame(ended, 100)).toBe(ended);
  });

  it("uses the same seeded rival decisions with different frame sizes", () => {
    const initial = gather(startExpedition(STARTER_DECK, 123), "grove");
    const large = tickGame(initial, 60);
    let frames = initial;
    for (let frame = 0; frame < 600; frame++) frames = tickGame(frames, 0.1);
    expect(frames.score).toBe(large.score);
    expect(frames.rivalScore).toBe(large.rivalScore);
    expect(frames.resources).toEqual(large.resources);
    expect(frames.rng).toBe(large.rng);
    expect(frames.timeLeft).toBeCloseTo(large.timeLeft, 8);
  });

  it("requires the rival to reach a site before scoring and depletes shared stock", () => {
    const initial = startExpedition(STARTER_DECK, 55);
    const traveling = tickGame(initial, 1);
    expect(traveling.rivalScore).toBe(0);
    expect(traveling.sites.find((site) => site.id === "spring")?.owner).toBe(
      "neutral",
    );
    const arrived = tickGame(traveling, 2);
    expect(arrived.rivalScore).toBeGreaterThan(0);
    expect(
      arrived.sites.find((site) => site.id === "spring")?.stock,
    ).toBeLessThan(25);
    expect(arrived.sites.find((site) => site.id === "spring")?.owner).toBe(
      "rival",
    );
  });

  it("makes an unattended shrine expedition lose health and end in defeat", () => {
    const game = tickGame(
      gather(startExpedition(STARTER_DECK, 44), "shrine"),
      180,
    );
    expect(game.health).toBe(0);
    expect(game.status).toBe("lost");
  });

  it("lets active gathering, ally placement, and recovery beat the rival", () => {
    for (const seed of [12, 42, 92, 2026]) {
      const idle = tickGame(startExpedition(STARTER_DECK, seed), 180);
      const active = activeRun(seed);
      expect(idle.status).toBe("lost");
      expect(
        active.status,
        `seed ${seed}: ${active.score} vs ${active.rivalScore}, health ${active.health}`,
      ).toBe("won");
      expect(active.score).toBeGreaterThan(idle.score);
    }
  });

  it("treats an early finish as a retreat even when the player leads", () => {
    const started = playCard(startExpedition(), "rune-keeper", "shrine");
    expect(started.score).toBeGreaterThan(started.rivalScore);
    expect(finishExpedition(started).status).toBe("lost");
  });

  it("ignores invalid elapsed time and clamps free movement to the map", () => {
    const game = startExpedition();
    expect(tickGame(game, Number.NaN)).toBe(game);
    expect(tickGame(game, -1)).toBe(game);
    const moved = moveHero(game, -200, 5000);
    expect(moved.hero.targetX).toBe(60);
    expect(moved.hero.targetY).toBe(700);
    expect(moveHero(game, Infinity, 1)).toBe(game);
  });

  it("does not let repeated keyboard targets increase movement speed or evade nearby danger", () => {
    let walking = startExpedition();
    const origin = { ...walking.hero };
    for (let frame = 0; frame < 10; frame++) {
      for (let repeat = 0; repeat < 5; repeat++)
        walking = moveHero(walking, walking.hero.x + 27, walking.hero.y + 27);
      walking = tickGame(walking, 0.1);
    }
    expect(
      Math.hypot(walking.hero.x - origin.x, walking.hero.y - origin.y),
    ).toBeCloseTo(185, 6);
    let atShrine = tickGame(gather(startExpedition(), "shrine"), 3);
    expect(atShrine.hero.moving).toBe(false);
    atShrine = moveHero(atShrine, atShrine.hero.x, atShrine.hero.y);
    expect(atShrine.hero.targetSiteId).toBeNull();
    expect(tickGame(atShrine, 2).health).toBe(96);
  });

  it("supports a novice resource, deployment, shrine, and recovery route with earned packs", () => {
    let game = startExpedition(STARTER_DECK, 7331);
    const stops = new Map<number, [string, string]>([
      [0, ["grove", "mosswood-jack"]],
      [20, ["quarry", "granite-guard"]],
      [40, ["spring", "tide-witch"]],
      [60, ["shrine", "rune-keeper"]],
      [110, ["home", ""]],
      [135, ["shrine", "granite-guard"]],
      [150, ["shrine", "rune-keeper"]],
    ]);
    for (let second = 0; second < 180 && game.status === "playing"; second++) {
      const stop = stops.get(second);
      if (stop) {
        game = gather(game, stop[0]);
        if (stop[1]) game = playCard(game, stop[1], stop[0]);
      }
      game = tickGame(game, 1);
    }
    expect(
      game.status,
      `${game.score} vs ${game.rivalScore}, ${game.health} HP`,
    ).toBe("won");
    expect(game.health).toBeGreaterThan(0);
    const profile = { ...createProfile(), coins: 0, packs: 0 };
    const completed = endExpedition(profile, game);
    expect(completed.reward?.packs).toBe(1);
    expect(completed.reward?.coins).toBeGreaterThanOrEqual(PACK_COST);
    expect(craftPack(completed.profile).packs).toBe(2);
    expect(openPack(completed.profile, 7331).cards).toHaveLength(3);
  });
});

describe("card economy", () => {
  it("charges energy once, enforces cooldown, and gives automated yields", () => {
    const initial = startExpedition();
    const deployed = playCard(initial, "mosswood-jack", "grove");
    expect(deployed.energy).toBe(8);
    expect(initial.energy).toBe(10);
    expect(deployed.crew).toHaveLength(1);
    expect(deployed.resources.wood).toBe(10);
    const repeated = playCard(deployed, "mosswood-jack", "grove");
    expect(repeated.energy).toBe(8);
    expect(repeated.crew).toHaveLength(1);
    const working = tickGame(deployed, 5);
    expect(working.resources.wood).toBe(20);
    expect(tickGame(deployed, 31).crew).toHaveLength(0);
  });

  it("enforces energy and four occupied ally slots", () => {
    let game = startExpedition();
    game = playCard(game, "rune-keeper", "shrine");
    game = playCard(game, "tide-witch", "spring");
    game = playCard(game, "mosswood-jack", "grove");
    expect(game.energy).toBe(1);
    expect(canPlayCard(game, "granite-guard", "quarry").ok).toBe(false);
    game = tickGame(game, 5);
    game = playCard(game, "granite-guard", "quarry");
    expect(game.crew).toHaveLength(MAX_CREW);
    const recharged = { ...game, energy: 10 };
    expect(canPlayCard(recharged, "ember-fox", "grove").reason).toContain(
      "four",
    );
  });

  it("rejects cards outside the deck and deployment to either camp", () => {
    const game = startExpedition();
    expect(playCard(game, "elder-stag", "grove").crew).toHaveLength(0);
    expect(playCard(game, "mosswood-jack", "home").energy).toBe(10);
    expect(playCard(game, "mosswood-jack", "rival").energy).toBe(10);
  });
});

describe("collection and persistence", () => {
  it("guarantees a rare or better in every three-card pack and accounts for duplicates", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const initial = createProfile();
      const opened = openPack(initial, seed);
      expect(opened.cards).toHaveLength(3);
      expect(
        opened.cards.some(
          (card) => RARITY_ORDER[card.rarity] >= RARITY_ORDER.rare,
        ),
      ).toBe(true);
      expect(opened.profile.packs).toBe(initial.packs - 1);
      expect(
        Object.values(opened.profile.collection).reduce((a, b) => a + b, 0),
      ).toBe(9);
      expect(Object.values(initial.collection).reduce((a, b) => a + b, 0)).toBe(
        6,
      );
      expect(openPack(initial, seed).cards).toEqual(opened.cards);
    }
  });

  it("cannot open or craft a pack without its corresponding balance", () => {
    const empty = { ...createProfile(), packs: 0, coins: PACK_COST - 1 };
    expect(openPack(empty).profile).toBe(empty);
    expect(openPack(empty).cards).toHaveLength(0);
    expect(craftPack(empty)).toBe(empty);
    const funded = { ...empty, coins: PACK_COST };
    expect(craftPack(funded).coins).toBe(0);
    expect(craftPack(funded).packs).toBe(1);
  });

  it("requires six unique owned cards for a saved deck", () => {
    const profile = createProfile();
    expect(validateDeck(profile, STARTER_DECK).ok).toBe(true);
    expect(setDeck(profile, STARTER_DECK.slice(0, 5))).toBe(profile);
    expect(setDeck(profile, Array(6).fill(STARTER_DECK[0]))).toBe(profile);
    expect(setDeck(profile, [...STARTER_DECK.slice(0, 5), "elder-stag"])).toBe(
      profile,
    );
    const collected = {
      ...profile,
      collection: { ...profile.collection, "elder-stag": 1 },
    };
    const swapped = setDeck(collected, [
      ...STARTER_DECK.slice(0, 5),
      "elder-stag",
    ]);
    expect(swapped.deck).toContain("elder-stag");
    expect(collected.deck).not.toContain("elder-stag");
  });

  it("claims a finished expedition once, including after save and reload", () => {
    const profile = createProfile();
    const game = activeRun(42);
    const first = endExpedition(profile, game);
    expect(first.reward?.won).toBe(true);
    expect(first.profile.wins).toBe(1);
    expect(first.profile.coins).toBeGreaterThan(profile.coins);
    expect(first.profile.packs).toBe(profile.packs + 1);
    const storage = memoryStorage();
    expect(saveProfile(first.profile, storage)).toBe(true);
    const restored = loadProfile(storage);
    expect(endExpedition(restored, game).reward).toBeNull();
    expect(endExpedition(restored, game).profile).toBe(restored);
    expect(endExpedition(profile, startExpedition()).reward).toBeNull();
  });

  it("does not reward an instant retreat with currency, experience, or a pack", () => {
    const profile = createProfile();
    const ended = endExpedition(profile, finishExpedition(startExpedition()));
    expect(ended.reward?.coins).toBe(0);
    expect(ended.reward?.xp).toBe(0);
    expect(ended.reward?.packs).toBe(0);
  });

  it("recovers from corrupted, unsupported, or unavailable browser storage", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, "{invalid");
    expect(loadProfile(storage)).toEqual(createProfile());
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 99 }));
    expect(loadProfile(storage)).toEqual(createProfile());
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(loadProfile(blocked)).toEqual(createProfile());
    expect(saveProfile(createProfile(), blocked)).toBe(false);
  });

  it("sanitizes malformed counts and repairs an invalid saved deck", () => {
    const storage = memoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        coins: -500,
        packs: "lots",
        collection: { "mosswood-jack": -1, "elder-stag": 2.8, unknown: 9 },
        deck: [
          "unknown",
          "constructor",
          "__proto__",
          "elder-stag",
          "elder-stag",
        ],
        xp: 780,
        runs: 1,
        wins: 50,
      }),
    );
    const restored = loadProfile(storage);
    expect(restored.coins).toBe(0);
    expect(restored.packs).toBe(3);
    expect(restored.collection["elder-stag"]).toBe(2);
    expect(restored.collection.unknown).toBeUndefined();
    expect(restored.deck).toHaveLength(6);
    expect(new Set(restored.deck).size).toBe(6);
    expect(restored.level).toBe(4);
    expect(restored.wins).toBe(1);
    expect(validateDeck(restored, restored.deck).ok).toBe(true);
  });

  it("keeps every card mapped to a unique cell of the art atlas", () => {
    expect(CARDS).toHaveLength(12);
    expect(
      [...CARDS.map((card) => card.artIndex)].sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 12 }, (_, index) => index));
  });
});
