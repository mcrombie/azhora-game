# East Lotharn Mountains: landscape and integration plan

Prepared 27 September 2026. **Design and audit only; terrain and gameplay have not been changed by this pass.**

The aim is a beautiful, substantial mountain country that belongs in Azhora: old wooded ridges, imposing exposed rock, working valleys, quiet high meadows, and passages worth discovering. Its shape should remain convincing both from the road and from a summit.

## Scope and pending wording

The request says “work without our recent climbing updates.” Two clarifications are pending: whether that means integrating **with** the new climbing system or keeping East Lotharn independent of it, and whether to implement immediately after this plan or review the plan first.

The landscape design below works in either case. The proposed baseline is continuous walking routes through the region, to its existing landmarks, and along longer alternatives to its summits. Optional climbing can shorten or vary those routes if wanted. The current Suval climbing mechanic should remain intact elsewhere. Do not replace it with Claude's older controller.

## What was reviewed

- Current game checkout: `azhora-game`, committed base `2bc45e3`, with substantial later uncommitted game work including Suval climbing and Iscare. Preserve that work.
- Claude's separate checkout: `azhora-game-south-suval`, branch `east-lotharn`, commit `b108263`. East Lotharn is not yet integrated into the current game checkout.
- Regional sources: `east-lotharn-world.js`, `east-lotharn-scenery.js`, `east-lotharn-caves.js`, `east-lotharn-wildlife.js`, both climbing implementations, and their world/save integration.
- Lore: `../world-builder/azhora_lore/geography/regions/lotharn.md`, read only. Its current version describes tall old sedimentary mountains with cliffs, wooded shelves, broad ridges, deciduous forests, grassy balds, and inhabited valleys. It explicitly does not describe an alpine climatic treeline.
- Recent peak, ramp, and cave captures, plus **fresh renderer captures** of Kemrath, the inn, Stonegate, the northern outlook, and a summit bald. Earlier September 26 valley screenshots predated the height changes and were not used to judge the current terrain.

Baseline command, run in Claude's checkout:

```sh
node --test --test-isolation=none tests/east-lotharn-world.test.js tests/east-lotharn-peaks.test.js tests/climbing.test.js
```

**22 tests passed, zero failed**, in 122.35 seconds. Five fresh native review views completed with zero reported renderer errors. These establish the current branch's baseline, not readiness for the newer climbing controller or approval of its appearance.

Reference captures remain under `../azhora-game-south-suval/tests/artifacts/`: `lotharn-east.png`, `lotharn-central.png`, `lotharn-ramp.png`, `lotharn-kemrath.png`, `lotharn-inn.png`, `lotharn-stonegate.png`, `lotharn-north.png`, `lotharn-bald.png`, and the two cave views.

## Findings and priorities

The region already has worthwhile structure: 38 atlas hexes, four high summits, Kemrath's cultivated floor, the inn at the col, Stonegate's stream and gorge, Upper Olveth's pasture, iron workings, a northern river, and eight empty caves. Keep these anchors and their relationships.

The main problem is the repeated mountain shape. All four peaks use the same 40 m elevation course: approximately 36 m of cliff followed by a shallow ledge. It wraps around the peaks in nearly continuous rings. The summit treatment is also repeated. Fresh captures show these rings enclosing Kemrath and backing the inn, with trees forming horizontal belts on each shelf. Adding more rocks and trees alone would leave that repetition visible.

Other problems to address with the shape:

- Ramps appear as narrow, consistent diagonal ribbons across very large smooth walls.
- Close cliffs have elongated vertical facets; the mesh scale is more apparent than the rock's structure.
- Haze washes out distant ridge shapes, while some valleys are enclosed by equally strong cliffs on both sides.
- Forest selection is broadly uniform; its altitude cutoff does not reflect the lore's soil and exposure rule.
- Eighteen animals occupy six fixed zones, largely on open ground. Woodland interiors need deliberate coverage, given the earlier empty-forest problem elsewhere.
- Cave entrances have similar arch framing. Their silhouettes and surrounding rock need a natural relationship.

**Priority order: mountain silhouettes and valley space; connected walking routes; caves and climbing if enabled; water and vegetation; smaller details and atmosphere.**

## Landscape direction

Keep Azhora's broad low-poly planes, restrained greens, warm gray and tan stone, rounded deciduous crowns, and readable silhouettes. Height should feel impressive through a view of the valley below, a substantial rock face, and nearby human-scale trees. Detail should support those forms.

Preserve the eastern peak as the tallest, with an initial target near its existing 420 m elevation. Preserve the hierarchy of the other three summits. The atlas footprint stays fixed. Test that height and footprint together in simple terrain before committing to a final profile; if a convincing shape cannot fit without crushing the valleys, present that specific tradeoff rather than quietly changing the intended scale.

Retain the lore's stepped geology, but make the steps **uneven, interrupted, and local**. Long rock exposures can tilt across a ridge, disappear beneath woodland, emerge as a crag, and break into rubble below a cleft. No cliff course should automatically encircle every peak. Give the major ridges different orientations, shoulders, and saddle heights.

### Distinctive areas

These are proposed treatments, not claims that these features have already been built.

| Area | Shape and signature features | Experience from the ground |
| --- | --- | --- |
| Kemrath | A broad, irregular cultivated valley; meandering stream, small gravel bars, wooded side-hollows, vines at the warm foot of a slope. Use one strong cliff flank and a more broken wooded opposite flank. | Fields and water remain visible. Openings between trees frame the high ridge. The valley feels like usable country, with room around the stream and fields. |
| Stonegate | A narrower gorge with an exposed tilted rock band, a few short cascades, pools, broken buttresses, and talus below them. | The road occasionally closes against rock, then opens to water and a view ahead. Trees cluster where the bank broadens. |
| Upper Olveth | A quiet pasture bowl with an uneven grassy rim, scattered mature trees, damp ground near a spring, and the existing sheep fold. | A gentler contrast after the gorge; an inviting saddle and a recognizable connection to the through-cave. |
| Central ridge | An elongated, uneven crest with offset shoulders, wooded benches, dark gullies, and localized iron/coal exposures near the workings. | Changing views along a ridge rather than repeated circuits around a tower. Caves occupy particular exposed bands. |
| Eastern summit | The highest asymmetric mass: a broad summit with a lower shoulder, a few substantial buttresses, deep clefts, and a selectively exposed cliff face. | The principal distant landmark. Its route alternates woodland, rock, and high open ground; height is revealed gradually. |
| Western height | A rounded wooded back ending in broken sandstone crags and an irregular meadow. | A welcoming first high viewpoint with a longer hiking route and, if enabled, a short climbing option. |
| Southwestern height | A lower, offset crest with broad grass and woodland shoulders leading toward the southern approaches. | A different skyline and an easier transition into the range. |
| Northern foot | Wooded spurs tapering toward the border river, tributary mouths, clearings, and occasional low rock outcrops. | Mountain relief gradually relaxes into the lower country. No abrupt wall following the hex boundary. |

### Relationships that make details convincing

- Gullies run down into the existing drainage network. Streams descend continuously and meet their receiving water without floating ends or uphill sections.
- Put loose rock beneath a fractured face, coarser blocks near its base, and vegetation in the older, gentler margins. Keep the pass clear of impassable decorative rubble.
- Locate springs and damp vegetation at plausible breaks in the exposed rock. Use a few distinctive falls and pools, not identical waterfalls in every gully.
- Exposed rock changes with slope, local substrate, and soil cover. Avoid evenly spaced color stripes around every mountain.
- Forest breaks follow clearings, grazing, rock, and exposure. Sheltered high slopes can still carry trees; an open summit is an irregular grassy bald with craggy edges.
- Retain managed woodland, fields, the inn, and workings as human-scale anchors. This pass does not require additional settlements or invented NPCs.

## Traversal and caves

The main pass remains a continuous walking route from the existing Amod approach, through Kemrath and the col, down Stonegate to the northern bank. Regional endpoints should truthfully indicate where neighboring playable routes currently stop.

Longer mountain paths should use saddles, wooded shoulders, broken ledges, and switchbacks. They need ground support across their full width, sensible outside edges, and room to turn. Vary their width and surface with context. A worn path can become bare rock briefly and reappear; avoid a pale ribbon running uniformly across every cliff.

Each summit should have a planned route graph with an ascent, a return, cave connections where relevant, and known resting areas. Hiking alternatives should remain usable with climbing disabled. Do not make an unseen drop the only way down. Horses belong on appropriate roads and broader tracks; a summit hiking trail is not automatically a horse route.

If the new climbing system is included:

- Use the current Space-grab, WASD traverse, stamina, ledge recovery, and fall behavior.
- At current beginner values, 100 stamina supports about 25.7 m of surface travel (`100 / 7 × 1.8`), or approximately 22 m vertically on a 60-degree face, before any safety margin. The current 36 m cliff courses do not provide a usable beginner ledge sequence.
- Start with introductory rises around **10–18 m**, then test actual approach, sideways movement, cresting, and stamina remaining. This is a starting design range, not a reachability guarantee.
- Resting shelves must be genuine walkable ground with enough width to stand and recover. Rock color or a decorative shelf must not falsely promise a foothold.
- Higher routes can include more exposed traverses and longer alternatives. Difficulty should come from choosing the route and managing stamina.
- The existing controller handles a terrain heightfield. Overhangs, ceilings, free-standing props, and buildings remain outside its supported climbing surfaces. Visual overhangs must not imply an unsupported climb.

Keep the **eight empty caves**: four rising passages, three chambers, and the Kemrath–Upper Olveth through-route. Give entrances different forms based on their setting: an angled fissure, a low bedding-plane opening, a broken chamber mouth, and a concealed entrance behind vegetation. Keep the accessible floor obvious once nearby. Reserve constructed timber framing for the workings.

The cave locations currently depend on the regular cliff courses. Reshape terrain and re-anchor cave mouths, roofs, and routes together. Removing the course function alone would strand or erase passages.

Cave movement needs explicit ownership of the floor. Enter only when the player reaches an open portal at the right height. Walking or climbing above a cave must stay on the surface. Save cave identity and a safe entrance explicitly; an x/z position alone must never decide that someone is underground. Reset cave support, camera, and lighting together during travel, defeat, reload, and test jumps. Check combat displacement against cave walls as well as ordinary walking.

## Woodland, wildlife, and atmosphere

Use connected habitat patches rather than the same random mixture everywhere. Favor the lore's deciduous trees: warm oak/chestnut slopes, moister beech and other broadleaf hollows, riparian growth, and open pasture or balds. Use silhouettes already appropriate to Azhora; represent missing species conservatively rather than adding unrelated conifer belts.

Place wildlife throughout suitable woodland and valley habitats, including ordinary stretches between landmarks. Extend the existing deer, boar, sheep, hares, herons, and hawk distribution where appropriate. Sheep belong to pasture; herons to water; deer and boar need woodland ranges as well as visible openings. Keep individuals and their movement persistent across revisits and normal camera culling. They must use the actual walkable terrain, avoiding cliffs, cave roofs, roads, and buildings. Persistent wildlife does not mean equal animal counts on bare cliffs or an animal every few steps.

Review silhouettes and color at ordinary play distance before adjusting fog. Nearby cliffs need distinguishable forms; middle-distance ridges need enough contrast to navigate; far ground can fade softly. Avoid using heavier fog to conceal unfinished terrain. Any seasonal palette work should respect the separate calendar/story design; this terrain pass does not change the starting date or implement winter.

## Technical integration

1. Preserve the current main checkout and take a reproducible snapshot before any integration. Claude's 41-file commit cannot be applied wholesale over the later work.
2. Reserve **Iscare's existing region ID 19**. Append East Lotharn as **20**, including destination, survey, fog, map, and save consumers. Append to seeded region iteration so existing scenery does not shift merely because a new region was added.
3. Import the four regional modules selectively; merge terrain, scenery, wildlife, water, and cave wiring into the current world composition. Regenerate generated survey/river files through their scripts. Do not edit the World Builder sources.
4. Keep the newer `src/gameplay/movement/climbing.js` interface. Claude's `mayStep/pace/climbed/slip` controller is incompatible with the current `probe/grab/tick/release` controller. Implement the chosen Lotharn traversal policy without replacing Suval behavior.
5. Build large forms from ridge lines and asymmetric shoulders, then shape drainage and localized cliff bands. Apply restrained variation after those forms are readable. A different random seed for each circular terrace is insufficient.
6. Rebuild paths and caves against the final landform. Use shared authoritative terrain sampling for movement, visible path surfaces, wildlife, and portals.
7. The present mountain mesh samples every 3 m, while climbing probes use much finer height differences. Refine the mesh locally along playable faces and entrances, or share sampled collision geometry. Confirm hands and feet meet what is actually drawn. Keep broad distant terrain coarse and existing batching/culling intact.
8. Update regional descriptions and tests that currently say ramps and chimneys are the only way up, according to the selected traversal design.

## Delivery sequence and review gates

| Phase | Deliverable | Condition for continuing |
| --- | --- | --- |
| 1. Safe integration | Both regions registered independently; baseline Lotharn available in the current game. | Iscare and existing saves still work; Suval movement unchanged. |
| 2. Large-form study | All four silhouettes and valleys in simple terrain with representative trees, before extensive detail. | Distinct profiles from Kemrath, the inn, the northern approach, and the eastern outlook; valley space still fits the atlas. |
| 3. One complete route | Western height as the first full circuit: valley, woodland, short face if enabled, rest, cave, meadow, and descent. | The normal character and camera can complete it without developer movement. Walking-only alternative also passes. |
| 4. Main range | Apply the successful proportions to the central and eastern terrain; finish the pass and all eight caves. | Collision-aware routes and cave transitions pass in both directions. |
| 5. Landscape life | Water details, habitat-based vegetation, persistent wildlife, rock transitions, and atmosphere. | Ordinary woodland has coverage; landmarks remain readable and routes remain clear. |
| 6. Final verification | Paired before/after views, normal-speed traversal capture, focused regression results, and performance comparison. | No terrain holes, false footholds, trapped saves, blocked intended routes, or new major frame-time spikes. |

The first large-form study is the useful point for reviewing the aesthetic direction. Do not distribute detailed scenery over an unconvincing mountain shape and then use that investment as a reason to keep it.

## Acceptance checks

**Visual:** each mountain is identifiable by silhouette; the eastern peak remains the dominant height; cliffs do not form repeated full rings; trees do not form uniform contour belts; the inn has a readable setting; Kemrath has breathing room; the gorge has recognizable water and rock forms; cave mouths fit the surrounding geology. Capture from normal player height as well as an overview, under matching lighting before and after.

**Travel:** walk the pass both ways, visit existing landmarks, hike each intended summit alternative, descend safely, and verify road-appropriate mounted travel. If climbing is enabled, test novice stamina and recovery on real routes, sideways traverses, boosts, falls, and exhaustion with colliders active. The existing broad route grid ignores colliders and water, and its ramp tests do not prove finite-stamina ascents; those checks need actual movement counterparts.

**Caves:** enter and leave every allowed mouth in both directions; visit chambers; walk on roofs without entering; test height-separated portal approaches; save/reload inside and above caves; verify camera clearance and readable lighting. Teleports, defeat, combat movement, and developer flight must not leave cave state attached to an outdoor player.

**Integration:** distinct region IDs and discovered hexes for Iscare and East Lotharn; current version-1 saves retain sensible defaults; climbing saves return to safe ground; old and new coordinates remain inside playable bounds. Preserve East Suval lockdown, Suval climbing, Catie's route, swimming, and affected existing quest playtests.

**Ecology and performance:** verify suitable forest and valley coverage at several points across all 38 hexes, persistent identities across revisits, valid ground/water placement, and no animals on inaccessible rock. Compare loading, ordinary travel frame times, and draw counts against the integrated baseline using the same cameras and machine. Increase local detail only where the player benefits from it.

**Completion evidence:** focused Node suites, isolated renderer movement checks, the web build, and a reviewed set of ground-level and wide captures. A passing route test alone is not evidence that these mountains look finished.
