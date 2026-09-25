# Jean and the animals of Azhora

Jean stands beside the main road just beyond Glun in Tidewater Haven. She introduces Birding and Animal Husbandry independently. Her eccentric observations come from patient watching; her bird garden and hummingbird feeder remain at their existing spot inside the village. The stable `garden-keeper` ID preserves existing saves and feeder progress.

Birding rewards the first observation of each species, then 3 XP for another observation after 30 active seconds. At level 2, **Actions (U)** lets you imitate a familiar bird's call. Calls have an eight-second cooldown and can earn 2 XP per species every 30 seconds. Range and response duration improve with levels. **B** remains the observation key. These are ordinary field skills; Liz's Animal Sorcery and Summon Bees are a separate magical lesson.

Animal Husbandry is available at level 1. **F** beside living livestock checks and calms it, earning 10 XP once per animal every 30 active seconds. Improved handling keeps it calm longer. Jean has two approachable sheep for practice, and the same action supports other sheep, cattle and horses when exposed by the world. Teacher introductions do not award practice XP. Both practice cooldowns are saved and use paused game time, preventing rewards from repeated clicks or reopening a save.

Jean fills the hummingbird feeder herself. The older Lysa interaction remains valid when that character is present, so previously started errands still work after the teacher moves.

# Regional wildlife coverage

The previously empty regions now use the existing western animal models and simulation. Each has small, distinct groups rather than a uniform scatter:

| Region | New ambient life |
| --- | --- |
| West Suval | Inland sheep, downland hares, cliff gulls, circling hawk |
| Pueth | Birch-wood deer, valley hares, boar, hill hawk |
| Peblos | Island gulls, shore waders, gorse hares |
| West Izol | Headland sheep, shore gulls, hares |
| Elagos | Woodland deer, meadow cattle, lake-margin waders, hares, hawk |
| Amod | Terrace sheep, chestnut-wood deer, orchard boar, ridge hawk |

There are 24 new groups and 64 animals. The existing populations in other regions remain intact, and all 17 loaded regions now have ambient wildlife independently of combat encounters. Solis's abandoned Shepherds Fold stays empty as its story describes; the new sheep graze farther inland.

`src/regional-wildlife.js` authors the new habitats from atlas hexes. `src/west-regions-life.js` reuses shared geometry, instancing, terrain checks, pause handling and distance culling. Tests verify regional coverage, actual-world spawn counts and footing, visible transforms, livestock calming and culling. No new per-animal rendering loop or world timer is introduced.
