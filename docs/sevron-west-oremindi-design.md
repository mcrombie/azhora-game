# Sevron and the West Oremindi Mountains design

1 October 2026 design; implementation authorized 2 October 2026 after the Baldro build. **The first playable environment and Sevron exploration pass are now implemented; see the build record below.** This plan covers the whole West Oremindi wilderness and the hidden elven kingdom within a drowned dwarven capital. It also establishes the historical connection to the [Dwarfland design](dwarfland-design-draft.md). The design decisions below remain the source for the first playable pass; unresolved political and historical details remain open.

Use the atlas spelling **West Oremindi Mountains** and the existing spelling **Sevron** as working names for the user's spoken variations. Sevron names the later elven settlement. The ancient dwarven capital had a different name; its name and language remain deliberately undecided.

## Night Elves: confirmed November 1, 2026

Sevron's inhabitants are **Night Elves**: living elves with pale skin and red eyes who shun sunlight, live underground, and venture onto the surface only at night. The **wood elves**, also called **Day Elves**, are a distinct people. Night Elves are not the undead Dark Elves who serve Thalmagar; their appearance and nocturnal life do not imply necromancy or allegiance to him.

The existing history of the drowned dwarf capital and the later hidden settlement remains. Light wells still sustain plants, but Night Elves work the exposed beds at night and use covered walks during the day. This supersedes earlier descriptions of residents working in sunlight. No sunlight damage rule, new religion, ruler, origin story, language, or diplomatic relationship is established by this change.

The playable first pass gives all four residents the Night Elf appearance, updates their dialogue and discovered map label, and shelters the terrace tender beneath a stone arcade. All current residents remain inside the underground city; surface foraging and patrol schedules are not implemented. Wood Elf ranger appearances remain unchanged and are identified as Day Elves in their culture data. Shared definitions live in `src/content/characters/elven-cultures.js`.

## Confirmed history and present premise

The greatest ancient dwarf kingdom was centered here, with its capital inside the mountains. Centuries ago, human armies besieged the capital for years, killed the dwarf king and destroyed the kingdom. They brought the sea into the mountain and drowned the city's population. Dwarves were driven from the Oremindi, especially the western range. Dwarves elsewhere survived; the destruction of this city's population does not mean the extinction of all dwarves.

Centuries later, elves built a new settlement within the old city. That settlement became Sevron, a powerful but small hidden elven kingdom. It has remained concealed for centuries, and outsiders cannot generally confirm whether it exists. Dwarven architecture, hidden rooms and buried treasures survive underneath and around the elven occupation.

The surviving dwarf realms in West and East Baldro remember the lost Oremindi kingdom as their ancient golden age. The humans responsible, the dead king's name, the date of the siege, the means of breaking the city's defenses and the elven founders remain unnamed. This is an ancient catastrophe, separate from Wilhelm's recent destruction of Suval. Do not assign it to the current Ambroni dynasty without a later decision.

West Oremindi should be extremely dangerous, predominantly wilderness, and rich in passes, caves and optional exploration. The confirmed elven city is the major exception to that wilderness. The proposal below does not fill the region with new human villages, quest givers or named residents.

## Atlas constraints

Read-only audit of `azhora.wwmap`, the exported atlas and current game metadata:

| Constraint | Observed state and design consequence |
| --- | --- |
| Area | 38 hexes: 28 high mountain and 10 hills. Broad mountain masses and difficult traverses should dominate. |
| Coast | The west reaches the sea. A coastal breach is possible without moving the shoreline or inventing another coastal region. |
| Land neighbors | North Oreminidi Mountains, East Oremindi Mountains and South Oremindi Mountains. Use these actual borders for surface approaches. |
| Climate | 12 Dwd, 6 Dfb, 10 ET and 10 EF cells. Sheltered woodland belongs in suitable lower and temperate pockets; exposed tundra and permanent ice occupy other parts of the range. |
| Mapped freshwater | No lake cells or authored river edges touching the region. Local meltwater channels and springs would be new design additions, not recovered atlas features. |
| Danger | Current `region-levels.js` assigns level 7. The older campaign registry's provisional level 4 is not the current ladder. Keep the requested extreme danger; review numeric balance during implementation. |

One promising cross-section follows atlas row `r=92`: western ocean `(-18,92)`, coast `(-17,92)`, hills `(-16,92)`, Dfb high mountains `(-15,92)` and `(-14,92)` (the relatively milder pocket), tundra high mountain `(-13,92)`, then ice high mountain `(-12,92)` toward East Oremindi. **Candidate only:** place the capital beneath the central mass around `(-14,92)` / `(-13,92)`, with the sea breach farther west. The atlas gives neither the city's exact location nor its underground depth. Confirm the section in player-scale blockouts before assigning coordinates.

The current gameplay transform gives this region an approximate footprint of 550 by 808 metres. These are game-space dimensions, not lore measurements. Convey the ancient capital's scale through depth, connected districts and partly inaccessible vistas; do not enlarge the atlas region or cram a vast exposed city across its entire surface.

## The whole mountain country

The proposed landscape rises from broken sea cliffs through dark sheltered hollows to a central mass of ridges, hanging valleys and ice. Keep long, coherent silhouettes with unequal peaks, spurs and saddles. The visual identity should come from massive joined landforms, occasional pale rock bands and dark recesses. Repeated cone peaks, regular cliff shelves and identical cave doors would undermine it.

Five connected landscape areas give the region variety. These are descriptive planning labels, not new place names:

| Area | Terrain and exploration |
| --- | --- |
| Western sea face | Cliffs, fractured headlands, narrow ledges, sea caves and remnants of the siege works. Offer a dangerous coastal traverse with visible interruptions and places to turn back. |
| Lower wooded hollows | Dense pockets of conifer and birch, boulder channels, mossy ravines and old retaining walls disappearing into vegetation. These provide shelter and ground wildlife without making the whole mountain country forested. |
| Central mountain mass | Interlocking ridges, a concealed inner basin, enormous buried construction and several overlapping cave levels. The mass hides Sevron from ordinary long-distance views. |
| Northern passes | High saddles, rock gullies and exposed traverses toward North Oreminidi. Routefinding and selective climbing offer alternatives to a direct climb up every face. |
| Eastern and southeastern high ground | Ice fields, wind-scoured rock, cirque headwalls and narrow connections toward East and South Oremindi. These should feel more severe than the sheltered inhabited pocket. |

Proposal: establish one difficult but continuous approach from South Oremindi, a second long surface traverse, and optional cave shortcuts joining them. A pass can lead across the wilderness without revealing the city. Smaller cols, dead-end overlooks and caves make the remaining country worth exploring; every interesting route should not funnel into Sevron.

Mark danger through visible gradients, broken paths, exposed bridges, rockfall debris, tracks and distant hostile activity. Use rests and sheltered hollows between demanding stretches. Climbing should matter on selected faces and shortcuts, while ordinary traverses remain walking. Every mandatory route needs a tested return journey. False routes may end at real obstructions, but should not trap the player behind an invisible wall.

Cold, avalanches, unstable bridges, tides and falling rock are possible later mechanics. In the first terrain pass, represent their landscape evidence without silently adding new damage systems. Ice graphics alone must not promise a working crevasse, slippery surface or seasonal closure.

## Caves and the drowning

Give different cavities different origins: wave-cut coastal openings, fractured rock passages, occasional solution caves where soluble rock is deliberately chosen, and recognizably excavated dwarven halls. Sea caves commonly follow weaknesses in coastal rock; this supports the proposed coastal mouth, not a claim that waves naturally excavated the whole capital. [NPS sea cave reference](https://www.nps.gov/subjects/caves/sea-or-littoral-caves.htm)

If marble or limestone bands are selected, their water-cut passages can contrast with the dwarves' construction. That geology is a proposal, not an atlas fact. Keep stone type, cave formation and visible mineral deposits consistent. [NPS solution cave reference](https://www.nps.gov/subjects/caves/solution-caves.htm)

**Recommended flood model, pending review:** the ancient capital descended well below sea level under a mountain whose entrances and upper galleries were much higher. Its engineers maintained a dry inhabited depth through sealed boundaries and managed water. During the long siege, attackers opened a coastal connection into the protected lower city. Seawater flooded the occupied districts; lost access to high exits prevented escape. The specific engineering failure, blocked exits and sequence of events need a later history decision. They are a possible explanation of the confirmed drowning, not additional settled lore.

An ordinary sea connection cannot permanently fill rooms above the sea's level. Preserve that constraint in the vertical section. If the intended original city is instead entirely high above sea level, the story will need an explicitly chosen magical or lifting mechanism. Do not quietly show seawater running uphill.

My preferred present-day arrangement is flooded lower streets and a dry upper settlement. The elves arrived centuries later and occupy different levels from the dwarves' drowned population. In this proposed model, surviving dry galleries were not usable refuges during the siege; the elves later restored or created access. Repaired stairs, opened light wells and new access routes can explain the later habitation without weakening the original catastrophe.

| Vertical area | Proposed present use |
| --- | --- |
| Mountain surface and concealed basin | Wilderness, small sheltered growing areas and hidden approaches. No conspicuous city visible from the main passes. |
| Upper dwarven galleries | Sevron's homes, public rooms and guarded connections, enlarged or adapted by the elves. |
| Broken middle districts | Dry ruins, rubble-filled side rooms, water-damaged stairways and views down into flooded spaces. Much of the city remains unoccupied. |
| Sea level and below | Drowned avenues, submerged foundations and sealed chambers, with the breached coastal works explaining their water source. |

The first playable visit should have a dry route into and back out of Sevron. Swimming can serve optional shallow spaces, but mandatory underwater navigation would require a separately designed diving system. A drowned city can be powerful to look into before every submerged room is accessible. Do not turn the flood into an instantly reversible drainage puzzle by default.

## Sevron as an inhabited place

Keep the dwarven foundation legible: deep masonry, load-bearing piers, carved doorways, broad stairs, drainage channels and a few truly monumental chambers. Show former domestic streets and communal rooms as well as fortifications and royal architecture. The catastrophe destroyed a society, not just its treasure vault.

The proposed elven layer is lighter and fitted to the surviving structure: timber galleries across stone bays, screens within oversized rooms, small bridges, planted courts where light reaches, and restrained gardens around shafts open to the sky. Moss belongs in damp places; trees require soil, space and daylight. Glowing plants or underground forests would require a deliberate magical choice.

Give the small living kingdom a continuous neighborhood, a public gathering space and a distinct seat of authority. Leave substantial inaccessible or abandoned districts around it to convey how much larger the dwarf capital was. No current monarch, royal name, civilian roster, clothing style or house assignment is fixed by this plan. Elven bodies should retain the established species identity rather than becoming humans with a new faction label.

Food, fresh water and air need explicit routes in the section. Proposal: protected daylight terraces and stores support the small population; upland springs supply drinking water separately from the saltwater ruins. Smoke and ventilation must not require enormous conspicuous chimneys. The settlement's exact self-sufficiency, trade and magical practices remain open.

A strong arrival sequence would reveal a repaired railing deep within apparently abandoned construction, then evidence of cultivation, then warm light across an immense broken hall. The player understands that someone lives here before seeing the full settlement. Sevron's beauty comes from the living adaptation of ancient space and the darkness beyond it.

## Discovery and exploration

Proposal: concealment depends primarily on geography, ruined outer routes and the elves' deliberate discretion. Knowledge of a drowned dwarf capital can survive while the new kingdom remains unconfirmed. Finding the old ruin should not automatically reveal the inhabited district. Ibenwood's dimensional withdrawal is not automatically a Sevron power.

Use several clues that support observation rather than a single mandatory quest flag: a repaired section of an otherwise ruined passage, water or wind heard behind masonry, a light visible only from a difficult ledge, or recent use of an ancient stair. A skilled player should be able to discover the place through exploration. The exact number of entrances, permission rules and elven response to discovery are pending review.

Keep normal maps spoiler-aware: revealing a mountain hex must not automatically label Sevron or display its underground floor plan. Discovering an entrance, entering the city and mapping its interior are separate events. Developer travel remains an explicit testing shortcut and must not reveal the city in an ordinary save.

Hidden rooms should have architectural reasons to exist: blocked family chambers, inspection passages, sealed stores, burial spaces and rooms isolated by collapse. Buried treasures can include tools, inscriptions, crafted objects and money, with major royal relics left for later design. Use repeated construction patterns to make a missing arch or altered wall readable. Avoid arbitrary hidden interaction spots with no visible clue.

The distinction between abandoned finds, dwarven heritage and possessions of the living elves should remain visible. Ownership rules and any restitution or reclamation quests need later approval. No treasure list, reward economy or named quest is created now.

## Wildlife and danger

Reuse the ecological continuity established in South Oremindi, then add only species that the new habitats need. Every tree must retain a species and timber identity. Dense woods should give way irregularly to scrub, meadow and exposed rock according to shelter and climate, rather than one perfectly horizontal tree line.

| Habitat | Proposed life and behavior |
| --- | --- |
| Sheltered lower forest | Deer, boar where forage supports them, hares, squirrels, small birds and sparse predators. Provide ground animals throughout suitable interior patches. |
| Talus adjoining alpine meadow | Existing Oremindi snowgoats, with optional marmot or pika-like animals proposed for a later model pass. Grazing and refuge must be connected. |
| Exposed ridges and high snow | Sparse eagles and occasional animals crossing between useful habitats. Permanent ice should not have woodland animal density. |
| Coastal ledges and cave mouths | Seabirds and small intertidal life; seals are an optional addition where a suitable haulout exists. |
| Natural cave entrances | Bats and small invertebrates near actual food sources; little ordinary animal life deep inside sealed ruins. |

The meadow and talus pairing has a useful real-world reference: alpine vegetation and small mammals use sheltered ground and rock microhabitats, rather than treating the whole high country as empty ice. This is inspiration for Azhora's habitats, not an import of a real park's species or elevations. [NPS alpine ecosystem reference](https://www.nps.gov/romo/learn/nature/alpine_tundra_ecosystem.htm)

Threat proposal: concentrate existing mountain goblins or orcs around selected routes and occupied ruins, with rare large threats in appropriate open spaces. Preserve quiet stretches, ordinary wildlife and retreats. Extreme danger should come from the combination of difficult travel, limited safe approaches and consequential encounters, not a monster every few metres. Do not assume Sevron's elves attack on sight or copy Ibenwood's lethal boundary behavior before the user chooses it.

## Relationship to Dwarfland and Elfland

The surviving Baldro cities and the lost capital should share a recognizable architectural lineage. Baldro already has millennia of history; it is not assumed to have been founded after the flood. Related doorway proportions, stone joining and civic layouts let a player recognize the connection even without exposition. Sevron can preserve older and more ambitious forms; Baldro shows how the tradition developed afterward. The former capital should not merely reuse a Baldro city mesh with water added.

Proposed consequences in Baldro include remembrance of the dead, preservation of old craft traditions and more careful separation of water systems from inhabited depth. These are opportunities, not a universal dwarf personality. Do not make all dwarves afraid of water, committed to reclamation or hostile to elves. Their knowledge of Sevron and response to its occupation remain important open questions.

The latest brief introduces another independent elven kingdom. Interpret the earlier description of Ibenwood as the only independent elf country as **the only publicly recognized one**, pending any further political detail. Sevron's existence is a design fact but remains uncertain to most people in the world. Whether Ibenwood's rulers know about it, have contact with it or claim kinship is undecided.

Older World Builder prose describes a more knowable Sevron with a maintained pass, high valley agriculture and the Verath tradition. The new hidden elven kingdom and dwarven catastrophe take precedence. Sheltered terraces and disciplined mountain life remain possible inspiration; the Verath, its language and specific maintained-pass history are not automatically assigned to these elves. The external lore repository remains untouched.

## Implementation sequence after review

1. **Build and assess Baldro Dwarfland first.** Use one continuous surface approach, inhabited entrance, multi-level hall and alternate exit to establish dwarven architecture and underground traversal.
2. **Block out the full West Oremindi geography.** Reconcile actual borders, coast, climate, the central massif, the seawater section and all major routes before detailed scenery. Set summit heights from ground-level views and developer-flight limits, not a number chosen to outgrow Lotharn.
3. **Prove one complete expedition.** Walk from the southern border through a pass and cave into a dry ruin, glimpse the drowned city, reach the intended elven approach and return. Use real collision, climbing stamina, falls, camera and save restoration.
4. **Populate the whole region's habitats and secondary routes.** Persistent wildlife must work in the coastal hills, forest interiors and upper country. Place cave loops and optional destinations beyond the principal Sevron route.
5. **Build Sevron's agreed inhabited portion and ruined districts.** Settle flood extent and entry policy first. Add the requested elven presence after visual and social decisions, without generating unsolicited named civilians.
6. **Add reviewed exploration interactions and danger.** Hidden rooms and recoverable treasures need persistent state. Defer new diving, tide simulation, survival systems and major story quests until separately designed.

Acceptance must cover correct surface and underground floors at the same X/Z, dry halls beneath terrain, seawater heights and obstructions, entrance transitions, climbing and falling, recoverable saves, spoiler-safe mapping, persistent discoveries, camera comfort and wildlife continuity. Test ordinary approaches as well as F8 jumps and fast developer flight. Record startup, frame time and memory changes; render only nearby detailed halls instead of drawing the whole city through the mountain.

Water queries must distinguish cave levels and contained bodies of water. A flooded lower hall must not make the dry bridge above it swimmable, and a submerged passage must not borrow the surface mountain's floor. This is a specific extension to prove after Baldro's dry multi-level interiors work.

Implementation should later reconcile the stale South Oremindi Sevron references in `campaign-world.js` and `build-status.js`; they are recorded here rather than changed during design work. Inquest Clearlistern's existing South Oremindi cottage and future campaign role remain separate.

## Choices still open

Two questions have been raised for review: how much of the ancient city remains flooded, and how the elves respond when an outsider finds them. The working recommendations above are **flooded lower city with inhabited upper terraces**, and **cautious contact with a peaceful visitor**; they are not recorded as user decisions.

Subsequent decisions: what the Baldro dwarves know about the elven occupation; Sevron's relationship with Ibenwood; whether any Verath material is retained; the ancient dwarf language and capital name; the old king and attacking human power; and the scope of underwater access. None prevents drafting the landscape, and none should be silently invented during its eventual implementation.


## First playable build, 2 October 2026

West Oremindi is playable region 56, appended without renumbering existing regions. Its 38 atlas hexes and their climates are unchanged. The source World Builder map was only read; the survey was regenerated. The range has four unequal joined peaks, a south approach, coastal traverse, upper inspection route and high pass. The terrain is climbable and uses the existing falling system. Forests use registered silver fir, stone pine, silver birch and juniper trees; persistent deer, boar, hares, snowgoats, mountain eagles and coastal gulls populate suitable habitats. Ice is sparsely inhabited. Two goblin-held traverses use level-seven combat and allow retreat. No new cold or avalanche damage rules were introduced.

Three ruined entrances acquire a separate lazy interior floor. Sea water lies at world height 0.06; drowned streets lie below it. Upper walking galleries are at 8 metres and the inhabited court at 14 metres. The surface mountain remains a separate heightfield, so walking on a bridge never places the player in the flooded basin. The lower ruin is a protected view behind physical rails, not an underwater diving level. The entrance transition represents the long descent inside the mountain; this first build does not model every connecting shaft at literal surface distance.

Sevron has anonymous elven residents and a watcher who permits peaceful exploration, timber homes fitted into deep dwarf masonry, a public court, freshwater channel and daylight growing court. Its entrances are not labeled as Sevron on the ordinary chart. Entering the occupied court records city discovery separately from finding a passage. A mismatched panel opens an inspection store; its old tools and inscriptions remain while 36 copper can be recovered once. Discovery, the panel, collected coins and defeated mountain threats persist. Saving indoors uses a safe exterior entrance.

The great dwarf capital, its king and its human attackers remain unnamed. The elves' ruler, their relations with Baldro and Ibenwood, reclamation politics, major relics and underwater access remain future design. Sevron is neither assigned Ibenwood's dimensional withdrawal nor its lethal-border policy.

Validation is in tests/west-oremindi.test.js and src/sevron-smoke.js. The focused checks cover exact atlas ownership and climate, route continuity and real collision/slope movement in both directions, wildlife coverage, species-registered scenery, returnable upper/lower room circulation, sea-level separation, and atomic/exactly-once discovery rewards. Native smoke and visual artifacts belong in tests/artifacts/.

The final focused region and road-checkpoint run passes 48 tests. Native Full and Fast runs each pass all 26 Sevron checks, including walking the 435-metre approach with real slope/collider movement, reaching the inhabited court and hidden store, collecting coins once, restoring discoveries, and preserving the normal adventure save. Both render the three review views without renderer/frame errors. Those combined smoke-and-review runs report an Electron GPU shutdown error after successful results and exit with code 1; that process-level issue remains recorded rather than being reported as a clean native exit. Visual review corrected the panorama's camera clipping and enclosed the interior against outside terrain leaking through its walls.
