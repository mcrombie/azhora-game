import {REGION_TERRAIN} from '../../../world/terrain/region-world.js';
import {WEST_REGION_BOXES,inBox,menethRidgePhase,VASTOS_PANS,VASTOS_BASINS,VASTOS_SINTER} from './west-regions.js';

const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*clamp(t));
const packed=c=>(Math.round(c[0])<<16)|(Math.round(c[1])<<8)|Math.round(c[2]);
const variation=(x,z)=>.5+.5*Math.sin(x*.016+Math.sin(z*.011)*1.7)*Math.cos(z*.021-x*.005);

/** Baked vertex colour, not another ground mesh or a per-frame effect. Relief,
 * stream beds, saved trees and collision retain their existing coordinates. */
export function uplandTerrainTint(x,z,ground){
  if(ground===REGION_TERRAIN.Meneth.ground&&inBox(WEST_REGION_BOXES.Meneth,x,z)){
    const ridge=.5+.5*Math.cos(menethRidgePhase(x,z)*Math.PI*2),patch=variation(x,z);
    const meadow=mix([132,151,99],[155,160,111],patch);
    const woodland=mix([105,124,82],[130,140,96],patch);
    return packed(mix(meadow,woodland,(ridge-.22)/.65));
  }
  if(ground===REGION_TERRAIN.Vastos.ground&&inBox(WEST_REGION_BOXES.Vastos,x,z)){
    const patch=variation(x,z),dry=mix([144,148,117],[174,166,133],patch);
    let damp=0;
    for(const p of [...VASTOS_PANS,...VASTOS_BASINS]){
      const d=Math.hypot(x-p.x,z-p.z)/p.radius;
      damp=Math.max(damp,clamp((2.5-d)/1.6));
    }
    const wet=mix(dry,[103,125,109],damp*.8);
    const sinter=clamp((VASTOS_SINTER.radius*1.5-Math.hypot(x-VASTOS_SINTER.x,z-VASTOS_SINTER.z))/25);
    return packed(mix(wet,[195,186,148],sinter));
  }
  return null;
}
