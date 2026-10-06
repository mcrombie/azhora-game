import { OUTER_NAMES, OUTER_PATHS, OUTER_LAKES } from '../../content/regions/outer-regions/outer-regions-world.js';
import { canStand, moveCharacter } from '../../gameplay/movement/game-state.js';
import { BODY, bodyWorld } from '../../gameplay/combat/bodies.js';
export function runOuterChecks(world,names=OUTER_NAMES){
  const assert=(ok,note)=>{if(!ok)throw new Error('Outer wilderness: '+note);},journeys=[];
  for(const route of OUTER_PATHS.filter(p=>names.includes(p.region))){
    assert(canStand(route.points[0].x,route.points[0].z,world),'arrival '+route.region);
    for(const reverse of [false,true]){
      const points=reverse?[...route.points].reverse():route.points,at={...points[0],y:world.heightAt(points[0].x,points[0].z)},walking=bodyWorld(world).moving(at,BODY.traveler);
      let steps=0,maxGrade=0;
      for(const goal of points.slice(1))while(Math.hypot(goal.x-at.x,goal.z-at.z)>.03){
        assert(++steps<2000,'route never finished '+route.region);
        const before={...at},d=Math.hypot(goal.x-at.x,goal.z-at.z),s=Math.min(.3,d);
        moveCharacter(at,(goal.x-at.x)/d*s,(goal.z-at.z)/d*s,walking,BODY.traveler);
        const moved=Math.hypot(at.x-before.x,at.z-before.z);assert(moved>.001,'blocked '+route.region+' at '+at.x+','+at.z);
        at.y=world.heightAt(at.x,at.z);maxGrade=Math.max(maxGrade,Math.abs(at.y-before.y)/moved);
        assert(at.y>world.waterAt(at.x,at.z),'submerged '+route.region);
      }
      assert(maxGrade<.9,'unwalkable pass '+route.region);journeys.push({region:route.region,reverse,steps,maxGrade});
    }
  }
  for(const lake of OUTER_LAKES.filter(l=>names.includes(l.region))){
    const p=lake.centre;assert(world.waterAt(p.x,p.z)>world.heightAt(p.x,p.z)+1,'pool bed '+lake.id);
  }
  return {ok:true,journeys,regions:world.outerRegions.filter(e=>names.includes(e.name)).map(e=>({name:e.name,...e.scenery.metrics}))};
}
