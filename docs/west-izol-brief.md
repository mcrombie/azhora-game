# Brief: build West Izol and Izolveth, the port that shelters the Republic's army

West Izol is where Chapter 3 goes if the traveler signs with the Republic. It is the western half of
the island of **Izol**: rocky, maritime, and organised as a **confederation of coastal towns** — and
the single most important thing the lore says about it is that **there is no capital**. No town
dominates; the confederation actively resists concentration. The Republic is a council, not a crown.
Build that: the player should arrive expecting a capital and find something else.

**Lean on the lore.** It is at `../world-builder/azhora_lore` (read-only, outside this repo):
- `geography/regions/izol.md` — the island, the confederation, the goddess at its centre, the coast
  as the productive zone, the three isolated inland peaks, the Izoli Channel. Read all of it.
- Anything under `peoples/` and `culture/` that touches the Izoli or the Iberos Sea.
- `src/campaign-world.js` already names **Izolveth**, "the Izoli port that shelters the Coalition
  army", in West Izol, and the Izoli Republic as the faction that raised the war.
Everything you invent must sit on what the lore says. Where it is silent, invent in its voice and say
so in your report.

## What to build

- **The region.** Add `'West Izol'` to `PLAYABLE_REGIONS` with its own biome, terrain profile and
  region card, regenerate `src/region-survey.js`, and take the id the registry gives you. Read the
  region's hexes from `assets/azhora-dev-regions.json`: the coastline, the size and the inland rise
  come from the atlas. `WORLD_BOUNDS` will grow; say by how much. The sea matters here: shore, water
  and a horizon that reads, as Peblos did (`src/peblos-world.js`, `src/peblos-scenery.js`).
- **Izolveth**, the port: a working harbour on one of the coastal flats the lore describes — moles and
  a harbour mouth, quays with the Coalition's ships and their contingents' banners, warehouses, a
  fish market, ropewalks and a sail loft, the town climbing the slope behind, and a **council house
  that is plainly not a palace**: a hall where the confederation's towns send representatives, with
  the goddess's shrine beside it because the lore puts the theology at the centre of the politics.
  Walls only if the lore supports them; this is a port, not a fortress — the fortification standard
  (`src/fortification.js`) is there if you need a sea wall or a harbour boom.
- **The army it shelters.** The Coalition's soldiers are quartered here: Izoli spearmen, Suvali
  companies, Ambroni rebels, and the rest of the alliance the game already names
  (`COALITION_MEMBERS`). Camps, drill ground, hospital, and the friction of an army billeted on a
  town that did not ask for it.
- **People**: fifteen to twenty-five with ambient lines — councillors and their clerks, ships'
  masters, net makers, a priestess, quartermasters, soldiers far from home, and townspeople who have
  opinions about both. Soldiers are men by default; locals speak plainly; no Legion armour here.
- **The coast and the interior**: three or four places with discovery text — a second, smaller town
  or fishing village, a headland shrine, a boatyard, the road inland toward the peaks — plus terrain,
  scatter and landmarks. The interior is thinly settled; do not over-build it.
- **The chart**: add West Izol's named ground to `SUBREGIONS` in `src/map-fog.js` (areas must not
  overlap; `tests/map-fog.test.js` checks) and an honest `BUILD_STATUS` entry in `src/build-status.js`.
- **Getting there is the lead's job.** Chapter 3's voyage is not built. Leave a clear way in — a quay
  where a ship would put the traveler ashore — and add a developer travel point
  (`src/developer-mode.js`, `src/developer-atlas.js`) plus a testing-panel button so it can be visited.

## Rules

- Work only in your worktree (`../azhora-game-izol`, branch `west-izol`). Another agent is building
  **Elagos** at the same time and the lead is working on main: keep edits to shared registries
  (`PLAYABLE_REGIONS`, `REGION_IDS`, `REGION_TERRAIN`, `REGION_TEXT`, `REGION_BIOMES`, the survey
  script, `package.json`'s test list, `src/world.js`, `src/main.js`) as small and local as you can.
  Put your own work in new modules with one call from the world builder and one hook in `src/main.js`.
- `src/main.js`, `index.html` and others are CRLF with very long lines: never reformat, patch by exact
  anchors with a Python script that asserts each anchor occurs once and writes nothing if one fails.
- Performance: the town must not cost more in draw calls than Solis (about 95 at its gate). Merge
  static scenery into vertex-coloured batches as `west-suval-world.js` and `peblos-scenery.js` do,
  instance the scatter, keep shadow casters down. Measure and report.
- `npm test` stays green; add tests for the region (membership, outline, water where the map says
  water), the harbour (quay walkable, stands standable and reachable, ships clear of the mole), the
  chart entries and the people. Run `npm run test:game` and `npm run test:road` once each at the end.
  Do **not** run `npm run test:autoplay`.
- Check your work by eye with headless review screenshots (see `docs/world-scale-report.md`) of the
  harbour mouth, the quay, the council house and the town from the water. Delete scratch pages.
- Commit in milestones. Write `docs/west-izol-report.md`: what the lore gave you, what you invented
  and why, coordinates, files touched, test and smoke results, what is stubbed, and what the lead
  must resolve on merge.
