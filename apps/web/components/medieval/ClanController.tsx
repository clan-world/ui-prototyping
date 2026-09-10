"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BUILDING_SPECS,
  isPlayerBuilding,
  createClanWorld,
  tickClan,
  issueOrder,
  canPlaceBuilding,
  recruitClansman,
  loadClanWorld,
  saveClanWorld,
  equipClanDoctrine,
  type BuildingKind,
  type ClanOrder,
  type ClanUnit,
  type ClanWorld,
  type Point,
} from "@clan-world/shared";
import { OBJECT_ART } from "../../lib/medieval/sprites";
import { ClanMap, MiniMap, type MapHandle, type MapTarget, type CameraState } from "./ClanMap";
import { PixelIcon, type PixelIconName } from "./PixelIcon";
import { SpritePortrait } from "./SpritePortrait";
import {
  CHARTERS,
  CHARTER_SAVE_KEY,
  createArchive,
  readArchive,
  ripCharters,
  type Charter,
  type CharterArchive,
} from "../../lib/medieval/charters";
import { sound, setSound } from "../../lib/audio";

type Panel = "clan" | "build" | "chronicle";
type Command = "context" | "move" | "gather" | "guard" | "rally";
const buildKinds = Object.keys(BUILDING_SPECS) as BuildingKind[];
const titleCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
const resourceIcons: Record<string, PixelIconName> = {
  timber: "wood",
  stone: "stone",
  food: "food",
  iron: "iron",
  gold: "gold",
};
const jobIcon = (unit: ClanUnit): PixelIconName =>
  unit.role === "elder"
    ? "crown"
    : unit.status === "idle"
      ? "people"
      : unit.status === "building"
        ? "hammer"
        : unit.carrying
          ? "return"
          : /wood|lumber/i.test(unit.job)
            ? "axe"
            : /farm|food/i.test(unit.job)
              ? "food"
              : /mine|stone|iron/i.test(unit.job)
                ? "pick"
                : unit.role === "guard"
                  ? "shield"
                  : "move";

function GameDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close.current();
      }
      if (e.key === "Tab") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) ?? [],
        );
        if (!items.length) return;
        const first = items[0]!,
          last = items.at(-1)!;
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      old?.focus();
    };
  }, []);
  return (
    <div className="game-dialog-backdrop">
      <div
        ref={ref}
        tabIndex={-1}
        className="game-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-titlebar">
          <span>{title}</span>
          <button
            className="metal-button close-button"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CharterCard({
  card,
  owned = true,
  active = false,
  onClick,
}: {
  card: Charter;
  owned?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`charter-card charter-${card.rarity} ${owned ? "" : "unowned"} ${active ? "ratified" : ""}`}
      onClick={onClick}
      disabled={!owned}
      aria-label={`${card.name}${active ? ", ratified" : ""}`}
    >
      <span className="charter-corners" />
      <div className="charter-card-header">
        <span>CLAN CHARTER</span>
        <b>{card.symbol}</b>
      </div>
      <div className="charter-illustration">
        <SpritePortrait building={card.building} object={card.object} />
      </div>
      <h3>{card.name}</h3>
      <span className="charter-effect">{card.effect}</span>
      <span className="charter-rarity">
        {active ? "RATIFIED" : card.rarity}
      </span>
    </button>
  );
}

export default function ClanController() {
  const [world, setWorld] = useState<ClanWorld>(() => createClanWorld()),
    [archive, setArchive] = useState<CharterArchive>(createArchive),
    [selected, setSelected] = useState<string[]>(["elder"]),
    [panel, setPanel] = useState<Panel>("clan"),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [showOrders, setShowOrders] = useState(true),
    [showNames, setShowNames] = useState(false),
    [drawer, setDrawer] = useState(true),
    [buildKind, setBuildKind] = useState<BuildingKind | null>(null),
    [command, setCommand] = useState<Command>("context"),
    [inspected, setInspected] = useState<MapTarget | null>(null),
    [filter, setFilter] = useState("all"),
    [message, setMessage] = useState(""),
    [help, setHelp] = useState(false),
    [chartersOpen, setChartersOpen] = useState(false),
    [packOpen, setPackOpen] = useState(false),
    [packPhase, setPackPhase] = useState<"sealed" | "ripping" | "cards">(
      "sealed",
    ),
    [revealed, setRevealed] = useState<Charter[]>([]),
    [flipped, setFlipped] = useState(0),
    [muted, setMuted] = useState(false),
    [mapReady, setMapReady] = useState(false),
    [loaded, setLoaded] = useState(false),
    [saved, setSaved] = useState(true),
    [resetPrompt, setResetPrompt] = useState(false),
    [mapSmall, setMapSmall] = useState(false),
    [camera, setCamera] = useState<CameraState | undefined>();
  const map = useRef<MapHandle>(null),
    worldRef = useRef(world),
    archiveRef = useRef(archive),
    ui = useRef({
      paused,
      speed,
      help,
      chartersOpen,
      packOpen,
      selected,
      buildKind,
      command,
    }),
    startRip = useRef<number | null>(null),
    ripTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  worldRef.current = world;
  archiveRef.current = archive;
  ui.current = {
    paused,
    speed,
    help,
    chartersOpen,
    packOpen,
    selected,
    buildKind,
    command,
  };
  const notify = useCallback((text: string) => setMessage(text), []);
  useEffect(() => {
    try {
      const village = loadClanWorld(localStorage),
        book = readArchive();
      const active = CHARTERS.find((c) => c.id === book.active);
      setWorld(equipClanDoctrine(village, active?.doctrine ?? null));
      setArchive(book);
    } catch {
      setSaved(false);
    }
    if ((window.innerWidth < 701 || window.innerHeight < 500)) setDrawer(false);
    setLoaded(true);
    return () => timers.current.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CHARTER_SAVE_KEY, JSON.stringify(archive));
    } catch {
      setSaved(false);
    }
  }, [archive, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const save = () => {
      try {
        setSaved(saveClanWorld(worldRef.current, localStorage));
      } catch {
        setSaved(false);
      }
    };
    const id = setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", save);
      save();
    };
  }, [loaded]);
  useEffect(() => {
    if (!loaded || !mapReady) return;
    const id = setInterval(() => {
      const u = ui.current;
      if (u.paused || u.help || u.chartersOpen || u.packOpen || document.hidden)
        return;
      setWorld((current) => tickClan(current, 0.1 * u.speed));
    }, 100);
    return () => clearInterval(id);
  }, [loaded, mapReady]);
  useEffect(() => {
    if (!loaded) return;
    const milestone = Math.floor(world.stats.gathered / 150);
    if (milestone > archive.earned) {
      const bonus = milestone - archive.earned;
      setArchive((a) => ({ ...a, packs: a.packs + bonus, earned: milestone }));
      notify("Clan milestone: a sealed charter earned.");
      sound("reveal");
    }
  }, [world.stats.gathered, archive.earned, loaded, notify]);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 4200);
    return () => clearTimeout(id);
  }, [message]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.matches("input,textarea") ||
        ui.current.help ||
        ui.current.chartersOpen ||
        ui.current.packOpen
      )
        return;
      switch (e.key.toLowerCase()) {
        case "e":
          e.preventDefault();
          selectElder();
          break;
        case "p":
          setPaused((v) => !v);
          break;
        case "m":
          setCommand("move");
          break;
        case "g":
          setCommand("gather");
          break;
        case "b":
          setPanel("build");
          setDrawer(true);
          break;
        case "r":
          send({ type: "return" });
          break;
        case "f":
          send({ type: "follow" });
          break;
        case "escape":
          setBuildKind(null);
          setCommand("context");
          setDrawer(false);
          break;
        case "1":
          setSelected(
            worldRef.current.units
              .filter((u) => u.role !== "elder")
              .map((u) => u.id),
          );
          break;
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function send(order: ClanOrder, ids = ui.current.selected, append = false) {
    if (!ids.length) {
      notify("Select one or more clansmen first.");
      return;
    }
    const next = issueOrder(worldRef.current, ids, order, append);
    setWorld(next);
    setCommand("context");
    if (order.type === "build") setBuildKind(null);
    sound("tap");
    notify(next.logs.at(-1)?.text ?? "Orders given.");
  }
  function selectElder() {
    const elder = worldRef.current.units.find((u) => u.role === "elder")!;
    setSelected([elder.id]);
    map.current?.focus(elder);
    setInspected(null);
  }
  function selectUnits(ids: string[], append = false) {
    setSelected((current) =>
      append ? [...new Set([...current, ...ids])] : ids,
    );
    setInspected(null);
    setBuildKind(null);
    setCommand("context");
    sound("tap");
  }
  function contextTarget(
    target: MapTarget,
    secondary: boolean,
    append: boolean,
  ) {
    if (buildKind) {
      const spec = BUILDING_SPECS[buildKind];
      const x = Math.floor(target.x - spec.w / 2),
        y = Math.floor(target.y - spec.h / 2);
      const place = canPlaceBuilding(worldRef.current, buildKind, x, y);
      if (!place.ok) {
        notify(place.reason ?? "This site is obstructed.");
        sound("error");
        return;
      }
      let builders = selected.filter((id) =>
        world.units.find((u) => u.id === id),
      );
      if (!builders.length)
        builders = world.units
          .filter((u) => u.role !== "elder" && u.status === "idle")
          .slice(0, 2)
          .map((u) => u.id);
      if (!builders.length) {
        notify("Select builders before placing a building.");
        return;
      }
      send({ type: "build", buildingKind: buildKind, x, y }, builders, append);
      return;
    }
    if (selected.length && ["move", "rally", "guard"].includes(command)) {
      send(
        {
          type: command as "move" | "rally" | "guard",
          x: target.x,
          y: target.y,
        },
        selected,
        append,
      );
      return;
    }
    if (command === "gather" && target.type === "ground") {
      notify("Choose trees, ore, berries, or a farm.");
      return;
    }
    if (target.type === "object") {
      if (selected.length) {
        send({ type: "gather", targetId: target.id! }, selected, append);
      } else setInspected(target);
      return;
    }
    if (target.type === "building") {
      const b = world.buildings.find((b) => b.id === target.id)!;
      if (selected.length && (b.progress < 1 || b.kind === "farm"))
        send(
          { type: b.progress < 1 ? "construct" : "gather", targetId: b.id },
          selected,
          append,
        );
      else if (
        secondary &&
        selected.length &&
        ["hall", "lumber", "mine", "storehouse"].includes(b.kind)
      )
        send({ type: "return" }, selected, append);
      else setInspected(target);
      return;
    }
    if (selected.length) {
      const type =
        command === "guard" ? "guard" : command === "rally" ? "rally" : "move";
      send({ type, x: target.x, y: target.y }, selected, append);
    } else setInspected(target);
  }
  function quickGather(kind: "timber" | "stone" | "food" | "iron") {
    if (!selected.length) {
      notify("Select your workers first.");
      return;
    }
    const chosen = world.units.find((u) => selected.includes(u.id))!;
    if (kind === "food") {
      const farm = world.buildings.find(
        (b) => b.kind === "farm" && b.progress === 1 && isPlayerBuilding(world, b),
      );
      if (farm) {
        send({ type: "gather", targetId: farm.id });
        return;
      }
    }
    const options = world.objects
      .filter(
        (o) =>
          o.stock > 0 &&
          (kind === "timber"
            ? ["tree", "oak", "pine"].includes(o.kind)
            : kind === "stone"
              ? o.kind === "rock"
              : kind === "iron"
                ? o.kind === "iron"
                : o.kind === "berry"),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - chosen.x, a.y - chosen.y) -
          Math.hypot(b.x - chosen.x, b.y - chosen.y),
      );
    if (options[0]) send({ type: "gather", targetId: options[0].id });
  }
  function recruit() {
    const next = recruitClansman(worldRef.current);
    setWorld(next);
    notify(next.logs.at(-1)?.text ?? "Clansman recruited.");
    if (next.units.length > world.units.length) {
      setSelected([next.units.at(-1)!.id]);
      sound("deploy");
    }
  }
  function chooseBuild(kind: BuildingKind) {
    setBuildKind(kind);
    setCommand("context");
    setInspected(null);
    setDrawer(false);
    notify(`Place ${BUILDING_SPECS[kind].name.toLowerCase()} on clear ground.`);
    sound("tap");
  }
  function ratify(card: Charter) {
    if (!archive.owned[card.id]) return;
    setArchive((a) => ({ ...a, active: card.id }));
    setWorld((w) => equipClanDoctrine(w, card.doctrine));
    notify(`${card.name} ratified.`);
    sound("deploy");
  }
  function openPack() {
    if (packPhase !== "sealed" || archiveRef.current.packs < 1) return;
    const result = ripCharters(archiveRef.current);
    setArchive(result.archive);
    archiveRef.current = result.archive;
    setRevealed(result.cards);
    setFlipped(0);
    setPackPhase("ripping");
    sound("rip");
    ripTimer.current = setTimeout(() => {
      setPackPhase("cards");
      sound("reveal");
      ripTimer.current = null;
    }, 850);
    timers.current.push(ripTimer.current);
  }
  function buyPack() {
    if (worldRef.current.resources.gold < 40) {
      notify("A sealed charter costs 40 gold.");
      return;
    }
    setWorld((w) => ({
      ...w,
      resources: { ...w.resources, gold: w.resources.gold - 40 },
    }));
    setArchive((a) => ({ ...a, packs: a.packs + 1 }));
    sound("tap");
  }
  function closePack() {
    if (ripTimer.current) {
      clearTimeout(ripTimer.current);
      ripTimer.current = null;
    }
    startRip.current = null;
    setPackOpen(false);
    setPackPhase("sealed");
    setRevealed([]);
  }
  function saveNow() {
    let ok = false;
    try {
      ok = saveClanWorld(worldRef.current, localStorage);
    } catch {}
    setSaved(ok);
    notify(ok ? "Village saved." : "Unable to save on this device.");
  }
  const chosen = world.units.filter((u) => selected.includes(u.id)),
    leader = chosen[0] ?? world.units[0]!,
    idle = world.units.filter(
      (u) => u.status === "idle" && u.role !== "elder",
    ).length,
    active = CHARTERS.find((c) => c.id === archive.active),
    inspectBuilding =
      inspected?.type === "building"
        ? world.buildings.find((b) => b.id === inspected.id)
        : null,
    inspectObject =
      inspected?.type === "object"
        ? world.objects.find((o) => o.id === inspected.id)
        : null;
  const unitRows = world.units.filter(
    (u) =>
      filter === "all" ||
      (filter === "idle" && u.status === "idle") ||
      (filter === "working" && u.status !== "idle"),
  );
  const mapReadyCallback = useCallback(() => setMapReady(true), []);
  const cameraCallback = useCallback((next: CameraState) => setCamera(next), []);
  function togglePanel(next: Panel) {
    setDrawer((open) => panel === next ? !open : true);
    setPanel(next);
    sound("tap");
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify("Fullscreen is unavailable in this browser.");
    }
  }
  return (
    <main className="clan-game immersive-game">
      <header className="resource-bar">
        <button
          className="clan-wordmark"
          onClick={selectElder}
          aria-label="Select and center Elder"
        >
          <span className="wordmark-art" aria-hidden="true" />
          <span className="mobile-crest" aria-hidden="true"><PixelIcon name="crown" size={24} /></span>
        </button>
        <div className="resource-counters">
          {(["timber", "stone", "food", "iron", "gold"] as const).map(
            (resource) => (
              <div
                className={`resource-counter counter-${resource}`}
                key={resource}
                title={titleCase(resource)}
              >
                <PixelIcon name={resourceIcons[resource]!} size={25} />
                <span data-resource={resource}>
                  {Math.floor(world.resources[resource])}
                </span>
                <small>
                  {resource === "timber" ? "Wood" : titleCase(resource)}
                </small>
              </div>
            ),
          )}
        </div>
        <div className="population-counter" title="Population and housing">
          <PixelIcon name="people" />
          <span>
            {world.population}
            <small>/{world.maxPopulation}</small>
          </span>
        </div>
        <div className="time-controls">
          <span className="world-day">Day {world.day}</span>
          <button
            className={`metal-button pause-toggle ${paused ? "engaged" : ""}`}
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "Resume village" : "Pause village"}
          >
            <PixelIcon name={paused ? "play" : "pause"} size={18} />
          </button>
          <button
            className="speed-button metal-button"
            onClick={() => setSpeed((v) => (v === 1 ? 2 : v === 2 ? 4 : 1))}
            aria-label={`Simulation speed ${speed}x`}
          >
            {speed}×
          </button>
        </div>
      </header>
      <section className="world-viewport" data-camera-x={camera?.x} data-camera-y={camera?.y} data-camera-zoom={camera?.zoom}>
        <ClanMap
          ref={map}
          world={world}
          selected={selected}
          buildKind={buildKind}
          command={command}
          showOrders={showOrders}
          showNames={showNames}
          paused={paused || help || chartersOpen || packOpen}
          onSelect={selectUnits}
          onTarget={contextTarget}
          onReady={mapReadyCallback}
          onCameraChange={cameraCallback}
        />
        <div className="map-location">
          <small>THE CLANLANDS</small>
          <span>{camera?.region ?? "Elders’ Reach"}</span>
        </div>
        <div className="map-options">
          <button className={`metal-button ${showOrders ? "engaged" : ""}`} onClick={() => setShowOrders(!showOrders)} aria-pressed={showOrders} title="Show selected paths" aria-label="Show selected paths"><PixelIcon name="move" /></button>
          <button className={`metal-button ${showNames ? "engaged" : ""}`} onClick={() => setShowNames(!showNames)} aria-pressed={showNames} title="Show names" aria-label="Show names"><PixelIcon name="people" /></button>
          <button className="metal-button" onClick={toggleFullscreen} title="Toggle fullscreen" aria-label="Toggle fullscreen">⛶</button>
          <button className="metal-button" onClick={() => setHelp(true)} aria-label="Open field manual" title="Field manual">?</button>
        </div>
        {paused && <div className="paused-ribbon">Paused</div>}
        {buildKind && (
          <div className="placement-label">
            <PixelIcon name="hammer" size={20} />
            <span>{BUILDING_SPECS[buildKind].name}</span>
            <button
              onClick={() => setBuildKind(null)}
              aria-label="Cancel placement"
            >
              ×
            </button>
          </div>
        )}
        {message && (
          <div className="order-message" role="status">
            <PixelIcon name="flag" size={16} />
            {message}
          </div>
        )}
      </section>
      <nav className="realm-tools" aria-label="Realm tools">
        <button className={drawer && panel === "clan" ? "active" : ""} onClick={() => togglePanel("clan")} title="Clansmen" aria-label="Toggle clansmen"><PixelIcon name="people" size={26} /><b>{world.population}</b></button>
        <button className={drawer && panel === "build" ? "active" : ""} onClick={() => togglePanel("build")} title="Build village (B)" aria-label="Toggle build menu"><PixelIcon name="hammer" size={26} /></button>
        <button onClick={() => setChartersOpen(true)} title="Clan charters" aria-label="Open clan charters"><PixelIcon name="book" size={26} /></button>
        <button onClick={() => { setPackOpen(true); setPackPhase("sealed"); }} title="Sealed charters" aria-label="Open sealed charters"><span className="tiny-wax-seal">M</span><b>{archive.packs}</b></button>
        <button className={drawer && panel === "chronicle" ? "active" : ""} onClick={() => togglePanel("chronicle")} title="Chronicle" aria-label="Toggle chronicle"><PixelIcon name="flag" size={26} /></button>
      </nav>
      <button className="monument-objective" onClick={() => { map.current?.zoomTo(1.15); map.current?.focus({ x: world.monument.x + world.monument.w / 2, y: world.monument.y + world.monument.h / 2 }); }} title="The realm monument. Construction progression is reserved for the balancing pass." aria-label="Find the realm monument">
        <span className="monument-sigil" aria-hidden="true">♜</span>
        <span><small>REALM MONUMENT</small><strong>{world.monument.name.replace(/^The /, "")}</strong><i><b style={{ width: `${world.monument.progress * 100}%` }} /></i></span>
        <em>{Math.round(world.monument.progress * 100)}<small>%</small></em>
      </button>
      <section className={`minimap-block realm-minimap ${mapSmall ? "mobile-minimap-open" : ""}`} aria-label="World map">
        <div className="minimap-heading"><PixelIcon name="eye" size={16} /><span>THE CLANLANDS</span><span className="compass-north">N ↑</span></div>
        <MiniMap world={world} camera={camera} onFocus={(p) => map.current?.focus(p)} />
        <div className="minimap-controls">
          <button className="metal-button" aria-label="Zoom out" onClick={() => map.current?.zoom(-0.2)}>−</button>
          <button className="zoom-readout" title="View the whole realm" aria-label="View the whole realm" onClick={() => { setDrawer(false); map.current?.zoomTo(0.35); }}>{Math.round((camera?.zoom ?? 1) * 100)}%</button>
          <button className="metal-button" aria-label="Zoom in" onClick={() => map.current?.zoom(0.2)}>+</button>
          <button className="metal-button" aria-label="Center selection" title="Center selection" onClick={() => map.current?.focus(leader)}><PixelIcon name="eye" size={19} /></button>
          <button className="metal-button" aria-label="Center village" title="Center village" onClick={() => map.current?.reset()}><PixelIcon name="crown" size={19} /></button>
        </div>
      </section>
      <aside className={`clan-sidebar ${drawer ? "drawer-open" : ""}`}>
        <div className="clan-sidebar-heading">
          <span className="clan-crest">
            <PixelIcon name="crown" size={20} />
          </span>
          <div>
            <h1>Mossfell Clan</h1>
            <span>{world.population} CLANSMEN · {idle} IDLE</span>
          </div>
          <button
            className="mobile-close metal-button"
            aria-label="Close clan panel"
            onClick={() => setDrawer(false)}
          >
            ×
          </button>
        </div>
        <div className="sidebar-tabs" role="tablist" aria-label="Clan panels">
          {(
            [
              { id: "clan", name: "Clansmen" },
              { id: "build", name: "Village" },
              { id: "chronicle", name: "Chronicle" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              className={panel === tab.id ? "selected" : ""}
              role="tab"
              aria-selected={panel === tab.id}
              onClick={() => setPanel(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </div>
        {panel === "clan" && (
          <>
            <div className="roster-toolbar">
              <div>
                {["all", "working", "idle"].map((f) => (
                  <button
                    className={filter === f ? "selected" : ""}
                    key={f}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all"
                      ? `All ${world.population}`
                      : f === "idle"
                        ? `Idle ${idle}`
                        : "Working"}
                  </button>
                ))}
              </div>
              <button
                className="roster-all"
                onClick={() =>
                  selectUnits(
                    world.units
                      .filter((u) => u.role !== "elder")
                      .map((u) => u.id),
                  )
                }
              >
                Select all
              </button>
            </div>
            <div className="clan-roster">
              {unitRows.map((u) => (
                <button
                  className={`unit-row ${selected.includes(u.id) ? "unit-selected" : ""} ${u.role === "elder" ? "elder-row" : ""}`}
                  key={u.id}
                  onClick={(e) => selectUnits([u.id], e.shiftKey)}
                  onDoubleClick={() => map.current?.focus(u)}
                  aria-label={`Select ${u.name}, ${u.status}`}
                  title={`${u.name} · ${u.job} · ${u.status}`}
                  aria-pressed={selected.includes(u.id)}
                >
                  <span className="roster-portrait">
                    <SpritePortrait unit={u} />
                  </span>
                  <span className="unit-row-text">
                    <strong>{u.name.replace(/^Elder /, "")}</strong>
                    <small>
                      {u.role === "elder" ? "Clan Elder" : u.job} <i>·</i>{" "}
                      {titleCase(u.status)}
                    </small>
                  </span>
                  <span className="unit-row-status">
                    <PixelIcon name={jobIcon(u)} size={18} />
                    {u.carrying && <small>{u.carrying.amount}</small>}
                  </span>
                </button>
              ))}
            </div>
            <div className="roster-footer">
              <button className="wood-button recruit-button" onClick={recruit} title="Recruit clansman: 30 food, 20 gold">
                <PixelIcon name="people" size={20} />
                <span>
                  Recruit clansman<small>30 food · 20 gold</small>
                </span>
              </button>
              <span className="village-sentiment">
                <i />
                Clan spirit <b>{Math.round(world.happiness)}%</b>
              </span>
            </div>
          </>
        )}
        {panel === "build" && (
          <div className="build-roster">
            <div className="build-roster-heading">
              Raise a village
              <span>
                {world.buildings.filter((b) => b.progress === 1 && isPlayerBuilding(world, b)).length}{" "}
                buildings
              </span>
            </div>
            <div className="building-palette">
              {buildKinds
                .filter((k) => k !== "hall")
                .map((kind) => {
                  const spec = BUILDING_SPECS[kind];
                  return (
                    <button
                      key={kind}
                      className={`building-choice ${buildKind === kind ? "building-selected" : ""}`}
                      onClick={() => chooseBuild(kind)}
                      aria-label={`Build ${spec.name}`}
                      title={spec.description}
                    >
                      <SpritePortrait building={kind} />
                      <strong>{spec.name}</strong>
                      <span>
                        {Object.entries(spec.cost).map(([r, n]) => (
                          <i key={r}>
                            <PixelIcon name={resourceIcons[r]!} size={12} />
                            {n}
                          </i>
                        ))}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
        {panel === "chronicle" && (
          <div className="chronicle-panel">
            <div className="chronicle-date">
              THE MOSSFELL CHRONICLE<small>Day {world.day}</small>
            </div>
            {world.logs
              .slice(-15)
              .reverse()
              .map((log) => (
                <div className={`chronicle-entry log-${log.kind}`} key={log.id}>
                  <span>
                    {String(Math.floor(log.at / 60)).padStart(2, "0")}:
                    {String(Math.floor(log.at % 60)).padStart(2, "0")}
                  </span>
                  <p>{log.text}</p>
                </div>
              ))}
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="charter-milestone">
            <span>
              Next charter<b>{world.stats.gathered % 150} / 150</b>
            </span>
            <i>
              <b style={{ width: `${(world.stats.gathered % 150) / 1.5}%` }} />
            </i>
          </div>
          <button onClick={() => setChartersOpen(true)}>
            <PixelIcon name="book" size={18} />
            <span>Clan charters</span>
            <b>{CHARTERS.filter((c) => archive.owned[c.id]).length}/9</b>
          </button>
          <button
            onClick={() => {
              setPackOpen(true);
              setPackPhase("sealed");
            }}
          >
            <span className="tiny-wax-seal">M</span>
            <span>Sealed charters</span>
            <b>{archive.packs}</b>
          </button>
        </div>
      </aside>
      <footer className="command-console">
        <section className="selection-panel">
          <div className="selection-portrait">
            <SpritePortrait
              unit={!inspectBuilding && !inspectObject ? leader : undefined}
              building={inspectBuilding?.kind}
              object={
                inspectObject ? OBJECT_ART[inspectObject.kind] : undefined
              }
              large
            />
            <span>
              {inspectBuilding
                ? "VILLAGE"
                : inspectObject
                  ? "RESOURCE"
                  : leader.role === "elder"
                    ? "ELDER"
                    : leader.job.toUpperCase()}
            </span>
          </div>
          <div className="selection-info">
            <div className="selected-title">
              <h2>
                {inspectBuilding
                  ? BUILDING_SPECS[inspectBuilding.kind].name
                  : inspectObject
                    ? titleCase(inspectObject.kind)
                    : chosen.length > 1
                      ? `${chosen.length} clansmen`
                      : chosen.length === 1
                        ? leader.name
                        : "Mossfell clan"}
              </h2>
              <span>
                {inspectBuilding
                  ? `${Math.floor(inspectBuilding.progress * 100)}% complete`
                  : inspectObject
                    ? `${inspectObject.stock} remaining`
                    : chosen.length === 1
                      ? leader.role === "elder"
                        ? "Elder · Inspiration +35%"
                        : `${leader.job} · ${leader.status}`
                      : "Group command"}
              </span>
            </div>
            {inspectBuilding || inspectObject ? (
              <div className="inspection-detail">
                {inspectBuilding ? (
                  <>
                    <span>
                      {BUILDING_SPECS[inspectBuilding.kind].description}
                    </span>
                    <b>
                      {inspectBuilding.w} × {inspectBuilding.h} tiles
                    </b>
                  </>
                ) : (
                  <>
                    <span>
                      {inspectObject!.stock} / {inspectObject!.maxStock}
                    </span>
                    <b>Available to gather</b>
                  </>
                )}
              </div>
            ) : (
              <div className="selection-bars">
                <span>
                  Health
                  <i>
                    <b style={{ width: `${leader.hp}%` }} />
                  </i>
                  <small>{Math.floor(leader.hp)}</small>
                </span>
                <span>
                  Vigour
                  <i>
                    <b style={{ width: `${leader.energy}%` }} />
                  </i>
                  <small>{Math.floor(leader.energy)}</small>
                </span>
              </div>
            )}
            <div className="unit-order-state">
              <PixelIcon name={jobIcon(leader)} size={17} />
              <span>
                {chosen.length
                  ? leader.order
                    ? leader.status === "returning"
                      ? `Carrying ${leader.carrying?.amount ?? 0} ${leader.carrying?.resource ?? ""}`
                      : leader.status === "working"
                        ? `Working: ${leader.job}`
                        : leader.status === "walking"
                          ? `${titleCase(leader.order.type)} order`
                          : `${titleCase(leader.status)}`
                    : "Awaiting orders"
                  : "No selection"}
                {leader.queue.length ? ` · ${leader.queue.length} queued` : ""}
              </span>
            </div>
          </div>
        </section>
        <section className="order-controls">
          <div className="command-caption">
            <span>{buildKind ? "PLACE A BUILDING" : "COMMANDS"}</span>
            <span>
              {command === "context"
                ? "RIGHT-CLICK TO ORDER"
                : `${command.toUpperCase()}: SELECT A LOCATION`}
            </span>
          </div>
          <div className="order-button-grid">
            <button
              className={command === "move" ? "order-active" : ""}
              onClick={() => {
                setCommand("move");
                setBuildKind(null);
              }}
              title="Move to a location (M)"
            >
              <PixelIcon name="move" />
              <span>Move</span>
              <kbd>M</kbd>
            </button>
            <button
              className={command === "gather" ? "order-active" : ""}
              onClick={() => {
                setCommand("gather");
                setBuildKind(null);
              }}
              title="Select a resource to gather (G)"
            >
              <PixelIcon name="axe" />
              <span>Work</span>
              <kbd>G</kbd>
            </button>
            <button
              className={panel === "build" ? "order-active" : ""}
              onClick={() => {
                setPanel("build");
                setDrawer(true);
              }}
              title="Build a structure (B)"
            >
              <PixelIcon name="hammer" />
              <span>Build</span>
              <kbd>B</kbd>
            </button>
            <button
              onClick={() => send({ type: "return" })}
              title="Deliver cargo to storage (R)"
            >
              <PixelIcon name="return" />
              <span>Return</span>
              <kbd>R</kbd>
            </button>
            <button
              onClick={() => send({ type: "follow" })}
              title="Follow the Elder (F)"
            >
              <PixelIcon name="follow" />
              <span>Follow</span>
              <kbd>F</kbd>
            </button>
            <button
              onClick={() => send({ type: "stop" })}
              title="Stop selected orders"
            >
              <PixelIcon name="stop" />
              <span>Stop</span>
            </button>
          </div>
        </section>
        <section className="task-controls">
          <div className="command-caption">ASSIGN WORK</div>
          <div className="quick-task-grid">
            <button
              onClick={() => quickGather("timber")}
              aria-label="Assign selected to gather timber"
            >
              <PixelIcon name="axe" />
              <span>Timber</span>
            </button>
            <button
              onClick={() => quickGather("stone")}
              aria-label="Assign selected to quarry stone"
            >
              <PixelIcon name="pick" />
              <span>Stone</span>
            </button>
            <button
              onClick={() => quickGather("food")}
              aria-label="Assign selected to harvest food"
            >
              <PixelIcon name="food" />
              <span>Harvest</span>
            </button>
            <button
              onClick={() => {
                setCommand("rally");
                setSelected(world.units.map((u) => u.id));
                notify("Choose a rally point for the clan.");
              }}
              aria-label="Rally the clan"
            >
              <PixelIcon name="flag" />
              <span>Rally</span>
            </button>
          </div>
          <button className="elder-focus" onClick={selectElder}>
            <PixelIcon name="crown" size={16} />
            Find Elder<kbd>E</kbd>
          </button>
        </section>
      </footer>
      <div className="bottom-status">
        <span>
          <i className={saved ? "save-dot" : "save-dot failed"} />
          {saved ? "Saved" : "Save unavailable"}
        </span>
        <span>CLAN WORLD · THE CLANLANDS</span>
        <div>
          <button
            onClick={() => {
              setMuted(!muted);
              setSound(muted);
            }}
          >
            Sound {muted ? "off" : "on"}
          </button>
          <button onClick={saveNow}>Save</button>
          <button onClick={() => setHelp(true)}>Menu</button>
        </div>
      </div>
      <div className="mobile-game-tabs">
        <button
          className={drawer && panel === "clan" ? "active" : ""}
          onClick={() => {
            setDrawer(!(drawer && panel === "clan"));
            setPanel("clan");
            setMapSmall(false);
          }}
        >
          <PixelIcon name="people" size={18} />
          Clan
        </button>
        <button
          className={drawer && panel === "build" ? "active" : ""}
          onClick={() => {
            setDrawer(!(drawer && panel === "build"));
            setPanel("build");
            setMapSmall(false);
          }}
        >
          <PixelIcon name="hammer" size={18} />
          Build
        </button>
        <button
          onClick={() => {
            setDrawer(false);
            setMapSmall(!mapSmall);
          }}
        >
          <PixelIcon name="eye" size={18} />
          Map
        </button>
        <button onClick={() => setChartersOpen(true)}>
          <PixelIcon name="book" size={18} />
          Charters
        </button>
      </div>
      {help && (
        <GameDialog
          title="The Elder’s field manual"
          onClose={() => {
            setHelp(false);
            setResetPrompt(false);
          }}
        >
          <div className="manual-body">
            <h2>You are the Elder.</h2>
            <p>
              Select your clansmen and give them work. They travel, gather,
              carry supplies home, and return to their jobs.
            </p>
            <div className="manual-controls">
              <div>
                <kbd>CLICK</kbd>
                <span>Select a clansman. Drag a box for groups.</span>
              </div>
              <div>
                <kbd>RIGHT CLICK</kbd>
                <span>Move, work, or deliver at the target.</span>
              </div>
              <div>
                <kbd>SHIFT</kbd>
                <span>Add to selection or queue an order.</span>
              </div>
              <div>
                <kbd>W A S D</kbd>
                <span>Pan the map. Wheel zooms.</span>
              </div>
              <div>
                <kbd>E</kbd>
                <span>Find and select Elder Aldric.</span>
              </div>
              <div>
                <kbd>P</kbd>
                <span>Pause or resume the village.</span>
              </div>
            </div>
            <h3>On a touch screen</h3>
            <p>
              Tap a clansman, then a location or resource. Drag the land to pan.
              Pinch to zoom. The Clan panel lists every person.
            </p>
            <h3>Build a household</h3>
            <p>
              Gather timber and stone, build cottages, and recruit with food and
              gold. Nearby workers gain the Elder’s inspiration. Charters
              strengthen the whole clan; only one is ratified at a time. Every
              150 resources delivered earns a sealed charter.
            </p>
            <div className="manual-actions">
              <button className="wood-button" onClick={() => setHelp(false)}>
                Return to the village
              </button>
              <button className="metal-button" onClick={saveNow}>
                Save village
              </button>
              <button
                className="metal-button"
                onClick={() => setResetPrompt(true)}
              >
                New settlement
              </button>
            </div>
            {resetPrompt && (
              <div className="new-village-confirm">
                <strong>Replaces this village. Charters remain.</strong>
                <button
                  className="wood-button destructive"
                  onClick={() => {
                    const doctrine = CHARTERS.find(
                      (c) => c.id === archiveRef.current.active,
                    )?.doctrine;
                    const next = equipClanDoctrine(
                      createClanWorld(Math.floor(Math.random() * 2147483647)),
                      doctrine ?? null,
                    );
                    setWorld(next);
                    setSelected(["elder"]);
                    setArchive((a) => ({ ...a, earned: 0 }));
                    setHelp(false);
                    setResetPrompt(false);
                    map.current?.reset();
                    saveClanWorld(next, localStorage);
                  }}
                >
                  Replace 1 village
                </button>
              </div>
            )}
            <small className="manual-note">
              Local simulation · no online multiplayer
            </small>
          </div>
        </GameDialog>
      )}
      {chartersOpen && (
        <GameDialog
          title="The clan’s charter book"
          onClose={() => setChartersOpen(false)}
        >
          <div className="charter-book-heading">
            <div>
              <h2>The Mossfell charters</h2>
              <p>
                {CHARTERS.filter((c) => archive.owned[c.id]).length} of 9
                collected · One active charter
              </p>
            </div>
            <button
              className="wood-button"
              onClick={() => {
                setChartersOpen(false);
                setPackOpen(true);
                setPackPhase("sealed");
              }}
            >
              Open sealed charters <b>{archive.packs}</b>
            </button>
          </div>
          <div className="charter-grid">
            {CHARTERS.map((card) => (
              <div key={card.id}>
                <CharterCard
                  card={card}
                  owned={!!archive.owned[card.id]}
                  active={archive.active === card.id}
                  onClick={() => ratify(card)}
                />
                <span className="charter-copy-count">
                  {archive.owned[card.id]
                    ? `×${archive.owned[card.id]} · ${archive.active === card.id ? "Ratified" : "Click to ratify"}`
                    : "Undiscovered"}
                </span>
              </div>
            ))}
          </div>
          {active && (
            <div className="ratified-summary">
              <PixelIcon name="crown" size={20} />
              {active.name}
              <span>{active.effect}</span>
            </div>
          )}
        </GameDialog>
      )}
      {packOpen && (
        <GameDialog title="A message for the Elder" onClose={closePack}>
          <div className={`seal-opening phase-${packPhase}`}>
            <h2>
              {packPhase === "cards"
                ? "New charters for the clan"
                : "Break the seal"}
            </h2>
            <span className="seal-subtitle">
              THREE CHARTERS · ONE RARE OR BETTER
            </span>
            {packPhase !== "cards" ? (
              <div
                className="sealed-parchment"
                onPointerDown={(e) => {
                  startRip.current = e.clientX;
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (
                    startRip.current !== null &&
                    Math.abs(e.clientX - startRip.current) > 85
                  ) {
                    startRip.current = null;
                    openPack();
                  }
                }}
                onPointerUp={() => {
                  startRip.current = null;
                }}
              >
                <div className="parchment-flap" />
                <div className="letter-address">
                  To the Elder
                  <br />
                  <strong>of Mossfell</strong>
                </div>
                <div className="wax-seal">
                  <PixelIcon name="crown" size={38} />
                </div>
                <span className="letter-inscription">BY HAND & BY OATH</span>
              </div>
            ) : (
              <div className="charter-reveal">
                {revealed.map((card, i) => (
                  <div
                    className={`charter-reveal-slot ${i < flipped ? "face-up" : ""}`}
                    key={`${card.id}-${i}`}
                  >
                    {i < flipped ? (
                      <CharterCard
                        card={card}
                        active={archive.active === card.id}
                        onClick={() => ratify(card)}
                      />
                    ) : (
                      <button
                        className="charter-back"
                        onClick={() => {
                          setFlipped(i + 1);
                          sound("reveal");
                        }}
                        aria-label={`Reveal charter ${i + 1}`}
                      >
                        <PixelIcon name="crown" size={38} />
                        <span>MOSSFELL</span>
                        <b>{i + 1}</b>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="seal-actions">
              {packPhase === "sealed" ? (
                <>
                  <button
                    className="wood-button seal-primary"
                    onClick={openPack}
                    disabled={!archive.packs}
                  >
                    Break seal <b>{archive.packs}</b>
                  </button>
                  <button className="metal-button" onClick={buyPack}>
                    Acquire charter <PixelIcon name="gold" size={16} />
                    40
                  </button>
                </>
              ) : packPhase === "ripping" ? (
                <span>Unfurling the charters…</span>
              ) : (
                <>
                  <button
                    className="wood-button seal-primary"
                    onClick={() => {
                      if (flipped < 3) {
                        setFlipped((v) => v + 1);
                        sound("reveal");
                      } else closePack();
                    }}
                  >
                    {flipped < 3 ? "Reveal next" : "Keep the charters"}
                  </button>
                  {flipped < 3 && (
                    <button
                      className="metal-button"
                      onClick={() => {
                        setFlipped(3);
                        sound("reveal");
                      }}
                    >
                      Reveal all
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </GameDialog>
      )}
    </main>
  );
}
