# R4 southwest environment review

Scope: Navarth, West Pyros, Ganesh Desert and Ganesh Plain, including their land
joins. Work remains in the isolated regional review branch. This is a functional
terrain and tree review; native regional appearance and the remaining wildlife
habitat review are not yet accepted.

## Bounded terrain seams

The old seven-hex terrain blend omitted influencing hexes when ownership changed.
At representative boundaries the jump persisted even across a millimetre:

| Boundary | Previous jump | Current difference over 1 mm |
| --- | ---: | ---: |
| Navarth / East Ibenwood | 2.566 m | 0.000453 m |
| Navarth / South Ibenwood | 1.556 m | 0.000553 m |
| West Pyros / East Pyros bank | 0.526 m | 0.000251 m |
| Ganesh Desert / Dinelv | 4.729 m | 0.000819 m |
| Ganesh Desert / Cape Heth | 3.861 m | 0.000264 m |
| Ganesh Plain / North Meroshe | 2.846 m | 0.000264 m |

`southwest-world.js` now uses the complete hex blend for both base relief and
regional landform weights within 36 m of land joins touching the northern four
countries. The correction fades outside its six-metre core and is zero farther
inland. Correcting the base alone left finite steps in the regional landforms.
The sampled river centres remain on their original ground, retaining every
river profile and pool level exactly. Scenery climate and candidate fields keep
their prior sampling; the terrain correction introduces no new random draws.

One dry Alezhor bank still stepped by 8.8 cm because the downstream channel used
the nearest river sample. A narrow `west-ground.js` change blends the Vaellir
and Alezhor dry outer-bank profiles continuously within the same correction
band, while retaining their wet-channel profiles. Other rivers and distant
banks are unchanged. No terrain dispatcher or global base-relief change was
required.

`tests/southwest-seams-review.test.js` passed **5/5** in 7.14 s. It checks 2,562
dry boundary samples, whose largest one-millimetre height difference is
0.001412 m; 541 submerged samples retain the separate water-profile contract.
It also checks the exact former outliers, two gentle Ganesh crossings in both
directions using the traveler fall rule, and unchanged distant interior heights.
All western river profiles retain SHA256
`85f2bd3a7d948e2aa9a6c18d6e337cfa0d8c0339a4038e7cd15c650eff4b0f5d`;
all pool levels retain
`39a84620cdb95c58b09b6423b184389c41ffdf2950cd231d76ffc4c6ac9c9093`.

The existing Oves/Nether seam repairs remain in place: 475 ten-centimetre probes
have a maximum difference of 0.009814 m. Their original Nether endpoint
correction, measured at +/-5 cm, retains a roughly four-centimetre asymptotic
residual (3.97 cm in the clean baseline; 4.08 cm now). This pass does not claim a
new millimetre continuity contract for that already repaired endpoint.

Six affected existing `southwest-world.test.js` contracts also pass: internal
seam grades; Navarth/Ganesh elevations and drainage; all four watercourses;
Ganesh washes and hollows; unchanged out-of-scope terrain; and the Ganesh Plain
divide and channel falls. The Dinelv escarpment remains a steep authored front.

## Tree integration and remaining review

The shared Southwest tree builder previously registered no typed or saved trees
and placed tilted trunks on analytic centre heights. The inventory agent's
bounded R4 correction registers 170 existing trees, gives them established
catalog species, and grounds their visible root footprints. The combined R4/R5
fixture after the terrain seam changes retains the exact non-vertical matrix,
colour, name and count hash over all 141 scenery batches:
`5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30`.
All 233 checked roots, including the 170 R4 trees, are embedded in drawn ground.
The final combined fixture passes 8/8 in 47.11 s. Its ordered comparison against
the archived pre-seam scene finds 536 intended tree-height changes and 2,232
bounded seam-height changes, with 139,841 vertical transforms unchanged and no
unexpected changes. All 170 prior R4 tree IDs, species and horizontal positions
remain exact. The combined R4/R5 review also grounds all 41 ground residents
through the approved regional body-origin callback.

The first native habitat journey completed the ordinary woodland/desert approaches
and returns but exposed missing ghubr shade. Its deer screenshots were blocked
by a trunk, so frustum membership alone was not visual acceptance. The bounded
correction and outstanding native retake are recorded below.


## R4 native habitat correction ? 4 October 2026

Main native session 2863 closed with exit 1. All six ordinary W legs completed
without falls, water or damage, including 434.70 m of Trogo travel already
reported under R7. Both R4 species responded to the live traveler: the Navarth
deer moved 20.65 m and fled/returned, and the ghubr moved 21.09 m and flew. Root
inspected all six PNGs. The Navarth images are trunk-occluded; Ganesh flight is
legible, with the response bird naturally farther away. Original JSON, log and
six captures remain in MAIN `tests/artifacts/r4-r7-first-native/`.

The failure is actual habitat geometry: every ghubr home had zero shaded body
samples out of 25 within its advertised five-metre patch. The first two homes'
nearest existing scrub lobes are 9.45 m and 8.88 m away. The third has a small
bush at 2.0 m, but no sampled shade at the measured 0.436 m body height. No
animals, homes, saved identities or assertion thresholds were moved.

The REVIEW candidate adds six dry perennials, two unequal shrubs in each
existing sediment pocket. Their separate deterministic stream adds one batch
of 18 low, coarse gray-green lobes, with narrow bases and spreading upper
foliage. Their six anchors remain Ganesh-owned, dry and outside reservations;
`ganeshLie` ranges from 0.00845 to 0.02795. There are no new trees, colliders,
water or terrain changes. The original regional random stream and all 141 old
batches remain exact; the new batch is explicitly separate from their hash.

`tests/southwest-trees-review.test.js` passed 15/15 (session 67122, exit 0,
45.61 s; not an isolated performance benchmark). It retains the original
`5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30`
non-Y/colour hash and all existing tree/animal checks. New lower-hull contacts
are -0.020033 to -0.019968 m against independent Float32 terrain triangles.
All three homes now pass the unchanged 25-point native shade sampling, one hit
each. A denser check also finds actual 24 cm-wide body-centre shadow patches
at four morning/high-sun directions, with counts [7,9,13,66], [6,19,7,44] and
[2,4,9,74]. This is measured geometric cover, not a claim that an entire
five-metre circle is shaded or that the ambient simulation follows shadows.

`tests/r4-native-habitat.test.js` passed 2/2 in 97 ms. The native driver now
checks actual transformed scenery triangles between camera and body, tries
small live camera orbits, then only if needed walks an ordinary reversible
1.8 m sidestep. It never relocates/fixes an animal pose. An optional
`habitatsOnly` scope avoids repeating the already passed Trogo journey.
Shade height subtracts the actor's actual lifted origin, so an airborne pose
cannot accidentally require flight-height vegetation.

The subsequent MAIN habitats-only Fast retake (session **77116**, exit 1) closes
the ghubr shelter defect: all three unchanged home patches have actual body-height
scrub shade, and both live ghubr approach/response views are unobstructed. The
ordinary approach/return, animal identities and renderer-error checks pass. The
remaining failure is the Navarth deer camera view, still obscured by existing
scenery after its reversible camera sidesteps. That view requires another retake;
the combined R4 habitat packet is not wholly accepted. No tree or animal was moved
to make a screenshot pass. Evidence: MAIN `tests/artifacts/r4-habitats-fast-native.log`
and `r4-r7-journey-fast.json`; the original combined journey remains archived under
`tests/artifacts/r4-r7-first-native/`.


## Navarth native response verified; approach capture limited

MAIN session **48567** passes **25/25**, explicit exit 0, with no renderer
frame errors. The real traveler walks 22.50 m to the deer and 22.50 m back;
the reversible live-camera sidestep adds 1.50 m outward and 1.20 m returning.
All legs complete without falls, water or damage and keep stamina 100.
`navarth-wood-deer-3` moves 20.73 m through graze/walk/flee/return behavior;
the nearest actual registered woodland tree is 3.41 m away. The body is in
frame and the actual triangle ray is clear in both measured views.

The coordinator visually confirmed the response PNG. The approach PNG is
covered by the Carpentry skill modal, so a clear body-ray result does **not**
make that screenshot visually accepted. No new production hook is required
solely for another photograph. Combined with the earlier ghubr shade and
response evidence, the bounded native habitat behavior checks are complete;
this is not acceptance of all R4 terrain and visual work.

Evidence: MAIN `tests/artifacts/navarth-habitat-final-native.log`, the latest
`r4-r7-journey-fast.json`, and `r4-r7-fast-navarth-wood-deer-{approach,response}.png`.
Chromium emitted a GPU command-buffer shutdown diagnostic after the complete
result; it is recorded separately from the empty renderer-error list and exit 0.
