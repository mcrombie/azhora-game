# Design answers

Decisions the user has made in conversation, written down so that whoever builds next does not
have to ask again. Newest first. Where an answer supersedes the spoken brief
(`docs/original-brief.md`) or an earlier note, the answer here wins.

## 2026-09-25 — no unsolicited hats

**Characters are hatless by default.** Add a hat only when the user explicitly
requests one. An occupation, character role, or model preset must not imply
headwear. Preserve exceptions the user has explicitly requested.

**Martin has no hat.** His short black hair and glasses should remain visible.

## 2026-09-21 — the highwayman is a man (the user's answer, on Codex's Chapter 1 brief)

Michael asked Codex to write a Chapter 1 redesign brief, leave it in this codebase and hand it
to Claude for an implementation plan: `docs/chapter-1-redesign.md`, with its prompt in
`docs/chapter-1-claude-prompt.md`. The brief replaces the opening three-goblin raid with a
single highway robber farther out on the road, and replaces the Lauvel wolves with that
robber's gang. Codex drafted the robber as a woman, reading the spoken word that way.

**The user's ruling: make the highwayman male.** Both documents are corrected throughout, and
the correction is a requirement rather than a proposal. Nothing else about the encounter
changed: still exactly one hostile actor, still farther from the village than the raid it
replaces, still the first real fight, still the gang that turns up again in Luscia.

Nothing of the brief is built. The plan Codex's prompt asks for has not been written.

## 2026-09-21 — the file's worth, and a battle that grows (the user's answers, after the hunter's round six)

The hunter re-measured the border battle at level 2 on the repaired placement (the file used to
form up among the enemy): a traveler alone with the six men the army assigns him wins 21 of 40 at
half health, with every assigned man dead and **5 of 40 still going at the two-minute cap**; with
three, six or ten companions it is 40 of 40. Asked four things:

**The assigned men are trained a little.** An assigned soldier carries **level 15 / toughness
12** instead of the kind's plain ninety. Measured by the hunter: alone becomes 32 of 40 at 59 %
health, no stalemates, 5.9 of 6 assigned men still dead - so friends still matter, and an assigned
stranger stays strictly weaker than the weakest companion (Altun is 20 / 17). Not chosen: leaving
them plain; raising the floor from six to eight (29 of 40, no stalemates, a bigger army on your
side and "fewer than six companions" becoming a number about nothing).

**A full company meets a bigger battle.** Ten companions win the border battle 40 of 40 in
seconds, a parade. The user chose: **the enemy line grows with the size of the company** - more
soldiers, never a higher level - so that ten companions meet a fight worth ten and a full company
is still a climax. To be built and measured: the size of the line at each company size is the
hunter's number, not a guess, and a short company (the floor of six, filled) must meet exactly
the battle measured above. Not chosen: the walkover as its own reward; parking it.

**The arrow cap stays at forty.** Forty spent shafts may lie on the ground at once; in a long
standoff the rest are dropped silently. A few dozen to walk over after a fight is plenty, and the
cap keeps the world tidy. Not chosen: raising it to about 120.

**No paid Electron run today** to drive a companion's death through a real save. The module
tests cover the lifecycle; the real-save check waits for the next milestone batch.

## 2026-09-21 — what an arrow meets (the user's answers, after the hunter's round on bows)

**Arrows hurt whoever they hit.** Real friendly fire, the traveler's and Jerry's alike. Offered and
not taken: passing through friends, and friends blocking a shaft unharmed. What follows from it,
decided by the coordinator: an arrow is stopped by the first body in its path as it is by the
first tree; a friend it strikes is hurt by it, and a companion killed by it is dead for good, his
death recorded as every death is (where, and what: the traveler's arrow), so the truth the
Marshal is given is that truth. An ally who shoots does not loose while a friend stands in his
line. The man struck remembers it; a companion killed by the traveler's arrow costs every living
witness a rung, as a lie does.

**Enemies come after an archer.** Shot from where they cannot reach, enemies leave their own
ground and chase the traveler anywhere inside the fight's outer limit; past that limit it is a
retreat, as it already is. A bow buys a few free shots, not a free battle.

**Mallec charges.** If his target stays out of reach for a few seconds the ogre makes a short,
fast charge with a clear tell that can be stepped out of. It keeps him a timing fight, and it is
the rule for other big slow creatures later.

**A second gift: a fine steel cap** when the traveler's side pays him after the day-after fight,
from whoever already pays him in that scene.

Decided by the coordinator alongside: pausing or losing focus at full draw lowers the bow and
keeps the arrow; a blow that eats a draw says so; an arrow is stopped by ground that rises above
its flight.

## 2026-09-21 — seven open questions, settled (the user's answers)

**Smiths are named for the smiths of myth.** The user's words: "Name them things like Vulcan and
other mythical terms for smiths." This is a naming register of the user's own, and it covers every
smith and armourer in the game. As assigned and approved: the Tidehaven village smith is **Vulcan**;
the army armourer at the Moros camp is **Wayland**; the new armourer in Ambron City is
**Hephaestus**; and Mern in Ostel is renamed **Goibniu**, so that every smith follows the rule.
Later smiths draw from the same well: Ilmarinen, Brokkr and Sindri (brothers), Tubal-cain, Svarog,
Kothar.

**The capital sells better gear, and your army rewards it.** Wrought iron and steel are sold by
Ambron City's armourer even though Elagos is an easy country: a capital is the exception to "a
smith sells what his country's level allows". Fine steel is not sold there; the side the traveler
signed with gives it as a reward for service, beginning after the border battle. The rule for
every other smith is unchanged.

**Tiers 5 and 6: the user will name them.** Avite bronze was offered for tier 5 and not taken.
Both stay unnamed and empty until the user gives the names.

**Jerry teaches by shooting at a mark.** He cannot spar - two archers at three paces is not a
lesson - so he sets up a straw target and the traveler shoots at it from a distance. It pays Bows
up to his ceiling, as sparring pays the other weapons.

**The border river of Isareos is the Isa.** The atlas draws one river there and the lore names one;
they are the same. Isamouth stands where the Isa joins the Lizeem at Isareos's south-east corner.

**Eer's two channels are the North Channel and the South Channel**, plain descriptive names, which
is how the lore says Eer names things.

**The Toll House is Drent's tenth named ground**, charted like the other nine, so Silas Garrow's
spot by the stream is on the map and counts toward charting Drent.

## 2026-09-21 — the army fills your file (the user's answer)

With the hold lifted the hunter measured the border battle at level 2 for a traveler alone and
with three companions, across every kit a smith sells and every level the game can give: nought
wins in forty in every row, the absolute ceiling included, because eight soldiers land a blow
every 0.3 s and a dodge is affordable every 1.9 s. Numbers on your side decide that fight, not
gear. Asked what should happen to a traveler who arrives with too few companions, the user chose:
**the army fills your file.** It is the army's battle; if fewer than about six stand with the
traveler, his commander assigns ordinary soldiers to make up the number. They are weaker than
companions, so friends still matter, and nobody meets a wall on the main arc. The number is to be
measured, not guessed. The same holds for the day-after fights, and for whichever side the
traveler signed with. Not chosen: a general rule that only a few enemies press the traveler at
once; easing the battle for a short company; leaving it and telling the player to recruit.

## 2026-09-21 — bows, the border battle, and the Nethermere (the user's answers)

**The first bow is Jerry's spare.** When Jerry comes to like the traveler he gives him his spare
bow with his first lesson: a named, given weapon, and the thing that shows the traveler the bow
at all. Nobody else hands one out. **The smiths sell arrows** - the Tidehaven smith, Mern in Ostel
and the camp armourer add them to their boards; there is no fletcher. Decided by the coordinator
around those two: with a bow in hand the swing button is held to draw and released to loose (no
new key); an arrow is a thing that travels and the first solid thing stops it; about two in
three can be picked up again; Jerry shoots as an ally; no enemy archers yet; fights only, with
the door left open for hunting.

**The border battle's hold is lifted to level 2.** The hunter measured it over forty seeds a row:
at level 0 a company wins it alone (ten companions, forty of forty, fifteen seconds, the
traveler standing still); at level 2 with six companions it is thirty-six of forty, about two
companions dead, and nought of forty if the traveler never swings. Seven companions come for the
asking, so that is what a player arrives with. If a full company of ten is to stay a climax, the
lever is the size of the battle, not the level - not asked for yet.

**The Nethermere is a spring flood over meadow, not a lake.** The atlas has `lake` and `wetland`
and uses neither in Nethereum, and the atlas wins. The lore is rewritten so that the Nethermere
is a shallow sheet of water that spreads over the basin's grass each spring and is gone by
midsummer. It keeps the Nethrani, the Flood Council, the Flood Recall and the cattle, and loses
the fishery, the reed-grain and the reed goods. Nethereum may now be built. Still open: whether
the one river the atlas draws in Isareos takes the lore's name, the Isa.

## 2026-09-21 — the company rides when you ride

The user, from the Nothom stable yard with Chris standing beside the horse: **"My companion
should also get a horse."** The rule as briefed to the builder: when the traveler rides, everyone
walking with him rides. The company has horses from the moment he owns one; their mounts are a
function of his riding state and of who walks with him, so nothing new is saved; stepped down,
their horses are picketed beside his and come when his is whistled; nobody fights from the
saddle, so whatever brings him down brings them down. Each horse has its own natural coat and
none is named.

## 2026-09-21 — normal mode, and a tentative hard mode

**The game we build and test is "normal", and it is all in English.** The user is switching off
the linguist skill and all its translations in the game as played: speech and signs are in
English, and nothing teaches or pays a tongue. The code is kept, reserved for an **optional,
tentative hard mode** that a player could set instead of the default. What else hard mode holds
is to be worked out over time; for now the one thing known is that **hard mode has the linguist
skill in it**. Keep developing normal mode, and do not build out or test hard mode
(`docs/hard-mode.md`).

## 2026-09-21 — the atlas is the authority

**"Favor the atlas over what the lore says. Adjust what the lore says to fit the atlas."** Where
the World Builder atlas (hex ownership, per-hex climate, rivers, coasts) and the written lore
disagree, the game is built from the atlas, and the lore file is rewritten to fit it — minimally,
in its own voice, changing only what the atlas contradicts. It came up over the six new countries
(`docs/six-regions-brief.md`): Isareos is landlocked, as the atlas draws it, not the sea coast the
lore described; Ovesos is hot steppe, not cold apple country; the Oves Desert lies where the map
puts it. What was changed in the lore, claim by claim, is in `docs/lore-adjusted-to-atlas.md`. The
lore lives in the user's World Builder repository and is edited there in place and left
uncommitted for them to review; nothing is ever committed there on their behalf.

## 2026-09-21 — companions (the user's answers to `docs/companions.md`)

**As many as will come.** There is no limit on how many of the ten walk with the traveler: you
may arrive at the muster with most of the company behind you. (The builder had proposed one on
the road and two after; the user chose the generous end.) What follows from it: they walk in a
file behind you and close up to single file on narrow ground; one of them speaks for an event,
not all of them; they are allies in every fight, which is the design's own answer to hard
country — and the price is that each of them can die there, and stays dead.

**Kristen comes if you know the road.** Her condition stands: she will not leave Jerry and
Ciarán unless you have charted it. It is the one recruitment that has to be earned, and it makes
cartography matter to the story.

**When the company musters short, the Marshal asks you what happened.** A short conversation,
once for each who is missing, and what you say is remembered — by him and by the company. A lie
is possible, and those who were walking with you when it happened know it for one.

**A dead companion's weapon lies where they fell, and you can take it.** It stays on the ground
there, marked, until it is picked up, and it is a named weapon — "Eliana's greatsword" — which is
what the combat brief says a given weapon should be.

## 2026-09-21 — the country's wall (coordinator's hold, the user's to lift)

The bug hunter measured combat phase 2 against the main arc (`docs/known-issues.md`): fair through
Luscia, not at level 2, because the traveler grows in a straight line while the country
multiplies. The design's own arithmetic (`docs/combat-brief.md`) closes that gap with gear and
with company, and neither exists yet. So, **until smiths, armour and companions are in, the
story's set-piece battles with armies in them — the border battle and the day after — are
authored at level 0, as they were tuned.** Everything else takes its country's level, Mallec
included: he is a toll before he is a fight. This is a hold, not a retune: no number in the
`ARMS` table or the ladder has changed, and it is one constant to lift.

## 2026-09-21 — names, and go-aheads

**Names, in the user's spelling: Cromb the Barbarian (never "Crom"), and Kristen (never
"Christin" or "Christian").** Ids keep their old spelling (`merc-christin`); what is on screen
and in the docs does not.

**The combat design is approved to build** (`docs/combat-brief.md`), and the user may tweak it:
keep its numbers in one table.

**The eleven character profiles are good for now**; the user may tweak them later. Nobody needs to
ask again.

**Chris Scotwood may stand dead-centre in the sail-in shot.**

**The long road is being built**, by its own builder, from `docs/drent-long-road-build.md`.

## 2026-09-21 — the long road through Drent, as built

**The five questions of `docs/drent-long-road.md` are answered and built.** First is guaranteed
(Ed the Word waits out twenty-five minutes on the shingle); Chris can die in Drent and the
interpreter is a role rather than a man; the march is the traveler's choice at the camp; Hesta
Ardry may give archaeology's first lesson at Rena; and Silas Garrow moves to the Toll House
stream while the marl pit under the Weatherhead stays his. The rulings are written out in full in
`docs/drent-long-road.md` under *The user's answers*.

**Jojo's three corners is a lesson, and it is keyed to ground walked.** The design's leg 1 has her
ask for the pier, the Weatherhead and the Koopwood charted. The chart cannot *name* the last two —
neither is a landmark or a named ground — so the errand is keyed to the fog's own answer at each
of the three points, which is what walking to a corner means. She countersigns on the return, once,
for a block of cartography. (Coordinator's ruling, 2026-09-21: it was in the approved design and
its absence from the build brief was an omission rather than a decision.)

**Two things the ground refused, and what was built instead.** Odger Pell stands at the bench side
of Fernway Rest, not beside the cairn, because the cairn is inside the pileated woodpecker's home
ground and inside the band the company walks in. Silas Garrow stands at the crossing stones a
metre off the stream, not at the Toll House's own centre, because the toll house is a stone box
with walls and a teacher needs five clear metres to be talked to in.

**Open for the user, and since answered:** whether the Toll House stream becomes a tenth named
ground on the chart. It was the one long-road stop the chart had no name for. **Answered yes**
on 2026-09-21 (the top section) and built: `the-toll-house`, Drent's tenth, small because the
Caloss Bank's reach comes within twenty metres of the stream crossing.

## 2026-09-21 — fighting, and the day

**Combat skills are divided by weapon: you get good at what you carry.** Blades, Heavy arms,
Polearms, Staves, Bows, Shield, and a shared Toughness, all on the 99-level table. Each of the ten
mercenaries carries a different weapon, so each is the teacher of theirs: the company is the
faculty. (`docs/combat-brief.md`)

**Levels widen the margins and never replace timing.** More damage, health, wind and a more
forgiving dodge; a level-1 traveler with perfect timing can still kill a level-8 monster, slowly,
and one mistake ends it. Hard country is dangerous, not locked. Tells never scale.

**Gear is bought, found and given — for now.** No crafting yet, but the user means to add a skill
for it later and sees nothing wrong with a long skill list, since not every skill is necessary.
So gear is designed in material tiers that a later Smithing skill can make (geology already finds
ironstone). The real cost of a new skill is filling 99 levels of it, not the length of the list.

**A full day and night is 48 real minutes**, about 32 of daylight and 16 of night, and the
traveler lands at first light. On that clock Lakota lands a minute after nightfall and Eliana at
first light on day two. (`docs/day-night-brief.md`)

**Mus's wild route is long, and he cannot beat the road.** He keeps his whole draw, thirty seconds
before the traveler included, but his route is read at last, keeps off the main road, and is
honestly longer: a traveler who walks straight to the muster is always in first. He can be found
in the woods. (2026-09-20; the detail is in `docs/drent-long-road.md`.)

## 2026-09-20 — foundations

**How the traveler gets stronger: all three at once.** Combat skills that level by use on the
same 99-level table as every other skill; gear that improves (better weapons, and armour, which
does not exist yet); *and* the company you keep — companions, allies, a side's soldiers — so that
hard country is survived by who walks with you as much as by what you have become. A fusion, not
a choice. (A design brief for combat skills and gear is owed before anyone builds it.)

**Magic: late, from the sage.** Magic exists and is witnessed from the first hour — Al the Tun,
Ed the Chameleon, Puck, the dragon in the box — but the traveler cannot do any until the sage
teaches it after the arcs converge in the South Oremindi. It is the reward for reaching the real
story and the tool for the level 8+ country. Al the Tun's sorcery is something you watch.

**Death: any fight, anywhere.** A companion can die in any fight — wolves on a night road as
surely as the border battle — and stays dead unless the player reloads. Deaths change the plot
but not the main arc's direction.

**Day and night: a real cycle that changes the world.** Night is more dangerous off the road
(Luscia's wolves hunt in packs at night), some birds and animals are nocturnal, villagers go
indoors, Batman is a creature of dusk, camps and inns matter. (A design brief is owed before
anyone builds it.)

## 2026-09-20 — the company of eleven

**The default hero is Cromb the Barbarian** — spelled with a *b* — **and he is a blank slate on
purpose.** He has no written past; the player's choices are his character. The other ten have
arcs; he has yours.

**Ed the Word's old crew are the rebels at Peblos.** The brief hides a rebel ship in a Peblos sea
cave, preparing to attack the Ambroni fleet there. That ship is Ed's, under the mutineers who put
him over the side at Tidehaven. His arc and the Peblos faction quest are one story, and whichever
side the traveler takes at Peblos is also a verdict on Ed.

**Mus is the sage's eyes.** He is watching the eleven for the one worth recruiting against
Thalmagar. If he travels with you, the sage in the Oremindi already knows your name; Mus is how
the late story reaches back into chapter one. He never says so.

**Eliana is a splice: the surveyor with someone else's name** (2026-09-21; the Surveyor and the
Daughter, the Creditor dropped). Born in Ambron to a marshal of the old emperor, sent abroad at
twelve "for her education" the year her father fell. She has come home the only way nobody checks,
on a mercenary's papers under her mother's name. What the education made of her is a scholar of
old stone, from a Pyrosi academy that stopped paying when Pyros started falling: she measures
ruins for a book nobody commissioned, the glasses are for inscriptions, she corrects people's
dates, and the greatsword is how a scholar crosses a war with her papers in order. She keeps two
secrets. Her name: she knows the Empire's forms of address too well and catches herself. And what
the stones say: every ruin she has surveyed is older than the empires, and they all face the same
way, north-west. She came home for that as much as for her father; the line the ruins draw runs
through the country she was sent away from. Her fixed line stands ("I would have come sooner, but
the boat I wanted was not the boat that was leaving"): the boat she wanted was going home. At the
fork her loyalties are the hardest in the company: the Republic's renegade prince was her
childhood friend, and the army is her father's life's work. On the road she takes archaeology
deeper than Lakota does.

**Anyone can be the player.** Eleven playable characters, Cromb first, then Chris Scotwood, Ed the
Word, and on through the company; the ten not chosen are the NPC roster. Starting skills differ
by character (Lakota's birding, Chris's Ambroni). The full character profiles are still to be
written by the user.

**The company share a working tongue: the language of the contract.** All eleven were hired
abroad on the same contract and sailed or rode here together, so every mercenary is readable from
the first minute, whoever the player is; it is the locals the traveler cannot follow. Their
origins and home tongues stay as data — that is who they are, and the toggle may still show it —
but they no longer hide what the company say to each other. Chris Scotwood is not special here any
more: he still interprets the *locals* while he is beside you, and when you are Chris nobody
needs to.

## 2026-09-20 — the world

**Ground outside every region outline is "open country".** Half of the walkable west lies outside
the outlines the atlas draws. `regionAt` stops snapping it to the nearest region: off every
outline it answers nothing (or an "open country" sentinel), and the region card, the minimap
caption, the autosave-on-enter, the map tutorial's first-province check and the chart all say so.
The ground itself does not change. (`docs/known-issues.md`, "Half of the walkable west…".)

**Open country has a shore fringe of 76 m.** *Coordinator's reading of the ruling above,
2026-09-21 — not a new answer from the user, and open to being overruled.* The ruling was about
the unowned west, which runs up to a kilometre past the outlines. It was not about a country's
own coast: the atlas is drawn in 100 m hexes and the world is built in metres, so Drent's beach
carries on east of the last hex Drent owns, and 1,055 standable cells of Tidehaven's own strand
— including the Weatherhead, where Cabe sits — were being called "Open country" in sight of the
pier. So `regionAt` gives an unowned point to the country beside it when it lies within 76 m of
that country's nearest hex centre, which is 26 m past a flat edge, about a quarter of a hex. 76
is measured, not chosen: the smallest whole metre that takes in every standable cell of Drent's
built coast (worst: the south-east strand at (25, 127), 75.86 m). It does not touch the west —
every pinned point there is still open country — and it moves the share of the walkable west
outside every outline from 53.1% to 50.4%. It changes only what the traveler is *told*: the
scatter still asks whose hex it is (`hexOwnerAt`), so the built world is byte-identical, and
`insideRegion` stays strict. (`docs/known-issues.md`, "Amended 2026-09-21: a shore fringe".)

**The Moros Horizon fence stays, as the army's line.** It stands where it is, 272 of its 344 m
inside Nesdor, as an Ambroni line inside a country the Empire does not hold. Only its name, its
minimap label and the build-status text change to say so. Nothing moves.

**The difficulty ladder** is `docs/difficulty-ladder.md`: every atlas region, 0–11. The level is
shown as *words* on the region card at first entry; the *number* appears only in the cartography
journal once the region is charted — discovering it is part of the cartography skill. The
level-11 hidden island is a **new island to be added to the atlas**, not the Cold Stones.

**The chart is dark.** Unknown country is near-black; known coastlines read as a lighter
silhouette with no interior and no label; explored ground shows the real atlas. At the start:
Tidehaven, the coast Feradom → Pueth → Drent, and the coastlines of Luscia, East Suval and West
Suval; only Drent is named.

**The first person you speak to is Jojo, the harbourmaster**, at the head of the pier. She gives
the letter of introduction and a rough chart, and giving directions is the first cartography
lesson. Chris Scotwood lands with you and gives the soldierly advice.

**Languages.** Nobody in Azhora speaks the traveler's language and the traveler starts knowing
none of theirs. Chris Scotwood interprets while he is with you and you learn faster beside him;
every new land is a new tongue to climb. Writing too: signs are in the local tongue until learned.
A toggle shows any line in the local tongue. The player never has to learn a word.

**The first conversation of the game is how the interpreter is taught.** The man off your boat —
Chris Scotwood, or Cromb when you are Chris — walks up the pier at your shoulder from the moment
you take control until the letter is in your satchel, so Jojo is glossed while she gives it to
you and you learn what an interpreter is for by being handed one. When the letter is taken he
says his piece and goes back to the roster, his hour at the landing starting from that moment
rather than from when the boat tied up. When you are Chris nobody walks up glossing her, because
you have the Ambroni yourself.

**Swimming is dangerous, and a skill.** Stamina drains in the water; at nothing you drown. The
swim to Peblos is possible early and deadly if misjudged.

**Quest markers come in three kinds**: gold for the main arc, a second for plotful side stories,
a third for skill quests — distinct in shape as well as colour.

**Skills** are all on the 99-level RuneScape table, shown as a grid of tiles (icon, name, level,
bar), with a guide and log behind each tile. Thirteen so far, combat skills to come.

## Working rules

- Several agents sharing this machine must never run the full `npm test` at once (it peaks near
  3 GB and the machine has 16): agents run the test files they touched; the coordinator runs the
  full suite once on `main` at merge time.
- Local Electron test and visual-review runs are authorized without a separate approval request
  (user correction, 23 September 2026). Use isolated test profiles to protect normal saves.

## Wildlife coverage (25 September 2026)

Wildlife should be present throughout explorable woods, including the stretches away from
roads and named places. A few populated landmarks do not satisfy this. Drent now uses
resident home ranges across the province, with birds and squirrels attached to real trees.
Verify coverage across the whole region as well as visibility, fleeing, revisiting and pause.

## Character additions and the three ports (25 September 2026)

Do not invent or add nonsoldier NPCs without an explicit user request. The user is
choosing individual characters deliberately; soldiers are the stated exception.
Remove the unsolicited Port Calos residents. Keep Port Calos to its single land hex
plus the harbor, deleting overflow buildings and moving its sign closer to town.

Jess serves Tidewater Haven; Maddie, a woman with long brown hair, serves Port Calos;
Howie, a woman, serves the Peblos port. Each stays based at her own harbor, offers passage
to either of the other two ports, and can introduce swimming. None has an unsolicited hat.

## Character homes and mailboxes (25 September 2026)

When the user assigns a character a specific house, give that home a mailbox labeled
with the character's name by default. Keep it beside the approach rather than across
the door, path or quest walking route. Liz's cottage now has a named mailbox, as Cagney's does.

## Winery, Wine lessons and closed East Suval (25 September 2026)

Paradise Springs (Vaervelm Caelazh) moves from West Suval into the single Luscian
land hex immediately southeast of Port Calos, with a lane from the town. Retain
the log cabin, hall, spring and eight grape varieties; do not duplicate the old site.
Its three winemakers are ROB, MAT and KAT. KAT keeps her original appearance. ROB
has cropped gray hair; MAT has cropped black hair and brown skin. Neither has a hat.
Do not add extra winery residents.

Wine is a separate skill, not a Farming subskill. KAT, MAT, Ben, Liz and Troy can
introduce Wine, alongside the existing Lakota and Juan routes. ROB's subject is
advanced viticulture, a Farming specialty. Its Farming level 5 prerequisite is
provisional and visibly explained; these advanced lessons are not playable yet.
Show an unavailable lesson as locked instead of granting a placeholder quest or XP.

Katy now stands in Port Calos. Her new quest is for later; do not offer the old
Batman search in her live dialogue. Keep legacy save data readable. Retire the
winery's former vine-keeper host rather than leaving a duplicate among the vines.

The Peblos harbor master is Hallie (renamed from Howie), with long straight blonde
hair. Keep her ferry routes, swimming lessons and saved identity. East Suval's
closed land borders need visible physical ridges and locked passes, including the
western and southern edges, so a player cannot simply walk around the road gate.
