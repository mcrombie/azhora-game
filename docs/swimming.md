# Swimming

Water is the only way to some of this country, and the country is willing to
drown you for trying. This is the design the user settled on: swimming is a
skill on the same 99-level table as the rest (`src/skills.js`), and running out
of wind in deep water kills you through the game's ordinary defeat.

## What it is

Swimming is walking on water at reduced speed while your wind runs down.

- **Entering.** Walk off a shore into water. There is no prompt and no key: the
  ground stops holding you and you are swimming. Leaving is the same in reverse.
- **Dismounted only.** A horse will not swim (`src/riding.js`); the traveler is
  refused the water while mounted and told why.
- **No fighting.** Swings and dodges are refused in the water, and an encounter
  will not start on it. A swimmer is a person with both hands busy.
- **A posture of its own** on the traveler's rig: flat, arms going over, the
  head up. The same posture serves Ed the Word coming ashore.

## Water the traveler can be in

`canStand` (`src/game-state.js`) answers "is there ground here", and it stays as
it is. Beside it goes `canSwim`, with the same shape:

- inside `world.bounds`, by the mover's radius;
- not inside a collider (a hull, a pier, a rock is still solid);
- and the point is inside one of `world.mapWaters` — the chart's own list of
  every body of water in the game, polygons and circles in world space. That is
  the cleanest predicate available: it is authored, it is already the truth the
  minimap and the local map draw from, and it does not depend on terrain height
  sampling at the shoreline, which is where height is least trustworthy.

Nothing is "too deep to enter". Distance is what refuses you, and it refuses you
by killing you.

## The curve

Walking is 4.2 m/s and running 7.2 m/s. Swimming is a fraction of walking that
the skill improves, and costs wind that the skill also improves.

| | level 1 | level 50 | level 99 |
| --- | --- | --- | --- |
| speed, as a share of walking | 0.55 | 0.675 | 0.80 |
| speed, m/s | 2.31 | 2.84 | 3.36 |
| wind spent, per second | 4.0 | 2.6 | 1.2 |
| seconds on a full bar | 25 | 38 | 83 |
| **metres on a full bar** | **58** | **109** | **279** |

The two lines are linear in the level: `share = .55 + .25 * (level - 1) / 98`
and `drain = 4.0 - 2.8 * (level - 1) / 98`, over the same 100-point stamina bar
combat already keeps (`src/combat.js`, `maxStamina: 100`). The distance a
swimmer can cover is the product of the two, so it climbs faster than either:
roughly five times further at 99 than at 1.

Wind comes back on land at the rate it already does after a fight.

## Drowning

At zero wind, still in water, health drains at **12 a second**. A hundred health
is eight and a third seconds, which is nineteen metres at level 1: enough to get
back to a shore you have just left, not enough to finish a crossing you should
not have started. Death goes through the ordinary defeat panel and the ordinary
checkpoint restart, on the nearest shore.

There is no free push back to land. That was the first draft and the user
overruled it.

## Peblos

The islands are the point of the mechanic. The shortest water gap between the
mainland and Peblos is measured in `tests/swimming.test.js` against the table
above, and the test states which level first makes the crossing survivable with
wind to spare. The intent is that it is possible early and lethal if misjudged,
and routine later — a real skill gate rather than a locked door.

## Experience

- **1 for every 4 metres swum**, paid in whole points as they accumulate, so a
  first crossing of fifty-odd metres is worth about fourteen.
- **25** for each named body of water crossed for the first time (the entries of
  `world.mapWaters` are the names).
- **150** for reaching Peblos by water.

## Ed the Word

The mechanic is demonstrated before the traveler ever needs it. At 360 seconds a
ship stands in toward Tidehaven, the village braces, the ship stops
short, a figure goes over the side, and the ship turns and leaves without ever
touching the pier. Ed swims the last of it ashore on this mechanic — the same
posture, the same speed — climbs onto the landing and is the company's second
hired sword from then on. He says he came for the adventure. It was a mutiny.

That ship is the rebel ship the Peblos faction quest later hides in a sea cave,
and its crew are the mutineers who put him over the side
(docs/design-answers.md). So it is built once, as a hull that can appear in both
places: the same model that turns away from Tidehaven is the one found at
Peblos, and whichever side the traveler takes there is also a verdict on Ed.
Reuse the Sultana’s hull (src/salt-ship.js) with a different sail and no
colours.
