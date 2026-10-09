import * as THREE from 'three';
import {createCharacter,disposeCharacter} from '../../characters/characters.js';
import {TALETH} from '../../quests/lizeem-farmlands/taleth.js';
import {LOOKOUT,LOOKOUT_TALETH} from '../../../app/exploration/tower-state.js';
import {createCourierPigeon} from './courier-pigeon.js';

export function createTowerLookout(parent){
  const root=new THREE.Group();root.name='Wizard Guild / river lookout';root.position.set(LOOKOUT.x,LOOKOUT.y,LOOKOUT.z);parent.add(root);
  const colliders=[],geometries=[],materials=new Map();
  function block(color,x,y,z,w,h,d,solid=false){
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85,flatShading:true}));
    const g=new THREE.BoxGeometry(w,h,d);geometries.push(g);const m=new THREE.Mesh(g,materials.get(color));m.position.set(x,y+h/2,z);root.add(m);
    if(solid)colliders.push({x:LOOKOUT.x+x,z:LOOKOUT.z+z,hx:w/2,hz:d/2,minY:LOOKOUT.y+y,maxY:LOOKOUT.y+y+h,kind:'lookout-stone'});return m;
  }
  block('#c7c8b6',0,-.65,0,22,.65,22);block('#526b78',0,.01,0,5,.04,14);
  for(const v of [-10,10]){block('#d8d4b9',v,0,0,.6,1.1,21,true);block('#d8d4b9',0,0,v,21,1.1,.6,true);for(const z of [-10,0,10]){block('#b9c3ba',v,-10,z,.75,16,.75);block('#b29657',v,5.6,z,1,.22,1);}}
  for(const x of [-10,10])block('#c7c8b6',x,5.8,0,.8,.3,21);
  for(const z of [-10,10])block('#c7c8b6',0,5.8,z,21,.3,.8);
  // A stair hood and homing loft make this a working lookout, without hiding
  // the surrounding country behind a solid room or loading more regions.
  block('#536575',0,0,8,4,2.8,2,true);block('#384b51',0,.02,6.9,3,.06,2);block('#b6a66f',0,2.8,8,4.5,.25,2.5);
  block('#766553',-7,0,5,3,2.2,1.2,true);for(const x of [-8,-7,-6]){block('#203d41',x,1.3,4.36,.65,.55,.05);block('#c4b18a',x,1.22,4.1,.8,.12,.65);}
  const birds=[-8,-7,-6].map((x,i)=>{const b=createCourierPigeon(root);b.root.position.set(x,1.4,4.02);b.root.rotation.y=i*.4;b.flap(0,false);return b;});
  const taleth=createCharacter({...TALETH,role:TALETH.modelRole,tunic:TALETH.color,armed:false});taleth.setArmed(false);taleth.group.position.set(LOOKOUT_TALETH.x-LOOKOUT.x,0,LOOKOUT_TALETH.z-LOOKOUT.z);root.add(taleth.group);
  colliders.push({x:LOOKOUT_TALETH.x,z:LOOKOUT_TALETH.z,r:.5,minY:LOOKOUT.y,maxY:LOOKOUT.y+2.2,kind:'taleth'});
  const shoulder=taleth.group.getObjectByName('Left Shoulder'),elbow=taleth.group.getObjectByName('Left Elbow');let direction=null;
  return {root,colliders,origin:LOOKOUT,bounds:{minX:LOOKOUT.x-9.5,maxX:LOOKOUT.x+9.5,minZ:LOOKOUT.z-9.5,maxZ:LOOKOUT.z+9.5},
    point:value=>{direction=value;},
    update(time,player){taleth.animate(time,0,true);taleth.group.rotation.y=direction?(direction==='east'?Math.PI/2:Math.atan2(80,320)):Math.atan2(player.x-LOOKOUT_TALETH.x,player.z-LOOKOUT_TALETH.z);if(direction&&shoulder&&elbow){shoulder.rotation.set(-1.4,0,-.2);elbow.rotation.x=-.08;}},
    dispose(){disposeCharacter(taleth);for(const b of birds)b.dispose();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();root.removeFromParent();}};
}
