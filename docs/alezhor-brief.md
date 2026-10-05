# Alezhor: terrain and wildlife

Brief written 4 October 2026 by the coordinating Claude session, under the
[joint completion plan](regional-completion-joint-plan.md) and its [ledger](regional-completion-ledger.md) (queue row 4:
"Cool summer-dry grassland and plain at Ibenwood's southern margin; localized woodland rather than regionwide deep
forest"). Read as every region in this programme is read: **terrain, climate, water, scenery and wildlife only -
nothing that belongs to anybody.** Two agents in one worktree, split by layer: the **ground agent** (ground, coast,
water) and the **life agent** (scenery, wildlife). One writer per file.

## Where things stand

- **Worktree** `C:\Users\Michael\Programs\typescript\azhora-game-alezhor`, branch `alezhor`, cut from ``fdc1707`` (the East
  Izol delivery, itself on the Celder delivery; both wait for review). Work only there. **Do not commit, push or
  stash.** Never touch another checkout (`azhora-game` is ChatGPT's; `azhora-game-celder` and `azhora-game-east-izol`
  are frozen deliveries; `azhora-game-land` is a read-only baseline at `a2e49c3`).
- **The World Builder repository is read-only.** Where the lore and the atlas disagree, the atlas wins; report the
  discrepancy and your proposed wording in your final message.
- **Alezhor is registered and wired** (the coordinator's, uncommitted): runtime ID **64**, provisional. Stubs as for
  East Izol: `src/alezhor-world.js` (`ALEZHOR`, `alezhorOwns`, `ALEZHOR_ARRIVAL`, `ALEZHOR_LANDMARKS`, `ALEZHOR_TRAILS`,
  `ALEZHOR_VIEWS`, `alezhorGround(x, z, incoming, before)`, `alezhorTint(x, z)`), `src/alezhor-scenery.js`
  (`createAlezhorScenerySteps`), `src/alezhor-wildlife.js` (`ALEZHOR_WILDLIFE_ZONES`). Keep every name and signature.
  The newest precedents, in this worktree: `src/south-celder-world.js` (`celderSeamMove`, border streams built by a
  neighbour; read its seam tables **edge by edge**, as `29ca691` made them - never all at once on the first touch: the
  intake review measures first-touch cost in the renderer) and `src/east-izol-world.js`.
- **Two neighbours are being corrected while you work**: ChatGPT's R4 review is changing Navarth's and the Ganesh
  Desert's borders in its own worktree. Meet every neighbour's ground **live** (`before(x, z)`, read at runtime, as
  the Celder seam does) and never hard-code a neighbour's height, so your seam follows their corrections.
- The coordinator already raised the world-width budget in `tests/region-layout.test.js` (Alezhor's coast moves the
  west edge out by 50 m) and moved `tests/developer-atlas.test.js`'s unbuilt example to Maanub.

## The atlas - measured

- **Alezhor**: 25 hexes, rows 115-119, all **Csb**; 13 grassland, 12 plains; hex centres x -4550 to -3550, z 808 to
  1155:

| row | hexes |
|---|---|
| 115 | (-34,115) plains (-4350, 808); (-33,115) plains (-4250, 808); (-32,115) plains (-4150, 808); (-31,115) plains (-4050, 808) |
| 116 | (-36,116) plains (-4500, 895); (-35,116) plains (-4400, 895); (-34,116) grassland (-4300, 895); (-33,116) grassland (-4200, 895); (-32,116) grassland (-4100, 895); (-31,116) grassland (-4000, 895); (-30,116) grassland (-3900, 895); (-29,116) plains (-3800, 895); (-28,116) plains (-3700, 895) |
| 117 | (-37,117) grassland (-4550, 982); (-36,117) grassland (-4450, 982); (-35,117) grassland (-4350, 982); (-30,117) grassland (-3850, 982); (-29,117) plains (-3750, 982); (-28,117) plains (-3650, 982); (-27,117) plains (-3550, 982) |
| 118 | (-30,118) grassland (-3800, 1068); (-29,118) grassland (-3700, 1068); (-28,118) plains (-3600, 1068) |
| 119 | (-30,119) grassland (-3750, 1155); (-29,119) grassland (-3650, 1155) |

- **Neighbours by shared edges**: **South Ibenwood 13 (built)**, **West Ibenwood 10 (built)**, **Navarth 5 (built)**,
  **Ganesh Desert 3 (built)**, South Ibenal 3 (unbuilt), the sea 22.
- **Water** (atlas river edges):
  - **The gold river** (medium): South Ibenwood's `ibenwood-central-south-river` (`src/ibenwood-rivers.js`) ends at the
    border at about (-3950, 866); the atlas carries it on along the edge (-30,116)|(-31,116), inside Alezhor, to the
    sea. **Its Alezhor reach is yours**: from the Ibenwood course's own end, at its own level and width, to an estuary.
  - **The west stream** (small): West Ibenwood's `ibenwood-west-stream` comes down to about (-4500, 837); the atlas
    runs it along the South Ibenal border, (-36,115)|(-36,116), (-36,116)|(-37,116), (-37,116)|(-37,117), to the sea.
    Build it as Alezhor's bank of a border stream (South Ibenal is unbuilt: feather to what is there).
  - **The Alezhor Water** (small): built by the southwest's builder as Navarth's and the Ganesh's own
    (`ALEZHOR_WATER` in `src/west-regions.js`, 36 points from (-3500, 953) to the gulf at (-3718, 1194), along the
    Navarth | Alezhor and Ganesh | Alezhor edges). **Give it a real Alezhor bank** at the water's level - no buried
    water, no cliff bank, no step in the water - and never move it (the Celder brief's border-stream rule).

## The lore

`C:\Users\Michael\Programs\typescript\world-builder\azhora_lore\geography\regions\alezhor.md` (69 lines; read it all):

- "A coastal plain that is narrow in the south - where the forest presses close to the cliffs - and widens slightly in
  the center where the largest rivers emerge from the forest hills and deposit their loads of gravel and sediment into
  broad estuaries before entering the sea." Open ocean to the west; good natural harbours only at the river mouths.
- "The forest begins where the coastal plain ends": the Ibenwood (South and West, built) is the tree line. "The light
  changes within twenty feet of the tree line." Alezhor's own woodland is local (the ledger), not the forest.
- Climate: Mediterranean, cooler than Dinova's, cooling northward ("the grey wet season beginning to assert itself").
- **The gold** is in the forest rivers (placer gold in gravel; mining valleys in the hills): mines, workings and cities
  are owned. **Reserve the river-mouth flats** where the cities stand ("a series of coastal cities", unnamed) - at
  least the gold river's estuary and one other mouth - shaping the ground, building nothing.
- Wildlife (`azhora_lore/fauna/azhoran_fauna_overview.md`, section "Ibenale, Alezhor, and the Western Corridor"): the
  **forest edge-cat** (in the wooded hinterland and the margins of the gold valleys, lost from the settled coastal
  strip), the **great river otter** and smaller otters in the forest-margin watercourses, forest birds in the tree
  cover and coastal birds near the sea, a north-south migration route along the coastal plain. Also the Iberos coast
  section for seabirds and the open-ocean shore. No stock.
- Language (`alezhor.md`, Language): Forest Mittoli, registered as `spoken('ibnael')`. `src/languages.js` asks whoever
  builds Alezhor to revisit Cape Heth's stand-in tongue; that is ChatGPT's (review group R6): report, do not edit.

## The ground agent

**You own**: `src/alezhor-world.js`, Alezhor's rows in `src/region-layout.js`, `src/region-world.js`,
`src/build-status.js`, `tests/alezhor-world.test.js`, the Alezhor lines in `src/world-terrain.js`, the Alezhor probes
in `tests/southwest-world.test.js`, and only where a seam needs it the neighbours' border-water lines. Byte-preserving
edits on your own lines (mixed line endings: never `sed -i`; Git Bash heredocs eat backslashes).

1. **The strip**: a coastal plain between the open-ocean shore and the Ibenwood's tree line; narrow and cliffed in the
   south, wider in the centre at the river mouths; gentle grassland swells; the ground rising toward the forest hills
   along the Ibenwood border (meet the built forest's ground at the line).
2. **The coast**: open-ocean shore - cliffs where the forest presses close, beaches and estuaries at the mouths.
3. **Water**: the three courses above. Real banks at the water's level, estuaries that reach the sea.
4. **Every border joins** (South and West Ibenwood, Navarth, Ganesh): half-metre samples, worst step under about half
   a metre or an authored cliff you name. Use the Celder seam method; never move a neighbour's ground.
5. **Colour**, climate (Csb; default sky unless argued), landmarks (descriptive names; no city names), trails, views
   (walker's height with explicit y, an `alezhor-wildlife` view), arrival on dry ground.

## The life agent

**You own**: `src/alezhor-scenery.js`, `src/alezhor-wildlife.js`, `tests/alezhor-life.test.js`, and in
`src/west-regions-life.js` only what a new species needs.

1. **Scenery**: cool Mediterranean grassland and plain; local woodland in folds and along the river margins (not
   forest); the tree line's edge habitat where the Ibenwood begins (match the built forest's species at the line);
   reeds and gravel at the rivers, estuary margins, coastal scrub and dune grass. By `heightAt` and the water at build
   time; never a hard-coded height; clear of trails, landmarks and reserved flats; instanced; trees typed and
   harvestable (`registerWorldTree`).
2. **Wildlife**: the forest edge-cat in the wooded margins (a new species needs a rig: say if you reuse one), otters
   on the rivers, coastal and forest-edge birds, what else the overview and the neighbours support. Each band its own
   layout. The west's laws hold.

## Tests - fast

Scoped worlds (`scopedWorld(scene, [64, 34, 35, 39, 41])` builds Alezhor and its built neighbours); at most two test
processes per agent; never the full suite; no Electron. Run your own files, then `region-layout`, `region-survey`,
`region-sky`, `map-fog`, `southwest-world`, the Ibenwood and southwest tests that touch your borders, `nobody-sealed-in`
(ground); `west-life` per zone, `wildlife-loading`, `regional-build-steps` (life). Red before you started, not yours:
`languages` (East Ibenwood), `izol-world` (line 66), `chameleon`, `company-route-world`, `local-map-data`, `drent-world`.

## Final message

Short: what you built (numbers), every test and result, labelled builder choices and what the user should decide,
lore discrepancies with proposed wording, anything not verified.
