import {createAgricultureSteps} from '../../../world/scenery/agriculture-scenery.js';
import {lizeemAgricultureReserved} from '../minora-frontier/lizeem-agriculture-reservations.js';
import {lizeemAgricultureTreeSteps} from '../minora-frontier/lizeem-agriculture-trees.js';
import {OVESOS_FARMS,OVESOS_AGRICULTURE_BUILDINGS,OVESOS_AGRICULTURE_LANES,OVESOS_AGRICULTURE_WILDLAND} from './ovesos-agriculture.js';

export const OVESOS_AGRICULTURE_SCENERY={
  region:'ovesos',reserved:lizeemAgricultureReserved,treeSteps:lizeemAgricultureTreeSteps,
  farms:OVESOS_FARMS,buildings:OVESOS_AGRICULTURE_BUILDINGS,lanes:OVESOS_AGRICULTURE_LANES,wildland:OVESOS_AGRICULTURE_WILDLAND,
  town:{name:'Ovesos Town',market:[-1910,602,43,22],stalls:[[-1923,608],[-1897,609],[-1919,592]],carts:[[-1948,602]]},
};
export const createOvesosAgricultureSteps=options=>createAgricultureSteps({...options,layout:OVESOS_AGRICULTURE_SCENERY});
