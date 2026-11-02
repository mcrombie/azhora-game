import {westGroundAt} from '../western-regions/west-ground.js';

// Public river crossings south of neutral Minora. Shared by scenery, walking,
// army navigation and maps; no simulation clock or renderer dependency.
export const LIZEEM_BRIDGES=Object.freeze([
  {id:'nethereum-caricas-bridge',name:'Nethereum–Caricas Bridge',regions:[17,13],x:-2164,z:348,length:160,width:12,y:24,ramp:30},
  {id:'ovesos-nesdor-bridge',name:'Ovesos–Nesdor Bridge',regions:[25,14],x:-1748,z:700,length:216,width:12,y:13.4,ramp:34},
].map(b=>Object.freeze({...b,startY:westGroundAt(b.x-b.length/2,b.z)+.12,endY:westGroundAt(b.x+b.length/2,b.z)+.12})));
export const lizeemBridgeEnd=(b,side)=>({x:b.x+side*b.length/2,z:b.z});
export function lizeemBridgeHeight(b,u){
  const bank=u<0?b.startY:b.endY,t=Math.max(0,Math.min(1,(b.length/2-Math.abs(u))/b.ramp));
  return bank+(b.y-bank)*t;
}
export function lizeemBridgeDeckHeight(x,z){
  for(const b of LIZEEM_BRIDGES)if(Math.abs(x-b.x)<=b.length/2&&Math.abs(z-b.z)<=b.width/2)return lizeemBridgeHeight(b,x-b.x);
  return null;
}
const path=points=>Object.assign(points.map(([x,z])=>({x,z})),{width:6,kind:'road'});
export const LIZEEM_BRIDGE_APPROACHES=Object.freeze([
  path([[-2240,382],[-2258,362],[-2244,348]]),
  path([[-2084,348],[-2078,350],[-2065,350]]),
  path([[-1870,701],[-1856,700]]),
  path([[-1640,700],[-1620,710],[-1570,710]]),
]);
export const LIZEEM_CROSSING_PATHS=Object.freeze([...LIZEEM_BRIDGE_APPROACHES,
  ...LIZEEM_BRIDGES.map(b=>Object.assign([lizeemBridgeEnd(b,-1),lizeemBridgeEnd(b,1)],{width:b.width,kind:'road'}))]);
export const LIZEEM_MAP_BRIDGES=Object.freeze(LIZEEM_BRIDGES.map(b=>({id:b.id,name:b.name,crossing:{x:b.x,z:b.z},axis:{x:1,z:0},side:{x:0,z:1},halfSpan:b.length/2,halfWidth:b.width/2})));
// Include the full road width. A hand-written centreline bound previously cut
// the lower approach's protected strip short by one metre.
const reservedBounds=LIZEEM_CROSSING_PATHS.reduce((box,path)=>{
  for(const p of path){const r=path.width/2;box.minX=Math.min(box.minX,p.x-r);box.maxX=Math.max(box.maxX,p.x+r);box.minZ=Math.min(box.minZ,p.z-r);box.maxZ=Math.max(box.maxZ,p.z+r);}
  return box;
},{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
export function lizeemCrossingReserved(x,z,margin=0){
  if(x<reservedBounds.minX-margin||x>reservedBounds.maxX+margin||z<reservedBounds.minZ-margin||z>reservedBounds.maxZ+margin)return false;
  return LIZEEM_CROSSING_PATHS.some(path=>path.slice(1).some((b,i)=>{
    const a=path[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<path.width/2+margin;
  }));
}
