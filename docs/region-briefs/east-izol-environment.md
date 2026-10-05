# East Izol environment assignment

Prepared 4 October 2026 against review base `a2e49c3`; **brief only, not started**.
Claude delivered **South Celder and North Celder** at clean `136b582` on 4 October.
East Izol is the next eligible assignment after that pair. Starting it is pending an available
Claude worker and a pinned assignment base/worktree from ChatGPT; the two delivered Celders
remain queued for review and leave capacity for this single-region assignment.
The joint plan permits at most four delivered regions awaiting initial-backlog review,
plus one active assignment; the Celder pair counts as two regions.

## Authoritative inputs

- [Joint plan](../regional-completion-joint-plan.md) and [ledger](../regional-completion-ledger.md).
- `assets/azhora-dev-regions.json`; read-only `../world-builder/map/resources/examples/azhora.wwmap`.
- Read-only `../world-builder/azhora_lore/geography/regions/izol.md`.
- [Izoli history](../izol-and-the-triumvirate.md), including the later Wilhelm-at-Minora correction.
- [West Izol report](../west-izol-report.md), `src/izol-world.js`, `src/izol-scenery.js`, and current campaign rules.

## Verified footprint and constraints

| Item | Source constraint |
| --- | --- |
| Exact atlas identity | `East Izol` |
| Footprint | 27 cells; axial q 8–13, r 122–130 |
| Terrain | 11 grassland, 8 plains, 4 hills, 3 forest, 1 mountain |
| Per-hex climate | 14 `Csa`, 13 `Csb`; preserve their distribution, not a region-wide average |
| Neighbors | West Izol, 10 shared edges; 32 remaining edges have no regional neighbor |
| Water | No mapped river edges touch East Izol; check actual sea/unassigned hex terrain along the coast |
| Campaign | Difficulty 1, control `izoli`, wolves are the specified threat; no story graph changes |

The lore gives older dark grey and iron-brown rock, slate-grey high ground, pasture on softer
slopes, headlands and coves, and three separated peaks. This is Mediterranean island ground,
not an alpine range or a continuous forest. A lore reference to river-mouth towns does not
authorize adding a major river absent from the atlas.

## Existing coordinates and reserved ground

Coordinates below are current world metres `(x, z)`; do not apply the old 56 m transform again.

| Existing feature | Coordinates and constraint |
| --- | --- |
| North Presence | `(520, 1690)`, summit `topY: 122`, width 96, depth 82; northern peak on mountain hex `(10,125)` |
| East Presence | `(588, 1866)`, summit `topY: 136`, width 92, depth 84 |
| South Presence | `(566, 1990)`, summit `topY: 116`, width 86, depth 76 |
| Sightstone | `(380, 1802)`; existing scatter exclusion radius 12; keep all three peak sightlines |
| Hearth Road end | `(492, 1892)`; existing road width 4.2; extend a clear natural continuation |
| Long Pasture | `(268, 1958)`; scatter exclusion radius 18, discovery radius 26; cairn `(296, 1936)` |

These peaks currently are skyline meshes built by West Izol, not three proven walkable mountains.
Give their physical ground and visible meshes one coordinated owner. Preserve the established
profiles from the Sightstone; replacing the old meshes must not duplicate peaks or remove them
when only West Izol is ready in Fast mode. Verify the transition when East Izol finishes loading.
Retain every other `IZOL_CLEARINGS` reserve, existing road, quay, camp and building footprint.

Reserve neutral central ground for the **Hearthstone**, with all three Presences visible;
the Sightstone is a different place. Reserve **Merrath** on the eastern coast and **Solne**
on the southern coast, plus approach space for the three peak shrines. Their exact footprints
are not established in the inspected code: document proposed coordinates before shaping them.
Keep them as terrain reservations; no town, shrine construction, residents or Assembly gameplay.
Izol has no capital. Preserve the existing Coalition/Republic history and West Izol content.

## Proposed environment and habitats

The following are builder proposals, not new cultural canon:

1. Three unequal rocky uplands separated by readable low saddles and pasture basins;
   preserve their established summits without covering the plain cells in giant mountain skirts.
2. An eastern headland-and-cove shore, with sea turf on exposed faces and scrub in sheltered pockets.
3. A broad natural approach from the Hearth Road toward the reserved central outcrop,
   with an ordinary return route and an optional summit climb using existing skill/stamina rules.
4. Small oak/pine woods on authored forest cells and sheltered hill pockets, scrub and broken
   grass on exposed slopes, and seasonal dry drainage into coastal hollows. Any local seep or
   stream is a documented proposal; do not invent a mapped river or permanent inland lake.

Use existing registered tree species appropriate to these habitats and intentional harvest rules.
Use existing wildlife rigs: hares on open pasture, birds on coast/upland, and restrained deer/boar
only where woodland and browse support them. Habitat choice and counts must be explained.
Keep wolves within the established level-1 threat system if that system is extended here;
do not add a new combat mechanic as environment work. Include encounters within woods as well
as clearings, with dry homes, retreat space and persistent identities. No domestic herds or farms.

## Integration contract

- Record the assigned base and changed-file ownership before work. No Celder files or worktree edits.
- Append East Izol to the combined registration order. ChatGPT allocates its runtime ID after the
  Celder handoff; do not assume 63 or renumber any existing region, scenery stream or saved entity.
- Update biome/terrain, chart discovery, region text, developer arrival, wildlife and loading
  registries together; use honest `environment` build status. Preserve all 131 chart identities.
- Update generator inputs and regenerate the survey from the combined source; no handwritten
  generated modules or stale shared-registry copies. Regenerate river data only if inputs require it.
- Wire bounded yielding jobs through `world.js`'s existing `regionBuild` pipeline. Include terrain,
  fine ground, scenery/colliders and wildlife readiness; install required ground before arrival.
- Give new scatter its own deterministic stream. Preserve `world.paths[0]`, tree IDs, wildlife
  keys, save compatibility, West Izol gates/quests, Full default and the ten-second mode chooser.
- Record paired height/coast samples across all ten West Izol border edges. Check both crossing
  directions and preserve existing West Izol heights and places away from the actual join.

## Focused acceptance journey and handoff

Start at the Sightstone, walk the Hearth Road to its existing end, continue through the central
saddle to the reserved Hearthstone ground, pass an interior woodland habitat, reach a safe east
coast viewpoint near the Merrath reserve, and return. Pin every new waypoint in the report.
Separately ascend and descend one Presence by its intended route. Use ordinary movement,
collision, climbing, stamina and falling; teleporting to the start is allowed, flight is not evidence.

Capture arrival/Sightstone skyline, central pasture, woodland interior, summit approach and east
coast at player height plus an overview. Inspect tree roots, animals, shore water and transitions.
Repeat developer arrival and West-to-East approach in Full and Fast modes, leave, return and reload.
Check no duplicate peaks/actors, no unsafe release before readiness and stable harvested-tree saves.

Add focused tests to the explicit manifest: atlas/climate agreement, border samples, production
journey, rendered ground contact, species/persistence, loading ownership, and affected West Izol
regressions. Report actual commands/failures; do not treat geometry-only reachability as play proof.

Deliver `docs/region-reviews/east-izol-handoff.md` with exact base and frozen revision or patch/file
manifest; runtime ID; implementation/omissions; reserved coordinates; border heights; reproducible
journey and skill settings; save/reload evidence; capture paths/date/revision; renderer errors;
same-machine Full/Fast before-and-after loading/frame/scene measurements; and remaining defects.
ChatGPT owns integration and acceptance. Do not merge, push, modify World Builder, or silently
start another assignment beyond the queue capacity.
