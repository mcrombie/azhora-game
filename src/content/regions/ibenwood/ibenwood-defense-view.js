import * as THREE from 'three';
import { createCharacter } from '../../characters/characters.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';

export const ELVEN_BOUNDARY_TEXT='Elfland. Turn back. Trespassers face lethal arrows beyond the white stones.';

export function createElvenRanger(index=0) {
  const actor=createCharacter({role:'mercenary',armed:true,hat:false,tunic:index%2?0x46533c:0x374a40,skin:0xc9af87,
    look:{weapon:'bow',hair:0x342e23,hairStyle:'short-cropped',headgear:'bare',facialHair:'clean',garment:'jerkin',elven:true}});
  actor.group.name='Elven ranger';actor.group.scale.set(.92,1.09,.92);
  const cloak=createSceneryBuilder('Leaf cut ranger mantle');
  cloak.sheet('#394b3b',[-.28,1.33,-.10],[.28,1.33,-.10],[.23,.72,-.23],[-.22,.78,-.23]);
  cloak.finish(actor.group);
  return actor;
}

function boundaryTexture(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle='#263d32';c.fillRect(0,0,512,256);c.strokeStyle='#d8ddbf';c.lineWidth=8;c.strokeRect(8,8,496,240);
  c.textAlign='center';c.fillStyle='#e4e5c9';c.font='bold 44px Georgia';c.fillText('ELFLAND',256,61);
  c.font='bold 39px sans-serif';c.fillText('TURN BACK',256,115);c.font='26px sans-serif';c.fillText('Lethal archers beyond',256,170);c.fillText('the white stones',256,209);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function createIbenwoodDefenseView({scene,world,markers}) {
  const root=new THREE.Group();root.name='Elfland boundary and rangers';scene.add(root);
  const texture=boundaryTexture(),signMaterial=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,roughness:1,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.18});
  const signs=[],chunks=new Map();
  for(const marker of markers){
    const key=`${Math.floor(marker.x/100)},${Math.floor(marker.z/100)}`;
    if(!chunks.has(key))chunks.set(key,createSceneryBuilder('Elven boundary stones'));
    const s=chunks.get(key),y=world.heightAt(marker.x,marker.z),yaw=Math.atan2(-marker.nx,-marker.nz);
    const stone=marker.boundary,stoneY=world.heightAt(stone.x,stone.z);
    s.frame(stone.x,stoneY,stone.z,yaw,()=>{
      s.rock('#c5ceb7',0,.52,0,.62,.82,.36);s.block('#344b41',0,.56,.27,.065,.69,.07);
      s.beam('#344b41',[-.29,.74,.27],[.29,1.14,.27],.055);s.beam('#344b41',[.29,.74,.28],[-.29,1.14,.28],.055);
    });
    if(marker.sign){s.frame(marker.x,y,marker.z,yaw,()=>{s.block('#786950',-1.48,0,0,.13,3.02,.13);s.block('#786950',1.48,0,0,.13,3.02,.13);});const plane=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.4),signMaterial);plane.position.set(marker.x,y+2.25,marker.z);plane.rotation.y=yaw;root.add(plane);signs.push({...marker,y});}
  }
  for(const s of chunks.values())s.finish(root);
  const actors=new Map(),shaftMaterial=new THREE.MeshBasicMaterial({color:0xcfc29a}),shaftGeometry=new THREE.CylinderGeometry(.018,.024,.85,4),shafts=new Map();
  const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  function actorFor(id){return actors.get(id);}
  function update(view,arrows,time,observer){
    const seen=new Set();
    for(const one of view.actors){
      if(observer&&Math.hypot(one.x-observer.x,one.z-observer.z)>90)continue;
      let actor=actors.get(one.id);if(!actor){actor=createElvenRanger(actors.size);root.add(actor.group);actors.set(one.id,actor);}
      seen.add(one.id);actor.group.visible=true;actor.group.position.set(one.x,one.y,one.z);actor.group.rotation.y=one.yaw;
      actor.animate(time,one.moving?1.25:0,true,{armed:true,draw:one.draw??0,action:one.hp<=0?'dead':'idle',progress:one.hp<=0?1:0});
    }
    for(const [id,actor] of actors)if(!seen.has(id))actor.group.visible=false;
    const inFlight=new Set();
    for(const arrow of arrows){let mesh=shafts.get(arrow.id);if(!mesh){mesh=new THREE.Mesh(shaftGeometry,shaftMaterial);root.add(mesh);shafts.set(arrow.id,mesh);}
      inFlight.add(arrow.id);mesh.position.set(arrow.x,arrow.y,arrow.z);mesh.quaternion.setFromUnitVectors(up,direction.set(arrow.dx,arrow.dy,arrow.dz));}
    for(const [id,mesh]of shafts)if(!inFlight.has(id)){root.remove(mesh);shafts.delete(id);}
  }
  function bowOrigin(id){const actor=actors.get(id),grip=actor?.group.getObjectByName('Bow grip');if(!grip)return null;grip.updateWorldMatrix(true,false);return grip.getWorldPosition(new THREE.Vector3());}
  return {root,signs,actorFor,update,bowOrigin};
}
