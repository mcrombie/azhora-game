import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRoadAudio, roadAudioProfile } from '../src/road-audio.js';

/**
 * `effect(name)` looks the name up in its own table and returns false when there is nothing
 * there. That is the right answer for the combat firehose — `audio?.effect(e.type)` is handed
 * every event combat emits, and most of them are meant to be silent — but it means a name asked
 * for deliberately, at a named moment, fails exactly as quietly as one that was never meant to
 * make a sound. `discovery` was asked for twelve times and was not in the table.
 */
const dir = fileURLToPath(new URL('../src/', import.meta.url));
const source = readFileSync(dir + 'road-audio.js', 'utf8');
const table = source.slice(source.indexOf('const EFFECTS=Object.freeze({'), source.indexOf('});', source.indexOf('const EFFECTS=')));
const known = new Set([...table.matchAll(/(?:^|[,{\s])'?([a-z-]+)'?\s*:\s*\[/gm)].map(match => match[1]));

/** Every effect name written out in full anywhere in src/, and where. */
const asked = new Map();
for (const file of readdirSync(dir).filter(name => name.endsWith('.js'))) {
  for (const match of readFileSync(dir + file, 'utf8').matchAll(/audio\s*\??\.\s*effect\s*\(\s*'([^']+)'/g)) {
    if (!asked.has(match[1])) asked.set(match[1], new Set());
    asked.get(match[1]).add(file);
  }
}

test('every sound asked for by name is one the audio module can make', () => {
  assert.ok(known.size >= 10, `only ${known.size} effects in the table`);
  assert.ok(asked.size >= 4, `only ${asked.size} effects asked for by name`);
  const lost = [...asked].filter(([name]) => !known.has(name)).map(([name, files]) => `${name} (asked for in ${[...files].join(', ')})`);
  assert.deepEqual(lost, [], 'a sound is asked for by name that the table cannot make, so those moments are silent');
});

test('the discovery of something is not silent', () => {
  assert.ok(known.has('discovery'), 'nothing marks finding something out');
  const main = readFileSync(dir + 'main.js', 'utf8');
  const sites = [...main.matchAll(/effect\(\s*(?:'discovery'|[^)]*\?\s*'discovery')/g)];
  assert.ok(sites.length >= 10, `only ${sites.length} places mark a discovery`);
  // The one that matters most: the trip that brings in the green coat must not be the quiet one.
  assert.match(main, /effect\(result\.found\?'discovery':'success'\)/,
    'the hurdle trip that finds him should sound different from the ones that do not');
});

test('a sound the table does not have is refused rather than thrown', () => {
  // No AudioContext at all: a browser page before the first user gesture, or sound switched off.
  const audio = createRoadAudio({ AudioContext: undefined });
  for (const name of [...known, 'no-such-effect', '', null, undefined, 42, {}])
    assert.equal(audio.effect(name), false, `effect(${JSON.stringify(name)}) did not refuse quietly`);
  assert.equal(audio.toggle(), false, 'sound cannot be switched on without a device');
  audio.update(1 / 60, { position: { x: 0, z: 0 }, speed: 1, region: 1, playing: true });
  audio.dispose();
  audio.dispose();
  assert.equal(audio.effect('bell'), false, 'a disposed audio still refuses quietly');
});

test('the geography of sound survives nonsense without a device', () => {
  for (const given of [undefined, { region: 3 }, { position: { x: NaN, z: Infinity }, region: 2 },
    { position: { x: 0, z: 0 }, region: { id: 4 } }, { position: { x: 0, z: 0 }, region: 0 }, { position: { x: 0, z: 0 }, region: -1 }]) {
    const profile = roadAudioProfile(given);
    assert.ok(Number.isInteger(profile.region) && profile.region > 0, `region came back as ${profile.region}`);
    assert.ok(['earth', 'wood', 'stone'].includes(profile.surface), `surface came back as ${profile.surface}`);
    for (const [key, value] of Object.entries(profile))
      if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0, `${key} came back as ${value}`);
  }
});
