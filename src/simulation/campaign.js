// One step is one campaign day. State and seeded randomness stay independent of UI time.
import {availableBattleStage,rallyGuardCount,removeRallyGuards,continueInterception} from './battle-stages.js';
import {createRoutes} from './routes.js';
import {offensiveRecoveryUntil} from './offensive-recovery.js';
import {isAlive,isMoving,stationed,defendingStrength,inflictLosses} from './forces.js';
import {reserveReinforcements,interceptReinforcements} from './reinforcements.js';
const copy=value=>JSON.parse(JSON.stringify(value));
export function normalizeSeed(value){
  if(typeof value!=='number'&&(typeof value!=='string'||!/^\d+$/.test(value.trim())))throw new Error('Enter a whole-number seed.');
  const n=Number(value);
  if(!Number.isInteger(n)||n<0||n>0xffffffff)throw new Error('Seed must be a whole number from 0 to 4294967295.');
  return n>>>0;
}

export function createCampaign(definition,seed=definition.defaultSeed){
  const scenario=copy(definition),regions=new Map(scenario.regions.map(r=>[r.id,r]));
  const factionIds=new Set(scenario.factions.map(f=>f.id));
  if(regions.size!==scenario.regions.length||!regions.size)throw Error('Scenario needs unique regions.');
  if(factionIds.size!==scenario.factions.length)throw Error('Scenario needs unique factions.');
  for(const r of regions.values()){
    if(!factionIds.has(r.owner)||!Number.isInteger(r.garrison)||r.garrison<0||!Number.isInteger(r.recruits)||r.recruits<0)throw Error('Invalid region: '+r.id);
    if(new Set(r.neighbors).size!==r.neighbors.length||r.neighbors.includes(r.id))throw Error('Invalid region links.');
    for(const n of r.neighbors)if(!regions.get(n)?.neighbors.includes(r.id))throw Error('Region links must be symmetric: '+r.id);
  }
  if(scenario.wars.length!==1||scenario.wars[0].length!==2||new Set(scenario.wars[0]).size!==2||scenario.wars[0].some(f=>!factionIds.has(f)))throw Error('This first core supports one two-sided war.');
  seed=normalizeSeed(seed);const rules=scenario.rules;
  for(const key of ['garrisonCap','decisionEvery','armyRecoveryDays','maxRaisedArmies'])if(!Number.isInteger(rules[key])||rules[key]<1)throw Error('Invalid rule: '+key);
  for(const key of ['reserve','recoveryDays'])if(!Number.isInteger(rules[key])||rules[key]<0)throw Error('Invalid rule: '+key);
  if(!Number.isFinite(rules.defenseBonus)||rules.defenseBonus<=0)throw Error('Invalid defense bonus.');
  if(rules.assaultSupportGap!==undefined&&(!Number.isInteger(rules.assaultSupportGap)||rules.assaultSupportGap<0||rules.assaultSupportGap>3))throw Error('Invalid assault support gap.');
  if(rules.reattackDelayDays!==undefined&&(!Number.isInteger(rules.reattackDelayDays)||rules.reattackDelayDays<0))throw Error('Invalid reattack delay.');
  const battleDays=rules.battleDays??0;
  if(!Number.isInteger(battleDays)||battleDays<0)throw Error('Invalid battle duration.');
  for(const r of regions.values())if(r.interceptionStrength!==undefined&&(!battleDays||!Number.isInteger(r.interceptionStrength)||r.interceptionStrength<1))throw Error('Invalid interception strength.');
  if(battleDays)for(const r of regions.values())if(scenario.wars[0].includes(r.owner)&&
    (!Number.isFinite(r.battlefield?.x)||!Number.isFinite(r.battlefield?.z)))throw Error('Battlefield location missing: '+r.id);
  for(const r of regions.values())if(r.rallyAssault!==undefined&&(r.rallyAssault!==true||!r.interceptionStrength))throw Error('Rally assault requires an interception.');
  const entryRadius=scenario.battlefieldEntryRadius??null;
  if(entryRadius!==null&&(!battleDays||!Number.isFinite(entryRadius)||entryRadius<=0))throw Error('Invalid battlefield entry radius.');
  for(const order of scenario.openingOrders??[])if(!scenario.wars[0].includes(order.faction)||regions.get(order.from)?.owner!==order.faction||!regions.get(order.from)?.neighbors.includes(order.to)||(regions.get(order.to)?.owner===order.faction||!scenario.wars[0].includes(regions.get(order.to)?.owner))||!Number.isInteger(order.marchDays)||order.marchDays<1)throw Error('Invalid opening army order.');
  if(new Set((scenario.openingOrders??[]).map(o=>o.faction)).size!==(scenario.openingOrders??[]).length)throw Error('Only one opening order per faction is allowed.');
  const travel=createRoutes(scenario);
  const state={version:3,scenario:scenario.id,seed,rng:seed,day:0,winner:null,nextArmy:1,nextEvent:1,
    hero:{...scenario.hero,journey:null,watching:false,readyOn:0},pending:null,arrivals:[],engagements:[],
    regions:Object.fromEntries(scenario.regions.map(r=>[r.id,{owner:r.owner,garrison:r.garrison,recovery:0,lastBattle:null}])),armies:[],events:[],commands:[]};
  const atWar=(a,b)=>scenario.wars.some(w=>w.includes(a)&&w.includes(b)&&a!==b);
  const factionName=id=>scenario.factions.find(f=>f.id===id).short;
  function random(){
    state.rng=(state.rng+0x6d2b79f5)>>>0;let t=state.rng;
    t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  }
  function emit(type,fields={}){const event={...fields,id:state.nextEvent++,day:state.day,type};state.events.push(event);return event;}
  const activeBattle=region=>state.engagements.find(e=>e.region===region&&e.status==='active');
  function raise(owner,region,strength,guard=false){
    const id=state.nextArmy++,army={id,name:`${factionName(owner)} ${guard?regions.get(region).name+' Guard':'Army'} ${id}`,owner,origin:region,
      strength,region,from:region,to:region,status:'ready',kind:'hold',departed:null,arrives:null,readyOn:null,route:null,reason:'Holding friendly territory.',battles:0};
    state.armies.push(army);return army;
  }
  function destroy(army,reason){Object.assign(army,{strength:0,status:'destroyed',region:null,arrives:null,readyOn:null,reason});}
  function settle(army,region,recover=false){
    Object.assign(army,{region,status:recover?'recovering':'ready',arrives:null,readyOn:recover?state.day+rules.armyRecoveryDays:null});
    army.reason=recover?'Regrouping after battle. Cannot march until recovery ends.':'Holding friendly territory; available for another order.';
  }
  function march(army,from,to,kind,reason,marchDays=null){
    const route=travel(from,to);if(marchDays!==null)Object.assign(route,{days:marchDays,distanceDays:marchDays,terrainDays:0,crossingDays:0,authoredOpening:true,name:'Prepared opening approach to '+regions.get(to).name});Object.assign(army,{from,to,region:null,kind,status:kind==='retreat'?'retreating':'marching',departed:state.day,arrives:state.day+route.days,readyOn:null,route,reason});
    emit(kind==='retreat'?'retreat':'march',{army:copy(army),reason});
  }
  function retreat(army,from,preferred=null){
    if(!army.strength){destroy(army,'Lost in battle.');return null;}
    const destinations=regions.get(from).neighbors.filter(id=>state.regions[id].owner===army.owner)
      .sort((a,b)=>Number(b===preferred)-Number(a===preferred)||travel(from,a).days-travel(from,b).days||a.localeCompare(b));
    const to=destinations[0];
    if(!to){const strength=army.strength;emit('surrender',{armyId:army.id,name:army.name,faction:army.owner,region:from,strength,reason:'No adjacent friendly territory remains; neutral borders are closed.'});destroy(army,'Surrendered: no friendly retreat route.');return null;}
    march(army,from,to,'retreat','Withdrawing to friendly territory to regroup.');return {armyId:army.id,name:army.name,strength:army.strength,from,to,arrives:army.arrives};
  }
  function victory(){
    for(const faction of scenario.wars[0]){
      const enemy=scenario.wars[0].find(id=>id!==faction);
      if(!Object.values(state.regions).some(r=>r.owner===enemy)&&!state.armies.some(a=>a.owner===enemy&&isAlive(a))){state.winner=faction;emit('victory',{faction});return;}
    }
  }
  function battle(army,hero=null,engagement=null){
    const attackingArmies=engagement?engagement.attackingIds.map(id=>state.armies.find(a=>a.id===id)):[army];
    const region=army.to,attackOrigin=army.from,target=state.regions[region],defender=target.owner,defenders=defendingStrength(state,region),attackers=attackingArmies.reduce((n,a)=>n+a.strength,0);
    const defendingArmies=stationed(state,region,defender),defendingIds=defendingArmies.map(a=>a.id),garrison={strength:target.garrison};
    const baseChance=attackers/(attackers+defenders*rules.defenseBonus);
    const blocked=hero?.objective?.blocked??0;
    const withoutAttackers=attackers+(hero?.objective?.targetFaction===army.owner?blocked:0),withoutDefenders=defenders+(hero?.objective?.targetFaction===defender?blocked:0);
    const unassistedChance=withoutAttackers/(withoutAttackers+withoutDefenders*rules.defenseBonus);
    const shift=hero?.objective?0:hero?.outcome==='success'?.20:hero?.outcome==='defeat'?-.10:0;
    const delta=shift*(hero?.faction===army.owner?1:-1);
    // Caps cannot reverse the benefit when an overwhelming force already has
    // odds outside the 5-95% band. An empty defense is still captured normally.
    const chance=delta>0?Math.max(baseChance,Math.min(.95,baseChance+delta)):delta<0?Math.min(baseChance,Math.max(.05,baseChance+delta)):baseChance;
    const roll=random(),decisive=engagement?.rally?.outcome==='success',captured=decisive?engagement.rally.faction===army.owner:defenders===0||roll<chance;
    const attackLoss=captured?Math.min(Math.max(0,attackers-1),Math.ceil(defenders*(.25+random()*.25))):Math.ceil(attackers*(.4+random()*.2));
    const defenseLoss=captured?Math.ceil(defenders*(.45+random()*.2)):Math.min(Math.max(0,defenders-1),Math.ceil(attackers*(.3+random()*.3)));
    inflictLosses(attackingArmies,attackLoss);for(const a of attackingArmies)a.battles++;
    inflictLosses([garrison,...defendingArmies],defenseLoss);target.garrison=garrison.strength;
    for(const a of defendingArmies)a.battles++;
    const retreats=[],surrenderStart=state.events.length;
    if(captured){
      target.owner=army.owner;target.garrison=0;target.recovery=rules.recoveryDays;
      for(const a of defendingArmies){const record=retreat(a,region);if(record)retreats.push(record);}
      if(garrison.strength){const guard=raise(defender,region,garrison.strength,true);guard.battles=1;defendingIds.push(guard.id);const record=retreat(guard,region);if(record)retreats.push(record);}
      for(const a of attackingArmies)if(a.strength)settle(a,region,true);else destroy(a,'Lost in battle.');
    }else{
      for(const a of defendingArmies)if(a.strength)settle(a,region,true);else destroy(a,'Lost defending '+regions.get(region).name+'.');
      for(const a of attackingArmies){const record=retreat(a,region,a.from);if(record)retreats.push(record);}
    }
    target.lastBattle=state.day;
    const surrendered=state.events.slice(surrenderStart).filter(e=>e.type==='surrender').map(e=>({armyId:e.armyId,strength:e.strength,faction:e.faction}));
    return emit('battle',{region,from:attackOrigin,armyId:army.id,armyName:army.name,attackingIds:attackingArmies.map(a=>a.id),engagementId:engagement?.id??null,defendingIds,attacker:army.owner,defender,attackers,defenders,chance,roll,captured,
      attackLoss,defenseLoss,retreats,surrendered,...(rules.reattackDelayDays?{reattackOn:state.day+rules.reattackDelayDays}:{}),survivors:defendingStrength(state,region),defenseBonus:rules.defenseBonus,baseChance,unassistedChance,hero,...(decisive?{resolution:'rally-rout',rally:copy(engagement.rally)}:{})});
  }
  function arrive(army){
    const region=army.to,target=state.regions[region];
    if(target.owner===army.owner){const recovering=army.kind==='retreat';settle(army,region,recovering);if(activeBattle(region)){army.status='engaged';army.readyOn=null;army.reason='Defending the ongoing battle.';}emit('arrive',{army:copy(army),region});return;}
    if(army.kind==='retreat'){retreat(army,region);return;}
    if(!atWar(army.owner,target.owner))throw Error('An army reached neutral territory.');
    if(battleDays){
      let engagement=activeBattle(region);const starting=!engagement;
      if(!engagement){
        engagement={id:`battle-${state.engagements.length+1}`,region,attacker:army.owner,defender:target.owner,attackingIds:[],started:state.day,endsOn:state.day+battleDays,status:'active',location:copy(regions.get(region).battlefield),heroResult:null};
        if(regions.get(region).rallyAssault)engagement.rally={status:'locked'};
        if(entryRadius!==null)Object.assign(engagement,{entryRadius,participation:{faction:null,intercept:{status:'available',totalGuards:3,stopped:0,escaped:0,blocked:0}}});
        state.engagements.push(engagement);
        for(const a of stationed(state,region,target.owner)){a.status='engaged';a.readyOn=null;a.reason='Defending the ongoing battle.';}
      }else emit('battle-reinforced',{battleId:engagement.id,armyId:army.id,strength:army.strength,region});
      engagement.attackingIds.push(army.id);army.status='engaged';army.region=null;army.arrives=null;army.reason=`Fighting in ${regions.get(region).name} until day ${engagement.endsOn}.`;
      if(starting&&regions.get(region).interceptionStrength)engagement.reinforcements=reserveReinforcements(state,engagement,regions.get(region).interceptionStrength);
      if(starting)emit('battle-start',{engagement:copy(engagement)});return;
    }
    if(state.hero.watching&&!state.hero.journey&&state.hero.region===region&&state.hero.readyOn<=state.day){
      state.pending={id:`${state.day}:${army.id}`,day:state.day,region,armyId:army.id,attacker:army.owner,defender:target.owner,attackers:army.strength,defenders:defendingStrength(state,region)};
      emit('encounter',state.pending);return;
    }
    battle(army);
  }
  function available(region,faction){
    const home=state.regions[region];if(home.owner!==faction||home.recovery||activeBattle(region))return null;
    const local=stationed(state,region,faction),army=local.filter(a=>a.status==='ready').sort((a,b)=>b.strength-a.strength||a.id-b.id)[0];
    if(!army&&(local.length||state.armies.filter(a=>isAlive(a)&&a.owner===faction).length>=rules.maxRaisedArmies))return null;
    const levy=Math.max(0,Math.floor((home.garrison-rules.reserve)*.8)),strength=(army?.strength??0)+levy;
    return strength>=20?{owner:faction,from:region,armyId:army?.id??null,levy,strength}:null;
  }
  function plan(faction){
    const opening=state.day===1?scenario.openingOrders?.find(o=>o.faction===faction):null;
    if(opening){const ready=available(opening.from,faction);if(ready)return {...ready,to:opening.to,kind:'attack',marchDays:opening.marchDays,reason:'A prepared vanguard advances on '+regions.get(opening.to).name+'; the opening march reaches the frontier in '+opening.marchDays+' days.'};}
    const options=[];
    for(const r of scenario.regions){
      const ready=available(r.id,faction);if(!ready)continue;
      for(const to of r.neighbors){
        if(!atWar(faction,state.regions[to].owner)||state.day<offensiveRecoveryUntil(state,to,faction))continue;
        const defenders=defendingStrength(state,to),inbound=state.armies.filter(a=>(isMoving(a)||a.status==='engaged')&&a.to===to&&a.owner===faction).reduce((n,a)=>n+a.strength,0);
        const ratio=ready.strength/(defenders*rules.defenseBonus+inbound+1),route=travel(r.id,to);
        if(ratio>=.72)options.push({...ready,to,kind:'attack',score:ratio/(1+route.days*.12),reason:`Exposed frontier: ${ready.strength} attacking vs ${defenders} defending; ${route.days}-day route. Shorter routes rank higher.`});
      }
    }
    options.sort((a,b)=>b.score-a.score||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));if(options.length)return options[0];
    for(const r of scenario.regions){
      const ready=available(r.id,faction);if(!ready||ready.strength<30||r.neighbors.some(n=>atWar(faction,state.regions[n].owner)))continue;
      const to=r.neighbors.filter(n=>state.regions[n].owner===faction&&regions.get(n).neighbors.some(id=>atWar(faction,state.regions[id].owner)))
        .sort((a,b)=>defendingStrength(state,a)-defendingStrength(state,b)||travel(r.id,a).days-travel(r.id,b).days||a.localeCompare(b))[0];
      if(to)return {...ready,to,kind:'transfer',reason:'Reinforce the weakest adjacent friendly frontier from the rear.'};
    }
    return null;
  }
  function step(days=1){
    if(!Number.isInteger(days)||days<1||days>10000)throw Error('Advance between 1 and 10000 whole days.');
    for(let i=0;i<days&&!state.winner&&!state.pending;i++){
      state.day++;
      if(state.hero.journey?.arrives<=state.day){state.hero.region=state.hero.journey.to;state.hero.journey=null;emit('hero-arrive',{region:state.hero.region});}
      for(const r of scenario.regions){const current=state.regions[r.id];if(activeBattle(r.id))continue;if(current.recovery){current.recovery--;continue;}if(current.garrison<rules.garrisonCap)current.garrison=Math.min(rules.garrisonCap,current.garrison+r.recruits);}
      for(const a of state.armies)if(a.status==='recovering'&&a.readyOn<=state.day){a.status='ready';a.readyOn=null;a.reason='Recovered and available for orders.';emit('recovered',{armyId:a.id,name:a.name,region:a.region});}
      for(const engagement of state.engagements.filter(e=>e.status==='active'&&e.endsOn<=state.day)){
        if(engagement.reinforcements)for(const squad of Object.values(engagement.reinforcements))if(['approaching','partially-intercepted'].includes(squad.status))squad.status='joined';
        const result=battle(state.armies.find(a=>a.id===engagement.attackingIds[0]),engagement.heroResult?.outcome==='withdraw'&&!engagement.heroResult.objective?.blocked?null:engagement.heroResult,engagement);
        Object.assign(engagement,{status:'resolved',resolvedOn:state.day,resultId:result.id,captured:result.captured});
      }
      const due=state.armies.filter(a=>isMoving(a)&&a.arrives<=state.day);
      for(let n=due.length-1;n>0;n--){const j=Math.floor(random()*(n+1));[due[n],due[j]]=[due[j],due[n]];}
      state.arrivals=due.map(a=>a.id);finishDay();
    }
    return snapshot();
  }
  // Preserve the remaining arrival order while a local encounter owns the clock.
  function finishDay(){
      while(state.arrivals.length&&!state.pending){const id=state.arrivals.shift(),army=state.armies.find(a=>a.id===id);if(isMoving(army)&&army.arrives<=state.day)arrive(army);}
      if(state.pending)return;
      victory();if(state.winner)return;
      if((state.day-1)%rules.decisionEvery===0){
        // Both factions plan before either order mutates the state.
        const orders=scenario.wars[0].map(plan).filter(Boolean);
        for(const order of orders){
          state.regions[order.from].garrison-=order.levy;
          const army=order.armyId?state.armies.find(a=>a.id===order.armyId):raise(order.owner,order.from,0);
          army.strength+=order.levy;march(army,order.from,order.to,order.kind,order.reason,order.marchDays??null);
        }
      }
  }
  function heroTravel(to){
    if(scenario.heroTracking==='world')return {ok:false,reason:'Hero travel is controlled by movement in the world.'};
    if(state.winner||state.pending||state.hero.journey)return {ok:false,reason:'Finish the current journey or encounter first.'};
    const from=state.hero.region;
    if(!regions.get(from).neighbors.includes(to))return {ok:false,reason:'Choose a neighboring region.'};
    const route=travel(from,to);state.hero.journey={from,to,departed:state.day,arrives:state.day+route.days,route};
    const command={type:'hero-travel',day:state.day,to};state.commands.push(command);emit('hero-travel',{...state.hero.journey});return {ok:true};
  }
  function watchBattles(enabled){
    if(typeof enabled!=='boolean'||state.pending||state.winner)return {ok:false,reason:'Cannot change encounter settings now.'};
    state.hero.watching=enabled;state.commands.push({type:'hero-watch',day:state.day,enabled});return {ok:true};
  }
  // The exploration adapter reports region crossings. This entry point is only
  // enabled for world-driven scenarios; it cannot move a map-only hero for free.
  function locateHero(region){
    if(scenario.heroTracking!=='world'||region!==null&&!regions.has(region))return {ok:false,reason:'Invalid world hero location.'};
    if(state.pending)return {ok:false,reason:'Resolve the local encounter before moving.'};
    if(state.hero.region===region)return {ok:true};
    state.hero.region=region;state.hero.journey=null;
    state.commands.push({type:'hero-location',day:state.day,region});emit('hero-location',{region});return {ok:true};
  }
  function joinBattle(id,position){
    const engagement=state.engagements.find(e=>e.id===id&&e.status==='active');
    const stage=engagement&&availableBattleStage(engagement);
    if(state.pending||!stage||engagement.endsOn<=state.day||state.hero.readyOn>state.day||state.hero.region!==engagement.region||
      !Number.isFinite(position?.x)||!Number.isFinite(position?.z)||Math.hypot(position.x-engagement.location.x,position.z-engagement.location.z)>(engagement.entryRadius??(stage==='rally'?45:24)))
      return {ok:false,reason:'Reach the active battlefield before it ends, while ready to help.'};
    state.pending={id:stage==='rally'?engagement.id+':rally':engagement.id,battleId:engagement.id,...(engagement.rally||engagement.participation?{stage}:{}),...(engagement.participation?{entryRadius:engagement.entryRadius,participation:{faction:engagement.participation.faction,...engagement.participation.intercept,guards:Math.max(0,engagement.participation.intercept.totalGuards-engagement.participation.intercept.stopped-engagement.participation.intercept.escaped)}}:{}),...(stage==='rally'?{rally:{faction:engagement.rally.faction,guards:rallyGuardCount(engagement),blocked:engagement.heroResult.objective.blocked,...(rules.assaultSupportGap!==undefined?{supportAllies:Math.min(3,Math.max(0,rallyGuardCount(engagement)-rules.assaultSupportGap))}:{}),...(engagement.participation?{stopped:engagement.rally.stopped??0,totalGuards:engagement.rally.totalGuards,...(engagement.rally.style?{style:engagement.rally.style}:{}),...(engagement.rally.allied?{allied:copy(engagement.rally.allied)}:{})}: {})}}:{}),day:state.day,region:engagement.region,armyId:engagement.attackingIds[0],attacker:engagement.attacker,defender:engagement.defender,
      attackers:engagement.attackingIds.reduce((n,id)=>n+state.armies.find(a=>a.id===id).strength,0),defenders:defendingStrength(state,engagement.region),endsOn:engagement.endsOn,...(engagement.reinforcements?{reinforcements:copy(engagement.reinforcements)}:{})};
    state.commands.push({type:'join-battle',day:state.day,id,position:{x:position.x,z:position.z}});emit('encounter',state.pending);return {ok:true};
  }
  function chooseAssault(id,style){
    const p=state.pending,b=p&&state.engagements.find(e=>e.id===p.battleId&&e.status==='active');
    if(p?.id!==id||!p.participation||!p.rally||!b||!['solo','allied'].includes(style))return {ok:false,reason:'Choose a style for the current final assault.'};
    if(b.rally.style)return b.rally.style===style?{ok:true}:{ok:false,reason:'Resume this assault in its original style.'};
    if((b.rally.stopped??0)>0&&style!=='solo')return {ok:false,reason:'An existing solo assault must resume without replacement allies.'};
    b.rally.style=p.rally.style=style;
    if(style==='allied')b.rally.allied=p.rally.allied={totalAllies:p.rally.supportAllies??3,lost:0,routed:0,damage:0};
    state.commands.push({type:'assault-style',day:state.day,id,style});return {ok:true};
  }
  function resolveEncounter(id,faction,outcome,reason=null,stopped=null,progress=null){
    const pending=state.pending;
    if(pending?.id===id&&pending.participation)return resolveParticipation(pending,faction,outcome,reason,stopped,progress);
    if(pending?.id===id&&pending.stage==='rally')return resolveRally(pending,faction,outcome,reason,stopped);
    if(!pending||pending.id!==id||!['success','defeat','withdraw'].includes(outcome)||
      ((outcome!=='withdraw'||stopped>0)&&![pending.attacker,pending.defender].includes(faction))||
      (outcome==='withdraw'&&!(stopped>0)&&faction!==null))return {ok:false,reason:'Invalid or already resolved encounter.'};
    const engagement=pending.battleId?state.engagements.find(e=>e.id===pending.battleId):null;
    if(stopped!==null&&(!engagement?.reinforcements||!Number.isInteger(stopped)||stopped<0||stopped>3||(outcome==='success'?stopped!==3:stopped===3)))return {ok:false,reason:'Invalid stopped-soldier count.'};
    if(reason!==null&&(!engagement?.reinforcements||!(outcome==='success'?['vanguard-broken']:outcome==='defeat'?['runner-arrived','driven-back','time-expired']:['withdrew']).includes(reason)))return {ok:false,reason:'Invalid interception explanation.'};
    const enemy=faction===pending.attacker?pending.defender:pending.attacker;
    if(engagement?.reinforcements&&(outcome!=='withdraw'||stopped>0)&&!engagement.reinforcements[enemy]?.strength)return {ok:false,reason:'No enemy reinforcement squad is available.'};
    const objective=engagement?.reinforcements?interceptReinforcements(state,engagement,faction,outcome,stopped):null;
    const command={type:'hero-result',day:state.day,id,faction,outcome,...(reason?{reason}:{}),...(stopped!==null?{stopped}:{})};
    state.commands.push(command);state.pending=null;state.hero.readyOn=state.day+3;
    if(objective?.blocked)emit('reinforcements-intercepted',{battleId:pending.battleId,region:pending.region,faction:objective.targetFaction,strength:objective.blocked});
    emit('hero-result',{...command,region:pending.region,battleId:pending.battleId??null,...(objective?{objective}:{} )});
    if(engagement){engagement.heroResult={faction,outcome,...(reason?{reason}:{}),...(objective?{objective}:{})};
      if(engagement.rally){engagement.rally={status:faction?'available':'declined',faction};if(faction)state.hero.readyOn=state.day;}
      return {ok:true};}
    battle(state.armies.find(a=>a.id===pending.armyId),outcome==='withdraw'?null:{faction,outcome});finishDay();return {ok:true};
  }
  // v6 battlefield visits are resumable. Legacy scenario commands above retain
  // their original one-shot meaning so existing saves replay unchanged.
  function resolveParticipation(pending,faction,outcome,reason,stopped,progress){
    const engagement=state.engagements.find(e=>e.id===pending.battleId&&e.status==='active');
    if(!engagement)return {ok:false,reason:'This battle has already ended.'};
    const escaped=progress?.escaped??0,rally=pending.stage==='rally',remaining=rally?pending.rally.guards:pending.participation.guards;
    const count=stopped??(outcome==='success'?remaining:0);
    const allied=rally&&pending.rally.style==='allied',lost=progress?.alliesLost??0,routed=progress?.routed??0,damage=progress?.allyDamage??0;
    if(progress!==null&&(typeof progress!=='object'||Array.isArray(progress)||Object.keys(progress).some(k=>!(allied?['escaped','alliesLost','routed','allyDamage']:['escaped']).includes(k)))||
      !Number.isInteger(lost)||lost<0||lost>(allied?pending.rally.allied.totalAllies-pending.rally.allied.lost:0)||!Number.isInteger(routed)||routed<0||routed>count||!Number.isFinite(damage)||damage<0||damage>remaining*50||
      !Number.isInteger(escaped)||escaped<0||!Number.isInteger(count)||count<0||count+escaped>remaining||rally&&escaped)
      return {ok:false,reason:'Invalid remaining-soldier count.'};
    if(reason==='declined'){
      if(outcome!=='withdraw'||faction!==null||count||escaped||lost||routed||damage)return {ok:false,reason:'Invalid battlefield refusal.'};
      state.commands.push({type:'hero-result',day:state.day,id:pending.id,faction:null,outcome:'withdraw',reason:'declined',stopped:0});
      state.pending=null;return {ok:true};
    }
    const reasons=rally?{success:['rally-secured'],defeat:['driven-back','time-expired'],withdraw:['withdrew']}:
      {success:['vanguard-broken'],defeat:['runner-arrived','driven-back','time-expired'],withdraw:['withdrew']};
    if(!reasons[outcome]||reason!==null&&!reasons[outcome].includes(reason)||
      ![pending.attacker,pending.defender].includes(faction)||
      engagement.participation.faction&&engagement.participation.faction!==faction||
      outcome==='success'&&(count!==remaining||escaped))return {ok:false,reason:'Invalid or already resolved battlefield phase.'};
    const enemy=faction===pending.attacker?pending.defender:pending.attacker;
    if(!rally&&engagement.reinforcements&&!engagement.reinforcements[enemy]?.strength)return {ok:false,reason:'No enemy reinforcement squad is available.'};
    const command={type:'hero-result',day:state.day,id:pending.id,faction,outcome,...(reason?{reason}:{}),stopped:count,...(progress!==null?{progress:{escaped,...(allied?{alliesLost:lost,routed,allyDamage:damage}:{})}}:{})};
    state.commands.push(command);state.pending=null;state.hero.readyOn=state.day;
    engagement.participation.faction=faction;
    if(rally){
      const result=removeRallyGuards(state,engagement,faction,count-routed);
      let alliesRemoved=0;
      if(allied){
        alliesRemoved=removeRallyGuards(state,engagement,enemy,lost).removed;
        engagement.rally.allied.lost+=lost;engagement.rally.allied.routed+=routed;engagement.rally.allied.damage+=damage;
      }
      Object.assign(engagement.rally,{stopped:(engagement.rally.stopped??0)+count,removed:(engagement.rally.removed??0)+result.removed,enemy});
      const complete=outcome!=='withdraw';
      if(complete)Object.assign(engagement.rally,{status:'finished',outcome,reason});
      emit('rally-result',{...command,battleId:engagement.id,region:engagement.region,removed:result.removed,...(allied?{alliesRemoved}:{}),enemy,remaining:rallyGuardCount(engagement),phaseComplete:complete});
      if(complete)advancePhase(engagement,true);
      return {ok:true};
    }
    const phase=engagement.participation.intercept;
    const objective=engagement.reinforcements?continueInterception(state,engagement,faction,count,escaped):null;
    if(!objective){phase.stopped+=count;phase.escaped+=escaped;}
    const complete=outcome!=='withdraw'||!!engagement.rally&&phase.stopped+phase.escaped===phase.totalGuards;
    engagement.heroResult={faction,outcome,...(reason?{reason}:{}),...(objective?{objective}:{})};
    if(objective?.removed)emit('reinforcements-intercepted',{battleId:engagement.id,region:engagement.region,faction:enemy,strength:objective.removed});
    emit('hero-result',{...command,region:engagement.region,battleId:engagement.id,...(objective?{objective}:{}),phaseComplete:complete});
    if(complete){
      phase.status='finished';
      if(engagement.rally){
        const totalGuards=rallyGuardCount(engagement);
        engagement.rally={status:'available',faction,totalGuards,stopped:0,removed:0};
      }
      if(outcome!=='withdraw')advancePhase(engagement,!engagement.rally);
    }
    return {ok:true};
  }
  function advancePhase(engagement,final){
    const target=final?engagement.endsOn:Math.min(engagement.endsOn-1,engagement.started+Math.max(1,Math.floor(battleDays/2)));
    if(target>state.day)step(target-state.day);
  }
  function resolveRally(pending,faction,outcome,reason,stopped){
    const engagement=state.engagements.find(e=>e.id===pending.battleId&&e.status==='active');
    const validReason={success:['rally-secured'],defeat:['driven-back','time-expired'],withdraw:['withdrew']};
    if(!engagement||engagement.rally?.status!=='available'||!validReason[outcome]?.includes(reason)||
      !Number.isInteger(stopped)||stopped<0||stopped>pending.rally.guards||
      (outcome==='success'&&stopped!==pending.rally.guards)||
      (outcome==='withdraw'&&!stopped?faction!==null:faction!==pending.rally.faction))return {ok:false,reason:'Invalid or already resolved rally assault.'};
    const side=pending.rally.faction,{enemy,removed}=removeRallyGuards(state,engagement,side,stopped);
    const command={type:'hero-result',day:state.day,id:pending.id,faction,outcome,reason,stopped};
    state.commands.push(command);state.pending=null;state.hero.readyOn=state.day+3;
    engagement.rally={status:'finished',faction:side,outcome,reason,stopped,removed,enemy};
    emit('rally-result',{...command,battleId:engagement.id,region:engagement.region,removed,enemy});
    if(outcome==='success'){
      for(const squad of Object.values(engagement.reinforcements))if(['approaching','partially-intercepted'].includes(squad.status))squad.status='joined';
      const result=battle(state.armies.find(a=>a.id===engagement.attackingIds[0]),engagement.heroResult,engagement);
      Object.assign(engagement,{status:'resolved',resolvedOn:state.day,resultId:result.id,captured:result.captured});
      victory();
    }
    return {ok:true};
  }
  function reinforce(region,amount=80){
    if(state.pending)return {ok:false,reason:'Resolve the local encounter first.'};
    if(state.winner)return {ok:false,reason:'This war has ended. Reset to try another intervention.'};
    const target=state.regions[region];if(!target||!scenario.wars[0].includes(target.owner))return {ok:false,reason:'Choose a region held by one of the two leagues.'};
    if(!Number.isInteger(amount)||amount<1||amount>500)return {ok:false,reason:'Reinforcements must be between 1 and 500.'};
    target.garrison+=amount;const command={day:state.day,type:'reinforce',region,amount,faction:target.owner};state.commands.push(command);emit('intervention',command);return {ok:true};
  }
  function snapshot(){return copy(state);}
  emit('opening',{factions:[...scenario.wars[0]]});return {step,reinforce,heroTravel,locateHero,joinBattle,watchBattles,chooseAssault,resolveEncounter,snapshot};
}

// A saved experiment is a seed + ordered commands + final day. Replaying goes
// through the same public actions as the UI, including multiple actions on a day.
export function replayCampaign(scenario,{seed,day,commands=[],scenario:scenarioId}){
  if(scenarioId&&scenarioId!==scenario.id)throw Error('This experiment uses different scenario rules.');
  if(!Number.isInteger(day)||day<0||day>10000)throw new Error('Invalid replay day.');
  const campaign=createCampaign(scenario,seed);let previous=0;
  for(const command of commands){
    if(!['reinforce','hero-travel','hero-watch','hero-result','hero-location','join-battle','assault-style'].includes(command.type)||!Number.isInteger(command.day)||command.day<previous||command.day>day)throw new Error('Invalid replay command.');
    if(command.day>campaign.snapshot().day)campaign.step(command.day-campaign.snapshot().day);
    if(campaign.snapshot().day!==command.day)throw new Error('Command occurs after the war ended.');
    const result=command.type==='reinforce'?campaign.reinforce(command.region,command.amount):command.type==='hero-travel'?campaign.heroTravel(command.to):command.type==='hero-location'?campaign.locateHero(command.region):command.type==='hero-watch'?campaign.watchBattles(command.enabled):command.type==='join-battle'?campaign.joinBattle(command.id,command.position):command.type==='assault-style'?campaign.chooseAssault(command.id,command.style):campaign.resolveEncounter(command.id,command.faction,command.outcome,command.reason,command.stopped,command.progress);
    if(!result.ok)throw new Error(result.reason);previous=command.day;
  }
  if(day>campaign.snapshot().day)campaign.step(day-campaign.snapshot().day);
  if(campaign.snapshot().day!==day)throw new Error('Replay continues after the war ended.');
  return campaign;
}
