# Brief: build East Suval and Elod, the city that will not let the war in

East Suval is already in the game as a **shut gate and nothing behind it**: Elod's border post on
the stone road (`src/closed-border.js`, `tests/closed-border.test.js`, `tests/elodi-guard.test.js`,
the chart areas `suval-border-post`, `waystation`, `elod` in `src/map-fog.js`, and the honest
`edge` entry in `src/build-status.js`). Your job is to build what is behind it: the stone country of
East Suval and the Elodi city of **Elod**.

**The closed border stays closed.** It is a deliberate feature of Chapters 1–2 — the traveler walks
the stone road, is turned back by a guard in light black armour, and learns that there is a country
here that wants no part of this war. Do not open it for the main quest. Build the region so that it
can be entered later (developer travel point, and one lore-honest way in that the lead can switch on
— see "Getting in" below), and keep every existing closed-border test passing.

## Lean on the lore

It is at `../world-builder/azhora_lore` (read-only, outside this repo). Read all of:

- `geography/regions/svaleen.md` — the peninsula the mainland calls **Suval**: a blade of land into
  the Iberos Sea, pale limestone ridges, thin soil, scrub and aromatic plants, terraces where slope
  and water permit. **The east coast faces open water**: stronger current, worse weather, and fishing
  settlements with a harder character than the western cities. That is your coast. The Confederation
  (Solis, Enebreum, Imlamdris) and its lighthouses, weights and Conclave are the political water
  Elod swims in — and mostly declines to swim in.
- `geography/regions/iberos_coast.md` — "The Elodi city of Elod is at the peninsula's southern tip."
- `culture/azhoran_religions.md` — **the Elodi**, and read this closely, it is the heart of the
  region. They do not deny other powers exist; they deny those powers have legitimate authority. One
  sovereign authority, approached through the name **Balog**, with careful theologians distinguishing
  Balog the eternal authority, Balog the enthroned office of the Old Kingdom, and Balog the human
  bearer of that office. Elsewhere the Elodi are a tolerated, sometimes persecuted minority (shrines
  vandalised in Solis, Nylon, Aevis, Minora). **In Elod itself they are the power**: public sacrifice
  to non-Elodi gods is forbidden inside the inner districts around **the Threshold**; foreign
  merchants may keep household images in the **harbour quarter** but may not process with them, ring
  bells for them, or pour libations in the street. Old records describe campaigns against syncretic
  Elodi households as "corrections". Elodi women seek Mithalenna's aid in childbirth and Elodi
  priests condemn it — one of the bitterest disputes in their own life. Line 291: "Elod, at the
  southern tip, remains the exception within the peninsula: outwardly cooperative, internally
  exclusive, and religiously tense with its neighbours." Build exactly that city.
- `fauna/azhoran_fauna_overview.md` on the Elodi ceremonial accounts of birds as travellers between
  this world and "the part of the world that waits", and `geography/continents/northern_continent.md`
  on the Elodi geography of the east: three connected continents and the Old Kingdom at their centre.
  The Elodi are the only people in Azhora who claim to know what is across the sea. In Elod that is
  not a curiosity, it is why the city faces east.
- `docs/the-war-and-the-house-of-ambron.md` **in this repo** is the user's own history and wins over
  anything older. The relevant line: in 976 Ambron and its coalition declared war on Solis, and
  **Lamdris in South Suval and East Suval stayed neutral rather than be destroyed with it**. Elod's
  neutrality is three years old, expensive, and contested inside the city.

Everything you invent must sit on what the lore says. Where it is silent, invent in its voice and
say so in your report.

## What to build

- **The region.** `'East Suval'` is already in `PLAYABLE_REGIONS` (id 4) with a `stone-hills` biome
  in `src/region-layout.js`. Give it the country the lore describes: limestone ridges and grey rock,
  thin scrub, aromatic low plants, dry terraces, stone field walls, cisterns, and an exposed east
  coast with harder weather than the west. Read its hexes from `assets/azhora-dev-regions.json`;
  the coastline and extent come from the atlas, not from invention. Report any `WORLD_BOUNDS` growth.
- **Elod**, the city, around chart coordinates (-50, 635). Three zones that the player can feel
  the difference between without being told:
  1. **The harbour quarter** — the only part a foreigner is free in. Quays on a hard coast, a
     breakwater that earns its keep, fish and salt, foreign factors and their household images kept
     indoors, a hostel for outsiders, and the one place in Elod where other gods are tolerated
     because trade requires it.
  2. **The inner districts and the Threshold** — the city's heart, walled or gated off, where
     public offering to any other power is forbidden. The Threshold itself should be the strongest
     piece of architecture in the region: oriented east, austere, no image of Balog anywhere (decide
     and justify whether Elodi practice permits images at all — the lore does not say, so choose and
     write it down). A warden at the gate who turns the traveler back politely and absolutely; a way
     to be admitted later that costs something.
  3. **The ordinary city** — houses, cisterns, a grain store, schools where scribes are trained,
     because the lore says the Elodi are valued abroad as reliable scribes and merchants.
- **People**: fifteen to twenty-five with ambient lines. A priest who is precise rather than
  fanatical; a theologian who will explain the three senses of Balog to anyone who stands still; a
  harbourmaster who deals with foreigners all day and has views; a foreign factor who has lived here
  twenty years and still may not ring a bell; a woman who went to Mithalenna in childbirth and will
  not say so in front of the priest; a Confederation delegate who attends the Conclave for the
  lighthouses and nothing else; refugees or exiles from Solis's burning who were taken in at the
  harbour and not past the inner gate. Neutrality is the argument everyone in this city is having:
  some think it is piety, some think it is cowardice, some think Wilhelm — who worships **Nanvir,
  the man-eating god**, and who burned a holy city in Isareos — will come here next and neutrality
  will not save them.
- **The border, from the inside.** The gate the player was turned away from should be visible from
  the other side, with the ditch, the guards in light black armour, and their own reasons. Keep
  `src/closed-border.js`'s behaviour intact.
- **The road and the coast**: three or four more places with discovery text — the roofless waystation
  is already charted at (-274, 560) and could gain a keeper; a fishing settlement on the exposed east
  coast; a terraced valley or a cistern village inland; a lighthouse the Confederation allocates to
  Elod and Elod maintains scrupulously because it is the one obligation it accepts.
- **The chart**: add East Suval's named ground to `SUBREGIONS` in `src/map-fog.js` (areas must not
  overlap; `tests/map-fog.test.js` checks it) and update `src/build-status.js` honestly.

## Getting in

The gate stays shut for Chapters 1–2. Provide:
1. A developer travel point (`src/developer-mode.js`, `src/developer-atlas.js`) plus a testing-panel
   button, as the other regions have.
2. One lore-honest route the lead can enable later — the obvious candidate is **by sea into the
   harbour quarter**, since Elod tolerates foreigners at the quay and nowhere else, and the game
   already has a ferryman and a pier (`src/ferry.js`). Build the quay and the arrival point; leave
   the passage itself stubbed and say exactly what the lead must wire up.

## Rules

- Work only in your worktree (`../azhora-game-suval`, branch `east-suval`). Three other agents are
  building **Elagos**, **West Izol** and **Drent depth** at the same time and the lead is working on
  main: keep edits to shared registries (`PLAYABLE_REGIONS`, `REGION_IDS`, `REGION_TERRAIN`,
  `REGION_TEXT`, `REGION_BIOMES`, `scripts/build-region-survey.mjs`, `package.json`'s test list,
  `src/world.js`, `src/main.js`) as small and local as you can. Put your work in new modules with one
  call from the world builder and one hook in `src/main.js`.
- `src/main.js`, `index.html` and others are CRLF with very long lines: never reformat, patch by
  exact anchors with a Python script that asserts each anchor occurs once and writes nothing if one
  fails.
- Performance: Elod must not cost more in draw calls than Solis (about 95 at its gate). Merge static
  scenery into vertex-coloured batches as `src/west-suval-world.js` and `src/peblos-scenery.js` do,
  instance the scatter, keep shadow casters down. Measure and report.
- `npm test` stays green — including every existing closed-border and Elodi-guard test. Add tests for
  the region (membership, outline, water where the atlas says water), the city (quay walkable, stands
  standable and reachable, the inner gate actually refuses), the chart entries and the people. Run
  `npm run test:game` and `npm run test:road` once each at the end. Do **not** run
  `npm run test:autoplay`.
- Check your work by eye with headless review screenshots (see `docs/world-scale-report.md`) of the
  harbour, the inner gate, the Threshold and the city from the sea. Delete scratch pages.
- Commit in milestones. Write `docs/east-suval-report.md`: what the lore gave you, what you invented
  and why (especially anything about Elodi practice the lore leaves open), coordinates, files
  touched, test and smoke results, what is stubbed, and what the lead must resolve on merge.
