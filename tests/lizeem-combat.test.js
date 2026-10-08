import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {dodgeLesson,encounterInstruction} from '../src/gameplay/combat/encounter-lesson.js';
import {moveEncounterBody,ENCOUNTER_BODY_GAP,escortScreen} from '../src/gameplay/combat/encounter-space.js';
import {selectEncounterTarget} from '../src/gameplay/combat/encounter-target.js';
import {encounterFeedback} from '../src/gameplay/combat/encounter-feedback.js';
const create=()=>createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],attackPattern:['thrust']});
const step=(model,count,input={})=>{let s;for(let i=0;i<count;i++)s=model.tick(1/60,input);return s;};
const run=(model,input)=>{let s=model.snapshot();for(let i=0;i<5500&&!s.outcome;i++)s=model.tick(1/60,input(s));return s;};

test('a raised guard blocks a frontal swing at contact without cancelling the committed strike',()=>{
  const m=create();m.tick(1/60);assert.equal(m.snapshot().guards[0].phase,'windup');
  const start=m.tick(1/60,{attack:true});assert.equal(start.hero.lastStrike,null);
  const contact=step(m,10);assert.equal(contact.guards[0].hp,50);assert.equal(contact.guards[0].phase,'windup');
  assert.equal(contact.hero.lastStrike.kind,'guarded');assert(contact.guards[0].block>0);
  assert.equal(step(m,15).skill.blocks,1,'One contact per swing');
});

test('a click in late recovery is buffered without being held',()=>{
  const m=create();m.tick(1/60,{attack:true});const s=step(m,27);assert(s.hero.cooldown<.16&&s.hero.cooldown>0);
  m.tick(1/60,{attack:true});assert.equal(step(m,16).skill.blocks,2);
});

test('dodging cancels an unlanded swing, moves without WASD, and does not repeat when held',()=>{
  const m=create();m.tick(1/60,{attack:true});let s=m.tick(1/60,{dodge:true});assert(s.hero.z>0);assert.equal(s.hero.swing,0);
  s=step(m,25,{dodge:true});assert.equal(s.guards[0].hp,50);assert.equal(s.hero.dodge,0);const position=s.hero.z;
  s=step(m,40,{dodge:true});assert.equal(s.hero.z,position);assert.equal(s.hero.dodge,0);
});

test('committed enemy attacks can be sidestepped and leave a recovery opening',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.2}]});let s=m.tick(1/60);const heading=s.guards[0].heading;
  s=step(m,22,{x:1});assert.equal(s.guards[0].heading,heading);
  while(s.guards[0].phase!=='recover')s=m.tick(1/60);
  assert.equal(s.hero.hp,100);assert.equal(s.hero.lastDefense.kind,'missed');assert(s.guards[0].open);assert(s.guards[0].timer>.5);
  assert.equal(s.skill.dodges,0,'Walking aside does not falsely award a timed dodge');
});

test('a flank hit deals damage without cancelling a committed enemy swing',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.1}]});m.tick(1/60);
  let flank=m.tick(1/60,{x:1,z:-1,dodge:true});while(flank.hero.dodge)flank=m.tick(1/60);
  m.tick(1/60,{x:flank.guards[0].x-flank.hero.x,z:flank.guards[0].z-flank.hero.z,attack:true});const s=step(m,10);
  assert.equal(s.guards[0].hp,25);assert.equal(s.guards[0].phase,'windup');assert.equal(s.hero.lastStrike.kind,'hit');
});

test('strikes require forward facing and keep the shown target and heading throughout the swing',()=>{
  const behind=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:1.9}]});
  assert.equal(behind.snapshot().hero.targetId,null);behind.tick(1/60,{attack:true});let s=step(behind,10);
  assert.equal(s.hero.heading,Math.PI);assert.equal(s.guards[0].hp,50);assert.equal(s.hero.lastStrike.kind,'off-angle');
  step(behind,25);s=behind.tick(1/60,{z:1});assert.equal(s.hero.targetId,0);
  behind.tick(1/60,{attack:true});s=step(behind,10);assert.equal(s.hero.lastStrike.target,0);
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:-.6,z:-2},{x:.6,z:-2}]});
  assert.equal(m.snapshot().hero.targetId,0);m.tick(1/60,{attack:true});s=step(m,10,{x:1});
  assert.equal(s.hero.targetId,0);assert.equal(s.hero.heading,Math.PI);assert.equal(s.hero.lastStrike.target,0);
  assert(s.guards[0].block>0);assert.equal(s.guards[1].block,0,'Moving across a second soldier does not switch a committed strike');
});

test('an escaping target cannot redirect a committed strike onto another soldier',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.5,role:'runner'},{x:1.3,z:-1.5,role:'escort'}],reinforcementRoute:[{x:0,z:-1.5}]});
  assert.equal(m.snapshot().hero.targetId,0);m.tick(1/60,{attack:true});const s=step(m,10);
  assert(s.guards[0].escaped);assert.equal(s.hero.lastStrike.kind,'target-gone');assert.equal(s.hero.lastStrike.target,0);assert.equal(s.guards[1].hp,50);assert.equal(s.guards[1].block,0);
});

test('target preview respects terrain and living soldiers screening a runner',()=>{
  const hero={x:0,z:0,heading:Math.PI},escort={id:0,x:0,z:-1.2,hp:50},runner={id:1,x:0,z:-2.6,hp:50,role:'runner'};
  assert.equal(selectEncounterTarget(hero,[runner,escort]).id,0);
  assert.equal(selectEncounterTarget(hero,[runner,escort],()=>false),null);
  assert.equal(selectEncounterTarget(hero,[runner,{...escort,hp:0}]).id,1);
  assert.equal(selectEncounterTarget(hero,[runner,{...escort,escaped:true}]).id,1);
});

test('bodies stop a fast crossing, permit sliding and escape, and respect terrain',()=>{
  const hero={x:0,z:0,hp:100},guard={x:0,z:-1.5,hp:50},move=(a,x,z)=>({x:a.x+x,z:a.z+z});
  const blocked=moveEncounterBody(hero,0,-4,[hero,guard],move);assert(blocked.z>=guard.z+ENCOUNTER_BODY_GAP-1e-7);
  const slide=moveEncounterBody(hero,2,-2,[hero,guard],move);assert(slide.x>1);assert(Math.hypot(slide.x-guard.x,slide.z-guard.z)>=ENCOUNTER_BODY_GAP);
  const overlap={...hero,z:-1};assert(moveEncounterBody(overlap,0,.5,[overlap,guard],move).z>overlap.z);
  const againstWall=moveEncounterBody(hero,2,-2,[hero,guard],(a,x,z)=>({x:Math.min(.1,a.x+x),z:a.z+z}));
  assert(againstWall.x<=.1);assert(Math.hypot(againstWall.x-guard.x,againstWall.z-guard.z)>=ENCOUNTER_BODY_GAP-1e-7);
  assert.equal(moveEncounterBody(hero,0,-4,[hero,{...guard,hp:0}],move).z,-4);
});

test('squad movement maintains personal space during ordinary movement, strikes and dodges',()=>{
  for(const dt of [1/60,.1]){
    const m=createLizeemEncounter();let s=m.snapshot();
    for(let i=0;i<1500&&!s.outcome;i++){
      s=m.tick(dt,encounterAutoplayInput(s));const live=[s.hero,...s.guards.filter(g=>g.hp>0&&!g.escaped)];
      for(let a=0;a<live.length;a++)for(let b=0;b<a;b++)assert(Math.hypot(live[a].x-live[b].x,live[a].z-live[b].z)>=ENCOUNTER_BODY_GAP-1e-6);
    }
    assert.equal(s.outcome,'success');
  }
});

test('escorts take separate screening positions and move between the hero and runner',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:-3,z:-4},{x:3,z:-4},{x:0,z:-6}],reinforcementRoute:[{x:0,z:0},{x:0,z:12}]});
  const initial=m.snapshot(),a=escortScreen(initial.guards[0],initial.hero,initial.guards),b=escortScreen(initial.guards[1],initial.hero,initial.guards);
  assert(a.z<0&&a.z>-6);assert(Math.abs(a.x-b.x)>=1.5);
  const s=step(m,60),runner=s.guards[2];assert(s.guards.slice(0,2).every(g=>g.z>runner.z&&Math.abs(g.x)<2));
});

test('hit detection checks reach at contact rather than granting damage at button press',()=>{
  const far=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-3.1}],move:(a,x,z)=>({x:a.x+x,z:a.z+z})});
  far.tick(1/60,{attack:true});const miss=step(far,12,{z:1});assert(miss.hero.z>0);assert.equal(miss.guards[0].hp,50);assert.equal(miss.hero.lastStrike.kind,'out-of-range');
});

test('an empty swing cannot acquire a target which only moves into reach after it begins',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-2.9}]});
  assert.equal(m.snapshot().hero.targetId,null);m.tick(1/60,{attack:true});const s=step(m,10);
  assert.equal(s.guards[0].hp,50);assert.equal(s.hero.lastStrike.target,null);assert.equal(s.hero.lastStrike.kind,'no-target');
});

test('standing attack spam loses while dodge-counter play wins against one or three soldiers',()=>{
  for(const make of [create,()=>createLizeemEncounter()]){
    const spam=run(make(),()=>({attack:true})),tactical=run(make(),encounterAutoplayInput);
    assert.equal(spam.outcome,'defeat');assert(spam.skill.blocks>3);assert(spam.guards.every(g=>g.hp===50));
    assert.equal(tactical.outcome,'success');assert(tactical.hero.hp>=(tactical.guards.length===1?75:50));assert(tactical.skill.dodgeCounters>=2);assert(tactical.time<20);
    assert(dodgeLesson(tactical).complete);assert(!dodgeLesson(spam).complete);
  }
});

test('counter consumes the opening and lesson completion requires a dodge counter',()=>{
  const m=create();let s=m.snapshot();while(!s.skill.counters)s=m.tick(1/60,encounterAutoplayInput(s));
  assert.equal(s.hero.lastStrike.kind,'counter');assert.equal(s.guards[0].hp,25);assert(!s.guards[0].open);
  assert.equal(s.guards[0].phase,'stagger');assert.equal(s.skill.dodgeCounters,1);
  assert(!dodgeLesson({...s,outcome:'success',skill:{...s.skill,dodgeCounters:0}}).complete);
  assert(!dodgeLesson({...s,outcome:'defeat'}).complete);
  assert(!dodgeLesson(s).complete,'A good counter is not yet a completed fight');
});


test('a thrust is sidestepped, while a sweep catches that dodge and must be cleared',()=>{
  for(const attack of ['thrust','sweep'])for(const direction of ['side','back']){
    const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],attackPattern:[attack]});let s=m.snapshot();
    while(!(s.guards[0].phase==='windup'&&s.guards[0].timer<.18))s=m.tick(1/60);
    s=m.tick(1/60,direction==='side'?{x:1,dodge:true}:{z:1,dodge:true});
    while(s.guards[0].phase!=='recover')s=m.tick(1/60);
    const caught=attack==='sweep'&&direction==='side';
    assert.equal(s.hero.hp,caught?80:100);assert.equal(s.guards[0].open,!caught);
    assert.equal(s.hero.lastDefense.kind,caught?'hit':'dodged');
    assert.equal(s.hero.lastDefense.attack,attack);
    const hp=s.hero.hp;step(m,25);assert.equal(m.snapshot().hero.hp,hp,'One strike cannot hit twice');
  }
});

test('advanced lesson requires actual dodge counters against both attacks',()=>{
  const s=run(createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}]}),encounterAutoplayInput);
  assert.equal(s.outcome,'success');assert.equal(s.hero.hp,100);assert(s.skill.counterTypes.thrust>0&&s.skill.counterTypes.sweep>0);
  assert(dodgeLesson(s,true).complete);assert(!dodgeLesson(run(create(),encounterAutoplayInput),true).complete);
});

test('sweep remains dangerous after dodge invulnerability expires and never hits through terrain',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1}],attackPattern:['sweep'],canHit:()=>false});
  const s=run(m,()=>({attack:true}));assert.equal(s.hero.hp,100);assert.equal(s.guards[0].hp,50);assert.equal(s.skill.dodges,0);
});

test('unavailable and held dodges explain recovery and the required release without granting another dodge',()=>{
  const m=create();m.tick(1/60,{dodge:true});step(m,20);let s=m.tick(1/60,{dodge:true});
  assert.equal(s.hero.dodge,0);assert.equal(s.hero.lastDodge.kind,'cooldown');assert.match(encounterFeedback(s).text,/recovering/);
  while(s.hero.dodgeCooldown)s=m.tick(1/60,{dodge:true});
  assert.equal(s.hero.lastDodge.kind,'release');assert.match(encounterFeedback(s).text,/Release Space/);assert.equal(s.hero.dodge,0);
  m.tick(1/60);s=m.tick(1/60,{dodge:true});assert(s.hero.dodge>0);assert.equal(s.hero.lastDodge.kind,'started');
});

test('dodge obstruction reports distinguish a soldier from terrain and clear on the next dodge',()=>{
  for(const terrain of [false,true]){
    const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:terrain?-8:-1.2}],move:terrain?(a,x,z)=>({x:a.x+x,z:Math.max(-.15,a.z+z)}):null});
    let s=m.tick(.1,{z:-1,dodge:true});assert.equal(s.hero.lastDodge.kind,terrain?'terrain-blocked':'body-blocked');assert.match(encounterFeedback(s).text,terrain?/scenery/:/soldier/);
    step(m,60);s=m.tick(.1,{z:1,dodge:true});assert.equal(s.hero.dodgeObstruction,null);assert.equal(s.hero.lastDodge.kind,'started');
  }
});

test('a sweep catching the end of a sidestep reports the actual cause of damage',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],attackPattern:['sweep']});let s=m.snapshot();
  while(!(s.guards[0].phase==='windup'&&s.guards[0].timer<.18))s=m.tick(1/60);
  s=m.tick(1/60,{x:1,dodge:true});while(!s.hero.lastDefense)s=m.tick(1/60);
  assert.equal(s.hero.hp,80);assert.equal(s.hero.lastDefense.reason,'sweep-caught');assert.match(encounterFeedback(s).text,/after the dodge/);
});


test('coaching distinguishes reaching, facing and striking an actual dodge opening',()=>{
  const m=create();let s=m.snapshot();
  while(!s.guards[0].dodged)s=m.tick(1/60,encounterAutoplayInput(s));
  while(s.guards[0].phase==='strike')s=m.tick(1/60);
  assert(s.guards[0].open&&s.guards[0].dodged);
  assert.equal(dodgeLesson({...s,hero:{...s.hero,x:6,z:6}}).kind,'approach');
  const g=s.guards[0],close={...s,hero:{...s.hero,x:g.x,z:g.z+1.8,targetId:null}};
  assert.equal(dodgeLesson(close).kind,'face');
  assert.equal(dodgeLesson({...close,hero:{...close.hero,targetId:g.id}}).kind,'counter');
  assert(!dodgeLesson(s).complete,'An opening alone does not complete the exercise');
});

test('one instruction explains a failed dodge briefly then returns to the current attack',()=>{
  const m=create();m.tick(1/60,{dodge:true});step(m,20);const s=m.tick(1/60,{dodge:true});
  const before=JSON.stringify(s),feedback=encounterInstruction(s,'lesson');
  assert.equal(feedback.kind,'feedback');assert.match(feedback.text,/recovering/);
  assert.equal(JSON.stringify(s),before,'Reading guidance cannot change combat');
  const threat={...s,time:s.time+1,guards:[{...s.guards[0],phase:'windup',attack:'thrust'}]};
  assert.equal(encounterInstruction(threat,'lesson').kind,'threat');
  assert.match(encounterInstruction(threat,'lesson').text,/Thrust:/);
  assert.match(encounterInstruction({...threat,guards:[{...threat.guards[0],attack:'sweep'}]},'advanced').text,/Sweep:/);
});

test('interception instruction keeps the surviving escorts relevant after a runner escapes',()=>{
  const m=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:2,z:-20,role:'escort'},{x:0,z:-20,role:'runner'}],reinforcementRoute:[{x:0,z:-30}]});
  const s=m.snapshot();assert.match(encounterInstruction(s,'squad').text,/Stop the runner/);
  s.guards[1].escaped=true;assert.match(encounterInstruction(s,'squad').text,/Runner escaped.*escorts/);
  s.guards[1].escaped=false;s.guards[1].hp=0;assert.match(encounterInstruction(s,'squad').text,/Runner stopped.*escorts/);
});
