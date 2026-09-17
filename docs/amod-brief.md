# Brief: build Amod, the terrace country — and the ogre on the Pueth road

Amod is the next region, entered **from western Pueth into eastern Amod**. The atlas agrees: on
`assets/azhora-dev-regions.json` Amod's eastern hexes `(11,99)`, `(10,100)` and `(9,101)` sit on
Pueth's western edge, so the border is three hexes wide and already drawn for you. Amod also touches
Elagos to the south-west, which another agent is building — stay out of that seam.

## Lean on the lore

`../world-builder/azhora_lore` (read-only, never write there). Read **all** of
`geography/regions/amod.md`; it is unusually complete and it is your design document. The things
that must survive into the game:

- **Foothill country**, not mountains: descending ridges south of the Lotharn, each throwing a valley
  southward, each valley carrying a stream, **every stream made to work**. Terraces are the country's
  visible human mark — long stone ribs following contour lines, patched and rebuilt by the same
  families for generations. Chestnut, oak, beech and walnut above; orchards, vines, pulses and goats
  below.
- **The east end is yours**: "drier, stonier, and more open, with pale grasses between terrace walls
  and villages built around springs." That is the country the player walks into from Pueth. Build the
  wetter, greener west as background, not as content.
- **Water is the law.** "Land can be inherited, bought, married into, or abandoned. Water must be
  remembered correctly." Every stream system has a **water court**; its memory lives partly in
  writing and partly in **measure-keepers**, specialists who know a channel's seasonal behaviour by
  inspection and whose testimony can override a written record. The dialect has water-measure words
  for *water that cuts*, *water that seeps*, *water that can be trusted overnight*, *water that looks
  abundant but vanishes into gravel*. Put those words in people's mouths.
- **The Terrace Compact**: a federation of valley councils, water courts and pass authorities, eight
  centuries old, with no crown. Anyone whose field, spring, mill, herd, road or terrace wall is
  affected has standing to be heard, and a decision made without hearing them is unenforceable in
  practice. Ambron has learned more than once that it cannot simply administer this place; the usual
  settlement is negotiated tribute that leaves the Compact nominally intact.
- **Towns**: **Mavren**, the terraced capital at the meeting of three valleys — "where the ledgers
  meet", not a seat of rule. **Ostel**, the eastern dry-slope town of stonecutters and hard white
  wine that outsiders pretend to enjoy before learning to actually enjoy it — **this is your gateway
  town**, the first place the player reaches from Pueth. **Kelmod** (west road, timber, chestnuts,
  mules), **Sareth-am-Vel** (the pass descent), **Tir Amel** (spring villages sharing one water
  court) as names on signs and in talk. Towns sit on shoulders above valley floors, are stone-built
  and vertically organised — animals and storage below, households above, drying lofts under steep
  roofs — and their streets follow contour, not compass.
- **Culture**: maintenance is the virtue. **Keeping grade** — the right slope, neither too steep nor
  too flat — is both an irrigation term and the word for a trustworthy person: "they hold grade in
  weather." Hospitality is practical and exact: a guest is fed, dried and put near heat, and asked
  where they are going only afterwards. A guest who helps with an obvious task unasked is remembered
  well; a guest who admires the view while standing beside a broken retaining wall has misunderstood
  the situation. **The dead are buried above the villages, never below** — ancestors should be
  uphill, looking down the watercourse, seeing what is being neglected. Small offerings go to
  springs, culverts, terrace walls and pass stones: a sprig of herb in a water gate, the first
  chestnuts at a spring, a cup of wine on a repaired wall.
- The saying: ***A wall remembers every winter.***

Also read `docs/the-war-and-the-house-of-ambron.md` in this repo — the user's own history, which
overrides anything older. Amod is not a theatre of this war; it is a country watching one happen
next door, with an Ambronite representative in Mavren whose presence is "noted and adjusted for".

Where the lore is silent, invent in its voice and say so in your report.

## What to build

- **The region.** Add `'Amod'` to `PLAYABLE_REGIONS` with its own biome, terrain profile and region
  card, regenerate `src/region-survey.js`, take the id the registry gives you, and report any
  `WORLD_BOUNDS` growth. Terrain from the atlas: hills, grassland and mountain. The reads to copy
  are `src/pueth-world.js` + `src/pueth-scenery.js` (a neighbouring land region) and
  `src/west-suval-world.js`.
- **Terraces as terrain, not props.** The single thing that will make this region recognisable is
  stone terrace ribs following the contours across the hillsides, with the channels, gates and
  springhouses that serve them. Get that right before anything else and the rest is decoration.
- **Ostel**, the gateway town: stonecutters' yards and half-worked blocks, a press and cellars for
  the hard white wine, a spring and a water court's meeting room, a road house that takes tolls off
  the Pueth road, houses stacked up the shoulder. Fifteen to twenty-five people with ambient lines:
  a measure-keeper, a stonecutter with an opinion about Pueth's masonry, a road-house keeper, a
  toll accountant, a widow maintaining a wall, mule drivers, a bored Ambronite clerk who is treated
  with immaculate politeness and told nothing.
- **The border and the road** from Pueth: pass stones with offerings on them, a culvert somebody is
  clearing, the first terrace the player sees, and a view back down into Pueth.
- **Two or three more places** with discovery text — a spring village, a burial terrace above a
  village, a water gate with a dispute attached.
- **The chart**: add Amod's named ground to `SUBREGIONS` in `src/map-fog.js` (areas must not
  overlap; `tests/map-fog.test.js` checks) and an honest `BUILD_STATUS` entry in
  `src/build-status.js`.

## The ogre

On the border between Amod and Pueth stands an **ogre**. This is the user's request and the most
important single piece of the build, because it is also a **test of the combat system**.

- **Three times the player's size.** Not a big goblin — a different order of creature. Model him so
  the scale reads at a distance and reads worse up close.
- **He talks.** He is a character, not a spawn: he holds the road, he takes a toll, and the pass
  families have paid it for two generations because it is cheaper than the alternative. (Amod's
  economy runs on pass tolls administered by road houses and pass families — an ogre who has set
  himself up as his own toll authority is the joke the country would actually make, and the water
  courts have probably tried to serve him a judgement.) Give him an opinion about Amodians, about
  Pueth, and about how many people have tried this.
- **One dialogue option is to challenge him to a fight**, and it must be clearly marked as the
  dangerous choice. Everything else — paying, talking, walking away — leaves him peaceable. This is
  optional content beside a level-1-to-2 road, and the player must be able to decline forever.
- **He should very probably kill you.** The player has 100 HP and heals with food; the existing
  bestiary is `ENEMY_KINDS` in `src/combat.js` (goblin: 75 HP, 17 damage, 0.94s tell; wolf: 14
  damage, fast; soldier: 16 damage). The player's three-swing combo does 24/26/34 with a 2.35–2.65 m
  reach and a 3.05 m dodge.
  Build the ogre as a new enemy kind with its own numbers, and expect to extend `src/combat.js` to
  support what he needs. Aim for roughly:
  - **damage 45–55** — two connected blows kill, and the third swing of a combo is never worth
    trading for one;
  - **500–700 HP**, so the fight is long and the player must land twenty-odd clean swings;
  - **reach 4–5 m and a wide arc**, so backing up is not a defence and dodging must be sideways and
    timed;
  - **a long tell (1.1–1.3 s) but a fast attack**, so he is readable and still punishing — the fight
    should be lost to greed, not to surprise;
  - **no stagger**: hitting him does not interrupt him, which is the single biggest change from
    every fight in the game so far;
  - **a slow walk but a committed lunge** that closes more ground than the player expects.
  These are a starting point, not a specification. **Tune it by playing it** and report the numbers
  you landed on, what killed you, and how many attempts an unskilled player would need. The user
  wants to feel how hard this system can get and what needs tweaking, so your report on the fight's
  feel matters as much as the code.
- Defeating him should be worth something in the region's terms — the road house stops paying, a
  water court records the judgement it could never enforce — and losing must be survivable in the
  ordinary way the game handles defeat (check `src/combat.js`'s retreat and checkpoint handling and
  keep it).
- **Tests**: the ogre's numbers, that he is peaceable unless challenged, that the challenge is
  reachable only through dialogue, that a scripted perfect player can win and a scripted greedy one
  dies. Do not make the encounter a scripted loss — it must be winnable.

## Rules

- Work only in your worktree (`../azhora-game-amod`, branch `amod`). Four other agents are building
  **Elagos**, **West Izol**, **East Suval** and **Drent depth** at the same time, and the lead is
  working on main. Keep edits to shared registries (`PLAYABLE_REGIONS`, `REGION_IDS`,
  `REGION_TERRAIN`, `REGION_TEXT`, `REGION_BIOMES`, `scripts/build-region-survey.mjs`,
  `package.json`'s test list, `src/world.js`, `src/main.js`) as small and local as you can. Put your
  work in new modules with one call from the world builder and one hook in `src/main.js`.
  `src/combat.js` is shared and is being touched by nobody else — but keep your changes additive:
  a new enemy kind and the mechanics it needs, not a rewrite.
- `src/main.js`, `index.html` and others are CRLF with very long lines: never reformat, patch by
  exact anchors with a Python script that asserts each anchor occurs once and writes nothing if one
  fails.
- Performance: Ostel must not cost more in draw calls than Solis (about 95 at its gate). Merge static
  scenery into vertex-coloured batches as `src/west-suval-world.js` and `src/peblos-scenery.js` do,
  instance the terraces and the scatter, keep shadow casters down. Measure and report.
- `npm test` stays green. Add tests for the region, the town, the chart entries, the people and the
  ogre. Run `npm run test:game` and `npm run test:road` once each at the end. Do **not** run
  `npm run test:autoplay`.
- Check your work by eye with headless review screenshots (see `docs/world-scale-report.md`): the
  terraces from the Pueth road, Ostel from below, and the ogre standing next to a person for scale.
  Delete scratch pages.
- Commit in milestones. Write `docs/amod-report.md`: what the lore gave you, what you invented and
  why, coordinates, files touched, test and smoke results, the ogre's final numbers and how the
  fight feels, what is stubbed, and what the lead must resolve on merge.
