import {createAgricultureSteps,agricultureLaneDistance} from '../../../world/scenery/agriculture-scenery.js';
import {lizeemAgricultureReserved} from '../minora-frontier/lizeem-agriculture-reservations.js';
import {lizeemAgricultureTreeSteps} from '../minora-frontier/lizeem-agriculture-trees.js';
import {NETHEREUM_FARMS,NETHEREUM_BUILDINGS,NETHEREUM_LANES,NETHEREUM_WILDLAND} from './nethereum-agriculture.js';
export const NETHEREUM_AGRICULTURE_SCENERY={
  region:'nethereum',reserved:lizeemAgricultureReserved,treeSteps:lizeemAgricultureTreeSteps,
  farms:NETHEREUM_FARMS,buildings:NETHEREUM_BUILDINGS,lanes:NETHEREUM_LANES,wildland:NETHEREUM_WILDLAND,
  town:{name:'Nethereum Town',market:[-2218,387,51,19],stalls:[[-2215,378],[-2205,397]],carts:[[-2197,376]]},
};
export const farmLaneDistance=(x,z)=>agricultureLaneDistance(NETHEREUM_LANES,x,z);
export const createNethereumAgricultureSteps=options=>createAgricultureSteps({...options,layout:NETHEREUM_AGRICULTURE_SCENERY});
