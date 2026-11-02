import {outerWaterSample,outerCellAt} from '../outer-regions/outer-regions-world.js';
import {landDistance} from '../../../world/terrain/region-world.js';
import {NORTHERN_TOWNS,northernTownAt,townRadius,townRoadDistance} from './northern-towns-layout.js';
const hash=(a,b)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
export function buildingCorners(s,pad=0){const co=Math.cos(s.yaw??0),si=Math.sin(s.yaw??0);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>({x:s.x+u*(s.w/2+pad)*co+v*(s.d/2+pad)*si,z:s.z-u*(s.w/2+pad)*si+v*(s.d/2+pad)*co}));}
function plan(t){
  const at=(u,v)=>({x:t.mouth.x+u,z:t.mouth.z+v});
  const civic=t.style==='finnish'?[
    {id:'riesov-stone-hall',...at(-118,-8),w:12,d:22,h:8,kind:'stone-hall'},
    {id:'riesov-belfry',...at(-113,20),w:6,d:6,h:16,kind:'belfry'},
    {id:'riesov-trading-house',...at(-18,76),w:10,d:16,h:7,kind:'log'},
  ]:[
    {id:'witherst-guildhall',...at(-117,-9),w:12,d:23,h:9,kind:'guildhall'},
    {id:'witherst-grain-house',...at(-18,76),w:10,d:17,h:8,kind:'warehouse'},
  ];
  const lots=[];
  for(let row=0;row<10;row++)for(let col=0;col<13;col++){
    const seed=hash(row+3,col+17),p=at(-148+col*14+(seed-.5)*2,-64+row*15+(seed-.5)*2),w=6.7+seed*1.8,d=8+seed*3,r=Math.hypot(w,d)/2+1;
    if(townRadius(t,p.x,p.z)>.91||townRoadDistance(t,p.x,p.z)<r+3.2)continue;
    const m=t.market,b=t.bridge;
    if(Math.abs(p.x-m.x)<m.w/2+r&&Math.abs(p.z-m.z)<m.d/2+r)continue;
    if(Math.abs(p.x-b.x)<b.length/2+r+3&&Math.abs(p.z-b.z)<b.width/2+r+3)continue;
    if(civic.some(s=>Math.abs(p.x-s.x)<s.w/2+r+3&&Math.abs(p.z-s.z)<s.d/2+r+3))continue;
    if(t.quays.some(q=>Math.abs(p.x-q.x)<q.w/2+r+3&&Math.abs(p.z-q.z)<q.d/2+r+3))continue;
    const s={id:`${t.id}-house-${row}-${col}`,...p,w,d,h:seed>.55?6.5:3.6,seed,yaw:(seed-.5)*.13,kind:t.style==='finnish'?'log':seed>.75?'brick':'timber'};
    if(!buildingCorners(s,2).every(p=>landDistance(p.x,p.z)>18&&(outerWaterSample(p.x,p.z)?.distance??Infinity)>9&&t.regions.includes(outerCellAt(p.x,p.z)?.profile.id)))continue;
    lots.push(s);
  }
  return Object.freeze([...civic,...lots].map(Object.freeze));
}
export const NORTHERN_TOWN_BUILDINGS=Object.freeze(Object.fromEntries(NORTHERN_TOWNS.map(t=>[t.id,plan(t)])));
export function northernTownTint(x,z){const t=northernTownAt(x,z);return t&&townRadius(t,x,z)<1&&landDistance(x,z)>8&&(outerWaterSample(x,z)?.distance??Infinity)>3?(t.style==='finnish'?'#a6a38a':'#b5ae91'):null;}
