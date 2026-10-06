import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sampleLattice, leastFall, reachedByCountry, shutGate, travel, caveLinks, LETHAL_FALL } from './lattice-flood.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { createClimbing, climbForbidden, sampleClimbSurface, canWalkSlope, CLIMBING } from '../src/gameplay/movement/climbing.js';
import { hexOwnerAt, hexAt, hexCentre, insideRegion, regions } from '../src/world/terrain/region-world.js';
import { groundWithRiver, groundBeforeVarn } from '../src/world/terrain/world-terrain.js';
import { longestTowerGap } from '../src/world/scenery/fortification.js';
import { AMBRON_STANDARD } from '../src/content/regions/ambron/ambron.js';
import { PASS_ROAD, PASS_ROAD_LINE, RAMPS, BANDS, peakUplift } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { CAVE_LINES } from '../src/content/regions/east-lotharn/east-lotharn-caves.js';
import { belowFirstLedge, onPeakWay, RAMPS_KEEP_THEIR_HOLD } from '../src/content/regions/west-lotharn/lotharn-first-course.js';
import { AMOD_ROAD, KELMOD_ROAD_END } from '../src/content/regions/amod/amod-world.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { SETTLEMENTS, describeRegion } from '../src/content/chapters/civil-war/campaign-world.js';
import { BUILD_STATUS } from '../src/dev/tools/build-status.js';
import { NO_CLIMB_ZONES, unclimbableAt } from '../src/gameplay/movement/no-climb-zones.js';
import { CLOSED_PLACES, CLOSED_BORDERS, closedRegionEntered, createBorderWatch } from '../src/world/travel/closed-border.js';
import { maxWind, maxHealth } from '../src/gameplay/combat/combat-skills.js';
import { TERRAIN_FALL } from '../src/gameplay/movement/terrain-fall.js';
import { WALL_FIGURES, createWallWatch, patrolAt } from '../src/world/life/town-life.js';
import { SOLDIER_ROLES } from '../src/content/characters/cast.js';
import { VARN_GARRISON, FORT_GARRISONS, LOTHARN_GARRISON_FIGURES, garrisonSummary, PATROL_PACE } from '../src/content/regions/varn/varn-garrison.js';
import { LOTHARN_FORTS } from '../src/content/regions/west-lotharn/lotharn-forts.js';
import {
  VARN, VARN_STANDARD, VARN_CIRCUIT, VARN_CORNERS, VARN_PASS_GATE, VARN_AMOD_GATE, VARN_JAMBS, JAMB, LANDING, VARN_PARAPETS, PARAPET, VARN_WATCHES, VARN_FLOOR, VARN_WARD, VARN_WARD_WALL,
  VARN_KEEP, VARN_BUILDINGS, VARN_SQUARE, VARN_ROAD, VARN_ROAD_HEAD, VARN_STREET, VARN_DESCENT, VARN_DESCENT_PROFILE, VARN_LANDMARKS,
  VARN_SLABS, SLAB, VARN_ROCK, VARN_NEIGHBOURHOOD, RIB, VARN_WICKET, VARN_CLOSED,
  LOTHARN_PASSES_SHUT, varnGateShut, varnWicket, varnFloor, varnJambRise, jambTop, onLanding, varnGround, varnDitchCut, varnKeepsClear, varnUnclimbable, varnSurface,
  onSlab, slabFoot, lipRib, lipRuleApplies, onLip, onWayShoulder, inVarnRock, inVarnNeighbourhood, LIP_STOPS, stopRib, varnBeforeLips,
  CAVE_WAY, CAVE_RAILS, RAIL, onCaveWay, railRib,
} from '../src/content/regions/varn/varn-world.js';

/**
 * Varn (the user, 2 October 2026): "a heavily and beautifully fortified city called Varn that has walls
 * that are built into the mountains and completely surround the perimeter of the city making that
 * mountain pass completely impassable. Adjust the mountains if needed to make sure this city becomes the
 * key strategic chokehold blocking movement south from this mountain pass." And later the same day, having
 * seen it: "1. There should be a very difficult climber's route. 2. All gates shut by default. 3. garrison
 * the walls."
 *
 * **Impassable is measured here, not asserted.** The pure half of this file holds the plan to the atlas
 * and to itself. The built half floods the real ground round the city with the game's own rules
 * (tests/lattice-flood.js), walks a traveler at the walls with the game's own `moveCharacter` and
 * `canWalkSlope`, and climbs the rock with the game's own climbing controller and its own wind. What is
 * held here is the pass itself: the notch, the walls across it, the two shoulders of rock they are built
 * into, the slabs that are the one way over, and the lips that take every other way away. The whole of
 * both ranges, with every other way south, is `tests/lotharn-forts.test.js` - and so is the whole of Varn's
 * reach, flooded from the valleys: that nobody comes down past the city by any fall, and no climber but by
 * the slabs.
 *
 * **A flood here is given the rims as risers** (tests/lattice-flood.js, `risers: lipRib, riserReach: inVarnRock`). The rims are built
 * in treads and risers; a lattice a metre apart walked up them slantwise, which the traveler's own step does
 * not (it was this file's one red test on 3 October 2026: a diagonal lattice step onto the rim at the west
 * jamb's south-west corner, (-1266, -722), and a fall of thirty-nine metres off it - a step `canWalkSlope`
 * refuses, and a place a traveler walked at with `moveCharacter` never reaches). So a step that crosses a riser
 * is taken in the game's own strides. What the same measurement found that **was** real - a ledge with no
 * brink, on the south-west peak - is closed in the ground (`LIP_STOPS`) and held below.
 */
const EAST_LOTHARN = 'East Lotharn Mountains';
const gate = id => VARN_CIRCUIT.gates.find(one => one.id === id);
const [WEST_JAMB, EAST_JAMB] = VARN_JAMBS;

test('Varn stands in the tip of Amod’s notch, between the East Lotharn’s two mountains, where the pass road stopped', () => {
  // The four hexes the user ringed are Amod's; the city is in the northernmost, (7,97), and its salient reaches the two below.
  assert.deepEqual(hexAt(VARN.x, VARN.z), { q: 7, r: 97 });
  // The salient's four corners are Amod's. The pass front's two are the corner towers in the jambs' feet: six metres
  // outside Amod's hex, where it narrows to its tip, on the East Lotharn's side of the line.
  for (const corner of VARN_CORNERS.slice(2)) assert.equal(hexOwnerAt(corner.x, corner.z), 'Amod', `a corner at ${corner.x}, ${corner.z}`);
  for (const corner of VARN_CORNERS.slice(0, 2)) {
    assert.equal(hexOwnerAt(corner.x, corner.z), EAST_LOTHARN, `a pass-front corner at ${corner.x}, ${corner.z}`);
    assert.equal(hexOwnerAt(corner.x + Math.sign(VARN.axis - corner.x) * 6, corner.z), 'Amod', 'and six metres along the wall from it is Amod');
  }
  // Nine tenths and more of the ground inside the walls is Amod's.
  let inside = 0, amods = 0;
  for (let x = -1199; x <= -1101; x += 1) for (let z = -783; z <= -705; z += 1) if (VARN_CIRCUIT.inside(x, z)) { inside++; if (hexOwnerAt(x, z) === 'Amod') amods++; }
  assert.ok(amods / inside > .99, `${inside - amods} m2 of ${inside} inside the walls is not Amod's`);
  for (const [q, r] of [[6, 97], [8, 97]]) { const c = hexCentre(q, r); assert.equal(hexOwnerAt(c.x, c.z), EAST_LOTHARN, `(${q},${r}) flanks it`); }
  // It takes the pass road on from the exact point that road stopped at, which the East Lotharn's own module still owns.
  assert.deepEqual({ x: VARN_ROAD_HEAD.x, z: VARN_ROAD_HEAD.z }, { x: PASS_ROAD[0].x, z: PASS_ROAD[0].z });
  assert.equal(VARN_ROAD[0], VARN_ROAD_HEAD);
  assert.deepEqual(VARN_ROAD.at(-1), AMOD_ROAD.at(-1), 'and ends on the last vertex of Amod’s own road');
  assert.ok(VARN_DESCENT.some(p => p.x === KELMOD_ROAD_END.x && p.z === KELMOD_ROAD_END.z), 'through the gap in the wall at the Kelmod road’s end');
  assert.equal(VARN.name, 'Varn', 'the user’s name');
});

test('six walls and fourteen towers, closed all the way round, with a gate on the pass and a gate on Amod', () => {
  const C = VARN_CIRCUIT;
  assert.equal(C.open, false, 'a closed circuit');
  assert.equal(C.corners.length, 6); assert.equal(C.edges.length, 6);
  assert.equal(C.towers.length, 14);
  assert.deepEqual(C.gates.map(one => one.id), [VARN_PASS_GATE, VARN_AMOD_GATE]);
  // The Pass Gate looks north up the pass and the Amod Gate south down the hill, on the one street.
  assert.ok(gate(VARN_PASS_GATE).inward.z > .99 && gate(VARN_AMOD_GATE).inward.z < -.99);
  assert.equal(gate(VARN_PASS_GATE).centre.x, gate(VARN_AMOD_GATE).centre.x);
  // Heavily fortified: taller than the capital's own walls and as thick, and no stretch of curtain forty metres without a tower.
  assert.ok(VARN_STANDARD.wallHeight > AMBRON_STANDARD.wallHeight && VARN_STANDARD.towerPlatform > AMBRON_STANDARD.towerPlatform);
  assert.ok(VARN_STANDARD.wallThickness >= AMBRON_STANDARD.wallThickness);
  assert.ok(longestTowerGap(C) < 40, `the longest run between towers is ${longestTowerGap(C).toFixed(1)} m`);
  assert.ok(C.perimeter > 300 && C.perimeter < 360, `${C.perimeter.toFixed(0)} m of wall`);
  // Every wall is solid along its whole line but for the two gate passages.
  const line = C.wallLine(1);
  assert.deepEqual([...new Set(line.filter(s => s.gate).map(s => s.gate))], [VARN_PASS_GATE, VARN_AMOD_GATE]);
  const solid = (x, z) => C.colliders.some(c => c.kind !== 'varn-ditch' && (c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r : Math.abs(x - c.x) < c.hx && Math.abs(z - c.z) < c.hz));
  for (const s of line.filter(one => !one.gate)) assert.ok(solid(s.x, s.z), `the wall is open at ${s.x.toFixed(1)}, ${s.z.toFixed(1)}`);
  // A ditch before both fronts, none on the long sides: those stand in the rock.
  assert.deepEqual([...new Set(C.ditch.map(piece => piece.edge))].sort(), [0, 2, 3, 4]);
});

test('the jambs: each massif’s first ledge carried out to the notch on the East Lotharn’s own ground, and the east jamb’s landing twelve metres over that', () => {
  assert.equal(VARN_JAMBS.length, 2);
  for (const jamb of VARN_JAMBS) {
    // Every metre of a jamb is the East Lotharn's, and none of it is Amod's.
    for (let x = jamb.minX; x <= jamb.maxX; x += 1.5) for (let z = jamb.minZ; z <= jamb.maxZ; z += 1.5)
      assert.equal(hexOwnerAt(x, z), EAST_LOTHARN, `${jamb.id} at ${x}, ${z}`);
    // Its lip is within a metre and a half of the notch's own edge, and the curtain's collider reaches into its foot.
    const lip = jamb.inward > 0 ? jamb.maxX : jamb.minX, edge = jamb.inward > 0 ? -1200 : -1100, wall = jamb.inward > 0 ? VARN_CORNERS[0].x : VARN_CORNERS[1].x;
    assert.ok(Math.abs(lip - edge) <= 1.5, `${jamb.id} stands ${Math.abs(lip - edge)} m off the hex`);
    assert.ok(Math.abs(wall - lip) < VARN_STANDARD.wallThickness / 2, `the curtain is built into ${jamb.id}`);
  }
  // The top is the ledge's own level - the mountain behind each jamb already had ground at that height inside the jamb's
  // own rectangle, so the top is the ledge made wider - everywhere but the landing, and nothing is lowered.
  for (const jamb of VARN_JAMBS) {
    let ledge = 0, above = 0;
    for (let x = jamb.minX + 6; x <= jamb.maxX - 6; x += 2) for (let z = jamb.minZ + 6; z <= jamb.maxZ - 6; z += 2) {
      const before = groundBeforeVarn(x, z), now = groundWithRiver(x, z);
      assert.ok(now >= before - 1e-9, `${jamb.id} lowers the mountain at ${x}, ${z}`);
      if (lipRib(x, z) > 0) continue;   // the rim on a jamb's own brink, below
      if (jamb === EAST_JAMB && x < LANDING.maxX + LANDING.wall) { assert.ok(onLanding(x, z) ? Math.abs(now - LANDING.top) < .35 : now >= JAMB.top - 1, `the landing is ${now.toFixed(1)} m at ${x}, ${z}`); continue; }
      assert.ok(now >= JAMB.top - 1 && now < JAMB.top + 1.5 || before > JAMB.top + 1, `${jamb.id}'s top is ${now.toFixed(1)} m at ${x}, ${z}`);
      if (Math.abs(before - JAMB.top) < 3.5) ledge++;
      if (before > JAMB.top + 3.5) above++;
    }
    assert.ok(ledge > 25, `${jamb.id}: ${ledge} points of the mountain's own ledge at the top's level`);
    assert.ok(above > 0, `${jamb.id} runs into the mountain's next course`);
  }
  // The landing: the east jamb's west part, a level floor twelve metres over the ledge and the shelf beside it, with a
  // step down to the shelf that no walker climbs and no climber holds.
  assert.ok(Math.abs(LANDING.top - JAMB.top - 12.4) < 1e-9);
  assert.ok(Math.abs(jambTop(-1088, -760) - LANDING.top) < .3 && Math.abs(jambTop(-1065, -760) - JAMB.top) < 1 && Math.abs(jambTop(-1240, -760) - JAMB.top) < 1);
  const step = groundWithRiver(LANDING.maxX - 1.2, -760) - groundWithRiver(LANDING.maxX + 1.2, -760);
  assert.ok(step > 11 && step < 14, `the landing's step is ${step.toFixed(1)} m`);
  assert.equal(canWalkSlope(LANDING.maxX + 1.2, -760, LANDING.maxX - 1.2, -760, { heightAt: groundWithRiver, regionAt: () => ({ id: 20, name: EAST_LOTHARN }) }), false, 'nobody walks up the step');
  assert.equal(unclimbableAt(LANDING.maxX, -760), true, 'and nobody climbs it');
  // On the built ground: the top stands over the city by more than twice the fall that kills, the whole city side.
  for (const jamb of VARN_JAMBS) {
    const inset = JAMB.face + 2;
    for (let z = jamb.minZ + inset; z <= jamb.maxZ - inset; z += 4) {
      const x = jamb.inward > 0 ? jamb.maxX - inset : jamb.minX + inset, top = groundWithRiver(x, z), floor = varnFloor(z);
      assert.ok(top - floor > 50, `${jamb.id} stands ${(top - floor).toFixed(1)} m over the floor at z ${z}`);
      // And its face is no slope: it climbs the whole height in the face's own depth.
      const foot = jamb.inward > 0 ? jamb.maxX + .3 : jamb.minX - .3;
      assert.ok((top - groundWithRiver(foot, z)) / (inset + .3) > 6, `${jamb.id}'s face at z ${z}`);
    }
  }
  // Nothing of Amod's is raised by them, and the pass road is on its bed to the last metre.
  for (let x = -1199; x <= -1101; x += 7) for (let z = -800; z <= -700; z += 7) assert.equal(varnJambRise(x, z), 0);
  for (const p of PASS_ROAD_LINE) assert.ok(Math.abs(groundWithRiver(p.x, p.z) - p.grade) < .08, `the pass road is off its bed at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
  // Away from Varn's reach the ground before it and the ground with it are the same ground.
  for (const [x, z] of [[-1080, -995], [-1650, -835], [-1400, -560], [-814, -504], [-2000, -500]]) assert.equal(groundBeforeVarn(x, z), groundWithRiver(x, z));
});

test('the parapets: the west jamb railed where it is walked onto and returned to its edges; the east jamb’s landing railed along the city, its shelf as before', () => {
  const touch = (a, b) => Math.abs(a.x - b.x) <= a.hx + b.hx && Math.abs(a.z - b.z) <= a.hz + b.hz;
  const runsOf = jamb => VARN_PARAPETS.filter(run => run.jamb === jamb.id), sideOf = (runs, name) => runs.find(run => run.side === name);
  // The west jamb: city side, pass end, Amod end, two returns; one line, standing on the top from end to end.
  {
    const runs = runsOf(WEST_JAMB), city = sideOf(runs, 'city');
    assert.deepEqual(runs.map(run => run.side).sort(), ['amod', 'amod-return', 'city', 'pass', 'pass-return']);
    assert.ok(Math.abs(city.x - (WEST_JAMB.maxX - PARAPET.back)) < 1e-9 && city.hz * 2 > WEST_JAMB.maxZ - WEST_JAMB.minZ - PARAPET.back * 2);
    for (const end of [sideOf(runs, 'pass'), sideOf(runs, 'amod')]) {
      assert.ok(touch(end, city), `the west jamb's ${end.side} end meets its city side`);
      for (const p of [end.from, end.to]) assert.ok(groundWithRiver(p.x, p.z) > JAMB.top - 1.5, `${end.side} at ${p.x}, ${p.z}`);
    }
    for (const run of runs) assert.ok(runs.some(other => other !== run && touch(run, other)), `the west jamb's ${run.side} stands alone`);
    for (const run of runs.filter(one => one.side.endsWith('-return')))
      assert.ok([run.from, run.to].some(p => p.x === WEST_JAMB.minX || p.x === WEST_JAMB.maxX || p.z === WEST_JAMB.minZ || p.z === WEST_JAMB.maxZ), `${run.side} stops short of the edge`);
  }
  // The east jamb: the city rail along the landing's lip from the jamb's north edge to its south edge, two metres in, so that
  // whoever climbs up to the landing cannot step off into Varn and cannot get round its end; and the shelf's Amod end
  // and free side railed with a return, as before, for the walker who comes onto the shelf from the ledge.
  {
    const runs = runsOf(EAST_JAMB), city = sideOf(runs, 'city'), amod = sideOf(runs, 'amod'), far = sideOf(runs, 'far');
    assert.deepEqual(runs.map(run => run.side).sort(), ['amod', 'city', 'far', 'far-return']);
    assert.equal(city.x, LANDING.rail); assert.ok(LANDING.rail - (EAST_JAMB.minX + JAMB.face) >= -.2 && LANDING.rail - (EAST_JAMB.minX + JAMB.face) <= .6, 'the rail stands at the head of the face');
    assert.equal(Math.min(city.from.z, city.to.z), EAST_JAMB.minZ); assert.equal(Math.max(city.from.z, city.to.z), EAST_JAMB.maxZ);
    assert.ok(Math.min(amod.from.x, amod.to.x) <= LANDING.maxX, 'the shelf’s Amod rail starts at the landing’s step');
    assert.ok(touch(amod, far) && touch(far, sideOf(runs, 'far-return')), 'the shelf’s rails are one line');
    assert.ok([sideOf(runs, 'far-return').from, sideOf(runs, 'far-return').to].some(p => p.x === EAST_JAMB.maxX), 'the return reaches the edge');
    // No rail crosses a slab's top, and the north slab's west edge is against the city rail's collider.
    for (const slab of VARN_SLABS) for (const run of runs) assert.ok(!(Math.abs(slab.lipZ - run.z) <= run.hz && slab.minX + .5 < run.x + run.hx && slab.maxX - .5 > run.x - run.hx), `${run.side} crosses ${slab.id}`);
    assert.ok(VARN_SLABS[0].minX - (city.x + PARAPET.half) < .5 && VARN_SLABS[0].minX > city.x, 'the north slab begins at the rail');
  }
  // The watches: one turret on each jamb, the east's on the landing.
  assert.equal(VARN_WATCHES.length, 2);
  assert.ok(onLanding(VARN_WATCHES[1].x, VARN_WATCHES[1].z, 3), 'the east watch stands on the landing');
  assert.ok(groundWithRiver(VARN_WATCHES[0].x, VARN_WATCHES[0].z) > JAMB.top - 1 && WEST_JAMB.minX < VARN_WATCHES[0].x && VARN_WATCHES[0].x < WEST_JAMB.maxX);
});

test('the made ground: an upper court at the pass road’s own grade, one in ten down the street, a ward over it and a ditch before both fronts', () => {
  assert.equal(VARN_FLOOR.upper, PASS_ROAD[0].grade, 'the upper court is the pass road’s own level');
  assert.ok(Math.abs(groundWithRiver(VARN.axis, -775) - VARN_FLOOR.upper) < .05 && Math.abs(groundWithRiver(VARN.axis, -712) - VARN_FLOOR.lower) < .05);
  const fall = (VARN_FLOOR.upper - VARN_FLOOR.lower) / (VARN_FLOOR.fallTo - VARN_FLOOR.fallFrom);
  assert.ok(fall > .08 && fall < .12, `the street falls ${fall.toFixed(3)}`);
  // The citadel's ward is the highest ground in the city.
  const ward = groundWithRiver(VARN_KEEP.x + 9, VARN_KEEP.z + 4);
  assert.ok(Math.abs(ward - VARN_WARD.level) < .05 && ward > VARN_FLOOR.upper + 1, `the ward lies at ${ward.toFixed(2)}`);
  for (let x = -1195; x <= -1105; x += 6) for (let z = -779; z <= -727; z += 6) assert.ok(groundWithRiver(x, z) <= ward + .05, `higher ground at ${x}, ${z}`);
  // The ditch is real, on the fronts and nowhere else, and each gate has its causeway.
  const north = { x: -1175, z: VARN_CORNERS[0].z - 6 }, south = { x: gate(VARN_AMOD_GATE).centre.x + 12, z: gate(VARN_AMOD_GATE).centre.z + 6 };
  for (const p of [north, south]) assert.ok(varnDitchCut(p.x, p.z) > 2 && varnSurface(p.x, p.z) === 'ditch', `no ditch at ${p.x}, ${p.z}`);
  for (const g of VARN_CIRCUIT.gates) assert.equal(varnDitchCut(g.centre.x - g.inward.x * 6, g.centre.z - g.inward.z * 6), 0, `${g.id} has its causeway`);
  // Outside its reach the ground is handed back as it came.
  assert.equal(varnGround(-814, -504, 31), 31, 'Ostel is not Varn’s');
  assert.equal(varnGround(-1300, -548, 50), 50); assert.equal(varnGround(-1080, -995, 62), 62, 'nor is Kemrath');
});

test('the road: in at the Pass Gate, down the one street, out at the Amod Gate and down the hills to Amod’s own, never steeper than one in eight', () => {
  for (const p of VARN_STREET) assert.equal(p.x, VARN.axis, 'the street is the axis');
  assert.ok(VARN_DESCENT_PROFILE.length > 50);
  assert.ok(Math.abs(VARN_DESCENT_PROFILE[0].level - VARN_FLOOR.lower) < 1e-9, 'the descent starts at the Amod Gate’s own level');
  let worst = 0, at = null;
  for (let i = 1; i < VARN_ROAD.length; i++) {
    const a = VARN_ROAD[i - 1], b = VARN_ROAD[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    for (let k = 0; k < n; k++) {
      const p = [a.x + (b.x - a.x) * k / n, a.z + (b.z - a.z) * k / n], q = [a.x + (b.x - a.x) * (k + 1) / n, a.z + (b.z - a.z) * (k + 1) / n];
      const grade = Math.abs(groundWithRiver(...q) - groundWithRiver(...p)) / Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (grade > worst) { worst = grade; at = p; }
    }
  }
  assert.ok(worst < .125, `the steepest metre of the road is ${worst.toFixed(3)} at ${at.map(v => v.toFixed(0))}`);
  for (const p of VARN_ROAD) assert.equal(hexOwnerAt(p.x, p.z), 'Amod', `the road leaves Amod at ${p.x}, ${p.z}`);
});

test('one flag shuts both gates; the Amod Gate keeps a wicket that opens from inside only, because Varn is a closed place', () => {
  assert.equal(LOTHARN_PASSES_SHUT, true, 'shut, at the user’s word (docs/varn-report.md)');
  assert.equal(varnGateShut(VARN_PASS_GATE), true); assert.equal(varnGateShut(VARN_AMOD_GATE), true); assert.equal(varnGateShut('somebody-else’s-gate'), false);
  // The wicket: in the Amod Gate, a man wide, at the tower's side of its right-hand leaf as you go out.
  const w = varnWicket(), g = gate(VARN_AMOD_GATE);
  assert.equal(VARN_WICKET.gate, VARN_AMOD_GATE); assert.ok(VARN_WICKET.width >= 1.1 && VARN_WICKET.width <= 1.4, 'a man wide');
  assert.equal(w.z, g.centre.z); assert.ok(Math.abs(Math.abs(w.x - g.centre.x) - (g.halfWidth - w.width / 2)) < 1e-9, 'against the passage’s side');
  assert.ok(w.x < g.centre.x, 'on the right hand going out, which is the west');
  // The closed place: Varn's wall line, shut with the flag, with its own title and lines, in the game's list.
  assert.equal(VARN_CLOSED.shut, LOTHARN_PASSES_SHUT); assert.equal(VARN_CLOSED.name, 'Varn');
  assert.ok(CLOSED_PLACES.includes(VARN_CLOSED) && CLOSED_BORDERS.Varn.lines.length >= 3 && /SHUT/.test(CLOSED_BORDERS.Varn.title));
  assert.ok(VARN_CLOSED.inside(VARN_SQUARE.x, VARN_SQUARE.z) && !VARN_CLOSED.inside(w.x, w.z - g.inward.z * 4) && VARN_CLOSED.inside(w.x, w.z + g.inward.z * 4) && !VARN_CLOSED.inside(VARN.axis, -795));
  // Through the wicket: the step in is refused, the step out is not, and so is a step anywhere along the wall line.
  const out = { x: w.x, z: w.z - g.inward.z * 3.5 }, within = { x: w.x, z: w.z + g.inward.z * 3.5 };
  assert.equal(closedRegionEntered(out, within), 'Varn'); assert.equal(closedRegionEntered(within, out), null);
  assert.equal(closedRegionEntered({ x: -1230, z: -760 }, { x: -1195, z: -760 }), 'Varn', 'over the west wall, were there a way'); assert.equal(closedRegionEntered(within, { x: VARN_SQUARE.x, z: VARN_SQUARE.z }), null);
  const watch = createBorderWatch(), turned = watch.step(out, within, 0);
  assert.equal(turned.refused, true); assert.equal(turned.title, CLOSED_BORDERS.Varn.title); assert.ok(VARN_CLOSED.lines.includes(turned.toast));
  // Nobody with a name says any of it.
  for (const line of VARN_CLOSED.lines) assert.ok(!/[A-Z][a-z]+ [A-Z][a-z]+/.test(line.replace(/Amod Gate|Varn/g, '')), line);
});

test('the slabs: the one way over, two planes of rock sixty-four metres high against the east jamb’s free faces, and what the climbing system makes of them', () => {
  assert.equal(VARN_SLABS.length, 2);
  const [north, south] = VARN_SLABS;
  assert.ok(north.dir === -1 && south.dir === 1 && north.lipZ === EAST_JAMB.minZ + JAMB.face && south.lipZ === EAST_JAMB.maxZ - JAMB.face);
  for (const slab of VARN_SLABS) {
    assert.equal(slab.maxX - slab.minX, SLAB.width);
    assert.ok(slab.minX >= LANDING.minX && slab.maxX <= LANDING.maxX - LANDING.wall, `${slab.id} tops out on the landing`);
    // The plane: from the apron at 64 m to the lip at the landing's level, at a grade of seven and a half - climbing rock to the
    // controller (steeper than its grab slope, under its limit, and under the step it refuses), with no rest on it.
    const foot = slabFoot(slab), lip = { x: foot.x, z: slab.lipZ };
    assert.ok(Math.abs(groundWithRiver(foot.x, foot.z) - SLAB.foot) < .01 && Math.abs(groundWithRiver(lip.x, lip.z) - LANDING.top) < .35);
    const rise = groundWithRiver(lip.x, lip.z) - SLAB.foot;
    assert.ok(rise > 63.9 && rise < 64.9, `${slab.id} rises ${rise.toFixed(2)} m`);
    const terrain = { heightAt: groundWithRiver, waterAt: () => .45, colliders: [], regionAt: () => ({ id: 20, name: EAST_LOTHARN }), unclimbableAt };
    for (let t = .5; t < SLAB.run; t += .5) {
      const z = slab.lipZ + slab.dir * t, s = sampleClimbSurface(terrain, foot.x, z);
      assert.ok(s.slope > 6.5 && s.slope < 8.5 && s.climbable && !s.resting, `${slab.id} at ${t} m down: slope ${s.slope.toFixed(2)}, climbable ${s.climbable}, resting ${s.resting}`);
      assert.equal(unclimbableAt(foot.x, z), false); assert.equal(unclimbableAt(slab.minX - 1.5, z), true, `the rock beside ${slab.id} holds`); assert.equal(unclimbableAt(slab.maxX + 1.5, z), true);
      assert.equal(canWalkSlope(foot.x, z + slab.dir * .3, foot.x, z, terrain), false, 'nobody walks up it');
    }
    // A rest at the foot, and one where the plane meets the landing (within the half-metre of the lip the rule leaves a hand): the
    // controller crests there. The landing beyond is no-hold ground, which a man on his feet does not ask about.
    assert.ok(sampleClimbSurface(terrain, foot.x, foot.z).resting && sampleClimbSurface(terrain, lip.x, lip.z - slab.dir * .45).resting, 'a rest at the foot and at the lip, and nowhere between');
    assert.ok(unclimbableAt(lip.x, lip.z - slab.dir * 1.5) && !unclimbableAt(lip.x, lip.z - slab.dir * .45));
    assert.equal(varnSurface(foot.x, foot.z), 'apron'); assert.equal(varnSurface(foot.x, slab.lipZ + slab.dir * 4), 'slab');
    assert.ok(varnKeepsClear(foot.x, foot.z) && varnKeepsClear(foot.x, slab.lipZ + slab.dir * 4) && varnKeepsClear(-1088, -760), 'the way and the landing are kept clear of the scatter');
    assert.equal(hexOwnerAt(foot.x, foot.z), EAST_LOTHARN, 'the apron is the mountain’s, not Amod’s');
  }
  // The numbers, in the system's own terms (src/gameplay/movement/climbing.js, src/gameplay/combat/combat-skills.js): no wind comes back on a slab, so one pitch is one
  // pool of it. At the base wind of 100, up a grade of seven and a half, a climber of level 17 reaches 66 m and one of 16 reaches 62.
  const eff = L => Math.max(.6, 1 - (Math.min(20, L) - 1) * .025), speed = L => CLIMBING.speed * Math.min(1.6, 1 + (Math.min(20, L) - 1) * .035);
  const reach = (L, wind, slope = 7.5) => wind / (CLIMBING.movingDrain * eff(L)) * speed(L) * slope / Math.hypot(1, slope);
  assert.equal(maxWind(1), 100);
  assert.ok(reach(17, 100) > 65.5 && reach(16, 100) < 62.5 && reach(20, 100) < 68, `levels 16, 17, 20 reach ${[16, 17, 20].map(L => reach(L, 100).toFixed(1))} m`);
  assert.ok(reach(15, maxWind(20)) > 64.9, 'with toughness 20’s wind, level 15 finishes it');
  // And the fall from under the lip costs everything a climbing fall can cost, which is a traveler of base health.
  assert.equal(Math.min(100, Math.round((62 - CLIMBING.safeDrop) * 5)), 100); assert.equal(maxHealth(1), 100);
  // The landmark.
  assert.ok(VARN_LANDMARKS.some(place => place.id === 'varn-slabs' && /sixty-four/.test(place.description)));
});

test('the lips: a rim on the brink of every edge within Varn’s reach that a walker cannot get up, off the peaks’ own ways, and no hold on it', () => {
  // The reach: both massifs' faces over the Empire's ground between the Vastos Gate and the eastern massif's far end; the
  // neighbourhood is the east jamb and the courses over it.
  assert.ok(VARN_ROCK.minX <= -1540 && VARN_ROCK.maxX >= -700 && VARN_ROCK.minZ <= -950 && VARN_ROCK.maxZ >= -600, 'past the Vastos Gate’s eastern end');
  assert.ok(inVarnNeighbourhood(EAST_JAMB.minX, EAST_JAMB.minZ) && inVarnNeighbourhood(EAST_JAMB.maxX + 10, EAST_JAMB.maxZ + 20) && !inVarnNeighbourhood(WEST_JAMB.maxX, -760));
  assert.ok(RIB.height >= 2 && RIB.height <= 3.5 && RIB.most >= RIB.height && RIB.cliff > .9 && RIB.lift.low >= 28);
  const ground = { heightAt: groundWithRiver, regionAt: () => ({ id: 20, name: EAST_LOTHARN }) };
  // Down a column toward an edge: the rim stands on the brink, a walker from the ledge is stopped short of it, and the ledge
  // itself is as it was. The unchanged southwest ledge, Vastos end and central massif retain this
  // natural-rim profile. The three former eastern columns now carry the restored cave shelf and its
  // retaining fill; its actual movement and outer-corner closure are in r1-cave-access.test.js and
  // the eastern flood below. A retaining face is not limited to the natural rim's five-metre lift.
  for (const [x, from, to] of [[-1426, -656, -640], [-1497, -670, -650], [-1250, -900, -885]]) {
    let rim = null, tallest = 0;
    for (let z = from; z <= to; z += .25) { const r = lipRib(x, z); if (r > tallest) { tallest = r; rim = z; } }
    assert.ok(rim !== null && tallest > .5, `no rim between ${from} and ${to} at x ${x}`);
    assert.ok(tallest >= RIB.height - .01 && tallest <= RIB.most + .01, `the rim at ${x}, ${rim} is ${tallest.toFixed(2)} m`);
    assert.ok(unclimbableAt(x, rim), 'and no hold on it');
    assert.ok(groundWithRiver(x, rim) - groundBeforeVarn(x, rim) > 2, 'built into the ground');
    // A ridge, not a shelf: from half a metre outside its crest to the brink nothing is ground a falling body comes to rest on
    // (the game's own test, src/gameplay/movement/terrain-fall.js), so nothing dropping onto it from above stops on it and steps off the far side.
    // The crest itself, read eighty centimetres across, is gentle for the half-metre of its apex: a body dropped onto that
    // line from a ledge above can stand there (docs/varn-report.md, not held).
    for (let z = rim + .5; z <= rim + 1.5; z += .25) if (lipRib(x, z) > tallest * .3) { const s = .4, gx = (groundWithRiver(x + s, z) - groundWithRiver(x - s, z)) / (2 * s), gz = (groundWithRiver(x, z + s) - groundWithRiver(x, z - s)) / (2 * s); assert.ok(Math.hypot(gx, gz) > CLIMBING.grabSlope, `a body rests on the rim at ${x}, ${z} (slope ${Math.hypot(gx, gz).toFixed(2)})`); }
    let blocked = null;
    for (let z = from; z < to; z += .1) if (!canWalkSlope(x, z, x, z + .1, ground)) { blocked = z; break; }
    assert.ok(blocked !== null && blocked < rim && blocked > rim - 5, `a walker from ${from} is ${blocked === null ? 'never stopped' : `stopped at ${blocked.toFixed(1)}`}, the rim is at ${rim}`);
    assert.equal(lipRib(x, rim - 4), 0, 'the ledge four metres in is as it was'); assert.equal(groundWithRiver(x, rim - 4), groundBeforeVarn(x, rim - 4));
    // Below the brink nothing is raised: the rim is on the ledge's edge, and the cliff is the cliff.
    for (let z = rim + 1.5; z <= to; z += .5) assert.equal(lipRib(x, z), 0, `raised below the brink at ${x}, ${z}`);
  }
  // Off the ways: the peaks' ramps and ledge paths cross their lips as they always did.
  for (const ramp of RAMPS) for (const p of ramp.line.points) assert.equal(lipRib(p.x, p.z), 0, `${ramp.id} at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
  // Outside the reach, nothing; nothing on the valleys' floors. And the upper courses are rimmed too: on the eastern massif's
  // south-east face the ledges are a few metres wide, and a body dropped from the third came down into Amod in one fall.
  for (const [x, z] of [[-1650, -700], [-1080, -995], [-900, -500], [-2000, -450], [-1330, -835], [-1150, -800]]) assert.equal(lipRib(x, z), 0, `${x}, ${z}`);
  let upper = 0;
  for (let x = -990; x <= -940; x += 1) for (let z = -770; z <= -740; z += 1) if (peakUplift(x, z) > RIB.lift.high + 2 && lipRib(x, z) > 2) upper++;
  assert.ok(upper > 40, `${upper} m2 of rim on the upper courses of the south-east face`);
  assert.ok(!lipRuleApplies(-1150, -800) && !lipRuleApplies(-1650, -700) && !lipRuleApplies(slabFoot(VARN_SLABS[0]).x, slabFoot(VARN_SLABS[0]).z));
});

test('the stop: a rim stood by hand at the head of the south-west peak’s slide, where the ledge has no brink for the rule to find', () => {
  assert.equal(LIP_STOPS.length, 1);
  const [stop] = LIP_STOPS, slopeOf = (at, x, z) => Math.hypot(at(x + .4, z) - at(x - .4, z), at(x, z + .4) - at(x, z - .4)) / .8;
  const ground = { heightAt: groundWithRiver, regionAt: () => ({ id: 20, name: EAST_LOTHARN }) }, bare = { heightAt: varnBeforeLips, regionAt: ground.regionAt };
  assert.ok(stop.id === 'south-west-slide' && stop.from.z === stop.to.z && stop.from.x < stop.to.x && inVarnRock(stop.from.x, stop.from.z) && inVarnRock(stop.to.x, stop.to.z));
  assert.ok(stop.height >= RIB.height && stop.height / stop.half > 2.4, 'a ridge no walker gets up, on a ledge that falls away under it at a grade of nine tenths');
  // One ridge from end to end, as tall as the plan says on its line and nothing a stride beyond its foot; every metre of it
  // the mountain's own ground, and no hold on it.
  for (let x = stop.from.x; x <= stop.to.x; x += .5) {
    assert.ok(Math.abs(stopRib(x, stop.from.z) - stop.height) < 1e-9 && lipRib(x, stop.from.z) >= stop.height, `the stop is broken at x ${x}`);
    assert.equal(stopRib(x, stop.from.z - stop.half - .01), 0); assert.equal(stopRib(x, stop.from.z + stop.half + .01), 0);
    assert.equal(hexOwnerAt(x, stop.from.z), EAST_LOTHARN); assert.equal(unclimbableAt(x, stop.from.z), true, `a hold on the stop at x ${x}`);
  }
  // It runs from the rim the rule built west of the slide to the one it built east of it: at each end the ground on its line
  // already stood as high as a rim without it, and beyond each end there is no ledge left, only the face.
  for (const [end, sign] of [[stop.from, 1], [stop.to, -1]]) {
    let joined = false;
    for (let reach = 0; reach <= 3; reach += .25) if (groundWithRiver(end.x + sign * reach, end.z) - varnBeforeLips(end.x + sign * reach, end.z) > stop.height + .05) joined = true;
    assert.ok(joined, `the stop's end at ${end.x} does not reach the rule's own rim`);
    assert.ok(varnBeforeLips(end.x, end.z) - varnBeforeLips(end.x - sign * 5, end.z) > 15, `there is ground to walk beyond the stop's end at ${end.x}`);
  }
  // Why it is there. On the ground without the lips, south of its line: a grade steeper than a walker's at every half metre
  // for four metres, which the walking rule never refuses going down and the fall rule calls a fall - and thirty metres and
  // more of drop beyond. And the rule's own rim is not on it: the ledge slopes, and never breaks.
  for (const x of [-1414, -1410, -1406]) {
    for (let z = -646.5; z <= -643; z += .5) {
      assert.ok(slopeOf(varnBeforeLips, x, z) > CLIMBING.grabSlope, `the slide is a walker's grade at ${x}, ${z}`);
      assert.equal(canWalkSlope(x, z - .5, x, z, bare), true); assert.equal(lipRib(x, z), 0, `a rim on the slide at ${x}, ${z}`);
    }
    assert.ok(varnBeforeLips(x, -647.5) - varnBeforeLips(x, -636) > 30, `no drop under the slide at x ${x}`);
  }
  // What it does. A walker from either end of the ledge, going south: stopped at the ridge's uphill foot, short of its
  // line, on ground he walks back up - so the rim keeps nobody.
  for (const x of [-1422, -1418, -1394, -1391]) {
    assert.ok(slopeOf(groundWithRiver, x, -651.5) <= CLIMBING.grabSlope, `the ledge at ${x} is not walked`);
    let blocked = null;
    for (let z = -651.5; z < -645; z += .1) if (!canWalkSlope(x, z, x, z + .1, ground)) { blocked = z; break; }
    assert.ok(blocked !== null && blocked < stop.from.z - .4 && blocked > stop.from.z - stop.half - .6, `a walker at x ${x} is ${blocked === null ? 'never stopped' : `stopped at ${blocked.toFixed(1)}`}`);
    assert.ok(slopeOf(groundWithRiver, x, blocked) <= CLIMBING.grabSlope && canWalkSlope(x, blocked, x, blocked - .1, ground), `he cannot walk back from ${x}, ${blocked.toFixed(1)}`);
  }
  // And it changes nothing else: off its ridge the ground is the ground the rule made.
  for (const [x, z] of [[-1418, -651], [-1394, -652], [-1410, -644], [-1250, -740], [-1020, -750]]) assert.equal(stopRib(x, z), 0);
});

test('the caves’ way and the rails: the eastern peak’s fourth ledge keeps its hold from the peak’s way to the high chimney, off every rim; five doors railed beyond the door', () => {
  // The user, 3 October 2026: "give the eastern peak back one climbing way to its caves that does not lead past Varn, and rail
  // the cave doors that open over the Empire's ground". One way: a stretch of one ledge's tread, nothing else.
  assert.equal(CAVE_WAY.stretches.length, 1);
  const chimney = CAVE_LINES.find(cave => cave.id === 'eastern-high-chimney');
  let area = 0, kept = 0;
  for (const stretch of CAVE_WAY.stretches) {
    const k = stretch.ledge, [low, high] = stretch.lift, P = BANDS.period;
    assert.ok(low >= k * P - 1 && high <= (k + 1 - BANDS.riser) * P + 1, `${stretch.id} reaches off its ledge's tread`);
    const xs = stretch.line.map(p => p.x), zs = stretch.line.map(p => p.z);
    for (let x = Math.min(...xs) - 4; x <= Math.max(...xs) + 4; x += .5) for (let z = Math.min(...zs) - 4; z <= Math.max(...zs) + 4; z += .5) {
      if (!onCaveWay(x, z)) continue;
      area += .25;
      assert.ok(inVarnRock(x, z) && hexOwnerAt(x, z) === EAST_LOTHARN && !inVarnNeighbourhood(x, z) && varnJambRise(x, z) === 0, `the way at ${x}, ${z}`);
      const u = peakUplift(x, z); assert.ok(u >= low && u <= high, `the way at ${x}, ${z} is off its ledge (lift ${u.toFixed(1)})`);
      // A hold on its tread, none on a rim or a rail.
      assert.equal(varnUnclimbable(x, z), lipRib(x, z) > .05, `the way at ${x}, ${z}`);
      if (!varnUnclimbable(x, z)) kept += .25;
    }
    // It leaves the peak's own way where the fourth ramp tops out, and comes to the high chimney's lower door.
    const [a, b] = [stretch.line[0], stretch.line.at(-1)];
    assert.ok([-2, -1, 0, 1, 2].some(dx => [-2, -1, 0, 1, 2].some(dz => onPeakWay(a.x + dx, a.z + dz))), 'the way does not start at the peak’s own way');
    assert.ok(Math.hypot(b.x - chimney.points[0].x, b.z - chimney.points[0].z) < 3, 'the way does not come to the high chimney’s door');
  }
  assert.ok(kept > 250 && area < 600, `${kept} m2 of the ledge keep a hold, of ${area} m2 on the way`);
  // The rails: the chamber and both mouths of each chimney, all five over the Empire's ground.
  assert.deepEqual(CAVE_RAILS.map(rail => rail.id), ['eastern-chamber', 'eastern-high-chimney-lower', 'eastern-high-chimney-upper', 'eastern-low-chimney-lower', 'eastern-low-chimney-upper']);
  assert.ok(RAIL.radius - RAIL.inner >= 2 && RAIL.height >= RIB.height && RAIL.height / RAIL.outer > RAIL.height / RAIL.inner, 'outside the door, a rim’s height, steeper outward');
  const at = (mouth, degrees, r) => [mouth.x + Math.cos(degrees * Math.PI / 180) * r, mouth.z + Math.sin(degrees * Math.PI / 180) * r];
  for (const rail of CAVE_RAILS) {
    const line = CAVE_LINES.find(cave => cave.id === rail.cave), mouth = rail.end ? line.points.at(-1) : line.points[0], level = varnBeforeLips(mouth.x, mouth.z);
    assert.ok(Math.hypot(mouth.x - rail.mouth.x, mouth.z - rail.mouth.z) < 1e-9, `${rail.id} is not at its cave's mouth`);
    // The crest, all round the arc: the rail's height over the ground at the mouth, and no hold on it.
    const arc = ((rail.to - rail.from) % 360 + 360) % 360;
    for (let a = rail.from + 1; a <= rail.from + arc - 1; a += 2) {
      const [x, z] = at(mouth, a, RAIL.radius);
      assert.ok(groundWithRiver(x, z) >= level + RAIL.height - .01, `${rail.id}'s crest at ${a} degrees is ${(groundWithRiver(x, z) - level).toFixed(2)} m over the door`);
      assert.equal(unclimbableAt(x, z), true, `a hold on ${rail.id} at ${a} degrees`);
    }
    // Nothing in the door: within its two metres no ground stands over the mouth's own but what stood there before (the rail's
    // fill makes up the brink's roll-off to the mouth's level, and no more), and nothing is raised on the passage's line.
    for (let r = 0; r <= 1.9; r += .25) for (let a = 0; a < 360; a += 10) {
      const [x, z] = at(mouth, a, r);
      assert.ok(groundWithRiver(x, z) <= Math.max(varnBeforeLips(x, z), level) + 1e-6, `${rail.id} stands in the door at ${r} m, ${a} degrees`);
    }
    for (const p of rail.end ? line.points.slice(-6) : line.points.slice(0, 6)) assert.equal(railRib(p.x, p.z), 0, `${rail.id} stands on the passage`);
  }
});

test('rock that gives no hold: the rule, the table, and Varn’s row of it', () => {
  // The rule itself, on a stand-in slope: a marked face gives no grab and no attached step, and is still fallen down.
  const ground = (_x, z) => 10 + Math.max(0, Math.min(20, z * 2));
  const terrain = (extra = {}) => ({ heightAt: ground, waterAt: () => .45, colliders: [], regionAt: () => ({ id: 20, name: EAST_LOTHARN }), ...extra });
  const marked = terrain({ unclimbableAt: (_x, z) => z >= 2 });
  assert.equal(climbForbidden(marked, 0, 3), true); assert.equal(climbForbidden(terrain(), 0, 3), false, 'no mark, no rule');
  assert.equal(sampleClimbSurface(marked, 0, 3).allowed, false);
  assert.equal(sampleClimbSurface(terrain(), 0, 3).climbable, true, 'the same face, unmarked, is climbing rock');
  assert.equal(createClimbing({ world: marked }).grab({ x: 0, y: ground(0, 2.5), z: 2.5 }, 0, { stamina: 100 }), false);
  const climbTo = world => {
    const climber = createClimbing({ world });
    assert.equal(climber.grab({ x: 0, y: ground(0, .4), z: .4 }, 0, { stamina: 100 }), true, 'the rock below the mark is climbed');
    let view = climber.view(), stamina = 100;
    for (let i = 0; i < 160 && climber.active; i++) { view = climber.tick(.025, { up: 1, stamina }); stamina -= view.staminaSpent; }
    return view.position.z;
  };
  assert.ok(climbTo(marked) < 2, `the climb stopped at the mark (${climbTo(marked).toFixed(2)})`);
  assert.ok(climbTo(terrain()) > 3, 'and went on past it where there is none');
  assert.equal(canWalkSlope(0, 3, 0, 3.1, marked), false, 'and nobody walks up it either');
  assert.equal(canWalkSlope(0, 3.1, 0, 3, marked), true, 'coming down it is the ground’s own business');
  // The table: a row to a place, each with its own function; Varn's is the first.
  assert.equal(NO_CLIMB_ZONES[0].id, 'varn'); assert.equal(NO_CLIMB_ZONES[0].at, varnUnclimbable);
  for (const zone of NO_CLIMB_ZONES) { assert.equal(typeof zone.at, 'function'); assert.ok(zone.name.length > 3 && zone.why.length > 40, zone.id); }
  assert.equal(new Set(NO_CLIMB_ZONES.map(zone => zone.id)).size, NO_CLIMB_ZONES.length);
  // Varn's row. The jambs' faces, the landing's step and every face in the neighbourhood give no hold; the slabs and the
  // peaks' own ways keep theirs, every metre.
  for (const jamb of VARN_JAMBS) for (const [x, z] of [[jamb.minX, jamb.minZ], [jamb.maxX, jamb.maxZ], [(jamb.minX + jamb.maxX) / 2, jamb.minZ], [jamb.inward > 0 ? jamb.maxX - 2 : jamb.minX + 2, VARN.z]]) assert.equal(unclimbableAt(x, z), true, `${jamb.id} at ${x}, ${z}`);
  let faces = 0, held = 0;
  for (let x = VARN_NEIGHBOURHOOD.minX; x <= VARN_NEIGHBOURHOOD.maxX; x += 2) for (let z = VARN_NEIGHBOURHOOD.minZ; z <= VARN_NEIGHBOURHOOD.maxZ; z += 2) {
    const free = !!onSlab(x, z, .5) || (RAMPS_KEEP_THEIR_HOLD && onPeakWay(x, z) && !(onWayShoulder(x, z) && lipRib(x, z) > .05));
    assert.equal(varnUnclimbable(x, z), !free, `${x}, ${z}`);
    if (free) held++; else faces++;
  }
  assert.ok(faces > 1500 && held > 80, `${faces} points of no hold in the neighbourhood, ${held} that keep theirs`);
  if (RAMPS_KEEP_THEIR_HOLD) for (const ramp of RAMPS) for (const p of ramp.line.points) assert.equal(unclimbableAt(p.x, p.z), false, `${ramp.id} at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
  // In the rest of its reach every face of the mountain's own ground is no-hold, at every course, and the lowland's
  // ground besides (no climbing rock in any case); only the ways and the slabs keep their hold. Beyond the box the mountains
  // are climbed as they always were.
  let rock = 0, ways = 0;
  for (let x = VARN_ROCK.minX; x <= VARN_ROCK.maxX; x += 6) for (let z = VARN_ROCK.minZ; z <= VARN_ROCK.maxZ; z += 6) {
    if (inVarnNeighbourhood(x, z) || varnJambRise(x, z) > 0) continue;
    // The caves' way (`CAVE_WAY`, the user's decision of 3 October) keeps its hold on its ledge's tread, as a way does, but not on a rim or a rail.
    const expect = !onSlab(x, z, .5) && (RAMPS_KEEP_THEIR_HOLD && onPeakWay(x, z) ? onWayShoulder(x, z) && lipRib(x, z) > .05 : onCaveWay(x, z) ? lipRib(x, z) > .05 : hexOwnerAt(x, z) === EAST_LOTHARN || belowFirstLedge(x, z));
    assert.equal(varnUnclimbable(x, z), expect, `${x}, ${z}`);
    if (expect) rock++; else ways++;
  }
  assert.ok(rock > 5000 && ways > 300, `${rock} points of no hold in Varn's reach, ${ways} on the ways`);
  assert.equal(unclimbableAt(-962, -826), true, 'the eastern peak is within the reach');
  for (const [x, z] of [[-1650, -700], [-1080, -995], [-900, -500], [-1300, -1000], [-680, -800]]) assert.equal(unclimbableAt(x, z), false, `${x}, ${z} is outside Varn's reach`);
  // The eastern peak's way is where the range's own rule puts it: its first ramp on the pass floor before the Pass Gate, a
  // stone's throw from the north slab, and its second over the back of the east jamb's shelf - never over the landing.
  const ramp1 = RAMPS.find(ramp => ramp.id === 'eastern-peak-ramp-1'), ramp2 = RAMPS.find(ramp => ramp.id === 'eastern-peak-ramp-2');
  assert.ok(ramp1.line.points.some(p => Math.abs(p.x - VARN.axis) < 100 && p.z < VARN_CORNERS[0].z - 20), 'the eastern peak’s way begins before the Pass Gate');
  assert.ok(ramp2.line.points.some(p => p.x > LANDING.maxX && p.x < EAST_JAMB.maxX && p.z > EAST_JAMB.minZ && p.z < EAST_JAMB.maxZ), 'and passes over the shelf');
  const planeDistance = (slab, p) => Math.hypot(Math.max(0, slab.minX - p.x, p.x - slab.maxX), Math.max(0, Math.min(slab.lipZ, slab.lipZ + slab.dir * SLAB.run) - p.z, p.z - Math.max(slab.lipZ, slab.lipZ + slab.dir * SLAB.run)));
  const apronDistance = (slab, p) => Math.hypot(Math.max(0, slab.minX - p.x, p.x - slab.maxX), Math.max(0, Math.min(slab.lipZ + slab.dir * SLAB.run, slab.lipZ + slab.dir * (SLAB.run + SLAB.apron)) - p.z, p.z - Math.max(slab.lipZ + slab.dir * SLAB.run, slab.lipZ + slab.dir * (SLAB.run + SLAB.apron))));
  for (const ramp of RAMPS) for (const p of ramp.line.points) assert.ok(!onLanding(p.x, p.z, -3) && VARN_SLABS.every(slab => planeDistance(slab, p) >= 5 && apronDistance(slab, p) >= 3), `${ramp.id} comes within reach of the climbers’ route at ${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
});

test('the town: a keep in its own ward, barracks, a market square, and houses on a street - a city and not a castle', () => {
  const inside = (x, z) => VARN_CIRCUIT.inside(x, z) && VARN_CIRCUIT.outward(x, z) < -VARN_STANDARD.wallThickness / 2;
  assert.ok(VARN_BUILDINGS.length >= 18, `${VARN_BUILDINGS.length} buildings`);
  assert.ok(VARN_BUILDINGS.filter(b => b.kind === 'house').length >= 10, 'a town of houses');
  assert.ok(VARN_BUILDINGS.filter(b => b.kind === 'barracks').length >= 3 && VARN_BUILDINGS.some(b => b.kind === 'granary') && VARN_BUILDINGS.some(b => b.kind === 'stables'));
  assert.equal(new Set(VARN_BUILDINGS.map(b => b.id)).size, VARN_BUILDINGS.length);
  const boxes = [...VARN_BUILDINGS.map(b => ({ id: b.id, x: b.x, z: b.z, hx: b.width / 2, hz: b.depth / 2 })), { id: 'keep', x: VARN_KEEP.x, z: VARN_KEEP.z, hx: VARN_KEEP.size / 2, hz: VARN_KEEP.size / 2 }];
  for (const b of boxes) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) assert.ok(inside(b.x + sx * b.hx, b.z + sz * b.hz), `${b.id} is inside the walls`);
    // Clear of the street, by more than a cart.
    assert.ok(Math.abs(b.x - VARN.axis) - b.hx > 2.4, `${b.id} stands in the street`);
    for (const other of boxes) if (other !== b) assert.ok(Math.abs(b.x - other.x) > b.hx + other.hx + .7 || Math.abs(b.z - other.z) > b.hz + other.hz + .7, `${b.id} and ${other.id} overlap`);
  }
  // The keep is in the ward, the ward is in the corner by the Pass Gate, and its wall has one gate.
  assert.ok(VARN_KEEP.x - VARN_KEEP.size / 2 > VARN_WARD.minX && VARN_KEEP.x + VARN_KEEP.size / 2 < VARN_WARD.maxX && VARN_KEEP.z + VARN_KEEP.size / 2 < VARN_WARD.maxZ);
  assert.equal(VARN_WARD_WALL.open, true); assert.equal(VARN_WARD_WALL.gates.length, 1);
  assert.ok(VARN_KEEP.height > VARN_STANDARD.towerPlatform + 8, 'the keep stands well over the towers');
  // The square is open ground on the street.
  assert.ok(boxes.every(b => Math.abs(b.x - VARN_SQUARE.x) > VARN_SQUARE.halfX + b.hx - .5 || Math.abs(b.z - VARN_SQUARE.z) > VARN_SQUARE.halfZ + b.hz - .5), 'nothing stands in the square');
});

test('the garrison: the Empire’s men-at-arms on Varn’s walls and the forts’, as figures, standing and walking, and nobody with a name', () => {
  const summary = garrisonSummary();
  assert.equal(VARN_GARRISON.length, 15); assert.equal(FORT_GARRISONS.length, 13); assert.equal(summary.total, 28);
  assert.deepEqual(Object.fromEntries(LOTHARN_FORTS.map(fort => [fort.id, summary[fort.id].count])), { 'fort-vastos': 5, 'fort-meneth': 4, 'fort-reach': 4 });
  assert.ok(summary.varn.walking === 2 && summary['fort-vastos'].walking === 1, 'a few walk the walls');
  // The Empire's own soldier build, and his officers, and nothing else; soldiers are what the trimmed cast keeps.
  for (const man of LOTHARN_GARRISON_FIGURES) {
    assert.ok(['legion-soldier', 'legion-officer'].includes(man.role) && SOLDIER_ROLES.includes(man.role), man.id);
    assert.ok(!('name' in man) && !('lines' in man) && !('holds' in man), `${man.id} has a name, lines or a stake`);
    assert.ok(Number.isFinite(man.x) && Number.isFinite(man.z) && Number.isFinite(man.lift) && Number.isFinite(man.yaw), man.id);
    assert.ok(man.ground ? man.lift === 0 : man.lift > 3, `${man.id} stands ${man.lift} m up`);
  }
  assert.equal(new Set(LOTHARN_GARRISON_FIGURES.map(man => man.id)).size, LOTHARN_GARRISON_FIGURES.length);
  assert.equal(LOTHARN_GARRISON_FIGURES.filter(man => man.role === 'legion-officer').length, 1 + LOTHARN_FORTS.length, 'one officer on each keep');
  // Every one of them is in the game's one list of wall figures.
  for (const man of LOTHARN_GARRISON_FIGURES) assert.ok(WALL_FIGURES.includes(man), `${man.id} is not a wall figure`);
  // Where they stand: on a tower's own footprint, on the wall line, on a gate's gallery, on a keep, on a turret, or on the
  // ground inside a gate. Each measured against the circuit it belongs to.
  const circuitOf = man => man.id.startsWith('varn') ? VARN_CIRCUIT : LOTHARN_FORTS.find(fort => man.id.startsWith(fort.id)).circuit;
  for (const man of LOTHARN_GARRISON_FIGURES) {
    const C = circuitOf(man);
    if (/tower/.test(man.id)) assert.ok(C.towers.some(t => Math.abs(t.x - man.x) < .01 && Math.abs(t.z - man.z) < .01) && typeof man.base === 'function', `${man.id} is not on a tower`);
    else if (man.walk) { assert.ok(Math.abs(C.outward(man.x, man.z)) < .6 && Math.abs(C.outward(man.walk.x, man.walk.z)) < .6, `${man.id} walks off the wall`); assert.equal(man.walk.pace, PATROL_PACE); assert.ok(Math.hypot(man.walk.x - man.x, man.walk.z - man.z) > 10); }
    else if (/gallery/.test(man.id)) assert.ok(C.gates.some(g => Math.abs(g.centre.x - man.x) < .01 && Math.abs(g.centre.z - man.z) < .01));
    else if (man.ground) { assert.ok(C.inside(man.x, man.z) || C.open, `${man.id} stands outside`); assert.ok(C.gates.some(g => Math.hypot(g.centre.x - man.x, g.centre.z - man.z) < 7), 'inside a gate'); }
    else if (/keep/.test(man.id)) assert.equal(man.role, 'legion-officer');
    else if (/watch/.test(man.id)) assert.ok(VARN_WATCHES.some(w => Math.hypot(w.x - man.x, w.z - man.z) < 2.5));
    else assert.fail(`${man.id} stands nowhere this test knows`);
  }
  // The patrol: back and forth along the stretch at the pace, facing the way he goes.
  const walker = VARN_GARRISON.find(man => man.walk), length = Math.hypot(walker.walk.x - walker.x, walker.walk.z - walker.z);
  const a = patrolAt(walker, 0), b = patrolAt(walker, length / PATROL_PACE / 2), c = patrolAt(walker, length / PATROL_PACE), d = patrolAt(walker, length / PATROL_PACE * 2);
  assert.ok(Math.hypot(a.x - walker.x, a.z - walker.z) < .01 && Math.hypot(c.x - walker.walk.x, c.z - walker.walk.z) < .01 && Math.hypot(d.x - walker.x, d.z - walker.z) < .01);
  assert.ok(Math.abs(Math.hypot(b.x - walker.x, b.z - walker.z) - length / 2) < .01);
  assert.ok(Math.abs(Math.sin(a.yaw) - (walker.walk.x - walker.x) / length) < .01 && Math.abs(Math.cos(a.yaw) - (walker.walk.z - walker.z) / length) < .01, 'he faces the way he goes');
  assert.ok(Math.abs(Math.sin(c.yaw) + (walker.walk.x - walker.x) / length) < .01, 'and turns round at the end');
  // The watch itself, with a stand-in factory: made lazily, two a frame, shown within range, walked and turned.
  const made = [];
  const factory = () => { const actor = { group: new THREE.Group(), materialized: false, animate(seconds, pace) { this.materialized = true; this.pace = pace; this.seconds = seconds; } }; made.push(actor); return actor; };
  const scene = new THREE.Scene(), watch = createWallWatch({ scene, createCharacter: factory, heightAt: groundWithRiver });
  assert.equal(watch.figures.length, WALL_FIGURES.length); assert.equal(made.filter(m => m.materialized).length, 0, 'no rig is built at start');
  const here = { x: VARN.axis, z: VARN_CORNERS[0].z - 8 };
  for (let frame = 0; frame < 12; frame++) watch.update(here, {}, frame * .1);
  const near = watch.figures.filter(f => Math.hypot(f.entry.x - here.x, f.entry.z - here.z) < 95);
  assert.ok(near.length >= 12, `${near.length} figures within sight of the Pass Gate`);
  assert.ok(near.every(f => f.actor.group.visible && f.actor.materialized), 'all of them shown after a few frames');
  assert.ok(watch.figures.filter(f => f.entry.id.startsWith('fort-')).every(f => !f.actor.group.visible), 'the forts’ men are not');
  let shownAfterOne = 0; { const again = createWallWatch({ scene: new THREE.Scene(), createCharacter: factory, heightAt: groundWithRiver }); again.update(here, {}, 0); shownAfterOne = again.figures.filter(f => f.actor.group.visible).length; }
  assert.equal(shownAfterOne, 2, 'two rigs a frame');
  const w = watch.figures.find(f => f.entry.id === 'varn-pass-walk-west');
  const p0 = w.actor.group.position.clone(); watch.update(here, {}, 4); const p1 = w.actor.group.position.clone();
  assert.ok(p0.distanceTo(p1) > 1 && w.actor.pace === PATROL_PACE, 'the walker walked');
  // On the wall walk: the wall's own footing (the lowest ground under its piece and a little inside it, as the masonry lays it) plus the walk's height.
  assert.ok(Math.abs(p1.y - (w.entry.base(groundWithRiver, p1.x, p1.z) + VARN_STANDARD.walkHeight + .07)) < .01, 'on the wall walk');
  assert.ok(Math.abs(p1.y - (groundWithRiver(p1.x, p1.z) + VARN_STANDARD.walkHeight + .07)) < 2.5, 'and within a step of the ground under him plus the walk');
  const standing = watch.figures.find(f => f.entry.id === 'varn-pass-tower-a');
  assert.equal(standing.actor.pace, 0); assert.ok(Math.abs(standing.actor.group.position.y - (groundWithRiver(standing.entry.x, standing.entry.z) + VARN_STANDARD.towerPlatform + 2.2 + 1.2 + .2)) < 1.5, 'on the gate tower’s platform');
});

test('the chart, the campaign’s settlements and the build record all know Varn, and every place of it is Amod’s', () => {
  for (const place of VARN_LANDMARKS) {
    assert.ok(place.description.length > 80 && place.name.length > 3, place.id);
    assert.equal(hexOwnerAt(place.x, place.z), place.id === 'varn-slabs' ? EAST_LOTHARN : 'Amod', place.id);
  }
  assert.equal(VARN_LANDMARKS[0].name, 'Varn');
  const amod = regions.find(region => region.name === 'Amod');
  const lotharn = regions.find(region => region.name === EAST_LOTHARN);
  for (const place of VARN_LANDMARKS) assert.ok((place.id === 'varn-slabs' ? lotharn : amod).landmarks.includes(place.id), `${place.id} is on its country’s own list`);
  const area = SUBREGIONS.find(one => one.id === 'varn');
  assert.ok(area && area.region === 'Amod' && insideRegion('Amod', area.x, area.z) && Math.hypot(area.x - VARN.x, area.z - VARN.z) < 5);
  assert.match(area.note, /shut/);
  assert.equal(SETTLEMENTS.varn.region, 'Amod'); assert.match(SETTLEMENTS.varn.note, /wicket/);
  assert.ok(describeRegion('Amod').settlements.some(place => place.name === 'Varn'));
  assert.match(BUILD_STATUS.Amod.detail, /Varn/); assert.match(BUILD_STATUS.Amod.work, /Varn has its garrison/); assert.doesNotMatch(BUILD_STATUS.Amod.work, /built and empty/);
  assert.match(BUILD_STATUS[EAST_LOTHARN].detail, /landing/); assert.match(BUILD_STATUS['West Lotharn Mountains'].work, /garrisoned/);
});

// ---------------------------------------------------------------------------
// The built world
// ---------------------------------------------------------------------------
const scene = new THREE.Scene(), world = await scopedWorld(scene, [10, 20]);
const walkingSlope = (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world);
/** The traveler's own step, with the closed-place rule the host adds to it (src/main.js): a step into a closed place is refused. */
const travelerStep = (x, z, nx, nz) => walkingSlope(x, z, nx, nz) && !closedRegionEntered({ x, z }, { x: nx, z: nz });
const climbWorld = { bounds: world.bounds, colliders: world.colliders, heightAt: world.heightAt, waterAt: world.waterAt, regionAt: world.regionAt,
  nearColliders: (x, z, r) => world.nearColliders(x, z, r), unclimbableAt: world.unclimbableAt };

// The ground round the city, a metre apart: the notch's tip, both jambs, the faces behind them, the pass above and Amod below.
const BOX = { minX: -1330, maxX: -960, minZ: -870, maxZ: -660 };
const L = sampleLattice(world, BOX, 1);
const pass = [{ x: VARN_ROAD_HEAD.x, z: VARN_ROAD_HEAD.z - 3 }, { x: PASS_ROAD[2].x, z: PASS_ROAD[2].z }], amodSide = [{ x: VARN.axis, z: -692 }, { x: -1132, z: -674 }];
/** Amod's ground on the town's side of the pass front: inside the walls and everything south of them. */
const southOfTheFront = (x, z) => hexOwnerAt(x, z) === 'Amod' && z > VARN_CORNERS[0].z + VARN_STANDARD.wallThickness / 2;
/** Amod's ground behind the city: the hills the south slab comes down onto and the road down them. */
const behindTheCity = (x, z) => hexOwnerAt(x, z) === 'Amod' && z > VARN_CORNERS[3].z + 6;
/** The pass, above the city: the ground the pass road comes down. */
const upThePass = (x, z) => z < VARN_CORNERS[0].z - 12 && Math.abs(x - VARN.axis) < 45;
/** How many square metres of `where` a flood got to, at a worst fall under `maxFall`. */
const area = (cost, where, maxFall = Infinity) => { let n = 0; for (let k = 0; k < cost.length; k++) if (cost[k] < maxFall) { const p = L.at(k); if (where(p.x, p.z)) n++; } return n; };
/** The peaks' own ways, which a lattice a metre apart cannot see are walked (tests/lattice-flood.js). */
const ways = (x, z) => onPeakWay(x, z);

test('the built city: its walls, towers, gates, keep, town, slabs and rails are in the world, and no townspeople', t => {
  const m = world.varnMetrics;
  assert.equal(m.gates, 2); assert.ok(m.towers >= 14, `${m.towers} towers`); assert.equal(m.buildings, VARN_BUILDINGS.length + 1);
  assert.deepEqual(m.shut, LOTHARN_PASSES_SHUT ? [VARN_PASS_GATE, VARN_AMOD_GATE] : []); assert.equal(m.wicket, LOTHARN_PASSES_SHUT ? VARN_AMOD_GATE : null);
  assert.equal(m.slabs, 2);
  assert.ok(m.vertices > 10000, `${m.vertices} vertices of masonry`);
  t.diagnostic(`Varn: ${m.vertices} vertices in ${m.batches} batches, ${m.towers} towers, ${m.colliders} colliders; lifted ${JSON.stringify(m.lifted)}`);
  assert.ok(scene.getObjectByName('Varn walls') && scene.getObjectByName('Varn citadel') && scene.getObjectByName('Varn town') && scene.getObjectByName('Varn ground'));
  for (const kind of ['varn-wall', 'varn-tower', 'varn-ditch', 'varn-ward-wall', 'varn-keep', 'varn-well', 'varn-parapet', 'varn-watch', 'varn-gate-shut'])
    assert.ok(world.colliders.some(c => c.kind === kind), `no ${kind} in the world`);
  assert.equal(world.colliders.filter(c => c.kind === 'varn-parapet').length, VARN_PARAPETS.length);
  assert.equal(world.colliders.filter(c => c.kind === 'varn-watch').length, VARN_WATCHES.length);
  // Both gates have their row of colliders; the Amod Gate's stops short of the wicket.
  const shut = id => world.colliders.filter(c => c.kind === 'varn-gate-shut' && c.gate === id);
  assert.ok(shut(VARN_PASS_GATE).length >= 7 && shut(VARN_AMOD_GATE).length >= 5 && shut(VARN_AMOD_GATE).length < shut(VARN_PASS_GATE).length);
  const w = varnWicket();
  assert.ok(shut(VARN_AMOD_GATE).every(c => Math.abs(c.x - w.x) >= w.width / 2 + c.r - .01), 'a collider stands in the wicket');
  assert.ok(canStand(w.x, w.z, world, .34) && canStand(w.x, w.z - 1.5, world, .34) && canStand(w.x, w.z + 1.5, world, .34), 'a body passes the wicket');
  assert.ok(!canStand(w.gate.centre.x, w.gate.centre.z, world, .34) && !canStand(w.x + 2.2, w.z, world, .34), 'and nowhere else across the gate');
  // Every house is on the chart: a `house` collider with a footprint.
  const houses = world.colliders.filter(c => c.kind === 'house' && String(c.id).startsWith('varn-'));
  assert.equal(houses.length, VARN_BUILDINGS.length);
  for (const house of houses) assert.ok(house.width > 0 && house.depth > 0);
  for (const place of VARN_LANDMARKS) {
    assert.ok(world.landmarks.some(one => one.id === place.id), `${place.id} is not in the world’s landmarks`);
    assert.ok(canStand(place.x, place.z, world, .34), `${place.id} cannot be stood on`);
  }
  // No townspeople: nobody the world places stands in Varn. The garrison is the host's wall figures, tested above.
  for (const [id, at] of Object.entries(world.npcPositions)) assert.ok(Math.hypot(at.x - VARN.x, at.z - VARN.z) > 120, `${id} stands in Varn`);
  assert.equal(world.unclimbableAt, unclimbableAt, 'the world answers the climbing rule from the one table');
  // The road is one of the world's roads, for the chart and for whoever steers by it.
  assert.ok(world.paths.some(path => Math.hypot(path[0].x - VARN_ROAD_HEAD.x, path[0].z - VARN_ROAD_HEAD.z) < 1 && Math.hypot(path.at(-1).x - AMOD_ROAD.at(-1).x, path.at(-1).z - AMOD_ROAD.at(-1).z) < 1));
  // The slabs stand in the built ground as the plan has them, and the landing is clear.
  for (const slab of VARN_SLABS) { const foot = slabFoot(slab); assert.ok(Math.abs(world.heightAt(foot.x, foot.z) - SLAB.foot) < .01 && canStand(foot.x, foot.z, world, .34), `${slab.id}'s apron`); }
  for (let x = -1093; x <= -1077; x += 2) for (let z = -790; z <= -728; z += 4) assert.ok(canStand(x, z, world, .34) || world.colliders.some(c => c.kind === 'varn-watch' && Math.hypot(c.x - x, c.z - z) < c.r + .4), `something stands on the landing at ${x}, ${z}`);
});

test('the neighbours’ scatter was lifted off the city’s ground', () => {
  const m = world.varnMetrics.lifted;
  assert.ok(m.trees > 20 && m.colliders > 5, JSON.stringify(m));
  for (const c of world.colliders) {
    if (!['region-tree', 'lotharn-tree', 'ridge-rock', 'lotharn-outcrop'].includes(c.kind)) continue;
    assert.ok(!varnKeepsClear(c.x, c.z), `a ${c.kind} stands on Varn’s ground at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
  }
  for (const tree of world.treeRegistry.trees) assert.ok(!varnKeepsClear(tree.x, tree.z), `${tree.id} is still on the register`);
});

test('the pass is shut to a walker, whatever he is willing to fall: from the pass nothing of Amod behind the wall, and from Amod nothing of the pass', { skip: !LOTHARN_PASSES_SHUT }, t => {
  const down = leastFall(L, world, pass, { midpoints: true, risers: lipRib, riserReach: inVarnRock, ways }), up = leastFall(L, world, amodSide, { midpoints: true, risers: lipRib, riserReach: inVarnRock, ways });
  assert.ok(area(down, upThePass, .01) > 1500 && area(up, behindTheCity, .01) > 5000, 'both floods ran');
  // No way at all: not with a fall that kills, not with any fall.
  assert.equal(area(down, southOfTheFront), 0, `a walker from the pass is in Amod behind the wall (${JSON.stringify(reachedByCountry(L, down, Infinity, southOfTheFront))})`);
  assert.equal(area(up, upThePass), 0, 'a walker from Amod is on the pass');
  // Not onto either jamb's top from the pass on his feet: the eastern peak's own first ramp starts sixteen metres up a slope
  // of one and a third from the forecourt, which is climbing rock and not walking ground (a climber takes it: below). Not
  // onto the landing from anywhere, and not off any lip.
  const onLandingTop = (x, z) => onLanding(x, z, -1), onShelf = (x, z) => x > LANDING.maxX + 1 && x < EAST_JAMB.maxX && z > EAST_JAMB.minZ + 2 && z < EAST_JAMB.maxZ - 2 && varnJambRise(x, z) > .999;
  assert.equal(area(down, onShelf), 0, `${area(down, onShelf)} m2 of the shelf walked to from the pass`);
  assert.equal(area(down, onLandingTop), 0, 'a walker from the pass is on the landing');
  assert.equal(area(up, onLandingTop), 0, 'a walker from Amod is on the landing'); assert.equal(area(up, (x, z) => varnJambRise(x, z) > .999), 0, 'or on a jamb at all');
  // The square is walked to from Amod on the lattice, through the wicket - the lattice knows the colliders and not the rule
  // that the wicket opens one way; that rule is the traveler's own step, below. Not from the pass.
  assert.equal(up[L.cell(VARN_SQUARE.x, VARN_SQUARE.z)], 0, 'the market square is reached from Amod through the wicket');
  assert.equal(down[L.cell(VARN_SQUARE.x, VARN_SQUARE.z)], Infinity, 'and not from the pass');
  t.diagnostic(`from the pass a walker has ${area(down, (x, z) => hexOwnerAt(x, z) === 'Amod')} m2 of Amod: the forecourt before the Pass Gate, which is Amod's hex and no further`);
});

test('a traveler walked at the pass front with the game’s own step is stopped by it everywhere along it', { skip: !LOTHARN_PASSES_SHUT }, () => {
  const front = VARN_CORNERS[0].z;
  // South at the gate, and south at every second metre of the wall from jamb to jamb.
  let tried = 0;
  for (let x = WEST_JAMB.maxX + .6; x <= EAST_JAMB.minX - .6; x += 2) {
    const walker = { x, z: front - 13.5 };
    if (!canStand(walker.x, walker.z, world, .34)) continue;
    tried++;
    walker.y = world.heightAt(walker.x, walker.z);
    for (let i = 0; i < 260; i++) { moveCharacter(walker, 0, .12, world, .34, { canTraverse: walkingSlope }); walker.y = world.heightAt(walker.x, walker.z); }
    assert.ok(walker.z < front - .5, `he walked through the pass front at x ${x.toFixed(1)} to z ${walker.z.toFixed(2)}`);
  }
  assert.ok(tried > 40, `${tried} walkers sent at the wall`);
  // And into the corner where the front meets each jamb, then on along the rock: the foot of the face is the end of it.
  for (const jamb of VARN_JAMBS) {
    const walker = { x: jamb.inward > 0 ? jamb.maxX + 2 : jamb.minX - 2, z: jamb.minZ + 3 };
    walker.y = world.heightAt(walker.x, walker.z);
    for (const [dx, dz] of [[-jamb.inward, 0], [0, 1], [-jamb.inward, 0], [0, 1]]) for (let i = 0; i < 120; i++) { moveCharacter(walker, dx * .12, dz * .12, world, .34, { canTraverse: walkingSlope }); walker.y = world.heightAt(walker.x, walker.z); }
    assert.ok(walker.z < front - .5 && walker.y < VARN_FLOOR.upper + 3, `he got to ${walker.x.toFixed(1)}, ${walker.z.toFixed(1)} at ${walker.y.toFixed(1)} m by ${jamb.id}`);
  }
  // The Amod Gate, from Amod: a traveler walked at it is stopped by the leaves, and at the wicket by the rule - and a traveler
  // inside walks out through the wicket with the same step.
  const g = gate(VARN_AMOD_GATE), w = varnWicket(), inZ = g.inward.z;   // inward is north: outside the Amod Gate is +z
  for (const x of [g.centre.x, g.centre.x + 1.2, w.x]) {
    const walker = { x, z: g.centre.z - inZ * 12 }; walker.y = world.heightAt(walker.x, walker.z);
    for (let i = 0; i < 200; i++) { moveCharacter(walker, 0, inZ * .12, world, .34, { canTraverse: travelerStep }); walker.y = world.heightAt(walker.x, walker.z); }
    assert.ok(!VARN_CIRCUIT.inside(walker.x, walker.z) && (walker.z - g.centre.z) * -inZ > -.2, `he got in at x ${x.toFixed(1)}: ${walker.x.toFixed(1)}, ${walker.z.toFixed(1)}`);
  }
  const leaver = { x: w.x, z: g.centre.z + inZ * 6 }; leaver.y = world.heightAt(leaver.x, leaver.z);
  for (let i = 0; i < 200; i++) { moveCharacter(leaver, 0, -inZ * .12, world, .34, { canTraverse: travelerStep }); leaver.y = world.heightAt(leaver.x, leaver.z); }
  assert.ok(!VARN_CIRCUIT.inside(leaver.x, leaver.z) && (leaver.z - g.centre.z) * -inZ > 8, `he did not get out: ${leaver.x.toFixed(1)}, ${leaver.z.toFixed(1)}`);
  // And without the rule the wicket is a door both ways, so it is the rule and not the stone that keeps it.
  const intruder = { x: w.x, z: g.centre.z - inZ * 6 }; intruder.y = world.heightAt(intruder.x, intruder.z);
  for (let i = 0; i < 200; i++) { moveCharacter(intruder, 0, inZ * .12, world, .34, { canTraverse: walkingSlope }); intruder.y = world.heightAt(intruder.x, intruder.z); }
  assert.ok(VARN_CIRCUIT.inside(intruder.x, intruder.z), 'the wicket is a real gap in the stone');
});

test('nobody steps off a jamb’s top: the west jamb and the east shelf are walked inside their breastworks and no further; the landing is reached from neither', t => {
  const onTopOf = jamb => (x, z) => x >= jamb.minX && x <= jamb.maxX && z >= jamb.minZ && z <= jamb.maxZ && L.heights[L.cell(x, z)] > JAMB.top - 3 && !onLanding(x, z, -3);
  const parts = [{ name: WEST_JAMB.id, jamb: WEST_JAMB, seedX: WEST_JAMB.maxX - 20, onTop: onTopOf(WEST_JAMB) }, { name: 'the east shelf', jamb: EAST_JAMB, seedX: LANDING.maxX + 12, onTop: onTopOf(EAST_JAMB) }];
  for (const part of parts) {
    const { jamb } = part, seed = L.near(part.seedX, (jamb.minZ + jamb.maxZ) / 2, 5);
    assert.ok(seed >= 0 && L.heights[seed] > JAMB.top - 2 && L.heights[seed] < JAMB.top + 2, `${part.name} can be stood on`);
    // Kept to the top itself he walks all of it inside the breastwork and none of the strip between the breastwork and the lip.
    const cost = leastFall(L, world, [seed], { midpoints: true, risers: lipRib, riserReach: inVarnRock, within: part.onTop });
    const runs = VARN_PARAPETS.filter(run => run.jamb === jamb.id), side = name => runs.find(run => run.side === name), REACH = PARAPET.half + .35;
    const beyond = (p, run, sign, axis) => {
      if (!run) return false;
      const spans = axis === 'x' ? p.z >= Math.min(run.from.z, run.to.z) && p.z <= Math.max(run.from.z, run.to.z) : p.x >= Math.min(run.from.x, run.to.x) && p.x <= Math.max(run.from.x, run.to.x);
      return spans && (axis === 'x' ? (p.x - run.x) * sign : (p.z - run.z) * sign) > REACH;
    };
    let top = 0, strip = 0;
    for (let k = 0; k < cost.length; k++) {
      const p = L.at(k);
      if (!part.onTop(p.x, p.z) || !L.stand[k]) continue;
      const outside = (jamb === WEST_JAMB && (beyond(p, side('city'), 1, 'x') || beyond(p, side('pass'), -1, 'z'))) || beyond(p, side('amod'), 1, 'z') || beyond(p, side('far'), 1, 'x');
      if (outside) strip++;
      if (cost[k] === Infinity) continue;
      assert.ok(!outside, `past ${part.name}'s breastwork at ${p.x}, ${p.z}`);
      top++;
    }
    assert.ok(strip > 40, `${part.name}: ${strip} m2 of lip outside the breastwork to be kept off`);
    assert.ok(top > 500, `${top} m2 of ${part.name} walked`);
    // He is not shut up there: free of the rectangle he walks back off it along the mountain's own ledge; and he is not on the landing.
    const free = leastFall(L, world, [seed], { midpoints: true, risers: lipRib, riserReach: inVarnRock, ways });
    let off = 0;
    for (let k = 0; k < free.length; k++) if (free[k] === 0) { const p = L.at(k); if (!(p.x >= jamb.minX && p.x <= jamb.maxX && p.z >= jamb.minZ && p.z <= jamb.maxZ) && L.heights[k] > JAMB.top - 6) off++; }
    assert.ok(off > 30, `${part.name}: ${off} m2 of ledge beyond the jamb is walked to from its top`);
    assert.equal(area(free, (x, z) => onLanding(x, z, -1)), 0, `${part.name} reaches the landing`);
    assert.equal(area(free, behindTheCity), 0, `${part.name} reaches Amod behind the city, by any fall`);
    t.diagnostic(`${part.name}: ${top} m2 of top walked, ${off} m2 of the mountain's ledge beyond it`);
  }
  // From the landing: all of it walked inside the city rail, none past it; the shelf reached only by stepping down the
  // twelve-metre step, Amod only by a fall of the slab's height, and the city never.
  const seed = L.near(-1086, -760, 4);
  assert.ok(seed >= 0 && Math.abs(L.heights[seed] - LANDING.top) < .5, 'the landing can be stood on');
  // The wicket is left out of this flood: the lattice knows the colliders and not the rule that it opens one way, and without
  // it a body that came down the south slab would walk round and in through it (which is the traveler's own step's business).
  const wicket = varnWicket(), noWicket = (x, z) => !(Math.abs(x - wicket.x) < 2 && Math.abs(z - wicket.z) < 4);
  const from = leastFall(L, world, [seed], { midpoints: true, risers: lipRib, riserReach: inVarnRock, ways, within: noWicket });
  const city = VARN_PARAPETS.find(run => run.jamb === EAST_JAMB.id && run.side === 'city');
  let landing = 0;
  for (let k = 0; k < from.length; k++) {
    const p = L.at(k); if (!L.stand[k]) continue;
    if (p.x < city.x && p.z > EAST_JAMB.minZ - 1 && p.z < EAST_JAMB.maxZ + 1 && L.heights[k] > JAMB.top) assert.equal(from[k], Infinity, `past the landing's city rail at ${p.x}, ${p.z}`);
    if (VARN_CIRCUIT.inside(p.x, p.z)) assert.equal(from[k], Infinity, `in the city from the landing at ${p.x}, ${p.z}`);
    if (onLanding(p.x, p.z, -1) && from[k] === 0) landing++;
  }
  assert.ok(landing > 900, `${landing} m2 of the landing walked`);
  const shelfCost = Math.min(...[-1068, -1060].map(x => from[L.cell(x, -760)]));
  assert.ok(shelfCost > 10 && shelfCost < 14, `the shelf is reached from the landing by a step of ${shelfCost.toFixed(1)} m`);
  const amodCost = Math.min(...[[-1082, -705], [-1090, -700], [-1070, -706]].map(([x, z]) => from[L.cell(x, z)]));
  assert.ok(amodCost > 55 && amodCost < 70, `Amod is reached from the landing by a fall of ${amodCost.toFixed(1)} m, which is the slab`);
  // The game's own step at the breastworks: a traveler walked at the city rail from either top is stopped by it.
  for (const [jamb, startX, dx] of [[WEST_JAMB, WEST_JAMB.maxX - PARAPET.back - 6, .12], [EAST_JAMB, LANDING.rail + 6, -.12]]) {
    const rail = VARN_PARAPETS.find(run => run.jamb === jamb.id && run.side === 'city');
    let tried = 0;
    for (let z = jamb.minZ + 12; z <= jamb.maxZ - 12; z += 5) {
      const walker = { x: startX, z };
      if (!canStand(walker.x, walker.z, world, .34)) continue;
      tried++;
      walker.y = world.heightAt(walker.x, walker.z);
      for (let i = 0; i < 120; i++) { moveCharacter(walker, dx, 0, world, .34, { canTraverse: walkingSlope }); walker.y = world.heightAt(walker.x, walker.z); }
      assert.ok((walker.x - rail.x) * Math.sign(dx) < 0 && walker.y > JAMB.top - 3, `he went over ${jamb.id}'s breastwork at z ${z} to x ${walker.x.toFixed(1)}`);
    }
    assert.ok(tried > 5, `${tried} walkers sent at ${jamb.id}'s breastwork`);
  }
});

test('the game’s own step and the game’s own fall: nobody slides off the south-west peak’s ledge, nobody mounts a rim, and without the stop he went over', t => {
  // The walking and running paces at their caps (src/gameplay/movement/locomotion-skills.js), thirty frames a second.
  const [stop] = LIP_STOPS, south = 0, walk = 6.6, run = 10.5, FRAME = 1 / 30;
  // At the stop, from both dead ends of the ledge, walking and running, straight at it and slantwise: no fall that costs a
  // point of health, never past its line, still on the ledge - and from where he fetched up he walks away again.
  let sent = 0;
  for (const [x, z] of [[-1422, -651.5], [-1418, -651.2], [-1394, -651.5], [-1391, -652.5]]) for (const [heading, speed] of [[south, walk], [.6, run], [-.6, run]]) {
    assert.ok(canStand(x, z, world, .34), `nowhere to stand at ${x}, ${z}`);
    const went = travel(world, { x, z, heading, speed, seconds: 4, dt: FRAME }); sent++;
    assert.ok(went.damage === 0 && went.worst < 1, `from ${x}, ${z} on ${heading}: a fall of ${went.worst.toFixed(1)} m costing ${went.damage}`);
    assert.ok(went.at.z < stop.from.z - .5 && went.at.y > JAMB.top - 6, `from ${x}, ${z} on ${heading} he is at ${went.at.x.toFixed(1)}, ${went.at.z.toFixed(1)}, ${went.at.y.toFixed(1)} m`);
    // Not kept: on one of the eight winds he is five metres off in two seconds, unhurt. (Not on all of them: where he slid
    // along the ridge to the place the course above bulges out, the way back is the way he came.)
    const away = Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map(wind => { const left = travel(world, { x: went.at.x, z: went.at.z, heading: wind * Math.PI / 4, speed: walk, seconds: 1.5, dt: FRAME }); return left.damage ? 0 : Math.hypot(left.at.x - went.at.x, left.at.z - went.at.z); }));
    assert.ok(away > 5, `he is kept at ${went.at.x.toFixed(1)}, ${went.at.z.toFixed(1)}: ${away.toFixed(1)} m is the farthest he walks`);
  }
  // The same traveler on the ground as it lay without the lips: over the edge, forty metres, the whole of what a fall
  // can cost - and alive at the bottom with anything over a hundred health, on the Empire's side of the mountain.
  const bare = { bounds: world.bounds, heightAt: varnBeforeLips, waterAt: world.waterAt, regionAt: world.regionAt, colliders: [], nearColliders: () => [] };
  const over = travel(bare, { x: -1418, z: -651.2, heading: south, speed: walk, seconds: 8, dt: FRAME });
  assert.ok(over.worst > 35 && over.damage >= TERRAIN_FALL.maxDamage && over.at.y < 80 && over.at.z > -640, `without the stop: worst fall ${over.worst.toFixed(1)} m, damage ${over.damage}, at ${over.at.x.toFixed(1)}, ${over.at.z.toFixed(1)}, ${over.at.y.toFixed(1)} m`);
  assert.ok(maxHealth(99) > TERRAIN_FALL.maxDamage, 'which a tough traveler lives through');
  // The rims, where the lattice once stepped onto one (the west jamb's south-west corner and the ledge beyond it): a traveler
  // sent at the rim from the ledge, every three metres for forty, square on and slantwise, never has a foot on more than its
  // first tread and never leaves the ledge's level.
  let tried = 0;
  for (let i = 0; i <= 14; i++) {
    const x = -1267 - i * 2.1, z = -727 + i * 2.1;   // the ledge's walked ground, a few metres inside the rim, which runs north-east to south-west here
    if (!canStand(x, z, world, .34) || lipRib(x, z) > 0) continue;
    for (const heading of [Math.PI / 4, Math.PI / 2, 0]) {   // toward the brink (south-east), east, south
      const went = travel(world, { x, z, heading, speed: run, seconds: 2, dt: FRAME }); tried++;
      assert.ok(went.damage === 0 && went.worst < 1 && went.at.y > JAMB.top - 6, `from ${x}, ${z} on ${heading.toFixed(2)}: a fall of ${went.worst.toFixed(1)} m to ${went.at.y.toFixed(1)} m`);
      assert.ok(lipRib(went.at.x, went.at.z) < RIB.height / 3, `he stands ${lipRib(went.at.x, went.at.z).toFixed(2)} m up the rim at ${went.at.x.toFixed(1)}, ${went.at.z.toFixed(1)}`);
    }
  }
  assert.ok(tried >= 30, `${tried} travelers sent at the rim`);
  t.diagnostic(`${sent} travelers sent at the stop and ${tried} at the rim by the west jamb; without the lips the first of them fell ${over.worst.toFixed(1)} m and landed at ${over.at.y.toFixed(1)} m`);
});

test('the climber’s route: a tireless climber from the pass is in Amod behind the city by the slabs and by nothing else, and from Amod on the pass the same way', { skip: !LOTHARN_PASSES_SHUT }, t => {
  const slabsShut = (x, z) => world.unclimbableAt(x, z) || !!onSlab(x, z, .5);
  // With the slabs' rock made no-hold like the rest: no way behind the wall by any fall, and no way onto the pass from Amod.
  const shut = { climber: true, forbidden: slabsShut, midpoints: true, risers: lipRib, riserReach: inVarnRock, ways };
  const downShut = leastFall(L, world, pass, shut), upShut = leastFall(L, world, amodSide, shut);
  assert.ok(area(downShut, upThePass, .01) > 1500 && area(upShut, behindTheCity, .01) > 4000, 'both floods ran');
  assert.equal(area(downShut, southOfTheFront), 0, `but for the slabs a climber from the pass is in Amod behind the wall (${JSON.stringify(reachedByCountry(L, downShut, Infinity, southOfTheFront))})`);
  assert.equal(area(upShut, upThePass), 0, 'but for the slabs a climber from Amod is on the pass');
  assert.equal(area(downShut, (x, z) => onLanding(x, z, -1)), 0, 'or on the landing');
  // He is on the east jamb's shelf, though: the slope under the eastern peak's first ramp keeps its hold beside the ramp, and
  // the ramp and the ledge take him there, as the mountain's own way always did.
  const onShelf = (x, z) => x > LANDING.maxX + 1 && x < EAST_JAMB.maxX && z > EAST_JAMB.minZ + 2 && z < EAST_JAMB.maxZ - 2 && varnJambRise(x, z) > .999;
  assert.ok(area(downShut, onShelf, .01) > 300, `${area(downShut, onShelf, .01)} m2 of the shelf reached by a climber from the pass`);
  // With the slabs as they are: through, by the landing, with no fall worse than the step down into the north slab's apron,
  // which is cut two metres and more into the foot of the hill (a step a traveler takes without harm, under `safeDrop`).
  const open = { climber: true, forbidden: world.unclimbableAt, midpoints: true, risers: lipRib, riserReach: inVarnRock, ways }, SAFE = TERRAIN_FALL.safeDrop;
  const down = leastFall(L, world, pass, open), up = leastFall(L, world, amodSide, open);
  assert.ok(area(down, behindTheCity, SAFE) > 1000, `${area(down, behindTheCity, SAFE)} m2 of Amod behind the city reached from the pass by the slabs`);
  assert.ok(area(up, upThePass, SAFE) > 1000, `${area(up, upThePass, SAFE)} m2 of the pass reached from Amod by the slabs`);
  for (const slab of VARN_SLABS) { const foot = slabFoot(slab), k = L.cell(foot.x, foot.z); assert.ok(down[k] < SAFE && up[k] < SAFE, `${slab.id}'s apron: ${down[k].toFixed(1)} m from the pass, ${up[k].toFixed(1)} m from Amod`); }
  assert.ok(area(down, (x, z) => onLanding(x, z, -1), SAFE) > 800 && area(up, (x, z) => onLanding(x, z, -1), SAFE) > 800, 'over the landing');
  // And the aprons are no pits: from each, a walker is out onto the hill beside it.
  for (const slab of VARN_SLABS) { const foot = slabFoot(slab), off = leastFall(L, world, [L.cell(foot.x, foot.z)], { midpoints: true, risers: lipRib, riserReach: inVarnRock, ways }); assert.ok(area(off, (x, z) => !onSlab(x, z, 1), .01) > 500, `${slab.id}'s apron is a pit`); }
  // No other way: every cell he reaches behind the city, he reaches with the slabs shut as well or only by way of the landing.
  // (Both floods are the same but for the slabs; so what the slabs add is what they add.)
  let added = 0; for (let k = 0; k < down.length; k++) if (down[k] < Infinity && downShut[k] === Infinity) added++;
  t.diagnostic(`the slabs add ${added} m2 of ground to what a climber from the pass reaches: the landing, and Amod behind the city`);
  // The controller itself, at the rock: no hold anywhere along the foot of a jamb's outer faces but at the slabs.
  let offered = 0, holds = 0;
  const unmarked = { ...climbWorld, unclimbableAt: undefined };
  for (const jamb of VARN_JAMBS) for (let x = jamb.minX + 6; x <= jamb.maxX - 2; x += 3) for (const [z, facing] of [[jamb.minZ - .9, 0], [jamb.maxZ + .9, Math.PI]]) {
    if (!canStand(x, z, world, .34)) continue;
    if (RAMPS_KEEP_THEIR_HOLD && [0, .75, 1.5].some(reach => onPeakWay(x, z + Math.cos(facing) * reach))) continue;
    const at = { x, y: world.heightAt(x, z), z }, got = createClimbing({ world: climbWorld }).grab(at, facing, { stamina: 100 });
    if (onSlab(x, z, 2)) { if (got) holds++; continue; }
    assert.equal(got, false, `a hold on ${jamb.id} at ${x}, ${z.toFixed(1)}`);
    if (createClimbing({ world: unmarked }).probe(at, facing).available) offered++;
  }
  assert.ok(offered > 6 && holds >= 2, `${offered} places where the rock would otherwise take a hand, ${holds} holds at the slabs' feet`);
});

test('the caves’ way: a climber from the Col comes to the high chimney’s two doors, and from the railed doors nobody comes to the Empire’s ground, by any fall or any climb but the slabs', { skip: !LOTHARN_PASSES_SHUT }, t => {
  // The whole eastern massif, a metre apart, to its far end and the Empire's ground round it (the reach flood in
  // tests/lotharn-forts.test.js stops at x -840).
  const E = sampleLattice(world, { minX: -1120, maxX: -700, minZ: -1000, maxZ: -650 }, 1);
  const links = caveLinks(E, world.lotharnCaves), walk = { links, ways, risers: lipRib, riserReach: inVarnRock };
  const slabsShut = (x, z) => world.unclimbableAt(x, z) || !!onSlab(x, z, .5), climb = { ...walk, climber: true, forbidden: slabsShut };
  /** The Empire's ground a flood came to, by any fall; the forecourt before the shut Pass Gate is Amod's hex and the pass's ground. */
  const empire = cost => { let n = 0, first = null; for (let k = 0; k < cost.length; k++) if (cost[k] < Infinity && ['Amod', 'Vastos'].includes(E.region[k])) { const p = E.at(k); if (p.z < -783 && Math.abs(p.x - VARN.x) < 60) continue; n++; first ??= `${p.x}, ${p.z}`; } return { area: n, first }; };
  const doorAt = rail => { const cave = world.lotharnCaves.find(one => one.id === rail.cave); return cave.at(rail.end ? cave.openings[1] : cave.openings[0]); };
  const atDoor = (cost, p) => { let least = Infinity; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const k = E.cell(p.x + dx, p.z + dz); if (E.used[k]) least = Math.min(least, cost[k]); } return least; };
  const col = E.near(-1080, -895, 9);
  const walker = leastFall(E, world, [col], walk), climber = leastFall(E, world, [col], climb);
  assert.deepEqual(empire(walker), { area: 0, first: null }, 'a walker from the Col is on the Empire’s ground');
  assert.deepEqual(empire(climber), { area: 0, first: null }, 'but for the slabs a climber from the Col is on the Empire’s ground');
  // The high chimney's two doors: a climber comes to them with no fall that costs anything, by the peak's way and the fourth
  // ledge; a walker does not (the ledge tilts past his grade). Without the way's hold he does not come to them at all - which
  // is what cut them off. The restored lower shelf also connects the chamber and low chimney.
  const without = leastFall(E, world, [col], { ...climb, forbidden: (x, z) => slabsShut(x, z) || onCaveWay(x, z) });
  for (const rail of CAVE_RAILS) {
    const p = doorAt(rail);
    t.diagnostic(`${rail.id}'s door at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: a climber from the Col ${atDoor(climber, p)}, a walker ${atDoor(walker, p)}, without the way ${atDoor(without, p)}`);
    assert.ok(atDoor(climber, p) < TERRAIN_FALL.safeDrop, `${rail.id}'s door: a climber from the Col by ${atDoor(climber, p)}`);
    assert.equal(atDoor(walker, p), Infinity, `a walker comes to ${rail.id}'s door`);
    if (rail.cave === 'eastern-high-chimney') assert.equal(atDoor(without, p), Infinity, `without the high way a climber comes to ${rail.id}'s door`);
  }
  // From the doors themselves, walking and climbing, by any fall: none of the Empire's ground.
  const doors = CAVE_RAILS.map(rail => { const p = doorAt(rail); return E.near(p.x, p.z, 2); });
  assert.ok(doors.every(k => k >= 0), 'nowhere to stand at a door');
  assert.deepEqual(empire(leastFall(E, world, doors, walk)), { area: 0, first: null }, 'a walker out of a cave is on the Empire’s ground');
  assert.deepEqual(empire(leastFall(E, world, doors, climb)), { area: 0, first: null }, 'but for the slabs a climber out of a cave is on the Empire’s ground');
  // And with the game's own step and fall: a traveler stepping out of each door, and from the ground before it, on every
  // fifteen degrees, walking and running, is stopped by the rail and never hurt; he stays on the mountain, not below the door.
  const FRAME = 1 / 30;
  let sent = 0;
  for (const rail of CAVE_RAILS) {
    const level = varnBeforeLips(rail.mouth.x, rail.mouth.z);
    for (const from of [rail.mouth, doorAt(rail)]) for (let a = 0; a < 360; a += 15) for (const speed of [6.6, 10.5]) {
      const went = travel(world, { x: from.x, z: from.z, heading: a * Math.PI / 180, speed, seconds: 4, dt: FRAME }); sent++;
      assert.ok(went.damage === 0 && went.worst < TERRAIN_FALL.safeDrop && went.at.y > level - 6 && hexOwnerAt(went.at.x, went.at.z) === EAST_LOTHARN,
        `out of ${rail.id} on ${a} degrees at ${speed}: at ${went.at.x.toFixed(1)}, ${went.at.z.toFixed(1)}, ${went.at.y.toFixed(1)} m, worst fall ${went.worst.toFixed(1)} m`);
    }
  }
  t.diagnostic(`${sent} travelers sent out of the five railed doors`);
});

test('the slabs, climbed with the game’s own controller and its own wind: level 17 finishes both, level 16 falls from under the lip, and a walker cannot use any part of them', t => {
  const climb = (slab, level, wind) => {
    const climbing = createClimbing({ world: climbWorld }), foot = slabFoot(slab);
    const from = { x: foot.x, y: world.heightAt(foot.x, foot.z), z: foot.z }, facing = Math.atan2(0, -slab.dir);
    assert.ok(climbing.probe(from, facing).available, `${slab.id} offers no hold from its apron`);
    assert.equal(climbing.grab(from, facing, { stamina: wind, level }), true);
    let stamina = wind, top = -Infinity, spent = 0, damage = 0, seconds = 0, view = climbing.view();
    while (climbing.active && seconds < 600) {
      // Holding W, no bursts, and - as src/main.js has it - no wind coming back while he climbs.
      view = climbing.tick(.05, { up: 1, side: 0, stamina, level, burst: false });
      stamina = Math.max(0, stamina - (view.staminaSpent || 0)); spent += view.staminaSpent || 0; damage += view.damage || 0; top = Math.max(top, view.position.y); seconds += .05;
    }
    return { rise: top - from.y, end: view.position, spent, left: stamina, damage, seconds };
  };
  for (const slab of VARN_SLABS) {
    const lip = world.heightAt(slabFoot(slab).x, slab.lipZ), rise = lip - SLAB.foot;
    const good = climb(slab, 17, maxWind(1)), short = climb(slab, 16, maxWind(1)), first = climb(slab, 1, maxWind(1)), tough = climb(slab, 15, maxWind(20));
    assert.ok(good.rise >= rise - .3 && Math.abs(good.end.y - lip) < .6 && good.damage === 0 && good.left > 1, `${slab.id}, level 17: rise ${good.rise.toFixed(1)} of ${rise.toFixed(1)}, ${good.left.toFixed(1)} wind left, damage ${good.damage}`);
    assert.ok(onLanding(good.end.x, good.end.z), `level 17 crests onto the landing at ${good.end.x.toFixed(1)}, ${good.end.z.toFixed(1)}`);
    assert.ok(short.rise < rise - 1 && short.rise > rise - 4 && short.damage === 100 && Math.abs(short.end.y - SLAB.foot) < 2, `${slab.id}, level 16: rise ${short.rise.toFixed(1)}, damage ${short.damage}, ends at ${short.end.y.toFixed(1)} m`);
    assert.ok(first.rise < 30 && first.damage === 100, `${slab.id}, level 1: rise ${first.rise.toFixed(1)}`);
    assert.ok(tough.rise >= rise - .3 && tough.damage === 0, `${slab.id}, level 15 with toughness 20's wind: rise ${tough.rise.toFixed(1)}`);
    assert.equal(maxHealth(1) - short.damage, 0, 'and that fall is the whole of a base traveler’s health');
    t.diagnostic(`${slab.id}: ${rise.toFixed(1)} m; level 17 crests with ${good.left.toFixed(1)} wind left in ${good.seconds.toFixed(0)} s; level 16 lets go ${(rise - short.rise).toFixed(1)} m under the lip; level 1 at ${first.rise.toFixed(1)} m`);
    // A walker: at the apron he goes nowhere up the slab, by the game's own step; and from the landing he does not walk down it.
    const foot = slabFoot(slab), walker = { x: foot.x, z: foot.z }; walker.y = world.heightAt(walker.x, walker.z);
    for (let i = 0; i < 200; i++) { moveCharacter(walker, 0, -slab.dir * .12, world, .34, { canTraverse: walkingSlope }); walker.y = world.heightAt(walker.x, walker.z); }
    assert.ok(walker.y < SLAB.foot + 1.5, `a walker got ${(walker.y - SLAB.foot).toFixed(1)} m up ${slab.id}`);
  }
});

test('open the gates and the road goes through: every metre of it can be stood on, and the pass and Amod are one country again', t => {
  const down = leastFall(L, world, pass, { open: shutGate, midpoints: true, risers: lipRib, riserReach: inVarnRock }), up = leastFall(L, world, amodSide, { open: shutGate, midpoints: true, risers: lipRib, riserReach: inVarnRock });
  assert.equal(down[L.cell(VARN.axis, -692)], 0, 'through the city from the pass, walking'); assert.equal(up[L.cell(PASS_ROAD[2].x, PASS_ROAD[2].z)], 0, 'and up the pass from Amod');
  t.diagnostic(`gates open: ${area(down, southOfTheFront, .01)} m2 of Amod walked to from the pass, ${area(up, upThePass, .01)} m2 of the pass from Amod`);
  const blocked = [];
  for (let i = 1; i < VARN_ROAD.length; i++) {
    const a = VARN_ROAD[i - 1], b = VARN_ROAD[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .5);
    for (let k = 0; k <= n; k++) {
      const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n;
      const solid = world.nearColliders(x, z, .34).filter(c => !shutGate(c)).some(c => !['river-water', 'pond-water'].includes(c.kind) && (c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r + .34 : Math.abs(x - c.x) < c.hx + .34 && Math.abs(z - c.z) < c.hz + .34));
      if (solid) blocked.push(`${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
  assert.deepEqual(blocked, [], 'the road is blocked with the gates open');
  // As built, the only things on the road are the two shut gates themselves.
  for (let i = 1; i < VARN_ROAD.length; i++) {
    const a = VARN_ROAD[i - 1], b = VARN_ROAD[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    for (let k = 0; k <= n; k++) {
      const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n;
      if (canStand(x, z, world, .34)) continue;
      assert.ok(LOTHARN_PASSES_SHUT && x === VARN.axis && VARN_CIRCUIT.gates.some(g => Math.abs(z - g.centre.z) < 3.2), `the road is blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
});

test('nobody is sealed in: from the square a traveler walks out by the wicket and down the road to Amod’s own; the forecourt opens onto the pass', () => {
  // From the square, to the wicket, out through it, and down every metre of the descent to the last vertex of Amod's road -
  // with the traveler's own step, closed-place rule and all.
  const w = varnWicket(), g = gate(VARN_AMOD_GATE);
  const walker = { x: VARN_SQUARE.x, z: VARN_SQUARE.z + 2 };
  walker.y = world.heightAt(walker.x, walker.z);
  let walked = 0;
  for (const goal of [{ x: w.x, z: g.centre.z + g.inward.z * 5 }, { x: w.x, z: g.centre.z - g.inward.z * 5 }, ...VARN_DESCENT.slice(1)]) {
    for (let i = 0; i < 4000 && Math.hypot(goal.x - walker.x, goal.z - walker.z) > .3; i++) {
      const d = Math.hypot(goal.x - walker.x, goal.z - walker.z), before = { x: walker.x, z: walker.z };
      moveCharacter(walker, (goal.x - walker.x) / d * .12, (goal.z - walker.z) / d * .12, world, .34, { canTraverse: travelerStep });
      walker.y = world.heightAt(walker.x, walker.z);
      walked += Math.hypot(walker.x - before.x, walker.z - before.z);
    }
    assert.ok(Math.hypot(goal.x - walker.x, goal.z - walker.z) < .5, `he stuck at ${walker.x.toFixed(1)}, ${walker.z.toFixed(1)} on the way to ${goal.x}, ${goal.z}`);
  }
  assert.ok(walked > 300, `${walked.toFixed(0)} m walked`);
  // The forecourt before the shut Pass Gate is not a pocket: it is the pass road's own end.
  const forecourt = leastFall(L, world, [{ x: VARN.axis, z: gate(VARN_PASS_GATE).centre.z - 7 }], { midpoints: true, risers: lipRib, riserReach: inVarnRock });
  assert.equal(forecourt[L.cell(PASS_ROAD[2].x, PASS_ROAD[2].z)], 0, 'from the Pass Gate’s causeway a walker is back on Kemrath’s floor');
  // And the ground inside the walls is one piece: from the square, every court and both gates' insides are walked to.
  const inside = leastFall(L, world, [{ x: VARN_SQUARE.x, z: VARN_SQUARE.z }], { midpoints: true, risers: lipRib, riserReach: inVarnRock });
  for (const [x, z] of [[VARN.axis, -770], [VARN.axis, -715], [VARN.axis, g.centre.z + g.inward.z * 5], [VARN.axis, gate(VARN_PASS_GATE).centre.z + 5], [VARN_KEEP.x + 9, VARN_KEEP.z + 4]]) assert.equal(inside[L.cell(x, z)], 0, `${x}, ${z} is cut off from the square`);
  // The garrison's men on the ground inside the gates stand where a body stands, and are not in a pocket either.
  for (const man of LOTHARN_GARRISON_FIGURES.filter(one => one.ground)) {
    assert.ok(canStand(man.x, man.z, world, .34), `${man.id} has no footing`);
    if (man.id.startsWith('varn')) assert.equal(inside[L.cell(man.x, man.z)], 0, `${man.id} cannot be walked to from the square`);
  }
});
