import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCampaign, settleBorderBattle } from '../src/campaign.js';
import { createBorderChapter, BORDER_ENCOUNTER_ID } from '../src/border-chapter.js';
import { createAftermathChapter, aftermathConversation, AFTERMATH_VARIANTS, SIDE_GIFT, SIDE_CAP, SIDE_GIFTS, sideGiftOwed, giftOwed, GIFT_LINES, CAP_LINES, AFTERMATH_LEGATE_ID } from '../src/aftermath-chapter.js';
import { aftermathBuilt, aftermathSite } from '../src/aftermath-sites.js';
import { createGear, validateGearSnapshot, WEIGHTS, smithStock, tierScale, MOST_TURNED, armourOf } from '../src/gear.js';

const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');

/**
 * **`giveSideGift`'s rule, written out once so the test drives the host's rule rather than a
 * second idea of it** - and pinned against the host's own source below, the way
 * `tests/fights-with-company.test.js` pins `placeFor`. Everything the host does around it -
 * the toast, the sound, `saveRoad(false)` - is not a decision and is left out.
 *
 * **Two pieces, at the two moments the side has him in front of it**: the coat at the rally from
 * the man who gives him the work, the cap at the debrief from the man who counts out the pay.
 * One table, one rule, and the stage picks both the piece and the speaker.
 */
function giveSideGift(npc, { aftermath, gear }) {
  const chapter = aftermath.spec;
  if (!chapter) return [];
  const stage = aftermath.view().stage;
  const speaker = stage === 'rally' ? chapter.commanderId : stage === 'report' ? chapter.principalId : null;
  if (!speaker || npc.id !== speaker) return [];
  const gift = SIDE_GIFTS[stage], lines = stage === 'rally' ? GIFT_LINES[speaker] : CAP_LINES[speaker];
  if (!gift || !lines || !giftOwed(gift, gear.wearing(gift.slot), gear.view().owned)) return [];
  const worn = gear.wear(gift.slot, { weight: gift.weight, tier: gift.tier });
  if (!worn.ok) return [];
  return [...lines];
}

test('the copy of the host rule cannot drift from the host', () => {
  assert.match(main, /function giveSideGift\(npc\)\{/);
  assert.match(main, /const chapter=aftermath\.spec;/);
  assert.match(main, /if\(!chapter\)return \[\];/);
  assert.match(main, /const stage=aftermath\.view\(\)\.stage;/);
  assert.match(main, /const speaker=stage==='rally'\?chapter\.commanderId:stage==='report'\?chapter\.principalId:null;/);
  assert.match(main, /if\(!speaker\|\|npc\.id!==speaker\)return \[\];/);
  assert.match(main, /const gift=SIDE_GIFTS\[stage\],lines=stage==='rally'\?GIFT_LINES\[speaker\]:CAP_LINES\[speaker\];/);
  assert.match(main, /if\(!gift\|\|!lines\|\|!giftOwed\(gift,gear\.wearing\(gift\.slot\),gear\.view\(\)\.owned\)\)return \[\];/);
  assert.match(main, /const worn=gear\.wear\(gift\.slot,\{weight:gift\.weight,tier:gift\.tier\}\);/);
  assert.match(main, /if\(!worn\.ok\)return \[\];/);
  assert.match(main, /return \[\.\.\.lines\];/);
  // And the one place it is called from: the same argument list that carries the file fill.
  assert.match(main, /aftermathConversation\(npc,\{aftermath,openDialogue,closeDialogue,act:aftermathAct,fill:fillSaid\(\),gift:giveSideGift\(npc\)\}\)/);
  // The chapter it belongs to is started by the host the moment the border battle is complete.
  assert.match(main, /if\(border\.state\.complete&&!aftermath\.state\.variant&&AFTERMATH_VARIANTS\[campaign\.view\(\)\.chapterId\]\)aftermath\.start\(campaign\.view\(\)\.chapterId\);/);
  // And the coat is in the save and comes back out of it.
  assert.match(main, /gear:gear\.snapshot\(\)/);
  assert.match(main, /gear\.restore\(saved\.gear\?\?createGear\(\)\.snapshot\(\)\)/);
});

/** The arc from the road into Drent to the day after the border battle, module by module. */
function play(side) {
  const campaign = createCampaign(), border = createBorderChapter(), aftermath = createAftermathChapter(), gear = createGear();
  for (const id of ['drent-road', 'luscia-aftermath', 'moros-camp']) assert.equal(campaign.completeChapter(id).ok, true, id);
  assert.equal(campaign.view().chapterId, 'suval-envoy');
  assert.equal(campaign.chooseSide(side).ok, true);
  assert.equal(campaign.view().chapterId, 'border-battle');

  border.start();
  for (const action of ['take-legate-terms', 'enter-solis', side === 'empire' ? 'side-empire' : 'side-coalition', 'march-out'])
    assert.equal(border.act(action).ok, true, action);
  assert.equal(border.view().side, side);
  // The host's refreshQuest runs on every step of this; before the fight is decided it starts nothing.
  const refreshQuest = () => { if (border.state.complete && !aftermath.state.variant && AFTERMATH_VARIANTS[campaign.view().chapterId]) aftermath.start(campaign.view().chapterId); };
  refreshQuest();
  assert.equal(aftermath.state.variant, null, 'no chapter after the battle before the battle');
  // Marching up starts the fight; holding the corner wins the day (src/main.js:4682).
  assert.equal(border.act('reach-line').startEncounter, BORDER_ENCOUNTER_ID);
  const verdict = border.resolveBattle(BORDER_ENCOUNTER_ID);
  assert.equal(verdict.ok, true);
  assert.equal(campaign.completeChapter('border-battle', verdict.outcome).ok, true);
  refreshQuest();
  return { campaign, border, aftermath, gear, refreshQuest };
}

/** The host's talk(), for the people the chapter after the battle owns. */
function speakTo(npc, { aftermath, gear, opened = [], acted = [] }) {
  const context = { aftermath, openDialogue: (person, lines, _, __, options) => opened.push({ npc: person.id, lines, choices: options?.choices ?? [] }),
    closeDialogue: () => {}, act: id => { acted.push(id); return aftermath.act(id); }, fill: [], gift: giveSideGift(npc, { aftermath, gear }) };
  return { spoke: aftermathConversation(npc, context), opened, acted };
}

test('the fine steel arrives, on the ground, on both sides of the border battle', () => {
  for (const side of ['empire', 'coalition']) {
    const { campaign, aftermath, gear } = play(side);
    const variant = campaign.view().chapterId;
    assert.equal(variant, side === 'empire' ? 'solis-sweep' : 'moros-outpost', `${side}: a won battle leads to the conquest`);
    assert.equal(aftermath.state.variant, variant, `${side}: the chapter after the battle is on`);
    const spec = AFTERMATH_VARIANTS[variant];
    assert.equal(aftermath.view().stage, 'rally');
    assert.ok(aftermathBuilt(spec), `${side}: the ground of ${variant} is built`);
    assert.ok(aftermathSite(spec.rallySite), `${side}: the captain has somewhere to stand`);
    assert.equal(spec.commanderId, side === 'empire' ? 'aftermath-tribune' : 'aftermath-captain');

    // He has nothing on his back when he walks up.
    assert.equal(gear.wearing('body'), null);
    assert.equal(sideGiftOwed(gear.wearing('body')), true);

    const first = speakTo({ id: spec.commanderId }, { aftermath, gear });
    assert.equal(first.spoke, true, `${side}: the captain speaks`);
    assert.deepEqual(first.opened.at(-1).lines, [...GIFT_LINES[spec.commanderId], ...spec.orders], `${side}: the coat before the orders`);
    assert.deepEqual(first.opened.at(-1).choices.map(choice => choice.id), ['begin-assault', 'leave-aftermath']);
    // Worn, not carried: there is no inventory item and no save field, only what is on him.
    assert.deepEqual(gear.wearing('body'), { weight: 'medium', tier: 4 });
    assert.equal(sideGiftOwed(gear.wearing('body')), false);
    assert.ok(gear.turns > 0 && gear.view().worn.body.tier === SIDE_GIFT.tier);
  }
});

test('it is given once: walking up again, being driven off, and loading a save all say nothing more', () => {
  for (const side of ['empire', 'coalition']) {
    const { campaign, border, aftermath, gear } = play(side);
    const spec = AFTERMATH_VARIANTS[campaign.view().chapterId], commander = { id: spec.commanderId };
    assert.equal(speakTo(commander, { aftermath, gear }).opened.at(-1).lines.length, GIFT_LINES[spec.commanderId].length + spec.orders.length);

    // Walk up again in the same session.
    const again = speakTo(commander, { aftermath, gear });
    assert.deepEqual(again.opened.at(-1).lines, spec.orders, `${side}: the coat is offered twice`);

    // Give the word, be driven off, and come back: the chapter is at the rally again and the coat is not.
    aftermath.act('begin-assault');
    assert.equal(speakTo(commander, { aftermath, gear }).spoke, false, `${side}: nothing is handed over mid-fight`);
    assert.equal(aftermath.endEncounter(spec.encounterId).ok, true);
    assert.equal(aftermath.view().stage, 'rally');
    assert.deepEqual(speakTo(commander, { aftermath, gear }).opened.at(-1).lines, spec.orders, `${side}: a second attempt pays the coat again`);

    // The whole save the host writes, through JSON, back into fresh modules.
    const saved = JSON.parse(JSON.stringify({ campaign: campaign.snapshot(), border: border.snapshot(), aftermath: aftermath.snapshot(), gear: gear.snapshot() }));
    assert.equal(validateGearSnapshot(saved.gear), true);
    const loaded = { campaign: createCampaign(), border: createBorderChapter(), aftermath: createAftermathChapter(), gear: createGear() };
    assert.equal(loaded.campaign.restore(settleBorderBattle(saved.campaign)), true);
    assert.equal(loaded.border.restore(saved.border), true);
    assert.equal(loaded.aftermath.restore(saved.aftermath), true);
    assert.equal(loaded.gear.restore(saved.gear), true);
    assert.deepEqual(loaded.gear.wearing('body'), { weight: 'medium', tier: 4 }, `${side}: the coat did not survive the save`);
    assert.equal(loaded.aftermath.view().stage, 'rally');
    assert.equal(loaded.campaign.view().chapterId, spec.id);
    assert.deepEqual(speakTo(commander, loaded).opened.at(-1).lines, spec.orders, `${side}: loading a save gives the coat over again`);

    // And the fight never mentions it. The debrief hands over the *cap*, which is its own gift
    // and is checked below; the coat is not offered a second time there.
    loaded.aftermath.act('begin-assault');
    loaded.aftermath.winEncounter(spec.encounterId);
    const debrief = speakTo({ id: spec.principalId }, loaded);
    assert.deepEqual(debrief.opened.at(-1).lines, [...CAP_LINES[spec.principalId], ...spec.debrief],
      `${side}: the cap comes with the pay, and the coat does not come back`);
    assert.deepEqual(loaded.gear.wearing('body'), { weight: 'medium', tier: 4 });
  }
});

test('packing or replacing issued armour never repeats its gift, including after loading', () => {
  for (const side of ['empire', 'coalition']) {
    const played = play(side), { aftermath, gear } = played;
    const spec = AFTERMATH_VARIANTS[played.campaign.view().chapterId];
    const commander = { id: spec.commanderId }, payer = { id: spec.principalId };
    speakTo(commander, played);
    assert.equal(gear.takeOff('body').ok, true);
    assert.deepEqual(speakTo(commander, played).opened.at(-1).lines, spec.orders);
    assert.equal(gear.wearing('body'), null, 'talking again respects unequipping the gift');
    gear.wear('body', { weight: 'light', tier: 0 });
    assert.deepEqual(speakTo(commander, played).opened.at(-1).lines, spec.orders);
    assert.equal(gear.wearing('body').tier, 0, 'the player may choose lighter, weaker equipment');
    const saved = JSON.parse(JSON.stringify(gear.snapshot()));
    const restored = createGear();
    assert.equal(restored.restore(saved), true);
    assert.equal(giftOwed(SIDE_GIFT, restored.wearing('body'), restored.view().owned), false);
    assert.equal(giftOwed(SIDE_CAP, restored.wearing('head'), restored.view().owned), true, 'owning a coat does not claim the cap');
    aftermath.act('begin-assault');
    aftermath.winEncounter(spec.encounterId);
    assert.deepEqual(speakTo(payer, played).opened.at(-1).lines, [...CAP_LINES[spec.principalId], ...spec.debrief]);
    gear.takeOff('head');
    assert.deepEqual(speakTo(payer, played).opened.at(-1).lines, spec.debrief);
    assert.equal(gear.wearing('head'), null, 'talking again also respects removing the cap');
    restored.restore(JSON.parse(JSON.stringify(gear.snapshot())));
    assert.equal(giftOwed(SIDE_CAP, restored.wearing('head'), restored.view().owned), false);
  }
});

/**
 * **A fine steel cap with the pay** (the user, 2026-09-21: "a second gift ... when the traveler's
 * side pays him after the day-after fight, from whoever already pays him in that scene"). The
 * coat comes at the rally from the captain who gives him the work; this comes at the debrief from
 * whoever is counting out the forty or sixty copper, which is not always the same man.
 */
test('the cap is worth having, and its weight is the coat’s own arithmetic', () => {
  assert.deepEqual(SIDE_CAP, { slot: 'head', weight: 'medium', tier: 4 });
  assert.deepEqual(SIDE_GIFTS, { rally: SIDE_GIFT, report: SIDE_CAP }, 'two pieces, two moments, no third');
  // **A reward weaker than a shop item is not a reward**, which is what decides the weight. The
  // best head piece on any board the traveler has stood at before Ambron is bog iron at level 2.
  const shop = [0, 1, 2].flatMap(level => smithStock(level)).filter(piece => piece.slot === 'head');
  const best = Math.max(...shop.map(piece => piece.turns));
  const turnsAt = weight => WEIGHTS[weight].turns * tierScale(SIDE_CAP.tier);
  assert.ok(Math.abs(best - .115) < .001, `the best cap he can buy turns ${best.toFixed(3)}`);
  assert.ok(turnsAt('light') < best, `a light fine steel cap would turn ${turnsAt('light').toFixed(3)}, less than one he can buy`);
  assert.ok(turnsAt(SIDE_CAP.weight) > best, `and the one he is given turns ${turnsAt(SIDE_CAP.weight).toFixed(3)}`);
  // Heavy is legal at this tier and is refused for the coat's own reason: it doubles the wind
  // swimming spends, and a gift he cannot refuse that doubles his drowning is a trap.
  assert.ok(SIDE_CAP.tier >= WEIGHTS.heavy.fromTier, 'plate is legal at tier 4');
  assert.equal(WEIGHTS.heavy.wind, 2);
  assert.equal(WEIGHTS[SIDE_CAP.weight].wind, 1, 'and what he is given costs him nothing in the water');
  // And it costs him no dodge either, because the coat is already medium: the tenth is paid.
  const coat = { body: { weight: SIDE_GIFT.weight, tier: SIDE_GIFT.tier } };
  const both = armourOf({ ...coat, head: { weight: SIDE_CAP.weight, tier: SIDE_CAP.tier } });
  assert.equal(both.dodge, armourOf(coat).dodge, 'the cap adds no penalty the coat is not already paying');
  assert.equal(both.wind, armourOf(coat).wind);
  assert.ok(Math.abs(both.turns - .32) < .001, `the two together turn ${both.turns.toFixed(2)} of a blow`);
  assert.ok(both.turns < MOST_TURNED, 'and armour still never turns a whole one');
  // Every man who can be the one paying has something to say, and nobody else does.
  const payers = [...new Set(Object.values(AFTERMATH_VARIANTS).map(spec => spec.principalId))];
  assert.deepEqual(payers.slice().sort(), Object.keys(CAP_LINES).slice().sort(), 'the payers and the voices are the same list');
  assert.ok(payers.includes(AFTERMATH_LEGATE_ID), 'the Marshal is one of them, on the Empire’s lost day');
  for (const [id, lines] of Object.entries(CAP_LINES)) {
    assert.equal(lines.length, 2, `${id}: two lines, like the coat's`);
    for (const line of lines) assert.ok(line.length > 40 && line.length < 260, `${id}: ${line.slice(0, 30)}…`);
    assert.notDeepEqual(lines, GIFT_LINES[id], `${id}: he does not say the coat's words again`);
  }
});

test('the cap arrives with the pay, once, on both sides, and survives a save', () => {
  for (const side of ['empire', 'coalition']) {
    const played = play(side);
    const spec = AFTERMATH_VARIANTS[played.campaign.view().chapterId];
    const { aftermath, gear } = played;
    // Nothing on his head at the rally, and the rally does not hand it over.
    assert.equal(gear.wearing('head'), null);
    speakTo({ id: spec.commanderId }, played);
    assert.equal(gear.wearing('head'), null, `${side}: the captain arms his body, not his head`);
    assert.deepEqual(gear.wearing('body'), { weight: 'medium', tier: 4 });
    // Nothing mid-fight either.
    aftermath.act('begin-assault');
    assert.deepEqual(giveSideGift({ id: spec.principalId }, played), [], `${side}: nothing is handed over mid-fight`);
    assert.equal(aftermath.winEncounter(spec.encounterId).ok, true);
    assert.equal(aftermath.view().stage, 'report');
    // The debrief: the cap, then the pay, from the man who is paying.
    const paid = speakTo({ id: spec.principalId }, played);
    assert.deepEqual(paid.opened.at(-1).lines, [...CAP_LINES[spec.principalId], ...spec.debrief], `${side}: the cap before the coin`);
    assert.deepEqual(gear.wearing('head'), { weight: SIDE_CAP.weight, tier: SIDE_CAP.tier });
    assert.equal(gear.view().worn.head.tier, 4, `${side}: gear.wearing('head').tier === 4 is the record`);
    assert.equal(giftOwed(SIDE_CAP, gear.wearing('head')), false);
    // Once: walking up again is the debrief and nothing more.
    assert.deepEqual(speakTo({ id: spec.principalId }, played).opened.at(-1).lines, spec.debrief, `${side}: the cap is offered twice`);
    // Nobody else hands one over, at any stage.
    for (const id of ['aftermath-tribune', 'aftermath-captain', 'aftermath-envoy', AFTERMATH_LEGATE_ID, 'battle-tribune', 'mara'])
      if (id !== spec.principalId) assert.deepEqual(giveSideGift({ id }, played), [], `${id} hands over a cap on the ${side} road`);
    // Through the save the host writes, into fresh modules: he is still wearing both.
    const saved = JSON.parse(JSON.stringify({ aftermath: aftermath.snapshot(), gear: gear.snapshot() }));
    assert.equal(validateGearSnapshot(saved.gear), true);
    const loaded = { aftermath: createAftermathChapter(), gear: createGear() };
    assert.equal(loaded.aftermath.restore(saved.aftermath), true);
    assert.equal(loaded.gear.restore(saved.gear), true);
    assert.deepEqual(loaded.gear.wearing('head'), { weight: SIDE_CAP.weight, tier: SIDE_CAP.tier }, `${side}: the cap did not survive the save`);
    assert.deepEqual(loaded.gear.wearing('body'), { weight: SIDE_GIFT.weight, tier: SIDE_GIFT.tier });
    assert.deepEqual(speakTo({ id: spec.principalId }, loaded).opened.at(-1).lines, spec.debrief,
      `${side}: loading a save gives the cap over again`);
  }
});

test('nobody else hands it over, and nothing does before the battle is won', () => {
  for (const side of ['empire', 'coalition']) {
    // Before the fight is decided there is no chapter, so there is nothing to hand over.
    const campaign = createCampaign(), border = createBorderChapter(), aftermath = createAftermathChapter(), gear = createGear();
    for (const id of ['drent-road', 'luscia-aftermath', 'moros-camp']) campaign.completeChapter(id);
    campaign.chooseSide(side);
    border.start();
    for (const action of ['take-legate-terms', 'enter-solis', side === 'empire' ? 'side-empire' : 'side-coalition', 'march-out', 'reach-line'])
      border.act(action);
    for (const id of ['aftermath-tribune', 'aftermath-captain', 'aftermath-envoy', 'post-camp-legate'])
      assert.deepEqual(giveSideGift({ id }, { aftermath, gear }), [], `${id} arms him before the border battle`);
    assert.equal(gear.wearing('body'), null);

    // After it, only the captain of that side, and only at the rally.
    const played = play(side);
    const spec = AFTERMATH_VARIANTS[played.campaign.view().chapterId];
    for (const id of ['aftermath-tribune', 'aftermath-captain', 'aftermath-envoy', 'post-camp-legate', 'battle-tribune', 'coalition-captain', 'solis-captain', 'mara'])
      if (id !== spec.commanderId) assert.deepEqual(giveSideGift({ id }, played), [], `${id} hands over fine steel on the ${side} road`);
    assert.equal(played.gear.wearing('body'), null, 'and nobody wore anything doing it');
    assert.deepEqual(giveSideGift({ id: spec.commanderId }, played).length, 2);
  }
});
