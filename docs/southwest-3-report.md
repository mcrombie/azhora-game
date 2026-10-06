# The southwest, job 3 of 4: Cape Heth, the Dinelv Highlands and Hama

Built 2026-09-30 on branch `southwest-3` (worktree `azhora-game-southwest-3`, from `southwest-2`
403097f), to `docs/southwest-3-brief.md`. **Terrain, climate, water, scenery and wildlife, and nothing
that belongs to anybody.** The three hundred people at the cape tip and in the Heth Bight with their
harbour, their cisterns, their pilots and their salvage; the city of Dinelv below the escarpment and the
whole apparatus above it — the plateau road, the garrisons at the northern pass and the middle saddle,
their cisterns and their tariff inspection, the quarries that cut the warm stone, the ridge-exposure
mines, the Plateau Watch and the pastoral communities who move their herds between the water points by
season; Hama Harbour, the Council of Merchant Houses and its seven families, and every plot on the
coastal margin: none of it is built. Left uncommitted, as the brief asks.

**Seventy-three hexes across three countries, and each of the three is a first.** All three firsts came
out where the brief said they would, and two things came out that nobody expected.

1. **The world box moved again** — `minX` from −3960.002 to **−4360.002**, the world from 45.700 hexes
   wide to **49.700** — and job 2's report had predicted job 3 would not move it at all. The prediction
   was sound about the *window* and silent about the *box*, which are different objects.
2. **Hama's terrain field and its climate field draw the same line on all nineteen hexes.** That makes
   the wet/dry line something the atlas states twice rather than something a build interpolates, and it
   is the most valuable single fact in the job.
3. **Cape Heth's `coast` hex is the only one the atlas puts inside any country**, and its `Cfb` is the
   sea's code and not the air's — measured, all 1,332 `coast` hexes and 13,619 of 13,622 `ocean` hexes
   on the map read `Cfb`.

---

## What each of the three is about

**Cape Heth is about one low ridge and two sides of it.** The lore is at pains to say what this cape is
not — "not a dramatic geographical feature in the mode of high cliff headlands or bold rocky outcrops;
it is a low, extended point of land that juts far enough west to matter as a navigational landmark" —
and the atlas agrees: eighteen `plains` hexes and one `coast`, nothing that could carry a cliff, and
twenty-one hex edges of open water, which makes it the most maritime country in the block by a factor of
two. So the country gets exactly one landform, the lore's own "cape's slight ridge", six metres high, and
everything else follows from which side of it a point stands on. The seaward side takes the weather —
"the ocean-facing slope is low enough that spray overtops it in the largest winter storms; the cape's
residents describe major storm events by how far the salt water got" — and carries bare grey-brown
sandstone with the bedding showing, gravel, a crust of salt in the rock hollows and lichen in the lee of
stones. The landward side is in its lee and holds every scrap of soil the cape has, in five shallow
drainage hollows. **It is a desert with the sea on three sides of it**, which is job 1's gulf-shore
finding for a third time and on the most exposed coast in Azhora.

**The Dinelv Highlands are about the bedding.** This is the first desert highland in the game — the
Lotharns are humid, the Meroshe is flat — and the lore gives it five sentences, every one of which is a
landform. The one that decides how the country reads is "the older geological layers visible in the cliff
faces as horizontal bands of different character. The lower bands are the warm-toned desert stone that
the Dinelv construction trade prizes; the upper bands shift to a harder, darker stone." A bedding plane
is a *height*, so the term that draws it is a function of height and of nothing else: `h + A sin(2πh/P)`,
horizontal by construction, impossible to lay crooked, and it draws a stack of treads and risers up every
steep face in the country while leaving flat ground a smooth offset. The escarpment itself is not authored
at all: `hills` at base 96 against Cape Heth's 13 and the Meroshe's 14 makes the hex blend carry the
whole eighty-metre front, which is the West Lotharn's contract. What is authored is what the face is
*made of* — the bands, four seasonal channels, three flat-topped tables, six ridge systems, four gaps
through them, four closed basins, and one graded ramp up.

**Hama is about where the desert stops.** It holds the corner of the continent, ocean on the west and
ocean on the south, and it is the only place in two hundred and seventy-five hexes where the desert ends
in something green rather than in water or in more desert. Nine `grassland` hexes that are every one of
them `Csb`, ten `plains` hexes that are every one of them `BWh`, and no hex where the two fields
disagree. The country is the two hundred paces it takes to cross the line: the sward breaks into
tussocks, the tussocks stand further apart, the soil thins to grit, and then there is gravel underfoot
and a stony broken rise ahead — "rough without being impassable: enough friction to make overland access
from the desert difficult for large-scale military movement." **It is also where the block stops getting
emptier**, and the wildlife arithmetic below is the whole argument.

---

## What the atlas gave

| | **Cape Heth** (40) | **Dinelv Highlands** (41) | **Hama** (42) |
|---|---|---|---|
| authored hexes | **19**, q −39…−34, r 125…129 | **35**, q −37…−29, r 126…132 | **19**, q −37…−32, r 137…141 |
| terrain | `plains` 18, **`coast` 1** | **`hills` 26, `plains` 6, `mountain` 3** | `grassland` 9, `plains` 10 |
| climate, per hex | `BWh` × 18, **`Cfb` × 1** (the coast hex) | **`BWh` × 35** | **`Csb` × 9, `BWh` × 10** |
| world extent (hex centres) | x −4250…−3750, z 1674…2021 | x −3900…−3200, z 1761…2281 | x −3500…−2950, z 2714…3060 |
| neighbours by shared edge | **sea 21**, Dinelv 8, Ganesh Desert 5 | Ganesh Desert 10, N Meroshe 9, W Meroshe 9, Cape Heth 8, Ganesh Plain 4, **sea 6** | **sea 19**, Central Meroshe 7, South Meroshe 7, West Meroshe 5 |
| authored rivers | **none** | **none** | **none** |
| level (`region-levels.js`) | 5 | 5 | 2 |

Every number was read off the survey and `tests/southwest-world.test.js` re-derives them.
`src/world/terrain/region-levels.js` and `src/content/chapters/civil-war/campaign-world.js` already carried all three and were not touched.

**Job 3's three are not one piece**, which is worth stating: Cape Heth and the Dinelv Highlands share
eight hex edges and Hama touches neither of them. Hama's only neighbours in eleven countries are the
three Meroshe quarters, nineteen edges, so the way from the plateau to the green corner is across job 2's
desert. The block now has **150 internal hex edges** — job 1's 46, job 2's 30, job 3's 8, and 66 between
the three jobs — and still not one edge against a built country outside it.

---

## The climate read, and the `coast` hex

Read per hex from `world-builder/map/resources/examples/azhora.wwmap` (`hexes[key].climate`,
`koppen-v1` — **not** `azhora.cmap.json`). `CAPE_HETH_CLIMATE`, `DINELV_CLIMATE` and `HAMA_CLIMATE` in
`src/content/regions/southwest/southwest-world.js` record all seventy-three and the test holds them to the map hex for hex.
`SOUTHWEST_CLIMATE` now carries **275** across three jobs.

**`BWh` × 63, `Csb` × 9, `Cfb` × 1.** With jobs 1 and 2 that makes **239 of the block's 275 hexes hot
desert**, and it leaves the atlas's own tally of `BWh` almost exhausted: 245 on the whole claimed map,
239 of them in this block.

**Cape Heth's one `Cfb` is the sea's code and not the air's, and that was measured before it was
believed.** Taken at face value it would have put an oceanic-temperate headland on the point of a desert
cape. Measured across the whole map:

| terrain word | hexes | how many read `Cfb` |
|---|---|---|
| `coast` | 1,332 | **1,332** |
| `ocean` | 13,622 | 13,619 |

So `Cfb` is what the map paints on water, and the nineteenth hex of Cape Heth is its shoreline rather
than a wet hex. `COAST_HEX_DRY` states that explicitly and the aridity field gives the point of the cape
the desert's own dryness — rather than falling through `ARIDITY[code] ?? 1` and looking right for the
wrong reason, which is the failure mode job 2's `groundTint` bug taught this block to distrust. The test
holds both halves: the map's word is recorded unchanged, and every one of the cape's nineteen hexes reads
above 0.995 dry.

**The three `mountain` hexes are the only hot-desert mountain hexes on the atlas.** Across the whole map
`mountain` reads `BWh` exactly three times, and they are (−32,128), (−33,129) and (−35,130) — this
plateau's. That code is what decides what they can be: a summit high enough to be a mountain in the sense
the Lotharn ranges are would read `ET` or `Dfc` at its top, and the map's author wrote hot desert.

**Hama's two fields agree on all nineteen hexes**, `grassland` ⟺ `Csb` and `plains` ⟺ `BWh`, and that is
the only country in the block where they agree over the whole of it. Job 1 found the same agreement on
its three odd hexes and made features of all three; this is the same thing across a country.

**The block's aridity gradient got gentler, not steeper.** Job 1 measured its worst step at 0.157 in
twenty metres, at the Ganesh Plain's `Csa`-against-`BWh` corner. Re-measured over all eleven countries it
is **0.149 at (−2725, 1760)** — still the same corner. Hama's line, which is the block's second real
gradient and a bigger climate step, is *smoother*, because `Csb` sits a whole step wetter than `Csa` on
this scale and the blend has two hexes to cross rather than one.

**And Hama wets four hexes of job 2's desert.** Job 2 measured the Meroshe at flat 1.000 on ninety-four
of its ninety-five hexes, the exception being the North Meroshe's (−24,128) beside the Ganesh Plain's
`Csb` row. It is now five: (−36,136) at 0.904 and (−35,136) at 0.913 in the West Meroshe, and (−32,140)
at 0.913 and (−32,141) at 0.893 in the South. **Every departure from 1.000 in ninety-five hexes is still a
neighbour's**, which is the same finding twice — and three of the four are shore hexes, so the wet edge
of the desert arrives on the coast rather than inland, which is what an ocean does.

---

## The world box moved, and it moved west

**Job 2's report predicted job 3 would not move it. It was right about the window and the window is not
the box.**

```
before   x -3960.0019279391277 … 609.9980720608719   z -2167.195996001615 … 3177.823940164498
after    x -4360.001927939127  … 609.9980720608719   z -2167.195996001615 … 3177.823940164498
```

`x = W(q + r/2)`, so a hex four columns west and four rows south of another stands at the same world x —
and Cape Heth's rows are four higher than the Ganesh Desert's. Its westernmost hex is **its one `coast`
hex, (−39,127)**, centre x = −4250 where the Ganesh Desert's westernmost centres stand at −3850; the
outer flat is at −4300 and the margin 60, so the edge goes to **−4360.001927939127** and the world from
**45.700 hexes wide to 49.700**. Each country's own case, which every guard's comment now states: the
Dinelv Highlands reach x = −3900 and Hama −3500, and **Hama ties the southern edge to the millimetre
without passing it** — its southernmost hexes (−34,141) and (−33,141) stand on exactly the row the South
Meroshe already set, so `maxZ` does not budge. The world is **49.700 by 53.450**.

**The lesson is not about an axis.** Three briefs in a row have now predicted the box would hold: job 1's
was wrong (west), job 2's was wrong (south), job 3's was wrong (west again). What went wrong each time is
the same substitution — reasoning about the survey window's `q`/`r` and concluding something about the
world box's `x`/`z`. The two are related by `x = W(q + r/2)` and that relation is exactly what breaks the
inference.

### `WINDOW.minQ`: −45 → **−49**, and it buys nothing

The coast lattice is laid `COAST_MARGIN` (96 m) beyond the bounds and snapped to a fixed phase, so its
first column now stands at x = **−4456.001927939127** (it was −4056.002) and the lattice is
1,292 × 1,386 = **1,790,712** points. Sampling all of them and collecting every hex any sample falls in
gives **q −49…34, r 79…144**, with q = −49 reached only on rows 142–144 in the far south-west corner
again. So `minQ` is −49: the last column the lattice reaches, and no slack.

**That widening pulls in nothing at all, and it is the first time.** The four columns q −49…−46 hold **no
claimed hex anywhere on the atlas** in rows 79–144, because west of Cape Heth the map is open ocean to the
edge of the sheet. Job 1's widening bought 71 hexes of horizon, job 2's bought 143 including 33 of its
own, and job 3's buys none: `LAND_HEXES` stays at **2,078** and the generated survey is byte-identical
either way. The value moves anyway, because the invariant this window keeps is "the last column the
lattice reaches, and no slack", and a window that lied about that would be a trap for whoever next widens
the world west. **All seventy-three of job 3's hexes were already in `LAND_HEXES`** — Cape Heth's
nineteen were pulled in by *job 1* as the Ganesh Desert's horizon, which is why the desert had a cape to
look at before anybody built one.

### The world-box guards that moved — six files

| file | was | now |
|---|---|---|
| `tests/region-layout.test.js` | `< 46` / `> 45.6` hexes wide | **`< 50` / `> 49.6`**, with Cape Heth's case stated and the window measurement recorded |
| `tests/isareos-world.test.js` | `wide > 45.6 && wide < 46` | **`> 49.6 && < 50`** |
| `tests/nethereum-world.test.js` | the same guard | **the same move** — found together for the fourth time |
| `tests/mithala-world.test.js` | `\|wide − 45.70\| < .01` **and** `minX === −3960.0019279391277` | **49.70** and **−4360.001927939127**; the plain still spends none of it |
| `tests/west-lotharn-world.test.js` | `minX === −3960.0019279391277` | **−4360.001927939127**, and its comment now holds four facts |
| `tests/southwest-world.test.js` | job 1's and job 2's box and window test | rewritten for all three jobs |
| `tests/izol-world.test.js`, `tests/ascarth-world.test.js` | pin the **southern** edge and the height | untouched: nothing north or south moved, and Hama ties rather than passes |

---

## The ground

### Profiles, and the first table in this block that has real work to do again

| country | terrain | base | amplitude | wavelength | measured mean | measured range |
|---|---|---|---|---|---|---|
| **Cape Heth** | `plains` | **13** | .8 | **320** | **18.34 m** | 13.4 – 36.1 |
| | `coast` | **5** | .5 | **320** | 11.24 | one hex |
| **Dinelv Highlands** | `hills` | **96** | 3.2 | **320** | **91.20** | 64.5 – 113.6 |
| | `plains` (the basins) | **82** | 1.4 | **320** | 89.99 | 84.5 – 96.0 |
| | `mountain` (the tables) | **138** | 5 | **320** | **175.66** | 164.7 – 188.4 |
| **Hama** | `plains` (the rise) | **28** | 1.6 | **320** | **18.05** | 15.6 – 20.8 |
| | `grassland` (the sward) | **15** | .9 | **320** | 9.39 | 6.4 – 11.5 |
| *for comparison:* Navarth `hills` | | 58 | 2.8 | 320 | | |
| *for comparison:* West Lotharn `hills` | | 58 | 8 | 215 | | |

**Every profile is on wavelength 320**, which is now eleven countries of this block and the reason the
other eight give: `relief()` takes its phase from x / wave, the hex blend mixes the wavelengths, and a
country on another wave shifts the phase of every sine within reach of its border. These three share
**fifty-two** hex edges with the block's other eight. **The `mountain` profile is on 320 too**, where both
Lotharns put their mountain hexes on a wave of their own — because a Lotharn mountain hex sits inside a
range of mountain hexes and these three sit one hex from `hills` on every side.

Job 2's four countries could not be told apart by a base or an amplitude at all. These three differ by
**eighty-five metres of base** between them, which is more than any three neighbours in the game outside
the two Lotharns:

* **Cape Heth is low and nearly flat**, because a cape that stood high would be the cliff headland the
  lore says it is not. `byTerrain.coast` at **5** is the lowest authored base in the game.
* **The Dinelv Highlands are the highest non-Lotharn ground there is.** `hills` at 96 is thirty-eight
  metres over Navarth's 58, which was the block's high ground. The `plains` hexes at 82 are *not*
  lowland — they are the six closed basins inside the plateau, and `plains` ringed by `hills` means a
  hollow in an upland. `mountain` at 138 is deliberately low for the word, for the climate-code reason
  above.
* **Hama is a coastal ramp**: 28 on the stony inland rise, the highest `plains` in the block after the
  hamada, falling to 15 on the sward. Both were authored two metres higher than first drawn, because
  job 1's tilt plane now runs over Hama too and takes seven metres off this corner on its own.

### The fall: one plane, and nothing new

`SOUTHWEST_TILT` was extended for job 2 and needed nothing for job 3: the same single plane toward the
Vaellir's mouth now runs over all eleven countries, and it is the whole of what these three get for a
general fall. Measured, it takes 6.4 m off Hama's grass and 7.1 m off its southern corner, which is
between job 2's 5.6 at the sand sea and its 8.7 at the South Meroshe's shore. **No new ramp, no new
basin, no second plane**: the cape falls to its own shores through the coast field, the plateau falls to
everything round it through the hex blend, and Hama falls to two oceans through its two bases.

### Cape Heth: the spine, the hollows, and the spray

**`HETH_SPINE`** runs the length of the promontory from near the point east-north-east, **six metres** at
its middle and nothing at either end, and it is **asymmetric on purpose**: the fall is 62 m of run on the
weather side and 128 on the lee. That asymmetry is the only reason the lee is a lee, and the lore hangs
its whole human geography on there being one. Nothing is made of it: the buildings the lore puts in its
lee are not built.

**`HETH_HOLLOWS`** — five shallow closed hollows on the landward flank, 1.3 to 1.8 m deep and 44–56 m
across, holding the only soil on the cape. Measured, every one floors between 8.5 and 15.1 m and takes
less than two thirds of the spray the open weather face takes. The first of the five was moved:
at (−4145,1895) the spray field reads **0.91** and nothing roots at all, which is weather face and not
hollow; measured, (−4104,1912) is where it drops under two thirds.

**`hethSpray`** is the field the country is sorted by — 1 on the seaward third and near the water, 0 in
the lee hollows — read off the two things the lore puts together, the westerly exposure and the distance
from the surf. The ground colour, the scatter and the wildlife all sort by it.

### The Dinelv Highlands: six landforms and one of them is free

**`DINELV_BANDS` — the bedding, and it is the cheapest landform in the block.** `h + A sin(2πh/P)` with
P = 15 and A = 1.1. Because it depends on the height and nothing else it is **horizontal by
construction**: no bearing, no line, no anchor, and it cannot be laid crooked. Because `A < P/2π`
(measured, the ratio is 0.461) it is monotone in `h`, so the surface stays single-valued and nothing
overhangs — the test walks the whole range at quarter-metre steps and checks it. What it does is multiply
the local slope by between 0.54 and 1.46, which turns an even fall into treads a traveler can stand on and
risers they cannot **without changing the total fall by a centimetre**. On the plateau itself, where the
ground wanders three metres over three hundred, it lays a set of low contour-parallel benches, which is
what a stripped bedded surface in a desert looks like. The tint reads the same term.

**`DINELV_RIDGES` — six ridge systems, and the atlas drew them.** The lore says the ridges run "from
roughly north to south, aligned with the peninsula's long axis", which are two claims that on this atlas
are nearly but not quite the same. Measured off the country's own hexes the row centres walk from
x = −3400 at row 126 to x = −3700 at row 132: the long axis is **north-north-east to south-south-west,
about thirty degrees west of due south**. In that frame — `a` along the strike, `c` across it — **every
one of the thirty-five hexes but one falls on a row of constant `c`, 86.6 m apart**, and reading along
those rows the terrain field says this:

```
  c = -2324   hills                                          one hex: the seaward corner, no ridge
  c = -2237   hills hills hills hills hills                   an unbroken ridge
  c = -2150   hills hills PLAINS PLAINS  mtn   hills hills     a ridge with a wide gap
  c = -2064   hills PLAINS  mtn   mtn   hills PLAINS hills     a ridge with two gaps
  c = -1977   hills hills PLAINS PLAINS hills hills hills      a ridge with a wide gap
  c = -1891   hills hills hills hills hills                    an unbroken ridge
  c = -1804   hills hills hills                                the inner shoulder
```

So the rows are the ridges, **the six `plains` hexes are the gaps in them**, and the three `mountain`
hexes are the high points of two of the middle rows. Nothing is imposed; the structure is read off the
terrain field in the frame the lore's own sentence names. Crests run 10–15 m with a broad swale between
each pair, taken as a **maximum and not a sum** (`ovesRim`'s rule), because a ridge *system* is a broad
double-crested thing rather than a ridge twice as high. The one hex off every row, (−37,130), sits on a
seventh strike row that the atlas gives a single hex, and a row of one is not a ridge system: it carries
the escarpment and nothing else. Job 2 took the same lore sentence for the hamada's benches one hex-row
south and built them due north and south; the thirty degrees between them is inside the lore's "roughly",
and the two are one structure seen twice — job 2's own report calls its benches "harder beds outcropping
on a dip that runs east off the Dinelv highland".

**`DINELV_GAPS` and `DINELV_BASINS` — the passes and the water points are the same ground, and that is
the finding.** The lore says two things about this plateau without joining them: "these ridges create the
passes that matter to the Route Registry", and "the deeper-rooted plants occupying the water-concentration
points that only become visible in wet years when they green faster than the surrounding ground". On this
structure they are one thing, because the ridges are the divides and the gaps are the only low ground
there is. That is why the court's cisterns are at the passes and why the pastoral communities move between
them. So the four gaps carry the four basins, placed by arithmetic rather than by eye — two of them two
hexes wide where a row has two `plains` hexes side by side, two of them one hex — cut eight or nine
metres, closed, with nothing leaving any of them. Measured, every gap stands **more than six metres below
the higher of the two crests beside it along the strike**: 93.2 against 162.5, 84.5 against 174.0, 85.1
against 113.8 and 82.7 against 109.2.

**`DINELV_MESAS` — the three tables.** 62, 74 and 55 metres of lift over the plateau, flat-topped (full
lift inside 36–46 m, then a fall to nothing by 82–96) and **too steep to walk**, which is what a hot
desert makes of a bedded plateau it is stripping away: a residual block with a flat top and cliff sides,
the last remnant of a higher and older surface. Measured tops **164.7, 188.4 and 174.9 m**, the third and
fourth highest ground in the game after the two Lotharns. **Two of the three lie on one strike row to
within half a metre** and the third eighty-seven metres west of it on the next row — measured, not
chosen — so they are the high points of two ridges and not a range. Their flanks carry `DINELV_BANDS`
like everything else, so the courses run round them at the same heights they run along the escarpment,
which is the one thing that says these three and the escarpment face are the same rock.

**`DINELV_CHANNELS` — four seasonal channels, and three of them answer job 2's open question.** Job 2
asked for "the three fan apexes... to read as being at the mouths of the escarpment's own channels", and
they do: the north, middle and east channels end within 22 m of `MEROSHE_FANS`' three apexes and the fan
takes over below. The fourth runs west off the plateau onto Cape Heth, which is the coastal strip the
lore says the ascent starts from. All four are dry — there is **no water surface anywhere on these
thirty-five hexes and the atlas draws no river edge on any of them** — and they are narrow and deep for
their width, 2.2–2.8 m of cut at 7–9 m of half-width, because a channel on a bedded face cuts rather than
spreads.

**`DINELV_ASCENT` — the one way up, and it had to exist.** Every margin of this country is an escarpment
and one of them is a sea cliff, so somewhere there has to be ground a loaded animal can be walked up or
the lore's whole account of the place — stone downhill, food uphill, passes that can be closed, a full
day's ascent on the standard road — means nothing. The lore's **northern plateau pass** is "the primary
overland connection between Dinelv and the plateau interior, and through the plateau interior, to the
caravan routes that cross the Meroshe", so the northern margin carries a graded ramp, laid **along the
grain** up the swale between two ridges (c ≈ −1935), which is how a ridge-and-valley plateau is actually
climbed. It is the swale's own machinery (`SOUTHWEST_SWALE`) turned on its side: within 19 m the ground is
levelled toward a constant grade and comes back to the ordinary escarpment by 48. Measured: **29.0 m at
the foot to 85.1 at the head over 293 metres, worst local grade 0.53**, inside the free-walking budget the
whole way, where the escarpment either side of it runs to twice that. Nothing is built on it.

**And the proof is a flood fill.** On a four-metre lattice from the foot of the ascent, climbing no
steeper than 0.45 and descending anything short of a fall, the reachable ground tops out at **117.6 m** —
above every ridge crest — and does not reach any of the three tables, which start at 164.7. So the
plateau can be walked up in exactly one place and the tables cannot be walked at all, which is what a
desert mesa is. (Dinelv is not one of the game's four climbing regions and does not ask to be.)

**The sea cliff, which nobody expected and the atlas drew.** Six of Dinelv's own hex edges are unclaimed
`coast` at (−38,130)…(−38,133), on its south-western corner, which means **there is no coastal strip
there at all: the plateau stands straight over open ocean.** Measured on the built ground, the worst fall
in the first fifty metres inland of that waterline is **96.9 m**. It is the steepest ground in the
southwest by a factor of three and it is entirely the hex blend plus the coast field; nothing was authored
to make it.

### Hama: a ramp, a friction and three dry beds

**`hamaGreen`** is the field the country is sorted by, and it needed no field of its own: it is
`southwestAridity` read back on Hama's hexes and stretched, because the aridity field already blends the
same hex codes on the ground's own falloff. Measured, the nine `grassland` hexes mean **0.916** green and
0.274 dry; the ten `plains` hexes mean **0.029** green and 0.887 dry.

**`HAMA_BROKEN` — the friction, and it is surface rather than relief**, because the atlas says `plains`.
A metre and three quarters on two turned bearings of 40 and 63 m, plus a low rib every 118 m — one field
on one bearing reads as corrugation, which is the Ascarth plateau's lesson — gated off the green half
entirely by `hamaGreen`. It is twice the roughest thing in the Meroshe and it is job 2's answer to flat
country used a fourth time: "rough without being impassable — enough friction to make overland access from
the desert difficult for large-scale military movement, easy enough for the small commercial caravans and
courier traffic." `hamaLie` reads it back for the scatter: 1 on a bare stony rib, 0 in the fine ground.

**`HAMA_BEDS` — three winter watercourses, all dry.** `Csb` means the rain comes in winter and the summer
does not, the lore says the seasonal supply is "unreliable in dry years", and the atlas draws no river
edge on any of Hama's nineteen hexes — so there is no permanent water in this country at all. What the
winter rain leaves is three shallow soft-banked cuts, 1.4–1.6 m, running off the stony rise across the
grass and into the two seas, with the greenest grass in the block standing in their floors. Measured, all
three fall the whole way (20.4 → 8.9, 16.9 → 3.7, 12.6 → 3.9 m) and all three end above the tideline.
**They lie about the shore the way `merosheSkirt` did and were fixed the same way**: the coast field has
already brought the last forty metres down to the water before `southwestGround` sees the ground, so a
metre and a half of cut on top of that put the middle bed's mouth at −0.3 m, below sea level. The cut now
holds to 52 m inland and releases over the last thirty-four, and all three lines were trimmed back to
ground standing more than 20 m clear of the surf.

### Where Hama's line actually falls

This is the country's subject, so it was measured rather than asserted. Walking east along six rows and
finding where the blended aridity crosses a half:

| row | the line | how far inland of the surf |
|---|---|---|
| z = 2740 | x = **−3390** | 110 m |
| z = 2800 | x = **−3358** | 76 |
| z = 2860 | x = **−3260** | 75 |
| z = 2920 | x = **−3152** | 85 |
| z = 2980 | x = **−3052** | 74 |
| z = 3040 | x = **−2950** | 69 |

**The line runs from the north-west to the south-east and it is between sixty-nine and a hundred and ten
metres inland of the waterline at every one of those points** — which is to say it is parallel to the
shore, about a hex in, all the way round the corner of the continent. **The ocean draws it and the
Meroshe does not.** That is the answer to the brief's question, and it is also the answer to whether Hama
and job 2's South Meroshe fog belt explain each other: **they do, and the explanation is the same ocean
air twice.** Hama is the exposed western face where the weather arrives — "exposed to the weather patterns
that originate in the far west and arrive at the peninsula having crossed considerable water" — and takes
the moisture as winter rain within a hex of the surf. The South Meroshe is four hundred metres east and
in its lee, so what reaches its own southern shore is the same ocean's water with the rain already out of
it, and it arrives as fog: `merosheFog` builds from the south and the east and is nothing at all on the
north-western third, against Hama. One ocean, two hundred and seventy-five hexes of desert between the
two shores, rain on one and fog on the other.

---

## The seams

Nineteen internal seams now. Measured as the steepest four-metre central difference at points where the
blend is **entirely the block's own** (the same measure job 2 used, which is roughly twice a two-metre
forward difference):

| seam | edges | steepest step |
|---|---|---|
| **Dinelv Highlands \| Ganesh Plain** | 4 | **7.66 m** |
| **Dinelv Highlands \| Ganesh Desert** | 10 | **7.29** |
| **Dinelv Highlands \| West Meroshe Desert** | 9 | **6.14** |
| **Cape Heth \| Dinelv Highlands** | 8 | **5.20** |
| **Dinelv Highlands \| North Meroshe Desert** | 9 | **5.11** |
| Ganesh Plain \| North Meroshe Desert | 10 | 2.19 |
| Central \| North Meroshe | 11 | 2.02 |
| North \| West Meroshe | 3 | 1.98 |
| Ganesh Desert \| Navarth | 11 | 1.86 |
| Navarth \| West Pyros | 13 | 1.79 |
| Central \| West Meroshe | 7 | 1.66 |
| Ganesh Plain \| Navarth | 1 | 1.44 |
| **Cape Heth \| Ganesh Desert** | 5 | **1.42** |
| Central \| South Meroshe | 9 | 1.24 |
| Ganesh Desert \| Ganesh Plain | 6 | 1.20 |
| Ganesh Plain \| West Pyros | 15 | 0.77 |
| **Hama \| South Meroshe Desert** | 7 | **0.61** |
| **Hama \| Central Meroshe Desert** | 7 | **0.51** |
| **Hama \| West Meroshe Desert** | 5 | **0.27** |

**The five steepest of the nineteen are the Dinelv escarpment and nothing else**, one to each of its five
built neighbours, and that is not a defect and it is not hidden. It is `hills` at base 96 meeting the
Ganesh Plain's 22, the Ganesh Desert's 20, Cape Heth's 13 and the West Meroshe's 14, with the whole
eighty-metre fall carried by the hex blend and **no landform authored on any of those margins at all** —
which is the West Lotharn's own contract, "a mountain front is what the atlas draws here", and the reason
its report measures the front rather than lowering a base to hide it. The test bounds them at 9 m and
everything else at 5, and asserts that the minimum of the five is above the maximum of the fourteen.

**And Hama's three are the flattest in eleven countries**, flatter than the Ganesh Plain seam job 2 called
the flattest of its ten: a stony rise at base 28 meeting three deserts at 14 and 16, with the block's one
tilt plane running through all four and no landform on any of the nineteen edges.

**The Ganesh Plain | North Meroshe seam did not change and the measurement of it did.** Job 2 measured
0.27 m over all ten edges and called it the flattest thing in the block. The worst reading is now 2.19 m
and **all of that is at its western end**, where the Dinelv escarpment's blend reaches the last two edges
— the plateau shares four hex edges with the Ganesh Plain a hex south-west of there. Measured on the
points where the blend holds no Dinelv at all, the two halves still meet at **0.27 m**, job 2's figure to
the centimetre, and the test now holds both numbers.

### The ribs against the outland

| | steepest step |
|---|---|
| the block \| open country (every outer margin) | **7.99 m** |
| *inside the block, blend > .95* | p95 **2.80**, max 5.50 |
| *inside the block with the plateau left out* | p95 **0.79** |
| *for comparison:* job 2's block \| open country | 6.06 |
| *for comparison:* job 1's block \| open country | 9.13 |
| *for comparison:* Mithala \| open country | 4.38 |

Same defect, and the block's p95 *inside* went from job 2's 0.75 to 2.80 for exactly one reason: the
Dinelv escarpment, the three tables' cliff faces and the sea cliff are the only ground in eleven countries
steep enough to register at all. With the plateau left out the p95 inside the other ten is **0.79**, which
is job 2's number. The test holds both. **The cure for the rib belongs in `relief()`/`terrainMix` and is a
world-wide job; the brief said not to chase it and it was not chased.** Two unbuilt neighbours are left on
these margins — Marosh and Trogo — and job 4 builds both, after which the southwest has no unbuilt
neighbour but the Ibenwoods.

### What building three neighbours did to job 1's and job 2's ground

Measured against the same points on the base commit (`git archive` of 403097f into a scratch tree, the
method jobs 1 and 2 used). Mean movement of each built country's hex centres:

| country | mean | worst single hex |
|---|---|---|
| West Meroshe Desert | **+3.909 m** | +25.809 at (−34,132) |
| North Meroshe Desert | +3.051 | +23.837 at (−32,131) |
| Ganesh Desert | +2.495 | +21.893 at (−32,126) |
| Ganesh Plain | +1.160 | +16.837 at (−28,127) |
| Central Meroshe Desert | +0.325 | |
| South Meroshe Desert | +0.242 | |
| Navarth, West Pyros | **+0.000** | |

Every metre of that is a rib at a margin disappearing, which is what building a neighbour is for, and it
is the same effect job 2 measured (+0.30 on the Ganesh Plain's southern margin) at four times the size,
because an escarpment is a bigger neighbour than a rock floor. **Job 1's four countries are untouched
away from the two margins that now have a plateau on them.**

### Did the Meroshe fan heads lift? Yes, and by more than anybody guessed

Job 2's open question 5 said `merosheSkirt` and `MEROSHE_FANS` were "deliberately written as a one-sided
ramp falling away from the Dinelv margin rather than as a slope down from a fixed head, so when the Dinelv
Highlands are built with a highland base the hex blend lifts the fan heads automatically and the apron
still falls away from them. Nothing here needs changing for that."

**Nothing was changed and the heads lifted:**

| fan apex | ground before | ground now | lift | blended base before → after |
|---|---|---|---|---|
| north fan (−3720, 2345) | 9.28 m | **38.73** | **+29.45** | 13.13 → 42.37 |
| middle fan (−3590, 2345) | 11.66 | **33.54** | **+21.88** | 13.36 → 35.04 |
| east fan (−3450, 2270) | 15.63 | **33.95** | **+18.32** | 13.53 → 31.94 |

Every metre of it came through `terrainMix`'s own base, which rose by 29.24, 21.68 and 18.41 at those
three points as the hexes beside them stopped being `outland` at 11.5 and became the plateau at 96. The
fans' own lifts are still 4.2 / 5.0 / 4.6 and the skirt's own drop is still 7, to the digit; the apron
still falls away from the heads to the sea and to the salt, which is what a one-sided ramp buys. The
West Meroshe's hex-centre mean went from job 2's 9.32 m to **13.26**, so its fan skirt now falls about
thirty-five metres over four hundred and thirty rather than ten — which is a proximal bajada below an
escarpment, and is the slope a real one has.

---

## What grows

`src/content/regions/southwest/southwest-scenery.js`, extended with **a third pass of its own** after job 2's, for job 2's reason:
job 1's loop sorts by how dry the air is and where the wind has left sediment, job 2's by which of four
desert surfaces is underfoot, and neither vocabulary contains salt spray, a bedding course or a line of
grass. Keeping the three passes apart also keeps the two earlier loops at exactly 107 and 95 cells, so
**the seeded stream jobs 1 and 2 drew from is the same stream to the draw**.

| country | what is laid on it |
|---|---|
| **Cape Heth** | thin flat **bedding slabs** of grey-brown sandstone, denser where the spray gets at them; angular **grit**; a **salt crust** in the rock hollows wherever `hethSpray` is above .42, which is the one white thing in the block outside the Malhat; **lichen** in the lee of stones on the weather face; spaced low **scrub** on the open lee, and none at all where the salt reaches; in the five hollows, **scrub twice the size and a stubble of grass**; **shingle** on the bight's sheltered shore and none on the weather face, where the surf takes anything loose away |
| **Dinelv Highlands** | **bedding slabs** bare along every ridge crest and all over the mesa flanks, where the beds outcrop; **grit** everywhere; **cliff blocks** in an apron round the foot of each table — the biggest stones in the block, and what tells a mesa from a hill — painted *darker* than the ground because the fallen cap is the harder upper bed; **rubble** on the four channel floors; **spaced scrub** on the plateau, thinning to nothing on the crests; in the four basins, **close scrub, grass and the plateau's only trees** |
| **Hama** | the **sward**, the densest scatter in eleven countries, thick where the map says `Csb` and gone where it says `BWh`; low **evergreen scrub** in the hollows of the green half; a few **trees leaning inland** off the sea wind; the **greenest grass in the block** in the three winter beds; **stony ribs and gravel** on the dry half, sorted by `hamaLie`; and a **bleached stubble** across the change, where the grass has given out and nothing has taken its place |

**The plateau's only trees are all in a basin**, which is the lore's own claim about where the deep roots
are, and they matter out of proportion to their number: on a plateau with nothing else standing on it, a
handful of small thorn in a hollow is visible from a long way off, which is what "green faster than the
surrounding ground" means from a distance.

**The ground's own colour.** `SOUTHWEST_GROUND` gained five: `warmStone` (0x6f5c3c) and `hardStone`
(0x4c4a3e), which are the lore's own two escarpment stones read off **height** because a bedding plane is
a height; `capeRock` (0x605d4e), the grey-brown marine sandstone; `spray` (0x7c7a6e), salt-bleached bare
rock; and `meadow` (0x4e6630), Hama's `Csb` half — the greenest ground in the southwest and the only wet
one. The plateau's mix runs from warm at the escarpment foot to grey on the mesa caps with the bedding's
own sine on top of it, so individual courses read as courses, which is the one thing that says the mesa
flanks and the escarpment face are the same rock.

**And `groundTint`'s early return became a branch.** Job 2's `else if` made `southwestTint` reach the
screen; inside it, the Meroshe's section ended with `return`, and the Dinelv Highlands' box overlaps
`MEROSHE_BOX` by three hundred metres at their corners — so that `return` would have thrown the plateau's
colours away on every point in the overlap, silently, which is the exact failure mode job 2 found. It is a
branch now. Job 2's report asked for `groundTint` to become a table of `(inBox, tint)` pairs walked in
order; this is that shape held inside one country's tint, which is as far as job 3 could take it without
touching the chain, and **it is still an open question.**

---

## What grows: the counts

`world.southwestMetrics`, job 3's own additions:

| | | | |
|---|---|---|---|
| Dinelv bedding slabs + grit **6,595** | Cape Heth slabs + grit **3,222** | **Hama sward 3,594** | Hama ribs + gravel **1,256** |
| Dinelv plateau scrub 943 bushes | Cape Heth scrub 469 | Hama evergreen scrub 336 | Dinelv basin scrub 208 |
| Dinelv plateau stubble 507 | Hama transition stubble 383 | Cape Heth lichen 289 | Cape Heth salt crust 270 |
| **Dinelv cliff blocks 239** | Dinelv basin grass 195 | Heth Bight shingle 124 | Dinelv channel rubble 114 |
| Heth hollow grass 101 | Hama winter-bed grass 361 | **Dinelv basin thorn 21 trees** | **Hama wind trees 16** |

**The ratio is the argument again, and it is different in each of the three.** Cape Heth lays about
3,900 stones against 1,700 plants; the plateau 7,000 against 4,200; and **Hama 1,300 stones against
4,000 plants**, which is the first country in the block since West Pyros where the plants outnumber
the stones. Hama's sward alone is **3,594 tufts over nine hexes — four hundred a hex**, against job
1's block-wide fifty-two and the Mithala plain's two hundred and twenty-six, and it is the densest
scatter in eleven countries. **The whole of the block still carries thirty-seven trees outside the
Vaellir's gallery and the north wood**: seventy-one thorn on the hamada, twenty-one in the Dinelv
basins and sixteen leaning inland on Hama's coast.

---

## What lives there, and why

**Thirteen ranges over seventy-three hexes, and the block stops getting emptier.** The arithmetic is the
argument:

| | ranges | hexes | a hex |
|---|---|---|---|
| job 1 | 17 | 107 | 0.159 |
| job 2 | 7 | 95 | **0.074** |
| **job 3** | **13** | **73** | **0.178** |
| *of which* Cape Heth | 4 | 19 | 0.211 |
| *of which* Dinelv Highlands | 4 | 35 | 0.114 |
| *of which* Hama | 5 | 19 | **0.263** |
| *for comparison:* West Pyros, with the great river | 7 | 27 | 0.259 |
| *for comparison:* the Ganesh Desert | 3 | 31 | 0.097 |

That is not a change of standard. It is the same standard on different ground:

* **Cape Heth: 0.211 a hex, and three of the four ranges came out of the sea.** The land is `BWh` on
  eighteen of nineteen hexes and carries **one** range, in the drainage hollows, which is the only ground
  on the cape with soil in it. A cold-current coast against a desert is the most productive water there
  is — job 2's own argument for its dry-shore gulls — and this cape has twenty-one hex edges of it against
  the West Meroshe's ten.
* **Dinelv Highlands: 0.114 a hex.** A desert plateau with no permanent water, so two of the four are
  birds in the air and the two on the ground are both in basins, because the basins are the only ground on
  the plateau with cover or grass on it. **Thirty-one of the thirty-five hexes carry nothing at all.**
* **Hama: 0.263 a hex, the densest country in eleven.** Nine of its hexes are `Csb` Mediterranean
  grassland with ocean on two sides, which is genuinely richer country than anything in the block except
  the Vaellir's own plain — and it edges that. The fifth range is the one that is *not* in the grass.

| zone | species | where | why |
|---|---|---|---|
| `heth-point-plungers` | **sea-plunger**, 22 m, plunging | off the point | the overview's Great White Sea-plunger, whose "vertical dives from height into the Iberos shoals" it puts on "the exposed Legemum headlands". **This is the other exposed headland on the atlas** — the westernmost land in Azhora, with the cold current the lore builds this cape on running past it |
| `heth-point-gulls` | gull | the point's bare rock | a low promontory in a cold current is where the sea concentrates; forty paces inland the ground has nothing on it |
| `heth-bight-waders` | wading-bird | the sheltered northern shore | the lore's own bight: "the productive zone for the shallow-water fishing", and the only calm water on four hundred metres of coast |
| `heth-hollow-hares` | upland-hare | the drainage hollows | **the only animal on the ground in the whole cape**, on the only soil it has, with salt doing the work drought does in the Ganesh |
| `dinelv-rim-hawk` | plateau-hawk, 33 m | over the escarpment rim | **not an extension**: the overview's dry-plateau hawk "hunts the upland grasslands" of rain-shadow country and this is the largest one on the atlas. Ninety metres of fall under the bird and the fan skirt, the salt pan and the ocean beyond |
| `dinelv-table-bone-bird` | **bone-bird**, 40 m | over the tables | the only vertical rock in a hundred and seventy hexes of desert, which is lift for nothing; the ninth bone-bird in the block and the highest ground any of them works |
| `dinelv-basin-hares` | upland-hare | the eastern basins | extension: the water points are the only ground on the plateau that is not bare between the plants |
| `dinelv-saddle-hares` | upland-hare | the wide western basin | two bands rather than one, for job 1's reason on the Ganesh Plain's depressions: the ridges between them have nothing on them |
| `hama-sward-hares` | upland-hare | the seaward sward | the first range in the block since the Vaellir's own plain that is on grass because of the weather rather than because of a hollow |
| `hama-bed-hares` | upland-hare | the north winter bed | the damp reach's argument on a country wet enough that it is grass and not scrub |
| `hama-harrier` | harrier, 9 m, quartering | the seaward grass | extension: two hexes of thick sward between a stony rise and an ocean is a harrier's whole living. **It turns back at the line** |
| `hama-corner-gulls` | gull | the corner of the continent | **the only shore in the southwest where the grass comes down to within thirty paces of the water.** The Ganesh's gulf, the fan skirt's dry shore and the Meroshe's southern beach are all desert to the surf |
| `hama-line-bone-bird` | **bone-bird**, 38 m | Hama's stony inland half | **the last bone-bird, and the point of it is where it stops.** Two hundred paces south-west of the end of its range the ground is Mediterranean grass with a harrier over it |

Every site was measured on the built world — dry, its own country's by both `regionAt` and `hexOwnerAt`,
off every water surface and every dry bed, standable, with the test's own four-metre step under 1.5 m —
and every range's half-diagonal is between **57 and 96 m** against `LIFE_REACH`'s 130.

### No new rig, and the two calls that were close

**The block has now built eleven countries on job 1's one new rig.** Every species here was already in
`src/content/regions/western-regions/west-regions-life.js`. The sea-plunger had been used once, at the Ascarth tip, and is the
best-argued extension available: the overview places it on exposed headlands over productive water, and
Cape Heth is the only other one the atlas draws.

* **The Ganesh dustback stays out, exactly where jobs 1 and 2 left it.** The lore names it, gives it an
  economy and a social meaning, and never describes its body; the only dustback the lore *does* describe
  is a domestic bovid, which is somebody's. **Inventing a body for a named animal is the user's decision
  and not a builder's**, and that is the third time this block has held that line.
* **The canyon tortoise got closer and still fails.** `dinelv_highlands.md` puts the highland
  communities' own trade with "the canyon peoples further interior", and the overview's tortoise is "a
  large, slow-moving grazer of desert seeps and seasonal wash vegetation… may live as long as two
  centuries" — which is precisely what `DINELV_BASINS` are, so **this plateau is the best home the game
  has ever had for it.** It still fails `tests/west-life.test.js`'s first law, that nothing in the west
  can be walked down, and an animal whose whole character is that it can be needs either a burrow to go
  into or an exemption in the law. Both are design decisions rather than build ones.

**Nothing domestic.** The plateau's pastoral communities move their herds between the water points by
season, the highland breeds' fibre is what the court cannot tax, and Hama's food comes in by sea; every
animal in any of that belongs to somebody, and a herd with nobody near it is still somebody's herd.

---

## Names, the skies and the speech

**Nothing is coined and one name is taken.** Every name here is the lore's own word (the Heth Bight, the
Dinelv Plateau, the northern plateau pass, the middle saddle, the water points, Hama), the lore's own
technical word (the escarpment, the bedding courses, the ridge systems), or plain English (the Point, the
Spine, the Weather Face, the Tables, the North Pass, the Line, the Seaward Grass, the Broken Ground, the
Corner, the Winter Beds). **The Tables** is the one coinage of any kind, and it is a plain English word
for a mesa rather than a word in anybody's language.

**Three skies, and each is argued from the atlas rather than from the climate code.**

| | sky | haze | density | why |
|---|---|---|---|---|
| **Cape Heth** | `0xbdcfd0` | `0xc2bda9` | **.0034** | twenty-one hex edges of open water, more maritime than anything in the block: the West Meroshe's argument (.0032, ten ocean edges) taken twice as far |
| **Dinelv Highlands** | `0xc6d6cd` | `0xc8bc9a` | **.0021** | **the clearest air in Azhora**, and it is altitude rather than dryness: what a hot-desert upland has less of than a hot-desert floor is dust. The West Lotharn's argument (.0027 at five hundred metres) run in a desert |
| **Hama** | `0xb4c8d2` | `0xb9bdb0` | **.0052** | the one country in the block whose air is properly wet, and it earns it twice: nine `Csb` hexes and nineteen ocean edges. **Thicker than the South Meroshe's fog belt**, which was the block's record, with a sky that is blue rather than bleached |

**Two new dialects and one adjustment, and all three are the lore's own words rather than a builder's
guess.**

* **The Dinelv Highlands get `plateau`**, which the lore describes in more detail than it gives any other
  dialect in the archive, down to a named phonemic contrast: "their dialect sits closer to the canyon
  communities' speech than to the Coastal Trade Moreshi of the city. The [r]/[ʀ] distinction that the
  canyon traditions maintain is preserved in the highland dialect… Coastal Maroshi scholars… classify it
  as transitional between canyon and coastal registers, which is accurate as a description and tells one
  nothing about how the highland speakers understand their own speech." It is called `plateau` and not
  `highland` because `highland` is already the Izoli one.
* **Hama gets `haman`**, which `hama.md` names in its own tags as the "merchant dialect" and describes in
  a paragraph: Coastal Trade Moreshi pushed further in one direction only, into contract grammar that
  "requires a specialist to interpret if the reader's background is standard Dinelv administrative
  Moreshi". **The register the lore is about belongs to the Council of Merchant Houses and is not
  built**; what the dialect is here is the speech of the corner.
* **Cape Heth is the adjustment, and the lore states the problem itself.** `cape_heth.md` spends four
  paragraphs saying who these people are *not*: "They are not related by language or cultural tradition
  to the Boueni, despite the cape's position at the cold-current margin; they are a southwestern Azhoran
  coastal people, related by language and material culture to the communities of the Alezhor coast and
  Ibenale to the north." So the tongue wanted here is the Alezhor coast's — and Alezhor is not built, has
  no lore file of its own and has no entry in `LANGUAGES`. The rule `REGION_LANGUAGE` sets for that case
  is to map it to the nearest tongue the lore calls a parent or a neighbour and say so in the comment
  rather than invent a language, so the cape carries **plain Maroshi with no dialect**, marked as a
  stand-in. **`boueni` is explicitly not used**, because the file it would have come from spends four
  paragraphs saying it would be wrong. Whoever builds Alezhor or Ibenale should revisit that line first.

---

## The lore, adjusted to the atlas

Applied **in place** in `world-builder/azhora_lore/geography/regions/` (the write was allowed; nothing
staged, committed or stashed there). Nine claims across three files.

**`cape_heth.md`** — four:

1. **"The formation extends perhaps fifteen miles inland from the cape point before it transitions into
   the forested terrain that characterizes the coastal zone between the Alezhor gold-coast rivers and the
   Bouén cold-water system"** → the atlas gives the cape eighteen `plains` hexes and `BWh` on every one,
   with the Ganesh Desert east and the arid Dinelv Highlands south-east. It transitions into the driest
   country in Azhora and the nearest forest is the Ibenwood belt a long way north.
2. **The Heth Bight is on the north, not the east.** The cape runs west and the mainland shore runs away
   north-east from its landward end, so the angle is the wedge between them; the cape's east is land.
3. **The vegetation paragraph has temperate trees on it** — "the inland trees… are broadly
   temperate-character" — and there are no trees on a `BWh` cape. Adjusted to what a hot desert with the
   sea on three sides of it carries, with the soil gathered in the lee hollows.
4. `related:` — the atlas gives it the Ganesh Desert and the Dinelv Highlands, which the list did not
   have. Added; the maritime relations kept.

**`dinelv_highlands.md`** — four, and one addition:

5. **"the Dinova Peninsula rises from its eastern coastal strip"** → the sea is **west** and south-west.
   Cape Heth is the coastal strip across eight hex edges, and on the plateau's own south-western corner
   there is no strip at all: six hex edges stand straight over open ocean.
6. **"the most dramatic terrain on the eastern peninsula"** → the **western** peninsula, and on that
   south-western corner it is a sea cliff: measured, ninety-seven metres above the waterline fifty metres
   inland of it.
7. **"crosses it from roughly north to south, aligned with the peninsula's long axis"** → the atlas gives
   the axis a bearing, north-north-east to south-south-west at about thirty degrees west of due south,
   and read on that bearing the map resolves into six strike rows with the `plains` hexes in the gaps.
   The lore's "roughly" carries it; the sentence is annotated rather than replaced.
8. **The three `mountain` hexes are not in the lore at all.** Added: the only three hot-desert mountain
   hexes on the map, flat-topped residual blocks with sides too steep to walk, and the ground the
   ridge-exposure mines are cut into.
9. `related:` — it listed a `meroshe_desert.md` that does not exist (job 2 found this; the file is
   `moroshe_desert.md`). Corrected to the atlas's neighbours; **the file itself was not renamed**, which
   is the user's call and which job 2's brief also declined.

**`hama.md`** — two:

10. **"The eastern face of the peninsula runs along the Iberos Sea"** → at Hama itself the two coasts that
    converge are the **western** and the **southern** ocean, both open water, nineteen hex edges. Hama's
    own eastern neighbours are the three Meroshe deserts and nothing else. The Iberos face and Dinelv's
    harbour are north and east of here.
11. **"The agricultural territory around Hama is limited. The coastal strip at the peninsula's tip is
    narrow"** → the atlas is more generous than the file: nine of nineteen hexes are `Csb` `grassland`.
    The strip is narrow in the sense that matters, two hexes deep, and it is also very nearly half the
    country. Adjusted, with the dry winter beds stated.

---

## Registration

`scripts/build-region-survey.mjs` PLAYABLE + `WINDOW.minQ` −45 → −49 → `node scripts/build-region-survey.mjs`
(LAND_HEXES unchanged at 2,078) ·
`src/world/terrain/region-layout.js` PLAYABLE_REGIONS + three REGION_BIOMES ·
`src/world/terrain/region-world.js` REGION_IDS 40–42, three REGION_TERRAIN (five profiles between them), three
REGION_TEXT (subtitle, spawn, description, palette with the three skies, `npcIds: []`, seventeen
landmarks between them) ·
`src/content/regions/southwest/southwest-world.js` (`WEST_EDGE_REGIONS`, the three climates, `COAST_HEX_DRY`, `westEdgeShare`, the
spine, the hollows, the spray, the bedding, the six ridges, the four gaps, the four basins, the three
mesas, the four channels, the ascent, `hamaGreen`, the broken ground, the three winter beds, five ground
colours, seventeen landmarks) ·
`src/content/regions/southwest/southwest-scenery.js` (the third pass) ·
`src/content/regions/southwest/southwest-wildlife.js` (thirteen zones) ·
`src/gameplay/skills/languages.js` (two new dialects, `maroshi.dialects`, three `spoken` entries) ·
`src/dev/tools/developer-atlas.js` (three anchors, one middle hex each) ·
`src/ui/map/map-fog.js` (seventeen areas) ·
`src/dev/tools/build-status.js` (three `early` entries) ·
`src/content/regions/western-regions/west-regions.js` (`WEST_REGION_NAMES`) ·
`src/main.js` (ten review views) ·
`tests/southwest-world.test.js` · **`tests/own-sky.js` (new)** · the guard files above ·
this report · `docs/design-answers.md`.

`src/world/terrain/region-levels.js` already carried all three (5, 5, 2) and was not touched.
`src/content/chapters/civil-war/campaign-world.js` already had their one-line designs and was not touched.
`package.json` already lists `tests/southwest-world.test.js` and was not touched.
`src/content/regions/western-regions/west-ground.js`, `src/world.js` and `src/world/terrain/world-terrain.js` needed nothing: the new landforms go
through `southwestGround` and the new colours through `southwestTint`, both of which job 1 hooked into
the chain and job 2 fixed. `scripts/build-region-rivers.mjs` needed nothing: none of the three has a
river edge on the atlas.

---

## Tests

Everything was run with `node --test tests/<name>.test.js`. **`npm test` was not run**: the script
exceeds the Windows command-line limit on this machine.

**`tests/southwest-world.test.js`**, extended from eighteen tests to **twenty-seven**, all passing. The
nine new ones are: the three countries and their three firsts; Cape Heth's one ridge and two sides; the
escarpment and the bedding; the strike rows, the gaps and the tables; the one way up and the flood-fill
proof; the fan heads lifting; Hama's line measured on the ground; the thirteen ranges; and the
registration. Ten of job 2's eighteen were rewritten for three jobs.

**The brief's list.** Everything passes except the pre-existing failures the brief names.

| test | |
|---|---|
| **southwest-world** | **27 / 0** (eighteen before, nine added) |
| mithala-world | 14 / 0 *(after its width and `minX` guards were moved)* |
| west-lotharn-world | 10 / 0 *(after its `minX` guard)* |
| west-lotharn-peaks | 6 / 0 |
| east-lotharn-world | 12 / 0 |
| oves-world | 13 / 0 |
| gala-world | 11 / 0 |
| ascarth-world | 10 / 0 — untouched: nothing north or south moved |
| eer-world | 12 / 0 *(after `OWN_SKY` became one shared list)* |
| isareos-world | 9 / 0 *(after its width guard)* |
| nethereum-world | 9 / 0 *(after its width guard)* |
| izol-world | 9 / 0 — untouched: it pins the southern edge |
| feradom-world | 14 / 0 |
| region-layout | 8 / 0 *(after the width guard was moved; job 2's permanent PLAYABLE guard passed untouched)* |
| region-survey | 4 / 0 *(after a stale ratio became a stale-proof statement)* |
| regions-world | 9 / 0 |
| developer-atlas | 8 / 0 |
| map-fog | 7 / 0 *(after four of the seventeen new areas were moved apart)* |
| region-sky | 6 / 0 *(after `OWN_SKY`)* |
| languages | 16 / 0 |
| region-levels | 4 / 0 — untouched: it already carried all three |
| open-country | **passes untouched**, which is the fourth time running |
| drawn-ground | 4 / 0 *(after two landmarks moved — see below)* |
| town-life, closed-border, climbing, terrain-fall, cartography, west-rivers | all pass |
| **south-suval-world** | fails on the Stillwater, 12 / 1 — named by the brief, untouched here |
| **regional-wildlife** | fails on the `Iscare Archipeligo` line, 7 / 1 — named by the brief |
| **amod-world** | fails on `WORLD_BOUNDS.minZ`, 8 / 1 — a guard about the *northern* edge, which nothing here touched; job 2 proved it against its own base |
| **elagos-world**, **campaign-world**, **chameleon** | the brief's other pre-existing failures |

**`drawn-ground` failed twice and both are the world box, not a landform.** Growing the world west
shifts every vertex of the renderer's coarse band, and two landmarks that had been standing within a
hand's breadth of the limit went over it. **This is the same failure job 1 met when it grew the world
west the first time** and fixed the same way:

* **`alezhor-water`** (job 1's, on the Navarth bank) — 1.56 m buried against a limit of 1, standing on a
  bank the 7.1 m grid cannot follow. Measured, four metres further from the water reads −0.02, so its
  offset went from 26 m to 30;
* **`dromel-gate`** (Amod's) — 1.14 m buried. `DROMEL_GATE` is a built structure with a collider, a
  mesh and a clearing, and it sits on the Dromel channel's own point, so **the gate did not move**: the
  *label* moved one metre north-east onto the bank a traveler stands on to look at it, where the burial
  is 0.29. Nothing else in Amod is touched.

**`west-life`, law by law**, run one law at a time as jobs 1 and 2 did:

| law | |
|---|---|
| no band is given a range it can run out of the reach of | **passes**, with all thirty-seven of the block's ranges in it |
| the river fox never flees, keeps arm's length from a walker | **passes** |
| nothing in the west can be walked down | fails on **`elagos-meadow-cattle`**, walked to within **0.34 m** — job 1's and job 2's figure to the centimetre |
| the quick ones cannot be run down either | fails on **`feradom-country-17-98`**, run down in **25.5 s** — job 1's and job 2's figure to the tenth of a second |
| a chased band is home again in a few minutes | **`oveth-herons`** by every earlier report; not re-run, for the reason job 2 gives — it costs about twenty minutes and its name was not captured in job 2's run either |

**Both of the failures that were re-measured came back as job 1's and job 2's own figures to the
digit** — 0.34 m and 25.5 s — which is as good a proof of "pre-existing" as this suite gives, and
**not one of job 3's thirteen ranges is named in either.**

**The coverage gap the brief names is still open and job 3 did not close it.** Each chase law asserts
*inside* its loop over the bands, so it stops at the first failing band; this block's zones are appended
last in `WEST_LIFE_ZONES` and all three failing animals come before them, so **laws 3, 4 and 5 have
still never exercised a single southwest range.** What stands behind these thirteen is the reach law,
which does pass and does cover every band, plus the site checks in `tests/southwest-world.test.js`: every
range's half-diagonal is 57–96 m against a reach of 130, every home is dry, standable, its own country's
by both `regionAt` and `hexOwnerAt`, off every water surface and every dry bed, with a four-metre step
under 1.5 m; there is no stock; and the two animals a law would have caught — the river fox, which never
flees, and the canyon tortoise, which can be walked down — are both deliberately absent.

---

## The stale lists that were found and moved

**Eight files and ten assertions**, and four of them are the same mistake for the third time.

1. **`tests/region-layout.test.js`** — the world-box width guard, `< 46` / `> 45.6`, now **`< 50` /
   `> 49.6`**, with Cape Heth's case stated and the window measurement recorded.
2. **`tests/isareos-world.test.js`** — `wide > 45.6 && wide < 46`, now 49.6–50.
3. **`tests/nethereum-world.test.js`** — the same guard, the same move. **This pair has now been found
   together four times** (West Lotharn, Mithala, job 1, job 3).
4. **`tests/mithala-world.test.js`** — *two in one file again*: `|wide − 45.70| < .01` and
   `minX === −3960.0019279391277`. Job 2 moved this file's height guards and left its width and `minX`
   ones, correctly, because nothing west had moved. Something west moved.
5. **`tests/west-lotharn-world.test.js`** — `minX === −3960.0019279391277`. Job 1 wrote this line and job
   2 left it alone for the same good reason.
6. **`tests/region-survey.test.js`** — *not named by any brief*, and a real stale list rather than a
   number: `LAND_HEXES.length > playable cells * 2`. The ratio falls every time a country that was
   somebody's horizon becomes playable, and the southwest has done that eleven times; it is 2,078 against
   1,099 — **1.89** — and it will keep falling. The line's *purpose* is that the window reaches past the
   playable regions so the coast field knows where the Stills begin, so it now says that: several hundred
   land hexes in the window that no playable region claims (there are 979).
7. **`tests/map-fog.test.js`** — not a stale list but a rule job 3 broke four times and had to measure
   against: two charted areas must stand more than 0.6 × the larger radius apart, and four of the
   seventeen new ones overlapped. All four were moved and re-measured.
8. **`tests/southwest-world.test.js`** — its own box, window, seam, rib, landmark-count, aridity and
   wildlife assertions, thirteen in all, rewritten for three jobs.

### `OWN_SKY` is one list now, which is the permanent guard job 2 asked for

Job 2's open question 7: "`OWN_SKY` is still two copies. Four builders in a row have now found the same
pair of allow-lists in `tests/region-sky.test.js` and `tests/eer-world.test.js` and extended both. It
wants the treatment the 'last N in the list' idiom just got: one exported constant, imported twice."

**`tests/own-sky.js`** is that constant, imported by both. Adding a country with its own sky is one line
there; forgetting it turns both tests red with the country's own name in the message. Both files pass with
the shared list (region-sky 6/0, eer-world 12/0), and the count is now twenty-seven countries.

**Job 2's own permanent guard did its job.** `tests/region-layout.test.js`'s invariant — PLAYABLE_REGIONS
in strictly increasing `REGION_IDS` order, ids 1..n with no gaps, the survey's `PLAYABLE` the same set —
caught nothing to fix, because there was nothing to fix: appending three countries at the end passes it,
and **no file in this build needed a "last N in the list" idiom rewritten.** That is the fifth generation
of that mistake not happening.

---

## Review

**Three hillshades** are in `tests/artifacts/`:

* `southwest-edge.png` — all three countries and their horizon, `MAP_LO=0 MAP_HI=200 node
  scripts/region-map.mjs -4380,1540,-2880,3190 2`, with white dots on the point, the escarpment, the
  tables, the north pass, Hama's line and its corner;
* `southwest-cape.png` — Cape Heth alone at 1.4 m a pixel, `MAP_LO=0 MAP_HI=26`, because at the
  plateau's range the cape is black;
* `southwest-hama.png` — Hama's corner at 1.4 m a pixel, `MAP_LO=0 MAP_HI=30`.

What they show, and what was checked against them:

* **the block reads as one high mass between two low ones**, which is exactly the shape of the job:
  the Dinelv plateau is a bright rounded mass in the middle with Cape Heth running away north-west
  from it as a dark low finger and Hama a dark low corner in the south-east, and there is open water
  on three sides of the picture;
* **the three tables show as three red rings** — the climbing rule's own too-steep marker — and
  nothing else on the plateau is red, which is the flood fill's result drawn as a picture: everything
  inside the rings is unreachable and everything outside them is not;
* **the sea cliff shows as a red band down the whole south-western shore**, where the plateau meets
  open ocean with no coastal strip under it. It is the only place in eleven countries where the red
  and the waterline touch;
* **the ridge systems read as faint parallel stripes** running north-north-east to south-south-west
  across the plateau, with the four gaps as darker patches on them. They are faint because ten to
  fifteen metres of crest under a hundred and ninety metres of table is faint, which is correct;
* **the escarpment's red ring is not closed**: it breaks on the northern margin, and the break is the
  North Pass;
* **the cape is low and lobed and its spine shows**, on its own range: a dark finger reaching west into
  the water with a pale ridge down the middle of it, the drainage hollows as darker patches on the
  landward flank, and the plateau's red escarpment filling the right-hand side of the frame;
* **Hama's two halves show as two textures.** On its own range the inland half is a fine diagonal
  corrugation — `hamaBroken`'s two turned bearings — and the seaward half is smooth, and the line
  between them is where the stripes stop. The two coasts converging at the corner are the whole
  bottom-left of the picture.

**Three rounds of review views, and the first round changed six things.** All ten were photographed with
`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=..."` after the last
scenery change, with no errors: `southwest-heth-point`, `southwest-heth-weather`,
`southwest-heth-hollow`, `southwest-dinelv-scarp`, `southwest-dinelv-tables`, `southwest-dinelv-ridges`,
`southwest-dinelv-pass`, `southwest-hama-line`, `southwest-hama-grass`, `southwest-hama-bed`. They are
in `src/main.js` and every one is worked out from its own landform's numbers — the spine's axis, a
hollow's centre, a table's reach, a gap's point, the ascent's line, a bed's points — so a view cannot
drift off the thing it shows. Images: `tests/artifacts/southwest-*.jpg`.

**What the first round caught:**

* **the ground came back pale tan across all three countries**, which is job 2's lesson met a second
  time and from the other direction: job 2 had to darken because a near-white haze ate the ground, and
  job 3 had to darken because the renderer reads an authored colour as linear and lifts it a long way,
  so a plateau authored at `#6b6450` photographed as sand. Everything went about a third down — the
  three biome grounds, the five profile swatches, all five new tint colours and eleven scatter tints —
  and the warm stone furthest of all (`0x6f5c3c` → `0x53422a`), because mixing a warm colour into a
  ground at up to sixty per cent pushes a whole country orange;
* **the three tables photographed as rounded domes.** The first profile put the full lift inside forty
  metres of an eighty-eight-metre reach, which is a hill; the fall is twenty-six to thirty metres of
  run for fifty-five to seventy-four of lift now, which is a cliff;
* **the bedding did not show at all.** At period 15 and amplitude 1.1 the courses were invisible on the
  mesa flanks and on the escarpment; at 16 and 1.9 (ratio 0.746, still monotone) they are benches a
  traveler can stand on with risers between them;
* **Hama's sward read as bare ground.** Two hundred and fifty tufts a hex — the Mithala plain's own
  density — is not a sward at a low angle across a wide view. It is four hundred now;
* **three cameras were pointed past their subjects.** The line view looked three hundred metres past
  the line and photographed the open ocean with a strip of grass in the corner (the shore is only
  eighty metres past it, measured); the grass view focused a hundred metres out to sea; and the point
  view focused a hundred and twenty metres past the headland, so the coast field's own beach filled
  three quarters of the frame. All three are aimed at their own landmark now, and the point's took a
  third round: it looks **across** the point from the north-east, so the water is on both hands;
* **the bed view had no bed in it**, because it looked from the *mouth* of the middle winter bed, which
  is exactly where the shore release has taken the cut back out again. It looks up-bed now.

**What the final set shows:**

* **the North Pass is the best picture in the job.** A graded swale running up between two ridges with
  the bedding showing as stepped benches on both walls, a table standing over the head of it on the
  right, and the basin's thorn trees just visible where the ramp tops out. It is a picture of a route,
  and it explains in one frame why a plateau with an escarpment all round it has one way up;
* **the tables read as tables.** Dark olive-brown blocks with a distinct riser band across them, cliff
  blocks scattered down the flanks, and a flat top with the courses running round it at the same
  heights they run along the escarpment;
* **the plateau reads as a desert upland and not as a mountain.** Spaced scrub, bare rock along the
  crests, nothing standing anywhere except a handful of thorn in the basins, and the tables on the
  horizon;
* **Hama reads as green, which nothing else in the block does.** Grass tufts across a green sward with
  a strip of sea beyond it, stony ribs on the inland horizon, and a band of bleached stubble where the
  two meet. It is the first frame in two hundred and seventy-five hexes with more plant than stone in
  it, and that is the whole point of the country;
* **the weather face is the picture of Cape Heth**: bare bedded sandstone running down to a beach and
  then open water, with salt crust in the rock hollows and nothing growing for eighty metres up from
  the surf. **And the point photographs almost the same picture from ninety degrees round**, which was
  worth three tries to find out and is the country's own finding rather than a defect in the camera: the
  lore insists this cape "is not a dramatic geographical feature in the mode of high cliff headlands or
  bold rocky outcrops", and ground that low and that even looks the same from every bearing. The
  hillshade is the better picture of the cape's *shape*; the two ground views are the better picture of
  what standing on it is like;
* **the winter bed is the weakest of the ten.** A metre and a half of soft-banked cut in green grass
  photographs as a shallow swale, and at the scale the camera can stand at it is hard to tell from the
  ordinary roll of the ground. The bed's own colour does the work that its shape cannot.

---

## Open questions

1. **A prediction about the survey window is not a prediction about the world box**, and three briefs in a
   row have made that substitution. Job 4 should assume nothing: Marosh is q −26…−22, r 127…135 and Trogo
   q −30…−23, r 136…142, and job 2's arithmetic for Trogo (southern edge to about **3264.4**, another 0.87
   hexes of height) is the number to check rather than trust. **Nothing in job 4 can move `minX`** — Cape
   Heth's −4360.002 is eleven hundred metres west of Trogo's westernmost hex — so the six width guards
   moved here should hold.
2. **The Ganesh dustback is still not built and it is still the user's decision.** Three jobs have now
   declined it for the same reason: the lore names it, gives it an economy and a social meaning, and never
   describes its body, and the only dustback the lore describes is a domestic bovid. **It is also the
   animal this quarter most wants**, and job 4 builds Marosh, whose own lore hangs on the same herds.
3. **The canyon tortoise now has a home and still cannot be built.** The Dinelv basins are literally the
   "desert seeps and seasonal wash vegetation" the overview gives it. What stops it is
   `tests/west-life.test.js`'s first law — nothing in the west can be walked down — and the honest fixes
   are an exemption list (the cattle already fail the law) or a burrow to go into. Both are design
   decisions. **Job 4's Trogo is the last country in the southwest that could want it.**
4. **`groundTint` should be a table and not an `if/else` chain**, which is job 2's question and is now
   more urgent, not less: job 3 met the same failure mode one level down, where the Meroshe's `return`
   inside `southwestTint` would have thrown the plateau's colours away on the three hundred metres where
   the two boxes overlap. The failure is silent every time — nothing throws, nothing looks broken, and a
   country just quietly has no colour. **Whoever adds the sixth branch should turn the chain into a list
   of `(inBox, tint)` pairs walked in order.**
5. **Cape Heth speaks a stand-in.** Its own lore file names the Alezhor coast and Ibenale as its
   linguistic kin and spends four paragraphs ruling out the Boueni; neither of those countries is built
   and neither has a tongue in `LANGUAGES`. The cape carries plain Maroshi and says so. **Whoever builds
   Alezhor or Ibenale should revisit that line first**, and it is the only `spoken()` entry in the block
   that is a placeholder rather than a reading.
6. **The tables cannot be walked up, and that is a decision rather than an oversight.** Three of
   thirty-five hexes are unreachable on foot, which is what a cliff-sided desert mesa is, and Dinelv is
   not one of the game's four climbing regions. If somebody wants the tops, the honest routes are a ramp
   cut slantwise across one flank (the West Lotharn's own machinery) or adding the plateau to
   `CLIMB_REGIONS`. Neither is a builder's call.
7. **The outland rib has one job left to live.** 7.99 m at the worst margin point, and the two unbuilt
   neighbours that produce it — Marosh and Trogo — are both job 4's. After that the southwest has no
   unbuilt neighbour but the Ibenwoods, and the rib is a `relief()` problem for whoever takes it on
   world-wide.
8. **The block is still an island and it is bigger.** Two hundred and seventy-five hexes over eleven
   countries and no way in but F8 until the Ibenwood belt is built. Job 4 adds two more.
9. **Nothing is built at any of the three passes, and the lore puts a garrison at two of them.** The
   northern plateau pass and the middle saddle are ground; the road surface, the cisterns, the waystation
   and the tariff inspection are the Maroshi court's, and so is the city of Dinelv at the foot of the
   escarpment — which is a region on neither the atlas nor the survey and has nowhere to go. Whoever
   builds the Maroshi inherits that.
10. **What job 4 needs to know about Hama and the South Meroshe.** Marosh is Hama's climatic cousin —
    `Csa` × 10 + `Csb` × 8 on job 1's reading — and it borders the North Meroshe (7 edges), the Central (8)
    and the South (3), so **building it will wet the Meroshe's eastern hexes the way Hama wetted its
    western ones**: expect the four exceptions in job 2's flat 1.000 to become eight or ten, and expect
    the `green shoulder` landmark on the hamada's north-eastern corner, which job 2 wrote as a promise
    about unbuilt country, to come true. Trogo borders the South Meroshe across thirteen edges and is `Af`
    tropical rainforest, which is a bigger climate step than anything the block has met; `merosheFog`'s
    `landFrom`/`landTo` were written to build toward exactly that margin and should need nothing, but the
    **fog belt's own aridity is the thing to re-measure**, because a rainforest one hex away will pull the
    South Meroshe's south-eastern hexes much further off 1.000 than Hama pulled its western ones.
