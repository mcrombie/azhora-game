import {createCanerdScenerySteps} from '../../content/regions/canerd/canerd-scenery.js';
import {CANERD, CANERD_VIEWS, canerdTint} from '../../content/regions/canerd/canerd-world.js';
import {groundWithRiver} from '../../world/terrain/world-terrain.js';

// The city review builds the ordinary castle only, without loading the world or
// changing the player's save. This wider camera includes the entire veteran's
// crown as well as the garden's floor and western entrance.
export const CANERD_REVIEW_CONFIG = {
  name:'Canerd - the sacred oak garden',
  box:[CANERD.x-150,CANERD.z-140,340,300],
  ground:groundWithRiver,height:groundWithRiver,tint:canerdTint,water:()=>null,
  build:createCanerdScenerySteps,
  views:{
    overview:{eye:{x:CANERD.x-17,y:CANERD.summitHeight+20,z:CANERD.z+40},
      target:{x:CANERD.x+10.5,y:CANERD.summitHeight+11.5,z:CANERD.z+14.5}},
    garden:CANERD_VIEWS['canerd-garden'],
    oak:CANERD_VIEWS['canerd-oak'],
  },
};
