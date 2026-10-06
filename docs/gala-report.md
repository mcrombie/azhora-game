# Gala: the build report

Built 2026-09-28 on branch `gala` (worktree `azhora-game-gala`, from b108263), to
`docs/gala-brief.md`. **Terrain, climate, water, scenery and wildlife, and nothing that belongs
to anybody**: no settlement, road, field, irrigation channel, bridge, boat, person, sign or quest.
The city of Gala, its harbour, market, Guild of Assessors and council hall are not built. Left
uncommitted, as the brief asks.

---

## What the atlas gave, and what was chosen where it was silent

**The atlas** (the authority; the lore was adjusted to it):

| | |
|---|---|
| hexes | 21: q -12…-7, r 117…122; `plains` × 19, `grassland` × 2 (the southern row) |
| world box | x -1900 … -1400, z 924 … 1472 (100 m hexes) |
| climate | `BSh` × 12 (rows 117-119), `Csb` × 7 (rows 120-121), `Csa` × 2 (row 122, on the sea) — held to `azhora.wwmap` in the test |
| neighbours (edges) | Telemonia 9, Northern Ascarth 8, Eer 5, Nesdor 3, Ovesos 3, Oves Desert 2, Legemum 1, sea 3 |
| rivers | the Lizeem on all 8 Nesdor/Eer edges (built already); the Oveth on the 3 Ovesos edges (medium); a medium stream on the 2 Oves Desert edges; a small stream on 7 Telemonia edges and the 1 Legemum edge, to the sea; **none** on the 8 Northern Ascarth edges |

**Chosen where the atlas is silent:**

- **Relief.** Both of Gala's profiles are the seam contract's (base 4.0, amp .6, wave 320). The
  north stands higher by a landform, `galaRise` (src/content/regions/gala/gala-world.js): 4.2 m across the steppe rows,
  gone by the Mediterranean ones, leaning a little west (the dry country is north and north-west),
  gated by the region's own blend and by the seam. Measured on the built ground: the steppe rows
  average **7.5 m** (4.4–10.0), the `Csb` rows **4.9 m**, the coastal hexes **5.7 m** (the last two
  are lifted by the blend with Telemonia's, Legemum's and Northern Ascarth's outland 11.5 m, which
  is theirs to set when they are built). The north-eastern corner hex stands at **8.5 m** against
  Nesdor's flats at 7.2 and Eer's shoulder at 7.4 across the Lizeem — within 1.3 m. The rise is
  six metres lower than the six-regions brief's "12 m on the dry northern shoulder" because twelve
  would stand the steppe five metres over the far bank.
- **The dry wash** (`GALA_WASH`): 170 m of gravel floor between cut banks, 1.25 m deep, 6.4 m of
  flat floor, running south-east off the north-western shoulder and fanning out where the `Csb`
  rows begin. No water in it; nothing grows on its floor.
- **The distributary** (`GALA_CHANNEL`, src/content/regions/western-regions/west-regions.js): the lore's "Lizeem's distributaries"
  and "network of small rivers". The Lizeem's actual mouth is Gala's south-eastern tip, inside the
  seam's 100 m, so nothing is shaped there; the plain's own water rises 75 m off the Lizeem's
  western bank in hex (-7,118) and runs 434 m south-west to Gala's short shore at the south-western
  tip, braiding into three threads over its last third ("the Braided Mouths"). Like Eer's channels
  it stops where the beach starts (41 m from the water), because a western course's level is worked
  from ground that knows nothing of the shore.
- **The Oveth's crossing** (the six-regions brief left it to whoever built Gala): the reach is
  waded over rock for its first two-fifths below the corner where Gala, Ovesos and the Oves Desert
  meet (13 of 31 samples; the ford ends at (-1748, 931)) and is a wall of deep water from there to
  the Lizeem. Its cut deepens from 1.3 m to 3.5 m ("drops through a rocky lower section"), and it
  takes its first level from the desert stream it meets (`headOf`). It **stops 25 m short of the
  Lizeem's centre line** and drops 1.3 m into it over the last paces: its water must not lie on the
  Lizeem's reed bank, because those reeds are sown from the one seeded stream every western country
  after Caricas draws from — one reed falling into the Oveth instead of beside it re-rolled every
  tree in Nesdor, Eer, Isareos and Nethereum (measured; see "What Gala did to its neighbours").
- **The desert border stream** is waded anywhere: the Oves Desert's only two edges with Gala are
  this stream, and a deep one would have walled the desert out.
- **The Telemonia border stream** is small and waded anywhere, 393 m to the beach.

## The seam with Northern Ascarth

| contract | Gala |
|---|---|
| base / amp / wave of the border hexes' plains and grassland | **4.0 / .6 / 320** — `REGION_TERRAIN.Gala` and `.byTerrain.grassland`, both |
| no ground written outside one's own hexes | the rise and the wash are exactly 0 within 100 m of the border on both sides; a sweep of every 4 m point within 100 m of the seam (3,000+) finds `groundWithRiver === bedrockHeight` wherever the Lizeem's own old cut is not |
| hand-built landforms ≥ 100 m inside | the distributary's centre line is 124 m from the seam at its nearest, and every sample's cut valley (half + 4 + 2.2 × depth) and every braid thread's (half + 6) is ≥ 100 m inside; the wash is ≥ 250 m inside |
| the eight edges | read off the atlas export in the test and held to `GALA_SEAM_EDGES`; none carries a river |

In this branch Northern Ascarth is outland (base 11.5, amp 6, wave 150), so Gala's four seam hexes
read about 6.4 m, not 4.0, and carry the blend's ribs (below). When the Ascarth branch lands with the
same numbers the blend there flattens to the contract's four metres.

## What Gala did to its neighbours, measured

Registering any country changes the blended ground within 128 m of its hex centres. Measured against
a dump of the whole world taken before any change:

- **Colliders**: every one of the 44,699 that existed is identical, to the millimetre. Gala adds
  316 of its own — 85 `gala-tree`, 161 `gala-scrub`, 70 `west-deep-water` on the Oveth — as pure
  additions (45,015 in all).
- **Instanced scenery**: every existing instance's x and z is identical in every group in the world.
  Heights (y) changed in 18 batches — 14 in Eer, 3 in Nesdor and the Lizeem's bank reeds in Caricas's
  district — because the ground under them moved.
- **The Lizeem**: its last 47 of 363 samples (the Nesdor bank) and all 72 of its lower reach (the
  Eer bank) lie up to **0.61 m lower**, because the ground on the Gala side is Gala's four-to-eight
  metres now and not outland's 11.5. Still one river at the handover (< 2 cm), still falling, still a
  wall (tests/eer-world.test.js unchanged and green).
- **Eer's North Channel**: its head is 120 m from a Gala hex centre, so its first samples fell 0.61 m
  and the profile's forced fall carried 6.7 cm down its plateau to sample 76 of 118; the braided
  reach is unchanged beyond sample 72. No scatter moved.
- **The ribs in open country.** `relief()` takes its phase from x × k, and the blend mixes the
  wavelength: where Gala (320 m) meets outland (150 m) at x ≈ -1900 the blended wavelength changes
  across the margin and the relief "chirps" into short, steep ribs — up to 10 m of change and slopes
  past 50° on the Telemonia and Oves Desert side of the border, milder inside Gala (73 % of Gala's
  ground is under 1 in 10; the steep points are the river banks and the western margin). It is a
  property of the blend at every built/unbuilt border in the far west, not something Gala adds a cure
  for; it will change when Telemonia, the Oves Desert, Ovesos and Northern Ascarth are built. Listed
  under open questions.

## What grows (src/content/regions/gala/gala-scenery.js, its own seeded stream)

Read off the climate at each point (`galaClimate`, blended over Gala's own hexes), so the steppe
gives way to the Mediterranean over about a hundred metres and nothing draws a line; the ground
colour does the same (`galaGroundColour`, hooked into `groundTint` for Gala's plains only).

- **Steppe (`BSh`)**: tussocks, larger and sparser, buff, with the ground showing between (a third
  of attempts left bare); grey wormwood and blue-grey saltbush knee-high on the rises (no collider —
  nobody walks round a sub-shrub); stones on the rises; the wash's gravel and cobbles. **No tree.**
- **Mediterranean (`Csb`)**: tawny-olive grass; **maquis** knee-to-chest on the rises only (where
  the relief stands up), spaced so there is always a way through; **wild olive and fig** singly,
  never within 40 m of each other and not on the steppe.
- **Coast (`Csa`)**: thinner, greener grass; **sea grass and thrift** (pink) on the band behind the
  shore.
- **Counts**: 3,522 grass tussocks, 313 wormwood and saltbush, 119 maquis bushes, 21 olive and fig,
  64 tamarisk, 42 oleander, 20 thrift cushions, 781 reed and sedge, 64 steppe stones, 413 pieces of
  wash gravel and cobble, 32 ford rocks, 31 stream gravel, 134 sand on the bars.
- **The water**: reed and sedge at every Gala waterline and along the Lizeem's whole western bank
  (the Reed Bank); **tamarisk and oleander** in galleries on every watercourse, thicker to the south;
  sand on the braid bars; rock in the Oveth's ford; gravel in the desert stream.

## The animals (src/content/regions/gala/gala-wildlife.js), every site measured on the built ground

| zone | species | why |
|---|---|---|
| gala-geese | **goose** (new rig) ×10, floating | the overview's black migratory geese that "winter in the coastal marshes and river mouths": the brief's promised raft, on the distributary's last reach, resident until there are seasons |
| gala-stilts | stilt ×4 | the overview's "stilt-legged species" of the Lizeem distributaries, on the bars between the braid threads |
| gala-egrets | egret ×3 | the Eer assemblage in white, a pace off the distributary's middle reach |
| gala-herons | wading-bird ×3 | herons on the Lizeem's western bank, clear of the deep-water wall |
| gala-gulls | gull ×4 | the Iberos coast's seabirds, on the upper beach at the mouths |
| gala-dolphins | dolphin ×2 | grey dolphins, "a consistent presence in Iberos coastal waters", off the shore |
| gala-hares | upland-hare ×4 | extension: the west's hare at its dry limit on the steppe |
| gala-harrier | harrier ×1 | extension: quartering nine metres over the steppe, following the ground (it rises and falls 4 m under the beat) |
| gala-hawk | plateau-hawk ×1 | the overview's dry-plateau hawk of the rain-shadow grasslands; the six-regions brief put it on Gala's dry north |
| gala-boar | boar ×3 | extension, as Eer's: the Mediterranean scrub's pig, in the maquis; the level-3 candidate the six-regions brief names; range chosen by running the chase laws from all four quarters |

No domestic stock. The goose is the duck's plan half as big again: black head, neck and breast
with a white throat fleck, dark grey-brown back, barred flanks, white stern, black legs and bill;
it flees at 14 m and flies (`FLIES`), and floats (`zone.float`) on western water.

## Registration

`region-layout.js` (PLAYABLE_REGIONS, REGION_BIOMES) · `region-world.js` (REGION_IDS 21,
REGION_TERRAIN, REGION_TEXT: subtitle, spawn (-1680, 1080) on the steppe, description, palette with
sky 0xc3d9dc / haze 0xdad5bf / density .0046, `npcIds: []`, eight landmarks) · `languages.js`
(dialect **Galan**, the lore's word, after `eer`; `REGION_LANGUAGE.Gala`) · `developer-atlas.js`
(LOCALS, anchor on (-9,118)) · `map-fog.js` (five areas: the Dry North, the Dry Wash, the Oveth Ford,
the Maquis, the Braided Mouths; 88–100 % inside) · `build-status.js` (`early`) · sky via REGION_TEXT
(`region-sky.js` unchanged; `Gala` added to the OWN_SKY lists in tests/region-sky.test.js and
tests/eer-world.test.js) · `west-regions.js` (the four courses, the braid, `WEST_REGION_NAMES`) ·
`west-ground.js` (`galaRise` and `galaWash` in the ground sum) · `world-terrain.js` (the climate
tint) · `world.js` (the scenery hook, the landmarks, the update, `galaMetrics`) ·
`west-regions-life.js` (the goose rig, Gala's zones after the East Lotharn's) · tests
(`gala-world.test.js`, `package.json`, and Gala added to `WITHOUT_ED` in tests/chameleon.test.js and
a stated case in tests/region-layout.test.js) · `chameleon.js`: Ed's `open-south` spot was on what is
now Gala's beach, so it moved 104 m to the nearest honest open country, Legemum's shore (-1804, 1492),
found by the same flood the spot was first chosen by, and not in Northern Ascarth.

**Ordered lists and Feradom.** This branch has no Feradom (id 20). Gala is appended after the East
Lotharn everywhere; at the merge Feradom goes before it, which is where the brief puts it.

## Lore adjustments (applied in place)

`world-builder/azhora_lore/geography/regions/gala.md`, uncommitted (the write was allowed this
time), and recorded claim by claim in `docs/lore-adjusted-to-atlas.md` ("gala.md — second pass"):

1. The dry steppe is **Gala's own northern half**, not the edge of Ovesos beyond it (`BSh` × 12).
2. The sea is a short shore at the **south-western** tip; the Lizeem goes out at the **south-eastern**
   one, where Gala, Eer and the Ascarth ground meet.
3. "Drained by a network of small rivers fed from the Ascarth foothills" → its rivers are **on its
   borders** (the Oveth with its ford, the desert stream, the Telemonia stream, the Lizeem); **the
   Ascarth border is dry**; inside, one slow distributary braids to the shore. The irrigation
   channels stay (they are somebody's).
4. "The northern edge … upland herding communities" → the northern **half**, the steppe, and its
   herding communities; "the people of the south-eastern rises" → of the south-east, under the
   Ascarth hills.

## Tests

`node --test tests/<name>.test.js`, one file at a time; never `npm test`.

| test | result |
|---|---|
| **gala-world** (new, 11 tests) | **11/11 pass** |
| eer-world | 12/12 |
| isareos-world | 9/9 |
| nethereum-world | 9/9 |
| south-suval-world | 11/11 |
| east-lotharn-world | 12/12 |
| region-layout | 7/7 |
| amod-world | 9/9 |
| elagos-world | 12/12 |
| caricas-world | 8/8 |
| developer-atlas | 8/8 |
| map-fog | 7/7 |
| chameleon | 7/7 (after moving `open-south` off Gala's beach; it failed once before that) |
| region-sky | 6/6 |
| regional-wildlife | 8/8 |
| region-survey | 4/4 |
| regions-world | 9/9 |
| region-levels | 4/4 |
| languages | 16/16 |
| town-life | 5/5 |
| closed-border | 6/6 |
| west-life | 8/9 — **"nothing in the west can be walked down" fails on `elagos-meadow-cattle`**, the pre-existing failure the brief lists; identical on the untouched base (run first, before any change). That test stops at its first failing range, which is Elagos's, so Gala's ranges are held to the same laws in gala-world.test.js instead: walked at and run at, nothing reached, nothing off its footing |
| also run: open-country 8/8, nesdor-world 8/8, west-rivers 5/5, vastos-world 10/10, meneth-world 7/7, cartography 13/13 | all pass |

After the final tuning (below), gala-world, regions-world, chameleon, eer-world, region-sky, map-fog,
developer-atlas, languages and region-layout were run again: all pass.

## Review views

One short render (`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg`), six
`stand-at` views, no errors; pictures in `tests/artifacts/`:

| view | what it showed |
|---|---|
| `stand-at:-1690,1060,3.1416,.12,22` — the steppe, looking south | the steppe open to the horizon, wormwood and stones, the maquis and olives on the Mediterranean rows beyond, the distributary glinting; a hare |
| `stand-at:-1745,1300,2.8,.22,14` — the Braided Mouths | three channels round sand bars, reed on every bank, tamarisk and oleander, the raft of geese on the main channel, the sea beyond |
| `stand-at:-1760,985,.27,.3,12` — toward the Oveth ford | the Oveth sits in its cut below the steppe shoulder and hardly shows from the south; Caricas's forest far off |
| `stand-at:-1700,1160,.53,.22,10` — up the dry wash | the wash reads as a line of gravel across the steppe more than as a cut: 1.25 m over 16 m is gentle |
| `stand-at:-1510,1060,-1.5708,.18,12` — the Reed Bank | the Lizeem wide and blue with Eer's alder and willow on the far bank; Gala's own bank bare |
| `stand-at:-1650,1250,-2.36,.1,25` — the maquis, toward the seam | maquis on the rises, olives standing singly, the boar among it |

**What was changed after looking**, and not photographed again (the brief allows one render): the
ground read as bare sand — pale, and the tussocks far too few — so the grass was tripled and the
steppe's tussocks made larger and wider; the three climate ground colours were taken a step darker
and greener (steppe `#aa9b6b`, Mediterranean `#9c9a63`, coast `#979b62`); the gravel, cobbles, ford
rock, stones and bar sand came out nearly white through `setHSL` (the renderer's working space, the
old Meneth lesson) and are hex now; and the Reed Bank got its reed back (a clump every sample, three
and four a side, instead of every other). The scatter re-rolled with the extra grass, so the boar's
range was measured again (the chase from all four quarters) and its sites moved; every other site
still holds, and the test says so.

## Open questions

1. **Names.** The Telemonia border stream and the desert border stream are unnamed in the lore and
   the atlas and are left so; the distributary is called "the distributary" and its mouths "the
   Braided Mouths" in plain words. Yours to name.
   **Answered 2026-10-01** (docs/southwest-finish-report.md): the two border streams are named from the
   Mittoli lexicon, which is `mittoli` in `world-builder/azhoran_language_profiles.py` and
   `LANGUAGES.mittoli.roots` in `src/gameplay/skills/languages.js`. The Telemonia border stream is **the Treloss** -
   the profile's own border root *trel-* with the *-oss* ending this tongue puts on a watercourse
   (*caeloss* is "river"), a form the profile's own `candidate_pool` emits. The desert border stream is
   **the Caelin**, *mittoli.roots.flow*, "the flow" - and it is the same name as the Oves Desert's
   reach of it, because the two are one chain. The distributary **stays descriptive**, on `gala.md`'s own
   sentence that the names of Gala's small rivers are from a pre-Mittoli layer nobody can gloss.
2. **The ribs.** The blended-wavelength chirp at every built/unbuilt border in the far west (above).
   A cure belongs in `relief()`/`terrainMix` (blend the relief values, not the wavelengths), which
   would move every border in the world; not attempted.
3. **The Oveth's upper course** belongs to Ovesos. Whoever builds it must end it at or above the
   Gala reach's head (5.38 m at (-1800, 953)) and keep its water off the desert stream's.
4. **The coastal hexes** read 5.7 m here, above the `Csb` rows, because their neighbours are outland;
   with Northern Ascarth, Legemum and Telemonia built they settle.
5. **Geese are resident** until there are seasons (the overview has them arrive in late autumn and
   leave in spring).
6. **Getting there.** Every Gala edge with Eer and Nesdor is the Lizeem; the dry ways in are from
   Telemonia (2 edges, open country) and Northern Ascarth (8 edges), and across the Oveth's ford from
   Ovesos and the desert stream from the Oves Desert. Nothing leads a traveler there yet.
