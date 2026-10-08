import {prepareWarExterior} from './tower-smoke.js';
import {MINORA_COUNCIL,councilDoor,councilPerson} from '../../content/regions/minora-frontier/minora-council.js';
import {createWorldWar} from '../../app/exploration/world-war.js';
import {setupBattlefieldEntry,checkFootEntry} from './battlefield-entry-smoke.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const f=()=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true}));
async function doorway(a){f();for(let i=0;i<200&&a.state().mode==='loading';i++)await new Promise(r=>setTimeout(r,50));assert(a.state().mode==='playing','Doorway finished');}
function flags(a,leader){const s=a.tower.state().councilFlags;assert(s?.leader===leader,'Expected council leader '+leader);assert(s.gates.every(g=>{const top=g.standards.find(s=>s.id===leader);return top.x===0&&g.standards.filter(s=>s!==top).every(s=>s.y<top.y);}), 'Highest central standards match council');}
export async function checkTemple(a){
 await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.pause();flags(a,'taleth');
 const lore=document.getElementById('war-loading-lore');assert(lore?.querySelector('p')?.textContent.length>40,'Scenario loading lore installed');const prior=lore.querySelector('p').textContent;lore.querySelector('button').click();assert(lore.querySelector('p').textContent!==prior,'Loading history rotates on request');
 await a.visit(MINORA_COUNCIL.temple.exit);assert(a.groundProbe(MINORA_COUNCIL.temple.exit.x,MINORA_COUNCIL.temple.exit.z).clear,'Temple exterior doorway is clear');await doorway(a);
 assert(a.tower.state().room==='temple','Temple opens as a separate room');a.war.run();const before=JSON.stringify(a.war.state().clock);for(let i=0;i<800;i++)a.step(.04);assert(JSON.stringify(a.war.state().clock)===before,'Time remains held in the temple');a.war.pause();
 a.hold('KeyW',true);for(let i=0;i<200;i++)a.step(.02);a.hold('KeyW',false);
 const p=councilPerson('temple');await a.visit({x:p.x+1.7,z:p.z+2.2});a.look({yaw:-.5,pitch:.17,distance:5});f();
 assert(a.council.state().met.includes('temple'),'High Priest met through F');assert(document.getElementById('council-words').textContent.includes('East Lizeem'),'Priest favors East');await frame();
 return {checks:['Neutral standards at all four gates','Loading screen contains scenario history','Temple doorway opens a separate navigable room','Temple holds campaign time','High Priest conversation and authored appearance']};
}
export async function checkMayor(a){
 document.getElementById('council-close').click();assert(a.save().ok,'Save inside temple succeeds');const saved=a.store.read().data;await a.loadSaved();assert(a.tower.state().room==='temple','Temple Save/Continue restores its space');assert(a.council.state().met.includes('temple'),'Met priest persists');
 await a.visit({...councilDoor('temple'),z:councilDoor('temple').z-1});await doorway(a);assert(!a.tower.state().inside,'Temple has a two-way doorway');
 await a.visit(MINORA_COUNCIL.mayor.exit);assert(a.groundProbe(MINORA_COUNCIL.mayor.exit.x,MINORA_COUNCIL.mayor.exit.z).clear,'Hall exterior door is clear');await doorway(a);assert(a.tower.state().room==='mayor','Mayor Hall opens separately');
 const p=councilPerson('mayor');await a.visit({x:p.x+1.7,z:p.z+2.2});a.look({yaw:-.5,pitch:.17,distance:5});f();
 assert(document.getElementById('council-words').textContent.includes('West Lizeem'),'Mayor favors West');const before=JSON.stringify(a.war.state().campaign);document.getElementById('council-peace').click();
 assert(document.getElementById('council-words').textContent.includes('You have heard both'),'Talking to both gives the joint audience hint');assert(document.getElementById('council-balance').textContent.includes('Placeholder'),'Peace branch is clearly provisional');assert(JSON.stringify(a.war.state().campaign)===before,'Peace placeholder changes no campaign state');await frame();
 return {checks:['Save/Continue preserves temple and council meetings','Temple returns to its exterior doorway','Mayor Hall opens at River Hall','Mayor favors West','Peace placeholder acknowledges both conversations without altering war'],saved};
}
export async function checkCouncilFlags(a){
 document.getElementById('council-close').click();assert(a.save().ok,'Save inside Mayor Hall succeeds');await a.loadSaved();assert(a.tower.state().room==='mayor','Mayor Hall Save/Continue restores');
 await a.visit({...councilDoor('mayor'),z:councilDoor('mayor').z-1});await doorway(a);assert(!a.tower.state().inside,'Mayor Hall has two-way doorway');
 const w=createWorldWar();w.advance(3);const b=w.snapshot().engagements[0];w.syncRegion('Caricas');assert(w.campaign.joinBattle(b.id,b.location).ok,'Real battle fixture starts');assert(w.campaign.resolveEncounter(b.id,'west','withdraw','withdrew',0,{escaped:0}).ok,'Real intervention recorded');
 a.war.restore(w.checkpoint());flags(a,'mayor');a.war.pause();await a.visit({x:-2308,z:289});a.look({yaw:0,pitch:.05,distance:8});await frame();
 return {checks:['Mayor Hall Save/Continue and return door','Recorded West intervention raises Mayor flag centrally at all gates']};
}
export async function checkBattleMap(a){
 await setupBattlefieldEntry(a);a.war.pause();for(let i=0;i<5;i++)a.step(.04);a.openMap();const b=a.war.state().campaign.engagements[0];document.querySelector('#world-war-battles button').click();await frame();
 const p=document.querySelector(`[data-battle-area="${b.id}"]`);assert(p&&p.getAttribute('points').split(' ').length===64,'Campaign map shows full battle perimeter');
 const m=a.minimap.state().events.find(e=>e.kind==='battle');assert(m?.boundary?.length===64,'Minimap has the same full perimeter');
 return {checks:['Campaign map displays the 70m battlefield footprint','Minimap receives the matching outline']};
}
export async function checkBarrier(a){a.resume();await checkFootEntry(a);a.war.withdraw();await frame();return {checks:['Walking at the boundary offers entry','Declining stops continued movement through the wall','F and a fresh approach both allow later entry']};}
export async function checkFireball(a){
 f();assert(a.state().mode==='encounter','Battle may be rejoined after declining');await a.war.help('west');assert(a.state().mode==='skirmish','Battle opens');
 window.dispatchEvent(new Event('focus'));const state=a.war.state().encounter.encounter,hero=state.hero,target=state.guards.filter(g=>!g.escaped).sort((p,q)=>Math.hypot(p.x-hero.x,p.z-hero.z)-Math.hypot(q.x-hero.x,q.z-hero.z))[0];
 a.look({yaw:Math.atan2(hero.x-target.x,hero.z-target.z),pitch:.27,distance:9});
 const button=document.getElementById('teresod-fireball');a.step(.01);assert(!button.disabled&&!button.closest('aside').hidden,'Fireball button is available immediately');button.click();assert(a.sorcery.state().mana===80,'Clicking Fireball consumes 20 mana');assert(a.sorcery.state().shots.length===1,'A visible traveling projectile launches');
 for(let i=0;i<4;i++)a.step(.04);a.look({yaw:Math.atan2(hero.x-target.x,hero.z-target.z)+.55,pitch:.4,distance:9});await frame();return {checks:['Teresod starts with Fireball without a skill lesson','Fireball button consumes mana and launches a projectile'],target:target.id};
}
export async function checkSpellImpact(a){
 for(let i=0;i<22;i++)a.step(.04);const field=a.war.state().encounter.encounter;
 assert(field.guards.some(g=>g.hp<50),'Fireball damages an actual battle opponent after travel');
 a.war.withdraw();a.step(.01);assert(a.save().ok,'Mana saves outside combat');const mana=a.store.read().data.sorcery.mana;await a.loadSaved();assert(Math.abs(a.sorcery.state().mana-mana)<.01,'Saved mana restores');assert(a.council.state().influence.leader==='mayor','Combat contribution updates council');
 assert(!a.state().frameErrors.length,'No rendering errors in new features');await frame();return {checks:['Traveling fireball damages a live opponent','Mana persists through Save/Continue','No runtime rendering errors']};
}
