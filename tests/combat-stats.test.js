import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_ATTRIBUTES,combatAttributes,playerCombatStats} from '../src/gameplay/combat/combat-stats.js';
import {createLizeemEncounter,ENCOUNTER_TIMING} from '../src/gameplay/combat/lizeem-encounter.js';
import {COMBAT_TRIALS} from '../src/gameplay/combat/combat-trials.js';
import {encounterAttack} from '../src/gameplay/combat/encounter-attacks.js';
import {encounterCue} from '../src/gameplay/combat/encounter-cue.js';
import {encounterFeedback} from '../src/gameplay/combat/encounter-feedback.js';
import {createOvesosPractice} from '../src/dev/tools/ovesos-practice.js';
import {sourceModule} from './module-loader.js';
const {encounterHeroPose,encounterGuardPose}=await sourceModule('../src/app/lizeem/encounter-presentation.js');
const create=(extra={})=>createLizeemEncounter({opponent:'bandit',heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],move:(p,x,z)=>({x:p.x+x,z:p.z+z}),...extra});
const close=(a,b,tolerance=1e-9)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('default attributes preserve player timing and the three authored opponents',()=>{
  assert.deepEqual(playerCombatStats().timing,ENCOUNTER_TIMING);
  const expected=[[50,1.8,10,.72],[75,3.4,17,.56],[100,2.7,20,.45]];
  for(const [i,trial] of ['bramble-goblin','wolf','bandit'].map(id=>COMBAT_TRIALS.find(t=>t.id===id)).entries()){
    const a=create({opponent:trial.id}),b=create({opponent:trial.id,heroAttributes:COMBAT_ATTRIBUTES});
    for(let j=0;j<180;j++)assert.deepEqual(a.tick(1/60,{attack:j%40<2}),b.tick(1/60,{attack:j%40<2}));
    const s=create({opponent:trial.id}).snapshot(),g=s.guards[0],attack=encounterAttack(g);
    assert.equal(g.maxHp,expected[i][0]);assert.equal(g.combat.moveSpeed,expected[i][1]);assert.equal(attack.damage,expected[i][2]);close(attack.windup+attack.contact,expected[i][3]);
  }
});

test('quickness changes actual player contact, repeat rate and animation together',()=>{
  const contacts=[];
  for(const quickness of [1,10,20]){
    const m=create({passive:true,heroAttributes:{quickness},opponentAttributes:{vitality:20}}),stats=m.snapshot().hero.combat,hits=[];
    let s=m.tick(1/600,{attack:true}),begun=s.time,last=null;
    for(let i=0;i<2500&&hits.length<2;i++){
      s=m.tick(1/600,{attack:true});
      if(s.hero.swing>0)close(encounterHeroPose(s.hero).progress,1-s.hero.swing/stats.timing.swing);
      if(s.hero.lastStrike?.at!==last&&s.hero.lastStrike){hits.push(s.hero.lastStrike.at);last=s.hero.lastStrike.at;}
    }
    assert.equal(hits.length,2);close(hits[0]-begun,stats.timing.contact,.004);close(hits[1]-hits[0],stats.timing.attackCooldown,.004);
    assert.equal(s.hero.combat.timing.dodge,ENCOUNTER_TIMING.dodge);contacts.push(hits[0]);
  }
  assert(contacts[0]>contacts[1]&&contacts[1]>contacts[2]);
});

test('enemy quickness preserves the committed lunge and one hit, with matching warning and pose',()=>{
  for(const quickness of [1,20])for(const dt of [1/600,1/60,.1]){
    const m=create({opponent:'wolf',guardStarts:[{x:0,z:-2.8}],opponentAttributes:{quickness}});let s=m.tick(dt),first=s.time,contact=null;
    const attack=encounterAttack(s.guards[0]);
    for(let i=0;i<3000&&s.guards[0].phase!=='recover';i++){
      s=m.tick(dt);const g=s.guards[0];if(s.hero.hp<100&&contact===null)contact=s.time;
      if(g.phase==='windup'){close(encounterCue(g).fraction,1-g.timer/attack.windup);close(encounterGuardPose(g).progress,1-g.timer/attack.windup);}
    }
    assert.equal(s.guards[0].phase,'recover');close(s.guards[0].z,-1.65);assert.equal(s.hero.hp,83);
    close(contact-first,attack.windup+attack.contact,dt*2+.00001);
    assert.equal(attack.reach,1.85);assert.equal(s.guards[0].heading,0);
  }
});

test('power, vitality and mobility affect real combat, including feedback and collision',()=>{
  const m=create({passive:true,heroAttributes:{power:15,vitality:15},opponentAttributes:{vitality:20}});
  let s=m.tick(.01,{attack:true});for(let i=0;i<30&&!s.hero.lastStrike;i++)s=m.tick(.01);
  assert.equal(s.hero.maxHp,150);assert.equal(s.hero.hp,150);assert.equal(s.guards[0].hp,162);assert.equal(s.hero.lastStrike.damage,38);
  assert.match(encounterFeedback(s).text,/-38 health/);
  const enemy=create({heroAttributes:{vitality:15},opponentAttributes:{power:5}});let e=enemy.snapshot();for(let i=0;i<300&&e.hero.hp===150;i++)e=enemy.tick(.01);
  assert.equal(e.hero.hp,140);assert.equal(e.hero.lastDefense.damage,10);
  for(const mobility of [5,15]){
    const moving=create({passive:true,heroAttributes:{mobility}});let state;for(let i=0;i<60;i++)state=moving.tick(1/60,{x:1});close(state.hero.x,mobility*.4);
    const blocked=create({passive:true,heroAttributes:{mobility},move:(p,x,z)=>({x:Math.min(.5,p.x+x),z:p.z+z})});
    for(let i=0;i<60;i++)state=blocked.tick(1/60,{x:1});close(state.hero.x,.5);
  }
});

test('attribute validation and snapshots prevent invalid or mid-fight mutations',()=>{
  for(const values of [null,[],{power:NaN},{power:Infinity},{vitality:0},{quickness:21},{luck:10},{power:'10'},{toString:10}])assert.throws(()=>combatAttributes(values));
  const attrs={quickness:15};const m=create({heroAttributes:attrs});attrs.quickness=1;
  const s=m.snapshot();s.hero.combat.attributes.quickness=20;s.hero.combat.timing.swing=99;
  assert.equal(m.snapshot().hero.combat.attributes.quickness,15);close(m.snapshot().hero.combat.timing.swing,.35/1.2);
  assert.throws(()=>createLizeemEncounter({opponentAttributes:{power:20}}),/trial opponent/);
});

test('practice captures attributes once for rounds and retries and resets them for guards',async()=>{
  let chosen={quickness:15,vitality:15},options,outcome=null,reads=0;
  const p=createOvesosPractice({attributes:()=>{reads++;return chosen;},capture:()=>({}),prepare:async()=>{},restore(){},onError:assert.fail,
    open:o=>{options=o;outcome=null;return {snapshot:()=>({outcome,hero:{hp:140,maxHp:150},time:8}),dispose(){}};}});
  await p.start('trials');chosen.quickness=5;assert.equal(options.heroAttributes.quickness,15);
  outcome='success';p.advance();assert.equal(options.trial.id,COMBAT_TRIALS[1].id);assert.equal(options.heroAttributes.quickness,15);assert.equal(options.results[0].maxHp,150);
  p.retry();assert.equal(options.heroAttributes.vitality,15);assert.equal(reads,1);
  p.finish();await p.start('lesson');assert.deepEqual(options.heroAttributes,COMBAT_ATTRIBUTES);assert.equal(reads,1);p.finish();
  await p.start('trials');assert.equal(options.heroAttributes.quickness,5);assert.equal(reads,2);p.finish();
});
