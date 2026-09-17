# Review of the full brief (2026-09-17)

`docs/original-brief.md` is the user's complete spoken brief. The copy the game was started from was cut off where the sage appears in the South Oremindi Mountains. This note records what the missing part adds, where the built game differs from the brief, and which questions are open. Nothing here has been implemented: the user asked to be consulted first. Later instructions from the user supersede the brief.

## What the missing part adds

- **The sage takes over the story.** In the South Oremindi Mountains a sage sees the traveler's talent and persuades them to stop picking sides in the civil wars and help defeat Thalmagar. From there the story is one arc, whichever side was served.
- **The level scale runs to 11, not 5.** East, North and Lesser Oremindi 6; West Oremindi 7; Narcosh 6 (heard as "Mercos"/"Nirkaash"); Cudon 7; Cape Thalmagar 8; North Gorgi Mountains 10 with level 9 around it (the orcs' homeland, the least known country on the continent); North Scythe 10 and South Scythe 9 (replacing the first idea, Wahat), reached from the east across the great jungle island through levels 7 to 9; and a hidden island off the northern coast, level 11. `src/campaign-world.js` stops at 5 and holds these regions at provisional 4 to 5.
- **The arc.** Up the Oremindi by Narcosh or Cudon to the tower at Cape Thalmagar; the dark lord is beaten there but survives. Two arcs follow in either order, both required, each against a chief lieutenant and not Thalmagar himself: the North Gorgi Mountains and North Scythe. Then back to the castle at the cape, where a little-known island off the north coast is discovered: an emergency base far older than the cape's fortress. The final battle is there.
- **Working rules.** Fill regions the user has not described from the Azhora lore (climate, cultures, languages, flora and fauna); expect later prompts to detail regions and quests; build the main world and the main quest first.

## Where the built game differs from the brief

1. **The horse.** Brief: after the Luscia aftermath the traveler is given a horse and taught to ride, and rides across the Moros. Built: a token in Luscia, the horse claimed at the end of the Moros camp chapter, and no riding.
2. **The Coalition's offer.** Brief: they offer more money than the Empire pays. Built: the envoy offers scrip and land, and the chapter after the battle pays the Coalition's sellsword 25 copper and a promise against the Empire's 40.
3. **How the battle begins.** Brief: report back to the Legion on the Moros, the commander asks whether you are ready, the troops march and you go with them. Built: the fight begins where the commander stands.
4. **"The outpost."** Brief: a Coalition victory takes the Ambroni outpost or town on the Moros Plain, and places change hands on the map (Solis becomes Ambroni after an Empire victory). Built: the Coalition's victory chapter storms the small border stockade; nobody's garrison changes anywhere afterwards. The Legion camp is exactly at the plain's centre, as the brief asks.
5. **Goblins in Luscia.** Brief: no bramble goblins in Luscia, wolves are its danger; bramble goblins belong to Drent's one attack and to the south of Pueth. Built, on the user's later instruction: the goblin camp in north Luscia as a Lumber Town side quest.
6. **East Suval's border.** Brief: heavily guarded and hard to cross. Built: the road is open.

## The novella

The source file begins with *The War of Seven Sons* (`../world-builder/azhora_lore/history/war_of_seven_sons_novella.md`). If it is history for the game, it describes places the game is about to build: Solis with white cliffs, red-tiled terraces, old sea walls, harbour booms, the Court of Oaths, a temple guest house, and a landward north gate called the Gate of Sun Horses under two rearing bronze horses; Ambron with the Hall of Seven Victories, the census basilica, the Market of Measures and a river gate. It also resolves names: "Lamdris" is Imlamdris, "Hanma" is Hama. Its Ambron is a kingdom and its Solis a monarchy; the brief's Ambron is an empire and its renounced prince does not appear in the novella, so the game is presumably set later.

## Readings in use

"Elf ghost" is Elagos (the emperor sits at Ambron, the lake city in Elagos); "Emma" and "a mod" are Amod; "Pyros Plain" is the Moros Plain; "West/South Pyros" in the Moros paragraphs are West and South Suval (there is no South Pyros); "LOD"/"Elode" is Elod; "Ambrosian"/"Embrony" is Ambroni; the full table is `NAME_ALIASES`.
