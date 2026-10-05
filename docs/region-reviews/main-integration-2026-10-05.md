# Main checkout integration: Eshtor, Ibenal, Henborth and Mithala

5 October 2026. This supplements Claude's [branch integration handoff](integration-2026-10-05.md); it records the later port into the desktop checkout, whose uncommitted content has advanced beyond that branch.

## Delivered and integrated

Claude's `integrate-2026-10-05` branch through **`b58d1b4`** supplies **South Ibenal, North Ibenal, Henborth and Mithala city**. These are the delivered names found in the commits. The integration preserves the already reviewed Celder, East Izol and Alezhor work rather than replaying their raw original branches.

The desktop checkout also gains [Eshtor Plateau](../eshtor-plateau.md). There are now **116 registered regions and 15 unbuilt atlas regions**. The atlas still has 131 regions.

This is a content integration into the existing main working tree. No reset, checkout replacement, blanket commit or push was performed. The source branch's commits remain intact. Source snapshots and three-way comparison files are kept under the ignored `tests/artifacts/integration-2026-10-05-current/` directory.

## Reconciliation

- The current checkout already uses IDs 65–67 for Oremindi content. Claude's provisional Ibenal/Henborth IDs become **114: South Ibenal, 115: North Ibenal, 116: Henborth**. All existing IDs remain stable, including Eshtor at 113. Registry, terrain, shared river ground, loading, discovery, travel, language and biome references use the new IDs.
- Mithala's four-cell region trade is combined with the newer map naming corrections. The 22-building city, bridges, ford, quay, fortified core and climbable sky tower are integrated with its surrounding plain. The plain's pre-trade scatter order and the recorded instances removed for city construction are retained.
- Newer cities, environments, terrain composition, scenery residency and Full/Fast startup behavior are preserved. Generated atlas, survey, rivers and map assets are refreshed through their scripts; World Builder is not edited.
- Two competing grey-seal model definitions were reconciled in favor of Claude's detailed animated model, which now also serves the outer island populations.
- Four Mithala city test files missing from the explicit test manifest were registered.
- A North Ibenal deer pair duplicated an outer-island pair's layout. Its second home was moved slightly on dry ground, and the uniqueness check rerun.
- The Acorwood Horizon viewpoint was moved 80 metres back onto Mithala's plain. Its old point had become part of the newly built South Acordwood. Obsolete test assumptions about unbuilt northern neighbors and world bounds were updated without changing regional terrain.
- The tower-top review camera was raised above the thick parapet, where its original downward sightline had been obstructed. This changes the inspection view, not tower geometry or traversal.

## Verification

- Terrain, climate, river, registration and outer-profile batch: 45/46 passed; the remaining test was denied child-process creation by the sandbox and passed when rerun with process permission (1/1).
- Mithala city scenery, buildings and production-world traversal: **25/25**. Includes the three bridges, ford, quay, districts and tower staircase.
- Ibenal scenery and wildlife behavior: **14/15 initially**, with the repeated deer layout above as the sole failure; its corrected layout, habitat and scenery-clearance checks pass 3/3. Ground/water homes, flee behavior, return behavior and seal haul-outs passed.
- Henborth scenery and wildlife behavior: **15/15**.
- All 34 outer environments: **3/3 production integration checks**, including **68 arrival traversals** and actual wildlife instantiation after the shared seal-model reconciliation.
- Eshtor: **2/2** dedicated checks.
- Map/atlas/cartography/loading and Mithala regression batch: 74/77 initially; the three obsolete or displaced-landmark assertions were corrected, and the full Mithala file now passes 14/14. Mithala scenery preservation passes 5/5 and Alezhor integration passes 5/5.
- Native isolated-save screenshots: South Ibenal coast, North Ibenal seal, Henborth, Mithala overview and street, tower, and Eshtor Long-Backs. All requested captures completed with `errors: []`. The combined Electron session subsequently exited 1 with a Chromium GPU shutdown diagnostic; capture completion is not recorded as a clean process exit.
- Final Celder regression: **5/6**, with all continuous travel routes and North-first water loading passing. The scenery identity/contact assertion fails. An isolated reconstruction using the byte snapshots from before this integration reproduced exactly the same problem list and both regions' tree/layout hashes. This is a pre-existing regression in the expanded working tree, not a change introduced by this port. See `docs/known-failing.md`; no expected hashes or tolerances were relaxed.
- All **58** JavaScript files checked for this integration pass `node --check`. All 18 relevant new test files are registered, with no duplicate manifest entries.

The final tower screenshot is an elevated inspection view above the parapet, not a first-person standing camera. Tower access is separately proven by the production staircase traversal. Its recapture completed with no game errors and the same GPU teardown diagnostic.

## Scope and remaining work

The city's residents and quests are not part of Claude's current building delivery. Existing wilderness and city checks establish the integration's functionality, not an exhaustive inspection of every terrain metre. Reviewed neighboring compositions are preserved, including their small historical border fringes. The wider Lotharn art and approach items in the older ledger remain separate work.

Use **F8 → Go anywhere** for Eshtor Plateau, South Ibenal, North Ibenal, Henborth or South Mithala, then select Mithala in the place menu. The southern jungle hold remains in force; further loading optimization remains paused.
