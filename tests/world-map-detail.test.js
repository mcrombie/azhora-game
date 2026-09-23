import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasCellKey, atlasLocalDetail, atlasMarkKnown, GLIMPSED_TERRAIN } from '../src/world-map-detail.js';
import { TRANSFORM, hexAt, hexCentre } from '../src/region-world.js';
import { buildLocalMapModel } from '../src/local-map-data.js';
import { regions, regionAt, WORLD_BOUNDS } from '../src/regions.js';

test('the atlas close view uses the same world transform for roads, houses and quest destinations', () => {
  const house = { x: -600, z: 130, width: 6, depth: 8, angle: Math.PI / 2 };
  const model = { paths: [[{ x: -603, z: 130 }, { x: -615, z: 140 }]], buildings: [house],
    goal: { id: 'bridge', name: 'Mend the Caloss bridge', x: -615, z: 140 },
    landmarks: [{ id: 'known', name: 'Chip', known: true, x: -600, z: 134 }] };
  const before = structuredClone(model), detail = atlasLocalDetail(model);
  assert.deepEqual(detail.paths[0][1], TRANSFORM.worldToAtlas(-615, 140));
  assert.deepEqual(detail.buildings[0][0], TRANSFORM.worldToAtlas(-604, 133));
  assert.deepEqual(detail.markers.find(p => p.id === 'bridge'), { id: 'bridge', name: 'Mend the Caloss bridge', kind: 'quest', ...TRANSFORM.worldToAtlas(-615, 140), markerKind: 'main', colour: '#f3c46a' });
  assert.deepEqual(model, before, 'viewing detail neither discovers places nor edits the adventure');
});

test('unknown names and missing cast locations never become local marks, and broken paths remain broken', () => {
  const detail = atlasLocalDetail({ paths: [[{ x: 0, z: 0 }, { x: 1, z: 1 }, undefined, { x: 5, z: 5 }, { x: 6, z: 6 }]],
    landmarks: [undefined, { id: 'secret', name: 'Secret hideout', x: 0, z: 0 }, { id: 'removed', name: 'Removed NPC', known: true }],
    goal: { id: 'missing', name: 'Missing destination' } });
  assert.equal(detail.paths.length, 2);
  assert.deepEqual(detail.markers, []);
  assert.deepEqual(atlasLocalDetail(null), { paths: [], buildings: [], markers: [] });
});

test('an adjacent tile provides terrain only until the traveler enters it', () => {
  const center = hexCentre(10, 106), adjacent = hexCentre(11, 106);
  const mark = { id: 'next-place', name: 'Unvisited detail', ...TRANSFORM.worldToAtlas(adjacent.x, adjacent.z) };
  const h = hexAt(center.x, center.z), visited = new Set([`${h.q},${h.r}`]);
  assert.equal(atlasCellKey(mark), '11,106');
  assert.equal(atlasMarkKnown(mark, visited), false);
  visited.add('11,106');
  assert.equal(atlasMarkKnown(mark, visited), true);
  assert.equal(atlasMarkKnown(mark, new Set(), true), true, 'developer reveal remains explicit');
  assert.ok(GLIMPSED_TERRAIN.forest !== GLIMPSED_TERRAIN.mountain);
  assert.equal(atlasCellKey(undefined), null);
});

test('the unified atlas carries discovered detail in other regions without losing quest colors', () => {
  const here = hexCentre(10, 106), remote = hexCentre(-2, 112);
  const world = { bounds: WORLD_BOUNDS, regions, regionAt,
    landmarks: [{ id: 'remote', name: 'An earlier stop', ...remote }],
    colliders: [{ kind: 'house', ...remote, width: 6, depth: 4 }], paths: [[here, remote]] };
  const options = { world, position: here, discoveries: new Set(['remote']), goal: { id: 'remote', name: 'Repair the crossing', ...remote, markerKind: 'deed' } };
  assert.equal(buildLocalMapModel(options).landmarks.some(p => p.id === 'remote'), false);
  const global = buildLocalMapModel({ ...options, globalDetail: true });
  assert.ok(global.landmarks.some(p => p.id === 'remote'));
  assert.equal(global.buildings.length, 1);
  assert.equal(global.goal.markerKind, 'deed');
  const marker = atlasLocalDetail(global).markers.find(p => p.id === 'remote');
  assert.equal(marker.colour, '#c87a3c');
  assert.equal(atlasMarkKnown(marker, new Set(['10,106'])), false, 'global detail remains hidden until its hex is confirmed');
});
