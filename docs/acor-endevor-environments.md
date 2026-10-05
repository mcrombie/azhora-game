# Cape Thalmagar, Acor and Endevor environments

Implemented 5 October 2026. Scope: terrain, plants, persistent wildlife, discovery landmarks and developer travel. No new inhabitants, settlements, factions or quests.

## Regions and character

| Runtime ID | Exact atlas name | Environment |
| --- | --- | --- |
| 70 | Cape Thalmagar | Cool maritime heath, rounded headlands, birch/fir shelter and juniper scrub. Original models for Palmants with broad antlers, long-necked Long-Backs, Standing Huls and broad-muzzled Shore Elders. |
| 71 | Acor Wetlands | Permanent reedwater, the Velsond fan and alder backwater; real submerged basins, dense reeds, sedge and willow/alder carr. Firm clay hummocks provide a dry walking route. Otters, herons, egrets and ducks. |
| 72 | West Acorwood | Wet western woodland margin, broad Acor crowns, alder fringes and the Black Pool. Three authored ocean cells remain water. |
| 73 | South Acordwood | Deep woodland and mast hollows toward Mithala; broad crowns, beech/birch, deadwood and a sheltered pool. |
| 74 | North Acorwood | The densest old canopy, large overlapping Acor crowns above clear trunks and animal tracks; the Still Vault pool. |
| 75 | East Acordwood | Maritime woodland, fern valleys and a spring pool, with lighter forest edges. |
| 76 | South Endevor | Lower, gentle swales and a sedge mere against the woods and wetlands. |
| 77 | West Endevor | Exposed heath and restrained parallel shale ribs, flattened shale fragments and sparse scrub. |
| 78 | North Endevor | Broad low swells and a more wooded birch margin. |
| 79 | East Endevor | Grass folds, scattered trees and the Rush Hollow. |

The four Endevors are **plains**, following the authored atlas rather than the older shale-highland draft. Their relief blends across country boundaries. The Acorwoods use the atlas forest/deep-forest classes; their characteristic trees grow outward into broad canopies rather than copying Ibenwood's towering forms. All living trees have registered species and normal tree handles; Acor has its own timber item. Forest fauna include boar, deer, foxes and forest cats. Open grass supports hares, deer and foxes, with hunting birds above.

Cape animals use the existing ambient movement/damage system. The Hul periodically stands to look around; the Long-Back holds its neck up to browse. This does not introduce a new predator-combat or hunting quest system. Other lore species, including the Rack-Wing, are not included in this pass.

## Integration and constraints

- F8 → Go anywhere → choose any of the ten countries. Full and Fast use the same regional scenery builders. Fast can prioritize a requested destination.
- Cape Thalmagar has a normal-world coast destination (`thalmagar-coast`). On 5 October its existing Black Fortress was [placed at the northern tip, facing inland](thalmagar-fortress-placement.md). The separate art-study preview remains available.
- Authored names, ownership and climate are preserved, including the atlas's **Acordwood** spelling for South and East. The World Builder repository is read-only.
- Scenery is instanced in local spatial batches. Animal homes are deterministic, independent of player position, and reserve small clearings. Trees use the rendered triangle surface for their bases; only visible trunks and substantial rocks receive colliders.
- Nine pools have matching rendered water, terrain basins, swimming surfaces and map polygons. No invisible mountain-style collision hulls were added.
- Existing numeric region IDs remain stable; the ten new IDs append to the registry.

## Validation

`tests/acor-environments.test.js` builds these countries through the real Fast loader. It checks all 332 authored cells, all ten vegetation builds, species identities, preserved sea inlets, twenty real-controller walking traversals (each route both ways), all nine water basins, and animated animal footing/ownership in every country. The test is in the explicit test manifest.

The region-survey, developer-atlas and build-status tests cover registration, map-source consistency and preservation of the fortress destination. Native review views `acor-0` through `acor-9` capture each region; `acor-4-walk` checks the forest at ground level, and `acor-0-animal-hul`, `-palmant`, `-long-back` and `-shore-elder` inspect the Cape animals. Native checks run the same walking/water assertions before each capture.

Local evidence is in gitignored `tests/artifacts/acor-*.log` and `acor-*.jpg`. The first complete desktop review captured all ten countries with no renderer errors; Electron emitted its existing GPU shutdown warning after finishing the captures. This is not a claim that a whole-game Full-mode performance benchmark or the full repository test suite ran.

### Acor flight crash regression (5 October 2026)

Flying above an Acor tree could trigger the ground woodcutting prompt. Acor had a species and log item but no `TREE_KINDS` recipe, so the prompt dereferenced an undefined `level`. Acor now uses the level-15 hardwood tier and yields its own logs. Nearby trees are resolved through the validated woodcutting catalog, prompts safely handle protected species without recipes, and suspended players no longer receive chopping prompts.

`tests/timber-coverage.test.js` checks every timber-producing species against its recipe, inventory item and skill guide, exercises a late-loaded Acor tree through level/axe checks and harvesting, and checks recipe-less protected prompts. It failed before the fix. All 15 tests across timber coverage, tree registry and developer flight passed afterward.

Run `node scripts/launch.cjs --smoke-test --fast-load --review-views=acor-flight --review-jpeg --review-size=1440x900` for the live regression. It flies the real developer mount from South Endevor through all four Acorwood regions, hovers over Acor trunks, then checks the live ground prompt. It asserts gameplay frames advance and records any frame errors; region loading finishes before the driver starts. Both review passes completed with zero renderer errors and the visible `Chop Acor · Woodcutting 15` prompt. Evidence: `tests/artifacts/acor-flight-crash-fix.log` and `acor-flight.jpg`. The process returned 1 after the captures due to Electron's existing GPU shutdown warning, not a failed flight assertion.
