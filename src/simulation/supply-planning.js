import {foodPackingAmount,foodCombatFactor,foodRouteStatus} from './food.js';
import {stationed} from './forces.js';

const EPS=1e-8;
const clamp=n=>Math.max(0,Math.min(1,n));
const number=n=>Number(n.toFixed(1));

// A deliberately bounded estimate, not a second campaign simulation. Hold
// strength and territory fixed; assume no supplies from uncaptured land. Meals
// occur before arrival and before battle resolution, so both days count.
export function expeditionForecast(scenario,state,order,route){
  const rules=scenario.food,home=state.regions[order.from];
  const army=state.armies.find(a=>a.id===order.armyId),old=army?.strength??0;
  const carried=army?.supply.carried??0;
  const packed=foodPackingAmount(rules,home,order.strength,carried);
  const dailyNeed=order.strength*rules.rationPerPerson;
  const initialReadiness=((army?.supply.readiness??0)*old+home.food.readiness*order.levy)/order.strength;
  const travelDays=order.marchDays??route.days;
  const engagement=state.engagements.find(b=>b.region===order.to&&b.status==='active');
  const battleDays=order.kind==='attack'?(engagement&&engagement.endsOn>state.day+travelDays?
    engagement.endsOn-state.day-travelDays:scenario.rules.battleDays??0):0;
  const days=travelDays+battleDays,supplyDays=(carried+packed)/dailyNeed;
  let food=carried+packed,readiness=initialReadiness,shortDays=0;
  for(let day=0;day<days;day++){
    const ration=Math.min(1,food/dailyNeed);food=Math.max(0,food-dailyNeed);
    if(ration<1-EPS)shortDays++;
    readiness=clamp(readiness+(ration<1-EPS?-rules.readinessLoss*(1-ration):rules.readinessRecovery));
  }
  // Recent deliveries are evidence, not guaranteed future convoys. Remove flows
  // whose route/access is already gone; recompute local production after damage.
  const flows=(state.food.last?.transfers??[]).filter(t=>t.path.slice(1).every((id,i)=>
    foodRouteStatus(scenario,state,t.path[i],id).open)&&
    (t.kind!=='friendly-supply'||t.path.every(id=>state.regions[id].owner===state.regions[t.from].owner)));
  const imports=flows.filter(t=>t.to===order.from).reduce((n,t)=>n+t.amount,0);
  const exports=flows.filter(t=>t.from===order.from).reduce((n,t)=>n+t.amount,0);
  const localNeed=(home.food.population+home.garrison+stationed(state,order.from,order.owner).reduce((n,a)=>n+a.strength,0))*rules.rationPerPerson;
  const production=home.food.production*home.food.condition*(1-home.food.unrest*rules.unrestProductionPenalty);
  const net=production+imports-exports-localNeed;
  const capacityDays=rules.carriedDays;
  return {travelDays,battleDays,days,supplyDays,capacityDays,packed,departureFood:carried+packed,
    strength:order.strength,initialReadiness,readiness,shortDays,
    gapDays:Math.max(0,days-supplyDays),effectiveStrength:order.strength*foodCombatFactor({readiness}),
    canProvision:supplyDays<Math.min(capacityDays,days)-.5&&net>EPS,
    canRecover:initialReadiness<.8&&home.food.militaryRation>=1-EPS&&
      home.food.store-packed+net*scenario.rules.decisionEvery>=-EPS};
}

export function assessSupplyOrder(scenario,state,order,route){
  const forecast=expeditionForecast(scenario,state,order,route);
  const army=state.armies.find(a=>a.id===order.armyId);
  const previous=army?.supplyPlan;
  const holdSince=['provision','recover'].includes(previous?.action)?previous.holdSince:state.day;
  const limit=2*scenario.rules.decisionEvery;
  const action=forecast.canProvision?'provision':forecast.canRecover?'recover':order.kind;
  const wait=action!==order.kind&&state.day-holdSince<limit;
  const factor=foodCombatFactor({readiness:forecast.readiness})/foodCombatFactor({readiness:forecast.initialReadiness});
  // Keep risky attacks eligible. Forecast endurance changes ranking, rather
  // than imposing an impossible travel+battle packing requirement.
  const score=order.score*factor*(.7+.3*Math.min(1,forecast.supplyDays/forecast.days));
  return {...order,score,supplyPlan:{day:state.day,action:wait?action:order.kind,target:order.to,
    ...(wait?{holdSince,reconsiderOn:state.day+scenario.rules.decisionEvery,holdUntil:holdSince+limit}:{}),forecast},
    wait,waitExhausted:action!==order.kind&&!wait};
}

export function chooseSupplyOrder(scenario,state,options,travel){
  const ranked=options.map(order=>assessSupplyOrder(scenario,state,order,travel(order.from,order.to)))
    .sort((a,b)=>b.score-a.score||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  const best=ranked[0];if(!best)return null;
  // Prefer a nearly-as-useful immediate expedition over tying up the faction's
  // only order slot in provisioning. Never consume RNG while planning.
  const immediate=ranked.find(o=>!o.wait);
  return best.wait&&immediate&&immediate.score>=best.score*.9?immediate:best;
}

export function supplyOrderReason(order,targetName){
  const p=order.supplyPlan,f=p.forecast;
  const estimate=`${number(f.supplyDays)} days of food for ${f.travelDays} days marching${f.battleDays?` + ${f.battleDays} days fighting`:''}; estimated readiness ${Math.round(f.readiness*100)}% at ${f.battleDays?'battle end':'arrival'}.`;
  if(order.wait)return `${p.action==='provision'?'Provisioning':'Recovering readiness'} before an expedition to ${targetName}. ${estimate} Reconsider day ${p.reconsiderOn}; supply waits end by day ${p.holdUntil}.`;
  const risk=f.gapDays>EPS?` Accepting about ${number(f.gapDays)} days without full supplies.${f.days>f.capacityDays?' The expedition exceeds carrying capacity.':''}`:'';
  return `${order.kind==='attack'?'Advance on':'Reinforce'} ${targetName}. ${estimate}${risk}${order.waitExhausted?' The limited supply wait has ended.':''} Selected by strength, route length and forecast endurance.`;
}
