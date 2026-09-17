import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FERRY_FARE, FERRY_NPC, FERRY_LANDINGS, FERRY_SCENE, FERRY_VERSION, FERRY_CAPTIONS,
  createFerry, ferryConversation, validateFerrySnapshot,
} from '../src/ferry.js';
import { COPPER_ITEM, STARTING_PURSE } from '../src/economy.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';

/** A ferry with a purse, a place to stand and a record of everything the scene asked for. */
function harness({ purse = STARTING_PURSE, free = false, charges = false, mounted = false, at = FERRY_LANDINGS.drent.ashore } = {}) {
  const log = { veil: [], boat: [], placed: [], stands: [], toasts: [], saves: 0, modes: [], carried: [] };
  const state = { purse, mode: 'playing', position: { x: at.x, z: at.z } };
  const ferry = createFerry({
    purse: () => state.purse,
    pay: n => { if (state.purse < n) return false; state.purse -= n; return true; },
    free: () => free,
    charges: () => charges,
    mounted: () => mounted,
    position: () => state.position,
    // The veil as it stood in the frame the traveler was moved: nothing may be seen to happen.
    place: (x, z, yaw) => { state.position = { x, z }; log.placed.push({ x, z, yaw, veil: log.veil.at(-1)?.value ?? 0 }); },
    carry: (x, z) => log.carried.push({ x, z }),
    setMode: value => { state.mode = value; log.modes.push(value); },
    veil: (value, caption) => log.veil.push({ value, caption }),
    boat: (x, z, yaw) => log.boat.push({ x, z, yaw }),
    stand: (side, point) => log.stands.push({ side, point }),
    save: () => { log.saves++; },
    toast: (text, kicker) => log.toasts.push({ text, kicker }),
  });
  const run = seconds => { for (let t = 0; t < seconds; t += 1 / 60) ferry.frame(1 / 60); };
  return { ferry, state, log, run };
}

test('Corran Sell waits at Tidehaven’s landing and carries anyone who asks', () => {
  assert.equal(FERRY_FARE, 3);
  assert.ok(FERRY_FARE * 2 < STARTING_PURSE / 2, 'the traveler lands with the fare for several return trips');
  assert.equal(FERRY_NPC.id, 'boatman');
  // He stands at the seaward end of Tidehaven's pier, by his own boat, and far
  // enough out that he is not in the traveler's way as they step ashore.
  assert.ok(Math.hypot(FERRY_LANDINGS.drent.stand.x - 25, FERRY_LANDINGS.drent.stand.z - 29) < 8);
  assert.ok(Math.hypot(FERRY_LANDINGS.drent.stand.x - 23, FERRY_LANDINGS.drent.stand.z - 29) > 3.4, 'clear of the arrival');
  const { ferry, log } = harness();
  ferry.settle();
  assert.equal(ferry.state.side, 'drent');
  assert.deepEqual(log.stands.at(-1).point, FERRY_LANDINGS.drent.stand);
  assert.deepEqual(log.boat.at(-1), { ...FERRY_LANDINGS.drent.mooring, yaw: FERRY_LANDINGS.drent.mooring.yaw });
  const offer = ferry.offer();
  assert.equal(offer.ok, true);
  assert.equal(offer.fare, 0, 'the crossing is free while the islands are young');
  assert.equal(offer.free, true);
});

test('An empty purse still crosses while the crossing is free', () => {
  const empty = harness({ purse: 0 });
  assert.equal(empty.ferry.offer().ok, true);
  assert.equal(empty.ferry.board().ok, true);
  assert.equal(empty.state.purse, 0, 'and it costs nothing');
});

test('With a fare asked, it is taken once and a traveler without it is refused', () => {
  const { ferry, state } = harness({ purse: 4, charges: true });
  assert.equal(ferry.board().ok, true);
  assert.equal(state.purse, 1, 'three copper, once');
  const poor = harness({ purse: 2, charges: true });
  const refused = poor.ferry.offer();
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /3 copper/);
  assert.equal(poor.ferry.board().ok, false);
  assert.equal(poor.state.purse, 2, 'a refused crossing costs nothing');
  assert.equal(poor.state.mode, 'playing');
});

test('Testing crosses free even when a fare is asked', () => {
  const { ferry, state } = harness({ purse: 0, free: true, charges: true });
  assert.equal(ferry.fare, 0);
  const offer = ferry.offer();
  assert.equal(offer.ok, true);
  assert.equal(offer.free, true);
  assert.equal(ferry.board().ok, true);
  assert.equal(state.purse, 0);
  const paying = harness({ purse: 0, charges: true });
  assert.equal(paying.ferry.fare, FERRY_FARE);
  assert.equal(paying.ferry.offer().ok, false, 'an empty purse stays ashore when nobody is testing');
});

test('The horse does not come on the boat, and he says so himself', () => {
  const { ferry, state } = harness({ mounted: true });
  const offer = ferry.offer();
  assert.equal(offer.ok, false);
  assert.match(offer.reason, /horse/i);
  assert.equal(ferry.board().ok, false);
  assert.equal(state.purse, STARTING_PURSE);
  let spoken = null;
  ferryConversation({ ...FERRY_NPC }, { ferry, openDialogue: (npc, lines) => { spoken = lines; }, closeDialogue: () => {} });
  assert.match(spoken.at(-1), /horse/i, 'the refusal is spoken, not only a greyed-out choice');
});

test('The crossing is a scene: the boat pulls out, the view fades, and the traveler steps onto the far quay', () => {
  const { ferry, state, log, run } = harness();
  assert.equal(ferry.board().ok, true);
  assert.equal(state.mode, 'ferry', 'the traveler is not walking while the boat is out');
  // It pulls away from the mooring before the screen goes dark.
  run(FERRY_SCENE.veilFrom + .55);
  assert.equal(log.veil.at(-1).value > 0 && log.veil.at(-1).value < 1, true);
  const pulledOut = log.boat.at(-1), mooring = FERRY_LANDINGS.drent.mooring;
  assert.ok(Math.hypot(pulledOut.x - mooring.x, pulledOut.z - mooring.z) > 1.2, 'the boat has left the quay');
  assert.ok(log.carried.length > 5 && ferry.state.crossing, 'the traveler is in the boat, not on the water');
  assert.equal(log.placed.length, 0, 'and has not been set down yet');
  // The traveler is set ashore while the screen is black, so no save can be taken on the water.
  run(FERRY_SCENE.out - FERRY_SCENE.veilFrom + .2);
  const landed = log.placed.at(-1);
  assert.deepEqual({ x: landed.x, z: landed.z }, { x: FERRY_LANDINGS.peblos.ashore.x, z: FERRY_LANDINGS.peblos.ashore.z });
  assert.equal(landed.veil, 1, 'the screen is black at the moment the traveler moves');
  assert.equal(log.saves, 1, 'the road is saved on the far quay');
  assert.deepEqual(log.stands.at(-1), { side: 'peblos', point: FERRY_LANDINGS.peblos.stand });
  assert.equal(log.veil.some(frame => frame.caption === FERRY_CAPTIONS.peblos), true);
  // And the traveler has the road back when it clears.
  run(FERRY_SCENE.done);
  assert.equal(state.mode, 'playing');
  assert.equal(ferry.state.crossing, false);
  assert.equal(ferry.state.side, 'peblos');
  assert.equal(ferry.state.crossings, 1);
  assert.equal(log.veil.at(-1).value, 0);
  assert.match(log.toasts.at(-1).kicker, /PEBLOS/);
  assert.ok(FERRY_SCENE.done < 6, 'a short scene, not a sailing sim');
});

test('He brings the traveler back, and waits on the shore they are on', () => {
  const { ferry, state, log, run } = harness({ charges: true });
  ferry.board(); run(FERRY_SCENE.done + .2);
  assert.equal(state.purse, STARTING_PURSE - FERRY_FARE);
  assert.equal(ferry.state.side, 'peblos');
  // Back again.
  const home = ferry.board();
  assert.equal(home.ok, true);
  assert.equal(home.to, 'drent');
  assert.equal(state.purse, STARTING_PURSE - FERRY_FARE * 2, 'the same fare in either direction');
  run(FERRY_SCENE.done + .2);
  assert.equal(ferry.state.side, 'drent');
  assert.equal(ferry.state.crossings, 2);
  assert.deepEqual({ x: log.placed.at(-1).x, z: log.placed.at(-1).z }, { x: FERRY_LANDINGS.drent.ashore.x, z: FERRY_LANDINGS.drent.ashore.z });
  assert.deepEqual(log.stands.at(-1), { side: 'drent', point: FERRY_LANDINGS.drent.stand });
  // He follows the traveler's shore, even when they got there another way.
  state.position = { x: FERRY_LANDINGS.peblos.ashore.x, z: FERRY_LANDINGS.peblos.ashore.z };
  assert.equal(ferry.settle(), 'peblos');
  assert.deepEqual(log.stands.at(-1).point, FERRY_LANDINGS.peblos.stand);
  assert.equal(log.boat.at(-1).x, FERRY_LANDINGS.peblos.mooring.x);
});

test('His conversation offers the crossing and says plainly why it cannot happen', () => {
  const open = () => { let opened = null;
    return { get value() { return opened; }, openDialogue: (npc, lines, event, action, options) => { opened = { npc, lines, action, options }; }, closeDialogue: () => {} }; };
  const free = harness(), freeBox = open();
  ferryConversation({ ...FERRY_NPC }, { ferry: free.ferry, openDialogue: freeBox.openDialogue, closeDialogue: freeBox.closeDialogue });
  const freeBoard = freeBox.value.options.choices.find(choice => choice.id === 'board-ferry');
  assert.equal(freeBoard.enabled, true);
  assert.doesNotMatch(freeBoard.label, /copper/, 'nothing is asked for while the crossing is free');
  const rich = harness({ charges: true }), box = open();
  let acted = null;
  ferryConversation({ ...FERRY_NPC }, { ferry: rich.ferry, openDialogue: box.openDialogue, closeDialogue: box.closeDialogue, act: result => { acted = result; } });
  const board = box.value.options.choices.find(choice => choice.id === 'board-ferry');
  assert.equal(board.enabled, true);
  assert.match(board.label, /3 copper/);
  assert.match(box.value.lines.join(' '), /Corran Sell/);
  assert.match(box.value.lines.join(' '), /Cobble/);
  board.action();
  assert.equal(acted.ok, true);
  assert.equal(rich.state.mode, 'ferry');
  // Short of the fare, the choice is there and greyed, with the reason on it.
  const poor = harness({ purse: 1, charges: true }), poorBox = open();
  ferryConversation({ ...FERRY_NPC }, { ferry: poor.ferry, openDialogue: poorBox.openDialogue, closeDialogue: poorBox.closeDialogue });
  const blocked = poorBox.value.options.choices.find(choice => choice.id === 'board-ferry');
  assert.equal(blocked.enabled, false);
  assert.match(blocked.reason, /copper/);
  // Free while testing, and it says so.
  const dev = harness({ purse: 0, free: true, charges: true }), devBox = open();
  ferryConversation({ ...FERRY_NPC }, { ferry: dev.ferry, openDialogue: devBox.openDialogue, closeDialogue: devBox.closeDialogue });
  assert.match(devBox.value.options.choices[0].label, /Peblos/);
  // On the island he offers the way home.
  const away = harness({ at: FERRY_LANDINGS.peblos.ashore }), awayBox = open();
  away.ferry.settle();
  ferryConversation({ ...FERRY_NPC }, { ferry: away.ferry, openDialogue: awayBox.openDialogue, closeDialogue: awayBox.closeDialogue });
  assert.match(awayBox.value.options.choices[0].label, /Tidehaven/);
});

test('The crossing is saved with the road, on either side, and nonsense is refused', () => {
  const { ferry, run } = harness();
  ferry.board(); run(FERRY_SCENE.done + .2);
  const snapshot = ferry.snapshot();
  assert.deepEqual(snapshot, { version: FERRY_VERSION, crossings: 1, met: true });
  assert.equal(validateFerrySnapshot(snapshot), true);
  assert.equal(validateFerrySnapshot(undefined), true, 'a save from before the boat existed still loads');
  assert.equal(validateFerrySnapshot({ version: 99, crossings: 1, met: true }), false);
  assert.equal(validateFerrySnapshot({ version: FERRY_VERSION, crossings: -1, met: true }), false);
  assert.equal(validateFerrySnapshot({ version: FERRY_VERSION, crossings: 1 }), false);
  const restored = harness().ferry;
  assert.equal(restored.restore(snapshot), true);
  assert.equal(restored.state.crossings, 1);
  assert.equal(restored.restore({ nonsense: true }), false);
  assert.equal(restored.state.crossings, 0, 'a refused save leaves the boat where it was');

  // A whole checkpoint taken on Cobble's quay, and one taken back at the pier.
  const storage = new Map();
  const checkpoint = createRoadCheckpoint({ storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
  const inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.add(id, 1);
  inventory.add(COPPER_ITEM, STARTING_PURSE - FERRY_FARE);
  const weapons = createWeapons({ inventory });
  const journey = createJourney({ inventory, weapons });
  journey.start();
  const save = position => checkpoint.save({
    version: 1, worldScale: 100, questStage: 10, journey: journey.snapshot(),
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
    weapons: weapons.snapshot(), journeyGathered: [], meadowCleared: false, heardDoom: false,
    position, woodland: { version: 1, acornStatus: 'available', practiceHits: 2, practiceDodges: 1, acorns: [], sticks: [], fruits: [], discoveries: [],
      camp: { version: 1, taught: false, catches: 0, fires: {} } },
    ferry: snapshot,
  });
  for (const position of [{ x: FERRY_LANDINGS.peblos.ashore.x, z: FERRY_LANDINGS.peblos.ashore.z },
    { x: FERRY_LANDINGS.drent.ashore.x, z: FERRY_LANDINGS.drent.ashore.z }]) {
    const written = save(position);
    assert.equal(written.ok, true, written.reason);
    const read = checkpoint.read();
    assert.equal(read.ok, true, read.reason);
    assert.deepEqual(read.data.ferry, snapshot);
    assert.deepEqual(read.data.position, position);
  }
  const broken = save({ x: FERRY_LANDINGS.peblos.ashore.x, z: FERRY_LANDINGS.peblos.ashore.z });
  assert.equal(broken.ok, true);
  assert.equal(checkpoint.save({ ...JSON.parse(JSON.stringify(broken.data)), ferry: { version: 1, crossings: 'many', met: true } }).ok, false);
});
