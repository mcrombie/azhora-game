# Kayla's honey lesson — implementation plan

Prepared 25 September 2026. **Planning only. Do not implement until the user asks to resume implementation.** No gameplay, scenery, UI, or saves were changed while preparing this document.

## Requested experience

Kayla waits beside the river on the **Drent side of the crossing into Pueth**. Talking to her offers an optional Stealth training quest: sneak into Liz's apiary and steal some honey for her. Kayla says she used to be excellent at sneaking, before becoming a very large bear made it rather difficult.

Liz catches actual intruders through sight and sound. If she catches the player stealing, she retaliates with a formidable spell that summons **ten bee swarms together**. This happens in the ordinary world, with the normal health, movement, escape, and checkpoint systems.

Add **Kayla** beside Ben, Liz, Troy, and Cagney under **Testing tools → Quest playtests**. Its button starts a fresh, isolated quest demonstration beside Kayla and the computer plays it. Implementation includes testing both a successful theft and the caught-by-Liz outcome.

**Confirmed follow-up:** once the player completes Kayla's quest, she resumes the original roaming design: walking through **Drent, Pueth, and Luscia**, searching for honey and sometimes visiting Liz. She waits at the river before completion. This transition and subsequent roaming progress persist across save/reload; she physically walks away rather than disappearing or teleporting.

## Proposed defaults

These choices make the work concrete without requiring answers before shutdown. They can be revised before implementation.

- Working title: **A Bear's Share**. Category: skill training, with the existing **green book** marker. The lesson teaches Stealth; it does not award a spell, so it does not use the violet magic book.
- Conversation introduces the offer; an explicit acceptance begins the lesson. Refusing leaves it available. Existing Stealth students can do it as practice without resetting their skill or experience.
- Accepting teaches the existing X-to-sneak ability. Practicing earns the existing movement-based Stealth XP; successful delivery pays one modest, one-time Stealth XP bonus. No extra money, equipment, transformation powers, or new NPCs are needed.
- Being seen on Liz's public approach or speaking to her is harmless. Suspicion matters around her private honey stores during an attempted theft; Liz must not attack an ordinary visitor merely for walking near her home.
- A caught attempt is recoverable through escape or the normal checkpoint option. Liz's temporary local hostility does not permanently remove Mop's quest, her trade, or her Animal Sorcery lesson. Killing a character still has the game's normal persistent consequences.
- Default autoplay demonstrates the successful stealth route. A separate automated test deliberately gets caught to validate the ten-swarm response; it need not add another public testing button.

## Player journey

1. **Meet Kayla at the river.** Place her beside the Drent-bank path near the Tessen crossing, with clear ground for her bear-sized collision body and room for the player and horses to pass. Validate the bank's actual region and ground before choosing final coordinates.
2. **Accept the lesson.** Kayla explains X to sneak, staying behind Liz, watching suspicion, and using solid cover. Suggested tone: “I used to be splendid at sneaking. Then I became a rather large bear. You would be amazed how many twigs there are when you weigh this much.” She makes clear that this is stealing and that Liz's bees are dangerous.
3. **Reach Liz's apiary on foot.** The journal points to the honey stores, not to Liz's dialogue interaction. The existing bridge, paths, cottage, garden, mailbox, and hives provide the setting.
4. **Read the scene.** Liz visibly moves between a small number of apiary work positions and pauses to tend hives or inspect comb. Her visible facing matches her detection facing. A cottage wall and a few appropriately placed apiary props create a viable approach and escape path; do not make cosmetic foliage secretly count as a solid wall.
5. **Steal one comb.** At a specific hive or covered honey store, F starts a short taking animation while sneaking. Awareness continues during the action. Starting it openly, making too much noise, or reaching full suspicion interrupts the attempt and alerts Liz. A completed unseen pickup creates one quest honey item.
6. **Return to Kayla.** Hand over the stolen comb, receive the completion XP once, and see her eat it. She then leaves naturally to resume her rounds. The tracker and marker retire the completed lesson.

Kayla's current dialogue says she always asks Liz's permission. Revise that contradiction: Liz sometimes gives her honey, but Kayla wants more than Liz is willing to share today. Keep her warm, humorous voice while acknowledging this mischievous request. Her claim about becoming a bear is a character hint, not permission to invent a transformation backstory or system.

## Stealth and theft rules

Reuse `src/stealth.js` for facing, distance, exposure, suspicion growth/decay, and practice XP. At present, `src/drent-host.js` owns the player's sneak toggle, movement multiplier, and the barracks awareness meter. Make these available to both activities through one shared controller or observer interface. Avoid two X-key states, two competing HUD meters, or awarding XP twice for the same movement. Keep the existing barracks theft working.

- Use Liz's live position, facing, alive state, and actual line of sight. Walls and relevant solid props block vision. Distinguish detection cover from general movement collision so every shrub does not become an opaque wall.
- Show suspicion before full detection, plus clear feedback when Liz notices something or spots the theft. Crouching reduces exposure; it never grants invisibility. Running or handling a hive nearby should make the attempt easier to hear, with tunable short-range noise rather than global hearing.
- Make the existing Stealth HUD labels contextual: the apiary watches Liz's suspicion, not the current barracks-specific “guards” and “yard” text.
- Detection must run in normal gameplay near the stores without requiring Inspect or a dialogue first. Outside the theft context, normal visits remain safe.
- Use one identified quest comb, with its source and undetected-pickup flag recorded. Bought honey, Liz's free comb, or honey already carried cannot satisfy this training objective. Keep the ordinary `honeycomb` trade and Kayla's voluntary gift option intact.
- Prevent duplicate pickup, consuming the same item twice, or repeatedly claiming the completion reward. Give the quest item an inventory description and an appropriate interaction prompt.
- A caught pickup before completion gives no comb. If the player is discovered after a successful unseen pickup, they keep the physical comb and must escape the bees; discovery does not silently erase inventory. Once safe, that comb can still be delivered. A failed attempt can be retried after Liz calms down.
- Pause, menus, and dialogue stop patrol, awareness, bee lifetime, and recovery clocks. Repositioning for tests or loading a checkpoint must not grant movement XP.

## Liz's ten-swarm retaliation

The current `src/magic.js` swarm implementation belongs to the player and targets enemies. It cannot simply be called ten times as Liz: that would assign damage to the wrong caster and target the wrong people. Add an explicit NPC-owned swarm attack with caster identity, intended targets, duration, damage cadence, and cleanup rules. Reuse the existing modeled bees and wing animation from `src/magic-view.js`.

- Liz remains Liz: one body, her existing appearance and health. Give her a visible casting gesture and short warning before ten distinct swarms burst from the apiary around her. No generic soldier replacement, duplicate NPC, invisible damage, or body-origin effect.
- Spawn ten swarms on one cast, spaced into recognizable clusters. Use a capped shared visual pool or batching so this does not multiply expensive draw calls unchecked. Measure performance against the existing single-swarm effect on the same machine.
- Make the attack substantially more dangerous than the player's beginner Summon Bees spell. Tune aggregate damage explicitly; do not accidentally multiply all stagger and damage effects into an unavoidable instant death. The player should understand the threat and have a chance to turn and flee.
- Swarms pursue the thief within a bounded apiary area, respect solid cover, and visibly expire. Keep health damage and visual contacts synchronized. Liz must not accidentally kill Mop, Kayla, or bystanders with the scripted retaliation; preserve normal player friendly fire and self-defense rules.
- One detection incident starts one retaliation. Do not re-cast ten swarms every frame or reset Liz's health when she becomes hostile. If another fight is already active, queue or integrate her response without replacing that encounter or its participants.
- Leaving pursuit range and breaking sight long enough ends this local pursuit after a tunable active-play cooldown. The player can return later; Liz's other conversations stay unavailable while she is actively attacking.
- Player defeat offers the normal **return to checkpoint** recovery. Prepare a safe recovery point before entering the theft attempt, never inside a live swarm. No “Defend the Greenway” banner, enemy counter, arena teleport, or forced fight-again loop.
- Keep witnessed theft and Liz's anger local to this quest. The existing crime model handles assault, killing, and resisting, but has no general theft event; this task does not require building a worldwide theft/bounty system. Retain ordinary crime handling if the player attacks someone, without inventing an Imperial guard response in Pueth or blaming the player for Liz's bee stings.

## State, persistence, and compatibility

Add a small pure quest model, proposed `src/kayla-honey-quest.js`, with stages `unmet`, `offered`, `learning`, `carrying`, and `complete`, plus an unavailable reason if a required character is dead. Keep alert/pursuit state separate from progress so escaping does not lose a legitimate pickup.

Persist acceptance, successful pickup and item ownership, completion reward, Kayla's wait/roam decision, and unresolved local hostility. Awareness can be transient, but reloading must not provide a free theft or leave hostile damage without visible bees. If active combat cannot be saved under the existing rules, preserve the pre-attempt recovery checkpoint and explicitly test that path.

Extend `src/kayla-host.js` to coordinate the lesson with her existing travel, health, and self-defense. One subsystem must own Kayla's position at any instant. Existing saves without the new quest section should acquire the offer safely without losing her injury, death, gifts, or route history. If an old save has her elsewhere, let her walk to the new river stop through valid routes; do not teleport a visible bear or resurrect her. New games and the isolated playtest begin at the river stop.

Do not tie the lesson to choosing a faction, completing Killian's quest, learning Animal Sorcery, or advancing the main quest. It is another independent way to learn Stealth.

## Testing-tools button and computer play

Add a fifth card in the existing Quest playtests grid: **Kayla — Steal Liz's honey · Stealth**. Keep the current four-section testing-tools organization. Make the five-card arrangement readable at normal and smaller window sizes, including keyboard navigation.

Following the existing quest playtest pattern, the button:

1. Starts an isolated testing session and restores the quest's own test state, Kayla, Liz, the comb, and any stale attack effects. It never overwrites the saved adventure.
2. Places the player on clear ground beside Kayla, at the Drent river stop, and focuses this quest. Prepare a novice without prior Stealth training so the teaching is genuinely exercised; do not change unrelated skills or award the quest in setup.
3. Starts proposed `src/kayla-autopilot.js`. It accepts the lesson, crosses by the actual bridge, approaches using cover, waits for Liz's visible work cycle, sneaks, uses the normal honey interaction, returns, and hands over the comb.
4. Uses ordinary movement, sneak, interaction, and dialogue commands. There is only the initial launch teleport; no hidden progress writes, invisibility, forced facing, or subsequent warps to manufacture success.
5. Explains its intent briefly: “Waiting for Liz to turn”, “Sneaking behind the stores”, or “Returning to Kayla”. Reuse smooth movement and stable camera behavior rather than repeatedly snapping the view toward waypoints.
6. Stops on completion. Any real key or click takes control; P resumes the focused Kayla quest from its actual current state. If detected, it attempts a normal escape, then stops with a useful message rather than killing Liz to complete a stealth demonstration. Unexpected fights, death, or blocked routes stop safely and explain why.

A deterministic caught-case smoke driver uses the same interactions and deliberately approaches openly. It is a test fixture, not another public button. Re-running either scenario must restore only its test dependencies and must not disturb the actual save.

## Implementation order and files

| Step | Work | Main touchpoints |
| --- | --- | --- |
| 1 | River stop, pure quest state, revised offer and training | `kayla.js`, `kayla-host.js`, new `kayla-honey-quest.js`, `skills.js`, `pueth-world.js` |
| 2 | Shared sneak controls, Liz's work cycle, real cover and theft interaction | `stealth.js`, `drent-host.js`, new small apiary/quest host, `main.js`, existing Pueth scenery modules |
| 3 | Ten NPC-owned swarms, pursuit, crime and defeat recovery | `magic.js`, `magic-view.js`, `combat.js` / `combat-view.js` as needed, `crime-host.js`, quest host |
| 4 | Journal, marker, item, checkpoint validation and migration | `main.js`, `quest-markers.js`, inventory/item registry, `road-checkpoint.js` |
| 5 | Fifth playtest card and input-driven quest pilot | `index.html`, `testing-tools.css`, new `kayla-autopilot.js`, pilot registry and reset hooks in `main.js` |
| 6 | Automated and visual playtests; fix findings | Node tests, new native quest driver, `main.cjs`, `package.json`, documentation |

Keep the state and test drivers out of the growing composition root where possible. Implement the stealth success path before tuning retaliation, then test both together.

## Planned verification and acceptance criteria

These are future checks; preparing this plan does not count as implementing or testing the quest.

- **State and save tests:** optional acceptance, already-trained player, bought/free honey rejected, one pickup and reward, inventory-full handling without losing or duplicating the objective, correct item consumption, retry after detection, old-save migration, save/reload at each safe stage, missing/dead Kayla or Liz, and pause semantics. Assert that completion starts her original three-region roam once, and that reload preserves the route and does not return her to the lesson stand.
- **Real-world navigation:** Kayla fits on the Drent bank without blocking the crossing; walking and horseback approaches work; the player crosses the real Tessen bridge and can reach the hive and leave; Liz's entire work loop clears her house, mailbox, hives, garden, and other actors.
- **Stealth behavior:** front/back approach, wall occlusion, close noise, suspicion warning, crouch exposure, visible taking, no attack on normal visitors, one catch event, no XP while standing, paused, or teleported. The original Drent barracks quest still works with a lesson learned from either teacher.
- **Bee behavior:** exactly ten live swarms after one Liz cast, correct owner and player target, visible attack and damage, bounded pursuit, cover, no unintended friendly casualties, no repeated spawn/stagger loop, cleanup on retreat, death, reload and restarting a playtest.
- **Native success run:** click the actual Kayla card; watch the entire novice teaching, crossing, sneak, theft, return, delivery and resumed Kayla walk. Assert one completed quest, correct item/XP result, and no application errors.
- **Native caught run:** deliberately steal openly, verify Liz's real casting pose and ten swarms, take real damage, flee and retry. Separately verify defeat and return-to-checkpoint without a forced retry-only screen.
- **Control and isolation:** interrupt/resume at dialogue, travel, waiting, pickup and return; run Kayla twice, then Liz's Mop playtest and another teacher's quest; compare the real saved adventure before/after. Confirm stealing has not awarded Summon Bees or changed Mop's progress.
- **Visual and performance review:** screenshots of Kayla's river placement/green marker, Liz's working apiary and cover, stealth feedback, all ten swarms, and the five playtest cards; short captured gameplay of the success and caught runs to assess camera smoothness and readable bee motion. Check frame timing and draw calls under the ten-swarm load.
- Run appropriate existing Stealth, Drent, Kayla, Liz, magic, crime and checkpoint regressions; add new tests to the explicit `npm test` list. Run native Electron checks sequentially and rebuild the web output only during implementation.

Ready for the next session: implement from step 1 when authorized, preserving this document as the design and acceptance checklist. Final balance numbers for the pickup duration, XP bonus, swarm damage/lifetime, and cooldown should be chosen through the planned novice playtests rather than treated as settled tonight.
