import { SELAMUS, SELAMUS_ARRIVAL, SELAMUS_BUILDINGS, SELAMUS_BRIDGES, SELAMUS_CANALS, selamusPoint } from './selamus-city.js';
import { canStand, moveCharacter } from './game-state.js';
import { BODY, bodyWorld } from './bodies.js';
import { WALK_STEP } from './walk-surfaces.js';
import { SELAMUS_PIERS } from './selamus-harbor.js';

/** Production collision and support checks, used by the leaf fixture and the
 * native review. Each crossing moves a full-size traveler, never teleports it
 * across the canal or replaces real collision with an empty list. */
export function runSelamusChecks(world){
  const check=(ok,message)=>{if(!ok)throw new Error(`Selemis: ${message}`);};
  check(world.selamus?.root&&world.selamusHarbor?.root,'the city and harbor are built');
  check(world.selamus.metrics.buildings===SELAMUS_BUILDINGS.length,'every building is installed');
  check(canStand(SELAMUS_ARRIVAL.x,SELAMUS_ARRIVAL.z,world),'the F8 arrival is clear');
  check(!world.colliders.some(c=>c.kind==='selamus-wall'||c.kind==='selamus-city-wall'),'the city has no defensive curtain');
  const journeys=[];
  for(const bridge of [...SELAMUS_BRIDGES,...SELAMUS_PIERS])for(const reverse of [false,true]){
    const a=reverse?bridge.b:bridge.a,b=reverse?bridge.a:bridge.b;
    const at={...a,y:world.supportAt(a.x,a.z,{maxY:bridge.elevation??world.heightAt(a.x,a.z),stepUp:WALK_STEP}).height},walking=bodyWorld(world).moving(at,BODY.traveler);
    let steps=0,minClearance=Infinity;
    while(Math.hypot(b.x-at.x,b.z-at.z)>.015){
      check(++steps<1500,`${bridge.id} stuck`);
      const before={...at},distance=Math.hypot(b.x-at.x,b.z-at.z),delta=Math.min(.12,distance);
      moveCharacter(at,(b.x-at.x)/distance*delta,(b.z-at.z)/distance*delta,walking,BODY.traveler);
      check(Math.hypot(at.x-before.x,at.z-before.z)>.001,`${bridge.id} collision at ${at.x.toFixed(2)},${at.z.toFixed(2)}`);
      const support=world.supportAt(at.x,at.z,{maxY:before.y,stepUp:WALK_STEP});
      check(support.height>1.5,`${bridge.id} drops into water`);
      check(Math.abs(support.height-before.y)<.36,`${bridge.id} discontinuous deck`);
      at.y=support.height;minClearance=Math.min(minClearance,at.y);
    }
    journeys.push({id:bridge.id,reverse,steps,minClearance});
  }
  let wetSamples=0;
  for(const canal of SELAMUS_CANALS)for(let i=1;i<canal.points.length;i++){
    const a=canal.points[i-1],b=canal.points[i];
    for(let t=.15;t<1;t+=.2){const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      check(world.heightAt(x,z)<world.waterAt(x,z)-1,`${canal.id} has a dry dam at ${x.toFixed(1)},${z.toFixed(1)}`);wetSamples++;}
  }
  const plaza=selamusPoint(0,33);check(canStand(plaza.x,plaza.z,world),'the temple plaza is walkable');
  return {ok:true,region:SELAMUS.region,buildings:SELAMUS_BUILDINGS.length,bridges:SELAMUS_BRIDGES.length,
    fleet:world.selamusHarbor.metrics,wetSamples,journeys};
}
