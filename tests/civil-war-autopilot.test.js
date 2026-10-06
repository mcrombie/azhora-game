import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrentAutopilot, createLusciaCivilAutopilot } from '../src/content/chapters/civil-war/civil-war-autopilot.js';
import { createDrentHost } from '../src/content/regions/drent/drent-host.js';
import { DRENT_SITES, DRENT_NPCS } from '../src/content/regions/drent/drent-sites.js';
import { INSTRUCTOR_STAND } from '../src/gameplay/skills/instructor.js';
import { createLusciaCivilWarHost, LUSCIA_RECRUIT_NPCS, LUSCIA_RECRUIT_POSITIONS } from '../src/content/chapters/civil-war/luscia-civil-war-host.js';
import { createLivingStory } from '../src/gameplay/company/living-story.js';
import { createLusciaChapter } from '../src/content/chapters/civil-war/luscia-chapter.js';
import { createCampaign } from '../src/content/chapters/civil-war/campaign.js';
import { createBorderChapter } from '../src/content/chapters/chapter-one/border-chapter.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { createCombat } from '../src/gameplay/combat/combat.js';
import { createCrimeHost } from '../src/gameplay/law/crime-host.js';
import { moveCharacter } from '../src/gameplay/movement/game-state.js';
import { stepToward } from '../src/gameplay/combat/bodies.js';
import { LOCOMOTION } from '../src/gameplay/movement/locomotion-skills.js';
const novice={walking:LOCOMOTION.walkStart,running:LOCOMOTION.runStart};
const mastered={walking:LOCOMOTION.walkCap,running:LOCOMOTION.runCap};

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const terrain = () => ({ bounds: { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 },
  colliders: [], paths: [], heightAt: () => 1.5, npcPositions: {} });
const actor = at => ({ group: { position: { ...at, y: 1.5, set(x, y, z) { Object.assign(this, { x, y, z }); } }, rotation: { y: 0 } } });
const pace = { dialoguePace: .1, choicePace: .1, interactEvery: .1 };

function dialogueDriver() {
  let mode = 'playing', shown = null;
  const chosen = [], speakers = [];
  const closeDialogue = () => { mode = 'playing'; shown = null; };
  const visible = () => shown?.index === shown?.lines.length - 1 ? shown.choices ?? [] : [];
  return {
    openDialogue(npc, lines, _a, _b, options = {}) {
      mode = 'dialogue'; shown = { npc, lines, index: 0, ...options }; speakers.push(npc.id);
    }, closeDialogue, chosen, speakers,
    read: () => ({ mode, dialogue: shown && { npcId: shown.npc.id, choices: visible().map(({ id }) => ({ id })) } }),
    actions: {
      continue() { assert.ok(shown); if (shown.index < shown.lines.length - 1) shown.index++; else closeDialogue(); },
      choose({ id }) { const choice = visible().find(choice => choice.id === id); assert.ok(choice, `ordinary visible choice ${id}`); chosen.push(id); choice.action(); },
    },
  };
}

function advance(pilot, position, world, dt, movementSpeeds=novice) {
  const { forward, side, basisYaw = pilot.yaw ?? 0, run } = pilot.move, speed = run ? movementSpeeds.running : movementSpeeds.walking;
  const before = { ...position };
  moveCharacter(position, (-Math.sin(basisYaw) * forward + Math.cos(basisYaw) * side) * speed * dt,
    (-Math.cos(basisYaw) * forward - Math.sin(basisYaw) * side) * speed * dt, world);
  assert.ok(gap(before, position) <= speed * dt + 1e-7, 'the pilot only produces ordinary movement');
  return gap(before, position);
}

test('Drent autoplay walks the real host investigation, keeps the papers sealed, follows Glun and reports real combat', () => {
  const world = terrain(), inventory = createInventoryState(), skills = createSkills(), dialogue = dialogueDriver();
  inventory.refresh = () => {};
  const npcById = new Map([{ id: 'instructor', name: 'Officer Glun' }, ...DRENT_NPCS].map(n => {
    const at = n.id === 'instructor' ? INSTRUCTOR_STAND : n.id === 'killian' ? DRENT_SITES.killian : DRENT_SITES.guardWest;
    world.npcPositions[n.id] = { ...at }; return [n.id, { ...n, actor: actor(at) }];
  }));
  const position = { x: INSTRUCTOR_STAND.x + 2, z: INSTRUCTOR_STAND.z, y: 1.5 }, events = [], stopEvents = [];
  const combat = createCombat({ world, position, onEvent: e => events.push(e) });
  const host = createDrentHost({ world, npcById, inventory, skills, combat, position: () => position,
    mode: () => dialogue.read().mode, trained: () => true, ...dialogue,
    toast() {}, onChange() {}, onTrack() {}, getTracked: () => 'civil-war-drent', stopAutoplay() {} });
  host.act('defeat-ambush');
  const nearby = () => [...npcById.values()].filter(n => !n.hidden && gap(position, n.actor.group.position) < 2.6)
    .sort((a, b) => gap(position, a.actor.group.position) - gap(position, b.actor.group.position))[0];
  const read = () => ({ ...dialogue.read(), position: { ...position }, quest: host.state(),
    people: Object.fromEntries([...npcById].map(([id, n]) => [id, { ...n.actor.group.position, available: !n.hidden }])),
    sites: { 'drent-rebel-camp': DRENT_SITES.evidence }, interaction: { npcId: nearby()?.id, siteId: host.nearby?.id },
    combat: { ...combat.state.player, phase: combat.state.phase, encounterId: combat.state.encounterId,
      enemies: combat.state.enemies, hasShield: true }, weapon: { usable: true } });
  const pilot = createDrentAutopilot({ world, read, options: pace, act: { ...dialogue.actions,
    interact() { if (host.nearby) assert.equal(host.interact(), true); else assert.equal(host.converse(nearby()), true); },
    attack: ({ yaw }) => combat.attack(yaw), dodge: direction => combat.dodge(direction),
  } });
  pilot.onEvent(e => { if (e.type === 'stop') stopEvents.push(e); }); pilot.start();
  let walked = 0;
  for (let frame = 0; frame < 36000 && pilot.active; frame++) {
    const dt = 1 / 60, playing = dialogue.read().mode === 'playing';
    host.frame(dt, { playing });
    if (playing) for (const n of npcById.values()) if (n.escorting) stepToward(n.actor.group.position, world.npcPositions[n.id], 3.1 * dt, world);
    pilot.step(dt);
    if (dialogue.read().mode === 'playing') {
      walked += advance(pilot, position, world, dt);
      combat.guard(pilot.guard, (pilot.yaw ?? 0) + Math.PI); combat.update(dt);
      for (const event of events.splice(0)) host.combatEvent(event);
    }
  }
  assert.equal(host.state().outcome, 'monarchist', JSON.stringify({ reason: pilot.stopReason, position, state: host.state(), chosen: dialogue.chosen }));
  assert.equal(host.state().evidenceRead, false); assert.equal(host.state().favor.empire, 10);
  assert.ok(walked > 100, 'camp trip and return were physically walked');
  assert.deepEqual(dialogue.chosen, ['drent-accept', 'drent-focus', 'drent-leave', 'drent-glun', 'drent-confront', 'drent-fight', 'drent-finish-imperial']);
  assert.ok(dialogue.speakers.includes('drent-camp-baggage')); assert.equal(stopEvents.at(-1).completed, true);
});

test('Luscia autoplay uses Davin’s actual satchel transfer and Hara’s briefing without claiming the unbuilt quest is complete', () => {
  const world = terrain(), inventory = createInventoryState(), living = createLivingStory(), dialogue = dialogueDriver();
  const campaign = createCampaign(), border = createBorderChapter(); campaign.completeChapter('drent-road'); living.reportNothom('player');
  const hut = LUSCIA_RECRUIT_POSITIONS['relay-republican'];
  world.npcPositions = { ...LUSCIA_RECRUIT_POSITIONS, 'timber-stall': { x: hut.x - 35, z: hut.z + 12 } };
  const npcById = new Map([...LUSCIA_RECRUIT_NPCS, { id: 'timber-stall', name: 'Hara' }]
    .map(n => [n.id, { ...n, actor: actor(world.npcPositions[n.id]) }]));
  const position = { x: hut.x + 2, z: hut.z, y: 1.5 };
  const combat = { state: { phase: 'peaceful', player: { hp: 100, action: 'idle' }, enemies: [] } };
  let host;
  const luscia = createLusciaChapter({ inventory, assignment: { accept: () => living.acceptSatchel('player'),
    take() { const allowed = host.canTake(); if (!allowed.ok) return allowed;
      const result = living.takeSatchel('player'); if (result.ok) inventory.add('courier-satchel'); return result; } } });
  luscia.start(); luscia.act('accept-lauvel-search');
  host = createLusciaCivilWarHost({ world, npcById, combat, luscia, living: () => living, position: () => position,
    mode: () => dialogue.read().mode, ...dialogue, takeSatchel: () => luscia.act('take-courier-satchel'),
    onRepublicJoined() { campaign.joinRepublic(); border.joinRepublic(); living.chooseAllegiance('player', 'coalition'); return { ok: true }; } });
  const nearby = () => [...npcById.values()].filter(n => !n.hidden && gap(position, n.actor.group.position) < 2.6)
    .sort((a, b) => gap(position, a.actor.group.position) - gap(position, b.actor.group.position))[0];
  const pilot = createLusciaCivilAutopilot({ world, options: pace, read: () => ({ ...dialogue.read(), position: { ...position },
    quest: host.state(), people: Object.fromEntries([...npcById].map(([id, n]) => [id, { ...n.actor.group.position, available: !n.hidden }])),
    interaction: { npcId: nearby()?.id }, combat: { hp: 100, phase: 'peaceful', action: 'idle' } }),
    act: { ...dialogue.actions, interact: () => assert.equal(host.converse(nearby()), true) } });
  const stops = []; pilot.onEvent(e => { if (e.type === 'stop') stops.push(e); }); pilot.start();
  let walked = 0;
  for (let frame = 0; frame < 6000 && pilot.active; frame++) {
    const dt = 1 / 60; host.frame(dt, { playing: dialogue.read().mode === 'playing' }); pilot.step(dt);
    if (dialogue.read().mode === 'playing') walked += advance(pilot, position, world, dt);
  }
  assert.equal(host.view().stage, 'await-local-orders', pilot.stopReason);
  assert.equal(host.view().complete, false); assert.equal(campaign.state.side, 'coalition');
  assert.equal(inventory.count('courier-satchel'), 1); assert.equal(living.satchel().carrier, 'player');
  assert.ok(walked > 30); assert.deepEqual(dialogue.chosen, ['luscia-listen-republican', 'luscia-join-republic', 'luscia-local-briefing']);
  assert.equal(stops.at(-1).completed, false); assert.equal(stops.at(-1).boundary, true); assert.match(pilot.stopReason, /not built yet/);
});

const snapshot = () => ({ mode: 'playing', position: { x: 0, z: 0 }, quest: { ambushDefeated: true, accepted: false },
  people: { instructor: { x: 20, z: 0, available: true } }, combat: { hp: 100, phase: 'peaceful', action: 'idle' }, interaction: {} });

test('civil pilots freeze deadlines while paused and release every movement input', () => {
  const s = snapshot(), pilot = createDrentAutopilot({ world: terrain(), read: () => s, options: { maxSeconds: 1, idleLimit: 1 } });
  pilot.start(); pilot.step(.1); assert.ok(pilot.move.forward);
  for (const mode of ['testing', 'pause', 'journal', 'inventory']) {
    s.mode = mode; for (let i = 0; i < 100; i++) pilot.step(.25);
    assert.equal(pilot.active, true); assert.deepEqual(pilot.move, { forward: 0, side: 0, run: false }); assert.equal(pilot.guard, false);
  }
  s.mode = 'playing'; pilot.step(.1); assert.equal(pilot.active, true); pilot.stop(); assert.deepEqual(pilot.move, { forward: 0, side: 0, run: false });
});

test('civil pilots stop on disabled progression, unexpected fights, unavailable people and player death', () => {
  for (const change of [s => { s.mode = 'dialogue'; s.dialogue = { npcId: 'instructor', choices: [{ id: 'drent-accept', enabled: false }, { id: 'drent-leave' }] }; },
    s => { s.combat.phase = 'active'; s.combat.encounterId = 'unrelated-ambush'; },
    s => { s.people.instructor.available = false; }, s => { s.combat.hp = 0; }]) {
    const s = snapshot(), actions = []; change(s);
    const pilot = createDrentAutopilot({ world: terrain(), read: () => s, options: pace, act: { choose: value => actions.push(value), interact: () => actions.push('interact') } });
    pilot.start(); for (let i = 0; i < 12; i++) pilot.step(.1);
    assert.equal(pilot.active, false); assert.deepEqual(actions, []);
  }
});

test('a completed or unsupported branch is never restarted or silently converted into another allegiance', () => {
  for (const [factory, quest, reason] of [[createDrentAutopilot, { outcome: 'monarchist' }, /complete/],
    [createDrentAutopilot, { ambushDefeated: true, chosenPath: 'republican' }, /Republican branch/],
    [createLusciaCivilAutopilot, { path: 'empire' }, /Imperial investigation/],
    [createLusciaCivilAutopilot, { operative: 'dead' }, /unavailable/]]) {
    const s = { ...snapshot(), quest }, actions = [], pilot = factory({ world: terrain(), read: () => s, act: { interact: () => actions.push('interact') } });
    pilot.start(); pilot.step(.1); assert.equal(pilot.active, false); assert.match(pilot.stopReason, reason); assert.deepEqual(actions, []);
  }
});

// The native renderer caps movement at .05 seconds. A detour corner closer than
// that stride must retain its fractional input, or the player paces either side
// of it indefinitely despite the collision planner having a valid route.
test('silver quest approach clears a house at 20 Hz and changing frame rates without overshooting detour corners', () => {
  for(const movementSpeeds of [novice,mastered])for (const cadence of [[1 / 60], [1 / 30], [.05], [.016, .05, .033, .05]]) {
    const world = terrain();
    world.colliders.push({ x: 0, z: 0, hx: 2, hz: 2, kind: 'house' });
    const position = { x: -5, z: 0 }, target = { x: 6, z: 0 };
    const s = { ...snapshot(), movementSpeeds, position, quest: { ambushDefeated: true, accepted: true, evidenceFound: true },
      people: { instructor: target } };
    let interacted = false;
    const pilot = createDrentAutopilot({ world, read: () => ({ ...s,
      interaction: gap(position, target) < 2.6 ? { npcId: 'instructor' } : {} }),
      act: { interact() { interacted = true; } }, options: pace });
    pilot.start();
    for (let frame = 0; frame < 1800 && pilot.active && !interacted; frame++) {
      const dt = cadence[frame % cadence.length]; pilot.step(dt); advance(pilot, position, world, dt, movementSpeeds);
    }
    assert.ok(interacted, `never reached Glun at cadence ${cadence}: ${JSON.stringify(position)}`);
    assert.ok(gap(position, target) < 2.6);
  }
});


test('the silver pilot refuses a sword sweep through Glun but still attacks when the sweep is clear', () => {
  const s = snapshot(), actions = [];
  s.quest = { ambushDefeated: true, accepted: true, evidenceFound: true, confrontationStarted: true };
  s.combat = { phase: 'active', encounterId: 'drent-killian-confrontation', hp: 100, stamina: 100, action: 'idle',
    enemies: [{ id: 'drent-killian', x: 0, z: 2, hp: 180, action: 'idle' }],
    allies: [{ id: 'instructor', x: .5, z: 1.7, hp: 280, active: true, action: 'idle' }] };
  const pilot = createDrentAutopilot({ world: terrain(), read: () => s, options: { swingEvery: 0 }, act: { attack: action => actions.push(action) } });
  pilot.start(); pilot.step(.05);
  assert.equal(actions.length, 0, 'Glun stands in the real sword sweep');
  assert.match(pilot.intent, /room to fight/);
  s.combat.allies[0].x = 6; s.combat.allies[0].z = 6;
  pilot.step(.05); assert.equal(actions.length, 1, 'a safe strike remains available');
});

for (const fps of [20, 60]) test(`silver combat wins without assaulting its officer at ${fps} Hz using actual melee and crime`, () => {
  const world = terrain(), position = { x: -43.55, z: 48.94, y: 1.5 }, events = [];
  const inventory = { ...createInventoryState(), refresh() {} };
  const officer = { id: 'instructor', name: 'Officer Glun', modelRole: 'legion-officer', hidden: true,
    actor: actor({ x: -40.5, z: 52.5 }) };
  const npcById = new Map([[officer.id, officer]]);
  const combat = createCombat({ world, position, onEvent: event => events.push(event) });
  const crime = createCrimeHost({ world, npcById, inventory, combat, position: () => position });
  combat.startEncounter({ id: 'drent-killian-confrontation', center: { x: -43, z: 51 },
    checkpoint: { ...position }, retreatLine: 80,
    enemies: [{ id: 'drent-killian', name: 'Killian', kind: 'rebel', hp: 180, x: -43, z: 51, entry: .3 }],
    allies: [{ id: officer.id, name: officer.name, kind: 'officer', level: 35, hp: 280, spared: true, x: -40.5, z: 52.5 }] });
  const impacts = [];
  const pilot = createDrentAutopilot({ world, options: { swingEvery: .3 }, read: () => ({ mode: 'playing', position,
    quest: { ambushDefeated: true, accepted: true, evidenceFound: true, confrontationStarted: true },
    people: {}, combat: { ...combat.state.player, phase: combat.state.phase, encounterId: combat.state.encounterId,
      enemies: combat.state.enemies, allies: combat.state.allies, hasShield: true }, weapon: { usable: true } }),
    act: { attack: ({ yaw }) => combat.attack(yaw), dodge: direction => combat.dodge(direction) } });
  pilot.start();
  for (let frame = 0; frame < fps * 45 && combat.state.phase === 'active' && pilot.active; frame++) {
    pilot.step(1 / fps); advance(pilot, position, world, 1 / fps);
    combat.guard(pilot.guard, (pilot.yaw ?? 0) + Math.PI); combat.update(1 / fps);
    for (const event of events.splice(0)) {
      if (event.type === 'melee-impact') impacts.push(event);
      crime.handleImpact(event);
    }
  }
  assert.equal(combat.state.phase, 'won', JSON.stringify({ reason: pilot.reason, position, combat: combat.state }));
  assert.equal(crime.view().wanted, false, JSON.stringify(crime.snapshot()));
  assert.equal(crime.snapshot().assaults, 0);
  assert.ok(!impacts.some(impact => impact.source === 'player' && impact.hits.some(hit => hit.id === officer.id)));
  assert.ok(combat.state.allies[0].hp > 0);
});
