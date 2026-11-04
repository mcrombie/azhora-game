# Oremindi opening: occupied mountain country

Updated 22 October 2026 from the author's direction. Place names for the four
holds below are working names, not newly established named chieftains.

## Opening control

| Country | Direct control | Position |
| --- | --- | --- |
| Kudan | Cudon | Independent human country, hostile to and afraid of Thalmagar. Its later conquest is not an opening fact. |
| Narcosh | Narcosh; Lesser Oremindi Mountains | Mixed human/goblin ancestry. Friendly to Thalmagar but not committed to alliance or vassalage. Permits northern orc passage via the Orthakar woodland corridor. |
| West Oremindi Clan | West Oremindi Mountains | Broken Horn Hold; one independent orc chief. |
| East Oremindi Clan | East Oremindi Mountains | Ashen Stair Hold; a rival chief. |
| North Oremindi Clan | North Oreminidi Mountains | White Anvil Hold; a rival chief. |
| South Oremindi Clan | South Oremindi Mountains | Red Tarn Hold; a rival chief. |
| Oremindi Kingdom | No whole region | Almost destroyed human kingdom. A small refuge survives among ruined communities. |
| Mountain Elfland | Concealed Sevron, no surface region | The Night Elves live underground and venture out only at night. The occupying orcs have not found the city. |
| Thalmagar's Empire | Cape Thalmagar; hidden Urubond | Direct domain only. Existing concealed vassals remain separate polities. |

Narcosh claims the Acor Wetlands without owning the whole region. The earlier
Acreland, Endevor and Thalmagar claims remain; the new direction did not explicitly
remove them. Claims are not counted as direct holdings.

The human king's authority was once largely nominal among isolated communities.
The invasion made the monarchy a rallying point, but too late to preserve most
settlements. Orc disunity is a future strategic weakness, not a claim that a
rivalry simulator or autonomous invasion system has been implemented here.

## Geography and implementation

`src/content/regions/oremindi-frontier/` owns settlement layouts, additional
terraces, branching paths and occupation scenery. The existing regional terrain
modules compose that relief with their original high peaks, shores and passes.
Ruined human buildings have broken walls and charred timbers. Kudan has one
coastal town and three surrounding farm plots. Those plots are scenic; they do
not invent campaign food totals for a region outside the current food scenario.

Each new hold, ruin and refuge appears in the map's place data and F8 travel
list. Sevron is deliberately absent from the new public markers. Terrain and
scenery remain region-loaded, with merged settlement/path meshes.

Review: `npm run review:cities`, then choose a hold, Kudan Town, or The Last
Refuge. Full-world exploration has the same settlements through F8 travel.
Checks: `node --test --test-isolation=none tests/oremindi-frontier.test.js
tests/west-oremindi.test.js tests/northern-oremindi.test.js`.

## Chapter 3 boundary

The author confirmed that the relocated Wizards' Tower starts as a refuge
inside occupied South Oremindi. Its arrival does **not** transfer the whole
region to the Wizards' League. Territorial gains require later victories.
The existing lakeside cottage is the proposed relocation vicinity; the tower's
physical relocation and chapter encounters belong to the chapter implementation.
