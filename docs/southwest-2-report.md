# The southwest, job 2 of 4: the four Meroshe deserts

Built 2026-09-30 on branch `southwest-2` (worktree `azhora-game-southwest-2`, from `southwest-1`
9fd150f), to `docs/southwest-2-brief.md`. **Terrain, climate, water, scenery and wildlife, and
nothing that belongs to anybody.** The Moreshi oasis houses and their water rights, the caravan
routes across the sand sea and the local knowledge that makes them survivable, the Route Registry's
crossing guidance, the plateau road above the fan skirt with its garrison and its cisterns, the
canyon communities south and east of here, and every dustback in the desert: none of it is built.
Left uncommitted, as the brief asks.

**Ninety-five hexes, one terrain word and one climate code** — `plains` on every hex and `BWh` on
every hex, the largest single-character expanse the atlas draws anywhere — and that is the whole
problem of the job and the whole of what this report is about.

Three things came out that nobody expected. **The world box grew, and not west** — the brief
predicted no movement at all and was right about the west and wrong about the south. **Every
hot-desert hex on the claimed atlas is in this one quarter of the continent**; these ninety-five are
thirty-nine per cent of all the desert there is. And **`southwestTint` had never reached the screen**:
job 1's ground-colour hook is computed in `groundTint` and then dropped on the floor, which nobody
could have noticed until a job arrived whose four countries could only be told apart by their colour.
One `else if` fixes it, and job 1's four countries look different today from every screenshot in its
report.

---

## The design question: how ninety-five hexes of one climate stay worth crossing

The brief asked for this in so many words, so here it is in so many words.

**Because the atlas's one word `plains` is not one ground, and a hot desert has four.** A desert this
size is not made worth crossing by relief — there is none and inventing some would be a lie about the
map. It is made worth crossing by **what is under your feet changing, and changing what you can do**.
Erg, reg, hamada and sabkha — sand sea, stone pavement, bare rock, salt pan — are the four real
surfaces of a hot desert, they are as different from each other as a forest is from a fen, and the
game had drawn none of them at scale.

The lore hands them over itself, in the one paragraph `moroshe_desert.md` spends on geography, and in
the order the atlas names the quarters:

> The Moroshé is not a single landscape. It ranges from **the rocky hammada of the northern
> transition zone** — flat gravel plains and exposed bedrock where scrubby thorn trees still manage to
> exist — through **the great sand seas of the central interior**, to the canyon country of the south…

So:

| | surface | what it costs | what is on the horizon |
|---|---|---|---|
| **North Meroshe** (36) | **hamada** — bare bedrock under gravel, with nine low escarpments crossing it north and south | you can see for ever and walk anywhere; there is no shade and no soft ground | the Ganesh Plain running out of soil behind you, Marosh's green hills a mile east |
| **West Meroshe** (37) | **fan skirt and salt pan** — coalesced gravel fans off a highland, sorting coarse to fine, with a sabkha at their dead end | the walking is decided by the grain size and changes over four hundred paces | the Dinelv escarpment north, the open western ocean west |
| **Central Meroshe** (38) | **erg** — five ridges of linear dune with dead-flat corridors between them | **you cannot go straight at all**: the corridors run two ways and no other | **nothing**. The one country in Azhora with no horizon |
| **South Meroshe** (39) | **reg** — pebbles packed edge to edge, varnished almost black, under fog | you can walk fast and see twenty miles; the fog takes both away for days | Trogo's rainforest half a mile east, the southern ocean south |

Four things follow from that, and together they are the answer:

1. **Sight distance is the variable, and it is different in each quarter.** On the hamada you see to
   the horizon. In the erg you see a hundred and forty paces, because a six-metre dune is in the
   way, and that is the only place in the game where *flat* country blocks the view. On the reg you see twenty
   miles and there is nothing on any of it. In the fog belt you see six hundred metres and then grey.
2. **The navigation is different in each quarter, and the ground itself is the compass.** The hamada's
   benches strike **north and south** on the dip off the Dinelv highland, which is
   `dinelv_highlands.md`'s own sentence — "a series of ridge systems crosses it from roughly north to
   south". The sand sea's ridges run **north-west to south-east** on the summer wind's bearing, which
   is job 1's `GANESH_WIND.grainBearing` unchanged, because it is the same wind. A traveler who knows
   which way the lines go knows which country they are standing in without looking up.
3. **Each quarter shows exactly one edge of the desert, and the four edges are all different.** That
   is what the atlas is for here: it bothered to name four quarters and it put a different thing
   against each one. North faces a plain and a Mediterranean corner; West faces a highland and an
   ocean; South faces a rainforest and an ocean; and Central faces nothing at all, which is why it is
   the largest of the four and carries one range of animals.
4. **Water is visible three times in ninety-five hexes and drinkable none of them** — the salt crust
   of the Malhat, the fog on the stone floor, and the sea on two sides. That is the desert's own joke
   and it is the lore's: "water is found at depth, in aquifer-fed oases", and the oases are
   somebody's.

**What this job deliberately did not do** is repeat job 1's Ganesh Desert four more times. The Ganesh
is a wind-swept sediment sheet with a grain on it and two dry beds in it; not one of those four things
is here. There is no wash in the Meroshe, no damp reach, no depression, no wind field of three
quarters of a metre. The one thing carried over is the bearing of the wind, because the wind does not
change over seven hundred metres.

---

## What the atlas gave

| | **North Meroshe** (36) | **West Meroshe** (37) | **Central Meroshe** (38) | **South Meroshe** (39) |
|---|---|---|---|---|
| authored hexes | **23**, q −32…−24, r 128…132 | **20**, q −37…−33, r 132…136 | **31**, q −33…−27, r 132…137 | **21**, q −32…−26, r 136…141 |
| terrain | `plains` × 23 | `plains` × 20 | `plains` × 31 | `plains` × 21 |
| climate, per hex | `BWh` × 23 | `BWh` × 20 | `BWh` × 31 | `BWh` × 21 |
| world extent (hex centres) | x −3350…−2700, z 1934…2281 | x −3750…−3300, z 2281…2627 | x −3250…−2650, z 2281…2714 | x −2900…−2500, z 2627…3060 |
| neighbours by shared edge | **Ganesh Plain 10**, Central 11, Dinelv 9, Marosh 7, West 3 | Dinelv 9, Central 7, **sea 10**, Hama 5, North 3 | North 11, South 9, Marosh 8, West 7, Hama 7 | **Trogo 13**, Central 9, Hama 7, **sea 4**, Marosh 3 |
| authored rivers | **none** | **none** | **none** | **none** |
| level (`region-levels.js`) | 3 | 4 | 4 | 4 |

Every number was read off the survey and `tests/southwest-world.test.js` re-derives them.
`src/world/terrain/region-levels.js` and `src/content/chapters/civil-war/campaign-world.js` already carried all four and were not touched.

**Ninety-five hexes and not one odd one.** Job 1's block had three — a `forest` hex and two
`grassland` — and made features of all three. Here there is nothing to make a feature of: no `hills`,
no `grassland`, no `coast`, no `lake`, no river edge. The atlas says the same thing ninety-five times.

---

## The climate read

Read per hex from `world-builder/map/resources/examples/azhora.wwmap` (`hexes[key].climate`,
`koppen-v1` — **not** `azhora.cmap.json`). `MEROSHE_CLIMATE` in `src/content/regions/southwest/southwest-world.js` records all
ninety-five and the test holds them to the map hex for hex whenever the map is on the machine.

**`BWh` × 95.** With job 1's eighty-one that makes **a hundred and seventy-six of this block's two
hundred and two hexes hot desert**, and `SOUTHWEST_CLIMATE` now carries all 202.

**So the climate says nothing at all here, and that is the finding the job turns on.** Job 1's half
has a real gradient and that gradient is its shape — aridity falls from 1.00 in the Ganesh to 0.13 at
the green corner, and the ground colour, the scatter and the wildlife are all sorted by it. This half
is **flat 1.000 on ninety-four of its ninety-five hexes**. The ninety-fifth is the North Meroshe's
(−24,128), its north-eastern tip, at **0.893**, because it stands one hex from the Ganesh Plain's
`Csb` row — so even the single exception is the blend telling the truth about a neighbour rather than
a gradient inside this half.

A field that is 1.00 everywhere sorts nothing. That is why the four quarters are told apart by the
surface and by the edge each one faces, and it is why `southwest-scenery.js` needed a second pass
rather than four more branches in the first one.

**For context, and it is the largest single climate fact in the project so far:** every one of the
**245 `BWh` hexes on the whole claimed atlas is in this one quarter of the continent** — the Dinelv
Highlands 35, these four 95, the Ganesh Desert 31, the Ganesh Plain 23, Navarth 20, Cape Heth 18,
Hama 10, West Pyros 7, the Aurumlis 6. There is no other desert in Azhora. The Oves Desert's report
noted that the map's author "had `BWh` available for true desert and used it 245 times elsewhere";
*elsewhere* is here, all of it, and the four Meroshe quarters are thirty-nine per cent of it.

---

## Water, and the two shores

**The atlas draws no watercourse anywhere in the Meroshe.** Checked: 572 river edges on the whole
map and **not one of them touches any of the ninety-five hexes**. The nearest are three small edges
in Marosh, two hexes east of the North Meroshe, and four in Trogo, one hex south-east of the South.
So the desert is ringed by water it does not get, which is the honest reading and the lore's own.
Nothing wet is built: **the Malhat is a salt crust and not a water surface**, and the test asserts
`westWaterSurface` is `null` on every one of the ninety-five hexes and at the pan's own centre.

**The west and south edges are sea, not merely unclaimed land** — the brief asked for this
explicitly and here is the measurement. The West Meroshe's ten sea edges are **six `coast` hexes**
(−38,133) through (−38,137) and (−37,137), and the South Meroshe's four are **three**: (−33,142),
(−32,142), (−31,142). Every one reads `coast` on the World Builder map, and the column and the row
beyond them read `ocean`. The North and the Central have **no** sea edge at all: their unbuilt
neighbours are the Dinelv Highlands' `hills` and Marosh's, which is land.

So **the driest ground in Azhora runs out at an open ocean twice more.** Job 1 found it once, at the
Ganesh's sheltered gulf, and called it the most striking fact in the southwest. This is the same thing
on the **open western sea** — `hama.md`: "the western face is open-ocean coast, exposed to the weather
patterns that originate in the far west and arrive at the peninsula having crossed considerable
water" — and on the southern ocean. The ground a hundred paces inland of either surf is as arid as
the ground twenty miles in, and the aridity test asserts exactly that on every shore hex.

**The block's datum is unchanged and is job 1's**: the gulf at the Ganesh Desert's north-west and the
Vaellir's mouth at West Pyros's tip. What this job adds is two more places where the same datum is a
fact rather than a choice, and everything here is measured up from them. Measured on the built ground,
the western shore runs 0 m at the waterline, **0.99 m twelve metres in, 2.56 at twenty-two, 6.16 at
fifty-one and 10.41 at a hundred and thirty** — a gravel beach on a desert, which is what a coastal
desert's shore is.

---

## The ground

### Bases, and why they say so little

| country | terrain | base | amplitude | wavelength | measured mean | measured range |
|---|---|---|---|---|---|---|
| **North Meroshe** | `plains` | **21** | 1.15 | **320** | **17.44 m** | 15.1 – 20.0 |
| **West Meroshe** | `plains` | **14** | .85 | **320** | **9.32** | 5.8 – 14.2 |
| **Central Meroshe** | `plains` | **16** | .55 | **320** | **10.17** | 6.9 – 16.8 (18.4 on a crest) |
| **South Meroshe** | `plains` | **14** | .6 | **320** | **5.97** | 3.4 – 7.7 |
| *for comparison:* Ganesh Plain | `plains` | 22 | .85 | 320 | 18.97 | 15.6 – 21.7 |
| *for comparison:* Ganesh Desert | `plains` | 20 | .9 | 320 | 14.23 | 6.2 – 25.4 |

**Every profile is on wavelength 320**, which is job 1's, Gala's, the Oves's, the Mithala's and the
Ascarths', for the reason they all give: `relief()` takes its phase from x / wave, the hex blend mixes
the wavelengths, and a country on another wave chirps the phase of every sine within reach of its
border. These four share **thirty** internal hex edges with each other and **ten** with the Ganesh
Plain, and one wave over all of them is what makes those forty edges invisible.

**The amplitudes are the reverse of every mountain country in the game, and deliberately.** Elsewhere
the profile table carries the country's character; here it cannot, because the atlas writes the same
word ninety-five times. So the amplitude only says **how rough the floor is between the landforms**:
the North is the roughest of the four at 1.15 because bare bedrock with hard beds standing out of it
is the one desert surface that is not a sheet, and the Central at 0.55 is the **smoothest ground in
the game away from its dunes**, because an interdune corridor is gravel swept flat by the same wind
that piled the ridge beside it. South at 0.6 is a stone pavement, which is what a desert looks like
when everything loose has already gone.

### The fall: one plane extended, and two ramps

* **`SOUTHWEST_TILT` was extended rather than replaced.** Job 1's single plane toward the Vaellir's
  mouth now runs over all eight countries, and it is the whole of what the Meroshe gets for a general
  fall: 4.0 m down at the Ganesh Plain seam, 5.6 at the middle of the sand sea, 8.7 at the South
  Meroshe's own shore. A second plane meeting job 1's at the seam would have put a change of gradient
  into the ten hex edges that seam is made of, which is the Mithala's argument for one plane and it
  holds twice as far now.
* **`merosheSkirt`** — the West Meroshe's own fall to the western ocean, **seven metres over four
  hundred and thirty**, because the plane rises westward and this country's outlet is west.
  `ganeshBasin`'s rule: a **one-sided ramp and not a plane**, nought along the margin against the sand
  sea and its full drop at the shore, so there is no ridge anywhere and the divide between the two
  drainages is something a traveler walks over without seeing it. **It lets go at the shore**, which
  the swale taught and which this job re-learned the hard way: the coast field has already blended the
  last forty metres down to the beach before `southwestGround` sees the ground, so seven metres laid
  on top of that put the West Meroshe's own westernmost hex centres **four metres under the sea**. It
  holds its full drop to thirty-four metres inland and releases over the last six.
* **`merosheSink`** — the Central Meroshe's shallow closed basin, three and a half metres over six
  hundred, with no rim: an erg is not sand blown onto a plain, it is sand that had nowhere left to go,
  and the atlas draws the basin by giving this country a hamada on the north, a highland skirt on the
  west, a stone floor on the south, Marosh's hills on the east and **no river edge at all**.
* **North and South have no fall of their own**, and that is the point of both: the North is the high
  floor everything drains off, and the South's outlet is the southern ocean, which is the way the
  plane already falls.

### The four surfaces as landforms

**`MEROSHE_BENCHES` (North) — the hamada.** Nine straight escarpments striking **north and south**,
one to two metres of riser over sixteen metres on the **west** side (the beds dip away from the
highland) and then a long back slope decaying over a hundred and ten. Taken as a **maximum and not a
sum**, which is `ovesRim`'s rule: nine benches ninety metres apart make a stepped floor and not a
staircase nine risers high. Measured on the built ground the whole field runs **0.00 to 2.00 m** —
more than job 1's wind field at three quarters of a metre, and a long way short of a landform.

**`MEROSHE_SKIRT`, `MEROSHE_FANS`, `MEROSHE_SALT` (West) — the bajada and the sabkha.** Three fan
apexes on the Dinelv margin, each spreading south-west through a sector, **taken as a maximum** again
because two overlapping fans make one longer apron and not a cone twice as high. They are small on
purpose — 4.2 to 5.0 m at the apex against the skirt's seven — because what they are *for* is the
grain size: `merosheFan` reads 1 at an apex and 0 at a toe, and the scatter puts cobbles a hand across
at one end and dust at the other. **That sorting is the whole of what this country is**, and it is
what water coming down twice in a decade actually leaves.

The **Malhat** is a **levelled floor and not a bowl**, applied as a `lerp` toward a plane in
`southwestGround` rather than added as a cut, because a playa is flat to the centimetre over hundreds
of metres and a smooth depression of the same depth reads as a hollow in a field. Measured: its floor
varies **under 0.12 m across three hundred metres** and stands at **6.91 m**, which is the designed
surface at its own centre less 1.1 — the module measures that itself rather than carrying a typed
number. Nothing roots in it: `southwestClear` is true on the crust.

**`MEROSHE_SINK` + `MEROSHE_DUNES` (Central) — the erg.** Linear ridges on `GANESH_WIND.grainBearing`
(−0.71 rad, out of the north-west), at a wavelength of **140 m** and **6 m** crest to floor, with a
cross-section that is deliberately mostly floor: **48 % of every wavelength is dead-flat corridor**
(67 m of it), then 59 m of windward rise at about six degrees, then a lee face of 14 m at
twenty-three.

**The wavelength is a measurement and it was wrong once.** Real linear dunes are fifty metres high
and a mile and a half apart, one in thirty, and that ratio at this scale gave 230 m and 7 m — correct
arithmetic, and the hillshade came back with **two ridges in the whole country**, which is not a sand
sea. A country six hundred metres across has to fit enough of them to be a field, so the spacing came
down to **140 m** (still one in twenty-three, still a real erg's ratio) and the envelope was widened
with it. The second hillshade shows five parallel ridges with corridors between them, which is the
thing.

**The field has an edge, because an erg does**: `merosheErg` is full inside about four fifths of the
sink and gone a little past its rim. Measured on the built ground: the dune field is at full strength
over **75 %** of the country and above two fifths over **87 %**; the tallest dune stands **6.00 m**;
and **60 %** of the country is corridor floor a traveler can walk fast on. The outer corners are sheet
sand with low ridges in them, which is where you stand to look at the thing.

**`merosheFog` + `merosheVarnish` (South) — the reg under the fog.** Two fronts taken as a maximum,
one off the southern ocean and one off the Trogo margin, from `trogo.md`'s own sentence: "where desert
air meets ocean-loaded humidity along the southeastern ridge, fog forms and stays, sometimes for days…
warm and thick and close". Measured, the field runs **0.00 to 1.00** across the country — the
south-eastern corner is fog and the north-western one, against Hama and the sand sea, is not — and the
varnish (which is what a stable old desert surface does: a film of iron and manganese that only forms
where the surface never moves) is read off it, so the pavement is darkest where the fog is. The game
has no weather, so what is drawn is what the fog leaves: a crust, lichen in the lee of every pebble,
and the only thorn scrub in the Meroshe that stands close enough together to walk round.

---

## The seams

### The Ganesh Plain seam: the flattest in the block, and its divide did not move

Ten hex edges, and the only seam in this job with a built country on the other side of it. The brief
asked for three things back and this is all three, measured side by side against the same ground built
**without** the Meroshe at all (`git archive` of 9fd150f into a scratch tree, run in parallel):

| | base (no Meroshe) | now |
|---|---|---|
| upper channel, head → mouth | 19.40 → 17.80, **fall 1.60** | 19.40 → 17.80, **fall 1.60** |
| middle channel | 19.62 → 16.61, **fall 3.00** | 19.62 → 16.61, **fall 3.00** |
| sea channel (the one that runs east) | 20.86 → 16.79, **fall 4.07** | 20.86 → 16.79, **fall 4.07** |
| divide crest along z = 1790 | x = **−2800** (20.78 m) | x = **−2800** (20.78 m) |
| divide crest along z = 1730 | x = **−2735** (19.78 m) | x = **−2735** (19.78 m) |

**The divide did not move**, and the three channels fall to the centimetre as they fell. All three
still run the way job 1 sent them, two west into the Ganesh and the third east to the sea.

**What did move is the plain's own southern margin, and upward.** Its hex-centre mean goes from
**18.670 m to 18.971** (+0.30), because the row of hexes south of it stopped being `outland` at base
11.5 and became the hamada at 21. That is the rib at that margin disappearing, which is what building
a neighbour is for.

The seam itself is **0.27 m of step in two metres** — a plain of clay at 22 meeting a rock floor at 21
on the same wavelength, with the block's own tilt running through both. It is **the flattest of the
block's ten internal seams**, a third of the next flattest and a ninth of the Navarth rim, and a
traveler walks over it without anything to notice but the stone coming up through the dust.

### The internal seams, all ten

| seam | edges | steepest 2 m step |
|---|---|---|
| **Central \| North Meroshe** | 11 | **2.44 m** — a dune crest on the border, which is a landform |
| **Central \| West Meroshe** | 7 | **2.27** — the same |
| Ganesh Desert \| Navarth | 11 | 2.19 — the Navarth rim, which is also a landform |
| Navarth \| West Pyros | 13 | 1.92 |
| Ganesh Plain \| Navarth | 1 | 1.90 |
| **Central \| South Meroshe** | 9 | **1.29** |
| Ganesh Desert \| Ganesh Plain | 6 | 0.94 |
| Ganesh Plain \| West Pyros | 15 | 0.83 |
| **North \| West Meroshe** | 3 | **0.39** |
| **Ganesh Plain \| North Meroshe** | 10 | **0.27** |

**The flattest seam in the block is the one between the two jobs, and the two steepest are the sand
sea's**, which is the right way round: a dune field that stops at its country's border puts a
six-metre ridge across a hex edge, and that is a landform and not a defect — the same thing the
Navarth rim does at 2.19. Nothing in the ten is over two and a half metres and the test holds every
one under five. (Job 1's own five read a little lower than its
report records — 2.19 against 4.24 on the Navarth rim, for instance — because the seams are now
measured on a share summed over all eight countries rather than four, which is a stricter gate and
throws out the points nearest the outland. Nothing on job 1's ground moved for it; the measurement
did.)

### The ribs against the outland

| | steepest 2 m step |
|---|---|
| the Meroshe \| open country (every outer margin) | **6.06 m** |
| *inside the Meroshe, blend > .95* | p95 **0.75**, max 2.50 |
| *for comparison:* job 1's block \| open country | 9.13 |
| *for comparison:* Mithala \| open country | 4.38 |
| *for comparison:* West Lotharn \| open country | 25.8 |

Same defect, one third smaller than job 1's: `relief()` takes its phase from x / wave, the blend mixes
the wavelengths, and where this half's 320 meets `outland`'s 150 the phase chirps. It is lower here
because these four are the flattest countries in the game — amplitudes of 0.55 to 1.15 against job
1's 0.9 to 2.8. **The cure belongs in `relief()`/`terrainMix` and is a world-wide job; the brief said
not to chase it and it was not chased.** Four unbuilt neighbours remain on these margins — the Dinelv
Highlands, Marosh, Hama and Trogo — and jobs 3 and 4 build all four, so this rib has one more job to
live and then it is gone.

Inside the Meroshe there is **no red anywhere** on the hillshade and the worst two-metre step on the
block's own ground is **2.50 m**, which is a dune's lee face — the only thing in ninety-five hexes
steep enough to be worth measuring.

---

## The world box grew, and it grew south

**The brief predicted no movement and was right about the west and wrong about the other axis.**

```
before   x -3960.0019279391277 … 609.9980720608719   z -2167.195996001615 … 2398.401076758503
after    x -3960.0019279391277 … 609.9980720608719   z -2167.195996001615 … 3177.823940164498
```

`minX` **does not move**, as the brief expected: the westernmost Meroshe hex is the West Meroshe's
(−37,133) at x = −3750, a hundred and fifty metres inside the edge the Ganesh Desert set. Verified,
not assumed, and the guards that pin it were left exactly as job 1 wrote them.

**What moves is `maxZ`.** The South Meroshe's southernmost hexes are (−32,141) and (−31,141), centres
at z = 3060.089, lower vertices a circumradius (57.735 m) past that at 3117.824, margin 60 → the
southern edge goes to **3177.823940164498** and the world **from 45.656 hexes tall to 53.450**. Each
country's own case, which every guard's comment now states: the North Meroshe reaches z = 2281 and the
West 2627, both inside the box the Ascarth tip already made; the Central reaches 2714 and would have
spent four rows on its own; **the South Meroshe alone spends the last three**. The world is **45.70 by
53.450** — taller than it is wide for the first time since the Ascarths, and there is no longer a
direction a playable country has not spent.

### `WINDOW`: both axes, and only one country reached

`maxR` 135 → **144** and `minQ` −41 → **−45**, both measured off the coast lattice by sampling all
**1,192 × 1,386 = 1,652,112** points and collecting every hex any sample falls in.

**`minQ` moved without anything reaching west**, which is new and worth writing down: x = W(q + r/2),
so a lattice nine rows further south reaches four columns further west at the same world x. The
columns at q = −45 are reached only on rows 142–144, in the far south-western corner. It is the mirror
of the fact job 1's measurement noted about `maxQ` and the Mithala's about `minQ`.

### What the widening pulled in — and this time a third of it is the block's own

**143 claimed hexes in seven countries** turned from sea into land, and `LAND_HEXES` went from 1,935
to **2,078**:

| | | |
|---|---|---|
| Babon **50** | Trogo 29 | **South Meroshe Desert 21** |
| Hama 19 | Azhor Stones 12 | **Central Meroshe Desert 8** |
| **West Meroshe Desert 4** | | |

**Thirty-three of the 143 are the block's own**, and job 1's 71 did not include one of its own. That
is the difference and it is the reason this widening was not optional: the whole of the South Meroshe
Desert, eight hexes of the Central and four of the West lie south of row 135, and without the window
moving they would have been **open water in the middle of a playable country**.

### The world-box guards that moved — ten files

| file | was | now |
|---|---|---|
| `tests/region-layout.test.js` | one guard for both axes, `< 46` hexes and `> 45.6` | split: **`< 46` / `> 45.6` wide** and **`< 54` / `> 53.4` tall**, with each of the four countries' case stated |
| `tests/ascarth-world.test.js` | `maxZ === 2398.401`, `tall = 45.656`, lattice row `=== 135` | **3177.824**, **53.450**, **144**, and it now says the peninsula no longer sets the edge |
| `tests/izol-world.test.js` | `maxZ > 2200 && maxZ < 2420` | `> 2200`, plus the exact edge and whose it is |
| `tests/mithala-world.test.js` | `tall = 45.656`, `maxZ === 2398.401`, `WINDOW.maxR === 135` | **53.450**, **3177.824**, **144** |
| `tests/west-lotharn-world.test.js` | `maxZ === 2398.401` | **3177.824**, and the comment now holds four facts |
| `tests/isareos-world.test.js` | `\|tall − 45.66\| < .05` | **53.450** |
| `tests/nethereum-world.test.js` | the same | **the same, moved** |
| `tests/southwest-world.test.js` | job 1's whole box + window test | rewritten for both jobs |
| `tests/region-sky.test.js` + `tests/eer-world.test.js` | the two copies of `OWN_SKY` | both extended |

---

## What grows

`src/content/regions/southwest/southwest-scenery.js`, extended with **a second pass of its own** rather than four more branches
in job 1's loop, and the reason is the climate read: job 1's loop sorts by how dry the air is and
where the wind has left sediment, and on these ninety-five hexes aridity is 1.00 and there is no wind
field. Keeping the two passes apart also keeps job 1's loop at exactly a hundred and seven cells, so
**the seeded stream its scatter was drawn from is the same stream to the draw**.

| surface | what is laid on it |
|---|---|
| **hamada** (North) | bedrock slabs, dense and crowding along every riser (`merosheBench().edge`); angular grit in the joints between them; **thorn trees in the joints of the risers**, three to six metres, far apart — the only trees in ninety-five hexes; a little grey thorn scrub and bleached stubble in the lee of the steps |
| **fan skirt** (West) | cobbles whose **size and density are read off `merosheFan`** — a hand across at the apex, pebbles halfway, and fine pale dust plates at the toe; a very little scrub on the fine ground between the fans; shingle on the last thirty metres before the surf |
| **the Malhat** (West) | a salt crust of flat white plates, and the **polygonal ridges** where the crust has buckled, laid on a coarse lattice because a crust cracks into plates a few metres across. Nothing else at all |
| **erg** (Central) | **wind ripples** lying across the ridges on the dune field's own normal, dense on the sand and absent on the gravel; **swept gravel on the corridor floors**, which is the one thing that tells a traveler through their boots which of the two grounds they are on; and **every plant in the country on the sand sheet at its margin** |
| **reg** (South) | pebbles packed edge to edge, small and flat and very many, **darker where the varnish is**; **lichen in the lee of them wherever the fog reaches**; thorn scrub whose density is the fog squared; bleached stubble; shingle on the southern shore |

**Counts** (`world.southwestMetrics`), job 2's own additions:

| | | | |
|---|---|---|---|
| reg pavement **6,078** | corridor + hamada gravel **5,481** | sand ripples **3,203** | fan cobbles and dust **2,615** |
| bedrock slabs **2,546** | thorn and scrub **2,009** | fog lichen **1,751** | salt crust and ridges **1,052** |
| bleached stubble **671** | shore shingle **182** | **thorn trees 71** | |

**Twenty-one thousand stones and two thousand plants over ninety-five hexes**, ten stones to every
plant, and that ratio is the argument. For scale: job 1's four countries carry 5,527 grass tufts
over 107 hexes and these four carry **none at all** — there is not one blade of grass in the Meroshe,
and the only trees are seventy-one thorns growing out of cracks in the rock.

**Job 1's own scatter moved by three tenths of one per cent, and that is the only thing in the world
that moved.** `createSouthwestScenery` has its own seeded stream, so nothing outside this block can
shift for it at all; inside it, extending `southwestAridity` with ninety-five `BWh` hexes made the
Ganesh Plain's south-eastern corner drier (0.2152 → 0.3080 at (−2650, 1848), and nowhere else changed
by a measurable amount), which moved the plain's grass by **27 tufts, 28 scrub and one stone** out of
five and a half thousand. That is the climate field telling the truth about a neighbour and it is the
whole cost of the extension. The Vaellir's gallery (63), the north wood (119), the washes, the
channels and the damp reach are unchanged to the object.

### The bug the four surfaces found

**`southwestTint` has never reached the screen, and this job is why anybody noticed.**
`groundTint` in `src/world/terrain/world-terrain.js` computes it:

```js
const southwest = oves === null && mithala === null ? southwestTint(x, z, ground) : null;
if (ground === gala) swatch.set(galaGroundColour(x, z));
else if (oves !== null) swatch.set(oves);
else if (mithala !== null) swatch.set(mithala);
else swatch.set(ground);          // <- and `southwest` is dropped on the floor
```

The branch that uses it was never written. So from the day job 1's block was built, `southwestTint`
ran on every ground sample in a hundred and seven hexes and its answer was thrown away: **the Ganesh's
swept floor and its sediment pockets, the green of the Ganesh Plain's depressions, the damp reach and
the two wet corners were all drawn as the flat biome swatch.** Job 1's own report describes all four of
those colours and its review looked at the ground and judged it too pale — which it was, but not for
the reason the report gives.

Job 2 found it because its whole design rests on the ground colour: four countries with one terrain
word and one climate code can only be told apart by the surface, and the first review render came back
with rock, sand, varnished pavement and salt as **one shade of tan**. One `else if` fixes it, and
everything else in that chain is untouched.

**Two consequences worth stating.** Job 1's four countries now look different from every screenshot in
its report, and in the direction that report wanted: the Ganesh's floor changes colour with the wind
field, the depressions are green and the damp reach is greener. And the four Meroshe swatches had to be
re-chosen once the tint actually arrived — the first set were picked to look right in a palette and
came back on screen as sand, so they were pulled a fifth darker and pushed much further apart, which is
job 1's haze lesson applied to the thing job 1's haze lesson was written about.

**The ground's own colour** is `southwestTint`, extended with four more grounds: `rock` (0x67644f,
bedrock under grit — grey, where everything else in the block is warm), `sand` (0x7e7250, clean
quartz, the warmest and lightest ground in the block), `reg` (**0x2b2a23**, varnished pebbles, the
darkest dry ground in the game) and `crust` (0x9c9a89, the salt, the only near-white the block is
allowed). They are all pulled well below the swatch they start from, which is job 1's haze lesson
taken at its word: at .0024 with a warm dust haze, more than half of every pixel past a hundred and
fifty metres is haze rather than ground, so a ground that is honest about a desert on the screen has
to be darker than a desert. The four biome swatches went down with them — `#67634e` for the hamada,
`#655d48` for the fan skirt, `#736a4e` for the sand sea and **`#38372c`** for the stone floor, which is
the darkest ground colour any country in the game has and is what desert varnish looks like.

**And the reg's pebbles are painted a shade *lighter* than the pavement they make** (`#5a574a` and
`#666253` against a `#38372c` ground), which is the reverse of everywhere else in this build and is
the only way a stone floor reads as stones rather than as a flat dark field: the varnish is on the
ground and the tops of the pebbles catch what light there is.

---

## What lives there, and why

**Seven ranges over ninety-five hexes, and five of them are birds in the air.**
`src/content/regions/southwest/southwest-wildlife.js`, spread into `src/content/regions/western-regions/west-regions-life.js` with job 1's seventeen.

| zone | species | where | why |
|---|---|---|---|
| `hamada-bone-birds` | **bone-bird**, 42 m | two, over the rock floor | the lore's own animal on the desert's own northern margin |
| `thorn-ground-hares` | upland-hare | the bench risers where the thorn is | extension: the only woody cover and the only shade in ninety-five hexes |
| `fan-skirt-bone-bird` | **bone-bird**, 40 m | over the fan skirt | "often the first indicator of water" — and the water it circles is the Malhat, which is salt |
| `dry-shore-gulls` | gull | the last thirty metres before the surf | **the richest life in the desert, and it comes out of the sea** |
| `sand-sea-bone-bird` | **bone-bird**, **52 m** | over the erg | **one range in thirty-one hexes, higher than anything else in the southwest** |
| `reg-bone-bird` | **bone-bird**, 38 m | the bare side of the stone floor | one bone-bird in each of the four quarters |
| `fog-margin-hares` | upland-hare | the fog belt | the only reliably damp ground in the Meroshe |

**Sparser per hex than the Ganesh, which was already the sparsest country in the game.** Job 1 carries
three ranges over the Ganesh Desert's thirty-one hexes — 0.097 a hex — and this half carries seven
over ninety-five, **0.074 a hex**, a quarter sparser again, on ground with no green corner and no
permanent water anywhere in it. **Only three of the seven stand on the ground.** The largest of the
four countries carries **one**, fifty-two metres up. The test asserts the per-hex comparison directly
rather than trusting a count.

**The bone-bird is in all four quarters and nothing else is in more than one**, which is the honest
reading of the one direct statement the lore makes about animals here: bone-birds "are the most
visible large animals of the Moroshé from caravan routes". They are what you see; there is nothing
else to see.

**The gulls are the exception that proves the desert.** A cold-current coast against a desert is the
most productive water there is — it is why an Atacama has a shore full of birds and an interior with
nothing in it — so the one place in ninety-five hexes with abundant life is the waterline, and it
faces outward. Forty paces inland of them the ground is as arid as it is twenty miles in.

### No new rig was spent, and that is a finding

Job 1 spent one of its two allowed rigs on the bone-bird and left the second. **This job spent
none**, and every animal the lore names for this desert is still unbuildable for the reason it was:

* the **sand-cat** is "almost entirely nocturnal" and there is no night to be nocturnal in — the Oves
  Desert's open question, still open;
* the **spine lizard** wants a bask-then-dart gait the game has not got, and the lore puts its largest
  forms in canyon country the atlas does not draw on these hexes;
* the **canyon tortoise** is the closest call in the job and the only one that fails on something
  other than the lore. It is named *and* described — "a large, slow-moving grazer of desert seeps and
  seasonal wash vegetation… may live as long as two centuries" — so building it would not invent a
  shape. It fails **the west's own first law**: `tests/west-life.test.js` holds that nothing in the
  west can be walked down, and a tortoise is an animal whose entire character is that it can be.
  Building it would mean changing a law, which is not a builder's decision;
* the desert vipers are "known by description" and by no more than that;
* **the Meroshé dustback is held exactly where job 1 held it.** The lore names it and never describes
  its body, the only dustback the lore *does* describe is a domestic bovid, and inventing a shape for
  a named animal is the user's decision and not a builder's. It stays an open question.

**Nothing domestic.** An oasis house's political standing is measured in dustbacks and the caravans
run on pack animals; every one of those belongs to somebody, and a herd with nobody near it is still
somebody's herd. There is none.

Every site was measured on the built world — dry, this block's own by both `regionAt` and
`hexOwnerAt`, off every water surface, off the salt, standable, two-metre step under 2 m — and every
range's half-diagonal is between **88 and 120 m** against `LIFE_REACH`'s 130.

---

## Names, the skies and the speech

**One name is taken and nothing is coined.** The `moreshi` profile exists in
`world-builder/azhoran_language_profiles.py`, so coining was available; it was not used. The salt pan
is **the Malhat**, which is `maroshi.roots.salt` in `src/gameplay/skills/languages.js` — the tongue's own word for
salt, used as a name the way job 1 used *vaellir*, the Pyrosi for river, for the river. Everything
else is the lore's own technical word (hamada, erg, reg, the sand sea, the fan skirt) or plain
English (the stone steps, the thorn ground, the dust line, the green shoulder, the corridors, the
sink, the sand edge, the fog margin, the dry shore).

**Three skies over four countries, and each is argued from the atlas.**

| | sky | haze | density | why |
|---|---|---|---|---|
| **North + Central Meroshe** | `0xc3d4cc` | `0xc6b996` | **.0024** | job 1's desert sky unchanged: the interior of a hot desert, the clearest air in Azhora |
| **West Meroshe** | `0xbfd0cf` | `0xc4bda6` | **.0032** | ten hex edges of open western ocean; sea air over a desert carries salt and a marine layer |
| **South Meroshe** | `0xbec9c3` | `0xc0bcab` | **.0046** | the fog belt — **the one `BWh` country in Azhora whose air is thicker than the average rather than thinner**, and the only desert in the game a traveler cannot see across |

The case for one sky over all four would have been that it is one climate code. The case for three is
that the atlas puts an ocean on one of them and a rainforest against another, and the game already
changes sky across the thirteen shared edges of Ovesos and the Oves Desert for exactly that reason.
South Meroshe's .0046 is still clearer than the default .0062; it is the only country in the game
where *more* haze is the dry reading.

**Plain Maroshi, and no dialect, and that is a decision rather than a gap.** `moroshe_desert.md` is
emphatic that the desert peoples' speech is the centre of this family and not a margin of it — "the
desert languages… represent a completely separate linguistic lineage that predates any contact with
the western continent" — and `src/gameplay/skills/languages.js`'s own `maroshi` entry already says which end of the
language that is: "the court form is a dialect of Coastal Trade Moreshi; the deep-desert forms are the
conservative ones." A dialect in that file marks a deviation from a centre, and both Maroshi dialects
available are margins: the coastal court form the base tongue carries, and `ganesh`, the northern
contact seam where Moreshi meets Mittoli on the Ganesh Plain. **The Meroshe is neither**, so it speaks
the tongue with no twist on it, and the Ganesh Desert keeps `ganesh` because its own lore gives that
speech to the plain's people rather than to the desert's. It is the argument Navarth got for sharing
West Pyros's dialect, run the other way.

---

## The lore, adjusted to the atlas

Applied **in place** in `world-builder/azhora_lore/geography/regions/moroshe_desert.md` (the write was
allowed; nothing staged, committed or stashed there). **One file for a desert the atlas splits four
ways**, so what the adjustment mostly does is divide what it describes.

1. **"a vast arid interior that dominates the southern half of the continent's eastern face"** → the
   atlas puts the Meroshe in the continent's **south-west**, on and inland of the Dinova Peninsula:
   the four quarters run x 817–1192 of an atlas whose land runs 540–2536. Adjusted to "the southern
   and south-western quarter", with the fact that every hot-desert hex on the atlas is in it.
2. **The three-zone geography became four**, and each is now described as the build draws it: the
   hammada of the north (confirmed, and the atlas puts it exactly where the file does, against the
   Ganesh Plain); the sand seas of the central interior (confirmed, and the atlas supplies the closed
   basin the file does not mention); **the western fan skirt and its salt pan, which the file leaves
   out entirely**; and the stone floor of the south.
3. **"the canyon country of the south"** → the atlas gives the South Meroshe `plains` on all
   twenty-one hexes and no relief at all. Adjusted: the canyon country lies **inland and east** of the
   southern quarter — which is where `trogo.md` puts it too — and what reaches the southern coast is
   pavement and not canyon.
4. **"The Moroshé Desert does not extend to the coast"** → it does, on the west across ten hex edges
   and on the south across four, with `BWh` on every hex right up to the `coast` hexes. Adjusted: the
   claim holds on the **eastern and north-eastern** edges, where Marosh and Hama are `Csa`/`Csb`, and
   is reversed on the west and the south.
5. **The south-eastern edge is a third case and the file has no third case.** Thirteen hex edges
   against Trogo's `Af` rainforest, with the fog crossing between them. Added.
6. **"Tros… along the desert's western edge"** → the desert's western edge on the atlas is the open
   ocean. Adjusted to the north-western margin, on the inland side of the Dinelv highland.
7. `related:` — East Pyros, the Iberos Coast, Bouén and The Plains do not touch it; the atlas gives it
   the Ganesh Plain, the Dinelv Highlands, Marosh, Hama and Trogo. Adjusted.
8. **The spelling.** A short closing section was added rather than a rename: both forms are in the
   archive and both are correct — *Moroshé* is the Mittoli rendering this file is written in and
   `pyros.md` uses, *Meroshe* is the form the atlas records, the form `ganesh_desert.md` and
   `dinelv_highlands.md` use throughout, and the form the `moreshi` language profile lists among its
   own inspirations. **Anything that has to agree with a map uses Meroshe**, which is what this build
   does throughout. The file keeps its name and its Mittoli form, which is the point the desert people
   make about the Mittoli two paragraphs above it.

**One lore-internal inconsistency was found and left alone**, because it is not an atlas question:
`dinelv_highlands.md`, `hama.md` and `trogo.md` all list `meroshe_desert.md` in their `related:`
lines and no such file exists — the file is `moroshe_desert.md`. Renaming it is the user's call.

---

## Registration

`scripts/build-region-survey.mjs` PLAYABLE + `WINDOW.minQ` −41 → −45 and `maxR` 135 → 144 →
`node scripts/build-region-survey.mjs` (LAND_HEXES 1,935 → 2,078) ·
`src/world/terrain/region-layout.js` PLAYABLE_REGIONS + four REGION_BIOMES ·
`src/world/terrain/region-world.js` REGION_IDS 36–39, four REGION_TERRAIN, four REGION_TEXT (subtitle, spawn,
description, palette with the three skies, `npcIds: []`, seventeen landmarks between them) ·
`src/content/regions/southwest/southwest-world.js` (`MEROSHE_REGIONS`, the four climates, `merosheShare`, the benches, the
skirt, the fans, the salt, the sink, the dunes, the fog, the varnish, four ground colours,
seventeen landmarks) ·
`src/content/regions/southwest/southwest-scenery.js` (the second pass) ·
`src/content/regions/southwest/southwest-wildlife.js` (seven zones) ·
`src/gameplay/skills/languages.js` (four `spoken` entries, no new dialect) ·
`src/dev/tools/developer-atlas.js` (four anchors, one middle hex each) ·
`src/ui/map/map-fog.js` (seventeen areas) ·
`src/dev/tools/build-status.js` (four `early` entries) ·
`src/content/regions/western-regions/west-regions.js` (`WEST_REGION_NAMES`) ·
`src/main.js` (seven review views) ·
**`src/world/terrain/world-terrain.js` (the one missing `else if` that makes `southwestTint` reach the screen)** ·
`tests/southwest-world.test.js` · the ten stale-guard files above · this report ·
`docs/design-answers.md`.

`src/world/terrain/region-levels.js` already carried all four (3, 4, 4, 4) and was not touched.
`src/content/chapters/civil-war/campaign-world.js` already had their one-line designs and was not touched.
`package.json` already lists `tests/southwest-world.test.js` and was not touched.
`src/content/regions/western-regions/west-ground.js` and `src/content/regions/western-regions/west-regions.js`'s river list needed nothing: the new landforms go
through `southwestGround`, which job 1 had already hooked into the western ground chain.

---

## Tests

Everything was run with `node --test tests/<name>.test.js`. **`npm test` was not run**: the script
exceeds the Windows command-line limit on this machine.

**`tests/southwest-world.test.js`**, extended from twelve tests to **eighteen**, all passing. The
six new ones are: the four countries and their one word and one code; the sea on the west and the
south and the absence of water; the four surfaces; the Ganesh Plain seam and its divide; the seven
ranges; and the registration. Four of job 1's twelve were rewritten for both halves.

**The brief's list.** Everything passes except the pre-existing failures the brief names.

| test | |
|---|---|
| **southwest-world** | **18 / 0** (new) |
| mithala-world | 14 / 0 *(after its height guard was moved)* |
| west-lotharn-world | 10 / 0 |
| west-lotharn-peaks | 6 / 0 |
| east-lotharn-world | 12 / 0 |
| oves-world | 13 / 0 |
| gala-world | 11 / 0 |
| ascarth-world | 10 / 0 *(after its edge and window guards were moved)* |
| eer-world | 12 / 0 *(after `OWN_SKY`)* |
| isareos-world | 9 / 0 *(after its height guard)* |
| nethereum-world | 9 / 0 *(after its height guard)* |
| izol-world | 9 / 0 *(after its southern-edge guard)* |
| feradom-world | 14 / 0 |
| region-layout | 8 / 0 *(after the box guard was split, and with the new permanent guard)* |
| region-survey | 4 / 0 |
| regions-world | 9 / 0 |
| developer-atlas | 8 / 0 |
| map-fog | 7 / 0 |
| region-sky | 6 / 0 *(after `OWN_SKY`)* |
| languages | 16 / 0 |
| region-levels | 4 / 0 |
| drawn-ground | 4 / 0 |
| open-country | **passes untouched** |
| closed-border, climbing, terrain-fall, cartography, west-rivers, town-life | all pass |
| **south-suval-world** | fails on the Stillwater — a regex against `src/main.js`, named by the brief, untouched here |
| **regional-wildlife** | fails on the `Iscare Archipeligo` line, named by the brief |
| **campaign-world** | fails on `drent.hexes === 39` against the atlas's 40, found by job 1 |
| **amod-world** | fails on `WORLD_BOUNDS.minZ` — a guard about the *northern* edge, which nothing here touched. Proved by running the same test against the base commit in a `git archive` scratch tree: it fails there identically |
| **elagos-world**, **chameleon** | the brief's other pre-existing failures |
| **west-life** | three chase laws fail on `elagos-meadow-cattle`, `feradom-country-17-98` and `oveth-herons`, which are the three the brief names |

**`open-country` passed untouched, which is the third time running.** None of its four probes stands
in the Meroshe: the nearest, (−1500, 1900), is two kilometres east of the block.

**`drawn-ground` passed with no change**, which was not guaranteed — growing the world south moves
every vertex of the renderer's coarse band, and job 1 had to move a Mithala landmark eight metres when
it grew the world west. Nothing is buried anywhere, including all seventeen of the new landmarks; the
four on the sand sea were placed on corridor floors and crests on purpose, because the foot of a lee
face is where a 7.1 m grid floats above the analytic ground.

**`west-life`, law by law.** Run one law at a time, because with two more hare ranges in it the chase
tests are slower again: the run-down law now takes about six minutes on this machine and the
return-home law about twenty.

| law | |
|---|---|
| no band is given a range it can run out of the reach of | **passes** |
| the river fox never flees, keeps arm's length from a walker | **passes** |
| nothing in the west can be walked down | fails on **`elagos-meadow-cattle`**, walked to within **0.34 m** — job 1's figure to the centimetre |
| the quick ones cannot be run down either | fails on **`feradom-country-17-98`**, run down in **25.5 s** — again job 1's figure exactly |
| a chased band is home again in a few minutes | fails, 18.7 minutes of chase; **`oveth-herons`** by every earlier report, and not re-captured by name in this run |

**Two of the three failures were re-measured by name and came back as job 1's own figures to the
digit**, which is as good a proof of "pre-existing" as this suite gives. The third is the brief's and
every earlier report's `oveth-herons`; its name was not captured in this run and re-running that law
costs nineteen minutes, so it is reported as it stands.

**One thing about these laws worth writing down for the next builder**, because it is not obvious and
it applies to job 1's report as much as to this one: **each chase law asserts inside its loop over the
bands, so it stops at the first band that fails and never tests the ones after it.** This block's
zones are appended last in `WEST_LIFE_ZONES` and all three failing animals come before them, so while
those three keep failing **laws 3, 4 and 5 have never actually exercised a single range in the
southwest.** What stands behind the claim that this job's animals are sound is therefore the reach
law, which does pass and does cover every band, plus the eleven site checks in
`tests/southwest-world.test.js`, not the chase laws. Whoever fixes the cattle, the Feradom band and
the Oveth herons will be the first person to find out what the chase laws think of this desert.
**Not one of this job's seven ranges is named in any of them.** That is what the reach law already
says: every range here is between 88 and 120 m of half-diagonal
against a reach of 130, every home site is dry, standable, this block's own by both `regionAt` and
`hexOwnerAt` and off every water surface and off the salt, there is no stock, and the two animals a
law would have caught — the river fox, which never flees, and the canyon tortoise, which can be walked
down — are both deliberately absent.

### The stale lists that were found and moved

**Ten files and thirteen assertions**, which is the largest harvest any of these jobs has had, and
all but three of them are one mistake: **nobody had looked south.** Job 1 moved the world box west and every guard that pinned a *width* was
found and moved; the guards that pinned the *height* were left alone on the reasonable ground that
nothing north or south had moved. This job moved the south, and all of them went off at once.

1. **`tests/region-layout.test.js`** — the world-box guard tested both axes against one number
   (`< 46` hexes and `> 45.6`). Split in two, `< 46` / `> 45.6` wide and `< 54` / `> 53.4` tall, with
   each of the four countries' case stated.
2. **`tests/ascarth-world.test.js`** — *three* in one file: `maxZ === 2398.401`, `tall = 45.656` and
   the lattice's deepest row `=== 135`. This is the guard that job 1 explicitly checked and correctly
   left alone; its comment now says the peninsula no longer sets the southern edge and asserts it.
3. **`tests/izol-world.test.js`** — `maxZ > 2200 && maxZ < 2420`. Job 1's report named this file as
   the one that pins the southern edge and noted "untouched: nothing south moved". Something south
   moved.
4. **`tests/mithala-world.test.js`** — two: `tall = 45.656` and `WINDOW.maxR === 135`.
5. **`tests/west-lotharn-world.test.js`** — `maxZ === 2398.401`; its comment now holds four facts.
6. **`tests/isareos-world.test.js`** — `|tall − 45.66| < .05`.
7. **`tests/nethereum-world.test.js`** — the same guard, the same move. This pair has now been found
   together three times.
8. **`tests/region-sky.test.js`** and **`tests/eer-world.test.js`** — the two copies of the `OWN_SKY`
   allow-list, both extended. **The West Lotharn builder found this pair, the Mithala builder found it
   again, job 1 found it again, and it is still a pair.** It is the obvious candidate for the next
   permanent guard: one exported list, imported by both.
9. **`tests/southwest-world.test.js`** — job 1's own box and window test, rewritten for both jobs.

### And the fourth generation of "the last N in the list", with a permanent guard for it

`tests/southwest-world.test.js` asserted `PLAYABLE_REGIONS.slice(at)` equals job 1's four — which says
"these are the last four in the list" when it means "these come after everything that was there
before". **That is the fourth file it has been found in**: the West Lotharn builder rewrote it in
`oves-world`, the Mithala builder in `west-lotharn-world`, job 1 in `mithala-world` twice over, and
here it is again in the file job 1 wrote while fixing the last one.

The brief said a fourth was worth a permanent guard, so there is one.
**`tests/region-layout.test.js` now states the invariant the idiom was always reaching for, once, for
every country, with no count in it**: `PLAYABLE_REGIONS` is in strictly increasing `REGION_IDS` order,
the ids run 1..n with no gaps, and the survey script's own `PLAYABLE` holds the same set. A country
appended at the end passes it; a country inserted anywhere else fails it, which is exactly what the
one seeded scatter stream in `world-regions.js` needs. Nobody has to write "last N" again.

---

## Review

**Two hillshades** of the block are in `tests/artifacts/`:

* `meroshe.png` — the whole of the four countries and their horizon,
  `MAP_LO=0 MAP_HI=22 node scripts/region-map.mjs -3880,1870,-2430,3180 2`, with white dots on the
  Malhat, the sand sea, the hamada, the stone floor and the dry shore;
* `meroshe-erg.png` — the sand sea alone at 1.2 m a pixel, `MAP_LO=4 MAP_HI=17`, which is the map
  that caught the dune wavelength.

What they show, and what was checked against them:

* **the block reads as one low landmass between two seas**, with nothing in it high enough to cast a
  shadow except the dunes. The sea is on the west and the south and nowhere else, the shore is a
  clean line, and there is no water inside any of the four;
* **the sand sea is legible from above and the first version was not.** The first hillshade of the
  Central Meroshe came back with **two** ridges in the whole country, which is where the wavelength
  came down from 230 m to 140. The second shows five parallel ridges running north-west to south-east
  with wide dark corridors between them, which is a sand sea;
* **the Malhat reads as a flat white oval** with no shading in it at all, which is the point of a
  levelled floor rather than a bowl;
* **the hamada does not read from above**, and that is correct: two metres of bench on a floor of
  bare rock is not a shadow at two metres a pixel. It reads underfoot and in the review views;
* **the red ring is the outland margin** — ground the climbing rule calls too steep — and is the rib
  measured above. Inside the block's own hexes there is **no red anywhere**.

**Three rounds of review views, and each round changed something.** What the first two caught:

* **the four surfaces came back as one shade of tan**, which is how the `groundTint` bug above was
  found. Everything below it is on the far side of that fix;
* **the swatches were all wrong once the tint arrived.** They had been chosen to look right as
  numbers and came back on the screen a good deal lighter and warmer than the numbers say, because
  the renderer reads them as linear; the stone floor went from `#6e6a54` to `#4a4839` to **`#38372c`**
  before it stopped reading as an olive meadow and started reading as varnished pavement;
* **the sand sea's landmark was standing in a corridor**, because moving the dune wavelength from 230
  to 140 moved every crest. It is on a crest now, found by search rather than by eye;
* **the fan cobbles were boulders.** "A hand across" is a hand across, and the first pass ran to a
  metre;
* **the reg's pebbles were invisible** because they were painted the same colour as the pavement they
  make. They are a shade *lighter* than it now, which is the only way a stone floor reads as stones;
* **two cameras were pointed at the wrong thing**: the sand-sea crest view looked north-east straight
  out of the erg and photographed the hamada's thorn trees on the horizon, and the dry-shore view was
  angled along the shore with the fan skirt's own swell standing in front of the water for three
  quarters of the frame. Both are measured off their own landform's numbers now.

**Seven review views were photographed** with
`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=..."`, after the
last scenery change, with no errors: `southwest-hamada`, `southwest-erg`, `southwest-erg-crest`,
`southwest-malhat`, `southwest-fans`, `southwest-dry-shore`, `southwest-reg`. They are in
`src/main.js` and every one is worked out from the surface's own numbers — a bench's own line, the
dune field's own bearing, the salt pan's own ellipse, a fan's own down-slope — so a view cannot drift
off the thing it shows when a landform moves. Images: `tests/artifacts/southwest-*.jpg`.

What the final set shows:

* **the hamada is the best of them.** A floor of dark grey-brown stone with pale bedrock slabs lying
  flat on it, thorn trees standing well apart with hard shadows under them, and the sand sea's first
  ridge pale on the far horizon. It is plainly rock and plainly not sand, which is the whole point;
* **the corridor view does the erg's job**: a long flat swept floor running away to the north-west with
  a wall of sand along the right-hand side of the frame the whole length of it. You can see exactly why
  a traveler follows it;
* **the Malhat reads at last** — a pale flat band across the middle distance with the darker gravel of
  the fan skirt in front of it and the ocean behind. Three things in one frame, and only one of them is
  drinkable;
* **the fan head is cobbles and a bone-bird.** Stone the size of a fist scattered thickly over a gravel
  apron, getting smaller with distance down the fan, and one bird high up;
* **the reg is dark, and getting it dark was the hardest thing in the job.** Three swatches were tried;
  the renderer reads an authored colour as linear and lifts it a long way, so a ground has to be
  authored almost black to read as merely dark. It is the darkest ground in the game now and the
  pebbles on it are lighter than it is;
* **the dry shore is the picture of the job.** Gravel and a few cobbles in the foreground, then the
  open western ocean filling the frame to the horizon, and nothing green or wet anywhere on the land
  side of it. It took three tries: at fifty and a hundred metres inland the fan skirt's own swell
  stood in front of the water for three quarters of the frame, and the camera had to come down to
  thirty-five metres from the waterline before the sea was the subject;
* **the crest view is the weakest.** From the top of a dune you look over the next one, so a
  seven-metre-deep field two hundred and thirty paces wide reads as a plain with a lip in the
  foreground. The hillshade is the better picture of the erg and the corridor view is the better
  picture of being in it; a crest view would want a camera fifteen metres up, which is not a thing a
  traveler can do.

---

## Open questions

1. **The Meroshé dustback is still not built, and it is still the user's decision.** The lore names
   it, gives it an economy and a social meaning — "an oasis house may keep coin in locked jars, but
   its political standing is usually measured by how many dustbacks it can move through a dry season
   without begging water" — and never describes its body. The only dustback the lore *does* describe
   is a domestic bovid, which is somebody's. Job 1 declined it and this job held the line. **It is
   also the animal this quarter most wants**: four of the atlas's named countries are the desert it
   lives in.
2. **The canyon tortoise is a new open question and a different kind.** It is named *and* described —
   "a large, slow-moving grazer of desert seeps and seasonal wash vegetation… may live as long as two
   centuries" — so building it would invent nothing. What stops it is `tests/west-life.test.js`'s
   first law: **nothing in the west can be walked down**, and a tortoise is the one animal whose whole
   character is that it can be. Either the law needs an exemption list (the cattle already fail it)
   or the tortoise needs a burrow to go into, and both are design decisions rather than build ones.
3. **The block is still an island, and it is bigger.** Two hundred and two hexes over eight countries
   and no way in but F8 until the Ibenwood belt is built. Jobs 3 and 4 add five more countries to the
   same island.
4. **Three of the four quarters are defined by an edge that is not built**, which is the thing jobs 3
   and 4 most change. The West Meroshe's fan skirt falls from the Dinelv escarpment and the
   escarpment is `outland` at base 11.5; the North Meroshe's one green horizon is Marosh; the South
   Meroshe's whole eastern character is Trogo's rainforest. The landmark and region text says so in
   every case rather than describing something the world does not draw. **When those neighbours land,
   the three views get their subjects and the ribs on those margins go.**
5. **What job 3 has to know about the fan skirt.** `merosheSkirt` and `MEROSHE_FANS` are deliberately
   written as a **one-sided ramp falling away from the Dinelv margin** rather than as a slope down
   from a fixed head, so when the Dinelv Highlands are built with a highland base the hex blend lifts
   the fan heads automatically and the apron still falls away from them. Nothing here needs changing
   for that. What will need a look is the **three fan apexes**, which sit thirty to fifty metres
   inside my own hexes and should read as being at the mouths of the escarpment's own channels.
6. **The world box will move again in job 4, and the guards with it.** Trogo's southernmost hexes are
   at row 142, z = 3146.69, so its outer flat stands at 3204.43 and the world's southern edge will go
   to about **3264.4** — another 87 metres, and another 0.87 hexes of height. All ten guard files moved
   here will have to move again; they are all written with the measurement beside them so the next
   move is arithmetic. Job 3's countries (Cape Heth q −39…−34, the Dinelv Highlands and Hama r ≤ 141)
   are all inside the box as it now stands, so **job 3 should not move it at all** — which is exactly
   what this job's brief predicted about this job, so it is worth verifying rather than assuming.
7. **`OWN_SKY` is still two copies.** Four builders in a row have now found the same pair of
   allow-lists in `tests/region-sky.test.js` and `tests/eer-world.test.js` and extended both. It wants
   the treatment the "last N" idiom just got: one exported constant, imported twice.
8. **The outland rib has one more job to live.** 6.06 m at the worst margin point, and the four
   countries that produce it — the Dinelv Highlands, Marosh, Hama and Trogo — are all built by jobs 3
   and 4. After that the southwest block has no unbuilt neighbour left except the Ibenwoods, and the
   rib is a `relief()` problem for whoever takes it on world-wide.
9. **The Meroshe has no settlement of any kind and the lore has two cities for it.** Nova Homa ("the
   principal city of the southern Moroshé border", built on and into the ruins of something older)
   and Tros. Neither is a region on the atlas and neither is built. Whoever builds the Moreshi people
   inherits the question of where they go.
10. **`groundTint` should be a table and not an `if/else` chain.** The bug this job found — a
    country's own tint computed and then dropped — is the fifth branch in a chain that has grown one
    branch per country (Gala, the Oves, the Mithala, the southwest) and will grow more. Whoever adds
    the sixth should turn it into a list of `(inBox, tint)` pairs walked in order, because the failure
    mode is silent: nothing throws, nothing looks broken, and the country just quietly has no colour.
11. **The spelling should probably be made consistent across the lore, and was not.** `moroshe_desert.md`
    now carries a note saying which form to use where, but three other files (`dinelv_highlands.md`,
    `hama.md`, `trogo.md`) list a `meroshe_desert.md` in their `related:` lines that does not exist.
    Renaming the file is the user's call and the brief said not to.
