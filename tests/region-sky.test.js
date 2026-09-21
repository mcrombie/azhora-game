import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_SKY, regionSky, mixHex, mixSky, composeSky, createSkyBlend } from '../src/region-sky.js';
import { regions, OPEN_COUNTRY } from '../src/region-world.js';

/**
 * The sky, and the promise that came with permission to build it: **nothing that exists
 * changes**. A region gets its own horizon only by declaring one, no region declares one
 * today, and the three numbers the game has always used are still the three numbers it uses.
 * The first two tests are that promise; the rest are the mechanism it will be multiplied by
 * when the day and night cycle arrives.
 */

test('the default sky is the three numbers src/main.js has always used', () => {
  assert.equal(DEFAULT_SKY.background, 0xaacfd3);
  assert.equal(DEFAULT_SKY.fog, 0xb3d3d0);
  assert.equal(DEFAULT_SKY.density, .0062);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  // The host still sets the scene from those three and from nothing else, and it asks the
  // blend for the sky in exactly one place. A second call site is a second opinion.
  assert.ok(main.includes('new THREE.Color(DEFAULT_SKY.background)'));
  assert.ok(main.includes('new THREE.FogExp2(DEFAULT_SKY.fog,DEFAULT_SKY.density)'));
  assert.equal(main.split('sky.step(').length - 1, 1, 'the host asks for the sky in one place');
  assert.ok(!/palette\.fog/.test(main), 'palette.fog is the chart legend’s colour and is not the horizon');
});

test('every region in the game today gets the default sky, to the digit', () => {
  for (const region of regions) {
    const sky = regionSky(region);
    assert.deepEqual({ ...sky }, { ...DEFAULT_SKY }, `${region.name} has stopped using the default sky`);
    // And none of them has quietly grown the fields that would change that.
    for (const field of ['sky', 'haze', 'hazeDensity'])
      assert.equal(region.palette[field], undefined, `${region.name} declares palette.${field}`);
  }
  assert.deepEqual({ ...regionSky(OPEN_COUNTRY) }, { ...DEFAULT_SKY }, 'open country keeps the default');
  assert.deepEqual({ ...regionSky(null) }, { ...DEFAULT_SKY });
  assert.deepEqual({ ...regionSky({ id: 0, open: true, palette: { sky: 0x112233 } }) }, { ...DEFAULT_SKY },
    'open country keeps the default even if something hands it a palette');
});

test('a region that declares one gets it, and a malformed declaration is refused rather than half-taken', () => {
  const desert = { id: 20, palette: { ground: '#c2b184', fog: '#e0d7b8', sky: 0xd8cfae, haze: 0xe6dcbc, hazeDensity: .0031 } };
  assert.deepEqual({ ...regionSky(desert) }, { background: 0xd8cfae, fog: 0xe6dcbc, density: .0031 });
  // haze alone defaults to the sky colour; a bad density falls back to the default density.
  assert.deepEqual({ ...regionSky({ id: 21, palette: { sky: 0x445566 } }) }, { background: 0x445566, fog: 0x445566, density: DEFAULT_SKY.density });
  assert.deepEqual({ ...regionSky({ id: 22, palette: { sky: 0x445566, hazeDensity: -1 } }) }, { background: 0x445566, fog: 0x445566, density: DEFAULT_SKY.density });
  for (const bad of [{ sky: 'blue' }, { sky: -1 }, { sky: 0x1000000 }, { sky: 1.5 }, { haze: 0x112233 }])
    assert.deepEqual({ ...regionSky({ id: 23, palette: bad }) }, { ...DEFAULT_SKY }, `palette ${JSON.stringify(bad)} was taken`);
});

test('colours mix channel by channel, in the space they are written in', () => {
  assert.equal(mixHex(0x000000, 0xffffff, 0), 0x000000);
  assert.equal(mixHex(0x000000, 0xffffff, 1), 0xffffff);
  assert.equal(mixHex(0x000000, 0xffffff, .5), 0x808080);
  assert.equal(mixHex(0x102030, 0x304050, .5), 0x203040);
  assert.equal(mixHex(0x000000, 0xffffff, -3), 0x000000, 't is clamped');
  assert.equal(mixHex(0x000000, 0xffffff, 9), 0xffffff);
  const half = mixSky(DEFAULT_SKY, { background: 0x000000, fog: 0x000000, density: 0 }, .5);
  assert.equal(half.density, DEFAULT_SKY.density / 2);
  assert.equal(half.background, mixHex(DEFAULT_SKY.background, 0, .5));
});

test('tints compose in order, and one with no opinion costs nothing', () => {
  const night = sky => ({ ...sky, background: mixHex(sky.background, 0x0b1020, .8) });
  const thicker = sky => ({ ...sky, density: sky.density * 2 });
  const silent = () => undefined;
  const out = composeSky(DEFAULT_SKY, night, silent, thicker);
  assert.equal(out.background, night(DEFAULT_SKY).background);
  assert.equal(out.density, DEFAULT_SKY.density * 2);
  assert.deepEqual({ ...composeSky(DEFAULT_SKY) }, { ...DEFAULT_SKY });
  assert.deepEqual({ ...composeSky(DEFAULT_SKY, silent, null, 'not a function') }, { ...DEFAULT_SKY });
  // A tint that returns nonsense is ignored rather than allowed to blank the sky.
  assert.deepEqual({ ...composeSky(DEFAULT_SKY, () => ({ background: 'x' })) }, { ...DEFAULT_SKY });
});

test('the blend walks to a new country over a second or two, and snaps when the traveler is put down', () => {
  const desert = { id: 20, palette: { sky: 0xd8cfae, haze: 0xe6dcbc, hazeDensity: .0031 } };
  const blend = createSkyBlend({ seconds: 1.6 });
  assert.deepEqual({ ...blend.current }, { ...DEFAULT_SKY });
  // Walking: sixteen frames of a tenth of a second each, a metre apart, is one second.
  let at = { x: 0, z: 0 };
  for (let i = 0; i < 10; i++) { at = { x: at.x + 1, z: 0 }; blend.step(desert, .1, at); }
  assert.notDeepEqual({ ...blend.current }, { ...DEFAULT_SKY }, 'it started for the new sky');
  assert.notDeepEqual({ ...blend.current }, { ...blend.target }, 'and has not arrived in one second');
  for (let i = 0; i < 200; i++) { at = { x: at.x + 1, z: 0 }; blend.step(desert, .1, at); }
  assert.deepEqual({ ...blend.current }, { ...blend.target }, 'and arrives');
  // Put down a kilometre away: no slide for a screenshot to catch.
  const jumped = createSkyBlend();
  jumped.step(null, .1, { x: 0, z: 0 });
  assert.deepEqual({ ...jumped.current }, { ...DEFAULT_SKY });
  jumped.step(desert, .1, { x: 1000, z: 0 });
  assert.deepEqual({ ...jumped.current }, { ...regionSky(desert) }, 'a teleport arrives at once');
  assert.equal(jumped.snaps, 1);
  // Sixty metres is the line, and nothing on foot can cross it in a frame: the walk cap is
  // 7.2 m/s and dt is clamped to a quarter second, which is 1.8 m.
  const walked = createSkyBlend();
  walked.step(null, .25, { x: 0, z: 0 });
  walked.step(desert, .25, { x: 1.8, z: 0 });
  assert.equal(walked.snaps, 0);
  assert.notDeepEqual({ ...walked.current }, { ...regionSky(desert) });
  // snap() is the same thing asked for outright, and a dead frame does not blend.
  const pinned = createSkyBlend();
  assert.deepEqual({ ...pinned.snap(desert) }, { ...regionSky(desert) });
  const still = createSkyBlend();
  still.step(desert, 0, { x: 0, z: 0 });
  assert.deepEqual({ ...still.current }, { ...regionSky(desert) }, 'no time passing is not a slow blend');
});
