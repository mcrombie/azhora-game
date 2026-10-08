import {encounterAttack} from './encounter-attacks.js';

// Read-only visual timing from the same attack used by collision and animation.
export function encounterCue(g){
  if(!g.hp)return null;
  const a=encounterAttack(g),clamp=n=>Math.max(0,Math.min(1,n));
  if(g.routed)return {kind:'retreat',text:g.phase==='breaking'?'THEIR LINE BREAKS':'RETREATING',fraction:1,color:0xe5bc62};
  if(g.escaped)return null;
  if(g.phase==='turn')return {kind:'attention',text:'TURNING TOWARD YOU',fraction:1,color:0xffd09a};
  if(g.phase==='windup')return {kind:'warning',text:g.attack==='sweep'?'SWEEP / BACK AWAY':'THRUST / SIDESTEP',fraction:clamp(1-g.timer/a.windup),color:a.color};
  if(g.phase==='strike'&&!g.contactResolved)return {kind:'strike',text:'STRIKING',fraction:1,color:a.color};
  if(g.open){const left=g.phase==='strike'?Math.max(0,g.timer)+a.recovery:Math.max(0,g.timer);return {kind:'opening',text:'OPEN / COUNTER',fraction:clamp(left/a.recovery),seconds:left,color:0xb7e88d};}
  return null;
}
