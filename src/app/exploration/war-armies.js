import {isAlive,isMoving} from '../../simulation/forces.js';

// Read-only atlas projection. These are daily strategic estimates, not road
// positions of physical soldiers. Never expose an unknown endpoint or route.
export function worldWarArmies(state,scenario,known=()=>true){
  const region=id=>scenario.regions.find(r=>r.id===id);
  return state.armies.filter(isAlive).flatMap(a=>{
    const moving=isMoving(a),from=region(moving?a.from:(a.region??a.to)),to=region(moving?a.to:(a.region??a.to));
    const t=moving?Math.max(0,Math.min(1,(state.day-a.departed+.5)/(a.arrives-a.departed))):0;
    const point={x:from.position.x+(to.position.x-from.position.x)*t,y:from.position.y+(to.position.y-from.position.y)*t};
    if(!known(point))return [];
    const faction=scenario.factions.find(f=>f.id===a.owner),fromKnown=known(from.position),toKnown=known(to.position);
    const routeKnown=moving&&fromKnown&&toKnown&&Array.from({length:65},(_,i)=>i/64).every(p=>known({x:from.position.x+(to.position.x-from.position.x)*p,y:from.position.y+(to.position.y-from.position.y)*p}));
    const days=moving?Math.max(0,a.arrives-state.day):null;
    const detail=moving?`${a.status==='retreating'?'Retreating':'Marching'} from ${fromKnown?from.name:'uncharted territory'} to ${toKnown?to.name:'an unknown destination'}. ${toKnown?`Expected day ${a.arrives} (${days} ${days===1?'day':'days'} away).`:'Arrival unknown.'}`:
      `${a.status==='recovering'?`Regrouping until day ${a.readyOn}`:a.status==='engaged'?'In battle':'Stationed'} in ${toKnown?to.name:'charted territory'}.`;
    const order=state.events.findLast(e=>['march','retreat'].includes(e.type)&&e.army.id===a.id&&e.army.departed===a.departed);
    return [{id:a.id,name:a.name,faction:faction.short,color:faction.color,strength:a.strength,status:a.status,...point,detail,arrives:moving&&toKnown?a.arrives:null,
      route:routeKnown?{from:{...from.position},to:{...to.position}}:null,
      report:moving&&order?{id:order.id,hero:false,armyId:a.id,title:`${faction.short} ${a.status==='retreating'?'retreating': 'on the march'}`,
        detail:`${a.name}: ${a.strength} strength. ${detail} Open the map to inspect the army. Routes show daily estimates, not roads.`}:null}];
  });
}
