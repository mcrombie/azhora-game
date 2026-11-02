# Exploration starting point and dependency audit

The exploration build gives Azhora a separate development entry point for its world and hero movement. The existing adventure remains runnable and recoverable at the integrated checkpoint `070f84b`. Its quests, skills and story are available as reference material; they are not requirements for the new game design.

This first step includes one controllable character, the authored world, walking, running, jumping, swimming, a following camera, map discovery and a separate save. The ordinary exploration mode does not run combat or faction simulation. The optional [Lizeem world test](lizeem-simulation.md#explore-inside-the-five-region-war) adds the bounded five-region war, three-day battles at discovered world locations, local hero encounters and a separate combined save. In that mode, approach a battlefield flag and press **F** before its deadline to join. Caricas uses an on-foot reinforcement interception in its actual scenery, with X/click to strike, Space to dodge and Escape to withdraw; other sites still use the test arena.

The shared startup menu presents Explore, Combat Testing, and Lizeem War Scenario in one column. The [Feradom-only Hearthfall workspace](hearthfall-sandbox.md) remains in the codebase but is currently hidden from this launcher. The original adventure is launched with `npm run start:adventure`.

## One-on-one trials and army units

Combat Testing offers fifteen rounds in Taleth's Stillroom: Bramble goblin, Grey wolf,
Road bandit, Militiaman, Orc Raider, Ambron Soldier, Orc Warrior, Veteran Ambron
Soldier, Veteran Orc Warrior, Ogre bruiser, Elven duelist, Dwarven shieldwarden,
Rogue battlemage, Troll, and Undead knight. The starting-opponent selector can jump
to any round; skipped rounds are never credited as victories. Health and mana reset
between rounds; retries retain the
current round, selected attributes, and militia weapon. Choose sword, spear, axe,
or mace plus shield for round four before starting.
Hold **F** (or the Block button) to brace the staff: 55% less damage inside a
120-degree frontal arc, with movement at 45% speed. Rear attacks and ground stomps
bypass it. Release guard before striking or casting. **Q** casts the existing
26-damage Fireball for 20 mana; mana regenerates after four seconds without a cast.
The release gesture, melee swing, dodge and guard cannot overlap. The real
projectile, damage and spell HUD are shared with the campaign. Briefings, Help and
results freeze spells; retry/exit removes projectiles. In-world practice restores
the original campaign mana on exit.

Trials have no time limit; the campaign encounters keep their existing deadlines.
The battle report holds simulation time immediately while allowing a bounded
0.7-second visual settle, so defeated actors finish falling and survivors lower
their weapons before the scene freezes. Scaled bodies land on the same floor.

Round ten is the Ogre bruiser, with a heavy club sweep, overhead, and close-range
circular stomp. Its larger body blocks movement, its attacks cannot be staggered,
and its long recovery allows multiple counters. It has 200 health, 35% physical
protection from its thick hide, and no shield; damage and timing use the same
attribute system. `content/characters/ogre-bruiser.js` reuses the grounded ogre rig
with a bound wooden club and a dedicated stomp pose. The stomp does not consume
the next club attack in the sequence; every move commits its heading, deals at
most one hit, and has a warning that matches its actual reach.

Rounds 11-15 introduce linked attacks, slow shield turning, ranged spells,
regeneration and interruptible restoration. The elf commits to two cuts before
opening; the dwarf has a fully blocking shield, a close shove and a bounded turn
rate. The mage commits the aim of a traveling bolt and exposes a long cast
recovery; nearby opponents provoke his staff sweep. The troll heals 2 health per
second until Fireball suppresses regeneration for six seconds. Its HUD keeps the
healing state visible beneath attack warnings. The knight restores 35 health
through a 2.4-second ritual after an eight-second cooldown when sufficiently
wounded; staff damage or Fireball interrupts it. All are beatable with ordinary
staff, movement and dodge inputs at starting stats. These are training apparitions,
not new campaign army units.

`gameplay/combat/advanced-trials.js` owns profiles; `trial-mechanics.js` owns their
bounded encounter-local behavior. `content/characters/advanced-trial-actors.js`
owns their silhouettes and equipment. `app/exploration/trial-magic-view.js` uses
a fixed pool of eight bolt effects and one restoration effect, with no extra lights.
Enemy spells pause with Help and disappear on outcome, retry or exit.
Run `--advanced-trials-checks` with the same native command below for screenshots
and focused checks of the real spell interactions. `--advanced-trial-design-review`
produces a contact sheet of the five new rigs. Model regressions live in
`tests/advanced-trials.test.js` and `tests/combat-trials.test.js`.

The sword-only bandit's frontal parry reduces staff damage by 55%; a raised militia
shield stops it completely. Flanking and countering a missed attack bypass the
shield. Militia wears cloth without helmet or mail. Spears have longer, narrower
thrusts; axes hit harder with longer recovery; maces bypass much of physical armor.
The Orc Raider also carries a wooden shield with full frontal protection, alongside
his heavy axe. Orc troops have bald scalps, angular brows, narrow amber eyes, and
exposed tusks; their custom faces are batched into one draw per head.
Professional armor reduces connecting physical damage. Veteran Ambron troops wear
a sunburst honor badge; veteran orcs have the badge and an ivory crest.

`gameplay/combat/combat-units.js` owns shared unit attributes, equipment, mitigation,
and human defaults. Unknown human factions default to militia; explicit Ambroni
soldiers are professionals and Ambroni officers use the veteran tier. Authored
special NPC profiles remain explicit. Lizeemi columns, frontline representatives,
sentries, aftermath soldiers, and both sides of playable battles use militia with
varied weapons. Named Lizeemi commanders retain their own designs; their combat
profiles now use the same equipment and attribute calculations as the trials.
The older adventure adapts ordinary human army profiles at its engine boundary.

`gameplay/combat/commander-combat.js` gives both captains veteran sword/shield
training (power 13, quickness 14, mobility 8, 25% physical armor), with vitality 20
preserving their 200-health campaign records. Duels and combined battles share
the profile and preserve wounds. Allied blows use the actual weapon arc, active
window, shield openings and armor penetration. Warning geometry is cached by its
actual reach and angle, so a captain's sword cannot inherit an older drill's larger
warning footprint just because the attack names match.

The independent simulation receives `encounterSoldierHealth` as scenario data.
Battlefield and roadside result validation use that health budget plus the active
enemy captain's remaining health. This accepts legitimate 100-health militia
damage reports without weakening casualty or commander-fate validation; older
50-health reports still replay. `tests/scenario-combat.test.js` checks the budget
against the shared militia stats, both captains, guard rules, warnings and results.
Run `node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --scenario-combat-checks`
for actual campaign F/Q controls, duels, both league assaults and Save/Continue.

`content/characters/army-unit-view.js` renders these units; combat snapshots and
models share equipment choices. The existing guard drills remain separate exercises.
Run `node scripts/launch.cjs --exploration --combat-testing --smoke-test --internal-review --combat-trials-checks`
for all fifteen rounds, custom stats, all four militia weapons, retries and cleanup.

## Run and try it

Double-click **Explore Azhora.cmd** in the project root, or run:

```powershell
npm run start:exploration
```

Choose **Explore the World** to explore as Teresod outside the Guild tower. Choose **Continue exploration** to restore an exploration save. `npm start` and **Play Azhora.cmd** open this shared menu. Use `npm run start:adventure` for the existing adventure.

Both new and continued Explore sessions offer **Full** or **Fast** loading. Full is focused by default and starts after ten seconds: it prepares every registered region before play, with a longer initial wait and higher memory use. Fast prepares the starting region, then streams nearby places during travel. Both use the same scenery and regional residency management, so distant prepared scenery need not occupy GPU buffers. The choice is per launch, independent of saves; `?load=full` or `?load=fast` supplies an explicit override. Campaigns keep their separate, lazy-loaded tower opening and regional scope.

Run `node scripts/launch.cjs --exploration --smoke-test --internal-review --explore-loading-checks` to check the real launcher, Fast startup, movement/map/save, Continue with the default Full countdown, and travel to an already prepared distant region. It uses an isolated save profile. The `loading-choice`, `exploration-loading`, and `region-loading` model tests cover defaults, readiness, scheduling, and failure cleanup.

| Action | Control |
| --- | --- |
| Walk | WASD, arrow keys, or Q/E for forward diagonals |
| Run | Hold Shift or Tab |
| Jump | Space |
| Turn the camera | Hold the right mouse button and drag |
| Zoom the camera | Mouse wheel |
| Open or close the map | M |
| Pause or return | Escape |
| Save exploration | F5, or Save exploration in the pause menu |
| Restore a save during play | Load saved exploration in the pause menu |
| Developer travel and reveal panel | F8, or Developer in the HUD |
| Land / dismount a developer mount | G |
| Fullscreen | F11 or Alt+Enter |

The map opens in Regions view and retains the existing geopolitical and stability layers. Those layers describe the existing opening setup; they are not a running simulation. Only visited territory is revealed. **Developer reveal all** is an explicit temporary override and does not add discoveries to the save. Chapter 1 links and the quest tab are absent from this build.

The **F8 Developer** panel grants a developer horse, dragon or bat immediately. Horse travel uses WASD and Shift to canter at the existing developer horse pace. Both ordinary and developer horses jump with Space; cantering increases distance but the developer speed multiplier does not increase jump height. The horse tucks its legs, reaches for landing and briefly compresses on touchdown. Swimming prevents jumping; dismounting waits for landing on clear ground. Bat and dragon use WASD to fly, Space to climb, Ctrl to descend, Shift to boost, Tab for turbo and G to land on clear dry ground. Right-drag still turns the camera. Switching between flying mounts preserves altitude. These are travel tools; the adventure's combat and dragon destruction controllers are not running.

Mounted jumps use the shared exploration gravity and bounded vertical collision sweep in `gameplay/movement/vertical-motion.js`. Low obstacles can be cleared; tall walls and overhead solids remain blocking, with clearance for horse and rider. Solid tops prevent falling into props, but parking and saving require returning to terrain or an authored walking surface. The rendered horse follows physical height during a jump; ordinary terrain smoothing resumes after landing. No new geometry or ongoing simulation for parked horses is added. `--horse-jump-checks` with the native exploration smoke test checks real Space/G input, ordinary/developer jumps, swimming and shore recovery, and records apex/landing screenshots; it also supports `--food-world`.

The alphabetical region dropdown contains all 132 atlas names: **117 playable destinations** and **15 disabled atlas-only regions** which do not have 3D world entries. Go loads the destination, searches for clear dry ground within its actual border, and arrives on foot. It does not complete quests or change faction control. Failed travel keeps your old position. **Reveal all map** in the panel and the map toolbar are synchronized; it applies to Regions, Geopolitical and Stability without changing saved discoveries.

Mounts and reveal are session-only developer conveniences. Land before saving from flight. A save made on horseback records the ground position and restores on foot. Returning from a save or teleporting removes the mount.

Saving is manual. Save before closing or returning to the start screen. Position, camera, elapsed exploration time and discovered hexes are written to `saves/exploration/road-checkpoint.json`. The internal filename comes from the shared atomic file writer; it is a separate file and format from `saves/road-checkpoint.json`. The new renderer cannot access the adventure save bridge. Starting a new exploration leaves the previous save untouched until Save is pressed.

For the first playtest, walk out from the Guild, turn and zoom the camera, jump, open M, toggle reveal on and off, then save and restart. Check whether the character feels grounded, the camera gives a useful view, discovery is legible, and returning to the save works. Explore further when those basics feel comfortable.

## Optional Lizeem world test

Choose **Begin Lizeemi War** on the start screen, double-click **Test Lizeem World.cmd**, or run `npm run start:lizeem-world`. This mode tracks Teresod's actual position, offers local campaign battles, and projects live control onto the existing M map. Open **F8 ? Computer test scenarios** for the Minora?Ovesos horse journey (fresh unsaved run) or the Caricas quick interception (current run). Press **P** to stop the active test; when idle it opens the chooser. New campaigns use the [elapsed adventure clock](../shared-clock-opening.md), beginning at dawn in Taleth's timeless tower and continuing through the entire war. Reading and tactical fights hold time; safe resting previews the next event. Existing saved campaigns and older autoplay rehearsals retain their original timing. Use M to follow the campaign and switch reveal off to test discovery. Dismissible war reports explain skirmish results and subsequent regional consequences in the open world. The [test walkthrough and architecture](lizeem-simulation.md#explore-inside-the-five-region-war) explain the clock, arena boundary and independent save. Ordinary exploration keeps its existing behavior and save slot.

Minora's [civic life and building register](../minora-civic-life.md) give its
existing buildings public purposes, four neighborhood identities, watch members
and representative residents. Doorstep inspections and local conversations read
the campaign's existing food ledger without adding population or a second economy.

## Uguth's repeatable combat training

The carved blue-lit door in Taleth's chamber leads back to the same Spirit and
Time realm used by the opening. Taleth also offers **Visit Uguth / Enter Spirit
and Time**, including from the lookout. Uguth remains beside the refuge and
teaches the shared one-on-one trial ladder. The matching refuge door returns to
Taleth's chamber. This works before choosing allegiance, during the war and after
it ends; training never chooses a league or opens the separate Minora exit.

`training/arrival.js` owns both the standalone opening and the repeat session.
Repeat visits reuse the exploration renderer, hold campaign/sky time, preserve
world state and return at the tower threshold. `training/stillroom-door.js`
reuses `arrival-door.js` joinery for the identical return door. Completed practice
is stored separately in `saves/stillroom-practice`; older campaigns may enter
without retroactively passing the opening gate. Existing lesson modules and
`chamber.js` remain available to legacy exercises.

Taleth's barn owl occasionally hops and stretches on its perch. Approach it and
use **Observe** or **F** to add it to the persistent bird life list; **J** reopens
the list. `bird-life-list.js` owns validation and storage, `birding-host.js` owns
observation UI, and `tower-birds.js` animates only visible-floor birds. The record
is independent of the war, with no plot rewards. Desktop storage uses the bounded
`saves/bird-life-list` slot.

`tests/guild-handoff.test.js`, `tests/tower-birds.test.js` and the native
`--stillroom-arrival-checks` cover the handoff, real trials, repeated door travel,
held campaign state, owl motion and persistent observations.

## The new entry and its responsibilities

| File | Responsibility |
| --- | --- |
| [index.html](../../index.html) | Minimal start, loading, exploration, pause and map interface |
| [exploration desktop host](../../scripts/exploration-desktop.cjs) | Separate Electron window, restricted local serving and exploration save bridge |
| [entry.js](../../src/app/exploration/entry.js) | Immediate start screen; imports the world application only after Begin or Continue |
| [exploration.js](../../src/app/exploration/exploration.js) | Scene, character, camera, input, map and session coordination |
| [exploration-touch.js](../../src/app/exploration/exploration-touch.js) | Touch controls for a phone: stick, buttons and look ([the host on a phone](exploration-mobile.md)) |
| [exploration-quality.js](../../src/app/exploration/exploration-quality.js) | Phone rendering default (`?quality=full\|phone`) and the once-a-minute frame-time log |
| [exploration-phone.css](../../src/app/exploration/exploration-phone.css) | Touch and phone layout of the HUD, cards and campaign map |
| [world-adapter.js](../../src/app/exploration/world-adapter.js) | Narrow access to the existing world builder, collision and regional loading |
| [movement.js](../../src/app/exploration/movement.js) | Fixed movement tuning without skill levels, stamina, damage or quest gates |
| [developer-travel.js](../../src/app/exploration/developer-travel.js) | World roster and safe arrival search |
| [exploration-mounts.js](../../src/dev/tools/exploration-mounts.js) | Developer mount models, flight, riding and landing |
| [checkpoint.js](../../src/app/exploration/checkpoint.js) | Small versioned exploration save format and validation |

The new host serves `index.html` at its root, matching the public static build. `exploration.html` redirects existing bookmarks to that shared entry. It does not pass through the old `boot.js`, `src/main.js`, title sequence or road checkpoint validator. The source remains beside the reference game, so shared geography and visual assets can evolve without copying the whole project.

## What the audit found

Run `npm run audit:exploration` to regenerate the module graph and shortest dependency paths in `tests/artifacts/exploration-dependencies.json`. It parses static imports and literal dynamic imports without executing the modules. It includes reachable developer checks, so the counts describe code reachability rather than downloaded bytes or startup duration.

| Entry | Reachable modules |
| --- | --- |
| Existing game `src/main.js` | 722 |
| Existing world builder `src/world.js` | 306 |
| Exploration entry, including optional world-test imports | 355 |

The new application does not import the old game entry, road checkpoint, combat controller or autoplay. Its own modules have no direct imports from quest, chapter or skill folders. An automated boundary check enforces these exclusions.

**The world is not yet independent of legacy content.** Fifty-one transitive modules remain under quest, chapter or skill folders. Many combine reusable scenery, coordinates or appearance with old gameplay definitions. The added bat dependency is its visual model only. Importing them also evaluates their module-level data and any registration side effects, even though the exploration application does not construct their progression controllers.

| Coupling | Why it remains | Eventual separation |
| --- | --- | --- |
| World builder to farming, woodcutting and birding files | Fire locations, tree species, reserved ground and garden scenery share files with skill definitions | Move physical world definitions into world or regional content modules |
| World builder to quest homes, lighthouse, forest places and roadside content | Buildings and authored spaces belong to the current landscape | Separate permanent places from their optional encounters and quest state |
| Peninsula scenery to tutorial definitions | The geography and tutorial layout share constants | Give the physical peninsula an independent layout module |
| Map layer to authored campaign descriptions | Current ownership, stability and chapter presentation share map modules | Give a future simulation its own read-only map data interface |
| World construction to every region's builder | Builders and terrain metadata are eagerly imported even when geometry streams later | Load regional construction code on demand after measuring the main costs |

Moving whole quest or skill folders into an archive would break these paths. A branch alone would also leave the current runtime's coupling unchanged. The safer first boundary is the separate runnable application and its adapter; the remaining extractions can follow measured need.

## Shared code separated in this step

- Collision and movement functions now live in [locomotion.js](../../src/gameplay/movement/locomotion.js). The old `game-state.js` re-exports them for existing callers and keeps its tutorial definitions.
- Character and map drawing read [marker-style.js](../../src/world/actors/marker-style.js), which contains appearance data. They no longer need quest rules merely to obtain marker colours and shapes. Existing quest imports retain compatible exports.
- Rollo's visual definition lives in [rollo-look.js](../../src/content/characters/rollo-look.js), independent of campaign character selection and starting skills.
- The existing map accepts an optional `includeQuests` setting. It defaults to true for the reference game; exploration disables it.

The original separation rewrote no region geometry and deleted no existing quest or skill files. The later Lizeem work adds a separate core in `src/simulation`; only the optional world-test mode runs it here.

## Verification and limits

```powershell
npm run test:exploration
npm run test:exploration:desktop
npm run audit:exploration
npm run check:layout
npm run check:modules
```

The initial separation passed 89 exploration/shared regression tests. The developer additions passed 17 focused exploration and flight tests, including complete destination coverage, safe arrival searches, horse speed and water boundaries. The expanded native check passed 48 initial assertions and five fresh-renderer reload assertions, covering movement, map fog/reveal synchronization, dropdown travel to West Ithzel, all three mounts, flight switching and landing, airborne save rejection, teleporting out of flight, mounted save restoration, and absence of the old runtime and save bridge. Native results are recorded in `tests/artifacts/exploration-checks.json`; screenshots include `exploration.png`, `exploration-map.png`, `exploration-developer.png`, and one image for each developer mount in that directory.

The existing world still does substantial preparation before the first playable frame. The start screen appears before the world import, regional geometry is prepared near the traveler, and crossing into an unfinished region pauses movement while it loads. The verified runs took roughly 58 to 66 seconds to reach play on this machine, including a fresh renderer loading the saved region. A smaller dependency graph alone does not establish a fast startup.

This is a first exploration build. The old population, dialogue, quests, skills, combat, inventory and progression controllers are not running. Some scenery still reflects its original authored use; buildings, gates, unfinished regions and terrain retain their existing limitations. Basic swimming has no drowning or skill progression, and jumping has no fall damage. Full climbing and the other specialized adventure travel systems remain in the reference game; the exploration panel provides developer horse and flight travel.

The successful native process reported no renderer errors. Electron still emitted the GPU shutdown diagnostic seen in the reference game; that host-level issue remains unresolved.

Combat refinement and replacement quests remain future work. The bounded geopolitical core and first hero encounter connection are available in the optional Lizeem world test.

Minora river scenery uses bed-founded curtains and a stone culvert for the garden beck. `minora-river-route.js` precomputes two low trading-barge lanes through separate White Bridge arches, using shared quay and berth envelopes in `river-navigation.js`. `minora-river-traffic.js` draws one guard galley and two moving barges with seven crew in six batches (4,242 triangles). Hull transforms and the merged crew meshes animate; hidden regional roots sleep and distant crews update less often. The lookout creates the same live vessels, while its offline export excludes dynamic roots so boats are never baked as stationary duplicates. Run `node --test tests/minora-river.test.js` and `node scripts/launch.cjs --exploration --world-war --smoke-test --minora-river-checks` for foundation, navigation, bridge clearance and live-view checks. Rebuild `npm run build:lookout` after changing static Minora scenery.

The Lizeem rehearsal selects a dry, clear approach through each battlefield boundary in `war-entry-route.js`; the normal movement and battle-entry rules still decide whether entry succeeds. Autoplay speaks to Corris and acknowledges his news, including victories that occur between player battles. Reading pauses follow visible text length. `--campaign-autoplay-checks` tests the complete West route; add `--east-side` for East. Add `--internal-review` to render the smoke test offscreen without touching the player's save.

Resume follows manually completed dialogue: Taleth's briefing flag, Bear's horse ownership, Corris's unread receipt, and the lookout's displayed page. Closing an unfinished conversation reopens it; a completed handoff proceeds without replaying its campaign effects. Travel restores its prior running/paused clock regardless of mounting. Add `--autoplay-dialogue-checks` to the full campaign check to exercise manual reins, Next/Previous view, closed panorama and final-tour handoffs. The native takeover and modal checks also cover Taleth's introduction and Corris's postponement/acknowledgment. Battlefield entry and F interaction use each battle's actual radius, matching its dome and map outline.

The offline lookout optimizer retains authored tree placements and colours. Small, untextured, flat-shaded instanced meshes have a maximum 0.75-pixel simplification error at the reference 720p view; other meshes keep the 0.35-pixel limit. Layered building detail remains protected. `--lookout-performance-checks` captures the river, Ambron, Pyra and northern views with rendering statistics. Ambron's chart boundary and walkable wall circuit both derive from `AMBRON_OUTLINE`; regenerate the lookout after changing it.

Water shaders must participate in scene fog just like their banks. The western rivers, Caloss, Elagos lakes and local ponds carry fog uniforms and shader chunks; the lookout export preserves them. The flight portion of `--battlefield-checks` checks visible water materials and captures the distant horizon, where an unfogged river otherwise appears as a floating blue strip.

Caricas combat identifies the two army captains in `commander-hud.js`, with current morale and a temporary announcement when either falls or retreats. The existing focus controls include **Target captain**, subject to the same view, range and obstruction checks as other targets; its availability is checked four times per second. No actors or scenery are added. Interception receipts name the captain still awaiting the player, and aftermath soldiers remember both leaders' recorded outcomes. The duel remains an earned advantage: allies can finish a weakened formation, while ordinary combined combat still benefits materially from Teresod taking part.

`assaultMorale()` carries prior regular casualties into a resumed assault without counting routed survivors as kills or applying commander losses twice. Initial snapshots include the correct morale before the first combat step. The squad also records a last allied death before regrouping, even if the enemy line broke in that same step. These are derived from existing saved records; there is no save-format change.

Run `node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --champion-duel-checks` for both opening routes, commander targeting, the morale announcement, survivor/Corris conversations, East duel victory, saved combined withdrawal/re-entry, and Reaper retry. `--caricas-commander-only` skips the older duel checks for a focused rerun. Artifacts are `tests/artifacts/champion-duel-checks.json` and `caricas-*.png`; the native check uses an isolated save. Focused model checks are in `army-commanders`, `allied-assault`, `battle-story`, `combat-focus`, and `soldier-contact` tests.

Live campaign objectives distinguish a resumed interception from the final assault. Resolved battlefield bookmarks clear on refresh and restore, leaving the current objective to explain the next step without automatically choosing another front. Corris's short battle summary names fallen, routed or captured captains from that battle's recorded event. His collapsed reasoning separates the current strategic comparison from the explicitly dated report; the short conversation and historical record stay distinct.

Loading a checkpoint also resets Taleth's transient dialogue page and projection. An unfinished review starts at the river; a completed save retains its optional-tour menu. This prevents a different save from inheriting the previous session's second page and skipping the opening review.

The full `--campaign-autoplay-checks` now audits arrival deadlines, actual army captains in later assaults, and exact command-history reconstruction at its checkpoints. `--campaign-ending-checks` separately seeds legal West, East and unattended outcomes, then checks the actual council and civilian conversations, gate flags, first-person review, Chronoscope and Save/Continue. It also checks Corris's two-front advice. These ending fixtures supplement the ordinary-input autoplay; they do not stand in for combat playthroughs. Artifacts are `tests/artifacts/campaign-endings.json` and `ending-*.png`.

Snero Fold's lower chamber uses four static batches for an impossible-depth study, travel belongings and three cases hanging at unusual angles. The study is a visual spatial experiment behind a rail; it is not a travel portal. `senro-windows.js` now draws four live, perspective-correct windows: Cold Stones north, Azhor Stones south, Drent east and West Oremindi Mountains west. Each uses the actual regional world's 3D geometry, with animated water. Moving the camera changes the off-axis view and reveals different landscape behind the frame; the old JPEGs are no longer used. The sill is 1.05 metres high. Geometry loads only when an opening is visible, and only visible windows render, capped at two 512-pixel-wide targets. No remote campaign, NPC simulation or walkable exterior loads. Cached window scenes release when the tower is disposed. Rebuild after regional scenery changes with `node scripts/build-snero-windows.mjs`; `snero-window-views.js` owns the destinations and shared aperture dimensions. Stable `senro` IDs remain for save compatibility. Run `--snero-window-checks` with the exploration smoke launcher to check all four views, perspective movement, frozen time, resource lifetime and screenshots; `--tower-floors-checks` covers ordinary walking approaches and Save/Continue.


## The expanded Wizard Guild

The physical spiral now joins eleven chambers. In ascending order: Helba Rootree,
Odran Quill, Nessa Duskmere, Veyra Morrow, Snero Fold, Taleth, Hadrin Brightlock,
Neris Manyface, Oris Bellwake, Maelon Mattermeld, and Bolbur Faunad Beastbester.
`guild-expansion.js` owns the eight new identities, topics, palettes and relative
levels; `tower-floor-layout.js` remains the shared source for walking support,
stair architecture, signs, and floor selection. The older staircase progress
values and Snero's internal `senro` identifier remain compatible.

The lower and upper chamber builders provide distinct, merged furnishings and a
small set of animated demonstrations. `guild-exhibits.js` supplies proximity,
view and dialogue data; the workshop host now serves all floors. Neris changes
the real player model through `guild-disguise.js`; leaving his floor or loading
restores the usual appearance. Oris has quiet sound cues, with equivalent visual
motion and text. Demonstrations are repeatable and introduce no campaign powers,
quests, allegiance changes or saved progression flags.

Neris's standing mirror uses `neris-mirror.js` and `world/scenery/planar-mirror.js`
to reflect the actual room and player, with a clipped reflected camera. Its single
768-pixel target updates at most 30 times per second, only while the glass is
nearby, facing the camera and in view; it adds no shadow-map update. The mirror
offers the ceremonial mask, an elf, a goblin, and immediate restoration. Borrowed
bodies animate during exploration without replacing the gameplay actor or its
collision dimensions. The choice view retains the player in third person.
Run `--guild-expansion-checks --guild-mirror-checks` for the isolated native review.

New room contents construct on approach. Only the nearest floor's light and
visible room animations run. Bolbur's top landing opens directly onto a
1,440-metre folded landscape instead of a furnished chamber. The terrain's
edge meets the physical spiral doorway; meadow, woodland, pine uplands and
wetland are connected by ordinary walking. There are no climate signs or
teleport actions. Bolbur greets the visitor on first arrival, and the same
doorway returns to the stairs. All campaign and sky time remains frozen.

`guild-sanctuary-layout.js` owns the height-aware bounds, entrance and trails;
`guild-sanctuary-landscape.js` shares triangle interpolation between rendered
terrain and foot support. The final flight prefetches the small sanctuary
module and constructs terrain in yielding stages. The doorway waits safely
if construction is unfinished. It adds no sanctuary geometry at game startup,
and never loads the exterior campaign world. Old disconnected-sanctuary saves
are relocated to the new entrance.

`sanctuary-roster.js` specifies twelve real North American species in bounded
home ranges; `sanctuary-animal-models.js` owns their metre-scale silhouettes and
anatomical details. `sanctuary-wildlife.js` builds and animates only nearby
species, sharing instanced body, head, leg, wing and ground-shadow geometry. The minimap reads the same trails and pond as the scenery. Distant groups
sleep, and the complete landscape switches off on lower floors. No world-wide
fauna catalogue, per-animal physics or additional scene rendering is needed.

Run the focused `guild-expansion`, `tower-floors`, `tower-training`,
`tower-opening`, `adventure-time` and `wildlife-loading` model tests with
`node --test --test-isolation=none`. The hidden native review is
`node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --guild-expansion-checks --test-size=1280x800`.
It walks every new stair flight, meets each wizard, uses each demonstration,
checks frozen campaign and sky time, and saves/restores the lowest floor,
highest floor and sanctuary. Add `--guild-sanctuary-only` for the final stair flight, both continuous trails,
all twelve species, save/load and return-walk checks.
The original `--tower-floors-checks --test-size=1024x600` covers the existing
three floors, Snero's four windows, Hadrin's machinery, Taleth's training room,
allegiance and the locked exterior door. Artifacts use `guild-expansion-*`,
`guild-sanctuary-*`, and `tower-floors-*` under `tests/artifacts`.

Each developed floor also has one resident bird, defined in
`tower-bird-roster.js`: Taleth's barn owl, Snero's barn swallow, Hadrin's
Eurasian magpie, Veyra's mourning dove, Nessa's snowy owl, Odran's common
raven, Helba's ruby-throated hummingbird, Neris's blue jay, Oris's domestic
canary, Maelon's belted kingfisher and Bolbur's peregrine falcon. These are
decorative residents, independent of campaign messages and the lookout's
existing pigeons. Bolbur's wider sanctuary retains its wildlife.

`tower-bird-model.js` supplies metre-scale bodies with species markings;
`tower-birds.js` supplies open themed perches and local idle motion. A resident
and its perch use five merged draw batches, no new lights, textures or shadow
passes. Birds construct with their room, sleep on hidden floors and beyond
32 metres, and do not advance campaign time. The hummingbird hovers among
flowers; the other birds turn their heads and occasionally stretch their wings.
Perch collision stays clear of the central aisle, exhibits and stair doorway.
Run `tests/tower-birds.test.js` for geometry, scale, collision and lifecycle
checks; `node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --guild-bird-checks --test-size=1280x800`
captures all eleven residents and checks hidden-floor inactivity in the game.

## Spirit and Time arrival

New **Begin Lizeemi War** journeys first run `training/arrival.js`. Teresod
appears in the Stillroom; Taleth approaches, settles into an idle pose, and
explains the Guild's assignments across places and ages. After Continue, he
walks into the Azhora door and leaves Uguth in charge. Uguth has a bare crown,
gray beard, mithril chain mail and a two-handed back sword. The campaign does not
exist yet, so its clock cannot advance during preparation. Existing campaign
saves, Explore, Combat Testing, and earlier rehearsals keep their entry paths.

The opening uses `openWorldSkirmish`, the ordinary trial profiles and hero
attributes, and `createFireballHost`. It does not have a second combat model.
Uguth coaches the bramble goblin, wolf, bandit, and sword-and-shield militiaman
rounds. Four consecutive victories grant approval; the result offers the
Azhora door, the remaining trial ladder, or free exploration. Defeat and
withdrawal preserve earlier wins. An explicitly labelled temporary tutorial
skip grants permission without inventing victories.

`arrival-progress.js` owns ordered victories and the approval gate. The desktop
bridge stores its small versioned record in `saves/stillroom-arrival`, separately
from the running war slot. Continue resumes the next unfinished trial. Portal
departure emerges from the matching door in Taleth's chamber at 00:00, with allegiance still
undecided. Only after saving that tower checkpoint does the launcher clear the
arrival record, so a failed load can be retried. The earlier war save remains
intact until this handoff succeeds.

`arrival-scenery.js` builds one furnished refuge: a columned porch, stopped clock,
small turrets, hearth and chairs, bookcases, a worktable, travel cases, hourglass,
armillary sphere, and a carved arched double door. `arrival-door.js` adds timber
panels, strap hinges, ring handles, an hourglass emblem and a limestone surround
to the refuge's static batch. Faint blue light escapes its joints using one
small emissive batch and a shadowless local light. It has no portal image or
destination plaque; Taleth and the nearby prompt explain where it leads.
Static furniture is merged into
one mesh; movement and camera use static boxes. The fog field uses no terrain
streaming or volumetric simulation. The independent training/exercise pavilion
remains in `chamber.js` for existing exercises.

Run `tests/stillroom-arrival.test.js` for progression and storage, and
`node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --stillroom-arrival-checks`
for the real opening, staff block/Fireball, four victories, a failed attempt and
retry, mid-preparation reload, optional fifth opponent, skip, tower handoff,
return visits, bird observation and the two opening battles for either allegiance.
Artifacts are `tests/artifacts/stillroom-arrival-*`. Other native checks declare
`fixture=tower` to keep testing their existing tower/campaign starting point.

Shared world skirmishes now hold their result prompt for 1.25 seconds after
combat resolves. `world-skirmish.js` advances only the grounded defeat poses
(a .65-second fall followed by a readable hold); health, position, combat time,
and campaign time remain fixed. Result callbacks still record the outcome
immediately. `battle-result-dialog.js` hides combat controls and consumes keys
during this beat, then opens the normal accessible result dialog. Losing window
focus pauses the beat; disposing a fight cancels it without a delayed timer.
The arrival native check captures the goblin falling, settled, and at its report;
`--combat-trials-checks` verifies grounded falls across the complete enemy ladder.

Use `--stillroom-door-checks` with the same hidden native launcher for approach,
oblique and close views, solid-door collision, and locked/approved interactions.
This is the first example of the environmental-sign approach in `AGENTS.md`:
materials, construction and meaningful emblems establish identity; descriptions
belong in interaction text. Other existing world signs have not been replaced.


## Tree observations and botanical scenery

The Nature life list opens with **J**, with separate Birds and Trees tabs. In
Chapter 2 the story journal uses **Shift+J**. Approach a visible tree and press
**F** to record its species. Observations do not change skills, resources or
campaign outcomes. The tree list uses `azhora-tree-life-list-v1`, independently
of the existing bird list; the desktop bridge stores it across loopback-port
changes. Existing bird records remain untouched.

`world/life/tree-species.js` defines 45 real botanical identities and their
identification notes. Legacy instance and timber IDs remain stable, but seven
former fantasy species are now regional common names for real trees:

| Local name | Official species | Botanical name |
| --- | --- | --- |
| Acor | English oak | Quercus robur |
| Grey Vault | European beech | Fagus sylvatica |
| Pale Witness | American sycamore | Platanus occidentalis |
| Bloodoak | Northern red oak | Quercus rubra |
| Midnight Elm | Wych elm | Ulmus glabra |
| Ridgeback | Sweet chestnut | Castanea sativa |
| Deeproot | White oak | Quercus alba |

Aliases resolve to one life-list record, with local names displayed explicitly.
The shared species renderer provides branching habits, canopy proportions and
bark details, with two instanced parts per species/spatial batch. Authored
veteran roots and tree-supported architecture in Ibenwood remain in place.

Every new physical tree must have a stable species and instance ID and register
its actual visual handles with `tree-registry.js`. Protected trees merged into
scenery may register their visible owner instead. `nearestVisible` uses spatial
cells, actual instance state and visible scene ancestry; the observation helper
also checks loaded terrain, line of sight and floor height. Felled, hidden or
unloaded trees cannot be logged. Bowden's teaching woodlot keeps its separate
harvesting controller and synchronizes a private observation registry. The
active sanctuary registry is exposed only while inside its walkable landscape.

Focused checks: `tree-species.test.js`, `species-trees.test.js`,
`tree-observation.test.js`, `lizeem-agriculture-trees.test.js` and the affected
town/orchard checks. Native `--tree-observation-checks` exercises F, J, storage,
tabs and felling/restoration. `--tree-scenery-review` captures species, field
edges, the main Lizeem bank and the journal in the isolated game instance.

## Canerd's sacred garden and household

Canerd Castle in Celder retains its existing gate, hall, stables and walked
battlements. `content/regions/canerd/canerd-garden.js` adds a sheltered courtyard
garden with a roofed entrance, raked gravel, moss, a stone water basin and
lanterns. Its protected 24-metre English oak is registered with the same nature
life list as other trees. The oak's face is carved-looking living bark; its
eyes open during conversation and close afterward. It presently only grumbles
and asks to be left alone. It grants no quest, item, stat or campaign effect.

`CANERD_GARDEN` supplies shared scenery, walking and interaction anchors.
`canerd-residents.js` defines the Arbor Wizard, gardener, cook, steward,
stablehand and messenger. All six are human members of Celder's household.
Their conversation establishes its exclusion of other peoples and the tension
with pluralistic Laketown, without changing the separate diplomacy rules.

`canerd-life-host.js` lazily loads this small local cast only after the castle
is ready and the player approaches. `canerd-people.js` constructs at most one
rig per update, follows collision-checked routes, turns before moving and holds
the current speaker still. The Arbor Wizard spends most of the routine in the
hall, periodically visits the oak, and comments on the player's real tree
life list without adding observations. All dialogue uses the shared resident
host in Explore and Chapter 2 and keeps Teresod in third-person view.

Model checks cover the garden's open routes, oak animation and observation,
450 seconds of household routines, and lazy-loading lifecycle. Native
`--canerd-life-checks` walks the gate, hall and stable using ordinary movement,
talks to the oak with F, watches it close its eyes, checks the working cast and
shares a tree record obtained through the ordinary Nature observation control.
The save-free city viewer also includes Canerd:
`npm run review:cities -- --city=canerd` provides the full crown, garden and
sleeping-face views using the same castle geometry.

## Changing weather

`world/environment/weather-model.js` samples clear, partly cloudy, cloudy,
overcast and rainy conditions from existing elapsed adventure time. The same
saved time produces the same weather, including after a boat skip or battle
time advance. Neighboring temperate regions share a weather front; desert and
wetland climates alter its precipitation. Weather changes gradually and does
not change campaign food, movement or combat rules.

`weather-host.js` restores its previous lighting adjustments before day/night
lighting runs, then applies cloud cover, softer sunlight and rainy haze.
`weather-view.js` draws procedural clouds and a bounded rain effect, with local
roof shelter. Interior tower rooms, limbo and the Spirit and Time Realm retain
their own atmosphere. Pausing or losing window focus holds animation. F8 offers
a weather preview selector; returning it to Natural weather resumes the current
conditions without advancing or saving the campaign.

Rain and wind use the existing soundscape's Nature volume and AudioContext.
Shelter muffles rain, and wet weather reduces the provisional bird ambience.
The music keeps its place when weather changes. Internal demo recordings retain
the weather directions for their audio render. Model checks cover transitions,
lighting restoration, shelter and resource bounds; `--weather-checks` captures
the weather states and exercises the real castle roof, pause and recovery.
