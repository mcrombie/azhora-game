import {encounterAttack} from './encounter-attacks.js';

// Read-only visual timing from the same attack used by collision and animation.
export function encounterCue(g){
  if(!g.hp||g.departed)return null;
  const a=encounterAttack(g),clamp=n=>Math.max(0,Math.min(1,n));
  if(g.routed)return {kind:'retreat',text:g.phase==='breaking'?'THEIR LINE BREAKS':'RETREATING',fraction:1,color:0xe5bc62};
  if(g.escaped)return null;
  if(g.phase==='submerged')return {kind:'veiled',text:'SUBMERGED / WATCH THE RIPPLES',fraction:1,color:0xaac4b0};
  if(g.phase==='emerge')return {kind:'opening',text:'EMERGING / INTERRUPT',fraction:clamp(g.timer/1.05),seconds:g.timer,color:0xb7e88d};
  if(g.phase==='offering')return {kind:'opening',text:'OFFERING / INTERRUPT NOW',fraction:clamp(g.timer/1.5),seconds:g.timer,color:0xe59696};
  if(g.phase==='vent')return {kind:'opening',text:'VENTING / ATTACK THE COOL SIDE',fraction:clamp(g.timer/3),seconds:g.timer,color:0xe8b879};
  if(g.mechanic==='stone-troll'&&g.phase==='recover')return {kind:'opening',text:'COLLECTING STONE / ARM EXPOSED',fraction:clamp(g.timer/a.recovery),seconds:g.timer,color:0xb7e88d};
  if(g.phase==='veil')return {kind:'veiled',text:'MIST / WAIT FOR SOLID FORM',fraction:1,color:0xa7cfc8};
  if(g.phase==='inscribe')return {kind:'inscribing',text:'DRAWING A SEAL / INTERRUPT',fraction:clamp(1-g.timer/2),color:0xd98683};
  if(g.mechanic==='golem'&&g.phase==='recover')return {kind:'opening',text:'CORE EXPOSED / COUNTER',fraction:clamp(g.timer/a.recovery),seconds:g.timer,color:0xb7e88d};
  if(g.phase==='restore')return {kind:'restoring',text:'RESTORING / INTERRUPT',fraction:clamp(1-g.timer/g.ritualDuration),color:0xc5a2e4};
  if(g.phase==='turn')return {kind:'attention',text:'TURNING TOWARD YOU',fraction:1,color:0xffd09a};
  if(g.phase==='windup')return {kind:'warning',text:a.cue??(g.attack==='overhead'?'OVERHEAD / SIDESTEP':g.attack==='sweep'?'SWEEP / BACK AWAY':'THRUST / SIDESTEP'),fraction:clamp(1-g.timer/a.windup),color:a.color};
  if(g.phase==='strike'&&!g.contactResolved)return {kind:'strike',text:'STRIKING',fraction:1,color:a.color};
  if(g.open){const left=g.phase==='strike'?Math.max(0,g.timer)+a.recovery:Math.max(0,g.timer);return {kind:'opening',text:'OPEN / COUNTER',fraction:clamp(left/a.recovery),seconds:left,color:0xb7e88d};}
  if(g.regeneration)return {kind:'regeneration',text:g.burnRemaining>0?'SCORCHED / HEALING STOPPED':'REGENERATING / USE FIRE',fraction:g.burnRemaining>0?g.burnRemaining/6:1,color:g.burnRemaining>0?0xf0ac68:0x93c990};
  return null;
}
