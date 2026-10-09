import {prepareWarExterior} from './tower-smoke.js';
import {setup} from './afterlife-smoke.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
const checks=[],assert=(v,m)=>{if(!v)throw Error(m);checks.push(m);console.log('EXPLORATION_CHECK '+m);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const fight=a=>a.war.state().encounter.encounter;
const key=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));
export async function stable(a){
  await prepareWarExterior(a);a.war.pause();window.dispatchEvent(new Event('focus'));
  await a.visit({x:STABLE.bear.x+1,z:STABLE.bear.z+1});a.look({yaw:.4,pitch:.27,distance:10});a.step(.04);
  assert(a.testWorld.nearColliders(-2426,60,15).some(c=>c.id?.startsWith('guild-stable-')),'Guild stable has physical structure in the actual world');
  assert(a.groundProbe(STABLE.horse.x,STABLE.horse.z).clear,'Starting horse retains clear mounting ground');
  key('KeyF');assert(a.state().mode==='briefing','Bear remains reachable beside the stable');
  assert(document.getElementById('stable-words').textContent.includes('guild stable'),'Bear introduces his workplace');
  for(let i=0;i<3;i++)document.getElementById('stable-next').click();
  await a.visit({x:STABLE.horse.x+1.3,z:STABLE.horse.z});key('KeyG');assert(a.stable.mounted,'Starting horse mounts beside the open stalls');
  a.look({yaw:Math.PI,pitch:.25,distance:10});a.hold('KeyW',true);for(let i=0;i<20;i++)a.step(.04);clearCombatKeys(a);
  assert(a.state().position[2]>69,'Mounted player rides clear of the stable onto the Guild Way');key('KeyG');
  await a.visit({x:-2420,z:69});a.look({yaw:.45,pitch:.27,distance:11});a.step(.04);window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks]};
}
export async function briefing(a){await setup(a);assert(!document.getElementById('assault-with-allies'),'Campaign has no experimental opt-in');assert(document.getElementById('assault-choice').textContent.includes('3 allied soldiers'),'Briefing describes the default squad');await frames();return {checks:[...checks]};}
export async function victory(a){
  window.dispatchEvent(new Event('focus'));await a.war.help('west');assert(fight(a).allies.length===3,'Default assault spawns its committed allies');
  for(let i=0;i<6600&&!fight(a).outcome;i++){driveWorldEncounter(a,fight(a));a.step(1/60);}clearCombatKeys(a);
  assert(fight(a).outcome==='success','Normal combat controls win the default allied assault');
  const dialog=document.getElementById('battle-result-dialog');assert(dialog.open&&dialog.matches(':modal'),'Victory opens a real modal pause');
  assert(document.activeElement.id==='world-skirmish-continue','Continue receives immediate keyboard focus');
  const before=JSON.stringify(fight(a)),campaign=JSON.stringify(a.war.state().campaign),mana=a.sorcery.state().mana;
  a.hold('KeyW',true);key('KeyQ');key('Escape');for(let i=0;i<240;i++)a.step(1/60);clearCombatKeys(a);
  assert(JSON.stringify(fight(a))===before&&JSON.stringify(a.war.state().campaign)===campaign&&a.sorcery.state().mana===mana,'Review freezes actors, campaign time and magic without dismissing the result');
  await frames();return {checks:[...checks],result:fight(a)};
}
export async function layout(){
  const dialog=document.getElementById('battle-result-dialog'),box=dialog.getBoundingClientRect(),button=document.getElementById('world-skirmish-continue').getBoundingClientRect();
  assert(Math.abs(box.x+box.width/2-innerWidth/2)<2&&Math.abs(box.y+box.height/2-innerHeight/2)<2,'Result is centered in '+innerWidth+'x'+innerHeight);
  assert(box.top>=0&&box.bottom<=innerHeight&&button.bottom<=box.bottom&&button.top>=box.top,'Continue stays visible without scrolling in '+innerWidth+'x'+innerHeight);
  assert(dialog.contains(document.activeElement),'Keyboard focus stays within the result dialog');return {checks:[...checks]};
}
export async function continued(a){
  for(let i=0;i<20&&a.state().mode==='skirmish';i++)await frames();
  assert(a.state().mode==='playing'&&!document.getElementById('battle-result-dialog'),'Native Enter leaves the result and removes its input trap');
  assert(a.war.state().campaign.day===6&&a.war.state().campaign.regions.caricas.owner==='west','Continue applies exactly the final day-six victory');
  a.war.pause();a.step(.04);assert(a.war.state().soldiers.people.length>0,'Aftermath has existing interactable soldiers');return {checks:[...checks]};
}
export async function soldiers(a){
  window.dispatchEvent(new Event('focus'));const people=a.war.state().soldiers.people;
  assert(people.some(p=>p.kind==='sentry')&&people.some(p=>p.kind==='survivor'),'Both sentries and surviving field soldiers are covered');
  for(const p of people){
    await a.visit({x:p.x,z:p.z+2.4});a.look({yaw:0,pitch:.28,distance:7});a.step(.16);key('KeyF');
    assert(document.getElementById('soldier-dialog').open,'F talks to '+p.kind+' at '+p.x+','+p.z);
    const before=JSON.stringify(a.war.state().campaign);document.querySelector('#soldier-dialog [data-topic="battle"]').click();
    assert(!document.getElementById('soldier-words').textContent.includes('undefined'),'Soldier has a readable factual response');
    for(let i=0;i<90;i++)a.step(.04);assert(JSON.stringify(a.war.state().campaign)===before,'Conversation spends no campaign days or troops');
    key('Escape');assert(a.state().mode==='playing','Goodbye returns to exploration');
    a.hold('KeyW',true);for(let i=0;i<45;i++)a.step(.04);clearCombatKeys(a);
    assert(a.state().position[2]>p.z+.98,'Walking cannot pass through '+p.kind);
    a.hold('KeyD',true);for(let i=0;i<20;i++)a.step(.04);clearCombatKeys(a);assert(a.state().position[0]>p.x+1.4,'Can walk away sideways without getting trapped');
  }
  const p=people.find(p=>p.kind==='survivor');await a.visit({x:p.x,z:p.z+3});a.look({yaw:0,pitch:.25,distance:7});a.step(.16);key('KeyF');
  document.querySelector('#soldier-dialog [data-topic="battle"]').click();await frames();return {checks:[...checks]};
}
export async function mounted(a){
  key('Escape');const p=a.war.state().soldiers.people.find(p=>p.kind==='survivor');
  await a.visit({x:p.x,z:p.z+4});a.stable.restore({owned:true,taught:true,horse:{x:p.x,z:p.z+4,yaw:Math.PI},version:1});key('KeyG');
  assert(a.stable.mounted,'Mounted contact uses the ordinary owned horse');a.look({yaw:0,pitch:.25,distance:8});
  a.hold('KeyW',true);a.hold('ShiftLeft',true);for(let i=0;i<50;i++)a.step(.04);clearCombatKeys(a);a.hold('ShiftLeft',false);
  assert(a.state().position[2]>p.z+1.43,'Cantering cannot tunnel through a soldier');
  assert(a.save().ok,'Postbattle soldier contact keeps the isolated save valid');await a.loadSaved();a.war.pause();
  assert(!a.state().frameErrors.length,'Default assault, modal, conversations and horse contact have no frame errors');return {checks:[...checks]};
}
