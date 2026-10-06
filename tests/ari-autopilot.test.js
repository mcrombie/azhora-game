import test from 'node:test';
import assert from 'node:assert/strict';
import { createAriAutopilot } from '../src/gameplay/autoplay/ari-autopilot.js';
import { ARI, ARI_STAND, SUNFLOWER_ROWS } from '../src/content/quests/ari/ari-garden.js';
import { createSunflowerLesson, sunflowerConversation, SUNFLOWER_QUEST_ID, SUNFLOWER_LESSON_XP } from '../src/content/quests/skill-lessons/sunflower-lesson.js';
import { createFarming, CROPS, WATERING_XP, WATERED_GROWTH } from '../src/gameplay/skills/farming/farming.js';
import { farmRowConversation } from '../src/gameplay/skills/farming/farming-conversation.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { BODY, bodyWorld } from '../src/gameplay/combat/bodies.js';
import { moveCharacter } from '../src/gameplay/movement/game-state.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const still = { forward: 0, side: 0, run: false };
const world = () => ({ bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, colliders: [], heightAt: () => 1 });
const base = () => ({ mode: 'playing', position: { x: ARI_STAND.x + 2, z: ARI_STAND.z },
  quest: { stage: 'offered', complete: false }, ari: { ...ARI_STAND, available: true },
  beds: SUNFLOWER_ROWS.map(row => ({ ...row, stage: 'bare', left: 0 })), interaction: { npcId: ARI.id },
  combat: { phase: 'peaceful', action: 'idle', hp: 100 }, riding: { mounted: false }, sneaking: false });
const ticks = (pilot, count) => { for (let i = 0; i < count; i++) pilot.step(.25); };

test('Ari autoplay physically walks, plants, waters, waits for normal growth, harvests and reports through real menus', () => {
  const terrain = world(), navigation = bodyWorld(terrain), inventory = createInventoryState(), skills = createSkills();
  const position = { x: ARI_STAND.x + 2, y: 1, z: ARI_STAND.z };
  let lesson, clock = 0, mode = 'playing', dialogue = null, distance = 0, paused = false, takeover = false;
  const farmEvents = [], choices = [], stages = new Set(), events = [], focused = [];
  const farming = createFarming({ inventory, skills, onEvent: event => { farmEvents.push({ ...event, at: clock }); lesson.farmEvent(event); } });
  lesson = createSunflowerLesson({ inventory, skills, farming, onTrack: id => focused.push(id) });
  const closeDialogue = () => { mode = 'playing'; dialogue = null; };
  const openDialogue = (npc, lines, ignored, label, options = {}) => { mode = 'dialogue'; dialogue = { npc, lines, index: 0, ...options }; };
  const shown = () => dialogue?.index === dialogue?.lines.length - 1 ? dialogue.choices ?? [] : [];
  const context = { farming, inventory, skills, lesson, playSeconds: () => clock, openDialogue, closeDialogue };
  const interaction = () => gap(position, ARI_STAND) < 2.6 ? { npcId: ARI.id }
    : { rowId: SUNFLOWER_ROWS.find(row => gap(position, row) < 2.4)?.id };
  const pilot = createAriAutopilot({ world: navigation,
    read: () => ({ mode, position, quest: lesson.view(clock), beds: SUNFLOWER_ROWS.map(row => farming.rowState(row.id, clock)),
      ari: { ...ARI_STAND, available: true }, interaction: interaction(), combat: { hp: 100, phase: 'peaceful', action: 'idle' },
      dialogue: dialogue && { npcId: dialogue.npc.id, choices: shown().map(c => ({ id: c.id, enabled: !c.disabled })) } }),
    options: { choicePace: .1, dialoguePace: .1, interactEvery: .1 },
    act: {
      interact: () => {
        const prompt = interaction();
        if (prompt.npcId) assert.equal(sunflowerConversation(ARI, context), true);
        else { assert.ok(prompt.rowId, 'F requires a real nearby bed'); assert.equal(farmRowConversation(prompt.rowId, context), true); }
      },
      choose: ({ id }) => {
        const choice = shown().find(c => c.id === id && !c.disabled);
        assert.ok(choice, `only visible enabled choices can be selected: ${id}`); choices.push(id); choice.action();
      },
      continue: () => {
        assert.ok(dialogue && !shown().length);
        if (dialogue.index < dialogue.lines.length - 1) dialogue.index++;
        else { const done = dialogue.onComplete; closeDialogue(); done?.(); }
      },
    } });
  pilot.onEvent(event => events.push(event)); pilot.start();
  for (let i = 0; i < 3000 && pilot.active; i++) {
    const dt = .1, before = { ...position };
    navigation.setBodies([{ id: ARI.id, ...ARI_STAND, r: BODY.person }]).moving(position, BODY.traveler, 'traveler');
    pilot.step(dt);
    if (mode === 'playing') {
      clock += dt;
      const { forward, side, basisYaw = 0 } = pilot.move;
      moveCharacter(position, (-Math.sin(basisYaw) * forward + Math.cos(basisYaw) * side) * 4.2 * dt,
        (-Math.cos(basisYaw) * forward - Math.sin(basisYaw) * side) * 4.2 * dt, navigation);
      const moved = gap(before, position); distance += moved; assert.ok(moved <= .421, 'ordinary walking never teleports');
    }
    const stage = lesson.view(clock).stage; stages.add(stage);
    if (stage === 'growing' && !paused) {
      const bed = farming.rowState(SUNFLOWER_ROWS[0].id, clock), xp = skills.xp('farming');
      mode = 'pause'; ticks(pilot, 1000); assert.ok(pilot.active); assert.deepEqual(pilot.move, still);
      assert.deepEqual(farming.rowState(bed.id, clock), bed); assert.equal(skills.xp('farming'), xp); mode = 'playing'; paused = true;
    }
    if (stage === 'growing' && clock > 10 && !takeover) {
      const saved = lesson.snapshot(), crops = farming.snapshot(), xp = skills.xp('farming');
      pilot.stop('You took control.'); ticks(pilot, 500); assert.equal(pilot.active, false);
      assert.deepEqual(lesson.snapshot(), saved); assert.deepEqual(farming.snapshot(), crops);
      assert.ok(lesson.restore(saved)); assert.ok(farming.restore(crops)); assert.ok(pilot.start());
      assert.equal(skills.xp('farming'), xp); takeover = true;
    }
  }
  assert.ok(lesson.view(clock).complete, JSON.stringify({ intent: pilot.intent, reason: pilot.reason, position, choices, state: lesson.view(clock) }));
  assert.equal(mode, 'playing'); assert.equal(pilot.active, false); assert.equal(events.at(-1).completed, true);
  assert.equal(events.at(-1).questId, SUNFLOWER_QUEST_ID); assert.deepEqual(focused, [SUNFLOWER_QUEST_ID]);
  assert.deepEqual(choices, ['ari-sunflower-accept', 'farm-sow-sunflower', 'farm-water', 'farm-harvest', 'ari-sunflower-report']);
  assert.deepEqual([...stages].filter(s => s !== 'offered'), ['plant', 'water', 'growing', 'harvest', 'report', 'complete']);
  assert.ok(paused && takeover); assert.ok(distance > 4); assert.equal(inventory.count('sunflower'), 3);
  assert.equal(inventory.count('sunflower-seed'), 2); assert.equal(farming.met, false, 'Stanley\'s independent introduction stays available');
  assert.equal(skills.xp('farming'), WATERING_XP + CROPS.sunflower.xp + SUNFLOWER_LESSON_XP);
  const sow = farmEvents.find(e => e.type === 'row-sown'), harvest = farmEvents.find(e => e.type === 'row-reaped');
  assert.ok(harvest.at - sow.at >= CROPS.sunflower.seconds * WATERED_GROWTH, 'the crop ripens on the real active-play clock');
  assert.equal(farmEvents.filter(e => e.type === 'row-watered').length, 1);
  assert.equal(farmEvents.filter(e => e.type === 'row-reaped').length, 1);
});

test('growing progress outlasts the stuck timeout without interacting or advancing the crop', () => {
  const s = base(), calls = []; s.quest = { stage: 'growing', target: SUNFLOWER_ROWS[0] };
  s.beds[0] = { ...s.beds[0], stage: 'sown', watered: true, left: 90 };
  const pilot = createAriAutopilot({ world: world(), read: () => s, options: { idleLimit: 2 }, act: { interact: a => calls.push(a) } });
  pilot.start();
  for (let i = 0; i < 300; i++) { s.beds[0].left -= .25; pilot.step(.25); }
  assert.equal(pilot.active, true); assert.deepEqual(calls, []); assert.deepEqual(pilot.move, still);
  ticks(pilot, 12); assert.equal(pilot.active, false); assert.match(pilot.reason, /could not make progress/);
});

test('unrelated conversations, unavailable Ari, danger, invalid state and disabled replies return control safely', () => {
  for (const failure of ['speaker', 'Ari', 'battle', 'death', 'stage', 'position', 'bed', 'reply']) {
    const s = base(), calls = [];
    if (failure === 'speaker') { s.mode = 'dialogue'; s.dialogue = { npcId: 'someone-else', choices: [] }; }
    if (failure === 'Ari') s.ari.available = false;
    if (failure === 'battle') s.combat.phase = 'active';
    if (failure === 'death') s.combat.hp = 0;
    if (failure === 'stage') s.quest.stage = 'unknown';
    if (failure === 'position') s.position.x = NaN;
    if (failure === 'bed') { s.quest.stage = 'water'; s.beds = []; }
    if (failure === 'reply') { s.mode = 'dialogue'; s.dialogue = { npcId: ARI.id, choices: [{ id: 'ari-sunflower-accept', enabled: false }, { id: 'ari-sunflower-leave' }] }; }
    const pilot = createAriAutopilot({ world: world(), read: () => s, act: { interact: a => calls.push(a), choose: a => calls.push(a) } });
    pilot.start(); ticks(pilot, 10); assert.equal(pilot.active, false, failure); assert.deepEqual(calls, []); assert.deepEqual(pilot.move, still);
  }
});

test('resume follows the planted bed and uses shared seeds only when the ordinary seed choice requires them', () => {
  const s = base(), calls = []; s.mode = 'dialogue'; s.quest = { stage: 'plant', target: SUNFLOWER_ROWS[1] };
  s.dialogue = { npcId: SUNFLOWER_ROWS[1].id, choices: [{ id: 'farm-sow-sunflower', enabled: false }, { id: 'farm-shared-seeds' }] };
  const pilot = createAriAutopilot({ world: world(), read: () => s, act: { choose: a => calls.push(a) } });
  pilot.start(); ticks(pilot, 5); assert.equal(calls.at(-1).id, 'farm-shared-seeds');
  s.mode = 'playing'; s.quest.stage = 'water'; s.interaction = {}; s.beds[1].stage = 'sown';
  assert.equal(pilot.step(.1).targetId, SUNFLOWER_ROWS[1].id);
  s.quest.complete = true; s.quest.stage = 'complete'; s.ari.available = false; pilot.step(.1);
  assert.equal(pilot.active, false); assert.match(pilot.reason, /lesson is complete/);
});
