# The long road through Drent

A design, not code. The builder's brief is `docs/drent-long-road-build.md`. Everything the user
has already decided is in `docs/design-answers.md` and wins over anything here.

The user's ask, in one line: you may go to the muster at once and be first of the eleven, or you
may be told the battle is a while off and spend that while in Drent — the tongue above all, then
fishing, birding, farming and the rest — and walk into the camp last, with the whole company in
and the Marshal waiting for you.

## 1. The number: 87 minutes

The company's clock is `src/mercenaries.js`. With the road the game uses (`MAIN_ROAD`), the three
stops `main.js` gives the company (Corvan 90 s, Chip 60 s, Iven 120 s) and the muster at the army
camp (1,277 m along a 1,677 m road), each of the ten does this, in minutes of play (landing and
leaving as m:ss, the rest as decimal minutes):

| Who | Lands | Leaves the landing | Caloss Gate | Corvan | Chip | Iven | Musters |
|---|---|---|---|---|---|---|---|
| Chris Gotwood (today's clock) | 0:00 | 7:00 | 9.5 | 12.6 | 17.4 | 21.8 | 28.1 |
| Ed the Word | 6:00 | 9:00 | 11.4 | 14.4 | 19.0 | 23.3 | 29.4 |
| Jerry, Kristen, Ciarán | 18:00 | 19:30 | 22.0 | 25.0 | 29.7 | 34.1 | 40.1 – 40.9 |
| Lakota | 33:00 | 34:00 | 36.6 | 39.8 | 44.7 | 49.2 | 55.7 |
| Eliana | 48:00 | 49:18 | 51.6 | 54.5 | 59.1 | 63.3 | 69.4 |
| Matt, and Al the Tun | 63:00 | 65:00 | 67.6 | 70.9 | 75.8 | 80.4 | 87.0, 87.2 |
| Mus | −0:30 … 63:30, drawn | +0:45 | — | — | — | — | 83.7 at the latest |

**The tenth mercenary — Al the Tun — musters at 5,233 seconds: 87 minutes 13 seconds.** Mus can
never be later (his worst draw musters at 5,024 s). That is the target. The clock runs in every
mode but the opening screen and pause, so ninety minutes of talk and fishing still move the
company.

The long road is cut so that a typical player stands on the Caloss bridge at about minute 80–85
and, after Luscia's own errands (the waymarkers, Iven, the Lauvel, the horse), reaches the camp at
about minute 95–100: ten minutes after the tenth, so a player fifteen per cent quicker than
typical still arrives last. A player who is quicker than that finds eight or nine in and watches
the princes walk in behind them. Nothing is rigged: the clock is the clock.

### Why 87 is a good number and not only a convenient one

Figures below are from memory of how these openings play, not measured.

| Opening | Typical length | Door open from the start? | What it shows |
|---|---|---|---|
| Tutorial Island (RuneScape) | 10–20 min | No | One instructor per skill, a minute or two each, in a fixed order. The direct ancestor of a 99-level table. Too thin to carry a language. |
| Helgen to Riverwood (Skyrim) | 25 min forced, about an hour with Riverwood | After Helgen | The optional village teaches smithing, trade and a first dungeon to those who stay. People stay. |
| The Great Plateau (Breath of the Wild) | 1½–3 h | No — the glider is the key | Four lessons, each a walk and a small problem; you see each place long before you reach it. |
| White Orchard (Witcher 3) | 1½–2 h straight, 3 h and more with everything | Yes, after the griffin | A whole small country with its own history, left when you choose. |

Eighty-seven minutes sits between Riverwood's hour and White Orchard's two. It holds seventeen
lessons (eleven skills and six systems — moving, talking, fighting, the satchel, the chart,
money), which is about five minutes a lesson: three times Tutorial Island's pace, because each of
ours is a walk, a person and one thing done once; a quarter of the Plateau's, because Drent's road
is 650 m and a man runs it in a minute and a half. Two things those four do that we copy: **you
see a place before you are taught in it** (Jojo's charting errand walks you past the Weatherhead
and the Koopwood before anyone there is a lesson), and **something happens on a beat**. Ours is
given free by the clock: a boat lands at 6, 18, 33, 48 and 63 minutes. Five bells, five legs.

## 2. The fork, and who says it

Three voices, in this order, and none of them is a menu.

1. **The letter says the rule.** Reading the letter of introduction is already a tutorial step
   (stage 6, at the Greenway Watch, after the raid — the one moment in the first ten minutes when
   nothing is urgent). The letter gains two sentences: *the company is eleven; the Marshal marches
   when the eleventh has reported, and not before.*
2. **Chris says the choice**, in your own tongue, the moment the satchel closes (stage 7 → 8):
   nine of the eleven are still at sea; Venmor is paying for eleven and will not march short; we
   can be first in and sit in a camp, or you can learn the country you are about to fight for —
   the tongue first. "Either way I'm walking with you." He does not ask for an answer.
3. **Corvan says it for the army**, at the Avrel post, on both roads: he copies the letter into
   the field register, reads out who has already signed it, and says nobody will be posted late
   while a boat is still out. He is the one who says *the Marshal will not move until the company
   is in*. Jojo seeds it on the pier with one clause ("ten more boats are due off the Stills");
   she cannot say more, because the village is under attack when you meet her.

**You choose by walking.** There is no flag for "long" or "short". The tutorial's gold marker goes
on pointing down the road to Fernway, the gate, Corvan and the muster, exactly as today. Beside it
there is a second gold.

**Two golds.** The user's three marker kinds stand (`src/quest-markers.js`: main, plot, skill). The
long road is main quest, so it is gold too — the same cut stone, **open**: the ring without the
stone in it. Solid gold is the muster road; open gold is the long road's next recommended stop. A
teacher wears their green leaf as always; the open gold rides over whichever one is next. The
minimap and the trail map glow both. The journal's chapter 1 page gains a second block under its
five steps, *The long way round*, listing the legs. Following one never closes the other.

**What keeps the short road honest.**

- Corvan's errands, the bridge, the waymarkers, Iven, the Lauvel and the horse are identical on
  both roads. The long road adds; it replaces nothing.
- Every teacher, errand and reward in Drent stays where it is and stays open for ever. The road
  back is a minute and a half.
- The battle never waits on the clock, only on you. Its allies are already "whoever has mustered,
  filled out with soldiers" (`main.js`, the border line), so an early arrival fights with whoever
  is in.
- The one thing the short road costs is **Chris's company in Drent** — the aside and the doubling.
  So it is made recoverable: until the march to the border begins, Chris can be asked at the camp
  to walk Drent with you, and he will. (Default 6.)
- Going first has its own reward the long road cannot have (section 9).

## 3. Chris on the road

Today Chris is on the clock like the other nine. The long road needs him beside you for eighty
minutes, so:

- **Chris walks with whoever he landed with**, from the pier, wherever you go in Drent and along
  the main road. While he does, he is off the clock; the existing interpreter rules apply
  unchanged (twelve metres, the aside, exposure doubled; Ambroni, Drentish and Feradom only).
- **He leaves you in one of three ways.** (a) You reach the muster: he musters a step behind you.
  (b) You set foot on the Caloss bridge after the last boat is in (3,780 s): he goes ahead.
  (c) You tell him to go on. From that second he is a pure function of the clock again, walking
  from where he stood — one saved pair, `releasedAt` and `releasedDistance`. From the bridge he
  musters about ten minutes later (some 600 m at 1.28 m/s, Chip's 60 s and Iven's 120 s).
- **Old saves** have no such pair and keep him on the old clock, so nothing moves under them.
- **He fights nothing in Drent.** In the raid he keeps the street behind you; over the Tessen he
  waits at the road post. This is a holding rule until the company design exists (question 2).

**What the bridge teaches.** Chip stands on the Luscian bank and speaks Luscian Mittoli. Chris
has three tongues and that is not one of them: for the first time the aside under the line stays
empty, and he says so — "Not one of mine." Then, on the long road: the princes' boat is in, that
is all of us landed, somebody has to tell Venmor the eleventh is on the road or he will post you
missing. He goes up the far bank a few minutes behind a prince and a sorcerer. That is the reason
the Marshal waits, in the fiction; and it is the shape of the whole linguist skill shown in one
step — an interpreter is as wide as his tongues, and every new country is a new climb.

## 4. The route

Five legs, each holding one of the clock's bells. Spine stops wear the open gold in this order;
branches wear their own leaf or scroll and are taken or not.

| Leg | Minutes | Spine stops | Branches on the way |
|---|---|---|---|
| 0. The harbour (both roads) | 0–12 | Jojo on the pier: the letter, the rough chart · the practice post · the raid · Eren · the letter read: **the fork** | — |
| 1. Tidehaven, which you ran through | 12–28 | **Perrin** at the bird garden (birding) · **Lysa** (the acorn errand, the tinderbox) · **Jojo** again: chart the village's three corners — pier, Weatherhead, Koopwood (cartography) · Ambroni drill 1 | Wendel (money, the phrasebook), Lorn Ardry's letter for his sister, Orris, Toft, Brandy and Bosco, Cabe, Jess's ferry, the Sultana if she is in |
| 2. The near wood | 29–46 | **Bran** at Willowmere (fishing; then the catch cooked on the stone firepit with Lysa's tinderbox: cooking) · **Bowden** at the Koopwood (woodcutting, the first skill you grind; he shows you the plot) · drill 2 at Willowmere's fire | Troy at the Bee Fold (honey, so honey cake), Tamsin and the forest story, the house plot once you can cut for it |
| 3. Fernway | 46–57 | **Odger Pell**, now at Fernway Rest (mycology) · **the Talaelos players'** camp: a short play in Drentish, many mouths, Chris murmuring under it · drill 3 | the Old Tree, the Stormfall Oak and the shrine, the East Rena Stone, **the scouts' camp over the Tessen** (section 8) |
| 4. The Avrel clearing | 57–72 | **Corvan** (the register; the parcels — solid gold as well) · **the ruins of Rena**, 110 m north (archaeology) · **Enna** at the Mill Commons (farming) · drill 4: you give Corvan your own name and rank in Ambroni | the players' second camp (never built as a branch of its own: as built it serves the leg-3 play — see the build doc), Applegarth and Hesta Ardry (the letter delivered; the orchard) |
| 5. The Caloss road | 72–85 | **Nell Harrow**, now at the Sunken Lane (botany; the hedge) · **Silas Garrow**, now at the Toll House stream (geology) · drill 5 · **Chip** and the bridge (solid gold as well): Chris goes ahead | the Pedlar's Stone, the Quiet Bank (river fishing), the granite in the riverbed |

The order is the curriculum: two *knowing* skills where the village is (a chart, a bird), then one
you *do* (a rod), one you *make* (a fire, a fish), one you *grind* (an axe), then the knowing
skills again with farther to walk for each find, then the one that runs on a clock (a sown row),
and the hedge, the stone and the river last, where the country is opening toward Luscia.

### The re-spacing

Three people move. Everybody else stays. Ids do not change.

| Person | Where now | Where to | Why they would be there |
|---|---|---|---|
| **Odger Pell** (`mycologist`) | a drying rack at the Greenway's edge, outside Tidehaven | the bench and cairn at **Fernway Rest**, rack beside the cairn | Mushrooms want old damp wood, and Fern Hollow behind the Rest is the dampest ground in Drent's forest. A rack is a rack; he put it where the paths meet because that is where people with baskets pass. |
| **Nell Harrow** (`botanist`) | Tidehaven's outskirts (−40, 44) | **the Sunken Lane**, 56 m past the Avrel clearing, where the old drove crosses the road | Two hedge banks eighty years unlaid are the best botany in Drent, and the tobacco is Avrel's. The hedge is also where hazel and bramble grow — two of the six foods (section 7). |
| **Silas Garrow** (`geologist`) | the marl bank under the Weatherhead (−5, 97) | **the Toll House stream**, 112 m past the clearing, with a cart of marl | Marl is dug to be spread on fields. He digs it under the Weatherhead and the Avrel families pay him by the load; the stream cut below the Toll House is a geologist's section, and ironstone and clay are in the furrows behind him. The old pit stays as a place he sends you back to for sharks' teeth. |
| Enna (`commons-miller`) | the Mill Commons | stays; **becomes farming's teacher** | She already stands between the crop rows and the mill. |
| Jojo, Perrin, Lysa, Orris, Toft, Lorn, Wendel, Brandy and Bosco, Cabe, Jess, the carter, the boy | Tidehaven | stay | The harbour's own lessons, and a village that is still a village: a dozen people after three have left. |
| Bowden, Troy, Tamsin, Bran, Eren | the near wood and the Watch | stay | Built places: a woodlot, a bee fold, a pond, a watch. |
| Hesta and Applegarth's five, Chip | the west of Drent | stay | Already where the road needs them. |

Today seven teachers stand within a hundred metres of the pier and the 245 m from the Caloss Gate
to the clearing teaches nothing. After: three at the harbour, two in the near wood, one at
Fernway, two in the clearing, two on the Caloss road, one at the bridge. Geology was already laid
out this way — its stones run from the Weatherhead shingle to the granite at the crossing
(`src/drent-stones.js`) — which is the argument that the rest should be.

## 5. Skill by skill

| Skill | Introduced | By | The first thing done |
|---|---|---|---|
| Cartography | pier, 0 min; village, 23 min | Jojo | The rough chart; then three corners of Tidehaven charted |
| Linguist | pier, 0 min | anyone speaking; Chris beside you | Section 6 |
| Birding | 12 min | Perrin | The feeder, the pointer, the first garden bird |
| Cooking | 18 and 33 min | Lysa, then any fire | The tinderbox; a fish on Willowmere's firepit; later flatbread and honey cake |
| Fishing | 29 min | Bran; Chip for the river | One fish out of the pond |
| Woodcutting | 37 min | Bowden | Logs until level 2 shows what the 99 table is |
| Construction | when woodcutting allows | Bowden, the plot | A branch, not a stop: the house is the long road's long tail |
| Mycology | 46 min | Odger | One find in Fern Hollow |
| Archaeology | 62 min | whoever holds it once Lakota has gone (question 4) | One peg lifted at Rena |
| **Farming** (new) | 67 min | Enna | A row sown; reaped on the way back from Rena, or later |
| Botany | 72 min | Nell | One hedge plant; hazelnuts in the satchel |
| Geology | 77 min | Silas | Ironstone out of a furrow |
| Swimming | not on this road yet | — | A hook: Willowmere is the water you can stand up in, the Caloss is the water you cannot. Its teacher is Ed the Word, who is on the clock (question 1) |
| Wine | never in Drent | — | West Suval's |
| Combat skills | hook | — | The practice post, the raid and the scouts' camp are where their first levels will come from when that brief exists |

**Farming is the fourteenth skill.** The user said "farming", the clearing already has rows and a
mill, and a game whose company walks on a clock should have one skill that *grows* on it. A working
skill on the 99 table: sow, wait, reap. A sown row ripens on play-seconds — barley in four
minutes — which teaches in one lesson that Drent goes on while you are elsewhere, the same truth
the mercenaries are. Picking in Applegarth's kept orchard is farming with no sowing. Drent leaf
(`src/pipeweed.js`: half the good ground is under tobacco) is the second crop. No more than that
in the first cut.

## 6. The language budget

Drent speaks **Drentish**. The army speaks **Ambroni** wherever it stands. Luscia speaks
**Mittoli**, which is kin to neither (a floor of 0.12 from Ambroni; nothing from Drentish) and
which nobody in Drent can teach. So "Luscia readable without Chris" has an honest meaning: *the
army's Luscia* — Iven, the picket, the Marshal, every order and every army sign — not the
Luscians, who are the next climb.

The rules as built (`docs/languages.md`): the k-th line from one mouth is worth 1/√k; Chris
doubles it; level is `99·ln(1+e/60)/ln 16`; signs turn readable at 50.

**Drentish, by ear.** The long road passes about 29 Drentish mouths. Heard typically — 20 to 25
lines from a teacher, 5 to 12 from anyone else — that is 300–430 lines and 129–154 raw exposure.

| | Exposure | Drentish | Of a line in your own words |
|---|---|---|---|
| Long road beside Chris | 258–308 | **60–65** | 66–72% |
| The same walked later, alone | 129–154 | 41–45 | about 40%; Drent's signs still shut |
| Short road to the bridge | about 35 | about 15 | 6% |

Level 50 needs 183 exposure, which beside Chris arrives at about minute 50 — leaving Fernway,
with the East Rena Stone ten seconds up the road. It is meant to be the first thing you read.

**Ambroni, by lesson.** Drent has one Ambroni mouth on the road (Corvan) and a garrison over the
Tessen. Ear alone gives level 7–20. So Chris *teaches* it: **five drills, one to close each leg,
35 exposure each** through `linguist.study`, the hook `languages.md` left open. A drill is a
minute: six lines of the army's speech, each with what it means. No quiz; the player never has to
learn a word. 175 taught and about 17 heard is **Ambroni 51**; with the Tessen post, 56. The
army's signs turn readable about as you cross into Luscia.

| Leaving Drent | Drentish | Ambroni | Mittoli |
|---|---|---|---|
| Long road | 60–65 | 51–56 | 0 — first heard from Chip, with Chris silent beside you |
| Short road | about 15 | about 7 | 0 |

## 7. The six foods

`docs/known-issues.md` lists six foods that heal and cannot be got. Farming is the natural source
of one; the long road gives all six a source, each through the skill that owns it:

| Food | Source | Skill |
|---|---|---|
| Avrel apples | picked in Applegarth's orchard and the clearing's trees | farming |
| hazelnuts, bramble berries | Nell's hedge at the Sunken Lane; bramble also at the gate | botany, as gatherables |
| acorn flatbread | Lysa's recipe, from the acorn errand's meal, on any fire | cooking |
| honey cake | Lysa's recipe: acorn meal and Troy's honey | cooking |
| roasted chestnuts | Wendel's pack ("down from Amod by the sackful") | money |

## 8. The timeline

A typical long road against the company's clock. **Noticing** is a rule, not luck: the harbour
bell rings once for each person who lands, heard across Drent; and the first time a walking
mercenary shares your named ground (`SUBREGIONS`) or comes within 40 m, Chris names him in one
line under the screen. Where you were standing is remembered for each of them (section 9).

| Minute | You | The company |
|---|---|---|
| 0 | Off the boat. Jojo: the letter, the rough chart | Chris steps off with you. Mus beaches round the headland at a moment nobody knows and is never on the road |
| 2–5 | The practice post; into the Greenway | |
| 5–9 | The raid. Eren | 6:00 one bell: Ed the Word wades out of the sea behind you |
| 9–12 | The letter, the satchel: **the fork**, at the Watch | 9:00–11:30 Ed walks up the Greenway past the Watch, wet to the neck — the first of them you see go by. He musters at 29.4 |
| 12–17 | Perrin's garden, thirty metres from the pier | |
| 17–23 | Lysa's acorns, the tinderbox | 18:00 three bells: Jerry, Kristen and Ciarán land arguing. 19:30 they go up the village street past Lysa's kitchen |
| 23–28 | Jojo's three corners; drill 1 | 25.0 the riders sign Corvan's register; 29.7 Chip; in at 40–41 |
| 29–37 | Willowmere: Bran, a fish, a fire | 33:00 one bell. 35:10 Lakota passes the Watch, 25 m from the pond, alone, looking up |
| 37–46 | Bowden; Troy; drill 2 | 39.8 Lakota at Corvan's; 44.7 Chip; in at 55.7 |
| 46–52 | Odger at Fernway Rest | 48:00 one bell. 51:00 Eliana walks past the bench |
| 52–57 | The players' play; drill 3. Drentish crosses 50: the East Rena Stone reads | 54.5 Eliana at Corvan's; in at 69.4 |
| 57–62 | Corvan: he reads you the register — seven names | |
| 62–67 | Rena | 63:00 two bells: the last boat. Matt, Prince of Zorkys, and Al the Tun |
| 67–72 | Enna: a row sown; drill 4 at Corvan's desk | 70.9–72.4 the prince and the sorcerer stand at Corvan's desk, 45 m from the mill |
| 72–77 | Nell's hedge, where the lane crosses the road | 73.3 they walk through the lane past you. 75.8 Chip. Over the bridge at 76.8 |
| 77–81 | Silas at the stream; drill 5 | everyone landed is now west of you |
| 81–85 | Chip: Mittoli, and Chris with nothing to say. The bridge. **Chris goes ahead** | 87.2 the tenth musters |
| 85–97 | Luscia alone: the waymarkers, Iven in Ambroni you half follow, the Lauvel, the horse | about 95 Chris musters |
| 95–100 | The camp | **Ten standing. You are the eleventh** |

**Arriving last.** The ten are already drawn up in two files behind the standard (that is where
`placements` puts the mustered). When you come through the gate they turn. Chris: "That's eleven."
Venmor, who is told the count already (`musterCount`), says the company is in and gives the Solis
errand as today. Each of the ten has one line for you, made from where you were when he passed:
"Last I saw you, you were up to your knees in a pond." Ten templates and a dozen place phrases,
not a hundred lines.

**Arriving first.** The gate guard counts one. The mercenaries' ground behind the standard has
eleven pegs and nobody on them; Venmor says you are early and he has work for early men — the
Solis errand, which is the same errand. Each time you come back to the camp more pegs are taken,
and each arrival has a line about finding you already there. If you are ready to march before the
last boat is in, the line is filled out with soldiers, as the code already does (question 3).

**What a player who leaves early has.**

| Leaves Drent at | Has | Has not |
|---|---|---|
| **15 min** (the short road) | Moving, talking through Chris, the rough chart, a fight won, the satchel, Corvan's errand. Cartography begun. Drentish 15, Ambroni 7. Can be first of eleven | Any gathering or working skill, money, a fire, a readable sign. All of it still there |
| **45 min** (two legs) | Cartography, birding, fishing, cooking, woodcutting; money and fire; flatbread and honey cake; Drentish about 40, Ambroni about 25; has seen Ed, the riders and Lakota go by. Musters sixth to eighth | Mycology, archaeology, farming, botany, geology; Drent's signs; the register scene |
| **90 min** (all of it) | Eleven of fourteen skills begun, six foods, Drent charted end to end, Drentish 60+, Ambroni 50+, the whole company seen on the road. Musters eleventh | Wine, swimming, a house — a reason to come back |

## 9. Rewards and pacing

**The shape.** Level 0 means nothing attacks you; it does not mean nothing happens. Spikes at
5–9 minutes (the raid), about 55 (the optional scouts' camp), 76 (a prince and a sorcerer overtake
you at the border river), 81–85 (Chris leaves), 95+ (the muster turns to look at you). Between
them a bell every quarter-hour, and no lesson over eight minutes.

**One brush with danger, optional.** The Bramble Scout Camp over the Tessen in Pueth already
exists (`src/forest-hideout.js`): level 1, two scouts, stolen sacks, Tamsin's one-time reward. The
long road points at it from Fernway with a scroll and never with gold. Chris waits at the Tessen
road post talking Ambroni with Drevan's garrison — the best Ambroni ear-lesson there is.

**Hooks left, not designed.** *Night:* the long road is 87 minutes and wants exactly one dusk, at
the players' camp at Fernway (about minute 50 — a play by firelight is the language lesson);
whoever designs the cycle should know that. *Combat skills and gear:* the post, the raid and the
scouts' camp are the three places their first levels belong. *The company:* `releasedAt` is the
only thing standing in for "is recruited".

**The first horse** stays the army's, at Nothom, on both roads. **The house plot** is the
long road's long tail: Bowden shows it at minute 40; nobody builds a house in a tutorial.

**What the long road gives that the short road does not, beyond levels.**

1. *A country you can read.* Drent's signs, and the army's, for the rest of the game.
2. *Jojo's countersign.* With all ten named grounds of Drent charted, Jojo signs your chart — an
   item, a block of cartography experience — and Drent's level number, 0, appears in the journal,
   which is how that number was always meant to be found.
3. *A full satchel* of the six foods, none of which can be bought together anywhere.
4. *A company that knows you.* Ten lines at the muster remembering where you were; the hook a
   companion system will want.
5. *The Marshal waited for you*, and everyone in the camp knows it.

**What the short road gives that the long road does not.** First of eleven: the empty pegs, each
arrival met fresh, Venmor's remark that he remembers who came first (a small gain in the army's
trust in `src/campaign.js`). Each road has something the other cannot get. Neither is a penalty.

## 10. The eleven: rules, not rewrites

1. **A lesson is shortened, never skipped.** If the traveler already has experience in the skill
   a stop teaches, the teacher takes one recognising branch — "you've done this before" — the
   first-find step is waived, the stop counts, and the talk still pays its Drentish. One variant
   per spine teacher. Lakota at Perrin's garden: Perrin hands him Drent's list to tick, because a
   fen man at 40 has still never seen a Drent bird, and finds are finds.
2. **Your companion is whoever landed with you**: Chris; or Cromb, if you are Chris.
3. **If you are Chris** there is no aside and no doubling — you *are* the interpreter, and Cromb
   asks you what was said. You start ahead instead (Ambroni 40). The drills still run and still
   pay: you give them. (His starting table should also carry Drentish, since `INTERPRETER.knows`
   says he has it; flagged for whoever owns `docs/playable-characters.md`.)
4. **Your own slot on the clock is empty**, as `companyFor` already does. If you belong to a
   group, the others land at their hour without you and their passing line is about where you got
   to. The target stays 87: whoever you are, a prince or a sorcerer musters last.
5. **The muster's count is always "ten and you".**

## 11. Defaults chosen

1. Target 5,233 s, taken from the clock as it stands. `ARRIVALS` and the three dwells are not touched.
2. The fork is the letter, then Chris, then Corvan. No flag, no menu.
3. Open gold is a variant of `main`, not a fourth kind.
4. Chris is a companion off the clock until the muster, the bridge after the last boat, or your word.
5. Chris stays out of every fight in Drent.
6. Chris can be asked back out of the camp until the border march begins.
7. Three people move: Odger, Nell, Silas.
8. Farming is the fourteenth skill; Enna teaches it; rows ripen on play-seconds.
9. Six foods through four skills and a pedlar; only the apple is farming's.
10. Five drills of 35 Ambroni, given by Chris, never a quiz.
11. Noticing is by named ground or 40 m, once each; one harbour bell per person landed.
12. Rena is spine; Applegarth, the ferry, the Sultana, the plot and the scouts' camp are branches.
13. Mittoli is not taught in Drent. The bridge is where it starts.
14. No new fight in Drent, no new person in Drent, no id renamed.

## 12. Five questions

1. **Should "first" be guaranteed?** Going straight there I estimate a brisk player musters at
   30–40 minutes. With Chris made your companion he arrives a step behind you, but Ed the Word is
   in at 29.4 on today's clock. One number fixes it: Ed sits on the shingle for twenty-five
   minutes instead of three (`departs` 180 → 1,500; he musters at 51, between the riders and
   Lakota). It would also put swimming's teacher on the beach through the whole of leg 1. Or is
   "first, unless the man who swam beats you" the joke you want?
2. **Can Chris die in Drent?** "Any fight, anywhere" is your rule; Drent is level 0 and he is the
   long road's interpreter. I have kept him out of the raid and the scouts' camp. When the company
   design lands, does he fight there, and if he falls at minute 7 is the long road simply walked
   without him?
3. **Does the Marshal march short-handed?** A first arrival can be back from Solis before the last
   boat has landed. Today the battle line is whoever has mustered plus soldiers. Keep that, or
   should the march to the border wait for the ten, as it waits for you?
4. **Who holds archaeology once Lakota is a mercenary**, and may its first lesson be given at Rena
   itself? I would give it to Hesta Ardry at Applegarth, whose family's town it was, with Lorn in
   Tidehaven sending you to her — but it is another branch's decision and I have not made it.
5. **May Silas leave the Weatherhead?** He is the one move that bends written lore — the marl
   bank is his. I moved the man and kept the pit. Say no and geology stays the harbour's last
   lesson, and the Toll House stream keeps only the Pedlar's Stone for company.

## The user's answers (2026-09-20)

Asked the five questions above; these are the rulings, and they bind the build.

1. **First is guaranteed.** Ed the Word lingers on the beach about twenty-five minutes before he
   takes the road (`departs` 180 -> 1500), so a traveler who goes straight to the muster is always
   the first of the eleven in. It also keeps swimming's natural teacher at Tidehaven through the
   long road's first leg.
2. **Chris can die in Drent. "The rule is the rule, but there are nine other mercenaries along
   the way."** A companion can die in any fight, anywhere, and that includes the interpreter in the
   raid on the Greenway at minute ten. The long road must survive him: the interpreter is a role,
   not a man. Every member of the company has the tongues he or she has; whoever walks with the
   traveler gives the aside for the tongues they know, and the boats keep landing - Ed the Word at
   six minutes, the riders at eighteen, Lakota at thirty-three. Build the company's languages as a
   table per mercenary, and let the aside come from whichever companion present knows the speaker's
   tongue best. If Chris is dead the Ambroni drills pass to whoever else has Ambroni.
3. **The march is the traveler's choice at the camp.** An early arrival is asked: march now,
   short-handed, with the army's soldiers filling the line - or wait for the company. The first
   command decision the game gives.
4. **Archaeology's first lesson may be given at Rena by Hesta Ardry**, with Lorn sending you to
   her - the standing rule is that any specialist of a skill may introduce it. Lakota still can,
   once you know him.
5. **Silas moves to the Toll House stream.** The Weatherhead - the low head south of Tidehaven's
   landing, a name that was the coordinator's reading rather than the user's word - keeps Cabe
   Tolliver and his pipe, and the marl pit at its foot stays in the world as a place Silas sends
   you back to for the coastal stones.

## Amendments from the ground probe (2026-09-20)

The bug hunter measured this design against the built world before anyone built it
(`docs/drent-long-road-probe.md` on its branch). What changes:

- **Odger Pell stands on the bench side of Fernway Rest, at (-128.4, 39.6), not beside the cairn.**
  The cairn is 4.3 m from the centre of the pileated woodpecker's home ground (radius 8), so
  anywhere beside it breaks the standing rule that nobody is placed on a bird's ground; the
  designed spot was also 2.8 m from the road's centreline, inside the 4.6 m the company walks in.
  The new spot is 7.4 m from the cairn, 5.5 m from the road, 2.3 m clear of the bird. His present
  stand is set in `src/main.js`, not `src/mycology.js`. Fernway Rest needs a kept-clear disc.
- **Nell and Silas stand exactly where designed.** Silas's marl cart fits on one side of the Toll
  House only; it should be the side facing the road, since the house hides him from a traveler
  coming from Tidehaven.
- **The clock.** The tenth mercenary musters at 5,234.5 s (pin that, not 5,233). With Ed the
  Word's `departs` at 1,500 he leaves at 31:00 and musters at 51.4 min, so the timeline row that
  had him as "the first of them you see go by" at the Watch is wrong: the first anybody sees are
  the three riders, at minute 19.6, passing within 2-8 m of Jojo and Lysa. Ed passes Willowmere at
  32.2, three minutes ahead of Lakota.
- **The five arrivals are announced, not left to be noticed.** Two of the five landings cannot be
  seen from where the player is (the fourth is about twelve pixels tall; the fifth, from Rena, is
  430 m away against a 180 m draw range), and the bell is silent until the player has clicked
  Sound. What reaches every player is the companion's remark as a mercenary passes within 40 m,
  which fires on every leg. So each landing gets a caption in the journal's voice and a line from
  whoever is walking with you; sight and the bell are a bonus.
- **The hedge is authored.** Hazel and bramble have no habitat rule; place stands at the Sunken
  Lane by hand, as the jimson weeds are. There is ground for it (77% of cells take a gatherable),
  and Applegarth's orchard and the wild trees by the Avrel clearing give the apple real trees.
- **"First is guaranteed" is broken by Mus, not by Ed.** His `route: 'wild'` is read by nothing,
  so today he walks the main road and at his earliest draw musters at minute 19.8; he is already
  in for a direct traveler in roughly a quarter of games.

  **Built 2026-09-21** (`src/wild-route.js`, `tests/wild-route.test.js`). A strand of his own
  round the headland south of the harbour at (10, -60), then west through the low country behind
  Drent, up round the head of the bay, and down onto the Moros plain from the north-west across
  open ground. **1,598 m of authored line, 1,714 m with the muster leg, against the road's 1,295,
  walked at 0.88 m/s against his road pace of 1.42**, so he musters between minute **32.7 and
  96.7** where before it was 19.8 at the earliest. The line was authored against the built world,
  not drawn on a map, and the authored part never comes within **62.7 m** of the main road — so
  the companion's 40 m remark can never fire on him. The muster leg closes to 39.7 m at the end,
  where everybody is noticed anyway. His draw is untouched. The nine road men keep the 5,234.5 s pin;
  he is pinned as a range, and on some seeds he is the last man in.

  **Ruled by the user, 2026-09-20: his wild route is long, and he cannot beat the road.** Mus keeps
  his whole draw, thirty seconds before the traveler included: he may well be ashore first. But he
  goes by the wilderness, and the wilderness is honestly longer than the road, so a traveler who
  walks straight to the muster is always in before him. What the builder owes:
  - `route: 'wild'` is read. Mus gets an authored path from his own beach that keeps off the main
    road the whole way (nobody on the road ever sees him pass) and joins the plain from the country
    side, not by the gate the others use.
  - The law, as a test: for every seed, Mus's muster time is later than a direct traveler's. Write
    it against the measured direct walk (the probe has a traveler in at about minute 27) with a
    margin, and sweep the draw's two ends and a few hundred seeds. If the path as authored cannot
    hold the law at his earliest draw, lengthen the path or slow his pace through the rough; do
    not clip his draw.
  - He can be *found*. A traveler who leaves the road in the right country may come on him in the
    woods, and that meeting is how he is recruited before the muster. He does not explain the
    route. His arriving line stays: "I have been here a while" is now a thing he says about the
    country, not the camp.
  - The clock pin (5,234.5 s for the tenth in) will move if Mus becomes the last in on some seeds.
    Pin the ten who use the road, and pin Mus separately as a range.
