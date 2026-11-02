import {foodRouteStatus} from '../../simulation/food.js';
import {foodNumber as n,foodPercent as pct} from '../lizeem/food-report.js';
import {farmCondition} from './conditions.js';

export function foodExplanations(scenario,state,id,known=()=>true){
  const r=state.regions[id],f=r.food,last=f.last,condition=farmCondition(scenario,state,id);
  const name=id=>known(id)?(id==='isareos'?'Minora':scenario.regions.find(r=>r.id===id)?.name??id):'an undiscovered region';
  const notes=[`${condition.label} farmland: ${pct(condition.output)} of normal output at present. This is a regional condition, not damage to individual houses or holdings.`];
  if(f.condition<1)notes.push(`Production condition is ${pct(f.condition)}. Restoring it requires an intervention; waiting alone does not repair it.`);
  if(condition.battle)notes.push('An active battle disrupts farming and closes food routes through this region.');
  if(f.unrest>0)notes.push(`Food unrest reduces output by ${pct(f.unrest*scenario.food.unrestProductionPenalty)}. Sustained full rations gradually restore stability.`);
  if(!last)return notes;
  const transfers=state.food.last?.transfers??[];
  for(const t of transfers.filter(t=>t.from===id||t.to===id)){
    const purpose=t.kind==='friendly-supply'?'friendly relief':t.kind==='recovery-trade'?'reserve recovery trade':'trade';
    notes.push(`${t.to===id?'Received':'Sent'} ${n(t.amount)} food ${t.to===id?'from':'to'} ${name(t.to===id?t.from:t.to)} for ${purpose} on day ${state.day}.`);
  }
  const relief=transfers.filter(t=>t.from==='caricas'&&t.to==='nesdor').reduce((sum,t)=>sum+t.amount,0);
  const minora=transfers.filter(t=>t.from==='caricas'&&t.to==='isareos').reduce((sum,t)=>sum+t.amount,0);
  if(relief>0&&['caricas','nesdor','isareos'].includes(id))notes.push(`${name('caricas')} supplied ${n(relief)} food to ${name('nesdor')} before neutral trade. ${n(minora)} then went to ${name('isareos')}. Friendly relief has priority over neutral trade.`);
  for(const route of scenario.food.routes.filter(t=>t.regions.includes(id))){
    const other=route.regions.find(x=>x!==id),s=foodRouteStatus(scenario,state,id,other);
    const reason=s.blocked?'a developer-set blockade':s.battles.length?'fighting at an endpoint':s.hostile?'hostile control':null;
    if(reason)notes.push(`Route to ${name(other)} is closed now by ${reason}.`);
  }
  const change=last.production+last.imports-last.exports-last.consumed-last.provisioned;
  notes.push(`Stores ${Math.abs(change)<.05?'were unchanged':change>0?`grew by ${n(change)}`:`fell by ${n(-change)}`} during the last completed day, after meals, transfers and army provisioning.`);
  if(f.civilianRation<.99999)notes.push(`Civilians received ${pct(f.civilianRation)} of their ration. Unrest is rising; military readiness is ${pct(f.readiness)}.`);
  else if(f.unrest>0)notes.push('Full meals have returned, but stability and output have not fully recovered yet.');
  if(last.exports===0)notes.push('No food was exported last day. Local meals and the minimum reserve take priority over exports; an open route alone does not promise a delivery.');
  return notes;
}
