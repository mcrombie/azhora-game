# Brief: build West Suval and Solis, and move the parley there

Start from the scaled world (`docs/world-scale-report.md`; one authored hex is 100 m and hand-placed coordinates go through `src/world-scale.js`). West Suval becomes the fifth playable region and Solis the place the main quest goes, so the fork of the story no longer happens on the border of the Moros Plain.

## The region

- Atlas facts: West Suval has 24 hexes (11 grassland, 8 plains, 5 hills), lies east-south-east of the Moros Plain, west of East Suval and south of Luscia, with the sea to its south. The campaign registry (`src/campaign-world.js`) has it at level 2, held by the Coalition, "grassland and low hills toward the coast; Solis on the southwest", threats bandits and wolves. Solis is "the market city of the southwest, first held by the Coalition landing".
- Add `'West Suval'` to `PLAYABLE_REGIONS` with id 5 and a biome of its own in `REGION_BIOMES` (rolling coastal grassland: long grass, scattered thorn and olive-like trees, low stone walls, hills rising toward the coast; clearly different from the flat treeless Moros and from East Suval's grey stone). Regenerate `src/region-survey.js` with `node scripts/build-region-survey.mjs` so the survey covers it and its neighbours. Region membership, outlines, minimap, trail charts, the chart marker, the region card, `WORLD_BOUNDS`, the developer atlas's local destinations and `tests/region-layout.test.js` expectations all follow.
- Roads: a road from the border stockade on the Moros Plain south-east into West Suval to Solis, as a world path with the same conventions as `SUVAL_ROAD`; a branch from East Suval's border post if the outlines make that natural. A signpost where it crosses the border.
- Wilderness between the border and Solis: two or three small places (a shepherds' fold, a ruined watchtower, a wayside well) as landmarks with discovery text, so the region reads as country and not a corridor. Wolves and bandits are scenery or rumours only unless time allows one encounter.

## Fortifications: one standard for both sides

The user wants Solis to be a walled town whose fortifications are about as defensible as the Ambroni Empire's fortified position on the Moros Plain (the Legion camp and its forward stockade on the border). Neither side should look like it could walk over the other. Both briefs carry this section; build to the same measures so the two read as a match when the player has seen both:

- **A continuous circuit** with no gaps a person can walk through except the gates; colliders all the way round, and `canStand` false inside the wall's thickness. Wall top about 4.5 to 5 m above the ground outside, thick enough to carry a wall walk.
- **A wall walk with a parapet** on the inside of the circuit, reached by stairs or ladders at two or more points, and drawn so it reads as a fighting platform from the follow camera.
- **Towers**: two flanking each gate, one at each corner or change of direction, all a storey taller than the wall and projecting slightly so they cover its face. Roughly one tower per 35 to 45 m of wall.
- **Two gates, no more**: a main gate on the road and a lesser one (Solis: a sea or quay gate; the camp: a rear gate). Each gate is a passage through a gatehouse or between its towers with leaves drawn open, 4 to 5 m wide, and guarded.
- **An outer obstacle**: a ditch 3 to 4 m wide all round except at the gate causeways (the terrain can stay flat if the ditch is modelled as geometry with a collider; do not break the road), with the spoil as a low bank under the wall.
- **Materials differ, strength does not**: Solis is dressed stone with tiled tower caps and banners of the Coalition's contingents; the Legion's works are squared timber palisade on an earth rampart with timber towers and the Legate's standard. Same heights, same tower spacing, same ditch.

Solis is the stone half of this. Its circuit encloses the whole town (the Coalition's camp lies outside it, inside its own light picket line), the main gate faces the road from the border, and the lesser gate opens on the quay. Add a test that the circuit is closed: sample the wall line every 2 m and assert nobody can stand on it except in the two gate passages, and that each gate passage can be walked end to end.

## Solis

- A walled market town on the south-west of the region near the coast, clearly the largest settlement in the game so far: the fortifications above, a market square, 18 to 25 buildings of mixed size (houses, warehouses by a quay or beach landing, an inn, a counting house, a small temple or hall where the Coalition's council sits), streets as paths, a well or fountain, stalls. Put its layout in a town frame like Lumber Town's (`townPoint`), in a new module so the existing scenery file does not balloon. Colliders and `canStand` must be right; every NPC stand reachable.
- The Coalition's camp outside the walls: tent lines grouped by contingent with a banner each: Izoli, Suvali, the Ambroni rebels, a very small Pyrosi group (their empire is busy at home), Selemi, Marosh, and the southern island city-states. There is no South Pyros.
- People (cloth roles for townsfolk, `suvali-guard` for Coalition soldiers; soldiers are men by default): gate guards who admit an envoy under the Legate's seal, Envoy Telis Orren (move her here from `src/border-chapter.js`), one captain per major contingent with two lines each that show who they are and why they came, a Solis merchant who grumbles about paper scrip, and four to six townsfolk with ambient lines. Keep the tone rules in `docs/content-pass.md`.

## The quest

- `src/border-chapter.js`: the Legate's terms are carried **to Solis**. Stages become: take the terms from the Legate; pass the Solis gate; meet the envoy in the council hall and choose a side (same two choices, same campaign call); then return to the border: the Empire's Tribune holds the Legion's line on the Moros side of the stockade, the Coalition's Captain Arlen Voss holds theirs on the West Suval side, and the battle is fought at the border as the campaign text says. Keep the encounter, the allies, the odds and the save format; add only what the new stages need, and keep saves from the stockade version loading (a save already past the envoy keeps its side).
- The autopilot (`borderGoal`) walks to Solis, keeps the Empire's contract, walks back and fights. `src/autoplay-smoke.js` expectations follow.
- The mercenary company does not go to Solis.

## Ground the next chapter needs

`src/aftermath-chapter.js` is the chapter after the battle, already written and wired into `src/main.js`, the checkpoint and the autopilot: the Empire's sellsword clears the market square of Solis (`solis-sweep`) or holds the Legion camp's gate (`moros-fallback`); the Republic's storms the border stockade (`moros-outpost`) or holds the gate of Solis (`solis-fallback`). Its people and fights are placed by the site and arena ids in `src/aftermath-sites.js`. The two Moros variants are playable today; the Solis entries are `null` and the journal says the ground is not built. Fill them in:

- Sites `solis-gate` (outside the main gate, beside the road, where a commander waits) and `solis-hall` (inside or on the steps of the council hall, where the envoy or the Tribune receives a report): standable, reachable, with a `yaw` facing whoever approaches.
- Arenas `solis-square` (the market square) and `solis-approach` (the road outside the main gate), each `{ center, retreatAxis }`. The combat rules only allow a retreat toward **+axis**; the enemy enters 12 to 19 m on the -axis side of the centre within 9 m across, the allies form up 10 to 14 m on the +axis side, the retreat line is 21 m out. So each arena needs a clear, collider-free, fairly level rectangle about 24 m across and 46 m along its axis, with the + end toward where the traveler comes from (the gate for the square, the city for the approach), and walkable ground just past the retreat line. Lay Solis out so this works: stalls, the fountain and carts go around the square's edges, not in that rectangle.
- If you move the border battle's ground, move `stockade-approach` and `stockade-yard` with it so the Republic storms the stockade from its own (West Suval) side, enemies in front of the palisade.
- `tests/story-stands.test.js` already checks every built site and arena for footing and a way out; it must pass with all four variants built, and its "waits for its ground" branch should then be dead: replace the last assertion with one that all four are built.
- Envoy Telis Orren exists twice by design: your border chapter's envoy (before the fork) and `aftermath-envoy` (after the battle, Coalition side only). Make sure they are never out at the same time, and that after the fork the Empire's player does not find her in the hall.

## Rules

- Work in your own worktree and branch. Another agent is fleshing out the existing towns and the signs at the same time: it owns `src/world-regions.js`'s existing places and the sign code in `src/world.js`. Put West Suval's scenery and Solis in new modules with a single call from the world builder, add your NPCs through your own module with one hook in `src/main.js` (CRLF, very long lines, do not reformat), and keep edits to shared files small and local.
- `npm test` stays green; new tests for the region, Solis's stands and reachability, and the chapter's new stages. Run `npm run test:game` and `npm run test:autoplay` once each at the end and fix what they find; do not loop on smokes.
- Commit in milestones on your branch; write `docs/west-suval-report.md`.
