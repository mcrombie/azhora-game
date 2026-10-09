import {prepareWarExterior} from './tower-smoke.js';
import {setup as prepareRally} from './afterlife-smoke.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {TOWER_EXIT,TALETH_SPOT,LOOKOUT,LOOKOUT_TALETH,LOOKOUT_DOOR} from '../../app/exploration/tower-state.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
const checks=[],assert=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);console.log('EXPLORATION_CHECK '+message);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const click=id=>document.getElementById(id).click();
const f=()=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true,cancelable:true}));
async function ready(a){for(let i=0;i<600&&a.state().mode==='loading';i++)await new Promise(r=>setTimeout(r,100));assert(a.state().mode==='playing','Doorway returns control');}
async function capture(a){for(let i=0;i<25;i++)a.step(.04);window.dispatchEvent(new Event('blur'));await frames();return {checks:[...checks],state:a.tower.state(),courier:a.war.state().courier};}

export async function battle(a){
  window.dispatchEvent(new Event('focus'));await prepareWarExterior(a);await prepareRally(a);document.getElementById('assault-with-allies').checked=true;await a.war.help('west');
  for(let i=0;i<5401&&!a.war.state().encounter.encounter.outcome;i++){driveWorldEncounter(a,a.war.state().encounter.encounter);a.step(1/60);}clearCombatKeys(a);
  assert(a.war.state().encounter.encounter.outcome==='success','Real allied assault reaches victory before Taleth writes');click('world-skirmish-continue');a.war.pause();a.step(.04);
  assert(a.war.state().letters[0].hero,'First letter recognizes the player’s real battle');assert(document.querySelector('#world-war-report .eyebrow').textContent.includes('PIGEON'),'Pigeon dispatch replaces the ordinary battle report');
  for(let i=0;i<110;i++)a.step(.04);assert(a.war.state().courier.visible,'One visible pigeon delivers the report');
  a.look({yaw:0,pitch:.18,distance:7});return capture(a);
}
export async function letter(a){
  window.dispatchEvent(new Event('focus'));click('taleth-read-letter');const before=a.war.state().campaign.day;for(let i=0;i<60;i++)a.step(.04);
  assert(a.state().mode==='briefing'&&a.war.state().campaign.day===before,'Reading the letter pauses campaign time');
  assert(document.getElementById('taleth-letter-words').textContent.includes('final assault secured'),'Letter credits the decisive victory accurately');
  assert(document.getElementById('taleth-letter-note').textContent.includes('greater troubles'),'Letter links strategy to the wider story');return capture(a);
}
export async function summons(a){
  window.dispatchEvent(new Event('focus'));click('taleth-letter-close');click('world-war-report-dismiss');assert(a.save().ok,'Dismissed letter and campaign save together');await a.loadSaved();a.step(.04);
  assert(!a.war.state().courier.visible,'Continue does not redeliver a dismissed dispatch');a.openMap();click('taleth-letters');assert(document.querySelectorAll('#taleth-letter-select option').length>0,'Map archive keeps dismissed letters');click('taleth-letter-close');a.resume();
  a.war.advance(200);assert(!!a.war.state().campaign.winner,'The existing simulation settles the war');assert(a.war.state().letters.at(-1).finale,'Victory delivers the tower invitation');
  assert(!document.getElementById('world-war-next').disabled&&document.getElementById('world-war-next').textContent==='Return to Taleth','Invitation offers tracking back to the tower');return capture(a);
}
export async function river(a){
  window.dispatchEvent(new Event('focus'));await a.visit(TOWER_EXIT);f();await ready(a);await a.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});f();
  assert(document.getElementById('tower-next').textContent.includes('lookout'),'Taleth offers the lookout only after victory');click('tower-next');await ready(a);
  assert(a.tower.state().room==='lookout'&&a.state().position[1]===LOOKOUT.y,'The lookout is physically above the tower');
  assert(a.groundProbe(LOOKOUT.x,LOOKOUT.z+4).clear,'Lookout arrival and approach have clear footing');await a.visit({...LOOKOUT_TALETH,z:LOOKOUT_TALETH.z+2});f();assert(document.getElementById('tower-topic').textContent==='The river country','Finale begins with the Lizeem country');return capture(a);
}
export async function settled(a){window.dispatchEvent(new Event('focus'));await prepareWarExterior(a);a.war.advance(200);assert(a.war.state().campaign.winner,'Natural simulation supplies a settled war for the visual check');return capture(a);}
export async function politics(a){window.dispatchEvent(new Event('focus'));click('tower-next');assert(/final assaults|left the fighting to the armies/.test(document.getElementById('tower-words').textContent),'Taleth sums up the recorded player impact');return capture(a);}
export async function east(a){window.dispatchEvent(new Event('focus'));click('tower-next');assert(document.getElementById('tower-words').textContent.includes('Ambron'),'Taleth turns east toward Ambron');assert(!a.tower.state().concluded,'Finale can be left and resumed before completion');return capture(a);}
export async function complete(a){
  window.dispatchEvent(new Event('focus'));click('tower-next');assert(a.tower.state().concluded,'Completing the conversation concludes the scenario');assert(a.store.read().data.tower.concluded&&validateWorldWarSave(a.store.read().data),'Conclusion saves in the isolated campaign slot');
  const campaign=JSON.stringify(a.war.state().campaign);await a.loadSaved();assert(a.tower.state().room==='lookout'&&a.tower.state().concluded,'Continue restores the completed lookout');
  await a.visit({...LOOKOUT_DOOR,z:LOOKOUT_DOOR.z-1});f();await ready(a);assert(a.tower.state().room==='tower','Stair door returns to the chamber');assert(JSON.stringify(a.war.state().campaign)===campaign,'Finale and doorway preserve simulation history');
  assert(!a.state().frameErrors.length,'Pigeons, archive, panorama and Continue have no frame errors');return capture(a);
}

export async function continued(a){assert(a.tower.state().room==='lookout'&&a.tower.state().concluded,'Fresh main-menu Continue restores the completed lookout');assert(a.state().position[1]===LOOKOUT.y,'Fresh Continue restores high lookout footing');assert(a.tower.state().exteriorLoaded,'Fresh Continue prepares the panorama');assert(!a.state().frameErrors.length,'Fresh lookout renderer has no errors');return capture(a);}
