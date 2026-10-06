# The southwest, job 4 of 4: Marosh and Trogo — and the first rainforest

Brief written 2026-09-30 by the coordinating session. The last job of the four-job programme
covering Azhora's southwest quarter (13 regions, 322 hexes), which the user chose in full.

| job | regions | hexes | ids | state |
|---|---|---|---|---|
| 1 | Navarth, West Pyros, Ganesh Desert, Ganesh Plain | 107 | 32–35 | built `9fd150f` |
| 2 | the four Meroshe deserts | 95 | 36–39 | built `403097f` |
| 3 | Cape Heth, Dinelv Highlands, Hama | 73 | 40–42 | built, **your base** |
| **4 (this one)** | **Marosh, Trogo** | **47** | **43–44** | |

**Terrain, climate, water, scenery and wildlife only — and nothing that belongs to anybody.**

## The user's decision, which is the point of this job

Asked directly on 2026-09-30 what a deep forest should be in Azhora, the user chose:

> **A country you cannot see far in *and* cannot go straight through.**

That is two rules, and both are yours to build:

1. **Heavy haze** — sight distance far shorter than anything in the game. Existing `hazeDensity`
   runs .0027–.0045; the erg blocks sight at 140 paces using flat ground, and this should block it
   with trees. Pick your number from what the country looks like, and say what sight distance it
   buys in paces.
2. **An undergrowth movement rule** — the direct analogue of the Lotharn climbing rule. Read
   `src/gameplay/movement/climbing.js`: it owns no input, no rendering and no saved state, gates movement through the
   `canTraverse` hook in `moveCharacter` (`src/gameplay/movement/game-state.js`), and applies only inside a named set
   of regions. Build the same shape for undergrowth: **passable along watercourses, animal paths
   and clearings; refused through the thicket**. A new module (`src/world/scenery/undergrowth.js`) rather than an
   addition to `climbing.js` — it is a different rule.

**`deep_forest` is used nowhere in the game's code today** — only in `src/content/chapters/civil-war/campaign-world.js` labels
and the survey data. This job is where the terrain type gets its meaning, and **the pattern carries
to the Ibenwoods** (five regions, ~153 hexes of forest and deep forest) whenever those are built.
Write it to be reused: the rule should take a region set, as the climbing rule does.

### The hazard, stated plainly

A movement gate can strand the autopilot, a quest route or a traveler. The climbing rule is
Lotharn-only for exactly this reason — the rest of Azhora has river banks and seams steeper than
50° sitting on the autoplays' roads. Two things follow:

- **`tests/nobody-sealed-in.test.js` is the test that matters most in this job.** Run it early and
  often, not once at the end.
- Nothing routes through Trogo today (the whole southwest is an island reached only by F8), so the
  risk is low now and rises when the Ibenwoods land. **Leave the ways through wide enough and
  connected enough that a country can be crossed**, and prove it with a flood fill the way
  `tests/west-lotharn-peaks.test.js` proves the ramps are the only way up. State the proof both
  ways: crossable along the ways, not crossable without them.

## State of play

- Branch `southwest-4` in its own worktree, cut from **`southwest-3`**. Never cd into another
  checkout, never a bare `git stash`, **do not commit**.
- **Neither is in the survey.** Add both to `PLAYABLE` after `Hama` and regenerate with
  `node scripts/build-region-survey.mjs`.
- **Ids after `Hama: 42`:** `Marosh: 43`, `Trogo: 44`.

## What the atlas says

| | **Marosh** (43) | **Trogo** (44) |
|---|---|---|
| hexes | 18, q −26…−22, r 127…135 | 29, q −30…−23, r 136…142 |
| terrain | grassland 10, **hills 8** | **`deep_forest` 22**, grassland 7 |
| climate (verify per hex) | `Csa` 10, `Csb` 8 | **`Af` 22**, `Csa` 7 |
| known neighbours | N Meroshe 7, Central Meroshe 8, S Meroshe 3 | S Meroshe 13 |

Measure the rest yourself, and read the climate per hex from
`world-builder/map/resources/examples/azhora.wwmap` (`hexes[key].climate`, `koppen-v1`), **not**
`azhora.cmap.json`.

- **`Af` is tropical rainforest with no dry season** — the wettest code on the map and the biggest
  climate step the block has taken. Job 1 found the first `BWh`; you have the first `Af`.
- **Trogo's 7 grassland `Csa` hexes are where the forest stops.** Find them and make the edge read:
  a rainforest with a visible edge is worth more than one that fades.
- **Marosh is Hama's climatic cousin** — Mediterranean, with 8 `hills` hexes. Job 3 found Hama's
  wet/dry line is drawn by the *ocean*, 69–110 m inland of the surf. Marosh is inland; find out what
  draws its line and say so.

## What jobs 1–3 have handed you

Read `docs/southwest-1-report.md`, `-2-report.md` and `-3-report.md` in full. Specifically:

- **Job 3 predicts that building Marosh will wet the Meroshe's eastern hexes** the way Hama wetted
  its western ones — expect job 2's four aridity exceptions to become eight or ten, and job 2's
  `green shoulder` landmark (written as a promise about unbuilt country) to come true. **Check both
  and report.**
- `merosheFog` was written toward the Trogo margin and should need nothing, **but the fog belt's own
  aridity wants re-measuring** once a rainforest stands next to it.
- **Extend `southwestAridity`, `src/content/regions/southwest/southwest-world.js`, `-scenery.js`, `-wildlife.js` and
  `tests/southwest-world.test.js`** — this is the fourth job to do so.
- **`groundTint` in `src/world/terrain/world-terrain.js` is an if/else chain that has now failed silently twice**
  (job 2 found a whole block's tint dropped; job 3 met it again one level down inside
  `southwestTint`). Job 3 recommends it become a table. **If you add a tint, prove it reaches the
  screen.** Making it a table is welcome if you have the room.
- **The haze lesson, from both directions**: job 1 found a near-white haze was over half of every
  pixel past 150 m; job 3 found the renderer lifts authored colour, so darken. A rainforest is the
  one country where haze is the subject, so expect to iterate.
- **`OWN_SKY` is now one shared list in `tests/own-sky.js`** (job 3's permanent guard). Use it.

## The world box

`WINDOW` is `{minQ −49, maxQ 34, minR 79, maxR 144}`; the box is x −4360.002…610, z −2167.2…3177.8.

**Job 2 predicted the box would not move and it moved 780 m south. Job 3 was told the same and it
moved 400 m west.** Job 3's closing note is the rule: **a prediction about the window is not a
prediction about the box**, because `x = W(q + r/2)` — a country can move the *western* edge by
sitting further *south*. Trogo's row 142 is the one to watch; job 2's arithmetic put the southern
edge at about **3264.4**. **Measure both axes. Do not assume either.** Every guard file now carries
its own measurement, so a move is arithmetic; job 3 lists them.

## Wildlife

Extend `src/content/regions/southwest/southwest-wildlife.js`. The block's density has been climbing back: job 2's desert
0.074 a hex, job 3's 0.178. **A rainforest should be the densest country in the game** — that is
what `Af` means — and Marosh's Mediterranean hills are not far behind. Say each country's density
and why, and make the contrast with the Meroshe explicit, because these two countries are the other
end of the same block.

Rigs today include boar, dolphin, duck, egret, goose, gull, harrier, hill-sheep, longhorn,
nethrani-cattle, otter, plateau-hawk, red-deer, river-fox, sea-plunger, stilt, turkey-vulture,
upland-hare, wading-bird, bone-bird, and whatever jobs 1–3 added — check. **Up to two new rigs
here**, more than the previous jobs were allowed, because a rainforest with only temperate animals
in it is a worse lie than an empty desert. Only animals the lore names, and follow job 1's example:
it took the river-name *Vaellir* straight from the Pyrosi lexicon rather than inventing one.

**Three standing refusals, all held three times, all the user's to decide — do not overturn them:**
- **The Ganesh dustback** is named by the lore but its body never described. Inventing a shape for a
  named animal is the user's call.
- **The canyon tortoise** is named *and* described but fails the west's law that nothing can be
  walked down. Job 3 noted Trogo is the last country that could want it — if you want it, solve the
  law honestly or leave it.
- **No domestic stock** anywhere in the block.

## Registration checklist

For each: `src/world/terrain/region-layout.js` REGION_BIOMES + PLAYABLE_REGIONS · `src/world/terrain/region-world.js`
REGION_IDS, REGION_TERRAIN (with `byTerrain.deep_forest` — its first use anywhere), REGION_TEXT ·
`src/dev/tools/developer-atlas.js` LOCALS · `src/ui/map/map-fog.js` areas · `src/dev/tools/build-status.js` ·
`src/world/environment/region-sky.js` (a rainforest sky is not a desert sky) · `src/gameplay/skills/languages.js` ·
**`src/world/scenery/undergrowth.js`** and its hook · extend the three `southwest-*` modules ·
`tests/southwest-world.test.js` **and a dedicated undergrowth/crossing test** · `package.json` ·
`docs/southwest-4-report.md` · a dated entry in `docs/design-answers.md`.

## Tests

Your own, plus: **`nobody-sealed-in`** (the one that matters most), southwest-world, mithala-world,
west-lotharn-world, west-lotharn-peaks, east-lotharn-world, oves-world, gala-world, ascarth-world,
eer-world, isareos-world, nethereum-world, izol-world, south-suval-world, feradom-world,
region-layout, region-survey, regions-world, developer-atlas, map-fog, region-sky, languages,
region-levels, open-country, west-life, regional-wildlife, town-life, closed-border, **climbing,
climbing-world** (you are adding a second movement rule beside it), terrain-fall, drawn-ground,
cartography, west-rivers, autopilot, autopilot-world.

**Stale lists**: five found by the West Lotharn builder, seven by Mithala, seven by job 1, thirteen
assertions by job 2, ten by job 3. Job 2 wrote a permanent PLAYABLE-order guard and job 3 made
`OWN_SKY` a shared list, so the two worst repeat offenders are fixed. The rest: `open-country`'s
probes (untouched four jobs running — do not assume that continues), the world-box guards, and
`region-survey`'s `LAND_HEXES` ratio, which job 3 found was never in any brief.

**`npm test` cannot run on this machine** — it exceeds the Windows command-line limit.

**Known-failing on this base, not yours:** `chameleon`, `regional-wildlife` (Iscare),
`south-suval-world` (the Stillwater), `amod-world`, `elagos-world`, `campaign-world`
(`drent.hexes`), `west-life` × 3 (`elagos-meadow-cattle` at 0.34 m,
`feradom-country-17-98` at 25.5 s, `oveth-herons`). **Job 2's coverage warning still stands**: each
west-life chase law asserts inside its loop and stops at the first failing band, so laws 3–5 have
never exercised a single southwest range. Your own site checks are what stand behind your animals.

One short review render at the end if electron is available, **after** the last scenery change —
four builders photographed too early and regretted it. No autoplays, no long smokes.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js`, `src/dev/tools/developer-atlas.js` are CRLF.

## Report

`docs/southwest-4-report.md`: **what a deep forest is now, in one paragraph somebody building the
Ibenwoods can act on**; the sight distance in paces and the haze number that bought it; the
undergrowth rule, its ways through, and the flood-fill proof in both directions; whether anything
can be sealed in; the climate read and where the forest's edge falls; whether Marosh wetted the
Meroshe and whether the green shoulder came true; the fog belt's re-measured aridity; both world-box
axes measured; each country's wildlife density against the desert's; every test and every stale
list; review views; and open questions — this is the last job of the programme, so say what the
whole southwest still needs.
