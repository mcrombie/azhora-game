import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCampaign, settleBorderBattle } from '../src/campaign.js';
import { createBorderChapter, BORDER_ENCOUNTER_ID } from '../src/border-chapter.js';
import { createAftermathChapter, aftermathConversation, AFTERMATH_VARIANTS, SIDE_GIFT, sideGiftOwed, GIFT_LINES } from '../src/aftermath-chapter.js';
import { aftermathBuilt, aftermathSite } from '../src/aftermath-sites.js';
import { createGear, validateGearSnapshot } from '../src/gear.js';

const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');

/**
 * **`giveSideGift`'s rule, written out once so the test drives the host's rule rather than a
 * second idea of it** - and pinned against the host's own source below, the way
 * `tests/fights-with-company.test.js` pins `placeFor`. Everything the host does around it -
 * the toast, the sound, `saveRoad(false)` - is not a decision and is left out.
 */
function giveSideGift(npc, { aftermath, gear }) {
  const chapter = aftermath.spec;
  if (!chapter || npc.id !== chapter.commanderId || aftermath.view().stage !== 'rally') return [];
  const lines = GIFT_LINES[chapter.commanderId];
  if (!lines || !sideGiftOwed(gear.wearing(SIDE_GIFT.slot))) return [];
  const worn = gear.wear(SIDE_GIFT.slot, { weight: SIDE_GIFT.weight, tier: SIDE_GIFT.tier });
  if (!worn.ok) return [];
  return [...lines];
}

test('the copy of the host rule cannot drift from the host', () => {
  assert.match(main, /function giveSideGift\(npc\)\{/);
  assert.match(main, /const chapter=aftermath\.spec;/);
  assert.match(main, /if\(!chapter\|\|npc\.id!==chapter\.commanderId\|\|aftermath\.view\(\)\.stage!=='rally'\)return \[\];/);
  assert.match(main, /const lines=GIFT_LINES\[chapter\.commanderId\];/);
  assert.match(main, /if\(!lines\|\|!sideGiftOwed\(gear\.wearing\(SIDE_GIFT\.slot\)\)\)return \[\];/);
  assert.match(main, /const worn=gear\.wear\(SIDE_GIFT\.slot,\{weight:SIDE_GIFT\.weight,tier:SIDE_GIFT\.tier\}\);/);
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

    // And the fight and the debrief never mention it.
    loaded.aftermath.act('begin-assault');
    loaded.aftermath.winEncounter(spec.encounterId);
    const debrief = speakTo({ id: spec.principalId }, loaded);
    assert.deepEqual(debrief.opened.at(-1).lines, spec.debrief, `${side}: the gift comes back at the debrief`);
    assert.deepEqual(loaded.gear.wearing('body'), { weight: 'medium', tier: 4 });
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
