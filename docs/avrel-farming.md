# Stanley's commons garden

Stanley is an optional Farming and Cooking teacher in the Avrel clearing, beside Enna's mill. His garden never advances or blocks the main story. Enna retains her village-share errand and directs farming questions to him. The existing optional long-road stop keeps its save ID and now points to Stanley.

Four reusable beds use the existing commons row IDs and positions. A field-work panel lets the player choose a crop instead of automatically planting the highest available one. Seed packets are real satchel items; Stanley and the shared bin top up each unlocked variety to four packets. One packet plants one row, and each harvest returns one packet. No tool or lesson is required to begin practical work.

| Crop | Farming level | Active play time | Harvest XP | Base yield | Food use |
| --- | --- | --- | --- | --- | --- |
| Carrots | 1 | 90 seconds | 22 | 2 | 15 health each; carrot + barley makes farm pot |
| Barley | 1 | 4 minutes | 24 | 2 | Cooking ingredient |
| Beets | 2 | 150 seconds | 32 | 2 | 20 health raw; 35 roasted |
| Drent leaf | 5 | 8 minutes | 45 | 1 | Pipe weed |

Each growing planting can be watered once. Watering awards 4 XP, reduces total growth time by 25%, and adds one crop to the yield. Four watered carrot harvests reach Farming level 2. Watering cannot be repeated for extra XP. Ripe crops wait for harvest without spoiling; harvested beds can be planted again immediately.

Crop growth follows the saved active-play clock, including while the player travels elsewhere. Pausing, dialogue and menus stop the clock; closing the game gives no offline growth. Version-1 saves remain valid, with an optional `watered` field on planted rows. A refused inventory insertion leaves the crop in its row or the apple on its tree.

The four beds have dark soil, low corner stakes, visible stems and leaves that grow, crop-specific produce, and darker watered soil. The seed crate and shared watering can sit beside Stanley. No new collision obstacle blocks working a bed.

Stanley's Cooking lesson is independent of Farming, but requires Fire Making first. Lee Anne at Tidehaven's empty village fire ring supplies the first tinderbox and teaches the player to light a fire. Stanley directs an untaught traveler to her; farming and eating raw crops remain available. Once Fire Making is learned, Stanley teaches farm pot (one carrot + one barley, 45 health) and roasted beet (one beet, 35 health), including for players who already learned Cooking from Jojo. He supplies two branches for the first farm recipe lesson and replaces a missing tinderbox. The prepared ring beside the rows uses ordinary lighting, fuel and recipe interactions. Later fires require gathered fuel. Every successfully cooked meal spends ingredients and earns Cooking XP; failed cooking restores spent ingredients and awards none.

Validation: `node --test --test-isolation=none tests/farming.test.js tests/cooking.test.js tests/foods.test.js tests/regional-life.test.js tests/larder-sources.test.js`. This covers the complete seed-to-food loop, optional lessons, repeatable recipes, planting unlocks, old saves, paused growth, teacher and plot access in the built world, and Enna's unchanged mill errand. Native review should inspect Stanley, all growth stages, crop choices and the nearby fire.
