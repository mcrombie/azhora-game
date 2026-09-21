import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HELD_AT_TUNED_LEVEL, borderEncounter, BORDER_ENCOUNTER_ID } from '../src/border-chapter.js';
import { aftermathEncounter, AFTERMATH_VARIANTS } from '../src/aftermath-chapter.js';
import { regionLevel } from '../src/region-levels.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/**
 * Combat phase 2 gives every fight the level of the country it happens in. The set-piece battles
 * with armies in them stand on ground of level 1 and 2, so they would be harder than they were
 * tuned for - fought by a traveler with no armour and no company, because phase 3 and companions
 * are not built yet. The design closes that gap with gear and with who walks beside you. Until
 * both exist these fights keep the level they were balanced at, and this says which ones and why.
 *
 * **When phase 3 and companions are in, this test is what to delete**, along with the constant.
 */
test('the set-piece battles are held at the level they were tuned at', () => {
  assert.equal(HELD_AT_TUNED_LEVEL, 0, 'which is today');
  const border = borderEncounter('empire', []);
  assert.equal(border.id, BORDER_ENCOUNTER_ID);
  assert.equal(border.level, HELD_AT_TUNED_LEVEL, 'the border battle');
  for (const variantId of Object.keys(AFTERMATH_VARIANTS)) {
    const fight = aftermathEncounter(variantId, { center: { x: 0, z: 0 }, retreatAxis: 'z' }, []);
    assert.ok(fight, `${variantId} builds`);
    assert.equal(fight.level, HELD_AT_TUNED_LEVEL, `the day after: ${variantId}`);
  }
  // It is a hold, and it says so where somebody will read it.
  assert.match(source('border-chapter.js'), /A hold, to be lifted/, 'the constant explains itself');
  assert.match(source('border-chapter.js'), /Lift this when phase 3 \(tiers and armour\) and companions are in/, 'and says when to lift it');
});

test('every other fight still takes the country it happens in', () => {
  // The three the hunter named, and the ground each stands on. None of them carries a level of
  // its own, so `startEncounter` gives each the level of its country (combat phase 2).
  const main = source('main.js');
  for (const [name, needle] of [
    ['Mallec at the pass stones', 'OGRE_ENCOUNTER'],
    ['the wolves at the Lauvel', 'LUSCIA_WOLVES'],
    ['the Bramble scout camp', 'hideoutEncounter'],
  ]) {
    const where = main.indexOf(`const ${needle}`) >= 0 ? main.indexOf(`const ${needle}`) : main.indexOf(needle);
    assert.ok(where > 0, `${name} is in the host`);
  }
  // Nothing but the two held builders authors a level at all.
  const authored = [];
  for (const file of ['border-chapter.js', 'aftermath-chapter.js', 'main.js', 'moros-chapter.js',
    'forest-hideout.js', 'luscia-chapter.js', 'ogre-toll.js', 'combat.js']) {
    let text = '';
    try { text = source(file); } catch { continue; }
    // `level:` as an encounter's own field, not `skill.level:0` in a ternary.
    if (/(?<![.\w-])level:\s*(?!HELD_AT_TUNED_LEVEL)\d/.test(text)) authored.push(file);
  }
  assert.deepEqual(authored, [], 'no encounter is given a hand-written level; they take their country’s');
  // And the countries those three stand in are not level 0, so the difference is real.
  assert.ok(regionLevel('Luscia') > 0, 'the Lauvel is in a country with a level');
  assert.ok(regionLevel('Pueth') > 0, 'and so is the pass');
});
