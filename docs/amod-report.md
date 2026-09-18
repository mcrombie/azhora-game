# Amod: what was built, and how the ogre plays

Build report for `docs/amod-brief.md`. Branch `amod`.

Amod is in the game as its east end: the road in from western Pueth, the pass
stones on the border with the ogre who takes a toll on them, terraces cut into
the ground itself from the Tarvel up to the chestnut line, Ostel on its shoulder
with seventeen people, the burial terrace above it, Vessen on the far flank, and
the stream the whole place is organised around.

---

## What the lore gave, and what I invented

`../world-builder/azhora_lore/geography/regions/amod.md` is unusually complete and
it was treated as the design document. What came straight out of it:

| From the lore | Where it is in the build |
| --- | --- |
| Foothills of descending ridges, each valley with a stream, every stream made to work | `src/amod-terraces.js`: the Tarvel is graded to fall before its bed is cut; the Dromel is carried on a cut-and-fill bench at about one in three hundred |
| Terraces as the country's visible human mark, long stone ribs on the contours | The terrace stair is in the **terrain**, not on it; `src/amod-scenery.js` walks the shaped ground, finds every riser and stands a dry-stone rib on it |
| The east end drier, stonier, more open, pale grass between the walls | Amod's own scatter thins eastward (`woodland()` in `amod-scenery.js`); grass tufts are tinted pale |
| Chestnut, oak, beech, walnut above; orchards, vines, pulses, goats below | Tall broadleaf on the high ground, walnut lower and alone, orchard and vine only on ground the terraces have made worth the work |
| Ostel: the eastern dry-slope town, stonecutters, hard white wine | `OSTEL_BUILDINGS`: the stonecutters' shed and yard with half-worked blocks and a saw pit, the press house, the cellars cut back into the shoulder |
| Towns on shoulders above valley floors, stone-built, vertically organised, streets on the contour not the compass | Ostel is laid out in its own frame: `along` is the contour, `across` is the fall line. `terraceHouse()` builds an undercroft, a household and a drying loft under a steep roof; `storeys` is a real count |
| Water is the law; the water court; measure-keepers whose testimony overrides a written record | The court's one room with the long table; Verel Ossan the measure-keeper; Havel Dross the clerk who explains standing |
| The water-measure words | In people's mouths, unexplained: *water that cuts*, *water that can be trusted overnight*, *water that looks like plenty and goes into the gravel* |
| The Terrace Compact; anyone affected has standing | Havel Dross's second line, and the reason the Dromel dispute is an ordinary week's work rather than a feud |
| Keeping grade, both meanings | The road is laid on a bench limited to one in nine, and the country's virtue is why |
| Hospitality practical and exact | Anseth Vole at the Struck Measure: dry, fed, near heat, and *then* asked where you are going |
| The dead buried above the villages, looking down the watercourse | **Tir Ostel**, the burial terrace above the town |
| Small offerings at springs, culverts, walls and pass stones | Herb in the cleft of a pass stone, chestnuts at Vessen's spring, a cup of wine on the mended wall at the Tarvel head and on the bridge's offering shelf |
| *A wall remembers every winter* | Isen Caerel, who keeps her husband's wall |
| Ambron noted and adjusted for | Clerk Naso Ferrell, given tea, helped up the stair, answered at length, and told nothing |
| Mavren, Kelmod, Sareth-am-Vel, Tir Amel | Names on signs and in talk; none of them built |

**Invented, in the lore's voice:**

- **The Tarvel**, the stream of Ostel's valley, and its water court. The lore names
  no watercourse here; it wants one per valley. The name uses the `-vel` of
  *Sareth-am-Vel*, which reads as a water or valley word.
- **The Dromel**, the high channel taken off the Tarvel's head and carried along
  the contour, and **the Dromel Gate**, where two households have argued about the
  width of a board-slot since the year the stream changed its bed. The lore
  guarantees this kind of dispute exists; this is one of them.
- **Vessen**, three roofs and a springhouse on the western flank, in the manner of
  Tir Amel but its own place.
- **Tir Ostel**, the burial terrace. *Tir* is borrowed from *Tir Amel* as a
  land/place word.
- **Mallec** and the toll. The lore says Amod's economy runs on pass tolls
  administered by road houses and pass families, and that the water courts are the
  real authority. An ogre who has set himself up as his own toll authority, is
  entered in a road-house ledger as *the stone-keeper's due*, and was once served a
  judgement he could not read and keeps under his stone, is the joke this country
  would actually make. Everything about him follows from that.
- Every personal name in Ostel.

Nothing was written to the lore tree.

---

## Where it is

World metres. Amod is authored directly at 100 m per hex, like Pueth and Peblos,
so it has no `world-scale.js` cluster and nothing is converted at a boundary.

| | |
| --- | --- |
| Region id | **8** (`REGION_IDS.Amod`), eighth in `PLAYABLE_REGIONS` |
| Atlas hexes | 26, q 5–11, r 97–101: hills and one mountain north, grassland south |
| Border with Pueth | the atlas's three hexes `(11,99)`, `(10,100)`, `(9,101)` |
| Road junction | **(−392, −402)** — an existing vertex of `PUETH_ROAD`, so the fork is exact |
| Border crossing | **(−664, −470)**, at the pass stones |
| The pass stones | (−668, −462) |
| The toll stone / Mallec | (−676, −468) / stand (−679, −473) |
| The first terrace | (−694, −483) |
| The view back into Pueth | (−716, −496), from the top of the first terraces |
| The Ostel culvert | (−712, −479) |
| The Ostel bridge | (−772, −488), deck 23.6 m, the water 1.5 m under the arch |
| **Ostel** | centre **(−814, −504)**, radius 32, contour `along` (−0.52, −0.854), fall line `across` (0.854, −0.52) |
| The Ostel spring | ostelPoint(9, −20) |
| Tir Ostel, the burial terrace | (−844, −560) |
| The Tarvel head and springhouse | (−849, −610) |
| The Dromel Gate | (−879, −562) |
| Vessen | (−872, −592) |
| The Kelmod road, where the built world stops | (−886, −532) |
| Shaped ground (`AMOD_TERRACE_GROUND`) | x −908…−644, z −644…−420, feathered 34 m |
| `WORLD_BOUNDS` growth | **minZ −608.4 → −868.2**; x and maxZ unchanged |

The Elagos seam to the south-west was left alone: nothing of Amod's is south of
z = −420 or west of x = −908.

---

## Terraces as terrain

The single idea the region rests on: **a terrace is a hillside converted into a
stair of level treads, and a contour is a line of constant height.** Snapping the
ground to steps of one rise therefore produces ribs that follow the contours by
construction — they curve where the hill curves, crowd where it is steep and open
out where it is gentle, with nothing hand-drawn.

```
terraceHeight(h) = floor(h / RISE) * RISE + RISE * smoothstep(TREAD, 1, frac)
RISE  = 1.45 m      one step: a wall you can see over and not climb absently
TREAD = 0.88        88% of each band is level tread, 12% is the face below it
```

`world-terrain.js` calls `amodGround` inside `groundWithRiver`, so this is in the
ground the traveler walks on, in the collision height, in the terrain mesh and in
everything placed on it. `amod-scenery.js` then walks a 2.1 m lattice over that
ground, finds every cell where the terrace level changes, takes the fall line from
the height field's own gradient, and stands a 3.4 m dry-stone rib square across
it: **3,465 ribs, about 10 km of wall, in one instanced draw call.**

Three other things are terrain rather than scenery, and all three are the lore's:

- **The Tarvel is graded before it is given a bed.** Sampled along its course,
  smoothed over about fifty metres, dropped four metres, forced to fall, and only
  then cut into the hillside with a valley that widens with the depth of the cut.
- **The Dromel holds grade.** The channel is taken off just under the Tarvel's own
  surface at the intake and falls at about one in three hundred, cut where the
  slope stands above it and banked where it falls away, never by more than a few
  metres. A channel that climbs is not a channel.
- **The road keeps grade.** Its profile is smoothed and then run through a slope
  limiter forward and back until no pitch exceeds one in ten and a half — which
  measures a little under one in nine on the ground. A country whose central virtue
  is holding the right slope would not leave a one-in-four pitch on the only road
  into its eastern town. The bench runs the **whole** road, including the 250 m of
  it still inside Pueth, where the raw relief had a 30% pitch on it.

### The cost of putting terraces in the ground

A 1.45 m riser is about 2 m long on a one-in-fourteen slope. The world terrain
grid is 2.5 m inside its fine band and 7.1 m outside it, so at the coarse spacing
the risers fall between vertices and smear into ramps. `world.js`'s `axisSamples`
now takes a **list** of fine bands instead of one, and Amod's built ground asks for
a second one.

| | |
| --- | --- |
| Terrain grid without the Amod band | 393 × 441 = 173,313 vertices |
| Terrain grid with it | 469 × 507 = 237,783 vertices (**+37%**) |
| `createWorld` in Node, whole world | **12.9 s** |

That is the price of the brief's "terraces as terrain, not props", and it is worth
naming because it is paid by every region, not only this one. If it proves too
much, the honest lever is the band's extents in `world.js`, not the terrace module.

---

## Draw calls

Counted exactly the way `tests/regions-world.test.js` counts them: meshes
surviving the frustum from a standing camera at four headings, worst heading
reported. Solis is the brief's benchmark.

| Place | View draws (worst) | Shadow pass | Triangles |
| --- | --- | --- | --- |
| **Solis, the gate** (benchmark) | **293** | 41 | 360,024 |
| Solis, the square | 280 | 49 | 358,011 |
| Rimeholt square | 425 | 80 | 794,648 |
| Tidehaven | 458 | 159 | 847,160 |
| **Ostel, the road in** | **311** | 90 | 515,991 |
| **Ostel, the street** | **320** | 91 | 516,629 |
| Ostel, the stone yard | 338 | 95 | 535,323 |
| The pass stones | 320 | 53 | 556,632 |
| The Ostel bridge | 304 | 92 | 516,093 |
| Tir Ostel | 321 | 89 | 516,155 |
| Vessen | 320 | 62 | 487,833 |

Ostel is within 10–15% of Solis's gate and well under Rimeholt and Tidehaven. The
brief's "about 95 at its gate" is a different measurement from the one this tree's
own test uses, so the comparison above is against Solis measured the same way
rather than against a number I could not reproduce.

Where the budget went: Ostel's eighteen buildings share one palette of six stone
materials, so `world.js`'s per-district batcher merges the whole town into a
handful of draws. The terrace ribs, the trees, the orchard, the vines, the loose
stone and the grass are **80 instanced batches** across the whole region, each one
draw. Nothing in Amod casts a shadow that it does not need to.

Scatter: 3,465 ribs (10,048 m of wall), 263 trees, 221 orchard trees, 272 vines,
1,013 rocks, 2,121 grass tufts, 18 buildings, 46 water blockers.

---

## Mallec

### The numbers he shipped with

`ENEMY_KINDS.ogre` in `src/combat.js`:

| | | vs a goblin |
| --- | --- | --- |
| HP | **620** | 75 |
| Damage | **52** | 17 |
| Tell | **1.18 s** | 0.94 s |
| Attack / contact | 0.44 s / 0.20 s | 0.62 / 0.27 |
| Recovery | 1.30 s | 1.35 s |
| Reach | **4.7 m** | 2.15 m |
| Arc | **±72°** (`arc`) | ±45° |
| Aim lock | **55% of the tell** (`aimLock`) | at once |
| Stand-off | 2.6 m (`standoff`) | 1.8 m |
| Walk | 1.25 m/s | 1.8 m/s |
| Lunge | 6.4 m/s for 0.2 s = **1.28 m** | 0.35 m |
| Stagger | **none** (`stagger: false`) | yes |
| Model | 3.55× the rig, about **5.2 m** tall | ~1.5 m |

Two connected blows kill a traveler at full health (52 + 52 = 104). One full
three-swing combo with the simple sword is 84, so he takes about **25 clean
swings**.

Everything the ogre needs is three optional fields on the profile. Every other
enemy kind ignores them and is untouched.

### What the changes to `src/combat.js` actually are

Additive, four small edits, no rewrite:

1. **`ENEMY_KINDS.ogre`** — a new entry.
2. **`stagger: false` in `hurtEnemy`** — a hit still does damage and still kills,
   but does not set `action: 'hurt'`, does not reset `timers.actionTime`, does not
   restart the recovery and does not push the creature back. This is the single
   biggest change from every fight in the game so far: there is no free second
   bought with a swing.
3. **`arc` in the contact test** — `facing(..., profile.arc ?? Math.PI * .25)`.
   Backing straight up is not a defence, because 4.7 m of reach plus 1.28 m of
   committed lunge covers a 3.05 m backward dodge.
4. **`aimLock` in the windup** — the one mechanic I had to add after playing it.

### What the ogre taught me about this combat system

**The first version was trivial and I could not tell until I played it.** With the
brief's numbers — long tell, wide arc, huge reach, no stagger — a scripted player
who simply pressed dodge sideways once per tell won 20 out of 20 without ever
being hit, including a player with ±200 ms of timing error. The reason is
structural and it applies to every enemy in the game:

> **The aim is locked the instant the windup starts.** For a goblin's 0.94 s tell
> that is survivable, because a goblin's reach is 2.15 m and any dodge leaves it.
> For a 1.18 s tell it means the player is given more than a second of certainty
> about where the blow will land. Direction is the only thing that matters and
> timing is worth nothing.

The fix is `aimLock`: the creature keeps turning for the first 55% of the tell and
only then commits. A dodge thrown the instant the arc appears is followed round;
a dodge thrown late beats the strike. **The long tell then becomes what it was
supposed to be — readable, and still punishing.** The same field would make the
goblins and the soldiers meaningfully harder if the user ever wants that; they
currently have `aimLock` undefined and behave exactly as before.

The second thing the fight showed is that **a committed lunge is what makes
distance matter**. Mallec drives 1.28 m forward during the contact window along
his locked yaw, so a sidestep taken from close in makes him overshoot and whiff,
while the same sidestep taken from further out subtends a smaller angle and stays
inside his arc. The lesson the fight teaches is therefore *get close and step
around him*, which is the right lesson for a creature this size and is not a
lesson any other fight in the game teaches.

### How it actually plays

Tuned by playing it headlessly at 60 Hz through the real `createCombat`, twenty
runs per profile, with reaction delay, timing jitter, missed tells and greed all
modelled. `reaction` is measured from the moment the arc appears; the aim commits
at 0.65 s and the blow lands at 1.38 s.

| Player | Won | Time | Swings landed | Tells faced | Blows taken |
| --- | --- | --- | --- | --- | --- |
| Expert: reads the tell, never greedy, no food | **20/20** | 54 s | 25 | 18 | 1 |
| Practised: ±80 ms, three meals | **20/20** | 54 s | 25 | 18 | 1 |
| Greedy: one swing too many, one time in six | **20/20** | 44 s | 25 | 15 | 2.1 |
| **First try**: ±280 ms, misses one tell in six, greedy one in five | **5/20** | 31 s | 20 | 10 | 3.6 |
| Fourth try: ±160 ms, misses one tell in fourteen | **19/20** | 43 s | 24 | 14 | 2.1 |
| Dodges the instant the arc appears | **0/20** | 15 s | 8 | 4 | 4 |
| Right timing, dodges straight backwards | **0/20** | 14 s | 8 | 4 | 4 |
| Practised, greatsword, fighting at its full reach | **0/20** | 24 s | 12 | 7 | 4 |
| Practised, walking stick only | 20/20 | 97 s | 43 | 32 | 1 |

**What kills you.** In order of how often:

1. **Backing away.** It is the instinct and it is fatal: you end 5.9 m from where
   he started and his reach plus his lunge is 6.0 m. 0/20.
2. **Dodging on sight.** The arc appears, you move, he follows you round, and the
   blow lands on the new position. 0/20.
3. **One more swing.** A swing cannot be cancelled before contact, so a third swing
   started on top of the tell eats the dodge. On its own this is survivable with
   food; it is what turns a bad read into a death.
4. **Fighting at the edge of a long weapon's reach.** The greatsword's 1.3×
   multiplier tempts you to stand at 3.3 m, where a sidestep no longer clears his
   arc, and it loses 20/20 against a bot that will not close. A human would notice
   and step in; I am reporting it because it is a real and slightly perverse
   property of the geometry, and because if the user dislikes it the lever is the
   lunge distance rather than the arc.

**How many attempts.** A first-time player who misreads about one tell in six and
gets greedy about one time in five wins **one run in four**, and by the time they
have tightened to ±160 ms they win nineteen in twenty. So: **three or four deaths,
then it clicks** — which is about right for a boss beside a level-one road that
nobody has to fight.

**A caveat on my own numbers.** The bot flatters the no-stagger design. With
stagger switched back on, the same "practised" bot loses 20/20, because its own
hits break the rhythm it is timing against and it cannot re-plan. A metronome is
easy for a machine and merely *learnable* for a person, so the real human
difficulty sits between my "first try" and "fourth try" rows, not at the expert
row.

### What he is, besides a fight

He is a character. He sits on a pass stone, takes three copper off carts, and has
been entered in Ostel's road-house book for two generations as *the stone-keeper's
due*, because paying him is cheaper than the alternative and Amodians can price an
alternative. He counts everyone who has tried to take the road: twenty-six,
nineteen ran, six he put down and all six got up, one did not and he thinks about
it more than he would like to. The water court of the Tarvel sent a woman up with
a paper once; she read all of it out to him and asked if he wanted to keep it. He
did. It is under the stone, because nobody had ever given him anything in writing
before.

**He is peaceable unless challenged.** You can pay, ask him five things, or walk
on, and walking on is a supported way to play for ever — he adds you to the tally
and does nothing else about it. **One** choice starts the fight, it is labelled
*"Take the road from him. (He is three times your size. This will very probably
kill you.)"*, and it asks a second time before anything happens. The encounter can
only be started from that confirmation; nothing about approaching him does it.

**Losing is the ordinary loss.** The arena runs along +X, so walking east — back
toward Pueth, the way you came — ends the fight, and the checkpoint is on that
side of him. A defeat is the game's normal defeat screen, restarting east of the
pass stones at full health. In his own words: *he does not finish people who have
stopped.*

**Winning is worth something in the region's terms.** He sits down on his own
stone and tells you to tell the road house and the court. Brann Ottel strikes the
line out of the book, dates it, puts the reason in the margin and hands you the
quarter's charge that will not now be paid (24 copper), because it is the only
honest way to close a line. Havel Dross records the court's judgement as enforced
eleven years after it was handed down, and writes your name in the margin, which
is not usual and which he will hear about on the fourth Thursday. The Kessel
brothers walked past the stones this morning and nobody asked them for anything.

---

## Files touched

**New:**

- `src/amod-world.js` — the region as places, roads and water. Pure.
- `src/amod-terraces.js` — the terrace stair, the Tarvel's valley, the Dromel's
  bench and the road's. Pure; imports only `region-world.js` and `amod-world.js`,
  so `world-terrain.js` can call it without a cycle.
- `src/amod-scenery.js` — the ribs, the water, the bridge, Ostel, Tir Ostel,
  Vessen, the pass stones and the region's own scatter.
- `src/amod-people.js` — nineteen people and what they say, before and after.
- `src/amod-ogre.js` — the toll, the encounter, the dialogue, `snapshot`/`restore`.
- `tests/amod-world.test.js`, `tests/amod-ogre.test.js` — sixteen tests.

**Changed, small and local:**

| File | What |
| --- | --- |
| `src/region-layout.js` | `'Amod'` in `PLAYABLE_REGIONS`; `REGION_BIOMES.Amod` (`ownScatter`) |
| `src/region-world.js` | `REGION_IDS.Amod = 8`; `REGION_TERRAIN.Amod`; `REGION_TEXT.Amod` |
| `scripts/build-region-survey.mjs` | `'Amod'` in `PLAYABLE` |
| `src/region-survey.js` | regenerated (8 lines; `LAND_HEXES` unchanged) |
| `src/world-terrain.js` | one import and one call: `amodGround` at the end of `groundWithRiver` |
| `src/world.js` | `axisSamples` takes a list of fine bands; a second band for Amod; one `createAmodScenery` call; the road measured and drawn; landmarks, stands and metrics |
| `src/world-regions.js` | `AMOD_CLEARINGS` appended to `REGION_CLEARINGS` |
| `src/map-fog.js` | five `SUBREGIONS` for Amod |
| `src/build-status.js` | an honest `BUILD_STATUS.Amod` (`early`) |
| `src/signs.js` | five sign labels |
| `src/developer-atlas.js` | an Amod anchor hex, so the developer chart has a stop per playable region |
| `src/combat.js` | **additive only**: the `ogre` kind, `stagger`, `arc`, `aimLock`, `standoff` |
| `src/combat-view.js` | the ogre's actor, his badge, his shadow, and a warning arc drawn at his own reach |
| `src/characters.js` | `createOgre()`, appended at the end |
| `src/main.js` | imports, the roster, the actor branch, the conversation, the fight's outcomes, the save, and Amod review viewpoints |
| `src/road-checkpoint.js` | validate and restore the saved toll |
| `package.json` | the two new test files |

`src/main.js` and `index.html` were patched only by an anchor script that asserts
each anchor occurs exactly once and writes nothing if any fails; `index.html` did
not need changing. `src/world.js` was patched the same way, since it is CRLF too.

---

## Tests and smokes

- `npm test` — green, with the two new files registered.
- `npm run test:game` — pass.
- `npm run test:road` — pass.
- `npm run test:autoplay` — **not run**, per the brief.

Checked by eye with headless review screenshots through the real renderer
(`__AZHORA__.review('amod-terraces' | 'amod-bridge' | 'amod-ostel' | 'amod-street'
| 'amod-valley' | 'amod-ogre')`): the terraces from the Pueth road, Ostel from
below and from its street, the Tarvel valley, and Mallec standing next to the
traveler for scale. The scratch capture harness lived in the scratchpad and has
been deleted; the six viewpoints are kept in `review()` because they are how the
region will be looked at again.

---

## What is stubbed

- **Everything west of the Ostel bridge.** Kelmod, Sareth-am-Vel, Tir Amel and
  Mavren are names on signs and in conversation. The road ends at a wall and a
  fingerpost.
- **No chapter.** Amod has no quest of its own and is not a theatre of the war. The
  ogre is the only thing to do, and he is optional.
- **No interiors, no trade.** The road house has no inside, the water court's door
  is never opened, nothing can be bought or sold, and the hard white wine cannot
  be drunk.
- **The water court hears no case the traveler can take part in.** The Dromel
  dispute is described, not played.
- **Terrace ribs have no colliders.** A 10 km run of walled maze would be worse
  than walking over a wall, so the ribs are visual and the stepped ground under
  them is walkable. If the user wants them solid, the place to do it is the rib
  loop in `amod-scenery.js`, and it will need stiles.
- **The region's west is terrain only.** Two thirds of Amod's hexes have the
  biome, the scatter and nothing else.
- **No wildlife of its own.** Goats are mentioned and not modelled.

---

## What the lead must resolve on merge

1. **`REGION_IDS.Amod = 8` and eighth place in `PLAYABLE_REGIONS`.** The Elagos,
   West Izol and East Suval agents will each want an id too. Every list that has to
   agree is: `PLAYABLE_REGIONS` (`region-layout.js`), `PLAYABLE`
   (`scripts/build-region-survey.mjs`), `REGION_IDS` and `REGION_TEXT`
   (`region-world.js`), `REGION_TERRAIN`, `REGION_BIOMES`, `BUILD_STATUS`, and
   `LOCALS` in `developer-atlas.js` — `tests/developer-atlas.test.js` requires one
   developer-chart stop per playable region, in order, so a new region added
   without an atlas anchor fails the suite.
2. **`src/region-survey.js` must be regenerated after the registry is settled**:
   `node scripts/build-region-survey.mjs`. Do not merge the generated file by hand.
3. **`src/world.js`'s terrain grid is unchanged.** An earlier version of this branch
   widened `axisSamples` into a list of fine bands so the terrace risers would not
   smear into ramps, at a cost of +37% terrain vertices across the whole world.
   The final version drops that: Amod's terraced ground is drawn by its own fine
   patch in `src/amod-scenery.js`, and the coarse grid is sunk out of sight beneath
   it (`amodTerrainSink` in `src/amod-terraces.js`). The only line `world.js`
   gains in the terrain loop is that sink.
4. **`src/combat.js`** is additive but three of its functions changed lines:
   `hurtEnemy` (the stagger branch), `updateEnemy`'s windup (the aim lock) and
   attack (the arc and the lunge guard), and `desiredDistance`. Nobody else was
   supposed to be in this file, but check.
5. **`src/main.js`** gained a conversation block, an actor branch, a save field and
   a review case. The save field `ogreToll` also needs its validator in
   `src/road-checkpoint.js`; both were added together and must land together or a
   saved game will be refused.
6. **`WORLD_BOUNDS` grew north** to minZ −868.2. Anything that assumed the old
   northern edge — the coast field, the sea plane, the chart — recomputes itself,
   but the developer atlas and the journal chart are worth a look.
7. **`src/signs.js`'s `SIGN_LABELS`** gained five entries. Every agent adding a
   place will add to this list; it is a plain array and the conflict is trivial,
   but `tests/regions-world.test.js` throws by name if a label is missing.
8. **Amod's relief amplitude is deliberately low** (`REGION_TERRAIN.Amod`: 2.4 for
   grassland, 6.5 for hills). The country's shape is the hex tilt, the stream
   valleys and the terraces; a louder sine field puts one-in-three pitches under
   the road and no channel can hold grade across it. Please do not raise it without
   re-running `tests/amod-world.test.js`, which measures both.
