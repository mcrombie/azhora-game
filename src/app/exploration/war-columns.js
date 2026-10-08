import {OVESOS_ROADS} from '../../content/regions/oves/ovesos-farm.js';
import {CARICAS_ROADS} from '../../content/regions/minora-frontier/caricas-settlement.js';

// Final approaches after the strategic river crossing. Both are existing dry
// village/farm roads, not the atlas's straight-line river estimate.
export const OVESOS_COLUMN_ROAD=OVESOS_ROADS[0].points.slice(12,21);
export const CARICAS_COLUMN_ROAD=[...CARICAS_ROADS[1].points.slice(0,5).reverse(),CARICAS_ROADS[0].points[4]];
const roadLength=road=>road.slice(1).reduce((n,b,i)=>n+Math.hypot(b.x-road[i].x,b.z-road[i].z),0);
export const COLUMN_LENGTH=roadLength(OVESOS_COLUMN_ROAD);
export const CARICAS_COLUMN_LENGTH=roadLength(CARICAS_COLUMN_ROAD);
const routes={ovesos:{points:OVESOS_COLUMN_ROAD,length:COLUMN_LENGTH,name:'Ovesos north road'},caricas:{points:CARICAS_COLUMN_ROAD,length:CARICAS_COLUMN_LENGTH,name:'Caricas farm road'}};
export function columnRoadPoint(distance,route='ovesos'){
  const road=routes[route]??routes.ovesos;let remaining=Math.max(0,Math.min(road.length,distance));
  for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    if(remaining<=length||i===road.points.length-1)return {x:a.x+dx*remaining/length,z:a.z+dz*remaining/length,yaw:Math.atan2(dx,dz)};
    remaining-=length;
  }
}

function regionalColumn(state,clock,region,owner,from){
  const army=state.armies.find(a=>a.owner===owner&&a.strength>0&&((a.status==='marching'&&a.from===from&&a.to===region)||
    (a.status==='engaged'&&state.engagements.some(b=>b.region===region&&b.status==='active'&&b.attackingIds.includes(a.id)))));
  if(!army)return null;
  const road=routes[region],marching=army.status==='marching',day=state.day+clock.fraction/clock.secondsPerDay;
  // v6's nearer Caricas battle starts on day 3: its approach is visible from
  // day 1. Existing Ovesos saves retain their original final two-day approach.
  const begins=Math.max(army.departed??0,army.arrives-2),duration=Math.max(.001,army.arrives-begins);
  if(marching&&day<begins)return null;
  const progress=marching?Math.max(0,Math.min(1,(day-begins)/duration)):1;
  return {id:army.id,owner:army.owner,name:army.name,strength:army.strength,marching,route:region,roadName:road.name,
    distance:progress*road.length,location:columnRoadPoint(progress*road.length,region),
    count:Math.min(8,Math.ceil(army.strength/8)),arrives:army.arrives};
}
export const ovesosColumn=(state,clock)=>regionalColumn(state,clock,'ovesos','east','caricas');
export const caricasColumn=(state,clock)=>regionalColumn(state,clock,'caricas','west','nethereum');
export function campaignColumn(state,clock){
  const columns=[caricasColumn(state,clock),ovesosColumn(state,clock)].filter(Boolean);
  return columns.find(c=>c.marching)??columns[0]??null;
}
