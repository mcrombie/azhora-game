# The Mithala plain: the build report

Built 2026-09-29 on branch `mithala` (worktree `azhora-game-mithala`, from `west-lotharn` 1722740),
to `docs/mithala-brief.md`. **Terrain, climate, water, scenery and wildlife, and nothing that belongs
to anybody.** Minora at the first fork, the villages on their levees with their raised granaries, the
flood calendar and the water courts, the channel affiliations that are the people's whole spatial
identity, the floodwheat and the barley and the rye, the river-horn herds, the barges and the docks
and the grain that feeds the continent, the sky-reading tradition and the astronomy that came out of
it, Mithalenna's cult with the Temple of the Seven Bowls and its Bowl-Keepers, the Cref oath at the
old seat and the warlords who broke it: none of it is built. Left uncommitted, as the brief asks.

**One hundred and seventeen hexes across four countries** — 116 the atlas authors and one it forgot —
which is more than double the West Lotharn's forty-eight and the largest job the project has taken.
The four were built as one landform with four registrations, which is what the brief asked for and
what the ground turned out to require: they share forty-nine hex edges, one climate code, one river
system with a single outlet, and, in the end, one terrain profile to the digit.

Three things made this job different, and all three came out where the brief said they would.

1. **Scale.** All four were registered and walkable before any of them was deepened.
2. **`Dfa` on every one of the 116 hexes** — the first properly continental country in the game.
3. **The world grew north**, from 37.00 hexes tall to **45.656**, and the survey window with it.

---

## What the atlas gave

| | **South Mithala** (28) | **West Mithala** (29) | **East Mithala** (30) | **North Mithala** (31) |
|---|---|---|---|---|
| authored hexes | 33, q −1…12, r 89…94 | 28, q −1…5, r 87…92 | 23, q 5…13, r 86…89 | 32, q 3…11, r 82…87 |
| terrain | plains 19, grassland 10, **hills 4 (+1)** | grassland 24, plains 4 | plains 12, grassland 11 | plains 22, grassland 10 |
| world extent (hex centres) | x −2100…−1000, z −1443…−1010 | x −2350…−1750, z −1616…−1183 | x −1800…−1000, z −1703…−1443 | x −2100…−1350, z −2049…−1616 |
| built neighbours | **East Lotharn 15, West Lotharn 10** | — | — | — |
| other neighbours | East Mithala 16, West Mithala 8, open 17 | open 20, North Mithala 7, East Mithala 5, South Mithala 8 | open 12, North Mithala 13, West Mithala 5, South Mithala 16 | open 26, East Mithala 13, West Mithala 7 |
| level | 3 | 3 | 4 | 4 |

Every one of those numbers was read off the survey rather than copied from the brief, and
`tests/mithala-world.test.js` re-derives them. **No `mountain` hex anywhere**; five `hills` hexes in
South Mithala are the whole of the relief the atlas asks for, and the fifth of them is the subject of
the next section.

### The hex the atlas forgot, and the hole it left

**(5,92) is `hills` on the World Builder map, ringed by South Mithala on all six sides, and claimed
by nobody.** The dev atlas export carries only what a region claims, so the hex came through as
unclaimed; unclaimed ground is not land; and the coast field calls anything that is not land the sea.
The result, found while measuring wildlife sites, was a hundred-metre hole of open water **at 0.6 m
between two hexes standing at 12 and 13**, with a beach round it, in the middle of the flattest
country in the game.

The fix is a generalisation of a rule that already existed. `ENCLOSED_LAKES` in
`scripts/build-region-survey.mjs` held exactly one entry — South Suval's Stillwater, a `lake` hex
ringed by one region — under a rule worded for lakes. It is now **`ENCLOSED_HEXES`**, it carries the
terrain the map gives each hex, and it holds two:

| hex | terrain | held by | why |
|---|---|---|---|
| (6,120) | `lake` | South Suval | the Stillwater, unchanged |
| **(5,92)** | **`hills`** | **South Mithala** | this build |

Taking it does two good things beyond filling the hole. **South Mithala's outline goes from two
loops to one** — it had a hole in it — and the Lotharn's last apron becomes the **unbroken chain of
five `hills` hexes the map actually draws**, from (3,93) through (4,92) and (5,92) to (6,91) and
(7,91), instead of two separate swells with a pond between them. The ground there now reads 17.7 m.

Three test files and one comment moved with the rename: `tests/region-survey.test.js` (three
references and the "held atlas" helper), `tests/south-suval-world.test.js`, and the header of
`src/content/regions/south-suval/south-suval-world.js`.

---

## The climate read, and what `Dfa` changed

Read per hex from the World Builder map (`azhora.wwmap`, `hexes[key].climate`, `koppen-v1` — not
`azhora.cmap.json`, whose one-code-per-region field is a default): **`Dfa` on all 116 authored
hexes**, 33 + 28 + 23 + 32. `MITHALA_CLIMATE` in `src/content/regions/mithala/mithala-world.js` records every one and the
test holds them to the map hex for hex whenever the map is on the machine to ask. For context, the
whole of this quarter of the continent reads the same: Henborth `Dfa` × 27 on the western border,
North Celder `Dfa` × 33 + `Dfc` × 1, the Acor Wetlands one step colder at `Dfb` × 21 + `Dsb` × 4.

Everything built before this is `Cfa`, `Csa`, `Csb` or `BSh`, with a single `Dfa` hex at the West
Lotharn's western tip. **So there is no climate gradient to draw here either** — one code over 116
hexes is one code — and none is drawn, which is the answer Ovesos and the Oves Desert came to for
their `BSh` and the opposite of Gala's three bands and Eer's diagonal.

**What `Dfa` changed is the species, because the game has no seasons and the weather cannot carry
it.** The summer face is built and the continentality is in what grows and what grazes:

* **tall warm-season prairie grass**, drawn half again as tall as any grass in the game and four
  times as dense as the west's usual count, standing to the waist by July on ground that was frozen
  in February. The flora document's Plains section is explicit that this flora is *not* the Ibenwood
  catalogue at all — "the tall grasses, the prairie forbs, the drought-tolerant perennials adapted
  to the seasonal dry periods that the forest never experiences";
* **prairie forbs** through it — 3,187 of them — which is the one thing a `Cfa` meadow does not have
  and which no country in the game had before;
* **willow, black poplar and alder on the water and nowhere else**, because they are what stands a
  spring flood and a hard freeze in the same year. **Not one evergreen anywhere on the plain**, and
  no aromatic scrub, no olive, no cushion plant: everything the Mediterranean and rain-shadow
  countries in this game are made of is absent, which is most of what `Dfa` means next to `Csa`;
* **sedge and rush** on the fen margin, the flora document's "sedge assemblages adapted to peat
  formation" of the cold wet north;
* and **the frostback buffalo**, the one new rig, whose whole shape is a hard winter: a mass of
  shoulder, a head carried low off it, and the ridge of pale cold-season hair along the spine the
  lore names the animal after. Its distribution is a season too (below).

**What winter would bring, for whoever adds seasons.** This block, not the Oves, is where seasons
will show most, and the lore is unusually specific:

* the plain **white and level from the Lotharn to the Acorwood**, with the horizon still a circle;
* the tall grass standing **dead and buff above the snow** — it is a warm-season prairie and it is
  brown from the first frost to the thaw, which is five months;
* **the channels frozen hard enough to walk**, which would be the only season the main channel is
  crossed anywhere below its ford, and would change the shape of the country for those months;
* and then **the flood**, which is the thing the whole country is organised round: "every spring,
  when the snowmelt off the Oremindi arrives with the rains of the interior, the Lizeem rises. The
  channels spread. The plain between them is inundated — not catastrophically... but systematically."
  The ground is already built for it: the **backswamps** stand up to 0.6 m below the plain and the
  **levees** up to 1.25 m above it, so a rise of a metre and a half floods everything between the
  channels and leaves the banks dry, which is exactly where the lore puts every village;
* the **black migratory geese** going north through the fen margin, and the frostbacks going north
  into Henborth "only when the thaw and summer moisture make the upland pasture worth the risk".

A note is written into the header of `src/content/regions/mithala/mithala-world.js` saying all of this in one line, because
nothing else in the game will need it sooner.

---

## The world grew north, and every number that moved

### The measurement

`worldBoundsFor` over the twenty-seven playable regions plus these four:

```
before   x −3010.001927939127 … 609.9980720608719   z −1301.1705922171766 … 2398.401076758503
after    x −3010.001927939127 … 609.9980720608719   z −2167.195996001615  … 2398.401076758503
```

**North Mithala alone spends it.** Its northernmost hex is the atlas's row 82, (11,82), centred at
z = −2049.5 with its top corner at −2107.2; the margin is 60 m, so the edge goes to **−2167.196** and
the world from **36.996 hexes tall to 45.656**. Each country's own case, which is what every guard's
comment now states: South Mithala reaches row 89 and would have spent nothing on its own, because the
East Lotharn already stood at 92; West Mithala reaches 87; East Mithala 86; **North Mithala alone
spends the last four rows**, 85 down to 82. East and west, nothing at all: the plain lies inside the
box Nethereum and Drent already made (x −2400…−950 against −3010…610), so the width is still 36.20.

### `WINDOW.minR`: 90 → **79**, measured

The coast lattice is laid `COAST_MARGIN` (96 m) beyond the world bounds and snapped to a fixed phase,
so its first row now stands at z = **−2264.350**. A pointy-top hex reaches one circumradius (57.735 m)
past its centre at its top and bottom vertices, and row 79's centres are at −2309.3, which puts its
lower vertices at **−2251.6** — thirteen metres north of the lattice's first row, so samples do land
in it. Sampling the **whole** lattice (1,191 × 955 points) and collecting every hex any sample falls
in gives **q −31…34, r 79…135**. So `minR` is 79: the last row the lattice reaches, and no slack, the
same rule `maxR` 135 was set by. `maxQ` is already exactly 34 and gains none, which is not luck —
x = W(q + r/2), so ten rows further north is five columns further east at the same world x.

The test re-derives it: `tests/mithala-world.test.js` recomputes the lattice's first row from
`WORLD_BOUNDS` and asserts the window stops at the row it reaches.

### What the widened window pulled in

**329 claimed hexes in seventeen countries** turned from sea into land — more than the Ascarth
widening's 25 by an order of magnitude, because this edge is the top of the continent rather than one
island:

| | | | |
|---|---|---|---|
| South Acordwood 37 | North Mithala **32** | North Oreminidi Mountains 29 | Narcosh 28 |
| Henborth 27 | East Mithala **23** | West Acorwood 23 | Acor Wetlands 21 |
| East Acordwood 19 | Cudon 18 | Lesser Oremindi Mountains 18 | West Mithala **16** |
| Cape Thalmagar 15 | North Acorwood 13 | West Oremindi Mountains 6 | East Oremindi Mountains 3 |
| South Mithala **1** | | | |

Seventy-two of them are the plain's own. **The other 257 are its horizon**, and they are the reason
the country reads as the middle of a continent rather than the edge of one: without them the plain
would have ended in open water one hex north of North Mithala's last row, where the atlas draws the
Acor Wetlands, the Acorwood and the Oremindi. `LAND_HEXES` went from 1,395 to 1,863.

### The world-box guards that moved

| file | was | now |
|---|---|---|
| `tests/region-layout.test.js` | `< 37` hexes tall, `> 36.9` | **`< 46`, `> 45.6`**, with the four countries' case stated |
| `tests/isareos-world.test.js` | `\|tall − 37.00\| < .05` | **45.66** |
| `tests/nethereum-world.test.js` | `\|tall − 37.00\| < .05` | **45.66** |
| `tests/ascarth-world.test.js` | `\|tall − 36.996\| < .002` | **45.656**, plus the southern edge pinned outright and `WINDOW.minR` |
| `tests/west-lotharn-world.test.js` | `minZ = −1301.1705922171766` | **−2167.195996001615**, and the test renamed |
| `tests/izol-world.test.js` | pins the **southern** edge | untouched: nothing south moved |

**Two of those six are ones the brief did not name.** `tests/ascarth-world.test.js` and
`tests/west-lotharn-world.test.js` each carry a copy of the world box, and the Ascarth one is the
fourth copy of a guard that has now been edited by four different builders in a row.

---

## The ground

### One profile, four times over

`REGION_TERRAIN` gives the four countries **identical numbers to the digit**:

| terrain | base | amplitude | wavelength |
|---|---|---|---|
| `plains` | 10.5 | **.5** | 320 |
| `grassland` | 12 | **.75** | 320 |
| `hills` (South Mithala) | 24 | 2.6 | 320 |

They have forty-nine hex edges among them; a base or a wavelength that differed across any of those
would put a step or a chirp in the middle of one plain, which is the lesson Gala and the Ascarths
wrote down for their eight shared edges and the two Lotharns for their seven. **So every difference
of level between the quarters is a landform and not a profile** — which is why there is a tilt at all.

One wavelength, 320, for the same reason the Ascarth hills are on the grassland's: the blend's relief
is a sine of the blended wavelength, so a hex on another wave shifts the phase of every sine within
reach of it. The four `hills` hexes are on 320 too, and their roughness is amplitude alone.

**Half a metre is the lowest amplitude in the game after the Moros** and below Eer's .8, which was
the previous flattest. It is on purpose: everything a Mithala traveler can pick out — a levee, a
backswamp, a bar, a dry summer channel — is a metre or two of the river's own work, and relief that
competed with it would bury the lot. Measured over the plain's interior, off the banks and where the
blend is more than nine-tenths its own, the steepest two-metre step has a **median of 0.02 m and a
99th percentile of 0.35** — which makes this, by a distance, the flattest built ground in Azhora.

### The tilt

`MITHALA_TILT` is one plane over all 116 hexes: **eight metres of easting over 1,450 and two and two
fifths of northing over 950**, one in 180 and one in 400, pivoted on the meeting of the arms so that
the profile base is the level of the river junction rather than of an average nobody stands on.

Which way it falls is the atlas's and not a choice. Every drawn channel runs to one outlet at
(−1000,−1414), where the hexes beyond are unclaimed water, so the plain falls **east**; and the north
braid rises on the northern shelf and runs south, so it falls **south** as well, which makes those
northern rows the low divide between this drainage and the Acor Wetlands behind them. At the extremes
it is +4.1 m at West Mithala's western rim, −3.9 at the mouth, +1.8 on North Mithala's northernmost
hex and −1.1 at South Mithala's Lotharn corner: **under five metres anywhere**, which keeps the step
at the unbuilt margins to about what Gala's steppe rise makes at its own.

### The levees, and the backswamps between them

The one landform a flood plain actually has, and the lore puts the whole of Mithala settlement on it:
"Villages and towns sit on the highest available ground — the natural levees along the main channel
banks, the slightly elevated patches between braids." A levee is nobody's: it is what a river in
flood leaves when it comes over its bank and drops the coarse part of its load in the first few
paces. So **the ground is highest at the water and lowest halfway to the next channel**, which is the
opposite of what anybody expects of a river and is the reason the villages are where they are.

`MITHALA_FLOOD`: crest **1.25 m**, held to 18 m out and gone by 66; the basin **0.6 m** below the
plain, coming on between 96 and 215 m from the water and gone again by 430, so ground far from every
channel is the plain's own level and not a permanent hollow. It is read off the **nearest** channel
and not summed: two banks added together where two channels run two hundred metres apart would stand
a ridge between them instead of the basin the lore says is there. The crest is **scaled by the
channel's own width** — the main channel's is the full metre and a quarter, the north braid's and the
west arm's about half, the fan's two distributaries a hand's breadth — because a bank is made of what
the river carried.

`onLevee` and `inBackswamp` are what the scenery and the ground tint read, the way Nethereum's whole
scatter is read off `nethereumWet`.

### The fen margin

`MITHALA_FEN` takes **2.4 m** out of the ground over the last 125 m before the Acor Wetlands border,
and it is laid on the **wetland side only**: twelve of North Mithala's outside edges are the Acor
Wetlands (`Dfb`/`Dsb`, one step colder) and eight are West Acorwood, and those two margins are not the
same thing at all — one is water and one is forest, and a forest grows on ground while a fen is a
hole. It is a little more than the tilt raises that ground, so the northern rows come out level and
then very slightly falling rather than rising: **a divide a traveler cannot see**, with the braid's
two heads a hundred metres south of it and the wetlands beginning a hundred metres north. That is
what a watershed on ground this flat is, and it is why the atlas can draw a river starting there.

### The swale, and why there are rivers here at all

**Six of the eight channels are drawn on a border and four of those borders are unbuilt**, so up to
two thirds of the hex blend along them is `outland`, whose relief is six metres on a
hundred-and-fifty-metre wave — twelve times this plain's own amplitude. Measured before anything was
done about it: **the west arm's water was forced down 6.79 m over its thousand metres**, all of it in
four sample dips where the outland wave happened to be low, and it arrived at the meeting **5.3 m
below the main channel it flows into**.

So every channel is given a **swale**: within 45 m of it the ground is the plain's own designed
surface — the blend's base, the tilt and the levee, and no relief at all — coming back to the
ordinary ground by 165 m. The blend's `base` is kept and only `relief()` is dropped, because a base
blends linearly across a hex boundary and is therefore already smooth; it is the sine that chirps.
The swale lets go at the shore, because the coast field lowers the last forty metres to the sea and a
levelled floor laid over that would draw the river's bed in the air above the beach. With it the west
arm falls **3.56 m**, which is the tilt, which is what the atlas draws.

It is also the honest landform, not a patch: a river on a flood plain does not run across the
country's relief, it runs on a floor it has laid itself, and it lays it out to a couple of hundred
metres either side.

Two shares are used, and the second is the Sorten's allowance in a new place. `mithalaShare` is the
ordinary `smooth(.3, .8)` gate every western landform uses; **`mithalaBankShare` is
`smooth(.05, .30)`** and carries the tilt, the levees, the swale and the fen fall, because at the
water's own edge on a border the blend is a third of the Mithala and two thirds of something else,
and all four are landforms about the river. `ovesWeights.sorten` does exactly this on the Oveth for
exactly this reason.

---

## The water: eight channels, and they are the country

The atlas draws **sixty-one new river edges** across the four countries in thirteen chains, which is
the largest piece of authored water in the game after the Lizeem itself. `RIVER_REGIONS` in
`scripts/build-region-rivers.mjs` gained all four names at once (the four western regions were added
together for the same reason) and `src/world/terrain/region-rivers.js` went from 133 edges to **194**.

**Measured before the names were added**: of the twenty-one chains that existed, not one loses its
region key, changes a single point, or gains a confluence. The nearest built water is the East
Lotharn's border water, and its two Lotharn-only pieces are 14 and 2 points before and after, to the
digit. Thirteen new chains appear and nothing else moves.

**The shape is the atlas's, read off rather than decided**: two arms come in, one from the west along
the Celder margin and one from the north out of the wetland country; they meet at **(−1700,−1414)**,
South Mithala's north-western corner; and one channel goes east from there to the sea at
(−1000,−1414). Every chain either runs to that meeting or hangs off one that does. It is the lore's
own account of the plain read backwards — "Below Minora, where the river first forks, the branches
multiply... The Lizeem's channels eventually gather again as they approach the sea" — and this ground
is where they gather. It is also where the campaign puts its unbuilt river-city ("where the rivers of
West, East and South Mithala meet", `campaign-world.js`), and the high dry ground inside the fork is
deliberately left empty so that putting it there later moves nothing.

| course | size | from | to | fall | what it is |
|---|---|---|---|---|---|
| **the west arm** | small→med | the north-west rim, 13.96 m | the meeting, 10.40 | 3.56 | four chains end to end down the Celder margin: the longest course on the plain |
| **the north braid** | small | the wet shelf, 13.10 | the meeting, 11.51 | 1.59 | the lore's own name for a channel |
| **the main channel** | **medium** | the meeting, **10.40** | the sea, 5.57 | 4.83 | the largest water here; braided almost throughout |
| the Celder water | small | the three-country corner, 12.32 | the arm's bank, 11.34 | 0.99 | the only water off the hill country to the south-west |
| the east head | small | 12.60 | the braid's bank, 12.37 | 0.23 | the braid's second head, a hundred metres east of the first |
| the cross braid | small | 14.25 | the braid's bank, 13.51 | 0.74 | east along the North\|West Mithala border into the braid |
| the upper fan | small | 13.72 | 13.61, tapering | 0.11 | a distributary off the arm, giving out on the grass |
| the lower fan | small | 13.74 | 13.51, tapering | 0.23 | the second of them |

Every one falls the whole way, sample by sample, and every one lies in a channel cut for it: the test
asserts both for all eight.

**It is not called the Lizeem, and that is deliberate.** The atlas draws these edges `medium` where
it draws the Lizeem `large` through Caricas and Eer, and the lore is plain that the river below
Minora is not one river but a set of channels each of which a farmer "knows by name and behavior" —
so the biggest of them is what the lore itself calls it, **the main channel**, and the great river's
name stays on the great river. The one name taken from the lore is **the north braid**, which it
gives as an example of what a village says it is on.

**Two braided reaches**, which is what this plain is famous for: the main channel braids from a
third of the way down to its last twentieth at an offset of 26 m — the widest in the game, because
this is the flattest ground in the game — and the north braid over its lower half at 17 m. The bars
between the threads are drawn as silt rather than gravel, because everything the river carries this
far down is fine.

**The hand-over at the meeting.** The two arms arrive from a thousand metres of border where two
thirds of the blend is unbuilt outland, and whatever level they get there is the level the river
below them has to start at, or the plain has water running uphill into its own main channel. So the
main channel takes its first water level from the west arm's last (`headOf: 'mithala-west-arm'`,
the allowance Nesdor's Ela-South Reach and the West Lotharn's Kemrath reach both make), and
`MITHALA_RIVERS` puts the two arms **before** the main channel because `west-ground.js` builds the
profiles down that list. Measured: the west arm arrives at 10.40 m, the main channel starts there to
the digit, and the north braid comes in 1.1 m above both.

**The main channel is a wall below its first third**, which is the house rule for a medium river (the
Isa, the Carica) and is the one thing on this plain that stops anybody. Its ford is the gravel of the
upper reach where the two arms have only just come together; from there to the sea nobody crosses it
on foot, and it is the South Mithala | East Mithala border for sixteen hex edges, which is why those
two are different places. Everything else is waded anywhere. **The whole plain is still walkable**:
a flood fill on an eight-metre lattice from West Mithala's spawn reaches all four countries, going
round the meeting rather than over the water, and the test holds it.

**Four summer channels**, one to a country — "the summer-only channels that fill in high-water years
and run dry otherwise". Real cut beds with a flat silt floor and **nothing in them**: no water
surface, no ribbon, no reed, and a traveler walks down the middle of any of them. The Oves Desert's
four dry channels are the same machinery for the opposite reason — there it never rains, here it
floods every spring.

---

## The seams

### The Lotharn, which is the only built country this block touches

Twenty-five hex edges, all South Mithala's: **East Lotharn 15, West Lotharn 10**. The contract is the
plain one — neither side writes ground outside its own hexes — and here it needed a gate of its own,
because the tilt, the levees and the swale are all deliberately let reach past a border to follow a
river drawn on one.

**Measured before that gate existed, the swale took 92.6 m out of the West Lotharn's face** at
(−2059,−942) and 4.7 m out of the East Lotharn's at (−1073,−1201): reading a blended base at a point
the range's own landform had lifted a hundred and ninety metres, it pulled the ground toward the
plain. A blend-weight gate could not fix it. A blend weight is symmetrical — at a point that is a
third mountain and a third plain it says the same thing whichever side of the line the point is on —
so a gate tight enough to keep the swale off a cliff a few metres inside the range also turned it off
across a whole row of the plain's own hexes and took the Celder water's floor with it.

`lotharnGate` is therefore a **distance from the ranges' own hex centres**: `keep` 58 m, which is a
hex half-width, and `free` 118. A point nearer than a half-width to a mountain hex's middle is that
hex's and this plain leaves it alone. Measured: **every Lotharn hex centre inside the plain's box is
gated to 0**, and the worst any Mithala hex centre loses is **0.784** — a fifth.

| neighbour | edges | max ground this plain writes inside its hexes |
|---|---|---|
| **East Lotharn Mountains** | 15 | **0.000 m** |
| **West Lotharn Mountains** | 10 | **0.000 m** |

**The seam itself reads as a mountain front over a plain**, which is what the atlas draws when it puts
`mountain` and `hills` hexes against `plains` at ten metres: the steepest two-metre step in the band
either side is **41.2 m** on the West Lotharn margin, and it is the range's own cliffs standing inside
the band, not a chirp at the line — the same reading its own report gives for its other borders. On
the East Lotharn margin, where the range comes down to its border water and the plain, it is **2.4 m**.

### What did move, and it is not a landform

Registering South Mithala changes `terrainMix` inside the Lotharn's border hexes — a `plains` profile
at amplitude .5 and wavelength 320 where there used to be `outland` at 6 and 150 — and the West
Lotharn's own cliff machinery amplifies a small change in its base into a whole riser. Measured
against the pre-build tree over a 40 m sweep of the world:

| country | points moved | mean \|Δ\| | worst |
|---|---|---|---|
| West Lotharn Mountains | 734 | 2.03 m | **−46.1 m** at (−2050,−960), on a cliff band 36 m inside its north-eastern row |
| East Lotharn Mountains | 849 | 0.64 m | −3.1 m |
| everything else in the world | 13 points | ≤ 0.4 m | 0.40 m in East Suval |

The 46 m is a cliff band moving one course on the range's last hex row, where the ground beneath it
went from outland rubble to a river plain. **It is the atlas's own doing and not a landform of this
country's**, and the check is exact: `mithalaGround` writes 0.000 m inside those hexes. All ten of
the West Lotharn's tests pass, including its crest and its peaks flood fill.

The thirteen points elsewhere are the coast field: growing the world north lengthens the
distance-to-sea chamfer chain, which moves `landDistance` by a fraction of a metre a long way off.
That is enough to re-roll one seeded scatter stream, which is how the Isamouth question below was
found.

### The four internal seams

Measured as the steepest two-metre step anywhere in the sixty-metre band either side:

| seam | edges | steepest 2 m step |
|---|---|---|
| East Mithala \| South Mithala | 16 | **1.69 m** — and all of it is the main channel's own bank, which runs down the middle of it |
| South Mithala \| West Mithala | 8 | 0.79 m |
| North Mithala \| West Mithala | 7 | 0.82 m |
| East Mithala \| West Mithala | 5 | 0.82 m |
| East Mithala \| North Mithala | 13 | 0.40 m |

Forty-nine edges and nothing over a metre and three quarters, which is what one profile and one
continuous tilt buy. The test holds every internal seam under 2.2 m.

### The ribs against the unbuilt margins

Six unbuilt neighbours — North Celder, South Celder, Henborth, the Acor Wetlands, West Acorwood and
South Acordwood — and the ribs Gala, Ovesos and the West Lotharn all reported are here too:

| | steepest 2 m step |
|---|---|
| Mithala \| open country (the whole outside edge) | **4.6 m**, at the fen margin |
| *inside the plain, blend > .92, off the banks* | median **0.02**, p95 0.20, p99 0.35, max 1.44 |
| *at the margins, blend ≤ .92* | median 0.23, p95 1.21, p99 1.90, **max 4.38** |
| *open country on its own, away from every border* | median 0.23, max 0.55 |
| *for comparison:* West Lotharn \| open country | 25.8 |

At the worst point, (−1196,−1758), the blend is 65 % outland and 35 % East Mithala, giving a mixed
amplitude of 4.08 on a wavelength of 209 — the phase chirp, exactly as described. **It is an order of
magnitude gentler here than in the West Lotharn**, because this country's own amplitude is half a
metre rather than thirteen, and the cure still belongs in `relief()`/`terrainMix` and is still a
world-wide job. It was not attempted.

---

## What grows

`src/content/regions/mithala/mithala-scenery.js`, one seeded stream of its own drawn after the West Lotharn's, so nothing
already built anywhere else moves for it. Everything is placed on these four countries' own hexes.

| | count |
|---|---|
| prairie grass tufts | 26,231 |
| prairie forbs | 3,187 |
| reed at the waterlines | 3,532 |
| sedge and rush on the fen margin | 1,244 |
| gallery trees (willow, black poplar, alder) | 267 |
| Acorwood-margin saplings | 33 |
| silt on the summer channels' floors | 816 |
| silt bars between the braid threads | 444 |
| stones on the apron | 43 |
| water ribbons (eight channels and four braid threads) | 12 |
| deep-water blockers on the main channel | 831 |

Everything is decided by two numbers and no third: **how far from a channel**, which is how often the
ground is under water, and **how far north**, which is how near the wetlands and the forest are. The
levee crest is the driest ground in the country and carries the tallest grass and the forbs; the
backswamp is the wettest and carries rank grass and nothing woody; the water's edge carries reed and
two paces back the gallery; and the fen margin shortens into sedge over a hundred and fifty paces
with no line anywhere.

**Every tree on the plain stands on water or on the Acorwood margin**, and the test asserts it for all
267 — a gallery two and three trees deep along the channels is, from out on the grass, a dark line
with nothing behind it, and it is how a traveler finds a river on ground where the river is invisible
from a hundred paces. The Acorwood's approach is drawn as young trees simply beginning to stand in
the grass, singly and then in twos, over the last few hundred metres before the forest's own hexes,
which are not built and are where it stops.

**The ground's own colour** is `mithalaTint`, hooked into `groundTint` for these four countries'
swatches only: the atlas's `plains` and `grassland` fields cannot say which of the levee, the open
plain and the backswamp a point is on, and those are three colours inside two hundred metres.

---

## What lives there, and why

Nineteen ranges — the most populous country in the game, where the Oves has ten over two empty
countries and the West Lotharn nine over a mountain range — and the fauna overview says why: "the
river systems of Mittolo and Mithala... are among the richest non-marine waterways on the continent
and support a fauna of corresponding density and variety", and of their birds, "the richest avian
assemblage documented on the continent".

| zone | species | where | why |
|---|---|---|---|
| `mithala-meeting-otters` | otter | the meeting of the arms | the overview puts otters on the whole Lizeem system; three channels meet here and every fish on the plain passes |
| `south-mithala-buffalo` | **frostback** | the flood plain's levee backs | the lore's own ground for the animal |
| `south-mithala-herons` | wading-bird | the main channel's upper reach | the Lizeem distributaries are the assemblage's own ground: **not an extension** |
| `apron-hares` | upland-hare | the apron's swells | the only ground dry every year and higher than the grass round it |
| `south-mithala-vulture` | turkey-vulture, 40 m up | over the buffalo | the overview's **black soar-bird**, which follows the herds; the rig is a stand-in and says so |
| `west-mithala-buffalo` | **frostback** | the upper grass | "west through the mineral-rich Celder river terraces in some years" |
| `west-mithala-harrier` | harrier, 9 m, quartering | the upper prairie | extension: a hundred square miles of tall grass with no tree in it |
| `west-arm-fox` | river-fox | the west arm | the *vel-caric*; the only animal here that looks at a traveler instead of leaving |
| `west-mithala-hares` | upland-hare | the driest corner | as far from water as it is possible to get in the Mithala, which is two hundred metres |
| `east-mithala-boar` | boar | the backswamps behind the gallery | the **river boar**, "the dominant large predator of the wetlands"; the rig is a woodland pig and is labelled a stand-in |
| `east-mithala-egrets` | egret | the braid bars | the only white thing on the plain |
| `east-mithala-duck` | duck, floating | the main channel's ford | "high flood years correlate with exceptional hunting seasons for waterfowl" |
| `east-mithala-deer` | red-deer | the open grass behind the gallery | extension: the seam between the Plains' grazers and the forest's deer |
| `river-mouth-stilts` | stilt | the last silt before the beach | where the plain's fresh water meets the sea |
| `north-mithala-geese` | goose | the fen margin | the **black migratory geese**, which "depart in spring toward the north"; the margin is on that road |
| `fen-wading-birds` | wading-bird | the fen | the same assemblage on shallow standing water instead of in a line |
| `north-braid-otters` | otter | the braid below its heads | the system's, and the overview names the system |
| `shelf-buffalo` | **frostback** | the dry shelf above the fen | "north into Henborth only when the thaw... makes the upland pasture worth the risk" |
| `north-mithala-harrier` | harrier | between the fen and the first trees | extension |

Every site was measured on the built world — dry, this plain's own by both `regionAt` and
`hexOwnerAt`, off the water surface, off a summer channel's floor and standable — and every range's
half-diagonal is between 64 and 120 m against `LIFE_REACH`'s 130.

### The one new rig, and the one not spent

**The frostback buffalo.** The brief allowed two new rigs and only where the lore names the animal;
one was spent and it was unavoidable. The overview names this one and places it *here*: "a heavy wild
bovid of the Mithsla and Celder plains whose northern summer circuit sometimes reaches Henborth" —
this plain, between exactly those two countries. It is **wild and nobody's**, which is the lore's own
emphasis and the reason a country built with no stock in it can carry a bovid at all: "Frostbacks are
not domestic tallhorns gone wild and are not considered available breeding stock by Plains herders,
though outside livestock speculators have repeatedly tried to make them into both."

It is built from the longhorn's parts and nothing like its silhouette: a wedge, with everything in
front of the forelegs and very little behind them, a hump of shoulder that is the highest point of
the animal, a pale ridge of cold-season hair along the spine, legs a fifth shorter, and blunt horns
that go forward and stop — no sweep and no upward hook, which is the whole of how a frostback is told
from a tallhorn at any distance. The head carries its own neck (the Nethrani beast's lesson) and
`GRAZER_RIG`'s `neck`/`high` are the shoulder joint at the top of the hump. It is in the `CATTLE`
set, which is really "too big to bolt": head up, turn, and give ground at a shade over a walk, which
is the lore's "a permanent hazard that one has learned to navigate rather than eliminate".

**Three bands, one to a country**, which is what a species with a continental circuit looks like on a
map that only shows one plain.

**The second rig was not spent.** The overview's other named Plains animals want gaits the game has
not got — the hunt-hound's coordinated pack, the grey grass-lion's stillness-then-rush — or are fish
(the broad-backed carp, the channel hunters). **The three Plains predators are deliberately absent**,
and not from squeamishness: every animal in this system is ambient and can neither attack nor be
attacked, and a grass-lion standing in the open and backing off at a walk is a worse lie about the
animal than leaving it out.

**No domestic stock.** The **river-horn** — the wetland cattle that pull the harrows through flooded
fields and are "the primary rural wealth indicator in the valley communities" — is the animal this
plain is really about, and it belongs to households: "A household with grain but no river-horn is not
considered fully established by Mithala standards." A herd with nobody near it is still somebody's
herd, so there is none.

---

## Names, and the sky, and the speech

**Nothing is coined.** `world-builder/azhoran_language_profiles.py` has no Mithali profile at all —
Mithala appears only as an *inspiration* in the Grassic and Bouéni lists, which are two other
peoples' grammars — and the lore is explicit that the name itself is substrate: "The word does not
decompose cleanly in any Mittoli root system... The Academy's linguistic file on it has been growing
for two centuries and has not produced a consensus etymology." A name built out of Mittoli roots
would contradict the lore it was meant to serve, exactly as it would in the Lotharn. So everything is
either the lore's own word — the north braid, the main channel, the Mithala — or plain English: the
meeting of the arms, the west arm, the Celder water, the east head, the cross braid, the fan, the
apron, the levees, the shelf, the fen margin, the round horizon, the river mouth.

**One sky over all four.** It is the one thing the lore insists on — "The Mithala is known for its
sky... the sky is large here because there is nothing to interrupt it, and a sky that is large
behaves differently: weather comes from further away, the approach of storm is visible long in
advance." The case for one rather than four is the case for one terrain profile: this is one plain
with four names on it, and a horizon that changed at an internal border would be a lie about a
country whose whole point is that the horizon does not change. The case for four would have been the
climate, and the climate is one code. So: background `0xa6cde4`, haze `0xccd2ba`, density **.0038** —
the clearest air of any green country in the game and second only to the Oves Desert's .0034 and the
West Lotharn's .0027, both of which have a reason of their own. A bluer background than anything else
at this height, and a haze that is warm rather than cool, because what hangs over this plain in July
is the dust of grain land and not sea mist.

**One dialect, `mithali`, Mittoli in family.** `mithala.md` names it: "recognizable to a speaker of
Standard Mittoli — but old enough in their divergence to cause significant comprehension problems in
rapid speech", which makes it the most divergent Mittoli in the game. Dividing it by country would
invent a division the lore denies: "Mithala people do not generally call themselves Mithala people;
they call themselves people of the Olveth Arm or the Minoran plain... your identity is your channel,
because your channel is your flood timing, your water rights, your grain calendar, your neighbors."
The divisions here are channels, which run across all four borders and none of which is a country.
Its weight is in two places, both the lore's: **the sky**, with single terms for cloud at a stated
height and for a star in a stated place in a stated season, which the continent's oldest astronomy
came out of and cannot be read without; and **the flood**, with *moravel*, "the grain-attention", and
the proverb *Vet mithalan, vel noreth* — "the flood returns, the grain does not ask".

---

## The lore, adjusted to the atlas

`world-builder/azhora_lore/geography/regions/mithala.md` was read in full and **nothing in it
contradicts the atlas**, so nothing was adjusted and nothing was written in the World Builder repo.
The three things worth recording, because a later builder will wonder:

1. **Minora is off the atlas**, like Nylon and the Ibenwood: the lore puts it "at the first fork of
   the Lizeem, where the river commits to the plain", at the plain's western entrance, and the survey
   window stops before it. West Mithala is the ground below it and has no fork in it.
2. **The lore's "two main arms" are on the ground** — the west arm and the north braid — but they
   *meet* rather than *fork*, because this ground is downstream of Minora and the lore's own next
   sentence is that the channels gather again as they approach the sea.
3. **"Mithsla"** in `fauna/azhoran_fauna_overview.md` is this plain: the frostback's range is given as
   "the Mithsla and Celder plains... north into Henborth", which is exactly where the atlas puts the
   Mithala, between Celder and Henborth. It is read as a variant spelling and not adjusted.

---

## Registration

`scripts/build-region-survey.mjs` PLAYABLE + `WINDOW.minR` 90 → 79 + `ENCLOSED_LAKES` →
`ENCLOSED_HEXES` → `node scripts/build-region-survey.mjs` ·
`scripts/build-region-rivers.mjs` RIVER_REGIONS → `node scripts/build-region-rivers.mjs` ·
`src/world/terrain/region-layout.js` PLAYABLE_REGIONS + four REGION_BIOMES ·
`src/world/terrain/region-world.js` REGION_IDS 28–31, four REGION_TERRAIN, four REGION_TEXT (subtitle, spawn,
description, palette with the shared sky, `npcIds: []`, eighteen landmarks between them) ·
`src/gameplay/skills/languages.js` (`mithali` and four `spoken` entries) ·
`src/dev/tools/developer-atlas.js` (four anchors, one middle hex each) ·
`src/ui/map/map-fog.js` (seventeen areas; the least contained, the meeting's, is 64 % inside its own country
and the rest 76 % or better) ·
`src/dev/tools/build-status.js` (four `early` entries) ·
`src/content/regions/western-regions/west-regions.js` (`chainBetween`, eight courses, two braids, `WEST_RIVERS`, `WEST_REGION_NAMES`) ·
`src/content/regions/western-regions/west-ground.js` (`mithalaGround` wrapping `westGround` and `baseBeforeWater`, which is how it
reaches `src/world/terrain/world-terrain.js`'s chain — the West Lotharn's own hook, and a wrapper rather than an
addend because the swale reshapes the ground it is handed) ·
`src/world/terrain/world-terrain.js` (`mithalaTint` in `groundTint`) ·
`src/world.js` (scenery, landmarks, metrics, update) ·
`src/content/regions/mithala/mithala-world.js`, `src/content/regions/mithala/mithala-scenery.js`, `src/content/regions/mithala/mithala-wildlife.js` ·
`src/content/regions/western-regions/west-regions-life.js` (the frostback rig, four behaviour tables, the zones) ·
`tests/mithala-world.test.js` · `package.json` · this report · `docs/design-answers.md`.

`src/world/terrain/region-levels.js` already carried all four (3, 3, 4, 4) and was not touched.

---

## Tests

Everything below was run with `node --test tests/<name>.test.js`. `npm test` was not run: the script
exceeds the Windows command-line limit on this machine.

**New:** `tests/mithala-world.test.js`, fourteen tests, all passing, added to `package.json`.

**The brief's list.** Every one of them passes except the two the brief names as known-failing on
this base and one more that is also pre-existing:

* passing: west-lotharn-world, west-lotharn-peaks, east-lotharn-world, east-lotharn-peaks, oves-world,
  gala-world, ascarth-world, eer-world, isareos-world, nethereum-world, izol-world, feradom-world,
  region-layout, region-survey, regions-world, developer-atlas, map-fog, region-sky, languages,
  region-levels, **open-country**, town-life, closed-border, climbing, terrain-fall, drawn-ground,
  cartography, and the neighbours' own: vastos-world, meneth-world, caricas-world, nesdor-world,
  pueth-world, west-rivers;
* **`south-suval-world`** fails on the Stillwater — a regex against `src/main.js`, which this build
  never touched, and which the brief names as pre-existing;
* `west-life`, `regional-wildlife`, `chameleon`, `amod-world` and `elagos-world` are the others the
  brief names; see below for west-life.

**`open-country` passed untouched**, which is a first for a region this size: none of its probes
stands on the Mithala plain. Three different regions have taken one of those probes; this one takes
none, because the plain is a long way from every one of them.

### The stale lists that were found and moved

**Seven**, three of them beyond the ones the brief named.

1. **`tests/region-layout.test.js`** — the world-box guard, `< 37` hexes tall and `> 36.9`, now
   `< 46` and `> 45.6` with each of the four countries' case stated.
2. **`tests/isareos-world.test.js`** — `|tall − 37.00| < .05`, now 45.66.
3. **`tests/nethereum-world.test.js`** — the same, now 45.66.
4. **`tests/ascarth-world.test.js`** — *not named by the brief.* A **fourth** copy of the world box,
   inside the test that measures the survey window at the southern end. It now pins the southern edge
   outright — which is the number this country actually set — asserts the new height, and checks
   `WINDOW.minR` as well as `maxR`, so the next builder who moves either end meets it.
5. **`tests/west-lotharn-world.test.js`** — *not named by the brief*, and **two** stale lists in one
   file. Its world-box test pinned `minZ` to the digit and was called "the world box does not grow,
   which is a first for a region this size"; it is now "this country does not grow the world box, and
   the four north of it do", and holds both facts. And its registration test asserted
   `PLAYABLE_REGIONS.at(-1) === 'West Lotharn Mountains'` — the same "last in the order" assertion the
   West Lotharn builder found in `tests/oves-world.test.js` and rewrote, reintroduced one file over.
   It now asserts that every region after it carries a higher id, which is what it always meant.
6. **`tests/region-sky.test.js`** and **`tests/eer-world.test.js`** — the two copies of the `OWN_SKY`
   allow-list, both extended. The West Lotharn builder found this pair; it is still a pair.
7. **`tests/west-lotharn-world.test.js`**, again — *not a list but a stale probe*, and the exact
   pattern `open-country` is warned about. Its north valley test measured the valley's walls at
   30, 90 and **150 m** of a 151 m line — the mouth — and the northern wall it found there was made
   of unbuilt outland. With South Mithala registered that ground is a river plain at 28 m, six metres
   *below* the valley floor, and the wall is gone because the valley has arrived where it was going.
   The probe reads at 130 m now, the last station still inside the range, and the mouth is asserted
   **open onto South Mithala** instead, which is what the lore says the north valley does.

### One fix to somebody else's country

`tests/isareos-world.test.js` failed on "1 things of Isareos's stand on Isamouth's ground". Traced:
growing the world north moves `landDistance` by a fraction of a metre a long way off, which re-rolled
one seeded scatter stream, and **`src/content/regions/western-regions/west-regions-scenery.js` checked `atIsamouth` for a thorn
thicket's parent bush but not for its three or four members**, which are thrown up to five metres out
from it. A parent standing just outside the 62 m circle put one member 60.7 m from its centre. It had
never happened; it would have happened to whoever next changed the world. The check is now made for
the members too, with a comment saying why.

### `west-life`, and the one range of this build that failed it

Run, and **one of the four failures was this build's**. `the river fox never flees, keeps arm's length
from a walker, and only a run closes on it` named `west-arm-fox`: a walker got within **1.98 m** of a
fox that is supposed to keep two. A fox is the one animal in the game that does not flee — it drifts
back as fast as anybody comes on — so it needs a straight run of clear ground behind it or it is
cornered against the edge of its own range and walked up to, and its first range was a hundred metres
across. Measured across every point beside all eight channels, the most clear westward room any of
them has is **170 m**, at (−1811,−1284) on the west arm, dry and standable the whole way; the range
moved there and the test passes.

The other three are the ones the brief and the West Lotharn's report name as pre-existing on this
base, and each names somebody else's animal:

| test | animal | |
|---|---|---|
| nothing in the west can be walked down | `elagos-meadow-cattle` | named by the brief |
| the quick ones cannot be run down either | `feradom-country-17-98` | shown pre-existing by the West Lotharn builder |
| a chased band is home again in a few minutes | `oveth-herons` | the same |

None of the Mithala's nineteen ranges appears in any of them. Every one is inside `LIFE_REACH` by
10 m or more, every site is on standable ground in its own country by both `regionAt` and
`hexOwnerAt`, and the two harriers and the vulture are in the air.

---

## Review

A hillshade of the whole plain is `tests/artifacts/mithala.png`
(`MAP_LO=0 MAP_HI=26 node scripts/region-map.mjs -2450,-2180,-900,-900 3`), with white dots on the
meeting of the arms and the two arm junctions. What it shows, and what was checked against it:

* **the plain reads as a plain**: one continuous grey field with no relief in it at all, which is
  what half a metre of amplitude over three hundred and twenty looks like from above;
* **the channels are the only thing on it** — eight dark meandering lines, the main one forking into
  its braid threads over most of its length and gathering again at the mouth;
* **the sea is at the eastern edge** and the river goes into it;
* **the mountains are along the south** and stand over the plain as a wall;
* **the red ring round the outside** is the outland margin — ground the climbing rule calls too
  steep — and is the rib measured above. Inside the plain's own hexes there is no red anywhere.

**Eight review views were photographed** with
`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=..."`, after the
last scenery change, with no errors: `mithala-main-channel`, `mithala-gallery`, `mithala-meeting`,
`mithala-horizon`, `mithala-apron`, `mithala-summer-channel`, `mithala-fen`, `mithala-braid`. They
are in `src/main.js` and every one is worked out from the country’s own numbers — a point along a
course’s sample line, a step off it by its own normal, or a landmark — so a view cannot drift off the
thing it shows when a channel or a landform moves. Images: `tests/artifacts/mithala-*.jpg`.

What they showed, and what was changed because of them:

* **the plain reads as a plain**, and the round horizon is the picture that proves it: a flat field
  of tall grass to a horizon that is a line, with one tree at the edge of sight and the sky taking up
  two thirds of the frame. It is the emptiest picture the game has;
* **the braided reach reads exactly as it was meant to.** The north braid view shows three threads
  running across the plain with bars of grass between them, willow and poplar on the banks, reed at
  the waterlines, and the Lotharn in the haze beyond — which is the country in one image;
* **the summer channel reads**: a line of pale silt plates through the grass with the range’s
  terraced cliffs behind it and a hare in the corner;
* **the apron reads as the only rise on the plain**, with the gallery marking the channel along the
  top of it;
* **the fen margin reads as nothing happening**, which is right: the grass shortens, sedge comes up,
  and low ground goes on to a horizon with no line on it anywhere;
* **four things were wrong and were fixed by looking**:
  * **the ground was two stops too pale**, which is the Meneth lesson again — a lightness picked in
    sRGB comes back pale through the renderer’s working space. All nine swatches, the four palettes,
    the levee/basin/fen tints, the grass’s HSL and the forbs went down about fifteen per cent;
  * **the silt read as stepping stones**: the plates on a summer channel’s floor and the bars in the
    braids were both about twice the size they should be, and are smaller and flatter now;
  * **the water read as tarmac**: the channel shader was darker than the Oveth’s and is lighter now;
  * **the main-channel view took three tries, and both failures are facts about the country.**
    Looking *along* the channel from its bank put the camera on the water and filled the frame with
    it. Standing on the levee at eye height and looking across showed **no river at all** — because a
    levee stands a pace and a half over a channel cut a metre into a plain with no relief in it,
    which is precisely why the lore’s villages are on the banks and why the gallery is how a
    traveler finds the water. The view stands above the levee now and looks down into the channel.

## Open questions

1. **The outland ribs, again.** 4.38 m of step in two metres at the worst margin point, where the
   blend is two thirds `outland` at amplitude 6 and wavelength 150 against this plain's .5 and 320.
   It is an order of magnitude gentler than the West Lotharn's 25.8 because this country is flat, but
   it is the same defect and it will not be cured region by region: it wants one change in `relief()`
   or `terrainMix` and a world-wide re-measure. Six unbuilt neighbours here will each take a bite out
   of it when they are built.
2. **The West Lotharn's north-eastern cliff band moved 46 m.** Nothing of this country's is written
   there — the check is exact — but its hex blend changed from outland to a plain and its own cliff
   machinery turned a few metres of base into a whole riser. Its tests all pass and the crest is
   where it was. Whether a range should be that sensitive to what is registered next door is a
   question for `terrace()` and not for this build, and it is the same family as the West Lotharn's
   own open question 6.
3. **The main channel is a wall for sixteen hex edges.** South Mithala and East Mithala can only be
   walked between by going round the meeting. That is right — the lore's whole social geography is
   which channel you are on — but on this plain the answer in the world is a **ferry or a ford**, and
   both are somebody's. It belongs to whoever builds the people. The winter answer is that the
   channel freezes.
4. **What winter does to this plain** is the largest open question in the game after seasons
   themselves, and it is set out above. The ground is already shaped for the flood: raise the water
   a metre and a half and everything between the channels is under it and every levee is dry.
5. **Minora, and the river-city.** The meeting of the arms is where the campaign puts an unbuilt
   city, and the ground inside the fork is deliberately empty and level. Minora itself is off the
   atlas at the western entrance, which means West Mithala's own western horizon is a city nobody can
   see.
6. **The Acorwood and the Acor Wetlands.** The plain's northern horizon is now land — 329 hexes of
   it — and none of it is built. The margin is drawn as far as this country's own hexes go: saplings
   standing in the grass and sedge coming up through it, with nothing beyond. Whoever builds either
   neighbour inherits a margin already shaped to meet them.
7. **`hexOwnerAt` and the enclosed hex.** Two hexes on the whole atlas are unclaimed inside a single
   region and both are now held. A third could appear whenever the World Builder map is re-exported,
   and nothing warns about it: a check in `scripts/build-region-survey.mjs` that fails when an
   unclaimed hex is found ringed by one region would have caught this one before it was a pond.
