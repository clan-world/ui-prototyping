"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  CARDS,
  CARD_BY_ID,
  STARTER_DECK,
  PACK_COST,
  createProfile,
  loadProfile,
  saveProfile,
  startExpedition,
  tickGame,
  gather,
  playCard,
  moveHero,
  finishExpedition,
  endExpedition,
  openPack,
  craftPack,
  setDeck,
  type Card,
  type Profile,
  type GameState,
  type ExpeditionReward,
  type Site,
} from "@clan-world/shared";
import { Icon, type IconName } from "./Icon";
import { WorldCanvas, type WorldView } from "./WorldCanvas";
import { sound, setSound } from "../lib/audio";

type Screen = "home" | "world" | "collection" | "packs" | "clan";
const SITE_ICONS: Record<string, IconName> = {
  wood: "wood",
  stone: "stone",
  essence: "essence",
  shrine: "spark",
  ruins: "shield",
  camp: "home",
};
function CardArt({ card, className = "" }: { card: Card; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${card.name} pixel artwork`}
      className={`card-art ${className}`}
      style={{
        backgroundPosition: `${((card.artIndex % 4) * 100) / 3}% ${Math.floor(card.artIndex / 4) * 50}%`,
      }}
    />
  );
}
function CardFace({
  card,
  small = false,
  owned = true,
  children,
}: {
  card: Card;
  small?: boolean;
  owned?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`game-card rarity-${card.rarity} ${small ? "small" : ""} ${!owned ? "unowned" : ""}`}
    >
      <div className="card-topline">
        <span className="mana-cost">{card.cost}</span>
        <span className="card-rarity">
          {card.rarity === "legendary"
            ? "✦"
            : card.rarity === "epic"
              ? "◆"
              : card.rarity === "rare"
                ? "◇"
                : "·"}
        </span>
      </div>
      <CardArt card={card} />
      <div className="card-caption">
        <span className="card-role">{card.role}</span>
        <strong>{card.name}</strong>
        <div className="card-bottomline">
          <span>
            <Icon name={card.kind === "spell" ? "spark" : "sword"} size={11} />
            {card.power}
          </span>
          <span>{card.rarity}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
function RuneMark({ className = "" }: { className?: string }) {
  return (
    <div className={`rune-mark ${className}`}>
      <svg viewBox="0 0 80 88" fill="none" aria-hidden="true">
        <path d="M40 3 72 22v40L40 83 8 62V22L40 3Z" />
        <path d="m40 15 21 13v28L40 70 19 56V28l21-13Zm0 10v33m0-23 12 8-12 8-12-8 12-8ZM31 8l9-5 9 5M31 78l9 5 9-5" />
      </svg>
    </div>
  );
}
function Modal({
  label,
  children,
  onClose,
}: {
  label: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    const el = panel.current;
    el?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && el) {
        const buttons = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, [tabindex="0"]',
          ),
        );
        if (!buttons.length) return;
        const first = buttons[0]!,
          last = buttons[buttons.length - 1]!;
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      old?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        tabIndex={-1}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <button
          className="icon-button modal-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}

export default function Game() {
  const [profile, updateProfile] = useState<Profile>(createProfile),
    [ready, setReady] = useState(false),
    [screen, setScreen] = useState<Screen>("home"),
    [game, setGame] = useState<GameState>(() =>
      startExpedition(STARTER_DECK, 7331),
    );
  const [started, setStarted] = useState(false),
    [paused, setPaused] = useState(false),
    [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false),
    [selectedSite, setSelectedSite] = useState("grove"),
    [selectedCard, setSelectedCard] = useState<string | null>(null),
    [inspect, setInspect] = useState<Card | null>(null),
    [filter, setFilter] = useState("all"),
    [zoom, setZoom] = useState(1),
    [toast, setToast] = useState(""),
    [retreat, setRetreat] = useState(false),
    [reward, setReward] = useState<ExpeditionReward | null>(null),
    [showResults, setShowResults] = useState(false),
    [saveError, setSaveError] = useState(false);
  const [packStage, setPackStage] = useState<"sealed" | "ripping" | "reveal">(
      "sealed",
    ),
    [packCards, setPackCards] = useState<Card[]>([]),
    [flipped, setFlipped] = useState(0),
    [ripProgress, setRipProgress] = useState(0),
    [swapCard, setSwapCard] = useState<Card | null>(null);
  const ripStart = useRef<number | null>(null),
    profileRef = useRef(profile),
    gameRef = useRef(game),
    uiRef = useRef({
      screen,
      paused,
      help,
      inspect,
      selectedCard,
      selectedSite,
      started,
      showResults,
    }),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  profileRef.current = profile;
  gameRef.current = game;
  uiRef.current = {
    screen,
    paused,
    help,
    inspect,
    selectedCard,
    selectedSite,
    started,
    showResults,
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => {
    updateProfile(loadProfile());
    setReady(true);
    return () => timers.current.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (ready) setSaveError(!saveProfile(profile));
  }, [profile, ready]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const id = setInterval(() => {
      const u = uiRef.current;
      if (
        u.screen === "world" &&
        u.started &&
        !u.paused &&
        !u.help &&
        !u.inspect &&
        !document.hidden
      )
        setGame((g) => (g.status === "playing" ? tickGame(g, 0.1) : g));
    }, 100);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && uiRef.current.screen === "world") setPaused(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (!started || game.status === "playing" || showResults) return;
    const result = endExpedition(profileRef.current, game);
    if (result.reward) {
      updateProfile(result.profile);
      setReward(result.reward);
      setShowResults(true);
      sound(game.status === "won" ? "win" : "reveal");
    }
  }, [game.status, started, showResults, game]);
  useEffect(() => {
    const keys = new Set<string>();
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches("input,textarea")) return;
      const u = uiRef.current;
      if (
        u.screen !== "world" ||
        !u.started ||
        u.help ||
        u.inspect ||
        u.showResults
      )
        return;
      if (e.key === "Escape") {
        setPaused((p) => !p);
        return;
      }
      if (u.paused) return;
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "ArrowUp",
          "ArrowLeft",
          "ArrowDown",
          "ArrowRight",
        ].includes(e.key)
      ) {
        e.preventDefault();
        keys.add(e.key);
      }
      if (/^[1-6]$/.test(e.key)) {
        e.preventDefault();
        setSelectedCard(gameRef.current.deck[Number(e.key) - 1] ?? null);
        sound("tap");
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (u.selectedCard) {
          const before = gameRef.current;
          const next = playCard(before, u.selectedCard, u.selectedSite);
          setGame(next);
          if (next.energy < before.energy) {
            setSelectedCard(null);
            sound("deploy");
          } else {
            setToast(next.lastMessage);
            sound("error");
          }
        } else setGame((g) => gather(g, u.selectedSite));
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    const blur = () => keys.clear();
    const id = setInterval(() => {
      const u = uiRef.current;
      if (u.screen !== "world" || u.paused || u.help || u.inspect) return;
      let x = 0,
        y = 0;
      if (keys.has("w") || keys.has("ArrowUp")) y--;
      if (keys.has("s") || keys.has("ArrowDown")) y++;
      if (keys.has("a") || keys.has("ArrowLeft")) x--;
      if (keys.has("d") || keys.has("ArrowRight")) x++;
      if (x || y)
        setGame((g) => moveHero(g, g.hero.x + x * 27, g.hero.y + y * 27));
    }, 60);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  const notify = (message: string) => setToast(message);
  function nav(next: Screen) {
    sound("tap");
    setScreen(next);
    setSelectedCard(null);
    if (next !== "world") setPaused(true);
    else setPaused(false);
  }
  function enter() {
    if (started && gameRef.current.status === "playing") {
      nav("world");
      return;
    }
    sound("deploy");
    setGame(startExpedition(profileRef.current.deck));
    setStarted(true);
    setPaused(false);
    setShowResults(false);
    setReward(null);
    setSelectedSite("grove");
    setScreen("world");
    setSelectedCard(null);
    setZoom(1);
  }
  function selectSite(id: string) {
    setSelectedSite(id);
    if (selectedCard) {
      deploy(selectedCard, id);
    } else {
      setGame((g) => gather(g, id));
      sound("tap");
    }
  }
  function deploy(id: string, siteId = selectedSite) {
    const result = playCard(gameRef.current, id, siteId);
    setGame(result);
    if (result.energy < gameRef.current.energy) {
      sound("deploy");
      setSelectedCard(null);
    } else {
      sound("error");
      notify(result.lastMessage);
    }
  }
  function buyPack() {
    const next = craftPack(profileRef.current);
    if (next.packs > profileRef.current.packs) {
      updateProfile(next);
      sound("reveal");
      notify("Wildwood pack forged");
    } else {
      notify(`Need ${PACK_COST} gold`);
      sound("error");
    }
  }
  function ripPack() {
    if (packStage !== "sealed" || profileRef.current.packs < 1) return;
    const result = openPack(profileRef.current);
    if (!result.cards.length) return;
    updateProfile(result.profile);
    setPackCards(result.cards);
    setFlipped(0);
    setPackStage("ripping");
    setRipProgress(100);
    sound("rip");
    later(() => {
      setPackStage("reveal");
      setRipProgress(0);
      sound("reveal");
    }, 950);
  }
  function flipNext() {
    if (flipped < packCards.length) {
      setFlipped((n) => n + 1);
      sound("reveal");
    } else {
      setPackStage("sealed");
      setPackCards([]);
      sound("tap");
    }
  }
  function equip(card: Card) {
    if (profile.deck.includes(card.id)) {
      notify("Already in your expedition deck");
      return;
    }
    setSwapCard(card);
    setInspect(null);
  }
  function replaceCard(id: string) {
    if (!swapCard) return;
    updateProfile(
      setDeck(
        profileRef.current,
        profileRef.current.deck.map((c) => (c === id ? swapCard.id : c)),
      ),
    );
    setSwapCard(null);
    sound("deploy");
    notify("Expedition deck updated");
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify("Fullscreen is unavailable in this browser");
    }
  }
  function share() {
    const text = `Clan World · Wildwood expedition\n${game.status === "won" ? "Victory" : "Expedition complete"} · ${Math.floor(game.score)} points\nCan you beat my score?`;
    if (navigator.share) {
      void navigator.share({ title: "Clan World", text }).catch(() => {});
    } else if (navigator.clipboard) {
      void navigator.clipboard
        .writeText(text)
        .then(() => notify("Challenge copied"))
        .catch(() => notify("Sharing is unavailable"));
    } else notify("Sharing is unavailable");
  }
  const currentSite =
    game.sites.find((s) => s.id === selectedSite) ?? game.sites[1]!;
  const ownedCount = CARDS.filter(
    (c) => (profile.collection[c.id] ?? 0) > 0,
  ).length;
  const view: WorldView = {
    hero: game.hero,
    feedback: game.events
      .filter((e) => e.kind === "gather" && e.siteId)
      .slice(-5)
      .map((e) => ({
        id: e.id,
        siteId: e.siteId!,
        amount: e.amount ?? 0,
        resource: e.resource ?? "essence",
      })),
    active: screen === "world",
    selected: selectedSite,
    target: { x: game.hero.targetX, y: game.hero.targetY },
    sites: game.sites,
    actors: [
      ...game.crew.map((crew, i) => {
        const site = game.sites.find((s) => s.id === crew.siteId)!;
        const card = CARD_BY_ID[crew.cardId]!;
        const age = card.duration - crew.remaining;
        const ratio = Math.min(1, age / 2);
        return {
          id: crew.id,
          x: 270 + (site.x - 270) * ratio + Math.sin(i * 2) * 23,
          y: 530 + (site.y - 530) * ratio + Math.cos(i * 2) * 15,
          role:
            card.id === "ember-fox"
              ? "fox"
              : card.id === "elder-stag"
                ? "stag"
                : card.id === "ironbeak"
                  ? "treant"
                  : card.affinity === "essence"
                    ? "mage"
                    : card.role === "Sentinel" || card.id === "granite-guard"
                      ? "guardian"
                      : "worker",
          remaining: crew.remaining,
          team: "player",
          working: ratio === 1,
        };
      }),
      {
        id: "rival",
        x: game.rival.x,
        y: game.rival.y,
        role: "guardian",
        team: "rival",
        working: true,
      },
    ],
  };
  const mm = String(Math.floor(game.timeLeft / 60)).padStart(2, "0"),
    ss = String(Math.floor(game.timeLeft % 60)).padStart(2, "0");
  const mostRecent = game.events.at(-1);
  return (
    <main className={`game-shell screen-${screen}`}>
      <div className="scene-background" />
      <div className="scene-shade" />
      <div className="ambient-motes" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
      {screen !== "world" && (
        <header className="global-header">
          <button
            className="brand-lockup"
            onClick={() => nav("home")}
            aria-label="Clan World home"
          >
            <RuneMark />
            <span>
              CLAN WORLD<small>THE WILDWOOD CHRONICLES</small>
            </span>
          </button>
          <div className="header-right">
            <span className="gold-counter">
              <span className="coin-icon">✧</span>
              {profile.coins}
              <small>GOLD</small>
            </span>
            <button
              className="icon-button"
              aria-label={muted ? "Enable sound" : "Mute sound"}
              onClick={() => {
                setMuted(!muted);
                setSound(muted);
                if (muted) sound("tap");
              }}
            >
              <Icon name={muted ? "mute" : "sound"} />
            </button>
            <button
              className="icon-button fullscreen-button"
              aria-label="Toggle fullscreen"
              onClick={fullscreen}
            >
              <Icon name="fullscreen" />
            </button>
            <button
              className="icon-button"
              aria-label="How to play"
              onClick={() => setHelp(true)}
            >
              <Icon name="help" />
            </button>
          </div>
        </header>
      )}
      {screen === "home" && (
        <section className="home-screen">
          <div className="home-heading">
            <div className="eyebrow">
              <span className="tiny-line" /> THE WILDWOOD CHRONICLES{" "}
              <span className="tiny-line" />
            </div>
            <h1>
              Clan
              <br />
              <em>World</em>
            </h1>
            <div className="home-chips">
              <span>
                <Icon name="map" size={14} />
                EXPLORE
              </span>
              <i />
              <span>
                <Icon name="cards" size={14} />
                COLLECT
              </span>
              <i />
              <span>
                <Icon name="flag" size={14} />
                CONQUER
              </span>
            </div>
          </div>
          <div className="home-lower">
            <div className="expedition-launch">
              <div className="section-kicker">
                <span className="status-dot" /> EXPEDITION 001
              </div>
              <h2>The Wildwood</h2>
              <div className="mode-meta">
                <span>03:00</span>
                <span>6 CARDS</span>
                <span>SOLO vs AI</span>
              </div>
              <button
                className="primary-button enter-button"
                onClick={
                  started && game.status === "playing"
                    ? () => nav("world")
                    : enter
                }
              >
                <Icon name="sword" />
                {started && game.status === "playing"
                  ? "Resume expedition"
                  : "Enter the Wildwood"}
                <Icon name="arrow" />
              </button>
            </div>
            <button
              className="home-pack-teaser"
              onClick={() => nav("packs")}
              aria-label={`Open packs, ${profile.packs} available`}
            >
              <div className="mini-pack">
                <RuneMark />
              </div>
              <div>
                <span className="section-kicker">A LITTLE WILD MAGIC</span>
                <strong>
                  {profile.packs
                    ? `${profile.packs} unopened packs`
                    : "The next great pull"}
                </strong>
                <span className="text-link">
                  Visit the pack altar <Icon name="arrow" size={14} />
                </span>
              </div>
            </button>
          </div>
          <div className="home-world-label">
            <span>THE ELDER SHRINE</span>
            <span className="world-coordinate">06° 21′ N &nbsp; 41° 08′ W</span>
            <div className="label-stem" />
          </div>
        </section>
      )}
      {screen === "collection" && (
        <section className="collection-screen content-screen">
          <div className="screen-title">
            <div>
              <span className="section-kicker">THE CODEX</span>
              <h1>
                Your collection
                <span>
                  {ownedCount}
                  <small>/ {CARDS.length}</small>
                </span>
              </h1>
            </div>
            <div className="filters" role="group" aria-label="Filter cards">
              {["all", "crew", "spell"].map((f) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  className={filter === f ? "active" : ""}
                  onClick={() => setFilter(f)}
                >
                  {f === "all"
                    ? "All cards"
                    : f === "crew"
                      ? "Clanmates"
                      : "Spells"}
                </button>
              ))}
            </div>
          </div>
          <div className="collection-grid">
            {CARDS.filter((c) => filter === "all" || c.kind === filter).map(
              (card) => (
                <button
                  key={card.id}
                  className="collection-card-button"
                  onClick={() => setInspect(card)}
                  aria-label={`Inspect ${card.name}${profile.collection[card.id] ? ", owned" : ", undiscovered"}`}
                >
                  <CardFace card={card} owned={!!profile.collection[card.id]} />
                  <span className="collection-card-state">
                    {profile.deck.includes(card.id) ? (
                      <>
                        <Icon name="check" size={12} />
                        IN DECK
                      </>
                    ) : profile.collection[card.id] ? (
                      `OWNED ×${profile.collection[card.id]}`
                    ) : (
                      "UNDISCOVERED"
                    )}
                  </span>
                </button>
              ),
            )}
          </div>
          <div className="deck-strip">
            <div>
              <Icon name="cards" />
              <span>
                EXPEDITION DECK<small>6 / 6</small>
              </span>
            </div>
            <div className="deck-portraits">
              {profile.deck.map((id, i) => (
                <button
                  key={id}
                  aria-label={`Deck slot ${i + 1}: ${CARD_BY_ID[id]!.name}`}
                  onClick={() => setInspect(CARD_BY_ID[id]!)}
                >
                  <CardArt card={CARD_BY_ID[id]!} />
                  <span>{i + 1}</span>
                </button>
              ))}
            </div>
            <button className="outline-button" onClick={enter}>
              Deploy deck
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>
      )}
      {screen === "packs" && (
        <section className={`packs-screen pack-stage-${packStage}`}>
          <div className="pack-heading">
            <span className="section-kicker">THE PACK ALTAR</span>
            <h1>
              {packStage === "reveal"
                ? "Meet your clan."
                : "A little wild magic."}
            </h1>
            <div className="mode-meta">
              <span>WILDWOOD · SET 01</span>
              <span>3 CARDS</span>
              <span>RARE+ GUARANTEED</span>
            </div>
          </div>
          <div className="altar-rings" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          {packStage !== "reveal" ? (
            <div className="pack-stage">
              <div className="pack-sparkles" aria-hidden="true">
                {Array.from({ length: 16 }, (_, i) => (
                  <i key={i} style={{ "--i": i } as CSSProperties} />
                ))}
              </div>
              <div
                className={`booster-pack ${packStage === "ripping" ? "ripping" : ""}`}
                style={{ "--rip": `${ripProgress}%` } as CSSProperties}
                onPointerDown={(e) => {
                  if (packStage === "sealed") {
                    ripStart.current = e.clientX;
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }
                }}
                onPointerMove={(e) => {
                  if (ripStart.current !== null) {
                    const progress = Math.min(
                      100,
                      Math.abs(e.clientX - ripStart.current) / 1.4,
                    );
                    setRipProgress(progress);
                    if (progress >= 95) {
                      ripStart.current = null;
                      ripPack();
                    }
                  }
                }}
                onPointerUp={() => {
                  ripStart.current = null;
                  if (packStage === "sealed") setRipProgress(0);
                }}
              >
                <div className="pack-top-seal" />
                <div className="pack-foil" />
                <div className="pack-brand">
                  CLAN
                  <br />
                  WORLD
                </div>
                <RuneMark className="pack-rune" />
                <div className="pack-forest" />
                <div className="pack-title">
                  WILDWOOD<small>FIRST EDITION</small>
                </div>
                <div className="pack-bottom-seal" />
                <div className="rip-track">
                  <span />
                  <Icon name="arrow" size={16} />
                </div>
              </div>
            </div>
          ) : (
            <div className="reveal-cards">
              {packCards.map((card, i) => (
                <button
                  key={`${card.id}-${i}`}
                  className={`reveal-card ${i < flipped ? "flipped" : ""}`}
                  style={{ "--index": i } as CSSProperties}
                  onClick={() => {
                    if (i >= flipped) {
                      setFlipped(i + 1);
                      sound("reveal");
                    } else setInspect(card);
                  }}
                  aria-label={
                    i < flipped
                      ? `Inspect ${card.name}`
                      : `Reveal card ${i + 1}`
                  }
                >
                  <div className="reveal-inner">
                    <div className="card-back">
                      <RuneMark />
                      <span>CLAN WORLD</span>
                      <small>0{i + 1}</small>
                    </div>
                    <div className="revealed-front">
                      <CardFace card={card} />
                      <span className={`rarity-label rarity-${card.rarity}`}>
                        {card.rarity}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="pack-controls">
            {packStage === "sealed" ? (
              <>
                <button
                  className="primary-button"
                  disabled={!profile.packs}
                  onClick={ripPack}
                >
                  <Icon name="pack" />
                  Rip pack<span className="button-count">{profile.packs}</span>
                </button>
                <button className="text-button" onClick={buyPack}>
                  Forge a pack <span className="gold-text">✧ {PACK_COST}</span>
                </button>
              </>
            ) : packStage === "reveal" ? (
              <>
                <button className="primary-button" onClick={flipNext}>
                  {flipped < packCards.length ? "Reveal next" : "Collect cards"}
                  <Icon name={flipped < packCards.length ? "spark" : "check"} />
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    if (flipped < packCards.length) {
                      setFlipped(packCards.length);
                      sound("reveal");
                    } else nav("collection");
                  }}
                >
                  {flipped < packCards.length
                    ? "Reveal all"
                    : "View collection"}
                </button>
              </>
            ) : (
              <span className="section-kicker">THE WILDWOOD AWAKENS</span>
            )}
          </div>
        </section>
      )}
      {screen === "clan" && (
        <section className="clan-screen content-screen">
          <div className="clan-banner">
            <RuneMark />
            <span className="section-kicker">YOUR CLAN</span>
            <h1>Moss & Ember</h1>
            <span className="clan-rank">
              <Icon name="shield" size={17} />
              WOODLAND {profile.level}
            </span>
          </div>
          <div className="clan-stats">
            {[
              { label: "EXPEDITIONS", value: profile.runs },
              { label: "VICTORIES", value: profile.wins },
              { label: "BEST SCORE", value: profile.bestScore },
              { label: "RENOWN", value: profile.trophies },
            ].map((s) => (
              <div key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="clan-progress">
            <span>LEVEL {profile.level}</span>
            <div>
              <i style={{ width: `${((profile.xp % 250) / 250) * 100}%` }} />
            </div>
            <span>{profile.xp % 250} / 250 XP</span>
          </div>
          <div className="clan-milestones">
            <div>
              <Icon name="flag" />
              <strong>First claim</strong>
              <span>{profile.runs > 0 ? "COMPLETE" : "0 / 1 RUN"}</span>
            </div>
            <div>
              <Icon name="crown" />
              <strong>Wildwood victor</strong>
              <span>{profile.wins > 0 ? "COMPLETE" : "0 / 1 WIN"}</span>
            </div>
            <div>
              <Icon name="cards" />
              <strong>Full house</strong>
              <span>{ownedCount} / 12 CARDS</span>
            </div>
          </div>
          <button className="primary-button" onClick={enter}>
            Raise your banner
            <Icon name="arrow" />
          </button>
        </section>
      )}
      {screen === "world" && (
        <section className="world-screen">
          <WorldCanvas
            key={game.id}
            view={view}
            onPoint={(x, y) => {
              setGame((g) => moveHero(g, x, y));
              setSelectedCard(null);
            }}
            onSite={selectSite}
            zoom={zoom}
          />
          <div className="world-vignette" />
          <header className="world-hud">
            <button
              className="icon-button hud-menu"
              aria-label="Pause expedition"
              onClick={() => setPaused(true)}
            >
              <Icon name="pause" />
            </button>
            <div className="world-place">
              <span className="section-kicker">EXPEDITION 001</span>
              <strong>The Wildwood</strong>
            </div>
            <div className="contest-score">
              <div className="score-team player-score">
                <Icon name="flag" size={16} />
                <span>MOSS & EMBER</span>
                <strong>{Math.floor(game.score)}</strong>
              </div>
              <div
                className={`match-clock ${game.timeLeft < 30 ? "urgent" : ""}`}
              >
                <strong>
                  {mm}:{ss}
                </strong>
                <span>REMAINING</span>
              </div>
              <div className="score-team rival-score">
                <strong>{Math.floor(game.rivalScore)}</strong>
                <span>ASHCLAW · AI</span>
                <Icon name="flag" size={16} />
              </div>
            </div>
            <button
              className="icon-button hud-help"
              aria-label="Expedition controls"
              onClick={() => setHelp(true)}
            >
              <Icon name="help" />
            </button>
          </header>
          <div className="resource-hud">
            {(["wood", "stone", "essence"] as const).map((r) => (
              <div key={r} className={`resource resource-${r}`}>
                <Icon name={r} size={20} />
                <strong>{Math.floor(game.resources[r])}</strong>
                <small>{r === "wood" ? "TIMBER" : r.toUpperCase()}</small>
              </div>
            ))}
          </div>
          <div
            className="site-selector"
            role="group"
            aria-label="Map destinations"
          >
            {game.sites
              .filter((s) => s.kind !== "camp" || s.id === "home")
              .map((site) => (
                <button
                  key={site.id}
                  className={selectedSite === site.id ? "selected" : ""}
                  onClick={() => selectSite(site.id)}
                  aria-label={`Travel to ${site.name}`}
                  title={site.name}
                >
                  <Icon name={SITE_ICONS[site.kind] ?? "map"} />
                  <span>
                    {site.kind === "wood"
                      ? "Grove"
                      : site.kind === "stone"
                        ? "Quarry"
                        : site.kind === "essence"
                          ? "Spring"
                          : site.kind === "ruins"
                            ? "Ruins"
                            : site.kind === "camp"
                              ? "Camp"
                              : "Shrine"}
                  </span>
                  <i className={`ownership owner-${site.owner}`} />
                </button>
              ))}
          </div>
          <div className="objective-hud">
            <Icon name="spark" size={17} />
            <span>ELDER SHRINE</span>
            <strong>{Math.floor(game.control)}%</strong>
            <div>
              <i style={{ width: `${Math.abs(game.control)}%` }} />
            </div>
          </div>
          <div className="map-tools">
            <button
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.65, z + 0.15))}
            >
              +
            </button>
            <button
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.15))}
            >
              −
            </button>
          </div>
          {mostRecent && !selectedCard && (
            <div className="game-event" key={mostRecent.id}>
              <Icon
                name={
                  mostRecent.kind === "gather"
                    ? (mostRecent.resource ?? "spark")
                    : mostRecent.kind === "capture"
                      ? "flag"
                      : "spark"
                }
                size={14}
              />
              {mostRecent.text}
            </div>
          )}
          {selectedCard && (
            <div className="tactical-preview">
              <CardArt card={CARD_BY_ID[selectedCard]!} />
              <div>
                <strong>{CARD_BY_ID[selectedCard]!.name}</strong>
                <span>
                  {CARD_BY_ID[selectedCard]!.cost} ENERGY ·{" "}
                  {CARD_BY_ID[selectedCard]!.role.toUpperCase()}
                </span>
              </div>
              <button
                className="icon-button"
                aria-label="Inspect selected card"
                onClick={() => setInspect(CARD_BY_ID[selectedCard]!)}
              >
                <Icon name="help" size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Cancel card selection"
                onClick={() => setSelectedCard(null)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
          <div className="world-bottom">
            <div className="commander-status">
              <div className="commander-portrait">
                <CardArt card={CARDS[0]!} />
                <span>{profile.level}</span>
              </div>
              <div className="commander-bars">
                <span>
                  YOUR WARDEN
                  <strong>
                    {Math.ceil(game.health)}
                    <small> / {game.maxHealth}</small>
                  </strong>
                </span>
                <div className="health-track">
                  <i
                    style={{
                      width: `${(game.health / game.maxHealth) * 100}%`,
                    }}
                  />
                </div>
                <span className="energy-label">
                  <Icon name="bolt" size={12} />
                  {Math.floor(game.energy)} / {game.maxEnergy}
                  <small>ENERGY</small>
                </span>
                <div className="energy-pips">
                  {Array.from({ length: game.maxEnergy }, (_, i) => (
                    <i
                      className={i < Math.floor(game.energy) ? "filled" : ""}
                      key={i}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="hand-area">
              <div className="hand-label">
                <span>
                  {selectedCard
                    ? `DEPLOY ${CARD_BY_ID[selectedCard]!.name.toUpperCase()}`
                    : "YOUR EXPEDITION DECK"}
                </span>
                <span>{game.crew.length} / 4 CREW</span>
              </div>
              <div className="card-hand">
                {game.deck.map((id, i) => {
                  const card = CARD_BY_ID[id]!,
                    cooldown = game.cooldowns[id] ?? 0;
                  return (
                    <button
                      key={id}
                      className={`hand-card ${selectedCard === id ? "selected" : ""} ${cooldown > 0 || game.energy < card.cost ? "unavailable" : ""}`}
                      onClick={() => {
                        if (cooldown > 0) {
                          notify(`Ready in ${Math.ceil(cooldown)}s`);
                          return;
                        }
                        if (game.energy < card.cost) {
                          notify(`Need ${card.cost} energy`);
                          return;
                        }
                        setSelectedCard(selectedCard === id ? null : id);
                        sound("tap");
                      }}
                      aria-label={`Select ${card.name}, ${card.cost} energy`}
                      aria-pressed={selectedCard === id}
                    >
                      <span className="key-hint">{i + 1}</span>
                      <CardFace card={card} small />
                      {cooldown > 0 && (
                        <div className="card-cooldown">
                          <span>{Math.ceil(cooldown)}</span>
                          <small>SEC</small>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="site-action">
              <div>
                <span className="section-kicker">{currentSite.name}</span>
                <strong>
                  {currentSite.kind === "shrine"
                    ? "Claim the shrine"
                    : currentSite.kind === "ruins"
                      ? "Search the ruins"
                      : currentSite.kind === "camp"
                        ? "Rest & recover"
                        : `${Math.ceil(currentSite.stock)} / ${currentSite.maxStock}`}
                  <small>
                    {currentSite.kind === "wood"
                      ? "TIMBER"
                      : currentSite.kind === "stone"
                        ? "STONE"
                        : currentSite.kind === "essence"
                          ? "ESSENCE"
                          : ""}
                  </small>
                </strong>
              </div>
              <button
                className={`primary-button ${selectedCard ? "deploy-button" : ""}`}
                onClick={() => {
                  if (selectedCard) deploy(selectedCard);
                  else {
                    setGame((g) => gather(g, selectedSite));
                    sound("gather");
                  }
                }}
              >
                <Icon
                  name={
                    selectedCard
                      ? "cards"
                      : (SITE_ICONS[currentSite.kind] ?? "sword")
                  }
                  size={17}
                />
                {selectedCard
                  ? "Deploy card"
                  : currentSite.kind === "shrine"
                    ? "Claim"
                    : currentSite.kind === "camp"
                      ? "Recover"
                      : "Gather"}
                <kbd>SPACE</kbd>
              </button>
            </div>
          </div>
        </section>
      )}
      {screen !== "world" && (
        <nav className="bottom-nav" aria-label="Game screens">
          <div className="player-badge">
            <div className="player-sigil">
              <Icon name="shield" />
            </div>
            <span>
              Moss & Ember<small>LEVEL {profile.level} · WOODLAND</small>
            </span>
          </div>
          <div className="nav-items">
            {(
              [
                { id: "home", icon: "home", label: "Camp" },
                { id: "collection", icon: "cards", label: "Collection" },
                { id: "packs", icon: "pack", label: "Packs" },
                { id: "clan", icon: "flag", label: "Clan" },
              ] as { id: Screen; icon: IconName; label: string }[]
            ).map((n) => (
              <button
                key={n.id}
                onClick={() => nav(n.id)}
                className={screen === n.id ? "active" : ""}
                aria-current={screen === n.id ? "page" : undefined}
              >
                <Icon name={n.icon} />
                <span>{n.label}</span>
                {n.id === "packs" && profile.packs > 0 && (
                  <b>{profile.packs}</b>
                )}
              </button>
            ))}
          </div>
          <span className="local-status">
            <i />
            {saveError ? "SAVE UNAVAILABLE" : "LOCAL SAVE"}
          </span>
        </nav>
      )}
      {toast && (
        <div role="status" className="toast">
          <Icon name="spark" size={16} />
          {toast}
        </div>
      )}
      {help && (
        <Modal label="How to play" onClose={() => setHelp(false)}>
          <span className="section-kicker">FIELD GUIDE</span>
          <h2>Make your clan count.</h2>
          <div className="guide-grid">
            <div>
              <span>01</span>
              <Icon name="map" />
              <strong>Choose a site</strong>
              <p>
                Tap a destination. Your warden travels there and gathers
                automatically.
              </p>
            </div>
            <div>
              <span>02</span>
              <Icon name="cards" />
              <strong>Deploy your cards</strong>
              <p>
                Select a card, then a site. Match crew affinities for bonus
                resources.
              </p>
            </div>
            <div>
              <span>03</span>
              <Icon name="flag" />
              <strong>Hold the shrine</strong>
              <p>
                Gather at the shrine to claim it. Hold for points. Return to
                camp to recover.
              </p>
            </div>
            <div>
              <span>04</span>
              <Icon name="crown" />
              <strong>Beat Ashclaw</strong>
              <p>
                Outscore the AI clan in three minutes. Earn gold and packs for
                your collection.
              </p>
            </div>
          </div>
          <div className="keyboard-guide">
            <span>
              <kbd>W A S D</kbd>Move
            </span>
            <span>
              <kbd>1–6</kbd>Choose card
            </span>
            <span>
              <kbd>SPACE</kbd>Act
            </span>
            <span>
              <kbd>ESC</kbd>Pause
            </span>
          </div>
          <details className="guide-details">
            <summary>Pack odds & local play</summary>
            <p>
              Each pack contains three cards with at least one rare or better.
              Packs cost earned gold. Your collection and results save in this
              browser. Expeditions run locally against an AI rival. No online
              matchmaking is connected.
            </p>
          </details>
          <button className="primary-button" onClick={() => setHelp(false)}>
            Into the wild
            <Icon name="arrow" />
          </button>
        </Modal>
      )}
      {inspect && (
        <Modal label={inspect.name} onClose={() => setInspect(null)}>
          <div className="card-detail">
            <CardFace card={inspect} />
            <div>
              <span className={`rarity-label rarity-${inspect.rarity}`}>
                {inspect.rarity}
              </span>
              <h2>{inspect.name}</h2>
              <span className="section-kicker">{inspect.role}</span>
              <p>{inspect.description}</p>
              <div className="detail-stats">
                <span>
                  <strong>{inspect.cost}</strong>ENERGY
                </span>
                <span>
                  <strong>{inspect.power}</strong>POWER
                </span>
                <span>
                  <strong>{inspect.cooldown}s</strong>COOLDOWN
                </span>
              </div>
              <span className="owned-detail">
                {profile.collection[inspect.id]
                  ? `${profile.collection[inspect.id]} in collection`
                  : "Undiscovered"}
              </span>
              {profile.collection[inspect.id] ? (
                <button
                  className="primary-button"
                  disabled={profile.deck.includes(inspect.id)}
                  onClick={() => equip(inspect)}
                >
                  {profile.deck.includes(inspect.id)
                    ? "In expedition deck"
                    : "Add to deck"}
                  <Icon name="cards" />
                </button>
              ) : (
                <button
                  className="outline-button"
                  onClick={() => {
                    setInspect(null);
                    nav("packs");
                  }}
                >
                  Find in packs
                  <Icon name="pack" />
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {swapCard && (
        <Modal label="Replace deck card" onClose={() => setSwapCard(null)}>
          <span className="section-kicker">EXPEDITION DECK</span>
          <h2>Make room for {swapCard.name}.</h2>
          <div className="swap-grid">
            {profile.deck.map((id) => (
              <button
                key={id}
                onClick={() => replaceCard(id)}
                aria-label={`Replace ${CARD_BY_ID[id]!.name}`}
              >
                <CardFace card={CARD_BY_ID[id]!} small />
                <span>REPLACE</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {screen === "world" && paused && !showResults && (
        <Modal
          label="Expedition paused"
          onClose={() => {
            setPaused(false);
            setRetreat(false);
          }}
        >
          <div className="pause-content">
            <RuneMark />
            <span className="section-kicker">TAKE A BREATH</span>
            <h2>Expedition paused.</h2>
            <span className="pause-time">
              {mm}:{ss}
            </span>
            <button className="primary-button" onClick={() => setPaused(false)}>
              <Icon name="play" />
              Resume expedition
            </button>
            <button className="outline-button" onClick={() => nav("home")}>
              Return to camp
            </button>
            {retreat ? (
              <div className="retreat-confirm">
                <span>ENDS THIS RUN</span>
                <button
                  className="danger-button"
                  onClick={() => {
                    setGame((g) => finishExpedition(g));
                    setRetreat(false);
                    setPaused(false);
                  }}
                >
                  End 1 expedition
                </button>
              </div>
            ) : (
              <button className="text-button" onClick={() => setRetreat(true)}>
                End expedition
              </button>
            )}
          </div>
        </Modal>
      )}
      {showResults && reward && (
        <Modal
          label="Expedition results"
          onClose={() => {
            setShowResults(false);
            nav("home");
          }}
        >
          <div className="results-content">
            <div className="victory-emblem">
              <Icon name={game.status === "won" ? "crown" : "flag"} size={45} />
            </div>
            <span className="section-kicker">WILDWOOD EXPEDITION</span>
            <h2>
              {game.status === "won"
                ? "The wild is yours."
                : game.status === "draw"
                  ? "Evenly matched."
                  : "A clan grows stronger."}
            </h2>
            <span className={`result-verdict ${game.status}`}>
              {game.status === "won"
                ? "VICTORY"
                : game.status === "draw"
                  ? "DRAW"
                  : "EXPEDITION COMPLETE"}
            </span>
            <div className="result-score">
              <span>
                MOSS & EMBER<strong>{Math.floor(game.score)}</strong>
              </span>
              <i>:</i>
              <span>
                ASHCLAW · AI<strong>{Math.floor(game.rivalScore)}</strong>
              </span>
            </div>
            <div className="reward-row">
              <span>
                <strong>+{reward.coins}</strong>GOLD
              </span>
              <span>
                <strong>+{reward.xp}</strong>XP
              </span>
              <span>
                <strong>+{reward.packs}</strong>PACKS
              </span>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                setShowResults(false);
                nav("packs");
              }}
            >
              Open your spoils
              <Icon name="pack" />
            </button>
            <div className="result-actions">
              <button className="text-button" onClick={enter}>
                Play again
              </button>
              <button className="text-button" onClick={share}>
                Share challenge
                <Icon name="arrow" size={14} />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
