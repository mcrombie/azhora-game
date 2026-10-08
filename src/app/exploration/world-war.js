import {LIZEEM_SCENARIO} from '../../content/scenarios/lizeem.js';
import {createCampaign,replayCampaign} from '../../simulation/campaign.js';
import {LIZEEM_BATTLEFIELDS} from '../../content/scenarios/lizeem-battlefields.js';
import {LIZEEM_FIELD_SITES} from '../../content/scenarios/lizeem-field-sites.js';

export const LEGACY_WORLD_WAR_SCENARIO={...LIZEEM_SCENARIO,id:'lizeem-world-v3',heroTracking:'world',rules:{...LIZEEM_SCENARIO.rules,battleDays:3},
  regions:LIZEEM_SCENARIO.regions.map(r=>({...r,battlefield:LIZEEM_BATTLEFIELDS[r.id],...(r.id==='caricas'?{interceptionStrength:12}:{})}))};
export const INTERCEPTION_WORLD_WAR_SCENARIO={...LEGACY_WORLD_WAR_SCENARIO,id:'lizeem-world-v4',
  regions:LEGACY_WORLD_WAR_SCENARIO.regions.map(r=>({...r,...(LIZEEM_FIELD_SITES[r.id]?{interceptionStrength:LIZEEM_FIELD_SITES[r.id].interceptionStrength}:{})}))};
export const RALLY_WORLD_WAR_SCENARIO={...INTERCEPTION_WORLD_WAR_SCENARIO,id:'lizeem-world-v5',
  regions:INTERCEPTION_WORLD_WAR_SCENARIO.regions.map(r=>({...r,...(r.id==='ovesos'?{rallyAssault:true}:{})}))};
export const BATTLEFIELD_ENTRY_RADIUS=70;
export const WORLD_WAR_SCENARIO={...RALLY_WORLD_WAR_SCENARIO,id:'lizeem-world-v6',battlefieldEntryRadius:BATTLEFIELD_ENTRY_RADIUS,
  openingOrders:[{faction:'west',from:'nethereum',to:'caricas',marchDays:2}],
  regions:RALLY_WORLD_WAR_SCENARIO.regions.map(r=>({...r,...(r.id==='caricas'?{rallyAssault:true}:{})}))};
export function worldWarScenario(id){
  const scenario=[WORLD_WAR_SCENARIO,RALLY_WORLD_WAR_SCENARIO,INTERCEPTION_WORLD_WAR_SCENARIO,LEGACY_WORLD_WAR_SCENARIO].find(s=>s.id===id);
  if(!scenario)throw Error('Unknown world-test scenario.');return scenario;
}
export const SECONDS_PER_DAY=30;
export function createWorldWar(saved=null){
  let campaign=saved?replayCampaign(worldWarScenario(saved.simulation.scenario),saved.simulation):createCampaign(WORLD_WAR_SCENARIO);
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
  return {campaign,syncRegion,advance,tick,toggle,setSpeed,checkpoint,clock,
    begin(){if(campaign.snapshot().day===0)advance(1);if(!running)toggle();},pause:()=>{running=false;},snapshot:campaign.snapshot};
}

// Projection is presentation data. Outside the five regions has no simulated
// ownership or stability; avoid mixing this test with the authored campaign.
export function worldWarProjection(state){
  return {id:state.scenario,day:state.day,factions:WORLD_WAR_SCENARIO.factions.map(f=>({...f})),
    regions:Object.fromEntries(WORLD_WAR_SCENARIO.regions.map(r=>[r.name,{owner:state.regions[r.id].owner,
      condition:state.engagements.some(b=>b.region===r.id&&b.status==='active')?['Battle underway','conflict']:state.regions[r.id].owner==='minora'?['Neutral','stable']:state.regions[r.id].recovery?['Recovering from conquest','conflict']:state.winner?['War ended; stability unassessed','unknown']:['At war','conflict']}]))};
}
