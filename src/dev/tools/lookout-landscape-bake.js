import * as THREE from 'three';
import {createWorld} from '../../world.js';
import {REGION_CELLS,REGION_IDS} from '../../world/terrain/region-world.js';
import {LOOKOUT} from '../../app/exploration/tower-state.js';
import {LOOKOUT_HORIZON} from '../../content/regions/minora-frontier/lookout-bounds.js';

// Offline only: the real builder, refined surfaces, seeded trees and cities.
export async function bakeLookoutLandscape(progress=()=>{}){
  const scene=new THREE.Scene();
  const regions=Object.entries(REGION_CELLS).filter(([,cells])=>cells.some(p=>Math.hypot(p.x-LOOKOUT.x,p.z-LOOKOUT.z)<2800))
    .map(([name])=>({name,id:REGION_IDS[name]}));
  progress('Building actual regional scenery ('+regions.length+' regions), offline');
  const world=createWorld(scene,{enabledRegions:regions.map(r=>r.id),initialRegion:16,regionalFineGround:true});
  world.loading.setTravelBudget(32);
  const priority=[16,32,33,34,35,36,40,57,55,9];
  regions.sort((a,b)=>(priority.includes(a.id)?priority.indexOf(a.id):100+a.id)-(priority.includes(b.id)?priority.indexOf(b.id):100+b.id));
  for(const region of regions){progress('Loading reference scenery: '+region.name);await world.loading.ensureRegion(region.id);}
  world.loading.stop();scene.updateMatrixWorld(true);
  return {scene,world,regions,bounds:LOOKOUT_HORIZON};
}
