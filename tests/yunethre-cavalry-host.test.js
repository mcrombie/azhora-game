import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE = await sourceModule('../vendor/three.module.js');
const {createYunethreHost} = await sourceModule('../src/content/chapters/yunethre/host.js');
const {initialYunethre, BATTLE_START, BATTLE_END} = await sourceModule('../src/content/chapters/yunethre/chapter.js');
const {CHAPTER_LOCATIONS} = await sourceModule('../src/content/chapters/yunethre/locations.js');
const {CENTAUR_BATTLEFIELD: FIELD} = await sourceModule('../src/content/regions/minora-frontier/centaur-camp-layout.js');
const {openYunethreCavalry} = await sourceModule('../src/content/chapters/yunethre/cavalry-view.js');

// Native layout belongs to the desktop check. Here real host + real encounter
// lifecycle run over a small DOM/flat terrain, with no world construction or GPU.
class Element {
  constructor(tag = 'div') {this.tagName = tag.toUpperCase(); this.children = []; this.parts = new Map(); this.dataset = {}; this.style = {}; this.hidden = false;}
  append(...children) {this.children.push(...children);}
  setAttribute() {}
  querySelector(key) {if (!this.parts.has(key)) this.parts.set(key, new Element()); return this.parts.get(key);}
  querySelectorAll() {return this.children;}
  replaceChildren(...children) {this.children = children;}
  click() {this.onclick?.();}
  focus() {document.activeElement = this;}
  closest() {return this.tagName === 'BUTTON' ? this : null;}
  remove() {}
}
function fixture(t) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document'), raf = globalThis.requestAnimationFrame, ids = new Map();
  globalThis.document = {body: new Element('body'), createElement: tag => new Element(tag), getElementById(id) {
    if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id);
  }};
  globalThis.requestAnimationFrame = fn => fn();
  let mode = 'playing', listener = null; const launches = [], notices = [], views = [], commands = [];
  const position = new THREE.Vector3(FIELD.approach.x, 10, FIELD.approach.z), scene = new THREE.Group();
  const world = {heightAt: () => 10, waterAt: () => 0, readyAt: () => true, regionAt: () => ({id: 38}), nearColliders: () => [], colliders: [],
    bounds: {minX: -100000, maxX: 100000, minZ: -100000, maxZ: 100000}};
  const host = createYunethreHost({saved: {chapter: initialYunethre(), history: null}, scene, world, position,
    towerState: () => ({inside: false, room: null}), mode: () => mode, setMode: value => {mode = value;},
    transition: async () => true, map: {setSimulation() {}, setRegionScope() {}}, onDirty() {}, notice: text => notices.push(text),
    onBattle(options) {launches.push(options); listener?.(options);}});
  function command(c) {commands.push(c); return host.command(c);}
  function open(side, {refuse = false, watch = false} = {}) {
    const actor = {group: new THREE.Group(), animate() {}, setWeapon() {}, setArmed() {}};
    let starts = 0, ends = 0;
    const view = openYunethreCavalry({scene, world, actor, position, keys: new Set(), yaw: () => 0, centre: FIELD, side, mounted: true, watch,
      onStart() {starts++; if (refuse) return false; return host.state().battle.joined === side || command({type: 'join', side}).ok;},
      onEnd(outcome) {ends++; assert.equal(command({type: 'battle-result', result: outcome.result}).ok, true);}});
    views.push(view); return {view, counts: () => ({starts, ends})};
  }
  t.after(() => {for (const view of views) view.dispose(); host.dispose(); globalThis.requestAnimationFrame = raf;
    if (old) Object.defineProperty(globalThis, 'document', old); else delete globalThis.document;});
  return {host, position, commands, command, launches, notices, open, onBattle(fn) {listener = fn;}};
}

test('the battlefield marker opens a choice; merely reading or cancelling it does not join', t => {
  const f = fixture(t), {host} = f;
  f.command({type: 'brief'}); f.command({type: 'depart'});
  assert.equal(host.developerBattle(), true); assert.equal(host.state().elapsed, BATTLE_START);
  assert.equal(host.navigation().id, 'battle'); assert.equal(host.mapMarks()[0].name, 'Battlefield');
  assert.equal(host.interact(), true); assert.deepEqual(host.conversation().actions, ['fight-centaurs', 'fight-celder', 'close']);
  assert.equal(host.choose('close'), true); assert.equal(host.state().battle.joined, null); assert.deepEqual(f.launches, []);
  host.interact(); assert.equal(host.choose('fight-centaurs'), true); assert.deepEqual(f.launches, [{side: 'centaurs'}]);
  assert.equal(host.state().battle.joined, null, 'Launching the review screen is not commitment');
  assert.equal(host.choose('fight-centaurs'), false, 'The closed dialogue cannot repeat a launch');
});

test('peace before the deadline suppresses battle entry and cannot be replaced by a developer battle', t => {
  const f = fixture(t), {host} = f;
  for (const c of [{type: 'brief'}, {type: 'depart'}, {type: 'visit', place: 'town'},
    {type: 'visit', place: 'centaurs'}, {type: 'compact', side: 'centaurs'}, {type: 'visit', place: 'celder'}, {type: 'compact', side: 'celder'}])
    assert.equal(f.command(c).ok, true);
  const saved = host.state(); assert.equal(saved.battle.status, 'averted'); assert.equal(saved.centaurProtection, true);
  assert.equal(host.developerBattle(), false); assert.deepEqual(host.state(), saved); assert.notEqual(host.navigation().id, 'battle');
  host.interact(); assert.ok(!host.conversation()?.actions.some(action => action.startsWith('fight-'))); assert.deepEqual(f.launches, []);
});

test('the real view commits only on start, holds campaign time, reports actual damage and sends one result', t => {
  const f = fixture(t), {host} = f;
  f.command({type: 'brief'}); f.command({type: 'depart'}); host.developerBattle();
  let opened; f.onBattle(({side}) => {opened = f.open(side);}); host.interact(); host.choose('fight-centaurs');
  assert.equal(host.state().battle.joined, null); const {view} = opened;
  view.tick(.1, true); assert.equal(view.snapshot().time, 0, 'The briefing is paused');
  view.start(); view.start(); assert.deepEqual(opened.counts(), {starts: 1, ends: 0});
  assert.equal(host.state().battle.joined, 'centaurs'); assert.equal(host.state().celderHostile, true);
  const elapsed = host.state().elapsed; host.tick(.5, true, .5); assert.equal(host.state().elapsed, elapsed);
  while (view.snapshot().hero.hp === 100 && view.snapshot().time < 130 && !view.snapshot().outcome) view.tick(.1, true);
  assert.ok(view.snapshot().hero.hp < 100, 'The real renderer/controller runs physical combat, not only a countdown');
  assert.equal(host.state().battle.status, 'active', 'A hit is not a campaign defeat');
  view.withdraw(); view.withdraw(); assert.deepEqual(opened.counts(), {starts: 1, ends: 1});
  assert.equal(f.commands.filter(c => c.type === 'join').length, 1); assert.equal(f.commands.filter(c => c.type === 'battle-result').length, 1);
  const after = host.state(); assert.equal(after.battle.winner, 'celder'); assert.equal(after.laketown, 'autonomous'); assert.equal(after.celderAlliance, false);
  assert.equal(after.elapsed, elapsed); assert.equal(after.events.filter(e => e.type === 'battle-celder').length, 1);
});

test('Celder field victory leaves Laketown autonomous, and a restored joined battle does not join twice', t => {
  const f = fixture(t), {host} = f;
  f.command({type: 'brief'}); f.command({type: 'depart'}); host.developerBattle(); f.command({type: 'join', side: 'celder'});
  const save = host.save(null, null, null); host.restore(save);
  host.interact(); assert.deepEqual(host.conversation().actions, ['fight-celder', 'close']); host.choose('close');
  const {view, counts} = f.open('celder', {watch: true}); view.start();
  while (!view.snapshot().outcome && view.snapshot().time < 181) view.tick(.1, true);
  assert.equal(view.snapshot().outcome.result, 'victory'); assert.deepEqual(counts(), {starts: 1, ends: 1});
  assert.equal(f.commands.filter(c => c.type === 'join').length, 1, 'The saved commitment is reused');
  const after = host.state(); assert.equal(after.battle.winner, 'celder'); assert.equal(after.laketown, 'autonomous');
  assert.equal(after.celderAlliance, false); assert.equal(after.aftermathVisited, false); assert.equal(after.centaurProtection, false);
});

test('refusing the actual start signal leaves the view paused and the campaign uncommitted', t => {
  const f = fixture(t); f.command({type: 'brief'}); f.command({type: 'depart'}); f.host.developerBattle();
  const {view, counts} = f.open('centaurs', {refuse: true}); view.start(); view.tick(.2, true);
  assert.equal(view.snapshot().started, false); assert.equal(view.snapshot().paused, true); assert.equal(view.snapshot().time, 0);
  assert.equal(f.host.state().battle.joined, null); assert.deepEqual(counts(), {starts: 1, ends: 0});
});

for (const result of ['victory', 'defeat']) test(`Rowan acknowledges a Celder ${result} without offering forbidden accession`, t => {
  const f = fixture(t), {host} = f;
  for (const c of [{type: 'brief'}, {type: 'depart'}, {type: 'advance', seconds: BATTLE_START},
    {type: 'join', side: 'celder'}, {type: 'battle-result', result}]) assert.equal(f.command(c).ok, true);
  f.position.set(CHAPTER_LOCATIONS.town.x, 10, CHAPTER_LOCATIONS.town.z);
  assert.equal(host.meeting('town'), true); const conversation = host.conversation();
  assert.match(conversation.text, /You fought/); assert.doesNotMatch(conversation.text, /You did not fight|We can now discuss membership|still require a commitment/);
  assert.deepEqual(conversation.actions, ['decline', 'close']); assert.equal(host.choose('join'), false);
  assert.equal(host.state().laketown, 'autonomous'); assert.equal(host.state().celderAlliance, false);
  assert.equal(host.choose('decline'), true); assert.equal(host.state().laketown, 'declined');
  assert.equal(host.state().aftermathVisited, true); assert.equal(host.journal().active.id, 'return');
  if (result === 'defeat') {
    host.choose('close'); f.position.set(CHAPTER_LOCATIONS.centaurs.x, 10, CHAPTER_LOCATIONS.centaurs.z);
    assert.equal(host.meeting('centaurs'), true); assert.ok(!host.conversation().actions.includes('protect'));
    assert.match(host.conversation().text, /will not accept a protection agreement/);
  }
});

test('a centaur victory acknowledges the earned protection and offers the valid council decision', t => {
  const f = fixture(t), {host} = f;
  for (const c of [{type: 'brief'}, {type: 'depart'}, {type: 'advance', seconds: BATTLE_START},
    {type: 'join', side: 'centaurs'}, {type: 'battle-result', result: 'victory'}]) assert.equal(f.command(c).ok, true);
  f.position.set(CHAPTER_LOCATIONS.town.x, 10, CHAPTER_LOCATIONS.town.z); assert.equal(host.meeting('town'), true);
  assert.match(host.conversation().text, /your protection is recorded/); assert.ok(host.conversation().actions.includes('join'));
  assert.equal(host.choose('join'), true); assert.equal(host.state().laketown, 'league'); assert.equal(host.state().celderAlliance, false);
});

test('an unattended Celder victory preserves the independent council accession route', t => {
  const f = fixture(t), {host} = f;
  let chapter;
  for (let seed = 0; seed < 100; seed++) {
    const saved = {chapter: initialYunethre({seed: Math.imul(seed + 1, 2654435761) >>> 0}), history: null}; host.restore(saved);
    for (const c of [{type: 'brief'}, {type: 'depart'}, {type: 'advance', seconds: BATTLE_END}]) assert.equal(f.command(c).ok, true);
    chapter = host.state(); if (chapter.battle.winner === 'celder') break;
  }
  assert.equal(chapter.battle.winner, 'celder'); assert.equal(chapter.battle.joined, null);
  f.position.set(CHAPTER_LOCATIONS.town.x, 10, CHAPTER_LOCATIONS.town.z); assert.equal(host.meeting('town'), true);
  assert.match(host.conversation().text, /You did not fight for Celder/); assert.ok(host.conversation().actions.includes('join'));
  assert.equal(host.choose('join'), true); assert.equal(host.state().laketown, 'league'); assert.equal(host.state().celderAlliance, false);
});
