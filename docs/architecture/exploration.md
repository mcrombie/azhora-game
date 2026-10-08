# Exploration starting point and dependency audit

The exploration build gives Azhora a separate development entry point for its world and hero movement. The existing adventure remains runnable and recoverable at the integrated checkpoint `070f84b`. Its quests, skills and story are available as reference material; they are not requirements for the new game design.

This first step includes one controllable character, the authored world, walking, running, jumping, swimming, a following camera, map discovery and a separate save. The ordinary exploration mode does not run combat or faction simulation. The optional [Lizeem world test](lizeem-simulation.md#explore-inside-the-five-region-war) adds the bounded five-region war, three-day battles at discovered world locations, local hero encounters and a separate combined save. In that mode, approach a battlefield flag and press **F** before its deadline to join. Caricas uses an on-foot reinforcement interception in its actual scenery, with X/click to strike, Space to dodge and Escape to withdraw; other sites still use the test arena.

The shared startup menu also includes the [Feradom-only Hearthfall workspace](hearthfall-sandbox.md), with its own Continue option. The original adventure is now launched with `npm run start:adventure`.

## Run and try it

Double-click **Explore Azhora.cmd** in the project root, or run:

```powershell
npm run start:exploration
```

Choose **Explore the World** to explore as Teresod outside the Guild tower. Choose **Continue exploration** to restore an exploration save. `npm start` and **Play Azhora.cmd** open this shared menu. Use `npm run start:adventure` for the existing adventure.

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

The **F8 Developer** panel grants a developer horse, dragon or bat immediately. Horse travel uses WASD and Shift to canter at the existing developer horse pace. Bat and dragon use WASD to fly, Space to climb, Ctrl to descend, Shift to boost, Tab for turbo and G to land on clear dry ground. Right-drag still turns the camera. Switching between flying mounts preserves altitude. These are travel tools; the adventure's combat and dragon destruction controllers are not running.

The alphabetical region dropdown contains all 132 atlas names: **117 playable destinations** and **15 disabled atlas-only regions** which do not have 3D world entries. Go loads the destination, searches for clear dry ground within its actual border, and arrives on foot. It does not complete quests or change faction control. Failed travel keeps your old position. **Reveal all map** in the panel and the map toolbar are synchronized; it applies to Regions, Geopolitical and Stability without changing saved discoveries.

Mounts and reveal are session-only developer conveniences. Land before saving from flight. A save made on horseback records the ground position and restores on foot. Returning from a save or teleporting removes the mount.

Saving is manual. Save before closing or returning to the start screen. Position, camera, elapsed exploration time and discovered hexes are written to `saves/exploration/road-checkpoint.json`. The internal filename comes from the shared atomic file writer; it is a separate file and format from `saves/road-checkpoint.json`. The new renderer cannot access the adventure save bridge. Starting a new exploration leaves the previous save untouched until Save is pressed.

For the first playtest, walk out from the Guild, turn and zoom the camera, jump, open M, toggle reveal on and off, then save and restart. Check whether the character feels grounded, the camera gives a useful view, discovery is legible, and returning to the save works. Explore further when those basics feel comfortable.

## Optional Lizeem world test

Choose **Lizeemi War Scenario** on the start screen, double-click **Test Lizeem World.cmd**, or run `npm run start:lizeem-world`. This mode tracks Teresod's actual position, offers local campaign battles, and projects live control onto the existing M map. Open **F8 ? Computer test scenarios** for the Minora?Ovesos horse journey (fresh unsaved run) or the Caricas quick interception (current run). Press **P** to stop the active test; when idle it opens the chooser. It starts paused with developer reveal on; use the campaign controls on M and switch reveal off to test discovery. Dismissible war reports explain skirmish results and subsequent regional consequences in the open world. The [test walkthrough and architecture](lizeem-simulation.md#explore-inside-the-five-region-war) explain the clock, arena boundary and independent save. Ordinary exploration keeps its existing behavior and save slot.

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
