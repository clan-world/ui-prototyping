# Clan World

Clan World is a continuous medieval game in pixel art. You command Elder Aldric and the Mossfell clan: explore the realm, assign workers, carry resources home, raise buildings, recruit clansmen, and collect charters that change village production.

- A 112 x 96 overhead realm contains eight jurisdictions and eight clan settlements. The Elder and twelve clan members start at Mossfell; six workers already gather timber, stone, and food.
- The map fills the viewport beneath a compact resource HUD, an upper-right minimap, collapsible clan panels, and contextual commands. Five custom cursors cover movement, interaction, panning, dragging, and blocked terrain.
- Supplies enter your stockpile when workers deliver their cargo. The economy uses timber, stone, food, iron, and gold.
- Eleven structures are available in the build menu, alongside the existing Elder's hall.
- Nine collectible charters share three production doctrines. One charter can be active at a time.
- Original overhead buildings, autumn props, landmark sprites, and 96 unit animation frames form the current art set. Illustrated stone frames, parchment, a gold wordmark, and carved buttons supply the HUD materials.
- The game runs locally in your browser. Gold and packs are in-game resources; no payments or crypto services are connected.

## Start the game

Requirements: Node.js 20.9 or newer and pnpm 10.15.1.

```sh
cd "/Users/mikail/Desktop/Clan World/clan-world-new"
pnpm install
pnpm dev
```

Open [Clan World locally](http://localhost:3010). On this Mac, [Play Clan World.command](Play%20Clan%20World.command) opens the running game or starts its development server.

- Gameplay needs no database, API server, environment variables, or account.
- For development access from a physical phone, add the computer's exact local network address to `allowedDevOrigins` in `apps/web/next.config.ts`, restart the server, and use that address on the same network.
- To serve a production build, run `pnpm build`, then `pnpm --filter @clan-world/web start`. Both development and production use port 3010.
- The optional `pnpm dev:api` command starts the Effect API on `127.0.0.1:3011`. Its implemented endpoint is `GET /health`; the village does not call it.

## Run your village

1. Select a clansman on the map or in the Clan roster. Use the Idle filter to find someone available.
2. Choose Timber, Stone, or Harvest in Assign work, or select a resource on the map. The worker travels to it, gathers up to 10 units, delivers the load to a compatible store, and returns to work.
3. Select builders, open Build, choose a structure, and place it on clear land. Workers must reach the foundation before construction advances.
4. Keep the Elder near important work. His inspiration increases nearby gathering and construction speed by 35%. Rally gives a further 30% work bonus for 25 seconds.
5. Build cottages for housing, recruit with food and gold, and shorten delivery routes with local stores.
6. Open earned charter packs and ratify a doctrine that suits your next task.

### In plain words

The clan works like a crew with a shared supply store. An axe swing fills a worker's load, but the village cannot spend that timber until the worker brings it home. Your decisions determine who works, where supplies travel, and which jobs finish first.

## Explore the realm

- The jurisdictions are The Forest, Iron Mountains, Unicorn Town, West Farms, East Farms, West Docks, East Docks, and The Deep Sea.
- Mossfell shares the realm with Iron Guard, Ember Hand, Dawn Watch, Storm Riders, Lantern Guild, Stoneroot, and Doomweb Scribes. Each clan has a separate base. A world seed determines placement within eligible jurisdictions; a new settlement uses a new seed.
- Roads connect settlements, mountain passes, and Unicorn Town. Bridges cross rivers, and quays extend from both docks. Water, mountain and snow tiles, trees, resource deposits, buildings, and the monument block movement. Farms remain walkable.
- The Great Monument stands in Unicorn Town. Its HUD objective focuses the camera on the site. Progress starts at zero; resource contributions and monument completion are not implemented.
- Neighboring clans are visual settlements. Their buildings do not supply Mossfell housing, storage, income, or production bonuses. They have no autonomous workers or multiplayer connection.

## Use the controls

| Action | Mouse or touch | Keyboard |
| --- | --- | --- |
| Select a person | Click or tap the person or roster row | Tab through roster controls |
| Select a group | Drag a box; Shift-click adds people | 1 selects members except the Elder |
| Give an order | Select a resource or destination; right-click also gives orders | Choose a command, then a map target |
| Move | Move, then select a location | M |
| Gather | Work, then select a resource or farm | G |
| Construct | Select builders, open Build, choose a structure, and place it | B opens Build |
| Deliver cargo | Return, or right-click compatible storage | R |
| Follow the Elder | Follow | F |
| Stop orders | Stop | Use the Stop button |
| Queue an order | Hold Shift while issuing a map order | Shift |
| Find the Elder | Find Elder or the Clan World crest | E |
| Pan | Middle-button drag, Space-drag, or touch drag | WASD or arrows |
| Zoom | Mouse wheel, pinch, or map buttons | Use map buttons |
| View the whole realm | Select the minimap's zoom percentage | Use the zoom percentage button |
| Enter or exit fullscreen | Fullscreen icon, where supported | Tab to Toggle fullscreen |
| Pause | Pause button | P |
| Cancel placement or command mode | Placement cancel button | Escape |

- The upper-right minimap moves the camera and shows the camera footprint. Its controls zoom from a realm overview to close inspection, center the selection, or return to Mossfell. The zoom range is 10% to 240%.
- Gold arrow, pointing-hand, open-hand, closed-hand, and blocked cursors change with the target and gesture.
- On mobile, Clan opens the roster, Build opens construction, Map opens the minimap, and Charters opens the archive. Tap a person before their target; drag the land to pan.
- Each person supports up to 16 queued orders. A queued order after gathering starts after a cargo delivery.
- Simulation speed cycles through 1x, 2x, and 4x. The manual, archive, and pack dialogs pause simulation. Hidden tabs do not advance the village.
- The path and name icons toggle map overlays. Sound and Save are in the bottom status bar. Clan, Build, and Chronicle panels open from the tool rail.

## Build and collect

| Structure | Implemented purpose |
| --- | --- |
| Clansman's cottage | Adds four housing spaces |
| Woodcutter's lodge | Accepts timber and improves nearby timber gathering |
| Quarry lodge | Accepts stone and iron |
| Wheat field | Supplies regenerating food |
| Watchtower | Provides a watchpost landmark |
| Village well | Restores nearby worker vigour |
| Storehouse | Accepts resources near distant worksites |
| The Hearth & Stag | Raises target clan happiness |
| Blacksmith | Improves all gathering |
| Market stall | Increases passive gold income |
| Stone chapel | Extends the Elder's inspiration radius |

- A recruit costs 30 food and 20 gold and needs an available housing space. The initial village has 13 people and room for 16.
- Population consumes food. Low food reduces happiness. Tired workers gather more slowly; rest, deliveries, and wells restore vigour.
- The archive begins with three sealed packs and The Forester ratified. Every 150 delivered resources earns another pack. You can acquire a pack for 40 gold.
- Break the wax seal with a horizontal drag or the Break seal button. Reveal three charters individually or together. Each pack includes at least one rare or legendary charter.
- One ratified charter supplies a village-wide doctrine: 20% faster gathering, 20% faster construction, or 10% faster movement while carrying cargo. The nine cards share these three effects. Rarity and duplicates do not stack additional bonuses.

## Understand the architecture

```mermaid
flowchart LR
  A[Map and command controls] --> B[ClanController]
  B --> C[Shared clan simulation]
  C --> D[Village state]
  D --> E[ClanMap and sprite atlases]
  D --> F[Local village save]
  G[Charter archive] --> C
  G --> H[Local charter save]
```

### In plain words

The controller takes your orders, the simulation updates the crew and shared store, and the map draws the result. The browser keeps the village and charter book so you can continue later.

| Source | Responsibility |
| --- | --- |
| `apps/web/app/page.tsx` | Mounts `ClanController` |
| `components/medieval/ClanController.tsx` in the web app | Commands, build menu, roster, dialogs, charter rewards, and saving |
| `components/medieval/ClanMap.tsx` in the web app | Camera, hit testing, selection, terrain, depth ordering, and rendering |
| `lib/medieval/sprites.ts` in the web app | Atlas loading and registered animation frames |
| `lib/medieval/charters.ts` in the web app | Charter definitions, archive validation, and pack contents |
| `packages/shared/src/clan-sim.ts` | Pathfinding, orders, cargo, construction, recruitment, production, and saves |
| `apps/api` | Effect HTTP health service |
| `packages/db` | PostgreSQL schema and Drizzle integration through `@effect/sql-drizzle` |

- The simulation receives a 0.1-second tick every 100 milliseconds, multiplied by the selected speed. A separate rendering loop interpolates unit positions.
- Seeded generation creates terrain, jurisdictions, clan bases, roads, and the monument. The expanded map has 5.6 times the tile area of the original village map.
- A* pathfinding uses eight neighboring cells and the full collision footprint of buildings and the monument. Water, mountains, snow, and resource objects also block paths. Walking and unit separation reject diagonal steps through blocked corners. New foundations cause routes to be recalculated.
- Unit art contains 32 walking frames, 32 Elder frames, and 32 work frames for chopping, mining, carrying, and construction. Direction mappings and measured foot pivots keep sprites registered.
- Buildings and props use measured clipping rectangles because generated atlas rows vary. The orthogonal projection uses 32-pixel square tiles. Terrain and sprites render together on a canvas at half the CSS viewport resolution, then scale with nearest-neighbor sampling. Cached terrain adds worn cobblestone, earth, shore edges, and woodland litter.
- Earlier expedition components and their engine remain in the repository but are not mounted by the root page. Their tests and save format are separate.

## Save and resume

| Data | Browser storage key | Save behavior |
| --- | --- | --- |
| Village | `clan-world:elder-village:v2` | Every five seconds, on page exit, and through Save |
| Charters | `clan-world:charters:v2` | When the archive changes |

- The full village save includes resources, people, cargo, orders, queues, buildings, construction progress, elapsed time, and economy statistics. Loading validates data and recalculates transient routes.
- Original 48 x 40 village saves expand into the larger realm automatically. Existing terrain, workers, cargo, resources, buildings, construction progress, and elapsed time remain intact.
- The archive stores copies, packs, the ratified charter, and delivery milestones. Its active doctrine is reapplied to the loaded village.
- New settlement requires a second action, Replace 1 village. It replaces the village while preserving the charter archive.
- Saves belong to one browser origin and device. Use Save before closing if you need an explicit save result.

## Know the limits

- This is a single-player simulation. Neighboring clans have no AI. There are no enemies, combat, raids, multiplayer, shared clan contributions, matchmaking, or verified leaderboards. Watchtowers and the initial guard do not provide a combat system.
- The monument is a physical landmark and a visual objective. Contribution rules, completion, and victory conditions remain for the balancing pass. The realm adapts the original jurisdiction names; it is not an exact map replica.
- There is no timed match, victory screen, or finished campaign. Hidden or closed pages do not accumulate offline progress.
- The API and database are unused by gameplay. There are no accounts, cloud saves, server authority, or anti-cheat. Local resources and saves can be modified by the player.
- Village and charter records are separate local saves, not a transactional online economy.
- A manifest requests standalone display where supported. No service worker or offline asset cache is included.

## Run checks

```sh
pnpm typecheck
pnpm test
pnpm build
python3 scripts/qa_clan_village.py
python3 scripts/qa_clan_realm.py
```

- Run the current browser script with the game server running. It requires Python Playwright and Chrome; inspect its `--help` output for browser and URL options.
- `clan-sim.test.ts` covers seeded placement, reachable bases and docks, collision during walking and separation, foundation routing, the economy, and legacy save migration. `pnpm test` also runs retained expedition tests and the API HTTP contract test.
- Workspace typechecking and the production build pass. The test suite passes 45 tests: 22 village tests, 22 retained expedition tests, and one API contract test. Four gameplay journeys and two realm-navigation journeys pass at desktop and mobile sizes with no recorded browser errors. [The playtest notes](docs/PLAYTEST.md) link the evidence and remaining manual checks.
- `pnpm test:e2e` points to a separate TypeScript Playwright configuration. No current village specs are stored in `apps/web/e2e`; use the Python journey suite.
- `scripts/qa_user_journeys.py` and the older `artifacts/qa/REPORT.md` target the retired expedition UI. See [the current playtest notes](docs/PLAYTEST.md) for village checks and recorded results.

## Review artwork provenance

- [Overhead world provenance](apps/web/public/medieval/overhead/PROVENANCE.md) records the current building and prop generation.
- [HUD artwork provenance](apps/web/public/medieval/hud/PROVENANCE.md) records the wordmark, stone frame, parchment, and button prompts.
- [Earlier world asset provenance](apps/web/public/medieval/PROVENANCE-WORLD.md) records the retained first-generation world art.
- [Unit asset provenance](apps/web/public/medieval/PROVENANCE-UNITS.md) records the 96 frames and atlas registration.
- Current game sprites are original generated assets. Source rectangles and pivots are recorded separately from the PNGs.
- Cinzel, Uncial Antiqua, and Fragment Mono license notices are included in [the fonts directory](apps/web/public/fonts/).
