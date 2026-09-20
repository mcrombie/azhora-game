# Ambron, the lake city

The brief, as given: *the Ambroni reshaped the land and lakes to build the city. It should be
partly inspired by Tenochtitlan. There should be a palace for the imperial family on an island
at the centre of the lake that is also the city's greatest fortress, a place where a dragon
lived centuries ago but was slain by a human who was the founder of Ambron.*

This document is the design that follows from that, and the order the work goes in. Anything
already built that contradicts it is wrong and gets changed, not worked around.

---

## What changes, in one paragraph

Ambron stops being a walled town on a river and becomes a city standing **in Lake Ela**, on
ground the empire made: fill, revetment and pile, raised out of the shallows over four
centuries. The lake is its outer wall and its road at once — nothing reaches it except by
water or along a causeway, and a causeway with the bridge taken up is not a road, it is a
killing ground. At the centre, in the water, is the island the city grew around: the imperial
palace, which is also the strongest fortress in Azhora, on the rock where the dragon lived.

## Why it is the richest city on the continent

Because of what the water does, not what the walls do.

- Lake Ela is the bottom of a system: the **Thelas chain**, **Lake Brul** and **Lake Ossen**
  all drain toward it, joined by the **Link** and the smaller cuts the empire has deepened.
- Everything those lake lands produce moves on water, because moving grain by water costs a
  fraction of moving it by cart, and Elagos has no good roads and does not need any.
- Ela's only outlet south is the **Ela-south**, which falls over **the Stair** to the Moros
  Plain and the whole southern empire beyond it.
- Ambron sits on the water between the two. Everything coming down out of the lake country and
  everything going south passes it, ties up at it, and is counted. The chain closes the harbour
  mouth; the toll is taken at the Clerk of the Chain's table; the tally boards are the empire's
  actual constitution.

Political power here is downstream of the economics, not the other way round. The House of
Ambron rules because it owns the narrows, and it has owned the narrows since a man killed a
dragon on a rock in the middle of a lake.

## The founding, as the city tells it

Centuries ago the rock at the centre of Ela was a dragon's. The lake people did not fish the
middle of their own lake. A man — the empire's founder, and the city takes his name from him
and not the other way about — went out to the rock and killed it, and then did the thing that
actually founded an empire: he did not leave. He built on the rock, and charged for passage.

What the game should do with that:

- The palace is built **around and out of** the dragon's rock; the oldest masonry is the
  bones of a lair, not a house.
- Nobody in Ambron treats it as a legend. It is in the tally books as a property title.
- It is never confirmed on screen. The only live dragon in Azhora is a secret in a box under a
  carriage at Vaervelm Caelazh (src/vineyard.js), and the only other evidence anybody has is a
  jaw on a winery mantel that everyone agrees is a cow's. The three should never be put in a
  room together; they should sit at three corners of the world and let the traveler do the work.

## The shape of it

Tenochtitlan is the model for the *organisation*, not the ornament. What is taken:

| Tenochtitlan | Ambron |
|---|---|
| A city on an island in a lake, grown by reclamation | Made ground on Ela's shallows: fill behind stone revetment, four centuries of it, in courses you can still read |
| Causeways to the shore, with removable bridges | Three causeways. Every one has a span that lifts, and the lifting gear is inside the walls |
| A grid of canals; goods move by canoe, not cart | Canals on the street grid; nothing wheeled inside the walls except at the market |
| A dike dividing the water | The empire's dike across the lake's east arm, which is what made the harbour calm |
| A sacred precinct at the centre | The island: palace, keep, treasury, and the old rock under all of it |
| An aqueduct bringing fresh water in | Fresh water down a stone conduit from the shelf springs; the lake is not drinking water |

## What the measurements say (done 2026-09-20)

The numbers that decide step 1, so nobody has to take them again.

- Lake Ela is authored as two atlas hexes, whose centres are **(-1350, 116)** and
  **(-1300, 202)**. `tests/elagos-world.test.js` holds the basin to them: it must cover both
  and stay within a hex of them. Any reshaping keeps that.
- Ela today is an ellipse 228 x 124 m. The city, with its walls, its made ground and the
  feather on the pad, is **268 x 220 m** — *the city is bigger than the lake it is supposed to
  stand in*. This is the whole problem with step 1.
- To carry the city with water round three sides, Ela needs to be roughly **370 x 320 m**.
- A lake that size, centred between the two hexes, floods five places that are on the shelf
  today:

| place | today | what happens to it |
|---|---|---|
| Nemmel | (-1258, 126) | a lake village: it moves to the new eastern shore |
| The Lake Shrine | (-1338, 12) | moves to the northern shore, still looking over the water |
| The Ice-Road Stone | (-1287, 66) | the ice roads run *on* the lake; the stone moves to the shore it starts from |
| The Link's mouth | (-1272, 16) | reaches the new north-eastern shore instead |
| The Ela-south's head | (-1286, 186) | leaves from the new southern shore, below the city |

That is not damage; it is the brief. *The Ambroni reshaped the land and lakes to build the
city*, and a shore that moved is what that looks like from the ground. The Stair and the
Drowned Causeway are south of the new water and do not move.

## Build order

1. **The water and the ground.** Reshape Ela so the city has a lake round it, a harbour, and
   the island at its centre; move the city's terrain pad off the river and into the lake as
   made ground. Nothing else can be correct until this is.
2. **The island.** Palace, keep, the rock, the water gate onto it, the causeway that reaches it.
3. **The causeways and the chain.** Three to the shore, one harbour mouth, the chain across the
   mouth rather than across a river.
4. **The canals and the quays**, on the existing street grid.
5. **The roads outside** that used to run to a river crossing, and the chart.
6. **The people.** The 24 who already live there mostly keep their words; the ones whose lines
   are about a river get new ones.

## Open, deliberately

- Whether the Ela-south still carries traffic south of the city, or whether the Stair portage
  is the only way down to the Moros. The second is more interesting and more brutal.
- Whether the dike is visible from the walls or is a place of its own.
