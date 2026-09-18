# East Suval and Elod: what was built

Branch `east-suval`, worktree `../azhora-game-suval`. The brief is
`docs/east-suval-brief.md`.

East Suval was a shut gate and nothing behind it. It now has a country behind
it: twenty-three hexes of pale limestone, the Elodi city of **Elod** on its rock
above the eastern sea, four places out along the coast and the dry valleys, and
twenty-six people with something to say. **The border is still shut.** Every
existing closed-border and Elodi-guard test passes untouched, the region is
still `edge` on the developer's chart, and the only ways in are the F8 tools.

---

## What the lore gave, and what was invented

### Given, and followed exactly

| From | What it decided here |
| --- | --- |
| `geography/regions/svaleen.md` | Pale limestone ridges, thin soil, scrub and aromatic plants, terraces "where the slope and the water permit". The **east coast faces open water**, with worse weather and harder settlements than the west — so Sorrow Beach has no quay and Elod has a breakwater. The Confederation keeps **lighthouses and weights** and meets in the **Conclave**; Elod observes the weights, keeps its lighthouse, and does not attend. |
| `geography/regions/iberos_coast.md` | "The Elodi city of Elod is at the peninsula's southern tip." |
| `culture/azhoran_religions.md` | The whole religious shape: one sovereign authority approached as **Balog**, in three senses (eternal authority / enthroned office of the Old Kingdom / human bearer) — the theologian's speech is those three and nothing else. Public sacrifice to other powers forbidden **inside the inner districts around the Threshold**; foreign merchants may keep household images **in the harbour quarter** but may not process with them, ring bells for them, or pour libations in the street — that is the Sea Gate's rule, said aloud by its keeper and by the factor who has lived under it for twenty-one years. The old "corrections" against syncretic households, which the priest has read and will not tear out. **Mithalenna in childbirth**, condemned by the priests — Tirzah Vane's fourth line, and the priest's fourth line, which never quite meet. Shrines vandalised in Solis, Nylon, Aevis, Minora — the scribe-master's warning to his pupils. Elodi valued abroad as reliable scribes and merchants — the writing school. |
| `fauna/azhoran_fauna_overview.md` | Birds as travellers to "the part of the world that waits", and a clergy that has declined for four hundred years to say whether that is geography or not. Kesseth Vane, reader of the eastern hours. |
| `geography/continents/northern_continent.md` | Three connected continents with the Old Kingdom at their centre; the Elodi are the only people in Azhora who claim to know. That is why the Threshold faces east. |
| `docs/the-war-and-the-house-of-ambron.md` | 976: Ambron and its coalition declare war on Solis; **Lamdris and East Suval stay neutral rather than be destroyed with it**. 977: Wilhelm storms and burns Solis. 980: he razes the holy city in Isareos and kills Cedric. So Elod's neutrality is **three years old, expensive and contested**, its hostel holds people off the Solis road, and Joram Vash thinks the man who worships Nanvir will not be stopped by a shut gate. |
| `assets/azhora-dev-regions.json` | Every hex, the outline, the coast, and the terrain of each cell. Nothing about the region's shape was invented. |

### Invented, because the lore is silent

1. **Elodi practice makes no images.** The lore names the Threshold and never
   describes it. This build decided: **no image of Balog, and no image of any
   living thing, is made inside the inner districts.** The ornament is cut
   lettering and cut geometry. Reason: a theology whose whole content is that
   one authority is legitimate and the visible powers are not has no use for a
   likeness, and the alternative — a statue of Balog — would make the Elodi
   ordinary. Everything in `src/east-suval-world.js` obeys it; there is not one
   figure carved anywhere in Elod.
2. **What the Threshold *is*.** A walled court on a stone platform, open to the
   sky, entered from the west, with **one tall opening in its east wall and
   nothing in the opening**. Nobody passes it. It is the threshold, and it is
   why the thing has the name; the Elodi will tell you that Balog is not in the
   building. Its east wall is 10.4 m over a 2.2 m platform over the 15 m
   terrace — the tallest thing in the region, and deliberately the first thing
   seen from the water.
3. **What admission costs** (`ELOD_ADMISSION`). Nothing carried through that you
   would swear by, pray to or ask of; an Elodi householder who will answer for
   you **by name, in front of the priest**; and you stand where the warden puts
   you. The cost is the vouching, not a fee — an Elodi has to be willing to be
   answerable for a foreigner.
4. **Koleth names.** The lore gives "Koleth" as the Elodi language and the game
   already had *Captain Aveth Orun* on the frontier. The roster follows that
   sound: Orun, Sered, Telem, Immer, Vash, Nath, Rimon, Kessel, Baleth, Zohar.
5. **An Elodi says Ambron, not Empire.** "An empire is a claim, and we do not
   repeat other people's claims." This is invented but it falls straight out of
   the theology, and it sits inside the rule in
   `docs/the-war-and-the-house-of-ambron.md` that royalists say *Empire* for
   legitimacy and republicans say it with contempt. A test enforces it for every
   Elodi line; the two people of Solis are exempt.
6. **Names of places** the atlas does not name: **the Sea-Road Gate**, **the
   Sea Gate**, **the North Light**, **Sorrow Beach**, **Sevenwalls**, the
   shepherds' cistern. The purple-whelk dye yard is invented from the
   peninsula's Mediterranean model, and is Elod's one luxury export.
7. **Elod's water.** No river and no spring: every kerb in the city is cut to
   carry roof water to a cistern lid. That is not in the lore; it is what a city
   on a dry limestone rock has to be, and it gave the cistern keeper his line
   about thirst not being a god.

---

## Where it is

All coordinates are world metres (100 m per authored hex, north is -Z, the sea
is east). The chart's own Elod point, **(-50, 635)**, is where the branch road
ends and is the Sea-Road Gate.

| | Coordinates | Note |
| --- | --- | --- |
| Region extent | x -450 … 150, z 404 … 1039 | Unchanged. `WORLD_BOUNDS` did **not** grow. |
| The Sea-Road Gate | **(-50, 635)**, ground 16.4 m | The road's last vertex; shut, with wing walls. |
| The precinct (inner districts) | x -47 … -27, z 612 … 652 | Made ground, level **15 m** (`ELOD_TERRACE`). |
| The Inner Gate | **(-41, 612)** | In the precinct's north wall, onto the upper street. Shut. |
| The Threshold | **(-36, 633)**, 13 × 20 m | Platform 2.2 m, court wall 6.2 m, east wall 10.4 m → crown at **27.6 m**. |
| The Sea Gate | **(-21.5, 612)** | Passable. The rule, not the wall, is what stops at this line. |
| The quay | x -12.5 … -4, z 612 … 646, deck **4.8 m** | Along the waterline, wholly inside the region's outline. |
| The breakwater | (-2, 607) → (20, 643) | Rock, no deck, outside the outline; nobody walks it. |
| The sea landing (stubbed) | **(-7.5, 640)** on the deck | `ELOD_LANDING.ashore`, inside the outline on purpose. |
| The ordinary city | x -44 … -17, z 596 … 673 | Writing school, grain store, cisterns, the dye yard, six houses. |
| The harbour quarter | x -20 … -4, z 600 … 656 | Hostel, weights house, two factors' houses, net loft, salt store, gutting shed. |
| Behind the frontier gate | frontierPoint(24, 8) ≈ (-403, 495) | The serjeant; the beacon watch at frontierPoint(66, -4). |
| The North Light | **(-64, 540)** | 13.5 m tower on the northern point. |
| Sorrow Beach | **(84, 800)** | Four huts, three boats up the shingle, the name stone. |
| Sevenwalls | **(-205, 690)** | Four terraces, a covered cistern, an olive press. |
| The shepherds' cistern | **(-150, 850)** | With the fold, below the old ridge lookout. |

**Chart** (`src/map-fog.js`): East Suval had three named areas and now has eight.
`elod` shrank from r 70 to r 52 and was rewritten; new: `elod-harbour`,
`north-light`, `sorrow-beach`, `sevenwalls`, `suval-dry-hills`.

---

## Files touched

**New**

- `src/east-suval.js` — the region and the city as pure data: the three zones,
  every building, stand, cistern and street, the quay's deck function, the
  breakwater, the outlying places, the scatter rule, and the two stubs
  (`ELOD_SEA_ROUTE`, `ELOD_ADMISSION`).
- `src/east-suval-world.js` — the three.js scenery.
- `src/elod-people.js` — twenty-six people, their lines and their conversations.
- `tests/east-suval.test.js` — ten tests.
- `docs/east-suval-report.md` — this.

**Changed, and kept as small as they could be**

| File | Change |
| --- | --- |
| `src/region-world.js` | Added `ELOD_TERRACE` beside `COBBLE_TERRACE` and into `TERRAIN_PADS`; gave East Suval a `byTerrain.hills` profile (the southern ridges stand higher and barer); rewrote `REGION_TEXT['East Suval']` (spawn now the city, plus the new npcIds and landmarks); rewrote the `elod-gate` landmark's text. |
| `src/region-layout.js` | East Suval's biome gains `ownScatter: true`, a higher `rocksPerHex`, `undergrowth: 'aromatic-scrub'`, and a truthful note. |
| `src/world.js` | Import + one call to `createEastSuvalScenery`; Elod's quay in `heightAt`; the places, the stands and `eastSuvalMetrics`/`elodQuay`/`elodLanding` on the returned world. |
| `src/world-regions.js` | Deleted the old Elod placeholder (two piers, a lintel and three timber cottages). |
| `src/map-fog.js` | Five new areas, one rewritten. |
| `src/build-status.js` | East Suval's entry, still `edge`, now honest about what is behind the gate and what is shut. |
| `src/main.js` | Four small anchored patches: the import, `npcData.push`, one line in `conversation()`, and the testing-panel button — plus the `roadViews` entry `elod`, which pointed at **(-48, 360)** (open water in Peblos since the world rescale) and now points at Elod, with four more views beside it. |
| `index.html` | One testing-panel button. |
| `src/developer-mode.js` | The ghost-flight point for `suval` was **(-120, 340)**, also stale water; now (-56, 636). |
| `main.cjs` | Five view names added to the `--road-review` list. |
| `package.json` | `tests/east-suval.test.js` registered. |

Nothing was touched in `PLAYABLE_REGIONS`, `REGION_IDS`, `scripts/`, `src/closed-border.js`,
`src/frontier.js`, `src/frontier-works.js`, `src/town-life.js`, `src/characters.js`
or `src/signs.js`.

---

## The three zones, and how a player feels them without being told

- **The harbour quarter** is low, loud and mixed: a quayside with mooring rings
  and a derrick, a breakwater taking the weather, drying racks, a hostel, two
  factors' houses with their shutters shut and a lamp burning indoors. Ten of
  the city's people stand here and four of them are not Elodi.
- **The Sea Gate** is at the top of the steps, and its keeper recites the rule
  rather than refusing anybody: *below this arch you keep your own household;
  above it there is one authority.*
- **The ordinary city** is limewashed limestone with low slate roofs, blank to
  the street, courts behind, cisterns at every corner, a writing school with
  benches under an awning and a grain store on stone feet.
- **The inner districts** are up on a cut platform behind a blank wall, reached
  by one gate that is shut, with the Threshold's east wall standing over
  everything. Five people stand outside that gate and none inside it: the point
  of the place is that you talk to Elod at its door.

---

## Getting in

1. **Developer travel.** F8 → ghost view → East Suval flies to (-56, 636), the
   square outside the Sea-Road Gate. The region card's spawn is the same point,
   so `test-region-4` lands there too.
2. **The testing panel** gains **"Elod · East Suval, behind the gate"**, which
   sets the traveler down on the quay at `ELOD_LANDING.ashore` as if they had
   come in by sea.
3. **The sea route is stubbed** (`ELOD_SEA_ROUTE`, `built: false`). The quay,
   the landing stage, the mooring and the arrival point are built; the passage
   is not. See "what the lead must resolve".

---

## What it costs

Measured on the built world in Node by counting the geometry a camera's frustum
intersects, plus its shadow pass — the method `tests/regions-world.test.js`
uses, and the one that produces the brief's Solis figure. Camera at eye height,
12 m back, 54° field, 650 m far plane.

| View | Draws | Triangles |
| --- | --- | --- |
| **Solis, the Gate of Sun Horses** | **247** | 388 k |
| Solis, the market square | 237 | 393 k |
| Lumber Town square | 404 | 666 k |
| Cobble quay (Peblos) | 129 | 90 k |
| **Elod, the Sea-Road Gate** | **201** | 237 k |
| **Elod, the Inner Gate** | **201** | 276 k |
| Elod, the quay | 353 | 459 k |
| Elod, the harbour street | 531 | 767 k |
| Elod, the ordinary city | 524 | 734 k |
| Behind the frontier gate | 301 | 350 k |
| Sevenwalls | 475 | 786 k |
| The dry hills | 337 | 502 k |
| The North Light | 188 | 208 k |
| Sorrow Beach | 80 | 147 k |

**At its gate Elod costs 201 draws against Solis's 247**, which is the
comparison the brief asked for. (The brief's "about 95 at its gate" for Solis
could not be reproduced by any method here — the nearest is the camera pass
alone at a narrower field — so both cities were measured the same way, in the
same run, and the ratio is what matters.) Standing *inside* the city looking along it
costs 524–531, which is Lumber Town's order of magnitude (404) and less than the
Drent road views; most of that is not Elod but the 650 m far plane picking up
other regions' batches down a 600 m coastline. The house palette was cut from
twenty-five tints to four walls and three roofs part-way through for exactly
this reason, which took about thirty draws off every view in the city and looks
the same.

The renderer's own count from the review run (1440 × 960, shadows, HUD, which
counts several passes and is not comparable with the table above), for scale
against the same run's baselines — Drent's `road-sign` 491, `reedwater` 500,
Luscia's `waymarker` 299:

| View | Draws | Triangles |
| --- | --- | --- |
| `elod` (from the road) | 644 | 374 k |
| `elod-quay` | 509 | 309 k |
| `elod-inner-gate` | 621 | 390 k |
| `elod-harbour` | 1 044 | 928 k |
| `elod-city` | 1 053 | 909 k |

Scene cost: **26 buildings**, 40 wall runs, **60 instanced scatter batches**
(rocks, scrub, tufts and trees, two hexes to a batch, so a camera on the quay
submits nothing of the southern hills), 840 rocks, 3 465 scrub cushions, 4 137
grass tufts, 127 olives and junipers, 13 runs of field wall. Colliders: the
built world carries **9 790**, of which **1 067** stand in East Suval — 334 of those are the sea wall (see below), 264 ridge rock, 127 trees,
107 city wall.

---

## By eye

Rendered through the game's own renderer with `node scripts/launch.cjs
--smoke-test --road-review`, which now includes five Elod viewpoints, saved to
`tests/artifacts/elod*.png`. What they changed:

- The first pass had the camera looking **west** at every viewpoint (the yaw
  convention is 0 = north, +π/2 = west), so all five shots were of empty hill.
  Fixed.
- The waterfront shots showed the camera being pulled inside buildings. That is
  the game's own camera collision (`src/main.js` pulls the camera in when a
  collider lies along the view ray) working against a tight stone city — the
  same thing happens in Solis's streets. Two views were re-aimed onto open
  ground; a sixth ("the city from the sea") was **removed**, because the sea
  wall now stands between the camera and the water and the shot is impossible
  from the player camera. **Use F8 ghost flight to look at the Threshold and at
  the city from the water.**
- What the shots confirmed: the harbour reads as a harbour (quay, rings,
  derrick, breakwater rock, the open sea beyond); the city reads as pale
  limestone with low slate roofs stepping down to turquoise water; the Sea-Road
  Gate's lintel and its three lines of cut Koleth read from the road; the region
  label and the chart areas name themselves correctly as the traveler moves.

---

## Tests and smokes

| | Result |
| --- | --- |
| `npm test` | **519 tests, 519 pass**, including the ten new ones in `tests/east-suval.test.js` and every existing test in `tests/closed-border.test.js` and `tests/elodi-guard.test.js`, untouched. |
| `npm run test:game` | **pass** — `smoke.json` `ok: true`, 1 741 frames, 436 draw calls, 875 k triangles, no errors. The 68 ms average frame was measured while this machine was also rendering review shots and is not a comparison with anything. |
| `npm run test:road` | see below |
| `npm run test:autoplay` | **not run**, as the brief instructs. |

The ten new tests cover: the region against the atlas (hex count, terrain mix,
outline, the hills being the southern end, no world growth); water where the
atlas says water and no walkable bar; the city's eighteen buildings not
overlapping and standing above the tide; the precinct being level made ground;
the quay standable end to end and wholly inside the outline; every one of the
twenty-one city stands standable, four metres apart and **reachable on foot from
the sea landing**; the Inner Gate actually refusing (the precinct and the
Threshold are unreachable, and nobody a traveler may speak to is shut inside);
the closed border still closed and both stubs honest; every place charted, in
its own region and carrying discovery text, with the eight chart areas not
sitting on top of one another; the twenty-six people, their lines, the
neutrality argument being had from three sides, the three senses of Balog, and
the Ambron-not-Empire rule; the warden's refusal and his terms; and the scatter
staying out of the built places.

---

## What is stubbed

1. **The sea passage.** `ELOD_SEA_ROUTE.built === false`. The quay, the steps,
   the landing stage, the mooring and the arrival point exist; no boat sails
   there, no fare is asked, and no boatman stands on the quay.
2. **Admission past the Inner Gate.** `ELOD_ADMISSION.granted === false`. The
   warden states three terms and there is no way in the game to meet them: no
   flag is set, no householder can be asked, nothing opens.
3. **No interiors, no trade, no quest.** Nobody in Elod sells anything, no door
   opens, and nothing here moves the main quest. Ambient conversation only.
4. **The waystation keeper.** The brief suggested the roofless waystation at
   (-274, 560) "could gain a keeper". It already has one — the regional-life
   shelter keeper, who has stood at (-271, 554) inside the closed region since
   the regional-life pass. Nothing was added there.
5. **The frontier's inside** gained two people and a discovery entry, and
   nothing else: the ditch, the gate, the guard house, the stable and the beacon
   are `src/frontier-works.js`'s, untouched.
6. **The outlying coast** is scenery and one keeper each. Sorrow Beach has no
   fishing, Sevenwalls no work, the dry hills no bandits (the campaign says the
   southern hills belong to `hill-bandit`; nothing was placed).

---

## What the lead must resolve on merge

1. **The coast of a closed region is a trap, and it is not new.** On East
   Suval's eastern side the authored land ends exactly where the hexes end, and
   the two smoothing passes in `region-world.js`'s coast field leave **one to
   three metres of standable beach outside the region's outline**.
   `closedRegionEntered` refuses a step from outside East Suval to inside it, and
   `src/main.js` resets the position on a refusal — so a traveler who walks down
   to the waterline out there is **stuck on the beach until they press F8**. This
   has never mattered, because nobody could get into the region. It matters now.
   - Elod's own waterfront is walled against it: `src/east-suval-world.js`
     builds a sea wall of 334 colliders from z 556 to 712, tracking the outline
     one metre inside it, with a visible rubble parapet every third stud. Inside
     that stretch nothing can be reached that is outside the region.
   - **The rest of the coast is not walled.** Sorrow Beach and the North Light
     have the same one-to-three-metre strip.
   - Two clean fixes, both yours to pick: drop `'East Suval'` from
     `CLOSED_REGIONS` at the moment a way in is switched on (the frontier wall
     and its guards still stand, and nothing else changes), **or** give
     `closedRegionEntered` a tolerance for a `from` point that is within a few
     metres of the region it is entering — but note that
     `tests/closed-border.test.js` probes from 2 m outside and expects a refusal,
     so that test would need its probe distance changed.
2. **Two stale coordinates were fixed in passing** and you should know, because
   they are in files other agents may also be editing: `roadViews.elod` in
   `src/main.js` and `points.suval` in `src/developer-mode.js` both pointed at
   open water in Peblos, left over from the 56 m → 100 m world rescale.
3. **`src/world-regions.js` lost its Elod placeholder.** If another branch has
   also touched that function, keep this branch's deletion — the placeholder's
   two piers and three timber cottages now stand inside the real city.
4. **`REGION_TEXT['East Suval'].spawn` moved** from `at(-214, 294)` (the Luscian
   side of the border post) to `(-56, 636)` (Elod's own square). Anything that
   used region 4's spawn to mean "the border post" now means "the city".
   `tests/regions-world.test.js` and the testing panel were checked and are fine.
5. **`REGION_TERRAIN['East Suval']` gained a `byTerrain.hills` profile.** The
   southern ridge hexes (all of them south of z = 700) rise from base 17 to base
   25. Nothing north of z = 700 moved, so the frontier, the waystation and Elod
   are unaffected — but if you are holding another branch that places anything in
   the southern hills, its ground is now up to eight metres higher.
6. **`main.cjs`'s `--road-review` list** grew by five view names. Trivial to
   merge, easy to lose.
7. **Elod needs a boatman** if you want the sea route. What to wire:
   `src/ferry.js` already carries a fare, a crossing and a two-sided landing.
   Elod's side is `ELOD_LANDING` in `src/east-suval.js` — `ashore` on the deck,
   `stand` for the boatman, `mooring` off the landing stage, all inside the
   outline so the closed border cannot bite. The honest departure is Cobble, not
   Tidehaven: Peblos already has a quay, a boat and a man who rows for copper.
   You will also want a reason the Elodi let the boat in, and the harbourmaster
   already asks the four questions that would be the scene.
