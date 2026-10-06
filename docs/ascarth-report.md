# Northern and Southern Ascarth: what was built

Branch `ascarth`, worktree `../azhora-game-ascarth`, from b108263. The brief is
`docs/ascarth-brief.md`. Uncommitted, as asked.

The Ascarth Peninsula is ground now: a finger of land into the Iberos Sea, a low neck where it
joins the mainland at Gala, a stony Mediterranean plateau, two wooded rocky hills in the north
with green stain on the stone, cliffs along the whole west and round the tip, and four sheltered
bays on the east. **Terrain, climate, water and wildlife only.** Nothing belongs to anybody:
no Aevis, no city, harbour, road, mound, working, sign or person.

---

## What the atlas gave, and what was chosen where it was silent

| | Northern Ascarth (22) | Southern Ascarth (23) |
| --- | --- | --- |
| hexes | 16: `grassland` × 13, `hills` × 3 | 18: `grassland` × 18 |
| climate (per hex, World Builder map) | `Csa` × 13 (the grass), `Csb` × 3 (exactly the hills) | `Csa` × 18 |
| neighbours | Gala 8 edges (all dry), Eer 1 edge (the Lizeem), the sea | Northern Ascarth 4, the sea |
| water inside | none | none |
| level | 4 | 2 |

**It is on the far bank.** The brief says the two countries are "the only dry way from Eer to
Gala". The built map says otherwise, and `tests/eer-world.test.js` already held it before this
work: the one edge Northern Ascarth shares with Eer, (-7,120)|(-6,119), is the Lizeem's last
edge, and `LIZEEM_REACH` ends at its seaward corner, (-1350, 1213), where the river meets the sea.
The peninsula's only dry border is Gala's eight edges. So the Ascarths are on Gala's side of the
wall; a traveler reaches them through Gala (across the Oveth, which is the Gala builder's) or not
at all. Nothing here changes the Lizeem. See the open questions.

Chosen where the atlas is silent:

- **The neck is low.** Every hex that touches Gala keeps the seam contract's profile, and every
  landform stays out of the hundred metres next to the border, so the neck lies at Gala's own
  level (4 m, after the merge) and the peninsula rises out of it over the next ninety metres to a
  plateau at 10-16 m (`FRONTIER`, `PLATEAU` in `src/content/regions/ascarth/ascarth-world.js`).
- **The "highland interior" is the three hill hexes.** Two rounded rocky hills stand on the two
  that are clear of the border band - the north hill on (-9,123), summit 35.0 m, and the south hill
  on (-8,125), summit 37.2 m - with a saddle between them at about 21 m. The third, (-9,122),
  touches Gala along its north-west edge; inside the contract's band nothing may be built, so it is
  the low shoulder the hex blend makes of it (its hill profile is base 7), and wooded like the others.
  Domes a traveler walks up: about one in three on their flanks, steeper only on rock knobs
  (steepest 0.73 measured, nowhere a cliff).
- **The plateau** is lower on the east side (by 5 m) and a little lower toward the tip, and rolls
  on two turned wavelengths rather than the world's one-bearing `relief`, which laid over open
  ground reads from a hill as corrugation.
- **Cliffs** on the whole western shore and round the tip; the eastern shore is lower, cliffed on
  its headlands (6-9 m high, against 13-16 m on the west) and falling between them to the bays. Made the way South Suval's are: the
  land keeps its height to within 3.2 m of the water and then drops.
- **The bays are the atlas's own.** Where the finger crosses the hex grid both coasts step in a
  hex at a time, and a sea hex with three of the peninsula's hexes round it is an indentation. Four
  of those are on the east, and they are the bays: the north bay under the Lizeem's mouth,
  (-7,121), and three more down the east shore, (-7,123), (-6,126), (-5,128). Each is a beach,
  with the ground dipping toward it. The four on the west, (-10,125), (-9,127), (-8,129), (-7,132),
  are coves in the cliff with no beach: the lore's "good anchorage only ... on its eastern and
  northern shores".
- **What grows** (`src/content/regions/ascarth/ascarth-scenery.js`): tawny `Csa` grass, aromatic garrigue cushions and
  darker maquis (more of it on the sheltered east), grey-brown rock through the thin soil
  everywhere, a wild olive standing alone here and there on the grass (141); on the hills a wood of
  evergreen oak (578) with pine on the tops (288); green and blue-green stain on sixteen outcrops of
  the south hill (the copper, nothing dug); and fallen rock at the foot of the cliffs (about 590).
- **The cliffs are stone-coloured.** The shore tint every region shares paints the last fifteen
  metres of land as sand; on a cliff top that is wrong, so `ascarthCliffTint` keeps the grass to
  the edge and greys the face. It is exactly nothing outside the peninsula.

## The climate read

`world-builder/azhora.cmap.json` carries one code per *region*, from a three-code vocabulary
(`Cfb` for 84 regions, `Dfb` 23, `BWh` 9), and says `Cfb` for both Ascarths - as it does for Eer
and Gala, whose hexes read `Cfa`/`Csa` and `BSh`/`Csb`/`Csa`. That is a default, not a reading.
The per-hex field is on the World Builder map itself (`map/resources/examples/azhora.wwmap`,
`hexes[key].climate`, `koppen-v1`), and it says:

- **Northern Ascarth: `Csa` × 13, `Csb` × 3** - and the three `Csb` hexes are exactly the three
  `hills` hexes. The hills are the cooler ground; that is the whole of the pattern.
- **Southern Ascarth: `Csa` × 18.**

Built to it: hot-summer Mediterranean grass and scrub everywhere, the wood only on the cooler
hills, and one sky for the peninsula (`palette.sky` 0xb3d6e0, haze 0xcdd6d0, density .0045) -
Eer's clear air with the sea in it, bluer and a shade clearer than Eer's.
`ASCARTH_CLIMATE` in `src/content/regions/ascarth/ascarth-world.js` records every hex; the test checks it against the map.

## The window measurement

Southern Ascarth's tip is row 132, centred at z = 2281, its southern corner at 2338.4. The
world's southern edge goes from **2225.2 to 2398.4** (the corner plus the 60 m margin), and north
to south the world goes from 35.26 hexes to **36.996**. The coast lattice samples out to
`COAST_MARGIN` (96 m) beyond the bounds, to z = 2495.6, which is inside **rows 134 and 135** and no
further (measured by walking the lattice exactly as `region-world.js` builds it). With
`WINDOW.maxR` at 133 those rows were the sea: 25 claimed hexes under the lattice, **Selemi's six**
among them - the island across a channel one hex wide from the tip - plus Central Meroshe, Marosh,
the Azhor Stones and the Aurumlis. So `maxR` is **135**, with the measurement written in the
comment above `WINDOW` in `scripts/build-region-survey.mjs`, and `src/dev/tools/region-survey.js` was
regenerated. `minQ`, `maxQ` and `minR` are unchanged (the peninsula takes nothing east or west).

The world-size guard in `tests/region-layout.test.js` states the case: north-south goes to 37 and
no further (36.996, four-tenths of a metre to spare), with a new floor of 36.9 so the budget stays
a budget. `tests/isareos-world.test.js` and `tests/nethereum-world.test.js` pinned 35.26; both now
pin 37.00 and say why. Feradom and Gala take nothing from either axis (checked on the atlas).

## The seam numbers

- **Gala (eight edges).** Northern Ascarth's grassland profile is **base 4.0, amp .6, wave 320**,
  the contract. `ascarthGround` returns exactly the ground it was handed on every hex of Gala's
  and Eer's and everywhere within **100 m** of the border (checked over 8,000 points, 2,500 of them
  in the band); it is full strength from 190 m in. Nearest hand-built landform: the north hill's
  centre is 178 m from the border.
- **The one hill hex on the border.** (-9,122) is `hills`, and its profile (base 7, amp 1, wave
  320) lifts Gala's side of that one edge by **1.00 m** at the edge, 0.86 m ten metres in, 0.29 m
  fifty metres in and nothing at 78 m - "within a metre or two". Its wavelength is the grass's on
  purpose: the blend's relief is a sine of the blended wavelength, and a hex on another wave shifted
  the phase within reach of it enough to step the ground 0.36 m at a corner; on one wave the only
  seam the peninsula adds to the border is **0.16 m, at two hex corners**, where the hill hex drops
  out of the blend's reach.
- In this branch Gala is not registered, so its hexes blend as `outland` (base 11.5, amp 6) and
  the ordinary blend steps up to 4.2 m at the border corners. That is the unbuilt neighbour, not
  the contract; the test measures the contract by blending Gala's hexes at 4.0/.6/320, and checks
  the real ground (steps under 0.6 m) the day Gala is registered alongside.
- **Eer (one edge).** The edge is the Lizeem, cut by `west-ground.js`; nothing here is written
  within 100 m of it, and the neck's 4.0 is 1.1 m from Eer's 2.9.
- **Between the Ascarths.** One ground function lays both, continuously; the two share one grass
  colour, one sky and one profile of rolling, so there is nothing at the seam to see.

## Lore adjustments

Written into `world-builder/azhora_lore/geography/regions/ascarth.md` in place (the write was
allowed; nothing staged, committed or stashed there):

1. "rocky and forested in its interior, cliff-faced along much of its coast" became: open
   Mediterranean grass and aromatic scrub over thin stony ground for most of its length, a highland
   interior of three rocky hills in the north wooded in evergreen oak and pine and forested only
   there; a low neck of grass on the Galan side; its one edge with Eer the Lizeem's mouth;
   cliff-faced along the whole western shore and round the tip, the eastern shore lower and falling
   to the sheltered bays. The bays sentence is kept.
2. Aevis's "rocky promontory at the northern end ... the highest defensible point available": the
   northern end is the low neck, and the hills are the high ground, so it is now the promontory
   "where the low neck meets the sea under the Lizeem's mouth", chosen as "the most defensible point
   on the only dry way onto the peninsula". The city is not built.
3. "South of the peninsula's base, on the western bank of the Lizeem, lies Gala" became
   **North-west of** - the atlas puts Gala on the neck's north-west and west.

Nothing needed appending to `docs/lore-adjusted-to-atlas.md`.

## The zones, their species and why (`src/content/regions/ascarth/ascarth-wildlife.js`)

Every site measured on the built ground: standable, on its own country's hexes, 2.5 m clear of
every trunk and stone; the gulls 5-8 m back from the cliff edge on ground 11-14 m up. All pass the
west's laws (walked at, run at, chased home, watched and unwatched).

| zone | species | where | why |
| --- | --- | --- | --- |
| interior-hills-deer | red deer ×4 | the open saddle between the two hills | extension: an oak-and-pine wood on a hill is deer country; the wood's edge is where a deer is seen |
| interior-hills-boar | boar ×3 | the south hill's eastern foot, at the wood's edge | extension: the acorns of the evergreen oak; the pig of every Mediterranean oak country |
| north-ascarth-hares | upland hare ×3 | the plateau between the north hill and the east shore | extension: thin short grass over rock |
| ascarth-hills-hawk | plateau hawk | 34 m over the hills | extension: the overview's dry-upland hawk |
| west-cliff-gulls | gull ×3 | the west cliff tops | the overview's seabird colonies "on certain rocky headlands" |
| south-ascarth-hares | upland hare ×3 | the finger's grass | extension |
| tip-gulls | gull ×3 | the cliffs round the tip | as above |
| tip-harrier | harrier | quartering low toward the tip | the brief's "a harrier or hawk over the tip"; the grass is a harrier's living |
| ascarth-dolphins | dolphin ×2 | off the east shore | the overview: "a consistent presence in Iberos coastal waters" |
| iberos-sea-plungers | **Great White Sea-plunger** ×3 | circling 22 m over the sea off the tip | the overview's gannet-relative of "the exposed Legemum headlands" (the next peninsula west), diving on the Iberos shoals |

**The one new rig** is the sea-plunger (`src/content/regions/western-regions/west-regions-life.js`): a white cigar of a body, a
straw-yellow head on a grey dagger bill, long narrow white wings dipped black. It soars on the
hawk's rig and does one thing nothing else does (`zone.plunge`): every nine seconds or so it folds
its wings back, pitches head-down and falls to the sea, is under for 1.8 s, and climbs back beating.
Its round is a pure function of its clock, so an unwatched flock is wherever that much time would
put it. Every soaring bird already in the game is placed exactly as before (the new pitch and fold
are zero on them). Domestic stock is somebody's: no sheep, no goats.

## Files

New: `src/content/regions/ascarth/ascarth-world.js`, `src/content/regions/ascarth/ascarth-scenery.js`, `src/content/regions/ascarth/ascarth-wildlife.js`,
`tests/ascarth-world.test.js`, `docs/ascarth-report.md`.
Changed: `scripts/build-region-survey.mjs` (PLAYABLE, WINDOW), `src/dev/tools/region-survey.js`
(regenerated), `src/world/terrain/region-layout.js` (PLAYABLE_REGIONS, two biomes), `src/world/terrain/region-world.js`
(REGION_IDS 22 and 23, REGION_TERRAIN, REGION_TEXT), `src/world/terrain/world-terrain.js` (the ground chain, the
cliff tint), `src/world.js` (scenery, metrics, landmarks; CRLF kept), `src/content/regions/western-regions/west-regions-life.js`
(the zones, the sea-plunger), `src/gameplay/skills/languages.js` (the `avite` accent and both regions),
`src/dev/tools/developer-atlas.js` (two travel stops; CRLF kept), `src/ui/map/map-fog.js` (six areas; CRLF kept),
`src/dev/tools/build-status.js` (both `early`), `package.json` (the new test), `tests/region-layout.test.js`,
`tests/isareos-world.test.js`, `tests/nethereum-world.test.js` (the north-south budget),
`tests/region-sky.test.js`, `tests/eer-world.test.js` (the own-sky lists), `tests/chameleon.test.js`
(Ed does not go there yet), `docs/design-answers.md`. Outside the repo:
`world-builder/azhora_lore/geography/regions/ascarth.md` (in place, uncommitted).

## Tests

Run one file at a time or with `--test-concurrency=1`; `npm test` was not run.

- `tests/ascarth-world.test.js` (new): **10 of 10 pass.**
- The registration list, in one sequential run - eer-world, isareos-world, nethereum-world,
  south-suval-world, east-lotharn-world, region-layout, amod-world, elagos-world, caricas-world,
  developer-atlas, map-fog, chameleon, region-sky, regional-wildlife, region-survey, regions-world,
  region-levels, languages, town-life, closed-border: **169 of 169 pass.**
- `tests/west-life.test.js`: 8 of 9 pass. The one failure is the brief's listed pre-existing one,
  "nothing in the west can be walked down" (`elagos-meadow-cattle`, a walker within 3.60 m). That
  test stops at its first failing band, so the peninsula's six ground bands were put through the
  same walk separately (a scratch run of the test's own chase on those zones alone): closest
  approach 8.2-16.4 m, nobody off their footing. The run-down, home-again and every other law ran
  over them inside the real test and passed.

`tests/ascarth-world.test.js` holds: the atlas's counts and the
ids in order; the far bank (eight dry Gala edges, the Eer edge the Lizeem); the climate against the
map; the window against the lattice, Selemi as land, and the 36.996-hex world; the seam (the
contract profile, nothing written across it or within 100 m, the added step and the hill hex's
lift); the neck, the plateau and the two hills; cliffs on the west and the tip and beaches in all
four bays; the wood on the hills only; nothing built and nobody there, landmarks, chart areas,
language and travel stops; every wildlife site on its ground and the sea-plunger's dive.

## The review views

One short render at the end (`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg`,
pictures in `tests/artifacts/`), five `stand-at:` views:

1. `stand-at:-1544,1586,-1.5708,0.2,40` - the west cliffs from forty metres out over the sea, the
   gull colony's ground: the cliff top, the north hill's wood behind, fallen rock at the foot.
2. `stand-at:-1380,1600,0.785,0.25,16` - the saddle looking north-west at the north hill: oak
   below, pine on the top, red deer grazing at the wood's edge.
3. `stand-at:-1278,1549,-0.53,0.3,14` - the upper east bay's beach, looking across the water to
   Eer's coast.
4. `stand-at:-730,2306,2.04,0.22,12` - the tip's south-west cliff top, Selemi across the channel.
5. `stand-at:-1240,1700,-2.4,0.35,12` - from the pines on the south hill down the finger to the
   tip, olives standing alone on the grass.

Two things were wrong in them and were fixed after, and were **not photographed again** (the brief
allows one render): the stones came out nearly white, because their HSL lightness was read in the
renderer's working space (they are chosen in sRGB now, a warm grey-brown); and the cliff face read
as a sandy bank, because the terrain out here is drawn from vertices seven metres apart and the
vertex in the sea at the foot of each face was still grass-and-sand coloured (the stone tint now
runs from under the water to a rim a few metres back from the edge; checked numerically across the
west cliff: #8c8879 at the face, grass #9ea06b by twelve metres in). Worth a look in the next
render.

## Open questions

1. **The brief's route is not the map's.** The Ascarths are on the far bank with Gala: the one
   Eer edge is the Lizeem's mouth. If the user wants a dry way from Eer onto the peninsula, it is a
   change to the Lizeem (a ford or a bar at the mouth), which is Eer's and the west's to make, not
   this job's. Until then the peninsula is reached through Gala.
2. **Swimming round the mouth.** The Lizeem's deep-water line stops at the sea, and the least
   swimming from Eer's shore to Northern Ascarth's is **32 m**, round the river's mouth from about
   (-1336, 1202) to (-1352, 1230) - fourteen seconds for a beginner. It was open-water land before
   this work too (the hex was `outland`), and nothing within 100 m of the Lizeem was touched; but
   that 32 m is now the way onto the whole far bank from the near one, which "the Lizeem is a wall"
   did not mean. Whether to allow it, or to carry the wall out into the sea, is the user's.
3. **Avite has no family.** It is carried as an accent of Mittoli until the lore gives it one; the
   south's archaic form has no entry.
4. **The hill hex on the Gala border** lifts Gala's side by up to a metre. If the Gala builder
   wants that edge dead flat, (-9,122)'s profile can drop to 4.0 at the cost of the atlas's one hill
   hex there reading as grass.
