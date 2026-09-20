import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createAtlasTransform, LEGACY_ROAD_TRANSFORM, HEX_WORLD_TRANSFORM, TIDEHAVEN_ATLAS, METRES_PER_HEX, ATLAS_HEX_WIDTH, PLAYABLE_REGIONS, REGION_BIOMES,
  regionCells, regionOutline, pointInPolygon, regionAtWorld, cellAtWorld, worldBoundsFor, borderMidpoint, routeAnchors, compassHeading, findRegion,
} from '../src/region-layout.js';

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
  assert.ok(width > 6.8 * METRES_PER_HEX && width < 10 * METRES_PER_HEX, `Drent is ${width.toFixed(0)} m wide: larger than the old first-district strip`);
  assert.equal(regionOutline(survey, 'Nowhere').length, 0);
});

test('points resolve to regions and cells, and the world bounds enclose all four regions', () => {
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
  // West Izol lies far south of the mainland regions and Amod climbs north toward the
  // Lotharn, so the world is taller than it is wide: about 31 hexes north to south.
  assert.ok(bounds.maxX - bounds.minX < 25 * METRES_PER_HEX && bounds.maxZ - bounds.minZ < 32 * METRES_PER_HEX, 'the playable regions fit a walkable world');
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
