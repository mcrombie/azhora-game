# East Izol frozen delivery intake

4 October 2026. Intake only; the existing R1-R11 review backlog remains ahead of
new-delivery acceptance. This records a third waiting region, not a merged or
accepted environment.

## Packet

Clean `../azhora-game-east-izol`, branch `east-izol`, at `fdc1707` was observed.
It contains the frozen Celder base `136b582`, Celder performance follow-up
`29ca691`, East Izol build `0a47f26`, and the final handoff report. Source and
reported evidence remain Claude's until independently checked. The handoff is
`docs/region-reviews/east-izol-handoff.md` in that checkout.

The build covers East Izol's 27 atlas hexes, its coastal ground, three existing
Presence locations turned into physical mountains, dry gullies, 196 typed trees,
and 41 animals in 13 ranges. It reserves the Hearthstone, Merrath and a small
northeastern flat without building their settlements or story. Provisional ID63
follows the Celders'61/62. No atlas or World Builder edit is included.

## Integration constraints

Preserve the review branch's inventory correction, loading measurements, wildlife
footing fixes, and all existing saved IDs. Reconcile the shared world, terrain,
climbing, language, map and wildlife files narrowly; regenerate the shared survey
from the combined list. Do not transplant a stale shared registry wholesale.

Two Presence summits occupy atlas plains cells at their already established
skyline-prop locations. This is an explicit builder choice and a local landform
exception, not permission to rewrite those atlas cells. Review the visual result
and route character before deciding whether to retain the precise footprints.
The name-only climbing opt-in applies normal walking/climbing restrictions to
the new physical mountains.

The West Izol scenery change suppresses overlapping decorative Presence props.
Confirm all three still appear from the Sightstone and that ordinary travel
between the two halves of the island retains its road and existing people.
Known corner seams near (400,1876.5) and (400,1818.8) belong to the earlier West
Izol terrain and are R10 follow-ups, not automatically regressions in this build.

## Evidence received and work still needed

The report lists final regional26/26, neighbor/shared checks, a 3,097m production
movement route reaching all three summits without swimming/blocking, 11 native
images, and paired single-run Full startup observations. It discloses two
preexisting failures (East Ibenwood language registration and stale Izol bounds),
coarse cliff faces, pale lit triangles and possible off-ground stones.

The delivered route scripts make the previously missing Celder loop reproducible.
The follow-up reports a first Celder ground call reduced from1,231ms to at most
63ms by reading seam tables one edge at a time, with bit-identical terrain on
126,213 points. Independently repeat that evidence on the combined revision;
do not infer renderer Fast performance from Node first-touch measurements.

Acceptance still needs actual rendered-tree/stone/animal contact, native ordinary
travel and controlled summit descents, water/shore crossings, Fast destination
readiness and return, harvested-tree/defeated-animal persistence, and native
visual judgment. Full startup reportedly changed+0.9% cold/+5.7% warm in one
pair; frame times, renderer memory and Fast mode remain unmeasured. A single
pair is not a stable performance guarantee.

Claude's handoff identifies Alezhor as the next build and the fourth waiting
region as the queue limit. Preserve that bounded queue; do not duplicate its
work or start additional speculative regions while these reviews are pending.


## Independent read-only intake, 4 October 2026

The source checkout remains clean at
`fdc1707728128a3cdb29dfac6f8e5be6190dc830`. This inspection read source, tests,
both startup artifacts and all eleven supplied native PNGs. It ran syntax checks
only, plus read-only patch applicability checks. No constructed-world fixture,
Electron process, integration or acceptance was performed.

### Exact packet and shared edits

The isolated delta is **after** Celder-only
`29ca6913a9b437d968850f5afe54726f913bfdb2`, comprising `0a47f26` and the frozen
handoff commit `fdc1707`. It changes 29 files: eleven additions, seventeen shared
files and one generated survey. Celder's performance follow-up is a prerequisite;
it must not be reapplied by transplanting the entire later checkout.

A reproducible byte-preserving packet is prepared at
`tests/artifacts/east-izol-only-packet/`. Its README is the integration map;
`packet-manifest.json` pins every leaf's SHA-256 and records the shared hashes.
`shared-exact-edits.json` contains exact old/new text with context and original
line endings. `01-new-leaves.patch` passes `git apply --check` on the observed
review snapshot. Thirteen shared patches check cleanly; `climbing.js`,
`west-regions-life.js`, `world.js` and the test manifest need manual reconciliation.
These results are a preparation snapshot, not an instruction to apply stale hunks.

The seven directly selectable leaves are:

- `src/east-izol-world.js`, `src/east-izol-scenery.js`,
  `src/east-izol-wildlife.js`;
- `tests/east-izol-world.test.js`, `tests/east-izol-life.test.js`;
- `docs/east-izol-brief.md`, `docs/region-reviews/east-izol-handoff.md`.

The two scripts and two route files are separately exported under `evidence-only/`.
The generated survey is reference-only: append registration centrally, then
regenerate it. ID63 follows the Celders'61/62; all existing IDs and the append-only
seeded region order remain fixed. The shared biome owns its scatter and keeps the
old outland base profile, avoiding a registration-only neighbor height change.

The exact world job is one `regionBuild('eastIzol',[REGION_IDS['East Izol']],...)`
with `{parent:stage,heightAt:groundHeight,renderedGroundHeight:treeGroundAt,colliders}`,
plus the `eastIzol` API field and landmark spread. Preserve the current complete-
world legacy eligibility callback, corrected Izol decks/seams, shared fine-ground
jobs, renderer support composition and native journey hooks. Do not restore the
historical `world.renderedGroundHeight` expression from the delivery.

The wildlife changes are only its import/spread and adding `East Izol` to the
current rendered-footing allowlist. Preserve R4?R11 names and the new starting-
country bands. The West Izol change adds the delivered peak-height condition to
the existing Presence loop; it must coexist with R10's `legacyGy` candidate
checks, actual grounding and stable tree/scatter transforms. Climbing adds the
region by name; it must not overwrite the current controller's fall/collision
fixes. The packet README lists every registry, map, language, tint, native-view
and test-guard edit precisely.

### Source/test findings that affect acceptance

Direct reading of the current authored map and frozen developer export confirms
27 East Izol cells: eleven grassland, eight plains, four hills, three forest and
one mountain; fourteen Csa and thirteen Csb climates. The eastern and southern
Presence cells remain plains at `(9,127)` and `(8,129)`. Their physical peaks are
a declared localized builder choice at the old skyline locations, not an atlas
edit or evidence that broad plains should become a range.

The handoff's route is reproducible, but its supplied `walk-route.mjs` does not
run production support acquisition, falling, stamina or vertical swimming. It
keeps the spawn Y, always allows swimming, nudges blocked X/Z by 2 m, does not
fail a leg that reaches its iteration limit, and exits zero unconditionally.
The reported zero blockage is not contradicted by this source inspection; it
remains collision-screening evidence rather than proof of native ordinary travel
or safe summit descent. Reuse the waypoints with the actual controller and fail
on any nudge, fall or missed endpoint.

The delivered world tests include useful one-metre connectivity and quarter-metre
slope checks. Their constructed trail check uses real scenery/colliders and
asserts endpoints, but also keeps initial Y and does not advance terrain falling.
Both new test files eventually construct an East/West Izol world; the life file
also constructs standalone scenery at module scope. Schedule them serially, even
when selecting individual test names.

The life tests substantively check ecological placement, distinct layouts,
clearance, collision-aware fleeing and return, and marine/flight ranges. Their
scenery footing oracle is deliberately `groundWithRiver + 0.12`, not the actual
Float32 mesh. Non-grass instance origins may be between 1.5 m below and 2.5 m
above that sample. Tree tests check the central trunk line through the declared
base, while scenery sinks its leaning trunk centre 1.1 m; neither measures the
entire trunk footprint or tilted stone/shrub hull against visible triangles.
The combined scene therefore still needs actual root, hull, grass and posed
animal contact probes before any source correction is selected.

These 41 wildlife residents are ambient actors with no attack/defeat state.
Persistence acceptance means stable ambient IDs/homes across departure and return,
plus real tree harvest and inventory reload. The earlier generic defeated-animal
item is **not applicable** to this delivery unless an independently supported
combat actor is involved; no new defeat mechanic or save field is requested.

The earlier corner-seam and known-red labels belong to the builder's old base.
Recheck against the corrected R10 West Izol geometry, especially the Hearth Road,
Sightstone approach, Sea Gate and the East/West line. Do not automatically exempt
a new failure because the old report called a nearby seam preexisting.

### Images and startup evidence inspected

All eleven PNGs listed in the handoff were viewed and hashed in the packet's
`evidence-index.json`. The dome, horn and block have clearly distinct silhouettes,
and the Sightstone image keeps all three visible. The folds/east-bay views show
pocket woodland rather than a continuous island forest. The central reserved
plain and bay strand are visually open; these views give no reason to add towns,
shrines, stock or civilian NPCs to the environment packet.

The dominant faces are very coarse from a walker's height. Bright facets are
conspicuous in the north-arm, Sightstone and coast images; the northern-shoulder
shot has a broad strong highlight that obscures its ground detail. These captures
predate the reviewed Telemonia material-cache correction. Re-capture with the
current matte material before attributing all brightness to East Izol's palette
or reshaping its terrain. The source still uses the shared coarse ground lattice,
so physical-to-rendered agreement on shoulders and cliff feet needs measurement
independently of lighting.

Several stone clusters look suspended away from the mountain faces in the
Hearthstone/gate views. Their source placement uses a centre ground sample and
small vertical lift, without transformed-hull seating. This is a concrete target
for the contact probe, not a measured count of floating stones. The wildlife
closeup shows one flying gull; it does not establish resting colony contact,
hare visibility or dolphin/diving-bird motion.

The two startup JSON files were read directly. Full cache-miss total/ready is
131.404/140.336 s on base136b582 and 132.614/139.931 s on East Izol; warm total is
101.222 versus106.983 s. Both snapshots are the Drent opening after three frames,
with zero loaded wildlife groups and no recorded renderer errors. They do not
measure East Izol frame pacing, Fast readiness, in-region memory or travel.
The reported +0.9% cold/+5.7% warm remains one pair on an older composition,
not a combined-build performance guarantee.

### Alezhor observation and next gate

Alezhor advanced during this read-only intake. The first observation found
`../azhora-game-alezhor` at `fdc1707` with dirty implementation files and no
handoff. The closing observation found committed build
`c042e8680f2ba99e3fdf008116d09423c665feab`, with only the untracked
`docs/region-reviews/alezhor-handoff.md` remaining. That draft still contains
literal `@CAPTURES@` and `@PERFORMANCE@` placeholders; no `tests/artifacts`
directory or final report commit was present. A complete frozen handoff is
therefore **not yet observed**, despite the source build being committed.

The draft reports that the four-country waiting queue is full and Claude will
prepare briefs only until some are accepted. Its further reference to six
World Builder lore edits is an unverified handoff statement, not approval or
action by this reviewer. No Alezhor/World Builder source was changed, copied into
production, tested or accepted here. The packet manifest retains both status
observations so the earlier dirty-base record is not mistaken for current state.

East Izol is ready for bounded integration preparation after the backlog and
Celder gates, not accepted. Next evidence is the delivered26 checks on the
combined source, actual ground contact and controlled island routes, native
Full/Fast readiness/travel/return, isolated harvest/inventory reload and fresh
views of the faces, coast, woodland and all wildlife classes. Preserve the
frozen delivery while making any later corrections on the review branch.
