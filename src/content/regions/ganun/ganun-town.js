import {outerWaterSample,outerCellAt} from '../outer-regions/outer-regions-world.js';
import {landDistance} from '../../../world/terrain/region-world.js';
import {inGanunTown,ganunRoadDistance,GANUN_BRIDGES,GANUN_QUAYS} from './ganun-layout.js';
export const GANUN_MARKET=Object.freeze({x:1568,z:-2438,w:54,d:50});
const landmarks=[
  {id:'ganun-town-hall',x:1568,z:-2438,w:13,d:22,h:12,kind:'town-hall',yaw:0,seed:.9},
  {id:'ganun-bell-hall',x:1548,z:-2388,w:12,d:26,h:10,kind:'bell-hall',yaw:.05,seed:.85},
  {id:'ganun-harbor-crane',x:1673,z:-2389,w:9,d:15,h:10,kind:'crane',yaw:-Math.PI/2,seed:.7},
  {id:'ganun-grain-hall',x:1573,z:-2315,w:12,d:19,h:10,kind:'granary',yaw:0,seed:.8},
  {id:'ganun-river-granary',x:1626,z:-2306,w:11,d:16,h:11,kind:'granary',yaw:.04,seed:.65},
];
const lots=[];
const hash=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);};
for(let row=0;row<13;row++)for(let col=0;col<13;col++){
  const seed=hash(row+3,col+5),x=1530+col*14+(seed-.5)*2,z=-2482+row*15+(seed-.5)*2;
  const w=7+seed*2,d=8.5+seed*3,r=Math.hypot(w,d)/2+1;
  if(!inGanunTown(x,z,-8)||ganunRoadDistance(x,z)<r+3.5)continue;
  const m=GANUN_MARKET;if(Math.abs(x-m.x)<m.w/2+r+1&&Math.abs(z-m.z)<m.d/2+r+1)continue;
  if(landmarks.some(b=>Math.abs(x-b.x)<b.w/2+r+3&&Math.abs(z-b.z)<b.d/2+r+3))continue;
  if(GANUN_BRIDGES.some(b=>Math.abs(x-b.x)<(b.axis==='x'?b.length:b.width)/2+r+4&&Math.abs(z-b.z)<(b.axis==='z'?b.length:b.width)/2+r+4))continue;
  if(GANUN_QUAYS.some(b=>Math.abs(x-b.x)<b.w/2+r+3&&Math.abs(z-b.z)<b.d/2+r+3))continue;
  if(![[-r,-r],[r,-r],[r,r],[-r,r],[0,0]].every(([u,v])=>outerCellAt(x+u,z+v)?.region==='South Ganun'&&landDistance(x+u,z+v)>19&&(outerWaterSample(x+u,z+v)?.distance??Infinity)>8))continue;
  lots.push({id:`ganun-house-${row}-${col}`,x,z,w,d,h:seed>.45?6.8:3.7,kind:seed>.48?'merchant':'timber',seed,yaw:(seed-.5)*.12});
}
export const GANUN_BUILDINGS=Object.freeze([...landmarks,...lots].map(Object.freeze));
export function ganunTint(x,z){return inGanunTown(x,z)&&landDistance(x,z)>10&&(outerWaterSample(x,z)?.distance??Infinity)>3?'#afa58a':null;}
