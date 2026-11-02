import {outerWaterSample,outerCellAt} from '../outer-regions/outer-regions-world.js';
import {THOTH_MARKET,thothPoint,thothTownRadius,thothLaneDistance} from './thoth-town-layout.js';
export function thothBuildingCorners(s,pad=0){const co=Math.cos(s.yaw??0),si=Math.sin(s.yaw??0);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>({x:s.x+u*(s.w/2+pad)*co+v*(s.d/2+pad)*si,z:s.z-u*(s.w/2+pad)*si+v*(s.d/2+pad)*co}));}
const civic=[
  {id:'thoth-stone-hall',...thothPoint(-28,-57),w:18,d:27,h:10.5,kind:'assembly-hall',yaw:0},
  {id:'thoth-guildhouse',...thothPoint(54,-62),w:13,d:23,h:9.7,kind:'guildhouse',yaw:0},
];
const slots=[
  [-66,-52],[-62,-72],[-61,-109],[-38,-110],[-13,-110],[14,-109],[40,-111],[65,-110],
  [-45,-83],[-25,-87],[38,-87],[64,-88],[-102,-67],[-104,-45],[105,-45],[105,-68],
  [-63,51],[-41,52],[-19,52],[21,51],[48,52],[65,52],
  [-63,88],[-40,87],[-17,87],[22,89],[44,90],[65,91],[-55,109],[-30,110],[42,110],
  [-50,-110],[-26,-112],[1,-108],[28,-109],[53,-110],[-99,-65],[105,-23],[90,2],
  [-52,88],[-29,86],[10,87],[33,89],[55,92],[-55,-58],
];
const houses=[];
for(const [i,[u,v]] of slots.entries()){
  const seed=((i*41+9)%101)/101,kind=i%7===0?'brick':i%3===0?'timber':'log';
  const s={id:'thoth-house-'+i,...thothPoint(u,v),w:7+seed*1.8,d:10+seed*2.5,h:kind==='brick'?7.8:kind==='timber'?6.7:3.8+seed*1.7,kind,seed,yaw:(seed-.5)*.12};
  if(thothTownRadius(s.x,s.z)>1.13||thothLaneDistance(s.x,s.z)<Math.hypot(s.w,s.d)/2+1)continue;
  if(!thothBuildingCorners(s,1).every(p=>['North Thoth','Central Thoth'].includes(outerCellAt(p.x,p.z)?.region)&&(outerWaterSample(p.x,p.z)?.distance??Infinity)>21))continue;
  houses.push(s);
}
export const THOTH_BUILDINGS=Object.freeze([...civic,...houses].map(Object.freeze));
export const THOTH_BOATS=Object.freeze([
  {id:'thoth-riverboat-west',...thothPoint(-42,14.434),w:1.4,d:6.2,yaw:Math.PI/2},
  {id:'thoth-riverboat-landing',...thothPoint(24,3.608),w:1.4,d:6.2,yaw:Math.PI/3},
].map(Object.freeze));
export function thothTownTint(x,z){const d=outerWaterSample(x,z)?.distance??Infinity;if(d<8)return '#88937d';if(thothTownRadius(x,z)<1.03)return '#aba58a';return null;}
export function thothMarketClear(x,z,pad=0){return Math.abs(x-THOTH_MARKET.x)<THOTH_MARKET.w/2+pad&&Math.abs(z-THOTH_MARKET.z)<THOTH_MARKET.d/2+pad;}
