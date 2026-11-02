import {OVESOS_ROADS} from '../../content/regions/oves/ovesos-farm.js';
import {CARICAS_ROADS} from '../../content/regions/minora-frontier/caricas-settlement.js';
import {isAlive,isMoving} from '../../simulation/forces.js';
import {armyMarchProgress} from '../../simulation/roadside-interception.js';

// Final approaches after the strategic river crossing. Both are existing dry
// village/farm roads, not the atlas's straight-line river estimate.
export const OVESOS_COLUMN_ROAD=OVESOS_ROADS[0].points.slice(12,21);
export const CARICAS_COLUMN_ROAD=[...CARICAS_ROADS[1].points.slice(0,5).reverse(),CARICAS_ROADS[0].points[4]];
const roadLength=road=>road.slice(1).reduce((n,b,i)=>n+Math.hypot(b.x-road[i].x,b.z-road[i].z),0);
export const COLUMN_LENGTH=roadLength(OVESOS_COLUMN_ROAD);
export const CARICAS_COLUMN_LENGTH=roadLength(CARICAS_COLUMN_ROAD);
const routes={ovesos:{points:OVESOS_COLUMN_ROAD,length:COLUMN_LENGTH,name:'Ovesos north road'},caricas:{points:CARICAS_COLUMN_ROAD,length:CARICAS_COLUMN_LENGTH,name:'Caricas farm road'}};
export function columnRoadPoint(distance,route='ovesos'){
  const road=typeof route==='object'?route:routes[route]??routes.ovesos;let remaining=Math.max(0,Math.min(road.length,distance));
  for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    if(!length)continue;
    if(remaining<=length||i===road.points.length-1)return {x:a.x+dx*remaining/length,z:a.z+dz*remaining/length,yaw:Math.atan2(dx,dz)};
    remaining-=length;
  }
  const point=road.points[0];return point?{...point,yaw:0}:null;
}

// Every live order has one physical timeline, regardless of its army number,
// allegiance, origin or destination. The renderer supplies the actual world's
// cached dry route; simulation strength and timing remain entirely read-only.
const convoyKey=army=>`${army.owner}:${army.from}:${army.to}:${army.departed}`;
function convoyOrders(state){
  const groups=new Map();
  // Order snapshots retain a convoy's original members after a force settles,
  // is destroyed, or starts another journey. Visibility never changes its slot.
  const orders=[...(state.events??[]).filter(e=>e.type==='march'||e.type==='retreat').map(e=>e.army),...state.armies];
  for(const army of orders){
    if(!army?.from||!army.to||!Number.isFinite(army.departed))continue;
    const key=convoyKey(army);if(!groups.has(key))groups.set(key,new Set());groups.get(key).add(army.id);
  }
  return new Map([...groups].map(([key,ids])=>[key,[...ids].sort((a,b)=>a-b)]));
}
export function campaignColumns(state,clock,resolveRoute){
  const day=state.day+(clock.fraction??0)/Math.max(.001,clock.secondsPerDay??30);
  const convoys=convoyOrders(state);
  return state.armies.filter(a=>isAlive(a)&&isMoving(a)).flatMap(army=>{
    const road=resolveRoute(army.from,army.to,army);if(!road?.points?.length)return [];
    const progress=armyMarchProgress(army,day);
    const length=road.length??roadLength(road.points),cohort=convoys.get(convoyKey(army))??[army.id],convoySlot=cohort.indexOf(army.id);
    // Stage simultaneous armies along the road instead of stacking their
    // standards and troops at one point. Compress only on the final approach;
    // the same anchored progress also keeps interception delays continuous.
    const spacing=Math.min(32,length/Math.max(1,cohort.length*2)),span=(cohort.length-1)*spacing;
    const formationOffset=(cohort.length-1-convoySlot)*spacing*Math.min(1,span?(1-progress)*length/span:1);
    const distance=Math.min(length,progress*length+formationOffset);
    return [{id:army.id,name:army.name,owner:army.owner,status:army.status,commander:army.commander??null,strength:army.strength,
      from:army.from,to:army.to,departed:army.departed,arrives:army.arrives,marching:true,retreating:army.status==='retreating',
      route:road.id??`${army.from}:${army.to}`,roadName:road.name??'the campaign road',road:{...road,length},distance,progress,
      convoySlot,convoySize:cohort.length,formationOffset,
      location:columnRoadPoint(distance,{...road,length}),count:Math.max(1,Math.min(8,Math.ceil(army.strength/8)))}];
  });
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
  return {id:army.id,owner:army.owner,name:army.name,commander:army.commander??null,strength:army.strength,marching,route:region,roadName:road.name,
    distance:progress*road.length,location:columnRoadPoint(progress*road.length,region),
    count:Math.min(8,Math.ceil(army.strength/8)),arrives:army.arrives};
}
export const ovesosColumn=(state,clock)=>regionalColumn(state,clock,'ovesos','east','caricas');
export const caricasColumn=(state,clock)=>regionalColumn(state,clock,'caricas','west','nethereum');
export function campaignColumn(state,clock){
  const columns=[caricasColumn(state,clock),ovesosColumn(state,clock)].filter(Boolean);
  return columns.find(c=>c.marching)??columns[0]??null;
}
