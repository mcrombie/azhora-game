import test from 'node:test';
import assert from 'node:assert/strict';
import { MERCENARY_COMPANY_SIZE, MERCENARY_ROSTER, createMercenaryCompany, mercenaryProgress, mercenaryLines, distanceAlongRoad, pointAlongRoad, roadLengths } from '../src/mercenaries.js';

const road = [{ x: 0, z: 0 }, { x: -100, z: 0 }, { x: -100, z: 100 }, { x: -400, z: 100 }, { x: -400, z: 300 }];
const stops = [{ id: 'induction', point: { x: -100, z: 30 }, dwell: 90 }, { id: 'crossing', point: { x: -250, z: 104 }, dwell: 60 }];
const company = () => createMercenaryCompany({ road, stops, muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 } });

test('the company is twelve men including the traveler, arriving in order over the hours of play', () => {
  assert.equal(MERCENARY_ROSTER.length, MERCENARY_COMPANY_SIZE - 1);
  assert.equal(new Set(MERCENARY_ROSTER.map(m => m.id)).size, MERCENARY_ROSTER.length);
  assert.equal(new Set(MERCENARY_ROSTER.map(m => m.name)).size, MERCENARY_ROSTER.length);
  for (let i = 1; i < MERCENARY_ROSTER.length; i++) assert.ok(MERCENARY_ROSTER[i].arrival > MERCENARY_ROSTER[i - 1].arrival, 'later names land later');
  assert.equal(MERCENARY_ROSTER[0].arrival, 0, 'one man lands beside the traveler');
  assert.ok(MERCENARY_ROSTER.at(-1).arrival >= 3600, 'the last arrives more than an hour of play later');
  for (const m of MERCENARY_ROSTER) {
    assert.ok(m.pace > 1 && m.pace < 1.6 && m.departs > 0 && m.lines.length === 2 && m.origin && Number.isInteger(m.look.tunic), m.id);
  }
});

test('road geometry: lengths, projection onto the road and points along it', () => {
  const lengths = roadLengths(road);
  assert.deepEqual(lengths, [0, 100, 200, 500, 700]);
  assert.equal(Math.round(distanceAlongRoad(road, { x: -100, z: 30 })), 130);
  assert.equal(Math.round(distanceAlongRoad(road, { x: -250, z: 104 })), 350);
  assert.equal(Math.round(distanceAlongRoad(road, { x: -400, z: 250 })), 650);
  const p = pointAlongRoad(road, 150);
  assert.deepEqual([Math.round(p.x), Math.round(p.z)], [-100, 50]);
  assert.ok(Math.abs(p.yaw) < 1e-9, 'walking up the second leg faces +z');
  const end = pointAlongRoad(road, 5000);
  assert.deepEqual([end.x, end.z], [-400, 300]);
});

test('a mercenary waits, walks, pauses where the traveler had business, and musters', () => {
  const brannock = MERCENARY_ROSTER[0];
  const roadStops = [{ id: 'induction', distance: 130, dwell: 90 }, { id: 'crossing', distance: 350, dwell: 60 }];
  assert.equal(mercenaryProgress(brannock, -1, roadStops, 650).phase, 'coming');
  assert.equal(mercenaryProgress(brannock, 10, roadStops, 650).phase, 'landing');
  const walking = mercenaryProgress(brannock, brannock.departs + 40, roadStops, 650);
  assert.equal(walking.phase, 'walking'); assert.ok(Math.abs(walking.distance - 40 * brannock.pace) < 1e-9);
  const toInduction = 130 / brannock.pace;
  const stopped = mercenaryProgress(brannock, brannock.departs + toInduction + 30, roadStops, 650);
  assert.deepEqual([stopped.phase, stopped.stopId, stopped.distance], ['stopped', 'induction', 130]);
  const after = mercenaryProgress(brannock, brannock.departs + toInduction + 90 + 10, roadStops, 650);
  assert.equal(after.phase, 'walking'); assert.ok(after.distance > 130 && after.distance < 150);
  const total = brannock.departs + 650 / brannock.pace + 150;
  assert.deepEqual(mercenaryProgress(brannock, total + 1, roadStops, 650), { phase: 'mustered', distance: 650, stopId: null });
  const tesk = MERCENARY_ROSTER[1];
  assert.equal(mercenaryProgress(tesk, tesk.arrival - 1, roadStops, 650).phase, 'coming');
  assert.equal(mercenaryProgress(tesk, tesk.arrival + 1, roadStops, 650).phase, 'landing');
});

test('placements keep the men on or beside the road, off the traveler’s landing spot, and in a formation at the muster', () => {
  const c = company();
  const early = c.placements(0);
  assert.equal(early.filter(p => p.phase === 'landing').length, 1);
  assert.equal(early.filter(p => p.phase === 'coming').length, 10);
  for (const p of early) assert.ok(Math.hypot(p.x - 3, p.z - 3) > 2 && Math.hypot(p.x - 3, p.z - 3) < 8, 'waiting men stand near but not on the landing');
  const mid = c.placements(1200);
  const walking = mid.filter(p => p.phase === 'walking' || p.phase === 'stopped');
  assert.ok(walking.length >= 1);
  for (const p of walking) {
    const nearest = distanceAlongRoad(road, p);
    const onRoad = pointAlongRoad(road, nearest);
    assert.ok(Math.hypot(p.x - onRoad.x, p.z - onRoad.z) < 4.2, `${p.id} stays beside the road`);
    assert.ok(Number.isFinite(p.yaw));
  }
  const late = c.placements(20000);
  assert.ok(late.every(p => p.phase === 'mustered'), 'given enough time, everyone musters');
  const spread = new Set(late.map(p => `${p.x.toFixed(1)},${p.z.toFixed(1)}`));
  assert.equal(spread.size, late.length, 'no two men stand on the same spot at the muster');
  for (const p of late) assert.ok(Math.hypot(p.x + 400, p.z - 250) < 20, 'the formation gathers around the camp');
  assert.equal(c.summary(20000).mustered, 11);
  assert.equal(c.summary(0).arrived, 1);
  assert.equal(c.summary(0).total, 12);
});

test('a brisk traveler stays first; a slow one is passed; the rank says so', () => {
  const c = company();
  // A traveler at the muster after 15 minutes is first of twelve.
  assert.equal(c.travelerRank(900, c.musterDistance), 1);
  // A traveler still at the landing after two hours has been passed by everyone.
  assert.equal(c.travelerRank(7200, 0), 12);
  // Between: some ahead, some behind.
  const rank = c.travelerRank(2400, 300);
  assert.ok(rank > 1 && rank < 12, `rank ${rank}`);
});

test('mercenaries speak in two lines and know where they stand', () => {
  const lines = mercenaryLines('merc-brannock', { phase: 'landing' });
  assert.equal(lines.length, 2); assert.match(lines[0], /Brannock/);
  assert.match(mercenaryLines('merc-tesk', { phase: 'walking' })[1], /Moros Plain/);
  assert.match(mercenaryLines('merc-oru', { phase: 'mustered' })[1], /counts heads/);
  assert.match(mercenaryLines('merc-pell', { phase: 'stopped' })[1], /catch you up/);
  assert.deepEqual(mercenaryLines('nobody', null), []);
});
