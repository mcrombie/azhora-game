# The lore, adjusted to the atlas — proposed, not applied

> **Nothing in `world-builder` has been changed.** The edits below were to be made in place
> and left uncommitted in `C:\Users\Michael\Programs\typescript\world-builder`, branch
> `whole-world-simulation`, under `azhora_lore\geography\regions\`. **The write was refused:**
> this agent is isolated in its git worktree and the tool declines any edit outside it —
> *"This agent is isolated in the worktree … Edit the worktree copy of this file instead of
> the shared-checkout path."* The coordinator's instruction in that case was to stop and say
> so rather than work around it, so no workaround was attempted and no file in that
> repository has been opened for writing.
>
> What follows is therefore the change **ready to apply**, claim by claim, in the form the
> coordinator asked for: *was / now / the atlas fact that forced it*. Whoever can write to
> that repository can apply it from this document without re-deriving anything.

The rule being applied is the user's, 2026-09-21: **"Favor the atlas over what the lore says.
Adjust what the lore says to fit the atlas."**

## What the atlas actually says, in one place

These are the facts every row below cites. They come from
`world-builder/map/resources/examples/azhora.wwmap` (per-hex `region`, `terrain`, `climate`,
and the river edges) and from `assets/azhora-dev-regions.json`, which is its export.

* The climate field is `koppen-v1`, nineteen codes in use across the continent. **`BWh`, true
  hot desert, exists and is used 245 times** — so `BSh` on a desert is a choice, not a
  shrug.
* The terrain field has **`lake` (28 hexes, five in Elagos)** and **`wetland` (28 hexes,
  twenty-five in the Acor Wetlands)** and `forest` and `deep_forest`. The map can say lake,
  marsh and wood, and says all three elsewhere.
* Per region: Isareos grassland 25 / plains 6, all `Cfa`, **no unclaimed (sea) edge at all**.
  Nethereum grassland 26 / plains 1, all `Cfa`. Ovesos grassland 8 / plains 11, all `BSh`.
  Oves Desert plains 20 / hills 3, all `BSh`. Gala plains 19 / grassland 2; `BSh` × 12
  (northern three rows), `Csb` × 7, `Csa` × 2 (the southern row, on the sea). Eer plains 12 /
  grassland 13; `Cfa` × 11 (inland, north-west), `Csa` × 14 (coastal, south-east).
* **None of the six has a `forest`, `lake` or `wetland` hex.**
* The Lizeem runs on the border of all six in turn. Ovesos shares **no dry hex edge** with
  Caricas or Nesdor; Gala shares none with Nesdor or Eer. The Oves Desert shares **no border
  of any kind with Caricas**.

---

## `isareos.md` — the largest change: the coast is gone

Isareos is landlocked on the atlas. Thirty-one hexes, every neighbouring hex claimed by
another region, no sea anywhere. The file is written as a coastal territory throughout, so
the geography, economy and community sections are rewritten; the name puzzle, the Ambronite
history, the social form and the language section survive with their claims re-pointed.

| was | now | the atlas fact |
|---|---|---|
| "The coastal territory on the eastern Iberos Sea margin — south of the Elagosi lake country, north of the main Iberos commercial zone" | Inland grass country west of the Lizeem's head, between the lake country's approaches and the Ibenwood, north of the Neth | 31 hexes, 0 unclaimed edges; neighbours Caricas, Meneth, Yunethre, West Lotharn, North and East Ibenwood, Nethereum |
| "The coastline of Isareos is the dominant geographic fact" … dozens of bays and inlets, gravel bars, pilotage | Cut. The dominant geographic fact is the grass: low hills of it from the Lizeem's head west to the forest edge | no coast |
| "The Isareos Promontories — the sequence of low headlands … modest, forested, rising perhaps a hundred feet" | The Isareos shoulders: the same modest hundred-foot rises, inland, and **grass to the top** rather than forested | grassland 25, plains 6, `forest` 0 |
| "Low hills … covered in mixed deciduous and scrub forest" | Low hills under deep humid grass, with thorn in the hollows and a narrow gallery of alder and willow on the water | `forest` 0 in a map that uses `forest` two hexes west in the Ibenwood |
| "The sea is where Isareos's productive relationship with its environment is clearest" … the inshore fishery, flat-bottom fish, migratory shoals, shellfish | The stock is: cattle and sheep on grass that never dries out, and the hides and cheese that come off them | no coast, `Cfa` (rain all year) |
| "The Isareos economy is organized around the small vessel and the coastal route" | Organised around the drove road and the river crossing: Isareos is the ground a traveller must cross to reach the inner branch country from the lake country | the one dry land bridge into the whole south-west runs through Isareos |
| "The Iberos coastal trade … uses Isareos's inlets as its rest-and-resupply network" | The overland traffic between the lake country and the branch countries uses Isareos's valley heads the same way, for the same reason: they are where the water is fordable | the Lizeem's head and the Isa are fordable in Isareos and nowhere below it |
| "the route-communities and the pure fishing communities" | the route-communities and the pure grazing communities — the same social division, on the same argument | follows |
| "The individual bay communities of Isareos are the fundamental social unit … each inlet is a community" | The individual valley communities are the fundamental social unit — each valley head is a community | no bays |
| "**Isamouth** — the largest of the Isareos settlements, at the mouth of the small Isa river" | Isamouth stands where **the Isa** joins the Lizeem, at the region's south-eastern corner. The Isa is the river that runs the whole Isareos–Nethereum border, from the western uplands east to the great river | the atlas draws exactly one river there, medium, (-2800, 87) → (-2250, 231), and the lore names exactly one river in Isareos |
| "the specific vocabulary for sea states and wind directions", "The Isareos pilot vocabulary … bar depths at different tidal states" | The ford vocabulary: the specialist terms for the crossings, the height of the water at each, and the conditions that make a ford passable or deadly. Everything the section says about the vocabulary — that it is the primary technical language, that it expands with every season of fieldwork, that a scholar who was there one season has one season of it — survives word for word | no tides; the fords are real and are the country's business |
| "a coastal-substrate naming layer that appears in other eastern Iberos place names" | an older naming layer that appears in other western-interior place names | no coast |
| "periods when Ambron maintained a naval presence on the eastern coast" | periods when Ambron could keep a garrison on the far side of the Lizeem's head | no coast; the Lizeem is the only approach |

**One judgement call in that table, flagged for the user:** the Isa. The lore names the river
and the atlas draws a river there and names nothing. Identifying the two is a derivation from
the lore rather than an invention, and it is the single tidiest way to keep Isamouth. If the
user would rather the Isa stayed a coastal river and the border river stayed nameless, that
row comes out and nothing else in the table changes.

## `nethereum.md` — the Nethermere stops being a lake

The heaviest finding of the job and the one the coordinator has put to the user. Nethereum is
twenty-six `grassland` hexes and one `plains` in a map that has `lake` and `wetland` and uses
both elsewhere. **The proposal does not delete the flood.** It makes the Nethermere a
seasonally flooded meadow rather than a body of standing water — a shallow sheet over grass
for some weeks each spring, and grass for the rest of the year. That is `grassland` honestly,
it keeps the Nethrani, the Flood Council, the Flood Recall, the post-flood pasture and the
cattle intact, and it costs the file the things that need water all year.

| was | now | the atlas fact |
|---|---|---|
| "the Nethermere: a body of standing water that in dry years is a large shallow lake with productive margins and in flood years is a flat inland sea" | the Nethermere: a shallow sheet of water that spreads across the basin's grass each spring and is gone by midsummer, leaving the richest pasture in the inner branch country. In a dry year it barely forms; in a flood year it covers the basin to the ridgelines and stays into summer | `lake` 0, `wetland` 0, `grassland` 26 |
| "In a dry year it is a lake of three to four miles across, with marshland extending well beyond it" | In a dry year the water lies only in the lowest threads and the basin is grazed from spring | as above |
| **Fishery**: "The Nethermere supports a large population of river fish … extensive weir and trap systems … quantities of preserved fish … travel as far as Minora and occasionally Nylon. The fish trade is the Nethrani's most commercially reliable export" | The Neth itself carries the fish, and the weirs are on the river rather than at the basin's outlets. The trade is smaller than the file claimed and is not the country's first export; the **cattle** are | a river has fish; a grassland hex has no fishery |
| **Reed-grain**: "in the shallower margins of the Nethermere, the Nethrani cultivate … a variety of marsh grain … grows in standing water of up to a foot, harvested by wading" | Cut. In its place: the basin's spring-flooded ground is sown to oats as soon as it is walkable, and the crop that makes the Nethrani distinctive is **hay** — two cuts off the flood meadow where their neighbours get one | no standing water to grow it in |
| **Reed and marsh goods**: "the tall marsh reeds used for thatch, basketry, rope fiber … several Nethrani communities specialize in them almost entirely" | Rush and sedge from the wet threads, enough for thatch and basketry and not enough to specialise in; the communities that did now deal in hay and hides | `wetland` 0 |
| **Cattle**: "a compact, short-legged breed adapted to wet ground … moved onto this post-flood pasture as soon as the footing is reliable" | Unchanged, and promoted: it is now the country's principal living | still true of a flood meadow |
| "the Nethermere is not the same body of water from year to year … the line between 'lake' and 'flooded plain' does not exist in the Nethermere as a fixed thing" | Kept almost whole: the line between *meadow* and *flooded plain* does not exist as a fixed thing, and the Nethrani have mapped every foot of the gradient | the atlas is silent on relief, so the basin itself stands |
| "The climate is wetter than Ovesos and much wetter than the main Mithala plain" | Unchanged — and now understated. Nethereum is `Cfa`, Ovesos is `BSh` | `Cfa` × 27 against `BSh` × 19 |
| the Flood, the Flood Council, the Flood Recall, *nethvel*, *haethoss*, *nethoss*, the Drying Festival | **All kept.** A meadow that floods every spring and drowns people who misjudge it carries every one of them | nothing in the atlas touches them |

## `ovesos.md` — the valley is a steppe

`BSh` over all nineteen hexes. The file says "temperate and wet". This is the one the first
draft of `docs/six-regions-brief.md` decided the other way and the user reversed.

| was | now | the atlas fact |
|---|---|---|
| "The climate is temperate and wet, sharing the Mittolo character without the main plain's scale. Winters are cold, short-summer, with spring floods" | Hot and dry: long burning summers, short mild winters, and rain that comes in a few weeks and then does not come again. The Oveth's rise is snow and hill-rain off the upland, not a wet season | `BSh` × 19 |
| "orchards on the gentle slopes above the floodline" ; "**The apples of the Sorten** — dense, acid, long-keeping … have a commercial reputation that has traveled further than Ovesos itself" ; the pears and the winter drink | Cut. In their place: the Sorten's irrigated bottomland grain — barley and hard wheat, watered off the Oveth by channel — and above it nothing but grass. What has travelled further than Ovesos itself is its **wool** | apples do not keep in a hot steppe; the lore already gives the river as "substantial enough for irrigation" |
| "a valley microclimate that produces fruit at a latitude where the main plain cannot" | a valley microclimate that produces grain where the country either side of it produces only grass | as above |
| "The Galans have been buying them long enough to know the specific character of trees grown from the valley's mineral-heavy, slightly damp soil" | The Galans have been buying Ovesian wool and hides long enough to know the specific character of a fleece grown on the Sorten's grass | follows |
| "Livestock on the upland ridges … provide wool, meat, and the secondary agricultural economy the valley bottomland cannot accommodate" | Livestock **is** the economy; the irrigated bottomland is the part that cannot accommodate more of it. The upland herders' seasonal round and their separate dialect are unchanged, and their standing in the kingdom is raised to match | `BSh`; grassland north, plains south |
| "The upper Oveth's gradient drives mills — grain mills and fulling mills" | **Kept.** A river with gradient drives a mill whatever the rainfall, and a fulling mill is a wool country's mill | nothing in the atlas touches it |
| the Water Council, water-right seniority, *osk-milis*, the Middle Reach dispute, King Melos, the Nescor wars | **All kept**, and every one of them is stronger: water rights are the whole of politics in a steppe | nothing in the atlas touches them |

## `oves_desert.md` — the rain shadow is the Pyros divide, and Caricas is six hundred metres away

| was | now | the atlas fact |
|---|---|---|
| "The boundary with Caricas to the east is the most contested. The eastern margin of the Oves Desert coincides — approximately — with the western bank of the Carica River's upper drainage" | The contested boundary is with **Ovesos to the north-east**, where the desert margin and the Sorten's grazing land overlap, and with **Telemonia to the south** | the Oves Desert's neighbours are Ovesos (13 edges), the Nether Desert (8), Telemonia (12), East Pyros (5) and Gala (2). It shares **no** border with Caricas |
| "the Carican Voice" as the opposing party throughout the water-rights and seasonal-use sections; "the Carican corridor communities … not primarily grazing but woodland management and the protection of the vel-caric corridor" | The **Telemon bands** in the same role: their presence on the desert margin does not depend on the annual grass either, because their business there is the routes and not the grazing | as above |
| "the hills separating the Oveth basin from the main Lizeem system run roughly north to south … the Oveth-facing eastern slope receives the air that has already lost its moisture" | The hills along the desert's own north-western rim, behind which lies East Pyros — itself in the rain shadow of the Pyros divide. The Oves lies in the far tail of the same shadow | the 3 `hills` hexes are on the north-west rim, at x -2400…-2500; East Pyros is the neighbour beyond them |
| "it is not large, it is not particularly severe … the word 'desert' seem[s] like an overstatement" | **Kept, and confirmed.** The map codes it `BSh`, hot steppe, in a vocabulary that has `BWh` for true desert and uses it 245 times elsewhere | `BSh` × 23 |
| "In wet years … annual grasses and forbs … germinate in large numbers" ; the drought-tolerant tail of the inner-branch flora | **Kept.** Steppe is exactly what that describes | `BSh` |

## `gala.md` — the compass turns, and the country is a climate gradient

| was | now | the atlas fact |
|---|---|---|
| "the coastal plain that lies between the rocky base of the Ascarth Peninsula to the north and the river's broad delta to the east" | between the dry interior to the **north** — Ovesos's plains and the Oves Desert beyond them — and the Lizeem to the **east**, with the Ascarth foothills coming in from the **south-east** | Gala's northern neighbours are Ovesos and the Oves Desert; Northern Ascarth is on 8 edges to the south-east |
| "The region of Gala runs roughly thirty miles along the coast … and twenty to twenty-five miles inland" | runs roughly thirty miles **down the river** from the Ovesian border to the delta, and twenty to twenty-five miles inland from it; the sea is the southern end of the country rather than its long side | 2 unclaimed hexes, both on the southern row |
| "warm, well-watered by the Lizeem's distributaries and seasonal rains off the sea, sheltered from the worst of the interior weather by the Ascarth hills behind it" | **Kept for the south, denied for the north.** The southern third is exactly that; the northern half is not sheltered from the interior weather, it is the interior weather — dry, hot, and grazed rather than farmed | `Csa`/`Csb` on the southern rows, `BSh` on the northern three |
| "The northern edge of Gala, where the plain meets the foothills, has a different character … more pastoral, with the upland farming communities that supply the coastal markets, distinct enough to be considered almost a different region by the Galans themselves" | **Kept almost word for word** — the difference is that the northern edge is dry steppe rather than foothill, and that "almost a different region" understates it | the climate line is inside the country |
| "The people of the foothills have a relationship with Aevis that is more direct — they are closer to the peninsula's territory" | The people of the **south-eastern** rises have that relationship; the northerners' dealings are with Ovesos and the desert margin | Northern Ascarth is to the south-east |
| "It grows food without great effort" | The south grows food without great effort. The north grows stock | `BSh` |
| the city, the harbour, the Guild of Assessors, the guest-right, the Avite cycle, Nylon across the river | **All kept.** The atlas denies none of it | — |

## `eer.md` — no hills, and the coast is the grassy half

The lightest of the six.

| was | now | the atlas fact |
|---|---|---|
| "rises gently toward low chalk hills in the interior, which mark the region's northern limit and separate it from the dryer Mittoli upland country beyond" | rises very gently inland to the north-west and then simply stops being farmed. There are no hills in Eer, and no line where it ends | `hills` 0 |
| "The land is flat near the coast" with the interior implied richer | The coast is the grassy half and the **inland** half is the heavy alluvial ground: the deep loam is north-west, the dry tawny grass is on the sea | `plains` 12 with `Cfa` inland; `grassland` 13 with `Csa` coastal |
| (climate unstated) | Stated: wet all year in the north-west, hot dry summers and mild wet winters on the coast, with the change happening in the middle of the country rather than at either border | `Cfa` × 11, `Csa` × 14 |
| (western boundary unstated) | The Lizeem is the western boundary, and it cannot be crossed anywhere along the Eer bank; Gala is on the far side of it | every Eer–Gala hex edge carries the large river; there is no dry one |
| "The soil is the deep alluvial loam deposited by the Lizeem's seasonal floods" ; "it requires maintenance" ; the north road, the occupations, the walls of Nylon, the people | **All kept** | — |

## `nether_desert.md` — three sentences only

Touched only where it contradicts the atlas about one of the six.

| was | now | the atlas fact |
|---|---|---|
| "the elevated interior plateau west and south of the Nethermere watershed's drainage divide" | west and south of the Neth's own drainage divide | the Nethermere is no longer a lake |
| "the vegetation shifts from the scrub of the high plateau to the grassland and marsh-edge of the Neth's middle course" | …to the grassland of the Neth's middle course | `wetland` 0 in Nethereum |
| "when the Nethermere's expansion pushes the productive zone further up the drainage" | when the spring water pushes the productive zone further up the drainage | as above |
| "In a year when the upland has received significant rain, the Nethermere floods high" | **Kept.** A flood meadow floods | — |

---

## To review it once it is applied

```
git -C C:\Users\Michael\Programs\typescript\world-builder diff -- azhora_lore/geography/regions/
```

Files to be touched, and no others: `isareos.md`, `nethereum.md`, `ovesos.md`,
`oves_desert.md`, `gala.md`, `eer.md`, `nether_desert.md`. The user's own uncommitted work in
that repository — `moros.md`, `suval.md` and the map application under `map/` — is not to be
touched, and nothing there is to be committed, staged, stashed, branched or pushed.
