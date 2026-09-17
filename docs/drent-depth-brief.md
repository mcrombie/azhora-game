# Brief: Drent in depth, and the three Renas

Drent is the tutorial region and the most finished ground in the game, but it is thin in one way that
matters: it has no past. This brief gives it one, from the user's own design, and asks for depth to
match. Nothing here may move Tidehaven: the village is a rigid carried-over cluster.

## The lore the user has set

- **Eastreena is Tidehaven.** It is the village's **old name**, changed a long time ago — nearly a
  lifetime. The two are the same place, and the game should say so wherever it comes up.
- There was once a larger town, **Rena**, in the **centre of Drent**: the principal town of the
  region. It was **destroyed eighty years ago** — razed to the ground after a battle. **Its ruins are
  still there** in central Drent and can be walked through.
- The village east of it was therefore **East Rena** → Eastreena → renamed Tidehaven. There was also a
  **West Rena** — *Westerina* — a small village in the west of Drent, which likewise carries a newer
  name now. Give it that newer name, in the Drentish style, and keep the old one alive in speech.
- **One very old man** remembers all of it. He was a child at the razing: he remembers the town whole,
  he remembers it burning, and he remembers when his own village was called East Rena.
- **An old woman, his relation**, remembers it too, and lives apart from him — one of them in
  Tidehaven, the other in the western village, so that the road between them is a real walk.
- **The quest is letters.** The traveler carries letters between the two of them, and they catch up
  after years. Two or three exchanges, each letter worth reading: what they remember, what they
  disagree about, what one of them has never told the other. The reward for now is only that **they
  both become fond of you** — the same kind of standing Lysa's acorn favour gives (`src/acorn-quest.js`,
  `friendship`). No coin, no item; the user will decide rewards later. Leave the hook obvious.

Ground it in what exists before inventing: `../world-builder/azhora_lore/geography/regions/drent.md`
(read-only, outside this repo) for Drent itself, `src/campaign-world.js` for who holds it and why, and
the novella notes in `docs/brief-review.md` only where they touch places already on the map. If the
lore names who razed Rena, use it; if not, invent in its voice and say so in your report. The Empire
holds Drent quietly today — whatever happened eighty years ago is why it is quiet.

## What to build

- **The ruins of Rena**, in the centre of Drent: a real place to walk into, not a marker. Broken
  street lines under grass, a burnt gate, the stump of a hall, a well that still holds water, a
  boundary stone with the old name, orchards gone wild, grave markers in a row. It should read as a
  town that was killed rather than one that faded. Discovery text, a landmark, and a named area on
  the chart (`SUBREGIONS` in `src/map-fog.js`; areas must not overlap — `tests/map-fog.test.js`).
- **The western village** (the old West Rena) with its newer name: eight to twelve buildings in
  Drent's manner, four to six people with ambient lines, and the old woman among them.
- **The old man** in Tidehaven, with a stand of his own and something to do with his hands. Both of
  them speak plainly, like everyone else in Drent; the age is in what they remember, not in how they
  talk.
- **The letters quest** (a new pure module, e.g. `src/rena-letters.js`, with its own tests): accept,
  carry, deliver, return, repeat; the letters readable in the satchel as items or in the journal,
  your choice, but readable. Save it with the road (`src/road-checkpoint.js` takes a validated
  snapshot, as `src/birding.js` and `src/forest-hideout.js` do). Both of them end fond of you.
- **Depth elsewhere in Drent**, in the same spirit and within reason: two or three more small places
  worth finding on the paths that already exist, and a few more people with a line each in Tidehaven
  and along the Greenway. Do not add quests beyond the letters; do not touch the goblin camp (it is
  in Pueth now), the birding skill or Ansel's garden, and do not move any existing stand.
- **Eastreena, everywhere it belongs**: the chart's named area for the village should read
  **Tidehaven**, with Eastreena as the old name in its note; the old people use the old name
  naturally; a weathered boundary stone or an old sign by the village may still carry it. It must not
  appear as a title, a region name or a headline anywhere (see `CLAUDE.md`).

## Rules

- Work only in your worktree (`../azhora-game-drent`, branch `drent-depth`). Two other agents are
  building Elagos and West Izol, and the lead is working on main. Keep edits to shared files
  (`src/world.js`, `src/main.js`, `src/map-fog.js`, `package.json`) small and local; put your work in
  new modules with one call from the world builder and one hook in `src/main.js`.
- `src/main.js`, `index.html` and others are CRLF with very long lines: never reformat, patch by exact
  anchors with a Python script that asserts each anchor occurs once and writes nothing if one fails.
- **Tidehaven's ground is rigid.** Its terrain, its scatter and every existing stand must come out of
  your branch unchanged; add beside them, never through them. The same goes for the road out of Drent,
  which the autoplay check walks.
- Performance: Drent is the region the game is judged by. Merge static scenery into vertex-coloured
  batches, instance the scatter, keep shadow casters down. The traversal smoke's Drent frame time must
  not get worse by more than about 10%.
- `npm test` stays green; add tests for the ruins (standable, in Drent, clear of the road), the western
  village (stands standable and reachable, 4 m from quest people), the letters quest (every exchange,
  the standing it leaves, the save), and the chart entries. Run `npm run test:game` and
  `npm run test:road` once each at the end. Do **not** run `npm run test:autoplay`.
- Check your work by eye with headless review screenshots (see `docs/world-scale-report.md`) of the
  ruins, the western village, and both old people at their stands. Delete scratch pages.
- Commit in milestones. Write `docs/drent-depth-report.md`: what the lore gave you, what you invented,
  the renaming as you recorded it, coordinates, files touched, test and smoke results, what is
  stubbed, and what the lead must resolve on merge.
