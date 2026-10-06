# Azhora source code

Start with the [codebase guide](../docs/architecture/README.md), [Chapter 1 walkthrough](../docs/architecture/chapter-one-walkthrough.md), or [source index](../docs/architecture/source-index.md).

- `app/`: startup, game mode and save handling.
- `content/`: authored chapters, quests, characters and regions.
- `gameplay/`: reusable mechanics and player-facing autoplay.
- `world/`: terrain, loading, scenery, collision and environment helpers.
- `ui/`: maps, journal, controls and interface styles.
- `dev/`: developer tools and runtime checks.
- `experiments/`: climate annex and isolated frontier command experiment.
- `simulation/`: documentation for the future core; no implementation yet.

`boot.js`, `main.js` and `world.js` retain their entry and assembly roles. This is a mechanical file reorganization, not a completed rewrite of their dependencies.
