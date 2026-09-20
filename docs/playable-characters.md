# Playable characters (2026-09-20)

Any of the eleven mercenaries can be the player. This note records what was built, and what each
of them still needs before their game is really theirs. **The character profiles are not written.**
What is here is the mechanism plus a placeholder table, and the table is meant to be replaced.

## What was built

- **`src/player-characters.js`** — `PLAYABLE`, the eleven in the user's order, Crom first. Each
  entry has a name, a title, a blurb, the roster id it maps to, a starting weapon, a starting
  satchel and starting skill experience. Nothing else in the game reads into this table; it is
  meant to be rewritten wholesale.
- **`companyFor(playerId)`** — pure. The roster with the one you chose lifted out of it and Crom
  put into the place he left, keeping his own look, arrival and lines. Ten on the road, plus you,
  is eleven, however it is cast. The letter of introduction stays with the *slot*, not the man,
  because it came off the boat and not out of anybody's history.
- **`CROM` in `src/mercenaries.js`** — Crom the Barbarian, of the cold country north of the
  Lotharn, in the traveler's own colours. He is deliberately not in `MERCENARY_ROSTER`: the world
  only ever places the ten you did not choose.
- **`src/characters.js`** — `createCharacter({ role: 'traveler', look })` now builds the player as
  that hired sword. Four things follow the *player* rather than the *body*, because they always
  were the traveler's alone: the satchel, the full weapon swap, the fishing grip, and the sword
  already in his hand. Crom passes no look and is built exactly as he always was.
- **`src/character-select.js` and `#opening-characters`** — eleven tiles above "Step ashore",
  arrow-key navigable, Crom selected, portraits painted in each character's own three model
  colours. Choosing one changes the model in the boat immediately.
- **The checkpoint** keeps `player`. A save written before anyone could choose has no field at
  all, and that game is restored as Crom.

## The starting table, as it stands

Experience, not levels, because three of these skills belong to other hands and one table is
about to grow underneath them.

| | Character | Starts with | Why |
|---|---|---|---|
| 1 | Crom the Barbarian | nothing | Came for the coin and brought a sword. Everything he learns, he learns on this road. |
| 2 | Chris Gotwood | `linguist` 200, `startingLanguages: { ambroni: 40 }` | He interprets for the company; he is `INTERPRETER` in `src/languages.js`. |
| 3 | Ed the Word | `swimming` 260 | He came ashore under his own power off a ship that never docked. |
| 4 | Jerry | `fishing` 140 | A man who settles things at thirty paces has waited out a lot of floats. |
| 5 | Christin | `cooking` 90 | The one who puts something hot in front of everybody afterwards. |
| 6 | Ciarán | `geology` 140 | Picks up what the road is made of and weighs it in his hand. |
| 7 | Lakota | `birding` 37224, `archaeology` 90, `wine` 50 | 37,224 is level 40 on the ninety-nine table. Birding is on a ten-level table today, so it reads as the top of it now and as 40 when that table grows. |
| 8 | Eliana | `woodcutting` 2411 | Level 15: white oak. |
| 9 | Matt, Prince of Zorkys | `construction` 1584 | Level 12: the roof. A man who has raised one over four hundred people. |
| 10 | Al the Tun | `mycology` 200 | You are looking at the robe. He will say what it is for when there is a reason to. |
| 11 | Mus | `cartography` 200 | He does not use roads, so he is drawing his own. |

`swimming`, `linguist` and `cartography` are not registered in `src/skills.js` yet. Until they
are, they are simply not learned — `createSkills` refuses an id it does not know, and
`tests/player-characters.test.js` reports which ones were skipped rather than asserting them away.

## Per character: the arc, the opening, and how the computer should play them

Their existing `lines`, `styleLines` and `says` in `src/mercenaries.js` are the spec for the last
column. Where a character is not chosen they walk the road as an NPC exactly as today, which is
already "behaving based on how their character acts"; what is listed under **diverge** is where
that is not yet enough.

### 1. Crom the Barbarian — the default
- **Opening:** today's. He lands, Chris hands him the letter, the harbourmaster's scene stands.
- **Arc:** the game as written. He is the blank the road writes on.
- **As an NPC:** he has lines and a style but no `says` block, so he uses the shared road lines.
  He needs his own — he would not say "no time to stand about", he would say almost nothing.
- **Owed:** his closing line on the landing when the player is Chris. `chrisOnTheLanding` names
  whoever is standing there, but the four lines before it are Chris's voice and Chris's errand.
  Crom handing over a letter he was given on a boat should be three blunt sentences, not five.

### 2. Chris Gotwood — the one who can ask directions
- **Opening:** the standard landing, with Crom beside him carrying the papers. Built.
- **Arc:** he already knows Ambroni, so the language barrier that shapes everyone else's first
  hours is not his. His arc should be the opposite problem: he is the one everybody asks, and the
  company leans on him. Consider a running cost — interpreting for ten people is a job.
- **Diverge:** when he is an NPC he interprets for you (`INTERPRETER`, `src/languages.js`). When
  he *is* you, nobody interprets, and the interpreter bonus should pass to whoever is nearest.

### 3. Ed the Word — came ashore under his own power
- **Opening: not built, and it is the one that most needs building.** He canonically swims ashore
  at 360 s from a pirate ship that never docks. As the player he currently lands off the boat like
  everyone else, which is a lie about him. His opening should start in the water, off a ship
  standing out to sea, with the swim itself as the first thing the player does (`swimming`).
- **Arc:** the ship. Somebody put him off it, or he left it; either way it is behind him and it
  should come back. He is the only one of the eleven with a reason to avoid a port.
- **Diverge:** his `route` is `'shore'` and he `swims`. That is already modelled for the NPC.

### 4. Jerry — thirty paces and no nearer
- **Opening:** standard. He rode in with Christin and Ciarán, so as the player he should arrive
  with the two of them still arguing at him — the group is already in the data (`MERCENARY_GROUPS`).
- **Arc:** he thinks the company should split up and he is always wrong about it. Give him the
  chance to be right once.
- **Owed:** the bow. `KIT_HELD` has no bow, so a Jerry who is the player carries a sword. Until
  ranged combat exists, that is a hole in the middle of his character.

### 5. Christin — the one who feeds the company
- **Opening:** standard, arriving with the riders.
- **Arc:** she keeps people alive in two ways and one of them is dinner. Cooking should be more
  than a side skill in her game.
- **Owed:** sword and shield. `sword-shield` maps to a plain sword in the player's hand, so her
  whole style — take the first blow on the boards, answer over the rim — is not playable yet.

### 6. Ciarán — reads the ground he stands on
- **Opening:** standard, arriving with the riders.
- **Arc:** "together is warmer and alone is quicker, and I have not yet met the argument that
  settles it." His arc is that argument, settled.
- **Owed:** the spear. Not a held weapon, so he carries a sword as the player.

### 7. Lakota — the birder of the company
- **Opening:** standard, but he arrives at 1980 s, not 0. As the player he lands at the start like
  everyone else, which changes what he is: the man who was late because there was a bird on the
  mast for two days. Either his opening keeps him late (and the game begins with the company
  already ahead of him), or the lateness moves into the first hour some other way.
- **Arc:** he is Tidehaven's birder and the teacher of birding, archaeology, wine and cooking.
  **If he is the player, the teacher is gone.** Another agent is making him the seventh arrival
  and giving the bird garden to a new villager, Perrin; when Lakota is the player, Perrin has to
  carry all of it, and the skills Lakota already has should not be re-teachable to him.
- **Owed:** the quarterstaff. Not a held weapon.

### 8. Eliana — two hands and one edge
- **Opening:** standard; she comes alone at 2880 s, so the same lateness question as Lakota.
- **Arc:** "I would have come sooner, but the boat I wanted was not the boat that was leaving."
  Something she was trying to reach. The greatsword is already playable, so she is the most
  finished of the non-Crom characters after Chris.

### 9. Matt, Prince of Zorkys — a hall, a valley and four hundred people
- **Opening:** standard; he arrives with Al at 3780 s.
- **Arc:** he is a prince with people expecting him back, in a war that is about whether princes
  should exist. The campaign (`src/campaign.js`) has a renounced Ambroni prince in the Coalition;
  Matt should have to answer the same question, and his answer should be his.
- **Owed:** the pike. Not a held weapon.

### 10. Al the Tun — you are looking at the robe
- **Opening:** standard, arriving with Matt.
- **Arc:** the robe, and what it is for. That is a whole quest and nobody has written it.
- **Owed:** nothing mechanical — the mace is playable.

### 11. Mus — does not use the road
- **Opening: not built.** He beaches a small boat on a shingle strand round the headland at an
  hour drawn from the seed, and walks to the muster through the woods. As the player he lands on
  the pier with everybody else, which is precisely what he does not do. His opening should start
  on that strand, off the road, with no landing scene and no letter — and the letter has to reach
  him another way, or Tidehaven has to be reached from the wrong direction to get it.
- **Arc:** a man who will not say where he is from and will not use a road. The map is his: he
  starts with cartography, and the fogged chart (`src/map-fog.js`) should behave differently for
  him.
- **Diverge:** his `route` is `'wild'` and his arrival is `drawn`. When he is the player, the seed
  still has to draw something — for Crom, standing in his slot, arrival 0 is used instead, which
  means the randomness quietly leaves the game. Decide whether that is right.

## Known holes

1. **Weapons.** Six of the eleven fight with something the player's hands cannot hold: bow,
   spear, two spears, pike, quarterstaff, sword-and-shield. `KIT_HELD` in `src/characters.js`
   models them for NPCs only. Until those exist in `src/weapons.js` and the combat rhythm, those
   six play as swordsmen in somebody else's clothes.
2. **Openings.** Ed's swim and Mus's beach are written down above and not built, on purpose. The
   standard landing is used for all eleven.
3. **Lateness.** Five of them canonically arrive hours after the traveler. As the player they all
   land at zero.
4. **Skills without their modules.** Starting experience is given straight to `src/skills.js`.
   Birding, archaeology, wine, cooking, fishing, mycology and geology each have a *second* module
   holding what was found (`src/birding.js` and the rest). Lakota begins at birding 10 with an
   empty list of birds seen. Either the profiles should say which finds he already has, or the
   skill sheet should say "before the road" against the experience he brought with him.
5. **Teachers.** Several of the eleven teach a skill the player learns. When the player is that
   character, the teacher is missing from the world. Lakota is the worst case; Chris is the next.
