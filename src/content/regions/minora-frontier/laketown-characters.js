import * as THREE from 'three';
import {batchRigidParts,createCharacter,disposeCharacter} from '../../characters/characters.js';
import {createDwarf,DWARF_PROPORTIONS} from '../../../world/actors/dwarf-model.js';
import {createCentaur} from '../../../world/actors/centaur-model.js';

export const LAKETOWN_SPECIES=Object.freeze(['human','elf','dwarf','satyr','centaur']);
export const ROWAN_APPEARANCE=Object.freeze({skin:0xe0b796,hair:0xa94c24,hairLight:0xc67438,eyes:0x4c9550,tunic:0x355d48});
const UP=new THREE.Vector3(0,1,0);
const CLOTH=[0x617868,0x8c6c51,0x596f81,0x957952,0x6f637b,0x728158];
const HAIR=[0x523c2b,0x956034,0x352c26,0xb18143,0x73675b,0x8f4428];
const SKIN=[0xd2aa86,0xb88d68,0xe0bc9c,0xa67c58,0xc6a28a,0xd6ad7f];

/** Fresh decoration is batched per joint, never by rebatching the coloured rig.
 * All temporary primitives are per actor: disposeCharacter may safely own them. */
function detailKit(){
  const geos=new Set(),mats=new Set(),geo=g=>(geos.add(g),g);
  const round=geo(new THREE.SphereGeometry(1,8,6)),box=geo(new THREE.BoxGeometry(1,1,1));
  const material=(color,metal=false)=>{const m=new THREE.MeshStandardMaterial({color,roughness:metal?.62:.94,metalness:metal?.25:0,flatShading:true});mats.add(m);return m;};
  function part(parent,g,mat,p,s=[1,1,1]){geos.add(g);const mesh=new THREE.Mesh(g,mat);mesh.position.set(...p);mesh.scale.set(...s);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function oval(parent,mat,p,s){return part(parent,round,mat,p,s);}
  function block(parent,mat,p,s){return part(parent,box,mat,p,s);}
  function bar(parent,mat,a,b,width,depth=width){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);const m=block(parent,mat,from.add(to).multiplyScalar(.5).toArray(),[width,delta.length(),depth]);m.quaternion.setFromUnitVectors(UP,delta.normalize());return m;}
  function feature(parent,name,build){const g=new THREE.Group();g.name=name;parent.add(g);build(g);return g;}
  function details(parent,name,build){const g=feature(parent,name,build);batchRigidParts(g,[g]);return g;}
  function finish(root){const retained=new Set();root.traverse(o=>{if(o.isMesh){retained.add(o.geometry);for(const m of [].concat(o.material))retained.add(m);}});for(const resource of [...geos,...mats])if(!retained.has(resource))resource.dispose();}
  return {part,oval,block,bar,feature,details,material,finish};
}

function rigOf(group){
  const joint=name=>group.getObjectByName(name);
  return {body:joint('Weight and hips'),chest:joint('Chest'),head:joint('Head'),
    ...Object.fromEntries([['shoulders','Shoulder'],['elbows','Elbow'],['wrists','Wrist'],['hips','Hip'],['knees','Knee'],['ankles','Ankle']]
      .map(([key,name])=>[key,['Left','Right'].map(side=>joint(`${side} ${name}`))]))};
}

function wrap(actor,metadata,{animateAfter=null}={}){
  const group=actor.group,rig=rigOf(group),info=Object.freeze(metadata);let disposed=false;
  group.name=metadata.name;Object.assign(group.userData,{creature:metadata.species,laketownResident:true,...metadata});
  actor.setWeapon?.(null);actor.setArmed?.(false);
  return {group,root:group,rig,metadata:info,
    // Absolute seconds; 0 = idle, 1 = a relaxed walking pace. The host owns paths.
    animate(time,pace=0,pose={}){
      if(disposed)return;const t=Number.isFinite(time)?time:0,p=Number.isFinite(pace)?THREE.MathUtils.clamp(pace,0,1):0;
      actor.animate(t,p*2.1,true,{...pose,armed:false});animateAfter?.(t,p);
    },
    setFishing(value){return !disposed&&!!actor.setFishing?.(value);},
    fishingTip(){return disposed?null:actor.fishingTip?.()??null;},
    dispose(){if(disposed)return;disposed=true;if(actor.dispose)actor.dispose();else disposeCharacter(actor);},
  };
}

function rowanFace(head,k){
  // The original batched face remains owned by the rig but is not rendered.
  head.traverse(o=>{if(o.isMesh)o.visible=false;});
  const p={skin:k.material(ROWAN_APPEARANCE.skin),rose:k.material(0xd79e80),hair:k.material(ROWAN_APPEARANCE.hair),light:k.material(ROWAN_APPEARANCE.hairLight),
    shadow:k.material(0x73391e),white:k.material(0xf0e8d2),iris:k.material(ROWAN_APPEARANCE.eyes),pupil:k.material(0x26362a),lip:k.material(0x9c6553),bronze:k.material(0xb49b65,true)};
  k.details(head,'Rowan / young face, copper curls and long beard',g=>{
    k.oval(g,p.skin,[0,-.032,-.008],[.074,.115,.075]);
    k.oval(g,p.skin,[0,.185,.008],[.186,.222,.169]);
    for(const s of [-1,1]){
      k.oval(g,p.skin,[s*.181,.187,0],[.044,.059,.038]);
      k.oval(g,p.rose,[s*.198,.189,.025],[.017,.031,.012]);
      k.oval(g,p.skin,[s*.116,.136,.129],[.067,.055,.038]);
      k.feature(g,`${s<0?'Left':'Right'} green eye`,eye=>{
        k.oval(eye,p.white,[s*.065,.232,.169],[.042,.023,.014]);
        k.oval(eye,p.iris,[s*.062,.232,.183],[.021,.021,.006]);
        k.oval(eye,p.pupil,[s*.061,.232,.189],[.009,.014,.003]);
        k.oval(eye,p.white,[s*.061-.006,.24,.193],[.004,.005,.002]);
        const brow=k.oval(eye,p.hair,[s*.066,.277,.158],[.052,.012,.019]);brow.rotation.z=-s*.09;
      });
    }
    k.oval(g,p.rose,[0,.18,.184],[.032,.039,.039]);
    k.oval(g,p.lip,[0,.116,.166],[.043,.009,.01]);
    // Smooth unlined cheeks and a full, unbroken crown keep the long beard youthful.
    k.feature(g,'Rowan / full curly red crown',hair=>{
      k.oval(hair,p.hair,[0,.292,-.056],[.204,.145,.189]);
      for(let row=0;row<3;row++)for(let i=0;i<9;i++){
        const a=i*Math.PI*2/9+(row%2)*.25,r=.174-row*.034;
        k.oval(hair,(i+row)%4===0?p.light:p.hair,[Math.sin(a)*r,.275+row*.055,-.04+Math.cos(a)*r],[.062,.052,.065]);
      }
      for(const s of [-1,1])for(let i=0;i<4;i++)k.oval(hair,i%3?p.hair:p.light,[s*(.177+(i%2)*.012),.245-i*.065,-.043-i*.018],[.044,.055,.054]);
      for(let i=0;i<5;i++)k.oval(hair,i%2?p.hair:p.light,[(i-2)*.069,.325+Math.sin(i)*.015,.137],[.052,.049,.05]);
    });
    k.feature(g,'Rowan / long curled red beard',beard=>{
      for(const [y,z,w,h]of [[.057,.126,.145,.103],[-.07,.145,.13,.1],[-.205,.166,.091,.095],[-.315,.177,.045,.073]])
        k.oval(beard,p.hair,[0,y,z],[w,h,.079]);
      for(const s of [-1,1]){
        for(let row=0;row<6;row++){
          const width=.131-row*.017;
          k.oval(beard,row%3===0?p.light:p.hair,[s*width,.089-row*.075,.172+row*.008],[.038-row*.003,.05,.044]);
        }
        const moustache=k.oval(beard,p.hair,[s*.047,.137,.19],[.054,.018,.02]);moustache.rotation.z=s*.17;
      }
      for(let i=0;i<5;i++)k.oval(beard,i%2?p.light:p.hair,[(i%2?1:-1)*.018,.01-i*.075,.225],[.033,.046,.022]);
      k.block(beard,p.bronze,[0,-.293,.24],[.061,.026,.014]);
    });
  });
}

/** Councillor Rowan: a young, thoughtful adult with copper curls and green eyes. */
export function createLaketownCouncilMember(){
  const actor=createCharacter({role:'mercenary',hat:false,armed:false,skin:ROWAN_APPEARANCE.skin,tunic:ROWAN_APPEARANCE.tunic,
    look:{build:'ordinary',hairStyle:'short-cropped',hair:ROWAN_APPEARANCE.hair,facialHair:'clean',headgear:'bare',garment:'tunic',jerkin:false}});
  const k=detailKit(),rig=rigOf(actor.group);rowanFace(rig.head,k);
  const cloak=k.material(0x426e55),edge=k.material(0xa6b58b),linen=k.material(0xe1d1a8),bronze=k.material(0xb49b65,true),leather=k.material(0x795a3b);
  k.details(rig.chest,'Rowan / council mantle and leaf clasp',g=>{
    for(const s of [-1,1]){
      k.oval(g,cloak,[s*.19,.305,-.03],[.15,.075,.18]);
      k.bar(g,edge,[s*.105,.347,.15],[s*.142,.08,.176],.032,.018);
    }
    k.block(g,linen,[0,.325,.146],[.11,.067,.03]);
    k.oval(g,bronze,[.105,.28,.19],[.033,.05,.014]).rotation.z=-.35;
    k.bar(g,leather,[-.19,.28,.168],[.16,-.15,.171],.032,.022);
    k.block(g,leather,[.21,-.19,.037],[.14,.21,.1]);
    k.block(g,linen,[.21,-.076,.037],[.106,.035,.07]);
  });
  k.finish(actor.group);
  return wrap(actor,{name:'Councillor Rowan',species:'human',occupation:'council representative',gender:'male',appearance:ROWAN_APPEARANCE,age:'young adult',height:1.8});
}

function elfDetails(actor,k,index){
  const rig=rigOf(actor.group),cloth=k.material(CLOTH[index]),trim=k.material(0xbac5a0),wood=k.material(0x765f3f);
  rig.body.scale.set(.91,1.08,.91);rig.head.scale.set(1.02,.94,1.02);
  k.details(rig.chest,'Elven woven leaf collar',g=>{
    for(const s of [-1,1]){
      k.bar(g,trim,[s*.12,.35,.14],[s*.05,.22,.18],.025,.013);
      k.oval(g,cloth,[s*.2,.29,-.047],[.12,.064,.17]);
    }
    k.oval(g,wood,[0,.22,.193],[.026,.04,.012]);
  });
}

function satyrDetails(actor,k,index){
  const rig=rigOf(actor.group),fur=k.material([0x77583c,0x94704a,0x584633][index%3]),light=k.material(0xb18c5f),hoof=k.material(0x3c3930),horn=k.material(0xbab08b),inner=k.material(0xb8916f);
  k.details(rig.head,'Satyr / swept horns and woodland ears',g=>{
    for(const s of [-1,1]){
      k.feature(g,`${s<0?'Left':'Right'} satyr horn`,h=>{
        const path=[[s*.14,.339,-.064],[s*.19,.447,-.096],[s*.215,.49,-.17],[s*.22,.456,-.235],[s*.2,.406,-.25]];
        for(let i=0;i<path.length-1;i++){
          const a=new THREE.Vector3(...path[i]),b=new THREE.Vector3(...path[i+1]),d=b.clone().sub(a);
          const mesh=k.part(h,new THREE.CylinderGeometry(.038-i*.008,.047-i*.008,d.length()+.006,7),horn,a.add(b).multiplyScalar(.5).toArray());
          mesh.quaternion.setFromUnitVectors(UP,d.normalize());
        }
      });
      const ear=k.oval(g,fur,[s*.256,.196,-.011],[.12,.044,.038]);ear.rotation.z=s*.27;
      const inset=k.oval(g,inner,[s*.265,.203,.018],[.081,.024,.014]);inset.rotation.z=s*.27;
    }
  });
  for(let i=0;i<2;i++){
    const side=i?'Right':'Left';
    for(const joint of [rig.hips[i],rig.knees[i],rig.ankles[i]])for(const child of joint.children)if(child.isMesh)child.visible=false;
    k.details(rig.hips[i],`${side} satyr furred thigh`,g=>{
      k.oval(g,fur,[0,-.155,-.012],[.112,.201,.12]);
      for(let n=0;n<4;n++)k.oval(g,n%2?fur:light,[(n%2?1:-1)*.056,-.1-n*.054,.046],[.057,.065,.049]);
    });
    k.details(rig.knees[i],`${side} satyr hock`,g=>{
      k.oval(g,fur,[0,-.052,-.035],[.086,.13,.094]);
      k.oval(g,fur,[0,-.143,-.068],[.067,.071,.07]);
      k.bar(g,fur,[0,-.135,-.069],[0,-.292,.019],.073,.082);
    });
    k.details(rig.ankles[i],`${side} satyr cloven hoof`,g=>{
      for(const split of [-1,1]){
        k.block(g,hoof,[split*.043,-.064,.061],[.073,.115,.169]);
        k.oval(g,fur,[split*.036,-.015,.027],[.047,.046,.065]);
      }
    });
  }
}

/** Mixed, unarmed residents. Occupation is descriptive, not economic headcount.
 * A fisherman can call setFishing(true), or pose the exposed rig for a boat.
 * Human hip pivots sit .74m above the actor origin, knees .325m below the hips. */
export function createLaketownResident({species='human',variant=0,occupation='resident',gender=null}={}){
  if(!LAKETOWN_SPECIES.includes(species))throw new RangeError(`Unknown Laketown species: ${species}`);
  const index=Math.abs(Number.isFinite(variant)?Math.trunc(variant):0)%6,sex=gender??(index%2?'female':'male'),work=String(occupation).toLowerCase();
  if(species==='centaur'){
    const actor=createCentaur({variant:index,envoy:false});
    return wrap(actor,{name:`Laketown centaur ${occupation}`,species,occupation,gender:sex,variant:index,height:3.05});
  }
  const female=sex==='female';
  const actor=species==='dwarf'&&!female?createDwarf({variant:index,role:/cooper|boatwright|smith/.test(work)?'artisan':'resident'}):
    createCharacter({role:'mercenary',hat:false,armed:false,skin:SKIN[index],tunic:CLOTH[index],look:{build:'ordinary',headgear:'bare',
      hair:HAIR[index],hairStyle:female?(species==='elf'?'long':'long-tied'):species==='satyr'?'curls':index%3===2?'ponytail':'short-cropped',
      facialHair:female||species==='elf'?'clean':species==='satyr'?'forked':index%3===0?'trimmed':'clean',
      garment:/fisher|cooper|boatwright|reed.?worker/.test(work)?'bare-forearms':'tunic',jerkin:false,elven:species==='elf',slight:female}});
  if(species==='dwarf'&&!female){
    // The dwarf factory's apron/tool boxes are shared primitives outside the
    // general character cache. Give this disposable town actor its own copy.
    const copied=new Map();actor.group.traverse(mesh=>{
      if(!mesh.isMesh||!/^(Dwarf|Mallet)/.test(mesh.name))return;
      if(!copied.has(mesh.geometry))copied.set(mesh.geometry,mesh.geometry.clone());mesh.geometry=copied.get(mesh.geometry);
    });
  }
  const k=detailKit(),rig=rigOf(actor.group);
  if(species==='elf')elfDetails(actor,k,index);
  else if(species==='satyr')satyrDetails(actor,k,index);
  else if(species==='dwarf'&&female){
    rig.body.scale.set(DWARF_PROPORTIONS.girth,DWARF_PROPORTIONS.height,DWARF_PROPORTIONS.depth);rig.head.scale.set(.88,1.28,1);
    const leather=k.material(0x6b5039),trim=k.material(0xbaa37c);
    k.details(rig.chest,'Dwarf craft apron',g=>{k.block(g,leather,[0,.07,.194],[.37,.49,.047]);k.block(g,trim,[.07,.12,.222],[.12,.11,.014]);});
  }
  k.finish(actor.group);
  return wrap(actor,{name:`Laketown ${species} ${occupation}`,species,occupation,gender:sex,variant:index,
    height:species==='elf'?1.94:species==='dwarf'?1.38:species==='satyr'?1.9:1.8});
}
