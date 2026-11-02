import {TOWER} from '../../../app/exploration/tower-state.js';
// Its eastern edge meets the real landing. Height separates it from the rooms
// occupying the same X/Z coordinates on the lower floors.
export const SANCTUARY=Object.freeze({x:TOWER.x+13.5-720,y:TOWER.y+54,z:TOWER.z,radius:720});
export const SANCTUARY_ENTRY=Object.freeze({x:TOWER.x+13.5,y:SANCTUARY.y,z:TOWER.z});
export const SANCTUARY_HABITATS=Object.freeze([
  {id:'woodland',name:'Mixed woodland',x:360,z:-170,color:'#7f9168'},
  {id:'grassland',name:'Open meadow',x:560,z:0,color:'#a2ae76'},
  {id:'alpine',name:'Pine uplands',x:160,z:-340,color:'#929e8c'},
  {id:'wetland',name:'River and marsh',x:360,z:260,color:'#7e9d83'},
].map(Object.freeze));
export const sanctuaryContains=(x,z,y=SANCTUARY.y)=>y>=SANCTUARY.y-4&&Math.abs(x-SANCTUARY.x)<SANCTUARY.radius&&Math.abs(z-SANCTUARY.z)<SANCTUARY.radius;
export const sanctuaryView=point=>point.y>=SANCTUARY.y-4&&(sanctuaryContains(point.x,point.z,point.y)||Math.hypot(point.x-TOWER.x-19,point.z-TOWER.z)<8);
export const sanctuaryReturnMarker=(x,z,y)=>sanctuaryContains(x,z,y)?{...SANCTUARY_ENTRY,id:'sanctuary-return-marker',label:'Doorway / Return to the tower'}:null;
// No habitat travel actions; all ordinary navigation uses the terrain.
export const sanctuaryTravel=()=>null;
export const sanctuaryGuides=()=>[];
// Older checkpoints used a disconnected sanctuary east of the tower. Bring
// those visitors to the new doorway, never to a lower chamber or open void.
export function restoreSanctuaryPosition(point){
  return point&&point.y>=SANCTUARY.y-4&&Math.abs(point.x-(TOWER.x+2048))<720&&Math.abs(point.z-TOWER.z)<720
    ?{x:SANCTUARY_ENTRY.x-3,y:SANCTUARY.y,z:SANCTUARY_ENTRY.z+1}:point;
}
export const SANCTUARY_PATHS=Object.freeze([
  [[13.5,0],[-30,0],[-85,-5],[-165,-70],[-260,-135],[-360,-115],[-470,-230]],
  [[-30,0],[-80,65],[-150,155],[-165,205],[-195,315],[-290,320],[-335,255],[-400,155],[-360,-115]],
].map(path=>Object.freeze(path.map(([x,z])=>Object.freeze({x:TOWER.x+x,z:TOWER.z+z})))));
export function sanctuaryPathDistance(x,z){
  let distance=Infinity;
  for(const path of SANCTUARY_PATHS)for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    distance=Math.min(distance,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));
  }return distance;
}
