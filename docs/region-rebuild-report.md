# Region rebuild: what was built

The straight 700 m road along -Z is gone. The playable world is now the four
authored regions of the atlas — **Drent**, **Luscia**, the **Moros Plain** and
**East Suval** — at their authored shapes, sizes and relative positions, north
up, 56 m per hex. This is the build report for `docs/region-rebuild.md`.

## How coordinates map

Everything comes from `HEX_WORLD_TRANSFORM` over `assets/azhora-dev-regions.json`.
World -Z is atlas north, +X is east, one authored hex is 56 m, and Tidehaven's
coast hex is world `(0, 29)`.

`routeAnchors(survey)` values used, exactly as the scaffold returns them:

| Anchor | World (x, z) | Region |
| --- | --- | --- |
| `tidehaven` | `(0, 29)` | Drent |
| `drentHeart` | `(-210.4, 7.9)` | Drent |
| `calossCrossing` | `(-344.9, 92.9)` | Drent–Luscia border |
| `lauvelField` | `(-385.9, 182.9)` | Luscia |
| `morosGate` | `(-427.0, 259.4)` | Luscia–Moros border |
| `legionCamp` | `(-549.2, 348.1)` | Moros Plain |
| `suvalBorder` | `(-231.0, 283.6)` | Luscia–East Suval border |
| `elod` | `(-28.0, 368.5)` | East Suval |
| `suvalHills` | `(-91.3, 410.7)` | East Suval |

`worldBoundsFor(survey)` gives the world extent, and it is now the single source
for `world.bounds` and for `WORLD_BOUNDS` in `src/road-checkpoint.js`:
`minX -844.0, maxX 144.0, minZ -208.8, maxZ 654.8` — about 990 m by 860 m.

### Tidehaven is carried over, not redrawn

Tidehaven, the landing, the Greenway tutorial, Willowmere Pond, the six woodland
places, the Bramble Scout Camp and every NPC in them keep their original local
coordinates. They live inside `villageRoot`, a group at world `(-20, 0, 29)`
rotated `+π/2`, so the settlement's old "inland" (-Z) direction became world
**-X** and its sea moved from the south to Drent's **east** coast.

```
world = villageToWorld(localX, localZ) = { x: localZ - 20, z: 29 - localX }
local = worldToVillage(x, z)          = { x: 29 - z,      z: x + 20     }
```

Everything crossing that boundary is converted once: colliders (through `vpush`,
which also swaps `hx`/`hz` and turns `angle` by the same quarter turn), exported
gameplay points, tree trunks for the squirrels, and the paths the charts draw.
`forest-places.js` and `forest-hideout-world.js` still build in local metres —
they are handed `villageRoot` and a collider proxy — while `regional-places.js`
and everything new build directly in world metres.

Landmarks that moved, for reference: the village green `(-15, 29)`, the straw
post `(-32, 26)`, the warning bell `(-45, 25)`, the ambush clearing `(-54, 29)`,
Greenway Watch `(-86, 29)`, Willowmere Pond `(-97, 2)`, Fernway Rest
`(-128, 34)`, the Bramble Scout Camp `(-138, -31)`, and the old field gate —
now **the Caloss Gate** — at `(-176, 29)` with its barrier line at `x = -182`.

## What each region contains

### 1 · Drent (39 hexes, ≈530 × 310 m)
All dense broadleaf forest (`REGION_BIOMES.Drent`), with the Stills along its
eastern outline. It holds the whole carried-over settlement plus one farm
clearing cut out of the forest:

- **The Avrel Clearing** at `(-236, 30)`, radius 38 — the old Sunmeadow farm.
  Crop rows, fences, hay bales, a canvas lean-to, cottage and the turning
  **clearing mill** at `(-222, 62)`.
- **Corvan's Legion post** at `(-232, 22)`: awning, work table, standard and
  stores; Corvan stands at `(-230, 17)`, the tumbled cart at `(-248, 14)`, the
  three parcels around it, and the two raiders spawn among them.
- Enna's **Mill Commons** at `(-236, 62)` with the grain hoist.
- The signposted Caloss road runs on south-west out of the clearing.

### 2 · Luscia (23 hexes, across the Caloss)
Sparse woodland: grass with seeded copses that thin toward the Moros.

- **The Caloss** is a real river along the Drent–Luscia border, from the Elagos
  hills at `(-556, -2)` to the Stills at `(-182, 188)`, with a carved channel,
  a downhill surface profile and water that cannot be waded.
- **The Caloss bridge** at the crossing, rotated onto the road heading, with the
  original damaged western strip, its repair cord and the repaired deck. Hollis
  keeps it from `(-357, 106)`; the reedcutters' camp and Merren's landing
  workshop sit on the Luscian bank; the marked fishing bank is upstream at
  `(-306, 104)`.
- **Sava's shrine** at `(-374, 134)` and the three waymarkers along the road.
- **Iven's relay** at `(-401, 196)` beside the **field at the Lauvel**
  (`-386, 183`): broken carts, a fallen rebel banner, a burial line and two
  Legion pickets. A **burned hamlet** stands off the Suval road at `(-348, 212)`.

### 3 · Moros Plain (31 hexes, west of Luscia)
Flat, treeless grassland.

- The **Moros gate** at `(-427, 259)`, its posts straddling the road.
- The **Legion camp** at `(-549, 348)`: a palisade with the road running through
  its gates, three tent lines, a command tent and the Legate's standard.
- A **horse line** with four horses at `(-566, 320)` — scenery for a riding
  mechanic that is not built.
- The contested **border stockade** at `(-368, 308)`.
- The **frontier rope** at `x = -782` marks where the built world ends.

### 4 · East Suval (23 hexes, south of Luscia)
Grey stone hills: heather, ridge rock and the old Threefold Rise look.

- **Elod's border post** at `(-224, 292)`: two stone pillars straddling the road,
  a raised barrier, a shelter and stores.
- The **roofless waystation** at `(-154, 328)` with Oda's shelter beside it.
- The gate of **Elod** at `(-28, 368)` above the Stills, with three slate-roofed
  houses.
- A **hill-bandit lookout** ring at `(-74, 498)` in the south. No encounters.

## Roads

`world.paths[0]` is the main road, and the autopilot still follows it. Its first
thirteen points are Tidehaven's original trail, converted; then it runs
`Caloss Gate → Avrel clearing → Caloss bridge → Sava's shrine → the Lauvel relay
→ Moros gate → Legion camp → the frontier`. `world.suvalRoute` is the branch that
leaves the road at `(-390, 162)` for `suvalBorder` and Elod. `world.routeJourney`
is the main road from the Caloss Gate onward — what the traversal walks and what
the charts draw as the road.

## Terrain

`src/world-terrain.js` holds the ground rules:

- Biome base level and relief are blended across the containing hex and its six
  neighbours, so regions meet without a seam (`terrainMix`).
- Land and sea come from the authored atlas: every claimed hex near the playable
  window is baked into `src/region-survey.js`, and a smoothed signed-distance
  field over that mask gives the coast. Everything else inside the world bounds
  is the Stills. Coastlines therefore follow the map rather than a drawn curve.
- Tidehaven keeps its own height field (`villageBase`), blended out over the last
  40 m of the settlement, and the Stills reach a little inside Drent's easternmost
  hex so the original bay, beach and pier are unchanged.
- The Caloss has a real bed with a profile that never flows uphill; the bridge
  deck is a height override, and the lane is exactly as wide as the deck.

One graded terrain grid covers the whole world: 2.5 m around Tidehaven and the
Avrel clearing, widening to 7 m at the edges, split into 49 tiles that share one
vertex buffer for culling.

## Tests and smokes

All green, run in this order on the final tree:

| Check | Result | Artifact |
| --- | --- | --- |
| `npm test` | 283 tests, 283 pass, 0 fail | `tests/artifacts/unit-latest.txt` |
| `npm run test:game` | pass | `smoke.json` `ok: true` |
| `npm run test:road` | pass | `road-traversal.json` `ok: true` |
| `npm run test:checkpoints` | pass | `road-checkpoints.json` `ok: true` |
| `npm run test:local-map` | pass | `local-map-smoke.json` `ok: true` |
| `npm run test:autoplay` | pass | `autoplay-smoke.json` `ok: true` |

`failure.json` is absent after the final runs.

The traversal walks **3 209 m** of real road — out through Drent, over the Caloss,
down the Suval branch to Elod and back, then west to the Legion camp and into the
frontier rope — and enters all four regions. Observed mean frame intervals:
Drent 26.1 ms, Luscia 21.2 ms, East Suval 20.8 ms, Moros Plain 20.5 ms. The old
straight road recorded 31 ms means for the same harness, so frame times improved
despite a six-times larger world. Autoplay finishes the whole main quest in
137 s with two fights.

New and rewritten tests: `tests/region-survey.test.js` (the baked survey must
match the atlas and is regenerated by `node scripts/build-region-survey.mjs`) and
a rewritten `tests/regions-world.test.js` (authored outlines, the whole road
walked both ways, a road-corridor reachability flood, the Caloss, the frontier
rope and the batching comparison).

## Old-save compatibility

`WORLD_BOUNDS` in `road-checkpoint.js` is `worldBoundsFor(survey)`. A checkpoint
saved on the old road north of `z = -209` — anything past the old Sunmeadow
Plain — is rejected with the existing "The saved position lies outside the
playable road" message. Nothing crashes.

A save taken on the old forest coast still validates, because its coordinates fall
inside the new bounds. `continueRoad()` now honours a saved position only when it
both stands and lies inside one of the four authored outlines; otherwise the
traveler resumes at `world.spawn` (tutorial) or at the spawn of the region their
journey has reached. Quest, satchel, weapon, woodland and campaign state restore
unchanged in every case.

## Known gaps

- **Dialogue for the new hooks is not written.** The Lauvel field, the burned
  hamlet, the Moros gate, the Legion camp, the stockade, Elod's border post,
  the waystation, Elod and the bandit lookout are scenery and landmark entries
  only. There are no NPC stands with conversations at any of them: the Legate,
  the two border guards and the picket soldiers are not spawned.
- **No wolves.** The doc asks for wolves as Luscian scenery; none are built.
  `road-life.js` still carries only sheep, bank birds and rock hares, now moved
  to the Moros, the Caloss bank and the East Suval hills.
- **The Moros and East Suval have no quests.** `journey.js` still runs its three
  chapters (2, 3, 4) as quest-chapter ids, not region ids: chapter 2 is Corvan in
  Drent, 3 is Hollis at the Caloss, 4 is Sava and Iven in Luscia. The same is
  true of `regional-life.js`. Renaming those ids to match the region ids is a
  separate, larger change.
- **Ground tinting is coarse near clearings.** Worn-patch circles and the road
  surface produce large pale areas around the Avrel clearing; a per-biome
  ground-detail pass would help.
- **The coast is only modelled where the Stills are.** Land beyond the four
  regions (Pueth, Elagos, Peblos, Nesdor, West Suval) is generic "outland"
  relief with no scenery; it is horizon, not content.
- **Region-2/3/4 audio geography is approximate.** `road-audio.js` now keys the
  Caloss on distance to the crossing and the shore on Drent's `x`; the Moros and
  East Suval ambiences are flat per region.
- The verge botany (`road-verges.js`) now follows the road by arc length rather
  than by `z`, but its three bands are still evenly split along the road instead
  of being chosen per biome.

## Exact next steps for a content pass

1. **NPC stands and dialogue for the new hooks.** In order of story weight:
   - A Legion picket at the Lauvel (`-392, 169` and `-400, 191` are clear) who
     can describe the battle ten days ago; reuse the `rise-custodian` model.
   - The **Legate** at the command tent, `(-543, 368)`, with the camp scene the
     campaign chapter wants: a briefing, the stockade order, and the choice the
     player has been walking toward.
   - **Two guards** at Elod's border post, `(-228, 296)` and `(-220, 288)`,
     neutral to both armies — the first people who are neither Legion nor rebel.
   - A survivor at the burned hamlet, `(-344, 208)`.
   Add them to `src/journey-content.js`-style modules, not to `campaign*.js`.
2. **Wolves in Luscia.** Add a fourth zone to `ROAD_LIFE_ZONES` in
   `src/road-life.js` around `x ∈ [-430, -395], z ∈ [205, 240]` (clear of the
   road and the relay), with the same scenery-only rules as the sheep. Update
   the count assertions in `tests/road-life.test.js`.
3. **The Legion camp scene.** The palisade, tents, command tent, horse line and
   standard exist. What is missing is: a camp interior worn-ground pass, a
   cooking fire the player can use, and a `regional-life`-style optional errand
   so the camp is visitable before its chapter opens.
4. **Chapter ids.** Decide whether `journey.js` / `regional-life.js` chapter ids
   should become region ids (1 Drent, 2 Luscia, …). If so, migrate
   `completedRegions`, the `JOURNEY_REGIONS` table and the checkpoint validator
   together, and bump `ROAD_CHECKPOINT_VERSION`.
5. **Biome polish.** Luscia's copses could use a second, shorter tree; East Suval
   wants heather ground cover distinct from grass; the Moros wants a wind pass on
   its grass. All three hook into `scatterBlock` in `src/world-regions.js`.

## Other modules that had to move with the world

- **`src/combat.js`** gained `retreatAxis` / `retreatLine` on an encounter, defaulting
  to the old -Z behaviour. The Greenway ambush and the clearing raiders now retreat
  along +X, back toward Tidehaven.
- **`src/autopilot.js`** takes its bell/ambush goal from `world.encounter` instead of a
  literal, and gained `clearLine()`: when the destination is on the road but the
  traveler has strayed off it and the straight line is blocked, it walks back to the
  road first. That is what lets it cross the Caloss bridge reliably.
- **`src/road-audio.js`** keys the shore on Drent's east coast and the river on distance
  to the Caloss crossing; the Caloss is audible from both banks.
- **`src/road-life.js`** exports `ROAD_LIFE_ZONES` and moved its three flocks to the
  Moros, the Caloss bank and the East Suval hills.
- **`src/road-verges.js`** places its botany by arc length along `routeJourney` instead
  of by `z`, so it follows whatever shape the road has.
- **`src/woodland-life.js`**, **`src/forest-story.js`**, **`src/forest-hideout.js`** and
  **`src/regional-places.js`** / **`src/regional-life.js`** had their coordinate
  constants converted.
- **`src/autoplay-smoke.js`**: the anti-teleport check is now measured per *rendered*
  frame (as the road traversal already did) and allows the 3.05 m dodge lunge, which
  is an ordinary player action. It reports `maxMetresPerRenderedFrame` (0.37 m, the
  7.2 m/s cap) instead of a six-frame figure.
- **`src/style.css`**: the opening panel did not fit the 900x640 compact window the
  checkpoint smoke captures. Its bottom offset and paragraph spacing were tightened
  by about 26 px in the <=1100 px media query.

## Files

New: `src/region-survey.js` (generated), `scripts/build-region-survey.mjs`,
`src/region-world.js`, `src/world-terrain.js`, `src/world-regions.js`,
`tests/region-survey.test.js`.

Rewritten: `src/world.js`, `src/regions.js`, `tests/regions-world.test.js`.

Originals of everything replaced or heavily edited are in `docs/rebuild-backup/`.
