# R3: Telemonia review

Started 4 October 2026 in `codex/region-review-2026-10-04`, after the first R1
batch at `13448f7`. This is an active review, not an acceptance record.

The existing town, terrace farming, three western watchers and outsider rules
are intentional. Agricultural terrace walls are built structures; do not erase
them while varying the natural mountain scenery. The Treloss outlet and the
Legemum/East Pyros seam already have repairs in current source and require
regression evidence rather than another speculative rewrite.

The 14 isolated `telemon-watch.test.js` checks pass on the review candidate:
challenge, escort, release, hostility on return, territorial pursuit limits,
unseen entry and saved standing. The existing native scenario in
`telemonia-smoke.js` moves the player directly a frame at a time. It is useful
for the inhabitants' behavior but does not by itself prove collision-safe
ordinary movement through the passes.

Two scenery concerns are being measured by the dedicated local fixture in
`telemonia-scenery-review.test.js`: root contact with the actual 1.5 m terrain
triangles, and the duration of the scenery constructor. The production region
loader currently invokes that entire constructor in one synchronous step;
the background frame budget cannot interrupt it. The baseline log is
`tests/artifacts/r3-telemonia-scenery-before.log`. Do not call either concern a
verified fix until the measurements and final construction checks are recorded.

Baseline measured: 36 of the 94 trees have exposed foot vertices, worst 0.286 m.
The entire scenery constructor blocks for 5,468 ms in the local production
fixture. That duration is a direct observation of a single uninterruptible call,
not a comparative startup benchmark. The existing tree identity/species/height
hash is `2b64c19d33672f9a76c60ed86595618ad9119f26b63a049795f0b8686cace68b`.
The planned correction will sample visible triangles for root support and yield
through long construction loops while preserving every seeded object and layout.

The initial outstanding checks are resolved or qualified below. Overall acceptance
remains open while the corrected loader/scenery are integrated and their remaining
long build slices are investigated.

## First verified correction

The scenery now exposes `createTelemoniaScenerySteps`; the existing synchronous
wrapper and Full mode drain exactly the same steps. Fast mode uses the iterator
directly. Large ground, terrace-contour and vegetation loops yield cooperatively.
Tree root offsets use the rendered 1.5 m triangles and the full trunk footprint.

The dedicated fixture passes 3/3: all 94 roots meet visible ground, with the
highest contact 0.030 m below the surface. The original tree identity hash and
every construction metric remain exact, including 181 terrace walls, 43,362
wall stones, 8,006 tufts and 59 batches. Two corrected runs took 5.225 and 5.706
seconds total, split over 30,462 steps; their longest steps were 131.9 and
169.5 ms. This removes the single 5.5-second blocking call but does not yet
meet the 50 ms investigation threshold. The remaining slow steps were during
ground construction, with other review work running concurrently; these are
not paired startup or frame-rate benchmarks.

Artifacts: `r3-telemonia-scenery-after.log` and
`r3-telemonia-slice-profile.log` in this checkout's `tests/artifacts/`.
Per-job loader state now reports build time, longest step and step count so a
subsequent Fast run can identify the responsible region rather than reporting
only a whole-world maximum. The eight loader rule checks pass.

## Ordinary movement and regional checks

The native scenario now optionally drives production W/Shift input and player
heading. Its native caller uses that mode; the old frame-position fallback is
explicitly labeled when used. The Fast input run passes all 25 checks in 397.1
seconds: entry, escort, return hostility, retreat from combat, restored standing,
and the western unseen approach. The western endpoint is approximately
(-2136.2, 1203.1), with highest suspicion 0 and final watch phase `unseen`.
Renderer errors are empty. These are actual movement checks, not evidence of
combat balance; the scenario retains its existing combat-only keepalive.

Artifacts: `r3-fast-input-telemonia-checks.json`, its escort/fight PNGs, and
`r3-telemonia-input-native.log`. The original scripted Fast run also passes
25 checks but is not the ordinary-movement evidence. Earlier redirected-stderr
shell statuses are ambiguous: PowerShell can report status 1 for a successful
native process that emits a shutdown warning. They do not establish a game crash.

The production scoped Telemonia-and-neighbors fixture passes all 19 existing
`telemonia-world.test.js` cases in 168.44 seconds. It retains real neighboring
terrain/colliders and the full relevant pass lattice: gates and no-climb faces,
three-pass access, rim/basin/rock escape, Rothkar route, Legemum/East Pyros joins,
south pass, terraces, washes, scenery and wildlife. Assertions are unchanged;
only unrelated distant countries are excluded from setup. Log:
`r3-telemonia-world-review.log`.

## Native visual assessment

The final Full-mode batch records explicit native exit 0 and renderer `errors: []`
in `r1-r3-final-native-views.log`. Its five Telemonia views are
`telemonia-terraces.jpg`, `telemonia-town.jpg`, `telemonia-belketh.jpg`,
`telemonia-fields.jpg` and `telemonia-way.jpg` under `tests/artifacts/`.

The settlement reads as a dryland citadel surrounded by crop mosaics, orchard
rows, livestock and retaining walls. Belketh remains sparse rocky country with
small wooded pockets. The walled approach and its turnaround are legible. Strong
terrain tiers and sawtooth contact at some terrace feet remain visible; the
grounding/loading correction does not claim to redesign those landforms.
The close escort snapshot is too occluded to count as landscape evidence.

Full construction and the Fast input journey both completed on this candidate.
The existing hostility save/reload check passes. R1's separate Full/Fast regional
leave/return and partial-tree save checks cover the shared loading contract;
they are not a Telemonia-specific harvested-tree replay. Performance observations
here were made with concurrent review work and are not paired benchmarks.
