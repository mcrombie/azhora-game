# Telemonia, stage 1: what was built

Branch `telemonia`, worktree `../azhora-game-telemonia`, cut from `next-main` (`093f1bf`). The brief is
`docs/telemonia-stage1-brief.md`. **Nothing is committed and nothing is pushed**; everything below is in
the working tree.

Telemonia is ground now: a bowl of dry rock with a thick rim round one enclosed plain. The rim is laid in
cliff bands that a walker cannot climb, on ridges that run north-east to south-west, and three passes go
through it and nothing else does. Inside lies the Galmeth, a raised, level plain thirty metres up with
three dry washes across it, and in the middle of the plain Kethorn's rock: a crag, twenty metres of cliff in
three bands on three sides, and a stone wall with one open gate across the spur on the fourth, its top level
ground; nobody climbs it, so the gate is the only way onto it. Dry-stone terraces step the rim's inner faces
from the cliff foot down to the plain, each riser one coursed and capped wall, with stairs up through them
and check-walls across the two gullies, and one walled way - the Rothkar way - climbs them and the inner
cliff to the foot of the Rothkar, the highest rock of the rim, on the East Pyros side. The Belketh, the only
wood, is in the south-east corner. Hares and a harrier on the plain, the dry-plateau hawk over the western
rim. (The crag, the walls, the unclimbable rock, the way and the backdrop cones' removal are the polish of
2026-10-02, at the end of this report.)

**Stage 1 only.** No building, no field or crop, no person, no weapon, no domestic animal, no market, no
quest, and nothing about how a traveler is met. The wall's gate stands open.

The region is appended last on its base under the atlas's key **`Telemonia`**. **Its number is
`REGION_IDS.Telemonia` and is written in exactly one place** - 53 on this base - because another worker
has taken the next ids on main (see "Where the number is written").

---

## What the atlas gave

| | Telemonia |
| --- | --- |
| hexes | 25, rows 118-122, q -17...-11 |
| terrain | `hills` x 17, `plains` x 8. The plains are (-14,119) (-13,119) / (-15,120) (-14,120) (-13,120) / (-15,121) (-14,121) (-13,121), every one ringed by the country |
| the ring | **16 of the 17 hills hexes are on the border; the 17th, (-16,121), touches no border at all** - the one place the rim is two hexes thick all round. The brief's "seventeen `hills` on every edge" is one hex out; the Rothkar stands on that hex |
| climate (per hex, World Builder map, `koppen-v1`) | `BSh` x 23, `Csb` x 2: (-12,121) and (-13,122), the south-east corner (`TELEMONIA_CLIMATE`; the `.cmap.json` was not read) |
| neighbours by shared edge | Oves Desert 12 (north, built), Gala 9 (east, built), Legemum 9 (south, unbuilt), East Pyros 8 (west, unbuilt) |
| water | **no river edge inside**. 12 river edges on the border, all `small`: 5 Oves Desert (the Caelin, built by the Oves), 7 Gala (the Treloss, built by Gala). The two dry Gala edges are the east and south-east edges of (-11,118), between where the Caelin hands over to Gala's reach at (-1850, 1039.4) and where the Treloss rises at (-1900, 1125.9) |
| world position | hex centres x -2350...-1850, z 1068.2...1414.6; outline x -2400.002...-1800.002, z 1010.495...1472.376 |
| level | 3 (`src/world/terrain/region-levels.js`, already there) |

## What the lore gave, and what each line fixed

`world-builder/azhora_lore/geography/regions/telemonia.md` and `peoples/the_telemon.md`, as rewritten on
2026-10-01, and the user's paragraph in the brief, which is the specification.

| the line | where | what it fixed |
| --- | --- | --- |
| "rockier and more elevated so there is room for terrace farming and rock based defenses" | the user | the whole country stands up off its neighbours: the plain at 30 m against Gala's 6.7 m and the Oves Desert's 15.1 m on the hexes across the border, the rim's crest at 52-66 m, the Rothkar at 92.7 m |
| "a bowl with a thick rim. The rim is rock: ridge behind ridge, running northeast to southwest" | telemonia.md | the rim is the lower of two faces - one rising off the neighbours' own ground at the border, one off the plain - under a crest field whose ridges run north-east to south-west, 58 m apart across the grain (`CREST`, `ridgeShare`, `crestHeight`) |
| "bare along the crests and broken by cliff bands that a party can spend a day finding the end of" | telemonia.md | every face of the rim is laid in courses 6.5 m high, cliff then ledge (`STRATA`, `strata`): on the outer faces a walker meets six to eight cliffs of about 5.3 m one above another (measured, below); the crests are pale bare stone in the tint |
| "The valleys between the ridges are narrow, funnel movement" | telemonia.md | the ridge field's valleys are V-shaped and narrow; where they run out against the next ridge they end in cliff bands |
| "The passes through the rim are few ... defensible by small numbers against very large forces" | telemonia.md | three passes (`PASSES`), each a gorge 9-10 m wide at its narrows between walls steeper than two in one |
| "Inside the rim the ground levels into a single enclosed plain, the **Galmeth**" | telemonia.md | the eight plains hexes, rounded into one plain, level to within 2 m at 30 m (`GALMETH`, `plainLevel`) |
| "a rock with cliff on three sides and a wall closing the fourth ... the only walled place" | telemonia.md | `KETHORN`, `kethornLift`, `KETHORN_WALL`: a crag on the middle plains hex, cliff on its north-east, north-west and south-east faces, a spur down its south-west end, and the fortification standard's wall across the spur's head with one gate |
| "Inside the wall are the halls of the bands ... the granaries and the cisterns; and the hall of the king, which is said to be distinguishable from the others mainly by where it stands" | telemonia.md | the top is level ground with a gentle rise to its north-eastern end, over the cliffs and furthest from the gate - where a king's hall would be distinguished by where it stands. Nothing is built on it |
| "the terraces that step the inner faces of the rim from the cliff foot down to the plain"; "dry-stone steps" | telemonia.md | `TERRACES`: seven courses 1.8 m high on every inner face, level treads about 4.2 m deep, a dry-stone wall on every riser, from the plain's edge to the foot of the inner cliff |
| "how to hold a gate, a terrace wall, a cistern, a stair" | both | the stairs up through the terrace belt (`stairDistance`): twenty-four of them, the only walked way up the belt |
| "The Telemon build nothing in a wash"; "washes that drain the rim run for a few days after rain ... dry stone by midsummer" | telemonia.md | three dry washes across the Galmeth (`WASHES`), a bed of washed stones under 0.7-0.85 m of bank, nothing growing in them |
| "behind check-walls across the gullies" | telemonia.md | two gullies where the washes come down the inner faces (`GULLIES`), floors stepped by check-walls every 1.15 m of fall |
| "No river rises in Telemonia and leaves it under a name ... The only streams that run the year round are on the borders" | telemonia.md | no water inside; the washes come together at the head of the east pass and leave the country down its gorge, and the Treloss rises at the gorge's foot on the Gala side |
| "bunch grass, wormwood and thorn on the slopes, grey scrub oak and juniper in the folds where a little soil has collected, bare stone above" | telemonia.md | the scatter, sorted by what the ground is (below) |
| "Only the south-eastern corner ... holds anything a lowlander would call a wood ... *Belketh*" | telemonia.md | the wood on the two `Csb` hexes and only there (`belkethShare`) |
| "Tormon is said to sit on the *Rothkar*, the highest rock of the rim" | both | `ROTHKAR`, found off the ground (below) |
| "the track along their foot - the desert's southern route, with its wells - is kept by Telemon bands ... the road by which the bands go out" | telemonia.md | the Tarnel, north to the Oves |
| "The Galans broker most of the Telemon mercenary contracts and conduct the bulk of the border-market trade" | both | the east pass, to Gala |
| "Legemum tin reaches Telemon border markets"; legemum.md: "what passes between the two peoples passes at the edge markets below the rim" | telemonia.md, legemum.md | the south pass, toward Legemum |
| "The borders are not marked with walls ... The terrain is the wall" | telemonia.md | no wall anywhere but Kethorn's |

## What is mine, labelled

Where the lore is silent the build needed an answer, and these are **builder's choices**. Each is the
user's to overturn and is listed again under the open decisions.

1. **The heights.** The plain at 30 m, the crest at 52-66 m (never less than 10.5 m above the cliff
   foot), the Rothkar at 92.7 m, the rock's top at 50-52 m. Chosen to make the user's "more elevated"
   plain against both neighbours: the Galmeth is 23 m over Gala's border hexes and 15 m over the Oves
   Desert's.
2. **Three passes, and none on the East Pyros side.** The brief required one from Gala and one from the
   Oves; the third, toward Legemum, is the lore's tin trade and the edge markets Legemi traders keep. The
   west is the rim's thickest side and the lore has the Pyrosi trading "occasionally at the western edge".
3. **Where each pass goes.** The Tarnel through the notch where the Oves Desert's hex (-13,117) reaches
   into the rim, the thinnest place on the north side; the east pass on the one stretch of the Gala border
   with no stream on it; the south pass on the Legemum edge of (-15,122).
4. **The Galmeth drains east, through the east pass.** It falls 1.4 m from west to east (30.8 to 29.4 m
   mean), its three washes meet at the head of the east pass and leave by its gorge, and the Treloss rises
   at the gorge's foot on the Gala side. The Tarnel and the south pass each climb to a col over the plain
   (32.3 and 31.8 m) so the plain does not drain through them.
5. **Kethorn's open side faces south-west.** The cliffs face the two passes the built world comes in by;
   a spur toward the north-east would have run straight into the head of the east pass, where the washes
   leave the plain; and the open side is the side furthest from every approach. The top rises toward its
   north-eastern end, over the cliffs and furthest from the gate.
6. **The rim's cliffs can be climbed** with the climbing skill, as every other climbing country's can: the
   rule is the shared one (below). **Kethorn's rock cannot** - that is the user's, 2026-10-02 (the polish).
7. **The terraces go all the way round**, under the Belketh too, seven courses of 1.8 m; stairs every 13
   degrees round the plain.
8. **No boar in the Belketh** (measured, below), and no land animal on the rim.
9. **The Oves Desert's sky**, to the digit.
10. **The name Tarnel** on the north pass.
11. **No wild threats** in Telemonia's campaign entry, and **a polity of its own for the Lizeem's Gala**
    (the fixes, below).
12. **From the polish**: the crag's shape (three bands, five buttresses, faded out at the spur end); the
    Rothkar way's route and grade, and **its walls**: it is walled where it stands over the crest and round
    its landing, so it goes up onto the rim and not out over it (the polish says why).

---

## The measured numbers

Off the built ground (`world.heightAt`), on this branch's final state unless said otherwise.

### The Galmeth

| | |
| --- | --- |
| area inside its rounded edge | 69,068 m² |
| level | mean 29.92 m, 29.00...31.04 m away from the washes, the rock and the passes |
| fall | west half 30.78 m, east 29.37 m, toward the east pass |
| open ground | 48,471 m² clear of the washes (7,760 m²), the rock with its talus (12,821 m²) and the way's foot (25 m²); it was 51,804 m² before the polish widened the rock's apron |
| washes | south 260.5 m, half-width 6.5 m, cut 0.85 m, 30.0 -> 28.4 m; west 263.4 m, 6 m, 0.8 m, 30.2 -> 28.4 m; north 175.4 m, 5 m, 0.7 m, 30.2 -> 28.4 m. All three end at the east pass's head |

### The rim

| | |
| --- | --- |
| area (outside the plain's rounded edge) | 147,636 m², 27.5% of it steeper than a walker takes (slope > 0.9) |
| crest (the rim top, away from the passes, the gullies and the Rothkar) | p10 52.4 m, median 57.9 m, p90 64.4 m, highest 65.7 m |
| the outer faces, mean heights at the border / 10 / 20 / 35 / 50 m in | toward the Oves Desert 11.7 / 28.6 / 40.7 / 52.3 / 57.5; toward Gala 6.3 / 24.8 / 37.4 / 54.0 / 58.9; toward East Pyros 11.1 / 27.2 / 41.9 / 53.6 / 58.3; toward Legemum 10.9 / 25.5 / 38.2 / 54.0 / 55.3 |
| the cliff bands | on 33 transects straight in from the border (away from the passes), 239 cliffs over a metre high: median 5.3 m (p10 5.0, p90 5.4). Six to eight on every transect, **never fewer than five**, and 81-85% of the climb is taken in cliff |
| the inner face | terraces from the plain's edge up 12.6 m over 27 m, then a cliff at least 10.5 m high over 9 m to the crest |

### The Rothkar

Found off the ground and not placed: the point of the rim furthest from both the plain and the border
(`ROTHKAR`, the largest `min(border depth, plain distance)` on the grid), which is the thickest rock in
the country and so the one place a rock can stand highest above everything round it. It is
**(-2282.0, 1346.5), on (-16,121) - the one hills hex that touches no border -** 78.8 m from both.

| | |
| --- | --- |
| summit | 92.72 m (the highest ground in the country, 92.84 m, is 6 m off its centre on its flat top) |
| over the plain | 62.8 m |
| the rim 60 m round it | mean 53.4 m (39.0...65.0) |
| in sight from the Galmeth | some part of its top five metres from 41 of 81 points on a 20 m lattice (42 of 89 before the polish, whose wider rock covers eight of the points): the eastern half of the plain and its north edge, and from the rock's top. **Not** from the western and south-western plain, which lies too close under the western rim's inner cliff. From the Rothkar way's landing at its foot, its face is in sight up to the edge of its summit (91.5 m of 92.7) |

### The passes

| | the Tarnel | the east pass | the south pass |
| --- | --- | --- | --- |
| faces | the Oves Desert | Gala | Legemum |
| mouth at the border | (-2150.0, 1039.4), ground 12.0 m | (-1850.4, 1077.8), ground 8.9 m | (-2125.0, 1457.8), ground 11.5 m |
| length inside the border | 96.7 m | 201.3 m | 123.0 m |
| highest floor | 32.3 m, a col 86 m along | 29 m at the plain (no col: it is the drain) | 31.8 m, a col 78 m along |
| narrowest floor | 9.0 m wide | 9.6 m wide | 8.8 m wide |
| floor at the mouth / at the plain | 13 m / 24 m wide | 14 m / 32 m wide | 13 m / 28 m wide |
| steepest 0.5 m of its line | 0.53 | 0.35 | 0.58 |
| walls at the narrows | slope 2.4 off the floor's edge (2.2 m fillet) | the same | the same |
| landmark (col, or narrows where there is none) | (-2169.8, 1094.3), 32.5 m | (-1881.5, 1092.7), 15.7 m | (-2109.4, 1398.3), 31.8 m |

### Kethorn's rock

| | |
| --- | --- |
| where | on (-14,120), the middle plains hex, centred (-2100.0, 1241.4); long on the north-east/south-west grain |
| top | 4,247 m² inside the cliffs and behind the wall (`onKethornTop`; 4,122 before the polish); 4,055 m² of it pitches under 1 in 10, 2,308 under 1 in 20, 501 under 1 in 50 |
| top's height | 49.7...52.2 m, mean 50.8 m; 20.7 m over the plain under it; 51.9 m at its north-eastern end, 50.6 m at the neck |
| outline | a crag's: the top's edge stands between 0.91 and 1.14 of the old ellipse round the three cliff sides, with nine buttresses; the ellipse at the spur end |
| cliffs | round the three cliff sides, **three bands** on every one of 119 bearings, each 5.5 m high (p10 5.2, p90 6.0) at five or six in one, with **ledges 1.9 m wide** (p10 1.3, p90 2.5) between them, over 4.5-12.6 m of face (median 6.7), onto a talus apron 2.4-4.5 m over the plain; at the spur end a plain cliff over 3.6 m of run onto a talus 3.2 m high, as in stage 1. The rock stands off the plain (lift over 0.2 m) on 12,312 m² |
| spur | 72 m from its foot at (-2176.4, 1317.8), 30.8 m, to the neck; steepest metre of its line 0.36 |
| wall | 31.1 m along its line across the spur's head, an open line laid by the fortification standard (`fortCircuit`, src/world/scenery/fortification.js) at `KETHORN_STANDARD`: 5.6 m high, wall-walk at 4.0 m, 3.6 m thick, no ditch, no corner towers. **26 colliders**: 24 of wall and 2 gate towers. Its two ends run 1.3 m on over the cliffs' lip (ground 44.5 and 44.8 m, six metres down the face), so their colliders cover the lip and the only way past them is down the cliff. At 0.8 m the test found a one-metre ledge on the lip beside an end that could not be walked out of |
| gate | one, 4.2 m wide, at (-2126.9, 1268.3), ground 50.6 m, between its two towers; **open** |

### The terraces, the stairs, the gullies

| | |
| --- | --- |
| the belt | 31,108 m², all round the plain but where the passes, the gullies and the Rothkar way cut it (31,364 before the way) |
| courses | seven, 1.8 m each, from 31.0 to 43.6 m over 29.3 m of run on a measured line: treads about 4.2 m deep, near level (tread fall 3% of each course) |
| walls | since the polish, one coursed and capped dry-stone face along each riser's line from stair to stair: 181 walls, 5,461 m, averaging 30 m, 43,362 stones (`Telemonia dry-stone walls`); in stage 1 a rib on every riser found from the lattice, 4,209 of them |
| stairs | 24 through the belt, every 13 degrees round the plain's middle, 2.5 m wide on the ground's own slope (about 0.4); each walked from the plain to the cliff foot by the climbing rule (the test) |
| gullies | two, south and west, floors stepped every 1.15 m of fall, a check-wall straight across each step: 24 |

---

## What stops a walker, and where

**The climbing rule, `src/gameplay/movement/climbing.js`, unchanged in how it works.** Telemonia is added to
`CLIMB_REGIONS` by name. Inside it (and on any step into or out of it), `canWalkSlope` refuses an uphill
step steeper than 0.9 - which is what the traveler controller asks before every uphill step - and a
descent is always allowed (it is a fall). With the skill, a traveler can still climb any of the rim; Kethorn's
rock gives no hold since the polish (`climbForbidden`, below).

What that rule meets in Telemonia:

- **The cliff bands on every outer face.** A course is 6.5 m high, its cliff at about 3.5 times the
  face's own slope; on anything steeper than about one in four the cliff cannot be walked up. Each course
  is laid **cliff first and ledge after**, so the courses only ever raise the ground and never dig a moat
  at the foot of the face (the first version did, and the test found 761 m² of pockets).
- **The inner cliff** above the terraces, never less than 10.5 m.
- **The terrace walls** (each riser is too steep to walk up), with the stairs as the way up.
- **The passes' walls**, slope 2.4.
- **Kethorn's cliffs** (twenty metres in three bands at five or six in one, since the polish) and **its
  wall**, which is colliders.
- **The Rothkar way's walls**: its cut banks at 2.4 in one, its revetment, and over the crest the rock lip
  either side of it and round its landing (the polish).
- **The gullies' check-walls.**

**Measured with the game's own rule**, by a flood over every metre of the country (1 m lattice, every
step judged by `canWalkSlope` against the drawn heights and by `canStand` with every collider the world
placed; re-run on the polished country, with the same results):

- with the three passes open, a walker from outside reaches **99.8%** of the Galmeth (the rest is under
  colliders), every metre of the rock's top through the gate, and the terraces by their stairs;
- **with the passes shut, nothing inside the rim is reached**: not one metre of the plain or the terraces,
  and nothing of the high rim. What is reached is a strip a few metres wide at the foot of each outer face;
- **each pass on its own** lets a walker into the Galmeth;
- **with the gate shut, none of the rock's top is reached**, and with it open all of it is;
- nobody walks onto the high rim from outside; from the plain, since the polish, only up the Rothkar way
  onto its walled landing at the foot of the Rothkar; the rest of the rim above the cliff foot is reached by
  climbing or not at all.

**Nobody is sealed in.** The same flood run backwards from every metre outside the country: **every
standable metre of the country** - the rim, the basin and the rock - can be walked out of, going down
cliffs where it must. That took three things the first floods found:

1. the moat at the face's foot (above);
2. **the world's hex-blend seam at the border.** `terrainMix` steps along a hex edge, and across the
   western and southern borders the hexes are unbuilt `outland` (six metres of roll on a 150 m wave), so
   this side's ground could stand up to 1.4 m below the far side a pace away: a trench a metre wide at the
   face's foot. So the ground before this country is asked a hand's breadth and a forearm's either side
   of every metre of the border (`seamLift`, with `baseAt` as Feradom's `frontLevelFor` has it), and where
   the far side is higher this side is lifted to meet it, fading over 4 m; and within the face's foot the
   seamless blend is put in place of the stepped one (`seamlessDelta`), as Feradom and the Suvals do. The
   ground never steps up on the way out of the country by more than the climbing rule lets a walker take
   (except within six metres of a hex corner where two of the far side's own hexes meet, which have a
   seam of their own - see "Found on the way");
3. **solid scatter with room round it**: a tree or a boulder on a ledge against the cliff above it can
   close the ledge, so solid things stand only where there is no cliff, riser or wall within 1.8-2.5 m,
   and the fallen rock at the cliffs' feet is drawn and walked through.

**The border streams are left alone.** The Caelin and the Treloss run along the border line, softened off
the hex edges so that they cut a corner of this country here and there; within five metres of their water
the ground is theirs, and nothing of this country stands their bed out of their own water.

---

## The neighbours

Registering Telemonia replaced `outland` (11.5 m, 6 m of roll on 150 m) in the hex blend with the
country's own profile (`REGION_TERRAIN.Telemonia`: **10 m, 0.8 m on Gala's and the Oves's 320 m wave**).
That profile shapes almost nothing of Telemonia - `telemoniaGround` takes over - but it shapes the
neighbours' last eighty metres and the two border streams worked out from them, so it was chosen for them,
by measurement:

| | the base (Telemonia unbuilt) | with 11.5 m | **with 10 m (as built)** | the limit their tests hold |
| --- | --- | --- | --- | --- |
| the Caelin's end / Gala's reach's start | 8.47 / 8.35 m | 8.66 / 8.11 | **8.18 / 7.75** | the fall at the join under 0.6 m |
| the fall at the join | 0.12 m | 0.55 m | **0.44 m** | |
| the Treloss's head | 7.37 m | 8.17 | **7.16** | falls the whole way |
| the Oveth's reach, head | 7.70 m | 7.70 | **7.52** | at or below the Oveth's mouth (8.01) |
| the Oves\|Gala seam, worst hex-centre step | | 1.80 | **1.80 m** | under 2.6 |

Every Oves and Gala stream still falls the whole way and nothing floats; `groundWithRiver` and
`westGroundAt` agree to 1e-9 on every sample of every Gala and Oves hex (nothing of this country is
written on them).

**The ribs the Oves report left are gone on the twenty-one hex edges this country shares with the Oves
Desert and Gala**, because the profile is on their wavelength: on the Oves's own scan round x = -1900 the
all-built ground's steepest is 1 in 1.54 (0.649) over 5,129 points against the test's 0.75, and the
margins with East Pyros and the Nether Desert still chirp (2.19), as that test expects.

## The world box and the survey window: neither moved

`worldBoundsFor` over every country without Telemonia and with it answers the same four numbers -
x -4610.001927939127...609.9980720608719, z -2167.195996001615...3264.4264805429416 - because the
country stands 2,210 m inside the western edge, 2,410 m inside the eastern, 3,178 m inside the northern and
1,792 m inside the southern. `WINDOW` is `{ minQ: -52, maxQ: 34, minR: 79, maxR: 145 }` before and after;
`LAND_HEXES` is 2,079 before and after and all twenty-five hexes were already in it. The regenerated
`src/dev/tools/region-survey.js` differs from the base by exactly Telemonia's own entry in `PLAYABLE_SURVEY` (eight
lines). `src/world/terrain/region-rivers.js` regenerated byte-identical; Telemonia was not added to `RIVER_REGIONS`,
because every river edge on it is already in the file through the Oves Desert and Gala. Asserted in
`tests/region-layout.test.js` (the ledger) and in `tests/telemonia-world.test.js`, and written into the
`WINDOW` ledger in `scripts/build-region-survey.mjs`.

## Names

The five names are the lore's own, and every one of them is in the `kellith` profile's own candidate pool
(`world-builder/azhoran_language_profiles.py`): **the Galmeth, Kethorn, the Rothkar, the Belketh** - and
**the Tarnel**, the one that was free, on the north pass: `tarn` is the profile's root for a hill and a
fort, with its own `-el` ending. Nothing else is named: the east pass, the south pass, the western rim, the
terraces, the washes and the gullies are plain English, because the lore names no other pass and nothing
else of the ground. `kethkar` is the Kellith lexicon's word for a pass (`src/gameplay/skills/languages.js`); calling a pass
by it would be calling it "the Pass", and I did not. Nothing in Telemonia is named Crom; the test holds it.

## Climate, sky and colour

`BSh` x 23 and `Csb` x 2, read per hex off the World Builder map and held to it by the test. **The sky is
the Oves Desert's to the digit** (sky 0xcedcd2, haze 0xe3dabd, density .0034): the lore puts the highland
"in the same belt as the Oves Desert to its north ... for most of the year it looks like them", and the
bands' road north is the desert's route. `Telemonia` is on the shared `OWN_SKY` list (`tests/own-sky.js`).

The ground's colour is `telemoniaTint`, the **sixth row** of `GROUND_TINTS` (`src/world/terrain/world-terrain.js`;
`tests/southwest-world.test.js`'s guard has its line): buff bunch grass, the terraces' bare earth, the
ledges' thin soil, washed stones in the washes, the passes' gravel, darker under the Belketh. The rim's own
fine ground (`src/content/regions/telemonia/telemonia-scenery.js`, 1.5 m apart and 9 m past the border, the world's 7 m grid sunk
under it by `telemoniaTerrainSink`) adds scree on the steep and bare stone in courses on the cliffs, paler on the
crests: "bare stone above".

## What grows

`src/content/regions/telemonia/telemonia-scenery.js`, its own seeded stream after Selemis's. Sorted by what the ground is, not by
hex:

| | count | where |
| --- | --- | --- |
| the country's own ground | 109,356 vertices, 1.5 m apart | every hex and 9 m past the border, the world's grid sunk under it |
| bunch grass | 8,026 tussocks | the plain (buff, a little green in hollows), the ledges, a weed or two on the terrace treads |
| wormwood | 1,785 | silver-grey, on the ledges and here and there on the plain |
| thorn | 952 | dark and twiggy, on the ledges |
| understory | 898 | dark glossy scrub under the Belketh's trees |
| trees | 87: holm oak 55, juniper 11, stone pine 21 | **60 in the Belketh** (evergreen oak with pine, all 21 pines there); the rest grey scrub oak and juniper singly in the folds - the valleys between the ridges and the foot of the outer faces |
| stone | 1,372, of them 245 fallen at the cliffs' feet or lying on the crag's ledges | thin on the plain, more on the ledges; only big stones with room round them are solid |
| washed stones | 503 | down the three washes |
| terrace walls | 181 walls, 5,461 m, in courses with a cap | every riser of the terrace belt from stair to stair |
| check-walls | 24 | across every step of the two gullies' floors |
| the Rothkar way's walls | 204 m | its revetment and its parapets |

**The Belketh is thinner than the word "wood" asks.** A tree is solid, and a solid thing on a ledge a few
metres wide against the cliff above can close it (the test found such pockets), so trees stand only where
there is no cliff or riser within 1.8 m. The Belketh's ground is the rim's corner, ledges between cliff
bands, and 60 trees is what it holds under that rule (65 before the polish moved the scatter). Open, below.

Nothing is planted, cut, stacked or tended. The terraces' treads are bare earth with a weed or two:
stage 2 plants them. Trees are registered in the world's tree registry as `holm-oak` (the grey scrub oak),
`common-juniper` and `stone-pine`.

## What lives there, and why

`src/content/regions/telemonia/telemonia-wildlife.js`: three ranges, six animals. **The lore names no wild animal in Telemonia at
all** - only the kingdom's cattle and horses, which are stage 2's - so all three come from the two built
neighbours in the same dry belt and from the fauna overview's East Pyros:

| range | animals | where | why |
| --- | --- | --- | --- |
| `telemonia-galmeth-hares` | upland hare x 4 | the Galmeth's open south-east, 130 x 182 m, held off terrace walls by the rig's slope limit | extension, from both neighbours: the hare the Oves's grass and Gala's steppe have |
| `telemonia-galmeth-harrier` | harrier | quartering the plain east of the rock at 9 m, following the ground | extension, from both neighbours |
| `telemonia-rim-hawk` | plateau-hawk | 34 m over the western rim and the Rothkar | the overview's dry-plateau hawk, densest on East Pyros's rocky east-facing slopes - the far side of this rim: not an extension |

**No boar in the Belketh, and it is a measurement.** Gala's maquis and the Ascarth's oak wood both have
boar, and the Belketh is the same kind of wood; but it stands on the rim's corner on ledges between cliff
bands, and the largest piece of ground in it a boar could stand and turn on is **620 m²** (a scan for
connected ground under one in two). The west's law wants a band to have room behind it to back off into.
Open, below. **Nothing domestic.** No vulture: the neighbours' bone-bird and turkey-vulture belong to the
desert margin, and the lore gives this country none.

The west's laws on the hares, in the country's own test: walked at and run at from all four quarters (the
west's own law asks one), never reached within 3 m walking or 1.5 m running, and never off their footing.

## The three fixes

- **`src/content/chapters/civil-war/campaign-world.js`, Telemonia.** `'wild'` with sand goblins and hill bandits became the kingdom:
  a polity **`telemon`** ("Kingdom of Telemonia", seat **Kethorn**), the region controlled by it, level 3
  kept, its climate line the dry rock highland, a settlement `kethorn`, and the role: "The closed kingdom of
  the Telemon: few passes through the rim, one town on a rock in the middle of the plain, and no wild
  threats, because every man in the country is under arms and nobody hunts in it. A traveler can get in by
  the passes and is challenged on sight." **The threats list is now empty** (builder's reading: a hill
  bandit in the Telemon highland is not something the lore allows); the panel then says "No wild threats".
- **`src/content/chapters/civil-war/campaign-world.js`, Gala.** `'pyrosi'` was the other Gala. The Lizeem's Gala now has a polity of
  its own, **`galan`** ("Gala", seat Gala), derived from `gala.md`: governed by its council and its Guild
  of Assessors, "under Aevis's suzerainty more often than not" - sometimes a garrison, sometimes a tribute,
  sometimes only a word - and the brokers of the Telemon's contracts. **A builder's choice**: the
  alternative is to give it to an Aevis/Ascarth polity, which the game does not have. The walled Pyrosi
  capital stays `SETTLEMENTS.gala` in West Pyros, untouched.
- **`src/gameplay/skills/languages.js`.** Kellith's `where` is now "Telemonia: the Galmeth and Kethorn on its rock, the rim
  and the passes through it, and the translators at the border markets", and `REGION_LANGUAGE.Telemonia`
  is `kellith`, no dialect. **Matt's tongue is left alone**: `ORIGIN_LANGUAGE.Zorkys` is still `kellith`
  and the tongue's `note`, which mentions him, is unchanged; that changes in a later job.

## The lore, adjusted to the atlas

**I did not touch the lore repository.** The rewrite of 2026-10-01 was read against the atlas and
**nothing in it disagrees with the atlas**. The rows the brief asked for - the old climate and treeline,
West Pyros to East Pyros, the Branch Court brokers, Legemum's northern border, and with them the Oves
Desert to the north and the bowl round one plain with no river inside - are in
`docs/lore-adjusted-to-atlas.md`, under "`telemonia.md`, `the_telemon.md` and `legemum.md`", each with
the atlas fact that forced it. (The diff was read with `git --no-optional-locks diff`; one plain
`git status` and one `git diff --stat` were also run in `world-builder` early on, which are read-only but
may refresh its index stat cache. Nothing was staged, committed or stashed there.)

---

## Registration

`scripts/build-region-survey.mjs` (PLAYABLE, and Telemonia's paragraph in the `WINDOW` ledger) ->
`node scripts/build-region-survey.mjs` -> `node scripts/build-region-rivers.mjs` (no change) ·
`src/world/terrain/region-layout.js` (PLAYABLE_REGIONS, one biome `telemon-highland`) · `src/world/terrain/region-world.js`
(REGION_IDS, REGION_TERRAIN, REGION_TEXT with ten landmarks) · **`src/content/regions/telemonia/telemonia-world.js`**,
**`src/content/regions/telemonia/telemonia-scenery.js`**, **`src/content/regions/telemonia/telemonia-wildlife.js`** (new) · `src/world/terrain/world-terrain.js` (the ground,
outermost of `groundBeforeFeradom` with the ground before it as `baseAt`; the tint row) · `src/world.js`
(scenery, sink, metrics, landmarks) · `src/content/regions/western-regions/west-regions-life.js` (the ranges) · `src/gameplay/movement/climbing.js`
(`CLIMB_REGIONS`, by name) · `src/gameplay/skills/languages.js` · `src/dev/tools/build-status.js` (`early`) ·
`src/dev/tools/developer-atlas.js` (one travel stop on (-13,120), its number read from `REGION_IDS`) ·
`src/ui/map/map-fog.js` (five chart areas, after Selemis's and before Peblos's) · `src/content/chapters/civil-war/campaign-world.js` ·
`src/main.js` (nine `telemonia-*` review views) · `tests/own-sky.js` · `tests/region-layout.test.js` (the
ledger) · `tests/southwest-world.test.js` (the tint guard's line) · `tests/chameleon.test.js` (`Telemonia`
joins `WITHOUT_ED`) · **`tests/telemonia-world.test.js`** (new, fifteen tests) · `package.json` ·
`docs/lore-adjusted-to-atlas.md` · this report.

Not touched: `src/world/terrain/region-levels.js` (already `Telemonia: 3`); `src/world/environment/region-sky.js` (a country declares its
sky in `REGION_TEXT`); `src/content/regions/western-regions/west-ground.js` and `src/content/regions/western-regions/west-regions.js` (the streams are joined, not
rebuilt).

### Where the number is written

- **`src/world/terrain/region-world.js`, `REGION_IDS`: `Telemonia: 53`.** The one place in the code.
- **Nowhere else in code, tests, views or chart rows.** The developer atlas row is
  `[REGION_IDS.Telemonia, 'Telemonia', 'telemonia', 'Telemonia', telemoniaAnchor]`; `CLIMB_REGIONS` holds
  the name only (every caller asks `world.regionAt`, which answers the region object, and the set is asked
  by `r.name`). `tests/telemonia-world.test.js` asserts the id is greater than Selemi's and equal to the
  country's place in `PLAYABLE_REGIONS`, and scans `src/` for the literal written beside the name.
- **`src/world/terrain/region-levels.js` says `'Telemonia': 3`** - that is its level, not its id.
- **In prose**: this section and the first paragraph above.

**At landing**: the number in `REGION_IDS`; the name's place at the end of `PLAYABLE_REGIONS` and of the
survey script's `PLAYABLE`, `src/dev/tools/region-survey.js` regenerated rather than merged; the developer atlas's
row moved to its place in id order; and the lists both branches append to put side by side (the `WINDOW`
ledger, the ledger in `tests/region-layout.test.js`, `REGION_TERRAIN`, `REGION_TEXT`, `REGION_BIOMES`,
`GROUND_TINTS` and its guard, `OWN_SKY`, `WITHOUT_ED`, `CLIMB_REGIONS`, `WEST_LIFE_ZONES`, `package.json`).
`telemoniaGround` is outermost of `groundBeforeFeradom` and can stay there whatever else lands: it writes
only on Telemonia's own hexes.

**Line endings.** Every line added takes the ending of the line it was put beside, and no existing line's
ending changed (checked file by file against `HEAD`).

---

## Tests

Every file was run alone with `node --test tests/<name>.test.js`, one process at a time, never two at
once. **`npm test` was not run and the full suite was not run.** Thirty-one files were run on the branch.
**Every red file is red in the same tests with the same messages as `docs/known-failing.md` lists for the
base**; nothing was red that is not on that list, so no file had to be run on the base itself.

**When each was run.** *after*: after the one change made after the review render, which draws the
country's ground 9 m past the border (`TELEMONIA_PATCH_REACH`; The review render) - nothing reads that but
the ground mesh, and the one test that reads the mesh's numbers is `telemonia-world`'s. *final*: on the state
the review render was taken from, every file under `src/`, `scripts/` and `tests/` as it is now but for that
change. *wall*: before the change before that, which moved the two ends of Kethorn's wall half a metre
further over the cliff's lip (`KETHORN_WALL`, 1.3 m over the edge instead of 1.8 m and then 0.8 m) and
fixed a comment; nothing in those files reads the wall. The test file the change was made for, `telemonia-world`, was run
after it.

| file | result | run | against the base |
| --- | --- | --- | --- |
| **`telemonia-world`** (new) | **15 / 15** | after (and 15 / 15 at final) | - |
| `region-layout` (the world-size guard, the ledger, PLAYABLE order) | 8 / 8 | wall | |
| `region-survey` | 4 / 4 | wall | |
| `region-sky` | 6 / 6 | wall | |
| `eer-world` | 12 / 12 | wall | |
| `map-fog` | 7 / 7 | wall | |
| `developer-atlas` | 7 / 8 | wall | known: "local destinations stand on their own authored regions ..." - `one stop per playable region, in order`; the diff is Yunethre's row, as on the base, and Telemonia is last in both lists |
| `languages` | 15 / 16 | wall | known: "every region on the atlas has a tongue ..." - `East Ibenwood has no tongue` |
| `cartography` | 13 / 13 | wall | |
| `campaign-world` | 6 / 7 | wall | known: "describeRegion merges design with the survey ..." - `Expected values to be strictly equal:` (40 !== 39, Drent's hexes) |
| `gala-world` | **11 / 11** | wall | 10 / 11 before the one line changed in it (found on the way, 2): "the steppe stands higher than the coast ..." - `and the Mediterranean rows are no higher than the coast by much`. **Not on the known list: this was mine**, and it is the one change made to another country's test |
| `oves-world` | 13 / 13 | wall | |
| `open-country` | 5 / 8 | wall | known: all three `(-2530, -220) ... Yunethre` |
| `chameleon` | 6 / 7 | wall | known: `one per region he visits, and two in open country` (19 !== 49). `Telemonia` joins `WITHOUT_ED`, so registering it does not move the number |
| `ibenwood-metadata` | 5 / 5 | wall | the chart areas are ahead of Peblos's, as Selemis's are |
| `south-oremindi-metadata` | 5 / 5 | wall | |
| `yunethre-world` | 8 / 8 | wall | |
| `southwest-world` (the tint guard's line) | 34 / 34 | wall | |
| `climbing` | 21 / 21 | wall | |
| `nobody-sealed-in` | 6 / 6 | wall | |
| `drawn-ground` | 0 / 4 | wall | known: the same four tests, `RangeError: Maximum call stack size exceeded` and `TypeError: Cannot read properties of null (reading 'toFixed')` x 3 |
| `west-rivers` | 5 / 5 | wall | |
| `tree-registry` | 4 / 4 | wall (or final: the change landed while it ran) | |
| `places` | 7 / 7 | final | |
| `quest-destinations` | 3 / 3 | final | |
| `selemis-world` | 15 / 15 | final | |
| `trogo-undergrowth` | 8 / 8 | final | |
| `feradom-world` | 14 / 14 | final | |
| `regions-world` | 8 / 9 | final | known: "District scenery batches ..." - `Terrain tiles share one vertex buffer` |
| `regional-wildlife` | 7 / 8 | final | known: "previously empty regions have distinct modest populations ..." - the diff is Iscare, as on the base |
| `west-life`, two tests by `--test-name-pattern`: "no band is given a range it can run out of the reach of" and "live wildlife positions ..." | 2 / 2 | final | |

How long they took, for planning: the world-building files 2-5.5 minutes each on this machine
(`telemonia-world` 4.2-5.3 min, 4.8 min the last time; `chameleon`, `eer-world`, `gala-world`,
`oves-world`, `nobody-sealed-in`, `drawn-ground`, `places`, `selemis-world` and the rest 2.2-3.4 min,
`regions-world` 5.1 min); the files that do not build the world under five seconds.

**`tests/telemonia-world.test.js`** holds: the atlas's 25 hexes, the ring and the one inland hills hex,
the four neighbours and the unbuilt ones' names against the atlas, no river inside; the climate against the
World Builder map and the sky against the Oves Desert's; the box and the window; the border handed back to
the neighbours, no up-step leaving the country, the pass mouths meeting the far side, both streams falling
and unburied, the Caelin's join; the Galmeth's level and height over every neighbour, the rim's crest, the
Rothkar the highest ground and on the inland hex, the ridges on the grain; **the walking flood** (passes
open, passes shut, each pass alone, the high rim); **nobody sealed in** on the rim, the basin and the rock;
Kethorn's height, cliffs on seventy-odd bearings, the spur walked, the wall's colliders, the gate open and
shut, the level top; the three passes walked and walled; the terraces' steps and walls and twenty-four
stairs walked; the washes dry, falling and empty; what grows and that nothing is anybody's; the wildlife
on its ground and the walk-and-run law from four quarters; the chart, tongue, polity, travel stop and
names; and that the number is written in `REGION_IDS` and nowhere else in `src/`.

**What was not run, said plainly.** The full suite and `npm test`. `west-life`'s chase laws ("nothing in
the west can be walked down", "the quick ones cannot be run down either", "a chased band is home again"):
they stop at their first failing band on this base (`docs/known-failing.md`), so they would not reach
Telemonia's; the walk-and-run law is applied to the hare range in the country's own test, and **the
"home again" law is not applied to it anywhere**. Of the repo's other test files, none that I know reads
Telemonia; the countries round it that were not run are `ascarth-world`, `isareos-world`,
`nethereum-world` and the rest of the west, none of which touches it.

---

## The review render

**One launch, after the last change but one** (the one after it is below):

```
node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=telemonia-galmeth,telemonia-kethorn-gate,telemonia-kethorn-cliffs,telemonia-terraces,telemonia-tarnel,telemonia-east-pass,telemonia-rothkar,telemonia-belketh,telemonia-rim"
```

290 s from launch to exit (4 min 50 s), exit 0, `"errors": []`. Nine pictures, 1440 x 960, in
`tests/artifacts/telemonia-*.jpg`. After the last picture was written Chromium logged one line, `GPU state
invalid after WaitForGetOffsetInRange`, which did not stop it. I looked at every picture; where something
in one was not plainly what it should be, I built the world under node and asked three.js what that pixel
shows (a raycast from the view's own camera), rather than guess.

| view | what it shows | what is wrong in it |
| --- | --- | --- |
| `telemonia-galmeth` | From 125 m over the eastern rim, west across the whole plain: the Galmeth level and empty, the three washes curving round the rock, the rock in the middle with the wall and its two towers at the far end, the terraces stepping up the inner faces all round, the Rothkar standing over the western rim | **The rock reads as a drum**: its cliff is the same height all the way round, smooth and fluted, with no courses in it, so from above it looks turned rather than broken. The washes read from the air as pale tracks |
| `telemonia-kethorn-gate` | On the spur, looking up at the gate: the wall crenellated, the two roofed towers, the gate open with the top's ground through it, the rock's flanks falling away past both ends of the wall | nothing |
| `telemonia-kethorn-cliffs` | From the plain south-east of the rock: twenty metres of cliff, grass on the lip, the wall and towers at the far end, fallen rock at the foot, terraces behind | the drum again: one height, no strata |
| `telemonia-terraces` | The south-western belt from close in: seven courses walled in dry stone, a stair cut straight up through them, the inner cliff above | the walls are a row of separate blocks with the ground dipping in a sawtooth behind each; they read as walls, not as a finished dry-stone face |
| `telemonia-tarnel` | From the Oves Desert up the gorge: the cliff-banded ridges either side, the floor rising to the col, the plain beyond and Kethorn's wall on its rock in the distance | where the terrace belt meets the gorge's left wall a few wall blocks stand in a jumble |
| `telemonia-east-pass` | From Gala up the gorge: the banded walls, the floor climbing between them | **a pale green-grey cone on the left, by the Treloss.** The raycast names it: one of the ten legacy backdrop "mountains" in `src/world.js` (`mountainMat`, `#849b83`, `ConeGeometry` 54-86 m in radius, placed by `at(-880 - (i % 5) * 46, -160 + i * 92)`). Number 9 stands at (-1900, 1170) on Gala's side of the border; number 8 at (-1818, 1006) in the Oves Desert. **Not mine and not changed**: it is on the base, on Gala's ground (Found on the way, 8). The gorge's left wall is a thin fin near the mouth |
| `telemonia-rothkar` | From over the rock, west at the Rothkar: the stepped peak on the western rim, East Pyros's unbuilt open country beyond with a lake and a river | a darker streak down the face under the peak: the raycast puts it on this country's own ground, on the head of the west gully, whose walls are coloured as scree; from here it reads as a smudge |
| `telemonia-belketh` | The south-eastern corner: holm oak and pine standing on the ledges between the cliff bands, dark scrub under them | nothing; it is as thin as the numbers say (What grows) |
| `telemonia-rim` | From the Oves Desert at the foot of the northern outer face: six to eight cliff bands one above another, ledges with stone and the odd juniper, the Rothkar beyond | **specks of sea at the foot of the face.** Fixed after the render, below |

**The one change after the render: the trench outside the border.** The raycast through the specks in
`telemonia-rim` went in under the ground four metres outside the country and came out on the sea plane at
0.1 m. The world's 7.1 m grid is sunk under this country from 1.5 m inside the border, and a sunk corner
tilts its whole cell down - out to 8.5 m outside the border, where this country's own ground was not drawn.
Measured against the true ground, sample by sample with both grids as the world builds them: **a trench
along the outside of the country up to 17 m deep (by the Gala border), 447 m² of it deeper than a metre and
35 m² under the sea**. A traveler walking there would have stood on the ground (`heightAt` was never wrong)
over a hole in the picture of it. The fix is one rule in `src/content/regions/telemonia/telemonia-scenery.js` and one constant,
`TELEMONIA_PATCH_REACH` (9 m), in `src/content/regions/telemonia/telemonia-world.js`: the country's ground is now drawn out to 9 m
past the border, over every cell with a sunk corner, and out there it is the neighbours' own ground in their
own colour. Measured again: **no trench anywhere** (none deeper than 0.3 m, nothing under the sea).
Inside the border, where the world's grid is not sunk (the first 1.5 m), it stands above this country's
ground by more than 0.3 m over 48 m² of the 2.2 km border, by 1.2 m at most: it shows as ground, not a hole.
**This change was not photographed**; `telemonia-world` was run again after it (Tests).

---

## What stage 2 will need to know

**The rock (`KETHORN`, `kethornFrame`, `kethornPoint`, `onKethornTop`, `topOutside`).** Every number about
the rock is in its own frame: `u` metres along it toward the south-west (the spur), `v` across it.

- **The usable top is 4,247 m²** inside the cliffs and behind the wall, 49.7-52.2 m; 4,055 m² of it
  pitches under one in ten. It is a crag's outline about an ellipse 92 m long and 58 m wide on the
  north-east/south-west grain (its edge between 0.91 and 1.14 of that ellipse round the cliffs, with nine
  buttresses), narrowing to the neck at its south-west end. The faces come down in three bands with ledges
  about 1.9 m wide between them: a building set back from the lip has the ledges below it, not under it.
- **Nobody climbs the rock** (`kethornUnclimbable`, read by the climbing rule through `world.unclimbableAt`):
  the gate is the only way onto the top, for a climber as for a walker. Anything placed on the rock for
  stage 2 is inside that line; anything that ought to be climbable there would need the mark lifted.
- **The gate** is at (-2126.9, 1268.3) in the middle of the wall across the neck, `u` = 36-38. It is open;
  the gate towers and the wall are built and solid. Whoever is nearest the gate is the gate: no
  gatehouse was built, because the lore has none.
- **The king's hall**: the north-eastern end, the highest ground of the top (51.9 m at `u` = -40, about
  (-2071.7, 1213.2)), over the cliffs that face both passes and furthest from the gate. "Distinguishable
  from the others mainly by where it stands."
- **The band halls**: along the north-western and south-eastern sides of the top (for instance
  `u` = -5, `v` = ±18: (-2083.7, 1250.6) and (-2109.2, 1225.2)), long on the rock's grain, leaving the
  middle for the granaries and the cisterns and a way from the gate to the king's end.
- **The spur** below the gate is 72 m of walked slope (steepest 0.36) from the plain at (-2176.4, 1317.8).
  It has cliffs down both sides.
- The top is clear: no tree or solid stone was put on it, and the scatter keeps 16 m round the gate clear.

**The fields.** The Galmeth's open ground is 48,471 m² clear of the washes, the rock's apron and the way.
**The washes are not to be built in** (`WASHES`, `washWeight`): 7,760 m² of them across the plain, and they
meet at the east pass's head. The terraces are 31,108 m² of belt in seven courses (`telemoniaPlace(x, z).terraced`), their
treads bare earth about 4.2 m deep; the stairs (`stairDistance`) are the ways up and should stay clear.
"The plain is farmed to its edges, and where the plain ends the terraces begin."

**The high place.** The three seasonal ceremonies are "held in the open and within sight of the Rothkar".
From the ground the rock's top is in sight from the **eastern half of the Galmeth** and its north edge,
and from the rock's own top, but not from the western and south-western plain, which lies under the
western rim's inner cliff. The Rothkar's summit itself is a flat top about 14 m across at 92.7 m, reached
only by climbing. **The way's landing** at its foot (`ROTHKAR_WAY`, the last station; about 70 m² of level
floor at 59.8 m, ringed by the lip) has the rock's face in sight to the edge of its summit and nothing
between: the natural place for the ceremonies, if they are to be at the rock.

**The rim is walked onto by one way.** The Rothkar way (`ROTHKAR_WAY`, `wayAt`, `onWayFloor`) climbs from the
Galmeth's western edge at (-2172.7, 1369.3) up the terraces and across the inner cliff to its landing at
(-2243.7, 1326.3), 104 m at about one in four, 3.2 m wide; over the crest and round its landing it is walled
in rock, so from it the only walked way is back down. The rest of the rim above the cliff foot is reached only
by climbing. The lore's "hill pastures" for the cattle and the horses and the bands' training runs would want
the landing opened onto the crest - which would also let a walker leave the country over the western rim a
cliff band at a time (the polish). That is a design decision (open, in the polish).

**The passes** are the only ways in on foot. Their mouths: the Tarnel at (-2150.0, 1039.4) on the
Oves's southern route; the east pass at (-1850.4, 1077.8) on Gala's (-10,118), between the Caelin's
handover and the Treloss's head; the south pass at (-2125.0, 1457.8) into Legemum. **The border markets**
("meeting points at the highland's edge, operated by traders from Gala and Legemum") would stand outside
these mouths, on Gala's, Legemum's and the Oves's ground - other countries' builds.

**The rules a builder there inherits.** Telemonia is climbing country: anything steeper than 0.9 cannot be
walked up, and anybody placed must have a walked way out (`tests/nobody-sealed-in.test.js` and the
country's own test both look). The world's ground grid is sunk 60 m under the country and its own ground
is drawn 1.5 m apart and 9 m past the border (`telemoniaTerrainSink`, `TELEMONIA_PATCH_REACH`,
`src/content/regions/telemonia/telemonia-scenery.js`); `world.heightAt` is the authority. Anything that sinks the grid further in
must draw the ground over every cell it tilts (The review render). Kethorn's rock is the one place in the
country no climber can hold (the climbing rule's `climbForbidden`); the way's lip and walls are ground, not
colliders. Collider kinds in the country: `telemonia-tree`, `ridge-rock`, `kethorn-wall`, `kethorn-tower`.
The travel button sets a traveler down on the plain north-east of the rock, (-2016, 1196).

---

## Found on the way

For the coordinator. Nothing here was changed unless it says so.

1. **The brief's "seventeen `hills` on every edge"** is one hex out: (-16,121) touches no border (the test
   holds it, and the Rothkar stands on it).
2. **`tests/gala-world.test.js` had a 0.09 m margin that was unbuilt `outland`'s.** "the steppe stands
   higher than the coast ..." asserts that Gala's `Csb` rows are no more than 1 m under its `Csa` row. On the
   base they were 0.91 m under, and 1.2 m of that hung on outland's roll at (-11,120) - six metres on a
   150 m wave across Gala's western border. Telemonia's profile is on Gala's own 320 m wave (it has to be:
   the Oves's ribs test fails otherwise) and the bump went with it, whatever the profile's level or roll
   (scanned: 9-12 m, 0.8-4 m of roll, all -1.19 m). **The one line of somebody else's test I changed**:
   the margin is 1.5 m, with the reason written above it.
3. **Three build-status texts are stale**: Gala's, Ovesos's and the Oves Desert's `work` lines still say
   "Telemonia ... open country" or "not on the playable atlas". They are their countries' and were left.
4. **The world's hex blend steps along hex edges** (`terrainMix` uses a hex and its six neighbours, so the
   set changes at each edge). It is what Feradom's `feradomSeam` and the Suvals' blend correct on their own
   ground, and it was the cause of the pockets on this country's border. This country corrects its own side
   (`seamLift`, `seamlessDelta`); the far side's own steps are left, and where two of the far side's hexes
   meet the border at one corner no single height on this side meets both - within six metres of such a
   corner a step up of 0.12-0.23 m can be left on the way out. Nobody is sealed by it (the flood says so):
   a pace along the border it is gone.
5. **The Caelin's join with Gala's reach** falls 0.44 m now against 0.12 m on the base (the Oves's test
   allows 0.6). Any profile on the 320 m wave moves it; 10 m was the level that kept the most margin.
6. **`CLIMB_REGIONS` asks names and ids both**, and the name is enough for every caller in the game
   (`world.regionAt` answers a region object). A caller that hands it a bare number would not find
   Telemonia; none does.
7. **The developer travel table** (`src/dev/tools/developer-mode.js`) has no point for `telemonia` and falls back to
   Drent's, as it does for Selemis and every country since Feradom.
8. **Two of the world's ten legacy backdrop cones stand on the neighbours' ground at this border.**
   `src/world.js` still draws the "mountains" of the first small world (`mountainMat`, `#849b83`, a 7-sided
   `ConeGeometry` 54-86 m in radius and 12-26 m high on y = 6, no collider), at
   `at(-880 - (i % 5) * 46, -160 + i * 92)`. Number 9 is at (-1900, 1170) on Gala's side of the border by the
   Treloss, and its skirt shows as a pale green-grey tent in `telemonia-east-pass`; number 8 is at
   (-1818, 1006) in the Oves Desert, by the east pass's mouth. The other eight are in Vastos, Meneth,
   Caricas, Nesdor and Ovesos. They are on the base and on other countries' ground, so I left them. Taking
   them out of built countries needs the loop to keep drawing its `range()` numbers, or every later thing
   in the world's seeded stream moves. **Done in the polish, at the user's word: all ten stood on built
   countries and none is drawn now.**
9. **Feradom sinks the world's grid the same way** (`feradomTerrainSink`, its own ground drawn 3-6 m past
   `hillRise > 0`). Whether it has the trench this country had depends on how fast its hills rise at
   their foot; **I did not measure it**. Specks of sea along the foot of its hills in a review picture would
   be the sign.

---

## Open decisions for the user

1. ~~**Should the cliffs be climbable?**~~ **Decided by the user, 2026-10-02**: the rim stays climbable (a
   climber can come over it - reaching the city unseen should be possible and hard); Kethorn's rock and its
   wall are not, and the gate is the only way onto the top. Done in the polish.
2. **Three passes**, the third toward Legemum; none toward East Pyros. The brief required two.
3. **Kethorn's open side faces south-west**, away from the passes; its top rises to the north-east, where
   the king's hall would go.
4. **The Galmeth drains east through the east pass** to the Treloss's head; the other two passes climb to a
   col.
5. **Walked ways up onto the rim**: one built in the polish, the Rothkar way, walled so it goes onto the rim
   and not out over it. Whether its landing should open onto the rim's ledges for herds and the bands is
   the polish's open decision 1.
6. **The heights**: plain 30 m, crest 52-66 m, the Rothkar 92.7 m, the rock 20 m over the plain.
7. **The name Tarnel** on the north pass (the profile's last free candidate). The east and south passes
   are plain English.
8. **No boar in the Belketh** (620 m² of turning ground at most); no land animal on the rim. The terrace
   leopard of West Pyros's terraced slopes and East Pyros's spine lizard and road fox would want rigs the
   game has not got.
9. **Telemonia's campaign entry has no wild threats** now; **the Lizeem's Gala is its own polity**
   (`galan`) rather than Pyros's or an Aevis polity the game does not have.
10. **The sky is the Oves Desert's.**
11. **The Rothkar is out of sight from the western plain** under the western rim; if the ceremonies are
    to be held there, the inner cliff on that side would want to be lower or the ground further out.
12. ~~**How Kethorn's rock looks.**~~ Done in the polish: a crag with three bands and buttresses, and
    coursed, capped terrace walls. See also the polish's own open decisions, at the end.

---

## Polish, 2026-10-02

The user looked at stage 1 and asked for five things before it is committed (relayed by the coordinator):
make Kethorn's rock a crag, give the terrace walls a finished face, make the rock unclimbable, take the old
backdrop "mountains" off built ground, and build a walked way up onto the rim. All five are done, in the same
worktree, uncommitted. Numbers elsewhere in this report that these changes moved have been updated in place.

**Files.** `src/content/regions/telemonia/telemonia-world.js` (the crag, `kethornUnclimbable`, the way, the terraces' landmark moved
off the way), `src/content/regions/telemonia/telemonia-scenery.js` (the walls, the ledge stones), `src/gameplay/movement/climbing.js` (`climbForbidden`),
`src/world.js` (the cones; `unclimbableAt`, `backdropMountains`), `src/main.js` (`unclimbableAt` into the
climbing world; the `telemonia-way` view), `src/world/terrain/region-world.js` (the way's landmark in Telemonia's list, a
clause in its description), `tests/telemonia-world.test.js`, `tests/climbing.test.js`, this report. Each
file's line endings are as they were (the three mixed ones checked line by line against `HEAD`). Nothing
committed, pushed or stashed; no other checkout touched.

### 1. Kethorn's rock is a crag

`KETHORN`, `edgeRadius`, `cragFace` (src/content/regions/telemonia/telemonia-world.js).

- **The outline** is the old ellipse broken by a wobble of six harmonics and five buttresses
  (`OUTLINE`, `BUTTRESSES`): walked round in the ellipse's own measure the top's edge now stands between
  0.91 and 1.14 of it, with nine buttresses round the three cliff sides.
- **The faces** come down in three bands of cliff with a ledge between each and a ledge at the foot:
  on every one of 119 bearings round the three cliff sides there are three bands, each 5.5 m high (p10 5.2, p90 6.0), with ledges 1.9 m wide between them (p10 1.3, p90 2.5), over 4.5-12.6 m of face (median 6.7). Every band stands at five or six in one; every ledge falls outward to the next band (a tread
  takes 5% of its course's rise), so a walker who drops onto one goes on down.
- **The talus** is an apron 2.4-4.5 m high round the foot, as wide as 10-16 m, with stone on it and on the
  ledges (non-solid: 53 stones and some grass on the ledges, and the fallen rock the cliff-foot rule finds).
- **What stage 2 depends on is where it was**: the top is 4,247 m² (it was 4,122), 49.7-52.2 m, 4,055 m² of it under one in ten (it was 3,964); the spur,
  the neck, the wall and its gate are not moved - the crag's outline and courses fade out between 35 and 57
  degrees from the spur end (`cragShare`), and the wall's two ends stand on the plain cliff they stood on.
- **It still stops a walker**: on 72 bearings round it the ground falls more than 14 m inside 12 m of the
  top's edge, and on more than four in five (the test asks it) of the bearings round the three cliff sides it comes down in courses (band,
  ledge, band); with the gate shut none of the top is walked onto, with it open all of it is; nobody is
  sealed on a ledge (the floods).

### 2. The terrace walls have a finished face

`src/content/regions/telemonia/telemonia-scenery.js`, "The terraces' walls, the gullies' check-walls and the Rothkar way's parapets".

- **One wall per course line**, not a block per lattice step: each riser's line is traced over the
  lattice (marching squares on the belt's own coordinate, the middle of the riser of course k at (k + .92)
  courses over the plain) and laid as one continuous face at the riser's foot, its cap on the upper tread.
- **The face**: courses about 45 cm high of stones of their own lengths (0.6-1.3 m), the joints broken from
  course to course, each stone a finger's breadth proud of or back from its neighbours and its own shade of
  the rim's stone; a paler cap that overhangs the face 5 cm; squared ends. The face's foot follows the
  ground and runs 30 cm into it; the top follows the tread it holds.
- **It stops where the ground is not that terrace's** - a stair, a pass (4 m short of its floor), a gully,
  the way, the rim's outer face - and ends there squarely. **The jumble in the Tarnel is gone**: the old
  blocks were turned by the ground's gradient, which near a pass's wall points into the pass; the new walls
  follow the belt's own line and stop short of every pass. No wall stone stands on a pass's floor (tested).
- **181 walls, 5,461 m** (they average 30 m), 43,362 stones; **24 check-walls**, one
  straight across each step of the two gullies' floors (there were 120 blocks). Drawn from their own seeded
  stream; all the walls are about 111 thousand triangles in one mesh per 128 m tile.

### 3. Kethorn's rock cannot be climbed

**Inside the climbing rule's own shape.** `src/gameplay/movement/climbing.js` already reads the world for everything it
decides - its height, its region, its colliders, `canClimbMove` - and now reads one more thing,
`world.unclimbableAt(x, z)`, through one function, `climbForbidden`, in the two places the rule decides
whether a hand can go somewhere: the surface a grab looks for (`sampleClimbSurface`: no `allowed`, no
`climbable`) and every attached step of a climb (`move`). Walking (`canWalkSlope`), falling and sliding are
untouched: a walker still cannot walk up the rock, and anybody who steps off it still comes down.
`src/world.js` answers it with `kethornUnclimbable` (src/content/regions/telemonia/telemonia-world.js: everywhere the rock stands off
the plain - its faces, ledges and talus, the spur and its sides, the top and the wall on it), and
`src/main.js` hands it to the climbing controller with the rest of its world. The rim is untouched: a climber
can still come over it, which is what makes reaching the city unseen possible and hard.

**Measured with the game's own check** - `sampleClimbSurface` and `createClimbing().probe` / `grab` /
`tick`, on a climbing world built as main.js builds it, and the same world without the mark beside it. The
numbers below are from a run outside the test on the drawn ground with the wall's colliders (no trees or
stones, which the rock has none of anyway); `tests/telemonia-world.test.js` asserts the same things on the
built world with every collider - no hold and no grab anywhere on the rock or its wall; without the mark,
more than 800 m² of hold and more grabs than there are stands (each is tried three ways); three or more bands
of the outer rim that give a hold, and a climb from one that gains more than 2 m:

| | with the mark | without it |
| --- | --- | --- |
| square metres of the rock (12,312 m²) giving a hold (`sampleClimbSurface`) | **0** | 1,287 |
| grabs (`createClimbing().probe`) from 877 places at the foot of every band, every ledge and the spur's sides, facing the rock and 30 degrees either side | **0** | 2,594 |
| grabs facing the wall from the spur, either side of the gate | **0** | - |
| bands of the outer rim above the Oves Desert giving a hold | 12 of 12 | |
| a climb from one of them, level 1, full stamina | gains a 5.6 m band and crests it in 3.1 s | |

`tests/climbing.test.js` holds the rule on its own ground: a marked face gives no hold, a climb below it
stops at the mark, walking up it is still refused and a faller still slides down it.

### 4. The backdrop mountains are gone from built ground

`src/world.js` drew ten green cones (`mountainMat`, `#849b83`, 54-86 m in radius) on the horizon of the first
small world. Checked against the built countries with `regionAt` / `isOpenCountry` over the whole of each
cone's footprint (its middle and two rings at half and full reach): **all ten stood on built countries**, so
**all ten went and none stayed**:

| number (the loop's `i`, as numbered before) | where | country |
| --- | --- | --- |
| 0 | (-1571.4, -308.5) | Vastos |
| 1 | (-1653.6, -144.2) | Meneth |
| 2 | (-1735.7, 20.1) | Meneth |
| 3 | (-1817.9, 184.4) | Caricas |
| 4 | (-1900.0, 348.6) | Caricas |
| 5 | (-1571.4, 512.9) | Nesdor |
| 6 | (-1653.6, 677.2) | Nesdor |
| 7 | (-1735.7, 841.5) | Ovesos |
| 8 | (-1817.9, 1005.8) | Oves Desert, by the east pass's mouth |
| 9 | (-1900.0, 1170.1) | Gala, by the Treloss: the "tent" in `telemonia-east-pass` |

The rule stays in the code (a cone is drawn only where all of its footprint is open country) and the cones'
numbers are still drawn from the world's seeded stream, so nothing after them moved. `world.backdropMountains`
lists the ten (its `index` counts from 1). **No test counted them** (searched: no test names the colour, the material or the cones,
and the one test that reads the world's batching, `open-country`, checks a line that did not change); a new
test in `tests/telemonia-world.test.js` holds that none is drawn and that no mesh of their colour is in the
scene.

### 5. The Rothkar way

`ROTHKAR_WAY`, `wayAt`, `wayCut`, `onWayFloor` (src/content/regions/telemonia/telemonia-world.js); its walls in the scenery; a landmark,
"The Rothkar way"; a review view, `telemonia-way`.

- **Where**: from the Galmeth's western edge south of the spur's foot, at (-2172.7, 1369.3), slantwise up the terraces
  to the cliff foot beside the top of the 136-degree stair, then up across the inner cliff on a shelf cut into the face
  - half cut, half built out, as a hill path is - to a landing ten metres across on the ledge at the foot of
  the Rothkar, at (-2243.7, 1326.3), 43.3 m from the Rothkar's middle: there is nothing between a man on the landing
  and the rock. **104.3 m long, rising 28.9 m**, at about one in four (one in three through the terraces);
  its steepest half metre is 0.38. 3.2 m wide; the landing about 70 m².
- **How**: on the floor the ground is the floor; beside it, where the ground stands higher it is cut back in
  a wall at 2.4 in one, and where it lies lower the floor stands on a revetment at 6 in one, drawn as a
  dry-stone face (204 m of the way's walls in all, with the parapets). The terraces stop at its edges.
- **Up onto the rim, and not through it.** The ledge round the Rothkar's foot is one broad tread of the rim's
  strata that runs round the rock and out to the western faces. Measured before it was walled (a flood of
  my own on the drawn ground with the wall's colliders, the game's `canWalkSlope`): from the landing a walker went down the outer cliff bands of the western rim one drop at a time and out of the
  country - 150,028 m² of the outside reached with the passes shut, at a fall of about 5 m (about 9 points
  of damage) a band. So from 70 m along to its end, and right round the landing, the way is walled in rock on
  both sides: a lip 1.8 m over its floor with a crest 1.6 m across, which no walker steps up onto from the
  floor and nobody walks along from its end (it starts at its full height), faced on its inside with a
  dry-stone parapet and on its outside with the revetment. **Measured after** (the test, the game's own
  rule on the 1 m lattice with every collider): with the passes shut nothing inside the rim is reached from
  outside, as before; from anywhere on the way, with the passes shut, **no square metre outside the country
  is reached**; and of the high rim a walker from the Galmeth reaches the way and its landing and the west
  gully's head - which the plain reached before the way was built - and nothing else. Nobody is sealed in
  anywhere on it.
- **It moved one landmark**: the chart's "The terraces" stood on the line the way now takes up the belt, so it
  is now on the belt 14 degrees off the Rothkar's bearing instead of 20, below the way's shelf (`TERRACE_VIEW`).

### The numbers these changes moved

| | stage 1 | after the polish |
| --- | --- | --- |
| the country's own ground | 109,356 vertices | 109,356 (the same lattice) |
| Kethorn's top | 4,122 m² | 4,247 m² |
| the rock off the plain (lift over 0.2 m) | | 12,312 m² |
| the Galmeth's open ground | 51,804 m² | 48,471 m² |
| the terrace belt | 31,364 m² | 31,108 m² |
| terrace walls | 4,209 blocks over 6,314 m of riser | 181 walls, 5,461 m |
| check-walls | 120 blocks | 24 walls |
| bunch grass / wormwood / thorn / understory | 8,048 / 1,876 / 987 / 927 | 8,026 / 1,785 / 952 / 898 |
| trees: holm oak / juniper / stone pine (Belketh) | 61 / 11 / 20 (65) | 55 / 11 / 21 (60) |
| stone (of it fallen at a cliff's foot) / washed stones | 1,273 (199) / 512 | 1,372 (245) / 503 |
| landmarks | 10 | 11 |
| the Rothkar seen from the Galmeth (89-point lattice) | 42 points | 41 of 81 points (eight of the old 89 are now under the rock’s wider apron) |

The scatter moved because the ground it is scattered over did: the crag's apron and the way take ground it
used to stand on, and every candidate after the first that changes draws different numbers from the stream.

### Tests after the polish

Every file was run alone, one process at a time, **on the final state of every file** (the last code change
was made before any of them ran). **`npm test` and the full suite were not run.** Every red file is red in
the same tests with the same messages as `docs/known-failing.md` lists for the base.

| file | result | against the base |
| --- | --- | --- |
| **`telemonia-world`** | **18 / 18** (6.2 min) | - |
| `climbing` | 22 / 22 | - (one new test) |
| `region-layout` | 8 / 8 | |
| `region-sky` | 6 / 6 | |
| `map-fog` | 7 / 7 | |
| `cartography` | 13 / 13 | |
| `nobody-sealed-in` | 6 / 6 | |
| `climbing-world` | 6 / 6 | |
| `gala-world` | 11 / 11 | |
| `oves-world` | 13 / 13 | |
| `regions-world` | 8 / 9 | known: "District scenery batches ..." - `Terrain tiles share one vertex buffer` |
| `open-country` | 5 / 8 | known: the same three, `(-2530, -220) ... Yunethre` x 2 and `Expected values to be strictly equal:` |
| `tree-registry` | 4 / 4 | |
| `places` | 7 / 7 | |
| `drawn-ground` | 0 / 4 | known: the same four, `RangeError: Maximum call stack size exceeded` and `TypeError: Cannot read properties of null (reading 'toFixed')` x 3 |

**What changed in the tests.** `tests/telemonia-world.test.js` has three new tests - "Kethorn's rock cannot
be climbed", "the Rothkar way" and "the old backdrop mountains stand on no built country" - and three
changed: **Kethorn's** asks the fall from the top's edge inside 12 m instead of 6 (the face is now up to 12.6 m
deep) and adds the courses and the outline; **the terraces'** asks for walls (metres, number, average length,
stones, check-walls, nothing on a pass's floor) instead of more than 2,000 pieces; and **what grows** asks for
more than five of each tree kind instead of more than ten - **a weaker check, said plainly**: the scatter is
redrawn whenever the ground under it moves, and junipers came out at 9 in one state of the crag (they are 11
on the final ground; holm oak 55, stone pine 21). `tests/climbing.test.js` has one new test for the rule.
Nobody else's test changed.

**Not run, said plainly.** The world tests of the five countries the cones were taken out of (Vastos, Meneth,
Caricas, Nesdor, Ovesos): no test names the cones, their colour or their material, they had no collider, and
the one test that reads the world's batching code (`open-country`) is red only as on the base. The other
users of the climbing controller (`east-lotharn-peaks`, `west-lotharn-peaks`, `west-lotharn-traversal`,
`south-oremindi-world`): the rule acts only where `world.unclimbableAt` answers yes, which is Kethorn's rock
and nowhere else, and `climbing-world`, which climbs the real world, is green. `west-life`: no animal moved.

### The review render after the polish

**One launch, after the last change**:

```
node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=telemonia-galmeth,telemonia-kethorn-gate,telemonia-kethorn-cliffs,telemonia-terraces,telemonia-tarnel,telemonia-east-pass,telemonia-way"
```

285 s from launch to exit, exit 0, `"errors": []`, and the same one `GPU state invalid` line after the last
picture. Seven pictures in `tests/artifacts/` (`telemonia-way.jpg` is new); I looked at every one.

| view | what it shows now | what is still wrong in it |
| --- | --- | --- |
| `telemonia-galmeth` | the rock a crag in the middle of the plain: three bands of cliff with pale ledges, buttresses and bays, stone on its apron, the wall and gate on its far end; the Rothkar way a pale line climbing the inner face under the Rothkar | the washes still read from the air as pale tracks |
| `telemonia-kethorn-gate` | as before: the wall, the two towers, the gate open; the rock's flanks either side broken now | nothing |
| `telemonia-kethorn-cliffs` | three bands one above another, each with its ledge, buttresses standing out, fallen stone at the foot and on the ledges | nothing |
| `telemonia-terraces` | every riser a continuous wall of coursed stones of their own lengths and shades with a pale cap, ends squared at the stair; the way coming up the belt as a ramp with its revetment, and its shelf going on up across the cliff | the ground at the walls' feet: the country's ground lattice is 1.5 m and a riser 0.6 m, so the ground's slope is drawn wider than the riser and a sawtooth of it shows on the tread in front of each wall's foot |
| `telemonia-tarnel` | the gorge from the Oves Desert; no wall stone at the belt's end by the gorge's wall | nothing new |
| `telemonia-east-pass` | the gorge from Gala; **the green cone is gone** | the Treloss's dark ribbon along the hill's foot is Gala's, as before |
| `telemonia-way` (new) | the way from the plain: up the terraces, across the inner cliff on its walled shelf, round into its landing at the foot of the Rothkar, the stepped peak over it | nothing |

### Open decisions the polish leaves

1. **Should the way's landing open onto the rim?** As built it is walled, so from the way and its landing the
   only walked way is back down. The lore's "hill pastures" for the cattle and the horses and the bands'
   training runs would want the rim's ledges walked onto; opening the landing (or any way onto the crest)
   lets a walker leave the country over the western rim by going down its cliff bands a drop at a time -
   nobody comes in that way, but the passes would no longer be the only way out. The user's call.
2. **The way's route**: up the western terraces under the Rothkar, south of the spur's foot. A builder's
   choice; the lore names no way onto the rim.
3. **The rock's whole footprint is unclimbable**, including the talus and the top. Only its faces and the
   spur's sides needed it; nothing else on it is steep enough to grab, so the line was drawn round the rock
   rather than round its faces.
