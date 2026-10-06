# Mithala, the city at the meeting of the arms

Brief written 2026-10-04 by the coordinating session. The user's request, verbatim: "trade the hexes
in the northeast circle I drew to East Mithala and trade the two hexes in the second circle I drew to
its southwest to North Mithala. That way each of the four regions will be represented in the final
circle which I labeled city. I want the central city of Mithala to be built on these hexes with four
districts: north, east, west, and south. Use the lore for inspiration for this city."

The circles were read off the user's annotated chart screenshot by fitting the chart's own place
marks (26 marks, sub-pixel residuals) and overlaying the atlas grid.

## The user's decisions (two question rounds, 2026-10-04; every recommendation taken)

| | |
|---|---|
| **Name** | **Mithala.** The city carries the land's name; the campaign already calls it "the river-city of Mithala" (`campaign-world.js`, `mithalaCity`, "Name pending"). |
| **Who holds it** | **The Cref king, at the old seat.** Lore (`mithala.md` "Under the Alliance", `history/the_cref_alliance.md`): "a Cref king still holds the oath at the old seat on the flood plain. He holds little else." The south's "Mithalan Empire" is this; its rebellion is the warlords who broke away and hold the countryside. The Crefs "take the crown of every kingdom they could reach and leave the kingdom underneath it exactly as it was" (`peoples/the_crefs.md`), so the city is Mithali work and the Cref curtain is the conquerors' one visible mark. |
| **Defence** | **Flood banks and a walled seat.** Every district on raised ground behind an earth flood bank with gates; only the Fork has a stone curtain, in grey Lotharn stone, the only stone wall on the plain. |
| **Look** | **Dark brick and thatch.** Stone footings, dark brick of fired flood clay, pale timber frames, reed thatch, granaries on posts, ground floors that are wet one season a year. Broad and low (lore `mithala.md` Settlements: "stone-footed and timber-framed, the storage buildings raised off the ground floor"). |
| **Tower** | **A climbable sky tower, about 40 m,** in the Fork: an inside stair to an open platform with sighting stones for the horizon and the flood calendar. The Mithala's sky-reading is "among the oldest astronomical traditions on the continent"; the tower is the one view over the whole plain. |
| **Districts** | **The Fork, the Braid Bank, the Quays, the Ford.** |
| **Gates** | **Open.** The whole city is walkable from the start, the tower included; only the king's hall stays shut until stage 2. |
| **Scope** | **City first, people later.** Stage 1: the trade and the fabric (ground, banks, curtain, bridges, streets, buildings, tower, map badge, travel). No people, no quest. Stage 2: the people the Empire arc talks to. |

## The trade is a game correction, not a World Builder edit

`src/world/terrain/game-atlas-adjustments.js` gets a third documented correction, **`mithala-city-quarters-v1`**:

- **(9,86), (10,86)**: North Mithala → East Mithala (both `plains`)
- **(5,88), (6,88)**: East Mithala → North Mithala (both `grassland`)

Not the World Builder map, because `tests/developer-atlas.test.js` holds every checkout's export to
the map's sha256: editing `azhora.wwmap` in place turns every game checkout red until each re-exports,
Codex's live main included. The correction travels with this branch through review. If the user
wants the World Builder map itself to show the trade, it is made there after Codex merges, and the
correction retires.

Effects: hexes per region unchanged (South 33, West 28, East 23, North 32). Terrain tallies: North
plains 20 + grassland 12 (was 22 + 10), East plains 14 + grassland 9 (was 12 + 11). Internal edges
49 → 47. East and West Mithala then touch along one edge only: the braid's last 58 m into the meeting.

## The site (measured on b5ff29a, `world.groundHeight` from a scoped world)

Hexes are 100 m flat to flat (circumradius 57.735), pointy-top in world X/Z; north is world −Z.

| District | hex | region | centre (x, z) | ground at centre |
|---|---|---|---|---|
| **The Fork** | 5,89 | West Mithala | (−1750, −1443.2) | 12.48 m |
| **The Braid Bank** | 6,88 | North Mithala (traded in) | (−1700, −1529.8) | 12.42 m |
| **The Quays** | 6,89 | East Mithala | (−1650, −1443.2) | 11.93 m |
| **The Ford** | 5,90 | South Mithala | (−1700, −1356.6) | 12.04 m |

The four together are about 200 × 290 m: Ambron's footprint, about four times Aevis.

**The meeting of the arms, (−1700, −1414), is exactly the corner shared by the Fork, the Quays and
the Ford.** The water runs on hex edges (`src/content/regions/western-regions/west-regions.js`):

- **The North Braid** (`MITHALA_NORTH_BRAID`, small, wadeable, half-width 2.6 → 4.4): along the
  Fork's north-west edge (against 5,88), its north-east edge (against the Braid Bank) and its east
  edge, x = −1700 (against the Quays), into the meeting.
- **The West Arm** (`MITHALA_WEST_ARM`, small → medium, wadeable, half-width 3 → 5): along the Ford's
  west edge (against 4,90) and north-west edge (against the Fork) into the meeting.
- **The Main Channel** (`MITHALA_MAIN`, medium, half-width 5 → 11): from the meeting east along the
  Quays' south-west edge (against the Ford) and south-east edge (against 6,90). Wadeable over gravel
  for its first 30 % (`fordUntil: .30`, 245 m, to about x = −1469) and deep for sixteen hex edges
  below that. **The city stands on the plain's only crossing.**

So the Fork is a peninsula pointing east into the confluence, dry only on its west and south-west
edges (to West Mithala 4,89 and 4,90); the Braid Bank and the Quays share a dry edge; the Ford is
across water from all three. The plain's flood: levees about 1.5 m on the channel banks with
backswamps behind (`MITHALA_FLOOD`); "raise the water a metre and a half and everything between the
channels is under it and every levee is dry" (`docs/mithala-report.md`). District platforms stand
above that line.

## The districts

- **The Fork** (West Mithala): the old seat. The Cref curtain on the Fork's own ground, a land gate
  west toward the Round Horizon and three bridge gates; the king's hall (the old Mithali royal hall,
  a long brick hall, doors shut until stage 2); the water court; the sky tower near the east point,
  over the meeting; the flood gauge at the water's edge at the meeting, cut with the proverb
  *Vet mithalan, vel noreth* ("The flood returns. The grain does not ask."); houses of the old
  Mithali families.
- **The Braid Bank** (North Mithala): the cattle market and its pens (empty), river-horn byres,
  threshing floors, barns, the Cref garrison hall, houses, and the road north toward the Acorwood.
- **The Quays** (East Mithala): a stone-faced quay on the main channel's north bank with moored barges
  (static), raised granaries, a weighing house, grain factors' halls and a warehouse crane. The
  richest district.
- **The Ford** (South Mithala): the paved ford and its approaches, the mountain market (Lotharn iron
  and Amodian chestnuts in, grain out; lore `mithala.md` Position), inns with yards, smithies, houses,
  and the south road toward the Lotharn passes. Where the Empire arc arrives
  (`campaign-world.js`, `empire-8`).

**Crossings:** three bridges from the Fork (over the braid to the Braid Bank and to the Quays, over
the arm to the Ford) with flood marks cut in their piers; the ford between the Quays and the Ford; a
dry street between the Braid Bank and the Quays. The flood banks are earth, walkable, with gates;
they keep out water, not people.

## How it is built (the Nylon and Aevis pattern)

- **`src/content/regions/mithala/mithala-city.js`**: the pure layout and the single source of truth. District platforms,
  flood banks, the curtain and its gates, bridges, the ford, streets, building footprints with
  heights, the tower and its stair, the gauge, the quay and boats, reservations
  (`inMithalaCity`, `mithalaCityReserved(x, z, margin)`), the ground function
  (`mithalaCityGround(x, z, base)`), deck heights for bridges and quay, and landmarks.
  `src/content/regions/aevis/aevis-city.js` and `src/content/regions/nylon/nylon-city.js` show the shape.
- **`src/content/regions/mithala/mithala-city-scenery.js`**: merged meshes. Load budget under Nylon's 434k vertices (aim
  300k) and under 60 merged meshes; it loads with the Mithala regions.
- **Hooks**: the terrain chain (platforms, banks, ford paving), trees, scatter and wildlife kept off
  reserved ground, the map badge "Mithala" (a city), the travel arrival at the Ford, review views.
- **Tests**, `tests/mithala-city.test.js`: each district inside its own region by `hexOwnerAt`;
  buildings on dry platform ground and clear of water; streets connected; bridges grounded at both
  ends and clear of the water; the curtain closed except at its gates; the tower stair walkable;
  walk routes through every district.
- **Lore**: a section on the city added in place to
  `world-builder/azhora_lore/geography/regions/mithala.md` (uncommitted; the "Under the Alliance"
  hunk already in that file is another author's).
- **Campaign**: `mithalaCity` named Mithala, its note updated.
- **Handoff** for Codex: `docs/region-reviews/mithala-city-handoff.md`.
