import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createInventoryState } from '../src/inventory.js';
import { VASTOS_NPCS } from '../src/vastos-civil-war.js';

const { createVastosHost } = await sourceModule('../src/vastos-host.js');
const { VASTOS_CAMP, VASTOS_POSITIONS } = await sourceModule('../src/vastos-camp.js');

// Only the DOM tree operations used by the host. Quest rules, conversations,
// registration, geometry, markers and their updates are the real game modules.
class DomElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.children = []; this.parentElement = null;
    this.hidden = false; this.id = ''; this.className = ''; this.attributes = new Map(); this.ownText = '';
  }
  append(...nodes) {
    for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); }
  }
  replaceChildren(...nodes) {
    for (const node of this.children) node.parentElement = null;
    this.children = []; this.ownText = ''; this.append(...nodes);
  }
  remove() {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    siblings.splice(siblings.indexOf(this), 1); this.parentElement = null;
  }
  set textContent(value) { this.replaceChildren(); this.ownText = String(value); }
  get textContent() { return this.ownText + this.children.map(node => node.textContent).join(''); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
}

function documentAdapter() {
  const body = new DomElement('body'), journal = new DomElement('div');
  journal.id = 'journal-content'; body.append(journal);
  const find = (node, id) => node.id === id ? node : node.children.map(child => find(child, id)).find(Boolean) ?? null;
  return { body, createElement: tag => new DomElement(tag), getElementById: id => find(body, id) };
}

function fixture(t, { existingCamp = false } = {}) {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const document = documentAdapter();
  Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: document });
  const scene = new THREE.Scene(), retainedObject = new THREE.Group();
  retainedObject.name = 'existing scenery'; scene.add(retainedObject);
  const retainedCollider = { x: 0, z: 0, r: 1 }, retainedNpc = { id: 'existing-npc' };
  const world = {
    heightAt: () => 4,
    regionAt: x => ({ name: x < -1000 ? 'Vastos' : 'Drent' }),
    colliders: [retainedCollider], landmarks: existingCamp ? [{ ...VASTOS_CAMP }] : [],
    npcPositions: { 'existing-npc': { x: 0, z: 0 } },
  };
  let reindexes = 0;
  world.reindexColliders = () => reindexes++;
  const npcData = [retainedNpc], inventory = createInventoryState(), changes = [], toasts = [], tracked = [], dialogues = [];
  let mode = 'playing', busy = false, closed = 0;
  const host = createVastosHost({ scene, world, npcData });
  host.bind({
    inventory,
    canAct: () => ['playing', 'dialogue'].includes(mode) && !busy,
    openDialogue(person, lines, event, leave, options) {
      mode = 'dialogue'; dialogues.push({ person, lines, event, leave, ...options });
    },
    closeDialogue() { mode = 'playing'; closed++; },
    onChange: event => changes.push(event),
    toast: (...args) => toasts.push(args),
    track: id => tracked.push(id),
  });
  t.after(() => {
    host.dispose();
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else delete globalThis.document;
  });
  return {
    host, scene, world, npcData, inventory, changes, toasts, tracked, dialogues, document,
    retainedObject, retainedCollider, retainedNpc,
    hud: document.getElementById('civil-war-hud'), journal: document.getElementById('journal-civil-war-quests'),
    camp: scene.children.find(object => object.userData.vastosCamp),
    markers: () => scene.children.filter(object => object.name === 'quest-marker'),
    tick(observer = VASTOS_CAMP, nextMode = 'playing', nextBusy = false) {
      mode = nextMode; busy = nextBusy; host.frame(1 / 60, observer, mode, busy);
    },
    select(id) {
      const choice = dialogues.at(-1)?.choices.find(option => option.id === id);
      assert.ok(choice, `the actual conversation did not offer ${id}`); choice.action();
    },
    closed: () => closed, reindexes: () => reindexes,
  };
}

function perform(host, actions) {
  for (const action of actions) assert.equal(host.act(action).ok, true, action);
}

test('the actual Vastos host registers its camp, three NPCs, silver site markers and initially hidden UI', t => {
  const f = fixture(t, { existingCamp: true });
  assert.equal(f.world.landmarks.filter(place => place.id === VASTOS_CAMP.id).length, 1, 'existing landmark was duplicated');
  assert.equal(f.npcData[0], f.retainedNpc);
  assert.deepEqual(f.world.npcPositions['existing-npc'], { x: 0, z: 0 });
  for (const person of VASTOS_NPCS) {
    assert.equal(f.npcData.filter(npc => npc.id === person.id).length, 1);
    assert.deepEqual(f.npcData.find(npc => npc.id === person.id), person);
    const at = VASTOS_POSITIONS[person.id];
    assert.deepEqual(f.world.npcPositions[person.id], { x: at.x, z: at.z });
  }
  assert.ok(f.camp instanceof THREE.Group);
  assert.equal(f.camp.parent, f.scene);
  assert.equal(f.host.metrics().cattle, 3);
  assert.equal(f.host.metrics().shelters, 2);
  assert.ok(f.world.colliders.length > 1);
  assert.equal(f.reindexes(), 1);
  assert.equal(f.markers().length, 7);
  assert.ok(f.markers().every(marker => marker.userData.markerKind === 'plot' && !marker.visible));
  assert.deepEqual(f.host.markerIds(), ['vastos-herder']);
  assert.deepEqual(f.host.start, VASTOS_POSITIONS['vastos-herder']);
  assert.equal(f.hud.hidden, true); assert.equal(f.journal.hidden, true);
  assert.equal(f.hud.getAttribute('aria-label'), 'Optional silver quest');
});

test('host map knowledge and journal reveal the giver first, then the recovery sites without the hidden covenant', t => {
  const f = fixture(t);
  assert.deepEqual(f.host.knownLocations(), []);
  const discovered = f.host.knownLocations(true);
  assert.deepEqual(discovered.map(place => place.id), ['vastos-herder']);
  assert.equal(discovered[0].name, 'Mera Rusk');
  f.host.renderJournal(false); assert.equal(f.journal.hidden, true);
  f.host.renderJournal(true); assert.equal(f.journal.hidden, false);
  const giverButton = f.journal.children.find(node => node.tagName === 'BUTTON');
  assert.equal(giverButton.textContent, 'Mark Mera Rusk');
  giverButton.onclick(); assert.deepEqual(f.tracked, ['vastos-herder']);
  assert.equal(f.host.converse(VASTOS_NPCS.find(person => person.id === 'vastos-herder')), true);
  f.select('accept-herd');
  assert.equal(f.host.quest.state().accepted, true);
  assert.equal(f.host.quest.state().heardHerder, true);
  const known = f.host.knownLocations();
  assert.deepEqual(known.map(place => place.id).sort(), [
    'vastos-herder', 'vastos-republican', 'vastos-monarchist',
    'vastos-stray-west', 'vastos-stray-east', 'vastos-stray-ridge', 'vastos-watering',
  ].sort());
  assert.ok(known.every(place => place.kind === 'plot' && Number.isFinite(place.x) && Number.isFinite(place.z)));
  f.host.renderJournal();
  assert.equal(f.journal.hidden, false);
  assert.match(f.journal.textContent, /0\/3/);
  assert.doesNotMatch(f.journal.textContent, /covenant|mediation|third way/i);
  const buttons = f.journal.children.filter(node => node.tagName === 'BUTTON');
  assert.equal(buttons.length, 4);
  for (const button of buttons) button.onclick();
  assert.deepEqual(f.tracked.slice(1).sort(), ['vastos-stray-east', 'vastos-stray-ridge', 'vastos-stray-west', 'vastos-watering']);
  const location = known.find(place => place.id === 'vastos-stray-west'); location.x = 0;
  assert.equal(f.host.knownLocations().find(place => place.id === location.id).x, VASTOS_POSITIONS[location.id].x);
});

test('site markers, site prompts and the optional HUD hide during menus, dialogue, combat and distant travel', t => {
  const f = fixture(t);
  f.tick(); assert.equal(f.hud.hidden, true);
  perform(f.host, ['accept-herd']);
  f.tick(VASTOS_POSITIONS['vastos-stray-west']);
  assert.equal(f.hud.hidden, false);
  assert.match(f.hud.textContent, /The Common Water/);
  assert.equal(f.host.nearby.id, 'vastos-stray-west');
  f.tick();
  assert.equal(f.markers().filter(marker => marker.visible).length, 4);
  assert.ok(f.markers().filter(marker => marker.visible).every(marker => marker.position.y > 6));
  const activeMarkerPositions = f.markers().filter(marker => marker.visible).map(marker => [marker.position.x, marker.position.z]);
  assert.equal(activeMarkerPositions.some(([x, z]) => x === VASTOS_POSITIONS['vastos-covenant'].x && z === VASTOS_POSITIONS['vastos-covenant'].z), false);
  for (const mode of ['dialogue', 'journal', 'pause', 'review', 'ghost', 'opening', 'defeat']) {
    f.tick(VASTOS_POSITIONS['vastos-stray-west'], mode);
    assert.equal(f.hud.hidden, true, mode);
    assert.equal(f.host.nearby, null, mode);
    assert.ok(f.markers().every(marker => !marker.visible), mode);
    assert.equal(f.host.interact(), false, mode);
  }
  f.tick(VASTOS_POSITIONS['vastos-stray-west'], 'playing', true);
  assert.equal(f.hud.hidden, true); assert.equal(f.host.nearby, null);
  assert.ok(f.markers().every(marker => !marker.visible));
  f.tick(); assert.equal(f.hud.hidden, false);
  assert.equal(f.markers().filter(marker => marker.visible).length, 4);
  f.tick({ x: 0, z: 0 });
  assert.equal(f.hud.hidden, true); assert.equal(f.host.nearby, null);
  assert.equal(f.host.metrics().visible, false);
  assert.ok(f.markers().every(marker => !marker.visible));
});

test('actual site dialogue closes before host actions update the herd, HUD and change hook', t => {
  const f = fixture(t), west = VASTOS_POSITIONS['vastos-stray-west'];
  f.tick(west); assert.equal(f.host.interact(), false);
  assert.deepEqual(f.dialogues, []);
  perform(f.host, ['accept-herd']);
  f.tick(west);
  assert.equal(f.host.interact(), true);
  assert.equal(f.dialogues.at(-1).person.name, 'The Common Water');
  assert.equal(f.host.metrics().recovered, 0, 'opening dialogue must not recover the cow');
  f.select('find-stray-west');
  assert.equal(f.closed(), 1);
  assert.equal(f.host.metrics().recovered, 1);
  assert.deepEqual(f.host.quest.state().strays, ['west']);
  assert.equal(f.changes.at(-1).action, 'find-stray-west');
  const cow = f.camp.children.find(object => object.userData.strayId === 'west');
  assert.ok(cow.position.x + VASTOS_CAMP.x > -1405 && cow.position.x + VASTOS_CAMP.x < -1397);
  f.tick(west);
  assert.equal(f.host.nearby, null);
  assert.equal(f.host.interact(), false);
  assert.match(f.hud.textContent, /1\/3/);
  f.tick(VASTOS_POSITIONS['vastos-watering']);
  assert.equal(f.host.interact(), true); f.select('reopen-watering');
  assert.equal(f.host.metrics().wateringOpened, true);
  assert.equal(f.camp.getObjectByName('The opened common trough').visible, true);
  assert.equal(f.camp.getObjectByName('The trough stopper').visible, false);
  f.tick(VASTOS_POSITIONS['vastos-covenant']);
  assert.equal(f.host.interact(), true);
  assert.equal(f.host.knownLocations().some(place => place.id === 'vastos-covenant'), false);
  f.select('read-covenant');
  assert.equal(f.host.knownLocations().some(place => place.id === 'vastos-covenant'), true);
  f.host.renderJournal(); assert.match(f.journal.textContent, /old covenant/i);
});

test('the host action boundary refuses work during combat or menus and reports rule refusals', t => {
  const f = fixture(t), initial = f.host.snapshot();
  for (const [mode, busy] of [['playing', true], ['journal', false], ['pause', false]]) {
    f.tick(VASTOS_CAMP, mode, busy);
    assert.equal(f.host.act('accept-herd').ok, false);
    assert.deepEqual(f.host.snapshot(), initial);
    assert.equal(f.changes.length, 0);
  }
  f.tick(); perform(f.host, ['accept-herd']);
  const accepted = f.host.snapshot();
  assert.equal(f.host.act('settle-camp').ok, false);
  assert.deepEqual(f.host.snapshot(), accepted);
  assert.equal(f.changes.length, 1);
  assert.equal(f.toasts.length, 1); assert.equal(f.toasts[0][1], 'THE COMMON WATER');
  assert.equal(f.host.converse({ id: 'not-from-vastos' }), false);
  assert.deepEqual(f.dialogues, []);
});

test('host restoration resynchronizes real cattle, water and settlement banners without replaying rewards', t => {
  const f = fixture(t);
  perform(f.host, ['accept-herd', 'find-stray-west']);
  const partial = f.host.snapshot();
  perform(f.host, ['find-stray-east', 'find-stray-ridge', 'reopen-watering', 'hear-republican', 'hear-monarchist',
    'choose-monarchist', 'file-levy-manifest', 'settle-camp']);
  const completed = f.host.snapshot();
  assert.equal(f.inventory.count('salt-beef'), 2);
  assert.deepEqual(f.host.metrics().flags, ['monarchist']);
  assert.equal(f.camp.children.find(object => object.userData.outcome === 'monarchist').visible, true);
  const changes = f.changes.length;
  assert.equal(f.host.restore(partial), true);
  assert.equal(f.host.metrics().recovered, 1);
  assert.equal(f.host.metrics().wateringOpened, false);
  assert.deepEqual(f.host.metrics().flags, []);
  assert.equal(f.camp.getObjectByName('The opened common trough').visible, false);
  assert.equal(f.camp.getObjectByName('The trough stopper').visible, true);
  const east = f.camp.children.find(object => object.userData.strayId === 'east');
  assert.ok(Math.hypot(east.position.x + VASTOS_CAMP.x - VASTOS_POSITIONS['vastos-stray-east'].x,
    east.position.z + VASTOS_CAMP.z - VASTOS_POSITIONS['vastos-stray-east'].z) < 2.1);
  f.tick(VASTOS_POSITIONS['vastos-stray-east']); assert.equal(f.host.nearby.id, 'vastos-stray-east');
  assert.equal(f.host.restore(completed), true);
  assert.equal(f.host.nearby, null);
  assert.equal(f.host.metrics().recovered, 3);
  assert.deepEqual(f.host.metrics().flags, ['monarchist']);
  assert.equal(f.host.metrics().wateringOpened, true);
  assert.equal(f.changes.length, changes);
  assert.equal(f.inventory.count('salt-beef'), 2);
  f.host.renderJournal(); assert.match(f.journal.textContent, /A levy with a limit/);
  assert.equal(f.journal.children.some(node => node.tagName === 'BUTTON'), false);
  const metrics = f.host.metrics();
  assert.equal(f.host.restore({ ...completed, outcome: 'republican' }), false);
  assert.deepEqual(f.host.snapshot(), completed);
  assert.deepEqual(f.host.metrics(), metrics);
  assert.equal(f.host.restore(undefined), true);
  assert.equal(f.host.metrics().recovered, 0);
  assert.deepEqual(f.host.metrics().flags, []);
  f.host.renderJournal(); assert.equal(f.journal.hidden, true);
  f.tick(); assert.equal(f.hud.hidden, true);
  assert.equal(f.inventory.count('salt-beef'), 2, 'restoring quest state must not edit saved inventory');
});

test('disposing the host releases its real scene resources, colliders and DOM without touching existing scenery', t => {
  const f = fixture(t), resources = new Set(), disposed = new Set();
  for (const object of f.scene.children.filter(object => object !== f.retainedObject)) object.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.add(material);
  });
  for (const resource of resources) resource.addEventListener('dispose', () => disposed.add(resource));
  assert.ok(resources.size > 20, 'test must observe actual Three geometry and material resources');
  f.host.dispose();
  assert.deepEqual(f.scene.children, [f.retainedObject]);
  assert.deepEqual(f.world.colliders, [f.retainedCollider]);
  assert.equal(f.document.getElementById('civil-war-hud'), null);
  assert.equal(f.document.getElementById('journal-civil-war-quests'), null);
  assert.ok(f.document.getElementById('journal-content'));
  assert.equal(f.host.metrics().disposed, true);
  assert.equal(disposed.size, resources.size);
  assert.equal(f.reindexes(), 2);
  assert.doesNotThrow(() => f.host.dispose());
});
