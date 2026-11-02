import {TOWER} from '../../../app/exploration/tower-state.js';
const animal=(species,name,habitat,x,z,count,r=18)=>Object.freeze({species,name,habitat,x:TOWER.x+x,z:TOWER.z+z,count,r});
// Authored starter collection of real North American wildlife. Metre-scale
// models have their own anatomy; these are not renamed fantasy residents.
export const SANCTUARY_ANIMALS=Object.freeze([
  animal('american-bison','American bison','grassland',-48,-19,4,19),
  animal('white-tailed-deer','White-tailed deer','grassland',-92,40,3,17),
  animal('wild-turkey','Wild turkey','grassland',-38,35,3,12),
  animal('elk','Elk','woodland',-195,-75,3,22),
  animal('gray-wolf','Gray wolf','woodland',-315,-150,2,20),
  animal('american-black-bear','American black bear','woodland',-355,-55,1,22),
  animal('red-fox','Red fox','woodland',-205,65,2,16),
  animal('raccoon','Raccoon','wetland',-150,170,2,12),
  animal('north-american-beaver','North American beaver','wetland',-220,230,2,12),
  animal('north-american-river-otter','North American river otter','wetland',-275,265,2,15),
  animal('moose','Moose','wetland',-400,140,2,22),
  animal('bald-eagle','Bald eagle','alpine',-445,-260,2,22),
]);
