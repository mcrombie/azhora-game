# Celder frozen delivery intake

**Historical initial intake, 4 October 2026.** The opening contract and queued-review
findings below describe the first frozen delivery inspection, before integration or
native acceptance. Subsequent corrections and final Full/Fast/Continue results are
recorded later in this document under **South and North Celder: environment accepted**.
Both environments are now accepted in main; the original intake claims are retained
as historical evidence, not the current queue status.

## Frozen packet

- Source worktree: `C:/Users/Michael/Programs/typescript/azhora-game-celder`; branch `celder`.
- Clean tracked/untracked status observed at `136b5822dd8b11906d35b041f2ac9a67be4ad08d`.
- Base `a2e49c3`; build commit `e7012d9`; final commit adds the handoff and a loading label/comment.
- Handoff: `docs/region-reviews/celder-handoff.md` in that frozen worktree.
- Diff against base: 27 files, 2,228 additions and 16 deletions. No packet completeness blocker
  prevents keeping this delivery queued. Main remains separate with unrelated local work.

## Scope and integration contract

South Celder is 37 plains cells; North Celder is 34 cells, including eight grassland cells.
The patch adds environment ground, water margins, scenery, wildlife, chart entries and tests;
it adds no civilians, settlements, quests or domestic herds. Canerd has a terrain/scatter reserve
at `(-2620, -1035)`, radius 110 m. Existing campaign files and story rules are unchanged.

Runtime IDs 61 and 62 append after Babon, preserving the existing 60-region order. They remain
provisional until central integration. Scenery jobs and landmarks use `REGION_IDS`; the developer
destination table contains literal 61/62 rows and must stay consistent if allocation changes.
The survey generator list and generated survey include both countries. Build status correctly
says `environment`; retain the review branch's independent all-131 inventory correction on merge.

`world.js` owns separate `southCelder` and `northCelder` jobs through existing `regionBuild`,
with terrain dependencies supplied by that pipeline. Both use a shared yielding scenery builder,
separate deterministic seeds, typed tree registration and a rendered-ground callback. Wildlife
zones append to `WEST_LIFE_ZONES`; the existing wildlife loading system remains the owner.
No independent readiness controller or save format is introduced. This is source-level wiring
evidence; it does not establish correct Fast travel/arrival behavior.

Shared integration files include `main.js`, `world.js`, `world-terrain.js`, `west-lotharn-world.js`,
the region/map/language registries and test manifest. Preserve current review fixes when combining
them, and regenerate shared generated data from the combined source rather than replacing it.

## Evidence received

The handoff reports 8 South and 6 North ground tests, plus 9 life/scenery tests passing on
`e7012d9`; neighbor and registration suites also passed. Source inspection confirms meaningful
checks for exact atlas/climate membership, ownership, dense seam samples, unchanged Mithala water,
wildlife clearance, species registration, animal retreat/return and bounded rendering batches.
The reported `languages` failure, “East Ibenwood has no tongue”, is identified against the base.
No tests were rerun for this intake; final-label commit `136b582` is newer than the reported run.

The life tests use a scoped world. Their rendered-ground fixture is deliberately
`groundWithRiver + 0.12`, proving callback use but not real mesh-triangle support or root footprints.
The reported 2.1 km movement loop is useful production-controller evidence, but the exact loop
is not a committed test among the three added files. Request its script/artifact when executing it.
The author explicitly did not perform the same journey with native keyboard controls.

Thirteen native review captures and two startup JSON reports are listed with checkout/date.
Both startup JSON files and representative PNG files exist in `tests/artifacts/` in the frozen
worktree. Images were not judged at intake. Evidence remains attributed to Claude's handoff.

## Deferred concerns and required acceptance evidence

1. **Full/Fast readiness and responsiveness:** Full cold startup reportedly rose 9.3% on one
   before/after pair; warm timing improved. Fast mode, destination wait, frame times, renderer
   memory and draw calls are unmeasured. Reported iterator steps of 7–28 ms and a first cold
   step near 1.5 s require measurement in the renderer. The scheduler cannot interrupt a step;
   lazy synchronous seam-table construction in `south-celder-world.js` is one place to profile.
2. **Native journey and persistence:** still pending arrival, crossing both countries and water,
   return, leave/re-enter, and saved harvested-tree/defeated-animal reload. Repeat in Full and Fast
   on the final combined revision, including normal ground/contact and readiness checks.
3. **R2 shared boundary:** South Celder meets West Lotharn on 16 edges. The handoff reports a
   12.19 m difference over a 0.5 m probe at `(-2050, -864.9)`, improved from a 15.2 m base cliff,
   plus 303 additional steep one-metre samples within the 45 m margin. Existing tests probe only
   0.1 m across each edge, so their small-step bounds do not prove an ordinary crossing route.
   Inspect cliff versus accidental seam at player height and prove intended ascents/descents.
4. **Preserve the range while resolving R2:** the patch makes `westLotharnShare` subtract Celder
   weights from the land denominator, preserving how it treated those cells as outland. Removing
   that compatibility rule reportedly moves existing mountain ground by up to 80.7 m. Do not
   adopt the handoff's optional “re-baseline” suggestion without checking summits, caves, fort
   approaches, rendered trees and established routes. Coordinate any R2 fix with this frozen seam.
5. **Water and presentation:** one mapped inter-Celder stream edge is represented by a dry gravel
   head as a declared seasonal interpretation; verify that choice against atlas/water acceptance.
   Reported white quads on West Lotharn slopes require visual triage. Similar herd spawn patterns
   merit player-height review. Mithala low banks at `(-1859, -1153)` and `(-1700, -1414)` belong
   to R8; keep those distinct from new Celder faults.

The handoff also discloses an uncommitted edit to the sibling World Builder `celder.md` under an
earlier instruction, with unrelated content in the same file. It is outside the delivered game
commits. This intake neither approves nor reverts it; preserve the edit and record the discrepancy
without sweeping it into game integration. The joint plan's read-only World Builder rule governs
subsequent work. Routine builder ecology choices do not require a new approval round by default.

Next: keep this exact revision frozen and queued; finish the existing review backlog, then perform
the missing acceptance work against a recorded combined base. Do not mark Celder accepted or
merge it into the user's active main checkout on the strength of this intake.


## Independent source and visual review, 4 October 2026

This extends the earlier intake without replacing its historical evidence. Both Claude worktrees
were read-only and clean when inspected. No new game fixture, native process, integration or
acceptance was performed for this review. The earlier statement that the loop was useful
production-controller evidence is narrowed below after inspection of its now-available driver.

### Exact candidate and integration boundaries

The Celder candidate is the following commit set, in order:

- `e7012d9e368515ea6e9606e70f70cf7f1bf0c9db`: the two-region build.
- `136b5822dd8b11906d35b041f2ac9a67be4ad08d`: frozen handoff and final label/comment.
- `29ca6913a9b437d968850f5afe54726f913bfdb2`: the later seam-table performance follow-up,
  present in `../azhora-game-east-izol`. It changes only `src/content/regions/south-celder/south-celder-world.js`.

Do not copy the whole East Izol checkout at `fdc1707728128a3cdb29dfac6f8e5be6190dc830` to
obtain that follow-up. Its later `0a47f26` build also supplies `scripts/walk-route.mjs`,
`scripts/region-evidence.mjs` and `docs/region-reviews/routes/celder-loop.json`; those are
separately selectable evidence helpers/data, not part of the frozen two-Celder production packet.

Direct reading of the current authored map confirms South Celder's 37 plains cells and 36 Dfa /
1 Cfa climates, and North Celder's 26 plains + 8 grassland cells and 33 Dfa / 1 Dfc climates.
The source gives the two countries one continuous plain, separate seeded scenery jobs, a reserved
Canerd site and wild animals only. Nothing in this read-only inspection calls for settlements,
domestic horses or a forest quota to be added to the environment build.

Shared-file integration must retain the review world's current West Izol seam/legacy-scatter
hooks, Southwest contact corrections, West Lotharn compatibility and stream refinement, and the
shared Suval/Telemonia/West Lotharn fine-ground jobs. Preserve the full current wildlife rendered-
footing allowlist, tree registry and save hooks. Add the Celder registrations and views narrowly;
regenerate the survey from the combined registration list. Preserve current test fixtures and
append the three Celder test files to the complete manifest. The old packet's shared-file versions
are not replacements for the current review world.

### Evidence limitations now resolved or made concrete

The route waypoints are now available, including the West Arm out-and-back crossing near
`(-2141.8, -1205.7)` / `(-2145.8, -1233.4)`. The supplied driver calls `moveCharacter`,
`canStand` and `canWalkSlope`, but sets player Y only at spawn, always permits swimming,
and does not run production support acquisition, falling, stamina or vertical water movement.
After repeated blockage it moves X/Z forward by 2 m; a leg iteration limit does not fail its
endpoint; the script exits zero even if it reports blockage. This does not prove the reported run
actually used a nudge, but it makes the script collision-screening evidence rather than a complete
walking/swimming acceptance test. Reuse its waypoints with the review world's actual support,
movement, falling and swimming controls; fail on blockage or missed endpoints without nudges.
The loop also does not prove an ordinary ascent/descent across the steep West Lotharn interface.

The life tests meaningfully cover animal clearance, retreat/return, typed identities and batching.
Their artificial `groundWithRiver + 0.12` callback proves callback use, not real triangle contact.
Tree origins are buried below that centre sample, but trunk footprint and prop hull contact remain
unmeasured against the actual combined scene. Ground animals likewise need their posed origins
checked against rendered triangles, including Fast arrival before adjacent scenery loads.

The performance follow-up defers each seam table until a query reaches its edge; the sample
formula, interpolation and integration are unchanged in the source diff. Its commit reports
126,213 bit-identical samples and a worst cold first touch of 63 ms instead of about 1.2 s.
Those claims have not been independently rerun. A 63 ms synchronous step still deserves renderer
measurement under the joint plan. The comment's count of 47 outer edges is stale relative to the
72 edges tallied by the delivered tests (36 for each country); this is documentation, not an
identified ground defect.

Both original startup JSON artifacts were read. They confirm Full cache-miss totals of 124.495 s
on the base and 136.137 s on Celder, with warm totals 112.956 s and 108.397 s. Each captured state
is the opening screen in Drent after only three frames, with `averageFrameMs: null`; the identical
1,163 draw calls / 1,716,614 triangles describe that view, not either Celder. These single-pair
artifacts do not establish Celder frame pacing, Fast destination readiness or memory behavior,
and predate the performance follow-up and current review-world fixes.

### Native images inspected

All thirteen delivered Celder PNGs in the frozen worktree's `tests/artifacts/` were viewed:
`south-celder`, `south-celder-swells`, `south-celder-foothills`, `south-celder-head`,
`south-celder-lotharn-foot`, `south-celder-wildlife`, `north-celder`, `north-celder-open-plain`,
`north-celder-west-arm`, `north-celder-celder-water`, `north-celder-foothills`,
`north-celder-shared-line` and `north-celder-wildlife`. No additional Celder captures were found
in the later East Izol artifact set.

The continuous open plain and low swells read clearly, with useful sight lines and restrained
western foothills. The inter-Celder image has no obvious political ridge. The pale grass carpet
and repeated small tuft shape are visually uniform across much of the delivered set; the silt,
terrace and moisture distinctions are difficult to read from these views. Both wildlife closeups
use conspicuously similar herd poses/layouts. The animals themselves read as distinct adults and
calves. This is a coherent environment candidate, but counts alone do not resolve the remaining
visual repetition.

The West Arm and Celder Water views show thin, flat dark ribbons; they do not establish bank/bed
contact or traversal. The dry head reads as subdued gravel rather than an obvious flowing stream,
so its seasonal interpretation remains an explicit atlas review item. Bright white facets on the
neighboring West Lotharn slopes are visible in the Celder Water/shared-line captures. The current
review has since corrected a shared terrain-material mutation from the Telemonia cistern; recapture
with that fix before attributing those facets to Celder geometry or changing terrain to hide them.
The Lotharn-foot view looks connected at a distance but cannot resolve the reported steep crossing.

### Acceptance sequence against the final combined review world

1. Record the current base and exact applied commits; preserve neighbor tree IDs, river profiles,
   route/cave/fort geometry and shared registration order. Independently rerun the delivered
   8 South + 6 North + 9 life tests on the combined source, plus affected atlas/language/survey,
   Mithala water and West Lotharn route contracts. Diagnose baseline failures separately.
2. Verify the lazy seam follow-up numerically and inspect the 45 m West Lotharn margin with the
   actual controller. Distinguish an intentional cliff from a broken advertised approach; prove
   ordinary intended routes both directions, without immunity or position nudges.
3. Construct both countries with their real neighboring support surfaces and measure trunk
   footprints, tilted prop hulls, visible stream beds and posed animal contact. Preserve seeded
   identities and animal homes while correcting any demonstrated support defect.
4. Run native Full and Fast arrival/travel through both regions, the shared line and West Arm,
   then leave/re-enter. Record required-job readiness, waits, per-job longest slice/build steps,
   frame samples and renderer memory. Measure cold-first-edge work in the real renderer; report
   contention and candidate differences rather than treating unpaired timings as a benchmark.
5. Save a partial tree harvest, defeated-animal state and distinct inventory witness in the isolated
   smoke slot; reload and revisit in both modes. Assert exact retained identities/quantities and no
   duplicate colliders, catalogs or scenery after departure and return.
6. Reinspect fresh player-height views with the current matte terrain material, especially the
   two water crossings, Lotharn approach, silt/terrace transitions and both herds. Make bounded
   presentation corrections only after separating actual defects from the intended open plain.

**Status remains intake/review, not accepted.** The source and waypoint data are sufficient to
start combined validation promptly once integration and the serialized fixture slot are assigned;
no further handoff clarification is needed merely to begin those checks.


### Combined review integration and first validation (2026-10-04)

The review checkout now contains only the Celder leaves/shared hunks from
`e7012d9` + `136b582` + the `29ca691` lazy seam follow-up. The atlas survey was
regenerated. South and North are appended as runtime IDs 61 and 62; every prior
ID and manifest entry remains in its prior order. East Izol production content
was excluded. Narrow world merges retain the R10 legacy-ground composition,
shared regional fine-ground jobs, wildlife footing regions, and yielding
Telemonia town construction. The exact prior bytes and source hashes are in
`tests/artifacts/celder-integration-20261004/before/` and `applied-shared.json`.

Independent combined checks passed South 8/8, North 6/6, survey 4/4, developer
atlas 8/8 and build status 4/4. Languages passed 15/16; its only failure is the
pre-existing missing East Ibenwood tongue, unrelated to Celder. The delivered
Celder life suite passed all 9 tests (334.10 seconds), including actual-world
homes, retreat/return and the walking/running chase rules. These timings overlap
other authorized native work and are not isolated performance benchmarks.

A new integration defect was found in Fast ownership: 631 retained West Lotharn
summit cell centres and 745 vertices now belong to South Celder, yet South did
not request that shared ground. None belongs to North, and none of those centres
is removed by a cave mouth. The bounded correction adds only South's owner to
the shared job and supplies its visible-top sampler to both Celder scenery
builders. Physical ground, triangle geometry, random eligibility, and candidate
order are unchanged. An actual South-first fixture verifies the highest overlap
at (-2051.501928, -847.127944): retained ground 93.618527 m versus sunk coarse
1.666437 m. At the normal South arrival the coarse surface remains the top.
The first corrected fixture also checks 3,581 grass/turf/sedge origins against
actual triangles (97 on retained ground, 3,484 on coarse); maximum gap is
0.0002113 m. Neighbor-load identity and ordinary journey acceptance are pending
completion below, and this remains a review candidate.


The corrected South-first loading fixture finished **3/3** (121.23 s): later West
Lotharn arrival reused all 41 shared meshes and preserved the exact matrices and
colors of 11,765 South instances plus all 66 South tree IDs. A separate pure
comparison of the eager `136b582` and lazy `29ca691` seam implementations on the
combined ground checked **141,024 samples with zero bitwise differences**.

The first ordinary controller run finished 2/4 (187.27 s). All three authored
out-and-return journeys reached every endpoint continuously with 100 HP and no
stamina loss. South's complete route passed. North's route and the combined
journey correctly failed the no-fall assertion: near (-2500, -1183.5), the
plain's datum jumps about 0.247 m when `courseSample` switches to the next nearest
river profile sample. It is not an atlas-border discontinuity. The published
North arrival lies beside that discontinuity. The supplied West Arm segment
crossed to West Mithala and back with **zero swimming**, also failing acceptance:
pure water there stands at 12.962211 m over a 12.462211 m bed, but the actual world
water lookup has no surface-bearing Mithala water markers, so it treats the
crossing as dry. These remain demonstrated defects, not relaxed assertions.

The separate scenic-loop diagnostic is not an advertised clear route: its
straight chords stop on two trees and one rock, and the Lotharn-foot departure
falls down the existing steep slope for 15 HP. Those failures do not justify
clearing ordinary scenery or flattening the foothill. All original leg traces
remain in `celder-routes.json`; the continuous authored routes never use the
independent starts reserved for diagnosis.


The integration correction now uses a continuous soft-nearest river-level datum,
with a cached 16 m bilinear grid for ordinary terrain queries. Interpolating only
between adjacent profile samples was insufficient: the far inland point switches
between nonadjacent portions of the bent arm. On 24,600 owned 5 m grid points,
24,011 small heights change, with maximum absolute delta 0.274431 m. All sampled
points within the existing 13 m channel/bank protection stay exact; river profiles
and neighboring terrain are unchanged. The reproduced North arrival jump is now
0.0003735 m per centimetre. All 14 delivered ground tests pass on this correction.
Scenery reads its frozen delivered eligibility separately from physical/rendered
support: the original 58 complete non-Y instance/color batch hashes, 66 South
and 77 North tree choices remain exact in a standalone comparison.

Mithala water has been separated into a shared water-only loader job owned by
28/29/30/31 and North Celder 62. It reproduces the original 12 ribbon/braid mesh
attribute/index hashes and 831 deep-channel collider records exactly. Runtime
water lookup now exposes the existing `westWaterSurface` only inside the two
shallow Celder-border arms; no bed, depth, ribbon or deep-channel wall is changed.
A North-first loading, actual-water-contact, reuse, combined scene and ordinary
route fixture is running on this corrected candidate; its result is still pending.


### Final combined fixture: passed (2026-10-04)

The final `celder-routes-review.test.js` fixture passed **6/6**, explicit Node exit
0, in 157.62 seconds (session 98991). It builds North Celder first, then the two
Celders and their built neighbors once. The three continuous ordinary routes all
finish with 100 HP, zero falls and valid dry departure/return support:

- Published South arrival to North arrival, the delivered West Arm crossing and
  return: 2,217.62 m walked plus 14.7277 m in the existing 0.5 m-deep arm; minimum
  normal stamina 87.33 and largest grounded rise 0.0722 m.
- Complete South length out/back: 1,290.31 m, largest rise 0.0644 m.
- Complete North length out/back: 1,295.99 m, largest rise 0.0480 m.

The game switches to its swimming rules whenever support lies below water; the
review did not deepen this naturally shallow arm. North-first Fast readiness
loads the water-only job with Mithala vegetation still pending. At the probe,
world water is 12.962211 m, the actual ribbon triangle is 12.962433 m, and the bed
remains 12.462211 m. All 12 original mesh hashes and 831 deep-wall collider records
are exact; loading Mithala later reuses the same water objects.

Actual-scene inspection preserves every one of the delivered 58 complete non-Y
matrix/color batch hashes and all 143 typed tree identities/positions/species.
All 58 wildlife origins meet the independently indexed visible triangles within
1.3 micrometres (air/float origins retain their specified support), and observer
culling leaves the saved simulation hash unchanged. Full trunk lower rings have
no exposed point; their original intentional 1.1 m embed remains unchanged.

The added contact audit reproduced suspended undersides in 990 forb clumps,
326 scrub clumps, 95 stones and 7 gravel pieces. The correction seats complete
basal lobes/tilted lower hulls by changing only their instance Y, preserving every
random draw, horizontal transform, color, physical collider and logical home.
The final fixture inspects all 990 forbs, 326 scrub clumps, 485 stones and 368
pieces of gravel; no lower footprint is exposed or missing terrain. The highest
corrected lower-hull point remains about 1.99 cm under the actual visible surface.

Evidence is `tests/artifacts/celder-integration-20261004/celder-routes-final.json`
and its `.log`. The earlier diagnostic loop remains deliberately separate: its
straight chords through props and the steep Lotharn foot are not advertised
clear roads, so those diagnostics did not erase obstacles or flatten cliffs.
The delivered life behavior suite's 9/9 result predates the datum/water fixes;
final logical identity, dry homes, displayed support and ordinary traversal are
proved by this combined fixture rather than represented as a repeat of that
entire suite. The South-first loading 3/3 likewise preceded the final small Y
correction; ownership is unchanged, and final North-first/reuse checks pass.

A frozen copy packet with narrow shared-file edits is prepared at
`tests/artifacts/celder-final-packet/`. This is ready for main integration and
native Full/Fast travel/save/reload and visual review. Those remaining native
checks belong to the coordinator; **this document does not mark final acceptance**.

## Enhanced Celder native Full result (4 October 2026)

The main desktop Full run passed 198 initial assertions and 30 Continue/reload assertions, with explicit exit 0 and no captured renderer errors. It uses the final river-input/harvest extension, not the earlier screenshot-only Celder run. Both real W-input river legs complete with no falls or damage. Each crosses about 7.35 m under the normal swimming rules; minimum stamina is about 87.60 and it recovers to 100 on the dry bank.

Production wood.swing harvested one white-oak log from tree `south-celder--2640.689--566.124`, with its ordinary experience reward and three logs remaining. Departure, save, renderer restart, Continue and return preserve the exact inventory, partial stock and stable ambient wildlife identities/home records. Ambient residents have no defeated-actor save and are not represented as a combat-persistence test. All 54,494 registered tree IDs are unique; travel introduces no duplicate catalogs.

Evidence in main tests/artifacts: regional-ground-celder-final-full.json, regional-ground-celder-final-full-before-reload.json and regional-ground-celder-full-enhanced-native.log. Chromium emitted a GPU command-buffer diagnostic while shutting down after the completed result; the process still exited 0. This is recorded separately from the empty renderer-error list. Fast-mode enhanced validation is running; final Celder acceptance is still pending that result.

## South and North Celder: environment accepted (4 October 2026)

Both regions are accepted for terrain/wildlife integration into the main desktop build, following the corrected combined controller/scene fixture, seven inspected native views, Full native 198 initial + 30 reload assertions, and final Fast native 216 initial + 32 reload assertions. Both native processes exited 0 with empty renderer-error lists. This accepts the two environments, not their future towns, story or the whole R1-R11 backlog.

The Fast retry crosses and returns through the actual shallow arm, spends ordinary swimming stamina (minimum about87.33), recovers to100 on dry ground, harvests the same typed white oak through production wood.swing, and restores that run's exact partial stock, inventory and stable ambient identities after Continue. The 10.719-second Mithala readiness pause holds the character safely. The test re-presses W afterward because the normal loading overlay clears input. The earlier failed test and screenshot are retained as celder-fast-border-wait-failure.*; its timeout was a test-input oversight, not proof of a blocked river. No gameplay support or movement rule was relaxed.

Evidence: regional-ground-celder-final-{full,fast}.json and their before-reload copies, regional-ground-celder-full-enhanced-native.log, regional-ground-celder-fast-resume-native.log. Full's Chromium shutdown diagnostic remains recorded above. Full ran before East Izol was mirrored; final Fast includes the East Izol candidate registration, which remains separately unaccepted. The earlier scene fixture verifies the continuous long journeys; these native checks verify representative ordinary input, loading, real harvesting and persistence.

The large repeated mountain shelves visible beyond Celder remain a neighboring Lotharn aesthetic limitation under R1/R2; Celder acceptance does not close that work.
