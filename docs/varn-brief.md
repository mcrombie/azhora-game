# Varn, and the Ambroni fortresses of the Lotharn passes

Brief written 2026-10-02 by the coordinating session. This is **owned content in countries that are
already built**: a fortified city and a set of smaller fortresses. No new region is registered.

## What the user said — this is the specification

With a picture of the chart, a ring drawn round four hexes at the southern foot of the East Lotharn
(`docs/varn-request.png` in your worktree — look at it first):

> I want you to add a heavily and beautifully fortified city called Varn that has walls that are built
> into the mountains and completely surround the perimeter of the city making that mountain pass
> completely impassable. Adjust the mountains if needed to make sure this city becomes the key
> strategic chokehold blocking movement south from this mountain pass. Let's also add Ambron fortresses
> of smaller scale wherever else there are strategic chokeholds that control entry south from the East
> Lotharn Mountains and the West Lotharn Mountains.

"Ambron fortresses" for the others means Varn is Ambroni too: the Empire's great fortress-city on the
pass, and smaller imperial forts on every other way south.

## Where you work, and the rules that do not bend

- **Your worktree**: `C:\Users\Michael\Programs\typescript\azhora-game-varn`, branch `varn`, cut from
  branch `land-all` (`01e0578`): main, plus the post-merge fixes, Selemis, and a snapshot of another
  worker's uncommitted work (Dwarfland and a step-wise world build). Work only there.
- **Do not commit. Do not push.** Never a bare `git stash`. Never edit, stage or run a state-changing
  git command in any other checkout. **Never touch the main checkout `azhora-game`**: another worker is
  writing in it right now.
- **The lore repo** (`C:\Users\Michael\Programs\typescript\world-builder`) is read freely and edited in
  place only; never commit, stage, stash or push there. Varn is new, by the user's word: add it to the
  lore where it belongs (the Amod and East Lotharn files), briefly and in the lore's own voice, and
  say what you added. **Do not change the atlas.**
- **Ask before a design decision.** Derive from the lore and the game's own precedents and label the
  choice yours, or leave it open and report it.
- **No named characters, no quests, no civilians.** Whether anybody stands on the walls is an open
  question for the user (below); build the place.
- Ambroni soldiers and Ambroni building are **medieval — Stormwind-like — never Roman**. Use the
  Empire's existing kit (its colours and emblem in `src/content/chapters/civil-war/campaign-world.js`, the imperial work already in
  Ambron, Tidehaven and the garrisons) rather than a new style.
- Names: **Varn is the user's name; keep it.** Every other name you coin must derive from the language
  profile of the country it stands in (`world-builder/azhoran_language_profiles.py`, and
  `src/gameplay/skills/languages.js` for which tongue a country speaks), or the place stays descriptive.
- This machine: big heredocs fail and backslashes inside python heredocs get eaten, so write scripts to
  a file and run the file; global `autocrlf=true`; keep each file's line endings as found; three.js is
  vendored; `npm test` cannot run.

## The base has changed shape — read this before you write anything

The other worker's snapshot rebuilt how the world is made: **the build is step-wise now.** `createWorld`
runs generator steps, each country's scenery is a `create...ScenerySteps` generator, and
`regionBuild(id, [region ids], stage => ...)` in `src/world.js` registers it (with `immediate(() => ...)`
for a plain function). The terrain group is named `'The ground of Azhora'`. Read `src/world/loading/build-steps.js`,
`src/world/scenery/scenery-builder.js`, `tests/regional-build-steps.test.js`, and how `createFeradomScenerySteps`
builds its forts and `createAmodScenerySteps` its towns, and **follow that pattern**: no second,
non-step path. A world-building test file now takes about one and a half to two and a half minutes.

## The place — measured

The four ringed hexes are **Amod's notch into the south side of the East Lotharn** — all four belong
to Amod, all `Cfa`:

| hex | world centre | atlas terrain |
|---|---|---|
| (7,97) | (-1150, -750.5) | hills — the tip of the notch |
| (6,98) | (-1200, -663.9) | hills |
| (7,98) | (-1100, -663.9) | hills |
| (6,99) | (-1150, -577.3) | mountain |

(x = 100(q + r/2) - 6700, z = 86.6025 r - 9150.9.) The tip, (7,97), has East Lotharn **mountain** on
both sides of it — (6,97) to the west, (8,97) to the east — and East Lotharn hills north of it, (7,96)
and (8,96), where the pass comes down from **the Col** (-1080, -895) and the pass inn. Row 98 runs on
east as Amod hills, (8,98) (9,98) (10,98); west of (6,98) is East Lotharn mountain. No atlas river
touches the four. Amod's own nearest places are the Dromel Gate (-879, -562), Vessen and Tir Ostel,
two to three hundred metres east-south-east.

`src/content/regions/east-lotharn/east-lotharn-world.js` says in its own words that the pass road stops and that "the descent into
Amod below" is not built. **That unbuilt descent is where Varn goes.** The East Lotharn is climbing
country (`src/gameplay/movement/climbing.js`), with cliff bands, ramps, ledges and eight caves; the West Lotharn is the
taller half, with its own ways up and caves. Read `docs/east-lotharn-mountain-plan.md`,
`docs/west-lotharn-report.md`, `docs/west-lotharn-integration.md` and the Amod and Lotharn lore files.

## The work

1. **Find the ways south, by measurement.** Before building anything, flood the real ground with the
   game's own movement rules (`canStand`, `canWalkSlope`, the colliders) and find **every way a walker
   can come south out of the East Lotharn and out of the West Lotharn** into the countries below them.
   For each: where it is, how wide its narrowest point is, what country it opens into, and whether
   somebody else already holds it (Feradom's pass castles are the Duchy's, not the Empire's). That
   list is the first thing in your report, and it decides where the fortresses go.
2. **Varn.** A fortified city filling the notch, so that the pass from the Col reaches Amod **only
   through it**:
   - **Walls built into the mountains**: the curtain runs up into the flanking faces and ends in rock,
     and the perimeter is closed all the way round. No gap, no goat track, no ledge round the end.
   - **Heavily and beautifully fortified**: more than a wall with towers. Think of what makes a
     fortress-city read as one from a distance and from under its gate — a gatehouse on the pass side
     and one on the Amod side, towers that mean something where they stand, an inner ward or citadel
     on the highest ground, walls stepping with the slope, the Empire's colours. And a town inside the
     walls, so that it is a city and not a castle.
   - **Adjust the mountains** where the ground does not already make the choke: the user gave leave.
     Say exactly what you changed in whose country, and re-run that country's tests.
   - **Impassable means measured.** With Varn's gates shut, a walker starting at the Col reaches
     nothing in Amod, and a walker in Amod reaches nothing in the East Lotharn by this pass. And **a
     climber cannot go over the walls or round their ends**: the faces the walls die into must not be
     climbable. (A climber crossing the high massifs somewhere else entirely is a different journey:
     measure whether one exists and report it, do not chase it.)
   - **The gates**: build them so that one flag opens or shuts them, and use the precedent the game
     already has for an imperial gate (the Dromel Gate, East Suval's barred gate, Feradom's castles,
     `src/world/travel/closed-border.js`) to choose the default. Say which you chose and why; it is the user's call.
   - **The road**: bring the pass road down from where it stops to Varn's north gate, through the
     city, and out of the south gate to join Amod's own road.
   - Nobody may be sealed in, anywhere, gates open or shut (`tests/nobody-sealed-in.test.js`).
3. **The smaller fortresses.** One Ambroni fort at each other choke the measurement found that controls
   entry south from either range and that nobody else holds. Smaller than Varn, the same hand: each
   closes its own way the same measured way, each with one gate. If a way cannot honestly be closed by
   a fort (too wide, or it is a river), say so rather than building a token.
4. **The chart and the registers**: map-fog areas, landmarks, the campaign file's settlements, build
   status, review views (`varn-*`, `fort-*`) in `src/main.js` — whatever the neighbouring towns have.

## One thing to coordinate

Another builder is adding **a "this rock cannot be climbed" rule** to `src/gameplay/movement/climbing.js` right now, for
a crag in a different country (worktree `azhora-game-telemonia`, not on your base). You need the same
thing for Varn's walls and flanks. Look at that worktree's `src/gameplay/movement/climbing.js` **read-only** and, if the
rule is there, write yours in the same shape so the two merge as rows of one table. If it is not there
yet, write yours as a table of named no-climb zones, one row per place.

## Tests — and how long they take

Never the full suite. **One test file at a time, never two processes at once.** A world-building file
takes one and a half to two and a half minutes on this base. `tests/west-life.test.js` only law by law.

Your own tests first (`varn-world`, and one for the forts): the choke measurements above belong in
them. Then at least: `amod-world`, `east-lotharn-world` and its scenery and climbing tests,
`west-lotharn-world`, `climbing`, `nobody-sealed-in`, `map-fog`, `campaign-world`, `region-layout`,
`regional-build-steps`, `region-loading`, `feradom-world`, `vastos-world`, `open-country`, and any
country whose ground you moved.

`docs/known-failing.md` lists what already failed on main before this base was made. **This base has
more reds than that list**, from the other worker's work in progress (for one, five tests still look
the terrain up by its old name). So: before calling anything pre-existing, run that file on the base,
which is checked out at `C:\Users\Michael\Programs\typescript\azhora-game-land` — read-only, one file
at a time. That checkout may move forward while you work; that is expected.

**One review render at the end, after the last change.** Look at the pictures yourself: Varn from the
pass, Varn from Amod, a wall end where it meets the rock, each fort. `node scripts/launch.cjs
--smoke-test --review-clean --review-jpeg "--review-views=..."`.

## Report

`docs/varn-report.md`: the measured list of ways south; what Varn is, piece by piece, and the
measurements that prove the pass is shut to a walker and to a climber; what you changed in the
mountains and in whose country; each fort, where and why there, and any choke you left open and why;
names and where they came from; what you added to the lore; every test file run with its result and
the baseline for anything red; the review views; and every decision left for the user — the gates'
default, whether a garrison should stand on the walls, and anything else.

Your final message is read by the coordinator: lead with what is built and whether it is green, then
the open decisions, then what you could not do and why. State plainly anything you did not verify.
