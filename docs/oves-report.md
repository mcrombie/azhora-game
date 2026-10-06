# Ovesos and the Oves Desert: the build report

Built 2026-09-28 on branch `oves` (worktree `azhora-game-oves`, from 3a98e4d), to `docs/oves-brief.md`.
**Terrain, climate, water, scenery and wildlife, and nothing that belongs to anybody.** The Ovesos
Water Council and every water right it allocates, the five branch countries and the Branch Court
between them, King Melos and the house Oveth-Hold, the Middle Reach dispute with Nescor, the market
towns, the mills on the upper river, the irrigated bottomland grain and the channels that water it,
the Sorten's grazing rights, the upland herding communities and their stock, the Telemon bands' desert
routes and the wells and watering points along them: none of it is built. Left uncommitted, as the
brief asks.

---

## What the atlas gave

| | **Ovesos** (25) | **Oves Desert** (26) |
|---|---|---|
| hexes | 19: q −12…−8, r 112…116 | 23: q −16…−10, r 114…118 |
| terrain | `grassland` × 8, `plains` × 11 | `plains` × 20, `hills` × 3 |
| where those are | the grassland is **exactly** rows 112 and 113, the northern two | the hills are **exactly** (−14,114), (−15,115), (−16,116) — one hex further west for every hex south, down the western rim |
| world box | x −2250…−1700, z 549…895 | x −2500…−1850, z 722…1068 |
| climate, per hex | **`BSh` × 19** | **`BSh` × 23** |
| neighbours by shared edge | Oves Desert 13, Caricas 7, Nesdor 7, Nethereum 5, Gala 3, Nether Desert 1 | Ovesos 13, Telemonia 12, Nether Desert 8, East Pyros 5, Gala 2 |
| rivers | 7 of the 13 Oves Desert edges (2 `small` at the head, 5 `medium`); all 3 Gala edges `medium`; all 5 Nethereum edges the Neth; all 14 Caricas and Nesdor edges the Lizeem. **None inside** | 7 with Ovesos, 5 with Telemonia (`small`), 2 with Gala (`medium`). **None inside** |
| level | 3 | 4 |

## The climate read, and what it settles

Read per hex from the World Builder map (`world-builder/map/resources/examples/azhora.wwmap`,
`hexes[key].climate`, `koppen-v1`) — not `azhora.cmap.json`, whose one-code-per-region field is a
default and says `Cfb` for almost everything:

**`BSh` on every hex of both countries. Forty-two hexes, one code.** Hot semi-arid steppe, every row
of both, and `OVES_CLIMATE` in `src/content/regions/oves/oves-world.js` records all forty-two; the test holds them to the
map hex for hex and asserts that the set of codes has **one** member. For context the whole quarter
reads the same: Telemonia `BSh` × 23 + `Csb` × 2, the Nether Desert `BSh` × 26, East Pyros `BSh` × 29.

So **there is no gradient here to draw**, and unlike Gala (three bands) or the Ascarths (grass against
hills) neither country has a `<region>Climate` blend function, because a blend of one code is the
code. The whole difference between the two is **terrain and water**, and the code says so in every
comment that could be read as claiming otherwise:

- **Ovesos has the river.** The Oveth runs its entire south-western border, the Sorten lies along it,
  and the grassland rows stand six metres above it.
- **The Oves Desert has the hills and no permanent water in it at all.** A wedge falling to its
  eastern point, three worn summits on the rim, a short broken stone relief, and four cut channels
  with nothing in any of them.

The map's author had `BWh` available for true desert and used it 245 times elsewhere; not here. The
wet-year face — "annual grasses and forbs that exist as seed banks through the dry years germinate in
large numbers" — is what a season would bring, and there are no seasons, so what is drawn is the
**dry year** with the seed-bank stubble where that flush would be.

## The ground, and what was chosen where the atlas is silent

**Profiles** (`REGION_TERRAIN`, src/world/terrain/region-world.js): Ovesos `plains` **base 10 / amp .7 / wave 320**
and `byTerrain.grassland` **16 / 1.6 / 320**; Oves Desert `plains` **12 / .8 / 320** and
`byTerrain.hills` **22 / 1.6 / 320**. The 16 and the 10 are `docs/six-regions-brief.md`'s own numbers
("grass upland at 16 m in the north, falling to the river bottom at 10 in the south"), and they were
kept because of what they meet: Nethereum's 21 across the Neth, Caricas's 17 and Nesdor's 7.2 across
the Lizeem, and **Gala's 4.0 + 4.2 m of `galaRise` ≈ 8.2 across the Oveth**, which the plains' 10
meets within two metres. The desert's 12 is half a metre above the `outland` 11.5 it replaces, so
registering it moves Gala's ground and the Lizeem's level by centimetres.

**Every profile is on Gala's wavelength, 320, and that is deliberate** — see "the ribs" below.

Measured on the built ground:

| | measured |
|---|---|
| Ovesos grassland rows | **15.80 m** mean (13.7–18.4) |
| Ovesos plains rows | **10.24 m** mean (8.4–12.4) |
| Oves Desert plains | **17.87 m** mean, from **22.0** under the rim to **12.5** at the eastern point |
| Oves Desert hills | **36.15 m** mean; summits 35.4, 38.9, 34.4 |
| Gala's `BSh` rows, for comparison | **7.45 m** (7.5 before this build: it barely moved) |

**The landforms** (`ovesGround`, one term of `west-ground.js`'s sum, gated by each country's own blend
and by a hard hundred-metre keep from the Gala border):

- **The Sorten** (`OVES_SORTEN`). The lore's "wide seat", "roughly twelve miles of valley floor where
  the Oveth slows, widens, and deposits what it has carried from the upland". A bench 155 m wide and
  **0.95 m** below the plain, over the river's middle reach (.16 to .84 along) and on the **Ovesian
  bank only** — a depositing river leaves its bench on one side, and the test finds it nowhere on the
  desert's bank at all. It climbs out of the water over 34 m, so the ten metres nearest the river
  stand higher than the bench does: that is the levee a depositing river builds, and the bench behind
  it is the floodline the lore keeps talking about. Because the bench is almost nothing on the centre
  line, **the river's own water level hardly feels it**, which is what made the hand-over below safe.
- **The basin** (`ovesBasin`, rise 9 m over 560 m of westing with a little northing in it). The
  desert's floor falls the length of the wedge from the rim to its eastern point at (−1800, 953),
  where the Oveth and the southern border stream come together. It is a landform and not a level,
  because a base can only say one number; the fall is 9.5 m across the country, measured.
- **The rim** (`ovesRim`): three broad crests, 12 / 13.5 / 11 m over the blend, taken as a **maximum**
  and not a sum, one on each of the atlas's three `hills` hexes. They stand **18.8 to 22.3 m** over
  the ground at their own feet, and the flanks that are the desert's own all-built ground are **1 in
  2.5 to 1 in 2.7** — a traveler walks up any of them.
- **The stone** (`ovesStone`, amplitude 1.05 m on waves of 39 and 61 m, on two turned bearings). "The
  terrain is rocky rather than sandy: exposed formations … worn smooth by older water action …
  covered in a thin, poor soil that accumulates in the lower-gradient sections and is absent on the
  ridge exposures." Two turned bearings, because one laid over open ground reads as corrugation (the
  Ascarth plateau's lesson). `ovesLie` reads the field back — 1 on an exposure, 0 in a pocket — and
  the scatter and the ground tint are both read off it.
- **Four channels with no water in any of them** (`OVES_CHANNELS`): three in the desert running
  east-south-east off the rim hills' feet, and one in Ovesos off the grassland shoulder down toward
  the Sorten. Cut 1.1–1.55 m into whatever the other landforms leave, floored with coarse gravel and
  boulders, walked down the middle as a road, and **each stops clear of the river** — 48 to 255 m
  short of the Oveth — because a channel that only runs after rain does not keep a mouth open.
- **The damp reach** (`OVES_DAMP`): the lore's third exception, "the channel sections that retain
  subsurface flow", on a hundred metres of the Middle Channel's floor. No water surface and nothing to
  drink; a band of green scrub and two tamarisk standing in a dry bed, and the only green in the Oves.

## The water, and the hand-over Gala left

`src/content/regions/western-regions/west-regions.js` adds two courses, both the atlas's own lines, both on a border, and both before
Gala's in `WEST_RIVERS`:

- **`OVETH_UPPER`**, the Oveth's upper course: (−2050, 751) down the Ovesos|Oves Desert line to
  (−1800, 953). `halfWidth` 1.8 → 4.2, `cut` 1.15 → 1.55, **`fordUntil: .33`**. The atlas draws its
  first two edges `small` and the five below them `medium`, and the lore says the rest twice over — by
  the Sorten it is "navigable for light boats and substantial enough for irrigation", and "below the
  Sorten it narrows, drops through a rocky lower section", which is Gala's reach and which Gala built
  waded over rock. **So the deep water is the middle of this river and the fords are its two ends**,
  which is the opposite of every other course in the west and is what the lore asks for. Measured: 28
  of 83 samples are ford, and the deep water begins at **(−1981, 848)**.
- **`OVES_BORDER_STREAM`**, the desert's southern border stream: the five `Oves Desert`|`Telemonia`
  edges of the chain whose last two Gala built as `GALA_DESERT_STREAM`. Waded along its whole length —
  the desert's only two edges with Gala are Gala's reach of it, and a deep one would have walled the
  desert out of the one built country it can reach.

**The upper Oveth's join at (−1800, 953).** Gala's constraint was "at or above 5.38 m", which was the
head of `OVETH_REACH` measured while both of these countries were `outland`. Registering them raised
the ground at that corner, so **both sides rose together**:

| | before this build | now |
|---|---|---|
| `gala-desert-stream`, its last sample | 6.27 m | **8.35 → 7.72 m** |
| `oveth-reach` head (Gala's) | **5.377 m** | **7.70 m** |
| `oveth-upper` mouth (this build's) | — | **8.01 m** |

So the upper Oveth ends at **8.01 m**, comfortably above the 5.38 it was promised, and **0.31 m**
above the head of the reach below it: one river dropping over rock into its own rocky lower section,
not a step up and not a waterfall. The border stream ends at **8.47 m** against Gala's stream's
**8.35 m** — a **0.12 m** fall at the join, which is why its `cutEnd` is 0.95 and not more.

**The deep water stops short of the corner.** The wall is laid from `fordUntil` to
`OVETH_WALL.to` = .94 of the way down and no further: Gala's ford begins at (−1800, 953), and a wall
of deep water butted against somebody else's ford is a wall with a gate in it. The last twenty-five
metres of the Sorten narrow over the same rock Gala's ford is on, so the two builders' fords meet at
the three-country corner. The test asserts that Gala's first sample is not walled.

**What this build did to its neighbours' water**, measured:

- **The Lizeem**: tail 2.58 → **2.59 m**. One centimetre over 363 samples. Still monotonic, still a wall.
- **The Neth**: head 12.72 m unchanged; tail 10.62 → **12.01 m**, **+1.39 m**, because Ovesos's
  grassland at 16 replaced `outland`'s 11.5 on its southern bank. It still falls the whole way, and
  its ford is still the first 24 of 72 samples; `tests/nethereum-world.test.js` and
  `tests/eer-world.test.js` are both green.
- **Gala's own courses**: `gala-desert-stream` and therefore `OVETH_REACH` rose as above; the
  distributary, the Telemonia stream and the braided mouths are untouched. `tests/gala-world.test.js`
  is 11 of 11.

## The seams

**Ovesos | Oves Desert, 13 edges (7 of them the Oveth, 6 dry).** One module lays both countries and
one wavelength carries both, so the seam has nothing in it: measured over **9,967** points of
all-built ground across the whole seam, the steepest slope is **1 in 1.56** (at the Lizeem's bank in
row 113) and **6.0 %** of it is steeper than 1 in 5. Walking south-west out of Ovesos over the six dry
edges the grass thins, the stone comes up, and nothing announces a border, which is what
`docs/six-regions-brief.md` asked for.

**Gala, 3 + 2 edges.** Every one of the five carries a river, so there is no dry way from either
country into Gala and the crossing is Gala's own ford. The contract was to meet Gala within a metre or
two and to write no ground inside its hexes:

| | measured |
|---|---|
| nothing shaped within 100 m of the border | `ovesGround` is exactly 0 at all **1,617** points inside the band, and `groundWithRiver === bedrockHeight` at every one of them that is not within 110 m of a watercourse |
| the levels, hex centre to hex centre across each of the five edges | **worst 2.1 m**, every edge under 2.6 m (test) |
| the one allowance | the Oveth's own channel, which the atlas draws **on** the Ovesos\|Gala line and which is therefore cut in both countries by definition — the same allowance `tests/gala-world.test.js` already makes for the Lizeem's |

**Caricas 7, Nesdor 7, Nethereum 5** — every one of those nineteen edges is a river (the Lizeem
fourteen times, the Neth five) and not one of them is dry. Nothing in this build is written on any of
their hexes; what moved is the two rivers' own levels, above.

## The ribs at x ≈ −1900

Gala reported short steep "ribs" along x ≈ −1900: `relief()` takes its phase from x / wave, the hex
blend mixes the wavelengths, and where Gala's 320 m relief blended into `outland`'s 150 the blended
wavelength — and so the relief's phase — changed across the margin and the ground chirped, up to ten
metres of change and slopes past fifty degrees. **Every profile in these two countries is on 320 on
purpose**, which is the same reason Northern Ascarth put its hill hexes on its grass's wave, and it is
why the desert's roughness is a landform (`ovesStone`) rather than a shorter wave.

Measured, and the answer has two halves:

| ground | points | steepest | over 1 in 5 |
|---|---|---|---|
| round x = −1900, Ovesos + Oves Desert + Gala, **no `outland` in the blend** | 4,421 | **1 in 1.54** | 7.5 % |
| the whole Ovesos\|Oves Desert seam, no `outland` in the blend | 9,967 | **1 in 1.56** | 6.0 % |
| either country where the blend **still** carries `outland` | 6,309 | **1 in 0.46** | — |
| the open country beyond those borders, for comparison | — | **1 in 0.41** | — |

**So yes: the ribs are gone wherever two built countries meet** — on the Ovesos|Gala, Oves
Desert|Gala and Ovesos|Oves Desert margins, which is the x ≈ −1900 the Gala report named. They are
**not** gone where either country still touches unbuilt ground: East Pyros to the west, the Nether
Desert to the north, Telemonia to the south, and Gala's own nine Telemonia edges. There the chirp is
exactly what Gala measured, and it is `outland`'s own — the open country beyond those borders is as
steep as the border is. A cure belongs in `relief()`/`terrainMix` (blend the relief values, not the
wavelengths) and would move every border in the world; not attempted, and still an open question.

Away from those margins both countries are walkable: **6.1 %** of Ovesos and **9.3 %** of the Oves
Desert is steeper than 1 in 3, and the desert's share is the rim hills and the channel banks.

## What grows (`src/content/regions/oves/oves-scenery.js`, its own seeded stream after Gala's)

There is no climate to sort anything by, so what decides is which country a point is in and what the
ground is made of there (`ovesLie`).

- **Ovesos's north** (the grassland rows): bunch grass in big tussocks with the bare earth showing
  between them — about two parts in three cover, and the gaps are the point — buff eleven months of
  the year.
- **Ovesos's south** (the plains rows): the same grass thinner and shorter, grey wormwood and
  blue-grey saltbush wherever it gives out (no collider — nobody walks round a sub-shrub), stones on
  the rises.
- **The Sorten**: greener, closer, taller grass on the bench, and a ground colour a step greener,
  because the river put the soil there (`ovesTint`).
- **The Oveth's gallery, and only along the water**: poplar (tall and narrow), willow (broader and
  greyer) and tamarisk, two trees deep, thicker on the Ovesian bank than on the desert's because the
  soil is there, and thinnest on the desert's border stream, which runs off a rain shadow and not out
  of an upland. **It is the whole of the wood in either country**, and on a steppe that means the
  river is visible from a mile off.
- **The Oves Desert**: perennial scrub half the size of Ovesos's and spaced twice as wide, only in the
  pockets where the soil has gathered; gravel pavement wherever the rock is up and on the rim's tops;
  a stubble of bleached annual seed-heads in the pockets; coarse gravel and boulders on the channel
  floors. **No dune and no sand anywhere** — "the terrain is rocky rather than sandy".
- **The damp reach**: green scrub and two tamarisk in a dry bed.
- **Counts** (`world.ovesMetrics`): 2 water ribbons, 121 deep-water blockers, ~660 reed and sedge,
  ~2,600 channel gravel, ~205 boulders, ~2,200 gravel pavement, ~2,900 grass tussocks, ~240 wormwood
  and saltbush, ~430 desert scrub, ~900 seed-head stubble, ~120 steppe stones, 75 gallery trees, 36
  tamarisk.

**The ground's colour** (`ovesTint`, hooked into `groundTint` the way `galaGroundColour` is): the
atlas's terrain field calls two different things `plains` in each country — the open steppe and the
Sorten's bottomland in Ovesos, the soil pockets and the bare rock exposures in the desert — and it
changes over forty metres in the desert, which no count per hex can say. Everywhere else it answers
null and nothing changes.

## The animals (`src/content/regions/oves/oves-wildlife.js`), every site measured on the built ground

| zone | species | where | why |
|---|---|---|---|
| oveth-otters | otter ×2 | the Ovesian bank, a pace or two from the deep water's edge | the Carica's otter on the next inner branch down; the Sorten's reach is the only deep water in either country, and an otter that is walked at has to have water to go into |
| oveth-ducks | duck ×5, floating | the Oveth's **upper** reach, the two `small` edges above the Sorten | knee-deep quick water over gravel is where a duck sits; the Sorten below is the walled reach and not a duck pond |
| oveth-herons | wading-bird ×3 | a pace off the water at the Sorten's lower end | the overview's "richest avian assemblage documented on the continent" of the Lizeem system, of which the Oveth is one of the five branches; herons are the first bird it names |
| oveth-foxes | river-fox ×2 | in the gallery, on the bench | the *vel-caric*, "a small, semi-aquatic carnivore … of a creature that lives in river margins"; the gallery is the only cover in Ovesos and this is the only river margin |
| oves-upland-hares | upland-hare ×4 | the northern grassland rows | extension: the west's hare on the same short-grazed tussock ground it keeps on the Vastos plain and in Gala's dry north |
| oves-harrier | harrier ×1 | quartering the upland grass at 9 m, following the ground | extension: neither lore file names a raptor, and a steppe of bunch grass is a harrier's living |
| oves-plain-vulture | turkey-vulture ×1, 38 m up | over the dry southern plain | extension, and the brief's own; the overview's bone-bird is what this country wants and is not a rig the game has |
| oves-desert-hares | upland-hare ×3 | the scrub pockets of the wedge | extension, at the animal's dry limit: in a dry year the hares are what is left |
| oves-rim-hawk | plateau-hawk ×1, 34 m up | over the rim hills | **not** an extension: the overview's dry-plateau hawk "hunts the upland grasslands" of the eastern rain-shadow country and is densest on East Pyros's rocky slopes, which is the far side of this ridge |
| oves-wedge-vulture | turkey-vulture ×1, 36 m up | over the damp reach | extension: "they are often the first indicator of water", and the damp reach is the nearest thing to water the Oves has |

**Nothing domestic**, and that is most of what the lore gives: "livestock on the upland ridges —
cattle and short-legged sheep adapted to rolling terrain — is the economy", and every one of those
animals belongs to a herding community, who are people. No sheep, no cattle, no Sorten grazing.

**No new rig.** Three of the overview's rain-shadow animals want models the game has not got — the
**spine lizard** (a new gait: bask long, then dart), the **bone-bird** (a bald vulture over water) and
the **road fox** — and the **sand-cat** cannot be built at all until there is a night for it to be
nocturnal in. They are open questions rather than approximations.

**The one law this country needed that Gala's ranges never asked for**: an otter under the water is
not within reach. `tests/west-life.test.js` has always said so (`grounded = !animal.hidden && lift < 1`);
this test says it too now, because Gala has no otter and the law had not been copied. And the fox's
law is the west's own in both directions: a walker is held to two metres and **a flat run does gain on
it**, which is the whole point of the one animal in either country that looks at a traveler instead of
leaving.

## Registration

`region-layout.js` (PLAYABLE_REGIONS, two REGION_BIOMES) · `region-world.js` (REGION_IDS 25 and 26,
two REGION_TERRAIN entries with `byTerrain`, two REGION_TEXT entries: subtitles, spawns at
(−1905, 706) on the Ovesian plain and (−2205, 902) in the middle of the wedge, descriptions, palettes,
`npcIds: []`, five landmarks each) · `oves-world.js` (new) · `oves-scenery.js` (new, hooked in
`world.js`) · `oves-wildlife.js` (new, spread into `west-regions-life.js` after the Ascarths') ·
`west-regions.js` (the two courses, `OVES_RIVERS`, `WEST_RIVERS`, `WEST_REGION_NAMES`) ·
`west-ground.js` (`ovesGround` in the ground sum) · `world-terrain.js` (the two ground tints) ·
`world.js` (the scenery, `ovesMetrics`, the update, the landmarks; CRLF and its LF import block both
kept) · `languages.js` (the **`ovesos`** dialect, "Inner-branch Mittoli", after `lotharn`, in the
`mittoli` dialect list, and `REGION_LANGUAGE` for both) · `developer-atlas.js` (two travel stops,
anchors on (−9,114) and (−13,116); CRLF kept) · `map-fog.js` (three areas in Ovesos, four in the
desert; CRLF kept) · `build-status.js` (both `early`) · skies via `REGION_TEXT` (`region-sky.js`
unchanged; both added to the OWN_SKY lists in `tests/region-sky.test.js` and `tests/eer-world.test.js`)
· `package.json` · `tests/oves-world.test.js` (new) · `tests/eer-world.test.js` (one assertion: Ovesos
is built now) · `docs/oves-report.md`, `docs/lore-adjusted-to-atlas.md`, `docs/design-answers.md`.

`src/dev/tools/region-survey.js` was **not** regenerated: both countries were already in `PLAYABLE` and the
survey already carried their hexes, as the brief says. `src/world/terrain/region-levels.js` already had them (3 and
4) and `src/content/chapters/civil-war/campaign-world.js` already had their one-line designs; neither was touched.

**Two skies**, and they are the first `BSh` skies in the game. Ovesos gets Gala's own steppe air
(sky 0xc6dad8, haze 0xdad5bc, density .0044 against Gala's .0046), because Gala's northern rows are
this same country with another name on them. The Oves Desert gets the clearest air in the game
(0xcedcd2 / 0xe3dabd, density **.0034**), paler and dustier and further to see, because the one thing
a rain shadow has is distance.

**The language.** `ovesos.md`'s own Language section names it outright: "Inner-branch Mittoli. A
variant of Standard Mittoli fully intelligible to any downstream speaker, differing in vocabulary for
valley terrain, water administration, and the specific practices of the branch-country environment."
So Mittoli, with a dialect and no new tongue. **The Oves Desert has no speech of its own**, and that
is the lore's position rather than a gap: `oves_desert.md` has no language section at all, and
everybody who is ever in the country is from somewhere else. It takes Ovesos's, whose Water Council
claims the margin, and nothing is coined for it.

**Nothing is coined anywhere.** There is no Ovesi and no Oves profile in
`world-builder/azhoran_language_profiles.py` (checked: the file's sixteen naming profiles include no
inner-branch one), so every name is the lore's own word — the Oveth, the Sorten, the Oves — or plain
English: the Upland Grass, the Open Plain, the Dry Gully, the Rim Hills, the Dry Channels, the Damp
Reach, the Dry Wedge, the Wedge's Point. The Sorten is used for the bottomland, which is what the
lore uses it for; the *vel-sorten* allocation that divides it is the Water Council's and is not here.

## Lore adjustments (applied in place, uncommitted)

Both files had already been adjusted once, by the six-regions session, and the climate was settled
then. Building them against the atlas turned up seven more claims — all of them about which way
things lie — and all seven were written into `world-builder/azhora_lore/geography/regions/ovesos.md`
and `oves_desert.md` **in place** (the write was allowed; nothing staged, committed or stashed there),
and recorded claim by claim in `docs/lore-adjusted-to-atlas.md` under "second pass … the Oves build".

`ovesos.md`:
1. The Oveth is the kingdom's **south-western boundary**, not a line through the middle of it: the
   Sorten is the bottomland on the Ovesian bank and the far bank is the desert's own margin.
2. The river comes down onto Ovesian ground at the **western** corner it shares with the Oves Desert
   and the Nether Desert margin, which is where the atlas's course begins.
3. "No mountain wall … to the north, west, or south" → no mountain wall in **any** direction, and the
   two borders that are not ground are named: the Neth north-west, the Lizeem north-east and east.

`oves_desert.md`:
4. The desert is on the basin's **south-western** margin, not its eastern one, behind its **western** rim.
5. The rim hills run roughly north to south **stepping west as they run south** — three summits on a
   line from the north-east to the south-west, which is where the atlas's three `hills` hexes are.
6. The wedge **opens westward from its own eastern point**, the corner where the Oveth and the Telemon
   border stream meet, and runs **east-south-east** off the hill junction.
7. **Nothing inside the Oves carries water the year round**: its two permanent courses are both on its
   edges, and between them are dry beds, some holding water below their gravel.

Everything else in both files stands, and every claim the atlas does not touch was kept.

## Tests

`node --test tests/<name>.test.js`, one file at a time. **`npm test` was not run**: the script
exceeds the Windows command-line limit on this machine.

| test | result |
|---|---|
| **oves-world** (new, 13 tests) | **13 / 13** |
| gala-world | 11 / 11 |
| ascarth-world | 10 / 10 |
| eer-world | 12 / 12 (after the one assertion below) |
| isareos-world | 9 / 9 |
| nethereum-world | 9 / 9 |
| east-lotharn-world | 12 / 12 |
| feradom-world | 14 / 14 |
| caricas-world | 8 / 8 |
| nesdor-world | 8 / 8 |
| region-layout | 7 / 7 |
| region-survey | 4 / 4 |
| regions-world | 9 / 9 |
| region-sky | 6 / 6 |
| map-fog | 7 / 7 |
| developer-atlas | 8 / 8 |
| languages | 16 / 16 |
| region-levels | 4 / 4 |
| **pre-existing failures, identical before and after this build** | |
| south-suval-world | 12 / 13 — "the Stillwater is water at its own level" ("a swimmer in the Stillwater is held at its surface, not walked along its bed") |
| amod-world | 8 / 9 — "the chart, the build status and the world bounds all know about Amod" ("world bounds reach Amod's northern hills (−1301)") |
| elagos-world | 11 / 12 — "Elagos is the ninth playable region" ("the shelf stands above East Lotharn Mountains") |
| chameleon | 6 / 7 — Ed has 19 spots against 22 expected, which the brief names |
| regional-wildlife | the brief's listed failure ("previously empty regions" missing Iscare) |
| west-life | the brief's and Gala's listed failure ("nothing in the west can be walked down", `elagos-meadow-cattle`) |

**The one assertion changed in somebody else's test**: `tests/eer-world.test.js`, "the Neth is why the
far four need a ford", asserted `!PLAYABLE_REGIONS.includes('Ovesos')`. Ovesos is built now, so the
ford is a crossing between two built countries rather than a way onto open country — which is what it
was built for. The comment above it says so.

`tests/oves-world.test.js` holds: the two ids in order and the atlas's hexes, terrains and neighbour
edges; **one climate over all forty-two hexes**, against the map, and one wavelength on all four
profiles; the Gala seam (five edges off the atlas, nothing shaped in the keep band, the levels hex
centre to hex centre); the upper Oveth (both banks, monotonic, the ford's third, the wall, Gala's ford
unwalled, the join at or above 5.38 and within a metre of the reach below) and the border stream's own
join; Ovesos's tilt and the Sorten's one-sided bench; the desert's wedge, its three crests and their
walkable flanks, and the stone field inside the desert and nowhere else; four dry channels, each in its
own country, each clear of the river, nothing growing on a floor; **the ribs, measured on both sides of
the built/unbuilt line**; the scenery's counts and that no tree stands away from water; every wildlife
site on its ground, the raft afloat, the walk-and-run laws with the otter's and the fox's own; two
skies and one tongue; and both countries charted, levelled, listed and empty.

## Review views

_(see the section below, written after the render)_

## Open questions

1. **The ribs are only half cured.** They are gone on every built-to-built margin and untouched
   wherever either country meets `outland` — East Pyros, the Nether Desert, Telemonia, and Gala's own
   nine Telemonia edges. The cure belongs in `relief()`/`terrainMix` and would move every border in
   the world. Until then, building Telemonia and East Pyros is what fixes the rest of this quarter.
2. **The desert wants four animals the game cannot draw yet**: the spine lizard (a new model and a new
   gait), the bone-bird, the road fox, and the sand-cat, which needs a night to be nocturnal in
   (`docs/day-night-brief.md`). A level-4 country with three ranges in it is the honest dry-year
   reading, but it is thin, and the spine lizard is the one that would change it most.
3. **The wet year is not built**, because there are no seasons. The stubble is where the flush would
   be, and when seasons land the Oves is the first country in the game that should visibly change with
   them: annual grass over the whole wedge, and the Ovesos herders' animals on it.
4. **Two names are the user's**: the Oves Desert's southern border stream and Ovesos's dry gully are
   unnamed in the lore and in the atlas, and are called "the southern border stream" and "the Dry
   Gully" in plain words rather than coined.
   **Answered 2026-10-01** (docs/southwest-finish-report.md): the southern border stream is **the
   Caelin**, *mittoli.roots.flow* ("the flow", `src/gameplay/skills/languages.js`, built from the `mittoli` profile's own
   `cael` root and `-in` suffix) - and it carries the same name as Gala's reach of it, because the atlas
   draws the two as one chain and they hand over at (-1850, 1039), the way the Oveth's two reaches do.
   The **Dry Gully stays descriptive**: it is a dry cut rather than a watercourse, Standard Mittoli's
   lexicon has no word for a dry channel, inner-branch Ovesian's documented vocabulary (*thris-kael*,
   *vel-sorten*, *osk-milis*) is all water administration and a gully with no water has no place in it,
   and the only words available would have called it a river. It stays with the other seven plain-English
   terrain names of these two countries.
5. **The Neth's mouth stands 2.2 m below the Lizeem it runs into** (12.01 against the Lizeem's ~14.2
   at that point). That was already true before this build — 3.6 m — and this build halved it by
   raising the Neth's southern bank, but the two rivers still do not meet at one level. It belongs to
   whoever next touches the Neth, and `NETH` has no `headOf` on the Lizeem.
6. **Getting there.** Ovesos is reached from Nethereum over the Neth's ford, from Gala over the
   Oveth's ford, and from the Oves Desert over its own six dry edges; the desert is reached from
   Ovesos and from Gala's reach of the border stream. Caricas, Nesdor and Eer are all across the
   Lizeem and there is no way over it. Nothing leads a traveler to either country yet.
7. **The three `hills` hexes carry the whole rain shadow.** The lore's moisture gradient is across
   that ridge and the far side of it is East Pyros, which is unbuilt: what a traveler sees looking
   west off the rim today is `outland`. When East Pyros lands, the rim's western flank and the
   desert's western margin both settle.
