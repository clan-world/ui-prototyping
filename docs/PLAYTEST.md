# Playtest Clan World

Use this route to check the complete local loop: gathering, card deployment, shrine control, recovery, rewards, pack opening, and persistence.

## Check the starting state

- Start the game with `pnpm dev` and open [localhost:3010](http://localhost:3010).
- Use a fresh browser profile or storage origin if you need the exact starter state. The expected profile has six collected starter cards, three packs, 120 gold, and a six-card deck.
- Keep the starter deck for the route below. Its order is Mosswood Scout, Stoneguard, Riverwitch, Emberfox, Rune Smith, and Frost Ward.
- Check a desktop viewport and a narrow portrait viewport. Confirm the hand, destination shortcuts, health, energy, pause, and selected-site action remain reachable.

## Follow the expedition route

Select each destination before selecting its card. This sends the warden to the site. Then select the named card and use Deploy card, or select the same destination again.

| Elapsed | Clock remaining | Destination | Deploy | Check |
| --- | --- | --- | --- | --- |
| 0:00 | 3:00 | Grove | Mosswood Scout, slot 1 | Warden moves; timber and score increase; card enters cooldown |
| 0:20 | 2:40 | Quarry | Stoneguard, slot 2 | Stone increases; a second resource site is active |
| 0:40 | 2:20 | Spring | Riverwitch, slot 3 | Essence increases; harvests restore health |
| 1:00 | 2:00 | Shrine | Rune Smith, slot 5 | Control increases; claimed shrine adds passive points |
| 1:50 | 1:10 | Camp | None | Warden leaves danger; health recovers |
| 2:15 | 0:45 | Shrine | Stoneguard, slot 2 | Guard supports the final contest |
| 2:30 | 0:30 | Shrine | Rune Smith, slot 5 | Final shrine scoring continues through the finish |

- This route wins in the automated engine test with seed `7331`. Browser expeditions use a fresh seed, so adjust recovery timing if health falls or the rival contests the shrine.
- At the finish, check the final score, gold, XP, pack reward, and Clan statistics. A win earns a pack. The first completed non-retreat expedition also earns a pack.
- A run that ends early is a retreat and cannot award a victory. Test this separately through Pause, End expedition, and End 1 expedition.

### In plain words

Use the starter deck as a six-tool kit: gather with specialists, use a guard when danger rises, and recover before the final shrine contest. The route checks whether each choice produces a visible result.

## Check packs and collection

1. Open Packs from the result or navigation.
2. Drag horizontally across a sealed pack. Repeat with the Rip pack button on another pack.
3. Reveal cards individually, then check Reveal all. Each pack contains three cards, with at least one rare, epic, or legendary card.
4. Collect the cards and open Collection. Check artwork, names, rarity, copy counts, and undiscovered states.
5. Inspect an owned card outside the deck. Select Add to deck, choose a slot to replace, and confirm the deck still contains six different owned cards.
6. Forge a pack for 120 gold. Check that one pack is added and exactly 120 gold is removed. If gold is insufficient, check the feedback and unchanged balances.

## Check controls and persistence

- Use destination shortcuts on mobile, including Camp and Shrine while those sites are outside the camera view.
- Use WASD and arrow keys on desktop, select cards with 1 through 6, act with Space, and pause with Escape.
- Check cooldown and insufficient-energy feedback. A rejected deployment must not consume energy.
- Pause, return to Camp, and resume. Confirm the same expedition continues. Switch browser tabs and confirm the expedition pauses.
- Reload after collecting cards or finishing a run. Confirm the profile persists. An active expedition does not survive a page reload.
- Revisit the result flow and reload. Confirm the same reward is not claimed again.
- Open the field guide and card detail dialogs. Check keyboard focus, Tab order, Escape, and touch close controls.
- Test sound, fullscreen, and Share challenge where the browser supports them. Sharing produces score text, not a multiplayer challenge link.

## Record verification

| Check | Recorded state |
| --- | --- |
| Workspace typecheck | Passed |
| Shared engine and profile tests | 22 passed |
| API HTTP contract test | 1 passed |
| Desktop browser interaction | Passed at 1440 x 960: packs, collection, deck replacement, persistence, gathering, deployment, pause, results, and replay |
| Mobile browser interaction | Passed at 390 x 844: shrine damage, visible camp destination, recovery, and home/resume |
| Visual clipping and touch-target review | Mobile recovery controls remain in the viewport with no horizontal overflow; final visual review is separate |
| Production build | Passed with Next.js Webpack |

Run `python3 scripts/qa_user_journeys.py` with the local game server running to repeat the browser journeys. The script uses normal rendered controls, reads local storage for assertions, and accelerates elapsed game time through the Playwright clock. It does not inject game or profile state. [The QA report](../artifacts/qa/REPORT.md) links the recorded outcomes.

Physical-device behavior, audio quality, native sharing, fullscreen, pack dragging, and the complete keyboard/dialog focus route still need the manual checks above.
