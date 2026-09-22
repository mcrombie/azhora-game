# Content pass: the rebuilt regions

This is the brief for the pass that follows the region rebuild (`docs/region-rebuild.md`, report in `docs/region-rebuild-report.md`). The rebuild places the scenery and the NPC stands; this pass gives them words, small encounters and quest wiring. It is well-specified content work and suits a cheaper model than the rebuild did. Read the rebuild report first: it names the ids the rebuild chose for landmarks, NPC stands and paths, and this brief refers to hooks by their design names.

## Ground rules

- Names and lore come from `src/campaign-world.js` (`REGION_DESIGN`, `FACTIONS`, `COALITION_MEMBERS`) and `docs/campaign-design.md`. Use authored atlas names. There is no South Pyros: West and East Pyros are one empire with a small Coalition contingent. Legion soldiers are men by default.
- Tone: the Legion speaks in orders and requisitions and calls the republicans rebels; the people of Luscia and Suval speak plainly and most of them wanted the republic. Nobody lectures. Hollis and Sava in `src/journey-content.js` are the register to match.
- Dialogue is authored as arrays of lines with `tangent(...)` and `choice(...)` helpers in `journeyConversation` (`src/journey-content.js`). Keep that shape for road NPCs. Regional colour (rumours, ambient lines, small favours) lives in `src/regional-life.js` and `src/road-life.js`; places in `src/regional-places.js`.
- Quest wiring lives in `src/campaign.js` (`CHAPTERS`: `luscia-aftermath` → `moros-camp` → `suval-envoy` → `border-battle`) and `src/journey.js`. Do not change the state machine's rules; add the triggers and the text that advance it.
- The autopilot (`src/autopilot.js`, `planGoal`) must be able to complete every chapter you make playable. If you add a chapter's triggers, add the matching goals and extend `src/autoplay-smoke.js` to assert the new chapter is reached.
- Tests: every new conversation gets a case in `tests/journey-content.test.js` or `tests/regional-life.test.js` (regex on a line, plus the choice ids). `npm test` must stay green. Run the Electron smokes one at a time (`test:game`, `test:road`, `test:autoplay`, `test:local-map`).
- Files: `src/main.js` and `index.html` are CRLF. Large heredocs fail in Git Bash on this machine; write scripts to a file and run them.

## Assets already built for this pass

- Character roles in `src/characters.js` (`createCharacter({ role })`): `legion-soldier` (banded cuirass, helmet, shield, planted spear), `legion-officer` (crest, red cloak, hand on the hilt; use for the Legate and the picket sergeant), `suvali-guard` (studded jerkin, iron cap, spear). Give NPCs these as `modelRole` in `JOURNEY_NPCS`.
- `createWolf({ variant })`: a four-legged enemy with trot, crouch, lunge, hurt and death poses. Encounters take `kind: 'wolf'` on an enemy (`combat.startEncounter`); wolves close faster, bite sooner and hit for 14 instead of 17. The combat view spawns and labels them.
- `createHorse({ variant, saddled })`: bay, chestnut or grey, with a Legion saddle when saddled; idles, grazes (`pose.grazing`) and walks. Use it for the camp's horse line and the hitch. Riding is not built.
- Tests for all three live in `tests/legion-characters.test.js`, `tests/wolves.test.js` and `tests/horses.test.js`; keep them green.

## Luscia (chapter `luscia-aftermath`)

- **Iven's relay**: Iven now reports the Lauvel battle as ten days old and sends the player to the field to identify a missing Legion courier. Three lines of rumour about wolves on the burial line.
- **The Lauvel battlefield** (`lauvelField`): a Legion picket sergeant (male, terse) who will not let civilians past; a Luscian woman searching the burial line for her brother; the courier's satchel at a broken cart (site action, mirrors `SITE_ACTIONS`). Returning the satchel to Iven completes the chapter and grants the horse hitch token used at the Moros camp.
- **Burned hamlet**: one survivor, an old drover, two ambient lines; no quest. A rumour that the republic's people are gathering at Solis in West Suval.
- **Wolves**: scenery only in the rebuild. Add one encounter rule in `road-life.js`: two wolves approach the burial line at dusk and back off when the player stands with the picket. No wolf combat model yet; reuse the goblin combat with a wolf label if the combat module allows a variant, otherwise leave a stub and say so in the report.

## Moros Plain (chapter `moros-camp`)

- **Legion camp** (`legionCamp`): a gate sentry who checks the player's induction letter; a quartermaster inside; the Legate at the command tent. The Legate gives the fork: ride to Solis in West Suval as the Empire's envoy under a flag of truce and learn the Coalition's strength. Dialogue must name the Coalition members correctly and make the truce feel fragile.
- **Horse line**: a hitch stand with one line of dialogue from a groom. Riding is a later mechanic; the horse is a prop.
- **Moros gate signpost**: two lines of ambient text (distances to the camp and to the Caloss).
- **The outpost** near the Suval side: an empty stockade with a plaque; the border battle will be fought over it later. No dialogue.

## East Suval (chapter `suval-envoy`)

- **Elod's border post** (`suvalBorder`): two guards, neutral, who let the envoy pass only under the truce; a line each that shows they are Suvali, not Legion. A Coalition envoy waiting inside to escort the player toward Solis. This is where the player's choices start feeding `campaign.js` trust and exposure (the crossings); route the envoy's three questions through the existing choice helpers.
- **Elod's gate**: a gatekeeper with two lines and a rumour about hill bandits south of the road.
- **The roofless waystation**: an ambient note in `regional-places.js`.
- **Hill-bandit lookout**: empty; one line of found text (a scratched tally) for the discoveries system.

## Drent touch-ups

- The Caloss signpost on the south-west road gets its text.
- Corvan's lines refer to the farm clearing in the forest rather than Sunmeadow. Search for `Sunmeadow`, `Reedwater` and `Threefold` across `src/` and `tests/` and replace the ones the rebuild left (some names may survive as landmark titles by design; the report says which).

## Queued after the Luscia chapter lands

- **Nothom, Smiths and the rebel contact** are being built with the chapter (see `docs/luscia-chapter-report.md` when it exists): the town at Luscia's centre is the main quest's report destination; Smiths is a harmless beggar who follows and asks for a coin; a seemingly ordinary townsperson reveals herself as a republican only through a specific line of questioning and starts the Coalition's Luscia arc.
- **Move the goblin camp out of Drent.** Drent is level 0 and has no goblin camp. The Bramble Scout Camp (the optional hideout in `src/forest-hideout*.js`, Tamsin's stolen supplies) moves to the wilderness in Luscia's north. It becomes a side quest taken at Nothom: a soldier there tells the traveler about the camp; the captain and his soldiers offer to attack it together and go along to fight once the traveler says they are ready. That needs allied combatants in `src/combat.js` (Legion soldiers who fight goblins beside the player) and companion movement in main.js. The Greenway ambush and the Avrel clearing raiders stay: they are the combat tutorial, not a camp.

## Report

Write `docs/content-pass-report.md`: what was added per region, ids used, tests added, anything left as a stub and why. Keep the README's district table and region blurbs current.
