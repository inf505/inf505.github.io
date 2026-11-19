# Crypt of the Skeleton King — Project Handoff

## What this is

A single-page roguelike dungeon crawler written in vanilla Vue.js 3. Explore a crypt, fight monsters, collect gear, manage curses and torches, and defeat the Skeleton King.

## Tech stack

- **Vue 3** (global build from unpkg CDN)
- **HTML / CSS / JS** — no build step, no dependencies beyond Vue
- **Images** — hosted remotely on GitHub (`raw.githubusercontent.com`); no local image files
- **Deployment** — static site, ready for GitHub Pages

## File structure

| File | Purpose |
|------|---------|
| `index.html` | HTML markup + Vue app mount point |
| `style.css` | All styling (layout, colors, responsive, animations) |
| `game.js` | All game logic (Vue component: data, computed, methods) |
| `HANDOFF.md` | This file |

## How it works

**Game loop:** Explore → draw event card → resolve event (combat / trap / treasure / shop / nothing) → loot → gear choice → repeat.

**Game states:** `initializing`, `exploring`, `event_card_displayed`, `combat`, `loot_found`, `gear_choice`, `applying_bonus`, `trap_triggered`, `shop`, `game_over`, `game_won`.

**Core systems:**
- D20 attack rolls vs AC, damage ranges (e.g. `1-6`)
- Monster deck: easy → medium → hard → boss (Skeleton King with scaled stats and guards)
- Event deck: 7 event types with weighted effects
- Gear: weapon / armor / shield with enchantment bonuses
- Curses: timed debuffs with optional damage-over-time
- Torch: light/darkness mechanic with attack/damage penalties in darkness
- Shop: buy torches, potions, curse removal
- Rest: heal with ambush risk
- Game log with timestamps, keyboard shortcuts (Space, T, R, P)

## Images

All image URLs are remote. There are no local PNGs. If you recreate artwork, keep the same filenames/URLs and no code changes are needed:

- Events: `https://inf505.github.io/skeletonking/evtXX.png`
- Monsters: `https://raw.githubusercontent.com/inf505/inf505.github.io/refs/heads/main/skeletonking/monXXt.png`
- Boss/guards: same raw.githubusercontent pattern under `skeletonking/`

## Deploying to GitHub Pages (skeletonking2)

1. Push `index.html`, `style.css`, `game.js`, and `HANDOFF.md` to a repo named `skeletonking2`.
2. Enable GitHub Pages in repo settings (source: main branch, root folder).
3. The site will be live at `https://<user>.github.io/skeletonking2/`.

## Possible next steps (in no particular order)

- **Art overhaul:** Replace monster/event images with less scary, cohesive art (cartoon, pixel, pastel, etc.)
- **Image preloading:** Preload current-tier monster images and all event images to avoid mid-game flicker
- **Save/load:** `localStorage` persistence so players can resume runs
- **Audio:** Synthesized sound effects (hits, misses, potions, traps, victory fanfare)
- **Difficulty settings:** Easy / Normal / Hard affecting starting HP, gold, monster scaling
- **Meta-progression:** Unlockable perks across runs (stored in localStorage)
- **Code split:** Break `game.js` into modules (combat, events, gear, ui) if it grows further
- **Accessibility:** ARIA labels, focus indicators, color contrast checks

## Notes

- The game relies on internet access to load images from GitHub. If those URLs ever change, update them in `game.js`.
- No build tooling — just open `index.html` in a browser to test locally.
- Vue is loaded from a CDN; if you want offline capability, download `vue.global.prod.js` and reference it locally.
