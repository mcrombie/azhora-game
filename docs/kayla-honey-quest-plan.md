# Kayla, her cub, and the honey quests

Updated 26 September 2026. **The user authorized implementation of this redesign.** This replaces the 25 September plan in which Kayla herself offered the stealth lesson. Both quests and their testing-menu autoplay runs are implemented. Native playtests and focused regression checks are complete; see [the validation report](bear-quests-report.md) for results and known unrelated failures.

## Two separate quests

The **unnamed bear cub** offers the honey theft and Stealth lesson. The user will choose a name later; display **Bear cub** until then. The cub waits on the Drent side of the Tessen river crossing into Pueth. It has a smaller, younger bear model. The lesson keeps the humorous explanation about having been better at sneaking before becoming a bear. Do not invent a transformation history or additional characters.

**Kayla** waits outside **Ambron's east gate**, the Ossen Gate. Her quest is **The Honey Race**. Ed the Chameleon stole her honey and demands a race to recover it. The player rides on Kayla's back and steers her; Ed rides a unicycle. Acceptance brings the existing Ed into the scene with his purple poof, without creating another independent Ed.

The race follows the real road east to the Caloss crossroads where Calum the prophet stands, and where Cagney waits until her escort quest takes her away. The finish is a fixed place; Cagney's current location cannot invalidate it. Ordinary travel, scenery collision, and character bodies remain in effect. A short countdown announces the start. Movement controls steer Kayla and Shift runs; no separate arena or scene is needed.

Winning makes Kayla's thank-you dialogue available and awards honey once. Losing allows another attempt, with a physical ride back to the starting gate. There must be no hidden race teleport, progress shortcut, duplicate honey reward, or change to Cagney's quest.

## The cub's Stealth lesson

The cub's optional green skill marker offers training rather than a magic spell. Accepting introduces the existing X-to-sneak control, including for a novice who has not learned Stealth elsewhere. Existing students can practice without their progress being reset.

The player crosses the real Tessen bridge, reaches Liz's apiary, waits for her work cycle, and approaches the designated honey store quietly. A brief taking interaction must finish unseen. The journal points to the honey store rather than asking the player to inspect or fight Liz.

Use one shared sneak toggle and movement multiplier with the existing Drent activity. Liz's visible feet and facing must match her detection position and cone. Solid cottage walls block vision; flowers and small decorative props are not opaque walls. Show suspicion before detection. Entering the public approach, visiting Liz, or doing Olive's quest does not itself count as theft.

Only the specifically stolen comb satisfies the lesson. Ordinary honey, purchased honey, and Kayla's race reward cannot substitute. Pickup and delivery are atomic, with no duplicated item or reward. A caught attempt before pickup gives no comb. If Liz catches the player after an unseen pickup, the player retains that comb, escapes, and can still deliver it. Delivery awards Stealth XP once.

## Liz's response

Liz has a visible casting warning followed by **ten simultaneous bee swarms**. The spell belongs to Liz and targets the thief. It neither spends the player's focus nor grants player Animal Sorcery XP. Reuse the striped bee bodies, heads, and animated wings; ten swarms show 120 modeled bees.

The attack damages ordinary player health through the combat system, retaining armor, dodge protection, hit feedback, and normal defeat. It must not label death as drowning or launch a generic Greenway encounter. Other combat participants remain intact; the scripted retaliation cannot hit Olive or bystanders, and its damage must never be attributed to the player.

The warning and pursuit provide a chance to flee. Solid cover blocks movement and stings, pursuit has a bounded range, and swarms expire. One detection incident creates one cast rather than ten new swarms every frame. Pause and dialogue freeze the relevant clocks. Temporary local anger clears after escape or its cooldown so the player can retry and Liz's existing quests remain available. Ordinary player assault and permanent character death still follow existing rules.

## Reunion and roaming

After the race reward is collected, Kayla physically travels from the crossroads to her cub in Drent. She waits there if the cub's lesson is unfinished. The player may complete the two quests in either order.

**Only after both quests are complete and Kayla has reached her cub do they begin roaming together.** Kayla resumes the original honey circuit through Drent, Pueth, and Luscia, including occasional visits to Liz. The cub follows, and Kayla waits if it falls behind. Use the real bridge and the existing bounded Caloss swimming crossing. Do not teleport either bear to catch up or create duplicate actors. Injuries and deaths remain persistent; a dead mother or cub cannot take part in the reunion.

## Persistence and testing tools

Save separate optional sections for the race (`kaylaRace`), cub lesson and apiary patrol/anger (`cubHoney`), and reunion/following (`bearFamily`). Keep the existing `kayla` health and honey-round state. Older saves without these sections remain valid and must not invent completed quests or replay rewards. A roaming family save requires both completed quests. A carrying cub-quest save requires exactly one stolen quest comb.

Add two cards under **Testing tools / Quest playtests**, alongside Ben, Liz, Troy, and Cagney:

- **Kayla / The Honey Race**: start beside Kayla at Ambron's east gate and autoplay acceptance, countdown, physical race, finish, and reward conversation.
- **Bear cub / Honey theft / Stealth**: start beside the cub and autoplay the lesson, crossing, stealth approach, actual taking interaction, return, and delivery.

Both are isolated demonstrations that leave the real saved adventure unchanged. Only the initial setup may teleport. The pilots issue ordinary input and conversation commands; they may not set completion flags, disable detection, force a win, or grant rewards directly. Real input takes control and P resumes the focused quest. Failed, blocked, or defeated runs stop with useful feedback.

## Verification contract

Native checks must run sequentially. Complete these checks before reporting the implementation ready:

- **Race:** acceptance, countdown, fair route progress, win/loss, retry, pause, one reward, and save/reload in progress. Both contestants follow collision-valid road lanes.
- **Cub lesson:** novice/existing student, real unseen theft, suspicion and cover, failed pickup, caught-after-pickup, item conservation, one XP reward, retry, pause, and dead-character handling.
- **Spell:** visible warning, exactly ten swarms, Liz ownership, normal damage and defeat, armor/dodge, safe bystanders, pursuit range, solid cover, expiry, and cleanup after restart/reload.
- **Family:** either completion order, physical return to the cub, waiting, both quests required, cub following, bridges/swimming, pause, injuries/death, and checkpoint continuity.
- **Real testing-menu runs:** click each actual card, watch each full autoplay to completion, interrupt/resume it, run it again, and confirm the ordinary save was not overwritten.
- **Caught run:** provoke Liz openly, verify the visible spell and real health loss, escape and retry; separately verify checkpoint recovery after defeat.
- **Visual review:** cub at the river, Kayla outside the gate, a properly seated rider, one Ed pedaling one wheel, poof arrival/departure, ten recognizable swarms, and both bears together. Check camera smoothness.
- **Regressions:** existing Kayla combat, Drent stealth, Liz's Olive/Animal Sorcery quest, Cagney escort, inventory, corpses, checkpoint validation, and the other quest pilots.

Current module boundaries are `cub-honey-quest.js`/`cub-honey-host.js`, `kayla-race.js`/`kayla-race-host.js`, their autopilots, `bear-family.js`, and `apiary-bees.js`/`apiary-bees-view.js`. Models extend `kayla-character.js` and the existing `chameleon-model.js`. The composition root wires UI, input, health, inventory, and persistence without owning these state machines.
