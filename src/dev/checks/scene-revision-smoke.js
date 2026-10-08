import {prepareWarExterior} from './tower-smoke.js';
import {setupBattlefieldEntry,checkFootEntry} from './battlefield-entry-smoke.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
let fixture,staging;

export async function residents(a){
 await prepareWarExterior(a);a.war.pause();await a.visit({x:-2328,z:65});for(let i=0;i<20;i++)a.step(.04);
 await a.visit({x:-2365,z:147});a.look({yaw:.4,pitch:.2,distance:10});
 for(let i=0;i<150;i++)a.step(.04);
 const state=a.tower.state().residents;assert(state.constructed===6,'Six existing residents construct in Minora: '+JSON.stringify(state));
 for(const p of state.people){const [x,y,z]=p.position;assert(canStand(x,z,a.testWorld,.34,y),'Resident stands on clear ground: '+p.name);assert(Number.isFinite(y),'Resident elevation');}
 const sample=()=>{const frames=Array.from({length:40},()=>a.renderStats());return {calls:frames.at(-1).calls,triangles:frames.at(-1).triangles,cpuMedianMs:frames.map(f=>f.cpuMs).sort((a,b)=>a-b)[20]};};
 a.testWorld.setResidents(false);a.step(.01);const without=sample();a.testWorld.setResidents(true);a.step(.3);const withPeople=sample();
 const delta=withPeople.calls-without.calls;assert(delta>0&&delta<=180,'Resident render budget: '+delta+' extra calls');
 const began=performance.now();for(let i=0;i<120;i++)a.testWorld.update(i/30,1/30,{x:-2365,z:147});const total=performance.now()-began;
 assert(a.tower.state().residents.animationUpdates>state.animationUpdates,'Residents animate at bounded intervals');await frame();
 return {checks:['Six existing Minora residents on clear ground','Trial toggle removes resident rendering','Added draw calls remain within 180-call cap','Residents idle and take short local walks'],performance:{without,withPeople,addedDrawCalls:delta,residents:state,worldUpdate120CallsMs:total}};
}
export async function handSpell(a){
 await a.visit({x:-2360,z:147});a.look({yaw:-.8,pitch:.12,distance:5});a.testHero.setArmed(false);a.sorcery.restore();a.step(.01);
 document.getElementById('teresod-fireball').click();const s=a.sorcery.state();assert(s.lastRelease?.source==='hand','Unarmed spell uses hand');
 assert(distance(s.lastRelease,a.testHero.handTip())<.001,'Shot starts at actual posed palm');assert(s.mana===80,'Hand cast spends normal mana');
 window.dispatchEvent(new Event('blur'));a.look({yaw:.75,pitch:.18,distance:4});a.renderStats();await frame();return {checks:['Unarmed Fireball starts at the posed hand','Casting gesture and normal mana cost'],release:s.lastRelease};
}
export async function centralBattle(a){
 window.dispatchEvent(new Event('focus'));a.sorcery.clear();fixture=await setupBattlefieldEntry(a);await checkFootEntry(a);
 const entry=a.state().position;await a.war.help('west');assert(a.state().mode==='skirmish','Outdoor battle starts: '+document.getElementById('encounter-result').textContent);
 let s=a.war.state().encounter.encounter;staging=s.staging;
 assert(Math.hypot(staging.x-fixture.battle.location.x,staging.z-fixture.battle.location.z)<=24,'Fight stages near authored centre');
 assert(Math.hypot(entry[0]-staging.x,entry[2]-staging.z)>35,'Hero relocates inward from boundary');
 a.war.withdraw();a.step(.01);
 // Re-enter from a different clear edge using the normal choice and side button.
 let edge;for(let i=0;i<64;i++){const angle=i*Math.PI/32,p={x:fixture.battle.location.x+Math.sin(angle)*69.8,z:fixture.battle.location.z+Math.cos(angle)*69.8};if(a.groundProbe(p.x,p.z).clear&&Math.hypot(p.x-entry[0],p.z-entry[2])>90){edge=p;break;}}
 assert(edge,'A second distant entry edge is available');await a.visit(edge);a.step(.01);if(a.state().mode==='playing')a.war.join();await a.war.help('west');
 assert(a.state().mode==='skirmish','Re-entry opens fight');s=a.war.state().encounter.encounter;
 assert(Math.hypot(s.staging.x-staging.x,s.staging.z-staging.z)<.001,'Different entry edge uses the same staging');
 assert(a.tower.state().residents.visible===0,'Minora residents culled away from their city');
 a.look({yaw:.5,pitch:.35,distance:12});window.dispatchEvent(new Event('blur'));await frame();
 return {checks:['Boundary acceptance relocates the player toward battle centre','Different boundary entry uses the same combat staging','No Minora bystanders rendered at Caricas'],entry,staging};
}
export async function staffSpell(a){
 window.dispatchEvent(new Event('focus'));const s=a.war.state().encounter.encounter,h=s.hero,t=s.guards[0];
 a.look({yaw:Math.atan2(h.x-t.x,h.z-t.z),pitch:.18,distance:6});a.sorcery.restore();a.step(.01);
 document.getElementById('teresod-fireball').click();const shot=a.sorcery.state();assert(shot.lastRelease?.source==='staff','Equipped battle staff supplies spell origin');
 assert(distance(shot.lastRelease,a.testHero.focusTip())<.001,'Projectile starts exactly at rendered staff tip');assert(shot.mana===80,'Staff cast spends 20 mana');
 window.dispatchEvent(new Event('blur'));a.look({yaw:Math.atan2(h.x-t.x,h.z-t.z)+1.5,pitch:.22,distance:5});a.renderStats();await frame();return {checks:['Equipped staff Fireball starts at its actual tip','Staff casting preserves mana cost'],release:shot.lastRelease};
}
export async function finish(a){
 window.dispatchEvent(new Event('focus'));for(let i=0;i<23;i++)a.step(.04);
 assert(a.war.state().encounter.encounter.guards.some(g=>g.hp<50),'Staff projectile hits live battle opponent');a.war.withdraw();
 assert(!a.state().frameErrors.length,'No renderer errors');return {checks:['Staff fireball hits enemy after traveling','No scene revision renderer errors']};
}
