# Wilderness: handover, 2026-09-21

Written for whoever takes Nethereum, Ovesos, the Oves Desert and Gala from
`docs/six-regions-brief.md`. Eer and Isareos are on main; Vastos, Meneth, Caricas and Nesdor
were built before them (`docs/four-regions-brief.md`). This is not a history; it is the things
that would otherwise cost you a day to rediscover.

**The standing rule, the user's, 2026-09-21: the atlas wins over the lore.** Where they
disagree, build the map and let the lore be adjusted. It has already cost Isareos its entire
coastline and Nethereum its lake. Read `assets/azhora-dev-regions.json` before you read a word
of `world-builder/azhora_lore`, and never write in that repository.

---

## 1. Adding a country, end to end

Nine files in this order. Two of them are generated. Nothing else is needed: a region's
**level** is already in `src/region-levels.js` (all 131 are), its **campaign design** is in
`src/campaign-world.js` and is story data you leave alone, and its **neighbours** for the
journal are already in `src/cartography.js`.

1. **`src/west-regions.js`** — pure. The water (atlas courses and derived ones), any landform
   constants, the region's name in `WEST_REGION_NAMES`, its courses in `WEST_RIVERS`, and its
   `WEST_REGION_LANDMARKS`. *Despite its name this is where the southern countries live too*,
   and the header says why: their water is the Lizeem's, and the Lizeem is built here.
2. **`src/west-ground.js`** — pure. Only if the country has a landform. See §4.
3. **`src/region-layout.js`** — `PLAYABLE_REGIONS` (**append**, see §2) and one `REGION_BIOMES`
   entry. The biome `id` must be unique; a test counts them against the region list.
4. **`src/region-world.js`** — `REGION_IDS` (next integer), one `REGION_TERRAIN` entry with an
   optional `byTerrain` refinement per atlas terrain, and one `REGION_TEXT` entry: subtitle,
   spawn (must be standable and on the country's own hexes), description, palette, `npcIds: []`,
   landmark ids.
5. **`src/west-regions-scenery.js`** — the district block. **Append it after the last one**
   (§2).
6. **`src/west-regions-life.js`** — models and `WEST_LIFE_ZONES` entries.
7. **`src/build-status.js`**, **`src/map-fog.js`** (three or more chart subregions, each of which
   must land on the country's own hexes — a test checks), **`src/developer-atlas.js`** (one
   anchor; see below), **`src/languages.js`** (one `REGION_LANGUAGE` entry, taken from the lore
   file's own Language section and mapped to an existing tongue; a new dialect must also be
   named in its parent language's `dialects` list), and **`src/chameleon.js`** — **a chameleon
   spot, or `tests/chameleon.test.js` goes red.** One per region plus two in open country, and
   the count assertion in that test rises with the list. Sweep for it the way the others were
   found: standable ground `canStand` accepts at `.34`, out of water, above the tide line, more
   than twenty-five metres off every road, and nearest the region's centre.
8. **`src/main.js`** — review views only, in the block at `view.startsWith('west-')||
   view.startsWith('south-')`. Touch nothing else in that file.
9. **`tests/<country>-world.test.js`**, and **name it in `package.json`**. It is dropped
   silently on a bad merge otherwise — `tests/eer-world.test.js` fell out of the list once and
   nobody noticed until Isareos landed.

**The generated two.** `src/region-survey.js` comes from `node scripts/build-region-survey.mjs`
and `src/region-rivers.js` from `node scripts/build-region-rivers.mjs`. Both already carry all
six southern countries — `WINDOW` is `minQ: -33` and `RIVER_REGIONS` names them — so **you will
almost certainly not need to run either**. Run the survey anyway and confirm it produces no
diff; that is thirty seconds and it tells you the window is still wide enough.

**The developer-atlas anchor is a real hex, and you must compute it.** `point(x, y, q, r)` where
`x = 27.7128 * (q + r/2) + 13.856` and `y = 24 * r + 16`. A test asserts the anchor sits on the
country's own authored hexes, and guessing costs you a build. Pick a `q,r` out of the dev export
and do the arithmetic.

**The travel button comes free.** The testing panel travels by region id to
`regions[].spawn` (`src/main.js`, the `world.regions?.find(...)` line). `developer-mode.js`'s
ghost-flight `points` map has no entry for any region past Elagos and that is deliberate —
leave it.

---

## 2. The rules that keep the built world still

The bug hunter's standard is a **collider dump that is identical, or a diff explained line by
line**. Three separate mechanisms will silently violate it. All three have.

**One seeded stream, walked in `PLAYABLE_REGIONS` order.** `world-regions.js` scatters every
biome from a single seeded PRNG in that order, and `west-regions-scenery.js` has its own single
stream (`let seed = 4470913`) consumed in the order its district blocks are written. So:

* **append your country to `PLAYABLE_REGIONS`, never insert**, and give it `ownScatter: true`
  so the biome loop `continue`s before it draws anything;
* **append your scenery block after the last one** (today: after Isareos's, which is after
  Eer's, which is after Nesdor's).

A rejected candidate still advances the stream, so even a *filter* that changes behaviour moves
everything after it. That is how ~4,700 colliders moved once before.

**Every filter that meant "the four regions" now catches a fifth.** These were all written when
there was only one of a thing, and each one broke when there were two:

| was | caught | now |
|---|---|---|
| `WEST_BRAIDS.filter(id !== 'vastos')` | Eer's two braids drawn into Nesdor's district, *from Nesdor's place in the stream* | named explicitly |
| `WEST_LIFE_ZONES.filter(species === 'otter')` | Isareos's otters asserted onto the Caricas bank | scoped by `region` |
| `WEST_LIFE_ZONES.filter(!zone.air)` | dolphins chased for footing they have none of | `!air && !sea` |
| `PLAYABLE_REGIONS.at(-1) === 'Eer'` | broke the moment Isareos landed | asserts the appending *order* |
| `species === 'longhorn'` in `tickGround` | true of every cow there was, until Nethereum's short-legged breed | `CATTLE`, a set |
| `tests/chameleon.test.js`'s bare count of 16 | red as soon as a seventeenth region landed | `regions.length + 2` |
| `species === 'turkey-vulture' ? … : …` in `render` | two soarers, twice, in two ternaries | the `SOAR` table, and `SOARERS` off its keys |
| every otter/wader/longhorn `bySpecies` in a region test | — | check yours before you add a species another region already has |

**Take the dump before and after.** Build the world headlessly, write every collider as
`kind\tx\tz\tr\thx\thz` sorted, and `comm -23 before after | wc -l` must be 0. There is no
script in the repo; write one in your scratchpad — it is twenty lines over
`createWorld(new THREE.Scene()).colliders`. Eer added 1,737 and moved none; Isareos added 1,223
and moved none; Isareos's stock added and moved nothing at all, because **animals are not
colliders**.

**Scatter filters use `hexOwnerAt`, never `regionAt`.** `regionAt` carries a 76 m shore fringe
and is what the *traveler is told*; `hexOwnerAt` is strict hex ownership and is what the builder
asks. Swapping them re-seeds every scatter loop in the west. `tests/open-country.test.js` holds
both halves.

---

## 3. Water

**Atlas courses.** `atlasCourse(key)` where the key is the sorted, comma-joined set of regions
whose hex edges make up one chain. `riverCourses` breaks a chain wherever three edges meet a
corner, so a confluence arrives as two chains:

* **`joinAtlas(...pieces)`** welds them back, turning each piece to follow the last and dropping
  the shared corner. A piece that does not touch the line throws — a river with a hole in it is
  worse than a crash. The Lizeem is five chains joined this way.
* **`chainWithin(key, region)` / `chainBeyond(key, region)`** split one chain at the last edge
  that touches a region. They **share the point they meet at**, which is what lets one course
  begin exactly where another stops.

**`headOf` is how a river crosses a border without a step.** `LIZEEM_REACH` is a separate course
from `LIZEEM` because lengthening the Lizeem in place would resample its whole polyline and
re-seed every tree on both banks in Caricas and Nesdor. Instead it begins on the Lizeem's last
point and takes its water level over by naming it: `headOf: 'lizeem'`. `WEST_PROFILES` is built
**sequentially down `WEST_RIVERS`** for exactly this, so a course with `headOf` must come after
the one it names. The measured handover step is 0.000 m. Use this for Gala's Oveth and for
anything else the atlas hands from one country to the next.

**`fordUntil` and the blocker loop are two different things, and forgetting the second is a
real bug.** `fordUntil` is how far along a course a traveler may wade — 1 for a beck, 0 for the
Lizeem, about a third for a medium river (the Carica's rule, and the Isa's). But **deep water
only stops anybody if the course is in the blocker loop** in `west-regions-scenery.js`:

```js
for (const course of [LIZEEM, CARICA, LIZEEM_REACH, ISAREOS_RIVER]) ...
```

The Isa was left out of it and two things were wrong at once: its unfordable two-thirds could be
walked across, *and* the otters on it had no deep water to dive into, which made them a slow land
animal that could be run down. **Add your unfordable courses to that array.** The blockers step
along the profile at `sample.half / (step + .5)` so the line has no gap a traveler fits through.

**Braids.** `WEST_BRAIDS` entries take a course, a `from`/`to` fraction, an `offset`, a `half`, a
`cut` and a `lift`. The threads leave and rejoin as a half-wave, so nothing braids at either end.
Order in that array is load-bearing in one place: `WEST_BRAIDS[1]` is the Ela-South's, named by a
landmark. Append.

**Two traps.** `inWestWater` (and so `westBareGround`) measures from a course's **centre line**
and knows **nothing about braids**, so on a braided reach you must also ask
`westWaterSurface(x, z) !== null`; Eer planted trees in side channels before that was added. And
on a coast, `landDistance(x, z) > 1.5` as well: Eer's scrub stood in the surf.

---

## 4. Ground

Landform functions live in `src/west-ground.js` beside `menethRidge`, `caricasShelf` and
`isareosLie`, and they all have the same shape: **gated by the region's own box
(`inBox(WEST_REGION_BOXES[name], x, z)`), weighted by the region's own blend
(`terrainMix(x, z).weights[name]`), and returning 0 outside.** That weighting is what makes a
landform fade out at every border by the same rule that fades the ground colour, with no
hand-drawn edge. Meneth's threshold is set high on purpose — a point on the far side of a border
still carries a quarter of the region in its blend, and a quarter of a seven-metre trough cut a
metre out of Lake Ela's bank.

**Most countries need no landform at all.** Eer is a plain with a `byTerrain` split; Isareos is
"low hills, not quite highlands", which is exactly what plain `relief()` already is at
amplitude 4.5 over wavelength 120. Set `base`, `amp` and `wave` in `REGION_TERRAIN` and stop.
Put the base between the two countries it blurs into and neither border is a step (Isareos's 22
sits between Caricas's 17 and Meneth's 26).

**`isareosLie(x, z)` is the pattern for "where am I in my own valley".** It samples a ring at
about a third of a wavelength and reports where the point sits between the lowest and highest of
them, 0 on a floor and 1 on a shoulder. The thorn reads that and nothing else. **Nethereum's
hollow is a third function of the `menethRidge`/`caricasShelf` shape** — a wide shallow
depression weighed by the region blend — and belongs in the same file.

**`src/south-regions.js` / `src/south-ground.js` do not exist and two countries have not wanted
them.** The brief predicted them; the code said otherwise. The first thing on the list that is
genuinely new machinery is **the Oves Desert's dry watercourses and waterholes** — a channel cut
with a gravel floor and no water ribbon and no deep-water collider, which nothing here does —
and that is the moment to start one. Nethereum's hollow is not it.

**`westGroundAt` and `groundWithRiver` agree only inland.** The first is `west-ground.js` over
its own natural relief; the second starts from bedrock with the shore already cut in. Region
tests assert they agree to 1e-9, and on a coastal country you must skip the shore: for Eer the
furthest inland they differ at all is 39.4 m, measured, so the test skips `landDistance < 45`.

---

## 5. Animals

`src/west-regions-life.js`. Pieces are declared, merged once per kind, and instanced; behaviour
is one `tickGround`, one `tickAir`, one `tickSea`.

**A range must fit inside the reach it is ticked from.** A flock runs only while the traveler is
within `LIFE_REACH` (130 m) of its **centre**, not of its animals. Given a 360 m range so that a
runner could not corner them, Isareos's deer ran to a corner, took the traveler past that reach,
and **the whole band froze where it stood** — somebody then walked up to an animal that had
stopped existing. `tests/west-life.test.js` holds every fleeing range to half-diagonal < 130.
Air and sea zones are exempt and the test says why. **Wariness, not width, is what keeps an
animal clear**: the red deer moves off at 18 m and a runner never gets within 15.

**The three rigs, and what decides which one an animal uses.**

* `GRAZER_RIG` — four legs and a head on a neck. Membership decides the quadruped path.
* `BIRD_RIG` — two legs and two wings. **Membership is what decides two legs rather than four.**
* `SOARERS` — a body and two wings and *nothing else*. Anything that falls past this set into
  the four-legged tail of `render` asks an instanced mesh that was never made for a matrix and
  **takes the render loop down**. That is what the vulture did the first time.

**Heads.** A bird's head, neck and bill are part of its **body** geometry; the bird rig places
wings and legs and nothing else, so a separate `head` sits on the identity matrix as a lump
inside the animal — which is what the duck did. A quadruped's head is a separate geometry swung
by `rx`; but on a *deer* the body is too shallow to hide the gap that opens, so **the deer's
head geometry starts at the shoulder joint and carries its own neck**, and the swing turns the
whole of it. Copy that for anything with a long neck.

**Folded wings.** `sweep` and `tuck` in `BIRD_RIG`. A wing points along its own +X, so rolling
it — which is all the old pose did — can never bring it in: you turn it back along the body
about the vertical and shorten it. Every bird in the west stood like an aeroplane until this
landed, including the herons built with Caricas.

**`zone.float`** puts a bird's feet on the water surface where there is water under it and on
the ground where there is not, through `footingY`. A mallard sits *on* a river; before this it
stood on the bed of one, three-quarters submerged. **Gala's raft of geese wants this flag.**

**`zone.sea` and `tickSea`** are the dolphins: a line worked back and forth at `SEA_LEVEL` with
a porpoising arc, no footing, no fleeing, and everything under the waterline drawn by not being
drawn. Two matching exemptions ride with it: `clearPoint` and `settle` skip sea zones, and so
does the footing law.

**Paces.** `FLEE_AT`, `WALK`, `RUN`, `RETURN`, keyed by species, tuned against a traveler's walk
of 4.2 and run of 7.2 m/s. The six laws in `tests/west-life.test.js` are the specification:
nothing can be walked down; the quick ones cannot be run down; sheep can be herded and cattle
give ground instead of bolting; the fox never flees; a chased band is home in a few minutes
watched or not; a band left a moment has moved a moment's worth. **Add a species to those tables
before you add a zone**, or `near < undefined` is false and the animal never flees at all.

**Siting is measured, not guessed.** Sweep the region for ground that satisfies what the animal
needs and take the coordinates out of the sweep. Isareos's otters sat on the fordable head of
their river and so had no water; the stilts were guessed onto sand bars, landed in a braid
channel, and were drawn *underneath its own ribbon*, invisible.

---

## 6. Review views for wilderness

The block is `westReviewSpot` in `src/main.js`. `shot(camera, target, pitch, height, self,
stand)` works the yaw and distance out from two places, so a view cannot end up on the wrong
bank; `beside(course, at, out, side)` is a point off a watercourse.

**`cameraPullIn` will haul your camera onto its subject, and it is data-dependent.** It clamps
the camera to whatever stands **nearest the focus** — not the first thing on the line — so on
ground with scatter up to the subject it does not nudge, it drags. One take of Eer's coast came
out as nothing but sea and sand; one of Isareos's braids came from 25 m with a crown across a
third of the frame; `south-eer` was hauled 120 m off its own subject. **A focus above
`heightAt + 7` cannot be clamped against at all.** That is why every landscape view out here
looks from eight to eleven metres up, and it is not a taste.

**Five more that each cost a render.**

* **Sweep the front quarter.** Taking the first standable bearing round the circle photographed
  half the animals from behind, and an egret from the tail is a white lump. Start at
  `animal.yaw ± .85` and open outwards; among the standable bearings take the least crowded
  (`cameraCrowding`, which is hoisted and safe to call from here).
* **Stand the traveler off.** `shot`'s `stand` argument. The camera has to be four metres from a
  heron to show one, and a heron four metres from a traveler is a heron in the air.
* **Settle a cycling animal before a frozen shot.** A dolphin is under water for most of its
  cycle; run the pod on until the one you are looking at is up, then work the camera out from
  where it *then* is.
* **`look.y` is measured up from the ground under the subject.** Under a dolphin that is 5.6 m
  of seabed, and the first take photographed an empty bay. Lift the aim by
  `animal.groundY - world.heightAt(...)`, which is nought for everything that walks.
* **Foliage is not a collider, so the crowding score cannot see it.** Choose *where along* a
  river to stand by knowing where its tributaries come in (each trails a gallery of its own);
  scoring the bank for clear ground only moves you to a stretch with no gallery to show. And put
  the camera just outside the planting band — it is `sample.half + <reach>` wide and you can
  read the number off the scenery.

---

## 7. Working method, and the tests that lied

**Measure headlessly before you render.** A render costs minutes; a probe over
`createWorld(new THREE.Scene())` costs seconds and gives you the number. Every fault in this
job was found that way and the renders only confirmed them — except the four that only a picture
could have found (a head that was never drawn, wings like an aeroplane, a bush that read as
gravel, a gallery that was a wood). **Both halves are necessary. Neither is sufficient.**

**When an animal behaves impossibly, instrument the chase.** A deer running at 10.5 m/s was
caught by a man running at 7.2. Three wrong theories — thorn, clutter, cornering — died to a
five-minute probe that printed the animal's action, speed, position and distance from its range
edge once a second. The answer was in the second line of the output.

**Tests lie about fixtures.** Mine did, twice. One asserted a camera bearing on
`PLAYABLE_SURVEY`, which does not carry Northern Ascarth, and so counted five border edges where
the atlas draws six — the fix is to read ownership off `assets/azhora-dev-regions.json`, which
has all 131 regions. One pinned "Eer is last in `PLAYABLE_REGIONS`", which was true for exactly
one country. **When a test says something surprising, suspect the fixture.**

**Write the measurement into the comment.** "39.4 m is the furthest inland they differ",
"0.000 m at the handover", "half-diagonal 115 against 130". A number in a comment is the only
thing that survives the next person's judgement about whether your threshold was arbitrary.

**House rules.** Free RAM above 3000 MB before every world build or render
(`powershell -NoProfile -Command "[math]::Round((Get-CimInstance
Win32_OperatingSystem).FreePhysicalMemory/1024)"`). Targeted tests only, read totals from the
`ℹ pass` / `ℹ fail` lines and never from an exit code through a pipe; never `npm test`,
`test:game`, autoplay or `review:draws`. Renders one batch at a time,
`--review-views=<a,b> --review-clean`, then Read the PNG. Git Bash mangles heredocs and hides
CRs — script edits with a Python file written by the Write tool, and **open with
`io.open(..., newline='')`**: `src/map-fog.js` and `src/developer-atlas.js` are CRLF and the rest
are LF, and a `\n` pattern simply will not match in the CRLF ones. Commits end with the
`Co-Authored-By: Claude Opus 5` line.

---

## 8. What remains, and what each will trip over

### Nethereum — built, and the three things it found out

Done as the brief asks: the dish is 600 m by 264, its floor measures 13 m against a rim at 21,
the Neth is waded in its upper third and walled below it, the Nethrani beast is its own model,
and there is no Nethermere anywhere. What is worth carrying forward is not any of that; it is
the three things nobody had hit before, and **every one of them will happen again with Ovesos.**

**1 · Registering a country moves the river on its border, and the move runs downstream.** The
ground west of the Lizeem was `outland` at 11.5 m and is now Nethereum at 21, so the blend on
the river's own centre line rose — and because `WEST_PROFILES` forces each course to fall
monotonically, the clamp that was holding the reach *below* it down was released as well.
Measured: **the Lizeem's surface rose by up to 7.0 m over its Nethereum reach and by about 3.7 m
along the Caricas and Nesdor banks below it**; 203 of its 363 samples moved. Its last sample did
not move at all, so `LIZEEM_REACH` and the whole of Eer are untouched. The Isa rose by up to
3.14 m. Every course still holds water over every sample and none of them climbs.

*There is no base for a new country that leaves this alone except `outland`'s own 11.5*, so the
question is only how much. Ovesos and the Oves Desert are on the Lizeem's bank for the whole of
its middle reach and will move it again; **build them as a pair and measure the river once.**

**2 · Isareos's scatter reads the ground, so it re-seeds when a neighbour is built.** `isareosLie`
asks `westNaturalGround` for a ring around each point, and the thorn's acceptance turns on the
answer; 715 of 2,896 sampled Isareos points changed their lie when Nethereum stopped being
`outland`. A rejected candidate still advances the seeded stream, so **the whole of Isareos's
thorn moved and everything drawn after it with it.** Eer, Caricas and Nesdor moved too, and for
a second reason: the `lizeemSedge` loop in Caricas's block asks `westWaterSurface` on both banks
of the great river, including the Nethereum one. The collider dump for this country is therefore
**not** identical; it is a diff of five known kinds with a cause each, and the report says so.
Anything you build next to Isareos will do this again.

**3 · The atlas has holes, and the coast field calls them sea.** `LAND_HEXES` is every *claimed*
hex in the window, so an unclaimed one reads as water. There are four such holes inside the
window — 13 hexes, **every one ringed entirely by grassland, forest, plains or hills** — and one
of them, three hexes at (-17,110), (-17,111), (-18,111), is hard against Nethereum's
south-western corner. It pulls 4.1% of this country's own ground toward a beach, down to 0.93 m
from a rim at 21. Nothing goes under water and nobody is sealed in, and the region test skips
`landDistance < 45` the way Eer's does. **The fix is one rule in
`scripts/build-region-survey.mjs` — an unclaimed hex with no path out of the window is land —
and it is thirteen hexes of water turned to ground and nothing turned the other way. It is also
a change to four built countries' coastlines** (the largest hole is an eight-hex bay between
Drent, Pueth, Elagos and Amod), so it belongs to the coordinator and not to a country's builder.

Smaller things that cost time:

* The hollow's floor sits about a metre above the water in the Neth's head, so **the outlet that
  drains it can barely be cut**: at a metre and a half it came out half a metre *below* the river
  it joins. 0.55 m at the floor and 0.9 m at the mouth leaves it level with the Neth, measured.
* A landform that reaches a built river re-cuts it. `NETHEREUM_HOLLOW.clear` is 120 m of hard
  zero round the Isa and the Lizeem, and it is also the honest shape: a basin with no efficient
  route out has a divide between it and the next drainage.
* The Neth doubles back on itself at (-2250, 577), so two limbs of it come within a few metres
  and a blocker on the deep one sits beside a sample on the fordable one. **Test the crossing,
  not the samples**: walk the normal bank to bank and ask for a line nothing stops.
* Three enclosed unclaimed hexes also mean `regionAt` answers *Open country* there, which is why
  the hex-budget guard went to 37: Nethereum's one `plains` hex at x = -2900 took the world's
  edge from -2960 to -3010 and its width from 35.70 to 36.20 hexes. That is all it spent.

### Ovesos and the Oves Desert — as a pair

They share the aridity gradient and building either alone means building it against nothing.
**This is where `src/south-ground.js` finally earns its place**: dry watercourses are new
machinery. A channel cut with a gravel floor, boulders, **no water ribbon and no deep-water
collider** — every watercourse in the game so far carries water — plus waterholes, which are
pools with a very small radius and a real depth in a rock rim.

* `BSh` over all of both. **The user reversed the first draft here: Ovesos is steppe and its
  orchards are gone.** Bunch grass in tussocks with bare ground between, wormwood and saltbush
  where the grass gives out, and a gallery on the Oveth and nowhere else.
* The atlas draws **no climate line at all** between them — both `BSh`. What separates them is
  terrain: Ovesos grassland and plains, the desert hills and plains. Build the rain shadow as a
  gradient of *ground*, not of weather.
* Arid ground is new: a warm buff ground colour, a short hard relief (worn rock is not a sine
  wave) and a gravel-pavement pass over the ridge exposures. The desert wants a sky of its own
  more than any country in the job.
* New models: the spine lizard (**a new gait** — still for a long time, then very fast for a
  short time, unlike everything in the file, all of which ambles), the bone-bird (the soarer rig
  with a wider wing — add it to `SOARERS`), and the road fox (the river fox retinted and rescaled
  with **ordinary flee behaviour**; the vel-caric's refusal to run is Caricas's alone and must
  not leak).
* **The sand-cat is not built and should not be**: it is nocturnal and there is no night.

### Gala — last

It needs both halves of everything: the arid work from Ovesos in its north and Eer's
Mediterranean scrub in its south.

* **The climate line runs inside the country**, in three bands the atlas draws straight across:
  `BSh` over the northern three rows, `Csb` over the next two, `Csa` on the row that touches the
  sea. Eer's `eerSeaward(x, z)` is the worked example of blending the atlas's own cell field over
  the hex neighbourhood so the change happens under the traveler rather than at a line — but Gala
  needs **three** bands from the climate field, not two from the terrain field, so you will read
  `azhora.wwmap` rather than the dev export. Guard that read on the file existing, as
  `tests/eer-world.test.js` does.
* **A coast.** Two sea hexes at the southern tip. It comes free from `LAND_HEXES`, but bring the
  two coastal rules with it: `landDistance(x, z) > 1.5` in every scatter filter, and the
  `westGroundAt` / `groundWithRiver` test skipping the shore band.
* **The raft of black migratory geese wants `zone.float`.** They are built as resident until
  there are seasons to make them arrive.
* The Oveth's crossing into Gala is the last ford decision and the brief leaves it open: the lore
  puts the wadeable part at the *lower* end rather than the upper, so it wants a ford *window*
  rather than a ford length — `fordUntil` alone cannot say that and you will need a second field.
* The small course on the Gala|Telemonia border **has no name anywhere** and is still the user's
  to name. Build it unnamed and list it. (The Isa and Eer's two channels were both settled this
  way: built unnamed, listed, ruled on later, folded in.)

### Standing, for the coordinator rather than for you

* **The Nether Desert is not built**, and if the user ever rules that the Neth should be a wall
  like the Lizeem, it has to be — it is the only other land bridge. Its hexes are in
  `LAND_HEXES` so the ground west of Nethereum is ground; that is all.
* **Nylon is off the atlas** and both Gala and Eer are defined by it. The survey window stops
  before it, the way it stops before Minora and the Ibenwood.
* **Isamouth is not built either**, but `ISAMOUTH_GROUND` in `src/west-regions.js` reserves 62 m
  at the Isa's confluence with the Lizeem and keeps all of Isareos's scatter off it. **Do the
  same wherever the lore puts a town you are not building.** A settlement dropped later onto
  planted ground means moving a gallery, and moving a gallery re-rolls every seeded draw after
  it.
* The hex budget is **36 wide with a lower bound of 35 beside it**
  (`tests/region-layout.test.js`), and 32 tall. Eer spent none of it; Isareos spent all of the
  raise. **The Nether Desert's own hexes reach x = -3050**, so the next country west will need
  the guard raised again — raise it to what the bounds measure and no further, and say so in the
  comment.
