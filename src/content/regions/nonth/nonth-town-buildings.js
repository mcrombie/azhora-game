import {outerCellAt,outerWaterSample} from '../outer-regions/outer-regions-world.js';
import {nonthPoint,nonthTownRadius,nonthLaneDistance} from './nonth-town-layout.js';
export function nonthBuildingCorners(s,pad=0){const co=Math.cos(s.yaw??0),si=Math.sin(s.yaw??0);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>({x:s.x+u*(s.w/2+pad)*co+v*(s.d/2+pad)*si,z:s.z-u*(s.w/2+pad)*si+v*(s.d/2+pad)*co}));}
const civic=[
  {id:'nonth-keep',...nonthPoint(-18,-42),w:15,d:17,h:17,kind:'keep',yaw:0},
  {id:'nonth-guildhouse',...nonthPoint(-8,43),w:10,d:13,h:10.2,kind:'stone',seed:.35,yaw:0},
];
const slots=[
  [-36,-53],[-36,-36],[-39,-25],[-36,-6],[-36,7],[-36,21],[-36,44],[-36,57],
  [-54,-41],[-54,-28],[-54,-4],[-54,9],[-54,22],[-54,44],
  [18,-25],[24,-7],[23,7],[18,21],[9,-5],[1,-17],[-10,-11],[-7,28],
  [-58,-55],[-22,62],[-10,63],[-62,55],
];
const houses=[];
for(const [i,[u,v]] of slots.entries()){
  const seed=((i*37+13)%101)/101,s={id:'nonth-house-'+i,...nonthPoint(u,v),w:5.3+seed*.8,d:6.4+seed*1.1,h:6.2+Math.floor(seed*3)*2,kind:i%8===0?'stone':'timber',seed,yaw:u<0?Math.PI/2:-Math.PI/2};
  if(nonthTownRadius(s.x,s.z)>1.13||nonthLaneDistance(s.x,s.z)<Math.hypot(s.w,s.d)/2+.6)continue;
  if(!nonthBuildingCorners(s,1).every(p=>outerCellAt(p.x,p.z)?.region==='North Nonoth'&&(outerWaterSample(p.x,p.z)?.distance??Infinity)>12))continue;
  if(civic.some(c=>Math.abs(s.x-c.x)<(c.w+s.d)/2+2&&Math.abs(s.z-c.z)<(c.d+s.w)/2+2))continue;
  houses.push(s);
}
export const NONTH_BUILDINGS=Object.freeze([...civic,...houses].map(Object.freeze));
export const NONTH_BOATS=Object.freeze([
  {id:'nonth-river-barge',...nonthPoint(50,-16),w:2.0,d:7.8,yaw:0},
  {id:'nonth-fishing-boat',...nonthPoint(48.5,11),w:1.4,d:5.4,yaw:-.24},
].map(Object.freeze));
export function nonthTownTint(x,z){if((outerWaterSample(x,z)?.distance??Infinity)<6)return '#8b9982';return nonthTownRadius(x,z)<1.1?'#b4ad92':null;}
