# The West Lotharn Mountains: terrain and wildlife

Brief written 2026-09-29 by the coordinating session. The user's word: "start building the terrain
and wildlife of the West Lotharn Mountains."

**Terrain, climate, water, scenery and wildlife only — and nothing that belongs to anybody.** No
settlement, road, pass inn, mine, workings, bridge, boat, person, sign or quest, exactly as Vastos,
Meneth, Caricas, Nesdor (`docs/four-regions-brief.md`), Isareos, Nethereum, Eer
(`docs/six-regions-brief.md`), South Suval, Gala, the two Ascarths and Ovesos / the Oves Desert
were built. **The East Lotharn is the exception that proves it**: that range has a pass road, an
inn and iron workings because it was built to a different, earlier brief. Do not copy those.

## The two decisions the user has already made

Asked directly on 2026-09-29, the user chose:

1. **Taller — the true spine, about 550 m.** The atlas gives the West 25 `mountain` hexes to the
   East's 15, so the West is the main range and the East reads as its eastern foothills. This will
   be the highest ground in the game by a clear margin (the East Lotharn's eastern peak is ~420 m).
2. **Everything carries over: cliffs, ramps, ledges and caves.** Same range, same laws.

Those are settled. Do not re-open them; everything below serves them.

## State of play

- **Not registered anywhere, and not in the survey.** Add `'West Lotharn Mountains'` to `PLAYABLE`
  in `scripts/build-region-survey.mjs` after `'Southern Ascarth'` and regenerate with
  `node scripts/build-region-survey.mjs`. Never hand-edit `src/dev/tools/region-survey.js`;
  `tests/region-survey.test.js` re-derives it.
- **Region id: `'West Lotharn Mountains': 27`**, after `'Oves Desert': 26`, in that order in every
  ordered list.
- `src/world/terrain/region-levels.js` already carries it at level 4.
- Branch `west-lotharn` in its own worktree, from current main. Never cd into another checkout,
  never a bare `git stash`, **do not commit** — leave the work uncommitted and report.

## What the atlas says (authority; the lore is adjusted to it)

- **48 hexes**, q −8…3, r 95…102. Atlas bounds x 1163.9–1441.1, y 2280–2480.
- **`mountain` × 25, `hills` × 23.** The East Lotharn is `hills` × 23, `mountain` × 15 — so the
  West has two thirds again as much true mountain, and that is the whole justification for the
  height the user chose. **Measure where the 25 mountain hexes are and put the crest on them**; the
  hills are the skirts.
- **Climate, per hex** from the World Builder map (`world-builder/map/resources/examples/azhora.wwmap`,
  `hexes[key].climate`, `koppen-v1` — *not* `azhora.cmap.json`, whose one-code-per-region field is a
  default): **`Cfa` × 47, `Dfa` × 1.** Humid the year round over nearly all of it, with a single
  continental hex. Find which hex is `Dfa` and say what you did about it — one hex cannot carry a
  band, so it is probably a note rather than a landform. For context: the East Lotharn is `Cfa` × 38,
  South Mithala `Dfa` × 33, Yunethre `Dfa` × 26 + `Cfa` × 1.
- **Neighbours by shared edge:** South Celder 16 (unbuilt), South Mithala 10 (unbuilt),
  **Vastos 8**, **East Lotharn Mountains 7**, **Isareos 7**, **Meneth 7** (all four built),
  Yunethre 5 (unbuilt). Twenty-nine edges against built country — more than any region built so far.
- **The world box should not grow.** Its world extent works out around x −2370…−1570, z −520…50,
  well inside the current bounds (x −3010…610, z −1301…2398), and rows 95–102 sit inside
  `WINDOW` (minR 90, maxR 135). **Verify this** rather than trusting it, and if it holds, say so in
  the report — it means `tests/region-layout.test.js`, `tests/isareos-world.test.js` and
  `tests/nethereum-world.test.js` need no new numbers, which would be a first for a region this size.

## The lore

`world-builder/azhora_lore/geography/regions/lotharn.md` covers the whole range and was **rewritten
in place on 2026-09-27** to fit the East Lotharn build: old stone worn into courses of cliff and
ledge, ramps, chimneys and limestone caves. Read it and keep faith with it — the West is the same
geology, taller. Adjust it **in place** for anything the atlas contradicts (never commit, stage or
stash in `world-builder`); if the write is refused, append claim by claim to
`docs/lore-adjusted-to-atlas.md` and say so.

## Height, and what 550 m has to clear

- **Crest about 550 m** on the highest of the mountain hexes, with subordinate summits stepping
  down; the hills skirts should meet the neighbours at their own levels.
- The East Lotharn's four peaks are ~420 / 325 / 275 / 240 m, reached only by cut ramps and ledge
  paths, with a flat grass bald on each summit and forest on the ledges to about 280 m. Read
  `src/content/regions/east-lotharn/east-lotharn-world.js` and `docs/design-answers.md` (the entry dated 2026-09-27) before
  choosing your numbers, and then choose your own: this is a taller range and the tree line, the
  bald and the cliff-band spacing should all reflect that, not be copied.
- **Seven shared edges with the East Lotharn.** The two ranges are one massif; the join must read
  as a col or a saddle, not a step. Match the East's ground at those edges and say what you
  measured.

## Cliffs, ramps, ledges, caves — the rules that carry over

- **Extend the climbing rule to this region.** `src/gameplay/movement/climbing.js` holds
  `CLIMB_REGIONS = new Set([4, 5, 18, 20, 21, 'East Suval', 'West Suval', 'South Suval', 'East Lotharn Mountains', 'Feradom'])`
  — add `27` and `'West Lotharn Mountains'`. Its message ("Climbing is available in Suval, East
  Lotharn and Feradom") needs the West naming too. Check `tests/climbing.test.js`,
  `tests/climbing-world.test.js`, `tests/climbing-pose.test.js` and `tests/climbing-combat.test.js`
  for lists that pin the old set.
- The rule itself (unchanged): ground to ~35° is walked; 35–50° is climbed, slower, costing wind by
  the metre risen, no wind back until the climb stops, cannot be started winded; steeper cannot be
  climbed and a traveler standing on it slides down; down is always open; a horse stops at 35°.
- **Ways up**: cut ramps slantwise across each cliff band joined by ledge paths, as the East has.
  **Prove with a test** that without the ways nobody gets above a stated height on any massif —
  `tests/east-lotharn-peaks.test.js` shows how, with a flood fill and a slip rule.
- **Caves**: chimneys bypassing cliff bands, and chambers. `src/content/regions/east-lotharn/east-lotharn-caves.js` and
  `src/content/regions/east-lotharn/east-lotharn-cave-walk.js` are the precedent — a cave is walked on its own floor from mouth
  to mouth, the surface above stays ground, the camera stays in the passage, daylight goes and a
  lantern glow lights the rock. **Nothing lives in them**, as in the East.

## Seams — twenty-nine edges against built country

Neither side writes ground outside its own hexes; the ordinary hex blend (`terrainMix`) carries the
step. For each of the four built neighbours, **read its profile in `REGION_TERRAIN` and meet it**:

- **Vastos 8 edges**, **Meneth 7**, **Isareos 7** — Isareos is the one country in the west that is
  neither flat nor a ridge field ("low hills… rising gradually to the upland margins where the
  territory blurs into the southern edges of the lake country", ~22 m). These are the skirts of the
  range coming down to ordinary country; make the fall read.
- **East Lotharn 7 edges** — the col, above.
- The unbuilt three (South Celder 16, South Mithala 10, Yunethre 5) will show the **outland ribs**
  that Gala and Ovesos both reported: this region's relief wavelength blending with outland's 150 m.
  That cure belongs in `relief()`/`terrainMix` and is a separate, world-wide job — **do not attempt
  it**; measure the ribs and report them.

## Wildlife

A new `src/content/regions/west-lotharn/west-lotharn-wildlife.js`, zones tagged `region: 'West Lotharn Mountains'`, spread into
`src/content/regions/western-regions/west-regions-life.js` after the Oves zones. `src/content/regions/east-lotharn/east-lotharn-wildlife.js`,
`src/content/regions/oves/oves-wildlife.js` and their tests show the shape and how a site is held to its ground.

Rigs that exist today: boar, dolphin, duck, egret, goose, gull, harrier, hill-sheep, longhorn,
nethrani-cattle, otter, plateau-hawk, red-deer, river-fox, sea-plunger, stilt, turkey-vulture,
upland-hare, wading-bird. A 550 m range is the first place in the game with real altitude to play
with, so let the animals read the height: the valley floors and the ledge forest, the balds above
the tree line, and the air over the crest. At most **one new rig**, and only if the lore names the
animal. **Domestic stock is somebody's: none.**

Every site measured on the built ground; every extension labelled as one in its note; an animal
backing off needs ~90–150 m of clear room behind it.

## Registration checklist (every item, or say why not)

`scripts/build-region-survey.mjs` PLAYABLE → regenerate `src/dev/tools/region-survey.js` ·
`src/world/terrain/region-layout.js` REGION_BIOMES + PLAYABLE_REGIONS · `src/world/terrain/region-world.js` REGION_IDS (27),
REGION_TERRAIN (default + `byTerrain.mountain` and `.hills`), REGION_TEXT (subtitle, spawn on dry
walkable ground, description, palette, `npcIds: []`, landmarks) · `src/gameplay/skills/languages.js` (the East
Lotharn has a `lotharn` dialect — decide whether the West shares it and say why) ·
`src/dev/tools/developer-atlas.js` LOCALS (`[id, label, target, regionId, anchor]`) · `src/ui/map/map-fog.js` 3–6
areas (radius 18–130, > 60 % inside) · `src/dev/tools/build-status.js` · `src/world/environment/region-sky.js` (the East
Lotharn has its own; a taller, colder range may want its own again) · `src/gameplay/movement/climbing.js` CLIMB_REGIONS ·
`src/content/regions/west-lotharn/west-lotharn-world.js` hooked into the chain in `src/world/terrain/world-terrain.js` ·
`src/content/regions/west-lotharn/west-lotharn-scenery.js` hooked in `src/world.js` · caves module ·
`src/content/regions/west-lotharn/west-lotharn-wildlife.js` · `tests/west-lotharn-world.test.js` and a peaks test ·
`package.json` test list · `docs/west-lotharn-report.md` · a dated entry in `docs/design-answers.md`.

Names: check `world-builder/azhoran_language_profiles.py` before coining anything; if there is no
profile, coin nothing — titles in plain English or the lore's own words.

## Tests — and the three that region builders keep missing

Run your own tests and this list with `node --test tests/<name>.test.js`: east-lotharn-world,
east-lotharn-peaks, east-lotharn-cave-walk, climbing, climbing-world, climbing-pose,
climbing-combat, oves-world, gala-world, ascarth-world, eer-world, isareos-world, nethereum-world,
south-suval-world, feradom-world, vastos-world, meneth-world, caricas-world, region-layout,
region-survey, regions-world, developer-atlas, map-fog, region-sky, languages, region-levels,
west-life, regional-wildlife, town-life, closed-border, terrain-fall, drawn-ground.

**Three files encode the old world every time a region is added, and no builder has caught them
unprompted** (`feedback-region-registration-tests`):

1. **`tests/open-country.test.js`** keeps probe points it calls ground nobody owns. A new region can
   be built over one, and then three of its tests fail with your region's name. If that happens the
   **code is right and the probe is stale**: move it to a measured point that is open country by
   both `regionAt` and `hexOwnerAt`, outside the named `was` region, and still a few hundred metres
   from it. Southern Ascarth took two of these probes and the Oves Desert a third.
2. **`tests/izol-world.test.js`** pins the world's southern edge.
3. **`tests/isareos-world.test.js`**, **`tests/nethereum-world.test.js`** and
   **`tests/region-layout.test.js`** pin the north–south hex count and the world box. If the box
   really does not grow (see above), these should pass untouched — check, don't assume.

**`npm test` cannot run on this machine** — the script exceeds the Windows command-line limit. The
coordinator runs the suite in chunks at integration; do not attempt it.

**Known-failing on this base, not yours:** `chameleon` (Ed has 19 spots against 22 expected),
`regional-wildlife` ("previously empty regions" missing Iscare), `west-life` ("nothing in the west
can be walked down", `elagos-meadow-cattle`), `south-suval-world` (the Stillwater), `amod-world`
(the chart/bounds), `elagos-world` (the ninth region).

Maps: `node scripts/region-map.mjs minX,minZ,maxX,maxZ [scale] [out.png] [x,z;x,z]` with env
`MAP_LO`/`MAP_HI` draws a hillshade — look before and after; a 550 m range needs `MAP_HI` raised.
One short review render at the end if electron is available
(`node scripts/launch.cjs --smoke-test --review-clean "--review-views=stand-at:x,z,yaw,pitch,dist;…"`),
taken **after** any final scenery tuning — three builders in a row photographed before their last
change and had nothing to show for it. No autoplays, no long smokes.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js` and `src/dev/tools/developer-atlas.js` are
CRLF; keep every file as found.

## Report

`docs/west-lotharn-report.md`: what the atlas gave and what was chosen where it was silent; the
climate read and what you did with the one `Dfa` hex; the crest height and every summit; whether the
world box grew; the col with the East Lotharn and the seam numbers on all four built neighbours; the
ribs against the three unbuilt ones; the ways up and the proof nobody climbs without them; the caves;
every zone with its species and why; every test run with its result; review views; open questions.
Final message: the same, short, plus every file touched.
