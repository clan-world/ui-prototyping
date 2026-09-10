# Astra / Codex context — clan-world-new

Captured 10 Sep 2026 from local Codex sessions that built this tree.
Primary thread: `~/.codex/sessions/2026/09/06/rollout-2026-09-06T18-14-15-01a078c9-536b-74d1-b59b-c40008c235be.jsonl` (cwd Desktop, then continued under this folder). Follow-on thread `01a07c8d-…` (cwd this repo) for UI/map polish.

## Opening brief (Mikail → Codex, 6 Sep 2026)

- New game **Clan World**: pixel-art **resource gathering**, RuneScape-like, powered by **TCG** (pack ripping, card collection) + **map gameplay**.
- Rough references live under `~/Desktop/Clan World` — inconsistent; **build from scratch**, take ownership, aim viral.
- **Strip anything crypto-related.**
- Visuals / UI / controls matter. Mobile + desktop web, but must feel like a **native gaming device** (home, cards, gameplay immersive — not a website).
- Use image generation; detailed sprite coverage / movement; player meaningfully contributes and stays engaged.
- Inspiration from prior Clan World work, **10× better**.

## Course corrections that shaped the build

1. Rejected first pass as “too sharp / polished / vibecoded.” Demanded real **pixel art**, medieval Clan World style, **Elders commanding clansmen** as an admin graphic controller (orders on map). Style refs: **RuneScape + Age of Empires**, proportional sprites. No generic frontend design skills.
2. Wanted a live link for a colleague (Cloudflare tunnel).
3. UI must feel like an **actual game**, not a browser chrome. Reference app: **Cambria** (layout / HUD / feel — not the same game). Custom **game cursors** (phone photos of laptop screen).
4. **Bigger map** like original Clan World: jurisdictions, navigation, zoom levels, **each clan its own base** with randomized placement. Goal lean: gather resources → build a **monument**. Focus visual identity, paths, obstacles (no walking through trees/water); don’t over-automate AI this session.
5. Later: drop isometric; Cambria-like camera angle/resolution; less “institutional” sharp HUD; more parchment / runes; less green; less “div tags with basic styling.”

## What this repo became

pnpm + turbo monorepo: `apps/web` (Next.js playable village on :3010), `apps/api` (Effect health stub), `packages/shared` (clan-sim), `packages/db`. Medieval overhead sprites, charter packs, local save. Gold/packs are **in-game only** — no payments/crypto wired. Neighbor clans visual only; monument progress not implemented.

## Note for Clan World (Grok Bot) rebuild

This prototype is a **reference / UI playground**, not the locked CLOCK IN product. Later north star (main menu + Elder lounge + tournaments, cards = Elders) may diverge; keep crypto strip for the prototype UI unless Seeker wallet work is explicitly scoped.
