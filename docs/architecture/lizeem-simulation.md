# The five-region simulation test

This is the first independent campaign loop. Its proving ground is the East-West War between the West Lizeem League and East Lizeem League, with Minora neutral. The map-only launcher is separate from the existing adventure. An optional world test now connects the same core to the exploration build. The numbers below are test tuning, not settled world lore.

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
5. Use **WASD/arrows** to move, **X or left click** to strike the nearest guard in range, and **Space plus a direction** to dodge. Red circles warn of enemy strikes. Defeat all three guards before losing your health or reaching the 90-second limit.
6. Press **Apply result and return to map**. With this seed, success lets West capture Caricas. Staying out leaves it with East. The hero panel reports the chance change and resulting control; the map selects Caricas. Resume the campaign when ready.

You can help either side; this first test does not make that choice a permanent faction allegiance. Human-controlled Teresod can cross Minora's borders, while league armies still cannot. Travel uses the existing regional routes and takes campaign time. You must be present, ready, and opted in when a hostile army arrives. Other battles resolve normally. The hero is unavailable for another encounter for three campaign days after each decision, including withdrawal, preventing repeated involvement in the same day's queued battles. Travel remains available during this readiness cooldown.

**Scope of the combat test.** The battlefield is a deliberately plain arena using the existing character assets, not Caricas's real scenery or the full army deployed as individual soldiers. Three guards represent a local task. Health, attack timing and the task itself are provisional; defeating them does not remove three extra strategic strength points. There are no skills, loot, quests or recruitment menus. Failure means Teresod is driven back, not permanent death. Each encounter starts with full health.

Success improves the chosen side's battle chance by up to 20 percentage points; defeat reduces it by up to 10. Hero modifiers stop at the 5-95% chance band without reversing an advantage that already lies outside it. The core still rolls the regional battle, applies losses, retreats, recovery and territorial changes. A local victory is not a guaranteed regional victory. Withdrawal before completion gives no modifier. After victory or defeat, Escape applies that completed result rather than discarding it. Losing window focus pauses the encounter.

**Authority boundary.** `campaign.js` owns hero location, dated journeys, encounter availability and a unique pending battle ID. `step()` stops at that pending battle even when asked for many days. `resolveEncounter(id, faction, outcome)` validates the ID, side and outcome; records it exactly once; resolves the original army against the original defenders; and finishes the suspended day's arrival queue, victory check and orders. Troops cannot be reinforced while the battle is pending. The UI cannot choose the regional winner or supply arbitrary casualty numbers. The local combat model has no imports from the campaign.

## Explore inside the five-region war

Run `npm run start:lizeem-world`, double-click **Test Lizeem World.cmd**, or choose **Lizeem world test** from the ordinary exploration start screen. Choose **Begin world test** to start in Minora as Teresod using the brown-cloaked avatar. The physical world still uses the existing exploration loader; this does not reduce it to five regions of scenery.

The campaign starts paused. Press **M** and use **Run campaign**, **Pause campaign**, **+1 day**, or the speed selector. At 1x, thirty active game seconds advance one day; 4x and 20x shorten that interval. Time advances while exploring or reading the map. Loading, the pause/developer menus, loss of window focus, and encounters suspend it; there is no background catch-up. Speed changes timing, not battle rules. After an encounter or loading a save, the campaign is paused until resumed explicitly.

The regular M map still opens in **Regions**. Switch to **Geopolitical** for live faction control. **Stability** reports neutrality, active war, recent conquest or unassessed postwar conditions; it is not a population/unrest simulation. **Developer reveal all** starts checked in the world test for development, including fresh-window restores. Turn it off in M or F8 to test discovery fog. The override does not add discoveries to your save; ordinary exploration retains its fog-first default. Outside the five scenario regions, political information is marked outside the scenario, rather than borrowing the old authored campaign's factions.

Hero location comes from the existing world's `regionAt(x,z)` result. Walking, riding, flying and developer teleportation all feed the same adapter. There is no second regional journey timer for the hero. Crossing a region boundary records a dated location command, rather than writing positions to campaign history every frame. Leaving the five regions gives the hero no local encounter eligibility; the five-region war can continue. League armies still obey their own geographic travel times and cannot enter neutral Minora.

**Battles have a location and a window.** A hostile arrival starts a three-day engagement at a fixed test site in the region. Committed attackers and defenders cannot leave on new orders; incoming reinforcements join the same engagement. Local recruitment pauses while the battle is active. Regional battle casualties, retreat and control changes occur once, at the deadline. A successful Caricas or Ovesos interception removes its reserved reinforcement strength immediately, before the main battle resolves. An unattended battle resolves automatically even if Teresod is standing nearby. This is a campaign abstraction, not continuous tactical combat.

The M map marks a battlefield only after its own hex is discovered, or while developer reveal is enabled. A compact list of known active battles can centre the map on one. Markers appear in Regions, Geopolitical and Stability and disappear on resolution. Nearby loaded sites have a gold flag. Approach within **24 metres**, near ground level, and press **F** or click the join prompt before the deadline. Being elsewhere in the same region is insufficient. You can arrive after the fight starts. Joining suspends the clock; staying out does not. A submitted result is recorded once and affects the regional roll at the deadline, with no immediate territorial change. In fresh runs, Caricas and Ovesos remove actual reinforcement strength; Nethereum and Nesdor retain their provisional arena chance modifiers. You cannot repeat the same encounter.

**Computer test scenarios:** open **F8 ? Computer test scenarios** and choose a named button:

- **Minora ? Ovesos: ride and defend West (fresh run)** replaces the unsaved campaign with the opening scenario, places Teresod at the Minora start, mounts the developer horse, and rides using ordinary movement and collision. The route crosses the Guild Footbridge, follows Sacred Way over Pilgrims' Bridge, wades the shallow Neth ford, and follows the Velsorten road into Ovesos. Campaign time runs at 1x during physical travel so the join window remains meaningful. Region loading pauses travel and campaign time. Arrival dismounts Teresod; waiting and regional resolution use 20x. The camera faces the incoming soldiers for a two-second preparation countdown, then shows combat at normal speed. The computer helps West by intercepting East's reinforcements, holds the local result for four seconds, and opens the geopolitical outcome on day 8. A successful interception reduces enemy troops but does not guarantee West retains Ovesos.
- **Caricas: quick interception (current run)** retains the current campaign, advances at 20x to day 10, uses a clearly advertised developer transfer to Caricas, fights for West, and shows the day-12 result. It remains a quick combat demonstration without a riding leg.

Both tests leave saved checkpoints untouched; F5 explicitly saves afterward. **P** or the active Stop button hands control back, including during combat. When idle, P opens the developer chooser instead of choosing a scenario implicitly. Movement keys, menus and clicked controls also interrupt; camera movement remains available. Focus loss pauses autoplay. Cancelling the Ovesos setup prevents a pending load from resetting the run afterward. Caricas retains its existing already-started transfer behavior. The drivers live in `src/gameplay/autoplay/`; the exploration host owns loading, normal movement input and presentation. Neither driver injects victories or ownership.

Ovesos tracking uses surveyed bridge/ford waypoints while the hero is within 80m of the route, and only reveals a waypoint already known to the player. Outside that corridor it retains the ordinary direct target bearing. This is a bounded authored route, not a general navigation system. Exploration ignores legacy `west-deep-water` wall cylinders and uses the actual western water surface; a horse may wade up to 0.95m. A horse already stranded in deeper water can retreat toward shallower ground but cannot continue deeper. Trees, buildings and bridge rails retain collision. Ordinary foot travel can swim. These changes are scoped to exploration and the world test.

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

**Save and resume:** F5 or **Save world test** saves exploration position, discoveries, camera and campaign replay together. Land before saving. The file is `saves/lizeem-world-v3/road-checkpoint.json`, using key `azhora-lizeem-world-v3`. The previous v1 and v2 world-test slots are preserved separately, with no migration. Fresh runs now use scenario `lizeem-world-v4`, with both Caricas and Ovesos field interceptions. The save container and storage key remain v3 because their shape is unchanged. Existing scenario-v3 saves still replay under their exact original rules, including the Ovesos arena bonus; they are not silently upgraded. Begin a new world test to use the Ovesos field encounter. Ordinary exploration and adventure saves remain separate. Starting a new world test does not overwrite its saved test until Save is pressed. Invalid saves are rejected without replacement. Active campaign battles save and reload with their remaining windows. There is no autosave or mid-skirmish health/position checkpoint. Submitted encounter results replay exactly.

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

The shared independent encounter model now applies staff damage 0.15 seconds into a 0.35-second swing, with a 0.55-second attack cooldown and 0.16-second late input buffer. It assists facing toward a nearby opponent when a swing starts, then checks its arc, reach and terrain at contact. Movement continues at reduced speed during the swing. A dodge cancels an unlanded swing, uses the pressed movement direction or backsteps when stationary, and requires a new press for the next dodge.

Soldiers commit to their heading when their warning starts. A thrust has a 0.7-second windup, 0.3-second strike and 0.85-second recovery. A sweep has a 1-second windup, 0.5-second strike and 1.05-second recovery. Damage occurs during the strike rather than at the end of the warning. The world view shows the strike arc; stepping aside can make it miss. A raised shield blocks frontal staff hits without interrupting the attack. A flank hit deals damage but cannot cancel a committed swing. A missed strike drops the guard until recovery ends; the first counter deals 25 damage and consumes that opening with a short stagger. Squad attack commitments are spaced by the current windup and strike duration plus 0.25 seconds so warnings remain readable. Successful enemy strikes restore the guard immediately, so standing and repeatedly attacking cannot trade through them. Health bars, recoil, phase labels, missed-strike feedback and animated falls expose these rules visually. Damage and reinforcement accounting are unchanged. This is still a three-soldier combat prototype, not a full combat system.

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
