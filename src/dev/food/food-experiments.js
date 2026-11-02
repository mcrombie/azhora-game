import {createCampaign,replayCampaign} from '../../simulation/campaign.js';
import {foodSummary} from '../../simulation/food.js';
import {createLizeemFoodScenario} from '../../content/scenarios/lizeem-food.js';

export const FOOD_EXPERIMENTS={
  normal:'Normal production and trade; armies and recruitment held fixed.',
  'imports-cut':'Both Minora import routes closed from day 0.',
  'imports-restored':'Both Minora import routes closed; reopened at the end of day 20.',
  'nesdor-disrupted':'Nesdor produces at 25% capacity from day 0.',
  'nesdor-restored':'Nesdor produces at 25% capacity; restored at the end of day 20.',
  war:'The active East-West War, with recruitment, marching and food consequences.',
};

export function runFoodExperiment(name,{days=35,seed=1731}={}){
  if(!Object.hasOwn(FOOD_EXPERIMENTS,name)||!Number.isInteger(days)||days<1||days>365)throw Error('Choose a known experiment and 1-365 days.');
  const scenario=createLizeemFoodScenario({war:name==='war'}),campaign=createCampaign(scenario,seed),history=[];
  const action=value=>{const result=campaign.foodAction(value);if(!result.ok)throw Error(result.reason);};
  const imports=blocked=>{for(const from of ['nethereum','caricas'])action({type:'route',from,to:'isareos',blocked});};
  if(name.startsWith('imports-'))imports(true);
  if(name.startsWith('nesdor-'))action({type:'production',region:'nesdor',condition:.25});
  for(let day=0;day<days&&!campaign.snapshot().winner;day++){
    if(day===20){
      if(name==='imports-restored')imports(false);
      if(name==='nesdor-restored')action({type:'production',region:'nesdor',condition:1});
    }
    history.push(foodSummary(campaign.step()));
  }
  const state=campaign.snapshot(),replayed=replayCampaign(scenario,state).snapshot();
  if(JSON.stringify(replayed)!==JSON.stringify(state))throw Error('Food experiment failed deterministic replay.');
  return {name,description:FOOD_EXPERIMENTS[name],scenario:scenario.id,seed,requestedDays:days,
    day:state.day,winner:state.winner,replayVerified:true,history,state};
}
