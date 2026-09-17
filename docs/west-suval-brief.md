# Brief: build West Suval and Solis, and move the parley there

Start from the scaled world (`docs/world-scale-report.md`; one authored hex is 100 m and hand-placed coordinates go through `src/world-scale.js`). West Suval becomes the fifth playable region and Solis the place the main quest goes, so the fork of the story no longer happens on the border of the Moros Plain.

## The region

- Atlas facts: West Suval has 24 hexes (11 grassland, 8 plains, 5 hills), lies east-south-east of the Moros Plain, west of East Suval and south of Luscia, with the sea to its south. The campaign registry (`src/campaign-world.js`) has it at level 2, held by the Coalition, "grassland and low hills toward the coast; Solis on the southwest", threats bandits and wolves. Solis is "the market city of the southwest, first held by the Coalition landing".
- Add `'West Suval'` to `PLAYABLE_REGIONS` with id 5 and a biome of its own in `REGION_BIOMES` (rolling coastal grassland: long grass, scattered thorn and olive-like trees, low stone walls, hills rising toward the coast; clearly different from the flat treeless Moros and from East Suval's grey stone). Regenerate `src/region-survey.js` with `node scripts/build-region-survey.mjs` so the survey covers it and its neighbours. Region membership, outlines, minimap, trail charts, the chart marker, the region card, `WORLD_BOUNDS`, the developer atlas's local destinations and `tests/region-layout.test.js` expectations all follow.
- Roads: a road from the border stockade on the Moros Plain south-east into West Suval to Solis, as a world path with the same conventions as `SUVAL_ROAD`; a branch from East Suval's border post if the outlines make that natural. A signpost where it crosses the border.
- Wilderness between the border and Solis: two or three small places (a shepherds' fold, a ruined watchtower, a wayside well) as landmarks with discovery text, so the region reads as country and not a corridor. Wolves and bandits are scenery or rumours only unless time allows one encounter.

## Solis

- A walled market city on the south-west of the region near the coast, clearly the largest settlement in the game so far: a gate with towers, a market square, 18 to 25 buildings of mixed size (houses, warehouses by a quay or beach landing, an inn, a counting house, a small temple or hall where the Coalition's council sits), streets as paths, a well or fountain, stalls. Put its layout in a town frame like Lumber Town's (`townPoint`), in a new module so the existing scenery file does not balloon. Colliders and `canStand` must be right; every NPC stand reachable.
- The Coalition's camp outside the walls: tent lines grouped by contingent with a banner each: Izoli, Suvali, the Ambroni rebels, a very small Pyrosi group (their empire is busy at home), Selemi, Marosh, and the southern island city-states. There is no South Pyros.
- People (cloth roles for townsfolk, `suvali-guard` for Coalition soldiers; soldiers are men by default): gate guards who admit an envoy under the Legate's seal, Envoy Telis Orren (move her here from `src/border-chapter.js`), one captain per major contingent with two lines each that show who they are and why they came, a Solis merchant who grumbles about paper scrip, and four to six townsfolk with ambient lines. Keep the tone rules in `docs/content-pass.md`.

## The quest

- `src/border-chapter.js`: the Legate's terms are carried **to Solis**. Stages become: take the terms from the Legate; pass the Solis gate; meet the envoy in the council hall and choose a side (same two choices, same campaign call); then return to the border: the Empire's Tribune holds the Legion's line on the Moros side of the stockade, the Coalition's Captain Arlen Voss holds theirs on the West Suval side, and the battle is fought at the border as the campaign text says. Keep the encounter, the allies, the odds and the save format; add only what the new stages need, and keep saves from the stockade version loading (a save already past the envoy keeps its side).
- The autopilot (`borderGoal`) walks to Solis, keeps the Empire's contract, walks back and fights. `src/autoplay-smoke.js` expectations follow.
- The mercenary company does not go to Solis.

## Rules

- Work in your own worktree and branch. Another agent is fleshing out the existing towns and the signs at the same time: it owns `src/world-regions.js`'s existing places and the sign code in `src/world.js`. Put West Suval's scenery and Solis in new modules with a single call from the world builder, add your NPCs through your own module with one hook in `src/main.js` (CRLF, very long lines, do not reformat), and keep edits to shared files small and local.
- `npm test` stays green; new tests for the region, Solis's stands and reachability, and the chapter's new stages. Run `npm run test:game` and `npm run test:autoplay` once each at the end and fix what they find; do not loop on smokes.
- Commit in milestones on your branch; write `docs/west-suval-report.md`.
