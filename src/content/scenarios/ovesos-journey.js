import {OVESOS_ROADS} from '../regions/oves/ovesos-farm.js';

// Surveyed horse route: the Guild Footbridge, Sacred Way, Pilgrims' Bridge,
// then the Neth ford and western approach to Velsorten.
export const OVESOS_JOURNEY=[
  [-2414,63,'Guild courtyard'],[-2414,70,'Guild Way'],[-2308,70,'Guild Footbridge'],
  [-2308,190,'Sacred Way'],[-2308,299,"Pilgrims' Bridge"],[-2320,430,'Nethereum track'],
  [-2300,540,'Velsorten approach'],[-2281,607,'Neth ford'],
  ...OVESOS_ROADS[0].points.slice(1).map(p=>[p.x,p.z,'Velsorten road']),[-1905,706,'Ovesos battlefield'],
].map(([x,z,name])=>Object.freeze({x,z,name}));

export function ovesosRouteGuide(position){
  let best=null;
  for(let i=1;i<OVESOS_JOURNEY.length;i++){
    const a=OVESOS_JOURNEY[i-1],b=OVESOS_JOURNEY[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((position.x-a.x)*dx+(position.z-a.z)*dz)/(dx*dx+dz*dz)));
    const point={x:a.x+t*dx,z:a.z+t*dz},distance=Math.hypot(position.x-point.x,position.z-point.z);
    if(!best||distance<=best.distance)best={distance,point,index:i};
  }
  if(best.distance>80)return null;
  let index=best.index;if(Math.hypot(position.x-OVESOS_JOURNEY[index].x,position.z-OVESOS_JOURNEY[index].z)<4)index=Math.min(index+1,OVESOS_JOURNEY.length-1);
  return {...(best.distance>8?best.point:OVESOS_JOURNEY[index]),name:OVESOS_JOURNEY[index].name};
}
