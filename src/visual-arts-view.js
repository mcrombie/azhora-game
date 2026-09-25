import * as THREE from 'three';
import { createCharacter } from './characters.js';
import { SYLVIA, SYLVIA_STUDIO } from './visual-arts.js';

const mat=color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true});
function block(parent,material,x,y,z,w,h,d){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function oval(parent,material,x,y,z,w,h,d){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;}

/** Level masonry meets the slope along its whole perimeter, including the step.
 * This is a studio-specific footing, not a change to every house or the terrain. */
function groundedFooting(parent,name,x,z,width,depth,top,groundHeight){
  const positions=[],bottoms=[],corners=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]];
  for(let side=0;side<4;side++){
    const a=corners[side],b=corners[(side+1)%4],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.45);
    for(let i=0;i<steps;i++){
      const point=t=>{const px=x+a[0]+(b[0]-a[0])*t,pz=z+a[1]+(b[1]-a[1])*t;return[px,Math.min(top-.05,groundHeight(px,pz)-.2),pz];};
      const lowA=point(i/steps),lowB=point((i+1)/steps),highA=[lowA[0],top,lowA[2]],highB=[lowB[0],top,lowB[2]];
      positions.push(...highA,...highB,...lowB,...highA,...lowB,...lowA);bottoms.push(lowA,lowB);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,mat(0x929580));mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.groundContacts=bottoms;parent.add(mesh);return mesh;
}

/** Props follow the hands, so the brush really makes small strokes on the canvas. */
export function attachArtTools(actor){
  const right=actor.group.getObjectByName('Right Wrist'),left=actor.group.getObjectByName('Left Wrist');
  const brush=new THREE.Group();brush.name='Painter brush';right?.add(brush);
  block(brush,mat(0x785539),0,-.10,.03,.019,.32,.019);
  block(brush,mat(0xbbb7a2),0,-.26,.03,.023,.045,.023);
  block(brush,mat(0x557357),0,-.298,.03,.035,.04,.018);
  const palette=new THREE.Group();palette.name='Painter palette';left?.add(palette);
  const board=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.018,12),mat(0xbda16d));board.scale.z=.72;board.position.set(-.02,-.03,.08);palette.add(board);
  for(const [x,z,color] of [[-.12,.05,0x4c7250],[-.06,.16,0xe3c376],[.06,.17,0x8da4a3],[.11,.05,0x9a664d]])oval(palette,mat(color),x,-.015,z,.031,.009,.029);
  let active=false;const set=value=>{active=!!value;brush.visible=palette.visible=active;};set(false);
  return{set,get active(){return active;},brush,palette};
}

export function createSylvia(){
  const actor=createCharacter({role:SYLVIA.modelRole,tunic:SYLVIA.color,skin:0xd6b59b,hat:false,look:{hair:0xc1bfb2}});
  actor.group.name='Sylvia the painter';const tools=attachArtTools(actor),animate=actor.animate;
  actor.animate=(time,speed=0,grounded=true,pose={})=>{const painting=speed<.1&&!pose.alert&&!pose.action&&!pose.conversing;
    tools.set(painting);animate(time,speed,grounded,{...pose,painting});};
  actor.artTools=tools;return actor;
}

export function createVisualArtsScenery({root,cottage,groundHeight,colliders}){
  const studio=new THREE.Group();studio.name='Sylvia outdoor painting studio';root.add(studio);
  const house=SYLVIA_STUDIO.house;cottage(house.x,house.z,house.width,house.depth,house.height,0x64745b,0xd6cfb8,0,studio);
  const floor=groundHeight(house.x,house.z);
  groundedFooting(studio,'Sylvia cottage grounded foundation',house.x,house.z,house.width+.35,house.depth+.3,floor+.10,groundHeight);
  groundedFooting(studio,'Sylvia cottage grounded doorstep',house.x,house.z+house.depth/2+.52,1.55,.8,floor+.14,groundHeight);
  const wood=mat(0x876644),paper=mat(0xf0e4c8),green=mat(0x678358),sky=mat(0xa9bdba),bark=mat(0x6f5740);
  // A small timber letterbox marks the footpath without advertising the cottage.
  const mailbox=new THREE.Group(),mailAt=SYLVIA_STUDIO.mailbox;
  mailbox.name='Sylvia cottage mailbox';mailbox.position.set(mailAt.x,groundHeight(mailAt.x,mailAt.z),mailAt.z);
  mailbox.rotation.y=mailAt.yaw;studio.add(mailbox);
  const mailboxPaint=mat(0x607c71),mailboxIron=mat(0x515b53),mailboxSlot=mat(0x293930),brass=mat(0xae935b);
  block(mailbox,wood,0,.51,0,.14,1.02,.14);
  block(mailbox,wood,0,.99,0,.83,.09,.43);
  block(mailbox,wood,0,1.21,0,.70,.40,.42);
  block(mailbox,mailboxPaint,0,1.21,.218,.64,.34,.035);
  block(mailbox,mailboxSlot,0,1.29,.239,.38,.038,.012);
  for(const side of [-1,1])block(mailbox,mailboxIron,side*.20,1.445,0,.43,.065,.53).rotation.z=side*-.20;
  for(const y of [1.13,1.28])block(mailbox,mailboxIron,-.285,y,.244,.065,.029,.020);
  block(mailbox,brass,.245,1.18,.249,.034,.07,.032);
  colliders.push({x:mailAt.x,z:mailAt.z,r:.48,kind:'mailbox'});
  const easels=[];
  for(const [index,at] of [SYLVIA_STUDIO.easel,SYLVIA_STUDIO.practice].entries()){
    const easel=new THREE.Group();easel.name=index?'Sylvia spare easel':'Sylvia painting easel';easel.position.set(at.x,groundHeight(at.x,at.z),at.z);studio.add(easel);
    for(const side of [-1,1])block(easel,wood,side*.29,.73,0,.048,1.48,.05).rotation.z=side*-.12;
    block(easel,wood,0,.61,.27,.05,1.28,.05).rotation.x=.3;
    block(easel,wood,0,.90,-.055,.95,.055,.13);
    block(easel,paper,0,1.23,0,.85,.64,.035);
    if(!index){block(easel,sky,0,1.35,-.023,.78,.32,.008);block(easel,green,0,1.04,-.025,.78,.19,.008);
      block(easel,bark,-.11,1.16,-.032,.032,.28,.008);
      for(const [x,y,r] of [[-.20,1.36,.10],[-.10,1.43,.12],[.02,1.38,.10]])oval(easel,green,x,y,-.034,r,r*.8,.009);
    }
    colliders.push({x:at.x,z:at.z,r:.42,kind:'easel'});easels.push(easel);
  }
  const table=new THREE.Group();table.name='Sylvia pigments and paper';table.position.set(-502.5,groundHeight(-502.5,33),33);studio.add(table);
  block(table,wood,0,.63,0,1.0,.06,.48);for(const x of [-.4,.4])for(const z of [-.17,.17])block(table,wood,x,.31,z,.05,.62,.05);
  block(table,paper,-.18,.68,0,.32,.018,.24);
  for(const [x,color] of [[.12,0x7a9275],[.30,0xb39968]]){const pot=new THREE.Mesh(new THREE.CylinderGeometry(.064,.054,.12,8),mat(color));pot.position.set(x,.72,0);table.add(pot);}
  colliders.push({x:-502.5,z:33,r:.56,kind:'table'});
  return{root:studio,easels,mailbox};
}
