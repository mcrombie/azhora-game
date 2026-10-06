import { canStand, moveCharacter } from '../../gameplay/movement/game-state.js';
import { NYLON, NYLON_PATHS, NYLON_LANDMARKS, NYLON_OUTLINE, nylonHarborDeckHeight } from '../../content/regions/nylon/nylon-city.js';

/** Runs against the populated, streamed world: roads must survive regional
 * scatter, real ground, water, gateway towers and overhead collision together. */
export function runNylonChecks(world) {
  const checks=[];
  const check=(condition,label)=>{if(!condition)throw new Error(`Nylon: ${label}`);checks.push(label);};
  check(world.nylon.metrics.buildings>=15,'The complete city has streamed into Eer');
  for(const place of [NYLON.arrival,...NYLON_LANDMARKS]) {
    check(nylonHarborDeckHeight(place.x,place.z)!==null||world.regionAt(place.x,place.z).id===15,`${place.id??'arrival'} remains on the Eer bank`);
    check(canStand(place.x,place.z,world,.45),`${place.id??'arrival'} is a clear, dry arrival`);
  }
  let distance=0,maxGrade=0;
  for(const path of NYLON_PATHS)for(const points of [path.points,[...path.points].reverse()]) {
    const pos={...points[0],y:world.heightAt(points[0].x,points[0].z)};
    for(let i=1;i<points.length;i++) {
      const target=points[i],length=Math.hypot(target.x-pos.x,target.z-pos.z),steps=Math.ceil(length/.2);
      const dx=(target.x-pos.x)/steps,dz=(target.z-pos.z)/steps;
      for(let step=0;step<steps;step++) {
        const old={...pos};moveCharacter(pos,dx,dz,world,.45);pos.y=world.heightAt(pos.x,pos.z);
        const travel=Math.hypot(pos.x-old.x,pos.z-old.z);distance+=travel;
        if(travel>.001)maxGrade=Math.max(maxGrade,Math.abs(pos.y-old.y)/travel);
      }
      check(Math.hypot(pos.x-target.x,pos.z-target.z)<.12,`${path.id} reaches waypoint ${i} in both directions (${pos.x.toFixed(2)},${pos.z.toFixed(2)})`);
    }
  }
  check(maxGrade<1,'Approaches use traversable graded ground');
  const wall={x:(NYLON_OUTLINE[1].x+NYLON_OUTLINE[2].x)/2,z:(NYLON_OUTLINE[1].z+NYLON_OUTLINE[2].z)/2};
  check(!canStand(wall.x,wall.z,world),'The immense wall is solid outside the open gates');
  return {ok:true,checks,metresWalked:Math.round(distance),maxGrade,metrics:world.nylon.metrics};
}
