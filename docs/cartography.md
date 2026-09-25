# Cartography and exploration

`src/cartography.js` records country knowledge and skill experience.
`src/map-fog.js` records the actual hexes visited and their immediate neighbors.
`src/world-map.js` combines these independent sources on the authored atlas.

## What becomes visible

- Hearing a country's name reveals its **original atlas lettering only**. No extra label is drawn and no country silhouette, border, coastline, or terrain is uncovered.
- Visiting a hex reveals its detailed atlas terrain, roads, and discovered locations.
- Adjacent hexes show vague terrain colors. Their specific locations remain unknown until visited.
- Everything farther away remains dark, including the rest of a country already entered.
- Developer map reveal is an explicit testing exception: it also allows opening the map before the tutorial grants a chart. It does not teach Cartography, award experience, or skip training. Turning reveal off restores the normal chart-access requirement.

The renderer ignores old `silhouettes` payloads. This keeps older saved country ranks from revealing unexplored provinces after an update.

## Country progress

The saved ranks remain `unknown`, `heard`, `charted`, and `explored`, with a separate `named` flag. These track knowledge and experience; none reveals a country's complete shape.

The first visited hex makes that country `charted` and names it. Six distinct visited hexes make it `explored`. Further travel keeps filling the map one hex at a time. Difficulty numbers become available at the `charted` rank.

The player starts without a chart. Officer Glun introduces cartography during Chapter 1, and the player must open the map as part of that lesson. Directions from NPCs can then add names of neighboring countries. The introduction in Luscia explains entering a new region.

## Experience and saves

Cartography awards 15 XP for a country's first hex, 10 for first hearing of it, 25 for first survey knowledge, and 40 for reaching six visited hexes. Each milestone pays once. The same skill-level table applies as for other skills.

Country knowledge remains in checkpoint `cartography`, while actual revealed geography remains in `mapFog`. Existing saves and skill progression are preserved; knowledge never substitutes for visited/nearby hexes.

## Regression checks

Run `node --test --test-isolation=none tests/cartography.test.js tests/world-map-detail.test.js tests/map-fog.test.js`.

The tests cover heard countries with no visible geography, one visited cell with six nearby cells, explored ranks that do not reveal the rest of a province, and legacy full-province silhouette inputs that must be ignored.

Run `node scripts/launch.cjs --smoke-test --cartography-checks` for the in-game map entry points. This checks developer reveal on and off before training, unchanged skill and tutorial progress, and the normal Glun map lesson.
