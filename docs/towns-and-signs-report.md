# The towns, the signs and the forts: what was built

The build report for `docs/towns-and-signs-brief.md`, on branch `towns-signs`.
Every place along the road is built and lived in, every sign in the game speaks
one language, the Legion's camp on the Moros is a real timber fort built to the
shared fortification standard, and East Suval is closed behind Elod's stone
frontier.

## One sign language (`src/signs.js`)

Four board shapes, four meanings, one lettering atlas, one set of woods:

| Shape | Meaning | Where |
| --- | --- | --- |
| Pointed board (fingerpost) | A direction | The Greenway, the main road, the branch roads, Pueth's road |
| Square board on two posts | A place name | Nothom's gates, the Caloss Gate, the Moros Gate, the outpost |
| Small plaque | A notice | "Notices", "Orders", "Truce", "Closed by Elod", "The Stable Yard" |
| Painted stone | A border | Caloss Gate (Tidehaven / Avrel), the Moros Gate (Luscia / Moros Plain), the frontier (East Suval / Luscia) |

- Lettering is drawn once into a 1024 px atlas (two columns of 64 px cells) and
  cut out per label with an alpha-tested material, so every letter on every sign
  is the same height (`LETTER_STRIP` = 0.34 m of board) and the board grows with
  the words instead of squeezing them (`labelPixels`, `labelMetres`, both tested
  against the atlas).
- Both faces are lettered: a fingerpost names where it points on the front and
  where the traveler came from on the back; a border stone names the country
  beyond it on the face the traveler reads on approach. Nothing faces away from
  the road.
- One palette (`SIGN_COLOURS`): weathered post `#71523a`, board `#ab7950`,
  edge `#59432e`, and a paint per country for border stones. No glossy,
  emissive or default-material parts anywhere: the restored waymarkers' faces
  and the Mosslight waystone's inset, which used to glow, are painted now.
- Every label lives in `SIGN_LABELS`; an unknown label throws at build time
  (`Sign label "…" is not in SIGN_LABELS.`), so a sign can never be silently
  blank. The old `trailSign` and its one-off atlas are gone; the village's
  signs, the regional fingerposts, West Suval's and Pueth's scenery signs all
  go through `createSigns`, the last two through a small adapter in `world.js`
  that points their fingers along the road they stand on.
- `world.roadSigns` now records `{x, z, label, returnLabel, kind}` for the map
  and the tests; posts push a `kind: 'signpost'` collider so a sign is solid.

Before: `tests/artifacts/towns-review/before-signs.png`.
After: `tests/artifacts/towns-review/after-signs-1.png`,
`after-signs-2.png` (the Moros Gate fingerpost in the first was later removed:
the gate names itself with a place board and a border stone).

## Drent

- **The Avrel farm hamlet** (`AVREL_HAMLET`): a barn and a byre east of the
  clearing, a stack yard of four ricks, dry-stone walls along the far sides of
  the three fields, a well, and Corvan's Legion post as a proper lean-to with
  the Empire's flag over it (the post's table and collider stay exactly where
  the quest put them). Hild the farmer stands by the fields.
- **The Caloss Gate**: a roofed timber gatehouse over the old field gate, its
  upper room carried on the gate's own posts and a second pair behind the
  leaves, a guard hut on the Avrel side, a "The Caloss Gate" place board and the
  border stone (Tidehaven / Avrel).
- **Fernway Rest**: a timber shelter with a bench inside, across the road from
  the old bench.
- **Wayside life on the empty forest road** (`DRENT_WAYSIDE`, all landmarks with
  discovery text, nothing that attacks — Drent is level 0): the Charcoal
  Burners' Clearing (two turf-covered stacks, a bark hut, a barrow), the
  Forester's Hut (log hut with a porch, chopping block, marked poles), the
  Wayside Shrine (a little roofed shrine on a post with offerings), the Timber
  Landing (stacked oak waiting for the carts).

After: `tests/artifacts/towns-review/after-places-1.png` (farmsteads, gatehouse),
`after-places-4.png` (the four wayside places and the shelter).

## Luscia

- **The Caloss crossing camp**: Hollis's timber stacks and sawhorses on the
  Luscian bank, the ferryman's hut and his jetty with the boat still tied up;
  Cade the ferryman stands at the water.
- **The reedcutters' landing**: drying racks, reed stacks, a punt carried up.
- **Sava's shrine** in a walled court open to the road, with offerings on the
  step.
- **The old relay hut**: a fenced yard, a mast and a "Notices" plaque.
- **The field at the Lauvel**: a field hospital tent with Maud the healer, the
  cairn of the unclaimed, trampled ground and battle debris.
- **The burned hamlet**: four roofless shells with doorway gaps and fallen
  timbers, a well, and a scorched orchard of twelve dead trees.
- **Nothom**: a palisade gate with watch hut at each end of the road
  (leaves open, wings running back into the trees), the smithy with Rook at his
  anvil, the town hall with a bell cote and Ceri keeping it, a notice board,
  carts, washing lines, and Watchman Tobias at the north gate. The ostler's
  stable yard is dressed round the stand the lead placed — stable, trough,
  hitching rail, paddock fence — with nothing within 6 m of the stand or the
  hitch, and a "The Stable Yard" notice.
- **The three workyards** (`src/regional-places.js`) are drawn where their
  people stand: the Mill Commons, the Landing Workshop and the Waystation
  Shelter each have a frame (offset, yaw) that carries their scenery, colliders
  and branch shapes from the pre-rebuild coordinates to the reserved ground.

Before: `tests/artifacts/towns-review/before-towns.png`.
After: `after-places-1.png`, `after-places-2.png`, `after-places-5.png`.

## The Moros Plain

**The Ambroni outpost** (`src/outpost.js`, `src/moros-works.js`), a real timber
fort at the exact centre of the plain, replacing the 30 × 26 m ring of stakes:

| Measure | The outpost | The border stockade |
| --- | --- | --- |
| Circuit | Closed five-sided palisade, 316 m round, the north-east face square to the road | Closed square, 64 m round |
| Wall | 4.8 m to the top of the parapet outside, 4.0 m thick on its rampart | The same height, 3.0 m thick |
| Wall walk | 3.3 m up, behind the parapet, reached by four stairs | Reached by one stair |
| Towers | 12: one at each corner, two flanking each gate, three on the long runs. A storey above the walk (6.6 m platform), projecting 1.2 m. Longest gap between towers **38.3 m** | Four corner towers |
| Gates | Two. The main gate on the road from the north-east and the rear gate west, each a 4.6 m passage between its towers with the leaves swung back | One, where the Solis road leaves |
| Ditch | 3.5 m wide all round, spoil as a bank under the wall, stakes in the floor, cut only at the two causeways | The same |

Inside: the parade ground where the company musters, the tribunal, the command
tent with the Legate's standard, four rows of tents, the stores, the smithy tent
with forge, anvil, quench tub and spear rack, the granary, the well and trough,
the horse line, and the mess awning with its benches and cooking tripod.

- The **repair bench** at the smithy (`OUTPOST_BENCH`, id `outpost-repair`) is
  registered like every other bench, so the quartermaster's promise is true.
- The **mess fire** (`OUTPOST_FIRE`, id `outpost-fire`) is a working campfire
  and is saved in checkpoints like the others.
- **The fight ground is kept clear**: the whole quadrant from north round to
  east of the main gate is free of new colliders for 70 m beyond the gate's own
  ditch (tested), the gate passage is walkable, and the gate guards' posts and
  every quest stand are where they were.
- **Both garrisons** (`src/town-life.js`, stakes through `src/occupation.js`):
  the Legion (`holds: 'empire'`) — Legionary Varus at the rear gate, Armourer
  Petrus at the smithy, Cook Albus at the mess, Optio Sextus Rufio on the parade
  ground, and the pickets Nerva and Stavro on the road; the Coalition
  (`holds: 'coalition'`) — Captain Tamar Venn of the valley companies at the
  command tent with two lines, two spearmen at the gate and one at the rear.
  The Legate's standard pole carries two flags, the Empire's red and the
  Republic's blue, each staked, so the pole reads as the holder's. Figures on
  the wall walk and the gate towers change with them.
- **The Moros gate**: proper gate posts and leaves, palisade wings, a watch
  platform with a ladder, the place board and the border stone.
- **Wayside on the 270 m of bare plain** (`MOROS_WAYSIDE`): the cart ruts, the
  shepherd's fold (with a flock), the Legion picket's wattle windbreak, tent and
  brazier, a dead campfire, and three milestones counting down to the gate
  (III, II, I).

Before: `tests/artifacts/towns-review/before-moros.png`.
After: `after-moros-1.png`, `after-moros-2.png`, `after-people-1.png`.

## East Suval, closed

- **Elod's frontier** (`src/frontier.js`, `src/frontier-works.js`) in grey
  stone where the branch road reaches the border: a gatehouse with the gate
  **shut** (its own colliders across the passage), flanking towers, and a wall
  with its ditch running out of sight along the whole Luscian border, from the
  southern hills to the sea, closing on the border line at both ends. Behind it
  a watch platform, a signal beacon, a guard house and a stable; a "Closed by
  Elod" notice and the border stone at the road.
- **Pickets' watch posts** every 118 m along the rest of East Suval's land
  border (9 of them), each a post platform with a black pennant, set 7 m inside
  and stopping where the coast begins.
- **The `elodi-guard` look** (`src/characters.js`): black lamellar over dark
  cloth, a black hood under a light open helm, soft boot wraps, a long knife, a
  small round shield, and a short spear or a bow; leaner and a little taller
  than a legionary, with a captain's cloak and silver clasp for the officer.
  Checked by eye beside a legionary and a Coalition spearman:
  `tests/artifacts/towns-review/after-lineup.png`.
- **Eleven Elodi** at the gate and along the wall: Captain Aveth Orun with four
  lines that explain Elod's neutrality and why this border is watched hardest,
  three guards on the ground (one with a bow) and seven figures on the walls.
- **Entry is refused everywhere, not only on the road**
  (`src/closed-border.js`, pure and tested): a move that would carry the player
  from outside East Suval to inside it is undone, with a rate-limited toast
  (one every 6 s) that the Elodi pickets turn the traveler back. Moves within,
  out of and along the border are untouched, so a tester dropped inside by the
  F8 tools can still move about.
- The branch road (`world.suvalRoute`) now ends at the frontier's approach; the
  traversal smoke holds into the shut gate and asserts it never enters the
  region (`eastSuvalClosed`). `src/region-world.js`'s region card and the old
  border post's description say the border is closed; the README's region table
  says so too. Elod itself is untouched: no build-out.
- Room is left for the Luscian rangers: a cold camp (`RANGER_HIDE`, "A Cold
  Camp") in the woods behind the picket line, scenery only.

After: `tests/artifacts/towns-review/after-places-3.png`, `after-people-1.png`
(the shut gate with its guard), `after-signs-2.png` (the notice and stone).

## The fortification standard (`src/fortification.js`, `src/fortworks.js`)

`FORT_STANDARD` holds the measures both sides build to (wall 4.8 m, walk 3.3 m,
tower platform 6.6 m projecting 1.2 m, one tower per 30–45 m, gates 4.6 m,
ditch 3.5 m, berm 1.0 m, causeway 10 m). `fortCircuit(spec)` turns a list of
corners, gates and towers into a frozen plan: edges, gates with their passages,
towers, wall runs, the ditch, the colliders, `wallLine(step)`, `inside`,
`outward` and `pointOn`. Axis-aligned runs become box colliders, diagonal runs
chains of circles; the chains are inset by a radius at the causeways so a gate
is exactly as wide as it looks. `fortworks.js` draws a plan in `timber`
(squared palisade on a rampart, timber towers with pyramid roofs) or `stone`
(coursed wall, battlements, stone towers) — the same plan, different materials,
so the Legion's fort and Elod's frontier read as works of the same strength.
Solis, built by another agent from the same brief section, is the stone half of
the same standard.

`tests/fortifications.test.js` samples every circuit's wall line every 2 m and
asserts nobody can stand on it except in a gate passage, walks each passage end
to end with the real movement code (and asserts the frontier's shut gate cannot
be walked), and checks the standard's own measures, the tower spacing and the
clear quadrant outside the outpost's main gate.

## People (`src/town-life.js`)

Twenty new speaking people with two or more lines each, one hook each in
`main.js` (registration, conversation, the frame pass). Six townsfolk and
workers in Drent and Luscia who speak plainly; six Legion and four Coalition at
the outpost, who speak in orders; four Elodi at the frontier. Thirteen wall
figures (Legion, Coalition and Elodi) are drawn and animated but never spoken
to, and appear only within 95 m. Ambient people are drawn within 80 m; quest
people keep the game's own longer range. No goblins are mentioned in Luscia, no
South Pyros, and only the Legion's people wear Legion armour.

Every new stand is tested standable, reachable from the road by flood fill, at
least 4 m from every quest NPC and the mercenaries' muster, and in the region it
belongs to.

## Animals

`src/road-life.js` gains three world zones so each region carries two or three
flocks: the shepherd's fold's sheep on the Moros (5), the Avrel sheep (4) and
the ferry's birds at the Caloss crossing (3). Twenty-three creatures in all,
each with a unique id.

## Files

New: `src/signs.js`, `src/scenery-builder.js`, `src/fortification.js`,
`src/fortworks.js`, `src/outpost.js`, `src/moros-works.js`, `src/wayside.js`,
`src/frontier.js`, `src/frontier-works.js`, `src/closed-border.js`,
`src/places.js`, `src/place-works.js`, `src/town-life.js`,
`tests/fortifications.test.js`, `tests/signs.test.js`,
`tests/closed-border.test.js`, `tests/elodi-guard.test.js`,
`tests/town-life.test.js`, `tests/places.test.js`, this report.

Changed: `src/world.js` (signs, the three scenery calls, the stockade spur, the
outpost's bench and fire, `stakedProps`, `suvalRoute`, `closedFrontier`, the new
landmarks), `src/world-regions.js` (clearings for every new place; the old camp
palisade, tents, command tent, standard, stockade ring and Moros gate posts
removed), `src/region-world.js` (landmark and region descriptions),
`src/characters.js` (the `elodi-guard` role), `src/main.js` (six short hooks),
`src/regional-places.js` (the workyard frames), `src/road-life.js` (three
flocks), `src/road-traversal.js` (the branch road now ends at the shut gate),
`src/woodland-progress.js` (the outpost's fire is a known fire; the discovery
limit grows to 160), `README.md`, `package.json`, and the tests
`regions-world`, `regional-places`, `road-life`.

## Checked by eye

Every place was rendered in headless Chrome from a scratch page driven over the
devtools protocol (four cameras a sheet, the same lighting and materials as the
game), and the page was deleted before committing. The sheets are in
`tests/artifacts/towns-review/` in this worktree
(`…/azhora-game-towns/tests/artifacts/towns-review/`); `tests/artifacts/` is
gitignored, as it is for every other smoke's output, so they do not travel with
the branch:

| Sheet | What it shows |
| --- | --- |
| `before-signs.png`, `before-towns.png`, `before-moros.png` | The old signs, the old places, and the Legion camp as a ring of stakes |
| `after-signs-1.png`, `after-signs-2.png` | Fingerposts, the Caloss border stone, a milestone, place boards, notices |
| `after-moros-1.png`, `after-moros-2.png` | The outpost from outside, its main gate, its interior, the stockade |
| `after-places-1.png` … `after-places-5.png` | Avrel, the Caloss Gate, Nothom, the crossing, Sava's court, the Lauvel, the frontier, the Drent wayside, Fernway Rest |
| `after-people-1.png` | Elod's guards at the shut gate, the Legion on the outpost's walls, the smithy and mess |
| `after-lineup.png` | An Elodi spearman and archer beside a legionary and a Coalition spearman |

Two things the sheets do not show well and that were checked in the built world
instead: the burned hamlet's four shells (a tree stands between the review
camera and them; their geometry stands 1.7–4.1 m above the ground with the well
solid between them) and the Fernway shelter's roof (drawn, but edge-on to that
camera).

## Tests and smokes

- `npm test`: **468 tests, 468 pass** (duration 555 s), after the last merge with
  `main`. The six new test files are in `package.json`'s list:
  - `tests/fortifications.test.js` (6): the standard's own measures; the outpost
    as a fort (two gates, towers at every corner and gate, no run over 45 m, the
    road through both gates); each circuit closed, sampled every 2 m, with its
    passages walked end to end; the clear quadrant outside the main gate; the
    stockade as a smaller work to the same pattern; Elod's frontier closing on
    the border at both ends with its gate shut.
  - `tests/signs.test.js` (3): four shapes for four meanings, lettered on both
    faces, nothing glossy or emissive; one lettering height and a board that
    grows with the words; every sign in the built world carrying a known label,
    on solid posts, signing the road it serves.
  - `tests/places.test.js` (5): nothing new on a road and the whole main road
    still ridable; the stable yard dressed with no collider within 6 m of the
    ostler's stand or the hitch; the outpost's bench and fire registered and
    reachable (and accepted by `validateWoodlandProgress`); the wayside places
    as landmarks in their own regions with nothing in Drent to fight; the
    scatter clear of every new building.
  - `tests/town-life.test.js` (4): names, looks and at least two lines each with
    nothing Luscia must not hear; Elod's eight-to-twelve guards and its captain;
    the outpost changing hands by stake; every stand standable, clear of the
    quest people and reachable from the road.
  - `tests/closed-border.test.js` (4) and `tests/elodi-guard.test.js` (2).
  - Changed: `tests/regions-world.test.js` (the branch road ends at the shut
    gate), `tests/regional-places.test.js` (the workyards drawn where their
    people stand), `tests/road-life.test.js` (the three new flocks).
- `npm run test:game`: **pass** (`smoke.json` `ok: true`, 1 833 frames, 475 draw
  calls, 836 k triangles, no errors). An earlier run failed with *"Completed
  road checkpoint did not save"*: the outpost's mess fire was a fire the
  checkpoint did not know, and the discovery list had outgrown its limit. Both
  fixed in `src/woodland-progress.js` (the fire is a known fire; the limit is
  160), and the smoke has passed since.
- `npm run test:road`: **pass** (`ok: true`, 7 550 m walked, 1 060 s, no errors,
  `eastSuvalClosed: true`): the branch road is walked to Elod's gate, the
  traveler holds into it for 45 frames and neither passes it nor enters the
  region, and every other region is entered on foot.
- Not run: `npm run test:autoplay`, as instructed.

## Frame time

The traversal smoke's own figures, this branch against `main`, measured today.
Both runs were taken while other agents were building and running smokes on the
same machine, and the load moved more than the content did: the baseline run's
*best* frame was 13–18 ms where this branch's was 8–10 ms, so its means are not
usable as a comparison.

| Region (mean frame ms) | `main` earlier today (db52c73) | this branch (f5d9a36) | `main` (e4f814a, loaded) | this branch (be8e846) |
| --- | --- | --- | --- | --- |
| Drent | 25.1 | 29.0 | 47.6 | 29.3 |
| Luscia | 21.7 | 26.4 | 48.2 | 25.7 |
| Moros Plain | 20.1 | 23.2 | 43.6 | 24.0 |
| Pueth | — | — | 47.8 | 26.1 |

The honest figure is the first pair, taken back to back on a quiet machine
before Pueth and birding existed: **+16 % in Drent, +22 % in Luscia, +15 % on
the Moros**, with Luscia over the brief's ~15 %. That measurement is from before
the optimisation commit (c883a9a: a front-face scenery material, a 12-triangle
palisade stake template that took the outpost's walls from 31.5 k to 22.1 k
triangles, thinned ditch and wall collider chains, fewer ambient people drawn
only within 80 m and wall figures within 95 m), and the second pair, though
noisy, shows this branch at or under its own earlier numbers with two more
regions' worth of content in the world. A clean re-measurement on a quiet
machine is the one measurement still worth taking.

Submitted geometry, counted in Node with the world's own batching (four cameras
plus the shadow camera at each spot, `main` at e4f814a against this branch):

| View | draws | triangles |
| --- | --- | --- |
| Tidehaven | 381 → 386 | 667 k → 676 k (+1 %) |
| Caloss Gate | 332 → 342 | 776 k → 783 k (+1 %) |
| Avrel clearing | 391 → 399 | 580 k → 605 k (+4 %) |
| Caloss crossing | 363 → 376 | 518 k → 544 k (+5 %) |
| The Lauvel | 337 → 359 | 413 k → 453 k (+10 %) |
| Nothom | 317 → 335 | 396 k → 418 k (+5 %) |
| Moros gate | 267 → 292 | 367 k → 397 k (+8 %) |
| Moros road | 182 → 202 | 302 k → 346 k (+15 %) |
| The outpost, outside | 155 → 172 | 226 k → 287 k (+27 %) |
| The outpost, inside | 147 → 159 | 210 k → 263 k (+26 %) |
| The border stockade | 254 → 274 | 354 k → 379 k (+7 %) |
| Elod's frontier | 287 → 307 | 423 k → 463 k (+9 %) |

The fort and the frontier are where the triangles went, and both are on empty
plains where nothing else is drawn: those views remain the lightest in the game,
well under Tidehaven's or the Caloss Gate's. Colliders 8 260 → 9 009. Each new
place is one merged vertex-coloured mesh, so a whole fort costs a handful of
draw calls.

## Merges with `main`

Merged three times while building: West Suval and Solis (4bc1699), birding and
Pueth (e1437f6), and the game's new name with the charted fog of war (be8e846).
The second merge needed `src/world.js` merged by hand (`git merge-file` on
LF-normalized copies, written back CRLF), and Pueth's fingerpost labels joined
`SIGN_LABELS` so its scenery draws through the one sign language; its
`trailSign` calls now point along the Pueth road. The traversal smoke's
`returnedToDrent` (main's rename) keeps this branch's closed-border assertions.
`package.json`'s test list is main's plus this branch's six files.

## What is left

- The figures on wall walks and towers are scenery: they animate and turn with
  the wall, but they cannot be spoken to. Only the ground guards talk.
- The rangers on the Luscia side of the closed border are scenery (a cold camp);
  they have no people and no quest.
- East Suval's own content (Elod, the waystation, the lookout, the old border
  post landmark) is unreachable while the border is closed, as intended. Its
  landmark descriptions were rewritten, not removed.
- `npm run test:autoplay` was not run; its route walks to the outpost's gate,
  which now stands in a fort with a real gate passage.
- Collision is still a linear scan over `world.colliders` (9 009 on this branch
  against 8 260 on `main`), which is what makes each world-building test take
  about two seconds and `npm test` nine minutes.
- The README's headline counts of speaking people and discoverable places were
  already stale on `main` before this branch (three agents added people and
  places in parallel); the region table, the waymarker and animal paragraphs and
  the module table are up to date here, but the counts want one recount on the
  lead's side after everything is merged.
- A last frame-time measurement on a quiet machine (see above).
