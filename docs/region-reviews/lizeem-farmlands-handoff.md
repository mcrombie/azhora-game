# The Farmlands of the Lizeem, Builds 1 to 3: handoff

Not a queue row and not a region: Build 1 of the Farmlands of the Lizeem, the user's design of 5 October 2026
([`docs/lizeem-farmlands-design.md`](../lizeem-farmlands-design.md), section 8, "Build 1: Rollo, Taleth and Caricas").
The user approved the design and said "go ahead and implement" on 5 October 2026. Four agents built it in parallel by
file ownership (the farming mechanics; the economy and market; the quest, the Measure and the people; Rollo, Taleth and
field sorcery), and an integrator wired it into the files they were not allowed to touch, applied the cross-agent fixes
and ran the tests on 6 October 2026.

## Revision

| | |
| --- | --- |
| Base | `57a9de4`, the snapshot of the main checkout's uncommitted work, 2026-10-06 07:18 |
| Delivered | branch `lizeem-farmlands`, six commits (listed below) |
| Worktree | the session scratchpad, `azhora-game-farmlands`; clean after the commits apart from the ignored `tests/artifacts/` |
| Not done | Not merged, not pushed. |

## How to play it

1. Launch, and choose **Developer Start** on the title screen. You are **Rollo**, a grey-bearded sorcerer of the Guild
   in a brown cloak and raised hood, on the forecourt south of the Guild tower in Minora (-2414, 63), facing its door.
   He carries the oak staff and nothing else, and knows Fireball.
2. The first objective is "Speak with the Master Sorcerer". **Taleth** stands a few steps ahead and to the right.
   Four topics (the Guild and the tower, the river, the war in the valley, sorcery), the charge, and two later charges
   shown locked. Taking the charge teaches *Sound the Soil*.
3. Cross the White Bridge to Caricas. Egeria, the Voice of the Council, at the grain court, lends the North Farm for the
   holder's quarter. Vertumnus, the fox-keeper elder, explains the rotation and teaches bean pottage and the rye loaf.
4. Bring in two beds of bridge rye and two of field beans on the North fields (three beds, so two rounds), then sow rye
   where the beans grew. It comes up Plain: the beans leave the ground too rich for rye, which is the lesson.
5. Captain Hagen's quartermaster claims a tenth for Cedric's granary: hand it over at the watch-house, tell Hagen the
   harvest was thin, or let Vertumnus hide it for the families in the upland.
6. Bring in Fine rye (fresh ground, watered, at the level the quest's experience lumps have paid for), learn the tart
   from Pomona at the east orchard, bake it, have Consus seal it at the grain court (one copper), and carry it to Taleth.
7. Taleth teaches *Call the Dew*. Messor the reaper comes back to the North Farm and can be hired. Fine food laid before
   Seshat in the Guild Library fills the Caricas leaf of the Measure in the journal.

**F8 (the testing menu)**: the **Taleth** card under "Named quest-givers" resets the charge and puts you beside Taleth
to play the arc by hand. The scripted walk through the whole arc is the smoke flag `--lizeem-farmlands-checks`
(`npm run test:lizeem-farmlands`).

## What Build 1 contains

- **Rollo** (`src/player-characters.js`, `src/characters.js`, `src/character-select.js`): a twelfth playable entry
  flagged `developerOnly`, kept off the Chapter 1 line; two new kit parts (the raised hood with its own colour, and the
  long cloak); the oak staff equipped, the boot sword taken away, Fireball learned at creation. Ben's Fireball lesson is
  greyed out ("You already know Fireball.") for anyone who knows it.
- **The start** (`src/minora-opening.js`): `MINORA_START` on the tower forecourt with its own camera pitch, the new
  first objective, the opening note on the title screen, and the Minora opening smoke extended to Rollo and Taleth.
- **Taleth** (`src/taleth.js`): his figure (bare-headed, midnight-blue robe), five topics, the charge, two locked
  charges, and *Sound the Soil* when the charge is taken.
- **Field sorcery** (`src/sorcery.js`, `src/magic.js`, `src/skills.js`): a fourth released school. *Sound the Soil*
  reads the nearest bed within 6 m through `describeBed`; *Call the Dew* waters every growing bed within 40 m. Neither
  costs focus when there is nothing to work on. A harvest gives 4 focus back.
- **Farming** (`src/farming.js` and its view and conversation): rotation on the 17 Caricas beds (each bed's heart,
  0 to 3, and its last crop); grades Plain, Good, Fine and Prize, with Fine and Prize coming in as a `-fine` item;
  the fox's regard; three Caricas-only crops (bridge rye, field beans, soft fruit) and their seed; three dishes and their
  fine forms (`rye-cheese-loaf`, `bean-pottage`, `soft-fruit-tart`); `onHarvest` for shares in kind; farming save
  section version 2 (a version 1 save loads with every bed at heart 2).
- **The quest** (`src/lizeem-farmlands.js`): the hub (unmet, offered, accepted), the Caricas arc in nine stages, the
  holder's quarter and the garrison's tenth taken at harvest, experience lumps of 150, 200, 300, 400 and 1,000 paid once
  each, the Measure of the River (four leaves, Caricas the only one walkable), the tracker card, the journal entry for a
  restored Caricas, and green-book markers on whoever holds the next step. Added to `LIVE` in `src/quest-slate.js`.
- **The people** (`src/lizeem-people.js`): fourteen, with the design's looks and nobody in a hat. Minora: Seshat,
  Nepri, Portunus, Rudiger, Imhotep, Satet. Caricas: Vertumnus, Egeria, Consus, Hagen (armed, a soldier), Ilmarinen,
  Pomona, Silvanus, and Messor, hidden until Caricas is restored. Stood up after the cast trim, as the Telemon are.
- **Money** (`src/economy.js`, `src/prices.js`, `src/merchants.js`): the purse helpers, one price table with grade,
  place and appetite, and eight buyers (Nepri, Portunus, Rudiger, Consus, Pomona, Ilmarinen, Seshat's bounty, Satet's
  kitchen) behind one trade dialogue; the measurer's seal; order boards at the Measure House and the grain court;
  Ilmarinen's twelve farm tools and the factor's charcoal as satchel items. `docs/economy.md` records that the user
  lifted his "do not develop" ruling for this work on 5 October 2026.
- **The market corner** (`src/menora-city.js`, `src/menora-scenery.js`): four factors' stalls by the Temple Way;
  Portunus keeps the Carican one, and the other three wait for later builds.

## Files

**New**: `src/taleth.js`, `src/lizeem-farmlands.js`, `src/lizeem-people.js`, `src/lizeem-farmlands-checks.js`,
`src/merchants.js`, `src/prices.js`; tests `taleth`, `sorcery-field`, `farming-rotation`, `lizeem-farmlands`,
`lizeem-people`, `merchants`, `prices`; this report.

**Changed by the builders**: `src/farming.js`, `src/farming-view.js`, `src/farming-conversation.js`,
`src/regional-farmland.js`, `src/countryside-farming-checks.js`, `src/cooking.js`, `src/consumables.js`,
`src/inventory.js`, `src/economy.js`, `src/menora-city.js`, `src/menora-scenery.js`, `src/journal-entries.js`,
`src/quest-tracker.js`, `src/quest-markers.js`, `src/player-characters.js`, `src/characters.js`,
`src/character-select.js`, `src/minora-opening.js`, `src/minora-opening-smoke.js`, `src/sorcery.js`, `src/magic.js`,
`src/skills.js`, `src/skill-icons.js`, `docs/regional-farmland.md`; tests `farming`, `cooking`, `economy`,
`larder-sources`, `menora-city`, `nesdor-world` (Caricas may now list the farmlands' people), `player-characters`,
`skills`, `skill-sheet`, `skills-browser`, `spider-quest`, `game-mode` (count pins for the seventh sorcery school).

**Wiring** (line-ending-preserving edits, each with a dated comment):

- `src/main.js`, sixteen small hunks: imports; Taleth and the fourteen people stood up after the trim; Rollo's kit and
  spell in `grantStartingKit`; the farm's clock, a grade on the harvest toast and focus back after a harvest; the market,
  the quest and `placeLizeemHands` made beside the farm; `farming` and the clock for `createMagic`, and the
  `field-working` toast; Developer Start as Rollo with `MINORA_START.pitch`; the tracker, the journal, the save and the
  restore; Taleth's and the people's conversations; Ben's lesson disabled when known; the F8 card; the markers; the
  `runLizeemFarmlandsChecks` and Minora smoke hooks.
- `index.html` (the opening note, the F8 card), `main.cjs` (`--lizeem-farmlands-checks`), `package.json`
  (`test:lizeem-farmlands`).
- `src/road-checkpoint.js`: validators and explicit copies for `lizeemFarmlands` (normalised through the quest) and
  `merchants` (copied as written, because its appetites and orders are dated by game day). Both are optional: a save
  from before them restores with fresh defaults.
- `src/quest-slate.js` (`LIVE`), `src/inventory.js` (`...MERCHANT_ITEMS`), `src/skills.js` (Farming unlock lines for
  the three crops), `src/chapter-one-smoke.js` (`COMPANY_PLAYABLE`: twelve playable, eleven tiles),
  `tests/test-manifest.json` (the seven new suites).

**Cross-agent fixes made at integration**:

- The quest's rye loaf is `rye-cheese-loaf`, the Caricas loaf the kitchen registers, not Wendel's mill loaf `rye-loaf`.
- The swap step no longer promises Good rye on the bean ground. Vertumnus, the tracker and the module header now say
  what the farming rules do: rye straight after beans comes up Plain, and the Fine rotation is beans, a day's rest,
  fruit or barley, then rye. The design's step 2 carries a dated note.
- Seshat is a trader, so the Guild's bounty can be claimed through her. Silvanus is not (his barter is not in this
  build); offered a dish, he says why not.
- Consus seals the tart as `consus` (`merchants.seal(tart, 1, { by: 'consus' })`, already so in the people's module).
- `tests/larder-sources.test.js` counts `prices.js` and `merchants.js` as describers of food, not sources of it.
- `docs/economy.md` has a dated section for the 5 October ruling.
- Where the builders' wiring differed, the simpler working version was taken: the people's trade uses the market's own
  context (refresh, sound and save after a trade; "That is all" returns to the person), not a bare one; Taleth's tart
  hand-in comes through his own `extraChoices`; the quest asks for `magic.learn` through a small facade, because magic is
  made two and a half thousand lines after the farm; the F8 card is a manual playtest, since the scripted driver needs the
  `?test=1` hooks.

## Evidence

Every changed JS file passes `node --check`. Node suites, one process each, run on the integrated tree:

| suite | result |
| --- | --- |
| `taleth`, `sorcery-field`, `farming-rotation`, `lizeem-farmlands`, `prices` | 10/10, 7/7, 12/12, 20/20, 8/8 |
| `lizeem-people` (measures each person on the built world), `merchants` | 10/10, 23/23 |
| `road-checkpoint` (with a new test: both sections ride along, refuse corruption, and an older save loads fresh) | 40/40 |
| `save-round-trip`, `quest-markers`, `quest-tracker`, `journal-entries`, `quest-destinations`, `cast` | 4/4, 21/21, 11/11, 11/11, 3/3, 6/6 |
| `tills`, `economy`, `larder-sources`, `inventory`, `consumables`, `foods`, `cooking` | 7/7, 6/6, 4/4, 11/11, 8/8, 3/3, 5/5 |
| `skills`, `skill-sheet`, `skills-browser`, `skill-announcement`, `game-mode`, `player-characters`, `magic` | 7/7, 2/2, 5/5, 4/4, 10/10, 24/24, 18/18 |
| `spider-quest`, `sunflower-lesson`, `farming`, `regional-farmland`, `regional-farming` | 13/13, 7/7, 14/14, 4/4, 4/4 |
| `menora-city`, `chapter-one`, `telemonia-people` | 9/9, 6/6, 10/10 |
| `companions`, `first-contact`, `found-weapons`, `long-road-clock`, `smith`, `story-spine`, `field-card`, `death-lifecycle`, `mercenaries`, `weapons`, `weapon-feel`, `gear` | all pass |

**Red before this work** (the same tests fail with the same messages on an extracted copy of `57a9de4`):
`frame-errors` 1, `prompt-priority` 1, `shield-guard` 2, `rebel-crew` 1, `combat-skills` 1, `long-road` 2 (the troupe
camp), `session-clock` 1, `review-quiet` 1, `opening-sequence` 3 (the boat at its berth, the pier walk, and `if(autopilot.active)skipOpening()`, which `src/main.js` no longer has). `nesdor-world` (seven minutes) was not run;
its builder reports the edited Caricas assertion passing and "Every hex of the Flats is honest ground" failing by
1.22 m in Nesdor, which no file here touches.

**Electron** (fast load, isolated profile):

Electron came from `world-builder/map/node_modules` through a scratchpad copy of `scripts/launch.cjs`, because this
worktree does not sit beside `world-builder`; nothing outside the worktree was edited.

| run | result |
| --- | --- |
| 1. `--minora-opening-checks --fast-load` | Failed at "Taleth offers taleth-guild": his greeting is two lines and the hub's choices are drawn only on the last line, which the builder's added check did not read on to. The smoke now clicks on to the choices (`src/minora-opening-smoke.js`). |
| 2. the same, after the fix | Passed: 35 checks before the reload and 18 after, no console errors, no frame errors. Rollo on the forecourt with the oak staff, 24 copper and Fireball; the camera behind him; "Speak with the Master Sorcerer"; Taleth's five choices and two locked charges; saving, exiting, Continue in a fresh renderer, recruitment and the tutorial unchanged. Screenshots `tests/artifacts/minora-start.png` and `minora-taleth.png`. |
| `--lizeem-farmlands-checks` | **Not run.** It needs a launch of its own (the smoke flags choose one entry point each), and the integration was held to two Electron runs. It is the first thing to run in review, about the length of a Full start plus a few minutes; `npm run test:lizeem-farmlands`. |

## What is deliberately not in this build

- The other three arcs (Nethereum, Nesdor, Ovesos) and their crops, people, workings (*Quicken*, *The Work of Nine*)
  and buyers. Their leaves of the Measure are listed as "not yet walked"; their three market stalls stand empty.
- The Dividing, and Taleth's later charges (shown locked).
- Silvanus's barter (dishes for herbs "as consideration").
- Fine-dish healing above 50: `tests/foods.test.js` holds every food at 50 or less, so the fine tart heals 50, not 55,
  and fine pottage 50.
- Messor's wage: he can be hired, and nothing yet charges the 6 copper a day or makes him reap.
- A Prize at the seal: a Prize harvest comes in as the fine kind, and nothing in play yet marks a sealed lot as Prize,
  so the Measure's gold lines and Seshat's 20-copper bounty are reachable only through the market's API.
- The second farmstead: offered in words when Caricas is restored, not yet for sale.
- Hired hands, tools that change a farm act (the tools are sold and do nothing yet), charcoal with a use, Cedric's
  scrip, and haggling, weight and spoilage (design 7.11).

## Open points for review

- After the charge is taken, the free-roam objective still reads "Speak with the Master Sorcerer"; the tracker shows
  the farmlands card beside it.
- Learning a Caricas recipe from Vertumnus or Pomona records it with the quest even if the kitchen refuses (no Fire
  Making and no Cooking); Developer Start knows every skill, so Rollo is never refused.
- Oatcakes are priced at 3 and Wendel sells them at 2, so they can be resold at a profit. Wendel is trimmed from the cast,
  so it is harmless now.
- The user's decisions of 5 October are still recorded only in the design file, not yet in `docs/design-answers.md`.
- Lore: nothing was written to `world-builder/azhora_lore` for this build.
- Leaving a Rollo game for the menu and starting the Tutorial in the same session gives Cromb the sword back but leaves
  Rollo's Fireball and staff, as every other spell and item already carries over; a fresh launch is clean.
- The scripted playtest warps to Egeria before it reads her marker (markers draw within 180 m), and its `visit` lands
  1.3 m beside each person; if a stall collider is in the way there, give `visit` a clear approach.

## First-pass numbers to tune

| what | value | where |
| --- | --- | --- |
| Crops | bridge rye 240 s, 30 XP, level 1; field beans 150 s, 26 XP, level 1; soft fruit 300 s, 40 XP, level 3; yield 2 | `src/farming.js` `CROPS` |
| Heart | 0 to 3, fresh 2; grain and fruit -1, beans +1, a bare bed +1 a game day (1,440 play-seconds) | `src/farming.js` |
| Fit by heart | lean [1, 2, 2, 0], rich [0, 0, 1, 2], any [0, 0, 0, 1]; same crop twice: 0 | `FIT` |
| Grade experience | Plain x1, Good x1.25, Fine x1.5, Prize x2 | `GRADE_XP` |
| The fox's regard | one Caricas sowing in six | `foxRegards` |
| Quest lumps | 150, 200, 300, 400, then 1,000 for the tart | `LIZEEM_XP` |
| Shares | the holder's quarter on every Caricas bed while leased; the garrison's tenth through the claim and the Fine rye, unless hidden | `SHARES` |
| Dishes | rye loaf 25 (fine 35), pottage 40 (fine 50), tart 45 (fine 50); recipe XP 25 to 50 | `src/cooking.js`, `src/consumables.js` |
| Field sorcery | Sound the Soil 5 focus (3 at level 99), 6 m, 10 XP; Call the Dew 20 focus (12), 40 m, 6 XP a bed; 4 focus back per harvest | `src/sorcery.js` |
| Base prices | rye, beans, barley 1; soft fruit 2; loaf 3, pottage 4, tart 7 | `src/prices.js` |
| Multipliers | grade 1 / 1.5 / 2 / 3; place home 1, city 1.5, far bank 2; second lot 0.6; commissary 0.6 of home, unlimited | `GRADES`, `PLACE_RATES`, `TRADE_RATES` |
| Appetites a game day | Nepri 30 (sealed grain only), Portunus 20, Consus 24, Pomona 12, Satet 8 | `BUYERS` |
| Seal | a twentieth of a lot of 20 or more, else 1 copper | `TRADE_RATES` |
| Orders | three a board a day; half again the market price; 2 Farming XP per copper; each fill raises the buyer's appetite a quarter, up to double | `ORDER_BOARDS`, `TRADE_RATES` |
| Seed, tools, bounty | a packet of four seeds 2; tools 12, 35, 120; charcoal 2; the first Prize of a food 20 | `src/merchants.js`, `TRADE_RATES` |

## Commits

| commit | subject |
| --- | --- |
| `b2cd175` | Farming: rotation, grades and the Caricas crops |
| `46760d8` | Economy: the purse, one price table and the Lizeem market |
| `546bf8c` | Farmlands of the Lizeem: Taleth's charge, the Caricas arc and its people |
| `b47bb02` | Rollo, Taleth and field sorcery |
| `2230817` | Wire Build 1 of the Farmlands of the Lizeem into the game |
| this report | Hand off Build 1 of the Farmlands of the Lizeem |

## Next action

Codex review. Then the user's playtest of the Caricas arc from Developer Start, and his word on the numbers above before
Build 2 (Nethereum).

---

# Builds 2 and 3: Nethereum and Nesdor (6 October 2026)

The user's "keep building everything" (6 October 2026) took the design on to Nethereum (section 5.2, Build 2) and
Nesdor (section 5.3, Build 3). The groundwork for Builds 2 to 5 (country farming hooks, *Quicken* and *The Work of
Nine*, registered buyers and boards, arcs registered with the hub) was committed first (`360907f`, `7bba42b`). Six
agents then built the two countries in parallel by file ownership (Nethereum's scenery, Nesdor's scenery, the meadow,
the Flats, and the two arcs with their people), and an integrator wired them in, settled the discrepancies between
them and ran the checks. The design's dated section 10 records what was built and where it departs from the text.

| | |
| --- | --- |
| Base | `7bba42b` (the groundwork wired) |
| Delivered | branch `lizeem-farmlands`, six commits (listed below) |
| Not done | Not merged, not pushed. |

## How to play them

From Developer Start, take Taleth's charge (Build 1); each country's arc then waits for you.

**Nethereum.** Cross the Isa by the Pilgrims' Bridge and follow the Sacred Way to its end at Haethom. Mererid is on the
levee above the meadow. Seithenyn, by the hatch, mends it with you for two planks and a piece of salvaged metal. Ask
Mererid about the water; then, from the meadow side of the hatch, **F** opens it ("Open the meadow hatch"), and **F**
again draws the water off ("Draw the water off · Siltshine"): at the shine for fine silt, three minutes after opening.
Sow flood oats from the seed bench at the meadow's head and cut the hay the meadow grows. Boann sends for you: three
wolves on the rim pasture west of her byre (back east toward the levee to leave the fight). Bring in Fine oats and a
second cut (Farming 10), learn oatcakes from Mererid and smoked fish from Gwyddno at the weir (haul the trap with **F**
at its head on the bank), stand at Fintan's Recall on the levee's head with both in hand, and carry the dish (and,
if you ask, the name Ceridwen) to Taleth for *Quicken*.

**Nesdor.** Ford the Carica at the marked post east of Caricas and take the farm road down the valley head to Ninehands. Baugi
lends the strips. Read them with *Sound the Soil* or ask him, and sow a whole strip each of floodwheat (Farming 8) on
the bench, barley, and rye on the rise; the wet strip is the trap. Reap a ripe strip by walking it: **F** at its end
post ("Reap the bench strip · 6 seconds"), then stay on the strip; Bolverk's match is lost on foot and won by the Work
of Nine. Answer the foragers through Baugi (Forseti writes the three-copper paper at the end of the Way), bring in Fine
floodwheat, learn the white bread from Aegir and the nut cake from Idunn, have both sealed by Nepri or Consus, and give
them to Taleth for *The Work of Nine*. Baugi lends his long strip at Farming 24.

## Files

**New** (the builders'): `src/nethereum-farm.js`, `src/nethereum-farm-scenery.js`, `src/meadow-water.js`,
`src/nethereum-produce.js`, `src/lizeem-nethereum.js`, `src/lizeem-nethereum-people.js`; `src/nesdor-farm.js`,
`src/nesdor-farm-scenery.js`, `src/flats-ground.js`, `src/lizeem-nesdor.js`, `src/lizeem-nesdor-people.js`; tests
`nethereum-farm`, `meadow-water`, `lizeem-nethereum`, `lizeem-nethereum-people`, `nesdor-farm`, `flats-ground`,
`lizeem-nesdor`, `lizeem-nesdor-people`. The integrator's: `src/lizeem-farms-smoke.js` (the Electron smoke).

**Changed by the builders**: `src/farming-view.js` (flood oats, hay and floodwheat drawn), `src/west-regions-life.js`
(the rim hares moved off Haethom; mixed line endings kept), `src/west-regions-scenery.js` (Haethom kept clear of
scatter), `tests/nethereum-world.test.js` and `tests/nesdor-world.test.js` (the countries may now hold their own
people and chart names).

**Wiring** (line-ending-preserving edits, each with a dated comment):

- `src/world.js`: the two scenery build steps (`nethereumFarm`, region 17, with the hatch and meadow water remembered
  until Fast mode has built the region; `nesdorFarm`, region 14), the levee and Liban's hummock in `heightAt`, both
  countries' paths, their chart names, and `world.nethereumFarm` / `world.nesdorFarm`.
- `src/region-world.js`: the new landmarks for both, Nethereum's seven in its `npcIds`, the comments. Nesdor's `npcIds`
  stay empty: `tests/eer-world.test.js` holds Nesdor, like Caricas, to placing nobody itself.
- `src/main.js`: imports; the fifteen people after the trim; Nesdor's farming registered before the farm is drawn; the
  meadow, the weir, the reaping and both arcs made beside the quest and registered with it; the meadow, the arc's clock
  and the scenery's hatch and water each frame; a strip being reaped (stopped by a fight, the saddle, water, a climb or
  stepping off the strip); the hatch, weir and strip-end prompts and their F actions, each taking priority over the bed
  beside it and over anybody standing farther off (Seithenyn at the hatch, Bolverk at the bench strip); the long strip
  and the deep plots shut at the bed; *Sound the Soil* reading the strips for Baugi, and the Work of Nine reported to
  Bolverk's match; the conversations, the wolves' and foragers' fights, Taleth's two hand-ins; a Prize hazel picking
  written in the Measure; the save (`meadow`, `weir`), the restore (no reap, the long strip shut until the arc says
  otherwise) and the F8 card's reset; the `runLizeemFarmsChecks` hook.
- `src/road-checkpoint.js`: validators and copies for `meadow` and `weir`; explicit validators for both arcs; Nesdor's
  beds, floodwheat and coppice registered, both arcs registered on a validating hub, and both people modules imported
  so the market knows their buyers. All optional: a save from before them loads fresh.
- `src/inventory.js`, `src/cooking.js`, `src/consumables.js` (the two countries' goods, dishes and foods, and the
  rebellion's paper), `src/skills.js` (seven Farming unlock lines), `src/map-fog.js` (Haethom and Ninehands charted),
  `tests/test-manifest.json` (the eight suites), `main.cjs` (`--lizeem-farms-checks`), `package.json`
  (`test:lizeem-farms`).

**Settled at integration** (the builders' open questions):

- Bolverk takes 5 seconds and the match has no margin, so a walk (6 seconds) always loses and the Work of Nine wins.
  His terms and lines say so.
- *Sound the Soil* on the Flats reads what the scenery dresses each strip with and what Baugi reads off it.
- `farming.pick` grades a tree that has a fine kind by Farming level: Fine at 16, Prize at 20 (Idunn's hazels give
  `hazelnuts-fine`), so the Measure's hazelnut line and the fine nut cake can be reached.
- `farming.onHarvest` handlers may return `{ added }`; Airmid's basket uses it, so the harvest's count includes it.
- The staff passes over a shut bed (`src/magic.js`: `bedOpen` for Baugi's long strip, and a host `fieldOpen` that main
  uses for Liban's deep plots).
- Both `frontierReserved` additions are in `src/west-regions-scenery.js`.
- The Nethereum dish line in the Measure is the hub's (`dish`: oatcakes or smoked fish); the arc's lines agree.
- Seithenyn's minding (one dish, one draw-off at the shine) and Messor's wage (6 copper a game day) are both live; Idunn
  sells hazelnuts and charcoal as she is.
- Also fixed: the farm view turns a bed by its `yaw` (the Nesdor beds lie down their strips); Taleth's Nethereum hand-in
  takes the dish from the satchel before the arc moves on, so the save written then does not keep it;
  `tests/nesdor-farm.test.js` builds its world before declaring any test, since only five of its eleven ran under
  `--test-isolation=none`; `tests/nethereum-farm.test.js` reads the ground without the bank now that `world.heightAt`
  carries it; `tests/flats-ground.test.js` expects its goods to be spread in.

## Evidence

Every changed JS file passes `node --check`. Node suites, one process each, up to four at once:

| suite | result |
| --- | --- |
| `flats-ground`, `meadow-water`, `lizeem-nethereum`, `lizeem-nethereum-people`, `lizeem-nesdor`, `lizeem-nesdor-people` | 9/9, 14/14, 7/7, 5/5, 13/13, 9/9 |
| `nethereum-farm`, `nesdor-farm` (scoped worlds, minutes each) | 9/9 (190 s), 11/11 (83 s) |
| `farming`, `farming-countries`, `farming-rotation`, `regional-farming`, `regional-farmland`, `sorcery-field`, `magic` | 14/14, 8/8, 12/12, 4/4, 4/4, 10/10, 18/18 |
| `lizeem-farmlands`, `lizeem-people`, `taleth`, `prices`, `merchants`, `menora-city`, `cast`, `telemonia-people` | 26/26, 10/10, 10/10, 8/8, 26/26, 9/9, 6/6, 10/10 |
| `road-checkpoint` (a new test: the meadow, the weir and both arcs ride along, refuse corruption, and an older save loads fresh), `save-round-trip` | 41/41, 4/4 |
| `tills`, `economy`, `larder-sources`, `inventory`, `consumables`, `foods`, `cooking` | 7/7, 6/6, 4/4, 11/11, 8/8, 3/3, 5/5 |
| `skills`, `skill-sheet`, `skills-browser`, `skill-announcement`, `game-mode`, `player-characters` | 7/7, 2/2, 5/5, 4/4, 10/10, 24/24 |
| `quest-markers`, `quest-tracker`, `journal-entries`, `quest-destinations`, `spider-quest`, `sunflower-lesson`, `chapter-one` | 21/21, 11/11, 11/11, 3/3, 13/13, 7/7, 6/6 |
| `companions`, `first-contact`, `found-weapons`, `long-road-clock`, `smith`, `story-spine`, `field-card`, `death-lifecycle`, `mercenaries`, `weapons`, `weapon-feel`, `gear`, `world-map-detail`, `west-rivers` | all pass |

**Red before this work** (the same tests fail with the same messages on the committed base `7bba42b`, or did so in
Build 1's run): `frame-errors` 1, `prompt-priority` 1, `shield-guard` 2, `rebel-crew` 1, `combat-skills` 1,
`session-clock` 1, `review-quiet` 1, `long-road` 2 (the troupe camp), `map-fog` 1 ("Selemis is only 55% inside
Selemis"; the test stops there, so Haethom's and Ninehands' new areas were measured separately by the same rules:
wholly inside their countries, and clear of every other area), `testing-travel` 1 ("Acor Wetlands · The Acor
Reedwater", confirmed on `7bba42b`), `caricas-world` 1 ("the chart knows caricas-farms", as in earlier sweeps),
`world-scale` 1 ("standable ground 0.6 m outside a bridge rail" on the Caloss at (-944, 2377), far from both farms, confirmed on `7bba42b`; eighteen minutes, not quick).
Not run, as asked: `nethereum-world` and `nesdor-world`, whose one failure each (the world-width pin, and the honest
ground at 1.22 m) their builders found before this work. `opening-sequence` (three failures before this work) was not
re-run.

**Electron** (Fast load, isolated profile, Electron from `world-builder/map/node_modules` through the scratchpad copy of
`scripts/launch.cjs`; nothing outside the worktree edited):

| run | result |
| --- | --- |
| 1. `--minora-opening-checks --fast-load` (3 min) | **Passed**: 35 checks before the reload and 18 after, no console errors, no frame errors. Developer Start, Rollo, Taleth's choices, saving and Continue unchanged by these builds. |
| 2. `--lizeem-farms-checks --fast-load` (`npm run test:lizeem-farms`, 69 s) | **Partly passed.** Both countries loaded. Haethom: the scenery is built (the hatch broken, the meadow dry), all twelve Nethereum beds are drawn, and all seven people stand on their stands on the ground. Ninehands: the scenery is built, all fifteen Nesdor beds are drawn turned down their strips, all eight people stand on their stands, and the bench strip was sown and ripened. **Failed** at the first prompt in each country: the interaction label was never written. The screenshot (`tests/artifacts/lizeem-farms-haethom.png`) shows why: "Preparing Drent. Your journey will continue when the region is ready." The road-skill `prepare` stands the traveller in Drent, which Fast load had not built, and the region guard held every game frame back while it loaded, so the draw-off, the reap and the weir were never reached in Electron (each is covered by the Node suites above). The smoke now goes straight from `prepare` to the first country with no frame between, waits until nothing is loading, checks that the game's own frames are running, and reports the whole prompt state on a failure. **Not re-run**: the integration was held to two Electron runs. |

## Open points for review

- **Run `npm run test:lizeem-farms` first in review** (about a minute and a half): the hardened smoke has not been
  run, and the hatch, weir and strip-end prompts, one draw-off and one strip reap are proved only by the Node suites.
  Neither fight (Boann's wolves, the foragers) nor the Recall has been played in the renderer.
- `tests/nethereum-world.test.js` and `tests/nesdor-world.test.js` were not run (seven minutes each, one failure each
  before this work). Both scoped worlds now build Haethom and Ninehands, so their counts and clearances want a look.
  `tests/nethereum-farm.test.js` still lays a second copy of Haethom on its world, which now holds one; it passes, but
  could read the world's own as the Nesdor test now does.
- The people's looks are the design's, in the figure kit's words; none has the user's approval yet. The user's
  decisions of 5 and 6 October are not yet in `docs/design-answers.md`, and no lore was written for either country.
- `src/build-status.js` still describes Nethereum, Nesdor (and Caricas) as terrain and wildlife only.
- The first cut of meadow hay is not gated on Farming 5 (the meadow grows it for anybody); the skill sheet lists it at
  5. The deep plots are shut to sowing and to the staff until the arc is done and Farming is 16; a deep bed sown before
  that cannot exist, so nothing is shut to reaping.
- Reaping a strip gives a little focus back for each bed, as three separate harvests do.
- Nesdor's region record lists nobody (the Eer test pins it); the game stands its eight up after the trim.
- No F8 card was added for the two arcs: Build 1's Taleth card resets the whole farmlands (and now the meadow, the weir
  and any reap with it), and both countries are reached by the F8 region list.

## First-pass numbers to tune

| what | value | where |
| --- | --- | --- |
| Flood oats | 240 s, 30 XP, level 1, yield 2; fit by silt: fine 2, thin 1, sour or none 0 | `src/nethereum-produce.js`, `src/meadow-water.js` |
| Meadow hay | 180 s, 35 XP a cut, yield 2; second cut 300 s after the first, Farming 10 | the same |
| The water | blackwater 180 s, siltshine 240 s, then frogcall; the silt feeds one sowing | `src/meadow-water.js` |
| Deep plots | Farming 16 after the arc; thin silt counts as fine; the water takes one planting in five | `src/meadow-water.js`, `src/lizeem-nethereum.js` |
| Levee tenth | one in ten of every Nethereum harvest; waived a game day after a turn of levee work | `src/lizeem-nethereum.js` |
| Weir | 3 fish a game day, 5 at Fishing 5; Fine before noon | `src/meadow-water.js` |
| Floodwheat | 360 s, 60 XP, level 8, yield 2; bench 2, rise 1, wet 0 | `src/flats-ground.js` |
| Hazel coppice | Farming 12, 18 XP, bears again in 600 s; Fine at 16, Prize at 20 | `src/flats-ground.js`, `src/farming.js` |
| Reaping | 2 s a bed; Bolverk 5 s, no margin; the long strip at Farming 24 | `src/flats-ground.js` |
| Foragers | a quarter to one party, or a tenth on 3 copper of paper; paper 2 copper a note, changed for 1; three foragers of 120 hp | `src/lizeem-nesdor.js` |
| Dishes | oatcakes 25 (fine 35), smoked fish 40 (50), white bread 35 (45), nut cake 50 (50), ale 15, butter 10, weir fish 10 (15) | `src/nethereum-produce.js`, `src/flats-ground.js` |
| Arc lumps | 150, 200, 300, 400, 1,000 in each country | `src/lizeem-nethereum.js`, `src/lizeem-nesdor.js` |
| Buyers | Gwyddno oats 12; Boann hay 24, barley 12; Aegir dishes 8, barley 12; Egil hay 24, barley 12; Byggvir barley 24 | the people modules |
| Wares | basket 20, salt 2, butter 3, manure 1, ale 3, hides 2, honeycomb 2, hazelnuts 2, charcoal 2 | the people modules, `src/prices.js` |

## Commits (Builds 2 and 3)

| commit | subject |
| --- | --- |
| `4652d15` | Nethereum scenery: Haethom, the levee, the meadow and the weir |
| `f76c7c0` | Nesdor scenery: Ninehands, the strips, the hazel wood and the Way |
| `2d468ce` | The flood meadow and the Flats: timing the water, right crop on right ground |
| `d81cca0` | Nethereum and Nesdor arcs and their people |
| `bf39d28` | Wire Builds 2 and 3 of the Farmlands of the Lizeem into the game |
| this report | Hand off Builds 2 and 3 of the Farmlands of the Lizeem |

## Next action

Codex review. Then the user's playtest of both arcs from Developer Start, his word on the people's looks and on the
numbers above, and the remaining builds (Ovesos, then the Dividing).
