import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS } from '../src/campaign.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AFTERMATH_VARIANTS, AFTERMATH_IDS, AFTERMATH_NPCS, AFTERMATH_SITE_IDS, AFTERMATH_ARENA_IDS, AFTERMATH_LEGATE_ID, aftermathFor, aftermathEncounter,
  createAftermathChapter, validateAftermathSnapshot, aftermathConversation, SIDE_GIFT, sideGiftOwed, GIFT_LINES, CAP_LINES } from '../src/aftermath-chapter.js';
import { armourOf, tierSoldAt, tiernamed, validPiece, WEIGHTS, NAMED_TIERS, TIERS } from '../src/gear.js';
import { SELLER_TIERS } from '../src/smith.js';
import { regionLevel } from '../src/region-levels.js';

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
    // The Marshal keeps his tent; everyone else needs somewhere to stand for the report.
    assert.equal(spec.reportSite === null, spec.principalId === AFTERMATH_LEGATE_ID, spec.id);
    assert.ok(AFTERMATH_ARENA_IDS.includes(spec.arena));
    for (const lines of [spec.orders, spec.debrief, spec.after]) assert.ok(lines.length && lines.every(line => typeof line === 'string' && line.length > 5 && !/South Pyros|not built/i.test(line)));
    // `onward` says where the frontier is, and the two sides have different ones: an Empire
    // sellsword can ride to Ambron and only the chapter there is missing, while no ship exists
    // to carry a Republic one to Izolveth at all.
    assert.match(spec.onward, /not built/);
    assert.match(spec.onward, spec.side === 'empire' ? /Ambron/ : /West Izol|Izolveth/);
  }
  // Only the army's people wear its armor.
  assert.deepEqual(AFTERMATH_NPCS.filter(npc => npc.modelRole.startsWith('legion')).map(npc => npc.id), ['aftermath-tribune']);
});

test('an encounter fits the combat rules on either axis', () => {
  for (const id of AFTERMATH_IDS) for (const arena of [ARENA_Z, ARENA_X]) {
    const config = aftermathEncounter(id, arena, allies(6));
    const axis = arena.retreatAxis, cross = axis === 'x' ? 'z' : 'x';
    assert.equal(config.id, `aftermath-${id}`);
    assert.equal(config.enemies.length, 7);
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
    assert.equal(new Set(config.enemies.map(enemy => enemy.id)).size, 7);
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
    assert.match(view.detail, /not built/);
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

test('your side arms you in fine steel for the border, once, from whoever rallies you', () => {
  // The user, 2026-09-21: the side the traveler signed with gives fine steel as a reward for
  // service, beginning after the border battle is won. Nobody sells it at any price, anywhere.
  assert.equal(tiernamed(SIDE_GIFT.tier), 'fine steel');
  assert.equal(SIDE_GIFT.tier, NAMED_TIERS, 'and it is the best material that has a name');
  // The table puts it in level-7 country, and no country with a forge standing in it is close.
  assert.equal(TIERS[SIDE_GIFT.tier].sold, 7);
  for (const country of ['Drent', 'Moros Plain', 'Amod', 'Elagos'])
    assert.ok(tierSoldAt(regionLevel(country)) < SIDE_GIFT.tier, `${country} has a forge in it and it sells fine steel`);
  assert.ok(!Object.values(SELLER_TIERS).some(tiers => tiers.includes(SIDE_GIFT.tier)),
    'and the capital’s exception does not reach it either');
  // One piece, the body, in mail - and the weight is the arithmetic's choice, not the picture's.
  assert.equal(SIDE_GIFT.slot, 'body');
  assert.ok(validPiece(SIDE_GIFT), 'a piece the game actually has');
  const turned = weight => armourOf({ body: { weight, tier: SIDE_GIFT.tier } }).turns;
  const bogMail = armourOf({ body: { weight: 'medium', tier: 1 } }).turns;
  assert.ok(turned('light') < bogMail, 'a fine steel jack would turn less than the mail a smith already sells');
  assert.ok(turned('medium') > bogMail, 'and the mail coat is a real step above it');
  assert.equal(SIDE_GIFT.weight, 'medium');
  // Plate is legal at this tier and is not the gift: it would cost him a quarter of his dodge and
  // double the wind he spends in the water, which is a trap and not a thank-you.
  assert.equal(WEIGHTS.heavy.fromTier, 3);
  assert.ok(validPiece({ weight: 'heavy', tier: SIDE_GIFT.tier }));
  assert.equal(armourOf({ body: SIDE_GIFT }).dodge, WEIGHTS.medium.dodge, 'it costs the tenth any mail costs');
  assert.equal(armourOf({ body: SIDE_GIFT }).wind, 1, 'and nothing at all in the water');

  // **Owed until he is wearing it**, and that is the whole of the record: nothing else makes
  // tier-4 armour and nothing takes a piece off, so no save field was added.
  assert.equal(sideGiftOwed(null), true);
  assert.equal(sideGiftOwed({ weight: 'medium', tier: 1 }), true);
  assert.equal(sideGiftOwed({ weight: 'heavy', tier: 3 }), true, 'the best a smith sells is still not fine steel');
  assert.equal(sideGiftOwed({ weight: 'medium', tier: SIDE_GIFT.tier }), false);

  // Each side's own captain says it, in the voice he already has, and nobody else has lines.
  const givers = new Set(Object.keys(GIFT_LINES));
  for (const id of AFTERMATH_IDS) {
    const spec = AFTERMATH_VARIANTS[id];
    assert.ok(givers.has(spec.commanderId), `${id} has nobody to hand it over`);
    const lines = GIFT_LINES[spec.commanderId];
    assert.ok(lines.length === 2 && lines.every(line => line.length > 40));
    assert.match(lines.join(' '), /fine steel/i, `${spec.commanderId} does not say what it is`);
  }
  assert.deepEqual([...givers].sort(), ['aftermath-captain', 'aftermath-tribune']);
  assert.notDeepEqual(GIFT_LINES['aftermath-tribune'], GIFT_LINES['aftermath-captain'], 'two men, two voices');

  // The scene takes it from the host and says it before the orders, and only at the rally.
  for (const id of AFTERMATH_IDS) {
    const spec = AFTERMATH_VARIANTS[id], aftermath = createAftermathChapter(), opened = [];
    const gift = [...GIFT_LINES[spec.commanderId]];
    const context = { aftermath, openDialogue: (npc, lines, _, __, options) => opened.push({ npc: npc.id, lines, choices: options?.choices ?? [] }),
      closeDialogue: () => {}, act: action => aftermath.act(action), gift };
    aftermath.start(id);
    assert.equal(aftermathConversation({ id: spec.commanderId }, context), true);
    assert.deepEqual(opened.at(-1).lines, [...gift, ...spec.orders], 'the coat comes before the next order');
    // Said once: the host stops handing it over, and the same conversation is the orders alone.
    assert.equal(aftermathConversation({ id: spec.commanderId }, { ...context, gift: [] }), true);
    assert.deepEqual(opened.at(-1).lines, spec.orders);
    // **And the debrief has a gift of its own**: the fine steel cap that comes with the pay (the
    // user, 2026-09-21). The scene says whatever the host hands it and decides nothing itself, so
    // the coat is not repeated there - the host stops offering it - and the cap is.
    aftermath.act('begin-assault'); aftermath.winEncounter(spec.encounterId);
    assert.equal(aftermathConversation({ id: spec.principalId }, { ...context, gift: [] }), true);
    assert.deepEqual(opened.at(-1).lines, spec.debrief, `${id} says something over the pay it was not handed`);
    const cap = [...CAP_LINES[spec.principalId]];
    assert.equal(aftermathConversation({ id: spec.principalId }, { ...context, gift: cap }), true);
    assert.deepEqual(opened.at(-1).lines, [...cap, ...spec.debrief], `${id} drops the cap the host handed it`);
  }
});

test('the host gives the fine steel at the two moments the side has him, and nothing new is saved', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  // **The stage picks the piece and the speaker**: the captain who rallies him gives the coat,
  // and whoever counts out the pay gives the cap. Nowhere else, and nobody else.
  assert.match(main, /const speaker=stage==='rally'\?chapter\.commanderId:stage==='report'\?chapter\.principalId:null;/);
  assert.match(main, /if\(!speaker\|\|npc\.id!==speaker\)return \[\];/);
  assert.match(main, /const gift=SIDE_GIFTS\[stage\],lines=stage==='rally'\?GIFT_LINES\[speaker\]:CAP_LINES\[speaker\];/);
  // The fine steel on him is the record, asked of the gear that already saves.
  assert.match(main, /!giftOwed\(gift,gear\.wearing\(gift\.slot\)\)/);
  assert.match(main, /gear\.wear\(gift\.slot,\{weight:gift\.weight,tier:gift\.tier\}\)/);
  assert.match(main, /gift:giveSideGift\(npc\)/, 'and the scene is handed it the way it is handed the file fill');
  // Nothing anywhere takes a piece of armour off again, which is what makes the record permanent.
  assert.ok(!/gear\.takeOff\(/.test(main), 'the host can take armour off now, so wearing it no longer proves it was given');
});

test('every assault after the battle forms up inside its own ground, wherever its commander stands', async () => {
  const { createCombat } = await import('../src/combat.js');
  const { AFTERMATH_VARIANTS, aftermathEncounter } = await import('../src/aftermath-chapter.js');
  const { aftermathArena, aftermathSite } = await import('../src/aftermath-sites.js');
  const world = { bounds: { minX: -3000, maxX: 3000, minZ: -3000, maxZ: 3000 }, colliders: [], heightAt: () => 5 };
  for (const [id, spec] of Object.entries(AFTERMATH_VARIANTS)) {
    const fight = aftermathEncounter(id, aftermathArena(spec.arena));
    const axis = fight.retreatAxis;
    assert.ok(fight.retreatSign * (fight.retreatLine - fight.checkpoint[axis]) >= 6, `${id}: the company forms up well inside its retreat line`);
    assert.ok(Math.hypot(fight.checkpoint.x - fight.center.x, fight.checkpoint.z - fight.center.z) < 40, `${id}: and near the fight`);
    // The word is given beside the commander at the rally: for the Empire's Solis, on the road north of the gate it storms.
    const rally = aftermathSite(spec.rallySite);
    const position = { x: rally.x, y: 5, z: rally.z };
    const combat = createCombat({ world, position });
    assert.equal(combat.startEncounter(fight, { atCheckpoint: true }), true, id);
    for (let step = 0; step < 60; step++) combat.update(1 / 60);
    assert.equal(combat.state.phase, 'active', `${id}: ordered at the rally, the assault is still on a second later`);
  }
});

test('a fallback chapter saved from a won-but-rolled border battle starts over, so the conquest can begin', () => {
  for (const fallback of ['moros-fallback', 'solis-fallback']) {
    const old = createAftermathChapter(); old.start(fallback); old.act('begin-assault'); old.winEncounter(`aftermath-${fallback}`);
    const loaded = createAftermathChapter();
    assert.equal(loaded.restore(old.snapshot()), true);
    assert.equal(loaded.state.variant, null, 'not started: the host starts the conquest the campaign points to');
    assert.equal(loaded.start(fallback === 'moros-fallback' ? 'solis-sweep' : 'moros-outpost').ok, true);
  }
});

test('the Empire storms the Gate of Sun Horses from the road outside it, and the Coalition holds it', async () => {
  const { aftermathArena, aftermathSite } = await import('../src/aftermath-sites.js');
  const spec = AFTERMATH_VARIANTS['solis-sweep'], arena = aftermathArena(spec.arena), fight = aftermathEncounter('solis-sweep', arena);
  const gate = aftermathSite('solis-gate'), rally = aftermathSite(spec.rallySite);
  assert.equal(fight.retreatSign, -1, 'the way out runs north, up the road');
  assert.ok(rally.z < gate.z - 30, 'the army forms up north of the gate, outside the city');
  assert.ok(fight.checkpoint.z < fight.center.z && fight.retreatLine < fight.checkpoint.z, 'the traveler starts on the road side');
  assert.ok(fight.enemies.every(enemy => enemy.z > fight.center.z), 'the defenders stand between the traveler and the gate');
  assert.ok(Math.max(...fight.enemies.map(enemy => enemy.z)) > gate.z + 2, 'and the last of them come out of the gateway');
  assert.match(spec.fight.join(' '), /Gate of Sun Horses/);
});
