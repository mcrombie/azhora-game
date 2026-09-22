import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCombat, MAX_ALLIES } from '../src/combat.js';
import { BORDER_ENCOUNTER_ID, borderEncounter, borderConversation, BORDER_SIDES } from '../src/border-chapter.js';
import { AFTERMATH_VARIANTS, AFTERMATH_IDS, aftermathEncounter, aftermathConversation, createAftermathChapter } from '../src/aftermath-chapter.js';
import { FILE_FLOOR, FILL_KIND, FILL_LOOK, FILL_ARMS, ARMY_BATTLE_IDS, isArmyBattle, fillCount, fillFor, fillLines } from '../src/file-fill.js';
import { MERCENARY_ARMS } from '../src/companions.js';
import { maxHealth } from '../src/combat-skills.js';
import { placeFor } from './fights-with-company.test.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/**
 * The host's own rule, written out once so the test measures what the game does rather than a
 * second copy of it: the file, then the fill, and never past the room the fight has left.
 */
function fileFor({ id = BORDER_ENCOUNTER_ID, side = 'empire', companions = 0, authored = 0, config = null, centre = { x: 0, z: 0 } } = {}) {
  const room = Math.max(0, MAX_ALLIES - authored);
  // The file's own geometry, as `companionAllies` lays it. Where a whole encounter is to hand it
  // is that encounter's own placement (tests/fights-with-company.test.js, pinned against the host
  // there); where this only needs somewhere legal to stand, two ranks a little behind the centre.
  const place = config ? placeFor(config)
    : index => ({ x: centre.x + ((index % 5) - 2) * 2.2 + (index < 5 ? 0 : 1.1), z: centre.z + 2.6 + (index < 5 ? 0 : 2.6) });
  const file = Array.from({ length: Math.min(companions, room) },
    (_, i) => ({ id: `merc-${i}`, kind: 'legionary', level: 35, toughness: 30, ...place(i) }));
  if (!isArmyBattle(id)) return file;
  return [...file, ...fillFor({ side, walking: file.length, room: room - file.length })
    .map((man, index) => ({ ...man, ...place(file.length + index) }))];
}

test('the army fills your file, and only at the army’s own battles', () => {
  assert.equal(FILE_FLOOR, 6, 'one constant, and the hunter is still measuring it');
  // Every army battle: the border, and every day after it. Nothing else.
  assert.ok(ARMY_BATTLE_IDS.includes(BORDER_ENCOUNTER_ID));
  for (const id of AFTERMATH_IDS) assert.ok(isArmyBattle(AFTERMATH_VARIANTS[id].encounterId), `${id} is one of the army's`);
  assert.equal(ARMY_BATTLE_IDS.length, 1 + AFTERMATH_IDS.length, 'and there are no others');
  for (const other of ['tidehaven-raiders', 'meadow-raiders', 'luscia-wolves', 'amod-ogre', 'sparring-bout', 'practice'])
    assert.equal(isArmyBattle(other), false, `nobody assigns a traveler soldiers for ${other}`);
  assert.equal(isArmyBattle(undefined), false);
});

test('how many the army puts in, at 0, 3, 5, 6 and 10 companions', () => {
  // The measured cases: alone and with three it cannot be won, with six it is won every time.
  assert.equal(fillCount({ walking: 0 }), 6, 'a lone traveler is given a file');
  assert.equal(fillCount({ walking: 3 }), 3);
  assert.equal(fillCount({ walking: 5 }), 1, 'and one more is still one more');
  assert.equal(fillCount({ walking: 6 }), 0, 'six is the floor, and a floor is not a ceiling');
  assert.equal(fillCount({ walking: 10 }), 0, 'a full company is handed nobody');
  assert.equal(fillCount({ walking: 99 }), 0, 'and nothing is ever taken away');
  // Six or more and the fight is what it is today, to the digit.
  for (const companions of [6, 7, 10]) {
    const file = fileFor({ companions });
    assert.equal(file.length, companions, `${companions} companions and nobody added`);
    assert.ok(!file.some(one => one.id.startsWith('file-fill-')));
  }
  for (const [companions, expected] of [[0, 6], [3, 6], [5, 6]]) {
    const file = fileFor({ companions });
    assert.equal(file.length, expected, `${companions} companions makes a file of ${expected}`);
    assert.equal(file.filter(one => one.id.startsWith('file-fill-')).length, expected - companions);
  }
});

test('they are ordinary soldiers of the side he signed with, trained a little', () => {
  for (const side of BORDER_SIDES) {
    const fill = fillFor({ side, walking: 0 });
    assert.equal(fill.length, FILE_FLOOR);
    for (const man of fill) {
      assert.equal(man.kind, FILL_KIND, 'the same kind the battle’s own side allies already are');
      assert.equal(man.name, FILL_LOOK[side].name, `${side} calls him what it already calls him`);
      assert.equal(man.model.role, FILL_LOOK[side].model.role);
      // **Trained a little** (the user, 2026-09-21): the hunter's measured lever, which took a
      // lone traveler's border battle from 21/40 with five stalemates to 32/40 with none.
      assert.equal(man.level, FILL_ARMS.level, 'he has the one level the army trains him to');
      assert.equal(man.toughness, FILL_ARMS.toughness, 'and the toughness that goes with it');
      assert.equal(man.model.skin, undefined, 'and no face anybody would recognise');
    }
    assert.equal(new Set(fill.map(one => one.id)).size, fill.length, 'and each is his own man in the fight');
  }
  // Whichever army he signed with fills his file, and they do not look alike.
  assert.notEqual(FILL_LOOK.empire.model.role, FILL_LOOK.coalition.model.role);
  assert.notEqual(FILL_LOOK.empire.name, FILL_LOOK.coalition.name);
  assert.deepEqual(fillFor({ side: 'nowhere', walking: 0 })[0].model, { ...FILL_LOOK.empire.model }, 'and an unsigned traveler gets the Emperor’s');
});

/**
 * **The law the training has to keep: an assigned stranger is strictly weaker than the weakest
 * man who ever chose to walk with you.** The whole of what this module is for is that friends
 * still matter, and the user's ruling says so in as many words. The numbers are read out of
 * `MERCENARY_ARMS` rather than written down here, so that a companion added later who is weaker
 * than Altun trips this test instead of quietly making the army's strangers his equal.
 */
test('the fill is strictly weaker than the weakest companion, whoever that comes to be', () => {
  const arms = Object.values(MERCENARY_ARMS);
  assert.ok(arms.length >= 10, `only ${arms.length} companions have numbers`);
  const weakestLevel = Math.min(...arms.map(one => one.level));
  const weakestToughness = Math.min(...arms.map(one => one.toughness));
  // Altun, as it stands: level 20 / toughness 17, the two floors of the roster.
  assert.ok(FILL_ARMS.level < weakestLevel,
    `an assigned man at level ${FILL_ARMS.level} is not below the weakest companion's ${weakestLevel}`);
  assert.ok(FILL_ARMS.toughness < weakestToughness,
    `an assigned man at toughness ${FILL_ARMS.toughness} is not below the weakest companion's ${weakestToughness}`);
  // And on the field it is real: his health is his toughness's own number, under every companion's.
  for (const man of fillFor({ walking: 0 })) {
    assert.equal(maxHealth(man.toughness), maxHealth(FILL_ARMS.toughness));
    for (const one of arms) assert.ok(maxHealth(man.toughness) < maxHealth(one.toughness),
      `an assigned man stands ${maxHealth(man.toughness)} to a companion's ${maxHealth(one.toughness)}`);
  }
});

test('company plus the side’s own men plus the fill never passes the cap', () => {
  for (const authored of [0, 4, 5, MAX_ALLIES - 1, MAX_ALLIES]) {
    for (const companions of [0, 3, 5, 6, 10, 16]) {
      const file = fileFor({ companions, authored });
      assert.ok(file.length + authored <= MAX_ALLIES,
        `${companions} companions and ${authored} authored made ${file.length + authored}`);
    }
  }
  // At the cap exactly, nobody is added, and the fight still starts.
  assert.equal(fileFor({ companions: 0, authored: MAX_ALLIES }).length, 0);
  // And an encounter handed that many allies is still a valid encounter.
  const world = { bounds: { minX: -999, maxX: 999, minZ: -999, maxZ: 999 }, colliders: [], heightAt: () => 1.5 };
  const position = { x: 0, y: 1.5, z: 0 };
  const combat = createCombat({ world, position, getAllies: config => fileFor({ id: config.id, companions: 0, config }) });
  assert.equal(combat.startEncounter(borderEncounter('empire', [])), true, 'the border battle starts with a filled file');
  assert.equal(combat.state.allies.filter(one => one.id.startsWith('file-fill-')).length, FILE_FLOOR);
  // And each of them stands on his own toughness, as a companion does - the one pair of numbers
  // the army trains him to, and nothing of the country's.
  assert.ok(combat.state.allies.every(one => one.hp === maxHealth(FILL_ARMS.toughness)),
    `every one of them is an assigned soldier at ${maxHealth(FILL_ARMS.toughness)}`);
  assert.ok(combat.state.allies.every(one => one.level === FILL_ARMS.level), 'and hits at his own level');
});

test('every day after the battle fills the same file, on both sides', () => {
  const world = { bounds: { minX: -999, maxX: 999, minZ: -999, maxZ: 999 }, colliders: [], heightAt: () => 1.5 };
  for (const id of AFTERMATH_IDS) {
    const spec = AFTERMATH_VARIANTS[id];
    const arena = { center: { x: 0, z: 0 }, retreatAxis: 'z' };
    for (const companions of [0, 3, 6]) {
      const position = { x: 0, y: 1.5, z: 0 };
      const combat = createCombat({ world, position, getAllies: config => fileFor({ id: config.id, side: spec.side, companions, config }) });
      const fight = aftermathEncounter(id, arena, []);
      assert.ok(fight, `${id} has a fight`);
      assert.equal(combat.startEncounter(fight, { atCheckpoint: true }), true, `${id} starts`);
      const filled = combat.state.allies.filter(one => one.id.startsWith('file-fill-')).length;
      assert.equal(filled, Math.max(0, FILE_FLOOR - companions), `${id} with ${companions} companions`);
      if (companions >= FILE_FLOOR) assert.equal(filled, 0, `${id} with a company is untouched`);
    }
  }
});

test('the dead among the fill cost nothing anywhere', async () => {
  const main = source('main.js');
  // A fill soldier is not on the companions list, so none of the things that happen to a
  // companion can happen to him: he is never `walksWith`, so he is never `died`, never `fallen`,
  // never a card, never a name the Marshal is owed.
  assert.match(main, /if\(e\.type==='ally-down'&&companions\.walksWith\(e\.id\)\)\{/, 'only a companion is mourned');
  assert.match(source('companions.js'), /const known = id => COMPANION_IDS\.includes\(id\);/);
  const { COMPANION_IDS, createCompanions } = await import('../src/companions.js');
  const { createFallen } = await import('../src/bystanders.js');
  for (const man of fillFor({ walking: 0 })) {
    assert.ok(!COMPANION_IDS.includes(man.id), `${man.id} is not one of the ten`);
    const fallen = createFallen();
    const companions = createCompanions({ fallen });
    assert.equal(companions.walksWith(man.id), false);
    assert.equal(companions.died(man.id, { where: 'the border' }).ok, false, 'he cannot be written down as dead');
    assert.equal(companions.owed().length, 0, 'and the Marshal is owed nothing about him');
    assert.equal(fallen.ids.length, 0, 'and he is in no list of the gone');
  }
  // Nothing about him is saved: he is built where the fight is laid and forgotten with it.
  assert.doesNotMatch(main, /file-fill[^)]*snapshot/, 'the fill is in no snapshot');
  assert.match(main, /const fill=fillFor\(\{side:armySide\(\),walking:file\.length,room:room-file\.length\}\);/,
    'he is made at the fight and nowhere else');
});

test('his captain says so, in his own voice, and only when it is happening', () => {
  for (const side of BORDER_SIDES) {
    assert.deepEqual(fillLines(side, 0), [], 'a full file is told nothing');
    const said = fillLines(side, 3);
    assert.equal(said.length, 2, 'two short lines and no more');
    assert.ok(said.every(line => line.length < 200), 'short');
    assert.match(said[0], /three/, 'and truthful about the number');
    assert.match(fillLines(side, 1)[0], /one of/, 'one is one');
    assert.match(fillLines(side, 5)[0], /five of/);
  }
  assert.notDeepEqual(fillLines('empire', 3), fillLines('coalition', 3), 'each captain has his own voice');
  assert.match(fillLines('coalition', 2)[0], /valley/i, 'Voss speaks for the valley companies');
  assert.match(fillLines('empire', 2)[0], /mine/, 'and Brulan for his own');
  // Said by the man who already gives him the word before that battle, and by nobody new.
  const border = source('border-chapter.js'), after = source('aftermath-chapter.js');
  assert.match(border, /\.\.\.fill, \.\.\.line\], null, 'Back to the line'/, 'the captain at the line says it');
  // The commander at the rally says it, after the fine steel his side owes the traveler.
  assert.match(after, /openDialogue\(npc, \[\.\.\.gift, \.\.\.chapter\.orders, \.\.\.fill\]/, 'and the commander at the rally');
  assert.match(source('main.js'), /const fillSaid=\(\)=>fillLines\(armySide\(\),fillCount\(\{walking:fileOrder\.filter\(id=>!fallen\.has\(id\)\)\.length\}\)\);/,
    'and the number he says is the number the fight will use');
});

test('it is a rule about the army’s battles and touches nothing else', () => {
  // No encounter level moved, and no other fight gained anybody.
  const fill = source('file-fill.js');
  // The men it adds carry one pair of numbers, written down in one place, and it moves no
  // *fight's* level anywhere: how hard a battle is stayed where it was, which is the country's.
  assert.equal((fill.match(/level: \d/g) ?? []).length, 1, 'the fill’s level is one number in one place');
  assert.match(fill, /level: FILL_ARMS\.level, toughness: FILL_ARMS\.toughness/, 'and every man reads it from there');
  assert.match(fill, /export const FILL_ARMS = freeze\(\{ level: 15, toughness: 12 \}\);/,
    'the hunter’s measured lever, and the user’s answer');
  assert.doesNotMatch(fill, /countryHealth|countryDamage|HELD_AT_TUNED/, 'and moves no fight’s level');
  assert.match(source('main.js'), /if\(!isArmyBattle\(config\.id\)\)return file;/, 'every other fight returns before it');
  // A fight that is not the army's is exactly what it was.
  for (const id of ['tidehaven-raiders', 'meadow-raiders', 'sparring-bout'])
    assert.deepEqual(fileFor({ id, companions: 0 }), [], `${id} is untouched`);
  assert.equal(fileFor({ id: 'meadow-raiders', companions: 3 }).length, 3, 'and carries only his own friends');
  // An undefined company is today's fight: a combat wired to nothing has no allies at all.
  const world = { bounds: { minX: -999, maxX: 999, minZ: -999, maxZ: 999 }, colliders: [], heightAt: () => 1.5 };
  const bare = createCombat({ world, position: { x: 0, y: 1.5, z: 0 } });
  assert.equal(bare.startEncounter(borderEncounter('empire', [])), true);
  assert.equal(bare.state.allies.length, 0, 'nobody is conjured for a fight that was never handed a company');
});

/**
 * **The fill comes in the way the company comes, not through the battle's own ally list.** The
 * hunter's warning: `ALLY_SPOTS` in src/border-chapter.js has five places and the side already
 * uses four, so a fill of two or more handed to `borderEncounter` would be silently sliced off -
 * the traveler would be told six and given one, and nothing would say so. It goes through
 * `getAllies` instead, which is how the companions already arrive and which has `MAX_ALLIES` of
 * room and places of its own.
 */
test('a fill of six for a lone traveler is six men actually on the field', () => {
  const world = { bounds: { minX: -999, maxX: 999, minZ: -999, maxZ: 999 }, colliders: [], heightAt: () => 1.5 };
  const position = { x: 0, y: 1.5, z: 0 };
  const combat = createCombat({ world, position,
    getAllies: config => fileFor({ id: config.id, companions: 0, authored: config.allies?.length ?? 0, centre: config.center }) });
  // The battle as the host actually lays it, with the side's own four men in it.
  const side = [1, 2, 3, 4].map(n => ({ id: `valley-company-${n}`, name: 'Valley company', kind: 'legionary' }));
  assert.equal(combat.startEncounter(borderEncounter('empire', side)), true);
  const fill = combat.state.allies.filter(one => one.id.startsWith('file-fill-'));
  assert.equal(fill.length, FILE_FLOOR, `six were promised and ${fill.length} are standing there`);
  assert.equal(combat.state.allies.length, FILE_FLOOR + side.length, 'the side\'s own four are still there too');
  // Each of them is his own man with his own place, and none is on top of another.
  assert.equal(new Set(fill.map(one => one.id)).size, FILE_FLOOR);
  for (const man of fill) {
    assert.ok(Number.isFinite(man.x) && Number.isFinite(man.z), `${man.id} is somewhere`);
    assert.ok(man.hp > 0 && man.active, `${man.id} is standing`);
  }
  // And the battle's own five places are untouched by any of it: the fill never went near them.
  const spots = source('border-chapter.js').match(/const ALLY_SPOTS = \[\[[^\]]*\](?:, \[[^\]]*\])*\]/);
  assert.ok(spots, 'the side still has its own places');
  assert.equal((spots[0].match(/\[-/g) ?? []).length, 5, 'five of them, as it always had');
  assert.doesNotMatch(source('file-fill.js'), /ALLY_SPOTS|borderEncounter\(/, 'and the fill knows nothing about them');
  assert.doesNotMatch(source('main.js'), /borderEncounter\(side,\[\.\.\.borderAllies/, 'the host does not push it through them either');
});
