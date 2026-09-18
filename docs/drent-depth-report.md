# Drent in depth: the three Renas, and what was built

The build report for `docs/drent-depth-brief.md`, on branch `drent-depth`.

Drent had no past. It has one now, and ground to walk it on: the ruins of **Rena**
at the region's centre, the village of **Applegarth** west of them, the old road
that still joins the two, and two people who were children the morning the town
went and have not spoken to each other in eleven years.

Tidehaven is untouched. Its terrain, its scatter and every stand that was there
before this branch come out of it unchanged; everything here is built beside them.

---

## The renaming, as it is recorded

| Then | Now | Where it is said |
| --- | --- | --- |
| **Rena**, the principal town of Drent | ruins | `RENA` in `src/rena.js`; the chart area `rena`; the landmark `rena-ruins`; the bound stone at the east gate reads **RENA** |
| **East Rena** → *Eastreena* | **Tidehaven** | the chart area keeps its id `eastreena` and its **name is Tidehaven**, with Eastreena in its note; the **East Rena Stone** beside the Greenway is cut `EAST RENA`; the back of Rena's own bound stone reads `East Rena`; Lorn and the fisher's boy say it aloud |
| **West Rena** → *Westerina* | **Applegarth** | the chart area `applegarth`; a place board at the village's east end says **Applegarth** and the bound stone beside it still says **Westerina**, because nobody has recut it |

The old names appear only as names — on stones, in the chart's notes and in
people's mouths. Nothing is titled Eastreena anywhere: not a region, not a
chapter, not a headline (`CLAUDE.md`). `tests/rena.test.js` asserts that no chart
area is *called* Eastreena and that Tidehaven's note still carries it.

## What the lore gave, and what was invented

From `../world-builder/azhora_lore/geography/regions/drent.md`, unchanged:

- Drent's lords never agree; every generation tries a **congress of lords** and
  every congress fails on a succession question or a river-toll dispute.
- The lords are **river-mouth** lords. The upland between the rivers is "the
  territory of no lord in particular".
- Ambron's dominion runs in cycles. When Ambron contracts, the **Lord
  Protectorate** at the **Torn mouth** loses substance; when the cycle turns, the
  new Protectorate opens with "a period of energetic reassertion — old tribute
  debts renegotiated… lords who accumulated private power during the free period
  reminded in material terms of what Ambronite backing costs. This period is
  uncomfortable."
- What individual lords "consistently do" is **negotiate their own submission
  before the army arrives**.

The lore does not say who razed Rena, because the lore has never heard of Rena.
**Invented, in the lore's own voice** (`RENA_RAZING` in `src/rena-people.js`, and
the second exchange of letters):

> Ambron was out of Drent for thirty years. The lords made a congress and it met
> at Rena, because Rena was the one town of any size that was not a river lord's
> port. When the cycle turned, the Lord Protector came up from the Torn mouth
> wanting thirty years of arrears, and every lord with a river mouth to lose made
> his own bargain and rode home, one at a time, in a morning. What was left to
> meet the Protector's men outside Rena was Rena. The fight was short. Then they
> took the town apart, course by course, so that nothing could meet there again.
> **That is why Drent is quiet.**

The Ardrys' father was the **congress's tallyman**, which is why he went back for
the ledger and not the strongbox — the lore's own detail that Drentish congress
minutes survive the congresses that wrote them, turned into a reason a man dies.

Nothing about Ambron, the Protectorate, the Torn mouth or the lords contradicts
`src/campaign-world.js`; Drent is still level 0 and still held quietly by the
Empire, and nothing added here attacks.

## The ground

Authored **directly in world metres** (100 m per hex), like Pueth and Peblos and
for the same reason: none of it existed in the 56 m frame, and `world-scale.js`'s
Tidehaven cluster (190 m round the landing) would capture any 56 m literal near
the village and pin it. The head of `src/rena.js` says so, and says what a future
change of scale would have to do.

| Place | World metres | Note |
| --- | --- | --- |
| **Rena**, centre | **(−395, −70)** | 100 m north of the main road, 113 m from Drent's own bounding centre; 261 m inland |
| Rena's east gate / west gate | (−361.8, −77.3) / (−428.2, −62.7) | the old road runs in at one and out at the other |
| **Applegarth**, centre | **(−568, −32)** | 177 m west of the ruins, 124 m off the main road, 120 m inland |
| The fork on the main road | **(−361.4, 25.0)** | 186 m along the road past the Caloss Gate: clear of the timber landing (30 m) and of the Avrel clearing |
| The old Rena road | 371 m, 15 vertices | fork → ruins' street → Applegarth → a lane that gives out in the wood at (−604, −25) |
| The East Rena Stone | (−157.1, 18.8) | 5 m off the Greenway, west of Fernway Rest |
| The Sunken Lane | (−484, 42) | 56 m along the road past the Avrel clearing, 19 m south |
| The Toll House | (−509, 103) | 112 m along, 21 m north |
| The Pedlar's Stone | (−566.5, 95.7) | 158 m along, 13 m south |

Both places are laid out in one shared frame: `renaPoint(a, b)` / `applePoint(a, b)`
is `a` metres **west along the old street** and `b` metres **north across it**.
The street's own line is the line between the two centres, because the road was.

### The ruins

A town that was killed rather than one that faded:

- The **old street**, 72 m of worn ground with broken kerb stones down both sides
  and gaps where the kerb is gone. Walkable end to end.
- The **burnt gate**: one pier of dressed stone standing 3.6 m, scorched black
  down the side the fire came up; its twin down to one course with the rest of it
  lying away from the road; the lintel in the grass beside it.
- **Eleven house plots**, five to nine metres of footing each, from a course you
  step over to shoulder height. Their walls are colliders and the plots are not,
  so the traveler walks the streets and steps into the rooms **through their own
  doorways**, past the jambs. Two of them are low enough to walk over.
- The **stump of the hall**, 16 × 11 m, three metres at the corners and slumped in
  the middles, the hearth still in the floor and three burnt roof timbers in the
  nettles behind it.
- The **market cross**, snapped off at head height, its shaft lying where it broke.
- The **well**, which still holds water and is the only thing in Rena that works.
- The **bound stone** on the approach: `RENA` on the face you read walking in,
  `East Rena` on the back, lettered through the game's own sign language.
- **Sixteen unnamed markers** in a row behind an earth bank on the south side.
- **Twenty-two apple trees** eighty years untended, west of the graves: grown out
  rather than up, mossed, one in three on the floor with its root plate up.

### Applegarth

Ten roofs in Drent's manner along the old road, fronts to the street: the Ardry
cottage, the press house, the apple loft, five houses, a byre and a store. A well,
two drying racks, cider barrels, a hurdled pound, a hay stack, Hesta's bench and
her basket of apples. Twenty-eight kept apple trees in a fenced orchard south of
the road, open on the road side. The Westerina bound stone and the Applegarth
place board flank the east end.

### Three more small places, on the road that already ran there

The stretch between the Avrel clearing and the Caloss bank had nothing on it. All
three of these are Rena's: **the Sunken Lane**, the green lane its cattle wore
down walking to a market that stopped eighty years ago; **the Toll House**, a
roofless stone box with a counter window and a standing chimney where the lord of
Rena took a toll on everything going down to the Caloss; and **the Pedlar's
Stone**, with three green coppers still in the hollow in its crown.

## The people

Ten, all of whom speak plainly. The age of the two old ones is in what they
remember, not in how they talk.

| Id | Name | Where | What they are |
| --- | --- | --- | --- |
| `rena-lorn` | **Lorn Ardry**, 87 | the Tidehaven shingle | mends crab pots; six at the razing; the last man in the village who saw Rena whole |
| `rena-hesta` | **Hesta Ardry**, 89 | Applegarth, at her door | his elder sister; keeps the orchard; eight at the razing |
| `apple-reeve` | Corwen Vale | Applegarth | reeve; keeps the tally of whose trees are whose |
| `apple-cider` | Fenn | Applegarth | the press, first apple to last barrel |
| `apple-cooper` | Wick | Applegarth | barrels, charred inside, whatever Fenn says |
| `apple-carter` | Aldith | Applegarth | takes the barrels east on the old road, through the ruins |
| `apple-young` | Bern | Applegarth | went through the ruins once, on a dare, and will not again |
| `tide-carter` | Nell Ordway | Tidehaven | knows every rut to the Avrel clearing; knows the fork |
| `tide-boy` | Dob | Tidehaven | brings Lorn his withies; hears him call the place Eastreena |
| `greenway-forager` | Marn | the Greenway | clears the fern off the East Rena stone twice a year |

Every stand is standable, in Drent, reachable from a road by flood fill, at least
4 m from anybody who was already standing anywhere (the world's own stands, the
eleven Legion posts and the town-life people), and **outside every bird habitat's
ground** — see *What the review caught*.

## How the letters play

`src/rena-letters.js`, pure, with `src/rena-people.js` for the conversations.

1. The traveler finds **Lorn** on the shingle. He says who he is and what he is;
   four topics explain Rena, who pulled it down, why he calls the village
   Eastreena, and that there is one other person alive who remembers.
2. Only once he has said there is a sister does he offer the first letter: *"If
   you are going west along the old road, you will come out at Applegarth. There
   is somebody there I have not written to in eleven years, and I have been
   meaning to, which is what people my age say instead of no."* Taking it puts a
   folded sheet in the satchel (`ardry-letter`) and puts the errand on the
   side-quest banner. Meeting him is not the errand: `task()` stays null until a
   letter is actually in hand, so the HUD says nothing before he has asked. (Two
   gotchas the host imposes and this module works with: a dialogue that offers
   choices is never *completed*, so the meeting is recorded when the conversation
   opens rather than on an `onComplete` that would never fire; and choices appear
   only on a dialogue's last line, so every topic is read through before it
   returns to the conversation.)
3. **Three exchanges, six letters, six legs.** Roughly 620 m each way: the main
   road west to the fork, 100 m north up the old road, in at the burnt gate,
   through Rena's street, and 180 m west to Applegarth. The ruins are walked
   through six times, which is the point.
   - **What they remember.** He remembers the roof of the hall lifting like the
     lid off a pot. She tells him he cannot have seen it, and gives him what she
     remembers instead: a morning of smoke with no fire anywhere, and the men from
     the river mouths riding away east on the good road. *They did not lose. They left.*
   - **What they disagree about.** He insists their father went back for the
     horses; she has always said the box. She is blunt: it was the **ledger**, and
     why, and what pulling a town down actually means, and that she is not ashamed
     of him and neither should Lorn be.
   - **What neither has said.** He confesses the byre door he left open at six,
     and what he has believed for eighty years it cost. She tells him she watched
     him do it and never said; that the beasts were not why they were slow; and
     that their mother went back for the doorpost stone with the family name on
     it, which is in her window, `ARDRY`, with the R gone shallow where she hurried.
4. Every letter is **readable**: in the journal while it is carried and after it
   is delivered, under **LETTERS · TIDEHAVEN AND APPLEGARTH**, with the standing
   of both of them above it. The one in the satchel says to read it there. Each
   letter is reacted to as it is handed over, in the recipient's own voice.
5. At the end **both of them are fond of you** — `friendship` returns `'fond'`,
   the same standing Lysa's acorn favour gives. A toast says so.

**Nothing else is paid.** `REWARD_HOOK` in `src/rena-letters.js` is the marked,
unused place for a reward when the user decides what the errand is worth, and the
host action `renaAct` in `main.js` is where it would be granted.

The errand saves with the road: `renaLetters` in the checkpoint, validated by
`validateRenaLettersSnapshot` before anything is applied, refusing a leg out of
range, a letter carried after they have caught up, a repeated or unknown name, and
a letter taken from somebody the traveler has never met. A checkpoint from before
this branch loads with the errand untouched.

## Files

**New**: `src/rena.js` (the places, the old road, the stands, the landmarks, the
clearings, the signs), `src/rena-works.js` (the scenery), `src/rena-people.js`
(the ten people and their conversations), `src/rena-letters.js` (the errand),
`tests/rena.test.js`, `tests/rena-letters.test.js`, this report.

**Changed**, all of it small and local:

| File | What |
| --- | --- |
| `src/world.js` | two imports, `measurePath`/`addPath` for the old road, one `buildRenaWorks` call, the landmarks, the NPC positions, and `renaRoute` on the world |
| `src/world-regions.js` | one import and `...RENA_CLEARINGS` in `REGION_CLEARINGS` |
| `src/main.js` | two imports, the quest object, the people, one dispatch line, the three actions, the save, the restore, the journal block, the side-quest banner, and two fields on the smoke's `state()` |
| `index.html` | one journal section |
| `src/signs.js` | five labels: `The Ruins of Rena`, `Applegarth`, `Rena`, `East Rena`, `Westerina` |
| `src/map-fog.js` | the village area is named **Tidehaven** (id kept), plus `rena` and `applegarth` |
| `src/inventory.js` | one item, `ardry-letter` |
| `src/road-checkpoint.js` | validate and carry `renaLetters` |
| `src/region-world.js` | Drent's description, its landmark list and its npc list |
| `src/build-status.js` | Drent's developer-chart entry |
| `package.json`, `README.md`, `tests/map-fog.test.js` | the two new test files, the region and module rows, and the chart test's new expectation |

`src/main.js`, `index.html`, `src/world.js`, `src/inventory.js`, `package.json`
and `README.md` are CRLF; every one of them was patched by a Python script that
asserts each anchor occurs exactly once, writes bytes, and writes nothing if an
anchor fails. Their line endings and long lines are unchanged.

## Tests

`npm test`: **516 tests, 516 pass** (187 s). Two new files, both in
`package.json`'s list.

`tests/rena.test.js` (9):

1. The ruins and the village stand on Drent's own ground, inland, well clear of
   the main road; Rena is at the region's centre, Applegarth west of it,
   Tidehaven east of both; the shared frame is orthonormal and `+b` really is north.
2. Nothing this pass builds stands on the main road, the Suval branch or the old
   road itself — 601 colliders, each measured against all three road lines.
3. The old road forks off the main road, runs in at one gate and out at the other,
   reaches Applegarth, never leaves Drent, and is walked a metre at a time with
   the real movement code.
4. Rena reads as a town that was killed: the street is walkable end to end, every
   plot stands back from it and can be **walked into**, the well is a well, the
   gate has two piers, sixteen graves, an orchard clear of them, and all three old
   bound stones lettered through the game's own sign language.
5. Applegarth is eight to twelve buildings, none overlapping another, all solid,
   its orchard south of the road, with no scatter tree growing through anything.
6. The ten stands are standable, in Drent, and clear of everybody.
7. Every new stand can be walked to from a road by flood fill.
8. The chart names Tidehaven with Eastreena in its note, no area is titled
   Eastreena, and no area swallows another.
9. Every place added can be discovered, is in Drent, has discovery text, has
   nothing in it to fight, and the whole game's landmark list still fits a save.

Plus one added after the review: **nothing this pass puts in Tidehaven stands in a
bird's home ground or in front of a Legion post.**

`tests/rena-letters.test.js` (10): three exchanges and six real letters with the
three beats in them; every leg carried in turn with the sheet in the satchel; the
wrong recipient, the second letter and the empty satchel all refused without
losing anything; both of them fond of you and nothing else paid; the banner naming
where to go and going quiet when it is done; the journal showing what has been
read and no more; the snapshot round-tripping and nine kinds of nonsense refused;
the road checkpoint keeping it, refusing an impossible one, and loading a save
from before this branch; the conversations offering, taking and giving; and the
razing told with the congress, the Protector, the Torn and the quiet in it.

## Smokes

| Smoke | Result |
| --- | --- |
| `npm test` | **516 / 516**, 187 s |
| `npm run test:game` | **pass** — `smoke.json` `ok: true`, 2 454 frames, 435 draw calls, 842 k triangles, `"errors": []` |
| `npm run test:road` | see the line below |
| `npm run test:autoplay` | **not run**, as instructed: the lead is repairing it |

## Checked by eye

Rendered in headless Chrome with SwiftShader from a scratch page on the vendor
import map, four cameras a sheet, the game's own lighting, materials and tone
mapping. The page was deleted before the commit; the sheets are in
`tests/artifacts/rena-review/` in this worktree, which is gitignored as every
other smoke's output is, so they do not travel with the branch.

| Sheet | What it shows |
| --- | --- |
| `ruins.png` | in at the burnt gate with the RENA stone; the street and its plots; the hall, the cross and the well; the grave row and the wild orchard |
| `applegarth.png` | in from the east past the Westerina stone and the place board; the press and the racks; the orchard; the village from above |
| `people.png` | Lorn on the shingle with his pots; Hesta at her door with the basket; the reeve at the well; the carter at the pound |
| `road.png` | the fork off the main road; the old road up to the gate; **the East Rena stone, legible**; the toll house |
| `wayside.png` | the sunken lane; the pedlar's stone; Rena from above; Applegarth from above |

### What the review caught

The first pass drew the ruined footings as scattered `rock` shapes, which from eye
height read as a field with stones in it rather than a town. They are coursed
blocks now — a course at a time, lowest where the wall has fallen in, squared
piers at the corners, jambs either side of each doorway, rubble spilled outside,
moss on top — and the plots are roughly twice as high. The gate piers were
untextured black slabs and are dressed stone with one scorched face. The wild
apples were ordinary trees and now grow out rather than up. The change is visible
in `ruins.png` before and after and is what the third commit is for.

It also caught two placement faults that the tests as first written missed, and
both tests were then written:

- **Lorn's crab pots stood on Legionary Ottar** at the landing, and once he was
  moved, on the village trail. He works on the shingle south of the trail now, and
  everything he works with lies inland of him.
- **The carter and the boy stood inside the cardinals' home ground** on the western
  fences. A stand inside a habitat takes the birds' perches away — `habitatSpots`
  drops any spot within 1.6 m of a stand — which shifted every later draw in
  `tests/drent-birds.test.js`'s seeded stream and broke it.

## Performance

Everything built here is **four merged, vertex-coloured meshes** — the ruins,
Applegarth, Rena's wayside, and Lorn's pots — **44 744 triangles in all**, so a
whole ruined town is a handful of draw calls that the renderer culls as a unit.
Nothing here casts a shadow it does not need to; Lorn's pots do not cast at all.

Colliders across the whole world go **9 270 → 9 588** (+318 net: 601 added, and
the new clearings take scatter out). Landmarks **82 → 92**, well under the 160 a
checkpoint's discovery list holds; `tests/rena.test.js` checks that with the real
validator. Nothing was added to Tidehaven's own scatter or terrain.

The story smoke reports **435 draw calls and 842 k triangles** at 33 ms average,
against 475 / 836 k at 23 ms in `docs/towns-and-signs-report.md` — a different
machine on a different day with other agents building on it, so the averages are
not comparable; the draw calls and triangles are, and they have not grown.

## What is stubbed, and what is left

- **The reward is deliberately unpaid.** `REWARD_HOOK` is the hook the brief asked
  to leave obvious. Both of them end fond of you and nothing else changes hands.
- **The old road gives out west of Applegarth.** It stops at (−604, −25) in the
  wood, as a lane that is not kept. If Drent ever reaches its western border, that
  is where the road wants to go on.
- **The ruins have nobody in them and nothing to fight**, which is the design.
  There is no site action in Rena: no ledger to find in the hall, no search of the
  graves. The hall's hearth and the well are both obvious places for one later.
- **Lorn and Hesta never meet.** The last letter says so in as many words. If the
  user ever wants the meeting, the ostler's horse (`src/riding.js`) is the only
  thing in the game that could plausibly carry either of them.
- **The old bound stones use the standard border-stone shape**, which is
  limewashed and painted. They are lettered correctly and read well, but a
  weathered variant of `signs.border` would suit an eighty-year-old stone better
  than a fresh one; that belongs to whoever touches `src/signs.js` next.
- **Applegarth has no interior and no work to do**, like every other village in
  the game.
- **`npm run test:autoplay` was not run.** The autopilot has no goal for the
  letters and does not know the old road exists; it never leaves the main road in
  Drent, so nothing here should reach it.

## What the lead must resolve on merge

1. **`src/main.js`** takes eleven small edits from this branch, all by anchor:
   two imports, `const renaLetters`, one `npcData.push`, one line in
   `conversation()`, the `renaAct` function, one field each in the save and the
   restore, one block in `refreshJournal`, three lines in the side-quest banner,
   and two fields on `state()`. Elagos and West Izol are editing the same file;
   every one of these is additive and none of them shares a line with another
   region's work except the `state()` field and the checkpoint call, where both
   sides' fields should be kept.
2. **`src/world.js`** takes seven edits, all additive, in the same places Pueth
   and Peblos take theirs: the imports, `measurePath`, `buildRenaWorks`,
   `addPath`, `npcPositions`, `landmarks`, and `renaRoute`.
3. **`package.json`**'s test list is main's plus `tests/rena.test.js` and
   `tests/rena-letters.test.js`.
4. **`src/map-fog.js`**: this branch renames the area `eastreena` to
   **Tidehaven** and adds two areas. The id is deliberately unchanged so saved
   charts keep loading. `tests/map-fog.test.js`'s second test was updated to match;
   if another branch also touched that test, keep both expectations.
5. **`src/signs.js`**: five labels added to `SIGN_LABELS`. An unknown label throws
   at build time, so a merge that drops them will fail loudly rather than quietly.
6. **`src/inventory.js`**: one item. `road-checkpoint.js` caps a saved satchel at
   the number of known items, so the cap moves with it.
7. **Nothing in Tidehaven moved.** If a merge ever appears to move a village
   stand, terrain or scatter, it did not come from here.
8. **The world scale.** `src/rena.js` is authored in world metres, like
   `src/pueth-world.js` and `src/peblos-world.js`. A future change of
   `METRES_PER_HEX` needs a cluster for Rena and one for Applegarth in the new
   frame; the head of the file says so.
