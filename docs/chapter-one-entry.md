# Chapter 1 entry and battle

The peninsula lesson is the prologue. The opening menu separates Tutorial,
Chapter 1, Developer Start, and Continue. Chapter 1 offers all eleven mercenaries
with no initial selection. Developer Start opens Minora and the full atlas;
starting skills are granted without lesson cards. Learning during play still
announces the lesson.

## Playable sequence

1. Assemble at the Ambroni camp in Moros Plain.
2. Take Marshal Venmor's terms to Solis and choose the Empire or Coalition.
3. Return to the chosen commander. The readiness reply starts the army's march.
4. The army moves independently to the field. The Imperial column places the
   ten other mercenaries ahead of ten legionaries. The opposing force has twenty
   Coalition soldiers. The selected mercenary is the player, never a duplicate NPC.
5. Report the field victory to the chosen commander. The monarchist path sends
   the player to Captain Brulan on the road north of Solis for **Solis, taken**:
   assault the Gate of Sun Horses, defeat its defenders, and report in the Court
   of Oaths. The Coalition path uses the existing **Moros outpost** assault with
   Voss, followed by the envoy's debrief. Neither path can skip its conquest.
6. After the conquest debrief, report in Ambron or to Tulle Barr in Izolveth,
   the main town of West Izol. Voss then offers dispatch-boat passage for the
   Coalition report, using a journey transition rather than controllable sailing.
7. The final city report completes Chapter 1. Chapter 2's assignment remains unwritten.

## Battle prototype

Both NPC armies use matched exchanges with identical health and damage. Attacks
have a wind-up and contact window; simultaneous lethal blows can trade. A seeded
coin flip gives the last pair a small health advantage, so a spectator battle
leaves one survivor with equal odds for either side. This is an authored battle
prototype, not a general army tactics simulation. Player damage uses the ordinary
combat actors and can free a fighter to reinforce another pair, changing the result.

F8 exposes a battle playtest that skips the envoy errand, and a full Chapter 1
autoplay that includes it. Taking manual control remains available. Saves retain
the selected mercenary, allegiance, victory, commander report, and city report.

## Campaign scope

The 6 October campaign-map correction ties territorial changes to actual conquest. Clearing the Solis assault transfers **West Suval to the Ambroni Empire**. Clearing the Coalition's outpost assault transfers **Moros Plain to Izol**, acting for the Coalition; West Suval stays in coalition hands. A field victory or report elsewhere cannot substitute for either capture. The M map reads the existing aftermath capture record, including after Continue. The conquest debrief and final city report remain separate completion steps. Older Chapter 1 saves that skipped the assault resume that unfinished step rather than receiving an automatic conquest.

M defaults to Regions. Geopolitical and Stability respect visited hexes, including their labels and territory inspectors. Knowing a distant region's name or glimpsing nearby terrain does not disclose its controller. The existing developer reveal-all toggle lifts the limit; turning it off restores exploration knowledge without adding discoveries.

Ordinary adventures build Drent, Luscia, Moros Plain, West Suval, Elagos, and West
Izol, plus Isareos for the Minora title panorama. Developer Start and F8's full-world
option retain access to the entire atlas. This does not delete off-route content.
Older regional smoke tests still request the full atlas; Chapter 1's native check
explicitly selects campaign scope.

## Movement and combat direction

The immediate movement change is a useful leap: 8.2 m/s upward velocity under
20 m/s squared gravity, about 1.6 m high, carrying normal sprint momentum. Air
steering allows corrections. Generated low props use their actual vertical bounds
so they can be jumped over. Tall walls remain solid; climbing and fall damage
continue to apply.

Prioritize readable attacks, dependable collision, quick input response, and
movement that changes a fight. Preserve guard, dodge, recovery openings, and
weapon differences before adding more actions. Further tuning should separately
evaluate input buffering, a short ledge-jump grace period, aerial attacks, and
crowd readability. Those are follow-up candidates, not implemented features.

Walking and Running remain separate pending the skill-design decision. A future
Athletics consolidation should migrate existing experience and preserve current
baseline movement speed rather than making new characters laboriously slow.

## Validation commands

`node scripts/launch.cjs --smoke-test --chapter-one-checks`

`node scripts/run-tests.cjs tests/chapter-one.test.js tests/border-chapter.test.js tests/road-checkpoint.test.js tests/terrain-fall.test.js tests/skills.test.js tests/skill-announcement.test.js`

Native checks use an isolated profile and save slot. Their report distinguishes
spectator combat simulation from dialogue and save checks; it is not evidence
that every route has been played by the computer from start to finish.
## Check results (5 October 2026)

The native campaign-scope run passed 27 checks: eleven-choice entry, both army
marches against real world collision, both spectator battles, commander and city
reports, and saved completion restored through Continue. The battle was moved
west of the old stockade ditch so its wider formation has an unobstructed field.
Focused skill, checkpoint, border, falling, and combat regressions passed.
The full computer-driven journey remains to be validated end to end.

## Startup flow repair (6 October 2026)

Full/Fast describes loading timing; the opening choice determines world scope.
The title and campaign retain the smaller war-route build. Developer Start loads
the unrestricted world and enters Minora directly. Continue upgrades the scope
when its saved adventure needs it. New Tutorial/Chapter 1 choices after returning
to the menu reset into campaign scope.

The selected loading mode travels in the current launch URL across renderer
transitions, so these choices never ask Full/Fast again. A fresh desktop launch
still offers the ten-second Full default. The one-use launch action is consumed
before entering play; Exit to main menu and Continue reuse the loaded world.

The Minora panorama receives a coarse terrain horizon covering its full orbit.
It uses the existing terrain samples and does not activate off-route scenery,
NPCs, or travel. Detailed region tiles replace their background tiles on loading.

Native regression: `node scripts/launch.cjs --smoke-test --startup-flow-checks`
Repeat with `--fast-load` for Fast. Both start in actual campaign scope, click the
loading choice, and exercise Developer Start, Chapter 1 selection, Continue across
scopes, return to menu, and Tutorial using an isolated save/profile. Four title
camera views and a Developer Start screenshot are written to `tests/artifacts/`.

Startup verification: all 24 navigation assertions passed in the initial Full
run. That run also exposed river refinement processing the new backdrop's
vertical seams; the backdrop now has its own scene root, excluded from ground
refinement and footing. After that correction, the full Fast sequence passed
24 checks with no renderer warnings, and the targeted Full menu recheck passed
5 checks with no renderer warnings (`--startup-menu-only`). The unrestricted
Full world does not use the backdrop; its successful navigation cycle was not
repeated after this separation. Reports: `tests/artifacts/startup-flow-full.json`
(initial run, retains the warnings), `startup-flow-fast.json`, and
`startup-menu-full.json` (final checks). Twenty focused Node checks passed.

Visual review covered four quarter-orbit views in both modes: city and bridges,
continuous surrounding ground, readable menu, and distant sea blended into fog.
The sea shader now follows the same scene fog as the ground. No new off-route
scenery, NPCs, or gameplay was introduced for the backdrop.
