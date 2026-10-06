# The remaining regions of Azhora

**5 October update:** [33 northern and island environments](outer-regions-environments.md) are integrated, including Gorgiwood, South Gorgi Mountains and both Ithzel regions. Unbuilt countries are gray on the map. Southern jungle development is on hold; further loading optimization is paused.

Design draft for review — 29 September 2026. **This document does not authorize or implement the expansion.** West Lotharn integration is separate work. Proposed priorities and new gameplay ideas below need review together.

**Current execution reference:** The [joint terrain and wildlife completion plan](regional-completion-joint-plan.md) and [live ledger](regional-completion-ledger.md) supersede this draft's dated counts and production sequence. Implementation was authorized 4 October 2026; current acceptance and pending review gates belong in that ledger.

## Current planning sequence

**1 October update:** Ibenwood, South Oremindi and the western frontier have received subsequent implementation work; the inventory and proposed ordering below remain the dated 29 September audit, not a current build count. The user's next linked design sequence is **[Baldro Dwarfland](dwarfland-design-draft.md) first, then [West Oremindi and Sevron](sevron-west-oremindi-design.md)**. Baldro has now received its first playable regional and dwarf-city implementation; see [the build record](dwarfland-implementation.md). West Oremindi and Sevron remain design work for a later implementation.

West Oremindi will be an extremely dangerous wilderness containing the hidden elven kingdom of Sevron within a drowned ancient dwarf capital. The Baldro dwarves remember that lost kingdom as their golden age. This supersedes the earlier placement of Sevron with South Oremindi; the South Oremindi campaign convergence and Inquest's cottage remain there.

## Recommendation

Build a connected world in small geographic groups, with a recognizable landscape and a satisfying journey through each group. Finish a few coherent journeys before filling distant countries with scenery. A region should be recognizable from ground level without its HUD label: through its skyline, water, vegetation, wildlife, and how the player moves through it.

My proposed next sequence is:

1. Integrate and review the **Mithala work already underway**, after bringing it onto the corrected West Lotharn base.
2. Make **South Celder and Yunethre** the next new terrain briefs: these complete important approaches around Lotharn and connect existing country to future northern and western travel. North Celder can follow as a separate reviewed extension.
3. Build **one complete forest expedition** from the Isareos side into the Ibenwood margins, before building the whole deep forest.
4. Develop the **Nether Desert–Pyros–Telemonia approaches** as a contrasting dry-country journey.
5. Establish the **South Oremindi approach**, where the existing campaign converges. Expand the higher range and Thalmagar only once its traversal and danger are designed.

The larger packages below cover every remaining atlas region. Their order is a production proposal, not a compulsory player itinerary. East Izol and short maritime extensions are useful smaller projects between the larger terrain groups.

## What is actually left

The atlas has **131 regions**. The main build, including West Lotharn, registers **27**: Drent is marked built out; Luscia and Moros Plain are marked playable; 22 are early builds; East Suval and Feradom are marked edge/access builds. The latter two already have substantial terrain. Their access restrictions should not be mistaken for missing geography.

That leaves **104 regions outside the integrated regional build**. Four of those—the Mithalas—already have work in progress in the separate `azhora-game-mithala` checkout. That leaves **100 additional regions** without comparable construction identified in this audit.

These labels are a starting inventory, not certification that the 27 are complete. Existing build descriptions contain stale details, and Cape Thalmagar has a fortress/developer-view prototype despite lacking a normal integrated region build. The developer status list currently covers only 70 of the 131 atlas regions. A complete ledger and a review of existing content should precede broad expansion. Keep a separate completion track for the 27 integrated regions: existing quests, travel, settlements and unfinished mechanics still need their own reviewed work. Building terrain in the other 104 does not make the existing regions, or the game, complete.

Use the current `src/world/terrain/region-levels.js` danger ladder. The older campaign table is incomplete and uses a different scale. Preserve canonical atlas IDs, including unusual spellings, until a deliberate compatibility-safe naming cleanup is approved.

## What each region brief should contain

| Design decision | Required result before construction |
| --- | --- |
| Geographic identity | A short description of the landform, three to five defining natural features, and how it differs from adjacent countries. These are proposals until checked against the atlas and lore. |
| Connections | Actual shared borders, passable approaches, rivers, shore access, and a reason for every restriction. No unexplained invisible walls. |
| Height and drainage | A shared border profile, downhill water, coherent catchments, and elevations relative to neighboring landmarks. Do not design isolated peaks and connect them afterward. |
| Climate and ecology | Per-hex atlas climate, an appropriate tree-species mix, ground plants, wildlife habitats, and changes with altitude or exposure. |
| Exploration | One clear initial approach, one alternate route, a recognizable destination/viewpoint, and optional difficult ground. Natural routes need not become constructed roads. |
| Skill opportunities | Which existing skills the landscape supports and which opportunities are only proposed for later. Do not add a new teacher to fill a perceived gap. |
| Danger and refuge | Readable warnings, retreat routes, resting ground, and how terrain difficulty matches the current region level. New enemies, hazards, and shelter rules need their own approval. |
| Human presence | Existing lore landmarks and their proposed treatment. Civilian characters, homes, settlements, and quests are separately reviewed. |
| Presentation | Ground-level, route, distant skyline, and aerial views using the existing low-poly visual language. |

The atlas takes precedence over contradictory geographic prose. Keep the World Builder repository read-only; record unresolved lore discrepancies in the game design documents.

## Geographic work packages

### A. Connected frontiers — 13 regions

**South Mithala, West Mithala, East Mithala, North Mithala; South Celder, North Celder; Yunethre; Nether Desert; East Pyros, West Pyros; Telemonia; Legemum; East Izol.**

The Mithalas are already in progress with region IDs 28–31 reserved in that worktree. Their existing brief is terrain, climate, water, scenery, and wildlife only. Do not restart them or silently expand that brief to towns, farms, roads, or people.

The atlas provides clear connections: both Lotharns meet South Mithala; West Lotharn meets South Celder and Yunethre; the Oves/Nethereum country approaches the Nether Desert; the Oves Desert meets East Pyros and Telemonia; Gala meets Telemonia and Legemum; West Izol meets East Izol.

Design distinctions: Mithala's floodplain and braided drainage; Celder's grassland, horse ecology and faster mountain-fed streams; Yunethre's corridor between two different mountain systems; the upper Neth's dry drainage; Pyros's old volcanic soils, basalt and scattered geothermal remnants; Telemonia's ridges and pasture; Legemum's coastal landforms. These should form continuous transitions rather than abrupt biome swaps at hex borders.

### B. Western forest and its margins — 9 regions

**North Ibenwood, East Ibenwood, South Ibenwood, West Ibenwood, Central Ibenwood; North Ibenal, South Ibenal; Alezhor; Navarth.**

Begin at the accessible Isareos-facing margins and build inward. Use forest-floor visibility, canopy structure, waterways, fallen trees and terrain to distinguish a deep forest from Drent. Simply multiplying tree density would obscure navigation and hurt performance.

Ibenwood has detailed tree and ground-flora lore to work from. Ibenal is a narrowing coastal corridor; Alezhor has forest rivers with gold-bearing geology; Navarth is a colder pastoral transition from volcanic country. Proposed skill emphasis: botany, woodcutting, foraging, cartography, stealth and, where appropriate, farming. The user's dangerous ivy belongs in a later forest gameplay brief; Sylvia's manageable Drent ivy remains the introductory form.

### C. Southern dry-to-tropical country and nearby islands — 15 regions

**Ganesh Plain, Ganesh Desert; North Meroshe Desert, West Meroshe Desert, South Meroshe Desert, Central Meroshe Desert; Hama, Marosh, Trogo, Babon; Cape Heth, Dinelv Highlands; Selemi, Aurumlis Archipeligo, Azhor Stones.**

Treat rainfall, drainage and rain shadows as shared systems. The visual progression should pass through grassland and dry pasture into desert, then through appropriate escarpments and wetter slopes into tropical country. Ganesh's drought cycles, Meroshe's dry channels and ruined places, Trogo's desert/forest contrast, and Babon's jungle interior need separate briefs.

Existing Peblos and Iscare should establish the boat-travel standard before wider island construction. Design navigable coastlines, sheltered landings and visible water hazards before adding distant destinations. Heat, water supplies, storms and caravan gameplay are proposals, not requirements silently added during scenery work.

### D. Oremindi and the Thalmagar approach — 9 regions

**South Oremindi Mountains, East Oremindi Mountains, West Oremindi Mountains, North Oreminidi Mountains, Lesser Oremindi Mountains; Cape Thalmagar, Cudon, Narcosh, Henborth.**

Start with South Oremindi because the existing campaign converges there. These mountains should differ visibly from Lotharn: glacial valleys, sharper ridges, exposed high ground and seasonal passages, rather than the same forested sandstone ledges at a larger scale. Narcosh's ledges, thermal springs and goat habitat and Cudon's gateway role provide useful lore anchors.

Design a complete ascent and safe descent before dressing a peak. Decide where climbing, rest ledges, supplies and cold exposure matter; then test with real stamina and collision. Preserve the distinctive Thalmagar prototype while preparing a separate terrain/ecology brief for its isolation and archaic fauna. Its high difficulty should not be reduced to a larger enemy health bar.

The detailed [West Oremindi and Sevron plan](sevron-west-oremindi-design.md) now governs that region's future build, after Baldro Dwarfland. It preserves the actual western sea coast and separates the ancient drowned dwarf capital from the later hidden elven settlement.

### E. Northern interior — 20 regions

**Acor Wetlands; North Acorwood, East Acordwood, South Acordwood, West Acorwood; North Endevor, East Endevor, South Endevor, West Endevor; North Lond, East Lond, South Lond, West Lond, Central Lond; North Ganun, East Ganun, South Ganun, West Ganun; North Nonoth, South Nonoth.**

Build outward from Mithala through the wooded and wetland barriers into the northern basins. Acorwood's ancient forest should be difficult to navigate for different reasons from Ibenwood; Acor Wetlands needs dependable distinctions between firm ground, shallow water and unsafe crossings. Endevor's pastoral terrain, Lond's grain plateau and Ganun's river/coastal geography should establish contrasting horizons and travel rhythms.

Farms and human landmarks should be designed using the existing farming system and lore, but introduced in a separately approved settlement pass. Wilderness construction must not manufacture their inhabitants or politics.

### F. Far north and cold seas — 21 regions

**Noth Hills, Nothwood; North Thoth, Central Thoth, South Thoth; North Orsa, South Orsa; East Witherst, West Witherst; North Gorgi Mountains, East Gorgi Mountains, West Gorgi Mountains; Eshtor Plateau; East Baldro Mountains, West Baldro Mountains; North Riesov, South Riesov; Orgmala; East Inseld, West Inseld; Cold Stones.**

Differentiate these landscapes before choosing a snow palette: glacial erratics and caves in Noth Hills; boreal spruce, fir and birch in Nothwood; tundra and seasonal animal ranges in Thoth; glaciated barrier passes in Gorgi; exposure on Eshtor; older mineral-rich Baldro mountains; cold coasts and amber country in Witherst; Inseld's skerries.

This package depends on reviewed cold-weather and expedition design. Seasonal wildlife, shelter, navigation and dangerous weather can provide difficulty without covering every hex with monsters. Wilhelm's Inseld history is established background; it does not authorize a new encounter or a complete northern story arc.

### G. Remote southern island world — 17 regions

**Anubrul, Barqat, Haatrul, Maanub, Maawad, Nuurat, Qadmar, Qadwaaqaad, Rihas, Riwaad, Sabrqad, Saxhan, Saxrul, Waahaat, Waahan; North Scythe, South Scythe.**

The first fifteen have atlas names and difficulty assignments, but no matching dedicated regional lore was identified in this audit. They need authored terrain/ecology briefs before detailed construction. Their names are not a basis for inventing cultures, residents or architecture.

Scythe's prose geography conflicts with its distant southern atlas placement; resolve that explicitly before designing approaches. Treat this group as later marine expeditions, with boat range, landing access, supplies and return journeys settled first. Do not attach all of it to the beginner ferry network.

## Shared systems to prepare before multiplying the world

The world still builds static outdoor scenery before play, then culls distant objects. The October 2 startup pass caches base terrain on desktop, reduces repeated terrain and road calculations, stages loading with progress messages, defers named human rigs and dwarven interiors, and loads/unloads regional wildlife visuals by distance. Logical wildlife and quest state remain independent of those visuals. These are measured startup improvements, not full regional streaming; multiplying static scenery across all 131 regions still needs the work below.

Proposed sequence:

1. Record cold start, time until controllable, frame-time percentiles, transition pauses, memory, draw calls, triangles, active actors and collision work on a stated desktop configuration. Baseline the browser/phone target separately.
2. Separate permanent world data from rendered objects. Terrain/water queries, routes, quest progress and sparse saved changes must remain valid when a region is not visible.
3. Pilot nearby detail loading with one existing region and one wilderness family. A 128-metre chunk is a starting experiment, not a fixed design decision. Keep distant mountain silhouettes and water visible; load trees, detailed terrain, groundcover, colliders and animal rigs nearby.
4. Construct detail incrementally, with direction-aware preloading and different load/unload distances. Pin nearby quest interactions, fights and cave transitions while in use. Offscreen NPC routines and quest travel must keep progressing as world data without retaining every rendered chunk along a long route. Add worker generation only after lifecycle correctness.
5. Maintain stable entity identities and save deltas independently of loaded meshes. A cut tree must stay cut after leaving, reloading, or approaching from another direction. Existing generation-order IDs need preservation or explicit migration. Tree removal should not rebuild the entire world's collision index. Define ownership of shared geometry, textures and materials so unloading one chunk neither disposes resources its neighbors still use nor leaks abandoned resources.

Initial performance goals for review: 60 fps at 1080p desktop; investigate p95 frames above 20 ms and transitions above 50 ms; start with roughly 2 ms of incremental construction per frame. These are proposed targets, not measured claims. Test walking, ferries, F8 travel, caves, distant quest actors and the actual 240 m/s developer turbo flight. Streaming must never expose absent landing terrain.

## The standard for accepting a region

- Its atlas outline, displayed map, rivers and actual ground agree; border transitions are inspected from both sides.
- Its main approach and intended exploration route are completed with real movement, stamina and colliders. A mathematical slope flood-fill alone is insufficient.
- Every tree has a species, correct timber behavior or an explicit protection reason, stable identity, and roots on the rendered ground.
- Wildlife is persistent and distributed through relevant habitats, including interior woodland and open country. Quiet patches are intentional; whole empty interiors are not an accidental consequence of spawn placement.
- Rocks, plants, props and animals have credible ground contact. Cave entrances work in both directions and retain safe checkpoint behavior.
- F8 offers a safe arrival; the chart records exploration correctly; old saves remain loadable; ordinary flight and locked borders retain their intended restrictions.
- Four views are reviewed: arrival at player height, a representative interior habitat, the principal route, and the skyline. Aerial beauty does not substitute for a good walking experience.
- A short report records what is built, what is still deliberately absent, test results, performance changes and unresolved lore decisions.

Work in batches of one to three neighboring regions, except already coordinated groups such as Mithala. Review each batch before extending its approach across an entire continent.

## Decisions for our review

1. **Breadth or depth first?** I recommend a polished connected northern/western corridor after Mithala, rather than a thin first pass over all remaining regions.
2. **What belongs in the next construction pass?** I recommend terrain, water, species, wildlife and natural traversal first; settlements and characters remain individually approved. Existing authorized Mithala work retains its stricter scope.
3. **Which journey should follow the Lotharn approaches?** My preference is an Ibenwood-edge expedition for forest variety, then the dry-country approaches; South Oremindi can move ahead if advancing the main campaign matters more.
4. **Which new survival systems should exist?** Cold exposure, heat/water requirements, dangerous ivy and expedition supplies need separate design choices before they become prerequisites for entering regions.
5. **What should the remote southern islands be?** Their missing briefs and the Scythe atlas/lore conflict need author input before detailed design.

The September arrival, first full-moon night, winter invasion and Chapter 3 army chronology remain in the separate planning proposal. This expansion plan does not resolve those outstanding choices, change the April opening, unlock East Suval, add general player flight, or invent later chapters.

## Sources and accompanying records

- [Atlas export](../assets/azhora-dev-regions.json), and the World Builder map's per-hex climate data.
- [Build status](../src/dev/tools/build-status.js), [current danger levels](../src/world/terrain/region-levels.js), and [wilderness handover](wilderness-handover.md).
- [Campaign design](campaign-design.md) and [Chapter 3/autumn proposal](chapter-3-autumn-proposal.md).
- Regional geography and flora/fauna files under `../../world-builder/azhora_lore/`, read without modification.
- Existing Mithala work and its brief in `../../azhora-game-mithala/docs/mithala-brief.md`.

No implementation of these future work packages is part of this document.
