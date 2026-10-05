import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createAtlasTransform, LEGACY_ROAD_TRANSFORM, HEX_WORLD_TRANSFORM, TIDEHAVEN_ATLAS, METRES_PER_HEX, ATLAS_HEX_WIDTH, PLAYABLE_REGIONS, REGION_BIOMES,
  regionCells, regionOutline, pointInPolygon, regionAtWorld, cellAtWorld, worldBoundsFor, borderMidpoint, routeAnchors, compassHeading, findRegion,
} from '../src/region-layout.js';
import { REGION_IDS } from '../src/region-world.js';
import { PLAYABLE } from '../scripts/build-region-survey.mjs';

const survey = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
const close = (a, b, tolerance = 1e-6) => Math.abs(a - b) <= tolerance;

test('a transform round-trips and keeps world -Z pointing where it says on the atlas', () => {
  for (const transform of [LEGACY_ROAD_TRANSFORM, HEX_WORLD_TRANSFORM, createAtlasTransform({ anchorAtlas: { x: 10, y: 20 }, anchorWorld: { x: -5, z: 7 }, forwardAtlas: { x: 1, y: 1 }, pixelsPerMetre: .5 })]) {
    for (const [x, z] of [[0, 29], [40, -600], [-93, 12.5]]) {
      const atlas = transform.worldToAtlas(x, z), back = transform.atlasToWorld(atlas.x, atlas.y);
      assert.ok(close(back.x, x, 1e-9) && close(back.z, z, 1e-9), `round trip ${x},${z}`);
    }
    const origin = transform.worldToAtlas(0, 29), ahead = transform.worldToAtlas(0, 29 - 100);
    const dx = ahead.x - origin.x, dy = ahead.y - origin.y, length = Math.hypot(dx, dy);
    assert.ok(close(length, 100 * transform.pixelsPerMetre, 1e-9), 'distance scales by pixels per metre');
    assert.ok(close(dx / length, transform.forward.x, 1e-9) && close(dy / length, transform.forward.y, 1e-9), 'walking up -Z follows the forward direction');
  }
  assert.ok(close(HEX_WORLD_TRANSFORM.northOffset, 0));
  assert.ok(close(HEX_WORLD_TRANSFORM.metresPerHex, METRES_PER_HEX, 1e-9));
  const legacyBearing = ((LEGACY_ROAD_TRANSFORM.northOffset * 180 / Math.PI) % 360 + 360) % 360;
  assert.ok(legacyBearing > 225 && legacyBearing < 270, `today’s road runs west-south-west on the chart, bearing ${legacyBearing.toFixed(1)}`);
});

test('the traveler’s marker on the chart moves from the Drent coast toward Luscia along today’s road', () => {
  const start = LEGACY_ROAD_TRANSFORM.worldToAtlas(0, 29);
  assert.ok(close(start.x, TIDEHAVEN_ATLAS.x) && close(start.y, TIDEHAVEN_ATLAS.y));
  const relay = LEGACY_ROAD_TRANSFORM.worldToAtlas(0, -659);
  assert.ok(relay.x < start.x && relay.y > start.y, 'the relay lies south-west of the landing');
  const drent = findRegion(survey, 'Drent'), luscia = findRegion(survey, 'Luscia');
  const inside = (region, point) => point.x >= region.bounds.x && point.x <= region.bounds.x + region.bounds.width && point.y >= region.bounds.y && point.y <= region.bounds.y + region.bounds.height;
  assert.ok(inside(drent, start), 'the landing is in Drent');
  assert.ok(inside(luscia, relay), 'Threefold Rise lies inside Luscia’s bounds');
  assert.ok(inside(drent, LEGACY_ROAD_TRANSFORM.worldToAtlas(0, -400)), 'the Caloss crossing is still Drent');
});

test('rebuilt regions take their outlines and cells from the authored hexes at the chosen scale', () => {
  for (const id of PLAYABLE_REGIONS) {
    const cells = regionCells(survey, id);
    assert.equal(cells.length, findRegion(survey, id).cells.length, id);
    assert.ok(cells.every(cell => cell.biome === REGION_BIOMES[id].id));
    const loops = regionOutline(survey, id);
    assert.ok(loops.length >= 1, `${id} has an outline`);
    assert.ok(loops[0].length >= 6);
    for (const cell of cells) assert.ok(loops.some(loop => pointInPolygon(loop, cell.x, cell.z)), `${id} cell ${cell.q},${cell.r} lies inside its outline`);
    const softened = regionOutline(survey, id, HEX_WORLD_TRANSFORM, { soften: 2 });
    assert.equal(softened[0].length, loops[0].length * 4);
  }
  const drent = regionOutline(survey, 'Drent')[0];
  const width = Math.max(...drent.map(p => p.x)) - Math.min(...drent.map(p => p.x));
  // Sizes are stated in hexes, so the check survives a change of world scale.
  assert.ok(close(width / METRES_PER_HEX, 11.5, .0001), `Drent includes the eastern peninsula: ${width.toFixed(0)} m wide`);
  assert.equal(regionOutline(survey, 'Nowhere').length, 0);
});

test('points resolve to regions and cells, and the world bounds enclose all playable regions', () => {
  const anchors = routeAnchors(survey);
  assert.equal(regionAtWorld(survey, anchors.drentHeart.x, anchors.drentHeart.z), 'Drent');
  assert.equal(regionAtWorld(survey, anchors.lauvelField.x, anchors.lauvelField.z), 'Luscia');
  assert.equal(regionAtWorld(survey, anchors.legionCamp.x, anchors.legionCamp.z), 'Moros Plain');
  assert.equal(regionAtWorld(survey, anchors.suvalHills.x, anchors.suvalHills.z), 'East Suval');
  assert.equal(regionAtWorld(survey, 5000, 5000), null);
  assert.equal(cellAtWorld(survey, anchors.drentHeart.x, anchors.drentHeart.z)?.region, 'Drent');
  assert.equal(cellAtWorld(survey, 5000, 5000), null);
  const bounds = worldBoundsFor(survey);
  for (const [, point] of Object.entries(anchors)) assert.ok(point.x > bounds.minX && point.x < bounds.maxX && point.z > bounds.minZ && point.z < bounds.maxZ);
  /**
   * **The hex budget, and what actually spends it.** West Izol lies far south of the
   * mainland regions and Amod climbs north toward the Lotharn, so the world has been
   * taller than it is wide since they landed: 30.93 hexes north to south, set by those
   * two and unchanged by anything since.
   *
   * East to west it was 29.2 through the four western regions and through Eer, because
   * Eer lies inside the box Caricas already made — the first of the six south-western
   * countries widened the world by nothing at all, and the budget was deliberately not
   * raised for it. **Isareos is the one that spends it**: its western rim stands at
   * x = -2850 against the Ibenwood, which takes the world's edge from -2310 to -2960
   * and its width to 35.7 hexes.
   *
   * **Nethereum spends fifty metres more of it, and that is all it spends.** Its one
   * `plains` hex, the north-western corner against the Nether Desert, has its centre at
   * x = -2900 — half a hex west of Isareos's rim — so the world's edge goes from -2960 to
   * -3010 and its width from 35.70 to 36.20 hexes, measured. North to south it changes
   * nothing: 30.93 hexes, still set by West Izol and Amod. So the guard goes to 37 and no
   * further, and the lower bound with it. The four countries still to come reach further
   * west again (the Nether Desert's own hexes are at -3050) and each will have to state its
   * own case.
   */
  /*
   * **The East Lotharn spends four hexes and a third north to south, and states its case.** Amod
   * set the northern edge at its own hills, -868; the range it is the foothills of runs on north
   * from there to the South Mithala border, and its northern row of hexes has its centres at
   * z = -1183, so the edge goes to -1301 and the height from 30.93 hexes to 35.26. That is the
   * whole of one country, the old range the Empire arc's level-three chapters are set in, and it
   * takes nothing east or west. So the north-south guard goes to 36 and no further.
   */
  /*
   * **The two Ascarths spend the last hex and three-quarters of it north to south, and state their
   * case.** West Izol set the southern edge at 2225; the Ascarth Peninsula runs on south of it as a
   * finger into the Iberos Sea, and Southern Ascarth's tip is the atlas's row 132, its hex centred at
   * z = 2281, so the edge goes to 2398 and the height from 35.26 hexes to 36.996 - measured. That is
   * the whole of two countries, the neck and the tip of one peninsula, and they take nothing east or
   * west: the peninsula lies inside the box Nethereum and Drent already made. So the north-south guard
   * goes to 37 and no further, with four-tenths of a metre to spare, and it gets a floor of its own.
   */
  /*
   * **The four Mithala countries spend eight hexes and two thirds of one north to south, which is
   * more than any country has spent in one direction, and they state their case.** The East Lotharn
   * set the northern edge at its own northern row, -1301; the plain that range is the southern wall
   * of runs on north of it to the Acor Wetlands, and North Mithala's northernmost hex is the atlas's
   * row 82, centred at z = -2049.5 with its top corner at -2107.2, so the edge goes to **-2167.196**
   * and the height from 36.996 hexes to **45.656** - measured, not estimated. That is four whole
   * countries and 116 hexes, more than double any previous job, and they take nothing east or west:
   * the plain lies inside the box Nethereum and Drent already made (x -2400…-950 against -3010…610).
   * Each one's own case: South Mithala reaches row 89 and would have spent nothing on its own, since
   * the East Lotharn already stood at 92; West Mithala reaches 87; East Mithala 86; and **North
   * Mithala alone spends the last four rows**, 85 down to 82. So the north-south guard goes to 46
   * and no further, with three and a half hexes to spare, and its floor goes with it.
   *
   * The survey window moved with the world: `WINDOW.minR` from 90 to 79, measured off the coast
   * lattice (scripts/build-region-survey.mjs), which turned 329 claimed hexes in seventeen countries
   * from sea into land along the whole northern horizon.
   */
  /*
   * **The four southwestern countries spend nine hexes and a half east to west, which is more than
   * anything has spent in that direction, and they state their case.** Nethereum set the western
   * edge at its own north-western hex, -3010.002; the driest quarter of the continent runs on west
   * of it past the unbuilt Ibenwood belt, and **the Ganesh Desert alone spends it**: its westernmost
   * hexes are (-33,123) through (-33,126), whose outer flat stands at x = -3900, so the edge goes to
   * **-3960.002** and the width from 36.20 hexes to **45.70** - measured, not estimated. Each one's
   * own case: Navarth reaches x = -3600 and would have spent six hexes on its own; West Pyros
   * reaches -3200 and the Ganesh Plain -3250, and neither would have spent anything the other three
   * did not; **the Ganesh Desert alone spends the last three columns**. North to south they take
   * nothing at all: the whole block lies between z = 837 and z = 1905, inside the box the East
   * Lotharn, the Mithala plain and the two Ascarths already made. So the east-west guard goes to 46
   * and no further, and its floor goes with it, and the world is now very nearly square: 45.70 by
   * 45.656.
   *
   * The survey window moved with the world again: `WINDOW.minQ` from -33 to **-41**, measured off
   * the coast lattice, which turned 71 claimed hexes in six countries from sea into land along the
   * block's western horizon - Cape Heth 19, the Dinelv Highlands 14, South Ibenal 14, the West
   * Meroshe Desert 13, Alezhor 7 and West Ibenwood 4. None of the 71 is the block's own.
   *
   * **Then the four Meroshe deserts took the south, and that one nobody saw coming.** Their brief
   * predicted no movement at all, and it was right about the west: the westernmost Meroshe hex is
   * the West Meroshe's (-37,133) at x = -3750, a hundred and fifty metres inside the edge the Ganesh
   * Desert set, so `minX` does not move. What moves is the other axis. The South Meroshe Desert's
   * southernmost hexes are (-32,141) and (-31,141), centres at z = 3060.089 and lower vertices a
   * circumradius past that at 3117.824, so the southern edge goes from 2398.401 to **3177.824** and
   * the height from 45.656 hexes to **53.450** - measured, not estimated. Each one's own case: the
   * North Meroshe reaches z = 2281 and the West 2627, inside the Ascarth tip's own box; the Central
   * reaches 2714 and would have spent four rows on its own; **the South Meroshe alone spends the last
   * three.** So the north-south guard goes to 54 and its floor to 53.4, and the world is no longer
   * square: **45.70 by 53.450**, taller than it is wide for the first time since the Ascarths, and
   * there is no direction left that a playable country has not spent.
   *
   * Then **Cape Heth widened it west again**, from 45.70 to **49.700**, and that move is worth reading
   * twice because job 2's report predicted it would not happen. The prediction was that job 3's three
   * countries lie inside the survey *window*, which is true; the box is a different thing. `x = W(q + r/2)`,
   * so Cape Heth's q -39 at row 127 stands four hundred metres west of the Ganesh Desert's q -33 at row
   * 123. Its westernmost hex is the one `coast` hex the atlas puts inside any country, (-39,127), centre
   * x = -4250, outer flat -4300, margin 60 -> `minX` **-4360.001927939127**. Nothing else moves: the
   * Dinelv Highlands reach -3900, Hama -3500, and Hama's southernmost row ties the South Meroshe's to the
   * millimetre without passing it. The world is **49.700 by 53.450**.
   *
   * Then **Trogo carried the southern edge once more** (docs/southwest-4-report.md), which is the fourth
   * time this guard has moved and the last time the southwest quarter can move it: Trogo's three
   * southernmost hexes are (-29,142), (-28,142) and (-27,142), their centres at z = 3146.69 and their
   * lower vertices a circumradius (57.735 m) past that at 3204.43, so the southern edge goes from
   * 3177.824 to **3264.4264805429416** and the height from 53.450 hexes to **54.316**. Each one's own
   * case again: Marosh's southernmost row is 135 and is nowhere near it, and nothing in job 4 reaches
   * within eleven hundred metres of Cape Heth's western edge. So the north-south guard goes to 55 and its
   * floor to 54.2, and the world is **49.700 by 54.316**.
   *
   * `WINDOW.minQ` -45 -> **-49** with it, measured off the lattice, and **that widening pulls in nothing
   * at all**: the four columns q -49...-46 hold no claimed hex anywhere on the atlas in rows 79-144,
   * because west of Cape Heth the map is open ocean to the edge of the sheet. LAND_HEXES stays at 2,078
   * and the generated survey is identical either way; the window moves because the invariant it keeps is
   * "the last column the lattice reaches, and no slack".
   *
   * The window moved in **both** axes for it, which is new: `maxR` 135 -> 144 is the lattice's own
   * last row, and `minQ` -41 -> -45 came with it for free, because x = W(q + r/2) puts a low q and a
   * high r at the same world x - a lattice nine rows further south reaches four columns further west
   * without any country reaching an inch in that direction. 143 more claimed hexes turn from sea into
   * land: Babon 50, Trogo 29, Hama 19, the Azhor Stones 12 - and **thirty-three of the block's own**,
   * which job 1's 71 did not include one of. Without it the whole of the South Meroshe Desert would
   * have been open water in the middle of a playable country.
   */
  /**
   * **The merge with the Ibenwood belt took the western edge, and nothing else.** Landing the
   * seventeen southwestern countries on top of Codex's five Ibenwoods, the South Oremindi Mountains
   * and Yunethre is the first time two blocks of country have been measured against this guard at
   * once, and the result is cleaner than it had any right to be: **each axis is owned outright by
   * one side**. West Ibenwood's rim stands at x = -4550, two hundred and fifty metres west of Cape
   * Heth's -4300, so the **width is theirs** - 52.200 hexes - and the thirteen southwestern
   * countries did not widen it by a millimetre. The **height is ours** - 54.316 hexes, North
   * Mithala's row 82 to Trogo's row 142 - and their seven did not touch it; the Ibenwood belt on its
   * own stood 36.996 hexes tall, which is where the Ascarth Peninsula had left it. So the merged box
   * is max() per axis with no interaction term, and 52.3 is **Codex's own ceiling**, kept as they
   * wrote it rather than recomputed.
   */
  /**
   * **Selemi spends nothing in either direction, and states its case like everybody else.** The island
   * is eight hexes one row of water south of the Ascarth tip - centres x -950...-650, z 2367.269...2540.474,
   * its outline's corners at x -1000.002 and -600.002 and z 2309.534 and 2598.209 - and every one of
   * those is deep inside the box the others made: 3,610 m from the western edge West Ibenwood set,
   * 1,210 m from the eastern one Drent set, 4,477 m from the northern one North Mithala set and 666 m
   * from the southern one Trogo set. Measured rather than assumed, because the last five countries'
   * briefs each predicted no movement and four of them were wrong: `worldBoundsFor` over the list
   * without it answers the same four numbers as over the list with it, to the last digit, and that is
   * asserted here so that it stays measured. The budget does not move and neither does its floor.
   */
  assert.deepEqual(worldBoundsFor(survey, HEX_WORLD_TRANSFORM, PLAYABLE_REGIONS.filter(name => name !== 'Selemi')), bounds,
    'the island across the channel from the Ascarth tip moves the world box');
  /**
   * **Telemonia spends nothing either, and says so the same way.** Twenty-five hexes in rows 118-122,
   * q -17...-11 - centres x -2350...-1850 and z 1068.230...1414.641, its outline at x -2400.002...-1800.002
   * and z 1010.495...1472.376 - landlocked between the Oves Desert, Gala, Legemum and East Pyros, and
   * 2,210 m inside the western edge, 2,410 m inside the eastern, 3,178 m inside the northern and 1,792 m
   * inside the southern (docs/telemonia-stage1-report.md). Measured, and held here.
   */
  assert.deepEqual(worldBoundsFor(survey, HEX_WORLD_TRANSFORM, PLAYABLE_REGIONS.filter(name => name !== 'Telemonia')), bounds,
    'the Telemon highland moves the world box');
  // Baldro sets the north/east edges. Babon extends the south by two atlas rows
  // (173.205 m), to z3437.632: 68.2 hexes wide and 73.3688 tall.
  // Alezhor's coast (registered 4 October 2026) moves the west edge out by 50 m, to x-4660.002: 68.7 hexes wide.
  // South Ibenal's coast (registered 4 October 2026) moves it out again, to x-4860.002: 70.7 hexes wide.
  assert.ok(bounds.maxX - bounds.minX < 70.8 * METRES_PER_HEX, 'the playable regions fit a walkable world east to west');
  assert.ok(bounds.maxZ - bounds.minZ < 73.4 * METRES_PER_HEX, 'and north to south');
  // And it is a budget rather than a shrug: a country that widened the world without
  // anybody noticing would sail through a guard with room in it.
  assert.ok(bounds.maxX - bounds.minX > 68.1 * METRES_PER_HEX, 'the world is narrower than the budget says: raise nothing, lower this');
  assert.ok(bounds.maxZ - bounds.minZ > 73.3 * METRES_PER_HEX, 'the world is shorter than the budget says: raise nothing, lower this');
});

/**
 * **The permanent guard the fourth generation of one mistake earned.**
 *
 * Four separate test files have now written "these are the last N regions in the list" when what
 * they meant was "these come after everything that was there before", and every one of them broke
 * the next time somebody appended a country: the West Lotharn builder rewrote it in
 * `tests/oves-world.test.js`, the Mithala builder in `tests/west-lotharn-world.test.js`, the
 * southwest's job 1 in `tests/mithala-world.test.js` twice over, and job 2 in
 * `tests/southwest-world.test.js`. The idiom is the bug, not the number in it.
 *
 * So this is the invariant the idiom was always reaching for, stated once, for every country, with no
 * count in it at all: **`PLAYABLE_REGIONS` is in strictly increasing `REGION_IDS` order, the ids run
 * 1..n with no gaps, and the survey script's own `PLAYABLE` is the same list in the same order.** A
 * country appended at the end passes it; a country inserted anywhere else fails it, which is exactly
 * what the scatter stream needs (`world-regions.js` walks this list with one seeded stream, so a name
 * put anywhere but the end re-rolls every region after it). Nobody needs to write "last N" again.
 */
test('the region order is the id order, with no gaps and nothing inserted', () => {
  const ids = PLAYABLE_REGIONS.map(name => REGION_IDS[name]);
  for (const [index, name] of PLAYABLE_REGIONS.entries())
    assert.ok(Number.isInteger(ids[index]), `${name} has no region id`);
  for (let i = 1; i < ids.length; i++)
    assert.ok(ids[i] > ids[i - 1], `${PLAYABLE_REGIONS[i]} (${ids[i]}) comes after ${PLAYABLE_REGIONS[i - 1]} (${ids[i - 1]})`);
  assert.deepEqual(ids, Object.keys(REGION_IDS).map((_, i) => i + 1), 'the ids are 1..n with no gaps');
  assert.equal(Object.keys(REGION_IDS).length, PLAYABLE_REGIONS.length, 'every id is a playable region and back');
  // The survey script's own PLAYABLE is the same *set* and deliberately not the same order: it was
  // written in build order and `PLAYABLE_REGIONS` in scatter order, and the two diverged long before
  // this guard (Eer and Gala sit in different places in each). What has to hold is that neither list
  // has a country the other has not.
  assert.deepEqual([...PLAYABLE].sort(), [...PLAYABLE_REGIONS].sort(), 'the survey script builds the same countries');
});

test('route anchors follow the brief: Tidehaven on the coast, the Caloss on the Luscia border, the Moros west, Elod north-east', () => {
  const anchors = routeAnchors(survey);
  assert.ok(anchors.tidehaven.x > anchors.drentHeart.x, 'Tidehaven lies on Drent’s eastern coast');
  assert.ok(anchors.calossCrossing.x < anchors.drentHeart.x && anchors.calossCrossing.z > anchors.drentHeart.z, 'the Caloss crossing is south-west of Drent’s heart');
  assert.ok(anchors.lauvelField.z > anchors.calossCrossing.z, 'Luscia lies beyond the crossing to the south');
  assert.ok(anchors.legionCamp.x < anchors.lauvelField.x, 'the Moros Plain lies west of Luscia');
  assert.ok(anchors.suvalHills.z > anchors.lauvelField.z, 'East Suval lies south of Luscia');
  assert.ok(anchors.elod.z < anchors.suvalHills.z && anchors.elod.x > anchors.suvalHills.x, 'Elod is in East Suval’s north-east');
  assert.ok(borderMidpoint(survey, 'Drent', 'Moros Plain') === null, 'Drent and the Moros do not touch');
  assert.equal(routeAnchors({ regions: [] }), null);
  const border = borderMidpoint(survey, 'Luscia', 'East Suval');
  assert.ok(Math.hypot(border.x - anchors.suvalBorder.x, border.z - anchors.suvalBorder.z) < 1e-9);
});

test('the compass reports true bearings for either transform', () => {
  assert.equal(compassHeading(0, HEX_WORLD_TRANSFORM).label, 'N');
  assert.equal(compassHeading(Math.PI / 2, HEX_WORLD_TRANSFORM).label, 'W');
  assert.equal(compassHeading(-Math.PI / 2, HEX_WORLD_TRANSFORM).label, 'E');
  const facingRoad = compassHeading(0, LEGACY_ROAD_TRANSFORM);
  assert.ok(['SW', 'W'].includes(facingRoad.label), `looking up today’s road is ${facingRoad.label}`);
  const facingSea = compassHeading(Math.PI, LEGACY_ROAD_TRANSFORM);
  assert.ok(['NE', 'E'].includes(facingSea.label), `looking back at the landing is ${facingSea.label}`);
  assert.equal(compassHeading(0).labels.length, 8);
});

test('a world heading comes onto the chart through the same rotation the position does', () => {
  const t = HEX_WORLD_TRANSFORM;
  const degrees = radians => radians * 180 / Math.PI;
  // World -Z is north, and its bearing on the chart is what northOffset means, by definition.
  assert.ok(Math.abs(t.worldHeadingToAtlas(Math.PI) - t.northOffset) < 1e-9);
  // The four quarters stay a right angle apart and keep their order going clockwise.
  const north = t.worldHeadingToAtlas(Math.PI), east = t.worldHeadingToAtlas(Math.PI / 2);
  const south = t.worldHeadingToAtlas(0), west = t.worldHeadingToAtlas(-Math.PI / 2);
  const turn = (from, to) => ((degrees(to) - degrees(from)) % 360 + 540) % 360 - 180;
  assert.ok(Math.abs(turn(north, east) - 90) < 1e-6, 'east is a right turn from north');
  assert.ok(Math.abs(turn(east, south) - 90) < 1e-6, 'south is a right turn from east');
  assert.ok(Math.abs(turn(south, west) - 90) < 1e-6, 'west is a right turn from south');
  // A heading that points the way the traveler walks: the marker and the step agree.
  for (const yaw of [0, .7, 1.9, -2.4, Math.PI]) {
    const bearing = t.worldHeadingToAtlas(yaw);
    const here = t.worldToAtlas(0, 0), ahead = t.worldToAtlas(Math.sin(yaw) * 50, Math.cos(yaw) * 50);
    const walked = Math.atan2(ahead.x - here.x, -(ahead.y - here.y));
    assert.ok(Math.abs(turn(bearing, walked)) < 1e-6, `the pointer faces the way a step goes (yaw ${yaw})`);
  }
  assert.equal(t.worldHeadingToAtlas(Number.NaN), null, 'and no heading hides the pointer');
});
