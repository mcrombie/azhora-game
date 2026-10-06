# Alezhor integration review

**Environment accepted, 4 October 2026.** Final bank contact and native
Fast/Continue evidence are recorded below. Claude's source remains read-only at `116799eb0b6985c8538192289e07929a6cb4fea7`
(build `c042e8680f2ba99e3fdf008116d09423c665feab`, handoff `67719d9`, later screening walker
`116799e`). The region-only delta starts after East Izol `fdc1707728128a3cdb29dfac6f8e5be6190dc830`.
The generic walker was not transplanted. It does not prove stamina, falling or swimming.
The exact pre-Alezhor review snapshot is retained in
`tests/artifacts/alezhor-candidate/review-before`; East Izol and the earlier review work are composed,
not replaced by Claude's older copies. Root's separate native entry points remain untouched.

## Integration corrections

- Alezhor appends stable runtime ID 64 after East Izol 63. Its 25 atlas hexes, Csb climate,
  two reserved river-mouth flats, sourced species, authored water geometry and lack of civilian
  settlements are retained. The survey was regenerated with its existing build script.
- Expanding the western bound by 50 m formerly redistributed 226 existing coarse columns,
  moved old surface planes by up to 20.38 cm in the dependency sample, and shifted every later
  terrain color draw. The new extension appends eight 6.25 m intervals outside the exact old axis.
  All 1,318,672 established X/Z grid coordinates retain their doubles and Float32 representation;
  all 1,330,172 original color draws retain SHA
  `6441a1759c8e8c76e7c3ef32774f2acea59973725e8e40a98d3d19ded940c163`.
  New columns use a separate coordinate-derived stream. Existing Full/Fast tile names and
  footprints remain anchored to the old origin; the new strip uses negative tile keys.
- The delivered sequential Ibenwood/Alezhor refinement skipped different necessary faces on
  shared tiles, depending on arrival order. One ground-only job now refines the union before
  either scenery builder. Its owners are North, South, West and Central Ibenwood plus Alezhor
  (`33,34,35,36,64`); explicit bounds supply the unbuilt shore's coarse apron. Alezhor-first
  loads the shared ground while forest scenery remains pending. A cached retained-triangle
  query replaces removed coarse planes instead of taking a maximum with the cut-out surface.
- Runtime water now queries the exact Float32 ribbons, independently of vegetation loading.
  Circular marker gaps formerly missed 414 sampled wet pool/stream margins, including water
  at `(-4511.397250,851.680915)` around 12.98466 m over a 12.65358 m bed. The new query is null
  outside the ribbons, leaves dry ground above water dry, and retains the authored gold ford
  and fall exclusions. No ribbon, collider or bank geometry was enlarged or moved.
- Actual contact inspection found unsupported individual shrub lobes. Only their Y translations
  are lowered to a basal contact. All 2,283 lobes remain visible and supported. The 168 stones
  and 361 gravel pieces were already supported overhangs and were left unchanged; requiring
  their entire underside to be buried would have been an incorrect acceptance criterion.

## New-region baseline and preservation

Alezhor had not entered the user's saves. Approved earlier Southwest border repairs affect the
neighbor heights read into its border tables and placement survey. Restoring those old broken
heights just for this unshipped population was explicitly declined by the coordinator.

An independent read-only build of frozen Claude's actual Fast world records **394 trees,
93 instanced batches and 16,140 instances** in `tests/fixtures/alezhor-delivered-layout.json`.
The corrected first composition records **392 trees, 92 instanced batches and 16,210 instances**
in `tests/fixtures/alezhor-corrected-layout.json`. This exact initial composition hash was captured
before shrub contact changes and independently reproduced by the local builder:
`f54da8b1c0bdb753093ea4a6b0793c2334233f52e79c987e02c0c9f282bfa55a`.
Every subsequent contact correction retains that complete non-Y transform/color hash.

Four delivered IDs are absent: `alezhor--3772.339-1178.260`, `alezhor--3731.306-1183.732`,
`alezhor--3619.806-1183.133`, and `alezhor--3757.407-1192.874`.
Two appear: `alezhor--3608.219-1163.944` and `alezhor--3767.983-1172.675`.
Their species and exact coordinates are retained in the fixture's explicit `removed`/`added` lists.
This is an Alezhor-only composition change, not a replacement of an existing-region golden hash.

The existing all-13 Southwest regression passes **14/14** after expansion. All 141 batches retain
their original non-Y/color hash
`5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30`;
the 4,785 reviewed roots, harvest/save identities, earlier stone contact and wildlife checks pass.

## Evidence and remaining acceptance

- Original Alezhor world suite: **15/15**, including its composed 64/34/35/39/41 fixture.
- Original Alezhor life suite: **13/13**, including ordinary fauna movement and return.
  Both runs preceded the final exact-water hook; the final composed checks below cover that change.
- Terrain expansion **3/3**, shared river ground **2/2**, exact water **3/3**, atlas **8/8**,
  region layout **8/8**. Earlier survey/build-status/streaming/Ibenwood checks also passed **18/18**.
- Final composed scene suite: **5/5**. Contact and loading checks confirm 392 rooted trees, all shrub/stone/gravel supports,
  all 37 posed animal origins and unchanged Alezhor placement after later forest arrival.
  Twenty retained patches / 280,584 triangles retain the same before/after geometry hash:
  `bf807a7744ebb1143ad3f8a52c8e7f49590e5964662e903beeaa92a932f568e2`.
- The two bank journeys use the existing production movement/support/falling/swimming/stamina
  controller harness. The authored bank exceeds the ordinary descending slope and may cause a
  short harmless water landing; acceptance requires real completed entry and exit, normal swim
  stamina cost, zero damage and dry return. No fall cancellation, immunity, relocation or terrain
  flattening is used. Both journeys pass: each has one harmless water landing and zero damage,
  swims 1.0465 / 1.3222 m, spends 1.7333 / 2.0000 stamina and returns dry with 100 health.
  Final traces are recorded in `tests/artifacts/alezhor-integration-review.json`.
- The separate full principal-route controller completes all 26 authored waypoints and return:
  1,984.56 m, 327.43 simulated seconds, no independent restart, blocker, swimming, damage or
  exhaustion. The first strict zero-fall test failed for one 0.433 s dry fall on return beside
  the east estuary: `(-3924.757,922.464)` at 5.6515 m to `(-3927.712,921.361)` at 3.4069 m,
  zero damage. The continuous authored bank reaches slope 0.907, just above the 0.9 fall
  threshold. This occurs mid-leg, not at an artificial fixture corner. The coordinator accepted
  this harmless authored step-down rather than flattening the bank. The final registered test
  passes **1/1**: at most one fall inside the recorded bank, duration at most 0.8 s and descent
  at most 2.6 m, dry landing, zero damage/swimming/blockage, wind 100 and continuous return.
  Terrain, scenery, authored waypoints and controls are unchanged. The original strict failure
  is retained as `tests/artifacts/alezhor-routes-strict-baseline.json`; final traces are in
  `tests/artifacts/alezhor-routes-review.json`. Seven unsafe/incomplete variants fail a pure
  replay of the final acceptance rules against the archived actual journey.
- At the original packet freeze no completed native acceptance or save/Continue journey
  was claimed. Subsequent Full/Fast and final visual acceptance results are recorded below. The exact water query is independent of scene mode; Fast-first shared ground
  and vegetation ordering were exercised by the composed Node fixture.
- `src/dev/checks/alezhor-checks.js` and five separate native endpoint hooks are prepared for Full/Fast.
  They exercise real F8 readiness, a dry trail out/back, both banks, exact native tree/non-Y
  catalogs, actual ground rays, an ordinary partial typed harvest, departure/return, then
  isolated save and reload/Continue with exact inventory and remaining tree stock. Only the
  driver import/golden constants and composed endpoint syntax were checked before launch.
  The first native Fast attempt passes the exact 392-tree catalog but stops at the full scenery
  hash. Diagnostics now include actual total/count/byte size and ordered per-batch matrix/color
  hashes. The same collector reproduces the existing golden byte-for-byte on a small serializer
  fixture and on the independent local Alezhor composition (92 batches, 16,210 instances,
  1,234,107 bytes). The second native attempt localizes the entire difference to the six
  driftwood matrices: every count, every color array and the other 91 matrix arrays are exact.
  The raw capture proves just three differing non-Y coefficients: algebraic zeros from the
  authored Euler `(0,yaw,PI/2)` rotation differ by at most `3.2862e-17`. Horizontal position, scale,
  nonzero rotation coefficients and all colors are exact. Raw Node SHA remains
  `f54da8b1c0bdb753093ea4a6b0793c2334233f52e79c987e02c0c9f282bfa55a`; raw native SHA is
  `9edb3e7f6745dea556f0d884c100835bb215730e8c2c77f4f30f8954ea59fd68`.
  A comparison-only normalization now rounds four algebraic-zero linear slots in this named
  batch only, bounded by eight double-precision epsilons times its basis scale. It is applied
  symmetrically to the unchanged saved Node baseline and actual native arrays; translation,
  all other coefficients and all other 91 batches remain byte-strict. Both raw and canonical
  hashes are recorded. The canonical SHA derived from the unchanged Node composition is
  `ddc039b3d3a214171163859fe8da2f28f3d947a2f7ebc37ec469ada624288bc8`.
  The registered focused comparison tests pass **3/3**, proving the exact three residuals,
  source-array preservation, the named-batch limit, and rejection of meaningful translation,
  scale, rotation and even a `1e-12` coefficient change. Captured arrays live in the tracked
  `tests/fixtures/alezhor-driftwood-native-roundoff.json`. No original golden was replaced and
  no rendered geometry changed. Subsequent Fast movement/harvest/save evidence is recorded below.

Node fixtures ran serially. Root's independent native process could overlap; durations are not
controlled performance benchmarks. Whole-project/full-world tests were not rerun.

## Main integration, 4 October

The corrected frozen packet is mirrored into the desktop working copy: 19 leaves and 49 narrow edits across 19 shared files. The atlas was regenerated and all16 atlas/layout checks pass. Syntax and whitespace checks pass; all461 manifest entries resolve with no new omissions or duplicates. All22 protected unrelated leaf hashes remain exact. The existing dragon/fire code and independent native drivers are retained. Runtime region64 is now available; this initial mirror preceded the final Full/Fast/Continue and visual acceptance results below.


## Native Fast and Continue verified, 4 October 2026

MAIN session **51619** completed **101 initial assertions and 25 Continue assertions**,
explicit exit 0, with no renderer errors. It loaded Alezhor through the real F8 readiness
guard, retained all 392 typed tree identities and 37 ambient identities/homes, preserved
3,529 already-loaded old tree identities/poses, and matched all three independent retained
ground rays. The 92-batch canonical hash is `ddc039b3d3a214171163859fe8da2f28f3d947a2f7ebc37ec469ada624288bc8`
both before and after reload; its raw native hash remains the diagnosed `9edb3e7f...9fd68`.

Ordinary W input walks the dry arrival trail 24.90 m outward and 24.60 m back with no fall,
water or damage. Both authored bank checks complete entry and exit, each with one harmless
water landing, zero damage and a dry grounded return. They swim 1.524 / 1.452 m and spend
2.0 / 2.2 stamina, recovering to 100. No fall cancellation or terrain change is used.

One actual `wood.swing` at white oak `alezhor--4078.733-860.023` grants one `oak-logs` reward
and leaves three logs in the standing tree. Departure to West Izol and return preserve that
stock without duplicate catalogs. The isolated checkpoint, renderer reload and Continue
restore the exact inventory, standing tree/remaining stock, single reward and all ambient
identities/homes, including deferred Alezhor loading after Continue.

Evidence is in MAIN `tests/artifacts/alezhor-fast-before-reload.json`, `alezhor-fast.json`
and `alezhor-fast-final-native.log`. Earlier diagnostic failures remain preserved, including
the launch before the driver mirror; they are not substituted for this completed result.
The combined river job's observed maximum slice is 27.1 ms and Alezhor scenery's 9.9 ms;
these are single-run observations, not controlled performance comparisons.

At that Fast report, Full session **20056** and its five captures were pending.
The completed Full result and remaining visual gate are recorded below. No new
build or native process was launched by the report reviewer.


## Native Full verified; visual classification remains open

MAIN Full session **20056** completes **102 initial +24 Continue assertions**, explicit
exit 0, with no renderer errors. It preserves all **54,676** already-loaded old tree
identities/poses. The 392-tree catalog, 37 ambient identities, all retained ground rays
and the exact canonical non-Y/color hash match Fast both before and after reload.
Ordinary dry walking covers 24.90 +24.60 m without falls, water or damage. The two bank
journeys reproduce Fast's harmless water landings, 1.524 /1.452 m swimming, 2.0 /2.2
stamina spend and safe dry return with 100 health. The same white-oak witness yields
one log after four accepted swings and retains one log in its standing tree; its
actual stock, reward, inventory and fauna identities survive departure/return and
Continue. Stock differs normally between independent sessions; each restores its
own exact saved state.

Evidence: MAIN `tests/artifacts/alezhor-full-before-reload.json`, `alezhor-full.json`
and `alezhor-full-final-native.log`. No controlled timing comparison is claimed.
The coordinator inspected five native views: overview and forest edge are readable;
the gold falls retain a coarse green terraced style limitation. The west-mouth frame
still aims toward the sea-covered outlet rather than showing its upstream channel.
The otter view has a confirmed visible ribbon-edge gap: the inherited forest
edge at `(-3946.7395,868.2003)` draws water at 14.009 m above terrain at 12.673 m;
the Alezhor head edge at `(-3949.1138,869.5711)` draws water at 13.425 m above
terrain at 12.154 m. This initial Full inspection left acceptance pending a bounded bank
correction and native retake. The correction and final acceptance below resolve
that concrete water-contact defect; the style limitation remains.


## Bounded gold-outlet bank repair, 4 October

The otter view's suspended edge is a real bank defect. The original Ibenwood
channel holds its flat bed beyond the narrower water ribbon; at the forest/gold
junction the visible edges stand 1.27-1.34 m above drawn grassy ground. A local
Float32 reconstruction reproduces it; the camera does not explain it away.

The correction runs after the original Ibenwood channel, preserving all river
profiles, ribbon vertices and swimming surfaces while retaining deep pool centers. It raises a
low bank from the exact Float32 ribbon edges along the last 40 m of the forest
river and through the gold gorge, with a ten-metre upstream fade and a fade to
zero before the gravel ford at station 38.5. The outer bank meets the old ground
instead of leaving a dry trough. Nothing changes outside the bounded outlet
box x[-3974.413,-3899.645], z[829.057,916.502]; other rivers, the west stream,
ford, generic paths and remote access retain their previous behavior. The same
retained ground triangulation is used, with no added triangles or draw batches.
Scenery eligibility reads the complete previous ground while final rooting and
collider heights use current ground, so the existing seed/layout remains exact.

The registered scoped test `tests/alezhor-bank-review.test.js` passes **3/3**
(session 60252, explicit exit 0, 41.76 s; no full-world run). It raycasts **440**
actual retained water-edge positions: the worst edge is covered by 0.0180 m.
All **56** outer-bank samples stand at least 0.336 m above the corresponding
waterline. Deep pool centers remain exposed. All **392** Alezhor trees and the
original **92-batch /16,210-instance** non-Y/color hash remain exact, together
with **22,174** loaded Ibenwood tree IDs/species/XZ and all **37** authored fauna
homes. The **16** nearby tree trunk footprints meet the actual drawn ground.
One ordinary novice controller continuously walks 4.677 m and swims 4.127 m
down the repaired bank and back: zero falls/damage, 6.933 stamina spent, dry
grounded return. No teleport, nudge or damage exemption is used.

The west-mouth camera now stands over the dry Alezhor bank at
(-4586,962,5.6740766) and looks upstream to (-4560.5625,940.7625,2.7792836).
The local sampled sightline clears drawn terrain by at least 0.715 m; foliage
readability is confirmed by the final native retake below. The gold falls retain their
authored three sloping drops and plain teal material. This repair does not
claim textured rapids or resolve that visual style limitation.

Evidence: `tests/artifacts/alezhor-visible-water-audit.{mjs,json}` (old MAIN),
`alezhor-bank-review.json`, and `alezhor-bank-review-final.log` (actual final
scoped scene). The final native water-contact and upstream-camera acceptance
is recorded below.
Some submerged center samples on the three sloping chutes rise with the bank envelope (maximum 0.894 m); this is a bounded physical bed change, not an unchanged-bed claim. The retained pool checks exceed 0.7 m depth, and the existing ford is outside the correction.


## Alezhor environment accepted

After the bounded bank repair, MAIN native session **49267** passes **101 Fast
assertions plus 25 Continue assertions**, with explicit process **exit 0** and
renderer **errors []**. Evidence is `tests/artifacts/alezhor-bank-final-native.log`,
`alezhor-fast-before-reload.json` and `alezhor-fast.json`; the previous accepted
Full runtime remains separately recorded above. The final scoped bank check is
**3/3** and the native driver again verifies production movement, swimming,
stamina, the 392-tree catalog, typed partial harvest and exact saved stock/
identity on Continue. No screening walker is substituted for that evidence.

The coordinator inspected both corrected images: the otter is readable and
water meets its banks without an exposed floating ribbon edge; the upstream
west-mouth view shows the continuous stream and seated bank plants. These
results close the concrete bank-contact and camera gates. The plain teal water
material and angular/terraced cliff style remain explicit visual limitations;
acceptance does not claim textured rapids or a broader art redesign.

Alezhor is accepted for its environment scope in MAIN. Together with South
Celder, North Celder and East Izol, this makes **four newly accepted regions**.
The world has 64 registered regions and 67 outside MAIN, including the two
active, unfrozen Ibenal drafts. This does not certify the remaining countries
or the still-open wider R1 aesthetic and Upper Olveth connection review.
