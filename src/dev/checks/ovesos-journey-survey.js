import {explorationMovement} from '../../app/exploration/movement.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {OVESOS_ROADS} from '../../content/regions/oves/ovesos-farm.js';
export async function surveyJourney(h){
  const world=h.testWorld,settings={walk:13,run:26,radius:.62,swimming:false};
  const traps=[];
  for(let x=-2440;x<=-2250;x+=3)for(let z=185;z<=273;z+=3){
    if(!canStand(x,z,world,.62))continue;
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
      const q={x:x+dx*2,z:z+dz*2};if(canStand(q.x,q.z,world,.62))continue;
      const p={x,y:world.heightAt(x,z),z},m=explorationMovement(p,world),yaw=Math.atan2(-dx,-dz);
      for(let i=0;i<8;i++)m.step(new Set(['KeyW']),yaw,.04,settings);
      const at={...p};for(let i=0;i<8;i++)m.step(new Set(['KeyS']),yaw,.04,settings);
      if(Math.hypot(at.x-p.x,at.z-p.z)<.2)traps.push({start:{x,z},at,probe:h.groundProbe(at.x,at.z)});
    }
  }
  console.log('EXPLORATION_SHORE_TRAPS '+traps.length);
  for(const id of [17,25]){console.log('EXPLORATION_SURVEY_REGION '+id);await world.prepareRegion(id);}
  const route=[[-2414,63],[-2414,70],[-2308,70],[-2308,299],[-2320,430],[-2300,540],[-2281,607],...OVESOS_ROADS[0].points.slice(1).map(p=>[p.x,p.z]),[-1905,706]].map(([x,z])=>({x,z}));
  const blocked=[];
  for(let n=1;n<route.length;n++){
    const a=route[n-1],b=route[n],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5);
    for(let i=0;i<=steps;i++){const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps;if(!canStand(x,z,world,.7)){blocked.push({segment:n,...h.groundProbe(x,z)});break;}}
  }
  return {traps:traps.slice(0,12),blocked,route};
}
