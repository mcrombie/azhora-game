# Day and night atmosphere experiment

The separate [adventure-clock opening rehearsal](shared-clock-opening.md) connects
this atmosphere to elapsed adventure minutes, with a 24-minute solar cycle, from Taleth's briefing through the
first Caricas aftermath. The ordinary F8 lighting preview described below
remains independent of the normal campaign clock.

12 October 2026. Optional in the Lizeemi War world. This is an atmosphere trial,
not a replacement for campaign time or the wider day/night gameplay plan.

## Trying it

Leave Taleth's chamber, press **F8**, then **Open sky preview** under **Day and
night experiment**. Choose **Dawn**, **Noon**, **Dusk**, or **Night**. **Run cycle**
advances the sky; **Hold sky** freezes it. Choose a **24-minute** cycle or the
accelerated **1-minute demo**. **Close preview** restores the ordinary lighting.

The control stays available while walking outside and at the lookout. It hides
during conversations, menus, loading and combat. Preview time pauses in those
menus, throughout Taleth's tower including the lookout, during combat, and when the window loses focus.
After reading, movement resumes time outside. No time accumulates while paused.
Very long render/loading stalls are capped rather than producing a sudden jump.

The preview begins disabled and is temporary for the current session. It never
writes the campaign clock, replay commands, NPC schedules or save format. War
dates continue to use the existing strategic timing. This deliberately leaves
the decision about a shared world clock for a later pacing pass.

## Visible scope and cost

- A camera-centered sky gradient, an east-to-west sun, Sova and Vel, and stars.
- Warm dawn/dusk and blue moonlight with a floor for road and character visibility.
- Seven fixed lantern sites at Minora's stable/gate approaches and Caricas's court.
- Existing scene sun and hemisphere lights are reused. Lanterns use three
  instanced batches and at most two nearby point lights, without shadow maps.
- No extra region streaming, textures, post-processing, AI or shadow passes.
- Disabling removes every added draw call and restores the current room's light
  colors, intensities, direction, background and fog. Existing fog distances stay
  unchanged, including the wider lookout view.

The sky is 968 triangles plus 224 star points at most. Each lantern is 104
triangles. Not all celestial bodies are above the horizon or on screen together.
Light counts, geometry and frame samples are recorded in the native report;
offscreen frame timings are diagnostic, not a promised frame rate on every device.

Moon phases, seasons, weather, sound changes, sleeping and NPC/animal schedules
are not implemented in this experiment. Sova and Vel currently repeat fixed
display orbits. Essential characters and combat rules do not change at night.

The Lizeem water shader still uses its own daylight-colored base and highlights;
the night river is consequently brighter than the surrounding scenery. Before
promoting the preview, give live water and the baked lookout water a shared
illumination uniform, applied before fog. Newly streamed water should inherit
that value and disabling the preview should restore it to one. This avoids
searching the scene or rebuilding materials every frame.

## Verification

```powershell
node --test --test-isolation=none tests/day-night.test.js tests/day-night-lanterns.test.js tests/tower-opening.test.js tests/war-checkpoint.test.js tests/war-autoplay.test.js
node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --day-night-checks
```

Append `--day-night-combat-only` for the shorter combat capture and paired
Caricas performance check. This still prepares the real exterior, then compares
disabled/night/disabled/night with the same paused camera and scene. Results
are written to `tests/artifacts/day-night-combat-checks.json`.

The native check uses an isolated profile and memory-only saves. It captures
the same Minora and Caricas cameras under original lighting, dawn, noon, dusk and
night; separate sunset, moonrise and allied-combat views check visibility. It
also checks the real preview controls, pause/focus/dialogue behavior, tower entry
and exit, campaign/save isolation, and bounded rendering additions.

Artifacts: `tests/artifacts/day-night-checks.json` and `day-night-*.png`.
Implementation: `src/experiments/day-night/`; the exploration host supplies only
the active/exterior context, camera and existing lights.

The first native comparison added seven draw calls at night: 195 to 202 in
Minora and 231 to 238 in Caricas, with 1,380 and 1,276 additional triangles
respectively. Disabling restored the exact original draw and triangle counts.
The subsequent paused Caricas comparison measured median frame intervals of
21.1 / 23.1 / 22.6 / 21.7 ms for off / night / off / night. Corresponding p95
intervals were 30.4 / 43.8 / 32.5 / 38.8 ms. Typical frame cost remained close in
this short local sample, but the night blocks had slower outliers; this is not
evidence of zero cost or a guarantee on another device. The corrected midnight
combat screenshot frames all seven soldiers, and help/pause plus practice exit
passed without altering the saved campaign.

The focused model checks passed, along with campaign/tower regressions and the
source layout/module checks. A broader existing region-sky check still fails
because East Oremindi Mountains has a custom sky missing from that test's
allowlist; this experiment does not modify that region or its sky metadata.
