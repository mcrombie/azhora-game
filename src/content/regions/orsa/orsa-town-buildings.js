import {landDistance} from '../../../world/terrain/region-world.js';
import {outerWaterSample,outerCellAt} from '../outer-regions/outer-regions-world.js';
import {orsaPoint,orsaLaneDistance,orsaTownRadius,ORSA_DECKS,orsaSegment} from './orsa-town-layout.js';
export function orsaBuildingCorners(s,pad=0){const co=Math.cos(s.yaw??0),si=Math.sin(s.yaw??0);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>({x:s.x+u*(s.w/2+pad)*co+v*(s.d/2+pad)*si,z:s.z-u*(s.w/2+pad)*si+v*(s.d/2+pad)*co}));}
const civic=[
  {id:'orsa-stave-hall',...orsaPoint(91,-39),w:14,d:19,h:6.3,kind:'stave',yaw:Math.PI/2},
  {id:'orsa-assembly-house',...orsaPoint(92,87),w:12,d:22,h:6.3,kind:'hall',yaw:Math.PI/2},
];
const slots=[
  [25,-44],[43,-43],[63,-44],[122,-43], [22,-8],[41,-6],[76,-5],[97,-3],[124,1],
  [5,43],[37,39],[78,42],[99,43],[119,46],
  [3,77],[38,79],[55,85],[7,96],[39,100],[117,97],[128,81],[103,110],
  [-13,87],[80,109],[19,111],[132,60],
];
const lots=[];
for(const [i,[u,v]] of slots.entries()){
  const seed=((i*37+11)%101)/101,kind=i<5?'store':i%4===0?'store':'log';
  const s={id:'orsa-house-'+i,...orsaPoint(u,v),w:6.4+seed*1.5,d:8.8+seed*2.2,h:kind==='store'?6.8+seed:3.5+seed*1.7,kind,seed,yaw:kind==='store'?Math.PI/2:(seed-.5)*.18};
  if(orsaTownRadius(s.x,s.z)>1.04||orsaLaneDistance(s.x,s.z)<Math.hypot(s.w,s.d)/2+1.2)continue;
  if(ORSA_DECKS.some(d=>orsaSegment(s.x,s.z,d.a,d.b).distance<Math.hypot(s.w,s.d)/2+d.width/2+1))continue;
  if(!orsaBuildingCorners(s,1.5).every(p=>landDistance(p.x,p.z)>10&&(outerWaterSample(p.x,p.z)?.distance??Infinity)>9&&['North Orsa','South Orsa'].includes(outerCellAt(p.x,p.z)?.region)))continue;
  lots.push(s);
}
export const ORSA_BUILDINGS=Object.freeze([...civic,...lots].map(Object.freeze));
export function orsaTownTint(x,z){return orsaTownRadius(x,z)<1.02&&landDistance(x,z)>8&&(outerWaterSample(x,z)?.distance??Infinity)>2?'#aaa58a':null;}
export const ORSA_BOATS=Object.freeze([
  {id:'orsa-trader',...orsaPoint(-67,-32),length:15,yaw:1.85,sail:true},
  {id:'orsa-fishing-1',...orsaPoint(-31,-45),length:7,yaw:Math.PI/2},
  {id:'orsa-fishing-2',...orsaPoint(-73,51),length:7.4,yaw:Math.PI/2},
  {id:'orsa-fishing-3',...orsaPoint(-83,72),length:6.4,yaw:1.25},
].map(Object.freeze));
