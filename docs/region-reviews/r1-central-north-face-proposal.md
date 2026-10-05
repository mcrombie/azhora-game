# R1 central north face: bounded proposal and candidate review

Current state: the bounded shoulder and separate ramp-join repair are mirrored
to MAIN. Final Node checks pass 10/10 and native session 6254 completed 40 checks
plus 9 Continue checks, explicit exit 0 with no renderer errors. Native session 73887 and its clear elevated overlook now establish visual
acceptance of this bounded shoulder and route-join correction. The Upper Olveth
connection and broader western/eastern cliff repetition remain open.

## Initial proposal (historical)

This proposal was prepared before either new terrain correction, after the final
shoulder/cave native review. The accepted cave contact,
admission, Slabs, held-climb and northern escape evidence remains intact. The
latest [western-shoulder baseline](../../tests/artifacts/lotharn-western-shoulder.jpg)
and [north-face baseline](../../tests/artifacts/lotharn-north.jpg) still show repeated
cliff courses and tree belts. The existing small shoulder is visible, but it does
not resolve that larger design limitation.

The next bounded correction should address the **central north face**, inside
`x=[-1280,-1175], z=[-1045,-977]`, with a 10 m smooth edge fade. That patch is
wholly at least 17 m north of `VARN_ROCK`. It contains several exposed upper
courses with room between established routes. It is not a proposal to rebuild
all four massifs or flatten the deliberately tall climbing country.

The read-only two-metre survey in
`tests/artifacts/r1-central-north-proposal.{mjs,json}` found 766 eligible samples
after the reservations below. At 341 samples, additional positive rounding could
exceed 2 m; the largest upper bound is 20.597 m at `(-1258,-989)`, where current
rounding adds 3.466 m and the nearest authored route is 29.750 m away. This is a
feasibility bound, not an implemented height delta. The nearest cave line among
eligible samples is 28.297 m away.

Actual composed baseline ground, measured with the production climbing gradient's
0.4 m half-step, has a median slope of 1.449 m/m in the 341 potentially useful
samples, a 95th percentile of 19.587 m/m and a maximum of 34.959 m/m at
`(-1256,-981)`. This patch includes genuine cliff faces; these values do not
advertise a walkable shortcut. The nearest eligible route-line distance is
7.106 m, and the proposed influence still fades to zero at exactly 7 m.

Use two unequal, horizontally defined soil shoulders across the courses, leaving
irregular rock ribs between them. Start their centres near `(-1255,-999)` and
`(-1207,-1006)`, with different widths and orientations, then assess their
silhouette in the native renderer. Raising the local lower part of an existing
course toward its raw uplift is the permitted direction. Do not lower cliffs,
change the course generator, or make a constant-height shelf. Fold the change
into the existing `lotharnLandscapeDelta` so its established legacy-scenery
inverse remains authoritative. Choose final amplitudes from the native image,
not from the upper-bound survey alone.

Reservations are exact:

- Keep `peakUplift`, all `RAMPS`/ledge inputs and the complete `CAVE_LINES`
  definitions unchanged. Keep at least the existing 7 m zero-change route band,
  fading to full influence only by 18 m. Retain the broader band where actual
  route or rail geometry requires it.
- Change nothing with raw uplift at or below 80 m; fade the field in from 80 to
  100 m. Keep every summit bald and a 12 m bald guard unchanged.
- Preserve the existing central-chimney rectangle
  `x=[-1250,-1170], z=[-1120,-1057]` plus its 12 m fade. Test the complete
  passage, both portal searches and its roof. Nominal mouth positions alone are
  insufficient.
- Keep all ground in `VARN_ROCK` and a conservative 6 m lip-sampling apron
  numerically unchanged. The direct probe reaches 4 m (`RIB.reach + 1`); a
  shoulder also reads the nearest way and 3 m along it. The proposed box leaves
  11 m beyond that 6 m reservation, but the actual composed-ground comparison
  must prove this. Keep gates,
  closed-border admission, wicket, bench rims and Slabs code unchanged.
- Keep Upper Olveth's floor/beck, Kemrath, Stonegate, the pass road, inn and iron
  workings unchanged. The existing lowland/edge masks remain in force.
- Preserve all tree identities, eligibility draws, collider positions and
  authored animal homes. Re-seat only the visible roots/body origins affected
  by changed physical ground, using actual rendered triangles as before.

Before committing a candidate, compare composed heights at all affected route
footprints, cave/roof searches, low courses, and Varn/lip inputs against the frozen
source. Re-run the affected landscape/root checks once after the field freezes.
Require a complete continuous departure and return: start on clear Upper Olveth
ground, take the established central approach/ramp and ledges through the
affected north-face section, and come back to the same lower departure. Use
ordinary input, the normal held-climb transition only where the existing route
requires it, and real novice stamina/collision/falling. Verify the downward leg
as carefully as the upward leg, with no placement nudges, immune fall state or
intermediate F8 restart. Record the exact waypoints before running the candidate.
If the protected composed inputs remain exact, this affected journey and the
native views are the appropriate check; a new full fort flood is warranted only if
the candidate changes its physical inputs or exposes a route concern.

Use the existing `lotharn-north` view, looking from `(-1235,-1175)` toward
`(-1262,-990)`, for a comparable silhouette. Add a grounded Upper Olveth view
near `(-1328,-1025)` looking east-southeast toward `(-1238,-999)`; confirm its
actual clear standing/camera position during capture. Keep the same daylight,
view distance and framing before/after. Acceptance requires an unmistakably
broader, irregular slope with grounded woodland and intact route readability.
Do not accept a numeric delta that remains invisible in the image.

A western-north trial box `x=[-1545,-1395], z=[-1070,-977]` had no raw uplift
at or above 80 m, so it would miss the prominent upper courses. A closer western
box `x=[-1520,-1468], z=[-967,-934]` left only two surveyed high-course samples
outside the 7 m route guard and intersects the fortified rock. Those are poor
first candidates. The central pilot therefore leaves the repetitive western and
eastern faces explicitly open for a later, separately bounded design decision.

## Review candidate and independently captured baseline

The first candidate was implemented in REVIEW; its later MAIN mirror is recorded
below. `east-lotharn-north-shoulder.js`
contains the bounded field; `east-lotharn-world.js` composes it with the previous
landscape field. Scenery removes this revision at each old Float32 mountain-grid
corner before supplementary canopy eligibility is evaluated. Roots still use
current rendered triangles. This preserves the former triangle interpolation,
not merely an analytical height at the candidate point.

The new pure check proves exact zero change at 33,750 route-footprint
samples, 39,450 cave-corridor samples, 36,375 Varn-plus-six-metre-apron samples,
5,481 lowland/road/workings samples, 716 box edges, 379 low-course samples and
296 bald samples. All eight derived caves retain their portals, openings,
endpoint levels and floors sampled every 0.25 m. The 2 m field census still
finds 267 changed samples, 146 above 2 m, and a maximum 20.356178 m addition.

A standalone scenery kit and the actual composed game world are different
baselines. The standalone pre-candidate capture has 5,657 trees (59 canopy).
The independently captured actual pre-candidate world has 5,462 trees (58
canopy), reflecting its existing local ground/eligibility composition. Do not
substitute one for the other or infer a candidate regression from their count
difference. `tests/artifacts/r1-central-north-before-loader.mjs` loads the two
archived pre-candidate R1 modules read-only while retaining all current shared
world composition. Its actual old-world tree hash is
`f7f11bc8a0dfbef84bad22805da6c7bbb5e2907746a02cc1881a2bd6e50c3706`;
its 245 ordered instance-batch non-Y-and-color hash is
`23d1b2354089feb8d1088771a3c6edf19684a43ccb89b2d40afafce8afa296f6`.
These references were captured from old source, before evaluating the final
candidate against them.

At this initial stage, the complete Upper Olveth/southern ascent return had not
been proved. The first ordinary-controller attempts with both old and candidate
source stopped at
exactly `(-1147.015071,-906.905259)`, the first ramp/ledge join, with the same
colliders, zero falls and zero damage. The field itself has a 0.2658 m jump only
0.001 m beyond the nominal join: `nearestOn` replaces its exact station with a
weighted average, so the ledge starts partway through its rise when it wins the
nearest-route selection. Nearby sampled slopes are below the grab threshold;
this is not a valid place to force a climb. A pre-candidate attempt from ledge4
also stops at its starting join. These locations were outside the shoulder candidate
window. Tightening the steering tolerance did not remove the first step.

Both full-route traces are retained under
`tests/artifacts/r1-central-north-before-route-1.json` and `...-route-4.json`;
the initial candidate trace is `r1-central-north-route.json`. No terrain,
walking threshold, hold restriction or fall expectation was changed to make
those initial traces pass. The later separate join repair below resolves the
southern authored ascent/return; its 900.399 m controller result supersedes these
initial join stops. The longer Upper Olveth-to-trailhead connection remains
unproved. These archived failures are not the status of the mirrored candidate.


## Separate central ramp join repair

The visual shoulder remains isolated in `east-lotharn-north-shoulder.js`. A
second helper, `east-lotharn-route-joins.js`, repairs the independently reproduced
old ramp/ledge steps. It restores exact segment station only within the first
and last six metres of central authored ways, with the existing lateral tread
fade. All other `nearestOn` callers (valleys, rivers, roads, bridge rise and Varn
shoulders) retain their original behavior. No walking, climbing, stamina or
admission threshold changes.

The three reproduced steps of 0.265751, 0.273180 and 0.458095 m now change by
less than 0.0004 m over the same 0.001 m forward sample. A one-metre census finds
841 altered samples, ranging from -0.606527 to +0.713965 m. All eight caves retain
exact portals, openings, endpoint levels and sampled floors. Original scatter
eligibility subtracts this small direct change and its derived Varn-rim response;
roots continue to use the new rendered ground.

The final actual composed world check passes **4/4** (`r1-central-north-world-final-supported.log`,
explicit process exit 0, 161.30 s with concurrent machine work). It retains the
independently recorded 5,462 trees and all 245 ordered instance non-Y/color hashes.
All 104 trees whose lower footprints lie in the shoulder or join influence pass
2,080 actual retained-triangle raycasts; the highest root point is 0.029697 m
below its local surface. An earlier expanded probe omitted separately drawn
mouth/coarse ground and failed to find a surface; correcting the probe required
no production tree placement change.

The complete affected upper ramp has a **115 m ordinary walking return**, with
zero climbing, falls, damage or water. The full southern authored ascent and
return now completes **900.399 m continuously** with one novice controller,
including 81.611 m of normal climbing. The fifth ramp needs rests on existing
adjacent ledges; the return takes the existing lower ledge and a two-metre
outward sidestep around the retained tree at `(-1217.246,-1056.922)`. Trees and
collisions remain active. Stamina spent and recovered are both 220.325, minimum
stamina is 5.967, and the traveler finishes dry at 100 health and 100 stamina.
There are three real gravity-to-climb catches, each no more than 0.016667 m and
one 30 Hz frame; there are no uncontrolled landings, water transitions or damage.
These catches are explicitly recorded, not described as zero-fall walking.

The 39 m controlled descent beside ramp5 uses the production held-climb
controller; the height lost during attached descent is not a terrain fall.
The driver uses the world's actual cave arrays, support lookup, collision bodies,
locomotion growth, combat recovery, falling and swimming order. Its early failed
route and tree-obstruction traces are retained separately. The passage from Upper
Olveth to the southern trailhead remains an unproved longer connection; this
successful lower-trailhead ascent does not claim that connection.

The shoulder and join repair are now mirrored to MAIN and the final clear
central-north overlook below passes the bounded aesthetic acceptance gate; this report does not
mark the broader repetitive western/eastern faces complete.


The final bounded Varn follow-up passes **3/3** (26.32 s, explicit exit 0).
At half-metre spacing it locates 87 changed rim points within
`x=[-1155.5,-1128], z=[-918,-903.5]`; maximum change is 0.340033 m. Every changed
point keeps a positive rim and the no-hold rule, and all 65 measured outward rays
that cross an actual existing retaining rim remain blocked. A separate inner
ramp-to-ledge ray has no rim in either field: removing its old weighted-station
step is the intended repair. Across the Varn circuit, three western pass forts
and six Feradom castles with their surrounding approaches, all 18,809 sampled
heights are exactly unchanged.

The same focused fixture builds real Varn masonry and admission colliders on
the composed heightfield. Ordinary movement still stops at both shut gates and
at the wicket from outside. With production climbing and no attached recovery,
level 17 crests both Slabs with 2.455/2.875 stamina remaining; level 16 exhausts
and takes the full 100-health fall. This is an isolated actual-fortress check,
not a repeated whole-range lattice flood. The final pure shoulder and join
checks also pass **3/3** on the combined source. Ten final assertions pass in
three sequential processes; no earlier failing candidate is represented as the
accepted numeric result.

`tests/artifacts/r1-north-final-packet/manifest.json` records the exact source
hashes, four new registered-test candidates and dependencies. Its first patch
contains the visual shoulder; the second contains only the central join repair
relative to that candidate. Before mirroring, all three existing production files had exact
pre-candidate matches in MAIN. The packet changes no shared `world.js`,
`world-terrain.js`, `main.js`, controller or save code. The coordinator has now
hash-validated and mirrored all 12 packet files to MAIN. All four new test
entries are registered once in both manifests, retaining the existing order.
Combined R1/Mithala native session 6254 completed 40 checks plus 9 Continue
checks, explicit exit 0 and renderer errors []. Those runtime results alone did not establish visual acceptance: the broad
north and grounded side captures were insufficient. The clear elevated
inspection below now accepts the bounded pilot, while the Upper Olveth
connection and broader cliff-repetition limitations remain open.


## Bounded pilot visual acceptance

The coordinator inspected MAIN `tests/artifacts/lotharn-north-overlook.jpg`
from native session **73887**, which closed with explicit **exit 0** and renderer
**errors []**. The inspection camera is exactly `(-1270,400,-1090)`, aimed at
`(-1230,285,-1005)`, with no camera pull-in. The frame clearly shows the oblique
earth shoulder and unequal slopes below the bald summit, with established
routes and trees preserved. The bounded shoulder and separate route-join
correction are accepted together with the earlier numeric/controller evidence.

The earlier broad north and grounded side frames were occluded and insufficient
for this decision. The elevated inspection does not conceal or certify the large
repeated cliff courses still visible on neighboring faces. Wider R1 aesthetic
review and the Upper Olveth-to-southern-trailhead connection remain open.
