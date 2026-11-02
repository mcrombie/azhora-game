import * as THREE from 'three';
import {batchRigidParts,createCharacter,createHorse,HORSE_COATS} from '../../content/characters/characters.js';

const ROUND=new THREE.SphereGeometry(1,10,8), BOX=new THREE.BoxGeometry(1,1,1);
const TUFT=new THREE.ConeGeometry(1,1,5), UP=new THREE.Vector3(0,1,0);
const SHARED=new Set([ROUND,BOX,TUFT]),COATS=['bay','chestnut','grey'];

function material(color,metal=false){return new THREE.MeshStandardMaterial({color,roughness:metal?.55:.94,metalness:metal?.35:0,flatShading:true});}
function part(parent,geometry,mat,position,scale=[1,1,1]){
  const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...position);mesh.scale.set(...scale);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function round(parent,mat,position,scale){return part(parent,ROUND,mat,position,scale);}
function feature(parent,name,build){const group=new THREE.Group();group.name=name;parent.add(group);build(group);return group;}
function bar(parent,mat,a,b,width,depth=width){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
  const mesh=part(parent,BOX,mat,from.add(to).multiplyScalar(.5).toArray(),[width,delta.length(),depth]);
  mesh.quaternion.setFromUnitVectors(UP,delta.normalize());return mesh;
}
function tuft(parent,mat,position,scale,tilt=0){
  const mesh=part(parent,TUFT,mat,position,scale.map(Math.abs));
  mesh.rotation.z=tilt+(scale[1]<0?Math.PI:0);return mesh;
}
function hideMeshes(root){root.traverse(object=>{if(object.isMesh)object.visible=false;});}

// The rig is already batched. Only batch fresh decoration groups: rebatching
// the rig would flatten its existing vertex colours to white.
function details(joint,name,build,{direct=false}={}){
  const group=feature(joint,name,build),before=new Set();
  group.traverse(o=>{if(o.isMesh)before.add(o.geometry);});batchRigidParts(group,[group]);
  const retained=new Set();group.traverse(o=>{
    if(o.isMesh){retained.add(o.geometry);o.userData.centaurOwnedGeometry=!SHARED.has(o.geometry);}
  });
  for(const geometry of before)if(!SHARED.has(geometry)&&!retained.has(geometry))geometry.dispose();
  if(direct)for(const mesh of [...group.children].filter(child=>child.isMesh))joint.add(mesh);
  return group;
}

function beastHead(head,p){
  hideMeshes(head);
  details(head,'Yunethran beast face',g=>{
    round(g,p.fur,[0,-.065,-.025],[.14,.19,.13]);
    round(g,p.fur,[0,.205,-.005],[.225,.21,.162]);
    for(const side of [-1,1]){
      const cheek=round(g,p.light,[side*.135,.119,.085],[.092,.105,.083]);cheek.rotation.z=side*.27;
    }
    feature(g,'Broad animal muzzle',m=>{
      round(m,p.light,[0,.066,.163],[.139,.093,.095]);
      round(m,p.fur,[0,.187,.134],[.074,.11,.059]);
      round(m,p.light,[0,-.007,.153],[.117,.057,.082]);
      for(const side of [-1,1])round(m,p.light,[side*.061,.051,.217],[.074,.059,.055]);
      const nose=part(m,new THREE.ConeGeometry(.045,.03,3),p.nose,[0,.103,.271]);nose.rotation.set(Math.PI/2,0,Math.PI);
      bar(m,p.dark,[0,.087,.276],[0,.03,.275],.008,.006);
      bar(m,p.dark,[-.067,.011,.251],[0,.026,.273],.006,.007);
      bar(m,p.dark,[0,.026,.273],[.067,.011,.251],.006,.007);
      for(const side of [-1,1])for(const [x,y] of [[.055,.069],[.078,.047]])
        round(m,p.nose,[side*x,y,.266],[.004,.004,.002]);
    });
    for(const side of [-1,1]){
      feature(g,`${side<0?'Left':'Right'} attentive animal ear`,ear=>{
        ear.position.set(side*.193,.353,-.024);ear.rotation.z=-side*.23;
        round(ear,p.mane,[0,.034,-.011],[.077,.086,.047]);
        round(ear,p.fur,[0,.039,.007],[.065,.072,.035]);
        round(ear,p.inner,[0,.048,.033],[.04,.048,.009]);
      });
      feature(g,`${side<0?'Left':'Right'} watchful eye`,eye=>{
        eye.position.set(side*.107,.24,.142);eye.rotation.y=side*.14;
        round(eye,p.dark,[0,0,0],[.042,.02,.013]);
        round(eye,p.eye,[0,0,.009],[.032,.012,.006]);
        round(eye,p.amber,[-side*.003,0,.015],[.013,.012,.004]);
        round(eye,p.dark,[-side*.003,0,.019],[.005,.01,.002]);
        round(eye,p.ivory,[-side*.006,.005,.021],[.003,.003,.001]);
        const brow=round(eye,p.fur,[0,.023,-.001],[.063,.022,.031]);brow.rotation.z=side*.12;
        round(eye,p.light,[side*.003,-.019,.002],[.049,.014,.019]);
      });
    }
    // A pale blaze joins brow and muzzle. The jaw stays closed and thoughtful.
    round(g,p.light,[0,.29,.148],[.029,.073,.012]);
    feature(g,'Layered crown and neck mane',mane=>{
      round(mane,p.mane,[0,.17,-.128],[.254,.288,.13]);
      for(let i=0;i<5;i++){
        const x=(i-2)*.069;
        round(mane,i%2?p.maneLight:p.mane,[x,.398-Math.abs(x)*.3,-.058],[.058,.074,.091]);
      }
      for(const side of [-1,1])for(let i=0;i<5;i++){
        const x=side*(.225+(i<2?i*.023:.046-(i-2)*.039)),y=.3-i*.105;
        round(mane,i%2?p.maneLight:p.mane,[x,y,-.067],[.081,.113,.098]);
        tuft(mane,p.mane,[x+side*.018,y-.08,-.068],[.064,-.155,.067],-side*.35);
      }
      for(const side of [-1,1])feature(mane,`${side<0?'Left':'Right'} bound mane braid`,braid=>{
          for(let i=0;i<4;i++)round(braid,i%2?p.maneLight:p.mane,[side*(.22+(i%2)*.01),-.025-i*.052,.014],[.026,.034,.027]);
          for(const y of [-.065,-.163])part(braid,new THREE.CylinderGeometry(.031,.031,.023,8),p.bronze,[side*.224,y,.014]);
      });
    });
  });
}

function beastTorso(chest,p,envoy){
  // Replace the human tunic with a broad furred chest tapering into withers.
  // All animated limb pivots and their weapon mounts stay intact.
  for(const mesh of chest.children.filter(child=>child.isMesh))mesh.visible=false;
  details(chest,'Furred upper body',g=>{
    part(g,new THREE.CylinderGeometry(.292,.206,.49,10),p.fur,[0,.112,0],[1,1,.58]);
    round(g,p.fur,[0,.262,-.017],[.295,.127,.15]);
    round(g,p.light,[0,.315,-.025],[.143,.18,.131]);
    for(let i=0;i<4;i++)tuft(g,i%2?p.light:p.fur,[(i%2?1:-1)*.035,.21-i*.055,.157],[.07,-.105,.018]);
    feature(g,'Backfall mane',mane=>{
      for(let i=0;i<6;i++)round(mane,i%2?p.mane:p.maneLight,[0,.39-i*.075,-.17],[.123-i*.008,.095,.085]);
      tuft(mane,p.mane,[0,-.067,-.188],[.065,-.16,.05]);
    });
    feature(g,'Worked leather and woven sash',sash=>{
      bar(sash,p.leather,[-.23,.344,.176],[.18,-.11,.176],.074,.029);
      bar(sash,p.cloth,[.23,.35,.204],[-.17,-.115,.204],envoy?.12:.085,.027);
      bar(sash,p.ivory,[.205,.365,.222],[-.195,-.1,.222],.01,.008);
      for(const side of [-1,1])bar(sash,p.leather,[side*.19,.34,.1],[side*.2,.32,-.13],.064,.023);
      part(sash,new THREE.CylinderGeometry(.237,.243,.09,10),p.leather,[0,-.078,0],[1,1,.76]);
      for(const side of [-1,1])round(sash,p.bronze,[side*.195,.32,.14],[.035,.038,.014]);
    });
    feature(g,envoy?'Envoy sun torc':'Yunethran leaf torc',torc=>{
      const ring=part(torc,new THREE.TorusGeometry(.143,.017,5,12),p.bronze,[0,.374,.008],[1,1,.86]);ring.rotation.x=Math.PI/2;
      const leaf=round(torc,p.bronze,[0,.309,.172],[.039,.061,.012]);leaf.rotation.z=.2;
      round(torc,p.jade,[0,.321,.185],[.018,.023,.008]);
      bar(torc,p.ivory,[0,.342,.194],[0,.281,.188],.005,.004);
    });
  },{direct:true});
  for(const side of ['Left','Right']){
    const sign=side==='Left'?-1:1,shoulder=chest.getObjectByName(`${side} Shoulder`),elbow=chest.getObjectByName(`${side} Elbow`);
    details(shoulder,`${side} shoulder fur`,g=>{
      round(g,p.fur,[sign*.013,-.023,-.012],[.118,.109,.111]);
      for(let i=0;i<3;i++)tuft(g,i%2?p.light:p.fur,[sign*(.071+i*.018),-.06-i*.038,-.018],[.042,-.113,.061],sign*.24);
      const ring=part(g,new THREE.TorusGeometry(.089,.011,4,10),p.bronze,[sign*.02,-.145,0]);ring.rotation.x=Math.PI/2;
    });
    details(elbow,`${side} stitched bracer`,g=>{
      part(g,new THREE.CylinderGeometry(.075,.061,.115,8),p.leather,[0,-.094,.008]);
      for(const y of [-.045,-.141])part(g,new THREE.CylinderGeometry(.076,.073,.014,8),p.bronze,[0,y,.008]);
      for(let i=0;i<4;i++)bar(g,p.ivory,[-.022,-.059-i*.019,.079],[.022,-.073-i*.019,.079],.005,.006);
    });
  }
}

function travelDress(spine,p,envoy){
  details(spine,'Centaur woven flankcloths',g=>{
    // Soft flankcloths, never a saddle, seat, reins, or rider's skirt.
    for(const side of [-1,1]){
      part(g,new THREE.CylinderGeometry(.335,.355,.4,8,1,true,side>0?.8:Math.PI+.8,1.55),p.cloth,[0,-.035,-.12],[1,1,1.65]);
      for(const z of [-.42,-.16,.1]){
        bar(g,p.ivory,[side*.345,-.1,z],[side*.358,-.215,z],.014,.014);
        round(g,p.bronze,[side*.349,-.08,z],[.014,.021,.015]);
      }
      for(let i=0;i<5;i++)bar(g,p.ivory,[side*.343,-.23,-.43+i*.125],[side*.354,-.28,-.43+i*.125],.011,.012);
      bar(g,p.leather,[side*.28,.23,.24],[side*.334,-.045,-.36],.043,.032);
    }
    feature(g,envoy?'Envoy document case':'Trail provision roll',caseGroup=>{
      const roll=part(caseGroup,new THREE.CylinderGeometry(.095,.095,.44,8),envoy?p.leather:p.ivory,[-.29,.02,-.54]);roll.rotation.x=.85;
      for(const y of [-.1,.1]){
        const band=part(caseGroup,new THREE.TorusGeometry(.098,.014,4,10),p.bronze,[-.29,y*.65+.02,-.54+y*.75]);band.rotation.x=.72;
      }
    });
  });
}

/** A noble beast-person, with a continuous furred body and four equine legs.
 * The human joint rig supplies hands/weapon poses; none of its face remains. */
export function createCentaur({variant=0,archer=false,envoy=false,clothColor=null,armed=true}={}){
  const index=Math.abs(Math.floor(Number.isFinite(variant)?variant:0))%3,coat=HORSE_COATS[COATS[index]];
  const horse=createHorse({variant:index,saddled:false});
  const human=createCharacter({role:'mercenary',hat:false,armed,tunic:coat.coat,skin:coat.coat,
    look:{hairStyle:'short-cropped',hair:coat.mane,headgear:'bare',facialHair:'clean',jerkin:false,
      garment:'sleeveless',weapon:armed?(archer?'bow':'spear'):undefined,build:'ordinary'}});
  const p={fur:material(coat.coat),light:material(coat.light),mane:material(coat.mane),
    maneLight:material(new THREE.Color(coat.mane).lerp(new THREE.Color(coat.light),.3)),
    nose:material(index===2?0x77716b:0x594439),inner:material(index===2?0x9c8581:0x8b6452),
    dark:material(0x252824),ivory:material(0xd5cba8),eye:material(0x9f997b),amber:material(0xb9a35d),
    cloth:material(clothColor??(envoy?0x507d72:[0x395f62,0x637148,0x5e6b83][index])),leather:material(0x5b4431),
    bronze:material(0xb8a16a,true),jade:material(0x4f8a7e,true)};
  p.cloth.side=THREE.DoubleSide;
  const group=new THREE.Group();group.name=envoy?'Centaur peace envoy':'Yunethran centaur warrior';
  Object.assign(group.userData,{creature:'centaur',legs:4,archer,envoy,appearance:'Yunethran noble beastfolk'});
  const neck=horse.group.getObjectByName('Neck');neck.visible=false;
  const body=human.group.children[0],chest=human.group.getObjectByName('Chest');
  const hiddenLegs=body.children.filter(child=>/^(Left|Right) Hip$/.test(child.name));
  for(const leg of hiddenLegs){leg.visible=false;leg.name='Hidden human leg';}
  const head=human.group.getObjectByName('Head');beastHead(head,p);head.scale.multiplyScalar(.82);
  beastTorso(chest,p,envoy);
  travelDress(horse.group.getObjectByName('Spine'),p,envoy);
  human.group.position.set(0,.58,.47);human.group.scale.setScalar(1.07);
  horse.group.scale.set(1.2,1.18,1.27);group.add(horse.group,human.group);
  const bridge=part(group,new THREE.CylinderGeometry(.24,.32,.36,10),p.fur,[0,1.37,.5],[1,1,.82]);
  bridge.name='Continuous centaur waist';
  const ownedGeometry=new Set([bridge.geometry]);
  group.traverse(object=>{
    if(object.isMesh&&(object.name==='Rigid character batch'||object.userData.centaurOwnedGeometry))ownedGeometry.add(object.geometry);
  });
  let disposed=false;
  return {group,setArmed:human.setArmed,setShield:()=>{},setWeapon:human.setWeapon,
    animate(time,speed=0,grounded=true,pose={}){
      horse.animate(time,speed,grounded,{...pose,grazing:false});human.animate(time,speed*.25,grounded,{...pose,armed:pose.armed??armed});
      for(const leg of hiddenLegs)leg.visible=false;neck.visible=false;
      human.group.position.y=.58+Math.sin(time*(speed>1?8:1.7))*(speed>1?.035:.004);
    },
    dispose(){
      if(disposed)return;disposed=true;group.removeFromParent();
      // Primitive rig geometry and cached batch materials belong to all actors.
      for(const geometry of ownedGeometry)geometry.dispose();
      for(const mat of Object.values(p))mat.dispose();
    }};
}
