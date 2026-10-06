# The Farmlands of the Lizeem

Design record, begun 5 October 2026. **Design only: the user has not authorised building.** His words: "come up with this whole system, design it, ask questions as you need to, and once we refine your questions, I'll tell you when to implement it."

How to read this file:

- Section 0 lists what the user has decided, in his words. Everything else is a proposal built on those decisions.
- Sections 1 to 5 cover the wizard, the master sorcerer, the farming skill and the four quest arcs.
- Section 6 is the people of the five regions. Section 7 is the economy. Section 8 is what would have to be built, and in what order.
- Section 9 lists the questions still open.
- The appendix holds coordinates, file names and sources for whoever builds it.

Numbers marked *first pass* are starting values to be tuned in play.

---

## 0. What the user has decided

| Date | Decision | His words |
|---|---|---|
| 5 Oct | The Developer Start character is a brown-cloaked grey wizard with only an oaken staff. | "a dark brown hood and a gray beard, wears a brown cloak, and is basically a brown-cloaked, gray wizard character… equipped just an oaken staff" |
| 5 Oct | He is a new character called **Rollo**, in a grey robe. | "Make the character named Rollo. He is a new character. sure gray robe." |
| 5 Oct | Rollo starts the game knowing **Fireball**, cast through the staff. | "Let's make Rollo start with the fireball spell through his staff, so he knows fire sorcery to begin with." |
| 5 Oct | He starts right outside the Sorcerers' Tower in Minora. | "right outside of that Sorcerer's Tower in Menora" |
| 5 Oct | A master sorcerer inspired by Merlin stands outside the tower. He has several things to talk about and, for now, one quest. His name is **Taleth**. | "The master sorcerer is called Taleth." |
| 5 Oct | The quest is the farmlands of the Lizeem: long-term, four countries, each with its own foods and way of farming, four quest arcs. | "a long-term farming quest that really levels up your farming and fleshes out the farming skill" |
| 5 Oct | The four countries are **Caricas, Nethereum, Nesdor and Ovesos**. Eer is not one of them. | "Ovesos is the fourth region" |
| 5 Oct | Ovesos is not orc country. | "Ovesos is not an orc region… That's never the case." |
| 5 Oct | Ovesos is fertile along the river and dries out toward the desert in the south and west. It is the least productive of the four but still substantial farm country. | "pretty fertile, especially along the river, but as it gets nearer to the desert and inland (the south and west parts of it), it becomes more desertified" |
| 5 Oct | People are to be added as needed in the five regions (the four countries and Isareos with Minora), with backstories drawn from the lore and roles in their society. | "go ahead and add people characters as needed with mythological names… Give them roles in the society" |
| 5 Oct | Merchants to trade with, and an economy in which harvests are partly sold for coin. | "Work on that economic system. I would think harvest is partially in the coin economy, so I guess there would be buyers in coin for the harvest." |
| 5 Oct (recorded by Codex in `docs/design-answers.md`) | The five regions are the Minoran League, independent of Ambron for under a year. Cedric seized Minora and the League's government; Wilhelm has just arrived to reinforce him; Caricas, Nethereum, Ovesos and Nesdor are each in rebellion against the League he holds. | "Caricas, Nethereum, Ovesos and Nesdor each wage a separate independence rebellion against the now Cedric-controlled League." |

Standing defaults, because the question was asked and not answered: Taleth wears no hat; the farming techniques are sorcery cast with the staff; each country's arc is about an hour of play.

Still open: whether the quest touches the war (section 9, question 1), and whether "mythological names" was meant literally (question 2).

---

## 1. The idea in brief

Rollo, an old sorcerer in a brown cloak, begins outside the Guild's tower in Minora. Taleth, the Master Sorcerer, sends him down both banks of the Lizeem to bring four farm countries back to work. Each country farms in its own way, grows its own crops and has its own people, markets and troubles. Rollo works the land, sells part of what he grows, carries the best of it back to Minora, and earns a piece of field sorcery from Taleth for each country he restores. When all four are done, the city holds the Dividing.

What already exists and is reused: saved crop beds with five crops (`src/gameplay/skills/farming/farming.js`), 53 plantable beds of which 17 are on five empty farmsteads in Caricas, the RuneScape-style level table, cooking recipes, and the play clock (one second of play is one game minute).

What is new: one way of farming per country, crops that grow only in their own country, quality grades and a measurer's seal, a ledger of the river's foods, forty-odd people with roles and backstories in five regions, and an economy in which part of every harvest is owed in kind and the rest can be sold to buyers with limited appetites.

---

## 2. Rollo

**Who he is.** A wandering sorcerer of the Guild, grey-bearded, back at the tower after long years on the road. That is all the game says about him: like Cromb, he is left open for the player. He is a twelfth playable character, offered only by Developer Start for now and kept out of the Chapter 1 character list.

**Look.**

- Long grey beard and grey hair.
- Grey wool robe to the ankle.
- Long brown cloak over it.
- Dark brown hood, worn up.
- Oaken staff in the right hand.

The robe, beard and staff exist in the figure kit. Two parts are new: a long cloak with its own colour, and a hood worn up. (The kit's hood is a cowl pushed back, and the only deep hood belongs to Mark the doomsayer.)

**Kit.** The oak staff, equipped. No sword and no shield. The usual 24 copper.

**Sorcery.** He knows Fireball from the first moment and casts it through the staff. The staff is already a spell focus in the game: it strengthens a spell and slows the cast. As a club it is weak, less than half the sword's damage, so Fireball is his real defence.

- Ben in Nothom stays the only person who *teaches* fire. Ben's quest offers a choice of coin or the Fireball lesson; for Rollo the lesson is greyed out as already known.

**Where he starts.** On the paved forecourt on the south side of the tower, facing its door, with the camera tilted up enough to show the tower. Taleth stands a few steps ahead and to the right. The first objective reads "Speak with the Master Sorcerer."

---

## 3. Taleth and the charge

**Who he is.** Taleth, Master Sorcerer of the Guild at Minora. "Master Sorcerer" is the first Guild rank the game names.

**Look (proposal).** Very old and thin, with a long white beard, white hair to the shoulder and a midnight-blue robe. Bare-headed unless the user asks for a hat (the project rule is no hats without his say).

**Backstory (proposal).** He was a foundling. A Nethrani weir-keeper pulled him from a fish weir on the Neth as an infant, after a flood year, and the family gave him to the Guild. He has never known his mother's name. He has kept the Guild through three reigns and is now too old to walk the valley. He sometimes answers a question a moment before it is asked. (The weir, the foundling and the habit are a quiet nod to Taliesin and Merlin; nothing in the game says so.)

**What he will talk about.**

1. **The Guild and the tower.** What the Guild is, and why its tower stands at the fork.
2. **The river.** The Lizeem, the fork, and the four countries below it.
3. **The war in the valley.** How Cedric took the city and the League's government, why Wilhelm's army is at the gate, why the four countries down the river are in rebellion, and who eats the valley's grain. The Guild's position: it measures the river for the river, not for the crown.
4. **Sorcery.** What it costs, why he will not teach fire, and what he does teach.
5. **The farmlands of the Lizeem.** The quest.

Later quests appear as locked topics, following the rule that an unavailable lesson is shown as locked.

**Why a sorcerer cares about farms.** Every year before the Dividing, the Guild takes *the Measure of the River*: a walker goes down both banks and brings back the best of what each country grows, sealed by a Minoran measurer and laid up in the tower. The Guild's workings draw on a living valley, and the Measure is how it knows the valley is alive. Nobody has walked it since the League broke with Ambron. The rebellion took the farmers, Cedric's garrison holds the Caricas granary, the farmsteads stand empty, and Taleth is too old to go. He sends Rollo, with a warning: down the river, a man from Minora is a man from Cedric's city until he proves otherwise.

The Measure Houses, their seals and the Dividing come from the lore's Minora (`geography/regions/minora.md`). The Guild is the user's own addition of 30 September, so the Guild's part in the Measure is new.

**What he teaches.** Field sorcery, a school nobody else teaches:

| Working | When | What it does |
|---|---|---|
| *Sound the Soil* | When he gives the quest | Plant the staff by a bed and see what it needs: how rested it is, how wet, how salt. It also gives the lore's farmer's test: soil that rolls into a cord and breaks when bent is ready; soil that smears is too wet; soil that crumbles has missed its moment. |
| *Call the Dew* | After Caricas | Waters every bed on a farm at once. |
| *Quicken* | After Nethereum | Ripens one bed at once. Once per game day. |
| *The Work of Nine* | After Nesdor | Sows or reaps a whole farm in one act. |

Each working costs focus, as Fireball does. Harvesting gives a little focus back. Ovesos pays in a different coin: a senior water right and the use of the mill (section 5).

---

## 4. The farming skill

### 4.1 What the best farming games do, and what is borrowed

| Borrowed idea | From | Here |
|---|---|---|
| Crops that grow only in their own country | Valheim | Each country's crops need its soil. |
| Crops grow while you are away, and ripe crops wait | Old School RuneScape | Growth runs on the play clock. Nothing rots. There is no disease and no daily watering. |
| A circuit of scattered plots | Old School RuneScape | The round: two loops out of Minora, one down each bank. |
| Quality as the measure of skill | Stardew Valley, Sakuna | Good, Fine and Prize grades. |
| One hands-on idea per place | Sakuna's water gates | One new way of farming per country. |
| Do it by hand first, then earn the shortcut | Stardew's sprinklers | Taleth's workings. |
| A ledger of named goals | Stardew's Community Center | The Measure. |
| Standing orders | RuneScape's farming contracts | Orders posted by buyers (section 7). |

### 4.2 The base, unchanged

A bed is planted, watered once if you choose, and harvested. Seeds for the starter crops stay free. This is today's `src/gameplay/skills/farming/farming.js`, and old saves keep working.

### 4.3 One new idea per country

| Country | The idea | In one line |
|---|---|---|
| Caricas | **Rotation** | Each bed remembers its last crop. Rested ground gives better harvests; the same crop twice tires it. |
| Nethereum | **Timing the water** | Drown the meadow, then draw the water off when the silt shines. Too soon is thin; too late is sour. |
| Nesdor | **Right crop, right ground** | The strips of the Flats lie at different heights above the water, and each height suits one crop. |
| Ovesos | **Sharing the water** | Water comes by turns. A set measure is divided among your beds, and too much salts the ground. |

Each idea is one extra decision per planting. None of them is a daily chore.

### 4.4 Quality

Every harvest has a grade: **Plain, Good, Fine or Prize.**

- The grade comes from how well the country's own job was done, whether the bed was watered, and the farmer's level.
- A wrong choice gives Plain produce. It never kills a crop.
- Fine and Prize produce cooks into better food, sells for more, earns more experience, and is what the Measure asks for.
- Outside its home country, produce counts as Fine or Prize only if a measurer has **sealed** it (section 7). Unsealed, it sells as Plain.

To keep the satchel readable, the game stores two kinds of each crop, ordinary and fine. A Prize harvest is recorded in the Measure at the moment it is sealed.

### 4.5 Time and travel

- Crops grow on the play clock. A quick crop takes two to four minutes, a main crop six to ten, a signature crop fifteen to twenty-five. Trees and coppice, once established, bear every ten to twenty minutes. *First pass.*
- A season lasts about 36 hours of play and the game has no weather, so seasons do not gate crops. The flood in Nethereum and the water turns in Ovesos are things Rollo operates, not things that happen to him.
- The banks of the Lizeem join only at Minora. The round is therefore two loops: east over the White Bridge to Caricas and on to Nesdor, and west over the Pilgrims' Bridge to Nethereum and on to Ovesos. Each loop is about a kilometre out. Taleth and the Minora market sit in the middle of both.

### 4.6 Levels

The level table is the game's existing one (level 20 is 4,470 experience, level 30 is 13,363, level 50 is 101,333). Finishing all four arcs should land near level 30. *First pass:*

| Level | Opens |
|---|---|
| 1 | Every country's first crop: bridge rye and field beans (Caricas), flood oats (Nethereum), rye and barley on the Flats (Nesdor), barley and millet (Ovesos). Good grade. |
| 2 | Beets (existing). |
| 3 | Soft fruit canes (Caricas). |
| 5 | Meadow hay, first cut (Nethereum). Fine grade. Drent leaf (existing). |
| 7 | A second farmstead (Caricas). |
| 8 | Floodwheat on the wet strips (Nesdor). |
| 10 | Hard wheat (Ovesos). The second hay cut (Nethereum). |
| 12 | Hazel coppice (Nesdor), the first long-lived crop. |
| 14 | Orchard trees of your own (Caricas). |
| 16 | Plots below the reliable line (Nethereum): richer, with a small chance the water takes the crop. |
| 18 | The dye crop (Ovesos), grown only to sell. |
| 20 | Prize grade. Seed-saving: keep your best seed and the next sowing starts a grade higher. |
| 24 | Long strips (Nesdor). More farmsteads (Caricas). |
| 28 | A senior water right can be bought outright (Ovesos). |
| 30 to 50 | Grafting, a farmstead of your own, and your own seal as a measurer. To be designed once the first arcs have been played. |

Experience comes from harvests (about 25 for a starter crop, up to about 120 for a signature crop), from each quest step, and from a lump at the end of each arc. The skill's existing rule stands: nobody's permission is needed to begin.

### 4.7 The Measure

A page in the journal. It has four leaves, one per country, and each leaf has four lines: the country's three crops and its dish. A line is filled when Rollo brings that food to Minora at Fine or better and a measurer seals it. Prize entries are marked in gold.

A full leaf ends that country's arc. Four full leaves bring the Dividing.

---

## 5. The four countries

Each arc has the same five steps:

1. Arrive, meet the teacher, and sow.
2. Learn the country's way.
3. Deal with the trouble.
4. Bring in a Fine harvest.
5. Cook the country's dish, have it sealed, and carry it to Taleth.

The arcs can be taken in any order. Each country's first crop needs no level, and its signature crop needs between 3 and 10.

### 5.1 Caricas: the rested ground

**The place.** The valley across the White Bridge, in rebellion against the League that Cedric holds. A market town with a granary and a grain court held by his garrison, and five farmsteads with seventeen beds and nobody farming them: the families are in the upland with the rebellion, or keeping their heads down. Along the river runs the fox keepers' woodland. From the lore: barley and rye on the valley margins, vegetables and soft fruit on the terraces, coppice, charcoal and mushrooms from the wood, and a Water Council in which the fox-keeper families speak by how long they have kept their stretch of bank.

**The way of farming: rotation.** A bed remembers what it last grew and how much heart it has left. Beans and a rest put heart back; grain and fruit draw it down. Each crop wants a certain heart: soft fruit and barley want rich ground, and bridge rye wants lean ground and lodges on rich. So the rotation that comes up Fine is beans, then fruit or barley, then rye, then beans again. The same crop twice running comes up Plain.

**Crops and foods.** Bridge rye (the lore's Minoran bridge rye, "the grain of practical people", which does best on lean ground and falls over on rich), field beans, soft fruit. Rye loaf with onion and river cheese, bean pottage, soft-fruit tart.

**The steps.**

1. Cross the bridge and find the North Farm idle. The Voice of the Council lends it for a season, for a share of what it bears.
2. Sow rye in two beds and beans in two. Harvest, swap them over, and see the rye come up Good on the bean ground.
3. The trouble (see question 1): either the garrison captain's quartermaster claims part of the first harvest for Cedric's granary, and Rollo hands it over or hides a share for the families in the upland; or rust takes a bed sown rye after rye and has to be broken with beans and a rest.
4. Bring in Fine rye.
5. Bake the tart, have it sealed at the grain court, and carry it to Taleth.

**A small wonder: the fox's regard.** Now and then a river fox watches from the bank while Rollo works. If he finishes the job without walking at it, that planting is marked as *regarded*: it comes up one grade better and is written in the farm's record. This is the Caricans' *vel-caric-oss* from the lore.

**What he earns.** *Call the Dew*, the offer of a second farmstead, and the first hired hands returning to the farms.

### 5.2 Nethereum: the deep water

**The place.** The wet hollow across the Pilgrims' Bridge, between the Isa and the Neth: the greenest ground in the west. From the lore: villages built on ridges and hummocks above the *haethoss*, the reliable line; oats sown on fresh flood silt; hay cut twice where the neighbours cut once; short-legged Nethrani cattle; fish weirs on the Neth; a Flood Council that meets on the levee; and the Flood Recall, the spoken list of everyone the water has taken.

**The way of farming: timing the water.** Rollo opens the hatches and drowns the meadow. The water goes in black, the silt settles and shines, and then the frogs start. Drawn off at the shine, the meadow gives Fine oats and sweet hay. Drawn off early, the silt is thin. Left to the frogs, the ground sours. (Blackwater, Siltshine and Frogcall are the lore's own names for the phases of spring.)

**Crops and foods.** Flood oats, meadow hay, weir fish. Oatcakes, smoked fish.

**The steps.**

1. Cross the Isa and climb to the ridge hamlet. The meadow hatch is broken, and the man who kept it is ashamed of it.
2. Mend the hatch with planks and ironwork, drown the meadow, and learn the three states of the water.
3. Sow oats on the silt and take the first cut of hay.
4. The trouble: wolves come for the cattle on the new grass, and Rollo drives them off with fire.
5. Bring in Fine oats and the second cut, make oatcakes with smoked fish, and stand at the Flood Recall. One of the names spoken is Taleth's mother. Carry the dish and the name back to him.

**What he earns.** *Quicken*, and a plot below the reliable line for those who want the risk.

### 5.3 Nesdor: right ground

**The place.** The east bank below Caricas: shallow valleys with hazel and oak at their heads, then the Flats, dark river soil with shallow water braiding across it. From the lore: "the land between the counted waters", with no water councils and no single government; barley, rye and some wheat; nut woods and charcoal; cattle and sheep on the open ground; and the Nesdor Way, the trade road whose towns sell lodging, stabling and legal advice.

**The way of farming: right crop, right ground.** The strips of the Flats lie at different heights above the braided water. The lowest are still wet, and nothing sown there thrives. The benches just above them flooded in spring and have drained, and that is floodwheat's ground: in the lore's words, "it likes wet feet in memory, not in fact". Barley takes the middle. Rye takes the dry rises, where the lore says it prefers a little hardship: "If the field flatters rye, plant wheat." Hazel grows on the valley sides. The right crop on the right strip comes up Fine. The wrong one comes up Plain, and the beginner's mistake, sowing floodwheat on the wettest strip because of its name, is the first thing the farmer warns against.

**Crops and foods.** Floodwheat, rye, hazelnuts. White bread, nut cake.

**The steps.**

1. Walk south from Caricas and ford the Carica. Meet a farmer whose nine hired hands are gone.
2. Learn to read the strips, by *Sound the Soil* or by what grows wild on them, and sow three strips rightly.
3. Reap a long strip by walking it. The district's champion reaper offers a match.
4. The trouble (see question 1): either foragers come for the grain, Cedric's men from the north and the rebellion's from the Flats, and Rollo gives, bargains or drives them off; or rooks and geese settle on it and have to be scared off.
5. Bring in Fine floodwheat, bake white bread and a nut cake with hazelnuts from the valley head, have them sealed, and carry them to Taleth.

**What he earns.** *The Work of Nine*.

### 5.4 Ovesos: the shared water

**The place.** The west bank below Nethereum, reached by the Neth ford. By the user's ruling of 5 October it is fertile along the river and dries toward the desert in the south and west: the least productive of the four, but real farm country. From the lore: a kingdom under King Melos; a Water Council of families ranked by the age of their water right; freeholders and tenants below them; herders on the upland; barley, hard wheat and lesser grains watered by channel; grain mills and fulling mills; wool that sells as far as Gala; and three public reckonings a year, the Planting Feast, the Allocation Settlement and the Harvest Close.

**The way of farming: sharing the water.** Water comes down the canal by turns, the oldest right first. Each turn gives Rollo a set measure to divide among his beds. Hard wheat is thirsty. Barley and millet are not. Too little water gives a Plain crop, and too much leaves salt in the bed, which spoils the next crop unless it is barley or the bed is rested. The oldest rights lie by the river and the newest out at the dry end of the canal, so the user's picture of the country is also the ladder Rollo climbs.

**Crops and foods.** Hard wheat, barley, silver millet (the lore's quick, pale "honest grain", sown late and in small rounds, which landlords call poor grain and mothers call honest). Flatbread, millet porridge. The lore also makes household millet patches exempt from seizure for debt, so millet pays no water dues (section 7).

**The steps.**

1. Ford the Neth and reach the village. The Council's clerk enters Rollo as the most junior right on the canal, with a dry plot at its tail.
2. Take the first turn of water and divide it among barley and millet. Learn what salt does.
3. Help the canal-warden clear the head of the canal, bring in a full barley harvest, and be moved up a turn. Sow hard wheat.
4. The trouble: the oldest house on the canal takes water out of turn. Rollo brings it before the Water Council, arguing from the clerk's register, from a neighbour's witness, or by settling it quietly. The first question in Ovesos is always who was here first and what the document says.
5. Bring in Fine hard wheat, have it milled, bake flatbread, have it sealed, and carry it to Taleth.

**What he earns.** A senior water right, the use of the mill, and his name read out at the Harvest Close.

### 5.5 The Dividing

With all four leaves of the Measure full, Taleth holds the Dividing on the forecourt. He pours river water into four bowls, one for each country, and the city eats **fork stew**: Minora's own dish in the lore, a thick stew of grain and fish. This one is made with rye from Caricas, oats from Nethereum, wheat from Nesdor and Ovesos, and fish from the Nethrani weirs. Rollo cooks it.

Taleth's other topics open after it.

---

## 6. The people of the five regions

### 6.1 How they are made

- Every person has a role taken from their country's own institutions in the lore, a reason to matter to a farmer, a backstory, a look, and a build tier: **A** with the first build, **B** with their country's arc, **C** as enrichment.
- **Names.** The user asked for mythological names, and the game already names its smiths from myth (Goibniu, Wayland, Hephaestus). Each country draws on one tradition, so a name says where someone is from: Egyptian in Minora, Roman in Caricas, Welsh and Irish in Nethereum, Norse in Nesdor, Mesopotamian in Ovesos. The figure chosen always fits the person's work. If the user meant Mittoli names (question 2), each name is rebuilt from the Mittoli profile's parts (onsets such as *mel, sor, tal, vel*; endings such as *-eth, -or, -an, -os*), as Taleth and the lore's Melos and Pereth are.
- **Looks** are written in plain words; the builder maps them to the figure kit, whose parts are listed in the appendix. No hats, by the project rule (Bolverk's hood is pushed back). Every look below needs the user's yes; without it a person is a grey placeholder.
- **None of these names is in use.** The game's named cast was checked (about 330 names). Smiths must come from the game's own register of myth smiths, which is why the toolsmith is Ilmarinen.
- **Politics.** By the user's ruling of 5 October (recorded in `docs/design-answers.md`), the five regions are the Minoran League, which left Ambron within the past year. Cedric seized Minora and the League's government; Wilhelm has just arrived with his army to reinforce him; and Caricas, Nethereum, Ovesos and Nesdor are each in rebellion against the League he holds. Rollo therefore walks out of Cedric's capital into four countries that have reason to distrust a man from Minora. The Guild's position is that it measures the river for the river, not for the crown. How much of this the quest shows is question 1.

### 6.2 Minora and Isareos (12)

| Name (source) | Role | Backstory and what he or she is for | Look | Tier |
|---|---|---|---|---|
| **Taleth** | Master Sorcerer of the Guild | Section 3. | Section 3. | A |
| **Seshat** (Egyptian goddess of writing and measurement, keeper of the House of Books) | Keeper of the Guild's ledger, in the Guild Library across the beck | A grain clerk of a Measure House who caught a great merchant house in a false measure and was ruined for it; the house had friends. Taleth took her in to keep the Guild's own count where no merchant can reach it. Dry, exact, happiest over a properly filled line. She keeps the Measure page, explains grades, and pays a small bounty for the first Prize of each food. | Fifties, grey hair pulled back, narrow, ink on both hands, dark blue tunic | A |
| **Nepri** (Egyptian god of grain) | Sworn grain clerk of the Measure House, at the River storehouse | Broad-shouldered from thirty years of moving sample sacks. Knows which houses lie in which ways. Since Cedric took the city the granary also feeds an army, and he hates writing "requisitioned" in a column that used to say "sold". Seals lots and buys sealed grain for the granary trust. | Sixties, bald, trimmed white beard, leather apron over a brown tunic | A |
| **Imhotep** (the deified architect) | Bridge Warden of the White Bridge | Trained in mathematics, materials, hydrology and law, with a flood season on night watch. The White Bridge is the only crossing of the Lizeem, and she has refused Wilhelm's siege wagons twice: "it does not like lateral load." The only person in Minora who has told the Blood Prince no. Explains bridge law and the toll, and tells the named floods carved on the piers. | Forties, cropped black hair, grey tunic with the Wardens' cord, a plumb line at the belt | B |
| **Satet** (Egyptian goddess of the inundation, shown pouring water) | Bowl-Keeper of the Grand Temple, a Pourer | A boat family's child who nearly drowned at eight and was "received". The temple belongs to the river, not the crown, and she pours for the princes with visible reluctance. Heals for an offering of food, buys dishes for the pilgrims' kitchen, and tells the first-division myth: the river did not submit to Minora; it agreed to be divided. | Thirties, long dark braid, pale grey robe with a blue hem, bare feet | B |
| **Portunus** (Roman god of keys, doors and warehouses) | The Carican factor, at the market by the Lizeem Gate | A fox-keeper family's younger son, sent to the city because he could count. Speaks in short sentences, as Carican submissions are written. Sells Carican tools, charcoal and seed; buys west-bank goods for home. Quietly sends the Council news of the capital. | Thirties, russet hair, stubble, green tunic, a ring of keys | A |
| **Manawydan** (the patient craftsman and trader of the Mabinogi) | The Nethrani factor | So good a trader that Minora's own merchants have twice tried to have her stall moved. Matter-of-fact about loss, as the Nethrani are. Her commission is the fish trade; "consensus is not unanimity" is her answer to every question about the Flood Council. Sells smoked fish, hay and hides; buys east-bank goods. | Fifties, grey braided hair, weathered, an oiled wool cloak | B |
| **Njord** (Norse god of wealth and trade) | The Nesdor carter | Runs a cart on the Nesdor Way between Minora and the Moros, and carries the route towns' orders. Charges for knowing the road and says so. | Forties, blond beard, fur-lined short cloak, a whip through the belt | B |
| **Adapa** (the Mesopotamian sage who was too cautious) | The Ovesian factor | "Among the more experienced inner-branch lobbyists" in the lore. His submissions are twice as long as anyone's and carry three times the genealogy. Eleven years into the Middle Reach proceeding. Sells hard-wheat flour and wool cloth; buys rye, oats, fish and hay. Careful, long-memoried, slightly aggrieved. | Sixties, long grey forked beard, tall, a brown robe with a wide sash | B |
| **Hapi** (the Nile's flood god) | Barge master, at the quay below the storehouse | Of a boat family with a house in Minora, rooms in Nylon and cousins in three branch towns. Knows the river's rising before the Flood Office does. Buys one Fine sealed lot of each good a day for Nylon, and carries news. | Fifties, heavy, grey curls, bare arms, a sailcloth smock | B |
| **Rudiger** (the margrave of the Nibelungenlied, torn between his oaths) | Cedric's commissary, at the western barracks by the Muster Gate | A decent man under orders to feed the garrison and the court from a valley that does not want to feed them. Pays coin for anything, at six-tenths, without limit. Will not say what he thinks of the orders, or of the army camped outside. | Forties, cropped brown hair, moustache, the garrison's tabard, a ledger under his arm | A |
| **Amalthea** (the nurse-goat of Zeus, a cheese-maker by association) | Cheese-maker at a valley-head hamlet in the Isareos hills | Her family grazes cattle and sheep "on grass that never dries out" and makes the river cheese of the bridge workers' loaf. The centaur raids took her summer camp. Sells cheese, buys hay, and teaches the rye loaf with onion and river cheese. | Forties, brown hair under a kerchief, a wool dress with a cheesecloth apron | B |

### 6.3 Caricas (8, and the hired hands)

| Name (source) | Role | Backstory and what he or she is for | Look | Tier |
|---|---|---|---|---|
| **Vertumnus** (Roman god of the turning year and the changing of crops) | Fox-keeper elder; holder of the North Farm; the teacher | His family has kept its stretch of the bank for eight generations and he keeps the sighting record in the standard notation. His sons are with the rebellion in the eastern upland. He can keep the corridor or the farm, not both, so the farm stands idle. Teaches rotation: "The ground keeps the fox. The rotation keeps the ground." | Seventies, stooped, white hair cropped, full grey beard, green tunic, a fox pelt over one shoulder | A |
| **Egeria** (the nymph who counselled King Numa) | Voice of the Council | The rotating office that speaks for the Council and decides nothing. She lends idle farmsteads for a season under custom, answers the garrison captain, and keeps her sentences short. Grants Rollo the North Farm. | Fifties, grey-streaked dark hair in a knot, a long grey-green gown | A |
| **Consus** (Roman god of the stored grain) | Grain factor and sworn measurer at the grain court | Keeps the granary's books under the garrison's eye and his own. Buys the valley's grain, sells seed, seals lots, and posts the orders. | Sixties, round, bald, white moustache, a dusty brown apron | A |
| **Hagen** (the grim retainer of the Nibelungenlied) | Captain of Cedric's garrison in the town | Holds the granary and the bridge road for the League. Correct, cold, and not cruel. With the war in, his quartermaster's claim on the first harvest is the Caricas trouble. | Forties, black hair, trimmed black beard, the garrison's tabard | A |
| **Ilmarinen** (the Finnish smith who forged the Sampo, the mill that ground out grain) | Toolsmith of the eastern upland, at the town workshop on market days | Works the small iron and lead diggings of the upland shelf into the farm tools the inner-branch markets know. Sells the hoe, the sickle, the pruning hook and the water yoke in wood, iron and steel. His name comes from the game's own register of myth smiths (`MYTH_SMITHS`), where it is still unused. | Fifties, soot-dark, bushy grey beard, leather apron, burn scars | A |
| **Pomona** (Roman goddess of orchards) | Orchard-wife of the East Orchard | Shut her gate when the soldiers came and has not opened it since. Opens it to a man who rests the ground properly. Sells fruit canes and preserves, buys soft fruit, and teaches the tart. | Forties, auburn hair loose, freckled, a green dress with a pruning knife at the belt | B |
| **Silvanus** (Roman god of woods) | Charcoal burner and woodward in the keepers' wood | Burns charcoal at the corridor's edge and gathers the fungi and medicinal plants of the forest-water boundary, which the lore says move "as gifts, exchange, and consideration". Barter only: a dish for herbs. Knows the fox. | Sixties, long grey hair, bushy beard, smoke-stained grey tunic | C |
| **Messor, Occator, Sarritor, Convector** (the Roman helper-gods of reaping, harrowing, weeding and carting) | Hired hands who come back to the farms Rollo revives | Each returns as a farmstead is brought back, one per farm, and does one job for a wage: reaps ripe beds, waters, weeds, or carries a harvest to the grain court and sells it. The farms look alive, and the work Rollo has mastered becomes routine. | Young men in brown, each with his tool; no beards | B |

### 6.4 Nethereum (7)

| Name (source) | Role | Backstory and what he or she is for | Look | Tier |
|---|---|---|---|---|
| **Mererid** (the well-maiden of the drowned land) | Levee-warden of the ridge hamlet; the teacher | Her community keeps the largest section of the levee, so she speaks first at the Flood Council. Teaches timing the water: blackwater, siltshine, frogcall. Buys nothing; her price is a turn at levee work. | Forties, wet-weather brown hair bound back, a sedge cape over a grey dress, bare legs | B |
| **Seithenyn** (the drunken keeper whose neglect drowned Cantre'r Gwaelod) | The old hatch-keeper | He left the hatch open in a flood year and the water took the oats and a child. He has not kept the hatch since, and nobody has kept it well. Mending it with Rollo is his step back. Afterwards he minds Rollo's meadow while he is away, paid in Nesdor bread. | Sixties, red-nosed, grey stubble, a patched cloak, slow | B |
| **Gwyddno** (lord of the weir) | Weir-master on the Neth | His family's weir has taken the Neth's fish for forty generations. His grandfather pulled a baby from it after the Long Water; the family gave the child to the Guild. Sells smoked fish and salt, buys oats, and teaches the smoking of fish. Tells the story when he trusts Rollo. | Fifties, lean, grey braided beard, a fish-scale glitter on his sleeves, high boots | B |
| **Boann** (Irish river goddess, "white cow") | Cattle-woman of the post-flood pasture | Keeps the compact, short-legged Nethrani cattle the Galan meat market has known for two generations. Buys hay by the truss and barley as fodder, sells butter, cheese and manure, and is the one who sends for Rollo when the wolves come. | Thirties, broad, fair hair cropped, a leather jerkin, a goad | B |
| **Fintan** (the Irish survivor of the Flood who remembered everything) | Memory-keeper of the Flood Recall | Carries the community's list of the drowned, thirty generations deep, without writing. Speaks it as the water rises each spring. One of the names is Taleth's mother. He will not say it outside the Recall. | Eighties, tiny, white hair to the shoulders, beardless, a black cloak | B |
| **Airmid** (the Irish healer who sorted the herbs) | Herb-woman and rush-weaver | Deals in the rush and sedge of the wet threads, as the lore's basket communities did before they turned to hay and hides. Sells baskets that carry a bigger harvest, and the meadow herbs. | Twenties, dark hair in two braids, a rush hat in her hands, never on her head | C |
| **Liban** (the Irish woman who lived on under the flooded lough) | The one who lives below the line | Built below the *haethoss* on purpose: "the deep basin is where the good ground is." Offers Rollo the richest plot in the hollow, which the water may take one year in five. | Fifties, grey hair wet at the ends, a green wool dress, barefoot | C |

### 6.5 Nesdor (8)

| Name (source) | Role | Backstory and what he or she is for | Look | Tier |
|---|---|---|---|---|
| **Baugi** (the giant farmer whose nine thralls died) | Valley farmer on the Flats; the teacher | Farmed the braids for forty years and reads the ground by the colour of the dock leaves. His nine hired hands went with the rebellion or the foragers, and the long strips stand unsown. Teaches right crop, right ground, and lends a strip to a man who will work it. | Sixties, huge, bald, grey bushy beard, a sleeveless tunic | B |
| **Bolverk** (Odin's name when he did the work of nine reapers) | The champion reaper | Arrived the day the nine left, one-eyed and boastful, and claims he can do nine men's work with a scythe. Offers a reaping match on the long strip. Wins until Rollo earns the Work of Nine. | Forties, one eye, long grey hair, a dark hood pushed back, a scythe | B |
| **Idunn** (keeper of the apples, once hidden as a nut) | Hazel-wife of the valley head | Keeps the coppice and the nut harvest in a locked ash box. Sells hazelnuts and charcoal, and teaches the nut cake. | Thirties, fair hair in a crown braid, a brown dress, nutshell beads | B |
| **Aegir** (the gods' host and brewer) | Innkeeper on the Nesdor Way | Keeps the inn where the Way's traffic stops, brews from the valley's barley, and pays for bread and cakes to feed it. His ale is the best drink on the river. News of both the branch country and the Moros passes his bar. | Fifties, red-faced, white hair, a braided white beard, an apron over a blue tunic | B |
| **Forseti** (the Norse god of settlement and arbitration) | Arbiter and document-handler on the Way | Sells the route towns' oldest service: structuring a deal inside or outside Compact law. Keeps the orders board and the contracts, changes paper for coin at a loss, and, with the war in, arbitrates between the foragers and the farmers. | Forties, neat fair hair, clean-shaven, a black tunic, a writing case | B |
| **Egil** (the farmer who kept Thor's goats) | Drover of the Flats | Moves the hardy Nesdor cattle across the open ground with the seasons. Buys hay and barley as fodder, sells hides, and sees riders a day before anyone else. | Thirties, sunburnt, brown hair tied back, a long staff, a dog | C |
| **Beyla** (Freyr's servant, kept with the bees) | Bee-wife | Pays flowering rights on Rollo's beans and fruit in bloom, as the lore's beekeepers pay farmers, and sells the honey the nut cake needs. | Forties, round, brown hair under a veil of netting, a smoker on a cord | C |
| **Byggvir** (Freyr's servant, the barley) | Maltster, Beyla's husband | Buys barley for malt and sells the malt to Aegir. Argues with the drover about whether grain or cattle is worth more, in the manner of the lore's debate of sheep and grain. | Fifties, thin, grey stubble, dusted with malt | C |

### 6.6 Ovesos (9)

| Name (source) | Role | Backstory and what he or she is for | Look | Tier |
|---|---|---|---|---|
| **Enbilulu** (the canal inspector of the Mesopotamian gods) | Canal-warden of the Water Council; the teacher | Knows every sluice on the canal by its sound. Honest, and outranked by everyone with an older grant. Teaches sharing the water, and clears the canal head with Rollo. | Fifties, dark skin, shaved head, grey beard trimmed close, a wet hem, a measuring rod | B |
| **Nisaba** (goddess of writing, accounts and grain) | The Council's clerk and registrar | Keeps the allocation register and reads it aloud at the Harvest Close. Enters Rollo as the most junior right, records his seniority, and sells rights outright to those who can pay. Her register wins or loses the dispute. | Forties, black hair oiled and coiled, a white robe, reed pens | B |
| **Ziusudra** (the king who was warned of the Flood) | Head of the oldest house on the canal | His family claims a grant older than any flood, and takes its water first. Not a villain: he believes the tail-enders waste water on sand. Takes water out of turn, and is answered before the Council. Respects a man who wins by the register. | Seventies, long white beard, a fine blue robe, gold at the ears | B |
| **Ashnan** (the grain goddess of the debate of sheep and grain) | Tenant farmer at the canal's tail; Rollo's neighbour | A widow working noble land at the dry end, where the water arrives last. Her millet patch is exempt from seizure, and it is what feeds her children. Her witness carries the dispute. Teaches the millet porridge. | Thirties, thin, dark hair under a dust-coloured scarf, a patched brown dress | B |
| **Lahar** (the sheep god of the same debate) | Headman of the upland herders | The herders have land-use agreements rather than water rights, and a tradition of military service that gives them leverage without standing. Serves roasted barley before beer, and takes refusal badly. Buys barley and hay, sells mutton and cheese. | Fifties, wind-burnt, grey hair braided, sheepskin over a tunic, a sling | C |
| **Ezina** (another name of the grain goddess) | Miller on the canal | Grinds for a sixteenth. The lore says the mills are worth wars, and she keeps a club behind the door. Buys wheat and sells flour. | Forties, strong, flour to the elbows, brown hair bound in cloth | B |
| **Ninkasi** (the goddess whose hymn is a beer recipe) | Brewer of the market town | Buys barley and sells the Sorten's ale. Will teach the brewing if the user wants a drink in the game. | Thirties, dark curls, a stained blue apron, laughing | C |
| **Uttu** (goddess of weaving) | Fuller and dyer | Runs the fulling mill that makes the Sorten's wool worth sending to Gala, and buys the dye crop for it. Says a Galan buyer can tell a Sorten fleece by touch. | Sixties, blue-stained hands, white hair cropped, a grey smock | C |
| **King Melos** (the lore's king, house Oveth-Hold) | The king, off stage | His seal is on every water grant. He does not appear; the Council speaks of him. | None | — |

## 7. The economy

### 7.1 Where money stands today

- **Coin.** Copper pieces are the only money, and a new game starts with 24. Silver (10 copper) and gold (100 copper) are designed in `docs/economy.md` and `src/gameplay/inventory/economy.js` but not built; `describeSum` already writes "2 gold, 3 silver, 5 copper". There is no purse code: about 26 places read the copper stack directly.
- **Shops.** Every shop is a hand-written dialogue. `peddlerOffers` and `purchase` work for any seller's stock, and `tests/tills.test.js` pins the till pattern and the number of tills in `main.js`, so new merchants belong in their own module.
- **Selling.** Nobody buys anything. The woodcutter who bought logs and the peddler who sold staples are both cut from the live cast. Loot such as hides has no buyer and no use.
- **Income.** The main story pays 121 copper on the Empire's side and 191 on the Coalition's; every optional reward together is about 365. Corpses give 1 to 5. Fines run 20 to 120.
- **Prices.** Food is 1 to 6 (an egg 1, a rye loaf 3, cheese 4). Wine is 7 to 14. The Drent kit is 84. Bog iron is 72 to 288 a piece, wrought iron 288 to 1,152, steel 1,152 to 7,680; a full heavy steel set is 16,128. A battle's arrows cost about 230.
- **The lore.** No coin is named anywhere in the Mittoli world. The countryside counts wealth in cows ("three milkers and a wet-year calf rich") and in grain: floodwheat is tax grain, and courts once paid clerks in barley measures. Minora's Measure Houses seal lots, its bridges charge tolls, temples take grain shares, beekeepers pay farmers for flowering rights, household millet patches are exempt from seizure, and "prices move before soldiers do". Payment in goods is normal. The Mittoli words are *homgal* (market), *galeth* (trader), *velaeloss* (price) and *milaeth* (measured weight).

### 7.2 What this adds

1. A price for every farm good and dish, in one table.
2. Buyers in all five regions, each with a daily appetite.
3. The seal: a measurer's mark that makes quality count away from home.
4. Shares in kind, taken at harvest, so the harvest is only partly for coin.
5. Orders: standing requests that pay above market.
6. Things worth saving for.

Copper stays the unit. Sums of a silver or more are shown in gold, silver and copper with the existing `describeSum`, and the first silver and gold coins can be minted as items later without changing this design.

### 7.3 The share in kind

Taken at harvest, and shown: "12 rye, Fine. The holder's share: 3. Yours: 9."

| Country | What is owed | Why (lore) |
|---|---|---|
| Caricas | **The holder's quarter.** One in four of every harvest from a lent farmstead goes to the Council's granary for the family that holds it. With the war in (question 1), the garrison's tenth on top, unless Rollo hides it. | Farmsteads are held by families under the Water Council; the occupation eats the valley's grain. |
| Nethereum | **The levee tenth.** One in ten to the common store on the levee. Waived for a game day after Rollo takes a turn at levee work. | The Flood Council weighs a community by what it contributes to the shared flood works. |
| Nesdor | **Nothing.** No councils, no dues, and no protection either. | "The Branch Compact law does not formally extend into Nesdor." Its route towns sell the freedom to deal outside anyone's law. |
| Ovesos | **Water dues.** One measure of grain in ten for each turn of water drawn, reconciled at the Harvest Close; and the miller's sixteenth for milling. Millet pays nothing. | Water rights are titles with obligations; the Harvest Close is a public accounting; the lore exempts household millet from seizure. |
| Minora | **The measurer's twentieth.** A lot is sealed for a twentieth of it, or one copper. | Ambron's gates already quote "grain a twentieth" in the game; Minora's Measure Houses live on their fees. |

### 7.4 Buyers

Each buyer wants a short list of goods. The first lot of the day sells at the full price, the second at six-tenths, and after that "I have enough until tomorrow." Appetites refill on the play clock (a game day is 24 minutes of play). This keeps a sack of carrots from funding a war, and makes the round worth walking.

| Buyer | Where | Buys (appetite a day) | Sells |
|---|---|---|---|
| The grain clerk of the Measure House | Minora, the River storehouse | Any sealed grain (30). Seals lots. | Nothing |
| The Carican factor | Minora, the market by the Lizeem Gate | West-bank goods (20) | Carican tools, charcoal, seed |
| The Nethrani factor | Minora | East-bank goods (20) | Smoked fish, hay, hides |
| The Nesdor carter | Minora | Flour and dishes for the Way (12) | Orders from the route towns |
| The Ovesian factor | Minora | Rye, oats, fish, hay (20) | Hard-wheat flour, wool cloth, seed |
| The temple kitchen | Minora, the Grand Temple | Dishes (8), paying most for Fine | Healing, for an offering |
| Cedric's commissary | Minora, the western barracks | Anything, without limit, at six-tenths | Nothing |
| The barge | Minora, the quay | One Fine sealed lot of each good a day, at twice the home price, for Nylon | Passage, later |
| The grain court | Caricas town | Rye, barley, beans, fruit (24). Seals lots. | Seed |
| The orchard-wife | Caricas, the east orchard | Soft fruit (12) | Fruit canes, preserves |
| The toolsmith | Caricas town, market days | Nothing | Tools |
| The charcoal burner | Caricas, the keepers' wood | Barter only: dishes for herbs, "as consideration" | Charcoal, mushrooms, herbs |
| The weir-master | Nethereum | Oats (12) | Smoked fish, salt |
| The cattle-woman | Nethereum | Hay (24), barley (12) | Butter, cheese, manure |
| The innkeeper | Nesdor, the Way | Dishes (8), barley for ale (12) | Ale, provisions |
| The arbiter | Nesdor, the Way | Nothing | Orders, contracts |
| The drover | Nesdor, the Flats | Hay and barley as fodder (24) | Hides |
| The bee-wife | Nesdor, the valley head | Pays flowering rights on beans and fruit in bloom | Honey |
| The miller | Ovesos | Wheat (24). Mills for a sixteenth. | Flour |
| The brewer | Ovesos | Barley (24) | Ale |
| The fuller | Ovesos | The dye crop (12) | Cloth |
| The herder headman | Ovesos, the upland | Barley, hay (12) | Mutton, cheese |
| The Council's clerk | Ovesos | Nothing | Water rights, the register |

### 7.5 Prices (first pass)

Base prices, in copper, for Plain produce sold in its own country:

| Good | Base |
|---|---|
| Carrot, beet, barley, rye, oats, silver millet, field beans | 1 |
| Soft fruit, hazelnuts, floodwheat, hard wheat, a truss of hay, a weir fish | 2 |
| Flour (from two grain) | 3 |
| The dye crop | 4 |

Three multipliers apply, in this order:

- **Grade.** Plain ×1, Good ×1.5, Fine ×2, Prize ×3. Away from home, Fine and Prize count only when sealed.
- **Place.** Home ×1. Minora ×1.5. The far bank ×2. A neighbour that grows the same thing pays the home price.
- **Appetite.** Full price for the first lot of the day, six-tenths for the second, then nothing until tomorrow.

The barge pays ×2 for one Fine sealed lot of each good a day. The commissary pays ×0.6 for anything, always.

### 7.6 Cooking adds value

A dish is worth more than its ingredients, and heals more than anything sold today (the best bought food heals 50; the farm pot, 45).

| Dish | Needs | Base price | Heals |
|---|---|---|---|
| Rye loaf with onion and river cheese | 2 rye, cheese | 3 | 25 |
| Bean pottage | 2 beans, 1 barley | 4 | 40 |
| Soft-fruit tart | 2 fruit, 1 rye | 7 | 45 |
| Oatcakes | 2 oats | 3 | 25 |
| Smoked fish | 1 weir fish, the smoke-house | 4 | 40 |
| White bread | 2 floodwheat flour | 5 | 35 |
| Nut cake | 2 hazelnuts, 1 flour, honey | 8 | 50 |
| Flatbread | 2 hard-wheat flour | 4 | 30 |
| Millet porridge | 2 millet | 2 | 30 |
| Fork stew | 1 rye, 1 oats, 1 wheat, 1 fish | 12 | 60 |

Fine ingredients add 10 to the healing and raise the price a grade. Recipes are taught by the people of section 6, as recipes are taught today.

### 7.7 Orders

Four boards: the Measure House, the grain court, the arbiter's table on the Way, and the clerk's house in Ovesos. Each posts three orders a day, in the manner of "The temple kitchen wants six Fine oatcakes by tomorrow's bell: 60 copper." An order pays half again the market price, plus Farming experience, and simply expires if it is not met. Filling a buyer's orders raises his appetite for Rollo's goods, one step at a time.

### 7.8 What coin buys

| Purchase | Price (first pass) |
|---|---|
| Seed for a country's signature crop, until Rollo saves his own at level 20 | 2 a packet |
| Tools from the Carican smith: a hoe, a sickle, a pruning hook, a water yoke; each speeds one act or adds a yield | 12 (wood and bog iron), 35 (iron), 120 (steel) |
| A second Caricas farmstead for a season; a third; a fourth | 150; 400; 900 |
| A plot below the reliable line in Nethereum | 250 |
| A long strip on the Flats, from the farmer who holds it | 300 |
| A senior water right in Ovesos, bought outright | 1,500 |
| A hired hand's wage, per game day, to water, weed, reap or carry | 6 |
| Sealing a lot; milling a lot | a twentieth; a sixteenth |
| Healing at the temple | an offering of food |
| Passage on the barge, once it carries passengers | 10 |

Gear stays the great sink the game already has: bog iron within the first hours, wrought iron in the first days, and the steel coat as a long-term prize.

### 7.9 How much a farmer earns

*First pass, to be measured in play.*

- **Early** (four beds in Caricas, selling in Minora): about 20 to 40 copper a round, and a round is five to eight minutes. About 2 to 3 gold an hour. The Drent kit in twenty minutes; a bog-iron set in two or three hours.
- **Middle** (seventeen beds, cooking, orders): about 5 gold an hour.
- **Late** (all four countries, Fine and Prize, orders, hired hands): 8 to 9 gold an hour. The heavy steel coat in eight or nine hours of farming; the full set in about eighteen.

Farming will out-earn quests by a wide margin. That is the point of a farming path, but quest rewards may want raising later so that a sword still pays.

### 7.10 Scrip and the war

Only if the war is in (question 1). Cedric's commissary pays in coin. The rebellion's foragers in Nesdor pay in paper promises, good in the rebel countries and worth something only if the rebellion wins, in the manner of the Coalition scrip the game already designs. Forseti on the Way will change paper for coin at a loss.

### 7.11 What stays out

No haggling, no weight, no spoilage, no prices that drift on their own, no loans. The temple trusts' lending can come later.

### 7.12 Build notes

- A purse helper (`economy.js`) that the 26 direct reads can move to over time.
- A `merchants.js` that declares each buyer's wants, appetite and stock as data, and one shared sell dialogue built on the existing `peddlerOffers`, `purchase` and the woodcutter's sell-all `offer(count)`.
- One price table, with the three multipliers, in its own module with its own tests.
- Appetites saved in the checkpoint by buyer id and game day.
- Tests to update: `tills.test.js` (the till count), `larder-sources.test.js` (new foods need a source), `economy.test.js`.

## 8. What would have to be built

In the order that gives something playable soonest. Sizes are rough.

### Build 1: Rollo, Taleth and Caricas (about a week)

1. **Rollo.** A twelfth playable character, Developer Start only: the look (two new kit parts, the long cloak and the raised hood), the staff granted and equipped, no sword, Fireball learned at creation, the character tests updated.
2. **The start.** `MINORA_START` moved to the forecourt, the camera pitch, the arrival objective, the opening note on the title screen, the smoke test.
3. **Taleth.** His figure, his five topics, the locked later topics, *Sound the Soil*.
4. **The quest frame.** A `lizeem-farmlands` module with the four arcs as stages, the Measure page in the journal, markers, the F8 playtest card, the save section (arcs, Measure entries, bed heart and last crop, appetites), added to `LIVE`.
5. **Quality.** Grades on harvests, the fine item kind for each crop, sealing.
6. **The Caricas arc.** Rotation on the existing seventeen beds (heart and last crop per bed), bridge rye, beans and soft fruit as crops, the tart and the pottage as recipes, the fox's regard, the eight people of 6.3 and the first hired hand.
7. **Money.** The purse helper, `merchants.js`, the price table, the share in kind, the first buyers (Nepri, Consus, Portunus, Rudiger, Seshat's bounty), the orders board at the grain court and the Measure House.
8. **The market corner** by the Lizeem Gate: four stalls, the storehouse quay.

### Build 2: Nethereum (about a week)

A ridge hamlet above the reliable line, the levee and its hatch, the flood meadow with its drowned and drained states, a weir and smoke-house on the Neth, the Pilgrims' Bridge road to it, flood oats, hay and weir fish, the seven people of 6.4, *Quicken*, wolves on the new grass, and the Flood Recall scene.

### Build 3: Nesdor (about a week)

A farm and long strips on the Flats by the braids, a hazel wood at the valley head, an inn and the arbiter's house on the Nesdor Way (which needs its road built), the Carica ford marked, floodwheat and rye on the strips, white bread and nut cake, the eight people of 6.5, the reaping match, *The Work of Nine*.

### Build 4: Ovesos (one to two weeks)

The terrain change the user asked for: a green belt along the river drying toward the south and west. A village on the river belt with its canal, the divider, the register house and the mill; plots from the canal head to its dry tail; water turns and salt; hard wheat, barley and silver millet; flatbread and porridge; the nine people of 6.6; the hearing before the Water Council; the Harvest Close.

### Build 5: The Dividing

The feast on the forecourt, fork stew, and Taleth's later topics unlocked.

### Throughout

- Each build adds its tests to `tests/test-manifest.json` and its people to the cast after the trim.
- Codex is reworking the title screen and Developer Start at the time of writing. Build 1 should start from a branch cut after that lands, and the Developer Start it finds then is the one Rollo replaces.
- The user's decisions go into `docs/design-answers.md` when building starts; this file carries them until then.

## 9. Open questions

1. **The war.** By the user's newest ruling, Rollo leaves Cedric's capital for four countries in rebellion against it. Should the quest show that: people wary of a man from Minora until the first harvest is in, the garrison's claim on the Caricas rye, foragers on the Flats, and a choice in each of those two moments that changes who is friendly and nothing in the main story? Or should the war stay in the background and the quest be only about farming? Both versions of each step are written in section 5.
2. **Names.** The dictation gave "mythological names". Was that meant literally, or was it "Mittoli names"?
3. **Taleth's hat.** None by default. A tall pointed hat would suit a Merlin, and would be the first in the game.

---

## Appendix: facts for builders

**Directions.** +x is east and +z is south.

**The river.** The Lizeem runs from (-2150, -115) south past Minora's east wall. The Isa joins at Isamouth (-2250, 231), the Neth at (-2100, 491), the Carica at (-1800, 606) and the Oveth at (-1650, 924). The mouth is at (-1350, 1213). Nobody can wade or swim it. The White Bridge (z 135, from Minora's Lizeem Gate to Caricas) is its only crossing. The Pilgrims' Bridge crosses the Isa to Nethereum. Fords: upper Carica about (-1600, 260) to (-1650, 368); the Neth at (-2320, 545); the Oveth at (-1772, 978).

**The tower.** `building('menora-sorcerers-guild', …, -2414, 42, 25, 25, 128, 'sorcerers-tower')` in `src/content/regions/minora-frontier/menora-city.js`. Its footprint is x -2426.5 to -2401.5, z 29.5 to 54.5. The door is a decorative panel on the south face at (-2414, 54.7). The forecourt is 25 by 13 m, centred on (-2414, 60). Proposed start: (-2414, 63), yaw 0, camera pitch about 0.15. Proposed place for Taleth: (-2409.5, 58), yaw -0.73. Moving `MINORA_START` also moves the parked player behind the menu and the fallback for restoring a free-start save.

**Rollo in code.** `oak-staff` exists complete (`src/gameplay/inventory/inventory.js`, `src/gameplay/combat/weapons.js`, `makeOakStaff` in `src/content/characters/characters.js`) and is never granted. `playerLook()` accepts roster looks only, saves require a `PLAYABLE` id, and `tests/player-characters.test.js` pins eleven playable characters and at most 51 meshes per player. Fireball is learned with `magic.learn`; casting needs a learned spell and a usable focus (`src/gameplay/magic/magic.js`, `src/gameplay/magic/sorcery.js`).

**Farming in code.** `src/gameplay/skills/farming/farming.js`: beds are an id and a position; a crop row gives seconds, experience, level, produce, yield and seed; watering once gives +4 experience, three-quarters of the time and one more yield. The save validator rejects unknown bed and crop ids, so ids are permanent once shipped. Caricas farmsteads (`src/world/scenery/regional-farmland.js`): north (-2105, 159), east orchard (-2015, 300), lower (-1920, 350), shelf gardens (-1980, 381), upper (-1890, 192).

**Places for people.** World metres; +x east, +z south.

- **Minora** (`src/content/regions/minora-frontier/menora-city.js`): centre (-2345, 120), ground 21.3 m, about 200 by 205 m inside walls 18 m high. Gates: Northern (-2308, 10); Lizeem (-2243, 135) onto the White Bridge; Isa (-2308, 213) onto the Pilgrims' Bridge, whose Sacred Way ends at (-2308, 299) inside Nethereum; Muster (-2438.5, 148) out to Wilhelm's camp. Buildings: the Guild tower (-2414, 42), the Guild Library (-2328, 42), the Grand Temple (-2338, 102), the cloister (-2420, 125), the River Hall (-2280, 160), the western barracks (-2421, 95), the River storehouse (-2337, 202), and thirteen houses. Open ground: the temple court (-2338, 137), a plaza at (-2370, 152), the guild square (-2414, 60), gardens at (-2350, 78), (-2414, 139), (-2292, 47) and (-2355, 154). There is no market yet; "Market Lane" is only a path's name. Proposed: the factors' stalls on the plaza at (-2370, 152), Nepri and the barge at the River storehouse and the quay below it, Seshat in the Guild Library, Satet in the temple court, Imhotep at the Lizeem Gate, Rudiger at the western barracks, Amalthea at a hamlet in the hills to the north-west. Every stand must be more than 4 m from water and 1 m from a building (`tests/menora-city.test.js:63`).
- **Caricas** (`src/content/regions/minora-frontier/caricas-settlement.js`, `src/world/scenery/regional-farmland.js`): the town is centred on (-2092, 265) with a granary (-2115, 254), a watch-house (-2068, 240), four houses, a store (-2069, 302), a workshop (-2091, 314) and the grain court at (-2092, 265) with two market stalls at (-2100, 271) and (-2084, 271) and a noticeboard at (-2080, 258), which can carry the orders. The road runs from the White Bridge at (-2168, 135) to (-2092, 302) and on to (-1950, 270). The farmsteads have sheds and seed benches but no houses: North fields (-2105, 159), East orchard (-2015, 300), Lower fields (-1920, 350), Shelf gardens (-1980, 381), Upper fields (-1890, 192). Proposed: Vertumnus in a town house and at the North fields, Egeria and Consus at the grain court, Hagen at the watch-house, Ilmarinen at the workshop, Pomona in a new house at the East orchard, Silvanus in the keepers' wood. Adding a house changes the collider count pinned by `tests/caricas-settlement-build.test.js:29`.
- **Nethereum** (terrain only): the Hollow (-2600, 300); the Deep Basin (-2545, 372), an ellipse 300 by 132 m with its floor at about 13.6 m and its rim at 21 m, which floods every spring and is the flood meadow; the Wet Threads (-2620, 370); the Neth Ford (-2294, 599), the only way to Ovesos; the Lower Neth (-2144, 513). Proposed hamlet: the north-east rim at (-2290, 335), flat ground at 20.3 m where the Sacred Way from Minora already ends, 76 m from the Isa; the levee and hatch on the basin's rim; the weir and smoke-house on the Neth below the ford. The rim's hare sites (`src/content/regions/western-regions/west-regions-life.js:1394`) would move.
- **Nesdor** (terrain only): the Flats (-1450, 700), the Braided Water (-1676, 727), the Valley Head (-1570, 380), the Lizeem Bend (-1797, 655). The Flats Beck and the Ela-South Reach can be waded and shift with each flood. The main road ends at about (-1379, 602), and the Army's Line, an unmanned rope barrier, runs at x -1396 from z 432 to 772. Proposed: Baugi's farm and the long strips on the western Flats at (-1595, 585), 3.9 m above the water and outside the braids; Idunn's hazel wood at the Valley Head (-1520, 400); the inn and Forseti's house on the Way where the road meets the Line, near (-1400, 600); Egil on the open Flats; the Carica ford marked as the way in from Caricas.
- **Ovesos** (terrain only): the Sorten (-1962, 792), a bench 155 m wide and 0.95 m below the plain at x -2000 to -1880, z 780 to 870; the Upper Oveth (-1980, 811); the Upland Grass (-2050, 592); the Open Plain (-1800, 790); the spawn (-1905, 706). The country is small: half of it lies within 100 m of the Lizeem and all of it within 290 m, and the whole plain tilts down toward the Oveth in the south-west. The Lizeem bank stands 2 to 5 m above the water. Proposed: the canal head on the Lizeem in the north, where the river is highest, with the canal running south-west across the plain and falling toward the Sorten, so that the oldest rights lie by the river and the tail runs out toward the dry margin; the village on the terrace at (-1870, 705) with the register house and the divider; the mill on the canal; building pads at least 160 m from the Gala border (`tests/oves-world.test.js:131`).

**The green belt in Ovesos.** The moderate version, colour and planting only, is about 60 to 100 lines: a belt measured by distance from the Lizeem with its own tint in `src/content/regions/oves/oves-world.js` (`ovesTint` extended to the grassland), and denser, greener grass with trees along the Lizeem in `src/content/regions/oves/oves-scenery.js`. Today the only green ground is in the south-west, so this reverses the map and the user's ruling of 21 September ("green only along the Oveth", `docs/six-regions-brief.md`). The atlas keeps every hex at the same dry climate, so the drier south-west is described as distance from water, not as a change of climate. Tests that pin the current look: `tests/oves-world.test.js` lines 433 (trees only by the Oveth, the Caelin and the damp reach), 466 (no livestock), 577 (uninhabited), 250, 131 and 386. Text to rewrite: `src/world/terrain/region-world.js:1369`, `src/world/terrain/region-layout.js:228`, `src/dev/tools/build-status.js:133`, `src/ui/map/map-fog.js:237`.

**Declaring people.** `person(id, name, role, modelRole, color)` with optional `skin, look, x, z, yaw, armed, soldier, maxHp, essential` (`src/content/regions/amod/amod-people.js:24`); two or three lines each, the first a self-introduction; fixed stands kept clear of props. Add them after the cast trim, as `frontier-people.js` is (`src/main.js` about 744 to 751), or list them in `OWN_IDS`. Tests that require these regions to have no people must change: `tests/nesdor-world.test.js:164-176` (which also covers Caricas), `tests/nethereum-world.test.js:469` (which also bans chart names with village, town, mill, weir, levee or council) and `tests/oves-world.test.js:577`. The running game still calls Caricas "occupied in full by the Ambroni Empire" and `tests/menora-city.test.js:73` pins its control as the Empire's; the League ruling of 5 October has not reached the code.

**The figure kit** (`createCharacter`, `src/content/characters/characters.js:1316`). Any body takes `hair` (a colour), `hairStyle` (bald, cropped, short-cropped, receding, fine, lank, curls, long, long-curly, long-loose, long-tied, ponytail, braid, bob, topknot, shaved-sides, mane, none), `slight`, `dress`, `child` (with `scale: .68`), `glasses`, `eyePatch`, `elven`, and `beard: false`, `cloak: false`, `staff: false` to drop a preset body's own kit. The mercenary body also takes `build` (ordinary, broad, rangy, bull, wiry, square, tall-lean, short-stocky, towering, heavy, raw-boned, slight), `headgear` (bare, soft-cap, bandana, peruke, wide-brim, iron-skullcap, fur-cap, hood), `facialHair` (clean, stubble, moustache, trimmed, bushy, braided, forked, or any other value for a full beard), `garment` (jerkin, gambeson, archer, fur-mantle, sash, bare-forearms, short-cloak, scarf, wrapped-kilt, single-pauldron, sleeveless, bedroll, robe), `marks` (spectacles, earring, scar, tattoo, eye-patch) and `weapon` (including staff). Preset bodies with their own kit: `rise-custodian` (grey beard, cloak, fieldbook, staff), `bridge-keeper` (beard, hammer), `commons-miller` (headwrap, flour apron), `forest-woodcutter` (kerchief), `relay-clerk` (desk coat), `villager`. Women are written `slight: true, dress: true` with a long style, never `mane`. There is no old-age frame: age shows in hair colour, `receding` or `fine`. A civilian figure must stay under 18 draws and 4,200 triangles (`tests/local-characters.test.js:36`).

**Rules that apply.** No invented civilians without the user's request (now given for these five regions). A person with no look supplied by the user is a grey placeholder, so every look in section 6 needs his approval. No hats unless he asks. A new quest must be added to `LIVE` in `src/gameplay/quests/quest-slate.js`. Every named quest gets an F8 playtest card. New test files go in `tests/test-manifest.json`.

**Lore read for this design.** `geography/regions/caricas.md`, `nethereum.md`, `nesdor.md`, `ovesos.md`, `isareos.md`, `minora.md`; `culture/mittoli_grains.md`.

**Lore that the atlas overrides.** The lore puts the five branch countries upstream of Minora and the great grain plain (the Mithala) below it. On the atlas the four countries lie below Minora on both banks, and the Mithalas are not on the Lizeem at all. This design follows the atlas.

**Games looked at.** Old School RuneScape (Farming, farm runs, contracts), Stardew Valley, Sakuna: Of Rice and Ruin, Rune Factory 4 and 5, Dragon Quest Builders 2, Valheim, Medieval Dynasty, Farthest Frontier, Manor Lords, Fields of Mistria.
