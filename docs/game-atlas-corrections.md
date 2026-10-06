# Game atlas corrections

The World Builder repository remains read-only. `src/world/terrain/game-atlas-adjustments.js`
applies the explicitly requested game corrections to a copy of its imported map.
The journal exporter, developer atlas exporter and river generator all use it;
the playable region survey is regenerated from the resulting developer atlas.
Asset SHA-256 provenance still identifies the unchanged upstream map. Both atlas
metadata files also record the applied game correction IDs.

## Tidehaven northeast bank — 29 September 2026

- Hex **(15,105)**, immediately northeast of Tidehaven's starting hex (14,106),
  belongs to **Drent**. Its original plains terrain is preserved. Pueth has 26
  hexes after this correction; the neighboring north bank remains Pueth.
- The Tessen runs around the new Drent bank on edges `15,104|15,105` and
  `15,105|16,104`, then reaches the sea on `16,104|16,105`.
- The previous southward edges `14,105|15,105` and `14,106|15,105` are removed,
  together with the isolated chart-only spur `14,104|14,105` that never had a
  corresponding built channel.
- The old runtime-only mouth diversion is removed. Both journal and 3D water
  now soften the same corrected edges. The Tessen bridge and upstream course
  remain in place; the channel stays outside Tidehaven's protected ground.

Regenerate together, in order:

```sh
node scripts/export-world-map.mjs
node scripts/export-developer-atlas.mjs
node scripts/build-region-survey.mjs
node scripts/build-region-rivers.mjs
```

`tests/world-map-detail.test.js` compares the actual SVG river vertices against
the built Tessen and checks ownership across the journal, developer atlas and
world. `tests/pueth-world.test.js` checks bridge travel and river colliders.

## Cape Thalmagar lettering — 29 September 2026

The journal exporter no longer permanently excludes Cape Thalmagar's name.
Every authored region has lettering available to the runtime's existing
discovery and developer-reveal rules. The cape still begins unknown in a normal
adventure; this change does not add a story route or unlock its fortress.
