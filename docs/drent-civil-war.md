# Civil War in Drent — silver quest prototype

Drent is the active prototype for the **Ambroni Civil War** series. The Vastos prototype is retained in code and old saves, but is no longer offered on the current quest slate. This story is optional: none of its stages advances or blocks the gold Chapter 1 journey to Nothom.

## Player flow

The Greenway ambush is now at the unsigned junction before Fernway Rest, 116 metres along the main road from the pier. Narrow woodland trails let the player bypass it. Mercenaries who take the main road still meet the rebels on their own schedule.

After defeating the rebels, the player chooses a focus: continue the gold journey, or follow the silver lead back to Glun. Either quest can subsequently be focused in the left objective tracker or Journey journal. The focused quest supplies the prominent objective and map pointer; the other remains available.

Glun starts the investigation and asks for any papers to be returned unread. The nearby abandoned camp contains a dispatch chest. Searching it grants a real evidence item. Selecting the item is not the same as reading it: opening the sealed evidence is an explicit satchel action.

| Delivery choice | Assignment | Completion |
| --- | --- | --- |
| Glun, with either sealed or read evidence | Agree when ready, accompany Glun to confront Killian, and defeat Killian alongside him | Speak to Glun again; Empire favor +10 |
| Killian, only after reading the evidence | Learn Stealth, sneak into the barracks stores, and steal the supplies | Return supplies to Killian; Republic favor +10; Killian survives |

Delivery commits the local allegiance. Reading alone does not. The prototype currently implements these two endings; it does not invent a mediation route.

## Controls and readability

- **J**: Journey journal; select a quest and focus it. The left tracker also switches focus directly.
- **I**: Satchel; inspect the dispatch packet and explicitly choose whether to read it.
- **F**: Talk, search the camp chest, or take supplies when the interaction prompt appears.
- **X**: Toggle sneak after Killian teaches Stealth. Running, fighting, swimming and riding do not count as stealth practice.

Practice XP comes from actual movement near guards, with sight lines and suspicion. Standing still or moving in safe areas gives none. The successful supplies objective brings Stealth to at least level 2 (83 total XP); it does not repeatedly award another level on reload. A detected player can retreat, let suspicion clear and retry.

## World authoring contracts

`src/drent-sites.js` is the shared source of world coordinates and NPC records. `world.npcPositions` includes `DRENT_NPC_POSITIONS`; the host adds `DRENT_NPCS` to its cast. All points below are world metres.

| Site | x | z |
| --- | ---: | ---: |
| Greenway ambush | -106 | 40 |
| Empty camp | -131 | 79 |
| Evidence interaction | -131 | 77 |
| Killian / confrontation yard | -43 | 51 |
| Barracks | -38 | 72 |
| Supplies interaction | -35 | 79 |

The attack trigger has an eight-metre radius. The added eastern bypass stays outside it and preserves the Fernway bench and shelter. The camp is reached by an unsigned trail on the opposite side of the road.

The barracks is a solid building with exterior guarded stores. `DRENT_GUARD_PATROLS` defines two clear patrol loops. `DRENT_SNEAK_ROUTE` documents the physically verified route around the west and back of the lodging, using walls and stacked crates as cover. The route is an authoring/test aid, not a scripted player movement path.

Woodland footpaths are 1.1–1.25 metres wide and brown (`#a2916c`), compared with the main road's 4.2 metres and pale `#c6b384`. Path arrays retain their existing point interface and carry `kind` / `width` metadata. The local map model preserves that metadata; the atlas draws narrow dashed trails and the minimap does the same. The base World Builder SVG contains no baked-in road network, so it does not duplicate these overlays.

At junctions, `path-junctions.js` subtracts the exact rendered road footprint from the footpath surface. Brown dirt stops at the pale road's edges, including bends and crossing trails; navigation centre lines continue through the junction unchanged. This runs after all road meshes are authored, so road/trail creation order does not alter the join.

`world.drentCivilWar.setEvidenceTaken(bool)` and `.setSuppliesTaken(bool)` update the chest contents. Interactions, quest state and NPC life state belong to the host rather than the scenery module.

## Implementation and save boundaries

- `drent-civil-war.js`: pure branch state, validation, inventory effects, completion and one-time favor.
- `drent-host.js`: dialogue, explicit reading, quest focus, Glun escort/combat, guard awareness and interactions.
- `stealth.js`: movement-based practice and detection; no terrain or renderer dependencies.
- `drent-sites.js` / `drent-scenery.js`: authored placement, roads, camp and barracks.
- `road-ambush.js`: independent company event; its existing ID/version and deterministic outcomes remain compatible.

Drent progress is a separate checkpoint field. Older saves without it start with an untouched silver quest. A partly started confrontation restores to a retryable readiness state; a completed allegiance and its rewards remain completed.

## Focused validation

For a quick desktop playtest, open **F8** and choose **Drent silver quest · After the ambush**. This starts an isolated testing session beside Glun, with the silver lead focused and the gold journey still available. It does not overwrite normal progress.

Run the relevant tests rather than a full-game campaign:

```powershell
node --test --test-isolation=none tests/drent-civil-war.test.js tests/drent-host.test.js tests/drent-combat.test.js tests/stealth.test.js tests/drent-stealth-world.test.js tests/drent-world.test.js
node --test --test-isolation=none tests/road-ambush.test.js tests/npc-route-world.test.js tests/local-map-data.test.js tests/world-map-detail.test.js tests/minimap.test.js
node --test --test-isolation=none tests/path-junctions.test.js tests/drent-world.test.js
node scripts/launch.cjs --smoke-test --drent-checks
```

The Electron run uses an isolated test profile and writes `tests/artifacts/drent-checks.json`. World tests sample the bypass, interaction points, guard loops and back route using the real colliders. The path-style regression measures the actual batched mesh at the shrine branch, not just its metadata.
