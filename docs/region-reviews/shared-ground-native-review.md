# Shared regional ground: desktop travel and reload

4 October 2026. Main desktop checkout on `a2e49c3` with the reviewed, mirrored ground corrections. These checks exercise shared Suval, Telemonia and West Lotharn terrain and West Izol's shore. They do not certify every environment or cover Claude's unintegrated Celder/East Izol deliveries.

The driver is `src/dev/checks/regional-ground-checks.js`, exposed only by the existing test harness. Run `node scripts/launch.cjs --smoke-test --fast-load --regional-ground-checks`; omit `--fast-load` for Full. The launcher uses its isolated smoke checkpoint, reloads the renderer and calls Continue. The user's normal save is not used.

## Fast result

The final Fast run exits **0**, with **134 initial assertions, 22 reload assertions and no renderer errors**. Evidence is in the main checkout's `tests/artifacts/regional-ground-fast.json` and `regional-ground-fast-native.log`.

- Real F8 controls travel to Luscia, Gala and South Mithala before their neighboring detailed scenery. Required shared ground is ready before arrival. Later West Suval, Telemonia and West Lotharn loading reuses the same fine mesh objects and leaves existing tree heights unchanged.
- Actual retained terrain raycasts agree with the public rendered-ground sample at seven reference points. Gala's first reference belongs to **Treloss ground**; the other two belong to **Telemonia ground**. They are explicitly distinguished.
- Real W input covers about **20.4 m outward and 20.1 m back** at West Izol's harbor, with no falls, damage or water entry.
- Departure and return add no duplicated trees, colliders, walk surfaces or landmarks. The visited catalog contains **16,376 unique tree IDs**.
- The isolated save contains a partly harvested Luscian oak and an extra three-stick inventory witness. A new renderer restores the exact inventory and unloaded-region woodcutting state. Returning to Luscia resolves the same tree identity and preserves its partial harvest.

Earlier failed native attempts are retained. The initial driver incorrectly required every Gala reference to hit a mesh named `Telemonia ground`. A later diagnostic proves the first location is the already-authored Treloss patch, with all 41 Telemonia meshes visible but no Telemonia triangle at that point. Neither coarse-overlap speculation nor distance culling explains that result. The correction is to the test's surface identification, not to terrain geometry or its assertions about actual height. It now explicitly requires both Treloss and Telemonia coverage.

## Performance observations

First F8 waits in this run were 36.4 s for Luscia, 26.4 s for Gala and 57.3 s for South Mithala. This run overlapped independent review fixtures and includes dependency construction; these are observed waits, not isolated benchmarks. Several existing settlement builders exceed the plan's 50 ms investigation threshold. The largest was Telemonia town, **1,142 ms in one construction step**. Its bounded generator correction is recorded separately and was not present in this Fast result. Varn, Caricas settlement, West Suval and several smaller jobs remain performance follow-ups.

The physical three-seam correction and targeted Luscia/Moros wildlife additions were still in the review checkout during this earlier Fast run and are not silently included in its evidence. A final Fast run on the mirrored packets is recorded separately below when complete.

## Full result on the combined correction packets

The subsequent main Full run exits **0**, with **121 initial assertions, 20 reload assertions and no renderer errors**. It includes the final physical seams, wildlife additions and Telemonia town generator. Evidence: `tests/artifacts/regional-ground-full.json` and `regional-ground-full-native-final.log`. Its catalog has **54,373 unique trees**, 100,879 colliders, 24 walk surfaces and 420 landmarks; travel introduces no duplicates. Both harbor legs complete with zero damage. The new renderer restores the inventory witness and partial oak harvest exactly.

Nine final captures were inspected. Dinelv's pass remains readable and the unintended glossy terrain facets are gone. Heth stones meet the ground; tilted slabs can still cast a shadow beside their supported end. The Vaellir river margin, Mithala braid and Telemonia fields read clearly. The Mithala fen view remains visually close to ordinary plain, and Selemis's strand wrack looks too evenly spaced from above; these are aesthetic follow-ups, not hidden acceptance claims. The first Luscian wildlife camera is obscured by the player and does not verify the deer; the Moros view shows a hare mid-hop. Two frozen wildlife framing views were added for the final Fast run.

This is a representative combined ground/loading/save check. It does not replace every regional route or certify all environments. Caricas construction was split into a generator after this Full run; its final native timing is part of the next Fast check.

## Final Fast result on the mirrored packets

The final Fast run exits **0**, with **134 initial assertions, 22 reload assertions and no renderer errors**. Evidence: `regional-ground-fast.json`, `regional-ground-fast-before-reload.json` and `regional-ground-fast-native-final.log`. The previous result is retained as `regional-ground-fast-before-final-packets.json`. This run includes the physical seams, habitat additions, Telemonia streaming and Caricas streaming. The visited tree catalog still contains 16,376 unique identities. Real harbor walks, later-neighbor mesh reuse, exact inventory restoration and partial oak restoration pass again.

Native job measurements now show `telemoniaTown` at **10.1 ms maximum** over 13,614 steps (previously 1,142.4 ms in one step), and `caricasSettlement` at **8.6 ms maximum** over 218 steps (previously 246.6 ms in one step). Total town work is still about 1.275 s and 0.251 s respectively: the improvement is shorter uninterrupted work, not removing the content. These are individual observed runs under concurrent review load, not controlled FPS benchmarks. Varn remains the largest observed step at 199.5 ms before its subsequent scoped slicing correction.

The final frozen wildlife captures show the Luscian hind grazing under the copse and a Moros hare in open grass; both were inspected. The hare is captured during its normal hop, so the image is not substituted for the independent ground-origin/pose checks. New views are `starting-luscia-deer` and `starting-moros-hares`. All main native sessions are closed after explicit exit 0.

## Celder integration: initial native evidence

Both Celder countries are now mirrored into the desktop working copy, bringing its registration to 62. The first combined Fast journey has completed 163 assertions with no renderer errors before renderer reload. It proves South-first retained West Lotharn ground and North-first shared Mithala water readiness, actual visible river support, later reuse, safe harbor travel and no duplicated catalogs. Reload is still running; this paragraph is not the final result.

Seven captures were inspected. South Celder has open grass swells, localized foothill trees and a visible buffalo herd. North Celder shows both river margins and the deliberately open western plain. The Selemis hollow now has thin, irregular broken wrack patches rather than the earlier repeated brown mounds. The large smooth mountain faces in the Celder backdrop remain an existing neighboring-range aesthetic limitation.

This initial driver persists a Luscian oak and inventory witness. A final native extension will separately exercise a Celder river crossing with real input and a Celder tree harvest/save/Continue; those are not inferred from these screenshots or the existing representative save test.

The initial Celder-composed Fast session completed with explicit exit 0: **163 initial assertions and 22 reload assertions**, no renderer errors and **16,412 unique tree IDs**. Evidence is preserved as `regional-ground-celder-initial-fast.json` and its before-reload counterpart so later enhanced checks do not erase this result.

## Enhanced Celder native Full result (4 October 2026)

The main desktop Full run passed 198 initial assertions and 30 Continue/reload assertions, with explicit exit 0 and no captured renderer errors. It uses the final river-input/harvest extension, not the earlier screenshot-only Celder run. Both real W-input river legs complete with no falls or damage. Each crosses about 7.35 m under the normal swimming rules; minimum stamina is about 87.60 and it recovers to 100 on the dry bank.

Production wood.swing harvested one white-oak log from tree `south-celder--2640.689--566.124`, with its ordinary experience reward and three logs remaining. Departure, save, renderer restart, Continue and return preserve the exact inventory, partial stock and stable ambient wildlife identities/home records. Ambient residents have no defeated-actor save and are not represented as a combat-persistence test. All 54,494 registered tree IDs are unique; travel introduces no duplicate catalogs.

Evidence in main tests/artifacts: regional-ground-celder-final-full.json, regional-ground-celder-final-full-before-reload.json and regional-ground-celder-full-enhanced-native.log. Chromium emitted a GPU command-buffer diagnostic while shutting down after the completed result; the process still exited 0. This is recorded separately from the empty renderer-error list. Fast-mode enhanced validation is running; final Celder acceptance is still pending that result.

## South and North Celder: environment accepted (4 October 2026)

Both regions are accepted for terrain/wildlife integration into the main desktop build, following the corrected combined controller/scene fixture, seven inspected native views, Full native 198 initial + 30 reload assertions, and final Fast native 216 initial + 32 reload assertions. Both native processes exited 0 with empty renderer-error lists. This accepts the two environments, not their future towns, story or the whole R1-R11 backlog.

The Fast retry crosses and returns through the actual shallow arm, spends ordinary swimming stamina (minimum about87.33), recovers to100 on dry ground, harvests the same typed white oak through production wood.swing, and restores that run's exact partial stock, inventory and stable ambient identities after Continue. The 10.719-second Mithala readiness pause holds the character safely. The test re-presses W afterward because the normal loading overlay clears input. The earlier failed test and screenshot are retained as celder-fast-border-wait-failure.*; its timeout was a test-input oversight, not proof of a blocked river. No gameplay support or movement rule was relaxed.

Evidence: regional-ground-celder-final-{full,fast}.json and their before-reload copies, regional-ground-celder-full-enhanced-native.log, regional-ground-celder-fast-resume-native.log. Full's Chromium shutdown diagnostic remains recorded above. Full ran before East Izol was mirrored; final Fast includes the East Izol candidate registration, which remains separately unaccepted. The earlier scene fixture verifies the continuous long journeys; these native checks verify representative ordinary input, loading, real harvesting and persistence.

The large repeated mountain shelves visible beyond Celder remain a neighboring Lotharn aesthetic limitation under R1/R2; Celder acceptance does not close that work.
