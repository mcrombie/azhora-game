# R6 western-edge boundary and traversal review

Review date: 4 October 2026. Candidate: the uncommitted review worktree after `13448f7`, at `C:/Users/Michael/Programs/typescript/azhora-game-region-review`. This report covers Cape Heth (47), the Dinelv Highlands (48), and Hama (49). It records bounded corrections and does not certify the entire region group. Tree, species and animal grounding have a separate review.

## Reproduced defects and corrections

The existing seven-hex ground blend dropped an influencing hex at six ownership joins. Probes on opposite sides only one millimetre apart measured these finite steps:

| Join | Largest original difference | Representative x, z |
| --- | ---: | --- |
| Cape Heth / Dinelv | 5.170 m | -3754.332, 1965.623 |
| Dinelv / North Meroshe | 4.565 m | -3200.002, 1996.991 |
| Dinelv / West Meroshe | 7.571 m | -3750.868, 2310.034 |
| Hama / West Meroshe | 0.741 m | -3350.638, 2656.311 |
| Hama / Central Meroshe | 0.726 m | -3050.638, 2771.046 |
| Hama / South Meroshe | 0.745 m | -2950.002, 2828.414 |

`southwest-world.js` now includes exactly these six pairs in the existing 36 m seam correction. The earlier northern-country edge predicate, submerged river-centre preservation, and dry-bank correction in `west-ground.js` are unchanged. This removes accidental ownership steps; it preserves the authored escarpment, mesas, ridges, drainage beds, coast and gentle ascent.

The Dinelv mesa comment said their steep sides could not be walked up, but Dinelv was absent from `CLIMB_REGIONS`. Production `canWalkSlope` therefore allowed an ordinary 14 cm horizontal step to rise 0.79–1.00 m on the three table flanks. Dinelv now opts into the existing climbing region classification by name. Steep uphill movement requires a deliberate grab and pays normal stamina; ordinary downhill movement retains gravity and fall damage. The normal minimum stamina, maximum slope, reach, solid-prop and exhaustion rules apply. This deliberately enables manual climbing in Dinelv, replacing the old source comment that called it a non-climbing region. It does not change player save data or the controller's mechanics.

## Checks

The new pure regressions failed all three cases before correction (`tests/artifacts/r6-western-seams-before.log`). After correction:

```text
node --test --test-isolation=none tests/r6-western-edge-seams.test.js tests/southwest-seams-review.test.js
```

Passed **8/8**, 5.80 s. All 64 western atlas land edges, covering nine neighbour pairs and 1,856 dry sample positions, now have a maximum difference of **0.001413 m over 1 mm**. Each of the six former outliers converges when probe spacing shrinks. The previous 2,562 northern dry samples, 541 preserved wet samples, Oves/Nether joins, every saved river profile and pool elevation, and six unchanged interior height pins pass. The complete authored ascent also passes the actual walking slope predicate in both directions. Log: `tests/artifacts/r6-western-seams-after.log`.

The existing `tests/climbing.test.js` passes **22/22** after the name-only classification change (`tests/artifacts/r6-climbing-unit.log`).

The constructed-scene controller test, `tests/dinelv-traversal-review.test.js`, builds the real southwest scenery and approach countries, drives the complete ascent and return through `moveCharacter` and terrain falling, walks to each mesa face, and exercises deliberate climbing, controlled descent, stamina exhaustion and an actual scenery collider. Its first run passed the whole ascent and descent, the north-table climb/return, exhaustion and scenery collision, but failed the long-table approach precondition: the chosen eastern origin was already on a steep adjoining ridge. The test now approaches the long and western tables across their open western plateau, retaining the original walking-distance, collision, grade and fall assertions. Production source was not changed in response. The first log is retained at `tests/artifacts/r6-dinelv-traversal-first-origin.log`.

The corrected full file passed **4/4**, **41.38 s**, explicit process exit 0 (session 19910):

```text
node --test --test-isolation=none tests/dinelv-traversal-review.test.js
```

Both directions covered **292.6 m** in **69.8 simulated seconds**, between **29.02 and 87.43 m**, with zero damage and no lost ground support. Ordinary walking stopped at **88.79 m** on the North Table, **93.21 m** on the Long Table and **106.35 m** on the West Table. Each traveler then deliberately grabbed the nearby face, climbed for three seconds at beginner skill, and descended onto a real resting surface without damage. That climb and return spent **32.14?32.67 stamina**, with no free recovery. Separate checks retain the minimum stamina guard, real exhaustion into falling, and solid actual scenery. These are bounded climb/return checks, not a claim that a beginner can reach every table summit on one stamina bar. Log: `tests/artifacts/r6-dinelv-traversal-review.log`. Frozen source and test hashes: `tests/artifacts/r6-boundary-controller-sources.json`.

The combined southwest scene review also passed **14/14** on these same physical seams. It preserves all 141 existing instance-batch identities and non-Y transforms/colors; the 49 R6 tree roots meet actual rendered triangles at approximately 3 cm below ground. All 33 regional residents remain, and the 27 ground animals' displayed origins match those triangles. That separate review owns species, harvesting and wildlife details.

## Journey and remaining review

The authored approach starts at **(-3222, 1716)** on ground at approximately **29.02 m**, bends through **(-3262, 1772), (-3300, 1826), (-3330, 1878), (-3352, 1926)** and ends at **(-3368, 1968)** on ground at approximately **87.43 m**. The path is about 293 m long. It is intended for ordinary walking in both directions. The mesa faces are optional climbing terrain; the plateau approach does not require climbing equipment, increased skill or unlimited stamina.

Existing native camera names are `southwest-heth-point`, `southwest-heth-weather`, `southwest-heth-hollow`, `southwest-dinelv-scarp`, `southwest-dinelv-tables`, `southwest-dinelv-ridges`, `southwest-dinelv-pass`, `southwest-hama-line`, `southwest-hama-grass` and `southwest-hama-bed`. Final native visual assessment, ordinary player-input evidence, Full/Fast arrival/leave/reload, map/discovery and regional persistence remain open until recorded on the combined candidate. No new scenery, town, inhabitant, route, watercourse or species was introduced by this boundary/controller correction.

## Native visual follow-up

The main desktop Full-mode batch `tests/artifacts/r6-r8-main-native-views.log` completed with exit 0 and no renderer errors. Heth point, Dinelv scarp/pass and Hama line images were inspected. The principal shoreline and pass are readable, but solid stone slabs and blocks visibly float above terrain. A separate contact repair now covers the seven affected solid-stone batches; it retains their horizontal placement, shape and colors. The bright alternating Dinelv terrain triangles remain a separate visual concern. This screenshot batch is not an ordinary-input traversal or a new Full/Fast acceptance certificate.

The subsequent solid-stone correction passes **15/15** combined southwest checks in **50.03 s**, including the retained non-Y scene hash and archived Y-change allowlist. It seats 6,657 western-edge stones (Cape slabs/shingle, Dinelv slabs/blocks/rubble, Hama ribs/gravel) against their actual transformed hull and rendered triangles. The baseline reproduced 678 visibly floating instances across these seven batches; misplaced buried instances were corrected too. The prior 1,973 Meroshe stones still pass. Logs: `r6-stones-baseline.log` and `r6-stones-final.log`. Only reviewed stone Y positions change. Native recapture is pending.

### Solid lower faces and shared material correction

A native recapture of the initial minimum-hull seating still made broad slabs appear to balance on one tip. The seven R6 solid-stone batches now embed the complete lower face (the maximum contact offset among transformed negative-local-Y hull vertices), rather than resting only the first contacting tip. The final combined southwest fixture passes **15/15 in 52.25 s**, with all 6,657 stones seated and the original non-Y/color hash preserved. The earlier two Meroshe stone batches keep their separately verified behavior. Log: `tests/artifacts/r6-stones-embedded-final.log`.

The alternating white terrain facets were traced to Telemonia's cistern changing the world's shared terrain material roughness to 0.2. The [material review](shared-ground-material-review.md) isolates the cistern material and preserves terrain roughness 0.93; its regression passes with geometry unchanged. Final native recapture is required to judge the visible result. Both corrections are mirrored into the main desktop checkout.
