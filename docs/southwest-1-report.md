# The southwest, job 1 of 4: the build report

Built 2026-09-30 on branch `southwest-1` (worktree `azhora-game-southwest`, from `mithala` 599d192),
to `docs/southwest-1-brief.md`. **Terrain, climate, water, scenery and wildlife, and nothing that
belongs to anybody.** Pyros the empire and both its halves, Gala on its terraced ground above the
great river, the Fire Memory with its fumarole sites and its ceremonies and its priests, Navarth's
surrogate fires and its pilgrimage and its grey sheep, the caravan crossing of the Ganesh with its
waystations and its water points and the Route Registry at Dinelv that issues the crossing guidance,
the pastoral communities who read the drought cycle and move by it, the northern markets and Ganesh
Ford at the head of them, and every animal any of those people own: none of it is built. Left
uncommitted, as the brief asks.

**A hundred and seven hexes across four countries**, and three things made this job different from
every one before it. All three came out where the brief said they would.

1. **None of the four touches a built country.** The block is an island, reachable by F8 travel and
   by nothing else until the Ibenwood forest belt is built.
2. **The world box grew west**, from 36.20 hexes wide to **45.70** — more than anything has spent in
   that direction — and the survey window with it, `WINDOW.minQ` from −33 to **−41**.
3. **The climate is not what the brief expected, and it is a gradient.** Eighty-one of the hundred
   and seven hexes read **`BWh`**, hot desert. **This is the first true desert in the game**, and
   the first block whose climate varies across it in a way that is the country's own shape.

---

## What the atlas gave

| | **Navarth** (32) | **West Pyros** (33) | **Ganesh Desert** (34) | **Ganesh Plain** (35) |
|---|---|---|---|---|
| authored hexes | 22, q −28…−23, r 116…122 | 27, q −25…−21, r 116…125 | 31, q −33…−27, r 120…126 | 27, q −28…−22, r 123…127 |
| terrain | **hills 10**, plains 11, **forest 1** | plains 26, **grassland 1** | plains 31 | plains 26, **grassland 1** |
| climate, per hex | **`BWh` × 20**, `Csb` × 2 | `BSh` × 18, **`BWh` × 7**, `Csb` × 1, `Csa` × 1 | **`BWh` × 31** | **`BWh` × 23**, `Csb` × 3, `Csa` × 1 |
| world extent (hex centres) | x −3550…−3200, z 895…1415 | x −3150…−2550, z 895…1674 | x −3850…−3250, z 1241…1761 | x −3200…−2600, z 1501…1848 |
| neighbours by shared edge | West Pyros 13, Ganesh Desert 11, Ganesh Plain 1, South Ibenwood 5, Alezhor 5, East Ibenwood 3 | Navarth 13, Ganesh Plain 15, East Pyros 20, Nether Desert 1, East Ibenwood 1, sea 2 | Navarth 11, Ganesh Plain 6, Dinelv Highlands 10, Cape Heth 5, Alezhor 3, **sea 9** | West Pyros 15, Ganesh Desert 6, Navarth 1, North Meroshe Desert 10, Dinelv Highlands 4, Marosh 3, sea 1 |
| authored rivers | 5 `small` edges on the Alezhor border | **20 edges, `small`→`medium`→`large`, the whole eastern border** | 3 `small` edges on the Alezhor border | none |
| level | 4 | 3 | 4 | 3 |

Every one of those numbers was read off the survey rather than copied from the brief, and
`tests/southwest-world.test.js` re-derives them. `src/world/terrain/region-levels.js` already carried all four
(4, 3, 4, 3) and was not touched.

**The three odd hexes are the block's three features, and every one of them is also one of its
wettest.** The one `forest` hex, (−24,116), is `Csb`; both `grassland` hexes, West Pyros's (−21,125)
and the Ganesh Plain's (−22,126), are `Csa`, and both are one hex from the southern sea. The
atlas's terrain field and its climate field agree with each other here, which is why those three
carry features rather than bands — the way the West Lotharn's one `Dfa` hex became its cold head.
The test asserts the agreement.

---

## The climate read, which is the most surprising thing in this job

Read per hex from the World Builder map (`world-builder/map/resources/examples/azhora.wwmap`,
`hexes[key].climate`, `koppen-v1` — **not** `azhora.cmap.json`, whose one-code-per-region field is a
default and says `Cfb` for almost everything). `SOUTHWEST_CLIMATE` in `src/content/regions/southwest/southwest-world.js`
records all 107 and the test holds them to the map hex for hex whenever the map is on the machine.

**`BWh` × 81, `BSh` × 18, `Csb` × 6, `Csa` × 2.**

`BWh` is hot desert. **Nothing built before this has been drier than `BSh`**, and the Oves Desert's
own report made a point of it: "the map's author had `BWh` available for true desert and used it 245
times elsewhere; not here." He used it here, over three whole countries, and the Ganesh Desert's
thirty-one hexes are the first country in the game with hot desert on every one of them.

**And unlike the Oves and the Mithala there is a gradient, and it is the block's shape.** Read down
the columns rather than across the rows:

* in **West Pyros** and the **Ganesh Plain** the codes change with `q` and not with `r` — from east
  to west. West Pyros is `BSh` on its three eastern columns beside the river and `BWh` on its two
  western ones against Navarth; the Ganesh Plain is `BWh` across and `Csb`/`Csa` on its one
  easternmost column;
* in **Navarth** they change with `r` — `Csb` on its two northernmost hexes and `BWh` on the other
  twenty, a hard line in one row;
* the **Ganesh Desert** is one code and has no gradient in it at all.

So: **aridity increases westward and inland, with two green corners.** The northern one is Navarth's
north-eastern tip, where the Ibenwood's southern edge reaches in; the southern one is West Pyros's
tip and the Ganesh Plain's south-eastern corner, where Marosh's country and the southern sea begin
together. For context the whole quarter agrees: East Pyros next door is `BSh` × 29 + `Csb` × 3 +
`Csa` × 1 with its own green southern tip; Alezhor over the northern border is `Csb` × 25; South and
West Ibenwood are `Csb` throughout; Marosh over the south-eastern border is `Csa` × 10 + `Csb` × 8,
with `Af` tropical forest in Trogo beyond it; and everything west and south — Cape Heth, the Dinelv
Highlands, the three Meroshe deserts — is `BWh` like the Ganesh.

`southwestAridity(x, z)` blends the hex codes on the ground's own falloff (reach 1.28 hexes), so the
climate changes over a hex and never at a hex edge. Measured over the whole block on a twenty-metre
lattice, the steepest change anywhere is **0.157 in twenty metres**, at (−2750, 1870) in the Ganesh
Plain's south-eastern corner — which is where the map itself puts `Csa` against `BWh` one hex apart.
There is no discontinuity. Gala's three bands are the precedent and the Oves's flat `BSh` is the
counter-example; this is the third country in the game with a climate that varies inside it and the
first where the variation runs the width of four countries.

**What `BWh` changed** is everything about what grows, and it is set out under "What grows" below.
The short version: the Oves Desert's dry-year face was already the model, and this is a full climate
step past it.

---

## The world grew west, and every number that moved

### The measurement

`worldBoundsFor` over the thirty-one playable regions plus these four:

```
before   x -3010.001927939127 … 609.9980720608719   z -2167.195996001615 … 2398.401076758503
after    x -3960.0019279391277 … 609.9980720608719   z -2167.195996001615 … 2398.401076758503
```

**The Ganesh Desert alone spends it.** Its westernmost hexes are (−33,123) through (−33,126), whose
centres stand at x −3850 and whose outer flat therefore at −3900; the margin is 60 m, so the edge
goes to **−3960.002** and the world from **36.20 hexes wide to 45.70**. Each country's own case,
which is what every guard's comment now states: Navarth reaches −3600 and would have spent six hexes
on its own; West Pyros reaches −3200 and the Ganesh Plain −3250, and neither would have spent
anything the other three did not. North to south nothing moves at all — the whole block lies between
z 837 and z 1905, well inside the box the East Lotharn, the Mithala and the two Ascarths made. **The
world is now very nearly square: 45.70 by 45.656.**

### `WINDOW.minQ`: −33 → **−41**, measured

The coast lattice is laid `COAST_MARGIN` (96 m) beyond the world bounds and snapped to a fixed
phase, so its first column now stands at x = **−4056.002** (it was −3108.002). Sampling the **whole**
lattice — 1,192 × 1,191 = 1,419,672 points — and collecting every hex any sample falls in gives
**q −41…34, r 79…135**. So `minQ` is −41: the last column the lattice reaches, and no slack, the same
rule `maxR` 135 and `minR` 79 were both set by. The westernmost column it reaches is q = −41 on rows
134–135, in the far south-west, because x = W(q + r/2) puts a low q and a high r at the same world x
— the mirror of the fact the Mithala measurement noted about `maxQ`.

The test re-derives it: `tests/southwest-world.test.js` recomputes the lattice's first column from
`WORLD_BOUNDS` and asserts the window stops at the column it reaches.

### What the widened window pulled in

**71 claimed hexes in six countries** turned from sea into land, and `LAND_HEXES` went from 1,864 to
**1,935**:

| | | |
|---|---|---|
| Cape Heth **19** (the whole of it) | Dinelv Highlands 14 | South Ibenal 14 |
| West Meroshe Desert 13 | Alezhor 7 | West Ibenwood 4 |

**None of the 71 is the block's own**: all four countries already lay inside q ≥ −33, so what the
widening bought is entirely the block's horizon. The Ganesh Desert needs it — Cape Heth is its
western neighbour across five hex edges, and without those nineteen hexes the desert would have
looked out on open water where the atlas draws a cape.

### The world-box guards that moved

| file | was | now |
|---|---|---|
| `tests/region-layout.test.js` | `< 37` hexes wide, `> 36` | **`< 46`, `> 45.6`**, with each of the four countries' case stated |
| `tests/isareos-world.test.js` | `wide > 36 && wide < 37` | **`> 45.6 && < 46`** |
| `tests/nethereum-world.test.js` | the same | **the same, moved** |
| `tests/mithala-world.test.js` | `\|wide − 36.20\| < .01`, called "untouched" | **45.70**, and it now says what it always meant: the plain spent none of it |
| `tests/west-lotharn-world.test.js` | `minX = −3010.001927939127` | **−3960.0019279391277**, and the comment now holds three facts |
| `tests/izol-world.test.js` | pins the **southern** edge | untouched: nothing south moved |
| `tests/ascarth-world.test.js` | pins the height and `WINDOW.minR`/`maxR` | untouched: nothing north or south moved, and it does not pin the width |

---

## The ground

### One wavelength, four profiles, and the bases carry the shape

| country | terrain | base | amplitude | wavelength |
|---|---|---|---|---|
| **Navarth** | `plains` | 40 | 1.1 | **320** |
| | `hills` | 58 | 2.8 | **320** |
| | `forest` | 34 | 1.3 | **320** |
| **West Pyros** | `plains` | 26 | .9 | **320** |
| | `grassland` | 12 | .8 | **320** |
| **Ganesh Desert** | `plains` | 20 | .9 | **320** |
| **Ganesh Plain** | `plains` | 22 | .85 | **320** |
| | `grassland` | 14 | .8 | **320** |

**Every profile is on 320**, which is Gala's, the Oves's, the Ascarths' and the Mithala's, for the
reason they all give: `relief()` takes its phase from x / wave, the hex blend mixes the wavelengths,
and a country on another wave shifts the phase of every sine within reach of its border. These four
share **forty-six** internal hex edges, so one wave across all of them is what makes those edges
invisible.

The bases carry the block's shape, because a base blends linearly across a hex boundary and is
therefore already smooth — it is the sine that chirps. Measured on the built ground:

| | mean | range |
|---|---|---|
| Navarth `hills` | **56.97 m** | 44.3 – 66.2 |
| Navarth `plains` | 42.21 | 36.1 – 47.7 |
| Navarth `forest` | 33.34 | one hex |
| West Pyros `plains` | 25.36 | 14.1 – 37.6 |
| West Pyros `grassland` | 6.60 | the river mouth |
| **Ganesh Desert** | **14.20** | **6.2 – 25.4** |
| Ganesh Plain `plains` | 18.70 | 15.8 – 21.7 |
| Ganesh Plain `grassland` | 15.56 | the green corner, and the lowest ground on the plain |

**Navarth is the highest non-mountain country in the game** and the Ganesh Desert the lowest ground
in the west after the coast itself.

### The datum, which the brief asked to be stated

**The block's datum is its two river mouths.** There is no built neighbour to level against, so the
only external fact available is sea level — and this block has two shores. The Alezhor Water reaches
a gulf at the Ganesh Desert's north-western corner (measured, 9.39 m at its last sample, with the
coast field taking it to the water) and the Vaellir reaches the sea at West Pyros's southern tip
(5.78 m). Those are the two places where the world's own sea level is a fact rather than a choice,
and everything above is measured up from them.

**They are also the block's two outlets**, and that is the whole of its drainage: the ground falls
north-west to the first and south-east to the second, and the low divide between them runs down the
eastern side of the Ganesh Plain.

### The falls

* **`SOUTHWEST_TILT`**, one plane over all four countries — five metres of easting over fourteen
  hundred and four of northing over nine hundred and fifty, one in 280 and one in 240 — tilting
  toward the Vaellir's mouth, which is the outlet three of the four use. One plane rather than four,
  for the Mithala's reason: a plane is continuous across every internal border, so none of the
  forty-six internal edges has a step or a change of gradient in it. It is deliberately small,
  because the block's real shape is in its bases and a tilt that competed with those would bury them.
* **`ganeshBasin`**, the Ganesh Desert's own fall north-west to the gulf, thirteen metres, and the
  one landform that reverses the general tilt. It is a **one-sided ramp and not a plane**: nought
  along the desert's eastern margin, where the Ganesh Plain's channels come in and the lore says the
  boundary is diffuse and has no line in it, and its full drop at the shore. So there is no ridge
  anywhere — the two drainages meet at a divide a traveler cannot see, which is what a watershed on
  ground this flat is, and which is the Mithala fen margin's trick for the same reason. Both anchors
  are measured: `to` is the Alezhor Water's own last point.
* **`pyrosFall`**, twelve metres over West Pyros's seven hundred and eighty of northing, so the
  Vaellir has a gradient of its own to run down instead of being forced into one by `WEST_PROFILES`.
  Without it the river would stand level for seven hundred metres and then drop fifteen in the last
  hundred and fifty, which is a waterfall and not a river mouth.
* **`ganeshPlainFall`**, five metres over five hundred, west-north-west into the desert, which is the
  lore's own account of the plain's channels with the direction corrected to the atlas.

### Navarth's swells

`NAVARTH_CRESTS`: ten broad worn crests, one on each of the ten `hills` hexes the atlas gives the
country, **taken as a maximum and not a sum** (which is `ovesRim`'s rule: two crests whose skirts
overlap make one longer swell rather than a hill twice as high). Lifts run 14–15 m on the four along
the western rim above the Ganesh, 9–11 m on the five through the middle and south, and **6 m on the
one at the north-eastern tip**, which is the shoulder above the forest rather than a summit. The
lore's whole account of this country's ground is three phrases — "broad upland sweeps, exposed
ridgelines, the occasional sheltered hollow", on "a high, rolling tableland" — and that is what the
atlas draws: ten `hills` hexes scattered through eleven `plains` ones, not a range and not a rim,
with open ground between every pair. **Nobody has made anything of any of them**: the lore's
surrogate fires stand "in locations that correspond to where fumaroles would be", and a maintained
fire is a work, so there is not one.

### The wind, which is what the Ganesh Desert is made of

"Wind is the defining physical force in the Ganesh", and the lore is explicit about what it makes:
"a surface shaped by wind and by the occasional floodwater that crosses it in the wetter years,
depositing a thin layer of fine sediment over the rocky substrate", with no canyon, no escarpment and
no deep carving anywhere; and "summer winds blow from the north and northwest, hot and desiccating."

So `ganeshStone` is **three quarters of a metre** — the lowest-amplitude landform in the game — on
two turned bearings (one field on one bearing reads as corrugation: the Ascarth plateau's lesson),
plus **a long grain on the summer wind's own bearing**, a two-hundred-metre wave of half a metre
running north-west to south-east across the whole country. The grain is the one thing a traveler
crossing this desert can steer by, and it points at the wind. `ganeshLie` reads the field back on a
nought-to-one scale — 1 where the ground is swept down to grit, 0 in a pocket where the sediment has
gathered a hand deep — and the scatter and the ground tint are both read off it, the way the Oves's
are off `ovesLie`.

### The dry beds

**Two washes in the Ganesh Desert** (`GANESH_WASHES`), cut 1.15–1.35 m with floors of coarse gravel
and **nothing in either of them**: no water surface, no ribbon, no reed, and a traveler walks down
the middle of either as a road out of the wind. Both carry the Ganesh Plain's channels on westward
and **fade out well short of the shore** — measured, the north wash's last point stands 95 m from the
waterline and the south wash's 104 — because a bed that runs once in five years does not keep a mouth
open. The Oves Desert's four dry channels are the same machinery for the same reason.

**The damp reach**, on the south wash between .40 and .62 of its length: the lore's "some below it",
a hundred and twenty metres where the subsurface water is near enough the gravel to keep something
green in the bed. Grey-green scrub standing in a dry bed and **nothing at all to drink**. The lore
puts the caravan waystations at points exactly like this one, at the old water places with worked
stone round them; there is nothing here but the scrub.

**Three channels and eight depressions on the Ganesh Plain**, which is the one landform its lore
gives it: "These channels and their associated depressions are the terrain's most ecologically
significant features... water concentrates in the depressions, plants do better there, livestock do
better there, and the routes across the plain follow the depressions' alignment because they are the
corridors where grass persists longest." The channels are a metre of cut and nine metres across, dry
from one year's end to the next because this is the dry-year face; the depressions are 0.85–1.25 m
below the surface they are cut into and 140–210 m across.

**Two of the three channels run west into the Ganesh and the third runs east to the sea**, and that
was measured rather than chosen. The plain's southern rows do not fall west at all — they rise again
toward the Dinelv Highlands margin — so the only way off them is the way the third one goes. It makes
the divide visible, which is what the lore implies and never quite says.

### The swale

Both of this block's courses are drawn **on a border with a country nobody has built**, so up to two
thirds of the hex blend along them is `outland` at amplitude 6 on a 150 m wave against this block's
own nine tenths on 320. That is exactly the defect the Mithala measured on its west arm (6.79 m of
false fall over a thousand metres), so both courses here get the Mithala's own cure on its own
numbers: within 45 m the ground is the block's designed surface — the blend's base, the tilt, and no
relief at all — coming back to the ordinary ground by 165 m, and letting go at the shore so a
levelled floor is not drawn in the air above the beach. Measured on the built ground over every sample
between a tenth and nine tenths of each course, at twenty, thirty and forty metres off the centre
line and only on the block's own hexes: **the steepest two-metre step on the Vaellir's own bank is
2.23 m** and on the Alezhor Water's **3.52 m** — the second is higher because that course runs along
a border with Alezhor for the whole of its length and its bank is the last row of hexes before the
outland. Both courses fall the whole way with every sample inside its own channel.

---

## The water: two courses, both on a border, both reaching the sea

The atlas draws **twenty-eight river edges** on these hundred and seven hexes and **not one of them
is inside any of the four**: everything this quarter has runs along its edge, which is what a
desert's water is — somebody else's rain going past.

| course | size | from | to | fall | what it is |
|---|---|---|---|---|---|
| **the Vaellir** | small → medium → **large** | (−3050, 866), 20.06 m | the sea at (−2533, 1626), 5.78 | 14.28 | the second great river in the game |
| **the Alezhor Water** | small × 8 | (−3500, 953), 25.19 | the gulf at (−3718, 1194), 9.39 | 15.80 | an exogenous river across a desert |

**The Vaellir is the largest water in the game after the Lizeem.** The atlas draws `large` three
times in the whole world — through Caricas and Eer, which is the Lizeem, and here — and this is the
third. It runs the whole of West Pyros's eastern border, twenty hex edges, growing from a wadeable
gravel head to a hundred paces of slow water, and it is **a wall below its first quarter**, which is
the house rule for a big river (the Lizeem is `fordUntil: 0`, the Isa and the Carica are walled below
their gravel heads). Measured: 56 of 233 samples are ford, and the deep water begins at (−2949,
1080). There is nothing to cross to — East Pyros is not built — so the wall costs nobody anything
today and will be the first thing whoever builds East Pyros has to think about.

**The Alezhor Water is exogenous**, and that is the most interesting thing about it: it rises in the
wet `Csb` grassland of Alezhor, runs west-south-west along Navarth's northern border and then along
the Ganesh Desert's north-eastern one, and reaches the gulf **without gaining anything at all** on
the way. It is small on the atlas over all eight of its edges and is waded anywhere, which is the
only reason Navarth and the Ganesh Desert are joined on foot round the north.

**The names.** `world-builder/azhoran_language_profiles.py` *does* have a `pyrosi` profile — the
first tongue in the west whose profile is actually in the World Builder, where there is no Mithali,
no Ovesi and no Lothi — and `src/gameplay/skills/languages.js` carries it with its lexicon, in which **`vaellir` is
the word for "river"**. So the great river is **the Vaellir**, which is the Pyrosi for the river, the
way an Avon is a river: nothing is coined, the tongue's own word is used. The other is named for the
country it comes out of, which is what `MITHALA_CELDER_WATER` did a quarter of a continent away. The
Ganesh's own name is left entirely alone, because `ganesh_desert.md` is emphatic that it is
pre-Moreshi and that "whoever named this desert named it in a way that no current language on the
peninsula can explain."

**Two shores nobody expected.** The Ganesh Desert's nine unclaimed neighbour edges are five `coast`
hexes and then open water — so **the driest country in Azhora runs out at the sea**, and is as arid a
hundred paces inland of the shore as it is twenty miles in. It is a real thing (a cold-current
coastal desert is what an Atacama is) and it is the strangest picture in this job. West Pyros's two
and the Ganesh Plain's one are the southern sea at the Vaellir's mouth, which is where both green
corners are.

---

## The seams

### The four internal seams — five, in fact

Measured as the steepest two-metre step at points where the blend is **entirely the block's own**
(a point at the end of a seam with outland in it is a rib and not a seam, which the first
measurement got wrong and the second corrected):

| seam | edges | steepest 2 m step |
|---|---|---|
| Ganesh Desert \| Navarth | 11 | **4.24 m** — and all of it is the rim, which is a landform |
| Navarth \| West Pyros | 13 | 3.11 |
| Ganesh Desert \| Ganesh Plain | 6 | 2.76 |
| Ganesh Plain \| West Pyros | 15 | 2.70 |
| Ganesh Plain \| Navarth | 1 | 2.28 |

**Forty-six edges** and nothing over four and a quarter metres, and the one that is over three is the
Navarth rim — twenty to thirty-eight metres of fall over a hex blend, which is what the atlas draws
when it puts `hills` at 58 against `plains` at 20. The test holds every internal seam under 5 m.

### The ribs against the outland, on every margin

Every outer edge of this block is unbuilt: East Pyros, the Nether Desert, the South and East
Ibenwood, Alezhor, Cape Heth, the Dinelv Highlands, the North Meroshe Desert and Marosh. So the ribs
Gala, Ovesos, the West Lotharn and the Mithala all reported are here on **every side**:

| | steepest 2 m step |
|---|---|
| the block \| open country (the whole outside edge) | **9.13 m** |
| *inside the block, blend > .95* | p95 **1.4**, max 2.3 |
| *for comparison:* Mithala \| open country | 4.38 |
| *for comparison:* West Lotharn \| open country | 25.8 |

It is the same defect: `relief()` takes its phase from x / wave, the blend mixes the wavelengths, and
where this block's 320 meets `outland`'s 150 the phase chirps. It sits between the Mithala's (whose
own amplitude is half a metre) and the West Lotharn's (whose is thirteen), which is what an amplitude
of nine tenths to two and four fifths would predict. **The cure belongs in `relief()`/`terrainMix`
and is a world-wide job; the brief said not to chase it, and it was not chased.** Eight unbuilt
neighbours will each take a bite out of it when they are built, and jobs 2–4 will eat four of them.

### And nothing of this block is written on anybody's ground

There is nobody to step on, which is the one simplification this job got: the Mithala needed
`lotharnGate` because its low-threshold landforms reached into a built mountain range, and here every
margin is `outland`. `southwestGround` is exactly the ground it was handed at every point outside its
own box, and the test checks five points across the built world.

---

## What grows

`src/content/regions/southwest/southwest-scenery.js`, one seeded stream of its own drawn after the Mithala's, so nothing
already built anywhere else moves for it. Everything is placed on these four countries' own hexes.

**The whole file is mostly a statement about how little there is**, and that is the Oves Desert's
argument taken one climate step further:

* **the Ganesh Desert** — deep-rooted perennial scrub spaced far enough apart to walk between, which
  in a dry year is nearly all of it ("the above-ground growth is deceptive: a plant that presents as
  a knee-high shrub in good years may have a root system extending several meters in all
  directions"); gravel and grit wherever the wind has swept the sediment off, a skin of fine pale
  sediment where it has gathered, a stubble of bleached annual seed-heads where the wet-year flush
  would be, coarse gravel on the two washes' floors, and one band of green scrub on the damp reach.
  **No dune and no sand sea**: the lore's surface is "a thin layer of fine sediment over the rocky
  substrate", which is a desert pavement and not an erg;
* **the Ganesh Plain** — bunch grass contracted into the eight depressions, which is where it goes in
  a drought phase ("the perennial grasses contract to the water-concentration points, the annuals
  disappear"), with scrub and bare pale clay on the open ground between them, and the south-eastern
  corner green because the climate there is `Csa`;
* **West Pyros** — semi-arid bunch grass in tussocks over the steppe columns, thinning west into
  desert scrub on the `BWh` ones, and a gallery of poplar, willow and tamarisk along the Vaellir,
  thickening southward as the air wets. On a plain this open that is a dark line running from one
  horizon to the other with nothing behind it, and it is how a traveler finds the river;
* **Navarth** — bare scrub on the plateau with the stone showing grey along the tops of the swells,
  and at the north-eastern tip **the north wood**: oak and pine standing well apart on the one
  `forest` hex, thinning outward as the air dries, stopping where the hex does.

Everything is sorted by two numbers and no third: **how dry the air is** (`southwestAridity`, a real
gradient, where the Oves had one code and no gradient at all) and **what the ground is made of** —
which pocket the wind has left sediment in, which hollow holds the water.

**Counts** (`world.southwestMetrics`): 5,527 grass tufts, 3,224 gravel and clay plates on the dry
beds and the ford, 3,151 perennial scrub, 2,876 of desert pavement, 2,480 bleached seed-heads, 949
reed at the two waterlines, 696 stones on the rises, 181 gallery trees and tamarisk, 119 trees in the
north wood, 181 boulders, 2 water ribbons and 1,259 deep-water blockers on the Vaellir. For scale,
the Mithala's four countries carry 26,231 grass tufts over 116 hexes and this block carries 5,527
over 107.

**The ground's own colour** is `southwestTint`, hooked into `groundTint` for these four countries'
swatches only: the atlas says `plains` in all four and means several different things, and what
decides the colour changes over forty metres in the desert where the terrain word changes over a hex.
Four grounds — the wind's swept floor (the driest colour in the game), the sediment pocket, the green
of the wet corners and the depressions, and the damp reach.

---

## What lives there, and why

**Seventeen ranges**, and they are deliberately not spread evenly. `src/content/regions/southwest/southwest-wildlife.js`,
spread into `src/content/regions/western-regions/west-regions-life.js` after the Mithala's.

| zone | species | where | why |
|---|---|---|---|
| `navarth-hares` | upland-hare | the sweeps between the plateau's swells | extension: the west's hare at its dry limit, on the one ground in the block that is open and has something on it every year |
| `navarth-wood-deer` | red-deer | the edge of the north wood | extension: a deer is seen where a wood has open ground beside it, and this is the only wood in 107 hexes |
| `navarth-rim-hawk` | plateau-hawk, 33 m | over the western rim | **not an extension**: the overview's dry-plateau hawk "hunts the upland grasslands" of the rain-shadow country, and this is one |
| `vaellir-otters` | otter | the deep reach below the ford | extension by one river system: the only deep permanent water in the southwest |
| `vaellir-herons` | wading-bird | the bank above the deep reach | extension: the overview's assemblage is the Lizeem's; this is the nearest equivalent water |
| `vaellir-ducks` | duck, floating | the gravel ford reach | the only place in the quarter for waterfowl to be, so a raft and not a scatter |
| `vaellir-mouth-stilts` | stilt | the last silt before the sea | extension: the Mithala's river-mouth stilts on the same ground at the other end of the continent |
| `green-tip-gulls` | gull | the river mouth and the green tip | the block's one hex of `Csa` grass, and the only sea coast in it a traveler can stand on and find anything growing |
| `pyros-hares` | upland-hare | the open plain's bunch grass | extension: the `BSh` columns are the only proper steppe here |
| `pyros-harrier` | harrier, 9 m, quartering | the open plain | extension: 800 m of bunch grass with one line of trees down the side of it |
| `ganesh-bone-birds` | **bone-bird**, 44 m | over the desert floor | the overview's own animal on its own ground |
| `damp-reach-bone-bird` | **bone-bird**, 38 m | over the damp reach | "they are often the first indicator of water" |
| `damp-reach-hares` | upland-hare | the damp reach | **the only animal on the ground in the whole Ganesh Desert** |
| `middle-pan-hares` | upland-hare | the middle depressions | extension: in a drought phase the hollows are the only grass |
| `long-pan-hares` | upland-hare | the western depressions | two bands rather than one wide one, because the open clay between them has nothing on it |
| `ganesh-plain-harrier` | harrier, 9 m | the depression corridors | extension |
| `ganesh-plain-bone-bird` | **bone-bird**, 40 m | the southern plain | the desert margin's margin |

**Seven of the seventeen are on the Vaellir or its green mouth**, because the great river is the only
permanent water in the southwest. **The Ganesh Desert, which is the largest of the four countries at
thirty-one hexes, has three, and two of them are birds in the air.** That is the truthful population
of a country whose own lore says "the Ganesh in a severe dry year presents a surface that appears
essentially lifeless", and it is the Oves Desert's argument taken a step further: a level-4 country
with three ranges was the honest dry-year reading there, and this country is a full climate step
drier. The test asserts that only one of the three stands on the ground.

Every site was measured on the built world — dry, this block's own by both `regionAt` and
`hexOwnerAt`, off the water surface, off a dry bed's floor and standable — and every range's
half-diagonal is between 57 and 119 m against `LIFE_REACH`'s 130.

### The one new rig, and the one not spent

**The bone-bird.** The brief allowed two and only where the lore names the animal; one was spent and
it was overdue. `fauna/azhoran_fauna_overview.md` names it and puts it exactly here: "The large
scavenger of the desert margins is the **bone-bird** — a heavy, bald-headed vulture relative with a
wingspan approaching two and a half meters... Bone-birds are the most visible large animals of the
Moroshé from caravan routes; they are often the first indicator of water." **Both of the game's dry
countries have wanted it and neither could have it**: the Oves report put it in its open questions
and used the turkey-vulture as a stand-in twice over, and the Mithala did the same for its own
soar-bird. The Ganesh is the northern margin of the Moreshe system and is the bird's own ground, so
the stand-in is spent here.

How it is told from a turkey-vulture at any distance, which is the whole of the design: half again
the wingspan (the wing runs to 1.72 against the vulture's 1.43, which at this scale is the two and a
half metres the lore gives it); a **bald head**, pale bone-grey and bare to the shoulders, carried
forward instead of tucked; a heavy hooked bill that is the biggest thing on the head; a pale ruff
where the bare skin meets the feathers; and wings held flatter and steadier than any other soarer's
(`SOAR`: rock .07 and dihedral .11 against the vulture's .16 and .26), because a bird this heavy does
not rock. Everything below the neck is the vulture's own build at a larger size, because it is a
vulture relative and should read as one.

**The second rig was not spent**, and four animals are deliberately absent:

* the **terrace leopard** of West Pyros is a predator of terraced slopes, and the atlas gives West
  Pyros no hills at all and nobody to build the terraces;
* the **road fox** is "associated with caravan routes and settlement edges", which are people;
* the **spine lizard** wants a gait the game has not got (bask long, then dart) and the **sand-cat**
  cannot be built until there is a night for it to be nocturnal in — both were the Oves's open
  questions too and both are still open;
* the **river fox** — the *vel-caric* — is absent by measurement rather than judgement. It is an
  animal of the Lizeem's inner branches and the Vaellir is not in that system; the one river margin
  in Navarth is the Alezhor Water, which runs on a border with unbuilt country, and **measured, the
  widest clear run behind any point of its own bank is twelve metres**. A fox that never flees needs a
  hundred. There is nowhere in this block to put one.

**The Ganesh dustback** is the one the lore names and this build did not build, and it is an open
question below rather than a decision.

**Nothing domestic.** Navarth's whole export is the grey sheep, the Ganesh Plain's whole economy is
the pastoral herds that move by the drought cycle, and the caravan crossing runs on pack animals.
Every one of those belongs to people.

---

## Names, the skies, and the speech

**One name is taken and nothing is coined.** This is the first block in the west whose people's
tongue is in `world-builder/azhoran_language_profiles.py`, so coining was available for the first
time; it was used once, on the one thing that needed it, and the word used is the tongue's own word
for a river rather than an invention. Everything else is the lore's own word (the Ganesh, the Navarth
Plateau, the washes, the depressions) or plain English (the swells, the western rim, the north wood,
the gulf shore, the wind grain, the divide, the green corner, the damp reach).

**Two skies over four countries**, and the first is the first true-desert sky in the game. Navarth,
the Ganesh Desert and the Ganesh Plain read `BWh` over seventy-four of their eighty hexes between
them, and what a hot desert does to the air is take the water out of it: sky `0xc3d4cc`, haze
`0xc6b996`, density **.0024** — the clearest air in Azhora, against the Oves Desert's .0034 and the West
Lotharn's .0027, which is altitude and a different argument. A pale bleached-blue sky and a haze that
is warm dust rather than moisture; both numbers were **set by the render** rather than chosen, and
the reason is under Review below. **West Pyros is the one steppe country of the four** — `BSh` over
eighteen of its twenty-seven hexes, with a great river down its eastern side — so it gets the steppe
sky Gala and Ovesos share, a shade greener and a shade closer (.0036). The case for one sky over all
four would have been that it is one dry quarter; the case for two is that the map draws the line
between desert and steppe down the middle of it, and the game already changes sky across the thirteen
shared edges of Ovesos and the Oves Desert for exactly that reason.

**Two dialects, and both are the lore's.** Navarth and West Pyros speak **`pyrosi`** with a new
`west-pyrosi` dialect, which the tongue entry already described — "West Pyrosi is formal and layered,
and encodes social relationship in the verb... the politeness registers are not optional" — and which
`pyros.md` describes as "a dialect that mixes Mittoli grammar with Pyrosi vocabulary in roughly equal
measure". **Navarth is not given a dialect of its own**, and that is the lore's position rather than a
gap: `navarth.md` makes Navarth's distinctiveness ceremonial and economic and never linguistic, and
its whole project is keeping the heartland's forms exactly — "they are more scrupulous, in formal
terms, about the correct conduct of the fire ceremonies than communities that have live fumaroles to
improvise around." A community that scrupulous about the centre's forms is not the one whose speech
drifts. It is the argument the West Lotharn made for sharing the East's dialect.

The **Ganesh Plain** and the **Ganesh Desert** speak **`maroshi`** with a new **`ganesh`** contact
dialect, because `ganesh_plain.md` is explicit that the plain is not one people and never has been:
"Moreshi-speaking groups... Mittoli-speaking groups from the north... and communities whose mixed
linguistic and cultural character reflects generations of contact between these two traditions at the
plain's geographic midpoint." A single `spoken()` line cannot say "two families meet here", so the
dialect says it. **The Ganesh Desert has no speech of its own** — the same finding the Oves Desert
gave: `ganesh_desert.md` has no language section at all and says the country "is crossed but not, in
the full sense, inhabited" — so it carries the plain's.

---

## The lore, adjusted to the atlas

Applied **in place** in `world-builder/azhora_lore/geography/regions/` (the write was allowed;
nothing staged, committed or stashed there). Nineteen claims across four files.

**`navarth.md`** — six, and the first is the largest lore/atlas contradiction this project has met:

1. **"cold plateau country... Navarth winters are serious... Snow lies for months"** → the map says
   **`BWh` hot desert on twenty of its twenty-two hexes**. Adjusted: Navarth is a high *hot* desert;
   what the altitude buys is the desert's own cold — nights that drop away within an hour of sunset
   and frost on the tops through winter — and not months of snow. Its constraint is aridity.
2. "the northern-facing drainages... eventually reach the Mithala network" → the Mithala is a quarter
   of a continent away to the north-east; Navarth's one course runs **west across the desert to the
   sea**.
3. "a growing season short enough to require careful pastoral management" → short because the water
   runs out, not because the frost comes.
4. "Barley grows on the lower plateau" → barley grows where there is water to put on it.
5. `related:` Vastos, Isareos and the Oremindi are not its neighbours; the atlas gives it the two
   Ibenwoods, Alezhor, West Pyros and the two Ganesh countries.
6. The `cold climate` tag → `arid, hot desert upland`.

**`pyros.md`** — three, and they reverse the file's central claim:

7. **"West Pyros is the greener, wetter, more populated of the two"** and "East Pyros sits in a rain
   shadow" → **the atlas reverses it**. West Pyros has seven `BWh` hexes and East Pyros none; the
   moisture in this quarter comes off the southern sea and the northern forest, so aridity increases
   westward and West Pyros is the drier and more interior of the two.
8. "the hillside terraces of West Pyros... the most productive agricultural land on the continent" →
   **the atlas gives West Pyros no `hills` hex at all** (26 `plains` + 1 `grassland`). Adjusted: its
   famous agriculture is bottomland along the great river, and the terraces are on the ridge at its
   eastern edge and beyond.
9. "Gala... built on the terraced hillside above a river confluence" → there is no confluence on West
   Pyros's hexes; adjusted to terraced ground above the great river that is its eastern boundary.

**`ganesh_desert.md`** — five:

10. "Its northern boundary is diffuse... as the traveler moves south from the Ganesh Plain" → the
    atlas puts the plain **east**, not north. The diffuse boundary is the **eastern** one; the
    northern edge is Navarth's rim and is the one hard edge the Ganesh has.
11. "the plateau edge of the Meroshe's northern margin rises" to the south → the atlas gives it the
    Dinelv Highlands south and south-east and Cape Heth west.
12. **The desert reaches the sea**, which the lore never mentions: nine of its unclaimed neighbour
    edges are a gulf shore, and it is as dry a hundred paces inland as twenty miles in.
13. "almost none on the surface" → almost none *of its own*: one small river out of the green
    country on the north crosses its edge without gaining a drop.
14. "They come from the Ganesh Plain to the north, moving south" → from the east, moving west; and
    "Ganesh dust reaches the Ganesh Plain in the north" → to the east.

**`ganesh_plain.md`** — five:

15. "the Ganesh Desert to the south" and "lies on the northern side of the Ganesh Desert's diffuse
    boundary, extending northward" → the desert is **west**; the plain extends east and south-east.
16. "carrying water southward toward the Ganesh Desert" → **westward**, and the easternmost channel
    runs the other way to the sea.
17. "extending northward until the rainfall gradient brings it into... more reliably temperate
    country" → its northern neighbour is the semi-arid Pyros plain; the temperate ground is its
    **south-eastern** corner, against Marosh and the sea.
18. "The northern edge of the Ganesh Plain is its most economically active zone" → the
    **south-eastern** edge.
19. "The pastoral communities move to the northern edge in summer" → to the south-eastern edge.

**The spelling note the brief asked about.** The atlas says **Meroshe** Desert where the lore file is
`moroshe_desert.md`; `ganesh_desert.md` itself already writes "Meroshe" throughout while `pyros.md`
and the fauna overview write "Moroshé", and `azhoran_language_profiles.py` lists **Meroshe** among the
Moreshi inspirations. So both spellings are already in the lore and the atlas's is one of them; it is
job 2's problem and not a correction. **Nothing similar applies to these four**: Navarth, West Pyros,
Ganesh Desert and Ganesh Plain are spelled identically in the atlas, the lore files and
`campaign-world.js`.

---

## Registration

`scripts/build-region-survey.mjs` PLAYABLE + `WINDOW.minQ` −33 → −41 → `node scripts/build-region-survey.mjs` ·
`scripts/build-region-rivers.mjs` RIVER_REGIONS → `node scripts/build-region-rivers.mjs` (194 → 222 edges) ·
`src/world/terrain/region-layout.js` PLAYABLE_REGIONS + four REGION_BIOMES ·
`src/world/terrain/region-world.js` REGION_IDS 32–35, four REGION_TERRAIN, four REGION_TEXT (subtitle, spawn,
description, palette with the two skies, `npcIds: []`, nineteen landmarks between them) ·
`src/gameplay/skills/languages.js` (`west-pyrosi` and `ganesh`, the two tongues' dialect lists, four `spoken` entries) ·
`src/dev/tools/developer-atlas.js` (four anchors, one middle hex each) ·
`src/ui/map/map-fog.js` (fifteen areas) ·
`src/dev/tools/build-status.js` (four `early` entries) ·
`src/content/regions/western-regions/west-regions.js` (the two courses, `SOUTHWEST_RIVERS`, `WEST_RIVERS`, `WEST_REGION_NAMES`) ·
`src/content/regions/western-regions/west-ground.js` (`southwestGround` wrapping `westGround` and `baseBeforeWater`, outermost of the
chain because its swale reshapes the ground the rest leave) ·
`src/world/terrain/world-terrain.js` (`southwestTint` in `groundTint`) ·
`src/world.js` (scenery, landmarks, metrics, update) ·
`src/content/regions/western-regions/west-regions-life.js` (the bone-bird rig, its `SOAR` row and three table entries, the zones) ·
`src/content/regions/southwest/southwest-world.js`, `src/content/regions/southwest/southwest-scenery.js`, `src/content/regions/southwest/southwest-wildlife.js` ·
`tests/southwest-world.test.js` · `package.json` · this report · `docs/design-answers.md`.

`src/world/terrain/region-levels.js` already carried all four (4, 3, 4, 3) and was not touched.
`src/content/chapters/civil-war/campaign-world.js` already had their one-line designs and was not touched.

---

## Tests

Everything was run with `node --test tests/<name>.test.js`. **`npm test` was not run**: the script
exceeds the Windows command-line limit on this machine.

**New:** `tests/southwest-world.test.js`, twelve tests, all passing, added to `package.json`.

**The brief's list.** Every one of them passes except the ones the brief names as known-failing on
this base:

* passing: mithala-world, west-lotharn-world, west-lotharn-peaks, east-lotharn-world,
  east-lotharn-peaks, oves-world, gala-world, ascarth-world, eer-world, isareos-world,
  nethereum-world, izol-world, feradom-world, region-layout, region-survey, regions-world,
  developer-atlas, map-fog, region-sky, languages, region-levels, **open-country**, town-life,
  closed-border, climbing, terrain-fall, **drawn-ground**, cartography, west-rivers;
* **`south-suval-world`** fails on the Stillwater — a regex against `src/main.js`, which the brief
  names as pre-existing and which this build did not touch in that region;
* `west-life`, `regional-wildlife`, `chameleon`, `amod-world` and `elagos-world` are the others the
  brief names. `regional-wildlife` was run and fails on exactly the line the brief describes, the
  "previously empty regions" list missing `Iscare Archipeligo`.
* **one more pre-existing failure the brief does not name**: `campaign-world` asserts
  `drent.hexes === 39` and the untouched `assets/azhora-dev-regions.json` gives Drent forty cells.
  The test reads that asset directly and this build never touched it; the count drifted whenever the
  atlas was last re-exported.

**`west-life`, law by law.** It was run one law at a time because with six more hare ranges in it the
chase tests are now very slow on this machine — the run-down law takes five minutes and the
return-home law seventeen. All five chase laws were run:

| law | |
|---|---|
| no band is given a range it can run out of the reach of | **passes** |
| the river fox never flees, keeps arm's length from a walker | **passes** |
| nothing in the west can be walked down | fails on **`elagos-meadow-cattle`**, walked to within 0.34 m |
| the quick ones cannot be run down either | fails on **`feradom-country-17-98`**, run down in 25.5 s |
| a chased band is home again in a few minutes | fails on **`oveth-herons`**, 63 m from home after three minutes (it was 61) |

**All three failures name the three animals the brief, the West Lotharn's report and the Mithala's
report all list as pre-existing on this base, and not one of this block's seventeen ranges appears in
any of them.** That is what the reach law already said: every range here is between 57 and 119 m of
half-diagonal against a reach of 130, every home site is dry, standable, this block's own by both
`regionAt` and `hexOwnerAt` and off every water surface and dry bed, the only animal with a hard law
of its own (the river fox) is deliberately absent, and there is no stock.

**One test this build broke and fixed, which is worth recording because it is a side effect of the
world box and not of a landform.** `tests/drawn-ground.test.js` failed on `east-mithala-gallery`,
1.04 m buried in the drawn ground against a limit of 1. Proved against this base by taking the four
countries out of `PLAYABLE_REGIONS` and re-running — it passed 4 / 4 — so it is this build's: growing
the world west shifts every vertex of the renderer's coarse band, and that landmark stood on a levee
crest where the analytic ground rises a pace and a half over eighteen metres, which a seven-metre
grid cannot follow. It had been within a hand's breadth of the limit since the Mithala was built. It
stands eight metres further off the channel now, on the bank the gallery actually stands on, and the
reason is written above it in `src/content/regions/mithala/mithala-world.js`.


### The stale lists that were found and moved

**Seven**, three of them beyond the ones the brief named.

1. **`tests/region-layout.test.js`** — the world-box guard, `< 37` hexes wide and `> 36`, now `< 46`
   and `> 45.6`, with each of the four countries' case stated and the window measurement recorded.
2. **`tests/isareos-world.test.js`** — `wide > 36 && wide < 37`, now 45.6–46.
3. **`tests/nethereum-world.test.js`** — the same guard, the same move.
4. **`tests/west-lotharn-world.test.js`** — its world box pinned `minX` to the digit, and the test was
   called "this country does not grow the world box, and the four north of it do". It now holds three
   facts: this range spent nothing, the Mithala spent the north, the southwest spent the west.
5. **`tests/mithala-world.test.js`** — *not named by the brief*, and **two stale lists in one file.**
   Its world-box test asserted `|wide − 36.20| < .01` with the message "east to west is 36.20 hexes,
   untouched" — a number the plain did not set, pinned by the country that did not spend it. It now
   asserts 45.70 and says what it always meant: the plain spent none of it.
6. **`tests/mithala-world.test.js`**, again — its registration test asserted
   `PLAYABLE_REGIONS[PLAYABLE_REGIONS.length - 4 + index]`, which said "last four in the list" when it
   meant "after everything that was there before". **This is the third generation of the same
   mistake**: the West Lotharn builder rewrote it in `tests/oves-world.test.js`, the Mithala builder
   rewrote it in `tests/west-lotharn-world.test.js`, and it reappeared one file over — **twice in the
   same test**, once for `PLAYABLE_REGIONS` and once for `PLAYABLE` in the survey script. Both now
   find their own index, and the first also asserts that every region after it carries a higher id.
7. **`tests/region-sky.test.js`** and **`tests/eer-world.test.js`** — the two copies of the `OWN_SKY`
   allow-list, both extended. The West Lotharn builder found this pair, the Mithala builder found it
   again, and it is still a pair.

**`tests/open-country.test.js` passed untouched**, which is the second time running: none of its
probes stands anywhere in this block, because the block is nine hundred metres west of anything that
was built before it.

---

## Review

Two hillshades of the whole block are `tests/artifacts/southwest.png`
(`MAP_LO=0 MAP_HI=70 node scripts/region-map.mjs -3990,830,-2490,1910 2`, with white dots on the
gulf head, the Vaellir's mouth and the western rim) and `tests/artifacts/southwest-low.png`
(`MAP_LO=2 MAP_HI=30`, for the lowlands). What they show, and what was checked against them:

* **the block reads as one landform with one high place in it** — Navarth's swells are a group of
  pale rounded lumps in the north-centre and everything else is flat;
* **the gulf is real**: open water along the whole north-western side, with the desert running out at
  it and no green anywhere on the shore;
* **the desert floor is featureless from above**, which is what nine tenths of a metre on three
  hundred and twenty looks like, and the washes and the channels do not show at all at two metres a
  pixel — correct for a bed cut one metre into it;
* **the red ring round the outside** is the outland margin — ground the climbing rule calls too
  steep — and is the rib measured above. Inside the block's own hexes there is no red anywhere.

**Eight review views were photographed** with
`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=..."`, after the
last scenery change, with no errors: `southwest-ganesh`, `southwest-rim`, `southwest-plateau`,
`southwest-vaellir`, `southwest-gallery`, `southwest-wash`, `southwest-depression`,
`southwest-shore`. They are in `src/main.js` and every one is worked out from the block's own
numbers — a point along the Vaellir's sample line, a step off it by its own normal, a wash's or a
depression's own points, or a landmark — so a view cannot drift off the thing it shows when a course
or a landform moves. Images: `tests/artifacts/southwest-*.jpg`.

What they showed, and what was changed because of them:

* **the Ganesh reads as the emptiest ground in the game.** Bare stony floor to a horizon with the
  sea on it, scrub in one clump a long way off and gravel plates scattered over everything. It is
  emptier than the Mithala's round horizon and is meant to be;
* **the rim reads exactly as it was meant to**: the Alezhor Water a dark green ribbon in the
  foreground with its tamarisk on it, the plateau rising behind, the swells' tops against the sky and
  scrub and stone thinning up the slope. It is the one view that explains the geography in a look;
* **the gulf shore is the picture of the whole job** — desert pavement, boulders, a few bleached
  stalks, and then the sea, with the river's green line coming in on the right and a single tree on
  it. Nothing about it looks like a coast anywhere else in Azhora;
* **the Vaellir reads as a great river on a dry plain**: a wide green meander across pale ground with
  a gallery of poplar and willow standing on one bank and nothing at all on the other, which is the
  country's whole shape in one frame;
* **the Ganesh Plain reads as a drought**: bare pale clay with grass in tufts, thinning away from the
  hollows, stones scattered through it;
* **three things were wrong and were fixed by looking:**
  * **the ground came back as white sand.** Two rounds of darkening every swatch (a total of about
    thirty-six per cent off the four countries' grounds, the tint's four colours, the stone, the
    gravel, the pavement, the stubble and the grass's HSL) moved the screen by five per cent, which
    is when the arithmetic was done: **at density .0030 with a near-white haze, more than half of
    every pixel past a hundred and fifty metres was haze and not ground**. The desert haze is a warm
    dust now (`0xc6b996`) at **.0024**, and West Pyros's is `0xc3bb9c` at .0036. That is the Meneth
    lesson's second half and it is worth writing down: on a country whose whole subject is distance,
    the haze colour matters more than the ground colour does;
  * **the water read as tarmac**, exactly as the Mithala's did, and the shader is lighter now;
  * **the two river views were both on the wrong side of the river, twice over.** The first try put
    the camera in the middle of the water, which is the Mithala's own mistake; the second put it in
    East Pyros, which is not built, so it took the default sky and came back through a cool blue
    haze looking at the block from outside it. Measured: the West Pyros bank is the **positive** side
    of this course's normal. Both stand on it now, and the gallery view is the better for it — from a
    hundred and seventy-five metres out the river is not visible at all and the line of poplar is,
    which is exactly what the gallery is for.

---

## Open questions

1. **The block cannot be walked to.** None of these four touches a built country and the Ibenwood
   belt between them and Nethereum is not built, so until it is they are reached by F8 and by nothing
   else. The user knows and chose it. **Jobs 2–4 inherit the same island and make it bigger**: all
   nine remaining countries of the southwest quarter hang off these four.
2. **The outland ribs, on every side.** 9.13 m of step in two metres at the worst margin point, which
   is between the Mithala's 4.38 and the West Lotharn's 25.8 and is exactly what this block's
   amplitude predicts. It is `relief()`'s phase chirp and it will not be cured region by region.
   Eight unbuilt neighbours here; jobs 2–4 will build four of them (the Meroshe deserts, the Dinelv
   Highlands, Cape Heth, Marosh) and each will take a bite out of it.
3. **The Vaellir is a wall for fifteen of its twenty hex edges**, and the far bank is East Pyros,
   which is not built. When it is, the first question its builder meets is whether there is a
   crossing, and the answer in the lore is Gala — a walled city on terraced ground above the river,
   which is somebody's and belongs to whoever builds the people. Until then the wall costs nothing,
   because there is nothing on the other side.
4. **The Ganesh dustback.** `ganesh_desert.md` names an animal — "*ghubr*, in the Moreshi pastoral
   vocabulary... a smaller, drier creature, feeding on the surface-level insect populations that
   persist even in dry years", which caravan guides read for wind direction and surface temperature —
   and **never describes its body**. The only dustback the rest of the lore describes is
   `azhoran_livestock.md`'s Moreshé dustback, which is a domestic bovid and somebody's, and the file
   says explicitly that the Ganesh one is not that animal. Building it would have meant inventing a
   shape for a named animal, which is a design decision and not a build decision. It is the one thing
   the Ganesh Desert is short of, and it belongs to whoever answers the question.
5. **The wet year is not built**, because there are no seasons — and this block would change more for
   them than anywhere but the Mithala, in the opposite direction. The lore's wet-year Ganesh
   "undergoes a visible transformation... annuals that exist as dormant seed banks for the dry years
   germinate in numbers that carpet sections of the surface in temporary green", and the Ganesh
   Plain's whole social structure is an eight-to-twelve-year drought cycle read in advance. The
   stubble is where the flush would be, everywhere in both countries. **When seasons land, the
   Ganesh and the Mithala are the two countries that should change most, and they should change
   oppositely**: the Mithala floods and freezes, the Ganesh blooms.
6. **The desert reaches the sea and nothing has been made of it.** The Ganesh Desert's north-western
   corner is a gulf shore with a river mouth beside it, which in any other climate would be a harbour.
   It is drawn as beach, scrub and nothing, which is honest; but it is the most striking single fact
   in the southwest and the lore does not mention it at all.
7. **Navarth's lore is the furthest from its atlas of any country built so far.** A cold snowy
   pastoral plateau on the page and a hot desert upland on the map. The adjustment above keeps the
   altitude, the exposure, the pastoral economy and the whole Fire-Memory-at-a-distance argument —
   none of which needs the cold — and changes only the weather. A reader of the old file will find the
   country unrecognisable in one respect and unchanged in every other.
8. **The Ganesh Plain's third channel runs the wrong way on purpose**, and that is a fact about the
   built ground rather than a choice: its southern rows do not fall west at all. If job 2's Meroshe
   deserts change the blend along that margin, the divide will move, and the three channels should be
   re-measured then.
