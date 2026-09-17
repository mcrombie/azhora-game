# Brief: build Elagos and Ambron, the city on the narrows

Elagos is where Chapter 3 goes if the traveler keeps the Empire's contract. It is the Lake Lands:
lake country on the northern shelf of eastern Azhora, and **Ambron**, the walled city that holds the
narrows where Lake Ela drains toward the Moros plain. Ambron is the largest city on the continent by
most measures. Build it like it matters — it is the seat of the power the player has just sworn to.

**Lean on the lore.** It is at `../world-builder/azhora_lore` (read-only, outside this repo):
- `geography/regions/elagos.md` — the region, the lakes, Ambron, the empire. Read all of it.
- `peoples/the_elagosi.md` — who lives there.
- `geography/regions/moros_plain.md` and `drent.md` for what the traveler has already seen.
Everything you invent must sit on what those say. Where the lore is silent, invent in its voice and
say so in your report. Where the lore is explicit — the narrows, the toll, the layered rebuilding,
the lake-effect winters and the ice-roads — build it.

What the lore gives you, in short (verify it yourself):
- Ambron stands at the **southern gateway of the lake system**, where Lake Ela's outflow narrows
  before dropping to the plain. Every barge, timber raft, load of dried fish and sack of lake grain
  going south passes it. **Toll income is the empire**: it pays the army that enforces the toll,
  which pays the administration, which raises the taxes that pay for all of it.
- The city has **no single architectural period** — layers of building, damage and rebuilding, with
  the oldest lake-stone still in the foundations. Its population rises and falls with the empire's reach.
- The lakes: **Ela** (the great one), **Brul** north-east (cold, stormy), the **Thelas chain** west,
  **Lake Ossen**. Southern outlets: the **Ela-south**, navigable down to the Moros grain towns, and
  the faster **Bruloss**. Winters are hard; the lakes freeze; lake-effect snow closes roads on Ela's
  western shore and **ice-roads open in their place**.

## What to build

- **The region.** Add `'Elagos'` to `PLAYABLE_REGIONS` with its own biome, terrain profile and region
  card, regenerate `src/region-survey.js`, and take the region id the registry gives you. Read the
  region's hexes from `assets/azhora-dev-regions.json`: the lakes, the shape and the size come from
  the atlas, not from imagination. `WORLD_BOUNDS` will grow; say by how much.
- **Lake Ela and the narrows** as real water with a real shore, in the manner of the Caloss and the
  Tessen (`src/pueth-world.js` shows how a river was taken from the map). The narrows are the reason
  the city exists: make the geography legible from the ground.
- **Ambron.** A walled lake city at the narrows, to the shared fortification standard
  (`src/fortification.js`, `src/signs.js`; Solis in `src/west-suval-world.js` is the worked example —
  read it before you start). It should be visibly **bigger and older than Solis**: a causeway or
  bridge over the narrows, a toll house and its chain, quays and barge basins, warehouses, the
  Legate-General's seat, a market, temples, and streets whose stonework changes as you walk from the
  oldest quarter outward. You do not have to make every building enterable; you have to make the
  city feel like the hinge of an empire.
- **People**: fifteen to twenty-five with ambient lines — toll clerks, bargemen, fish sellers,
  imperial soldiers, administrators, lake-country farmers in town to sell, and the poor the tolls do
  not reach. Only Legion people wear Legion armour; soldiers are men by default; locals speak plainly.
  The seam to write on is what the toll does to the people who pay it.
- **The lake country around it**: three or four places with discovery text — a fishing village on
  Ela, an ice-road marker, a drowned causeway, a lakeside shrine — plus terrain and scatter. The rest
  of the region is terrain, scatter and landmarks.
- **The chart**: add Elagos's named ground to `SUBREGIONS` in `src/map-fog.js` (areas do not overlap;
  `tests/map-fog.test.js` checks), and an honest `BUILD_STATUS` entry in `src/build-status.js`.
- **Getting there is the lead's job.** Chapter 3's journey is not built. Leave a clear way in — the
  road up from the Moros arriving at a gate — and add a developer travel point
  (`src/developer-mode.js`, `src/developer-atlas.js`) plus a testing-panel button so it can be visited.

## Rules

- Work only in your worktree (`../azhora-game-elagos`, branch `elagos`). Another agent is building
  **West Izol** at the same time and the lead is working on main: keep edits to shared registries
  (`PLAYABLE_REGIONS`, `REGION_IDS`, `REGION_TERRAIN`, `REGION_TEXT`, `REGION_BIOMES`, the survey
  script, `package.json`'s test list, `src/world.js`, `src/main.js`) as small and local as you can.
  Put your own work in new modules with one call from the world builder and one hook in `src/main.js`.
- `src/main.js`, `index.html` and others are CRLF with very long lines: never reformat, patch by exact
  anchors with a Python script that asserts each anchor occurs once and writes nothing if one fails.
- Performance is the constraint that bites: the city must not cost more in draw calls than Solis
  (about 95 at its gate). Merge static scenery into vertex-coloured batches as `west-suval-world.js`
  does, instance the scatter, and keep shadow casters down. Measure and report.
- `npm test` stays green; add tests for the region (membership, outline, the lake where the map says
  water), the city (a closed circuit, gates walkable, stands standable and reachable, rideable
  approach), the chart entries and the people. Run `npm run test:game` and `npm run test:road` once
  each at the end. Do **not** run `npm run test:autoplay`.
- Check your work by eye with headless review screenshots (see `docs/world-scale-report.md`) of the
  narrows, the toll house, the main street and the city seen from the plain. Delete scratch pages.
- Commit in milestones. Write `docs/elagos-report.md`: what the lore gave you, what you invented and
  why, coordinates, files touched, test and smoke results, what is stubbed, and what the lead must
  resolve on merge.
