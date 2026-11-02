import {encounterAutoplayInput} from '../../gameplay/autoplay/encounter-input.js';

// Native checks send normal keyboard inputs; no encounter state is patched.
export function encounterKeys(state,yaw=0,input=encounterAutoplayInput(state)){
  const x=input.x??0,z=input.z??0;
  const side=Math.cos(yaw)*x-Math.sin(yaw)*z,forward=-Math.sin(yaw)*x-Math.cos(yaw)*z;
  return {KeyW:forward>.35,KeyS:forward<-.35,KeyD:side>.35,KeyA:side<-.35,KeyX:!!input.attack,Space:!!input.dodge,KeyF:!!input.block};
}
export function driveWorldEncounter(host,state){
  const yaw=host.snapshot().camera.yaw;
  for(const [key,down] of Object.entries(encounterKeys(state,yaw,host.encounterInput?.(yaw))))host.hold(key,down);
}
export function clearCombatKeys(host){for(const key of ['KeyW','KeyS','KeyA','KeyD','KeyX','Space','KeyF'])host.hold(key,false);}
