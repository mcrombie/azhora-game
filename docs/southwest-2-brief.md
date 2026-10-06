# The southwest, job 2 of 4: the Meroshe Desert, all four quarters

Brief written 2026-09-30 by the coordinating session. Job 2 of the four-job programme covering
Azhora's southwest quarter (13 regions, 322 hexes), which the user chose in full, and chose to
build with the Ibenwood forest belt left unbuilt.

| job | regions | hexes | ids | state |
|---|---|---|---|---|
| 1 | Navarth, West Pyros, Ganesh Desert, Ganesh Plain | 107 | 32–35 | **built, on your base** |
| **2 (this one)** | **North, West, Central and South Meroshe Desert** | **95** | **36–39** | |
| 3 | Cape Heth, Dinelv Highlands, Hama | 73 | 40–42 | |
| 4 | Marosh, Trogo | 47 | 43–44 | |

Do **only job 2**. A later agent takes jobs 3 and 4 from a branch cut off yours.

**Terrain, climate, water, scenery and wildlife only — and nothing that belongs to anybody.** No
settlement, road, well, waystation, cistern, wall, bridge, person, sign or quest. The Moreshi
oasis-keepers, the caravan routes, the water rights and everything the lore hangs on them are
somebody's and are not built.

## Read job 1 first

`docs/southwest-1-report.md` (831 lines) is the block you are joining and the single most useful
thing you can read. In particular:

- **The block is an island.** Nothing in the southwest touches a built country; it is reached by F8
  and nothing else until the Ibenwoods are built. Job 1's **datum** is the block's two river
  mouths — the gulf at the Ganesh Desert's north-west and the Vaellir's mouth at West Pyros's tip —
  because those are the only two places where sea level is a fact. **Keep that datum.**
- **Job 1 found the game's first true desert** (`BWh`) and built a climate gradient across four
  countries (`southwestAridity` in `src/content/regions/southwest/southwest-world.js`). Yours is drier still; extend that
  field rather than inventing a second one.
- Its modules are named `southwest-*` **precisely so you extend them** rather than adding a fifth
  family: `src/content/regions/southwest/southwest-world.js`, `-scenery.js`, `-wildlife.js`, `tests/southwest-world.test.js`.
- Its haze lesson is the one to carry: on country whose subject is distance, **the haze colour
  matters more than the ground colour**. Its desert first came back white; ~36 % off every ground
  swatch moved the screen 5 %, because at .0030 density a near-white haze was over half of every
  pixel past 150 m. It settled on warm dust `0xc6b996` at .0024.

## State of play

- Branch `southwest-2` in its own worktree, cut from **`southwest-1`**. Never cd into another
  checkout, never a bare `git stash`, **do not commit** — leave the work uncommitted and report.
- **None of the four is in the survey.** Add all four to `PLAYABLE` after `'Ganesh Plain'` and
  regenerate with `node scripts/build-region-survey.mjs`. Never hand-edit `src/dev/tools/region-survey.js`.
- **Region ids, in this order after `'Ganesh Plain': 35`:** `'North Meroshe Desert': 36`,
  `'West Meroshe Desert': 37`, `'Central Meroshe Desert': 38`, `'South Meroshe Desert': 39`.

## What the atlas says (authority; the lore is adjusted to it)

| | **North Meroshe** (36) | **West Meroshe** (37) | **Central Meroshe** (38) | **South Meroshe** (39) |
|---|---|---|---|---|
| hexes | 23, q −32…−24, r 128…132 | 20, q −37…−33, r 132…136 | 31, q −33…−27, r 132…137 | 21, q −32…−26, r 136…141 |
| terrain | plains 23 | plains 20 | plains 31 | plains 21 |
| built neighbour | **Ganesh Plain 10 edges** | — | — | — |
| other neighbours | Central 11, Dinelv 9, Marosh 7, West 3 | Dinelv 9, Central 7, Hama 5, North 3, sea 10 | North 11, South 9, Marosh 8, Hama 7, West 7 | Trogo 13, Central 9, Hama 7, Marosh 3, sea 4 |

- **`plains` on all 95 hexes and `BWh` on all 95 hexes.** One terrain, one climate, ninety-five
  hexes — **the largest single-character expanse in the game by a wide margin**, and the whole
  problem of this job. Verify the climate yourself per hex from
  `world-builder/map/resources/examples/azhora.wwmap` (`hexes[key].climate`, `koppen-v1`), not
  from `azhora.cmap.json`.
- **West Meroshe has 10 sea/unclaimed edges and South Meroshe 4** — this desert reaches open water
  on its west and south. Job 1 found the same thing at the Ganesh's gulf and called it the most
  striking fact in the southwest, unmentioned by the lore. Check whether these are sea or merely
  unclaimed land, and say which.

## The real problem: ninety-five hexes of flat nothing

The atlas gives you no relief, no variety and no water. That is not a licence to invent mountains;
it is the country's subject. **How a desert this size stays worth crossing is the one design
question of this job**, and your report should answer it in so many words.

Job 1's Ganesh Desert is your precedent at a third the scale — a one-sided basin ramp, a wind field
of ¾ m on two turned bearings plus a grain on the summer-wind bearing (the lowest-amplitude
landform in the game), two dry washes with nothing in them, and one damp reach. **Do not simply
repeat it four times.** Four quarters with distinct characters is the honest reading of an atlas
that bothered to name four; find what separates them — proximity to the sea, to the Dinelv
highlands, to Marosh's Mediterranean corner, to Trogo's forest — and let each quarter be about one
thing. The lore's Moreshi material is the place to look for what a desert means to the people who
cross it, even though none of them is built.

**Erg, reg, hamada** — sand sea, stone pavement, bare rock — are real and distinct desert surfaces
and the game has drawn none of them at scale. That is a richer answer than dunes everywhere.

## Lore, and the spelling

The lore file is `world-builder/azhora_lore/geography/regions/moroshe_desert.md`, and job 1 found
the atlas's **Meroshe** is already one of the lore's own two spellings (`ganesh_desert.md` writes
Meroshe throughout, `pyros.md` writes Moroshé, the language profile lists Meroshe). **Follow the
atlas: Meroshe.** Note in the report whether the lore should be made consistent, but do not rename
the file. There may be one lore file for a desert the atlas splits four ways — say how you divided
what it describes, and adjust it **in place** (never commit, stage or stash in `world-builder`; if
a write is refused, append to `docs/lore-adjusted-to-atlas.md` and say so).

## Water

The atlas draws no watercourse here — check, and say so if true. A desert with no permanent water
is the honest reading, and job 1's Ganesh Desert has none either (its one green place, the damp
reach, is the tail of an exogenous river that crosses it). If you build anything wet it must be
justified from the map or the lore and labelled.

## Wildlife

Extend `src/content/regions/southwest/southwest-wildlife.js`. **Job 1's finding governs here**: the Ganesh Desert, its largest
country at 31 hexes, carries **three** ranges, two of them birds in the air, because its lore says a
severe dry year "presents a surface that appears essentially lifeless". Ninety-five more hexes of
`BWh` should be sparser still per hex, not four times as populous. **Emptiness measured and
defended is the right answer**; padding it is not.

Job 1 added the **bone-bird** rig (the fauna overview names it, describes it and places it here) and
left its second new rig unspent. You may add **at most one** new rig, and only if the lore names the
animal. Job 1 explicitly declined the **Ganesh dustback** because the lore names it but never
describes its body, and inventing a shape for a named animal is the user's decision, not a
builder's — **hold that line**. No domestic stock: no caravan beasts, no herds.

Every site measured on the built ground; every extension labelled; an animal backing off needs
~90–150 m of clear room. Probe zones a country at a time; the west-life chase loop stops at the
first failing zone, and job 1 reports those laws now take 5 and 17 minutes.

## Seams

- **Ganesh Plain, 10 edges — your only built neighbour.** Match it; job 1's report gives its
  numbers and its profiles use one wavelength (320) throughout. Job 1 also warns that **the Ganesh
  Plain's third channel runs east on purpose**, making a visible divide, and that if your blend
  changes that margin the divide moves — **re-measure those three channels and report them**.
- The **internal** seams between your four are yours and must be invisible.
- Everything else is outland: Dinelv, Marosh, Hama, Trogo. Job 1 measured ribs at a worst 2 m step
  of **9.13 m** on outland margins; yours will be similar. **Measure and report; do not chase.**

## The world box

Job 1 already moved `WINDOW.minQ` to **−41** and `WORLD_BOUNDS.minX` to **−3960.0019279391277**.
Your westernmost hex is West Meroshe at q −37, **inside** that, so the box should not move. **Verify
it rather than assuming**, and if it holds, say so — and leave every world-box guard alone. Job 1
lists where they live: `region-layout`, `isareos-world`, `nethereum-world`, `izol-world`,
`ascarth-world`, `west-lotharn-world`, `mithala-world`.

## Registration checklist — four times over

For **each**: `src/world/terrain/region-layout.js` REGION_BIOMES + PLAYABLE_REGIONS · `src/world/terrain/region-world.js`
REGION_IDS, REGION_TERRAIN, REGION_TEXT (subtitle, spawn on dry ground, description, palette,
`npcIds: []`, landmarks) · `src/dev/tools/developer-atlas.js` LOCALS · `src/ui/map/map-fog.js` areas (radius 18–130,
> 60 % inside) · `src/dev/tools/build-status.js` · `src/world/environment/region-sky.js` (job 1 built a desert sky at .0024 —
share it or argue for your own) · `src/gameplay/skills/languages.js` (job 1 added `ganesh`, the Moreshi/Mittoli
contact speech; the Moreshi are this desert's people — decide and say why) · extend
`src/content/regions/southwest/southwest-world.js`, `-scenery.js`, `-wildlife.js` · extend `tests/southwest-world.test.js` ·
`package.json` if needed · `docs/southwest-2-report.md` · a dated entry in `docs/design-answers.md`.

Names: check `world-builder/azhoran_language_profiles.py` first — job 1 found a `pyrosi` profile and
took the river-name **Vaellir** straight from its lexicon rather than inventing one. Do the same or
coin nothing.

## Tests

Run your own and this list with `node --test tests/<name>.test.js`: southwest-world, mithala-world,
west-lotharn-world, west-lotharn-peaks, east-lotharn-world, oves-world, gala-world, ascarth-world,
eer-world, isareos-world, nethereum-world, izol-world, south-suval-world, feradom-world,
region-layout, region-survey, regions-world, developer-atlas, map-fog, region-sky, languages,
region-levels, open-country, west-life, regional-wildlife, town-life, closed-border, climbing,
terrain-fall, drawn-ground, cartography, west-rivers.

**Find your stale lists.** The West Lotharn builder found five, Mithala seven, job 1 seven. The
recurring three: `open-country`'s probes (build over one and three tests fail with your region's
name — the code is right, the probe is stale); the world-box guards; and allow-lists that exist in
more than one copy (`OWN_SKY` is pinned in both `region-sky` and `eer-world`). **A "last in the
region order" assertion has now been found and rewritten in three separate files** — if you meet a
fourth, fix it and say so, because it is worth a permanent guard.

**`npm test` cannot run on this machine** — it exceeds the Windows command-line limit. Do not try.

**Known-failing on this base, not yours:** `chameleon`, `regional-wildlife` (Iscare),
`south-suval-world` (the Stillwater), `amod-world`, `elagos-world`, `campaign-world`
(`drent.hexes` 39 against the atlas's 40 — job 1 found this one), and `west-life` × 3
(`elagos-meadow-cattle`, `feradom-country-17-98`, `oveth-herons`). If one of your own ranges fails a
west-life law, prove it by removing your zones and re-running, as three builders have.

Maps: `node scripts/region-map.mjs minX,minZ,maxX,maxZ [scale] [out.png]` with `MAP_LO`/`MAP_HI` —
flat country needs `MAP_HI` lowered hard. One short review render at the end if electron is
available, **after** the last scenery change. No autoplays, no long smokes.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js`, `src/dev/tools/developer-atlas.js` are CRLF.

## Report

`docs/southwest-2-report.md`: **how ninety-five hexes of one climate and one terrain were made
worth crossing**, and what separates the four quarters; the climate read; whether the west and
south edges are sea or unclaimed land; the Ganesh Plain seam and whether its divide moved; the
internal seams; the ribs; confirmation the world box did not move; every zone and why the desert is
as empty as it is; every test run and every stale list you moved; review views; open questions —
including anything jobs 3 and 4 need, since the next agent branches from your work.
