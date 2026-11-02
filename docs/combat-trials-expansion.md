# Stillroom combat trials: 37 opponents

Open **Combat Testing → One-on-one trials**. The opponent selector can start at
any fight. Skipped opponents do not count as victories. Every round and retry
restores health and mana; leaving returns to the exercise menu.

The latest twelve additions have distinct models, equipment, attack tells and
defeat animations. They are training apparitions; adding them here does not populate
the campaign with new creatures or change its ordinary militia units.

## The twelve new opponents

| Opponent | Behavior and counter |
| --- | --- |
| Elven ranger | Tracks during the bow draw, then commits before release. Sidestep the arrow and close; he switches to a knife nearby. |
| Goblin trapper | Leaves visible spring snares while retreating. Break them or lead him onto his own traps. |
| Cref berserker | Three advancing axe attacks. Wait through the final chop before countering. |
| Oremindi stone troll | Throws boulders and uses a close grab that breaks guards. Its collecting recovery takes extra damage. |
| Dwarven earthshaper | Raises short, destructible stone ridges that block movement and attacks. Leave the marked ground, break a stone, or circle an end. |
| Dark Elf mirrorblade | Sidesteps with two harmless afterimages before thrusting. Dust identifies the real fighter; target lock stays on it. |
| Dark Dwarf furnace keeper | Closed mechanical braces absorb damage. After hammering, it opens and vents heat to one fixed side; attack from the cool side. |
| Nanvir penitent | An interruptible offering sacrifices health for a temporary damage boost. Interrupt the ritual or outlast the glow. |
| Acor reed-stalker | Moving ripples reveal its submerged position. Interrupt its emergence or evade the following gaff attack. |
| Eshtor oathbound champion | Alternates a blue shield stance with an amber, exposed pursuit stance. Read the change and counter after its commitment. |
| High Goblin binder | Creates destructible binding knots that slow walking. Dodge through, go around, or break a knot to stagger the caster. |
| Young wyvern | Short, low flying passes give way to grounded bites and rear tail sweeps. Counter after landing; Fireball is optional. |

## Current difficulty order

This order combines all thirty-seven opponents.
The score is a relative automated estimate, not a player-facing level or a
guarantee of human difficulty. Small differences should be treated as ties
until human playtesting distinguishes them.

| Round | Opponent | Main challenge | Probe score |
| --- | --- | --- | ---: |
| 1 | Bramble goblin | Basic commitment and counterattack | 1.46 |
| 2 | Giant web spider | Avoid silk, clear escape routes, counter the pounce | 1.86 |
| 3 | Goblin slinger | Sidestep stones and close between shots | 2.15 |
| 4 | Grey wolf | Evade a committed lunge | 2.50 |
| 5 | Dwarven earthshaper | Destructible stone barriers and a hammer | 2.77 |
| 6 | High Goblin binder | Binding lines and traveling magic | 2.95 |
| 7 | Satyr thornrunner | Wait through the harmless feint | 3.41 |
| 8 | Goblin trapper | Avoid or repurpose the spring snares | 3.55 |
| 9 | Acor reed-stalker | Follow ripples and interrupt emergence | 3.60 |
| 10 | Acor wraith | Strike while the mist becomes corporeal | 5.27 |
| 11 | Elven ranger | Sidestep committed arrows and close | 5.72 |
| 12 | Guild training golem | Hit the exposed core after its heavy attacks | 5.75 |
| 13 | Centaur lancer | Step across the charge; avoid the hind kick | 5.98 |
| 14 | Cref axeman | Dodge the hook that breaks staff guards | 6.84 |
| 15 | Rogue battlemage | Close between traveling bolts | 7.70 |
| 16 | Oremindi stone troll | Boulders, grabs and a vulnerable recovery | 8.00 |
| 17 | Road bandit | Sword parries reduce frontal damage | 8.28 |
| 18 | Young wyvern | Flying passes, bites and rear tail sweeps | 8.36 |
| 19 | Eshtor oathbound champion | Alternating shield and pursuit stances | 8.92 |
| 20 | Troll | Regeneration; fire interrupts healing | 9.67 |
| 21 | Dark Elf mirrorblade | Distinguish the real thrust from afterimages | 10.00 |
| 22 | Cref berserker | Survive the full three-axe combination | 10.50 |
| 23 | Nanvir penitent | Interrupt or outlast the offering | 11.11 |
| 24 | Nanvir blood adept | Interrupt inscriptions or lure it beyond the seal | 13.51 |
| 25 | Dark Dwarf furnace keeper | Closed armor and one-sided venting | 15.06 |
| 26 | Eshtor barrow guardian | Avoid both the strike and its delayed ground echo | 18.99 |
| 27 | Dark Dwarf runesmith | Break the ward anchor or lure it outside the circle | 37.62 |
| 28 | Militiaman | A real shield stops frontal staff attacks | 40.65 |
| 29 | Ogre bruiser | Wide reach, committed blows and a circular stomp | 41.13 |
| 30 | Undead knight | Shield discipline and interruptible restoration | 42.05 |
| 31 | Dwarven shieldwarden | Heavy defense and a close shield shove | 42.36 |
| 32 | Ambron Soldier | Professional training, armor and shield | 43.31 |
| 33 | Orc Raider | Heavy weapon and shield | 43.46 |
| 34 | Elven duelist | A combination without an opening after its first strike | 51.69 |
| 35 | Orc Warrior | Faster, better equipped professional | 58.60 |
| 36 | Veteran Ambron Soldier | Shorter openings and veteran protection | 58.76 |
| 37 | Veteran Orc Warrior | Veteran speed, power and equipment | 59.61 |

Large creatures are not automatically the hardest. Long, readable recoveries
make the golem easier to counter than a trained shield user. The large step
around the runesmith and militia is where sustained defense becomes especially
effective against careless frontal attacks. The roster deliberately retains
these differences rather than granting every new creature a higher health bar.

## How the order was measured

`node scripts/analyze-trial-difficulty.mjs` runs 2,220 deterministic fights:
60 per opponent, using five input policies across twelve starting positions.
Policies are rushing, guarding, learning counters, practiced counters and mixed
staff/Fireball. Counter policies have reaction delays and seeded missed dodges.
All use starting attributes, ordinary collision, and normal damage and mana.
There are no injected kills or health changes.

Each probe runs for at most 120 seconds. The score averages a loss penalty of
65, a quarter point per health lost, and a smaller duration term: up to ten
points for a slow victory or a quick defeat. This weights the ranking toward
survival before speed. The JSON includes every run and per-policy totals:
`tests/artifacts/trial-difficulty.json`.

These agents know the available combat state and do not measure how difficult
an unfamiliar visual tell is to learn. Human play should especially review the
earthshaper, binder, reed-stalker, mirrorblade and furnace keeper before treating
their exact positions as final. The early positions of the earthshaper and binder
reflect their long, punishable recoveries once their mechanics are understood.
The baseline uses the militia's sword; its spear, axe and mace remain selectable
variants, not additional ranked rounds.

The first sweep exposed an interrupt loop in the reed-stalker: repeated emergence
hits could make it dive again without ever attacking. After an interrupted
emergence it now recovers into a grounded attack before its next dive. Its sixty
probes were rerun and replaced in the final comparison, bringing the implementation
pass to 2,280 executed fights. A targeted audit accepts stable IDs, for example
`node scripts/analyze-trial-difficulty.mjs acor-reed-stalker`, and writes a separate
`trial-difficulty-selected.json` report.

## Tutorial and saved progress

Taleth's required introduction remains **goblin → wolf → bandit → militiaman**.
That curriculum teaches the four required lessons separately from the full
difficulty ladder. Optional training then visits the remaining opponents in
the measured order. Music intensity follows difficulty tier rather than an
old round number.

Arrival checkpoints now store version 2 with stable opponent IDs. Version 1
checkpoints migrate without losing wins, approval or departure status. Resuming
training chooses the first unbeaten curriculum opponent; newly inserted rounds
cannot silently count as completed.

## Implementation and bounded effects

- `src/gameplay/combat/frontier-trials.js`: ten stat-derived profiles and instructions.
- `src/gameplay/combat/expedition-trials.js`: the latest twelve profiles and counters.
- `src/gameplay/combat/expedition-tactics.js`: their encounter-local behavior and ridge collision.
- `src/gameplay/combat/trial-specials.js`: encounter-local mechanics and attackable objects.
- `src/gameplay/combat/trial-order.js`: reviewed order and scores.
- `src/content/characters/frontier-trial-actors.js` and `trial-creature-actors.js`: models and animation.
- `src/content/characters/expedition-trial-actors.js` and `young-wyvern.js`: the latest models and articulated wings, weapons and equipment.
- `src/app/exploration/trial-field-view.js`: fixed effect pools, no added dynamic lights.
- `src/app/exploration/expedition-field-view.js`: traps, ridges, bindings, ripples, vents and two lazily created afterimages.
- `src/app/exploration/training/arrival-progress.js`: curriculum and save migration.

Silk is capped at three patches, the ward at one anchor, blood magic at one seal,
and barrow echoes at two. The new mechanics cap snares at three, ridge stones at
five, binding knots at three and mirror afterimages at two. Effects freeze with Help and briefings and are removed
on victory, retry and exit. Webs and the rune anchor can be hit with the staff or
Fireball. Release target lock and face an object to attack it instead of the
opponent. An unlocked Fireball also clears silk, snares or binding knots directly
underfoot. Ground hazards do not disable dodging. Stone barriers expire, have
walkable ends and cannot appear inside a combatant. Every
opponent remains beatable with the staff alone.

## Verification commands

```text
node scripts/run-tests.cjs tests/expedition-trials.test.js tests/frontier-trials.test.js tests/advanced-trials.test.js tests/combat-trials.test.js tests/combat-stats.test.js tests/combat-units.test.js tests/stillroom-arrival.test.js tests/soundscape.test.js tests/scenario-combat.test.js tests/world-skirmish.test.js tests/combat-focus.test.js
node scripts/check-source-layout.mjs
node --experimental-vm-modules scripts/check-module-graph.mjs
node scripts/launch.cjs --exploration --combat-testing --smoke-test --internal-review --frontier-trials-checks
node scripts/launch.cjs --exploration --combat-testing --smoke-test --internal-review --combat-trials-checks
node scripts/launch.cjs --exploration --combat-testing --smoke-test --internal-review --trial-controls-checks
node scripts/launch.cjs --exploration --smoke-test --internal-review --stillroom-arrival-checks
```

The native checks use actual keyboard and interface input, inspect each special
mechanic, and cover pause, casting, retries, collisions, a complete ladder,
selected attributes, all militia weapons, defeat presentation and scene cleanup.
They write review screenshots and JSON results to `tests/artifacts/`.

The expansion passed 120 model checks and all 37 individual native opponent
checks. Follow-up checks covered the revised reed-stalker, shaded stone barriers
and clearing binding knots with the actual Fireball key. Visual review caught
and fixed the reed-stalker's submerged body remaining visible. The new models
were reviewed together in `tests/artifacts/expedition-trial-design-review.png`.
Source layout and module linking also passed. Both complete ladder runs (default
and custom stats), all militia weapon variants, grounded defeat animations and
cleanup passed. The subsequent selector check initially assumed a Fireball
would pass through the trapper's destructible snare. That assertion was corrected
to verify both the destroyed snare and a following hit on the goblin. All 37
selector/Fireball checks, staff blocking, pause and cleanup then passed in the
isolated control rerun.

`tests/artifacts/combat-trials-native.json` preserves the completed ladder/stat
checks and the original assertion failure; `trial-controls-native.json` records
the successful follow-up. Individual opponent checks are in
`frontier-trials-native.json`, and targeted mechanic follow-ups are in
`selected-trials-native.json` in the same folder. The original ladder log is
`expedition-ladder-run.log`, and the successful control log is
`expedition-controls-run.log`. These native runs recorded no renderer/frame errors.
