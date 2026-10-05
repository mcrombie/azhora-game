# South Celder and North Celder: terrain and wildlife

Brief written 2026-10-03 by the coordinating session. The user: "now start building the wildlife and terrain
of South Celder and North Celder". Read as every region in this programme has been read: **terrain, climate,
water, scenery and wildlife only — nothing that belongs to anybody.**

Two agents work at once in one worktree, **split by layer, not by country**: the lore treats Celder as one
plain, and two halves shaped by two hands would leave a ridge or a valley along their shared line.

- **The ground agent** shapes the ground and water of both countries.
- **The life agent** builds the scenery and the wildlife of both.

## Where things stand

- **Worktree** `C:\Users\Michael\Programs\typescript\azhora-game-celder`, branch `celder`, cut from main
  `a2e49c3`. Work only there. **Do not commit, push or stash.** Never touch any other checkout; the main
  checkout `azhora-game` may have another worker in it. `C:\Users\Michael\Programs\typescript\azhora-game-land`
  is a clean copy of the base for baselines: single test files there, read-only.
- **Both regions are registered and wired** (uncommitted, the coordinator's): South Celder is **61**, North
  Celder **62** (Babon is 60). The literal number is written only in `REGION_IDS` and the developer atlas: it
  may be renumbered when this lands. Never assert that either is last in a list.
- **Stub modules are wired into every shared file.** Keep every export's **name and signature**:

| file | exports | wired into |
|---|---|---|
| `src/{south,north}-celder-world.js` | `SOUTH_CELDER` / `NORTH_CELDER`, `southCelderOwns(x,z)`, `SOUTH_CELDER_ARRIVAL`, `SOUTH_CELDER_LANDMARKS`, `SOUTH_CELDER_TRAILS`, `SOUTH_CELDER_VIEWS`, `southCelderGround(x, z, incoming, before)`, `southCelderTint(x, z)` (and the same for North) | `src/world-terrain.js` (the ground chain, outermost, and the tint table), `src/world.js` (landmarks), `src/map-fog.js` (landmarks become chart areas), `src/main.js` (views `south-celder-*` / `north-celder-*`) |
| `src/{south,north}-celder-scenery.js` | `createSouthCelderScenerySteps({ parent, heightAt, renderedGroundHeight, colliders })` returning `{ metrics }` | `src/world.js` `regionBuild('southCelder', …)` |
| `src/{south,north}-celder-wildlife.js` | `SOUTH_CELDER_WILDLIFE_ZONES` / `NORTH_CELDER_WILDLIFE_ZONES` | `src/west-regions-life.js` |

  The ground chain: `northCelderGround(x, z, southCelderGround(x, z, ground, before), before)`, where
  `before(x, z)` is `groundBeforeCelder` — the ground without either Celder, for measuring a seam (the
  Varn/Nether pattern). Codex's newest countries are the interface's precedent: read `src/legemum-world.js`,
  `src/legemum-scenery.js`, `src/legemum-wildlife.js` and how they are wired.

## The atlas — measured

- **South Celder**: 37 hexes, all `plains`; `Dfa` × 36, `Cfa` × 1 at (-2,96). Rows 95-99, q -12...-2; hex
  centres x -2950...-2100, z -924...-577 (x = 100(q + r/2) - 6700, z = 86.6025 r - 9150.9). Neighbours by
  shared edges: **West Lotharn Mountains 16 (built, 27)**, North Celder 14, **Yunethre 8 (built, 38)**, East
  Oremindi Mountains 7 (unbuilt), **South Oremindi Mountains 4 (built, 37)**, **South Mithala 1 (built, 28)**.
- **North Celder**: 34 hexes, `plains` × 26 and `grassland` × 8 (the eastern hexes); `Dfa` × 33, `Dfc` × 1 at
  (-6,90). Rows 90-94, q -8...1; hex centres x -2800...-2000, z -1357...-1010. Neighbours: South Celder 14,
  **West Mithala 12 (built, 29)**, East Oremindi Mountains 10 (unbuilt), Henborth 8 (unbuilt), **South
  Mithala 6 (built, 28)**.
- **Water**: the atlas draws **small streams along North Celder's eastern border** — 11 edges with West
  Mithala and 6 with South Mithala — and **one edge between the two Celders**, (-2,94)|(-2,95). Nothing else.
  The Mithala builder built those border streams as Mithala's own (`MITHALA_WEST_ARM`, `MITHALA_CELDER_WATER`
  in `src/west-regions.js`; `docs/mithala-report.md`) when Celder was unbuilt outland — the Treloss lesson
  (`docs/design-answers.md`, 2026-10-03): their Celder bank is outland ground until now.
- The survey window and the world box do not move (both countries are well inside).

## The lore

`C:\Users\Michael\Programs\typescript\world-builder\azhora_lore\geography\regions\celder.md` — read it all
(103 lines). For the ground and the life:

- The **western margin of the Mittoli plains**, between the Oremindi's eastern foothills and the country that
  flattens into Mithala. "Not quite the flat of the lower Lizeem — there is a **gentle gradient from the
  mountain base** that gives the rivers enough current to run clear, and the terrain has **low swells** …
  not significant enough to be called hills … significant enough to give horses purchase and give cavalry
  commanders sight lines."
- "The rivers here run **faster and colder**." "The grass is different where the **mountain streams spread
  their mineral silt** across the plain margin." **River terraces** are among the finest grazing on the
  continent.
- "The **foothills along Celder's western edge** are the transition zone between the plain and the Oremindi
  proper": settled, grazed, quarried. Their ground is yours; the settlement and the quarries are not.
- **The Oremindi on the western horizon**, white-capped and unignorable (the East Oremindi is unbuilt
  outland: whatever already stands there is what shows).
- **Climate**: winters "broken by the dry western wind that comes off the Oremindi's eastern face and can
  raise the temperature twenty degrees in an afternoon".
- **Wildlife**: the horses are bred stock — **not yours**. The fauna overview names the **frostback
  buffalo**, "a heavy wild bovid of the Mithsla and Celder plains whose northern summer circuit sometimes
  reaches Henborth" (`azhora_lore/fauna/azhoran_fauna_overview.md`, line 73 — read the whole paragraph and
  the file's grassland sections). Derive the rest from that file and from what the built neighbours already
  carry (Mithala, Yunethre, the West Lotharn: `src/mithala-wildlife.js` and `src/west-regions-life.js`).
- **Not yours**: Canerd and **its mound** (the lore calls the mound artificial — a made thing), the
  horse-lord houses, herds, studs, farms, quarries, roads, people. Say where Canerd's mound would stand
  ("somewhere on the plain west of central Celder").
- **The atlas wins**: the lore runs the upper Lizeem "through the center of Celder"; the atlas has no river
  there. The ground agent rewrites that in the lore, in place, to fit the atlas, and says so (never commit,
  stage or stash in the lore repo).

## The ground agent

**You own**: `src/south-celder-world.js`, `src/north-celder-world.js`, both countries' rows in
`src/region-layout.js` (the biome entry), `src/region-world.js` (`REGION_TERRAIN` and `REGION_TEXT` rows) and
`src/build-status.js`, `tests/own-sky.js` (only if you give them a sky of their own), the Celder probes in
`tests/southwest-world.test.js`, `tests/south-celder-world.test.js`, `tests/north-celder-world.test.js`, the
Celder lines in `src/world-terrain.js`, and — **only where the seam needs it** — the Mithala border streams in
`src/west-regions.js` / `src/mithala-world.js`. Edit shared files only on your own lines, with small
byte-preserving edits (read, replace your line, write at once); never rebuild a file from HEAD; check
`git diff --stat` shows only your lines.

1. **The plain**: falling gently east from the mountain foot to the Mithala margin, in low swells with sight
   lines; the western foothills; the river terraces and the mineral-silt fans where the mountain water comes
   down. One landscape across both countries: **no ridge, valley or step along their shared line**.
2. **Water**: meet the Mithala border streams so their Celder bank is real ground at the stream's own level —
   no buried water, no cliff bank, no step in the water (`docs/design-answers.md`, the Treloss). The one
   stream edge between the two Celders: build it or explain it. Fast and cold means a steeper fall, gravel
   beds, wadeable.
3. **Every border joins**: half-metre samples along every shared hex edge with a built neighbour, worst step
   under about half a metre (`eastPyrosSeamMove` in `src/east-pyros-world.js` and the Nether Desert's seam,
   commits `d460241` and `4592af8`, are the method). Unbuilt neighbours: feather to what is there.
4. **Colour**: `southCelderTint` / `northCelderTint` must paint (the tint guard in `tests/southwest-world.test.js`
   is red until they do), by what decides colour here — terrace, silt fan, swell crest, foothill, stream bank.
5. **Climate and sky**: `Dfa`; keep the default sky unless you argue for one (then `tests/own-sky.js`).
6. **Landmarks, trails, views, arrival**: a handful of natural places for the chart (no names of owned
   things; names derive from the `mittoli` profile in `world-builder/azhoran_language_profiles.py` — Celder
   speaks upper-plain Mittoli — or stay descriptive), review views for both countries.

## The life agent

**You own**: `src/south-celder-scenery.js`, `src/north-celder-scenery.js`, `src/south-celder-wildlife.js`,
`src/north-celder-wildlife.js`, `tests/celder-life.test.js`, and in `src/west-regions-life.js` only what a
new species needs (its rig, its gait). Do not edit any other shared file; if you need a change elsewhere,
say so in your final message.

1. **Scenery**, natural only, by lore and climate: tall grass and the finer terrace grass, scrub and stone on
   the swells and the foothills, trees only where the water and the foothills allow (a Dfa plain is open
   grassland), the mineral-silt fans' grass, the streams' margins. Place everything by `heightAt` and
   `world.waterAt` / `westWaterSurface` at build time — **the ground agent is reshaping the ground while you
   work**, so never hard-code a height; keep clear of the trails and landmarks the world modules export.
   Follow `src/legemum-scenery.js`'s step-wise shape; use instanced meshes for anything repeated.
2. **Wildlife**: the frostback buffalo (wild, heavy, migratory: its range and a herd that behaves like one),
   and what else the fauna overview and the neighbours support on this plain — grassland birds, a small
   predator, something at the streams. **No domestic stock.** The west's laws hold (`tests/west-life.test.js`:
   nothing is walked down; a band has room behind it). A herd of heavy bovids is the case the cattle law was
   written for: read it.
3. Test on a scoped world (below). **Re-run your tests after the ground agent's last change**: when you are
   otherwise done, check `git diff --stat src/*-celder-world.js` and re-run if the ground moved since your
   last run.

## Tests — fast

- Scoped worlds: `import { scopedWorld } from './scoped-world.js'` and
  `await scopedWorld(scene, [61, 62, 29, 28, 27, 38, 37])` builds both Celders and every built neighbour in well
  under a minute; one country alone in about 16 s. Pure functions test in under a second.
- **Up to two test processes per agent at once** (two agents share the machine). Never the full suite.
  `node scripts/run-tests.cjs <files>` runs files in separate processes.
- Run at least: your own files; then `region-layout`, `region-survey`, `region-sky`, `map-fog`,
  `southwest-world` (the tint guard), `mithala-world`, `west-lotharn-world`, `yunethre-world`,
  `south-oremindi-metadata`, `nobody-sealed-in`, `west-rivers` (ground agent); `west-life` law by law for your
  zones only, `wildlife-loading`, `regional-build-steps` (life agent).
- **Red on main already, not yours**: `languages` ("East Ibenwood has no tongue"), `chameleon` (19 vs 55),
  `company-route-world` (Mus stalls), `local-map-data` (16 vs 15), `drent-world` (Killian's hair). Before
  calling anything else pre-existing, run that file in `azhora-game-land` and compare names and messages.
- **No Electron.** The coordinator takes the review render when both of you are done.

## Final message

Read by the coordinator, short: what you built (with numbers), every test file and its result, your
labelled choices and what the user should decide, anything not verified.
