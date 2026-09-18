import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

/**
 * The traveler is drawn by `createCharacter()` with its default role, 'traveler'.
 * Anybody given that same role is a pure copy of the person playing the game,
 * which is the one thing nobody in this country is allowed to be. Everyone has
 * their own build, cloth and skin; this is the check that keeps it that way.
 */
test('nobody in Azhora is a copy of the traveler', async () => {
  const files = (await readdir(src)).filter(name => name.endsWith('.js'));
  assert.ok(files.length > 40, 'the source was found');
  const twins = [];
  for (const name of files) {
    const text = await readFile(path.join(src, name), 'utf8');
    for (const match of text.matchAll(/modelRole\s*:\s*'([a-z-]+)'/g)) {
      if (match[1] === 'traveler') twins.push(`${name}: ${text.slice(Math.max(0, match.index - 60), match.index + 30).split('\n').pop()}`);
    }
  }
  assert.deepEqual(twins, [], 'these characters are drawn with the traveler’s own model');
});

test('the people of Tidehaven do not share a face with each other either', async () => {
  const { BOTANIST } = await import('../src/botany.js');
  const { MYCOLOGIST } = await import('../src/mycology.js');
  const { PIPE_SMOKER } = await import('../src/pipeweed.js');
  const { TOFT } = await import('../src/jimson-quest.js');
  const { BIRD_WATCHER } = await import('../src/birding.js');
  const { REFUGEES } = await import('../src/refugees.js');
  const people = [BOTANIST, MYCOLOGIST, PIPE_SMOKER, TOFT, BIRD_WATCHER, ...REFUGEES];
  const seen = new Map();
  for (const person of people) {
    const face = `${person.modelRole}/${person.color}/${person.skin ?? 'default'}`;
    assert.ok(!seen.has(face), `${person.name} is drawn exactly like ${seen.get(face)}`);
    seen.set(face, person.name);
    assert.notEqual(person.modelRole, 'traveler', `${person.name} wears the traveler's own model`);
  }
});
