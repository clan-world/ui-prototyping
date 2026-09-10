# Playtest Clan World

Check the continuous village mounted by `ClanController`. The earlier expedition route and its saved browser results do not apply to this implementation.

## Start a fresh test

- Run `pnpm dev` and open [localhost:3010](http://localhost:3010).
- Use a fresh browser context for repeatable resources: 180 timber, 110 stone, 140 food, 20 iron, and 85 gold.
- Confirm Elder Aldric and twelve other clan members, population 13/16, and six workers already gathering.
- Confirm a 112 x 96 realm, eight jurisdictions, eight separate clan bases, and the monument objective at 0%.
- Confirm three sealed packs and The Forester ratified in the archive.
- Test desktop and narrow portrait layouts. Check resource counters, roster access, selected-unit controls, construction, charters, and map gestures.

## Check the realm and game HUD

1. Confirm the world uses an overhead angle with horizontal building facades and square terrain footprints. Check a shared coarse pixel scale, warm terrain, stone HUD frames, parchment panels, and the gold Clan World wordmark. Confirm the world fills the viewport beneath the resource HUD. Open and close Clan, Build, and Chronicle panels without losing access to the map.
2. Use the upper-right minimap to visit The Forest, Iron Mountains, Unicorn Town, West Farms, East Farms, West Docks, East Docks, and The Deep Sea. The camera footprint should follow movement.
3. Select the zoom percentage for the realm overview, then zoom into a settlement. Check terrain edges, building registration, unit size, and readable controls throughout the 10% to 240% range.
4. Find Mossfell and the seven neighboring clans. Check distinct bases, clan markers, road entrances, mountain passes, bridges, and both quays. Neighboring buildings must not change Mossfell's population capacity or production bonuses.
5. Select the monument objective. The camera should focus on The Great Monument in Unicorn Town. Check that the monument footprint blocks walking; its 0% indicator must not imply that contributions work.
6. Check the five gold cursor states: arrow on clear terrain, pointing hand on interactive targets, open hand over a person or before panning, closed hand while panning, and blocked over impassable ground.
7. Test the fullscreen toggle where supported. Keep resource counters, the minimap, dialogs, and mobile controls visible after resizing.

- Clan positions repeat for the same seed and vary within eligible jurisdictions for a new seed. Neutral Unicorn Town and The Deep Sea cannot host a clan base.
- Foreign clans are visual settlements with no AI or multiplayer. Monument contributions, completion, and victory are outside this pass.

## Check orders and cargo

1. Select an idle clansman in the roster. Use Timber in Assign work.
2. Follow the person to a tree. Check walking and chopping frames, job label, and increasing cargo.
3. Wait for a load of 10 and watch the return journey. Timber enters the stockpile when the load reaches compatible storage.
4. Confirm the worker returns to gather. Move the Elder near the worksite and check that production speeds up.
5. Select a group with a drag box or Select all. Send it to clear ground and check that destinations spread out.
6. Hold Shift while issuing a second move. Confirm it starts after the first destination is reached.
7. Queue movement after gathering. Confirm it starts after a load is delivered.
8. Use Return with partial cargo, then Stop. Supplies must not duplicate or change resource type.
9. Send a person across the river, through a mountain pass, and behind a building. Check reachable routes and bridges, with no blocked diagonal shortcuts. Trees, mountains, snow, water, and the monument must remain impassable.
10. Move a group beside blocked corners. Unit separation must not push people through trees, water, or structures.

### In plain words

Watch one worker all the way from the shared store to the worksite and back. The resource counter should reflect a delivered load, not each swing of the tool.

## Check construction and recruitment

1. Select available builders, open Build, and choose Clansman's cottage.
2. Try placement over a building, resource, water, bridge, mountain, monument, and occupied ground. Check the entire footprint and map-edge border. Invalid sites must reject placement without charging resources.
3. Place the cottage on clear, reachable land. Its cost is 45 timber and 15 stone. Check one charge and construction beginning only after workers arrive.
4. Let construction finish. Housing capacity should rise by four; inspection should show completion.
5. Recruit a clansman. Check one additional person and costs of 30 food and 20 gold.
6. Test insufficient housing or supplies separately. Check feedback and unchanged balances.
7. Build a storehouse near distant work and observe its use for deliveries. Build a market and check increased gold income after completion.
8. Check all eleven build choices: cottage, woodcutter's lodge, quarry lodge, wheat field, watchtower, well, storehouse, tavern, blacksmith, market, and chapel.
9. Place a foundation across a moving worker's route. The worker must recalculate a clear path or stop if no route exists.

## Check charters and production

1. Open Charters, then Open sealed charters. Test Break seal and a horizontal drag across the letter.
2. Reveal one card, then Reveal all. Each pack adds three copies and includes a rare or legendary charter.
3. Keep the charters, reopen the archive, and check counts. Closing the reveal must not grant the cards twice.
4. Ratify an owned charter. Only one card should be marked Ratified.
5. Check its effect: gathering +20%, construction +20%, or carrying movement +10%. Copies and higher rarity do not stack another effect.
6. Acquire a pack for 40 gold. Check the deduction and added pack. With insufficient gold, no purchase should occur.
7. Deliver 150 total resources. Check one milestone pack. Reload and confirm the same delivery total does not award it again.

## Check camera, mobile, and pause

- Test WASD, arrows, middle-button drag, Space-drag, wheel zoom, and the minimap on desktop.
- Test E for the Elder, M for movement, G for work, B for Build, R for Return, F for Follow, and 1 for non-Elder selection.
- On touch, tap a person and then a target. Drag to pan and pinch to zoom. Dragging must not issue an order.
- Open and close mobile Clan, Build, Map, and Charters panels. After choosing a building, the placement controls and map must remain usable.
- Pause with P or the pause button. Check 1x, 2x, and 4x speed after resuming.
- Open the manual, archive, and pack dialog during work. Simulation should pause while each dialog is open.
- Switch tabs and confirm the hidden village does not accumulate progress.
- Check Paths, Names, selection rings, selected-unit details, sound, and dialog keyboard focus.

## Check saves and settlement replacement

- Save while someone carries cargo and construction is incomplete. Reload and check resources, people, cargo, orders, queues, and progress. Routes may be recalculated.
- Load an original 48 x 40 village save in a disposable context. Confirm automatic expansion to 112 x 96 with the original village terrain, resources, workers, cargo, buildings, construction, and elapsed time preserved. Active gathering and delivery should continue.
- Reload after opening and ratifying charters. Check packs, copies, and the active doctrine.
- Let the five-second autosave run, then reload. Check the save status and restored world.
- Open Menu, New settlement, then cancel. The existing village must remain intact.
- Test Replace 1 village in a disposable browser context. The village resets with a new seed and new base placements; collected charters remain.
- Check unavailable storage separately. Save failures must be visible and must not claim persistence.

## Run automated checks

```sh
pnpm typecheck
pnpm test
pnpm build
python3 scripts/qa_clan_village.py
python3 scripts/qa_clan_realm.py
```

- Run the browser command with the game server running. It uses Python Playwright; inspect `--help` for URL and Chrome-path options.
- Village unit tests validate simulation without a browser, including placement across 32 seeds, reachable clan bases and docks, walking and separation collision, new foundations, foreign-building isolation, and legacy migration with continued production. Browser journeys exercise rendered controls and persistence.
- `scripts/qa_user_journeys.py` targets the retired expedition UI. Its screenshots and passes are historical evidence only.
- `pnpm test:e2e` has no current village TypeScript specs. It does not replace the Python journey script.

## Record current verification

| Check | Status for the village implementation |
| --- | --- |
| Village simulation tests | 22 passed |
| Full test suite | 45 passed: 22 village, 22 retained expedition, and 1 API contract test |
| Workspace typecheck | Passed |
| Production build | Passed with Next.js Webpack |
| Desktop browser journeys | 2 passed at 1512 x 982: village economy and charter archive |
| Mobile browser journeys | 2 passed at 390 x 844: village economy and charter archive |
| Realm navigation journeys | 2 passed: overview zoom, minimap travel, home and monument focus, keyboard pan, Space-drag, touch pan, and pinch |
| Responsive UI review | Passed at 1512 x 982, 1024 x 768, 844 x 390, and 390 x 844 |
| Browser errors | Zero errors across four gameplay journeys and two camera journeys |
| Physical-device gestures and audio | Manual verification required |

The [production smoke record](../artifacts/qa/realm-final/production-smoke.json) verifies the final overhead artwork, half-resolution canvas, four viewport layouts, zero asset errors, and working zoom and dialogs on port 3010. The default HUD paints 125, 108, 61, and 38 words across desktop, tablet, short landscape, and mobile portrait, with zero painted sentences of five or more words.

The [realm camera record](../artifacts/qa/realm-final/navigation-results.json) captures desktop and emulated-touch navigation. The current [browser result record](../artifacts/qa/village/results-all-all.json) contains all four passing journeys. Screenshots and traces are in [the village QA directory](../artifacts/qa/village/).

- Desktop and mobile routes delivered timber, selected twelve members, confirmed movement, and kept the saved state unchanged while paused.
- Both routes recruited a fourteenth member for 30 food and 20 gold, then completed a cottage for 45 timber and 15 stone, raising housing capacity to 20.
- Both charter routes bought two packs for 40 gold each, rejected a third purchase with insufficient gold, added three cards once, confirmed the rarity guarantee, and restored the ratified doctrine after reload.
- The browser script acts through rendered controls and reads saved state for assertions. Playwright's clock advances elapsed browser time; the script does not inject simulation state or write local storage.
- Physical-device gestures, sound quality, fullscreen behavior, settlement replacement, and interrupted-work browser reloads remain manual checks. Emulated-touch pinch and drag, keyboard panning, and Space-drag pass browser automation. The unit suite covers additional simulation and save cases separately.
