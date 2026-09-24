import test from 'node:test';
import assert from 'node:assert/strict';
import { createLivingStory, validateLivingStorySnapshot, worldCalendar, bridgeChoice,
  SATCHEL_DEADLINE, MUSTER_GRACE, BRIDGE_WORK } from '../src/living-story.js';
import { MERCENARY_ROSTER, CROMB } from '../src/mercenaries.js';

const roster = ids => MERCENARY_ROSTER.filter(a => ids.includes(a.id));
const few = (...ids) => createLivingStory({ roster: roster(ids) });
const reload = model => createLivingStory({ roster: model.actors().map(a => ({ id: a.id, name: a.name })), saved: model.snapshot() });
const report = (model, id) => { model.reportNothom(id); return model.acceptSatchel(id); };

test('calendar begins at first light on 1 April 980 and advances one minute per active second', () => {
  const m = createLivingStory();
  assert.deepEqual(m.calendar(), { year: 980, month: 4, day: 1, hour: 6, minute: 0, season: 'Spring', period: 'Dawn', time: '06:00', label: '1 April 980 · Spring · Dawn' });
  m.tick(60); assert.equal(m.calendar().hour, 7);
  m.tick(1380); assert.equal(m.calendar().day, 2); assert.equal(m.calendar().hour, 6);
  assert.equal(worldCalendar(30 * 1440).month, 5);
  assert.equal(worldCalendar(61 * 1440).season, 'Summer');
});

test('pausing, invalid deltas and reconstruction do not consume active time', () => {
  const m = createLivingStory(); m.tick(27.75);
  for (const seconds of [10, 4000]) m.tick(seconds, { paused: true });
  for (const seconds of [NaN, -1, Infinity]) m.tick(seconds);
  assert.equal(m.clock(), 27.75); assert.equal(reload(m).clock(), 27.75);
  assert.equal(reload(m).drainEvents().length, 0);
});

test('model never moves a visible actor or a companion by timetable', () => {
  const m = few('merc-word');
  m.observe('merc-word', { stage: 'training', position: { x: 17, z: -8 }, withPlayer: true,
    route: { step: 2, work: 7, targetId: 'instructor', waypoint: 3, swimming: false } });
  m.tick(40000);
  assert.equal(m.actor('merc-word').stage, 'training');
  assert.deepEqual(reload(m).actor('merc-word'), m.actor('merc-word'));
  assert.equal(m.actor('merc-word').tasks.training, undefined);
});

test('different playable heroes receive the correct persistent company without twins', () => {
  const r = [...MERCENARY_ROSTER.filter(a => a.id !== 'merc-gotwood'), CROMB];
  const m = createLivingStory({ roster: r });
  assert.equal(m.actors().length, 10); assert.equal(m.actor('merc-gotwood'), null); assert.ok(m.actor('merc-cromb'));
  assert.equal(m.restore(createLivingStory().snapshot()), false, 'cannot transplant another hero roster');
});

test('all authored broken bridge crossing combinations', () => {
  const cases = [
    [['gotwood'], 'repair'], [['jerry'], 'swim'], [['christin'], 'repair'], [['ciaran'], 'repair'],
    [['jerry', 'christin'], 'swim'], [['jerry', 'ciaran'], 'repair'], [['christin', 'ciaran'], 'repair'],
    [['jerry', 'christin', 'ciaran'], 'repair'], [['lakota'], 'repair'], [['eliana'], 'swim'],
    [['matt'], 'repair'], [['altun'], 'repair'], [['matt', 'altun'], 'repair'], [['word'], 'swim'], [['mus'], 'swim'],
  ];
  for (const [ids, choice] of cases) assert.equal(bridgeChoice(ids.map(id => `merc-${id}`)), choice, ids.join('+'));
  assert.equal(bridgeChoice(['merc-jerry'], true), 'bridge');
});

test('one builder must bring materials and work; another completion grants no player reward', () => {
  const m = few('merc-christin', 'merc-lakota');
  assert.equal(m.claimBridge('merc-christin').ok, true);
  assert.equal(m.claimBridge('merc-lakota').ok, false);
  assert.equal(m.workBridge('merc-christin', 30), false);
  m.addBridgeMaterials('merc-christin', 3); m.workBridge('merc-christin', BRIDGE_WORK - 1);
  assert.equal(m.completeBridge('merc-christin').ok, false);
  const n = reload(m); n.workBridge('merc-christin', 1);
  assert.deepEqual(n.completeBridge('merc-christin'), { ok: true, reward: false });
  assert.equal(n.completeBridge('player', { playerRepair: true }).ok, false);
  assert.equal(n.bridge().completedBy, 'merc-christin'); assert.equal(n.crossing(['merc-lakota']), 'bridge');
});

test('dead or newly recruited builders release an unfinished claim without finishing the bridge', () => {
  const m = few('merc-christin', 'merc-lakota');
  m.claimBridge('merc-christin'); m.addBridgeMaterials('merc-christin', 2);
  m.setAlive('merc-christin', false);
  assert.equal(m.bridge().status, 'available'); assert.equal(m.bridge().materials, 2, 'materials left onsite');
  m.claimBridge('merc-lakota'); m.observe('merc-lakota', { withPlayer: true });
  assert.equal(m.bridge().owner, null); assert.equal(m.claimBridge('merc-lakota').ok, false);
});

test('player physical repair can reconcile the existing three-stick journey action once', () => {
  const m = createLivingStory();
  assert.equal(m.completeBridge('player', { playerRepair: true }).ok, true);
  assert.equal(m.completeBridge('player', { playerRepair: true }).ok, false);
  assert.equal(m.bridge().completedBy, 'player');
});

test('exactly four first reporters reserve unique mounts; deaths and faction changes never restock', () => {
  const m = createLivingStory();
  for (const id of ['merc-word', 'merc-jerry', 'merc-christin', 'merc-ciaran']) assert.ok(m.reportNothom(id).horse);
  assert.equal(m.availableHorses(), 0);
  assert.equal(m.reportNothom('player').horse, null);
  m.setAlive('merc-word', false); m.chooseAllegiance('merc-jerry', 'coalition');
  assert.equal(m.reportNothom('merc-lakota').horse, null); assert.equal(reload(m).availableHorses(), 0);
  assert.equal(m.horseFor('merc-word'), 'army-remount-1');
  assert.equal(new Set(m.snapshot().horses.map(h => h.id)).size, 4);
});

test('horse reservations and physical redemption are distinct and cannot be duplicated', () => {
  const m = createLivingStory();
  assert.equal(m.claimHorse('player'), false);
  m.reportNothom('player'); assert.equal(m.claimHorse('player'), true); assert.equal(m.claimHorse('player'), false);
  assert.equal(reload(m).snapshot().horses[0].claimed, true);
  assert.equal(m.reportNothom('player').horse, 'army-remount-1'); assert.equal(m.snapshot().horses.length, 1);
});

test('simultaneous reports use stable ID order rather than render frame array ordering', () => {
  const a = few('merc-word', 'merc-jerry'), b = few('merc-word', 'merc-jerry');
  a.reportBatch(['merc-word', 'merc-jerry']); b.reportBatch(['merc-jerry', 'merc-word']);
  assert.deepEqual(a.snapshot(), b.snapshot()); assert.equal(a.satchel().assignee, 'merc-jerry');
});

test('player reporting does not accept the ten-minute job without a deliberate acceptance', () => {
  const m = createLivingStory();
  assert.equal(m.acceptSatchel('player').ok, false);
  m.reportNothom('player'); assert.equal(m.satchel().assignee, null);
  assert.equal(m.acceptSatchel('player').ok, true); assert.equal(m.satchel().deadlineAt, SATCHEL_DEADLINE);
  m.tick(10); m.acceptSatchel('player'); assert.equal(m.satchel().deadlineAt, SATCHEL_DEADLINE);
});

test('NPC assignment is unique and completed job gives a later player no duplicated reward', () => {
  const m = few('merc-word'); m.reportNothom('merc-word');
  assert.equal(m.satchel().assignee, 'merc-word'); assert.equal(m.acceptSatchel('player').ok, false);
  assert.equal(m.takeSatchel('merc-word').ok, true); assert.equal(m.deliverSatchel('merc-word').reward, true);
  m.reportNothom('player'); assert.equal(m.acceptSatchel('player').reason, 'completed');
  assert.equal(m.deliverSatchel('merc-word').ok, false); assert.equal(m.takeSatchel('player').ok, false);
  assert.equal(reload(m).satchel().completedBy, 'merc-word');
});

test('deadline warning is once, saved, and pauses/reloads preserve the original due time', () => {
  const m = few('merc-word'); report(m, 'player'); m.tick(479); m.drainEvents();
  m.tick(5000, { paused: true }); assert.equal(m.satchel().assignee, 'player');
  m.tick(1); assert.equal(m.drainEvents().filter(e => e.type === 'satchel-deadline-warning').length, 1);
  const n = reload(m); n.tick(1); assert.equal(n.drainEvents().length, 0);
  assert.equal(n.satchel().deadlineAt, 600);
});

test('overdue responsibility changes without removing a satchel from the player', () => {
  const m = few('merc-word'); report(m, 'player'); m.takeSatchel('player'); m.reportNothom('merc-word');
  m.tick(600);
  assert.equal(m.satchel().assignee, 'merc-word'); assert.equal(m.satchel().carrier, 'player');
  assert.equal(m.satchel().handover.status, 'seeking');
  assert.equal(m.handoverSatchel('merc-word').reason, 'approach-first');
  assert.equal(m.satchel().carrier, 'player');
});

test('player may deliver late before handover and stale replacement demand cannot take a delivered satchel', () => {
  const m = few('merc-word'); report(m, 'player'); m.takeSatchel('player'); m.reportNothom('merc-word'); m.tick(600);
  assert.equal(m.deliverSatchel('player').ok, true);
  assert.equal(m.handoverSatchel('merc-word', { near: true }).reason, 'stale-demand');
  assert.equal(m.satchel().rewardRecipient, 'player'); assert.equal(m.satchel().carrier, null);
});

test('replacement asks in person; refusal creates ordinary hostility, agreement transfers once', () => {
  const m = few('merc-word'); report(m, 'player'); m.takeSatchel('player'); m.reportNothom('merc-word'); m.tick(600); m.drainEvents();
  assert.equal(m.handoverSatchel('merc-word', { near: true, accept: false }).fight, true);
  assert.equal(m.satchel().carrier, 'player');
  m.handoverSatchel('merc-word', { near: true, accept: false });
  assert.equal(m.drainEvents().filter(e => e.type === 'satchel-handover-refused').length, 1);
  const n = reload(m); assert.equal(n.handoverSatchel('merc-word', { near: true }).ok, true);
  assert.equal(n.satchel().carrier, 'merc-word'); assert.equal(n.handoverSatchel('merc-word', { near: true }).ok, false);
  assert.equal(n.deliverSatchel('player').ok, false); assert.equal(n.deliverSatchel('merc-word').ok, true);
});

test('dead carrier drops the sole satchel at a persistent physical location', () => {
  const m = few('merc-word', 'merc-jerry'); m.reportNothom('merc-word'); m.reportNothom('merc-jerry'); m.takeSatchel('merc-word');
  m.setAlive('merc-word', false, { position: { x: 23, z: -200 } });
  assert.equal(m.satchel().carrier, null); assert.equal(m.satchel().assignee, 'merc-jerry');
  assert.equal(m.satchel().location, 'remains-merc-word'); assert.deepEqual(m.satchel().position, { x: 23, z: -200 });
  const n = reload(m); assert.equal(n.takeSatchel('player', { from: 'remains-wrong' }).ok, false);
  assert.equal(n.takeSatchel('player', { from: 'remains-merc-word' }).ok, true); assert.equal(n.satchel().carrier, 'player');
});

test('killed relay soldier leaves an item instead of deleting it with his corpse', () => {
  const m = createLivingStory();
  assert.equal(m.soldierKilled({ position: { x: 2, z: 5 } }), true);
  assert.equal(m.satchel().carrier, null); assert.deepEqual(m.satchel().position, { x: 2, z: 5 });
  assert.equal(m.takeSatchel('player', { from: 'remains-relay-republican' }).ok, true);
  assert.equal(m.soldierKilled({ position: { x: 2, z: 5 } }), false);
});

test('reassignment does not borrow a companion to do remote errands', () => {
  const m = few('merc-word', 'merc-jerry'); report(m, 'player'); m.reportNothom('merc-word'); m.reportNothom('merc-jerry');
  m.observe('merc-word', { withPlayer: true }); m.tick(600);
  assert.equal(m.satchel().assignee, 'merc-jerry');
});

test('personality plus persistent experiences changes independent allegiance; reload never rerolls', () => {
  const a = few('merc-matt', 'merc-lakota'), b = few('merc-matt', 'merc-lakota');
  a.experience('merc-matt', 'imperial-cruelty'); a.experience('merc-matt', 'heard-republican-argument');
  b.experience('merc-matt', 'imperial-aid');
  assert.equal(a.decideAllegiance('merc-matt'), 'coalition'); assert.equal(b.decideAllegiance('merc-matt'), 'empire');
  assert.equal(a.experience('merc-matt', 'imperial-cruelty'), false);
  assert.equal(reload(a).decideAllegiance('merc-matt'), 'coalition');
  assert.equal(a.actor('merc-matt').allegianceEvent.reason, 'nothom-decision');
});

test('defecting assignee keeps the actual item and may deliver it to the Republican contact', () => {
  const m = few('merc-word', 'merc-jerry'); m.reportNothom('merc-word'); m.reportNothom('merc-jerry'); m.takeSatchel('merc-word');
  m.chooseAllegiance('merc-word', 'coalition', 'saw-imperial-cruelty');
  assert.equal(m.satchel().assignee, 'merc-jerry'); assert.equal(m.satchel().carrier, 'merc-word');
  assert.equal(m.deliverSatchel('merc-word', { side: 'coalition' }).ok, true);
  assert.equal(m.satchel().deliveredSide, 'coalition');
});

test('muster waits for real arrivals then exactly one minute of active grace', () => {
  const m = few('merc-word', 'merc-jerry');
  m.arriveMuster('merc-word'); m.tick(1000); assert.equal(m.recall().status, 'none');
  m.arriveMuster('merc-jerry'); m.tick(MUSTER_GRACE - 1); assert.equal(m.recall().status, 'none');
  m.tick(500, { paused: true }); assert.equal(m.recall().status, 'none');
  m.tick(1); assert.equal(m.recall().status, 'seeking'); assert.equal(m.recall().courier, 'merc-word');
  assert.equal(m.availableHorses(), 4, 'borrowed courier mount does not create a fifth entitlement');
});

test('dead, detained, Republican and accompanying mercenaries do not deadlock Imperial quorum', () => {
  const m = few('merc-word', 'merc-jerry', 'merc-christin', 'merc-ciaran', 'merc-lakota');
  m.setAlive('merc-jerry', false); m.chooseAllegiance('merc-christin', 'coalition');
  m.observe('merc-ciaran', { withPlayer: true }); m.observe('merc-lakota', { detained: true });
  m.arriveMuster('merc-word'); m.tick(60);
  assert.equal(m.recall().courier, 'merc-word'); assert.equal(m.recall().status, 'seeking');
  assert.equal(m.arriveMuster('merc-ciaran'), false, 'a following companion cannot arrive at another place');
  assert.equal(m.arriveMuster('merc-christin', 'empire'), false);
});

test('Republican recruits have their own muster and no Imperial courier', () => {
  const m = few('merc-word', 'merc-lakota'); m.chooseAllegiance('merc-lakota', 'coalition');
  m.setPlayerSide('coalition'); m.arriveMuster('merc-word'); m.arriveMuster('merc-lakota', 'coalition'); m.tick(300);
  assert.equal(m.recall().status, 'none'); assert.equal(m.arrivePlayerMuster('coalition'), true);
  assert.deepEqual(m.muster('coalition').arrivals, ['merc-lakota']);
  assert.deepEqual(m.battleRoster(), { empire: ['merc-word'], coalition: ['merc-lakota'] });
});

test('joining the Republic cancels an already dispatched Imperial recall', () => {
  const m = few('merc-word'); m.arriveMuster('merc-word'); m.tick(60); assert.equal(m.recall().status, 'seeking');
  m.setPlayerSide('coalition'); assert.equal(m.recall().status, 'cancelled');
  assert.equal(m.recallArrived('merc-word'), false); m.tick(1000); assert.equal(m.recall().status, 'cancelled');
});

test('a dead or defected courier is replaced once by the next actual loyal arrival', () => {
  for (const fate of ['dead', 'defected']) {
    const m = few('merc-word', 'merc-jerry', 'merc-christin');
    for (const id of ['merc-word', 'merc-jerry', 'merc-christin']) m.arriveMuster(id);
    m.tick(60);
    if (fate === 'dead') m.setAlive('merc-word', false); else m.chooseAllegiance('merc-word', 'coalition');
    m.tick(1); assert.equal(m.recall().courier, 'merc-jerry', fate); assert.equal(m.recall().attempts, 2);
    m.setAlive('merc-jerry', false); m.tick(1); assert.equal(m.recall().status, 'unavailable');
    assert.equal(m.recall().attempts, 2);
  }
});

test('courier waits for safe dialogue, accepts passenger travel, then finishes once at muster', () => {
  const m = few('merc-word'); m.arriveMuster('merc-word'); m.tick(60);
  assert.equal(m.recallArrived('merc-word', { safe: false }), false); assert.equal(m.answerRecall(true), false);
  assert.equal(m.recallArrived('merc-word'), true); assert.equal(m.answerRecall(true), true);
  assert.equal(m.recall().status, 'passenger'); m.tick(10); assert.equal(m.clock(), 70);
  const n = reload(m); assert.equal(n.recall().status, 'passenger'); n.arrivePlayerMuster('empire');
  assert.equal(n.recall().status, 'complete'); assert.equal(n.muster().status, 'ready');
});

test('arriving independently cancels pursuit and does not wait for the dispatched courier', () => {
  const m = few('merc-word'); m.arriveMuster('merc-word'); m.tick(60);
  assert.equal(m.arrivePlayerMuster(), true); assert.equal(m.recall().status, 'cancelled');
  assert.equal(m.muster().status, 'ready'); assert.equal(m.recallArrived('merc-word'), false);
});

test('No permanently rejects only Empire and later valid Republic recruitment remains possible', () => {
  const m = few('merc-word'); m.arriveMuster('merc-word'); m.tick(60); m.recallArrived('merc-word');
  assert.equal(m.answerRecall(false), true); assert.equal(m.player().imperialRefused, true);
  assert.equal(m.muster().status, 'departed'); assert.equal(m.setPlayerSide('empire'), false);
  const n = reload(m); n.tick(5000); assert.equal(n.recall().status, 'refused');
  assert.equal(n.setPlayerSide('coalition'), true); assert.equal(n.player().imperialRefused, true);
  assert.equal(n.arrivePlayerMuster('coalition'), true);
});

test('old saves retain clock, completed work and owned horses without replaying payouts', () => {
  const m = createLivingStory({ legacy: { playSeconds: 900, bridgeComplete: true, satchelComplete: true,
    playerHorse: true, deadIds: ['merc-gotwood'], actors: [{ id: 'merc-word', stage: 'nothom', position: { x: 200, z: 80 } }] } });
  assert.equal(m.clock(), 900); assert.equal(m.bridge().status, 'complete'); assert.equal(m.satchel().status, 'delivered');
  assert.equal(m.actor('merc-gotwood').alive, false); assert.deepEqual(m.actor('merc-word').position, { x: 200, z: 80 });
  assert.equal(m.availableHorses(), 3); assert.equal(m.snapshot().horses[0].claimed, true); assert.deepEqual(m.drainEvents(), []);
  assert.equal(validateLivingStorySnapshot(m.snapshot()), true);
});

test('legacy muster arrivals count toward quorum without replaying elapsed grace or rewards', () => {
  const roster = MERCENARY_ROSTER.filter(a => ['merc-word', 'merc-jerry'].includes(a.id));
  const m = createLivingStory({ roster, legacy: { playSeconds: 1600,
    actors: roster.map(a => ({ id: a.id, stage: 'mustered', position: { x: 220, z: 110 } })) } });
  assert.deepEqual(m.muster().arrivals, roster.map(a => a.id));
  assert.equal(m.muster().graceAt, 1600);
  assert.equal(m.recall().status, 'none');
  assert.equal(m.availableHorses(), 4, 'migration does not invent retroactive horse rewards');
  assert.deepEqual(m.drainEvents(), []);
  m.tick(59); assert.equal(m.recall().status, 'none');
  m.tick(1); assert.equal(m.recall().status, 'seeking');
});

test('legacy completed muster and route chores migrate without new jobs or recall', () => {
  const roster = MERCENARY_ROSTER.filter(a => a.id === 'merc-word');
  const m = createLivingStory({roster, legacy:{playSeconds:1800,playerMusterComplete:true,
    actors:[{id:'merc-word',stage:'mustered',position:{x:50,z:80},reported:true,
      tasks:['harbor','training','ambush','chip','nothom','not a task',null],route:{step:0,work:0}}]}});
  assert.equal(m.actor('merc-word').reportedAt, 1800);
  assert.deepEqual(m.snapshot().reports, ['merc-word']);
  assert.deepEqual(Object.keys(m.actor('merc-word').tasks), ['harbor','training','ambush','chip','nothom','empire-muster']);
  assert.equal(m.availableHorses(), 4);
  assert.equal(m.satchel().assignee, null, 'historical reporting cannot accept a new job');
  assert.equal(m.muster().status, 'departed');
  assert.equal(m.muster().playerArrivedAt, 1800);
  m.tick(600); assert.equal(m.recall().status, 'none');
  assert.equal(validateLivingStorySnapshot(m.snapshot()), true);
});

test('save validation rejects malformed or duplicated shared resources', () => {
  const m = createLivingStory(); m.reportNothom('player'); const clean = m.snapshot();
  assert.equal(validateLivingStorySnapshot(clean), true);
  const corruptions = [
    s => { s.seconds = Infinity; }, s => { s.actors[0].health = -1; }, s => { s.actors[0].id = s.actors[1].id; },
    s => { s.horses.push({ ...s.horses[0] }); }, s => { s.satchel.carrier = 'nobody'; },
    s => { s.player.allegiance = 'unknown'; }, s => { s.muster.empire.arrivals = ['merc-word', 'merc-word']; },
  ];
  for (const corrupt of corruptions) {
    const bad = structuredClone(clean); corrupt(bad); assert.equal(validateLivingStorySnapshot(bad), false);
    assert.equal(m.restore(bad), false); assert.deepEqual(m.snapshot(), clean);
  }
});

test('snapshots and getters cannot mutate the live story', () => {
  const m = few('merc-word'); const actor = m.actor('merc-word'); actor.health = 0;
  const s = m.snapshot(); s.player.imperialRefused = true;
  assert.equal(m.actor('merc-word').health, 100); assert.equal(m.player().imperialRefused, false);
});

test('saved route and ferry progress reject corrupt coordinates and unsafe task counters', () => {
  const m = few('merc-word');
  const transit = { status: 'sailing', from: 'drent', to: 'peblos', elapsed: 7,
    destination: { x: 12, z: 30 }, purpose: 'courier-seek', mounted: true, passenger: true };
  m.observe('merc-word', { route: { step: 2, work: 1.5, waypoint: 4, targetId: 'harbor', returnStage: 'mustered',
    swimming: false, materials: { 'shore-branch': 1 }, transit } });
  assert.equal(validateLivingStorySnapshot(m.snapshot()), true);
  const before = m.snapshot();
  const corruptions = [
    route => { route.step = -1; }, route => { route.work = NaN; }, route => { route.waypoint = 2.5; },
    route => { route.transit.destination.x = Infinity; }, route => { route.transit.to = 'unknown-quay'; },
    route => { route.transit.from = route.transit.to; }, route => { route.transit.elapsed = 13; },
    route => { route.transit.passenger = 'yes'; }, route => { route.materials['shore-branch'] = -1; },
    route => { route.returnStage = 'nowhere'; }, route => { route.unrecognizedTask = true; },
  ];
  for (const corrupt of corruptions) {
    const bad = structuredClone(before); corrupt(bad.actors[0].route);
    assert.equal(validateLivingStorySnapshot(bad), false);
    assert.equal(m.restore(bad), false);
    m.observe('merc-word', { route: bad.actors[0].route });
    assert.deepEqual(m.snapshot(), before, 'invalid live observations cannot poison a later checkpoint');
  }
  assert.deepEqual(reload(m).actor('merc-word').route.transit, transit);
});
