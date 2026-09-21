import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as borderChapter from '../src/border-chapter.js';
import { borderEncounter, BORDER_ENCOUNTER_ID } from '../src/border-chapter.js';
import { aftermathEncounter, AFTERMATH_VARIANTS } from '../src/aftermath-chapter.js';
import { regionLevel } from '../src/region-levels.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/**
 * **The hold is lifted** (the user, 2026-09-21: "Lift it to level 2").
 *
 * Combat phase 2 gives every fight the level of the country it happens in. The set-piece battles
 * with armies in them were held at the level they were tuned at, because a traveler with no
 * armour and nobody beside him would have met them at their country's level and lost. Phase 3 and
 * companions are built, so the field is gone and both take their ground's level like everything
 * else. This test is what the old one said to delete, turned over to say what is now true.
 *
 * The ground, measured on the built world rather than assumed: the stockade is on the **Moros
 * Plain**, and the four day-after variants name **West Suval** and the **Moros Plain**. All of
 * them are level 2.
 */
test('the set-piece battles take their country’s level, like every other fight', () => {
  assert.equal('HELD_AT_TUNED_LEVEL' in borderChapter, false, 'the hold is gone, not set to something else');
  const border = borderEncounter('empire', []);
  assert.equal(border.id, BORDER_ENCOUNTER_ID);
  assert.equal('level' in border, false, 'the border battle authors no level of its own');
  for (const variantId of Object.keys(AFTERMATH_VARIANTS)) {
    const fight = aftermathEncounter(variantId, { center: { x: 0, z: 0 }, retreatAxis: 'z' }, []);
    assert.ok(fight, `${variantId} builds`);
    assert.equal('level' in fight, false, `the day after authors none either: ${variantId}`);
  }
  // **An absent field is what reaches the country.** `startEncounter` asks the host's `getLevel`
  // only when the encounter did not author one; `encounterConfig` below it reads `config.level`
  // and calls a missing one nought. So `level: 0` is the hold under another name and deleting the
  // field is the lift - which is also why a harness that set `getLevel` and left the field alone
  // measured the held fight twice and called one of them level 2.
  assert.match(source('combat.js'), /!Number\.isFinite\(asked\.level\) && getLevel\s*\?\s*\{ \.\.\.asked, level: getLevel\(asked\.center\) \}/,
    'the country is asked for only when the fight authored no level');
  // And the countries in question are the ones the lift was ruled for.
  assert.equal(regionLevel('Moros Plain'), 2, 'the stockade’s ground');
  for (const spec of Object.values(AFTERMATH_VARIANTS))
    assert.equal(regionLevel(spec.region), 2, `${spec.title}: ${spec.region}`);
  // The reasons are written where somebody will read them.
  assert.match(source('border-chapter.js'), /The hold is lifted/);
  assert.match(source('aftermath-chapter.js'), /No level of its own/);
});

test('every fight takes the country it happens in, and nobody authors a level', () => {
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
  // Nothing authors a level at all now. `combat.js` is not on the list: the `level:` fields in it
  // are the ally *kinds'* own levels, which is a different idea the user ruled on - a country
  // scales its dangers, never your side - and `tests/companions.test.js` holds those.
  const authored = [];
  for (const file of ['border-chapter.js', 'aftermath-chapter.js', 'main.js', 'moros-chapter.js',
    'forest-hideout.js', 'luscia-chapter.js', 'ogre-toll.js']) {
    let text = '';
    try { text = source(file); } catch { continue; }
    // A sparring bout is the one fight that authors a level on purpose: a friend is not a danger
    // of the country, so a lesson is level 0 wherever it is given (src/main.js, phase 7).
    text = text.replace(/bout:true,level:0/g, 'bout:true').replace(/`level: 0` because a friend/g, '');
    if (/(?<![.\w-])level:\s*\d/.test(text)) authored.push(file);
  }
  assert.deepEqual(authored, [], 'no encounter is given a hand-written level; they take their country’s');
  assert.ok(regionLevel('Luscia') > 0, 'the Lauvel is in a country with a level');
  assert.ok(regionLevel('Pueth') > 0, 'and so is the pass');
});
