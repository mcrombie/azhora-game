# Tests that already fail on this base

## 5 October working-tree integration comparison: Celder scenery

`tests/celder-routes-review.test.js` currently passes 5/6. The failing assertion is
`combined Celder scenery and wildlife preserve delivered identities and meet actual visible ground`.
It reports changes from the original delivered batch/tree/wildlife identities and exposed lower
footprints (11 South Celder forbs, 3 southern shrubs, 21 North Celder forbs, 3 northern shrubs,
14 northern stones and 1 northern tree).

This predates the Ibenal/Henborth/Mithala integration. On 5 October, a separate local copy restored
the pre-integration source snapshots and regenerated its atlas/survey/rivers. Its production-world
scene inspection reproduced the same problem list and identical current tree/layout hashes for
both Celders. The integration did not introduce or fix this older regression. The continuous routes,
water crossing, stamina and North-first loading checks pass. Do not update the original identity
fixtures or loosen contact tolerances merely to clear this failure.

Evidence: ignored `tests/artifacts/celder-preintegration-comparison.json`,
`tests/artifacts/integration-final-regressions.log` and the saved pre-integration source snapshots.
See [the integration report](region-reviews/main-integration-2026-10-05.md).

## Earlier measured baseline

Measured on 2026-10-01/02 by running every listed test file on `b16b66a`, one process per file. The eight files the
merge itself had broken are fixed on this base and are not listed. Everything here fails the same way on the
commit before the merge or was known before it. **Compare names and messages, not counts.**

## `amod-world` (1 failing)
- the chart, the build status and the world bounds all know about Amod
  - `AssertionError [ERR_ASSERTION]: world bounds reach Amod's northern hills (-2167)`

## `batman` (2 failing)
- he sits on the rock above the winery spring, and the carts go through the east breach
  - `AssertionError [ERR_ASSERTION]: on the outcrop`
- Kat, Juan and John each hand over their piece, and only when it is wanted
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`

## `bosco` (1 failing)
- he holds the yard, and abandons the post the instant anybody arrives
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`

## `campaign-world` (1 failing)
- describeRegion merges design with the survey and falls back to provisional terrain levels
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`

## `caricas-world` (1 failing)
- Caricas charts its occupied town while preserving the river-country landmarks
  - `AssertionError [ERR_ASSERTION]: the chart knows caricas-farms`

## `chameleon` (1 failing)
- every one of his spots is somewhere a chameleon can be: dry ground, off the road, in its own country
  - `AssertionError [ERR_ASSERTION]: one per region he visits, and two in open country`

## `collider-grid` (1 failing)
- the grid answers every step exactly as the whole list did
  - `AssertionError [ERR_ASSERTION]: 15188 points, both radii, no disagreement`

## `company-horses` (1 failing)
- the two review views compose the same whether they are run once or twice
  - `AssertionError [ERR_ASSERTION]: and the camera itself uses it`

## `company-route-world` (1 failing)
- the simultaneous company completes its real mainland errands, survives reload and reaches both musters
  - `AssertionError [ERR_ASSERTION]: company stalled: [{"id":"merc-mus","name":"Mus","stage":"road","position":{"x":-1022.641339118508,"z":95.24063092313682},"activity":"waiting","alive":true,"detained":false,"health":100,"wi`

## `developer-atlas` (1 failing)
- local destinations stand on their own authored regions, with a separate schematic route
  - `AssertionError [ERR_ASSERTION]: one stop per playable region, in order`

## `drawn-ground` (4 failing)
- the terrain grid is fine where the game was authored fine and coarse elsewhere, and covers the whole world
  - `RangeError: Maximum call stack size exceeded`
- nobody the world places is standing inside the ground the world draws
  - `TypeError: Cannot read properties of null (reading 'toFixed')`
- no place the world names is buried in the ground the world draws
  - `TypeError: Cannot read properties of null (reading 'toFixed')`
- the main road is never more than waist-deep in the bank beside it
  - `TypeError: Cannot read properties of null (reading 'toFixed')`

## `east-suval` (1 failing)
- the closed border is still closed, and the sea route is a stub that says so

## `elagos-world` (1 failing)
- Elagos is the ninth playable region, true to the atlas
  - `AssertionError [ERR_ASSERTION]: the shelf stands above East Lotharn Mountains`

## `fire-making` (1 failing)
- Martin has spectacles and cropped black hair; Lee Anne has cropped blonde hair
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`

## `forest-hideout-world` (1 failing)
- Drent keeps every original collectible, and the goblin camp in southern Pueth connects to the road north
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:`

## `frontier-world` (1 failing)
- Integrated frontier settlements retain clear entrances, prince meeting places and garrison posts after all world scatter
  - `Error: ENOENT: no such file or directory, open 'C:\Users\Michael\Programs\typescript\azhora-game-land\tests\artifacts\frontier-world-diagnostics.json'`

## `isareos-world` (1 failing)
- a red deer cannot be run down, and Minora joins the charted frontier
  - `AssertionError [ERR_ASSERTION]: the chart knows menora`

## `languages` (1 failing)
- every region on the atlas has a tongue, and every tongue named is real
  - `AssertionError [ERR_ASSERTION]: East Ibenwood has no tongue`

## `liz-autopilot` (1 failing)
- the complete Liz pilot walks the built forest, earns trust and returns the real cat without entering the camp
  - `AssertionError [ERR_ASSERTION]: {"frames":7431,"stage":"following","position":{"x":-0.2139573978028546,"z":-167.6183453626522},"cat":{"x":2.8935531507240593,"z":-168.6884971604991},"mode":"following","stop":"Liz autoplay`

## `local-map-data` (1 failing)
- the real world exports immutable shoreline, pond, and unbroken Caloss chart geometry
  - `AssertionError [ERR_ASSERTION]: the chart includes the expanded authored cottages, farms, and barracks`

## `long-road` (2 failing)
- the play stands where the players camp, and both Drent camps serve it
  - `AssertionError [ERR_ASSERTION]: the gold is on the camp, to the metre`
- the play’s gold is on the camp the wagon is at, and a company abroad never jams the road
  - `AssertionError [ERR_ASSERTION]: the roadside stage it stands on`

## `nethereum-world` (1 failing)
- every hex of Nethereum is honest ground, and nobody is sealed in
  - `AssertionError [ERR_ASSERTION]: west-ground.js and world-terrain.js disagree by 0.6607337264528148`

## `open-country` (3 failing)
- ground outside every outline is open country, not the nearest neighbour’s name
  - `AssertionError [ERR_ASSERTION]: (-2530, -220) is still called Yunethre — 413 m north-west of Caricas, between Isareos and the Lotharn`
- a country’s own shore is that country, and the fringe stops at the shore
  - `AssertionError [ERR_ASSERTION]: 413 m north-west of Caricas, between Isareos and the Lotharn reads Yunethre`
- what the traveler is told and where a tree may go are two questions
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`

## `prompt-priority` (1 failing)
- the prompt panel and its words are one decision, and the words go when the panel does
  - `AssertionError [ERR_ASSERTION]: one value decides whether there is a prompt at all`

## `regional-wildlife` (1 failing)
- previously empty regions have distinct modest populations, including West Suval downs and coast
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:`

## `regions-world` (1 failing)
- District scenery batches reduce submitted geometry without excessive extra draw calls
  - `AssertionError [ERR_ASSERTION]: Terrain tiles share one vertex buffer`

## `rena` (1 failing)
- the chart names Tidehaven, with Eastreena as its old name, and adds the ruins and Applegarth without overlapping anything
  - `AssertionError [ERR_ASSERTION]: ambron`

## `review-quiet` (1 failing)
- nothing in the frame loop opens a dialogue while a review shot is being composed
  - `AssertionError [ERR_ASSERTION]: only 1 loop-driven dialogues found`

## `save-round-trip` (1 failing)
- tests\save-round-trip.test.js
  - `'test failed'`

## `shield-guard` (2 failing)
- the shield is paid for what it stopped, and the host holds rather than presses it
  - `ReferenceError: suspended is not defined`
- the guard is offered before the fight is stepped, and nothing is held while nothing is played
  - `AssertionError [ERR_ASSERTION]: the playing branch is still where it was`

## `signposts` (1 failing)
- every fingerpost on the road stands where a traveler can walk up and read it
  - `AssertionError [ERR_ASSERTION]: "The Stair" has been put right; drop it from the known exceptions in this test and from docs/known-issues.md`

## `south-suval-world` (1 failing)
- the Stillwater is water at its own level: swum, never waded, and a dry shore all round
  - `AssertionError [ERR_ASSERTION]: a swimmer in the Stillwater is held at its surface, not walked along its bed`

## `swimming` (1 failing)
- the two ways out of the water both pay for the swim, and drowning ends a quest fight
  - `ELFLAND_ENCOUNTER is not defined`

## `teachers` (1 failing)
- a bout can kill nobody, and no victory is ever reported for one
  - `AssertionError [ERR_ASSERTION]: health stops at one in a bout, and in practice`

## `troupe` (1 failing)
- eight camps across the country, each on level open ground with room for the wagon, the mare and an audience
  - `AssertionError [ERR_ASSERTION]: nemmel: open ground at -2.6, -1.6`

## `village-cat` (1 failing)
- the harbour cat’s places are in Tidehaven, on open ground, clear of people, and joined by clear lines
  - `AssertionError [ERR_ASSERTION]: a place the cat can never walk to`

## `wild-route` (1 failing)
- every quarter-metre of the authored line is ground a body can stand on, and none of it is wet
  - `AssertionError [ERR_ASSERTION]: 183 samples of the authored line are not standable`

## `woodcutting-forest` (resolved test contract, 4 October 2026)
The original `wild-grey-vault` failure is reproduced on `a2e49c3`: the test treated
six explicitly protected living Ibenwood species as ordinary harvestable timber.
The test now exhaustively checks ordinary species products and separately requires
all six protected species to have no recipe, no log/plank, no successful ordinary
swing, no stock/reward change and no experience gain even if a caller requests
`harvestable:true`. Focused suite: **7/7 pass**. No production recipe, species,
protection rule or save behavior changed.

## `woodland-progress` (4 failing)
- first-shore save needs neither letter nor token and restores gathered sites and optional stories
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:`
- partial practice resumes but invalid lesson, gathering, camp and story data cannot replace a save
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:`
- each unfinished chart lesson and completed guard drill resumes before leaving Tidehaven
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:`
- invalid guard progress cannot overwrite a save, and a new completed lesson requires its guard
  - `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:`

## `west-life` (run law by law; 3 of 11 laws failing)
- nothing in the west can be walked down: what flees keeps its distance, and what shuts cannot be caught
  - `AssertionError [ERR_ASSERTION]: elagos-meadow-cattle: somebody walking got within 0.34 m of elagos-meadow-cattle-1`
- the quick ones cannot be run down either: the hare on its legs, the wader into the air, the otter into the water
  - `AssertionError [ERR_ASSERTION]: feradom-country-17-98: somebody running reached feradom-country-17-98-1 after 25.5 s`
- a chased band is home again in a few minutes, watched or not
  - `AssertionError [ERR_ASSERTION]: oveth-herons: three minutes on, watched, one is still 63 m from home (it was 61 m)`

These three laws stop at their first failing band, so the bands after it are not exercised by them.

`frontier-world` fails only where `tests/artifacts/` does not exist (a fresh checkout).


## Current integration: Varn west jamb (not a baseline finding)

Measured on the main working tree on 2 October 2026 after importing the latest Varn geometry. The region-scoped Varn suite passes 21 of 22 tests. The remaining assertion seeds the traveler on top of the west jamb and finds a diagonal walk onto a low natural rim followed by a roughly 39-metre fall into Amod behind the city. The ordinary pass and tireless-climber flood checks pass in that fixture. This does not establish that the seeded starting point is unreachable by every possible route.

The exact test, terrain coordinates, source provenance and integration results are recorded in [the Varn report](varn-report.md). Height experiments produced other routes and were reverted; no invisible blocking wall was introduced to hide the failure.

The regional forts suite passes 11 of 12 checks. Its remaining open-gate reachability assertion uses a 1.5 m lattice that has no sample inside Varn's 1.2 m exit wicket after body clearance; the finer production-movement doorway check passes. This sampling limitation is separate from the seeded west-jamb fall route above.
