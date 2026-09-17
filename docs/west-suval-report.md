# West Suval and Solis: what was built

The build report for `docs/west-suval-brief.md`, on branch `west-suval`.
West Suval is the fifth playable region; Solis is a walled city on its
south-west coast with the Coalition's camp outside it; the parley of the border
chapter happens there; the battle begins with a report and a march; the day
after the battle has its Solis ground; and the city visibly changes hands.

## The region

- `PLAYABLE_REGIONS` gains `'West Suval'` (id 5, `REGION_IDS`/`REGION_NAME_BY_ID`),
  with its own biome `coastal-downs` in `REGION_BIOMES`: tawny long grass, few
  trees and no pines (the scatter's pine odds are zero for this biome), few
  rocks, relief amplitude 3.6 m on a 210 m wave (Moros 0.9, East Suval 11).
  `REGION_TERRAIN` and the region card (`REGION_TEXT`) follow; `terrainMix` now
  derives its weights from `REGION_ORDER` instead of naming four regions, which
  would have produced NaN weights for a fifth.
- `scripts/build-region-survey.mjs` lists West Suval; `src/region-survey.js` is
  regenerated. The hex window did not need to grow. Atlas facts are checked by
  test: 24 hexes (11 grassland, 8 plains, 5 hills), east-south-east of the Moros,
  west of East Suval, south of Luscia, the sea beyond Solis.
- `WORLD_BOUNDS` grows south: `maxZ` 1099 → **1272.6** (x unchanged).
- The sea is on the region's **south-west** side (the atlas's sea neighbours are
  west and south-west of hexes (2,116), (3,117), (4,118), (4,119)), so Solis sits
  on a promontory with water west and south of it.
- Regions, outlines, minimap, trail charts, the chart marker and the region card
  all derive from the registry and needed no code. Two tests that counted to
  four now derive from `PLAYABLE_REGIONS` (`tests/regions-world.test.js`,
  `tests/local-map-data.test.js`), as does the developer atlas's local route
  (`src/developer-atlas.js` spreads its stops evenly for however many regions;
  `src/developer-mode.js` has a `west-suval` ghost-travel point).
- The charts get a `west-suval-water` polygon (`WEST_SUVAL_SEA`), traced row by
  row to West Suval's own shore; offshore islands are ignored, so it is an
  approximation south of Solis.

## Roads and the country

- `SOLIS_ROAD` (`src/region-world.js`, same conventions as `SUVAL_ROAD`:
  authored vertices through `road()`, drawn with `addPath`, measured before
  scenery so nothing is planted on it, exposed as `world.solisRoute`). It leaves
  the border stockade, runs south-east over the downs and ends inside the Gate of
  Sun Horses: **431 m**. A signpost ("Solis" / "The border stockade") stands where
  it first enters West Suval, computed from the road (`WEST_SUVAL_BORDER`).
- **No branch from East Suval's border post.** The outlines would allow one (the
  post is ~140 m north of West Suval's north-east hexes), but the post and that
  border belong to the towns agent, who is closing it; left for the lead.
- Three places with discovery text (`WEST_SUVAL_PLACES`, in `world.landmarks`):
  the Shepherds' Fold (dry-stone ring, turf-roofed hut, thorn tree), the Broken
  Watchtower (a stump of the old kingdom with a sun-horse over the door), the
  Wayside Well (well head, trough, olives, a defaced imperial milestone). Dry-stone
  field walls, olive and thorn trees line the road; an olive grove lies below the
  camp. Wolves and bandits are rumour only (the fold's description, the Suvali
  spearman at the gate).

## Coordinates

Authored (56 m frame) → world. New clusters in `src/world-scale.js`:

| Cluster | r | Authored | World | Holds |
| --- | --- | --- | --- | --- |
| `solis` | 80 | (−297, 551) | (−530.4, 961.1) | The city, ditch, quay, the road outside the gate |
| `coalition-camp` | 42 | (−199, 551), pivot Solis's | (−432.4, 961.1) | The camp; hangs from the city |
| `west-suval-fold` | 16 | (−392, 433) | (−700.0, 750.4) | The shepherds' fold |
| `west-suval-watchtower` | 14 | (−330, 387) | (−589.3, 668.3) | The broken watchtower |
| `west-suval-well` | 10 | (−338, 455) | (−603.6, 789.7) | The wayside well |

Everything in Solis is in its own frame, square to the world:
`solisPoint(a, b)` = centre + (a east, b south) metres. Walls on the rectangle
a ±50, b ±42; the Gate of Sun Horses at (0, −42), the quay gate at (−50, −8).

- Road vertices (world): (−666.6, 527.2) stockade · (−660.7, 582.6) · (−648.2, 645.1) ·
  (−630.4, 704.9) · (−605.4, 764.7) · (−578.6, 820.1) · (−550.0, 862.0) · then in the
  city frame (−2, −78), (0, −56), (0, −42) the gate, (0, −34).
- Border crossing (−636.2, 685.3); signpost (−640.5, 686.6).
- `TERRAIN_PADS` (new, `src/region-world.js`, applied in `regionBase` in
  `src/world-terrain.js`): Solis stands on a plane, level 6.5 m at the centre,
  rising 0.05 per metre eastward (4 m at the quay wall, 9 m at the east wall),
  over the circuit plus 13 m, feathered to the natural ground across 28 m. The
  feather is soft enough that the 7 m terrain grid stays within 3 cm of the
  analytic ground, so roads (lifted 4.5 cm) never sink under it.
- Aftermath sites (`src/aftermath-sites.js`, authored in the `solis` cluster):
  `solis-gate` (−287.5, 497.5) → (−520.9, 907.6), city (9.5, −53.5), yaw π;
  `solis-hall` (−279.5, 553) → (−512.9, 963.1), city (17.5, 2), yaw −π/2, the
  steps of the Court of Oaths; `solis-square` (−317, 543) → (−550.4, 953.1), axis
  `x` (retreat east up the main street to the gate); `solis-approach` (−297, 473.5)
  → (−530.4, 883.6), axis `z` (retreat south to the gate). Both arenas are tested
  clear and level (under 3 m of rise across 46 × 24 m).

## Solis

Tables in `src/west-suval.js` (pure), scenery in `src/west-suval-world.js`
(one call from `world.js`).

**Fortifications, to the shared standard** (`FORT`):

| Measure | Solis |
| --- | --- |
| Circuit | Closed rectangle 100 × 84 m; colliders all round; `canStand` false across the 2.4 m wall thickness |
| Height | Wall walk 4.2 m, parapet coping 5.0 m, merlons 5.7 m above the ground outside |
| Wall walk | 1.9 m walk behind a crenellated outer parapet, low inner parapet; stairs at 4 points (N, E, S, W) |
| Towers | 11 × 6 m square, 8.2 m to the crown and tiled caps above, centred 1 m outside the wall line so they cover its face: 4 corners, 2 per gate, 2 on the south run, 1 on the east. Longest curtain run 39.7 m; 368 m of circuit / 11 towers = 33 m |
| Gates | Two. The Gate of Sun Horses (north, on the road) and the quay gate (west, on the sea); each a 4.6 m passage between its towers under an arch, leaves drawn open, guarded |
| Ditch | 3.5 m wide, centre 8 m out, all round except a 6.4 m causeway before each gate; drawn as a dark trench between the spoil bank under the wall and a low lip, stakes in its floor; box colliders |
| Materials | Dressed stone, patched courses on the sea face, tiled tower caps, the contingents' banners on the towers |

**The three layers.** The old kingdom: the walls, the Gate of Sun Horses under
two rearing bronze horses with ray manes (and wilted festival flowers at the
towers), the sun-horse disc over each keystone and on the Court's pediment, the
Court of Oaths (an open colonnade and hall where the Coalition's council table
stands), the temple of sea and sun with its guest house, bronze statues on the
plaza, a walled court of orange trees, a fountain with a small bronze horse, roof
gardens hanging over the streets. The Empire: the Legion barracks (eagle plaque
chiselled off, windows boarded) and the old tax house (plaque boarded over) by
the gate, a defaced milestone outside it. The Coalition: the Republic's flag over
the gate and behind the council table, the contingents' banners on every tower, a
paymaster's table and strongbox in the tax house door, notices in three hands.

**The town**: 17 buildings inside the walls plus the Court of Oaths, and a net
loft on the quay (19). Market square with six stalls, the fountain and a cart at
its edges; streets as paved ribbons; the quay under the sea wall with two harbour
towers and a boom chain; white cliff rocks where the ground drops to the sea;
a hitching rail outside the Gate of Sun Horses, clear of the road and the fighting
ground (tested at `RIDE.radius`).

**The Coalition's camp** east of the walls inside a light picket line with a north
gate: tent lines under banners for Izol (8 tents), Suval (6), the Ambroni rebels
(6), Selemis, Marosh, the island cities (3 each) and Pyros (1). A cook fire, a
spear rack; a spur path from the road.

**Changing hands.** `world.setSolisHolder('coalition' | 'empire' | 'routed')`
shows the Coalition's camp, banners, flag, strongbox and notices, or the Legate's
standards (over the gate, behind the council table) and the Tribune's notice, or
neither; a struck camp is bare tent rings and stubs, and its tent and picket
colliders are removed. `solisHolder(control, aftermath)` decides: the occupation
map's holder of West Suval, except while the Legion is still clearing the square
(`solis-sweep`, not cleared), when the Coalition's army has broken and the Legion
is not yet in: `'routed'`.

## People (`src/solis-town.js`)

- **The Coalition's garrison** (`holds: 'coalition', region: 'West Suval'`):
  Sergeant Davo Kell and two spearmen on the Gate of Sun Horses, an island marine
  on the quay gate, a captain for each major contingent in the camp lane (Ruan
  Delisse of Izol, Hadrin Sorell of the Suvali companies, Severin Dask of the
  Ambroni rebels, Ithren Mael of Selemis, Gorvan Tesk of Marosh, Pello Arrant for
  the island cities), each with two lines, and Kesh, the whole Pyrosi contingent's
  spokesman. All in `suvali-guard`, men.
- **The Legion's occupation** (`holds: 'empire'`), smaller: two legionaries on the
  Gate of Sun Horses, one on the square, Tribune Orso's clerk in the Court of Oaths.
- **Townsfolk** (no stake; one line each for Coalition, Empire and routed):
  Aurel Mendo the oil and wine merchant, who grumbles about paper scrip; Nerea at
  the fountain; Bastian the quay porter; Old Ismer on the plaza; Keeper Ilaria at
  the temple; Dorotea of the Bronze Mare.
- `src/west-suval-host.js` is main.js's single hook: it registers these people,
  answers their conversations, and each frame sets the holder on the ground, stands
  both garrisons down while routed, and walks the march (below).

## The quest (`src/border-chapter.js`)

Stages: `take-orders` (the Legate's terms) → `pass-gate` (Sergeant Kell reads the
seal at the Gate of Sun Horses: `enter-solis`) → `meet-envoy` (Envoy Telis Orren in
the Court of Oaths: `side-empire` / `side-coalition`) → `report` → `march` →
fight (`reach-line`) → `join-line` after a retreat (`sound-advance`) → complete.

- **The offer.** The envoy puts **50 copper** on the table for a sellsword who
  signs, double the Legate's rate after, and land when the Republic wins
  (`COALITION_SIGNING` = 2 × `MOROS_PAY`). `side-coalition` returns the reward and
  `borderAct` in main.js pays it once; keeping the Empire's contract pays nothing.
  Scrip is only the merchant's grumble.
- **The report.** Empire: back to Legate Verro at the outpost, who asks "Are you
  ready?" ("Yes." / "Give me a moment."). Coalition: Captain Arlen Voss at the Gate
  of Sun Horses asks the same.
- **The march.** On yes, a column falls in behind the traveler: two legionaries
  and up to four of the hired company's mustered men, or four of the valley
  companies. They keep a file two abreast (`marchSlot`), jog when behind, are
  moved up out of sight when more than 30 m behind, and are hidden while the combat
  view draws them as allies. Tribune Orso (or Voss, who rode ahead) holds the line;
  when the traveler comes within 16 m of the line's checkpoint the fight starts
  (`reach-line`); talking to the commander does the same. The march is saved
  state (`ready` without `marched`), so it survives a save.
- The encounter, allies, odds and arena are unchanged; the battle is on the Moros
  side of the stockade.
- **Saves.** `BORDER_VERSION` stays 1. The snapshot gains `entered`, `ready`,
  `marched`; saves without them (the stockade version) still validate, and restore
  keeps their side: terms in hand → `pass-gate`; past the envoy → `report`;
  fought → complete.
- **Autopilot.** `CHOICE_PRIORITY` answers `enter-solis`, `march-out`,
  `reach-line`; `borderGoal` needed no change (it talks to each destination). New:
  `world.enclosures` (Solis, then its Court of Oaths) and `enclosureWaypoint` in
  `nextWaypoint`, so the autopilot enters and leaves walled places by their gates.
  Tested on the built world: road → envoy → road, and envoy → quay gate.
- `src/autoplay-smoke.js` now asserts the traveler reached West Suval before the
  fork and ends on the Moros or in West Suval.

Envoy Telis Orren exists twice and is never out twice (tested for all four
outcomes): the border chapter's only before the fork, the aftermath's only on the
Republic's side after the battle.

## Files

New: `src/west-suval.js`, `src/west-suval-world.js`, `src/solis-town.js`,
`src/west-suval-host.js`, `tests/west-suval.test.js`, `tests/solis-town.test.js`,
this report.

Changed: `scripts/build-region-survey.mjs`, `src/region-survey.js` (generated),
`src/region-layout.js`, `src/region-world.js`, `src/world-terrain.js`,
`src/world-scale.js`, `src/world.js` (imports, road measure/draw, one scenery
call, `solisRoute`/`setSolisHolder`/`enclosures`, landmarks, chart water),
`src/world-regions.js` (clearings spread, no pines on the downs),
`src/border-chapter.js`, `src/aftermath-sites.js`, `src/autopilot.js`,
`src/autoplay-smoke.js`, `src/main.js` (7 lines: import, host creation,
conversation hook, frame hook, reward, chapter toast, a comment),
`src/developer-atlas.js`, `src/developer-mode.js`, `package.json`, and tests
`border-chapter`, `story-stands`, `autopilot`, `developer-atlas`, `regions-world`,
`local-map-data`.

## Tests and smokes

- `npm test`: **414 tests, 414 pass** (402 before this branch's later milestones;
  the base had 376 + the riding tests). New files, both in `package.json`'s list:
  `tests/west-suval.test.js` (10: the region against the atlas, the road and its
  signpost, a rider on the road and through the gate and at the hitching rail, the
  closed circuit sampled every 2 m with both passages walked end to end, the
  fortification measures, footing and reachability of every stand by flood fill,
  the level fighting ground, the struck camp and the holder rule, the country's
  places, the autopilot in and out through the gates) and `tests/solis-town.test.js`
  (7: both garrisons by stake, the captains, the townsfolk under each holder, the
  gate sergeant, the envoy never out twice, the aftermath sites against the city's
  tables, the host's frame and march). `tests/border-chapter.test.js` is rewritten
  for the new stages, the offer and legacy saves; `tests/story-stands.test.js` now
  expects every aftermath variant built and the envoy's party in West Suval;
  `tests/autopilot.test.js` covers the new replies, a whole border run and the
  enclosure rule.
- `npm run test:game`: the first run failed at **"quest HUD did not reflect
  return-courier-satchel; the banner reads What the Legion owes"**. Not from this
  branch: the riding commit (1cd38f6) puts the ostler's errand on the banner after
  the satchel is returned, and `src/road-smoke.js` did not list it. Fixed by adding
  `OSTLER_OBJECTIVE.title` to the banners the smoke accepts, and the smoke run once
  more, since the first stopped before anything else was exercised: **pass**
  (`smoke.json` `ok: true`, 2 358 frames, 34 ms average frame, 356 draw calls,
  696 k triangles, no errors). The frame average was taken while the other agents'
  smokes were running on the same machine and is not a comparison with the 23 ms
  in docs/world-scale-report.md. The story smoke does not reach the border chapter,
  so the march and Solis were not exercised by it.
- Not run: `test:autoplay` (as instructed), `test:road`, and the optional smokes.

## Performance

Measured in headless Chrome (SwiftShader) with the same cameras on this branch
and on `main` at e11dcb0; draw calls and triangles are the renderer's own count
for one frame with shadows. SwiftShader's CPU submission times are not frame
times and are not quoted.

| View | main | this branch |
| --- | --- | --- |
| The road outside the Gate of Sun Horses, looking south | 40 draws / 205 k tris (open sea) | 95 / 277 k |
| Solis's market square, looking west | 94 / 263 k | 128 / 316 k |
| The camp, looking east | 80 / 242 k | 113 / 300 k |
| The border crossing, looking south-east | 113 / 266 k | 192 / 365 k |
| Lumber Town, looking south toward the Moros | 166 / 298 k | 211 / 361 k |

Solis first cost 176 draws at its gate: its many tints each became a batch. Its
static scenery, the country along the road and each group that changes hands are
now merged into vertex-coloured meshes (one per surface kind), which brought the
gate to 95 and the Lumber Town view from 276 to 211. The remaining extra draws in
distant views are the grown terrain grid (+6 tiles) and West Suval's regional
scatter. World build: ~1.7 s → ~2.2 s in the browser; colliders 5 951 → 6 447.
Every Solis view is lighter than Lumber Town's on either branch. A real frame-time
figure needs `npm run test:road` (not run; see below).

## Left as stubs, and what the lead must do on merge

- **Regenerate `src/region-survey.js`** after merging this and the Pueth branch
  (`node scripts/build-region-survey.mjs`): both add a name to `PLAYABLE` in the
  script. `REGION_IDS`, `REGION_TERRAIN`, `REGION_TEXT`, `LOCAL_STOPS` in
  `src/developer-atlas.js` and the travel points in `src/developer-mode.js` each
  gain one entry per branch; `terrainMix`'s weights now derive from the registry.
- `src/world.js` conflicts, if any, will be in the road-measure line, the
  `addPath` list, the return object and the signpost helper passed to the scenery
  (`trailSign`, which the towns agent owns: the call site is the one line in
  `createWestSuvalScenery({... sign })`).
- `src/main.js`: the conversation hook sits just before the border chapter's
  line; the frame hook just after the occupation pass. The toast line in
  `borderAct` now reads `result.toast` from the chapter.
- No road from East Suval's border post (see above). Horses: the gate is ridable
  and there is a hitching rail outside it; whether horses enter towns is the lead's.
- Wolves and bandits are rumours only; no encounter.
- The white cliffs are pale rock slabs along the shore, not a modelled cliff face.
  The terrain pad is planar; the "terraces" are the town's rise from quay to
  Court, not stepped ground.
- `npm run test:autoplay` was not run. A rendered run now also needs: the known
  driftwood stall fixed (docs/world-scale-report.md) before it can reach the border
  at all; then about 2 km more walking (camp → Solis → camp → stockade, on foot and
  mostly off `paths[0]`, which `nextWaypoint` does not follow for this leg), so the
  30-minute deadline will likely need raising; and the Legion camp → Solis leg
  relies on `freeDirection` sliding past field walls and olive trees on open downs.
- `npm run test:road` (the traversal smoke) does not walk the Solis road; a
  frame-time figure for West Suval would need it extended.
