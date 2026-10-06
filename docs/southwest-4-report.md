# The southwest, job 4 of 4: Marosh, Trogo, and what a deep forest is

Built 2026-09-30 on branch `southwest-4` (worktree `azhora-game-southwest-4`, from `southwest-3`
4d9cfe5), to `docs/southwest-4-brief.md`. **Terrain, climate, water, scenery and wildlife, and nothing
that belongs to anybody.** Dinelv the capital and the whole apparatus of the desert-road kingdom — the
Route Registry, the Tariff Table, the caravan road over the water gap, the waystations, the tribute
Hama pays; and in Trogo the three peoples of the ecotone, their estuary fishing villages, the timber
Hama has been quietly buying for a century, the resin the Maroshi court taxes without understanding
what it is taxing, and the forest language nobody has classified: none of it is built. Left
uncommitted, as the brief asks.

**Forty-seven hexes, and with them the programme is finished: thirteen countries and three hundred and
twenty-two hexes, the whole southwest quarter of Azhora.** The job's subject is one sentence of the
user's, and the rest of this report is what it cost to build it.

> Asked directly on 30 September 2026 what a deep forest should be in Azhora, the user chose:
> **a country you cannot see far in *and* cannot go straight through.**

Five things came out that nobody expected.

1. **Marosh is not inland.** Job 3's report called it so and the brief repeated it; the atlas gives it
   **twenty hex edges of open water**, one more than Hama, every one of them on the Iberos side — and
   job 4's two countries are between them the two most maritime in the block, Trogo with thirty.
2. **Its line is drawn by height**, and the atlas says so three separate times: the eight `hills`
   hexes are the eight `Csb` hexes *and* they carry seventeen of the country's eighteen desert edges
   and none of its twenty ocean ones.
3. **Building Marosh and Trogo took the Meroshe's aridity exceptions from five to twenty.** Job 3
   predicted eight or ten. `Af` is zero on this scale where `Csb` is 0.08, so a rainforest pulls three
   times as hard as a Mediterranean corner does.
4. **The world box moved south a fourth time, and the survey window moved west for the second time
   without anything reaching west.** Job 2's arithmetic predicted the box's new southern edge — 3264.4
   — a job and a half in advance, and got it right to the decimetre.
5. **The swale nearly ate the rainforest.** Job 1's river-swale machinery, written for two courses on
   an unbuilt border, reached sixty-seven metres into the middle of Trogo's canopy through the
   Trogoreth's bank and flattened thirteen of the crest's seventeen metres back down to the blend's own
   base. It is restricted to the two border courses now.

---

## What a deep forest is now

**One paragraph, for whoever builds the Ibenwoods.**

A deep forest is two independent rules laid on a country whose terrain word is `deep_forest`, and
neither of them is scenery. The first is **haze**: `palette.hazeDensity` at a value several times the
game's ordinary air — Trogo's is **`.0144`**, which hides a traveler half at fifty-eight metres and
entirely at a hundred and twenty, where the game's default takes two hundred and seventy-nine — and
the haze colour must be **dark**, a grey-green that is cloud inside a canopy rather than milk, because
a near-white haze this thick is most of every pixel at any distance at all. The second is
**`src/world/scenery/undergrowth.js`**, which is the climbing rule's shape exactly: no input, no rendering, no saved
state, gated on a named region set, composed with `canWalkSlope` into the one `canTraverse` hook
`moveCharacter` already takes. A forest country hands that rule **one field** — `open(x, z)`, 1 on
ground a traveler can walk and 0 in thicket — and nothing else; the rule knows no geometry, so the
Ibenwoods are one row in its table and one field in their own world module. The field is built from
**three kinds of way through and a terrain test**: the watercourses the atlas draws, the gullies the
slope cuts, the paths that join them, the clearings that sit on them, and *anything that is not deep
forest*, which gives the country's own grassland hexes and a walkable collar of forest edge for free.
The rule then refuses exactly one thing — **a step that leaves a way and enters the thicket** — and
never refuses a step out of it, which is the same asymmetry `canWalkSlope` makes when it allows a
descent and refuses an ascent, and which is what makes it impossible to seal anybody in. **Make the
ways wide** (thirteen metres either side of a river, nine of a gully, four and a half of a path — the
walking resolver moves X and Z separately and a narrow way is a way a body falls off and cannot get
back on), **make them a network rather than five stubs** (a flood fill from the country's doors must
reach every walkable cell, not merely both shores), **put every clearing on a way** (a clearing in a
thicket is a clearing nobody can enter), and **give the thicket no colliders at all** — the understory
that actually stops a body is the rule, and a forest that stops people with three thousand rocks is a
forest `canStand` can trap somebody in. Trogo comes out at **forty-four per cent of the country
walkable and twenty-three per cent of the closed canopy**, which is what "cannot go straight through"
turns out to mean in numbers.

---

## What the atlas gave

| | **Marosh** (43) | **Trogo** (44) |
|---|---|---|
| authored hexes | **18**, q −26…−22, r 127…135 | **29**, q −30…−23, r 136…142 |
| terrain | `grassland` 10, **`hills` 8** | **`deep_forest` 22**, `grassland` 7 |
| climate, per hex | **`Csa` × 10, `Csb` × 8** | **`Af` × 22**, `Csa` × 7 |
| the two fields | `hills` ⟺ `Csb`, `grassland` ⟺ `Csa`, no hex disagreeing | `deep_forest` ⟺ `Af`, `grassland` ⟺ `Csa`, no hex disagreeing |
| world extent (hex centres) | x −2750…−2450, z 1848…2540 | x −2650…−2050, z 2627…3147 |
| neighbours by shared edge | **sea 20**, Central Meroshe 8, North Meroshe 7, Ganesh Plain 3, South Meroshe 3, Trogo 1 | **sea 30**, South Meroshe 13, Marosh 1 |
| authored rivers | **3 `small` edges, Marosh on both banks** | **4 `small` edges, Trogo on both banks** |
| level (`region-levels.js`) | 2 | 3 |

Every number was read off the survey and `tests/southwest-world.test.js` re-derives them.
`src/world/terrain/region-levels.js` and `src/content/chapters/civil-war/campaign-world.js` already carried both and were not touched.

**The two are joined by one hex edge** — Marosh's southernmost `grassland` hex (−25,135) against
Trogo's northernmost `deep_forest` hex (−25,136) — and that edge is a Mediterranean terrace against a
tropical rainforest. It is the flattest of the block's twenty-five internal seams, which is the right
way round and is explained under *The seams* below.

**And the atlas draws the first water inside a southwestern country.** Job 1's twenty-eight river edges
all run on a border with unbuilt country; jobs 2 and 3 have none at all over a hundred and sixty-eight
hexes. These seven have the same country on both banks, and both chains reach the sea.

---

## The climate read, and the first `Af` in the game

Read per hex from `world-builder/map/resources/examples/azhora.wwmap` (`hexes[key].climate`,
`koppen-v1` — **not** `azhora.cmap.json`). `MAROSH_CLIMATE` and `TROGO_CLIMATE` in
`src/content/regions/southwest/southwest-world.js` record all forty-seven and the test holds them to the map hex for hex.
`SOUTHWEST_CLIMATE` now carries **322** — the whole quarter.

**`Af` × 22, `Csa` × 17, `Csb` × 8, and not one `BWh` between the two countries**, which nothing else
in thirteen can say. The whole quarter, over all four jobs: **`BWh` × 239, `Csb` × 23, `Af` × 22,
`Csa` × 19, `BSh` × 18 and one `Cfb`** — and the `Cfb` is the sea's code on Cape Heth's shoreline hex
rather than the air's, which job 3 measured before it believed it.

**`Af` is the only zero on the aridity scale and this job is where it arrives.** For three jobs the wet
end of `ARIDITY` was `Csb` at 0.08 — a Mediterranean winter — and the whole block sat between that and
1. `Af` means rain in every month of the year, and it shares **thirteen hex edges** with a country that
is `BWh` on all twenty-one of its own. **The field now spends its entire range inside this block, and
it spends most of it across one hex edge.**

### Marosh's line, and what draws it

Job 3 found Hama's wet/dry line is the ocean's — measured, sixty-nine to a hundred and ten metres
inland of the surf all the way round the corner of the continent — and left the question of Marosh's.
The answer is **height, and Marosh has no wet/dry line at all.**

Both of its halves are Mediterranean. The line it does have is between the two *forms* of the same
climate: `Csa` is the hot-summer form and `Csb` the warm-summer one, and the whole of what separates
them in Köppen is whether the warmest month passes twenty-two degrees. **On a coastal strip two hexes
wide nothing but altitude can decide that**, and the atlas obligingly writes `hills` on precisely the
eight hexes it writes `Csb` on. The `Csb` is the ridge.

And the ridge is why everything west of it is a desert, which is the third statement the atlas makes
and the one no other country in this block makes at all:

| | `hills` × 8 | `grassland` × 10 |
|---|---|---|
| climate | **`Csb`** on every one | **`Csa`** on every one |
| hex edges against the Meroshe | **17** | 1 |
| hex edges of open ocean | **0** | **20** |

Seventeen of eighteen and zero of twenty. The hills are the inland wall and the grass is the seaward
terrace, and the map says so by terrain word, by climate code and by which way each half faces.

`Csb` is the *wetter* of the two on this scale, so **Marosh's inland half is the wettest ground in the
block outside Trogo** — which reads backwards until the reason is stated, and the reason is that the
wet side of a rain-shadow wall is the top of it.

### Where the forest stops

Trogo's seven `Csa` `grassland` hexes are the brief's question, and the atlas puts every one of them on
the **exposed** shore while taking the canopy to the waterline on the **sheltered** one:

| | hexes | hex edges of open water |
|---|---|---|
| `deep_forest` (`Af`) | 22 | **13** — ten on the north-eastern shore above row 139, three at the far south-western corner |
| `grassland` (`Csa`) | 7 | **17** — the whole southern and south-eastern shore, every hex of it on row 139 or below |

That is the lore's own sentence drawn as a map: "the coast is not extensively sheltered — no deep
natural harbors on the scale of Hama". A tropical coast open to a southern ocean is salt-pruned and
carries tussock and low scrub; a sheltered embayment at the same latitude carries canopy to the
tideline, which is the lore's "mangrove and estuary ecology". **So the forest's edge reads twice over**:
as a thirty-eight-metre fall from canopy to shore grass over one hex on the south, and as mangrove
standing in the water on the north-east.

### The Meroshe, wetted twice over

Job 2 measured the four Meroshe quarters at **flat 1.000 on ninety-four of ninety-five hexes**. Job 3
made it five. **It is twenty now**, and every one of the twenty still touches a greener country:

| pulled by | hexes | range |
|---|---|---|
| **Marosh** | 9 | 0.739 – 0.913 |
| **Trogo** | 7 | **0.646** – 0.905 |
| Hama (job 3's) | 4 | 0.893 – 0.913 |
| the Ganesh Plain (job 2's one) | shared with Marosh at (−24,128) | **0.739**, was 0.893 |

**The deepest is (−26,136) at 0.646**, the South Meroshe hex that touches Trogo and Marosh both: a hot
desert hex a third of the way to a rainforest. Not one exception is in the interior, which is job 2's
finding for the third time — **this half has no gradient of its own and every departure from 1.000 in
it is somebody else's climate arriving.**

**The block's worst aridity gradient moved for the first time in four jobs.** Job 1 measured 0.157 in
twenty metres at the Ganesh Plain's corner, job 3 re-measured 0.149 at the same corner, and it is now
**0.170 at (−2485, 2800)** — on the Trogo margin, where `Af` meets `BWh`. It is still smooth: there is
no discontinuity anywhere, because the field blends the hex codes on the ground's own falloff.

### The fog belt, re-measured

Job 3 asked for this by name. `merosheFog` was written toward the Trogo margin a job and a half before
Trogo existed and **needed nothing**: its `landFrom`/`landTo` already reach full strength at Trogo's
own border. What changed is the ground under it.

Measured over the fifteen South Meroshe hexes where `merosheFog` reads above a half:

| | job 2 measured | now |
|---|---|---|
| hexes in the fog belt at 1.000 dry | **15 of 15** | **6 of 15** |
| the wettest of them | — | **(−26,136) at 0.646**, fog 0.93 |
| the rest of the nine | — | 0.716, 0.716, 0.811, 0.883, 0.893, 0.905, 0.905, 0.913 |

**The fog itself did not move by a thousandth** - `merosheFog` was not touched - and **nine of its
fifteen hexes are no longer at the driest value on the scale.**

The fog belt and the wet edge are now the same hexes, which they were not before: job 2 had fog on
ground that was 1.000 dry, and the two facts had nothing to do with each other. They do now.

---

## The ground

### Profiles, and both of them are walls

| country | terrain | base | amplitude | wavelength | measured mean | measured range |
|---|---|---|---|---|---|---|
| **Marosh** | `hills` | **74** | 2.6 | **320** | **60.84 m** | 54.6 – 64.4 |
| | `grassland` | **17** | .9 | **320** | **26.64** | 9.1 – 35.6 |
| **Trogo** | `deep_forest` | **52** | 2.4 | **320** | **46.89** | 29.6 – 66.1 |
| | `grassland` | **13** | .8 | **320** | **9.33** | 4.6 – 14.3 |
| *for comparison:* Dinelv `hills` | | 96 | 3.2 | 320 | 91.20 | |
| *for comparison:* Navarth `hills` | | 58 | 2.8 | 320 | 56.97 | |
| *for comparison:* South Meroshe `plains` | | 14 | .6 | 320 | 5.97 | |

**Both are on wavelength 320**, which is now all thirteen countries of the block, for the reason every
one of them gives: `relief()` takes its phase from x / wave, the hex blend mixes the wavelengths, and a
country on another wave shifts the phase of every sine within reach of its border. These two share
thirty-one hex edges with the four Meroshe quarters, three with the Ganesh Plain and one with each other.

**`deep_forest` at 52 is the first profile that terrain word has ever had.** The developer atlas's own
height table puts `deep_forest` at eighteen metres where `plains` is six — the map author's own hint
that a deep forest stands over the ground round it — and `campaign-world.js`'s labels were the only
other place in the game the word appeared.

**Marosh's `hills` at 74 is the second-highest base in the game outside the two Lotharns**, behind the
Dinelv plateau's 96 and thirty-six metres over Navarth's 58. It is a *coastal* ridge one hex wide
standing between twenty hex edges of water and a sand sea.

### Two crests, and nothing authored on either outward margin

**`MAROSH_RIDGE`** — fifteen metres of crest laid along the eight `hills` hex centres and nowhere else,
taken as a **maximum over the line rather than a sum** (`ovesRim`'s rule: a ridge is a ridge and not a
row of hills added together). The line bends, and the bend is the atlas's: the chain runs south-west
from (−23,128) to (−26,131) and back south-east to (−26,135), so the ridge has an elbow at its western
apex.

**`MAROSH_GAP`** — the one break, and **the atlas found it rather than a builder**. Marosh's crest is
unbroken on the terrain field, so a gap cannot be read off the hex words the way the Dinelv plateau's
four could. What *can* be read is the water: the only three river edges the map draws on this entire
coast meet at one hex corner, beside the ridge's own western elbow, and a river crossing a ridge line
is a water gap. Eleven metres of notch in fifteen of crest, sixty paces wide. It is also the only place
a loaded animal crosses this country, which is the whole of why Marosh is a kingdom — and the road, the
Registry, the waystation and the toll are all the court's and none of them is built.

**`TROGO_CREST`** — twenty-six metres, laid along **the seven Trogo hexes that share an edge with the
South Meroshe**, which is the atlas's own line and not a chosen one. The lore gives the country in a
sentence — "a ridgeline that catches the southern moisture and drops a fog wall on its windward face
while the leeward side stays desert" — and that sentence is the design: the crest is those seven hexes,
the windward face is all twenty-two `deep_forest` hexes south-east of it, and the leeward side is job
2's fog belt and then ninety-five hexes of hot desert.

**Nothing is authored on either country's outward margin.** The front against the Meroshe is the hex
blend carrying a base difference, which is the West Lotharn's contract and the Dinelv escarpment's — a
front is what the atlas draws here, and the report measures it rather than lowering a base to hide it.
Measured between hex centres: the forest wall stands **50.1 m** over the desert and Marosh's
western face **42.3 m**.

### The crest is not the high ground, and that is a measurement

**The one real surprise in the ground.** Trogo's crest line sits on the hexes the atlas puts against
the desert, where the hex blend is pulling the base down toward the Meroshe's fourteen metres — so
base-plus-lift peaks **forty to fifty metres south-east of the divide, not on it**. A gully drawn from
the crest line itself climbed six and a half metres before it began to fall.

The fix is the lore's own arrangement rather than a fudge: each gully now begins at its local high
point, and a clearing straddles the gap between that point and the crest path. `trogo.md`: "gaps in
the ridge where the desert air pushes through in the dry months, creating corridors of sparse growth
cutting into the forest." **The clearing is the gap and the gully is the corridor.** Three of the four
gully heads stand inside a clearing and the fourth stands on the crest path itself.

The crest lift went from 17 to **26** at the same time and for the same reason: at 17 the margin hexes
were lower than the interior and the "ridgeline" was a shelf.

### The cuts: four combes, four gullies, and all eight fall the whole way

**`MAROSH_COMBES`** — four dry winter combes down the seaward face. `Csa` means the rain comes in winter
and the summer does not, and the atlas draws exactly one river on this coast, so the other drainages
are cut beds for most of the year. It is Hama's winter beds one country east, on a face instead of a
flat, and the greenest grass in Marosh stands in the floor of each.

**`TROGO_GULLIES`** — four stream gullies off the crest. The lore: "the land itself is steep… rivers run
fast, elevation changes quickly". Thirty-eight metres of fall from canopy to shore grass with rain in
every month cuts gullies; the atlas draws only the one of them big enough to be a river. **There is no
water surface in any of the four** and the test asserts it: what they are is a cut a traveler can walk
down, and they are the second of the undergrowth rule's three kinds of way.

Measured head to mouth on the built ground:

| cut | head → mouth | fall | worst rise over any reach | land clearance at the mouth |
|---|---|---|---|---|
| **Marosh, the north combe** | 60.6 → 10.0 | **50.6 m** | 0.00 | 33 m |
| **Marosh, the upper combe** | 64.1 → 14.1 | **50.0** | 0.00 | 30 |
| **Marosh, the middle combe** | 60.1 → 23.9 | **36.2** | 0.00 | 32 |
| **Marosh, the south combe** | 60.5 → 19.9 | **40.6** | 0.00 | 29 |
| **Trogo, the north gully** | 66.2 → 31.0 | **35.3** | 0.00 | 42 |
| **Trogo, the middle gully** | 68.6 → 22.2 | **46.4** | 0.00 | 78 |
| **Trogo, the head gully** | 69.4 → 39.4 | **30.0** | 0.00 | 172 |
| **Trogo, the south gully** | 68.8 → 21.3 | **47.5** | 0.00 | 87 |

**Not one reach of any of the eight climbs a centimetre**, which took a round of re-pointing to get:
see *The crest is not the high ground* above.

**All eight let go at the shore**, which is `merosheSkirt`'s lesson and Hama's winter beds' after it:
the coast field has already brought the last forty metres down to the water before `southwestGround`
sees the ground, so a cut laid on top of that puts a mouth under the sea. Every one of the eight ends
more than twenty metres clear of the surf and above five metres of height.

### The swale, and the thing it nearly did

`SOUTHWEST_SWALE` exists because job 1's two rivers are drawn on a border with unbuilt country, so two
thirds of the blend along them is `outland`'s six metres on a hundred-and-fifty-metre wave; **there is
nothing to flatten on a course whose own country is on both banks.** Job 4's two are exactly that, and
leaving them in `nearestSouthwestRiver`'s list flattened the ridges they run off: measured, the
Trogoreth's bank reaches within **sixty-seven metres** of the middle of Trogo's canopy and the swale ran
at **0.91** there, which pulled thirteen of the crest's seventeen metres back down to the blend's own
base and made the whole rainforest read as a flat shelf at 42 m.

`SOUTHWEST_SWALE_RIVERS` is the two border courses and nothing else now, and the test pins the list.

---

## The water

**Two courses, both inside their own country, both reaching the sea, and both waded anywhere.**

| course | size | from | to | fall | what it is |
|---|---|---|---|---|---|
| **the Nahr** | `small` × 3 | the water gap | the Iberos | 22.1 m over 170 | the only river the atlas draws on the eastern face of the peninsula |
| **the Trogoreth** | `small` × 4 | the canopy | the southern ocean | 26.4 m over 230 | the only permanent water in the first rainforest in the game |

**The names.** *Nahr* is simply the Maroshi for "river" (`maroshi.roots.river` in `src/gameplay/skills/languages.js`),
so the one river this coast has is called the river — which is job 1's *Vaellir* and job 2's *Malhat*
for the third time: the tongue's own word, nothing coined. **The Trogoreth is the lore's own name**:
"the largest, which Maroshi records call the Trogoreth ('the Trogo river,' a construction that
acknowledges they have no better name for it)".

**Both are waded over every sample, and that is a decision rather than an oversight.** The atlas draws
`small` on all seven edges and `small` is waded everywhere else in the game; the lore's navigable delta
is at a scale the atlas does not draw here. It also matters for the country: **Trogo is the first
country in the game with a movement rule of its own that is not the climbing rule, and a walled river
inside it would be a second barrier crossing the first**, which is exactly how a traveler gets sealed
into a corner. One gate in this country, and it is the undergrowth.

---

## The undergrowth rule

`src/world/scenery/undergrowth.js`, new, 119 lines, pure. **It is `src/gameplay/movement/climbing.js`'s shape and deliberately so**: it
owns no input, no rendering and no saved state; it gates movement through the `canTraverse` hook
`moveCharacter` already takes; and it applies only inside a named set of regions, because the climbing
rule is Lotharn-and-Suval-only for exactly the reason a movement gate anywhere else would strand the
autopilot, a quest route or a traveler.

One line of `src/main.js` changed:

```js
const walkingSlope=(x,z,nextX,nextZ)=>canWalkSlope(x,z,nextX,nextZ,climbWorld)&&canPushThrough(x,z,nextX,nextZ,climbWorld);
```

### The table, and why it holds a function

```js
const THICKETS = Object.freeze([
  Object.freeze({ id: 'trogo', regions: new Set([44, 'Trogo']), open: trogoWay }),
]);
```

A forest country hands over **a region set and one field** and nothing else. `undergrowth.js` knows no
polyline, no clearing and no watercourse — Trogo's own `trogoWay` knows those, because they belong to
the country. **The Ibenwoods are one row here and one field there**, and nothing in the rule changes.
The test asserts it: `TROGO_GULLIES` and `TROGO_PATHS` appear nowhere in the file.

### The rule, in three lines

```js
export function canPushThrough(fromX, fromZ, toX, toZ, world) {
  const thicket = thicketAt(world, toX, toZ);
  if (!thicket) return true;                                   // no opinion outside its own countries
  const to = thicket.open(toX, toZ);
  if (!Number.isFinite(to) || to >= UNDERGROWTH.open) return true;   // the destination is a way: go
  const here = thicketAt(world, fromX, fromZ);
  if (!here) return false;
  const from = here.open(fromX, fromZ);
  return !Number.isFinite(from) || from < UNDERGROWTH.open;     // already in the thicket: never held
}
```

**It refuses exactly one thing: a step that leaves a way and enters the thicket.** The last clause is
the whole safety of it — a step *out* of the thicket is never refused, so a traveler put down in the
middle of the canopy by F8, by a restored save or by a spawn walks out and the fence closes behind them.
That asymmetry is the same one `canWalkSlope` makes when it refuses an ascent and allows a descent ("a
steep descent loses ground support and falls in the traveler controller; it is not an invisible wall").

The rule reads the **destination** rather than a direction, which matters because the walking resolver
moves X and Z separately: a traveler walking diagonally along a gully has the component that leaves it
refused and the component that follows it allowed, so they slide along the way instead of stopping at
it. There is no diagonal to exploit either — both axes are checked against the same field at their own
destinations.

### The ways through

| kind | what it is | half-width | count |
|---|---|---|---|
| **watercourse** | the Trogoreth and its banks — "follow the rivers down" | **13 m** | 1 |
| **gully** | the stream cuts off the crest, dry, scoured to stone | **9 m** | 4 |
| **animal path** | worn by whatever walks it most; no cutting, no blaze, no bridge | **4.5 m** | 5 |
| **clearing** | four desert-air gaps on the crest and two treefall gaps | r 25–34 | 6 |
| **not deep forest** | the seven `Csa` hexes and the collar of forest edge that blends into them | — | — |

Each feathers rather than stopping dead, and the rule takes a step as passable at half.

**The widths are the whole safety margin of the country.** A way narrower than a few metres is a way the
X/Z-separated resolver can fall off and then not get back on.

**Two of the five paths are rungs across the middle of the forest, and the second was put in by
measurement.** With four ways and four paths, one hex — (−24,138), the middle of the eastern canopy —
had no open ground within fifty paces of its centre: it sat between the north link and the shore path
with eighty metres of thicket to either. **The invariant the test now holds is that no hex of Trogo is
more than fifty paces from something a traveler can walk on**, and the middle link is what makes it
true.

### The flood-fill proof, in both directions

`tests/trogo-undergrowth.test.js`, on a three-metre lattice over Trogo's own hexes
(**27,902 cells**), obeying `canPushThrough` at every step — the method
`tests/west-lotharn-peaks.test.js` uses to prove the ramps are the only way up.

| | result |
|---|---|
| **walkable at all** | **12,252 of 27,902 cells — 43.9 %** |
| **of the closed canopy** (thicket > .78) | **4,222 of 18,420 — 22.9 %**, so four fifths of the forest proper is refused |
| **from the desert margin, ways open** | reaches the southern shore, the eastern grass, the Trogoreth's mouth and the coastal grass on row 142 — **and every one of the 12,252 walkable cells**, with none missed |
| **from the southern shore, ways open** | reaches **all nine** points of the crest, and exactly the same ground |
| **from the desert margin, ways shut** | **fewer than sixty cells.** It does not reach either shore, the eastern grass or the river's mouth. **The same fill with the ways open reaches more than two hundred times as much ground**, which is the whole of what the rule is worth |
| **can anybody be sealed in?** | **No.** A reverse flood fill from all the walkable ground, asking of every neighbour "could a body have come from there to here?", covers **every cell of the country without exception** |

And three things stated rather than inferred:

* **the thicket carries no collider of its own.** The emergents and the canopy trees carry one each, as
  any tree does, and are kept off the ways; the understory — the tree-fern, the palm, the rattan, which
  is what actually stops a body in a rainforest — carries none at all. So `canStand` in the middle of
  the thicket answers exactly what it answers in an open wood, and **`tests/nobody-sealed-in.test.js` is
  untouched by this country**;
* **outside Trogo the rule has no opinion at all.** The test walks every region's spawn, takes eight
  steps of a metre from each, and asserts every one is allowed — including inside the four climbing
  regions, where the other movement rule is the one with an opinion;
* **a walked proof, not only a lattice one.** A traveler pushed straight off the middle gully with the
  real gate on moves less than twelve metres in forty steps; the same walk with no gate goes where it
  likes.

---

## The haze

**`.0144`.** `FogExp2` hides a fraction `1 − exp(−(density × depth)²)` of a surface, so a density fixes
a sight line:

| hidden | Trogo `.0144` | the game's default `.0062` | Nethereum `.0071`, the thickest air anybody had asked for | the South Meroshe fog belt `.0046` | the Dinelv plateau `.0021` |
|---|---|---|---|---|---|
| a quarter | **37 m** | 85 | 75 | 115 | 253 |
| **half** | **58 m** | 134 | 117 | 181 | 396 |
| nine tenths | **105 m** | 245 | 214 | 330 | 723 |
| **entirely (95 %)** | **120 m** | **279** | **244** | 376 | 824 |

**One hundred and twenty paces**, and this block has used a pace and a metre as the same thing since
job 1 (job 2's erg "blocks sight at a hundred and forty paces" on a dune field whose wavelength is a
hundred and forty metres), so these are metres read as paces and nothing is being rounded in the
reader's favour. Job 2's erg is the shortest sight line the game had, and it blocks the
view at a hundred and forty with a six-metre dune on flat ground; this blocks it at a hundred and twenty
with cloud, **and there are trees in the way as well**. It is 2.32 times the game's default
density and 2.03 times Nethereum's `.0071`, the thickest air anybody had asked for before this, and the
test asserts that nothing else in Azhora has thicker air.

**The colour was the harder half.** Job 1 found that a near-white haze is over half of every pixel past
a hundred and fifty metres and job 3 found the renderer lifts an authored colour a long way, so a haze
this thick had to be **dark** or the country would be a white room. Trogo's is `0x6d7d6b` — the darkest
haze in the game, and the test holds it against every other — under a sky of `0x8e9d92`, which is a low
grey-green overcast rather than blue. What that actually is, is the lore's own fog: "not the cold
sea-fog of Bouén's coast. It is warm and thick and close."

**Marosh's `.0055`** is the other sky, and it is an ordinary number with an argument: twenty hex edges
of sheltered Iberos water, one more than Hama's nineteen, and **not a single desert hex** where Hama is
half desert. A sheltered warm sea puts more water in the air than an open cold one does, so it is a
shade thicker than Hama's `.0052`, which was the block's previous record.

---

## The seams, and the ribs

Twenty-five internal seams now — job 1's five, job 2's four, job 3's one, job 4's one and fourteen
between the jobs. Measured as the steepest four-metre central difference at points where the blend is
entirely the block's own:

| seam | steepest step | |
|---|---|---|
| Dinelv Highlands \| Ganesh Plain | **8.99 m** | the escarpment, job 3's |
| Dinelv Highlands \| Ganesh Desert | 6.65 | |
| Cape Heth \| Dinelv Highlands | 6.41 | |
| Dinelv Highlands \| West Meroshe | 6.33 | |
| Dinelv Highlands \| North Meroshe | 5.94 | |
| **South Meroshe \| Trogo** | **4.43** | **the forest wall**, thirteen edges, nothing authored on it |
| **Central Meroshe \| Marosh** | **3.42** | the ridge's western face |
| **Marosh \| North Meroshe** | **3.26** | |
| **Marosh \| South Meroshe** | **2.73** | |
| Central \| North Meroshe | 2.44 | |
| Cape Heth \| Ganesh Desert | 2.32 | |
| **Ganesh Plain \| Marosh** | **2.30** | |
| Central \| West Meroshe | 2.27 | |
| North \| West Meroshe | 2.27 | |
| Ganesh Plain \| North Meroshe | 2.19 | job 2's seam; its own two halves still meet at 0.27 |
| Ganesh Desert \| Navarth | 2.19 | |
| Ganesh Desert \| Ganesh Plain | 2.18 | |
| Navarth \| West Pyros | 1.92 | |
| Ganesh Plain \| Navarth | 1.90 | |
| Central \| South Meroshe | 1.75 | |
| Ganesh Plain \| West Pyros | 0.83 | |
| Hama \| South Meroshe | 0.82 | |
| Central Meroshe \| Hama | 0.71 | |
| Hama \| West Meroshe | 0.58 | |
| **Marosh \| Trogo** | **0.00** | the one edge between job 4's two, and the flattest in the block |

**Job 4's five seams against the Meroshe are all under four and a half metres**, where the Dinelv
escarpment's five are all over five and a half — which is the difference between a seventy-four-metre
ridge and a ninety-six-metre plateau, and between twenty-six metres of crest and eighty of escarpment.

**The flattest of all twenty-five is Marosh | Trogo**, which is the one edge between job 4's two
countries. A `Csa` Mediterranean terrace at base 17 against `Af` rainforest at 52 ought to be the
steepest thing in the block; the hex blend crosses thirty-five metres of base over a hex and a quarter
without a step in it, because that is what a base does and no crest is authored within reach of that
edge.

### The ribs against the outland

| | steepest 4 m step |
|---|---|
| the block \| open country (every outer margin) | **11.52 m** (p95 3.18) |
| *inside all thirteen, blend > .95* | p95 **2.68**, max 15.95 |
| *inside with the Dinelv plateau left out* | p95 **1.78**, max 4.10 |
| *inside the ten countries with no escarpment in them* | p95 **1.13**, max 2.42 |
| *for comparison:* job 3's block \| open country | 7.99 |
| *for comparison:* job 2's | 6.06 |
| *for comparison:* job 1's | 9.13 |

**The block now has three escarpments and not one.** Job 3's report could say the Dinelv plateau was the
only ground in eleven countries steep enough to register; Marosh's ridge at base 74 and Trogo's crest at
52 plus 26 both stand over a desert at 14, on the same contract. With all three left out, the other ten
countries still step under 1.2 m at p95, which is job 3's own figure.

**The outland rib was not chased, and nothing inside this quarter can take another bite out of it.**
Every unbuilt margin of the southwest is now somebody else's quarter — Alezhor, Ibenale, the three
Ibenwoods, East Pyros, the Nether Desert, Babon and the Azhor Stones — so what is left of the rib is a
`relief()`/`terrainMix` problem and a world-wide job, which every report in this programme has said.

---

## The world box: south again, and the window west again

```
before   x -4360.001927939127 … 609.9980720608719   z -2167.195996001615 … 3177.823940164498
after    x -4360.001927939127 … 609.9980720608719   z -2167.195996001615 … 3264.4264805429416
```

**Both axes were measured and only one moved.** Trogo's southernmost hexes are (−29,142), (−28,142) and
(−27,142), centres at z = 3146.691 and lower vertices a circumradius (57.735 m) past that at 3204.43, so
the margin of 60 takes `maxZ` to **3264.4264805429416** and the world from 53.450 hexes tall to
**54.316**. **Job 2's report predicted "about 3264.4" a job and a half in advance and was right.**

`minX` does **not** move and was checked rather than assumed: Trogo reaches x = −2050 and Marosh −2750,
where Cape Heth's western edge stands at −4360.002, eleven hundred metres away. `maxX` and `minZ` are
untouched. The world is **49.700 by 54.316**.

### The window: `maxR` 144 → **145** and `minQ` −49 → **−50**

The coast lattice is laid `COAST_MARGIN` (96 m) beyond the bounds and snapped to a fixed phase, so its
last row now stands at z = **3361.65** and the lattice is 1,292 × 1,408 = **1,819,136** points. Sampling
all of them and collecting every hex any sample falls in gives **q −50…34, r 79…145**.

**`minQ` moved again without anything reaching west, and that is the second time.** x = W(q + r/2), so a
lattice one row deeper in the south reaches half a column further west at the same world x; q = −50 is
reached only on rows 144 and 145, in the far south-western corner of the sheet where the map is open
ocean. Job 2 found the same thing when it grew the world south by nine rows and gained four columns.

**The lesson job 3 drew is now a pattern with four instances, and job 4 is the mirror of it.** Job 1's
brief predicted no movement and the box went west; job 2's predicted none and it went south; job 3's
predicted none and it went west; **job 4's brief predicted the south and got the south *and* a window
that went west** — which is not the same statement, and is the reason to measure both.

### What the widening bought: one hex, and Trogo's own lore looks at it

`LAND_HEXES` goes from 2,078 to **2,079**. The five columns −50…−46 hold no claimed hex anywhere in rows
79–145; row 145 holds exactly one, **(1,145), an Azhor Stones hex whose terrain word is `deep_forest`,
like Trogo's own**. `trogo.md`: "The southeastern coast of Trogo faces the southern ocean and the Azhor
Stones, which are visible from the higher coastal headlands on clear days." It stands at x = 650,
z = 3406 — two thousand eight hundred metres out from Trogo's nearest ground and past `maxX` — so it is
horizon and nothing else. It is the smallest widening this window has ever had: job 1's bought 71 hexes,
job 2's 143, job 3's none and job 4's one.

### The guards that moved — seven files

| file | was | now |
|---|---|---|
| `tests/region-layout.test.js` | `< 54` / `> 53.4` hexes tall | **`< 55` / `> 54.2`**, with Trogo's case stated |
| `tests/ascarth-world.test.js` | *three*: `maxZ === 3177.824`, `tall = 53.450`, the lattice's deepest row `=== 144` | **3264.426**, **54.316**, **145** |
| `tests/izol-world.test.js` | `maxZ === 3177.824` | **3264.426**, and the edge is Trogo's now |
| `tests/mithala-world.test.js` | `tall = 53.450`, `maxZ === 3177.824`, `WINDOW.maxR === 144` | **54.316**, **3264.426**, **145** |
| `tests/west-lotharn-world.test.js` | `maxZ === 3177.824` | **3264.426**, and its comment holds five facts |
| `tests/isareos-world.test.js` | `\|tall − 53.450\| < .01` | **54.316** |
| `tests/nethereum-world.test.js` | the same guard | **the same move** — found together for the fifth time |
| `tests/southwest-world.test.js` | job 1–3's box and window test | rewritten for four jobs |

---

## What grows

`src/content/regions/southwest/southwest-scenery.js`, extended with **a fourth pass of its own** after job 3's, for the reason
each of the earlier three gives: job 1's loop sorts by how dry the air is, job 2's by which desert
surface is underfoot, job 3's by salt, bedding and a green line, and **none of those vocabularies
contains a canopy**. Keeping the four apart also keeps the earlier loops at exactly their own cell
counts, so the seeded stream jobs 1–3 drew from is the same stream to the draw.

| country | what is laid on it |
|---|---|
| **Marosh** | **holm oak** on the crest and the upper face, standing well apart over **dense maquis** — the first real wood in the southwest outside the Vaellir's gallery and Navarth's one forest hex; grey **limestone** showing along the top; on the terrace, hot-summer **`Csa` grass** with bare earth between the tufts and **aromatic scrub** in the low places; the greenest grass in the country in the four combe floors; **sea turf and shingle** on the last forty paces of the Iberos shore |
| **Trogo** | the lore's three layers, in order: **tall buttressed emergents** over a **closed canopy** over an **understory** of tree-fern and palm over a floor of **leaf litter** with nothing green on it; **buttress roots** a metre high; on the crest, the **fog forest** — shorter, denser, greyer, standing in cloud; **ferns down both sides of every way**, so a corridor reads as a corridor; **light-gap saplings and the only grass under the canopy** in the six clearings; **stone** on the gully floors, which a rainforest scours every month; **mangrove on prop roots** where the sheltered shore meets the water; and **salt-pruned tussock and low scrub** on the exposed southern collar |

**The ground's own colour.** `SOUTHWEST_GROUND` gained five: `maquis` (0x2f3d1d) and `terrace`
(0x5d6331) for Marosh's two halves; `canopy` (**0x1c2415**), the floor of a closed tropical canopy,
which is **the darkest ground in the game** and takes the record off job 2's desert varnish; `cloudFloor`
(0x333f2d), the fog forest's moss and wet leaf; and `saltPruned` (0x54602d), the coastal collar.
**The ways and the clearings are painted *lighter* than the floor between them**, which is the reverse
of everything else in this block and is the only way a corridor reads as a corridor from above: what a
light gap in a rainforest is, is light.

### `groundTint` is a table now, with the permanent guard two jobs asked for

Job 2 found `southwestTint` computed and dropped on the floor; job 3 met the same failure mode one level
down. Both asked for the `if/else` chain in `src/world/terrain/world-terrain.js` to become a list of pairs walked in
order, and **it is one**: four families — `gala`, `oves`, `mithala`, `southwest` — each answering `null`
where it has no opinion, the first with an opinion painting, and nothing about the colour of any ground
in Azhora changed. The order is the chain's own.

What makes it safe is the guard, in `tests/southwest-world.test.js`: **every family in the table must
move the colour of the ground somewhere in its own country**, scanned over every hex of every country
the family covers. A fifth family added without a line there turns the test red with its own id in the
message, and a family that quietly stops painting turns it red with the same.

### The counts

`world.southwestMetrics`, job 4's own additions. **The block carried three hundred and fifty-eight
trees over eleven countries and these two carry four thousand four hundred and sixty-seven.**

| | | | |
|---|---|---|---|
| **Trogo understory 7,294** | **Trogo leaf litter + gully stone 4,274** | **Trogo canopy 2,239 trees** | **Marosh maquis 2,205 bushes** |
| **Trogo fog forest 1,286 trees** | Trogo fern down the ways 744 | **Marosh holm oak 598 trees** | Trogo buttress roots 511 |
| Marosh limestone + shingle 778 | **Trogo mangrove 177 trees** | **Trogo emergents 167 trees** | Marosh terrace and combe grass, in `tufts` |

**Four thousand four hundred and sixty-seven trees** — 2,239 canopy, 1,286 fog forest, 598 holm oak,
177 mangrove and **167 emergents, which are the tallest things the game has ever grown** (26–38 m).
Against the block's own eleven countries before them: 119 in Navarth's one `forest` hex, 181 along the
Vaellir, 71 thorn on the hamada, 21 in the Dinelv basins and 16 leaning inland on Hama's coast.

The whole world carries **72,341 colliders** with both countries in it. What job 4 put into that is the
trees and Marosh's maquis and nothing else: **Trogo's 7,294 understory clumps carry no collider at all**,
which is the sentence the whole movement rule rests on. The thing that stops a body in that forest is
`src/world/scenery/undergrowth.js`, and `canStand` cannot see it.

---

## What lives there, and why

**Seventeen ranges over forty-seven hexes, and the rainforest is the densest country in the game.**

| | ranges | hexes | a hex |
|---|---|---|---|
| job 1 | 17 | 107 | 0.159 |
| job 2 | 7 | 95 | **0.074** |
| job 3 | 13 | 73 | 0.178 |
| **job 4** | **17** | **47** | **0.362** |
| *of which* **Trogo** | **11** | 29 | **0.379** |
| *of which* **Marosh** | 6 | 18 | **0.333** |
| *for comparison:* Hama, job 3's densest | 5 | 19 | 0.263 |
| *for comparison:* the South Meroshe, thirteen hex edges away | 2 | 21 | **0.095** |

**The contrast with the Meroshe is the point and it is one walk.** The South Meroshe carries two ranges
over twenty-one hexes and Trogo eleven over twenty-nine, and a traveler crosses from one to the other in
four hundred paces. That is what `Af` means against `BWh`: twenty-two hexes of closed canopy with rain in
every month, a permanent river through them, an estuary at the mouth of it and thirty hex edges of
productive warm ocean is the richest ground the atlas draws anywhere, and drawing it as sparse as the
desert would be job 2's lie in the opposite direction.

| zone | species | where | why |
|---|---|---|---|
| `marosh-ridge-deer` | red-deer | the oak ridge | **the first real wood in the southwest** outside the Vaellir's gallery and Navarth's one `forest` hex. `Csb` buys oak and maquis where `Csa` buys grass, and a deer is seen where a wood has open ground beside it |
| `marosh-maquis-boar` | boar | the maquis | Eer's own argument: "the ordinary pig of a Mediterranean farmland, and it is here because the scrub is" — and this is the densest scrub in thirteen countries, with acorns over it |
| `marosh-terrace-hares` | upland-hare | the `Csa` terrace | the west's hare on the wettest ground it holds in this block, two hundred paces from the driest |
| `marosh-harrier` | harrier, 9 m | over the terrace | three hundred metres of grass between an oak ridge and an ocean |
| `marosh-shore-gulls` | gull | the Iberos shore | **the one shore in the whole block that is not an open ocean**, on "one of the most biologically productive bodies of water bordering the known world" |
| `marosh-rim-hawk` | plateau-hawk, 33 m | the dry side of the crest | the overview's dry-plateau hawk, and **this ridge is the wall that makes the rain shadow** — the strongest case for the bird anywhere on the atlas. Thirty metres of fall and then the sand sea |
| `trogo-crest-bone-bird` | **bone-bird**, 40 m | the dry corridors on the crest | **the desert's own bird at the edge of a rainforest, and the point of it is that it stops.** The tenth and last bone-bird in the block |
| `trogo-edge-cats` | **forest-cat** (new) | the crest | "the carnivores that hunt both zones are the most studied by the communities here" — and the atlas draws the sharpest forest margin anywhere right there |
| `trogo-gap-cats` | **forest-cat** | the canopy fall | the other half of the same sentence: an arboreal cat hunts "birds at the canopy level of the forest edge trees", and a light gap is an edge in the middle of a forest |
| `trogo-floor-boar` | boar | the mid-slope litter | the one large ground animal of a rainforest this bestiary can honestly supply: a pig roots, and the floor is leaf litter over a metre of root mat |
| `trogo-gully-boar` | boar | the south gully | a second band with a hundred and forty metres of thicket between; a gully floor is scoured stone with fallen fruit washed into it |
| `trogoreth-otters` | **otter × 1.32** | the Trogoreth | **the great river otter**, which the overview names and puts in "the forest-margin watercourses" — which is exactly what this is |
| `trogo-estuary-waders` | wading-bird | the delta | the lore builds a human economy on "the bird and fish populations that the estuary communities depend on" |
| `trogo-estuary-egrets` | egret | the sheltered north-eastern shore | the only sheltered water Trogo has, where the canopy comes to the tideline |
| `trogo-shore-gulls` | gull | the exposed southern shore | the bottom of the continent: salt-pruned tussock, shingle and surf |
| `trogo-southern-albatross` | **albatross** (new), 44 m | over the southern headland | **the one place in Azhora it can be put**: the bird that summers "beyond the horizon south of Azhora", over the southernmost ground in the game |
| `trogo-delta-dolphins` | dolphin, at sea | off the delta mouth | the overview's Nylon estuary on the other side of the continent, in the same situation |

Every site was measured on the built world — dry, its own country's by both `regionAt` and
`hexOwnerAt`, off every water surface and every dry bed, standable, with the test's own four-metre
step under 2 m — and every range's half-diagonal is between **57 and 104 m** against `LIFE_REACH`'s 130.
Seven of the seventeen had to be moved after the first measurement.

### The two new rigs, and what the lore does not give

**`trogo.md` spends a paragraph on this country's fauna and names not one animal.** What it gives is
four placement rules — desert species follow the rivers down and some stop at the forest edge, some have
adapted and are in both zones, forest species come up to the desert edge for particular resources and go
back, and the carnivores that hunt both zones are what the communities study hardest. Every one of those
is usable and none of them is a species. So there is no monkey, no hornbill and no tree-frog here.

* **The forest edge-cat** is the overview's only forest-margin predator and the lore asks for it in so
  many words. The overview names it and describes it: "different from both the terrace leopard of Pyros
  and whatever occupies the Ibenwood interior… smaller than its highland relative, more arboreal, and has
  been observed hunting birds at the canopy level of the forest edge trees as readily as small mammals on
  the ground." **What is the lore's and what is the build's**, stated plainly because that line is the
  difference between this and the dustback: the lore gives the animal, its habitat, its size relative to
  a leopard, its arboreal habit and its two hunting grounds; the build gives it a cat's body, which is
  what "cat" is. Nothing about the *dustback* is available in that way. Extending it a quarter of a
  continent south is job 3's sea-plunger argument, and **the Ibenale and Alezhor margin is the animal's
  own home and is not built**, so whoever builds it inherits this rig rather than a stand-in.
* **The Iberos albatross** — "a large, slow-breeding oceanic species… understood by Azhoran sailors to
  spend its summers somewhere beyond the horizon south of Azhora — beyond what Azhoran geography extends
  to." **Trogo's southern shore is the southernmost ground in the game** — it is what `WORLD_BOUNDS.maxZ`
  is made of — and off it are the Azhor Stones and then nothing the atlas draws. The longest wing in the
  game (2.0 against the bone-bird's 1.72) held flatter and stiller than anything else in the sky
  (`SOAR`: rock .04, dihedral .02), which at this scale is the identification: everything else up there
  is working at staying up.

**And the great river otter is a third animal the overview names, built as the rig the game has at a
third again the size** — "the largest form, the great river otter, is substantially more capable of
taking fish than its smaller cousins" — because the overview puts it in "the forest-margin watercourses",
which is exactly what the Trogoreth is.

### Three refusals, held for the fourth time

* **The Ganesh dustback.** The lore names it, gives it an economy and a social meaning, and never
  describes its body; the only dustback the lore *does* describe is a domestic bovid. Four jobs have now
  declined it for the same reason.
* **The canyon tortoise, and job 3 said Trogo was the last country that could want it.** It is named and
  described, so building it would invent nothing, and it still fails `tests/west-life.test.js`'s first
  law — nothing in the west can be walked down. Solving that honestly means an exemption list (the cattle
  already fail the law) or a burrow to go into, and both are design decisions. **It was not taken.**
* **Nothing domestic.** The caravan animals that cross Marosh's water gap, the plots on its terrace, the
  estuary communities' boats and every beast in any of it belongs to somebody.

---

## Names, the skies and the speech

**Nothing is coined and two names are taken.** *Nahr* is the Maroshi for a river and *Trogoreth* is the
lore's own word for the Trogo river. Everything else is the lore's own (the Dry Corridors from "corridors
of sparse growth", the Fog Ridge from "a ridgeline that catches the southern moisture") or plain English
(the Marosh Ridge, the Water Gap, the Seaward Terrace, the Iberos Shore, the Dry Side, the Trogo Forest,
the Animal Paths, the Thicket, the Forest Edge, the Estuary).

**Two skies**, both argued above.

**Marosh speaks plain `maroshi` and for once that is the reading rather than a stand-in.** Every other
Moreshi country in this block carries a dialect because it is a margin of the language; this one is the
centre of it — `marosh.md`: "the court language is Maroshi, a dialect of Coastal Trade Moreshi… Maroshi
is its eastern-coast peninsular form", and Marosh *is* the eastern coast of the peninsula. A dialect
marks a deviation from a centre and there is no deviation to mark. It is job 2's argument for the
Meroshe run from the other end of the same language.

**Trogo gets `fogspeech`**, the transition zone's contact register, and it carries the single best piece
of language in the archive: "a grammatical category that neither Moreshi nor any Azhoran mainland
language possesses — a verb aspect marking actions that are conditional on the current state of the fog.
Whether the fog is present or not changes the form of certain verbs describing movement, visibility, and
resource access… The canyon Moreshi find it unnecessary. The coastal forest people find it imprecise."
The transform makes that aspect audible on one class of verb.

**It is filed as a dialect of Maroshi and the comment owns the compromise.** Half of the register is
canyon Moreshi and the other half is the forest language of the mid-slope and the coast, "whose ancestry
does not trace to the Moreshi tradition and whose language belongs to neither the Moreshi family nor any
Azhoran mainland family that has been classified". That half is not in `LANGUAGES` and inventing a tongue
for it is not a builder's decision — so this entry is the half that has a parent, the way job 3's Cape
Heth carries plain Maroshi as a stand-in. **Filing it under Moreshi is exactly the Maroshi court's own
mistake, which the lore is dry about, and it is named in the source so nobody mistakes it for a finding.**

---

## The lore, adjusted to the atlas

Applied **in place** in `world-builder/azhora_lore/geography/regions/` (the write was allowed; nothing
staged, committed or stashed there). **Twelve claims across two files.**

**`marosh.md`** — four:

1. **"Its capital, Dinelv, sits on the eastern (Iberos-facing) shore"** → **confirmed, with a consequence
   the archive has not noticed.** All twenty of Marosh's ocean edges are on its eastern side and its
   whole western margin is hot desert, so a court on the Iberos shore is exactly where this country is.
   What follows is that **the Dinelv Highlands are somewhere else**: the atlas puts that plateau on the
   peninsula's *western* face, four hundred metres of desert away, with a sea cliff on its own
   south-western corner. The two cannot be the same ground. Either the highland is named for a court it
   is a week's travel from — which is what a road kingdom would do with a plateau its caravans cross — or
   the archive is carrying two Dinelvs.
2. **"Its coastal margins are semi-arid… with enough seasonal rain to sustain the scrub"** → on this
   coast the margin is not semi-arid at all and the desert does not fade in: **it begins at a ridge**.
   The table above is the adjustment.
3. **The ridge, the gap and the river are not in the file at all.** Added, with the atlas's own finding
   about the gap: the three river edges meet at one hex corner beside the crest's elbow, and that is
   where the caravan routes leave the coast.
4. `related:` — it listed a `meroshe_desert.md` that does not exist (job 2 found this; the file is
   `moroshe_desert.md`). Corrected, with Trogo and the Ganesh Plain added; **the file itself was not
   renamed**, which is the user's call and which two briefs have now declined.

**`trogo.md`** — eight:

5. **"the territory that begins where the Meroshe's canyon country ends and descends toward the southern
   ocean"** → **the descent runs the other way at the margin.** The southern Meroshe is `plains` on all
   twenty-one of its hexes with no canyon anywhere, and it is the lowest ground in the quarter; Trogo's
   forest stands some fifty metres *above* it. A traveler coming out of the desert looks **up** at Trogo.
6. **"Stand at the southern edge of the Meroshe's canyon country and face southeast. Below you, the
   canyon walls drop"** → the ground rises. The rest of the paragraph is right about everything but the
   direction.
7. **"a ridgeline that catches the southern moisture and drops a fog wall on its windward face while the
   leeward side stays desert"** → **confirmed, and it is the whole country**: the ridgeline is the seven
   hexes the atlas puts against the desert and the windward face is all twenty-two `deep_forest` hexes.
   Nothing else explains how the wettest code on the map comes to border the driest.
8. **"Three named river systems… the Trogoreth… has a wide delta mouth that has silted into a shallow
   estuary system"** → the map draws one of the three and draws it `small`: four edges in one chain
   across the south-eastern corner, about two hundred and thirty metres of it.
9. **"The coast is not extensively sheltered"** → confirmed and sharpened with the seventeen/thirteen
   split above.
10. **"the Azhor Stones, which are visible from the higher coastal headlands"** → **confirmed to the
    hex**: the nearest claimed Azhor Stones hex within sight is the one this job's window widening bought,
    and its terrain word is `deep_forest`, the same word the map writes on Trogo.
11. **The fauna paragraph names no animal**, which is a gap rather than an error and is the only one of
    its kind in the quarter. Stated.
12. `related:` — the atlas gives Trogo exactly two claimed neighbours, the South Meroshe across thirteen
    hex edges and Marosh across one. Corrected to file names.

**And two landmarks of job 2's were promises about unbuilt country and have come true**, so their text
changed: `meroshe-green-shoulder` ("Marosh is not built, so what stands on that horizon today is open
country") and `meroshe-forest-wall` ("Trogo is not built, so there is no canopy on that horizon yet"),
in `src/content/regions/southwest/southwest-world.js`, `src/ui/map/map-fog.js` and the South Meroshe's own region description.

---

## Registration

`scripts/build-region-survey.mjs` PLAYABLE + `WINDOW.minQ` −49 → −50 and `maxR` 144 → 145 →
`node scripts/build-region-survey.mjs` (LAND_HEXES 2,078 → 2,079) ·
`scripts/build-region-rivers.mjs` RIVER_REGIONS + Marosh and Trogo →
`node scripts/build-region-rivers.mjs` (222 → 229 edges) ·
`src/world/terrain/region-layout.js` PLAYABLE_REGIONS + two REGION_BIOMES ·
`src/world/terrain/region-world.js` REGION_IDS 43–44, two REGION_TERRAIN (four profiles, **`deep_forest`'s first**),
two REGION_TEXT (subtitle, spawn, description, palette with the two skies, `npcIds: []`, fourteen
landmarks) ·
`src/content/regions/western-regions/west-regions.js` (`MAROSH_NAHR`, `TROGORETH`, `SOUTHWEST_RIVERS`, `WEST_REGION_NAMES`) ·
`src/content/regions/southwest/southwest-world.js` (`EAST_EDGE_REGIONS`, the two climates, `EAST_EDGE_BOX`/`eastEdgeShare`,
`ARIDITY.Af`, the ridge, the gap, the four combes, the crest, the four gullies, the six clearings, the
five paths, `trogoThicket`, **`trogoWay`**, `trogoBand`, `trogoFogForest`, `SOUTHWEST_SWALE_RIVERS`, five
ground colours, fourteen landmarks) ·
**`src/world/scenery/undergrowth.js` (new)** and its hook in `src/main.js` ·
`src/content/regions/southwest/southwest-scenery.js` (the fourth pass) ·
`src/content/regions/southwest/southwest-wildlife.js` (seventeen zones) ·
`src/content/regions/western-regions/west-regions-life.js` (two new rigs, their `SOAR` row and four table entries) ·
`src/gameplay/skills/languages.js` (`fogspeech`, `maroshi.dialects`, two `spoken` entries) ·
`src/dev/tools/developer-atlas.js` (two anchors) · `src/ui/map/map-fog.js` (fourteen areas, two rewritten) ·
`src/dev/tools/build-status.js` (two `early` entries) ·
**`src/world/terrain/world-terrain.js` (the `if/else` chain becomes `GROUND_TINTS`, a table)** ·
`src/main.js` (nine review views, the undergrowth import, the composed gate) ·
`tests/southwest-world.test.js` · **`tests/trogo-undergrowth.test.js` (new)** · `tests/own-sky.js` ·
the seven guard files above · `package.json` · this report · `docs/design-answers.md`.

`src/world/terrain/region-levels.js` already carried both (2, 3) and was not touched.
`src/content/chapters/civil-war/campaign-world.js` already had their one-line designs and was not touched.
`src/world/environment/region-sky.js` needed nothing: a country declares its own sky in `REGION_TEXT`.
`src/content/regions/western-regions/west-ground.js` and `src/world.js` needed nothing: the new landforms go through `southwestGround`
and the new colours through `southwestTint`, both of which job 1 hooked into the chain and job 2 fixed.

---

## Tests

Everything was run with `node --test tests/<name>.test.js`. **`npm test` was not run**: the script
exceeds the Windows command-line limit on this machine.

TESTS_TABLE

### The stale lists that were found and moved

**Seven files and eleven assertions**, and every one of them is the southern edge of the world.

1. **`tests/region-layout.test.js`** — the world-box height guard, `< 54` / `> 53.4` hexes tall, now
   **`< 55` / `> 54.2`**, with Trogo's case stated and the whole four-job history of the edge in the
   comment above it.
2. **`tests/ascarth-world.test.js`** — *three in one file*: `maxZ === 3177.824`, `tall = 53.450` and
   the coast lattice's deepest row `=== 144`. The third one was missed on the first pass and the test
   caught it, which is what it is for. The peninsula has not set the southern edge since job 2 and sets
   it less now.
3. **`tests/izol-world.test.js`** — `maxZ === 3177.824`, and **this is the third time this one line has
   moved**: job 1 checked it and correctly left it, job 2 moved it, job 3 correctly left it, job 4 moved
   it again. The island is further from the southern edge with every job in this quarter.
4. **`tests/mithala-world.test.js`** — *three in one file*: `tall`, `maxZ` and `WINDOW.maxR === 144`.
   **This file has carried a stale number in all four jobs of the programme** — the width and `minX` in
   jobs 1 and 3, the height and `maxR` in jobs 2 and 4 — which is what it is for: a country far from
   every edge, pinning every edge.
5. **`tests/west-lotharn-world.test.js`** — `maxZ === 3177.824`; its comment now holds five facts.
6. **`tests/isareos-world.test.js`** and 7. **`tests/nethereum-world.test.js`** — the same `tall` guard,
   the same move. **This pair has now been found together five times** (the West Lotharn builder, the
   Mithala builder, job 1, job 3, job 4). It is the obvious candidate for the treatment `OWN_SKY` got.
8. **`tests/southwest-world.test.js`** — its own box, window, seam, rib, aridity, channel, landmark,
   wildlife and registration assertions: **fourteen in all**, rewritten for four jobs.

### And the two permanent guards both did their jobs

**`tests/own-sky.js` cost one line**, which is exactly what job 3 built it for: five builders in a row
had found the same allow-list in two files and extended both, and job 4 added two countries with their
own skies by adding two names to one constant. Neither `region-sky` nor `eer-world` needed touching.

**Job 2's PLAYABLE-order guard caught nothing, because there was nothing to catch.**
`tests/region-layout.test.js`'s invariant — PLAYABLE_REGIONS in strictly increasing `REGION_IDS` order,
ids 1..n with no gaps, the survey's own `PLAYABLE` the same set — passes with two countries appended at
the end, and **no file in this build needed a "last N in the list" idiom rewritten.** That is the sixth
generation of that mistake not happening.

---

## Review

**Nine review views**, photographed with
`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=..."`, with no
errors, and **every image is from a run after the last change that could affect its own country** - the
six Trogo views from the round after the understory was darkened, the three that changed again from the
round after Marosh's terrace was thickened: `southwest-marosh-crest`, `southwest-marosh-gap`,
`southwest-marosh-terrace`, `southwest-trogo-canopy`, `southwest-trogo-way`, `southwest-trogo-wall`,
`southwest-trogo-clearing`, `southwest-trogo-edge`, `southwest-trogo-estuary`. They are in
`src/main.js` and every one is worked out from its own landform's numbers — the crest's own line, the
gap's own point, a gully's own line, a clearing's own radius — so a view cannot drift off the thing it
shows. Images: `tests/artifacts/southwest-*.jpg`.

**Three rounds, and the first two caught five things.**

* **The understory came back as pale mint boulders.** This is job 1's haze lesson and job 3's renderer
  lesson met for the third time, and in the one country where it matters most: a bush on the floor of a
  closed canopy gets a few per cent of the light that falls on the top of it, and the renderer reads an
  authored colour as linear and lifts it a long way. Everything on that floor went about forty per cent
  down — the understory, the way ferns, the clearing saplings and the shore scrub.
* **The canopy view was a black wall.** The review camera backs off from its target until something
  stops it, and **in a closed canopy the thing that stops it is a crown**: a hundred-and-six-metre shot
  put the camera inside one. It is twenty-two metres now, which is all the sight line this country has
  anyway — at `.0144` a hundred metres is nine tenths haze.
* **The forest-wall view was inside the forest, twice.** Same cause from the other side: the camera
  could only stand three metres off its own target before a trunk stopped it. Moving the camera into the
  desert was not enough, because the *target* was still inside the forest and the backward ray still hit
  a trunk; **both the camera and the point it looks at stand on the Meroshe's own floor now**, and the
  wall is the background of the frame rather than its subject.
* **And the third round raised that camera's eye line.** Looking at a point three metres above the
  desert a hundred and twenty metres away puts a wall fifty metres high and another hundred and forty
  metres on into the top tenth of the frame. It looks at thirty-four metres now.
* **Marosh's terrace photographed as a mown lawn**, which is job 3's finding about Hama's sward met a
  second time: two hundred and fifty tufts a hex is not grass at a low angle across a wide view. The
  sample went from three hundred a cell to six hundred and fifty and the tufts grew a fifth.

**What the final set shows:**

* **the forest edge is the picture of the job.** From the coastal grass, a wall of canopy standing
  nearly forty metres over it and fading into haze at about a hundred and thirty, the salt-pruned collar
  in front of it, and **nothing visible beyond it at all**. It is the user's sentence drawn: you cannot
  see far in;
* **the gully is the picture of the rule.** A cut running away north-west with walls of green down both
  sides, stones on its floor, and the view closing in haze at sixty or eighty metres. You can see exactly
  why a traveler follows it and exactly why they do not leave it;
* **standing under the canopy reads as standing under a canopy**: trunks going up into a solid dark
  roof, the floor visible and almost bare, the understory in clumps between. It is the darkest ground in
  the game and it photographs that way;
* **the clearing has a sky in it**, which nothing else in the country does — a band of lighter ground
  with light on it, saplings and grass, and the canopy closing round the edge of the frame. The decision
  to paint the ways and the clearings *lighter* than the floor between them is what makes it read;
* **Marosh's crest is the best picture of the two countries together**: holm oak standing down a green
  ridge with the sand sea pale and flat behind it, and the whole argument of the country — that this
  ridge is why that desert is a desert — in one frame;
* **the estuary is canopy, prop roots, the river and then the open southern ocean**, which is the one
  place in the southwest where a forest reaches the sea;
* **the forest wall is the picture job 2 promised a job and a half ago**: the Meroshe's dark varnished
  stone floor filling the foreground with a wall of canopy standing out of it in the middle distance,
  trunks beneath, and nothing between the two but a hundred and forty metres of hot desert;
* **the weakest of the nine is the water gap.** The camera stands under the ridge's own oaks rather than
  in the notch, so what it photographs is wooded ground on a green slope and not a crossing. Sixty paces
  of gap with eight metres of crest on either hand needs a camera further back than the trees allow,
  which is the same problem the forest views have and the hillshade would answer better.

---

## Open questions, and what the whole southwest still needs

1. **A traveler who is refused is told nothing**, and that is a decision rather than an oversight: the
   rule owns no rendering, which is the climbing rule's contract. In a country where you cannot see more
   than a hundred and twenty paces the thicket is visibly a thicket, so the refusal is legible from the
   trees; whether the HUD should also say something ("the undergrowth is too thick") is the user's call
   and would be one line in `src/main.js`.
2. **The Ibenwoods are the whole of what is left, and the rule is ready for them.** Five regions and
   about a hundred and fifty hexes of `forest` and `deep_forest`, and adding them is one row in
   `THICKETS` and one `open(x, z)` in their own world module. Two things they will need that Trogo did
   not: a decision about **`forest` as against `deep_forest`** — Trogo has only the deep kind, and a
   country with both will want the shallower one passable — and a decision about **the road**. Nothing
   routes through a forest country today; the Ibenwoods are the belt between the built west and this
   island, so the first thing a traveler will want to do with them is cross them, and whatever road they
   get must be a way through by construction.
3. **The autopilot goes through this gate and nothing routes it here yet.** `src/gameplay/autoplay/autopilot.js` sets a
   heading and `src/main.js` walks the body, so an autopilot walk is gated exactly as a player's is.
   The main road is a quarter of a continent away. **When the Ibenwoods land that stops being true**, and
   `planGoal` will be the first thing to meet a movement rule it does not know about.
4. **The Ganesh dustback is still not built and it is still the user's decision.** Four jobs have now
   declined it for the same reason, and it is the animal this quarter most wants.
5. **The canyon tortoise has run out of countries.** Job 3 said Trogo was the last one that could want
   it; Trogo is built and did not take it, because it fails `tests/west-life.test.js`'s first law —
   nothing in the west can be walked down. The honest fixes are an exemption list (the Elagos cattle
   already fail the law) or a burrow, and both are design decisions. **There is no southwestern country
   left to put it in.**
6. **There are two Dinelvs in the archive and the atlas can only have one.** `marosh.md` puts the
   capital "on the eastern (Iberos-facing) shore", which the atlas confirms exactly — all twenty of
   Marosh's ocean edges are on its eastern side. `dinelv_highlands.md` is a plateau on the peninsula's
   *western* face with a sea cliff on its corner, four hundred metres of desert away. Either the highland
   is named for a court it is a week's travel from, which is what a road kingdom would do with a plateau
   its caravans cross, or the archive is carrying two places with one name. **It is a lore question and
   the build cannot settle it**; the adjustment states it rather than choosing.
7. **`moroshe_desert.md` is still the file and four lore files still point at a `meroshe_desert.md` that
   does not exist.** Job 2 found it, job 3 corrected one reference, job 4 corrected another. Renaming the
   file is the user's call and three briefs have declined it.
8. **The forest peoples' language is not in `LANGUAGES` and should not be invented.** Trogo carries
   `fogspeech`, the transition zone's contact register, which is half Moreshi; the forest language of the
   mid-slope and the coast "belongs to neither the Moreshi family nor any Azhoran mainland family that
   has been classified", has "a series of tone distinctions that Azhoran languages do not have", and may
   be related to the southern archipelago's. Whoever builds the forest peoples inherits it — and the fog
   aspect is the best single piece of language in the archive and deserves better than a dialect entry.
9. **The outland rib is now a `relief()` problem and nothing else.** 11.52 m at the worst margin point.
   **Every unbuilt neighbour the southwest had is now somebody else's quarter**: Alezhor, Ibenale, the
   three Ibenwoods, East Pyros, the Nether Desert, Babon and the Azhor Stones. Nothing inside this
   quarter can take another bite out of it.
10. **The west-life coverage gap is four jobs old and fifty-four ranges deep.** Each chase law asserts
    inside its loop over the bands, so it stops at the first failing band, and all three failing animals
    (`elagos-meadow-cattle`, `feradom-country-17-98`, `oveth-herons`) come before this block's zones in
    `WEST_LIFE_ZONES`. **Laws 3, 4 and 5 have still never exercised a single southwest range**, and there
    are fifty-four of them now. What stands behind them is the reach law, which does pass and does cover
    every band, plus the site checks in `tests/southwest-world.test.js`.

### What the whole southwest still needs

**Three hundred and twenty-two hexes of ground and not one thing that belongs to anybody**, which was
the programme's instruction and is now its result. What is missing, in the order it would be built:

* **the Maroshi kingdom**, which is the thing this quarter is organised around: Dinelv the capital on
  the Iberos shore, the Route Registry and its records, the Tariff Table, the caravan road from the
  water gap across the Meroshe to the western face, the waystations and their water, and the garrisons
  at the Dinelv plateau's two passes. **Dinelv is a region on neither the atlas nor the survey and has
  nowhere to go**, which is the first problem whoever takes it on will meet;
* **the people of the desert** — the Moreshi oasis houses and their water rights, the canyon
  communities, the caravan guides whose knowledge is the only reason the sand sea is crossable, and the
  dustback herds;
* **Hama Harbour**, its Council of Merchant Houses and the seven families, and the southern-archipelago
  trade that passes through them;
* **the three peoples of Trogo** and everything between them: the estuary fishing villages, the timber
  and resin and dye trade, the transition zone's intermediaries, and a forest nobody has surveyed;
* **a way in.** The block is an island of thirteen countries reached by F8 and by nothing else, and the
  Ibenwood belt is the only thing that can change that;
* **seasons**, which this quarter would change more for than anywhere but the Mithala, and in three
  directions at once: the Ganesh blooms, Hama's and Marosh's winter beds run, and Trogo's fog comes and
  goes — and the fog is a thing the lore has already built a grammatical category around.
