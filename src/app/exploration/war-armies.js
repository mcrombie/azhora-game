import {presentFaction} from './league-settlement.js';
import {isAlive,isMoving} from '../../simulation/forces.js';

// Once a represented force reaches the authored road, every navigation view
// uses that road position. Other armies retain explicitly labelled estimates.
export function withColumnPosition(armies,column,known,worldToAtlas){
  if(!column||!known(column.location))return armies;
  return armies.map(a=>a.id!==column.id?a:{...a,...worldToAtlas(column.location.x,column.location.z),route:null,physical:true,
    detail:`${a.name} on ${column.roadName??'the Ovesos north road'}. ${column.strength} strength. ${column.marching?`Expected day ${column.arrives}.`:'At the battle approach.'}`});
}

// Read-only atlas projection. These are strategic estimates, not road
// positions of physical soldiers. Never expose an unknown endpoint or route.
export function worldWarArmies(state,scenario,known=()=>true,clock=null){
  const region=id=>scenario.regions.find(r=>r.id===id);
  const fraction=clock?clock.fraction/clock.secondsPerDay:.5;
  return state.armies.filter(isAlive).flatMap(a=>{
    const moving=isMoving(a),from=region(moving?a.from:(a.region??a.to)),to=region(moving?a.to:(a.region??a.to));
    const t=moving?Math.max(0,Math.min(1,(state.day-a.departed+fraction)/(a.arrives-a.departed))):0;
    const point={x:from.position.x+(to.position.x-from.position.x)*t,y:from.position.y+(to.position.y-from.position.y)*t};
    if(!known(point))return [];
    const faction=presentFaction(scenario.factions.find(f=>f.id===a.owner),state),fromKnown=known(from.position),toKnown=known(to.position);
    const routeKnown=moving&&fromKnown&&toKnown&&Array.from({length:65},(_,i)=>i/64).every(p=>known({x:from.position.x+(to.position.x-from.position.x)*p,y:from.position.y+(to.position.y-from.position.y)*p}));
    const days=moving?Math.max(0,a.arrives-state.day):null;
    const detail=moving?`${a.status==='retreating'?'Retreating':'Marching'} from ${fromKnown?from.name:'uncharted territory'} to ${toKnown?to.name:'an unknown destination'}. ${toKnown?`Expected day ${a.arrives} (${days} ${days===1?'day':'days'} away).`:'Arrival unknown.'}`:
      `${a.status==='recovering'?`Regrouping until day ${a.readyOn}`:a.status==='engaged'?'In battle':'Stationed'} in ${toKnown?to.name:'charted territory'}.`;
    const order=state.events.findLast(e=>['march','retreat'].includes(e.type)&&e.army.id===a.id&&e.army.departed===a.departed);
    return [{id:a.id,name:state.winner?a.name.replace(/^(West|East) Lizeem/,'Lizeemi League'):a.name,faction:faction.short,color:faction.color,strength:a.strength,status:a.status,...point,detail,arrives:moving&&toKnown?a.arrives:null,
      route:routeKnown?{from:{...from.position},to:{...to.position}}:null,
      report:moving&&order?{id:order.id,hero:false,armyId:a.id,title:`${faction.short} ${a.status==='retreating'?'retreating': 'on the march'}`,
        detail:`${a.name}: ${a.strength} strength. ${detail} Open the map to inspect the army. Routes show daily estimates, not roads.`}:null}];
  });
}
