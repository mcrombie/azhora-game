# Four regions: Vastos, Meneth, Caricas and Nesdor

Terrain and wildlife only. No settlements, no people, no roads into towns: the four
countries get their ground, their water, what grows on them and what lives there, and
nothing that belongs to anybody.

The brief for each is its lore file in `world-builder/azhora_lore/geography/regions/`,
plus `fauna/azhoran_fauna_overview.md` and `geography/azhoran_flora_distribution.md`.
Where those are silent this document says so and says what was chosen instead.

---

## Where they are, and what the atlas already says

All four are authored regions of the World Builder map, and all four fall inside the
survey window the game already bakes into `src/region-survey.js`. They form one
contiguous belt on the western side of the playable world, joining it at Elagos in the
north-east and the Moros Plain in the south-east:

| Region  | hexes | world x        | world z        | neighbours in the atlas                  |
|---------|-------|----------------|----------------|------------------------------------------|
| Vastos  | 29    | -1800 … -1250  | -577 … -58     | Elagos (E), Amod (NE), Meneth (W)        |
| Meneth  | 24    | -2050 … -1500  | -404 … 202     | Vastos (NE), Elagos (E), Caricas (SW)    |
| Caricas | 32    | -2200 … -1650  | -144 … 549     | Meneth (NE), Nesdor (SE), outland (W)    |
| Nesdor  | 30    | -1750 … -1200  | 289 … 895      | Caricas (NW), Moros Plain (E)            |

The map's own terrain grades them almost entirely `grassland`, except Nesdor, which is
`plains` from its middle southward with a grassland-and-forest head in the north-west.
Its Köppen field says `Cfa` for every hex in all four, which is the same value it gives
Drent, the Moros and the Lotharn foothills; it is a default, not a statement, and the
lore contradicts it directly for Vastos and Meneth. **The lore wins on climate.**

The map also authors real rivers here. Chained into watercourses they are:

* a **small** course along Vastos's southern margin, from (-1700, -260) east and south to
  (-1450, 58), where it leaves for the lake country;
* a **small/medium** beck on Vastos's northern border with Amod, (-1300, -548) to
  (-1200, -375);
* a **medium** course from (-1600, 260) running south-west to (-1800, 606): the **Carica**;
* a **large** course down the whole western side of Caricas and along Nesdor's southern
  edge, (-2150, -115) → (-1800, 606) → (-1500, 953): the **Lizeem's upper channel**.

Meneth has no authored water at all, and Nesdor has none of its own besides the Lizeem.
Both lore files say otherwise (every Meneth valley has its stream; several small
tributaries cross Nesdor), so those are derived from the landform rather than the atlas,
and marked as such below.

### Where lore and atlas disagree

Three bearings do not match, and are recorded rather than reconciled:

1. Meneth's lore puts the **Amod foothills on its western edge** and the East Lotharn
   above it to the north. The atlas puts Amod 830 m to Meneth's **east** and the East
   Lotharn to its north-east. Meneth is built with the character the lore gives it —
   ridge-and-valley upland on a mountain margin, softening toward the lake country — and
   not with the compass the lore gives it.
2. Vastos's lore says the Vastos River runs **east to west**. The atlas's river runs
   west to east, and the game's own relief agrees with the atlas: Vastos stands above the
   lake country, so its water can only leave eastward. Built flowing east.
3. Nesdor's lore says its tributaries come from "the hill country to the south and west".
   In the atlas the hill country is Caricas's shelf to the **north-west** and the Lizeem
   is the drain to the south. Built running from the northern valley head south to the
   Lizeem, braiding as the gradient dies, which is the lore's mechanism if not its compass.

`src/campaign-world.js` already carries one-line designs for all four (Vastos "flat,
frost-heaved upland pasture", Meneth "route-junction valleys", Caricas "open grassland
southwest of Meneth", Nesdor "plains giving way to the western deserts"). Those are older
and thinner than the region files; Caricas is not open grassland and Nesdor is not desert
margin. The campaign designs are story data and are left alone.

---

## Vastos — the cold tableland

**Landform.** "Genuinely flat by highland standards — a broad elevated tableland that sits
above the surrounding terrain on both its eastern and western approaches, reached by
gradual climbs." So: the highest ordinary ground in the playable world after Amod's
hills, and the flattest. Base 30.5 m against Elagos's 19.8 shelf and the Moros's 6.4, with
relief amplitude 1.0 over a 300 m wavelength — a tenth of Amod's and a third of the
Moros's, over a wavelength three times as long. The hex blend does the rest: the climb
from the lake country is a ten-metre rise over two hundred, which is the lore's "gradual".

**Water.** The Vastos River on the atlas's line, **braided through its middle third**
where the flat ground slows it (two side threads leaving and rejoining round a gravel
island), and cut only about a metre and a half into the plain: "not a large river in the
lowland sense: relatively shallow". The snowmelt beck on the Amod margin — "fed by snow
melt from the higher ground at the margins" — falls off the north-east and shallows to
nothing on the flat. Five **watering pans** across the open plain: shallow, wide, a hand's
depth of water in a dish of turf, which is what "the management of the small watering
points across the plain" means on ground this level.

**The western margin** carries "the residual geothermal ground, the occasional sulfur
spring, the rock types that the Pyrosi identify as meaningful even when they are not
actively fumarolic". Built as one sinter apron on the plain's western edge: a low pale
crust, three vents with standing steam, a warm pool, and ochre-stained stone round it.

**The eastern margin** is "moister and more varied, with some small lake basins that
prefigure the Elagosi landscape beyond": two shallow basins holding water, on the fall
toward Elagos, with wetter ground and more scatter between them.

**What grows.** "The grass, which is Vastos's primary resource, grows in the dense
cold-adapted varieties that upland grazing requires", and "there is no significant
sheltering terrain". So: no canopy, dense tussock, and nothing taller than a thorn except
in the lee of the river banks. No trees on the open plain at all.

**What lives there.** The lore names one animal and it is the **Vastos longhorn** — "a
large, cold-tolerant breed", the foundation of the economy and the unit of social
accounting. Loose grazing bands on the open range, no fences, no fold, nobody with them.
Beyond that the lore is silent on Vastos's wild fauna, so the two nearest documented
uplanders are extended in: the **dry-plateau hawk**, which the fauna overview places in
East Pyros where it "hunts the upland grasslands" — Vastos's western margin is the Pyros
transition — and the **upland hare**, documented for the Ganoss uplands in the north.
Both extensions are flagged in the code where they are placed.

## Meneth — the ridges

**Landform.** "A sequence of parallel ridges running roughly east-west across the
territory, with the open valleys between them acting as natural corridors for north-south
movement. The ridges are low enough to cross without specialized route-finding but high
enough to make the crossing of them a measurable effort." Built literally: a ridge field
with crests running east-west, five of them across the region, crest to crest about 130 m,
about 14 m from valley floor to ridge line. That is a two-minute climb and a real one.

"Moving south from Meneth, the ridges lower and widen, the valley floors broaden": the
ridge amplitude fades to nothing across the southern third, so the region hands itself to
the lake country without a line to cross, which is what the lore insists on.

**Water.** "Each valley has its stream, fed by the Lotharn snowmelt, running generally
south and east toward the lake-country drainage." The atlas draws none, so one stream is
derived per valley trough, on the valley floor, falling south-east. Shallow — these are
becks, not rivers.

**What grows.** Three bands, by height above the valley floor, which is how the lore
divides the economy: "ridge faces that are forested on their upper slopes and cleared to
meadow on the valley floors"; the upper-slope woodland is "medium-diameter hardwood", not
the Lotharn's heavy mature timber; and on the lower slopes "the nut orchards appear:
wild-chestnut and managed walnut groves". Built as three rules on one number — meadow on
the floor, nut groves on the lower slope, close-grown hardwood above.

**What lives there.** The lore names sheep and cattle "on the ridgeline grazing" and
nothing wild. Hill sheep on the ridge commons; the dry-plateau hawk and the upland hare
carried over from Vastos, both flagged as extensions.

## Caricas — the fox's corridor

**Landform.** Two kinds of country, and the lore is precise about both. "A fast, rocky
upper section where the eastern plateau breaks into the inner drainage basin, and a
slower, wooded middle valley where the river loses gradient." So the north-east of the
region is the **upland shelf** — sixteen metres above the rest, rougher, drier — and the
Carica leaves it in a narrow, steep, gravel-bedded cut. Below that the valley opens: a
wider floor, a slower river, banks that the lore says have never been cleared. The western
side falls away to the **Lizeem's upper channel**, which is the biggest water anywhere in
the playable world and is cut as a real river, not a stream.

**What grows.** "The corridor's distinctive feature is its woodland: old-growth mixed
forest along the immediate riverbanks, breaking into managed woodland and farmland above
it. This is the fox's habitat. The Caricas have not cleared it." So the bank woodland is
the densest scatter of the four regions, tight to the water, and it thins by distance from
the river rather than by hex. The shelf above is thin, stony and nearly bare. No terraces
and no crops are built: the lore's terraced slopes and margin grain are farming, and
farming belongs to the people this pass does not build.

**What lives there.** This is the one region whose animal the lore describes in full. The
***vel-caric***, the river fox: "a small, semi-aquatic carnivore with a distinctive
dark-tipped tail and the narrow, mobile face of a creature that lives in river margins",
which "hunts along the water's edge rather than in fields", uses "a narrower band of the
bank" than the otters it shares the corridor with, and — the thing that has to be in the
code — **"when approached, it does not flee unless directly threatened. It watches."**
Every other animal in this build runs. The fox turns its head, holds the traveler, and
stays. It only moves off if you walk right up to it.

The otters are the lore's too ("the same territory as the Carica's otter population"), and
they behave like ordinary animals: they leave.

## Nesdor — the flats

**Landform.** "The transition in river character from the inner-branch tributaries to the
open drainage of the Moros approach." The north-west head of the region is the varied part
— "shallow, broad valleys, but valleys, with defined valley floors and sloping sides" —
and everything south and east of it is **the Nesdor Flats**, where "the terrain relief is
measured in feet rather than hundreds of feet". Built as a fall from a head at 9.5 m to a
floor at 6.8, with relief that dies almost completely on the flats: flatter than anything
in the world except the Moros itself, which it runs into. "The horizon opens here in a way
it does not in the valley-organized branch country."

The atlas's own terrain helps: its grassland-and-forest head in the north-west and its
plains everywhere else are exactly the lore's two halves, so the head and the flats are
separated by the cell terrain and not by a hand-drawn line.

**Water.** The **Lizeem** along the southern edge, on the atlas's line, with the **Carica**
joining it from Caricas. Across the flats, two derived tributaries that "widen, slow, and
begin to braid in the way that rivers braid when the gradient declines": shallow, several
channels wide, with bars of sand between them, and dark alluvial ground either side —
"the soil is the dark alluvial material that centuries of river sediment have deposited".

**What grows.** Open grassland on the flats, shading toward the Moros's own; in the
western head, "woodland on the slopes" with "the nut crop (primarily hazel, some oak)".
Hazel and oak on the valley sides, grass everywhere else, nothing on the flats but sky.

**What lives there.** The **Nesdor cattle**, which the lore introduces by saying they are
*not* the Vastos longhorn: "a hardy grassland breed, not the cultural center that the
Vastos longhorn is in Vastos, but a practical animal suited to the semi-open terrain."
Built as the same animal at three-quarters the size with shorter horns, which is what that
sentence describes. Sheep "on the margins between the valley agriculture and the open
grassland". On the water, **wading birds**: the fauna overview calls the Lizeem
distributaries' assemblage "the richest avian assemblage documented on the continent", and
herons and stilt-legged waders are the ones it names.

---

## What is deliberately not built

* Every settlement, road, fence, field wall, terrace, mine, orchard wall, bridge, ford and
  person in all four lore files. The Vastos crossings, the *vel-caric-hass* keeper
  families, the Southern Lotharn Road, the Nesdor Way, the water councils: none of it.
* The Moros's western rope fence (`FRONTIER`, `src/frontier.js`) is left standing where it
  is, even though Nesdor is now real country beyond it. It is chapter furniture for the
  Moros, not a map edge, and moving it is a story decision.
* Caricas's terraced slopes, valley-margin grain and eastern iron workings: farming and
  mining, so people.

## How it is built

* `src/region-layout.js` — four biome profiles (ground colour, canopy, per-hex counts).
* `src/region-world.js` — ids 11-14, four terrain profiles, region text, natural landmarks.
* `src/west-regions.js` — pure: the water of all four (atlas courses plus derived streams
  and braids), Meneth's ridge field, Vastos's pans and sinter, Caricas's shelf and
  corridor, Nesdor's flats.
* `src/west-ground.js` — pure: the landform as a function, on the `amod-terraces.js` model.
  It reshapes the relief it is handed and leaves everything outside its own ground alone.
* `src/west-regions-scenery.js` — the water surfaces, gravel bars, reeds, steam, sinter,
  boulders and the three regions that scatter their own vegetation.
* `src/west-regions-life.js` — seven animals, on the `road-life.js` model: the longhorn,
  the hill sheep, the river fox, the otter, the upland hare, the plateau hawk and the
  wading bird.
* Tests: one file per region in `tests/`.
