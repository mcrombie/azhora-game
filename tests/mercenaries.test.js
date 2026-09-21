import test from 'node:test';
import assert from 'node:assert/strict';
import { MERCENARY_COMPANY_SIZE, MERCENARY_ROSTER, MERCENARY_GROUPS, ARRIVALS, MUS_ARRIVAL, drawMusArrival, KIT_WEAPON_ITEM, createMercenaryCompany, LANDING_QUEUE, mercenaryProgress, mercenaryLines, mercenaryStyleLines, tradeOffer, distanceAlongRoad, pointAlongRoad, roadLengths } from '../src/mercenaries.js';

const road = [{ x: 0, z: 0 }, { x: -100, z: 0 }, { x: -100, z: 100 }, { x: -400, z: 100 }, { x: -400, z: 300 }];
const stops = [{ id: 'induction', point: { x: -100, z: 30 }, dwell: 90 }, { id: 'crossing', point: { x: -250, z: 104 }, dwell: 60 }];
const company = () => createMercenaryCompany({ road, stops, muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 } });

test('the company is eleven including the traveler, and the written arrivals never go backwards', () => {
  assert.equal(MERCENARY_ROSTER.length, MERCENARY_COMPANY_SIZE - 1);
  assert.equal(MERCENARY_COMPANY_SIZE, 11);
  assert.equal(new Set(MERCENARY_ROSTER.map(m => m.id)).size, MERCENARY_ROSTER.length);
  assert.equal(new Set(MERCENARY_ROSTER.map(m => m.name)).size, MERCENARY_ROSTER.length);
  const written = MERCENARY_ROSTER.filter(m => !m.drawn);
  for (let i = 1; i < written.length; i++) assert.ok(written[i].arrival >= written[i - 1].arrival, 'later names land no earlier');
  assert.equal(written[0].arrival, 0, 'Chris Gotwood lands beside the traveler');
  assert.equal(written[0].id, 'merc-gotwood');
  assert.equal(written.at(-1).arrival, ARRIVALS.princes);
  assert.ok(ARRIVALS.princes >= 3600, 'the last pair arrive more than an hour of play later');
  for (const m of MERCENARY_ROSTER) {
    assert.ok(m.pace > 1 && m.pace < 1.6 && m.departs > 0 && m.lines.length === 2 && m.origin && Number.isInteger(m.look.tunic), m.id);
    assert.ok(['road', 'shore', 'wild'].includes(m.route), m.name + ' gets here somehow');
  }
});

test('three of them arrive with somebody, and the rest come alone', () => {
  for (const [name, ids] of Object.entries(MERCENARY_GROUPS)) {
    const together = MERCENARY_ROSTER.filter(m => ids.includes(m.id));
    assert.equal(together.length, ids.length, name + ' is everyone it names');
    assert.equal(new Set(together.map(m => m.arrival)).size, 1, name + ' come ashore at one moment');
    for (const m of together) assert.equal(m.group, name, m.name + ' knows who he came with');
  }
  const grouped = Object.values(MERCENARY_GROUPS).flat();
  assert.equal(new Set(grouped).size, grouped.length, 'nobody is in two groups');
  for (const m of MERCENARY_ROSTER) assert.equal(m.group === null, !grouped.includes(m.id), m.name);
  assert.deepEqual(MERCENARY_ROSTER.filter(m => m.group === null).map(m => m.id),
    ['merc-gotwood', 'merc-word', 'merc-lakota', 'merc-eliana', 'merc-mus']);
});

test('Mus lands at an hour nobody can predict, and the same one every time that game is loaded', () => {
  const mus = MERCENARY_ROSTER.find(m => m.drawn);
  assert.equal(mus.id, 'merc-mus');
  assert.equal(mus.route, 'wild', 'he does not use the road');
  assert.ok(MUS_ARRIVAL.from < 0, 'he can beat the traveler ashore');
  assert.ok(MUS_ARRIVAL.to > ARRIVALS.princes, 'or come after the last of them');
  for (const seed of [0, 1, 7, 1234.5, -9]) assert.equal(drawMusArrival(seed), drawMusArrival(seed), 'seed ' + seed + ' is stable');
  const draws = Array.from({ length: 400 }, (_, i) => drawMusArrival(i + 1));
  for (const d of draws) assert.ok(d >= MUS_ARRIVAL.from && d <= MUS_ARRIVAL.to && Number.isFinite(d), String(d));
  assert.ok(new Set(draws.map(Math.round)).size > 300, 'he is not landing at a handful of moments');
  assert.ok(draws.some(d => d < 0), 'sometimes he is already here');
  assert.ok(draws.some(d => d > ARRIVALS.princes), 'sometimes he is last');
  const span = MUS_ARRIVAL.to - MUS_ARRIVAL.from;
  for (let q = 0; q < 4; q++) {
    const inQuarter = draws.filter(d => d >= MUS_ARRIVAL.from + span * q / 4 && d < MUS_ARRIVAL.from + span * (q + 1) / 4);
    assert.ok(inQuarter.length > draws.length / 8, 'quarter ' + q + ' gets a share (' + inQuarter.length + ')');
  }
  assert.ok(Number.isFinite(drawMusArrival(undefined)) && Number.isFinite(drawMusArrival(NaN)), 'a missing seed still lands him somewhere');
});

test('the seed moves Mus and moves nobody else', () => {
  const make = seed => createMercenaryCompany({ road, stops, muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 }, seed });
  const [a, b] = [2, 1].map(make);
  const phaseAt = (c, seconds) => c.placements(seconds).find(p => p.id === 'merc-mus').phase;
  const [early, late] = drawMusArrival(2) < drawMusArrival(1) ? [a, b] : [b, a];
  const between = (drawMusArrival(2) + drawMusArrival(1)) / 2;
  assert.notEqual(phaseAt(early, between + 1), 'coming', 'the earlier draw is ashore');
  assert.equal(phaseAt(late, between - 1), 'coming', 'the later draw is not');
  for (const p of a.placements(2000)) {
    if (p.id === 'merc-mus') continue;
    const same = b.placements(2000).find(q => q.id === p.id);
    assert.deepEqual([p.phase, Math.round(p.x), Math.round(p.z)], [same.phase, Math.round(same.x), Math.round(same.z)], p.id);
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
  assert.equal(early.filter(p => p.phase === 'coming').length, MERCENARY_ROSTER.length - 1, 'everyone but Chris is still to come');
  // They queue down the way they are going rather than ringing the landing: one line, in roster
  // order, half a metre either side of it, and nobody standing on the landing itself. The ring
  // this replaces did not fit the pier it was drawn on (LANDING_QUEUE, docs/known-issues.md).
  const span = Math.hypot(road[0].x - 3, road[0].z - 3);
  const ux = (road[0].x - 3) / span, uz = (road[0].z - 3) / span;
  let previous = 0;
  for (const [i, p] of early.entries()) {
    const along = (p.x - 3) * ux + (p.z - 3) * uz, across = Math.abs((p.x - 3) * -uz + (p.z - 3) * ux);
    assert.ok(along > 2, `${p.id} is off the landing itself (${along.toFixed(1)} m along)`);
    assert.ok(across <= LANDING_QUEUE.offset + 1e-9, `${p.id} keeps to the line (${across.toFixed(2)} m off it)`);
    if (i) assert.ok(Math.abs(along - previous - LANDING_QUEUE.spacing) < 1e-9, `${p.id} stands one place behind the last`);
    previous = along;
    assert.ok(Math.abs(p.yaw - Math.atan2(ux, uz)) < 1e-9, `${p.id} faces the way he is going`);
  }
  assert.equal(new Set(early.map(p => `${p.x.toFixed(2)},${p.z.toFixed(2)}`)).size, early.length, 'no two men wait on one spot');
  // The corridor, stated from the formation rather than from one lucky sample. `lateral` fans the
  // men out in pairs, so the outermost is 1.4 + floor((n-1)/2) * 0.8 off the line, and a stopped
  // man stands 2.2 times that aside to let the traveler by. The test used to sample t=1200 and
  // ask for 4.2 m, which was simply not true of the whole clock: Mus walks 4.6 m out and stops
  // 10.1 m out, and no moment the old test looked at happened to catch him.
  const widest = 1.4 + Math.floor((MERCENARY_ROSTER.length - 1) / 2) * .8;
  const corridor = { walking: widest, stopped: widest * 2.2 };
  let seen = { walking: 0, stopped: 0 }, furthest = { walking: 0, stopped: 0 };
  for (let t = 0; t <= 20000; t += 5) for (const p of c.placements(t)) {
    if (p.phase !== 'walking' && p.phase !== 'stopped') continue;
    seen[p.phase]++;
    const at = pointAlongRoad(road, distanceAlongRoad(road, p));
    const off = Math.hypot(p.x - at.x, p.z - at.z);
    furthest[p.phase] = Math.max(furthest[p.phase], off);
    assert.ok(off <= corridor[p.phase] + 1e-6, `${p.id} is ${off.toFixed(2)} m off the road ${p.phase}`);
    assert.ok(Number.isFinite(p.yaw));
    // A man who has stopped stands at one of the authored stops, not wherever the clock left
    // him. Nothing checked this, so a stop could have drifted along the road unnoticed.
    if (p.phase === 'stopped') {
      const stop = stops.find(entry => entry.id === p.stopId);
      assert.ok(stop, `${p.id} stopped at ${p.stopId}, which is not an authored stop`);
      const mark = pointAlongRoad(road, distanceAlongRoad(road, stop.point));
      assert.ok(Math.hypot(p.x - mark.x, p.z - mark.z) <= corridor.stopped + 1e-6,
        `${p.id} stopped ${Math.hypot(p.x - mark.x, p.z - mark.z).toFixed(1)} m from ${p.stopId}`);
    }
  }
  assert.ok(seen.walking > 500 && seen.stopped > 50, `the sweep saw ${seen.walking} walking and ${seen.stopped} stopped`);
  // And the corridor is not slack: somebody really does go out to the edge of it.
  assert.ok(furthest.walking > corridor.walking - .1, `nobody walks near the edge (${furthest.walking.toFixed(2)} of ${corridor.walking})`);
  assert.ok(furthest.stopped > corridor.stopped - .1, `nobody stops near the edge (${furthest.stopped.toFixed(2)} of ${corridor.stopped})`);
  // Every one of them is on the road at some point, and the sweep above has checked each of
  // those moments. There is no moment when all ten are on it together, and that is the design
  // rather than a fault: they are staggered from 0 to 3,780 s, so Chris has mustered long
  // before Matt and Al land. The busiest the road ever gets is recorded here so that a change
  // to the arrivals shows up as a number rather than as a feeling.
  const everWalked = new Set();
  let busiest = { count: 0, t: 0 };
  for (let t = 0; t <= 20000; t += 5) {
    const here = c.placements(t).filter(p => p.phase === 'walking' || p.phase === 'stopped');
    for (const p of here) everWalked.add(p.id);
    if (here.length > busiest.count) busiest = { count: here.length, t };
  }
  assert.equal(everWalked.size, MERCENARY_ROSTER.length, 'every man walks the road at some point');
  // Three, and it is the three riders, who arrive together and argue the whole way. On this
  // road, with these arrivals, that is as crowded as it gets.
  assert.equal(busiest.count, 3, `the road is busiest with ${busiest.count} men on it, at ${busiest.t}s`);
  // Distances stay on the road they are measured along, all the way through.
  for (let t = 0; t <= 20000; t += 25) for (const p of c.placements(t))
    assert.ok(p.distance >= 0 && p.distance <= 650, `${p.id} is ${p.distance.toFixed(0)} m along a 650 m road at ${t}s`);
  const late = c.placements(20000);
  assert.ok(late.every(p => p.phase === 'mustered'), 'given enough time, everyone musters');
  const spread = new Set(late.map(p => `${p.x.toFixed(1)},${p.z.toFixed(1)}`));
  assert.equal(spread.size, late.length, 'no two men stand on the same spot at the muster');
  for (const p of late) assert.ok(Math.hypot(p.x + 400, p.z - 250) < 20, 'the formation gathers around the camp');
  assert.equal(c.summary(20000).mustered, MERCENARY_ROSTER.length);
  assert.equal(c.summary(0).arrived, 1);
  assert.equal(c.summary(0).total, MERCENARY_COMPANY_SIZE);
});

test('a brisk traveler stays first; a slow one is passed; the rank says so', () => {
  const c = company();
  // A traveler at the muster after 15 minutes is first of eleven.
  assert.equal(c.travelerRank(900, c.musterDistance), 1);
  // A traveler still at the landing after two hours has been passed by everyone.
  assert.equal(c.travelerRank(7200, 0), MERCENARY_COMPANY_SIZE);
  // Between: some ahead, some behind.
  const rank = c.travelerRank(2400, 300);
  assert.ok(rank > 1 && rank < MERCENARY_COMPANY_SIZE, `rank ${rank}`);
});

test('with no companion argument, the company stands exactly where it always has', () => {
  // The whole of the long road hangs off this. A save written before any of it existed restores
  // with no companion at all, and if that moved one man by a metre it would move the clock the
  // eighty-seven minutes are measured on (tests/long-road-clock.test.js).
  const today = company();
  const same = createMercenaryCompany({ road, stops, muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 }, companion: undefined });
  for (const seconds of [0, 600, 1800, 5300]) {
    assert.deepEqual(same.placements(seconds), today.placements(seconds), 'at ' + seconds + ' s');
    assert.deepEqual(same.summary(seconds), today.summary(seconds));
  }
  assert.equal(same.companionId, null);
  assert.equal(today.summary(0)['with-traveler'], 0, 'nobody is walking with anybody');
});

test('a companion walking with you is off the road, never musters, and is behind you wherever you are', () => {
  const walking = createMercenaryCompany({ road, stops, muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 },
    companion: { id: 'merc-gotwood', with: true } });
  for (const seconds of [0, 600, 5300, 50000]) {
    const chris = walking.placements(seconds).find(p => p.id === 'merc-gotwood');
    assert.equal(chris.phase, 'with-traveler', 'at ' + seconds + ' s');
    assert.equal(chris.distance, 0);
    assert.equal(chris.x, null, 'the host places him, not the clock');
    assert.equal(walking.summary(seconds)['with-traveler'], 1);
  }
  assert.equal(walking.summary(50000).mustered, MERCENARY_ROSTER.length - 1, 'the other nine get there without him');
  assert.equal(walking.summary(50000).arrived, MERCENARY_ROSTER.length, 'he is ashore all the same');
  assert.equal(walking.companionId, 'merc-gotwood');
  // First of eleven means first: a man at your shoulder is not somebody who beat you to it.
  assert.equal(walking.travelerRank(900, walking.musterDistance), 1);
  assert.match(mercenaryLines('merc-gotwood', { phase: 'with-traveler' })[1], /Right behind you/);
});

test('released at the bridge, he walks on from where he stood and musters ten minutes later', () => {
  // Let go at 4,800 s at 620 m along a 650 m road, with the crossing stop 30 m ahead of him and
  // its sixty seconds still to spend. Nothing of the landing is left to do, and Corvan's desk is
  // behind him, so he does not walk back to it.
  const chris = MERCENARY_ROSTER[0];
  const released = createMercenaryCompany({ road, stops, muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 },
    companion: { id: chris.id, releasedAt: 4800, releasedDistance: 300 } });
  const at = seconds => released.placements(seconds).find(p => p.id === chris.id);
  assert.equal(at(4799).phase, 'coming', 'before he is let go he is nowhere on this clock');
  assert.equal(at(4801).phase, 'walking', 'and the moment he is, he is walking, with no hour at a landing');
  assert.ok(Math.abs(at(4801).distance - (300 + 1 * chris.pace)) < 1e-6, 'from where he was standing');
  // 300 m to the crossing at 350 m, its 60 s, then 300 m to the muster at 650 m.
  const expected = 4800 + 50 / chris.pace + 60 + 300 / chris.pace;
  assert.equal(at(expected - 1).phase, 'walking');
  assert.deepEqual(at(expected + 1), { id: chris.id, name: chris.name, phase: 'mustered', distance: 650, stopId: null,
    x: at(expected + 1).x, z: at(expected + 1).z, yaw: at(expected + 1).yaw, walking: false });
  // The induction stop at 130 m is behind him and is not made twice.
  assert.ok(!Array.from({ length: 400 }, (_, i) => at(4800 + i)).some(p => p.stopId === 'induction'), 'he has already been to Corvan');
});

test('a released man starts behind nothing he had not passed, and never before the road begins', () => {
  const chris = MERCENARY_ROSTER[0];
  const make = over => createMercenaryCompany({ road, stops, muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 },
    companion: { id: chris.id, releasedAt: 100, releasedDistance: 0, ...over } });
  assert.equal(make({ releasedDistance: -50 }).placements(101).find(p => p.id === chris.id).distance > 0, true, 'a negative place is the landing');
  assert.equal(make({ releasedDistance: 99999 }).placements(101).find(p => p.id === chris.id).phase, 'mustered', 'released at the muster, he is in at once');
  assert.equal(make({ releasedAt: -5 }).placements(0).find(p => p.id === chris.id).phase, 'walking', 'and never earlier than the game');
  // Released, he is on the clock like anybody else: at the muster he counts ahead of a traveler
  // still on the road behind him.
  const gone = make({ releasedAt: 0, releasedDistance: 600 });
  assert.ok(gone.travelerRank(2000, 100) > 1);
});

test('mercenaries speak in two lines and know where they stand', () => {
  const lines = mercenaryLines('merc-gotwood', { phase: 'landing' });
  assert.equal(lines.length, 2); assert.match(lines[0], /Chris Gotwood/);
  assert.match(mercenaryLines('merc-jerry', { phase: 'walking' })[1], /Moros Plain/);
  assert.match(mercenaryLines('merc-christin', { phase: 'mustered' })[1], /counts heads/);
  assert.match(mercenaryLines('merc-ciaran', { phase: 'stopped' })[1], /catch you up/);
  assert.deepEqual(mercenaryLines('nobody', null), []);
  // Two of them would never say the ordinary thing for where they are, so they do not.
  for (const phase of ['walking', 'stopped', 'mustered']) {
    for (const id of ['merc-word', 'merc-mus']) {
      const said = mercenaryLines(id, { phase })[1];
      assert.notEqual(said, mercenaryLines('merc-jerry', { phase })[1], id + ' has his own ' + phase + ' line');
      assert.ok(said.length > 3, id + ' says something when ' + phase);
    }
  }
  assert.ok(mercenaryLines('merc-mus', { phase: 'stopped' })[1].length < 12, 'Mus does not go on about it');
  // Everyone has a landing line of their own, and it is the second thing they say.
  for (const m of MERCENARY_ROSTER) assert.equal(mercenaryLines(m.id, { phase: 'landing' })[1], m.lines[1], m.name);
});

test('every man has a fighting style he can explain, and the held kits map to inventory weapons', () => {
  const weapons = MERCENARY_ROSTER.map(m => m.weapon);
  assert.deepEqual(weapons, ['sword', 'dagger', 'bow', 'sword-shield', 'spear', 'staff', 'greatsword', 'pike', 'mace', 'spears']);
  assert.equal(new Set(weapons).size, weapons.length, 'no two of them fight the same way');
  for (const m of MERCENARY_ROSTER) {
    assert.equal(mercenaryStyleLines(m.id).length, 2, `${m.name} explains his style in two lines`);
    assert.ok(m.style && m.tradeLine, m.name);
    if (m.trades) assert.ok(KIT_WEAPON_ITEM[m.weapon], `${m.name} trades a held weapon`);
  }
  assert.deepEqual(mercenaryStyleLines('nobody'), []);
});

test('trades: held iron for the traveler’s iron, never for a stick, never like for like, never from the men who need their kit', () => {
  assert.equal(tradeOffer('merc-altun', 'iron-mace', 'simple-sword').accepts, true);
  assert.match(tradeOffer('merc-altun', 'iron-mace', 'simple-sword').line, /mace/);
  assert.equal(tradeOffer('merc-altun', 'iron-mace', 'iron-mace').accepts, false, 'like for like');
  assert.equal(tradeOffer('merc-altun', 'iron-mace', 'forest-stick').accepts, false, 'no trade for a stick');
  assert.equal(tradeOffer('merc-jerry', null, 'simple-sword').accepts, false, 'the archer keeps his bow');
  assert.equal(tradeOffer('merc-ciaran', null, 'simple-sword').accepts, false, 'the spearman keeps his spear');
  assert.equal(tradeOffer('merc-mus', null, 'simple-sword').accepts, false, 'Mus needs both of his');
  assert.equal(tradeOffer('merc-gotwood', 'simple-sword', 'simple-sword').accepts, false);
  assert.equal(tradeOffer('merc-gotwood', 'simple-sword', 'bearded-axe').accepts, true, 'Chris will try an axe');
  assert.equal(tradeOffer('merc-eliana', 'greatsword', 'long-dagger').accepts, true);
  assert.deepEqual(tradeOffer('nobody', 'x', 'y'), { accepts: false, line: '' });
});
