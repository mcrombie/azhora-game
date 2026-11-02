/** Deterministic dry-land plots and town lots; the existing northern rivers
 * remain authoritative. No changes to hydrology or neighbouring kingdoms. */
import {outerProfile,outerWaterSample,outerGround} from '../outer-regions/outer-regions-world.js';
import {LOND_REGIONS,londSettlementReserved,inLondTown,londRoadDistance,LOND_BRIDGES,bridgePoint} from './lond-layout.js';
const F=Object.freeze;
const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
const dry=(x,z,margin=0)=>(outerWaterSample(x,z)?.distance??Infinity)>margin;
export const LOND_FIELDS=F(LOND_REGIONS.flatMap(region=>{
  const p=outerProfile(region),b=p.bounds,plots=[];
  function plot(x,z,w,d,subdivide=true){
    const n=hash(x,z),samples=[[-w/2,-d/2],[0,-d/2],[w/2,-d/2],[-w/2,0],[0,0],[w/2,0],[-w/2,d/2],[0,d/2],[w/2,d/2]];
    const valid=samples.every(([u,v])=>p.owns(x+u,z+v)&&dry(x+u,z+v,6)&&!londSettlementReserved(x+u,z+v,5));
    const heights=valid?samples.map(([u,v])=>outerGround(x+u,z+v)):[];
    if(valid&&Math.max(...heights)-Math.min(...heights)<15){plots.push(F({id:`lond-field-${x}-${z}`,region,x,z,w,d,crop:['barley','wheat','hay','fallow','beans'][Math.floor(n*5)],seed:n}));return;}
    // Small irregular holdings fill the dry edges of larger fields, instead
    // of losing an entire agricultural block to one river bend or border.
    if(subdivide)for(const sx of [-1,1])for(const sz of [-1,1])plot(x+sx*w/4,z+sz*d/4,w/2-2,d/2-2,false);
  }
  for(let z=Math.ceil(b.minZ/62)*62;z<b.maxZ;z+=62)for(let x=Math.ceil(b.minX/72)*72;x<b.maxX;x+=72){
    const n=hash(x,z);plot(x,z,64+n*3,54+n*3);
  }
  return plots;
}));
const fieldIndex=new Map();
for(const f of LOND_FIELDS)for(let x=Math.floor((f.x-f.w/2-20)/80);x<=Math.floor((f.x+f.w/2+20)/80);x++)for(let z=Math.floor((f.z-f.d/2-20)/80);z<=Math.floor((f.z+f.d/2+20)/80);z++){
  const key=`${x},${z}`;if(!fieldIndex.has(key))fieldIndex.set(key,[]);fieldIndex.get(key).push(f);
}
export function londFieldAt(x,z,margin=0){
  if(x< -1100||x>950||z< -4000||z> -2350)return null;
  for(const f of fieldIndex.get(`${Math.floor(x/80)},${Math.floor(z/80)}`)??[])if(Math.abs(x-f.x)<f.w/2+margin&&Math.abs(z-f.z)<f.d/2+margin)return f;
  return null;
}
export const londReserved=(x,z,r=0)=>londSettlementReserved(x,z,r)||!!londFieldAt(x,z,r+2);
function bridgeClear(x,z,r){return LOND_BRIDGES.every(b=>{const u=b.axis==='x'?x-b.x:z-b.z,v=b.axis==='x'?z-b.z:x-b.x;return Math.abs(u)>b.length/2+4+r||Math.abs(v)>b.width/2+3+r;});}
const lots=[];
for(let row=0;row<12;row++)for(let col=0;col<13;col++){
  const n=hash(row,col),x=-67+col*14+(row%2)*4+(n-.5)*3,z=-3330+row*16+(n-.5)*4;
  const w=6.5+n*3,d=7+n*3,yaw=(n-.5)*.28,r=Math.hypot(w,d)/2+1;
  if(!inLondTown(x,z,-9)||londRoadDistance(x,z)<r+3||!bridgeClear(x,z,r))continue;
  if(![[-r,-r],[r,-r],[-r,r],[r,r],[0,0]].every(([u,v])=>dry(x+u,z+v,5)))continue;
  const hs=[[-r,-r],[r,-r],[-r,r],[r,r]].map(([u,v])=>outerGround(x+u,z+v));
  if(Math.max(...hs)-Math.min(...hs)>3.8)continue;
  lots.push(F({id:`lond-house-${row}-${col}`,x,z,w,d,yaw,height:4.5+(col%3)*1.9+n,seed:n,base:Math.max(...hs)}));
}
// Restyle the existing town lots; Stonefist and the rural barns retain their own
// architecture. Merchant gables face the river street, not the backs of lots.
export const LOND_BUILDINGS=F(lots.map(s=>{
  const guild=s.id==='lond-house-4-2',merchant=['lond-house-2-10','lond-house-7-11','lond-house-9-9'].includes(s.id);
  const yaw=guild?0:s.x>50?(s.z< -3262&&s.x<84?Math.PI/2:-Math.PI/2)+(s.seed-.5)*.07:s.yaw;
  return F({...s,yaw,kind:guild?'guildhall':merchant?'merchant':'timber',...(guild?{w:11.8,d:12,height:10.2}:{} )});
}));
export const LOND_MARKET=F({x:-31,z:-3240,w:38,d:10});
export const LOND_MARKET_STALLS=F([-44,-36,-28,-20].map((x,i)=>F({id:'lond-market-'+i,x,z:-3239,w:3.8,d:2.8})));
export const LOND_FARMSTEADS=F(LOND_FIELDS.filter((f,i)=>i%13===0&&f.w>40).map(f=>F({id:`${f.id}-barn`,region:f.region,x:f.x-f.w/2+6,z:f.z-f.d/2+6,w:7,d:10,height:4.3,yaw:0,seed:f.seed})));
export const LOND_CROPS=F({barley:['#a6a068','#c4af69'],wheat:['#aaa371','#c3b57c'],hay:['#839359','#9aab68'],fallow:['#8b795a','#927e5c'],beans:['#8e8b62','#6d894e']});
export function londTint(x,z){const f=londFieldAt(x,z);return f?LOND_CROPS[f.crop][0]:null;}
