# The West Lotharn Mountains: the build report

This is the original draft build record. See [the integration report](west-lotharn-integration.md) for the subsequent terrain, forest, traversal, and main-build changes.

Built 2026-09-29 on branch `west-lotharn` (worktree `azhora-game-west-lotharn`, from main 8cc891b),
to `docs/west-lotharn-brief.md`. **Terrain, climate, water, scenery, caves and wildlife, and nothing
that belongs to anybody.** Every valley community and its dialect, the mining districts and the iron,
coal and copper in them, the pass inns and waypoints, the burning of the ridge-tops, the fields, the
walls and the tracks: none of it is built. The East Lotharn has a pass road, an inn and iron workings
because it was built to an earlier brief; none of that is copied. Left uncommitted, as the brief asks.

The two decisions the user made on 29 September, and what they came to:

1. **Taller.** The crest stands **550.8 m** — the highest ground in Azhora by a hundred and thirty
   metres over the East Lotharn's eastern peak.
2. **Everything carries over.** Cliffs in courses, cut ramps and ledge paths as the only ways up,
   and caves. The climbing rule is extended to region 27.

---

## What the atlas gave

| | **West Lotharn Mountains** (27) |
|---|---|
| hexes | 48: q −8…3, r 95…102 |
| terrain | `mountain` × 25, `hills` × 23 (the East Lotharn is `mountain` × 15, `hills` × 23) |
| world extent | x −2550…−1550, z −981…−260; hex centres x −2500…−1600, z −924…−317 |
| climate, per hex | **`Cfa` × 47, `Dfa` × 1** — the one continental hex is (−8,100) |
| neighbours by shared edge | South Celder 16, South Mithala 10, **Vastos 8**, **East Lotharn 7**, **Isareos 7**, **Meneth 7**, Yunethre 5 — sixty edges, **twenty-nine of them against built country** |
| rivers | **none at all**, on any of the forty-eight hexes |
| level | 4 |

**Where the twenty-five mountain hexes are** was measured before anything was placed, because the
whole justification for the height is that there are twenty-five of them. They are not one block:

* **the main massif**, thirteen hexes, running north-east from (−2250,−577) through (−2000,−664) and
  (−1950,−750) and then splitting into a north arm to (−2050,−924) and an east arm to (−1600,−837);
* **the south-east spur**, five, from (−1650,−577) south-west to (−1950,−404);
* **the cold head**, three, at the western tip: (−2500,−491), (−2400,−491), (−2300,−491);
* **the south rampart**, four, in a single row along the whole Isareos border, (−2400,−317) to
  (−2100,−317).

The crest went on the largest, at the point where the most mountain hexes meet. The other three
masses are lower than the main one **because the atlas gives them less room**, not because they were
chosen to be: the rampart is one hex deep against Isareos, forty metres of ground either side of its
centre line, and what a range can be there is a front and not a peak.

The twenty-three `hills` hexes are the skirts, and one unbroken chain of them runs the whole width of
the country from the Vastos margin to the hills above Yunethre. That chain is **the long valley**.

## The climate read, and the one `Dfa` hex

Read per hex from the World Builder map (`world-builder/map/resources/examples/azhora.wwmap`,
`hexes[key].climate`, `koppen-v1`) — not `azhora.cmap.json`, whose one-code-per-region field is a
default. **Forty-seven `Cfa` and one `Dfa`.** `WEST_LOTHARN_CLIMATE` in `src/content/regions/west-lotharn/west-lotharn-world.js`
records all forty-eight and `tests/west-lotharn-world.test.js` holds them to the map hex for hex
whenever the map is on the machine to ask.

So the country is humid, warm-summered and wet the year round over all of it but one hex, exactly as
the East Lotharn is over all thirty-eight of its. **No climate band is drawn, and nothing in the
country is shaped by the `Dfa` hex** — a hundred metres of ground cannot carry a band, and the brief
said as much.

What it got instead is **a name and a note**, which is the whole of the answer. (−8,100) is a
`mountain` hex and the **westernmost hex in the country**, furthest from the Mithala plain's maritime
air and the first ground the westerly weather has to climb. The three-hex mountain block it stands on
is named **the cold head**; its landmark description says what the map says, the test asserts the hex
is `mountain` and westernmost and that the cold head stands on it, and the hares that live on its
bald have it in their note. Nothing else.

## Does the world box grow? No — and that is a first for a region this size

Checked before registering and again after. `WORLD_BOUNDS` is **unchanged to the digit**:

```
x −3010.001927939127 … 609.9980720608719     z −1301.1705922171766 … 2398.401076758503
```

The country's own extent (x −2550…−1550, z −981…−260) is four hundred and fifty metres inside the
western edge that Nethereum set and three hundred inside the northern one the East Lotharn set, and
rows 95–102 are inside the survey `WINDOW` (minR 90, maxR 135). `LAND_HEXES` did not change either:
regenerating `src/dev/tools/region-survey.js` added twelve lines and nothing else, because these hexes were
already claimed land in the coast field.

So **`tests/region-layout.test.js`, `tests/isareos-world.test.js` and `tests/nethereum-world.test.js`
needed no new numbers** — the first region of forty-eight hexes not to move the world. Forty-eight
hexes is more than Ovesos (19), the Oves Desert (23), Gala (21) or the East Lotharn (38).

## The ground

**Profiles** (`REGION_TERRAIN`, src/world/terrain/region-world.js): default **70 / 10 / 230**, `byTerrain.hills`
**58 / 8 / 215**, `byTerrain.mountain` **96 / 13 / 250**. **Every number is the East Lotharn's, to
the digit, and that is the point**: the two halves are one massif and share seven hex edges, three of
them hills against hills, and a base or a wavelength that differed across that border would put a
step or a chirp in the middle of one range. The whole difference between the two halves is the
landform laid on top of it, and a landform is nothing at all at the border it fades to.

**The summits**, measured on the built ground:

| summit | height | lift at its bald | ramps | on |
|---|---|---|---|---|
| **the crest** | **550.8 m** (547.2 in the middle of its bald) | 461.8 | 10 | the main massif |
| the north summit | 448.3 | 369.8 | 7 | its north arm |
| the west shoulder | 404.4 | 323.8 | 7 | its south-west shoulder |
| the east summit | 320.0 | 231.8 | 5 | its east arm, over the col |
| the spur | 263.1 | 185.8 | 4 | the south-east spur |
| the cold head | 255.7 | 185.8 | 4 | the western tip |
| the south rampart | 216.4 | 139.8 | 3 | the Isareos front |

The East Lotharn's four are 420 / 325 / 275 / 240, so six of these seven stand over its second peak
and the crest stands a hundred and thirty metres over its first.

**The courses.** `BANDS` is **period 46, riser .3, tread .12**, against the East's 40 / .3 / .1: a
cliff of **forty metres and a half** where the East's is thirty-six, with a narrower ledge between.
The lore asks for "ring after ring of pale stone thirty or forty metres high", and a range half as
tall again wears in thicker beds rather than in more of the same ones. **Ten courses and a bald**
from the crest's foot to its top, and one ramp to each course.

**The balds.** `BALD` is radius 19, `above` 1.8, and the cut is **never above the summit's own lift**
— a term the East Lotharn did not need, because its four peaks stand clear of one another. Three of
these seven stand on the arms of a single massif, close enough that the ground seventy metres back up
the arm is higher than the summit itself; without that second term the cut would be laid above the
top it is meant to cut off and the summit would come to a point instead of a bald. Measured: every
bald is 950–4,060 m² and nowhere steeper than 0.42.

## The valleys, and the col

**The long valley** is the atlas's own — eleven `hills` hexes in an unbroken chain across the whole
country — and it is the lore's "broad and flat-bottomed where glaciation left deposits now grown over
with deep soil". 953 m from the Vastos margin in the east to the hills above Yunethre in the west, a
floor fifty metres across, walls that take it back to the hill over sixty more, and **a divide a
fifth of the way along it** at (−1781,−668), 66 m, which is where the ground the atlas makes stands
highest. Its floor falls to **52.5 m** at the east mouth and **43.5** at the west end, and a beck
leaves each end — **the east beck** to the Vastos margin and **the west beck** the long way west. The
range is crossed by walking up one and down the other. Nobody has made anything of it.

**The north valley** is the range's own drainage to the Mithala plain — "the northern face drains
toward the Lizeem system and the Mithala plain" — down the notch of `hills` the atlas cuts into the
massif at (0,96) between the crest's north shoulder and the north summit, and out across the row-95
shelf. A floor twenty metres across falling **70 m to 30** in a hundred and eighty: a mountain valley
and not a gorge, open all the way, with a wall above it on both sides the whole length.

**The col, and what had to be done about it.** The East Lotharn's Kemrath "drains west, out of the
range toward the West Lotharn" (src/content/regions/east-lotharn/east-lotharn-world.js), and registering this country made that
literally true: **Kemrath's floor and its water now end inside these hexes**, at (−1586.9, −820.5).
So:

* **the col** is that gap — the low ground at **43.8 m** where the two halves of one range join, with
  the West's east arm standing over it on one side and the East's south-west peak on the other. It is
  left exactly where the East put it: this country writes **no ground at all** inside the East
  Lotharn's hexes (measured: maximum lift inside them, 0.00 m), and the col's ground is within 2.5 m
  of `kemrathFloor(KEMRATH.line.length)`, which the test reads from the East's own module;
* **a river cannot stop in the middle of a country**, so **the Kemrath reach** picks the water up at
  exactly that point and at exactly that level. It takes it with `headOf: 'kemrath-water'` rather than
  a typed number, and the measured hand-over is **44.271 m on both sides — equal to the last digit**.
  Nothing in `src/content/regions/east-lotharn/east-lotharn-world.js` was touched to do it; this is the same allowance Nesdor's
  Ela-South Reach makes for Elagos's water;
* west of the col this country climbs at once (15 m within thirty), so the water turns **north**,
  along the foot of the east arm and down **the notch** — the cut it has made through the range's
  north-eastern shoulder, falling nineteen metres in a hundred and fifty to the Mithala margin. That
  is the only way from the col to the northern country that is not over a summit.

## The seams

Twenty-nine hex edges against built country, more than any region built so far, and the contract is
the plain one: **neither side writes ground outside its own hexes, and the ordinary hex blend carries
the step.** Measured, the maximum of this country's own lift inside each built neighbour's hexes:

| neighbour | edges | its profile | max West Lotharn lift on its ground |
|---|---|---|---|
| **East Lotharn Mountains** | 7 | hills 58 / mountain 96 — the same numbers | **0.00 m** |
| **Vastos** | 8 | 30.5 / 1 / 300 | 35.2 m, at (−1849,−519), a hex corner where three of this country's hexes meet |
| **Meneth** | 7 | 26 / 1.8 / 140 | 9.9 m |
| **Isareos** | 7 | 22 / 4.5 / 120 plains 18 | 10.2 m |

`westLotharnShare` is **exactly nought at every one of those four countries' hex centres**, so none
of their own ground moves; what shows near a border is the mountain front leaning over it, which is
what the atlas draws when it puts `mountain` hexes against `hills` at 22 m.

**The fall into Isareos reads, and one test had to be told so.** Isareos's northern grassland hexes
lie directly against four `mountain` hexes of this range. `tests/isareos-world.test.js` measures the
relief across each of Isareos's hills by a sixty-metre ring round its centre and asserts the spread is
under 22 m; round (−7,103) that ring now reaches forty metres into this country's southern front and
reads **50.5 m**. The ring is now read on **Isareos's own ground only**, where it reads **20.5** — the
number the test was written about. The code is right and the probe was measuring the Lotharn.

## The ribs against the three unbuilt neighbours

The "outland ribs" Gala and Ovesos both reported are here too, and they are not this country's to
cure. `relief()` takes its phase from `x / wave`; where the blend mixes two wavelengths the phase
chirps, and at |x| ≈ 2,000 a small change in the mixed wavelength is a large change in phase.
Measured as the steepest two-metre step anywhere in the sixty-metre band either side of each shared
edge:

| margin | steepest 2 m step |
|---|---|
| West Lotharn \| Open country (South Celder, South Mithala, Yunethre — 31 edges) | **25.8** |
| West Lotharn \| Vastos | 19.2 |
| West Lotharn \| Isareos | 16.8 |
| West Lotharn \| East Lotharn | 15.9 |
| West Lotharn \| Meneth | 14.1 |
| *for comparison, already in the world:* East Lotharn \| Feradom | 17.8 |
| East Lotharn \| Amod | 17.1 |
| East Lotharn \| Vastos | 14.1 |

Most of each of those numbers is a cliff of this range or the East's standing inside the band rather
than a chirp at the line itself — the East Lotharn's 17.8 and 17.1 are its own faces, and were there
before any of this. **The cure belongs in `relief()`/`terrainMix` and is a world-wide job; the brief
said not to attempt it, and it was not attempted.** What can be said for this country is that its
profiles are the East Lotharn's exactly, so the one seam where two built mountain ranges meet has no
wavelength change in it at all.

## The ways up, and the proof

**The ramps.** Every cliff is broken in one place on each summit's way up: a ramp cut slantwise
across it, four metres wide, climbing the forty metres from one ledge to the next at about forty
degrees — a climb under the shared rule and not a walk — and the next one starts thirteen metres
further round the ledge, so a way up has to be found by walking round the mountain. **40 ramps and 33
ledge paths** over the seven summits, and all forty climb at a measured grade between **0.72 and
0.75**. One number had to be different from the East Lotharn's to get them: a new ramp must keep six
metres from every ramp already laid where the East keeps seven, because a summit's top course is a
ring of only a hundred and forty metres and the ramp across the course below it ends within a few
metres of that ring. At seven, the north summit's and the spur's last cliffs had no unclaimed run
long enough left in them and their balds could not be reached at all.

**The proof** (`tests/west-lotharn-peaks.test.js`) is a flood fill on a 1.5 m lattice over the whole
country, seeded from the ground a traveler can actually walk in on — the long valley, the north
valley, the notch and the col — climbing no steeper than the authored hiking-route budget and
descending anything:

* with the ways open, **every one of the seven summits is reached**, and the highest ground reached
  is **551.2 m**;
* with the ramps and ledges shut, **not one of the seven is reached**, and the highest ground reached
  anywhere in the country is **98.3 m**. (The East Lotharn's own figure is 170 m; this range is
  steeper for its width, so its first course closes lower.)

Every ramp is also held to climbing a whole course, at a grade inside the budget, and to lying
entirely inside the country's own hexes.

## The caves

Nine, in the three kinds the East Lotharn has, and **nothing lives in any of them**:

| | | |
|---|---|---|
| **five chimneys** | crest × 2, north summit, west shoulder, east summit | in at the foot of a cliff from one ledge, along inside the rock, out on the ledge above |
| **three chambers** | the crest's west face, the cold head, the south rampart | a passage in and a room at the end of it |
| **one way right through** | the col to the long valley, under the east arm | 98 m, twelve and a half of them of climb, under a shoulder standing seventy and eighty metres |

The through passage is the lore's own: "in places a way right through a ridge from one valley to the
next, which the valley people used before anybody cut a pass." It is the way from the col into the
long valley that is not over the shoulder between them.

Two things had to be different from the East's, and both were measured rather than guessed:

* **each mouth runs a few metres along the ledge's own contour before the line ends.** A chimney's
  mouth opens onto a ledge ten metres wide; the straight tail the line is given afterwards, so that
  there is ground outside the opening to be walked into from, was running *across* the ledge and out
  over the edge of it. Stepping out of the rock was an eight-metre drop. With the contour run the
  worst floor step through all nine is **0.27 m**;
* **the head is carried four metres out rather than three**, because an opening is put three metres
  outside the rock and a three-metre head could leave one buried in the cliff with no ground in front
  of it.

`world.lotharnCaves` is still the East Lotharn's eight alone, because `tests/east-lotharn-peaks.test.js`
counts it; these are `world.westLotharnCaves`, and `src/main.js` hands **both** arrays to one
`createLotharnCaveWalk`, so a save made in either range restores in the right one. No cave id is
shared between the two halves, and the test asserts it.

## The water

**The atlas draws no water on any of the forty-eight hexes.** Every course here is therefore derived
from the landform, as Meneth's four becks were, and it is the lore that says there should be any:
"each valley has its own drainage… the rivers of the Lotharn flow in two directions."

| course | from | to | what it is |
|---|---|---|---|
| **the Kemrath reach** | the col, 44.27 m, `headOf: 'kemrath-water'` | the Mithala margin, 24.1 | the East Lotharn's Kemrath water, taken on |
| **the north beck** | the north valley's head, 66.6 | the same margin, 32.9 | the massif's north face |
| **the east beck** | the long valley's divide, 65.0 | the Vastos margin, 54.1 | the valley's eastern half |
| **the west beck** | the divide, 65.3 | the western hills, 43.3 | the valley's western half, and the longest course in the country |

All four fall the whole way and all four lie on their own valley floor. Each wanders a little across
that floor rather than running down the middle of it, which is what a stream does on a flat bottom
grown over with deep soil.

**One course outside this country had to move, and it is the only one.** Meneth's first valley beck
ran west to x = −2070, which was open country at 11.5 m when Meneth was built. Registering this range
put a mountain front across the west end of that one valley, and the last hundred and twenty metres of
the beck became a channel cut 30 m below its own banks inside these hexes. Measured along that trough
on the ground the atlas now makes, the floor falls from 28.6 m at the beck's head to 25.1 at x = −1840
and then climbs — 30.9, 38.8, 48.9 — so **the beck now ends at x = −1848, where the ground stops
falling**, and spreads and sinks there on its own valley floor. That is the rule that set every other
foot in `src/content/regions/western-regions/west-regions.js` ("a stream has to go downhill; where the lore and the ground disagree,
the ground wins"). The other three Meneth valleys are untouched, and the steepest step on Meneth's own
ground near this border fell from 14.7 to 3.6 as a result.

## What grows

The same seven trees as the East Lotharn, because it is the same forest: oak, chestnut, maple, beech,
hickory, walnut and tulip poplar, old and close-grown. What is different is **where it stops**.

`TREE_LINE` is **thins 250, gives out 345** against the East's 200/280 — two hundred metres below the
crest, which is the lore's "within a few hundred meters of their highest summits", and it leaves
**five courses of bare stone under the crest's bald**. Measured on the built world: 6,756 trees, not
one of them above the line, on a cliff or on a bald. The valley floors are meadow rather than wood —
a glacier's deep soil under grass — and the balds are pale bleached turf.

The massifs are drawn by a ground of their own three metres apart (`src/content/regions/west-lotharn/west-lotharn-scenery.js`),
with the world's seven-metre grid sunk out of sight beneath them, and coloured by what the ground is:
rock in courses on the cliffs, scree on the climbs, grass on the ledges darker low and paler above the
tree line, and the balds' own colour on the tops.

## What lives there, and why

Nine ranges, sorted by **altitude**, which is the thing this country has that no other has. The lore
catalogues no Lotharn fauna, so all but one are extensions and every one says so in its own note.

| zone | species | where | why |
|---|---|---|---|
| `long-valley-deer` | red-deer | the long valley's eastern floor | the one ground that is both open and level; in a closed broadleaf forest the open ground is where a deer is seen at all |
| `long-valley-boar` | boar | the western floor at the wood's edge | six of the seven trees are mast trees |
| `north-valley-deer` | red-deer | the north valley's floor | the only open ground on the whole north face |
| `west-beck-fox` | river-fox | the west beck's lower reach | the *vel-caric*, the one animal that watches instead of leaving; a slow stream on a flat floor with cover is the river margin it wants, and the only one here |
| `notch-herons` | wading-bird | the Kemrath reach below the notch | the water joins the Lizeem system a few hundred paces north |
| `crest-hares` | upland-hare | the crest's bald | 545 m, two hundred above the last tree: the highest ground any animal in the game stands on |
| `cold-head-hares` | upland-hare | the cold head's bald | the western tip, and the country's one continental hex |
| `crest-vulture` | turkey-vulture, 42 m up | over the crest | a five-hundred-metre wall of cliff is a lift generator; the only thing in the game a traveler looks *down* at while it flies |
| `west-shoulder-hawk` | plateau-hawk, 36 m up | over the west shoulder | the dry-plateau hawk, quartering the open ground between the tree line and the summit |

**Nothing in the ledge forest**, which is most of the country by area: a ledge nine metres wide with a
forty-metre cliff above and below it has nowhere for an animal to back off to, and a wood of trunks
four metres apart is a maze to a deer. **No domestic stock** — the East Lotharn has sheep on Upper
Olveth because the lore puts them there and because it was built to an earlier brief; a flock with
nobody near it is still somebody's flock. **No new rig**: everything above is a rig the game has.

Every site was measured on the built world — dry, this country's own, off the water and standable —
and the test holds each one to it.

## Names

**Nothing is coined.** `azhoran_language_profiles.py` has a `mittoli` profile and a `lothi` one, but
the lore is explicit that Lotharn place names are substrate — "the valley names, the mountain names…
in many cases cannot be decomposed using any Mittoli root system" — so a name built out of Mittoli
roots would contradict the lore it was meant to serve, and `lothi` is a western-Mediterranean profile
for a different people. The East Lotharn used the three valley names the lore itself gives (Kemrath,
Stonegate, Upper Olveth) and plain English for everything else; the lore gives this half none, so
everything here is named in plain words for what it is: the crest, the north summit, the west
shoulder, the east summit, the spur, the cold head, the south rampart, the long valley, the divide,
the north valley, the col, the notch.

**The dialect is the East's**, `lotharn`, "Lotharn valley Mittoli". One range, one valley people, and
the lore's own unit is the range: "the sum total of Lotharn dialect variation is wider than the
variation between any two standard regional Mittoli dialects", which makes the valleys the divisions
and not the halves. If anything this is the deeper half of the two — the atlas gives it no pass and no
road where the East has both, and "the deepest valley communities, those with the least external
contact, preserve the most substrate" — but that is a note about the same dialect, and a second one
would need words nobody has written down.

## The lore, adjusted to the atlas

`world-builder/azhora_lore/geography/regions/lotharn.md`, in place and uncommitted, on four claims:

1. the courses are "three and four hundred metres of it" → **three, four and five hundred**, with the
   western half named as the main one, half again as much true mountain, and a crest of 550 m over
   its own valleys, with the eastern Lotharn reading as its foothills;
2. "the southern face drains toward Amod and the country beyond it" → **which lowlands depends on
   where along the range you stand**: the eastern half into Amod, the western into the ridge country
   and the low hills of the lake country's western margin, a longer and steeper fall because there
   the mountains stand directly over ordinary country with no belt of foothills between. (The atlas
   gives Amod no edge with the West Lotharn at all; its southern neighbours are Meneth at 26 m and
   Isareos at 22.);
3. "the southern face descends into **Amod**" → **the eastern half's** southern face;
4. "the Lotharn have passes beyond easy counting" → **not all of them carry a road**, and in the
   western half the crossing is the long valley, walked, with nobody having made anything of it.

## Registration

`scripts/build-region-survey.mjs` PLAYABLE → `node scripts/build-region-survey.mjs` (twelve lines
added, `LAND_HEXES` unchanged) · `src/world/terrain/region-layout.js` PLAYABLE_REGIONS + REGION_BIOMES ·
`src/world/terrain/region-world.js` REGION_IDS 27, REGION_TERRAIN, REGION_TEXT (subtitle, spawn (−1817,−651) on the
long valley's floor, description, palette, `npcIds: []`, twelve landmarks) · `src/gameplay/skills/languages.js` ·
`src/dev/tools/developer-atlas.js` (anchor (0,98), the hills hex in the middle of the long valley) ·
`src/ui/map/map-fog.js` (seven areas, radius 45–110; the least contained, the cold head’s, is 91 % inside the outline and the rest 96 % or better) ·
`src/dev/tools/build-status.js` · `src/gameplay/movement/climbing.js` CLIMB_REGIONS (27 and the name; the refusal now reads "in
Suval, the Lotharn and Feradom") · `src/content/regions/western-regions/west-regions.js` (the four courses, `WEST_REGION_NAMES`,
`WEST_GROUND`) · `src/content/regions/western-regions/west-ground.js` (`westLotharnGround` inside `westGround` and `baseBeforeWater`, which is
how it reaches `src/world/terrain/world-terrain.js`'s chain; the East Lotharn has a **second** hook straight
into that chain, `eastLotharnGround`, to level its road, its inn's yard and its workings' bench
after the rivers are cut, and this country has nothing made in it, so it needs no such pass)
· `src/world.js` (scenery, caves, terrain sink, landmarks, metrics) · `src/main.js` (the cave walk
over both halves, seven review views) · `src/content/regions/western-regions/west-regions-life.js` · `package.json`.

**Its own sky**, and the first country to ask for one on account of height rather than weather: sky
`0x9fc2d6`, haze `0xc3cec6`, density **.0027** against the East Lotharn's .0036 and the default's
.0062. Thinner, clearer air and a bluer sky, which is what altitude and distance do to both.

## Tests

Everything below was run with `node --test tests/<name>.test.js`. `npm test` was not run: the script
exceeds the Windows command-line limit on this machine.

**New:** `tests/west-lotharn-world.test.js` (10 tests) and `tests/west-lotharn-peaks.test.js` (6),
all passing, both added to `package.json`.

**The brief's list. Thirty of the thirty-three pass:** east-lotharn-world, east-lotharn-peaks,
east-lotharn-cave-walk, climbing, climbing-world, climbing-pose, climbing-combat, open-country,
izol-world, region-layout, region-survey, developer-atlas, map-fog, region-sky, languages,
region-levels, oves-world, gala-world, ascarth-world, eer-world, isareos-world, nethereum-world,
feradom-world, vastos-world, meneth-world, caricas-world, regions-world, town-life, closed-border,
terrain-fall, drawn-ground.

**The three that do not, and which of them were this build's:**

* **`west-life`** fails three tests.
  * `no band is given a range it can run out of the reach of` **was this build's**, and is fixed. The
    boar's range on the long valley's western floor was 220 × 150 m and half its diagonal 133 —
    three metres past the 130 an animal is run from, which is the rule "so that the next country's
    are too". It is 180 × 120 now, and half its diagonal 108.
  * `nothing in the west can be walked down` (`elagos-meadow-cattle`) is the one the brief names as
    known-failing on this base.
  * `the quick ones cannot be run down either` (`feradom-country-17-98`, reached after 25.5 s) and
    `a chased band is home again in a few minutes` (`oveth-herons`, 63 m from home after three
    minutes) name other countries' animals and the brief does not list them. **Both were measured
    against this base**: the two tests were run again with this country's nine ranges taken out of
    `WEST_LIFE_ZONES` and nothing else changed, and both failed identically, on the same two zones
    with the same numbers. They are pre-existing and are not this build's.
* **`regional-wildlife`** fails `previously empty regions have distinct modest populations` on
  `Iscare Archipeligo`, which is the failure the brief names.
* **`south-suval-world`** fails on the Stillwater — a regex against `src/main.js` that was already
  failing, and which the brief names.

`chameleon`, `amod-world` and `elagos-world`, the other three the brief names as known-failing, were
not run.

**Five stale lists were found and moved, three of them beyond the ones the brief named:**

1. **`tests/open-country.test.js`** — the Caricas probe at (−2300,−400) is this country's own
   (−6,101) hills hex. (It had already been moved once, on 28 September, when the Oves Desert took
   its previous home.) Moved to **(−2530,−220)**, measured: open country by `regionAt` and by
   `hexOwnerAt`, outside every outline, 413 m north-west of Caricas with Isareos's nearest hex 81 m
   away and this country's 162 — which is exactly the leak the list watches for. Three tests.
2. **`tests/isareos-world.test.js`** — the sixty-metre relief ring, above. The world-box and
   hex-count assertions in it needed nothing.
3. **`tests/region-sky.test.js`** — `OWN_SKY` allow-list.
4. **`tests/eer-world.test.js`** — a *second* copy of the same allow-list, which the brief did not
   name and which no previous builder's notes mention.
5. **`tests/oves-world.test.js`** — `assert.equal(order.indexOf('Oves Desert'), order.length - 1)`.
   The intent is "appended, never inserted", so it now asserts that every region after the Oves
   Desert carries a higher id than 26.

`tests/izol-world.test.js`, `tests/nethereum-world.test.js` and `tests/region-layout.test.js` passed
untouched, because the world box did not move.

## Review views, and what the pictures showed

Seven, all in `src/main.js` and **all worked out from the country's own numbers** rather than typed
in, so a view cannot drift off the thing it shows when a summit or a ramp moves: `west-lotharn-crest`,
`west-lotharn-bald`, `west-lotharn-ramp`, `west-lotharn-valley`, `west-lotharn-col`,
`west-lotharn-notch`, `west-lotharn-north-valley`. Photographed with
`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=…"` after the last
scenery change; no errors, and `tests/artifacts/west-lotharn-*.jpg`. A hillshade of the whole range
is `tests/artifacts/west-lotharn.png` (`MAP_LO=0 MAP_HI=560`).

What they showed, and what was changed because of them:

* **the long valley reads exactly as the brief asked** — a flat green floor with the beck meandering
  down it, deer on the grass, the wood standing back on both sides, and both walls rising in courses
  with a shelf of forest along the top of each. The ramp view, from high on the east arm, is the same
  thing from above;
* **the summits read as towers near their tops.** The ledges are widest low down and narrow toward
  each summit, because that is where the lift's gradient is steepest, so the top two courses of the
  crest read as one wall with a bald on it rather than as two rings. It is dramatic and it is not
  wrong — the lore's faces are "stairs too tall to climb" — but it is the one place the "ring after
  ring" reading gives out, and it is in the open questions below;
* **three views were wrong and were fixed by looking.** The crest view was aimed at a point four
  hundred and seventy metres above the ground rather than three (`look.y` is an offset above the
  ground at the target, not a height); the col view stood the camera on the mountainside at 266 m
  instead of at the col, and now stands on Kemrath's floor looking west at the gap; and the bald view
  put the camera inside the player and then inside the ground, and is now the north summit seen from
  the crest's own bald.

## Open questions

1. **The outland ribs.** Twenty-five metres of step in two metres along the South Celder margin is the
   worst reading in the west so far, and it is `relief()`'s phase chirp rather than anything this
   country does. It will not be cured region by region; it wants one change in `relief()` or
   `terrainMix` and a world-wide re-measure.
2. **Vastos's corner.** 35 m of this country's lift falls inside Vastos's (−1,100) hex at (−1849,−519),
   where three West Lotharn hexes meet one Vastos hex and the hex blend gives this country two thirds
   of the land weight. Nothing of Vastos's moved and its tests pass, but it is the one place a
   traveler on the Vastos tableland has a mountain leaning over the border at him.
3. **The south rampart wants a scarp, not a summit.** Four `mountain` hexes one hex deep above
   Isareos can only be 216 m under the present rule, because the lift is squeezed by the distance to
   the border. A landform that is a *front* — high along the row's northern half and falling over its
   southern — would read better than a cone, and the same shape would serve any future one-hex-deep
   mountain row.
4. **No pass, and should there be one?** The long valley is a through route and the atlas gives it no
   road. Whether the Lotharn's "passes beyond easy counting" should put one here is a story decision
   and belongs to whoever builds the people.
5. **Seasons.** The lore makes more of this range's autumn than of anything else about it — "the
   entire range turns from green to a fire of reds, oranges and yellows, visible from the Mithala
   plain as a band of colour along the eastern horizon". It is drawn summer green, and it is the
   first thing this country should gain when the world has seasons.
6. **The summits are towers near their tops.** `terrace()` lays the courses in the summits' own
   lift, and near a summit that lift climbs two and a half metres for every metre out, so the ledge
   that is thirty metres wide on the lower faces is three at the top and the last two courses read as
   one wall. A `period` that widened with the gradient, or a tread that did, would keep the rings all
   the way up. It would change the East Lotharn too, so it is a job for both halves at once.
7. **The `Dfa` hex** is a name and a note. If the game ever draws weather per hex rather than per
   region, the cold head is where the first cold air in the west belongs.
