import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import {
  BORDER_ENCOUNTER_ID, BORDER_LEGATE_ID, BORDER_GATE_ID, BORDER_NPCS, BORDER_MARCHERS, BORDER_LINE, COALITION_SIGNING, MARCH,
  borderConversation, borderEncounter, borderMusterEncounter, borderLine, borderLineSaid, createBorderChapter, validateBorderSnapshot, marchSlot,
} from '../src/border-chapter.js';
import { FILE_FLOOR } from '../src/file-fill.js';
import { MERCENARY_COMPANY_SIZE } from '../src/mercenaries.js';
import { MOROS_PAY } from '../src/moros-chapter.js';
import { hexOwnerAt } from '../src/region-world.js';

const HALL_DELEGATION = ['coalition-envoy', 'envoy-guard-north', 'envoy-guard-south'];

test('signing either contract keeps the envoy and her guards present, with a useful response and no repeated signing reward', () => {
  for (const side of ['coalition', 'empire']) {
    const border = createBorderChapter();
    border.start(); border.act('take-legate-terms'); border.act('enter-solis');
    const before = border.cast();
    border.act(`side-${side}`);
    for (const id of before) assert.ok(border.cast().includes(id), `${id} stays after signing ${side}`);
    assert.equal(border.act(`side-${side}`).ok, false, 'signing cannot pay twice');
    const screens = [];
    borderConversation(BORDER_NPCS.find(npc => npc.id === 'coalition-envoy'), {
      border, openDialogue: (npc, lines, unused, label, options) => screens.push({ lines, options }),
      closeDialogue: () => {}, act: id => border.act(id),
    });
    assert.match(screens[0].lines.join(' '), side === 'coalition' ? /Captain Voss.*Gate of Sun Horses/ : /answer for the Marshal/);
    assert.equal(screens[0].options, undefined, 'the settled contract does not reopen');
    const resumed = createBorderChapter();
    assert.equal(resumed.restore(border.snapshot()), true);
    for (const id of HALL_DELEGATION) assert.ok(resumed.cast().includes(id), `${id} remains after loading`);
    for (const holder of ['empire', 'routed', 'contested']) {
      assert.ok(HALL_DELEGATION.every(id => !resumed.cast({ solisHolder: holder }).includes(id)), `the delegation leaves a ${holder} city`);
    }
  }
});

test('the chapter runs terms, gate, envoy, report, march and battle; the side is chosen once, and winning the fight wins the day', () => {
  const events = [], border = createBorderChapter({ onEvent: event => events.push(event) });
  assert.equal(border.act('take-legate-terms').ok, false, 'nothing before the muster');
  assert.equal(border.start().ok, true);
  assert.deepEqual(border.view().destinationIds, [BORDER_LEGATE_ID]);
  assert.deepEqual(border.cast(), ['coalition-envoy', 'envoy-guard-north', 'envoy-guard-south'], 'the envoy is already waiting at Solis');
  assert.equal(border.act('side-empire').ok, false, 'no parley without the Marshal’s terms');
  assert.equal(border.act('take-legate-terms').ok, true);
  assert.equal(border.view().stage, 'pass-gate');
  assert.deepEqual(border.view().destinationIds, [BORDER_GATE_ID], 'the terms go to the Gate of Sun Horses first');
  assert.equal(border.act('side-empire').ok, false, 'no parley before the gate');
  assert.equal(border.act('enter-solis').ok, true);
  assert.deepEqual(border.view().destinationIds, ['coalition-envoy']);
  assert.match(border.view().detail, /Court of Oaths/);
  const signed = border.act('side-empire');
  assert.equal(signed.ok, true); assert.equal(signed.reward, undefined, 'keeping the Empire’s contract pays nothing extra');
  assert.equal(border.act('side-coalition').ok, false, 'a side is chosen once');
  assert.equal(border.view().side, 'empire');
  // The report: back to the Marshal, who asks whether you are ready.
  assert.equal(border.view().stage, 'report');
  assert.deepEqual(border.view().destinationIds, [BORDER_LEGATE_ID]);
  assert.deepEqual(border.cast(), HALL_DELEGATION, 'the envoy remains at her post while the traveler returns to the Marshal');
  assert.equal(border.act('sound-advance').ok, false, 'no fight before the march');
  assert.equal(border.act('march-out').ok, true);
  assert.equal(border.view().stage, 'march');
  assert.deepEqual(border.view().destinationIds, ['battle-tribune']);
  assert.deepEqual(border.cast(), [...HALL_DELEGATION, 'battle-tribune', 'march-legionary-1', 'march-legionary-2'], 'the Captain holds the line and a file of the left marches');
  // The column comes up and the fight begins.
  const arrival = border.act('reach-line');
  assert.equal(arrival.startEncounter, BORDER_ENCOUNTER_ID);
  assert.equal(border.view().stage, 'fighting');
  assert.deepEqual(border.cast(), [...HALL_DELEGATION, 'battle-tribune'], 'the column fights as allies and is not drawn twice');
  assert.equal(border.endEncounter(BORDER_ENCOUNTER_ID).ok, true);
  assert.equal(border.view().stage, 'join-line', 'a retreat leaves the line waiting');
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID).ok, false, 'no fight, no verdict');
  border.act('sound-advance');
  assert.equal(border.resolveBattle('other', 50, 10).ok, false);
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID).outcome, 'victory');
  assert.equal(border.view().complete, true);
  assert.match(border.view().detail, /Coalition broke/);
  assert.equal(border.resolveBattle(BORDER_ENCOUNTER_ID).ok, false);
  assert.deepEqual(events.map(event => event.actionId), ['start-chapter', 'take-legate-terms', 'enter-solis', 'side-empire', 'march-out', 'reach-line', 'resolve-border-battle']);
  const lost = createBorderChapter(); lost.start(); lost.act('take-legate-terms'); lost.act('enter-solis');
  const joined = lost.act('side-coalition');
  assert.deepEqual(joined.reward, { id: 'copper-piece', quantity: COALITION_SIGNING }, 'the Republic pays on signing');
  assert.equal(lost.view().stage, 'report');
  assert.deepEqual(lost.view().destinationIds, ['solis-captain'], 'Voss asks the question at the Gate of Sun Horses');
  assert.deepEqual(lost.cast(), [...HALL_DELEGATION, 'solis-captain']);
  lost.act('march-out');
  assert.deepEqual(lost.cast(), [...HALL_DELEGATION, 'coalition-captain', 'march-valley-1', 'march-valley-2', 'march-valley-3', 'march-valley-4'], 'Voss rides ahead and the valley companies march');
  lost.act('reach-line');
  assert.equal(lost.resolveBattle(BORDER_ENCOUNTER_ID).outcome, 'victory', 'the Republic’s sellsword wins the day by winning the fight, whatever the odds');
  assert.deepEqual(lost.cast(), []);
  assert.match(lost.view().detail, /The army broke/);
});

test('the Coalition’s offer is plainly better than the Empire’s pay, in copper and not in scrip', () => {
  assert.equal(COALITION_SIGNING, MOROS_PAY * 2, 'fifty copper on the table against the muster’s twenty-five');
  const border = createBorderChapter(), screens = [];
  const context = { border, openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, options }), closeDialogue: () => {}, act: id => border.act(id) };
  border.start(); border.act('take-legate-terms'); border.act('enter-solis');
  assert.equal(borderConversation(BORDER_NPCS.find(npc => npc.id === 'coalition-envoy'), context), true);
  const speech = screens.at(-1).lines.join(' ');
  assert.match(speech, new RegExp(`${COALITION_SIGNING} copper`));
  assert.match(speech, /Double the Marshal’s rate/);
  assert.match(speech, /Land when the Republic wins/);
  assert.doesNotMatch(speech, /scrip/i, 'paper is the merchant’s grumble, not the offer');
  assert.match(screens.at(-1).options.choices.find(choice => choice.id === 'side-coalition').label, new RegExp(String(COALITION_SIGNING)));
});

test('saves round-trip without a running fight; saves from the stockade version keep their side; contradictory saves are refused', () => {
  const border = createBorderChapter(); border.start(); border.act('take-legate-terms'); border.act('enter-solis'); border.act('side-coalition'); border.act('march-out'); border.act('reach-line');
  border.endEncounter(BORDER_ENCOUNTER_ID);
  const saved = border.snapshot();
  assert.equal(Object.hasOwn(saved, 'active'), false);
  const other = createBorderChapter();
  assert.equal(other.restore(saved), true);
  assert.deepEqual(other.snapshot(), saved);
  assert.equal(other.view().stage, 'join-line'); assert.equal(other.view().side, 'coalition');
  // The march itself survives a save.
  const marching = createBorderChapter(); marching.start(); marching.act('take-legate-terms'); marching.act('enter-solis'); marching.act('side-empire'); marching.act('march-out');
  const resumed = createBorderChapter(); assert.equal(resumed.restore(marching.snapshot()), true);
  assert.equal(resumed.view().stage, 'march'); assert.deepEqual(resumed.cast(), [...HALL_DELEGATION, 'battle-tribune', 'march-legionary-1', 'march-legionary-2']);
  for (const bad of [null, [], {}, { ...saved, version: 2 }, { ...saved, revision: 1 }, { ...saved, side: 'pirates' }, { ...saved, outcome: 'draw' },
    { ...saved, ordered: false }, { ...saved, marched: false }, { ...saved, entered: 'yes' }, { ...saved, side: null, outcome: 'defeat', revision: 6 }, { ...saved, extra: 1 }]) {
    assert.equal(validateBorderSnapshot(bad), false);
    assert.equal(other.restore(bad), false);
    assert.equal(other.view().side, 'coalition');
  }
  const { entered, ready, ...partial } = saved;
  assert.equal(validateBorderSnapshot(partial), false, 'a save has all of the new stages or none of them');
  // Saves from before the parley moved to Solis.
  const legacy = (fields, revision) => ({ version: 1, revision, started: true, ordered: false, side: null, outcome: null, ...fields });
  const atEnvoy = createBorderChapter();
  assert.equal(atEnvoy.restore(legacy({ ordered: true }, 2)), true);
  assert.equal(atEnvoy.view().stage, 'pass-gate', 'terms in hand at the stockade: the envoy is now at Solis');
  const atLine = createBorderChapter();
  assert.equal(atLine.restore(legacy({ ordered: true, side: 'empire' }, 3)), true);
  assert.equal(atLine.view().side, 'empire', 'a save already past the envoy keeps its side');
  assert.equal(atLine.view().stage, 'report');
  assert.equal(validateBorderSnapshot(atLine.snapshot()), true);
  const fought = createBorderChapter();
  assert.equal(fought.restore(legacy({ ordered: true, side: 'coalition', outcome: 'defeat' }, 4)), true);
  assert.equal(fought.view().stage, 'complete'); assert.equal(fought.view().outcome, 'victory', 'a recorded defeat was a won fight rolled as lost: it comes back a victory');
  assert.equal(validateBorderSnapshot(legacy({ ordered: true, side: 'empire' }, 4)), false);
  assert.equal(validateBorderSnapshot(undefined), true);
});

test('each side’s encounter is a valid fight against the other side’s soldiers, with the allies placed on the line', () => {
  const world = { bounds: { minX: -900, maxX: 200, minZ: -300, maxZ: 700 }, colliders: [], heightAt: () => 2 };
  for (const [side, look] of [['empire', 'coalition'], ['coalition', 'legion']]) {
    const allies = [{ id: 'merc-gotwood', name: 'Chris Scotwood', kind: 'legionary' }, { id: 'ally-2', name: 'Soldier', kind: 'legionary' }, { id: 'ally-3', name: 'Captain', kind: 'officer' }];
    const config = borderEncounter(side, allies);
    assert.equal(config.enemies.length, 8);
    assert.ok(config.enemies.every(enemy => enemy.kind === 'soldier' && enemy.look === look));
    const position = { x: config.checkpoint.x, y: 2, z: config.checkpoint.z };
    const combat = createCombat({ world, position });
    assert.equal(combat.startEncounter(config), true, `${side} encounter validates`);
    assert.equal(combat.state.allies.length, 3);
    assert.deepEqual(combat.state.enemies.map(enemy => enemy.look), Array(8).fill(look));
    assert.ok(combat.state.enemies.filter(enemy => enemy.kind === 'soldier').length === 8);
  }
  assert.equal(borderEncounter('empire', Array.from({ length: 9 }, (_, i) => ({ id: `a${i}`, kind: 'legionary' }))).allies.length, 5, 'five stand with the traveler at most');
});

test('every living faction split fields all ten mercenaries once, in valid separated formations and the existing waves',()=>{
  const world={bounds:{minX:-900,maxX:200,minZ:-300,maxZ:700},colliders:[],heightAt:()=>2};
  const roster=Array.from({length:10},(_,i)=>({id:`merc-${i}`,npcId:`merc-${i}`,name:`Mercenary ${i}`,kind:'legionary',hp:73+i,
    model:{role:'mercenary',tunic:0x554433},x:999,z:999}));
  const before=structuredClone(roster);
  for(const side of ['empire','coalition'])for(let split=0;split<=roster.length;split++){
    const allies=roster.slice(0,split),opponents=roster.slice(split),config=borderMusterEncounter(side,{allies,opponents});
    assert.deepEqual(config.allies.map(a=>a.id),allies.map(a=>a.id));
    assert.deepEqual(config.enemies.filter(e=>e.npcId).map(e=>e.id),opponents.map(a=>a.id));
    const named=[...config.allies,...config.enemies.filter(e=>e.npcId)];
    assert.equal(named.length,10);assert.equal(new Set(named.map(a=>a.npcId)).size,10);
    for(const actor of named){const original=roster.find(r=>r.id===actor.id);assert.equal(actor.hp,original.hp);assert.deepEqual(actor.model,original.model);}
    for(const a of [...config.allies,...config.enemies])for(const b of [...config.allies,...config.enemies,config.checkpoint])
      if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=1.2,`${side}/${split}: ${a.id} overlaps ${b.id??'player'}`);
    // Additional host-assigned soldiers form behind the checkpoint. They must
    // not collide with the expanded mercenary rank, even with all ten present.
    const supports=Array.from({length:Math.min(6,16-config.allies.length)},(_,i)=>({id:`support-${i}`,kind:'legionary',
      x:config.center.x+((i%5)-2)*2.2+(i<5?0:1.1),z:config.center.z+(i<5?15.6:18)}));
    for(const extra of supports)for(const a of config.allies)
      assert.ok(Math.hypot(extra.x-a.x,extra.z-a.z)>=1.2,`${extra.id} overlaps ${a.id}`);
    const combat=createCombat({world,position:{...config.checkpoint,y:2}});
    assert.equal(combat.startEncounter({...config,allies:[...config.allies,...supports]}),true,`${side}/${split} roster validates`);
    assert.equal(combat.state.allies.length,config.allies.length+supports.length);
    const entries=config.enemies.map(e=>e.entry).sort((a,b)=>a-b);
    assert.equal(1+entries.slice(1).filter((entry,i)=>entry-entries[i]>2).length,3,'named opponents keep the three waves');
  }
  assert.deepEqual(roster,before,'building a fight does not mutate the world actors');
});

test('a repeated companion reference remains one combatant and the default four keep their positions',()=>{
  const allies=Array.from({length:4},(_,i)=>({id:`a-${i}`,npcId:`a-${i}`,kind:'legionary'}));
  const legacy=borderEncounter('empire',allies),live=borderMusterEncounter('empire',{allies:[...allies,allies[0]],opponents:[allies[0]]});
  assert.deepEqual(live,legacy);
});

/**
 * **The battle grows with the company** (the user, 2026-09-21): the enemy line grows with the size
 * of the traveler's company - more soldiers, never a higher level - so that ten companions meet a
 * fight worth ten. The two halves of the ruling are both pinned here: a short company meets
 * **exactly** today's eight, so the fill's own measurement is untouched; and every soldier the
 * growth adds is the same soldier, in the same waves, on ground the fight will accept.
 */
test('the line grows with the company, and a short company meets exactly the eight it always met', () => {
  // Below the floor the army is making his numbers up for him; a battle that grew at the same time
  // would be taking back what it just gave. Every row up to the floor is the eight.
  for (let company = 0; company <= FILE_FLOOR; company++)
    assert.equal(borderLine(company), 8, `a company of ${company} meets the line it always met`);
  assert.equal(borderLine(), 8, 'and so does a fight that does not say');
  assert.equal(borderLine(-3), 8); assert.equal(borderLine('nonsense'), 8);
  // Above it, one more soldier a companion, up to the largest line the fight can be given.
  for (let company = FILE_FLOOR + 1; company < BORDER_LINE.length; company++)
    assert.equal(borderLine(company), 8 + company - FILE_FLOOR, `a company of ${company}`);
  assert.equal(borderLine(MERCENARY_COMPANY_SIZE - 1), 12, 'the whole roster meets twelve');
  // And it never runs off the end: `encounterConfig` refuses a fight with more than twelve.
  for (const absurd of [11, 20, 999]) assert.equal(borderLine(absurd), 12, `${absurd} is still twelve`);
  assert.equal(borderEncounter('empire', [], 0).enemies.length, 8);
  assert.equal(borderEncounter('empire', [], 10).enemies.length, 12);
  // The eight a short company meets are the same eight, to the metre and the second.
  const small = borderEncounter('empire', [], 3).enemies, big = borderEncounter('empire', [], 10).enemies;
  assert.deepEqual(small, big.slice(0, 8), 'the authored eight are untouched by the growth');
});

test('every soldier the growth adds is the same soldier, in the same waves, on ground the fight accepts', () => {
  const world = { bounds: { minX: -900, maxX: 200, minZ: -300, maxZ: 700 }, colliders: [], heightAt: () => 2 };
  for (const side of ['empire', 'coalition']) for (let company = 0; company < BORDER_LINE.length; company++) {
    const config = borderEncounter(side, [{ id: 'ally-1', kind: 'legionary' }, { id: 'ally-2', kind: 'legionary' }], company);
    assert.equal(config.enemies.length, borderLine(company));
    // **More soldiers, never a higher level.** Nothing an added man carries differs from the eight.
    const kinds = new Set(config.enemies.map(foe => `${foe.kind}/${foe.look}/${foe.hp}`));
    assert.equal(kinds.size, 1, `a company of ${company} meets more than one kind of soldier: ${[...kinds]}`);
    assert.ok(config.enemies.every(foe => foe.level === undefined), 'and no man of it is authored a level');
    assert.equal(new Set(config.enemies.map(foe => foe.id)).size, config.enemies.length, 'each is his own man');
    // Three waves, however many come: a wave is entries with no gap of more than two seconds, and
    // the captains promise three (tests/quest-directions.test.js).
    const entries = config.enemies.map(foe => foe.entry).sort((a, b) => a - b);
    let waves = 1;
    for (let i = 1; i < entries.length; i++) if (entries[i] - entries[i - 1] > 2) waves++;
    assert.equal(waves, 3, `a company of ${company} brings on ${waves} waves`);
    // Nobody stands on anybody, theirs or ours, and the whole line is inside the ground
    // `encounterConfig` will accept - which the fight starting proves, but say why it failed.
    const along = p => p.z - config.center.z, across = p => p.x - config.center.x;
    for (const foe of config.enemies) {
      assert.ok(along(foe) >= -21 && along(foe) <= 18 && Math.abs(across(foe)) <= 12,
        `${foe.id} stands at ${along(foe).toFixed(1)} along, ${across(foe).toFixed(1)} across`);
      for (const mate of config.enemies) if (mate !== foe)
        assert.ok(Math.hypot(foe.x - mate.x, foe.z - mate.z) >= 1.2, `${foe.id} stands on ${mate.id}`);
      // And clear of every place a man of the traveler's side can be put: the side's own five
      // (`ALLY_SPOTS`) and the file, which forms up on the checkpoint and behind it.
      for (const spot of [...config.allies, config.checkpoint])
        assert.ok(Math.hypot(foe.x - spot.x, foe.z - spot.z) >= 1.2, `${foe.id} stands where one of ours does`);
    }
    const position = { x: config.checkpoint.x, y: 2, z: config.checkpoint.z };
    assert.equal(createCombat({ world, position }).startEncounter(config), true,
      `${side} refuses the line for a company of ${company}`);
  }
});

/**
 * The captain is the one who says how many, because he is the man who already gives the traveler
 * the word at the line - and he says nothing at all about the eight, because a captain who remarks
 * on eight men every single time is a captain nobody listens to.
 */
test('the captain says how many, truthfully, and only when it has changed', () => {
  for (const side of ['empire', 'coalition']) {
    for (const company of [0, 3, 6]) assert.deepEqual(borderLineSaid(side, borderLine(company)), [],
      `a company of ${company} is told nothing, because nothing has changed`);
    for (const [company, word] of [[7, 'nine'], [8, 'ten'], [9, 'eleven'], [10, 'twelve']]) {
      const said = borderLineSaid(side, borderLine(company));
      assert.equal(said.length, 2, 'two short sentences and no more');
      assert.ok(said.every(sentence => sentence.length < 160), 'short');
      assert.match(said[0], new RegExp(word), `a company of ${company} is told there are ${word}`);
      assert.match(said[0], /eight/, 'and what it was before');
    }
    assert.deepEqual(borderLineSaid(side, 99), [], 'and a number the table cannot make is not said');
  }
  assert.notDeepEqual(borderLineSaid('empire', 12), borderLineSaid('coalition', 12), 'each captain has his own voice');
  // The panel names no number at all, because it is written once for every size of the line.
  const border = createBorderChapter(); border.start();
  for (const id of ['take-legate-terms', 'enter-solis', 'side-empire', 'march-out', 'reach-line']) border.act(id);
  const fighting = border.view();
  assert.equal(fighting.stage, 'fighting');
  assert.doesNotMatch(fighting.detail, /Eight|eight|Ten|ten of/, 'the panel counts nobody');
  assert.match(fighting.detail, /three waves/, 'and still promises the three waves that come');
});

test('the Marshal, the gate, the envoy and the commanders speak only in their turn, and the envoy names the Coalition truly', () => {
  const border = createBorderChapter(), screens = [], acts = [];
  const context = { border, musterCount: 7, openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, options }), closeDialogue: () => {}, act: id => { acts.push(id); return border.act(id); } };
  const npc = id => BORDER_NPCS.find(person => person.id === id) ?? { id };
  assert.equal(borderConversation(npc(BORDER_LEGATE_ID), context), false);
  border.start();
  assert.equal(borderConversation(npc('coalition-envoy'), context), true, 'the envoy answers');
  assert.equal(screens.at(-1).options, undefined, 'but has nothing to offer a man without terms');
  assert.equal(borderConversation(npc(BORDER_LEGATE_ID), context), true);
  // The company is eleven, the traveler among them (`MERCENARY_COMPANY_SIZE`), and the
  // Marshal counts in the same numbers the journal's company line shows the player.
  assert.match(screens.at(-1).lines[0], /7 of 11/);
  assert.match(screens.at(-1).lines.join(' '), /Solis/);
  screens.at(-1).options.choices.find(choice => choice.id === 'take-legate-terms').action();
  border.act('enter-solis'); acts.push('enter-solis');
  assert.equal(borderConversation(npc('coalition-envoy'), context), true);
  const speech = screens.at(-1).lines.join(' ');
  for (const member of ['Izoli', 'Suvali', 'Luscia', 'Pyros', 'Selemis', 'Marosh', 'island cities']) assert.match(speech, new RegExp(member));
  assert.doesNotMatch(speech, /South Pyros/);
  assert.deepEqual(screens.at(-1).options.choices.map(choice => choice.id), ['side-empire', 'side-coalition', 'leave-border']);
  screens.at(-1).options.choices.find(choice => choice.id === 'side-coalition').action();
  assert.equal(borderConversation(npc('solis-captain'), context), true, 'Voss asks at the gate');
  assert.equal(screens.at(-1).lines.at(-1), 'Are you ready?');
  assert.deepEqual(screens.at(-1).options.choices.map(choice => [choice.id, choice.label]), [['march-out', 'Yes.'], ['leave-border', 'Give me a moment.']]);
  screens.at(-1).options.choices[0].action();
  assert.equal(borderConversation(npc('coalition-captain'), context), true);
  screens.at(-1).options.choices.find(choice => choice.id === 'reach-line').action();
  assert.deepEqual(acts, ['take-legate-terms', 'enter-solis', 'side-coalition', 'march-out', 'reach-line']);
  assert.equal(border.view().stage, 'fighting');
  // The Empire's report goes to the Marshal, with the same question.
  const empire = createBorderChapter(); empire.start(); empire.act('take-legate-terms'); empire.act('enter-solis'); empire.act('side-empire');
  assert.equal(borderConversation(npc(BORDER_LEGATE_ID), { ...context, border: empire }), true);
  assert.equal(screens.at(-1).lines.at(-1), 'Are you ready?');
  assert.deepEqual(screens.at(-1).options.choices.map(choice => choice.label), ['Yes.', 'Give me a moment.']);
});

test('the envoy and her escort wait in Solis, the line at the border, and a marching column keeps a file behind the traveler', () => {
  for (const id of ['coalition-envoy', 'envoy-guard-north', 'envoy-guard-south', 'solis-captain']) {
    const person = BORDER_NPCS.find(npc => npc.id === id);
    assert.equal(hexOwnerAt(person.x, person.z), 'West Suval', `${person.name} is in West Suval`);
  }
  for (const id of ['battle-tribune', 'coalition-captain']) {
    const person = BORDER_NPCS.find(npc => npc.id === id);
    assert.equal(hexOwnerAt(person.x, person.z), 'Moros Plain', `${person.name} holds the line on the Moros side`);
  }
  assert.deepEqual(BORDER_MARCHERS, ['march-legionary-1', 'march-legionary-2', 'march-valley-1', 'march-valley-2', 'march-valley-3', 'march-valley-4']);
  const traveler = { x: 10, z: 20 }, heading = Math.PI / 2;   // walking east
  const slots = [0, 1, 2, 3].map(index => marchSlot(index, traveler, heading));
  for (const slot of slots) {
    assert.ok(slot.x < traveler.x, 'behind the traveler');
    assert.ok(Math.hypot(slot.x - traveler.x, slot.z - traveler.z) < MARCH.catchUp / 2);
  }
  assert.ok(slots[2].x < slots[0].x, 'the second pair walks behind the first');
  assert.ok(Math.sign(slots[0].z - traveler.z) !== Math.sign(slots[1].z - traveler.z), 'two abreast');
});
