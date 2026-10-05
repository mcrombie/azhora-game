# Fast loading: nearby construction and scenery residency

Implemented October 5, 2026. Full remains the first/default startup choice and
still starts after ten seconds. Fast is an experimental choice for that launch.

## Behavior

- Prepare Drent first; prioritize the current region, neighbors and travel direction.
- Extend lookahead with developer flight speed, up to 1,600 world units.
- Leave unrelated distant jobs pending rather than eventually building everything.
- Pause construction when nearby work finishes; resume as the player travels.
- Preempt background generators at a yield when an explicit destination is requested.
  Resume the same iterator later, including shared terrain tiles, without duplicate work.
- Use a 2 ms background allowance, reduced to 0.75 ms after a slow frame. Requested
  destinations get at least 8 ms while travel is waiting. A single operation can exceed this.
- Park completed regional scenery beyond its retention distance, releasing eligible
  geometry and instance GPU buffers. Restore the same objects when approaching again.
  Shared and pinned geometry stays resident while needed elsewhere.
- Compute deterministic terrain random seeds on demand instead of scanning the entire
  sampling grid first. Full and Fast preserve the same terrain sampling sequence.

## Scope and limits

Parking preserves changed trees and object identity. CPU geometry arrays, colliders,
terrain and gameplay state remain allocated; this does **not** bound total CPU memory
after visiting the entire world. Shared scenery builders may span several regions.
No worker construction, regional scenery disk cache or distant proxy meshes were added.
First visits and very fast flight can still wait for unfinished destinations. Full
still constructs the outdoor world before play and does not use scenery parking.

## Validation

54 targeted tests cover scheduling, dependencies, preemption, terrain parity, shared
tile construction, residency, loading choices, caching and existing scenery batching.
The full repository suite was not run for this change.

Native Fast travel checks passed twice: Drent to West Acorwood, change a tree, return
to Drent, then revisit. They confirm region readiness, GPU buffer disposal, restoration,
preserved tree identity/state and unrelated regions still pending. Native developer
dragon checks passed twice across all four Acorwood regions, including the ground
Acor chopping prompt, with no game-frame errors. The flight process emitted the
existing Electron GPU shutdown warning after successful capture and exited 1;
the separate travel/residency process exited 0.

Single-run cold-launch observations on the development machine:

| Measurement | Before | After |
| --- | ---: | ---: |
| Instrumented world startup | 13.80 s | 13.01 s |
| Launch to initialized opening | 27.72 s | 27.65 s |
| Largest frame gap during 20 s opening observation | 232 ms | 92 ms |
| 95th percentile frame gap | 80 ms | 65 ms |
| Frame gaps above 50 ms | 135 | 194 |
| Sampled JS heap | 287 MB | 280 MB |

These are opening-screen observations, not gameplay FPS benchmarks or repeated-run
averages. Overall launch time barely changed. Tail stalls improved in this sample,
but the count above 50 ms increased; do not interpret this as uniformly smoother
rendering. The main scaling improvement is avoiding unnecessary distant construction.
The return-trip GPU totals include other newly uploaded assets, so that test proves
buffer disposal/restoration, not a measured net reduction in total GPU memory.

## Reproduction

`node scripts/launch.cjs --smoke-test --fast-load --review-views=fast-local --review-jpeg`
runs the isolated travel and residency check. Use `--review-views=acor-flight` for
the dragon route. Results are in `tests/artifacts/local-streaming-checks.json` and
the Acor flight artifacts.

`node scripts/launch.cjs --smoke-test --startup-profile --fast-load --profile-observe=20`
records startup plus a short opening-screen frame observation. The exhaustive
Fast loading harness explicitly calls `preloadAll()`; normal play does not.

Next architectural step, if long journeys still grow memory excessively: separate
regional mutable state from disposable geometry/colliders, allowing safe CPU eviction
and regeneration. Measure that independently from cold startup and frame pacing.
