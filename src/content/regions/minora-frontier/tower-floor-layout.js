import {GUILD_EXPANSION} from './guild-expansion.js';
import {TOWER} from '../../../app/exploration/tower-state.js';
import {createWalkSurfaces} from '../../../world/collision/walk-surfaces.js';

// The developed chambers occupy eleven landings in a larger guild tower. Their
// shared elevation/shaft contract keeps scenery, walking and saved feet aligned.
const F=Object.freeze,TAU=Math.PI*2;
export const TOWER_FLOORS=F([
  ...GUILD_EXPANSION.filter(w=>w.level<0).map(w=>F({id:w.id,name:w.chamber,wizard:w.name,title:w.domain,y:w.offset.y})),
  F({id:'senro',name:'The Folded Chamber',wizard:'Snero Fold',title:'Doors and Distances',y:-10.8}),
  F({id:'taleth',name:"Taleth's Chamber",wizard:'Taleth',title:'Master Time Wizard',y:0}),
  F({id:'hadrin',name:'The Brightlock Workshop',wizard:'Hadrin Brightlock',title:'Enchantment',y:10.8}),
  ...GUILD_EXPANSION.filter(w=>w.level>0).map(w=>F({id:w.id,name:w.chamber,wizard:w.name,title:w.domain,y:w.offset.y})),
]);
export const TOWER_STAIR_MIN=-4,TOWER_STAIR_MAX=6;
export const TOWER_ROOM_HALF_WIDTH=13.5;
export const TOWER_STAIR=F({x:19,z:0,radius:3.6,inner:2.1,outer:5.1,rise:10.8,steps:72,landingAngle:.55});
export const TOWER_INTERIOR_BOUNDS=F({minX:TOWER.x-13.5,maxX:TOWER.x+24.5,minZ:TOWER.z-12.5,maxZ:TOWER.z+12.5});
export function towerFloorAt(worldY){
  return TOWER_FLOORS.reduce((best,f)=>Math.abs(worldY-TOWER.y-f.y)<Math.abs(worldY-TOWER.y-best.y)?f:best,TOWER_FLOORS.find(f=>f.id==='taleth'));
}
export function towerStairHeight(progress){
  const p=Math.max(TOWER_STAIR_MIN,Math.min(TOWER_STAIR_MAX,progress)),flight=Math.min(TOWER_STAIR_MAX-1,Math.floor(p)),u=p-flight;
  const landing=TOWER_STAIR.landingAngle/TAU,t=Math.max(0,Math.min(1,(u-landing)/(1-landing*2)));
  return TOWER.y+(flight-1)*TOWER_STAIR.rise+t*TOWER_STAIR.rise;
}
/** World-space route for real walking and checks; each revolution reaches the
 * next landing, with a level threshold where the chamber doorway meets it. */
export function towerStairPoint(progress,radius=TOWER_STAIR.radius){
  const a=Math.PI+progress*TAU;
  return {x:TOWER.x+TOWER_STAIR.x+Math.cos(a)*radius,y:towerStairHeight(progress),z:TOWER.z+TOWER_STAIR.z+Math.sin(a)*radius};
}
export function towerInteriorContains(x,z){
  x-=TOWER.x;z-=TOWER.z;
  return (Math.abs(x)<=13.5&&Math.abs(z)<=12.5)
    ||(x>=13&&x<=16.2&&Math.abs(z)<=1.6)
    ||Math.hypot(x-TOWER_STAIR.x,z-TOWER_STAIR.z)<=5.3;
}
export function createTowerFloorSupport(){
  const surfaces=[],colliders=[],heightAt=()=>TOWER.y+TOWER_FLOORS[0].y;
  for(const floor of TOWER_FLOORS){
    const y=TOWER.y+floor.y;
    surfaces.push({id:`tower-floor-${floor.id}`,kind:'deck',a:{x:TOWER.x-TOWER_ROOM_HALF_WIDTH,y,z:TOWER.z},b:{x:TOWER.x+TOWER_ROOM_HALF_WIDTH,y,z:TOWER.z},width:26});
    surfaces.push({id:`tower-landing-${floor.id}`,kind:'deck',a:{x:TOWER.x+13,y,z:TOWER.z},b:{x:TOWER.x+16.2,y,z:TOWER.z},width:3.2});
    colliders.push({x:TOWER.x,z:TOWER.z,hx:TOWER_ROOM_HALF_WIDTH,hz:13.5,minY:y-.4,maxY:y,kind:'tower-floor'});
  }
  for(let flight=TOWER_STAIR_MIN;flight<TOWER_STAIR_MAX;flight++)for(let i=0;i<TOWER_STAIR.steps;i++){
    const a=towerStairPoint(flight+i/TOWER_STAIR.steps),b=towerStairPoint(flight+(i+1)/TOWER_STAIR.steps);
    // Overlap adjoining tangent rectangles slightly at the outer tread edge.
    // Selection still checks feet height, so a second turn cannot teleport you.
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),overlap=.09,grade=(b.y-a.y)/length;
    surfaces.push({id:`tower-stair-${flight}-${i}`,kind:a.y===b.y?'deck':'ramp',
      a:{x:a.x-dx/length*overlap,y:a.y-grade*overlap,z:a.z-dz/length*overlap},
      b:{x:b.x+dx/length*overlap,y:b.y+grade*overlap,z:b.z+dz/length*overlap},width:3.12});
  }
  const shaftTop=TOWER.y+TOWER_FLOORS.at(-1).y+10.2;
  colliders.push({x:TOWER.x+TOWER_STAIR.x,z:TOWER.z,r:2,minY:heightAt()-.5,maxY:shaftTop,kind:'tower-stair-core'});
  // The shaft wall is represented with a bounded ring of small circles; no
  // rotated-box collision approximation can snag a shoulder on the curves.
  for(let i=0;i<96;i++){
    const a=i/96*TAU,west=Math.abs(Math.atan2(Math.sin(a-Math.PI),Math.cos(a-Math.PI)))<.40;
    if(west)continue;
    colliders.push({x:TOWER.x+19+Math.cos(a)*5.35,z:TOWER.z+Math.sin(a)*5.35,r:.22,
      minY:heightAt()-.5,maxY:shaftTop,kind:'tower-stair-wall'});
  }
  // Doorway lips keep feet on the flat connection, rather than letting the
  // player cut across empty space alongside a landing.
  for(const floor of TOWER_FLOORS)for(const side of [-1,1])colliders.push({x:TOWER.x+13.8,z:TOWER.z+side*1.76,hx:.8,hz:.12,
    minY:TOWER.y+floor.y,maxY:TOWER.y+floor.y+1.1,kind:'tower-landing-rail'});
  // These are the first developed floors, not the whole tower. Sealed guild
  // gates cap the unbuilt continuation on either end of the physical spiral.
  for(const [floor,side] of [[TOWER_FLOORS[0],1],[TOWER_FLOORS.at(-1),-1]])colliders.push({x:TOWER.x+15.55,z:TOWER.z+side*1.58,hx:1.65,hz:.12,
    minY:TOWER.y+floor.y-.05,maxY:TOWER.y+floor.y+3.8,kind:'tower-guild-gate'});
  const walks=createWalkSurfaces(surfaces,heightAt);
  return {surfaces,colliders,heightAt,supportAt:walks.supportAt,canExploreAt:towerInteriorContains,bounds:TOWER_INTERIOR_BOUNDS};
}
