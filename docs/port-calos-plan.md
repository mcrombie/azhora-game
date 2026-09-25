# Port Calos

Requested at the 24 September 2026 stopping point; implementation resumed on 25 September 2026. The town spelling is **Port Calos**; the river remains **Caloss**, and its province is **Luscia**.

## Town and route

Port Calos occupies the Luscian bank at the river mouth. Sixteen buildings, market streets, net lofts, a shipwright's yard, the River Lantern inn, and eight ordinary residents form the harbor town. A long stone quay projects east into the coastal inlet. The town terrace and cart ramp meet the quay as walkable ground, and the sea approach stays open.

The inland street joins the existing Nothom road. Arriving by boat therefore bypasses the long road across Drent, while leaving that road, the Caloss Bridge, and their optional activities available according to their normal world state. Town landmarks, building footprints and streets use the existing chart and discovery systems. Residents offer local conversation and directions through the ordinary NPC system.

## Jess's crossings

- From Tidewater Haven, Jess offers **Peblos** and **Port Calos** as separate destinations.
- From either destination, she offers passage back to Tidewater Haven.
- All these crossings remain free, matching the existing ferry, and available before Jojo or Glun's tutorial.
- Jess and the same boat wait at the shore where the player arrives. Port Calos includes a safe arrival point and a return conversation beside the quay.
- The boat carries an unmounted traveler. The existing restriction on bringing a horse remains.

Sailing is travel, not a quest completion. It does not award the harbor letter or road token, repair the bridge, finish training, or report to Iven. A completed ferry crossing can now be saved even at tutorial stage zero; reloading preserves the actual unfinished lessons and the arrival position. Malformed ferry data or an unfinished initial crossing cannot authorize that early checkpoint.

The ferry dialogue now closes before boarding starts, so closing the conversation cannot accidentally restore walking mode during the crossing.

## Validation

Completed validation:

- 68 focused ferry, checkpoint, company transport/horse, map-hint and resident tests passed.
- 47 sign, cast, language, ferry and resident/checkpoint checks passed in the earlier integration run (overlapping tests with the focused set above).
- Five full-world harbor tests passed: all four streets walked with the real movement code, routes to Nothom, clear NPC stands, river preservation, quay clearance and displayed-terrain footing.
- 91 native checks passed with no application or renderer errors. The first outbound trip ran through the normal timed scene; the remaining crossings also exercised a delayed frame. Both tutorial stages retained their quest state through travel, save/reload, return travel and the original Peblos roundtrip. The real Testing Tools button also reached the quay with Jess available.
- Web build, JavaScript syntax and whitespace checks passed.
- Native visual review covered the quay, waterfront and town. It exposed grass over the inner quay and a mismatch in NPC footing; both were corrected. The review process reported no application errors, then emitted Electron's existing GPU teardown warning on exit. The behavior-only run exited successfully; the combined final checks and screenshot run passed before the same teardown warning.

Commands:

```text
node --test --test-isolation=none tests/port-calos-checkpoint.test.js tests/port-calos-people.test.js tests/port-calos-world.test.js tests/ferry.test.js tests/road-checkpoint.test.js
npm run test:port-calos
```

## Related work

The earlier Caloss fork leads south to Nothom and west into Elagos toward Ambron. Caelom stands beside it with warnings of harsh winters and monstrous invaders; see `luscia-fork-seer.md`.

Chapter 3, the proposed autumn start, full-moon nights, and winter invasion remain separate planning work in `chapter-3-autumn-proposal.md`.
