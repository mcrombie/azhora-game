# Mithala city handoff

Not a queue row: the user's own request of 4 October 2026, made after the Henborth delivery, during the pause on new
regions. It builds no region. It trades four hexes among the four Mithalas and builds the city of Mithala where all four
meet. The design and the measured site are in [`docs/mithala-city-brief.md`](../mithala-city-brief.md); the user's
answers are in `docs/design-answers.md` ("2026-10-04: The city of Mithala").

## Revision

| | |
| --- | --- |
| Base | `b5ff29a`, the Henborth delivery (on Ibenal, Alezhor, East Izol, Celder and `a2e49c3`) |
| Delivered | branch `mithala-city`: `3bef366` (the hex trade), `18e8636` (the pure layout), `01a64d6` (the Water Gate and the scenery interface), `1f5a12e` (world wiring, the curtain and its gates), `38812b8` (shared scenery parts), `c034746` (bridges, quay, gauge, buildings, sky tower, tests), then this report |

## Scope

**The trade** is a third game atlas correction, `mithala-city-quarters-v1` in `src/game-atlas-adjustments.js`: North
Mithala's 9,86 and 10,86 go to East Mithala, East Mithala's 5,88 and 6,88 go to North Mithala. It is not a World Builder
edit, because `tests/developer-atlas.test.js` holds every checkout's export to the authored map's sha256, and editing the
map would turn every game checkout red until each re-exported. If the user wants the World Builder map itself to show
the trade, it can be made there after this merges, and the correction then retires. Hexes per region are unchanged; the
Mithala's internal edges go from 49 to 47, and East and West Mithala now meet on one edge only, inside the city.

**The city** (the user's decisions, every recommendation taken): Mithala, the Cref king's old seat; four districts on the
four hexes round the meeting of the arms (the Fork in West Mithala, walled in grey Lotharn stone; the Braid Bank in North
Mithala; the Quays in East Mithala; the Ford in South Mithala), each on raised ground behind an earth flood bank; dark
brick, pale timber and reed thatch; a climbable sky tower of about 40 m; gates open; the king's hall shut; nobody in it
yet. People are stage 2.

**Lore**: a section on the city was added in place to `world-builder/azhora_lore/geography/regions/mithala.md`, uncommitted
there (the "Under the Alliance" section already in that file is another author's).

## What is built

**Files**: `src/mithala-city.js` (the pure layout and the made ground, the single source of truth), `src/mithala-city-parts.js`
(palette and drawing helpers), `src/mithala-city-scenery.js` (streets, curtain, gates, bridges, ford, quay, barges, gauge),
`src/mithala-city-buildings.js` (the 22 buildings and the sky tower), and tests `mithala-city`, `mithala-city-scenery`,
`mithala-city-buildings`, `mithala-city-world`, with routes `tests/routes/mithala-*.json` for `scripts/walk-route.mjs`.

**Wiring** (line-ending-preserving edits): the made ground is the `mithalaCityLayer` in `src/world-terrain.js`, with
`groundBeforeMithalaCity` for measuring; the `'Mithala city'` build step in `src/world.js` after the Mithala's own, which
lifts the countryside's scatter off the city and hands on the walking surfaces, streets, landmarks and metrics; the
Mithala wildlife kept off reserved ground in `src/west-regions-life.js`; the chart's four district outlines and its
"Royal seat" badge in `src/world-map-detail.js`; a chart area at the Ford (`src/map-fog.js`) that is also the travel
destination; texts that said the meeting was empty rewritten (`src/mithala-world.js`, `src/map-fog.js`,
`src/build-status.js`, `src/region-world.js`); five review views in `src/main.js`; the campaign's river-city named.

**The city**: four platforms at 14.5 m on a plain at about 12 m, behind 1.5 m earth flood banks with ten timber gates;
the Fork inside the Cref curtain (13 runs of grey ashlar, ten drum towers, five gates: the Horizon Gate's gatehouse,
three bridge gates and the Water Gate to the gauge); three bridges on piers with flood marks and walking decks; the
paved ford, waded; the Grain Quay with bollards, mooring posts and two barges alongside; the flood gauge and its steps;
22 buildings (the King's Hall's doors shut); the 40 m sky tower whose twelve-flight stair reaches an open top at 53.1 m.
About 231k vertices in 13 meshes. Made streets are no steeper than 0.279; the only steeper ground on a route is the
ford's own two banks within 2 m of the water, which the city does not touch.

**Builder choices to confirm or revise**: the Water Gate (the user left the gauge's access open; the recommendation was
taken); the city's chart area is 68 m round the Ford rather than the whole city, because a disc where four regions meet
cannot be 60 % inside any one of them; the barges lie against their mooring posts about 1.2-1.4 m off the quay's face;
two otter homes and one deer home moved off the city to the nearest open ground.

**Not built**: people (stage 2, the Empire arc's conversations); interiors; lanes from the streets to the garrison hall,
the threshing floor, the smithy and one Ford house (the platforms are open ground, so all are reachable).

## Evidence

| test | result |
| --- | --- |
| `mithala-city` | 11/11 |
| `mithala-city-scenery` | 8/8 |
| `mithala-city-buildings` | 6/6 |
| `mithala-city-world` (scoped world 28-31) | 11/11, no todo: every route walks, the bridges, quay and tower stair included; no scatter on the streets; no animal on the city |
| `mithala-world` | 14/14 |
| `map-fog`, `developer-atlas`, `world-map-detail`, `region-layout`, `cartography`, and every other test naming Mithala | pass |
| red before this work, same messages at `01a64d6` | `west-life`, `regional-wildlife`, `regions-world`, `open-country`, `ascarth-world`, `isareos-world`, `south-oremindi-metadata` |

## Performance

The startup profile is queued behind an interactive game session and will be added when it runs
(`tests/artifacts/startup-mithala-city.json`). The city's scenery is built as one step, `Mithala city`, after the
Mithala's own; its whole geometry is about 231k vertices in 13 merged meshes, under Nylon's 434k.

## Next action

Review and merge after the region queue (this branch stacks on `henborth`). If the user wants the World Builder map to
show the trade, make that edit after the merge and retire `mithala-city-quarters-v1`. Stage 2, the people, is the user's
to start.

