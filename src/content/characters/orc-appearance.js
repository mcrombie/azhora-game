import * as THREE from 'three';
import {batchRigidParts} from './characters.js';

// Replace the stock human face as a whole. Its owned geometry stays attached
// but hidden for normal actor disposal, as with other alternate character heads.
export function addOrcFace(head){
  for(const child of head.children)child.visible=false;
  const face=new THREE.Group();face.name='Orc hairless head';head.add(face);
  const materials=new Map(),parts=[];
  const skin=0x728052,shade=0x4d5b34,light=0x849363,dark=0x282a1b;
  function mesh(name,geometry,color,position,scale=[1,1,1],turn=0){
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85,flatShading:true}));
    const marker=new THREE.Group();marker.name=name;marker.position.set(...position);marker.rotation.z=turn;face.add(marker);
    const m=new THREE.Mesh(geometry,materials.get(color));m.scale.set(...scale);marker.add(m);parts.push(m);return marker;
  }
  const bulk=(name,color,p,s)=>mesh(name,new THREE.IcosahedronGeometry(1,1),color,p,s);
  mesh('Orc neck',new THREE.CylinderGeometry(.095,.105,.14,7),skin,[0,-.025,0]);
  bulk('Orc bare scalp',skin,[0,.235,-.035],[.225,.235,.20]);
  bulk('Orc broad jaw',skin,[0,.065,.105],[.208,.12,.175]);
  bulk('Orc chin',light,[0,.015,.165],[.145,.055,.095]);
  mesh('Orc snarling mouth',new THREE.BoxGeometry(.21,.043,.022),dark,[0,.108,.258], [1,1,1],-.045);
  for(const x of [-.056,0,.056])mesh('Orc bared teeth',new THREE.BoxGeometry(.035,.022,.012),0xd8cca0,[x,.121,.273]);
  for(const side of [-1,1]){
    const ear=mesh('Orc pointed ear',new THREE.ConeGeometry(.068,.255,4),skin,[side*.259,.238,-.035]);ear.rotation.z=-side*1.22;
    bulk('Orc cheekbone',shade,[side*.147,.169,.14],[.09,.073,.092]);
    mesh('Orc deep eye socket',new THREE.BoxGeometry(.105,.043,.025),dark,[side*.088,.244,.202],[1,1,1],side*.22);
    mesh('Orc narrowed amber eye',new THREE.BoxGeometry(.074,.019,.014),0xdbad45,[side*.088,.244,.22],[1,1,1],side*.22);
    mesh('Orc pupil',new THREE.BoxGeometry(.013,.018,.008),dark,[side*.083,.244,.231]);
    // Outer ends rise; inner ends press down toward the nose, never drooping.
    mesh('Heavy orc brow',new THREE.BoxGeometry(.137,.048,.07),shade,[side*.087,.281,.2],[1,1,1],side*.32);
    const tusk=mesh('Orc lower tusk',new THREE.ConeGeometry(.032,.17,6),0xe5d6ac,[side*.121,.142,.279]);tusk.rotation.set(-.18,0,-side*.12);
    bulk('Orc flared nostril',shade,[side*.037,.183,.232],[.029,.022,.03]);
    mesh('Orc nostril',new THREE.BoxGeometry(.018,.012,.008),dark,[side*.034,.178,.258]);
  }
  bulk('Orc flattened nose',skin,[0,.205,.211],[.052,.06,.06]);
  mesh('Orc cheek scar',new THREE.BoxGeometry(.012,.082,.009),0xa19468,[-.158,.173,.229],[1,1,1],-.3);
  mesh('Orc scar stitch',new THREE.BoxGeometry(.034,.007,.01),shade,[-.158,.168,.235],[1,1,1],-.3);
  // The whole face follows one head joint and needs only one draw call.
  batchRigidParts(face,[face]);
  for(const m of parts)m.geometry.dispose();
  for(const mat of materials.values())mat.dispose();
  Object.assign(head.userData,{orcFace:'snarl',hairless:true});
  return face;
}
