import * as THREE from 'three';
import {createCharacter,groundShadow} from '../../characters/characters.js';
import {TALETH} from '../../quests/lizeem-farmlands/taleth.js';
import {TOWER,TALETH_SPOT} from '../../../app/exploration/tower-state.js';
import {createChronoscope} from './chronoscope.js';

// A single instanced room. Its generous footprint is independent of the tower
// shell; the old adventure's Taleth quests and NPC host are never constructed.
export function createTowerChamber(parent){
  const root=new THREE.Group();root.name='Minora: Taleth’s chamber';root.position.set(TOWER.x,TOWER.y,TOWER.z);parent.add(root);
  const colliders=[],materials=new Map(),geometries=new Set();
  const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true}));return materials.get(color);};
  function mesh(geometry,color,x,y,z){geometries.add(geometry);const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);root.add(m);return m;}
  function box(color,x,y,z,w,h,d,solid=false){
    const m=mesh(new THREE.BoxGeometry(w,h,d),color,x,y+h/2,z);
    if(solid)colliders.push({x:TOWER.x+x,z:TOWER.z+z,hx:w/2,hz:d/2,minY:TOWER.y+y,maxY:TOWER.y+y+h,kind:'tower-furnishing'});
    return m;
  }
  const stone='#b5b3a0',shade='#687779',trim='#dbd2b3',blue='#253e56',gold='#b49352',wood='#534334';
  box('#777b75',0,-.4,0,29,.4,27);
  // Inlaid floor: a clear approach, a quiet central meeting space, and warm
  // masonry at the sides instead of an undifferentiated pale box.
  box('#a3a495',0,0,0,24,.025,22);
  box(blue,0,.03,3.5,4,.035,17);box(gold,-2.1,.032,3.5,.09,.04,17);box(gold,2.1,.032,3.5,.09,.04,17);
  for(const x of [-10,-5,5,10])box(shade,x,.025,0,.05,.018,24);
  for(const z of [-10,-5,0,5,10])box(shade,0,.025,z,26,.018,.05);
  box(stone,-14,0,0,1,10,27,true);box(stone,14,0,0,1,10,27,true);
  box(stone,0,0,-13,29,10,1,true);box(stone,0,0,13,29,10,1,true);
  box(shade,0,10,0,29,.4,27);
  // Vault ribs and deep window recesses echo the needle tower's vertical ribs.
  for(const x of [-12,-6,6,12]){
    box(trim,x,0,-12.3,.7,9.8,.8);
    const rib=box(trim,x,9.3,0,.25,.35,25);rib.rotation.z=x<0?-.025:.025;
  }
  for(const x of [-8,8]){
    box(shade,x,2.6,-12.35,3.8,5.8,.45);
    const pane=box('#97b4b5',x,3,-12.05,2.6,5,.08);
    pane.material=new THREE.MeshStandardMaterial({color:0x8bafbd,emissive:0x729dad,emissiveIntensity:.45});materials.set('window'+x,pane.material);
    box(trim,x,2.7,-11.95,3.7,.28,.8);box(trim,x,5.6,-11.94,2.9,.16,.12);box(trim,x,2.9,-11.94,.14,5.2,.12);
    const light=new THREE.PointLight(0xadcfe4,65,22,2);light.position.set(x,6,-9);root.add(light);
  }
  // The guild's restrained blue hanging frames Taleth; the two meeting river
  // lines refer to this city, rather than either belligerent's standards.
  box(blue,0,3.4,-12.2,4.8,5.3,.12);
  for(const x of [-2.2,2.2])box(gold,x,3.4,-12.1,.065,5.3,.04);
  mesh(new THREE.TorusGeometry(1.05,.07,4,16),gold,0,6.4,-12.03);
  box(trim,0,3.7,-12.02,.075,2.5,.04);
  for(const side of [-1,1]){const line=box(trim,side*.42,5.7,-12.02,.075,1.65,.04);line.rotation.z=-side*.6;}
  // The only exit is a visibly framed door, opened by the same interaction in
  // both directions. No hole can be jumped through before the briefing.
  box(shade,0,0,12.38,4.8,6,.25);box(wood,0,0,12.12,3.9,5.4,.25,true);
  for(const x of [-2.25,2.25])box(trim,x,0,11.98,.38,6.2,.7);
  box(trim,0,5.8,11.98,4.8,.4,.7);box(gold,0,.3,11.96,.08,4.8,.05);
  box(gold,1.35,2.3,11.85,.18,.3,.1);
  // A working scholar's chamber, not a second quest hub.
  for(const side of [-1,1]){
    box(wood,side*12,0,-3,1.4,4.4,8,true);
    for(let level=0;level<4;level++){
      box(gold,side*11.23,.3+level*1.05,-3,.08,.12,8);
      for(let j=0;j<16;j++)box(['#424f65','#786148','#53685d','#8c7856'][j%4],side*11.3,.44+level*1.05,-6.6+j*.46,.6,.52+(j%3)*.12,.3);
    }
    box(wood,side*9,0,8,4,.7,1.3,true);box(trim,side*9,.7,8,4,.12,1.3);
  }
  const chronoscope=createChronoscope(root);
  colliders.push({x:TOWER.x+1,z:TOWER.z-6.5,hx:2.6,hz:1.6,minY:TOWER.y,maxY:TOWER.y+1.65,kind:'tower-furnishing'});
  for(const x of [-4,5]){
    box(gold,x,0,-7,.12,3,.12);mesh(new THREE.ConeGeometry(.32,.7,6),'#f2d394',x,3.2,-7);
    const light=new THREE.PointLight(0xffd19b,32,13,2);light.position.set(x,3.7,-7);root.add(light);
  }
  const taleth=createCharacter({...TALETH,role:TALETH.modelRole,tunic:TALETH.color,armed:false});
  taleth.setArmed(false);taleth.group.name='Taleth — neutral Minora';taleth.group.position.set(TALETH_SPOT.x-TOWER.x,0,TALETH_SPOT.z-TOWER.z);root.add(taleth.group);
  colliders.push({x:TALETH_SPOT.x,z:TALETH_SPOT.z,r:.5,minY:TOWER.y,maxY:TOWER.y+2.1,kind:'taleth'});
  const shadow=groundShadow(.3);shadow.position.copy(taleth.group.position);shadow.position.y=.05;root.add(shadow);
  return {root,colliders,taleth,setChronicle:chronoscope.setChronicle,
    update(time,player,dt=0){chronoscope.update(dt);taleth.animate(time,0,true);if(Math.hypot(player.x-TALETH_SPOT.x,player.z-TALETH_SPOT.z)<6)taleth.group.rotation.y=Math.atan2(player.x-TALETH_SPOT.x,player.z-TALETH_SPOT.z);},
    dispose(){root.removeFromParent();const owned=new Set(materials.values());root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material??[]))owned.add(m);});for(const g of geometries)g.dispose();for(const m of owned)m.dispose();},
  };
}
