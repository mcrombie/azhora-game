# The Black Fortress at Cape Thalmagar

5 October 2026. The user requested the existing dark castle at the peninsula's tip, facing inland.

The castle from `src/content/regions/thalmagar/thalmagar-world.js` now also builds in the normal playable world, on Cape Thalmagar's northern headland at **(-3100, -2600)**. Its great gate faces **south**, toward the mainland and the existing cape route. The model retains its original scale, needle keep, 18 towers, surrounding walls, iron doors and furnace-lit windows.

The architecture-only build omits the separate art study's sea, sky, terrain and surrounding dead forest. Three static meshes reuse the original castle geometry. The developer art study remains available as a reference scene; there is only one castle placement in the normal world.

A local stone terrace seats the castle at 38 metres. It blends into the existing headland without changing the authored coastline. A clear southern ramp joins the natural cape terrain. Trees, rocks, ground vegetation and wildlife homes keep out of the footprint and entrance approach. Collision follows the visible walls, piers and closed doors; this change does not open the castle interior or begin the future main-quest confrontation.

Visit **F8 → Go anywhere → Cape Thalmagar → The Black Fortress**, or fly north along the cape. The arrival point is (-3100, -2440), facing the approach. The fortress is also a discoverable map landmark.

## Dark tower and atlas, 19 October 2026

The central keep now echoes Minora's Wizard's Tower with five chamber bands,
an open eight-pier lookout, and a tall dark spire. The exterior still uses three
static mesh batches, with no new lights, animation loops or interior loading.
The curtain outline is shared by scenery, collision and the atlas exporter.

The atlas includes the cape's rolling coastal relief and fortress terrace,
sampled from `acorGround` at export time. Contours and downhill hatching remain
under the normal discovery fog, along with a scaled wall plan and tower symbol.
A discoverable **Thalmagar's Fortress / Dark Wizard's Tower** badge sits over the
actual central keep; tracked arrival and quest markers retain their gate approach.

The public `/game-azhora-map` route loads these assets from the latest game `main`
revision, so this change needs a game publication rather than a website rebuild.
`scripts/review-thalmagar.cjs` checks the revealed map, hidden discovery state,
and actual region-70 scenery; `--live` verifies the published route and CDN revision.

## Checks

- `tests/thalmagar-world.test.js`: original art study geometry, resource disposal and animation remain valid.
- `tests/thalmagar-chart.test.js`: terrain fidelity, shared fortress placement, discovery and exported SVG layers.
- `tests/thalmagar-fortress.test.js`: real region-70 construction, original architecture and scale, inland orientation, coastal clearance, cleared habitat, closed-door collision and a continuous walk to the gate and back.
- `tests/acor-environments.test.js`: surrounding regions' natural routes, vegetation and wildlife.
- Native review views: `thalmagar-fortress` (cape overview) and `thalmagar-gate` (southern approach), using isolated saves.

All eight focused tests passed. Both desktop review views completed with no runtime errors; visual inspection confirmed the castle sits on the headland and the gate opens toward the inland approach.
