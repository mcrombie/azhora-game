# Selemis — island trading city

Selemis is the unwalled maritime city on the existing **Selemi** atlas island, southwest of Southern Ascarth. The atlas region name and ID (54) remain stable. The user's city spelling is Selemis. This implements its physical city and fleet; the recent occupation and associated characters/story remain for a later pass.

## Layout and visual identity

- City districts occupy roughly four fifths of the dry island. Seventy-two buildings follow the crescent: merchant palazzi, waterfront warehouses, narrow lanes and upper terraces.
- The Grand Canal crosses the island, with three smaller tidal waterways joining it. Eight arched footbridges connect the neighborhoods. The beds are cut into the terrain and continue through the shoreline into the sea.
- Warm plaster, paired pointed windows, pale stone courses, balconies, terracotta roofs and green copper give the city a Venetian architectural vocabulary without copying an individual real building.
- The Palace of the Tides combines an older sea-god colonnade with later palace galleries, copper domes, wave ornament and a trident crest. A separate mariners' bell tower, the Exchange Hall, Sea Archive and Shipwrights Hall distinguish the skyline.
- The harbor has **no defensive curtain, towers, moles or closing boom**. Three open wooden landings handle freight. Four ocean-going merchant carracks, three long oared galleys and five small gondolas establish the fleet's presence.
- Southern sea cliffs, shore refuges, gulls, sea-plungers and dolphins are retained. Natural scatter is cleared from city streets, foundations and canals; its original seed/exclusion point remains stable elsewhere.

The ships are static exterior scenery in this pass. Their hulls, rigging, sails, oars, cargo and moorings are physical models; player sailing and the trading economy are separate work.

## Integration and review

**F8 → Go anywhere → Selemi → Selemis** reaches the city square. The usual regional arrival also lands there. Selemis has the same main-map city badge convention as other built cities.

`selamus-city.js` owns the pure layout, canal and foundation ground, safe arrival and camera views. `selamus-ground.js` builds the one-metre triangle surface used for both terrain rendering and feet. `selamus-scenery.js` builds architecture and registered walking floors. `selamus-ships.js` supplies reusable vessel models; `selamus-harbor.js` owns surveyed berths and connected freight piers. Construction yields cooperatively through the existing regional loader in both Full and Fast modes.

Bridge, quay and pier support IDs are deterministic so saved elevated positions can be restored, including piers outside the atlas shoreline. The eight bridge spans also appear on the local map; open squares are not painted as buildings. Harbor hulls, extended spars/oars and wildlife circuits are audited for separation. The original island terrain and wrack tests now explicitly distinguish the natural substrate from the newly built city; old natural scatter hashes are retained.

The fine terrain patch overlaps the tip of Southern Ascarth, so its ground job belongs to both regions 24 and 54 and runs before Ascarth vegetation. Arriving in Ascarth first in Fast mode therefore installs the replacement ground without loading Selemis buildings or ships.

Focused verification:

```powershell
node scripts/run-tests.cjs tests/selamus-city.test.js tests/selamus-ships.test.js tests/selamus-scenery.test.js tests/selamus-harbor.test.js tests/selamus-integration.test.js
node scripts/launch.cjs --smoke-test --fast-load --review-views=selamus,selamus-harbor,selamus-canal,selamus-temple,selamus-rooftops --review-clean --review-size=1440x900
```

The review checks use actual city collision and walking surfaces for both directions of all eight bridges and three piers. They also check continuous wet canal beds, visible terrain/feet agreement, saved bridge support and clear arrival. Review captures and reports go to the ignored `tests/artifacts` directory.
