import test from 'node:test';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import assert from 'node:assert/strict';
import {createSkirmishGround} from '../src/app/exploration/skirmish-ground.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {interceptionFeedback} from '../src/app/exploration/interception-feedback.js';
import {LIZEEM_FIELD_SITES} from '../src/content/scenarios/lizeem-field-sites.js';
const plain=()=>({bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>2,waterAt:()=>0,readyAt:()=>true,regionAt:()=>({id:13}),nearColliders:()=>[]});
test('both field sites reuse ground validation, playable approaches and region-correct results',()=>{
  for(const [id,site] of Object.entries(LIZEEM_FIELD_SITES)){
    const world={...plain(),regionAt:()=>({id:site.regionId})},centre={x:0,z:0},ground=createSkirmishGround(world,centre,site.regionId);
    for(const hero of [centre,{x:8,z:6},{x:-8,z:-6}]){
      const setup=ground.interception(hero,site.approachHeading??0);assert.equal(setup.guards.length,3);
      assert(setup.guards.every(p=>ground.clear(p.x,p.z)&&ground.canHit(hero,p)));
      assert(setup.route.every(p=>ground.clear(p.x,p.z)));
    }
    const feedback=interceptionFeedback({outcome:'success',guards:[{hp:0},{hp:0},{hp:0}],objective:{reason:'vanguard-broken'}},{strength:12,endsOn:8,regionName:site.name});
    assert(feedback.detail.includes(`control of ${site.name} has not changed`));if(id==='ovesos')assert(!feedback.detail.includes('Caricas'));
    assert.throws(()=>createSkirmishGround({...world,regionAt:()=>({id:999})},centre,site.regionId).interception(centre));
  }
});
test('partial interception explains the stopped soldiers, removed strength and remaining reinforcements',()=>{
  const feedback=interceptionFeedback({outcome:'defeat',objective:{reason:'runner-arrived'},guards:[{hp:0},{hp:50},{hp:25}]},{strength:12,endsOn:12});
  assert.equal(feedback.title,'Partial interception');assert.match(feedback.detail,/surviving runners/);assert.match(feedback.detail,/1 of 3 soldiers stopped/);assert.match(feedback.detail,/4 of 12 reinforcement strength removed; 8 remains/);assert.match(feedback.detail,/control of Caricas has not changed/);
});

test('one escaped runner does not end combat or become an attack target again',()=>{
  const model=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:20,z:0},{x:50,z:0},{x:55,z:0}],reinforcementRoute:[{x:20,z:0}],move:(a,x,z)=>({x:a.x+x,z:a.z+z})});
  let s=model.tick(.05);assert(s.guards[0].escaped);assert.equal(s.outcome,null);
  for(let i=0;i<100;i++)s=model.tick(.05,{x:1,attack:true});
  assert.equal(s.guards[0].hp,50);assert.equal(s.guards[0].phase,'escaped');assert.equal(s.outcome,null);
});

test('one or two stopped soldiers are retained when the remaining runners escape',()=>{
  for(const count of [1,2]){
    const starts=count===1?[{x:1.5,z:0},{x:50,z:0},{x:55,z:0}]:[{x:1.5,z:0},{x:-1.5,z:0},{x:50,z:0}];
    const model=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:starts,reinforcementRoute:[{x:0,z:0},{x:20,z:0}],move:(a,x,z)=>({x:a.x+x,z:a.z+z})});let s=model.snapshot();
    for(let i=0;i<1800&&s.guards.filter(g=>!g.hp).length<count;i++)s=model.tick(1/60,encounterAutoplayInput(s));
    assert.equal(s.guards.filter(g=>!g.hp).length,count);
    for(let i=0;i<4000&&!s.outcome;i++)s=model.tick(1/60,{z:1});
    assert.equal(s.objective.reason,'runner-arrived');assert.equal(s.guards.filter(g=>!g.hp).length,count);assert.equal(s.guards.filter(g=>g.escaped).length,3-count);
  }
});

test('combat feedback distinguishes hits, blocked strikes, range misses and dodged damage',()=>{
  for(const [distance,clear,kind] of [[2,true,'guarded'],[2,false,'blocked'],[6,true,'out-of-range']]){
    const model=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-distance}],canHit:()=>clear});
    model.tick(.05,{attack:true});let s;for(let i=0;i<4;i++)s=model.tick(.05);assert.equal(s.hero.lastStrike.kind,kind);assert.equal(s.guards[0].hp,kind==='hit'?25:50);assert.equal(s.guards[0].hurt>0,kind==='hit');
  }
  for(const dodge of [false,true]){
    const model=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:1,z:0}]});
    let s=model.snapshot();while(s.guards[0].phase!=='strike')s=model.tick(1/60);
    s=model.tick(1/60,{dodge});for(let i=0;i<10;i++)s=model.tick(1/60);
    assert(dodge?['dodged','missed'].includes(s.hero.lastDefense.kind):s.hero.lastDefense.kind==='hit');assert.equal(s.hero.hp,dodge?100:80);
  }
});
test('field spawns have clear separated approaches and fail safely on unsuitable ground',()=>{
  const world=plain(),ground=createSkirmishGround(world,{x:0,z:0}),hero={x:0,z:0};
  const guards=ground.spawn(hero);assert.equal(guards.length,3);assert(guards.every(p=>ground.clear(p.x,p.z)&&ground.canHit(hero,p)));
  for(let i=0;i<3;i++)for(let j=0;j<i;j++)assert(Math.hypot(guards[i].x-guards[j].x,guards[i].z-guards[j].z)>=3);
  for(const change of [{readyAt:()=>false},{regionAt:()=>({id:14})},{waterAt:()=>3},{nearColliders:()=>[{x:0,z:0,hx:50,hz:50}]}])assert.throws(()=>createSkirmishGround({...world,...change},hero).spawn(hero));
});
test('field movement stops at solid scenery, water, cliffs, unloaded ground and the local boundary',()=>{
  for(const change of [{nearColliders:()=>[{x:2,z:0,hx:.2,hz:5}]},{waterAt:x=>x>1?3:0},{heightAt:x=>x>1?9:2},{readyAt:x=>x<=1},{regionAt:x=>({id:x<=1?13:14})}]){
    const ground=createSkirmishGround({...plain(),...change},{x:0,z:0});assert(ground.move({x:0,z:0},5,0).x<2);
  }
  assert(createSkirmishGround(plain(),{x:0,z:0}).move({x:44,z:0},10,0).x<=45);
});
test('both sides cannot strike through a wall or across a large elevation gap',()=>{
  for(const change of [{nearColliders:()=>[{x:0,z:0,hx:.1,hz:5}]},{heightAt:x=>x>0?8:2}]){
    const ground=createSkirmishGround({...plain(),...change},{x:0,z:0});
    const model=createLizeemEncounter({heroStart:{x:-1,z:0},guardStarts:[{x:1,z:0}],move:ground.move,canHit:ground.canHit});
    for(let i=0;i<300;i++)model.tick(1/60,{attack:true});
    const s=model.snapshot();assert.equal(s.hero.hp,100);assert.equal(s.guards[0].hp,50);
  }
});
test('the same encounter rules yield victory or defeat on real-coordinate ground without an arena clamp',()=>{
  const world=plain(),centre={x:20,z:20},ground=createSkirmishGround(world,centre);
  for(const attack of [true,false]){
    const model=createLizeemEncounter({heroStart:centre,guardStarts:ground.spawn(centre),move:ground.move,canHit:ground.canHit});
    let s=model.snapshot();for(let i=0;i<5400;i++){s=model.tick(1/60,attack?encounterAutoplayInput(s):{attack:true});if(s.outcome)break;}
    assert.equal(s.outcome,attack?'success':'defeat');assert(Math.hypot(s.hero.x-20,s.hero.z-20)<45);
  }
});

test('interception has a safe rally route and an unopposed runner can reach it',()=>{
  const ground=createSkirmishGround(plain(),{x:20,z:20}),hero={x:20,z:20},setup=ground.interception(hero);
  assert(ground.clear(setup.route.at(-1).x,setup.route.at(-1).z,1.4));
  assert(ground.canHit(setup.route[0],setup.route[1]));
  const model=createLizeemEncounter({heroStart:hero,guardStarts:setup.guards,reinforcementRoute:setup.route,move:ground.move,canHit:ground.canHit});
  let s;for(let i=0;i<1800;i++){s=model.tick(1/60,{x:1});if(s.outcome)break;}
  assert.equal(s.outcome,'defeat');assert.equal(s.objective.reason,'runner-arrived');assert.equal(s.hero.hp,100);
  assert(s.time<30,'The squad advances instead of pursuing the fleeing hero forever');
});

test('holding the approach and breaking the vanguard stops the detachment',()=>{
  const ground=createSkirmishGround(plain(),{x:20,z:20}),hero={x:20,z:20},setup=ground.interception(hero);
  const model=createLizeemEncounter({heroStart:hero,guardStarts:setup.guards,reinforcementRoute:setup.route,move:ground.move,canHit:ground.canHit});
  let s=model.snapshot();for(let i=0;i<1800;i++){s=model.tick(1/60,encounterAutoplayInput(s));if(s.outcome)break;}
  assert.equal(s.outcome,'success');assert.equal(s.objective.reason,'vanguard-broken');
  const finished=model.snapshot();model.tick(.1,{x:1});assert.deepEqual(model.snapshot(),finished);
});


test('runner keeps advancing close to the hero while escorts commit to combat',()=>{
  const model=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:-1,z:-1},{x:1,z:-1},{x:0,z:-2}],reinforcementRoute:[{x:0,z:0},{x:0,z:12}],move:(a,x,z)=>({x:a.x+x,z:a.z+z})});
  let s=model.snapshot();for(let i=0;i<90;i++)s=model.tick(1/60);
  const runner=s.guards.find(g=>g.role==='runner');assert(Math.hypot(runner.x,runner.z+2)>1,'The runner goes around the escorts instead of passing through them');assert.equal(runner.attacks,0);assert.equal(runner.phase,'march');
  assert(s.guards.some(g=>g.role==='escort'&&g.attacks>0));
  for(let i=0;i<500&&!s.guards.find(g=>g.role==='runner').escaped;i++)s=model.tick(1/60,{z:1});
  assert(s.guards.find(g=>g.role==='runner').escaped);assert(s.guards.find(g=>g.role==='runner').hp>0);
});

test('stopping the runner and escorts earns the same bounded three-soldier result',()=>{
  const hero={x:20,z:20},ground=createSkirmishGround(plain(),hero),setup=ground.interception(hero);
  const m=createLizeemEncounter({heroStart:hero,guardStarts:setup.guards,reinforcementRoute:setup.route,move:ground.move,canHit:ground.canHit});
  let s=m.snapshot(),first=null;for(let i=0;i<2000&&!s.outcome;i++){s=m.tick(1/60,encounterAutoplayInput(s));first??=s.guards.find(g=>g.hp===0)?.role;}
  assert.equal(first,'runner');assert.equal(s.outcome,'success');assert.equal(s.guards.filter(g=>!g.hp).length,3);
  assert.match(interceptionFeedback(s,{strength:12,endsOn:8}).detail,/12 of 12 reinforcement strength removed/);
});

test('choosing to fight the escorts lets the runner escape with a partial contribution',()=>{
  const hero={x:20,z:20},ground=createSkirmishGround(plain(),hero),setup=ground.interception(hero);
  const m=createLizeemEncounter({heroStart:hero,guardStarts:setup.guards,reinforcementRoute:setup.route,move:ground.move,canHit:ground.canHit});
  let s=m.snapshot();for(let i=0;i<3000&&!s.outcome;i++)s=m.tick(1/60,encounterAutoplayInput({...s,guards:s.guards.filter(g=>g.role!=='runner')}));
  assert.equal(s.objective.reason,'runner-arrived');assert(s.hero.hp>0);
  assert(s.guards.find(g=>g.role==='runner').escaped);assert(s.guards.filter(g=>g.role==='escort').every(g=>g.hp===0));
  const report=interceptionFeedback(s,{strength:12,endsOn:8});assert.equal(report.title,'Partial interception');assert.match(report.detail,/8 of 12 reinforcement strength removed; 4 remains/);
});
