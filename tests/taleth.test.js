import test from 'node:test';
import assert from 'node:assert/strict';
import { TALETH, TALETH_TOPICS, TALETH_CHARGE, TALETH_LATER, TALETH_MEASURE, TALETH_TEACHES, SOUND_THE_SOIL_LESSON,
  TALETH_DIVIDING, TALETH_AFTER_DIVIDING, talethConversation, talethGreeting } from '../src/taleth.js';
import { MINORA_START, FREE_ROAM_GUIDANCE } from '../src/minora-opening.js';
import { MENORA_BUILDINGS, MENORA_CAMP, inMenora, menoraRiverClearance } from '../src/menora-city.js';
import { SPELLS } from '../src/sorcery.js';
import { sourceModule } from './module-loader.js';

const { createCharacter } = await sourceModule('../src/characters.js');
const tower = MENORA_BUILDINGS.find(building => building.id === 'menora-sorcerers-guild');
const clearOfBuildings = point => [...MENORA_BUILDINGS, ...MENORA_CAMP.tents]
  .every(b => Math.abs(point.x - b.x) > b.width / 2 + 1 || Math.abs(point.z - b.z) > b.depth / 2 + 1);

test('the start is the forecourt of the Guild tower, facing its door, with the camera low enough to show the tower', () => {
  // The user, 5 October 2026: Rollo starts "right outside of that Sorcerer's Tower in Menora".
  assert.ok(tower, 'the tower is where the city puts it');
  assert.deepEqual({ ...MINORA_START }, { x: -2414, z: 63, yaw: 0, pitch: 0.15 });
  assert.ok(inMenora(MINORA_START.x, MINORA_START.z), 'inside the walls');
  assert.ok(Math.abs(MINORA_START.x - tower.x) < tower.width / 2, 'square in front of the tower');
  const face = tower.z + tower.depth / 2;
  assert.ok(MINORA_START.z > face + 1 && MINORA_START.z < face + 13, 'on the forecourt south of its door');
  assert.ok(clearOfBuildings(MINORA_START) && menoraRiverClearance(MINORA_START.x, MINORA_START.z) > 4, 'clear of every wall and the water');
  // Yaw 0 walks north (-z): straight at the door.
  const forward = { x: -Math.sin(MINORA_START.yaw), z: -Math.cos(MINORA_START.yaw) }, door = { x: tower.x, z: face };
  const dx = door.x - MINORA_START.x, dz = door.z - MINORA_START.z;
  assert.ok((forward.x * dx + forward.z * dz) / Math.hypot(dx, dz) > 0.9999, 'facing the door');
  assert.ok(MINORA_START.pitch > 0.1 && MINORA_START.pitch < 0.2, 'tipped low, so the tower rises over him');
  assert.equal(FREE_ROAM_GUIDANCE.title, 'Speak with the Master Sorcerer');
  assert.match(FREE_ROAM_GUIDANCE.detail, /Taleth/);
  assert.deepEqual([...FREE_ROAM_GUIDANCE.destinationIds], [TALETH.id]);
});

test('Taleth stands a few steps ahead of the start and to its right, turned to face it, on clear ground', () => {
  assert.equal(TALETH.id, 'taleth');
  assert.equal(TALETH.name, 'Taleth');
  assert.equal(TALETH.role, 'Master Sorcerer of the Guild');
  assert.equal(TALETH.essential, true);
  const ahead = MINORA_START.z - TALETH.z, right = TALETH.x - MINORA_START.x, apart = Math.hypot(ahead, right);
  assert.ok(ahead > 2 && right > 2 && apart < 10, `ahead ${ahead} m and right ${right} m`);
  // A figure at rotation y faces (sin y, cos y); he looks at where the player stands.
  const toStart = Math.atan2(MINORA_START.x - TALETH.x, MINORA_START.z - TALETH.z);
  assert.ok(Math.abs(toStart - TALETH.yaw) < 0.05, 'turned to face the start');
  assert.ok(inMenora(TALETH.x, TALETH.z) && clearOfBuildings(TALETH), 'inside the walls and a metre clear of every building');
  assert.ok(menoraRiverClearance(TALETH.x, TALETH.z) > 4, 'and well clear of the water');
});

test('Taleth is drawn very old and bare-headed, with a long white beard, white hair to the shoulder and a midnight-blue robe', () => {
  const look = TALETH.look;
  assert.equal(look.headgear, 'bare', 'no hat: the question was asked and not answered');
  assert.equal(TALETH.hat, false); assert.equal(look.hat, undefined);
  assert.equal(look.facialHair, 'long'); assert.equal(look.hairStyle, 'lank'); assert.equal(look.garment, 'robe');
  const channel = (hex, shift) => (hex >> shift) & 0xff;
  assert.ok([16, 8, 0].every(shift => channel(look.hair, shift) > 0xdc), 'white hair and beard');
  assert.ok(channel(TALETH.color, 0) > channel(TALETH.color, 16) && channel(TALETH.color, 0) < 0x60, 'a dark blue');
  const actor = createCharacter({ role: TALETH.modelRole, tunic: TALETH.color, skin: TALETH.skin, look });
  for (const name of ['mercenary-headgear-bare', 'mercenary-beard-long', 'mercenary-hair-lank', 'mercenary-garment-robe'])
    assert.ok(actor.group.getObjectByName(name), `drawn with ${name}`);
  assert.equal(actor.group.getObjectByName('Raised hood'), undefined, 'bare-headed');
  let draws = 0, triangles = 0;
  actor.group.traverse(object => { if (object.isMesh) { draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; } });
  assert.ok(draws <= 18 && triangles < 4200, `inside a civilian's budget: ${draws} draws, ${Math.round(triangles)} triangles`);
});

/** A dialogue box that records what it was asked to show, and lets a test press its buttons. */
function host({ accepted = false, twoStep = true, acceptAnswer = true, known = false, playerId = 'rollo', extra = null } = {}) {
  const shown = [], calls = [], toasts = [];
  let taken = accepted;
  const farmlands = { offer: () => { calls.push('offer'); return twoStep ? true : (taken = true); }, accepted: () => taken, get stage() { return taken ? 'accepted' : 'unmet'; } };
  if (twoStep) farmlands.accept = () => { calls.push('accept'); if (acceptAnswer) taken = true; return acceptAnswer; };
  const learnt = new Set(known ? [TALETH_TEACHES] : []);
  const magic = { known: id => learnt.has(id), learn: id => { calls.push(`learn:${id}`); learnt.add(id); return { ok: true, first: true, id }; } };
  const context = { farmlands, magic, playerId, notify: (text, title) => toasts.push([title, text]), onChange: () => calls.push('save'),
    openDialogue: (npc, lines, event, action, options = {}) => shown.push({ npc, lines, action, options }), closeDialogue: () => calls.push('close'),
    ...(extra ? { extraChoices: extra } : {}) };
  const last = () => shown.at(-1);
  const press = id => { const choice = last().options.choices.find(entry => entry.id === id); assert.ok(choice, `offered ${id}`); choice.action(); };
  const finish = () => last().options.onComplete();
  return { context, shown, calls, toasts, last, press, finish, magic, farmlands };
}

test('Taleth talks about the Guild, the river, the war and sorcery, and every topic comes back to him', () => {
  const h = host();
  assert.equal(talethConversation({ id: 'ben-sorcerer' }, h.context), false, 'he answers for nobody else');
  assert.equal(talethConversation(TALETH, h.context), true);
  const ids = h.last().options.choices.map(choice => choice.id);
  // The Dividing joined the locked topics with Build 5 (6 October 2026).
  assert.deepEqual(ids, ['taleth-guild', 'taleth-river', 'taleth-war', 'taleth-sorcery', 'taleth-charge', 'taleth-dividing', 'taleth-second-charge', 'taleth-third-charge', 'taleth-leave']);
  for (const topic of TALETH_TOPICS) {
    talethConversation(TALETH, h.context);
    h.press(topic.id);
    assert.deepEqual(h.last().lines, [...topic.lines]);
    assert.equal(h.last().action, 'Back to Taleth');
    h.finish();
    assert.equal(h.last().options.choices[0].id, 'taleth-guild', `${topic.id} returns to his topics`);
  }
  h.press('taleth-leave');
  assert.ok(h.calls.includes('close'));
  assert.deepEqual(h.calls.filter(call => call !== 'close'), [], 'talking is free: nothing taught, saved or offered');
});

test('the Dividing and the later charges are shown locked, with a reason, and do nothing', () => {
  const h = host();
  talethConversation(TALETH, h.context);
  const locked = h.last().options.choices.filter(choice => choice.disabled);
  assert.deepEqual(locked.map(choice => choice.id), [TALETH_DIVIDING.id, ...TALETH_LATER.map(later => later.id)]);
  for (const choice of locked) { assert.ok(choice.reason.length > 20, 'it says why'); assert.match(choice.label, /locked/); }
});

test('the war is told as the user ruled it, and the Guild measures the river for the river, not for the crown', () => {
  const war = TALETH_TOPICS.find(topic => topic.id === 'taleth-war').lines.join(' ');
  for (const word of ['Cedric', 'Wilhelm', 'Muster Gate', 'League', 'Caricas', 'Nethereum', 'Ovesos', 'Nesdor', 'Willard'])
    assert.ok(war.includes(word), `the war names ${word}`);
  assert.match(war, /The Guild measures the river for the river, not for the crown/);
  assert.match(war, /a man from Minora is a man from Cedric’s city until he proves otherwise/);
  const all = [...TALETH_TOPICS.flatMap(topic => topic.lines), ...TALETH_CHARGE, ...TALETH_MEASURE, ...SOUND_THE_SOIL_LESSON].join(' ');
  assert.doesNotMatch(all, /undead|Thalmagar|vassal/i, 'Wilhelm’s secret stays his');
  const sorcery = TALETH_TOPICS.find(topic => topic.id === 'taleth-sorcery').lines.join(' ');
  assert.match(sorcery, /I will not teach fire/);
  assert.match(sorcery, /Ben teaches it in Nothom/, 'Ben stays the only one who teaches fire');
  assert.match(sorcery, /Frost and wards nobody teaches/, 'and the user’s ruling on Frost and Wards stands');
});

test('taking the charge of the Lizeem farmlands teaches Sound the Soil, once', () => {
  const h = host();
  talethConversation(TALETH, h.context);
  h.press('taleth-charge');
  assert.deepEqual(h.last().lines, [...TALETH_CHARGE]);
  assert.deepEqual(h.calls, ['offer', 'save'], 'hearing the charge puts it, and does not take it');
  h.press('taleth-not-yet');
  assert.equal(h.last().options.choices.some(choice => choice.id === 'taleth-charge'), true, 'not yet leaves it waiting');
  h.press('taleth-charge');
  h.press('taleth-take-charge');
  assert.deepEqual(h.calls.slice(-3), ['accept', `learn:${TALETH_TEACHES}`, 'save']);
  assert.deepEqual(h.last().lines, [...SOUND_THE_SOIL_LESSON]);
  assert.match(h.last().lines.join(' '), /rolls into a cord and breaks/, 'the farmer’s test from the lore');
  assert.equal(SPELLS[TALETH_TEACHES].name, 'Sound the Soil');
  h.finish();
  // Taken: the charge is now talked about, not offered, and nothing is taught twice.
  const ids = h.last().options.choices.map(choice => choice.id);
  assert.ok(ids.includes('taleth-measure') && !ids.includes('taleth-charge'));
  assert.equal(h.last().lines[0], talethGreeting({ playerId: 'rollo', accepted: true })[0]);
  h.press('taleth-measure');
  assert.deepEqual(h.last().lines, [...TALETH_MEASURE]);
  assert.equal(h.calls.filter(call => call.startsWith('learn:')).length, 1, 'taught once');
});

test('a charge that cannot be taken teaches nothing, and a lost lesson is given back to a save that took it', () => {
  const refused = host({ acceptAnswer: false });
  talethConversation(TALETH, refused.context);
  refused.press('taleth-charge'); refused.press('taleth-take-charge');
  assert.equal(refused.calls.some(call => call.startsWith('learn:')), false);
  assert.equal(refused.toasts.length, 1);
  assert.equal(refused.last().options.choices[0].id, 'taleth-guild', 'back to his topics');
  // A quest with no separate acceptance takes the charge with `offer()`.
  const oneStep = host({ twoStep: false });
  talethConversation(TALETH, oneStep.context);
  oneStep.press('taleth-charge');
  assert.deepEqual(oneStep.calls, [], 'hearing it takes nothing');
  oneStep.press('taleth-take-charge');
  assert.deepEqual(oneStep.calls, ['offer', `learn:${TALETH_TEACHES}`, 'save']);
  // Taken in an older save without the spell: asking about the Measure teaches it back, quietly.
  const lost = host({ accepted: true });
  talethConversation(TALETH, lost.context);
  lost.press('taleth-measure');
  assert.deepEqual(lost.calls, [`learn:${TALETH_TEACHES}`, 'save']);
  const kept = host({ accepted: true, known: true });
  talethConversation(TALETH, kept.context);
  kept.press('taleth-measure');
  assert.deepEqual(kept.calls, []);
});

test('the quest can add its own business to his topics, ahead of the locked charges', () => {
  let asked = null;
  const h = host({ accepted: true, known: true, extra: (npc, back) => { asked = { npc, back }; return [{ id: 'lizeem-deliver-tart', label: 'Give Taleth the sealed tart', action: () => back() }, { label: 'not a choice' }]; } });
  talethConversation(TALETH, h.context);
  const ids = h.last().options.choices.map(choice => choice.id);
  assert.deepEqual(ids.slice(-5), ['lizeem-deliver-tart', 'taleth-dividing', 'taleth-second-charge', 'taleth-third-charge', 'taleth-leave']);
  assert.equal(asked.npc, TALETH);
  h.press('lizeem-deliver-tart');
  assert.equal(h.last().options.choices[0].id, 'taleth-guild', 'and it is handed his way back');
});

test('he answers the first question before it is asked, and calls Rollo by name and nobody else', () => {
  const rollo = talethGreeting({ playerId: 'rollo' }), stranger = talethGreeting({ playerId: 'cromb' });
  assert.match(rollo[0], /You were about to ask/);
  assert.match(stranger[0], /You were about to ask/);
  assert.ok(rollo.join(' ').includes('Rollo'));
  assert.ok(!stranger.join(' ').includes('Rollo'));
  assert.match(stranger.join(' '), /I am Taleth, Master Sorcerer of the Guild/);
  assert.ok(talethGreeting({ playerId: 'rollo', accepted: true })[0].startsWith('Rollo.'));
  const h = host({ playerId: () => 'cromb' });
  talethConversation(TALETH, h.context);
  assert.deepEqual(h.last().lines, stranger, 'the player can be asked for, not only told');
});

test('the Dividing opens when its own choice is handed in, and once it is held the later charges come after it, not yet written', () => {
  // Build 5 (6 October 2026): src/dividing.js hands in a choice with the locked topic's id, which takes its place.
  let opened = 0;
  const open = host({ accepted: true, known: true, extra: () => [{ id: TALETH_DIVIDING.id, label: 'The Dividing', action: () => opened++ }] });
  talethConversation(TALETH, open.context);
  const dividing = open.last().options.choices.filter(choice => choice.id === TALETH_DIVIDING.id);
  assert.equal(dividing.length, 1, 'one Dividing, not a locked one beside the open one');
  assert.equal(dividing[0].disabled, undefined);
  open.press(TALETH_DIVIDING.id);
  assert.equal(opened, 1, 'and pressing it is the Dividing’s business');
  // Not yet held: the later charges keep their own reasons.
  talethConversation(TALETH, { ...open.context, dividing: { held: () => false } });
  assert.deepEqual(open.last().options.choices.filter(choice => TALETH_LATER.some(later => later.id === choice.id)).map(choice => choice.reason),
    TALETH_LATER.map(later => later.reason));
  // Held: both are still locked, and say they come after the Dividing and are not yet written.
  talethConversation(TALETH, { ...open.context, dividing: { held: () => true } });
  const later = open.last().options.choices.filter(choice => TALETH_LATER.some(entry => entry.id === choice.id));
  assert.equal(later.length, 2);
  for (const choice of later) { assert.equal(choice.disabled, true); assert.equal(choice.reason, TALETH_AFTER_DIVIDING); }
  assert.match(TALETH_AFTER_DIVIDING, /^After the Dividing: not yet written/);
  assert.match(open.last().lines[0], /^Rollo\. Walker of the Measure/, 'and he greets the walker as one');
});
