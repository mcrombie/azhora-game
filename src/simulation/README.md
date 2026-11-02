# Independent campaign simulation

The first runtime is [campaign.js](campaign.js): a deterministic, headless loop for the five-region Lizeem East-West War. Read the [scenario and architecture guide](../../docs/architecture/lizeem-simulation.md) for controls, starting conditions, rules, limitations and verification.

The opt-in [food model](food.js) is advanced by that same campaign clock. Its new
[regional targets](../content/scenarios/lizeem-food.js) are exercised with
`npm run simulate:food`, shown on the map with `npm run start:food`, and verified
with `npm run test:food` and `npm run test:food:desktop`. See the
[food experiment guide](../../docs/architecture/lizeem-simulation.md#food-production-and-supply-experiment)
for units, rationing, trade, disruptions and replay commands. Existing scenario
IDs and exploration saves retain their prior rules. The food map test holds
armies fixed to isolate supply; `npm run start:food-war` and the CLI also exercise
an active food war. `npm run analyze:food-war` checks paired economic disruptions
against an otherwise identical war without food. The renderer uses the core's
`foodRouteStatus()` to explain closed links; daily regional ledgers include food
packed for armies as well as production, trade and meals.
Neither depends on existing farm scenery or skill timers.

The current food war opts into [supply-planning.js](supply-planning.js). This pure
helper ranks proposed orders by expedition endurance and can recommend a short
provisioning or readiness wait. `campaign.js` still chooses the decision days,
musters troops, packs real food and issues every order. Forecasts never mutate
stores or advance time. Scenario `lizeem-food-war-v2` enables this behavior;
`createLizeemFoodScenario({war:true,planning:false})` retains v1 for old replays.
Use `npm run analyze:food-war -- --compare-planning` for matched old/new trials.

The core owns campaign time, territories, persistent armies, regional travel costs, battle outcomes, retreats, recovery, hero journeys, timed engagements, pending encounters and events. Pure helpers live in [routes.js](routes.js), [forces.js](forces.js) and [reinforcements.js](reinforcements.js). It runs without DOM, Three.js, Electron, old quests or loaded scenery. Scenario definitions are provided as data from `src/content/scenarios/`; the core does not import them. UI and map adapters live in `src/app/lizeem/`.

Player knowledge remains outside hidden simulation truth. The map-only test shows full scenario knowledge; the world adapter filters battlefield markers by discovered hexes. Hero participation enters through validated commands and preserves the simulation's authority over consequences. `heroTravel()` starts an adjacent journey, `watchBattles()` enables local encounters, and `resolveEncounter()` submits one result for a pending battle. World-driven scenarios instead report physical region changes through `locateHero()` and reject abstract hero travel. With a nonzero `battleDays` rule, hostile arrivals create engagements with stable IDs, locations and deadlines. `joinBattle(id, position)` validates proximity and readiness; the result is recorded for deadline resolution. Regions with `interceptionStrength` reserve an existing detachment from each side; a successful hero interception removes its strength once, without a generic chance modifier. The renderer never chooses the deduction amount. Committed armies cannot march away, reinforcements join, and recruitment pauses locally. The separate arena in `src/app/lizeem/` never edits campaign state directly. `src/app/exploration/world-war.js` adapts this core to exploration time and physical movement; its save slot is independent.

The existing adventure's authored campaign remains in [content/chapters/civil-war](../content/chapters/civil-war/campaign.js). The frontier experiment remains in [experiments/frontier-command](../experiments/frontier-command/strategic-prototype.js). Neither has been folded into this core.
