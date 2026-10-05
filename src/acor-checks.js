import { ACOR_NAMES, ACOR_PATHS, ACOR_WATERS } from './acor-world.js';
import { canStand, moveCharacter } from './game-state.js';
import { BODY, bodyWorld } from './bodies.js';
export function runAcorChecks(world,regionNames=ACOR_NAMES){
  const assert=(ok,note)=>{if(!ok)throw new Error('Acor wilderness: '+note);},journeys=[];
  for(const route of ACOR_PATHS.filter(p=>regionNames.includes(p.region))){
    assert(canStand(route.points[0].x,route.points[0].z,world),'arrival '+route.name);
    for(const reverse of [false,true]){
      const points=reverse?[...route.points].reverse():route.points,at={...points[0],y:world.heightAt(points[0].x,points[0].z)};
      const walking=bodyWorld(world).moving(at,BODY.traveler);let maxGrade=0,steps=0;
      for(const goal of points.slice(1))while(Math.hypot(goal.x-at.x,goal.z-at.z)>.03){
        assert(++steps<20000,'route never finished '+route.id);
        const before={...at},distance=Math.hypot(goal.x-at.x,goal.z-at.z),delta=Math.min(.3,distance);
        moveCharacter(at,(goal.x-at.x)/distance*delta,(goal.z-at.z)/distance*delta,walking,BODY.traveler);
        const moved=Math.hypot(at.x-before.x,at.z-before.z);assert(moved>.001,`collision on ${route.id} at ${at.x},${at.z}`);
        at.y=world.heightAt(at.x,at.z);const grade=Math.abs(at.y-before.y)/moved;maxGrade=Math.max(maxGrade,grade);
        assert(grade<.88,`unwalkable grade ${grade.toFixed(2)} on ${route.id} at ${at.x.toFixed(1)},${at.z.toFixed(1)}`);
        assert(at.y>world.waterAt(at.x,at.z),'route submerged '+route.id);
      }
      journeys.push({id:route.id,reverse,steps,maxGrade});
    }
  }
  for(const lake of ACOR_WATERS.filter(l=>regionNames.includes(l.region))){const p=lake.centre;
    assert(Math.abs(world.waterAt(p.x,p.z)-lake.surface)<.001,'lake swimming surface '+lake.id);
    assert(world.heightAt(p.x,p.z)<lake.surface-1,'lake has a real basin '+lake.id);
  }
  return {ok:true,journeys,regions:world.acorRegions.filter(e=>regionNames.includes(e.name)).map(e=>({name:e.name,...e.scenery.metrics}))};
}
