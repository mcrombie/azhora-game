import {prepareWarExterior} from './tower-smoke.js';
import {MINORA_RESIDENTS} from '../../content/regions/minora-frontier/minora-residents.js';
import {RESIDENT_CONVERSATIONS} from '../../content/regions/minora-frontier/resident-conversations.js';
import {localSight} from '../../app/exploration/local-sight.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const press=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
const checks=[];
export async function residents(a){
 await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.pause();
 for(const def of MINORA_RESIDENTS){
   await a.visit({x:def.x,z:def.z+4});for(let i=0;i<10;i++)a.step(.04);
   const person=a.tower.state().residents.people.find(p=>p.id===def.id);assert(person,'Resident constructed: '+def.name);
   const [x,y,z]=person.position;let at;
   for(const radius of [2.5,3,2,3.5])for(let i=0;i<24&&!at;i++){
     const p={x:x+Math.sin(i*Math.PI/12)*radius,z:z+Math.cos(i*Math.PI/12)*radius};
     if(a.groundProbe(p.x,p.z).clear&&localSight(a.testWorld,p,{x,z}))at=p;
   }
   assert(at,'Reachable clear conversation approach: '+def.name);await a.visit(at);a.look({yaw:Math.atan2(at.x-x,at.z-z),pitch:.16,distance:6});a.step(.04);
   assert(a.testWorld.residentTarget({x:a.state().position[0],y:a.state().position[1],z:a.state().position[2]})?.id===def.id,'Correct nearby speaker: '+def.name);
   const before=JSON.stringify(a.war.state().campaign);a.war.run();const clock=JSON.stringify(a.war.state().clock);press('KeyF');
   assert(a.residentHost.state().speaking===def.id&&a.state().mode==='briefing','F talks to '+def.name);
   assert(document.getElementById('resident-words').textContent===RESIDENT_CONVERSATIONS[def.id].hello,'Authored greeting: '+def.name);
   const start=a.tower.state().residents.people.find(p=>p.id===def.id).position;
   for(let i=0;i<90;i++)a.step(.04);
   assert(JSON.stringify(a.war.state().clock)===clock,'Dialogue freezes the campaign');
   assert(JSON.stringify(a.tower.state().residents.people.find(p=>p.id===def.id).position)===JSON.stringify(start),'Speaker stops wandering');
   document.querySelector('#resident-dialog [data-topic="work"]').click();assert(document.getElementById('resident-words').textContent===RESIDENT_CONVERSATIONS[def.id].work,'Occupation dialogue');
   document.querySelector('#resident-dialog [data-topic="war"]').click();assert(document.getElementById('resident-words').textContent===RESIDENT_CONVERSATIONS[def.id].war,'War dialogue');
   assert(JSON.stringify(a.war.state().campaign)===before,'Conversation does not alter armies or diplomacy');
   press('Tab');assert(document.activeElement.closest('#resident-dialog'),'Tab stays within dialogue');
   press('Escape');assert(a.state().mode==='playing'&&a.residentHost.state().speaking===null,'Escape closes dialogue');a.war.pause();
   checks.push(def.name+': reachable, talkable, two topics; time and speaker paused; no campaign mutation');
 }
 // Leave a representative market conversation on screen for visual inspection.
 const d=MINORA_RESIDENTS.find(p=>p.id==='portunus');await a.visit({x:d.x,z:d.z+3});a.look({yaw:.55,pitch:.2,distance:6});a.step(.04);a.residentHost.interact();
 assert(!document.getElementById('resident-dialog').hidden,'Market conversation visible');await frame();
 return {checks:[...checks],residents:a.tower.state().residents};
}
export async function spellFocus(a){
 press('Escape');const {centralBattle}=await import('./scene-revision-smoke.js');await centralBattle(a);window.dispatchEvent(new Event('focus'));
 const fight=()=>a.war.state().encounter.encounter,s=fight(),t=s.guards[0];
 a.look({yaw:Math.atan2(s.hero.x-t.x,s.hero.z-t.z),pitch:.36,distance:10});press('KeyT');a.step(1/60);
 const id=fight().presentation.focus.id;assert(id!==null,'War battle supports focus');a.sorcery.restore();document.getElementById('teresod-fireball').click();
 const release=a.sorcery.state().lastRelease;assert(release.targetId===id,'Fireball aims at the selected opponent');assert(release.source==='staff','Spell still leaves the staff');
 for(let i=0;i<23;i++)a.step(.04);
 assert(fight().guards.find(g=>g.id===id).hp<50,'Focused projectile travels and hits the intended soldier');
 assert(document.getElementById('world-skirmish-objective').textContent.includes('Fireball hit'),'Successful spell reports a hit, not a melee miss');
 assert(document.getElementById('resident-interact').hidden,'Resident prompt stays hidden during combat');
 window.dispatchEvent(new Event('blur'));await frame();assert(!a.state().frameErrors.length,'No resident dialogue or spell renderer errors');
 return {checks:['World battle camera and focus work','Fireball from staff strikes selected target','Resident prompts hidden in battle','No renderer errors'],release};
}
