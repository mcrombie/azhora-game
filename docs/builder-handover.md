# Builder: handover, 2026-09-21

Written for whoever takes phases 7 and 6 of `docs/combat-brief.md`. Phases 1–5 are on main.
This is not a history; it is the things that would otherwise cost you a day to rediscover.

---

## 1. The traps in `src/main.js`

`main.js` is one enormous closure. Most of what follows is a consequence of that.

**A temporal dead zone is the commonest way to break it.** Everything in the setup function is
one block, so a `const` declared at line 900 is in scope at line 300 and *throws* if line 300
runs first. Function declarations hoist; `const`/`let` do not. Farming once read `p` nine lines
before `const p`; I put the smithy's sign board up with the cottages and `signs` is declared two
hundred lines below them — `ReferenceError` on world build, caught only by a test that builds a
world. **Before you reach for a short local, check it is declared above you in the same block.**

**`player` is a facade over a replaceable body.** You may be any of eleven characters, so
`playerBody` is thrown away and rebuilt by `wearPlayerLook`; `player` is a small object forwarding
`animate`, `setArmed`, `setShield`, `setWeapon`, `setFishing`, `fishingTip` to whatever body is
current. **A verb missing from that facade does nothing at all**, and if you call it as
`player.setShield?.(...)` it does nothing *quietly*. That cost me four renders. Never use optional
calls on your own facade; let it throw.

**The review runner composes the first view twice.** `main.cjs` iterates
`[reviewViews[0], ...reviewViews]` and photographs each, so the kept picture of the first view is
the *second* composition. **Everything in a review view must be idempotent.** I called
`toggleMount()` — a toggle — and photographed a traveler who had mounted and then dismounted. Then
I wrote `player.group.position.set(ground)` followed by `if(!riding.mounted)toggleMount()`, which
on the second pass put him on the ground and skipped the mount. Write `if (!x) make x` and set
final state outright.

**A frozen review has no clock, so an eased pose never eases in.** `reviewFrozen` stops
`walkTime`; the animator's `damping` is `1 - exp(-rate * dt)` where `dt` is the *change* in the
time handed to `animate`; so `dt` is 0, `rotate` moves nothing, and the body keeps whatever it was
doing. The guard reported `up: true` beside a shield drawn at the hip for two commits.
**`settlePose(pose, frames)` in `main.js` spends that time by hand; call it before you freeze.**
This applies to *any* eased pose in *any* review view, not just the guard.

**Views report their own facts, and that is why they are trustworthy.** `__AZHORA__.camera()`
carries `stoodBackBy` (what the camera actually got against what it asked for), a `company` block
(owned/mounted/grounded, `mountBlock`'s reason, the companions list, the ids actually placed, and
per man his position, whether he is drawn, whether he is up, his horse's state) and a `guard`
block (up/shield/phase/action/stamina/cost/shielded and **the buckler's drawn position and
facing**). Every one of those was added after a picture and the rules disagreed. **When you build
something visible, make the view report the number, not the intention** — a flag says what was
decided, the number says what the player is looking at.

**`placeMercenaries()` rebuilds the company when the plan changes.** `createMercenaryCompany`
reads its companion list **once, at construction**. `companions.restore` — a loaded save, a story
start, a review view — changes who walks with you without going through the `joined`/`sent-on`/
`died` events that rebuild. So `placeMercenaries` compares `JSON.stringify(companionPlan())`
against what the company was built with and rebuilds when they differ. The signature must be the
**plan**, not `companions.companions`: **Chris is not in the companions list.** The landing mate
is filtered out of it and carried separately on the long road's own terms.

**The npc mover sets height only while moving.** Inside `if(mode==='playing'&&dHome>.1)` it does
`pos.y = heightAt(...) + (npc.lift ?? 0)`. A companion who *arrived* stopped being lifted and sank
off his horse. There is now an `else if(!npc.swimming)` that sets it anyway. If you add anything
that lifts an npc, remember his height is a fact about him, not about his legs.

**A figure has a draw budget, and props count against it.** `tests/player-characters.test.js`
holds the traveler at 34 drawn meshes. Adding three weapon props to the table blew it at once, so
they are built the first time he holds one, exactly as the buckler is. That test now counts meshes
that are actually *drawn* — everything above them visible too, the rule `figureDrawCalls` uses —
because he owns nine weapons and can hold one; counting the eight in his pocket was always an
overcount. **If you add anything the traveler carries, build it late and check that test.**

**Small ones.** `settleMercenaries()` snaps everyone onto their computed spots — `placeMercenaries`
only says where they *should* be and they then walk, and 120 frames is not enough to bring a man in
from the muster road. `const smiths` near line 2030 is the beggar (she is named Smiths); it has
nothing to do with smithing. Keep clear of the speech-rendering part of `main.js` while the
hard-mode language gate is landing.

---

## 2. How the pure modules meet the host

The pattern throughout: a pure module (`createX({...})` returning actions plus `snapshot`/
`restore`, and a `validateXSnapshot`), a hook in `main.js`, and a test that pins the seam.

**Companions** — `src/companions.js`. Who walks with you, the four regard rungs, the ten asks, the
dead and their weapons. Host: `companionPlan()` builds the list the mercenary company is made
from; `placeCompanion` puts each man in the file; `fileOrder` is the placed file.
`tests/companions.test.js`.

**Company horses** — `src/company-horses.js`. *When you ride, everyone walking with you rides.* No
save section: a mount is a function of `riding.owned` and who is walking with you. `companyUp(place)`
in `main.js` is the whole rule and reads `riding.mounted ? since>=turn : since<turn`, which is both
directions of the mounting stagger. `fileSpotFor` is the file's geometry, pure, so the real ground
at a real place can be asked the same question a test asks it.
`tests/company-horses.test.js`, `tests/company-file.test.js`.

**Found weapons** — `src/found-weapons.js`. A presenter that owns nothing and reads from sources;
the first source is `companions.weaponsOnTheGround()`. This is the *only* way a polearm or a staff
reaches the traveler's hand, because the four who carry them all refuse to trade.
`tests/found-weapons.test.js`.

**Gear** — `src/gear.js`. Material tiers 0–6 (5 and 6 unnamed slots that nothing sells), three
armour slots in three weights, `armourOf`, `throughArmour`, `smithStock`, `priceOf`. **The hand
slot IS the shield.** Host: `getMargins` forwards `armourTurns`, `dodgeScale`, `guardShare`,
`guardCost`, `hasShield`; `swimTick` spends `dt * gear.windScale`, so plate drowns people.
`tests/gear.test.js`.

**Smiths** — `src/smith.js`. Three of them share one scene; `SMITH_VOICES` is the only list of who
sells and `sellsHere(id)` is what the host asks. **What a smith sells is a function of the country
he stands in** (`regionLevel` under the traveler's feet), so the material sentence is generated and
only the man's own lines are written. Buying is atomic and the host looks the piece up in *today's*
stock rather than trusting the action string. `tests/smith.test.js`.

**The guard** — `src/combat.js` `guard(held, yaw)`. Held, not pressed: the host offers the key and
the facing every frame and the module latches nothing. It returns whether the shield is *up*,
which needs a shield, an idle body and the wind to pay for a blow, and it sets `player.guarding`
to the same value so nothing can read one and draw the other. Frontal only, within `GUARD_ARC`
(the same sixty degrees the legionaries' own guard uses). A caught blow does not rock him and buys
no invulnerable moment. `tests/shield-guard.test.js`.

**Weapon feel** — `src/weapons.js` `WEAPON_TYPES`. `tempo` (how long a swing takes), `arc` (the
half-angle it reaches), `room` (clearance needed — only the pike), `locked` (the heavy families'
third swing cannot be stepped out of). **A weapon that says nothing is the sword**: `tempoOf`,
`arcOf` and `swingOf` in `combat.js` all default to today's numbers, which is what keeps every
fight already built untouched. `tests/weapon-feel.test.js`.

---

## 3. Working method, and what it is worth

**Measure headlessly before you render.** A render costs minutes and a picture can be read
generously. `sourceModule('../src/characters.js')` gives you the real model in node: instantiate
it, call `animate` across advancing time, and read world positions and facings off it. I found
every buckler fault that way — wrong height, wrong facing, swallowed by the coat — and the renders
only confirmed them. Six renders went on a shield I could have placed in one headless sweep.

**Tests lie, and they lie in a particular way: they test your assumption about the fixture.**
Three of mine did. One aimed a shield at where a goblin *started* rather than where it was, and
proved the exact opposite of what it meant to. One swung at a goblin eleven metres away because
`atCheckpoint: true` moves the player to the checkpoint. One swung at a goblin that **hit first and
cancelled the very swing being measured**, so "the sword missed" really meant "the sword never
swung". The fixes: compute from the live object each frame, assert the precondition you are
assuming (`assert.ok(distance <= 1.8)`), and measure against a straw post (`startPractice`) which
cannot strike back. **When a test says something surprising, suspect the fixture before the code.**

**Pinned strings are load-bearing and they are supposed to break.** Many tests `assert.match` on
`main.js` source. When you change a line they pin, the test fails — that is the pin doing its job,
not an obstacle. Move it and keep the *law* it was stating; if you cannot state the law, the pin
was wrong. Several of mine broke usefully (`companions:companionPlan()` broke exactly because I
changed the rebuild guard, which is what I wanted to be told about).

**House rules.** Never run the full `npm test`; name your targeted files in the commit message.
Check free RAM is above 3000 MB before anything that builds a world (a world is ~3 GB and the
machine has 16). Short review renders only —
`node scripts/launch.cjs --smoke-test --review-views=<views> --review-clean`, one at a time, then
read the PNG in `tests/artifacts/` with the Read tool. Never `npm run test:game`, autoplay, or
`review:draws`. Commits end with the `Co-Authored-By: Claude Opus 5` line. Git Bash mangles
heredocs and hides CRs — write patch scripts with the Write tool and detect CRLF/LF per file.
`HELD_AT_TUNED_LEVEL` stays untouched; that is the user's decision and they have not made it.

---

## 4. What phases 7 and 6 will need from what exists

**Phase 7, teachers and sparring.** Almost everything is already built.

- **Regard and its four rungs** — `src/companions.js`: `RUNGS`, `RUNG_LABELS`, `RUNG_AT`
  (0 / 25 / 60 / 100) and `REGARD`, with the vocabulary `unfamiliar` / `acquainted` / `friendly` /
  `fond` reused from `rena-letters.js`. Regard moves on travelling together, fighting together,
  trading, errands, and the truth about the dead. **The brief's "a lesson at friendship
  milestones" maps onto these rungs directly** — you need no new relationship model.
- **`MERCENARY_ARMS`** — `src/companions.js`: each companion's `weapon` family, `level` and
  `toughness`. Mus is 45, Jerry and Eliana 40, Ciarán / Matt / Ed 35, Chris / Lakota 30,
  Kristen 25 (shield 35), Al 20. **That is your sparring ceiling table already written**: a
  teacher cannot take you past what he is.
- **Practice ceilings** — `src/combat-skills.js` `ARMS.ceiling`: `post: 5`, `sparring: 20`. The
  `source` argument threaded through `dealt`, `dodged`, `hurt` and `caught` is what applies them;
  pass `source: 'sparring'` and the ceiling is enforced for you. The brief wants the sparring
  ceiling raised by friendship, so `ceiling.sparring` should become a function of the rung.
- **`TEACHING_FIGHTS`** — `src/main.js`: the set of encounters a companion is held *out* of, so
  the traveler is taught alone. A sparring match belongs in that set.
- **Every mercenary already has two lines about his own weapon** — `MERCENARY_STYLES` in
  `src/mercenaries.js` (`styleLines`). **These are the specification and the copy both.** I took
  phase 5's tempo and arc straight from them (Lakota's "strikes twice as often as your sword" is
  literally `tempo: .5`). A lesson should say what that man already says.
- `arms.learn(id)` returns `{ first }`, and nothing is banked before somebody shows you a skill —
  which is exactly what a teacher is for.

**Phase 6, bows.** The brief calls it the largest single piece, and it is the least prepared.

- `ARMS_SKILLS.bows.weapons` is still empty and is where a bow goes. `makeBow` exists in
  `characters.js` but is slung across the back with the hands free — a drawn bow is new work.
- Jerry is the archer; his lines are the spec, including the limit: *"In woodland I am a man
  holding a stick."* **Trees and walls stop arrows** — `world.nearColliders` is the same call the
  pike's `roomToSwing` uses and is the natural tool for it.
- Arrows are items, bought and found. `INVENTORY_ITEMS` and the smith pattern are there; the
  smith sells armour only, so arrows want their own seller or a found source.
- Hold to draw, release to loose: the guard (`guard(held, yaw)`) is the worked example of a
  **held** verb, including the rule that the module latches nothing and the host offers the key
  every frame.
- `ARMS.drawTime` is already in the margins table (1.1 s to 0.6 s) and wired through `marginsFor`.

**Still open, for the user rather than for you.** Tiers 2, 3 and 4 have no seller: they want a
smith in level 3+, 5+ and 7+ country, and there are no more forges already standing. Tiers 5 and 6
have no names. Both are world decisions the coordinator is holding.
