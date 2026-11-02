import {acorCellAt,acorGround} from '../acor/acor-world.js';
import {landDistance} from '../../../world/terrain/region-world.js';
import {inEndevorTown,endevorRoadDistance,endevorSettlementReserved,endevorDry} from './endevor-layout.js';
const F=Object.freeze,hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
const market=(x,z,r=0)=>Math.abs(x+2118)<13+r&&Math.abs(z+3239)<13+r;
const civic=[
  {id:'endevor-guildhall',x:-2088,z:-3243,w:13,d:23,height:8.5,kind:'hall',yaw:0,seed:.8},
  {id:'endevor-bell-hall',x:-2080,z:-3208,w:12,d:23,height:9.5,kind:'bell-hall',yaw:.06,seed:.9},
  {id:'endevor-wool-house',x:-2194,z:-3240,w:13,d:19,height:7.2,kind:'warehouse',yaw:0,seed:.5},
];
const houses=[];
for(let row=0;row<8;row++)for(let col=0;col<12;col++){
  const seed=hash(col,row),x=-2220+col*14+(row%2)*3+(seed-.5)*3,z=-3280+row*14+(seed-.5)*3;
  const w=6.5+seed*2.1,d=7+seed*2.5,r=Math.hypot(w,d)/2+1;
  if(!inEndevorTown(x,z,-8)||market(x,z,r)||endevorRoadDistance(x,z)<r+3.3)continue;
  if(civic.some(c=>Math.abs(x-c.x)<c.w/2+r+2&&Math.abs(z-c.z)<c.d/2+r+2))continue;
  if(![[-r,-r],[r,-r],[r,r],[-r,r],[0,0]].every(([u,v])=>landDistance(x+u,z+v)>16&&endevorDry(x+u,z+v,7)))continue;
  houses.push(F({id:`endevor-house-${row}-${col}`,x,z,w,d,height:seed>.5?6.3:3.2,seed,yaw:(seed-.5)*.16,kind:'house'}));
}
export const ENDEVOR_BUILDINGS=F([...civic.map(F),...houses]);
export const ENDEVOR_CROPS=F([['#a6a06b','#beac6a'],['#7f905c','#9ba968'],['#917855','#a28861'],['#818761','#769151']]);
const fields=[];
for(let z=-3270;z<=-2940;z+=46)for(let x=-2350;x<=-1920;x+=51){
  const seed=hash(x,z),w=38+seed*4,d=31+seed*5;
  if(Math.hypot(x+2140,z+3244)>310)continue;
  const points=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[0,0]],region=acorCellAt(x,z)?.region;
  if(!['West Endevor','North Endevor'].includes(region))continue;
  if(!points.every(([u,v])=>acorCellAt(x+u,z+v)?.region===region&&landDistance(x+u,z+v)>24&&endevorDry(x+u,z+v,12)&&!endevorSettlementReserved(x+u,z+v,8)))continue;
  const ys=points.map(([u,v])=>acorGround(x+u,z+v));if(Math.max(...ys)-Math.min(...ys)>9)continue;
  fields.push(F({id:`endevor-field-${fields.length}`,x,z,w,d,region,seed,crop:Math.floor(seed*4)}));
}
export const ENDEVOR_FIELDS=F(fields);
export function endevorFieldAt(x,z,r=0){if(x< -2400||x> -1870||z< -3330||z> -2890)return null;return fields.find(f=>Math.abs(x-f.x)<f.w/2+r&&Math.abs(z-f.z)<f.d/2+r)??null;}
export const endevorReserved=(x,z,r=0)=>endevorSettlementReserved(x,z,r)||!!endevorFieldAt(x,z,r+3);
export function endevorTownTint(x,z){const f=endevorFieldAt(x,z);return f?ENDEVOR_CROPS[f.crop][0]:inEndevorTown(x,z)&&landDistance(x,z)>12&&endevorDry(x,z,2)?'#a99d7e':null;}
