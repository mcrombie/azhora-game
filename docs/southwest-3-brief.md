# The southwest, job 3 of 4: Cape Heth, the Dinelv Highlands and Hama

Brief written 2026-09-30 by the coordinating session. Job 3 of the four-job programme covering
Azhora's southwest quarter, which the user chose in full, with the Ibenwood belt left unbuilt.

| job | regions | hexes | ids | state |
|---|---|---|---|---|
| 1 | Navarth, West Pyros, Ganesh Desert, Ganesh Plain | 107 | 32–35 | built (`9fd150f`) |
| 2 | the four Meroshe deserts | 95 | 36–39 | built (`403097f`), **your base** |
| **3 (this one)** | **Cape Heth, Dinelv Highlands, Hama** | **73** | **40–42** | |
| 4 | Marosh, Trogo | 47 | 43–44 | needs a user decision first |

Do **only job 3**.

**Terrain, climate, water, scenery and wildlife only — and nothing that belongs to anybody.**

## Read the two reports before anything else

`docs/southwest-1-report.md` (831 lines) and `docs/southwest-2-report.md` (935 lines) are the block
you are joining. They carry, and you inherit:

- **The block's datum**: its river mouths and shores, the only places sea level is a fact.
- **`southwestAridity`** in `src/content/regions/southwest/southwest-world.js` — extend it, do not start a second field.
- **The modules are `southwest-*`** — extend them; this is the third job to do so.
- **The haze lesson**: on country whose subject is distance, the haze colour matters more than the
  ground colour. Desert haze is `0xc6b996` at .0024.
- **Job 2's answer to flat country**: surface, not relief. Hamada, erg, reg and sabkha, each with
  its own sight distance and its own way of navigating.
- **`groundTint` is an if/else chain in `src/world/terrain/world-terrain.js` and it silently dropped an entire
  block's tint for a whole build.** Job 2 fixed the missing branch and recommended it become a
  table. If you add a tint, **check it reaches the screen** — do not assume.

## State of play

- Branch `southwest-3` in its own worktree, cut from **`southwest-2` (403097f)**. Never cd into
  another checkout, never a bare `git stash`, **do not commit**.
- **None of the three is in the survey.** Add all three to `PLAYABLE` after
  `'South Meroshe Desert'` and regenerate with `node scripts/build-region-survey.mjs`.
- **Ids after `'South Meroshe Desert': 39`:** `'Cape Heth': 40`, `'Dinelv Highlands': 41`,
  `Hama: 42`.

## What the atlas says

| | **Cape Heth** (40) | **Dinelv Highlands** (41) | **Hama** (42) |
|---|---|---|---|
| hexes | 19, q −39…−34, r 125…129 | 35, q −37…−29, r 126…132 | 19, q −37…−32, r 137…141 |
| terrain | plains 18, **`coast` 1** | **hills 26, plains 6, mountain 3** | grassland 9, plains 10 |
| climate (verify per hex) | `BWh` 18, **`Cfb` 1** | `BWh` 35 | **`Csb` 9, `BWh` 10** |
| built neighbours | Ganesh Desert 5, Dinelv 8 | Ganesh Desert 10, N Meroshe 9, W Meroshe 9, Cape Heth 8, Ganesh Plain 4 | W Meroshe 5, Central Meroshe 7, South Meroshe 7 |
| sea/unclaimed | **21** | 6 | **19** |

Verify all of this yourself, and read the climate per hex from
`world-builder/map/resources/examples/azhora.wwmap` (`hexes[key].climate`, `koppen-v1`), **not**
`azhora.cmap.json`.

**Three things here are firsts or near-firsts, and each is the point of its country:**

1. **Cape Heth has a `coast` terrain hex** — check whether any built region has one; if not, say what
   you made of it. With 21 sea/unclaimed edges this is the block's most maritime country, and job 1
   already called the desert-meeting-the-sea the most striking fact in the southwest.
2. **The Dinelv Highlands are `BWh` on all 35 hexes with 26 `hills` and 3 `mountain`** — **desert
   highlands**, which the game has never built: the Lotharns are humid, the Meroshe is flat. This is
   the escarpment the Meroshe's fan skirt already falls away from. Job 2 built `merosheSkirt` and
   `MEROSHE_FANS` as a one-sided ramp **falling away from this margin on purpose**, so giving Dinelv
   a highland base should lift the fan heads automatically — **verify that it does** and report it.
   Its 3 mountain hexes are not a range; decide what three mountain hexes in a desert highland are.
3. **Hama is half Mediterranean and half desert** (`Csb` 9, `BWh` 10) — the **wet edge of the
   desert**, and the only place in the block where the aridity gradient reaches a green country from
   the dry side. Where that line falls on the ground is the country's subject. Job 2's South Meroshe
   fog belt is its neighbour; check whether the two explain each other.

## Lore

`dinelv_highlands.md`, `cape_heth.md` and `hama.md` in
`world-builder/azhora_lore/geography/regions/`. Job 2 took the hamada's **north–south bench strike**
straight from `dinelv_highlands.md`'s own sentence, so that file is already partly spent — read what
it says about the highlands themselves. Adjust the lore **in place** for whatever the atlas
contradicts (never commit, stage or stash in `world-builder`; if a write is refused, append to
`docs/lore-adjusted-to-atlas.md`).

## The world box

Job 2 moved it south: `WINDOW` is now `{minQ −45, maxQ 34, minR 79, maxR 144}` and the box is
x −3960…610, z −2167…3178. **Job 2's prediction is that all three of your countries are inside it**
— your extremes are q −39 (Cape Heth) and r 141 (Hama). **Verify rather than assume**: that is the
exact lesson of job 2, which was told the box would not move and moved it 780 m south. If it holds,
leave every guard alone and say so. Job 2 lists the ten guard files and each now carries its own
measurement, so a move is arithmetic.

## Seams

**This is the first southwest job whose regions are mostly surrounded by built country** — Dinelv
alone has 40 built edges. Match them; job 2's report gives its numbers, and every profile in the
block uses wavelength **320**. Specifically:

- **Dinelv | the Meroshe fan skirt** — the one-sided ramp described above.
- **Dinelv | Ganesh Desert 10 edges and Ganesh Plain 4** — job 1's countries.
- **Cape Heth | Ganesh Desert 5** — and job 1 noted Cape Heth is the Ganesh's western neighbour and
  that widening the window for it was what gave the Ganesh its horizon.
- **Hama | the three Meroshe quarters, 19 edges.**
- Report the ribs on the remaining outland margins (job 1 measured 9.13 m worst, job 2 similar), but
  do not chase them.

## Wildlife

Extend `src/content/regions/southwest/southwest-wildlife.js`. The block's standard, set by job 1 and held by job 2, is
**emptiness measured and defended**: 7 ranges over job 2's 95 hexes, 0.074 a hex. **But two of your
three countries are not that dry.** Hama's `Csb` half and Cape Heth's coast can carry more life than
the erg, and should — the block has been getting emptier for two jobs and this is where it stops.
Say what each country's density is and why.

At most **one new rig**, only if the lore names the animal. **Hold the line both previous jobs
held**: the **Ganesh dustback** is named but never described, and inventing a body for a named
animal is the user's decision. Job 2 raised the **canyon tortoise** — named *and* described, but it
fails the west's law that nothing can be walked down; if you want it, solve that honestly or leave
it. **No domestic stock.**

## Tests

Run your own and this list with `node --test tests/<name>.test.js`: southwest-world, mithala-world,
west-lotharn-world, west-lotharn-peaks, east-lotharn-world, oves-world, gala-world, ascarth-world,
eer-world, isareos-world, nethereum-world, izol-world, south-suval-world, feradom-world,
region-layout, region-survey, regions-world, developer-atlas, map-fog, region-sky, languages,
region-levels, open-country, west-life, regional-wildlife, town-life, closed-border, climbing,
terrain-fall, drawn-ground, cartography, west-rivers.

**Stale lists**: the West Lotharn builder found five, Mithala seven, job 1 seven, job 2 **ten files
and thirteen assertions**. Job 2 also wrote a **permanent guard** into `tests/region-layout.test.js`
— PLAYABLE_REGIONS is in strictly increasing REGION_IDS order with no gaps, stated once for every
country — which should stop the "last N in the list" bug that four builders fixed in four files.
The recurring rest: `open-country`'s probes, the world-box guards, and `OWN_SKY` pinned in both
`region-sky` and `eer-world`.

**A known coverage gap, from job 2**: each west-life chase law asserts *inside* its loop, so it
stops at the first failing band — while the three known failures persist, **laws 3–5 have never
exercised a single southwest range**. Do not treat a green west-life as proof your ranges are safe;
the reach law and your own site checks are what stand behind them.

**`npm test` cannot run on this machine** — it exceeds the Windows command-line limit.

**Known-failing on this base, not yours:** `chameleon`, `regional-wildlife` (Iscare),
`south-suval-world` (the Stillwater), `amod-world`, `elagos-world`, `campaign-world`
(`drent.hexes`), and `west-life` × 3 (`elagos-meadow-cattle`, `feradom-country-17-98`,
`oveth-herons`). Prove any of your own by removing your zones and re-running, as three builders have.

Maps and renders: `node scripts/region-map.mjs` with `MAP_LO`/`MAP_HI`; one short review render at
the end if electron is available, **after** the last scenery change. No autoplays, no long smokes.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js`, `src/dev/tools/developer-atlas.js` are CRLF.

## Report

`docs/southwest-3-report.md`: what each of the three is *about*; the climate read; what you made of
the `coast` hex, the three `mountain` hexes and Hama's wet/dry line; whether the Meroshe fan heads
lifted as job 2 predicted; every seam with its numbers; whether the world box moved; each country's
wildlife density and why; every test and every stale list; review views; open questions — including
anything job 4 needs, since Marosh is Hama's climatic cousin and Trogo is South Meroshe's neighbour.
