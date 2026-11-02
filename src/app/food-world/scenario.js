import {createLizeemFoodScenario} from '../../content/scenarios/lizeem-food.js';

export const FOOD_WORLD_ID='lizeem-food-world-v1';
export const FOOD_WORLD_KEY='azhora-lizeem-food-world-v1';
// A named, temporary exercise with fixed garrisons. It uses the same economy;
// holding army orders makes its multi-week supply/recovery sequence reviewable.
export const FOOD_DEMO_SCENARIO={...createLizeemFoodScenario(),id:'lizeem-nesdor-food-demo-v1',heroTracking:'world',name:'Nesdor shortage and recovery'};

// Apply the reviewed economy to the current hero war, preserving its battles,
// commanders and opening orders. campaign.js remains the only simulation.
export function withFoodEconomy(worldScenario){
  const economy=createLizeemFoodScenario({war:true});
  return {...structuredClone(worldScenario),id:FOOD_WORLD_ID,name:'Lizeemi War / Food world test',
    rules:{...worldScenario.rules,supplyPlanning:economy.rules.supplyPlanning},
    food:economy.food,
    regions:worldScenario.regions.map(r=>{
      const e=economy.regions.find(e=>e.id===r.id);
      return {...structuredClone(r),food:e.food,housing:e.housing};
    }),
  };
}
