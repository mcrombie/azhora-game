# Azhora campaign design

The civil-war campaign as specified by the voice-to-text brief of 16 September 2026, rewritten with the authored region names from World Builder. This is the design record; `src/campaign-world.js` and `src/campaign.js` are its executable form and their tests check that the two agree.

The brief was cut off by the message limit at "You're going to meet some sage wizard-like figure who's going to be your…". Everything from the South Oremindi Mountains onward is a frontier, not a design.

## Premise

You are a mercenary hired from across the sea by the **Ambroni Empire** to help it against "rebels". You land at **Tidehaven** in **Drent**, the quietest province the Empire still holds outside its own lake country. Ambron, the capital, is a walled lake city on the narrows of Lake Ela in **Elagos** (a Tenochtitlan on cold northern water; see `world-builder/azhora_lore/geography/regions/elagos.md`). The Empire has dominated most of Azhora for generations and is now in rapid decline: rebellions around its core, and to the far northwest the dark lord of **Cape Thalmagar**, whose orcs are arming the goblins and pressing south through the mountains.

The "rebels" are most of the people. In Luscia, in the Suvals, in the Izoli south, a republican coalition wants to replace the emperor and the monarchy with a republic. The **Republican Coalition** is three things at once: Ambroni heartland rebels, the **Izoli Republic** of West and East Izol, and an Ambroni prince who renounced his family and went south. Their joint army landed on the southern Suval coast, took most of West Suval, and holds **Solis**.

Soldiers of the **Ambroni Legion** are armored line infantry, not rangers, and they are men by default. Named exceptions can be written later.

## Name key

The transcript's spellings, resolved against the atlas (`NAME_ALIASES` in `campaign-world.js`):

| Heard | Authored region |
| --- | --- |
| Poeth, Pueth, Pweith, Plymouth | **Pueth** |
| Lucia, Lycia, Luskya, Lizeem | **Luscia** |
| Elagos, Ellagos, Eligos, Elgos, Allego, Analogos | **Elagos** |
| Pedlos, Peblos, Pelos | **Peblos** |
| Moros Plain, Pyros Plain, Morrow's planet | **Moros Plain** |
| Vastus, Bastos | **Vastos** |
| Meneth, Menef, Math | **Meneth** |
| Nestor | **Nesdor** |
| Amad, Ammad, Amud, Amald, Emod, "a mod", Ahmad | **Amod** |
| Ferodon, Feredom | **Feradom** |
| Catarcaz | **Caricas** (touches Meneth and Nesdor, as described) |
| Sarious, Casarios | **Isareos** |
| Una 3 | **Yunethre** |
| Netherium | **Nethereum** |
| Vesos / Ves Desert, Ovest Desert, West Desert | **Ovesos** / **Oves Desert** |
| Alidor | **Alezhor** |
| Lvarth | **Navarth** |
| Ibbenwood, Hivenwood, Ebonywood | **Ibenwood** (North, East, South, West, Central) |
| Evanal | **Ibenal** (North, South) |
| Lothian, Lotharingen, Thunder Mountains, Istothar | **Lotharn Mountains** (East, West) |
| Methala | **Mithala** |
| Kelder | **Celder** |
| Chlamydia | **Telemonia** |
| Ear | **Eer** |
| Legamom | **Legemum** |
| Ganal Highlands | **Dinelv Highlands** |
| KF | **Cape Heth** (beside the Dinelv Highlands) |
| Meridian double / Meridian Desert | **Meroshe Desert** (North, West, South, Central) |
| Hanma | **Hama** |
| Azol, Zol, Zyn | **Izol** (West, East); the Izoli |
| Thamalgar, Dalmogar, Damagar, Amogar | **Cape Thalmagar** |
| Elod, LOD, Elode | the neutral city-state **Elod** in East Suval (lore: the Elodi) |
| Solis, Solus | the city **Solis** in West Suval |
| Lamdris | the lake city **Lamdris** in South Suval |

Unresolved: **Westnias** (level 3), **Gallan** (level 4), **Spirochosis** (level 3, "as I said": probably a repeat), **Bothis** (level 5, mapped to Henborth provisionally). "West/East Pirates" at level 2 were immediately restated as West/East Pyros at level 3; the later value is kept. The transcript gave North Meroshe Desert both 3 and 4; 3 is kept.

There is no South Pyros. The Coalition landed on the southern Suval coast and overran West Suval. East and West Pyros are one empire, **Pyros**, whose army is busy with goblins and a rebellion at home; it contributes only a small contingent to the Coalition.

**The Coalition** is made of the Izoli Republic, Suval, the Ambroni rebels (with the renounced prince), Pyros (a very small contingent), Selemis, Marosh, and a few city-states of the southern tropical islands (`COALITION_MEMBERS` in `campaign-world.js`).

## Difficulty levels

| Level | Meaning | Regions |
| --- | --- | --- |
| 0 | Tutorial. Nothing attacks outside a quest. | Drent, Elagos, West Izol |
| 1 | Outskirts. One kind of danger. | Luscia (wolf packs at night), Peblos (pirates who want a toll), Pueth (bramble goblins south, hill goblins north), Vastos, Meneth (bramble goblins), East Izol (wolves) |
| 2 | Unsettled. Bandits, wolves, hill goblins. | Moros Plain, West Suval, East Suval (bandits in the southern hills; Elodi lowlands are safe), Amod, Feradom, Nesdor, Caricas, Eer, Southern Ascarth, Hama, Marosh |
| 3 | Hard. | South Suval (hill-bandit stronghold in the north), East Lotharn Mountains, Ovesos, South and West Mithala, East and West Pyros, South Celder, Isareos, Nethereum, Nether Desert, Yunethre, South Ibenal, Alezhor, Gala, Telemonia, Legemum, Ganesh Plain, Trogo, North Meroshe Desert |
| 4 | Perilous. Orc-allied goblin bases; trolls and giants. | West Lotharn Mountains, Oves Desert, North/East/South/West Ibenwood, North Ibenal, Navarth, North and East Mithala, North Celder, Northern Ascarth, Ganesh Desert, Babon, West/South/Central Meroshe Desert |
| 5 | Deadly. | Central Ibenwood, South Oremindi Mountains, Dinelv Highlands, Cape Heth, Henborth (provisional) |

Regions the brief never rated carry a provisional level from terrain (`provisionalLevel`) and are marked provisional in the developer atlas. The Thalmagar approach (Cape Thalmagar, Cudon, Narcosh, the northern Oremindi) is set to 5 provisionally because the arc ends there.

Stability should fall off with distance from Elagos: Drent is the calmest province because everywhere else is getting worse.

## Threats

| Threat | Tier | Where |
| --- | --- | --- |
| Bramble goblins | 1 | Drent (one scripted raid only), Pueth south, Vastos, Meneth, Caricas, Amod, Nesdor. Local; not Thalmagar's. None in Luscia or Elagos. |
| Hill goblins | 2 | Pueth north, Feradom, Amod, Vastos/Meneth north, the Lotharn. Amod's answer to something in the northwest. |
| Sand goblins | 2 | Nesdor, Ovesos, Oves Desert, the western deserts. The Coalition arc's counterpart of hill goblins. |
| Mountain goblins | 3 | The Lotharn, the Oremindi. Lately allied with orcs. |
| Orcs | 4 | Thalmagar's warriors, larger and armored. Normally far north; found stationed inside the West Lotharn goblin base and the Oves Desert sand-goblin base. None in the Ambroni heartland yet. |
| Wolves / wolf packs | 1 / 2 | Luscia, East Izol, the Suvals, Amod, everywhere wild. A pack at night off the roads can kill. |
| Bandits / hill bandits | 2 / 3 | Moros Plain, West Suval, East Suval south, South Suval north (the stronghold), the far provinces. |
| Pirates | 2 | Peblos. A mafia the Empire tolerates; they take some money, never all, and only fight if refused. |
| Trolls, giants | 4 / 5 | Rare in the Lotharn and beyond. |

## The playable prologue, relocated

The existing four districts are now local slices of Drent and the Luscia border. No geometry moved.

| District | Was | Now |
| --- | --- | --- |
| 1 The first shore | a coast of East Izol | Tidehaven on the Stills, Drent's sheltered sound behind the Pebbles |
| 2 Sunmeadow Plain | fields of East Izol | the Avrel valley clearings inside Drent's forested upland (lore: Drent's valley floors are farmed, the upland between rivers forested) |
| 3 Reedwater Crossing | a river hollow | the Caloss, Drent's southwestern edge; Luscia begins on the far bank |
| 4 Threefold Rise | the road toward Izolveth | the Luscian Hills; the relay where Iven files the report |

Nessa the quartermaster is now **Corvan**, quartermaster of the Ambroni Legion. Sava's reveal is no longer about Izol's Assembly: ten days ago the Legion broke a rebel army at the Lauvel crossing in Luscia, and most of Luscia wanted what those rebels wanted. Oda's testimony at the waystation says the same in its own words.

Known gap: the local road still runs along the world's -Z axis, which the minimap draws as north. At continental scale the route out of Drent runs southwest. Rotating the local world or the minimap's compass is a later task.

## Main quest

The campaign begins when Iven files the report (`drent-road` complete). Chapter ids match `CHAPTERS` in `campaign.js`.

1. **drent-road** · Drent (0). The existing tutorial and road.
2. **luscia-aftermath** · Luscia (1). The battlefield at the Lauvel. Reward: a Legion horse. (Riding is a flag today; a mount mechanic is not built.)
3. **moros-camp** · Moros Plain (2). Ride to the Legion camp. The army's power, and the people's lost confidence.
4. **suval-envoy** · West Suval (2). Deliver the Legate's message to the Coalition at Solis. Meet the Izoli, the prince's followers, and Luscia's rebels. **Fork: Empire or Coalition.**
5. **border-battle** · Moros/West Suval border. Fight for your side and survive. Even at 50/50; every regional arc you finished for your side adds 10, every arc against it subtracts 10, capped 15–85. You can lose.

Empire branch: **solis-sweep** (win) or **moros-fallback** (loss) → **report-ambron** (Elagos; pay and better arms) → **first-pacification** (one Empire arc among the five level-1 provinces; 3 of 5 and 5 of 5 give bonuses) → **amod-hill-chief** (Amod; second battle; a rebel truce helps; defeat is a retry) → **lotharn-scout** (East Lotharn; orcs sighted; confront or hide) → **lotharn-survey** (three corners: rebel camp, goblin warrens, orc trail) → **west-lotharn-outpost** (orcs stationed in the mountain-goblin base) → **orc-chief-lotharn** (assassinate and flee) → **mithala-scout** (the river-city of the Mithalan Empire) → **oremindi-convergence**.

Coalition branch: **moros-outpost** (win) or **solis-fallback** (loss) → **sail-west-izol** (West Izol, level 0) → **first-liberation** (one Coalition arc among the five) → **nesdor-sand-chief** → **ovesos-scout** → **oves-outpost** → **orc-chief-oves** (with rangers) → **pyros-scout** (Gala, the Pyrosi capital) → **oremindi-convergence**.

**oremindi-convergence** · South Oremindi Mountains (5). Both branches meet. A sage figure is introduced. The brief ends here.

## Regional arcs and the political map

Each contested province has an Empire arc and a Coalition arc (`REGIONAL_ARCS`). Finishing one settles the province for that side on the map, raises that faction's trust by 12 and lowers the other's by 8. Amod, Nesdor and the East Lotharn also have a **truce** arc that helps the goblin battle without settling the province.

- Luscia: rebel rangers hide along the East Suval border, sheltered by Elod's neutrality.
- Peblos: an Ambroni naval station; a rebel ship hidden in a sea cave preparing to strike the fleet; pirates; a ferry, a boat, or a dangerous swim to get there (swimming and boats are unbuilt mechanics).
- Pueth: Empire guard posts on the western road to Feradom; rebels in the east; goblins on the edges; the source of the raid on Drent.
- Vastos, Meneth, Caricas, Eer: bramble goblins and a straightforward arc.
- Feradom: pro-monarchy; a weak Coalition arc; whispers of an independent duke-king.
- Moros Plain, West Suval: the border war's aftermath; the losing side's remnants.
- Amod, Nesdor: rebels and garrison both fighting goblins first.

**Double-dealing.** Working an arc against the side you chose is allowed and pays. It counts as a crossing; on the third crossing the faction you serve finds out (`exposed`), its trust drops by 30, and your own battle odds carry the penalty. Sticking to one side is the sensible path; double-dealing is the fun one.

**Milestones.** Five Empire provinces open **invade-west-izol** (a hard battle; then **subdue-east-izol** as a side mission). Five Coalition provinces plus Nesdor and the Moros open **invade-elagos**, the siege of Ambron (harder still; then **liberate-drent**). Winning flips the region on the map.

## Settlements named so far

Tidehaven (Drent, new), the Torn mouth (Drent, lore: seat of the Lord Protector), Ambron (Elagos), Solis (West Suval), Elod (East Suval), Lamdris (South Suval), Mavren (Amod, lore), Gala (West Pyros, lore), the Mithalan river-city (name pending), Izolveth (West Izol).

## Autoplay

Press **P** (or the opening screen's *Watch the computer play*, or *Autoplay the road* in Pause) and the computer plays the main quest with ordinary inputs while you watch or step away. `src/autopilot.js` is a pure planner and navigator: it picks the current goal from the quest state (talk, practise, walk, fight, gather, use, open the satchel), follows the authored trail polyline for long trips, probes collision for a free heading, sidesteps when stalled, dodges enemy tells and counters in reach, paces dialogue so it can be read, and gives up after 150 s without progress. Any trusted key press or click hands control straight back; the game does not pause on lost window focus while autoplay is on. `npm run test:autoplay` watches it play the whole road from the boat to Iven's relay.

## The chart

The journal atlas (`scripts/export-world-map.mjs`) is now an inked parchment chart generated from the same hex geography: land is the union of land hexes with a Chaikin-softened coastline, province borders are the authored region edges, rivers the authored river edges; mountains, hills, forests, jungle, marsh, highland hatching and dunes are hand-drawn glyphs placed one per hex with deterministic jitter; province names are calligraphic and tilt along elongated provinces; ships, a serpent, a compass rose and a cartouche decorate the sea. **Cape Thalmagar is left uncharted**: no label, no quick-jump button, and Orris no longer points to it on the map. The developer (F8) atlas keeps its own Thalmagar shortcut for inspection. The local trail charts and the minimap use the same parchment-and-ink palette.

## What is built and what is not

Built: the region registry with levels, factions, threats and adjacency; the campaign state machine with fork, battles, arcs, trust, exposure, missions and validated saves; the journal's civil-war section; the developer atlas tinted by level; the prologue relocated to Drent with a male Legion quartermaster; save-file support; autoplay of the whole road; the parchment chart and matching local charts.

Not built: any 3D terrain beyond the four districts; horses, swimming, boats; armored Legion character models; the battle sequences as playable encounters; NPCs and dialogue for chapters 2 onward. The campaign advances today only through its API and tests; the game reaches `luscia-aftermath` when the road is finished and shows it in the journal.
