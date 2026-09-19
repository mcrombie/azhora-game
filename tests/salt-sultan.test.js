import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { JOHN, SALT_PORTS, SALT_PORT_IDS, HULL, STAY, KEEP, SIGHT, PASTA_WATER, sailTime, passage, shipPose,
  createSaltSultan, johnConversation, saltToast, validateSaltSnapshot } from '../src/salt-sultan.js';
import { ED, createEd, edConversation } from '../src/wine-chameleon.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const talker = () => {
  const log = { opened: null, acted: [] };
  return { log, context: { openDialogue: (npc, lines, event, close, options) => { log.opened = { lines, options }; }, closeDialogue() {}, act: action => log.acted.push(action) } };
};
const ids = log => (log.opened.options?.choices ?? []).map(choice => choice.id);
const said = log => log.opened.lines.join(' ');
/** Points over her hull's plan at a pose, narrowing to the bow and stern. */
function hullPoints({ x, z, yaw }) {
  const out = [], c = Math.cos(yaw), s = Math.sin(yaw), L = HULL.length / 2;
  for (let l = -L; l <= L; l += 1) for (let w = -1; w <= 1; w += .5) {
    const half = HULL.beam / 2 * (1 - (l / L) ** 2) * w;
    out.push({ x: x + half * c + l * s, z: z - half * s + l * c });
  }
  return out;
}

test('the Sultana lies in deep water in every port, and comes in over open water all the way', () => {
  for (const port of SALT_PORTS) {
    for (const q of hullPoints(port.ship)) assert.ok(world.heightAt(q.x, q.z) < -HULL.draft - .1, `${port.id}: deep enough under her at ${q.x.toFixed(1)}, ${q.z.toFixed(1)}`);
    const T = sailTime(port);
    for (let t = 0; t <= T; t += T / 60) for (const q of hullPoints(shipPose(port.id, 'arriving', t)))
      assert.ok(world.heightAt(q.x, q.z) < -HULL.draft - .1, `${port.id}: open water coming in, at ${q.x.toFixed(1)}, ${q.z.toFixed(1)}`);
    const berth = shipPose(port.id, 'arriving', T);
    assert.ok(Math.hypot(berth.x - port.ship.x, berth.z - port.ship.z) < .01 && Math.abs(berth.yaw - port.ship.yaw) < .01 && berth.sail === 0, `${port.id}: she ends at her berth, sail brailed up`);
    assert.equal(shipPose(port.id, 'departing', 0).sail, 0);
    assert.ok(shipPose(port.id, 'departing', T).sail === 1 && Math.hypot(shipPose(port.id, 'departing', T).x - port.route[0].x, shipPose(port.id, 'departing', T).z - port.route[0].z) < .01, `${port.id}: she goes out the way she came`);
    // Her open-water end is out in the haze, not in plain sight of the quay.
    assert.ok(Math.hypot(port.route[0].x - port.stand.x, port.route[0].z - port.stand.z) > 200, `${port.id}: she comes in from well out`);
  }
});

test('John stands on each quay, in its own region, clear of everyone else', () => {
  for (const port of SALT_PORTS) {
    assert.equal(world.regionAt(port.stand.x, port.stand.z)?.name, port.region, port.id);
    assert.ok(canStand(port.stand.x, port.stand.z, world, .3), `${port.id}: he has room`);
    assert.ok(world.heightAt(port.stand.x, port.stand.z) > 1.5, `${port.id}: on the deck of the quay, not in the water`);
    for (const [id, home] of Object.entries(world.npcPositions)) if (id !== JOHN.id) assert.ok(Math.hypot(home.x - port.stand.x, home.z - port.stand.z) > 4, `${port.id}: clear of ${id}`);
  }
});

test('she goes round the four ports in turn, stays while the traveler is with John, and is seen coming and going', () => {
  const salt = createSaltSultan();
  assert.equal(salt.phase, 'at-sea'); assert.equal(salt.port.id, 'tidehaven'); assert.equal(salt.pose(), null, 'at sea, nobody sees her');
  const events = [], far = { x: 5000, z: 5000 };
  const run = (seconds, traveler) => { for (let t = 0; t < seconds; t++) events.push(...salt.update(1, traveler)); };
  const stand = SALT_PORTS[0].stand;
  run(2000, { x: stand.x, z: stand.z });
  assert.deepEqual(events.slice(0, 3).map(e => e.type), ['sighted', 'moored', 'heard']);
  assert.equal(salt.phase, 'moored', 'she does not sail while the traveler is standing with him');
  assert.ok(salt.ashore && salt.inPort('tidehaven'));
  run(1, { x: stand.x + KEEP + 5, z: stand.z });
  assert.equal(salt.phase, 'departing', 'she sails when the traveler steps away');
  events.length = 0;
  const order = [];
  for (let t = 0; t < 20000 && order.length < 5; t++) for (const e of salt.update(1, far)) if (e.type === 'moored') order.push(e.port.id);
  assert.deepEqual(order, ['cobble', 'izolveth', 'solis', 'tidehaven', 'cobble']);
  for (const [a, b] of [['tidehaven', 'cobble'], ['cobble', 'izolveth'], ['izolveth', 'solis'], ['solis', 'tidehaven']]) assert.ok(passage(a, b) >= 150 && passage(a, b) <= 480);
  // Nobody far off sees or hears her.
  const quiet = createSaltSultan(); const heard = [];
  for (let t = 0; t < 5000; t++) heard.push(...quiet.update(1, far).filter(e => ['sighted', 'heard', 'putting-out'].includes(e.type)));
  assert.deepEqual(heard, []);
  assert.ok(STAY >= 300 && SIGHT > 200);
  for (const type of ['sighted', 'heard', 'putting-out']) assert.ok(saltToast({ type, port: SALT_PORTS[0], next: SALT_PORTS[1] }).line.length > 20);
  assert.match(saltToast({ type: 'heard', port: SALT_PORTS[0] }).line, /That’s pasta water!/);
});

test('she is saved where she is, and a save that makes no sense is refused', () => {
  const salt = createSaltSultan({ start: { port: 'solis', phase: 'moored', clock: 12 } });
  salt.meet(); salt.visit(); salt.tellOfEd();
  const saved = salt.snapshot(), again = createSaltSultan();
  assert.equal(validateSaltSnapshot(saved), true);
  assert.ok(again.restore(saved));
  assert.deepEqual(again.snapshot(), saved);
  assert.ok(again.inPort('solis') && again.edTold);
  assert.equal(validateSaltSnapshot(undefined), true);
  for (const bad of [{ ...saved, port: 'nylon' }, { ...saved, phase: 'sunk' }, { ...saved, clock: -1 }, { ...saved, met: false }, { ...saved, visits: 1.5 }])
    assert.equal(validateSaltSnapshot(bad), false, JSON.stringify(bad));
  assert.deepEqual(SALT_PORT_IDS, ['tidehaven', 'cobble', 'izolveth', 'solis']);
});

test('John: the Sultan of the Salt Trade, the sea is pasta water, and Ed is his Chief Taster (we’ll see)', () => {
  const salt = createSaltSultan({ start: { port: 'cobble' } }), { log, context } = talker();
  const talk = () => johnConversation({ id: JOHN.id }, { ...context, salt });
  talk();
  assert.deepEqual(log.acted, ['john-meet']);
  assert.ok(log.opened.lines.includes(PASTA_WATER)); assert.match(said(log), /Sultan of the Salt Trade/); assert.match(said(log), /edge of the quay/);
  assert.deepEqual(ids(log), ['john-sultan', 'john-pasta', 'john-crew', 'john-bound', 'leave-john']);
  salt.meet();
  log.opened.options.choices.find(c => c.id === 'john-crew').action();
  assert.deepEqual(log.acted, ['john-meet', 'john-ed']);
  assert.match(said(log), /Chief Taster/); assert.match(said(log), /Ed/); assert.match(said(log), /We’ll see/);
  salt.tellOfEd(); talk();
  assert.ok(ids(log).includes('john-ed-good'));
  log.opened.options.choices.find(c => c.id === 'john-ed-good').action();
  assert.match(said(log), /salt a trout/);
  talk(); log.opened.options.choices.find(c => c.id === 'john-bound').action();
  assert.match(said(log), /Izolveth next/);
  const tide = createSaltSultan({ start: { port: 'tidehaven' } });
  johnConversation({ id: JOHN.id }, { ...context, salt: tide });
  assert.match(said(log), /edge of the pier/);
  assert.equal(johnConversation({ id: 'somebody' }, { ...context, salt }), false);
});

test('Ed knows who he works for, and panics about the accounts when the Sultana is in at Solis', () => {
  const ed = createEd(), { log, context } = talker();
  ed.meet();
  edConversation({ id: ED.id }, { ...context, ed });
  assert.ok(!ids(log).includes('ed-john'), 'no word of John to a traveler who has not met him');
  const salt = createSaltSultan({ start: { port: 'solis' } }); salt.meet();
  edConversation({ id: ED.id }, { ...context, ed, salt });
  assert.match(log.opened.lines[0], /The Sultan’s in!/);
  log.opened.options.choices.find(c => c.id === 'ed-john').action();
  assert.match(said(log), /Chief Taster to the Sultan of Salt/); assert.match(said(log), /pasta water/);
  const away = createSaltSultan({ start: { port: 'cobble' } }); away.meet();
  edConversation({ id: ED.id }, { ...context, ed, salt: away });
  assert.doesNotMatch(log.opened.lines[0], /Sultan/, 'only when he is in');
});

test('the figures: John in his turban, and the Sultana setting and brailing her sail', async () => {
  const { createJohn, createSultana } = await sourceModule('../src/salt-ship.js');
  const { createCharacter } = await sourceModule('../src/characters.js');
  const size = group => new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  const john = createJohn(), plain = createCharacter({ role: 'mercenary', tunic: 0x777777 });
  assert.ok(size(john.group).y > size(plain.group).y + .05, 'a head taller for the turban');
  assert.ok(john.group.getObjectByName('Head'));
  const ship = createSultana();
  ship.update(0, { sail: 0, moving: false });
  const brailed = size(ship.group);
  ship.update(1, { sail: 1, moving: true });
  const set = size(ship.group);
  assert.ok(brailed.z > HULL.length * .9 && brailed.y > 9, 'a ship, with a mast');
  let sail = null; ship.group.traverse(o => { if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.height > 4) sail = o; });
  assert.ok(sail?.visible, 'the sail is set under way');
  ship.update(2, { sail: 0, moving: false });
  assert.equal(sail.visible, false, 'and brailed up in port');
  assert.ok(set.y >= brailed.y - .5);
});
