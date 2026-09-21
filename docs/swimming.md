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
- and under the waterline, which is `heightAt < 0.45` — the very number
  `canStand` already used to decide that ground would hold somebody up.

That makes the two predicates exact complements: every point in the world is
standable, or swimmable, or solid, and never two of those. It is a stronger
thing to be able to say than "it is inside one of the chart's water polygons",
and it is what lets a swimmer cross the line in either direction without a
prompt or a key — `moveCharacter(..., { swimming: true })` accepts a step onto
either side, so you swim at a beach and walk out of the sea.

Nothing is "too deep to enter". Distance is what refuses you, and it refuses you
by killing you.

## The curve

Walking is 4.2 m/s and running 7.2 m/s. Swimming is a fraction of walking that
the skill improves, and costs wind that the skill also improves.

| | level 1 | level 25 | level 50 | level 99 |
| --- | --- | --- | --- | --- |
| speed, as a share of walking | 0.55 | 0.611 | 0.675 | 0.80 |
| speed, m/s | 2.31 | 2.57 | 2.84 | 3.36 |
| wind spent, per second | 4.0 | 3.31 | 2.6 | 1.2 |
| seconds on a full bar | 25 | 30 | 38 | 83 |
| **metres on a full bar** | **57.8** | **77.5** | **109.0** | **280.0** |
| metres of drowning, on full health | 19.3 | 21.4 | 23.6 | 28.0 |
| **metres before you die** | **77.0** | **98.8** | **132.7** | **308.0** |

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

## Peblos, measured

The islands are the point of the mechanic, so the crossings were measured rather
than estimated: every landmass's shore was found by flooding for ground
`canStand` itself accepts and keeping the points with water within three metres,
and the gaps below are the shortest line from one shore to the other. Not from
the hex outlines — those are hexagons, and the real shorelines sit inside them,
so the water a swimmer actually crosses is wider than the atlas suggests.

| crossing | shore to shore | survivable from | on wind alone from |
|---|---|---|---|
| Drent → Pilot's Stone | **61.3 m** | **level 1** | level 7 |
| Drent → the Saltings | 62.6 m | level 1 | level 7 |
| the Saltings → Pilot's Stone | 63.1 m | level 1 | level 8 |
| **Pilot's Stone → Gull Scarp** | **98.0 m** | **level 25** | **level 43** |
| Gull Scarp → Cobble Island | 59.8 m | level 1 | level 4 |
| Gull Scarp → Longstone | 60.9 m | level 1 | level 6 |
| Cobble Island → Longstone | 64.8 m | level 1 | level 9 |
| Drent → Cobble Island, direct | 354.8 m | **never** | never |

So the ladder the user asked for falls out of the ground as built. A brand-new
swimmer can reach the nearest skerry: 61.3 m against a 57.8 m bar, so he arrives
having drowned for a second and a half, with **81 of 100 health** — possible
early, and plainly a thing you only just did. The hop on from there is 98 m, and
that is the gate: **level 25** to survive it by drowning most of the way, level
43 to make it on wind alone. And the open crossing to Cobble is 354.8 m against a
range of 308 m at level 99, so nobody ever swims it, at any level, ever. You
island-hop or you do not go.

`tests/swimming.test.js` re-measures every one of those gaps against the real
world and fails if the ground moves under them.

## Experience

- **1 for every 4 metres swum**, paid in whole points as they accumulate, so a
  first crossing of fifty-odd metres is worth about fourteen.
- **25** for each named body of water crossed for the first time (the entries of
  `world.mapWaters` are the names).
- **150** for reaching Peblos by water.

Nothing counts before Ed's lesson. The water does not ask whether anybody has
shown you - you can walk into the sea on your first morning, and the toast says
as much - but until `swimming.learn()` there is no skill to pay into, and the
record is left unwritten, so the crossing made blind still pays once he knows
how.

## How it looks

Swimming does not walk the seabed. While the ground under him is below the
waterline the traveler floats at the surface, feet hanging `SWIM.sink` (1.06 m)
down, which puts his head and shoulders above it. The rig has a posture for it
(`pose.swimming` in `src/characters.js`): head up, chest back a little, the arms
pulling over alternately and the legs kicking small and quick. No weapon is
drawn, because both hands are busy.

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
