# Brief: build Peblos, the islands south-east of Drent, and the boat that reaches them

Peblos is the user's next region: islands off Drent's coast, open from the very first hour of the
game. A traveler who has just stepped ashore at Tidehaven can pay the boatman at the pier a few
coppers and be taken across. It is a quiet, level-1 province (`src/campaign-world.js`): fishing
people, a small Empire garrison, and no chapter of the main quest.

Read first: `CLAUDE.md`, `docs/world-scale-report.md` (one authored hex is 100 m; hand-placed
places are rigid clusters in `src/world-scale.js`), `docs/pueth-report.md` and `docs/west-suval-report.md`
(the two most recent regions: follow their shape of work), and `docs/content-pass.md` for tone.

## What the user asked for, in their words

- Peblos is reachable **from the start**, by going to the pier at the port village and taking a boat.
- The man who brought the traveler ashore is still there; he will take them to Peblos **for a fee** of
  a few coppers.
- **A developer override** skips the fee, so the user can go and look whenever they like.
- Peblos has **several islands**. Build the **main island** properly: it is the only one with a
  settlement — a small town or a few houses.
- On it: **Empire troops and locals**. **Fishing is the economy.**

## The region

- Add `'Peblos'` to `PLAYABLE_REGIONS` (`src/region-layout.js`) with its own biome in `REGION_BIOMES`,
  its terrain profile in `REGION_TERRAIN` and its card in `REGION_TEXT` (`src/region-world.js`), and
  regenerate `src/region-survey.js` with `node scripts/build-region-survey.mjs` after adding it to
  `PLAYABLE` in the script. Peblos takes **region id 7** (Drent 1, Luscia 2, Moros Plain 3,
  East Suval 4, West Suval 5, Pueth 6). Everything derives ids from the registry; do not hard-code.
- The atlas authored Peblos: read its hexes from `assets/azhora-dev-regions.json` (the survey
  generator shows how) and keep the region true to them — the islands' number, sizes and spread
  should come from the map, not from imagination. `WORLD_BOUNDS` will have to grow; say by how much
  in the report.
- Sea between Drent and the islands is the Stills (`SEA_LEVEL`, `src/world-terrain.js`). Water must
  read as water from the shore of both, and the crossing must not put standable ground in between.
- The islands' look: low, rocky, wind-cut. Salt grass, thrift and gorse rather than forest; a few
  wind-bent pines on the higher ground; grey rock at the waterline, pale sand in the coves.

## The crossing

- The boatman is the man who rowed the traveler ashore in the opening: he is at Tidehaven's landing
  (`world.boatStart`, the arrival boat, and the pier in `src/world.js`). Give him a name, a stand at
  the pier and a conversation. He ferries to Peblos for a fee in copper (`COPPER_ITEM`, `src/economy.js`;
  the traveler starts with `STARTING_PURSE`). A few coppers — pick the number and say why in the report.
- He also brings the traveler **back**, from the harbour on the main island, for the same fee.
- The crossing itself is not a sailing sim: a short scene — the boat pulls out, the view fades, the
  traveler steps onto the other quay. Keep the traveler in control before and after, save the road
  either side, and make it safe to save mid-story.
- **Developer override**: free passage while testing is enabled, plus a button in the testing panel
  (`index.html`, `#testing`) that puts the traveler on the main island at once, in the style of
  `#test-birds` and `#test-reveal-chart`. Never free for an ordinary player.
- Peblos is level 1: nothing on the islands may kill a traveler who arrives in the first hour with a
  simple sword. No encounter is required at all; if you add one, it must be optional and avoidable.

## The main island

- One settlement: a harbour village of 8 to 12 buildings — quay, net lofts, drying racks, fish
  cellar, a shrine to the sea, upturned boats, lobster pots, gull-haunted rocks. Fishing is what
  everyone does; the buildings and props should say so before anyone speaks.
- **People**: six to eight with one or two lines each in the plain local voice, plus a small Empire
  presence — a decurion and two or three legionaries who collect the Empire's share of the catch and
  are bored, not cruel. Only Legion people wear Legion armour; soldiers are men by default. The
  locals' feeling about the Empire's share is the seam to write on, not a quest yet.
- Places with discovery text on the rest of the island: a headland light, a wreck, a seal cove, a
  drowned field, whatever the atlas terrain suggests. Three or four are plenty.
- The other islands: terrain, scatter, and a landmark each, seen across the water from the main
  island. No settlements, no crossings to them yet. Say in the report what each would want.

## Fit it to what already exists

- **The chart**: add Peblos's named ground to `SUBREGIONS` in `src/map-fog.js` (the harbour village,
  the headland, each outer island) — areas are a point, a reach and a note, and they must not overlap
  (`tests/map-fog.test.js` checks). Add a `BUILD_STATUS` entry for Peblos in `src/build-status.js`
  that is honest about how far it got.
- **The local trail chart** (`src/local-map-data.js`), minimap, region card, autosave on entry and
  the developer atlas (`src/developer-atlas.js` stops, `src/developer-mode.js` travel points) all
  follow the registry; add what each needs.
- **Riding**: the horse cannot come on the boat. Dismount and leave it behind; say so in the ferryman's
  line, and make sure a mounted traveler cannot board.
- Put Peblos's scenery, places and people in new modules (`src/peblos-world.js`, `src/peblos-people.js`
  or similar) with one call from `src/world.js` and one hook in `src/main.js`. `src/main.js` and
  `index.html` are CRLF with very long lines: never reformat, patch by exact anchors.

## Rules

- Work only in your worktree (`../azhora-game-peblos`, branch `peblos`). The lead is working on main
  at the same time; keep edits to shared files small and local, and expect to merge after.
- Performance: reuse materials, instance scatter, batch as the other regions do. The existing regions'
  frame times must not get worse by more than about 15%.
- `npm test` stays green; add tests for the region (membership, outline, the islands against the
  atlas, water where the map says water), for the ferry (fee taken once, refused without coin, the
  developer override, both directions, a save on either side), for every stand (standable, reachable,
  4 m from quest people), and for the chart entries.
- Run `npm run test:game` and `npm run test:road` once each at the end and fix what they find. Do not
  run `npm run test:autoplay` (not green at this scale, half an hour a run). Check your work by eye
  with headless review screenshots (see `docs/world-scale-report.md`) of the quay, the village, the
  soldiers and the view out to the other islands.
- Commit in milestones. Write `docs/peblos-report.md`: what the atlas gave you, the crossing and its
  fee, coordinates authored and world, files touched, test and smoke results, and what is left.
