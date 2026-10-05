# Urubond

5 October 2026. Implemented from the user's island sketch: offshore northwest of Cape Thalmagar, in the empty sea west of the Endevors. Terrain and infrastructure only; no characters, encounters, wildlife, quests or rewards.

## Geography

Urubond is a separate region, ID 117, built from 21 connected game-owned atlas hexes. The irregular outline has a broad northern shoulder, a broken western coast and a narrower southern strand. World Builder remains read-only. The journal chart, developer atlas and baked survey all receive the same addition through `game-atlas-adjustments.js` and the existing export scripts.

The island has dark ash, iron-stained basalt, coastal columns, cooled lava tongues and barren eroded gullies. The central volcano rises over 300 metres, with an uneven crown, a hollow caldera, low furnace glow and a thin drifting plume. Winding natural ledges connect the southern landing to the rim and then descend along the inner wall. There is no external castle, town or obvious fortress gate.

The volcano and its route use a local two-metre terrain mesh. Walking samples the same triangles that are drawn. Only the island's own ground is altered. Exterior scenery is merged; the fortress is allocated on entry rather than during startup.

## The hidden fortress

The only entrance is an unmarked basalt cleft **inside the crater**, on its southern shelf. Approach on foot and use the normal interaction command. No map marker identifies the entrance. It leads down into a connected fortress under the island, approximately 244 by 387 metres, with eleven main chambers:

- The Buried Threshold and Hall of the Unlit Watch.
- The Pillared Abyss, with a 46-metre vault and pointed stone ribs.
- The Crownless Vault.
- Silent Forges and Dry Cisterns.
- Sealed Archive and Thousand Empty Niches.
- Eastern and Western Barracks.
- The Deep Reservoir.

Cross galleries and northern/southern passages form loops between the chambers. The rooms have enclosed ceilings, matching wall collision and a camera constrained to the interior. Return to the concealed stair at the entrance to leave. Mounts cannot be summoned inside. Saving underground records the safe exterior entrance so reloading cannot strand a traveler under the terrain.

This is original fortress geometry in Azhora's existing low-poly style: basalt, obsidian-dark stone, muted mineral trim, enormous empty spaces and restrained warm light. The literary references guide scale and atmosphere, rather than copying a particular film structure.

## Discovery and testing

Ordinary characters cannot provide directions to Urubond. Barrett's geography pool excludes it, and the Cartography hearsay API refuses to reveal its location. Physically visiting it still charts it normally. Its reserved difficulty level is 11; no combat has been added for this environment pass.

For development, use **F8 → Go anywhere → Urubond → The Ashen Strand**, or fly northwest from Cape Thalmagar. The default developer arrival is the shore, not the secret passage. Entry is at approximately `(-3490, -3422)` on the caldera's inner shelf.

`tests/urubond.test.js` builds the real region through the production loader, walks the entire surface route, checks room connectivity and walls, verifies secret entry/exit and delayed interior creation, and checks personal discovery versus character hearsay. Native review views are `urubond-island`, `urubond-crater`, `urubond-interior` and `urubond-forge`.

## Validation

The targeted Urubond and nearby Black Fortress checks pass (7 tests), as do the atlas, cartography, geography, difficulty, build-status and campaign regressions (47 tests). Electron review captures cover the island, caldera, main hall and forges; the renderer reported no runtime errors. The native harness still emits its existing GPU shutdown warning after completing captures.
