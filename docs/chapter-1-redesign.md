# Chapter 1 redesign: instruction, the road, and the highway gang

Status: design handoff for Claude Code; no gameplay changes made by this document.
Requested by Michael, 21 September 2026. Source reviewed at `b828b79`; development is active, so re-read the current tree before implementation.
Implementation prompt: [chapter-1-claude-prompt.md](chapter-1-claude-prompt.md).

**Correction, 21 September 2026, from Michael and overriding the text as first written: the highway robber is MALE.** Codex drafted this brief with a woman on the road; every mention below now says a man. Nothing else about the encounter changed.

## 1. The requested change

Jojo, Tidehaven's harbourmaster, sends the newly arrived mercenary to an Imperial soldier responsible for combat instruction. The soldier actually teaches the player; a quest card pointing at an unattended dummy is not enough. Fighting is the first skill the opening teaches. Once the lesson is complete, the soldier gives directions to the Imperial rendezvous at the army post in Drent.

On the road outside the village, farther inland than the current opening encounter, **one highwayman** attacks. This is the player's first real fight. Afterward the existing journey resumes. In **Luscia**, the bandits of his gang replace the wolves at the missing courier's cart. These human highway robbers should be tougher than goblins and less formidable than Coalition soldiers.

The robber is a **man**: a male highway robber, openly confronting the traveler on the road. He is not a pickpocket, a stealth-thief tutorial, or a group of attackers. Both of the spoken references — “highwoman” and “that highwayman” — are the same person, and Michael settled the question on 21 September 2026: **make the highwayman male.** This document was written the other way round and has been corrected throughout; the correction is the requirement, not a proposal. Use the atlas spelling **Luscia** for “Lusia.”

This document separates the requested requirements from proposed implementation choices and optional story ideas. The latter are not additional user-approved features.

## 2. Scope and continuity

This changes Chapter 1's introduction and one connected encounter in the current Chapter 2. In `story-chapters.js`, Chapter 1 ends on reporting to Iven in Lumber Town; the Lauvel courier task is already part of Chapter 2. Preserve those chapter boundaries unless the implementation plan identifies a concrete reason to change them.

The intended route is:

**Land at Tidehaven → speak to Jojo → report to the duty soldier → supervised combat lesson → receive onward directions → leave the village → fight one highwayman → report to Corvan in Drent → existing supplies/crossing/waymarkers/Iven sequence → recover the Luscia courier's satchel against the same gang → existing horse, muster, and war arc.**

Replace the initial mandatory three-goblin fight; do not add the highwayman after it. Goblins remain part of the world and the northern threat. Keep the later Avrel supply assignment and its existing encounter, the optional goblin camp, the optional Drent learning route, companion stories, and the later faction choice. Do not perform a global goblin-to-bandit or wolf-to-bandit replacement.

“Farther down the road” primarily means moving the ambush away from the village. Corvan's existing post in the Avrel clearing is the first army rendezvous. Do not relocate the post or build another camp merely to satisfy that wording.

## 3. The opening, beat by beat

### A. Jojo makes the introduction

Keep the boat arrival and Jojo as the first required conversation. She recognizes the mercenary's arrival, gives or retains the existing letter of introduction, and points to the duty soldier by a visible landmark. Her directions should name a person and a place, not only light a marker.

Suggested register, not final dialogue: “Army contract? The duty soldier is beside the practice ground. Show him your letter. He will see you ready for the road to Corvan's post.”

Reconcile the opening captions, bell, companion advice, journal, and objective text with the new first encounter. Remove urgent instructions claiming the player must immediately kill three goblins. Distant goblin danger can still be mentioned as context.

### B. An ordinary soldier teaches fighting

Preferred reuse: **Footman Ottar**, the existing `post-landing` Legion soldier. Give him the local training duty and place him where the practice ground is clear and approachable. He remains an ordinary uniformed soldier, not a new general or senior officer. Eren (`warden`) remains the Greenway watchkeeper; avoid adding another near-identical person. If current work makes Eren a substantially better reuse, explain that choice in the implementation plan before changing his role.

The lesson has an actual conversation before practice and a short acknowledgment afterward:

1. Present the letter and hear what is being taught.
2. Practice an attack with the equipped starting weapon at an appropriate target.
3. Learn to recognize a windup, dodge, and exploit recovery. Use a safe demonstration or controlled practice exchange; this is instruction, not the first hostile fight.
4. Show the first combat-skill progress and explain where to find it in the skills panel. Make dismissing the panel obvious.
5. Return to the instructor for completion acknowledgment and directions to Corvan.

Retain the current simple two-hit/one-dodge baseline where it fits the equipped weapon, but require instruction to have started and the instructor to sign off. Striking the post before speaking to him must not silently finish the lesson. No new required shield purchase, advanced combo, sparring grind, or additional combat subsystem.

**Skill-system decision:** the code already has seven fighting skills under Arms, not one generic Fighting statistic. Teach “Fighting” as the first skill lesson and award the existing weapon-family skill appropriate to the chosen character (Blades for the default sword). Do not create an eighth duplicate combat progression system or reset a veteran character's background skills. Where that character already knows the skill, acknowledge competence and offer a short practical check. Handle bow starters using the current archery target/input; do not force every protagonist into a sword lesson.

Jojo currently teaches Cartography when handing over the letter. Defer that formal new-skill lesson/award until after the combat lesson so fighting is genuinely the first required skill introduction. The rough chart and basic directions can still be given immediately. Preserve existing chart exploration, optional learning, and starting character skills; this is an opening-sequence change, not a global ban on learning anything else.

### C. Dispatch, letter and inventory

The soldier points to **Corvan at the Avrel clearing in Drent**, with the first recognizable turn or landmark. Keep the letter as a readable satchel item and retain the open/select/read/dismiss lesson. Prefer completing this at the end of training or at the next natural watch stop, before departure, so the player does not have to return to Tidehaven after the ambush.

Preserve the road token's purpose and quantity if its grant moves from Eren to the instructor. Grant letter, token and lesson rewards once only. The tutorial must leave the player with the existing items required by downstream quests.

### D. Space between safety and the first fight

Choose a road segment beyond the built-up village, on the actual route to Corvan, with a readable approach and clear ground. Let the roofs and training area fall behind before the confrontation. A short uninterrupted walk is enough; do not add a long empty commute.

Placement is measured from the current road and village footprint, not guessed from legacy coordinates. The implementation plan should record the old and proposed road positions, walking distance from the village edge, and a clear retreat/checkpoint position. Preserve teacher stands, companion routes, nearby quests, and the road's collision clearance.

Use **one authored encounter anchor** for geometry clearance, activation, opponent spawn, checkpoint, map pin, objective direction and autoplay. The current opening has separate hardcoded coordinates in several places; moving the visible opponent alone will leave a broken tutorial.

### E. One highwayman

A human man steps into the road and openly demands money or equipment, then attacks. A short line and visible preparation establish intent. There is exactly **one hostile actor**: no hidden second attacker, reinforcements, animal helper or escalating wave.

Suggested register: “Army paper buys no passage here. Put your purse down.” Do not add a payment branch that bypasses the required first combat lesson in this pass. Defeat/retreat/retry should use existing behavior; the player should have time to read a tell and try the newly taught response.

His appearance should read as a practical road robber: worn traveling clothes, a distinctive scarf or fastening, and a plausible weapon. Avoid using a goblin model with a human label or an unchanged Coalition uniform. He is dangerous because he uses violence to rob travelers, and for no other reason: no special combat mechanic hangs off who he is.

Retain the existing teaching-fight policy that keeps companions from completing the lesson for the player. Do not automatically recruit passing civilians into this encounter. Companions can remain present in the scene and acknowledge the outcome. Do not dismiss recruits permanently or alter their saved relationship/death state to stage the tutorial.

On victory, record the encounter once, allow a short recovery, and continue toward Corvan. A gang emblem, distinctive knot or brief exchange establishes a connection to Luscia. Do not require collecting a new mandatory quest item. Do not later resurrect him by accident: gang dialogue must work with whatever death/escape outcome is actually implemented.

### F. Resume the established road

Corvan acknowledges the report about the robber and proceeds with the existing assignment. Preserve the three supply parcels, later Avrel encounter, Caloss repair, Hollis and Sava's testimony, waymarkers, and report to Iven. The new opening should feed this route rather than replace it with a new bandit campaign.

### G. Payoff in Luscia

At the Lauvel cart, replace the authored two-wolf encounter with members of the highwayman's gang. **Two bandits** is the proposed starting composition, preserving the existing encounter scale; final tuning is measured. Space their pressure so the novice can read them. A shared visual sign plus one specific line connects the encounters without requiring the player to remember a proper name.

Suggested register: “You came through our road in Drent. Leave the courier's bag.” They exploit a war-damaged road and a stranded courier. Do not make them Coalition troops or equate the population's republican support with criminality.

Keep the courier's satchel, Iven's return conversation, the horse token, existing copper pay, and subsequent muster progression. The current implementation permits escaping with the satchel rather than killing both wolves; preserve that escape-and-deliver route for the bandits unless Michael later requests otherwise. The required first victory remains the lone Drent encounter. Do not silently add a new kill gate to the Luscia return action.

Replace wolf-specific titles, warnings, toasts, victory lines and tutorial assertions for this encounter only. Ordinary wolves and their models remain available elsewhere.

## 4. Combat difficulty and presentation

Required ladder: **goblin < highway bandit < trained Coalition soldier**. Compare equivalent world difficulty, then verify the actual Drent and Luscia encounters with their country multipliers and starting equipment. Raw hit-point ordering is not sufficient.

Proposed approach: a dedicated `bandit` enemy kind with moderate damage, readable commitment and recovery, and less defensive discipline than a soldier. Do not copy the soldier's full shield, armour, poise and coordinated pressure. Avoid invisible speed increases, instant attacks, surprise ranged enemies or first-fight one-shot damage. Reuse existing combat rules, animation support and hit feedback.

The single highwayman is individually stronger than a goblin, but replacing three simultaneous goblins with one human should make the first fight easier to understand. The Luscia pair adds pressure through a second opponent, not through unreadable attack timing. Tune and document effective health, damage, tell/recovery, active attackers, and representative player outcomes. Keep unrelated enemy kinds and army-battle balance unchanged.

## 5. Implementation map for Claude

These are source-navigation hints, not guaranteed current line numbers:

| Concern | Current locations and traps |
| --- | --- |
| Jojo, instructor, Eren and training | `src/main.js`: `jojoOnTheLanding`, `chrisOnTheLanding`, NPC conversation dispatch, practice counters/events; `src/legion-posts.js`; `src/world.js` training/NPC stands. |
| Ordered tutorial | `src/game-state.js`: `questSteps`, `advanceQuest`; `src/main.js`: objective destinations, refresh/HUD, triggers. Add explicit instruction/completion state instead of relying only on post hits. |
| First fight | `src/opening-fights.js`: `GREENWAY_RAID`, `OPENING_FIGHT_GROUND`; `main.js`: `startAmbush`, `TEACHING_FIGHTS`, bystanders, defeat/retry; world clearance and independent trigger coordinates. |
| Skill lesson | `src/skills.js`, `combat-skills.js`, current `teachers.js`/archery support, player starting skills; remove the hardcoded assumption that any straw hit first teaches Blades. |
| Road continuity | `src/journey.js`, `journey-content.js`, `region-world.js`, `world-scale.js`; Corvan is `meadow-courier`. Current scale is 100 m per atlas hex. |
| Human opponent | `src/combat.js`, `combat-view.js`, `characters.js`; add supported kind/model/name handling, not a fallback goblin or relabeled soldier. |
| Connected Luscia fight | `src/luscia-chapter.js`: `LUSCIA_WOLVES`, `clearWolves`, strict snapshot validator; `main.js` encounter toasts, callbacks and labels. |
| Saves and replay | `src/road-checkpoint.js`, `woodland-progress.js`, `story-starts.js`, tutorial F8 helpers; old numeric quest stages and `wolvesCleared` carry historical semantics. |
| Navigation and automation | `src/autopilot.js`, `autoplay-smoke.js`, local-map/quest-marker code, `road-smoke.js`, deterministic review views. |
| Story and opening copy | `src/story-chapters.js`, `opening-sequence.js`, `index.html`, quest/journal text and any opening narration referring to three goblins. |

The tree has moved since earlier catch-up notes: normal/hard mode, archery and battle balancing have active changes. Re-read current code and `docs/design-answers.md`; do not restore older implementations or resolve unrelated bugs as part of this brief.

## 6. Saves, validation and completion criteria

Plan a migration explicitly. Do not reinterpret an old quest-stage number as a different unfinished obligation. Old saves beyond the opening remain beyond it; preserve learned skills, equipment, letters, coins, companions and completed road quests. Map completed legacy Greenway progress to completed opening progress without another reward. Saves within the old opening resume at a safe equivalent point. Preserve legacy Luscia `wolvesCleared` and encounter-ID meaning through an adapter or deliberate versioned migration; its validator currently rejects unknown keys and inconsistent revisions.

Acceptance checks:

- New game: Jojo names the instructor; instructor conversation begins the lesson; unsupervised earlier post hits do not bypass it.
- Fighting is the first required new-skill lesson; completion and any reward happen once. Alternate protagonists retain their existing skills and receive equipment-appropriate instruction.
- Letter inspection/dismissal and onward directions still work; the correct Corvan objective appears.
- The first mandatory hostile fight is exactly one human highwayman at the new location. No old three-goblin raid triggers at the village bell.
- Map pin, physical approach, collision-free spawn/checkpoint, retreat, defeat/retry and autoplay agree on the new site.
- Companions/bystanders do not win the first lesson for the player; their persistent state remains intact.
- The bandit's behavior demonstrably sits between goblins and soldiers, including effective country scaling.
- Luscia uses human gang members with the established visual/story connection. Escape with the satchel and delivery still work; rewards are not duplicated after retry/reload.
- Corvan's assignment through the Moros/Solis campaign remains connected, and optional Drent content remains optional.
- Legacy saves before/during/after the old tutorial and courier quest load safely; F8 starts and autoplay reach the same milestones.

Use focused Node tests for the affected modules and meaningful progression/migration assertions. Update brittle three-goblin/wolf expectations intentionally. Coordinate one full suite at integration time, not simultaneous full suites across agents. Follow the current project's user-approved policy for Electron runs; distinguish tests actually run from proposed renderer checks. When renderer review is authorized, inspect the instructor, road approach, highwayman, and Luscia pair in addition to driving the actual opening-to-Iven sequence. Never overwrite the player's real save to validate this redesign.

## 7. Optional story improvements for later regional arcs

These are recommendations, not scope for the implementation above.

- **Drent: a contract becomes a lived journey.** Let the soldier be useful and competent. Corvan records a concrete roadside problem. That makes later doubts about Imperial orders more persuasive than announcing the political answer at the landing.
- **Luscia: who keeps a road safe?** The gang exploits abandoned farms and disrupted patrols. Civilians distinguish the robbers from local republicans who protect travelers. Use one witness and a visible consequence, not another history lecture or mandatory quest chain.
- **Moros: orders acquire a human cost.** A future requisitioned-grain task could reveal that an official supply shipment is a village's winter reserve. Obeying, diverting it or reporting the discrepancy could change a later visit. This is a separate regional arc, not an extra hurdle in the tutorial.
- **West Suval and West Izol: let government be observable.** Show assemblies, food distribution, competing commanders and civilian support for the Republic. People can disagree within a legitimate government; the gang need not secretly represent it.
- **Ambron: make the institution convincing.** Build a regional story around an effective, impressive capital whose comfort depends on requisitions elsewhere. A competent imperial officer and an unjust order can coexist.
- **Companions remember particulars.** One short reaction to a roadside robbery or a later requisition is more useful than every companion delivering the same faction opinion. Recall choices through later dialogue and places.
- **The northern threat remains a separate pressure.** Goblins still endanger northern communities. Reserve stronger Thalmagar clues for later geography and ruins; do not make the first robber secretly serve the final villain.

Use a common structure for future regional arcs: a local person with a practical need, a problem specific to that country, a player action with consequences, and a changed place or relationship on return. Each arc should introduce that region rather than repeat Drent's lesson.

## 8. Handoff deliverable

Claude should first produce a concrete implementation plan: current-state audit, proposed instructor and encounter placement, progression/state design, legacy-save mapping, affected files, balance measurement, test plan, and a small sequence of reviewable implementation steps. Keep mandatory requirements, chosen implementation details and optional future stories visibly separate. This request authorizes writing and handing off the design; it does not itself ask Codex to alter gameplay or start an unbounded implementation run.
