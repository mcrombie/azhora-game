# Henborth handoff

Queue row 7 of the [completion ledger](../regional-completion-ledger.md), delivered by Claude on 4 October 2026: terrain, water, vegetation and wildlife only. The builders' brief is [`docs/henborth-brief.md`](../henborth-brief.md).

**After this delivery the user has paused new building** to consider load time first. The measurements Claude reported are below under Performance.

## Revision

| | |
| --- | --- |
| Base | `ec6ec44`, the Ibenal delivery and its width-pin follow-up (on Alezhor, East Izol, Celder and `a2e49c3`) |
| Delivered | branch `henborth`: `9330c3e` (the build), then this report's commit |
| Worktree | `C:\Users\Michael\Programs\typescript\azhora-game-henborth`, clean after both commits apart from the ignored `tests/artifacts/` |
| Not done | Not merged, not pushed. Runtime ID 67 is provisional. |

The build was stopped once, near completion, for the user's assessment, and resumed on `ec6ec44`. The temporary commit is folded into `9330c3e`.

## Scope

| | Henborth |
| --- | --- |
| Runtime ID | 67 |
| Atlas | 27 hexes, all plains, all Dfa |
| Neighbours | North Celder 8, West Mithala 8, North Mithala 6 (built); Narcosh 9, Lesser Oremindi 6, North Oreminidi 6, Acor Wetlands 2, East Oremindi 1 (unbuilt) |
| Arrival (F8) | (-2400, -1700) |
| Landmarks / views | 12 / 8 (seven at walker's height, including `henborth-wildlife` at the frostback band, and one overview) |

**New files**: `src/content/regions/henborth/henborth-world.js`, `src/content/regions/henborth/henborth-scenery.js`, `src/content/regions/henborth/henborth-wildlife.js`, `tests/henborth-world.test.js`, `tests/henborth-life.test.js`, `docs/henborth-brief.md`, `docs/region-reviews/routes/henborth-ways.json`, this report.

**Registration and wiring** (small, line-ending-preserving edits):
- Registration: the survey generator and the regenerated survey; `src/world/terrain/region-layout.js`, `src/world/terrain/region-world.js`, `src/dev/tools/developer-atlas.js`, `src/dev/tools/build-status.js` (`environment`), `src/gameplay/skills/languages.js` (`mittoli`), `src/ui/map/map-fog.js`, `tests/test-manifest.json`.
- Wiring: `src/world/terrain/world-terrain.js` (the outermost layer and its `groundBefore`), `src/world.js` (the scenery step under its own label, `Henborth`), `src/main.js` (views; the `-wildlife` view frames a frostback).
- `src/content/regions/western-regions/west-regions-life.js` gains the three new animals' rigs, their pace rows and the marmot's burrow behaviour (+16 lines, by CR count).
- `tests/mithala-world.test.js` counts Henborth's edges: West Mithala 8, North Mithala 6.
- The world box does not move.

**What is built**

- *Ground*: one plain on all 27 hexes, on `outland`'s profile so no neighbour's blend moved.
  - It stands at 14.8 m along the Mithala's lines and rises 2.4 m toward the Oremindi and Narcosh. Interior means run 15.9-17.4 m.
  - Long low swells of about a metre either way, and low foothill knolls under the Oremindi (at most 1.7 m).
  - Away from the hollows and knolls, 19 metres in 20 slope less than 1 in 27.
- *Three ways toward the passes*, natural ground only, with nothing marking them:
  - **The main approach**: 170 m, climbing 2.6 m to Narcosh's highland.
  - **The eastern approach**: 138 m, with four short gullies down its flanks.
  - **The western spur**: 114 m, toward the gap in the Lesser Oremindi.

  Each line of travel is reserved 4 m either side (`HENBORTH_RESERVED`).
- *Damp hollows* with level floors:
  - **The cranberry bog** at (-2380, -1766), 2.2 m deep;
  - **a sedge hollow**;
  - **the middle hollow** at (-2505, -1618);
  - **a wet corner** opening downhill into the Acor Wetlands.
- *Two dry stony knolls*, 2.4 m and 2.0 m.
- *Colour* by place and lie, fading into the swatch within 12 m of every line. Trails of 640 m (carrying North Celder's way on from its line), 219 m and 312 m.
- *Scenery*: one seeded step-wise builder reading the ground's own cover, hollows, reserves, trails and landmarks. 25,532 instances in 87 batches, 181 colliders.

  | Kind | Count | What it is |
  | --- | ---: | --- |
  | Grass tufts | about 14,600 | prairie grass to the south, steppe sward to the north, meadow grass on hollow rims; sedge, rush and cotton grass in the bogs |
  | Flowers and herbs | 877 | angelica, meadowsweet, marsh cinquefoil, bogbean, roseroot |
  | Shrubs | 1,260 | dwarf birch, grey willow, crowberry, bilberry, creeping juniper, bog myrtle |
  | Ground cover | 1,338 | 159 sphagnum, 134 bog cranberry, 1,045 soil-lichen mats |
  | Stones | 339 | 64 of them boulders; 108 crusted with dye lichen |
  | Marmot burrow mounds | 8 | |
  | Trees | 76 | birch 29, juniper 21, poplar 10, thorn 9, willow 4, alder 3 |

  All the trees are typed and harvestable. Warm build steps run to a p99.9 of 2.1 ms, the slowest 4.0 ms.
- *Wildlife*: 13 bands, 38 animals, no stock. Each band has its own layout, and a test holds it against every same-species band in the west.
  - **Frostback buffalo**: a summer band of 6 cows and 3 calves on the southern grass (the lore's "northern summer circuit"), and 3 bulls apart.
  - **The black soar-bird**: the turkey-vulture stand-in.
  - **Upland hares**: 2 bands of 3.
  - **Road fox**: 2.
  - **Bog cranes** (new): 2 pairs, on the cranberry bog and the wet corner.
  - **Steppe marmots** (new): 6, with 8 holes, on the dry knoll. They sit up and watch inside 30 m, and at 12 m go down a hole that is not behind the traveller and come up at another.
  - **Willow grouse** (new): a covey of 5 in the north-west scrub.
  - **Harrier and mountain eagle**: 1 each.

**Not built** (owned): the pass-keepers and their markers, the summer camps, the cranberry, herb and dye-lichen gatherers, the Lond families' herds, and the pass roads.

**Builder choices to confirm or revise**

1. **A trough along North Celder's line.** North Celder's frozen feather drops its 17-23 m plain to the old ground at the line (7-13 m). Holding the line keeps that, so a trough averaging 3.4 m deep (up to 8.6 m) runs along all eight edges, and Henborth climbs out of it over 70 m. Removing it needs a change on North Celder's side: its feather on the Henborth edges.
2. **The ways ease down at the mountain foot.** The unbuilt ranges stand lower than the plain (about 11.5 m, give or take 6), so the mountain margin and the ways' last few dozen metres ease down to them. This is provisional: the lines are read live, and the ways will climb once the ranges are built. Their builder must hold or meet, as here.
3. The lore's pass names stay off the chart; no flats are kept, since the lore places no camp; foothills under the Oremindi match Celder's; default sky.
4. **New animals**: the bog crane (drawn on the heron frame), the steppe marmot and the willow grouse. The user has welcomed new animals; their names are open.
5. **The bulls band** reads the lore's "by age, sex, and route behavior". Hares, harrier, the fox and the eagle are extensions.
6. **Left out**:
   - the hunt-hounds, the grass-lion and the north wolf (the ambient animal system cannot show predator behaviour truthfully);
   - the hill elk (Ganoss country, not a neighbour on the atlas);
   - the Lond stock (owned).
7. **Plants**: the lore never names its *vel-henb* herbs; poplars stand in for aspen; the wet mountain foot has its own habitat (flush); walked trails are trodden, thinner grass.

**Lore.** Henborth's geography contradicted the atlas. The lore put it between the Lond plateau and the tundra, cold and short-seasoned; the atlas puts it north of the Celder and Mithala plains under the Oremindi and Narcosh, Dfa, with Lond about 2.5 km to its north-east. The ground builder rewrote 16 phrases on 12 lines of `henborth.md` in place. The user then had those edits reviewed and committed, with the other seven regions' lore edits, as World Builder `a4b52ee` ("Fit eight regions' lore to the atlas"). The life builder's quotes follow the rewritten text.

## Border contract

`node scripts/region-evidence.mjs ../azhora-game-ibenal "Henborth" --strip`:

| Border | Edges | Worst step across the line (0.5 m apart) | Base there | Worst on the base |
| --- | ---: | --- | ---: | ---: |
| Henborth, North Celder (built) | 8 | -0.81 m at (-2461.6, -1392.2), ground 12.5 | -0.82 m | 0.82 m |
| Henborth, West Mithala (built) | 8 | -0.32 m at (-2348.3, -1559.7), ground 17.3 | 1.62 m | 4.78 m |
| Henborth, North Mithala (built) | 6 | -0.16 m at (-2000.3, -1933.8), ground 16.2 | 3.29 m | 3.45 m |
| Henborth, unbuilt ranges and wetlands | 24 | -0.53 m at (-2049.7, -2020.4), ground 12.9 | -0.02 m | 7.38 m |

- **North Celder is held**: within 0.15 m of its line Henborth answers exactly the ground it was handed, and North Celder's frozen seam meets it. North Celder's ground is bit-for-bit the base's at 25,318 points, and identical whichever country is asked first (a two-process test).
- **The builder's seam tests** read every line at 5 cm probes under 0.002 m; the worst corner is 0.15 m, at the North Celder / West Mithala / Henborth corner. Neighbours are unchanged at 33,896 more points.
- **The 46 m strips** (58,932 one-metre points): 18 new steep steps, none steeper than the base, 431 as on the base. The 18 lie within 3 m of the held North Celder line at its West Mithala corner, or within 2 m of the Acor line by the North Mithala corner: the neighbours' own uneven ground, met exactly.

## Journey

`node scripts/walk-route.mjs docs/region-reviews/routes/henborth-ways.json 67,62,29,31` (the strict walker). It runs on a scoped world of Henborth, North Celder, West Mithala and North Mithala with all their scenery and colliders.

The route:
1. From the arrival south-west along the plain way to the North Celder line.
2. North-east along the whole way to the head of the main approach.
3. Out to the eastern approach and back.
4. Up the western spur and back, and home.

Observed: walked 2,896 m, swam nothing, no steps round anything, no nudge, no fall; ground ran 12.2-18.3 m, and the steepest stretch walked was 7 degrees. It passed. **Not done**: a native keyboard walk.

## Evidence

| Check | Result (coordinator, on `9330c3e`'s tree) |
| --- | --- |
| `henborth-world`, `henborth-life` (scoped world 67, 62, 29, 31) | 11/11, 15/15 |
| `mithala-world`, `north-celder-world` | 14/14, 6/6 |
| `regional-build-steps`, `wildlife-loading`, `region-loading` | 3/3, 9/9, 7/7 |
| `region-layout`, `map-fog`, `southwest-world`, `developer-atlas` | 8/8, 7/7, 34/34, 8/8 |
| Builders' runs | `region-survey` 4/4, `region-sky` 6/6, `nobody-sealed-in` 6/6, `celder-life` 9/9 (after the shared rig file changed) |
| Known red, the same on `a2e49c3` | `open-country` 4/8 (Yunethre twice, Drent, a `world.js` source check; no probe lands on Henborth) and the rest of the list in the Ibenal report |

**Captures**:

`tests/artifacts/` in the worktree above; native Electron, `--review-clean --review-size=1440x900`, 4 October 2026, revision `9330c3e`. All 8 views rendered with no renderer errors.

| File | What it shows |
| --- | --- |
| `henborth.png` | Overview of the plain: long swells, the darker hollows, scattered birch and poplar, the trodden plain way |
| `henborth-wildlife.png` | The frostback summer band: cows, calves and bulls |
| `henborth-celder-margin.png` | Walker's height on the plain toward the North Celder line |
| `henborth-cranberry-bog.png` | The cranberry bog: cranberry mats, sedge and cotton grass, a pair of bog cranes |
| `henborth-main-approach.png`, `henborth-eastern-approach.png`, `henborth-western-spur.png` | The three ways toward the passes |
| `henborth-wet-corner.png` | The wet corner opening into the Acor Wetlands |

## Performance

- **Base `ec6ec44`, measured** (`tests/artifacts/startup-base-ec6ec44.json`): Full cold 158.4 s total, ready at 168.4 s; warm 143.6 s; 774 wildlife groups; no errors.
- **Henborth, measured** (`tests/artifacts/startup-henborth.json`, taken 20:19 once the interactive session closed): Full cold 146.5 s total, ready at 153.5 s; warm 116.9 s; no errors. **Henborth's own stage, `Henborth`, costs 0.98 s cold and 1.04 s warm.** The totals are not a fair comparison with the base run: that run was slower in nearly every stage the two share (Henborth's own stage exists only here), which is machine load during it rather than code (Kethorn alone read 11.4 s there and 9.4 s here, cold). Compare stage by stage, not totals.
- **The user's load-time study** (4 October 2026), across all of Claude's regions:
  - Steady-state height queries are unchanged from main.
  - Each region adds about 2.3 s to a Full cold start.
  - Fast mode's time to control rose from 32.9 s to 40.4 s with seven regions, from global work that is not deferred.
  - The user has paused new building to settle this first.

## Persistence

- **Trees**: `worldTreeId` ids, from the country's own seeded stream; harvestable.
- **Wildlife**: 13 zones with fixed ids and sites. The species are existing ones plus the new crane, marmot and grouse.
- **Saves**: no migration. **Not done**: a native save, leave and reload.

## Next action

- **Review and integrate** (ChatGPT).
- **For the user**: builder choices 1-7. The trough along North Celder's line is the one with the most visible effect.
- **Building is paused** until the user decides how to handle load time.
