# The five-region simulation test
This is the first independent campaign loop. Its proving ground is the East-West War between the West Lizeem League and East Lizeem League, with Minora neutral. The map-only launcher is separate from the existing adventure. An optional world test now connects the same core to the exploration build. The numbers below are test tuning, not settled world lore.

## Food production and supply experiment

The 12 October 2026 food pass has a dedicated map-only test. It uses the same authoritative
`campaign.js` loop, with an opt-in `food.js` helper and fresh regional targets in
`content/scenarios/lizeem-food-targets.js`. It does not enable food in existing playable
scenario IDs or alter old saves. The separate Nethereum review below introduces the first replacement scenery. None of its production
comes from old farm plots, crops, inventories, quest states or active-play timers.

### Unified playable Lizeemi War

**Begin Lizeemi War** now creates `lizeem-adventure-food-v1`: the reviewed farms,
towns and food economy share the full adventure clock. Choose allegiance with
Taleth inside the explorable tower, use his Stillroom training at any time, and
leave at dawn. Supply production, deliveries, meals and army provisioning happen
once per completed adventure minute through `campaign.js`. Local fighting holds
time; its casualties reconcile the food ledger without another economic tick.
The map's **Food and housing** report uses completed campaign minutes, including
route deadlines and reserve estimates. Rest previews the actual food-aware army
orders, so a regrouping pause can be skipped without silently passing a battle.

New journeys use the existing main war save slot. Continue chooses scenery and
rules from the saved scenario ID: old elapsed saves retain the older countryside
and no-food rules; the day-based food test retains its separate slot. In-session
loading refuses a different ruleset and directs the player to Continue in the
main menu. This avoids replaying old battle commands under different supplies.

Reviewed scenery uses merged buildings, fields and livestock rather than new
per-building simulations. The lookout combines the same near countryside with
the cached authentic distant regions, masking their overlapping old farms.
Minora's existing warship and two traders retain their movement. Those boats are
ambient traffic; physical food shipments, individual building assets, construction
and farm intervention quests are still separate future work.

The lookout alone uses a lighter triangulation of the same sampled terrain.
Every tile/block edge remains exact; the surface can only lower, by at most 0.2 m,
so it cannot cover the original roads and fields. Walking restores the original
geometry and always uses the original collision surface. In the measured five-region
build this removes 160,006 terrain triangles (25.2%) with about 105 ms of preparation
on first opening the lookout. The reviewed river shares the authored water shader,
including its world-coordinate ripples and fog, across the near/distant boundary.

`npm run test:unified-war` covers the combined model, old-save isolation, local
battle accounting, food time labels and training. `npm run test:unified-war:desktop`
launches a hidden isolated main-menu playthrough; artifacts use `unified-war-*`.
Append `-- --unified-war-continue` for real page reload/Continue checks, or
`-- --unified-war-profile` for matched original/combined lookout and street frame
samples. These use separate artifact prefixes and do not access the player's saves.
The reviewed supply rules can lengthen an unattended war. At seed 1731 the current
food rules finish at 76 campaign minutes, versus 33 without food. Scripted successful
West and East interventions finish at 16 and 46 minutes respectively in either
ruleset. Ten seeds across each of these three paths in both rulesets all finished
(60 runs); supported runs all won for their chosen side. These are deterministic
model checks, not human playtime measurements or final balance targets.

Final validation passed 35 focused model/presentation tests, 110 native gameplay
assertions and 58 native profile assertions, with no recorded renderer errors.
Fresh-page Continue also passed for a unified outdoor save and a legacy tower save.
The final isolated matched lookout sample measured 33.3 ms median for the original
scenery and 33.4 ms for the combined view (both p95 66.7 ms). The combined view still
draws more geometry and batches, and timings varied across runs; this does not
establish zero overhead or a fixed frame rate. First exterior preparation took
15.7 seconds, with the complete first door transition taking 16.8 seconds. All five
regions then reuse that exterior. Layout and module-link checks pass.

### Food-enabled playable world test

Under **Earlier campaign rehearsals**, choose **Start food world test** (or launch
its menu with `npm run start:food-world`). This earlier day-based experiment is a
separate menu mode (`food-world`), scenario (`lizeem-food-world-v1`) and save
(`azhora-lizeem-food-world-v1`; desktop directory `saves/lizeem-food-world-v1`).
Old war and exploration saves cannot be loaded into or overwritten by this mode.

Begin with Taleth in his chamber, collect the horse from Bear, then explore or
follow the armies. M opens the geopolitical map and the folded **Food and housing**
report. Choose a region there to inspect stores, completed-day production and
transfers, rations, stability, housing and local/approaching armies' carried food.
The stability layer uses food unrest/rations in this mode, with active battles
still marked as conflict. F8 retains travel, mounts and reveal; F5 saves.

`app/food-world/scenario.js` applies the existing food targets and supply planning
to the current hero war, including commanders, interceptions and allied assaults.
`campaign.js` owns all economic and military changes. Finishing a hero battle
advances food on the same campaign days; there is no separate scenery clock.
Housing remains capacity, independent of actual population.

`app/food-world/world.js` assembles the five reviewed agriculture layouts through
the shared review terrain/deck helpers and regional scenery adapters. It retains
Minora and its hero hosts, while excluding the legacy global world/farm builder.
All five regions are prepared once on first leaving the tower and reused during
travel. The continuous 3-metre terrain grid is split into render tiles for culling;
movement and crop surfaces use those same triangles. The lookout shows this
actual countryside rather than the old exported farm panorama.

Field colour and crop cover now reflect regional production condition, food
unrest and active battle disruption. `app/food-world/conditions.js` is a read-only
projection; `farm-view.js` changes existing geometry buffers only when output
changes. Houses, collisions and housing capacity remain intact. The model does
not yet record damage to individual holdings. Map explanations use the actual
completed-day transfer ledger and distinguish it from pending production changes.

After leaving Taleth's tower, open **F8 → Nesdor shortage and recovery**. This
temporary exercise holds army orders and recruitment, using the same food rules
in `campaign.js`. It shows normal trade (day 2), disrupted fields, diverted relief,
shortages (day 32), restoration, returning meals (day 33), and resumed trade
(day 52). Quiet days advance at 20x; each explanation stays for eight seconds.
Pause or Next stage permits closer review. **Return to my game**, or Esc, restores
the original campaign, hero position, discoveries and unsaved progress. Exercise
checkpoints cannot be written into either persistent war save slot.

The exercise lives in `app/food-world/demo.js` and `demo-plan.js`; it drives the
existing host, with no second active economy or autonomous damage model. Food
deliveries by physical boats/carts, migration, construction and farm intervention
encounters remain future work. Minora's ambient river traffic moves without owning food deliveries. The bounded
playable war still ends at victory.

Checks: `npm run test:food-world` covers scenario composition, separate save
validation, deterministic economic replay and hero victory with food effects.
`npm run test:food-world:desktop` uses an isolated profile, checks all five towns
and farm lanes, interception/allied-assault staging in all four war regions,
physical Caricas combat, map reporting and save/reload. Captures and results are
written to `tests/artifacts/food-world-*`. The native check also walks the named
food demonstration and verifies exact return and save isolation; its stage
captures are `tests/artifacts/food-demo-*`. Presentation tests cover the economic
sequence, clock/pause controls and reversible field buffers.

#### Shared countryside appearance and regional assets

The food world uses a new agricultural layout and shared
`world/scenery/agriculture-scenery.js` renderer, rather than the older towns'
individual detail builders. Its first generic buildings, sparse crops and simple
sheep caused a visible quality regression despite the larger settlements. The
countryside polish updates that shared renderer for both the farmland review and
playable food world. Architecture, field detail and livestock remain merged
static scenery; the existing regional condition projection still changes crop
buffers. This visual work does not change population, housing budgets, productive
capacity, food rules or saves.

Crop silhouettes share one generated 768 by 256 cutout texture (about 1 MiB with
mipmaps), with no downloaded asset or per-plant object. The standalone review
adds one merged crop batch per farm; the food world already separates crops for
condition updates. Each card retains its ground height at both edges so damaged
crops shorten toward the slope and recover without floating. The sheep are
static grazing/standing scenery in this pass, not simulated livestock agents.

Housing is already separate from special-purpose buildings: only residential
`house` records receive housing capacity. Barns, granaries, river stores and
market/town halls contribute none. Minora also retains its authored library,
barracks, temple and Guild stable. These existing places are scenery and named
destinations, not a completed economic building system.

**Design proposal, not implemented:** represent regional institutions as durable
assets with stable identities, locations, roles and operational condition,
independently of population and decorative mesh counts. Granaries could protect
stores; markets and quays could support trade; barracks and stables could support
military preparation; halls and libraries could provide civic and knowledge
services. Begin by cataloguing existing places and connecting a few explicit
effects to the authoritative campaign model. Construction, maintenance, staffing,
storage caps and population growth require separate rules and balance work;
adding a decorative building must not silently grant an economic bonus.

For a focused street, grain and livestock capture, run
`npm run test:farmland:desktop -- --polish-review --region=caricas` (or another
review region). The ordinary desktop command still checks all five regions,
walkable routes, housing and food reports, and cached geometry reuse.

Verification: all 27 agriculture/housing checks and nine food-world checks pass,
including sloped crop shortening and exact restoration. Native review covers all
five regions; the playable food-world run also passes combat staging, physical
Caricas combat, save/reload, and the seven-stage shortage/recovery demonstration
with exact return to the campaign. Both native runs report no renderer errors.
Compared with the saved pre-polish food-world captures, town-view draw calls are
133/70/101/54/31 for Isareos/Nethereum/Caricas/Ovesos/Nesdor, previously
133/70/100/54/31. Submitted triangles increase by 8.2-25.6% across those views.
The extra scenery and shared crop texture have a real rendering cost, but add no
AI or per-frame agriculture simulation. These short captures are not a controlled
frame-rate benchmark. Results are in `tests/artifacts/food-world-checks.json`;
the retained comparison is `food-world-before-polish.json`.

### Nethereum farmland review

Run `npm run review:farmland` for the replacement agriculture study, or open
`farmland.html` from a web build. The **Region** selector compares Nethereum,
Caricas, Ovesos, Nesdor and Isareos/Minora. Start directly in Caricas with
`npm run review:farmland -- --region=caricas`, or `farmland.html?region=caricas`.
Use `--region=ovesos` or `farmland.html?region=ovesos` for Ovesos.
Use `--region=nesdor` or `farmland.html?region=nesdor` for Nesdor.
Use `--region=isareos` or `farmland.html?region=isareos` for Minora and its farms.
It uses the selected region's real map coordinates and regional terrain,
loading its fields and town without the adventure's quest farms. Isareos reuses
Minora's existing city scenery, without residents or quests. **Whole region**, **Fields**, **Town**, and
**Meadow & brush** (or **Woodlands** in Nesdor) select aerial views. Drag to orbit, Shift-drag to pan, and
scroll to zoom. **Walk in town** and **Walk the fields** place Teresod at safe
starting points: WASD/arrows walk, Shift runs, dragging turns the camera, and
Escape returns to the overview. Stream crossings and the grain quay are walkable.

`content/regions/nethereum/nethereum-agriculture.js` is the fresh parcel and
settlement definition: five farm clusters, 41 productive parcels, 26 buildings,
western cultivation, a small eastern river town, and an uncultivated northwest
margin. `nethereum-agriculture-scenery.js` supplies that layout to the shared
`world/scenery/agriculture-scenery.js` renderer in merged batches.
`app/farmland-review/` owns the isolated review, terrain cache, camera,
walking, and food controls. Existing adventure farms remain available to their
old quests; this reviewed replacement has not yet been installed in that mode.

The regional target is 220 food/day. Crop-weighted represented area apportions
that target among parcels to two decimals, with an exact remainder; these are
compressed game-world representations, not agronomic hectare yields. Editing
the layout redistributes the authored budget; expanding live productive capacity
is a future explicit simulation action. `lizeem-food.js` reads the summed parcel
capacity, so CLI and map experiments use the same baseline as the scenery.

Caricas's independent definitions are in
`content/regions/minora-frontier/caricas-agriculture.js`: four farm clusters,
31 productive parcels and 42 buildings, including a much larger river town.
Two-storey houses, a market hall, grain warehouses and a walkable loading quay
represent its denser population; farm hamlets and smaller parcels cover the
interior while the eastern Carica corridor remains wooded. The layout is new,
not a regrouping of legacy quest farms. Its target remains 170 food/day for
1,265 civilians, with 30 food/day normally delivered to Minora. As in Nethereum,
parcel capacities sum exactly to the scenario budget consumed by `campaign.js`.

Ovesos's definitions are in `content/regions/oves/ovesos-agriculture.js`:
three farming clusters, 19 productive parcels, 27 buildings and a working quay
on the Lizeem. Its town is larger than Nethereum's and smaller than Caricas's,
with mostly low houses, a few upper floors, an open market and riverside stores.
The western meadow/scrub margin remains uncultivated. The new parcels represent
the existing 100 food/day budget for 750 civilians. It has no direct Minora
export contract: friendly transfers to/from Nethereum use the existing regional
stores and route limits. Its review reports food received and sent as well as
deliveries to Minora. The same scenery also loads in the separate food world test.

Nesdor's definitions are in `content/regions/nesdor/nesdor-agriculture.js`:
three farming clusters, 15 productive parcels and 27 buildings, with a river
town comparable to Ovesos and a grain quay on the Lizeem. Most of the eastern
countryside is wooded, with cultivated clearings and open cart lanes; trees
avoid water, buildings and fields. Its existing 85 food/day budget barely covers
750 civilians and the starting military demand of 5.5 food/day. The woodland
represents uncultivated potential; timber production and clearing are future
mechanics. Trees share a merged scenery batch and the landscape is cached on
return. The separate food world test uses the same layout; ordinary exploration
retains its original countryside.

Isareos's fresh definitions are in
`content/regions/minora-frontier/isareos-agriculture.js`: three farm clusters,
18 productive parcels and nine rural buildings outside Minora's reserved area.
Small plots follow the gentler lower slopes and leave the steep northern ground
uncultivated. They sum to the existing 100 food/day target. Its scenery adapter reuses
`menora-scenery.js` and the city's terrain and bridge heights, preserving the
walls, guild tower, houses, river traffic models and streets. River traffic is
static here and does not represent individual deliveries. The review adds no
residents, quests, old farm plots or construction mechanics.

Minora has 2,640 civilians and needs 270 food/day including its starting military.
Normal imports supply 140 from Nethereum and 30 from Caricas. Open **Food
production**, uncheck both **Minora import routes**, and advance two weeks.
The starting 2,380 reserves cover the 170 daily deficit for fourteen days;
the next day brings shortages. Reopen routes and advance several weeks to
see rations, stability and stores recover. Either route can be closed separately.
The reserve estimate uses the last completed day's net deficit and is suppressed
while commands await the next day, so yesterday's healthy trade is not presented
as a forecast after a closure.

The food report now names each region supplying or receiving food. Set Nesdor
to **50%** and advance a week to see Caricas support its ally, leaving less food
for Minora. Switch to Caricas to inspect the same transfers without resetting
the campaign. Restore Nesdor to **100%** and advance several weeks to watch
stores recover and exports resume. **Reset** resets the shared scenario.

**Population & housing** distinguishes actual civilian population from the
capacity of residential buildings across each reviewed region. Empty homes do
not generate residents. `content/scenarios/lizeem-housing-targets.js` holds
provisional accommodation budgets: Nethereum 800, Caricas 1,600, Ovesos 950,
Nesdor 950 and Isareos 3,300.
Against their separately authored populations this leaves roughly a fifth spare;
it is an initial comfortably occupied design assumption, not established lore.
`content/settlements/housing-capacity.js` distributes each budget by relative
residential footprint and storeys, with integer allocation preserving the exact
total. Barns, granaries, warehouses and halls contribute zero. Editing the visual
layout redistributes accommodation; changing its total requires an explicit
budget edit. This replaces the first arbitrary uniform floor-area multiplier.
`lizeem-food.js` supplies the sum to `campaign.js`
as optional regional housing data; `simulation/housing.js` reports capacity,
population, spare capacity and occupancy without importing scenery. Capacity is
independent of the population target and of how many NPCs are rendered.
Isareos explicitly reserves 300 places for its rural houses and 3,000 for
Minora's existing homes. The scenery adapter apportions the city budget by
residential floor area (provisional storeys from building height), without
modifying the city definitions. The campaign reads the two authored budgets
without importing Minora's terrain or renderer.

Food consumption still uses actual population. Excess housing adds no demand;
population may exceed housing capacity without being silently reduced. No growth,
migration, construction or housing-shortage penalties are implemented yet. Regions
whose replacement housing has not been authored remain unknown rather than being
treated as having no homes. The review displays regional totals, not a claim that
each individual building is occupied in equal proportion.

Open **Food production** to inspect contributions, advance one/seven campaign
days, disrupt production, or restore it. Every economic change uses
`createCampaign()` and its validated `foodAction()`/`step()` methods. There is no
scenery production timer. This isolated test holds armies fixed and does not
touch saves. Regional condition affects the next economic tick; it does not
yet change individual fields visually. Farm defense and restoration encounters
remain the next integration step after layout review.

Switching regions preserves the same campaign state, including pending food
commands. Only the selected region's production condition is changed by its
control; **Reset food test** resets the whole isolated run. Each landscape is
built on first visit and reused afterwards, so comparing them does not repeatedly
regenerate terrain or duplicate geometry. They are not installed into adventure
or the live Lizeem exploration mode yet.

`npm run test:farmland` checks capacities, dry regional placement, the wild margin,
building footprints, Caricas streets and quay, campaign conservation/replay
behavior, and merged geometry.
`npm run test:farmland:desktop` checks visible rendered views, keyboard walking,
every cart-lane centerline and crossing, all five regions' food and housing reports, shared state
on region changes, cached geometry reuse and reset. It writes
screenshots and rendering counts to `tests/artifacts/farmland-*`. The shared food
regression suite remains `npm run test:food`.

### Food map and CLI

From the project directory:

```powershell
npm run start:food
npm run start:food-war
npm run analyze:food-war
npm run simulate:food
npm run simulate:food -- --case=imports-restored --days=35
npm run simulate:food -- --case=nesdor-restored --days=35
npm run simulate:food -- --case=war --days=60 --seed=42
npm run simulate:food -- --case=normal --json
npm run test:food
npm run test:food:desktop
npm run test:food-war:desktop
```

`start:food` opens **Food & supply test** on the existing five-region atlas.
The scenario selector also switches between this test and **The East-West War**;
switching starts a fresh run, so export first to keep an experiment. In a web
build, open `lizeem.html?scenario=food`. This food mode holds armies and recruitment
fixed; the ordinary war mode retains its existing rules.

Select a region to inspect stores, completed-day production, demand, deliveries,
civilian rations, stability and military readiness. Under **Food disruptions**,
cut/restore both Minora import routes or reduce/restore Nesdor's production
condition (25% / 100%). An action pauses the clock and changes the next day's
calculation. The report labels pending changes and withholds stale reserve
estimates. Run at 20x or advance individual days. **Compare with no intervention**
shows stores and stability against the untouched run at the same day.

For a repeatable demonstration, reset, cut Minora's imports on day zero, and
advance fourteen days. Day fifteen starts hunger. Restore imports after day
twenty; rations return the next day and stability recovers gradually. Separately,
reset and disrupt Nesdor to see Caricas's actual shipments to Nesdor and the
reduction in exports to Minora. Export/import replays the food actions exactly;
imports from a different scenario are rejected without changing the run.

`app/lizeem/food-view.js` binds the controls and `food-report.js` reads the core's
daily ledger. Neither runs a second economic simulation. The UI has no new farm
scenery or hero encounters. Native captures and assertions are written to
`tests/artifacts/food-*` by `test:food:desktop`.

### War with food: map test and initial balance review

`npm run start:food-war` now opens the `lizeem-food-war-v2` simulation on
the same atlas. It is also the third scenario-selector option, or
`lizeem.html?scenario=food-war` in a web build. Army movement, recruitment,
three-day battles, captures and food all run through `simulation/campaign.js`.
Hero encounters and physical farm scenery are not added to this mode.

Select an army to see carried food, the number of days it covers at current
strength without resupply, latest rations, readiness, food-adjusted strength
and consecutive shortage days. Engaged attackers are drawn in their battlefield
region even though their authoritative `region` is null. Red dotted borders
and an end-day label identify active battles. The selected region shows supply
links: solid for open access, dashed for closed access. **Supply access now**
explains developer blockades, fighting at either end and enemy borders. These
lines are abstract regional links, not physical roads or animated convoys.

The core and map share `foodRouteStatus()` from `simulation/food.js`. A route
being open does not guarantee a shipment: available surplus, contracts, local
reserves and throughput still decide delivery. Food is allocated before the
day's army arrivals and battle outcomes; current access describes the next
food calculation, while the flow report describes the completed food phase.
The regional report now also includes **Packed for armies**, so provisioning
does not misleadingly appear as unexplained stock loss. This is an accounting
field only; no production, rationing or military tuning changed in this pass.

**Food disruptions** includes Nethereum as well as Nesdor. The comparison run
has no developer interventions but still suffers its own war disruptions.
Both runs freeze at their respective victories; comparison labels explicitly
show different dates when they diverge. **Finish baseline comparison** can run
the remaining untouched war. Reset, replay and cross-scenario import validation
apply to all three modes.

`npm run analyze:food-war` compares six cases over seed 1731 and seeds 1–31,
each for at most 120 campaign days. Add `-- --json` for daily data or
`-- --seeds=1731,1,2 --days=90` for a smaller repeatable batch. Every case verifies
exact replay. The no-food control keeps the same three-day battles, initial
forces, recruitment and military rules; the ordinary map war's instant battles
would make it an unsuitable direct control. Damage starts on day zero at 25%
production condition; repair cases restore 100% after day twenty if still active.

Initial results (12 October 2026; 32 seeds per row):

| Case | West wins | East wins | Unresolved at 120 | Mean troop losses to hunger | Runs with Minora hunger |
| --- | ---: | ---: | ---: | ---: | ---: |
| Matched war without food | 2 | 27 | 3 | 0 | Not modeled |
| Normal food war | 5 | 27 | 0 | 31.5 | 0 |
| Nethereum disrupted | 5 | 27 | 0 | 67.5 | 32 |
| Nethereum restored after day 20 | 5 | 27 | 0 | 38.5 | 32 |
| Nesdor disrupted | 16 | 16 | 0 | 73.1 | 3 |
| Nesdor restored after day 20 | 13 | 18 | 1 | 49.0 | 3 |

Normal wartime interruptions draw down Minora's reserves without causing
automatic civilian hunger in this sample. Its average daily imports were about
156 units, compared with 170 in the stationary opening economy. Regional demand
changes with recruitment and losses; shipment figures should not be read as a
fixed deficit for every day. Armies still experience shortages and losses.

Nethereum is crucial to Minora's food security: disrupting it caused hunger in
all 32 runs. Repair restored full rations during 31 of them; one war ended before
that recovery. However, the winner counts were unchanged. This does **not** yet
demonstrate that West's superior agriculture is a decisive military advantage.
Nesdor's vulnerability mattered more to the war outcome: disruption raised
West's wins from 5 to 16 in this sample. Repair reduced average hunger losses,
although it could not undo all earlier military consequences.

The initial targets were retained for hands-on testing. East's larger initial
forces and recruitment leave it favored (27/32 normal wins); parity was not an
agreed design target. These are small paired scenario trials, not measured win
probabilities. Supply changes alter later battles and random-number consumption,
so one seed's changed winner cannot be attributed to a single shipment. The AI
in that initial version used current food-adjusted strength but did not forecast route endurance or
choose objectives to defend export capacity. Post-victory recovery is not tested:
the existing campaign clock stops at victory. The restored-production cases
demonstrate recovery during the war, not a simulated peacetime aftermath.

### Supply-aware army planning

The next pass keeps those food targets, troop numbers, carrying capacity and
battle rules. `simulation/supply-planning.js` evaluates candidate orders during
the existing decision phase; `campaign.js` remains the sole clock and authority
for troop movement, provisioning and food consumption.

- Forecasts cover the march and expected battle duration. An army reinforcing a
  battle expected to remain active on arrival uses that battle's remaining days.
  If it ends before arrival, the planner conservatively budgets a new battle.
- Packing estimates use the same calculation as real provisioning, protecting
  tomorrow's civilian ration. Enemy territory promises no food. Neutral trade
  does not create military access or supplies for marching armies.
- Target ranking considers expected readiness and supply coverage as well as
  strength and distance. The existing minimum current-strength ratio still
  applies; this is a refinement of the existing frontier planner.
- A force can wait to provision where current production and still-open recent
  deliveries suggest a surplus, or recover readiness where stores and expected
  flows can support a short rest. These are estimates, not future reservations.
  Waits last at most two decision intervals (six days with this scenario's rules).
  A nearly as useful immediate attack can take priority over waiting.
- Four days of carrying capacity cannot cover every march plus three-day battle.
  Such attacks remain eligible, with a recorded explanation of the accepted risk.
  Authored opening orders remain scenario commitments rather than being delayed.

The army inspector shows its order reason and a dated **Last planning estimate**,
separately from current food and readiness. Forecasts hold strength and territory
fixed; they do not predict casualties, new orders or future conquest. Provisioning
and readiness holds also appear in **Recent events** and replay deterministically.

To see a repeatable recovery decision, run `npm run start:food-war`, open
**Reset and replay**, enter seed **2**, reset, and advance to **day 16**. Select
**East Lizeem Army 1** in Caricas: it is recovering readiness before another march
on Ovesos and explains when it will reconsider. Seed 1731's opening still proceeds
with explicitly accepted supply risks.

New exports use `lizeem-food-war-v2`; old `lizeem-food-war-v1` exports are not
silently reinterpreted. Under **Reset and replay**, **Open previous food-war rules**
opens the preserved version for import. Switching starts a fresh run, so export
first. Direct equivalents are `lizeem.html?scenario=food-war&planning=legacy` and
`npm run start:food-war -- --legacy-planning`. Ordinary war, stationary food and
3D exploration retain their existing rules.

`npm run analyze:food-war -- --compare-planning` runs all six cases with both
planning versions, using identical seeds and economic targets. Every run verifies
exact replay. The no-food control uses the previous planner because endurance
planning requires a food model. The old/new food comparison isolates the planning
change more closely than the food/no-food comparison.

Final planning audit (12 October 2026; 32 seeds per row, 120-day limit):

| Case | West / East wins | Still active | Mean hunger losses, previous → new | Mean supply holds |
| --- | ---: | ---: | ---: | ---: |
| Normal | 5 / 26 | 1 | 31.5 → 29.6 | 1.28 |
| Nethereum disrupted | 5 / 26 | 1 | 67.5 → 65.9 | 1.25 |
| Nethereum restored | 5 / 26 | 1 | 38.5 → 36.1 | 1.28 |
| Nesdor disrupted | 15 / 15 | 2 | 73.1 → 81.8 | 1.31 |
| Nesdor restored | 13 / 17 | 2 | 49.0 → 40.0 | 1.22 |

All 384 old/new trials reproduced their command replays, and the preserved
previous-planner outcomes match the prior audit. Normal wars still kept Minora
fed in every run. Average normal-war duration was 55.3 days versus 55.0 before;
army-shortage days were 65.8 versus 65.3. Hunger losses fell modestly, but this is
not a general solution to military supply: the disrupted-Nesdor case worsened.
War duration and random-draw divergence affect the totals, so these are observed
scenario results, not isolated causal estimates or a claim of better win rates.

The seven new food runs still active at day 120 were continued separately to
check for waiting deadlocks. All ended by day 157: normal seed 18 and both of its
Nethereum variants ended on day 121; disrupted Nesdor seed 26 ended on 157 and
seed 29 on 121; restored Nesdor seeds 14 and 26 ended on 124 and 121. The table
retains the original 120-day cutoff instead of retroactively counting those wins.

This planner still cannot design supply lines, defend export capacity as a
strategic objective, or coordinate a multi-army campaign. Four-day packs remain
a deliberate constraint rather than being increased to hide shortages. Next
work can make the agreed production targets visible as newly designed farmland,
then connect hero interventions to those authoritative production conditions.

The default `simulate:food` command compares six cases: normal trade, all Minora imports cut,
imports restored after day 20, Nesdor at 25% production, Nesdor restored after
day 20, and the active war. The first five hold armies, recruitment and ownership
fixed to isolate economic effects. The war case enables recruitment, normal army
decisions and three-day regional battles; it stops on the actual victory day.
All cases verify exact seed-and-command replay. `--help` lists the options;
`--json` emits daily ledgers and the final replayable state. No graphics or player
save files are loaded. Days are campaign days, independent of autoplay speed.

### Starting economy

One prototype food unit feeds ten population equivalents or ten military
strength for a day. Population equivalents are balancing values, not final lore
censuses or counts of rendered NPCs. Civilians remain fixed in this first model;
recruitment adds military demand. A garrison-to-army transfer moves existing
military demand and never creates a second set of consumers.

| Region | Civilian equivalents | Food/day | Initial demand/day | Initial store | Normal exports to Minora |
| --- | ---: | ---: | ---: | ---: | ---: |
| Nethereum | 630 | 220 | 70 | 490 | 140 |
| Caricas | 1,265 | 170 | 135 | 945 | 30 |
| Ovesos | 750 | 100 | 79.5 | 556.5 | 0 |
| Nesdor | 750 | 85 | 80.5 | 563.5 | 0 |
| Isareos / Minora | 2,640 | 100 | 270 | 2,380 | Receives 170 |

Demand includes existing troops: 70 in Nethereum, 85 in Caricas, 45 in Ovesos,
55 in Nesdor and 60 in Isareos. Ovesos and Nesdor share the same civilian
population; their different garrisons explain the half-unit difference from the
rounded proposed budgets. The leagues' normal net surpluses after exports are
30.5/day for West and 9.5/day for East. Isareos supplies about 37% of its needs;
its starting stock covers fourteen days of the 170/day import deficit.

Nethereum is the breadbasket, with the smallest eastern river town, extensive
western farms and some northwestern meadow/brush. Ovesos is slightly more
populous, concentrated at its river town. Caricas is the most populous league
region and the second producer. Nesdor has comparable agricultural potential
but less land cultivated, with much more forest and wildlife; its future timber
role remains design-only. Town names are provisionally Nethereum Town, Ovesos
Town, Caricas Town and Nesdor Town; Minora keeps its distinct name. These facts
guide the future replacement farmland, not the old plots' placement or totals.

### Daily rules and ownership

`campaign.js` invokes food once at the start of each campaign day. Production is
added everywhere before allocation. Friendly transfers address immediate needs,
then reserves, then neutral export contracts. Meals are allocated, unrest and
military health change, and recruitment and war actions follow. Pending hero
encounters freeze the campaign clock and therefore food as well.

- Producers protect local daily demand and a seven-day reserve before exports.
  Minora's reserve target is the agreed 2,380 units. A faction's store is derived
  from its actual regions; there is no second global pool to spend.
- Friendly transfers use connected, same-owner regions. Every edge has one
  shared daily capacity, including transfers passing through it: 40 units for
  league routes and 180 for each Minora border route. Closed edges, hostile or
  neutral transit territory, and active battle regions cannot be bypassed by
  friendly supply. Commercial permission does not permit military movement.
- Both leagues may trade with neutral Minora. Normal contracts move 140/30;
  remaining route capacity and exporter surplus can make extra deliveries to
  rebuild depleted reserves. No currency or trade-price model is implemented.
- All factions begin with shared hardship. Civilian-first and military-first
  policies are available through replayable commands. The same physical stock
  funds all three policies; shortages cannot generate food.
- Civilian underfeeding raises unrest proportionally, up to eight percentage
  points per day at zero rations. Full rations restore four points per day.
  Unrest can halve production and reduce recruitment by up to 75%; current
  civilian ration fulfillment also scales recruitment. Fractional recruitment
  accumulates deterministically. Hunger does not directly change ownership,
  migrate civilians or create a rebellion in this version.
- Armies provision up to four days of carried food from friendly regional
  stores, leaving the next civilian day's rations. Provisioning is a domestic
  expense, so it can use reserves that exporters must protect. Marching armies
  and attackers in hostile territory eat from carried supplies. Friendly
  stationary armies share regional military rations, supplement from carried
  food if short, and replenish their stores locally. Food never appears when a
  garrison becomes an army, or because a scene is loaded.
- Missing military rations reduce readiness by up to 20 points/day; full rations
  restore 10. After three consecutive short days, losses begin on the fourth,
  at 2% times the missing ration share, rounded up to whole strength. Readiness
  scales combat power from 100% down to a 25% floor and affects army planning
  and normal battle odds. Troop strength and food losses remain separate.
- Active battles halve local production and close food routes through the
  region. Capture changes the controller while retaining civilians, production,
  condition, unrest and stored food. Supplies abandoned with a destroyed army
  are recorded as lost; no loot mechanic has been added.

Food allocation uses deterministic daily throughput, not animated convoys or
shipment travel times. There is no spoilage/storage cap, seasonality, timber
economy, population growth or agriculture scenery generation in this pass.
Those are separate future decisions. The current economic test is measured in
weeks, and the war still ends under its existing victory condition.

### Commands, diagnostics and checks

These are validated simulation/developer actions, not yet playable farm quests:

```javascript
campaign.foodAction({type:'production',region:'nesdor',condition:.25});
campaign.foodAction({type:'production',region:'nesdor',condition:1}); // restore
campaign.foodAction({type:'route',from:'nethereum',to:'isareos',blocked:true});
campaign.foodAction({type:'rationing',faction:'east',policy:'civilian-first'});
```

Conditions are absolute values from zero to one, separate from the regional
production target. Every valid action is recorded in `state.commands`; invalid
actions leave state unchanged. States use version 4 for food scenarios and
version 3 for existing scenarios. Each food scenario has a new scenario ID.
`replayCampaign()` reconstructs food, trade, policies, blockades, commands,
events and future outcomes without adding random draws to the economy.

`state.food.last` reports opening stock, production, consumption, lost supplies,
closing stock and transfers (including paths). Regional `food.last` reports
production, civilian/military demand, imports, exports and consumption.
`foodSummary(state)` derives region and faction reports, including carried army
stock and demand outside regions. Every day's accounting must satisfy:

`opening + production - consumption - lost = closing regional and carried food`.

The tests exercise normal budgets, the exact cutoff window, gradual recovery,
Nesdor-to-Minora knock-on effects, rationing policies, friendly routing, shared
capacity, protected exporter reserves, army provisioning, readiness, attrition,
recruitment, capture, timed battle disruption, pending encounters, invalid input,
CLI JSON and replay. Forty seeds check nonnegative resources and conservation
through active wars; legacy campaign tests check unchanged older behavior.

The next implementation slice can connect a bounded protect/restore encounter
to these commands and build new farm scenery from the regional production
targets. Old farms have not yet been removed or assigned economic authority.

## Current Ovesos prototype: two-stage battle (7 October 2026)

For the new economic work, see the [food experiment](#food-production-and-supply-experiment) below. The earlier sections retain the existing playable scenario's history.

Fresh world runs now use `lizeem-world-v5`. Start **Lizeemi War Scenario**, then use **F8 > Minora > Ovesos: ride and defend West (fresh run)** to watch the full sequence. Manual play reaches the same encounter through F at the Ovesos standard. This remains inside the five-region scenario.

1. Intercept the runner and two escorts. Each stopped soldier removes one third of an existing 12-strength detachment. The result offers **Regroup for rally assault** or **Leave / keep the interception**.
2. Regrouping restores encounter health and offers one assault for the same faction. The rally has three guards after a full interception, four after stopping two soldiers, or five after a weaker interception. Defeat them with the existing dodge/counter combat, then stand within 2.5 metres of the gold ring for six uninterrupted seconds.
3. Success breaks the enemy rally and forces a retreat, resolving this battle immediately in the player's side's favor. This is an explicit authored rout condition, not a hidden probability bonus. Existing casualty allocation, surviving armies, retreat routes and recruitment still apply. The report separates reinforcement losses, rally-guard losses and the subsequent army losses.
4. Leaving after interception keeps the second opportunity available until the day-8 deadline. Saving and Continue preserve it. Once the rally choice is declined, lost or withdrawn from, it cannot be repeated; any guards already defeated count as actual committed strength removed. Without a rally victory the armies still resolve normally at the deadline. Campaign time remains paused during combat and review; M resumes it afterward.

The resolved battlefield displays the controlling faction's standard and up to three representatives of surviving troops, only on ready, clear ground. They represent existing force strength and do not add troops. The column and active battle navigation retire when their campaign state ends.

Implementation: [battle stages](../../src/simulation/battle-stages.js), [campaign actions](../../src/simulation/campaign.js), [encounter controller](../../src/app/exploration/world-skirmish.js), [combat model](../../src/gameplay/combat/lizeem-encounter.js), [aftermath](../../src/app/exploration/battle-aftermath-view.js). The core retains renderer independence. Distinct pending IDs prevent a delayed interception result from being applied to the rally stage. Replay rejects a changed faction, invalid result or duplicate attempt.

Existing v3 and v4 saves replay their original rules; they are not silently migrated to the two-stage encounter. Start a fresh run or the named fresh-run autoplay to try v5. Caricas and map-only scenario encounters retain their existing behavior. Earlier sections below record previous iterations, including the v4 interception-only Ovesos outcome.

Verification commands: `npm run test:lizeem-world`, `npm run test:lizeem`, and `npm run test:lizeem-world:desktop -- --journey-checks`. The journey check uses ordinary horse/combat input and an isolated save store. It captures the interception decision, rally briefing, gold objective, victory and faction aftermath, and exercises saving between stages, Continue and declining the assault. It does not establish that the combat feels good to a new player; the next useful evaluation is an uncoached manual run. Verification passed: 87 world/combat model checks, 24 independent campaign checks, 9 navigation checks, and 57 desktop journey/branch checks with no renderer errors. Layout and module-graph checks passed. Visually inspected the regrouping choice, rally briefing, gold objective and surviving soldiers from the ordinary third-person camera.

## Run it

Double-click **Test Lizeem War.cmd**, or run `npm run start:lizeem` from the project directory. The window starts paused on day 0. It loads the existing atlas, clipped to the five regions, without constructing the 3D world or loading old quests and skills. A small 3D battlefield loads only when you choose to join a local encounter.

1. Press **Run**, or use **+1 day** to inspect individual steps. Speed changes how often days advance; it does not change the simulation rules.
2. Click a region to see its owner, garrison and total defending strength. Click an army marker, a regional army button, or the Armies dropdown to follow a named army. Keyboard users can focus a marker and press Enter. The inspector shows its status, origin, strength, journey, arrival, decision reason and latest battle.
3. Use **Geopolitical** to see faction borders, or **Regions** to see regional names and defending strengths. Drag to pan, scroll to zoom, and use **Fit five regions** to return.
4. Open **Reset and replay**, keep seed **1731**, and reset. Select **Ovesos**, then press **Add 80 strength** before advancing time.
5. Open **Compare with no intervention**. A second independent instance runs the untouched scenario alongside yours, using the same seed.
6. Use **Export run** to retain an experiment. **Import run** reconstructs its state from the seed and dated interventions. There is no automatic save; closing the window discards an unexported experiment. Adventure and exploration saves are not accessed.

The default untouched run ends with East Lizeem winning on day 21. Adding 80 strength to Ovesos on day 0 yields West Lizeem winning on day 13. These are measured outcomes of the current rules. There is no code that assigns a winner on a prescribed day. Other seeds can produce other outcomes, and reinforcement does not guarantee victory for every seed or timing.

The clock stops when the losing league has neither territory nor surviving field armies. A baseline that has already ended remains at its final day while an altered run continues. If your intervention finishes first, **Finish baseline comparison** advances only the untouched run (up to 1,000 additional days per click). The labels show each run's actual day; this is explicitly a comparison of outcomes at different times. Minora remains neutral in both instances.

## Try the hero connection

1. Open **Reset and replay**, use seed **1731**, and reset both runs.
2. In **Teresod**, choose **Caricas** and press **Begin journey**. Enable **Offer battles in my region**.
3. Press **Run** (20x is convenient). Teresod arrives on day 3. A real West attack on Caricas pauses the campaign on **day 9**.
4. Press **Battle in Caricas - inspect**, then **Help West Lizeem**.
5. Use **WASD/arrows** to move, **X or left click** to strike the gold-ring target ahead, and **Space plus a direction** to dodge. Orange thrust warnings call for a sidestep; pink sweep warnings call for retreat. Defeat all three guards before losing your health or reaching the 90-second limit.
6. Press **Apply result and return to map**. With this seed, success lets West capture Caricas. Staying out leaves it with East. The hero panel reports the chance change and resulting control; the map selects Caricas. Resume the campaign when ready.

You can help either side; this first test does not make that choice a permanent faction allegiance. Human-controlled Teresod can cross Minora's borders, while league armies still cannot. Travel uses the existing regional routes and takes campaign time. You must be present, ready, and opted in when a hostile army arrives. Other battles resolve normally. The hero is unavailable for another encounter for three campaign days after each decision, including withdrawal, preventing repeated involvement in the same day's queued battles. Travel remains available during this readiness cooldown.

**Scope of the combat test.** The battlefield is a deliberately plain arena using the existing character assets, not Caricas's real scenery or the full army deployed as individual soldiers. Three guards represent a local task. Health, attack timing and the task itself are provisional; defeating them does not remove three extra strategic strength points. There are no skills, loot, quests or recruitment menus. Failure means Teresod is driven back, not permanent death. Each encounter starts with full health.

Success improves the chosen side's battle chance by up to 20 percentage points; defeat reduces it by up to 10. Hero modifiers stop at the 5-95% chance band without reversing an advantage that already lies outside it. The core still rolls the regional battle, applies losses, retreats, recovery and territorial changes. A local victory is not a guaranteed regional victory. Withdrawal before completion gives no modifier. After victory or defeat, Escape applies that completed result rather than discarding it. Losing window focus pauses the encounter.

**Authority boundary.** `campaign.js` owns hero location, dated journeys, encounter availability and a unique pending battle ID. `step()` stops at that pending battle even when asked for many days. `resolveEncounter(id, faction, outcome)` validates the ID, side and outcome; records it exactly once; resolves the original army against the original defenders; and finishes the suspended day's arrival queue, victory check and orders. Troops cannot be reinforced while the battle is pending. The UI cannot choose the regional winner or supply arbitrary casualty numbers. The local combat model has no imports from the campaign.

## Explore inside the five-region war

Choose **Begin Lizeemi War** from the shared main menu (or run `npm run start:lizeem-world`). A fresh game starts as Teresod in Taleth's chamber, the middle of three developed floors in Minora's Wizard Guild. Taleth is the Master Time Wizard of the Guild and represents neutral Minora. Walk toward him and press **F** to choose which league to support, read the optional historical background, or enter the Stillroom for combat training. **Explore the tower** or Escape postpones the decision without starting the war.

A physical spiral stair connects Snero Fold's Folded Chamber below to Hadrin Brightlock's enchantment workshop above. These male wizards offer optional introductions; neither can commit allegiance or unlock departure. The tower is intended to grow beyond these first three floors. Guild gates close the unfinished extensions; the existing high lookout remains separate and opens through Taleth after the war. All three floors share one tower location and retain frozen campaign time while walking, conversing, and saving.

Hadrin's upper workshop has an articulated, unfinished golem and two stocked enchantment benches. Approach the golem, Everlight lantern, Mending hammer, Homeward wayfinder or Rainkeeper cup and press **F** for a close observation. The golem's **Watch its test** action runs a repeatable six-second arm and head demonstration. These are visual experiments with no inventory rewards or campaign effects. Shared exhibit coordinates live in `content/regions/minora-frontier/hadrin-exhibits.js`; `hadrin-workshop.js` batches the furnishings and animates only a few joint pivots on the visible floor. `app/exploration/tower-workshop-host.js` owns observation focus and input. No extra point lights, creature AI or physics simulation are added. The isolated `--tower-floors-checks` native run verifies every exhibit, time freeze, access, demonstration completion and saving on all three floors.

His practical workshop also contains self-polishing armor, two hovering task lamps and an overhelpful broom that moves tools across its sorting bench. The armor and broom have optional **F** observations and repeatable demonstrations. `hadrin-conveniences.js` adds deterministic local animation and static clutter to the existing workshop batches, sleeping with the hidden floor. Hadrin wears a work apron and offers optional conversations about everyday enchantments, the broom and future staff/equipment improvements. Equipment upgrades are not yet available; these conversations have no inventory, campaign or save effects.

The southern door on Taleth's floor uses **F** to leave; the existing tower forecourt uses **F** to return. Confirming allegiance with Taleth is required before leaving, and mounts/developer travel remain unavailable inside. The interior has its own collision and lighting and loads without constructing the exterior. Existing saves keep Taleth's original coordinates. Saved feet height selects the appropriate supported floor or stair on return.

`content/regions/minora-frontier/tower-floor-layout.js` defines landings, walk surfaces and bounded stair collision; `tower-staircase.js` draws those same treads. `tower-chamber.js` and `tower-furnishings.js` build merged static details with only nearby room contents animated. `guild-wizards.js` holds the new introductions, and `app/exploration/tower-wizard-host.js` owns their optional conversations. Run `node --test --test-isolation=none tests/tower-floors.test.js tests/tower-opening.test.js` for traversal and opening checks. Run `node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --tower-floors-checks` for actual movement, conversation, save/Continue, time, and training checks with screenshots.

### Taleth's optional Chronoscope history

The tower operates across ordinary dimensional and temporal boundaries, comparable in principle to Elfland's hidden paths. The Chronoscope is an original low-poly stone basin with brass meridians, five floating province reliefs and thirty rim divisions. Its political colors follow the selected historical event. Taleth holds the scenario before its opening orders; this device explains that control in-world without adding a second time simulation or a traversable portal destination.

The optional projection uses the actual five atlas region outlines and river drawing. Over approximately 25 seconds it shows Cedric's overthrow and disappearance while the five provinces still belong to the Empire; Minora's renewed independence on day 3; the other four declarations on days 4 through 7; the West Lizeem League on day 21; the East Lizeem League on day 23; the final week of unchanged borders; and today's declaration of war. The common league colors mean alliance, not a conquest between their members. Minora remains neutral. Each transition has a short caption, a historical day and the visible states' names.

Players can pause, move between events, choose a day, replay the history, return to Taleth, or start immediately. Completion waits for an explicit choice; it never launches the campaign automatically. Losing window focus pauses playback. During a later tower visit, the same projection remains historical: it cannot overwrite the player's changed borders or restart the campaign. The existing doorway remains locked until the actual **Start campaign** choice, whether or not the history is watched.

[Authored history](../../src/content/scenarios/lizeem-prelude.js) is frozen, scenario-gated presentation data. [The view](../../src/app/exploration/chronicle-view.js) has no campaign, clock or save access. [The tower host](../../src/app/exploration/tower-host.js) passes only event colors into [the instrument](../../src/content/regions/minora-frontier/chronoscope.js); its animation has a local visual clock driven by frame delta, independent of saved gameplay time. Historical days are not campaign commands. No discoveries, quest state, save fields, manuscript material or external assets are added by watching. A missing historical chart leaves Start and Return available.

Check with `node --test --test-isolation=none tests/lizeem-prelude.test.js` and `npm run test:lizeem-world:desktop -- --chronicle-checks`. The latter is the native entry point for the opening choices, playback, campaign freeze, re-entry and save-isolation checks; check reports and captures belong under `tests/artifacts/`.

### Exterior scope and campaign clock

This scenario now enables only **Isareos, Nethereum, Ovesos, Caricas and Nesdor** in the exterior loader. M focuses those regions, F8 lists only their destinations, and movement cannot leave their boundaries. Explore the World remains unrestricted. Shared terrain/scenery dependencies still run where needed; this is not a replacement for the legacy world loader.

Before completing the briefing, campaign controls are locked. Afterwards, press **M** and use **Run campaign**, **Pause campaign**, **+1 day**, or the speed selector. At 1x, thirty active game seconds advance one day; 4x and 20x shorten that interval. Time advances while exploring or reading the map. Loading, Taleth conversations, the pause/developer menus, loss of window focus, and encounters suspend it; there is no background catch-up. Speed changes timing, not battle rules. After an encounter the campaign is paused until resumed explicitly. New tower-aware saves retain their running/paused setting; older saves resume paused. Being inside the chamber after the introduction does not itself stop time.

The regular M map still opens in **Regions**. Switch to **Geopolitical** for live faction control. **Stability** reports neutrality, active war, recent conquest or unassessed postwar conditions; it is not a population/unrest simulation. **Developer reveal all** starts checked in the world test for development, including fresh-window restores. Turn it off in M or F8 to test discovery fog. The override does not add discoveries to your save; ordinary exploration retains its fog-first default. Outside the five scenario regions, political information is marked outside the scenario, rather than borrowing the old authored campaign's factions.

Hero location comes from the existing world's `regionAt(x,z)` result. Walking, riding, flying and developer teleportation all feed the same adapter. There is no second regional journey timer for the hero. Crossing a region boundary records a dated location command, rather than writing positions to campaign history every frame. The playable scenario now stops the hero at the five-region boundary. League armies still obey their own geographic travel times and cannot enter neutral Minora.

**Tower verification:** `npm run test:tower:desktop` exercises movement to Taleth, the locked door and bypass prevention, declining/accepting the briefing, clock suspension, both door directions, save/load, repeat conversations, and main-menu Continue in a fresh renderer. It uses an isolated profile and memory-only saves. Captures are in `tests/artifacts/tower-*.png`. `tests/tower-opening.test.js` covers progress migration, save validation and room collision. The room is in `content/regions/minora-frontier/tower-chamber.js`; its scene boundary, dialogue and progress are in `app/exploration/tower-*.js`.

**Battles have a location and a window.** A hostile arrival starts a three-day engagement at a fixed test site in the region. Committed attackers and defenders cannot leave on new orders; incoming reinforcements join the same engagement. Local recruitment pauses while the battle is active. Regional battle casualties, retreat and control changes occur once, at the deadline. A successful Caricas or Ovesos interception removes its reserved reinforcement strength immediately, before the main battle resolves. An unattended battle resolves automatically even if Teresod is standing nearby. This is a campaign abstraction, not continuous tactical combat.

The M map marks a battlefield only after its own hex is discovered, or while developer reveal is enabled. A compact list of known active battles can centre the map on one. Markers appear in Regions, Geopolitical and Stability and disappear on resolution. Nearby loaded sites have a gold flag. Approach within **24 metres**, near ground level, and press **F** or click the join prompt before the deadline. Being elsewhere in the same region is insufficient. You can arrive after the fight starts. Joining suspends the clock; staying out does not. A submitted result is recorded once and affects the regional roll at the deadline, with no immediate territorial change. In fresh runs, Caricas and Ovesos remove actual reinforcement strength; Nethereum and Nesdor retain their provisional arena chance modifiers. You cannot repeat the same encounter.

**Computer test scenarios:** open **F8 ? Computer test scenarios** and choose a named button:

- **Minora ? Ovesos: ride and defend West (fresh run)** replaces the unsaved campaign with the opening scenario, places Teresod at the Minora start, mounts the developer horse, and rides using ordinary movement and collision. The route crosses the Guild Footbridge, follows Sacred Way over Pilgrims' Bridge, wades the shallow Neth ford, and follows the Velsorten road into Ovesos. Campaign time runs at 1x during physical travel so the join window remains meaningful. Region loading pauses travel and campaign time. Arrival dismounts Teresod; waiting and regional resolution use 20x. The camera faces the incoming soldiers for a two-second preparation countdown, then shows combat at normal speed. The computer helps West by intercepting East's reinforcements, holds the local result for four seconds, and opens the geopolitical outcome on day 8. A successful interception reduces enemy troops but does not guarantee West retains Ovesos.
- **Caricas: quick interception (current run)** retains the current campaign, advances at 20x to day 10, uses a clearly advertised developer transfer to Caricas, fights for West, and shows the day-12 result. It remains a quick combat demonstration without a riding leg.

Both tests leave saved checkpoints untouched; F5 explicitly saves afterward. **P** or the active Stop button hands control back, including during combat. When idle, P opens the developer chooser instead of choosing a scenario implicitly. Movement keys, menus and clicked controls also interrupt; camera movement remains available. Focus loss pauses autoplay. Cancelling the Ovesos setup prevents a pending load from resetting the run afterward. Caricas retains its existing already-started transfer behavior. The drivers live in `src/gameplay/autoplay/`; the exploration host owns loading, normal movement input and presentation. Neither driver injects victories or ownership.

The earlier Ovesos tracking prototype used surveyed bridge/ford waypoints near its authored route. Current player guidance instead points directly at the selected army or battle; only the computer demonstration retains the surveyed itinerary. Exploration ignores legacy `west-deep-water` wall cylinders and uses the actual western water surface. Horses wade through shallow water and now swim beyond 0.95m depth, with the head and saddle above the surface. Trees, buildings and bridge rails retain collision. Ordinary foot travel can also swim. The legacy adventure horse also uses the same water surface and swimming pace; its existing personal swimming rules remain separate.

Run `npm run test:lizeem-world:desktop -- --journey-checks` for the isolated real-terrain ride, riverbank regression, normal Ovesos combat and save-isolation check. Route data lives in `src/content/scenarios/ovesos-journey.js`; the driver is `src/gameplay/autoplay/ovesos-journey-autoplay.js`.

**Quick test:** begin a new world test and open M. Advance to **day 10** while still in Minora. Caricas's battle began on day 9 and ends on day 12. The default developer reveal shows its marker even while you are in Minora. With reveal switched off, its own hex must be discovered. Use **F8 > Caricas > Go**, then return to the world and press **F** at the flag. Help West and break the three-soldier vanguard before any runner reaches the blue rally marker. After returning to exploration, advance the campaign to day 12. With the default seed, West captures Caricas with your successful help; without it East holds. Try arriving after day 12 to see that the original battle has already resolved. Caricas now fights in its actual landscape, using the existing exploration hero, camera and renderer. Land and dismount before joining. WASD moves relative to the camera, X or left click strikes, Space dodges, and right-drag turns the camera. Victory and defeat freeze the encounter in place for review. The result names the actual trigger (remaining runners getting through, zero health, timeout, or all three soldiers stopped) and distinguishes this interception from the regional battle. Click **Continue to exploration** to record the result and return at the same location; Escape on the result also records it. Before the encounter ends, Escape or Withdraw records withdrawal. The enemy rally point is labeled in the world, and a warning identifies marching soldiers and their distance to it. A runner reaching it leaves combat; you can keep fighting the remaining soldiers. The encounter ends when all three have been stopped or escaped, you lose your health, or the timer expires. Stopped soldiers still contribute after retreat or defeat. The campaign remains paused until you resume it. Ovesos shares this field encounter in fresh runs; Nethereum and Nesdor still use the isolated arena.

**Shared field encounter scope (Caricas and Ovesos).** Three opposing soldiers spawn on clear, reachable ground near the hero within the battlefield area when a side is chosen. They use the opposing faction's colour. They follow a clear approach through your interception position toward a blue rally marker, engaging you nearby and resuming their route if you move away. Escaped runners no longer fight or take hits. The fight continues until all soldiers are stopped or escaped, you are driven back, or 90 seconds expire. Breaking all three soldiers scatters the full following detachment; stopping one or two weakens it. These three figures represent its vanguard, not its exact strategic headcount. The fight is confined to loaded, dry ground within the selected region within 45 metres of the flag. Walking and dodging respect scenery collision and abrupt height changes; melee attacks require an unobstructed ground path and compatible elevation. The camera retains normal right-drag and zoom. Space is dodge during combat, and mounted combat, jumping and swimming are not part of this first skirmish. Failure to find safe spawn positions leaves the decision open with an explanation and a withdrawal option.

The campaign clock is suspended during the encounter, and combat itself pauses when the window loses focus. Map, saving, loading and developer travel are unavailable until the encounter resolves or you withdraw. Temporary opponents and strike warnings are removed afterward; shared world and character assets are retained. This is a small local fight representing your intervention, not the full strategic army deployed as soldiers. The deadline remains unchanged. Soldiers use a validated two-waypoint approach and nearby pursuit with collision, not general navigation around buildings. Caricas also has a small visible guard detail and banners driven by current control, described below.

**Combat feedback.** Each opponent has a health bar and a label showing engagement, incoming strike, marching or escape. Successful hits trigger a brief recoil animation and health-bar flash; Teresod also recoils when hit. A compact message distinguishes hits, range misses, blocked attacks, damage and successful dodges. The ground warning grows toward an incoming strike. These cues do not change damage, attack cooldowns or campaign speed. Both named computer scenarios use normal-speed combat with a two-second preparation; only the campaign clock runs at 20x. The shared read-only input policy moves, dodges and counters through the ordinary combat model.

**Reinforcement accounting.** At the start of each Caricas engagement, each side earmarks up to 12 strength from its existing committed troops as an approaching detachment. No troops are created: those reserves remain included in displayed committed totals. Each source contributes at most half its strength, keeping the main force intact. Each stopped soldier removes one third of the reserved detachment, rounded down to whole strength: 4, 8 or 12 strength for the standard 12-strength squad. The deduction is taken once from the recorded source garrison or armies, outside the subsequent battle casualty total. Defeat and withdrawal keep earned deductions. Unstopped reinforcement strength remains committed to the regional battle; no intervention removes nothing. There is no additional probability bonus or failure penalty for this objective. The core, rather than the renderer, calculates the detachment size and owns the deduction. Only fully stopped soldiers count; merely injuring a soldier does not remove campaign strength. Smaller detachments use the same rounded-down fraction, never more than their actual reserved strength.

With seed 1731, West has 56 committed strength against East's 28 in Caricas. Intercepting East removes 12, leaving 16; West's computed chance rises from about 64% to 76%. The existing battle roll then yields a West conquest. Helping East instead removes 12 from West and improves East's odds, but East would already have held in this seed. The report only credits a changed winner when the same recorded roll gives the opposite result with the intercepted troops restored.

**Battle reports:** a compact, dismissible report appears in the open world when a known battle is underway, after your intervention, and when the regional battle resolves. Caricas reports the actual reinforcement strength scattered or left available, the still-current owner and the deadline. The final report separates interception losses from regional battle losses, explains the odds resulting from the changed forces, and credits a tipped outcome only when supported by the recorded roll. Nethereum and Nesdor retain their skirmish modifier reports. Your latest consequence takes priority over unrelated battle starts until dismissed and remains available on M. Reports reconstruct from saved campaign events; they describe the war rather than generated story quests. Campaign time remains paused after an encounter until explicitly resumed.

**Visible Caricas aftermath.** The settlement's three existing occupation banners use the controlling faction's color in the world test. They remain East's during an interception and switch only when the campaign changes regional control. When no battle is active, up to two stationary guards stand at existing, clear guard posts. They represent the garrison and stationed field armies already counted by the simulation; drawing them never creates troops. A force of one shows one guard, and zero shows none. They are visual sentries, with no patrol, dialogue, recruitment or additional combat behavior yet. The detail is hidden during an active battle or local encounter, on unloaded terrain, and when far away or the site is unknown.

Within 36 metres of the battlefield site and near ground level, a short line beneath the location name identifies the owner and current condition. It says 'recovering from battle' only while the simulation's regional recovery counter remains positive, and 'battle underway' during renewed fighting. The ordinary war report continues to explain the result separately. The banners, guards and status reconstruct from campaign state when returning to Caricas or loading an earlier/later save; they add no save fields and existing v3 saves remain compatible. Ordinary exploration and the authored adventure retain their original red banners.

**Save and resume:** F5 or **Save world test** saves exploration position, discoveries, camera and campaign replay together. Land before saving. The file is `saves/lizeem-world-v3/road-checkpoint.json`, using key `azhora-lizeem-world-v3`. The previous v1 and v2 world-test slots are preserved separately, with no migration. Fresh runs now use scenario `lizeem-world-v4`, with both Caricas and Ovesos field interceptions. The save container and storage key remain v3; optional versioned `tower` metadata records the active space, briefing completion and clock setting. Older saves without it resume outdoors with the introduction already complete. An older position outside the new five-region boundary returns to the tower forecourt while preserving the campaign; the stored file is unchanged until the player saves. Existing scenario-v3 saves still replay under their exact original rules, including the Ovesos arena bonus; they are not silently upgraded. Begin a new world test to use the Ovesos field encounter. Ordinary exploration and adventure saves remain separate. Starting a new world test does not overwrite its saved test until Save is pressed. Invalid saves are rejected without replacement. Active campaign battles save and reload with their remaining windows. There is no autosave or mid-skirmish health/position checkpoint. Submitted encounter results replay exactly.

Verification: 46 world/model tests, 24 campaign-core tests, and 37 focused native/reload checks passed. The partial-success checks cover zero, one, two and three stopped soldiers on either side, retreat, one-time deductions, invalid counts, rounding for small detachments, exact replay, escaped soldiers leaving combat and hit/miss/dodge feedback. Native checks exercise real one-soldier retreat and two-soldier partial results, reports, save/reload and 20x autoplay.

For a focused native check of autoplay and the result screen, run `npm run test:lizeem-world:desktop -- --interception-checks`. It uses an isolated profile and memory-only saves, captures `tests/artifacts/world-war-interception-result.png`, and checks a fresh renderer restore. The full desktop suite also exercises victory, health loss, withdrawal and runner escape. Autoplay's test timeout allows slow renderer frames and terrain loading. Timing checks verify 20x days and no added presentation waits.

Interception result commands accept an optional validated `stopped` count from 0 to 3 and a reason (`runner-arrived`, `driven-back`, `time-expired`, `vanguard-broken`, or `withdrew`). The renderer submits the local count; the core calculates the loss against its own reserved strength. A partial withdrawal retains the chosen faction for correct accounting and later battle comparison. Existing v3 saves still load: commands without `stopped` keep their original all-or-nothing accounting, so older completed results are not reinterpreted. Commands without a reason retain a generic report. A finished encounter remains pending during review, so saving is blocked until Continue or Enter submits it.

The default unattended world scenario now ends with East winning on **day 27**. The map-only scenario retains its original immediate-battle rules and day-21 result. These outcomes arise from the rules and seed, not scripted victory dates. Some other seeds can settle into a stalemate: the current faction AI does not combine small armies or change strategy to break a fortified front.

| Integration file | Responsibility |
| --- | --- |
| [world-war.js](../../src/app/exploration/world-war.js) | World-driven scenario `lizeem-world-v4`, v3 replay compatibility, active-time clock and political projection |
| [world-war-host.js](../../src/app/exploration/world-war-host.js) | Physical proximity, discovered battle list, map, clock and encounter suspension/return |
| [lizeem-world-autoplay.js](../../src/gameplay/autoplay/lizeem-world-autoplay.js) | Interruptible Caricas demonstration using ordinary host actions and combat input |
| [world-skirmish.js](../../src/app/exploration/world-skirmish.js) | Temporary Caricas opponents, warnings, combat HUD and bounded result; uses the existing scene |
| [reinforcements.js](../../src/simulation/reinforcements.js) | Reserve existing committed troops and apply validated interception losses |
| [skirmish-ground.js](../../src/app/exploration/skirmish-ground.js) | Dry-ground spawn validation, collision, local bounds and unobstructed attack checks |
| [site-presence.js](../../src/app/exploration/site-presence.js) | Read-only owner, stationed strength, guard count and recovery projection |
| [site-presence-view.js](../../src/app/exploration/site-presence-view.js) | Existing banner colors and local, grounded guard drawings |
| [war-reports.js](../../src/app/exploration/war-reports.js) | Readable skirmish and regional consequences derived from recorded events |
| [war-armies.js](../../src/app/exploration/war-armies.js) | Discovered army positions, safe route details and advance reports, projected from existing campaign state |
| [world-map-armies.js](../../src/ui/map/world-map-armies.js) | Army markers and selection-only inspection on the ordinary M map |
| [interception-feedback.js](../../src/app/exploration/interception-feedback.js) | Shared explanations for local result review and persisted reports |
| [skirmish-feedback-view.js](../../src/app/exploration/skirmish-feedback-view.js) | Disposable enemy health bars, intent labels and hit/miss feedback |
| [lizeem-battlefields.js](../../src/content/scenarios/lizeem-battlefields.js) | Fixed battlefield coordinates, separate from renderer geometry |
| [battlefield-beacons.js](../../src/app/exploration/battlefield-beacons.js) | Nearby flags for discovered, loaded, active sites |
| [war-checkpoint.js](../../src/app/exploration/war-checkpoint.js) | Validate and store the combined save in its own versioned slot |
| [encounter-dialog.js](../../src/app/lizeem/encounter-dialog.js) | Shared battle decision and result lifecycle |
| [campaign-map-layer.js](../../src/ui/map/campaign-map-layer.js) | Optional live projection; authored map remains the default for other modes |

World, terrain, presence and autoplay tests cover time suspension, physical region tracking, duration, proximity, late arrival, one-time intervention, deadline resolution, replay, battlefield geography, discovery, save isolation, safe spawning, movement collision and blocked melee strikes. A 100-seed sweep checks troop conservation, engaged force ownership, reinforcements and deadlines; 30 additional seeds test successful interceptions on either side, troop accounting and exact replay. It includes the named Caricas demonstration, repeat-key protection, focus suspension, taking control during combat, real reinforcement losses, delayed conquest, the final geopolitical view, and checks that autoplay neither saves nor resets a completed run. It exercises actual Caricas scenery, physical movement, grounded opponents, focus pause, victory, defeat, withdrawal, letting the vanguard pass, cleanup, delayed regional consequences and save/reload. It also checks existing banner recoloring, grounded guards, depleted forces, recovery expiry, revisiting the site, rewinding saves, default reveal, fog restoration, remote dispatches, persistent skirmish and conquest reports, dismissal, and saved aftermath. The automated exploration host uses the main host's background-rendering flags so region loading can continue when Windows covers the test window; an earlier reload attempt timed out without them. These exercise discovery, all three map layers, the flag and join prompt, reachable ground at all four sites, actual combat input, delayed conquest, save/reload and the independent older save slots. Results and screenshots are under `tests/artifacts/world-war-*`. The two original Caricas construction checks also pass, preserving the exact authored geometry, colliders, vertex colors and builder outputs before any campaign tint is applied. This change has not optimized world startup.

**Authority boundary.** The core's `locateHero(region)` accepts world reports only in world-driven scenarios; those scenarios reject `heroTravel()`. Null means outside the test area. `joinBattle(id, position)` checks the active ID, region, horizontal proximity, deadline and hero readiness. The host additionally checks loaded ground and altitude. Each local encounter submits a bounded result, never territory or troop changes. For interception objectives, `resolveEncounter()` deducts only the core-recorded detachment and emits its loss exactly once. `step()` resolves expired engagements before processing that day's new arrivals. A joining hero freezes the entire campaign for the skirmish; this is not simultaneous campaign and second-by-second combat. Discovery and rendering remain outside the core, and battlefield coordinates are scenario data.

## Starting agreement

| Faction | Territory | Initial defending strength | Recruitment per day |
| --- | --- | --- | --- |
| City-state of Minora | Isareos, including Minora | 60 | 0 |
| West Lizeem League | Nethereum | 70 | 3 |
| West Lizeem League | Ovesos | 45 | 2 |
| East Lizeem League | Caricas | 85 | 4 |
| East Lizeem League | Nesdor | 55 | 3 |

Teresod starts as an unaffiliated hero in Minora. The map-only test tracks regional travel; the world test uses actual movement. Both use the brown-cloaked model. Caricas and Ovesos fight in the actual landscape in fresh world tests; other encounters use the isolated arena. Ordinary exploration retains its separate character presentation and save. Neither league can attack or traverse neutral Isareos. The scenario does not load surrounding factions, the Blood Prince, the established Chapter 1 arc, or Thalmagar's crisis.

## Follow the code

| File | Owns |
| --- | --- |
| [campaign.js](../../src/simulation/campaign.js) | Authoritative state and the day-by-day rules; only pure simulation helpers; no graphics dependencies |
| [routes.js](../../src/simulation/routes.js) | Validated regional links and distance/terrain/crossing travel costs |
| [forces.js](../../src/simulation/forces.js) | Stationed defense totals and proportional casualty allocation |
| [hero-controls.js](../../src/app/lizeem/hero-controls.js) | Hero travel controls, encounter decisions and one-time result submission |
| [encounter-view.js](../../src/app/lizeem/encounter-view.js) | Lazy 3D arena, existing character models, input and resource cleanup |
| [lizeem-encounter.js](../../src/gameplay/combat/lizeem-encounter.js) | Small pure combat model: movement, strikes, dodge, guard warnings and bounded outcomes |
| [reports.js](../../src/app/lizeem/reports.js) | Readable orders, retreats, surrender and battle explanations |
| [lizeem.js](../../src/content/scenarios/lizeem.js) | Five-region starting data, faction definitions, shared-border connections and tuning |
| [entry.js](../../src/app/lizeem/entry.js) | UI controls, wall-clock scheduling, independent baseline, export/import and readable event descriptions |
| [map.js](../../src/app/lizeem/map.js) | Reads snapshots and paints existing atlas geometry; owns selection, pan and zoom |
| [lizeem.html](../../lizeem.html) | The minimal scenario interface |
| [lizeem-desktop.cjs](../../scripts/lizeem-desktop.cjs) | Sandboxed desktop window and restricted local file server; no save bridge |

Start reading `lizeem.js`, then `createCampaign()` and its `step()` in `campaign.js`. Finally read `advance()` in `entry.js` to see how the UI invokes the same loop and refreshes the map.

```text
Scenario definition + seed
            |
            v
      Campaign instance <---- validated travel, encounter result, or reinforcement command
            |
          step()
            |
            v
   snapshot of authoritative state
            |
            v
     Map + region details + events
```

The core copies its scenario and returns copies of its state. UI code cannot accidentally edit ownership by changing a map label or a returned snapshot. Two campaign instances share no mutable state.

## What happens in a day (map-only rules)

1. A traveling hero arrives if their regional journey is complete. Regions recruit up to a garrison limit of 180, unless recovering from capture. Field armies remain separate from local garrisons. Their combined strength defends the region.
2. Recovering armies become ready when their recovery date arrives. Recovery restores readiness, not manpower; recruitment and explicitly granted reinforcements are the only sources of new strength.
3. Armies whose route is complete arrive. Friendly arrivals remain identifiable field armies. Hostile arrivals fight; simultaneous arrival order is seed-determined. A ready hero who enabled local encounters can suspend one battle in their current region. The remaining arrival queue is retained until resolution, before victory checks or new orders. A retreat never initiates an attack.
4. The engine checks whether either league has lost all territory and surviving field armies. Destroyed armies remain in the ledger for inspection but cannot prolong a war.
5. On days 1, 4, 7 and so forth, both leagues plan against the same state before either order is applied. Each can issue one order. Existing ready armies receive available local recruits and march again. New armies can be raised when fewer than three surviving field armies exist for the faction; retreating guard formations can exceed that raising limit. Rear regions can support a friendly frontier. Target selection considers enemy defending strength, friendly incoming forces and route time.

**Army identity and retreat.** Every field army has a stable ID, name, origin and battle count. Status progresses through marching, recovering and ready, with retreating and destroyed states as needed. It retains its identity after friendly arrival, victory or defeat. Garrison survivors become a named guard formation when forced out by conquest.

A defending force receives a 12% battle advantage. A seeded roll determines victory. Losing attackers suffer roughly 40-60% battle losses; losing defenders roughly 45-65%. Winners also take losses. Defender casualties are distributed proportionally between the garrison and stationed armies, with deterministic rounding. Losses are abstract strength removed from service, not a detailed casualty or prisoner model.

Survivors withdraw to adjacent friendly territory, favoring the attacker's departure region when still available and otherwise the shortest eligible route. They regroup for three days on arrival. Winning armies and surviving defending armies also regroup for three days before accepting new orders, but still defend their position. If a retreat destination falls before arrival, the same army seeks another friendly neighbor. With no exit it surrenders. Reports distinguish battle losses, retreating survivors and additional surrenders. Neutral Isareos cannot be used as an escape route.

**Geographic travel.** Region positions come from the existing atlas's metadata centers. Each shared-border link has an authored description, terrain multiplier and crossing delay. Base days are `ceil(center distance / 80)`; terrain adds `ceil(base days * (multiplier - 1))`; river crossings add their configured days. The core validates every regional link and uses the same travel costs in either direction, including retreats.

| Route | Distance days | Terrain delay | Crossing delay | Total |
| --- | --- | --- | --- | --- |
| Nethereum - Ovesos | 3 | 0 | 0 | 3 |
| Nethereum - Caricas | 3 | 1 | 1 | 5 |
| Ovesos - Caricas | 2 | 1 | 1 | 4 |
| Ovesos - Nesdor | 2 | 0 | 1 | 3 |
| Caricas - Nesdor | 3 | 0 | 0 | 3 |

The terrain and crossing annotations are provisional scenario assumptions. They are not generated bridge locations or surveyed roads. Movement remains between regions. Lines and markers illustrate regional journeys, not precise paths through the underlying hexes. On the map, gold dotted lines indicate retreat; dotted marker outlines indicate recovery. Stationed army markers are placed inside their region.

The RNG's state belongs to the campaign. It uses neither `Math.random()` nor wall-clock time. Advancing 30 individual days or a batch of 30 days produces the same state. Pausing changes nothing. Hero travel, encounter settings and bounded combat outcomes enter through validated commands. Rendering cannot directly change ownership or troop counts.

## Ovesos field encounter

Begin a **new world test** for this scenario revision. With seed 1731, East marches toward Ovesos on day 1 and its battle runs from **day 5 until day 8**. Track the army or Ovesos battle on M, travel to the flag, dismount, and join before day 8. For a quick encounter-only check, pause on day 6 and use F8's Ovesos destination. This shortcut does not test the overland journey.

Ovesos uses its existing Velsorten landscape, the normal hero and camera, and the exact same interception controller as Caricas. Its site has region ID 25, rendezvous `(-1905, 706)`, a northward approach, and a 12-strength detachment per side. Starting opponents and the rally route are checked against loaded ground, collision, water, region boundaries and height changes. The result review, health feedback, partial withdrawal, loss accounting and delayed regional consequence all use the shared implementation.

Site settings live in [lizeem-field-sites.js](../../src/content/scenarios/lizeem-field-sites.js); the renderer and dialog no longer identify partial success by a Caricas-specific site name. Supporting another physical region requires site settings and a terrain check, rather than duplicating combat logic. Nethereum and Nesdor still use the original arena.

In the default seed, helping West successfully removes 12 attacking strength but East still captures Ovesos at the deadline. The report explains the improved odds without claiming that every successful skirmish changes the regional winner. Helping East instead removes defending strength and changes losses. The three-day hero recovery period still applies between interventions.

Run `npm run test:lizeem-world:desktop -- --ovesos-checks` for the isolated native check. It loads the real Ovesos region through developer travel, verifies both sides, grounded opponents, partial withdrawal, full success, cleanup, save/reload and the day-8 geopolitical result. Screenshots are `tests/artifacts/world-war-ovesos-fight.png` and `world-war-ovesos-result.png`. This encounter check does not certify the entire walking route from Minora; use tracking on a fresh run for that travel playtest. The named Ovesos journey button and `--journey-checks` separately exercise the physical ride; Caricas has its own quick-test button.

## Armies on the exploration map

In the world test, the ordinary **M** map now shows small faction-colored army markers in all three views. Select one for its name, strength, status, destination and expected arrival day. Only the selected army shows a route. Close the inspector to remove that detail. Positions advance once per campaign day along schematic region-to-region lines; they are not physical soldiers or roads, and create no new troops or simulation commands.

A discovered march produces a dismissible advance report while exploring. **Open map** on that report centers and selects the army. With the default seed, advance to day 4 to see West marching toward Caricas, expected on day 9. At arrival the march report expires and the existing battle report takes over; joining still requires reaching the physical battlefield before its deadline. Hero consequence reports retain priority until dismissed.

With developer reveal disabled, markers require discovery of their current hex. Unknown departure/destination names and arrival estimates are suppressed. Route lines require known endpoints and a charted corridor along the schematic line. Toggling reveal off clears hidden selected armies and their details. There is no remembered or stale intelligence system yet; reports reflect currently visible marches. No save format or campaign rules changed.

Focused UI verification: `npm run test:lizeem-world:desktop -- --war-map-checks`. This uses an isolated profile and memory-only saves; the screenshot and results are `tests/artifacts/world-war-army-map.png` and `world-war-army-map-checks.json`. Model tests also cover unknown endpoints, incomplete corridors, daily movement, arrival, battle, retreat, recovery and removal of destroyed armies.

### Tracking a march into a battle

In an army's map inspector, choose **Track army**, then close M. A small exploration indicator shows a camera-relative arrow, horizontal straight-line distance and the known arrival day. Army locations remain daily strategic estimates; physical marching soldiers are not spawned there. Tracking does not provide a traversable road or avoid obstacles.

When that army enters a discovered active battle, tracking switches to the actual battlefield flag and its intervention deadline. Alternatively, use **Track battle** on a battle marker or in the map's discovered battle list. Reach the flag on foot and use the existing join prompt. Tracking changes no campaign time, movement, faction allegiance or combat eligibility.

Only one target is tracked at a time. **Stop** on the exploration indicator or the map's **Stop tracking** action clears it. Guidance hides in menus and combat. A lost sighting removes the arrow, distance and timing; a resolved battle or a completed local intervention replaces directions with a short status. Starting or loading a campaign clears the waypoint: this is session-local UI state and adds no save fields.

The pure [tracking projection](../../src/app/exploration/war-tracking.js) handles discovery, handoff and bearings; the [tracking view](../../src/app/exploration/war-tracking-view.js) owns only its HUD. The focused `--war-map-checks` desktop test also exercises tracking controls and captures `tests/artifacts/world-war-tracking.png`.

## Replay and versioning

Exports contain a format version, scenario ID, seed, final day, and ordered reinforcement, hero travel, encounter-setting and encounter-result commands with their application days. Import replays those actions through the public engine methods. The same rules and scenario reproduce the full state, including events, pending encounters, the remaining arrival queue and RNG state. Replays retain a completed encounter result; they do not replay frame-by-frame combat inputs. Exporting before a result is submitted retains the campaign at its pending battle, not mid-fight health or positions. Invalid imports preserve the current experiment.

The scenario ID is `lizeem-east-west-v3`. Incompatible changes to scenario data, rules, or RNG behavior must bump this ID (and provide a migration if old experiments should remain supported). The hero encounter revision explicitly rejects v1 and v2 scenario exports without changing or deleting those files. There is no migration for earlier experiment formats. Untouched default outcomes remain unchanged. This replay format is a small experiment record, not the future general-purpose campaign save system.

## Verification

```powershell
npm run test:lizeem
npm run test:lizeem:desktop
npm run test:lizeem-world
npm run test:lizeem-world:desktop
npm run check:layout
npm run check:modules
```

Twenty-four model tests cover opening conditions, exact atlas adjacency, deterministic runs, travel before battle, force accounting and neutrality across 100 seeds, retreat/recovery, cutoff and rerouting, proportional losses, route costs, intervention effects, replay, invalid input, the absence of platform dependencies in the core, hero travel and local eligibility, suspended-day replay, bounded intervention, success, defeat and dodging. An additional 50 seeds exercise hero interruptions and force conservation. The native window passes 56 checks covering controls, map ownership, persistent army inspection, route explanations, recovery and battle reports, baseline completion, versioned replay, restricted serving, lazy arena loading, actual movement and combat input, victory and defeat submission, replay after combat, and conquest reflected on the map. Results and screenshots are under `tests/artifacts/lizeem-*`.

The verified native test initialized the map application in approximately 0.10 seconds on this machine, measured from the application's entry module. That excludes Electron process startup. The initial map requests no Three.js, 3D world, legacy game entry, quests or skills. Joining an encounter loads Three.js and existing character assets; it still does not load the full world, old combat controller, quests or skills.

## What this establishes, and what remains

This is a working independent simulation foundation for one bounded war. It does not yet include diplomacy changes, supply, economies, unrest, full tactical battles, population, continuous army positions in the 3D world, or a unified adventure save. The map-only launcher uses full scenario knowledge; the world test uses ordinary exploration fog and its own combined save.

The hero-to-campaign bridge is playable in a small arena in the map-only test. The optional world test uses physical exploration position to offer encounters, with Caricas and Ovesos fought directly in their actual scenery. The world test now supports reaching an already-running battle before its deadline. Full armies deployed in world scenery, additional field encounter sites, varying battle durations, mid-battle attrition and combat refinement remain future work. This test keeps the battle suspended rather than attempting simultaneous daily campaign simulation and second-by-second combat.

Journey verification: 11 exploration movement/save tests and 50 world/model tests pass. The isolated native journey completed 13 checks, including the reproduced riverbank trap, the full mounted route and streaming, dismounting, twelve intercepted reinforcements, day-8 resolution and an unchanged saved checkpoint. The ride took approximately 47 active simulation seconds, excluding terrain loading and combat. Screenshots: `tests/artifacts/ovesos-journey-bridge.png` and `ovesos-journey-result.png`.

The Caricas named-button regression passed 37 native combat/reload checks after the shoreline change. `npm run test:lizeem-world:desktop -- --scenario-ui-checks` passed five chooser checks: idle P opens tools, both named buttons are visible, Ovesos selects the fresh route, and cancelling queued setup preserves campaign state. The panel screenshot is `tests/artifacts/world-war-scenario-buttons.png`.


### Ovesos watch-mode readability and loading

The Ovesos horse test prefetches region 25 at ordinary background priority before reaching the ford. An explicit crossing uses a 16ms construction budget while the exploration renderer holds its last frame under the loading veil; background construction retains its original frame budget. The loading message shows ready parts and elapsed seconds. This changes scheduling, not scenery complexity or the campaign clock, so heavy region builds can still require a wait.

Ovesos autoplay frames the incoming soldiers from behind Teresod, freezes combat for a two-second introduction, and advances both sides' combat at normal speed. The campaign stays paused during the encounter. P takes control at ordinary combat speed; this is presentation pacing, not a change to damage, guard health, reinforcement accounting or the seeded outcome. The result remains for four seconds with a countdown; P keeps it for manual review. Stopped soldiers remain visibly fallen until leaving the encounter.

The rally label has a small screen-relative size and uses depth testing, instead of an eight-metre sprite that enlarged near the camera. Its marker and label disappear when the fight ends. The objective text is shorter and names the opposing faction; the heading identifies whom Teresod is helping. Manual fights and the Caricas quick test retain normal combat speed.

The initial presentation update passed 15 loading-queue tests, 50 world/model tests and 23 native journey checks. Its measured Ovesos crossing pause was 12.1 seconds in one isolated accelerated-input test; subsequent runs vary substantially, so this did not establish a solved loading problem. The later normal-speed update and its verification are described below. Screenshots: `tests/artifacts/ovesos-journey-combat.png` and `ovesos-journey-review.png`.

The separate manual Ovesos regression passed 27 native checks, including normal-speed combat, both sides, partial retreat, fallen-actor cleanup, save/reload and the regional result. No renderer errors were recorded in either native run.


### Riding and campaign-map demonstration follow-up

Ovesos autoplay now opens a geopolitical overview of all five regions on day 1 for six seconds, returns to the physical ride, shows the active Ovesos battle on the map for four seconds, and returns to the map after the local result to advance to the day-8 outcome. The opening explains the opposing leagues and neutral Minora; the result explains the hero's contribution and territorial ownership. The map's initial resize finishes before applying the scenario framing, so the traveler-centering callback cannot undo the overview. Ordinary M still opens Regions.

The previous 35% watch speed was too slow and has been removed. Combat is 1x, with a two-second setup and four-second result review. Autoplay only strikes when a living enemy is within reach instead of swinging through the approach. Reinforcement accounting and combat damage are unchanged.

The exploration mount smooths rendered height, heading and pace, while collision and saved position retain the physical values. The rider uses the horse's integrated gait phase, avoiding pose jumps from multiplying total elapsed time by a changing speed. The developer speed multiplier no longer overdrives the animation. The camera follows translation with a damped relative offset and smooth orbit angle, rather than chasing the moving rider from a frame-dependent world-space lag. These are presentation changes, not a slower horse or altered terrain collision.

Verification: 50 world/model tests, 12 exploration tests, 10 horse/riding tests, and 26 native journey checks passed, along with source layout, module linking and the exploration dependency audit. The native run displayed the opening geopolitical overview, completed the physical ride and normal-speed interception, and ended on the changed day-8 geopolitical map without overwriting the saved game. Removing all 12 East reinforcement strength improved West's odds but did not prevent East capturing Ovesos in this seed; the report states that distinction explicitly. Captures are `tests/artifacts/ovesos-journey-opening-map.png` and `ovesos-journey-result.png`. The crossing pause in this run was 42.2 seconds and startup was 161.2 seconds; loading performance remains unresolved. Animation continuity is tested, but perceived riding smoothness and combat feel still require player evaluation.

### Combat practice and committed attacks

In the world test, **F8 → Minora camp: dodge and counter lesson (1 soldier)** uses the open muster yard outside Minora, at the existing `MENORA_CAMP` coordinates. It defaults to one soldier, with prompts to wait for the attack, dodge sideways and counter during the opening. The basic lesson uses thrusts only. **Thrust and sweep lesson (1 soldier)** adds both attack types and requires a dodge-counter against each. **Interception practice (runner + 2 escorts)** adds the moving rally objective. The one-soldier lessons have no rally marker. Retrying preserves the selected exercise. Lesson completion requires winning after at least one genuine dodge-counter sequence; defeating the soldier without that sequence asks the player to try the lesson again. Starting from Minora needs no new region construction. **R** or **Retry practice** resets the opponents immediately using the loaded scenery. **Esc**, or **Enter** after the result, returns to the original exploration location on foot. This practice controller is separate from the encounter dialog and never submits an intervention: the campaign clock, armies, territory and save remain untouched. Discoveries and the prior unsaved-state indicator are restored on exit. Practice starts with full health and has no automatic combat input. Combat shows separate Strike and Dodge buttons. Hold A/D and tap Space to sidestep; Space alone backsteps. The Dodge button is disabled during recovery.

The shared independent encounter model now applies staff damage 0.15 seconds into a 0.35-second swing, with a 0.55-second attack cooldown and 0.16-second late input buffer. Movement sets facing. A forward target is marked before the swing; both target and heading stay committed until the swing finishes. Arc, reach, screening bodies and terrain are checked again at contact. Movement continues at reduced speed during the swing. A dodge cancels an unlanded swing, uses the pressed movement direction or backsteps when stationary, and requires a new press for the next dodge.

Soldiers commit to their heading when their warning starts. A thrust has a 0.85-second windup, 0.3-second strike and 1.15-second recovery. A sweep has a 1.1-second windup, 0.5-second strike and 1.35-second recovery. Damage occurs during the strike rather than at the end of the warning. The world view shows the strike arc; stepping aside can make it miss. A raised shield blocks frontal staff hits without interrupting the attack. A flank hit deals damage but cannot cancel a committed swing. A missed strike drops the guard until recovery ends; the first counter deals 25 damage and consumes that opening with a short stagger. Squad attack commitments are spaced by the current windup and strike duration plus 0.45 seconds so warnings remain readable. Successful enemy strikes restore the guard immediately, so standing and repeatedly attacking cannot trade through them. Health bars, recoil, phase labels, missed-strike feedback and animated falls expose these rules visually. Enemy hits cost 20 health, followed by 0.65 seconds of protection; hero staff damage stays at 25. Reinforcement accounting is unchanged. This remains a bounded encounter prototype.

Implementation: [combat rules](../../src/gameplay/combat/lizeem-encounter.js), [world presentation](../../src/app/exploration/world-skirmish.js), [practice lifecycle](../../src/dev/tools/ovesos-practice.js). Run `npm run test:lizeem-world` for the focused model suite and `npm run test:lizeem-world:desktop -- --practice-checks` for the isolated native practice test. The latter records preparation wall time and per-job construction time in `tests/artifacts/minora-practice-checks.json`; these measurements distinguish construction work from time spent waiting between frames. The first Minora run passed 25 checks, including the existing camp location, no additional region jobs, visible-button sidestepping, keyboard dodging, retries, and campaign/save preservation.

The first practice verification passed 20 native checks: manual victory and defeat, button and keyboard retries, actor cleanup, original-location return, unchanged campaign state, unchanged discoveries and saved-game isolation. The 57 focused world/combat/practice model tests and 24 map-only simulation tests passed. The full horse-to-campaign demonstration also passed its 26 desktop checks with the revised combat, including all twelve earned reinforcement losses and the day-8 map result. The Ovesos practice preparation measured 40.8 seconds: `telemoniaGround` accounted for 25.4 seconds of construction, `ovesScenery` 4.3 seconds and `ovesosFarm` 1.1 seconds. The shared ground job declares regions 22, 25, 26, 55, 57 and 59, which pulls their terrain into its prerequisite chain. Splitting that regional construction is a concrete next loading investigation; this pass does not alter those ground or dependency rules.

### Loading only nearby Telemonia ground

Exploration enables `regionalFineGround` in the world adapter. It plans the original fine-ground lattice once, then registers its 41 tiles as independent loading jobs owned by the regions their bounds touch. These jobs depend on coarse terrain, not on previously registered fine tiles elsewhere. Regional scenery still waits for its required tiles. Ovesos shares scenery with the Oves Desert, requiring nine of the tiles; the Telemonia interior remains deferred. The original adventure keeps its existing monolithic loading path.

The terrain implementation retains the same triangles, Float32 positions, vertex normals, border collar and colour sequence. Each tile retains its original random-stream offset so regional loading order cannot recolour it. The streaming regression compares the complete geometry against a byte hash captured before this change and verifies partial builds followed by reverse-order completion and stable sampled heights. Test with `node --test --test-isolation=none tests/telemonia-streaming.test.js`. The full horse demo records its crossing time and per-job costs in `tests/artifacts/ovesos-journey-checks.json`.

Verification: both terrain regressions, 57 focused world/combat tests, 25 Minora practice desktop checks, and 29 full-journey desktop checks passed, with source-layout, module and exploration-boundary checks. The Ovesos crossing measured 7.4 seconds, compared with the earlier 42.0-second run. These are individual machine measurements, not a guaranteed speedup under identical load; the structural reduction from 41 tiles to nine was also verified. Minora practice preparation measured 5ms and performed no region jobs. Initial world startup remains a separate performance issue.

### Guard and counter balance pass

The Minora lesson and both field sites now share frontal blocking and missed-strike openings. [The input policy](../../src/gameplay/autoplay/encounter-input.js) demonstrates movement, dodges and counters in both computer scenarios; it cannot set health, teleport opponents or submit a fabricated result. [Lesson prompts](../../src/gameplay/combat/encounter-lesson.js) project actual encounter events rather than changing the rules for training. Space remains a responsive dodge cancel, and the 0.35-second staff swing and 0.55-second attack cooldown are unchanged.

The focused balance regression compares holding attack against dodge-counter play for one and three soldiers: stationary spam loses while tactical play wins; the varied three-soldier arena can deal more damage than the basic lesson. The native camp check verifies the same through ordinary keyboard and button input, lesson recognition, both exercise choices, retry behavior and save/campaign isolation. This remains a small deterministic combat loop; broader enemy variety and difficulty balance need further player evaluation.

Verification for the guard/counter pass: 61 focused world/combat tests, 24 campaign tests, 32 native Minora lesson/practice checks, 29 full Ovesos journey checks, and 37 Caricas interception/reload checks passed. Source layout, module linking and exploration dependency boundaries also passed. Stationary attack spam was tested as a loss; ordinary movement, dodge and strike keys completed both practice exercises.


### Thrusts, sweeps and escorted runners

Enemy attacks now have distinct weapon poses and danger footprints, defined in [encounter-attacks.js](../../src/gameplay/combat/encounter-attacks.js). A narrow orange thrust rewards sidestepping. A broad pink sweep remains active as the blade travels; dodging sideways can leave Teresod inside it after dodge invulnerability expires. Retreat outside the arc, wait for the blade to pass, then close in for a counter. A single committed attack cannot damage the hero twice. Warnings show the entire footprint throughout windup and active contact, with increasing brightness instead of changing the displayed reach. Both world and arena views use the shared presentation adapter.

A field interception now has one unshielded runner and two shielded escorts. The runner keeps following the existing validated rally route even when Teresod is close. Strikes can interrupt and stop the runner, but proximity alone does not make them wait for a duel. Escorts engage Teresod with both attacks. An escaped runner does not abruptly end the encounter: surviving escorts can still be stopped, and the UI says that each still counts. The original accounting remains one third of the reserved detachment per stopped soldier, with no special courier bonus, newly created troops or automatic regional conquest.

F8 offers the basic dodge lesson, the advanced thrust/sweep lesson, and interception practice at the Minora camp. R repeats the chosen exercise. All three preserve campaign, discoveries and saved game. Named Ovesos and Caricas autoplay prioritizes a nearby runner and chooses dodge direction by the visible attack type. It submits ordinary movement, dodge and strike input, with no damage or result overrides.

The focused regression checks that a sideways dodge avoids a thrust but is caught by a sweep, retreat clears the sweep, both attack types are required for the advanced lesson, the runner moves while escorts fight, and choosing to fight escorts instead yields two stopped escorts and one escaped runner (8 of 12 strength removed). The native practice check captures the two warnings in `tests/artifacts/minora-practice-windup.png` and `tests/artifacts/minora-practice-sweep.png` and exercises all three practice buttons with ordinary keyboard input.

Verification for the thrust/sweep and runner pass: 67 focused model checks and 24 campaign checks passed, along with 42 native practice checks, the 29-check Ovesos ride/map run and 37 Caricas interception/reload checks. Source-layout, module-linking and exploration-boundary checks passed. Native captures were inspected for both warning shapes and poses. Combat feel and difficulty still need player evaluation.

### Soldier spacing and deliberate targeting

Direct field battles now reserve reachable striking and support positions around
each target. Militia leave wider intervals than trained infantry; supporting
soldiers can fill a vacated front position. Both steering alternatives check dry
body clearance, with cached, bounded local detours when a shoreline or prop blocks
the approach. `gameplay/combat/encounter-positioning.js` owns those reservations
and detours. Weapon range, attack timing, damage and movement speed are unchanged.
The demo driver checks the full dodge path against terrain and bodies, including
the exact eight keyboard bearings, and blocks when no dodge is clear.

[Encounter space](../../src/gameplay/combat/encounter-space.js) gives living actors 1.1m of separation. Movement and dodges stop or slide around bodies, compose with terrain collision, and allow escape from an existing overlap. Fallen and escaped opponents no longer block. Soldiers choose short paths around other bodies with a consistent passing side. Escorts seek separate positions between Teresod and a nearby runner, then commit to their existing attacks when he closes in. This is local steering for the small encounter, not army navigation or formation pathfinding through a city.

[Target selection](../../src/gameplay/combat/encounter-target.js) uses Teresod's movement-facing, a forward cone and staff reach. It respects scenery and other living soldiers screening the target. A gold ring marks the selected opponent, and a small pointer shows Teresod's facing. Pressing X commits that target and direction for the swing; it neither turns toward someone behind Teresod nor changes opponents at contact. Moving or dodging into position, then facing the opponent, is now part of landing a counter. A target can still escape the swing's reach before contact.

Both the world encounter and map-only arena share these rules and markers. The computer demonstrations face and move around opponents through ordinary movement inputs. Try **F8 → Minora camp: interception practice (runner + 2 escorts)** for manual play, or **Minora → Ovesos: ride and defend West (fresh run)** for the complete computer demonstration. The existing one-soldier lessons remain available; **R** retries and **Esc** exits practice.

Verification: 74 focused world/combat tests, 24 campaign tests, 45 native Minora practice checks, 31 full Ovesos ride/map checks, and the map-only native encounter suite passed. The camp check verifies rendered target identity, body separation and marker cleanup as well as victory, defeat, retries and save isolation. Layout, module-linking and exploration-boundary checks passed. Camp and Ovesos screenshots were inspected; subjective combat feel still needs player feedback.

### Isolated combat startup and impact feedback

The shared desktop/web menu now offers **Combat Testing**, followed by the three existing Minora exercises. Opening the selector does not import the 3D host; selecting an exercise prepares the camp and goes straight into combat. Esc and the result button return to the selector. R retries. Switching exercises reuses the loaded world. `npm run start:combat` opens the selector directly. The combat launch registers region 16 only, never creates the war controller, and has no save capability; the native bridge also refuses writes from that mode. The existing Lizeemi War option and its Ovesos/Caricas demonstrations remain the campaign integration path.

The shared encounter presentation adds local hit numbers, a blue shield-block cue, a gold counter cue and red damage feedback. Shield recoil and hit accents are presentation-only. Short synthesized sounds distinguish those impacts; **Sound: on/off** mutes them for the session. Browser audio unlocks on input and fails silently if unavailable. No audio assets or network services are required, and damage, cooldowns and campaign timing are unchanged.

The model records why a dodge did not happen or did not clear an attack: cooldown, held Space needing release, a blocking body, scenery, or remaining inside an active sweep after invulnerability ended. A short local cue and the existing feedback line explain the recorded event; the dodge button counts down recovery. These records do not alter dodge behavior or campaign saves. The independent feedback projection lives in `gameplay/combat/encounter-feedback.js`; effects and sound live in `app/lizeem/encounter-effects.js`.

Verification: 78 focused world/combat tests, 24 campaign tests, 12 exploration tests and four Hearthfall model tests passed. The dedicated startup passed 34 native checks; the built website passed 62 checks without an Electron save bridge, including all three exercises, impact/audio cues, mute, retry/menu transitions, save isolation and Hearthfall Continue. The full Ovesos ride and campaign-map demonstration passed 31 native checks with all twelve reinforcement losses earned through ordinary combat input. Source layout, module linking and exploration dependency boundaries passed. Menu, block, damage, counter and dodge captures were visually inspected. Initial camp preparation remains slow; retries and exercise changes reuse the prepared world. Combat feel still needs player feedback.

### Bounded Minora camp loading

Combat Testing now uses `app/exploration/combat-camp-world.js` instead of calling the global `world.js` assembler. The old region filter narrowed job ownership but still executed the shared starting-country setup and registered the multi-region West Lotharn fine-ground job under Minora. It also built the full atlas despite combat having no map. The new runtime has only two construction jobs: local ground and the existing Minora scenery builder. Neither the global world builder nor the campaign map is imported, and the unused atlas SVG/JSON is not downloaded.

The bounded terrain samples the existing authored height and colour queries, uses a fine grid around the fighting area and coarser nearby ground, and reuses Minora’s actual tents, city walls, buildings and colliders. It omits distant regional scatter and fine-ground construction. The play boundary encloses the existing 45-metre encounter radius. The hero, camera controls, combat model, effects and practice controller are shared with the world test; retries and exercise changes reuse this scene. This is a local development scene, not a change to campaign region streaming.

The exploration adapter now retains startup stage timings. Native combat checks record those timings and construction jobs in `tests/artifacts/combat-testing-checks.json` and verify the absence of global-world and atlas requests. The terrain regression checks drawn/physical ground agreement inside the encounter, original tent positions and collision, and viable soldier/rally routes. The full world and map are still prepared normally when selecting Lizeemi War, Explore or Hearthfall.

Measured startup was 7.8 seconds in the isolated desktop run (2.2 seconds of camp construction) and 9.3 seconds in the built-site browser check. Earlier successful full-builder combat runs were approximately 80-100 seconds; the comparison run during this change instead timed out at five minutes inside West Lotharn construction. These are individual local measurements, not a controlled hardware benchmark or a guarantee for remote browsers. The structural reduction to two local jobs and absence of global-world/map requests are checked directly.

Verification: 79 focused world/combat tests, 12 exploration tests, 37 native combat-startup checks, 65 built-site browser checks, and all 31 Ovesos ride/battle/geopolitical-result checks passed. Source layout, module linking and exploration dependency boundaries passed. The new camp view and browser feedback captures were visually inspected. The README includes a short first-playtest guide; further control/camera changes should follow actual player feedback.


## Compact combat guidance and paused Help

The field encounter and all three Minora exercises now share `src/app/exploration/skirmish-hud.js`. The active panel contains health, dodge readiness, strike/dodge buttons and one instruction. H or Help opens the full control reference and sound toggle. Combat time, soldiers, cooldowns and the preparation countdown freeze while Help is open. H or Esc resumes without withdrawing; movement and queued actions are cleared. Tab and native button activation remain available. Window inactivity preserves the instruction for reading and labels the panel as paused.

`src/gameplay/combat/encounter-lesson.js` projects the next action from actual combat state: recognize the committed attack, dodge, return to reach, face the soldier, then counter the gold-ring target. Fresh failure explanations briefly take priority; the next attack or counter opportunity then replaces them. The thrust-only first exercise and thrust/sweep second exercise retain their existing completion requirements. Enemy timing, hit detection, damage and campaign accounting are unchanged.

The full Ovesos reinforcement explanation is in Help, including the battle deadline and the distinction between an interception and territorial conquest. A runner's escape still leaves the surviving escorts relevant. Results retain the detailed earned contribution. Guidance reads the model; it cannot grant a hit, complete a lesson or change troop counts.

The next useful design input is an uncoached human playtest of all three exercises, followed by an Ovesos intervention. The automated checks drive ordinary combat inputs but cannot establish whether a new player understands the fight or enjoys it.

Verification: 82 focused world/combat tests, 12 exploration tests, 45 native camp checks, 73 built-site browser checks, 30 Ovesos field-intervention checks and the Caricas interception/result regression passed. Source layout, module linking and the exploration dependency boundary passed. The initial broader browser run timed out during Hearthfall startup after passing combat; a standalone rerun passed Hearthfall startup, save and Continue. Desktop and browser HUD/Help/impact screenshots were reviewed.

### Bear and the tower departure

After handing over the horse, Bear turns toward his route before walking back to the stable. Three unsaddled Guild horses occupy separate open stalls. His local loop visits their sides for brushing and feeding, returning through the front aisle between stops. `guild-stable-layout.js` shares the stalls, horses and care waypoints; `bear-arrival.js` owns turning, movement and dwell times; `stable-yard.js` owns the three idle rigs and care gesture. The horses have body contact for walking and mounted players, and their animation is culled beyond the nearby stable. This ambient routine adds no campaign resources or save records. Pauses and conversations hold the route; loading an owned horse restarts Bear's work without another handoff. The hidden native `--stable-care-checks` review verifies the automatic greeting, departure heading, repeated visits to every stall, contact, mounting and save/load.

Bear approaches Teresod automatically on the guild forecourt after the tower departure. This scenario reuses Barrett's existing child appearance (short brown hair) without moving the tutorial NPC or loading his old quest controller. One short offer explains G to mount/dismount, WASD to ride, Shift to canter, Space to jump and H to whistle. A single **Continue** grants the horse on checked dry ground in front of the player, within immediate G reach, without mounting automatically. Escape acknowledges the same offer. Walking away is allowed: ownership persists, H calls the horse later, and campaign guidance continues toward the front. The campaign pauses during the conversation. Bear returns to his stable; F can repeat the reminder or open his existing postwar greeting. An already owned horse is never granted again or moved by that conversation. Entering the tower and joining combat still require dismounting. Normal riding uses the existing 6.5/13 m/s gaits; developer mounts and autoplay retain their 2x pace.

In exploration, both the owned horse and developer horse can swim across loaded water while keeping the rider mounted. Normal swimming is 3.6 m/s; the developer multiplier also applies in water. Shift does not turn swimming into a canter. The riding hint identifies swimming and asks for a clear bank before dismounting; mounting and dismounting still require suitable dry footing. A called horse may swim toward its rider. This does not enable mounted combat or bypass the five-region boundary and loading checks.

The optional `riding` field in the isolated war save records ownership, instruction and parked location. Older saves remain valid and can collect the horse. Continue restores the player on foot and the horse where it was saved, including when saving from inside the tower. The local minimap reuses the existing canvas renderer at roughly eight updates per second, queries the local collider index, and projects nearby roads and existing river profiles. It marks Taleth, the exit, Bear, or the owned horse as appropriate. It reveals no additional hexes and opens the campaign map when clicked.

Validation: `tests/bear-arrival.test.js` covers the bounded approach and safe gift placement; `tests/minora-stable.test.js` covers save compatibility, single ownership, normal versus developer pace and local chart filtering. The focused native command `node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --unified-war-checks --unified-war-bear` exercises the automatic greeting at the actual tower exit, one-click handoff, optional walking, riding, recall and Continue. The focused run passed 65 checks at 1024 by 600 without renderer errors; its captures verify Bear is visible during the offer and the nearby door and mounting prompts do not overlap. `npm run test:tower:desktop` also exercises the actual Bear dialogue, mounting, cantering, dismounting, whistling, two-way doorway and fresh Continue. Screenshots and results are under `tests/artifacts/tower-*`. These additions do not change battlefield resolution or the number of interventions allowed per battle.

The war minimap also draws faction-colored flags for discovered moving armies and crossed swords for active battles. Distant events get edge arrows; same-bearing arrows stack radially. Clicking an event toggles the existing tracking selection, highlighted in gold. Hover text explains distances, deadlines and that army positions are daily strategic estimates. This projection uses the existing map intelligence and does not expose undiscovered armies or battles.

M opens the war scenario in Geopolitical mode. Both the terrain and political layers are clipped to the exact atlas cells of Isareos, Nethereum, Ovesos, Caricas and Nesdor, with panning and zoom-out bounded to that area. The fit control reads Five regions. This optional map scope changes neither stored discoveries nor the unrestricted Explore the World atlas. `tests/war-navigation.test.js` covers actual atlas geometry, scope limits, event visibility and bearings; the tower desktop check exercises event selection and the live five-region map.


### First departure, direct army guidance and Ovesos column (7 October 2026)

The completed Taleth briefing now advances the existing campaign to day 1 and starts its clock. The first real marching orders and dispatch are already available on departure. Repeated conversations and Continue do not advance another day; dialogue and loading still freeze elapsed campaign time. This uses the existing simulation/replay commands and does not revise battle accounting or the campaign scenario version.

Outside the tower, a single selected direction initially identifies Bear. After taking the reins, the player can choose **Track the East Lizeem army**. The optional cyan light points directly at the selected force, with a screen-edge direction when looking away. It never substitutes a bridge, ford or other intermediate waypoint. The player chooses the route; only the computer autoplay retains its surveyed road itinerary. Strategic position estimates advance with the campaign clock, and the physical column position takes precedence whenever available, even at long range. The light respects scene depth; its small navigation label can remain visible when scenery blocks the destination. At close range the tall light disappears and the local interaction takes precedence. Stop clears the selection; choosing an army or battle replaces it. Dispatches now have **Track this event**, so finding a reported battle does not require opening M. Guidance is session-local, like the existing army selection, and does not write discoveries or campaign commands.

The selected army becomes a battlefield target only when it joins a known active battle. At the gold standard the existing F encounter becomes available. Finishing an intervention or resolving that battle retires the route light. This does not make one interception guarantee a regional victory; the broader battle-outcome redesign remains separate work.

The East army's Caricas-to-Ovesos march now has a small visual column on the existing northern Velsorten road during its final two campaign days. A standard is visible at longer range, with up to eight representative soldiers and a little dust close by. Positions interpolate along the authored road from campaign day/fraction; the campaign alone owns force strength, orders and outcomes. The road was surveyed against the actual loaded colliders and ground. Soldiers are suppressed on unavailable or obstructed ground. The column stages when the battle starts and is removed when no corresponding marching/engaged force remains. Other routes still use strategic map estimates. These are visual representatives, not independently fighting NPCs; combat remains the existing F encounter at the nearby battlefield. No extra terrain regions or quests were added.

Once the force reaches this road, its map/minimap marker and selected world indicator share the same position. Unknown army intelligence remains filtered. Pausing, dialogue, interiors and combat hide the column/guidance as appropriate; rendering cannot change the simulation. New presentation modules are `war-guidance*.js`, `war-columns*.js`, with the common projection in `war-armies.js`.

Claude's focused `minora-polish` work through `1e9e3f9` is integrated: bridge arches, masonry, windows, planted courts, hedges and street furniture. The separate survey-render branch was not incorporated. The planted trees retain the low-poly silhouettes but now use three shared instance batches and the existing tree registry: red cedar, holm oak, dogwood and apple. Each can be felled independently. The total polish uses seven batches, and the city remains within the existing render budget. Existing tower, Bear, horse, gate and bridge clearances are retained.

Validation includes the city layout/polish tests, guidance/column/clock projection tests, the existing 82 world/combat tests, and the extended isolated tower desktop check. Captures in `tests/artifacts/` include `tower-exterior.png`, `war-road-light.png`, `war-marching-column.png` and `war-column-close.png`. The native checks cover pause, saved horse, two-way door, legacy saves, Continue, the full column road, event tracking, battle handoff and beacon expiry. The normal camera captures were visually reviewed. These checks establish integration and navigation, not whether an uncoached player finds the pacing enjoyable.

Final verification: 44 tower/departure/navigation desktop checks and 32 complete Minora-to-Ovesos ride/interception/result checks passed, with no renderer frame errors. The journey test now checks that every registered terrain job belongs to the five enabled regions, replacing its obsolete expectation of the larger world's 41 Telemonia tiles. The normal horseback bridge view, distant route light, and near/far column captures were inspected.


### Battlefield captains and the room between departures (7 October 2026)

At active Ovesos battles, the marching column now hands off to two opposing formations with a captain on each side. Twelve representatives at most deploy on collision-checked ground, take short steps and adjust their guard. F talks to a nearby captain, who opens the existing side-selection/intervention briefing. The battlefield standard remains a landmark. These figures do not add campaign strength or simulate a second, cosmetic battle. Their actors are reused across retries. Other battlefield locations retain their current interactions.

Lethal defeat in a world-war encounter now enters a small, separate limbo chamber. The actual local result is recorded once, then the campaign advances to that battle's existing deadline and pauses. The Reaper explains the recorded interception, rally contribution and winning faction. Death does not predetermine the army's winner. A successful rally still resolves immediately; a living withdrawal or timeout retains the normal campaign rules. Practice combat and the independent map-only test retain their existing defeat flow.

The Reaper offers six choices: save and return to the main menu; retry the latest fight; restore its pre-fight confirmation; return alive to Taleth's chamber; return as a ghost; or return as undead. Retry restores a full checkpoint taken immediately before the selected fight, including previous interception losses and the original campaign clock. It cannot accumulate failed attempts. Returning to the world keeps the resolved outcome and resumes time. The waiting room freezes campaign time and constructs no extra terrain region.

Ghost form retains Teresod's silhouette with translucent blue materials, no shadow and movement through props. It cannot fight or ride; it still respects scenario boundaries and unloaded terrain. Undead form is currently a pale, physical variant of the same avatar, with ordinary movement and combat. Both forms have a Return to the Reaper action. These are provisional forms, not new quest arcs or a complete afterlife ruleset. The room and Reaper are original provisional staging; no private manuscript prose or source assets are included. The Reaper now has a faceted human skull, dark eye sockets, separate jaw and teeth, a visible rib cage and jointed skeletal hands and legs beneath an open hooded robe. The scythe, subtle gesture and six existing choices are retained. Arrival and close third-person views were captured and visually inspected with `npm run test:lizeem-world:desktop -- --reaper-review-only`; the isolated fixture constructs no exterior regions and writes no player save.

The optional afterlife record belongs only to the existing isolated world-war save. It contains at most one pre-attempt checkpoint; nested afterlife histories are rejected. Old saves remain valid. Continue from limbo restores the room and stopped campaign without constructing the exterior. `tests/afterlife.test.js` checks replay and accounting for both factions and both Ovesos stages, form validation and invalid-save protection. `npm run test:lizeem-world:desktop -- --afterlife-checks` exercises actual combat deaths, all six choices, retry from a ghost, collision-free ghost movement through an actual building, saved forms, tower return and fresh main-menu Continue. Images and the check report are in `tests/artifacts/afterlife-*`.

Validation: 107 focused model tests passed, plus 20 native afterlife checks and the existing 44-check tower/navigation regression, with no renderer errors. The normal-camera limbo arrival, six-choice dialogue, facing formations, ghost, undead face and fresh Continue captures were visually reviewed. Source layout, module linking and whitespace checks passed. Combat difficulty has not been retuned.


### Nearby opening and battlefield entry (7 October 2026)

Fresh world-war scenarios now use `lizeem-world-v6`. West Lizeem marches from Nethereum to nearby Caricas on day 1 and starts the first battle on day 3, with a day-6 deadline. Taleth, Bear and the optional direct army marker describe this opening. East's later Ovesos march remains available; its named developer ride finds the actual East army instead of assuming army ID 1. Existing v3-v5 saves replay their original rules and schedule. Start a fresh scenario to use the new opening.

A broken amber ground ribbon and small pennants mark each active 70-metre battlefield. Walking or riding into it opens the side-selection choice and pauses time. Stay out preserves mount, troops, allegiance and campaign day. It does not repeatedly reopen while standing inside; F reopens it manually, or leaving beyond an eight-metre margin and returning offers it again. Accepting while mounted uses the existing safe dismount. Ghosts, airborne players and swimmers cannot begin combat. The perimeter follows loaded terrain and disappears when the battle resolves.

In Caricas and Ovesos, interception is phase 1 and the existing rally assault is phase 2. Completing the opening interception advances day 3 to day 4; completing the final assault advances to the actual day-6 result. A victorious final assault decides the winner. Leaving an unfinished phase preserves defeated soldiers, escaped reinforcements and allegiance, without advancing to its end. Re-entry spawns only the remaining opponents, including after Save/Continue. Other scenario sites retain their one-phase skirmish, with the same entry and withdrawal rules. No pursuit phase was added. Reaper retries restore the complete pre-attempt checkpoint; casualty totals and reports count each contribution once.

Validation: the isolated desktop `--battlefield-checks` run passed 21 checks through actual walking, normal horseback entry, safe dismount, refusal and re-entry, one combat kill followed by withdrawal and save/reload, both completed combat phases, day-6 resolution and perimeter removal. It recorded no renderer errors. Normal camera captures of the boundary, mounted choice and final victory report were visually inspected. Model coverage includes both sides, partial losses, escaped soldiers, generic one-phase encounters, legacy replay, and deterministic retry. These checks establish behavior and integration; combat difficulty remains unchanged.


Selective Claude integration after the battlefield revision: ported `80db59f` (recessed Guild doorway) and `053f0c5` (localized ground clearance beneath Minora's bridge decks). The earlier six Minora-polish commits were already present. Kept the scenario's typed, harvestable trees and Bear/tower access. Left out the recording branches and older exploration snapshot because they assume superseded startup and battle flows. This is a source-level port into the existing working tree, not a merge of those branches. The 29 city, polish, tower and stable model checks pass, including real-ground bridge clearance and the existing render budget.

The integrated build also passed 48 tower/stable/navigation desktop checks and a focused Minora review: the player crossed the corrected Guild Footbridge, the new doorway rendered correctly from the normal camera, and the opening dispatch prioritized West's day-3 approach. The door and bridge captures were visually inspected. No renderer-frame errors occurred. The combined battle/combat/navigation model run passed 136 tests, with the additional dispatch-priority regression passing separately.


### Council of Three, closed battlefields and Teresod's Fireball (7 October 2026)

Minora's scenario council now consists of neutral Wizard Guild Master Taleth, Mayor Ishkur Vey of Ovesos (West Lizeem), and High Priest Haldor Sorn of Nesdor (East Lizeem). The latter two names and their local allies are new provisional game inventions. The Mayor's curls, coat and cravat take inspiration from Alexander Spotswood's portrait; the High Priest combines ceremonial drapery with an ivory mitre, red cope and staff. They use the existing low-poly character builder with local additions.

F opens the Grand Temple or the Mayor's Hall (the existing riverside Hall). Each is a separate, lazily built interior with one council member, a two-way doorway, and room-aware Save/Continue. The exterior is retained between visits. Campaign time is held while inside. Talking does not enlist the player or change politics. The joint-audience option acknowledges meeting both members but explicitly remains an unfinished peace branch.

Three standards above each city gate identify the Guild (blue star), civic government (green bridge) and temple (red sun). Taleth leads initially. The latest recorded intervention for West or East raises the associated member's standard to the highest central position; a declared war winner takes precedence. Influence is a read-only projection of actual campaign commands, not a second diplomacy simulation or a change to Minora's territorial ownership. Save/replay therefore restores flag order from campaign history. Optional council save data records only whom the player has met.

Active battles now have a continuous amber veil above the existing ground ribbon. Nonparticipants stop at the same 70-metre boundary on foot or horseback. Swept movement also prevents a fast mount from jumping through the footprint. Declining does not consume participation: F offers entry again at the edge, or a fresh approach after leaving the outer margin does so automatically. A saved or withdrawn player inside the footprint is returned to clear perimeter ground. The veil disappears during the local encounter and when the regional battle resolves. The campaign map and minimap project that same footprint as a filled, dashed outline in every map mode, subject to existing battle discovery.

Lizeemi War loading screens show short passages drawn from the authored prelude plus the council background. They advance every nine seconds during a visible load, with an optional Another account button. Loading is never delayed to finish a passage. Other launch modes retain their ordinary loading screen.

Teresod has Fireball immediately in the world-war scenario. Click Fireball or press Q while on foot outdoors; it aims along the camera direction, with modest assistance toward a nearby opponent in front. It uses the base spell numbers from Ben's lesson: 20 mana, 26 damage, 18-metre range and 17 m/s projectile speed. The 100-point mana pool recovers at four points per active second after four seconds without casting. Casting has a 1.15-second cooldown. Projectile travel, solid scenery and enemy bodies determine impact. The active encounter records spell casualties through the same model as melee, including partial progress and retry. No skill tree, old quest controller or experience system is loaded. Mana and cooldown are optional fields in the isolated war save; older saves begin with full mana. Ghosts cannot cast, and interiors have no spell button.

Focused checks live in `tests/minora-council.test.js`, `tests/teresod-fireball.test.js`, `tests/battlefield-area.test.js` and `tests/war-navigation.test.js`. The isolated native command `npm run test:lizeem-world:desktop -- --council-checks` covers the doorways, dialogue, saved rooms, standards, both map outlines, refusal/re-entry and a real Fireball hit. Its screenshots are `tests/artifacts/council-*.png`. The existing `--battlefield-checks` and `test:tower:desktop` commands remain regression checks for combat phases and the original tower departure.


Verification for this revision: 22 council/loading/map/Fireball desktop checks and 21 full battlefield desktop checks passed with no renderer errors. The latter walks and rides into the perimeter, declines and re-enters, safely dismounts inside the accepted battlefield, withdraws after a real combat kill, saves partial progress, and completes both phases. Focused model checks cover council influence, optional save fields, room collision, projectile travel/occlusion/damage, depleted mana, and swept boundary exclusion; the existing Ben spell and world-combat regressions pass. The council members, both interiors, gate standards, loading passage, map footprint, opaque barrier and airborne Fireball were captured from player camera views and visually inspected. Every complete council banner is merged into one mesh. Module linking, source paths, exploration dependency boundaries and whitespace checks passed.

The additional full `test:tower:desktop` regression did not complete: its exterior transition exceeded the existing five-minute timeout while preparing `westLotharnGround`. This run does not establish a pass for the broader tower/Bear/Continue sequence. The focused council and battlefield runs above both completed exterior loading and their actual interactions successfully; the loading-timeout cause remains unconfirmed.


### Spell attachments, central battle staging and resident trial (8 October 2026)

Teresod's Fireball samples the rendered right palm when unarmed, or the equipped oak staff's actual tip. The war hero exposes the same focus socket as the adventure rig, and a short casting gesture and local release glow connect the projectile to its source. Parent transforms, casting joints and undead form are included. Spell damage, mana, projectile collisions, save isolation and the absence of a skill system are unchanged.

A world-war encounter now searches collision-checked ground within 24 metres of its authored battlefield centre. Both hero and opponents stage there after acceptance, independent of the entry edge and camera angle. The entire interception route or rally formation must fit before relocation. Normal camp practice keeps its existing placement. The Reaper checkpoint remains before acceptance, and partial battle progress remains authoritative on re-entry.

The Reaper is scaled to 86 percent of his previous size. A closed floor-length cloak and sleeves cover the body below his skull; the face and skeletal hands remain visible. Hidden ribs and leg meshes were removed. His room, six choices and afterlife rules are unchanged.

The Lizeemi War has a bounded Minora resident trial: Seshat, Satet, Portunus, Njord, Manawydan and Hapi. These appearances and occupations are a curated data-only subset of Claude's existing Minora cast, preserving their identities without importing the adventure's merchant registration or farming quest dependencies. They appear around the Guild, temple, market and river storehouse. Seshat uses the existing clerk animation; Satet and Hapi take short validated local walks. They do not offer the old quests or trading systems.

At most six rigs are cached, constructed lazily one per update within 80 metres. Residents are hidden beyond 95 metres and in interiors, with animation limited to 12 Hz nearby and 4 Hz farther away. They add no shadow maps, pathfinding, campaign agents, save fields or region loads. The F8 **Minora residents trial** checkbox disables them for comparison. This is an appearance/performance trial, not a new settlement simulation.

The focused native command is `npm run test:lizeem-world:desktop -- --scene-revision-checks`; captures and measurements are in `tests/artifacts/scene-revision-*`. Model checks in `tests/scene-revision.test.js` cover deterministic central staging, actual rig sockets, closed cloak coverage, bounded construction and distance culling.

Verification: the combined scene/battlefield desktop run passed 34 checks with no in-game renderer errors. It entered from widely separated edges and staged both fights at Caricas (-2092, 231); ordinary mounted entry, partial withdrawal, Save/Continue, re-entry and completion of both phases passed. Actual socket positions and live-enemy spell damage were checked. The focused model runs also passed, including the council and afterlife regressions. Player-camera captures of the residents, central battle, hand/staff release and cloaked Reaper were inspected. The projectile trail now appears only after traveling far enough to remain beyond its source.

In the sampled market camera the resident toggle changed rendering from 154 to 184 draw calls and from 461,990 to 469,434 triangles (30 calls / 7,444 triangles added). CPU render medians varied across runs: 12.8/12.4 ms without/with in one sample and 11.2/13.5 ms in another. These short samples do not establish a stable FPS improvement or zero cost. The important trial limits are six total rigs, nearby-only rendering, no distant animation, and no new loaded regions. The F8 toggle is available for normal-play comparison. Module linking, source layout and exploration dependency checks passed.


### First-battle progression and return to Minora (8 October 2026)

The field HUD now identifies the current phase and its live objective count. The interception review separates soldiers stopped or escaped, reinforcement strength removed, and the resulting rally guard count. Regrouping leads directly to the final-assault choice at full health. The final review states that Continue advances to the battle's existing deadline and records its result. Declining, withdrawing, resuming partial fights, death/retry, combat difficulty and campaign resolution retain their existing rules. Legacy scenario saves retain their original one-shot accounting.

Completed v6 battle reports show the winning faction, territory change, the player's contribution, separate army losses and the resolution day. The optional Track Minora / council button adds one direct Guild destination; it can be stopped or replaced with another tracked event. It does not add route waypoints, move the player or create a return quest. Report actions remain visible while long text scrolls.

Taleth, Ishkur Vey and Haldor Sorn acknowledge the most recent resolved battle in which the player participated. They distinguish a decisive rally victory from an outcome decided by the remaining armies. The Mayor welcomes West's success; the Priest responds as an eastern partisan, with the responses reversed for East. Dialogue describes the same provisional council leadership used by the gate standards and distinguishes that from winning the whole war. The peace option remains a placeholder.

`battle-progress.js` and `battle-consequences.js` are read-only projections of encounters and campaign events. They do not add save fields, quests, reputation, residents or simulation commands. The completed engagement's original result is authoritative even if its region changes hands later. Save/Continue and Reaper checkpoints therefore keep or rewind the corresponding dialogue naturally. The three conversations cannot start the campaign again or change its outcome.

Verification uses `tests/battle-story.test.js` and the existing battle, afterlife, council, navigation and exploration regressions. `npm run test:lizeem-world:desktop -- --battle-story-checks` plays both phases using ordinary combat inputs, including mounted entry, refusal, a partial withdrawal, Save/Continue and re-entry, then follows the actual two-way doorways to all three councillors. It checks exact result persistence, optional guidance, flag/dialogue agreement and unchanged campaign history during conversations. Screenshots and the native report are in `tests/artifacts/battle-story-*`.

Validation passed: 71 focused model tests and 36 native battle/return checks, with no renderer errors. The native run covers both living combat phases and the saved return visit; model cases cover both faction choices, incomplete/failed attempts, legacy saves and replay. Interception review, final briefing, final assault review, resolved report and all three conversations were visually inspected. The report keeps its action buttons visible and transient notices no longer cover battle progress. Module linking, source layout, exploration dependency boundaries and whitespace checks passed. These checks establish correct presentation and accounting; combat feel and difficulty still require player feedback.


### Focused combat camera and resident conversations (8 October 2026)

World skirmishes and isolated Combat Testing share optional target focus: T locks/releases the visible opponent nearest the camera direction; E cycles the visible candidates within 22 metres. A cyan diamond identifies focus; the existing gold ring still means a valid melee target. While focused, movement strafes and faces that opponent. The camera turns smoothly to keep the hero and opponent in view, retaining world-collider protection. Right-drag overrides automatic following for two seconds after the last adjustment. Targets are released on death, escape, encounter end or leaving range; they never silently switch to a survivor. Help still pauses combat. Retry and disposal remove the old focus.

Focus does not change melee reach, committed strike facing/target, body screening, guard behavior, damage or difficulty. An obstacle can block the focused target; the UI reports it. Fireball prefers the explicitly selected opponent within its unchanged 18-metre range, otherwise assists only toward a visible opponent close to camera aim. A blocked or distant lock never retargets another soldier. The release gesture faces the intended opponent before sampling the actual hand/staff tip, and normal projectile travel/collision still decides impact.

All six Minora trial residents now offer short role-specific conversations via F or their nearby prompt. Their existing authored appearance and occupation are reused; the smalltalk is new scenario prose, separate from legacy farming quests and manuscript material. Seshat, Satet, Portunus, Njord, Manawydan and Hapi can discuss their work and the war. Conversations do not enlist the player, trade, add quests or mutate campaign/save state. Time pauses while talking; the speaker stops their local walk and faces the player. Esc closes and Tab stays within the dialogue. Prompts require proximity and a clear sight line, allow talking over low counters, and disappear during combat and inside unrelated rooms.

`combat-focus.js` owns pure target selection; `combat-focus-view.js` owns local controls/marker. `resident-conversations.js` holds the bounded prose, with `resident-host.js` connecting it to existing actors and dialogue styling. There are still only six lazy residents, no new pathfinding or schedules, and no additional regional construction. Proximity scans for the prompt are throttled to roughly eight per second.

Verification: model tests cover deliberate focus, strafe facing, committed swings, range and occlusion, Fireball selection and the six conversations. Native commands are `npm run test:lizeem-world:desktop -- --combat-testing --combat-focus-checks` and `npm run test:lizeem-world:desktop -- --resident-dialogue-checks`. They use isolated in-memory saves. Captures live under `tests/artifacts/combat-focus.png` and `tests/artifacts/resident-dialogue-*.png`.


Validation passed: 58 focused model checks, the native Combat Testing regressions (all three exercises), target-lock/camera checks, and the actual-world visits to all six residents followed by a focused staff Fireball hit. Both native runs reported no renderer errors. The combat framing, cyan marker, corrected Fireball hit message, and readable market conversation were visually inspected. Source layout, module linking and the exploration boundary audit passed. No combat damage/timing rebalance or new simulation agent was introduced; perceived feel still needs player feedback.


### Combat readability and recovery pass (8 October 2026)

The independent encounters now give five-hit survivability from full health, a brief visible post-hit protection ring, and longer windups/recovery openings. Movement and dodge remain available after damage. A connecting strike during protection is consumed rather than becoming a delayed second hit or a false dodge reward. Shield discipline, committed swings, facing, collision, enemy numbers, campaign strength and phase accounting remain unchanged. `gameplay/combat/encounter-balance.js` owns the shared difficulty values.

`encounter-cue.js` projects the actual attack clock into a filling windup bar and draining counter window. Warning footprints have bright edges; a missed attack lowers the soldier's weapon and shield and exposes a shrinking mint ring. In groups, the active attacker takes priority for the large label while other soldiers retain compact health bars. The existing T/E focus controls remain independent of this warning priority. Damage messages and local fireball feedback report the actual loss; soldiers resetting after contact no longer display a late sidestep instruction.

Model verification covers five-hit defeat, responsive escape after damage, a successful comeback, a counter after a 650 ms reaction delay, bounded squad attack commitments, actual warning/opening durations, and resource cleanup. Native checks are available with `npm run test:lizeem-world:desktop -- --combat-testing --combat-focus-checks --combat-readability-checks`. Player-view captures are `tests/artifacts/combat-readability-{thrust,opening,sweep,hurt,crowd}.png`. The optional `--opening-horse-checks` flag adds Taleth/Bear coverage to `--afterlife-checks`; that test now uses the current Caricas day-three battle rather than the old Ovesos captain-entry fixture.

This is an initial tuning pass, not evidence that difficulty is optimal for a human player. No new encounters, skills, NPCs, textures or campaign systems were added.

Verification completed: seven focused model-test files passed. Native runs passed targeting/readability and all three practice exercises, the Caricas entry-to-victory/council sequence, and Taleth/Bear plus actual combat death, all six Reaper choices and fresh Continue. All three native reports contain no renderer errors. Inspected player-view images for thrust, sweep, counter recovery, crowd labels, damage/protection, final assault review and Reaper choices. The revised recovery label was also captured and checked. These checks establish functional consistency and visual legibility in the sampled views; they do not measure human reaction difficulty or general performance.

### Small allied assault comparison (8 October 2026)

Combat Testing now includes **Allied assault** (Teresod and three allies against four enemies) and **Solo assault comparison** (the same camp formation without allies). Both also appear in F8. They retain practice save isolation, ordinary movement/strike/dodge controls, target focus, Help, retry and exit. The original three exercises remain available.

The current campaign's final-assault briefing has an optional **Fight with allies (experimental)** checkbox; solo remains the default. Campaign opposition still depends on the interception result, rather than being forced to four enemies. The choice persists for that assault. Both formations are staged on clear ground near the authored field centre, independently of where the player crossed the boundary. Allies use distinct faction colours, cyan ground rings and compact health labels. They choose and approach enemies, commit to attacks, take damage and can die. They cannot be selected as the hero's melee, focus or Fireball target. Body collision still applies, so positioning around allies matters.

Allies have 50 health and deal 12 blade damage, or 6 against a raised guard. Opponents deal 16/8 against allied soldiers; Teresod retains the existing player-facing combat balance. The tuned practice fixture loses with passive Teresod but can be won using ordinary movement and attacks. This establishes a useful comparison, not a claim of optimal human difficulty. The final isolated enemy retreats after the others fall. A rout clears local opposition but is not counted as an enemy death. The later victory-transition revision below replaces the original six-second capture task; survivors now begin regrouping as the enemy line breaks.

`gameplay/combat/allied-assault.js` owns bounded NPC combat. The existing encounter model still owns player input and resolution. The independent campaign records an `assault-style` command and allied progress in its existing replay history. Withdrawal preserves enemy defeats, routs and allied losses; re-entry spawns only the remaining soldiers. Fallen allies remove strength from the friendly side, while routed opponents retain their surviving campaign strength. Completing the phase advances directly to the existing battle deadline and result. Reports distinguish enemy losses, allied losses, routs and subsequent army losses. Reaper retry restores the exact pre-attempt history, including the chosen style.

Character disposal now releases temporary rigs' owned geometry and materials while preserving the shared primitives and cached materials. This also fixes the original enemy-rig accumulation on practice retries. The resource check holds at 193 rendered geometries across four allied retries and drops to 33 after leaving the camp exercise.

Verification entry points:

- `tests/allied-assault.test.js`: active/passive comparison, contribution, body separation, friendly targeting, regrouping, casualty accounting, replay, legacy solo progress and shared-resource safety.
- `npm run test:lizeem-world:desktop -- --combat-testing --allied-assault-checks`: actual camp combat, formations, aftermath, practice isolation and cleanup.
- `npm run test:lizeem-world:desktop -- --combat-testing --allied-resource-checks`: short matched-camera rendering comparison and repeated-retry resource check.
- `npm run test:lizeem-world:desktop -- --allied-campaign-checks`: real Caricas staging, withdrawal, save validation, re-entry, immediate result, death and retry. `--allied-reaper-checks` runs the recovery portion alone.

Player-view images are under `tests/artifacts/allied-assault-*.png`, with campaign and resource reports alongside them. This remains a three-ally experiment; it adds no persistent NPC population or other regional construction.

Validation completed: twelve focused model-test files passed, including the existing solo combat, practice, movement, spell, target-focus and campaign regressions. Native checks covered all original practice exercises, allied advance/damage/rout/regrouping, passive defeat versus active victory, campaign withdrawal and saved re-entry, immediate day-six results, and actual death followed by Reaper retry. The corrected resource and recovery checks pass with no renderer errors. Visually inspected the five-exercise menu, allied formations, fighting, survivor regrouping and campaign receipt. Source layout, module linking, exploration dependency audit and whitespace checks passed.

In a matched 1440-by-960 camp view, adding three allies increased draw calls from 140 to 221 and triangles from 95,846 to 111,008. Across 24 render samples, median CPU render submission rose from 8.8 to 9.6 ms (p95 14.5 versus 12.7 ms, reflecting sampling noise). This measures static rendering submission, not complete frame time, GPU duration or a guarantee of gameplay FPS. Keep the bounded experiment and obtain player feedback before increasing army size. The ordinary-input native win took about 19.4 simulated seconds, with two allies surviving; the same fixture lost when Teresod remained passive.

### Allied reactions and positioning (8 October 2026)

Actual melee or Fireball damage now gives a surviving opponent four seconds of attention toward Teresod. One nearby soldier with a clear line of sight can notice the attack as well. Committed attacks and recovery openings finish before retargeting. A reacting soldier turns at a bounded rate for at least 380 ms, then begins the ordinary full attack windup. Attention-driven switches favor no more than two opponents already focusing Teresod; the existing staggered player-facing attack commitments still apply. This is local awareness, not a faction hostility or persistent morale system.

Allies briefly reserve separate approach positions around opponents, favoring side angles away from Teresod's approach. Target preference and 650 ms slot holds reduce frame-to-frame switching. Ordinary terrain movement, body collision, committed swings and friendly exclusion from player targeting remain in place. The three-versus-four practice, solo comparison, health and damage values are unchanged.

The final isolated survivor now visibly lowers their guard for 750 ms before retreating. Rout accounting happens once at the break, including when two allied attacks land during the same step, and remains distinct from a kill. The instruction and gold marker change to victory. A reacting soldier gets a turn label, or a compact alert when another soldier's attack warning takes priority. The large rally label hides during close combat to avoid covering fighters, then returns as **Field secured**.

The existing `--allied-assault-checks` native run now captures `allied-assault-reaction.png` and `allied-assault-breaking.png` as well as the formation, fighting and result views; `--allied-cue-checks` is a shorter visual-only pass with `--combat-testing`. Model checks add committed-target preservation after a real flank hit, the subsequent full warning, separate stable side approaches, a visible break before movement, and non-duplicated rout credit. Eight focused model files (78 tests), actual Caricas withdrawal/re-entry/victory, saved replay, and Reaper death/retry passed. The ordinary-input camp comparison remains winnable and passive play still loses; this does not establish human difficulty or require a successful dodging player to take damage.

### Two-hour play-session and performance pass (8 October 2026)

The opening, journey and aftermath now preserve the player's chosen destination in the isolated war save. Direct army tracking remains a single moving destination. The horse guide points to the actual parked horse until mounted or the player walks away. After a result, the player can choose Taleth, the Mayor or the High Priest as a direct destination; the main marker and minimap agree on that doorway. Stopping guidance also survives Continue. Older saves without a destination remain supported and do not send a player who already owns a horse back through Bear's introduction.

The pause menu includes **Save and exit to main menu**. A failed write leaves the player in the pause menu and preserves the previous save. The separate exit-without-saving action is explicit. Dismissed dispatches stay dismissed after Continue, while the latest battle result remains available on the campaign map. These optional navigation and report fields do not alter campaign replay or other game modes' saves.

The compact desktop layout keeps the minimap, tracking panel and Fireball controls separate at 1280 by 720, 1024 by 768 and 1024 by 600. The smallest height removes explanatory HUD sentences while retaining the destination, council buttons, map key, mana meter and spell control. The scenario heading now reads **Lizeemi War** rather than **world test**.

Performance changes are deliberately bounded:

- Unchanged HUD properties are no longer written on every frame. In matched 90-frame samples, DOM mutations fell from 1300 to 28 in the chamber, 1295 to 36 outdoors, and 1202 to 33 with guidance. Outdoor CPU timing was noisy and did not improve consistently; this is not an FPS claim.
- Camera obstruction gathers one conservative collider set per camera segment and reuses collider heights across the existing 24 probes. All 192 actual chamber/city paths matched the old result, as did 600 seeded model paths. In the city microbenchmark, a batch of 288 segment checks fell from a median 1.8 ms to 0.7 ms; absolute per-frame savings are small.
- Temporary garrison, battlefield and aftermath characters release their owned geometry and materials while retaining shared primitives. Six real rendering cycles previously grew from 372 to 922 geometries; they now remain at 262 each cycle and fall to two shared geometries after final disposal. A blocked guard post also retains its surviving representative across updates instead of repeatedly rebuilding the group.

Verification entry points added for this pass:

- `npm run test:lizeem-world:desktop -- --first-session-checks`, optionally `--east-side`: walk to Taleth and Bear, mount normally, ride the existing streets and White Bridge, save/Continue during the approach, enter the day-three battlefield, complete both phases using ordinary combat inputs, and verify day-six ownership and the appropriate council leader. The route is a test driver's path, not a series of player-facing markers.
- `npm run test:web:desktop -- --war-only`: the same West Lizeem sequence against the actual static build without Electron's save bridge, plus failed-save protection, menu/Continue, report and navigation persistence, compact HUD checks, other-slot isolation and browser errors. `--war-release-checks` adds this sequence after the existing broader browser entry checks.
- `--session-performance-checks`, `--war-resource-checks` and `--camera-cost-checks` on the native war command record the bounded measurements above. `--test-size=1024x600` allows compact-window native visual checks.

Both allegiance sessions and the browser sequence passed with no renderer errors. The two focused model batches passed 170 and 75 checks respectively; separate legacy-fixture regressions passed 26. Actual combat death, all six Reaper choices, withdrawal/re-entry, council consequences and fresh Continue were also checked in isolated native runs. The full repository suite was attempted but did not complete within this session; broad legacy full-world construction checks are not claimed as passing. The automated driver can dodge perfectly, and the optional allied final assault can be easy after a perfect interception. Human difficulty and subjective feel still need playtesting before increasing forces or changing balance.

Final compact-window verification also covered the full combat practice set, target selection, attack warnings, allied advance/reaction/rout and retry cleanup at 1024 by 600. The combat HUD now skips unchanged health, button and targeting properties. An idle/background-window 90-frame HUD sample fell from 360 DOM mutations to zero; it is not an active-combat FPS measurement. Subsequent ordinary-input combat checks verified that health, cooldowns and focus still update correctly.

The Chronoscope no longer compresses its map and narration beneath the playback controls in short windows. Its compact layout was visually checked at 1024 by 600, and native checks verify that the controls remain below the content. Historical playback, timeline, optional start and save isolation still pass. Tower regression now passes 50 checks, including normal and developer horses crossing the real Minora river, safe nearby-bank dismounts, saved ownership, the two-way tower door, army navigation and fresh Continue. Pure riding checks separately cover refusal to dismount into open deep water. Four targeted legacy swimming checks also pass; the stamina fixture now verifies running, swimming and climbing rather than matching an outdated source expression.

A final follow-up removed the remaining repeated minimap accessibility/target attributes and resident prompt writes. The same stationary 90-frame samples then recorded zero DOM mutations in the tower, outdoors and with navigation selected. Six actual resident conversations and a staff-launched, focused Fireball hit passed again at 1024 by 600. This describes unchanged HUD work only: moving characters, changing counters and the actual scene still require updates.

For the remote playtest, deploy the latest `main` manually on Render and choose **Lizeemi War Scenario** for a fresh current opening. Talk to Taleth, optionally watch the 25-second history, then meet Bear and mount. Track the army and choose a route across the existing city bridges to Caricas. The battlefield begins on day three; declining is reversible, and completing both phases resolves it on day six. The optional allied final assault remains explicitly experimental. Afterward, choose a council member to visit. **Save and exit to main menu** followed by **Continue war scenario** resumes that browser's save. Saves do not transfer automatically between desktop and browser devices.

Release verification: the final static browser run passed the complete West-side opening, horse ride, both battle phases, immediate result, menu/Continue and save-failure checks, with no renderer/console errors or remote service requests. The final 1024-by-600 Reaper run passed actual defeat and all six recovery choices, including fresh Continue in limbo. Visually inspected the final compact Chronoscope, combat warning/focus, resident conversation, Reaper room and choices, council navigation, mana panel and Save-and-exit screen. The source layout (1,495 modules), module graph (866 linked modules), dependency audit and staged whitespace checks passed.

### Automatic assault victory and practice comparison (8 October 2026)

Breaking the final enemy line now ends both solo and allied assaults after a 2.25-second victory beat. There is no additional capture task. Surviving allies lower their guard and begin regrouping immediately, continuing during result review. Victory does not depend on Teresod reaching the standard or an ally finding a clear path. The existing bounded retreat route still removes a fleeing opponent cleanly without counting a rout as a kill. During the victory beat, a compact progress panel replaces attack and targeting controls; Escape opens Help instead of withdrawing from a won fight. Continue records the campaign result and advances to the battle deadline as before.

Allied and solo assault practice results now offer a direct button to try the other formation on the same prepared ground. This resets the fight, disposes the previous soldiers and reuses the loaded world. Results include duration, health, casualties and allied contributions. Practice remains isolated from campaign saves, allies remain optional in the campaign, and the three-ally/four-enemy fixture and combat damage values are unchanged.

Verification: 114 focused model checks passed, including passive versus active participation, solo assault, withdrawal/replay, and victory with an unreachable standard or no surviving allies. `npm run test:lizeem-world:desktop -- --combat-testing --assault-comparison-checks --test-size=1024x600` passed four alternating ordinary-input fights, pause during victory, comparison cleanup and save isolation. The compact transition and result screenshots were visually checked for legible text, visible regrouping and accessible controls. `npm run test:lizeem-world:desktop -- --allied-retreat-checks` passed real Caricas retreat, automatic victory away from the standard, day-six ownership and save validation. Both native reports had no frame errors.

The automated camp driver finished the solo fixture in 29.5 simulated seconds at 80 health and the allied fixture in 14.7 seconds at 100 health, with three allies surviving. This is a repeatable fixture comparison, not a human difficulty or enjoyment measurement. The sampled step CPU timings varied and do not establish an FPS improvement. Next evaluation is an uncoached human comparison before adding soldiers or changing balance. Captures and reports are in `tests/artifacts/assault-comparison-*` and `tests/artifacts/allied-retreat-*`.


### Taleth's pigeon correspondence and the river lookout (8 October 2026)

Taleth's opening asks for a swift end to the war, preserving the people's strength for greater troubles. After the first resolved battle, his pigeon dispatches replace the corresponding generic result reports. Later battle openings and results receive further counsel; the winning league triggers a summons to the guild lookout. Letters report recorded contributions and casualties, including nonparticipation, without inventing a personal victory. The same event history rebuilds the archive under **M / Letters from Taleth**. Reading a letter pauses campaign time; dismissing it preserves it in the archive and existing report-read saving prevents repeated delivery after Continue.

The pure [correspondence module](../../src/app/exploration/taleth-correspondence.js) reconstructs territorial ownership in event order, so earlier letters do not change after a later conquest. Advice favors the territorial leader, breaking ties with the latest battle result while explicitly acknowledging the tie. This is a transparent heuristic, not an army-strength optimizer or a guaranteed quickest solution. It does not choose an allegiance for the player. Minora becoming the league's seat is Taleth's expectation of a future settlement; the simulation still records neutral Minora and the existing council consequences.

A single low-poly courier approaches, alights and departs near Teresod. Slate plumage, paired wing bars, a green neck, orange eyes and a message tube make the rock dove recognizable. Three perched birds occupy the small guild loft. There is no birding skill, population simulation or new quest system.

After either league wins, return to Taleth's chamber and choose **Join Taleth at the lookout**. The separate walkable top gallery keeps the existing exterior as its panorama. It prepares the five scenario landscapes and a coarse, nonplayable terrain horizon on ascent to avoid unloaded terrain appearing as ocean; the opening load is unchanged. The horizon uses the existing terrain backdrop builder and adds no settlements, actors or travel permissions. Taleth points across the Lizeem, recounts actual intervention and the winning council faction, then turns east toward Ambron. Three manually advanced pages let the player read at their own pace. The final confirmation records completion in the isolated war save. The stair door returns to the chamber; Ambron remains a later chapter.

Verification: focused correspondence, tower, council, battle-story and world-war model suites passed. `npm run test:lizeem-world:desktop -- --taleth-story-checks --test-size=1280x720` exercises an ordinary-input allied assault, actual impact letter, courier arrival, archive, dismissal/Continue, natural war settlement, the two-way lookout and campaign completion. `--taleth-lookout-checks` provides a shorter nonparticipation/finale visual regression. Test profiles remain separate from normal player saves. Captures and reports are in `tests/artifacts/taleth-story-*`.

Final verification passed 31 distinct end-to-end native assertions with no renderer errors, including an actual allied victory, letter archive, both lookout directions, the stair return, and main-menu Continue in a fresh renderer. Both-victor model checks and the nonparticipant native finale also passed. Visually inspected pigeon delivery, readable dispatch controls, river-country panorama, Taleth's pointing gesture, the politics summary and the eastward view at 1280 by 720.


### Campaign continuity across all four contested provinces (8 October 2026)

Fresh world campaigns use `lizeem-world-v7`. Nethereum and Nesdor now use the same landscape interception and final assault as Caricas and Ovesos. Winning the final assault decides that field and advances to its deadline, including a last-province victory. The authored battlefield centers, combat damage and strategic AI rules remain unchanged. Fresh campaigns offer two allies after a perfect interception (three enemies), or three allies against larger detachments. This removes the unattended three-versus-three win found during the full-campaign test. The practice comparison and older saved campaigns retain their existing three allies; withdrawing never replenishes the saved squad. Versions 3 through 6 retain their exact replay definitions; Continue does not silently rewrite an older campaign. Start a fresh **Lizeemi War Scenario** to use all four updated battle sites. The Chronoscope and opening army guide recognize the new version.

The report, map controls and Taleth's letter archive now offer a live follow-up action. [Campaign opportunity selection](../../src/app/exploration/campaign-opportunity.js) prioritizes an unfinished commitment, then an active known field by deadline, then a known attacking march. It remembers the last side personally supported when explaining the opportunity, while Taleth's territorial advice remains independent. The player still chooses a side at the battlefield. Following selects one moving-army or battle marker and explicitly resumes time; it does not pick a route, teleport, enlist, or start combat. If no known opportunity exists, the action resumes the campaign and explains the next strategic order day. A finished war instead points to Taleth's lookout and cannot restart the clock.

Historical letters remain immutable. A separate **Campaign now** paragraph reflects the current front even when reading an older dispatch. Long letters scroll within a panel whose title and action buttons remain visible. Following from the archive or map returns to exploration; repeated clicks keep the same selected target. Unknown army destinations remain hidden, and the visible physical road column is eligible even without a schematic route line.

Focused model checks cover both completed wars, exact midwar replay, old v6 saves, reversible refusals, commitments, knowledge filtering, historical letters, council consequences and allied/solo combat. A scripted perfect-intervention campaign finishes West on day 28 after six battles and East on day 30 after five. These are deterministic test paths with immediate travel, not human playtime estimates. West's path includes repeated Caricas defenses; that counterattack repetition remains a useful subject for the next human playtest rather than being disguised by a forced victory or new strategic rules.

The native regression is `npm run test:lizeem-world:desktop -- --campaign-continuity-checks --test-size=1280x720`, with `--east-side` for the other allegiance. It walks the opening briefing, horse handoff and first ride, then uses test placement and day advancement for later travel while fighting each phase with normal combat inputs. It checks saves between battles, live follow-up controls, ownership, final council leadership and the two-way lookout conclusion. Later travel is explicitly not a continuous manual traversal test. Synthetic focus events keep the isolated combat driver active when another application takes foreground focus; normal game focus pausing is unchanged. Artifacts use `tests/artifacts/continuity-{west,east}-*`.

Final release verification: both native campaign runs passed 31 distinct checks each with no reported frame errors, covering 22 combat phases across 11 battles. The final runs used two allies against three enemies after perfect interceptions; both Teresod and his allies contributed. Letter layouts, follow-up controls, political summaries, lookout panoramas and restored completion were visually checked at 1280 by 720 and 1024 by 600. The staged release passed its isolated module graph, web build and 15 continuity/allied model checks. A separate existing held-battles source scanner still flags the legacy developer-fire-check encounter in unchanged src/main.js; this is not a clean whole-repository test result.


### Campaign pacing and the two-battle journey (9 October 2026)

Fresh world campaigns now use `lizeem-world-v8`. Armies recover for two campaign days after battle, and defeated commanders wait three days before issuing a fresh attack on the same province. [Offensive recovery](../../src/simulation/offensive-recovery.js) reads the recorded defeat; this is an order delay, not territorial immunity. Existing marches and reinforcements continue, other fronts remain available, and troop losses/recruitment and combat damage are unchanged. The battle event records the earliest reattack day so Taleth's historical dispatch can explain the opening accurately. Versions 3 through 7 keep their original timing and exact replay; use a fresh Lizeemi War Scenario for v8.

Live advice distinguishes protecting a foothold from supporting an offensive. When both are known, the letter, report and map offer a second destination and explain what the regional armies must handle if Teresod chooses the other front. Selecting either retains one army/battle marker and resumes ordinary time, without choosing allegiance or entering combat. Unknown routes are not offered. If the last personally supported side differs from Taleth's preferred territorial leader, the advice explicitly acknowledges that disagreement. Current advice now appears above the immutable dispatch text; fixed action buttons remain accessible while the longer letter scrolls.

During a quiet interval, **Wait for next dispatch** advances the existing daily simulation until a known battle/march appears, a decision or victory stops it, or seven days pass. It pauses for review and never moves the hero or changes clock speed. This is an explicit alternative to resuming normal time and exploring; it does not silently accelerate travel or consume a currently offered battle. Save/Continue retains the result. The desktop test's quiet West interval advances from day 8 to day 13 and stops at the next incoming army.

The repeatable perfect-intervention model paths now take four battles on either side: West ends on day 22 (previously six battles/day 28), East on day 18 (previously five/day 30). These paths use immediate model travel and are not playtime estimates. An unattended 64-seed comparison still permits either winner; its median duration is 63 days versus 59 previously, with 11 battles in both medians. The change creates recovery windows and reduces repetition in the intervention fixture; it does not promise universally shorter wars.

Native checks: `npm run test:lizeem-world:desktop -- --campaign-journey-checks --test-size=1024x600` and the `--east-side --test-size=1280x720` variant passed the opening conversation, actual tower exit, horse handoff, both rides, all four combat phases, results, exact save/Continue and alternative-front tracking. Neither journey uses developer relocation, added troops, forced outcomes or day advancement for the first two battles. The test driver uses ordinary movement/combat inputs with scripted steering and active-time steps; it is not an uncoached human playtest. Each second ride, including ten seconds allowed for calling the horse, took about 52.2 active seconds and arrived on day 7 before Ovesos closes on day 8. The first ride reached the approach in about 28 seconds on day 1. Reading the letter for 30 simulated seconds did not consume campaign time.

The separate `--campaign-wait-checks` native fixture verifies the new wait control and save/reload with an authored post-battle checkpoint; it is not evidence of traversal. Both journey reports and the wait report contain no renderer errors. Visually checked the current-front letter, both strategic choices, and battle result at compact and standard desktop sizes. The battle result now keeps its title and Continue action visible while detailed casualties scroll. Artifacts are under `tests/artifacts/journey-{west,east}-*` and `campaign-wait.*`.

Focused checks cover both timing versions, replay, delayed versus existing attacks, both natural winners, immutable letters, hidden intelligence, bounded waiting, combat and force conservation. The longstanding held-battles scanner still flags the unchanged developer-fire-check encounter in src/main.js; this is not a clean full-repository test result. Concurrent Ambron work is excluded from this release.

Final staged-release verification passed 40 model checks, the isolated 879-module graph and the 22.6 MB web build. The export excluded all unrelated working changes. Source layout and staged whitespace checks also passed.

### Battle review, the Guild stable, and campaign memory (9 October 2026)

Campaign final assaults now use allies by default. The briefing describes the committed squad instead of asking the player to opt into an experiment. Existing saved solo assaults retain their style and losses; solo remains available in Combat Testing. This changes the default presentation, not combat damage or strategic force accounting. Withdrawal, re-entry and Reaper retry retain the same replay guarantees described above.

Encounter results now open a centered native modal. The scene, magic and campaign pause explicitly while the player reviews the result. Continue is focused immediately, supports Enter, and remains visible on compact and portrait screens while long reports scroll. Practice Retry and the solo/allied comparison remain in the modal. Escape keeps the result open rather than silently discarding it.

Existing aftermath survivors and Caricas sentries can be addressed with F. Their brief responses report the recorded battle and current ownership. Swept contact prevents Teresod or his horse from walking through them without trapping an overlapping older save; ghosts still pass through. No new strategic soldiers or population agents are created. The long-term character rule is that encountered people should offer a conversation or meaningful interaction. Temporary noninteractive development actors must remain an explicit limitation, not the intended final experience.

Bear now works beside a compact two-stall stable at his existing Guild Way position. The building, straw beds, racks, tack and trough share one static mesh. Ten local colliders leave the stalls, starting horse, mounting ground and tower departure route accessible. No stable management system or extra horses are added.

Taleth offers **Chronoscope / Review this campaign** after the opening briefing. The read-only projection reads the current save's event log: daily army orders and retreats, battlefield openings, Teresod's actual interventions, casualties, territorial outcomes, and the end of the war. It skips quiet days, offers event selection and 1x/2x/4x playback, and loads no exterior regions. The preceding-thirty-days introduction remains a separate option. Returning from campaign review cannot begin a campaign, advance time, enter the lookout or change a save. The current save retains its history through Continue; this is not yet an archive of overwritten campaigns or recordings of individual combat animations.

Either victor now establishes the **Lizeemi League**, with Minora as its seat. The present political map joins all five provinces under the victor's colors. West/east IDs and neutral Minora remain untouched inside the historical simulation and command log, preserving older saves and the original neutral wartime borders. This is the postwar settlement presentation; no new diplomacy simulation is implied. The winning side determines whether the Mayor or High Priest leads the Council of Three. Existing residents and both council members react differently to victory, defeat, grief and relief. Historical letters and earlier Chronoscope frames retain the two former league names and actual past borders.

Verification includes both winners and exact replay in `campaign-chronicle.test.js`, troop/contact and default-style checks in `soldier-contact.test.js`, and the existing world-war, council, correspondence, battle-story and stable suites. Native checks: `--battle-review-checks` (real default assault, native Enter/Tab, desktop/phone layouts, soldier conversations, foot/horse collision and save/reload), `--allied-campaign-checks` (withdrawal, re-entry and Reaper retry), `--combat-testing --assault-comparison-checks`, `--chronicle-checks`, and `--campaign-chronicle-checks` (current campaign, both victors, actual rendered colors, save isolation and no exterior loading). Screenshots live in the corresponding `tests/artifacts` files. Automated combat demonstrates stability and ordinary-input completion, not final human difficulty balance.

The requested first-person river and Ambron lookout redesign remains **design only**, pending the author's choice. The existing lookout already prepares the five scenario landscapes and a coarse horizon. A camera at the viewing edge would cheaply remove foreground bodies and pillars. The recommended distant-world approach is a lightweight terrain horizon plus a skyline derived from the upgraded Ambron data, loaded on demand without its NPCs, collision, wildlife or street props. Full neighboring regions would add construction time, memory and frame cost that a distant view does not need. Prewarming could hide some delay but would still use resources. Neither this camera change nor the distant-city implementation is included here, and concurrent Ambron construction is kept separate.

Final isolated-release verification: 91 focused model checks passed across ten files, the 888-module graph linked, and the 22.6 MB web export built successfully without concurrent Ambron files. All five native checks listed above passed without renderer errors. Visual inspection covered the stable and clear horse approach, centered results at desktop and phone sizes, soldier conversation, and both completed Chronoscope maps.


### First-person lookout and watchable campaigns (9 October 2026)

The author selected first-person viewing with simplified distant scenery, implementing the option discussed above. During the finale dialogue the camera sits at the outer viewing edge, ahead of the parapet and characters. The river country has a broad view; the east-facing page uses a narrower view of Ambron. A small, bounded camera sweep settles while the player reads. Closing the conversation restores the ordinary third-person camera and field of view.

The initial version extended the coarse terrain horizon and added two merged static meshes for woodland masses and an Ambron skyline. The prepared-landscape revision below replaces that runtime-built horizon. The skyline continues to read the upgraded capital layout, without constructing its inhabitants, collision, interiors or full city detail. No new playable region is enabled. Already loaded landscapes remain, with simplified scenery beyond them; the panorama is reused on later visits and hidden inside the chamber and in ordinary exploration.

The main menu and F8 tools now offer **Watch campaign / Support West Lizeem** and **Support East Lizeem**. Each starts a fresh temporary rehearsal. The driver meets Taleth, takes Bear's lesson and horse, rides through the real terrain, enters available battlefields for its chosen faction, fights interception and default allied assault phases, reads dispatches, and returns to Taleth for the lookout finale. Travel and combat use ordinary movement/collision and the existing encounter input policy. Quiet days advance through the existing simulation while the driver waits for another front. No health, casualties, allegiance outcomes or victory flags are patched.

A bounded, time-sliced route search avoids buildings, soldiers and other active battlefield enclosures. It can replan around an obstruction up to three times; failure stops safely and hands control to the player. P, movement input, or clicking a control stops autoplay. The stop button remains accessible over both dialogue and the native battle-result modal. Defeat transfers control to the existing Reaper choices. This is a testing driver for the fresh scenario, not general NPC navigation or a promise of flawless play after arbitrary developer edits.

Rehearsals use a storage adapter backed solely by a new in-memory Map. F5, automatic finale/death saves and takeover therefore cannot write the normal campaign slot. The pause screen identifies the temporary checkpoint and offers exit without a misleading persistent-save action. Returning to the menu removes the autoplay launch parameter; Continue opens the user's normal saved campaign. Starting a rehearsal discards unsaved work in the current run, as the F8 text explains.

Verification tools: `--campaign-autoplay-checks` and its `--east-side` variant watch full normal-input campaigns; `--autoplay-takeover-checks` sends native P during dialogue and checks memory saves and return to the public menu; `--lookout-checks` verifies camera restoration, five-region isolation, scenery budget, both views and save/Continue. Artifacts are under `tests/artifacts/autoplay-*` and `lookout-*`. The separate Ambron construction work is present in this workspace; this skyline deliberately consumes its upgraded shared layout.

Validation completed: both full native rehearsals fought four battles/eight encounter phases and concluded at Taleth's lookout, West on day 22 and East on day 18. Driver time was about 9 minutes 51 seconds and 9 minutes 21 seconds, excluding loading and route construction. Both reports had no frame errors. Native takeover/menu return and the dedicated lookout/save/doorway regression also passed. Twenty-nine focused model checks, source-layout and module-graph checks, and the 22.7 MB web build passed. Visually checked the public menu, result modal with the Stop control, and both first-person directions at desktop sizes.

The added city/woodland mesh budget was 25,812-26,292 triangles in two draw calls, including 198 simplified buildings. The first on-demand panorama preparation (coarse terrain plus scenery) measured roughly 6-9 seconds in these automated desktop runs, some running concurrently. Those measurements are not an FPS benchmark or a prediction for another device. Already loaded detailed scenario scenery still contributes its existing rendering cost; this pass adds no distant actors or ongoing scenery simulation.


### Autoplay recovery and unattended-war lookout preview (9 October 2026)

The reported tower-exit freeze was not reproduced during an uninterrupted real-time run. Its screenshot matches stopped autoplay: no watch control and a paused day-one campaign. Previously any key other than modifiers, or any canvas click, silently relinquished control after a short notice. Focus clicks and unrelated keys now leave the driver running; actual gameplay inputs still take control. A stopped rehearsal keeps a visible **Resume autoplay (P)** control over dialogue and result panels. P toggles pause/resume. Pending route searches and doorway/terrain preparation can safely restart after interruption; changing rooms manually may require starting a fresh rehearsal. A failed route retains its explanatory notice. Movement-stall detection now scales by elapsed time rather than frame count.

The main menu's Lizeemi War card and F8 tools offer **Unattended war / Taleth's lookout**. This creates the current default campaign, runs its ordinary simulation without hero interventions until a victor emerges, and opens the first-person river dialogue at the unconcluded lookout. The political summary and Ambron view follow through the existing dialogue controls. The current default seed ends with West Lizeem winning on day 22; the tool does not hard-code this winner. Its complete event history remains available in the Chronoscope. The preview uses the same memory-only rehearsal store as autoplay, so completion and F5 cannot overwrite the player's campaign. Returning to the main menu clears its launch parameter. Further regional summaries remain future work.

Validation: nine focused model checks cover exact equality with the untouched simulation, valid preview saves, route constraints, explicit resume, interrupted doorway/preparation, and storage isolation. Source layout, module graph and web export pass. The new native `--autoplay-realtime-checks` uses real animation frames (no time stepping, relocation or clock advancement) and reaches the first battle after Taleth, Bear and the horse; native focus-click and unrelated-key inputs do not stop it. `--autoplay-takeover-checks` verifies P during dialogue and the persistent resume control. `--lookout-preview-checks` verifies automatic river dialogue, nonintervention summary, Ambron view, conclusion and untouched persistent saves. These reports contain no renderer errors. The later focused review below also verifies both complete campaigns with real animation frames.

### Focused scenario review (9 October 2026)

The follow-up review runs the shipped animation loop through both complete autoplay allegiances, in addition to accelerated regression fixtures. The uninterrupted West rehearsal completed four battles/eight phases on day 22 in about 10 minutes 45 seconds; East completed four/eight on day 18 in about 10 minutes 9 seconds. Those wall times include route preparation during the observed run, not the initial cold launch. Both reached the first-person finale, concluded the campaign, restored ordinary control, and reported no frame errors. These are automated completion checks, not human difficulty ratings or FPS measurements.

Polish from the review: the watch control reports background-window pausing; native keyboard takeover runs before the result modal consumes input; Enter/Space on Stop or Resume activates exactly once; resuming after manually acknowledging an interception continues at the actual assault briefing. The watch control sits inside result/encounter layout instead of covering Continue on a short landscape screen, and the desktop watch status has its own row above/below the movement and interaction controls. The modal is checked at 1280x720, 1024x600, 390x844 and 844x390 using actual clickable-element bounds.

A broader deterministic simulation audit covered 64 alternate unattended seeds and 32 successful-intervention paths (16 seeds, both allegiances), with exact save/replay and campaign-history projection. All 32 intervention paths settled, with the chosen faction winning by day 24. Of the alternate unattended seeds, 63 settled by day 247; seed 58 was still unresolved at day 1000, after its last battle on day 175. Both sides retained forces but neither resumed an offensive against the strong garrisons. This is an outstanding strategic-AI stalemate limitation, not a runtime crash. The current public scenario and lookout shortcut use the unchanged default seed, which settles on day 22. No balance/version change was made to disguise the alternate-seed result.

The wider map/checkpoint audit passed 22 checks and exposed an unrelated existing atlas-coverage assertion: Selemis samples only 55% inside Selemi, below the test's 60% threshold. The unchanged legacy held-battles source scanner also continues to flag the developer-fire fixture in src/main.js. Neither issue belongs to the five-region scenario; this is not a claim that the whole repository test suite is clean. The additional full-world minimap build was stopped without a result after constructing unrelated world content; native scenario map coverage is the relevant verification here.

Native recovery verification also deliberately presses P during the actual cold tower-to-world transition, confirms the finished exterior stays paused, then resumes the real animation loop through the complete West campaign and lookout (three personally fought battles/six phases in that run; West settled on day 22). Arriving too late for a field correctly selects a later front rather than forcing that battle to remain open. Native result tests cover P, focused Enter/Space, manual Continue followed by Resume at the final-assault briefing, and four viewport layouts. The opening/horse/afterlife regression passed 41 assertions, including real enemy-AI defeat, all six Reaper paths and fresh main-menu Continue in limbo without exterior loading.

The broader native battlefield/story regression passed 37 reported checks: declined and mounted entry, partial withdrawal, casualty-preserving Save/Continue, both phases, immediate resolution, and result-specific council dialogue. A further 22 council checks passed, including separate rooms, preserved clock/save state, matching map/minimap footprints, physical exclusion after declining, and projectile damage/mana saving. The older Caricas developer autoplay had retained the version-6-only opening-date check; versions 6, 7 and 8 now all use day three, while version 5 retains its historic timing. Version-specific driver tests verify actual arrival and resolution dates. The older drivers now share modal-accessible Stop controls and keyboard takeover with full-campaign rehearsals.

Final native input checks also exercised the older Caricas driver inside the real final-result modal: its Stop control remains reachable, and P stops that active driver without inadvertently resuming a paused full-campaign driver. Recorded-history checks passed for an unfinished campaign, both winning factions, and the original prewar account, with unchanged saves/time and no exterior loading. The battlefield regression's former button-text assertion was updated to require the current centered result dialog and its Continue-to-campaign action; the following actual resolution assertions remain in place.

The final native allied-assault review passed: the stable and starting mount remain accessible, allies are the default, the result is centered and keyboard-accessible at four viewport sizes, and every existing survivor/sentry can converse and block foot/horse passage without trapping the player. Reviewed screenshots of the soldier dialogue, battlefield map, both first-person lookout directions and compact result layouts.

A 90-frame CPU sample identified redundant soldier-prompt DOM writes. The host now updates visibility/text only when they change. Repeating the chamber, Minora and guided-exploration samples reduced DOM mutations from 90/12/11 to 0/0/0. Final median CPU times were 4.4/6.1/8.6 ms; p95 values were 25.0/9.9/16.9 ms. These are short main-thread samples with variable rendering costs, not a demonstrated FPS gain or cross-device performance guarantee. Render geometry/draw-call counts stayed unchanged. Reports: tests/artifacts/session-performance-before-prompt-polish.json and session-performance-after.json.

The timed review began at 11:00 EDT on 9 October 2026 and continued through 12:00 EDT, followed by final documentation/build verification. Latest focused driver/lookout model run passed 21 tests; soldier-contact models passed three. Source layout, module graph and web export were verified after the code changes. No commit, push or deployment was performed in this review.


### Earlier lookout proxy experiment — superseded (9 October 2026)

This implementation was rejected after visual review. Its grouped forest masses, manually simplified cities and sampled terrain did not meet the requirement that the lookout resemble the actual loaded regions. The measurements below describe that superseded experiment, not the current scenery or a successful fidelity check. See the corrective implementation below.

The surrounding scenery is available throughout free rooftop exploration, independent of Taleth's dialogue. The first-person finale and the ordinary walking camera use the same geographically placed landscape. Telemonia's apparent missing plateau was caused by the coarse base mesh inheriting a rendering-only sink: that surface is normally covered by the region's detailed ground, which the five-region scenario does not load. The export now samples the shared unsunken authored surface instead. Minora and other already prepared nearby terrain keep their detailed scenery.

`src/dev/tools/lookout-landscape-bake.js` builds terrain tiles over an 8.448 km square centered on the tower, with finer samples for Telemonia's cliffs and Elagos's lake shores. It includes a simplified Kethorn, the upgraded Ambron footprint/palace/three fortresses, real river and lake surfaces, and grouped distant woodland. Geometry is prepared offline by `npm run build:lookout`; `npm run build:web` automatically checks the public-source fingerprint and refreshes it when needed. Only public source is used. The versioned manifest and compressed geometry are in `assets/lookout/`. The export is view scenery, not another playable region or a replacement for the full regional builders.

On first ascent, the prepared download/decompression overlaps the existing nearby Minora load. The runtime attaches finished buffers rather than sampling regional ground. Revisits reuse them, and leaving the lookout hides the entire backdrop. There are no distant NPCs, wildlife, collision or ongoing simulation. Atmospheric fade conceals the outer extent. Pigeons have deliberately not changed in this pass.

The final export contains 448,286 triangles in 275 cullable meshes: 3,291,324 compressed bytes and 12,447,912 bytes of geometry buffers. This costs memory and rendering while looking out; it is not free. Budget checks require under 5 MB compressed, 16 MB of geometry and 600,000 total triangles. `tests/lookout-landscape.test.js` checks finite/index-safe data and actual Telemonia surface heights. `--lookout-landscape-checks` captures both dialogue views and all four rooftop directions, walks between viewpoints with normal movement, checks save/Continue and both stair directions, and compares rendering with the backdrop temporarily hidden. It uses the isolated unattended preview and cannot overwrite the campaign save.

Final native verification passed all seven views/lifecycle stages with no renderer errors. Visually reviewed Telemonia's continuous plateau and cliff bands, the river corridor, the upgraded Ambron skyline/lakes/fortresses, and all four free-walking rooftop directions. The final local prepared-data fetch/decompression was 1,052 ms and mesh assembly 17 ms. The first-ascent measurement also included 108,578 ms of existing cold Minora/exterior preparation; that is not the landscape download time and this change does not resolve general world startup cost. Revisiting the lookout reused the same mesh build.

At 1280 x 720, the river view changed from 252 draw calls / 621,450 triangles without the prepared backdrop to 354 / 914,386 with it. The east view changed from 310 / 902,958 to 377 / 1,009,352. These include the already loaded nearby scene. CPU submission samples were noisy while a separate large regional fixture was running; they do not establish an FPS result. Geometry buffers total about 12.45 MB in CPU memory with corresponding GPU uploads as meshes become visible, excluding normal scene/material overhead. Reports and captures: `tests/artifacts/lookout-landscape.json` and `lookout-landscape-*.png`.

The four focused landscape/camera/preview model tests passed, as did source-layout checking, module linking, and the 26.1 MB web export. A broader Ambron/Telemonia model command was stopped during its expensive regional fixture construction before results were emitted; it is not counted as a pass. The final native test exercised real nearby terrain and both doorway directions instead. No commit, push or deployment was performed.

### Lookout scenery from the actual regional builders (9 October 2026)

The replacement exports static rendering data from the normal regional builders, including detailed ground, authored tree distributions, rivers, Telemonia/Kethorn, Pyra and both Pyros regions, and the upgraded Ambron with its surrounding infrastructure. The offline build prepares 76 surrounding regions. Their terrain and structures retain their actual world coordinates and shapes; there is no separate invented forest or city layout. Both free rooftop exploration and Taleth's first-person views use this same scenery. The five playable regions, campaign simulation, saves and deferred pigeon work are unchanged.

`npm run build:lookout` captures the normal world builders without constructing gameplay actors. It fingerprints their public dependency graph, caches the unoptimized scene locally, and writes the public version-2 asset under `assets/lookout/`. The web build checks this fingerprint and rebuilds stale scenery. Changes to dialogue alone do not require regional construction. An uncached offline regional capture took about four minutes locally; that construction runs during development/build, not while the player climbs the tower.

Optimization operates on the captured meshes. It removes objects smaller than 0.8 projected pixels and simplifies large static meshes with a 0.35-pixel geometric error target, calibrated at 720p and the narrowest lookout field of view. Tree primitives and surviving tree placements are preserved. Spatial batching combines compatible materials/geometry without relocating scenery. Quantized attributes and meshoptimizer compression reduce storage. These are distance approximations, not a promise of pixel identity at every display resolution. Distant shadow casting and unreadable sign textures are omitted. No distant NPCs, wildlife, collision or simulation are loaded.

The current asset has 3,890 spatial batches, 1,245 shared geometries and 11,628,139 total triangles across the complete surrounding scene; the camera frustum draws a subset. Compressed geometry is 23,801,477 bytes and the JSON manifest is about 4.13 MB before HTTP compression. This is a real first-ascent download/memory cost, larger than the rejected proxy. Preparation overlaps the existing Minora load and subsequent ascents reuse the decoded scene. It is hidden outside the lookout. Do not interpret compressed download size as GPU memory usage.

The build uses pinned `meshoptimizer` 1.3.0; only its vendored MIT-licensed decoder runs in the game. The shared page allows WebAssembly compilation through `wasm-unsafe-eval`, without enabling general `unsafe-eval` or loading a remote library. Test-only unoptimized geometry is written to `tests/artifacts/lookout-reference/`, excluded from publishing, and served only by the isolated native test host. Matched-view captures compare it with the optimized export. This reference preserves the same distant-rendering omissions described above; it is not a second live gameplay world.

Offline rebuilding requires Node 22.15 or newer and the development dependencies (`npm install`). A web deployment with current checked-in scenery only verifies the fingerprint and copies the asset; it does not need the encoder. Fingerprints normalize CRLF/LF so a Windows-generated asset remains current on a Linux deployment. Include both asset files whenever regional scenery changes.

Final verification passed five focused model tests and all eight native view/lifecycle stages at 1280x720, with no renderer errors. Reviewed paired optimized/reference images of the Ambron dialogue view, Telemonia, Pyra/Pyros and Ibenwood, along with the river and north/east rooftop views. Their sampled landscape pixels had mean channel differences of 0.57, 0.30, 0.13 and 0.17 respectively on a 0–255 scale. These samples exclude UI/central avatars and include some unchanged scenery; they support the visual inspection but do not establish universal pixel equivalence. The comparison exposed and corrected a batching defect that darkened instanced trees by enabling an absent vertex-color attribute; the asset validation now checks that condition.

The final local fetch/decompression took 8,841 ms, with 694 ms for assembly. First preparation including cold Minora/exterior loading took 33,083 ms. These are local test measurements, not expected internet download times. The river view submitted 1,060 draw calls / 2.56 million triangles, and the Ambron dialogue 1,414 / 3.08 million. Their sampled CPU submission means were 15.0 and 18.9 ms, versus 5.3 and 8.9 ms with the backdrop hidden. This fidelity has a measurable cost while on the lookout; it is not a demonstrated stable frame-rate guarantee. Exact spatial batching reduced the east-view draw calls from 2,587 before batching to 1,414. Normal campaign exploration does not render this backdrop.

The native test also verifies actual movement around the roof, unchanged five-region boundaries and settled campaign, no additional colliders, isolated saves, Continue restoration and both stair directions. Re-entering reuses the same prepared scene. Reports/captures: `tests/artifacts/lookout-landscape.json`, `lookout-landscape-*.png`, and `lookout-reference-*.png`. Source layout and module linking pass; the web export is 50.7 MB overall. No commit, push or deployment was performed in this corrective pass.


### Taleth's wider regional tour (9 October 2026)

The lookout now offers eight distinct first-person views, in this order: the Lizeem river country, Ambron, Ascarth and Eer, Telemonia and Legemum, Pyros, Ibenwood, Yunethre and Laketown, and the West Lotharn Mountains. The river view retains its additional card reviewing the player's recorded campaign, making nine dialogue cards in total. The six new regional briefings live in `src/content/regions/minora-frontier/lookout-tour.js` and use the author's supplied context: Ascarth's siege of Nylon; Telemonia's isolation, neutrality and enslavement of Legemum's people; Pyros's civil war; the wary elves beyond Ibenwood; Laketown's possible interest in joining the League; and Ambron's apparently ungarrisoned mountains with rumored outlaws. These descriptions do not simulate new wars, create agreements or open more playable regions.

All views retain the real tower elevation and point toward the existing regional geography. Their composition offsets keep the subject clear of the right-hand dialogue. The data are shared with Taleth's pointing animation. The six added views reuse the corrected actual-scene export; switching views does not fetch or build another region. Camera/dialogue definitions are separate from the exported horizon bounds, so editing the tour does not trigger an unnecessary scenery rebuild.

Previous view steps backward; closing and speaking with Taleth again resumes the current card during this session. Card position is not saved across a full reload. The final confirmation appears only on the West Lotharn view, preserves the existing campaign conclusion save, and allows replay afterward. The narration scrolls independently so the buttons stay accessible in small windows. Both autoplay choices use the same tour, with sixteen seconds for each new regional overview and ordinary Stop/takeover controls retained.

Verification commands: `node scripts/run-tests.cjs tests/lookout-panorama.test.js tests/lookout-landscape.test.js tests/lookout-preview.test.js tests/taleth-correspondence.test.js tests/war-autoplay.test.js`; `npm run test:lizeem-world:desktop -- --lookout-tour-checks --test-size=1280x720`; and the existing `--campaign-autoplay-checks`. The isolated tour check captures every view, checks backward navigation/close/resume, completion and Save/Continue/replay, and confirms that the scenery instance and recorded campaign are unchanged throughout. It also checks button visibility and hit targets at 1024x600 and 390x844. Reports and images are under `tests/artifacts/lookout-tour*`.

Final tour verification passed 20 focused model tests, all 13 native view/navigation/layout/completion stages, and the full accelerated West autoplay through four battles, eight combat phases and every tour card, with no game-frame errors. This autoplay check advances the ordinary driver through test steps; it is not a separate real-time human playthrough. Both faction outcomes are covered by the dialogue/model checks; the full East autoplay was not repeated for this tour-only extension. Visually reviewed all eight compositions and both compact layouts; adjusted the regional camera offsets after the first captures showed the dialogue obscuring parts of Pyra and Telemonia.

The six new views add no bytes to the scenery geometry asset (its SHA-256 remains `A5E70875F3D4BB0C5BE72C57BF87B0A7F72B1AB90040E8C7A1009778C102CEA0`). With Minora already prepared by the full rehearsal, the lookout's local fetch/decompression took 312 ms and assembly 752 ms, for 1,083 ms of ascent preparation. This differs from the cold preview measurement above and does not predict network or first-draw costs. West Lotharn is the most demanding new composition: about 1,481 draw calls and 6.35 million submitted triangles, with a sampled CPU frame around 42 ms. The actual mountains retain a visible rendering cost; this pass does not claim a stable frame rate on every device. The final web export and source checks pass. Pigeons and the five-region scenario's simulation remain outside this extension.


### Optional finale, living loft and postwar Minora (9 October 2026)

The personal campaign now concludes after the two Lizeem river cards: the state of the river country and the player's recorded impact on Minora's council. The explicit completion action saves the existing conclusion flag at that point. The subsequent menu offers free lookout exploration, the recorded-campaign Chronoscope, and an optional seven-view tour from Ambron through West Lotharn. Skipping the tour does not leave the chapter unfinished. Closing an optional view preserves its position within the current session; a fresh concluded session opens the activity menu. Both watchable campaign drivers acknowledge this conclusion before choosing to continue the tour.

The loft contains exactly three living rock doves, using the existing courier model at a smaller scale with folded resting wings and articulated head movements. They peck, turn and make staggered short flights returning to their own perches. The authored flight arc passes between the west pillars above the parapet. F near a perched bird opens observation, grain from the loft tray, a short release flight, and the existing Taleth dispatch archive. An observed bird remains on its perch until released; feeding temporarily delays release, and only one bird flies at a time. This is local presentation, with no flock population, pathfinding or new birding skill. Only the occupied lookout updates the birds, and the three models are disposed with the room. No pigeon state is added to saves.

The existing Mayor, High Priest and six Minora residents retain their winner-dependent greetings and now offer postwar intentions and memories of the player's last actual resolved intervention. A nonintervention campaign is explicitly recognized; withdrawing does not manufacture a heroic victory. The added lines express personal intentions, not reconstruction quests or simulated economic actions. Bear has a returning-rider greeting after the settlement and can repeat his riding lesson without granting another horse. His postwar lesson omits obsolete instructions about the first battle. These conversations read campaign history without mutating armies, borders or outcomes.

Verification is provided by `tests/lookout-pigeons.test.js`, `tests/postwar-conversations.test.js`, and the existing stable, correspondence, autoplay, panorama and preview suites. The native `--lookout-life-checks` run uses the isolated unattended preview to test completion before touring, Save/Continue, pigeons feeding/flying/returning, dispatch access, dormant loft updates after descent, both doorways, Bear and all eight council/resident conversations. `--lookout-tour-checks` tests every retained panorama, skipping and revisiting the tour, saved completion and compact controls. Screenshots and JSON reports are under `tests/artifacts/lookout-life*` and `lookout-tour*`.


The focused model runs passed 31 checks across the pigeon, postwar dialogue, stable, correspondence, autoplay, panorama, preview and asset suites. The isolated native life check passed all nine interaction/lifecycle stages plus 1024x600 and 390x844 action hit-target checks, including returning from the Chronoscope to the completed-campaign menu. The native tour check passed all 13 panorama/navigation/layout/completion stages. Reviewed screenshots of the conclusion menu, pigeons, feeding/flight staging, compact pigeon controls, Bear, the council and resident conversations. Ordinary save storage remained untouched by the preview runs.

During web verification, the shared workspace's Ambron builders had newer geometry than the existing prepared asset. The automatic scenery build refreshed that export from the current public builders. The new asset has 3,890 batches, 1,245 geometries, 11,705,984 triangles and 23,978,368 compressed bytes (176,891 bytes more than the preceding export); the complete web output is 50.9 MB. Its source fingerprint is `52ddb2b35859952a9e007ee549b8ad74c075ff2f2281e94064e4b3a9ff2c0367`. This is a fidelity refresh, not a new landscape approximation or an optimization of West Lotharn's rendering cost. No benchmark improvement is claimed from the new local bird behavior.


The final accelerated West autoplay also passed: four battles, eight combat phases, the new chapter-complete menu and every optional overview, ending on day 22 with no game-frame errors. Its panorama fingerprint matches the refreshed asset, and the Ambron screenshot was visually inspected. This is an ordinary-driver test advanced through test frames, not an additional human playthrough or a new full East autoplay run. Both victor branches remain covered by the focused model tests. Source layout (1,566 modules and 6,738 references) and module linking (922 linked modules) passed, as did the final web export. No commit, push or deployment was performed in this pass.


### The completed campaign's wider chart (9 October 2026)

Completing the two river-review cards with Taleth now charts the countries covered by his optional tour. The map expands from five to twenty regions: the original playable five, Elagos (Ambron), Telemonia, Legemum, Northern and Southern Ascarth, Eer (Nylon), both Pyros regions, all five Ibenwood regions, Yunethre and West Lotharn. This is knowledge supplied by Taleth, not a visit, a secret portal reveal or a gameplay unlock. It works with either victor and is derived from the existing saved `tower.concluded` flag, including older completed saves. Restoring an earlier checkpoint restores the smaller chart. Turning off the developer reveal does not erase this supplied knowledge.

The Regions, Geopolitical and Stability layers share the expanded atlas boundary. The fit control becomes **Known regions**. Surrounding geography is labeled individually and marked as reference territory outside this scenario, rather than assigning it to a simulated faction or merging it into an unnamed area. The simulation and world loader still operate on the original five regions. No additional scenery is built by opening the chart.

The optional tour now has **six views**: Ambron; Telemonia, Ascarth and Eer together (including Legemum and the siege of Nylon); Pyros; Ibenwood; Yunethre; and West Lotharn. There are eight dialogue cards overall, including the two river-review cards. The combined southern panorama uses a wider field of view from the same real lookout and the same prepared geographic scenery. It introduces no second scene or additional asset load.

Verification: 42 focused model checks passed (chart completion/restore and atlas names, panorama bearings and lore, both faction finales, map geometry/discovery, and autoplay). The native tour passed all eight cards, backward/close/resume navigation, saved completion, two compact layouts and before/after map checks. A focused native rerun (`--lookout-tour-checks --chart-only`) verified the final twenty-region chart with developer reveal off, Save/Continue, all three map layers and surrounding-region inspection, without adding visits or modifying the recorded campaign. Both native runs reported no game-frame errors. Visually checked the combined southern panorama and the final expanded map. Source layout, module linking and whitespace checks passed. No scenery asset rebuild, commit, push or deployment was performed for this chart/dialogue change; independent Ambron work remains in the shared workspace.


The chart coverage was subsequently corrected to follow the public regional coverage of the actual prepared lookout landscape, rather than the countries individually named by the six tour cards. It now includes 76 regions, including Gala, Oves Desert, Nether Desert, Meneth, Vastos and Moros Plain, and fills the intervening terrain. The selection uses the same regional-cell radius as the scenery export, with a regression comparing it against the prepared scene manifest. This is Taleth's regional survey of the surrounding landscape, not a dynamic occlusion or line-of-sight calculation. Urubond and secret portal locations remain undisclosed. Completion and saved completion remain the trigger; only the same five regions are playable. The map expands its knowledge and presentation boundary without preparing any new world scenery.

The correction passed eleven focused model checks, source/module checks and the isolated native chart test at 1920x1080. The native test checked every prepared region against the revealed chart, all six reported omissions, Save/Continue, developer reveal off, all three map layers, and unchanged visited cells/campaign state. The expanded map screenshot was visually checked. The proposed Yunethre and other future story arcs were discussed separately and were not implemented by this correction.

### Planned continuation: Yunethre (9 October 2026)

The [Yunethre campaign design](../yunethre-campaign-design.md) now specifies the first diplomatic route from Taleth's commission through Laketown, the Centaur Camp and Canerd to a verified withdrawal, accession and Minora's response. It preserves both war outcomes and keeps the optional lookout tour separate from mission eligibility. The design calls for bounded continuation access and separate membership, sovereignty and treaty records; it does not expand the current five-region runtime or implement the new quest. Military defense of the centaurs and allegiance to Celder follow after a complete diplomatic playthrough is working.

### Lizeemi War handoff and completion pass (10 October 2026)

The current implementation pass stays within the Lizeemi War; Yunethre remains the planned continuation. A manually acknowledged final-assault result could strand paused autoplay: its saved step still expected the skirmish screen after Continue had returned the player to exploration. Resume now reads the recorded battle state and proceeds to Taleth's dispatch. The interception handoff still resumes at the rally briefing, and leaving after interception can resume through battlefield selection. This does not replay a result command, alter casualties, or count the same acknowledged battle twice. A separate invalid return destination in the campaign driver now uses the existing `council` destination for Taleth.

Completing Taleth's two-card review immediately replaces unfinished-campaign guidance with an explicit completed state and optional Minora/Chronoscope visits. The fulfilled return-to-Taleth marker is cleared before saving. Save/Continue derives the same advice from the existing conclusion flag; no save format changes are required. Taleth's chamber greeting also recognizes an already reviewed campaign. The live report and campaign-map summary replace the fulfilled summons with completion text; the original letter remains available in the archive. Historical pigeon dispatches, the victor, combat balance and the five playable regions are unchanged.

Verification in this pass covers 77 distinct focused model checks across campaign accounting, skirmish outcomes, battle boundaries, Reaper recovery, autoplay, pacing, correspondence and recorded history. The accelerated native East baseline completed four battles/eight phases on day 18; after the fixes, the full West rehearsal completed four/eight on day 22, including the saved conclusion and optional tour. These are ordinary-driver tests advanced through test frames, not new real-time human playthroughs or balance measurements. Native Enter/P checks exercised the final-result handoff for both allegiances, including repeated pause/resume without duplicate results; the final complete modal check ran on the East route. The independent older Caricas driver retains its own fresh battle fixture in that check.

The opening-horse/afterlife native run passed 41 assertions: briefing and locked tower exit, Bear and a single starting horse, mounted Save/Continue, actual AI-caused combat death, all six Reaper choices, exact retry/rewind accounting, ghost and undead restoration, and a fresh main-menu Continue into limbo. Those completed runs reported no game-frame errors. Reports and captures are in `tests/artifacts/autoplay-{west,east}*`, `autoplay-modal*`, `autoplay-final-handoff*`, and `afterlife-*`. Normal campaign saves were isolated from the native test profiles.

The final `--lookout-life-checks` run passed all nine lifecycle/interaction stages and both compact-layout checks, including immediate completed guidance, its live report and map summary, Save/Continue, the postwar chamber greeting, Bear, council/resident conversations and pigeons. Its report contains no game-frame errors. Visually reviewed the centered battle result, 844x390 modal controls, campaign-complete menu, final postwar report, Bear and resident dialogue, and Reaper choices before and after Continue. Source layout (1,581 modules / 6,800 references), module linking (935 modules), syntax and whitespace checks pass. No scenery rebuild, new regions, commit, push or deployment was performed in this pass.

### Minora–Caricas civilian corridor (10 October 2026)

Twelve additional civilians join the six Minora residents: Adapa at the market, Nepri at the storehouse, Rudiger at the barracks, Imhotep at the bridge, Melka on the Caricas road, Egeria and Consus in the grain court, Ilmarinen at his workshop, Vertumnus and Messor at the north fields, and Pomona and Nera at the eastern orchard. Ten use the existing regional cast's identities and appearance definitions; Melka and Nera are new. This is a bounded first population pass, not a rollout across all five provinces. Yunethre remains deferred.

Definitions and new conversations live in `lizeem-residents.js` and `corridor-conversations.js` under Minora's regional content. The exploration resident view constructs at most twelve rigs, incrementally, within eighty metres; it hides them beyond ninety-five and disposes distant rigs beyond 115. Distance scans run at four Hz and local animation at twelve Hz near the player or four Hz farther away. Short walking routes are checked against actual ground and collision before use. Work gestures reuse existing rigs with a few low-poly props. No full schedules, global pathfinding, economic agents or legacy farming quests are activated.

Every visible civilian supports F dialogue about work and the war. After settlement, dialogue recognizes the victor, the united Lizeemi League and recorded player participation. Conversations stop the speaker and read campaign history without modifying it. Ordinary walking and horse riding have physical contact with these actors; the campaign autoplay planner also accounts for them. The F8 civilian toggle remains available for direct comparison.

The three Caricas townspeople walk along authored routes to existing doorways during a local battle, disappear into shelter, and return after the battle. Arriving during fighting finds them already sheltered. Nearby farm workers stop their work while fighting continues. This uses the existing campaign engagement state and adds neither combatants nor saved civilian simulation. The toolsmith's initial shelter route was corrected after the real-terrain test caught a steep foundation edge.

Visual review found that the regional farmland scenery job excluded Caricas from its loading dependencies. The job now includes Caricas and filters farm roots by the enabled regions, so the bounded scenario gets its existing fields, orchard, sheds and paths. Feradom and Elagos farmland stay unloaded in this mode; no farming systems or additional regions are enabled.

The focused model run passed 38 checks covering population limits, repeated disposal, work-route obstruction, shelter and return, conversation state, both victor reactions, contact and autoplay. The isolated native population run exercised all eighteen speakers with F, three real shelter routes, walking and cantering contact, emergence after battle, repeated corridor travel and Save/Continue, with no game-frame errors. The real-time West opening rehearsal also reached its first fight through the ordinary briefing, doorway, Bear and mounted route. An earlier rehearsal failed while concurrent Mithala edits temporarily lacked `MITHALA_BANK_PASSAGES`; the current export and module graph pass, and a fresh rehearsal passed. This is an opening regression check, not a new complete campaign playthrough.

At the sampled Minora market viewpoint, civilians added 61 draw calls and 14,456 triangles. Alternating short on/off samples had overlapping walking and riding frame times; no consistent large slowdown was observed on this machine. These noisy samples are not a frame-rate guarantee for other hardware. The resident update was submillisecond in the samples, and repeated corridor visits returned to the same orchard geometry count rather than accumulating rigs. The hard cache limit is twelve; eight were simultaneously constructed in that travel sample.

The final placement run independently verified that exactly the five Caricas farms from the regional farmland builder were present, with none of that builder's Feradom or Elagos farms. Existing Minora farms remain separate. The new orchard setting and its conversation framing were visually checked; the town shelter transitions are verified by actor state and removal/restoration of contact targets. The final wide town screenshot is obstructed by a foreground house and is not evidence of a clear view of the court.

Reproduce the native checks with `node scripts/launch.cjs --exploration --world-war --smoke-test --population-checks`; add `--population-visual-only` for conversation/placement captures and shelter-state checks without repeating the performance samples. Reports and images are under `tests/artifacts/resident-population*`; the opening report is `tests/artifacts/autoplay-realtime.json`. A broader legacy farmland test was stopped after its full-world fixture ran for over five minutes without finishing; this pass does not claim a completed full-world regression suite. Source layout, module linking and whitespace checks pass. No commit, push or deployment was performed in this pass.


### Lookout loading isolation (10 October 2026)

The lookout now displays the complete prepared regional scenery, including Minora and its animated water, with the separate interactive rooftop in front of it. `tower-world.js` no longer calls `prepareExterior` on ascent or when continuing a rooftop save. The walkable city is prepared on first descent instead, and an exterior already loaded during the campaign is retained but hidden while on the roof. This avoids building terrain, collision and residents merely to look at the country. It does not remove the remaining cold loading cost when actually entering Minora.

The landscape still comes from the actual regional builders and the same screen-error-limited export. Council banners are drawn separately from the exported city so leadership remains current; legacy standards are excluded from the bake to prevent duplicate flags. Water clocks update independently of the ground-level world, and the rooftop keeps its own collision, Taleth and pigeons. Repeated visits reuse the same geometry. Compressed-attribute unpacking also avoids a temporary typed-array allocation for every padded vertex row.

`node scripts/launch.cjs --exploration --world-war --smoke-test --lookout-performance-checks` profiles startup and four real viewpoints. Add `--profile-before` to write separate baseline artifacts. Reports distinguish CPU rendering submission from actual animation-frame intervals; a reduced draw count is not a promise of a steady frame rate. The isolated preview uses temporary saves. `--lookout-life-checks` additionally checks cold rooftop entry, descent into the real city, residents, and return to the cached lookout with the exterior already loaded. Asset/loader regressions are in `tests/lookout-landscape.test.js`.


### Campaign guidance and civilian follow-up (10 October 2026)

The exploration HUD now separates the current objective from the latest dispatch. `campaign-guidance.js` derives a short objective from the existing live opportunity, horse handoff, recovery and conclusion state. `campaign-guidance-view.js` presents its stage, title, brief directions, one primary action and a short clock hint. Full historical reports, battle facts, Taleth's letter, strategic alternatives and optional council visits remain behind a disclosure. Dismissing a dispatch does not dismiss the live objective. Saving still uses the existing report-read watermark and navigation fields; the presentation introduces no save format or simulation changes.

After either side wins, the card names the victor and directs the player to Taleth at the Wizard Guild lookout. Completing the review changes the card to a completed campaign with optional visits. The return marker now names Taleth's Guild rather than the entire council, with Mayor and High Priest visits under an explicitly optional disclosure. Fresh battlefield tracking describes entering the marked boundary rather than approaching a gold flag. Recovery advice states when the player can fight again. The letter modal keeps its historical text, pauses the campaign, skips hidden controls in keyboard navigation, and returns focus on close.

The same eighteen civilians in Minora and Caricas now offer a nearby-news topic: local roads, approaching forces, active fighting, the latest local resolution, and eventual settlement. These are dialogue-time reads of the existing campaign, not new simulation agents, quests or map discoveries. Conversations gently turn stationary workers toward the speaker; after goodbye they return to their work heading. Work gestures ease out and back in. The twelve-rig cache and distance/update budgets are unchanged. Yunethre and population expansion to the other three war regions remain deferred.


Verification for the follow-up: 34 focused model checks passed, including live objective stages, recovery, either victor, unknown-front filtering, local news, conversation heading/resumption, bounded population, both campaign histories and existing battle/council behavior. The native clarity check passed disclosure, dismissal with a retained objective, primary battlefield tracking without enlistment, Save/Continue, the full-letter modal, and ordinary F conversation. Layout checks passed at 1424x921, 1024x600, 390x844 and 844x390; an initial phone overflow was corrected. Visually reviewed the compact opening/finale cards, the civilian conversation, both phone orientations, and the Caricas grain court. The shelter capture contains the battle-choice overlay, so shelter disappearance/emergence is evidenced by the actor/contact checks rather than that image.

The complete accelerated native West and East rehearsals each completed four battles/eight phases, returning through Taleth's review and the optional tour; West ended on day 22 and East on day 18. The driver used ordinary gameplay actions with test-frame advancement, not fresh real-time human balance tests. Both produced passing final reports with empty renderer-error lists, but each process subsequently emitted Chromium's `GPU state invalid after WaitForGetOffsetInRange` while closing and the shell returned nonzero. This shutdown warning is retained in `guidance-west-autoplay.log` and `guidance-east-autoplay.log`; these are completed gameplay checks, not clean process-exit claims. The separate native guidance and population suites exited zero.

The final population suite checked all eighteen speakers' work, war and nearby-news topics, stopped conversations, physical walking/cantering contact, three real shelter routes and post-battle emergence, repeated travel, and save reconstruction. After the autoplay processes had closed, alternating population on/off samples added 61 draw calls and 14,456 triangles at the Minora market viewpoint. Stationary frame medians were 23.0?24.5 ms with civilians versus 20.9?21.9 ms without. Walking medians were 24.6?26.0 ms with them versus 24.6?24.9 ms without; riding samples overlapped. Sampled civilian update medians were 0.1?0.2 ms. These short local measurements establish a modest cost, not a hardware-wide frame-rate guarantee. The cache peaked at eight rigs in the repeated corridor route, below its twelve-rig cap; repeated orchard visits returned to the same geometry count.

Reproduce the clarity check with `node scripts/launch.cjs --exploration --world-war --smoke-test --guidance-clarity-checks`, the full route with `--campaign-autoplay-checks` (add `--east-side` for East), and the population run with `--population-checks`. Artifacts include `guidance-clarity.json`, `guidance-*.png`, `autoplay-west.json`, `autoplay-east.json` and `resident-population-checks.json` under `tests/artifacts/`. Source layout, module linking and whitespace checks pass. No commit, push or deployment was requested or performed for this follow-up.

Final local comparison at 1424 x 921: initial preview readiness fell from 90,431 ms to 9,988 ms; prepared-scene loading/assembly fell from 75,963 ms including exterior preparation to 1,010 ms without it. Sampled JavaScript heap fell from about 377 MB to 230 MB (not total process/GPU memory). River-view draw calls fell from 978 to 838, Ambron from 1,340 to 1,125, Pyra from 549 to 525 and north from 1,394 to 1,255. The final frame-interval samples corresponded to roughly 28/27/32/18 fps respectively, versus 20/11/21/10 in the baseline. Timing varied between runs; these are local observations, not a stable frame-rate guarantee. North still submits about six million triangles and remains expensive.

The rebuilt asset includes the latest city revisions: 3,891 batches, 11,758,780 total triangles and 24,266,459 compressed bytes. Its public-source fingerprint matches. All 20 focused model checks, source layout and module linking passed. Native checks passed the ten lifecycle/interaction stages and two compact layouts, plus the four final performance views with no game-frame errors. Visually checked the river/Colossus, Ambron and Pyra captures. Electron printed a GPU shutdown warning after the successful checks; the final direct native process exited with code 0. The source/assets remain local; no commit, push or deployment was performed.


### Corris Weatherwise and the river review (10 October 2026)

Corris Weatherwise is Taleth’s talking raven envoy in the isolated war scenario. The single low-poly actor is present in the guild chamber and lookout, and lands on clear, dry ground outside active battle areas after new campaign reports. Normal F interaction opens a short consequence and live next step; optional topics retain strategic detail and earlier reports. He waits, can be called closer, and has character contact on foot and horseback. Autoplay includes him among its route obstacles. Ordinary lookout pigeons retain their existing living-bird interactions.

`corris-state.js` keeps acknowledgment separate from report-card dismissal and the simulation. The optional `corris` checkpoint field restores pending news and accepts older saves without that field. Escape / Talk later leaves a message pending; Understood records acknowledgment. The map opens the report archive without moving time or treating reading as a conversation. No manuscript text or source assets enter the runtime.

The first-person river review uses a narrower, downward-facing view from the same real tower elevation. The southern-country panorama retains its wider field of view; neither change loads additional regions. Run `node scripts/run-tests.cjs tests/corris-weatherwise.test.js tests/taleth-correspondence.test.js tests/lookout-panorama.test.js` and `node scripts/launch.cjs --exploration --world-war --smoke-test --corris-checks` for the focused checks and captured views.

### Surrounding political chart (10 October 2026)

`content/scenarios/lizeem-surroundings.js` records the author's neighboring factions, territorial control, disputed claims and relationships. `worldWarProjection()` exposes this as a separate read-only `reference` object. Its live `regions` and `factions` still contain only the five-region Lizeem campaign. No outside recruitment, marching, diplomacy, conquest or 3D-region loading is enabled. Completed lookout knowledge determines what appears; older saves pick up the new chart without a simulation migration. The original adventure's faction roster is unchanged.

Ambron has nine secure provinces and disputed claims to both Lotharn ranges. Feradom remains a separately colored vassal duchy. Izol controls both Izols and South/West Suval. The Nylon siege leaves Eer under Nylon; the Pyrosi civil war divides regional control and explicitly leaves Pyra contested. Selemis uses the established city spelling while its atlas island key remains `Selemi`. Telemonia's military oligarchy is a provisional description, not a finalized constitution. Unspecified territory and Iscare's unspecified claimants stay unspecified.

Yunethre's centaurs have a separate selectable encampment marker and no territorial ownership. The presence record carries a region and a local anchor; a future authored relocation can move that record without recoloring the region. It has no invented migration schedule, army strength, conquest rules, permanent capital, or resource simulation. Future nomad design should settle camp relocation, access agreements and conflict eligibility before connecting it to the campaign clock. Lake Town remains the council-governed territorial faction.

Check with `node scripts/run-tests.cjs tests/lizeem-surroundings.test.js tests/campaign-map.test.js tests/lookout-chart.test.js`. For a save-free visual and discovery check, run `node scripts/launch.cjs --exploration --world-war --smoke-test --lookout-preview-checks --surrounding-map-checks`; captures and results go under `tests/artifacts/surrounding-map-*`.

Verification: the focused model suites, source layout and module-link checks pass. Native Corris checks covered tower introduction, safe arrival, waiting, physical contact, conversation pause, postponed/acknowledged save restoration, archives and portrait/landscape phone layouts. Native map checks covered pre-conclusion hiding, post-conclusion saved chart knowledge, faction assignments, disputed hatching, the centaur inspector and stability/region view switching without campaign mutation. Visually inspected the river framing, Corris conversation layouts, the full political chart and the enlarged Yunethre marker. West autoplay completed four battles/eight phases and the full lookout tour on day 22 with no game-frame errors. Native runs recorded passing results before Electron emitted its existing GPU teardown warning and returned nonzero; this is not a clean process-exit claim. Changes remain local, without a commit or push.

### Raven messenger and bird scale (10 October 2026)

Corris is now a common raven who speaks, retaining his human-language name and existing report receipts. His low-poly body is about 62 cm bill-to-tail, with a 117 cm extended wingspan, folded wings, a wedge tail and an animated bill. Talking frames the bird at ground level; portrait screens reserve the upper view for him. Ground contact uses a bird-sized footprint. The normal camera returns after conversation. No clothes, humanoid limbs or new campaign mechanics.

The lookout rock doves are about 33 cm long. Birding species, woodland thrushes and regional waterbirds/raptors now use adult species dimensions rather than enlarged display sizes. Body size and extended wingspan are calibrated separately so long-winged birds retain plausible flight proportions. Existing fictional bird body sizes remain authored; the bone-bird uses its authored 2.5 m span. Populations, streaming limits, AI and observation interactions remain in place.

Verification: `tests/bird-scale.test.js` measures rendered geometry, wing attachment and folded-wing symmetry. Existing bird behavior and messenger save tests cover the unchanged interaction paths. Native `--corris-checks` covers arrival, conversation, save/Continue, portrait/landscape dialogue and lookout pigeons; append `--corris-model-only` for the short chamber/phone visual check.

### Opening champion duel (10 October 2026)

Fresh `lizeem-world-v9` campaigns offer **Challenge their champion** in the first Caricas battlefield, alongside the ordinary reinforcement interception. The player chooses a league, hears the opposing captain's cause, and confirms before committing. Captain Serevan Dain of Nesdor represents East; Captain Meret Voss of Ovesos represents West. Both are new scenario characters. The challenge is optional, replaces interception, and can be accepted once per campaign. Backing out before acceptance costs nothing. Starting the ordinary interception commits that battle to its original opening.

The duel uses one officer in the existing battlefield, with normal staff, dodge, targeting and fireball controls. The captain uses thrust, sweep and a slower overhead strike with a distinct pose, warning and recovery window. Fireball damages the captain without cancelling a committed attack. The captain yields alive at zero resolve. Victory makes two final-assault guards fall back without killing them or deducting strategic troops; allied support is retained. Yielding or reaching the two-minute limit forfeits that advantage but leaves the assault available. Death uses the existing Reaper, whose retry restores the same duel and whose before-choice option restores the uncommitted invitation.

`simulation/champion-duel.js` owns eligibility and result accounting; the campaign records the choice and outcome as replayable commands. The opening victory leads to three guards versus three allied soldiers plus Teresod, and the final assault still determines the field. Corris, council consequence text and the Chronoscope retain the recorded duel result. Existing v3-v8 saves retain their original rules: start a fresh Lizeemi War to test this option. Ordinary campaign autoplay continues to choose interception.

Focused checks: `node scripts/run-tests.cjs tests/champion-duel.test.js tests/afterlife.test.js tests/campaign-chronicle.test.js`. The rendered sequence is `node scripts/launch.cjs --exploration --world-war --smoke-test --champion-duel-checks`, with isolated saves and captures in `tests/artifacts/champion-duel-*`. It covers opening choices, both captains, normal-input victory, the overhead warning, the allied follow-up, save restoration, surrender, actual combat death, repeated retry and return to the original decision. It also checks compact layouts and the existing allied-assault Reaper path.

Verification: all eight duel model tests and focused combat/campaign/recovery regressions passed. The final native run passed all twelve stages, reported no renderer errors, and exited zero. Visually reviewed the choice and challenge panels, champion name and attack cue, overhead pose, central victory report, Reaper dialogue and compact choice layout. A repeated-death check caught the restored battlefield reopening its next entry prompt before death resolution; closing an encounter now suppresses automatic re-entry until the player leaves and returns. Source layout, module linking and whitespace checks pass. The automated driver used ordinary inputs with accelerated test frames; this verifies function, not human difficulty balance. Changes remain local without a commit or push.

### Caricas market-town polish (11 October 2026)

The existing eight-building settlement now uses limewash and warm stone, muted clay/slate roofs, street-facing windows and shutters, timber doors, shallow awnings, lantern fittings and flower boxes. The granary has a louvred cupola and grain emblem. Its court has terrain-following paving, two striped produce stalls, four planted lime trees and a covered well. The main street and combat staging remain open. These are static details in `content/regions/minora-frontier/caricas-town-detail.js`, appended to the existing building and ground batches. There are no additional actors, simulation updates, textures or dynamic lights. The three ownership standards still recolor independently.

Geometry rises from 9,720 to 27,256 triangles (about 1.8 MiB more attribute data), while remaining two meshes. Five small prop colliders protect the tree planters and well; the eight original building bounds and map records remain intact. Construction continues to yield, with at most 128 terrain queries between steps. The regression test caps the town at 30,000 triangles and checks road, guard, civilian shelter and central combat clearance.

The isolated native comparison at 1424x921 used identical approach, court, granary and overview cameras. Draw calls were unchanged at 211/314/204/265. Median frame intervals changed from 16.7/17.8/16.9/16.5 ms to 16.6/16.5/16.6/16.6 ms; p95 intervals were 19.0/22.7/23.5/21.7 ms before and 18.9/19.7/19.0/18.2 ms after. Exterior preparation was 28.1 seconds before and 28.0 after. These short local samples show no significant regression; they are not a cross-device FPS guarantee.

Reproduce the matched captures and navigation checks with `node scripts/launch.cjs --exploration --world-war --smoke-test --caricas-polish-checks`; use `--profile-before` on the baseline revision. Results are `tests/artifacts/caricas-before.json` and `caricas-after.json`, alongside four paired screenshots. Visually checked all four views and refined the pavement after spotting ground protrusions. Native walking/riding and prop collision passed; all eighteen civilian conversations, the three shelter/return routes, the opening duel, allied assault, Save/Continue and Reaper recovery also passed. The prepared lookout asset is regenerated from the same regional builders so its Caricas architecture stays consistent.

The long-distance visual pass also replaced the old full-depth corner-timber slabs with four real posts per building: the hidden slabs were nearly coplanar with the plaster and caused broad striped walls at tower-view distances. The offline optimizer retains the town's small architecture batch exactly to protect thin shutters and trim. The rebuilt panorama keeps 3,891 batches and adds 69,439 compressed bytes over the previous asset. The river capture was visually rechecked after this correction; the walls are clean. All five scenery/clearance tests and all five prepared-landscape tests pass, including exact preservation of the layered architecture and a current public-source fingerprint. The native panorama assertions reported no frame errors; one PowerShell-hosted run emitted Electron's existing GPU shutdown warning after writing the successful results.
The final direct native run exited with code 0 and no renderer-frame errors; the GPU message occurs during shutdown after successful assertions and capture.

### Lizeem countryside and northern terrain follow-up (11 October 2026)

Caricas now has a continuous mitered street that widens into its grain court, with matching paving and connected door approaches. The surface is clipped to the triangles of the displayed terrain instead of sampling only the analytic heightfield: this removes the exposed ground that made the earlier road appear broken. The same draping is used for Nethereum, Nesdor, Ovesos and Isareos country paths and yards, and Yunethre's connected tracks. Footing on these routes follows the displayed surface; existing bridge, promenade, levee and canal supports retain priority.

Twenty-one static fields extend the five Lizeem regions' existing agriculture, with two smaller settled plots at Laketown. Nethereum and Isareos emphasize pasture and hay, Caricas and Nesdor cereal strips and rotation, and Ovesos irrigated grain. Their ground, sparse crop blades and broken boundary hedges are merged into one unshadowed batch per region: six batches altogether. They add no crop simulation, NPCs, textures or save state. The existing playable farm beds remain intact. Field placement excludes roads, water, authored buildings and working farm infrastructure. The review also cleared random trees from Nesdor's lanes and authored coppice.

The main Lizeem is now approximately 32–72 metres wide, while tributaries retain their smaller widths. Authored local constrictions preserve the Velsorten intake and Enbilulu's original bank-side position; the lower reach narrows to the existing 38-metre harbor channel at Nylon. Water, terrain, map widths and coarse river bounds use the same profile. Walking and riding across the White Bridge, ordinary/developer horse swimming, returning to dry land and safe dismounts passed in the native game.

Yunethre retains its existing town, centaur camp, lake approach, wildlife and quest scope. Its common has joined paths, buildings face the common, and modest window/eave details use the existing architecture batch. Meneth, Vastos and West Lotharn are terrain-only refinements: meadow/woodland variation follows Meneth's ridges, Vastos distinguishes dry heath from damp hollows and mineral ground, and Lotharn gains varied limestone, scree, weathering and lichen. These last three changes bake vertex colours into existing ground and add no terrain triangles, rendering batches, characters or infrastructure.

Focused model checks cover draped surfaces, field budgets, river hierarchy, town and farm clearance, Yunethre routes/wildlife, Minora and Nylon crossings, and West Lotharn's shared ground loading. Native captures are under `tests/artifacts/countryside-after-*` and `frontier-after-*`; repeat with `--countryside-polish-checks` in world-war mode or `--frontier-terrain-checks` in exploration mode. The broad farm audit also found two Ambron allotment-clearance failures outside this regional pass; those remain open rather than being hidden by narrowing assertions.

The final five countryside views used 171/228/125/396/211 draw calls versus 170/226/124/402/210 in the earlier captures. Current median frame intervals were 18.5/19.1/17.7/23.4/19.2 ms, with exterior preparation at 29.4 seconds on this PC. Earlier timing samples overlapped other verification work, so they are not a controlled timing comparison. Draw counts and static batch budgets provide the firmer evidence that this pass adds little rendering work. General exploration still has substantial existing region-preparation costs; this is visual polish, not a loading-system optimization.

The tower's prepared landscape was rebuilt from the updated regional builders. It contains 3,890 batches and 11,772,324 triangles; the compressed geometry is 24,437,210 bytes, about 101 KB larger than before this follow-up. It continues to load independently of the walkable surrounding world.

Final native frontier checks passed at Laketown, the centaur camp, Meneth, Vastos and West Lotharn, including player-camera and aerial captures of the last three. Player-camera medians were 18.5/20.6/19.3 ms respectively. The high Lotharn aerial camera still measured 67.7 ms (the earlier baseline was approximately 66 ms), despite identical draw and triangle counts; that broader exploration-view bottleneck remains. The opening champion duel, default allied assault, withdrawal, Save/Continue, death and retry passed on the revised Caricas surface. The prepared-landscape model tests and its public-source fingerprint also passed, as did source-layout and module-link checks.

The final isolated lookout run opened in 7.84 seconds, exited successfully and recorded no renderer-frame errors. River, Ambron and northern views were visually inspected after rebuilding: the widened Lizeem, farms and changed ground palettes are present in the real regional scenery. River/Ambron/Pyra medians were 33.3 ms; the dense northern view remains heavier at 66.6 ms. These are local current measurements, not claims of a performance improvement. Electron emitted its known GPU-process shutdown warning after the successful capture and assertions.

### Five-region settlement finish and battle dome (11 October 2026)

The five-region review uses Minora and Caricas as the reference finish. Nethereum's reed-roof houses now have readable timber frames, shutters, herb boxes, sheltered doors and finished gables. Nesdor's farmsteads and Counted Water inn gain framed windows, roof details, door fittings and an edged common. Ovesos keeps its limewash and working watermills, with shaded doorways, teal shutters, masonry corners and a coordinated square. Isareos's cheese-maker hamlet retains drystone, natural timber and turf-pinned thatch with clearer openings and detailing. These additions reuse each settlement's existing static scenery batches. Building footprints, residents, farm interactions, roads and navigation colliders are unchanged.

`lizeem-settlement-detail.js` supplies the shared construction details and regional palettes. Recessed glass and small fittings omit buried faces; projecting frames, sills and roof timbers retain depth. The common surfaces follow the displayed terrain and remain clear for riding and combat. The lookout exporter preserves the layered architectural batches so simplification cannot move their closely spaced surfaces through one another.

The active battlefield exclusion veil is now a closed charcoal dome, with a 70-metre ground radius and a crown at least 42 metres above its centre. Its rim follows loaded ground or water. The single outward-facing transparent mesh avoids doubled opacity; the ground ribbon and gold pennants still identify the opt-in boundary. It uses 2,208 triangles and the same four rendering objects as the former open wall. Combat hides the entire boundary display, and resolving a battle removes it. Entry, refusal and travel constraints retain the existing rules.

Repeat native visual checks with `--settlement-quality-checks` (add `--profile-before` for a baseline) and `--battlefield-checks`, using exploration/world-war smoke-test mode. Comparable ground and overview captures and rendering counts are written under `tests/artifacts/settlement-*`; the dome flight and ground captures are `battlefield-dome-flight.png` and `battlefield-dome-ground.png`.

The final ten settlement captures retained identical draw counts. Triangle increases were 0% in the two reference views, 0.50–1.31% in Nethereum, 0.78–0.98% in Nesdor, 1.32–1.96% in Ovesos, and 0.61% in the Isareos hamlet. No additional textures, dynamic lights or scenery-update loops were introduced. Nethereum remains below its existing 60,000-vertex fixture budget after removing hidden faces. Local timing varied with other PC activity, so these counts are stronger evidence than the measured frame intervals for estimating cost.

All four affected farm/hamlet model suites pass, including actor stands, road clearance, working infrastructure and scenery batch budgets. The dome tests check sloping ground, rays hitting the closed roof, a bounded triangle count, geometry reuse, hiding during combat and removal at resolution. The final native battlefield run passed all 26 checks: dragon view, walking/riding entry, refusal, re-entry, partial withdrawal, Save/Continue, both combat phases and immediate resolution, with no renderer errors and exit code zero. The rehearsal now restores test-window focus after frame yields; an earlier run had paused when another window stole focus. This changes only the automated check, not combat behavior.

The rebuilt lookout keeps 3,890 spatial batches, with 11,808,502 triangles and 24,644,313 compressed geometry bytes: 36,178 triangles and 207,103 bytes above the previous prepared landscape. Its fingerprint matches the current public regional sources.

The five prepared-landscape model tests pass. The final native panorama run opened in 11.2 seconds, exited zero and recorded no renderer errors; the river capture was visually inspected for the updated rural buildings and clean architecture. River/Pyra frame medians were about 33 ms, Ambron 50 ms and the dense northern view 83 ms on this run. These distant views remain an existing performance limitation, separate from the small settlement-detail increase. Source layout, module linking and whitespace checks also pass. This revision is local; no commit or push was made.

### Irregular Lizeem banks and named lookout actions (11 October 2026)

The Lizeem now softens the repeated atlas hex bends into unequal sweeps, with smoothly varying broad and narrow reaches. This reshapes the actual shared river course before terrain, water, scenery and local-map construction; the lookout uses a fresh export of that same world. The existing atlas corridor, White Bridge, four tributary connections, Velsorten intake and warden's bank are retained. Tributaries keep their smaller courses and widths, and Nylon's harbor retains its established channel. The shape is calculated once during construction, with no new per-frame simulation or effects.

Taleth's forward actions name the next subject or country: reviewing the player's impact, beginning the tour toward Ambron, then the southern countries, Pyros, Ibenwood, Yunethre/Laketown and West Lotharn. Campaign completion and finishing the optional tour remain distinct actions. Dialogue, ordering and saved campaign state are unchanged by this copy pass.

All 39 focused model checks pass across river continuity/confluences, regional polish, Ovesos's working canal, Minora's crossings, panorama views and the prepared landscape. Native countryside checks pass for walking/riding across the White Bridge, horse swimming, safe dismounts and settlement navigation. The regenerated landscape fingerprint matches its sources. It contains 3,891 batches, 1,249 geometry resources and 11,810,342 triangles; compressed geometry is 24,649,388 bytes. Against the preceding revision this adds one batch, 1,840 triangles (about 0.016%) and 5,075 download bytes, with no increase in geometry-resource count.

Visually checked the closer river bank, Taleth's first-person river panorama and the Ambron dialogue's named next action. Comparable tower captures are `tests/artifacts/lizeem-river-before.png` and `tests/artifacts/lookout-tour-river.png`; the updated Ambron action is visible in `tests/artifacts/lookout-tour-ambron.png`.

The complete native lookout tour also passes with no recorded renderer/frame errors and exit code 0: all destination labels, forward/back navigation, interruption/resumption, map scope, campaign completion, Save/Continue and reachable controls at 1024x600 and 390x844. The host emitted its existing GPU shutdown warning after the successful checks and captures. Source layout and module linking pass. Changes remain local; no commit or push was made.


### Army commanders (12 October 2026)

New Lizeemi War campaigns use `lizeem-world-v10`. Captain Meret Voss leads the Ovesos Free Company from Nethereum; Captain Serevan Dain leads the Nesdor River Guard stationed at Caricas. The opening attack on day three includes both armies, so either allegiance can test its opposing commander immediately. Dain's initial 24 soldiers are drawn from the existing Caricas garrison. Other armies do not inherit either captain. Voss has a broad silhouette, copper hair, green armor, cream mantle and oak badge; Dain is taller and leaner, with red and ivory dress, a crested bronze-trimmed helmet and sun clasp. Both retain the animated sword-and-shield rig.

A captain belongs to one persistent army ID. Winning an opening duel routes that army's captain and two ordinary guards; choosing interception instead leaves the captain in the combined final assault. Losing or yielding the duel also leaves that captain in command. The final victory cannot be recorded while an opposing captain remains active. Combined formations add at most one captain per side to the bounded existing soldiers. A captain has 200 health and may rout when wounded and isolated. Slaying or routing a captain shifts morale by -20/+20 across the two sides; a failed duel shifts it by -10/+10 against the player. Local losses also reduce morale and can produce a rout. Campaign morale affects ordinary unresolved battle odds; a completed final assault remains decisive.

Withdrawal preserves captain health and fate. Routed captains can recover with a surviving army after the battle; slain captains never respawn in another levy, and captains whose army is destroyed are captured. These facts appear in army information, battle results, Corris's reports and the Chronoscope. Saves replay the actual commander reports and validate identity, health, casualties and morale; Reaper retries restore the preceding checkpoint. Existing v3-v9 saves retain their original scenario rules, so start a new campaign to use army commanders.

Validation: 168 model checks cover both factions, real combat inputs, required commander defeat, declining, withdrawal, morale, casualty conservation, replay, death, and complete intervened/unattended campaigns. Additional campaign continuity, pacing, history, soldier conversation and correspondence checks pass. `--champion-duel-checks` passes native duels, combined West/East assaults, Save/Continue, death and retry with no recorded frame errors. Source layout and module linking pass. New geometry is limited to the two captain rigs; this pass does not create full armies or introduce world-scale AI. No comparative frame-time benchmark was performed.


### Full-war adventure clock

New playable Lizeemi War campaigns now use elapsed adventure time through both
factions' victory paths. See [adventure clock](../shared-clock-opening.md) for
pause rules, dawn departure, waiting forecasts, save compatibility and native
checks. The campaign core still uses integer strategic order ticks; the elapsed
adapter presents one tick per minute and settles played battles without skipping
time for other armies. Existing saved campaigns and older autoplay rehearsals
keep their original timing; the temporary Caricas-only clock rehearsal remains
available separately.


## Matched combat swing experiment (21 October 2026)

Standalone Combat Testing defaults to **Matched swing speed**, with **Previous
slower tempo** available in the exercise menu for comparison. Campaign encounters
and Taleth's training keep their existing timing pending player feedback. The
selection carries through retries and allied/solo comparisons without reloading
the camp or writing campaign saves.

`gameplay/combat/encounter-timing.js` owns the shared player clock. The matched
profile in `encounter-attacks.js` uses 0.10 seconds of preparation followed by
0.25 seconds of striking, with first contact at 0.15 seconds: the same contact
and 0.35-second motion as Teresod. Previous NPC contact was 0.97 seconds for a
thrust, 1.20 for a sweep and 1.48 for an overhead. Guards, captains and allied
soldiers use the selected profile; animation, damage timing, warning fill and
counter cues all read that profile. Reach and damage are unchanged.

Recovery is deliberately separate: 0.65 seconds versus the previous
1.15-1.65 seconds. An initial full-cooldown match gave NPCs only 0.20 seconds of
recovery; the ordinary dodge/counter controller could evade one soldier for 90
seconds but could not return to staff range in time to counter. That version was
rejected. The player's dodge and damage grace are unchanged; a perfectly timed
dodge now covers the faster sweep's entire active window, so directional attack
differences need further human playtesting alongside reaction difficulty.

Validation: 76 focused model tests passed, including timing equality, warnings,
animation, actual dodge/counter victories, allied/captain timing, collision and
classic campaign/training regressions. Layout and module linking passed. The
native check completed all five exercises at both speeds with ordinary automated
movement/attack inputs, verified retries, cue disposal and save isolation, and
recorded no renderer/frame errors. In that run, the solo assault ended at 20
health with matched speed versus 80 with classic; the allied assault ended at
80 versus 100, with two allied casualties versus none. Warning, counter and menu
captures were visually reviewed. These are automated comparisons, not human
playtest results.

`node scripts/analyze-combat-tempo.mjs` runs 40 deterministic flat-ground trials
across five fixtures, both tempos and four control policies. The immediate
dodge/counter controller won every matched fixture; a reactive controller with
150 milliseconds of added observation delay lost all five. This flags the very
short reaction window without ruling out anticipatory human play. Run the native
comparison with `node scripts/launch.cjs --exploration --combat-testing
--smoke-test --internal-review --combat-tempo-checks`. Results and captures use
`tests/artifacts/combat-tempo-*`. Start a manual demo with **Dodge and counter**,
then compare **Thrust and sweep**, **Allied assault** and **Solo assault** before
adopting the experiment in the campaign.

## One-on-one creature trials (21 October 2026)

Combat Testing now features **One-on-one trials**: a small bramble goblin, a grey
wolf, then a road bandit. The five earlier guard exercises and their tempo selector
remain available under a collapsed section. Each trial has one opponent, a paused
briefing and full starting health. Winning advances only on Continue; R retries
the current round while retaining earlier results. Exit restores the practice
session, and no campaign save or army outcome is written.

`gameplay/combat/combat-trials.js` owns the opponent profiles, consumed by the
existing encounter model and warning/animation controllers. The goblin has a
slow stick jab, 50 health and no guard. The wolf has 75 health and a faster pounce
that travels 1.15 metres along its committed heading through existing swept
collision; its warning includes that travel. The 100-health bandit parries and
alternates cuts, sweeps and overheads. All retain visible preparation and recovery
windows. These timings are independent of the preserved guard-speed experiment.
The renderer reuses articulated goblin/wolf assets and a sword-carrying mercenary;
only one opponent is created at a time. Retries and rounds reuse the prepared arena.

The three trials now take place in **Taleth's Stillroom**, the Spirit and Time
chamber, using the same mist field and return pavilion as tower training.
`app/exploration/combat-practice-world.js` selects the arena before construction:
starting trials builds no Minora terrain or city scenery. The older guard
exercises still load their camp on demand. Cached arenas share the host's
renderer; switching restores the selected atmosphere, lights, ground and
collision queries. All rounds face the opponent toward the distant pavilion.
The chamber remains three static scenery draws, with no extra particle system,
world population or campaign clock. This changes the practice venue, not the
campaign's separate Taleth lesson flow or trial balance.

Arena regression coverage checks pavilion collision at the translated floor,
guard/trial switching, retries without rebuilding, and initial facing. The
native `--combat-trials-checks` run starts directly in the Stillroom and captures
its overview as `tests/artifacts/combat-trials-room.png`.

Validation: 75 focused combat, practice, collision and training tests passed,
alongside layout and module-link checks. The isolated native run completed all
three rounds with ordinary movement/attack inputs, checked defeat and a wolf-round
retry, paused briefings/results, actor disposal, save isolation and both old guard
tempos, with no renderer errors. Opponent and result/menu captures were visually
reviewed. Run `node scripts/launch.cjs --exploration --combat-testing --smoke-test
--internal-review --combat-trials-checks`; results and screenshots use
`tests/artifacts/combat-trials-*`.

In flat-ground model comparisons, holding attack won against the goblin with 100
health, beat the wolf with 66, and lost to the bandit's defense. The dodge/counter
controller could beat all three. This is evidence for an initial progression,
not a human difficulty or enjoyment assessment; player feedback should guide
the next tuning pass.

### Combat attributes and trial tuning (21 October 2026)

`gameplay/combat/combat-stats.js` provides validated, immutable encounter
attributes. Teresod starts at 10 in each attribute. The initial supported range
is 1-20; fractional creature ratings are allowed. These are combat tuning values,
not settled lore, experience levels or a save format.

| Attribute | Effect |
| --- | --- |
| Vitality | Maximum health is 10 times the rating, rounded to an integer. |
| Power | Base melee damage is multiplied by rating / 10, rounded with a minimum of 1. |
| Quickness | Attack rate is `1 + 0.04 * (rating - 10)`; attack durations are divided by this rate. |
| Mobility | Normal combat movement is rating * 0.4 metres/second; moving during a staff swing is 70% of this. |

Weapon/move definitions still own base damage, reach, attack shape, preparation,
contact and recovery. Teresod's current weapon is the 25-damage staff. Quickness
scales the player's swing, contact and attack cooldown; it scales NPC windup,
strike, contact, active window and recovery together. The model resolves profiles
once when an encounter starts, and animation and warning progress consume those
same resolved profiles. `encounterHeroPose` is shared by world encounters, the
map-only fight and tower training. Dodge distance, invulnerability, damage grace
and spell damage retain their separate rules.

Trial opponents now derive health, melee damage and movement from their ratings:
the goblin has Vitality 5, Power 5 and Mobility 4.5; the wolf has 7.5, 8.5 and 8.5;
the bandit has 10, 10 and 6.75. Quickness starts at 10 for each: their different
base moves preserve the previous three-round tuning exactly. `heroAttributes`
and trial-only `opponentAttributes` provide explicit encounter configuration.
Unmodified guards, allied units and their classic/matched timing remain intact.

The trial card's **Teresod's practice stats** section previews calculated health,
damage, movement, swing/contact and repeat timing. It validates input before
starting, captures the settings once for all rounds/retries, and can restore the
starting ratings. Briefings offer a collapsed comparison with the opponent;
enemy damage and first-hit time describe its opening move. Health meters, damage
feedback and round reports use actual resolved values. Practice settings last
only in the current menu session and do not alter campaign characters or guards.

Validation: 81 focused tests pass, including actual contact/repeat timing at low
and high Quickness, matching animations/warnings, wolf lunge collision and single
hits at multiple step sizes, damage/health/movement, invalid input and immutable
round settings. The native trial check runs the default three rounds, then a
custom 150-health, 30-damage, Quickness-15, Mobility-12 run. It checks UI validation,
briefing values, real damage, retry/round continuity, result denominators, reset,
guard isolation and renderer errors. Both runs passed, and the controls and
comparison captures were visually reviewed. Layout and module-link checks pass.

## Universal marching columns and roadside interception (13 October 2026)

`war-columns.js` projects every living marching or retreating army from its actual order, including replacement armies and later journeys. `war-column-routes.js` caches routes over dry ground and the authored shallow fords in the active world; `war-columns-view.js` draws a bounded nearby sample. The map, minimap, tracking arrow and physical standard use the same point. Distant armies do not run soldier combat AI. Ordinary regional battle resolution remains authoritative.

Minora grants neither league military passage. `war-column-access.js` excludes
its authored city outline plus a six-metre wall buffer from route searches,
straightened segments, standards and individual soldier placement. Cross-river
columns use the Nethereum–Caricas and Ovesos–Nesdor stone bridges south of
Minora. The upstream Isa gravel crossing remains for outside Isareos access,
not for league-to-league marches. Isareos uses an outside assembly point. Player access through
the city gates and bridges is unchanged. Routes are rebuilt from saved orders,
so existing campaigns receive the restriction without changing their army IDs,
strength, supplies or arrival times. While a route is being calculated, navigation
uses its permitted assembly point rather than a straight line through Minora;
that temporary position cannot spawn troops or start an interception.

The focused native check is
`npm run test:unified-war:desktop -- --unified-war-minora`. It passed 135 assertions
with no renderer errors, checking all fourteen route directions over 14,822
samples of the loaded scenery, the opening West column at 02:34, a later East
march and retreat, marker/actor agreement, pending assemblies and Save/Continue.
Artifacts use `tests/artifacts/unified-war-minora-*`. Route, access and related
column model checks also pass. These checks predate the two southern bridges;
the bridge routes retain existing arrival times, strengths and supply rules, and
the route cache and three-millisecond planning budget remain in use.

The shared crossing definitions and batched scenery live in
`content/regions/minora-frontier/lizeem-crossings*.js`. Both the reviewed
food-world countryside and ordinary exploration use their deck profiles, roads
and minimap spans. Approach clearance reserves existing fields without altering
their production budgets. The Nethereum riverside granary is set back from the
new parapet. Open arches preserve the existing trading-barge circuit. Route
sampling includes a clearance margin so smoothing cannot clip building corners
between probes. Run `node scripts/launch.cjs --exploration --food-world
--smoke-test --internal-review --lizeem-bridge-checks` (or replace `--food-world`
with `--world-war`) for actual scenery routes, foot/horse crossings in both
directions, later marches, retreats and marker alignment. Artifacts use
`tests/artifacts/food-lizeem-bridges-*` and `world-lizeem-bridges-*`.

Farm clearance (21 October 2026): Caricas's northern grain parcel overlapped
the White Bridge's eastern end. Its new-crossing mask did not include Minora's
older bridges, and soil patches ignored road clearance entirely. All five
reviewed layouts now carry `lizeem-agriculture-reservations.js`, combining the
city's bridges and approaches, the southern crossings, timber decks and quays.
The shared field builder checks whole crop footprints and cuts soil/stripes
around reserved corridors; hedges, sheep and fences use footprint clearance too.
Crossing bounds are derived from full road widths rather than fixed coordinates.
This is build-time presentation only: food capacity and campaign saves are
unchanged, with the same merged mesh batches and no per-frame clearance work.
`tests/agriculture-clearance.test.js` checks actual triangles against bridge and
road footprints in all five regions, plus additional diagonal reservations on
flat and draped ground. Run `node scripts/launch.cjs --exploration --food-world
--smoke-test --internal-review --farm-clearance-checks` for native mesh checks
and White Bridge / southern crossing captures under `tests/artifacts/farm-clearance-*`.

Living farm sheep (21 October 2026): the reviewed farm builder previously baked
sheep into static scenery, so their grazing poses never changed and they had no
collision bodies. The shared builder now returns a livestock controller which
both the campaign countryside and farmland review update. Keep future livestock
in this life system, not in the field's static geometry. The 102 sheep use three
instanced batches per pasture (body, head, legs), sharing geometry within each
region. Nearby flocks graze and walk at 20 updates/second, more distant flocks at
5, and flocks beyond 140 metres sleep. Pausing or hiding the world stops updates
without catching up later. Hooves follow terrain; movement respects pasture
edges, water, slope, roads, bridges, buildings, fences and nearby actors.

Two moving collision circles protect each sheep for both foot and mounted
movement. They are queried at their current positions, separately from the
static spatial buckets, so wandering cannot leave stale collision behind.
World collider rebuilds also refresh the flock's obstacle index. Disposal
removes the owned bodies and instance buffers. These ambient animals do not
change food production, campaign timing or saves. Regression coverage in
`tests/agriculture-livestock.test.js` checks animation, all five regional
builders, swept foot/horse collision, terrain grounding, pasture constraints,
sleeping and disposal. Run `node scripts/launch.cjs --exploration --food-world
--smoke-test --internal-review --livestock-checks` for the actual Caricas flock,
held movement, moving collision queries and pause/resume checks. Captures and
results are in `tests/artifacts/livestock-*`.

Bridge validation (21 October 2026): 56 focused model/geometry checks passed,
including both route directions, trade-barge arch clearance, farm capacity and
campaign continuity. Both native world layouts passed all seven physical routes,
foot and mounted crossings at both bridges, opening/later marches, retreat,
marker agreement and Save/Continue with no recorded renderer/frame errors.
Bridge overview captures were visually inspected. Module linking and source
layout checks passed. The crossings add two static mesh batches; no comparative
frame-time benchmark was performed.

Approaching an enemy marching column within 14 metres offers a roadside encounter for the player's chosen campaign side. Declining changes nothing and suppresses automatic reopening until the hero leaves 22 metres and returns. Friendly and retreating columns are visible but cannot be attacked in this first pass. Wading columns remain visible at the existing shallow fords; interception opens again once they reach a dry bank. Deep rivers still require an actual bridge. Mounted approaches use the normal safe dismount before fighting.

`simulation/roadside-interception.js` owns the replayable `intercept-army` command. The local allied fight uses up to three regular opponents and the army's actual active commander. Up to two scouts are borrowed from an eligible friendly garrison; their losses are charged there. Killed regulars remove a proportional share of at most 12 army strength, with retreats accounted separately. Success delays surviving troops one strategic tick (one adventure minute in the shared-clock campaign). A started fight consumes the opportunity for that order; a subsequent new march is eligible again. Neither joining nor resolving skips the campaign clock or changes territorial ownership. Commander wounds, fate and morale persist into the destination battle. A fractional progress anchor prevents a delayed column from jumping backward.

The standard encounter adapter handles input, result confirmation and afterlife retry. `roadside-contact.js` owns proximity debounce; `roadside-presentation.js` explains the local objective. The result is retained in Taleth's messages, live war reports and the Chronoscope. Runtime checks are in `dev/checks/marching-columns-smoke.js`, launched with `node scripts/launch.cjs --exploration --food-world --smoke-test --internal-review --marching-column-checks`. The `--columns-only` variant checks presentation without combat.

Simultaneous orders on the same route retain stable convoy slots from their historical order snapshots. Their standards are spaced by up to 32 metres, compressing only on the final approach. Removing, settling or culling another force cannot reshuffle a surviving column. The renderer limits nearby columns to three, with 24 pooled ordinary soldiers and two reused commander rigs. Route construction yields between search steps using a soft three-millisecond budget and caches the resulting paths; soldiers do not run separate pathfinding.

Validation: the focused campaign regression suite passed 144 checks before the final convoy polish; the final column/contact/interception subset passed all 22 checks afterward. Actual-terrain tests cover all seven campaign links in both directions in both ordinary and food-world layouts. Source layout and module linking pass. The full isolated food-world native run passed 232 assertions, covering opening and later armies of both sides, replacements, retreats, fractional movement, pause, marker alignment, Save/Continue, friendly approach, foot and horse interception, decline/re-entry, combat and results. A focused follow-up passed 105 assertions for the day-26 three-army retreat convoy, another later-East view and the completed interception result. Both native runs recorded zero renderer/frame errors. Reports and screenshots are in `tests/artifacts/food-world-marching*`. Rendering counts verify bounded actor use; no controlled before/after frame-time comparison was performed. An unrelated legacy `held-battles.test.js` source scan still fails against `src/main.js`; the full repository suite is not claimed clean.


### Representative Caricas countryside (22 October 2026)

The reviewed campaign now treats Caricas as an authored place rather than a
visible census. Its three farmsteads contain ten separated parcels and six farm
buildings; the river town contains twelve buildings around an open market.
Population (1,265), housing capacity (1,600), full production (170/day), stores,
trade, recruitment and shortages retain their existing campaign values.
`lizeem-food.js` reads Caricas's economic targets directly, with no dependency
on its building or parcel arrays. No campaign version or save migration is needed.

The town's council/market hall, public granary, watch house, inn, toolsmith,
stable and quay warehouse have named purposes and distinct physical details.
Five town households complete the layout. These are scenery roles, not new
production multipliers or enterable interiors. Existing residents occupy the
corresponding workplaces through `caricas-resident-placements.js`; the ordinary
legacy countryside retains its own placements. A graded market terrace connects
building pads, and the eastern bridge approach meets the bridge at its end.
The local map uses the same paths and building colliders as the physical town.

Fields, homes and ambient people are representative. Regional crop-condition
feedback still updates existing mesh buffers as war or shortages affect output.
It does not claim that a particular parcel supplies a particular number of people.
`agriculture-land-use.js` reserves building footprints, entrance aprons, farmyards
and market squares from soil, crops, hedges and livestock; shared road and bridge
reservations still apply across all five reviewed regions. Decorative civic props
are one merged static batch, with solid well, tree trunks, anvil and hitching rails.

This is the Caricas pilot, not a redesign of all settlements or the legacy Explore
layout. Model coverage includes layout/collision, actual planted triangles,
economic independence from scenery counts, unchanged campaign replay and graded
terrain. Run `node scripts/launch.cjs --exploration --world-war --smoke-test
--internal-review --caricas-redesign-checks` for a real new-game journey, Caricas
entrances and mounted lanes, residents, bridge, Save/Continue, map report and
opening combat. Standalone visual review: `node scripts/launch.cjs
--farmland-review --smoke-test --polish-review --region=caricas`.

Validation: 95 distinct focused model checks passed across the economy,
clearance, livestock, neighboring layouts, opening battles and army routing.
An obsolete Ovesos assertion ranking its house count against Caricas was removed;
regional population and economic assertions remain. The isolated native campaign
and final standalone visual review completed with no recorded renderer errors.
All authored Caricas lanes support the horse collision radius, each building
entrance is accessible, the three threatened townspeople retain valid shelter
routes, and the opening interception stages clear of buildings. Final town,
bridge, map and combat captures were inspected. Source layout and module linking
passed. The standalone final view used 28 draw calls; this is a bounded-rendering
check, not a controlled before/after performance benchmark.

## Direct battlefield entry (22 October 2026)

Fresh battlefield invitations default to **Join battle**: one continuous allied
fight followed by its campaign result. Reinforcement interception is no longer a
fresh battlefield-menu option; approaching a hostile marching column still uses
the existing roadside interception. An optional champion challenge appears only
when the opposing army has an active commander. The larger field battle follows
an accepted duel, with the same recorded surrender and morale effects.

`simulation/field-battle.js` derives local formations from committed army strength,
capped at twelve regular soldiers per side plus one active commander. The combat
model allows that larger bound only for field battles, using compact ranks on
clear terrain and a three-minute combat limit. Existing small encounters retain
their limits. Caricas currently stages thirteen opponents and eleven allies;
Ovesos stages nine opponents and seven allies for the eastern attack.

A replayable `field-battle` command commits the player's side and skips the old
interception stage without inventing casualties or advancing time. The existing
assault accounting records the battle, commander fates, allied losses and routs.
Withdrawal and re-entry preserve those values. Old command histories and partially
played interceptions keep their original progression. Briefings, result receipts,
time notices, live directives and reports distinguish direct battles from those
legacy encounters. No scenario definitions or old saved command histories change.

Validation: 94 focused model checks passed, including both leagues at both opening
fronts, real combat results, save/replay, withdrawal and re-entry, optional duels,
commander availability, roadside contact and older two-stage histories. Source
layout and module linking passed. The hidden native `--field-battle-checks` pass
completed eight stages with no renderer errors, including normal-input victories
in Caricas and Ovesos, Save/Continue, chosen allegiance and the optional duel.
Artifacts are `tests/artifacts/field-battle-*.png` and `field-battle-checks.json`.
An additional, unrelated `held-battles.test.js` source audit still reports an
authored level in the existing `src/main.js`; this pass does not alter that host.

### Minora harbor and Lizeem passage

The reviewed campaign countryside has a small passenger harbor beside the south
edge of Minora's White Bridge. Its gangway, walking height and parapet opening
share the dimensions in `content/regions/minora-frontier/minora-harbor.js`.
`minora-harbor-scenery.js` builds the timber landing and covered boat; the existing
river traffic steers clear of the mooring. An anchor marks each nearby passenger
landing on the minimap. Taleth and the opening directives mention this route.

`lizeem-passages.js` defines Minora and the existing quays at Nethereum, Caricas,
Ovesos and Nesdor. `app/exploration/harbor-host.js` supplies a nearby boatkeeper,
third-person conversation and free downstream passage. `river-passage.js` follows
the real river channel, including clearance through the bridge arches. Teresod
and his owned horse ride the visible boat; its canopy is furled for the bridges.
Upstream destinations are absent. A checked option includes a
guide to an active battle's approach; the destination must be dry, clear, outside
the battlefield and have a walkable path into its boundary. Combat is never
accepted automatically. The horse unloads on safe ground nearby and stays owned.

Dialogue and corridor loading hold time. Sailing explicitly advances campaign
time at normal speed; Skip voyage pays exactly the remaining duration through
the same simulation ticks. A voyage can be paused, and the prior campaign pause
preference is retained after landing. The guide checks for a surviving battle
after arrival, since the field can end while traveling. Loading failure keeps
the player at departure; overlapping passage requests are ignored. Saving is
unavailable aboard. No campaign economy or save format changes. The service is
enabled in the reviewed five-region countryside; older legacy scenery retains
its original travel systems.

Checks: `tests/harbor.test.js`, the existing city/river tests, and
`node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --harbor-checks`.

`river-navigation.js` shares the actual quay and berth envelopes between ambient
traffic and passenger routes. Passenger trips begin and end alongside a quay,
align before approaching it, slow for tight bends, and include cast-off and
mooring time. Skipping uses that same duration. The arrived vessel stays moored
with its crew aboard after Teresod and his horse unload. Low-poly crews row,
steer and keep watch; oars are shipped around quays and bridges. Crew animation
is throttled at distance and sleeps with hidden regional scenery.

Passenger boarding also reserves the river against moving trading barges.
`river-traffic-reservation.js` checks bounded pull-off maneuvers and holding
positions against the entire passenger route. Traders clear the route while
the passenger waits at the berth, then return continuously before resuming
their shared traffic phase. `river-traffic-service.js` owns this state per
exploration scene, including a pending return before another voyage. Waiting
is included in the displayed journey time and charged identically when watched
or skipped; a failed safe-path search leaves the traveler ashore. Planning runs
once during boarding, with no recurring route search in the rendering loop.

`river-navigation.test.js`, `river-traffic-reservation.test.js`,
`river-traffic-service.test.js` and `riverboat-crew.test.js` cover complete hull
and oar clearance, moving traffic, all downstream port pairs, continuous return,
watched/skipped clock equivalence and crew lifecycle. Native harbor checks also
verify visible travel, retained moored boats and battles ending during passage.

### Staggered opening and Taleth's recommendation

New `lizeem-adventure-food-v3` campaigns open Caricas at Adventure 00:00 and
Ovesos at 02:00. Earlier scenario versions retain their original replay rules.
The eastern opening force marches from Nesdor, conserving its soldiers and
supplies. The HUD gives one recommendation: unfinished commitments first, then
the earliest battle deadline and proximity. A player-selected map target takes
precedence until Follow Taleth is chosen again; this preference survives saving.
An early victory at Caricas points toward the known Ovesos destination before
the second battle begins. It does not reveal an unseen army's precise position.

The optional War log records dated orders, battle outcomes, ownership changes,
casualties and the player's actual interventions. Reading it holds time; closing
it restores the previous view. Taleth's report no longer demands a conversation
after each battle. `tests/opening-fronts.test.js`, `tests/war-log.test.js` and
`--taleth-guidance-checks` cover the schedule, tracking, journal and save replay.

Later battles remain simulated. Recovery, reattack limits, command reviews,
recruitment, supplies and march distance can combine into a long lull. In an
unattended new v3 campaign the third battle begins at Nesdor at 04:00, while a
later recovery gap can last until 13:00. Played outcomes and older saves can
produce different schedules; there is no universal ten-minute third battle.
Possible further pacing work: show the next command/recovery time in Taleth's
advice, offer a clear wait-to-next-development action, or make command reviews
more frequent in this tutorial campaign. These are proposals, not new rules.


### Riverbank planting and fixed farm scenery

The reviewed countryside uses `lizeem-agriculture-trees.js` to place irregular
riparian strips and sparse field-edge trees. Willows, alders, sycamores and
poplars occupy wet margins; oaks, walnuts, hawthorns and orchard apples frame
farms. Nesdor retains its denser authored woodland. Planting leaves regional
population, agricultural capacity and housing values unchanged.

Clearance uses each complete crown footprint, actual water channels (including
side braids), crops, roads, buildings and door aprons, farmyard access, quays,
bridge approaches, battle spaces and army marching corridors. The corridor
constants are shared through `content/scenarios/lizeem-column-corridors.js`;
their original route coordinates are unchanged. All rural placements have
species identities, collision trunks and real visual handles for observation.
The placement regression independently checks full canopy exclusions and
retains Nesdor's previous geometry and woodland-density budgets.
