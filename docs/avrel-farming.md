# Stanley's commons garden

Stanley is an optional Farming and Cooking teacher in the Avrel clearing, beside Enna's mill. His garden never advances or blocks the main story. Enna retains her village-share errand and directs farming questions to him. The existing optional long-road stop keeps its save ID and now points to Stanley.

Four reusable beds use the existing commons row IDs and positions. A field-work panel lets the player choose a crop instead of automatically planting the highest available one. Seed packets are real satchel items; Stanley and the shared bin top up each unlocked variety to four packets. One packet plants one row, and each harvest returns one packet. No tool or lesson is required to begin practical work.

| Crop | Farming level | Active play time | Harvest XP | Base yield | Food use |
| --- | --- | --- | --- | --- | --- |
| Sunflowers | 1 | 120 seconds | 26 | 2 | Cut flowers; each harvest also returns seed |
| Carrots | 1 | 90 seconds | 22 | 2 | 15 health each; carrot + barley makes farm pot |
| Barley | 1 | 4 minutes | 24 | 2 | Cooking ingredient |
| Beets | 2 | 150 seconds | 32 | 2 | 20 health raw; 35 roasted |
| Drent leaf | 5 | 8 minutes | 45 | 1 | Pipe weed |

Each growing planting can be watered once. Watering awards 4 XP, reduces total growth time by 25%, and adds one crop to the yield. Four watered carrot harvests reach Farming level 2. Watering cannot be repeated for extra XP. Ripe crops wait for harvest without spoiling; harvested beds can be planted again immediately.

Crop growth follows the saved active-play clock, including while the player travels elsewhere. Pausing, dialogue and menus stop the clock; closing the game gives no offline growth. Version-1 saves remain valid, with an optional `watered` field on planted rows. A refused inventory insertion leaves the crop in its row or the apple on its tree.

The four beds have dark soil, low corner stakes, visible stems and leaves that grow, crop-specific produce, and darker watered soil. The seed crate and shared watering can sit beside Stanley. No new collision obstacle blocks working a bed.

Stanley's Cooking lesson is independent of Farming, but requires Fire Making first. Lee Anne at Tidehaven's empty village fire ring supplies the first tinderbox and teaches the player to light a fire. Stanley directs an untaught traveler to her; farming and eating raw crops remain available. Once Fire Making is learned, Stanley teaches farm pot (one carrot + one barley, 45 health) and roasted beet (one beet, 35 health), including for players who already learned Cooking from Jojo. He supplies two branches for the first farm recipe lesson and replaces a missing tinderbox. The prepared ring beside the rows uses ordinary lighting, fuel and recipe interactions. Later fires require gathered fuel. Every successfully cooked meal spends ingredients and earns Cooking XP; failed cooking restores spent ingredients and awards none.

Validation: `node --test --test-isolation=none tests/farming.test.js tests/cooking.test.js tests/foods.test.js tests/regional-life.test.js tests/larder-sources.test.js`. This covers the complete seed-to-food loop, optional lessons, repeatable recipes, planting unlocks, old saves, paused growth, teacher and plot access in the built world, and Enna's unchanged mill errand. Native review should inspect Stanley, all growth stages, crop choices and the nearby fire.

## Ari's Applegarth sunflower lesson

Ari now stands in Applegarth, the small western Drent town near Stanley's commons. Her existing `cobble-ari` identity, long black curly hair and violet dress are preserved. She has two reusable garden beds, a seed crate and a watering can between the north-side cottages, with clear approaches around the existing houses. She remains explicitly in the live cast after leaving Port Calos.

Her optional green-book training quest gives two sunflower seed packets, then follows actual planting in one of her beds, watering, growth, harvesting and a report to Ari. The flowers grow tall stems, broad leaves and yellow petals around dark seed heads. Watering reduces the wait to 90 seconds and yields three flowers. The first complete lesson earns 4 Farming XP for watering, 26 for harvesting and 24 once for reporting; subsequent growing remains ordinary repeatable farming. Stanley's separate introduction stays available.

The saved `sunflowerLesson` state records the exact lesson bed and tending steps. Inventory flowers, old plantings and unrelated crops cannot substitute for completing the lesson. Save/reload preserves growth and progress, and reporting cannot repeat the reward. Saves from before this lesson are accepted as an unstarted lesson. A dry harvest can be replanted and watered to retry.

Validation: `tests/sunflower-lesson.test.js`, `tests/farming.test.js` and the desktop `src/dev/checks/sunflower-checks.js` driver cover the physical crop loop, ordinary dialogue and bed menus, active-play timing, marker, save/reload, reward uniqueness and actual placement clearances.

The F8 named quest-giver card for Ari starts an isolated computer playtest beside her. It resets her lesson and two beds, then uses ordinary conversation, walking and garden menus to sow, water, wait through normal growth, harvest and report. Any key or click returns control; P resumes the focused lesson. The normal adventure checkpoint is preserved, and the playtest can be restarted during growth or after completion. `tests/ari-autopilot.test.js` and `src/dev/checks/ari-autoplay-checks.js` cover the controller and live desktop flow.

Ari owns the existing cottage on her left (`house-3`), with an indigo roof, lavender door and shutters, a sunflower door motif, potted flowers and a mailbox labeled Ari. The footprint stays the same, and stepping stones mark a clear approach from the village street. Her two functional garden beds remain separate from the permanent flowers by the house. `tests/ari-home.test.js` checks its placement and approach.
