import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrimeHost,LAW_ENCOUNTER_ID,npcLawProfile} from '../src/crime-host.js';
import {createInventoryState} from '../src/inventory.js';
import {createCombat} from '../src/combat.js';
import {canStand} from '../src/game-state.js';

const vec=(x,z)=>({x,y:1,z,set(x,y,z){Object.assign(this,{x,y,z});}});
function fixture({real=false,canRevive,additionalPeople=()=>[]}={}){
  const world={heightAt:()=>1,waterAt:()=>0,bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},colliders:[],
    npcPositions:{},spawn:{x:5,z:5},pierHead:{x:5,z:5}};
  const people=[{id:'harbormaster',name:'Jojo',x:0,z:1},{id:'merc-gotwood',name:'Chris',x:8,z:2},
    {id:'instructor',name:'Officer Glun',modelRole:'legion-officer',x:12,z:0},
    {id:'tidehaven-watch-north',name:'Watchman',modelRole:'legion-soldier',x:2.5,z:0},
    {id:'resident',name:'Resident',x:-3,z:0},{id:'killian',name:'Killian',x:25,z:0}];
  const npcById=new Map(people.map(n=>{world.npcPositions[n.id]={x:n.x,z:n.z};return [n.id,{...n,hidden:false,actor:{group:{position:vec(n.x,n.z),rotation:{y:0},visible:true}}}];}));
  const position=vec(0,0),inventory={...createInventoryState(),refresh(){}},dialogs=[],toasts=[],deaths=[],revivals=[],cleanup=[],jails=[];
  let host,safe=true,changes=0,closed=0,stopped=0;
  const combat=real?createCombat({world,position,onEvent:e=>host?.combatEvent(e)}):{state:{phase:'peaceful',enemies:[],allies:[],encounterId:null},
    startEncounter(config){this.started=config;this.state={phase:'active',encounterId:config.id,enemies:config.enemies.map(e=>({...e,maxHp:e.hp})),allies:[]};return true;},
    revive(){this.state.phase='peaceful';this.state.enemies=[];}};
  host=createCrimeHost({world,npcById,additionalPeople,inventory,combat,position:()=>position,
    openDialogue(npc,lines,action,leave,options){dialogs.push({npc,lines,...options});},closeDialogue(){closed++;},
    safeToInterrupt:()=>safe,stopAutoplay(){stopped++;},toast:(...args)=>toasts.push(args),onChange(){changes++;},
    onDeath:e=>deaths.push(e),onRevive:e=>revivals.push(e),onCleanup:e=>cleanup.push(e),onJail:e=>jails.push(e),
    ...(canRevive?{canRevive}:{})});
  const choose=id=>{const choice=dialogs.at(-1)?.choices.find(c=>c.id===id);assert.ok(choice,`missing ${id}`);choice.action();};
  return {host,world,npcById,position,inventory,combat,dialogs,toasts,deaths,revivals,cleanup,jails,choose,
    safe(value){safe=value;},changes:()=>changes,closed:()=>closed,stopped:()=>stopped};
}
const attack=(f,id='harbormaster',damage=24)=>f.host.assault({npcId:id,damage});

test('Jojo, Chris and Glun can all be struck; Glun is distinctly tougher',()=>{
  const f=fixture();for(const id of ['harbormaster','merc-gotwood','instructor']){
    const before=f.host.health(id).hp;assert.equal(attack(f,id).hp,before-24);
  }
  assert.equal(f.host.health('instructor').maxHp,420);assert.equal(f.host.health('tidehaven-watch-north').maxHp,240);
  assert.equal(f.host.view().bounty,60);assert.equal(npcLawProfile(f.npcById.get('harbormaster')).essential,true);
});

test('the actual nearby guard offers all three consequences and fines charge once',()=>{
  const f=fixture();f.inventory.add('copper-piece',100);attack(f);f.host.frame(.1);
  assert.equal(f.dialogs.at(-1).npc.id,'tidehaven-watch-north');assert.equal(f.stopped(),1);
  assert.deepEqual(f.dialogs.at(-1).choices.map(c=>c.id),['law-pay','law-jail','law-refuse']);
  f.choose('law-pay');assert.equal(f.inventory.count('copper-piece'),80);assert.equal(f.host.view().wanted,false);
  f.choose('law-pay');assert.equal(f.inventory.count('copper-piece'),80);assert.equal(f.host.controlsNpc('tidehaven-watch-north'),false);
});

test('insufficient funds preserve charges; jail keeps equipment and restores the player',()=>{
  const f=fixture();f.inventory.add('simple-sword');attack(f);f.host.frame(.1);f.safe(false);f.choose('law-pay');
  assert.equal(f.host.view().bounty,20);assert.match(f.dialogs.at(-1).lines[0],/cannot cover/);
  f.choose('law-jail');assert.equal(f.host.view().wanted,false);assert.equal(f.inventory.has('simple-sword'),true);
  assert.equal(f.jails[0].seconds,300);assert.deepEqual({x:f.position.x,z:f.position.z},{x:5,z:5});
  assert.equal(f.host.state().jailCount,1);
});

test('guards physically approach around scenery and wait until an interruption is safe',()=>{
  const f=fixture(),guard=f.npcById.get('tidehaven-watch-north');guard.actor.group.position.set(10,1,0);
  f.npcById.get('instructor').hidden=true;f.world.colliders.push({kind:'house',x:5,z:0,hx:1,hz:1});
  attack(f);f.safe(false);for(let frame=0;frame<150;frame++)f.host.frame(1/30);
  assert.equal(f.dialogs.length,0);assert.ok(f.host.controlsNpc(guard.id));
  assert.ok(canStand(guard.actor.group.position.x,guard.actor.group.position.z,f.world,.3));
  f.safe(true);for(let frame=0;frame<300&&!f.dialogs.length;frame++)f.host.frame(1/30);
  assert.equal(f.dialogs.length,1);assert.ok(Math.hypot(guard.actor.group.position.x,guard.actor.group.position.z)<=3.2);
});

test('refusing arrest starts real armored guard combat and defeat leads to custody',()=>{
  const f=fixture({real:true});attack(f);f.host.frame(.1);f.choose('law-refuse');
  assert.equal(f.combat.state.phase,'active');assert.equal(f.combat.state.encounterId,LAW_ENCOUNTER_ID);
  const watch=f.combat.state.enemies.find(e=>e.id==='tidehaven-watch-north');assert.equal(watch.maxHp,240);
  assert.equal(f.npcById.get(watch.id).hidden,true,'the world NPC does not duplicate its combat body');
  for(let frame=0;frame<60*45&&f.combat.state.phase==='active';frame++)f.combat.update(1/60);
  assert.equal(f.host.state().jailCount,1,'ordinary guards defeat an idle traveler');
  assert.equal(f.combat.state.phase,'peaceful');assert.equal(f.combat.state.player.hp,100);
  assert.equal(f.npcById.get(watch.id).hidden,false);assert.equal(f.host.view().wanted,false);
});

test('fleeing guard combat preserves bounty and NPC injuries on save and reload',()=>{
  const f=fixture();attack(f);f.host.frame(.1);f.choose('law-refuse');
  const guard=f.combat.state.enemies[0];guard.hp-=55;f.host.combatEvent({type:'hit',targetId:guard.id});
  f.combat.state.phase='peaceful';f.host.combatEvent({type:'retreat'});
  const saved=f.host.snapshot(),copy=fixture();assert.equal(copy.host.restore(saved),true);
  assert.equal(copy.host.health(guard.id).hp,185);assert.equal(copy.host.view().wanted,true);
  assert.equal(f.npcById.get(guard.id).hidden,false);
  copy.host.frame(.1);copy.choose('law-refuse');
  const again=copy.combat.state.enemies.find(e=>e.id===guard.id);
  assert.equal(again.maxHp,240);assert.equal(again.hp,185,'a new arrest does not heal the guard or shrink their max HP');
});

test('downed core NPCs recover, genuine deaths stay hidden, and clearing a save restores visibility',()=>{
  const f=fixture();attack(f,'harbormaster',100);attack(f,'resident',100);
  assert.equal(f.host.isDown('harbormaster'),true);assert.equal(f.deaths[0].permanent,false);assert.equal(f.deaths[1].permanent,true);
  const copy=fixture();copy.host.restore(f.host.snapshot());assert.equal(copy.deaths.length,2);
  copy.host.frame(121,{playing:true});assert.equal(copy.cleanup.length,2);
  copy.host.frame(61,{playing:true});assert.equal(copy.revivals[0].id,'harbormaster');
  assert.equal(copy.npcById.get('harbormaster').hidden,false);assert.equal(copy.npcById.get('resident').hidden,true);
  copy.host.restore(undefined);assert.equal(copy.npcById.get('resident').hidden,false);
});

test('self defense, NPC-caused harm and distant patrols do not force a spurious arrest dialogue',()=>{
  const f=fixture();f.host.assault({npcId:'resident',damage:10,selfDefense:true});
  f.host.assault({npcId:'merc-gotwood',damage:10,source:'enemy'});assert.equal(f.host.view().wanted,false);
  for(const npc of f.npcById.values())if(npc.modelRole)npc.actor.group.position.set(90,1,90);
  attack(f);f.host.frame(1);assert.equal(f.dialogs.length,0);assert.equal(f.host.leadId,null);
});

test('speaking to a guard during another active fight cannot open the arrest modal',()=>{
  const f=fixture();attack(f);f.combat.state.phase='active';
  assert.equal(f.host.converse(f.npcById.get('tidehaven-watch-north')),false);
  f.host.frame(.1);assert.equal(f.dialogs.length,0);
});

const impact=(extra={})=>({type:'melee-impact',id:'swing-1',source:'player',sourceId:'traveler',
  origin:{x:0,z:0},yaw:0,range:2.6,arc:Math.PI/3,damage:24,combatantIds:[],affectedIds:[],hits:[],...extra});

test('physical peaceful swings hurt only contacts once, with armor and solid obstruction respected',()=>{
  const f=fixture(),hit=impact();assert.equal(f.host.handleImpact(hit).externalHits,1);
  assert.equal(f.host.health('harbormaster').hp,36);assert.equal(f.host.handleImpact(hit).externalHits,0);
  assert.equal(f.host.health('harbormaster').hp,36,'the same impact is not applied twice');
  const guardHit=f.host.handleImpact(impact({id:'swing-2',yaw:Math.PI/2}));assert.equal(guardHit.externalHits,1);
  assert.equal(f.host.health('tidehaven-watch-north').hp,221,'mail mitigates the peaceful-world contact');
  f.world.colliders.push({x:0,z:.5,hx:.2,hz:.1,kind:'wall'});
  assert.equal(f.host.handleImpact(impact({id:'swing-3'})).externalHits,0,'a blade does not pass through a wall');
});

test('a world arrow strikes its first named target only; another shooter is not blamed on the player',()=>{
  const f=fixture();let result=f.host.handleImpact({type:'arrow-impact',id:'arrow-1',source:'enemy',targetNpcId:'merc-gotwood',damage:30,hits:[],combatantIds:[]});
  assert.equal(result.externalHits,1);assert.equal(f.host.health('merc-gotwood').hp,70);assert.equal(f.host.view().wanted,false);
  result=f.host.handleImpact({type:'arrow-impact',id:'arrow-2',source:'player',targetId:'harbormaster',damage:20,hits:[],combatantIds:[]});
  assert.equal(result.externalHits,1);assert.equal(f.host.health('harbormaster').hp,40);assert.equal(f.host.view().bounty,20);
});

test('internal hit aliases are not struck twice; friendly damage records scaled health and crime',()=>{
  const f=fixture();const result=f.host.handleImpact(impact({combatantIds:['ally-chris','merc-gotwood'],
    hits:[{id:'ally-chris',npcId:'merc-gotwood',team:'ally',damage:50,hp:150,maxHp:200}],
    origin:{x:8,z:0},yaw:0}));
  assert.equal(result.externalHits,0);assert.equal(f.host.health('merc-gotwood').hp,75);
  assert.equal(f.host.healthFraction('merc-gotwood'),.75);assert.equal(f.host.view().bounty,20);
});

test('authored hostile fights and sparring stay lawful, while striking a nearby civilian during practice is still assault',()=>{
  const f=fixture();f.host.handleImpact(impact({encounterId:'drent-killian-confrontation',combatantIds:['harbormaster'],
    hits:[{id:'harbormaster',team:'enemy',hp:0,maxHp:180,damage:180}]}));
  assert.equal(f.host.view().wanted,false);assert.equal(f.host.health('harbormaster').hp,60,'authored enemy death belongs to its quest');
  f.host.handleImpact(impact({id:'spar',bout:true,combatantIds:['harbormaster'],hits:[{id:'harbormaster',team:'ally',hp:1,maxHp:60,damage:59}]}));
  assert.equal(f.host.view().wanted,false);
  f.host.handleImpact(impact({id:'practice',practice:true}));assert.equal(f.host.view().bounty,20);
});

test('ordinary encounter companion deaths remain permanent and are not duplicated as new bodies',()=>{
  const f=fixture();f.host.handleImpact(impact({source:'enemy',sourceId:'rebel',origin:{x:20,z:20},
    combatantIds:['merc-gotwood'],hits:[{id:'merc-gotwood',team:'ally',hp:0,maxHp:100,damage:100}]}));
  assert.equal(f.host.health('merc-gotwood').status,'dead');assert.equal(f.deaths.length,0,'the encounter death renderer already owns this body');
  assert.equal(f.host.view().wanted,false);f.host.frame(400);assert.equal(f.host.health('merc-gotwood').status,'dead');
});

test('an encounter explicitly sparing a bystander preserves unconsciousness and eventual recovery',()=>{
  const f=fixture();f.host.handleImpact(impact({source:'enemy',sourceId:'rebel',origin:{x:20,z:20},
    combatantIds:['resident'],hits:[{id:'resident',team:'ally',hp:0,maxHp:45,damage:45,spared:true,x:3,z:9}]}));
  assert.equal(f.host.health('resident').status,'downed');assert.equal(f.deaths.length,0);
  assert.deepEqual(f.host.health('resident').position,{x:3,z:9,y:1});
  f.host.frame(181);assert.equal(f.host.health('resident').status,'alive');assert.equal(f.revivals[0].id,'resident');
});

test('restoring another quest outcome never resurrects Killian after his authored death',()=>{
  let defeated=false;const f=fixture({canRevive:npc=>npc.id!=='killian'||!defeated});
  attack(f,'killian',100);defeated=true;
  f.host.restore(undefined);assert.equal(f.npcById.get('killian').hidden,true);assert.equal(f.revivals.length,0);
  const second=fixture({canRevive:npc=>npc.id!=='killian'});attack(second,'killian',100);
  second.host.frame(181);assert.equal(second.npcById.get('killian').hidden,true);assert.equal(second.revivals.length,0);
});

test('world profiles respect authored health and creature size without making foreign soldiers Imperial police',()=>{
  assert.equal(npcLawProfile({id:'authored',maxHp:380}).maxHp,380);
  assert.equal(npcLawProfile({id:'amod-ogre',ogre:true}).maxHp,620);
  assert.equal(npcLawProfile({id:'foreign-soldier',modelRole:'suvali-guard'}).maxHp,240);
  assert.equal(npcLawProfile({id:'cat',cat:true}).maxHp,25);
  assert.equal(npcLawProfile({id:'bosco',dog:true,kind:'bosco'}).maxHp,45);
  assert.equal(npcLawProfile({id:'line-horse-0',horse:true,kind:'horse'}).maxHp,100);
  assert.equal(npcLawProfile({id:'timber-stall'}).essential,true,'later chapter contacts are core people too');
});

const customPerson=(id,extra={})=>({id,name:id,actor:{group:{position:vec(0,1),rotation:{y:0},visible:true}},...extra});

test('custom animated people share melee, arrows and direct magic damage without adding duplicate cast records',()=>{
  const puck=customPerson('puck'),ed=customPerson('ed'),bosco=customPerson('bosco',{dog:true}),batman=customPerson('batman',{maxHp:180});
  let extras=[puck,puck,null];const f=fixture({additionalPeople:()=>extras});
  f.npcById.get('harbormaster').actor.group.visible=false;
  assert.equal(f.host.handleImpact(impact()).externalHits,1);assert.equal(f.host.health('puck').hp,36);
  assert.equal(f.npcById.has('puck'),false,'the ordinary cast stays owned by its original host');
  assert.equal(f.host.people().filter(npc=>npc.id==='puck').length,1);
  extras=[ed,bosco,batman];
  f.host.handleImpact({type:'arrow-impact',id:'ed-arrow',source:'player',targetId:'ed',damage:20});
  assert.equal(f.host.health('ed').hp,40);assert.equal(f.host.health('bosco').hp,45);
  assert.equal(f.host.assault({npcId:'batman',damage:30}).hp,150,'direct spell damage resolves custom people too');
  bosco.actor.group.visible=false;
  assert.equal(f.host.handleImpact({type:'arrow-impact',id:'bosco-hidden',source:'player',targetId:'bosco',damage:20}).externalHits,0);
  assert.equal(f.host.assault({npcId:'bosco',damage:20}).ok,false,'an absent actor is not an invisible magic target');
  assert.equal(f.host.view().bounty,60);
});

test('custom creature and stable-horse deaths persist when their separate animation hosts reappear',()=>{
  const dog=customPerson('bosco',{dog:true}),horse=customPerson('line-horse-0',{horse:true});
  const f=fixture({additionalPeople:()=>[dog,horse]});
  assert.equal(attack(f,'bosco',50).hp,0);assert.equal(attack(f,horse.id,110).hp,0);
  assert.equal(f.deaths.length,2);assert.equal(dog.actor.group.visible,false);assert.equal(horse.hidden,true);
  const dog2=customPerson('bosco',{dog:true}),horse2=customPerson('line-horse-0',{horse:true});
  const copy=fixture({additionalPeople:()=>[dog2,horse2]});assert.equal(copy.host.restore(f.host.snapshot()),true);
  assert.equal(copy.host.person('bosco'),dog2);assert.equal(copy.host.health('bosco').status,'dead');
  horse2.actor.group.visible=true;copy.host.frame(.1,{playing:false});
  assert.equal(horse2.actor.group.visible,false,'an independent render loop cannot resurrect the stable horse');
  copy.host.frame(400);assert.equal(copy.host.health(horse.id).status,'dead');
  assert.equal(copy.host.handleImpact({type:'arrow-impact',id:'dead-horse',source:'player',targetId:horse.id,damage:20}).externalHits,0);
  assert.equal(copy.host.restore(undefined),true);assert.equal(dog2.hidden,false);assert.equal(horse2.actor.group.visible,true);
});
