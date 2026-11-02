import * as THREE from 'three';
import {createSceneryBuilder} from './scenery-builder.js';

/** Shared articulated geometry. Livestock belongs to the life update, never to
 * baked field scenery: a grazing pose alone does not make a living animal. */
export function createAgricultureSheepModel(){
  const body=createSceneryBuilder('Sheep fleece'),head=createSceneryBuilder('Sheep head'),leg=createSceneryBuilder('Sheep leg');
  const wool=0xeee9da,skin=0xaea18a;
  for(const [x,y,z,rx,ry,rz] of [[0,.64,-.015,.30,.29,.49],[0,.65,.27,.275,.255,.28],[0,.66,-.30,.27,.25,.27],[0,.76,-.045,.25,.17,.37],[0,.48,-.48,.09,.19,.09]])body.rock(wool,x,y,z,rx,ry,rz);
  // Head pivots at the base of the neck; positive X rotation lowers the muzzle.
  const rock=(color,x,y,z,rx,ry,rz)=>head.rock(color,x,y-.55,z-.37,rx,ry,rz);
  rock(skin,0,.74,.46,.14,.20,.15);rock(skin,0,.88,.60,.15,.19,.19);
  rock(0x8d816c,0,.82,.76,.12,.115,.15);rock(wool,0,1.015,.54,.165,.11,.15);
  for(const side of [-1,1]){rock(skin,side*.21,.955,.56,.14,.045,.075);rock(0x292822,side*.135,.935,.70,.027,.029,.025);}
  leg.beam(skin,[0,.52,0],[0,.075,0],.085);leg.block(0x484238,0,0,0,.115,.075,.14);
  const holder=new THREE.Group(),parts={};let material;
  for(const [name,b] of Object.entries({body,head,leg})){const mesh=b.finish(holder);parts[name]=mesh.geometry;material=mesh.material;}
  return {parts,material,dispose(){for(const geometry of Object.values(parts))geometry.dispose();}};
}
