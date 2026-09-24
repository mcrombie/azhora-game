# A main story that moves without the player

Status: implementation checkpoint, 23 September 2026. Core flows are implemented and checked in the desktop renderer; broader regression failures and remaining extensions are listed below. The shared story model, physical route driver, host integration, Republican recruitment and common Solis entry are implemented. Ben's F8 quest autoplay is a separate completed feature. The sections below preserve the approved design; implementation details and verification are recorded at the end.

## Intent and settled decisions

The other hired mercenaries undertake the main story in the same world as the player. Their decisions, travel, deaths, completed work and allocated horses persist. Leaving for Peblos does not suspend them. Pausing the game does.

The world begins on **1 April 980, in spring, at first light**. The player can miss opportunities by arriving late, but the journal explains what happened and gives the next available destination instead of a broken objective.

The user confirmed that **committing to the Republic in Luscia starts an alternate Republican main story, with no Imperial muster recall**. This deliberately moves the main faction fork earlier than the current Solis scene. It is not just a silver quest choice layered over a mandatory Imperial career.

**Confirmed continuation:** the Republican main story parallels the Monarchist main story. The Republicans muster with the mercenaries they have recruited, then fight the monarchy and its recruited mercenaries. This path converges with the existing option to join the rebels when the monarchy sends the player with a message to Solis. Refusing the Imperial recall permanently rejects only the Imperial campaign; Republican recruitment remains possible through the living, free Nothom operative.

Further confirmed rules: if another mercenary completes the satchel job first, the player's alternative entry to the Republican main story requires **Mind Read on the rebel operative in Nothom**. Iven reassigns an accepted satchel job after **ten minutes of active play**, clearly announced in advance. Other mercenaries can independently join the Republic according to **personality plus experiences**, becoming allies or opponents according to their allegiance and the player's. Mind Read on the operative also reopens **both the Republican main story and the local Republican silver quest** after the player personally killed or betrayed the satchel soldier.

Use existing names in implementation: Drent, Luscia, Nothom, Moros Plain, Officer Glun, Chris Scotwood, Ed the Word, Ciarán and Al the Tun. “Curan” and “Alanaton” in the spoken brief refer to the latter two existing characters, not new recruits.

## 1. Clock and information

Put a compact line beneath the region/location in the upper left: **1 April 980 · Spring · Morning**. Show elapsed active play time in its tooltip or journal detail. Keep the time-of-day wording consistent with `day-night-brief.md`.

The user has now chosen **one in-game minute per real active second: a full day takes 24 active minutes**. This supersedes the older 48-minute day in `day-night-brief.md`. One real minute is one in-game hour. Calendar presentation and a fully animated day/night world are separate deliverables; this change should not silently expand into implementing the whole lighting/season system.

Use one authoritative saved world clock for schedules, task progress and calendar dates. Menus and pause stop it. Proposed full mode policy: ordinary exploration/combat/passenger travel advances it; pause, dialogue, journal, inventory, testing tools and defeat recovery freeze it. No progress while the app is closed. Explicit future sleep or existing jail time advances the same world clock and resolves intervening events once.

The muster grace period is **60 active-play seconds**, representing one in-game hour. Clock speed should not quietly make that a one-second deadline.

## 2. Mercenaries as participants

The standard route is arrival, Jojo, Glun's training, the road/ambush, Caloss crossing, reporting in Nothom, then the Moros muster. Give each person their own progress, current activity, destination, equipment, health and arrival records. Chris's existing training sequence provides a starting point; a fixed pause outside a trainer is not sufficient evidence that training happened.

Shared world work and individual enlistment are distinct. Everyone may report and qualify; the same bridge is repaired once, the same satchel recovered once, and a particular horse belongs to one person.

Near the player, characters actually walk, interact and fight. Far away, advance the same tasks along valid routes using persisted, deterministic outcomes. Do not run ten copies of the player's UI or count a blocked visible NPC as arrived because a timetable elapsed. Returning to the area must show the same people, wounds and results.

Companions actively accompanying the player stay with them until released. They cannot simultaneously be repairing the bridge or claiming a horse elsewhere. A distant task finishing must never recalculate an NPC's earlier travel and make them jump backwards or forwards.

Mercenaries are not permanently Imperial by default: each can independently commit to the Republic. **Confirmed decision model: personality plus experiences.** Give each character authored values and tendencies, then let what they encounter affect their decision; do not predetermine everyone's allegiance or reroll it on reload. Persist their relevant experiences, allegiance, the event that changed it, and consequences for destinations, company membership and battle participation. An Imperial muster must not wait for a confirmed defector, and a Republican mercenary cannot be selected as its recall messenger. The individual personalities, influential events and possible player persuasion still need to be authored.

## 3. Ambush and the bridge

Chris's unaided road outcome is fatal. Meaningful player help can save him; the game must not kill him later by timer after the player has actually resolved the threat. Other mercenaries normally survive, with a saved possibility of one or two further casualties. This is one shared ambush with persistent attackers and consequences, not a fresh identical fight or death roll for each group or reload.

There are ten NPC mercenaries besides the player, including Mus. Chris dying leaves nine; further casualties reduce that number. Never hard-code “nine must arrive.”

Crossing preferences when the bridge is still broken:

| Person/group | Decision |
| --- | --- |
| Chris Scotwood, if alive | Repair |
| Jerry alone | Swim |
| Kristen alone | Repair |
| Ciarán alone | Repair |
| Jerry + Kristen | Swim; Jerry persuades Kristen |
| Jerry + Ciarán | Repair; Ciarán persuades Jerry |
| Kristen + Ciarán | Repair |
| Jerry + Kristen + Ciarán | Repair; proposed extension of Ciarán's influence |
| Lakota | Repair |
| Eliana | Swim |
| Matt and Al the Tun, together or separately | Repair |
| Ed the Word | Proposed: swim; the spoken brief's unnamed swimmer is not fully explicit |
| Mus | Preserve his wilderness route; crossing/repair preference still needs definition |

A swimmer leaves Chip's job available for the next traveler. A builder actually obtains the required materials and spends time repairing. Once finished, everyone uses the repaired span. Chip acknowledges the builder; the player receives no repair experience for somebody else's work. This early Carpentry introduction is then unavailable, as requested; later teachers and jobs remain possible.

Keep a single task owner while a repair is in progress and release the unfinished claim if that builder dies or abandons it. Only completion makes the bridge permanently repaired. Joining another person's ongoing repair can be designed later rather than implied by this first version.

## 4. The shared satchel assignment

The first eligible mercenary, including the player, to actually report to Iven in Nothom gets the assignment. Resolve simultaneous reports deterministically and save the result immediately. Persist the assignee, carrier, physical location, outcome and reward recipient.

If another person is working on it, Iven says who. If it is finished, he acknowledges the returned rolls and sends the player onward. Do not award duplicate recovery money, experience or a second satchel. Personal permission to reach the muster must not depend on personally completing this job.

The satchel becomes one real quest item. If its carrier dies, it is recoverable from the body; corpse cleanup transfers it to persistent remains or a recoverable container rather than deleting it. An uncompleted assignment may be reassigned after death or explicit abandonment.

**Confirmed: Iven reassigns the job after ten minutes of active play from acceptance**, equivalent to ten in-game hours. State that deadline before acceptance and retain it in the tracked objective/journal as a calendar due time and remaining active-play time. Use the saved world clock; pausing or reloading must neither consume paused time nor reset the deadline. Reassignment changes responsibility, never creates another satchel or teleports the existing item out of its carrier's possession. **Confirmed handover:** if the player already carries the satchel, the replacement mercenary physically seeks them out and asks for it. The player can still deliver it to Iven late until the replacement actually takes possession. Agreeing transfers that single item and its delivery responsibility; refusing makes the replacement attack in normal world combat. Recheck possession and delivery when the mercenary arrives so a completed delivery cannot trigger a stale demand or duplicated satchel. The replacement cannot take it remotely. Late payment and consequences for killing the replacement remain to be designed.

## 5. The Luscia Republican encounter

The present implementation places the satchel at a wrecked cart on the Lauvel field and spawns two wolves on pickup. There is also an existing empty old relay hut. The proposed redesign moves/adapts this job to the **looted relay hut** and removes that two-wolf trigger, without removing unrelated wilderness wolves.

A single Republican soldier has recovered the satchel. He opens with a moral argument about the Empire, the people and the Republic, rather than a payment offer or immediate attack. Friendly companions must not attack during this peaceful approach.

- **Listen or provisionally agree:** he reveals a Republican contact in Nothom and walks away. Proposed item handling: he hands over the satchel so the player can still decide whom to report to. No faction lock occurs from this promise alone.
- **Explicitly declare support for the Empire:** he becomes hostile. Defeating and killing him permits looting the satchel and closes the direct introduction to the Republican route. This is not a permanent lock: Mind Read on the Nothom operative can later reopen both the Republican main story and local silver quest. Retreat remains normal world combat; the soldier's death remains a persistent consequence.
- **Report to the Republican contact:** commit to the Republic; open its Luscia silver objectives and redirect the gold story onto the alternate Republican route. No Imperial recall afterward.
- **Expose the soldier/contact to the Imperial reporting authority:** commit to the Imperial route, continue the gold story toward Moros, and open the Imperial Luscia silver investigation. This betrayal is still available after provisionally agreeing with the soldier.

Use a deliberate dialogue choice for betrayal; merely talking to Iven about unrelated business must not choose a faction. Iven is currently a clerk; retain him for assignment administration and decide deliberately who handles the garrison's enforcement orders rather than silently changing his identity.

The Imperial silver quest identifies and eliminates a defined set of rebel loyalists around Nothom/Luscia. Investigation uses testimony and evidence; Troy's Mind Read offers an additional way to discover leads. Do not make that spell mandatory or treat a vague suspicious thought as automatic proof. Keep the investigation roster and proof requirements explicit.

The Republican silver continuation begins with the new Nothom contact; its later local jobs remain to be designed. Its gold main-story continuation is the Republican muster and battle described below. Starting either branch does **not** instantly conquer Luscia or complete its civil war. Existing province-control APIs are completion effects, not introduction effects.

**Confirmed late-entry rule:** if another mercenary completes the satchel job first, the player misses that unique encounter and can open the Republican main-story route only by successfully using **Mind Read on the rebel operative in Nothom**. Ordinary conversation, rumors or another mercenary's defection do not substitute for that discovery. The thought reveals the connection and unlocks an explicit recruitment dialogue; reading it offers a choice rather than automatically changing the player's allegiance. The player therefore needs to learn Mind Read from Troy to use this late entry. This requirement is separate from the Imperial investigation above, where the spell remains optional.

**Confirmed second-chance rule:** even if the player personally killed or betrayed the satchel soldier, Mind Read on the Nothom operative unlocks both the Republican main story **and** the local Republican silver quest. This supersedes the earlier permanent closure of the silver branch. Unlock an explicit recruitment choice rather than automatically defecting on a spell cast. Preserve the soldier's actual fate, completed world events and previously paid rewards; reopening the route does not resurrect him, reset the satchel job or duplicate payouts. Adapt the operative's introduction to this history. How already-completed, mutually exclusive silver objectives are handled still needs definition.

**Confirmed operative rule:** if the Nothom operative is killed or arrested, the Republican entry route closes. Mind Read cannot bypass that condition, and there is no automatic replacement contact. This overrides the second-chance route above when its required contact is unavailable. Preserve the cause in the journal when the player learns it. What happens to someone who has already joined the Republican main story remains a separate continuation design question.

Other mercenaries may themselves choose the Republic; their encounter outcomes persist instead of universally reporting to Iven. Define how a defector resolves or abandons the shared satchel assignment. Their own recruitment opportunities cannot silently bypass the player's specific Mind Read requirement after missing the job.

### Republican muster and the Solis convergence

The Nothom Republican route leads toward the Republic's own assembly, orders and battle preparation, paralleling the Imperial muster. Each side gathers the mercenaries who actually joined it and survived. These are the same persistent characters: former traveling companions may be allies or opponents according to their decisions. Do not duplicate the roster, force a predetermined number onto either side, or make a Republican mercenary report to the Imperial muster to unlock progression.

The early Republican route and the existing later Solis defection route feed one shared Republican assembly and battle sequence. A player already committed in Luscia arrives as a Republican recruit; a player sent by the monarchy with the Solis message may still join there through the existing choice. The earlier recruit does not need an Imperial signing, Imperial message delivery, or another first-time faction decision. Dialogue acknowledges which route brought them there, while deaths, allegiance, horses and previously paid rewards remain unchanged.

Existing integration points: `border-chapter.js` has `meet-envoy` -> `side-coalition` -> `report` with `side: 'coalition'`. The Republican reporting officer is Captain Arlen Voss (`solis-captain`) at the Gate of Sun Horses. His `march-out` action leads to `march`, then `reach-line` -> `fighting`; `join-line` resumes the same battle after retreat. The encounter ID is `border-battle-line`. The campaign model currently goes from `suval-envoy` through `chooseSide('coalition')` to `border-battle`, then after victory to `moros-outpost` and `sail-west-izol`. Extend the entry contract to permit the new Luscia route to join this shared progression without falsely completing the Imperial errands or paying their rewards.

The current border-state validation and `campaign.chooseSide()` assume prior Imperial orders; the new entry needs an explicit supported transition and saved origin. Early Republicans also need authored admission to Solis without an Imperial seal. Keep Imperial refusal separate from Republican eligibility, and do not satisfy either gate by fabricating completed Imperial service.

Use the common battle's two opposing forces, populated from actual faction allegiance, rather than separate copies of the war for each route. The Monarchist player fights alongside the monarchy's surviving recruits; the Republican player fights alongside the Republic's. Keep the local Luscia silver objectives separately focusable and unfinished until their own authored conclusion. The Republican staging location, travel orders and exact rendezvous timing still need to be fitted to this confirmed route.

## 6. Four horses

Allocate exactly four mercenary remount entitlements in actual **Nothom reporting order**; this is the proposed interpretation of “the first four get tokens.” Satchel recovery and horse eligibility are separate. Each allocation reserves a specific horse, so four outstanding tokens cannot promise the same mount.

Typical order after Chris dies: Ed, Jerry, Kristen, Ciarán. If one of that trio dies, Lakota may take the fourth. A player arriving early competes for the same stock; arriving after all four allocations means walking. Iven must still issue onward orders without a token.

Replace the current rule that automatically creates mounts for every companion when the player owns a horse. Unallocated companions walk. Riding together as passengers does not confer ownership or create another token. A dead owner's horse remains a physical horse; it does not automatically mint a replacement entitlement. Reclaiming an abandoned mount is separate from issuing a fifth.

Later commitment to the Republic may leave the player riding an already allocated Imperial horse. That provenance persists; changing sides cannot restore the stable stock or award another horse.

## 7. Muster, courier and refusal

Each surviving Imperial-aligned mercenary reaches the fortress on the Moros Plain and waits; Republican recruits gather with their own army. Save actual arrival order. When all expected surviving Imperial NPCs have arrived or have a terminal outcome such as death/defection, and the Imperial-aligned player is absent, begin the 60-second grace period. NPC companions currently accompanying the player count as accounted for with the traveler for this readiness check, so they cannot prevent the very recall intended to bring that group in. The player themselves is excluded from the quorum.

If still absent after the grace period, send the first living Imperial-aligned arrival, usually Ed. If that person is unavailable or has defected, use the next eligible loyal arrival. A messenger without their own mount can borrow an existing camp horse without creating player ownership or an additional remount token.

The courier knows the player's current position, as requested, but travels through the world: roads, gates, safe crossings and appropriate sea transport. Omniscient destination selection must not become a horse walking across an ocean or through walls. Replan when the player moves; do not duplicate the courier on reload. The courier should approach at once and deliver the interruption at a safe dialogue moment, not overwrite an ongoing conversation or freeze a lethal fight.

- **Yes:** the player rides as passenger while the courier controls the horse back to the muster. World time continues; pause/menu controls still work. Arrival triggers the assembly and departure for the assault; the player follows the force. Leaving after committing can be treated as desertion and costs Imperial favor.
- **No:** explicitly warn that this refuses the **Imperial campaign** permanently for this save. Persist that refusal; stop Imperial gold objectives and all Imperial recall attempts. The army proceeds without the player. Exploration and other quests remain available, including entry to the Republican main story through the living, free Nothom operative. Preserve the normal recruitment requirements, including Mind Read when required; refusal itself grants neither Republican membership nor an automatic introduction. This is not a hidden “Not yet” response.

If the player reaches the muster while the courier is traveling, cancel the pursuit and turn the courier back. If the courier dies, record it and choose another living eligible messenger once; if nobody is available, use an authored fallback rather than repeatedly spawning copies. A Republican commitment cancels any Imperial recall already in progress.

Player arrival should not deadlock against a temporarily absent dispatched courier. Exact assault readiness and the Republican army's parallel schedule remain to be specified. Likewise, a maximum muster wait is needed for a living NPC who is indefinitely detained or diverted; distinguish a legitimate story delay from pathfinding failure. A fifteen-active-minute cutoff after the first arrival has been suggested, but the user has not confirmed it; do not confuse it with the confirmed ten-minute satchel deadline or one-minute recall grace period.

## 8. Readability and consequences

Keep gold and silver independently focusable. Changing the tracked quest does not change allegiance or accept a deadline. Present a compact status for nearby relevant opportunities: **Available**, **Taken by Ed**, **Completed by Chris**, or **Missed**. Move missed/completed history out of the active list rather than filling it with unavailable quests.

Iven, Chip and the muster officers explain late-arrival changes in dialogue. No remote pop-ups from the other side of the country. A journal update can record discovered history when the player learns it. Clearly announce dwindling horse availability when reporting, not as an unexplained missing dialogue choice.

The player can refuse the Imperial main story, and it remains a deliberate permanent consequence. An accidental click, opening another quest, or merely hearing the Republican argument must not do this.

## Implementation order after approval of the design

1. Shared clock/pause contract, calendar HUD, persistent mercenary task/arrival records and old-save migration.
2. One small vertical slice: two mercenaries race the player to Chip; swimming, repair, death and reload all preserve one bridge outcome.
3. Shared Nothom assignment and finite horse entitlements, with late-player onward orders.
4. Republican soldier encounter, explicit commitment states, the parallel Republican muster, and convergence with the existing Republican Solis reporting/march/battle sequence.
5. Muster quorum, courier route, passenger return, refusal/desertion and offscreen assault consequences.
6. Generalize the working Ben playtest controls to deterministic scenarios for this entire sequence.

Relevant existing modules: `mercenaries.js`, `company-route.js`, `long-road.js`, `road-ambush.js`, `journey.js`, `luscia-chapter.js`, `moros-chapter.js`, `campaign.js`, `civil-war-quests.js`, `company-horses.js`, `ostler.js`, `road-checkpoint.js`, and their host integrations in `main.js`.

Required scenarios include: player first; player idles at Tidehaven; player away in Peblos; Chris saved/dead; every crossing group combination; all four horses allocated; simultaneous reports; owner/carrier death; a companion following the player; Republican commitment with a courier already dispatched; messenger death; yes/no/passenger return/desertion; saving and reloading at each shared-task transition; and old completed saves. Also cover the ten-minute deadline before and after pickup, deadline persistence across pause/load, the exclusive Mind Read entry after an NPC completion, Mind Read reopening both Republican quests after killing or betraying the soldier, mercenary allegiance changes driven by saved experiences, a mercenary defecting while holding the satchel, and a would-be courier joining the Republic. Verify Imperial refusal followed by valid Republican recruitment, early Luscia and later Solis recruitment reaching the same Republican battle stages without duplicate rewards, and former companions appearing on the correct side of the single battle. Verify that no main objective requires a consumed unique item, no reward or horse is duplicated, and no character exists in two locations.

## Implementation notes

The authoritative shared state is `src/living-story.js`. It owns the active clock, the selected hero's actual ten NPC companions, deaths, health, route progress, experience-driven allegiance, one bridge repair, one courier satchel, four named remount reservations and the two musters. `observe()` records actual feet and work from `company-route-host.js`; the clock alone never counts an obstructed nearby character as having arrived. Snapshot restoration validates shared-resource uniqueness and preserves old-save time, completed work and existing player ownership without replaying rewards.

`company-route-host.js` drives the company through the actual road and teaching sites; `company-transport.js` describes supported land/sea travel instead of taking a straight line across water. Following companions are excluded from remote jobs. The shared bridge requires three collected sticks and twenty active seconds of work. An unfinished claim is released on death or joining the player; materials left at the bridge remain there. The current bridge choices use the approved combinations, with Ed and Mus swimming and Ciarán's repair preference taking precedence in the three-person group.

The satchel assignment is deliberately accepted by the player and automatically accepted by the first eligible NPC reporter. The ten-minute due time is fixed at acceptance, displayed as a calendar time and active countdown, and does not reset on reload. There is one warning two active minutes before expiry. Expiry changes responsibility, never possession. A living replacement must reach the carrier and ask; refusing starts an ordinary world encounter. A late carrier may still deliver until handover. Death leaves a persistent recoverable satchel position independently of corpse decay. Only the final actual carrier who delivers it receives the recovery reward.

Remounts are allocated in actual Nothom reporting order, with stable actor-ID order for simultaneous reports. A token reserves a specific one of four horses. Claiming is distinct from reservation; `company-horses.js` draws mounts only for companions with claimed allocations. Dead owners do not replenish stock. A late player receives marching supplies and can complete the Moros stage on foot.

NPC political decisions use authored tendencies plus saved experiences such as imperial cruelty, imperial aid, Republican mercy and the rebels' roadside attack. The decision is made once and saved. Recruitment retains the same person, wounds, equipment and horse. A defector holding the satchel retains physical possession; a Republican delivery can finish the shared recovery without cloning the item.

`luscia-civil-war.js` and its host handle the soldier at the looted relay hut and the existing Nothom operative Hara (`timber-stall`). Early Republican recruitment and the later Solis decision have explicit supported entries into the common Republican reporting/march/battle stages; neither entry fabricates completed Imperial errands or pays their rewards. Ordinary conversation does not replace the required late Mind Read discovery.

The Imperial recall begins sixty active seconds after the surviving, free, loyal NPCs are accounted for. Accompanying NPCs do not hold that quorum open. The first actual eligible arrival travels as messenger; a dead or defecting messenger can be replaced once. Refusal is confirmed before permanently closing the Imperial campaign, while Republican recruitment remains eligible under its normal contact requirements. Pending recall and handover dialogues reopen after Esc, reject stale choices, and cannot interrupt an existing conversation or live combat. A cancelled or refused messenger returns to camp rather than spawning a replacement actor. After a muster departs, its independent recruits physically follow the road to their side’s authored battle positions and wait there; this does not invent an offscreen casualty roll.

The calendar begins at 06:00 on 1 April 980. One active real second is one game minute. Dialogue, journal, inventory, pause, testing tools and defeat recovery do not advance it; ordinary play, fishing and passenger travel do. Advancing jail time uses the same saved clock. This change does not introduce a second lighting or season simulation.

### Verification

Run `npm run test:living` for the focused model, host, route/transport, finite remount, campaign convergence and save suites. Model and host tests cover actual calendar rates, pause/load deadlines, unique possession and rewards, dead-carrier drops, physical handover, every authored crossing combination, independent faction musters, courier replacement/refusal, missing horses, missed bridge lessons, and silver quest tracking after Imperial refusal. `company-route-world.test.js` additionally runs a bridge builder, swimmer, and mounted ferry courier with passenger return against actual world terrain and solid colliders.

`npm run test:living:desktop` passed **85 native renderer assertions with zero frame errors** on 23 September 2026. These exercise the actual calendar HUD and paused render loop, finite horse token reporting, real handover buttons including closing and reopening the dialogue, checkpoint restoration, and confirmed Imperial refusal with later Republican eligibility. They also cover the actual F8 scenario buttons, hostile handover, passenger input and objective, an NPC ambush watched from outside the player trigger, and an early summons that advances to Moros without awarding skipped training. The early-return save exercises the same eligibility policy used by normal saves, through an isolated test checkpoint. The runner uses a separate testing-session checkpoint. It stages events for short, reproducible checks; it does not claim a complete visual playthrough of every possible campaign route.

`npm run test:republic:desktop` passed **53 native renderer assertions with zero frame errors** on the same date. This checks the actual Republican dialogue, satchel transfer, commitment, Mind Read entry, operative availability, and common Solis progression using the live game hosts. The combined focused model and world-route suite passed **216 tests** including actual world routes, independent NPC combat, and named-player/Cromb ambush migration. The final early-recall autoplay regressions also passed all 39 autopilot tests.

### Testing in the desktop app

Restart Azhora to load the changed source. F8 now includes **Story: Iven’s assignment**, **Story: Republican at the relay**, and **Story: Imperial recall decision**. These stage a testing session without replacing the normal adventure save. Use the first to try the explicit deadline, the second for the faction conversation, and the third for the confirmed refusal or passenger journey. Menus freeze the clock. The existing Ben autoplay remains separate.

### Wider regression status

`npm run build:web` succeeds. The full historical `npm test` run recorded 1,639 passes and 51 failures before the final fixes. A newly exposed shared-Luscia save validation bug was fixed and its focused regression tests passed. Several failures are assertions tied to obsolete source shapes or removed scene content; others concern road/scenery geometry and remain unresolved. A subsequent general desktop smoke run passed the updated shared-satchel dialogue checks but stopped at its collision assertion. That failure was traced to Willowmere pond using sea level instead of its own surface; the water marker was fixed and the exact first-50-collider assertion plus bank-to-pond swimming passed in a focused real-world regression. The full general desktop smoke was not rerun after that final fix. This is not an all-green full-suite result. Focused/native results above are the checks for the new story functionality, not a claim to have played every route from beginning to end.

### Remaining design extensions

The approved Republican muster and Imperial-refusal scope are implemented. An early Imperial recall has its own saved campaign entry: it preserves unfinished lessons, offers the actual muster wage and onward orders, and does not send the player back to Jojo after loading. Future design work may add player persuasion, new Republican local silver jobs, more detailed mercenary reactions, and alternate long-term outcomes after completed local silver investigations. There is no invented fifteen-minute forced muster cutoff: a living delayed traveler must arrive, accompany the player, defect, be detained, or die before being accounted for. Automatic offscreen battle resolution and further regional faction quests remain authored campaign work; this implementation moves the armies to their positions and uses the existing player-facing border battle. Courier sea travel supports the existing Tidehaven/Cobble ferry. For other disconnected islands without authored transport, the courier waits rather than riding across the sea.

### Handoff at the requested stopping point

The user requested a shutdown checkpoint. Resume with the wider regression failures above and a longer visual run of the company race and muster routes; do not treat the short staged desktop checks as a full campaign playthrough. The main story implementation and remaining limitations are captured here and in `living-company-runtime.md`. No continuous test or background development process is needed overnight.
