# Lizeemi War adventure clock

Choose **Begin Lizeemi War** to enter Spirit and Time. Taleth gives the mission,
hands combat preparation to Uguth, and leaves through the Azhora door. Complete
the first four trials with Uguth, or use the explicit temporary tutorial skip,
then enter Taleth's tower chamber with no allegiance yet.
Explore the chamber freely while time stands still, then speak with Taleth (F).
He asks whether you will support **West Lizeem** or **East Lizeem**. Selecting a
side previews your first task; confirming prepares the campaign and unlocks the
door to Minora. You can close the conversation and keep exploring before deciding.
That choice lasts for the campaign. F5 saves this run in the existing war slot; **Continue war scenario**
restores its exact clock and outcome. Existing day-based saves retain their
original pacing when continued. New campaigns do not overwrite a save until
saved normally.

After the two opening battles, Taleth supplies one current directive for the chosen side. Finish an assault
already joined, defend an active threat, or support an offensive. The directive
changes when the actual war changes, including battles the player skips. During
regrouping it suggests preparation and safe waiting. Other battles remain open
for the chosen side, and staying out never blocks the war. Battle entry explains
the situation and victory conditions with **Proceed** or **Stay out**, retaining
the tactical choice between interception and a champion duel.

The final combat results show Taleth's next task before Continue; accepting the
result tracks the new front or the return to Taleth. That preview resolves a
separate in-memory replay using the same casualty accounting, without spending
time or changing the live save. The side is saved as `campaignSide`. A save from
before Taleth's briefing returns to the undecided tower, even when loaded after
choosing a side. Older campaigns already in progress receive a one-time choice
when continued from the menu; unfinished engagements retain their existing side.
Their original clock and history are preserved.
New campaigns also use the reviewed five-region countryside and food economy.
Production, deliveries and army meals follow completed adventure minutes; holding
time also holds supplies. Existing elapsed saves retain their earlier no-food
rules. The separate food-world test remains available under **Earlier campaign
rehearsals** with its original day-based pacing and separate save slot.

The October 13 tower-choice check uses
`node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --tower-allegiance-checks`.
Use `--food-world` instead of `--world-war` and add `--tower-exterior` to include
the physical departure in the food world. The ordinary opening passed 64 native
assertions; the food opening and departure passed 65, with no recorded renderer
errors. Coverage includes movement before choosing, held time, the locked exit,
both allegiances, cancellation, Chronoscope history without starting the war,
and restoring saves from before and after the decision. The focused tower,
allegiance, clock and autoplay model suites passed 52 tests. Autoplay makes its
selected faction choice through Taleth's conversation before heading to the door.

**Try adventure-clock opening / 00:00** remains a temporary, memory-only
Caricas rehearsal, also available through F8 or
`?mode=war&preview=shared-clock-opening`. It stops after the first battle.
The older **Watch campaign** autoplay rehearsals still use their original
campaign timing and leave normal saves untouched.

New campaigns use `lizeem-adventure-food-v4` and the staggered two-front opening. The adventure clock starts
at **00:00** in Taleth's chamber. **West Lizeem attacks Caricas immediately**;
**East Lizeem attacks Ovesos at 02:00**. These use actual home garrisons, carried
provisions and ordinary battle stages. The tower holds the clock until Teresod
leaves. Caricas is scheduled to end at **03:00**, and Ovesos at **05:00**.

Taleth recommends one next objective on the left panel, beginning with nearby
Caricas. West supporters see **Attack Caricas**; East supporters see **Defend
Caricas**. Players may override the recommendation by tracking another battle or
army from the map. Ignored battles still resolve at their scheduled ends.
Finishing Caricas advances time to 03:00, when Ovesos is already underway with
two minutes remaining. Later recommendations follow the actual war, and the
war log records events and the player's consequences without requiring a report
conversation after each battle.

The same elapsed clock drives a 24-minute solar cycle beginning at dawn, 06:00.
Returning to the tower holds the current time; leaving again does not reset dawn.
Existing saves keep their original scenario and opening march (including the
01:00 departure and 03:00 Caricas arrival in earlier elapsed campaigns).
The staged two-front opening remains tied to the saved scenario.

`tests/opening-fronts.test.js` checks both sides, actual battle entry at minute
zero, conservation, ordinary resolution and replay. The isolated native
`--stillroom-arrival-checks` covers both side choices, physical tower departure,
both quest cards, both minimap markers and tracking each real battlefield.

Time lives at the top of the left objective panel, alongside the current task,
tracked destination and Taleth's incoming message. **Time & waiting** explains
the current pause and resting rules; **Wait here** appears at safe resting sites.
**Less / Details** folds secondary objective text away (compact by default on
phones). The center stays clear for travel. Ordinary objective text does not
pause the clock. Opening **Time & waiting** or **Report and strategy** holds time
until that reading panel is closed; movement also closes these panels.

Taleth is a time wizard. **The entire Wizard's Tower, including its lookout,
is timeless**, even while walking around. Leaving resumes the clock. Reading,
conversations, maps and menus hold time; closing them resumes it automatically.
The clock keeps running outdoors while standing still, including after movement
stops. An expanded campaign report holds time only while open and folds away when
you move. Loading and loss of focus do not spend campaign time. These refuge and
reading rules apply to the ordinary Lizeemi scenario too.

The stationary-clock regression runs with
`npm run test:unified-war:desktop -- --unified-war-clock`. It passed 103 native
assertions: standing outdoors advances food, armies and daylight; closing reading
panels, conversations and menus resumes without movement; tower, training,
background focus and explicit campaign pauses still hold time. The focused clock
and unified-campaign model suites passed 20 tests. Artifacts use
`tests/artifacts/unified-war-clock-*` and isolated saves.

Taleth now speaks telepathically. **Listen to Taleth (V)** opens his message
without a messenger to approach or a landing animation to wait for. Acknowledged
and earlier messages remain available on the map. Corris's actor is not created;
the old receipt fields remain compatible with existing saves. Ordinary lookout
doves remain living, interactable birds.

Taleth's **Chronoscope / Next expected event** button previews the next orders
without changing time. On foot at Bear's stable, the north road into Caricas, or quiet dry ground outside an active battlefield,
the full campaign offers **Wait for campaign event**. It previews the destination
timestamp and consequences before confirmation. Waiting stays at the current
place. It does not enter the battle. Waiting out Caricas
leaves the remaining fighting to the armies and retains earlier contributions.
An unsafe position or changed forecast rejects confirmation. An intervening
battle interrupts a long wait and requires a new decision to continue.

Tactical combat holds the adventure clock. **Completing a main battle advances
the campaign to that battle's scheduled end**, including a non-victorious final
assault. Entering Caricas at 00:57 and completing it advances to 03:00; entering
at 02:40 also advances to 03:00. It consumes the remaining battle window, not a
fresh three minutes. Other armies, supply calculations and concurrent battles
progress normally during that interval, while preserving the player's recorded
casualties and outcome.

Before Continue, the battle report shows **Campaign time: 00:57 → 03:00** using
the actual timestamps. Combat, the defeat animation and reading the report cost
no additional campaign time. Continue commits the outcome and the time advance
once; replaying or loading the result cannot charge the interval again. A retry
returns to its entry checkpoint. The prior running or explicit paused preference
is retained, and a completed war stays stopped.

Champion duels, intermediate interception phases, roadside skirmishes, declining
an invitation and withdrawing retain their separate rules: they do not consume
the main battle's remaining window. Uguth's training and the Spirit and Time
realm remain timeless. Ongoing elapsed saves adopt scheduled settlement for
future completed battles;
historical results retain their original timestamps. Already completed campaigns
are not migrated or replayed into different outcomes.
Older day-based campaigns retain their existing phase timing.

The full campaign continues after Caricas through later army movements and
battles. Waiting selects the next arrival, battle outcome or command review;
recovering armies may need more than one review before marching. A victory for
either league holds time and directs the player back to Taleth for the lookout
review. Only the temporary opening rehearsal ends with a Caricas completion
notice.

## Implementation

`src/experiments/day-night/opening-war.js` exports `createAdventureWar` for the full campaign and `createOpeningWar` for the opening rehearsal. The opening rehearsal adapts
`lizeem-opening-v2`; the full campaign starts with `lizeem-adventure-food-v4`. The core's integer `day` is an internal strategic
order index: one order tick per elapsed minute. The
`localBattleTiming: 'scheduled'` rule keeps intermediate phases local, then runs
normal order ticks through the final battle deadline. The elapsed adapter clears
the entry-time fraction at settlement, so a 00:57 entry lands at 03:00 rather than
03:57. Clock metadata exposes the effective rule for briefings and result previews.
Historical `immediate` commands replay with their original rule; the timing upgrade
applies only to future outcomes. Legacy day-based campaign rules remain unchanged.

Persisted fractions keep the ordinary 0-to-30 range. `sharedOpening: 2` and exact
`openingEventTimes` preserve elapsed report timestamps through replay. Full campaigns also carry `fullCampaign: true`; validation rejects cross-mode or malformed checkpoints. Old
calendar-based experiment checkpoints require a fresh rehearsal. Clock metadata
refreshes only after mutations, avoiding history copies on sky/HUD reads.

The day/night renderer follows the adventure clock without a separate time
slider. The independent F8 lighting experiment remains available in legacy
war sessions. Existing sky and lantern geometry is reused. This pass adds no
scenery, shadows, NPC simulation or streamed regions. The river's existing night
illumination limitation in `day-night-experiment.md` remains applicable.

## Checks

```powershell
node scripts/run-tests.cjs tests/adventure-war.test.js tests/opening-war.test.js tests/adventure-time.test.js tests/world-war.test.js tests/campaign-pacing.test.js tests/army-commanders.test.js
node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --adventure-war-checks
node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --adventure-war-checks --adventure-war-ui-only
node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --opening-clock-checks
node scripts/run-tests.cjs tests/campaign-allegiance.test.js tests/campaign-guidance.test.js tests/taleth-correspondence.test.js tests/encounter-result.test.js
node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --campaign-directive-checks
node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --campaign-allegiance-menu-checks
npm run check:layout
npm run check:modules
```

The native check exercises tower departure, safe-place waiting, combat for both
sides, Taleth's messages and memory-only save isolation. Travel preparation uses
debug positioning; combat uses the ordinary input driver. Screenshots/results
use the `tests/artifacts/opening-clock-*` prefix.

The full campaign native check plays both factions through later battles and
victory, then returns through the tower doors to the lookout. It checks exact
clock/sky holds, persistent save validation/restoration, and the first commander
duel invitation. Travel between sites uses debug positioning; fights use ordinary
combat input against unmodified enemies. Native test storage is isolated and
memory-only; screenshots/results use `tests/artifacts/adventure-war-*`.

## Current pacing limit

The complete native run passed both factions, including five played battles per
side, save restoration, and both lookout conclusions (321 checks). It also
exposed a long East-side lull after choosing interception in the opening: the
existing army planner waits for recruitment to meet its attack threshold.
The elapsed adapter and direct simulation produce the same stalemate; safe
waiting advances through it. Improving that pacing or consolidating army orders
is separate from the clock conversion. The opening duel path reaches a different
campaign trajectory.

The final UI run passed 112 checks, including safe-rest rejection at an active
battle boundary, regrouping without stale horse prompts, natural unattended
victory, working return-to-Taleth controls, and the completed lookout's campaign
review. Both native reports contain no game-frame errors. Layout, module-linking
and the focused model checks also pass.
