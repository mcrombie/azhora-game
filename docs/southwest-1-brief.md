# The southwest, job 1 of 4: Navarth, West Pyros, the Ganesh Desert and the Ganesh Plain

Brief written 2026-09-30 by the coordinating session. The user asked for "the terrain and wildlife
of the southwest regions of Azhora, south of the Ibenwood regions and Alezhor", and when asked how
far that reached, chose **the whole southwest quarter — 13 regions, 322 hexes** — and chose to
**leave the Ibenwood forest belt unbuilt for now**.

**This job is the first quarter of that programme**: the northern tier, the band lying directly
south of Alezhor and the Ibenwoods. Three more jobs follow, each branching from the one before:

| job | regions | hexes | ids |
|---|---|---|---|
| **1 (this one)** | **Navarth, West Pyros, Ganesh Desert, Ganesh Plain** | **107** | **32–35** |
| 2 | North, West, Central and South Meroshe Desert | 95 | 36–39 |
| 3 | Cape Heth, Dinelv Highlands, Hama | 73 | 40–42 |
| 4 | Marosh, Trogo | 47 | 43–44 |

Do **only job 1**. Leave the other nine alone; a later agent takes them on a branch cut from yours.

**Terrain, climate, water, scenery and wildlife only — and nothing that belongs to anybody.** No
settlement, road, well, wall, bridge, boat, person, sign or quest, as in every region built before
this (`docs/four-regions-brief.md`, `docs/six-regions-brief.md`, `docs/gala-brief.md`,
`docs/ascarth-brief.md`, `docs/oves-brief.md`, `docs/west-lotharn-brief.md`,
`docs/mithala-brief.md`). Pyros the empire, its cities and its Tallyss fire-religion are somebody's
and are not built; so is everything the lore hangs on the Ganesh caravan routes.

## State of play

- **None of the four is registered or in the survey.** Add all four to `PLAYABLE` in
  `scripts/build-region-survey.mjs` after `'North Mithala'` and regenerate with
  `node scripts/build-region-survey.mjs`. Never hand-edit `src/dev/tools/region-survey.js`.
- **Region ids, in this order after `'North Mithala': 31`:** `Navarth: 32`, `'West Pyros': 33`,
  `'Ganesh Desert': 34`, `'Ganesh Plain': 35`.
- Branch `southwest-1` in its own worktree, cut from **`mithala` (599d192)** — that is main plus
  the West Lotharn plus the four Mithala countries. Never cd into another checkout, never a bare
  `git stash`, **do not commit** — leave the work uncommitted and report.
- `src/world/terrain/region-levels.js` already carries `West Pyros` and `Ganesh Plain` at level 3; check the
  other two and follow whatever it says.

## What the atlas says (authority; the lore is adjusted to it)

| | **Navarth** (32) | **West Pyros** (33) | **Ganesh Desert** (34) | **Ganesh Plain** (35) |
|---|---|---|---|---|
| hexes | 22, q −28…−23, r 116…122 | 27, q −25…−21, r 116…125 | 31, q −33…−27, r 120…126 | 27, q −28…−22, r 123…127 |
| terrain | **hills 10**, plains 11, forest 1 | plains 26, grassland 1 | plains 31 | plains 26, grassland 1 |

**Measure everything yourself** — neighbour edges, world extents, which hex is which — as every
builder before you has. The one `forest` hex in Navarth and the one `grassland` hex in each of West
Pyros and the Ganesh Plain are worth finding and using; a single hex cannot carry a band, but it
can carry a feature, the way the West Lotharn's one `Dfa` hex became its cold head.

**Climate**: read it **per hex** from `world-builder/map/resources/examples/azhora.wwmap`
(`hexes[key].climate`, `koppen-v1`) — **not** `azhora.cmap.json`, whose one-code-per-region field
is a default and says `Cfb` for almost everything. Report what you find for all four and build to
it. Expect arid and semi-arid codes here; if a country turns out to have more than one, that
gradient is the country's shape, as Gala's three bands were.

## Connectivity — say this plainly in the report

**None of these four touches a built country.** The built frontier in the west is Nethereum and
Isareos, which border the Ibenwoods, and the Ibenwoods are not built. So this block is an island:
reachable by F8 go-anywhere travel and by nothing else until the forest belt is built. The user
knows and chose it. What follows from it:

- Every margin of this block is **outland**, so expect the ribs that Gala, Ovesos, the West Lotharn
  and Mithala all reported (relief wavelength blending against outland's 150 m). **Measure them and
  report them; do not chase them** — the cure is a world-wide job in `relief()`/`terrainMix`.
- The four **internal** seams are yours and must be invisible.
- There is no built neighbour to match levels against, so the block's own internal coherence is the
  only standard. Say what you chose as the block's datum and why.

## The world box grows west — measure it

**Cape Heth reaches q −39 and Dinelv q −37 in later jobs, but this job already has the Ganesh
Desert at q −33, and `WINDOW.minQ` is −33.** The window comment records that −33 was measured as
"two hexes of slack" past the westernmost hex the coast lattice reaches (q −31). Adding countries
at q −33 will move that.

1. **Measure** how far `minQ` must drop, the way the Ascarth builder measured `maxR` 133 → 135 and
   the Mithala builder measured `minR` 90 → 79: the lattice samples out to `COAST_MARGIN` plus one
   hex circumradius beyond the world bounds. Write the measurement into the comment.
2. Report **every world-box number that moves** and what claimed hexes the widened window turns
   from sea into land — Mithala's widening reclassified 329 hexes in 17 countries, which mattered.
3. **Every world-box guard will need new numbers.** They live in at least
   `tests/region-layout.test.js`, `tests/isareos-world.test.js`, `tests/nethereum-world.test.js`,
   `tests/izol-world.test.js`, `tests/ascarth-world.test.js` and `tests/west-lotharn-world.test.js`
   — the last two are copies previous builders found the hard way. There may be more; look.

## Lore

`world-builder/azhora_lore/geography/regions/` has `navarth.md`, `ganesh_desert.md`,
`ganesh_plain.md` and `pyros.md`; `culture/azhoran_religions.md` covers the Pyrosi Tallyss
material and `fauna/azhoran_fauna_overview.md` the animals. **Note a spelling difference and report
it**: the atlas says *Meroshe* Desert where the lore file is `moroshe_desert.md` — that is the next
job's problem, but check whether anything similar applies to these four. Adjust the lore **in
place** for whatever the atlas contradicts (never commit, stage or stash in `world-builder`); if a
write is refused, append claim by claim to `docs/lore-adjusted-to-atlas.md` and say so.

## Wildlife

A new `src/content/regions/southwest/southwest-wildlife.js` (the later jobs will extend it), zones tagged with each region
name, spread into `src/content/regions/western-regions/west-regions-life.js` after Mithala's. `src/content/regions/oves/oves-wildlife.js` is the closest
precedent — the Oves Desert is the game's existing dry country, and **what it did about emptiness
is the model**: a level-4 country with three ranges was the honest dry-year reading, and it said so
rather than padding. Arid country should feel sparse; that is not a failure.

Rigs today include boar, dolphin, duck, egret, goose, gull, harrier, hill-sheep, longhorn,
nethrani-cattle, otter, plateau-hawk, red-deer, river-fox, sea-plunger, stilt, turkey-vulture,
upland-hare, wading-bird, plus whatever the West Lotharn and Mithala added — check. At most **two
new rigs** across this job, and only if the lore names the animal. **Domestic stock is somebody's:
none** — no caravan beasts, no herds.

Every site measured on the built ground; every extension labelled with its reason; an animal
backing off needs ~90–150 m of clear room behind it. Probe new zones a country at a time: the
west-life chase loop stops at the first failing zone.

## Registration checklist — four times over

For **each**: `src/world/terrain/region-layout.js` REGION_BIOMES + PLAYABLE_REGIONS · `src/world/terrain/region-world.js`
REGION_IDS, REGION_TERRAIN (default + `byTerrain` for hills/plains/grassland/forest), REGION_TEXT
(subtitle, spawn on dry ground, description, palette, `npcIds: []`, landmarks) ·
`src/dev/tools/developer-atlas.js` LOCALS (`[id, label, target, regionId, anchor]`) · `src/ui/map/map-fog.js` areas
(radius 18–130, > 60 % inside its own region) · `src/dev/tools/build-status.js` · `src/world/environment/region-sky.js` (arid
country may want its own sky; argue it) · `src/gameplay/skills/languages.js` (the lore gives Pyros a Tallyss
tongue; decide and say why) · `src/content/regions/southwest/southwest-world.js` hooked into the chain in
`src/world/terrain/world-terrain.js` · `src/content/regions/southwest/southwest-scenery.js` hooked in `src/world.js` ·
`src/content/regions/southwest/southwest-wildlife.js` · `tests/southwest-world.test.js` · `package.json` ·
`docs/southwest-1-report.md` · a dated entry in `docs/design-answers.md`.

Name the modules `southwest-*` rather than after one country: jobs 2–4 extend them.

Names: check `world-builder/azhoran_language_profiles.py` first; coin nothing if there is no
profile — titles in plain English or the lore's own words.

## Tests — and the lists that go stale every time

Run your own and this list with `node --test tests/<name>.test.js`: mithala-world,
west-lotharn-world, west-lotharn-peaks, east-lotharn-world, east-lotharn-peaks, oves-world,
gala-world, ascarth-world, eer-world, isareos-world, nethereum-world, izol-world,
south-suval-world, feradom-world, region-layout, region-survey, regions-world, developer-atlas,
map-fog, region-sky, languages, region-levels, open-country, west-life, regional-wildlife,
town-life, closed-border, climbing, terrain-fall, drawn-ground, cartography, west-rivers.

**Every region so far has left some of these encoding the old world. The West Lotharn builder found
five; the Mithala builder found seven. Find yours:**

1. **`tests/open-country.test.js`** keeps probe points it calls ground nobody owns. Build over one
   and three of its tests fail with your region's name — **the code is right, the probe is stale**.
   Move it to a measured point: open country by both `regionAt` and `hexOwnerAt`, outside the named
   `was` region, still a few hundred metres from it.
2. **The world-box guards**, which this job will certainly break (see above).
3. **Allow-lists that exist in more than one copy** — `OWN_SKY` is pinned in both
   `tests/region-sky.test.js` and `tests/eer-world.test.js`; "last in the region order" assertions
   have been found in two different files.

**`npm test` cannot run on this machine** — the script exceeds the Windows command-line limit. The
coordinator runs the suite in chunks at integration; do not attempt it.

**Known-failing on this base, not yours:** `chameleon` (Ed has 19 spots against 22 expected),
`regional-wildlife` ("previously empty regions" missing Iscare), `west-life` × 3
(`elagos-meadow-cattle`, `feradom-country-17-98`, `oveth-herons`), `south-suval-world` (the
Stillwater), `amod-world`, `elagos-world`. If one of your own zones fails a west-life law, prove
it by taking your zones out and re-running, as two builders before you did.

Maps: `node scripts/region-map.mjs minX,minZ,maxX,maxZ [scale] [out.png] [x,z;x,z]` with env
`MAP_LO`/`MAP_HI` — flat country needs `MAP_HI` lowered. One short review render at the end if
electron is available, taken **after** any final scenery tuning; four builders in a row
photographed before their last change and regretted it. No autoplays, no long smokes.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js` and `src/dev/tools/developer-atlas.js` are
CRLF; keep every file as found.

## Report

`docs/southwest-1-report.md`: what the atlas gave and what was chosen where it was silent; the
climate read for all four; **the window measurement and every world-box number that moved**, with
what the widened window pulled in; the four internal seams; the ribs against the outland on every
margin; what you chose as the block's datum; every zone with its species and why; every test run
with its result and every stale list you moved; review views; open questions — including anything
jobs 2–4 will need to know, since the next agent branches from your work. Final message: the same,
short, plus every file touched.
