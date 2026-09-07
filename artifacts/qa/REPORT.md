# Clan World browser QA

- All three automated user journeys pass in headless Chrome 151.
- Desktop viewport: 1440 x 960. Mobile viewport: 390 x 844 with touch enabled.
- Tests use rendered controls and fresh browser contexts. Browser clock acceleration advances the normal simulation. Storage is read only for assertions.

| Journey | Observed result |
| --- | --- |
| Packs and collection | Two packs consumed; six card copies added; rare-or-better guarantee observed; collection matches reveals |
| Deck replacement | Six unique cards remain after replacement; deck and collection survive reload |
| Gathering | Timber increases from 0 to 12 after travel and gathering |
| Card deployment | Scout consumes 2 energy, adds one crew member, and starts cooldown |
| Pause and return | Timer, resources, and scores freeze; returning home preserves the run in memory |
| Match completion | One completed run awards 37 gold, 65 XP, and one pack in the tested route |
| Reward consistency | One reward claim persists; keeping results open, replaying, and reloading do not duplicate rewards |
| Replay | Play again starts a fresh 03:00 expedition |
| Mobile recovery | Health changes from 100 to 88 at the shrine, then recovers to 100 at Hearthcamp |
| Mobile layout | Camp control stays visible; no horizontal document overflow; home can resume the expedition |

## In plain words

The tested loop works: open packs, change the deck, send a clanmate to gather, pause, finish a match, collect rewards once, and start again. Mobile controls let the warden leave danger and recover.

## Repeat the checks

```sh
pnpm dev
python3 scripts/qa_user_journeys.py
```

- Python Playwright and Chrome are required. Use `--chrome` to select another installed Chromium executable.
- Use `--case packs`, `--case expedition`, or `--case mobile` for one journey.
- Structured results: [user-journeys-all.json](user-journeys-all.json).
- Screenshots: [revealed packs](packs-revealed-desktop.png), [deck replacement](deck-replacement-desktop.png), [gathering and deployment](gather-and-deploy-desktop.png), [match results](expedition-results-desktop.png), [mobile recovery](mobile-camp-recovery.png), and [mobile home](mobile-home-resume.png).
- Additional browser checks verify horizontal dragging to rip a pack, all-card reveals, and portrait and landscape layouts. The fresh mobile Camp screen paints 53 words (52 with Resume expedition), with zero explanatory sentences of five or more words. The final pass fixes the landscape destination/resource overlap and keeps the mobile camera clear of destination controls.
- The final workspace production build and all 23 engine/API tests pass. Physical-device audio, native sharing, and fullscreen remain outside automated coverage.
