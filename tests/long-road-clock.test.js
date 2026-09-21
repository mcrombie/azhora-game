import test from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_ROAD, regionNpcPositions, STORY_SITES } from '../src/region-world.js';
import { ARRIVALS, MUS_ARRIVAL, MERCENARY_ROSTER, drawMusArrival, createMercenaryCompany } from '../src/mercenaries.js';

/**
 * The long road through Drent is exactly as long as the company takes to come in, because the
 * Marshal does not march until the eleventh has reported. Nothing in `src/long-road.js` states
 * that length: it is a consequence of `ARRIVALS`, each man's `departs` and `pace`, the three
 * stops the host gives the company and where the camp stands. So it is pinned here, against the
 * real road and the real stands, and the failure message sends whoever moved a number to the
 * design that was cut to fit it.
 */
const WHY = 'The company’s clock is the long road’s length — see docs/drent-long-road.md before changing it.';

// The three places the company pauses, as `src/main.js` builds them for `createMercenaryCompany`.
const STOPS = [
  { id: 'induction', point: regionNpcPositions['meadow-courier'], dwell: 90 },
  { id: 'crossing', point: regionNpcPositions['crossing-keeper'], dwell: 60 },
  { id: 'relay', point: regionNpcPositions['relay-clerk'], dwell: 120 },
];
const company = (roster = MERCENARY_ROSTER, seed = 0) =>
  createMercenaryCompany({ road: MAIN_ROAD, stops: STOPS, muster: STORY_SITES.legionCamp, landing: MAIN_ROAD[0], roster, seed });

/** The second a man first reads `mustered`, to a hundredth, by halving the interval. */
function mustersAt(c, id, hi = 20000) {
  const phase = seconds => c.placements(seconds).find(p => p.id === id)?.phase;
  if (phase(hi) !== 'mustered') return null;
  let lo = 0;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (phase(mid) === 'mustered') hi = mid; else lo = mid; }
  return hi;
}

/** The nine whose hour is written down. Mus draws his, so he is pinned apart, below. */
const WRITTEN = MERCENARY_ROSTER.filter(m => !m.drawn);

test('the last man up the road musters at 5,234.5 seconds, which is how long the long road is', () => {
  const c = company();
  const times = WRITTEN.map(m => ({ name: m.name, at: mustersAt(c, m.id) })).sort((a, b) => a.at - b.at);
  const last = times.at(-1);
  assert.equal(last.name, 'Al the Tun', 'the last of them up the road is the sorcerer off the last boat. ' + WHY);
  assert.ok(Math.abs(last.at - 5234.5) <= 2, `Al the Tun musters at ${last.at.toFixed(1)} s, not 5,234.5 ± 2. ` + WHY);
  // Eighty-seven minutes and a quarter. The road is cut so a walker is on the Caloss bridge at
  // 80 to 85 minutes and through the camp gate some ten minutes after this.
  assert.ok(Math.abs(last.at / 60 - 87.2) < .05, `${(last.at / 60).toFixed(2)} minutes. ` + WHY);
});

test('each of the nine comes in at the minute the design gives him', () => {
  const c = company();
  // docs/drent-long-road.md §1, as amended by the ground probe: Ed waits out his
  // twenty-five minutes on the shingle, so he walks in between the riders and Lakota.
  const expected = {
    'merc-gotwood': 28.1, 'merc-ciaran': 40.1, 'merc-jerry': 40.4, 'merc-christin': 40.9,
    'merc-word': 51.4, 'merc-lakota': 55.7, 'merc-eliana': 69.4, 'merc-matt': 87.0, 'merc-altun': 87.2,
  };
  for (const mercenary of WRITTEN) {
    const minutes = mustersAt(c, mercenary.id) / 60;
    assert.ok(Math.abs(minutes - expected[mercenary.id]) < .1,
      `${mercenary.name} musters at ${minutes.toFixed(2)} min, not ${expected[mercenary.id]}. ` + WHY);
  }
});

test('five boats land, at six, eighteen, thirty-three, forty-eight and sixty-three minutes', () => {
  // Five bells and five legs: each leg of the long road holds one landing, so the road is cut
  // to these five numbers and not to any other.
  assert.deepEqual([ARRIVALS.word, ARRIVALS.riders, ARRIVALS.lakota, ARRIVALS.eliana, ARRIVALS.princes],
    [360, 1080, 1980, 2880, 3780], 'the five landings after the traveler’s. ' + WHY);
  assert.equal(ARRIVALS.gotwood, 0, 'the man with the letter steps off with you');
  const landings = new Set(WRITTEN.map(m => m.arrival));
  assert.equal(landings.size, 6, 'six moments, because three of the nine ride in together and two sail in together');
});

test('Ed the Word sits on the shingle for twenty-five minutes, so first is first', () => {
  // The user's ruling of 2026-09-20: a traveler who walks straight to the muster is always the
  // first of the eleven in, and this is the number that buys it. He is also swimming's teacher,
  // which keeps him on Tidehaven's beach through the whole of the long road's first leg.
  const ed = MERCENARY_ROSTER.find(m => m.id === 'merc-word');
  assert.equal(ed.departs, 1500, 'Ed leaves the strand at 31:00. ' + WHY);
  assert.ok(mustersAt(company(), 'merc-word') > mustersAt(company(), 'merc-ciaran'), 'the riders are in before him');
});

test('Mus is pinned as a range, because his hour is drawn and his road is not the road', () => {
  // He is the one man whose arrival is not written down, and he does not walk this road at all:
  // `route: 'wild'` takes him through the country, off the main road the whole way, and he passes
  // none of its stops (src/wild-route.js). On a late draw he is the last of the eleven in, after
  // the 5,234.5 s above - so the long road's length is the nine who use the road, and Mus is a
  // range beside it and never a number it is cut to.
  assert.deepEqual([MUS_ARRIVAL.from, MUS_ARRIVAL.to], [-30, ARRIVALS.princes + 30], 'half a minute either side of the whole company');
  const musters = [MUS_ARRIVAL.from, 0, 1200, 2400, MUS_ARRIVAL.to].map(arrival => {
    const roster = MERCENARY_ROSTER.map(m => m.drawn ? { ...m, arrival, drawn: false } : m);
    return mustersAt(company(roster), 'merc-mus');
  });
  for (let i = 1; i < musters.length; i++) assert.ok(musters[i] > musters[i - 1], 'a later draw is a later muster');
  assert.ok(musters[0] > MUS_ARRIVAL.from && musters.at(-1) < 20000, 'he gets there on every draw');
  // The measured range across three hundred seeds: 32.4 to 96.1 minutes. The floor is what
  // matters - a traveler who walks straight up the road is in well before it - and the ceiling
  // is the only time anybody comes in after Al the Tun.
  const seeded = Array.from({ length: 300 }, (_, i) => mustersAt(company(MERCENARY_ROSTER, i + 1), 'merc-mus'));
  const low = Math.min(...seeded) / 60, high = Math.max(...seeded) / 60;
  assert.ok(low > 30 && low < 34, `Mus's earliest is ${low.toFixed(1)} min. ` + WHY);
  assert.ok(high > 94 && high < 98, `Mus's latest is ${high.toFixed(1)} min. ` + WHY);
  assert.ok(Math.max(...seeded) > 5234.5, 'on a late draw he is the last of the eleven in, and the muster must have a line for that');
  // The seed is his and nobody else's: the nine keep their hour whatever he draws.
  const a = company(MERCENARY_ROSTER, 2), b = company(MERCENARY_ROSTER, 91);
  assert.notEqual(drawMusArrival(2), drawMusArrival(91), 'two seeds, two beaches');
  for (const mercenary of WRITTEN) assert.equal(mustersAt(a, mercenary.id), mustersAt(b, mercenary.id), mercenary.name + ' does not wait on Mus');
});

test('the road, the three stops and the camp are where the clock was measured', () => {
  const c = company();
  // Move the camp or a stop and every time above moves with it, which is the other half of why
  // this file exists: the length of the long road is a fact about the ground as much as the men.
  assert.ok(Math.abs(c.musterDistance - 1277.4) < 1, `the muster is ${c.musterDistance.toFixed(1)} m along the road. ` + WHY);
  assert.ok(Math.abs(c.roadLength - 1676.6) < 1, 'the main road is 1,677 m end to end');
  assert.deepEqual(c.stops.map(stop => [stop.id, Math.round(stop.distance), stop.dwell]),
    [['induction', 432, 90], ['crossing', 681, 60], ['relay', 946, 120]], 'Corvan, Hollis and Iven, and how long each of them keeps a man. ' + WHY);
});
