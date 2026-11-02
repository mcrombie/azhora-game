import {createAgricultureSteps} from '../../../world/scenery/agriculture-scenery.js';
import {lizeemAgricultureReserved} from '../minora-frontier/lizeem-agriculture-reservations.js';
import {lizeemAgricultureTreeSteps} from '../minora-frontier/lizeem-agriculture-trees.js';
import {hexOwnerAt} from '../../../world/terrain/region-world.js';
import {NESDOR_FARMS,NESDOR_AGRICULTURE_BUILDINGS,NESDOR_AGRICULTURE_LANES,NESDOR_AGRICULTURE_WOODS} from './nesdor-agriculture.js';

export const NESDOR_AGRICULTURE_SCENERY={
  region:'nesdor',reserved:lizeemAgricultureReserved,treeSteps:lizeemAgricultureTreeSteps,
  farms:NESDOR_FARMS,buildings:NESDOR_AGRICULTURE_BUILDINGS,lanes:NESDOR_AGRICULTURE_LANES,woodlands:NESDOR_AGRICULTURE_WOODS,
  canPlant:(x,z)=>hexOwnerAt(x,z)==='Nesdor',
  town:{name:'Nesdor Town',market:[-1578,850,40,21],stalls:[[-1592,844],[-1566,855]],carts:[[-1519,818]]},
};
export const createNesdorAgricultureSteps=options=>createAgricultureSteps({...options,layout:NESDOR_AGRICULTURE_SCENERY});
