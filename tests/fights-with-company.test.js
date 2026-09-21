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

/**
 * **`companionAllies`'s placement, written out once so the tests measure the host's rule rather
 * than a second idea of it** - and pinned against the host's own source below, so the copy cannot
 * drift. The file forms up on the point the fight forms up at, stepped the way that is away from
 * the enemies from there, and clamped inside the ground `encounterConfig` will accept.
 */
export function placeFor(config) {
  const axis = config.retreatAxis === 'x' ? 'x' : 'z', across = axis === 'x' ? 'z' : 'x';
  const sign = config.retreatSign === -1 ? -1 : 1;
  const along = p => sign * (p[axis] - config.center[axis]), over = p => p[across] - config.center[across];
  const line = Number.isFinite(config.retreatLine) ? config.retreatLine : config.retreatZ;
  const anchorAlong = along(config.checkpoint), anchorOver = over(config.checkpoint);
  const enemyAlong = config.enemies.reduce((sum, foe) => sum + along(foe), 0) / config.enemies.length;
  const back = anchorAlong >= enemyAlong ? 1 : -1;
  const far = Math.min(18, along({ [axis]: line, [across]: 0 }) - 1.5), near = -19.5;
  const overBase = Math.max(-6.6, Math.min(5.5, anchorOver));
  return index => {
    const rank = index < 5 ? 0 : 1;
    return { [axis]: config.center[axis] + sign * Math.max(near, Math.min(far, anchorAlong + back * (2.6 + rank * 2.6))),
      [across]: config.center[across] + overBase + ((index % 5) - 2) * 2.2 + rank * 1.1 };
  };
}

/** The company, placed the way `companionAllies` places it: with the traveler, never among the enemy. */
function companyFor(config, count) {
  const room = Math.max(0, MAX_ALLIES - (config.allies?.length ?? 0));
  const place = placeFor(config);
  return MERCENARY_ROSTER.slice(0, Math.min(count, room)).map((merc, index) => ({
    id: merc.id, name: merc.name, kind: 'legionary', level: 30, toughness: 26, ...place(index),
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

/**
 * **The file stands with the traveler, and never among the enemy.**
 *
 * `place(index)` was `center - sign*(5 + (index%5)*3)` - five ranks measured from the arena's
 * centre away from the way out, which is the **enemy's** end of every arena the game lays. Its own
 * comment said "on the traveler's side of the centre". Measured on the real border battle, the
 * side's four authored soldiers stood 6.7 to 9.1 m from the traveler while the six the army
 * assigned him stood **18.2 to 30.1 m away, and 1.8 to 8.7 m from the nearest enemy** - the fifth
 * of them in contact before the first blow. Every table taken since companions became allies was
 * measured with the file standing among the enemy (docs/known-issues.md).
 *
 * A sign was not the repair. The arenas disagree: the Lauvel's traveler forms up at along -11 with
 * his wolves at -7 and -9, on the far side of them, and Mallec's forms up at +21, outside the +18
 * an ally may even stand at. So the file is laid on the checkpoint, stepped away from the enemies
 * from there, and clamped into the ground `encounterConfig` accepts.
 */
test('every man of the file starts with the traveler, and none of them among the enemy', () => {
  for (const [label, encounter] of everyFight()) {
    const authoredAllies = encounter.allies ?? [];
    for (const count of [1, 3, 6, 10, 12]) {
      const company = companyFor(encounter, count);
      if (!company.length) continue;
      const toTraveler = man => Math.hypot(man.x - encounter.checkpoint.x, man.z - encounter.checkpoint.z);
      const toNearestFoe = man => Math.min(...encounter.enemies.map(foe => Math.hypot(man.x - foe.x, man.z - foe.z)));
      for (const man of company) {
        // **Nearer his own man than theirs**, which is the whole of what went wrong.
        assert.ok(toTraveler(man) < toNearestFoe(man),
          `${label} with ${count}: ${man.id} is ${toTraveler(man).toFixed(1)} m from the traveler and ${toNearestFoe(man).toFixed(1)} m from an enemy`);
        // And beside him rather than out on the field: the arena is 39 m long, so ten metres is
        // already a long way to be from the man you are supposed to be standing with.
        assert.ok(toTraveler(man) <= 10,
          `${label} with ${count}: ${man.id} forms up ${toTraveler(man).toFixed(1)} m from the traveler`);
        // Nobody starts inside the side's own soldiers.
        for (const mate of authoredAllies) assert.ok(Math.hypot(man.x - mate.x, man.z - mate.z) >= 1.2,
          `${label} with ${count}: ${man.id} stands on ${mate.id}`);
      }
      // Nor inside each other.
      for (let i = 0; i < company.length; i++) for (let j = i + 1; j < company.length; j++) {
        const gap = Math.hypot(company[i].x - company[j].x, company[i].z - company[j].z);
        assert.ok(gap >= 1.0, `${label} with ${count}: ${company[i].id} and ${company[j].id} are ${gap.toFixed(2)} m apart`);
      }
    }
  }
});

/**
 * And the copy of the rule these tests measure with is the host's rule. Every piece of the
 * placement is pinned, because a test that quietly measures a second idea of the game is worth
 * nothing at all.
 */
test('the placement the tests use is the placement main.js writes', () => {
  const main = source('main.js');
  assert.match(main, /const anchor=config\.checkpoint,anchorAlong=along\(anchor\),anchorOver=over\(anchor\);/,
    'the file forms up where the fight forms up');
  assert.match(main, /const enemyAlong=config\.enemies\.reduce\(\(sum,foe\)=>sum\+along\(foe\),0\)\/config\.enemies\.length;/);
  assert.match(main, /const back=anchorAlong>=enemyAlong\?1:-1;/, 'and steps away from them');
  assert.match(main, /const far=Math\.min\(18,along\(\{\[axis\]:line,\[across\]:0\}\)-1\.5\),near=-19\.5;/,
    'short of the way out, and inside the ground encounterConfig accepts');
  assert.match(main, /\[axis\]:config\.center\[axis\]\+sign\*Math\.max\(near,Math\.min\(far,anchorAlong\+back\*\(2\.6\+rank\*2\.6\)\)\)/);
  assert.match(main, /const overBase=Math\.max\(-6\.6,Math\.min\(5\.5,anchorOver\)\);/,
    'the line is shifted to fit across the arena, never clamped man by man');
  assert.match(main, /\[across\]:config\.center\[across\]\+overBase\+\(\(index%5\)-2\)\*2\.2\+rank\*1\.1/);
  // The fault itself, so it cannot come back.
  assert.ok(!/config\.center\[axis\]-sign\*\(5\+\(index%5\)\*3\)/.test(main),
    'the file is never again measured from the centre toward the enemy');
});
