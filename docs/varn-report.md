# Varn, and the Empire's forts on the Lotharn passes

## Main-build integration status - 3 October 2026

This report originated in Claude's `azhora-game-varn` worktree. The measurements in the original report (further down) describe that implementation and its original checks. This section and the next, "The user's three decisions", describe the main build as it was finished on 3 October 2026 in the same worktree (branch `varn-finish`, cut from main at `cfa4839`, left uncommitted for the coordinator); where they disagree with the original report, they are the truth.

The main build includes Varn, its wall garrison, the three pass forts, shut gates, shared masonry/no-climb rules, and the difficult slab climbing route. The review render of 3 October was taken after the last change and looked at ("The review render of 3 October", below).

**Validation on the finished code** (each file in its own process, `node scripts/run-tests.cjs <file>`): the region-scoped Varn suite passes **24 of 24 tests** (Node reported 160 s) and the scoped Lotharn-forts suite passes **13 of 13 tests** (310 s). The forts file is slower than it was (186 s): it floods Varn's whole reach three more times, and it asks the game's own functions where it used to ask the lattice (item 14 of section 10). Local geometry fixtures load the real relevant regions through the production fast loader, and the test runner executes heavy files separately to bound memory use.

**What was red on main at `cfa4839`, and what each red turned out to be.** Each was measured before anything was changed. The base for comparison was the clean checkout `azhora-game-land` at the same commit; the last two files were not named in the note of 2 October, and are red there with the same test names and the same messages.

| File on main | The red test, and its message | What it was | What was done |
|---|---|---|---|
| `varn-world`, 21 of 22 | "nobody steps off a jamb's top": `west-jamb reaches Amod behind the city, by any fall` (10,646 m², by a fall of 38.9 m off the rim at (-1267, -721)) | **The test's method.** The rims are built in treads and risers (0.7 m, 2.6 m and 3.7 m over the ledge). A lattice a metre apart, reading the face two metres across, took a diagonal step from the first tread onto the second - a rise of 1.28 m in 1.41 - and stepped off the far side. `canWalkSlope` refuses that step, and a traveler moved with `moveCharacter` is stopped at the first riser. With that take-off barred the lattice found five more like it in the next sixty metres of the same rim: it was the lattice, not a place. | The flood takes a step that crosses a riser in the game's own strides (`risers`, tests/lattice-flood.js). The assertion is unchanged. And a traveler with the game's own step and fall is now sent at that rim every three metres for forty, and held to it. |
| `lotharn-forts`, 11 of 12 | "open the gates...each alone": `varn-pass-gate open alone does not let a walker down to Amod, below Varn` (a fall of 34.8 m) | **Two things.** The lattice (1.5 m) has no point in the wicket (1.2 m; a body has 0.52 m of it): the method. But the fall it reported instead was **real**: 34.8 m off the south-west peak's first ledge at (-1418, -648), where the ledge has no brink and the rim rule built nothing. With the game's own step and fall a traveler slid off it and came down 40 to 45 m onto the Empire's ground, alive with anything over a hundred health. | The wicket is walked with the traveler's own step, both ways, and given to the lattice as a step out and never in; the assertion is unchanged and passes. The slide is closed in the ground, there and nowhere else: `LIP_STOPS` (decision 1, below). |
| `east-lotharn-peaks`, 4 of 6 | "four summits...": `eastern-peak's bald is walked, not climbed (1.71 at its steepest)` | The rim Varn raises on every brink within its reach stands round the eastern peak's bald too; the law measured the rim as if it were the bald. | The law passes over rim cells, with a note (the stopped agent's own edit, kept in `d219a2f`). The bald itself is held as before. |
| `east-lotharn-peaks` | "a traveler walks into a cave...": `eastern-high-chimney: never a step (1.75 m)` (and, behind it, the same of `eastern-chamber`) | **The ground.** Both caves open on shelves no wider than the rim: its inner treads stood in the caves' own doors. | No rim stands within two metres of where a cave's line comes out (`DOOR`, src/content/regions/varn/varn-world.js). What that leaves open is measured in decision 1, below. |
| `east-lotharn-world`, 11 of 12 | "nobody lives here yet...": `varn-slabs is not a place` | The chart lists the Slabs for the East Lotharn, which is the country they stand in; the range's test looked every listed place up in the range's own module, and the Slabs are described in Varn's. | The test looks in both. The landmark stays on the chart. |

Raising the rim everywhere was not tried again, and the fall rule is as it was.

**The measuring tool** (`tests/lattice-flood.js`) was changed in four places. Each replaces a reading of the lattice's with the game's own function, at a place the lattice's reading was found wrong by sending a traveler; none changes what any test claims.

1. **Risers.** Where the far end of a step stands more than 0.24 m higher on a rim than the near end (`risers: lipRib`), the step is taken in strides of 0.18 m, each asked of `canWalkSlope` - which is how `moveCharacter` takes it.
2. **A step off an edge**, inside Varn's reach (`riserReach: inVarnRock`), is taken the same way. The rim on a ramp's shoulder is a metre wide and lies between two lattice points; the lattice stepped over it from the tread and fell (44 m, 44 m and 52 m, off the eastern peak's fourth ledge path into Amod).
3. **The face half-way along a step up** is read as `canWalkSlope` reads it, forty centimetres either side, wherever the lattice's own reading is over half the walking grade. The lattice alone walked a climber along the eastern massif's first ledge on ground that tilts at 0.94 to 1.1, which the traveler's step refuses, to a fall of 41 to 45 m.
4. **A hand's move** is refused if the rock gives no hold at its quarter points, as the controller refuses it every twelve centimetres. The lattice climbed down from a ramp's tread to the face below it across the no-hold rim between.

And one tool was added to it: `travel(world, { x, z, heading, speed, seconds })`, one traveler moved as src/main.js moves him - `moveCharacter` with `canWalkSlope` and the closed-place rule, `shouldStartTerrainFall` after every frame, and `createTerrainFall` for the fall: its drift, its slide, its landing and what it costs.

**The neighbours, on the finished code.** One file at a time. A red is compared with the base, `azhora-game-land` at `cfa4839`, run the same way.

| File | Result | If red: the base |
|------|--------|------------------|
| `east-lotharn-peaks` | 6 of 6 | (4 of 6 on the base: the two reds above) |
| `east-lotharn-world` | 12 of 12 | (11 of 12 on the base: the red above) |
| `east-lotharn-cave-walk` | 9 of 9 |  |
| `west-lotharn-peaks` | 9 of 9 |  |
| `climbing` | 22 of 22 |  |
| `climbing-world` | 6 of 6 |  |
| `telemonia-world` | 18 of 18 |  |
| `map-fog` | 7 of 7 |  |
| `town-life` | 4 of 5, **1 red** | the same test and message on the base ("every new stand can be walked to...": `life-avrel-farmer cannot be reached from the road`); Avrel, not Varn |
| `nobody-sealed-in` | 2 of 6, **4 red** | the same four tests and messages on the base (the company's hired swords: `the sweep saw every phase a man is drawn in`, and three after it); nothing of Varn's or the forts' is in them |
| `amod-world` | 8 of 9, **1 red** | the same test and message on the base (`world bounds reach Amod's northern hills (-3899)`); in `docs/known-failing.md` |

The full suite was not run, as instructed.

**Files changed on 3 October**: `src/content/regions/varn/varn-world.js` (the stop; the caves' doors), `tests/lattice-flood.js` (above), `tests/varn-world.test.js` (every flood given the rims as risers; two tests added: "the stop", and "the game's own step and the game's own fall"), `tests/lotharn-forts.test.js` (the wicket; every flood given the rims as risers; one test added: "Varn's reach"), `tests/east-lotharn-peaks.test.js` and `tests/east-lotharn-world.test.js` (one line each, above), and this report. Nothing else: the fall rule, the climbing rule, `src/main.js`, the lore and every other country's source are as they were at `cfa4839`. No assertion that was there was rewritten or removed. Two were given something different to look at, and both are named in the table above: the bald law no longer counts rim cells as bald, and the range's list of places is looked up in Varn's module as well as its own.

Source provenance: imported from branch `varn` (originally cut from `land-all` at `01e0578`), including commit `05b71b1` and the later source HEAD `85aede18abd2c9f71bc472252a5b704971eb2085`. The source worktree was left untouched. A final dirty-file refresh was recorded at `2026-10-02T23:06:29-04:00`:

| Source file | SHA-256 at refresh |
|---|---|
| `src/content/regions/varn/varn-world.js` | `541f58168f036055928462b983995a1d3883fb1fb4b8277eb9fd5f445498e704` |
| `tests/varn-world.test.js` | `cdbfd8860949b2993307610006f9b7ae232791e3b744f4d50a650193b138ce1e` |

These hashes identify the imported source, before main-build fixture adaptations and before the work of 3 October. The stopped agent's later edits are kept in commit `d219a2f` (branch `varn`). Of them: the bald law's note was taken as written; reading the face as the game reads it was taken, and bounded; "the rim stops short of a cave's mouth" was taken at two metres instead of six, because at six it opened the eastern chamber's ledge, which is over Amod; and opening both of Varn's gates in the forts' "each alone" assertion was not taken, because it asks less of the wicket than the assertion did.

## The user's three decisions

> 1. There should be a very difficult climber's route. 2. All gates shut by default. 3. garrison the walls.

Asked about the survivable jump and the climb together, the user answered with the climber's route; the coordinator's reading is that **a hard climb is the only way round Varn, and no fall gets anyone past it.** What was built for each, and what was measured on the finished code:

### 1. One very difficult climber's route, and nothing easier

**Built.** The Slabs: two planes of rock against the east jamb's two free faces, ten metres wide, from a flat apron at 64 m to the landing at 128.4 m, at a grade of seven and a half (`VARN_SLABS`). Going south a climber goes up the north slab from the forecourt, crosses the landing, and comes down the south slab behind the city. Everything else is taken away: the mountain's own ground within Varn's reach (`VARN_ROCK`, x -1560 to -700: both massifs either side of the city, whole) gives no hold at any course but on the peaks' own ways and the slabs (`varnUnclimbable`), and every brink in it carries a rim no walker gets up (`lipRib`). The Slabs are on the chart (`varn-slabs`).

**Measured, the route** (the game's own controller and its own wind, `tests/varn-world.test.js`):

| | North slab | South slab |
|---|---|---|
| Height | 64.6 m | 64.2 m |
| Level 17, base wind (100) | crests in 23 s with 2.5 wind left | crests in 23 s with 2.9 left |
| Level 16, base wind | lets go 2.2 m under the lip, falls, 100 damage | lets go 1.8 m under the lip, 100 damage |
| Level 1 | lets go at 25.6 m, 100 damage | the same |
| Level 15 with toughness 20's wind (116) | finishes | finishes |

No wind comes back on a slab (no ledge, nothing under 31 degrees), so a pitch is one pool. A walker gets no part of either. Coming down a slab is cheap, as every descent is in this game; the difficulty is the ascent, and either direction has one.

**Measured, that there is nothing easier.**

- *Round the city, a metre apart* (`tests/varn-world.test.js`, x -1330 to -960): with the slabs' rock barred, a tireless climber from the pass has nothing of Amod behind the wall by any fall, and one from Amod nothing of the pass. He is on the east jamb's shelf by the eastern peak's first ramp, as before, and from the shelf there is no way on: not to the landing (a twelve-metre step that gives no hold) and not into Amod by any fall.
- *The whole reach* (`tests/lotharn-forts.test.js`, new: "Varn's reach"; both massifs and the ways up them, 1.5 m apart, flooded from the Col, Kemrath, Stonegate and Upper Olveth): a walker has 143,109 m² of the mountains and **none** of the Empire's ground, by any fall at all. A tireless climber with the slabs barred has 216,398 m² of the mountains and **none**. With the slabs as they are, the same flood puts the same climber in Amod below Varn with no fall at all - which is the check that the flood finds a way when there is one.
- *The eastern peak's first ramp, which was the easy way before.* It still starts at the forecourt and still keeps its hold, because it is that peak's only way up. It takes a climber of any level to the first ledge, the shelf and the summit. It no longer takes anyone down: every face off the ways is no-hold, the ways' own shoulders are rimmed, and both floods above start from the valley the ramp starts from.
- *By a fall, at any health.* A fall costs at most 100 and health runs to 400, so "survivable" means "possible at all": the floods count a way by **any** fall. Inside the reach there is none. One place was found where there was one - the forts' red test had been reporting it - and it is closed:

**The slide, and the stop** (`LIP_STOPS`, src/content/regions/varn/varn-world.js: the one thing added to the ground on 3 October; the one thing taken off it is the rim in the caves' doors, below). On the south-west peak's first ledge, over the hills between Varn and the Vastos Gate, between x -1420 and -1392, the ledge has no brink. It tips toward its edge at a grade of 0.94 to 1.2 for six or seven metres and then goes over, and the rim rule, which looks for gentle ground and then a cliff, read it as a ledge that slopes. With the game's own step and fall a traveler who walked south off the last gentle ground at (-1418, -648) slid to the edge and came down **42.2 m** (40 to 45 m, by where he left it), took the 100 a fall can cost, and walked on into Vastos and Amod. It is the place the first survey named, (-1426, -648): the rule's rim there stops six metres short.

A rim on the edge would have stopped the fall and kept the man (nobody walks back up 1.1, and the rock gives no hold), so the rim stands at the head of the slide instead: a ridge 3.2 m high and 2.5 m through, 40.5 m long, from (-1427.5, -648.15) to (-1387, -648.15), from the rule's own rim west of the slide to its rim east of it. The ledge either side was already two dead ends (the course above bulges out between them), so nothing that was walked to is cut off. Held three ways: by the plan (`the stop`), by the lattice (the reach, above), and by twelve travelers sent at it from both ends, walking and running, square on and slantwise - none past its line, none hurt, each able to walk away again - with the same traveler sent over the same ground without the lips to show what it was (42.2 m, 100 damage, alive at the bottom).

**The surveys.** Before and after the stop, both massifs were flooded a metre apart from every way up them (the south-west peak, x -1565 to -1255; the eastern massif, x -1108 to -700), each way found down was walked by a traveler with the game's own step and fall, its take-off was barred, and the flood was asked again until it found nothing. Twenty take-offs: six real, all of them the slide; fourteen the lattice's (the traveler stopped at the rim's first riser). After the stop: none real. A tireless climber with the slabs barred found the same twenty and no others. These were run from the scratch directory and are not kept as tests; the reach flood in `lotharn-forts` is what holds the result.

**The caves' doors.** No rim stands within two metres of a cave's mouth (`DOOR`, src/content/regions/varn/varn-world.js), because on a shelf no wider than the rim the rim stood in the door. On a ledge wider than its rim that changes nothing: the crest is still on the brink. On a narrow shelf it leaves the brink before the door open, as it was before there were rims. Eleven doors are inside the reach. Forty-eight bodies were set down at each and sent off on twenty-four headings, walking and running, and the ground was then flooded from wherever each first came to rest:

- At three doors nobody fell: the south-west chamber's, the western chimney's lower, the Olveth passage's southern.
- At five, bodies fell (29 to 34 of the 48), and none of the Empire's ground is come to from where they landed, by any further fall: the eastern low chimney's two, the western chimney's upper, the central chamber's, the Olveth passage's northern. They are over the mountains' own side.
- At **three**, the Empire's ground is come to. The eastern peak's high chimney's two doors (243 m and 285 m, on the massif's west face): a first fall onto the courses over the east jamb's back, and from there a second of 106 m. And its eastern chamber's (170 m, on the south-east face, over Amod): one fall of 92 m onto Amod's hills. A fall costs a hundred, so the first wants over two hundred health and the second over one.

**Superseded on 3 October 2026 (section 10): the high chimney is reached again by a climber's ledge, and all three of these doors are railed, so a body that steps out of one comes to none of the Empire's ground.** As first written: those three are no way past Varn only because nobody gets to them. Off the peaks' own ways the rock gives no hold, the shelves they open on are all rim, the chamber has one door and the chimney's two are both of this kind. The reach flood comes to none of the three - not a walker, not a climber who never tires, with the slabs or without, by any fall - and that is held (`lotharn-forts`, "Varn's reach"). It is a fact about what is built, not a wall: whoever builds a way to one of those caves must rail its door, and the test will say so. With the rim left in the doors, as main had it, the same three doors were as unreachable and the East Lotharn's own law of its caves was red.

### 2. Every gate shut by default

**Built.** One flag, `LOTHARN_PASSES_SHUT` (src/content/regions/varn/varn-world.js), `true`. Varn's Pass Gate, Varn's Amod Gate, and the gate of each of the three forts read it and nothing else. Varn is a closed place while it is shut (`VARN_CLOSED`, src/world/travel/closed-border.js), the way East Suval and Feradom are. The Amod Gate keeps a **wicket**: a door 1.2 m wide at the west side of the passage, where the row of colliders that shuts the gate stops short. The stone lets a body through both ways; the closed-place rule refuses the step in and allows the step out.

**Measured** (`tests/varn-world.test.js`, `tests/lotharn-forts.test.js`):

- All five shut: both of Varn's (`varnMetrics.shut`) and the three forts' (`lotharnFortsMetrics.shut`); no fort's passage can be stood in.
- From the pass, a walker has 532 m² of Amod - the forecourt before the Pass Gate - and nothing behind the wall by any fall; from Amod, nothing of the pass. A traveler walked at the pass front every two metres from jamb to jamb is stopped everywhere.
- The wicket from outside: a traveler walked at it with the game's own step is refused, and told so by nobody with a name. From inside: he walks out. Without the rule it is a door both ways, so it is the rule and not the stone that keeps it. A body has 0.52 m of it to stand in.
- Open the Pass Gate alone and a walker from the valleys is in Amod below Varn without a fall: in at the gate, down the street, out by the wicket. Open each fort's gate alone and he is in its own country. Open all five and every valley is walked to from below.
- **Nobody is sealed in.** From the market square a traveler walks out by the wicket and down every leg of the road to Amod's own. The forecourt opens back onto Kemrath. The ground inside the walls is one piece. From each of the eight valleys, gates shut, a walker walks out of the mountains by the pass road's northern end, and the yard behind each fort's gate opens onto its own country. The jambs' tops open onto the mountain's ledge (2,376 m² of the west jamb walked and 826 m² of ledge beyond it; 975 m² of the east shelf and 859 m² beyond). And the stop keeps nobody: each traveler sent at it walked away, five metres and more in two seconds.

### 3. The garrison

**Built** (src/content/regions/varn/varn-garrison.js): twenty-eight men-at-arms, the Empire's own `legion-soldier` in mail and plate under the red tabard, with one `legion-officer` on each keep - medieval, never Roman. They are entries in the game's one list of wall figures (`WALL_FIGURES`, src/world/life/town-life.js), drawn and animated within ninety-five metres by the one watch that already mans the army's outpost, Elod's frontier and Feradom's pass castles.

| Place | Men | Where |
|---|---|---|
| **Varn** | 15 | The Pass Gate: one on each of its two towers, one on the gallery between them, two on the ground inside the leaves. The pass front's wall-walk: two, **walking** (the west corner tower to the first wall tower; the gate's east tower to the next). One on the tower in the middle of each long side. The Amod Gate: one on each tower, one on the ground inside, at the wicket. The officer on the keep's battlements. One at each jamb's watch turret, by its beacon. |
| **The Vastos Gate** | 5 | One on each gate tower, one on the ground inside the gate, the officer on the keep, and one **walking** the wall between the gate's western tower and the tower before it. |
| **The Meneth Gate** | 4 | One on each gate tower, one inside the gate, the officer on the keep. |
| **The Reach Gate** | 4 | The same. |

Three of them walk; the rest stand. Nobody has a name, a line or a stake (held by test: no `name`, `lines` or `holds` on any of them). They do nothing toward the traveler that a wall figure did not already do, which is nothing: they are not spoken to and they do not fight. The one new thing a wall figure can do is walk a stretch of wall (`walk`, `patrolAt`). The lines a traveler is shown at the shut wicket are the closed-place rule's, as East Suval's and Feradom's are, and nobody says them. Every man on the ground stands where a body can stand, and Varn's are walked to from the square.

### The forts' climbers and fallers

Nothing was rebuilt. What it takes to get round each, with the forts as they are, measured on the same ground (the works' own colliders on the terrain's own function, 1.5 m apart; not kept as a test). A pitch is every hand's move between two places a traveler can stand; a move costs what the controller charges (1.8 m/s over the rock; 7 wind a second going up or across, 3.5 coming down); no fall of more than the 3.5 m that costs nothing is allowed; the search is for the way whose hardest pitch costs least, kept within 320 m of the fort's gate, from the mountains' side of the gate to the Empire's.

| Fort | The hardest pitch of the easiest way round it, at level 1 | So |
|---|---|---|
| **The Vastos Gate** | 97 to 98 wind | a climber of **level 1** with the base wind of 100, with two to spare; of level 2, with eight |
| **The Meneth Gate** | 76 to 77 wind | **level 1** |
| **The Reach Gate** | 78 to 79 wind (a pitch on it comes down 27 m behind the wall's line for 53 of that) | **level 1** |

So each fort stops a walker and nobody else: any traveler who has learnt to climb at all goes round all three. The no-hold rock at each fort's ends (`fortUnclimbable`) does what it was built to do - no climber goes over a wall's end, or round it close to (`lotharn-forts`, "each wall, close to") - and the mountain two or three hundred metres along is climbed as it always was. Round the Meneth Gate the way is over the long valley's southern wall, a hundred metres east of the wall's end.

By falling, without a hand on the rock: the least worst fall from the valleys to any lowland, by the game's own step, is **45.9 m** (it was 34.8 m at the slide before the stop). The way that has it is nine falls in two flights, eight of them over forty metres and each costing the full hundred; the last flight comes down the south rampart onto the Empire's side of the Reach Gate's southern end, about (-2214, -540).

### Is "nobody gets past Varn except by the Slabs" proved?

**Inside Varn's reach, yes, to the resolution of the measurement.** Not a walker; not a climber by anything easier, at any level, with wind that never runs out; not anyone by a fall, at any health. It is held by the lattice over the whole reach (1.5 m), by the finer one round the city (1 m), and by travelers moved with the game's own step and fall at the one hole that was real and at the rim the lattice had misread.

**Four limits, stated plainly.**

1. *The reach ends.* West of x -1560 the mountains are as they were, and the forts hold walkers only: a climber of level 1 goes round each of them. Whoever is behind a fort walks to Amod below Varn. So "nobody reaches Amod from the mountains except by the Slabs" is **not** true, and was not built to be: it is true of Varn's own ground, from the Vastos Gate's eastern end to the eastern massif's far end.
2. *A fall is measured as a slide.* The floods bring a falling body down the face to the first ground that holds it. The game's fall also carries a running body sideways, up to eight metres a second. That carry is in every `travel` measurement - at the stop, at the rim by the west jamb, at the caves' doors - and it is not in the floods. No place was found where it matters; not every place was tried.
3. *Three cave doors opened over the Empire's ground, and nobody got to them* (since railed, and the high chimney reached again: section 10). That is held, and it is a fact about what is built rather than a wall ("The caves' doors", above).
4. *A measurement, not a proof of the rule.* The rim rule still reads a ledge that tilts past a walker's grade as a ledge. One such place was found in the reach, and it is stopped by hand. The rule itself was not changed, on instruction.

### The review render of 3 October

One render, after the last change to any source or test file: `node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=varn-pass;varn-amod;varn-slab-north;varn-slab-south;varn-landing;varn-wicket;varn-garrison;stand-at:-1420,-650.6,-1.57,0.25,4;stand-at:-1415,-650.6,1.57,0.3,4.5;stand-at:-1393,-651,1.57,0.3,4;fort-vastos;fort-vastos-keep"`. Twelve views, drawn without an error (`"errors": []`); pictures in `tests/artifacts/` (not tracked). Each was looked at:

- `varn-amod` - **Varn from Amod**: the salient and the Amod Gate with its banners, the towers, the town's roofs, the keep, both jambs with their breastworks.
- `varn-wicket` - the Amod Gate from the road: leaves barred, grate up, and the wicket standing open in the left-hand leaf as you face it, which is the right-hand as you go out.
- `varn-garrison` - the Pass Gate from the upper court: a man on the gallery between the towers, one on the west tower's platform, the sentry on the wall-walk to the east, and the helmet of one of the two on the ground inside the leaves.
- `varn-landing` - the landing: its level top, the breastwork along the city side, the watch turret with its beacon, its flag and its man, the step down to the shelf, and the mountain's courses behind.
- `varn-slab-south` - the south slab from Amod's hills: a smooth plane between the bedded faces, the Amod Gate's towers below it.
- `varn-slab-north` - the east jamb at the north slab from the forecourt's side, sheer, with the town beyond the pass front. The slab is seen nearly edge-on: the picture shows the rock and not the route.
- `stand-at:-1420,-650.6,...` - **the stop**, from the ledge's western dead end looking east along it: the traveler on the ledge, the course above on his left, and on his right a bank of the mountain's own stone between him and the drop, with the Empire's hills far below beyond it. It is drawn as a smooth bank - the ground is drawn coarser than it is walked - and reads as rock, not as a built wall.
- `stand-at:-1415,...`, looking west along the same ledge: the ledge, and the Vastos Gate's wall and towers in the distance. The camera is partly inside the course above and the right of the picture is torn. `stand-at:-1393,...`, the eastern dead end: taken from behind a tree's trunk, with the ledge and the bank at the left edge and little else.
- `fort-vastos-keep` - the Vastos Gate's keep with **its officer on the battlements**, the wall and a tower behind it, the barrack. `fort-vastos` - the wall and two towers from the mountains' side, the gate itself hidden in the wood's crowns as it was on 2 October; no man can be made out in it.
- **`varn-pass` does not show what it is for.** The camera stands inside a tree's crown and the picture is a leaf. The same view showed the Pass Gate through the wood on 2 October. It was not taken again: the instruction was one render. So Varn from the pass is not seen in a picture of 3 October, except past the jamb from the forecourt (`varn-slab-north`) and from inside its own gate (`varn-garrison`).

## Original implementation report

Built on 2 October 2026 from `docs/varn-brief.md`. Measurements and observations below are retained as the original implementation record.

Written before the user's three decisions: where it says that the Amod Gate is open, that nobody stands on the walls, that the no-hold rule is the first cliff only, or that a fall of 34 m is left for the user, read "The user's three decisions" above instead. Section 10 was rewritten on 3 October; sections 8, 9 and 11 are the first build's tests, render and omissions, kept as they were.

The user's words: "a heavily and beautifully fortified city called Varn that has walls that are built
into the mountains and completely surround the perimeter of the city making that mountain pass completely
impassable. Adjust the mountains if needed to make sure this city becomes the key strategic chokehold
blocking movement south from this mountain pass. Let's also add Ambron fortresses of smaller scale
wherever else there are strategic chokeholds that control entry south from the East Lotharn Mountains and
the West Lotharn Mountains."

What is built: **Varn**, in the tip of Amod's notch, and **three forts** - the Vastos Gate, the Meneth Gate
and the Reach Gate. The original branch report recorded both of its own test files as green and
neighbouring failures as also present on its base (section 8). Current integration results are above. The measurements changed the design four times, and those four
are told plainly in section 1 and section 4, because they are the reason the forts are not where a first
look at the map would put them.

---

## 1. The ways south, measured

**How.** The built ground of both ranges and of the countries below them was sampled a metre apart
(x −2650…−600, z −1300…−150), with `canStand` itself asked at every point, and flooded with the game's
walking rules: `canWalkSlope` (in the climbing countries a step up is refused past a grade of 0.9; a step
down never is), the colliders, the closed borders of East Suval and Feradom, and the terrain-fall rule for
what a step off an edge becomes. Whatever a walker cannot be on is rock, and rock lies in islands - the
massifs' courses of cliff. Twenty-six islands of 150 m² and more; every way through the mountains goes
between two of them, so the list of gaps between neighbouring islands is the list of places a wall could
shut. Then the caves were added as the ways they are, which a lattice of the surface cannot see.

**The ways** (narrowest place, rock to rock, on the base before anything was built):

| # | Way | Narrowest | Between | Opens into | Held by |
|---|-----|-----------|---------|------------|---------|
| 1 | Amod's notch, the pass road's end | 128 m | (−1221, −788) and (−1094, −806) | Amod, hex (7,97) | nobody → **Varn** |
| 2 | The Kemrath saddle | 73 m | (−1580, −794) and (−1522, −749) | the Vastos margin | nobody |
| 3 | The long valley, at its narrows | 77 m | (−1761, −713) and (−1761, −636) | the Vastos margin | nobody |
| 2+3 | **The Vastos mouth**, where 2 and 3 come out together | 170 m | (−1660, −584) and (−1505, −653) | Vastos, hex (2,99) | nobody → **the Vastos Gate** |
| 4 | The Meneth gap, the one break in the long valley's southern wall | 79 m | (−2050, −370) and (−1993, −425) | Meneth | nobody → **the Meneth Gate** |
| 5 | The western reach | 75 m at its narrowest, 117 m where the wall stands | (−2310, −461) and (−2308, −386) | Isareos (and Yunethre) | nobody → **the Reach Gate** |
| 6 | **Through the rock**: the passage under the east arm (`col-passage`, src/content/regions/west-lotharn/west-lotharn-caves.js) | a passage 3.6 m wide, 89 m long | in at (−1594, −801) on the col, out at (−1629, −719) in the long valley's eastern reach | the long valley, and by it ways 3, 4 and 5 | nobody → left **inside** the Vastos Gate |

Feradom's pass castles hold none of these: they are on the East Lotharn's other side, shutting the
Duchy's own border, and Feradom is a closed country that turns a walker back at its edge.

Two gaps on the list are not ways south and were left alone: the col where the two ranges join (45 m,
leading west and north) and Kemrath's own floor (76 m).

**What the measurements changed.**

1. **The passage (way 6) was missed at first, and it decided where the eastern fort goes.** Two forts were
   first built at the two narrower places, a Kemrath Gate (way 2) and a Long Valley Gate (way 3). Flooding
   the built world with the caves counted showed two things: a walker went into the rock on the col and
   came out between the two forts, 33 m behind the Kemrath Gate's western end, so that fort was walked
   round; and the long valley, whose only walking link with the rest of the mountains is that passage,
   was left with no way out but its three shut gates - a pocket of 48,308 m². Both forts were taken out
   and one wall was built across the mouth instead. It is longer (178 m against 108 + 94), it is one gate
   instead of two, the passage is wholly inside the mountains, and nobody is shut in.
2. **The jambs were a stair.** Varn's two shoulders of rock were first built 28 m high (top at 88 m). Both
   massifs have a ledge at 113-119 m above their first cliff, and a walker reaches the south-west peak's
   by that peak's own first ramp from the Kemrath saddle. From that ledge to the notch's slope was one
   fall of 34 m. With a jamb at 88 m under it, the same descent was 21 m onto the jamb and 15 m off it -
   a fall a traveler with a hundred health lives through. The jambs are now the ledge's own height
   (section 2).
3. **The countries' scatter moved, and was put back.** Two neighbours lay their trees, stones and walls
   from seeded streams, and a candidate that is taken draws more of the stream than one that is refused.
   Varn's ground changed which were taken - the East Lotharn lays loose stone only above 70 m, and the
   jambs raised ground past 70 m; Amod builds a terrace wall wherever its ground steps, and the Varn
   road's bed regraded some of it - so about nine hundred of the East Lotharn's trees and a hundred and
   sixty of Amod's had moved, across both countries. Fixed at the two places that decide (section 7); the collider lists of the base
   and of the build were then compared kind by kind: every tree and stone that differs is one that was
   lifted off the works' own ground, and none has moved.
4. **The Reach Gate was first built at the reach's narrowest place and moved 93 m up the valley**, for
   two reasons found by test: the south rampart's own first ramp climbs the very cliff that wall's
   southern end died into, from the mountains' side to the ledge above the Empire's, three metres over
   the wall's end; and the wall stood across the range of the west beck's river foxes, so that the law
   "the river fox never flees and keeps arm's length from a walker" (`tests/west-life.test.js`), green on
   the base, failed - the fox was cornered against the wall at 1.36 m.

**Ways not shut, and why.**

- **Round the range.** West of the Reach Gate the reach opens onto both Isareos and Yunethre, and north
  of everything lie the Mithala plain and open country. A walker can go round both ranges by the plains.
  That is not a way through the mountains, and no fort answers it.
- **By falling.** A fall costs at most 100 health (`src/gameplay/movement/terrain-fall.js`), and a traveler's health runs
  from 100 to 400 with his toughness (`src/gameplay/combat/combat-skills.js`). So no height in the game kills a traveler
  with more than a hundred health. With every gate shut, the least worst fall on any way from the valleys
  to any lowland is **34.2 m** (the ranges flooded 1.5 m apart, in `tests/lotharn-forts.test.js`; 34.9 m on
  the one-metre survey): up the south-west peak's first ramp from the Kemrath saddle, along its first
  ledge, and off the peak's south side at about (−1426, −648), onto the hills between Varn and the Vastos
  Gate. On the base, with the same four lines walled, it was 34.0 m, at the ledge's east end over the
  notch - the spot the west jamb now covers. That fall kills a traveler with a hundred health; it costs
  any other a hundred and lets him through. It is the mountains' own shape and the fall rule's, not a
  gap in a wall, and it is left for the user (section 10).
- **By climbing.** Section 2 and section 4: the rock the works are built into gives no hold; the
  mountains beside them are climbed as they always were.

---

## 2. Varn

Numbers in `src/content/regions/varn/varn-world.js` (pure), drawn by `src/content/regions/varn/varn-scenery.js`, the masonry shared with the forts
in `src/world/scenery/imperial-masonry.js`. One build step in `src/world.js` (`regionBuild('varn', [10, 20], …)`), after
Amod and the East Lotharn.

**Where.** The tip of Amod's notch, hex (7,97), where the pass road stopped at (−1150, −792). The city
takes that road on from the exact point it ended.

**Piece by piece.**

- **The curtain**: a closed circuit of six walls, 325.7 m round, on the notch's own hexagon - the pass
  front straight across the north (98 m), the two long sides (60 m each) in the feet of the jambs, and a
  salient of three faces (35.8, 36, 35.8 m) to the south. 8.4 m high and 4.6 m thick with a wall walk
  at 6.2 m: taller than Ambron's own (7.2 m) and as thick.
- **Fourteen towers**, none more than 36 m from the next: six at the corners, a pair at each gate, two
  more on the pass front and one in the middle of each long side. Platforms at 12.2 m, slate caps.
- **The Pass Gate**, in the middle of the pass front: twin towers a storey over the rest, a portcullis
  and barred leaves, the Empire's red and gold hung on both towers and a shield over the arch, a ditch
  5 m wide and 2.4 m deep before the whole front with a kerbed causeway. **Shut.**
- **The Amod Gate**, in the face of the salient: the same, a storey lower, its own ditch. **Open, always.**
- **The citadel**: a keep 12.5 m square and 23 m high with four turrets, in its own ward in the
  north-west corner - the highest ground in the city, a metre and a half over the upper court - behind
  its own wall with three towers and one gate, the castellan's hall along the ward's south side.
- **The town**: nineteen buildings. Three barrack blocks and an armoury in the north-east; a market
  square on the street with a well and the Empire's standard, the market hall on one side and a
  three-floor granary on the other; ten stone houses in two blocks, Amod's own kind (undercroft,
  household, drying loft under a steep roof); a smithy and stables in the lower court.
- **The street** is the pass road: in at the Pass Gate, one in ten down through the town (the upper
  court at 60.2 m, the lower at 54.4 m), out at the Amod Gate.
- **The road down**: 417 m in all, from the pass road's end through the city and down the hills to the
  last vertex of Amod's own road at (−881, −532), through the gap in the field wall at the Kelmod road's
  end. Graded like Amod's road: 54.4 m to 34.0 m at never more than one in ten on its bed; the steepest
  metre measured along it is under one in eight.
- **The jambs** (the mountains adjusted, section 3) and **the parapets** on them, below.

**Walls built into the mountains.** The long sides' centre lines are 2 m from the jambs' lips, so the
curtain's own thickness reaches into the foot of the rock, and the pass front's two corner towers stand
in the jambs' feet. Each jamb's top is the mountain's first ledge carried out level over the city, 56 m
above the upper court, and every edge of it the jamb made carries a battlemented breastwork with a watch
turret and a beacon at its pass end: the city's wall goes on up the rock.

**The pass is shut to a walker** (`tests/varn-world.test.js`, the built world sampled a metre apart round
the city, x −1330…−990, z −850…−668, a step refused if anything solid stands half-way along it):

- From the pass road, with every fall allowed whatever its height: 0 m² of Amod behind the pass front.
  All a walker from the pass has of Amod is 533 m² of forecourt before the Pass Gate, which is Amod's hex.
- From Amod, the same way: 0 m² of the pass. (He has the whole city: the Amod Gate is open.)
- From either side: 0 m² of either jamb's top.
- With the game's own step (`moveCharacter` with `canWalkSlope`): a traveler walked south at the pass
  front every two metres from jamb to jamb is stopped by it everywhere, and one walked into each corner
  and on along the rock gets no further than the ditch.
- Open the gate (the same world less the seven colliders that shut it) and 13,584 m² of Amod is walked
  to from the pass and 4,619 m² of the pass from Amod, with every half-metre of the road clear.

**Nobody steps off a jamb.** A jamb's top is level with the mountain's ledge on purpose, so it can be
walked onto from the ledge (2,428 m² of the west jamb's top and 2,031 m² of the east's are walked, and
1,206 and 821 m² of ledge beyond them: nobody is shut up there). The breastwork is solid and closed: kept
to the top itself, a walker reaches none of the strip between the breastwork and the lip on any side, and
a traveler walked at the city side with the game's own step is stopped by it. Where the breastwork stops
at the mountain's own ledge a return runs out to the jamb's very edge; without those the strip outside it
could be walked round to the city side, which the first layout allowed.

**And to a climber.** The rule is one function in `src/gameplay/movement/climbing.js`, `climbForbidden(world, x, z)`, read
where a hand goes for a hold (`sampleClimbSurface`) and at every attached step of a climb; the world
answers it from one table, `src/gameplay/movement/no-climb-zones.js`, a row to a place. Varn's row is the first cliff
(below the mountain's first ledge, `src/content/regions/west-lotharn/lotharn-first-course.js`) inside two boxes: x −1310…−1199 and
x −1101…−990, z −800…−690.

- From Amod, inside the rule's reach: no way up at all. Every face on that side is the first cliff.
- From the pass, inside the rule's reach: a climber is on the mountain's first ledge by the eastern
  peak's own first ramp, as he always could be, and walks out over the city on the east jamb (5,166 m²
  of ground over a hundred metres east of the city without a fall; none west of it, and a walker none
  on either side). He does not come down behind the wall by any fall a hundred health lives through:
  Amod below Varn is reached only by a fall of 34.7 m off the ledge.
- The controller itself: at 49 places along the jambs' feet the rock would take a hand but for the rule,
  and at none of them does `grab` take one. With the rule lifted the same flood puts a climber on
  2,042 m² of Amod behind the wall without a fall - so the rule is what shuts it.
- **Measured, not chased** (the brief's words): beyond the rule's reach the mountain is climbed as it
  always was. A climber who never tires goes up the south-west peak's first cliff south of the no-hold
  rock, along its ledge, and down to the pass without a fall at all, 110 m from the city. Section 10.

**Why the rule is the first cliff only, and why the ramps keep their hold.** The eastern peak's own way
up - the highest peak in the range, 421 m - begins on the pass floor before Varn's Pass Gate
(`eastern-peak-ramp-1`, from (−1060, −853)), climbs the first cliff north of the east jamb and goes on
over the jamb's back from ledge to ledge. The first row written took in the whole face for a hundred
metres either side of the city, and it cut that route at its first ramp; `tests/east-lotharn-peaks.test.js`
caught the same thing at the Vastos Gate, where the south-west peak's route passes fifty metres behind
the wall's end two courses up. So the rule takes the first cliff and no more, never a peak's own ramp
(`RAMPS_KEEP_THEIR_HOLD`, one constant), and Varn's boxes begin at the jambs and run south.

**Gates on one flag.** `LOTHARN_PASSES_SHUT` in `src/content/regions/varn/varn-world.js`, read by Varn's Pass Gate and by
every fort's gate. Default **shut** (section 10).

**Nobody is sealed in.** The city opens onto Amod by the Amod Gate whatever the flag says (a traveler is
walked from the market square down every leg of the road to Amod's own); the forecourt before the shut
Pass Gate is the pass road's own end and opens back onto Kemrath; the jambs' tops open onto the ledge.

---

## 3. What was changed in the mountains, and in whose country

Measured as the ground with Varn against the ground before it, a metre apart (`groundBeforeVarn`,
`src/world/terrain/world-terrain.js`). The forts change no ground at all.

| Whose | Hexes | What | Area | By how much |
|-------|-------|------|------|-------------|
| East Lotharn | (6,97), (7,96) | **the west jamb**: the mountain's first ledge carried out level to within a metre of Amod's hex, x −1270…−1201, z −796…−722, top 116 m, faces 4.5 m deep | 3,522 m² | raised, up to 55.0 m |
| East Lotharn | (8,97), (8,96) | **the east jamb**: the same, x −1099…−1050 | 3,144 m² | raised, up to 58.7 m |
| East Lotharn | (7,96), (8,96) | the outer ends of the pass front's ditch and floor, where Amod's hex narrows to its tip and the wall's two corners stand 5 m outside it | 610 m² | lowered up to 8.5 m (539 m²), raised up to 1.8 m (71 m²) |
| Amod | (7,97), (6,98), (7,98) | the city's made floor, the citadel's ward, the ditch before both fronts | 9,263 m² | raised up to 9.8 m, lowered up to 10.1 m |
| Amod | (7,98), (7,99), (8,98), (8,99), (8,100), (9,99) | the road's bed down the hills | 6,738 m² | raised up to 4.8 m, lowered up to 5.4 m |

Nothing of the mountain is lowered inside a jamb (held by test). Where the mountain already stood higher
than a jamb's top it is left as it is, so the eastern peak's second ramp, which crosses the east jamb's
back, is on the ground it always was. The road's bed lets go over its last five metres, where it lies on
the bed Amod's own road already has: from the road's end east, the ground is Amod's as Amod made it. The
pass road's own bed is unchanged to two millimetres.

Also changed in Amod: the bar across the Kelmod road's end stands against its post now and the field
wall's collider has a 6.2 m gap, so the road goes through. And lifted off the works' ground, without
moving anything else: 101 trees, 43 loose rocks and 268 drawn tufts, stones and terrace walls at Varn;
154 trees and 73 drawn pieces at the forts.

---

## 4. The forts

`src/content/regions/west-lotharn/lotharn-forts.js` (pure) and `src/content/regions/west-lotharn/lotharn-forts-scenery.js`; one build step, after the western
country (`regionBuild('lotharnForts', [20, 27, 11], …)`).

Each is one straight curtain from cliff to cliff, both ends run up the fallen rock into the first cliff;
6.6 m high and 4 m thick; a tower by each end and none more than 32 m from the next; one gate between two
towers, facing the mountains, shut on the same flag; and behind it on the Empire's side a keep (8.8 m
square, 15.5 m high, four turrets) and a two-storey barrack. No ditch, no town. The same masonry as Varn.

| Fort | From | To | Length | Towers | Gate | Stands in | Opens on |
|------|------|----|--------|--------|------|-----------|----------|
| **The Vastos Gate** | (−1665, −586.5) | (−1504.5, −663.3) | 177.9 m | 8 | (−1605.5, −615) | West Lotharn (128 m of wall) and East Lotharn (50 m); keep and barrack in East Lotharn hex (3,98); the yard behind the gate is on the tip of Vastos, hex (2,99) | Vastos |
| **The Meneth Gate** | (−2053.6, −368.7) | (−1990, −427.3) | 86.5 m | 5 | (−2024.2, −395.8) | West Lotharn | Meneth |
| **The Reach Gate** | (−2212, −541.5) | (−2212, −398.5) | 143.0 m | 7 | (−2212, −483.5) | West Lotharn; a grated arch at (−2212, −466) where the west beck runs under it | Isareos |

**Why there.** The Vastos Gate: section 1, change 1. The Meneth Gate is at the gap's narrowest place. The
Reach Gate: section 1, change 4 - 93 m up the valley from the narrowest place, where no way of the
mountain's passes over either end and the foxes' ground is all on one side; 143 m of wall rather than 90.

**That they are shut** (`tests/lotharn-forts.test.js`: both ranges and the lowland within 120 m of them,
438,149 points 1.5 m apart, the eleven passages through the rock joined mouth to mouth):

- With the gates as built, a walker out of the valleys stands alive on 145,532 m² of the East Lotharn,
  100,895 m² of the West Lotharn and 520 m² of Amod (Varn's forecourt), and on nothing of Vastos, Meneth
  or Isareos. The least worst fall to any of the four lowlands is 34.2 m.
- From the lowlands, by any fall at all: none of the eight valleys.
- The mountains are one country inside the walls: from Kemrath every other valley is walked to, the
  long valley by the passage, and both mouths of both through-passages are the mountains' own ground.
- Open the gates and every one is a way: all at once, and each alone to its own country.
- **Nobody is sealed in**: from every one of the eight valleys, gates shut, a walker walks out of the
  mountains by the pass road's northern end; and the yard behind each gate opens onto its own country.
- Close to each wall, a metre apart: no walker behind it or round its ends by any fall; no climber
  behind it by any way at all. With the no-hold rule lifted a climber is behind the Vastos Gate and the
  Meneth Gate without a fall, so there the rule is what holds him; at the Reach Gate the cliffs are too
  steep for a hand in any case (36.9 m of fall even with the rule lifted).
- No way of either range touches the first cliff within 30 m of where a wall dies into it.

**A choke left open:** none of the measured ways. What is left open is listed in section 1 - round the
range, falling, climbing - and in section 10.

---

## 5. Names, and where they came from

- **Varn** - the user's.
- **The Pass Gate, the Amod Gate, the Citadel, the Market Square, the jambs** - plain words for what
  each is.
- **The Vastos Gate, the Meneth Gate, the Reach Gate** - plain words, each named for what it shuts or
  opens on. They stand in the Lotharn, whose own names are an older tongue than Mittoli and cannot be
  coined from the language profiles (the precedent is `docs/west-lotharn-report.md`).

Nothing was coined. No named characters, no quests, no civilians, nobody at all.

---

## 6. What was added to the lore

Edited in place in `world-builder/azhora_lore/geography/regions/`, not staged and not committed (both
files already carried somebody else's uncommitted changes, which are untouched):

- `amod.md`: one paragraph on Varn after the towns, in the lore's voice ("Varn is not an Amodian town,
  and Amodians say so before they say anything else about it…"); and half a sentence on Sareth-am-Vel,
  whose descent "now begins at the southern gate of Varn".
- `lotharn.md`: one paragraph at the end of "The Passes": Ambron as the latest of the outside powers
  that section already describes, Varn and the three gates by name, and that they hold every way a
  loaded mule can take and not the side routes.

The atlas is unchanged. In the game's own documents: Varn is on the list in `docs/campaign-design.md`.

---

## 7. Files

**New**: `src/content/regions/varn/varn-world.js`, `src/content/regions/varn/varn-scenery.js`, `src/world/scenery/imperial-masonry.js`, `src/content/regions/west-lotharn/lotharn-forts.js`,
`src/content/regions/west-lotharn/lotharn-forts-scenery.js`, `src/gameplay/movement/no-climb-zones.js`, `src/content/regions/west-lotharn/lotharn-first-course.js`,
`src/world/scenery/scenery-clearing.js`, `tests/varn-world.test.js`, `tests/lotharn-forts.test.js`,
`tests/lattice-flood.js` (the measuring tool the two tests share), `docs/varn-report.md`.

**Changed, and why** - several are other countries' files:

- `src/world/terrain/world-terrain.js`: Varn's layer in the ground, and `groundBeforeVarn`, the same ground without it.
- `src/world.js`: the two build steps; the road; the landmarks; `unclimbableAt` on the world; the fine
  ground's sink; the two neighbours handed `unbuiltGround`. The Varn road is deliberately **not** among
  the lines the countries' scatter keeps off (it would re-seed Amod's): its ground is cleared afterwards.
- `src/gameplay/movement/climbing.js`: `climbForbidden`, read in `sampleClimbSurface` and in the attached step.
- `src/content/regions/east-lotharn/east-lotharn-scenery.js` (the East Lotharn's): its loose stone is judged on the ground as the
  range made it (`kit.unbuiltGround`), one line, so that the jambs do not re-seed the range.
- `src/content/regions/amod/amod-scenery.js` (Amod's): its terrace walls are found on the ground as Amod cut it, four lines,
  for the same reason; and the Kelmod bar.
- `src/world/scenery/tree-registry.js`: `remove(id)` - a tree taken out for good, struck off the register.
- `src/main.js`: the review views; `unclimbableAt` handed to the climbing controller; and the count of
  streamed trees replaced by a set, because `remove` shortens the list that count ran along.
- `src/content/regions/amod/amod-world.js`, `src/ui/map/map-fog.js` (one area, Varn), `src/content/chapters/civil-war/campaign-world.js` (one settlement),
  `src/world/terrain/region-world.js` (Amod's landmark list), `src/dev/tools/build-status.js` (three countries' entries),
  `docs/campaign-design.md`, `package.json` (the two tests on the list).
- `tests/east-lotharn-world.test.js`: the law "no step in the ground off the peaks" passes over the two
  jambs, which are cliffs on purpose (without it: 8 steps counted, 6 of them the jambs' faces, limit 4).
- `tests/west-lotharn-scenery.test.js`: its trunk check passes over an instance scaled to nothing (a
  lifted tree). **Not verified**: that file crashes at load on the base before any test runs (section 8).

**For the merge with Telemonia's no-climb rule** (`azhora-game-telemonia`, read only): the two were
written in the same shape. `climbForbidden` and its two call sites are the same code lines; this side
answers `world.unclimbableAt` from the table in `src/gameplay/movement/no-climb-zones.js`, and Telemonia's
`kethornUnclimbable` becomes one more row of it. The comment above `climbForbidden` differs in two lines.

---

## 8. Tests

One file at a time. A world-building file takes 65-130 s here. The base for comparison is the checkout
at `azhora-game-land`, which moved forward during the work (now `e884e6a`; this branch was cut at
`01e0578`).

**The work's own, on the final code:**

| File | Result |
|------|--------|
| `varn-world` | 18 of 18 (72 s) |
| `lotharn-forts` | 12 of 12 (99 s) |

**The neighbours, on the final code:**

| File | Result | If red: the base |
|------|--------|------------------|
| `amod-world` | 8 of 9, **1 red** | the same test and message on the base ("world bounds reach Amod’s northern hills (-3899)"); in `docs/known-failing.md` |
| `east-lotharn-world` | 12 of 12 |  |
| `east-lotharn-peaks` | 6 of 6 |  |
| `east-lotharn-cave-walk` | 9 of 9 |  |
| `west-lotharn-world` | 10 of 10 |  |
| `west-lotharn-peaks` | 9 of 9 |  |
| `west-lotharn-scenery` | **crashes at load**, no test runs | the file crashes at load the same way on the base (`TypeError: Cannot read properties of undefined (reading 'children')`: it looks the terrain up by its old name) |
| `west-lotharn-traversal` | 1 of 1 |  |
| `climbing` | 21 of 21 |  |
| `climbing-world` | 6 of 6 |  |
| `nobody-sealed-in` | 6 of 6 |  |
| `map-fog` | 7 of 7 |  |
| `campaign-world` | 6 of 7, **1 red** | the same test on the base ("describeRegion merges design with the survey…"): Drent’s hex count, 40 here and 42 on the base since it moved forward, 39 expected; not touched by this work |
| `region-layout` | 8 of 8 |  |
| `regional-build-steps` | 3 of 3 |  |
| `region-loading` | 7 of 7 |  |
| `feradom-world` | 14 of 14 |  |
| `vastos-world` | 10 of 10 |  |
| `open-country` | 4 of 8, **4 red** | the same four tests on the base; three are in `docs/known-failing.md`, the fourth ("scenery batching keeps its old district") reads a line that moved out of `src/world.js` before this branch. One message differs, in a test about Drent’s shore, because the base has since gained Drent’s peninsula |
| `tree-registry` | 4 of 4 |  |
| `meneth-world` | 7 of 7 |  |
| `isareos-world` | 8 of 9, **1 red** | the same test and message on the base ("the chart knows menora"); in `docs/known-failing.md` |
| `fortifications` | 6 of 6 |  |
| `closed-border` | 6 of 6 |  |
| `climbing-pose` | 5 of 5 |  |
| `climbing-combat` | 4 of 4 |  |
| `terrain-fall` | 9 of 9 |  |
| `static-scenery-batches` | 7 of 7 |  |
| `local-map-data` | 11 of 12, **1 red** | the same test and message on the base ("…cottages, farms, and barracks", 16 !== 15, Drent’s chart); in `docs/known-failing.md` |
| `world-map-detail` | 13 of 13 |  |
| `minimap` | 15 of 15 |  |
| `amod-ogre` | 9 of 9 |  |
| `vastos-camp` | 6 of 6 |  |
| `vastos-host` | 8 of 8 |  |
| `scenery-builder-steps` | 1 of 1 |  |

**`tests/west-life.test.js`, law by law.** Six animal ranges come near the works: two of Amod's on the
road's bed, the eastern bald's hares, the west beck's river foxes, and two hawks, which no law on foot
asks about. A seventh, the cold head's hares, was near the Reach Gate's first site.

- "the river fox never flees…", "no band is given a range it can run out of the reach of", "a band left
  for a moment…": green here. The first was **red with the Reach Gate at its first site** and green on
  the base; the gate was moved and it is green.
- The other laws stop at their first failing band on the base (three of eleven, per
  `docs/known-failing.md`), before they reach any band near the works. So every law was run on just the
  five ranges near the works, from a temporary copy of the test, here and - reading the base's own files
  without writing there - on the base. The result is the same on both: all five pass the river-fox,
  herding and home-again laws; the walk-down law passes the first four and fails at `cold-head-hares`
  ("somebody walking got within 2.63 m") identically on the base, 108 m from the nearest work.

---

## 9. The review render

`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=…"`, pictures in
`tests/artifacts/` (not tracked). Twenty-one views were rendered after the last change, without an error, and looked at:

- `varn-pass` - from the pass road: the Pass Gate's towers, flags and portcullis through the wood.
- `varn-pass-gate` - the Pass Gate close to: twin towers, banners, shield, portcullis down, causeway.
- `varn-amod` - **Varn from Amod**: the salient and the Amod Gate, the town's roofs, the keep, both jambs.
- `varn-amod-gate` - the Amod Gate open, the street and the Pass Gate through it.
- `varn-wall-end` - the pass front's corner tower and the curtain where they meet the west jamb.
- `varn-jamb` - the west jamb over the city, in its beds, with the breastwork and the wood on its top.
- `varn-street`, `varn-citadel` - the keep, the ward, the hall and the upper court.
- `varn-above` - the whole plan from over the Amod road.
- `fort-vastos`, `fort-meneth`, `fort-reach` - each from the mountains' side of its gate; `-back` from
  the Empire's side; `-keep` at its keep and barrack; `-end` where the wall's far end meets the rock.

What the pictures showed and what was done about it: the first render showed loose boulders and grass
standing inside the walls (the clearing found only the first of two groups called "Amod scenery"; it
finds every one now, and the count lifted went from 37 to 268); the jambs' faces read as one smooth slab
56 m high (they carry broken beds of darker stone every eight metres or so now); and several views were
taken from inside a tree's crown or drawn in against a wall (cameras moved onto the roads, looks raised).
The forts stand in the mountains' own woods and trees hide part of some views; nothing was felled for a
picture beyond the strip the walls and yards stand on. **One view does not show what it is for**:
`fort-vastos-end` is taken from inside the wood and shows the barrack's roof and the cliff, not the wall's
end. The Vastos Gate's eastern end was therefore not seen in a picture; that it is closed is held by
measurement (section 4), and the other two forts' ends and Varn's are seen.

---

## 10. Decisions left for the user

Rewritten on 3 October 2026, and again later that day for the user's answers to items 1 to 3. Three earlier
answers - the gates' default (all shut), the garrison (twenty-eight men), and falling past Varn (closed) - are in
"The user's three decisions", near the top.

1. **Varn stays shut for now** (decided). Both gates shut, the wicket out and never in; nobody gets into Varn
   except over the Slabs and down into Amod, which is past it. A gate that opens for some travelers, or at some
   point in the story, is for later.
2. **The forts can be bypassed by climbers** (decided: intended, in the user's words). They hold walkers; a
   climber of level 1 goes round each ("The forts' climbers and fallers", above). The Slabs are the only way past
   **Varn**, not the only way into the Empire.
3. **The eastern peak's caves: a way restored, three doors railed** (decided: "Restore a way to them - give the
   eastern peak back one climbing way to its caves that does not lead past Varn, and rail the cave doors that open
   over the Empire's ground").
   - *What cut them off* (measured on the eastern massif a metre apart, x -1120 to -700, the game's own walking
     and climbing checks): **the no-hold rock**. The ledges the caves open on are narrow and tilt past a walker's
     grade, so they were come to with a hand on the rock; with Varn's mark lifted off the East Lotharn's rock
     (rims kept) a climber from the Col comes to every door, and with the rims taken off but the mark kept nobody
     does without a fall. The rims fill the shelves as well: walked from its door, the chamber's shelf is 5 m²,
     the high chimney's two together 19 m².
   - *The way* (`CAVE_WAY`, src/content/regions/varn/varn-world.js): the mark is lifted on one stretch of rock, the tread of the
     eastern peak's **fourth ledge** from the top of its fourth ramp (-938, -759) west along the south face to the
     high chimney's lower door (-1037, -797), about 110 m; only that ledge's band of lift, within 2.5 m of the
     line, never on a rim or a rail (358 m² keep a hold). It is a climber's way: about forty short hand's moves
     where the ledge tilts or steps; a walker does not get along it. The chimney's passage takes him up to its
     upper door on the fifth ledge. The trees and outcrops on it are lifted, as on the Slabs (`varnKeepsClear`).
   - *The rails* (`CAVE_RAILS`, `RAIL`): an arc of rim stone round each of the three doors over the Empire's
     ground (the chamber's, the high chimney's two), from the rim on one side to the rim on the other: crest 3.2 m
     over the ground at the mouth, 2.9 m out; inner foot 2 m out, so nothing stands in the door; the brink's
     roll-off between door and rail made up level with the mouth, so a body stepping out stands on flat ground;
     steeper outward than inward, no hold.
   - *Measured*: in the built world a climber from the Col (slabs barred) comes to both high-chimney doors with
     no fall; from the Col, and from all three railed doors, neither a walker nor that climber comes to any of the
     Empire's ground by any fall; 288 travelers stepped out of the three doors on every fifteen degrees, walking
     and running, none hurt and none below his door (tests/varn-world.test.js, "the caves' way", a metre apart).
     The reach flood (tests/lotharn-forts.test.js, "Varn's reach", 1.5 m apart) does not resolve the ledge, so it
     floods from the three doors instead: over both massifs, none of the Empire's ground by any fall, walker or
     climber.
   - *Not restored*: **the eastern chamber** has a rail and no way. Its ledge is all rim between the peak's way
     (the third ramp's foot) and its door; the one line a hand could take runs on the top of the cliff below the
     rim, and a climber given it stepped off into Amod (falls of 40 m and 53 m, at (-968, -743)). A way there
     means building - the rim on that ledge moved out to the cliff's edge for about seventy metres - which was not
     done. **The low chimney** is still cut off too (its ledges are not on any way), and was not railed: its doors
     open over Amod east of the massif (a fall of 57 m to (-750, -808), measured on the terrain, outside the reach
     flood's lattice, which ends at x -840). Whoever gives it a way must rail both its doors.
4. **The eastern peak keeps its way up** (`RAMPS_KEEP_THEIR_HOLD`), from the forecourt before the Pass Gate, with a
   short climb at its foot that any climber can do. It leads to the first ledge, the east jamb's shelf and the
   summit, and nowhere down. `false` would shut that peak altogether.
5. **The rim rule reads a ledge that tilts past a walker's grade as a ledge.** One place in the reach was like
   that, and it has a stop built by hand (`LIP_STOPS`). The rule was left as it is; changing it changes every
   rim in the reach. If the mountains are regraded, the two floods will say whether another has appeared.
6. **The Vastos Gate instead of two forts**, and its length (178 m); and that its yard's trodden ground
   lies on the tip of Vastos.
7. **The Reach Gate's site**: 143 m of wall where the reach is 117 m of floor, rather than 90 m at the
   narrowest place, to leave the south rampart's route and the foxes' range alone.
8. **The jambs**: 56 m of rock either side of the city, level with the mountain's ledge, and the east jamb's
   landing twelve metres over that. Lower jambs are a stair (section 1).
9. **The pass front's corners** stand 5 m outside Amod's hex, in the East Lotharn; 99 % of the ground
   inside the walls is Amod's.
10. **Sareth-am-Vel.** The lore gives it the descent Varn now heads. The road was built down that descent
    to the Kelmod road's end; the town is still only a name on the fingerpost there, and no fingerpost
    says Varn.
11. **The chart.** Varn has an area of its own and six landmarks; the Slabs are one of them, and are listed for
    the East Lotharn, which is the country they stand in. The forts are landmarks only, without areas: the
    West Lotharn's test caps that country's areas, and an area there would sit on another's.
12. **The Kelmod bar** is opened, in Amod's own scenery.
13. **Other countries' files** were changed where the measurements required it (section 7), and on 3 October
    two of the East Lotharn's tests (`east-lotharn-peaks`: the bald law passes over the rim; `east-lotharn-world`:
    the chart's places are looked up in Varn's list as well as the range's).
14. **The forts' test takes five minutes** on this machine, where a world-building file takes two or three: it
    floods Varn's reach three more times than it did. If that is too long, the reach can have a file of its own.

---

## 11. Not done, and not verified

- **The game's own loading path** (regions streamed in as the traveler nears them) is exercised only by
  the review render, which loaded and drew every view without an error; no node test covers it. The
  streamed-tree bookkeeping in `src/main.js` that `remove` required is checked only by that render.
- **`LOTHARN_PASSES_SHUT = false`** was not run as a build: the open state is measured by taking the
  shut gates' colliders away from the same world.
- **`tests/west-lotharn-scenery.test.js`**: the edit there is untested, because the file crashes at load
  on the base.
- **`tests/drawn-ground.test.js`** (no place the world names is buried in the ground it draws) fails on
  the base with errors before it measures anything, so it says nothing about the new landmarks; they are
  held to "can be stood on" in the work's own tests instead.
- **The full suite was never run**, as instructed. Files outside the list in section 8 were not run.
- A climber's **stamina** is not counted anywhere: every climbing measurement is of a climber who never
  tires, which is the worst case.
