# Telemonia, stage 1: the country

Brief written 2026-10-02 by the coordinating session. Telemonia is **not** a terrain-only region like
the thirty before it: the user designed it as a closed warrior kingdom, and it is being built in two
stages. **This is stage 1 — the ground, the rock, the terraces, the city's crag and its wall, and the
wildlife.** Stage 2 (the city's buildings, the planted farms, the people and how they treat an
outsider) is a separate job that starts after the user has seen this one. Build nothing of stage 2,
and build nothing that makes it harder.

## Where you work, and the rules that do not bend

- **Your worktree**: `C:\Users\Michael\Programs\typescript\azhora-game-telemonia`, branch `telemonia`,
  cut from branch `next-main` (main `b16b66a` + the post-merge fixes + Selemis). Work only there.
- **Do not commit. Do not push.** Never a bare `git stash`. Never edit, stage or run a state-changing
  git command in any other checkout. The main checkout (`azhora-game`) holds another worker's
  uncommitted work: do not use it for anything. Your base is checked out clean at
  `C:\Users\Michael\Programs\typescript\azhora-game-land`; you may run `node --test tests/<one file>`
  there for a baseline, read-only.
- **The lore repo** (`C:\Users\Michael\Programs\typescript\world-builder`) was rewritten for Telemonia
  yesterday. Read it; do not rewrite it again. If you find it disagrees with the atlas, report it.
- **The atlas is not to be changed.** The user chose to build the country high on the atlas as painted.
- **Ask before a design decision.** Derive from the lore and label the choice yours, or leave it open
  and report it.
- This machine: big heredocs fail and backslashes inside python heredocs get eaten, so write scripts to
  a file and run the file; global `autocrlf=true`; keep each file's line endings as found (several are
  mixed); three.js is vendored and there is no `node_modules`; `npm test` cannot run.

Read first: the two lore files below in full; `docs/selemis-brief.md` and `docs/selemis-report.md`
(the most recent region, and the shape your report should take); `docs/ascarth-report.md` and
`docs/oves-report.md` (the built neighbours); `src/content/regions/feradom/feradom-forts.js` and `src/gameplay/movement/climbing.js` (walls and
cliffs that actually stop a walker); `docs/known-failing.md` in your worktree.

## What the user said — this paragraph is the specification

> They worship a grim, laconic god comparable to Crom in Conan the Barbarian, except they are more like
> Sparta with a collective society. Their men are all great warriors who run slave farms like the
> Spartans. Their main city in the center should be well fortified naturally and by walls and there
> should be helot-like slave worked farmland surrounding it. Update the lore and map if needed and make
> it rockier and more elevated so there is room for terrace farming and rock based defenses. The
> Telemon warriors should carry long spears and shield and knives in scabbards. The women also carry
> knives and are no strangers to combat. There are no designated guards. All the men basically function
> as the guards and the women too though they are not as good in combat.

And decided with it: the climate follows the atlas (hot and dry); the country is the lore's closed
kingdom, not the campaign file's "wild" hills; a traveler can get in but is challenged on sight (stage
2); the field people are the descendants of invaders who never got home; names are derived from the
`kellith` profile. The hero is Cromb: the god is **Tormon**, never anything else.

## The lore, as rewritten

`world-builder/azhora_lore/geography/regions/telemonia.md` and `peoples/the_telemon.md`. What they
give the ground:

- A bowl with a thick rim. The rim is rock: ridge behind ridge **running north-east to south-west**,
  bare crests, **cliff bands**, narrow valleys between, and **few passes**.
- Inside the rim one enclosed plain, **the Galmeth**, and in the middle of it the rock that carries
  **Kethorn**: "a rock with cliff on three sides and a wall closing the fourth", the only walled place
  in the country.
- **Terraces** step the inner faces of the rim from the cliff foot down to the plain.
- Hot, dry: bunch grass, wormwood and thorn on the slopes, grey scrub oak and juniper in the folds,
  bare stone above. Only the south-east corner holds a wood: **the Belketh**, "the wooded edge".
- **No river inside.** Washes that run for days after rain and are dry stone by midsummer; nothing is
  built in a wash. Water is kept in rock-cut cisterns and behind check-walls across the gullies.
- The god sits on **the Rothkar**, "the highest rock of the rim". The seasonal ceremonies are held in
  the open within sight of it.
- No walls on the borders: "the terrain is the wall".

## The atlas — measured

- Region key **`Telemonia`**, 25 hexes, landlocked, rows 118-122, q -17...-11. World position (x =
  100(q + r/2) - 6700, z = 86.6025 r - 9150.9): hex centres span **x -2350...-1850, z 1068...1415**,
  about 600 m by 460 m. Inside the survey window and the world box; it should move neither. Prove it.
- **Seventeen `hills` on every edge and eight `plains` in the middle**: the plains are (-14,119)
  (-13,119) / (-15,120) (-14,120) (-13,120) / (-15,121) (-14,121) (-13,121). The centre of them,
  **(-14,120) at (-2100, 1241.4), is where Kethorn's rock stands.**
- Climate per hex (`azhora.wwmap`, never the `.cmap.json`): **`BSh` on 23, `Csb` on two** — (-12,121)
  and (-13,122), the south-east corner. That corner is the Belketh.
- Neighbours by shared hex edges: **Oves Desert 12 (north, built), Gala 9 (east, built), Legemum 9
  (south, unbuilt), East Pyros 8 (west, unbuilt).**
- Rivers: **none inside.** The atlas draws small-stream edges on the Oves border (5) and the Gala
  border (7). Both are already built by their own countries — Gala's is the Treloss
  (`GALA_TELEMONIA_STREAM` in `src/content/regions/western-regions/west-regions.js`). Join them; do not rebuild them.

## Stage 1: what to build

1. **Register `Telemonia`, appended last on your base.** The literal region number goes in
   `REGION_IDS` and nowhere else — it will be renumbered at landing, because another worker has taken
   the next ids on main. Use `REGION_IDS.Telemonia` everywhere, and "comes after everything that was
   there before" instead of "is last". The pipeline is the one `docs/selemis-report.md` lists.
2. **The rim.** High, broken rock: ridges with a north-east to south-west grain, cliff bands, narrow
   valleys. The user's words are "rockier and more elevated ... rock based defenses". **The cliffs
   must actually stop a walker** — outside climbing terrain a traveler simply walks up a cliff, so use
   the climbing rule (`src/gameplay/movement/climbing.js`) or an equivalent and say which. Put **the Rothkar**, the
   highest point of the rim, where the ground argues for it, and say why there.
3. **The passes.** Few, and real: the only ways through the rim on foot. At least one must reach the
   Galmeth from the Gala side and one from the Oves side, because the built world lies there and stage
   2 lets a traveler in. Say how many, where, how wide, and which neighbour each faces. The name
   *Tarnel* is free in the `kellith` profile's own candidate pool if a pass earns one.
4. **The Galmeth.** A raised, level basin: the open plain the farms will stand on in stage 2. Leave
   it as open ground with its washes crossing it — no fields, no buildings.
5. **Kethorn's rock and wall.** A crag standing out of the middle of the plain, cliff on three sides,
   and **a wall closing the fourth with one gate opening** — built as a real barrier with colliders,
   the way Feradom's forts are. The top must be usable ground for stage 2: say how much level area
   there is and where the gate, the halls and the king's hall could go. No buildings on it yet.
6. **The terraces.** Dry-stone steps on the inner slopes of the rim, as ground: walkable, retaining
   walls, unplanted. Check-walls across a gully or two if the ground wants them.
7. **The Belketh.** The one wooded corner, on the two `Csb` hexes.
8. **Scenery**: natural only, in the vocabulary the built neighbours already use for this dry belt.
9. **Wildlife**, derived from the lore and the neighbours' built wildlife, not invented. **No domestic
   stock**: the cattle and the Telemon horse are stage 2. The west's laws hold (nothing can be walked
   down; a band needs room behind it).
10. **Nobody sealed in** (`tests/nobody-sealed-in.test.js`), on the rim, in the basin and on the rock.

## Also in this job — three fixes the user approved

- `src/content/chapters/civil-war/campaign-world.js`: Telemonia's entry is `'wild'` with sand goblins and hill bandits. Replace it
  with the kingdom: a polity for the Telemon (seat Kethorn), the region controlled by it, level 3
  kept, and a role line that says what it is.
- The same file marks the region **Gala** as `'pyrosi'`. That is a mistake: there are two Galas. The
  walled Pyrosi capital is in West Pyros; the Lizeem's Gala is its own Mittoli-speaking city of
  brokers and assessors, "under Aevis's suzerainty more often than not" (`gala.md`). Give it a polity
  of its own, derived from that file, and label the choice.
- `src/gameplay/skills/languages.js`: Kellith's `where` still says "valley halls, Zorkys among them". Zorkys is not in
  Telemonia and Matt is not Telemon. Make `where` Telemonia's own; **leave Matt's tongue alone** (it
  changes in a later job) and say so in the report.

Add rows to `docs/lore-adjusted-to-atlas.md` for what the lore rewrite changed (the old climate and
treeline, West Pyros -> East Pyros, the Branch Court brokers, Legemum's northern border).

## Not in this job

No buildings, no fields or crops, no people, no weapons, no behaviour toward the traveler, no border
market, no quests, no domestic animals. If something here cannot be finished without one of those,
stop and report it.

## Tests — and how long they take

**Building the world takes three to five minutes per test file** on this base (51+ regions), and 129
of the suite's files do it. So: never the full suite; **one test file at a time**; use
`--test-name-pattern` when one test will do; `tests/west-life.test.js` only law by law and only for
your own zones (one of its laws takes thirty-seven minutes).

Run at least: your own `telemonia-world`, then `region-layout`, `region-survey`, `region-sky` and
`eer-world` (the shared list is `tests/own-sky.js`), `map-fog`, `developer-atlas`, `languages`,
`cartography`, `campaign-world`, `gala-world`, `oves-world`, `open-country`, `chameleon`,
`ibenwood-metadata` (chart areas must stay where it expects them), `south-oremindi-metadata`,
`yunethre-world`, `southwest-world`, `climbing` tests if you touch the rule, `nobody-sealed-in`, and
`drawn-ground` if you add a ground patch.

`docs/known-failing.md` lists every test that already fails on your base, with its message. **Compare
names and messages, not counts**, and run the file on the base before calling anything else
pre-existing.

**One review render at the end, after the last change.** The game takes three to four minutes to
launch now; that is expected. `node scripts/launch.cjs --smoke-test --review-clean --review-jpeg
"--review-views=..."`, with `telemonia-*` views added to `src/main.js`. Look at the pictures yourself.

## Report

`docs/telemonia-stage1-report.md`: what you built and the lore line each piece came from, your own
choices labelled; the measured numbers (rim heights, the Rothkar, the passes, the basin's level, the
rock's height and its usable top, the wall and gate); what stops a walker and where; proof the window
and the box did not move; every test file run with its result and the baseline for anything red;
where the literal id appears; the review views; **what stage 2 will need to know** (sites for halls,
fields, the gate, the high place); and every decision left open.

Your final message is read by the coordinator: lead with what is built and whether it is green, then
the open decisions, then what you could not do and why. State plainly anything you did not verify.
