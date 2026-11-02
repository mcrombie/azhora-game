import * as THREE from 'three';
import {createCentaur} from '../../../world/actors/centaur-model.js';
import {batchRigidParts} from '../../characters/characters.js';

const UP=new THREE.Vector3(0,1,0);
// Costume and tools belong to this actor; shared centaur primitives do not.
function craftKit(){
  const geometries=new Set(),materials=new Set(),retained=new Set();
  const geo=g=>(geometries.add(g),g),box=geo(new THREE.BoxGeometry(1,1,1)),round=geo(new THREE.SphereGeometry(1,8,6));
  const material=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9,flatShading:true});materials.add(m);return m;};
  function part(parent,g,m,p,s=[1,1,1]){geometries.add(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(...p);mesh.scale.set(...s);parent.add(mesh);return mesh;}
  const block=(g,m,p,s)=>part(g,box,m,p,s),oval=(g,m,p,s)=>part(g,round,m,p,s);
  function bar(g,m,a,b,width,depth=width){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from),mesh=block(g,m,from.add(to).multiplyScalar(.5).toArray(),[width,delta.length(),depth]);mesh.quaternion.setFromUnitVectors(UP,delta.normalize());return mesh;}
  function batch(joint,name,build){const g=new THREE.Group();g.name=name;joint.add(g);build(g);batchRigidParts(g,[g]);g.traverse(o=>{if(o.isMesh)retained.add(o.geometry);});return g;}
  return {material,part,block,oval,bar,batch,
    finish(){for(const g of geometries)if(!retained.has(g))g.dispose();},
    dispose(){for(const g of retained)g.dispose();for(const m of materials)m.dispose();}};
}

/** Craft clothes and daily hand actions; locomotion stays in the camp host. */
export function createCentaurCampResident(def){
  const look=def.appearance,actor=createCentaur({variant:look.variant,clothColor:look.cloth,armed:false});
  actor.setWeapon(null);actor.setArmed(false);
  const root=actor.group,chest=root.getObjectByName('Chest'),spine=root.getObjectByName('Spine');
  const joint=(side,name)=>chest.getObjectByName(`${side} ${name}`);
  const shoulders=['Left','Right'].map(s=>joint(s,'Shoulder')),elbows=['Left','Right'].map(s=>joint(s,'Elbow'));
  const wrists=['Left','Right'].map(s=>joint(s,'Wrist')),head=chest.getObjectByName('Head');
  const k=craftKit(),cloth=k.material(look.cloth),trim=k.material(look.trim),leather=k.material(0x71513b),wood=k.material(0x99734b),dark=k.material(0x534638),linen=k.material(0xd1c4a0);
  k.batch(chest,`${def.name} / ${look.dress}`,g=>{
    if(look.dress==='mantle'){
      for(const s of [-1,1])k.oval(g,cloth,[s*.235,.265,-.04],[.183,.14,.19]);
      k.block(g,cloth,[0,.03,-.195],[.51,.56,.065]);
      for(const s of [-1,1])k.bar(g,trim,[s*.16,.34,.17],[s*.225,-.13,.18],.034,.02);
      // A household witness cord, without borrowed religious insignia.
      for(let i=0;i<4;i++)k.oval(g,trim,[-.2+i*.13,.105,.209],[.027,.035,.016]);
    }else if(['apron','worker','cook'].includes(look.dress)){
      k.block(g,look.dress==='cook'?linen:leather,[0,.03,.217],[.39,.57,.045]);
      for(const s of [-1,1])k.bar(g,cloth,[s*.12,.34,.15],[s*.145,-.17,.247],.04,.025);
      k.block(g,cloth,[0,-.06,.25],[.25,.1,.024]);
      if(look.dress==='worker')for(let i=0;i<3;i++)k.bar(g,wood,[-.08+i*.08,-.04,.274],[-.08+i*.08,-.13,.274],.018);
    }else{
      k.bar(g,cloth,[-.22,.33,.235],[.18,-.13,.235],.145,.04);
      k.bar(g,trim,[-.247,.32,.26],[.153,-.14,.26],.02,.012);
      if(look.dress==='courier'){
        k.block(g,leather,[.28,-.1,.1],[.18,.26,.14]);
        k.block(g,trim,[.28,.02,.18],[.14,.035,.02]);
      }
    }
  });
  k.batch(spine,`${def.name} / personal travel kit`,g=>{
    if(look.dress==='hunter'){
      const q=k.part(g,new THREE.CylinderGeometry(.085,.065,.5,8),leather,[.32,.11,-.45]);q.rotation.x=-.22;
      for(const z of [-.42,-.46,-.5])k.bar(g,wood,[.32,.18,z],[.32,.57,z+.04],.014);
      for(const z of [-.38,-.42,-.46])k.block(g,linen,[.32,.53,z],[.055,.09,.013]);
    }else if(look.dress==='courier'){
      for(const x of [-.19,.19]){k.block(g,leather,[x,.32,-.46],[.22,.17,.3]);k.bar(g,trim,[x,.42,-.59],[x,.42,-.33],.024);}
    }else{
      k.block(g,cloth,[.32,-.02,-.35],[.16,.28,.27]);
      for(const z of [-.44,-.34,-.24])k.bar(g,trim,[.41,.1,z],[.41,-.13,z],.018);
    }
  });
  const toolHand=look.tool==='bow'?wrists[0]:wrists[1];
  const tool=k.batch(toolHand,`${def.name} / ${look.tool}`,g=>{
    if(look.tool==='bow'){
      const curve=[[-.045,-.67,.08],[.06,-.5,.02],[.14,-.22,0],[.17,0,0],[.14,.22,0],[.06,.5,.02],[-.045,.67,.08]];
      for(let i=1;i<curve.length;i++)k.bar(g,wood,curve[i-1],curve[i],.035);
      k.bar(g,linen,curve[0],curve.at(-1),.006);
      k.block(g,leather,[.17,0,0],[.045,.15,.042]);g.position.x=-.15;
    }else if(look.tool==='ladle'){
      k.bar(g,wood,[0,-.05,0],[0,.58,.02],.025);k.oval(g,wood,[0,.64,.02],[.085,.105,.05]);
    }else if(look.tool==='mallet'){
      k.bar(g,wood,[0,-.05,0],[0,.27,0],.035);k.block(g,dark,[0,.29,0],[.22,.09,.08]);
    }else if(look.tool==='awl'){
      k.bar(g,wood,[0,-.04,0],[0,.08,0],.032);k.bar(g,dark,[0,.08,0],[0,.16,0],.009);
    }else if(look.tool==='tablet'){
      k.block(g,wood,[0,.1,.03],[.24,.3,.025]);k.block(g,dark,[0,.1,.046],[.2,.25,.01]);
      for(let i=0;i<3;i++)k.bar(g,linen,[-.075,.15-i*.06,.056],[.06,.12-i*.06,.056],.008,.005);
    }else{
      for(let i=0;i<6;i++){k.bar(g,leather,[0,.02-i*.048,0],[.01,.02-(i+1)*.048,0],.012);k.oval(g,trim,[0,-i*.048,0],[.018,.023,.018]);}
    }
  });
  k.finish();root.scale.setScalar(look.scale);root.name=`${def.name} / ${def.occupation}`;
  Object.assign(root.userData,{residentId:def.id,community:'The Reed Kin',occupation:def.occupation,gender:def.gender});
  let disposed=false;
  return {group:root,root,metadata:{id:def.id,tool:look.tool,dress:look.dress},
    animate(time,speed=0,{working=false,talking=false}={}){
      if(disposed)return;actor.animate(time,speed,true,{armed:false});
      const work=working&&!talking&&speed<.05,wave=Math.sin(time*2.2);
      tool.visible=!talking;
      if(work){
        shoulders[0].rotation.x=-.55;elbows[0].rotation.x=-.6;
        shoulders[1].rotation.x=-.62;elbows[1].rotation.x=-.7;
        if(look.tool==='mallet'){shoulders[1].rotation.x=-.55-wave*.2;elbows[1].rotation.x=-.7-wave*.22;}
        else if(look.tool==='ladle'){shoulders[1].rotation.x=-.5;shoulders[1].rotation.z=Math.sin(time*1.8)*.11;wrists[1].rotation.z=-.5;}
        else if(look.tool==='bow'){shoulders[0].rotation.x=-.28;elbows[0].rotation.x=-.75;shoulders[1].rotation.x=-.72;wrists[1].rotation.y=wave*.2;}
        else if(look.tool==='awl'){elbows[1].rotation.x=-.8-wave*.13;head.rotation.x=.18;}
        else{elbows[1].rotation.x=-.9;wrists[1].rotation.y=wave*.08;head.rotation.x=.13;}
      }
    },
    dispose(){if(disposed)return;disposed=true;actor.dispose();k.dispose();},
  };
}
