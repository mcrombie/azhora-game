import {canStand} from '../movement/locomotion.js';
import {planWarTravel} from './war-travel.js';

// Reach a dry lane through the boundary, rather than aiming at the battle's
// centre through a river. The normal movement and entry offer still own entry.
export async function planWarEntry(world,from,battle,options={}){
  const {location:c,entryRadius:r}=battle,clearance=Math.max(.8,(options.radius??.9)+.25);
  const angle=Math.atan2(from.x-c.x,from.z-c.z),candidates=[];
  for(let i=0;i<64;i++){
    const a=angle+i*Math.PI/32,s=Math.sin(a),k=Math.cos(a);
    const at=d=>({x:c.x+s*d,z:c.z+k*d});
    let valid=true;
    for(let d=r-2;d<=r+7&&valid;d+=.5)for(const offset of [-1.5,0,1.5]){
      const p=at(d);p.x+=k*offset;p.z-=s*offset;
      if(!world.readyAt(p.x,p.z)||!world.canExploreAt(p.x,p.z)||!canStand(p.x,p.z,world,clearance))valid=false;
    }
    if(valid)candidates.push({outside:at(r+6),inside:at(r-1.5)});
  }
  candidates.sort((a,b)=>Math.hypot(a.outside.x-from.x,a.outside.z-from.z)-Math.hypot(b.outside.x-from.x,b.outside.z-from.z));
  for(const entry of candidates.slice(0,12)){
    if(options.cancelled?.())return null;
    const route=await planWarTravel(world,from,entry.outside,{...options,obstacles:[...(options.obstacles??[]),{...c,r:r+1}]});
    if(route)return [...route,entry.inside];
  }
  return null;
}
