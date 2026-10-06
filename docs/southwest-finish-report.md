# The southwest finished: the ghubr, the tortoise, two river names, and a table

Built 2026-10-01 on branch `southwest-finish` (worktree `azhora-game-sw-finish`, from `e030e72`), to
`docs/southwest-finish-brief.md`. **Four follow-ups on a finished block, none of them a new region**, each
the consequence of a decision the user made that day. Nothing is committed; everything below is in the
working tree.

Two of the four overturn refusals that three and four builders in a row had held, and in both cases what
had to change turned out to be the question rather than the animal. One names water, and names two of five
courses while arguing why the other two should stay as they are. One is a refactor two earlier jobs asked
for, finished one level down from where it was left.

---

## 1. The ghubr — the Ganesh dustback, built

**It is a bird.** Specifically: a plover-shaped ground bird of the open desert floor, about a gull's bulk,
held level and long-legged, sand and grey-buff, with a **pale powdery ridge along the spine and over the
shoulders**, a short straight bill for picking insects off the surface, and a rig of its own in
`src/content/regions/western-regions/west-regions-life.js` (`ghubr`, with a `BIRD_RIG` row, a `FLIES` membership and the four pace rows).
One range, `ganesh-ghubr`, three birds, on the Ganesh Desert's northern margin.

### Every line of lore it is derived from

| the line | where | what it fixed in the build |
|---|---|---|
| "The **Ganesh dustback** (*ghubr*, in the Moreshi pastoral vocabulary borrowed from the broader desert tradition) appears in **the northern desert margin** during hot dry months." | `geography/regions/ganesh_desert.md` | its name, and its placement: the three home spots are on the Ganesh's two northernmost rows of hexes |
| "**It is not the Meroshe's dustback**, which the deeper-desert pastoral traditions regard as a distinct phenomenon with its own calendar and behavioral rules." | same | it is not the bovid, and is not built as a small four-legged animal that could be read as one |
| "The Ganesh dustback is a **smaller, drier creature, feeding on the surface-level insect populations** that persist even in dry years." | same | small; a surface insectivore; the short straight bill rather than a wader's probe; the brisk walk (`WALK.ghubr` .78, against the gull's .7 and the duck's .45) |
| "Caravan guides use its presence as an indicator of **the wind direction** and the air temperature near the surface" | same | the strongest argument for a bird: what a small bird on bare ground does about wind is stand into it, and that is a posture a guide reads at a hundred paces |
| "**the dustback does not stand still in conditions where the surface air is actively dangerous**" | same | its behaviour rule: beyond its shade it never stands still (`zone.shade`, `tickGround`) |
| "and **a dustback seen resting in shade** is a reliable signal of temperature conditions that the caravan's load animals will find stressful." | same | the other half of the rule, and the siting: it rests only within `shade` of its own spot |
| "They are called dustbacks because their coats carry **a pale powdery ridge along the spine and shoulders**." | `culture/azhoran_livestock.md` (of the *domestic* Moroshé beast) | the one thing the two animals share, and what the name means: it is on this body, pale along the spine and over the shoulders, and it is what reads on it at any distance |
| "*ghubr* (root **Gh-B-R**: to become dust-coated through long exposure; to be grey-browned by the desert)… The Mittoli name 'dustback' is a translation of what the word already means." | `peoples/languages/moreshi.md` | the spelling, confirmed: *ghubr* is the Moreshi word and the game's name for it |
| "The large animals of the Moroshé interior **move at night, rest in shade during the day**"; the sand-cat is "almost entirely nocturnal" | `fauna/azhoran_fauna_overview.md` | the second argument for a bird: this animal is watched standing and resting **in daylight**, which the desert's mammals in this lore are not |

### What is the lore's and what is mine

**Mine, and labelled as mine: that it is a bird rather than a small mammal.** The lore does not say. Three
things argue for a bird and I built on them: the guides read **wind direction** off it, which wants a body
with a posture about wind; it is read **in daylight**, where the overview's desert mammals are nocturnal
and say so; and a diurnal insectivore working hot open pavement is a courser's trade. Negatively, the
lore's second sentence exists to stop a reader confusing this animal with the bovid, and a small
four-legged build is that confusion drawn. Everything else above is quoted.

Also mine: the colours, the proportions and the choice to give it the pale mantle as the loudest thing on
the body. The rig argues all of it in place.

### The behaviour, which is the part the lore actually describes

The game has no hour of the day and no season, so the Ganesh is **always** the hot dry month the lore puts
this bird in. That is what made the sentence buildable rather than impossible:

- `zone.shade` (5 m) is how far the shade of its own patch of perennial scrub reaches from the spot it
  keeps. **Beyond it the bird's idle choice is always a walk** — never `graze`, which is the standing-still
  action — and the further out it is the more that walk points back at the shade, so what it works is a
  circuit off its own bush and back to it rather than a line away (`tickGround`, `src/content/regions/western-regions/west-regions-life.js`).
- **The shade is measured, not asserted.** The Ganesh's only shade is the perennial scrub, which stands in
  the sediment pockets the wind has not swept. `ganeshLie` reads **.004, .014 and .018** at the three home
  spots where the country's own figure runs to about a half; `tests/southwest-world.test.js` holds all
  three under .1 and holds all three to the northern margin.
- Walked at, it goes up, because it is a bird: `FLEE_AT.ghubr` is 10 — the geese go at fourteen, the
  bone-birds at thirteen, the egrets at twelve, and only the gull lets anybody nearer. That is the whole
  reason a caravan guide can read one.
- **What could not be expressed, stated rather than faked:** nothing in the behaviour is driven by
  temperature, because there is no temperature; it is driven by *place*, which is the same sentence read
  spatially. When the game has an hour of the day, this bird is the first animal that should answer it.

Proved in `tests/west-life.test.js` ("the ghubr does not stand still on the open desert floor…"): over 150
seconds of three birds with a watcher a hundred metres off, **0.0 bird-seconds standing still beyond the
shade**, 79.5 bird-seconds of moving out on the floor, 248.4 bird-seconds resting in the shade, and the
furthest any of them got from its own spot was 8.8 m — out over the swept floor and back to the bush.

**The Moroshé dustback is still not built**, and the block's standing rule is untouched: the oasis houses'
bovid is what their standing is counted in, which makes it somebody's.

---

## 2. The canyon tortoise — built, and the law answered

**What it does instead of fleeing:** at seven metres it stops where it stands, pulls its head and its four
legs in under the shell, and shuts. It stays shut while anybody is that close and for 2.6 seconds after the
last time they were, and opens again when they have gone. It never turns to face anybody, never gives
ground, never hides, and is in plain view the whole time. There is simply nothing there to take hold of.

- `SHUT = { notice: 7, hold: 2.6 }` and a species branch in `tickGround` (`src/content/regions/western-regions/west-regions-life.js`).
- `WALK['canyon-tortoise']` is **.11 m/s**, under a third of the next slowest animal in the game (the
  Nethrani beast's .38), and it has **no `RUN` row at all**, because it has no run.
- Shut is the whole of its acting in `render`: head and legs drawn in under the dome and scaled down, so
  what a traveler walks up to is a patterned stone sitting on the ground.
- One range, `dinelv-basin-tortoises`, three animals, in the **north gap basin** of the Dinelv Highlands —
  "the water-concentration points that only become visible in wet years when they green faster than the
  surrounding ground" (`dinelv_highlands.md`), which is the lore's own desert seep and exactly the home job
  3 found and could not use. It is the third of the plateau's four basins; the two hare bands have two
  others and the rim gap basin still carries nothing. Its range is **the smallest in the block**, which the
  test holds, because this animal does not go anywhere.

### Exactly what I changed in the law

`tests/west-life.test.js`, the first law, was:

```js
test('nothing in the west can be walked down', () => {
  … if (zone.species !== 'hill-sheep')
      assert.ok(walked.closest >= arm, …);
```

**One question, with an assumption inside it.** "Did somebody walking get within arm's length" is a true
test of "nothing can be walked down" only for animals that answer a traveler by opening distance — which
was every animal in the west until this one. So the question was wrong rather than the animal, and the law
is now two-branched:

```js
test('nothing in the west can be walked down: what flees keeps its distance, and what shuts cannot be caught', () => {
  const shutters = new Set();
  … if (walked.actions.has('shut')) { shutters.add(zone.species); … }
    else if (zone.species !== 'hill-sheep') { …the old assertion, to the centimetre… }
    else { …the sheep's own two… }
  …
  assert.deepEqual([...shutters], ['canyon-tortoise']);
```

Four things about that, because the user rejected the alternative explicitly:

1. **The branch is chosen by what the animal was observed to do in the chase itself** (`walked.actions`),
   not by a field on its range. There is no flag, no exemption list and no species name in the law's
   condition. An animal that shuts is held to the shut half; an animal that does *nothing* — neither flees
   nor shuts — falls into the old half and fails it, as it should.
2. **The shut half is the harder one**, so that it cannot be a way out. It asserts that the tortoise *can*
   be walked up to (`reachedAt !== null` — the half a fleeing animal passes trivially and a tortoise would
   have failed), that it never fled, that it was shut from before the traveler arrived to the end of the
   chase (`shutFor > 30 - reachedAt - .5`, a bound taken from the walk itself rather than a number), that
   it **moved at less than .02 m/s the whole time it was shut**, that it was **never once open with
   somebody inside arm's length**, that the chase moved **the animal that was chased** less than half a
   metre from where it started, and that it did not hide.
3. **Exactly one kind of animal in the west may answer this way**, asserted at the end of the loop over all
   260 ground ranges.
4. `chase()` gained three measurements to make that possible: `shutFor`, `shutMoved` and `openWithin`.

And a test of its own, `the canyon tortoise withdraws instead of fleeing`, proves both halves at a walk
**and at a run**, and the thing a flag could never have expressed: **that it opens again once they have
gone** (twenty seconds after the chase, with the traveler 400 m away, nothing in the band is shut).
`settle()` also opens a tortoise that has been left unwatched longer than it stays shut, because unwatched
time passes for it as it does for everything else.

Measured, on the thirty-second walk the law itself runs: **reached at 9.1 s, shut for 22.2 of the thirty,
closest approach 0.39 m, 0.0000 m/s while shut, 0 seconds open with anybody inside arm's length, and
0.203 m from where it started** — which is the amble it takes before the traveler is near enough to shut it.
At a run: reached at 5.3 s, shut for 15.4 of twenty, 0.143 m moved. Nothing is caught, because there is
nothing to catch.

---

## 3. Five watercourses: three named from the profiles, two left descriptive

**The method is job 1's, exactly**: a name is a word out of the tongue's own lexicon used as a name — as
the Vaellir is `pyrosi.roots.river` (*vaellir*, "river") and the Malhat is `maroshi.roots.salt` (*malhat*,
"salt") — or it is a root and an ending both taken from the profile's own lists. Nothing is coined to sound
right. The lexicons are `LANGUAGES.*.roots` in `src/gameplay/skills/languages.js`, each `from` a profile in
`world-builder/azhoran_language_profiles.py`.

**A finding first, because it changes the count: two of the five are one river.** `GALA_DESERT_STREAM` (the
"desert border stream") and `OVES_BORDER_STREAM` (the "southern border stream") are two reaches of a single
atlas chain, `Gala,Oves Desert,Telemonia`: it runs east along five `Oves Desert`|`Telemonia` edges from
(−2100, 1010), hands over to Gala's reach at (−1850, 1039), and turns north to the Oveth at (−1800, 953).
Two builders named it twice because neither could see the other's half. **It now carries one name across
both reaches**, which is the arrangement the Oveth's two reaches have had since Gala was built
(`OVETH_UPPER` and `OVETH_REACH` are both "The Oveth").

| course | was | is | where the name comes from |
|---|---|---|---|
| Gala's Telemonia border stream | "The Telemonia border stream" | **the Treloss** | Mittoli. The `mittoli` profile's `lexical_roots.border` is `["trel", "dor"]`; `-oss` is in its own suffix list and is the ending this tongue puts on a watercourse (`mittoli.roots.river` is *caeloss*, "river"; `roots.border` is *trelith*, "border"). *Treloss* is the border root with the river ending — "the border river" — and the form is not even a coinage: it is one of the eight names in the profile's own `candidate_pool`. What it names is all this stream is: Gala's whole western side is the Telemonian border and this is the line of it, on every edge the atlas draws. |
| Gala's desert border stream | "The desert border stream" | **the Caelin** (lower reach) | Mittoli, taken whole: `mittoli.roots.flow` is *caelin* — the profile's own `cael` river root with its own `-in` suffix. It earns the word: the Oves Desert has **no permanent water inside it at all**, and this is the one thing on its edge that runs. |
| the Meroshe's / **the Oves Desert's** southern border stream | "The southern border stream" | **the Caelin** (upper reach) | the same river, so the same name. The brief placed this course "in the Meroshe"; there is no watercourse anywhere in the Meroshe (job 2 checked: 572 river edges on the atlas, none on those ninety-five hexes), and the only course in the game called "the southern border stream" is the Oves Desert's. That is the one I named, and the correction is in the open questions below. |
| Gala's distributary | "The distributary" | **unchanged, and that is the answer** | `gala.md`: "A layer of pre-Mittoli terms persists in the names of geographical features — **the small rivers**, the coastal inlets, the specific soils of the agricultural plain… The name *Gala* itself is from this older layer. What it meant to whoever named the place before the current population arrived is not established." The lore does not say this water is nameless; it says its name is in a language that is in no profile and that nobody can gloss. This is job 1's refusal for "Ganesh", on the same kind of sentence. The lore's own words for it are already in the build: "the Lizeem's distributaries, as the Galans call it". |
| Ovesos's dry gully | "The Dry Gully" | **unchanged, and that is the answer** | It is not a watercourse: it carries no water from one year's end to the next. Standard Mittoli's lexicon has **no word for a dry channel, a wash or a gully**; inner-branch Ovesian's documented vocabulary is entirely water administration (*thris-kael* "inner tributary", *vel-sorten* "bottomland allocation", *osk-milis* "water-right seniority", `ovesos.md`) and a gully with no water has no place in it; and the one class of word available would have called it a river, which is what it is not. It stays with the seven other plain-English terrain names of these two countries, beside the desert's own North, Middle and South Channels. |

**Why a border gets a name and an inland course does not**, stated as a rule because it is the line between
the three and the two: a border is named by whoever argues over it, and both of these are argued over —
the Ovesos Water Council's dispute with Telemonia, which `oves_desert.md` spends a paragraph on, is a
dispute about where the Caelin's line falls, and the Council speaks inner-branch Mittoli. A course that
rises inside a country and runs to that country's own shore is named by the country, and Gala's own lore
says what language that name is in and that nobody can read it.

**Two near misses, recorded because they were close.** **Kellith** — Telemonia's own tongue, whose
`lexical_roots` give `ver` as *both* its river root and its border root, which is a gift for naming a
border stream — was checked and rejected: `gala.md` makes Gala Mittoli-speaking and Gala's own builder said
so at `GALA_LANDMARKS`, and both forms the root yields are taken, *Verath* being the Oremindi sacred system
with a lore file of its own. And *trelith* itself, the plain Mittoli word for "border", is a person in this
game (Captain Nessa Trelith, `src/content/quests/batman/batman.js`) — no reason to refuse a word, but a reason to take the other
ending the profile offers.

**Where the names were changed:** `src/content/regions/western-regions/west-regions.js` (both `river()` names and the section's whole
argument), `src/content/regions/oves/oves-world.js` (two comments and the Wedge's Point landmark), `src/ui/map/map-fog.js` (the
`oves-apex` chart area), `src/world/terrain/region-world.js` (two comments and the Oves Desert's region description),
`src/content/regions/oves/oves-scenery.js` and `src/content/regions/gala/gala-scenery.js` (two comments each), `src/content/regions/gala/gala-world.js` (the country's own
header and the Braided Mouths' description), `src/dev/tools/build-status.js` (Gala's and the Oves Desert's prose),
`docs/gala-report.md` and `docs/oves-report.md` (the two open questions, answered in place),
`docs/design-answers.md`. **The lore was not touched**: it does not name any of the five, so there was
nothing in it to update, and the names are the game's reading of the profiles rather than a lore claim.

---

## 4. `groundTint` is a table, at both levels

**The top level was already one** — job 4 did it in `e030e72`: `GROUND_TINTS` in `src/world/terrain/world-terrain.js`,
four families (`gala`, `oves`, `mithala`, `southwest`) walked in order, with `GROUND_TINT_FAMILIES` exported
and a guard in `tests/southwest-world.test.js` that every family must move the colour of the screen
somewhere in its own country. I verified it and left it alone.

**The level below was not, and that is where job 3 nearly lost a country's colours.** `southwestTint` was
four block-wide terms followed by three `if (inBox(...))` blocks with a nested `if (share > 0)` per country
inside each — the same shape, one level down, that had already failed twice. It is now **one table of
thirteen rows walked in order** (`SOUTHWEST_TINTS`), each row carrying:

- `id` — a name, which is what a guard can print;
- `region` — the country it speaks for, or `null` for the one row that is the whole block's (`aridity`,
  which is the only thing that colours Navarth and West Pyros);
- `paint(colour, x, z, mix)` — the colour in, the colour out.

The order is the chain's own, call for call, because mixing is not commutative. The three group boxes went
with the chain and nothing is lost by it: `regionShare` already answers 0 outside a country's own box, and
each country's box is inside its group's by construction.

**Can it catch a missing row? Yes, two ways**, in a new test (`every row of the southwest's own tint table
paints, and every one of the thirteen countries is tinted`):

1. **Every row must paint.** Each row is called on its own country's hexes with a probe colour it cannot
   return by accident, and must come back with something else somewhere. A row that quietly stops painting
   turns the test red **with its own id in the message**.
2. **Every one of the thirteen countries must come out tinted somewhere in it.** This is the assertion the
   two silent failures were really about: a country built without a row of its own turns the test red with
   **its own name**. (Navarth and West Pyros pass through `aridity`, which is stated in the table.)

Plus the row list itself is asserted, so adding a fourteenth row without a line in the test is red too.

**Behaviour is identical, measured rather than assumed.** The base commit's `southwest-world.js` was checked
out beside the new one and both `southwestTint`s were asked the same question at **362,894** points — every
hex of all thirteen countries, a 16 m grid ±48 m around each, against all 23 swatches the block uses —
and **not one answer differed**. `tests/drawn-ground.test.js` passes unchanged, as do all the region tests.

---

## Files touched

`src/content/regions/western-regions/west-regions-life.js` (two new rigs, a `BIRD_RIG` row, `SHUT`, the tortoise branch, the shade rule,
`FLIES`, four pace tables, `settle`, `render`, `shutFor`) · `src/content/regions/southwest/southwest-wildlife.js` (two new ranges;
four refusal notes answered in place) · `src/content/regions/southwest/southwest-world.js` (`SOUTHWEST_TINTS` and its two new
exports) · `src/world/terrain/world-terrain.js` (the `GROUND_TINTS` note) · `src/content/regions/western-regions/west-regions.js` (three river names and
their arguments) · `src/content/regions/oves/oves-world.js` · `src/content/regions/oves/oves-scenery.js` · `src/content/regions/gala/gala-world.js` ·
`src/content/regions/gala/gala-scenery.js` · `src/world/terrain/region-world.js` · `src/ui/map/map-fog.js` (CRLF kept: 331 CRLF / 52 LF, as found) ·
`src/dev/tools/build-status.js` (two countries' animals, two countries' water) · `src/main.js` (three review views;
LF kept in that region, the file's 250 CRLF lines untouched) · `tests/west-life.test.js` (the law, two new
tests, three new measurements in `chase`) · `tests/southwest-world.test.js` (the counts, the ghubr's two
measurements, the tortoise's basin and span, the tint table's guard) · `docs/gala-report.md` ·
`docs/oves-report.md` · `docs/design-answers.md` · `docs/southwest-finish-report.md` (this file).

Nothing is committed.

---

## Tests

Everything with `node --test tests/<name>.test.js`. **`npm test` was not run**; it exceeds this machine's
command-line limit.

| file | result |
|---|---|
| **southwest-world** | **34 / 34** (33 before, plus the tint table's guard) |
| **west-life** | see below |
| **trogo-undergrowth** | 8 / 8 |
| **drawn-ground** | 4 / 4 |
| **gala-world** | 11 / 11 |
| **oves-world** | 13 / 13 |
| **map-fog** | 7 / 7 |
| **cartography** | 13 / 13 |
| **region-layout** | 8 / 8 |
| **languages** | 16 / 16 |
| **regional-wildlife** | 7 / 8 — fails on the `Iscare Archipeligo` line, which the brief names as pre-existing |

And the region tests for everything touched — `src/content/regions/western-regions/west-regions-life.js` and `src/content/regions/western-regions/west-regions.js` are
imported by two dozen files between them, so every test that builds the west's animals or reads its water
was run: **ascarth-world 10/10, caricas-world 8/8, drent-wildlife 4/4, eer-world 12/12, feradom-wildlife
3/3, feradom-world 14/14, isareos-world 9/9, mithala-world 14/14, nesdor-world 8/8, nethereum-world 9/9,
west-lotharn-world 10/10, west-rivers 5/5, east-lotharn-world 12/12, meneth-world 7/7, vastos-world 10/10**
— all green.

### west-life, law by law, and what is mine

The two new tests pass: **the canyon tortoise withdraws instead of fleeing** and **the ghubr does not stand
still on the open desert floor**.

The first law, `nothing in the west can be walked down`, **fails on `elagos-meadow-cattle` at 0.34 m** —
which is the figure the brief names as pre-existing, to the centimetre. `node --test` stops a test at its
first failed assertion, so that failure hides every range after it, and the law could not be observed to
completion on this base at all. So it was swept twice with a harness that mirrors the law exactly and
collects failures instead of throwing (and once against the base commit's own
`west-regions-life.js`/`southwest-wildlife.js`, checked out beside the new ones):

- **both new ranges pass the law.** `dinelv-basin-tortoises` and `ganesh-ghubr` are not among the failures
  in either sweep.
- **`shutters` came back `['canyon-tortoise']`** over all 260 ground ranges, so the law's own
  "exactly one animal answers this way" assertion holds; on the base commit it came back empty.
- **the nine failures are identical between the two sweeps, to the centimetre**, which is the point of
  running both: 258 ranges on the base and 260 now, the same nine lines of output.

| range | law | base | now |
|---|---|---|---|
| `elagos-meadow-cattle` (longhorn) | walked to within | 0.34 m | 0.34 m |
| `drent-woods-8-106` (red-deer) | walked to within | 1.91 m | 1.91 m |
| `suval-country-6-115` (hill-sheep) | within / held | 19.0 s / 19.0 s | 19.0 s / 19.0 s |
| `feradom-country-12-94` (red-deer) | walked to within | 2.30 m | 2.30 m |
| `feradom-country-11-96` (red-deer) | walked to within | 2.35 m | 2.35 m |
| `feradom-country-14-99` (red-deer) | walked to within | 2.55 m | 2.55 m |
| `feradom-country-17-99` (red-deer) | walked to within | 1.28 m | 1.28 m |
| `cold-head-hares` (upland-hare) | walked to within | 2.81 m | 2.81 m |

The other laws were run individually:

| law | result |
|---|---|
| live wildlife positions and care effects… | pass |
| no band is given a range it can run out of the reach of | pass |
| nothing in the west can be walked down… | **fails at `elagos-meadow-cattle`, 0.34 m** — the brief's own figure, pre-existing (swept above) |
| the canyon tortoise withdraws instead of fleeing… | **pass** (new) |
| the ghubr does not stand still on the open desert floor… | **pass** (new) |
| the quick ones cannot be run down either… | **fails at `feradom-country-17-98`, 25.5 s** — the brief's own figure, pre-existing; the law is over hare, wader and otter and touches neither new animal |
| an otter that is come upon goes into the water… | pass |
| sheep can be herded by somebody running, and cattle give ground | pass |
| the river fox never flees… | pass |
| a chased band is home again in a few minutes, watched or not | **fails at `oveth-herons`** — "three minutes on, watched, one is still 63 m from home (it was 61)", which is the brief's third pre-existing failure, and the law takes twenty minutes to get there |
| a band left for a moment has moved a moment's worth | pass |

That last failure also aborts before the southwest's ranges, so **both new ranges were run through the
home-again law on their own**, with the law's own arithmetic:

| | `ganesh-ghubr` | `dinelv-basin-tortoises` |
|---|---|---|
| a parking spot clear of the whole band | 109 m (needs > 40) | 99 m (needs > 40) |
| scattered by a twenty-second run | 69 m | **0 m** — a run at a tortoise moves it nowhere, because it shuts |
| watched, three minutes on | 4 m from home (needs ≤ 20) | 6 m |
| unwatched, four minutes away and back | 2 m from home (needs ≤ 20) | 0 m |
| anybody still aloft, under water or off its footing | none | none |
| what they are doing afterwards | graze / walk | graze / walk — it opened |

---

## Review

**Three views, no errors**, photographed with
`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=…"` after the last
change either animal received, and all three from the same run: `southwest-ghubr`, `southwest-tortoise`
and `southwest-tortoise-shut`, in `src/main.js`. Images: `tests/artifacts/southwest-*.jpg`. The first two
are the ordinary animal framing (the camera rounds to the front quarter of the animal and stands at 2.4 m,
which is a new close distance for a bird a foot and a half tall and a tortoise half that); the third runs
the tortoise's own band with somebody three metres off until it has shut, and then takes the picture from
where that somebody is standing.

**What the final set shows:**

* **the ghubr** stands on the open pavement of the northern Ganesh with the gulf behind it and nothing
  else alive in the frame — which is what a caravan guide actually sees. It reads at once as a bird of
  dry open ground: trunk held level, legs under it, a short bill, and **the pale ridge along the spine
  and over the shoulders is the only loud thing on it**, which is what the name means;
* **the tortoise, open**, is unmistakably a tortoise: the domed carapace with its marginal band, the blunt
  grey head out in front of it, the feet under the rim;
* **the tortoise, shut**, is the picture of the whole decision — a patterned stone sitting on the basin
  floor with nothing out of it, a few paces from a pair of real boulders that it reads as a third of.

**Four rounds, and the three it caught are all one lesson about this renderer's light.** Nothing in the
terrain changed; all of it was the tortoise's shell, and the finding is in the rig:

* the courses of scute, **sunk inside the dome**, were invisible except that the facets of a pale keel
  bead poked through and photographed as two white slivers on a smooth boulder;
* raised **three centimetres proud**, with a keel ridge and a plastron rim made wider than the shell, the
  animal came back wearing a crown of knobs and sitting on a white sled;
* lowered to one centimetre and then three millimetres, and recoloured from pale to *darker than the
  shell*, they still read as pebbles somebody had set on its back. **A horizontal face under this light
  is near-white whatever colour it is given**, so anything standing on top of a dome photographs brighter
  than the dome and reads as a separate object. The same thing is visible on the ghubr: its pale ridge was
  pulled down a full step between rounds and the picture barely moved.
* So the plating went to **the equator**, where the shell's surface is vertical and a band proud of it
  shows its side and shades as the flank does. One band, a centimetre and a half proud. That is the
  version in the images, and it is also the thing that reads in silhouette.

---

## Open questions

1. **The brief's fifth watercourse is not where the brief put it.** It asked for "the Meroshe's southern
   border stream"; there is no watercourse anywhere in the Meroshe, and the course of that name is the Oves
   Desert's. I named that one. If what was wanted was something else, it does not exist yet.
2. **The ghubr is a bird because I chose a bird.** The argument is in the rig and above, and it is the one
   decision in this job that the lore does not make. If the user would rather it were a small mammal, the
   rig is one `models()` entry, one `BIRD_RIG` row to delete and a `FLIES` membership to remove; the range,
   the siting, the shade rule and both tests would all stand unchanged, because none of them is about the
   number of legs.
3. **The ghubr's behaviour is driven by place because the game has no hour.** "Does not stand still when the
   surface air is actively dangerous" is built as "never stands still outside its shade", which is that
   sentence read in a world where it is always the hot dry month. When there is a day cycle, this is the
   first animal that should read it, and the second half of the lore's sentence — that a dustback resting in
   shade *tells a guide something* — only becomes true then.
4. **Two of the five courses are still descriptive**, by argument rather than by omission: Gala's
   distributary (its name is in the pre-Mittoli layer `gala.md` says nobody can gloss) and Ovesos's Dry
   Gully (a dry cut has no word in a water vocabulary). If the user wants them named anyway, the honest way
   is to decide what the pre-Mittoli layer sounds like, which is a design decision and a profile of its own.
5. **The spine lizard, the sand-cat and the desert vipers are still unbuilt**, for the reasons four jobs
   gave: a bask-then-dart gait the game has not got, no night to be nocturnal in, and "known by
   description" and no more. The Moroshé dustback is still somebody's stock.
6. **The rim gap basin of the Dinelv Highlands carries nothing**, which is deliberate — three of the four
   basins have an animal in them and the fourth is the plateau's empty one — but it is the obvious home for
   anything the plateau gets next.
7. **`west-life`'s pre-existing failures are not a short list.** Swept to completion, the first law alone
   fails on **eight ranges in five countries** (nine assertions; the sheep range fails two), where the
   brief names one of them. None of them is this job's
   and all of them are measured identically on the base commit, but somebody should look at the red-deer
   ones: four of the five are Feradom's, which suggests a country rather than an animal.
