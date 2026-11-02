import {MENORA_OUTLINE,inMenora,menoraSegmentDistance} from '../../content/regions/minora-frontier/menora-city.js';

// Minora does not grant either league military passage. Keep the whole column
// clear of the walls, including soldiers fanning out at an assembly point.
// This restriction applies only to army routing, never to player travel.
export const MINORA_ARMY_CLEARANCE=6;
const bounds={minX:Math.min(...MENORA_OUTLINE.map(p=>p.x)),maxX:Math.max(...MENORA_OUTLINE.map(p=>p.x)),
  minZ:Math.min(...MENORA_OUTLINE.map(p=>p.z)),maxZ:Math.max(...MENORA_OUTLINE.map(p=>p.z))};

export function columnTransitAllowed(x,z,radius=0){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const margin=MINORA_ARMY_CLEARANCE+Math.max(0,radius);
  if(x<bounds.minX-margin||x>bounds.maxX+margin||z<bounds.minZ-margin||z>bounds.maxZ+margin)return true;
  if(inMenora(x,z))return false;
  for(let i=0;i<MENORA_OUTLINE.length;i++){
    if(menoraSegmentDistance(x,z,MENORA_OUTLINE[i],MENORA_OUTLINE[(i+1)%MENORA_OUTLINE.length])<=margin)return false;
  }
  return true;
}
