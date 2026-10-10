import {MINORA_STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {TOWER_EXIT} from './tower-state.js';
import {MINORA_COUNCIL} from '../../content/regions/minora-frontier/minora-council.js';

// Authored directions from Taleth/Bear are allowed before personal exploration.
// Army and battle intelligence still goes through the host's discovery filter.
export function openingWarGuidance(selection,{owned,horse=null,mounted=false}){
  if(selection==='council')return {label:'Taleth / Wizard Guild',location:TOWER_EXIT,council:true,detail:'Enter the tower to meet Taleth. Council visits are optional.',near:'F / Enter the Wizard Guild'};
  if(['mayor','temple'].includes(selection)){const member=MINORA_COUNCIL[selection];return {label:member.title+' / '+member.room,location:member.exit,council:true,detail:member.name+' is inside. Dismount, then use F at the doorway. Visiting commits you to nothing.',near:'F / Enter '+member.room};}
  if(selection==='bear')return owned?{label:mounted?'Ready for the road':'Your horse is ready',offer:true,location:!mounted&&horse?{x:horse.x,z:horse.z}:null,near:'G / Mount your horse',
    detail:mounted?'Shift to canter. Track the nearby army and choose your own route.':'G to mount; H calls your horse. Track the nearby army when you are ready.'}
    :{label:'Bear / your horse',location:MINORA_STABLE.bear,detail:'Meet the stableboy outside the tower. F to talk when close.',near:'F / Talk to Bear'};
  return null;
}

// Select the force itself, never intermediate crossings on the player's route.
export function openingArmyTarget(state,armies,known){
  const first=['lizeem-world-v6','lizeem-world-v7','lizeem-world-v8'].includes(state.scenario)?'caricas':'ovesos',side=first==='caricas'?'west':'east';
  const battle=state.engagements.findLast(b=>b.region===first&&known(b.location));
  if(battle?.status==='active')return {kind:'battle',id:battle.id};
  const army=state.armies.find(a=>a.owner===side&&a.status==='marching'&&a.to===first&&armies.some(m=>m.id===a.id));
  return army?{kind:'army',id:army.id}:battle?{kind:'battle',id:battle.id}:null;
}

// Normalized screen-space direction, including a target behind the camera.
export function guidanceScreenPoint(clip,aspect){
  const front=clip.z<0,depth=Math.max(.001,Math.abs(clip.z));
  let x=clip.x/depth/aspect,y=-clip.y/depth;
  if(!front&&Math.abs(x)<.08)x=.35; // directly behind still gives a turn direction
  const edge=!front||Math.abs(x)>.78||Math.abs(y)>.6;
  if(edge){const divisor=Math.max(Math.abs(x)/.78,Math.abs(y)/.6,.001);x/=divisor;y/=divisor;}
  return {x,y,edge,angle:Math.atan2(y,x)};
}
