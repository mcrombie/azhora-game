import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Every save section is validated before it is applied, and the whole checkpoint is
 * refused if any one section fails (`road-checkpoint.js`). So a validator that accepts
 * a value its own `snapshot()` cannot write back is not a small slip: it loses the
 * player's entire save. This sweeps every `validate*Snapshot` in src/ rather than
 * trusting each module to remember on its own.
 */
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const modules = [];
for (const file of readdirSync(SRC).filter(name => name.endsWith('.js'))) {
  const text = readFileSync(SRC + file, 'utf8');
  if (!/export function validate\w*Snapshot/.test(text)) continue;
  if (/from 'three'/.test(text)) continue;   // scene modules need the renderer; they carry no save section
  const module = await import(new URL(`../src/${file}`, import.meta.url));
  const validators = Object.keys(module).filter(name => /^validate\w*Snapshot$/.test(name));
  for (const maker of Object.keys(module).filter(name => /^create[A-Z]/.test(name) && typeof module[name] === 'function')) {
    let made;
    try { made = module[maker](); } catch { continue; }          // needs arguments: covered by its own module's tests
    if (!made || typeof made.snapshot !== 'function' || typeof made.restore !== 'function') continue;
    const snapshot = made.snapshot();
    if (!snapshot || typeof snapshot !== 'object') continue;
    const expected = maker === 'createMopWalk' ? 'validateMopSnapshot' : 'validate' + maker.slice(6) + 'Snapshot';
    const validate = validators.includes(expected) ? expected : validators.length === 1 ? validators[0] : null;
    assert.ok(validate, file + ': specify the matching snapshot validator for ' + maker);
    modules.push({ file, maker, validate: module[validate], validateName: validate, make: module[maker], snapshot });
  }
}

const nonFinite = (value, path = '', found = []) => {
  if (typeof value === 'number' && !Number.isFinite(value)) found.push(`${path} = ${value}`);
  if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) nonFinite(inner, path ? `${path}.${key}` : key, found);
  return found;
};

test('every save section in src/ has a validator that accepts what its own snapshot writes', () => {
  assert.ok(modules.length >= 35, `only found ${modules.length} save sections to check`);
  for (const entry of modules) assert.equal(entry.validate(entry.snapshot), true,
    `${entry.file}: ${entry.validateName} rejects ${entry.maker}().snapshot()`);
});

test('every save section rejects a value that is not an object at all', () => {
  for (const entry of modules) for (const rubbish of [null, 'a save', 7, [], true])
    assert.equal(entry.validate(rubbish), false, `${entry.file}: ${entry.validateName} accepted ${JSON.stringify(rubbish)}`);
});

test('no number a save section accepts can come back out of a restore as one JSON cannot write', () => {
  // 1e308 is finite, so an unbounded `Number.isFinite` check lets it through; the first
  // multiply inside `snapshot()` then overflows to Infinity, JSON writes null, and the
  // next load refuses the whole checkpoint.
  for (const entry of modules) {
    for (const [key, value] of Object.entries(entry.snapshot)) {
      if (typeof value !== 'number') continue;
      for (const huge of [1e308, -1e308, Number.MAX_SAFE_INTEGER * 1e3]) {
        const corrupt = { ...entry.snapshot, [key]: huge };
        if (entry.validate(corrupt) !== true) continue;           // rejected outright: the right answer
        const fresh = entry.make();
        assert.equal(fresh.restore(corrupt), true, `${entry.file}: ${entry.validateName} accepted ${key}=${huge} but restore refused it`);
        const written = fresh.snapshot();
        assert.deepEqual(nonFinite(written), [],
          `${entry.file}: ${entry.validateName} accepts ${key}=${huge}, and the snapshot that comes back cannot be written as JSON`);
        assert.equal(entry.validate(JSON.parse(JSON.stringify(written))), true,
          `${entry.file}: a save round-tripped through JSON after ${key}=${huge} no longer loads`);
      }
    }
  }
});

test('no module can be driven into a save its own validator refuses', () => {
  // A frame the timer could not measure arrives as an undefined or NaN delta. Seven modules in
  // src/ already turn one away with `!Number.isFinite(dt) || dt <= 0`; four did not, and a NaN
  // that reaches a clock is written by JSON as null, which makes road-checkpoint.js refuse the
  // whole checkpoint rather than that one section. So: hand every method nonsense and check the
  // module still describes itself in a way it would take back.
  const NONSENSE = [undefined, Number.NaN, Infinity, -Infinity, -1, 'soon', null, {}, []];
  for (const entry of modules) {
    for (const nonsense of NONSENSE) {
      const live = entry.make();
      for (const [name, method] of Object.entries(live)) {
        if (typeof method !== 'function' || ['snapshot', 'restore', 'view', 'state'].includes(name)) continue;
        try { method(nonsense); } catch { /* a method that refuses an argument outright is fine */ }
      }
      const written = live.snapshot();
      assert.equal(entry.validate(written), true,
        `${entry.file}: after being handed ${JSON.stringify(nonsense) ?? String(nonsense)}, ${entry.maker}() describes itself as ${JSON.stringify(written)}, which ${entry.validateName} refuses`);
      // And what JSON would actually write must come back the same way.
      assert.equal(entry.validate(JSON.parse(JSON.stringify(written))), true,
        `${entry.file}: that save does not survive being written down`);
    }
  }
});
