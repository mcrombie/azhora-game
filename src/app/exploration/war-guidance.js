import {worldWarScenario} from './world-war.js';
import {MINORA_STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {TOWER_EXIT} from './tower-state.js';
import {MINORA_COUNCIL} from '../../content/regions/minora-frontier/minora-council.js';
import {CARICAS_TOWN} from '../../content/regions/minora-frontier/caricas-settlement.js';
import {LIZEEM_BATTLEFIELDS} from '../../content/scenarios/lizeem-battlefields.js';

// Authored directions from Taleth/Bear are allowed before personal exploration.
// Army and battle intelligence still goes through the host's discovery filter.
export function openingWarGuidance(selection,{owned,horse=null,mounted=false,bear=null}){
  if(selection==='ovesos')return {label:'Ovesos / prepare for battle',location:LIZEEM_BATTLEFIELDS.ovesos,detail:'Head toward Ovesos. Taleth expects the eastern army here at 02:00. The marker will follow its column once sighted.'};
  if(selection==='caricas')return {label:'Caricas / rendezvous',location:CARICAS_TOWN.arrival,detail:'Head for Caricas. The western army sets out at 01:00 and arrives at 03:00; the marker will follow it once it is sighted.'};
  if(selection==='council')return {label:'Taleth / Wizard Guild',location:TOWER_EXIT,council:true,detail:'Enter the tower to meet Taleth. Council visits are optional.',near:'F / Enter the Wizard Guild'};
  if(['mayor','temple'].includes(selection)){const member=MINORA_COUNCIL[selection];return {label:member.title+' / '+member.room,location:member.exit,council:true,detail:member.name+' is inside. Dismount, then use F at the doorway. Visiting commits you to nothing.',near:'F / Enter '+member.room};}
  if(selection==='bear')return owned?{label:mounted?'Ready for the road':'Your horse is ready',offer:true,location:!mounted&&horse?{x:horse.x,z:horse.z}:null,near:'G / Mount your horse',
    detail:mounted?'Shift to canter. Track the nearby army and choose your own route.':'G to mount; H calls your horse. Track the nearby army when you are ready.'}
    :{label:'Bear / your horse',location:bear??MINORA_STABLE.bear,detail:'Bear will come to greet you outside the tower and offer your horse.',near:'F / Talk to Bear'};
  return null;
}

// Select the force itself, never intermediate crossings on the player's route.
export function openingArmyTarget(state,armies,known,destination=null){
  const scenario=worldWarScenario(state.scenario),orders=[...(scenario.openingOrders??[]),...(scenario.openingBattles??[])];
  const opening=destination?orders.find(o=>o.to===destination):orders.find(o=>!state.engagements.some(b=>b.region===o.to&&b.status==='resolved'));
  const first=opening?.to??'ovesos',side=opening?.faction??'east';
  const battle=state.engagements.findLast(b=>b.region===first&&known(b.location));
  if(battle?.status==='active')return {kind:'battle',id:battle.id};
  const army=state.armies.find(a=>a.owner===side&&a.status==='marching'&&a.to===first&&armies.some(m=>m.id===a.id));
  return army?{kind:'army',id:army.id}:battle?{kind:'battle',id:battle.id}:null;
}

export {guidanceScreenPoint} from '../../ui/map/direction-projection.js';
