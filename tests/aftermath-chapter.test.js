import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS } from '../src/campaign.js';
import { AFTERMATH_VARIANTS, AFTERMATH_IDS, AFTERMATH_NPCS, AFTERMATH_SITE_IDS, AFTERMATH_ARENA_IDS, AFTERMATH_LEGATE_ID, aftermathFor, aftermathEncounter,
  createAftermathChapter, validateAftermathSnapshot, aftermathConversation } from '../src/aftermath-chapter.js';

const ARENA_Z = { center: { x: -392, z: 308 }, retreatAxis: 'z' };
const ARENA_X = { center: { x: 120, z: 640 }, retreatAxis: 'x' };
const allies = count => Array.from({ length: count }, (_, index) => ({ id: `ally-${index}`, name: 'Ally', kind: 'legionary' }));

test('the four variants are exactly the chapters the campaign reaches from the border battle', () => {
  const outcomes = CHAPTERS['border-battle'].outcomes;
  const reached = [outcomes.empire.victory, outcomes.empire.defeat, outcomes.coalition.victory, outcomes.coalition.defeat];
  assert.deepEqual([...AFTERMATH_IDS].sort(), [...reached].sort());
  for (const side of ['empire', 'coalition']) for (const outcome of ['victory', 'defeat']) {
    const id = aftermathFor(side, outcome);
    assert.equal(id, outcomes[side][outcome], `${side} ${outcome}`);
    const spec = AFTERMATH_VARIANTS[id];
    assert.equal(spec.region, CHAPTERS[id].region, `${id} happens where the campaign says`);
    assert.equal(spec.title, CHAPTERS[id].title);
    assert.equal(CHAPTERS[id].side, side);
    // You fight the other side's soldiers, and only the Empire pays a full purse in coin.
    assert.equal(spec.foe, side === 'empire' ? 'coalition' : 'legion');
    assert.ok(spec.reward > 0 && Number.isSafeInteger(spec.reward));
  }
  assert.equal(aftermathFor('empire', 'draw'), null);
});

test('every person and place a variant names exists', () => {
  const people = new Set([...AFTERMATH_NPCS.map(npc => npc.id), AFTERMATH_LEGATE_ID]);
  for (const spec of Object.values(AFTERMATH_VARIANTS)) {
    assert.ok(people.has(spec.commanderId) && people.has(spec.principalId), spec.id);
    assert.ok(AFTERMATH_SITE_IDS.includes(spec.rallySite));
    // The Legate keeps his tent; everyone else needs somewhere to stand for the report.
    assert.equal(spec.reportSite === null, spec.principalId === AFTERMATH_LEGATE_ID, spec.id);
    assert.ok(AFTERMATH_ARENA_IDS.includes(spec.arena));
    for (const lines of [spec.orders, spec.debrief, spec.after]) assert.ok(lines.length && lines.every(line => typeof line === 'string' && line.length > 5 && !/South Pyros|not built/i.test(line)));
    assert.match(spec.onward, /not built yet/);
  }
  // Only the Legion's people wear its armor.
  assert.deepEqual(AFTERMATH_NPCS.filter(npc => npc.modelRole.startsWith('legion')).map(npc => npc.id), ['aftermath-tribune']);
});

test('an encounter fits the combat rules on either axis', () => {
  for (const id of AFTERMATH_IDS) for (const arena of [ARENA_Z, ARENA_X]) {
    const config = aftermathEncounter(id, arena, allies(6));
    const axis = arena.retreatAxis, cross = axis === 'x' ? 'z' : 'x';
    assert.equal(config.id, `aftermath-${id}`);
    assert.equal(config.enemies.length, 5);
    assert.equal(config.allies.length, 4, 'no more allies than places to stand');
    assert.equal(config.retreatLine, arena.center[axis] + 21);
    for (const enemy of config.enemies) {
      const along = enemy[axis] - arena.center[axis], across = enemy[cross] - arena.center[cross];
      assert.ok(Math.abs(across) <= 12 && along >= -21 && along <= 18 && enemy[axis] < config.retreatLine, `${enemy.id} ${across}/${along}`);
      assert.equal(enemy.kind, 'soldier');
      assert.equal(enemy.look, AFTERMATH_VARIANTS[id].foe);
    }
    for (const ally of config.allies) assert.ok(ally[axis] > arena.center[axis] && ally[axis] < config.retreatLine, 'allies form up behind the traveler, inside the line');
    assert.ok(config.checkpoint[axis] < config.retreatLine && config.checkpoint[axis] > arena.center[axis]);
    assert.equal(new Set(config.enemies.map(enemy => enemy.id)).size, 5);
  }
  assert.equal(aftermathEncounter('border-battle', ARENA_Z), null);
  assert.equal(aftermathEncounter('solis-sweep', { center: { x: 0, z: NaN }, retreatAxis: 'z' }), null);
  assert.equal(aftermathEncounter('solis-sweep', { center: { x: 0, z: 0 }, retreatAxis: 'y' }), null);
});

test('a variant runs rally, fight and report, and pays once', () => {
  for (const id of AFTERMATH_IDS) {
    const events = [], chapter = createAftermathChapter({ onEvent: event => events.push(event) }), spec = AFTERMATH_VARIANTS[id];
    assert.equal(chapter.view().stage, 'not-started');
    assert.deepEqual(chapter.cast(), []);
    assert.equal(chapter.act('begin-assault').ok, false);
    assert.equal(chapter.start('border-battle').ok, false);
    assert.equal(chapter.start(id).ok, true);
    assert.equal(chapter.start(id).ok, false, 'a chapter starts once');

    let view = chapter.view();
    assert.deepEqual([view.stage, view.step, view.objectiveId, view.siteId], ['rally', 1, spec.commanderId, spec.rallySite]);
    assert.deepEqual(chapter.cast(), [{ id: spec.commanderId, site: spec.rallySite }]);
    assert.equal(chapter.act('close-aftermath').ok, false, 'no pay before the work');

    const begun = chapter.act('begin-assault');
    assert.equal(begun.startEncounter, spec.encounterId);
    assert.equal(chapter.view().stage, 'fighting');
    assert.equal(chapter.snapshot().revision, 1, 'starting a fight is not progress');
    // Driven off: the commander waits and the word can be given again.
    assert.equal(chapter.endEncounter('border-battle-line').ok, false);
    assert.equal(chapter.endEncounter(spec.encounterId).ok, true);
    assert.equal(chapter.view().stage, 'rally');
    assert.equal(chapter.winEncounter(spec.encounterId).ok, false, 'a fight that is not on cannot be won');
    chapter.act('begin-assault');
    assert.equal(chapter.winEncounter(spec.encounterId).ok, true);

    view = chapter.view();
    assert.deepEqual([view.stage, view.step, view.objectiveId, view.siteId], ['report', 3, spec.principalId, spec.reportSite]);
    assert.deepEqual(chapter.cast(), spec.principalId === AFTERMATH_LEGATE_ID ? [] : [{ id: spec.principalId, site: spec.reportSite }]);
    const closed = chapter.act('close-aftermath');
    assert.deepEqual([closed.ok, closed.reward, closed.campaignChapter], [true, spec.reward, id]);
    assert.equal(chapter.act('close-aftermath').ok, false, 'paid once');
    view = chapter.view();
    assert.equal(view.complete, true);
    assert.match(view.detail, /not built yet/);
    assert.match(view.kicker, /DONE$/);
    assert.deepEqual(events.map(event => event.actionId), ['start-chapter', 'win-aftermath-fight', 'close-aftermath']);
    assert.deepEqual(events.map(event => event.sequence), [1, 2, 3]);
  }
});

test('snapshots round-trip at every stage and reject nonsense', () => {
  const chapter = createAftermathChapter();
  const stages = [() => {}, () => chapter.start('moros-outpost'), () => { chapter.act('begin-assault'); chapter.winEncounter('aftermath-moros-outpost'); }, () => chapter.act('close-aftermath')];
  for (const advance of stages) {
    advance();
    const saved = chapter.snapshot();
    assert.equal(validateAftermathSnapshot(saved), true);
    const copy = createAftermathChapter();
    assert.equal(copy.restore(JSON.parse(JSON.stringify(saved))), true);
    assert.deepEqual(copy.view(), chapter.view());
  }
  // A fight in progress is never saved: a restored chapter is back with its commander.
  const fighting = createAftermathChapter();
  fighting.start('solis-sweep'); fighting.act('begin-assault');
  const resumed = createAftermathChapter();
  resumed.restore(fighting.snapshot());
  assert.equal(resumed.view().stage, 'rally');

  assert.equal(validateAftermathSnapshot(undefined), true);
  assert.equal(validateAftermathSnapshot(undefined, { allowMissing: false }), false);
  const good = { version: 1, revision: 2, variant: 'solis-sweep', cleared: true, complete: false };
  assert.equal(validateAftermathSnapshot(good), true);
  for (const bad of [{ ...good, variant: 'border-battle' }, { ...good, revision: 3 }, { ...good, variant: null }, { ...good, cleared: false, complete: true, revision: 2 },
    { ...good, extra: 1 }, { ...good, version: 2 }, { ...good, cleared: 'yes' }, null, []]) assert.equal(validateAftermathSnapshot(bad), false, JSON.stringify(bad));
  assert.equal(createAftermathChapter().restore({ ...good, revision: 9 }), false);
});

test('the commander gives the orders, the principal pays, and nobody else speaks for the chapter', () => {
  for (const id of AFTERMATH_IDS) {
    const spec = AFTERMATH_VARIANTS[id], aftermath = createAftermathChapter(), opened = [], acted = [];
    const context = { aftermath, openDialogue: (npc, lines, _, __, options) => opened.push({ npc: npc.id, lines, choices: options?.choices ?? [] }), closeDialogue: () => {}, act: action => { acted.push(action); return aftermath.act(action); } };
    assert.equal(aftermathConversation({ id: spec.commanderId }, context), false, 'silent before the battle');
    aftermath.start(id);
    assert.equal(aftermathConversation({ id: 'mara' }, context), false);
    assert.equal(aftermathConversation({ id: spec.commanderId }, context), true);
    assert.deepEqual(opened.at(-1).lines, spec.orders);
    assert.deepEqual(opened.at(-1).choices.map(choice => choice.id), ['begin-assault', 'leave-aftermath']);
    opened.at(-1).choices[0].action();
    assert.deepEqual(acted, ['begin-assault']);
    aftermath.winEncounter(spec.encounterId);
    assert.equal(aftermathConversation({ id: spec.principalId }, context), true);
    assert.deepEqual(opened.at(-1).lines, spec.debrief);
    opened.at(-1).choices[0].action();
    assert.equal(aftermath.view().complete, true);
    assert.equal(aftermathConversation({ id: spec.principalId }, context), true);
    assert.deepEqual([opened.at(-1).lines, opened.at(-1).choices], [spec.after, []]);
  }
});
