# The difficulty ladder (proposal, 2026-09-20)

Every region on the atlas, with a level from 0 to 11. Proposed for the user's approval; nothing
here is in the game yet. Once approved it becomes `src/region-levels.js` — one table, read by
what spawns, by the region card, and by the cartography journal.

**How the level is shown.** The player never sees the number on the HUD. On first entering a
region the region card gives the level as *words* (the ladder below). The number appears only
in the cartography section of the journal, once the region is charted: discovering how
dangerous a country is, is part of the cartography skill.

**Where the numbers come from.** Seventy-four regions were levelled in the spoken brief
(`docs/original-brief.md`), with its contradictions resolved this afternoon (recorded at the
end). The other fifty-seven are proposed here from three things: the levels of their nearest
levelled neighbours on the atlas, what the Azhora lore says lives there
(`../world-builder/azhora_lore/geography/regions/`), and the brief's own rules of thumb —
the country around the Gorgi is 9, the great southern jungle island runs "9s, 8s and 7s inside".
Rows marked **~** have no lore file and are placed by geography alone; those are the ones
most worth a second look.

## The words

| Level | On the region card |
|---|---|
| 0 | A quiet country |
| 1 | Mind the road at night |
| 2 | A troubled country |
| 3 | A hard country |
| 4 | A dangerous country |
| 5 | Wild country |
| 6 | Go armed, and not alone |
| 7 | The mountains keep their dead |
| 8 | The dark lord's shadow |
| 9 | Few return |
| 10 | None return |
| 11 | *(never shown — the island is unknown until found)* |

## The table

### Level 0 — A quiet country
| Region | Why |
|---|---|
| Drent | The tutorial: nothing attacks you but the one goblin raid. |
| Elagos | The heartland and the capital; highly militarised, entirely stable. |
| West Izol | The Republic's own country; stable, and housing the Coalition army. |

### Level 1 — Mind the road at night
| Region | Why |
|---|---|
| Luscia | Wolves, in packs, at night, off the road. No goblins (the camp is a side quest). |
| Peblos | Toll-pirates who want a little money, a hidden rebel ship. The swim is the danger. |
| Pueth | Bramble goblins in the wooded south, hill goblins in the north; the Empire holds the road. |
| Vastos | Bramble goblins on the cold tableland. *(Resolved: 1, not 2.)* |
| Meneth | Bramble goblins on the ridges. *(Resolved: 1, not 2.)* |
| East Izol | Izoli-controlled; wolves only. |

These six are the "one of five" pool for the pacification/liberation quest — Luscia, Peblos,
Pueth, Vastos, Meneth — plus East Izol on the Coalition side.

### Level 2 — A troubled country
| Region | Why |
|---|---|
| East Suval | Elod's lockdown; hill bandits in the south, safe lowland. |
| West Suval | War unrest, wolves; the border battle. |
| Moros Plain | Bandits, wolves; the Legion's camp at its centre. |
| Amod | Rebels in the north-west, goblins and wolves; the hill-goblin chief. |
| Feradom | Harder hill goblins; a duchy whispering of independence. |
| Nesdor | Bramble goblins and wolves; the sand-goblin chief on the Coalition arm. |
| Caricas | Bramble goblins and wolves; the Lizeem runs through it. |
| Eer | Named 2 in the brief. |
| Hama | Named 2 in the brief ("Hanma"). |
| Marosh | Named 2 in the brief. |
| Southern Ascarth | Named 2 in the brief. |

### Level 3 — A hard country
| Region | Why |
|---|---|
| South Suval | The hill bandits' base in its north; Lamdris by the lake. |
| East Lotharn Mountains | The first level-3 region of the Empire arm: rebels, hill and mountain goblins, orc scouts. |
| Isareos | Named 3 ("Sarious", "Casarios", "Spirochosis" — one region, three transcriptions). |
| Nethereum | Named 3 ("Netherium"). |
| Ovesos | Named 3 ("Vesos"). |
| Nether Desert | Named 3. |
| Yunethre | Named 3 ("Una 3"). |
| South Ibenal | Named 3 ("South Evanal"). |
| Alezhor | Named 3 ("Alidor"). |
| West Pyros, East Pyros | Named 3 — **but also named 2 as "West/East Pirates"; see open questions.** |
| South Mithala, West Mithala | Named 3. |
| South Celder | Named 3 ("South Kelder"). |
| Telemonia | Named 3 ("Chlamydia"). |
| Gala | Named 3. *(Resolved: "Gallan 4" was the same region; 3 stands.)* |
| Legemum | Named 3 ("Legamom"). |
| Ganesh Plain | Named 3. |
| North Meroshe Desert | Named 3. *(Resolved: the desert eases toward the Ganesh Plain.)* |
| Trogo | Named 3. |
| Iscare Archipelago | Thirty islands in the Iberos Sea off Suval; a navigation hazard, not a battlefield. Neighbours 2–3. |
| Selemis | A trading island at the mouth of the Iberos Sea, an irritant to the Ascarth kings. Civilised; neighbours 2–4. |

### Level 4 — A dangerous country
| Region | Why |
|---|---|
| West Lotharn Mountains | The first level-4 region: the orc outpost, the assassination. |
| Oves Desert | Named 4; the sand-goblin base and the orc chief on the Coalition arm. |
| North, East, South, West Ibenwood | Named 4 ("Hivenwood"). |
| North Ibenal | Named 4 ("North Evanal"). |
| Navarth | Named 4 ("Lvarth"). |
| North Mithala, East Mithala | Named 4. |
| North Celder | Named 4 ("North Kelder"). |
| Northern Ascarth | Named 4. |
| Ganesh Desert | Named 4. |
| West, South, Central Meroshe Desert | Named 4 ("Meridian Desert"). |
| Babon | Named 4. |
| Aurumlis Archipelago | Warm scattered islands in the southern ocean, visited by Academy naturalists. Neighbours 2–4; remote. |

### Level 5 — Wild country
| Region | Why |
|---|---|
| South Oremindi Mountains | Named 5; where the sage is met and the arcs converge. |
| Central Ibenwood | Named 5 ("Central Ebonywood"). |
| Dinelv Highlands | Named 5 ("Ganal Highlands"): the rising trio Ganesh Plain 3, Ganesh Desert 4, Highlands 5. |
| Cape Heth | Named 5 ("KF"); borders Dinelv. |
| Henborth | Named 5 ("Bothis"); between the Mithalas and the Celders, on the climb to the cape. |
| North, East, South, West Acorwood | Dense forest "described as a place, not an obstacle", with more accounts of those who did not return than of those who did. Between Mithala 4 and Henborth 5. |
| Acor Wetlands | The Acorwood's marsh basin. |
| South Endevor, East Endevor | Fell-sheep, reliable inns, and barrows on the ridgelines that are older and stranger. The half nearer Mithala. |
| Azhor Stones | Forty old rocky islands between the Azner Shores and the Southern Archipelago. Remote but not hostile. |

### Level 6 — Go armed, and not alone
| Region | Why |
|---|---|
| East, North, Lesser Oremindi Mountains | Named 6. *(Resolved: "Midy Mountains" was the Oremindi said twice.)* |
| Narcosh | Named 6 ("Mercos", "Nirkaash"). |
| North Endevor, West Endevor | The half of the hills nearer Narcosh and the cape. |
| North, East, South, West Lond | The north's breadbasket: the largest arable land in Northern Azhora. Settled, far, cold; the Gorgi to its north. |
| Central Lond | The formation at the centre of the plain, "visible from every approach"; strategic. |
| North, East, South, West Ganun | River traders who move the north's surplus. Settled; the Baldro behind them. |
| North Nonoth, South Nonoth | Fertile land between the two branches of the Ond, which comes down off the Gorgi. |
| Saxrul **~** | Southern coast, nearer Babon than Scythe. |
| Qadwaaqaad **~** | Southern coast, nearer Babon than Scythe. |

### Level 7 — The mountains keep their dead
| Region | Why |
|---|---|
| West Oremindi Mountains | Named 7. |
| Cudon | Named 7 ("Kudan"). |
| Nothwood | The northern limit of continuous forest; boreal; on the road to the tundra. |
| Noth Hills | Old worn hills between the forest and the tundra of the Thalmagar approaches. |
| South Thoth | Cold scrubland, the southern apex of the Thoth triangle, where Lond–Henborth country opens out. |
| North Riesov, South Riesov | A cliff coast backed by the Skeld range; its people are custodians of a sea that kills the unlearned. |
| East Inseld, West Inseld | Cold fishing islands off the north coast; the open-shelf crossing is the danger. |
| Rihas, Riwaad, Maanub, Maawad, Nuurat, Anubrul, Haatrul **~** | The great southern jungle island's outer regions: "7s inside" per the brief. No lore; placed by distance from Scythe. |
| Sabrqad **~** | Jungle island, outer ring. |

### Level 8 — The dark lord's shadow
| Region | Why |
|---|---|
| Cape Thalmagar | Named 8. *(Resolved: stays 8; no longer the top of the scale.)* |
| Central Thoth, North Thoth | The western approaches to the cape across cold scrub, toward the Gorgi. |
| South Orsa | Silver hills on the Gorgi's western slopes, "defended by the climate". |
| East Baldro Mountains | The lower, older secondary range; the eastern massif away from the Gorgi gap. |
| Qadmar, Barqat, Saxhan **~** | Jungle island, inner ring: "8s inside". |

### Level 9 — Few return
| Region | Why |
|---|---|
| South Scythe | Named 9. |
| East Gorgi Mountains, West Gorgi Mountains | "The surrounding regions are level 9." |
| Eshtor Plateau | Above the Gorgi's northern face; nothing grows above knee height. |
| East Witherst, West Witherst | Beyond the Gorgi wall, where the wind is geography. West Witherst touches North Gorgi. |
| Orgmala | Grey highland whose valleys very few have entered and returned from. |
| North Orsa | The Gorgi's western slopes, the harder half. |
| West Baldro Mountains | The massif joined to the Gorgi approaches by the gap. |
| Waahaat **~** | The brief's "Wahat": dense jungle, a mountainous plateau where little is known. |
| Waahan **~** | Jungle island, nearest Scythe. |

### Level 10 — None return
| Region | Why |
|---|---|
| North Gorgi Mountains | The orcs' homeland; the first chief lieutenant. |
| North Scythe | The mountain island; the second chief lieutenant. |

### Level 11 — unknown
| Region | Why |
|---|---|
| *the hidden island off the northern coast* | Thalmagar's emergency base, older than the cape's fortress. **Not on the atlas — see open questions.** |

## Contradictions in the brief, and how they were resolved (2026-09-20)

| The brief said | Resolved |
|---|---|
| Vastos and Meneth level 2, then level 1 | **1** — like Luscia; five level-1 regions for the "one of five". |
| Peblos "level 1, 2" | **1** |
| Cape Thalmagar 8 "top tier", then "not actually level 8, the most difficult" | **Stays 8**; the scale now runs to 11. |
| Is the level shown? | **Words on the region card; the number only in the cartography journal.** |
| "Lizeem" as a core region | **A river** running through Caricas; not a region. |
| "Midy Mountains" (Western 6, N-Western 6, "C Storm" 6, Western 7) | **The Oremindi, said twice** (Lesser 6, North 6, East 6, West 7). |
| "Meridian double" N3/W4/S4 and "Meridian Desert" N4/C4 | **One region, the Meroshe Desert: North 3, West/South/Central 4.** |
| "Bothis" 5 | **Henborth.** |
| "Westnias" 3 | **A repeat**; no new region. |
| "Gala 3, Gallan 4" | **One region, Gala, level 3.** |
| Wahat vs North Scythe as the southern lieutenant | The brief's last page supersedes: **North Scythe 10, South Scythe 9**; Waahaat stays the jungle plateau at 9. |
| "Ganal Highlands" 5, "KF" 5 | **Dinelv Highlands, Cape Heth** (by geography: the rising Ganesh trio, and its neighbour). |
| "Evanal" N4/S3, "Alidor" 3, "Lvarth" 4 | **Ibenal, Alezhor, Navarth** (Alezhor's neighbours). |

## Resolved after the table was drafted

| Question | Resolved |
|---|---|
| "West/East Pirates 2" vs "West/East Pyros 3" | **One pair of regions, Pyros, level 3.** |
| The level-11 island | **A new island, to be added to the atlas** in the World Builder — off the northern coast, absent from every chart by design. Needs a name and a position. The Cold Stones stay an ordinary far-northern island chain (level 9, by the Gorgi). |
| "Peblos will be region 2" | **Region numbers are main-quest order only** (Drent 1, Luscia 2, Moros 3, East Suval 4). Peblos, Pueth and Elagos are the optional first ring and carry no number. |

## Still open

- The fifteen southern names with no lore (**~** rows) are the weakest part of this table.
  The `azhora.azmap` file in the lore names them; if it also places them, the jungle island's
  interior/ring/coast can be read off it rather than guessed from distance to Scythe.
- The Cold Stones need a row: proposed **9** (rocky islands beside the Gorgi).
