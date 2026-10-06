# R1: East Lotharn and Varn review

Started 4 October 2026 from `a2e49c3`, on `codex/region-review-2026-10-04`
in `../azhora-game-region-review`. **First functional correction batch verified;
not a complete R1 acceptance.** No Celder source has been copied or edited.

Code and original evidence are frozen in **`bd01a17`** on the review branch. The same
source/test files were copied into the main desktop checkout on 4 October. Its existing
developer-dragon work remains uncommitted and byte-identical (25 protected files checked);
the main test manifest retains all its entries plus the five new review tests. Main HEAD
remains `a2e49c3`; this is a working-copy integration, not a merge or push.

## First correction batch

- Restore a walkable ledge from the eastern peak's third ramp to the eastern chamber,
  then to the low chimney. Keep the existing high chimney, all cave identities, passage
  floors and opening coordinates. Carry the outer rock rim around the new ledge and
  rail both low-chimney doors; Varn's gates and the Slabs remain the admission routes.
- Ground East Lotharn's tree trunks against the rendered mountain triangles across
  their six-sided footprints. Use separately seeded supplementary woodland pockets
  selected by soil, exposure and shelter, while preserving established tree identities.
- Add four interior woodland ranges containing ten deer and boar. Preserve all original
  eighteen animals and use existing woodland retreat/path behavior and species rigs.
- Add limited weathered spurs on northern central/western faces. Keep summit floors,
  ramps, cave corridors and the complete Varn-controlled terrain outside this change.
  This is a local first pass; it does not finish the repetitive skyline/tree-belt work.
- Repair the developer build inventory to list all 131 atlas regions, preserving
  runtime IDs, authored status and closed/unbuilt access rules.

The narrow cave ledge requires a finer rendered patch than the existing 3 m mountain
grid. Its visual mesh must be validated together with the actual movement surface;
passing a controller-only route test is insufficient for acceptance.

## Evidence recorded so far

| Evidence | Result / location |
| --- | --- |
| Clean baseline | `../azhora-game-land`, unchanged `a2e49c3` |
| Baseline native views | `tests/artifacts/lotharn-kemrath.jpg`, `lotharn-north.jpg`, `varn-above.jpg` in the baseline checkout; 1440×900, clean HUD, Full loading |
| Baseline capture log | `tests/artifacts/r1-baseline-review.log`; all three views captured, renderer `errors: []`; PowerShell reported 1 after a GPU shutdown warning; direct native exit was not captured, so these are visual evidence rather than a confirmed clean smoke-test exit |
| Inventory tests | Four focused tests passed: complete names, ordering, preserved status, unbuilt access |
| Terrain tests | Northern weathering bounded and unequal; Varn untouched; summits, ramps and complete cave corridors protected |
| Legacy tree comparison | All 5,567 original IDs/species/heights match clean baseline SHA-256 `faaa49dbb472781d30cd27da1cd55ccb1d35d2c085483774d0829ea08a33cea8`; evidence in review checkout `tests/artifacts/r1-habitat-legacy.json` |
| Original scenery counts | 8,289 tufts, 7,273 crops, 256 rocks and 9 outcrops preserved in the isolated scenery fixture |
| New woodland | 31 separately seeded shelter trees, including six above 280 m; 5,598 trees total |
| Woodland movement | Ten new animals spawned, dry/collision-clear homes; four 15-second pursuit samples, travel 44–59 m, zero invalid footing; `tests/artifacts/r1-habitat-movement.json` |
| Cave movement | Production movement/slope rules traverse both new ledges out and back; eastern openings unchanged; cave-floor save/restore and return checks pass |
| Cave exits | 24 running headings from each of five eastern mouths: no damaging drop in the focused test |
| Wider Varn regression | 26/26 passed before the final corner correction (`r1-varn-world-final.log`); afterward the three affected constructed-world tests passed, including the full eastern flood and 480 physical doorway exits (`r1-varn-caves-final.log`) |
| Sharp-corner regression | 48 real running trajectories pass from the corner center and the former escape point; new focused cave suite 5/5 in `r1-cave-access-final.log` |
| Exterior cave ownership | Wrapper 14/14 and actual eastern entry/save checks 2/2 after fixing lateral release; `r1-cave-entry-lateral.log`. Airborne/roof/mounted entry guards and interior walls remain enforced |
| Actual rendered ground | `lotharn-scenery-ground.test.js` 5/5: 2,000 body samples within 0.09924 m of collision ground, 66 anchors within 0.09736 m, 405 active ridge samples within 0.01998 m, seven ramp-boundary samples within 0.05887 m; no missing surface |
| Habitat and ridge geometry | Eight tests pass, including shelter/soil, safe animal ranges, trunk footprints and joined ridge geometry |
| Final native views | Six ground-level views, 1440 x 900, Full mode; `r1-final-native-review.log`, renderer `errors: []`. Ridge spikes removed, chamber approach visible, trees grounded and a deer visible in woodland. Same post-capture GPU warning and ambiguous PowerShell status as baseline; direct native exit was not captured |
| Combined desktop checkout | 38 checks pass across build inventory, habitat, landscape, cave wrapper and wildlife loading; `tests/artifacts/r1-main-integration-tests.log` in main. CRLF-aware diff check clean |

The first-batch checks above did not include a complete native journey or saved-game reload.
The continuation below adds that evidence, with its source and measurement limits recorded.
Legacy identity comparison must be repeated after any scenery changes. New tests are in
the explicit test manifest. Artifacts are ignored files and remain in the named checkouts.

Known unrelated baseline failure: `south-oremindi-metadata.test.js` expects the older
`sage.*campaign.*unbuilt` prose; current status describes the convergence and separate
cottage. Do not change that expectation merely to make this regional patch green.

## Corrections found during review

The first native inspection exposed a repetitive sawtooth silhouette on the cave rim:
the half-metre grid undersampled the narrow analytic crest by up to 1.18 m. A local ribbon
now follows that crest, clipped at the existing ramp and mouth boundaries. It changes no
collision height. A separate coarse/fine doorway seam was corrected rather than excluded
from the measurements. The new rendered-scenery regression protects both repairs.

Independent review found exterior cave-floor ownership could retain invisible lateral walls
before entering. The wrapper now releases ownership before that side step, lets normal surface
collision/slope checks control the movement, and prevents immediate reacquisition. Passage
walls still apply inside the actual opening.

Native image examples in the review checkout's `tests/artifacts/`:

- `stand-at--986-323--751-720--1-88-0-20-6.jpg`: continuous rim and walkable shelf.
- `stand-at--926-50--748-60--1-14-0-12-2.jpg`: lateral approach to the eastern chamber.
- `stand-at--1030--765-5--2-5-0-12-3.jpg`: preserved ramp/rim junction.
- `stand-at--1485-86--983-86-0-665-0-12-4.jpg`: grounded woodland trees and a deer.

The ridge still reads as a regular retaining edge; ramp ends and cave trim have angular joins,
and the very close camera crowds the avatar. These are recorded aesthetic follow-ups, not
claims that the whole mountain presentation is finished. The broader mountain views also
retain conspicuous cliff rings. Full/Fast timing, native saved-game migration and the complete
regional journey have not been certified by this batch. The latest scoped scenery construction
was 18.57 seconds; it is not a comparative desktop startup benchmark.

## Continued canopy and visible-root review

The continuation from `13448f7` preserves the first batch's 31 shelter trees as explicit
records, so reshaping the soil beneath them cannot rerun their acceptance stream and erase
saved identities. Their IDs, species, heights, trunk scales and rotations stay fixed; their
roots follow the current rendered triangles. The original 5,567-tree identity hash above
also remains unchanged. The sorted identity/species/height hash for those 31 trees is
`8824d1a8f80c236df6ea3739469c4d7490c277073f1073c9a0a9c5ac1a02249d`.

A separate per-cell candidate stream adds coherent groves where actual soil supports them.
The new canopy uses a 1.2 m rooting neighbourhood, 24 m relative shelter/exposure and broad
soil pockets; absolute elevation does not suppress its density. Exposed rock remains bare.
Trunks are separated by 3–4.2 m according to stature, and roads, ramps, balds, cave approaches,
Varn works and existing wildlife homes stay reserved. Candidate coordinates in a cell do not
shift when a different soil decision accepts or rejects a preceding candidate.

The frozen candidate adds **59 trees**, bringing the regional fixture to **5,657 trees**.
They occupy eighteen 80 m tiles, with seventeen trees on the northern shaping side. Twenty-eight
stand below 155 m, twenty-four at 155–280 m, four at 280–350 m and three above 350 m. Their
crown heights vary from 8.86 to 21.61 m across native broadleaf species. This is a soil-led
distribution, not a target density; much of the remaining space is genuinely steep rock.
The northern terrain continuation and the final native views must be judged together before
calling the conspicuous belts resolved.

Validation on this frozen candidate:

```sh
node --test --test-isolation=none tests/lotharn-habitat-review.test.js tests/lotharn-scenery-ground.test.js
```

**19/19 passed in 31.58 seconds**: eleven habitat/geometry checks and eight scoped rendered
scenery checks. The scene fixture builds East Lotharn alone. Actual downward raycasts cover
all 59 new trees, all 31 established shelter trees and 126 original trees on reshaped northern
soil: 4,320 bottom mesh vertices, with the highest root contact 0.029024 m below the visible
surface. Every tested trunk's nearest contact remains between 0.02 and 0.04 m below it.
Both saved-tree hashes pass. The 2,000 walking-footprint samples, 66 anchors, 405 active crest
samples and seven ramp-boundary samples retain their first-batch limits, with no missing
surface. Syntax and CRLF-aware diff checks pass. This runtime includes the regression's
raycasts and is not a desktop loading benchmark.

The eastern chamber contact helper is inserted after its existing collar without changing
random draws, collision, mouth width or walking ground. Its separate visual checks and the
final Full native capture are recorded by the cave/route review; the canopy measurements
above do not claim that an unseen collar seam is fixed.

## Bounded western shoulder continuation

The Full north and Kemrath captures still showed dominant repeated cliff rings.
The next terrain change is therefore a bounded correction of the western peak's
northeast shoulder facing Upper Olveth: x `[-1440,-1355]`, z `[-980,-918]`, with a
15 m edge fade. The first two lift courses remain unchanged (no change at or
below 80 m of raw uplift), as do summit floors, the full 7 m route guards and
their 18 m fade, and every cave corridor. A 2 m survey found 132 samples with
more than 2 m of shaping, about 528 square metres, and a maximum direct addition
of 22.169287 m. This is a visible shoulder correction, not acceptance of the
whole range's appearance. The requested review camera is `(-1300,-1010)` toward
`(-1392,-951)`, pitch `.14`, target offset `14`.

The shoulder also changes Varn's derived brink rims locally. Physical rim
evaluation still follows the actual ground. The scenery-only
`varnLandscapeSceneryDelta` restores the old rim when legacy scatter decides
where to place objects; subtracting the direct landscape height alone would
not preserve the original seeded decisions. The helper is bounded to the new
window plus the rim's four-metre sampling reach.

`node --test --test-isolation=none tests/lotharn-landscape-review.test.js tests/lotharn-scenery-ground.test.js`
passed **13/13 in 45.16 s** after this source freeze. The 5,567 original tree and
31 established shelter identity hashes remain exact, and the 59 new canopy
trees retain their prior distribution. The grounding probe now covers 4,920
bottom vertices, including 156 retained trees on reshaped ground; its highest
contact is -0.029024 m. All 2,000 cave body samples and 405 active crest samples
retain maximum gaps of 0.099234 m and 0.019979 m, respectively. The full-width
western route guards and complete cave corridors pass. The final affected fort
and reachability floods below also pass on this shoulder. Its final native
silhouette capture remains pending.

## Final admission and escape regression

The full pass-fort suite passed **13/13 in 425.94 s** before the western shoulder
continuation (`tests/artifacts/r1-pass-forts-review.log`). After the shoulder and
scenery inverse were frozen, the measuring-ground check and four affected floods
passed **5/5 in 518.18 s**, session 42782, exit 0:

```sh
node --test --test-isolation=none --test-name-pattern="measuring ground|with the gates as built|Varn.s reach|open the gates|nobody is sealed" tests/lotharn-forts.test.js
```

The six-region fixture measures 438,149 points at 1.5 m spacing and eleven caves
with 66 links. With gates shut, the least fall into each southern lowland remains
45.9 m and cannot be survived. Within Varn's controlled reach, neither a walker
by any fall nor a tireless climber reaches Empire ground except by the Slabs;
the Slabs route remains available with a 0.0 m worst fall. Every gate works when
opened, together and individually, and all valleys retain a zero-fall escape
along the northern pass road.

Evidence is `tests/artifacts/r1-final-shoulder-forts.log`. The matching
`r1-final-shoulder-forts-sources.json` records source SHA-256 values; all five
recorded files were unchanged at completion. This is the final affected five,
not a claim that all thirteen were rerun after the shoulder. Independent Node
work and native captures overlapped portions of the runs; durations are not
comparative performance measurements.

## Full and Fast native journey and checkpoint evidence

`src/dev/checks/r1-journey-checks.js` drives the actual developer-travel loading path,
ordinary W-key border and chamber movement, and the production checkpoint and
Continue paths. The driver visits Kemrath, crosses East/West Lotharn, crosses
West Lotharn/Yunethre, travels to Vastos and back twice, enters the eastern
chamber on foot, saves, reloads the renderer, and continues the save. Developer
travel verifies destination readiness; the pass-fort and controller suites
provide the separate geographic movement evidence.

Both runs completed with `ok: true`, renderer `errors: []`, and shell status 0:

| Mode | Initial / fresh-renderer checks | Startup total | Kemrath arrival | Yunethre border |
| --- | --- | --- | --- | --- |
| Fast | 38 / 8 | 11.245 s | 103.008 s, held until ready | 7.357 s, held while destination built |
| Full | 36 / 9 | 127.021 s | 0.453 s, already ready | 4.523 s, already ready |

Startup is the recorded `startup.totalMs`, beginning at the renderer's named
startup stages. It excludes the earlier mode chooser/import offset. The shared
pass-fort job builds both Lotharn ranges, so the East/West crossing is a ready
seam; Yunethre supplies the genuinely deferred ordinary border check in Fast.
In both modes, leaving and returning preserves tree, collider, walk-surface and
landmark counts without duplicates. Cave saves resolve to the existing explicit
safe entrance, restore inventory, and do not infer underground ownership from
saved coordinates.

Before the Full save, the driver restores a valid partial-harvest record for
original tree `lotharn--1331.355--1203.613` (`logsLeft: 1`, `stump: 0`). Its saved
state and original ID survive the fresh renderer and regional catalog load.
Fast was recorded before that additional assertion and verifies its existing
woodcutting state rather than the seeded partial-harvest case. Smoke checkpoints
remain in the isolated memory store and do not touch the user's save slot.

Artifacts are `tests/artifacts/r1-journey-fast.json`, `r1-journey-full.json`, their
`-before-reload.json` files, `.log` files and `.png` captures. These runs preceded
the final western shoulder. Fast used the intermediate canopy; Full used the
final 59-tree canopy before the western shoulder and final cheek taper. Saved
identities and admission were rechecked after those later visual changes.

Measured final-frame evidence before reload:

| Metric | Fast | Full |
| --- | --- | --- |
| Draw calls / triangles | 304 / 743,611 | 369 / 1,397,871 |
| Geometries / textures | 1,260 / 8 | 851 / 9 |
| Used JS heap, initial to final | 240.6 to 341.2 MB | 691.8 to 718.3 MB |
| Raw frame samples, median / p95 | 75, 116.6 / 183.3 ms | 73, 116.7 / 216.7 ms |

Full records a 1440 x 900 viewport at pixel ratio 1. Fast predates viewport
metadata. The frame samples are short offscreen journey observations, with
concurrent work and different candidates; they do not establish steady gameplay
FPS or a paired Full/Fast benchmark. They do show slow frames that remain a
performance concern. Fast's longest measured loader slice was 256.6 ms, prompting
per-job slice instrumentation. The fresh-renderer samples were too early for a
frame series; Full's reported post-reload used heap was 1.336 GB, which warrants
observation rather than an unsupported leak claim.

The initial Fast overview photos retained cave darkness and are excluded from
visual evidence. The test-only `reviewR1JourneyView` now clears cave ownership
before arranging the review camera. Full daylight views are
`r1-full-lotharn-north.jpg`, `r1-full-lotharn-kemrath.jpg` and the corresponding
chamber/ramp `r1-full-stand-at-*.jpg` captures. Those broad views motivated the
bounded western shoulder; they do not certify its later appearance.

## Eastern chamber cliff contact

The old collar samples only front and rear sections. Its fixed outer jamb can
leave sky visible where the intervening cliff cut meets it; the restored
approach also changes nearby contact height. `east-lotharn-cave-trim.js` adds a
small rock contact strip and taper outside the body corridor, with its terrain
edge embedded in the actual sampled ground. The scenery insertion consumes no
random draws and changes no collision, floor, opening coordinates or save data.

The first rear strip did not cover rays grazing the front jamb. Native retakes
localized those rays and a bounded outer cheek covers them. The final helper's
**3/3** tests check above-floor placement, unchanged body/doorway clearance,
actual terrain contact and all six recorded 1440 x 900 slit rays. The last
native retake (`r1-chamber-trim-native.log`) captured both approach views with
renderer `errors: []` and shell status 0, but still showed a tiny triangle before
the final 0.6 m taper was added. The final Full-mode retake now confirms that
the slit is closed while the narrow green approach remains open. Evidence is
`stand-at--926-50--748-60--1-14-0-12-2.jpg` and
`r1-r3-final-native-views.log` (explicit native exit 0, renderer `errors: []`).
The ramp-end fin follows
the existing physical ridge suppression boundary and remains unchanged.

A later isolated PowerShell probe showed that stderr redirected with `*>` can
produce a tool-level status 1 even when the native process exits 0. Earlier
capture statuses with GPU teardown warnings are therefore ambiguous, not proof
of an Electron failure. Future native launch wrappers explicitly record and
return `$LASTEXITCODE`.

## Remaining R1 and next review

The final `lotharn-western-shoulder.jpg` and `lotharn-north.jpg` show the bounded
shoulder variation and grounded woodland, but broad repeated cliff courses remain
prominent. This remains an aesthetic limitation, not a claim that the complete
mountain silhouette is accepted. The chamber contact repair is visually accepted.
Further broad relief work must be weighed against the fortified-face constraints;
it does not block checking the next regional group. The shared-hook integration audit
passes: reversing only the expected R1 camera/API additions, Telemonia drive
hooks and four `main.cjs` insertions reproduces every pre-transplant byte,
including the existing dragon/fire work. The copied R1 API and main handler
match the reviewed source, all relative imports resolve, and the four affected
entry/helper files parse. Evidence is `tests/artifacts/r1-main-hook-audit.json`;
this audit changed no main-checkout file. Admission, northern escape and native
Full/Fast arrival/leave/reload evidence are now recorded above. Any further
fortified-face change must repeat the affected admission/falling checks.

The [R2 review](r2-lotharn-feradom-review.md) now records the Feradom root repair,
West Lotharn woodland wildlife, and the real-controller crest return. Its route
suite passes 2/2: ascent and controlled descent use real collision, falling,
climb input and beginner stamina with zero damage or exhaustion. Descending
requires the real grab/downward input at steep sections; walking straight off
them is not the safe return tested. West Lotharn's South Celder seam remains a
combined-delivery review item.

## Celder and the next build (historical first intake)

Claude subsequently froze the Celder pair at clean `136b582`, including its build at
`e7012d9`. The [intake review](celder-intake-review.md) records scope, evidence and deferred
concerns. Keep both regions queued while the existing review backlog proceeds; intake
does not grant acceptance or integrate the pair.
The next eligible build has a prepared [East Izol brief](../region-briefs/east-izol-environment.md).
Claude has independently begun East Izol in `../azhora-game-east-izol` on branch
`east-izol`, based on the frozen Celder handoff `136b582`. Its own brief and live
regional edits are present. This session has not started a second Claude worker;
the live checkout remains Claude's responsibility until a frozen handoff.


## Current bounded follow-up

The [central-north proposal and candidate report](r1-central-north-face-proposal.md)
records the separate shoulder and ramp-join repairs, now mirrored to MAIN. All
ten final Node assertions pass, preserving 5,462 composed-world tree identities,
rendered roots, cave reservations and Varn admission. Native session 6254 passes
40 checks plus 9 Continue checks, explicit exit 0 and renderer errors []. Its
broad north and grounded side frames did not reveal the pilot adequately; the
clear elevated inspection below now establishes bounded visual acceptance. The longer Upper Olveth connection
and broad western/eastern cliff repetition remain open. The earlier Celder/East
queue paragraph is historical: both Celders and East Izol are now accepted, and
the live ledger records Alezhor review and the observed paired Ibenal draft.


## Bounded pilot visual acceptance

The coordinator inspected MAIN `tests/artifacts/lotharn-north-overlook.jpg`
from native session **73887**, which closed with explicit **exit 0** and renderer
**errors []**. The inspection camera is exactly `(-1270,400,-1090)`, aimed at
`(-1230,285,-1005)`, with no camera pull-in. The frame clearly shows the oblique
earth shoulder and unequal slopes below the bald summit, with established
routes and trees preserved. The bounded shoulder and separate route-join
correction are accepted together with the earlier numeric/controller evidence.

The earlier broad north and grounded side frames were occluded and insufficient
for this decision. The elevated inspection does not conceal or certify the large
repeated cliff courses still visible on neighboring faces. Wider R1 aesthetic
review and the Upper Olveth-to-southern-trailhead connection remain open.
