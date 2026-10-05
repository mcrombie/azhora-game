# R10 western seam investigation

Review worktree only. This packet separates physical terrain discontinuities from missing rendered-ground dependencies. It does not accept the whole R10 group or the frozen Claude delivery.

## Three dry physical discontinuities

The read-only screen covered 1,184 hex edges and 22,093 samples. Its water screen was only a candidate filter. The following three maxima were then decomposed into base terrain, authored landforms, water, city pads and path proximity using the actual production height functions.

| Candidate | Exact midpoint `(x,z)` | Physical jump over 1 mm | Classification |
| --- | --- | --- | --- |
| Internal Isareos edge | `(-2300.434941,-201.690108)` | 10.475881 m | Final ground equals the discontinuous base on both sides; no authored uplift, cliff, ramp, river cut or city pad. |
| Meneth / West Lotharn | `(-2099.568915,-259.925135)` | 10.191565 m | The base jumps 11.263357 m; the existing partial Lotharn seamless correction reduces but does not remove it. Peak uplift is zero. |
| Elagos / Nesdor | `(-1450.434941,346.292648)` | 4.570540 m | Final ground equals base on both sides; no lake/river cut, city pad or authored cliff. |

- Isareos is 158 m from the nearest river centre, 175 m from Menora's northern approach, and outside all Menora grading/reservations. Both samples belong to Isareos, in adjacent hexes `(-8,103)` and `(-8,104)`.
- Meneth/Lotharn is 69 m from the nearest beck centre. `peakUplift=0`, `onCliff=false`, `onRamp=false`; Meneth's ridge contribution differs by only 0.000010 m. The 10 m step is not the authored south rampart.
- Elagos/Nesdor is 128 m from the nearest beck and 233 m from the haul road. `elagosWater` and `westWaterSurface` both return null; all built terrain pads are outside their reach.
- These are countryside crossings. No marked-road obstruction or collision-aware travel acceptance is claimed from these numeric probes.

The seven-hex base stencil drops an influencing second-ring hex when the containing hex changes. The continuous stencil reduces the same three raw base differences to 0.002034, 0.001723 and 0.000200 m over 1 mm. Its changing relief phase can still be steep; continuity alone is not a walking test.

Authorized follow-up, after the shared-ground packet freezes: correct only the demonstrated edge bands, with a full core and bounded feather; account for the existing Lotharn partial correction instead of applying it twice. Preserve authored peaks, city grading, river profiles, legacy scatter eligibility and all ground outside the bands. Check endpoints/corners, retained visual ground, stable placement and ordinary controller crossings in both directions. No global terrain interpolation change is authorized.

Evidence: ignored `tests/artifacts/r10-boundary-screen.{mjs,json}` and `r10-seam-classification.{mjs,json}`. The latter is a pure layer/feature investigation, not a scene fixture.

## South Mithala / West Lotharn rendered-ground ownership

This is a different defect: the coarse grid is lowered by `westLotharnTerrainSink` wherever the retained summit ground covers it, but the summit mesh originally loaded only with scenery job 27.

| South Mithala site | Physical height | Previously observed coarse height | Retained fine triangle height |
| --- | --- | --- | --- |
| `(-2032.363281,-973.042053)` | 53.067951 m | 20.537 m | 53.015835 m |
| `(-2036.640,-980.477)` | 45.677660 m | 35.355 m | 45.682199 m |

At the second point the direct sink is zero, but neighboring lowered vertices still depress its coarse face. Moving foliage down to that face would conceal the missing-ground dependency.

The exact summit drawn-cell mask has centres in South Mithala (167), Vastos (234), Meneth (239), Isareos (179), Yunethre (226), East Lotharn (1), West Lotharn (33,848), and unbuilt Open country (631). Counts precede cave-mouth exclusions. The two Mithala samples are retained fine cells, away from those mouths.

### Ground-only extraction

- `src/west-lotharn-ground.js` owns the unchanged summit and cave-mouth mesh generation and the existing beck refinement. Shared job `westLotharnGround` belongs to `[11,12,16,20,27,28,38]`, with coarse terrain dependencies for these owners. West Lotharn's coarse apron already covers all four beck corridors.
- Mesh names remain `West Lotharn summits ground`, `Ground at the mouth of …`, and `West Lotharn beck ground: …`. The shared group is `West Lotharn fine ground`.
- The original candidate and tree-footing samplers remain separate to preserve West Lotharn's seeded forest exactly. Neighboring scenery uses a cached sampler over retained Float32 faces, including cave cutouts; no runtime scene traversal or raycast is introduced.
- Beside refined becks, the composed callback uses the retained/replacement surface. Taking the maximum with the old removed coarse face would cover the water again.
- The job runs before regional scenery. Initial generic scatter in its seven affected owners is deferred until the shared ground is ready. Starting in Drent leaves the shared job deferred.
- Mithala and overlapping East Lotharn kits receive the shared surface. Global rendered footing composes it with the existing Gala/Telemonia/Suval surfaces; Babon's exact branch remains intact.
- West Lotharn's forest, cave rock, water and update logic stay in job 27, reusing the shared ground. Physical terrain, water profile arrays, cave geometry and collision rules are unchanged.

### Verification

The original production river/scenery fixture was captured before extraction. The final post-extraction scoped suite passes **8/8** in 16.50 s:

- All displayed geometry SHA-256: `bf4ef9e1470e64a80f4d109aa3f38784ff869cdc8e173f43855bce6b14df52c3`.
- Summit/mouth/beck geometry SHA-256: `62b66eba2ceb71b2f5e564f61008a62b7d181edfec98a92426adab3e720b06aa`.
- Both hashes are exact, including attributes, indices, instance transforms and colours. The fixture retains 3,178 registered trees, 4 water ribbons, 1,074 tufts, 229 rocks and 300 batches.
- 2,335 wet beck samples remain visible; no missing faces or sampler errors. 1,333 retained edge samples join within 0.000002 m. All 66 nearby trunks meet the rendered ground and retain their original identities.
- Both Mithala points match independently raycast retained fine triangles within 2 mm.
- All 262,374 retained triangle corner/centre samples lie in the seven declared built owners or unbuilt Open country. This includes the mouth geometry and beck replacements, not only summit-cell centres.

Production Mithala-first then West-Lotharn-later regression passes **2/2** in 117.30 s. Shared ground is ready while job 27 is pending; both border support samples agree with actual meshes. Later loading reuses all 53 shared meshes and leaves all 69 existing Mithala instance batches, colours and 267 tree identities unchanged. An initial test selected all cave-mouth meshes by their shared name prefix and therefore counted 13 East Lotharn mouths as new West Lotharn ground; the corrected test checks ownership explicitly and logs those unrelated mouths. No production change was needed for that selector failure.

The separately owned Mithala prop fixture passes 4/4 with the new surface, including 3,187 forb clumps and 43 stones. Native F8/departure/return and clean-relaunch save journey remain separate gates. These are scoped correctness runtimes, not startup benchmark claims.

Files in this extraction packet: new `src/west-lotharn-ground.js`; `src/west-lotharn-scenery.js`; narrow shared `src/world.js` import/job/callback changes; two appended checks in `tests/west-lotharn-river-ground.test.js`; new `tests/west-lotharn-ground-loading.test.js`; only ground-group selectors in `tests/west-lotharn-scenery.test.js`; this report. The broad legacy scenery fixture has not been rerun.

## Bounded physical correction and preservation

The subsequent physical patch changes only capsules around three explicit atlas
segments: Isareos `(-8,104)` edge 4, Meneth/Lotharn `(-5,102)` edge 1, and
Elagos/Nesdor `(-3,110)` edge 5. Each has an 18 m full core and a smooth feather
that reaches exact original terrain at 36 m. All contributing hexes retain their
own authored wavelength; interpolating wavelengths caused steep phase changes.
The existing partial Lotharn base correction is suppressed only as this local
replacement takes over. Meneth's physical ridge share uses the continuous weight
in the same band; its original ecology/placement classification stays unchanged.
Authored peak, cliff, ramp, settlement and water-profile definitions are untouched.

Saved placement uses the original analytic height and original Float32 triangle
plane for candidate acceptance, while visible placement uses repaired terrain.
The world callback preserves the complete village, pond, Port Calos, grove and
Ibenwood river layers: outside the correction it returns the exact existing
world value; inside it restores only the old base and retains later-layer delta.
An initial bare-base callback omitted those local layers and shifted unrelated
scatter. This was caught by the original wildlife-home hash and corrected before
integration; the hash was not repinned.

Final pure checks pass **6/6** (5.50 s):

- Former 1 mm jumps now measure 0.000231, 0.000562 and 0.000064 m.
- All 294 edge/corner probes converge; maximum difference is 0.000584 m.
- More than 700 probes outside the bands retain exact original physical height.
- All 333 actual world-composition village/pond/port/Ibenwood samples preserve
  exact callback values, including genuinely modified local layers.
- All 3,456 old coarse-triangle samples reconstruct exactly; 1,079 differ from
  their new physical terrain, so this exercises the legacy path.
- Existing river profile and pool arrays keep their original exact hashes.

The original R11 logical home/species/scale hash for 141 residents is restored:
`55359edba93c8c17818e649d02c9b6c6b37394a1490916bfb2c087090d2cc49c`.
The separate R11 fixture passes 5/5 on the corrected callback (74.20 s), including
all 152 current bodies and its approved new habitats.

The ordinary controller suite passes **6/6** on the final composed callback
(141.82 s). Both directions reach every unchanged `p +/- normal * 18 m` endpoint,
with zero falls, damage or wet frames, no collider bypass and no jump/climb input.
Maximum grounded rise is 0.080036 m; paths are 35.84-35.94 m. The pre-repair focused
baseline failed all six checks. Wider 72 m traces remain diagnostic: Elagos is
safe both ways, while Isareos and Meneth still meet authored steep relief or trees
outside the corrected core. Those outer hills were not flattened to pass a test.
Ignored evidence: `r10-western-seam-controller-focused-baseline.json` and
`r10-western-seam-controller-composed-final.json`.

The final physical packet adds `src/western-dry-seams.js` and
`src/western-legacy-ground.js`; updates the bounded base/ridge composition in
`world-terrain.js`, `west-ground.js`, and `west-lotharn-world.js`; and adds legacy
eligibility to `world-regions.js`, `west-lotharn-ground.js`, and
`west-lotharn-scenery.js`. World integration consists only of the legacy imports,
composed callback/coarse-grid construction, and the corresponding kit fields.
The existing shared-ground extraction and Telemonia town streaming hooks remain
separate. New pure/controller tests require manifest registration by root.

Final scoped scene regression passes **8/8** (26.02 s). Replaying the original
height callback retains both original all-mesh and fine-ground byte hashes above.
Comparing all 331 current meshes against that replay finds 329 ground-Y component
changes, 1,578 local ground normal/colour component changes, and 238 instance-Y
changes, with zero unexpected changes. Allowed differences are confined to the
36 m repair capsule plus a 16 m coarse-face/normal/root apron. Retained indices,
X/Z, rotation, scale and all instance colours remain exact. All 3,178 registered
tree identity records and the 236-batch/14,180-instance non-Y hash stay original:
`6f75d6f6c4def7f2953820fd74070ac475691f775ada480e187b9c2b879e57ce`
and `186d6f0a6e35581a8e41f54c9a92f31935338f286c1f41543ae8ebb5fa96c685`.
The 2,335 water samples, 1,333 joins and 66 actual visible bank-tree footprints
remain valid. The frozen packet has no unresolved scoped correctness failures;
main integration and native journey checks are separate root-owned gates.
