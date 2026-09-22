# West Izol and Izolveth: what was built

The build report for `docs/west-izol-brief.md`, on branch `west-izol`, with the
user's later history of the Republic (`docs/izol-and-the-triumvirate.md`, read from
main mid-build) folded in. West Izol is the eighth playable region: the western half
of the island of Izol, across the Izoli Channel far to the south of the mainland.
Izolveth is its port, the largest town on an island that has no capital, and it is
built so that a traveler who arrives expecting the Coalition's seat finds a quay, a
ropewalk and a meeting house that is plainly not a palace.

## The region

- `PLAYABLE_REGIONS` and `PLAYABLE` in `scripts/build-region-survey.mjs` gain
  `'West Izol'`; **region id 8**. `src/region-survey.js` is regenerated.
- The atlas gives **21 hexes**, axial q 3–8, r 125–130: **11 grassland, 5 hills,
  5 plains**. East Izol shares its eastern edge; everything else round it is sea.
- The survey window's `maxR` grows **124 → 133**, so the coast round the island is
  honest. That brings East Izol, Southern and Northern Ascarth, one hex of the
  Iscare Archipelago, the Aurumlis Archipelago, Selemi and the Azhor Stones into
  `LAND_HEXES` where they fall inside the (new) world. Southern Ascarth appears as
  land about 500 m west of West Izol's coast, beyond the fog from anywhere the
  traveler can stand.
- **`WORLD_BOUNDS` grows south and a little east**: `maxZ` **1272.6 → 2225.2**
  (+952.6 m) and `maxX` **560.0 → 610.0** (+50 m). `minX` and `minZ` are
  unchanged. The world is now 2 070 × 2 834 m.
- Biome `izoli-rock` (`REGION_BIOMES`), `ownScatter: true`. Terrain profile in
  `REGION_TERRAIN`, refined per atlas terrain as Pueth's and Peblos's are:
  grassland base 12.5 m, amp 4.4 on a 115 m wave (the pasture); hills 21 m, amp
  7.5, 130 m (slate-grey ground); plains 8 m, amp 1.6, 150 m (the low inland basin
  that becomes the Long Pasture).
- Region card (`REGION_TEXT`): subtitle *The western half of the island of Izol*,
  spawn on the Long Quay at **(56, 1725)**.

### What the atlas's geometry turned out to mean

The atlas hexes are pointy-topped, so a coast that runs along a row of them is a
run of 100 m scallops: a pointed headland at every hex tip and a cove between each
pair. That is exactly the coast the lore describes — "headland after headland, each
community in its own small bay" — and I built to it rather than smoothing it away.
One hex, (6, 125), stands out into the sea on its own, attached only at its south:
**the harbour headland**. Izolveth is in the cove on its west side, which opens
north-west toward the channel and the Svaleen, as the lore places the town.

The inland plains hexes are low and surrounded by higher ground: a basin, not a
coastal flat. I made them the Long Pasture, where the highland flocks come down.

## What the lore gave, and what I invented

**From `geography/regions/izol.md`, used as written:**
the island is rock, dark grey and iron-brown low down and slate-grey at height,
with good pasture on its softer slopes; the coast is the productive zone and towns
sit on small flats; headland country separates every community; the Three Presences,
three isolated peaks each with a highland shrine; the confederation of tribes and
towns, equal before the goddess; the Assembly at the Hearthstone, which binds
because it is sworn where all three Presences can witness it; **no capital**, by
design; the goddess who *is* the island, whose domain is "the bond that holds"; no
organised priesthood, shrines in every coastal town, quarrying governed by protocol;
Izolveth as the largest town, on the north-west coast, the point of contact with the
Svaleen, with Svaleen merchant houses and a Selemi outpost on forty-year-old terms
that satisfy neither side; Solne on the south coast and its boat-lineages; the
Svaleen offering membership twice and being declined courteously; highland religious
vocabulary that is not translated for outsiders.

**From `docs/izol-and-the-triumvirate.md` (the user's, authoritative):**
the Selemi war of 978, the taking of Selemis in 979, the Coalition in 980 with
Selemis as a conquered member, and the three generals — Orsen Kellveth (Solis, or
home without a command), Tavren Doreth (prisoner of Selemis), Hesk Marech (the siege
of Nylon, where the city is on the besiegers' side). The islanders are afraid of
their generals, and the fear is religious.

**From `src/campaign-world.js`:** Izolveth as the port that shelters the Coalition
army; West Izol level 0, control `izoli`, no threats; `COALITION_MEMBERS`.

**Invented, in the lore's voice — each needs the user's eye:**

| Invention | Why |
| --- | --- |
| **Ardveth**, the fishing village down the west coast | The brief asked for a second, smaller settlement; the lore's town names end in *-veth* and *-ath*, so it takes one. |
| **Kelvath Cove**, the boatyard | The brief's boatyard; a cove "reachable by sea but not easily by land", as the lore says of most of the coast. |
| **The Sea Gate**, a trilithon in a stone ring on the harbour headland | The lore says the fishing communities have "sea-rites that are not primarily about fish" and every coastal town has a waterfront shrine. This is Izolveth's older one. |
| **The Stone of Izol**, the shrine beside the meeting house | A block of the island's own rock left standing where the cutting for the town found it, in a dry-stone ring. It follows from the theology (the rock *is* the goddess) and from "no organised priesthood": the shrine is a piece of her nobody moved, and its keeper says plainly she is not a priest. |
| **The Meeting House** | The brief's "council house plainly not a palace". The lore's Assembly meets at the Hearthstone, not in a town; this is where the *town's* meeting sits and where representatives gather when they meet on this coast. |
| **The Sightstone** | A viewpoint on the road inland where all three Presences can be seen — deliberately *not* the Hearthstone, which the lore puts at the island's centre (in East Izol, out of the built world). |
| **The Long Pasture** | The atlas's inland plains hexes, given the lore's "good pasture on its softer slopes". |
| **The Hearth Road** | The road inland toward the Hearthstone. |
| **How a confederation with no army raised three** — the question the triumvirate doc leaves open | Answered in the module docs and in dialogue: *town contingents and highland levies, each sworn at the Hearthstone in the goddess's name, and hulls hired from Selemis before 978 and taken from her after.* That makes the oath the whole machinery, which is why a general breaking one is what the island fears. **The user should confirm or replace this.** |
| The names of the 25 people | See below. |
| The three peaks are not named individually | The lore names them only as a set. The highland representative is "from the shoulder of the near Presence", and nobody translates the tribes' own names for them. |

**Not invented, and deliberately left open:** the name of the 978 sea battle (the
doc lists it as open; the one master who was there says "in seventy-eight" and "in
seventy-nine" and names nothing), the Hearthstone itself (not built; out of the region).

## Izolveth

Everything is authored in world metres, like Pueth and Peblos. The town has its own
frame, square to the world: `P(a, b)` is `a` m east and `b` m south of **(58, 1782)**.

### The ground

The cove's hinterland is a notch between two rock knobs, 5 m at the water and 15–24 m
fifty metres back: steep, as the lore says the coast is. The town therefore stands on
**made ground**: `IZOLVETH_TERRACE` in `TERRAIN_PADS`, x 26–90, z 1738–1826,
feathered over 17 m, a plane that climbs from **2.85 m at the strand to 12.35 m at
the meeting house** (slope 0.108 south). It is a `shore` pad, so it levels the rock
and never reclaims the cove. Where the terrace is a fill (the seaward and southern
edges) a dressed revetment holds it up; where it is a cut (the knobs to east and
west) the rock face is left as the wall. On Izol quarrying is a thing you answer for,
and the town shows where it took the stone.

Three smaller pads: `IZOL_CAMP_GROUND` (the drill ground and camp, level 8.4 m),
`ARDVETH_SHELF` and `KELVATH_SHELF`.

### The harbour

| | |
| --- | --- |
| The Long Quay | x 30–80, z 1712–1730, deck 2.9 m; landing (56, 1725); seven bollards, a capstan, a gallows crane at (64, 1719), steps down the west face |
| The Long Mole (west) | (14, 1722) → (8, 1698) → (14, 1676) → (34, 1664), half-width 3.4, deck 2.9, a light on its head |
| The Short Mole (east) | (88, 1724) → (90, 1702) → (84, 1682) → (60, 1668), same |
| The mouth and the boom | 26.3 m between the heads, a chain on floats across it |
| The slip | (20, 1733) on the west horn, three boats drawn out |

The quay and both moles are standable decks (`izolDeckHeight`, one clause in
`world.js`'s `heightAt`, the same as Cobble's quay). Walking from the quay to either
mole means stepping down onto the rock horn and up again, as it would.

**The ships**, five, and the war is written on all of them: the *Gannet* and the
*Serrow* (Izoli, the second out of Solne on a charter her master swore at the Stone
and regrets), the *Cormel* (a Suvali transport) alongside the quay; the *Anwyl*
(Selemi-built, taken with the city in 979, flying Selemi colours because Selemis is
in the Coalition) and the *Tarrow* (Ambroni, taken at Solis) at anchor in the basin.

### The town

Twenty buildings in dark granite, lime-washed rubble and slate weighted with stones
(`IZOLVETH_BUILDINGS`): three warehouses on the strand (the third requisitioned as the
army's commissary), the fish market, the **ropewalk** (a 56 m open-sided roof on
posts, walkable between them, laying cable for three armies), the harbour office,
**the sail loft** (the army's hospital now, a red cloth at its door), two tall narrow
**Svaleen merchant houses** not in the island's style, **the Selemi outpost** (one
building inside its own wall, on forty-one-year-old terms), the Channel House, nine
houses and the net store. A paved strand apron, six streets, a stair street climbing
the ten metres from quay to hall, a cistern, net frames, fish trestles, casks, peat
stacks against the back walls and two hand-barrows.

**The Meeting House** at (51, 1801): 22 × 11 m and 4.6 m to the eaves — **the longest
building in the town and lower than the warehouses** (the test says so). A porch of
five undressed posts under a lintel, one door, a notice board in three hands, benches
in a ring. No dais, no throne, no gate, no wall round the town.

**The Stone of Izol** at (73, 1802), beside it: an unworked block of the island's
rock in a dry-stone ring with one gap, a few things left on the ground, and its
keeper.

**The three recruiting boards**, Kellveth's, Doreth's and Marech's, stand on the
strand within thirty paces of each other at (71 / 54 / 39, 1737.5), each under its
general's pennon. The whole situation, in one sentence of scenery.

**Walls: none.** The lore gives Izol three repulsed invasions and no fortresses; its
defence is the sea and the oath. The only fortification is the boom chain.

## The army it shelters

**The Coalition camp** on the pasture above the town, centre (176, 1886), reached by
the Hearth Road and a spur to its west gate: a picket line closed except at the gate,
**33 tents** under **seven banners** — the Izoli spearmen (the largest, on their own
island), the Suvali companies, the Ambroni rebels, Selemis (three tents pitched apart,
from a city the Izoli took the year before last), Marosh, the island cities and one
tent of Pyros — a drill ground trodden to bare rock with seven practice stakes, a
spear rack, a cook fire, a horse line and trough, and stores at the gate.

The friction of billeting is in the town rather than the camp: the sail loft, the
commissary, the ropewalk's cable, the fish price, the boatyard that cannot rig a boat.

## The people

Twenty-five (`src/izol-people.js`), all ambient, none with a quest; one of them
conditional. Nobody wears Legion armour; there is no Legion on this island.
Soldiers are men; the model is `suvali-guard` for all of them.

| | |
| --- | --- |
| **The confederation** | Andreth Vos, Speaker of the Izolveth meeting ("There is no capital of Izol"); Hanna Orwe, clerk, with the roll of which towns have sent representatives; Rell Anvath of Solne, for the boat-lineages; Tovan Serre of the highland tribes, Marech's by blood and counting the days his nephew is in the siege lines; Keeper Ysel of the Stone ("That is not a priesthood. There is no priesthood.") |
| **The harbour** | Ovan Kell, harbourmaster; Duro, the quay runner; Bessa Tarn at the ropewalk; Wenna Il at the fish market; Sabeth Lune, whose sail loft is the hospital; Corrin Ames of the *Gannet*, who watched the boom go down at Selemis; Dols Brack of the *Serrow* |
| **The outsiders** | Marek Sund, Svaleen merchant, unsettled by the courtesy; Iselle Draun, Selemi factor ("My city is occupied by the republic my city is allied to") |
| **The generals' men** | Tulle Barr, Kellveth's commissary; Lieutenant Varo Sill, recruiting hulls for Doreth; Serjeant Ruvan Tale, the levy for Marech's lines before Nylon |
| **The army** | Surgeon Neve Arral of Marosh; Captain Halan Reth of the Izoli spearmen; Serjeant Dovan Kesk of the Suvali companies; Aurel Mant of the Ambroni rebels ("Call it an empire in front of me and I will not argue"); Pell Antor, a Marosh spearman who has started to find the rain restful |
| **Down the coast** | Ora Veth of Ardveth; Old Fer, the boatwright at Kelvath Cove |
| **Conditional** | **General Orsen Kellveth**, out only if Solis was lost |

Three things are said, each by several people and no person says all three: **there is
no capital**; **the oath is the machinery**; **the generals frighten them**, in
religious terms before political ones ("on the day one of them steps outside it he
steps outside her").

### Kellveth, and Chapter 2's outcome

`generalsStance(control)` in `src/izol-world.js` reads the occupation map: if
`control['West Suval'] === 'empire'` (the Empire won the border battle and took Solis
back) Kellveth is home; otherwise he holds Solis. `src/izol-host.js` shows or hides him
each frame and allocates nothing when it has not changed. **Four people say their last
line differently** under the two outcomes (`IZOL_ALTERNATES`): the Speaker, the keeper,
the harbourmaster and Kellveth's quartermaster. This is wired to the flag the game
already has, so it needs nothing from the lead except confirming that
`control['West Suval']` is the right reading of "how Chapter 2 ended".

## The country

| Place | Where | |
| --- | --- | --- |
| Ardveth | (−88, 1818) | Six plain cottages on a shelf above a shingle beach facing the channel, three hulls drawn up, two fish racks, a niche shrine. Reached by the coast path over the west knob. |
| Kelvath Cove | (250, 1748) | The boatyard: slip, a hull on the stocks with frames up and no planking, saw pit, shed, tar pot. |
| The Sea Gate | (148, 1668) | Two uprights and a lintel in a ring of stones on the crown of the harbour headland. |
| The Sightstone | (380, 1802) | A flat rock and a cairn on the shoulder of the Hearth Road. All three Presences stand up from here. |
| The Long Pasture | (268, 1958) | A dry-stone fold and a cairn on the only level grass nobody had to cut. |
| The Three Presences | (520, 1690), (588, 1866), (566, 1990) | Peaks of 116–136 m on the high ground of East Izol; the northern one stands on the atlas's own mountain hex (10, 125). |

The peaks are placed 180–260 m from the Sightstone so they read through the game's
fog (FogExp2 0.0062 leaves 16–29 % at those distances), and 470 m or more from the
town, which sees them faintly from its high ground and not at all from the quay.

**Roads and paths** (`IZOL_PATHS`): the Hearth Road (474 m, from the top of the town
past the camp and the Sightstone to the region's eastern edge toward the Hearthstone),
the camp spur (84 m), the coast path to Ardveth (97 m), the path up the headland to
the Sea Gate (84 m), the track to Kelvath Cove (168 m). Four fingerposts; five new
labels in `SIGN_LABELS`.

**Scatter** (`src/izol-scenery.js`, batched three hexes at a time): 3 052 tufts of
sea turf, 615 gorse and 182 thorn in one batch per block, 733 rocks (iron-brown at the
water, slate-grey above 17 m), 120 wind-bent pines on high ground only. Nothing grows
in the town, the harbour, the camp, a place or on a path.

## The chart, the tools, and getting there

- **`SUBREGIONS`**: seven areas — Izolveth, the Harbour Headland, the Camp Above
  Izolveth, Ardveth, Kelvath Cove, the Sightstone, the Long Pasture. None swallows
  another's centre (the rule `tests/map-fog.test.js` checks), and they stand 150 m or
  more apart.
- **The island is land on the chart.** `world.mapLands` gains West Izol's softened
  outline, painted back over the chart's water as the Pebbles are, and `mapWaters`
  gains `west-izol-water`, a polygon from the chart's western edge to the island's own
  shore.
- **`BUILD_STATUS['West Izol']`**: `early`, and honest that no chapter, voyage,
  interiors or trade exist.
- **The developer atlas** gains a West Izol stop (atlas hex (5, 127));
  `developer-mode.js` a ghost-travel point `west-izol` at the landing.
- **Testing panel: *Sail to Izolveth · West Izol*** (`#test-izolveth`). It calls
  `testTravel(8)` — which skips the tutorial and completes the early road errands, as
  the region buttons do — then sets the traveler down on the quay's landing facing
  the town.
- **A way in for Chapter 3.** The landing on the Long Quay (56, 1725) is where a ship
  puts the traveler ashore; it is the region spawn, standable, reachable to every
  person in the town, and `continueRoad` now accepts a saved position on Izolveth's
  quay or moles as it does Cobble's. The voyage itself is the lead's, as the brief
  says.

## Files

**New:** `src/izol-world.js` (pure tables: the triumvirate, the town, the harbour, the
camp, the country, stands, landmarks, the chart's sea), `src/izol-scenery.js` (three),
`src/izol-people.js` (the 25 and their lines), `src/izol-host.js` (main.js's one hook),
`tests/izol-world.test.js`, `tests/izol-people.test.js`, this report.

**Changed (shared registries, one entry each where possible):**
`scripts/build-region-survey.mjs` (PLAYABLE, WINDOW.maxR), `src/region-survey.js`
(regenerated), `src/region-layout.js` (PLAYABLE_REGIONS, REGION_BIOMES),
`src/region-world.js` (REGION_IDS, REGION_TERRAIN, REGION_TEXT, four terrain pads in
TERRAIN_PADS), `src/signs.js` (five labels), `src/map-fog.js` (seven areas),
`src/build-status.js`, `src/developer-atlas.js`, `src/developer-mode.js`,
`package.json` (two test files), `index.html` (one testing button),
`src/west-suval-world.js` (**one word**: `mergeByColour` is now exported, so Izolveth
merges exactly as Solis does).

**`src/world.js`** (CRLF, patched by exact anchors): two imports under Peblos's, the
Izolveth deck clause in `heightAt` after Cobble's, the paths measured beside the other
roads and drawn after `HIDEOUT_APPROACH_TRAIL`, one call to `createIzolScenery` just
before the Moros works, `west-izol-water` in `mapWaters`, West Izol's outline in
`mapLands`, `izolMetrics` and `izolQuay` in the returned object, the NPC positions and
landmarks spread.

**`src/main.js`** (CRLF, patched by exact anchors): two imports, `createIzolHost`
straight after `createWestSuvalHost`, the conversation hook straight after Peblos's,
`izol.frame(...)` straight after `westSuval.frame(...)`, one clause in
`continueRoad`'s ground check, the testing button's handler before
`test-reveal-chart`.

**Tests changed, because they encoded "four regions" or "West Izol is unbuilt":**
`tests/region-layout.test.js` (the world may be 30 hexes tall, not 25: West Izol is
far south), `tests/developer-atlas.test.js` (its example of an unbuilt region is now
East Izol), `tests/peblos-world.test.js` (counts only Peblos's own `mapLands`, and
the world may reach further east than the Pebbles).

## Tests and smokes

`npm test`: **512 tests, 512 pass** (265 s on a quiet run, 432 s on the last one). 496 before this branch; 16 new, both files in `package.json`.

`tests/izol-world.test.js` (9): the region against the atlas (21 hexes, terrain
counts, id 8, bounds); the terrace a plane that climbs ten metres and leaves the cove
water; the quay walked metre by metre, both moles decked end to end from rock to deep
water, the mouth 26 m of water a hull can pass, and all five ships floating clear of
the quay and both moles; no building overlapping another, the meeting house the
longest and not the tallest, every one of the 25 stands standable, 3.5 m from every
other, and every town stand **reachable from the landing by flood fill**; the camp
closed but for its gate, its drill ground level within 1.2 m and its captain reachable
through the gate; every place on the island's land, the peaks inland and in the right
distance band, **every path walked every 2 m**, every sign lettered; the chart
(areas, lands, water, landmarks, build status, the campaign's own entry); no curtain
wall and no enclosure, the three generals in one table, Kellveth's flag; the scatter
counted, batched and out of every clearing.

`tests/izol-people.test.js` (7): 25 people with stands and lines, no Legion; "no
capital" and "no priesthood" said plainly and the oath reached for in six lines; the
generals in one table, their partisans real, their men saying what each is stuck with;
the Selemi war in the harbour and the factor's position; the billeting felt from both
sides; exactly four people changing their line with Chapter 2's outcome; the host
registering, hiding and showing Kellveth, answering only its own people, and offering
no quest.

| Smoke | Result | |
| --- | --- | --- |
| `npm run test:game` | **pass** (`smoke.json` `ok: true`) | 1 709 frames, 429 draw calls, 859 k triangles, no errors. The walkthrough does not reach West Izol. Its 133 ms average frame was taken while review shots were rendering on the same machine and compares with nothing. |
| `npm run test:road` | **pass** (`road-traversal.json` `ok: true`) | 7 556.6 m walked out and back over 1 621 s and 21 316 frames, Drent, Pueth, Luscia and the Moros entered on foot, the frontier rope holding, East Suval shut, the return to Drent made, no errors. The traversal does not reach West Izol (no road does). Its mean frames — Drent 86.9 ms, Pueth 80.5, Luscia 69.1, the Moros 64.6 — were taken with the other branches' agents working on the same machine; the Peblos report found this instrument unusable as a performance comparison here, and so do I. The deterministic measurements under Performance are the ones to read. |

`npm run test:autoplay` was not run, as instructed. Nothing in West Izol is on
`paths[0]` and the autopilot has no way to reach the island.

## Performance

Measured in headless Chrome with SwiftShader from a scratch page (now deleted) using
the vendor import map and **the game's own lights and shadow settings**, one frame
with shadows, the renderer's own count. Base is the branch point (`ab4e030`) with the
same cameras.

**Izolveth, from its own ground** — the budget is Solis at its gate, **95** in the
West Suval report and **82** on the base tree measured this way:

| Camera | Draws | Triangles |
| --- | --- | --- |
| The Long Quay from the basin | 69 | 232 k |
| The quay landing, looking inland | 72 | 241 k |
| The town from the water | 70 | 233 k |
| The strand | 63 | 218 k |
| The harbour mouth | 65 | 233 k |
| Above the oath ground | 67 | 235 k |
| The camp | 62 | 215 k |
| The Sightstone | 35 | 138 k |

How: the whole of the town's static scenery merges into vertex-coloured meshes
(`mergeByColour`, one per surface kind) — **Izolveth is 2–3 draw calls** and the
country round it one more. The scatter is 35 instanced batches in 7 blocks; the first
build had 64 and cost the quay 123 draws. Gorse and thorn share a batch, and each
block's three hexes are chosen for being near each other: a block strung along a row
of hexes had a bounding sphere 300 m across that reached into frustums at Solis, 900 m
away. Bushes and turf cast no shadows.

**What West Izol costs the old regions:**

| Camera | Base | This branch |
| --- | --- | --- |
| Solis, outside the Gate of Sun Horses, looking south | 82 draws / 154 k | **93 / 204 k** |
| Nothom, looking south-west | 234 / 257 k | 231 / 268 k |
| Tidehaven, looking west | 605 / 976 k | 592 / 983 k |

Solis is the one place that pays, **+11 draws and +50 k triangles**, and none of it is
West Izol's scenery (all of which is culled there). It is the terrain grid and the sea
plane reaching 950 m further south: from Solis the camera now looks over sea floor and
sea where it used to look over the world's edge. The terrain tiling stays 13 × 13, so
each tile is 40 % taller; I tried the other trade — tiles of a fixed footprint — and it
cost Solis 34 terrain draws instead of 23 for the same triangles, so I reverted it.

Other costs: colliders **9 270 → 10 237** (+967, West Izol's); terrain grid **453 × 365
→ 460 × 500** vertices; the sea plane 15.8 k → 21.8 k triangles; the Node world build
on this machine **17.8 s → 18.7–20.5 s** on idle runs, and in the browser 4–5 s either way.

## By eye

Reviewed in headless Chrome: the harbour mouth, the quay from the basin and from its
landing, the town from the water, the strand, the meeting house and oath ground, the
camp, the Sea Gate, the Sightstone, Ardveth, Kelvath Cove, and the town from the west
knob with two Presences in the haze behind it. What the shots changed:

- **The ships were rafts.** Their hulls sat half under water with the deck covering the
  sheer. Rebuilt with three rings (sheer, bilge, garboard), a wale, a raised stern, a
  taller mast, yard and stays.
- **The retaining walls floated** as disconnected slabs on the knobs. They are a
  revetment now, drawn only where the terrace is a fill; a cut face is left as rock.
- **The strand read as a beach**: the shore tint runs 15 m inland and the terrace
  starts at the water. A paved apron covers it.
- **The Sea Gate was invisible** from anywhere — a ring of knee-high stones. It is a
  trilithon now, visible from the harbour.
- **The Three Presences were fogged out** at 500–600 m. Moved to 180–260 m from the
  Sightstone and raised to 116–136 m; they read from there, from the camp, and faintly
  from the town's high ground.
- **The Selemi outpost's wall stepped down the knob.** Walls on made ground are level
  now; walls on the open hill still step.
- The paving was striped with shadow acne on the first shots; that was the review
  page's own lighting, and it went when the page used the game's shadow bias.
- Flat tents, blank back walls, a board-edge pennon, a floating boatyard shed and a
  fingerpost against a house wall were each fixed.

## Left as stubs

- **No chapter.** The Republic branch of Chapter 3 — the choice among the three
  generals — is where this region is for, and none of it is wired. The generals'
  factions are legible (three boards, three men, their partisans, the representatives'
  arguments), and the people are written to be the chorus for that choice, but nobody
  offers it.
- **No voyage.** No ship carries the traveler in or out; the landing is ready for one.
  The testing button and the developer travel point are the only ways here.
- **Hesk Marech and Tavren Doreth are never present**, correctly: one is before Nylon
  and one cannot leave Selemis. Kellveth is present only if Solis was lost.
- **No interiors, no trade, no inn service**, and nothing to buy on the quay.
- **The interior is thin by design**: south and east of the Long Pasture is terrain and
  scatter. The Hearthstone is out of the built world.
- **The ships do not move** and nobody is aboard them.
- **Road material.** The Hearth Road uses the game's one road material (sandy); a road
  of crushed grey rock would suit the island better but is a shared material.
- **The sea's colour** is the game's shader, which shades by world *x*: Izolveth's
  harbour is the bright shallow teal of the western sea. The Izoli Channel would want
  something colder; that is a change to every coast.

## For the lead, on merge

- **Regenerate `src/region-survey.js`** after merging with the Elagos branch
  (`node scripts/build-region-survey.mjs`). Both branches touch `PLAYABLE` *and*
  `WINDOW` in the survey script: this branch raises `maxR` to 133; Elagos will likely
  lower `minR`. Keep both.
- **Region ids.** West Izol took **8**. If Elagos also took 8, one of them moves; only
  `REGION_IDS`, the developer atlas's `LOCALS` row, `testTravel(8)` in the testing
  button's handler and `tests/izol-world.test.js` name the number.
- **`WORLD_BOUNDS` grows south by 952.6 m.** Every test that states the world's size
  now allows 30 hexes of height; if Elagos grows it north as well, check
  `tests/region-layout.test.js`'s bound.
- **Shared one-line conflicts to expect:** `PLAYABLE_REGIONS`, `PLAYABLE` and `WINDOW`,
  `REGION_BIOMES`, `REGION_IDS`, `REGION_TERRAIN`, `REGION_TEXT`, `TERRAIN_PADS`,
  `SIGN_LABELS`, `SUBREGIONS`, `BUILD_STATUS`, `LOCALS`, the developer-mode travel
  points, the testing panel's button row, `package.json`'s test list.
- **`src/world.js`**: imports under Peblos's; the `heightAt` clause after Cobble's; one
  `measurePath` loop after the roads; the scenery call just before
  `buildMorosWorks`; one `addPath` loop after `HIDEOUT_APPROACH_TRAIL`; one
  `mapWaters` entry; `mapLands` is now an array spread (Peblos's islands, then West
  Izol); two keys in the returned object; the NPC positions and landmarks spreads.
- **`src/main.js`**: see Files. The `continueRoad` clause and the frame hook are the two
  lines most likely to meet other work.
- **`src/west-suval-world.js`** exports `mergeByColour` now. If the Solis scars pass
  moves or renames it, `src/izol-scenery.js` imports it by that name.
- **Kellveth's flag.** He reads `control['West Suval']` from the occupation map, which
  is `'coalition'` by default and `'empire'` once the Empire has taken Solis back.
  If Chapter 2's outcome is to be read another way — a campaign flag rather than the
  map — `generalsStance` in `src/izol-world.js` is the one function to change.
- **Names to approve**: the three generals (the user's doc flags them as invented), the
  25 people, Ardveth, Kelvath Cove, the Sea Gate, the Stone of Izol, the Sightstone,
  the Long Pasture, the Hearth Road, and the answer to how the confederation raised its
  armies. The generals' names live only in `IZOL_GENERALS`.
- **A lore mismatch in existing code, not mine:** `world.js`'s `distantSummits` — the
  three mountains on Drent's north-western horizon — are named *"Three Presences
  summit n"*. The Three Presences are Izol's. Nobody sees the name, but the next
  person to search for them will find the wrong mountains first.
- The work is on `west-izol` (from `ab4e030`) and has not been pushed.
