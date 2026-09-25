# Port Calos — next-session design note

Recorded at the user's requested stopping point on 24 September 2026. This is planned work, not an implemented town or ferry destination.

- Build **Port Calos**, a decently sized harbor town on the Luscian side of the mouth of the Caloss River.
- Place the town along the riverbank, with a harbor projecting into the coastal inlet and access to the sea.
- Add Port Calos to **Jess's ferry destinations**, alongside Peblos. The player can sail there directly from Tidewater Haven, bypassing the overland road across Drent and arriving in Luscia.
- Treat this as an alternate travel route; taking the boat should not automatically complete skipped training, bridge, or road quests.

Before implementation, inspect the actual river mouth and coastline to choose a precise site and safe water approach. Town layout, inhabitants, facilities, fare, return travel, and how the ferry fits existing unlock conditions remain to be designed. The user's chosen town spelling is **Port Calos**; the existing river is **Caloss**.

## Resume checkpoint

The previous task added a fork just beyond the Caloss Bridge: south to Nothom, west into Elagos and onward toward Ambron. Caelom, a one-eyed Luscian seer, stands beside it and speaks of devastating winters and monstrous invaders. See `luscia-fork-seer.md`.

Validation completed: 30 focused dialogue/appearance/language tests, 10 sign/cast tests, and 22 road/bridge/navigation tests passed. Web build and syntax checks passed. Native review captured the fork, Caelom, western road, and its Ossen connection with an empty application-error list; Electron emitted its known GPU teardown warning after the completed review. The test application has exited.

The broader Chapter 3, autumn, full-moon, and winter-invasion ideas remain planning work in `chapter-3-autumn-proposal.md`.
