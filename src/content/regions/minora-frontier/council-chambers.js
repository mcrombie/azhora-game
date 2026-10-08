import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {councilRoom,councilPerson} from './minora-council.js';
import {createCouncilCharacter} from './council-character.js';
import {councilBanner,disposeCouncilObject} from './council-banner.js';
export function createCouncilChamber(parent,id){
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
  }else{
    // Three equal council seats; whose banner leads is a political consequence.
    block(wood,0,0,-9,11,1.05,3.1,true);block('#d4bd83',0,1.05,-9,11.2,.14,3.3);
    for(const x of [-4,0,4]){block(wood,x,0,-12,1.6,.65,1.5,true);block(wood,x,.65,-12.6,1.6,2,.18);}
    for(const x of [-3,3]){block('#e5d9b6',x,1.2,-8.7,2,.025,1.5);for(let i=0;i<4;i++)block('#50696c',x,1.23,-9.2+i*.28,1.4,.01,.025);}
    for(const side of [-1,1]){block(wood,side*12,0,-3,1.5,3.8,9,true);for(let i=0;i<7;i++){block('#b9a176',side*11.2,1,-6+i,.12,.75,.7);block('#737e61',side*11.2,2.5,-6+i,.12,.85,.7);}}
    for(const x of [-8,8])block(wood,x,0,9,5,.65,1.4,true);
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
