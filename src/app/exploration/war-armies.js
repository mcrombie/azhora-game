import {armyMarchProgress} from '../../simulation/roadside-interception.js';
import {elapsedTimeLabel,durationLabel} from '../../experiments/day-night/opening-time-label.js';
import {presentFaction} from './league-settlement.js';
import {isAlive,isMoving} from '../../simulation/forces.js';

// Every prepared moving column supplies its physical point to all navigation
// views. Undiscovered columns remain hidden; pending routes retain estimates.
export function withColumnPosition(armies,columns,known,worldToAtlas){
  const physical=new Map((Array.isArray(columns)?columns:columns?[columns]:[]).filter(c=>known(c.location)).map(c=>[c.id,c]));
  if(!physical.size)return armies;
  return armies.map(a=>{
    const column=physical.get(a.id);if(!column)return a;
    return {...a,...worldToAtlas(column.location.x,column.location.z),route:null,physical:!column.pendingRoute,pendingRoute:!!column.pendingRoute,
      detail:`${a.name}${column.pendingRoute?`: last known at the ${column.roadName??'assembly point'}`:` ${column.retreating?'retreating along':'on'} ${column.roadName??'the campaign road'}`}. ${column.strength} strength. ${a.arrives===null?'Destination and arrival unknown.':`Expected day ${column.arrives}.`}${a.commander?` Commander: ${a.commander.name} / ${a.commander.status}.`:''}`};
  });
}

// Read-only atlas projection. These are strategic estimates, not road
// positions of physical soldiers. Never expose an unknown endpoint or route.
export function worldWarArmies(state,scenario,known=()=>true,clock=null,columns=[]){
  const region=id=>scenario.regions.find(r=>r.id===id);
  const fraction=clock?clock.fraction/clock.secondsPerDay:.5;
  return state.armies.filter(isAlive).flatMap(a=>{
    const moving=isMoving(a),from=region(moving?a.from:(a.region??a.to)),to=region(moving?a.to:(a.region??a.to));
    const t=moving?armyMarchProgress(a,state.day+fraction):0;
    const physical=columns.find(c=>c.id===a.id);
    const point=physical?.atlas??{x:from.position.x+(to.position.x-from.position.x)*t,y:from.position.y+(to.position.y-from.position.y)*t};
    if(!known(point))return [];
    const faction=presentFaction(scenario.factions.find(f=>f.id===a.owner),state),fromKnown=known(from.position),toKnown=known(to.position);
    const routeKnown=moving&&fromKnown&&toKnown&&Array.from({length:65},(_,i)=>i/64).every(p=>known({x:from.position.x+(to.position.x-from.position.x)*p,y:from.position.y+(to.position.y-from.position.y)*p}));
    const days=moving?Math.max(0,a.arrives-state.day):null;
    const arrival=clock?.sharedOpening?`Expected at ${elapsedTimeLabel(a.arrives*60)} (${durationLabel(a.arrives*60-clock.elapsedSeconds)} away).`:`Expected day ${a.arrives} (${days} ${days===1?'day':'days'} away).`;
    const movement=moving?`${a.status==='retreating'?'Retreating':'Marching'} from ${fromKnown?from.name:'uncharted territory'} to ${toKnown?to.name:'an unknown destination'}. ${toKnown?arrival:'Arrival unknown.'}`:
      `${a.status==='recovering'?`Regrouping until day ${a.readyOn}`:a.status==='engaged'?'In battle':'Stationed'} in ${toKnown?to.name:'charted territory'}.`;
    const detail=movement+(a.commander?` Commander: ${a.commander.name} / ${a.commander.status}${a.commander.status==='routed'?'; regrouping with this army':''}.`:'');
    const order=state.events.findLast(e=>['march','retreat'].includes(e.type)&&e.army.id===a.id&&e.army.departed===a.departed);
    return [{id:a.id,name:state.winner?a.name.replace(/^(West|East) Lizeem/,'Lizeemi League'):a.name,faction:faction.short,color:faction.color,strength:a.strength,status:a.status,...(a.commander?{commander:{...a.commander}}:{}),...point,detail,arrives:moving&&toKnown?a.arrives:null,
      route:!physical&&routeKnown?{from:{...from.position},to:{...to.position}}:null,
      report:moving&&order?{id:order.id,hero:false,armyId:a.id,title:`${faction.short} ${a.status==='retreating'?'retreating': 'on the march'}`,
        detail:`${a.name}: ${a.strength} strength. ${detail} Open the map to inspect the army. ${physical?.pendingRoute?'Its last known assembly point is marked.':physical?'Follow its standard to meet the physical column.':'Routes show daily estimates, not roads.'}`}:null}];
  });
}
