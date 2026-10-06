# Peninsula tutorial and foundational movement skills

Design and implementation record, 2 October 2026. **Implementation authorized by the user** together with West Oremindi/Sevron. The confirmed opening, lesson sequence, independent Chris routine, and escape encounters are implemented. The tuning decisions adopted for this first pass are recorded below; they remain adjustable.

## 1. Confirmed direction

The two new forest hexes east/northeast of Tidewater Haven become the tutorial peninsula. Keep the arrival by boat and pier, now serving the peninsula; Jojo meets the player there. Move the teaching stations here without turning the whole headland into a village or clearing away its forest.

After loading a new game, offer **Start tutorial** and **Start game**. Starting the tutorial commits the player to completing its lessons before leaving. Starting the game skips forward through those lessons instead.

The user explicitly confirmed both timing decisions:

- Ed the Word's ship begins arriving **when Glun gives the final letter**.
- **Start game** begins **just after that handoff**, with basic skills and the letter already earned, and Ed's arrival beginning. It does not skip onward to enlistment.

The final teacher list overrides the earlier spoken variations:

| Teacher | Lesson |
| --- | --- |
| Chris Scotwood | Walking |
| Jojo | Sandwich/inventory introduction, Running, and Cooking |
| Officer Glun | Arms/combat |
| Bear | Cartography |
| Jess | Swimming |
| Ryan | Fishing |

Use existing identities rather than create duplicate characters. Chris Scotwood is currently `merc-gotwood`; “Chriscott Wood,” “Chris Godwood,” and “Chris Scottwood” refer to that person for this plan. Glun is `instructor`. Bear is Jess and Ryan's son, currently Barrett (`willowmere-barrett`), not Kayla's bear cub. Display-name changes remain a separate decision. Tidewater Haven is the existing Tidehaven settlement, and the army is the Ambroni army.

## 2. New-game choice and skip contract

The existing Full/Fast loading chooser stays separate: Full remains the ten-second loading default. Once loading and character selection are ready, the two new-game buttons explain their story consequences. Do not add another countdown that makes this choice for the player. Continue resumes an existing adventure without replaying the choice.

- **Start tutorial:** arrive at the peninsula pier, meet Jojo, learn the basics through short practical quests, then receive Glun's letter.
- **Start game:** a brief time-passing transition says the basic training is complete. Begin beside Glun at the peninsula exit, with the letter and the next objective to report to Tidewater Haven for enlistment. The exit is open and Ed's ship sequence has just started.

Skipping uses one explicit, repeat-safe completion transition. It grants the same essential taught skills, baseline lesson XP, chart, normal training equipment and letter as completing the lessons. It represents catching and cooking the fish, without granting an uncooked duplicate or extra tutorial reward. Recommended inventory baseline: retain Jojo's sandwich unless the normal tutorial requires eating it; provide the ordinary finished cooked fish. Grant neither accumulated travel mastery nor repeated lesson rewards. Preserve stronger starting-character skills and equipment.

Advance the shared calendar by a documented, fixed tutorial interval, calibrated after measuring an efficient run. Apply relevant world schedules through the existing clock rather than only changing the clock display. Anchor Ed and the dependent company arrivals **after** that time advance so the skip cannot consume them. Chris has completed his lessons and reached his Tidewater Haven waiting point during this baseline interval, and leaves when the handoff event fires.

Once **Start tutorial** has been selected, there is no ordinary in-session skip or fast travel out. The opening alternative belongs to new-game setup. Restarting a new game and choosing Start game remains possible. Pause, save and Continue remain available throughout training.

## 3. Peninsula arrangement

Recommended layout, subject to measured ground and water checks:

- A small arrival pier on the sheltered, village-facing side. Jojo and Chris can be seen immediately; Jojo can be addressed without first solving a movement lesson.
- A short walking and running loop between trees, leading to Glun's practice clearing. Use natural landmarks and discreet route markers, not a large obstacle course.
- Bear's map spot close to Jojo, with both the inlet and the land route visible.
- Ryan's fishing ledge and Jess's shallow, sheltered swimming cove. The exercise stays comfortably within a novice swimmer's range and far inside the danger boundary.
- Jojo's already-lit cooking fire near the shore, and Glun's final handoff beside the land exit.

Keep the recently added oak/pine forest, wildlife, sandy edges and open harbor channel. Do not expand the peninsula again or connect it to Peblos. Exact pier and trail coordinates need a layout pass against the real terrain; the two new hexes are `(16,105)` and `(16,106)`.

**Land exit adopted for the implementation:** a visible timber gate at the mainland neck opens for the player after the letter. Chris earns his own clearance after his lessons and can leave independently. Plan an actual controlled crossing for him, with a fallback that returns a player who tailgates, climbs around or clips through to the safe side with a clear “finish your training” explanation. Do not rely on an unexplained invisible wall or accidentally cage Chris until the player is ready.

Move daytime teaching posts, not the established family houses by assumption. Jess/Ryan/Bear/Rip's house and Glun/Jojo's house and their mailboxes remain in Tidehaven unless separately relocated. Ensure the teachers are available throughout an active tutorial. Jess stays one person: her peninsula lesson stand and Drent ferry berth need a coherent shared placement/routine. Suspend outbound ferry choices until sign-off; afterward preserve her existing travel network. Do not move the houses, add residents or remove Glun's other optional lessons silently.

## 4. Lesson flow

The initial few steps are guided; the middle opens into a small checklist. Every lesson distinguishes **introduced** from **practiced**, so hearing about a skill does not falsely complete its exercise.

| Step | What the player does | Completion and consequence |
| --- | --- | --- |
| Welcome | Speak to Jojo at the pier. Receive a sandwich; open the satchel and inspect it. Eating is optional. | Inventory basics recorded; sandwich granted once. This is not a skill award ahead of Walking. |
| Walking | Chris demonstrates ordinary movement. Walk a short marked stretch and stop near its end. | Walking is the first new skill learned. Use normal walking input, not forced crawling or literal infant animation. |
| Running | Jojo explains the faster pace, stamina and resting, and directs the player toward Glun. Run briefly, then recover. | Running introduced and practiced independently of Walking. |
| Arms | Talk to Glun; perform the existing basic strike, guard and dodge exercises. | Appropriate existing weapon-family combat training, not a duplicate generic Arms XP pool. |
| Cartography | Visit Bear near Jojo; receive/open the chart, locate yourself and identify the peninsula and Tidewater Haven. | Basic map use complete. No requirement to reveal a distant region. |
| Swimming | Speak to Jess, hear her boundary warning, enter the marked cove, swim a short route and climb out. | Swimming introduced and a real swim completed. Hearing the warning does not itself count as practice. |
| Fishing | Follow Jojo's referral to Ryan. Learn the controls and land a fish into the satchel. | An actual successful catch completes Ryan's lesson; a fish granted by another person does not. |
| Cooking | Return to Jojo with the catch and cook it at her fire. | Consume one raw fish and create one cooked fish, with the normal Cooking introduction and XP. |
| Graduation | Return to Glun after every required lesson. Receive his letter to the Ambroni recruitment post in Tidewater Haven. | Complete tutorial, open exit, set next objective, start Ed's arrival exactly once. |

Recommended flexibility: after combat, allow Cartography, Swimming and Fishing in any order. Cooking depends on the actual fishing result. Show a compact checklist and directions from characters, with one focused objective rather than several simultaneous instruction overlays.

Two existing dependencies need deliberate changes:

1. **Cartography currently belongs to Glun, not Tim.** Move the required first chart introduction to Bear. Preserve Bear's later random-region geography and its two-minute cooldown independently; the controls lesson must neither consume that cooldown nor reveal all terrain in the named region.
2. **Cooking currently requires Lee Anne's Fire Making lesson.** Jojo's tutorial uses an already-lit communal fire, allowing Cooking without learning to build/light a fire. Lee Anne retains Fire Making outside this required sequence. Stop supplying the free raw fish that would bypass Ryan. If the player eats, sells or loses the raw catch, Ryan remains available for another catch.

## 5. Walking, Running and Swimming progression

**Recommendation:** Walking and Running are the two new visible skills. “Getting better stamina” during running is represented by Running's efficiency benefits; stamina remains the shared resource. Existing Toughness continues to govern stamina capacity. This avoids introducing a third, overlapping Stamina skill without a clear separate purpose. A separately named Stamina skill is still an open design choice.

Keep novice movement comfortable. The “learning to walk” idea introduces the simplest action first; it need not make the player painfully slow or physically unable to move before speaking to a teacher. Basic movement inputs work before formal lesson acknowledgment. Practice can be recorded without letting another introduction displace Walking as the first tutorial skill.

| Skill | Practice that earns XP | Benefit |
| --- | --- | --- |
| Walking | Active time actually walking on foot | Gradually faster ordinary walking, with a hard cap below starting Running speed. |
| Running | Active time actually running on foot | Gradually higher running speed and lower stamina consumption; running always costs stamina. |
| Swimming | Actual swimming after instruction | Continue improving swim speed and efficiency through the existing practice system. |

Walking and Running count movement time, not held keys against a wall. Normal wandering, backtracking, repeated routes and computer autoplay all count. Do not substitute a novelty/exploration-only XP rule for the user's time-practiced rule. Pauses, teleportation, boats, mounts, falling, knockback and scripted relocations do not award either foot-travel skill. Sneaking and climbing retain their own systems and are not counted as ordinary walking practice.

Revised travel tuning, 2 October 2026: begin Walking at 6 m/s and Running at 9.5 m/s. Walking caps at 6.6 m/s and Running at 10.5 m/s. Peaceful running drains 4 stamina/s, improving toward 2.5/s; active combat doubles that cost to 8-5/s. Keep diminishing gains: learning improves an already enjoyable pace instead of unlocking tolerable movement. See [movement-tuning.md](movement-tuning.md) for rationale and validation.

The strict invariant is `maximum walk speed < minimum run speed` under equivalent ground/status conditions. Store Running's own speed curve rather than multiplying the player's improving walk speed and accidentally stacking both skills.

Running shares the combat/swimming/climbing stamina pool. Suppress ordinary regeneration while it drains, otherwise today's regeneration can erase the new cost. Exhaustion drops to walking; walking/rest recovers stamina. After exhaustion, Running resumes only at half of maximum stamina; ordinary walking continues throughout recovery. This prevents rapid run/walk flicker while the key stays held. Starting stamina, food and combat balance need a review together with this change.

Swimming already awards one XP per four actual metres and scales both speed and drain. Recommended first pass: preserve that working progression and its crossing balance; the user asks improvement through use, not identical units for every skill. Do not make its speed inherit Walking upgrades. Measure the new lesson against the weakest starting swimmer, with a generous return margin.

## 6. Chris as the example student

Chris follows the same tasks: greet Jojo, demonstrate/practice walking, practice running, train with Glun, use Bear's chart, swim with Jess, catch a fish with Ryan, cook with Jojo, and collect his own clearance. He takes a reasonably efficient route and does not wait for the player's checklist. Show real walking, fishing, swimming and practice actions when nearby. Offscreen progress respects route distances and task requirements; elapsed time alone must not count a blocked actor as having arrived.

**Avoid a Walking softlock:** Chris's short initial demonstration is recorded as a persistent lesson/hint when it occurs, and the player can perform its exercise later without chasing him. He can continue his own tutorial if the player idles. His introduction does not require him to wait forever at the pier or return from Tidehaven. If the chosen playable character is Chris, preserve the existing Cromb companion substitution rather than spawn a second Chris; exact demonstration wording should acknowledge that role.

After Chris finishes, he walks by land to Tidewater Haven. If the player is unfinished, he waits there. When the player receives Glun's letter, he leaves the village westward immediately if already waiting. If still en route, he finishes that walk and leaves without waiting for Ed. Tune the ordinary timings so his departure accompanies the incoming ship, but do not teleport him or delay the confirmed ship trigger to force synchronization in an unusual fast run.

His tasks, fish, lesson rewards and clearance are his own. They cannot consume the player's tutorial fish or complete the player's exercises. NPC conversations do not open player dialogue panels, and teachers remain available to the player.

Chris ordinarily reaches the existing rebel ambush alone. The current offscreen rule kills lone Chris against living rebels; intervention or clearing the ambush can save him. Preserve that for the first redesign unless a separate change is chosen. The user's “most of the time” is treated as the usual world outcome, not authorization to invent a new random survival percentage. His death or survival never prevents the player's tutorial completion.

## 7. One graduation event and a living world

Proposed saved event: `tutorialSignedOffAt` on the existing active-play clock. Glun's final handoff must atomically record completion, issue the letter once, open the exit, begin Ed's ship sequence and release Chris's Tidehaven wait. Reloading or re-reading the letter must not emit it again.

Today Ed's arrival and later company arrivals are anchored to Chris finishing his small existing tutorial. Replace that trigger for new tutorial runs with the player's final handoff. Preserve the existing sequence's internal spacing initially, including the visible approach and Ed being put overboard, unless subsequent staging needs a reviewed change. Ed the Word is distinct from Ed the chameleon.

The calendar and ordinary world activity continue during active play, including fishing and the time spent wandering the peninsula. Existing menus/dialogue pause policy remains. Only the explicitly gated opening event waits for graduation; the entire world is not frozen until the player cooperates. Loading time, startup choices and paused menus do not silently age the world.

## 8. The tutorial cannot be escaped

This rule applies only after selecting Start tutorial and before Glun's final handoff. It is lifted by completing the tutorial or choosing Start game at the opening. It does not turn the wider ocean or ordinary developer flight into permanent death zones.

### Sea escape

Jess warns during her lesson, using the user's intended wording:

> Don't try to swim out of the zone. I got a bad feeling about today, and you should just take it easy and finish the rest of the quests on the peninsula first to finish the tutorial.

A more in-world wording can be discussed later; do not omit the instruction to finish every lesson. A first approach to the outer swimming boundary should also display the warning, including if the player has not yet talked to Jess. Use visible cove markers and deep-water disturbance so a normal lesson cannot accidentally trigger the punishment.

If the player ignores the warning and swims beyond the safe area toward Peblos, a gigantic sea monster intercepts them before they can reach an island. It is overwhelmingly stronger than existing ordinary enemies. The encounter should communicate its scale first: a dark mass under the swimmer, water swelling, then a visible head/body rising before the lethal attack. **No unseen instant damage.** Provisional reveal window: roughly 2–3 seconds before the decisive strike, subject to camera testing.

Treat every unauthorized water exit consistently, including swimming toward the mainland or going around the far side of the peninsula. Do not leave a safe direction that defeats the tutorial restriction. Boating, ferries and water mounts cannot provide an unguarded alternate exit.

### Flying escape

Developer mounts can still be summoned and flown within the tutorial area. Attempting to leave it, including on the developer dragon, causes a huge winged fire-and-shadow demon to materialize and intercept the rider. The intended feel is Balrog-like: imposing, supernatural and obviously beyond the player's ability. Its exact appearance and name remain unassigned.

Give the materialization and attack enough visible time to understand what happened, then kill the player quickly. The encounter must intercept Tab-turbo flight rather than merely chase a much faster mount from behind. Check the traveled segment and height, not only the destination each frame; ascending over the boundary must not evade it. Briefly stage the interception so the camera can show the demon instead of letting the player fly past the entire reveal.

Both monsters are tutorial-boundary encounters, not bosses intended to be defeated or farmed. No loot, progression rewards or permanent creature kills. They do not pursue teachers onto land or damage Chris's independent route. Reusing the sea monster elsewhere later would need a separate design.

### Defeat and other bypasses

The player sees the attack and defeat, then returns to a safe peninsula checkpoint with restored health/stamina. Retain completed lessons, legitimate practice XP, inventory and the world clock. Do not re-grant the sandwich, rod, chart or rewards. Remove the temporary developer mount from the respawn and clear the encounter so it cannot kill the player again on land. This is a tutorial recovery rule even for otherwise harsher death settings; it does not unlock the exit.

Fast travel, Go Anywhere/Go to a Point and ghost movement must not silently bypass an active tutorial. Out-of-zone destinations should be unavailable with an explanation until graduation. A separate isolated testing scenario can deliberately start outside the tutorial without altering the normal save; it must be visibly separate from escaping within that save. Add a final zone check for clipping, climbing, knockback or reload outside the area, returning the player to the safe side. These fallback repairs do not replace the requested visible sea/air encounters for ordinary escape attempts.

## 9. Implementation outline

Keep a small versioned tutorial state separate from the old numeric main-quest stage: chosen path, introduced/practiced lesson flags, exactly-once item grants, final sign-off clock, Chris's task and route state, warnings seen, boundary encounter phase and safe respawn. Derive UI from this state rather than from physical proximity alone.

| Area | Existing integration points |
| --- | --- |
| Opening buttons, arrival pier/camera | `src/main.js`, `index.html`, `src/app/startup/opening-sequence.js`, world arrival anchors; leave Full/Fast loading choice independent. |
| Lesson objectives and markers | `src/gameplay/movement/game-state.js`, `src/gameplay/skills/instructor.js`, `src/ui/map/chart-lesson.js`, `src/gameplay/quests/quest-tracker.js`, `src/gameplay/quests/quest-markers.js`, `src/content/chapters/journey/story-chapters.js`. |
| Teachers, catches and cooking | Existing Jojo/Jess/Ryan dialogue, `src/gameplay/skills/fishing/fishing-lessons.js`, `src/gameplay/skills/crafting/campcraft.js`, `src/content/quests/skill-lessons/barrett-geography.js`, `src/content/quests/homes/family-homes.js`. |
| Movement and shared stamina | `src/gameplay/skills/skills.js`, movement host in `src/main.js`, `src/gameplay/combat/combat-skills.js`, `src/gameplay/movement/swimming.js`, climbing and mount exclusions. |
| Independent example and ship | `src/content/quests/roadside/landing-mate-quest.js`, `src/gameplay/company/company-route-host.js`, `src/gameplay/company/mercenaries.js`, `src/content/quests/roadside/word-arrival.js`, `src/gameplay/company/living-story.js`, `src/content/quests/road-ambush/road-ambush.js`. |
| Boundary encounters and recovery | A dedicated tutorial-boundary model/host using existing combat, flight, camera and checkpoint interfaces. |
| Saves and demonstrations | `src/app/saves/road-checkpoint.js`, `src/gameplay/autoplay/autopilot.js`, `src/dev/checks/main-quest-playtests.js`, native smoke hooks. |

Old adventures keep their location, taught skills, inventory, family identities, Ed's actual arrival history and campaign progress. Do not move an existing save onto the peninsula, replay Ed, resurrect Chris, or force new lessons on a veteran. Missing Walking/Running data receives a safe starting baseline. Old unfinished openings need an explicit legacy-continuation path rather than silently dropping them inside the new locked tutorial.

Recommended implementation order: state/skip contract; peninsula placements and lesson route; movement/stamina progression; Chris and event timing; boundary encounters; save compatibility; autoplay and visual review. The user subsequently authorized this implementation on 2 October 2026.

## 10. Acceptance and playtest plan

Add **Peninsula tutorial** as a main-quest computer-autoplay scenario. It completes every real exercise through ordinary controls, honors stamina, and stops after Glun's letter so Ed's arrival can be watched. Add focused boundary scenarios for the sea-monster and developer-dragon encounters; these preserve the normal saved adventure.

Verify:

- Full/Fast loading works with both new-game choices; loading speed never changes narrative timing.
- Manual and autoplay lessons complete, out-of-order middle lessons work, a lost fish can be replaced, and using a lit fire does not accidentally teach Fire Making.
- Walking remains slower than beginner Running at every level. Running drains the shared bar, exhaustion recovers smoothly, and XP is independent of frame rate and absent while blocked/paused/mounted/teleported.
- Chris finishes every task, can pass the land gate independently, waits correctly, never blocks a missed walking lesson, and does not duplicate when Chris is the playable hero.
- Slow player, fast player, skip, save/reload and tutorial death all produce one Glun letter and one Ed event. Chris's independent timing does not start the ship early.
- The safe swimming exercise cannot summon the monster. Ignoring the warning in any escape direction does. The monster is visible before lethal damage, and respawn preserves lesson progress.
- Dragon/bat flight and turbo/vertical escape cannot outrun the demon trigger. Camera, sound-off play, pause, save/load during the encounter, and respawn are readable and stable.
- Gate tailgating, climbing, fast travel and invalid restored positions do not bypass the tutorial. Completing or skipping releases every boundary restriction.
- Existing saves, family homes, ferry routes, Bear's geography cooldown, Glun's optional teaching, subsequent army recruitment and the rebel ambush retain coherent behavior.

## First implementation decisions

- Keep Running as the endurance skill; no separate Stamina skill. Walking progresses from 6 to 6.6 metres/second, below beginner Running at 9.5. Running caps at 10.5, with peaceful stamina drain improving from 4 to 2.5 per second and combat drain from 8 to 5. Exhaustion permits walking and requires half a bar before running resumes. XP requires actual unassisted foot travel.
- The skip advances the shared calendar fifteen game minutes before starting Ed's arrival. It grants beginner instruction and the cooked catch, with no simulated travel XP. Footman Ottar, an existing Imperial soldier, receives the letter in Tidewater Haven.
- Bear is the displayed tutorial name for the existing Barrett. Existing IDs and the Chris/Cromb playable-character substitution are preserved.
- A timber gate and coastal fences close the neck. Chris has a personal pass. Glun remains by his practice target for the final conversation; the skip places the player on the inside approach to the now-open gate.
- The sea creature and winged demon have a visible reveal, a lethal strike at 3.15 seconds, and recovery at 4.6 seconds. Escape interception checks the traveled segment, including turbo flight and an 85-metre tutorial ceiling. These limits disappear on sign-off.
- Teachers are protected during active training. Completed lessons, inventory and XP survive boundary recovery. Legacy saves continue under the old opening rules.
- Family houses stay in Tidehaven. Optional teaching excursions use the new home stations, and Jess retains the ferry network after graduation.

## Implementation and validation entry points

The state is in `src/content/chapters/prologue/peninsula-tutorial.js`, with the game integration in
`src/content/chapters/prologue/peninsula-tutorial-host.js` and `src/main.js`. Scenery, opening camera,
movement progression, independent company timing and the autoplay controller
have separate modules. `src/world/environment/tutorial-boundary-visuals.js` owns the two temporary
encounter models. Checkpoints store lesson facts and Chris's physical route
progress without granting rewards on load.

Use **F8 > Quest playtests > Main quests > Peninsula tutorial** to demonstrate
the eight lessons. The computer stops at Glun's handoff before army enlistment.
Use **Start game** on a fresh opening to skip training. Full/Fast loading is
still a separate choice.

`npm run test:peninsula` exercises the lesson rules, routes, save compatibility,
host interactions and movement progression. `npm run test:peninsula-native`
drives the live F8 autoplay, Continue and skip flows, then attempts ordinary
swimming and developer-dragon escape and checks the visible defeats/recovery.
Native screenshots and results are written under `tests/artifacts/`.

### Validation record — October 2, 2026

Validation is composite; the complete native command has not yet exited successfully in a single uninterrupted run. The 317.6-second player autoplay and 252-simulation-second Chris measurements below predate the later 6 m/s walking and 9.5 m/s running adjustment. After that adjustment, focused locomotion/autoplay tests and native movement controls passed, but the complete tutorial was not repeated; these are not timings for the new pace.

- The live F8 autoplay completed all eight lessons, real movement/combat/fishing/cooking, and Glun's letter in 317.6 wall seconds in the latest run. It stopped before enlistment, started Ed's arrival at sign-off, and passed Continue checks without duplicating the letter or cooked fish.
- Chris's independent route passed an accelerated native preflight using the real host and collision resolver: he performed his lessons and reached Tidehaven after 252 simulation seconds, then waited because the player had not graduated. No route positions or lesson-completion flags were granted by the driver.
- In the subsequent real-time run Chris continued through his own lessons and along the land route. The old four-minute post-graduation wall deadline expired while he was still advancing, with another normal desktop game sharing the renderer resources. This was not a completed real-time departure check. The future wall budget is twelve minutes; pure timeline tests also cover sign-off, waiting and departure ordering.
- The separate final opening/escape run passed **23 assertions**, exited successfully in **33.2 seconds**, and recorded no renderer errors. It checked skip timing/supplies and actual swimming and developer-dragon boundary crossings, visible defeat, paused reveal timing, Continue during both encounters with position/altitude preserved, and alive on-foot return with unfinished lessons unchanged.
- Sea and air reveal screenshots were reviewed. Both creatures are clearly visible before damage; the region-arrival card no longer obscures the sea encounter.

The retained evidence is `tests/artifacts/peninsula-full-player-and-chris-route.log`, `peninsula-opening-final.log`, `peninsula-checks.json`, and the `peninsula-*.png` captures. Artifacts are local and gitignored.

### Exploration and opening review - October 5, 2026

The complete desktop tutorial check now passes in one uninterrupted run: 39 assertions, all eight lessons, Continue without duplicate rewards, Chris physically completing his independent lessons and land route, the skip flow, and both boundary creatures. The player graduated after 315.1 wall seconds; including Chris and the escape checks, the run took 973.6 seconds while sharing the machine with the normal desktop game. These are test-run wall times, not a performance target. Evidence: `tests/artifacts/opening-review-full-result.json` and `opening-review-native.log`.

This review also corrected main-road autoplay after peninsula graduation or skip: it now takes Glun's letter to Footman Ottar and chooses enlistment before continuing the road. The peninsula quest playtest still stops at graduation. Lesson objectives now describe the next practice action, including walking/running counters, stamina recovery, strike/guard/dodge progression and returning from the swim. The HUD refresh includes that changing objective so these prompts update during practice and after Continue.

Targeted checks passed for tutorial state, checkpoint restoration, company movement, locomotion, developer flight, climbing/falling, loading/residency, and road progression. The real Suval terrain fixture confirms beginner climbing, exhaustion/fall damage, switchback traversal and Catie's cave approach; that test now builds only the four regions it exercises.

The desktop enlistment test exposed a second issue missed by the pure planner: Ed's harbor alarm moves Ottar away from his stored post. The quest target and autoplay now track his live actor position, with the gold marker transferred from Glun to Ottar until enlistment. A targeted regression covers a recipient who has moved during the alarm.

The final focused desktop run passed 26 assertions in 155.9 wall seconds, including both escape/Continue scenarios followed by the actual walk to Ottar, conversation, exactly one army letter and road token, and release of the tutorial objective. Evidence: `tests/artifacts/opening-handoff-final-result.json`. It recorded no game-frame or captured renderer errors; the Electron process nevertheless returned exit 1 after a GPU `WaitForGetOffsetInRange` shutdown warning. The result assertions and capture were written before that warning. Boundary tests run before enlistment because enlistment starts the main journey and reusing it as a fresh tutorial would make the test checkpoint inconsistent.

Exploration follow-up: the isolated desktop flight/return run exited successfully with no renderer errors. It completed two circuits through all four Acorwoods, verified that ground chopping prompts stay off during flight and return at an accessible Acor trunk, then passed 14 scenery-residency assertions across Drent/West Acorwood return visits (changed tree identity/state retained, no duplicate trees, graphics resources released and restored). Evidence: `tests/artifacts/exploration-flight-final-native.log` and `local-streaming-checks.json`. The flight driver now waits for a real game frame to resume during the existing Fast-mode loading overlay, with a two-minute timeout; previously it incorrectly demanded advancement on every browser animation callback. No loading policy or region content was changed by this review.

Scope: this was a focused opening/tutorial-to-enlistment and exploration regression review, not a complete main-quest or every-region certification. The known Fast-mode pauses on first visits remain; further loading optimization stays deferred.


## Minora opening - 5 October 2026

The title screen now orbits Minora slowly, showing its white city, river fork and surrounding country. It offers three choices: **Tutorial**, **Start**, and **Continue**. Tutorial preserves the Drent peninsula arrival and lesson sequence. Start uses the default traveler in Minora with ordinary starting equipment, an unchosen tutorial, and an unaccepted main quest; it does not award tutorial food, letters, practice, or skill experience. Continue restores the last actual checkpoint, including an independent Minora start.

Jojo, Glun, and Iven at the Nothom relay offer an explicit main-quest recruitment choice to a Minora traveler. Declining leaves exploration independent. Accepting provides the existing introduction and travel token; Iven can receive the introduction directly. This origin does not trigger the peninsula's pirate-arrival clock. Free exploration and later recruitment are validated separately from completed tutorial lessons in saves.

The walking/running consolidation is a proposal, not an implemented rule: **Athletics** is the recommended shared skill; ordinary walking would become a basic control instead of a progression track. Running would improve endurance and efficiency, with swimming and climbing retaining their own technical skills. Await the player's choice before changing progression or migrating saves.

### Opening validation and Full-mode performance investigation

The isolated desktop opening test passed 31 assertions across a fresh launch and a fresh renderer: all three menu choices, a moving panorama, a clear Minora spawn, an unaccepted main quest, real save/Continue position, declining recruitment at all three contacts, accepting Glun's introduction without fabricated tutorial practice, and the original Drent tutorial. The final menu colors were visually checked in a subsequent Full-mode launch. Checkpoint, quest display/markers, crime, and wildlife-damage checks passed 108 targeted tests. Both Full desktop runs wrote passing results without captured game-frame errors, but Electron reported a GPU `WaitForGetOffsetInRange` warning during shutdown and the launcher exited 1; do not describe the process exits as clean.

Full-mode gameplay profiling found that unknown wildlife IDs repeatedly rebuilt a Set of the entire NPC cast in `crime-host.js`. The lookup now checks the main Map and then the small live extra-character roster directly, preserving dynamic additions/removals and normal damage rules. A regression test performs 2,000 unknown wildlife lookups with roster enumeration forbidden.

This removes a measured CPU hotspot, but does **not** establish an overall frame-rate improvement. At the same Minora position and 1440 x 960 graphics settings, the initial 120-frame sample averaged 121.04 ms per frame (render: 24.51 ms), while the fresh post-fix sample averaged 127.98 ms (render: 54.89 ms). The roster-allocation hotspot disappeared; scene transforms, visibility checks and rendering became prominent. Rendering cost varied substantially between runs, so retain the fix for its verified reduction in lookup work without claiming the slowdown is solved. The simulation's 50 ms step cap also makes sustained frame times above that threshold feel like slow motion. Next investigate scene traversal, static transforms, shadows, and nearby-only simulation while preserving loaded regions and seamless flight.

Evidence is local and gitignored: `tests/artifacts/minora-opening-checks.json`, `minora-title.png`, `minora-full-profile-before.json`, and `minora-full-profile-after.json`. Loading policy and movement progression were not changed by this performance fix.

The pause menu also offers **Exit to main menu** beside Return to the road. It saves normal adventures when allowed, preserves the existing checkpoint in testing sessions, and offers Stay or Exit without saving if a save cannot be made. Returning to the Minora title reuses the loaded world; Continue restores the saved adventure. Choosing a new Start or Tutorial after returning initializes a fresh renderer to prevent the previous adventure's quest and testing state leaking into a new game, retaining the selected loading mode.
