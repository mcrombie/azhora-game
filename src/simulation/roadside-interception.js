import {recordCommander,validateCommanderReport} from './army-commanders.js';
import {encounterDamageBudget} from './encounter-damage.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const point=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z);
export const roadsideOrderKey=army=>`${army.id}:${army.from}:${army.to}:${army.departed}`;
export const ROADSIDE_REACH=14;
const clamp=value=>Math.max(0,Math.min(1,value));
// Shared by map markers and physical columns. An interception extends the
// remaining journey from its current point instead of sending it backward.
export function armyMarchProgress(army,day){
  const result=army.roadside,anchorTime=result?.day+result?.fraction;
  if(result?.order===roadsideOrderKey(army)&&result.delay>0&&Number.isFinite(anchorTime)&&result.originalArrives>army.departed){
    const anchor=clamp((anchorTime-army.departed)/(result.originalArrives-army.departed));
    if(day<=anchorTime)return clamp((day-army.departed)/(result.originalArrives-army.departed));
    return clamp(anchor+(1-anchor)*(day-anchorTime)/(army.arrives-anchorTime));
  }
  return clamp((day-army.departed)/(army.arrives-army.departed));
}

// A roadside encounter spends a small part of one existing march. It cannot
// capture the destination, create an army, or advance another campaign order.
// The world adapter verifies the physical column position before invoking this
// seam, just as it owns hero region crossings and loaded terrain checks.
export function createRoadsideInterception({state,scenario,emit,destroy,victory}){
  const region=id=>scenario.regions.find(r=>r.id===id);
  const atWar=(a,b)=>scenario.wars.some(w=>a!==b&&w.includes(a)&&w.includes(b));
  function supportFor(faction,where){
    const centre=region(where).position;
    // Do not borrow soldiers already earmarked for an ongoing regional battle.
    const options=scenario.regions.filter(r=>state.regions[r.id].owner===faction&&state.regions[r.id].garrison>0&&!state.engagements?.some(b=>b.status==='active'&&b.region===r.id))
      .sort((a,b)=>Math.hypot(a.position.x-centre.x,a.position.y-centre.y)-Math.hypot(b.position.x-centre.x,b.position.y-centre.y)||a.id.localeCompare(b.id));
    const home=options.find(r=>state.regions[r.id].garrison>=2)??options[0];
    return home?{region:home.id,name:home.name,strength:Math.min(2,state.regions[home.id].garrison)}:null;
  }
  function interceptArmy(id,faction,contact){
    const army=state.armies.find(a=>a.id===id),order=army&&roadsideOrderKey(army),fraction=contact?.fraction??0;
    if(scenario.heroTracking!=='world'||state.pending||state.winner||state.hero.readyOn>state.day||!army||army.status!=='marching'||army.strength<=0||army.arrives<=state.day||
      !atWar(faction,army.owner)||army.roadside?.order===order||!region(contact?.region)||state.hero.region!==contact.region||
      !Number.isFinite(fraction)||fraction<0||fraction>1||!point(contact.location)||!point(contact.position)||Math.hypot(contact.location.x-contact.position.x,contact.location.z-contact.position.z)>ROADSIDE_REACH)
      return {ok:false,reason:'Approach an enemy marching army that you have not already intercepted on this march.'};
    const support=supportFor(faction,contact.region),guards=Math.min(3,army.strength),commander=army.commander?.status==='active'?{...army.commander,armyId:army.id,armyName:army.name}:null;
    state.pending={id:`roadside:${order}`,kind:'roadside',stage:'rally',day:state.day,region:contact.region,location:copy(contact.location),entryRadius:32,
      armyId:army.id,armyName:army.name,attacker:army.owner,defender:faction,attackers:army.strength,defenders:support?.strength??0,endsOn:army.arrives,
      participation:{faction,guards},rally:{faction,guards,totalGuards:guards,blocked:0,stopped:0,style:'allied',allied:{totalAllies:support?.strength??0,lost:0,routed:0,damage:0}},
      commanders:commander?{[army.owner]:commander}:{},morale:{},roadside:{order,strength:Math.min(12,army.strength),day:state.day,fraction,originalArrives:army.arrives,support}};
    state.commands.push({type:'intercept-army',day:state.day,id,faction,contact:copy(contact)});
    emit('encounter',state.pending);return {ok:true};
  }
  function resolve(id,faction,outcome,reason,stopped,progress){
    const p=state.pending,army=state.armies.find(a=>a.id===p?.armyId);
    if(p?.kind!=='roadside'||p.id!==id||!army||army.status!=='marching'||roadsideOrderKey(army)!==p.roadside.order||army.roadside?.order===p.roadside.order)
      return {ok:false,reason:'This roadside encounter is no longer available.'};
    const count=stopped??0,lost=progress?.alliesLost??0,routed=progress?.routed??0,damage=progress?.allyDamage??0,escaped=progress?.escaped??0;
    if(progress!==null&&(typeof progress!=='object'||Array.isArray(progress)||Object.keys(progress).some(k=>!['escaped','alliesLost','routed','allyDamage','commanders'].includes(k)))||
      !Number.isInteger(count)||count<0||count>p.rally.guards||!Number.isInteger(lost)||lost<0||lost>p.rally.allied.totalAllies||!Number.isInteger(routed)||routed<0||routed>count||
      escaped!==0||!Number.isFinite(damage)||damage<0||damage>encounterDamageBudget(scenario.rules??{},p.rally.guards,p.commanders,faction))
      return {ok:false,reason:'Invalid roadside soldier report.'};
    if(reason==='declined'){
      if(faction!==null||outcome!=='withdraw'||count||lost||routed||damage||progress?.commanders&&Object.keys(progress.commanders).length)
        return {ok:false,reason:'Declining an interception cannot change either force.'};
      state.commands.push({type:'hero-result',day:state.day,id,faction:null,outcome,reason,stopped:0});state.pending=null;return {ok:true};
    }
    const reasons={success:['rally-secured'],defeat:['driven-back','time-expired'],withdraw:['withdrew']};
    if(faction!==p.defender||!reasons[outcome]?.includes(reason)||outcome==='success'&&count!==p.rally.guards||!validateCommanderReport(p,progress?.commanders,faction,outcome))
      return {ok:false,reason:'Face the marching army and record its commander before claiming this interception.'};
    const report={escaped:0,alliesLost:lost,routed,allyDamage:damage,...(progress?.commanders?{commanders:copy(progress.commanders)}:{})};
    state.commands.push({type:'hero-result',day:state.day,id,faction,outcome,reason,stopped:count,progress:report});
    for(const [side,commander] of Object.entries(report.commanders??{}))recordCommander(state,p,side,commander);
    const removed=Math.min(army.strength,Math.floor(p.roadside.strength*(count-routed)/p.rally.guards));
    army.strength-=removed;
    if(lost)state.regions[p.roadside.support.region].garrison-=lost;
    const delay=outcome==='success'&&army.strength>0?1:0;
    army.arrives+=delay;
    army.roadside={order:p.roadside.order,encounterId:id,day:p.day,fraction:p.roadside.fraction,originalArrives:p.roadside.originalArrives,outcome,removed,routed,alliesLost:lost,delay,arrives:army.arrives,morale:copy(p.morale)};
    army.reason=outcome==='success'?'The column was intercepted; survivors regroup before continuing the march.':'The column continues after a roadside skirmish.';
    if(!army.strength)destroy(army,'Destroyed in a roadside interception.');
    state.pending=null;state.hero.readyOn=state.day;
    emit('roadside-result',{encounterId:id,armyId:army.id,armyName:army.name,region:p.region,location:copy(p.location),from:army.from,to:army.to,faction,enemy:army.owner,outcome,reason,removed,routed,alliesLost:lost,
      support:p.roadside.support,delay,arrives:army.arrives,originalArrives:p.roadside.originalArrives,fraction:p.roadside.fraction,strength:army.strength,...(army.commander?{commander:copy(army.commander)}:{}),morale:copy(p.morale)});
    victory();return {ok:true};
  }
  function applyMorale(army,battle){
    const result=army.roadside;
    if(!result||result.order!==roadsideOrderKey(army)||result.moraleApplied)return;
    for(const [faction,value] of Object.entries(result.morale)){
      battle.morale??={};battle.morale[faction]=Math.max(-40,Math.min(40,(battle.morale[faction]??0)+value));
    }
    result.moraleApplied=true;
  }
  return {interceptArmy,resolve,applyMorale};
}
