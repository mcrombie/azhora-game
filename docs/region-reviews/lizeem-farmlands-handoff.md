# The Farmlands of the Lizeem, Builds 1 to 5: handoff

Not a queue row and not a region: the whole quest line of the Farmlands of the Lizeem, the user's design of 5 October
2026 ([`docs/lizeem-farmlands-design.md`](../lizeem-farmlands-design.md)). The user approved the design and said "go
ahead and implement" on 5 October 2026, and "keep building everything" on 6 October 2026. All five builds of section 8
were made on 6 October 2026 by agents working in parallel by file ownership, each wave wired into the game by an
integrator who settled the discrepancies between them and ran the checks. The design's section 10 ("As built")
records what each build is and where it departs from the text; this file is how to play it, what changed, the
evidence, and what is left.

## Revision

| | |
| --- | --- |
| Base | `57a9de4`, the snapshot of the main checkout's uncommitted work, 2026-10-06 07:18 |
| Delivered | branch `lizeem-farmlands`, twenty commits (listed below); Builds 4 and 5 on top of `469601b` |
| Worktree | the session scratchpad, `azhora-game-farmlands`; clean after the commits apart from the ignored `tests/artifacts/` and `tests/.electron-profiles/` |
| Not done | Not merged, not pushed. |

## For whoever merges

- **The user's decisions are recorded only in the design file**: section 0 (eleven rulings of 5 October 2026, among
  them Rollo, Taleth, the four countries, Ovesos fertile along the river and never orc country, people with
  mythological names and roles, and an economy with buyers in coin), the go-aheads of 5 October ("go ahead and
  implement") and 6 October ("keep building everything"), and `docs/economy.md`'s dated section lifting the "do not
  develop" ruling for this work. **Copy them into `docs/design-answers.md` when merging**: that file is Codex's, and
  this branch has not touched it. The defaults still standing (Taleth hatless, the war touched lightly, the names taken
  literally as mythological) and the open questions of sections 9 and 10 are the user's to settle.
- Nothing was written to `world-builder/azhora_lore`.

## How to play it

**Start.** Choose **Developer Start** on the title screen. You are **Rollo**, a grey-bearded sorcerer of the Guild in a
brown cloak and raised hood, on the forecourt south of the Guild tower in Minora (-2414, 63), with the oak staff and
Fireball. **Taleth** stands a few steps ahead: four topics, the charge (which teaches *Sound the Soil*), the Dividing and
two later charges shown locked. Take the charge; the tracker then carries a card for the quest and one for each country
under way, and the Measure of the River is a page in the journal.

**Caricas** (Build 1). Over the White Bridge: Egeria at the grain court lends the North Farm for the holder's quarter;
Vertumnus explains the rotation and teaches bean pottage and the rye loaf. Rye straight after beans comes up Plain,
which is the lesson; Captain Hagen's quartermaster claims a tenth (hand it over, plead a thin harvest, or let Vertumnus
hide it); Fine rye, Pomona's tart, sealed by Consus, to Taleth for *Call the Dew*. Messor can then be hired at six
copper a game day.

**Nethereum** (Build 2). Over the Pilgrims' Bridge to Haethom at the end of the Sacred Way. Mererid on the levee;
Seithenyn mends the hatch with you (two planks, a piece of salvaged metal); **F** on the meadow side opens it and draws
the water off, at the shine for fine silt. Flood oats and the hay the meadow grows; Boann's three wolves west of her
byre; Fine oats and a second cut at Farming 10; oatcakes from Mererid or smoked fish from Gwyddno's weir (**F** at the
trap) in hand at Fintan's Recall; the dish to Taleth for *Quicken*.

**Nesdor** (Build 3). Ford the Carica at the marked post and take the farm road to Ninehands. Baugi lends the strips:
floodwheat (Farming 8) on the bench, rye on the rise, barley either, nothing on the wet. Reap a strip by walking it from
its end post (**F**); Bolverk's match is lost on foot and won by *The Work of Nine*. The foragers (a quarter, a tenth on
Forseti's paper, or a fight); Fine floodwheat; Aegir's white bread and Idunn's nut cake, sealed, to Taleth for *The Work
of Nine*. Baugi lends the long strip at Farming 24.

**Ovesos** (Build 4). Ford the Neth below Haethom and follow the way east across the upland grass past Lahar's camp to
the divider at the canal's head and down the canal's east bank to Velsorten. Nisaba, at the register house on the
square, enters you as the newest right, with the four plots at the dry tail. Ask Enbilulu, by the divider, how the
water is shared (and about salt, or ask Ashnan). Take seed from a plot's panel, sow barley and silver millet at the tail,
and when the toast says **"Your turn at the divider"**, stand beside the divider's stone and press **F**: it opens on
your measure ("Measure 4/4"), lists each growing plot with its water against its thirst, and gives one, two or three
units at a time ("Leave the rest" to go). Barley wants 2, millet 1, hard wheat 3; more leaves salt. Help Enbilulu clear
the canal head (three stretches, one between turns) and bring in barley of Good or better: the Council moves you up a
turn. Sow hard wheat (Farming 10). Ziusudra's house draws the water out of turn; answer it before the Water Council at
the register house, from Nisaba's register, on Ashnan's witness, or quietly for 40 copper. Bring in Fine hard wheat, have
it ground at Ezina's mill (in her conversation), learn the flatbread from her, bake it at a lit fire, have it sealed by
Nepri or Consus, and give it to Taleth. Ovesos pays in standing: the second turn at the stone, the mill free, and your
name read by Nisaba at the next Harvest Close ("Attend the Harvest Close", which also settles the water dues).

**The Dividing** (Build 5). With all four countries restored, Taleth's "The Dividing" opens and a trestle with four bowls
stands on the forecourt. He teaches fork stew: a bridge rye, a flood oats, a floodwheat or a hard wheat, and a weir fish,
at any lit fire. Bring it to him ("Serve the fork stew and hold the Dividing"): he pours the bowls, Seshat and Nepri
each say a line, and the journal enters "Walker of the Measure" with 1,000 Farming experience.

**The rest of Minora** (Build 5): Manawydan, Njord and Adapa keep the three market stalls by the Temple Way; Hapi the
barge master stands below the River storehouse; Amalthea sells cheese at her hamlet in the hills, out of the Muster Gate
and along the track through the west side of Wilhelm's camp.

**F8.** The **Taleth** card under "Named quest-givers" resets the whole farmlands (the meadow, the weir, any reap, the
canal and the mill with it) and puts you beside Taleth. The scripted walks are `npm run test:lizeem-farmlands` (the
Caricas arc) and `npm run test:lizeem-farms` (Haethom, Ninehands, Velsorten, the hamlet and the forecourt).

## The five builds

- **Build 1: Rollo, Taleth and Caricas.** Rollo (a twelfth playable entry, Developer Start only), the start on the
  forecourt, Taleth and his topics, field sorcery (*Sound the Soil*, *Call the Dew*), rotation, grades and three crops,
  the quest hub and the Measure, the Caricas arc and its fourteen people, the purse, one price table, the market, seals
  and order boards, the market corner.
- **Groundwork for Builds 2 to 5.** Country farming hooks (`registerCountry`, rows, crops and trees), *Quicken* and *The
  Work of Nine*, registered buyers and boards, arcs registered with the hub.
- **Build 2: Nethereum.** Haethom, the levee and hatch, the flood meadow and its silt, the weir and smoke-house, flood
  oats, hay and weir fish, the seven of design 6.4, the wolves and the Recall.
- **Build 3: Nesdor.** Ninehands and its strips, right crop on right ground, reaping by walking a strip, Bolverk's
  match, Idunn's coppice, the inn and the arbiter on the Way, the foragers and the rebellion's paper, the eight of 6.5.
- **Build 4: Ovesos.** The green belt along the Lizeem, Velsorten, the canal and its turns, salt and dues, Ezina's and
  Uttu's mills, Lahar's camp, hard wheat, silver millet and madder, flatbread and porridge, the eight of 6.6, the
  hearing and the Harvest Close.
- **Build 5: the Dividing.** The feast on the forecourt and fork stew; Manawydan, Njord, Adapa, Hapi and Amalthea, which
  places every person of section 6.2; Amalthea's hamlet; the whole Farming ladder of section 4.6 on the skill sheet.

## Files

**Build 1, new**: `src/taleth.js`, `src/lizeem-farmlands.js`, `src/lizeem-people.js`, `src/lizeem-farmlands-checks.js`,
`src/merchants.js`, `src/prices.js`; tests `taleth`, `sorcery-field`, `farming-rotation`, `lizeem-farmlands`,
`lizeem-people`, `merchants`, `prices`. **Changed**: `src/farming.js`, `farming-view.js`, `farming-conversation.js`,
`regional-farmland.js`, `countryside-farming-checks.js`, `cooking.js`, `consumables.js`, `inventory.js`, `economy.js`,
`menora-city.js`, `menora-scenery.js`, `journal-entries.js`, `quest-tracker.js`, `quest-markers.js`,
`player-characters.js`, `characters.js`, `character-select.js`, `minora-opening.js`, `minora-opening-smoke.js`,
`sorcery.js`, `magic.js`, `skills.js`, `skill-icons.js`, `quest-slate.js`, `chapter-one-smoke.js`, `index.html`,
`main.cjs`, `package.json`, `docs/regional-farmland.md`, `docs/economy.md`.

**Builds 2 and 3, new**: `src/nethereum-farm.js`, `nethereum-farm-scenery.js`, `meadow-water.js`,
`nethereum-produce.js`, `lizeem-nethereum.js`, `lizeem-nethereum-people.js`, `nesdor-farm.js`,
`nesdor-farm-scenery.js`, `flats-ground.js`, `lizeem-nesdor.js`, `lizeem-nesdor-people.js`, `lizeem-farms-smoke.js`;
tests `nethereum-farm`, `meadow-water`, `lizeem-nethereum`, `lizeem-nethereum-people`, `nesdor-farm`, `flats-ground`,
`lizeem-nesdor`, `lizeem-nesdor-people`. **Changed**: `src/west-regions-life.js` (mixed line endings kept),
`west-regions-scenery.js`, tests `nethereum-world`, `nesdor-world`.

**Builds 4 and 5, new**: `src/ovesos-farm.js`, `ovesos-farm-scenery.js`, `canal-turns.js`, `ovesos-produce.js`,
`lizeem-ovesos.js`, `lizeem-ovesos-people.js`, `dividing.js`, `dividing-scenery.js`, `lizeem-minora-people.js`,
`isareos-hamlet.js`, `isareos-hamlet-scenery.js`, `docs/lizeem-farmlands-dividing.md` (every line of the Dividing and
of Minora's five, for review); tests `ovesos-farm`, `canal-turns`, `lizeem-ovesos`, `lizeem-ovesos-people`, `dividing`,
`lizeem-minora-people`, `isareos-hamlet`. **Changed by the builders**: `src/oves-world.js`, `oves-scenery.js`,
`farming-view.js` (hard wheat, millet and madder drawn), `taleth.js` (the Dividing topic), `skills.js` (fifteen ladder
lines, CRLF kept), tests `oves-world`, `taleth`, `foods` (fork stew alone may heal 60), and dated notes in
`docs/oves-brief.md` and `docs/six-regions-brief.md`.

**Wiring** (line-ending-preserving edits, each with a dated comment): `src/main.js`, `src/world.js`,
`src/region-world.js`, `src/region-layout.js`, `src/build-status.js`, `src/map-fog.js`, `src/west-regions-scenery.js`,
`src/road-checkpoint.js`, `src/inventory.js`, `src/cooking.js`, `src/consumables.js`, `src/prices.js`,
`tests/test-manifest.json`, `tests/road-checkpoint.test.js`. For Builds 4 and 5:

- `src/world.js`: the `ovesosFarm` build step (region 25, after the Oves's own scatter) and `isareosHamlet` (region 16);
  the canal's banks and carried bed in `heightAt`; Velsorten's ways and the hamlet's track in `paths`; their chart
  names; `world.ovesosFarm` / `world.isareosHamlet`; the mill wheels turned in `update`.
- `src/region-world.js`: Ovesos's subtitle ("The Sorten, the canal and the upland grass"), description, landmarks and
  its eight people; the hamlet among Isareos's landmarks. `src/region-layout.js`, `src/build-status.js` (still 'early',
  listing only what is missing) and `src/map-fog.js` (a Velsorten area; "the only green ground" and "none of them is
  here" removed) say what is built. `src/west-regions-scenery.js` keeps the frontier's scatter off the hamlet.
- `src/main.js`: imports; Velsorten's eight and Minora's five stood up after the trim; the canal (announcing Rollo's
  turn once he is in the register), Ezina's mill and the Ovesos arc beside the other arcs, the Dividing beside the
  kitchen, both registered with the quest; the canal and the arc each frame and the Dividing's props once a second;
  the divider's prompt, its F and its panel, allotting through the arc; the Ovesos plots shut by seniority at the bed and
  to the staff; the Ovesos and Minora conversations; Taleth told of the Dividing, with Ovesos's flatbread and the
  Dividing in his choices (Seshat and Nepri speak their own lines); the save, the restore and the F8 card's reset for
  the canal and the mill; the farms smoke's new hooks.
- `src/road-checkpoint.js`: validators and copies for `canal` and `mill`; the Ovesos arc and the Dividing validated and
  registered on the validating hub; the canal imported (Ovesos's beds and crops) and both people modules (their buyers
  and the register board). All optional: a save from before them loads fresh, and a refused save leaves the last one.
- `src/inventory.js`, `cooking.js`, `consumables.js`: `OVESOS_*` and `DIVIDING_*` spread in. `src/prices.js`: ids
  `silver-millet`, `madder`, `hard-wheat-flour` (kind `flour`), and cloth 8 and mutton 3.
- `tests/test-manifest.json`: the seven new suites. `src/lizeem-farms-smoke.js`: Velsorten, the hamlet and the
  forecourt.

## Settled at integration

**Build 1**: the quest's loaf is `rye-cheese-loaf`; rye after beans comes up Plain and the tracker says so; Seshat
trades (the bounty), Silvanus does not; Consus seals as `consus`; prices and merchants describe food, not supply it;
the people trade through the market's own context.

**Builds 2 and 3**: Bolverk 5 seconds and no margin; *Sound the Soil* reads the strips; hazelnuts graded by the hand
(Fine at 16, Prize at 20); `onHarvest` may return `{ added }`; the staff passes over shut beds; the Nethereum dish line
is the hub's; Seithenyn's minding and Messor's wage are live; the farm view turns a bed by its yaw.

**Builds 4 and 5**:

- `src/farming.js`: a country may register with `judge: 'harvest'`, and the farm then asks it for the fit each time it
  reads a planting instead of keeping the fit judged at sowing (three lines). The canal needs it: its water arrives
  after the seed.
- **Hapi's terms** (`src/merchants.js`): a buyer with a `rate` may keep a finite appetite, `fineOnly` takes only Fine or
  Prize units, and `secondLot: false` sells no second lot. Hapi is registered with all three: sealed Fine or Prize only,
  ten of each good a day, at twice the home price.
- **Nisaba's water right** is sold only at Farming 28 (design 4.6), with her reason given below it.
- Uttu is drawn as a woman, and the scenery comment that called the vats "his" now says "her".
- **The canal's lift** is left as built: the canal's head stands about 3 m above the Lizeem's surface. A question for the
  user (a noria at the divider would explain it).
- The divider is the contract's: outside his turn one line, "The water is going to {holder}; yours in {n} s"; in his turn
  "Measure {left}/{measure}", a choice per growing plot "{plot} · {crop} · {units}/{thirst}", then one to three units
  (no more than are left), and "Leave the rest". The measure shown is what Ziusudra's half turn leaves.
- The canal's turn is announced only once Rollo is in the register, so nobody else's game is told of it every twenty
  minutes.
- `tests/isareos-hamlet.test.js` tells the world's own hamlet (now built by the world) from the copy it lays, so it is
  measured once; `tests/lizeem-minora-people.test.js` checks Hapi's full terms; `tests/lizeem-ovesos*.test.js` check the
  level gate; `tests/prices.test.js` and `tests/merchants.test.js` take the new ids; `tests/road-checkpoint.test.js` has
  a new test (the canal, the mill, the Ovesos arc and the Dividing ride along, refuse corruption, and an older save loads
  fresh).

## Evidence (Builds 4 and 5, 6 October 2026)

Every changed JS file passes `node --check` (44 files). Node suites, one process each with `--test-isolation=none`, up
to four at once:

| suite | result |
| --- | --- |
| The builders' own: `canal-turns`, `farming-countries`, `farming`, `regional-farming`, `lizeem-ovesos`, `lizeem-ovesos-people`, `lizeem-farmlands`, `dividing`, `lizeem-minora-people`, `taleth`, `skills`, `foods` | 14/14, 8/8, 14/14, 4/4, 7/7, 6/6, 26/26, 8/8, 10/10, 11/11, 7/7, 3/3 |
| Scoped and full worlds: `ovesos-farm`, `isareos-hamlet`, `nethereum-farm`, `nesdor-farm`, `oves-world` (full world, once, 347 s) | 9/9, 6/6, 9/9, 11/11, 14/14 |
| `road-checkpoint`, `save-round-trip`, `larder-sources`, `inventory`, `cooking`, `consumables`, `prices`, `merchants`, `tills`, `economy` | 42/42, 4/4, 4/4, 11/11, 5/5, 8/8, 8/8, 26/26, 7/7, 6/6 |
| `menora-city`, `cast`, `lizeem-people`, `sorcery-field`, `farming-rotation`, `magic`, `player-characters`, `game-mode` | 9/9, 6/6, 10/10, 10/10, 12/12, 18/18, 24/24, 10/10 |
| `quest-markers`, `quest-tracker`, `journal-entries`, `quest-destinations`, `skill-sheet`, `skills-browser`, `skill-announcement` | 21/21, 11/11, 11/11, 3/3, 2/2, 5/5, 4/4 |
| Builds 2 and 3's: `flats-ground`, `meadow-water`, `lizeem-nethereum`, `lizeem-nethereum-people`, `lizeem-nesdor`, `lizeem-nesdor-people`, `world-map-detail`, `west-rivers` | 9/9, 14/14, 7/7, 5/5, 13/13, 9/9, 19/19, 5/5 |
| Build 1's: `spider-quest`, `sunflower-lesson`, `regional-farmland`, `chapter-one`, `telemonia-people`, `companions`, `first-contact`, `found-weapons`, `long-road-clock`, `smith`, `story-spine`, `field-card`, `death-lifecycle`, `mercenaries`, `weapons`, `weapon-feel`, `gear` | all pass |
| Touching the edited shared modules: `build-status`, `region-survey`, `developer-atlas`, `minimap`, `fishing-lessons` | 4/4, 4/4, 7/7, 16/16, 5/5 |

**Red before this work** (same tests, same messages):

- Confirmed on the base `main.js` in this run: `frame-errors` 1, `prompt-priority` 1, `shield-guard` 2, `rebel-crew` 1,
  `combat-skills` 1, `session-clock` 1, `review-quiet` 1.
- As in the earlier builds' runs: `long-road` 2 (the troupe camp), `map-fog` 1 ("Selemis is only 55% inside Selemi";
  the test stops there, so Velsorten's new area was measured separately by its rules: wholly inside Ovesos, 100% of its
  disc, clear of every other area), `testing-travel` 1 ("Acor Wetlands · The Acor Reedwater", the only place listed),
  `caricas-world` 1 ("the chart knows caricas-farms").
- Seen for the first time in these runs, in things this work does not touch: `region-layout` 1 and `isareos-world` 1
  (the world is 73.2 hexes wide: the world-width pin `nethereum-world` already fails), `isareos-world` 2 more (west-ground
  and world-terrain disagree by 4.19 m, a terrain sample; "the chart knows menora", while the world charts Minora as
  `menora-city`), `languages` 1 ("East Ibenwood has no tongue"), `fire-making` 1 (Martin's hair is `short-cropped`
  where the test wants `cropped`).

**Not run**: `eer-world` (stopped at 200 s, over the three minutes allowed), `nethereum-world`, `nesdor-world` and
`gala-world` (as asked), `world-scale` (eighteen minutes), and never the full suite.

**Electron** (Fast load, isolated profile, Electron from `world-builder/map/node_modules` through the scratchpad copy of
`scripts/launch.cjs`; nothing outside the worktree edited; one at a time):

| run | result |
| --- | --- |
| 1. `--minora-opening-checks --fast-load` | **Passed**: 35 checks before the reload and 18 after, no console errors, no frame errors. Developer Start, Rollo, Taleth's choices (the Dividing now among the locked), saving and Continue unchanged. |
| 2. `--lizeem-farms-checks --fast-load`, extended | **Passed on its first run**, 38 s of checks, no console errors, no frame errors. Haethom (62 checks): the broken hatch's prompt, mended, opened, the shine, the draw-off with fine silt on all twelve beds and hay on eight, the weir hauled. Ninehands (68): the bench strip reaped by walking it, 7.15 s, six barley. Velsorten (62): the scenery, the canal running, twelve plots drawn, the eight people on their stands; the divider's prompt outside his turn ("The divider · the water is going to the head farms · yours in 491 s"); entered at the tail, the clock moved on to his turn, the turn announced with its measure of four; a tail plot sown with barley and given two units with F through the panel (two of two, fit 2, two units left, the panel back on "Measure 2/4"). The hamlet (5): built, Amalthea on her stand, F opens her talk with Trade among her choices. The forecourt (3): the trestle out through the developer hook, solid, then hidden and out of the way. The smoke was hardened after Build 3's failed run and not run again until now. |
| 3. | Not needed. |

Screenshots in `tests/artifacts/`: `lizeem-farms-velsorten.png`, `lizeem-farms-velsorten-mill.png`,
`lizeem-farms-velsorten-divider.png` (the stone, its sluice frames, Enbilulu and his hut, the footbridge, the prompt),
`lizeem-farms-amalthea-hamlet.png`, `lizeem-farms-dividing-forecourt.png` (the camera is behind the traveller, so the
trestle shows beside him rather than in full), and the Haethom and Ninehands set. The smoke plays as the road-skill
traveller, not as Rollo.

Builds 1 to 3's own evidence (their suites, the Minora smoke's two runs and the first farms smoke) is in the earlier
revisions of this file (`git show 469601b:docs/region-reviews/lizeem-farmlands-handoff.md`).

## Open items

**For the user**

1. **The canal's lift.** The head stands about 3 m above the Lizeem; a noria at the divider would explain it. Left as
   built.
2. **The looks.** Every person of all five builds wears the design's look in the figure kit's words; none has the user's
   approval, nor have Velsorten, the hamlet or the trestle. Ninkasi has the kit's short curls; Uttu is a woman.
3. **Seed-saving** (Farming 20) is listed "to come": the farm has no hook for the next sowing's grade.
4. **The first cut of hay** in Nethereum is still not gated at Farming 5; the ladder lists it there.
5. **Barley at the tail** ripens in one turn's length (240 s), so it must be sown at, or just before, the start of
   Rollo's turn to be given any water. Longer barley, or longer turns?
6. The war (design question 1), the names (question 2) and Taleth's hat (question 3) are still open.

**For review**

- The Harvest Close is held whenever Rollo asks Nisaba for it; the game has no seasons for the lore's three a year.
- Seshat and Nepri speak at the Dividing from wherever they stand; the places by the trestle are not used.
- The canal always shows water (some right's turn is always on); its `dry` state is unused.
- Adapa sells hard-wheat flour at 3 in Minora, where Njord pays 4.5 for it (kind `flour`) and Portunus buys it as a
  west-bank good: a small resale margin, as Manawydan's smoked fish already has with Portunus.
- `src/build-status.js` still describes Nethereum, Nesdor and Caricas as terrain only; Nesdor's region record lists
  nobody (the Eer test pins it); `nethereum-world` and `nesdor-world` have not been run since Builds 2 and 3.
- From Build 1: the free-roam objective still reads "Speak with the Master Sorcerer" after the charge; a recipe is
  recorded with the quest even if the kitchen refuses (Developer Start knows every skill); a Prize at the seal is
  reachable only through the market's API; the second farmstead is offered in words only; the tools and charcoal do
  nothing yet; Silvanus's barter; leaving a Rollo game for the Tutorial keeps his spell and staff.
- From Builds 2 and 3: reaping a strip gives focus back per bed; no F8 card per arc (the Taleth card resets them all).

## Numbers to tune

All first pass. Builds 4 and 5's are also tabled in the design's section 10.

| what | value | where |
| --- | --- | --- |
| Caricas crops | bridge rye 240 s, 30 XP; field beans 150 s, 26 XP; soft fruit 300 s, 40 XP, level 3; yield 2 | `src/farming.js` |
| Heart and fit | heart 0 to 3, fresh 2; grain and fruit -1, beans +1, bare +1 a game day; lean [1, 2, 2, 0], rich [0, 0, 1, 2]; same crop twice 0 | `src/farming.js` |
| Grades | experience Plain x1, Good x1.25, Fine x1.5, Prize x2; price 1 / 1.5 / 2 / 3 | `GRADE_XP`, `GRADES` |
| Quest lumps | 150, 200, 300, 400, then 1,000, in each country; the Dividing 1,000 | the arcs, `DIVIDING_XP` |
| Shares | the holder's quarter (Caricas); the levee tenth, waived a day for levee work (Nethereum); none (Nesdor); water dues, a measure of grain per 10 units, millet exempt (Ovesos) | the arcs, `src/canal-turns.js` |
| Field sorcery | Sound the Soil 5 focus, 6 m; Call the Dew 20 focus, 40 m; 4 focus back a harvest | `src/sorcery.js` |
| Place and appetite | home 1, city 1.5, far bank 2; second lot 0.6; commissary 0.6, unlimited; barge x2, ten a good, Fine sealed only | `src/prices.js`, buyers |
| Seal, orders | a twentieth of 20 or more, else 1 copper; three orders a board a day at x1.5, 2 Farming XP a copper | `TRADE_RATES` |
| Nethereum | flood oats 240 s, 30 XP; hay 180 s, 35 XP; blackwater 180 s, shine 240 s; deep plots at 16; weir 3 fish a day (5 at Fishing 5) | `src/meadow-water.js`, `src/nethereum-produce.js` |
| Nesdor | floodwheat 360 s, 60 XP, level 8; coppice 12, again in 600 s; 2 s a bed reaped, Bolverk 5 s; long strip 24; foragers a quarter, or a tenth on 3 copper of paper | `src/flats-ground.js`, `src/lizeem-nesdor.js` |
| Ovesos crops | hard wheat 360 s, 60 XP, level 10, yield 2; silver millet 150 s, 24 XP, level 1, yield 3; madder 480 s, 70 XP, level 18, yield 2 | `src/ovesos-produce.js` |
| The canal | 240 s a turn, five rights, 1,200 s a round; measure 3 + seniority (4 to 8); thirst hard wheat 3, barley 2, madder 2, millet 1; exact 2, one short 1, else 0; salt rests out in 1,440 s | `src/canal-turns.js` |
| Mill, Close, rights | 2 sheaves a measure, the 16th the toll; a day on the head writes off a measure, up to 30; settling 40; Ashnan's dues 30; a right 1,500 at Farming 28; plots tail 1, middle 3, head 5; reward seniority 4 | `src/canal-turns.js`, `src/lizeem-ovesos.js` |
| Dishes | rye loaf 25, pottage 40, tart 45, oatcakes 25, smoked fish 40, white bread 35, nut cake 50, flatbread 30, porridge 30, mutton 25, fork stew 60 (Fine forms +10, at most 50, fork stew apart) | `src/consumables.js` and the produce modules |
| Base prices | rye, beans, barley, oats, silver millet 1; fruit, hazelnuts, floodwheat, hard wheat, hay, fish 2; hard-wheat flour 3; madder 4; flatbread 4, porridge 2, fork stew 12; cloth 8, mutton 3 | `src/prices.js` |
| Appetites a day | Nepri 30, Portunus 20, Consus 24, Pomona 12, Satet 8; Gwyddno 12; Boann 24 + 12; Aegir 8 + 12; Egil 24 + 12; Byggvir 24; Ezina 24; Ninkasi 24; Uttu 12; Lahar 12 + 12; Manawydan 20; Njord 12; Adapa 20; Hapi 10 a good; Amalthea 12 | the people modules |
| Ovesos belt | full green within 45 m of the Lizeem, none past 165 m (30 / 120 m in the south; the Neth 22 / 100 m) | `src/oves-world.js` |

## Commits

| commit | subject |
| --- | --- |
| `b2cd175` | Farming: rotation, grades and the Caricas crops |
| `46760d8` | Economy: the purse, one price table and the Lizeem market |
| `546bf8c` | Farmlands of the Lizeem: Taleth's charge, the Caricas arc and its people |
| `b47bb02` | Rollo, Taleth and field sorcery |
| `2230817` | Wire Build 1 of the Farmlands of the Lizeem into the game |
| `836f87c` | Hand off Build 1 of the Farmlands of the Lizeem |
| `360907f` | Groundwork for Builds 2 to 5 of the Farmlands of the Lizeem |
| `7bba42b` | Wire the Lizeem groundwork into the game |
| `4652d15` | Nethereum scenery: Haethom, the levee, the meadow and the weir |
| `f76c7c0` | Nesdor scenery: Ninehands, the strips, the hazel wood and the Way |
| `2d468ce` | The flood meadow and the Flats: timing the water, right crop on right ground |
| `d81cca0` | Nethereum and Nesdor arcs and their people |
| `bf39d28` | Wire Builds 2 and 3 of the Farmlands of the Lizeem into the game |
| `469601b` | Hand off Builds 2 and 3 of the Farmlands of the Lizeem |
| `3db8970` | Ovesos scenery: the green belt, Velsorten, the canal and Lahar's camp |
| `32b13b5` | The Velsorten canal and Ezina's mill: sharing the water |
| `685f9b8` | The Ovesos arc and the people of Velsorten |
| `7a1aaf9` | The Dividing, the rest of Minora, Amalthea's hamlet and the Farming ladder |
| `b47cfc7` | Wire Builds 4 and 5 of the Farmlands of the Lizeem into the game |
| this report | Hand off the Farmlands of the Lizeem, Builds 1 to 5 |

## Next action

Codex review and merge, with the user's decisions copied into `docs/design-answers.md`. Then the user's playtest from
Developer Start, his word on the looks, the numbers and the open questions above, and on whether to add the noria.
