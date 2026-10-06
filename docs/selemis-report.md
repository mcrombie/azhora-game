# Selemis: what was built

Branch `selemis`, worktree `../azhora-game-selemis`, cut from `b16b66a`. The brief is
`docs/selemis-brief.md`. **Nothing is committed and nothing is pushed**; everything below is in the
working tree.

Selemis is ground now: an island of eight hexes one row of water south of the tip of the Ascarth
Peninsula, a crescent with its hollow turned on the peninsula, one sheltered bay in the hollow with a
strand of sand round it and a rocky head at either end, three grass hills along its back, a table
tilted up toward the open sea, and a cliff on every shore that is not the bay's. **Terrain, climate,
water, scenery and wildlife only.** Nothing belongs to anybody: no city, no harbour works, no
fortification, no road, no ship, no person, no quest.

It is appended last on its base, under the atlas's own key **`Selemi`**; the place is Selemis and its
people the Selemi. **Its number is `REGION_IDS.Selemi` and is written in exactly one place** - 52 on
this base, and it will change at landing, because another branch has taken 52 and 53 on main since
the brief was written (see "Where the number is written", below).

---

## What the atlas gave

| | Selemi |
| --- | --- |
| hexes | 8: (-9,133) (-8,133) / (-9,134) (-8,134) (-7,134) / (-9,135) (-8,135) (-7,135) |
| terrain | `grassland` x 8. **No `hills` hex.** |
| climate (per hex, World Builder map) | `Csa` x 8 - the same code as all eighteen hexes of Southern Ascarth |
| neighbours | none. All fourteen hexes round it are unclaimed `coast` |
| water inside | none: no river edge on or beside any of the eight (572 river edges on the map, none within three hexes) |
| level | 3 (`src/world/terrain/region-levels.js`, already there) |
| nearest country | Southern Ascarth, 173.205 m hex centre to hex centre: (-8,133) against (-7,131). Then Iscare 557 m, Northern Ascarth 700 m, West Izol 889 m, Gala 1,200 m, Marosh 1,510 m |

**The crescent is the atlas's own, and I checked it rather than took it.** The brief's lead was that
(-7,133) is water held on three sides. Asked of the survey rather than typed in (`HARBOUR`,
`src/content/regions/selemis/selemis-world.js`): every sea hex beside the island is asked how many of the island's hexes
stand round it, and **exactly one answers three** - (-7,133), held on its west by (-8,133), on its
south-west by (-8,134) and on its south-east by (-7,134). No other sea hex on the island's whole shore
has more than two.

What the brief's lead did not say, and what makes the lore's sentence true to the degree: **the hex
straight across that water from the island is (-6,132), the last hex of Southern Ascarth.** The middle
of the bay, the island's middle hex (-8,134) and that last hex of the peninsula lie on one straight
line, and the test holds them to it within a micron. So "its concave face turned toward the Azhoran
coast" is not approximately the atlas's shape, it is the atlas's shape: the hollow of the crescent
looks at the tip of the Ascarth Peninsula and at nothing else.

It also means **the harbour is in the channel**, not beside it. The row of water between the two
countries is four hexes - (-8,132), (-7,132), (-7,133), (-6,133) - winding round the peninsula's last
hex, and the bay is the third of them. The channel has a western mouth and an eastern mouth and the
harbour is the middle of it.

**Where it lies.** The island's middle is 210 degrees - south-south-west - of the peninsula's last
hex, 171 degrees - due south - of the tip hex (-7,131), and 154 degrees - south-south-east - of the
peninsula's own middle. It is off the peninsula's southern tip. The lore said "southwest of the
Ascarth Peninsula" and was adjusted (below).

## What the lore gave, and what each line fixed in the build

`world-builder/azhora_lore/geography/regions/selemis.md`, "The Island", is nearly the whole of what
the lore has that is not the city. Every physical sentence, and what it became:

| the line | where | what it fixed |
| --- | --- | --- |
| "shaped like a crescent, its concave face turned toward the Azhoran coast, forming a natural sheltered harbor" | `selemis.md` | the bay is the one three-sided sea hex, found off the atlas; its shore is a strand of sand on all three of the island's edges of it, the only shore on the island that is not a cliff (`HARBOUR`, `strandWeight`) |
| "The city fills this crescent from headland to headland" | `selemis.md`, `the_selemi.md` | two heads, one at each end of the strand, found off the atlas as the two corners of the bay's hex where the island meets the open sea; a rocky crown on each (`HEADS`). No city |
| "the residential districts climbing the island's interior hills" | `selemis.md`, `the_selemi.md` | three hills along the island's back with a saddle between each and the next, and a hollow of lower ground between them and the strand for something to climb out of (`HILLS`, `hollow`) |
| "The channel ... is narrow but not trivial - enough that a fleet can cross it but not so little that an army can wade" | `selemis.md` | nothing was built to make this true; it was measured, and it is: 59.7-61.0 m shore to shore, 6.05 m of water over the deepest ground on every line across, and the wadeable fringe on either shore is 2.2 m (below) |
| "across a channel narrow enough that on a clear day you can read smoke from the other shore" | `selemis.md` | the island's sky is Southern Ascarth's to the digit: one air over one channel |
| "the short sprint between Selemis and the Ascarth coast" | `izol.md` | the same, from the other side: sixty metres |
| "Moving south, the land dries progressively, the hills become pale ... and the coast becomes more cliff-faced, more dramatic, the harbors smaller" | `iberos_coast.md`, of the whole coast | the pale straw of the grass and the pale stone of the tops and cliffs, and the cliffs themselves. This is the coast's own account of its southern end applied to its southernmost ground; the lore says nothing of Selemis's own shores |
| the seabird colonies "on certain rocky headlands and offshore islands"; the Great White Sea-plunger; "Grey dolphins are a consistent presence in Iberos coastal waters" | `fauna/azhoran_fauna_overview.md` | the whole of the wildlife (below) |
| "Selemis sits at the southern mouth of the Iberos Sea ... Every ship moving between the Iberos Sea and the open southern ocean passes within reach of its harbor" | `the_selemi.md` | which side is the ocean's: the island is tilted up toward the south-south-west, and the sea-plungers and the highest cliffs are on that face; the dolphins are in the lane past its eastern end |

**Everything else in the lore is the city, and none of it is built**: the harbour that "is the city",
the lower harbour district built over its own foundations, the residential districts, the warehouses
and chandlers' yards, the foreign merchants' quarters, the archive with its copper roof gone green,
the harbour fortifications, the fast ships kept in the channel, the outpost network. In the game's own
story (`src/content/regions/izol/izol-world.js`, `docs/izol-and-the-triumvirate.md`) the city was taken in 979 and General
Tavren Doreth sits in it. Nothing built here says any of that is not there: the region's own
description, the chart and the build status all name the city as somebody's and unbuilt, as Aevis is
on the peninsula.

## What is mine, labelled

Where the lore is silent and the build needed an answer, these were derived and are **builder's
choices**. Each is the user's to overturn, and each is listed again under the open decisions.

1. **Hills on hexes the atlas calls grassland.** The atlas draws no `hills` hex on the island and the
   lore says "interior hills" twice. Both are kept: they are **hills by height and grassland by
   cover** - 21.2, 27.6 and 22.8 m at their tops, about one in three on their flanks, grass and stone
   and no wood on the upper slopes - and deliberately lower than the peninsula's two wooded hills
   (35.0 and 37.2 m), which stand on hexes the atlas does call `hills`. The lore was adjusted to say
   "low grass hills".
2. **The island is a tilted table with its back to the open sea.** The bench behind the hills rises
   from 8.5 m on the channel shore to 13 m at the island's south-western corner, so the highest cliffs
   face the ocean and the lowest ground is the hollow the harbour lies in. The lore does not describe
   any shore but the harbour's.
3. **A cliff on every shore that is not the bay's.** Eight metres on the channel shore, thirteen on
   the ocean face. Derived from `iberos_coast.md` (above) and from the peninsula across the channel,
   whose west and tip are cliffs. It has a consequence worth stating: the bay is the island's only
   landing, which is a reason for a city to be exactly where the lore puts one.
4. **Where the hills stand.** The island is thickest at three places - the three local maxima of the
   coast field, 80, 88 and 79 m from any water. Each hill stands 18-20 m behind one of them, away from
   the harbour, so that the hollow in front is wide enough to be the lore's harbour and the ground its
   lower districts stand on. They are still 66-74 m from the open sea.
5. **No stream and no spring; two dry winter beds.** The brief asked for this to be derived or left
   dry and labelled. The atlas draws no river edge, and `Csa` is a dry summer by definition - the
   year's rain comes in winter and none of it stays. So the island's water is the winter's: two
   shallow beds come down out of the two saddles between the hills to the strand, with washed stones
   in them and nothing else. No water body, no level, nothing to wade. **A spring is the other honest
   answer** and I did not choose it: a spring on an island with a city on it is the city's water, and
   that is somebody's.
6. **What grows** (below): the lore catalogues no flora for the island at all.
7. **No land animal** (below).
8. **The peninsula's own sky.** Not a new sky: the same three numbers as the two Ascarths.
9. **Two names** (below).

---

## The measured numbers

### The island

| | |
| --- | --- |
| ground above the waterline | 70,704 m2 (2 m lattice); 70,430 m2 of it can hold a body (1 m lattice, `canStand`) |
| walkable extent | 405 m west to east, 285 m north to south |
| mean height | 11.4 m (`REGION_TERRAIN.Selemi.base` says 11.3) |
| highest ground | 28.0 m, on the high hill, 9 m from its centre |
| the three hills | west 21.2 m, high 27.6 m, east 22.8 m; 66, 74 and 67 m from the sea |
| the two saddles | 16.4 m and 17.8 m |
| the two heads' crowns | west 11.0 m, east 10.0 m |
| cliff tops, 5 m in from the water | 6.4-13.9 m over 218 samples. Channel shore mean **8.1 m**, ocean face mean **12.8 m** |
| the strand, 5 m in | 1.4 m, on all 28 samples |
| steepest ground more than 6 m from the sea | 0.67 (a fall starts at 0.9) |
| the hollow | 16,600 m2 in all; 5,650 m2 of it under 4 m, 7,900 under 6, 13,500 under 10; mean slope 0.26 |
| the bay | 8,900 m2 of water inside its own hex, 5,800 m2 of it over 4.5 m deep |

**Nobody is sealed in.** From the travel button every one of the 70,430 standable square metres of
the island can be walked to - the flood from the spawn reaches all of them, every hex centre, every
landmark, both heads, all three hilltops - and it reaches nothing off the island. `tests/nobody-sealed-in.test.js`
is about people and there are none here; the island's own test holds this.

### The channel

Measured the way `tests/swimming.test.js` measures the Pebbles: every standable cell of each shore
with water a body can be in a metre away, and the shortest line between the two shores. Not off the
hex outlines, which say 57.7 m at each of three places.

| pinch | where | shore to shore | deepest ground on the line |
| --- | --- | --- | --- |
| west | the island's (-847, 2311) to the tip's (-847, 2250): corner of (-8,133) against corner of (-7,131) | **61.0 m** | -5.60 m: 6.05 m of water |
| middle | the west head's tip (-800, 2339) to the tip's (-749, 2308): the bay's north-western gate | **59.7 m** | the same |
| east | the east head's tip (-704, 2398) to the tip's (-704, 2337): the bay's eastern gate | **61.0 m** | the same |
| from the strand | the nearest sand, (-797, 2351), to the tip's (-747, 2311) | **64.0 m** | the same |

**The island did not move its own waterline, and that is why these numbers are the atlas's.** The
island's ground is written only where the coast field is positive, and below the first forty
centimetres a cliff is the same shore profile a beach is - so on every shore the waterline is where
the coast field puts it, 2.2 m seaward of the field's zero. The three widths above are the same three
numbers I measured on the untouched base before registering anything (61.0, 59.7, 61.0), when the
island was unregistered `outland`.

**"Not so little that an army can wade"** is true as built: each line across is over a traveler's head
for 93% or more of its length, and the only ground a body can stand on is the 2.2 m of shore at
either end.

### The swim, both ways

**The rule was not changed.** `canSwim`, `moveCharacter` and `src/gameplay/movement/swimming.js` are as they were.

Under the rule as it stands (`docs/swimming.md`): a level-1 bar of wind is 57.8 m and a level-1
swimmer dies at 77.0 m.

| crossing | water | survivable from | on wind alone from |
| --- | --- | --- | --- |
| west pinch | 61.0 m | **level 1** | level 6 |
| middle pinch | 59.7 m | **level 1** | level 4 |
| east pinch | 61.0 m | **level 1** | level 6 |
| from the strand's own sand | 64.0 m | **level 1** | level 10 |

**So: yes, both ways, from the first day.** It is the Pebbles' nearest-skerry class of crossing to the
metre (Drent to Pilot's Stone is 61.3 m): possible early, and plainly a thing you only just did.

Simulated with a body in the water, through the game's own `moveCharacter` and `swimStep`, from each
shore point to the other (this is in the test):

| | level 1 | level 10 |
| --- | --- | --- |
| any of the three pinches, either way | lands with no wind and **85-93 of 100 health**, having swum 59-61 m in about 26 s and drowned for the last few | lands dry with 6-8 wind in hand |

And simulated as a traveler would actually make it - walking off one shore's cliff top with the
game's own fall rule, swimming, and walking up the other shore's cliff (a scratch run, not a test):

| route | the descent | arrives, level 1 | arrives, level 10 |
| --- | --- | --- | --- |
| peninsula to island, west | 12.4 m off the tip's cliff into the water: **no damage** (a fall into water costs nothing) | health 93, on the island's cliff top at 8.6 m | 100, wind 8 |
| island to peninsula, west | 7.8 m off the island's north cliff onto its foot: **22 damage** | **health 62**, on the tip's cliff top at 13.1 m | 78 |
| peninsula to island, middle | 13.3 m into the water, no damage | health 100 (a run off the edge carries six metres and makes it a 53.9 m swim) | 100 |
| island to peninsula, middle | 1.9 m off the low rock at the west head's tip, no damage | health 92 | 100 |
| peninsula to island, east | 11.7 m into the water, no damage | health 87 | 100 |
| island to peninsula, east | 0.9 m, no damage | health 84 | 100 |
| island to peninsula, off the strand | none: wade in off the sand | **health 68** | 100, wind 1 |
| peninsula to island, to the strand | 13.3 m into the water, no damage | health 77 | 100, wind 3 |

Three things that table says and the first one does not:

- **The cliffs do not stop anybody.** Going down one is a fall, and a fall that ends in water costs
  nothing; going up one is walking, because the rule that refuses a slope too steep to walk
  (`canWalkSlope`) applies only in the climbing countries and neither Ascarth nor Selemi is one. Every
  run above ended on the far shore's cliff top. Whether Selemi's or the peninsula's cliffs should be
  climbing terrain is not this job's and was not touched.
- **The worst case is leaving the island by its north cliff**: 22 for the fall and 16 for the water,
  health 62.
- **Swimming is the only way on or off the island today.** No ferry runs to it and nothing is built
  at it. A traveler set down by the travel button can wade in off the strand and reach the peninsula
  with 68 health at level 1.

**What it would take to deny the crossing**, for whoever decides: the atlas's own gap is 57.7 m and a
level-1 swimmer's range is 77.0 m, so no honest shoreline closes it - it needs a rule (the Lizeem's
deep-water wall, `west-deep-water`, is the precedent for water that may not be swum) or a different
curve. Nothing of the kind was built.

---

## The world box and the survey window: neither moved

**The box.** `worldBoundsFor` over every other country without Selemi and over all of them with it
answers the same four numbers, to the last digit:

```
x  -4610.001927939127 ... 609.9980720608719      52.200 hexes
z  -2167.195996001615 ... 3264.4264805429416     54.316 hexes
```

The island's outline reaches x -1000.002...-600.002 and z 2309.534...2598.209, which is 3,610 m inside
the western edge, 1,210 m inside the eastern, 4,477 m inside the northern and 666 m inside the
southern. That is asserted in two places so that it stays measured: `tests/region-layout.test.js`
carries Selemi's paragraph in the ledger and the assertion under it, and `tests/selemis-world.test.js`
holds the same equality, the island's own outline to the digit, and the four margins as floors.

**Neither assertion writes the box's or the window's own numbers, on purpose.** The two countries that
have taken ids 52 and 53 on main, the West and East Baldro Mountains, stand north and east of today's
box on the atlas - q 42...53, r 62...71, against a window of q -50...34, r 79...145 - so the box, the
window, the lattice and `LAND_HEXES` will all have moved by the day the island lands. A test that
pinned today's numbers would go red that day for something that is not the island's; by their
messages, four of the base's red tests (`southwest-world`, `west-lotharn-world`, `mithala-world`,
`amod-world`) are red for a box that moved after they were written. So the numbers in this section
are this base's, and what the island's test holds is what stays true on any base: the box is the same
with the island as without it, the island's hexes stand inside the window with a row and a column to
spare, and every claimed hex the coast lattice can sample is land.

**The window.** `WINDOW` is `{ minQ: -50, maxQ: 34, minR: 79, maxR: 145 }` before and after. The coast
lattice is the same 1,355 x 1,408 = 1,907,840 points. `LAND_HEXES` is 2,079 before and after and does
not change by a hex: all eight of Selemi's were already land in it (six of them since the Ascarths
took `maxR` to 135). The regenerated `src/dev/tools/region-survey.js` differs from the base by exactly four
lines, which are Selemi's own entry in `PLAYABLE_SURVEY`.

**The rivers file** was regenerated with `node scripts/build-region-rivers.mjs` and is byte-identical.
`Selemi` was not added to `RIVER_REGIONS`: the atlas draws no river there.

**And nothing else moved** (a scratch comparison, 331,151 samples on a 2 m lattice over x -1400...-200,
z 1800...2900, taken on the base before any change and again after): the coast field is identical at
every sample; every sample whose height, colour or region answer changed is one that went from open
country to Selemi; **not one sample of Southern Ascarth's ground, coast or colour changed.**

### One thing found while measuring, which is the base's and is left as found

Sampled over the whole of today's lattice, the hexes it reaches are **q -52...34**, r 79...145.
`WINDOW.minQ` says **-50**. The two columns came with the Ibenwood belt, which took the western edge
from -4360.002 to -4610.002 after `minQ` was last measured. They are reached only on rows 144-145 in
the far south-western corner, and nothing on the atlas is claimed west of q -39 in rows 79-145, so
`LAND_HEXES` and the generated file are identical either way - the window is two columns short of its
own stated invariant ("the last column the lattice reaches, and no slack") and nothing depends on it.
I did not move it: it is not the island's, and `tests/southwest-world.test.js` pins the -50 in one
line and the lattice's own answer in the next, inside a test that already fails on the base for the
box (below). It is written into the comment above `WINDOW` and into the island's test, which asserts
the thing that actually matters - every claimed hex the lattice can sample is land.

---

## Where the city would stand

Nothing is built. This is the ground the lore's city would go on, and how much of it there is.

- **The harbour** is the bay, the Seloca: 8,900 m2 of sheltered water inside the one hex, three sides
  of it the island's and the fourth the cliffs of the Ascarth tip a hundred metres from the strand.
  It has two gates, each one hex edge wide: the north-western, 59.7 m between the west head's tip and
  the tip of the peninsula, and the eastern, 61.0 m between the east head's tip and the same.
- **The lower harbour district** ("the oldest foundations in the lower harbor district are several
  stories underground") goes on the strand and the shelf behind it: about 110 m of waterline with
  1,700 m2 of sand, and behind it the floor of the hollow - **5,650 m2 under four metres and 7,900 m2
  under six**. For scale, Solis is a hundred metres by eighty-four.
- **The residential districts "climbing the island's interior hills"** go on the hollow's slope:
  16,600 m2 in all between the shelf and the hills, at a mean slope of 0.26, rising from 2.6 m behind
  the strand to the two saddles at 16-18 m and the three tops at 21-28 m, which are 104-112 m from the
  strand.
- **"From headland to headland"** is 154 m crown to crown. Each head has 1,400-1,700 m2 of ground
  above eight metres, standing over one of the two gates: where the lore's harbour fortifications
  would be. The west head also stands over the west pinch, which is the lore's "fastest ships at the
  channel's northern end" as nearly as the atlas has such a place (open decisions, below).
- **What is on that ground now** is what it would carry with no city on it: maquis, seven wild olives,
  nine tamarisks along the back of the strand, eighteen pines under the hills and two winter beds.
  Whoever builds the city clears it; the scatter is decided by `selemisCover` and a `cityClear`
  predicate in `src/content/regions/selemis/selemis-scenery.js` is one line.
- **Nothing contradicts the story.** There is no garrison, no fleet and no sign of 979 because there
  is nobody; the island's text says the city and everybody in it are somebody's and unbuilt.

---

## Names: two taken, none coined

**What the Selemi speak.** Neither lore file for the island has a Language section. `the_selemi.md`
says only that they "have been absorbing foreign vocabulary ... for long enough that the question of
what is originally Selemi culture is genuinely difficult to answer", and `suval.md` that Sorveth's
commercial register "has absorbed vocabulary from Selemi" - so it is a tongue of its own.
`src/gameplay/skills/languages.js` has had it since the company was hired: **`selemi`, endonym Selanoc, family "Iberos
maritime"**, whose `where` is "Selemis and every Selemi outpost", with a lexicon of twenty-one roots.
Its `from` says where its sound comes from: *"derived - the world-builder profile `tennoca`"*.

**So there is no Selemi profile in `azhoran_language_profiles.py`, and there is a Selemi lexicon in the
game that says which profile it is drawn from.** `tennoca` is filed there under the western tradition
(its inspirations are Cape Thalmagar's) and the alias table has no entry for Selemi; the game's own
earlier decision (`docs/languages.md`) is what joins the two, and *Selanoc* itself is one of that
profile's eight `candidate_pool` names. The names below stand on that decision and no further.

The method is the southwest's, exactly: a name is a word out of the tongue's own lexicon used as a
name, the way the Vaellir is the Pyrosi word for a river. Nothing is coined to sound right.

| feature | name | where it comes from |
| --- | --- | --- |
| the bay | **the Seloca** | `LANGUAGES.selemi.roots.harbour` is *seloca*, "harbour" - the profile's `sel` onset with its `-oca` suffix, both in `tennoca`'s own lists. The tongue's word for a harbour, for the harbour the lore says "is the city" |
| the channel | **the Nocveth** | `LANGUAGES.selemi.roots.crossing` is *nocveth*, "crossing" - on the `noc` root, which is `tennoca`'s first root for the sea. The peninsula's own chart calls the same water "the Selemi channel", which is what it would be called from that side; this is what it is called from this one |

**Everything else stayed descriptive, and why:**

- **the interior hills** - the lore's own words, and the Selemi lexicon has no word for a hill. The
  profile has hill *roots* (`ver`, `can`), and a root plus an ending would have been a coinage with
  nothing in the lexicon to say which ending a landform takes. *Canver*, which those two roots make,
  is already the lexicon's word for a fort.
- **the west head, the east head** - the lore says "headland to headland" and names neither.
- **the strand** - *sereth* is the lexicon's word for a shore, any shore; with the bay named it would
  have been a second name for the same place.
- **the winter beds, the south cliffs** - plain English for plain things.

The test holds both names to the lexicon: if `roots.harbour` or `roots.crossing` changes, the
landmark's name must change with it.

---

## Climate, sky and what it looks like

`Csa` on all eight hexes, read per hex off `map/resources/examples/azhora.wwmap` (`koppen-v1`);
`azhora.cmap.json` says `Cfb`, which is its default for most of the atlas and not a reading
(`SELEMIS_CLIMATE`; the test checks both). Southern Ascarth is `Csa` on all eighteen of its hexes, so
the two shores of the channel are one climate.

**The sky is the peninsula's, to the digit**: `sky` 0xb3d6e0, `haze` 0xcdd6d0, density .0045. A
different haze sixty metres from the cliff it was set for would change the air over a swimmer halfway
across, and would make the lore's one sentence about the channel false in the one place it is about.
`Selemi` is on the shared `OWN_SKY` list (`tests/own-sky.js`), one line.

**Kin to the tip, and its own place** by three things:

- **the grass is a shade paler and more straw** (`#b1a971` against the peninsula's `#aba66b`);
- **the stone is pale** - a warm cream-grey on the tops and the cliffs (`#a39d8c`) against the
  peninsula's grey-brown (`#8a857a`);
- **which way a point faces decides what is on it**, because an island four hundred metres long has
  a windward side and a lee and nothing else (`selemisCover`): the hollow is greener and carries the
  maquis and the trees; the tops are thin soil with the stone through it; the ocean face is
  salt-burnt, its scrub pruned flat with spurge gone yellow in it; the winter beds are washed stones.

**Two tint tables.** The island has a row in `GROUND_TINTS` (`selemisTint`), the fifth family and the
first to arrive as a row; the guard in `tests/southwest-world.test.js` has its line. And because a
cliff is the one shore the world's sand tint is wrong on, the peninsula's one-line exception became a
second table walked the same way, **`SHORE_TINTS`**, with a row each for `ascarth` and `selemis` and a
guard in the island's test that every row puts stone on its own shore and nothing on the other's. The
peninsula's row is the same function it was and its colours are identical (the comparison above).

The island's ground row also paints **the sea hexes' share of the hex blend** on the island's own
ground. Every point of an island this small is within the blend's reach of several unclaimed sea
hexes, which the blend counts as `outland` and colours a green that belongs to no ground here.

## What grows

`src/content/regions/selemis/selemis-scenery.js`, its own seeded stream after the southwest's. The lore catalogues no flora
for the island; all of this is derived from the climate code, `iberos_coast.md` and the peninsula, and
is a builder's choice.

| | count | where |
| --- | --- | --- |
| grass tufts | 4,928 | everywhere but sand, cliff faces and the beds; green only in the hollow |
| scrub | 1,075, of which 172 maquis | maquis in the lee; cushion garrigue elsewhere; wind-pruned cushions and yellow spurge on the ocean face |
| stones | 279 scattered, 36 outcrops on the five tops, 247 at the foot of the cliffs | more and bigger where the soil is thinnest |
| winter-bed stones | 278 | down the middle of the two beds |
| sea-wrack | 72 | a broken dark line along the top of the swash on the strand |
| pines | 18, in three small stands | under each hill on its harbour side, every one leaning off the sea wind |
| wild olives | 7 | singly on the hollow's slope, never two within 25 m, as on the peninsula |
| tamarisk | 9 | along the back of the strand |

Thirty-four trees in all, on purpose. Nothing is planted in rows, cut, walled or tended.

## What lives there, and why

`src/content/regions/selemis/selemis-wildlife.js`: five ranges, fourteen animals, **every one of them a seabird or a dolphin**.

| range | animals | where | why |
| --- | --- | --- | --- |
| `selemis-west-head-gulls` | gull x 3 | the west head's cliff top, over the channel | the overview's seabird colonies "on certain rocky headlands and offshore islands": this is a rocky headland on an offshore island, so these are the lore's own birds on the lore's own ground |
| `selemis-east-head-gulls` | gull x 3 | the east head's cliff top, facing the open Iberos | the same, on the other of the two headlands |
| `selemis-south-cliff-gulls` | gull x 3 | the island's southern point, 13 m up | the same; the highest and most exposed shore the island has |
| `selemis-ocean-plungers` | Great White Sea-plunger x 3 | circling off the south-western cliffs | the overview puts its breeding colonies on "rocky headlands and offshore islands". The peninsula's work the Iberos side of the tip; these work the ocean side of the island |
| `selemis-dolphins` | dolphin x 2 | the lane past the island's eastern end | "a consistent presence in Iberos coastal waters", in the water the island's own lore says every ship passes through |

Every ground site is standable, on the island's own hexes, 2.5 m clear of every trunk and stone, on a
cliff top. No new rig.

**The gulls stand a dozen metres back from the cliff edge, not five, and that is a finding.** The
terrain out here is drawn from vertices 7.1 m apart, so the *drawn* cliff top begins up to ten metres
behind the walkable one. The first sites were 5.5-9.3 m back, much as the peninsula's are, and in the first
picture a gull stood in the air: measured against the terrain mesh itself, three of the nine floated
by 0.75, 1.15 and 1.60 m. They are 10.6-12.0 m back now, every one within 0.1 m of the drawn ground,
and the island's test holds each gull to within 0.3 m of the surface the renderer draws - and the
travel button and every named place to less than half a metre *under* it, which matters here because
`tests/drawn-ground.test.js`, whose job that is, does not run on this base (below).

**The west's laws, on the island's own ranges.** `tests/west-life.test.js` stops at the first failing
band in the whole west, and this base has failing bands (below), so the island's three ground ranges
are held to the same laws by the same chase in the island's own test: a walker coming at them from
each of the four quarters never gets within three metres (measured, on the final sites: 8.2-9.0 m)
and nothing ever stands off its footing; a band that has been run at is home again three minutes
later, watched (within 9-14 m of its own spots, against the law's 20), and four minutes later,
unwatched (within 1-2 m).

### No land animal, and the measurement behind that

The brief said to measure before promising a ground animal a range, so I measured, and **the answer
is that one fits**. A hare range was put through the same laws at three places and passed all of them
at all three:

| candidate range | size | a walker gets no nearer than | a runner gets no nearer than | home again, watched / unwatched |
| --- | --- | --- | --- | --- |
| the western end | 90 x 95 m | 8.9 m | 8.3 m | 11.5 m / 5.8 m |
| the eastern tail | 95 x 95 m | 9.0 m | 8.7 m | 8.3 m / 5.8 m |
| the south bench, behind the hills | 140 x 66 m | 6.9 m | 5.5 m | 13.9 m / 5.8 m |

**I did not add one.** Room was never the reason an animal belongs somewhere, and the lore gives this
island no land animal: what it has of Selemis is a city. The peninsula's hares are there as a labelled
extension and the brief's rule here was "derived from the lore, not invented to fill space". It is an
open decision, and the range is measured and ready if the answer is yes.

**Also deliberately absent:**

- **the Iberos albatross**, which the overview has coming up this sea in winter from "somewhere beyond
  the horizon south of Azhora" - which would bring it past this island. The southwest's last job put
  the game's one albatross over Trogo's southern shore and argued it is the one place it can be put.
  A second is the user's to decide;
- **the black migratory geese**, which "winter in the coastal marshes and river mouths", and the
  island has neither;
- **nothing domestic, and nothing of a harbour** - no cat on a quay and no gull on a roof, because
  there is no harbour built for it to belong to.

---

## The lore, adjusted to the atlas

Edited in place in `world-builder/azhora_lore` (the write was allowed). **Nothing was staged,
committed, stashed or pushed there.** Four sentences in three files, each inside one line, so the
files' CRLF endings are untouched:

| file | was | now | the atlas fact |
| --- | --- | --- | --- |
| `geography/regions/selemis.md` | "Southwest of the Ascarth Peninsula, across a channel ..." | "Off the southern tip of the Ascarth Peninsula, across a channel ..." | the island's middle is 171-210 degrees from the tip's hexes and 154 degrees - south-south-east - from the peninsula's own middle |
| `geography/regions/iberos_coast.md` | "southwest of Ascarth across a narrow channel" | "off the southern tip of Ascarth across a narrow channel" | the same |
| `geography/regions/selemis.md` | "the residential districts climbing the island's interior hills" | "... climbing the low grass hills of the island's interior" | all eight hexes are `grassland`; the atlas draws no `hills` hex |
| `peoples/the_selemi.md` | "the residential districts climbing the interior hills" | "... climbing the low grass hills of the interior" | the same |

**Read against the atlas and left alone:**

- "its concave face turned toward the Azhoran coast" - true to the degree.
- "a midsized island" - eight hexes; the atlas does not contradict it.
- "The city that occupies most of its northern coast" - the bay is on the island's north-eastern side.
- **"stationed their fastest ships at the channel's northern end"** - the channel runs west to east
  round the peninsula's last hex and has a western mouth and an eastern mouth; it has no northern
  end. I did not rewrite it: it is a sentence about where the city keeps its ships, and choosing
  which mouth it means would have been inventing the city's dispositions. Open, below.
- The copy of this lore embedded in the World Builder map's own `regions[].lore` still says
  "Southwest". That file is the atlas and was not touched.

---

## Registration

`scripts/build-region-survey.mjs` (PLAYABLE, and Selemi's paragraph in the `WINDOW` ledger) ->
`node scripts/build-region-survey.mjs` (four lines) -> `node scripts/build-region-rivers.mjs` (no
change) · `src/world/terrain/region-layout.js` (PLAYABLE_REGIONS, one biome, `harbour-island`) ·
`src/world/terrain/region-world.js` (REGION_IDS, REGION_TERRAIN, REGION_TEXT with seven landmarks) ·
**`src/content/regions/selemis/selemis-world.js`**, **`src/content/regions/selemis/selemis-scenery.js`**, **`src/content/regions/selemis/selemis-wildlife.js`** (new) ·
`src/world/terrain/world-terrain.js` (the ground chain, a row in `GROUND_TINTS`, and `SHORE_TINTS`) ·
`src/world.js` (scenery, metrics, landmarks) · `src/content/regions/western-regions/west-regions-life.js` (the ranges) ·
`src/gameplay/skills/languages.js` (`Selemi: spoken('selemi')`) · `src/dev/tools/build-status.js` (`early`) ·
`src/dev/tools/developer-atlas.js` (one travel stop, on (-8,134), its number read from `REGION_IDS`) ·
`src/ui/map/map-fog.js` (four chart areas, after Trogo's and before Peblos's - not at the end of the list,
which `tests/ibenwood-metadata.test.js` keeps for the Ibenwood's) ·
`src/main.js` (seven `selemis-*` review views) · `tests/own-sky.js` (one line) ·
`tests/region-layout.test.js` (the ledger and its assertion) · `tests/southwest-world.test.js` (the
tint guard's line) · `tests/chameleon.test.js` (Ed does not go there yet: `Selemi` joins South Suval,
Gala and the two Ascarths in `WITHOUT_ED`, so registering the island does not move that test's
number) · **`tests/selemis-world.test.js`** (new, fifteen tests) · `package.json` ·
`docs/design-answers.md` · this report.

Not touched, and why: `src/world/terrain/region-levels.js` already had `Selemi: 3`. `src/content/chapters/civil-war/campaign-world.js` already
had the Coalition member `selemis` with `regions: ['Selemi']`; it has **no `REGION_DESIGN` row** for
the island, and adding one would be story. `src/world/environment/region-sky.js` needs nothing: a country declares its
sky in `REGION_TEXT`. `src/gameplay/movement/game-state.js` and `src/gameplay/movement/swimming.js`: the swim rule was not changed.
`src/gameplay/movement/climbing.js`: the island is not climbing terrain.

### Where the number is written

The coordinator's word during the build: Selemi will not land as 52, so keep the literal out of
everything a renumber would have to touch, and list where it still appears.

- **`src/world/terrain/region-world.js`, `REGION_IDS`: `Selemi: 52`.** The one place, and the only line a renumber
  has to change in the code.
- **Nowhere else in code, tests, views, atlas rows or comments.** The developer atlas's row is
  `[REGION_IDS.Selemi, 'Selemis', 'selemis', 'Selemi', selemisAnchor]` (it imports `REGION_IDS` for
  that; its destination id, `region-52` here, is built from it). The island's test asserts that its id
  is greater than Trogo's - the last country of the base it was built on - and equal to its place in
  `PLAYABLE_REGIONS`, and compares everything else to `REGION_IDS[SELEMI]`. No comment says "fifty-two"
  or "the fifty-second".
- **`PLAYABLE_REGIONS` and the survey script's `PLAYABLE`** carry the *name* at the end of the list,
  which is a position and not a number: at landing it goes after whatever is there.
- **In prose**: this section and the first paragraph of this report, and `docs/selemis-brief.md`
  (the coordinator's, "Register `Selemi` as id 52").
- **Other 52s in what I wrote that are not the id**, so that a search does not mislead whoever
  renumbers: the coast lattice's column q -52 (the `WINDOW` comment in
  `scripts/build-region-survey.mjs`, and a comment in the island's test), a scatter offset of 52 m
  (`src/content/regions/selemis/selemis-scenery.js`), and a camera offset of 52 m in the `selemis-south-cliffs` view
  (`src/main.js`).

**At landing, after the Baldros**, what has to be done by hand is the usual and no more: the number in
`REGION_IDS`; the name's place at the end of `PLAYABLE_REGIONS` and of the survey script's `PLAYABLE`,
and `src/dev/tools/region-survey.js` regenerated rather than merged; the developer atlas's row moved to its
place in id order; and the two branches' lines put side by side where both append to the same list
or comment (the `WINDOW` ledger, the ledger in `tests/region-layout.test.js`, `REGION_TERRAIN`,
`REGION_TEXT`, `REGION_BIOMES`, `GROUND_TINTS` and its guard in `tests/southwest-world.test.js`,
`OWN_SKY`, `WITHOUT_ED`, `package.json`). The island's wrap of the ground chain in
`src/world/terrain/world-terrain.js` can go inside or outside anybody else's: `selemisGround` writes only where the
point is Selemi's and above the coast field's zero. The four chart areas stay ahead of Peblos's in
`SUBREGIONS`, wherever the Baldros put theirs.

**Line endings.** The brief calls `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js` and
`src/dev/tools/developer-atlas.js` CRLF. They are in fact **mixed** on the base (`main.js` is 493 CRLF lines and
10,560 LF; `world.js` 1,993 and 386), and `.gitattributes` stores every file byte for byte. Every line
I added takes the ending of the line it was put beside, and no existing line's ending changed:
`main.js` gained 38 LF lines and still has 493 CRLF.

---

## Tests

Every file was run alone with `node --test tests/<name>.test.js`, one at a time, never two at once.
**`npm test` was not run and the full suite was not run.** Fifty-eight files were run on the branch,
and twenty-six of them on the base as well. The repo has 376.

**Selemis's own**: `tests/selemis-world.test.js`, **15 of 15**. It holds: the atlas's eight hexes, the
fourteen unclaimed ones round them and no river; the climate against the World Builder map and the
sky against the peninsula's; the world box with and without the island and the coast lattice sampled
whole; the one bay, its axis and what stands across it, the two heads, sand round the bay and a cliff
everywhere else; the three hills, the saddles, the tilt and the steepest inland slope; the hollow's
area, and the flood from the travel button reaching every standable square metre; both winter beds
falling the whole way and dry; the channel's three widths, its depth, and the swim simulated both
ways at levels 1 and 10; that the island writes nothing off itself; collider kinds, landmarks, names
against the lexicon, chart areas, language and travel stop; the scenery counts, where each kind of
tree stands and that each is in the world's tree registry; both tint tables; every wildlife site, on
the drawn ground as well as the walkable; and the west's chase laws on the three gull ranges.

### One regression was mine: found late, and fixed

`tests/ibenwood-metadata.test.js` holds that nothing but the Ibenwood's own chart areas follows
`long-pasture` in `SUBREGIONS`. **It is 5 of 5 on the base, and with the island's four chart areas
appended to the end of that list - where I had put them - it was 4 of 5.** They stand after Trogo's
now and before Peblos's - on the base the list ends with Peblos's, West Izol's and the Ibenwood's, and
every other country's areas are ahead of those - and it is 5 of 5 again. A comment at the areas says
why they are there.

The file is not on the brief's list. I found it by searching the tests I had not run for assertions
about the order, the tail and the size of every shared list the island was added to -
`PLAYABLE_REGIONS`, `REGION_IDS`, `REGION_ORDER`, `SUBREGIONS`, `WEST_LIFE_ZONES`, the world's
landmarks, the travel stops, the tree registry - and running what the search turned up, and with it
the five files that import a module the island changed and do not build the world: the seventeen
files marked **+** in the tables below. **A search is not a sweep.** 318 of the repo's 376 test files
were not run on this branch, and the same kind of thing may be waiting in one of them.

### When each was run

- **final** - after the last change to any file under `src/`, `scripts/` or `tests/`.
- **late** - after the last change to the ground, the scenery, the wildlife and `src/main.js`, and
  before the four chart areas were moved up their list. None of the files so marked imports
  `src/ui/map/map-fog.js`.
- **early** - on the state of 16:40-18:16, before what the first review pictures caused (the grass
  count and colour in `src/content/regions/selemis/selemis-scenery.js`, the nine gull sites in `src/content/regions/selemis/selemis-wildlife.js`, two
  view definitions in `src/main.js`), before the renumber-proofing (the atlas row reading
  `REGION_IDS`, two comments) and before the chart areas moved. **Not re-run.** The world those
  files built differs from the final one by how much grass is on the island and what colour it is, by
  where nine gulls stand, and by the order of four entries in one list.

### Green: thirty-three files

| file | result | run |
| --- | --- | --- |
| `selemis-world` | 15 / 15 | final |
| `ascarth-world` | 10 / 10 | final |
| `region-layout` (world-size guard, the ledger, PLAYABLE order) | 8 / 8 | final |
| `region-survey` | 4 / 4 | final |
| `map-fog` | 7 / 7 | final |
| `iscare-world` | 3 / 3 | final |
| `cartography` | 13 / 13 | final |
| `region-levels` | 4 / 4 | final |
| `world-map-detail` | 13 / 13 | final |
| `testing-travel` | 6 / 6 | final |
| **+** `ibenwood-metadata` | 5 / 5 | final (4 / 5 before the fix above) |
| **+** `ibenwood-environment` | 8 / 8 | final |
| **+** `barrett-geography` | 6 / 6 | final |
| **+** `survey-world` | 1 / 1 | final |
| **+** `south-oremindi-wildlife` | 5 / 5 | final |
| **+** `south-oremindi-integration` | 5 / 5 | final |
| **+** `game-mode` | 10 / 10 | final |
| **+** `ibenwood-rivers` | 6 / 6 | final |
| **+** `kayla-host` | 8 / 8 | final |
| **+** `linguist` | 20 / 20 | final |
| **+** `player-characters` | 21 / 21 | final |
| `nobody-sealed-in` | 6 / 6 | late |
| `west-life`, two tests by `--test-name-pattern`: the range law over every zone in the west, and the live-positions test | 2 / 2 | late |
| **+** `tree-registry` | 4 / 4 | late |
| **+** `places` | 7 / 7 | late |
| **+** `quest-destinations` | 3 / 3 | late |
| `izol-world` | 9 / 9 | early |
| `minimap` | 15 / 15 | early |
| `place-regions` | 3 / 3 | early |
| `oves-world` | 13 / 13 | early |
| `gala-world` | 11 / 11 | early |
| `closed-border` | 6 / 6 | early |
| `town-life` | 5 / 5 | early |

### Red: twenty-five files, every one of them run on the base and compared

**Every red file is red on the base, in the same tests.** I ran all twenty-five on the clean base at
`azhora-game-land` (read-only, one at a time) and compared the failing tests' names and assertion
messages line by line. **Twenty-three are identical.** The other two, `south-oremindi-metadata` and
`yunethre-world`, fail the same test on the same assertion with one word different: each asserts that
its own country is the last in the list of regions, and the name it finds there instead is `Trogo` on
the base and `Selemi` on the branch. Eight of the twenty-five are on the brief's known-failing list
and three more were named by the coordinator during the build; **the other fourteen are on neither
list.**

Run: `developer-atlas`, `languages`, `southwest-world`, `region-sky`, `campaign-world`,
`south-oremindi-metadata`, `yunethre-world` and `rena` are final; `chameleon` and
`regional-wildlife` are late; the other fifteen are early.

| file | branch | the failing test, and its message | base |
| --- | --- | --- | --- |
| `southwest-world` | 28 / 34 | four "the atlas gives ... countries ..." tests (ids `[39..42]` where it expects `[32..35]`, and so on to `[50,51]` against `[43,44]`); "the world box grew west ..." (`minX is -4610.001927939127`); "the block still touches no built country ..." (`East Ibenwood is built and shares an edge with this block`) | run: identical six. **The one test in this file I touched, the ground-tint guard, passes** |
| `region-sky` | 5 / 6 | "every region but the ones that asked for their own gets the default sky": `Caricas has stopped using the default sky` | run: identical |
| `eer-world` | 11 / 12 | "Eer is the first country with a sky of its own ...": `Caricas lost the default sky` | run: identical |
| `developer-atlas` | 7 / 8 | "local destinations stand on their own authored regions ...": `one stop per playable region, in order` (rows 38 and 37 are listed in swapped order; Selemi is last in both lists) | run: identical; also coordinator-known |
| `languages` | 15 / 16 | "every region on the atlas has a tongue ...": `East Ibenwood has no tongue` | run: identical |
| `open-country` | 5 / 8 | three tests, all `(-2530, -220) ... Yunethre` | run: identical; also coordinator-known |
| `drawn-ground` | 0 / 4 | `RangeError: Maximum call stack size exceeded` in the first, `TypeError: Cannot read properties of null (reading 'toFixed')` in the other three | run: identical |
| `regions-world` | 8 / 9 | "District scenery batches ...": `Terrain tiles share one vertex buffer` (15, expected 1) | run: identical |
| `local-map-data` | 11 / 12 | "the real world exports immutable shoreline ...": `the chart includes the expanded authored cottages, farms, and barracks` (16, expected 15) | run: identical |
| `caricas-world` | 7 / 8 | "Caricas charts its occupied town ...": `the chart knows caricas-farms` | run: identical |
| `mithala-world` | 13 / 14 | "the world grows north ...": `east to west is 52.20 hexes, none of it the plain's` | run: identical |
| `west-lotharn-world` | 9 / 10 | "this country does not grow the world box ...": `minX is -4610.001927939127` | run: identical |
| `trogo-undergrowth` | 7 / 8 | "the rule is the climbing rule's shape ...": `the set holds both the name and the id, as CLIMB_REGIONS does` | run: identical (this is found-on-the-way 4, below) |
| `swimming` | 16 / 17 | "the two ways out of the water both pay for the swim ...": `ReferenceError: ELFLAND_ENCOUNTER is not defined` | run: identical; also coordinator-known |
| `amod-world` | 8 / 9 | "the chart, the build status and the world bounds all know about Amod": `world bounds reach Amod's northern hills (-2167)` | run: identical (brief's list) |
| `elagos-world` | 11 / 12 | "Elagos is the ninth playable region ...": `the shelf stands above East Lotharn Mountains` | run: identical (brief's list) |
| `chameleon` | 6 / 7 | "every one of his spots ...": `one per region he visits, and two in open country` (19, expected 49) | run: identical (brief's list). **Registering the island had made it 19 against 50**, the one number in any other test that the island moved; `Selemi` is in `WITHOUT_ED` now, as the two Ascarths are, and it is 49 again |
| `regional-wildlife` | 7 / 8 | "previously empty regions have distinct modest populations ...": Iscare Archipeligo in the list | run: identical (brief's list) |
| `south-suval-world` | 12 / 13 | "the Stillwater is water at its own level ...": `a swimmer in the Stillwater is held at its surface, not walked along its bed` | run: the same test and the same message. Its `actual` field is the whole text of `src/main.js`, which differs between base and branch by the island's seven views and nothing else (brief's list) |
| `isareos-world` | 8 / 9 | "a red deer cannot be run down, and Minora joins the charted frontier": `the chart knows menora` | run: identical (brief's list) |
| `nethereum-world` | 8 / 9 | "every hex of Nethereum is honest ground ...": `west-ground.js and world-terrain.js disagree by 0.6607337264528148` | run: identical (brief's list). The brief's second failure there, a cow reached to 3.46 m, did not fail on either |
| `campaign-world` | 6 / 7 | "describeRegion merges design with the survey ...": 40, expected 39 | run: identical (brief's list) |
| **+** `south-oremindi-metadata` | 3 / 5 | "South Oremindi appends region 37 ...": the last region in the list is `'Selemi'` where it expects `'South Oremindi Mountains'`; "South Oremindi retains all 45 authored cells ... without widening the world": `minZ` | run: the same two tests on the same two assertions. The first finds `'Trogo'` last on the base |
| **+** `yunethre-world` | 7 / 8 | "Yunethre appends its exact 27 plains cells ...": the last region in `REGION_ORDER` is `'Selemi'` where it expects `'Yunethre'` | run: the same test on the same assertion. It finds `'Trogo'` last on the base |
| **+** `rena` | 9 / 10 | "the chart names Tidehaven ...": `ambron` (the chart area of that name, in Elagos, has a radius of 155 against the law's 130) | run: identical. The loop stops there on both, before it reaches the island's four areas, so I held those to the same law with a scratch script: each stands on its own hex, each has a radius inside the law, and no pair of areas anywhere is nearer them than the law allows |

**What was not run, said plainly.** The full suite. `npm test`. 318 of the 376 test files.
`east-suval` (coordinator-known as failing on the base; I did not run it either side). The whole of
`west-life` beyond the two tests above - the coordinator timed it at over twenty-five minutes in one
process, and its chase laws stop at the first failing band in the west, so the island's ranges are
held to those laws in the island's own test instead.

Of the 318, these sixty-four both build the world and import, by name, one of the shared modules the
island changed (`region-layout`, `region-world`, `region-survey`, `build-status`, `developer-atlas`,
`languages`, `map-fog`, `west-regions-life`, `world-terrain`, the survey and river scripts). I
searched them for assertions that range over a whole shared list, read every hit and found nothing
more that the island moves - and **I ran none of them**: `ambron`, `amod-ogre`, `autopilot-bridge`, `batman`, `batman-checkpoint`,
`batman-flight`, `batman-flight-migration`, `bird-garden-keeper`, `border-chapter`, `cagney-quest`,
`catie-autopilot-world`, `climbing-world`, `company-file`, `company-route-world`, `cub-autopilot`,
`drent-birds`, `drent-spacing`, `drent-wildlife`, `drent-world`, `east-lotharn-peaks`,
`east-lotharn-world`, `farming`, `feradom-wildlife`, `feradom-world`, `forest-places`,
`frontier-world`, `ibenwood-boundary`, `ibenwood-gathering`, `ibenwood-life`, `ibenwood-pilot`,
`izol-people`, `katy`, `lakota`, `lighthouse`, `long-road`, `long-road-clock`, `meneth-world`,
`menora-city`, `nesdor-world`, `nothom-thickets`, `npc-route-world`, `opening-sequence`,
`peblos-world`, `port-calos-world`, `pueth-world`, `regional-farmland`, `rival-light`,
`rival-light-world`, `smith`, `solid-props`, `solis-sack`, `solis-town`, `south-oremindi-world`,
`story-stands`, `sunflower-lesson`, `suval-highlands`, `vastos-camp`, `vastos-world`,
`west-lotharn-peaks`, `west-rivers`, `west-suval`, `wine-attic`, `word-arrival`, `world-scale`.

---

## Review

**Seven `selemis-*` views** in `src/main.js`, beside the `southwest-*` ones in the same function, and
each worked out from the island's own numbers - the harbour the atlas's hexes make, the two heads at
the ends of its strand, the hills and the beds - so a view cannot drift off the thing it shows.
Photographed with

```
node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=selemis-from-the-tip,selemis-strand,selemis-hollow,selemis-heads,selemis-channel,selemis-south-cliffs,selemis-winter-bed"
```

with no errors. Images: `tests/artifacts/selemis-*.jpg`. **Every picture is from a run after the last
change that could affect it**, and I have looked at all seven: six are from the second run, taken
after the last scenery change, and the seventh (`selemis-heads`) was re-taken alone after its own
view was repointed. Three changes were made after the last picture and none of them is drawn: the
island's test was edited twice, and its four chart areas were moved up the chart's list (the tests
section, below). No render was taken for those.

**Two rounds, and the first caught four things.**

- **A gull stood in the air over the channel.** The drawn ground and the walkable ground are two
  surfaces; the gulls moved back from the cliff edges and the test holds them to the drawn one
  (above).
- **The grass was white.** The straw tufts' lightness was written in the renderer's working space and
  came back two stops paler - the same thing the peninsula's first picture found in its stones. It is
  chosen in sRGB now, and reads as straw.
- **The grass was thin.** It photographed as a lawn at a low angle, as Marosh's terrace did; the count
  in the habit table went from 170 to 250, which is three times the peninsula's 84.
- **The hollow was a picture of a pine.** The review camera backs off from what it looks at until
  something stops it, and from the high hill the thing that stopped it was the crown of one of the
  pines below. The view looks down from higher now. The second round did the same thing to the
  headland view - the re-seeded scatter had put a stone on the west head's crown, which was that
  view's target - so it looks at the head's tip instead, where nothing stands.

**What the final set shows:**

1. `selemis-from-the-tip` - **the picture of the job.** From the cliff top of the peninsula's last
   hex, down the harbour's own axis: the bay, the strand with its dark line of wrack, the hollow behind
   it, three hills with pines under them, and both winter beds as pale streaks coming down between the
   hills. It is the lore's sentence drawn: a crescent with its concave face turned on the coast. (The
   gull in the foreground is one of the peninsula's, and it is standing in the air beyond the drawn
   cliff edge: the same thing the island's gulls did, on ground that is not this job's.)
2. `selemis-strand` - the other way: a traveler on the sand, the wrack at his feet, and the cliffs of
   the Ascarth tip standing right across the water with a tamarisk on one hand and maquis on the other.
   This is how close the peninsula is.
3. `selemis-hollow` - **where the city would stand, from the air.** The whole amphitheatre: strand,
   shelf, both beds converging on the bay, pines in the foreground, both heads, and the tip and the
   channel beyond.
4. `selemis-heads` - headland to headland from over the east head: the strand curving round to the
   west head's low point, the west hill and its pines behind, and the peninsula's cliffs across the
   north-western gate.
5. `selemis-channel` - the Nocveth from the island's own cliff top: sixty metres of water and the
   peninsula's cliffs on the far side with rock at their foot.
6. `selemis-south-cliffs` - the ocean face from over the water: thirteen metres of pale stone, the
   high hill and its outcrops behind the top of it, boulders at the foot, and a sea-plunger in the air.
7. `selemis-winter-bed` - a bed looked down from its head: washed stones running down a shallow pale
   swale between straw grass and scrub to the strand, pines leaning on one side.

**Two things in them that are not right and were left:**

- **Two stones show on the face of the south cliff.** Scatter is kept five metres back from a cliff
  edge, as the peninsula's is, and the drawn cliff top begins up to ten metres back; so a stone six
  metres from the edge sits on ground a traveler walks on and a little off the ground that is drawn.
  The gulls were moved because a bird in the air is a lie; a stone on a cliff face is not much of one.
- **The cliff tops are sand-coloured for their first few metres**, because the shore's sand tint is
  applied to every shore before the cliff exception is (found on the way, 3).

**How long the game takes to reach its first view**, as the coordinator asked. Stamped from the moment
`scripts/launch.cjs` was started to the first captured view's line on its output - which is Electron
starting, the page loading (the page load is `createWorld`), and the 120 frames the review waits
before it photographs:

| run | launch to the first rendered view | whole run |
| --- | --- | --- |
| first, seven views | **161.0 s** | 220.6 s |
| second, seven views | **247.1 s** | 333.5 s |
| third, one view | not stamped (the first line was lost to a `tail`) | 297.1 s |

After the first view each further one took 8-12 s. The machine was running the coordinator's sweep,
three test files at a time, through all three; the second and third runs had the heavier of it. So a
player on this machine, on this base, waits between two and a half and four minutes for a world.
Nothing was investigated or changed, as instructed.

---

## Found on the way, and not the island's

For the coordinator. None of these was changed.

1. **`tests/southwest-world.test.js` fails 6 of 34 on the base**, and the same six on this branch with
   the same messages (run side by side): four are region ids (it expects 32-44, the merge made them
   39-51), one is the world box (`minX is -4610.001927939127`), one is "East Ibenwood is built and
   shares an edge with this block". It is not on the brief's known-failing list. The one test in that
   file I touched - the ground-tint guard - passes.
2. **`WINDOW.minQ` is two columns short of the lattice** since the Ibenwood belt moved the western
   edge (above). Harmless; the generated file is identical either way.
3. **`groundTint` applies the shore's sand twice, and the peninsula's `sand: 0` has never held.** The
   Ascarth commit (`43b5964`) added the line that scales the sand tint by `cliff.sand` and left the
   original unconditional line above it. So every shore in the world gets the sand lerp twice, and on
   a cliff top the first one still paints sand whatever the second is told. The stone on the face is
   unaffected (it is laid over both). Removing the first line would change the colour of every beach
   in the world slightly, so it is the user's or the coordinator's; the island's cliff tops are drawn
   with it as it stands.
4. **`src/world/scenery/undergrowth.js` still carries Trogo's pre-merge id.** `THICKETS` is
   `new Set([44, 'Trogo'])`; Trogo is 51 now and 44 is the West Meroshe Desert. Measured: all 80
   samples of the West Meroshe are treated as thicket country and none is refused a step, because
   `trogoWay` answers 1 outside Trogo. Harmless today, and a trap.
5. **Mid-channel is open country, and so has the default sky.** The shore fringe gives each shore's
   name 26 m of water and the channel is 60 m wide, so the middle of it - 21 m at the west pinch - is
   nobody's and takes `DEFAULT_SKY`. A swimmer's sky blends to the default and back in the middle of
   the crossing. That is the fringe's own behaviour on every coast; here both shores have the same
   sky, so it is the one place it shows.
6. **The region card will say "Selemi".** A region's name on the card, the minimap and the chart is
   its atlas key, and the game has no display name separate from it (Iscare shows "Iscare
   Archipeligo", the atlas's misspelling, the same way). The peninsula's own texts say "Selemi across
   the channel" for the same reason. Open, below.
7. **Three tests want their own country to be the last thing in a list, and only one of them still
   can.** `south-oremindi-metadata` and `yunethre-world` each assert that their country is the last
   region; both are red on the base, where Trogo is last, and every country added changes the name in
   their message. `ibenwood-metadata` asserts that nothing but the Ibenwood's chart areas follows
   `long-pasture` in `SUBREGIONS`; it is green on the base because every other country's areas are
   ahead of Peblos's in that list, and **a builder who appends to the end of it - as I did - turns it
   red.** It is not on the brief's list of tests to run when a region is registered, and it belongs
   there.
8. **`rena` is red on the base**: the chart area `ambron`, in Elagos, has a radius of 155 against the
   chart law's 130, and that law's loop stops there, so it holds nothing for any area after it in the
   list.

---

## Open decisions for the user

1. **Should the channel be swum?** As built and under the rule as it stands, a first-day swimmer
   crosses either way and arrives with 62-100 health depending on the route. It is the only way on or
   off the island. The lore gives a fleet a crossing and denies an army a ford and says nothing about
   one swimmer. Denying it needs a rule, not a shoreline (above).
2. **Where the city stands** is not decided here, only measured: the strand and the hollow behind it,
   headland to headland.
3. **The two names**, the Seloca and the Nocveth. Both are the Selemi lexicon's own words; both stand
   on the game's earlier derivation of that tongue from the `tennoca` profile. The fall-backs are "the
   harbour bay" and "the channel".
4. **Hills on grassland hexes.** Built as grass hills of 21-28 m and the lore adjusted to "low grass
   hills". The alternatives are lower swells, or painting a hex `hills` in the World Builder.
5. **A cliff on every shore but the harbour's**, and the tilt toward the open sea: the lore is silent.
6. **No spring.** Two dry winter beds and no permanent water at all.
7. **A land animal.** A hare range is measured and passes at three places; none was added.
8. **A second albatross**, at the southern mouth of the sea it is named for.
9. **"The channel's northern end"** in the lore has no counterpart on the atlas. Which mouth?
10. **The name on the card**: "Selemi" (the atlas's key) or "Selemis".
11. **Should Selemi's cliffs, and the peninsula's, be climbing terrain?** Today a traveler walks
    straight up them.
12. **A `REGION_DESIGN` row** for the island (control, threats, role) does not exist; the Coalition
    member does.
