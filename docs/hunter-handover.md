# Bug hunter: handover, 2026-09-21

Written mid-task for whoever takes this over. Branch `worktree-agent-aac09ee04f54c3737`, based
on main `e071ccd`. Everything earlier is on main already. Two commits are new here: the
work-in-progress one for step two, and this file.

## (a) The distant-figure stand-in, step two: what remains

**Step one is on main:** `src/figure-lod.js` (the rule: out at 62 m, back in at 56 m; who is never
a stand-in; the look; `figureDrawCalls`) and `src/figure-stand-in.js` (one 36-triangle mesh, one
shared material). **This branch adds** two more exemptions to the rule, `swimming` and `posed`,
with tests, and makes the `draws()` hook honest for what is coming (a mesh counts as drawn only
if everything above it is visible; it now reports figures within 100 m and 120 m, and stand-ins).

**Not done: the wiring.** `src/main.js` does not import either module and nobody is ever a
stand-in. The wiring below is written and has **never been applied or run**. Line numbers are
for `src/main.js` on this branch.

1. Imports, after the `prompt-priority.js` import (about line 146):
   `import { figureDetail } from './figure-lod.js';` and
   `import { createStandIn } from './figure-stand-in.js';`
2. A helper, straight after `const npcById=new Map(...)`:

   ```js
   function showFigure(npc,detail){
     const group=npc.actor.group,peg=detail==='stand-in';
     if(peg&&!npc.standIn){npc.standIn=createStandIn({tunic:npc.look?.tunic??npc.color,skin:npc.look?.skin??npc.skin,hair:npc.look?.hair??null});npc.standIn.visible=false;group.add(npc.standIn);}
     for(const child of group.children){
       if(child===npc.standIn){child.visible=peg;continue;}
       if(peg){if(npc.detail!=='stand-in')child.userData.shownInFull=child.visible;child.visible=false;}
       else child.visible=child.userData.shownInFull??true;
     }
     npc.detail=detail;
   }
   ```

   The design decision in it: the stand-in is a **child of the figure's own group**, and the group
   stays visible. Other code treats `npc.actor.group.visible` as "this person is here" (the
   bodies list that makes people solid, the `draws()` hook), so hiding the group would make
   distant people walk-through and uncounted. As a child it also stands, turns and scales with
   them for nothing.
3. In the NPC loop, after `fleeing` is computed (about line 3246) and before `let destX`:

   ```js
   {const detail=figureDetail(npc.detail,Math.hypot(pos.x-player.group.position.x,pos.z-player.group.position.z),
       {kind:npc.dog?'dog':npc.cat?'cat':npc.horse?'horse':npc.ogre?'ogre':'person',talking:activeDialogue?.npc===npc,escorting:!!npc.escorting,
         fighting:alarm||!!npc.lastFight,fleeing,marked:npc.marker.visible,swimming:!!npc.swimming,posed:!!npc.sitting||!!npc.posture});
     if(detail!==(npc.detail??'full'))showFigure(npc,detail);}
   ```

   (`npc.marker.visible` is last frame's there, which is soon enough.)
4. Do not pose a rig nobody can see: prefix the `npc.actor.animate(...)` call (about line 3252)
   with `if(npc.detail!=='stand-in')`.

**The "before" measurement is done** (`npm run review:draws`, this branch, unwired, 16 samples, no
errors). Draw calls by facing (0, π/2, π, 3π/2), and figures by distance:

| Spot | Draws | Drawn | ≤30 m | ≤60 m | ≤100 m | ≤120 m | Meshes per figure |
|---|---|---|---|---|---|---|---|
| Tidehaven landing (23, 29) | 678 / 1,930 / 842 / 568 | 33 | 7 | 15 | 24 | 25 | 23.7 |
| Lauvel field (−677.8, 297.1) | 727 / 557 / 1,071 / 971 | 31 | 8 | 13 | 21 | 26 | 17.3 |
| Lumber Town square (−728.57, 384.36) | 934 / 546 / 664 / 885 | 26 | 10 | 12 | 25 | 26 | 17.2 |
| Moros camp (−980.65, 598.9) | 609 / 459 / 321 / 676 | 8 | 4 | 8 | 8 | 8 | 20.5 |

Triangles for the same sixteen are in `tests/artifacts/draws.json` if nobody has overwritten it
(git-ignored), and in the run's console output. Expected saving if every figure were in view:
18, 18 and 14 figures beyond 60 m at the first three, so about 409, 293 and 227 calls; nothing at
the camp. **Option (a), now measured rather than guessed:** a 120 m view range would drop 8, 5, 0
and 0 figures; 100 m would drop 9, 10, 1 and 0. Without the stand-in that is 17–24 calls a head;
with it, one. So (a) is an alternative to (b), never an addition.

**What is left:** apply the wiring; `node --check src/main.js`; run `tests/figure-lod.test.js` and
the pure tests that read `main.js` as text (`prompt-priority`, `review-quiet`, `session-clock`,
`story-spine`, `tills`, `weapons`, `audio-effects`, `first-contact`, `swimming`); then **one**
`npm run review:draws` for "after", same four spots, same four facings, and report draws and
triangles per view against the table above. Ask the coordinator before the run; check
`(Get-Process electron).Count` and free memory first.

**What a player might notice, to look for in that run and afterwards:** popping at 56–62 m when
walking up to somebody (the band is there to stop flicker, not the single change); a quest
marker over a stand-in (should be impossible: `marked` is exempt, but the mark is read a frame
late); a rider or a horse (only people have a stand-in; check a mounted NPC if there is one);
Sela kneeling and Kerrin sitting at the Lauvel (exempt as `posed` — confirm they never stand up);
Ed the Word in the water (exempt as `swimming`); a stand-in's colours against the full figure's
(custom actors made with `npc.make` — Bowden, Old Hewe — may have no `npc.color`, and fall back
to the default tunic); the company of ten at the landing, whose rigs are the heavy ones; and the
top-level children the rig itself hides, which `showFigure` puts back as they were rather than
switching on.

## (b) Swimming: three findings and one set of notes, none fixed (the builder's feature)

Sent to the coordinator already; here in full.

**1. Drown, press "Try again", and a fight starts somewhere else. Reproduced.** With the real
`src/combat.js` (it is pure, so no world build): a traveler who has never fought, put out at sea
and drowned through `combat.exhaust` exactly as `swimTick` does it (33.3 s at level 1), then
`combat.resetEncounter({})` exactly as `retry()` calls it. Result: carried 346 m to (0, −25), full
health and wind, phase `active`, encounter `tidehaven-raiders`, three goblins alive at 75 hp.
Evidence: `retry()` at `src/main.js:2656` moves nobody itself and calls `resetEncounter`;
`src/combat.js:277–284` sets the position to `lastEncounter.checkpoint` and *starts*
`lastEncounter`; `src/combat.js:173` starts `lastEncounter` as `DEFAULT_ENCOUNTER`. After a real
fight it is that fight instead — drown swimming to the Pebbles and the Greenway raid or the Lauvel
wolves form up round you again. Drowning is the skill's designed failure, so this is the path of
every swimmer who misjudges a crossing. *Proposed:* in `retry()`, for a defeat that was
`drowned:true`, reset no encounter; put him on the last dry ground he stood on (`swimTick` already
has `before`; keep the last point where `canSwim` was false) at full health, which is what
`docs/swimming.md` promises.

**2. Stepping into water mid-fight resets the fight. Read, not run.** `swimTick`
(`src/main.js:2629–2631`) calls `combat.resetEncounter({})` when he gets wet with a fight on. By
the same code that carries him back to the fight's checkpoint with everybody at full health: a
way out of any fight you are losing, by way of a pond. Possibly intended; worth the builder's eye.

**3. Nobody can walk into the water. From the repo's own tests and a grep; my simulation is still
owed.** `docs/swimming.md:12`: "Entering. Walk off a shore into water. There is no prompt and no
key." But `moveCharacter` (`src/game-state.js:51–61`) lets a body onto water only with
`swimming:true`; `src/main.js:3110` moves the traveler with `{swimming:inWater}`; and `inWater` is
assigned in four places (`main.js:493, 2626, 2630, 2645`), true only at 2630, inside `swimTick`,
when his position is *already* wet. From dry land that is a closed loop.
`tests/swimming.test.js:49–61` asserts on the real world that "a walker never gets wet", and line
211 pins `main.js` to exactly that call. So he gets wet only by a harness warp or by loading a
save made at a wet position. If this is right it is also why finding 1 has not been seen.
*Still owed:* simulate `main.js`'s own movement on the real world — start on the beach east of
Tidehaven (the test finds sea near x 60–200, z 300), step east at 4.2 m/s with
`{swimming:inWater}` and `inWater` updated each frame by `canSwim`, for thirty seconds — and show
he is never wet. *Likely repair:* the on-foot movement line passes `swimming:true` always (the
mounted line is separate and stays dry), and the pinned test string changes with it.

**4. Saving mid-crossing. Read, not measured.** `saveRoad` (`src/main.js:2025–2027`) refuses
testing sessions, early quest stages, fights and the dead; its own message says "Step ashore …
before saving" and its condition never looks at the water. There is a Save button
(`main.js:2800`). The save holds `health` and no wind; a load sets health from it
(`main.js:2070`) and a fresh session's combat starts at a full bar. And entering a region
autosaves (`enterRegion`), while the new 76 m shore fringe in `regionAt` means a swimmer "enters"
his destination — and autosaves — still 76 m out. So a reload mid-crossing hands back 100 wind:
about 58 m more at level 1, each time. The design says the 354.8 m crossing to Cobble is one
"nobody ever makes, at any level"; six saves and loads make it. *Smallest repair:* add the water
to `saveRoad`'s refusal, which is what its message already says.

One suspicion checked and killed: that combat's 24-a-second stamina recovery would outrun the
water's 4-a-second drain. `combat.exhaust` takes a `hold` that keeps the recovery delay open, with
a comment naming that failure. Not a bug.

## (c) What I meant to look at next

- The simulation owed in (b)3, then (b)4 measured.
- **A horse at the water's edge.** The mounted path uses `RIDE.radius` 0.62 and no `swimming`; the
  toast fires when `canSwim` is true *under* him, which by (b)3's logic he can never be. Check
  whether "He will not go in" can ever be shown.
- **Ed the Word's walk out of the sea** (`src/word-arrival.js`, stateless, a function of the play
  clock): where `WORD_BEACH` (4.5, 38) is against `canStand`, whether the swimmer's track crosses
  a hull or the pier, and what `placements()` does with him in the same seconds (he is also
  `merc-word` in the company, in the landing ring).
- **The fog on the chart** and `src/cartography.js`: new, with a save section; the sweep in
  `tests/save-round-trip.test.js` already covers it (49 files export a validator; all six new ones
  pass).
- **Playing as somebody other than Cromb.** All eleven companies are well formed (ten distinct
  men, never the player, everybody musters). Play as anybody but Cromb or Gotwood and Cromb is on
  the landing at t = 0 beside Chris whatever boat the man he replaced came on — the code's comment
  says "his own hour", so design. Untested: a save made as one character loaded as another.
- Open from earlier rounds, all reported, none mine to fix: five of the company wait on the
  harbour floor; `route` read by nothing (the builder is building Mus's wild route);
  `tests/mercenaries.test.js`'s 4.2 m bound; the autopilot grinds at the first water in the west.

## (d) How I work, for whoever copies it

- **Measure on the real thing.** `createWorld` through `tests/module-loader.js`, `canStand`, the
  real company on `world.paths[0]`. Pure modules (`combat.js`, `mercenaries.js`,
  `player-characters.js`) need no world and cost nothing: the drowning bug took one
  `node --input-type=module -e`.
- **The probes that paid:** a flood fill of standable ground (sealed people, the walkable west,
  the fence); sweeping the company's `placements(t)` over hours of play clock against a fixed
  point (the harbour five, the prompt bug, the long road's timeline); driving every save section
  with nonsense and demanding its own validator still accept it; a second-by-second trace
  whenever a number surprises me, *before* changing anything.
- **Traps I fell into.** Finding the cairn as "the nearest collider of radius 0.65" put it 83 m
  away and spoiled three measurements: find things from where the source builds them. Filtering my
  own probe's output with `sed -n` line numbers dropped the lines I had rerun for: write full
  output to a file. A bare minimum distance is the wrong test for "cannot be caught": a cornered
  animal passes you. Attributing a running process by its start time nearly had me kill another
  agent's suite. Backticks inside a double-quoted shell command are command substitution: patch
  through a script file.
- **Shell.** The worktree guard refuses compound commands that mix git or PowerShell with loops;
  one plain command per call. Edits go through a small Python script with `assert count == 1` on
  every anchor. `node --check` a test before spending a world build on it.
- **Discipline.** One world build at a time; check free memory and Electron first; never the full
  suite. When a fix needs a decision, write it up in `docs/known-issues.md` with the numbers and
  the options. Say what was run and what was only read. Tell the coordinator the near-misses.


---

# Addendum, 2026-09-21 evening: the second hunter's drivers and traps

Four rounds on. This is what a fresh hunter needs to pick the harnesses up without re-learning
them, and what is still owed.

## The drivers, and what each is good for

**None of them lives in the repo.** They were scratch files; they are described here so they can be
rebuilt, because rebuilding one from this description is cheaper than trusting a number from one
that was never checked.

1. **The pure-module probe.** `createCompanions`, `createTeachers`, `createMercenaryCompany`,
   `moros-chapter`, `gear`, `weapons` - all pure, no world, no cost. Almost every death-lifecycle,
   teacher and regard finding came from one of these in seconds. **Reach for this first.**
2. **The world probe.** `createWorld` through `tests/module-loader.js`, then `canStand`,
   `regionAt`, `world.paths[0]`. About twenty seconds and a gigabyte. One at a time; check free
   memory first. This is what the horses, the picket, the file and the smiths' ground were
   measured on.
3. **The fight harness.** `createCombat` with a flat world, `getWeapon` from `createWeapons`,
   `getMargins` built field-for-field the way `src/main.js` builds it, `getAllies` mirroring
   `companionAllies`, and a driver that closes, dodges and swings. Forty seeds, each seed a
   different reaction time and lean. **It has been wrong four times** (below) and every number out
   of it should be read as a comparison between its own rows, never against another round's.
4. **The review render.** `node scripts/launch.cjs --smoke-test --review-views=<a,b>`. The only
   thing that catches what tests cannot: a man inside a horse, a helmsman inside a deckhouse. Read
   the JSON facts line as well as the picture - twice it answered a question the picture could not.

## The traps, all of them mine

- **`combat.attack(yaw)` takes a yaw and `combat.dodge({x,z})` takes a point.** Called with
  neither they return false for ever. The first fight harness printed nought swings in every row
  under four tidy columns and looked like a measurement.
- **`startEncounter` asks `getLevel` only when the encounter authored no level.** A harness that
  set `getLevel` and left `level: 0` in place measured the held fight twice and called one of them
  level 2. The tell was identical rows for both levels.
- **A greedy driver is not a player.** Swinging whenever a target is in reach leaves nothing for a
  dodge - two dodges in a sixteen-second fight, wind on the floor - and turns a fight into a wall.
  Keep `swingCost + 25` back.
- **A driver that holds the checkpoint is the nearest thing to every enemy**, so it takes every
  blow and no ally is ever struck. That is why the `FILE_FLOOR` table has no ally deaths in it and
  cannot say whether the floor is *hard*.
- **`--review-views` used to split on commas**, so `stand-at:x,z,facing` was torn into four views
  of the wrong place with `"errors": []`. Fixed; the shot still does not write, cause unknown.
- **A flood fill must align its grid to its own start.** `round(span/step)*step` put the seed cell
  0.2 m from the point being tested and reported two false seals at Bede Harrow's yard.
- **Counting kills by the `hit` event counts the allies' kills too** (the first hunter's fifth
  trap, still true). The passenger control - a player who closes and dodges but never swings - is
  the honest measure of whether the player matters.
- **`placements()` has holes in it now.** A dead man has no placement, so indexing it by roster row
  hands a man his neighbour's place. Find people by id.

## What is unverified

- **Bows (`src/archery.js`) are entirely unhunted**, and the authored fights have not been
  re-measured with an archer in them.
- **"Hard but winnable" at the file floor** - see the ledger entry; the driver cannot say.
- **The fill soldiers' death rate** is unmeasured, not zero.
- **No death has been driven through the real save** in Electron; the whole death lifecycle is
  module-level plus source checks.
- **Mern has never been photographed**, and the `stand-at:` view writes no picture.
- **Companion deaths in a fight**: round one measured 2.0 at level 2 with six, rounds two to four
  measure none. Which driver is right is not settled.
- **The aftermath arenas** were measured on a synthetic arena shape, not on each named arena's
  real ground.

## How to work

The rules at the top of `docs/known-issues.md` still hold, and the one that earns its place every
round is this: **when a probe says something surprising, prove the probe first.** Four of this
hunter's findings were faults in its own harness, and each was caught by one number that did not
make sense - nought swings, identical rows, two dodges, no ally ever hit. Look for that number
before writing the entry.
