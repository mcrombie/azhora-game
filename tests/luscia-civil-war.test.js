import test from 'node:test';
import assert from 'node:assert/strict';
import {createLusciaCivilWar,validateLusciaCivilWarSnapshot,LUSCIA_OPERATIVE_ID,LUSCIA_LOYALISTS} from '../src/luscia-civil-war.js';
import {createLusciaCivilWarHost,LUSCIA_RECRUIT_NPCS,LUSCIA_RECRUIT_POSITIONS,LUSCIA_REPUBLICAN_FIGHT_ID} from '../src/luscia-civil-war-host.js';
import {createLivingStory} from '../src/living-story.js';
import {createCampaign} from '../src/campaign.js';
import {createBorderChapter,BORDER_ENCOUNTER_ID} from '../src/border-chapter.js';
import {createLusciaChapter} from '../src/luscia-chapter.js';
import {createInventoryState} from '../src/inventory.js';
import {chooseReply} from '../src/autopilot.js';
import {createCombat} from '../src/combat.js';

test('provisional agreement is not allegiance and Mind Read reopens killed or betrayed introductions',()=>{
  const q=createLusciaCivilWar();q.meetSoldier();q.agreeSoldier();
  assert.equal(q.state().path,null);assert.equal(q.recruitmentAvailable(),true);
  q.reportEmpire();assert.equal(q.recruitmentAvailable(),false);assert.equal(q.joinRepublic().ok,false);
  q.readOperative();assert.equal(q.joinRepublic().ok,true);assert.equal(q.view().complete,false);
  const killed=createLusciaCivilWar();killed.meetSoldier();killed.opposeSoldier();killed.soldierKilled();
  assert.equal(killed.joinRepublic().ok,false);killed.readOperative();assert.equal(killed.joinRepublic().ok,true);
  assert.equal(killed.state().soldier,'dead','a second chance does not resurrect Davin');
});
test('no introduction exists after missing the unique job; death or custody closes Mind Read recruitment',()=>{
  for(const cause of ['dead','arrested']){
    const q=createLusciaCivilWar();assert.equal(q.joinRepublic().ok,false);
    assert.equal(q.readOperative().ok,true);q.closeOperative(cause);
    assert.equal(q.readOperative().ok,false);assert.equal(q.joinRepublic().ok,false);
    assert.equal(q.view().stage,'closed');assert.match(q.view().detail,/closed/);
  }
});
test('local Imperial investigation requires corroborated proof and does not conquer Luscia on opening',()=>{
  const q=createLusciaCivilWar();q.meetSoldier();q.agreeSoldier();q.reportEmpire();
  assert.equal(q.finishEmpire().ok,false);
  for(const npc of LUSCIA_LOYALISTS)q.recordDeath(npc.id);
  assert.equal(q.finishEmpire().ok,false,'dead strangers are not evidence');
  for(const npc of LUSCIA_LOYALISTS)q.evidence(npc.id);
  assert.equal(q.finishEmpire().ok,true);assert.equal(q.finishEmpire().ok,false);
  assert.equal(q.view().complete,true);
});
test('civil war snapshots preserve consequences and reject broken outcomes',()=>{
  const q=createLusciaCivilWar();q.meetSoldier();q.opposeSoldier();q.soldierKilled();q.readOperative();q.joinRepublic();q.contactRepublic();
  const saved=q.snapshot(),copy=createLusciaCivilWar();assert.equal(copy.restore(saved),true);assert.deepEqual(copy.snapshot(),saved);
  for(const bad of [{...saved,operative:'invisible'},{...saved,proof:['nobody']},{...saved,imperialComplete:true},{...saved,accepted:false},null]){
    assert.equal(validateLusciaCivilWarSnapshot(bad),false);assert.equal(copy.restore(bad),false);
  }
});
test('early Republic recruitment and later Solis defection converge without Imperial completions or duplicate pay',()=>{
  const campaign=createCampaign(),border=createBorderChapter();campaign.completeChapter('drent-road');
  assert.equal(campaign.joinRepublic().ok,true);assert.equal(border.joinRepublic().ok,true);
  assert.deepEqual(campaign.snapshot().completed,['drent-road']);assert.equal(campaign.state.horse,false);
  assert.equal(border.state.ordered,false);assert.equal(border.view().stage,'report');assert.equal(border.view().objectiveId,'solis-captain');
  assert.equal(border.joinRepublic().first,false);assert.equal(campaign.joinRepublic().first,false);
  const c2=createCampaign(),b2=createBorderChapter();assert.equal(c2.restore(campaign.snapshot()),true);assert.equal(b2.restore(border.snapshot()),true);
  b2.act('march-out');assert.equal(b2.act('reach-line').startEncounter,BORDER_ENCOUNTER_ID);
  b2.resolveBattle(BORDER_ENCOUNTER_ID);c2.completeChapter('border-battle','victory');assert.equal(c2.view().chapterId,'moros-outpost');
  assert.equal(createCampaign().restore(c2.snapshot()),true);assert.equal(createBorderChapter().restore(b2.snapshot()),true);
});
test('a traveler who bypassed Imperial service can join through Mind Read without fake training or report flags',()=>{
  const campaign=createCampaign(),border=createBorderChapter(),civil=createLusciaCivilWar();
  civil.readOperative();assert.equal(civil.joinRepublic().ok,true);assert.equal(campaign.joinRepublic().ok,true);assert.equal(border.joinRepublic().ok,true);
  assert.deepEqual(campaign.snapshot().completed,[]);assert.equal(campaign.state.horse,false);assert.equal(createCampaign().restore(campaign.snapshot()),true);
});

function hostFixture(){
  const inventory=createInventoryState(),living=createLivingStory();living.reportNothom('player');
  const campaign=createCampaign();campaign.completeChapter('drent-road');const border=createBorderChapter();
  const world={npcPositions:{...LUSCIA_RECRUIT_POSITIONS,'timber-stall':{x:0,z:0},'lauvel-picket':{x:3,z:0}},heightAt:()=>0,
    bounds:{minX:-5000,maxX:5000,minZ:-5000,maxZ:5000},colliders:[]};
  const npcById=new Map([...LUSCIA_RECRUIT_NPCS,{id:'timber-stall',name:'Hara'},{id:'relay-clerk',name:'Iven'},{id:'lauvel-picket',name:'Talven'}].map(n=>[n.id,{...n,actor:{group:{position:{...(world.npcPositions[n.id]??{x:0,z:0})}}}}]));
  let shown,mode='playing',host;
  const combat={state:{phase:'peaceful',encounterId:null,enemies:[]},startEncounter(config){
    if(!createCombat({world,position:{...config.checkpoint,y:0}}).startEncounter(config))return false;
    this.state={phase:'active',encounterId:config.id,enemies:config.enemies};return true;}};
  const luscia=createLusciaChapter({inventory,assignment:{accept:()=>living.acceptSatchel('player'),take(){const allowed=host.canTake();if(!allowed.ok)return allowed;const result=living.takeSatchel('player');if(result.ok)inventory.add('courier-satchel');return result;},deliver(){const result=living.deliverSatchel('player');if(result.ok)inventory.remove('courier-satchel');return result;}}});
  luscia.start();luscia.act('accept-lauvel-search');
  host=createLusciaCivilWarHost({world,npcById,combat,luscia,living:()=>living,mode:()=>mode,position:()=>LUSCIA_RECRUIT_POSITIONS['relay-republican'],
    openDialogue(npc,lines,_event,_label,options){shown={npc,lines,options};mode='dialogue';},closeDialogue(){shown=null;mode='playing';},
    takeSatchel:()=>luscia.act('take-courier-satchel'),onRepublicJoined(){campaign.joinRepublic();border.joinRepublic();living.chooseAllegiance('player','coalition');return {ok:true};}});
  return {host,living,luscia,inventory,campaign,border,combat,npcById,talk:id=>host.converse(npcById.get(id)),
    choose(id){const c=shown?.options.choices.find(c=>c.id===id);assert.ok(c,`missing choice ${id}`);c.action();},get shown(){return shown;}};
}
test('actual host dialogue transfers one satchel, leaves faction open and recruits through Hara',()=>{
  const f=hostFixture();assert.equal(f.npcById.has('relay-republican'),true,'soldier identity is not overwritten by site identity');
  assert.equal(f.luscia.act('take-courier-satchel').ok,false,'site interaction cannot skip the conversation');
  f.talk('relay-republican');assert.equal(f.combat.state.phase,'peaceful');assert.match(f.shown.lines.join(' '),/judgment/);
  assert.equal(chooseReply(f.shown.options.choices,{}),'luscia-listen-republican');
  f.choose('luscia-listen-republican');assert.equal(f.inventory.count('courier-satchel'),1);assert.equal(f.living.satchel().carrier,'player');
  assert.equal(f.host.state().path,null);f.talk('timber-stall');f.choose('luscia-join-republic');
  assert.equal(f.campaign.state.side,'coalition');assert.equal(f.border.view().stage,'report');assert.equal(f.living.player().allegiance,'coalition');
  assert.equal(f.host.view().complete,false,'Republic local quest remains open');assert.equal(f.campaign.state.arcs.Luscia,undefined);
});
test('Empire declaration starts one normal soldier fight; retreat retains the person and a kill leaves lootable ownership',()=>{
  const f=hostFixture();f.talk('relay-republican');f.choose('luscia-support-empire');
  assert.equal(f.combat.state.encounterId,LUSCIA_REPUBLICAN_FIGHT_ID);assert.equal(f.combat.state.enemies.length,1);
  assert.equal(f.combat.state.enemies[0].model.role,'suvali-guard');assert.equal(f.inventory.has('courier-satchel'),false);
  f.combat.state.phase='peaceful';f.host.combatEvent({type:'retreat'});assert.equal(f.host.state().soldier,'hostile');
  assert.equal(f.npcById.get('relay-republican').hidden,false);
  f.talk('relay-republican');f.choose('luscia-fight-republican');f.combat.state.phase='victory';f.host.combatEvent({type:'victory'});
  assert.equal(f.living.satchel().location,'remains-relay-republican');assert.equal(f.host.state().soldier,'dead');
  assert.equal(f.luscia.act('take-courier-satchel').ok,true);assert.equal(f.inventory.count('courier-satchel'),1);
  f.host.mindRead({targetId:LUSCIA_OPERATIVE_ID});f.talk(LUSCIA_OPERATIVE_ID);f.choose('luscia-join-republic');assert.equal(f.campaign.state.side,'coalition');
});
test('another mercenary’s real relay conversation takes active time, persists and grants no player introduction',()=>{
  const f=hostFixture();f.living.abandonSatchel('player');f.living.reportNothom('merc-word',{acceptJob:true});
  const stand=LUSCIA_RECRUIT_POSITIONS['relay-republican'];f.npcById.set('merc-word',{id:'merc-word',name:'Ed the Word',actor:{group:{position:{...stand}}}});
  assert.equal(f.host.npcHutArrived('merc-word'),true);f.living.tick(3);f.host.frame(3,{playing:true});
  assert.equal(f.living.satchel().carrier,'relay-republican');
  const saved=f.living.snapshot();assert.equal(f.living.restore(saved),true);f.host.frame(500,{playing:false});
  assert.equal(f.living.satchel().carrier,'relay-republican','a paused host does no work');
  f.living.tick(3);f.host.frame(3,{playing:true});assert.equal(f.living.satchel().carrier,'merc-word');
  assert.equal(f.living.actor('merc-word').tasks['relay-soldier'],6);assert.equal(f.host.state().introduced,false);
  assert.equal(f.host.state().soldier,'departed');assert.equal(f.host.view().recruitmentAvailable,false);
  f.host.frame(1,{playing:true});assert.equal(f.inventory.has('courier-satchel'),false,'watching another mercenary does not clone the item');
});
test('restoring an earlier encounter puts Davin back at the hut and restores his actual dropped-item position',()=>{
  const f=hostFixture(),fresh=f.host.snapshot(),npc=f.npcById.get('relay-republican');
  f.talk('relay-republican');f.choose('luscia-listen-republican');
  Object.assign(npc.actor.group.position,{x:20,z:30});
  assert.equal(f.host.restore(fresh),true);
  assert.equal(npc.actor.group.position.x,LUSCIA_RECRUIT_POSITIONS['relay-republican'].x);
  assert.equal(npc.actor.group.position.z,LUSCIA_RECRUIT_POSITIONS['relay-republican'].z);
  const dead=hostFixture(),body=dead.npcById.get('relay-republican');
  Object.assign(body.actor.group.position,{x:51,z:72});dead.host.npcKilled('relay-republican');
  const saved=dead.host.snapshot();Object.assign(body.actor.group.position,{x:0,z:0});
  assert.equal(dead.host.restore(saved),true);
  assert.equal(body.actor.group.position.x,51);assert.equal(body.actor.group.position.z,72);
});
test('a Republican recruit returning to Iven does not receive a stale Imperial onward-orders action',()=>{
  const f=hostFixture();f.living.abandonSatchel('player');f.living.reportNothom('merc-word');
  f.host.mindRead({targetId:LUSCIA_OPERATIVE_ID});f.talk(LUSCIA_OPERATIVE_ID);f.choose('luscia-join-republic');
  assert.equal(f.talk('relay-clerk'),true);
  assert.equal(f.shown.options.choices.some(c=>c.id==='luscia-onward-muster'),false);
  assert.equal(f.campaign.view().chapterId,'border-battle');assert.equal(f.luscia.state.resolvedBy,null);
});
