import test from 'node:test';
import assert from 'node:assert/strict';
import { projectTrailPoint, trailMapSVG, trailMapSelection, trailMapViewBounds } from '../src/trail-map.js';

function model() {
  return { region: { id: 1, name: 'Drent' }, currentRegionId: 1, bounds: { minX: -100, maxX: 100, minZ: -170, maxZ: 50 },
    player: { x: 0, z: 29, heading: Math.PI / 2 },
    paths: [[{ x: 0, z: 40 }, { x: 0, z: -80 }, { x: 7, z: -155 }]],
    waters: [{ kind: 'circle', x: 27, z: -77, radius: 5.4 }, { kind: 'polygon', points: [{ x: -100, z: 29 }, { x: 100, z: 29 }, { x: 100, z: 50 }, { x: -100, z: 50 }] }],
    buildings: [{ x: 15, z: 5, width: 5, depth: 4, angle: .2 }],
    landmarks: [{ id: 'harbor', name: 'Tidehaven Landing', description: 'A little landing.', x: 0, z: 29, known: true, discovered: true, trackable: true },
      { id: 'hidden', name: 'SECRET SHRINE NAME', description: 'SECRET LORE', x: -37, z: -87, known: false, discovered: false, trackable: true },
      { id: 'bee-fold', name: 'The Bee Fold', description: 'A place for bees.', x: 42, z: -35, known: true, discovered: true, trackable: true }],
    goal: { id: 'main-objective', name: 'Report to Lakota', x: 4, z: 20, known: true, trackable: false },
    openGoal: { id: 'long-road-bird-garden', name: 'Jean at the bird garden', x: -24, z: 4, known: true, trackable: false },
    tracked: { id: 'bee-fold', name: 'The Bee Fold', x: 42, z: -35, known: true, trackable: true } };
}

test('Trail projection keeps north up, equal distances on both axes and truthful clipping', () => {
  const m = model(), options = { width: 620, height: 390, padding: 28 };
  const a = projectTrailPoint({ x: 0, z: -60 }, m.bounds, options), north = projectTrailPoint({ x: 0, z: -80 }, m.bounds, options);
  const east = projectTrailPoint({ x: 20, z: -60 }, m.bounds, options);
  assert.ok(north.y < a.y); assert.ok(east.x > a.x);
  assert.ok(Math.abs(a.y - north.y - (east.x - a.x)) < .00001);
  assert.equal(projectTrailPoint({ x: 101, z: -60 }, m.bounds, options).inside, false);
  assert.equal(projectTrailPoint({ x: 0, z: -171 }, m.bounds, options).inside, false);
  assert.equal(projectTrailPoint({ x: 100, z: 50 }, m.bounds, options).inside, true);
});

test('Undiscovered places never leak names or lore and cannot be tracked', () => {
  const m = model(), selection = trailMapSelection(m, 'hidden'), before = JSON.stringify(m);
  assert.equal(selection.name, 'Unexplored'); assert.equal(selection.known, false); assert.equal(selection.trackable, false);
  assert.ok(!selection.description.includes('SECRET'));
  const svg = trailMapSVG(m, { selectedId: 'hidden', width: 530, height: 300 });
  assert.ok(svg.includes('Unexplored place')); assert.ok(svg.includes('data-trail-place="hidden"'));
  assert.ok(!svg.includes('SECRET')); assert.equal(JSON.stringify(m), before);
  assert.equal(trailMapSelection(m, 'invalid'), null);
});

test('The map separates the main objective, player heading and optional marker without mutating the model', () => {
  const m = model(), before = structuredClone(m), svg = trailMapSVG(m, { selectedId: 'bee-fold' });
  assert.ok(svg.includes('trail-goal-marker')); assert.ok(svg.includes('trail-tracked-marker')); assert.ok(svg.includes('trail-player-marker'));
  // Two golds on the sheet as well: the muster road's pin, and the long road's next stop drawn
  // with the same filled diamond (src/quest-markers.js).
  assert.ok(svg.includes('trail-open-goal-marker'), 'the long road is not on the sheet');
  assert.ok(svg.includes('the long way round'));
  const openSelection = trailMapSelection(m, 'long-road-bird-garden');
  assert.equal(openSelection.openObjective, true);
  assert.equal(openSelection.objective, false, 'it is not the arc, and never claims to be');
  assert.equal(trailMapSVG({ ...m, openGoal: null }).includes('trail-open-goal-marker'), false);
  assert.ok(svg.includes('rotate(90)')); assert.ok(svg.includes('trail-water')); assert.ok(svg.includes('trail-building')); assert.ok(svg.includes('trail-road'));
  assert.ok(svg.includes('role="button" tabindex="0"')); assert.ok(svg.includes('40 m'));
  assert.equal(trailMapSelection(m, 'bee-fold').tracked, true);
  assert.equal(trailMapSelection(m, 'main-objective').trackable, false);
  assert.deepEqual(m, before);
});

test('Outside-region markers are omitted, text is escaped and responsive view sizes remain finite', () => {
  const m = model(); m.goal = { id: 'far', x: 0, z: -400, name: 'Far objective', known: true };
  m.tracked = { id: 'far-pin', x: 0, z: -560, name: 'Far marker', known: true };
  m.landmarks[0].name = 'Landing <script> & "quay"';
  for (const [width, height] of [[320, 240], [510, 290], [790, 455]]) {
    const svg = trailMapSVG(m, { width, height });
    assert.ok(svg.includes('&lt;script&gt;')); assert.ok(!svg.includes('<script>'));
    assert.ok(!svg.includes('Far objective')); assert.ok(!svg.includes('Far marker'));
    assert.ok(!svg.includes('NaN')); assert.ok(!svg.includes('Infinity'));
    assert.ok(svg.includes(`viewBox="0 0 ${width} ${height}"`));
  }
});

test('Zoom uses native world bounds, follows a selected edge safely, and fits the whole region again', () => {
  const m = model(), before = structuredClone(m), options = { width: 580, height: 310, padding: 20 };
  const fit = trailMapViewBounds(m.bounds, { ...options, zoom: 1, center: m.landmarks[2] });
  const alternateFit = trailMapViewBounds(m.bounds, { ...options, zoom: 1, center: { x: -95, z: -165 } });
  assert.deepEqual(fit, alternateFit, 'selecting a place must not move the fitted chart');
  for (const point of [{ x: -100, z: -170 }, { x: 100, z: 50 }]) assert.ok(projectTrailPoint(point, fit, options).inside);
  const edge = { x: 98, z: 48 }, close = trailMapViewBounds(m.bounds, { ...options, zoom: 3, center: edge });
  assert.ok(projectTrailPoint(edge, close, options).inside, 'an edge selection must remain visible');
  assert.ok(close.minX >= m.bounds.minX && close.maxX <= m.bounds.maxX);
  assert.ok(close.minZ >= m.bounds.minZ && close.maxZ <= m.bounds.maxZ);
  const scaleBefore = projectTrailPoint(edge, fit, options).scale, scaleAfter = projectTrailPoint(edge, close, options).scale;
  assert.ok(Math.abs(scaleAfter - scaleBefore * 3) < 1e-8, 'zoom must change map scale without stretching either axis');
  assert.deepEqual(trailMapViewBounds(m.bounds, { ...options, zoom: 99, center: edge }), close, 'zoom is capped at three times');
  assert.deepEqual(trailMapViewBounds(m.bounds, { ...options, zoom: 0 }), fit);
  assert.deepEqual(m, before);
});

test('The bird the traveler is watching is marked on the sheet, and nowhere else', () => {
  const m = model(), before = structuredClone(m);
  assert.ok(!trailMapSVG(m, { width: 580, height: 330 }).includes('trail-bird-marker'), 'no bird, no mark');
  // On the sheet: a pair of wings where it is, no pin, nothing clickable.
  const svg = trailMapSVG({ ...model(), bird: { id: 'wren-0', x: 12, z: 14 } }, { width: 580, height: 330 });
  assert.ok(svg.includes('trail-bird-marker'));
  assert.ok(svg.includes('A bird within your reach'));
  assert.ok(!svg.includes('data-trail-place="wren-0"'), 'the bird is not a place to select');
  assert.ok(!svg.includes('wren'), 'the sheet never names the species, identified or not');
  assert.ok(!svg.includes('NaN') && !svg.includes('Infinity'));
  // Off this region's sheet, or nonsense, and it is simply not drawn.
  for (const bird of [{ x: 400, z: 14 }, { x: 12, z: -900 }, { x: NaN, z: 14 }, { x: 12 }, null, undefined])
    assert.ok(!trailMapSVG({ ...model(), bird }, { width: 580, height: 330 }).includes('trail-bird-marker'), JSON.stringify(bird));
  assert.deepEqual(m, before);
});

test('Zoom clips offscreen markers and never reveals an unknown place identity', () => {
  const m = model(), before = structuredClone(m);
  const svg = trailMapSVG(m, { width: 580, height: 310, zoom: 3, center: m.landmarks[1], selectedId: 'hidden' });
  assert.ok(svg.includes('data-trail-place="hidden"'));
  assert.ok(!svg.includes('SECRET'));
  assert.ok(!svg.includes('data-trail-place="harbor"'));
  assert.ok(!svg.includes('trail-player-marker'));
  assert.ok(!svg.includes('NaN') && !svg.includes('Infinity'));
  assert.deepEqual(m, before);
});
