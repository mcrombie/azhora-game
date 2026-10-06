# Gala: terrain and wildlife

Brief written 2026-09-28 by the coordinating session. The user's word: "start building the
wildlife and terrain of Galan [Gala], North Ascarth, and South Ascarth". Gala is this job; the
two Ascarths are a sibling job in `../azhora-game-ascarth` running at the same time.

**Terrain, climate, water, what grows and what lives there — and nothing that belongs to
anybody.** No settlement, road, field wall, irrigation channel, bridge, boat, person, sign or
quest, exactly as Vastos, Meneth, Caricas, Nesdor (`docs/four-regions-brief.md`), Isareos,
Nethereum, Eer (`docs/six-regions-brief.md`) and South Suval (`src/south-suval-*.js`) were built.
The city of Gala, its harbor, market and council hall are not built. Read the six-regions brief
first: it was written for Gala too, and its Gala rows, its climate table and its section "The
Lizeem is a wall" are this brief's ground truth.

## State of play

- Gala is **in the survey but was never built**: `scripts/build-region-survey.mjs` lists it in
  `PLAYABLE` and `src/dev/tools/region-survey.js` carries its 21 hexes, but it has no `REGION_IDS` entry,
  no `REGION_TERRAIN`, no `REGION_TEXT`, no wildlife, no sky, no map-fog areas, no build-status
  line. `src/content/regions/western-regions/west-regions-life.js` line ~980 already promises "Gala's raft of geese" via
  `zone.float`. Do not regenerate `src/dev/tools/region-survey.js`; it is correct as it stands.
- Worktree `C:\Users\Michael\Programs\typescript\azhora-game-gala`, branch `gala`, from
  b108263 (= main 2bc45e3 + the East Lotharn). Run everything from this folder. Never cd into
  another checkout; never use a bare `git stash`; **do not commit** — leave the work
  uncommitted and report.
- **Region id: `Gala: 21`.** Fixed. The Ascarth job takes 22 and 23. Every ordered list
  (REGION_IDS, sky lists, PLAYABLE_REGIONS slices in tests, build-status, developer-atlas)
  gets Gala after Feradom. Do not add the Ascarths; the coordinator merges the two branches.

## What the atlas says (authority; the lore is adjusted to it)

- 21 hexes, q -12…-7, r 117…122; `plains` × 19, `grassland` × 2 (the southernmost row, on the
  sea). Atlas bounds x 1344–1483, y 2808–2960; world x ≈ -1850 … -1450, z ≈ 982 … 1415. Two sea
  hexes to the south. Measure your own numbers with `src/world/terrain/region-layout.js` (`regionCells`,
  `regionOutline`, `HEX_WORLD_TRANSFORM`).
- Climate on the World Builder map (`world-builder/azhora.cmap.json`, per hex): `BSh` × 12 over
  the northern three rows, `Csb` × 7, `Csa` × 2 on the sea. Hot steppe in the north, cooler
  Mediterranean in the middle, hot-summer Mediterranean on the shore. The gradient runs the
  length of the country.
- Neighbours by shared hex edges: Telemonia 9 (W, unbuilt), Northern Ascarth 8 (SE, **being
  built now**), Eer 5 (E, built; the border is the Lizeem), Nesdor 3 (NE, built; the Lizeem),
  Ovesos 3 (N, unbuilt), Oves Desert 2 (NW, unbuilt), Legemum 1 (S, unbuilt), sea 3.
- Water already authored in `src/world/terrain/region-rivers.js`: the Lizeem along the whole Nesdor and Eer
  borders (`fordUntil: 0`, `west-deep-water` colliders, nothing crosses it), a medium course on
  the Oves Desert border, a small course down the Telemonia border (-1900, 1126) → (-1800,
  1472), a small Gala|Legemum course. Do not author new rivers in region-rivers; minor water
  (the delta's distributary channels, a seasonal wash on the steppe) is terrain and scenery, the
  way Eer's channels are — read how Eer did it.
- The compass is turned relative to the lore (six-regions brief, item 5): the dry interior is
  north, the Ascarth foothills are **south-east**. Settled for the atlas.

## The lore to honour (`world-builder/azhora_lore/geography/regions/gala.md`)

Coastal plain "flat, fertile, drained by a network of small rivers … supplemented by irrigation
channels in the drier northern stretches"; the north "is the interior weather — dry, hot, and
grazed rather than farmed"; the south "warm, well-watered by the Lizeem's distributaries and
seasonal rains off the sea". So: a quiet relief like Eer's (Eer is base 7.4 m inland, 2.9 m on
the grassland coast; keep the fall between countries under a metre or two where they meet), a
steppe of tawny grass and aromatic scrub in the north with dry washes, a green Mediterranean
south with evergreen oak and wild olive scrub (Eer's `eer-olives` is the precedent), and the
Lizeem's delta in the south-east corner: braided distributary channels through reed and
tamarisk reaching the sea. No fields, no channels dug by anybody.

Adjust the lore file **in place** to fit the atlas (compass, climate bands, where the foothills
are) — never commit, stage or stash in `world-builder`. If the tool refuses to write there,
append the adjustment claim by claim to `docs/lore-adjusted-to-atlas.md` and say so in the
report.

## Seam with Northern Ascarth

Eight shared edges, the south-east side. The other builder has this same paragraph. Rules:
- Neither branch writes ground outside its own hexes. The ordinary hex blend (`terrainMix`)
  carries the step between the two countries' profiles.
- Both use **base 4.0 m, amp .6, wave 320** for the `grassland`/`plains` profile of the hexes
  that touch the shared border, so the blend has nothing to hide.
- Any hand-built landform (a wash, a dune, a delta channel) stays ≥ 100 m inside your own hexes
  from that border.

## Wildlife

Ranges for the western rigs in `src/content/regions/western-regions/west-regions-life.js`, in a new `src/content/regions/gala/gala-wildlife.js`
spread into the zone list after Feradom's (see `src/content/regions/feradom/feradom-wildlife.js` and
`src/content/regions/south-suval/south-suval-wildlife.js` for the shape, and their tests for how a site is held to its
ground). Species with rigs today: boar, dolphin, duck, egret, gull, harrier, hill-sheep,
longhorn, nethrani-cattle, otter, plateau-hawk, red-deer, river-fox, stilt, turkey-vulture,
upland-hare, wading-bird. Grounded suggestions — the fauna overview
(`azhora_lore/fauna/azhoran_fauna_overview.md`) names grey dolphins "a consistent presence in
Iberos coastal waters" and documented in the Lizeem estuary; gulls and waders for the delta;
the promised **raft of geese** on the delta water (`zone.float`; the black migratory geese are
in the overview) — a goose rig is the one new rig allowed, if you make one; harriers and hares
on the steppe; egret or stilt on the distributaries. Every site measured on the built ground,
every extension labelled as one in its note. Domestic stock is somebody's: none.

## Registration checklist (every item, or say why not)

`src/world/terrain/region-layout.js` REGION_BIOMES · `src/world/terrain/region-world.js` REGION_IDS (21), REGION_TERRAIN
(default profile + `byTerrain`), REGION_TEXT (subtitle, spawn on dry ground, description,
palette, `npcIds: []`, landmarks) · `src/gameplay/skills/languages.js` a `gala` dialect after `eer` ·
`src/dev/tools/developer-atlas.js` LOCALS · `src/ui/map/map-fog.js` 3–5 areas (radius 18–130, > 60 % inside) ·
`src/dev/tools/build-status.js` (`'early'`, as Eer) · `src/world/environment/region-sky.js` if Gala gets a sky (Eer's
coastal sky is the nearest; a dry-bright north is welcome; add to every OWN_SKY list a test
pins) · terrain hook in `src/world/terrain/world-terrain.js` and scenery hook in `src/world.js` only if you
build a module (`src/content/regions/gala/gala-world.js` / `src/content/regions/gala/gala-scenery.js`), on the South Suval pattern ·
`src/content/regions/gala/gala-wildlife.js` · `tests/gala-world.test.js` (sites on ground; the seam numbers;
map-fog coords) · `package.json` test list · `docs/gala-report.md` · a dated entry in
`docs/design-answers.md`.

Names: no invented personal names. Check `world-builder/azhoran_language_profiles.py` for a
Galan profile; if there is none, coin nothing — area and landmark titles in plain English or
the lore's own words (the Lizeem, the Iberos Sea, the delta, the steppe).

## Tests and renders

Run your own test and this list, not the full suite: eer-world, isareos-world,
nethereum-world, south-suval-world, east-lotharn-world, region-layout (world-size guard: state
Gala's case), amod-world, elagos-world, caricas-world, developer-atlas, map-fog, chameleon,
region-sky, west-life, regional-wildlife, region-survey, regions-world, region-levels,
languages, town-life, closed-border. `node --test tests/<name>.test.js`. Pre-existing failures
on this base that are not yours: bout kill, cast kayla ids, winery spring rock, "nothing in the
west can be walked down" (elagos cattle), the main.js table, save-round-trip, Sultana, play
camp ×2, timing. Never run `npm test`; the coordinator runs it once at integration.

Maps: `node scripts/region-map.mjs minX,minZ,maxX,maxZ [scale] [out.png] [x,z;x,z]` with env
`MAP_LO`/`MAP_HI` draws a hillshade of the built ground — use it to look before and after. One
short review render at the end is allowed if electron is available
(`node scripts/launch.cjs --smoke-test --review-clean "--review-views=stand-at:x,z,yaw,pitch,dist;..."`,
images in `tests/artifacts/`); no autoplays, no long smokes. There is no `node_modules` in this
worktree; the node tests need none.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js` are CRLF; keep files as found.

## Report

`docs/gala-report.md`: what the atlas gave and what was chosen where it was silent; the seam
numbers; every lore adjustment; every zone with its species and why; tests run and their
results; the review views; open questions. Your final message: the same, short, plus the list
of files touched.
