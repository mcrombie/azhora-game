import {createWorldWar} from '../../app/exploration/world-war.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
const assert=(value,message)=>{if(!value)throw Error(message);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
async function settled(api){const end=performance.now()+6000;while((api.state().mode!=='limbo'||document.body.classList.contains('crossing-limbo'))&&performance.now()<end)await frames();assert(api.state().mode==='limbo','Death enters the separate limbo room');await frames();}
async function die(api){
  const end=performance.now()+15000;
  while(api.state().mode==='skirmish'&&performance.now()<end){for(let i=0;i<25&&api.state().mode==='skirmish';i++)api.step(.04);await frames();}
  await settled(api);
  assert(api.war.state().campaign.engagements.find(b=>b.id===api.afterlife.snapshot().death.battleId).status==='resolved','Death settles the campaign battle without a day timer');
}
export async function setup(api){
  // Current day-three Caricas campaign: two guards stopped, runner escaped.
  // This fixture prepares a completed interception; the lethal rally itself is
  // played by ordinary enemy AI, without patching health or combat state.
  window.dispatchEvent(new Event('focus'));
  const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');
  assert(w.campaign.joinBattle(b.id,b.location).ok,'Current Caricas interception opens');
  assert(w.campaign.resolveEncounter(b.id,'west','defeat','runner-arrived',2,{escaped:1}).ok,'Completed interception retains eight stopped strength');
  await api.visit(b.location);api.reveal(true);api.war.restore(w.checkpoint());api.war.pause();api.step(.04);
  assert(api.state().mode==='encounter'&&api.war.state().campaign.pending?.stage==='rally','Entering the current battlefield offers the rally');
  assert(api.war.state().campaign.day===4,'Interception advanced to day four');
  await frames();return {checks:['Current Caricas battlefield offers its remaining rally phase','Earlier interception retains eight stopped strength at day four']};
}
export async function firstDeath(api){
  assert(api.state().mode==='encounter','Battlefield confirmation is open');await api.war.help('west');await die(api);
  const data=api.afterlife.snapshot();assert(data.death.stage==='rally','Death identifies the current fight');assert(data.death.before.simulation.day===4,'Rewind predates the lethal fight');
  assert(api.testWorld.state().inLimbo&&api.testWorld.state().occupants[0]==='The Grim Reaper','Limbo replaces the exterior');
  assert(api.save().ok&&validateWorldWarSave(api.store.read().data),'Limbo plus rewind history save successfully');
  api.look({yaw:0,pitch:.12,distance:8});await frames();return {checks:['Actual combat death enters limbo','Battle resolves once before the Reaper report','Limbo and rewind checkpoint save together'],state:data};
}
export async function conversation(api){api.afterlife.talk();await frames();assert(!document.getElementById('reaper-dialog').hidden,'Reaper dialogue visible');assert(document.querySelectorAll('[data-afterlife]').length===6,'All six choices are available');assert(/day 6/.test(document.getElementById('reaper-report').textContent),'Reaper explains completed battle');return {checks:['Reaper explains actual campaign outcome and offers all six fates']};}
export async function retry(api){
  assert(await api.afterlife.choose('retry'),'Retry succeeds');assert(api.state().mode==='skirmish','Retry opens the same fight');
  assert(api.war.state().encounter.encounter.hero.hp===100,'Retry restores health');
  const state=api.war.state().campaign;assert(state.day===4&&!state.events.some(e=>e.type==='rally-result'),'Failed attempt and advanced days are undone');
  assert(state.engagements.find(b=>b.region==='caricas').heroResult.objective.blocked===8,'Earlier interception retained');
  await die(api);assert(await api.afterlife.choose('before'),'Can rewind to the confirmation');
  assert(api.state().mode==='encounter'&&api.war.state().campaign.pending.stage==='rally','Before-choice restores the rally briefing');
  await api.war.help('west');await die(api);
  return {checks:['Retry restores same fight at full health','Retry keeps eight intercepted strength without accumulating failed attempts','Before-choice restores confirmation before the fight']};
}
export async function ghost(api){
  assert(await api.afterlife.choose('ghost'),'Ghost returns to the world');api.war.pause();
  assert(api.state().form==='ghost'&&!api.testWorld.state().inLimbo,'Spectral avatar in the exterior');
  assert(api.war.join().reason==='Ghosts cannot fight.','Ghost cannot enter combat');assert(!api.selectMount('horse').ok,'Ghost cannot ride');
  // Traverse an actual building wall from just outside its collision box.
  const p=api.state().position,c=api.testWorld.nearColliders(p[0],p[2],60).find(c=>c.kind==='building'&&c.hx&&c.hz);
  assert(c,'A nearby solid building exists');await api.visit({x:c.x-c.hx-.5,z:c.z});api.look({yaw:0,pitch:.2,distance:7});api.hold('KeyD',true);
  for(let i=0;i<10;i++)api.step(.04);api.hold('KeyD',false);
  assert(api.state().position[0]>c.x-c.hx+.8,'Ghost passes through a real solid wall');
  assert(api.save().ok,'Ghost form saves while within a prop');await api.loadSaved();assert(api.state().form==='ghost','Reload restores ghost form without rejection');
  const fallen=api.afterlife.snapshot().death.fallen;await api.visit(fallen);api.look({yaw:0,pitch:.2,distance:7});await frames();
  return {checks:['Ghost appearance and corporeal-action restrictions','Ghost passes through actual wall','Ghost saves and loads inside a prop']};
}
export async function undead(api){
  document.getElementById('reaper-return').click();await settled(api);
  assert(await api.afterlife.choose('retry'),'Ghost can rewind to the original living fight');await die(api);
  assert(api.afterlife.snapshot().death.previousForm==='living'&&api.save().ok,'Retry after ghost form retains a valid living checkpoint');
  assert(await api.afterlife.choose('undead'),'Undead returns to the world');api.war.pause();
  assert(api.state().form==='undead','Undead avatar selected');assert(api.save().ok,'Undead form saves');
  api.look({yaw:Math.PI,pitch:.2,distance:6});await frames();return {checks:['Return to Reaper remains available','Ghost retry and subsequent death retain valid living checkpoint','Undead body returns with campaign outcome intact']};
}
export async function tower(api){
  document.getElementById('reaper-return').click();await settled(api);assert(await api.afterlife.choose('tower'),'Tower return succeeds');
  assert(api.tower.state().inside&&api.state().form==='living','Return alive to Taleth');
  assert(api.war.state().campaign.day===6,'Tower return does not rewind battle');
  assert(api.war.state().campaign.engagements.find(b=>b.region==='caricas').status==='resolved','Outcome remains resolved');
  assert(!api.state().frameErrors.length,'No renderer errors');return {checks:['Tower return restores living form and retains resolved battle','No frame errors']};
}
export async function leaveInLimbo(api){
  // Load the last explicit undead save, then use the visible return action.
  await api.loadSaved();assert(api.state().form==='undead','Undead Continue remains available after tower return');
  document.getElementById('reaper-return').click();await settled(api);
  api.afterlife.talk();await frames();return {checks:['Restored limbo save reopens its Reaper conversation']};
}
export async function continued(api){
  assert(api.state().mode==='limbo'&&api.afterlife.inLimbo,'Fresh Continue returns to limbo');
  assert(!api.testWorld.state().exteriorLoaded,'Continue in limbo avoids loading the exterior');
  assert(!api.war.state().clock.running,'Limbo clock stays stopped');
  assert(api.war.state().campaign.day===6,'Continue preserves resolved campaign');
  api.afterlife.talk();await frames();return {checks:['Fresh main-menu Continue restores limbo without loading the world','Continue retains stopped clock and battle outcome']};
}
