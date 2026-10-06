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
5. Report a victory to the commander, then to the representative in Ambron or
   Tulle Barr in Izolveth, the main town of West Izol. Voss offers a dispatch-boat
   passage for the Coalition report. The boat currently uses a journey transition,
   not a controllable sailing sequence.
6. The city report completes Chapter 1. Chapter 2's assignment remains unwritten.

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
