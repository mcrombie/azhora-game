// Presentation only: completed-day figures come from campaign.js's food ledger.
// No second allocator or economic clock lives in the interface.
export const foodNumber=value=>value.toLocaleString('en-US',{maximumFractionDigits:1});
export const foodPercent=value=>`${Math.round(value*100)}%`;
const routeKey=(a,b)=>[a,b].sort().join('|');
export const importSources=['nethereum','caricas'];
export const importsClosed=state=>importSources.every(id=>state.food.blockedRoutes.includes(routeKey(id,'isareos')));
export const importsOpen=state=>importSources.every(id=>!state.food.blockedRoutes.includes(routeKey(id,'isareos')));
export function foodTestActions(name){
  if(name==='cut-imports'||name==='restore-imports')return importSources.map(from=>({type:'route',from,to:'isareos',blocked:name==='cut-imports'}));
  if(name==='disrupt-nesdor'||name==='restore-nesdor')return [{type:'production',region:'nesdor',condition:name==='disrupt-nesdor'?.25:1}];
  if(name==='disrupt-nethereum'||name==='restore-nethereum')return [{type:'production',region:'nethereum',condition:name==='disrupt-nethereum'?.25:1}];
  throw Error('Unknown food test action.');
}
export function foodReport(scenario,state,baseline,id){
  const f=state.regions[id].food,last=f.last;
  const pending=state.commands.some(c=>c.type==='food-action'&&c.day===state.day);
  const demand=last?last.civilianDemand+last.militaryDemand:null;
  const balance=last?last.production+last.imports-last.exports-demand-(last.provisioned??0):null;
  const actual=last?last.production+last.imports-last.exports-last.consumed-(last.provisioned??0):null;
  const transfers=state.food.last?.transfers??[];
  const shipped=(from,to,list=transfers)=>list.filter(t=>t.from===from&&t.to===to).reduce((sum,t)=>sum+t.amount,0);
  const support=shipped('caricas','nesdor'),delivered=shipped('caricas','isareos');
  const ordinary=shipped('caricas','isareos',baseline.food.last?.transfers??[]),sameDay=state.day===baseline.day;
  const notes=[];
  if(pending)notes.push('Changes are set for the next day. The figures below still describe the last completed day.');
  if(!last)notes.push('Starting reserves. Advance one day to measure production, deliveries and meals. One food unit feeds ten people for a day.');
  if(last&&id==='isareos'){
    if(importsClosed(state))notes.push('Both import routes to Minora are closed. Its own farms and remaining stores must cover its needs.');
    else notes.push(`Deliveries to Minora: ${foodNumber(shipped('nethereum','isareos'))} from Nethereum and ${foodNumber(delivered)} from Caricas.`);
  }
  if(last&&support>0&&['isareos','caricas','nesdor'].includes(id)){
    notes.push(`Caricas supplied ${foodNumber(support)} food to Nesdor.`+(sameDay&&delivered<ordinary-.01?` Its deliveries to Minora fell to ${foodNumber(delivered)}, compared with ${foodNumber(ordinary)} in the untouched run.`:''));
  }
  if(last&&f.civilianRation<1-.00001)notes.push('Civilian rations are short. Unrest is rising and reducing production. Military shortages lower readiness; sustained shortages also cost troops.');
  else if(last&&f.unrest>0)notes.push('Full civilian rations have returned. Stability and production recover gradually.');
  let reserveNote='';
  if(last&&!pending){
    if(f.civilianRation<1-.00001)reserveNote='Stores cannot cover full rations.';
    else if(balance<-.01)reserveNote=`About ${foodNumber(f.store/-balance)} more days at this deficit. This estimate changes with supply and unrest.`;
    else reserveNote=actual>.01?'Stores are growing at the current balance.':'Current deliveries and production cover full rations.';
  }
  return {store:f.store,production:last?.production??null,demand,imports:last?.imports??null,exports:last?.exports??null,
    provisioned:last?.provisioned??0,balance,actual,stability:1-f.unrest,ration:f.civilianRation,readiness:f.readiness,garrison:state.regions[id].garrison,
    day:state.day,pending,notes,reserveNote};
}
