import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { ALEX, ALEX_STEP, ALEX_DOOR, ALEX_BOUT_ID, ALEX_HEALTH, ALEX_LINES, CAGNEY_AT_HOME, FLIRT_LABEL, alexPresence, alexBout } from '../src/content/quests/roadside/alex.js';
import { createAlexHost } from '../src/content/quests/roadside/alex-host.js';
import { createCagneyHost } from '../src/content/quests/cagney/cagney-host.js';
import { createCagneyQuest, CAGNEY } from '../src/content/quests/cagney/cagney-quest.js';
import { CAGNEY_RESIDENCE } from '../src/content/quests/homes/quest-homes.js';
import { createCombat, ENEMY_KINDS } from '../src/gameplay/combat/combat.js';
import { OWN_IDS } from '../src/content/characters/cast.js';

/**
 * Alex, who lives with Cagney (the user, 26 September 2026): short brown hair and green glasses;
 * out of the door with Cagney when you knock, once the Cagney quest is done; and if you flirt
 * with Cagney, she beats you up - in a bout, which nobody dies of.
 */
const rgb = hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

test('Alex: short brown hair, green glasses, and in the cast', () => {
  assert.equal(ALEX.name, 'Alex');
  assert.equal(ALEX.look.hairStyle, 'bob', 'short hair: a bob to the earlobe');
  const [r, g, b] = rgb(ALEX.look.hair);
  assert.ok(r > g && g > b && r < 140, 'brown');
  assert.equal(ALEX.look.glasses, true);
  const [gr, gg, gb] = rgb(ALEX.look.glassesColor);
  assert.ok(gg > gr * 1.5 && gg > gb * 1.3, 'green frames');
  assert.equal(ALEX.look.beard, false); assert.equal(ALEX.look.slight, true);
  assert.ok(OWN_IDS.includes(ALEX.id), 'she is in the world');
});

test('her glasses are drawn green', async () => {
  const { createCharacter } = await sourceModule('../src/content/characters/characters.js');
  const actor = createCharacter({ role: ALEX.modelRole, tunic: ALEX.color, look: ALEX.look });
  // The rig merges its static parts into vertex-coloured meshes after building, so the frames are
  // looked for by their colour in the vertices, in either colour space.
  const THREE = await import('../vendor/three.module.js');
  const want = new THREE.Color(ALEX.look.glassesColor), srgb = [(ALEX.look.glassesColor >> 16 & 255) / 255, (ALEX.look.glassesColor >> 8 & 255) / 255, (ALEX.look.glassesColor & 255) / 255];
  const near = (r, g, b, [x, y, z]) => Math.abs(r - x) < .015 && Math.abs(g - y) < .015 && Math.abs(b - z) < .015;
  let specs = false, green = false;
  actor.group.traverse(node => {
    if (node.name === 'Spectacles') specs = true;
    const colour = node.geometry?.attributes?.color;
    if (colour) for (let i = 0; i < colour.count && !green; i++) {
      const r = colour.getX(i), g = colour.getY(i), b = colour.getZ(i);
      if (near(r, g, b, [want.r, want.g, want.b]) || near(r, g, b, srgb)) green = true;
    }
  });
  assert.ok(specs, 'she wears spectacles');
  assert.ok(green, 'and their frames are green');
});

test('she is out only after the knock, beside Cagney, and in again with her', () => {
  const cagney = phase => ({ phase });
  assert.equal(alexPresence(false, { questComplete: false, cagney: cagney('outside') }).out, false, 'not before the quest is done');
  assert.equal(alexPresence(false, { questComplete: true, cagney: null }).out, false);
  assert.equal(alexPresence(false, { questComplete: true, cagney: cagney('walking') }).out, false, 'Cagney walking home for the first time is on her own');
  assert.equal(alexPresence(false, { questComplete: true, cagney: cagney('inside') }).out, false);
  const knocked = alexPresence(false, { questComplete: true, cagney: cagney('coming-out') });
  assert.equal(knocked.out, true); assert.deepEqual(knocked.target, ALEX_STEP);
  assert.equal(alexPresence(true, { questComplete: true, cagney: cagney('outside') }).out, true);
  const goingIn = alexPresence(true, { questComplete: true, cagney: cagney('walking') });
  assert.equal(goingIn.out, true); assert.deepEqual(goingIn.target, ALEX_DOOR, 'back in behind her');
  assert.equal(alexPresence(true, { questComplete: true, cagney: cagney('inside') }).out, false);
  // A pace and a bit to Cagney's side on the step, and not on top of the mailbox.
  const beside = Math.hypot(ALEX_STEP.x - CAGNEY_RESIDENCE.porch.x, ALEX_STEP.z - CAGNEY_RESIDENCE.porch.z);
  assert.ok(beside > 1.2 && beside < 1.6);
  assert.ok(Math.hypot(ALEX_STEP.x - CAGNEY_RESIDENCE.mailbox.x, ALEX_STEP.z - CAGNEY_RESIDENCE.mailbox.z) > 1.5);
});

test('her fight is a bout, with her fists, at her own strength', () => {
  const spec = alexBout({ x: 0, z: 0 }, { x: 1.5, z: 1 });
  assert.equal(spec.id, ALEX_BOUT_ID); assert.equal(spec.bout, true);
  const [her] = spec.enemies;
  assert.equal(her.kind, 'brawler'); assert.equal(her.armed, false); assert.equal(her.npcId, ALEX.id);
  assert.equal(ENEMY_KINDS.brawler.fixedStats, true);
  const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, colliders: [], heightAt: () => 1, regionAt: () => ({ name: 'Elagos' }), npcPositions: {} };
  const combat = createCombat({ world, position: { x: 0, y: 1, z: 0 } });
  assert.ok(combat.startEncounter({ ...spec, level: 3 }));
  const enemy = combat.state.enemies[0];
  assert.equal(enemy.kind, 'brawler'); assert.equal(enemy.armed, false);
  assert.equal(enemy.maxHp ?? enemy.hp, ALEX_HEALTH, 'the country does not change how hard she is to put down');
});

function fixture() {
  const events = [], dialogues = [], started = [];
  let residentPhase = null, complete = true, current = null;
  const actor = () => ({ group: { position: { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } }, rotation: { y: 0 } } });
  const npc = { id: ALEX.id, hidden: true, actor: actor() }, cagneyNpc = { id: CAGNEY.id, actor: actor() };
  cagneyNpc.actor.group.position.set(CAGNEY_RESIDENCE.porch.x, 1, CAGNEY_RESIDENCE.porch.z);
  const world = { heightAt: () => 1, npcPositions: {} };
  const player = { group: { position: { x: CAGNEY_RESIDENCE.porch.x + 2, y: 1, z: CAGNEY_RESIDENCE.porch.z + 2 } } };
  const combat = { state: { phase: 'peaceful' }, startEncounter(spec) { started.push(spec); this.state = { phase: 'active', encounterId: spec.id }; return true; } };
  const open = (who, lines, _a, _b, options = {}) => { current = { who: who.id, lines, options }; dialogues.push(current); };
  const host = createAlexHost({ npc, cagney: cagneyNpc, world, combat, player,
    homeResidents: { state: () => residentPhase ? { phase: residentPhase } : null }, questComplete: () => complete,
    crime: { isDown: () => false }, corpses: { ownsNpc: () => false },
    toast: (...x) => events.push(x), openDialogue: open, closeDialogue: () => { current = null; } });
  const advance = () => { const on = current?.options.onComplete; if (on) on(); };
  return { npc, host, events, dialogues, started, combat, advance, set phase(p) { residentPhase = p; }, set complete(c) { complete = c; }, get current() { return current; } };
}

test('knock, and Cagney comes out with Alex; flirt, and Alex puts her fists up', () => {
  const f = fixture();
  f.phase = 'inside'; f.host.frame(.1, true);
  assert.equal(f.npc.hidden, true, 'indoors until the knock');
  f.phase = 'coming-out'; f.host.frame(.1, true);
  assert.equal(f.npc.hidden, false, 'out with Cagney');
  assert.ok(f.events.some(([text]) => /Cagney comes to the door, and Alex with her/.test(text)));
  // Cagney's step, with Alex on it: the house's words, and the choice.
  const home = f.host.cagneyAtHome();
  assert.deepEqual(home.lines, [...CAGNEY_AT_HOME.greeting]);
  const flirt = home.choices.find(choice => choice.label === FLIRT_LABEL);
  flirt.action();
  assert.equal(f.current.who, CAGNEY.id); assert.deepEqual(f.current.lines, [...CAGNEY_AT_HOME.flirted]);
  f.advance();
  assert.equal(f.current.who, ALEX.id); assert.deepEqual(f.current.lines, [...ALEX_LINES.stepIn]);
  f.advance();
  assert.equal(f.started.length, 1, 'she starts the fight');
  assert.equal(f.started[0].id, ALEX_BOUT_ID); assert.equal(f.started[0].bout, true);
  // She wins (the bout's `teacher`), and says so; then Cagney does.
  f.host.boutOver('teacher');
  assert.equal(f.current.who, ALEX.id); assert.deepEqual(f.current.lines, [...ALEX_LINES.won]);
  f.advance();
  assert.equal(f.current.who, CAGNEY.id); assert.deepEqual(f.current.lines, [...CAGNEY_AT_HOME.alexWon]);
  // Talk to her again and she is wary.
  f.host.conversation({ id: ALEX.id });
  assert.deepEqual(f.current.lines, [...ALEX_LINES.wary]);
  // Cagney back inside, and Alex with her.
  f.phase = 'walking'; f.host.frame(.1, true); assert.equal(f.npc.hidden, false);
  f.phase = 'inside'; f.host.frame(.1, true); assert.equal(f.npc.hidden, true);
  assert.equal(f.host.cagneyAtHome(), null, 'with Alex indoors, Cagney speaks for herself');
});

test('the traveler can win it, and nobody is told otherwise', () => {
  const f = fixture();
  f.phase = 'coming-out'; f.host.frame(.1, true);
  f.host.boutOver('traveler');
  assert.deepEqual(f.current.lines, [...ALEX_LINES.lost]);
  f.advance();
  assert.deepEqual(f.current.lines, [...CAGNEY_AT_HOME.alexLost]);
});

test('Cagney, home with Alex beside her, offers the flirt; without Alex she does not', () => {
  const quest = createCagneyQuest();
  quest.restore({ version: 1, stage: 'complete', ambushCleared: true, hp: 85, enemies: [0, 0, 0],
    walk: { x: CAGNEY_RESIDENCE.porch.x, z: CAGNEY_RESIDENCE.porch.z, waypoint: 0, waiting: false } });
  let home = null, shown = null;
  const host = createCagneyHost({ quest, npc: { id: CAGNEY.id, actor: { group: { position: { x: 0, z: 0, set() {} } } } }, world: { heightAt: () => 0, npcPositions: {} },
    combat: { state: { phase: 'peaceful' } }, player: { group: { position: { x: 0, z: 0 } } }, crime: { isDown: () => false }, corpses: { ownsNpc: () => false },
    toast() {}, refresh() {}, save() {}, openDialogue: (...args) => { shown = args; }, closeDialogue() {}, reward() {}, focus() {}, atHome: () => home });
  host.conversation({ id: CAGNEY.id });
  assert.ok(!shown[4].choices.some(choice => choice.label === FLIRT_LABEL), 'nobody to flirt in front of');
  home = { lines: ['home'], choices: [{ id: 'cagney-flirt', label: FLIRT_LABEL, action() {} }] };
  host.conversation({ id: CAGNEY.id });
  assert.deepEqual(shown[1], ['home']);
  assert.ok(shown[4].choices.some(choice => choice.label === FLIRT_LABEL));
});
