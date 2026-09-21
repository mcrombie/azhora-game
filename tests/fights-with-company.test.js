import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCombat, MAX_ALLIES } from '../src/combat.js';
import { MERCENARY_ROSTER } from '../src/mercenaries.js';
import { borderEncounter } from '../src/border-chapter.js';
import { aftermathEncounter, AFTERMATH_VARIANTS } from '../src/aftermath-chapter.js';
import { AFTERMATH_ARENAS } from '../src/aftermath-sites.js';
import { OGRE_ENCOUNTER } from '../src/amod-ogre.js';
import { LUSCIA_WOLVES } from '../src/luscia-chapter.js';
import { FOREST_HIDEOUT_QUEST } from '../src/forest-hideout.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const flat = () => ({ bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, colliders: [], heightAt: () => 1.5 });
const authored = Array.from({ length: 4 }, (_, index) => ({ id: `side-${index}`, kind: 'legionary' }));

/** Every fight the game can put in front of the traveler, as tests/every-fight.test.js gathers them. */
function everyFight() {
  const fights = [['the ogre at the pass stones', OGRE_ENCOUNTER], ['the wolves on the burial line', LUSCIA_WOLVES],
    ['the Bramble scout camp', FOREST_HIDEOUT_QUEST.encounter]];
  for (const side of ['empire', 'coalition']) fights.push([`the border battle, for the ${side}`, borderEncounter(side, authored)]);
  for (const spec of Object.values(AFTERMATH_VARIANTS)) {
    const arena = AFTERMATH_ARENAS[spec.arena];
    if (arena) fights.push([`the day after: ${spec.id}`, aftermathEncounter(spec.id, arena, authored)]);
  }
  return fights;
}

/** The company, placed the way `companionAllies` places it: on the traveler's side of the centre. */
function companyFor(config, count) {
  const axis = config.retreatAxis === 'x' ? 'x' : 'z', across = axis === 'x' ? 'z' : 'x';
  const sign = config.retreatSign === -1 ? -1 : 1;
  const room = Math.max(0, MAX_ALLIES - (config.allies?.length ?? 0));
  return MERCENARY_ROSTER.slice(0, Math.min(count, room)).map((merc, index) => ({
    id: merc.id, name: merc.name, kind: 'legionary', level: 30, toughness: 26,
    [axis]: config.center[axis] - sign * (5 + (index % 5) * 3),
    [across]: config.center[across] + (index < 5 ? -1 : 1) * 2.5,
  }));
}

/**
 * The fault this is here for: `encounterConfig` refused any encounter with more than six allies,
 * a cap sized when the only allies were the ones an encounter wrote down. `getAllies` then began
 * adding whoever walks with the traveler to that list and the cap counted the sum - so the border
 * battle, which authors four of its own, became invalid at the **third** companion, and its caller
 * answers a refusal by telling the traveler to go and stand where he is already standing. With
 * three or more companions the main arc could not be finished.
 */
test('every fight starts with nobody, with three, with six and with a whole company', () => {
  const fights = everyFight();
  assert.ok(fights.length >= 8, `only ${fights.length} fights found`);
  for (const [label, encounter] of fights) {
    for (const count of [0, 3, 6, 10]) {
      const position = { x: 0, y: 1.5, z: 0 };
      const combat = createCombat({ world: flat(), position,
        getWeapon: () => ({ id: 'simple-sword', damage: [24, 26, 34], reachMultiplier: 1, usable: true }),
        getAllies: config => companyFor(config, count) });
      assert.equal(combat.startEncounter(encounter, { atCheckpoint: true }), true,
        `${label} refuses to start with ${count} companions`);
      assert.equal(combat.state.phase, 'active', `${label} with ${count}`);
      assert.equal(combat.state.enemies.length, encounter.enemies.length, `${label} lost enemies with ${count} companions`);
      // The side's own soldiers keep their places; the company stands with them, never instead.
      const expected = (encounter.allies?.length ?? 0) + Math.min(count, MAX_ALLIES - (encounter.allies?.length ?? 0));
      assert.equal(combat.state.allies.length, expected, `${label} with ${count}: the side and the company both`);
    }
  }
});

test('the cap holds the whole company and the largest side an encounter writes', () => {
  assert.ok(MAX_ALLIES >= MERCENARY_ROSTER.length + 5,
    `${MAX_ALLIES} is not room for ${MERCENARY_ROSTER.length} of the company and a side of five`);
  // And it is still a cap: something absurd is still refused rather than accepted.
  const combat = createCombat({ world: flat(), position: { x: 0, y: 1.5, z: 0 },
    getWeapon: () => ({ id: 'simple-sword', damage: [24, 26, 34], reachMultiplier: 1, usable: true }) });
  const crowd = Array.from({ length: MAX_ALLIES + 1 }, (_, index) => ({ id: `crowd-${index}`, kind: 'legionary', x: 0, z: -5 }));
  assert.equal(combat.startEncounter({ ...LUSCIA_WOLVES, allies: crowd }, { atCheckpoint: true }), false, 'a crowd past the cap');
  // The host can never be the one who exceeds it: it takes only the room that is left.
  assert.match(source('main.js'), /const room=Math\.max\(0,MAX_ALLIES-\(config\.allies\?\.length\?\?0\)\);/,
    'companionAllies takes the room that is left');
  assert.match(source('main.js'), /fileOrder\.slice\(0,room\)/, 'and the rest hold');
});

/**
 * Every refusal must be visible. `startEncounter` returns false for a fight combat will not
 * accept, and each caller answered differently: the Lauvel wolves sat inside a bare `if`, so a
 * refusal was a silent no-op and the wolves simply never came.
 */
test('no fight is started by a bare if whose refusal does nothing', () => {
  const main = source('main.js');
  const calls = [...main.matchAll(/combat\.startEncounter\(/g)];
  assert.ok(calls.length >= 6, `only ${calls.length} fights started in the host`);
  /** The `if (...)` condition this index sits inside, or null. Not "an if on the same line". */
  const conditionAround = index => {
    for (const head of [...main.slice(0, index).matchAll(/\bif\s*\(/g)].reverse()) {
      let depth = 0;
      for (let at = head.index + head[0].length - 1; at < main.length && at < index + 4000; at++) {
        if (main[at] === '(') depth++;
        else if (main[at] === ')') { depth--; if (!depth) return at > index ? { from:head.index, to: at } : null; }
      }
      return null;
    }
    return null;
  };
  const silent = [];
  for (const call of calls) {
    // Guarded by its own result means the call is inside the `if`'s condition - not merely on a
    // line that happens to contain an `if`, which a review view's `if (view === 'goblin')` is.
    const condition = conditionAround(call.index);
    if (!condition) continue;
    const text = main.slice(condition.from, condition.to + 1);
    // Which branch is the refusal? `if (!start(...))` puts it in the body; `if (start(...))` puts
    // it in the `else`, and a success toast in the body answers nothing at all.
    const negated = /\bif\s*\(\s*!/.test(text);
    const after = main.slice(condition.to + 1, condition.to + 700);
    const answered = negated
      ? /toast\(|return|endEncounter\(|startEncounter\(/.test(after.slice(0, 300))
      // A comment may sit between the block and its `else`, and usually should: the else is
      // the refusal path and deserves saying why it is there.
      : /^\s*\{[\s\S]*?\}\s*(?:\/\/[^\n]*\n\s*)*else\b/.test(after)
        || /^\s*[^;{]*;\s*(?:\/\/[^\n]*\n\s*)*else\b/.test(after);
    if (!answered) silent.push(text.trim().slice(0, 140));
  }
  assert.deepEqual(silent, [], 'a refused fight that nothing answers is a fight that silently never happens');
  // The wolves were the case that proved it: a bare `if` whose refusal was a no-op, so with
  // seven companions they simply never came. Whatever shape it has, it answers now.
  const wolves = main.indexOf('combat.startEncounter(LUSCIA_WOLVES)');
  assert.ok(wolves > 0, 'the wolves are still started somewhere');
  assert.match(main.slice(wolves, wolves + 500), /toast\(|else|endEncounter\(/, 'and a refusal is answered');
});
