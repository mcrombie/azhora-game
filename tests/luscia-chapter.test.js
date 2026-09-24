import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLusciaChapter, validateLusciaSnapshot, lusciaConversation,
  LUSCIA_NPCS, LUSCIA_SITES, LUSCIA_SITE_ACTIONS, LUSCIA_WOLVES, LUSCIA_REWARD_ITEM, LUSCIA_REWARD_COINS,
} from '../src/luscia-chapter.js';
import { createInventoryState, INVENTORY_ITEMS } from '../src/inventory.js';
import { createCombat } from '../src/combat.js';
import { createCampaign } from '../src/campaign.js';
import { regionNpcPositions } from '../src/regions.js';
import {toWorld} from '../src/world-scale.js';

function fixture({ started = true } = {}) {
  const inventory = createInventoryState();
  inventory.grant('simple-sword');
  const events = [];
  const luscia = createLusciaChapter({ inventory, onEvent: event => events.push(event) });
  if (started) luscia.start();
  let shown = null;
  const context = {
    luscia, inventory,
    openDialogue(npc, lines, event, label, options) { shown = { npc, lines, event, label, options }; },
    closeDialogue() { shown = null; },
    act(id) { return luscia.act(id); },
  };
  const api = {
    luscia, inventory, events, context,
    get shown() { return shown; },
    talk(id) {
      const npc = LUSCIA_NPCS.find(person => person.id === id) ?? { id, name: 'Iven', role: 'Imperial relay clerk' };
      lusciaConversation(npc, context); return api;
    },
    choice(id) { return shown?.options?.choices?.find(item => item.id === id); },
    choose(id) { const choice = api.choice(id); assert.ok(choice, `missing choice ${id}`); choice.action(); return api; },
  };
  return api;
}

const finish = f => {
  f.talk('relay-clerk').choose('accept-lauvel-search');
  assert.equal(f.luscia.act('take-courier-satchel').ok, true);
  f.talk('relay-clerk').choose('return-courier-satchel');
};

test('the chapter opens only once and refuses actions taken out of order', () => {
  const f = fixture({ started: false });
  assert.equal(f.luscia.view().stage, 'not-started');
  assert.deepEqual(f.luscia.availableActions(), []);
  assert.equal(f.luscia.act('take-courier-satchel').ok, false);
  assert.equal(f.luscia.act('return-courier-satchel').ok, false);
  const before = f.luscia.snapshot();
  assert.equal(f.luscia.start().ok, true);
  assert.equal(f.luscia.start().ok, false, 'the chapter does not open twice');
  assert.equal(f.luscia.view().stage, 'meet-relay-clerk');
  assert.equal(f.luscia.act('return-courier-satchel').ok, false, 'the satchel cannot be handed over before it is found');
  assert.notDeepEqual(f.luscia.snapshot(), before);
  assert.deepEqual(f.luscia.view().destinationIds, ['relay-clerk']);
});

test('a satchel physically recovered from a replacement becomes returnable without a second pickup hook',()=>{
  let pickups=0;const luscia=createLusciaChapter({assignment:{take(){pickups++;return {ok:false};},deliver:()=>({ok:true})}});
  assert.equal(luscia.adoptCarriedSatchel({verified:true}).pending,true,'Chapter 1 must still be reported normally');
  luscia.start();luscia.syncSharedCompletion('Ed',{finished:false});
  assert.equal(luscia.adoptCarriedSatchel().ok,false,'an unverified script call cannot invent possession');
  assert.equal(luscia.adoptCarriedSatchel({verified:true}).ok,true);
  assert.equal(luscia.view().stage,'return-satchel');assert.equal(pickups,0);assert.equal(validateLusciaSnapshot(luscia.snapshot()),true);
  assert.equal(luscia.act('return-courier-satchel').ok,true);assert.equal(luscia.adoptCarriedSatchel({verified:true}).ok,false,'a delivered satchel never reopens');
});

test('shared completion rejects malformed reporters without corrupting the chapter save',()=>{
  const luscia=createLusciaChapter();luscia.start();const before=luscia.snapshot();
  for(const bad of [undefined,null,[],{},NaN,Infinity,-1,'','   ','player',' player ']){
    assert.equal(luscia.syncSharedCompletion(bad).ok,false);
    assert.deepEqual(luscia.snapshot(),before);
    assert.equal(validateLusciaSnapshot(luscia.snapshot()),true);
  }
  assert.equal(luscia.syncSharedCompletion('Ed',{finished:'yes'}).ok,false);
  assert.deepEqual(luscia.snapshot(),before);
  assert.equal(luscia.syncSharedCompletion(' Ed the Word ',{finished:false}).ok,true);
  assert.equal(luscia.snapshot().resolvedBy,'Ed the Word');
  assert.equal(luscia.snapshot().resolvedStatus,'assigned');
  const saved=JSON.parse(JSON.stringify(luscia.snapshot()));
  assert.equal(validateLusciaSnapshot(saved),true);assert.equal(createLusciaChapter().restore(saved),true);
});

test('the chapter runs from Iven to the looted hut and back; pickup no longer starts a wolf fight', () => {
  const f = fixture();
  f.talk('relay-clerk').choose('accept-lauvel-search');
  assert.equal(f.luscia.view().stage, 'find-satchel');
  assert.deepEqual(f.luscia.view().destinationIds, ['courier-satchel']);
  const lift = f.luscia.act(LUSCIA_SITE_ACTIONS['courier-satchel']);
  assert.equal(lift.ok, true);
  assert.equal(lift.startEncounter, null, 'the Republican conversation controls combat, not a pickup trigger');
  assert.equal(f.luscia.view().stage, 'return-satchel');
  assert.equal(f.inventory.has(LUSCIA_REWARD_ITEM), false, 'the horse is paid on delivery, not on pickup');
  f.talk('relay-clerk').choose('return-courier-satchel');
  assert.equal(f.luscia.view().stage, 'complete');
  assert.equal(f.luscia.view().complete, true);
  assert.equal(f.inventory.count(LUSCIA_REWARD_ITEM), 1);
  assert.equal(f.inventory.count('copper-piece'), LUSCIA_REWARD_COINS);
  assert.equal(f.luscia.act('return-courier-satchel').ok, false);
  assert.equal(f.inventory.count(LUSCIA_REWARD_ITEM), 1, 'the token is never granted twice');
  assert.equal(INVENTORY_ITEMS[LUSCIA_REWARD_ITEM].type, 'Quest item');
});

test('the wolves are recorded only for their own finished encounter', () => {
  const f = fixture();
  assert.equal(f.luscia.clearWolves(LUSCIA_WOLVES.id).ok, false, 'no pack comes before the satchel is lifted');
  f.talk('relay-clerk').choose('accept-lauvel-search');
  f.luscia.act('take-courier-satchel');
  assert.equal(f.luscia.clearWolves('meadow-raiders').ok, false);
  assert.equal(f.luscia.clearWolves(LUSCIA_WOLVES.id).ok, true);
  assert.equal(f.luscia.clearWolves(LUSCIA_WOLVES.id).ok, false, 'a cleared pack is not cleared twice');
  assert.equal(f.luscia.view().wolvesCleared, true);
});

test('the pack at the burial line is a valid encounter of two wolves with an eastward line of retreat', () => {
  const world = { bounds: { minX: -844, maxX: 144, minZ: -209, maxZ: 655 }, colliders: [], heightAt: () => 7.4 };
  const position = { x: LUSCIA_WOLVES.checkpoint.x, y: 7.4, z: LUSCIA_WOLVES.checkpoint.z };
  const combat = createCombat({ world, position });
  assert.equal(combat.startEncounter(LUSCIA_WOLVES), true);
  assert.deepEqual(combat.state.enemies.map(enemy => enemy.kind), ['wolf', 'wolf']);
  assert.equal(combat.state.encounterId, 'lauvel-wolves');
  // Backing east onto the open grass ends the fight; the town road west does not.
  assert.ok(LUSCIA_WOLVES.retreatLine > LUSCIA_WOLVES.center.x);
  position.x = LUSCIA_WOLVES.retreatLine + 2; combat.update(1 / 60);
  assert.equal(combat.state.phase, 'peaceful');
});

test('a saved chapter is rejected unless every step it claims could have happened in order', () => {
  const f = fixture();
  finish(f);
  const saved = f.luscia.snapshot();
  assert.equal(validateLusciaSnapshot(saved), true);
  assert.equal(validateLusciaSnapshot(undefined), true, 'a save from before the chapter existed is allowed');
  assert.equal(validateLusciaSnapshot(undefined, { allowMissing: false }), false);
  for (const broken of [
    { ...saved, revision: saved.revision + 1 },
    { ...saved, started: false },
    { ...saved, satchelTaken: false },
    { ...saved, version: 2 },
    { ...saved, briefed: 'yes' },
    { ...saved, extra: true },
    null, 'no', [],
  ]) assert.equal(validateLusciaSnapshot(broken), false, JSON.stringify(broken));
  const restored = createLusciaChapter({ inventory: createInventoryState() });
  assert.equal(restored.restore({ ...saved, revision: 99 }), false);
  assert.equal(restored.restore(saved), true);
  assert.equal(restored.view().stage, 'complete');
  assert.equal(restored.snapshot().returned, true);
  // Restoring a finished chapter never pays the horse a second time.
  const emptyPurse = createInventoryState();
  const reloaded = createLusciaChapter({ inventory: emptyPurse });
  reloaded.restore(saved);
  assert.equal(emptyPurse.has(LUSCIA_REWARD_ITEM), false);
});

test('the campaign moves on to the Moros camp when the chapter is reported complete', () => {
  const campaign = createCampaign();
  campaign.completeChapter('drent-road');
  assert.equal(campaign.view().chapterId, 'luscia-aftermath');
  const f = fixture();
  finish(f);
  assert.equal(campaign.completeChapter('luscia-aftermath').ok, true);
  assert.equal(campaign.view().chapterId, 'moros-camp');
  assert.equal(campaign.view().horse, true, "the chapter's reward is the army horse");
});

test('Iven briefs the road, the picket turns civilians back, and the valley speaks plainly', () => {
  const f = fixture();
  f.talk('relay-clerk');
  const brief = f.shown.lines.join(' ');
  assert.match(brief, /ten days late/);
  assert.match(brief, /courier/);
  assert.ok(f.choice('accept-lauvel-search'), 'the errand is offered as a choice');
  f.choice('iven-wolves').action();
  const rumour = f.shown.lines.join(' ');
  assert.equal(f.shown.lines.length, 3, 'three lines of rumour about the wolves');
  assert.match(rumour, /burial line/);
  assert.match(rumour, /wolves|pack/i);
  f.talk('lauvel-picket');
  assert.match(f.shown.lines.join(' '), /Civilians turn at this line/);
  assert.equal(f.choice('accept-lauvel-search'), undefined, 'the sergeant hands out no errands');
  f.choice('talvus-battle').action();
  assert.match(f.shown.lines.join(' '), /rebels/, 'the army calls them rebels');
  f.talk('burial-searcher');
  assert.match(f.shown.lines.join(' '), /brother/);
  f.choice('ilva-who-they-were').action();
  assert.match(f.shown.lines.join(' '), /Not soldiers/);
});

test('the drover at the burned hamlet has two lines and the rumour of Solis, and no quest', () => {
  const f = fixture();
  f.talk('hamlet-drover');
  assert.equal(f.shown.lines.length, 2);
  assert.equal(f.shown.options.choices.some(choice => choice.id.startsWith('accept-')), false);
  f.choice('garran-solis').action();
  const rumour = f.shown.lines.join(' ');
  assert.match(rumour, /Solis/);
  assert.match(rumour, /West Suval/);
});

test('after the sergeant is satisfied the field is open, and Iven closes the chapter with the horse and the Moros', () => {
  const f = fixture();
  f.talk('relay-clerk').choose('accept-lauvel-search');
  f.talk('lauvel-picket');
  assert.match(f.shown.lines.join(' '), /may pass the line/);
  f.luscia.act('take-courier-satchel');
  f.talk('relay-clerk');
  assert.ok(f.choice('return-courier-satchel'));
  f.choose('return-courier-satchel');
  f.talk('relay-clerk');
  const closing = f.shown.lines.join(' ');
  assert.match(closing, /four remount tokens/);
  assert.match(closing, /Moros/);
});

test('every person and site of the chapter has a stand on Luscian ground', () => {
  for (const npc of LUSCIA_NPCS) {
    const stand = regionNpcPositions[npc.id];
    assert.ok(stand, `${npc.id} has a stand`);
    assert.ok(Number.isFinite(stand.x) && Number.isFinite(stand.z));
    assert.ok(typeof npc.name === 'string' && npc.modelRole, `${npc.id} has a name and a model`);
  }
  assert.equal(LUSCIA_NPCS.find(npc => npc.id === 'lauvel-picket').modelRole, 'legion-soldier');
  const satchel = LUSCIA_SITES['courier-satchel'];
  assert.equal(LUSCIA_SITE_ACTIONS[satchel.id], 'take-courier-satchel');
  const relay=toWorld(-401,196);
  assert.ok(Math.hypot(satchel.x-relay.x,satchel.z-relay.z)<20,'the satchel holder is at the old relay hut');
  assert.ok(Math.hypot(satchel.x-LUSCIA_WOLVES.center.x,satchel.z-LUSCIA_WOLVES.center.z)>20,'the old wilderness wolves do not own this quest');
});
