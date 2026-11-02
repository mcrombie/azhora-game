import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {buildArrivalDoor} from './arrival-door.js';
import {TOWER} from '../tower-state.js';

// West wall, clear of the library and the southern exit to Minora.
export const STILLROOM_DOOR=Object.freeze({x:TOWER.x-12.7,y:TOWER.y,z:TOWER.z+3.3});
export const STILLROOM_THRESHOLD=Object.freeze({x:STILLROOM_DOOR.x+1.4,y:TOWER.y,z:STILLROOM_DOOR.z});
export const STILLROOM_ARRIVAL=Object.freeze({x:STILLROOM_DOOR.x+3.1,y:TOWER.y,z:STILLROOM_DOOR.z});

export function createTowerStillroomDoor(parent){
  const root=new THREE.Group();root.name='The matching door to Spirit and Time';
  root.position.set(STILLROOM_DOOR.x-TOWER.x,0,STILLROOM_DOOR.z-TOWER.z);root.rotation.y=-Math.PI/2;parent.add(root);
  const authored=new THREE.Group();authored.position.z=-40.5;root.add(authored);
  const b=createSceneryBuilder('The Azhora threshold: matching joinery'),glow=buildArrivalDoor(b,authored);
  const mesh=b.finish(authored,{castShadow:false});mesh.material=mesh.material.clone();
  return {root,dispose(){glow.dispose();mesh.geometry.dispose();mesh.material.dispose();root.removeFromParent();}};
}
