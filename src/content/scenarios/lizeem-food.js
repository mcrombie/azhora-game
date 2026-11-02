import {LIZEEM_SCENARIO} from './lizeem.js';
import {LIZEEM_BATTLEFIELDS} from './lizeem-battlefields.js';
import {LIZEEM_FOOD_TARGETS} from './lizeem-food-targets.js';
import {nethereumFoodCapacity,NETHEREUM_BUILDINGS} from '../regions/nethereum/nethereum-agriculture.js';
import {LIZEEM_HOUSING_TARGETS} from './lizeem-housing-targets.js';
import {ovesosFoodCapacity,OVESOS_AGRICULTURE_BUILDINGS} from '../regions/oves/ovesos-agriculture.js';
import {nesdorFoodCapacity,NESDOR_AGRICULTURE_BUILDINGS} from '../regions/nesdor/nesdor-agriculture.js';
import {isareosFoodCapacity,ISAREOS_RURAL_BUILDINGS,MINORA_HOUSING_CAPACITY} from '../regions/minora-frontier/isareos-agriculture.js';
import {housingCapacity} from '../settlements/housing-capacity.js';

// New economic targets, independent of every legacy farm, crop and skill timer.
// One food unit feeds ten people (or ten military strength) for one campaign day.
export const LIZEEM_FOOD_REGIONS = {...LIZEEM_FOOD_TARGETS,
  nethereum:{...LIZEEM_FOOD_TARGETS.nethereum,production:nethereumFoodCapacity()},
  caricas:{...LIZEEM_FOOD_TARGETS.caricas},
  ovesos:{...LIZEEM_FOOD_TARGETS.ovesos,production:ovesosFoodCapacity()},
  nesdor:{...LIZEEM_FOOD_TARGETS.nesdor,production:nesdorFoodCapacity()},
  isareos:{...LIZEEM_FOOD_TARGETS.isareos,production:isareosFoodCapacity()},
};

export function createLizeemFoodScenario({war=false,planning=war}={}){
  const base=JSON.parse(JSON.stringify(LIZEEM_SCENARIO));
  const housing={nethereum:{capacity:housingCapacity(NETHEREUM_BUILDINGS)},caricas:{capacity:LIZEEM_HOUSING_TARGETS.caricas},ovesos:{capacity:housingCapacity(OVESOS_AGRICULTURE_BUILDINGS)},nesdor:{capacity:housingCapacity(NESDOR_AGRICULTURE_BUILDINGS)}};
  housing.isareos={capacity:housingCapacity(ISAREOS_RURAL_BUILDINGS)+MINORA_HOUSING_CAPACITY};
  return {...base,id:war?(planning?'lizeem-food-war-v2':'lizeem-food-war-v1'):'lizeem-food-budget-v1',
    name:war?'Lizeem food and war':'Lizeem food budget (fixed armies)',
    rules:{...base.rules,autonomousOrders:war,battleDays:war?3:0,...(war&&planning?{supplyPlanning:'endurance-v1'}:{})},
    regions:base.regions.map(r=>({...r,recruits:war?r.recruits:0,...(war?{battlefield:LIZEEM_BATTLEFIELDS[r.id]}:{}),...(housing[r.id]?{housing:housing[r.id]}:{}),food:{...LIZEEM_FOOD_REGIONS[r.id]}})),
    food:{rationPerPerson:.1,reserveDays:7,carriedDays:4,
      shortageGraceDays:3,attritionRate:.02,readinessLoss:.2,readinessRecovery:.1,
      unrestRise:.08,unrestRecovery:.04,unrestProductionPenalty:.5,unrestRecruitmentPenalty:.75,
      battleProductionFactor:.5,
      routes:base.routes.map(r=>({regions:[...r.regions],capacity:r.regions.includes('isareos')?180:40})),
      trades:[{from:'nethereum',to:'isareos',amount:140},{from:'caricas',to:'isareos',amount:30}],
      reserveOverrides:{isareos:2380},
    },
  };
}
