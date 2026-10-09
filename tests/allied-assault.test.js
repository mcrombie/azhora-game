import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {sourceModule} from './module-loader.js';
import {createAlliedAssault,ALLIED_ASSAULT} from '../src/gameplay/combat/allied-assault.js';
import {encounterAttack} from '../src/gameplay/combat/encounter-attacks.js';
import {encounterCue} from '../src/gameplay/combat/encounter-cue.js';
import {encounterInstruction} from '../src/gameplay/combat/encounter-lesson.js';
const arena=()=>createLizeemEncounter({heroStart:{x:0,z:3},guardStarts:[-4.05,-1.35,1.35,4.05].map(x=>({x,z:-8})),allyStarts:[-3,0,3].map(x=>({x,z:0})),rallyPoint:{x:0,z:-3},move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
function play(model,active){let s=model.snapshot(),closest=Infinity;for(let i=0;i<5401&&!s.outcome;i++){s=model.tick(1/60,active?encounterAutoplayInput(s):{});const bodies=[s.hero,...s.guards,...s.allies].filter(a=>a.hp&&!a.escaped);for(let a=0;a<bodies.length;a++)for(let b=a+1;b<bodies.length;b++)closest=Math.min(closest,Math.hypot(bodies[a].x-bodies[b].x,bodies[a].z-bodies[b].z));}return {s,closest};}
test('allies fight and take casualties; active Teresod changes a losing passive encounter',()=>{
  const passive=play(arena(),false).s;assert.equal(passive.outcome,'defeat');assert.equal(passive.squad.alliesLost,3);assert(passive.squad.damageByAllies>0);assert.equal(passive.squad.damageByHero,0);
  const model=arena(),{s,closest}=play(model,true);assert.equal(s.outcome,'success');assert(s.squad.damageByAllies>0&&s.squad.damageByHero>0);assert(closest>=1.1-1e-6);assert.equal(s.squad.routed,1);assert.equal(s.guards.filter(g=>!g.hp).length,3);assert(s.guards.find(g=>g.routed).hp>0);assert.equal(s.objective.held,6);
  const before=s.allies.map(a=>[a.x,a.z]);for(let i=0;i<180;i++)model.aftermath(1/60);const after=model.snapshot();assert.notDeepEqual(after.allies.map(a=>[a.x,a.z]),before);assert.deepEqual(after.squad,{...s.squad,regrouped:true});assert.equal(after.time,s.time);
});
test('allies cannot become hero melee, spell, or focus targets',()=>{
  const model=arena();assert.equal(model.fireballHit(100,50),false);let s=model.snapshot();
  for(let i=0;i<120;i++){s=model.tick(1/60,{attack:true,focusId:100});assert.equal(s.hero.focusId,null);assert(s.hero.targetId===null||s.hero.targetId<100);}
  assert(s.allies.every(a=>a.hp===50));assert.equal(s.squad.damageByHero,0);
});
test('a wounded enemy notices Teresod without redirecting a committed attack, then gives a full warning',()=>{
  const model=createLizeemEncounter({heroStart:{x:0,z:2.2},guardStarts:[{x:0,z:0}],allyStarts:[{x:0,z:-1.5}],rallyPoint:{x:0,z:4},attackPattern:['thrust'],move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
  let s=model.tick(1/60),g=s.guards[0];assert.equal(g.phase,'windup');assert.equal(g.targetId,100);const heading=g.heading;
  for(let i=0;i<11;i++)s=model.tick(1/60,{attack:true});g=s.guards[0];
  assert.equal(s.squad.damageByHero,25);assert.equal(g.phase,'windup');assert.equal(g.targetId,100);assert.equal(g.heading,heading);
  let turned=false,warning=false,turnAt=null;
  for(let i=0;i<600&&!s.outcome;i++){
    s=model.tick(1/60);g=s.guards[0];
    if(g.phase==='turn'){turned=true;turnAt??=s.time;assert.equal(g.targetId,-1);assert.equal(encounterCue(g).kind,'attention');assert.equal(s.hero.hp,100);}
    if(turned&&g.phase==='windup'){warning=true;assert(s.time-turnAt>=ALLIED_ASSAULT.turnWarning-1/60);assert.equal(g.targetId,-1);assert(g.timer>=encounterAttack(g).windup-1/60);break;}
  }
  assert(turned&&warning,'The wounded soldier visibly turns, then begins a complete new windup');
});
test('allies reserve separate side approaches and leave the hero-facing route open',()=>{
  const state={time:0,hero:{x:0,z:3,hp:100},guards:[{id:0,x:0,z:0,hp:50,phase:'approach'}]},paths=[];
  const squad=createAlliedAssault(state,{starts:[-3,0,3].map(x=>({x,z:4})),walk:(a,p)=>paths.push({id:a.id,...p}),canHit:()=>true});
  squad.tick(1/60);assert.equal(paths.length,3);
  for(const p of paths){assert(Math.hypot(p.x,p.z-3)>2.2);for(const q of paths)if(p!==q)assert(Math.hypot(p.x-q.x,p.z-q.z)>1.5);}
  const first=paths.map(p=>({...p}));paths.length=0;state.time=.1;squad.tick(1/60);assert.deepEqual(paths,first,'Slots do not alternate every frame');
});
test('nearby flank attacks draw attention and the last survivor visibly breaks before fleeing',()=>{
  const model=arena();let s=model.snapshot(),turns=0,broken=null;
  for(let i=0;i<5401&&!s.outcome;i++){
    s=model.tick(1/60,encounterAutoplayInput(s));turns+=s.guards.filter(g=>g.phase==='turn').length;
    if(s.guards.some(g=>g.phase==='breaking')){broken=s;break;}
  }
  assert(turns>0,'At least one enemy reacts during an ordinary flank-and-counter fight');assert(broken);
  const g=broken.guards.find(g=>g.routed),hp=g.hp,point={x:g.x,z:g.z};assert(hp>0);assert.equal(g.speed,0);assert.equal(encounterCue(g).text,'THEIR LINE BREAKS');assert.equal(encounterInstruction(broken).kind,'rally');
  assert.equal(model.fireballHit(g.id,50),false,'Retreat is not an extra kill');
  for(let i=0;i<20;i++)s=model.tick(1/60);assert.deepEqual({x:s.guards[g.id].x,z:s.guards[g.id].z},point);
  for(let i=0;i<60;i++)s=model.tick(1/60);assert.equal(s.guards[g.id].phase,'retreat');assert.equal(s.guards[g.id].hp,hp);assert.equal(s.squad.routed,1);assert(Math.hypot(s.guards[g.id].x-point.x,s.guards[g.id].z-point.z)>1);
  for(let i=0;i<120;i++)s=model.tick(1/60,{z:1});
  assert.match(encounterInstruction(s).text,/Follow the gold arrow/);
  for(let i=0;i<600;i++)s=model.tick(1/60);
  assert(s.guards[g.id].departed,'Routed survivor leaves instead of standing at a fixed destination forever');
  assert.equal(encounterCue(s.guards[g.id]),null);assert.equal(s.guards[g.id].hp,hp);assert.equal(s.squad.routed,1);
  for(let i=0;i<5400;i++)s=model.tick(1/60);
  assert(s.time>90);assert.equal(s.outcome,null,'An empty field cannot defeat the player while they find the standard');
  for(let i=0;i<900&&!s.outcome;i++)s=model.tick(1/60,encounterAutoplayInput(s));
  assert.equal(s.outcome,'success');assert.equal(s.objective.held,6);
});
test('blocked evacuation replans twice and terminates without extra casualties or a frozen opponent',()=>{
  const state={time:0,hero:{x:0,z:0,hp:100},guards:[{id:0,x:0,z:2,hp:30},{id:1,hp:0},{id:2,hp:0}],objective:{rally:{x:0,z:3}}};
  let plans=0;const squad=createAlliedAssault(state,{starts:[],walk:()=>{},canHit:()=>true,retreatRoute:()=>{plans++;return [{x:0,z:20}];}});
  for(let i=0;i<300;i++){state.time+=1/60;squad.tick(1/60);}
  const g=state.guards[0];assert.equal(plans,3);assert(g.departed);assert.equal(g.hp,30);assert.equal(g.speed,0);assert.equal(state.squad.routed,1);
  const before={...g};for(let i=0;i<120;i++)squad.aftermath(1/60);assert.deepEqual(g,before);
});
function rally(){const c=createCampaign(WORLD_WAR_SCENARIO);c.step(3);c.locateHero('caricas');const b=c.snapshot().engagements[0];assert(c.joinBattle(b.id,b.location).ok);assert(c.resolveEncounter(b.id,'west','defeat','runner-arrived',2,{escaped:1}).ok);assert(c.joinBattle(b.id,b.location).ok);return {c,b,id:c.snapshot().pending.id};}
const total=s=>s.armies.reduce((n,a)=>n+a.strength,0)+Object.values(s.regions).reduce((n,r)=>n+r.garrison,0);
test('allied withdrawal saves losses on both sides, keeps the choice, and never awards routed soldiers as kills',()=>{
  const {c,b,id}=rally();assert(c.chooseAssault(id,'allied').ok);const before=c.snapshot();assert(!c.chooseAssault(id,'solo').ok);
  for(const progress of [{alliesLost:4},{routed:3},{allyDamage:201}]){assert(!c.resolveEncounter(id,'west','withdraw','withdrew',2,progress).ok);assert.deepEqual(c.snapshot(),before);}
  assert(c.resolveEncounter(id,'west','withdraw','withdrew',2,{escaped:0,alliesLost:1,routed:1,allyDamage:38}).ok);
  assert.equal(total(before)-total(c.snapshot()),2);assert.equal(c.snapshot().day,4);assert(c.joinBattle(b.id,b.location).ok);
  const p=c.snapshot().pending;assert.equal(p.rally.guards,2);assert.deepEqual(p.rally.allied,{totalAllies:3,lost:1,routed:1,damage:38});assert.equal(p.rally.style,'allied');
  assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
  assert(c.resolveEncounter(id,'west','success','rally-secured',2,{escaped:0,alliesLost:1,routed:0,allyDamage:50}).ok);
  const s=c.snapshot();assert.equal(s.day,6);assert.equal(s.regions.caricas.owner,'west');assert.equal(s.engagements[0].rally.removed,3);assert.equal(s.engagements[0].rally.allied.lost,2);assert.equal(s.engagements[0].rally.allied.routed,1);assert.equal(s.engagements[0].status,'resolved');assert(!c.resolveEncounter(id,'west','success','rally-secured',2).ok);assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,s).snapshot(),s);
});
test('solo remains the default, legacy progress cannot recruit a fresh allied squad',()=>{
  const {c,b,id}=rally();assert.equal(c.snapshot().pending.rally.style,undefined);assert(c.resolveEncounter(id,'west','withdraw','withdrew',1,{escaped:0}).ok);assert(c.joinBattle(b.id,b.location).ok);assert(!c.chooseAssault(id,'allied').ok);assert(c.chooseAssault(id,'solo').ok);assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
});
test('temporary soldier disposal frees its resources without disposing shared primitives or cached materials',async()=>{
  const {createCharacter,disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
  const a=createCharacter({role:'legion-soldier',armed:true}),b=createCharacter({role:'legion-soldier',armed:true});
  const resources=actor=>{const r=new Set();actor.group.traverse(m=>{if(m.geometry)r.add(m.geometry);for(const material of [].concat(m.material??[]))r.add(material);});return r;};
  const first=resources(a),second=resources(b),disposed=new Set();for(const resource of first)resource.addEventListener('dispose',()=>disposed.add(resource));
  disposeCharacter(a);assert([...first].some(r=>!second.has(r)&&disposed.has(r)));
  for(const resource of first)assert.equal(disposed.has(resource),!second.has(resource));
  assert(b.group.children.length>0);disposeCharacter(b);
});
