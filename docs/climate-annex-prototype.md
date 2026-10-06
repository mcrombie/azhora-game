# A Waiting Room for Climates

Review draft, 6 October 2026. One detached, optional Azhora experiment. Nothing
here modifies the novel or establishes shared history, geography, or magic rules.

## Launch, reset, exit

- Double-click `Open Climate Annex.cmd`, or run `npm run prototype:climate`.
- In the game, F8 → **Prototypes** → **Climate Annex Prototype** opens the same scene.
- WASD moves; Q/E are diagonals; Shift/Tab runs; Space jumps. Hold RMB and drag
  to orbit the third-person camera; scroll to zoom. F inspects, talks, and moves
  the partition. F or Continue advances dialogue; Esc dismisses it.
- **Reset scene** restores the arrival position, original screen placement and
  leaking conditions. **Exit to main menu**, or F at the roadside exit, disposes
  the scene and reloads the ordinary title flow. The normal world must load again.
- Save the regular adventure before launching from F8 if you want to retain
  unsaved play. The prototype deliberately does not save that context or itself.
  Continue on the title screen resumes the existing saved adventure.

## What was built

A woodland road reaches a small court receiving annex. The heated pocket has
thick ceramic walls, a permanent low canopy, felt lining and a stove. A deep
slate recess with projecting masonry shades the frost-coated bench. Partial
mist-glazed screens, a half-hood, condensation tracks, slatted flooring and sill
downpipes enclose the humid chamber. These accommodations retain open approaches.

Runoff from the bench and humid chamber joins a channel across administration.
The clerk works on a raised wooden perch with a low approach step, sheltered
forms, a ledger hood and a small task lamp. Worn stone flags and a dry central
runner replace the pale uninterrupted floor. Existing bureaucratic signs remain,
reduced within the recesses so the architecture carries the environmental cues.

The screen slides 2.4 metres along a brass guide. Repairing its position stops
the warm draft, its light spill onto one thawed patch, and the dripping. Frost
returns to that same patch and its icicles; the emissary relaxes. Both characters respond differently afterward. Helping
is optional; there is no reward, combat, faction change or persistent quest.

Only the unnamed attendant and visiting emissary are active NPCs. At the author's
explicit request for this visual revision, the blank slate was replaced with a
provisional, hatless, unarmed goblin: muted olive skin, pointed ears, a broad nose
and plain work clothes. A bent reading posture and a repeating stamp on a form
convey the job. This is a new incidental design, not a portrait of a named
manuscript character or a claim about canonical goblin appearance. The emissary
retains enclosing segmented armor with only amber eyes exposed. Armor color,
shaping and gestures remain provisional.

Roof cutaway and the entrance-wall cutaway keep the ordinary player camera
usable indoors. Rotation back toward the entrance restores the wall. Effects
are bounded local particles, not a thermal simulation. No new dependencies,
services, asset pipeline, atlas entry or regions were added.

## Files and isolation

- `src/experiments/climate-annex/climate-annex.js`: detached renderer, existing character/animation and
  movement/collision modules, third-person camera controls, F interactions,
  lifecycle and temporary UI.
- `src/experiments/climate-annex/climate-annex-world.js`: geometry, models, physical colliders and effects.
- `src/experiments/climate-annex/climate-annex-state.js`: small nonpersistent interaction sequence.
- `src/experiments/climate-annex/climate-annex-dialogue.js`: all original editable dialogue.
- `src/dev/checks/climate-annex-smoke.js`: native walkthrough.
- `src/boot.js`: opt-in scene branch before importing normal game composition.
- `index.html`, `src/main.js`, `main.cjs`, `package.json`: launch/test entries.
- `scripts/public-file.cjs`: shared private-file serving guard; applied to the
  main game, startup profiler and campaign UI HTTP hosts.
- `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `scripts/build-web.mjs`: reference rules,
  build safeguards and exclusions. Package file selection is explicit.

No normal save or progression system is imported by the scene. Reset stays in
the same temporary scene. Exit cancels animation, aborts all registered input
listeners, disposes models, geometry, textures, materials and WebGL resources,
then navigates back to normal boot. Existing unrelated working-tree edits remain.
No commit, merge, push or deployment was performed for this experiment.

## Source and invention

Source consultation confirmed climate-based emissaries, a reptilian visitor
dependent on warmth-retaining armor with visible amber eyes, an uncertain palace
location, and administration mixed with precarious court diplomacy. The annex,
both particular roles in this scene, repair, layout and every line below are new
provisional game inventions. No source passages or unrelated plot are included.
Detailed contextual reading notes remain private.

## Complete original dialogue

**Attendant, before**

“The hot delegation is losing its warmth. The frost delegation has not arrived,
and already its seat is melting.”

“That insulating screen belongs across the brass rail. Someone moved it so I
could reach the forms. Now I can reach the forms, but they are wet.”

**Attendant, after**

“There. Two climates, each keeping its own complaint.”

“I shall record this as an adjustment to the seating arrangements. Maintenance
requires another signature.”

**Emissary, before**

“I was told this seat had been prepared for me. My armor is keeping what warmth
it can.”

“I would prefer not to make my discomfort a matter for the court. The screen
would suffice.”

**Emissary, after**

“Yes. That is a room I can wait in.”

“You have my thanks. There need be no announcement.”

**Inspection text**

- Heat, before: “Warm air escapes through the open seam. The receiving stove is
  working; the room is not keeping its heat.”
- Heat, after: “Warm air rises inside the alcove. The heavy screen meets the
  felt-lined jamb.”
- Frost, before: “Meltwater falls from the waiting bench into a hastily placed
  gutter. Its drain runs under the attendant's desk.”
- Frost, after: “The dripping has stopped. Frost begins gathering again along
  the edge of the vacant bench.”
- Humidity: “A perforated pipe feeds the humid chamber. Slatted flooring carries
  runoff to a channel; a little bridge keeps the paperwork above it.”

## Private reference and protections

Snapshot:
`C:\Users\Michael\Programs\typescript\azhora-game\reference-private\2026-10-06_Journey_through_Cromb_Coo_Coo_FIRST_DRAFT.pdf`

SHA-256:
`d59a1b33898fcb2fbf13cc6b71b97903e44ef50fc6ad32b1433193c0727ff983`

Copied byte for byte; the supplied original was neither moved nor modified.
The private directory also contains a page-labelled extraction, short source
note and integrity record. `git check-ignore` verified every actual file;
`git ls-files --cached` returned no private files. The checked local Git history
contains no PDF or private-folder entries. This is a local-history check, not an
audit of external copies or previously published remote history.

The snapshot, extraction and source note have Windows per-file read-only flags.
Those flags deter ordinary accidental writes but are not encryption or an ACL:
the account owner and administrators can read them and remove the flags. Standing
instructions govern future edits; no broad machine permissions were changed.
The ignore rule is not a lock. HTTP denial and build/package exclusions are
separate technical protections. Already-running old app instances must restart
to use the updated server guard. Third-party generic servers run at the repository
root are outside these guards; serve the generated public build instead.

## Verification and screenshots

Commands:

```text
npm run test:climate:desktop
node scripts/run-tests.cjs tests/climate-annex.test.js tests/private-reference.test.cjs tests/game-state.test.js tests/loading-choice.test.js tests/checkpoint-store.test.cjs
node scripts/build-web.mjs --out tests/artifacts/climate-web
npm pack --dry-run --json --ignore-scripts --cache tests/artifacts/npm-cache
```

Initial implementation results: 16 native desktop checks and 24 focused Node checks passed. The
exit capture confirms return to the fully loaded Minora title menu. Original and
snapshot SHA-256 values were rechecked at handoff and match the recorded value.

Native checks walk the physical scene to both NPCs, frost and humidity, operate
the screen, verify a changed response, reset twice, dispose and reenter, and leave
before helping. They check a saved-progress sentinel and the real HTTP denial.
The build and package preview contain no private folder or manuscript PDF.
Game/test code has no private-reference runtime imports. The server prevents the
running prototype from reading those files even while they exist locally.

Actual player-camera captures, inspected during development:

- [Exterior](../tests/artifacts/climate-annex-exterior.png)
- [Interior layout](../tests/artifacts/climate-annex-interior.png)
- [Emissary](../tests/artifacts/climate-annex-emissary.png)
- [Attendant and dialogue](../tests/artifacts/climate-annex-attendant.png)
- [Humid bay](../tests/artifacts/climate-annex-humidity.png)
- [Before moving the partition](../tests/artifacts/climate-annex-before.png)
- [After moving the partition](../tests/artifacts/climate-annex-after.png)

These artifacts are local and ignored by Git. The walkthrough uses the same
movement/collision functions and interaction handler, with deterministic walking
for test speed. It is not a human playthrough of the entire campaign. Keyboard movement and jump handlers, camera clipping and text readability were
checked within this small scene; camera angles were set through test hooks,
not a manual mouse playthrough.
Touch/controller controls are not implemented. The manuscript was consulted as
page-labelled extracted text; this was not a full editorial or PDF-layout review.

## Visual revision review - 6 October 2026

The visual revision is complete; development stops here for review. No new NPC,
quest, reward, climate simulation, high-resolution asset or dependency was added.
Dialogue and the encounter state sequence are unchanged. Movement inputs and
speeds are unchanged; the existing grounding follows the new low clerk platform
so feet do not sink into the boards. A negative initial animation time delta is
clamped to zero, preventing an intermittent draft-curve rendering error exposed
by the visual pass. The native check now fails on renderer errors.

Final revision checks: **23 native desktop checks and 5 focused Node tests passed**.
The native walkthrough reaches both NPCs and both inspection bays, repeats the
bay approaches after sealing the partition, verifies the warm spill and dripping
stop while the same frost patch returns, checks the stamp motion and raised
platform, resets, disposes, reenters and returns to the loaded main menu. The
saved-progress sentinel and actual HTTP private-reference denial also pass.
The manuscript snapshot's SHA-256 still matches the value above; the snapshot
and extraction remain read-only and ignored by Git, with no tracked private files.

[Open the before-and-after image comparison](../tests/artifacts/climate-annex-comparison.html).
It contains seven paired views captured before editing and after the final pass:
road approach, interior, heated alcove, humid chamber, clerk station, and the
partition in its unresolved and repaired states. Each pair uses the same player
waypoints, orbit, elevation and zoom through the normal third-person camera.
Animation phases are not synchronized. The additional
[clerk work view](../tests/artifacts/climate-annex-visual-after/attendant-work.png)
shows the form, stamp, protective hood and perch without a dialogue overlay.

Visually inspected: less dominant pale floor, readable warm/cold material and
lighting differences, permanent shelter below the roof cutaway, condensation
and sill runoff, dry circulation across drainage, provisional goblin silhouette
and work posture, and the repaired frost edge with no remaining draft or drips.
The low-poly heat wisps remain stylized visual cues. The walkthrough drives the
same collision and interaction handlers; it is not a full manual campaign test.
No commit, push or deployment was performed for this revision.

## Disable or remove

Normal play never selects this scene. To hide the experiment, remove the F8
button and its `src/main.js` handler, and stop using the direct launcher. Complete
removal also removes the `scene=climate-annex` boot branch, five annex modules,
their manifest tests, npm/desktop test entries and launcher. Preserve the private
reference protections and the reference files themselves. Removing the experiment
is not authorization to alter the manuscript snapshots.
