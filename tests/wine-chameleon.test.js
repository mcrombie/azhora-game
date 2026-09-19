import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { SOLIS_ENCLOSURE } from '../src/west-suval.js';
import { ATTIC_WINES } from '../src/attic-wines.js';
import { ED, ED_HAUNTS, SEA_WALL_NICHE, SECRETARY, SECRETARY_STAND, SOBER_SIGNS, SOBERING, KEEP_REWARD, PRIME_MINISTER,
  createEd, edConversation, secretaryConversation, validateEdSnapshot } from '../src/wine-chameleon.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const sequence = values => { let i = 0; return () => values[i++ % values.length]; };
const talker = () => {
  const log = { opened: null, acted: [] };
  return { log, context: { openDialogue: (npc, lines, event, close, options) => { log.opened = { lines, options }; }, closeDialogue() {}, act: action => log.acted.push(action) } };
};
const ids = log => (log.opened.options?.choices ?? []).map(choice => choice.id);

test('Ed’s haunts, the niche in the sea wall and the secretary’s door are all in Solis, where a person can stand', () => {
  for (const place of [...ED_HAUNTS, SEA_WALL_NICHE, SECRETARY_STAND]) {
    assert.equal(world.regionAt(place.x, place.z)?.name, 'West Suval');
    assert.ok(SOLIS_ENCLOSURE.contains(place.x, place.z), `${place.id ?? 'a place'} is inside the walls`);
  }
  for (const haunt of ED_HAUNTS) assert.ok(canStand(haunt.x, haunt.z, world, .25), `${haunt.id} has room for a chameleon`);
  assert.ok(canStand(SECRETARY_STAND.x, SECRETARY_STAND.z, world, .3), 'the secretary has room');
  let reach = false;
  for (let a = 0; a < 12 && !reach; a++) reach = canStand(SEA_WALL_NICHE.x + Math.cos(a * .52) * 1.4, SEA_WALL_NICHE.z + Math.sin(a * .52) * 1.4, world, .3);
  assert.ok(reach, 'the niche can be walked up to');
});

test('he goes up in smoke if you run at him, swing at him or grab him, and never where he was', () => {
  const ed = createEd({ random: sequence([.1, .5, .9, .3]) });
  const here = () => ed.haunt;
  const near = (d, extra = {}) => ({ x: here().x + d, z: here().z, ...extra });
  assert.deepEqual(ed.update(1, near(1.5)), [], 'walking up quietly is allowed');
  const first = here().id;
  const [chased] = ed.update(1, near(2, { hurrying: true }));
  assert.equal(chased.type, 'poof'); assert.equal(chased.reason, 'chased'); assert.notEqual(here().id, first);
  const second = here().id;
  const [swung] = ed.update(1, near(3, { swinging: true }));
  assert.equal(swung.reason, 'swung-at'); assert.notEqual(here().id, second);
  const third = here().id, grabbed = ed.grab();
  assert.equal(grabbed.reason, 'grabbed'); assert.notEqual(grabbed.to.id, third);
  // He stays while somebody is talking to him, and wanders once they have gone.
  assert.deepEqual(ed.update(ED.stay + 1, near(2)), []);
  assert.equal(ed.update(1, near(20))[0].reason, 'wandered');
  assert.equal(ed.poofs, 4);
});

test('the arrangement: the cask, the secretary, and a choice', () => {
  const kept = createEd();
  assert.equal(kept.task(), null);
  kept.meet();
  assert.equal(kept.quest, 'heard');
  assert.match(kept.task().detail, /Somebody is feeding him/);
  assert.equal(kept.confront().ok, false, 'not without the cask');
  assert.ok(kept.findCask().first);
  assert.equal(kept.task().target, SECRETARY.id);
  assert.ok(kept.confront().ok);
  assert.match(kept.task().detail, new RegExp(PRIME_MINISTER));
  assert.deepEqual(kept.keep(), { ok: true, reward: KEEP_REWARD });
  assert.equal(kept.task(), null);
  assert.equal(kept.expose().ok, false, 'a kept secret stays kept');
  assert.deepEqual(kept.update(SOBERING * 2).filter(e => e.type === 'sober-sign'), [], 'and nothing goes wrong');
  // Exposed: the deliveries stop, he sobers, and the city feels it in order, once.
  const told = createEd(); told.meet(); told.findCask(); told.confront();
  assert.ok(told.expose().ok);
  const signs = [];
  for (let t = 0; t < SOBERING * 1.2; t += 10) signs.push(...told.update(10).filter(e => e.type === 'sober-sign'));
  assert.deepEqual(signs.map(s => s.title), SOBER_SIGNS.map(s => s.title));
  assert.ok(told.sober());
  // A bottle settles it, and the signs can come again.
  const fed = told.feed(ATTIC_WINES.enbraleth.item);
  assert.ok(fed.ok && fed.first && fed.settled);
  assert.equal(told.sober(), false);
  assert.equal(told.feed('rye-loaf').ok, false, 'wine, long-legs');
  const saved = told.snapshot(), again = createEd();
  assert.equal(validateEdSnapshot(saved), true);
  assert.ok(again.restore(saved) && again.quest === 'exposed' && again.gifts === 1);
  assert.equal(validateEdSnapshot({ ...kept.snapshot(), sober: .5 }), false, 'only an exposed Ed sobers');
  assert.equal(validateEdSnapshot({ ...saved, haunt: 'the moon' }), false);
});

test('talking to Ed: rhymes, the cask once you have seen it, a bottle if you have one, and the grab', () => {
  const ed = createEd(), { log, context } = talker();
  const bag = new Set();
  const talk = () => edConversation({ id: ED.id }, { ...context, ed, inventory: { has: id => bag.has(id) } });
  talk();
  assert.deepEqual(log.acted, ['ed-meet']);
  assert.match(log.opened.lines.join(' '), /long-legs/);
  assert.ok(ids(log).includes('ed-grab') && !ids(log).includes('ed-cask') && !ids(log).includes('ed-gift'));
  ed.meet(); ed.findCask(); bag.add(ATTIC_WINES['bouen-fog-white'].item);
  talk();
  assert.ok(ids(log).includes('ed-cask') && ids(log).includes('ed-gift'));
  log.opened.options.choices.find(choice => choice.id === 'ed-grab').action();
  assert.equal(log.acted.at(-1), 'ed-grab');
});

test('Tancredi Vel tells the truth only to someone who has seen the seal', () => {
  const ed = createEd(), { log, context } = talker();
  const talk = () => secretaryConversation({ id: SECRETARY.id }, { ...context, ed });
  talk();
  assert.match(log.opened.lines.join(' '), /not receiving/);
  assert.ok(!ids(log).includes('ed-show-seal'));
  ed.meet(); ed.findCask();
  talk();
  log.opened.options.choices.find(choice => choice.id === 'ed-show-seal').action();
  assert.ok(log.acted.includes('ed-confront'));
  const truth = log.opened.lines.join(' ');
  for (const clue of [/three old things/, /only when he is drunk/, /Cup-Bearer to the Chameleon/, /finished by supper/]) assert.match(truth, clue);
  assert.deepEqual(ids(log), ['ed-keep', 'ed-expose-ask']);
});

test('Ed’s figure survives any frame step, even the odd first frame’s (it once crashed the game at load)', async () => {
  const { createEdModel } = await sourceModule('../src/chameleon-model.js');
  const ed = createEdModel();
  for (const dt of [NaN, -5, -.01, 0, undefined, 1 / 60, 3]) ed.animate(1, dt);
  for (let k = 0; k < 500; k++) ed.animate(k * .1, -1);
  assert.match(ed.colour, /^[0-9a-f]{6}$/);
});
