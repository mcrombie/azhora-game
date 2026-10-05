# Joint terrain and wildlife completion plan

**5 October update:** [33 northern and island environments](outer-regions-environments.md) are integrated, including Gorgiwood, South Gorgi Mountains and both Ithzel regions. Unbuilt countries are gray on the map. Southern jungle development is on hold; further loading optimization is paused.

Prepared 3 October 2026. **Implementation began with user authorization on 4 October 2026.** Claude has delivered the Celder pair, East Izol and Alezhor. ChatGPT is integrating corrected deliveries and completing the existing-region review in a separate worktree. The [live ledger](regional-completion-ledger.md#live-handoff-record) records what has actually started and passed. This document does not schedule unattended work.

Claude will build the remaining regional environments. ChatGPT will first review and correct the existing Claude region backlog while Claude works on the next build, then review and correct every new delivery. The aim is a continuous, distinctive world that works from the player's height, with reliable traversal, believable habitats, and manageable loading costs.

This plan replaces the inventory and production order in the September [remaining regions draft](remaining-regions-design-plan.md). Existing user decisions and specific regional briefs remain authoritative. The [completion ledger](regional-completion-ledger.md) contains the complete build queue and the inventory of existing environments.

## Scope and inventory

The main checkout at `a2e49c3`, including its current local changes, has **60 registered regions**. The authored atlas has **131**. The remaining **71** comprise South Celder and North Celder already under construction, plus **69 other regions**. Cape Thalmagar is among those 69 but already has a fortress prototype to preserve. These are environment counts, not claims that 60 regions have finished gameplay.

The Celder worktree is `../azhora-game-celder`, branch `celder`, based on `a2e49c3`. On 4 October Claude delivered a clean handoff at `136b582` (build `e7012d9` plus the report and loading label). South Celder and North Celder have provisional runtime IDs 61 and 62 there. Preserve that frozen delivery; do not create a competing Celder implementation. Intake is recorded separately from acceptance, which follows the existing review backlog. Older dirty Feradom work has already been integrated; character work and historical checkouts are not new region assignments.

The full atlas, not `buildStatusList()`, defines completeness. At the planning baseline that function returned only 73 entries because its fallback read the incomplete campaign registry; **58 atlas regions were omitted**. The first review batch repairs inventory coverage to all 131 without pretending the unbuilt ones are accessible. Preserve existing runtime IDs and append new ones. Atlas identities are the exact name strings, including unusual spellings.

Environment completion includes terrain, coastlines, mapped water, vegetation, typed trees, wildlife, natural traversal, natural landmarks, map discovery, developer arrival, loading integration, and validation. It does not require new settlements, civilian NPCs, farms, armies, faction plots, quests, trade, shipping services, survival meters, or interiors. Preserve all existing authorized content. New natural caves can be included where the terrain brief supports them; they must use the existing safe entry and save behavior.

The 131-region atlas is the boundary of this project. An uncharted hidden island is not silently added as a 132nd task. Remote environments can be tested through developer travel before ordinary boating exists. Existing closed borders, Elfland restrictions, Varn's admission rules, and the story's reserved areas remain intact.

## Roles and sequence

| Role | Responsibility |
| --- | --- |
| Claude | Read the current brief and atlas; build one bounded region or connected pair; provide focused tests, usable captures, a route demonstration, performance measurements, and an honest report. |
| ChatGPT | Maintain the queue and common base; prepare the next brief; review and directly correct the existing backlog; inspect every incoming build; resolve shared integration; verify corrections; maintain the desktop test build. |
| User | Change priorities or resolve a substantive new lore or scope decision. Routine terrain choices and corrections do not need repeated confirmation. |

The next authorized implementation session starts as follows:

1. Recheck main, remote refs if available, and every active worktree. Preserve current developer-dragon fire work and any newer user changes. Establish a clean, recorded integration base without sweeping unrelated work into a region commit.
2. Establish communication with the user's actual Claude session. Send this plan, the ledger, the pinned base, and the Celder assignment. If Celder is already being built, adopt its current status instead of starting a second worker. If it has finished, collect its handoff and assign the next eligible ledger row.
3. Once Claude is working or its running session is confirmed, ChatGPT starts the existing-region review sequence below. ChatGPT finishes that backlog before starting substantive acceptance review of the new queue. Brief preparation and handoff bookkeeping can continue meanwhile.
4. Claude may start the next independent region while a completed delivery waits. During the initial backlog, allow at most **four delivered regions awaiting review**, plus one active assignment. Once ChatGPT catches up, reduce that to **two awaiting review**, plus one active assignment. If the limit is reached, Claude prepares briefs or addresses returned defects rather than expanding an unchecked backlog.
5. After the existing backlog closes, ChatGPT reviews deliveries in geographic dependency order. A failed dependency takes precedence over extending the next country across it. Routine local corrections are ChatGPT's work; a large structural rebuild can be returned to Claude with a precise defect list.
6. Continue until every atlas region has an accepted environment, or the working session ends. At session end, persist exact revisions, open defects, and the next assignment. Do not imply the work will continue after the applications or computer shut down.

### Connecting to Claude

This planning session has no exposed Claude connector, and a Claude executable was not found on the current command path or the checked standard user install locations. The existing Celder checkout demonstrates work in progress, but does not establish an agent-control connection.

At execution time, use the user's available Claude Code/app connection if it is accessible. Do not substitute a ChatGPT subagent and label it Claude. If a direct connection is still unavailable, the user launches Claude with the handoff text below; both assistants exchange committed revisions or explicitly frozen patches and repository reports. ChatGPT can perform its review backlog while Claude works independently. No install, account change, or new connection is part of today's plan.

### Opening handoff to Claude

> Read `docs/regional-completion-joint-plan.md` and `docs/regional-completion-ledger.md` from the agreed integration revision. Work on terrain, water, vegetation and wildlife only. First report the status of `azhora-game-celder`; continue its two countries if unfinished, otherwise deliver them and take the next assigned region. Work only in the assigned worktree. Preserve the atlas, existing story constraints, region IDs and saved entity identities. Deliver one region or agreed pair with the report and checks defined in this plan. Do not merge or push the integration branch yourself. Do not change the World Builder repository. Stop expanding the queue when the review limit is reached.

## ChatGPT review backlog

These are inspection and correction assignments, not declarations that every listed country is broken. Reproduce each suspected defect on the current integrated revision before editing. Historical fixes are regression checks, not new repair tasks.

| Order | Existing region group | Review and correction focus |
| --- | --- | --- |
| R1 | East Lotharn Mountains; Varn in Amod; pass forts affecting West Lotharn and Vastos | Break up repeated cliff rings and tree belts while retaining sedimentary character, established heights and places. Use soil, exposure and shelter for vegetation. Restore useful approaches to the eastern chamber and low chimney without bypassing Varn's closed gates; verify the already-restored high chimney. Test the Slabs with actual skill, stamina and falling. Spread appropriate animal encounters into woodland. |
| R2 | West Lotharn Mountains and Feradom | Keep the integrated continuous summits, tree grounding and proven crest route. Review silhouettes, cave mouths, ordinary descents, forest wildlife and Feradom's hill-to-plain transition. Verify the existing farms and animals rather than reassigning the historical empty-plains issue. Coordinate its Celder-facing edge before Claude freezes that seam. |
| R3 | Telemonia and its borders | Walk the country and town, inspect fields at player height, vary overly regular natural landforms, and verify challenge, escort, return hostility, western sneaking and saves. Three western watchers already exist. Recheck the repaired Treloss outlet/banks and Telemonia–Legemum–East Pyros joins. Preserve explicit outsider rules and available infiltration. |
| R4 | Navarth, West Pyros, Ganesh Desert, Ganesh Plain | Walk the connected approaches, inspect open-country ground detail and dry drainage, and check habitat-based wildlife and ghubr behavior. Verify the current Pyros/Oves and Nether Desert seams; do not redo repairs solely because an old report lists them. |
| R5 | North, West, Central and South Meroshe Desert | Make each quarter recognizable at ground level. Check dune routes, fans, pans, stone surfaces, vegetation pockets and sparse wildlife. Correct reports that describe unimplemented sand-speed, heat or navigation restrictions. Favor physical route readability; a new movement penalty is a separate design change. |
| R6 | Cape Heth, Dinelv Highlands, Hama | Inspect exposed/sheltered coast, plateau ascents and descents, seasonal drainage, ground contact and habitat transitions. Verify that intended routes are traversable rather than relying on slope samples alone. |
| R7 | Marosh and Trogo | Inspect canopy layers, irregular clearings, slopes and the desert/forest edge. Visible thickets must match collision and sightlines. Test animal paths, retreat and wildlife beyond set-piece clearings. Preserve meaningful density without turning ordinary forest into unexplained collision walls. |
| R8 | South, West, East and North Mithala | Check the connected catchment, stream crossings, floodplain and plain-margin differences, wildlife visibility and seams with Celder and the future Acor regions. |
| R9 | Selemi, Gala, Northern Ascarth, Southern Ascarth, Ovesos and Oves Desert | Review shores, inland routes and ecological coverage; verify existing Aevis reservations, walls and harbor interfaces. Selemis remains a landscape build, not an unbuilt-city task. Record ordinary water access honestly and retain safe developer arrival. |
| R10 | Earlier Claude-associated and mixed builds: Pueth, Peblos, West Izol, Elagos, Vastos, Meneth, Caricas, Nesdor, Eer, Isareos, Nethereum, East Suval and South Suval | A lighter but explicit environment sweep protects earlier contributions and shared systems. Check off-road habitats, water, typed trees, ground contact, city and quest clearings, and adjacent-region movement. Expand to a repair only where evidence shows a problem. Do not attribute later shared work exclusively to Claude. |
| R11 | Shared starting-country coverage: Drent, Luscia, Moros Plain and West Suval | Check potentially thin coast, valleys, downs and off-road plain against current source and native play. Preserve the tutorial and existing quests. These are coverage checks beyond the Claude backlog, not claims of Claude authorship. Correct small gaps directly; turn a substantial missing environment into a bounded Claude follow-up after the initial backlog. |

R1–R11 cover **45 distinct existing regions**; the Vastos and West Lotharn overlap is intentional because Varn affects them. The ledger names the other 15 integrated regions separately so all 60 stay accounted for. Those receive boundary and shared-system regression checks, not an automatic aesthetic rebuild. If that inspection exposes an actual terrain or wildlife gap, add a bounded finishing assignment; registration alone never certifies completion.

The [East Lotharn landscape plan](east-lotharn-mountain-plan.md) supplies useful aesthetic proposals, but its old integration status and open questions are historical. The present climbing system and later Varn decisions govern the review. The [West Lotharn integration record](west-lotharn-integration.md) identifies fixes already made. Review report dates and current source together.

## Building a region

Before implementation, Claude writes a short brief using the exact atlas region identity and neighboring countries. It records the atlas terrain/climate mixture, mapped water, a distinct landscape character, three to five natural features, habitat and species choices, intended player routes, and explicit exclusions. Distinguish author lore from builder proposals.

Use the atlas footprint and per-hex terrain/climate before interpreting lore. A region named mountains can contain extensive lower ground; a region named wood need not have a snowy climate. Keep the World Builder repository read-only. The Celder brief contains an instruction to rewrite lore in that repository; this joint plan does **not** adopt that instruction. Record a discrepancy and proposed wording in game documentation instead.

Design neighboring relief and water together, but deliver bounded pieces. A large region or difficult cave system can occupy a whole assignment. Connected pairs may share one terrain design and use separate terrain/life workers if Claude controls nonoverlapping files. Four- and five-part geographic families are planning groups, not permission to hide all of them in one large unreviewable delivery.

Every brief must establish:

- A continuous principal journey with a destination and return; optional challenging terrain that uses existing climbing and falling correctly. Difficulty is not an invisible regional wall.
- Shared elevations, channels, shore levels and drainage direction at every built neighbor. Future-neighbor joins are recorded as provisional and rechecked when that neighbor lands.
- Vegetation varied by substrate, slope, exposure, water and disturbance. Every tree has a registered species and intentional harvest/protection behavior. Fallen wood and Elfland's felling prohibition keep their existing rules.
- Animal habitats that the player can encounter along and away from principal routes. Include forest interiors where appropriate. A naturally sparse desert or small island need not acquire deer or a mammal quota. Explain quiet ground rather than treating a raw animal total as coverage.
- A characteristic skyline and views at player height. Repeated color swaps, evenly spaced shelves, identical cave arches and uniform vegetation belts are insufficient distinction.
- Reserved footprints for already approved towns, quest routes and historical sites. Environment work may shape surrounding ground, but does not invent their inhabitants or build a new city from a lore mention.

For the remote southern lands, use their real adjacency and per-hex climates. Propose ecology from those facts where dedicated lore is missing. Do not infer culture, architecture or inhabitants from a name. Record speculative species or geology as builder choices so the user can revise them later.

## Branches and handoffs

ChatGPT owns a clean integration worktree and the queue. Claude works in a separate assigned worktree based on an explicit commit. Existing Celder instructions prohibit its workers from committing, pushing or stashing; honor that handoff until its coordinator freezes the changes. A frozen diff plus all new files is acceptable when a commit is not available. Never review a source tree that is still being edited as though it were an immutable delivery.

Give each assignment a region list, base revision, output branch or patch location, file ownership, shared-border constraints and report path. Maintain only one writer per worktree. Each assistant may make narrow shared-file changes in its own branch; ChatGPT alone resolves their integration into the main build. Review `main.js`, `world.js`, `world-terrain.js`, wildlife registries, region/map tables and the test manifest particularly carefully.

Append runtime region IDs centrally. Preserve existing IDs, seeded scenery order, tree IDs, wildlife state keys, reserved areas and `world.paths[0]` as the main story road. Use isolated deterministic streams for new scenery. Do not transplant generated files or whole shared registries from a stale branch; regenerate from the combined source after integration. Preserve file line endings and unrelated edits.

Intake distinction (4 October): preserve the identities and seeded layout of regions already in the main build. For a newly delivered, not-yet-integrated region, an independently reproduced placement change caused by an approved neighboring-ground correction can be accepted and documented before freezing its first combined baseline. Record the exact source comparison and affected IDs/batches; do not silently repin an existing region. Avoid retaining historical broken terrain through extra runtime compatibility switches solely to recover incidental placement in an unshipped candidate. Subsequent cosmetic grounding must preserve that frozen combined layout.

The handoff report lives at `docs/region-reviews/<assignment>-handoff.md` and includes:

| Field | Required information |
| --- | --- |
| Revision | Base and delivered commit, or frozen patch identity and file manifest; working tree state. |
| Scope | Exact regions, files and runtime IDs; implemented features, omissions and builder choices. |
| Border contract | Neighbor names; sample coordinates, elevations, water levels and any reserved approaches changed. |
| Journey | Reproducible start/destination/return coordinates, expected skill/stamina, normal controls and observed outcome. |
| Evidence | Test commands, named failures, renderer errors, screenshot paths, date and revision for each capture. |
| Performance | Same-machine before/after results, mode, cache state, scene/view and hardware context. |
| Persistence | Stable species/entity IDs, relevant save/reload results and any migration. |
| Next action | Known defects, questions if unavoidable, and what the next neighboring build needs to preserve. |

ChatGPT writes `<assignment>-review.md`, applies corrections on the integration branch or sends a numbered structural correction request, then records the revision that actually passed. Keep screenshots/logs in `tests/artifacts/`; their normal ignored status means the report must identify the checkout and paths. Share copies through an agreed artifact directory when necessary. A report cannot rely on screenshots only available on an unknown machine.

## Acceptance checks

Acceptance means **terrain and wildlife accepted**, not a finished regional story. Every new region and every materially reshaped existing region receives these checks:

1. **Atlas and water:** outline, ownership, chart position, biome, shore and rivers agree. Walk shared borders in both directions. Numeric seam probes flag discontinuities but must distinguish an authored physical cliff from an accidental hex-edge step. Streams and river mouths reach their receiving water, with credible banks on both sides.
2. **Real movement:** traverse the promised journey with production collision, stamina, climbing, falling and water. Check ascent and descent separately. Teleporting to the start is allowed; flying or unlimited stamina is not proof of a walking route. Preserve intended high-skill gates. Cave approaches, portals, floor ownership and safe recovery work in both directions.
3. **Visible ground:** trees, animals, paths, props and cave mouths meet the terrain that is actually rendered, including detailed meshes. Check representative steep, flat, shoreline and habitat-transition sites. No floating roots, invisible ledges or submerged dry-land spawn points.
4. **Living environment:** inspect species, behavior, habitat coverage and visibility during an ordinary journey and a woodland/interior detour. Test plausible water/shore limits and predator/prey or herd behavior when implemented. Large empty habitats and scenery-only animal counts need correction or an ecological justification.
5. **Visual judgment:** review arrival, an interior habitat, a principal feature at player height, skyline and overview, plus a short native journey. An occluded or inside-wall capture is missing evidence and must be retaken. ChatGPT may alter repetitive or implausible scenery within the approved design.
6. **Full and Fast loading:** reach an initially unbuilt destination via developer travel, then approach across a border, leave and return. Terrain, colliders, walkways and interactions must be ready before releasing the player. No duplication, missing landing surfaces or progress that falsely says ready. Retain Full as the default with its ten-second chooser.
7. **Map and saves:** verify F8 arrival, normal discovery, journal map and developer status. Load an older save. Check cut trees, defeated wildlife and relevant local persistent state across departure/reload. Do not expose undiscovered hidden settlements through new map markers.
8. **Regressions:** test affected neighbors and shared systems on the final combined revision. Compare new failures with the exact base; dated known-failure totals are insufficient. Keep unrelated failure names and evidence visible rather than silently changing assertions.

Use `node scripts/run-tests.cjs` with a focused list from `tests/test-manifest.json`, running heavy world fixtures in separate processes. Every added test file must be in the manifest. One native Electron smoke/review process runs at a time across both assistants on this machine; the ledger records who holds that slot. Batch useful views in a single native launch. After corrections, repeat affected checks rather than rerunning the entire world after each cosmetic change.

A milestone integration run checks shared geography, loading, saves, the tutorial/main road and a representative existing quest. Run the broad manifest at major stable checkpoints and at the final completion gate, with failures reconciled, rather than promising a full-suite run after every region.

## Performance and shared preparation

Before multiplying regions, record the current Full cold/cached startup, Fast time to control, destination wait, background completion, longest build slice, representative frame-time distribution, renderer memory/draw calls/triangles and active actor counts. Compare on the same machine, resolution, view, mode and revision. Do not reuse old README timings or region/job counts as the present baseline.

Use existing per-region construction jobs, incremental builders, instanced scenery, distant culling, wildlife visual loading and stable logical state. A deferred builder that does all its work in one synchronous call can still freeze Fast mode; inspect actual slice times. Do not assume the current system unloads all distant static scenery. Profile memory after distant travel and return, as well as initial startup.

Proposed review triggers are a reproducible regression above 10 percent in time-to-control, destination wait or representative memory, or new construction frames above 50 ms. These are investigation thresholds, not permission to accept every smaller regression. A 60 fps desktop experience remains a design target, not a measured guarantee. Establish attainable budgets from the baseline before the first new delivery.

If projected all-region loading or memory becomes unreasonable, ChatGPT pauses further integration to make a measured shared loading correction. Claude may continue bounded independent work up to the queue limit. No region may solve performance by silently dropping wildlife, erasing trees, breaking saved state or making nearby terrain absent. Use the current developer flight/turbo settings in an arrival stress test; do not hard-code historical speed numbers into the plan.

## Progress and completion

The ledger's states are `Queued`, `Building`, `Ready for review`, `Changes required`, `Accepted`, and `Deferred decision`. A region moves to Accepted only when its final integrated revision and evidence are recorded. Groups remain open until each member is accepted. New discoveries or a later adjoining build can reopen a specific seam without pretending the whole region was never built.

ChatGPT reports accepted regions, regions being built, regions waiting, substantive corrections, performance changes and the next action. Report elapsed time and model usage only when the tools actually provide them; do not invent a combined token cost or promise 71 regions in a day. Use the first Celder handoff and first completed review group to estimate throughput. The work may span several long sessions.

At the end of each session, record the current base, branches, dirty work, native-test slot, handoffs, accepted revisions, open defects and the next exact assignment. Stop active launches before shutdown if requested. Git commits and publishing are performed under the user's authorization at execution time; today's planning pass neither commits nor pushes.

The final gate reconciles all 131 atlas names against accepted environment records, verifies the developer inventory and main registration, audits previously provisional seams, checks representative cross-country and island journeys, and records remaining non-environment content separately. No region disappears from the count because its lore is sparse, its access is restricted, or its name differs from a display label.

## Source records

- `assets/azhora-dev-regions.json`, `src/region-layout.js`, `src/region-world.js`, `src/build-status.js`, and `src/region-levels.js` for the current atlas and registrations.
- Regional world/scenery/wildlife modules and `src/region-loading.js` for actual behavior.
- [Design answers](design-answers.md), including later Varn and Telemonia decisions, and the existing regional briefs and reports.
- [Northern integration](northern-regions-integration.md), [West Lotharn integration](west-lotharn-integration.md), [Telemonia report](telemonia-stage2-report.md), and [Varn report](varn-report.md).
- The frozen Celder brief, report and source at `136b582` in `../azhora-game-celder`; preserve that checkout and resolve integration separately.

No game implementation was started during the original planning pass. The live ledger now records separately authorized implementation.
