import {isAlive,isMoving} from './forces.js';

const EPS=1e-8;
const clamp=n=>Math.max(0,Math.min(1,n));
const sum=values=>values.reduce((a,b)=>a+b,0);
const key=(a,b)=>[a,b].sort().join('|');
export const RATION_POLICIES=['shared-hardship','civilian-first','military-first'];
const finite=(n,min=0,max=Infinity)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;

// Read-only projection shared with planning. A forecast must never conjure food
// or reserve it ahead of the authoritative campaign order.
export function foodPackingAmount(rules,home,strength,carried){
  return Math.min(Math.max(0,strength*rules.rationPerPerson*rules.carriedDays-carried),
    Math.max(0,home.food.store-home.food.population*rules.rationPerPerson));
}

// Shared by daily transfers and read-only map reports. Open access does not
// promise a delivery: reserves, trade contracts and daily throughput still apply.
export function foodRouteStatus(scenario,state,from,to){
  const exists=!!scenario.food?.routes.some(r=>key(...r.regions)===key(from,to));
  const blocked=state.food?.blockedRoutes.includes(key(from,to))??false;
  const battles=state.engagements.filter(b=>b.status==='active'&&(b.region===from||b.region===to)).map(b=>({region:b.region,endsOn:b.endsOn}));
  const a=state.regions[from]?.owner,b=state.regions[to]?.owner;
  const hostile=a!==b&&scenario.wars.some(w=>w.includes(a)&&w.includes(b));
  return {open:exists&&!blocked&&!battles.length&&!hostile,exists,blocked,battles,hostile};
}

// This helper owns no clock, RNG, renderer, scenario imports or legacy farm data.
// campaign.js calls it once per day and records every external change for replay.
export function createFoodSystem(scenario,state,emit){
  if(scenario.food===undefined)return null;
  const rules=scenario.food,definitions=new Map(scenario.regions.map(r=>[r.id,r]));
  const factions=new Set(scenario.factions.map(f=>f.id));
  const fail=()=>{throw Error('Invalid food scenario.');};
  if(!rules||!finite(rules.rationPerPerson,EPS)||!finite(rules.reserveDays)||!finite(rules.carriedDays)||
    !Number.isInteger(rules.shortageGraceDays)||rules.shortageGraceDays<0)fail();
  for(const name of ['attritionRate','readinessLoss','readinessRecovery','unrestRise','unrestRecovery',
    'unrestProductionPenalty','unrestRecruitmentPenalty','battleProductionFactor'])if(!finite(rules[name],0,1))fail();
  if(!Array.isArray(rules.routes)||!Array.isArray(rules.trades))fail();
  const routes=new Map();
  for(const route of rules.routes){
    const ids=route.regions;
    if(!Array.isArray(ids)||ids.length!==2||!definitions.get(ids[0])?.neighbors.includes(ids[1])||
      routes.has(key(...ids))||!finite(route.capacity,EPS))fail();
    routes.set(key(...ids),route);
  }
  for(const [id,value] of Object.entries(rules.reserveOverrides??{}))if(!definitions.has(id)||!finite(value))fail();
  const tradeKeys=new Set();
  for(const trade of rules.trades){
    const id=key(trade.from,trade.to);
    if(!routes.has(id)||!finite(trade.amount,EPS)||tradeKeys.has(id))fail();
    tradeKeys.add(id);
  }
  for(const r of scenario.regions){
    const f=r.food;
    if(!f||!finite(f.population)||!finite(f.production)||!finite(f.startingStore))fail();
    state.regions[r.id].food={...f,condition:1,unrest:0,civilianRation:1,militaryRation:1,
      store:f.startingStore,readiness:1,shortageDays:0,recruitCredit:0,last:null};
  }
  state.food={policies:Object.fromEntries([...factions].map(id=>[id,'shared-hardship'])),blockedRoutes:[],last:null};
  const fighting=id=>state.engagements.some(b=>b.region===id&&b.status==='active');
  const atWar=(a,b)=>a!==b&&scenario.wars.some(w=>w.includes(a)&&w.includes(b));
  const open=(a,b)=>foodRouteStatus(scenario,state,a,b).open;
  const total=()=>sum(Object.values(state.regions).map(r=>r.food.store))+sum(state.armies.map(a=>a.supply?.carried??0));
  const localArmies=id=>state.armies.filter(a=>isAlive(a)&&!isMoving(a)&&a.region===id&&a.owner===state.regions[id].owner);
  const dailyNeed=id=>(state.regions[id].food.population+state.regions[id].garrison+
    sum(localArmies(id).map(a=>a.strength)))*rules.rationPerPerson;
  const reserve=id=>rules.reserveOverrides?.[id]??dailyNeed(id)*rules.reserveDays;
  function armyInit(army,region){
    army.supply={carried:0,readiness:state.regions[region].food.readiness,shortageDays:0,ration:1};
  }
  function muster(army,region,oldStrength,levy){
    if(oldStrength+levy)army.supply.readiness=(army.supply.readiness*oldStrength+state.regions[region].food.readiness*levy)/(oldStrength+levy);
  }
  function pack(army,region){
    const home=state.regions[region];
    if(!isAlive(army)||home?.owner!==army.owner)return;
    // Provisioning is a domestic military expense, not an export. Keep tomorrow's
    // civilian ration; carried food is deducted from the same physical stock.
    const amount=foodPackingAmount(rules,home,army.strength,army.supply.carried);
    home.food.store-=amount;army.supply.carried+=amount;
    if(home.food.last)home.food.last.provisioned+=amount;
  }
  function military(health,strength,ration,lose,where){
    const short=ration<1-EPS;
    health.readiness=clamp(health.readiness+(short?-rules.readinessLoss*(1-ration):rules.readinessRecovery));
    health.shortageDays=short?health.shortageDays+1:0;
    if(short&&health.shortageDays>rules.shortageGraceDays&&strength){
      const lost=Math.min(strength,Math.ceil(strength*rules.attritionRate*(1-ration)));
      if(lost){lose(lost);emit('food-attrition',{...where,strength:lost,ration});}
    }
  }
  function tick(){
    const ledger={day:state.day,opening:total(),produced:0,consumed:0,lost:0,closing:0,transfers:[]};
    state.food.last=ledger;
    const budgets=new Map();
    for(const r of scenario.regions){
      const home=state.regions[r.id],f=home.food,armies=localArmies(r.id);
      const production=f.production*f.condition*(1-f.unrest*rules.unrestProductionPenalty)*(fighting(r.id)?rules.battleProductionFactor:1);
      const civilians=f.population*rules.rationPerPerson,militaryNeed=(home.garrison+sum(armies.map(a=>a.strength)))*rules.rationPerPerson;
      f.last={production,civilianDemand:civilians,militaryDemand:militaryNeed,imports:0,exports:0,consumed:0,provisioned:0};
      f.store+=production;ledger.produced+=production;
      budgets.set(r.id,{civilians,militaryNeed,need:civilians+militaryNeed,reserve:reserve(r.id),armies});
    }
    const capacity=new Map([...routes].map(([id,r])=>[id,r.capacity]));
    const spare=id=>Math.max(0,state.regions[id].food.store-budgets.get(id).need-budgets.get(id).reserve);
    function path(from,to){
      const owner=state.regions[from].owner,queue=[[from]],seen=new Set([from]);
      while(queue.length){
        const route=queue.shift(),last=route.at(-1);if(last===to)return route;
        for(const next of [...definitions.get(last).neighbors].sort())if(!seen.has(next)&&state.regions[next].owner===owner&&open(last,next)&&capacity.get(key(last,next))>EPS){
          seen.add(next);queue.push([...route,next]);
        }
      }
      return null;
    }
    function transfer(from,to,route,requested,kind){
      const edges=route.slice(1).map((id,i)=>key(route[i],id));
      const amount=Math.min(requested,spare(from),...edges.map(id=>capacity.get(id)));
      if(amount<EPS)return;
      state.regions[from].food.store-=amount;state.regions[to].food.store+=amount;
      state.regions[from].food.last.exports+=amount;state.regions[to].food.last.imports+=amount;
      for(const edge of edges)capacity.set(edge,capacity.get(edge)-amount);
      ledger.transfers.push({from,to,amount,path:route,kind});
    }
    // Address immediate hunger before replenishing buffers. All production is
    // already present, and every edge has one shared daily throughput budget.
    for(const buffer of [false,true]){
      const demand=id=>Math.max(0,budgets.get(id).need+(buffer?budgets.get(id).reserve:0)-state.regions[id].food.store);
      const needy=[...definitions.keys()].sort((a,b)=>demand(b)-demand(a)||a.localeCompare(b));
      for(const to of needy)for(const from of [...definitions.keys()].sort((a,b)=>spare(b)-spare(a)||a.localeCompare(b))){
        if(from===to||state.regions[from].owner!==state.regions[to].owner||demand(to)<EPS||spare(from)<EPS)continue;
        const route=path(from,to);if(route)transfer(from,to,route,demand(to),'friendly-supply');
      }
    }
    // Normal contracts first, then spare route capacity can rebuild the buyer's
    // reserve. Reopening trade must be able to recover from unrest-reduced crops.
    for(const recovery of [false,true])for(const {from,to,amount} of rules.trades){
      if(!open(from,to)||atWar(state.regions[from].owner,state.regions[to].owner))continue;
      const wanted=Math.max(0,budgets.get(to).need+budgets.get(to).reserve-state.regions[to].food.store);
      transfer(from,to,[from,to],Math.min(recovery?Infinity:amount,wanted),recovery?'recovery-trade':'trade');
    }
    const suppliedArmies=new Set();
    for(const [id,b] of budgets){
      const home=state.regions[id],f=home.food,policy=state.food.policies[home.owner];
      let civilianFood,militaryFood;
      if(policy==='civilian-first'){civilianFood=Math.min(f.store,b.civilians);militaryFood=Math.min(f.store-civilianFood,b.militaryNeed);}
      else if(policy==='military-first'){militaryFood=Math.min(f.store,b.militaryNeed);civilianFood=Math.min(f.store-militaryFood,b.civilians);}
      else {const ratio=b.need?Math.min(1,f.store/b.need):1;civilianFood=b.civilians*ratio;militaryFood=b.militaryNeed*ratio;}
      const consumed=civilianFood+militaryFood;
      f.store=Math.max(0,f.store-consumed);ledger.consumed+=consumed;f.last.consumed=consumed;
      const previous=f.civilianRation;
      f.civilianRation=b.civilians?civilianFood/b.civilians:1;f.militaryRation=b.militaryNeed?militaryFood/b.militaryNeed:1;
      f.unrest=clamp(f.unrest+(f.civilianRation<1-EPS?rules.unrestRise*(1-f.civilianRation):-rules.unrestRecovery));
      if((previous<1-EPS)!==(f.civilianRation<1-EPS))emit(f.civilianRation<1-EPS?'food-shortage':'food-restored',{region:id,ration:f.civilianRation});
      military(f,home.garrison,f.militaryRation,lost=>{home.garrison-=lost;},{region:id});
      for(const army of b.armies){
        suppliedArmies.add(army.id);feedArmy(army,f.militaryRation,ledger,true);
      }
    }
    for(const army of state.armies.filter(isAlive))if(!suppliedArmies.has(army.id))feedArmy(army,0,ledger);
    closeDay();
  }
  function feedArmy(army,localRation,ledger,regional=false){
    const need=army.strength*rules.rationPerPerson;
    const carried=Math.min(army.supply.carried,need*(1-localRation));
    army.supply.carried-=carried;ledger.consumed+=carried;
    army.supply.ration=need?Math.min(1,localRation+carried/need):1;
    army.supply.last={day:state.day,demand:need,regional,consumed:need*army.supply.ration};
    military(army.supply,army.strength,army.supply.ration,lost=>{army.strength-=lost;},{armyId:army.id});
  }
  function closeDay(){
    if(!state.food.last)return;
    for(const a of state.armies)if(!isAlive(a)&&a.supply.carried){state.food.last.lost+=a.supply.carried;a.supply.carried=0;}
    state.food.last.closing=total();
  }
  function recruits(id,amount){
    const f=state.regions[id].food;
    const factor=f.civilianRation*(1-f.unrest*rules.unrestRecruitmentPenalty);
    f.recruitCredit+=amount*factor;const whole=Math.floor(f.recruitCredit+EPS);f.recruitCredit-=whole;return whole;
  }
  function command(action){
    if(!action||typeof action!=='object'||Array.isArray(action))return {ok:false,reason:'Invalid food action.'};
    const allowed={production:['type','region','condition'],route:['type','from','to','blocked'],rationing:['type','faction','policy']}[action.type];
    if(!allowed||Object.keys(action).some(k=>!allowed.includes(k)))return {ok:false,reason:'Invalid food action.'};
    if(action.type==='production'){
      if(!definitions.has(action.region)||!finite(action.condition,0,1))return {ok:false,reason:'Choose a region and production condition between 0 and 1.'};
      state.regions[action.region].food.condition=action.condition;
    }else if(action.type==='route'){
      const id=key(action.from,action.to);
      if(!routes.has(id)||typeof action.blocked!=='boolean')return {ok:false,reason:'Choose an existing food route and a boolean blocked state.'};
      state.food.blockedRoutes=state.food.blockedRoutes.filter(r=>r!==id);
      if(action.blocked)state.food.blockedRoutes.push(id);state.food.blockedRoutes.sort();
    }else{
      if(!factions.has(action.faction)||!RATION_POLICIES.includes(action.policy))return {ok:false,reason:'Choose a faction and supported rationing policy.'};
      state.food.policies[action.faction]=action.policy;
    }
    return {ok:true};
  }
  return {tick,closeDay,armyInit,muster,pack,recruits,command};
}

export const foodCombatFactor=health=>health? .25+.75*health.readiness:1;
export function foodSummary(state){
  if(!state.food)return null;
  const regions=Object.entries(state.regions).map(([id,r])=>({id,owner:r.owner,store:r.food.store,
    production:r.food.last?.production??r.food.production*r.food.condition,
    demand:r.food.last?(r.food.last.civilianDemand+r.food.last.militaryDemand):null,
    imports:r.food.last?.imports??0,exports:r.food.last?.exports??0,
    civilianRation:r.food.civilianRation,stability:1-r.food.unrest,readiness:r.food.readiness}));
  const factions=Object.fromEntries(Object.keys(state.food.policies).map(id=>[id,{
    store:sum(regions.filter(r=>r.owner===id).map(r=>r.store)),
    carried:sum(state.armies.filter(a=>a.owner===id&&isAlive(a)).map(a=>a.supply.carried)),
    production:sum(regions.filter(r=>r.owner===id).map(r=>r.production)),
    demand:sum(regions.filter(r=>r.owner===id).map(r=>r.demand??0))+
      sum(state.armies.filter(a=>a.owner===id&&a.supply.last?.day===state.day&&!a.supply.last.regional).map(a=>a.supply.last.demand)),
  }]));
  return {day:state.day,regions,factions,ledger:state.food.last};
}
