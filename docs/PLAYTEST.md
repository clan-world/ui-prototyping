# Playtest the Mossfell village

Check the continuous village mounted by `ClanController`. The earlier expedition route and its saved browser results do not apply to this implementation.

## Start a fresh test

- Run `pnpm dev` and open [localhost:3010](http://localhost:3010).
- Use a fresh browser context for repeatable resources: 180 timber, 110 stone, 140 food, 20 iron, and 85 gold.
- Confirm Elder Aldric and twelve other clan members, population 13/16, and six workers already gathering.
- Confirm three sealed packs and The Forester ratified in the archive.
- Test desktop and narrow portrait layouts. Check resource counters, roster access, selected-unit controls, construction, charters, and map gestures.

## Check orders and cargo

1. Select an idle clansman in the roster. Use Timber in Assign work.
2. Follow the person to a tree. Check walking and chopping frames, job label, and increasing cargo.
3. Wait for a load of 10 and watch the return journey. Timber enters the stockpile when the load reaches compatible storage.
4. Confirm the worker returns to gather. Move the Elder near the worksite and check that production speeds up.
5. Select a group with a drag box or Select all. Send it to clear ground and check that destinations spread out.
6. Hold Shift while issuing a second move. Confirm it starts after the first destination is reached.
7. Queue movement after gathering. Confirm it starts after a load is delivered.
8. Use Return with partial cargo, then Stop. Supplies must not duplicate or change resource type.
9. Send a person across the river and behind a building. Check reachable routes and bridges, with no blocked diagonal shortcuts.

### In plain words

Watch one worker all the way from the shared store to the worksite and back. The resource counter should reflect a delivered load, not each swing of the tool.

## Check construction and recruitment

1. Select available builders, open Build, and choose Clansman's cottage.
2. Try placement over a building, resource, water, and occupied ground. Invalid sites must reject placement without charging resources.
3. Place the cottage on clear, reachable land. Its cost is 45 timber and 15 stone. Check one charge and construction beginning only after workers arrive.
4. Let construction finish. Housing capacity should rise by four; inspection should show completion.
5. Recruit a clansman. Check one additional person and costs of 30 food and 20 gold.
6. Test insufficient housing or supplies separately. Check feedback and unchanged balances.
7. Build a storehouse near distant work and observe its use for deliveries. Build a market and check increased gold income after completion.
8. Check all eleven build choices: cottage, woodcutter's lodge, quarry lodge, wheat field, watchtower, well, storehouse, tavern, blacksmith, market, and chapel.

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
- Reload after opening and ratifying charters. Check packs, copies, and the active doctrine.
- Let the five-second autosave run, then reload. Check the save status and restored world.
- Open Menu, New settlement, then cancel. The existing village must remain intact.
- Test Replace 1 village in a disposable browser context. The village resets; collected charters remain.
- Check unavailable storage separately. Save failures must be visible and must not claim persistence.

## Run automated checks

```sh
pnpm typecheck
pnpm test
pnpm build
python3 scripts/qa_clan_village.py
```

- Run the browser command with the game server running. It uses Python Playwright; inspect `--help` for URL and Chrome-path options.
- Village unit tests validate simulation without a browser. Browser journeys exercise rendered controls and persistence.
- `scripts/qa_user_journeys.py` targets the retired expedition UI. Its screenshots and passes are historical evidence only.
- `pnpm test:e2e` has no current village TypeScript specs. It does not replace the Python journey script.

## Record current verification

| Check | Status for the village implementation |
| --- | --- |
| Village simulation tests | 13 passed |
| Full test suite | 36 passed: 13 village, 22 retained expedition, and 1 API contract test |
| Workspace typecheck | Passed |
| Production build | Passed with Next.js Webpack |
| Desktop browser journeys | 2 passed at 1440 x 960: village economy and charter archive |
| Mobile browser journeys | 2 passed at 390 x 844: village economy and charter archive |
| Browser errors | Zero page, console, or network errors across the four journeys |
| Physical-device gestures and audio | Manual verification required |

The current [browser result record](../artifacts/qa/village/results-all-all.json) contains all four passing journeys. Screenshots and traces are in [the village QA directory](../artifacts/qa/village/).

- The desktop route delivered 100 timber and the mobile route delivered 67. Both selected twelve members and confirmed movement and a fully unchanged saved state while paused.
- Both routes recruited a fourteenth member for 30 food and 20 gold, then completed a cottage for 45 timber and 15 stone, raising housing capacity to 20.
- Both charter routes bought two packs for 40 gold each, rejected a third purchase with insufficient gold, added three cards once, confirmed the rarity guarantee, and restored the ratified doctrine after reload.
- The browser script acts through rendered controls and reads saved state for assertions. Playwright's clock advances elapsed browser time; the script does not inject simulation state or write local storage.
- Physical-device pinch and drag, sound quality, the complete keyboard route, settlement replacement, and interrupted-work browser reloads remain manual checks. The unit suite covers additional simulation and save cases separately.
