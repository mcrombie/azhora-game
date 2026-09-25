# Caelom at the Luscian fork

Caelom is an optional roadside seer on the Luscian side of the Caloss Bridge. The fork sends travelers south toward Nothom and west toward Elagos; east returns across the bridge into Drent.

The western arm is a continuous carriage road across dry ground into Elagos, joining the Ossen farm road toward Ambron's eastern gate. The south road and main quest route remain intact. A single fingerpost points to Elagos and Nothom; the new road participates in navigation and the local map.

His name follows local Mittoli sounds, combining the existing `cael` root with the `-om` ending. He is an elderly, one-eyed man in a weathered robe, with a staff, gray hair, and an eye patch. His halting speech and distracted counting distinguish him from Mark's theatrical warnings in Tidewater Haven. Gestures and short narration make his meaning readable without making him suddenly fluent.

The player can ask about his visions of severe winters, monstrous invaders, his injured eye, or directions. The visions remain uncertain foreshadowing. The conversation awards nothing, advances no quest, sets no deadline, and makes no change to the season, calendar, faction allegiance, or future invasion. Chapter 3 remains a separate design discussion.

Validation: `tests/elagos-world.test.js` checks mounted traversal, terrain grades, both road destinations, and access to the prophet. `tests/luscia-prophet.test.js` covers his conversation. Native review views are `luscia-fork`, `luscia-prophet`, and `caloss-elagos-road`.
