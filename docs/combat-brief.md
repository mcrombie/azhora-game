# Fighting: skills, gear and company

A design brief. Nothing here is built. It turns four of the user's decisions into something a
builder can start on, in phases, without asking again.

**Decided by the user (`docs/design-answers.md`):**

- The traveler gets stronger three ways at once: combat skills, better gear, and the company kept.
- **Combat skills are divided by weapon: you get good at what you carry.** (2026-09-21)
- **Levels widen the margins and never replace timing.** A level-1 traveler with perfect timing
  can still kill a level-8 monster — slowly, and one mistake ends it. Hard country is dangerous,
  not locked. (2026-09-21)
- **Gear is bought, found and given. No crafting for now; a Smithing skill may come later**, so
  gear is designed to let it in without rework. (2026-09-21)
- A companion can die in any fight, anywhere, and stays dead.
- Magic comes late, from the sage. Nothing here is magic.

## What is already there

The fight is a timing game and stays one (`src/combat.js`):

- A three-swing combo, each swing heavier and longer than the last (24 / 26 / 34 damage with the
  simple sword). A swing costs 6 stamina; a dodge costs 25, travels 3 m, and cannot be hurt for
  its first 0.37 s. Stamina is 100 and comes back at 24 a second after a short pause. Health is 100.
- Every enemy kind has a tell, a strike, a contact moment and a recovery, and they differ: a
  wolf's tell is 0.7 s, an ogre's 1.18 s and it hits for 52.
- Six weapons exist with their own damage and reach (`src/weapons.js`): forest stick, simple
  sword, long dagger, iron mace, bearded axe, greatsword. Wear is written and switched off
  (`WEAPON_WEAR = false`).
- Each of the ten mercenaries carries a different weapon, has lines explaining how he or she
  fights with it, and some will trade it for your sword (`MERCENARY_STYLES`).
- Allies fight beside you (`combat.state.allies`). Enemies can block.

So the brief adds numbers *around* that fight. It does not change how a fight is won.

## The seven fighting skills

All on the same 99-level table as birding and wine, shown as tiles in the same grid, under their
own heading ("Arms"). With the thirteen skills that exist, and farming when the long road is built,
that makes twenty-one. None is required; a traveler who only ever carries a sword has one tile
that moves, and that is fine.

| Skill | Weapons | Who teaches it |
|---|---|---|
| **Blades** | simple sword, long dagger, and better swords | Chris Gotwood (sword), Ed the Word (dagger), Cromb when he is not you |
| **Heavy arms** | greatsword, mace, axe | Eliana (greatsword), Al the Tun (mace) |
| **Polearms** | spear, pike, the thrown spear | Ciarán (spear), Matt (pike), Mus (the one that leaves the hand) |
| **Staves** | quarterstaff, forest stick, walking club | Lakota |
| **Bows** | bow | Jerry |
| **Shield** | any shield, carried with a one-handed weapon | Kristen |
| **Toughness** | none — it is you | nobody; it is taught by being hit and living |

This is why the skills are by weapon: **the company is the faculty.** Friendship with a mercenary
is how you learn the weapon they carry, and a mercenary who dies takes the lessons with them.
(If Jerry dies on the road, nobody in the company teaches the bow. Somebody in the wider world
still can — a side's drill sergeant, a hunter in Rena — but later, and further.)

### How a skill is gained

- **By use.** Damage you deal with a weapon pays its skill, scaled by the country's level, so
  hard country teaches faster than goblins do. A killing blow pays a little extra.
- **Toughness** is paid by a dodge that actually avoided a strike (the engine already knows: you
  were invulnerable at the enemy's contact moment) and by damage taken in a fight you survived.
  It rewards the timing the game is about, and surviving mistakes.
- **Shield** is paid by blows caught on it.
- **Practice has a ceiling.** The straw post, and sparring with a friend, pay the skill only up to
  a level: the post to 5, sparring to a level set by how good a friend the teacher is. Nobody
  reaches 60 by hitting straw.
- **A lesson** is what a teacher gives at friendship milestones: a lump of experience in their
  weapon, once each, and a raised sparring ceiling. It is the same shape as Lakota's birding
  conversations and Ed the Word's swimming lesson.
- **Nothing counts before you are shown**, as with swimming. Blades is shown by Mara's straw post
  in the first ten minutes. Every other weapon skill begins the first time its teacher (or any
  later teacher) shows you the weapon; until then the weapon works at level 1 and the experience
  is not banked.

### What a level does: margins

Level 1 is exactly today's game. Every number below is a multiplier on what `src/combat.js` and
`src/weapons.js` say now, rising evenly with level.

| What | Level 1 | Level 99 | Skill |
|---|---|---|---|
| Damage with a weapon | ×1 | ×3 | that weapon's skill |
| Stamina a swing costs | 6 | 4 | that weapon's skill |
| Health | 100 | 400 | Toughness |
| Stamina | 100 | 180 | Toughness |
| The part of a dodge that cannot be hurt | 0.37 s | 0.48 s | Toughness |
| Share of a frontal blow a shield takes | 60% | 90% | Shield |
| Stamina a caught blow costs | 18 | 8 | Shield |
| Time to draw a bow | 1.1 s | 0.6 s | Bows |

What a level never does: make an attack land that was mistimed, shorten an enemy's tell, or make
the traveler unhittable. The dodge window stops at 0.48 s — forgiving, never automatic.

### How the country pushes back

`docs/difficulty-ladder.md` gives every region a level from 0 to 11. An enemy met in a country of
level *L* has:

- health × (1 + 0.45 × L)
- damage × (1 + 0.30 × L)
- the same tell, strike and recovery as its kind has anywhere. **Timing never scales.**

At level 0 that is today's numbers exactly, so every fight already built is untouched. At level 8
an ogre's 52 becomes 177: a traveler with 100 health who misses one dodge is dead, and a traveler
with Toughness 70 and good armour is hurt badly and still standing. That is "possible, and one
mistake ends it", written as arithmetic.

A country of level *L* is tuned for fighting skills around **9 × L** (level 3 country for skills
near 27, level 8 for skills near 72, the hidden island for 99). This is guidance for whoever
places enemies, not a gate.

Night raises the country's level by one off the road (`docs/day-night-brief.md`).

## Weapons feel different, as they already say they do

The mercenaries' own lines are the specification. Each family gets a **tempo** (how long its
swings take) and an **arc** (how wide it cuts), beside the damage and reach weapons already have:

- **Dagger:** fast, short, narrow. "Inside the swing where their long beautiful weapon does nothing."
- **Sword:** today's numbers. The reference.
- **Greatsword, mace, axe:** slow to start, wide, heavy; the third swing cannot be cancelled.
- **Staff:** fastest, lightest, never sharp — "it strikes twice as often as your sword".
- **Spear:** thrust only, long reach, very narrow arc. Rewards facing; punishes being flanked.
- **Pike:** the longest reach in the game and useless in a doorway ("in a doorway I am
  furniture"): it cannot be swung within two metres of a wall.
- **Bow:** hold to draw, release to loose; arrows are items, bought and found. Trees and walls
  stop arrows ("in woodland I am a man holding a stick"). The largest single piece of work here,
  so it is last.
- **Shield:** the one new verb for melee — hold to guard. It is there at level 1 with any shield
  in hand; levels only make it better. No parry, no riposte: the user chose margins over moves.

## Gear

### Tiers by material

Every weapon and every piece of armour has a **material tier**, 0 to 6. The tier multiplies
damage (weapons) or the share of a blow turned (armour), from ×1 at tier 0 to ×1.9 at tier 6.
With skill that gives a ceiling near ×5.7 damage against health of ×5.5 in level-10 country: a
master in the best gear fights the worst country about as today's traveler fights goblins.

| Tier | What it is | Where it comes from |
|---|---|---|
| 0 | wood, bone, a walking club | anywhere; what you land with |
| 1 | bog iron, village work | smiths in level 0–1 country (Drent) |
| 2 | good wrought iron | level 2–3 country |
| 3 | steel | level 4–5 country; Ambroni issue |
| 4 | fine steel | level 6–7 country; officers, gifts from a side you have served well |
| 5 | *to be named from the lore* | level 8–9 country; found and given only |
| 6 | *to be named from the lore* | never sold: the barrows, the sage, the hidden island |

The top two tiers need names that come from Azhora's own registers, not from me. Ask before
naming them.

### Armour

Three pieces only: **body, head, and the shield hand.** Three weights:

- **Light** (leather, quilted cloth): turns a little, costs nothing.
- **Medium** (mail): turns more; the dodge travels 10% shorter.
- **Heavy** (plate, only from tier 3): turns the most; the dodge travels 25% shorter, and **in the
  water it spends your wind twice as fast.** Armour drowns people. The swim to Peblos is a reason
  to take it off, and that is a decision the player should feel.

At its best (heavy, tier 6) armour turns half a blow. It never turns all of one.

### Where gear comes from

- **Bought.** Smiths sell the tier their country's level allows, for copper. Prices rise about
  fourfold a tier, which gives money something to be for. (Smithies and forges already stand in
  the built world; they need a shopkeeper and a list.)
- **Found.** Archaeology turns up old arms: a tier above what the country sells, and worn. The
  fallen can be stripped of what they carried.
- **Given.** A side issues you arms when you enlist (the Marshal's issue sword). A mercenary who
  is a good enough friend gives you something of theirs — Matt's spare pike — and those are the
  only weapons in the game with names.

### Leaving the door open for Smithing

The materials are chosen so a later skill slots in: geology already finds **ironstone**;
woodcutting already fells timber for hafts and bows. When Smithing comes it is a fourth way to get
the same items from the same tiers, plus repair. Wear stays switched off until then — a weapon
that breaks with no way to mend it is only an annoyance.

## The company

The third leg, and mostly built already: allies fight beside you.

- A companion fights with their own weapon at their own level (each mercenary has one, between
  30 and 60 at the start, and they grow with the story).
- **A country's level is a property of its dangers, not of its ground.** It scales what its
  enemies are and what they do, to anybody. It does not scale your side. A companion's health and
  damage come from *their own* levels through the same curves the traveler's do (Toughness for
  health, their weapon's skill for damage), so a mercenary at 45 stands in level-2 country with
  about 235 health and nearly double damage, which is what "survived by who walks with you" means
  in arithmetic. A side's soldiers have the level of their kind. (Measured 2026-09-21: allies had
  a flat 90 health while blows on them were scaled x1.6, which only failed to show because the
  traveler died first.)
- "Go armed, and not alone" (level 6 country) is meant literally: those countries are tuned for
  a traveler with one or two companions.
- A side's soldiers stand with you on its ground.
- Death is permanent, in any fight. A dead teacher teaches nothing more.

## Who starts with what

Each playable character starts with their own weapon's skill already learned, and everything else
at 1. Proposed, for the user to correct when the character profiles are written:

| | Starts with |
|---|---|
| Cromb | nothing: Blades 1. The blank slate, and the only one who learns everything from the ground |
| Chris Gotwood | Blades 30 |
| Ed the Word | Blades 35 (the dagger), Swimming 3 |
| Jerry | Bows 40 |
| Kristen | Blades 25, Shield 35 |
| Ciarán | Polearms 35 |
| Lakota | Staves 30 (and the birding that is already his) |
| Eliana | Heavy arms 40 |
| Matt | Polearms 35 |
| Al the Tun | Heavy arms 20 |
| Mus | Polearms 45 |

## Build order

Each phase stands alone and leaves the game working.

1. **The skills and their arithmetic.** — **built 2026-09-21** (`src/combat-skills.js`,
   `tests/combat-skills.test.js`). Seven families on the world's table, under "Arms" in the grid,
   with every number in one frozen `ARMS` table at the top of the module so the user can tweak any
   of it in one place. `weapons.profile()` multiplies the weapon's own three-swing damage by the
   family's level; `createCombat` takes a `getMargins` and reads health, wind, the dodge window and
   what a swing costs from it. **Level 1 is today to the digit** — `TODAY` is still written in
   `src/combat.js` and is what a combat built without margins uses, so every fight test passed
   untouched. Nothing is banked in a skill nobody has shown you, and the weapon works anyway.
   Practice ceilings are in: the straw post pays Blades to 5, sparring to 20, a real fight has no
   ceiling.
2. **The country pushes back.** — **built 2026-09-21.** An encounter carries a `level`, and
   `createCombat` takes a `getLevel` so every fight already authored takes the level of the
   country it happens in without a single call site changing; an encounter written with a level of
   its own keeps it. Health is scaled once, where the enemy is made, and damage where it is dealt
   — to the traveler and to his allies alike. **Level 0 is today's numbers**, and every fight
   test passed untouched. Timing is not multiplied by anything, anywhere, and a test says so by
   name for each of the nine durations.

   Phase 1's payments are wired here too, which is what makes an Arms skill gainable at all:
   Mara's straw post shows Blades and pays as a post (ceiling 5), a real blow pays its weapon's
   family by what it did and where, being hit and living pays Toughness, and so does a step aside
   that actually avoided a strike — which the engine is the only one who can know, so `combat`
   emits `dodged` for it. `dodged`, `hurt` and `caught` gained the `source` that only `dealt` had,
   without which no ceiling ever reached them.
3. **Tiers, armour and smiths.** Items, three armour slots, a smith's shop in Tidehaven first.
4. **The shield's guard.**
5. **Tempo and arc** for daggers, staves, spears and pikes, and the pike's wall rule.
6. **Bows.** — **built 2026-09-21** (`src/archery.js`, `tests/archery.test.js`). See "Phase 6" below.
7. **Teachers:** lessons at friendship milestones, sparring and its ceiling. — **built
   2026-09-21** (`src/teachers.js`, `tests/teachers.test.js`). See "Phase 7" below.

## Laws, to be written as tests

- **Level 1 is today.** With every skill at 1, tier-1 sword, level-0 country, every number the
  fight produces equals what it produces now. The existing fight tests pass untouched.
- **Nothing is locked.** For every enemy kind at every country level, a level-1 traveler with a
  tier-0 weapon who never misses a dodge wins in finite time: no enemy heals faster than that
  traveler hurts it, and no enemy attack lands without a tell at least as long as a dodge takes
  to begin.
- **One mistake ends it.** In country of level 6 and above, a level-1 traveler with no armour
  dies to at most two blows from that country's ordinary enemy.
- **Timing never scales.** No tell, strike, contact or recovery time changes with any level of
  anything, the traveler's or the country's.
- **Every curve rises** and ends where the table says.
- **Armour never turns a whole blow**, and heavy armour doubles the wind swimming spends.
- **A skill nobody has shown you banks nothing**, and the weapon still works.

### The smithy in Tidehaven — built

Drent is level 0, so the best thing in the village is what you landed with; bog iron is a country
up the road (`smithStock`, `src/gear.js`). The smith is **Vulcan** — see "The smiths of myth"
below, which settled the naming that this section first left open.

**The plot was chosen by measurement, not by eye** (`TIDEHAVEN_SMITHY`, `src/region-world.js`).
Every standable half-metre of the village was swept and scored on five things: a clear yard, off
the middle of the street, **off every footpath the village draws**, off the opening raid ground,
and clear of the queue that comes down the pier. Two findings worth keeping.

**The village has no plot anywhere in it that holds a cottage-sized yard and still keeps off the
street** — 474 plots have 6.2 m of clearance, 1,198 are properly off the road, and the two sets do
not intersect. That is why the smithy is an open-sided lean-to and not another cottage: the ground
decided it, not taste.

**The footpaths were a correction, and an expensive one.** The first sweep measured
`world.paths[0]` and stopped. The village draws **forty-four** paths: the first is the main road,
and all the rest are the lanes between the cottages. The plot that sweep chose put a shelter post
**0.14 m** from a lane — a post standing in the middle of somebody's way to their own door. It
passed every test written, because every test written measured the same one path. Nothing within
twenty metres of that plot passes once the lanes are counted, so the smithy moved rather than
shifted. Of the 23 plots that do pass, the one taken has the most room and sits in the cottages'
own band off the street: **5.8 m of clear ground, 14.8 m off the road's centreline, 6.5 m from the
nearest post to the nearest footpath, 15.2 m from the nearest thing that must stay clear.**

Built modest: a lean-to, a stone forge with its chimney and banked coals, an anvil on its stump,
the quench barrel, a rack of bar stock, and a hanging board in the sign language of the rest of
Drent. Review view: `tidehaven-smithy`.

### The smith, and the buying — built

He stands at his own forge and looks at the street: `src/smith.js`. What he sells is
a function of **the country he is standing in** and nothing else — `regionLevel` of the region
under the traveler's feet — so the same man in better country would sell better iron without a
line of his own. Drent is level 0, so his whole board is three pieces of light wood and bone: a
cap at 18, a buckler at 26 and a jack at 40, against a starting purse of 24. The first thing on
the board is affordable off the boat and the last is something to save for, which is what gives
money something to be for.

Two small decisions worth writing down:

- **The shape is named where the selling happens.** The tier's name is the *material*, and "light
  wood and bone" is a true description of a cap and a useless name for one. `SLOT_NOUNS` in
  `src/smith.js` gives the shape — Jack, Cap, Buckler — so `gear.js` keeps saying only what
  things are made of.
- **Buying is atomic.** The money moves only if the piece is a thing the game has and the purse
  covers it, and if the wearing fails the money comes back. Buying for a place already worn
  replaces it and the toast says what came off. The action names a piece; the host looks it up in
  *today's* stock rather than trusting the name, so no action can buy something he does not have.

Review view: `tidehaven-smithy` shows the forge, the board, the anvil, the quench barrel and the
smith watching the road.

### Three smiths, one scene — built

Two forges were already standing in the world with nobody selling from them, so they were staffed
rather than invented.

- **Amod (Ostel) needed nobody.** It already had a smith, "Smith: hooks, hinges and gate metal".
  A man who is evidently the smith is the smith, so he sells and keeps the two lines he already
  had; he gains one, reconciling his own "Not swords" with selling armour — *armour is not a
  sword*. (He was Mern; he is **Goibniu** since the naming below. His id is untouched.)
- **The Moros camp got an armourer.** Its smithy tent had a rack of spears "waiting on the smith"
  and nobody to wait for. He is army-voiced, and stands outside the tent on the camp side so a
  man walking up from the parade meets him and not his forge. He is **Wayland**.

**The material is nobody's line.** Each man has one or two lines of his own; the sentence naming
what he sells is generated from `tierSoldAt` of the country he stands in, so a smith moved to
better country tells the truth about his own iron without being rewritten. Both Amod and the
Moros Plain are level 2, which is **bog iron** — and bog iron is where `medium` becomes legal, so
it is where mail begins.

**That makes the Tidehaven pointer true.** He says mail wants bog iron and there is a smith with a
country behind him *past the Caloss*; past the Caloss is Luscia, the Moros gate and the plain,
and the armourer there sells exactly what was promised. A test asserts the pointer against the
level table rather than trusting the prose, so if either country is ever re-levelled the line
fails instead of quietly lying.

Review view: `camp-armourer`. Amod has none — its smith was already there to be looked at.

## Phase 4 — the shield's guard — built

**Hold V to guard.** The one new verb melee gets. It is there at level 1 with any shield in hand
and levels only make it better: the share caught rises .6 → .9 and the wind it costs falls 18 → 8.
**No parry and no riposte** — the margins are the whole of it, as the user chose.

- **The hand slot IS the shield** (`gear.js`), so owning one and buying one are the same act.
- **Held, not pressed.** The host offers the key and the facing every frame; `combat.js` latches
  nothing. `combat.guard(held, yaw)` returns whether the shield is actually *up*, which is a
  different question: it needs a shield, an idle body, and the wind to pay for a blow.
- **Frontal only**, within `GUARD_ARC` — the same sixty degrees the legionaries' own guard uses,
  so the rule is one rule read from both sides.
- **A caught blow does not rock him.** That is the point of holding it: the guard is still up for
  the next one. It buys **no invulnerable moment** — only a dodge makes a blow miss — and it
  always lets something through, at every level, so no shield is ever a wall.
- **Wind is the limit.** Each catch costs `guardCost`; run out and the shield is simply not up.
- **Paid by what it stopped.** `caught` carries what the shield took, and Shield is paid on that,
  while Toughness is still paid for what got through.
- **Level 1 is today.** `hasShield` is false by default, so a traveler who owns no shield — and a
  combat wired to nothing — is the game it was, to the digit. The existing fight tests pass
  untouched.

He is also *seen* carrying it: a buckler on the shield arm, built once and shown or hidden with
the hand slot. Two things found by looking rather than by testing are written down in
`docs/known-issues.md`.

## Phase 5 — tempo and arc — built

Three numbers on each weapon, and the mercenaries' own lines are the specification
(`WEAPON_TYPES`, `src/weapons.js`):

- **`tempo`** multiplies how long a swing takes. The sword is 1 and is the reference, so a
  traveler with the sword he landed with fights exactly the game he fought before. Lakota says a
  staff "strikes twice as often as your sword", so a staff is **.5** and means it, measured by
  running both. The dagger is .72; mace, axe and greatsword are 1.3–1.4 — "slow to start".
- **`arc`** is the half-angle a swing reaches, the sword's being today's `Math.PI * .34`. The
  greatsword takes "everything within a cart's width" (×1.7); the dagger is narrow (×.74); the
  spear and pike are narrower than a dagger (×.35, ×.3) and `thrust: true`.
- **`room`** is the clearance a swing needs, and only the pike has any. "In a doorway I am
  furniture": within **2 m** of anything solid the pike refuses, emits `no-room`, and spends no
  wind. The same wall does not trouble a sword.

`locked` is the heavy families' third swing — "it cannot be stopped once it is going" — which
cannot be stepped out of at any point.

**A weapon that says nothing is the sword.** `tempoOf`, `arcOf` and `swingOf` all default to
today's numbers, so every fight already built, and every test that hands `combat` a bare
`{ id, damage, reach }`, is untouched.

### Three weapons, and a gap they closed

`ash-spear`, `war-pike` and `quarterstaff` fill the `polearms` and `staves` lists the brief left
empty for this phase. **Nobody who carries one will trade it** — Ciarán, Matt, Mus and Lakota all
say no in their own words — so the only way one reaches the traveler's hand is off the ground
where its owner fell.

Which found a real gap: `KIT_WEAPON_ITEM` had no entry for `spear`, `spears`, `pike` or `staff`,
so **four of the ten companions left nothing behind when they died**. They do now.
## Phase 7 — teachers and sparring — built

**The company is the faculty**, written down at last (`src/teachers.js`). Two things hang off it:
a **lesson**, which is what a man gives at a regard milestone, and a **bout**, which is sparring.

### Who teaches what, without a second table

A man teaches **the thing he is best at**, out of the weapon he carries and the shield he carries
it with. That is one rule read off `MERCENARY_ARMS`, and it gets Kristen right without an
exception: her blade is 25 and her shield is 35, so the shield is her craft, which is exactly what
*"I take the first blow on the boards"* says about her. Toughness is excluded, because nobody
teaches it — it is taught by being hit and living. So: Chris 30 and Ed 35 for Blades, Eliana 40 and
Al the Tun 20 for Heavy arms, Mus 45 / Ciarán 35 / Matt 35 for Polearms, Lakota 30 for Staves,
Jerry 40 for Bows, Kristen 35 for Shield. Tweak the one table and the faculty follows.

### A lesson

Three each, one at each rung above a stranger, offered in his own conversation and taken once —
the shape of Ed's swimming lesson, which is where the pattern came from. **The first one is what
*shows* you the weapon**: before it the weapon works and banks nothing, and `arms.learn` is what
changes that. Each is worth a lump of experience in his family, weighted by how good he is
(`LESSON_XP`, against a reference of 30), and each raises how far a bout with him will take you.

Three lessons from the best man in the game are about 3,150 experience, which is level 16. That is
a beginning, not a shortcut: the rest is use, and sparring, and being hit.

**The copy is each man's own voice**, taken from `MERCENARY_STYLES` — which was already the
specification for phase 5's numbers — and says true things about how his weapon now behaves: the
staff's `tempo: .5` ("it strikes twice as often as your sword", and it means it), the heavy
families' locked third swing, the pike's two paces of room, the guard's sixty degrees and the fact
that a caught blow does not rock you. Mus's are the shortest lines in the game, on purpose.

### A bout

**Sparring pays to a ceiling that rises with the lessons taken — 20, 35, 60 — and is then cut down
to the teacher's own level.** Al the Tun can never take you past 20 and Mus never past 45: nobody
can teach past what he knows. The top figure is headroom for the teachers the wider world will have
later, not a promise anybody in this company can keep. A real fight still has no ceiling at all,
and the straw post still stops at 5.

A man only spars in the craft he teaches, so the bout asks what is in the traveler's hands: a
weapon of his family, or — for Kristen alone — a shield on the arm, because the shield is worn
rather than held.

**And if the hands are wrong he lends his spare** (the coordinator's ruling, 2026-09-21). The
first cut of this refused the bout instead, which meant the only way to be taught the spear was
for a spearman to die first: nobody who carries a pole will trade one, so the traveler's hand
reaches a polearm only off the ground where its owner fell, and the dead teach nothing. Matt's
spare pike and Mus's short spear were already in the fiction; the rest are the plain equivalent — a
blunted blade, a practice shaft, a coppiced stave, the second mace in the roll, the buckler Kristen
learned on — and **none of them is a named weapon**, because the only named weapons in the game are
the ones the dead leave behind. Jerry lends nothing: he has one bow and the game has no other, and
he says so. That is the last thing waiting on phase 6.

**A loan is not a gift.** It exists for the length of the bout and nowhere else: `lent` is one
variable in the host with three readers (`lentProfile` for what combat swings, `getMargins` for
what a swing costs and whether there is a shield, `refreshShield` for what is drawn). It never
enters the satchel, never touches `weapons` or `gear`, is in no snapshot, and cannot be kept, sold
or dropped. The traveler's own weapon is back in his hand at `spar-over` however the bout ended —
and because a drowning leaves a fight by another road, the frame loop also gives it back on any
frame in which no bout is running.

**A bout can kill nobody.** `bout: true` on an encounter floors both sides at one and ends in a
yield with its own event (`spar-over`), so **no victory and no defeat is ever reported for a
lesson** and not one of the host's dozen victory branches can fire on one; walking out of a bout is
not a retreat either. Both of them end it whole and standing where they stood. The partner is a new
enemy kind with a soldier's honest tell — timing never scales, and a lesson least of all — drawn as
himself, because enemies now take a `model` and a `name` exactly as allies already did. The bout is
in `TEACHING_FIGHTS`, so you are taught by one man at a time and the other nine keep out of it.

### Regard had to be made to move

Nothing in the game moved a rung past the asking, so no milestone was ever reached and no lesson
could ever have been owed. Regard now moves on **the road actually walked together** (paid only
while he is moving, and not during a fight), on **fights come through together** — counted at the
victory, which is the one moment that says the fight was survived — and on **a weapon traded**. A
bout pays no regard at all, so sparring cannot be farmed for standing.

### What is saved, and what is not

One small section, `teachers`, holding how many lessons each man has given. Everything else is
derived: the standing is the companions', the experience is the skills', the ceiling is arithmetic.
It is saved rather than derived because **taking a lesson is a conversation**, and neither the
standing that earned it nor the experience it paid records that the conversation happened — a
traveler can reach *fond* and never ask.

The dead teach nothing and a man sent on ahead teaches nothing until he is back, which is one
question — is he here, walking with you — that `companions` already answers.

### The loan found a real one: phase 5 never reached the fight

`weapons.profile()` is what the host hands `createCombat`, and it returned the weapon's damage and
its reach and **left `tempo`, `arc`, `room`, `locked` and `thrust` behind**. `combat.js` reads all
five off the weapon it is given and defaults every one of them to the sword, so phase 5 was true of
the module, and of the tests that build a weapon by hand, and of nothing the player ever held: the
staff struck at a sword's pace, the greatsword's third swing could be stepped out of, and the pike
swung happily in a doorway.

It surfaced because lending a pike whose `room: 2` never arrives makes Matt's second lesson a lie.
`feelOf(id)` in `src/weapons.js` is now the one list of the five, `profile()` spreads it, and
`tests/teachers.test.js` walks every weapon the game has and checks each of the five survives the
journey. The review view reports the three numbers it is actually fighting with, so a picture can
be checked against them.

Review views: `sparring` — Ed the Word, two lessons in, three paces off, the rest of the company
out of it (`allies: 0`), his road body off the ground so there is no twin, the bout paying Blades
to 35 because 35 is what he is, and `loan: null` because the traveler's own sword is already his
craft. `sparring-pike` — Matt, the same bout with the loan in it: `own: simple-sword`,
`held: war-pike`, `inSatchel: false`, and `feel: {tempo 1.2, arc .32, room 2}` arriving at the
fight, which is the fix above seen from the outside.

## Phase 6 — bows — built

The brief called it the largest single piece, and the reason is that it is the only weapon that is
not a swing: everything else in this game happens where the traveler is standing, and an arrow
happens somewhere else, a moment later, and may never arrive. `src/archery.js` is the whole of the
arithmetic; `combat.js` owns the shot inside a fight; nothing else knows anything about it.

### The four rules

**Hold to draw, release to loose**, on the swing button — no new key (the coordinator, from the
user's answers). It is *held* exactly as the guard is held: the host offers the button and the
facing every frame, the module latches nothing, and it is offered **before** `combat.update`, so
the arrow leaves on the frame the player let go rather than the one after it. The draw fills in
`ARMS.draw` seconds, 1.1 at level 1 down to .6 at 99, which was already wired through `marginsFor`
and waiting. Let go early and the arrow still goes, weaker and shorter in proportion; below a
third of a draw it does not go at all and the traveler is told the draw was wasted. A draw needs
an arrow, the wind and an idle body, so a blow takes the bow down without sending anything.

**An arrow is a thing that travels.** 46 m a second, 34 m at a full draw, swept in steps shorter
than its own width so a fast arrow cannot pass through a thin tree between two frames.

**The first solid thing stops it** — `world.nearColliders`, the same call the pike's room uses, so
"in woodland I am a man holding a stick" is one rule and not two. An arrow that stops at a tree
stops at the tree and the goblin behind it is untouched.

**About two in three can be picked up again.** One shaft in three breaks where it lands, and
*which* one is the arrow's own number rather than a roll, so the rule holds exactly over any run,
a test can state it, and a reload cannot change what happened. A shaft that survives is a small
thing stuck in the ground that the traveler gathers by walking over it — no prompt and no key,
because stooping for an arrow is not a decision.

### Where a bow comes from, and where arrows come from

**The first bow is Jerry's spare**, given with his first lesson: a named, given weapon in the
manner of the ones the dead leave behind, and the thing that shows the traveler the bow at all —
before it, an arrow banks nothing. Nobody else hands one out and no smith sells one; a second can
only come off the ground where an archer fell. **The smiths sell arrows**, a dozen for nine
copper against a starting purse of twenty-four, at every forge in every country, because a shaft
is a shaft and the tier table is about armour. There is no fletcher and no new person.

### Jerry will not spar, and it is not an oversight

A bout is three paces of melee: the teacher closes to a little over two metres and swings. Two men
with bows at that range is not a lesson, it is an accident with a queue. Blunts at a mark would be
a different thing altogether — a straw post with a bow, with no opponent, no exchange and nothing
to yield — and is not built. So Jerry teaches by lesson and by the gift, says why in his own
words, and the rest of Bows is paid for by using it on things that shoot back with something else.

**He does shoot as an ally.** An `archer` stands off, draws and looses at whatever is nearest, and
his arrow is the same arrow in the same list, stopped by the same trees. Measured: he draws from
13 m, 0.0 degrees off his target, and his arrow hits. His shafts are his own and the traveler does
not walk the field for them. There are no enemy archers.

### The drawn bow, measured rather than admired

A picture can be read generously, so the pose was measured first — and the first draft failed
every part of it. **`arm` is positive *forward* in this rig** and the draft had it backwards,
which put both hands level and a little behind him, 0.70 m apart across the body and **0.01 m**
apart in depth: a man holding a washing line. The bow, which follows the forearm, lay flat — 0.08 m
of limb where a bow is 1.14 — and the arrow pointed at him, head 0.77 m behind his own back.

Fixed, and then pinned: at full draw the bow hand is 0.49 m out in front, the hands are 0.68 m
apart in depth and level to within 0.01 m, the limbs stand 1.14 m, and the arrow's head leads,
0.96 m out past the bow. A quarter of a radian of shoulder turn went too, because every degree the
chest turns is a degree the arrow *looks* as though it will go and will not — the shot flies along
the body's own facing. `tests/archery.test.js` measures all of it, for the traveler and for Jerry.

The bow is the tenth weapon and six meshes; the figure's build budget moves from 44 to 49 (Matt is
the dearest of the eleven), and the most anybody draws at full draw is 22.

Review views: `bow-drawn` — the traveler at a full draw, bow standing in the off hand, shaft on
the string, `drawn: 1` and `quiver: 12` in the facts beside it. `bow-jerry` — Jerry at his own
draw as an ally, `action: windup, progress: .94`, 4.7 m off his goblin. Neither used the Greenway
in the end: that raid is in `TEACHING_FIGHTS`, which is the set a companion is held *out* of, so
the first draft of the Jerry shot photographed nobody and said so (`archerAlly: null`).

## After phase 7

The seven phases are built. These are what came after them, or out of them.

### The smiths of myth — built

**The user, 2026-09-21: "name them things like Vulcan and other mythical terms for smiths."** It
is a naming register of the user's own, and it covers every forge in the game, so no Azhoran
place-name generator is asked for a person. Tidehaven's smith is **Vulcan**, the Moros camp's
armourer **Wayland**, Ambron City's **Hephaestus**, and Mern of Ostel is **Goibniu** — his id
(`ostel-smith`) and every word he says are untouched but his own name. Later forges draw from the
same well: Ilmarinen, Brokkr and Sindri, Tubal-cain, Svarog, Kothar. The register is
`MYTH_SMITHS` in `src/smith.js` and a test asserts every seller's shown name is in it; in prose
they are still the smith and the armourer, because the name is a name and not a trade.

### The capital sells better gear — built

**A capital is the one exception to "a smith sells what his country's level allows"** (the user,
2026-09-21). Ambron's armourer sells **wrought iron and steel both**, whatever level Elagos is,
because an imperial capital's racks are stocked by an empire and not by the county outside its
gate — and arrows, like every forge. **Not fine steel**: that is a gift from a side you have
served.

**The exception is one table and nothing else.** `SELLER_TIERS` in `src/smith.js` maps a seller to
the materials he keeps; a seller with no entry falls through to `tierSoldAt` of the ground he
stands on. `smithOffers(level, { id })` is the only board-builder there is, `smithStock` is now
`stockOfTier(tierSoldAt(level))`, and a test compares every other smith's board against
`smithStock` at every level 0–11, piece by piece and price by price. The host was the risk — it
used to look a purchase up in `smithStock(level)`, which would have refused a capital's steel on
Elagosi ground — so the action now names the seller (`smith-buy:<id>:<slot>:<weight>:<tier>`) and
the host rebuilds *that man's* board from the man and the ground. Fifteen pieces and a dozen
arrows: six of wrought iron (plate needs tier 3) and nine of steel, sorted dearest last across
both grades, so it is one board and not two lists.

**The plot was swept, not chosen** (`AMBRON_FORGE`, `src/ambron.js`). Every metre inside the walls
was scored for a shed that keeps three metres clear of everything drawn, stands off every street
corridor but within sight of one, and leaves standable ground at its door. **The east bank offers
nothing at all** — the old city is solid warehouses, halls and the physic garden — and every plot
that passes is on the timber strand, which is where a forge belongs anyway: fire and hammering go
on the working bank with the boatyard, the sawpit and the ropewalk. The Strand Forge sits in the
24 m gap between the poor row and the boatyard, nine metres clear of each, with the raft way
climbing past its door. He stands 2.4 m out from the south face with six metres of standable
ground round him, in `tests/nobody-sealed-in.test.js` and in the Plain Gate reachability flood,
because a host-placed man is in neither list by default.

Review view: `ambron-armourer`. The first draft used `startingSpot`, which rings the man — and the
far side of that ring stood the traveler exactly behind him. He is placed off the shoulder now.

### Your army rewards fine steel — built

**The user, 2026-09-21**: the side the traveler signed with gives fine steel for service,
beginning after the border battle is won. It is the only way tier 4 enters the game — the table
puts it in level-6/7 country and no country with a forge standing in it is within four levels of
that, so nothing sells it at any price.

**One piece, the body, in mail** (`SIDE_GIFT`, `src/aftermath-chapter.js`). The weight is the
arithmetic's choice. At tier 4 a light jack turns .096 of a blow and a mail coat turns .16; the
best body piece on any board the traveler has stood at by the border is bog-iron mail at .115. A
*fine steel* jack would therefore turn **less** than a thing he can buy for seventy-two copper,
and a reward weaker than a shop item is not a reward. The mail coat is a clear step above anything
purchasable before Ambron and costs him the same tenth off his dodge that any mail costs, so the
gift adds no penalty he is not already paying. Plate is legal at this tier
(`WEIGHTS.heavy.fromTier` is 3) and would turn .224, but it takes a quarter off the dodge and
**doubles the wind swimming spends** — a gift he cannot refuse that doubles his drowning is a
trap, not a thank-you.

**Given by whoever already speaks to him after the victory**, on each side, in that man's existing
voice: Captain Oswin Brulan when he rallies the hired company for the day after, Captain Arlen
Voss when he rallies the valley companies. Two lines each, before the orders — a captain who has
just watched a man hold the corner hands him the coat before he gives him the next piece of work.
It reaches the scene the way the file fill does: the **host** builds it, because only the host
knows what is already on his back.

**No save field was added.** Nothing else in the game makes tier-4 armour, no smith sells above
steel, and nothing anywhere calls `gear.takeOff` — so *wearing fine steel on that place* is a
permanent record that the side gave it, and it is already in the gear snapshot. `sideGiftOwed`
asks what he has on, so walking up to the same captain again says nothing more about it. A test
asserts the host never gains a way to take armour off, because that is what the derivation rests
on.

**Proposed, not built:** a second piece at the next victory. The day after already ends with the
principal counting out pay in his own voice — Brulan in the Court of Oaths, Envoy Orren in the
Marshal's tent — and a fine-steel **cap** there would sit in exactly the same slot in the scene as
the coat does at the rally, with the same derivation (`head` at tier 4) and no new save field. The
shield hand would then be a third, further on. Not built: it is a content decision.

### The army fills your file — built

**The user's ruling of 2026-09-21** (`docs/design-answers.md`), measured by the hunter: at level 2
the border battle is nought wins in forty for a traveler alone or with three, across every kit a
smith sells and every level the game can give, because eight soldiers land a blow every 0.3 s and
a dodge is affordable every 1.9 s. Numbers on your side decide that fight, not gear. So it is the
army's battle, and the army makes up the number.

`src/file-fill.js`, pure. **One constant**: `FILE_FLOOR = 6`, which the hunter measured and
confirmed — the line is identical for the border battle and `solis-sweep`, at a plausible kit and
a prepared one, and it does not care *who* the six are (0+6, 3+3 and 6+0 all win; anything
totalling five loses). Fewer than six walking with him and his commander assigns the difference as
ordinary soldiers of the side he signed with, the same ally kind the battle's own men already are.

**They are trained a little** (`FILL_ARMS`, the user's second ruling of 2026-09-21): **level 15,
toughness 12**, and not the kind's plain ninety. Plain, a lone traveler's border battle was 21 of
40 at half health with **five runs in forty still going at the two-minute cap**; trained, it is
**32 of 40 at 59 %, no stalemates, and 5.9 of the 6 assigned men still dead**. Both rows are the
hunter's validated line driver at level 2 over forty seeds, and the second was reproduced on the
build. The law the numbers have to keep is **strictly weaker than the weakest companion** — Altun
is 20 / 17 — so that friends still matter; it is pinned against `MERCENARY_ARMS` itself, and a
future companion weaker than Altun trips the test rather than passing quietly.

**They are not companions**: no regard, no lessons, no journal line, no file behind him
afterwards, no death card, nothing owed to the Marshal's register, nothing saved. They are made
where the fight is laid and forgotten with it.

**Both sides**, and every day-after variant, because both go through `getAllies` and the rule asks
the encounter's id rather than being written into either chapter. At most two short lines per
side, said by the captain who already gives him the word — Oswin Brulan of the army's left, Arlen
Voss of the Lauvel companies — only when it is actually happening, and truthful about the number.

**It comes in through `getAllies`, as the company does, and never through `borderEncounter`.**
The hunter's warning, and it is a real trap: `ALLY_SPOTS` has five places and the side already
uses four, so a fill of two or more handed to the encounter would be silently sliced off — the
traveler told six and given one, with nothing to say so. A test stands a filled file on the field
and counts the men actually standing there.

It touches nothing else: no encounter level moved, and no fight that is not an army's gained
anybody. Wolves, Mallec and every raid are what they were.

### The battle grows with the company — built

**The user's ruling of 2026-09-21** (`docs/design-answers.md`): *the enemy line grows with the size
of the traveler's company — more soldiers, never a higher level — so that ten companions meet a
fight worth ten and a full company is still a climax.* Ten companions won the eight-man line 40 of
40 at 96 % health in 36 seconds with one man down: a parade.

**One table in `src/border-chapter.js`**, `BORDER_LINE`, indexed by the number of companions
walking with him: rows 0 to 6 are all **eight**, and above the floor it is **one more soldier a
companion**, to twelve. A short company meets exactly the battle the fill was measured on, because
below `FILE_FLOOR` the army is already making his numbers up for him and a battle that grew at the
same time would take back what it just gave. The line is decided when `borderEncounter` is built
for the fight, from the company present then, and nothing about it is saved.

The four soldiers the growth can add are the same soldier at the same level — the ruling is more
men, never a higher level — laid in the third wave (entries 15.5 to 18.5 s, so the line is still
the three waves the captains promise), at least 1.2 m from the authored eight and from each other,
inside the ground `encounterConfig` accepts and clear of every place one of the traveler's own can
stand. Measured at level 2, forty seeds, on the same validated driver:

| walking with him | the line | won | health | seconds | dead on his side |
|---|---|---|---|---|---|
| six companions | 8 | 40/40 | 96 % | 41 | 2.2 of 6 |
| eight companions | 8 → **10** | 40/40 | 96 % → 95 % | 37 → **49** | 1.0 → **3.5 of 8** |
| ten companions | 8 → **12** | 40/40 | 96 % → 91 % | 37 → **56** | 1.1 → **4.8 of 10** |

**Twelve is the ceiling and it is not the chapter's**: `encounterConfig` refuses any fight with
more than twelve enemies, so twelve is the largest line the game will lay and a full company meets
it. What a big company buys at that size is a longer battle that kills half of itself, not a
harder one for the traveler — with fourteen on his side one tell in ten is aimed at him, and his
own health only falls from 96 % to 91 %. Going further would mean raising that cap, which nobody
has asked for.

**The day after is left at its authored line.** `aftermathEncounter` lays seven from a table each
variant may override, on four different arenas, and each variant's own copy names the number
("Seven of the Republic's best hold the Gate of Sun Horses"); growing them is four sets of authored
spots and four rewrites, not one small change.

**The captain says how many**, because he is the man who already gives the traveler the word at the
line: two short sentences from Brulan or Voss, truthful about the number, and nothing at all while
the line is the eight it has always been. The quest panel names no number, so that it is written
once for every size of the line.

### Candidates, not built

- **Allies take no weapon road at all** (found by the hunter). A companion with a pike fights
  exactly like one with a mace: `ALLY_KINDS` carries one damage figure and one reach a kind, and
  none of phase 5's tempo, arc, `locked` or `room` reaches an ally — `roomToSwing` is asked only
  about the traveler, so Matt's pike swings happily in a doorway when Matt is the one holding it.
  The traveler's own weapons went through `profile()`; allies never had an equivalent. Worth
  doing, not asked for, and it would change what a company is worth in a way that wants measuring
  first.
