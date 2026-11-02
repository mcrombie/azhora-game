import {createAgricultureSteps} from '../../../world/scenery/agriculture-scenery.js';
import {lizeemAgricultureReserved} from './lizeem-agriculture-reservations.js';
import {lizeemAgricultureTreeSteps} from './lizeem-agriculture-trees.js';
import {CARICAS_FARMS,CARICAS_AGRICULTURE_BUILDINGS,CARICAS_AGRICULTURE_LANES,CARICAS_AGRICULTURE_WOODS,CARICAS_MARKET} from './caricas-agriculture.js';
import {buildCaricasTownscape} from './caricas-townscape.js';

export const CARICAS_AGRICULTURE_SCENERY={
  region:'caricas',reserved:lizeemAgricultureReserved,treeSteps:lizeemAgricultureTreeSteps,
  farms:CARICAS_FARMS,buildings:CARICAS_AGRICULTURE_BUILDINGS,lanes:CARICAS_AGRICULTURE_LANES,wildland:CARICAS_AGRICULTURE_WOODS,
  town:{name:'Caricas Town',...CARICAS_MARKET},
};
export function* createCaricasAgricultureSteps(options){
  const result=yield* createAgricultureSteps({...options,layout:CARICAS_AGRICULTURE_SCENERY});
  result.vertices+=buildCaricasTownscape(options);yield 'Caricas townscape';return result;
}
