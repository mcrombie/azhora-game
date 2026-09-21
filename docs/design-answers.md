# Design answers

Decisions the user has made in conversation, written down so that whoever builds next does not
have to ask again. Newest first. Where an answer supersedes the spoken brief
(`docs/original-brief.md`) or an earlier note, the answer here wins.

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

**Eliana:** three takes drafted for the user to choose from; not yet decided.

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
