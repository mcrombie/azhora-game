# Pyra: the golden twin capital

Implemented from the user's design approved on 4 October 2026. This document supersedes the older game planning assumption that West Pyros's capital would be a separate Gala. The sibling World Builder lore is read-only and was not changed.

Pyra is one administrative city across the Vaellir: West Pyra in West Pyros and East Pyra in East Pyros. Golden local masonry gives both fortified halves and the monumental connecting bridge their distant golden appearance. It is not solid gold. The material's precise composition remains unauthored.

Each curtain circuit returns to fortified riverfront ends. The river stays in its original atlas channel through the centre of the city, with quays, cargo, barges, trading halls and markets. Riverside cultivation represents the productive lands on both banks and the city's downriver trade toward the sea. The western quarter contains the older records court; the eastern quarter emphasizes commerce.

The immaculate golden palace floats above the bridge, high enough to dominate the roofs while remaining visibly architectural. Tapered supports rise from the parapets and stop below it, leaving a visible air gap. An open spiral staircase and upper landing provide continuous access from the bridge to a colonnaded audience court. The suspended structure is fixed in place: its sorcery is conveyed by the unsupported gap, rather than bobbing the physical floor beneath the player.

The emperor is many centuries old. Worshippers claim he is a god-king; outsiders may regard him as a powerful sorcerer. The truth remains ambiguous. No appearance, name, civilian cast, religious explanation or quest was invented. His realm has declined as Ambrone rises and takes eastern provinces. Naresh and Hama recently regained independence. The remaining Pyrosi Empire comprises East and West Pyros plus fortifications in surrounding countries. Those outlying forts are background lore, not newly placed structures in this city build.

## Implementation

- `src/pyra-world.js`: placement, local frame, river-preserving terrace shaping, landmarks and review cameras.
- `src/pyra-ground.js`: local fine terrain; physical footing samples the same triangles as the rendered surface.
- `src/pyra-scenery.js`: golden fortifications, bridge, stair, palace, city quarters, markets and riverfront. Merged geometry and bounded vertical colliders.
- `src/pyra-checks.js`: actual movement and support checks through both banks and up/down the palace stair.
- `tests/pyra.test.js`: production regional loading, regional ownership, river preservation, round-trip traversal, and rendered/support floor agreement.

Pyra is shared by the two regional loading jobs in Fast and Full modes. F8 / Go anywhere and the journal use the registered Pyra landmarks. The map receives city building footprints. Ambient vegetation and East Pyrosi terrestrial wildlife spawn sites avoid the city footprint. The original Vaellir water blockers remain active at river height while permitting bridge travel above them.

Household buildings are exterior shells; trading halls, the records court and the palace audience court have accessible interiors. There are no emperor AI, civilian NPCs, trade simulation or imperial campaign quests in this architectural build.

## Verification

`npm run test:pyra` runs the production-scene tests. `npm run review:pyra` runs an isolated offscreen Electron session and captures the city, bridge, palace, spiral and market to `tests/artifacts/pyra*.png`, with its controller report in `pyra-checks.json`.

Validation on 4 October 2026: both cross-city directions and the palace ascent/descent pass using the real traveler collision and floor-support controller (about 1.4 km in total). Raycasts confirm visible bridge/stair/palace floors and city terrain agree with physical support. Every Pyra F8 arrival is dry and clear. Chart tests and focused travel-list tests pass. The surrounding East Pyros checks identified the Warm Ash Spring at the eastern perimeter; its original basin is now preserved and its water-depth/shore checks pass. Native Electron captures and controller checks completed with an empty renderer-error list. Electron logged a GPU command-buffer warning during shutdown after capture; this is recorded separately from successful scene checks.
