# Northern and Southern Ascarth: terrain and wildlife

Brief written 2026-09-28 by the coordinating session. The user's word: "start building the
wildlife and terrain of Galan [Gala], North Ascarth, and South Ascarth". The two Ascarths are
this job; Gala is a sibling job in `../azhora-game-gala` running at the same time.

**Terrain, climate, water, what grows and what lives there — and nothing that belongs to
anybody.** No settlement, road, field wall, harbor, bridge, boat, person, sign or quest, exactly
as Vastos, Meneth, Caricas, Nesdor (`docs/four-regions-brief.md`), Isareos, Nethereum, Eer
(`docs/six-regions-brief.md`) and South Suval (`src/south-suval-*.js`) were built. Aevis, the
peninsula's other cities, the bronze gates, the bull-headed figures, the burial mounds with
their grave goods and the copper workings are all somebody's and are not built. Read the
six-regions brief first, especially "The Lizeem is a wall": these two countries are the only
dry way from Eer (the near bank) to Gala (the far bank).

## State of play

- Neither Ascarth is registered anywhere. The atlas names them **"Northern Ascarth"** and
  **"Southern Ascarth"** (use exactly those ids); `src/world/terrain/region-levels.js` already has them (4 and
  2) and `src/content/chapters/civil-war/campaign-world.js` carries one-line story designs that are left alone.
- Worktree `C:\Users\Michael\Programs\typescript\azhora-game-ascarth`, branch `ascarth`, from
  b108263 (= main 2bc45e3 + the East Lotharn). Run everything from this folder. Never cd into
  another checkout; never use a bare `git stash`; **do not commit** — leave the work
  uncommitted and report.
- **Region ids: `'Northern Ascarth': 22`, `'Southern Ascarth': 23`.** Fixed. Gala takes 21 in
  the other branch; do not add Gala. In every ordered list (REGION_IDS, `PLAYABLE`, sky lists,
  PLAYABLE_REGIONS slices in tests, build-status, developer-atlas) they come after Feradom, in
  that order. The coordinator merges the two branches.

## What the atlas says (authority; the lore is adjusted to it)

- **Northern Ascarth**: 16 hexes, q -10…-7, r 120…126; `grassland` × 13, `hills` × 3. Atlas
  bounds x 1413–1566, y 2880–3056. Neighbours by shared edges: sea 25 (both coasts: it is a
  peninsula), Gala 8 (NW/W, **being built now**), Southern Ascarth 4 (S), Eer 1 (N).
- **Southern Ascarth**: 18 hexes, q -8…-5, r 126…132; `grassland` × 18. Atlas bounds
  x 1524–1704, y 3024–3200. Neighbours: sea 36, Northern Ascarth 4. The tip of the finger.
- Climate: the dev export drops it; read it per hex from `world-builder/azhora.cmap.json` (the
  six-regions brief shows how the codes were read) and report what it says. Expect
  Mediterranean (`Csa`/`Csb`) like Eer's coast; build to what you find.
- **Survey**: add both names to `PLAYABLE` in `scripts/build-region-survey.mjs` after
  `'Feradom'` and run `node scripts/build-region-survey.mjs` (never hand-edit
  `src/dev/tools/region-survey.js`; `tests/region-survey.test.js` re-derives it). Southern Ascarth reaches
  row 132 against `WINDOW.maxR: 133`; the coast lattice samples out to `COAST_MARGIN` plus a
  circumradius beyond the world bounds — **measure** whether 133 still covers it and widen it
  with a measured comment in the style of the ones there if not. The world's southern edge was
  set by West Izol; these two move it, so `tests/region-layout.test.js`'s world-size guard
  needs the new countries' case stated, and `isareos-world`/`nethereum-world` pin the
  north-south hex count.

## The lore to honour (`world-builder/azhora_lore/geography/regions/ascarth.md`)

"A rugged finger of land … rocky and forested in its interior, cliff-faced along much of its
coast, with good anchorage only in the sheltered bays on its eastern and northern shores";
"a reliable source of the right copper ore in the interior hills"; "burial mounds on the
peninsula's highland interior". The atlas gives thirteen grassland hexes and three `hills`
hexes in the north, and all grassland in the south. Settled for the atlas: the "highland
interior" is those three hexes — rounded rocky hills, wooded (evergreen oak, pine on the tops;
the hills profiles in `REGION_TERRAIN` run from base 10.5/amp 4.6 to base 44/amp 6.5: pick a
height that reads as hills, not the East Lotharn), and the rest is open Mediterranean grass and
scrub rolling to the sea. Cliffs are a coast treatment and South Suval's shore is the
precedent ("gulls a few metres back from the cliff edge"): cliff the western and southern
shores where the atlas coast is straight, and let the eastern and northern shores fall to the
sheltered bays the atlas's own indentations make. Copper may show as green-stained rock on the
hill hexes (a mineral feature, nobody's), nothing dug. No mounds.

Adjust the lore file **in place** to fit (how much of the interior is hill, where the forest
is) — never commit, stage or stash in `world-builder`. If the tool refuses to write there,
append the adjustment claim by claim to `docs/lore-adjusted-to-atlas.md` and say so.

## Seams

- **Gala, eight shared edges (Northern Ascarth's north-west/west).** The Gala builder has this
  same paragraph. Neither branch writes ground outside its own hexes; the ordinary hex blend
  (`terrainMix`) carries the step. Both use **base 4.0 m, amp .6, wave 320** for the
  `grassland`/`plains` profile of the hexes touching the shared border. Any hand-built landform
  stays ≥ 100 m inside your own hexes from that border.
- **Eer, one edge (north).** Eer's grassland is base 2.9 m; stay within a metre or two of it
  on that edge.
- **Between the two Ascarths**: one module family, so the seam is yours; make it invisible.

## Wildlife

Ranges for the western rigs in `src/content/regions/western-regions/west-regions-life.js`, in a new `src/content/regions/ascarth/ascarth-wildlife.js`
(zones tagged `region: 'Northern Ascarth'` or `'Southern Ascarth'` each) spread into the zone
list after Feradom's; `src/content/regions/feradom/feradom-wildlife.js` and `src/content/regions/south-suval/south-suval-wildlife.js` show the shape
and their tests how a site is held to its ground. Species with rigs today: boar, dolphin, duck,
egret, gull, harrier, hill-sheep, longhorn, nethrani-cattle, otter, plateau-hawk, red-deer,
river-fox, stilt, turkey-vulture, upland-hare, wading-bird. Grounded suggestions from
`azhora_lore/fauna/azhoran_fauna_overview.md`: seabird colonies "on certain rocky headlands"
(gulls on the cliffs), grey dolphins offshore, the **Great White Sea-plunger** diving into the
Iberos shoals off the tip — the one new rig allowed, if you make one; red deer and boar in the
wooded hills; hares on the grass; a harrier or hawk over the tip. Every site measured on the
built ground; every extension labelled as one. Domestic stock is somebody's: none.

## Registration checklist (every item, or say why not)

`scripts/build-region-survey.mjs` PLAYABLE (+ WINDOW if measured) → regenerate
`src/dev/tools/region-survey.js` · `src/world/terrain/region-layout.js` REGION_BIOMES · `src/world/terrain/region-world.js`
REGION_IDS (22, 23), REGION_TERRAIN (default + `byTerrain.hills` for the north), REGION_TEXT
for each (subtitle, spawn on dry ground, description, palette, `npcIds: []`, landmarks) ·
`src/gameplay/skills/languages.js` an Avite dialect entry after `eer` (the lore's Avites; no personal names) ·
`src/dev/tools/developer-atlas.js` LOCALS · `src/ui/map/map-fog.js` 2–4 areas per region (radius 18–130, > 60 %
inside its own region) · `src/dev/tools/build-status.js` (`'early'`, as Eer) · `src/world/environment/region-sky.js` if
they get a sky (add to every OWN_SKY list a test pins) · `src/content/regions/ascarth/ascarth-world.js` terrain module
hooked into the chain in `src/world/terrain/world-terrain.js` (the hills, the cliffs; South Suval and the
East Lotharn show both) · `src/content/regions/ascarth/ascarth-scenery.js` hooked in `src/world.js` (wood on the hills,
scrub, the green rock) · `src/content/regions/ascarth/ascarth-wildlife.js` · `tests/ascarth-world.test.js` (sites on
ground; cliffs where claimed and bays where claimed; the seam numbers; map-fog coords; the
window measurement) · `package.json` test list · `docs/ascarth-report.md` · a dated entry in
`docs/design-answers.md`.

Names: no invented personal names. Check `world-builder/azhoran_language_profiles.py` for an
Avite profile; if there is none, coin nothing — area and landmark titles in plain English or
the lore's own words (the Iberos Sea, the north bays, the tip).

## Tests and renders

Run your own test and this list, not the full suite: eer-world, isareos-world,
nethereum-world, south-suval-world, east-lotharn-world, region-layout, amod-world,
elagos-world, caricas-world, developer-atlas, map-fog, chameleon, region-sky, west-life,
regional-wildlife, region-survey, regions-world, region-levels, languages, town-life,
closed-border. `node --test tests/<name>.test.js`. Pre-existing failures on this base that are
not yours: bout kill, cast kayla ids, winery spring rock, "nothing in the west can be walked
down" (elagos cattle), the main.js table, save-round-trip, Sultana, play camp ×2, timing.
Never run `npm test`; the coordinator runs it once at integration.

Maps: `node scripts/region-map.mjs minX,minZ,maxX,maxZ [scale] [out.png] [x,z;x,z]` with env
`MAP_LO`/`MAP_HI` draws a hillshade of the built ground — look before and after. One short
review render at the end is allowed if electron is available
(`node scripts/launch.cjs --smoke-test --review-clean "--review-views=stand-at:x,z,yaw,pitch,dist;..."`,
images in `tests/artifacts/`); no autoplays, no long smokes. There is no `node_modules` in this
worktree; the node tests need none.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js` are CRLF; keep files as found.

## Report

`docs/ascarth-report.md`: what the atlas gave and what was chosen where it was silent; the
climate read; the window measurement; the seam numbers; every lore adjustment; every zone with
its species and why; tests run and their results; the review views; open questions. Your final
message: the same, short, plus the list of files touched.
