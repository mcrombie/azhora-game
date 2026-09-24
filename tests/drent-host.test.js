import test from 'node:test';
import assert from 'node:assert/strict';
import {createDrentHost,guardLineOfSight,DRENT_FIGHT_ID} from '../src/drent-host.js';
import {DRENT_NPCS,DRENT_NPC_POSITIONS,DRENT_SITES,DRENT_GUARD_PATROLS} from '../src/drent-sites.js';
import {DRENT_EVIDENCE_ID,DRENT_SUPPLIES_ID,DRENT_QUEST_ID} from '../src/drent-civil-war.js';
import {INSTRUCTOR,INSTRUCTOR_STAND} from '../src/instructor.js';
import {createInventoryState} from '../src/inventory.js';
import {createSkills} from '../src/skills.js';
import {STEALTH} from '../src/stealth.js';

const vector=at=>({x:at.x,y:0,z:at.z,set(x,y,z){this.x=x;this.y=y;this.z=z;}});
function fixture(){
  const player=vector({x:0,z:0}),dialogs=[],questChoices=[],toasts=[],changes=[],tracks=[];
  const inventory={...createInventoryState(),refresh(){}};
  const skills=createSkills(),world={heightAt:()=>0,colliders:[],npcPositions:{instructor:{...INSTRUCTOR_STAND}},
    drentCivilWar:{setEvidenceTaken(value){this.evidenceTaken=value;},setSuppliesTaken(value){this.suppliesTaken=value;}}};
  const npcById=new Map([INSTRUCTOR,...DRENT_NPCS].map(npc=>{
    const at=npc.id==='instructor'?INSTRUCTOR_STAND:DRENT_NPC_POSITIONS[npc.id];
    return [npc.id,{...npc,actor:{group:{position:vector(at),rotation:{y:npc.yaw??0}}},hidden:false}];
  }));
  const combat={state:{phase:'peaceful',encounterId:null,allies:[]},starts:[],startEncounter(config){
    this.starts.push(config);this.state={phase:'active',encounterId:config.id,allies:config.allies.map(a=>({...a}))};return true;
  }};
  let trained=true,stops=0,closed=0,host;
  host=createDrentHost({world,npcById,inventory,skills,combat,position:()=>player,mode:()=> 'playing',trained:()=>trained,
    openDialogue(npc,lines,action,leave,options){dialogs.push({npc,lines,action,leave,...options});},closeDialogue(){closed++;},
    openQuestChoice(model){questChoices.push(model);},
    toast:(...args)=>toasts.push(args),onChange:()=>changes.push(host.snapshot()),onTrack:id=>tracks.push(id),getTracked:()=>tracks.at(-1)??'main',
    stopAutoplay(){stops++;}});
  const talk=id=>host.converse(npcById.get(id));
  const choose=id=>{const choice=dialogs.at(-1)?.choices.find(c=>c.id===id);assert.ok(choice,`missing ${id}`);choice.action();};
  const chooseFocus=id=>{const choice=questChoices.at(-1)?.choices.find(c=>c.id===id);assert.ok(choice,`missing focus ${id}`);choice.action();};
  return {host,player,inventory,skills,world,npcById,combat,dialogs,questChoices,toasts,changes,tracks,talk,choose,chooseFocus,
    setTrained:value=>{trained=value;},stops:()=>stops,closed:()=>closed};
}
function act(host,...actions){for(const action of actions)assert.equal(host.act(action).ok,true,action);}
function collected(f){act(f.host,'defeat-ambush','accept-investigation');f.player.set(DRENT_SITES.evidence.x,0,DRENT_SITES.evidence.z);
  f.host.frame(.1,{playing:true});assert.equal(f.host.nearby?.id,'drent-rebel-camp');assert.equal(f.host.interact(),true);}
function republican(f){collected(f);assert.equal(f.host.itemAction(DRENT_EVIDENCE_ID,'read-evidence'),true);
  f.talk('killian');f.choose('drent-killian');}

test('victory presents an explicit gold/silver focus fork without automatically accepting Glun\'s investigation',()=>{
  for(const [choice,tracked] of [['drent-main','main'],['drent-focus',DRENT_QUEST_ID]]){
    const f=fixture();f.host.defeatedAmbush();
    assert.equal(f.host.state().accepted,false);assert.equal(f.stops(),1);
    assert.equal(f.host.trackableView().active,true);assert.equal(f.host.trackableView().stage,'lead');
    assert.equal(f.dialogs.length,0,'the focus choice must not impersonate an NPC conversation');
    assert.deepEqual(f.questChoices.at(-1).choices.map(c=>c.id),['drent-main','drent-focus']);
    assert.deepEqual(f.questChoices.at(-1).choices.map(c=>c.grade),['main','plot']);
    f.chooseFocus(choice);assert.equal(f.tracks.at(-1),tracked);assert.equal(f.host.state().accepted,false);
    f.setTrained(false);assert.equal(f.talk('instructor'),false,'a silver conversation cannot replace the training lesson');
    f.setTrained(true);assert.equal(f.talk('instructor'),true);f.choose('drent-accept');
    assert.equal(f.host.state().accepted,true);assert.equal(f.host.trackableView().stage,'camp');
    assert.match(f.dialogs.at(-1).lines.join(' '),/Do not read/);
    f.choose('drent-main');assert.equal(f.tracks.at(-1),'main','acceptance does not force silver tracking');
  }
});

test('Killian gives ordinary directions before any evidence points to him',()=>{
  const f=fixture();assert.equal(f.talk('killian'),true);
  assert.doesNotMatch(f.dialogs.at(-1).lines.join(' '),/Republic|rebel|supply account/i);
  f.choose('drent-directions');assert.match(f.dialogs.at(-1).lines.join(' '),/Jojo.*Glun/);
  assert.match(f.dialogs.at(-1).lines.join(' '),/Nothom/);
  assert.equal(f.host.startFight(),false,'ordinary conversation cannot initiate a confrontation');
});

test('camp search gives a sealed packet, explicit reading reveals the choice, and delivery consumes it once',()=>{
  const f=fixture();collected(f);
  assert.equal(f.inventory.count(DRENT_EVIDENCE_ID),1);assert.equal(f.world.drentCivilWar.evidenceTaken,true);
  assert.equal(f.host.itemText(DRENT_EVIDENCE_ID),null);assert.equal(f.host.state().evidenceRead,false);
  const choices=f.host.itemActions(DRENT_EVIDENCE_ID);assert.equal(choices[0].id,'read-evidence');
  assert.equal(f.host.state().evidenceRead,false,'listing inventory actions cannot read a letter');
  assert.equal(f.host.itemAction(DRENT_SUPPLIES_ID,'read-evidence'),false);
  assert.equal(f.host.itemAction(DRENT_EVIDENCE_ID,'read-evidence'),true);
  assert.match(f.host.itemText(DRENT_EVIDENCE_ID),/Killian/);
  assert.deepEqual(f.host.itemActions(DRENT_EVIDENCE_ID),[]);
  assert.equal(f.host.state().chosenPath,null);
  f.talk('killian');f.choose('drent-killian');
  assert.equal(f.inventory.has(DRENT_EVIDENCE_ID),false);assert.equal(f.skills.taught('stealth'),true);
  assert.equal(f.host.state().chosenPath,'republican');assert.equal(f.host.act('report-glun').ok,false);
});

test('a rejected grant and a rejected skill lesson leave quest and inventory exchanges intact',()=>{
  const f=fixture();act(f.host,'defeat-ambush','accept-investigation');
  const realAdd=f.inventory.add;f.inventory.add=()=>false;
  assert.equal(f.host.act('search-camp').ok,false);assert.equal(f.host.state().evidenceFound,false);
  f.inventory.add=realAdd;f.inventory.add(DRENT_EVIDENCE_ID);
  assert.equal(f.host.act('search-camp').ok,false,'a duplicate unique grant must not consume the camp');
  f.inventory.remove(DRENT_EVIDENCE_ID);act(f.host,'search-camp','read-evidence');
  const previous=f.host.snapshot(),skillSnapshot=f.skills.snapshot(),count=f.changes.length,learn=f.skills.learn;
  f.skills.learn=()=>({ok:false});assert.equal(f.host.act('report-killian').ok,false);
  assert.equal(f.inventory.count(DRENT_EVIDENCE_ID),1);assert.deepEqual(f.host.snapshot(),previous);
  assert.deepEqual(f.skills.snapshot(),skillSnapshot);assert.equal(f.changes.length,count);
  f.skills.learn=learn;act(f.host,'report-killian');assert.equal(f.inventory.has(DRENT_EVIDENCE_ID),false);
});

test('barracks guards use authored patrol routes and pause while gameplay is paused',()=>{
  const f=fixture();f.host.frame(.1,{playing:true});
  for(const [id,patrol] of Object.entries(DRENT_GUARD_PATROLS)){
    assert.deepEqual(f.world.npcPositions[id],patrol[0]);assert.equal(f.npcById.get(id).pace,1.25);
  }
  f.host.frame(8.95,{playing:true});
  for(const [id,patrol] of Object.entries(DRENT_GUARD_PATROLS))assert.deepEqual(f.world.npcPositions[id],patrol[1]);
  f.host.frame(25,{playing:false});
  for(const [id,patrol] of Object.entries(DRENT_GUARD_PATROLS))assert.deepEqual(f.world.npcPositions[id],patrol[1]);
});

test('theft requires sneaking, broken sightlines and settled suspicion before supplies or level two are granted',()=>{
  const f=fixture();republican(f);f.skills.gain('stealth',35);
  f.player.set(DRENT_SITES.supplies.x,0,DRENT_SITES.supplies.z);
  for(const id of ['drent-barracks-west','drent-barracks-east'])f.npcById.get(id).actor.group.position.set(1000,0,1000);
  f.host.frame(.1,{playing:true});assert.equal(f.host.nearby.id,'drent-barracks-supplies');f.host.interact();
  assert.equal(f.inventory.has(DRENT_SUPPLIES_ID),false,'standing theft was allowed');
  const guard=f.npcById.get('drent-barracks-west').actor.group;guard.position.set(f.player.x,0,f.player.z-2);guard.rotation.y=0;
  f.host.frame(.25,{playing:true});f.host.frame(.25,{playing:true});
  assert.ok(f.host.awareness.suspicion>STEALTH.clearAt);assert.equal(f.host.awareness.detected,false);
  assert.equal(f.host.toggleSneak(),true);f.host.frame(.1,{playing:true});f.host.interact();
  assert.equal(f.inventory.has(DRENT_SUPPLIES_ID),false,'visible theft was allowed');
  guard.position.set(1000,0,1000);f.host.frame(.1,{playing:true});
  assert.equal(f.host.awareness.visible,false);assert.ok(f.host.awareness.suspicion>STEALTH.clearAt);
  f.host.interact();assert.equal(f.inventory.has(DRENT_SUPPLIES_ID),false,'residual suspicion was ignored');
  for(let i=0;i<10;i++)f.host.frame(.25,{playing:true});
  f.host.interact();assert.equal(f.inventory.count(DRENT_SUPPLIES_ID),1);
  assert.equal(f.skills.xp('stealth'),83);assert.equal(f.skills.level('stealth'),2);
  f.talk('killian');f.choose('drent-finish-republican');
  assert.equal(f.inventory.has(DRENT_SUPPLIES_ID),false);assert.equal(f.npcById.get('killian').hidden,false);
  assert.deepEqual(f.host.trackableView().favor,{empire:0,republic:10});
});

test('the theft XP floor preserves higher skill experience',()=>{
  const f=fixture();republican(f);f.skills.gain('stealth',110);act(f.host,'steal-supplies');
  assert.equal(f.skills.xp('stealth'),110);assert.equal(f.host.act('steal-supplies').ok,false);
});

test('Glun escorts only after readiness, waits for the player, and the victory hides Killian permanently',()=>{
  const f=fixture();collected(f);f.talk('instructor');f.choose('drent-glun');
  assert.equal(f.host.state().confrontationStarted,false);assert.equal(f.combat.starts.length,0);
  f.choose('drent-not-ready');f.talk('instructor');f.choose('drent-confront');
  const glun=f.npcById.get('instructor'),killian=f.npcById.get('killian');
  f.player.set(1000,0,1000);f.host.frame(.1,{playing:true});
  assert.deepEqual(f.world.npcPositions.instructor,{x:glun.actor.group.position.x,z:glun.actor.group.position.z});
  f.player.set(glun.actor.group.position.x,0,glun.actor.group.position.z);f.host.frame(.1,{playing:true});
  assert.equal(glun.escorting,true);assert.equal(glun.walkingWith,true);
  assert.equal(f.world.npcPositions.instructor.x,killian.actor.group.position.x+2.5);
  glun.actor.group.position.set(killian.actor.group.position.x+2.5,0,killian.actor.group.position.z+1.5);
  f.player.set(killian.actor.group.position.x+4,0,killian.actor.group.position.z+2);f.host.frame(.1,{playing:true});
  f.choose('drent-fight');assert.equal(f.combat.state.encounterId,DRENT_FIGHT_ID);
  assert.equal(glun.hidden,true);assert.equal(killian.hidden,true,'world actor duplicates the combat actor');
  assert.ok(f.combat.starts[0].allies[0].level>1);assert.ok(f.combat.starts[0].enemies[0].hp>120);
  f.combat.state.phase='won';f.host.combatEvent({type:'victory',encounterId:DRENT_FIGHT_ID});
  assert.equal(glun.hidden,false);assert.equal(glun.escorting,false);assert.equal(killian.hidden,true);
  assert.equal(f.host.state().killianDefeated,true);assert.equal(f.host.state().outcome,null);
  f.talk('instructor');f.choose('drent-finish-imperial');
  assert.deepEqual(f.host.trackableView().favor,{empire:10,republic:0});
  const saved=f.host.snapshot();assert.equal(f.host.restore(saved),true);
  assert.equal(killian.hidden,true);assert.equal(glun.hidden,false);assert.equal(f.host.startFight(),false);
});

test('a save during the escort resumes with Glun ready, and invalid restore does not mutate the world',()=>{
  const f=fixture();collected(f);act(f.host,'report-glun','confront-killian');
  const saved=f.host.snapshot();assert.equal(f.host.restore(saved),true);
  assert.equal(f.host.state().confrontationStarted,false);assert.equal(f.host.state().chosenPath,'monarchist');
  assert.deepEqual(f.world.npcPositions.instructor,{x:INSTRUCTOR_STAND.x,z:INSTRUCTOR_STAND.z});
  const before=f.host.snapshot(),positions=structuredClone(f.world.npcPositions);
  assert.equal(f.host.restore({...saved,evidenceFound:false}),false);
  assert.deepEqual(f.host.snapshot(),before);assert.deepEqual(f.world.npcPositions,positions);
});

test('dismissing the confrontation does not force it open again or prevent speaking to Killian to resume',()=>{
  const f=fixture();collected(f);act(f.host,'report-glun','confront-killian');
  const glun=f.npcById.get('instructor'),killian=f.npcById.get('killian'),at=killian.actor.group.position;
  glun.actor.group.position.set(at.x+2.5,0,at.z+1.5);f.player.set(at.x+4,0,at.z+2);
  f.host.frame(.1,{playing:true});assert.equal(f.dialogs.at(-1).choices[0].id,'drent-fight');
  // Escape closes the game's modal without choosing anything; no action reaches this host.
  const shown=f.dialogs.length;
  for(let i=0;i<20;i++)f.host.frame(.1,{playing:true});
  assert.equal(f.dialogs.length,shown,'the dismissed choice reopened itself every frame');
  assert.equal(f.host.state().confrontationStarted,true);assert.equal(f.combat.starts.length,0);
  assert.equal(f.talk('killian'),true);assert.equal(f.dialogs.length,shown+1);
  assert.equal(f.dialogs.at(-1).choices[0].id,'drent-fight');f.choose('drent-fight');
  assert.equal(f.combat.state.encounterId,DRENT_FIGHT_ID);assert.equal(f.combat.starts.length,1);
});

test('Killian cannot be confronted before Glun actually arrives in the yard',()=>{
  const f=fixture();collected(f);act(f.host,'report-glun','confront-killian');
  const glun=f.npcById.get('instructor'),at=f.npcById.get('killian').actor.group.position;
  f.player.set(at.x+2,0,at.z+2);glun.actor.group.position.set(at.x+12,0,at.z);
  assert.equal(f.host.startFight(),false);assert.equal(f.talk('killian'),true);
  assert.equal(f.dialogs.at(-1).choices.some(choice=>choice.id==='drent-fight'),false);
  assert.match(f.dialogs.at(-1).lines.join(' '),/bring him here/);
  glun.actor.group.position.set(at.x+2.5,0,at.z+1.5);f.host.frame(.1,{playing:true});
  assert.equal(f.dialogs.at(-1).choices[0].id,'drent-fight');
});

test('guard sight is blocked by solid cover but not water or person footprints',()=>{
  const from={x:0,z:0},to={x:0,z:10};
  assert.equal(guardLineOfSight({colliders:[{x:0,z:5,hx:1,hz:.5,kind:'wall'}]},from,to),false);
  assert.equal(guardLineOfSight({colliders:[{x:0,z:5,r:1,kind:'tree'}]},from,to),false);
  assert.equal(guardLineOfSight({colliders:[{x:0,z:5,hx:10,hz:10,kind:'river-water'},{x:0,z:5,r:1,kind:'person'}]},from,to),true);
  assert.equal(guardLineOfSight({colliders:[{x:3,z:5,hx:.5,hz:1,kind:'wall'}]},from,to),true);
});
