# Selemis: the island south of the Ascarth tip

Brief written 2026-10-01 by the coordinating session. The user's words were "start working on the
Selemis region". Read as every region in this programme has been read: **terrain, climate, water,
scenery and wildlife only — nothing that belongs to anybody.** No settlement, no harbour works, no
road, no people, no ship, no quest. One region, eight hexes, and the first island since Iscare.

## Where you work, and the rules that do not bend

- **Your worktree**: `C:\Users\Michael\Programs\typescript\azhora-game-selemis`, branch `selemis`,
  cut from `b16b66a` — main plus all 51 built countries (ids 1-51). Work only there.
- **Do not commit. Do not push.** Leave the work uncommitted and report. Never a bare `git stash`
  (the stack is shared by twenty worktrees). Never edit, stage or run a state-changing git command
  in any other checkout.
- **The lore repo** (`C:\Users\Michael\Programs\typescript\world-builder`) is read freely and edited
  **in place only** — never commit, stage, stash or push there. The World Builder atlas is the
  authority: where the lore disagrees with the atlas, the lore is rewritten to fit, and you say so.
- **Ask before a design decision.** Where the lore is silent and the build needs an answer, either
  derive it from the lore and label it yours, or leave it open and report it. Do not settle it quietly.
- This machine: `npm test` cannot run (command line too long). Big heredocs fail in Git Bash and
  backslashes inside python heredocs get eaten — write scripts to a file and run the file. Global
  `autocrlf=true`; `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js` and `src/dev/tools/developer-atlas.js` are
  CRLF and must stay CRLF. Three.js is vendored (`vendor/`); there is no `node_modules`.

Read first: `docs/southwest-finish-brief.md` and `docs/southwest-4-brief.md` (the standing rules as
the last block ran them), `docs/ascarth-brief.md` + `docs/ascarth-report.md` (the country across the
channel, and the nearest precedent in every sense), `docs/suval-iscare-terrain.md` and
`src/content/regions/iscare/iscare-world.js` (the only islands built so far), and `docs/swimming.md`.

## What the atlas says — measured, so you need not re-derive it

- The atlas region is **`Selemi`** (`assets/azhora-dev-regions.json`): that is the registration key,
  as `Iscare Archipeligo` keeps the atlas's spelling. The place is called **Selemis** and the people
  the Selemi; `src/content/chapters/civil-war/campaign-world.js` already carries a polity `selemis` with `regions: ['Selemi']`.
- **Eight hexes**: (-9,133) (-8,133) / (-9,134) (-8,134) (-7,134) / (-9,135) (-8,135) (-7,135).
  All `grassland`. All **`Csa`** per hex in `world-builder/map/resources/examples/azhora.wwmap`
  (`hexes["q,r"].climate` — that file, never `azhora.cmap.json`, whose one code per region is a
  default). The fourteen hexes ringing it are unclaimed `coast`.
- **World position** (x = 100(q + r/2) - 6700, z = 86.6025 r - 9150.9, checked against Southern
  Ascarth's surveyed cells to 1e-12 m): hex centres span **x -950 ... -650, z 2367.3 ... 2540.5**;
  the southernmost vertex is at z 2598.2. The island is roughly 400 m by 290 m.
- **It should move neither the window nor the world box.** `WINDOW` is
  `{ minQ: -50, maxQ: 34, minR: 79, maxR: 145 }` and `WORLD_BOUNDS` is x -4610.0 ... 610.0,
  z -2167.2 ... 3264.4 (52.200 by 54.316 hexes). Prove it rather than assume it, and state Selemi's
  case in the ledger in `tests/region-layout.test.js` the way every country before it has.
- **The channel**: Southern Ascarth's tip hex (-7,131) stands at (-850, 2194.1), due north of
  Selemi's (-8,133) at (-850, 2367.3). Centre to centre 173.2 m: **one row of water**, the hexes
  (-8,132) and (-7,132), about 58 m vertex to vertex at the pinch. Iscare is 557 m to the
  north-east, Northern Ascarth 700 m north-north-west, West Izol 889 m north-east.
- **The bay**: (-7,133) is water held on three sides by (-8,133), (-8,134) and (-7,134), and it
  opens north onto the channel. The lore's crescent "with its concave face turned toward the
  Azhoran coast" is already in the atlas's shape. That is a lead, not an instruction: check it.

## What the lore says

`world-builder/azhora_lore/geography/regions/selemis.md` (85 lines — read all of it),
`peoples/the_selemi.md`, `geography/regions/ascarth.md`, and the sea files (`iscari_sea.md`,
`iberos_coast.md`). The physical facts are few and all in "The Island": a **crescent** whose concave
face makes a **sheltered natural harbour**; **interior hills**; headlands at either end of the
crescent; a channel "narrow but not trivial — enough that a fleet can cross it but not so little
that an army can wade", across which "on a clear day you can read smoke from the other shore".

**Nearly everything else in the lore is the city, and the city is not yours.** It fills the crescent
headland to headland; in the game's own story (`src/content/regions/izol/izol-world.js`, `docs/izol-and-the-triumvirate.md`)
it was taken in 979 and an Izoli general sits in it. All of that is owned content. Build the ground
it stands on — the harbour's water and shore, the headlands, the hills behind — so that the city has
somewhere true to go later, say in the report where it would stand, and build nothing that
contradicts the story.

## The work

1. **Register `Selemi` as id 52, appended last.** The pipeline: `scripts/build-region-survey.mjs`
   (PLAYABLE) -> regenerate `src/dev/tools/region-survey.js` and run `scripts/build-region-rivers.mjs` (both
   generated, never hand-edited) -> `src/world/terrain/region-layout.js` (REGION_BIOMES, PLAYABLE_REGIONS — same
   order as REGION_IDS, which is now a guard) -> `src/world/terrain/region-world.js` (REGION_IDS, REGION_TERRAIN,
   REGION_TEXT) -> `src/world.js` / `src/world/terrain/world-terrain.js`, plus build status, region level,
   developer atlas, map fog, sky, and whatever else Southern Ascarth is registered in. **`groundTint`
   is a table now** — a country's tint is a row, and a missing row should be loud.
2. **Terrain and water**: the island's shape and shores, the harbour bay, the two headlands, the
   interior hills, and the channel as it is seen from both sides. Whether an eight-hex Csa island
   holds a stream, a spring or only seasonal water the lore does not say: derive or leave dry, and
   label it.
3. **Climate and look**: hot-summer Mediterranean. Southern Ascarth (`peninsula-tip`,
   `aromatic-scrub`) is 173 m away across the same water — check its hexes' climate in the wwmap.
   Selemis should read as kin to the Ascarth tip and as its own place.
4. **Scenery**: natural only.
5. **Wildlife**, derived from the lore (the Selemis, sea and coast files, and the culture files on
   animals), not invented to fill space; no domestic stock. The west's laws hold — nothing can be
   walked down, and a band needs room behind it to back off into (90-150 m). **On an island 400 m
   by 290 m that is tight**, and shore and sea birds may be the honest answer; measure before you
   promise a ground animal a range.
6. **Getting there and getting off.** Do **not** change the swim rule (`canSwim`, `moveCharacter`
   in `src/gameplay/movement/game-state.js`). Measure the channel as you build it and answer with numbers: **can a
   traveler swim from the Ascarth tip to Selemis, and back?** Whether they should is the user's
   decision, not yours — the lore gives a fleet a crossing and denies an army a ford, and says
   nothing about one swimmer. Either way somebody set down on the island (F8) must be able to
   stand, walk its whole length and not be sealed in a pocket (`tests/nobody-sealed-in.test.js`).
7. **Names**: there is **no Selemi profile** in `world-builder/azhoran_language_profiles.py`
   (sixteen profiles: mittoli, moreshi, pyrosi, grassic, ibnael, elodi, elagosi, kellith, boueni,
   crefs, tennoca, disht, groga, lothi, mujahal, rov — and an alias table; read it). Find out from
   `the_selemi.md` and `src/gameplay/skills/languages.js` what the Selemi speak. A name must be derivable from a
   profile's lexicon or morphology; if none can be honestly derived, **leave the feature
   descriptive and say so**.

Follow the trio the Ascarths use: `src/content/regions/selemis/selemis-world.js`, `src/content/regions/selemis/selemis-scenery.js`,
`src/content/regions/selemis/selemis-wildlife.js`, `tests/selemis-world.test.js` (listed in `package.json`'s `scripts.test`
after `tests/trogo-undergrowth.test.js`). Match the surrounding code's density and idiom.

## Tests — and a machine that is busy as you start

**A full sweep of your exact base is running on this machine right now** (about 2 GB a chunk, on
16 GB). So: **never the full suite, never two test processes at once — single files, one at a
time.** The coordinator runs the suite once at merge time.

Registering a region breaks other regions' tests. Run at least: `selemis-world`, `ascarth-world`,
`iscare-world`, `region-layout` (world-size guard, PLAYABLE order), `region-survey`, `region-sky`
and `eer-world` (the shared list is `tests/own-sky.js`), `isareos-world`, `nethereum-world`,
`izol-world` (it pins the southern edge), `amod-world`, `elagos-world`, `caricas-world` (river-fox
law), `developer-atlas`, `map-fog` (area radius 18..130, more than 60% inside), `chameleon`,
`regional-wildlife`, `open-country` (its "unowned ground" probes — three regions have built over
one; if you take one, move it to a measured point that is open by both `regionAt` and
`hexOwnerAt`), `drawn-ground`, `languages`, `cartography`, `nobody-sealed-in`, and the `west-life`
chase laws for any zone you add (law by law — it is slow, and its loops stop at the first failing
band, so probe your own zones on their own).

**Known failing on this base, not yours**: `chameleon` (Ed's 19 spots against 22),
`regional-wildlife` (Iscare), `south-suval-world` (the Stillwater), `amod-world`, `elagos-world`,
`campaign-world` (`drent.hexes` 39 against 40), `west-life` x 3 (`elagos-meadow-cattle` 0.34 m,
`feradom-country-17-98` 25.5 s, `oveth-herons`), `isareos-world` ("the chart knows menora"), and
`nethereum-world` x 2 (`west-ground.js` and `world-terrain.js` disagree by 0.66 m; a cow reached to
3.46 m). The coordinator will send the definitive list when the sweep finishes.

**Before calling anything else pre-existing, prove it.** The base is checked out clean at
`C:\Users\Michael\Programs\typescript\azhora-game-land`: you may run `node --test tests/<file>`
there, one file at a time, to get a baseline — read-only, never an edit, never a git command — and
compare failure *names and messages*, not counts. Three builders' "pre-existing" claims have held
under that check and one was wrong.

**One short review render at the end, after the last change** (five builders have photographed too
early): `node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=..."`,
with `selemis-*` views added to `src/main.js` the way the `southwest-*` ones are. Look at the
pictures yourself before you report. No long Electron smokes.

## Report

`docs/selemis-report.md`: what you built and every line of lore each piece was derived from, with
your own choices labelled as yours; the measured numbers — the island's size and heights, the
channel's width, and the swim answer both ways; the proof that the window and the world box did not
move; where the city would stand; each name with its profile and morphology, or why the feature
stayed descriptive; every test file run, its result, and the baseline comparison for anything red;
the review views; and every decision left open for the user.

Your final message is read by the coordinator, not the user: lead with what is built and whether it
is green, then the open decisions, then anything you could not do and why.
