# Chapter 1 redesign: the implementation plan

The plan Codex's `docs/chapter-1-claude-prompt.md` asks for, against `docs/chapter-1-redesign.md`
and the tree at **`e3626a5`**. Nothing here is built. Every code fact below was read out of the
source today and is cited; everything proposed rather than confirmed says so.

**The user's ruling of 21 September 2026 is carried throughout: the highway robber is a man.**

---

## 1. What the player meets, before and after

**Today.** Come ashore → Jojo at the pier head gives the letter → a quest card points at a straw
post at the crossroads; hit it twice and dodge once, unsupervised → walk inland → **three goblins**
ambush you on the Greenway 56 m from the village, with villagers caught in the open → report the
goblins to Eren at the Greenway Watch, who gives the road token → read the letter → the fork →
the Caloss Gate. In Luscia, **two wolves** take the courier's satchel at the Lauvel.

**After.** Come ashore → Jojo gives the letter **and sends you to Footman Ottar at the landing**
→ Ottar briefs you, watches you work the post, and acknowledges it: fighting is the first skill
anyone teaches you → Ottar dispatches you to Corvan's post in the Avrel clearing, and the letter
and token business is unchanged → farther out on the Greenway, past Willowmere, **one highwayman**
steps into the road and attacks → you tell Eren on the way past → the fork, the gate, and the
existing road. In Luscia, **two of his gang** are at the cart instead of the wolves, and you know
them by sight.

Dialogue beats, as short as the road's other lines and in the register of the men who speak them:

| who | when | the beat |
|---|---|---|
| **Jojo** | after the letter | Names Ottar and points down the pier. One line: the army's man at the landing signs hired swords in and will not let one walk west without knowing which end of a sword to hold. |
| **Ottar** | on arrival | Says what he is doing and what he wants: post, two hits, one dodge, and he is watching. This is the only lesson, so the hint copy the quest card carries today moves into his mouth. |
| **Ottar** | on completion | Acknowledges it once, gives the road west and Corvan's name, and says the road is not safe — which is the setup for the fight. |
| **the highwayman** | on the road | Demands the purse. Codex's register, kept: *"Army paper buys no passage here. Put your purse down."* No payment branch in this pass. |
| **Eren** | after the fight | The report is a robber now, not three goblins. He still hands over the road token. |
| **the gang, at the Lauvel** | Luscia | One line that names the man on the Greenway, so the connection is said rather than implied. |

---

## 2. The code, confirmed

Every hook below was read at `e3626a5`.

**The tutorial spine is eleven numbered stages** (`questSteps`, `src/game-state.js:62-76`) driven
by one pure function (`advanceQuest`, `:77-90`):

```
0 ashore → 1 accept-letter → 2 trained → 3 ambush → 4 victory → 5 meet-waykeeper
  → 6 inspect-letter → 7 close-inventory → 8 reach-north-trail → 9 reach-border → 10
```

**Do not renumber them.** Six things key off the numbers and would all have to move together:
the save validator (`src/road-checkpoint.js:77`, which accepts `1..10` and **rejects 4** so a save
can never sit inside the fight; `:90` requires the letter at ≥2 and the token at ≥6; `:192`
requires two practice hits and one dodge at ≥3); the autopilot's ladder (`src/autopilot.js:428-438`,
one case per stage); `knownNPCs` at ≥5 (`src/main.js:2985`); Bran's "You cleared the road!" at ≥5
(`:3885`); the road smoke; and every existing save. Reusing the numbers and changing what happens
*at* them is the whole migration story, and it is why this plan is cheap.

**The fight itself.** `GREENWAY_RAID` (`src/opening-fights.js:9-14`): three goblins at 75 hp,
centre `(-56, 29)`, checkpoint `(-45, 29)`, retreat line `x = -36`. `OPENING_FIGHT_GROUND` (`:22`)
is what keeps props off the checkpoint and the entry points, and `src/world.js` reads it. The
trigger is a box test at stage 3 — `x` between −68 and −46, `|z − 29| < 8` — calling `startAmbush()`
(`src/main.js:5130`, `:4790`). `startAmbush` also rings the village bell and calls `caughtIn`,
which puts villagers in the fight through `bystandersFor` (`src/bystanders.js`): some take up an
axe, some are caught in the open.

**The teaching-fight policy exists and must be kept.** `TEACHING_FIGHTS`
(`src/main.js:613`) holds the Greenway raid, the Avrel raid and the sparring bout; the new
encounter id must join it, or companions finish the lesson for the player.

**The instructor.** Footman Ottar is already built: `post-landing`, a `legionary` at authored
`(-3, 34)` with two lines (`src/legion-posts.js:18`), one of which already points at the
quartermaster in the Avrel clearing. He is the right man and he needs no new geography.

**Corvan** is the quartermaster at `corvanPost = avrel(4, -8)` (`src/places.js:44`), in the Avrel
clearing — which is in Drent, so "Corvan's existing Drent post" is satisfied by copy alone.

**The straw post pays Blades already** (`src/main.js:4816`, `:4822`): a `practice-hit` increments
`practiceHits` at stage 2 and calls `arms.learn('blades')` with `source: 'post'`.

**Luscia.** `LUSCIA_WOLVES` (`src/luscia-chapter.js:44-45`), id `lauvel-wolves`, centre
`toWorld(-375, 177)`, checkpoint `toWorld(-386, 182.9)`. State is four booleans — `started`,
`briefed`, `satchelTaken`, `wolvesCleared`, `returned` — validated at `:70`, and taking the
satchel is what starts the fight (`:141`).

**Levels.** Drent is level **0** and Luscia level **1** (`src/region-levels.js`), and encounters
take their ground's level unless one is authored. So the same bandit kind is automatically harder
at the Lauvel: health ×1.45 and damage ×1.30. That is the brief's "tougher in Luscia" for free,
and it means the pair there must be measured, not assumed.

**No human bandit kind exists.** `ENEMY_KINDS` (`src/combat.js:20-37`) has goblin, wolf, soldier,
sparring and ogre. The soldier is the trained man: `guard .8`, `armor .2`, `poise true`, `pack 2`.

**Overlapping work: none.** Every agent is retired and all 25 worktree branches are merged. The
one live constraint is that this changes the first five minutes of the game, which is the demo.

---

## 3. Where the fight goes, and how the site is chosen

**Proposed, not measured:** the Greenway between Willowmere and the Greenway Watch. Willowmere is
at authored `(-97, 9)` and Eren's watch at village-frame `(0, -66)`; the present ambush is at
`x = -56`. Somewhere near `x ≈ -105 to -120` puts the robber four to five times farther out than
the raid it replaces, out of sight and earshot of the village, and still short of Eren, so the
existing order — fight, then report to Eren, then the fork — survives untouched.

**It must be measured before it is authored**, and this plan does not pretend otherwise. The
method, which is the one `startMark` and the arenas already use:

1. `canStand` for the traveler's checkpoint, both entry points and the retreat line, at the body
   radius the fight uses.
2. No prop, path, forage patch or interaction stand inside the arena — the same sweep
   `tests/props.test.js` does for the existing raids, with the new points added to
   `OPENING_FIGHT_GROUND` so `src/world.js` keeps them clear.
3. The road actually passes through the trigger box, checked against `world.paths[0]`, so a
   traveler keeping to the road cannot miss it.
4. A render (`stand-at:` at the checkpoint, and the encounter composed) before it is called done.

Anything short of that is a proposal, and the implementer should say which it is.

---

## 4. States, events and once-only grants

Keep the numbers; change the meaning of two of them.

| stage | today | after |
|---|---|---|
| 1 | Speak to Jojo | unchanged; her copy names Ottar |
| **2** | Find the straw post | **Report to Ottar; he sets the lesson and watches it.** `trained` still leaves it |
| 3 | Into the Greenway | unchanged; the trigger box moves with the fight |
| **4** | three goblins | **one highwayman** |
| 5 | Report the goblins to Eren | Report the robber to Eren |

New events, one each, all once-only and all derived rather than remembered where possible:

- `meet-instructor` — Ottar has begun the lesson. **This is the gate on progression from the
  post**: `practice-hit` must not count `practiceHits` or pay Blades until the lesson has begun
  (`src/main.js:4816`, `:4822`). The brief asks for this explicitly and the code does not do it
  today — a player who wanders to the post first can finish the tutorial's first skill with
  nobody teaching them.
- `instructor-done` — the acknowledgment and the dispatch. Grants nothing new: the letter is
  already granted at stage 2 and the token at 6.
- The robber's defeat records once, through the same path the Greenway raid uses, so the
  checkpoint behaviour, the defeat panel and the retry are unchanged.

No new inventory grant is proposed. The brief says not to require a new mandatory quest item and
the plan follows it; a gang token, if wanted, is a later optional pickup.

---

## 5. Saves, and what an old one does

Because the numbers are reused, most of this is arithmetic rather than migration.

| a save written at | what it should do |
|---|---|
| stage 0–1 | Nothing owed. The new lesson is ahead of it. |
| **stage 2** | Was "go and hit the post"; is now "report to Ottar". The save carries `practiceHits`/`practiceDodges`, so a traveler who had already hit the post twice must **not** be made to do it again: treat the lesson as begun and let Ottar acknowledge the work already done. |
| stage 3 | Walking to a fight that has moved. The marker and the trigger box move with it; nothing in the save contradicts that. |
| stage 4 | **Cannot exist** — `src/road-checkpoint.js:77` rejects it. Nothing to migrate, and this is worth keeping. |
| stage ≥5 | The fight is behind them. Its copy is in the journal as prose only; no state says "three goblins". |
| **`wolvesCleared`** | The Luscia fight keeps its id `lauvel-wolves` and its four booleans. A save that cleared the wolves has cleared the gang; the obligation must not replay and the copper must not pay twice. **Keep the id.** Renaming it would invalidate saves at `src/luscia-chapter.js:70` for no gain. |
| `meadowCleared`, the goblin camp, the Avrel raid | Untouched. Goblins stay in the world. |

The one real risk is the stage-2 save, and the mitigation is that the lesson's completion is
already recorded in two numbers the save carries.

---

## 6. The highwayman: model, kind, name, numbers

**Kind.** A new `bandit` in `ENEMY_KINDS`, between the goblin and the soldier, using the fields
that already exist and inventing none:

```
bandit: { tell: .7, attack: .5, contact: .22, recovery: 1.05, damage: 20,
          speed: 2.2, engage: 2.15, reach: 2.25, lunge: 1.6, guard: .45, pack: 1 }
```

Reasoning, all of it against the table rather than a feeling: damage 20 sits between the goblin's
17 and the soldier's 24. He gets a **partial guard** so he reads as a man who has done this, but
**no `armor` and no `poise`** — a hit still interrupts him, which is what makes a first fight
legible, and which is exactly what a soldier does not give you. `pack: 1` is free here because
there is only one of him; it matters at the Lauvel, where two must not swing at once.

**Balance criteria, to be measured and not asserted.** The brief asks for country-scaled
comparison, and the levels above make that concrete:

- The lone robber in **Drent at level 0** must be winnable by a traveler with the starting sword
  and the lesson just taught, over 40 seeds, at a high rate with real damage taken — the numbers
  to beat are the present three-goblin raid's, taken first on `main` so there is a before.
- The **Luscia pair at level 1** is the same kind at ×1.45 health and ×1.30 damage plus a second
  body: measure it, and if it lands harder than the border battle's soldiers it has gone too far.
- Compare against the goblin and the soldier **at their own countries' levels**, not raw hit
  points, which is what the brief means and what the ladder does.

**Model and name.** No proper name is invented by this plan: the Azhora rule is that invented
names come from the registers, and a Drent road robber wants one from the user or from the
Drentish register. `src/characters.js` builds people from a `modelRole` and a look; the plan is a
human build with worn traveling clothes and a distinctive fastening, **not** a goblin with a human
label and **not** a Coalition uniform. Two of the same look, varied, are the Lauvel pair.

**Bystanders: a real loss, flagged.** `caughtIn`/`bystandersFor` puts villagers in the Greenway
raid — some fight, some run — and that is written, tested content. Two hundred metres up the road
there is nobody to catch. Either the new encounter keeps a body on the road for it to use (a
carter, a walker) or the content goes quiet. **This is a decision for Michael, not for the
implementer.**

**The bell.** `startAmbush` rings the village bell, and Ottar's own line says "The bell means
goblins". A robber on a lonely road is not a bell matter. The bell keeps its meaning for the
goblins that remain; the new fight simply does not ring it, and Ottar's line stands.

---

## 7. Everything that says "three goblins"

Confirmed by search; this is the whole list.

- `src/game-state.js:67` — stage 4's card, "Drive off the three goblin raiders."
- `src/game-state.js:68` — stage 5's card, "Report the three goblins to Eren…"
- `src/main.js` `startAmbush` toast — "Goblins on the Greenway!"
- `src/main.js:3918` — the doomsayer: "three of them still out on the Greenway".
- `src/story-chapters.js:60` — Chapter 1's first step, "clear the Greenway of raiders".
- Eren's own report lines, and Bran's "You cleared the road!" (`:3885`).
- `docs/`: the opening-sequence and campaign notes that describe the raid.

Also to touch: the journal's quest list (derived from `questSteps`, so it follows), the map
marker for stage 3 (moves with the arena), the **F8 panel** (the new go-anywhere rows reach the
site by name once the arena is a named ground, and `test-prepare` must still leave a coherent
state), and `src/autopilot.js` cases 2–5, which are the ladder the automated walk climbs.

---

## 8. Tests, and what would actually be checked

Pure tests first, because they are free:

- `advanceQuest` still walks 0→10 with the new events, and no event skips a stage.
- The lesson gate: `practice-hit` before `meet-instructor` pays nothing and counts nothing.
- The bandit kind exists, is between goblin and soldier on damage, and has no `poise`.
- The new encounter is in `TEACHING_FIGHTS`.
- The save matrix of §5, including a stage-2 save with the post already worked.
- `lauvel-wolves` keeps its id and its four booleans, and a cleared save does not replay.

World-building tests: the arena's ground is standable and clear, the road passes through the
trigger box, and `OPENING_FIGHT_GROUND` keeps props off the new points.

Driven measurement: the 40-seed tables of §6, taken on `main` first for a before.

Renders: the robber on the road, the fight composed, and Ottar's lesson. Looked at, not claimed.

**Full suite once, at integration**, per the standing rule — never several at a time.

---

## 9. The order to build it in

1. **The bandit kind and its numbers**, pure, with the 40-seed tables against goblin and soldier.
   *Done when* the tables exist and the kind is pinned between them.
2. **The instructor.** Ottar's three beats, the `meet-instructor` gate on the post, stage 2's
   copy. *Done when* a player cannot pay Blades at the post before the lesson, and an old stage-2
   save is acknowledged rather than made to repeat.
3. **The site**, measured by §3, and `OPENING_FIGHT_GROUND` updated. *Done when* the sweep and a
   render agree.
4. **The encounter**: one robber, the trigger box, `TEACHING_FIGHTS`, the defeat/retry path, and
   the bystander decision from §6 carried out either way. *Done when* the fight is driven.
5. **The copy**, all of §7 at once, so the game never half-says goblins.
6. **The Lauvel pair**, the gang's line, the `lauvel-wolves` id kept, and the level-1
   measurement. *Done when* the satchel, the escape, the horse token and the copper are all
   still exactly once.
7. **Autopilot, F8 and the smoke**, then one full suite.

Steps 1–2 are independent of 3–4 and could be two agents; 5–7 want one hand.

---

## 10. Optional, and not part of this (Codex's §7)

Recorded so they are not lost and **not** added to the requirements: the regional-story ideas in
section 7 of the brief, the grain convoy among them. None is user-approved. My own note is that
the gang gives Drent and Luscia a thread they currently lack — the same faces twice — and that is
worth more than a new arc.

---

## 11. Conflicts and assumptions, called out

1. **The brief's route omits Eren**, who in the code is stage 5 and hands over the road token at
   6. The plan keeps him: he is on the way, he costs nothing, and cutting him would move a grant
   and break the autopilot's ladder. Ottar dispatches the player to Corvan, as the brief says, and
   Eren is passed on the road, as the code says. **If Michael wants Eren cut, that is a bigger
   change and should be asked for.**
2. **"Corvan's existing Drent post" is the Avrel clearing**, which is already the letter's
   destination. Beat C is therefore copy, not geography, and the brief's own instruction not to
   move the post or build another is satisfied.
3. **Bystanders are lost** by moving the fight out of the village unless a body is put on the road
   (§6). A decision, not an implementation detail.
4. **No name is invented** for the robber. He needs one from the user or the register.
5. **The arena site in §3 is proposed, not measured.** Nothing in this plan has been rendered or
   driven.
