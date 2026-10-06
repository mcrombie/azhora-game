# East Izol integration review — 4 October 2026

The frozen East Izol build `fdc1707728128a3cdb29dfac6f8e5be6190dc830`,
after the Celder-only base `29ca6913a9b437d968850f5afe54726f913bfdb2`,
is integrated in the review worktree and mirrored into main. Full and Fast
native checks, Continue and the fresh landscape/wildlife/contact views pass.
East Izol is accepted for the terrain, water, vegetation and wildlife scope. The
initial integration review left main and the Claude checkout untouched; root
subsequently applied the verified main mirror.

## Integration and corrections

The three East Izol leaves and supplied tests were copied from the exact frozen
packet. Seventeen shared files received narrow registration, ground, scenery,
wildlife, atlas, language, map and review-view edits. East Izol is runtime ID 63.
The survey was regenerated. Existing Celder corrections, shared fine-ground
jobs, composed legacy callbacks, all reviewed wildlife support regions and the
corrected West Izol harbor support were retained. The existing West Izol Presence
props are omitted where the new physical peaks already replace them.

The first combined scene reproduced a terrain integration defect. East Izol's
`seamlessHanded` added a full continuous-relief correction to ground already
partly corrected by West Izol. This created 1.564 m and 1.162 m internal steps at
`(454.998072,1792.805072)` and `(554.998072,2075.706704)`. Applying only the
remaining `1 - izolSeamWeight` portion reduces both differences across 2 mm to
less than 2 mm. The physical West island is unchanged. Separate cached legacy
sampling preserves the initial combined East scenery eligibility; all 500
pre-review samples around the ten shared edges remain byte-identical.

The scene audit also found unsupported basal flowering lobes. The final visual
correction moves a compound plant only far enough for each basal hull to contact
the actual rendered surface, retaining its shape, rotations, scale, color and
seeded location. It does not lower terrain or move colliders. An earlier trial
required every underside vertex to be buried; that unnecessarily sank cliff
stones and failed the supplied center-height check. That trial was withdrawn.
The final rule retains natural overhangs on rocks that already intersect a slope,
and explicitly rejects completely buried objects as well as unsupported ones.
The 10.27 m downhill stone-edge gap in the first diagnostic was an intersecting
cliff overhang, not evidence of an entirely floating stone.

## Retained identities and actual scene evidence

The final scoped production Fast loader constructed East and West Izol together.
Its independent ground sampler reads retained Float32 triangle positions and
indices, including cut-outs, rather than reproducing the production height
callback or treating distance culling as missing geometry.

| Evidence | Final result |
| --- | --- |
| West Izol saved pines | All 118 original IDs, species, positions and heights exact |
| West Izol seeded scatter | All 35 batches / 5,934 instances: every non-Y matrix entry and color exact |
| West Izol people | All 25 authored positions retained |
| East Izol trees | All 182 first-combined IDs/species/positions exact; every complete trunk foot embedded |
| East Izol scenery | All 53 batches / 14,037 instances retain every non-Y transform and color |
| Basal plant/stone contact | 3,787 objects: no unsupported basal hull, missing surface or entirely buried object |
| Ambient wildlife | All 41 residents have correct posed origins; observer changes do not alter saved simulation state |

The handoff reports 196 trees. The exact frozen 59-module standalone dependency
closure produces 179, while the first integrated production-world scene produces
182 (96 holm oak, 66 stone pine, 11 hawthorn, 8 juniper, 1 tamarisk). These are
distinct measurements; 196 is not asserted as an established combined baseline.
The review pins the actual initial combined layout before changing its ground or
visual footing. No pre-existing West tree is removed or rerolled.

Hashes retained by the committed scene regression:

- West tree catalog: `d2125bf1971885c9a5fe3cbf7b074813124a9dff271b7194a7fcbacae9112cf3`.
- West non-Y/color stream: `137e22c15b058bbdc2e252c987b7bf9e7d20afcebedd826f9e89d68534bf69e8`.
- East tree catalog: `6cd34bb239119981916ce2603999e2dee7aa11f87284838bd68398f5f9093c62`.
- East non-Y/color stream: `aac206a86ecb286236bc4c427039f7625ee210c5efc525e0322922b94532c190`.

## Movement and checks

The supplied `walk-route.mjs` was not used as movement proof: it keeps an initial
Y and nudges blocked positions. The new regression uses the shared Celder real
controller unchanged: ordinary novice walking, actual support, collision,
undergrowth, swimming and fall/health rules. No independent restart, teleport,
position nudge or fall immunity occurs inside a journey.

All six authored East trails, the complete Hearth Road, the arrival connection
and the repaired harbor contact pass outward and back: 5,154.94 m in nine
continuous journeys, zero falls, health loss or swimming, and maximum grounded
rise 0.170 m per step. This includes every mountain's authored walking shoulder.

- `east-izol-routes-review.test.js`: final **10/10**, 35.74 seconds.
- `east-izol-world.test.js`: **14/14**, 57.49 seconds.
- `east-izol-life.test.js`: all eleven behavior/identity cases passed in the full
  225.80-second run, including ordinary walking/running retreat, watched and
  unwatched return, open-sea residents and flight. Its one visual case failed the
  withdrawn deep-seating trial and passed the final focused rerun (**1/1**,
  9.96 seconds). The unchanged expensive wildlife simulation was not repeated.
- `east-izol-seams-review.test.js`: **3/3**, including exact legacy sampling and
  an additional 4,990-sample probe of all eleven shared-edge corner neighborhoods.
- Atlas/survey registration: **12/12**. Source syntax and whitespace checks pass.

The delivered dense continuity screen omits two metres around seam endpoints.
The additional probe records a residual 3.02 cm junction across 1 mm at
`(499.998072,1991.990915)`. It remains below the five-centimetre junction bound
and ordinary step/fall thresholds; it is not described as mathematically smooth.
Elapsed times above are observations, not isolated performance benchmarks.

## Native driver and verified ordinary-input routes

`src/dev/checks/east-izol-checks.js` is a separate driver, now wired and run by root in the
main desktop checkout. It uses the same hook contract as
`runRegionalGroundChecks`: real F8 travel, readiness checks, ordinary held W
input, a production `wood.swing` partial holm-oak harvest with normal stock and
reward, departure/return, isolated save, renderer reload and Continue. Only the
test character receives the required woodcutting lesson/axe. Ambient fauna have
no defeated-state persistence; only their stable IDs and authored homes are
compared across loading and Continue.

The completed Fast run verifies these exact subsegments of the passing Node
journeys using ordinary native input:

| Witness | Outward segment; then return |
| --- | --- |
| Arrival and central interior | `(500,1934)` → `(513,1900)` |
| Corrected West/East Hearth Road seam | `(392,1808)` [West] → `(428,1822)` [East] |
| Headland coastal path | `(748,1745)` → `(734,1762)` |

Useful supplied views are `east-izol-hearthstone-site`,
`east-izol-from-the-sightstone`, `east-izol-coast` and `east-izol-folds`.
For close plant contact, use target `(744.144,1946.661)` at rendered ground +
0.15 m and eye `(747.2,1949.2)` at local ground + 1.8 m; this is a measured
formerly unsupported flowering patch. Inspect contact, slope overhangs and
silhouette with the current matte materials. The prior eleven handoff pictures
do not substitute for a capture of this composed candidate.

The reproducible mirror packet is
`tests/artifacts/east-izol-integration-packet/`. It contains frozen leaves,
byte-preserving shared edit records and hashes. Shared snapshots were captured
before the next Alezhor integration. Regenerate the survey after combining
registrations; never replace shared files wholesale. The separate Celder native
driver hook is excluded from the East-only patch.

## Main mirror (4 October 2026)

Root mirrored the frozen packet into main through 39 narrow shared edits and 13 frozen leaves, plus the independent native endpoint. The atlas survey was regenerated; atlas/survey checks pass 12/12. Syntax and whitespace checks pass. All 455 manifest entries resolve without new omissions or duplicates, and all 22 protected unrelated leaf hashes remain exact. East Izol is available as region 63 in the desktop working copy. Full/Fast native verification and final visual acceptance are recorded below.

## Completed Fast native evidence

Main session **59312** ended with explicit **exit 0**. The final
`tests/artifacts/east-izol-fast.json` records **93 initial checks + 20 after
renderer reload**, both results `ok: true`, and `errors: []`. The companion
`east-izol-fast-before-reload.json` retains the exact expected checkpoint;
`east-izol-fast-native.log` records the explicit process exit. These artifacts
were read back for this report.

All three W out/back legs above reached their endpoints with ordinary support,
collision and fall rules: **192.30 m total**, dry, without a fall or health loss.
There were no construction waits within these six walking segments. F8 travel
and post-Continue re-entry did exercise the actual Fast readiness gate.

Two accepted production swings at holm oak
`east-izol-476.392-1939.620` yielded **one `holm-oak-logs`**, left **one log of
stock** and a standing tree (`stump: 0`), and recorded the normal experience
reward. Departure/return and isolated save/renderer reload/Continue retained
that exact partial stock and the inventory reward once. Continue first restored
the supported West Izol harbor departure, then real F8 travel returned to East
Izol. All **182 East tree identities/species/coordinates** matched the reviewed
catalog digest `3f95b77e`; all **41 ambient IDs/species/authored homes** rebuilt
consistently. Ambient actor positions or defeated states are not persistence
claims. No duplicate tree, collider, landmark or support was introduced.

Root inspected all four Fast landscape JPGs: Hearthstone site, Sightstone,
coast and folds. The composed scene shows distinct headlands and wooded pockets,
matte coarse cliff faces, and no new obvious floating roots in those views.
This is a bounded visual assessment, not exhaustive contact or wildlife review.

Full native session 41822 and its close wildlife/contact views subsequently
completed; the final evidence and acceptance decision follow.

## Full native and environment acceptance

Main session **41822** completed **90 initial + 19 reload checks**, both results
`ok: true`, with `errors: []` and explicit **exit 0**. The final
`tests/artifacts/east-izol-full.json` and `east-izol-full-native.log` were read
back for this report. Its three W out/back legs total **192.30 m**, dry and
without falling or health loss. One normal production swing yielded one holm-oak
log and left two logs of stock on the standing witness tree; this run's actual
stock and exact single inventory reward survived departure, reload and Continue.
The reviewed 182-tree catalog and all 41 ambient IDs/species/authored homes were
retained, without duplicate supports or rewards.

Root inspected the four additional Full views: the interior hare and resting
gull colony are grounded and legible in natural poses, the surfaced dolphin is
readable, and the flowering plant contacts the steep drawn cliff face. These
are paused visual checks using natural simulation ticks, not independent proofs
of wildlife encounter or retreat behavior; the supplied behavior tests provide
that separate evidence. The coarse matte cliff style remains a visible stylistic
limitation and is not described as smooth or photorealistic.

The Full log also contains a Chromium GPU command-buffer teardown diagnostic
(`GPU state invalid after WaitForGetOffsetInRange`) **after the complete success
report**. It is recorded separately from the empty runtime renderer-error list;
the process still exited 0. No missing frame or failed journey is established by
that shutdown diagnostic.

**East Izol's terrain, water, vegetation and wildlife environment is accepted**
on this corrected main candidate, with Full/Fast, normal movement, harvest,
Continue and the eight inspected landscape/wildlife/contact views covered.
This accepts the environment scope, not unbuilt towns, inhabitants or story.
