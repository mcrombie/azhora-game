# Design answers

Decisions the user has made in conversation, written down so that whoever builds next does not
have to ask again. Newest first. Where an answer supersedes the spoken brief
(`docs/original-brief.md`) or an earlier note, the answer here wins.

## 2026-09-21 — names, and go-aheads

**Names, in the user's spelling: Cromb the Barbarian (never "Crom"), and Kristen (never
"Christin" or "Christian").** Ids keep their old spelling (`merc-christin`); what is on screen
and in the docs does not.

**The combat design is approved to build** (`docs/combat-brief.md`), and the user may tweak it:
keep its numbers in one table.

**The eleven character profiles are good for now**; the user may tweak them later. Nobody needs to
ask again.

**Chris Gotwood may stand dead-centre in the sail-in shot.**

**The long road is being built**, by its own builder, from `docs/drent-long-road-build.md`.

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

**Anyone can be the player.** Eleven playable characters, Cromb first, then Chris Gotwood, Ed the
Word, and on through the company; the ten not chosen are the NPC roster. Starting skills differ
by character (Lakota's birding, Chris's Ambroni). The full character profiles are still to be
written by the user.

**The company share a working tongue: the language of the contract.** All eleven were hired
abroad on the same contract and sailed or rode here together, so every mercenary is readable from
the first minute, whoever the player is; it is the locals the traveler cannot follow. Their
origins and home tongues stay as data — that is who they are, and the toggle may still show it —
but they no longer hide what the company say to each other. Chris Gotwood is not special here any
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
scatter still asks whose hex it is (`regionNameAt`), so the built world is byte-identical, and
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

**The first person you speak to is Mara, the harbourmaster**, at the head of the pier. She gives
the letter of introduction and a rough chart, and giving directions is the first cartography
lesson. Chris Gotwood lands with you and gives the soldierly advice.

**Languages.** Nobody in Azhora speaks the traveler's language and the traveler starts knowing
none of theirs. Chris Gotwood interprets while he is with you and you learn faster beside him;
every new land is a new tongue to climb. Writing too: signs are in the local tongue until learned.
A toggle shows any line in the local tongue. The player never has to learn a word.

**The first conversation of the game is how the interpreter is taught.** The man off your boat —
Chris Gotwood, or Cromb when you are Chris — walks up the pier at your shoulder from the moment
you take control until the letter is in your satchel, so Mara is glossed while she gives it to
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
- Electron runs cost money; ask first.
