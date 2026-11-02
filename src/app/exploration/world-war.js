import {presentFaction,settledOwners} from './league-settlement.js';
import {LIZEEM_CHAMPIONS} from '../../content/scenarios/lizeem-champions.js';
import {LIZEEM_SCENARIO} from '../../content/scenarios/lizeem.js';
import {LIZEEM_SURROUNDINGS} from '../../content/scenarios/lizeem-surroundings.js';
import {createCampaign,replayCampaign} from '../../simulation/campaign.js';
import {LIZEEM_BATTLEFIELDS} from '../../content/scenarios/lizeem-battlefields.js';
import {LIZEEM_FIELD_SITES} from '../../content/scenarios/lizeem-field-sites.js';
import {withFoodEconomy,FOOD_DEMO_SCENARIO,FOOD_WORLD_ID} from '../food-world/scenario.js';

export const LEGACY_WORLD_WAR_SCENARIO={...LIZEEM_SCENARIO,id:'lizeem-world-v3',heroTracking:'world',rules:{...LIZEEM_SCENARIO.rules,battleDays:3},
  regions:LIZEEM_SCENARIO.regions.map(r=>({...r,battlefield:LIZEEM_BATTLEFIELDS[r.id],...(r.id==='caricas'?{interceptionStrength:12}:{})}))};
export const INTERCEPTION_WORLD_WAR_SCENARIO={...LEGACY_WORLD_WAR_SCENARIO,id:'lizeem-world-v4',
  regions:LEGACY_WORLD_WAR_SCENARIO.regions.map(r=>({...r,...(['caricas','ovesos'].includes(r.id)?{interceptionStrength:12}:{})}))};
export const RALLY_WORLD_WAR_SCENARIO={...INTERCEPTION_WORLD_WAR_SCENARIO,id:'lizeem-world-v5',
  regions:INTERCEPTION_WORLD_WAR_SCENARIO.regions.map(r=>({...r,...(r.id==='ovesos'?{rallyAssault:true}:{})}))};
export const BATTLEFIELD_ENTRY_RADIUS=70;
export const ENTRY_WORLD_WAR_SCENARIO={...RALLY_WORLD_WAR_SCENARIO,id:'lizeem-world-v6',battlefieldEntryRadius:BATTLEFIELD_ENTRY_RADIUS,
  openingOrders:[{faction:'west',from:'nethereum',to:'caricas',marchDays:2}],
  regions:RALLY_WORLD_WAR_SCENARIO.regions.map(r=>({...r,...(r.id==='caricas'?{rallyAssault:true}:{})}))};
export const CONTINUITY_WORLD_WAR_SCENARIO={...ENTRY_WORLD_WAR_SCENARIO,id:'lizeem-world-v7',rules:{...ENTRY_WORLD_WAR_SCENARIO.rules,assaultSupportGap:1},
  regions:ENTRY_WORLD_WAR_SCENARIO.regions.map(r=>({...r,...(LIZEEM_FIELD_SITES[r.id]?{interceptionStrength:LIZEEM_FIELD_SITES[r.id].interceptionStrength,rallyAssault:true}:{})}))};
export const RECOVERY_WORLD_WAR_SCENARIO={...CONTINUITY_WORLD_WAR_SCENARIO,id:'lizeem-world-v8',
  rules:{...CONTINUITY_WORLD_WAR_SCENARIO.rules,armyRecoveryDays:2,reattackDelayDays:3}};
export const DUEL_WORLD_WAR_SCENARIO={...RECOVERY_WORLD_WAR_SCENARIO,id:'lizeem-world-v9',rules:{...RECOVERY_WORLD_WAR_SCENARIO.rules,championDuel:true}};
export const WORLD_WAR_SCENARIO={...DUEL_WORLD_WAR_SCENARIO,id:'lizeem-world-v10',
  commanders:Object.values(LIZEEM_CHAMPIONS).map(({id,name,faction,origin,home,company})=>({id,name,faction,origin,home,company})),
  // Dain holds Caricas for the opening attack. His troops come from its existing garrison.
  initialArmies:[{faction:'east',region:'caricas',strength:24,readyOn:3}]};
// Retain the earlier immediate timing for deterministic historical replays.
export const OPENING_WORLD_WAR_SCENARIO={...WORLD_WAR_SCENARIO,id:'lizeem-opening-v2',rules:{...WORLD_WAR_SCENARIO.rules,localBattleTiming:'immediate'}};
export const FOOD_WORLD_SCENARIO=withFoodEconomy(WORLD_WAR_SCENARIO);
// New adventures combine the reviewed farms and supply simulation with the
// elapsed clock. Keep the earlier scenario definitions immutable for replay.
export const LEGACY_UNIFIED_WORLD_WAR_SCENARIO={...withFoodEconomy(OPENING_WORLD_WAR_SCENARIO),id:'lizeem-adventure-food-v1',name:'Lizeemi War'};
export const SIMULTANEOUS_WORLD_WAR_SCENARIO={...LEGACY_UNIFIED_WORLD_WAR_SCENARIO,id:'lizeem-adventure-food-v2',openingOrders:[],openingBattles:[
  {faction:'west',from:'nethereum',to:'caricas',strength:46},
  {faction:'east',from:'nesdor',to:'ovesos',strength:34},
]};
export const STAGGERED_WORLD_WAR_SCENARIO={...SIMULTANEOUS_WORLD_WAR_SCENARIO,id:'lizeem-adventure-food-v3',openingBattles:[
  {faction:'west',from:'nethereum',to:'caricas',strength:46},
  {faction:'east',from:'nesdor',to:'ovesos',strength:34,startsOn:2},
]};
export const UNIFIED_WORLD_WAR_ID='lizeem-adventure-food-v4';
export const UNIFIED_WORLD_WAR_SCENARIO={...STAGGERED_WORLD_WAR_SCENARIO,id:UNIFIED_WORLD_WAR_ID,
  rules:{...STAGGERED_WORLD_WAR_SCENARIO.rules,localBattleTiming:'scheduled'}};
export const isUnifiedWorldWar=id=>[UNIFIED_WORLD_WAR_ID,STAGGERED_WORLD_WAR_SCENARIO.id,SIMULTANEOUS_WORLD_WAR_SCENARIO.id,LEGACY_UNIFIED_WORLD_WAR_SCENARIO.id].includes(id);
export const isElapsedWorldWar=id=>id===OPENING_WORLD_WAR_SCENARIO.id||isUnifiedWorldWar(id);
export const usesReviewedAgriculture=id=>isUnifiedWorldWar(id)||id===FOOD_WORLD_ID;
export function worldWarScenario(id){
  const scenario=[UNIFIED_WORLD_WAR_SCENARIO,STAGGERED_WORLD_WAR_SCENARIO,SIMULTANEOUS_WORLD_WAR_SCENARIO,LEGACY_UNIFIED_WORLD_WAR_SCENARIO,FOOD_DEMO_SCENARIO,FOOD_WORLD_SCENARIO,WORLD_WAR_SCENARIO,OPENING_WORLD_WAR_SCENARIO,DUEL_WORLD_WAR_SCENARIO,RECOVERY_WORLD_WAR_SCENARIO,CONTINUITY_WORLD_WAR_SCENARIO,ENTRY_WORLD_WAR_SCENARIO,RALLY_WORLD_WAR_SCENARIO,INTERCEPTION_WORLD_WAR_SCENARIO,LEGACY_WORLD_WAR_SCENARIO].find(s=>s.id===id);
  if(!scenario)throw Error('Unknown world-test scenario.');return scenario;
}
export const SECONDS_PER_DAY=30;
export function createWorldWar(saved=null,initialScenario=WORLD_WAR_SCENARIO){
  let campaign=saved?replayCampaign(worldWarScenario(saved.simulation.scenario),saved.simulation):createCampaign(initialScenario);
  let fraction=saved?.fraction??0,speed=saved?.speed??1,running=false;
  if(!Number.isFinite(fraction)||fraction<0||fraction>=SECONDS_PER_DAY||![1,4,20].includes(speed))throw Error('Invalid world campaign clock.');
  if(!saved)campaign.watchBattles(true);
  const idFor=name=>WORLD_WAR_SCENARIO.regions.find(r=>r.name===name)?.id??null;
  function syncRegion(name){return campaign.locateHero(idFor(name));}
  function advance(days=1){const state=campaign.step(days);if(state.pending||state.winner)running=false;return state;}
  function tick(dt,active){
    if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Invalid world clock step.');
    if(!active||!running)return false;
    fraction+=dt*speed;let changed=false;
    while(fraction>=SECONDS_PER_DAY&&running){fraction-=SECONDS_PER_DAY;advance();changed=true;}
    return changed;
  }
  function toggle(){const s=campaign.snapshot();if(!s.pending&&!s.winner)running=!running;return running;}
  function setSpeed(value){if(![1,4,20].includes(value))throw Error('Invalid campaign speed.');speed=value;}
  const checkpoint=()=>{const {scenario,seed,day,commands}=campaign.snapshot();return {simulation:{scenario,seed,day,commands},fraction,speed};};
  const clock=()=>({running,speed,fraction,secondsPerDay:SECONDS_PER_DAY});
  function advancePassage(seconds){
    if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw Error('Invalid passage duration.');
    const wasRunning=running;let state=campaign.snapshot(),left=seconds;
    const before=state.day*SECONDS_PER_DAY+fraction;
    if(!state.pending&&!state.winner)running=true;
    while(left>1e-8&&running){const dt=Math.min(1,left);tick(dt,true);left-=dt;}
    if(!wasRunning)running=false;
    state=campaign.snapshot();return {seconds:(state.day*SECONDS_PER_DAY+fraction-before)/speed,complete:!!state.winner};
  }
  return {campaign,syncRegion,advance,tick,toggle,setSpeed,checkpoint,clock,advancePassage,
    resetPhase(value=0){if(!Number.isFinite(value)||value<0||value>=SECONDS_PER_DAY)throw Error('Invalid world campaign phase.');fraction=value;},
    begin(){if(campaign.snapshot().day===0)advance(1);if(!running)toggle();},pause:()=>{running=false;},snapshot:campaign.snapshot};
}

// The wider chart supplies authored context separately from simulated ownership.
// Never pass the reference roster into the five-region campaign engine.
export function worldWarProjection(state){
  const owners=settledOwners(Object.fromEntries(Object.entries(state.regions).map(([id,r])=>[id,r.owner])),state.winner);
  const foodCondition=id=>{const f=state.regions[id].food;return f?[`${Math.round((1-f.unrest)*100)}% stability / ${Math.round(f.civilianRation*100)}% civilian rations`,f.unrest>.2||f.civilianRation<1?'unstable':'stable']:null;};
  return {id:state.scenario,day:state.day,reference:LIZEEM_SURROUNDINGS,factions:WORLD_WAR_SCENARIO.factions.map(f=>presentFaction(f,state)),
    regions:Object.fromEntries(WORLD_WAR_SCENARIO.regions.map(r=>[r.name,{owner:owners[r.id],
      condition:state.engagements.some(b=>b.region===r.id&&b.status==='active')?['Battle underway','conflict']:foodCondition(r.id)??(state.winner?['Lizeemi League / war ended; stability unassessed','unknown']:state.regions[r.id].owner==='minora'?['Neutral','stable']:state.regions[r.id].recovery?['Recovering from conquest','conflict']:['At war','conflict'])}]))};
}
