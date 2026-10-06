# Canerd

Built 4 October 2026 in the main `azhora-game` checkout.

Canerd stands directly on the flat plain at `(-2620, -1035)` in North Celder. At the user's request, the original 76-metre artificial mound has been removed. The castle's level foundations now meet the plain, and its highest tower rises 84 metres above the court. The approach and fairground extend into South Celder, so both regional loaders own the construction.

## Visiting

Open **F8 → Go anywhere → Canerd** to reach the court. Choose **The great horse fair** to approach across the plain. A direct, ten-metre-wide road runs approximately 175 metres from the fair apron through the open south gate into the court; the spiral has been removed.

The court hall and stable are open. A stair on the western side of the court reaches the southern battlement and the view across Celder; the same stairs return safely to the court. The 84-metre high tower is exterior scenery. The castle, ascent and building footprints appear on the discovery maps through the existing exploration rules.

## Built scope

- Flat castle grounds at the plain's elevation with a direct approach road.
- Layered stone castle: nine curtain-wall sections, an open gate, four towers, upper keep, court hall, stable range, windows, buttresses and crenellations.
- Accessible hall interior, courtyard and southern battlement overlook.
- Six empty fair booths and a paddock on the plain beside the castle.

The local Celder lore supplies successive chief-lord building campaigns, the arbitration court and midsummer horse fair. The user's flat-ground layout supersedes the lore's mound for this game; the World Builder repository is unchanged. Exact dimensions and architectural details are implementation choices. No new ruler, civilians, horses, quests or political systems are added; the seasonal fair is not simulated. The current lore's Cref king and Alliance treaty remain unchanged.

## Implementation

`src/content/regions/canerd/canerd-world.js` owns the layout, level foundations, tint, discovery places, routes and review cameras. `canerd-ground.js` renders a one-metre terrain mesh and samples those same triangles for feet. The coarse terrain is lowered underneath it, avoiding invisible terrain above the court. The mound's terrain-climbing override and striped earth tint have been removed. Existing internal route/view ids retain `canerd-ascent` for compatibility.

`canerd-scenery.js` emits 16 merged meshes and vertically bounded collision. Its raised walking surfaces keep the gate passage open underneath the battlement. `canerd-checks.js` exercises actual traveler movement, body clearance, floor support, slope restrictions and falling rules without changing the player's position or save.

Nearby hare and fox ranges stay clear of the castle grounds. Celder's scatter generator retains its historical random sequence before removing reserved instances. The original castle build verified unchanged transforms and colors outside its local clearances; flattening does not change the scatter generator or wildlife ranges.

## Validation

- `npm run test:canerd`: four terrain tests, four scenery tests and two scoped production-world traversal/render tests.
- Full approach and return, hall entry and return, battlement ascent and return: no blocked steps or unsafe drops. The court is now at the plain's elevation; the stair grade remains 0.475.
- Visible terrain raycasts agree with the collision surface. Along the walked route, rendered feet match exactly and the fine mesh differs from the analytic design by at most about 1.1 cm.
- Actual Electron review runs the same movement checks and records screenshots and `tests/artifacts/canerd-checks.json` with `ok: true` and no renderer errors.
- Discovery, map footprint and regional loading checks cover the integration. Flat-ground regression checks reject a raised hill anywhere on the castle site.
- The web export builds into `tests/artifacts/canerd/web`.

`npm run review:canerd` captures the overall castle, ascent, court and high tower. Additional review names are `canerd-hall` and `canerd-lookout`. Review artifacts are local and gitignored.

The corrected standalone Celder scenery fixture now uses the production candidate sampler. It exposes an existing South Celder shrub at `(-2287.138, -643.560)` seated 1.75 metres below the sampled ground, outside the test's 1.5-metre allowance. Baseline comparison confirms that shrub is unchanged by Canerd; the assertion was not weakened. The entire project test suite was not run.
