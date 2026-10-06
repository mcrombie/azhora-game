# East Izol: terrain and wildlife

Brief written 4 October 2026 by the coordinating Claude session, under the
[joint completion plan](regional-completion-joint-plan.md) and its [ledger](regional-completion-ledger.md) (queue row 3:
"Mediterranean grass/plain mosaic, wooded pockets and one mountain cell; extend West Izol's coast and inland ground").
Read as every region in this programme is read: **terrain, climate, water, scenery and wildlife only - nothing that
belongs to anybody.**

Two agents work at once in one worktree, **split by layer**: the **ground agent** shapes the ground, the coast and the
Three Presences; the **life agent** builds the scenery and the wildlife. One writer per file.

## Where things stand

- **Worktree** `C:\Users\Michael\Programs\typescript\azhora-game-east-izol`, branch `east-izol`, cut from ``136b582``
  (the Celder delivery, which is waiting for review; South Celder 61 and North Celder 62 are in it). Work only there.
  **Do not commit, push or stash**; the coordinator commits. Never touch another checkout: the main checkout
  `azhora-game` belongs to ChatGPT, `azhora-game-celder` is a frozen delivery, and `azhora-game-land` (`a2e49c3`) is a
  read-only baseline for comparisons.
- **The World Builder repository is read-only** (joint plan). Where the lore and the atlas disagree, the atlas wins;
  say what disagrees and the wording you would propose in your final message, and the coordinator records it in the
  handoff. Never edit a file there.
- **East Izol is registered and wired** (the coordinator's, uncommitted): runtime ID **63**, provisional. The literal
  number is written only in `REGION_IDS` and the developer atlas. Never assert that it is last in a list.
- **Stub modules are wired into every shared file**, as for Celder. Keep every export's name and signature:

| file | exports | wired into |
|---|---|---|
| `src/content/regions/east-izol/east-izol-world.js` | `EAST_IZOL`, `eastIzolOwns(x,z)`, `EAST_IZOL_ARRIVAL`, `EAST_IZOL_LANDMARKS`, `EAST_IZOL_TRAILS`, `EAST_IZOL_VIEWS`, `eastIzolGround(x, z, incoming, before)`, `eastIzolTint(x, z)` | `src/world/terrain/world-terrain.js` (the ground chain, outermost, and the tint table), `src/world.js` (landmarks), `src/ui/map/map-fog.js`, `src/main.js` (views `east-izol-*`) |
| `src/content/regions/east-izol/east-izol-scenery.js` | `createEastIzolScenerySteps({ parent, heightAt, renderedGroundHeight, colliders })` returning `{ metrics }` | `src/world.js` `regionBuild('eastIzol', ...)` |
| `src/content/regions/east-izol/east-izol-wildlife.js` | `EAST_IZOL_WILDLIFE_ZONES` | `src/content/regions/western-regions/west-regions-life.js` |

  `before(x, z)` is the ground without East Izol's layer, for measuring the seam with West Izol (the Celder pattern:
  read `src/content/regions/south-celder/south-celder-world.js`, `celderSeamMove`, and its tests; it is the newest and the most careful).

## The atlas - measured

- **East Izol**: 27 hexes, rows 122-130, q 8-13; hex centres x 450-800, z 1415-2107 (100 m apart along a row,
  86.6 m between rows), through `TRANSFORM.atlasToWorld`:

| row | hexes: terrain, climate, centre |
|---|---|
| 122 | (11,122) grassland Csa (500, 1415); (12,122) hills Csa (600, 1415) |
| 123 | (11,123) hills Csa (550, 1501); (12,123) plains Csa (650, 1501); (13,123) grassland Csa (750, 1501) |
| 124 | (10,124) grassland Csa (500, 1588); (11,124) hills Csb (600, 1588); (12,124) forest Csb (700, 1588); (13,124) grassland Csa (800, 1588) |
| 125 | (9,125) grassland Csa (450, 1674); **(10,125) mountain** Csb (550, 1674); (11,125) forest Csb (650, 1674); (12,125) grassland Csa (750, 1674) |
| 126 | (9,126) plains Csb (500, 1761); (10,126) hills Csb (600, 1761); (11,126) forest Csb (700, 1761); (12,126) grassland Csa (800, 1761) |
| 127 | (8,127) plains Csb (450, 1848); (9,127) plains Csb (550, 1848); (10,127) plains Csb (650, 1848); (11,127) grassland Csa (750, 1848) |
| 128 | (8,128) plains Csb (500, 1934); (9,128) plains Csb (600, 1934); (10,128) grassland Csa (700, 1934) |
| 129 | (8,129) plains Csb (550, 2021); (9,129) grassland Csa (650, 2021) |
| 130 | (8,130) grassland Csa (600, 2107) |

  Grassland 11, plains 8, hills 4, forest 3, mountain 1. Csa 14 on the north and the east coast, Csb 13 in the
  south-western interior, the forest cells and the southern plains.
- **Neighbours by shared edges**: **West Izol 10 (built, region 8)**, edges x 400-550, z 1703-2136; the sea 32. The
  World Builder's sea links (Azhor Stones, East Suval, Iscare Archipeligo, South Suval) are open water, not borders.
- **Water**: the atlas draws no river anywhere on the island.
- The world box and the survey window did not move when East Izol was registered.
- Already East Izol's ground (`regionAt`): the Hearth Road's end (492, 1892), the provisional arrival (500, 1934) and
  all three Presences.

## The lore

`C:\Users\Michael\Programs\typescript\world-builder\azhora_lore\geography\regions\izol.md` - read it all (103 lines).
For the ground and the life:

- One island, West and East Izol together: "large, rocky ... cut by the sea into dramatic coastal formations". The
  stone is "older, harder ... dark grey and iron-brown in the lower elevations, lightening to slate-grey at height";
  "good pasture on its softer slopes and very little else".
- "The coast is the island's productive zone": small alluvial flats where water reached the sea, "separated by the
  headland country that constitutes most of Izol's coastline: high cliff faces, sheltered coves reachable by sea but
  not easily by land, stretches of coast where the interior slopes straight to the water".
- "The interior rises progressively from the coastal zone toward the island's central heights, where three peaks stand
  at intervals too wide to be called a range - isolated mountains, each distinct in profile and each visible from
  points across the island": **the Three Presences**. "Each peak has a shrine maintained by the highland tribes" -
  the shrines are owned: keep a summit platform clear, build nothing on it.
- **Merrath**, "on the east coast, facing the open sea" - a town: owned. Reserve its flat (below).
- **The Hearthstone**, where the Assembly is sworn "where all three presences can witness it", at the island's centre -
  owned. Reserve its site (below).
- **The atlas wins on water**: the lore's towns sit where "rivers have cut their way to the sea"; the atlas draws no
  river on Izol. Build at most small seasonal gullies and damp hollows that fall to the coves (no named river, no lake),
  and record the discrepancy.
- Wildlife: the fauna overview (`azhora_lore/fauna/azhoran_fauna_overview.md`), its **Iberos Coast and the Iberos Sea**
  section (seabird colonies on "rocky headlands and offshore islands", the cetaceans offshore, the grey dolphins the
  Ascarths and Gala already carry), and what West Izol carries (`src/world/life/regional-wildlife.js`: headland hill-sheep, shore
  gulls, gorse hares). The highland tribes' flocks are stock - **not yours**.

## What West Izol already put in East Izol - adopt it, do not duplicate it

West Izol (`src/content/regions/izol/izol-world.js`, `src/content/regions/izol/izol-scenery.js`) was built while East Izol was unbuilt and reaches into it:

1. **The Three Presences** (`THREE_PRESENCES` in `src/content/regions/izol/izol-world.js`): three skyline props at (520, 1690), (588, 1866)
   and (566, 1990), tops at 122, 136 and 116 m, built as seven-sided meshes with no colliders ("a skyline, not
   scenery"); the northern one stands on the atlas's mountain hex (10, 125). They are seen from West Izol's
   Sightstone (380, 1802) "all three at once". **The ground agent makes them real ground** at the same places, heights
   and profiles (width, depth, lean), each distinct, rock at height, and then retires the props with the narrowest
   change in `src/content/regions/izol/izol-scenery.js` (build them only while East Izol is unbuilt), so nothing doubles. The Sightstone
   view must still show all three.
2. **The Hearth Road** (`IZOL_ROAD`) ends at (492, 1892), "toward the island's centre and the Hearthstone, which is
   outside the built world". Roads are owned: do not extend it. Its end must stay on walkable ground that meets the
   road's own level.
3. **West Izol's ground** along the shared line (10 edges): meet it at the line (the Celder seam method); West Izol's
   ground never moves.

## Reserved places (shape the ground round them, build nothing on them)

- **The Hearthstone's site**: open, level ground near the Hearth Road's end, about (500-560, 1860-1920), from which all
  three Presences stand in view. Builder's proposal; say where you put it.
- **Merrath's flat**: an alluvial flat on the east coast with a cove, big enough for a town (about 150 m by 100 m).
  Builder's proposal; say where.
- **A summit platform on each Presence** for its shrine.

## The ground agent

**You own**: `src/content/regions/east-izol/east-izol-world.js`, East Izol's rows in `src/world/terrain/region-layout.js` (biome), `src/world/terrain/region-world.js`
(`REGION_TERRAIN`, `REGION_TEXT`) and `src/dev/tools/build-status.js`, `tests/own-sky.js` (only for a sky of its own),
`tests/east-izol-world.test.js`, the East Izol lines in `src/world/terrain/world-terrain.js`, the East Izol probes in
`tests/southwest-world.test.js` (the tint guard), the Presences' retirement in `src/content/regions/izol/izol-scenery.js`, and - only if you
propose it and say why - East Izol's entry in `CLIMB_REGIONS` (`src/gameplay/movement/climbing.js`). Small byte-preserving edits on your
own lines; never rebuild a shared file; check `git diff --stat`.

1. **The interior**: rising from the coast to the central heights; the Three Presences as three isolated, distinct
   mountains, not a range; the softer pasture slopes between; the atlas's hills where they are; the forest cells as
   sheltered wooded pockets in folds, not a belt.
2. **The coast**: mostly headland country - cliff faces, coves reachable from the sea, stretches where the slope runs
   straight into the water - with Merrath's flat and one or two other small flats. Real shore levels at the waterline;
   nothing floating, no submerged dry land.
3. **Water**: seasonal gullies to the coves at most; no mapped river, no lake.
4. **Every border joins**: half-metre samples along every edge with West Izol, worst step under about half a metre,
   or an authored cliff you name. The coast meets the sea.
5. **Colour**: by stone and height (dark grey and iron-brown low, slate-grey high), pasture, maquis, cove sand and
   shingle, cliff.
6. **Climate**: Csa and Csb by the atlas's own split; default sky unless you argue for one.
7. **Climbing (proposal)**: the Presences' upper faces would want climbing terrain; if you register East Izol in
   `CLIMB_REGIONS`, every summit must keep a walkable natural way up its shoulder to the platform, and the coast path
   and the principal journey must stay walkable. Otherwise leave climbing alone and say so.
8. **Landmarks, trails, views, arrival**: a handful of natural places for the chart (descriptive names, or names from
   the Izoli profile in `world-builder/azhoran_language_profiles.py` if it has one; the Presences stay unnamed, as the
   lore keeps them), views for review including **walker's-height** views (an eye 1.8 m over the ground) and an
   `east-izol-wildlife` view, and a developer arrival on dry ground.

## The life agent

**You own**: `src/content/regions/east-izol/east-izol-scenery.js`, `src/content/regions/east-izol/east-izol-wildlife.js`, `tests/east-izol-life.test.js`, and in
`src/content/regions/western-regions/west-regions-life.js` only what a new species needs. Do not edit any other shared file.

1. **Scenery**, natural only, by the Mediterranean climate and the stone: sea turf and short pasture on the softer
   slopes, maquis and garrigue (gorse, thorn, rosemary-like scrub - use West Izol's kit where it fits), rock and scree
   at height and on the headlands, wind-bent pine and evergreen oak in the forest cells and the sheltered folds, cove
   sand and shingle. Place everything by `heightAt` and the water at build time - **the ground agent is reshaping the
   ground while you work** - never a hard-coded height; keep clear of trails, landmarks and the reserved places.
   Instanced meshes for anything repeated; trees typed and harvestable (`registerWorldTree`, as Celder and Legemum).
2. **Wildlife**: seabird colonies on the headland cliffs; dolphins offshore if the existing rig allows; hares in the
   gorse; what the fauna overview and the neighbours support on a rocky Mediterranean island (wild goats on the
   Presences if a rig exists and the overview allows; say if not). No stock. The west's laws hold
   (`tests/west-life.test.js`), and a band has room behind it.
3. **Vary the herds and flocks**: each band its own layout - the Celder review found two herds spawned in one pattern.
4. Re-run your tests after the ground agent's last change.

## Tests - fast

- Scoped worlds: `await scopedWorld(scene, [63, 8])` builds East Izol and West Izol; one country alone in about 16 s.
  Pure functions test in under a second.
- **Up to two test processes per agent at once.** Never the full suite. `node scripts/run-tests.cjs <files>`.
- Run at least: your own files; then `region-layout`, `region-survey`, `region-sky`, `map-fog`, `southwest-world`,
  `izol` tests (`ls tests | grep -i izol`), `nobody-sealed-in`, `languages` (ground agent); `west-life` law by law for
  your zones, `wildlife-loading`, `regional-build-steps` (life agent).
- **Red before you started, not yours**: `languages` ("East Ibenwood has no tongue"), `izol-world` (line 66, the world's
  eastern edge `WORLD_BOUNDS.maxX` held between 600 and 620: red on `a2e49c3` too), `chameleon`, `company-route-world`,
  `local-map-data`, `drent-world`. The coordinator already moved `tests/developer-atlas.test.js`'s unbuilt example
  from East Izol to Alezhor. Before calling anything else pre-existing, run it in
  `azhora-game-celder` (the base) and compare names and messages.
- **No Electron.** The coordinator takes the review render.

## Final message

Read by the coordinator, short: what you built (with numbers), every test file and its result, your labelled choices
and what the user should decide, discrepancies with the lore and your proposed wording, anything not verified.
