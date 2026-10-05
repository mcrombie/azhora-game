# Eshtor Plateau

Implemented 5 October 2026, following the northern and island environment expansion.

Eshtor keeps its 34 authored hill hexes and cold continental climates. Its silhouette is a broad elevated table crossed by low east-west rock ribs. Snow collects on the northern sides; lee hollows hold moss, low flowers and a few stunted birches and junipers. Exposed ground remains largely treeless. A shallow cold pool sits below its surrounding rim.

Long-Backs browse in the sheltered hollows. Hares, frostbacks, mountain goats and overhead plateau hawks complete the population. Trees retain their harvestable species. This is an environment build, without a settlement or quest arc.

## In the game

Use **F8 → Go anywhere → Eshtor Plateau**. Its three map locations are the Wind-Ribbed Table, the Long-Back Hollows and the Summer Snow Pans. Runtime ID **113** is appended after the original 33 outer environments, preserving all earlier IDs.

## Implementation and review

- `src/eshtor-landform.js` supplies the plateau form, lee shelter and snow exposure.
- The existing outer-region builders supply terrain, water, scenery, wildlife, discovery and travel integration. The plateau has a separate landscape treatment inside that pipeline.
- The pool placement searches for an enclosed, relatively level rim away from the arrival route. An initial native review exposed a perched pool; the corrected placement avoids that artifact.
- Production checks cover both directions along the arrival route, tree species and ground contact, cold-pool vegetation, actual wildlife construction, Long-Back habitat and birds.
- Reviewed build: 15 small trees, 1,731 rocks, 1,887 grass tufts, 256 shrubs, 70 flowers, no tall reeds, 113 static batches and 53 animals. These are review measurements, not population limits.
- `tests/eshtor-plateau.test.js` passes 2/2. The expanded outer-region suite covers 34 regions, 1,052 authored cells, 102 landmarks and 68 arrival traversals.
- Native review views are `outer-33` and `outer-33-animal`; the corrected Long-Back view was inspected after the pool repair.

Full remains the default startup mode. This addition does not restart loading optimization or authorize development in the deferred southern jungles.
