# Ibenal handoff: South Ibenal and North Ibenal

Queue rows 5 and 6 of the [completion ledger](../regional-completion-ledger.md), delivered by Claude on 4 October 2026 as one pair: terrain, water, vegetation and wildlife only. The builders' brief is [`docs/ibenal-brief.md`](../ibenal-brief.md).

The user raised the plan's four-region waiting limit on 4 October ("Raise the four region limit to keep building"). Claude keeps building in queue order, one assignment at a time. The user also confirmed East Izol as climbing terrain, Alezhor's gold-river falls, and the builders' new animals.

## Revision

| | |
| --- | --- |
| Base | `116799e`, the Alezhor delivery (on East Izol, on Celder, on `a2e49c3`) |
| Delivered | branch `ibenal`: `30afeaf` (the build), `7fb3ce1` (a narrower river-ground pass, below), then this report's commit |
| Worktree | `C:\Users\Michael\Programs\typescript\azhora-game-ibenal`, clean after both commits apart from the ignored `tests/artifacts/` |
| Not done | Not merged, not pushed. Runtime IDs 65 and 66 are provisional. |

## Scope

| | South Ibenal | North Ibenal |
| --- | --- | --- |
| Runtime ID | 65 | 66 |
| Atlas | 30 hexes, all plains, all Csb | 34 hexes, 33 plains and one hills (-21,99), all Csc |
| Neighbours | West Ibenwood 18, Alezhor 3 (built); North Ibenal 8; the sea | South Oremindi Mountains 8, North Ibenwood 8, West Ibenwood 6 (built); South Ibenal 8; the sea |
| Arrival (F8) | (-4530, 425) | (-4150, -140) |
| Landmarks / views | 11 / 8 | 10 / 7 |

**New files**:
- `src/south-ibenal-world.js` (one plain over both countries, `ibenalLand`) and `src/north-ibenal-world.js` (uses it)
- `src/{south,north}-ibenal-scenery.js` (one builder serving both countries) and `src/{south,north}-ibenal-wildlife.js`
- `tests/{south,north}-ibenal-world.test.js`, `tests/ibenal-life.test.js`
- `docs/ibenal-brief.md`, `docs/region-reviews/routes/ibenal-corridor.json`
- this report

**Registration and wiring** (small, line-ending-preserving edits). Registration:
- `scripts/build-region-survey.mjs` (`WINDOW.minQ` -56: South Ibenal's coast takes two more columns; the generated survey is byte-identical) and the regenerated survey
- `src/region-layout.js`, `src/region-world.js`
- `src/developer-atlas.js`, `src/build-status.js` (`environment`), `src/languages.js` (both `ibnael`, Forest Mittoli)
- `src/map-fog.js`, `tests/test-manifest.json`

Wiring:
- `src/world-terrain.js`: two outermost layers, `groundBefore` functions, tint and shore-tint rows.
- `src/west-regions-life.js`: the zones, and the new grey seal's rig (+44 lines).
- `src/main.js`: views; the `-wildlife` views frame a forest-cat (South) and a grey seal (North).
- `src/world.js`:
  - Two scenery steps under their own labels.
  - `ibenalRiverGround`, which lays the five streams on the forest's two-metre river ground.
  - `ibenalMapWaters()` on the chart.
  - **The rendered-ground fix below**.
  - Alezhor's river-ground step put back directly after its own scenery.

Test knock-ons:
- `tests/region-layout.test.js`: the world-width budget is 70.8 hexes, with the west edge at x -4860.
- The Ibenal probes in `tests/southwest-world.test.js`, and one guard line in `tests/selemis-world.test.js`.

**The rendered-ground fix (also mends Alezhor).** Animals in the regions that draw their footing on the rendered ground were drawn on the coarse 7.1 m mesh even where a river's two-metre ground had been laid. Near the streams that sank otters, herons and stilts 0.1-0.68 m into what is drawn. The world's `renderedGroundHeight` now answers the true ground near any river laid on that ground: within 40 m of the Ibenwood's and Alezhor's, as `forestRenderedGround` does for the forest's scenery, and within 18 m of the Ibenals' (their narrower pass, below). Alezhor's animals at its gold river and west stream are mended by the same line.

**The narrower river-ground pass (`7fb3ce1`).**
- **The problem**: the first startup profile spent about 8 s laying the Ibenals' 1.5 km of streams on the forest's two-metre river ground. Every face within 48 m was split, and each new point asked the whole ground chain for its height.
- **The shared pass changes**: `refineIbenwoodRiverGroundSteps` takes an optional `reach`. The default is the forest's own 48 m, so the Ibenwood and Alezhor passes are unchanged. It also asks each shared point's height once per pass.
- **The Ibenal pass**: it uses 24 m, which holds every stream's channel, banks and floor. The vale's outer side slopes are gentle enough for the 7.1 m mesh.
- **Matching distances**: the scenery and the world stand things on the true ground within 18 m of an Ibenal stream, which is the reach less its 6 m blend.
- **Its own label**: the pass loads as `The Ibenal streams`.
- **Result**: it now takes 3.7 s cold, against about 8 s. The retaken stream and overview captures look as before.

**What is built**

- *Ground*: one plain over both countries. South Ibenal has 259,000 m² of dry land (to 21.4 m) and North Ibenal 294,000 m² (to 23.9 m).
  - It rises from a 3-5 m terrace behind the shore to the high ground's own level at the tree line, read live along all 40 forest and Oremindi edges. Swells are low in the south and rougher in the north.
  - Both countries keep `outland`'s profile, so no neighbour's blend moved, and nothing steps at their 8 shared edges.
- *Streams*: five come out about 10 m from the tree line and follow the atlas edges (each within 7 m) to bays at the coast's notches.

  | Stream | Length | Head level |
  | --- | ---: | ---: |
  | South | 259 m | 14.0 m |
  | Middle | 251 m | 12.1 m |
  | North | 275 m | 10.9 m |
  | Border (along the line between the two Ibenals) | 378 m | 16.0 m |
  | Last (North Ibenal, in a deeper vale) | 374 m | 17.9 m |

  - Each runs in a vale with real banks, and has one ford where the corridor way crosses: a 10 m gravel riffle 0.22 m deep, with no water colliders.
  - The scenery draws 5 ribbons and lays 1,260 river-water colliders.
- *Kept flats* (nothing built): six, 30-48 m across, one beside every stream mouth and one at the Narrows' end.
- *Coast*: stone on 8% of South Ibenal's shore and 23% of North Ibenal's, with dunes behind the beaches in the south-west.
- *The Narrows*: a flat way 150-237 m wide in rows 100-101, pinching to about 50 m in row 99.
- *The foothill* on (-21,99) crests at 16.9 m, with a steepest slope of 0.75.
- *Colour* and shore tints for both countries. Trails: 1,032 m and 151 m in the south, 712 m and 390 m in the north.
- *Scenery* (one builder for both: a 4 m survey sorts the ground into 18 habitats; Csb and Csc are blended across 50 m either side of the line between the countries):
  - **South Ibenal**: 18,642 instances in 125 batches.
    - 11,082 grass tufts, 902 reeds and rushes, 708 flowers.
    - Shrubs: gorse, broom, heather, bramble, and the lore's spice bush.
    - 179 stones and 1,045 pieces of stream gravel.
    - 285 trees, 70 of them at the tree line in the forest's own species: white oak 65, black willow 33, beech 30, hazel 30, sweet chestnut 27, hawthorn 26, and others.
  - **North Ibenal**: 21,699 instances in 102 batches.
    - 13,146 grass tufts (moor grass among them) and 877 flowers.
    - Shrubs: heather 411, crowberry 209, gorse 120.
    - 337 stones.
    - 354 trees, 158 of them at the tree line or the Oremindi's foot: birch 86, hawthorn 61, hazel 33, juniper 30, silver fir 29, and others.
  - All trees are typed and harvestable. Build steps are at most 5.5 ms once warm.
- *Wildlife*: 20 bands, 57 animals, no stock. Each band has its own layout, and a test holds it against every same-species band in the west.

  | Country | Bands | Animals |
  | --- | ---: | --- |
  | South Ibenal | 11 | forest edge-cat 3, red deer hinds 4, otters 6, black geese 6, herons 3, hares 3, gulls 4, harrier 1, hawk 1 (31 in all) |
  | North Ibenal | 9 | forest edge-cat 2, red deer stags 2, otters 3, stilts 4, **grey seals 5**, gulls 4, hares 4, hawk 1, mountain eagle 1 (26 in all) |

**Not built** (owned): the river-mouth towns and anchorages, the corridor road, the farms between the rivers, the raft trade, the fishing harbours, the Narrows' settlements and the pass provisioners.

**Builder choices to confirm or revise**

1. **The Alezhor seam.** South Ibenal holds its three Alezhor edges exactly as handed, and Alezhor's live seam meets them. Alezhor's ground is bitwise identical to its delivery at 6,621 points near the line.
   - Alezhor's far bank therefore still rises 2-6 m over its west stream at the line, and South Ibenal comes down from that low rise into its plain over 30 m.
   - A lower bank would need Alezhor-side changes: its seam on those three edges, and its 18 m feather.
2. The streams are carried upstream from the atlas heads to the tree line. The border stream follows the whole line between the two Ibenals from the three-country corner at (-4100, 145).
3. A sixth kept flat at the Narrows' end, for the corridor's terminus settlement. The brief named only river-mouth flats.
4. A shallow swale at the Oremindi's foot along two edges, where the mountains' own ground at the line is lower than the plain.
5. Default sky for both countries; no climbing terrain.
6. **The grey seal**, a new animal and rig. The fauna overview names grey seals on the northern coast and southern grey seals at Bouén. They haul out on rock ledges and slip into the sea when approached, and a band can name its own escape water.
7. Other extensions:
   - A mountain eagle over the foothill, borrowed from the South Oremindi.
   - Migrants: geese and herons in the south, stilts in the north.
   - Hinds in the south, stags in the north.
   - The Oremindi's foot is treated as a tree line, with birch, fir and juniper saplings.

**Lore edits.** Made in place under the user's rule; both files were unmodified before; nothing staged or committed in the World Builder repository.

| File | Old | New | Atlas fact |
| --- | --- | --- | --- |
| `ibenale.md` | "the forest is relatively far from the coast and the plain is wide enough that the forest reads as background" | "the forest stands as near the coast as anywhere in the corridor, yet it reads as background" | Sea to forest is 170-360 m in South Ibenal (least in its south) and 350-440 m in North Ibenal. |
| `ibenale.md` | "the mountains push in from the other side, the forest comes closer." | "...the road turns inland toward the passes and the forest comes closer." | The northern pinch is against the Oremindi; the pass approach starts at the North Ibenwood / Oremindi corner. |
| `north_ibenal.md` | "It narrows as it goes north, the forest pressing closer," | "It opens out below the northern forest and then narrows to its end," | 500-600 m wide in rows 102-105, then 400, 300 and 200 m in rows 101-99. |
| `north_ibenal.md` | "The plain has been narrowing throughout ... the forest edge and the shoreline, which is several miles in the southern sections, ... narrowest parts of the northern passage," | "...widening and narrowing throughout ... the high ground and the shoreline, which is miles below the northern forest, ... where the mountains come down to the sea," | The same widths. |
| `north_ibenal.md` | "the Ibenwood pressing to within sight of the shore." | "the wooded feet of the Oremindi pressing ..." | The Narrows' landward neighbour (rows 99-101) is the South Oremindi Mountains. |

## Border contract

`node scripts/region-evidence.mjs ../azhora-game-alezhor "South Ibenal,North Ibenal" --strip`:

| Border | Edges | Worst step across the line (0.5 m apart) | Base there | Worst on the base |
| --- | ---: | --- | ---: | ---: |
| South Ibenal, West Ibenwood (built) | 18 | -0.43 m at (-4550.0, 693.3), ground 15.9 | -0.43 m | 1.68 m |
| South Ibenal, Alezhor (built) | 3 | 0.18 m at (-4550.0, 866.5), ground 8.3 | 0.20 m | 0.20 m |
| North Ibenal, South Oremindi Mountains (built) | 8 | -0.07 m at (-3650.0, -288.8), ground 17.9 | 0.05 m | 0.58 m |
| North Ibenal, North Ibenwood (built) | 8 | 0.15 m at (-3650.3, -288.4), ground 19.0 | 1.34 m | 2.06 m |
| North Ibenal, West Ibenwood (built) | 6 | 0.08 m at (-4000.0, 101.7), ground 18.1 | 0.90 m | 1.50 m |

- **The West Ibenwood -0.43 m** is the base's own step at the head of the forest's stream. That stream sits on ground held exactly as handed within 0.4 m of its course; the forest's own channel is the bank on South Ibenal's side.
- **The builder's seam tests** probe 0.1 m across the line, and every border is under 0.05 m apart from the base's own steps on the forest stream's course.
- **The 46 m strips** (112,157 one-metre points): no new steep step, none steeper than the base, and one steep as on the base.
- **Coast**: 43 edges meet the sea.

## Journey

`node scripts/walk-route.mjs docs/region-reviews/routes/ibenal-corridor.json 65,66,35,33,37,64` (the strict walker, `116799e`). It walks on a scoped world of both Ibenals and their four built neighbours with all their scenery and colliders.

The route follows the builders' corridor trails:
1. From South Ibenal's arrival to the tree line and back.
2. South to the Alezhor end.
3. North along the whole corridor through every ford, into North Ibenal and through the Narrows to its end.
4. Back to the Oremindi's foot, and to North Ibenal's arrival.

Observed: walked 3,894 m. It swam 3.7 m on the last leg home, a straight line across North Ibenal's stream away from its ford. No nudge, no fall, every waypoint reached; ground ran 1.5-15.4 m, and the steepest stretch walked was 50°. It passed. **Not done**: a native keyboard walk.

## Evidence

| Check | Result |
| --- | --- |
| `south-ibenal-world` (includes the scoped world 65, 66, 35, 33, 37, 64), `north-ibenal-world`, `ibenal-life` | 13/13, 6/6, 15/15 (coordinator, on the final wired tree) |
| `alezhor-world`, `alezhor-life` (after the rendered-ground fix) | 15/15, 13/13 |
| `regional-build-steps`, `wildlife-loading`, `region-loading`, `ibenwood-rivers`, `region-layout`, `region-survey` | 3/3, 9/9, 7/7, 6/6, 8/8, 4/4 |
| `southwest-world`, `selemis-world`, `region-sky`, `map-fog`, `region-levels`, `ibenwood-boundary`, `developer-atlas` | 34/34, 15/15, 6/6, 7/7, 4/4, 6/6, 8/8 (ground builder) |
| Known red, the same on `a2e49c3` | `languages` (East Ibenwood), `local-map-data` (cottages, farms and barracks), `baldro-world` (the coast-lattice budget), `izol-world` (line 66), `open-country` 4/8 (Yunethre, Drent, a source check on `world.js`; 4/8 on `a2e49c3`, `136b582`, `fdc1707` and `116799e` alike) |

**Captures** (`tests/artifacts/` in the worktree above; native Electron, `--review-clean --review-size=1440x900`, 4 October 2026, revision `30afeaf`):

| File | What it shows |
| --- | --- |
| `south-ibenal.png` | Overview from the sea: the notched coast, the plain and the streams from the forest's edge to the bays (retaken after `7fb3ce1`; from this height a stream's fords and pools show its ribbon in pieces) |
| `south-ibenal-forest-stream.png` | Walker's height where a stream leaves the tree line and winds to the sea (retaken after `7fb3ce1`, unchanged) |
| `south-ibenal-tree-line.png`, `south-ibenal-north-meadow.png`, `south-ibenal-narrow-south.png` | The forest's edge, the northern meadow, the narrow south |
| `south-ibenal-alezhor-bank.png` | The sandy rise over Alezhor's west stream at the line (builder choice 1) |
| `south-ibenal-rocky-point.png` | The stone shore |
| `south-ibenal-wildlife.png` | The forest-cat |
| `north-ibenal.png` | Overview of the northern corridor |
| `north-ibenal-narrows.png` | The Narrows under the South Oremindi's wall |
| `north-ibenal-foothill.png`, `north-ibenal-tree-line.png`, `north-ibenal-mountain-foot.png`, `north-ibenal-rocky-shore.png` | The foothill, the forest's edge, the Oremindi's foot, the rocky shore |
| `north-ibenal-wildlife.png` | A grey seal hauled out on the shore |

The first run of 15 views was on `30afeaf`, and the retakes on `7fb3ce1`; both reported no renderer errors. The South Oremindi's wall in the Narrows view shows the glossy shared-terrain material that ChatGPT has already fixed on its review branch (`shared-ground-material-review.md`); this branch does not carry that fix yet.

## Performance

| | Base `116799e` | With the Ibenals, `30afeaf` | With the narrower pass, `7fb3ce1` |
| --- | ---: | ---: | ---: |
| Full start, cold: total / ready | 130.1 s / 138.1 s | 143.0 s / 149.7 s | 142.3 s / 149.1 s |
| Full start, warm | 103.6 s | 118.7 s | 120.9 s |
| Wildlife groups | 754 | 774 | 774 |
| Errors | 0 | 0 | 0 |

`node scripts/launch.cjs --smoke-test --startup-profile --profile-warm`, with `--profile-root=../azhora-game-alezhor` for the base. Runs on 4 October 2026, Full mode, offscreen 1440x960, with no other Electron process running. Results: `tests/artifacts/startup-base-116799e.json`, `startup-ibenal.json` and `startup-ibenal-2.json`.

**The Ibenals' own stages**, from the second run:

| Stage | Cold | Warm |
| --- | ---: | ---: |
| `South Ibenal` | 2.0 s | 2.1 s |
| `North Ibenal` | 2.0 s | 1.7 s |
| `The Ibenal streams` | 3.7 s | 3.8 s |

That is 7.7 s in all, about 6% of the base's cold start, against about 11.8 s on `30afeaf`.

**The rest of the second run's increase is load, not the Ibenals.** It is spread thinly over unrelated stages (Kethorn +0.8 / +2.2 s, East Lotharn +1.3 s warm, terrain shaping). The first run had none of that spread, and its whole increase sat in the Ibenal stages. The machine was busier during the second run. The totals are single runs; the per-stage figures are the attributable cost.

**Not measured**: Fast mode in the renderer, frame times, renderer memory and draw calls.

## Persistence

- **Trees**: `worldTreeId` ids per country, from each country's own seeded stream; harvestable.
- **Wildlife**: 20 zones with fixed ids and sites. The species are existing ones plus the new `grey-seal`.
- **Saves**: no migration. **Not done**: a native save, leave and reload.

## Next action

- **Review and integrate** (ChatGPT). The rendered-ground fix in `src/world.js` is Alezhor's follow-up as well as the Ibenals'.
- **For the user**: builder choices 1-7, and the five lore edits (`git diff` in `world-builder`).
- **Next build**: Claude starts queue row 7, Henborth, on top of this delivery.
