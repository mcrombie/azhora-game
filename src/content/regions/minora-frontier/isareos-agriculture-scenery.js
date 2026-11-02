import {createAgricultureSteps} from '../../../world/scenery/agriculture-scenery.js';
import {lizeemAgricultureReserved} from './lizeem-agriculture-reservations.js';
import {lizeemAgricultureTreeSteps} from './lizeem-agriculture-trees.js';
import {hexOwnerAt} from '../../../world/terrain/region-world.js';
import {westGroundAt} from '../western-regions/west-ground.js';
import {withHousingCapacity} from '../../settlements/housing-capacity.js';
import {MENORA_BUILDINGS,MENORA_PATHS,menoraGround,menoraDeckHeight,menoraReserved} from './menora-city.js';
import {createMenoraScenerySteps} from './menora-scenery.js';
import {ISAREOS_FARMS,ISAREOS_RURAL_BUILDINGS,ISAREOS_AGRICULTURE_LANES,ISAREOS_AGRICULTURE_WOODS,MINORA_HOUSING_CAPACITY} from './isareos-agriculture.js';

export const MINORA_REVIEW_BUILDINGS=withHousingCapacity(MENORA_BUILDINGS.map(b=>({
  ...b,w:b.width,d:b.depth,h:b.height,storeys:b.kind==='house'?Math.max(1,Math.floor(b.height/4)):1,
})),MINORA_HOUSING_CAPACITY);
export const ISAREOS_REVIEW_BUILDINGS=[...ISAREOS_RURAL_BUILDINGS,...MINORA_REVIEW_BUILDINGS];
export const ISAREOS_REVIEW_LANES=[...ISAREOS_AGRICULTURE_LANES,...MENORA_PATHS.map(p=>p.points.map(q=>[q.x,q.z]))];
export const isareosReviewGround=(x,z)=>menoraGround(x,z,westGroundAt(x,z));
export {menoraDeckHeight as isareosReviewDeckHeight};
export const ISAREOS_AGRICULTURE_SCENERY={region:'isareos',reserved:lizeemAgricultureReserved,treeSteps:lizeemAgricultureTreeSteps,farms:ISAREOS_FARMS,buildings:ISAREOS_RURAL_BUILDINGS,lanes:ISAREOS_AGRICULTURE_LANES,
  wildland:ISAREOS_AGRICULTURE_WOODS,canPlant:(x,z)=>hexOwnerAt(x,z)==='Isareos'&&!menoraReserved(x,z,8)};
export function* createIsareosAgricultureSteps(options){
  const rural=yield* createAgricultureSteps({...options,layout:ISAREOS_AGRICULTURE_SCENERY});
  yield 'Minora';
  const city=yield* createMenoraScenerySteps(options);
  // The review stays static; the playable countryside can retain the authored
  // traffic controller without rebuilding vessels or advancing campaign time.
  options.onCityBuilt?.(city);
  return {...rural,buildings:rural.buildings+city.metrics.buildings,vertices:rural.vertices+city.metrics.vertices,city:city.metrics};
}
