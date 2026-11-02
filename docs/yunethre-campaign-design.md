# Chapter 2: Yunethre

Revised 22 October 2026 from the author's Chapter 2 and 3 outline. This replaces the
9 October diplomacy-first, untimed proposal. Chapter 1 is the Lizeemi War; its
ongoing refinement remains independent of this continuation. "UF3" in the spoken
outline is read as Yunethre, not as another region or campaign.

## Chapter 2's purpose

Taleth sends Teresod to ask autonomous Laketown to join the Lizeemi League. The
town values its relations with elves, centaurs and dwarves. While the centaur
community survives, membership requires its protection. Active hostility to
elves always prevents membership; there is no mandatory elf-help quest.

The visit order is Taleth, Laketown, Centaur Camp, then Canerd, with earlier visits
remembered rather than invalidated. Celder offers a military alliance in return
for assistance against the centaurs. Hearing an offer commits the player to
nothing. A military commitment occurs when joining a side in the battle.

Taleth advises avoiding the battle and remaining neutral. That advice may cost
allies; it is not a forced optimal route. Thalmagar is not yet identified as the
overarching enemy. Premonitions can be present without exposing hidden allegiances.

## Time and decisions

The battle starts after **15 minutes of active Chapter 2 adventure time**, measured
from departure from the tower. Time stops in the tower, conversations, loading,
pause menus and an inactive window. The deadline and remaining time are visible
once the conflict is known. Do not reuse the ended Chapter 1 attack schedule.

A provisional two-minute participation window allows the player to reach an
ongoing battle. If not joined, a seeded 50/50 outcome decides its winner. Saving
and reloading must not reroll that result. An active hero encounter supplies its
actual result; statistical resolution must not override the fight mid-encounter.
The two-minute window is an implementation pacing assumption, open to adjustment.

**Confirmed by the author:** successful diplomacy before the deadline prevents
the battle and immediately opens the aftermath conversation at Laketown.
A compact requires consent from the centaurs and Celder, not one conversation
that silently signs on everyone's behalf. The existing proposed reciprocal
safe-passage/withdrawal compact is a suitable first authored agreement.

## Outcome rules

| Outcome | Laketown | Centaurs | Celder |
| --- | --- | --- | --- |
| Negotiated peace | May join if the elf condition is satisfied | Protected, independent ally | Peace under the compact, not automatically a military ally |
| Player helps centaurs win | May join under the same condition | Protected ally | Hostile; future raids remain a consequence to build later |
| Player helps Celder win, then takes Laketown | Conquered by Celder | Camp destroyed | Military ally; Celder annexes Yunethre, not the player |
| Player remains neutral; Celder wins | Still autonomous until its own decision; may voluntarily join after a return visit | Camp destroyed | No automatic war or military alliance |
| Player remains neutral; centaurs win | Still requires a protection agreement with the surviving centaurs | Survives; allegiance must be earned | No automatic hostility from simply observing |
| Player intervenes and loses | No unearned alliance or territorial reward | Actual battle outcome applies | Actual relationship commitment remains |

The Celder-supported conquest row is a design contract, not a playable conquest
mission yet. In the current build, fighting for Celder closes Laketown's peaceful
accession route whether that side wins or loses. After a field victory, the town
remains autonomous and Celder is not yet a military ally. Return to Rowan and
accept Laketown's independence to continue the chapter.

Celder winning an unattended battle does not automatically annex Laketown: the
outline explicitly allows its subsequent voluntary accession. Celder annexation
belongs to the player-supported conquest branch and requires a separate capture
or surrender after the field victory. Conquest must not be inferred from merely
accepting Celder's offer. Outcomes remain viable paths to the later main story.

After settlement or battle, visit Laketown for its decision, including a refusal.
Return toward Minora to report. The chapter ends at the return event, rather than
requiring entry into a city that has just fallen.

## Minora's fall and Chapter 3 handoff

A speaking messenger bird from the Wizard's Guild intercepts Teresod. Prince
Wilhelm's army has taken Minora and replaced the three council banners. The Guild
has moved its tower to the lakeside cottage vicinity in South Oremindi. The bird,
not Bear, delivers the final version of this message.

The five original League provinces are lost in the chapter transition. This is a
new historical event; do not rewrite Chapter 1's winner, casualties or choices.
The Wizards' League inherits applicable alliances and voluntary Yunethre ties.
A Celder military alliance remains an alliance, never player ownership of Celder.

**Confirmed by the author:** the relocated tower is initially an enclave/refuge
inside orc-controlled South Oremindi. Arrival does not paint the region as Wizard
territory. The tower retains its rooms, Taleth, and its timeless behavior.

## Chapter 3: the mountain alliance

1. Reach the relocated tower and hear Taleth's account of the disaster.
2. Meet the North Ibenwood Rangers in the southern foothills. The North, East,
   West and South ranger factions are separate vassals of Elfland. This does not
   make the Central Ibenwood portal an ordinary owned human territory.
3. Climb to an investigation site in northern South Oremindi. Three orc raiders
   ambush Teresod. After two fall, the last retreats. Loot a head as the requested
   proof; this is an explicit inventory objective, not an automatic kill reward.
4. Return to the rangers. They agree to alliance and arrange a rendezvous six
   active minutes later. At the rendezvous a "Wait here" option advances the same
   chapter clock to the event. Exploration and birding remain optional activities.
5. Fight alongside outnumbered elves holding high ground against the South
   Oremindi chief's larger force. Include archers and sword-bearing elves, common
   raiders, more athletic armored warriors, and a chief at veteran-warrior level.
   Terrain, descending enemies and the chief's defeat should matter to the battle.
6. Report to Taleth. Chapter 4 remains outside this design pass.

The ambush should use existing combat foundations rather than duplicate combat
logic. Retreat, proof collection, waiting and report completion must persist and
be idempotent. A failed fight needs retry/withdrawal behavior, not an unmarked
completed quest. The existing Oremindi occupation supplies its physical setting.

## Loading and architecture

Expose **Chapter 2: Yunethre** prominently at startup, separately from **Chapter 1:
Lizeemi War**, and offer continuation after Chapter 1. A direct Chapter 2 start
uses an explicitly defined completed-war premise, preserving the separate Chapter
1 save. Continuing an actual Chapter 1 carries its real history and chosen colors.

Load only the current chapter's playable locations. Yunethre is the main outdoor
region; reaching Canerd necessarily needs its Celder location or an explicit
bounded travel transition. The tower is a separate lightweight interior. Distant
terrain can remain silhouettes behind mist, without constructing distant towns,
actors or collision. The Sky Lookout is the exception: retain the full panorama.
Loading time never consumes the battle deadline.

Keep chapter facts and transitions in `src/content/chapters/yunethre/`, with a
feature-owned host connecting the existing exploration, dialogue and combat
systems. Keep territorial ownership, voluntary membership, protection and military
alliance as different fields. In the campaign core, chapter commands/events are
the authoritative inputs; scenery and UI project those facts. Do not create a
second independent continent simulation or hard-code this story into world.js.

Before expanding the live political projection, scope the old League unification
helper to the original five provinces. Save a versioned continuation record and
validate it before restoring new chapter regions or a relocated tower. Failed
restores must leave the existing save intact. Check every route through reload,
pauses and repeated conversations, including elf hostility and nonintervention.

## First playable implementation (22 October)

Run `npm start` and choose **Begin Chapter 2** for a fresh start. Use
`npm run start:yunethre` to open Chapter 2 directly, resuming its save if present.
Chapter 1's completed lookout conversation also offers
**Continue / Chapter 2: Yunethre**. It saves Chapter 1 first and carries its full
checkpoint as historical data. A direct start runs the current default Lizeemi War
to completion without hero intervention and preserves that result as history.
It does not substitute an invented victory or overwrite the Chapter 1 save.

Implemented now:

- Start beside Taleth at the full Sky Lookout, with a new diplomatic assignment.
  The shared Chapter 1 main quest panel and minimap guide the journey.
- All five Lizeem regions remain accessible, alongside Yunethre and North/South Celder.
- Ordinary Lizeem residents and optional Guild wizards retain their F conversations.
  Residents and Bear use a cached snapshot of the completed war; conversation does
  not restart it. Townspeople can be spoken to on foot or on the owned horse.
- The left-hand quest card explains the current purpose, explicit next action,
  checklist and deadline. **Shift+J / Quest journal** opens Chapter 1 and Chapter 2 logs
  while holding time. Completed, missed and unresolved tasks remain distinct;
  an unattended opening is recorded as world history, not invented hero successes.
  Logs derive from the saved chapter facts and carried history, so existing saves
  need no migration.
- Teresod retains his owned horse. H summons it onto clear ground in blue wisps; G mounts.
- P toggles an autoplay of the actual main-quest conversations and walking routes.
  Movement or manual interactions take control; P resumes from current progress.
  Dismount before starting it; the current automatic route travels on foot.
  It seeks peace or follows the neutral aftermath; it does not fight a joined battle.
  It shows the political map after Laketown's decision and after the messenger.
- Four original instrumental themes accompany Laketown, the centaur camp, Celder
  and Yunethre's open country; area changes crossfade and preserve musical progress.
- Physical Laketown, centaur and Canerd speakers, with F interactions and a small
  objective marker. The existing terrain, movement and developer mounts are reused.
- A gold destination pointer gives direction and direct distance outdoors. The
  minimap and all three M-map views follow the same objective, starting at Laketown.
  Directions given by a speaker remain visible over fog without revealing terrain.
- Laketown has 17 buildings, markets, gardens, five surrounding farm plots, an
  orchard, a stone lake promenade and fishing boats. These scenic fields do not
  invent production figures; campaign food remains simulation-owned.
- Local deer, hares, boar, sheep and birds load when Yunethre is visited. The camp
  has leonine centaur residents; Canerd has mail-clad Celder knights and gate guards.
- A 15-minute deadline, reciprocal consent, immediate peace aftermath, deterministic
  neutral battle resolution, Laketown's decision, and political-map consequences.
- A playable cavalry encounter in the meadow south of Bane's Camp: four centaur
  archers, three Celder knights and Teresod, supporting either side on foot or
  horseback. These are the current local combatants, not whole campaign armies.
  The F interaction offers a side; the briefing's start action commits it.
  Telegraphs, physical arrows, committed charges and recovery openings govern
  the fight. The joined chapter clock is held; the separate field timer allows
  up to three minutes before remaining fighting strength decides the result.
  Victory, defeat and withdrawal show a report before returning to exploration.
- A witnessed assault on the return road: Wilhelm's column attacks the Muster
  Gate, council standards are replaced, and the Guild's speaking bird arrives.
  A labelled skip reaches the same messenger. The return records Minora's fall
  and offers continuation into Chapter 3 without changing South Oremindi's owner.
- An isolated `azhora-yunethre-v1` checkpoint (desktop: `saves/yunethre/`). F5 saves;
  the pause menu restores it. Chapter 1 and exploration saves remain separate.
- F8 offers **Chapter 2 test / Resolve the neutral battle** for testing without
  waiting 17 minutes. The normal clock still runs from departure and respects holds.
- F8 also offers **Chapter 2 / Advance to the battle opening**, which opens the
  normal participation window without choosing a side. **Cavalry rehearsal /
  Defend the centaurs** and **Computer rehearsal / Centaurs versus Celder** test
  combat separately, without changing chapter outcomes.

Chapter 2 supports diplomacy, nonintervention and local cavalry battle. The
separate Celder-supported conquest of Laketown still remains to build. A field
victory does not silently complete that conquest or grant a Celder alliance.
The mountain continuation described below is now playable.

Battle controls are **WASD / arrows** to move, **Shift** to run or canter, hold
**R** to draw and release to shoot, **click / F** for a staff strike, **Space**
for a foot sidestep or mounted surge, **G** to mount or dismount when stopped,
**Tab** to change target, and **Escape** for tactics/pause. A mounted surge is
speed, not an invulnerability window. Right-drag turns the camera.

The lookout and tower remain separate spaces. Leaving the tower opens onto Minora;
the journey through its streets and northwest to Yunethre uses ordinary movement.
The camp-to-Canerd conversation offers a bounded passage consuming 90 active seconds
while negotiations are open. Loading and reading consume none. The world builder
still registers global region definitions, so this is not a stripped chapter-only loader.
Passage buttons identify their destination and 1m 30s journey cost. Consent buttons
only record agreement, confirm it visibly, and disappear once that party has agreed;
the separate return-passage action actually travels back to the centaur camp.

Code: `src/content/chapters/yunethre/chapter.js` owns authored facts and rules;
`host.js` connects conversations and scenery; `checkpoint.js` validates the combined
save; `map.js` projects ownership separately from alliances and nomadic presence.
`src/simulation/campaign.js` exports `createAuthoredCampaign`, whose transactional
driver in `authored-campaign.js` owns state mutation. This does not restart the ended
five-region war or run another autonomous continent simulation.

Checks: `npm run test:yunethre` covers deadlines, both neutral winners, peace,
military-result contracts, elf hostility, handoff, history and save rejection.
`npm run test:yunethre:desktop` follows the actual conversation buttons, bounded
travel, map change and application reload in an isolated test save profile.

`npm run test:yunethre:autoplay` checks the P-driven route using ordinary movement,
conversations and the political map in an isolated native test. Autoplay never
changes saved chapter outcomes directly or resets a completed chapter.

`npm run review:yunethre` opens a scenery-only viewer for Laketown, the camp and
the new character models. The isolated native `--yunethre-art-checks` option on
the exploration/Yunethre smoke launcher checks actual navigation, wildlife and
the four playable locations, capturing screenshots in `tests/artifacts/`.

## Playable Chapter 3 / The Mountain Alliance

Run `npm run start:oremindi`, or select **Chapter 3 / The Mountain Alliance**
at startup. Continuing through the messenger in Chapter 2 carries that actual
checkpoint into a separate `azhora-oremindi-v1` save (`saves/oremindi/` on desktop).
A direct new Chapter 3 start uses an explicitly labelled unattended Chapter 2
background. Neither path rewrites the old war or invents completed hero quests.

The player begins on the return road outside occupied Minora, with the owned
horse, minimap, directional objective and Shift+J journal. All earlier scenario
regions remain accessible, with South Oremindi and North Ibenwood added. The
relocated tower stands on a dry shelf beside the long tarn, near the existing
cottage. Its rooms retain their established interior coordinates; the exterior
door and lookout landscape are relocated. Entering the tower holds time.

Taleth's assignment, ranger meeting, three-raider ambush, explicit head collection,
alliance, six-active-minute rendezvous, high-ground battle and final report are
separate persistent steps. The head appears in the journal's quest inventory
only after collection. At the rendezvous **Wait here** advances the same chapter
clock. Failed or withdrawn attempts can be retried; stale result callbacks cannot
complete a later attempt. A victory requires the veteran chief's defeat and the
opposing formation's collapse. Four elven defenders face eight orcs, with two
finite-ammunition archers, sword-bearers, ordinary raiders and armored warriors.

The surface remains under orc occupation. The tower is an enclave and the North
Ibenwood Rangers are allies, not annexed subjects. All three chapters'
records, the player's horse, and applicable Yunethre agreements persist.

F8 provides separate manual and computer rehearsals for both mountain encounters.
These restore the prior position, horse and chapter state. Chapter 3 uses the
existing staff combat: **click/X** attack, **F** guard, **Space** dodge and **Tab**
target. Each encounter has a briefing and a result screen before exploration resumes.

Implementation lives in `src/content/chapters/oremindi/`. `chapter.js` submits
rules through the authored driver exported by `simulation/campaign.js`;
`host.js` connects physical interactions and presentation, `checkpoint.js`
preserves history, and `encounter.js` reuses the existing combat model. Terrain
and wildlife remain region-owned in `src/content/regions/south-oremindi/`, independent
of quest state. Broader graded paths and terraces retain the range's tall peaks,
while the exploration adapter now loads its regional wildlife lazily.

`npm run test:oremindi` checks state, history, inventory and continuation.
`npm run test:oremindi:desktop` exercises the actual chapter, both computer
encounters, explicit collection, save/reload, the three-chapter journal and map
in an isolated native profile. This is a first playable implementation; combat
balance and the occupation sequence still need player feedback.
