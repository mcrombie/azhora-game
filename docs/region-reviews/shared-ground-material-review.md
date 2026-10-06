# Shared terrain gloss exposed by Dinelv review

2026-10-04, `azhora-game-region-review`, base `13448f7` with the joint review work. This correction is separate from the Dinelv stone-placement work and changes no physical ground, geometry, tint or collision.

The main checkout's native `tests/artifacts/southwest-dinelv-pass.png` and `southwest-dinelv-scarp.png` showed glaring white triangular highlights on the ground. The faces follow the ordinary coarse terrain triangulation; Dinelv has no separate white ground overlay, and its authored rock tints are dark.

`world.js` caches materials by color and the complete extra-options object. Its terrain requests `material('#ffffff', {vertexColors:true, flatShading:true})`, initially roughness 0.93. `createTelemoniaTownScenery` requested that same cached material for its merged cistern-water mesh, then assigned `water.material.roughness = .2`. Loading the town therefore made every mesh sharing that material glossy, including terrain far away. In Fast mode this could change when Telemonia loaded; Full loaded it during startup.

The correction adds an optional roughness argument to the town's existing mesh flush helper. Cistern water requests roughness 0.2 as part of its material cache key. Land and stone continue sharing their original roughness-0.93 material. The former mutation is removed; water still does not cast shadows.

`tests/telemonia-town-material.test.js` uses the production cache contract and builds the actual town on a constant-height fixture. It verifies separate water/land material identities, water roughness 0.2, unchanged shared-land roughness 0.93, and unchanged reuse by later land requests. It passed **1/1**, explicit exit 0, with `node --test --test-isolation=none tests/telemonia-town-material.test.js`.

The ignored `tests/artifacts/r6-dinelv-material-comparison.mjs` compares the baseline builder loaded from exact `git show HEAD:src/content/regions/telemonia/telemonia-town-scenery.js` bytes with the corrected builder under the same fixture. All eight meshes, 17,294 vertices, geometry attributes, indices, instance data, colors, colliders and metrics hash identically: `3e78001d0117d00fcc0b8ae2b6698b7733557e5a2668333b53f1c0a79ff9caf1`. Before: water and terrain share a material, both roughness 0.2. After: distinct materials, terrain 0.93 and water 0.2. Logs are `r6-dinelv-material-regression.log` and `r6-dinelv-material-comparison.log` in that same artifact directory. An initial comparison artifact used the wrong text encoding; the byte-preserving baseline copy resolves that diagnostic-only discrepancy.

This establishes the shared-material defect and its correction. A final native recapture remains the visual acceptance check; no global smoothing, changed normals, altered terrain colors or Dinelv geometry workaround was applied.

## Construction slice correction

The subsequent native Fast journey measured `telemoniaTown` spending 1,142 ms in one synchronous construction step. The town now exposes a generator for the regional loader, yielding between buildings and bounded portions of field/vine sampling and instance placement. The synchronous entry point remains available for existing callers and drains the same generator. Seed order, geometry, colors, collider definitions and metrics remain exact.

The material and new construction regressions pass **2/2**. The geometry/collider/metric hash remains `3e78001d0117d00fcc0b8ae2b6698b7733557e5a2668333b53f1c0a79ff9caf1`. The constant-height fixture records 13,614 yielded steps, at most 174 physical-ground reads per step, and a longest measured slice of 12.28 ms (total builder work 1.439 s). Those fixture times are observations, not a native performance certificate. Log: `tests/artifacts/telemonia-town-streaming.log`. Final renderer measurement remains required.

The combined Full native run subsequently exits 0 with no renderer errors. Its Dinelv and Telemonia captures confirm the unintended terrain gloss is gone. See [the native review](shared-ground-native-review.md).

## Caricas construction slices

The same earlier Fast run exposed a 246.6 ms synchronous `caricasSettlement` step. Its retained generator now yields between individual road patches, buildings and bounded geometry work; the synchronous public wrapper remains available. The focused test passes **2/2**, retaining the exact original geometry hash `da1c63683bf7bd2bf61c3009a68203effcd0c3247505d99dcc4e56dbb016644f`, all eight building collider IDs and map metadata. Total terrain queries remain 10,295; 217 yields limit each step to 128 queries. The constant-ground longest observed step is 2.94 ms, which is not a substitute for native measurement. The two world hooks and leaf are mirrored into main for the final Fast run. Varn's earlier 193 ms peak remains a separate performance follow-up.

The final native Fast run passes and records Telemonia town's maximum at **10.1 ms** and Caricas at **8.6 ms**, with no renderer errors. Total work remains, spread across smaller steps; see [the native review](shared-ground-native-review.md).

## Varn construction slices

Varn's final pre-correction native maximum was 199.5 ms. Its existing generator now also yields within the 13,366-sample ground grid, triangle indexing, painted vertices, cliff-piece search and individual paving patches. The focused regression passes **1/1**, with exact original geometry, colours, 150 colliders and admission metadata hash `4627cbbcfe707e8e3f881987db2c139d0543f367e065737d38986706a1eb9e20`. Total height queries remain 15,859; the per-step maximum falls from 1,304 to 128. The local fixture yields 962 times, with a 6.98 ms observed maximum. Only scheduling changes; gate status, cliff heights and masonry stay unchanged. The leaf and test are mirrored into main. Its next native measurement is pending; the local result is not presented as a renderer benchmark.

## Varn native slicing observation

The first Celder-composed Fast desktop run measured Varn's longest construction slice at 43.5 ms across 992 steps, down from 199.5 ms in the earlier observed run. Total work was 1.649 s; this is a single observation under parallel review load, not a controlled FPS benchmark. The exact geometry/collider equivalence fixture remains the separate proof that slicing did not redesign the city. The new shared Mithala water job peaked at 7.3 ms; South/North Celder at 33.3/22.6 ms.
