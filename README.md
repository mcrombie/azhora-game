# Azhora: An Adventure Game

A standalone 3D adventure across six authored regions of Azhora: **Drent**, the Ambroni Empire’s quietest forested province; **Luscia** beyond the Caloss; the open **Moros Plain**; **West Suval** and the walled city of Solis above the sea; **Pueth**, the cold timber country north of Drent; and the stone hills of **East Suval**, whose frontier is shut. Their shapes, sizes and positions come straight from the World Builder atlas at 100 metres per authored hex. A mercenary hired from across the sea lands at Tidehaven on Drent’s east coast during a goblin attack, carries Jojo’s introduction to the Ambroni Legion, and follows the road south-west through the forest, over the Caloss, past the Legion’s outpost on the Moros and on to the parley at Solis, where the war forks. North of Tidehaven the road crosses the Tessen into Pueth. The regions connect without loading screens, and the road stays open for return visits.

Drent’s forest includes small working places, optional woodland errands, deer, insects and understory plants; the goblin scout camp that raids it now sits across the Tessen in Pueth. Along the way there are towns with their own people, Legion posts, a hired mercenary company that walks the road on its own clock, a horse to ride from Lumber Town on, and **birding**, the first of the traveler’s skills: Jean teaches Birding and Animal Husbandry beside the departing village road. Twenty-five kinds of bird can be recorded, repeat observations earn practice, and familiar bird calls open at level 2. Her feeder garden remains in Tidehaven, and her two tame sheep give the traveler livestock to practise with. The traveler’s chart begins blank and is charted as you walk, naming the ground you reach. A separate developer ghost mode inspects the authored world atlas, flies through the playable regions, visits a Cape Thalmagar fortress prototype, or surveys terrain from the wider map.

The Drent road also offers optional skill lessons: Stanley's repeatable Farming plots and farm cooking in Avrel; Jean's Birding and Animal Husbandry; Mark and Glun's different Geology introductions; Glun's guided Woodcutting; Amanda's Acting; and Sylvia's Visual Arts cottage on the Sunken Lane. Lee Anne teaches Fire Making before Jojo's Cooking lesson, while Martin introduces Smithing. Glun, Mark, Jean and Stanley can each lead an outing to a pond and demonstrate Fishing. These lessons share permanent skill progress, so changing teachers never resets experience. See [farming](docs/avrel-farming.md), [guided fishing](docs/guided-fishing.md), [fire making and smithing](docs/fire-making-and-smithing.md), [woodcutting](docs/glun-woodcutting.md), and [Visual Arts](docs/visual-arts.md).

The Greenway ambushers keep their individual health and positions between attacks and saves. They wait in visible brush camouflage, emerge to fight, and surviving raiders walk back into cover after driving someone off. Dead raiders stay dead. See [ambush persistence](docs/road-ambush-rendering.md).

The **civil-war campaign** runs to the border battle and the day after it in 3D; the branches beyond are designed and executable but not yet built. See [docs/campaign-design.md](docs/campaign-design.md). Every authored region has a difficulty level (0 tutorial to 5 deadly), a controlling faction and its threats (`src/campaign-world.js`); the main quest runs Drent → Luscia → Moros Plain → West Suval, forks at Solis between the Ambroni Empire and the Republican Coalition, and continues along mirrored branches to the South Oremindi Mountains (`src/campaign.js`). Regional side arcs flip provinces on the political map, faction trust rises and falls, and double-dealing is eventually exposed. The journal’s **The civil war** section shows the current chapter, your standing, and the regions around Drent; the developer atlas tints every region by level.

## Play

Double-click the **Azhora desktop icon**, **Play Azhora.cmd** in this folder, or run `npm start`. Close an existing game window and reopen it after an update.

The desktop game opens in native fullscreen, covering the Windows title bar and taskbar. **F11** or **Alt+Enter** switches between fullscreen and a window. Escape pauses without leaving fullscreen.

The launcher uses this project's Electron runtime if installed, otherwise the runtime in the neighboring `world-builder/map` project. On another computer, install Node.js, run `npm install`, then `npm start`. The game works offline: Three.js, the atlas, procedural models, interface, and synthesized sound are local. It needs no API keys or external asset requests.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Walk relative to the camera |
| Q / E | Move forward-left / forward-right |
| Shift / hold Tab | Run; Tab navigates controls inside menus |
| Space | Jump |
| Right mouse drag | Turn the camera |
| Mouse wheel | Zoom |
| F | Talk, continue dialogue, gather, repair, restore a waymarker, cast/reel, or tend a fire |
| Left click / R | Swing the equipped weapon; timed presses chain a three-hit combo |
| Ctrl + movement direction | Dodge; with no direction, dodge backward |
| Enter | Begin / continue dialogue |
| I | Open or close the satchel; hover for hints, then select items, equipment, or food |
| J | Journal and journey notes |
| L / click the minimap | Open the local trails map; L also closes it |
| M | Open the traveler’s chart of Azhora |
| K | Open your skills; **B** observes a bird you have in view |
| Escape | Pause, dismiss a panel, or cancel fishing |
| F8 | Open testing tools, including from the opening screen |
| Esc | Pause. **Leaving the window does not pause** — Azhora goes on without you, so a fight you walk away from is still happening. Held keys are released and a cast is reeled in, because neither can be worked from another window. |
| P | Start autoplay (also **Watch the computer play** on the opening screen or **Autoplay the road** in Pause); any key or click takes control back |
| F11 / Alt+Enter | Toggle fullscreen |

Pause offers lighter graphics, a return to the pier, testing tools, and **Save adventure** after stepping ashore, outside an active fight.

**Autoplay** lets the computer play the main quest while you watch or step away. Press **P**, choose **Watch the computer play** on the opening screen, or **Autoplay the road** in Pause. The autopilot uses only ordinary inputs: it walks the Greenway and the road out of Drent, talks to Jojo, Eren, Corvan, Hollis, Sava and Iven at a readable pace, practises at the straw post, fights the goblins and the meadow raiders with the same dodge-and-counter rules you use, gathers driftwood for the bridge, restores the waymarkers, and stops when Iven files the report (the campaign chapter beyond Drent is not built). A badge shows what it is doing. Any real key press or click hands control straight back; the game does not pause on losing window focus while autoplay is on, so it can run unattended. Autosaves happen exactly as in normal play. Switching to another window pauses play. Named signposts point to the next place along the road, back toward Tidehaven, and along the smaller woodland paths. Flowers, ferns, riverbank leaves, and heather change with the landscape. Sound starts off; enabling it adds sea, forest, field, river, and ridge ambience, nearby animal calls, combat effects, and footfalls that change on wood, earth, and stone.

The minimap stays centered on the traveler, with true north up and a constant **62-metre radius** across all four regions. It shows nearby roads, smaller trails, buildings, and water. The **Local trails** journal tab opens with **L** or a click on the minimap and adapts to compact windows. Browse any of the four regional charts, or choose **Where I am** to return to your current region. District ground and dashed borders on both charts are drawn from the authored hex outlines, not from bands of Z. Use **+ / −** or the mouse wheel to zoom around a selected place, and **Fit** to show the whole region again. Browsing pauses play and does not teleport the traveler or discover places.

Discovered places and destinations learned through quests have names; unexplored places remain anonymous and cannot be marked. Select a known place and choose **Mark** to follow its **teal optional pin**, alongside the **gold main journey objective**. Clear it from the map or the small pin label beside the minimap. Optional pins last for the current run only. Existing discoveries continue to autosave through adventure checkpoints. **J** still opens journey notes, and **M** opens the developed World Builder atlas.

## The four-region journey

North is world -Z, east is +X, and one authored hex is 56 m. Region shapes come from `regionOutline()` over `assets/azhora-dev-regions.json`; the road runs through the anchors `routeAnchors()` returns.

| Region | Shape and biome | Places and people | Main errand |
| --- | --- | --- | --- |
| **1 · Drent** | 39 authored hexes, about 530 m by 310 m on the north-east coast. Dense broadleaf forest throughout, with the Stills to the east. | Tidehaven's pier and village, the Greenway, Willowmere Pond, Fernway Rest and its shelter, six quiet woodland places, Bramble Scout Camp, the **Caloss Gate** gatehouse and guard hut, the wayside on the forest road (charcoal burners, a forester’s hut, a shrine, a timber landing), and the **Avrel farmsteads** (farmhouse, barn, byre, stack yard, field walls) with Corvan's Legion post, the **old Rena road** running north off the main road through the **ruins of Rena** to the orchard village of **Applegarth**, and the sunken lane, the toll house and the pedlar's stone on the road west; Jojo, Tobin, Eren, Lysa, Orris, Bran, **Tamsin**, quartermaster **Corvan**, miller **Enna**, and the two Ardrys who remember Rena — **Lorn** on the Tidehaven shingle and his sister **Hesta** at Applegarth, whose letters you carry | Receive Jojo's message, learn movement and combat, defeat three goblins, inspect the message, and walk the forest road to the **Caloss Gate**. Then deliver the letter at the Avrel clearing, recover **three parcels**, deal with **two raiders**, and return to Corvan for **two cooked fish**. |
| **2 · Luscia** | 23 hexes south-west across the **Caloss**. Rolling grass with copses that thin toward the Moros. | The Caloss bridge with Hollis's timber yard and the **ferryman's hut**, the reedcutters' landing, the marked fishing bank, **Sava's shrine** in its walled court, three waymarkers, the **Lauvel relay** and its yard, the field at the Lauvel with its **field hospital** and cairn, the burned hamlet's ruins and scorched orchard, and **Lumber Town** between its palisade gates (smithy, hall, stable yard); **Elod's closed frontier** on the East Suval border; keeper **Hollis**, **Sava**, relay clerk **Iven**, and reed worker **Merren** | Gather **three sticks**, repair the damaged bridge lane, report to Hollis for **four spare branches**, restore **three waymarkers**, then let Iven copy Jojo's report at the relay. |
| **3 · Moros Plain** | 31 hexes west of Luscia. Flat treeless grassland under a very large sky. | The Moros gate with its watch platform, the wayside (milestones, a shepherd's fold, a Legion picket), the **Ambroni outpost** (a timber fort to the shared fortification standard: rampart, palisade, wall walk, twelve towers, a ditch, two gates; tent lines, the Legate's tent and standard, a smithy with a repair bench, a mess fire, the parade ground, the horse line), and the border stockade to the same pattern | Not yet a quest: the camp, the horses and the stockade are placed scenery for the chapter that follows. |
| **4 · East Suval** | 23 hexes south of Luscia. Grey stone hills, heather and ridge rock, with the Stills again to the east. | **Closed.** Elod keeps out of the war: its stone frontier and black-clad guard stand on the Luscian side, pickets watch the rest of the border, and nobody may cross. Behind it: Elod's old border post, the roofless waystation and its shelter, the gate of **Elod** above the sea, and a hill-bandit lookout; shelter keeper **Oda** | None: the region cannot be entered (the F8 travel tools still reach it for testing). |

### Tidehaven's tutorial

Walk ashore and speak to Jojo with **F**. Your simple sword is equipped from arrival; Jojo gives you her message and points out the practice post and repair bench. Land two hits on the straw post and complete a directional dodge nearby, then follow the woodland road to the warning bell.

The three bramble goblins enter with staggered arrivals. Amber ground arcs show their committed strikes; dodge, then counter during recovery. Goblins take turns attacking, stamina recovers between actions, and melee has light aim assistance and a short input buffer. Defeat offers a full-health encounter retry, retaining items and completed lessons. Retreating to the safe side also gives you another attempt. Neither action repairs weapon wear.

Report to Eren beyond the village for his travel token. Press **I**, hover over Jojo's message for its tooltip, and **select the message** to read it. Dismiss the satchel with I, Escape, or Close. Follow the minimap marker through Fernway Rest to the open field gate travelers call the **Caloss Gate**. The forest thins there and the Avrel clearing opens out, and the next quest begins.

### Army service and the people called rebels

Jojo's letter sends the hired mercenary from Tidehaven to Quartermaster Corvan of the Ambroni Legion at the Avrel clearing. Corvan records the letter, inducts the traveler into Legion field service, and assigns supply recovery for the campaign against the rebels. He presents the Legion as bringing order while goblin raids out of Pueth threaten the roads. Legion soldiers are men by default; named exceptions can be written later.

The mandatory regional conversations change that picture gradually. Hollis, at the Caloss where Drent ends, reveals that most households feed and shelter the resistance. Sava, on the Luscia side, tells you the Legion broke a rebel army at the Lauvel crossing ten days ago and that most of Luscia wanted what those rebels wanted: a republic in place of the emperor. The people are caught between goblin raids from the north and an empire squeezing harder as it slips. Iven records that truth while the player remains employed by the Empire; choosing whose sellsword you are belongs to the fork at Solis.

The **Ambroni Empire** and its capital Ambron in Elagos, Drent as a loosely held subject province, the Pebbles offshore, Luscia’s Lauvel valley and the neutral Elodi of East Suval all come from the existing lore in `../world-builder/azhora_lore`. The Republican Coalition, the Legion, Corvan, Solis’s role, and the battle at the Lauvel are new campaign material. This arc changes the meaning of the existing errands without adding rebel battles or a resolved war; the allegiance choice is modeled in the campaign and reached in play only after the road. Existing checkpoints remain compatible; a save without a campaign loads with a fresh one.

### Work and conversation along the road

Corvan's parcels lie east of the main road among the field walls. Each is a distinct pickup; returning them is a one-time exchange. The meadow encounter has its own retreat and retry behavior, so leaving its area does not keep later camp activities locked in combat.

Hollis's bridge still has a sound eastern walkway before the repair. Spending three sticks restores the damaged side as an actual walkable lane. If you have burned or broken all available wood, ask **“I need sound wood for the repair.”** Hollis supplies enough marked repair timber to bring your stack to three. This remains available while the accepted repair is unfinished, so spending the timber cannot strand the quest. Borrowing wood does not complete the repair for you.

The waymarkers on the Luscian road are reflective road stones. Restoring them uses no firewood or tinderbox. Iven serves at the Legion’s relay on the Luscia side: he copies the warning and the people's account, then returns the original. Filing it completes the campaign’s first chapter; the onward road west to the Moros is the second. The branch south-east toward Elod ends at Elod's shut gate.

All four road NPCs have optional conversations before and after their errands. Corvan talks about caravans and field mornings; Hollis explains river repairs and fishing; Sava describes tending a small working shrine; Iven explains how reports move along the road. These branches do not advance the main quests.

## The woods around Tidehaven

Take the smaller signed paths off the Greenway. Each of these six places has an inspection prompt with **F** and a short entry under **Woodland notes** in the **J** journal. You can discover them in any order; they never replace the main tutorial objective.

| Place | What is there |
| --- | --- |
| **Old Charcoal Hearth** · western trail | A cold charcoal mound, working shelter, stacked wood, and Tamsin's abandoned red-tied tool bundle. |
| **The Bee Fold** · east of the village | A tended flower garden, old hives, a resting stool, and bees moving near their hives. |
| **Stormfall Oak** · eastern woods | A large fallen oak, exposed roots, and a path left around the trunk. Its timber tag explains why the woodcutter left it standing as habitat. |
| **Mosskeeper's Shrine** · western woods | Three mossy stones and a fallen wooden wayboard. Use **one forest stick** to fit a new peg and visibly set the board upright. |
| **Fern Hollow** · northern western trail | A sheltered pocket of ferns with a sitting stone and a quiet woodland note. |
| **Saltwind Lookout** · western shore | A coastal resting place with old fishing knots and a view back across the sheltered landing. |

**Tamsin**, the woodcutter at the village's northwestern edge, wears a patched short apron, rolled sleeves, a faded red headcloth, and tied brown hair. Her idle pose includes a small tired shoulder roll. Speak with her about the work people do in these woods, or accept **A working day interrupted**: recover her tools from the charcoal hearth and return them for **two cooked fish**. You can find the bundle before meeting her. It is tracked in the optional errand, and the reward is given only once. Afterward she remembers who made it possible for her to work again.

The shrine repair is a separate small kindness, with no item reward or prerequisite quest. It spends a spare stick through the weapon system, preserving a partly worn branch if another remains. Tamsin notices the repair in later conversation. Her comments about an army timber levy add local pressure without giving away the later story reveal.

Between these places, **410 ground details**—ferns, sorrel, pale flowers, violets, and mossy logs with small fungi—break up the forest floor. **Three adult deer and a fawn** browse and flee from an approaching traveler. **Five woodland thrushes** peck, look around, and hop through the leaf litter, then take short flights to clear ground when you approach. **Eight butterflies** move above flowers, **six bees** work the Bee Fold, and **four dragonflies** skim Willowmere. The existing squirrels still forage and climb. These animals are scenery, and the planting leaves paths, gathering spots, conversation approaches, and the goblin camp clear. Shared instanced geometry and distance culling keep this detail inexpensive; pausing also freezes the birds in flight.

### Bramble Scout Camp

Follow the scraps of **blue cloth** along the eastern woodland trail to find a rough camp with two goblin lookouts and sacks stolen from Tidehaven. **F** lets you inspect it from the approach and decide whether to fight. You can scout the place earlier, but challenging the scouts becomes available after defeating the first three goblins on the Greenway. Simply walking past never starts this encounter.

Choose **Challenge the two scouts** when ready. The encounter uses the same readable attack tells, dodging, weapon wear, and forgiving retry as the main tutorial. You can retreat toward the Greenway and return later. After winning, press **F** at the marked sacks beyond the camp, then return the village supplies to **Tamsin** for **three ripe pawpaws**, awarded once. The supplies are tracked in the journal rather than taking a satchel slot. This errand does not advance the army assignment or change the original tutorial sequence.

## Weapons, food, and campcraft

The traveler wears simple brown cloth and a patched cloak, without armor. His **simple sword** has **24 condition** and deals **24 / 26 / 34 damage** across its combo. Every landed strike costs one condition, including practice hits; misses cost none. At zero condition the sword cannot attack but remains owned and repairable.

**Forest sticks** are gatherable weapons and camp materials. Fourteen woodland pickup sites include four on the village side of the first ambush; further bundles lie along the new road. A stick has **6 condition**, **80% sword reach**, and a **14 / 16 / 20** combo. Breaking one consumes it and readies the next carried stick. Switching equipment preserves wear. Spending spare sticks on repairs or fire also preserves the partly worn stick while one remains.

Use **F** at a repair bench to restore carried weapons free of charge. There is one in Tidehaven, one at the Avrel clearing, one at the Caloss crossing and one at Sava's shrine. The satchel shows condition and provides Equip buttons; changing weapons waits until a swing or dodge has finished. A broken weapon never prevents dodging or retreat.

### Lysa, squirrels, and pawpaws

Lysa lives beside the western village cottage and its outdoor kitchen. Bring her **five acorns** for one reusable **tinderbox**. Previously gathered acorns count, only five are consumed, and her favor is independent of the road tutorial. Afterward she remembers the kindness, becomes fond of you, and offers warmer conversation with light flirting. You can also ask about squirrels, acorn cookery, or forest fruit without accepting the favor.

Four tiny squirrels forage in Tidehaven's wood, flee faster than the traveler, climb real tree trunks, and perch on branches. There are **24 acorn pickups** in six woodland pockets. The outer regions add **23 ambient animals**: two flocks of sheep on the Moros, sheep on the Avrel farmsteads, bank birds at the bridge and at the ferry, and two rock hares in East Suval. Their bodies and articulated parts use three instanced meshes per flock, with distant groups paused and hidden. These critters add movement and character without blocking quests or becoming combat targets.

Drent's forest has **12 ripe pawpaws in six patches**, with four available before the ambush, and additional fruit bundles along the road. Look beneath broad, drooping leaves and press F to gather. Open I, select **Ripe pawpaws**, and choose **Eat** for up to **25 health**. Gathering saves food for later; full health preserves it. Eating requires an idle, living character and cannot revive defeat.

The fruit's habitat and appearance draw on [National Park Service pawpaw ecology](https://www.nps.gov/articles/pawpaw.htm) and [NC State Extension's description](https://plants.ces.ncsu.edu/plants/asimina-triloba/). Its health effect is a game mechanic. Lysa's distinction between raw acorns and leached meal follows [US Forest Service acorn food research](https://www.fs.usda.gov/psw/publications/documents/psw_gtr044/psw_gtr044_004.pdf); her dialogue supplies background, not a cooking recipe.

### Fishing and cooking

**Bran** teaches fishing at **Willowmere Pond**, east of the forest road beyond Eren's watch. **Hollis** also teaches it at the Caloss and can lend a spare rod if you do not already have one. The marked riverbank is upstream of the bridge. The rod is reusable; repeat lessons do not duplicate it.

At either marked bank, press **F** to cast. Wait about three seconds for the float to dip and the **A bite! Reel now** prompt, then press **F or click** during the bite window. An early or late reel misses without a cost. Escape cancels. Each catch becomes one **raw fish** in the satchel.

Bring a **tinderbox and two sticks** to any of the five prepared fire rings. Light fire consumes the sticks and retains the tinderbox. A fire lasts **120 seconds of active play**, pausing during conversations and menus. **Cook one raw fish** makes one **cooked fish**, which restores up to **40 health** through its satchel Eat button. Raw fish cannot be eaten. Fishing and cooking do not advance the road quests.

### The wider larder

Beyond pawpaws and cooked fish, the satchel knows **29 more foods** drawn from Drent and its trade: forest foraging (wood sorrel, hazelnuts, bramble berries, honeycomb, dried venison), Tidehaven and Avrel kitchens (boiled eggs, oatcakes, Avrel apples, Lysa's acorn flatbread and honey cakes, rye loaf, ewe's cheese, smoked forest-hog sausage, roast duck, mutton pie), the Stills and the Pebbles (marsh samphire, oysters, salt shoal-fish, dressed crab, smoked eel, fish stew), and Legion rations and traders' goods (hardtack, salt pork, Elagosi smoked whitefish, Galan olives, Maroshi figs, Ovesian dried pears, Amod chestnuts, Narcoshi cheese). Each restores between **10 and 50 health** under the same rules as fruit and fish, and each has its own satchel icon. Nothing in the world hands them out yet: they are defined in `src/consumables.js` and `src/inventory.js`, ready for vendors, rewards, and foraging sites. The sources follow the lore in `world-builder/azhora_lore` (Drent oysters and flat-water crab, the Pebbles' salted shoal catch, Avrel orchards, Amod chestnuts, Galan olives and figs, Narcoshi cheese).

### Orris and the distant cape

Orris, the hooded doomsayer with a gnarled staff, stands near Lysa and also explains cooking. His optional warning introduces the **dark lord of Cape Thalmagar** without establishing a personal name or deeds. The cape lies far to the northwest of Drent, beyond the Oremindi, on the existing World Builder geography; the campaign’s orc arc leads toward it.

Orris never points to the cape on a chart: the traveler’s atlas leaves Cape Thalmagar uncharted and has no shortcut to it, so the player learns of it as rumor rather than geography. In the adventure it remains distant foreshadowing. The separate ghost-mode fortress study is available for inspection, but has no boss encounter or story route from Drent.

## Adventure checkpoints

Saving is available from **the first step ashore**, including during the unfinished tutorial. Normal play saves at supported lesson and quest transitions, discoveries, gathering, favors, fishing/cooking events, repairs, and eating. You can also choose **Save adventure** in Pause. Use **Continue** on the next opening screen to resume the last checkpoint. Active fights, defeat, and testing overrides cannot overwrite it.

The desktop stores one slot at **`saves/road-checkpoint.json`** through the isolated Electron IPC bridge. It survives restarts and does not depend on the asset server's randomly assigned loopback port. Writes validate the checkpoint and replace the previous file only after the new data has been written. Storage failures are reported without stopping the game; automated smoke runs use an isolated memory slot.

A checkpoint restores:

- First-shore lesson progress, including partial practice hits and dodges, plus ordered road quests, recovered parcels, waymarkers, the repaired bridge, and the cleared meadow encounter.
- Satchel quantities, equipment selection, exact weapon wear, health, and a valid saved position.
- Collected woodland acorns, sticks, and pawpaws; collected road supplies; discovered places and woodland journal notes.
- Lysa's available, active, or completed favor; Tamsin's accepted/recovered/returned bundle state; the restored shrine board; and whether Orris's warning was heard.
- The scouted, accepted, or cleared goblin camp, recovered village supplies, and their completed return to Tamsin. An unfinished camp fight resumes from its accepted errand, without saving a battle in progress.
- Fishing instruction, catch history, and each campfire's remaining fuel **at the time of the checkpoint**.

The storage key and file keep their original road-checkpoint names. **Older version-1 road saves remain compatible**: missing woodland history starts from its default state while the already saved satchel and road progress remain intact. Current saves restore collected forage and completed acts without granting their items or rewards again. Ambient animal positions and a cast or battle in progress are not serialized. Fire timers pause in menus and ghost view; reopening resumes the fuel recorded at the last checkpoint.

## Testing tools

Press **F8**, use the opening screen's testing button, or choose **Testing tools** from Pause. F8 also works from a defeat screen.

**Quest playtests** comes first: Ben's spider hunt, Liz's rescue of Mop, Troy's investigation, and Cagney's escort. Each card teleports to a fresh run of that quest; the magic quests stop at the reward choice. Any key or click takes control, and **P** resumes. These demos protect the normal saved adventure.

**Main story jumps** offers Iven's satchel assignment, the Republican at the relay, and the Imperial recall decision.

**General travel** is visible directly in the panel. **Go anywhere** lists countries and named places from the world and searches for standable ground near each destination. **Go to a point** accepts coordinates such as `-1050, 982` or `stand-at:-806.1,-521,-1.57`. Regional travel advances earlier main-road prerequisites as before.

**Hacks** contains just the fast developer horse and whole-map reveal. Older character jumps, individual location buttons, supplies, ordinary horses, and ghost view are removed from the panel.

`npm run test:testing-tools` clicks the four playtests, three story jumps, travel controls, and hacks while verifying that the normal checkpoint is unchanged. Review the panel with `--smoke-test --review-views=testing-tools`.

The **TESTING SESSION** badge identifies the override. Testing supplies and travel **never overwrite the normal road checkpoint**. Reopen the game and choose Continue to recover the normal saved road, or begin from the boat for a fresh playthrough.

### Developer ghost view

Ghost view remains available through automated developer checks and review hooks, including `npm run test:developer`; it is no longer an F8 control. The current adventure pauses, and a translucent traveler becomes your spectator. Choose a region on the actual World Builder atlas, then use its **Fly into** button. All **131 authored region outlines** are clickable. Scroll and drag to inspect the map, or use the Drent and Thalmagar focus buttons.

The four playable regions each carry their own pin on their own authored hexes: Drent, Luscia, the Moros Plain and East Suval. A separate schematic shows their order along the road. Tidehaven's exact place on Drent's coast is still provisional. Every region is tinted by its campaign difficulty level, with provisional levels labeled. Cape Thalmagar opens its own fortress prototype. Every other mapped region opens a **Terrain survey · gameplay not built** scene, using the authored region's hex layout and terrain categories. Survey elevations and scenery are illustrative. These visits do not imply that the whole continent has quests, settlements, or connected playable terrain.

| Ghost control | Action |
| --- | --- |
| WASD / arrows; Q / E | Fly relative to the view; forward diagonals |
| Space / Ctrl | Rise / descend |
| Shift / hold Tab | Boost from the default **28 m/s** to **100 m/s** |
| Right mouse drag | Look freely |
| Mouse wheel | Adjust cruise speed from **6–120 m/s**, with boost up to **360 m/s** |
| M | Open the atlas / resume flight |
| Escape | Open the atlas, or dismiss it when a flight is available |
| F8 / Return to adventure | Leave ghost mode and return to the paused traveler |

Ghost visits do not move the ordinary player, grant supplies, complete quests, or write checkpoints. The separate scene is released when you leave it. Flight passes through scenery within generous inspection bounds.

The **Cape Thalmagar** study contains a basalt approach, dead forest, broken arches, drifting cinders, and fortress spires reaching **219.5 metres**. It is a distant atmosphere and scale prototype, with no boss, combat encounter, allegiance choice, or ordinary route into it. The cape's region location comes from the authored atlas; the fortress and dark wasteland are new gameplay material, not a rewrite of the source map's terrain or existing Thalmagar lore.

## Scope and lore provenance

The four playable regions are the authored Drent, Luscia, Moros Plain and East Suval hexes, laid out north-up at 56 m per hex, so the minimap, the compass and the world chart now agree with the atlas. Tidehaven, the Greenway and the woodland places keep their original layout, carried over as one piece onto Drent's east-facing coast. The chapters that use the Lauvel field, the Legion camp, Elod's border post and the town of Elod are designed in the campaign and placed as scenery here, but their quests, dialogue and encounters are unbuilt. Building interiors, a seamless continent, and Clashvergence's broader simulation systems are not implemented.

The chart marks **where you are**: a red marker follows the traveler, and **Where I am** centres on it. Bearings are true to the chart: today's hand-built road runs west-south-west across Drent toward Luscia, so the compass, the minimap (turned so north stays up) and the marker all agree (`src/region-layout.js`, `LEGACY_ROAD_TRANSFORM`). The planned rebuild of Drent, Luscia, the Moros Plain and East Suval on the atlas's own hex outlines is specified in [docs/region-rebuild.md](docs/region-rebuild.md).

The journal atlas is an inked parchment chart generated from the developed World Builder map: the same hex geography, region borders and rivers, drawn with smoothed coastlines, a hatched sea, mountain, hill, forest, marsh and dune glyphs, calligraphic province names tilted along elongated provinces, ships, a compass rose and a cartouche. Cape Thalmagar is left unlabeled. Zoom, pan and regional focus are unchanged. The minimap and the local trail charts use the same parchment-and-ink palette. The playable terrain is an authored interpretation of this opening locality, not a map-scale terrain conversion. Developer selection reuses the exact region polygon paths from that atlas; it does not alter normal map navigation or draw invented country borders.

The local trails chart and minimap read the playable world's existing roads, buildings, and landmarks. Shared water metadata copies the rendered shoreline, pond, and river outlines for those charts; it changes neither the world geometry nor the continental atlas.

`assets/azhora-dev-regions.json` contains **3,733 region-assigned hexes across 131 regions**, exported read-only from `azhora.wwmap`. It uses the same pointy-top axial projection and source SHA-256 as the normal atlas. The checked-in export is based on **`b36c32babaf85213a93459c87eeabe79455268db714681f88444831a221588df`**. The developer loader rejects mismatched map and survey exports instead of silently combining different geography.

Existing sources were read from `../world-builder/` and `../../python/Clashvergence/`. Key references are:

- `../world-builder/azhora_lore/geography/regions/drent.md`, `luscia.md`, `elagos.md`, `moros.md`, `suval.md`, `peblos.md`, `pueth.md`, `amod.md`, `nesdor.md`
- `../world-builder/azhora_lore/geography/regions/izol.md`
- `../world-builder/azhora_lore/geography/regions/thalmagar.md`
- `../world-builder/azhora_lore/geography/regions/oremindi.md`
- `../world-builder/azhora_lore/geography/regions/north_azhora.md`
- `../world-builder/saved_maps/azhora.azmap` and `azhora.cmap.json`
- `../world-builder/map/resources/examples/azhora.wwmap`, exported into the offline journal atlas.

The spelling **Azhora**, **Drent**, **Luscia**, **Elagos**, **Izol**, and **Izolveth** follows those files. **Tidehaven**, the Avrel clearing, the named local NPCs, ponds, roadside landmarks, errands, and dialogue are new connective material; the region shapes, names and neighbours are the authored atlas. They do not modify the source lore or claim to be previously established canon.

The first goblin encounter adapts the requested pacing of `../../cromonsters`: a village introduction, audible warning, visible goblin arrivals, readable combat, and a forgiving retry. The bramble raiders and these particular encounters are original procedural creatures and scenes.

## Code and validation

New to the code? [docs/codebase-map.md](docs/codebase-map.md) is a guided map of it: how the page, the host and the pure modules fit together, one module and its test read line by line, a tour by area, and an index of every file in `src/`.

| Module | Responsibility |
| --- | --- |
| `src/world.js`, `src/regions.js` | Terrain, regional layouts, paths, props, collision, fishing banks, landmarks, and completed-site visuals |
| `src/characters.js` | Procedural traveler/NPC/goblin models, clothing, and articulated animation |
| `src/game-state.js` | Movement, collision, and first-shore tutorial transitions |
| `src/signs.js` | The one sign language: fingerposts, place boards, notice plaques, border stones and milestones from one lettering atlas |
| `src/languages.js`, `src/linguist.js`, `src/word-frequency.js` | The fourteen tongues of Azhora and their dialects; what the traveler understands of what is said to him, and the commonest words of this game's own speech, which is the order he learns them in (`docs/languages.md`) |
| `src/fortification.js`, `src/fortworks.js` | The shared fortification standard (wall, wall walk, towers, two gates, ditch) as a ground plan, and its drawing in timber or stone |
| `src/outpost.js`, `src/moros-works.js` | The Ambroni outpost and the border stockade to that standard, the Moros gate and the Moros wayside |
| `src/frontier.js`, `src/frontier-works.js`, `src/frontier-ridges.js`, `src/frontier-ridge-works.js`, `src/closed-border.js` | Elod's closed frontier with Luscia, solid limestone ridges and guarded barred hill passes around East Suval, and the closed-region entry rule |
| `src/places.js`, `src/place-works.js`, `src/wayside.js`, `src/scenery-builder.js` | The built-up places of Drent and Luscia, the wayside on the empty roads, and the merged vertex-coloured builder they share |
| `src/rena.js`, `src/rena-works.js`, `src/rena-people.js`, `src/rena-letters.js` | The three Renas: the razed town at Drent's centre, Applegarth to its west, the old road between them, their people, and the Ardrys' letters |
| `src/town-life.js` | Townsfolk, the outpost's Legion and Coalition garrisons (staked through `occupation.js`), Elod's frontier guard and the figures on the walls |
| `src/journey.js`, `src/journey-content.js` | Ordered road quests, rewards, versioned progress, and optional NPC dialogue |
| `src/campaign-world.js` | Campaign atlas: difficulty levels, factions, threats, settlements, transcript name aliases, hex adjacency and terrain summaries |
| `src/campaign.js` | The branching civil-war main quest: fork, battles with side-quest odds, regional arcs, trust and exposure, missions, map control, validated saves |
| `src/autopilot.js`, `src/autoplay-smoke.js` | Autoplay: quest planner, trail-following navigation with collision probing and stall detours, combat policy, dialogue pacing; the rendered end-to-end check |
| `src/forest-places.js`, `src/forest-story.js` | Six woodland places, optional Tamsin errand, shrine repair, journal notes, dialogue, and exactly-once rewards |
| `src/forest-ecology.js` | Instanced understory plants, mossy logs, deer, foraging/fleeing thrushes, butterflies, bees, and dragonflies |
| `src/spider-den-scenery.js` | Permanent thorn canopy, spiked bramble canes and web strands screening the spider's emergence in Ben's quest |
| `src/nothom-thickets.js` | Varied bramble patches in the exact west and northwest Nothom hexes; roads and quest approaches stay clear |
| `src/quest-homes.js` | Named Ambron homes, mailboxes, thresholds and porch approaches for Cagney, Ben and Troy |
| `src/home-residents.js`, `src/home-resident-host.js`, `src/home-return-routes.js`, `src/home-ferry-view.js` | Saved independent walks home, ferry leg, indoor residents and knocking to ask them outside |
| `src/home-residents-smoke.js` | Native reward-to-home, checkpoint and doorstep interaction checks (`--homes-checks`) |
| `src/forest-hideout.js`, `src/forest-hideout-world.js`, `src/forest-hideout-watch.js` | Optional two-scout encounter, marked approach, camp and lookout props, stolen supplies, and Tamsin's one-time reward |
| `src/woodland-life.js`, `src/road-life.js`, `src/road-verges.js` | Squirrels, forage, instanced regional animals, and small botanical patches |
| `src/drent-wildlife.js`, `src/drent-birds.js` | Resident woodland animals and bird habitats across Drent; stable homes, local animation and distance culling |
| `src/regional-wildlife.js`, `src/west-regions-life.js` | Regional animal habitats and shared instanced wildlife; West Suval has persistent ground-animal bands throughout its usable countryside, with Solis, road and quest-site exclusions |
| `src/acorn-quest.js` | Lysa's atomic turn-in and relationship memory |
| `src/inventory.js`, `src/weapons.js`, `src/consumables.js` | Satchel UI, item stacks, wear, equipment, repairs, and guarded food consumption |
| `src/campcraft.js` | Fishing timing, catches, fire fuel, and cooking exchanges |
| `src/combat.js`, `src/combat-view.js` | Deterministic encounters, stamina, tells, coordinated enemies, effects, and retry/retreat |
| `src/road-audio.js` | Optional local ambience, surface footfalls, nearby calls, and effects |
| `src/road-checkpoint.js`, `src/woodland-progress.js` | Validated first-shore/road saves, woodland gathering/history, camp state, and legacy compatibility |
| `src/world-map.js`, `scripts/export-world-map.mjs` | Offline parchment chart generated from the World Builder map (coast, border and river chaining, terrain glyphs, tilted labels, uncharted names), zoom/pan/focus |
| `src/local-map-data.js`, `src/trail-map.js`, `src/minimap.js` | Read-only regional chart data, discovery-aware journal maps, optional pins, and the player-centered local minimap |
| `src/developer-atlas.js`, `scripts/export-developer-atlas.mjs` | Exact atlas selection polygons, authored hex survey export, destination provenance, and schematic local route |
| `src/developer-mode.js`, `src/ghost-camera.js` | Paused adventure isolation, developer controls, translucent spectator, free flight, atlas UI, and scene switching |
| `src/thalmagar-world.js`, `src/survey-world.js` | Separate fortress study and illustrative terrain survey scenes, with resource cleanup |
| `src/main.js` and the CSS files | Renderer, input, camera, game flow, HUD, journals, and panels |
| `main.cjs`, `preload.cjs`, `scripts/checkpoint-store.cjs` | Desktop window, local asset server, isolated IPC, and atomic disk checkpoint storage |
| `src/road-smoke.js`, `src/road-traversal.js`, `src/road-check-smoke.js` | Rendered gameplay, continuous walking, intermediate saves/reload, audio, and F8 checks |
| `src/forest-smoke.js`, `src/developer-smoke.js` | Rendered woodland errands, saved forest state, developer flight, atlas selection, and scene-isolation checks |
| `src/local-map-smoke.js` | Actual local-map controls, anonymous unexplored places, physical discovery, independent tracking, and adventure/save isolation |
| `vendor/` | Three.js 0.185.1 modules and MIT license |

`npm test` runs the Node test suite for the campaign atlas and branching campaign, the autopilot planner and navigator, movement, ordered and optional quests, inventory, repair supplies, weapon condition, combat, campcraft, collectible reachability, ecology, audio lifecycle, checkpoint compatibility/storage failures, exact atlas selection, ghost flight, the Thalmagar scene, and local-map projection, discovery privacy, and rendering.

`npm run test:game` runs the actual renderer in an offscreen Electron window. It exercises the boat arrival, movement, dialogue, tutorial practice, defeat/retry, the tutorial and meadow battles, satchel tooltips and food, atlas navigation, Lysa's favor, forest campcraft, all three road quests, replacement bridge timber, river fishing, physical bridge traversal, checkpoints, and F8 travel. Enemy travel is shortened with test-only positioning while attacks still use normal input, timing, and damage. This is a correctness walkthrough, not a performance benchmark.

`npm run test:autoplay` starts autoplay on the opening screen and watches the computer play the whole road to Iven's relay at real walking speed, checking that no step teleports, that a synthetic key press cannot take control, and that a hand-over and resume work. It takes several minutes.

`npm run test:road` holds real movement controls for the complete northern road and return trip, checking collision and the final boundary. `npm run test:checkpoints` checks intermediate autosaves, actual WebAudio, testing from meadow defeat, and Continue in a fresh renderer. It restores an unfinished bridge quest while standing on the repaired deck. Both commands use the isolated test save slot.

`npm run test:forest` exercises the optional woodland trail, Tamsin's bundle, the shrine repair, journal notes, and a fresh-renderer reload of saved forest progress. `npm run review:forest` captures the six places, wildlife, and dialogue at desktop and compact sizes. The full story walkthrough has also passed with these forest additions in place.

`npm run test:hideout` exercises the optional goblin camp, its supply recovery and reward, and restoration of saved camp progress. `npm run review:hideout` captures the approach, camp, dialogue, and cleared state for visual review.

`npm run test:local-map` exercises L, the clickable minimap, all four regional charts, anonymous unexplored markers, physical woodland discovery, marking and clearing a known place, paused movement, and unchanged adventure/save data. It also checks that J and M retain their journey and World Builder behavior. `npm run review:local-map` captures the local charts and minimap at desktop and compact sizes.

`npm run test:developer` exercises atlas selection, local/Cape/survey visits, ghost movement and boost controls, return to the ordinary player, and isolation from saved progress. `npm run review:developer` captures the developer atlas and inspection scenes. These are correctness and visual checks, not claims that terrain surveys contain finished gameplay or that a target frame rate has been established.

The landscape keeps large static scenery batches local to each region, groups every region's trees, rocks and ground cover into small per-hex-block instanced batches, and divides the whole ground into 49 tiles sharing one vertex buffer. This preserves terrain resolution while letting the renderer skip ground and scenery behind the camera. Across twelve matched camera views, district batching submitted about 14% fewer triangles than the single-batch baseline for 11% more draw calls (`tests/regions-world.test.js` prints the totals). The rendered traversal of the whole road observed mean frame intervals of 21-26 ms per region (`tests/artifacts/road-traversal.json`). These are geometry, call and wall-clock observations, not an FPS benchmark.

For a fresh visual/culling comparison, run `node scripts/launch.cjs --smoke-test --road-review`, then add `--unbatched-world` for the baseline. Normal play always uses district batching. The comparison does not write a player checkpoint.

Focused native checks are available through `npm run test:road-skills:desktop`, `test:fishing-lessons:desktop`, `test:fire-making:desktop`, `test:woodcutting:desktop`, `test:visual-arts:desktop`, and `test:ambush:desktop`. They use real dialogue choices, interactions and frame updates; only player travel used to reach a test location is shortened.

The harness writes results and desktop/compact screenshots to `tests/artifacts/`. `npm run test:window` separately verifies native fullscreen coverage, F11/Alt+Enter toggles, and Escape behavior. After changing the source World Builder map, run **both** `npm run map:refresh` and `npm run map:developer` to regenerate matching normal-atlas and developer-survey assets. Neither export writes to the World Builder source.

Each test launch uses its own temporary Electron profile under `tests/.electron-profiles/`, removed when that test exits. Offscreen checks keep their saves in memory and do not share the normal game's Chromium cache.

The three coastal ferry hosts are Jess in Tidehaven, Maddie in Port Calos, and Hallie in Cobble. Each offers both other ports and a Swimming lesson; they remain residents of their home port. Port Calos is a five-building settlement on its single land hex, with the harbor extending to the water. `npm run test:port-calos` exercises all six crossings, lessons, and reloading at each destination.

Paradise Springs (Vaervelm Caelazh) occupies the land hex southeast of Port Calos, reached by a lane from town. Its three residents are Rob, KAT and MAT. KAT and MAT introduce the standalone Wine skill, as can Ben, Liz and Troy; Wine requires no Farming experience. Rob's viticulture lessons are a future Farming branch with a provisional level-5 requirement. His muted book-and-padlock marker shows when that prerequisite is unmet; his dialogue displays the player's level and clearly identifies the lessons as not yet available.

Liz now lives beside a small cottage, a working apiary with straw skeps and wooden hives, and a fenced flower-and-herb garden. Her original interaction point and Mop's return approach remain open.

[Cagney and the Cagnappers](docs/cagney-escort.md) is an optional escort west from Caelom's fork to Ambron. F8 includes a dedicated quest playtest; `npm run test:cagney:autoplay` checks the complete walk, ambush, and reward through ordinary game inputs.

The desktop icon is an abstract gold sun and winding coastal path over teal water. `scripts/create-icon.ps1` generates its seven ICO sizes; `scripts/create-desktop-shortcut.ps1` updates the shortcut without restarting a live game.

`npm run test:winery` checks the five Wine teachers through their actual dialogue buttons, ROB's Farming-gated viticulture placeholder and marker, the three-winemaker cast, and Katy's quest-free Port Calos greeting. `src/winery-lessons.js` keeps viticulture separate from the Wine skill.
