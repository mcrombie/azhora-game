import test from 'node:test';
import assert from 'node:assert/strict';
import {combatUnit,defaultHumanUnit,MILITIA_WEAPONS,physicalDamage,unitBody,legacyHumanProfile} from '../src/gameplay/combat/combat-units.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {createOvesosPractice} from '../src/dev/tools/ovesos-practice.js';
import {COMBAT_TRIALS} from '../src/gameplay/combat/combat-trials.js';
import {sourceModule} from './module-loader.js';
const {createArmyUnit}=await sourceModule('../src/content/characters/army-unit-view.js');
const {disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
const THREE=await sourceModule('../vendor/three.module.js');

test('army shields face the threat upright on guard, then lower outside the body',()=>{
  for(const id of ['militiaman','orc-raider','ambron-soldier','orc-warrior','veteran-ambron-soldier','veteran-orc-warrior']){
    const actor=createArmyUnit({unitType:id}),shield=actor.group.getObjectByName('Round shield')??actor.group.getObjectByName('Ambroni heater shield')??actor.group.getObjectByName('The traveler\u2019s buckler');
    for(let i=0;i<60;i++)actor.animate(i/60,0,true,{action:'idle',shieldRaised:true});
    actor.group.updateMatrixWorld(true);
    const normal=new THREE.Vector3(0,-1,0).transformDirection(shield.matrixWorld),top=new THREE.Vector3(0,0,1).transformDirection(shield.matrixWorld);
    assert(normal.z>.85,id+' presents the shield face toward the attacker');
    assert(top.y>.85,id+' holds the shield upright');
    for(let i=60;i<120;i++)actor.animate(i/60,0,true,{action:'idle',shieldRaised:false});
    actor.group.updateMatrixWorld(true);
    assert(new THREE.Vector3(0,-1,0).transformDirection(shield.matrixWorld).x<-.85,id+' lowers the shield outside its left arm');
    disposeCharacter(actor);
  }
});

test('bandit sword parries admit damage; raised militia and raider shields stop frontal attacks',()=>{
  for(const [opponent,damage] of [['bandit',11],['militiaman',0],['orc-raider',0]]){
    const m=createLizeemEncounter({opponent,heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}]});let s=m.snapshot();
    for(let i=0;i<12;i++)s=m.tick(1/60,{attack:true});
    assert.equal(s.guards[0].maxHp-s.guards[0].hp,damage);
    assert.equal(s.hero.lastStrike.defense,opponent==='bandit'?'weapon':'shield');
    assert.equal(s.hero.lastStrike.kind,damage?'hit':'guarded');
  }
});

test('shield protection is directional and defeated by an actual flank',()=>{
  const m=createLizeemEncounter({opponent:'militiaman',heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
  let s=m.snapshot(),flank=false;
  for(let i=0;i<1200&&!s.outcome;i++){
    s=m.tick(1/60,encounterAutoplayInput(s));
    if(s.hero.lastStrike?.damage>0){assert.equal(s.hero.lastStrike.defense,null);flank=true;}
  }
  assert(flank);assert.equal(s.outcome,'success');
});

test('four militia weapons have distinct reach, damage, recovery and armor interaction',()=>{
  const p=Object.fromEntries(MILITIA_WEAPONS.map(w=>[w,combatUnit('militiaman',w)]));
  const first=w=>Object.values(p[w].combat.attacks)[0];
  assert(first('spear').reach>first('sword').reach);assert(first('spear').halfAngle<first('sword').halfAngle);
  assert(first('axe').damage>first('sword').damage);assert(first('axe').recovery>first('sword').recovery);
  const armored={armor:.5,defense:{type:'shield',reduction:1}};
  assert(physicalDamage(24,armored,{armorPiercing:first('mace').armorPiercing}).damage>physicalDamage(24,armored).damage);
  for(const weapon of MILITIA_WEAPONS){
    const m=createLizeemEncounter({opponent:'militiaman',opponentWeapon:weapon,guardStarts:[{x:0,z:-5}],move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
    let s=m.snapshot();for(let i=0;i<5500&&!s.outcome;i++)s=m.tick(1/60,encounterAutoplayInput(s));
    assert.equal(s.outcome,'success',weapon);assert.equal(s.guards[0].weapon,weapon);
  }
  assert.throws(()=>combatUnit('militiaman','laser'),/weapon/);
});

test('human defaults are militia; explicit Ambroni officers use the veteran tier',()=>{
  for(const faction of ['west','east','unknown',''])assert.equal(defaultHumanUnit({faction,officer:true}),'militiaman');
  for(const faction of ['ambron','Ambroni','empire']){
    assert.equal(defaultHumanUnit({faction}),'ambron-soldier');assert.equal(defaultHumanUnit({faction,officer:true}),'veteran-ambron-soldier');
  }
  assert(combatUnit('veteran-ambron-soldier').hp>combatUnit('ambron-soldier').hp);
  assert(combatUnit('veteran-orc-warrior').combat.attackRate>combatUnit('orc-warrior').combat.attackRate);
});

test('campaign allies and enemies use their actual weapon profiles and shield protection',()=>{
  const m=createLizeemEncounter({unitType:'militiaman',heroStart:{x:0,z:5},guardStarts:[{x:-2,z:-3,weapon:'spear'},{x:2,z:-3,weapon:'axe'}],rallyPoint:{x:0,z:0},allyStarts:[{x:-2,z:3,weapon:'mace'},{x:2,z:3,weapon:'sword'}],move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
  let s=m.snapshot();assert.deepEqual([...s.guards,...s.allies].map(g=>g.weapon),['spear','axe','mace','sword']);
  assert([...s.guards,...s.allies].every(g=>g.armor===0&&g.maxHp===100&&g.defense.type==='shield'));
  for(let i=0;i<7000&&!s.outcome;i++)s=m.tick(1/60,encounterAutoplayInput(s));
  assert.equal(s.outcome,'success');assert(s.squad.damageByAllies>0);assert(s.squad.damageByHero>0);
});

test('militia and professional models match their equipment; veterans have actual honor geometry',()=>{
  for(const weapon of MILITIA_WEAPONS){const a=createArmyUnit({weapon});assert.equal(a.group.userData.armyUnit,'militiaman');assert.equal(a.group.userData.weapon,weapon);assert.equal(a.group.userData.armor,0);disposeCharacter(a);}
  for(const id of ['orc-raider','ambron-soldier','orc-warrior','veteran-ambron-soldier','veteran-orc-warrior']){
    const a=createArmyUnit({unitType:id}),body=unitBody(id);assert.equal(a.group.userData.defense,body.defense.type);assert.equal(a.group.userData.armor,body.armor);
    if(id.startsWith('veteran'))assert(a.group.getObjectByName('Veteran sunburst honor badge'));
    if(id.includes('orc'))assert(a.group.getObjectByName('Orc lower tusk'));
    if(id.includes('orc-warrior'))assert(a.group.getObjectByName('Fitted orc cuirass'));
    disposeCharacter(a);
  }
});

test('militia selection persists through retry and is captured once per run',async()=>{
  let weapon='spear',opened;
  const p=createOvesosPractice({attributes:()=>({}),militiaWeapon:()=>weapon,capture:()=>({}),prepare:async()=>{},restore:()=>{},onError:assert.fail,open:options=>{opened=options;return {snapshot:()=>({outcome:'success',hero:{hp:100},time:1}),dispose(){}};}});
  const round=COMBAT_TRIALS.findIndex(t=>t.id==='militiaman');
  await p.start('trials');weapon='mace';for(let i=0;i<round;i++)p.advance();assert.equal(opened.trial.weapon,'spear');p.retry();assert.equal(opened.trial.weapon,'spear');p.finish();
  await p.start('trials');for(let i=0;i<round;i++)p.advance();assert.equal(opened.trial.weapon,'mace');p.finish();
});

test('the raider punishes frontal trading after the militia lesson but leaves usable counters',()=>{
  for(const [input,outcome] of [[()=>({attack:true}),'defeat'],[encounterAutoplayInput,'success']]){
    const m=createLizeemEncounter({opponent:'orc-raider',heroStart:{x:0,z:0},guardStarts:[{x:0,z:-6}],move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
    let s=m.snapshot();for(let i=0;i<5500&&!s.outcome;i++)s=m.tick(1/60,input(s));
    assert.equal(s.outcome,outcome);if(outcome==='success')assert(s.skill.dodgeCounters>0);
  }
});

test('adventure defaults share militia, professional and veteran profiles without changing authored NPCs',()=>{
  assert.equal(legacyHumanProfile({kind:'soldier'}).armor,0);
  assert.equal(legacyHumanProfile({kind:'soldier',look:'legion'}).unitType,'ambron-soldier');
  assert.equal(legacyHumanProfile({kind:'officer'}).hp,160);
  assert.equal(legacyHumanProfile({kind:'legionary'}).hp,130);
  assert.equal(legacyHumanProfile({kind:'legionary',model:{role:'militiaman'}}).unitType,'militiaman');
  assert.equal(legacyHumanProfile({kind:'soldier',model:{role:'suvali-guard'}}),null);
  assert.equal(legacyHumanProfile({kind:'wolf'}),null);
});
