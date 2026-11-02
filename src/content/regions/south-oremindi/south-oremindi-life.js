import * as THREE from 'three';
import {createWestLife} from '../western-regions/west-regions-life.js';
import {SOUTH_OREMINDI_WILDLIFE_ZONES} from './south-oremindi-wildlife.js';

export function createSouthOremindiLife(scene,world){
 const root=new THREE.Group();root.name='South Oremindi / resident alpine wildlife';scene.add(root);
 const animals=createWestLife(root,world,{zones:SOUTH_OREMINDI_WILDLIFE_ZONES});let disposed=false;
 return {update(time,dt,point){if(disposed)return;animals.update(dt,point,dt>0);if(dt<=0)animals.setObserver(point);},
  state:()=>({animals:animals.snapshot(),visuals:animals.visualStats()}),
  dispose(){if(disposed)return;disposed=true;animals.dispose();root.removeFromParent();}};
}
