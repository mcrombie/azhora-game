# Ovesos and the Oves Desert: terrain and wildlife

Brief written 2026-09-28 by the coordinating session, after Gala and the two Ascarths landed.
The user's word: build Ovesos and the Oves Desert next. **One job, one branch, one builder**: the
two countries share thirteen hex edges and one river basin, and the boundary between them is a
dispute in the lore, not a line on the ground.

**Terrain, climate, water, scenery and wildlife only — and nothing that belongs to anybody.** No
settlement, road, field wall, irrigation channel, canal, well, bridge, boat, person, sign or
quest, exactly as Vastos, Meneth, Caricas, Nesdor (`docs/four-regions-brief.md`), Isareos,
Nethereum, Eer (`docs/six-regions-brief.md`), South Suval, Gala (`docs/gala-brief.md`) and the two
Ascarths (`docs/ascarth-brief.md`) were built. The Ovesos Water Council, the five branch
countries, the Court, the Sorten's grazing rights and every water-right in the lore are somebody's
and are not built.

Read `docs/six-regions-brief.md` first: it was written for both of these countries, and its
Ovesos ruling is already settled by the user.

> **Superseded in part, 6 October 2026.** The user's ruling of 5 October 2026 replaces the one of
> 21 September quoted below ("green only along the Oveth"): Ovesos is fertile along the river and
> dries toward the desert in the south and west, the least productive of the four farm countries of
> the Lizeem but real farm country. It is built as a green belt measured by distance from the
> Lizeem and the Neth (`ovesosBelt`, `src/content/regions/oves/oves-world.js`): denser, greener grass with poplar,
> willow and tamarisk along the Lizeem's bank, thinning to the old bunch grass, wormwood and
> saltbush toward the south-west. The atlas keeps `BSh` on every hex, so the gradient is distance
> from water and not a climate. The same ruling puts the Water Council's village of Velsorten and
> its canal on that ground (`src/content/regions/oves/ovesos-farm.js`; Build 4 of `docs/lizeem-farmlands-design.md`),
> so "nothing that belongs to anybody" no longer holds for Ovesos. It still holds for the Oves
> Desert.

## State of play

- **Both are already in the survey.** `scripts/build-region-survey.mjs` lists `'Ovesos'` and
  `'Oves Desert'` in `PLAYABLE` and `src/dev/tools/region-survey.js` carries their hexes — the same
  half-finished state Gala was in. **Do not regenerate the survey**; it is correct.
- Neither has a `REGION_IDS` entry, terrain profile, text, sky, wildlife, map-fog area or
  build-status line. That is this job.
- **Region ids: `Ovesos: 25`, `'Oves Desert': 26`**, in that order after Southern Ascarth (24).
  The ordered lists now run: … South Suval 18, Iscare Archipeligo 19, East Lotharn Mountains 20,
  Feradom 21, Gala 22, Northern Ascarth 23, Southern Ascarth 24.
- Branch `oves` in its own worktree, from the integrated main. Never cd into another checkout,
  never a bare `git stash`, **do not commit** — leave the work uncommitted and report.

## What the atlas says (authority; the lore is adjusted to it)

| | **Ovesos** | **Oves Desert** |
|---|---|---|
| hexes | 19, q −12…−8, r 112…116 | 23, q −16…−10, r 114…118 |
| terrain | `grassland` × 8, `plains` × 11 | `plains` × 20, **`hills` × 3** |
| atlas bounds | x 1233–1413, y 2688–2816 | x 1164–1372, y 2736–2864 |
| world (approx, from the six-regions brief) | x −2250…−1700, z 549…895 | x −2500…−1850, z 722…1068 |
| neighbours by shared edge | Oves Desert 13, Caricas 7, Nesdor 7, Nethereum 5, Gala 3, Nether Desert 1 | Ovesos 13, Telemonia 12, Nether Desert 8, East Pyros 5, Gala 2 |
| sea | none | none |

**Climate, read per hex** from the World Builder map (`world-builder/map/resources/examples/azhora.wwmap`,
`hexes[key].climate`, `koppen-v1` — *not* `azhora.cmap.json`, whose one-code-per-region field is a
default and says `Cfb` for almost everything):

- **Ovesos: `BSh` × 19. Oves Desert: `BSh` × 23.** Both uniformly hot semi-arid steppe, every row.
- For context: Telemonia `BSh` × 23 + `Csb` × 2, Nether Desert `BSh` × 26, East Pyros `BSh` × 29.

**So there is no climate gradient to draw.** Unlike Gala (three bands) and the Ascarths (grass vs
hills), these two countries are climatically identical and the whole difference between them must
come from **terrain and water**: Ovesos has the river and the grassland rows, the desert has the
hills and no permanent water. Say so in the code comments; do not invent a gradient the map
does not carry.

## The lore to honour

**Ovesos** (`azhora_lore/geography/regions/ovesos.md`): the Oveth is one of five rivers descending
from upland country, gathering drainage before joining the Lizeem's upper reaches. The name is the
river's: *oves-*, "lower valley, the wide place where hill country flattens into cultivable
ground". **The user's standing ruling (six-regions brief, item 4) overrides the lore's orchards
and fulling mills:** Ovesos is *steppe* — grass in the north, open plains in the south, green only
along the Oveth, its living stock and river-bottom grain. Build that. *(Superseded by the ruling of
5 October 2026: green along the Lizeem and the Neth, drying toward the south-west. See the note at
the top.)*

**The Oves Desert** (`azhora_lore/geography/regions/oves_desert.md`): "hills along the desert's own
north-western rim run roughly north to south, low by continental standards but high enough to
intercept the moisture"; a wedge of the Oveth basin, "perhaps fifteen miles at its widest". Its
**ecology is a drought cycle, not a permanent deficit**: perennial scrub persists through the dry
years; annual grasses and forbs sit as seed banks and "germinate in large numbers" in wet years.
So: **perennial scrub, stone and bare ground — no dunes, no sand sea.** The game has no seasons
yet, so pick the dry-year face and say in a comment that the wet-year flush is what the seasons
would bring.

Check where the atlas actually puts the three `hills` hexes and build the rim there; if they are
not on the north-western rim, **the atlas wins** and the lore is adjusted to where they are.

Adjust both lore files **in place** — never commit, stage or stash in `world-builder`. If the tool
refuses, append the adjustment claim by claim to `docs/lore-adjusted-to-atlas.md` and say so.

## Water — the one piece of real carry-over

Gala already built the lower Oveth and left this builder an explicit constraint:

> **The upper Oveth must end at or above 5.38 m at (−1800, 953).** (`docs/gala-report.md`)

What Gala built, for continuity: the Oveth's Gala reach is **wadeable over rock for its first
two-fifths** below the Gala/Ovesos/Oves Desert corner, then a deep-water wall down to the Lizeem,
stopping 25 m short of the Lizeem's centre line. There is also a **wadeable desert border stream**
on the Gala|Oves Desert border and a small Telemonia border stream.

`src/world/terrain/region-rivers.js` already carries the authored courses; **do not author new rivers there.**
Minor water — a spring line at the hill foot, a seasonal wash with no water in it — is terrain and
scenery, the way Gala's dry gravel wash and Eer's channels are.

The desert has **no permanent water**. That is the point of it.

## Seams

- **Ovesos | Oves Desert, 13 edges.** One module family, so this seam is yours; make it invisible.
- **Gala, 3 + 2 edges.** Gala's plains/grassland profile is **base 4.0, amp .6, wave 320**; its
  steppe rows are lifted ~4.2 m by `galaRise` and its measured steppe average is 7.5 m with the
  north-east corner at 8.5 m. Meet Gala **within a metre or two** on those five edges and write
  no ground inside Gala's hexes.
- **Caricas 7, Nesdor 7, Nethereum 5** — all built, all across the Lizeem or the Neth. Check the
  existing profiles and match at the border; the Lizeem is `fordUntil: 0` and nothing crosses it.
- **Telemonia 12, Nether Desert 8, East Pyros 5** are unbuilt outland. Building the Oves Desert is
  expected to **fix the "outland ribs"** Gala reported at x ≈ −1900 (Gala's 320 m relief blending
  with outland's 150 m). Check whether it does, and report.

## Wildlife

A new `src/content/regions/oves/oves-wildlife.js`, zones tagged `region: 'Ovesos'` or `'Oves Desert'`, spread into
`src/content/regions/western-regions/west-regions-life.js` after the Ascarths'. `src/content/regions/gala/gala-wildlife.js` and
`src/content/regions/ascarth/ascarth-wildlife.js` show the shape; their tests show how a site is held to its ground.

Rigs that exist today: boar, dolphin, duck, egret, goose, gull, harrier, hill-sheep, longhorn,
nethrani-cattle, otter, plateau-hawk, red-deer, river-fox, sea-plunger, stilt, turkey-vulture,
upland-hare, wading-bird. Grounded suggestions: **the Oveth's green ribbon** is the only wet place
— otter, duck, wading birds, river-fox; **the steppe** — hares, a harrier quartering, a
turkey-vulture over the dry south; **the desert** — hares on the scrub, a plateau-hawk on the
hills, and little else, because emptiness is the honest reading of a drought-cycle range. At most
one new rig, and only if the lore names the animal. **Domestic stock is somebody's: none** — no
Sorten herds, no sheep, no cattle.

Every site measured on the built ground; every extension labelled as one in its note; an animal
backing off needs ~90–150 m of clear room behind it.

## Registration checklist (every item, or say why not)

`src/world/terrain/region-layout.js` REGION_BIOMES + PLAYABLE_REGIONS · `src/world/terrain/region-world.js` REGION_IDS (25,
26), REGION_TERRAIN (default + `byTerrain.grassland` for Ovesos, `byTerrain.hills` for the desert
rim), REGION_TEXT for each (subtitle, spawn on dry ground, description, palette, `npcIds: []`,
landmarks) · `src/gameplay/skills/languages.js` a dialect for Ovesos after `gala` (the lore gives the Mittoli
root *oves-*; the desert has no speech of its own — say so) · `src/dev/tools/developer-atlas.js` LOCALS
(rows are `[id, label, target, regionId, anchor]`) · `src/ui/map/map-fog.js` 2–4 areas each (radius
18–130, > 60 % inside its own region) · `src/dev/tools/build-status.js` (`'early'`) · `src/world/environment/region-sky.js`
if they get a sky — a dry bright `BSh` sky would be the first of its kind; add to **every**
OWN_SKY list a test pins (`tests/region-sky.test.js` *and* `tests/eer-world.test.js`) ·
`src/content/regions/oves/oves-world.js` hooked into the chain in `src/world/terrain/world-terrain.js` · `src/content/regions/oves/oves-scenery.js`
hooked in `src/world.js` · `src/content/regions/oves/oves-wildlife.js` · `tests/oves-world.test.js` ·
`package.json` test list · `docs/oves-report.md` · a dated entry in `docs/design-answers.md`.

Names: check `world-builder/azhoran_language_profiles.py` for an Ovesi profile before coining
anything; if there is none, coin nothing — titles in plain English or the lore's own words (the
Oveth, the rim hills, the dry wedge).

## Tests and renders

Run your own test and this list, not the full suite: eer-world, gala-world, ascarth-world,
isareos-world, nethereum-world, south-suval-world, east-lotharn-world, feradom-world,
region-layout, amod-world, elagos-world, caricas-world, nesdor-world, developer-atlas, map-fog,
chameleon, region-sky, west-life, regional-wildlife, region-survey, regions-world, region-levels,
languages, town-life, closed-border, open-country, west-rivers. Use
`node --test tests/<name>.test.js`.

**`npm test` cannot run on this machine** — the script exceeds the Windows command-line limit
("The command line is too long"). The coordinator runs the suite in chunks at integration; do not
attempt it.

**Known-failing on this base, not yours:** `chameleon` (19 spots against 22 expected — Iscare,
East Lotharn and Feradom have no Ed spots), `regional-wildlife` ("previously empty regions" list
missing Iscare), and whatever the coordinator's baseline diff names in the report it hands you.

Maps: `node scripts/region-map.mjs minX,minZ,maxX,maxZ [scale] [out.png] [x,z;x,z]` with env
`MAP_LO`/`MAP_HI` draws a hillshade of the built ground — look before and after. One short review
render at the end if electron is available
(`node scripts/launch.cjs --smoke-test --review-clean "--review-views=stand-at:x,z,yaw,pitch,dist;…"`,
images in `tests/artifacts/`); no autoplays, no long smokes. Take it **after** any final scenery
tuning — both previous builders photographed before their last change and had nothing to show.

Line endings: `src/main.js`, `src/world.js`, `src/ui/map/map-fog.js` and `src/dev/tools/developer-atlas.js` are
CRLF; keep every file as found.

## Report

`docs/oves-report.md`: what the atlas gave and what was chosen where it was silent; the climate
read; the upper Oveth's join at (−1800, 953); the seam numbers on all five Gala edges and the
Caricas/Nesdor/Nethereum borders; whether the outland ribs at x ≈ −1900 are gone; every lore
adjustment; every zone with its species and why; tests run and results; review views; open
questions. Final message: the same, short, plus every file touched.
