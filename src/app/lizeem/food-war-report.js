import {foodRouteStatus,foodCombatFactor} from '../../simulation/food.js';
import {armyMapRegion} from './army-map-state.js';
import {foodNumber as number,foodPercent as percent} from './food-report.js';

export function foodRouteReport(scenario,state,from,to){
  const status=foodRouteStatus(scenario,state,from,to),name=id=>scenario.regions.find(r=>r.id===id)?.name??id;
  const reasons=[];
  if(status.blocked)reasons.push('developer blockade');
  for(const b of status.battles)reasons.push(`battle in ${name(b.region)} until day ${b.endsOn}`);
  if(status.hostile)reasons.push('enemy border');
  return {...status,text:status.open?'Access open':`Closed: ${reasons.join('; ')||'no route'}`};
}
export function armyFoodReport(scenario,state,army){
  if(!army.supply)return null;
  const f=army.supply,need=army.strength*scenario.food.rationPerPerson;
  const region=armyMapRegion(state,army),battle=state.engagements.find(b=>b.status==='active'&&b.region===region&&army.status==='engaged');
  const local=army.region&&state.regions[army.region].owner===army.owner;
  return {carried:f.carried,days:need?f.carried/need:0,readiness:f.readiness,ration:f.ration,shortageDays:f.shortageDays,
    effectiveStrength:army.strength*foodCombatFactor(f),lastDay:f.last?.day??null,
    source:army.strength<=0?'Army no longer active.':local?'Local stores supply meals; carried food covers any shortfall.':'Away from friendly stores; meals come from carried food.',
    battle:battle?{region:battle.region,endsOn:battle.endsOn}:null};
}
export function armyFoodMarkup(scenario,state,army){
  const f=armyFoodReport(scenario,state,army);if(!f)return '';
  const p=army.supplyPlan,estimate=p?.forecast;
  const planning=estimate?`<h3>Last planning estimate · day ${p.day}</h3><dl><dt>Expedition</dt><dd>${estimate.travelDays} days marching + ${estimate.battleDays} fighting</dd><dt>Food if departing then</dt><dd>${number(estimate.supplyDays)} days</dd><dt>Expected shortfall</dt><dd>${number(estimate.gapDays)} days</dd><dt>Readiness at ${estimate.battleDays?'battle end':'arrival'}</dt><dd>${percent(estimate.readiness)}</dd></dl><p>Assumes unchanged strength and territory, with no food from enemy land. This is an estimate, not a promised outcome.</p>`:'';
  return `<h3>Food & readiness</h3><dl><dt>Carried food</dt><dd>${number(f.carried)}</dd><dt>Supply at current strength</dt><dd>${number(f.days)} days</dd><dt>Latest rations${f.lastDay===null?'':` · day ${f.lastDay}`}</dt><dd>${f.lastDay===null?'Not yet measured':percent(f.ration)}</dd><dt>Readiness</dt><dd>${percent(f.readiness)}</dd><dt>Food-adjusted strength</dt><dd>${number(f.effectiveStrength)}</dd><dt>Consecutive short days</dt><dd>${f.shortageDays}</dd></dl><p>${f.source} Days carried assume no resupply.</p>${planning}`;
}
