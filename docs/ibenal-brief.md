# South Ibenal and North Ibenal: terrain and wildlife

Brief written 4 October 2026 by the coordinating Claude session under the
[joint completion plan](regional-completion-joint-plan.md) (queue rows 5 and 6: "Summer-dry coastal plain; exposed shore
and sheltered natural drainage beside the forest country" and "Colder summer-dry coastal plain with one hill cell;
transition from forest margin toward Oremindi"). **Terrain, climate, water, scenery and wildlife only - nothing that
belongs to anybody.** The user raised the plan's waiting limit on 4 October 2026, so this pair is built now.

One corridor in the lore, so one connected pair, **split by layer** as Celder was: a **ground agent** shapes both
countries' ground and water as one plain (no ridge or step along their shared line), a **life agent** builds both
countries' scenery and wildlife.

## Where things stand

- **Worktree** `C:\Users\Michael\Programs\typescript\azhora-game-ibenal`, branch `ibenal`, cut from ``116799e`` (the
  Alezhor delivery, on East Izol, on Celder). Work only there; do not commit, push or stash; never touch another
  checkout.
- **Registered and wired** by the coordinator: South Ibenal **65**, North Ibenal **66** (provisional), stubs
  `src/south-ibenal-world.js` / `src/north-ibenal-world.js` (`SOUTH_IBENAL`, `southIbenalOwns`, `..._ARRIVAL`,
  `..._LANDMARKS`, `..._TRAILS`, `..._VIEWS`, `southIbenalGround(x, z, incoming, before)`, `southIbenalTint`, and
  the same for North), `src/{south,north}-ibenal-scenery.js`, `src/{south,north}-ibenal-wildlife.js`.
- **Lore may be rewritten in place** (the user's rule): minimally, in its own voice, only what the atlas contradicts;
  never commit there; never touch a lore file someone else has already modified (`git -C ..\world-builder status`).
- Precedents in this worktree: `src/south-celder-world.js` (one plain over two countries, `celderLand`; seam tables
  read edge by edge), `src/alezhor-world.js` (rivers continued from a neighbour's course end; river ground and chart
  water), `src/east-izol-world.js`.

## The atlas - measured

- **South Ibenal**: 30 hexes, all plains, all **Csb**; rows 106-116 (hex centres x -4750 to -4150, z 29 to 895):
  row 106 (-30,106)(-29,106); 107 (-31..-28); 108 (-32..-29); 109 (-33..-31); 110 (-34..-32); 111 (-35..-33);
  112 (-36..-34); 113 (-36,-35); 114 (-37,-36); 115 (-38..-36); 116 (-37,116).
- **North Ibenal**: 34 hexes, 33 plains and one **hills** at (-21,99), all **Csc**; rows 99-107 (x -4350 to -3700,
  z -577 to 116): row 99 (-22,99)(-21,99 hills); 100 (-23..-21); 101 (-24..-21); 102 (-26..-21); 103 (-27..-23);
  104 (-28..-24); 105 (-29..-25); 106 (-28..-26); 107 (-27,107).
- **Neighbours by shared edges**: South Ibenal - West Ibenwood 18 (built), North Ibenal 8, Alezhor 3 (built, frozen
  delivery), the sea 25. North Ibenal - South Oremindi Mountains 8 (built), North Ibenwood 8 (built), West Ibenwood 6
  (built), South Ibenal 8, the sea 18.
- **Water** (atlas river edges, all small):
  - Inside South Ibenal, three streams: (-34,111)|(-35,111), (-34,110)|(-35,111), (-34,111)|(-35,112);
    (-32,109)|(-33,109), (-32,108)|(-33,109); (-30,107)|(-31,107), (-30,106)|(-31,107), (-30,107)|(-31,108).
  - Inside North Ibenal, one stream: (-24,101)|(-25,102) up to (-24,104)|(-25,104), six edges.
  - On the South Ibenal | North Ibenal line: (-29,105)|(-29,106), (-29,105)|(-30,106) - yours, both sides.
  - On the West Ibenwood | South Ibenal line: three edges, built by the forest as `ibenwood-west-stream`
    (`src/ibenwood-rivers.js`, (-4550, 693) to (-4500, 837)): give it a real Ibenal bank at its level, never move it.
  - On the Alezhor | South Ibenal line: three edges, built by Alezhor as its west stream **8 m inside Alezhor's line**,
    its far bank risen to meet South Ibenal's outland. **Make exactly one side meet the other**: Alezhor's seam reads
    South Ibenal live (`groundBeforeAlezhor` includes your layer), so if both seams move, they chase each other.
    Either hold Alezhor's three South Ibenal edges (no move) and meet them from your side, or the reverse - say which,
    and test both directions at half a metre.

## The lore

`ibenale.md` (65 lines) and `north_ibenal.md` (79 lines), both unmodified; read both.

- One corridor: "two parallel lines that are never quite parallel: the coastline ... and the forest edge"; where they
  close, "a strip of shore and road and not much else"; where they open, room for towns and farmland "in the
  better-drained soil between the rivers".
- "The rivers of Ibenale come out of the forest at angles, crossing the plain and reaching the sea at intervals", small
  and regular; small river-mouth anchorages (owned: reserve their flats, build nothing).
- The open western ocean: no sheltering islands; less cliffed than Legemum's coast "but it is not docile".
- North Ibenal: the plain narrows; the forest "as neighbor"; **The Narrows**, "perhaps a quarter-mile wide at its
  narrowest, the Ibenwood pressing to within sight of the shore", the last flat ground before the Oremindi passes;
  a colder, more exposed coast.
- Wildlife: the fauna overview's "Ibenale, Alezhor, and the Western Corridor" (forest edge-cat, otters, forest and
  coastal birds, the north-south migration route) and the Iberos/open-ocean sections. No stock.

## Standing decisions from the user

- New animals are welcome where the overview and the neighbours support them (label them as extensions).
- Lore may be rewritten in place where the atlas contradicts it (rules above). The Ibenals are plains: no climbing
  terrain unless a cliffed coast truly needs it - say so if you propose it.
- The coordinator already raised the world-width budget in `tests/region-layout.test.js` (South Ibenal's coast moves the
  west edge to x -4860: 70.7 hexes).

## The ground agent / the life agent

As in `docs/alezhor-brief.md`, with these additions: meet the forest's ground at the tree line live; the corridor road
and the towns are owned (keep a natural line of travel open along the corridor, build no road); the Narrows must stay
walkable; the hills cell (-21,99) under the South Oremindi is a foothill, not a mountain; vary every band's layout.
Up to two test processes per agent; scoped world `[65, 66, 35, 33, 37, 64]`.

**Ground agent owns**: `src/south-ibenal-world.js`, `src/north-ibenal-world.js`, both countries' rows in
`src/region-layout.js`, `src/region-world.js`, `src/build-status.js`, `tests/{south,north}-ibenal-world.test.js`, their
lines in `src/world-terrain.js`, the probes in `tests/southwest-world.test.js`, and only for the shared stream, Alezhor's
three South Ibenal seam edges in `src/alezhor-world.js`. **Life agent owns**: `src/{south,north}-ibenal-scenery.js`,
`src/{south,north}-ibenal-wildlife.js`, `tests/ibenal-life.test.js`. The coordinator owns `src/world.js` and
`src/main.js` (say what you need there: river ground, chart water, the `-wildlife` species).

Final message, short: what you built (numbers), every test and its result, labelled choices, lore edits made (file,
old, new, atlas fact), anything not verified, and - ground agent - say clearly when your ground is final.
