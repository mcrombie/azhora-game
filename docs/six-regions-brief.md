# Six regions: Isareos, Nethereum, Ovesos, the Oves Desert, Gala and Eer

Terrain and wildlife only, exactly as Vastos, Meneth, Caricas and Nesdor were built
(`docs/four-regions-brief.md`). The six countries get their ground, their water, their
weather, what grows on them and what lives there, and nothing that belongs to anybody: no
settlement, no road, no field wall, no bridge, no boat, no person, no sign, no quest.

The brief for each is its lore file in `world-builder/azhora_lore/geography/regions/`, plus
`fauna/azhoran_fauna_overview.md`, `geography/azhoran_flora_distribution.md` and
`geography/regions/iberos_coast.md`. Where those are silent this document says so and says
what was chosen instead.

---

## Where they are, and what the atlas already says

All six are authored regions of the World Builder map. They continue the western belt past
Caricas and Nesdor and then turn south-east down the Lizeem to the sea:

| Region | hexes | world x | world z | neighbours in the atlas | sea |
|---|---|---|---|---|---|
| Isareos | 31 | -2850 … -2150 | -231 … 202 | Caricas (E), Meneth (NE), Nethereum (SW), Yunethre (N), West Lotharn (NE), N/E Ibenwood (W) | none |
| Nethereum | 27 | -2900 … -2150 | 202 … 549 | Isareos (N), Caricas (E), Ovesos (SE), Nether Desert (SW), East Ibenwood (W) | none |
| Ovesos | 19 | -2250 … -1700 | 549 … 895 | Nethereum (NW), Caricas (NE), Nesdor (E), Gala (SE), Oves Desert (SW), Nether Desert (W) | none |
| Oves Desert | 23 | -2500 … -1850 | 722 … 1068 | Ovesos (NE), Nether Desert (N), East Pyros (W), Telemonia (S), Gala (SE) | none |
| Gala | 21 | -1850 … -1450 | 982 … 1415 | Ovesos (N), Nesdor (NE), Eer (E), Oves Desert (NW), Telemonia (W), N Ascarth (SE), Legemum (S) | 2 hexes, south |
| Eer | 25 | -1450 … -900 | 895 … 1328 | Moros Plain (N), Nesdor (NW), Gala (W), West Suval (NE), N Ascarth (S) | 12 hexes, east and south |

Adding them moves the world's western edge from **-2310 to -3010** and takes the playable
world from 29.2 hexes east to west to **36.2**. North to south nothing changes: 30.93 hexes,
still set by West Izol in the south and Amod in the north.

### The climate is on the map, and for the first time it says something

The four-regions brief recorded that the atlas's Köppen field read `Cfa` for every western
hex and called it "a default, not a statement". That was true of the dev export, which drops
the field entirely. The **World Builder map itself carries a `climate` per hex**, and over
these six it says three different things:

| Region | Köppen, by hex | reads as |
|---|---|---|
| Isareos | `Cfa` × 31 | humid subtropical: warm wet summers, cool wet winters, rain all year |
| Nethereum | `Cfa` × 27 | the same, and the lore adds that the basin's water makes it milder and greyer |
| Ovesos | `BSh` × 19 | hot semi-arid steppe |
| Oves Desert | `BSh` × 23 | hot semi-arid steppe — the rain shadow |
| Gala | `BSh` × 12, `Csb` × 7, `Csa` × 2 | dry in the north, Mediterranean in the south |
| Eer | `Cfa` × 11, `Csa` × 14 | humid inland, hot-summer Mediterranean on the coast |
| *(Nether Desert)* | `BSh` × 26 | *for context; not built* |

Three codes, drawn along lines that match the lore — the arid wedge round the Oveth basin,
the Mediterranean coast the flora document describes in those words ("The Iberos Coast,
facing the Iberos Sea, has a Mediterranean climate — warm dry summers, mild wet winters") —
is a statement. **The atlas wins on climate here, except once**: see disagreement 4.

### The rivers, read off the map

Every course below is authored on hex edges in `azhora.wwmap` and is not invented:

* **The Lizeem**, large, the drain for the whole western quarter and the spine of this job.
  It runs on the *borders* of these countries for its whole length: Caricas|Isareos (medium,
  its head) → Caricas|Nethereum → Caricas|Ovesos → Nesdor|Ovesos → Nesdor|Gala →
  **Eer|Gala** → Eer|Northern Ascarth, and off the map's western edge of the playable window
  toward the sea at (-1350, 1213).
* **The Neth**, medium, off the Nether Desert plateau at (-2350, 577) and east along the
  Nethereum|Ovesos border to the Lizeem at (-2100, 491).
* **A second medium course** along the whole Isareos|Nethereum border, (-2800, 87) →
  (-2250, 231), joining the Lizeem at the Caricas corner. The lore names no river here.
* **The Oveth**, medium and small, from (-2050, 751) down the Ovesos|Oves Desert border and
  east along Ovesos|Gala to the Lizeem at (-1650, 924).
* **A small course** on the Gala|Telemonia border, (-1900, 1126) → (-1800, 1472), and
  smaller ones on Oves Desert|Telemonia. Unnamed in the lore.

---

## Where lore and atlas disagree

Seven, recorded rather than reconciled, in the order they bite:

1. **Isareos has no coast.** Its lore is entirely a coastal territory — "the coastline of
   Isareos is the dominant geographic fact", dozens of inlets, the promontories, the
   inshore fishery, boatbuilding timber, Isamouth on the Isa river. **The atlas gives Isareos
   thirty-one hexes with zero unclaimed edges: it is landlocked, six hundred metres of it
   between Caricas and the Ibenwood.** There is no reconciling this; it is not a bearing, it
   is a different country. Built with the half of the lore that survives the move: the
   interior. "Low hills, not quite highlands, covered in mixed deciduous and scrub forest,
   rising gradually away … some grain in the better valley floors, some mixed livestock,
   significant woodland resources." The inlets, the fishery and the boats are not built, and
   **this is the user's call to overrule if Isareos is meant to be somewhere else.**
2. **The Nethermere is not on the map.** Nethereum's lore is one seasonal basin lake and the
   country of elevated islands round it. The atlas gives twenty-six grassland hexes and one
   plains, no lake terrain, and draws both its rivers along the region's *borders* rather
   than into its middle. A country cannot be built without the thing it is. **The Nethermere
   is built in the middle of Nethereum**, as a broad shallow basin holding water, with marsh
   margins, ridge ground round the rim and derived channels from both authored courses into
   it and one out to the Lizeem. Flagged as derived at the placement, as Meneth's becks were.
3. **The Oves Desert is nowhere near Caricas.** Its lore puts its contested eastern margin on
   "the western bank of the Carica River's upper drainage", with Carican corridor families
   working it. The atlas puts the Oves Desert at x -2500…-1850, z 722…1068 — six hundred
   metres south-west of Caricas, sharing no border with it at all. The whole Branch-Compact
   boundary dispute is between people and is not built, so the disagreement costs nothing on
   the ground; the desert is built where the atlas puts it, on the Oveth basin's south-west.
4. **Ovesos is not semi-arid.** The one place the atlas's climate field is overruled. `BSh`
   over all nineteen hexes, against a lore that is emphatic: "the climate is temperate and
   wet … winters are cold, short-summer, with spring floods", barley and hard wheat, apple
   and pear orchards, fulling mills on a river with gradient. Apples do not keep in a hot
   steppe. Built as the lore's green river valley, **with its south-western margin drying
   toward the Oves Desert**, which is where the atlas's reading is right and is the whole
   subject of the desert's lore.
5. **Gala's compass is turned.** The lore has the Ascarth Peninsula's foothills to Gala's
   north and the Lizeem's delta to its east. The atlas has the dry Ovesos/Oves Desert
   interior to its north and Northern Ascarth to its **south-east**, with the Lizeem on its
   east as the Eer border. Built with the atlas's compass and the lore's character: dry
   pastoral upland in the north, Mediterranean coastal plain in the south, the great river
   on the east.
6. **Eer has no chalk hills.** "The land is flat near the coast and rises gently toward low
   chalk hills in the interior, which mark the region's northern limit." The atlas gives Eer
   twelve plains hexes in the north and thirteen grassland in the south, and no `hills` hex
   anywhere. Built as a gentle rise to the north-west and no hill line.
7. **Nylon is not on the atlas.** Eer is defined by it — "the agricultural hinterland north
   and east of Nylon", the north road, the walls — and Gala is defined against it across the
   river. Neither the city nor the road is built; the country is built as the farmland it is,
   with nothing in it that Nylon put there.

`src/campaign-world.js` already carries one-line designs for five of the six (Ovesos "dry
grassland at the edge of the Oves Desert", Oves Desert "open desert with low hills", Isareos
"grassland west of the Lotharn", Nethereum "grassland toward the Nether Desert", Gala "plains
south of Nesdor"). Those are older and thinner than the region files, and one is wrong twice
over: it also calls Gala "the walled Pyrosi capital above a river confluence" in West Pyros,
which is a different Gala from the atlas region. **The campaign designs are story data and
are left alone**, as they were for the four.

---

## The Lizeem is a wall, and only one of the six is on this side of it

The most important fact about this job. The Lizeem is `fordUntil: 0` and carries a continuous
line of `west-deep-water` colliders; nothing on foot crosses it anywhere. It runs on the
border of every one of these countries in turn, and it sorts them into two sides:

* **Near bank (walk straight there): Eer.** Eight dry hex-edges with Nesdor at z = 938,
  (-1475, 938) through (-1150, 938), and five with the Moros Plain at z = 852, (-1125, 852)
  through (-925, 852). A traveler who walks south off the Moros Plain is in Eer. It is the
  closest of the six to where the game actually is.
* **Far bank: Isareos, Nethereum, Ovesos, Gala.** Every metre of Ovesos's border with
  Caricas and Nesdor is the Lizeem; every metre of Gala's with Nesdor and Eer is the Lizeem.
  The only way to them on foot is **round the head of the river**, at Caricas's and Meneth's
  north-west corner: one dry edge Meneth|Isareos at **(-2100, -231)** and two dry edges
  Caricas|Isareos at **(-2150, -144)** and **(-2125, -188)**, all of them above the Lizeem's
  first authored edge at (-2150, -115).
* From Isareos on, the chain is: Isareos → Nethereum by two dry edges at (-2875, 159) and
  (-2825, 159), round the western head of the Isareos-border river; Nethereum → Ovesos by
  **fording the Neth**, which is the only link between them (nought dry edges, five river
  edges); Ovesos → Oves Desert by six dry edges, (-2275, 679) through (-2075, 765); Ovesos →
  Gala or Oves Desert → Gala by **fording the Oveth**, which is again the only link.

So the walking route into the far four is about four kilometres from Caricas's north-west
corner, and it turns on two fords. **Both are `medium` rivers on the map, as the Carica is,
and the Carica is waded for the first third of its length.** The Neth and the Oveth will be
built the same way: fordable in the upper reach, deep below it.

### The Nether Desert, which the user did not name

It lies **west of Nethereum and north of the Oves Desert**, x -3050 … -2350, z 549 … 895 —
outside the six but hard against three of them. Nothing in this job requires crossing it:
Nethereum reaches Ovesos directly across the Neth, and Ovesos reaches the Oves Desert on six
dry edges. **But if the Neth is built unfordable, the Nether Desert becomes the only land
bridge between Nethereum and Ovesos** (Nethereum has eight dry edges with it, it has eight
with the Oves Desert and one with Ovesos), and the route through the six would run through a
country nobody has built. That is why the Neth gets a ford, and it is the one decision here
that is the user's rather than mine: **if the Neth should be a wall like the Lizeem, the
Nether Desert has to be built too.** It is also, on the atlas, the only thing between the six
and the two Pyros — so it is the natural next country after these.

One more consequence: the world's western edge goes to x = -3010 and the Nether Desert's own
hexes reach -3050. Unless it is in `LAND_HEXES` the ground immediately west of Nethereum
becomes sea. It will be: the survey window is widened to cover it and everything else inside
the new bounds, without making it playable. Hexes in `LAND_HEXES` are land; only
`PLAYABLE_REGIONS` are country.

---

## Eer — the farmland that has been taken eleven times

**Landform.** "The land is flat near the coast and rises gently toward low chalk hills in the
interior." The hills are not on the map (disagreement 6), so: a plain, falling from about
7.5 m on its north-west shoulder against Nesdor to 2.6 m on the coastal plains hexes, with
relief amplitude under 1 over a long wavelength. Flatter than Nesdor's Flats and wetter.
The deep alluvial loam is the ground colour's whole job: dark, heavy, worked — the darkest
open ground in the game.

**Water and coast.** Two things, and both are the map's. The **Lizeem** on the western
border, the new lower reach of it, running south-east between Eer and Gala, and **the sea**:
twelve unclaimed hexes on the east and the south, from (-800, 895) round to (-900, 1415).
That coast is the first thing in this job the existing machinery already draws — the signed
distance field over `LAND_HEXES` makes the shoreline, and the sea plane is already under it.
The lore gives its character: "a series of low headlands and small sheltered bays, none large
enough to be major harbors". So: a low soft shore with no cliff and no beach of Tidehaven's
kind, and the surf reaching further inland in the bays.

Inland, the lore's canals: "river-fish in its canal systems", "the systems of drainage". Those
are dug, and digging is people. **Not built.** What is built instead is the natural version of
the same water: two shallow distributary channels off the Lizeem crossing the plain
south-east to the sea, braiding as the gradient dies — the same mechanism as Nesdor's Flats,
one region further down the same river.

**Climate as a traveler feels it.** `Csa` on the coast, `Cfa` inland: hot dry summers with a
sea breeze that arrives every afternoon, mild wet winters, and a light that is the first real
change since the lake country. This is where the game stops being green.

**What grows.** The lore is a list and every item is farmed: grain, olives, orchard fruit.
Farming is people. So the wild version: **coastal Mediterranean scrub** on the sandy ground
behind the bays — low aromatic cushion, the same shape East Suval already draws for its
limestone but paler and drier; **tamarisk and oleander** in the channel beds; **umbrella pine
and holm oak** in loose stands on the drier rises inland, never a closed canopy; and dry
tawny grass with a thin spring green everywhere else.

**What lives there.** The fauna overview's one direct statement about this water is the
richest thing in it: the Lizeem distributaries carry "the richest avian assemblage documented
on the continent", and it names **herons, spoonbills and a range of stilt-legged waders**.
Eer is where that is true. So:

* **Herons and egrets** on the channels — the existing `wading-bird`, retinted white for the
  egret and used at two sizes.
* **Black-winged stilts** on the braided shallows, the lore's "stilt-legged species".
* **Mallard and teal** on the slow water — a new small duck, which the Nethermere needs too.
* **Wild boar** in the tamarisk and the scrub, which is what lives in it.
* **Gulls** along the coast, which the game already names as a species in Drent.
* **Grey dolphins** offshore: the fauna overview documents them "in the Lizeem estuary at
  Nylon during upriver fish migrations", and the estuary is Eer's own south-west corner. A
  back and a fin, out past the surf, seen and not reachable.

## Isareos — the wooded hills, without the sea

**Landform.** The interior half of the lore: "low hills, not quite highlands … rising
gradually away from the coast to the upland margins where the territory blurs into the
southern edges of the lake country or the approaches to Vastos". On the atlas the blur is
into Meneth and Caricas, which stand at 26 and 17 m, and the Lizeem's head cuts its eastern
side. Base 22 m with an amplitude of 4.5 over a 120 m wavelength — the most ordinary rolling
country in the west, and deliberately so: everything round it is either flat or a ridge
field, and this is the one that is neither. The atlas puts its `plains` hexes along the
western and north-western rim against Yunethre and the Ibenwood; those drop to 18 and open
out.

**Water.** Two authored courses, both on borders. The **Lizeem's head**, medium where the map
marks it so, down the Caricas side — already built, and unchanged by this pass. And the
**unnamed medium river** along the whole Nethereum border, from (-2800, 87) east to the
Lizeem at (-2250, 231). The lore names no river in Isareos at all except the Isa at Isamouth,
which is on the coast that is not here, so **this river is left unnamed and listed for the
user**. Derived from the landform, as Meneth's becks were: three short becks off the hill
ground into it, one per valley.

**Climate.** `Cfa`, the same as Drent and the lake country: four seasons, rain all year, no
dry month. The traveler notices nothing. That is the point of putting it first past the
river: Isareos is the familiar country on the far bank, and everything past it is not.

**What grows.** "Mixed deciduous and scrub forest" on the hill faces, thinning to open
ground on the better valley floors. So: closed hardwood on the upper slopes, oak and hazel
scrub below it, and grass on the floors — Meneth's three bands read off height above the
valley rather than off a ridge field, because these hills have no grain to them. Denser on
the west, where the Ibenwood is two hexes away, than on the east.

**What lives there.** The lore names nothing wild. Two things reach in from documented
neighbours, and both are flagged as extensions at the placement:

* **Roe deer** through the wood — the model `forest-ecology.js` already draws for Tidehaven's
  own woods, which is the pattern to follow rather than the file to import.
* **Wild boar** in the oak scrub, the ordinary large animal of a mixed deciduous hill country.
* The **great river otter** on the border river: the fauna overview places it "from the
  Oremindi meltwater sources through the forest-margin watercourses of Alezhor", and this is
  a forest-margin watercourse. Built as the Carica otter at a larger size.
* **Turkey vultures** over the open floors, which the game already names.

## Nethereum — the deep water country

**Landform, and the one big new shape in this job.** "The Nethermere sits at the low point of
a natural drainage basin roughly twenty miles across. No single river created it … the basin's
flat bottom means water that enters has nowhere urgent to go." Built literally: a **basin**
about 600 m across at the middle of the region, its floor at 11 m, its rim at 21, with the
fall from rim to floor spread over two hundred metres so that nothing about it is a bank.
"The communities of Nethereum are built on elevated points: the ridgelines around the basin
perimeter, the higher hummocks within it" — the hummocks are terrain and are built (four of
them, standing two to three metres above the water line, with dry ground on top); the
communities are people and are not.

**The water.** The **Nethermere** itself: a single flat sheet at the low point, wide and
shallow, with a marsh margin round it far wider than the open water — which is the lore's
whole distinction, "a gradient of reliable ground" rather than a shore. It is built at its
**dry-year extent**, a lake of about 350 m with marsh beyond it, because the game has no
seasons yet and a flood year is a thing that happens *to* a place. Note for later: when
seasons exist, this is the first landform in the game that should have two sizes.

The two authored courses are built as drawn — the **Neth** off the Nether Desert along the
southern border, and the unnamed northern river along the Isareos border — and, because
neither of them enters the basin the lore says they feed, **two derived channels** run off
them into the Nethermere and **one narrow outlet** carries it south-east to the Lizeem, which
is the lore's own mechanism: "The Neth itself exits through a narrow channel to the
southeast, where it drops off the plateau edge and joins the Lizeem approaches below."

**Climate.** `Cfa`, and the lore adds the thing a traveler would actually notice: "The basin's
water moderates temperature somewhat … but the chronic dampness shapes everything … The sky
over the Nethermere is often overcast. The light has a quality that travelers describe as
muffled." That is a fog and a light call, not a ground call, and it is the second reason this
job needs per-region sky (see the desert section): Nethereum wants a low, grey, close horizon
where the Oves Desert wants a high white one.

**What grows.** Three bands off height above the water line, which is how the country works:

* **Reed and marsh**, tall, in the standing water and the wet margin — "the tall marsh reeds
  used for thatch, basketry, rope fiber". The largest single stand of anything in this job.
* **Wet meadow** on the post-flood margin: "the basin margins after flood recession are
  carpeted with the fast-growing grass that the retreating water deposits". Bright, rank and
  soft-looking, unlike anything else in the west.
* **Alder and willow** on the levees and the hummocks, and nothing at all on the open water.

The marsh grain, the barley and oats on the perimeter and the weirs are crops and works.
**Not built.**

**What lives there.** The lore names three and the fauna overview supports all three:

* **Nethrani cattle** — "a compact, short-legged breed adapted to wet ground", moved onto the
  post-flood pasture. The longhorn's geometry at three-quarters height and full width with
  short legs, which is what that sentence describes, and a different colour.
* **River fish**, "a large population … that move into the basin during flood season". Not a
  creature model: rises on the flat water, which is cheap and is the right amount of fish.
* **Herons and stilt-legged waders**, thick — the marsh is what the fauna overview's "high
  flood years … temporary wetland habitat draws concentrations of birds" describes.
* **Duck, in rafts** on the open water: the new small waterbird, shared with Eer.
* **Otters** on the Neth, the same animal as the Carica's.
* And a **marsh harrier** quartering the reeds — the `plateau-hawk`'s soar at a tenth of the
  height and a much slower, lower, side-slipping line. An extension: the overview names no
  raptor for Mittolo's wetlands.

## Ovesos — the Sorten, and the dry edge of it

**Landform.** "Where the Oveth crosses its widest valley — a stretch of bottomland the people
of the region call the Sorten, 'the wide seat' … roughly twelve miles of valley floor where
the Oveth slows, widens, and deposits what it has carried from the upland." The atlas agrees
without being asked: Ovesos's `grassland` hexes are its northern two rows and its `plains`
hexes its southern three, and the Oveth runs along the southern border. So the region is a
tilt — upland ridge pasture at 16 m in the north, falling to the Sorten's bottomland at 10 in
the south — and "no mountain wall marks Ovesos's borders to the north, west, or south. The
terrain simply rises."

**Water.** The **Oveth**, on the map's own line, medium and small: "navigable for light boats
and substantial enough for irrigation" by the time it reaches the Sorten, and below it "it
narrows, drops through a rocky lower section, and joins the Lizeem approaches". Built
fordable in its upper third and deep below, like the Carica, which is the same size of river
doing the same thing. The **Neth** along the northern border, fordable in its upper reach for
the reason given above. And the **Lizeem** along the whole eastern side, unfordable, already
built. Derived: three hill-streams off the northern ridges into the Sorten, because a valley
that "deposits what it has carried from the upland" has to be carrying it from somewhere.

**Climate.** The one overrule. `BSh` on the map, temperate and wet in the lore, and the lore
wins for the valley (disagreement 4) — "winters are cold, short-summer, with spring floods
that are more localized and more variable in timing than the main Lizeem's". But the map is
right about the **south-west**, where Ovesos runs into the Oves Desert, and that is where the
green stops: over the last hundred and fifty metres before the desert border the grass goes
from green to buff, the trees stop, and the ground shows through. That gradient is the whole
subject of the Oves Desert's lore and it is built as a gradient, not a line, because the lore
is explicit that the rain shadow's edge "shifts slightly on a decadal cycle".

**What grows.** The orchards, the grain and the mills are worked and are not built. What is
left is genuinely most of the country: **hay meadow and rough pasture** on the bottomland;
**scrub oak and wild pear** on the slopes above the flood line, standing apart, which is the
wild ancestor of the orchard the lore is proud of; **willow and alder** on the Oveth itself;
and on the north ridges the short hard upland turf the lore's herders move onto in summer.

**What lives there.** The lore names the livestock and nothing else: "cattle and short-legged
sheep adapted to rolling terrain" on the upland ridges. So:

* **Short-legged sheep** — the hill sheep with its legs shortened and its body deepened, on
  the northern ridges. Loose, unfolded, nobody with them.
* **Cattle** on the bottomland, the Nethrani animal again at ordinary proportions.
* **Upland hares** on the ridge turf, the same extension as on Vastos and Meneth.
* On the dry south-western margin, the first two animals of the desert community appear
  before the desert does: the **road fox** and the **dry-plateau hawk**, both of which the
  fauna overview places in East Pyros, which is the Oves Desert's own western neighbour.

## The Oves Desert — the rain shadow

**Landform.** "The terrain is rocky rather than sandy: exposed formations of the sedimentary
series underlying the inner-branch country, worn smooth by older water action than the
current drainage system represents, covered in a thin, poor soil that accumulates in the
lower-gradient sections and is absent on the ridge exposures." The atlas gives it twenty
`plains` hexes and three `hills` on its north-western rim, which is exactly the lore's
picture: the hills are the rain-shadow ridge itself. Built at 26 m over the plains with a
short, hard, broken relief — higher amplitude and *much* shorter wavelength than anything in
the west, because worn rock is not a sine wave — and 40 m over the three hill hexes, bare.

**Water.** "The surface drainage is intermittent; the seasonal water channels that cross the
Oves are active only during and immediately after rainfall events." So the desert's
watercourses are **channels with no water in them**: real cut beds, floored with coarse
gravel and boulders, running from the hills south-east toward the Oveth, and dry. This is a
new thing in the game — every watercourse built so far carries water — and it is the first
item on the desert's work list. The exceptions are the lore's own: "the primary springs, the
deeper wells, the channel sections that retain subsurface flow", present in dry years and
more important then. Built as **three waterholes in rock basins**, small, dark, with the one
green ring of vegetation in the country round each.

**Climate.** `BSh`, and the lore is careful about what that means here: not the Moroshé.
"It is not large, it is not particularly severe, and in wet years it generates a temporary
vegetation cover that makes the word 'desert' seem like an overstatement." It is built as the
dry year — that is what "desert" means as a classification, and the lore says so in as many
words — but not as dunes and not as death. Hot, bright, stony, with a wind.

**What grows.** "The perennial plants that survive in the Oves … are not the same species
assemblage as the deep Meroshe's desert flora. They are drought-tolerant forms from the
broader inner-branch country's plant community." So: the same scrub as Ovesos's dry margin,
spaced out and half the size, anchoring the soil where there is any; bare gravel pavement on
the ridge exposures; a dead seed-bank stubble in the low-gradient ground where the annuals
would be in a wet year; and the green ring at each waterhole, which is the only real colour.

**What lives there — and this is a level-4 country.** The lore gives none directly. Three
come from documented neighbours and one is an extension from the Moroshé:

* **Spine lizard** — the fauna overview: "a large, territorial reptile of the rocky
  east-facing slopes", reaching "their densest concentrations in the warm southeastern
  sections of East Pyros before the terrain drops into Moroshé country". The Oves Desert
  borders East Pyros on five dry hex-edges. It is the right animal in the right place, and
  it is a new model and a new gait: basking still for a long time, then a fast short dart.
* **Road fox** — "a lean, bold scavenger associated with caravan routes and settlement
  edges throughout the eastern rain-shadow landscape". East Pyros again, and the one animal
  here that will come toward a traveler rather than away.
* **Dry-plateau hawk** — already built, already extended onto Vastos; here it is at home.
* **Bone-bird** — "a heavy, bald-headed vulture relative with a wingspan approaching two and
  a half metres … the most visible large animals of the Moroshé from caravan routes; they are
  often the first indicator of water". An extension from the Moroshé to a smaller desert,
  flagged as one, and placed over the waterholes, which is what the sentence says they mean.
* **Sand-cat** — "pale, large-eared, and almost entirely nocturnal". **Not built**, and the
  reason is mechanical: there is no night. The day-and-night cycle is designed
  (`docs/day-night-brief.md`) and not built, and a nocturnal animal in a world with no night
  is just a cat. It is the first thing to add to this country when night lands.

## Gala — the coast that everyone wants

**Landform.** "The coastal plain is flat, fertile, drained by a network of small rivers fed
from those hills." Built from 12 m on the dry northern shoulder under Ovesos and the Oves
Desert down to 4 m on the southern coastal plain, with almost no relief on the plain itself
and a low broken rise where Northern Ascarth's foothills come in from the south-east. Two
sea hexes at its southern tip: a short piece of shore, and the rest of Gala's water is the
Lizeem.

**Water.** The **Lizeem** on the east, wide and deep and impassable — this is the reach the
lore is naming when it calls Gala "the land on the western bank of the Lizeem near its
mouth". The **Oveth** coming in at the north-east corner. A **small authored course** down
the Telemonia border to the sea, which the lore does not name and which is therefore left
unnamed and listed for the user. Derived: two of the lore's "network of small rivers fed from
those hills", off the south-eastern rise and across the plain.

**Climate.** The clearest gradient in the job, and the atlas draws it: `BSh` over the twelve
northern hexes, `Csb` and `Csa` over the nine southern ones. The north is dry steppe running
up into the Oves Desert; the south is Mediterranean — "by latitude and soil it is among the
more comfortable places on Azhora's eastern coast: warm, well-watered … sheltered from the
worst of the interior weather". A traveler walking south through Gala walks out of the desert
margin into the softest country in the west over about a kilometre.

**What grows.** The lore's list is agriculture — grain, olives, figs, stone fruit, wine — and
is not built. The wild ground under it: **olive and fig gone wild** in loose stands on the
southern slopes (a wild olive is a real tree and not a crop); **holm oak and pine** on the
rise; **maquis** — dense aromatic scrub, chest high — on the stony ground between; and
**tamarisk and oleander** along every watercourse. North of the climate line all of that
stops and the Oves Desert's scrub takes over.

**What lives there.** The overview gives the coast and the great river:

* **Wading birds** on the Lizeem's western bank, the same assemblage as Eer's.
* **Black migratory geese** — "appear on the Iberos coast in late autumn in vast flocks,
  winter in the coastal marshes and river mouths, and depart in spring". The Lizeem's mouth
  is a river mouth and this is the coast. Built as a resident raft on the river until there
  are seasons to make them arrive.
* **Wild boar** in the maquis.
* **Hares** on the open plain.
* **Griffon vultures** over the south-eastern rise, and **little owls** on the stony ground:
  the ordinary Mediterranean pair, an extension the overview does not name for Gala, flagged
  as one.
* On the dry north, the **road fox** and the **dry-plateau hawk** again, because the country
  there is the Oves Desert with a different name on it.

---

## What each country's level means for its animals

Combat phase 2 is on main: a fight takes its country's level from
`getLevel: centre => regionLevel(world.regionAt(centre).name)` in `src/main.js`, and
`COUNTRY = { health: .45, damage: .30 }` in `src/combat-skills.js` gives enemy health
×(1 + 0.45 L) and damage ×(1 + 0.30 L).

| Region | level | words on the card | health × | damage × |
|---|---|---|---|---|
| Eer | 2 | A troubled country | 1.90 | 1.60 |
| Isareos | 3 | A hard country | 2.35 | 1.90 |
| Nethereum | 3 | A hard country | 2.35 | 1.90 |
| Ovesos | 3 | A hard country | 2.35 | 1.90 |
| Gala | 3 | A hard country | 2.35 | 1.90 |
| Oves Desert | 4 | A dangerous country | 2.80 | 2.20 |

**Every animal in this pass is ambient, as all seven of the west's animals are**: they cannot
be attacked, collected or asked anything, so no fight starts and no level applies. That is
the four-regions rule and this pass keeps it — a wolf pack is a *quest*, and quests are the
thing this job does not build.

What the level does mean is which animals are *sited* so that a later pass can make them
encounters without moving anything. The candidates, in order:

* **Oves Desert, level 4.** The road fox is the one animal in the west that closes on a
  traveler rather than opening. In a level-4 country a pack of them is a real fight:
  `ENEMY_KINDS.wolf` already exists (damage 14, speed 2.9, lunge 3.2) and at ×2.20 damage is
  31 a bite, which kills a traveler who stands still. The spine lizard is territorial by the
  lore's own word and is the natural single dangerous animal at a waterhole. Both are placed
  with clear ground round them for that reason.
* **Gala and Ovesos, level 3.** Wild boar, which is the animal that actually hurts people in
  a Mediterranean farmland, at ×1.90 damage.
* **Eer, level 2.** Nothing. It is the softest country in the six and should stay so: it is
  the one a traveler reaches by walking off the Moros, and it is where the south starts.

Nothing above is built in this pass. It is written down so the next one does not have to
re-derive it.

---

## What a desert needs, that the game does not have

Two of the six are arid — the Oves Desert entirely, Ovesos's south-west margin and Gala's
northern half partly — and the game has never drawn dry ground. Four pieces of new work:

1. **Arid ground.** `REGION_TERRAIN` and `REGION_BIOMES` are per-region with a `byTerrain`
   refinement, so the shape of it is already there; what is missing are the values. A desert
   ground colour (a warm buff against the west's greens, with a paler stone tint over the
   three `hills` hexes), a relief profile with a short wavelength and a hard amplitude, and —
   new — a **gravel pavement pass** that tints and stipples the ridge exposures where the
   lore says the soil is "absent".
2. **Sky and fog.** There is one sky in the game: `scene.background = 0xaacfd3` and
   `scene.fog = FogExp2(0xb3d3d0, .0062)`, set once in `src/main.js:178` and never changed.
   Each region already carries a `palette.fog`, and nothing reads it for the horizon. A
   desert under a lake-country sky looks wrong in a way no amount of ground colour fixes, and
   Nethereum's "muffled" overcast wants the opposite change. **Proposed: the horizon colour
   and the fog density blend from `regionAt`'s palette over a few seconds, exactly as the
   ground colour already blends between hexes.** It touches `main.js` in one place and every
   region gains by it. This is the one piece of work in the job that reaches outside the
   west, and it is offered for the coordinator to accept or refuse before I build it.
3. **Dry watercourses.** `west-ground.js` cuts a channel and `west-regions-scenery.js` draws a
   ribbon of water in it; `westWaterSurface` already returns `null` past a taper, so the
   ground half is nearly there. What is needed is a course that is *declared* dry — channel
   cut, gravel floor, boulders, no ribbon, no deep-water collider — plus the waterhole, which
   is a pool with a very small radius and a real depth in a rock rim.
4. **Creatures.** Two new models and one new gait. The **spine lizard** is the gait: a
   reptile is still for a long time and then very fast for a short time, which is unlike
   every animal in `west-regions-life.js`, all of which amble. The **bone-bird** can take the
   plateau hawk's soaring rig with a new body and a much wider wing. The **road fox** is the
   river fox retinted, rescaled and given ordinary flee behaviour — the vel-caric's refusal to
   run is Caricas's alone and must not leak.

And one thing a desert needs that it will **not** get in this pass: **night**. The sand-cat
and most of the Moroshé's real fauna are nocturnal, and until the day-night cycle is built
there is nowhere to put them.

---

## What is deliberately not built

* Every settlement, harbour, boat, road, canal, drain, weir, levee, mill, orchard, terrace,
  field wall, quay, well and person in all six lore files. Isamouth and the inlet councils;
  the Nethrani ridge communities, the Flood Council, the fish weirs and the Flood Recall; the
  Sorten's farms, the Water Council and the mill sites; the Oves Desert's seasonal grazing
  camps and caravan routes; the city of Gala, its Guild of Assessors and its market; Eer's
  villages, its canals and the north road. None of it.
* **Nylon**, which is not on the atlas and which both Gala and Eer are defined by.
* **The Nether Desert**, which the user did not name. Its land hexes go into the survey so
  that the ground west of Nethereum is ground; it gets no biome, no terrain profile, no
  scenery and no place in `PLAYABLE_REGIONS`.
* The whole Branch Compact and the boundary disputes that are three of the six lore files'
  main subject. Those are law, and law is people.
* The Nethermere's flood year, which is a season and there are no seasons.
* The sand-cat, which is a night animal and there is no night.

---

## How it will be built, and in what order

Six countries, seven commits, each leaving the game bootable.

**0 · The groundwork, and the one thing that will break.** Before any country:
`scripts/build-region-rivers.mjs` gains the six in `RIVER_REGIONS` and is re-run, and
`scripts/build-region-survey.mjs` has its `WINDOW` widened west from `minQ: -14` to about
`minQ: -32` and re-run. **Regenerating the rivers shatters the Lizeem.** `riverCourses`
breaks a chain wherever three edges meet a corner, and the new courses meet the Lizeem at
four new confluences, so today's `atlasCourse('Caricas,Isareos,Nethereum,Ovesos')` (21 edges)
becomes three chains and `atlasCourse('Gala,Nesdor,Ovesos')` (10 edges) becomes one chain
plus the head of another. `src/west-regions.js` throws on a missing key, so **the game will
not boot until those are rejoined by hand** — which `LIZEEM` already does once, for the
confluence with the Carica, and which is the pattern. The commit's job is that the Lizeem and
the Carica come out **point for point identical**, with a test that says so, because moving
the biggest river in the world by a centimetre re-seeds every tree in Caricas and Nesdor.
For the same reason the Lizeem is **not lengthened in place**: its new reach down the
Eer|Gala border is a separate course taking the water over at its own level, which is exactly
what the Ela-South Reach already does where the atlas hands Elagos's drainage into Nesdor.
The same commit raises the hex budget in `tests/region-layout.test.js` from 30 to **37** east
to west, on purpose and with the reason written in, as the last builder was asked to do.
* **1 · Eer.** First because it is the only one a traveler can walk to, because it needs no
  new ground type, and because it proves the whole registration path — survey, bounds,
  budget, biome, terrain, region text, travel button — on a country that cannot break
  anything. Its coast comes free from `LAND_HEXES`.
* **2 · Isareos.** The land bridge in. Mixed hill woodland, three derived becks, the
  unnamed border river. The last familiar country.
* **3 · Nethereum.** The Nethermere: the largest new landform in the job, and the one that
  most needs looking at before it is trusted.
* **4 · Ovesos and 5 · the Oves Desert, as a pair.** They share the aridity gradient, and
  building either alone means building that gradient against nothing. All the new arid work —
  ground, pavement, dry channels, waterholes, the lizard and the vulture — lands here.
* **6 · Gala.** Last because it needs both halves of everything: the arid work from 4-5 in
  its north and the Mediterranean scrub from Eer in its south, plus the Lizeem's mouth.

**The files.** New: `src/south-regions.js` (pure: the water, the Nethermere, the basin, the
aridity gradient, the named natural ground), `src/south-ground.js` (pure: the landform, on the
`west-ground.js` model), `src/south-regions-scenery.js`, `src/south-regions-life.js`. Touched
in the west family: `src/west-regions.js` only where the Lizeem is rejoined and its new reach
declared. Touched elsewhere, additively and in the same places the four touched:
`src/region-layout.js` (`PLAYABLE_REGIONS`, six biomes), `src/region-world.js` (ids 15-20, six
terrain profiles, region text, landmarks), `src/world-terrain.js` (one call), `src/world.js`
(the scenery hook and the bare-ground test), `src/build-status.js`, `src/map-fog.js`,
`src/developer-atlas.js` (six travel buttons, which is how the user goes and looks —
`DEV_WORLD_DESTINATIONS`, one anchor hex each), `src/main.js` (the life module and the review
views, in the two small additive edits the four used), `src/region-survey.js` and
`src/region-rivers.js` (generated), `package.json` (every new test file, by name).

Tests: one file per region in `tests/`, plus `tests/south-life.test.js` holding the same six
laws `tests/west-life.test.js` holds — nothing can be walked down, the quick ones cannot be
run down, a chased band comes home — and one test that the Lizeem and the Carica did not move.

**Names.** Every river, range and desert in this job that has a name has it from the lore or
the atlas: the Lizeem, the Neth, the Oveth, the Nethermere, the Sorten, the Oves Desert. Two
authored courses have no name anywhere — the medium river on the Isareos|Nethereum border and
the small one on the Gala|Telemonia border — and they are **left unnamed and listed here for
the user** rather than invented.

---

## Review views to ask for, when there is something to look at

Named on the `west-` pattern, each worked out from the regions' own numbers through the
`shot(camera, target, …)` helper rather than typed in: `south-eer`, `south-eer-coast`,
`south-eer-braids`, `south-isareos`, `south-isareos-river`, `south-nethermere`,
`south-nethermere-marsh`, `south-neth`, `south-sorten`, `south-oveth`, `south-oves`,
`south-oves-channel`, `south-oves-waterhole`, `south-gala`, `south-gala-maquis`,
`south-lizeem-mouth`, and one per new animal — `south-lizard`, `south-bonebird`,
`south-roadfox`, `south-boar`, `south-deer`, `south-duck`.
