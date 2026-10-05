#!/usr/bin/env node
/**
 * Generate src/region-survey.js from assets/azhora-dev-regions.json.
 *
 * The renderer builds the playable world synchronously, and the Node tests load
 * src modules through a data: URL loader, so neither can fetch or read the
 * 240 KB atlas at module time. This script bakes the small part the game needs
 * into an ordinary ES module: the playable regions' hexes, and every claimed
 * hex near the playable window so the coastline knows where the sea is.
 *
 * tests/region-survey.test.js re-derives the same file and fails if it drifts.
 * Never hand-edit src/region-survey.js; run `node scripts/build-region-survey.mjs`.
 */
import { OUTER_NAMES } from '../src/outer-regions-data.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PLAYABLE = ['Drent', 'Luscia', 'Moros Plain', 'East Suval', 'West Suval', 'Pueth', 'Peblos', 'West Izol', 'Elagos', 'Amod', 'Vastos', 'Meneth', 'Caricas', 'Nesdor',
  'Isareos', 'Nethereum', 'Ovesos', 'Oves Desert', 'Gala', 'Eer', 'South Suval', 'Iscare Archipeligo', 'East Lotharn Mountains', 'Feradom', 'Northern Ascarth', 'Southern Ascarth',
  'West Lotharn Mountains', 'South Mithala', 'West Mithala', 'East Mithala', 'North Mithala', 'East Ibenwood', 'North Ibenwood', 'South Ibenwood', 'West Ibenwood', 'Central Ibenwood', 'South Oremindi Mountains', 'Yunethre', 'Navarth', 'West Pyros', 'Ganesh Desert', 'Ganesh Plain', 'North Meroshe Desert', 'West Meroshe Desert', 'Central Meroshe Desert', 'South Meroshe Desert', 'Cape Heth', 'Dinelv Highlands', 'Hama', 'Marosh', 'Trogo', 'West Baldro Mountains', 'East Baldro Mountains', 'Selemi', 'Telemonia', 'West Oremindi Mountains', 'East Pyros', 'Nether Desert', 'Legemum', 'Babon', 'South Celder', 'North Celder', 'East Izol', 'Alezhor', 'East Oremindi Mountains', 'North Oreminidi Mountains', 'Lesser Oremindi Mountains', 'Cudon', 'Narcosh', "Cape Thalmagar", "Acor Wetlands", "West Acorwood", "South Acordwood", "North Acorwood", "East Acordwood", "South Endevor", "West Endevor", "North Endevor", "East Endevor", ...OUTER_NAMES, 'South Ibenal', 'North Ibenal', 'Henborth', 'Urubond'];
/**
 * **Hexes the atlas leaves unclaimed inside one region, which belong to the region all round them.**
 * The World Builder map paints these with a terrain and forgets to say whose they are; the dev atlas
 * this script reads therefore leaves them out. Left out they are not land, and the coast field calls
 * anything that is not land the sea - so a hex like this is cut to sea level, given a beach, and
 * becomes a hundred-metre hole of open water in the middle of somebody's country.
 *
 * The rule is narrow on purpose: a hex belongs here only when **every one of its six neighbours is
 * the same region**, and it keeps the terrain the map gives it. Two hexes on the whole atlas meet it:
 *
 *  - **the Stillwater** at (6,120), `lake`, ringed by South Suval. Of the atlas's twenty-eight lake
 *    hexes exactly one meets the rule; the lakes between Elagos, Amod and Drent, and those round
 *    Nethereum, touch several regions or open water and stay as they are. The region takes the hex as
 *    a `lake` cell, the way Elagos holds its own lakes, and src/south-suval-world.js cuts the basin
 *    to the lake's own level. tests/south-suval-world.test.js checks the World Builder map agrees;
 *  - **(5,92)**, `hills`, ringed by South Mithala on all six sides - found when the Mithala plain was
 *    built, because the ground there came out at 0.6 m between two hexes at 12 and 13, with a beach
 *    round it, in the middle of the flattest country in the game. Taking it makes the plain one piece
 *    (South Mithala's outline goes from two loops to one) and makes the Lotharn's last apron the
 *    unbroken chain of five `hills` hexes the map actually draws, from (3,93) to (7,91), instead of
 *    two separate swells with a pond between them.
 *
 * This used to be `ENCLOSED_LAKES` and held only the first of the two.
 */
export const ENCLOSED_HEXES = Object.freeze({
  'South Suval': Object.freeze([Object.freeze([6, 120, 'lake'])]),
  'South Mithala': Object.freeze([Object.freeze([5, 92, 'hills'])]),
});
/**
 * Axial window around the playable regions, in atlas hex coordinates. Wide
 * enough that every coast and inland horizon inside the world bounds is honest.
 *
 * `minQ` was -14, and that was too narrow twice over. It is too narrow already:
 * forty-nine claimed hexes of Legemum, East Pyros and the Aurumlis fall inside
 * today's coast lattice (WORLD_BOUNDS widened by COAST_MARGIN) and were being
 * left out of LAND_HEXES, so the coast field called land sea. Nothing is built
 * out there, so what it cost was horizon rather than ground. And it is far too
 * narrow for the six southern countries: Nethereum reaches x = -2900 and the
 * Nether Desert behind it -3050, so without them the ground immediately west of
 * Nethereum would be open water.
 *
 * -33 was measured, not chosen: over the world bounds the six produce, the coast
 * lattice can sample a hex whose centre lies within COAST_MARGIN plus one hex
 * circumradius of the bounds, and the westernmost such hex on the whole atlas is
 * at q = -31. Two hexes of slack, and no more, because every hex in the window
 * is a line in a generated file.
 *
 * Then `minQ` was -33, and **the Ganesh Desert is the first playable country to
 * reach it**: its westernmost hexes are (-33,123) through (-33,126), whose outer
 * flat stands at x = -3900, so the world's western edge goes from -3010.002 to
 * **-3960.002** and the world from 36.20 hexes wide to **45.70**. The coast
 * lattice is laid COAST_MARGIN (96 m) beyond that and snapped to its own fixed
 * phase, so its first column now stands at x = **-4056.002**. Sampling the whole
 * lattice (1,192 x 1,191 points) and collecting every hex any sample falls in
 * gives q **-41**...34, r 79...135 - measured rather than reasoned, the same rule
 * maxR 135 and minR 79 were set by. The westernmost column the lattice reaches is
 * q = -41 on rows 134-135, in the far south-west, because x = W(q + r/2) puts a
 * low q and a high r at the same world x. So minQ is -41: the last column the
 * lattice reaches, and no slack.
 *
 * That widening turns **71 claimed hexes in six countries** from sea into land -
 * Cape Heth 19 (the whole of it), the Dinelv Highlands 14, South Ibenal 14, the
 * West Meroshe Desert 13, Alezhor 7 and West Ibenwood 4. **None of them is the
 * block's own**: all four southwestern countries already lay inside q >= -33.
 * What the 71 are is the block's horizon, and the Ganesh Desert needs them: Cape
 * Heth is its western neighbour across five hex edges, and without those hexes
 * the desert would have looked out on open water where the atlas draws a cape.
 *
 * Then `minQ` was -41, and **the four Meroshe deserts moved it again without
 * reaching west at all**. Their westernmost hex is the West Meroshe's (-37,133)
 * at x = -3750, a hundred and fifty metres inside the edge the Ganesh Desert set,
 * so `WORLD_BOUNDS.minX` does not move. What moves is `maxZ` (see below), and
 * because x = W(q + r/2) puts a low q and a high r at the same world x, a lattice
 * that reaches nine rows further south reaches four columns further west in the
 * same breath. Measured over the whole lattice: q **-45**...34, and the columns
 * at q = -45 are reached only on rows 142-144, in the far south-west corner.
 *
 * Then `minQ` was -45, and **Cape Heth moved it again, this time by reaching.**
 * Job 2's report predicted that job 3 would not move the world box at all, on the
 * ground that Cape Heth's columns (q -39...-34) are well inside the window - which
 * is true of the *window* and says nothing about the *box*, because x = W(q + r/2)
 * and Cape Heth's rows are higher than the Ganesh Desert's. Cape Heth's westernmost
 * hex is its one `coast` hex, (-39,127), whose centre stands at x = **-4250** where
 * the Ganesh Desert's westernmost centres stand at -3850; its outer flat is at -4300
 * and the margin 60, so `WORLD_BOUNDS.minX` goes from -3960.002 to
 * **-4360.001927939127** and the world from 45.700 hexes wide to **49.700**.
 * Nothing else moves: the Dinelv Highlands reach x = -3900 and Hama -3500, and
 * Hama's southernmost hexes (-34,141) and (-33,141) stand at z = 3060.089, which is
 * exactly the row the South Meroshe already set, so `maxZ` does not budge.
 *
 * The coast lattice is laid COAST_MARGIN (96 m) beyond that and snapped to its own
 * fixed phase, so its first column now stands at x = **-4456.001927939127** (it was
 * -4056.002) and the lattice is 1,292 x 1,386 = 1,790,712 points. Sampling all of
 * them and collecting every hex any sample falls in gives q **-49**...34,
 * r 79...144, measured rather than reasoned, with the columns at q = -49 reached
 * only on rows 142-144 again. So minQ is -49: the last column the lattice reaches,
 * and no slack.
 *
 * **That widening pulls in nothing at all, and that is the finding.** Every earlier
 * move of this window bought horizon or ground; the four columns q -49...-46 hold
 * **no claimed hex on the whole atlas** in rows 79-144, because west of Cape Heth
 * the map is open ocean to the edge of the sheet. LAND_HEXES stays at 2,078 plus
 * the block's own seventy-three, and the generated file is identical whether minQ
 * is -45 or -49. The value moves anyway, because the invariant this window keeps is
 * "the last column the lattice reaches, and no slack", and a window that lied about
 * that would be a trap for the next builder who widens the world west.
 *
 * `minR` was 92, which is the East Lotharn's own northern row, and the East Lotharn is the first
 * playable country to reach it. Its northern edge then takes the world's bounds to its hexes'
 * rim, and the coast lattice samples out to COAST_MARGIN plus a circumradius beyond that: row 90
 * of South Mithala, measured. Row 91 left out would have called the Mithala plain the sea along
 * the whole north face of the range. Two rows, and no slack past the one the lattice reaches.
 *
 * Then `minR` was 90, and **the four Mithala countries are the first playable ones north of it**.
 * North Mithala's northernmost hex is (11,82), its centre at z = -2049.5 and its top corner at
 * -2107.2, so the world's northern edge goes from -1301.2 to **-2167.196** and the world from
 * 37.00 hexes tall to **45.66**. The coast lattice is laid COAST_MARGIN (96 m) beyond that and
 * snapped to its own fixed phase, so its first row stands at z = **-2264.35**; a pointy-top hex
 * reaches a circumradius (57.735 m) past its centre at its top and bottom vertices, and row 79's
 * centres are at -2309.3, which puts its lower vertices at -2251.6 - north of the lattice's first
 * row by thirteen metres. Sampling the whole lattice and collecting every hex any sample lands in
 * gives q -31...34, r **79**...135, measured rather than reasoned. So minR is 79: the last row the
 * lattice reaches, and no slack. (maxQ is already exactly 34 and gains none, which is not a
 * coincidence - x = W(q + r/2), so ten rows further north is five columns further east for the
 * same world x.)
 *
 * That widening turns **329 claimed hexes in seventeen countries** from sea into land, which is
 * what the Mithala's northern horizon is made of: South Acordwood 37, North Oreminidi 29, Narcosh
 * 28, Henborth 27, West Acorwood 23, the Acor Wetlands 21, East Acordwood 19, Cudon 18, the Lesser
 * Oremindi 18, Cape Thalmagar 15, North Acorwood 13, the West and East Oremindi 9, and 72 of the
 * Mithalas' own. Without it the plain would have ended in open water one hex north of North
 * Mithala's last row, where the atlas draws the Acor Wetlands and the great forest.
 *
 * `maxR` was 133, which West Izol's southern shore set, and the two Ascarths are the first
 * playable countries to reach past it: Southern Ascarth's tip is row 132, its hex's southern
 * corner stands at z = 2338.4, and the world's southern edge goes from 2225.2 to 2398.4. The coast
 * lattice samples out to COAST_MARGIN beyond that, to z = 2495.6, which is inside rows 134 and 135
 * and no further, measured. Twenty-five claimed hexes lie in those two rows under the lattice -
 * Selemi's six among them, the island a hundred and seventy metres south of the tip across a
 * channel one hex wide - and with 133 they were all the sea: the tip would have looked out on open
 * water where the atlas draws Selemi's shore. So 135, the last row the lattice reaches, and no slack.
 *
 * Then `maxR` was 135, and **the four Meroshe deserts are the first playable countries past it** -
 * the only direction this world had left. The South Meroshe Desert's southernmost hexes are
 * (-32,141) and (-31,141), their centres at z = 3060.09 and their lower vertices a circumradius
 * (57.735 m) past that at 3117.82, so the world's southern edge goes from 2398.401 to
 * **3177.823940164498** and the world from 45.656 hexes tall to **53.450**. It is now 45.70 by
 * 53.45: taller than it is wide, for the first time since the Ascarths.
 *
 * The coast lattice is laid COAST_MARGIN (96 m) beyond that and snapped to its own fixed phase, so
 * its last row now stands at z = **3275.65** (it was 2496.22) and the lattice is 1,192 x 1,386 =
 * 1,652,112 points. Sampling all of them and collecting every hex any sample falls in gives
 * q -45...34, r 79...**144**, measured rather than reasoned. So maxR is 144: the last row the
 * lattice reaches, and no slack.
 *
 * That widening turns **143 claimed hexes in seven countries** from sea into land: Babon 50, Trogo
 * 29, Hama 19, the Azhor Stones 12 - and **thirty-three of the block's own**, which is the part
 * that matters. The South Meroshe Desert's twenty-one hexes, eight of the Central's and four of the
 * West's all lay south of row 135: without this they would have been open water in the middle of a
 * playable country. LAND_HEXES goes from 1,935 to **2,078**.
 *
 * Then `maxR` was 144 and `minQ` -49, and **Trogo moved both of them, one by reaching and one by
 * arithmetic.** Trogo's southernmost hexes are (-29,142), (-28,142) and (-27,142), their centres at
 * z = 3146.69 and their lower vertices a circumradius (57.735 m) past that at 3204.43, so
 * `WORLD_BOUNDS.maxZ` goes from 3177.824 to **3264.4264805429416** and the world from 53.450 hexes
 * tall to **54.316**. Nothing else in the box moves: Trogo reaches x = -2050 and Marosh x = -2750,
 * where Cape Heth's western edge stands at -4360.002, and Marosh's own northernmost row is 127.
 *
 * The coast lattice is laid COAST_MARGIN (96 m) beyond that and snapped to its own fixed phase, so
 * its last row now stands at z = **3361.65** (it was 3275.65) and the lattice is 1,292 x 1,408 =
 * 1,819,136 points. Sampling all of them and collecting every hex any sample falls in gives
 * q **-50**...34, r 79...**145**. So maxR is 145 and minQ is -50: the last row and the last column the
 * lattice reaches, and no slack in either.
 *
 * **`minQ` moved again without anything reaching west, which is now the second time and the reason
 * job 3's report gives for not predicting the box from the window.** x = W(q + r/2), so a lattice one
 * row deeper in the south reaches half a column further west at the same world x; the column q = -50
 * is reached only on rows 144 and 145, in the far south-western corner of the sheet, where the map is
 * open ocean. Job 2 found the same thing when it grew the world south by nine rows and gained four
 * columns; this is one row and half a column, rounded out to one.
 *
 * What the widening pulls in: **exactly one hex, and it is the one Trogo's own lore looks at.** The
 * five columns -50...-46 hold no claimed hex anywhere in rows 79-145 - west of Cape Heth the map is
 * open ocean to the edge of the sheet - and row 145 holds one, **(1,145), an Azhor Stones hex, and its
 * terrain word is `deep_forest` like Trogo's own**. `trogo.md`: "The southeastern coast of Trogo faces
 * the southern ocean and the Azhor Stones, which are visible from the higher coastal headlands on
 * clear days." It stands at x = 650, z = 3406 - two thousand eight hundred metres out from Trogo's
 * nearest hex and past `WORLD_BOUNDS.maxX`, so it is horizon and nothing else. LAND_HEXES goes from
 * 2,078 to **2,079**, which is the smallest widening this window has ever had.
 *
 * Then **Selemi was added, and it moved neither the box nor the window** - which is said here because
 * five reports in a row have warned that a prediction about one is not a prediction about the other,
 * so both were measured. Its eight hexes are (-9,133) (-8,133) / (-9,134) (-8,134) (-7,134) /
 * (-9,135) (-8,135) (-7,135): centres x -950...-650 and z 2367.269...2540.474, its outer flats at
 * x = -1000 and -600 and its southernmost corners a circumradius past row 135 at z = 2598.209.
 * `worldBoundsFor` over every other country without it and over all of them with it answers the
 * same four numbers to the last digit - x -4610.001927939127...609.9980720608719 and
 * z -2167.195996001615...3264.4264805429416 - because the island stands 3,610 m inside the western
 * edge, 1,210 m inside the eastern, 4,477 m inside the northern and 666 m inside the southern. So the
 * coast lattice is the same 1,355 x 1,408 = 1,907,840 points it was, and every one of them falls in
 * the hex it fell in before. LAND_HEXES stays at 2,079 and does not change by a hex: all eight of
 * Selemi's were already in it as land - six of them since the Ascarths took `maxR` to 135 - so the
 * only thing this script writes differently is one more region in `PLAYABLE_SURVEY`.
 *
 * **One thing was found while measuring and is left as it was found**: sampled over the whole of
 * today's lattice, the hexes it reaches are q **-52**...34, r 79...145, and `minQ` here says -50. The
 * two columns came with the Ibenwood belt, which took the western edge from -4360.002 to -4610.002
 * after the paragraph above was written; they are reached only on rows 144 and 145, in the same
 * south-western corner of the sheet, and they hold no claimed hex (nothing on the atlas is west of
 * q = -39 in rows 79-145), so the generated file is identical either way. It is not this island's to
 * move and `tests/southwest-world.test.js` pins the -50, so it is reported rather than changed
 * (docs/selemis-report.md).
 *
 * Then **Telemonia was added, and it moved neither the box nor the window either**, measured both
 * ways as Selemi's case was (docs/telemonia-stage1-report.md). Its twenty-five hexes are rows 118-122,
 * q -17...-11: centres x -2350...-1850 and z 1068.2...1414.6, its outline at x -2400...-1800 and
 * z 1010.5...1472.3. That is 2,210 m inside the western edge West Ibenwood set, 2,410 m inside the
 * eastern one, 3,178 m inside the northern and 1,792 m inside the southern, so `worldBoundsFor` answers
 * the same four numbers with it as without it. All twenty-five were already land in LAND_HEXES - the
 * atlas has always claimed them, and the window has covered rows 118-122 since the Ascarths - so the
 * lattice, LAND_HEXES and every hex a sample falls in are as they were, and the only thing this
 * script writes differently is one more region in `PLAYABLE_SURVEY`.
 */
// Baldro reaches row 62 and the north-east corner of the playable world. The
// surrounding window includes every hex touched by the fixed-phase coast grid;
// its bounds are checked from the actual lattice in tests/baldro-world.test.js.
// Babon extends the terrain lattice south by two rows; its southwestern corner also reaches q=-53.
// Alezhor's west lobe (registered 4 October 2026) moves the western edge fifty metres to -4660.002, and the lattice's
// south-western corner with it to q=-54: open ocean, no claimed hex, and the generated survey byte-identical.
export const WINDOW = { minQ: -100, maxQ: 130, minR: 10, maxR: 175 };

export function buildSource(survey) {
  const name = region => region.name ?? region.id;
  const regions = PLAYABLE.map(id => {
    const region = survey.regions.find(candidate => name(candidate) === id);
    if (!region) throw new Error(`The atlas has no region called ${id}.`);
    const enclosed = (ENCLOSED_HEXES[id] ?? []).map(([q, r, terrain]) => ({ q, r, terrain }));
    return { id: region.id, name: id, bounds: region.bounds, centerX: region.centerX, centerY: region.centerY,
      cells: [...region.cells.map(cell => ({ q: cell.q, r: cell.r, terrain: cell.terrain })), ...enclosed] };
  });
  const land = [];
  for (const region of survey.regions) for (const cell of region.cells) {
    if (cell.q < WINDOW.minQ || cell.q > WINDOW.maxQ || cell.r < WINDOW.minR || cell.r > WINDOW.maxR) continue;
    land.push([cell.q, cell.r]);
  }
  // An enclosed hex is a hole the atlas left in somebody's country, not the sea: the coast field
  // counts it as land, and the region that holds it gives it its own ground.
  for (const held of Object.values(ENCLOSED_HEXES)) for (const [q, r] of held) land.push([q, r]);
  land.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const cells = region => region.cells.map(cell => `{q:${cell.q},r:${cell.r},terrain:'${cell.terrain}'}`).join(',');
  const wrap = (text, indent) => {
    const lines = []; let line = '';
    for (const piece of text.split(/(?<=,)/)) {
      if (line.length + piece.length > 150) { lines.push(line); line = ''; }
      line += piece;
    }
    if (line) lines.push(line);
    return lines.join(`\n${indent}`);
  };
  return `${HEADER}export const SURVEY_ORIGIN = Object.freeze({ x: ${survey.origin.x}, y: ${survey.origin.y} });

/** The playable regions, exactly as the atlas authored them. */
export const PLAYABLE_SURVEY = Object.freeze({
  origin: SURVEY_ORIGIN,
  regions: Object.freeze([
${regions.map(region => `    Object.freeze({ id: ${JSON.stringify(region.id)}, name: ${JSON.stringify(region.name)},
      bounds: Object.freeze(${JSON.stringify(region.bounds)}), centerX: ${region.centerX}, centerY: ${region.centerY},
      cells: Object.freeze([${wrap(cells(region), '        ')}]) }),`).join('\n')}
  ]),
});

/**
 * Every claimed atlas hex near the playable window, playable or not. A world
 * point inside one of these is land; anything else inside the world bounds is
 * the Stills, so coastlines follow the authored map instead of a drawn curve.
 */
export const LAND_HEXES = Object.freeze([
  ${wrap(land.map(([q, r]) => `[${q},${r}]`).join(','), '  ')}
]);
`;
}

const HEADER = `// GENERATED by scripts/build-region-survey.mjs from assets/azhora-dev-regions.json.
// Do not edit by hand; tests/region-survey.test.js checks it against the atlas.
`;

export function readAtlas() {
  return JSON.parse(readFileSync(path.join(root, 'assets/azhora-dev-regions.json'), 'utf8'));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build-region-survey.mjs')) {
  const target = path.join(root, 'src/region-survey.js');
  writeFileSync(target, buildSource(readAtlas()));
  console.log(`Wrote ${target}`);
}
