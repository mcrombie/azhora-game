# The Mithala plain: South, West, East and North Mithala

Brief written 2026-09-29 by the coordinating session. The user's word: "start working on the
terrain and wildlife of South Mithala, West Mithala, East Mithala, and North Mithala."

**Terrain, climate, water, scenery and wildlife only — and nothing that belongs to anybody.** No
settlement, road, field wall, ditch, bridge, boat, person, sign or quest, exactly as the eleven
regions before these were built (`docs/four-regions-brief.md`, `docs/six-regions-brief.md`,
`docs/gala-brief.md`, `docs/ascarth-brief.md`, `docs/oves-brief.md`,
`docs/west-lotharn-brief.md`). Mithalenna's cult, the Temple of the Seven Bowls, the Bowl-Keepers,
Minora and every town, canal and bridge of the river country are somebody's and are not built.

**This is one job because it is one plain.** The four countries share 49 internal hex edges and a
single climate; they are quarters of one landform, not four separate countries. Build them as one
family of modules with four registrations.

## Scale — read this before planning

**116 hexes across four regions**, more than double the West Lotharn (48) and the largest job the
project has taken on. Pace yourself: get all four registered and walkable first, then deepen. A
half-finished fifth pass is worth less than four finished countries.

## State of play

- **None of the four is registered, and none is in the survey.** Add all four to `PLAYABLE` in
  `scripts/build-region-survey.mjs` after `'West Lotharn Mountains'` and regenerate with
  `node scripts/build-region-survey.mjs`. Never hand-edit `src/dev/tools/region-survey.js`.
- **Region ids, in this order after `'West Lotharn Mountains': 27`:**
  `'South Mithala': 28`, `'West Mithala': 29`, `'East Mithala': 30`, `'North Mithala': 31`.
  South first because it is the one that touches built country.
- Branch `mithala` in its own worktree, cut from **`west-lotharn` (1722740)**, so the two Lotharn
  ranges are real built ground under South Mithala's northern border. Never cd into another
  checkout, never a bare `git stash`, **do not commit** — leave the work uncommitted and report.
- `src/world/terrain/region-levels.js` already carries `South Mithala` and `West Mithala` at level 3; check what
  it says about the other two and follow it.

## What the atlas says (authority; the lore is adjusted to it)

| | **South Mithala** (28) | **West Mithala** (29) | **East Mithala** (30) | **North Mithala** (31) |
|---|---|---|---|---|
| hexes | 33, q −1…12, r 89…94 | 28, q −1…5, r 87…92 | 23, q 5…13, r 86…89 | 32, q 3…11, r 82…87 |
| terrain | plains 19, grassland 10, **hills 4** | grassland 24, plains 4 | plains 12, grassland 11 | plains 22, grassland 10 |
| built neighbours | **East Lotharn 15, West Lotharn 10** | — | — | — |
| other neighbours | East Mithala 16, West Mithala 8, North Celder 6, South Celder 1, sea/unclaimed 10 | North Celder 12, Henborth 8, North Mithala 7, East Mithala 5, South Mithala 8 | North Mithala 13, South Mithala 16, West Mithala 5, South Acordwood 4, West Acorwood 3, sea/unclaimed 5 | Acor Wetlands 12, West Acorwood 8, Henborth 6, East Mithala 13, West Mithala 7 |

- **No mountain hexes anywhere.** Four `hills` hexes in South Mithala are the only relief the atlas
  asks for. This is a plain — the flattest large country in the game — and it should read as one.
  Resist the urge to invent drama; Eer, Nesdor and the Moros are the precedents for quiet ground
  that still reads well (`REGION_TERRAIN.Eer` is base 7.4, amp .8, wave 300).
- **The only built country this block touches is the Lotharn, through South Mithala's 25 edges.**
  Everything else — Henborth, North Celder, South Celder, the Acor Wetlands, West Acorwood, South
  Acordwood — is unbuilt outland. Expect ribs there; measure and report them, do not chase them.
- **Climate, per hex** from the World Builder map (`world-builder/map/resources/examples/azhora.wwmap`,
  `hexes[key].climate`, `koppen-v1` — *not* `azhora.cmap.json`): **`Dfa` on all 116 hexes.**

## `Dfa` — the first continental country in the game, and what that has to mean

Everything built so far is `Cfa`, `Csa`, `Csb` or `BSh`. **`Dfa` is hot-summer humid continental:
warm wet summers and genuinely cold winters** — the first place in Azhora where winter means
something. Neighbouring reads for context: Henborth `Dfa` × 27, North Celder `Dfa` × 33 + `Dfc` × 1,
the Acor Wetlands `Dfb` × 21 + `Dsb` × 4, Yunethre `Dfa` × 26.

The game has no seasons yet, so **build the summer face** — but say clearly in the code and the
report what winter would bring, so that whoever adds seasons knows what this country is for. This
block, not the Oves, is where seasons will show most. Let the *species* carry the continentality
where the weather cannot: the flora and fauna of a continental plain differ from a Mediterranean
one, and the lore's flora document
(`world-builder/azhora_lore/geography/azhoran_flora_distribution.md`, if it exists) plus
`fauna/azhoran_fauna_overview.md` are where to look first.

## The world grows north — the biggest structural change any region has made

**North Mithala reaches row 82. `WINDOW.minR` is 90.** All four countries lie partly or wholly
north of the current survey window, so:

1. **Measure** how far `minR` must drop, the way the Ascarth builder measured `maxR` 133 → 135:
   the coast lattice samples out to `COAST_MARGIN` plus one hex circumradius beyond the world
   bounds. Write the measurement into the comment; do not guess a round number.
2. The world's northern edge should move from **−1301 m** (the East Lotharn's) to roughly
   **−2170 m**, and the north–south extent from ~37 hexes to ~47. **This is an estimate — measure
   it.**
3. That means **every world-box guard needs new numbers**: `tests/region-layout.test.js` (its
   north–south guard is currently `< 37`), `tests/isareos-world.test.js`,
   `tests/nethereum-world.test.js`, and possibly `tests/izol-world.test.js`. State each country's
   case in the comment, as the previous builders did.
4. Check what claimed hexes the widened window newly pulls in — the Ascarth widening turned 25
   hexes from sea into land, Selemi's among them, which mattered. Report what this one does.

## Wildlife

A new `src/content/regions/mithala/mithala-wildlife.js`, zones tagged with each of the four region names, spread into
`src/content/regions/western-regions/west-regions-life.js` after the West Lotharn's. `src/content/regions/oves/oves-wildlife.js`,
`src/content/regions/west-lotharn/west-lotharn-wildlife.js` and their tests show the shape and how a site is held to its ground.

Rigs today: boar, dolphin, duck, egret, goose, gull, harrier, hill-sheep, longhorn,
nethrani-cattle, otter, plateau-hawk, red-deer, river-fox, sea-plunger, stilt, turkey-vulture,
upland-hare, wading-bird, and whatever the West Lotharn added. A continental plain of 116 hexes can
carry more life than anywhere built so far, and it should feel populous rather than empty — but
**every species must be grounded** in the lore or labelled an extension with its reason. At most
**two new rigs** across all four countries, and only if the lore names the animal. **Domestic stock
is somebody's: none.**

Every site measured on the built ground; every extension labelled; an animal backing off needs
~90–150 m of clear room behind it. With four regions the west-life chase laws take longer — probe
new zones a country at a time, because that loop stops at the first failing zone.

## Registration checklist — four times over

For **each** of the four: `src/world/terrain/region-layout.js` REGION_BIOMES + PLAYABLE_REGIONS ·
`src/world/terrain/region-world.js` REGION_IDS, REGION_TERRAIN (default + `byTerrain` for grassland/plains/hills),
REGION_TEXT (subtitle, spawn on dry ground, description, palette, `npcIds: []`, landmarks) ·
`src/dev/tools/developer-atlas.js` LOCALS (`[id, label, target, regionId, anchor]`) · `src/ui/map/map-fog.js` areas
(radius 18–130, > 60 % inside its own region) · `src/dev/tools/build-status.js` · `src/world/environment/region-sky.js` (one
continental sky shared by all four is probably right — argue it either way) · `src/gameplay/skills/languages.js`
(the lore has Mithali temple speech; decide what the plain speaks and say why) ·
`src/content/regions/mithala/mithala-world.js` hooked into the chain in `src/world/terrain/world-terrain.js` · `src/content/regions/mithala/mithala-scenery.js`
hooked in `src/world.js` · `src/content/regions/mithala/mithala-wildlife.js` · `tests/mithala-world.test.js` ·
`package.json` · `docs/mithala-report.md` · a dated entry in `docs/design-answers.md`.

Names: check `world-builder/azhoran_language_profiles.py` first; coin nothing if there is no
profile — titles in plain English or the lore's own words.

## Tests — and the lists that go stale every single time

Run your own tests and this list with `node --test tests/<name>.test.js`: west-lotharn-world,
west-lotharn-peaks, east-lotharn-world, east-lotharn-peaks, oves-world, gala-world, ascarth-world,
eer-world, isareos-world, nethereum-world, izol-world, south-suval-world, feradom-world,
region-layout, region-survey, regions-world, developer-atlas, map-fog, region-sky, languages,
region-levels, open-country, west-life, regional-wildlife, town-life, closed-border, climbing,
terrain-fall, drawn-ground, cartography.

**Every region so far has left some of these encoding the old world. The West Lotharn builder found
five; find yours:**

1. **`tests/open-country.test.js`** keeps probe points it calls ground nobody owns. Build over one
   and three of its tests fail with your region's name — the **code is right, the probe is stale**.
   Move it to a measured point that is open country by both `regionAt` and `hexOwnerAt`, outside
   the named `was` region, still a few hundred metres from it. Three different regions have taken
   one of these probes now.
2. **The world-box guards** — `region-layout`, `isareos-world`, `nethereum-world`, `izol-world` —
   which this job *will* break, since the world grows north.
3. **Allow-lists that exist in more than one copy**: `OWN_SKY` is pinned in both
   `tests/region-sky.test.js` **and** `tests/eer-world.test.js`. There may be others; the West
   Lotharn builder also found `tests/oves-world.test.js` asserting the Oves Desert was last in the
   region order.

**`npm test` cannot run on this machine** — the script exceeds the Windows command-line limit. The
coordinator runs the suite in chunks at integration; do not attempt it.

**Known-failing on this base, not yours:** `chameleon` (Ed has 19 spots against 22 expected),
`regional-wildlife` ("previously empty regions" missing Iscare), `west-life` ("nothing in the west
can be walked down", `elagos-meadow-cattle`; and `feradom-country-17-98` and `oveth-herons`, both
shown pre-existing by the West Lotharn builder), `south-suval-world` (the Stillwater), `amod-world`
(the chart/bounds), `elagos-world` (the ninth region). If one of your own zones fails a west-life
law, prove it by taking your zones out and re-running, as that builder did.

Maps: `node scripts/region-map.mjs minX,minZ,maxX,maxZ [scale] [out.png] [x,z;x,z]` with env
`MAP_LO`/`MAP_HI` — a flat country needs `MAP_HI` **lowered** to show anything. One short review
render at the end if electron is available, taken **after** any final scenery tuning. No autoplays,
no long smokes.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js` and `src/dev/tools/developer-atlas.js` are
CRLF; keep every file as found.

## Report

`docs/mithala-report.md`: what the atlas gave and what was chosen where it was silent; the climate
read and what `Dfa` changed about the build; **the window measurement and every world-box number
that moved**, with what the widened window pulled in; the seams with both Lotharn ranges and the
four internal seams; the ribs against the six unbuilt neighbours; every zone with its species and
why; every test run with its result and every stale list you moved; review views; open questions —
including what winter should do to this plain when seasons land. Final message: the same, short,
plus every file touched.
