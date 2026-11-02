import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {councilRoom,councilPerson,MAYOR_HALL,createMayorHallSupport} from './minora-council.js';
import {createCouncilCharacter} from './council-character.js';
import {councilBanner,disposeCouncilObject} from './council-banner.js';
export function createCouncilChamber(parent,id){
  if(id==='mayor')return createMayorHall(parent);
  const room=councilRoom(id),temple=id==='temple',root=new THREE.Group();root.name=room.room;root.position.set(room.x,room.y,room.z);parent.add(root);
  const b=createSceneryBuilder(room.room+' architecture'),colliders=[],w=room.width,d=room.depth,half=d/2,stone=temple?'#c8c1a9':'#b6b6a1',wood='#624731',gold='#cba85e',trim='#ebe0bd',color=temple?'#943e4c':'#30594d';
  function block(c,x,y,z,width,height,depth,solid=false){b.block(c,x,y,z,width,height,depth);if(solid)colliders.push({x:room.x+x,z:room.z+z,hx:width/2,hz:depth/2,minY:room.y+y,maxY:room.y+y+height,kind:'tower-furnishing'});}
  block('#706e60',0,-.4,0,w,.4,d);block(stone,0,0,0,w-1,.03,d-1);
  block(color,0,.04,3,4,.025,d-9);for(const x of [-2.1,2.1])block(gold,x,.04,3,.08,.03,d-9);
  for(const z of [-half,half])block(stone,0,0,z,w,12,1,true);
  for(const x of [-w/2,w/2])block(stone,x,0,0,1,12,d,true);
  block('#6c7772',0,12,0,w,.5,d);
  for(let z=-half+4;z<half;z+=6){
    block('#93998b',0,.035,z,w-1,.02,.055);
    for(const side of [-1,1]){
      const x=side*(w/2-2);b.cylinder(trim,x,0,z,temple?.6:.35,10);block(gold,x,9.9,z,1.3,.4,1.3);
      colliders.push({x:room.x+x,z:room.z+z,r:temple?.7:.45,minY:room.y,maxY:room.y+10.4,kind:'tower-furnishing'});
      block(trim,x,10.4,z,1,1,d/2>z?3:1);
      block('#416477',side*(w/2-.57),3,z,.15,5,2.7);
      for(const h of [3,5.5,8])block(gold,side*(w/2-.68),h,z,.15,.14,3);
      block(trim,side*(w/2-.7),3,z,.15,5,.12);
    }
  }
  // South door and a wide unobstructed nave/aisle; floor stays level for movement.
  block('#38413c',0,0,half-.6,4.7,6,.3);block(wood,0,0,half-.85,3.9,5.5,.25);
  for(const x of [-2.3,2.3])block(trim,x,0,half-1,.4,6.4,.6);block(trim,0,6,half-1,5,.4,.6);
  const banner=councilBanner(id);banner.scale.setScalar(1.8);banner.position.set(0,7,-half+.65);root.add(banner);
  if(temple){
    block('#e7ddbf',0,0,-half+5,8,1.3,2.5,true);block(gold,0,1.3,-half+5,8.5,.17,2.8);
    for(const x of [-9,9])for(let z=-6;z<half-5;z+=4){block(wood,x,0,z,7,.65,.9,true);block(wood,x,.7,z-.4,7,.85,.18);}
    for(const x of [-5,5]){b.cylinder(gold,x,0,-8,.1,2.7);b.cone('#ffe4a3',x,2.7,-8,.22,.45);}
    for(const x of [-9,9]){b.cylinder('#8b8980',x,0,-half+4,1.2,1.1);b.cylinder('#658c99',x,1.1,-half+4,1,.06);}
  }
  const batch=b.finish(root);batch.material=batch.material.clone();
  const at=councilPerson(id),person=createCouncilCharacter(id);person.group.position.set(at.x-room.x,0,at.z-room.z);root.add(person.group);
  colliders.push({x:at.x,z:at.z,r:.55,minY:room.y,maxY:room.y+2.4,kind:'council-person'});
  for(const x of [-8,8]){const light=new THREE.PointLight(temple?0xffd89b:0xdce8ce,100,35,2);light.position.set(x,6,2);root.add(light);}
  const bounds={minX:room.x-w/2+.6,maxX:room.x+w/2-.6,minZ:room.z-half+.6,maxZ:room.z+half-.6};
  return {root,colliders,bounds,origin:room,person,
    update(time,player){person.animate(time,0,true);if(Math.hypot(player.x-at.x,player.z-at.z)<8)person.group.rotation.y=Math.atan2(player.x-at.x,player.z-at.z);},
    dispose(){disposeCouncilObject(root);}};
}

function createMayorHall(parent){
  const room=councilRoom('mayor'),layout=MAYOR_HALL,s=layout.stair,rise=layout.floorRise;
  const root=new THREE.Group();root.name=room.room;root.position.set(room.x,room.y,room.z);parent.add(root);
  const b=createSceneryBuilder('River Hall / Assembly and upper office'),colliders=[];
  const stone='#c5c0aa',trim='#eee4c9',wood='#644c36',green='#315c50',gold='#bda466';
  function block(c,x,y,z,w,h,d,solid=false){
    b.block(c,x,y,z,w,h,d);
    if(solid)colliders.push({x:room.x+x,z:room.z+z,hx:w/2,hz:d/2,minY:room.y+y,maxY:room.y+y+h,kind:'council-furnishing'});
  }
  block('#777366',0,-.35,0,16,.35,22);
  for(const z of [-11,11])block(stone,0,0,z,16,layout.ceiling,1,true);
  for(const x of [-8,8])block(stone,x,0,0,1,layout.ceiling,22,true);
  block('#626e65',0,layout.ceiling,0,16,.35,22);
  for(const floor of [0,rise]){
    for(const z of [-8,-3,2,7])for(const side of [-1,1]){
      const x=side*7.42;block('#657b7b',x,floor+1.3,z,.12,2.55,1.65);
      for(const h of [1.25,2.55,3.85])block(trim,x-side*.06,floor+h,z,.15,.13,1.9);
      for(const dz of [-.9,0,.9])block(trim,x-side*.07,floor+1.25,z+dz,.15,2.7,.09);
    }
    for(const x of [-7.35,7.35])block(trim,x,floor,0,.18,.22,21);
    for(const z of [-10.35,10.35])block(trim,0,floor,z,15,.22,.18);
  }
  // The slab footprints and the movement decks are the same authored shapes.
  for(const p of layout.upper)block('#a3987d',p.x,rise-.22,p.z,p.w,.22,p.d);
  block(green,.8,.025,4,2.1,.025,11);
  for(const x of [-.31,1.91])block(gold,x,.025,4,.07,.03,11);
  for(let i=0;i<s.steps;i++){
    const depth=(s.startZ-s.endZ)/s.steps,y=(i+.5)/s.steps*rise,z=s.startZ-(i+.5)*depth;
    // Rendered tread matches the centre of the continuous walking ramp.
    block('#d9cfb7',s.x,0,z,s.width,y,depth);
    for(const x of [s.x-s.width/2-.08,s.x+s.width/2+.08]){
      block(wood,x,0,z,.13,y+1.04,depth,true);
      block(gold,x,y+.98,z,.19,.09,depth+.015);
    }
  }
  // A second, level rail protects the upper office's open stairwell edge.
  block(wood,-4.02,rise,1,.15,1.05,12,true);
  block(gold,-4.02,rise+1,1,.21,.1,12);
  block(wood,-5.8,rise,7.07,3.4,1.05,.15,true);
  block(gold,-5.8,rise+1,7.07,3.4,.1,.21);
  // Assembly: common benches, a shared clerk's table and equal office seats.
  block(wood,1,0,-6,7,1,2.1,true);block('#d7c08c',1,1,-6,7.15,.12,2.2);
  for(const x of [-1.5,1,3.5]){
    block(wood,x,0,-8.3,1.3,.6,1.2,true);block(wood,x,.6,-8.85,1.3,1.2,.15);
    block('#e4d9bd',x,1.13,-6,.85,.025,1.1);
  }
  for(const x of [-1.8,3.8])for(const z of [-1,2.3]){
    block(wood,x,0,z,2.5,.6,1,true);block(wood,x,.6,z+.45,2.5,.65,.15);
  }
  for(const x of [-1.5,1,3.5]){const flag=councilBanner(x<0?'taleth':x>2?'temple':'mayor');flag.scale.setScalar(.62);flag.position.set(x,3.2,-10.35);root.add(flag);}
  // Upstairs: a working office and public petitions, not a royal throne room.
  block(green,1,rise+.025,-1.5,5,.025,8);
  block(wood,1.7,rise,-5,4.8,1.03,1.8,true);block('#d4bc88',1.7,rise+1.03,-5,4.95,.13,1.95);
  for(const x of [.3,2,3.5])block('#e8ddbd',x,rise+1.17,-5,.95,.035,.95);
  block(wood,1.7,rise,-7.1,1.4,.65,1.3,true);block(wood,1.7,rise+.65,-7.7,1.4,1.2,.16);
  block(wood,6.5,rise,-4.5,1.2,3.2,8,true);
  for(const y of [.7,1.6,2.5])for(let i=0;i<9;i++)block(i%2?green:'#ab956b',5.84,rise+y,-8+i*.82,.13,.58,.55);
  block(wood,3.8,rise,5.3,3,.65,1.3,true);block(wood,3.8,rise+.65,5.9,3,.65,.15);
  block('#35463e',0,0,10.42,3.3,3.5,.15);
  for(const x of [-1.85,1.85])block(trim,x,0,10.3,.3,3.85,.25);block(trim,0,3.55,10.3,4,.3,.25);
  const banner=councilBanner('mayor');banner.scale.setScalar(.8);banner.position.set(1.7,rise+3.2,-10.35);root.add(banner);
  const batch=b.finish(root);batch.material=batch.material.clone();
  const at=councilPerson('mayor'),person=createCouncilCharacter('mayor');
  person.group.position.set(at.x-room.x,at.y-room.y,at.z-room.z);root.add(person.group);
  colliders.push({x:at.x,z:at.z,r:.55,minY:at.y,maxY:at.y+2.4,kind:'council-person'});
  for(const floor of [0,rise]){const light=new THREE.PointLight(0xf6e3ba,80,24,2);light.position.set(2,floor+3.7,1);root.add(light);}
  const bounds={minX:room.x-7.4,maxX:room.x+7.4,minZ:room.z-10.4,maxZ:room.z+10.4};
  return {root,colliders,bounds,origin:room,person,...createMayorHallSupport(),
    update(time,player){person.animate(time,0,true);if(Math.abs(player.y-at.y)<3&&Math.hypot(player.x-at.x,player.z-at.z)<8)person.group.rotation.y=Math.atan2(player.x-at.x,player.z-at.z);},
    dispose(){disposeCouncilObject(root);}};
}
