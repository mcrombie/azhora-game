import {createCampaign,replayCampaign,normalizeSeed} from '../../simulation/campaign.js';
import {createLizeemFoodScenario} from '../../content/scenarios/lizeem-food.js';

export const WAR_FOOD_CASES=['no-food','normal','nethereum-disrupted','nethereum-restored','nesdor-disrupted','nesdor-restored'];
export function runWarFoodCase(name,{seed=1731,days=120,planning=true}={}){
  if(!WAR_FOOD_CASES.includes(name)||!Number.isInteger(days)||days<1||days>365)throw Error('Choose a food-war case and 1–365 days.');
  seed=normalizeSeed(seed);
  const scenario=createLizeemFoodScenario({war:true,planning});
  // Matched battle duration, forces, recruitment and AI. The ordinary map war
  // uses instant battles, so it would not isolate the effect of food fairly.
  if(name==='no-food'){delete scenario.food;delete scenario.rules.supplyPlanning;scenario.id='lizeem-food-war-control-v1';}
  const c=createCampaign(scenario,seed),history=[];
  const damaged=name.startsWith('nethereum-')?'nethereum':name.startsWith('nesdor-')?'nesdor':null;
  const change=condition=>{const r=c.foodAction({type:'production',region:damaged,condition});if(!r.ok)throw Error(r.reason);};
  if(damaged)change(.25);
  let previousEvents=0,hungerLosses=0;
  while(c.snapshot().day<days&&!c.snapshot().winner){
    if(c.snapshot().day===20&&name.endsWith('-restored'))change(1);
    const s=c.step(),f=s.regions.isareos.food;
    hungerLosses+=s.events.slice(previousEvents).filter(e=>e.type==='food-attrition').reduce((n,e)=>n+e.strength,0);previousEvents=s.events.length;
    history.push({day:s.day,minoraRation:f?.civilianRation??null,minoraStore:f?.store??null,minoraImports:f?.last.imports??null,
      minoraStability:f?1-f.unrest:null,activeBattles:s.engagements.filter(b=>b.status==='active').length,
      transfers:s.food?.last.transfers??[],civilianShortages:Object.entries(s.regions).filter(([,r])=>r.food&&r.food.civilianRation<1-1e-8).map(([id])=>id),
      armyShortages:s.armies.filter(a=>a.strength>0&&a.supply?.ration<1-1e-8).length});
  }
  const s=c.snapshot();
  if(JSON.stringify(replayCampaign(scenario,s).snapshot())!==JSON.stringify(s))throw Error('Food war replay differs.');
  const minoraShort=history.filter(h=>h.minoraRation!==null&&h.minoraRation<1-1e-8);
  const marches=s.events.filter(e=>e.type==='march');
  return {name,seed,days:s.day,winner:s.winner,hungerLosses,replayVerified:true,
    supplyHolds:s.events.filter(e=>e.type==='army-hold').length,
    riskyMarches:marches.filter(e=>e.army.supplyPlan?.forecast.gapDays>1e-8).length,
    minoraShortDays:minoraShort.length,minoraFirstShortDay:minoraShort[0]?.day??null,
    minoraRecovered:history.some((h,i)=>i>0&&history[i-1].minoraRation<1-1e-8&&h.minoraRation===1),
    minoraMinStability:s.food?Math.min(...history.map(h=>h.minoraStability)):null,
    meanImports:s.food?history.reduce((n,h)=>n+h.minoraImports,0)/history.length:null,
    battles:s.events.filter(e=>e.type==='battle').length,armyShortDays:history.reduce((n,h)=>n+h.armyShortages,0),
    regions:Object.fromEntries(Object.entries(s.regions).map(([id,r])=>[id,{owner:r.owner,store:r.food?.store??null,stability:r.food?1-r.food.unrest:null}])),history};
}
export function analyzeWarFood({seeds=[1731,...Array.from({length:31},(_,i)=>i+1)],days=120,planning=true}={}){
  if(!Array.isArray(seeds)||!seeds.length||seeds.length>200)throw Error('Use 1–200 seeds.');
  const runs=WAR_FOOD_CASES.flatMap(name=>seeds.map(seed=>runWarFoodCase(name,{seed,days,planning})));
  const summary=WAR_FOOD_CASES.map(name=>{
    const group=runs.filter(r=>r.name===name),mean=key=>group.reduce((n,r)=>n+(r[key]??0),0)/group.length;
    return {case:name,runs:group.length,westWins:group.filter(r=>r.winner==='west').length,eastWins:group.filter(r=>r.winner==='east').length,
      unresolved:group.filter(r=>!r.winner).length,meanDays:mean('days'),meanHungerLosses:mean('hungerLosses'),
      meanArmyShortDays:mean('armyShortDays'),meanSupplyHolds:mean('supplyHolds'),meanRiskyMarches:name==='no-food'||!planning?null:mean('riskyMarches'),minoraHungerRuns:group.filter(r=>r.minoraShortDays>0).length,
      minoraRecoveryRuns:group.filter(r=>r.minoraRecovered).length,meanMinoraShortDays:mean('minoraShortDays'),meanMinoraImports:name==='no-food'?null:mean('meanImports')};
  });
  return {seeds,days,planning,summary,runs};
}
