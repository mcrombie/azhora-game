import * as THREE from 'three';
import {groundWithRiver} from '../../world/terrain/world-terrain.js';
import {westWaterSurface} from '../../content/regions/western-regions/west-ground.js';
import {SEA_LEVEL} from '../../world/terrain/region-world.js';
import {createAevisScenerySteps} from '../../content/regions/aevis/aevis-scenery.js';
import {createNylonScenerySteps} from '../../content/regions/nylon/nylon-scenery.js';
import {nylonHarborDeckHeight} from '../../content/regions/nylon/nylon-city.js';
import {createSelamusScenerySteps} from '../../content/regions/selamus/selamus-scenery.js';
import {createSelamusHarborSteps} from '../../content/regions/selamus/selamus-harbor.js';
import {SELAMUS_VIEWS,selamusTint} from '../../content/regions/selamus/selamus-city.js';
import {createPyraScenerySteps} from '../../content/regions/pyra/pyra-scenery.js';
import {PYRA_VIEWS,pyraTint,pyraPoint} from '../../content/regions/pyra/pyra-world.js';
import {createMithalaCityScenerySteps} from '../../content/regions/mithala/mithala-city-scenery.js';
import {mithalaDeckHeight,mithalaDistrictAt} from '../../content/regions/mithala/mithala-city.js';

const view=(eye,target)=>({eye:{x:eye[0],y:eye[1],z:eye[2]},target:{x:target[0],y:target[1],z:target[2]}});
const configs={
  aevis:{name:'Aevis',build:createAevisScenerySteps,box:[-1030,1780,260,245],tint:()=>0xa5a179,
    views:{overview:view([-1085,180,2050],[-920,12,1890]),street:view([-960,13,1864],[-905,9,1864]),citadel:view([-937,49,1890],[-948,23,1846]),harbor:view([-820,58,1808],[-910,10,1870])}},
  nylon:{name:'Nylon',build:createNylonScenerySteps,box:[-1460,990,340,400],tint:()=>0x9ca475,height:(x,z)=>nylonHarborDeckHeight(x,z)??groundWithRiver(x,z),
    views:{overview:view([-1130,205,1370],[-1314,24,1160]),street:view([-1309,14,1141],[-1332,28,1092]),library:view([-1318,31,1135],[-1334,32,1091]),harbor:view([-1178,115,1390],[-1290,42,1230]),'sea gate':view([-1288,69,1460],[-1288,63,1300])}},
  selemis:{name:'Selemis',build:createSelamusScenerySteps,extra:createSelamusHarborSteps,box:[-1110,2200,600,505],tint:selamusTint,
    views:{overview:SELAMUS_VIEWS.selamus,street:SELAMUS_VIEWS['selamus-canal'],palace:SELAMUS_VIEWS['selamus-temple'],rooftops:SELAMUS_VIEWS['selamus-rooftops']}},
  pyra:{name:'Pyra',build:createPyraScenerySteps,box:[-3200,855,520,490],tint:pyraTint,
    views:{overview:PYRA_VIEWS.pyra,street:{eye:pyraPoint(134,45,36),target:pyraPoint(65,42,36)},palace:PYRA_VIEWS['pyra-palace'],bridge:PYRA_VIEWS['pyra-bridge']}},
  mithala:{name:'Mithala',build:createMithalaCityScenerySteps,box:[-1880,-1650,350,435],height:(x,z)=>mithalaDeckHeight(x,z)??groundWithRiver(x,z),tint:(x,z)=>mithalaDistrictAt(x,z)?0xb4a17a:null,
    views:{overview:view([-1475,272,-1110],[-1700,17,-1440]),street:view([-1686,23,-1319],[-1701,24,-1360]),fork:view([-1671,90,-1372],[-1750,21,-1434]),north:view([-1610,118,-1592],[-1696,24,-1528]),quays:view([-1543,91,-1341],[-1648,22,-1440])}}
};
const id=new URLSearchParams(location.search).get('city')||'aevis',config=configs[id]??configs.aevis;
document.getElementById('title').textContent=config.name;document.getElementById('city').value=id;
document.getElementById('city').onchange=e=>location.search=`?city=${e.target.value}`;
const scene=new THREE.Scene();scene.background=new THREE.Color('#bbc9c5');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;document.body.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.15,2400),target=new THREE.Vector3();let yaw=0,pitch=.7,distance=300,drag=null;
scene.add(new THREE.HemisphereLight('#fff1d5','#617970',2.1));
const sun=new THREE.DirectionalLight('#fff0d0',2.5),[mx,mz,sx,sz]=config.box,cx=mx+sx/2,cz=mz+sz/2;
sun.position.set(cx+180,400,cz+80);sun.target.position.set(cx,0,cz);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-350,right:350,top:350,bottom:-350,near:1,far:900});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.24;sun.shadow.bias=-.0002;
function render(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);renderer.render(scene,camera);}
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function consume(steps){let next,end=performance.now()+12;do{next=steps.next();if(performance.now()>end){await frame();end=performance.now()+12;}}while(!next.done);return next.value;}
async function build(){
  const pos=[],cols=[],indices=[],water=[],color=new THREE.Color(),nx=Math.ceil(sx/1.8),nz=Math.ceil(sz/1.8);
  for(let j=0;j<=nz;j++){
    for(let i=0;i<=nx;i++){
      const x=mx+sx*i/nx,z=mz+sz*j/nz,y=groundWithRiver(x,z);
      pos.push(x,y,z);color.set(config.tint(x,z)??0x8b9b70);cols.push(color.r,color.g,color.b);
      if(i&&j){const a=j*(nx+1)+i;indices.push(a,a-nx-2,a-1,a,a-nx-1,a-nx-2);
        const x0=x-sx/nx,z0=z-sz/nz,w=westWaterSurface((x+x0)/2,(z+z0)/2);
        if(w!==null&&w>SEA_LEVEL+.03)water.push(x0,w,z0,x0,w,z,x,w,z,x0,w,z0,x,w,z,x,w,z0);
      }
    }
    if(j%8===0)await frame();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const terrain=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain);
  const wm=new THREE.MeshStandardMaterial({color:'#6b9ea4',roughness:.36,metalness:.1});
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(sx*2,sz*2),wm);sea.rotation.x=-Math.PI/2;sea.position.set(cx,SEA_LEVEL,cz);scene.add(sea);
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(water,3));wg.computeVertexNormals();scene.add(new THREE.Mesh(wg,wm));
  const colliders=[],kit={parent:scene,colliders,heightAt:config.height??groundWithRiver,groundHeight:groundWithRiver};
  const city=await consume(config.build(kit));if(config.extra)await consume(config.extra(kit));
  function select(name){const v=config.views[name];if(!v)return;target.copy(v.target);const delta=new THREE.Vector3().copy(v.eye).sub(target);distance=delta.length();yaw=Math.atan2(delta.x,delta.z);pitch=Math.asin(delta.y/distance);render();}
  for(const [i,name] of Object.keys(config.views).entries()){const b=document.createElement('button');b.textContent=`${i+1} · ${name[0].toUpperCase()+name.slice(1)}`;b.onclick=()=>select(name);document.getElementById('views').append(b);}
  addEventListener('keydown',e=>{const name=Object.keys(config.views)[Number(e.key)-1];if(name)select(name);});
  document.getElementById('loading').hidden=true;renderer.shadowMap.needsUpdate=true;select('overview');
  window.__CITY_REVIEW__={view:select,views:Object.keys(config.views),metrics:city.metrics,placements:city.detail?.placements,stats:()=>({...renderer.info.render,geometries:renderer.info.memory.geometries})};
}
renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.007;pitch=Math.max(-.2,Math.min(1.5,pitch+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};render();});
renderer.domElement.addEventListener('pointerup',()=>drag=null);
renderer.domElement.addEventListener('wheel',e=>{distance=Math.max(8,Math.min(1700,distance*Math.exp(e.deltaY*.001)));render();},{passive:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render();});
build().catch(error=>{console.error(error);document.getElementById('loading').textContent=error.message;window.__CITY_REVIEW_ERROR__=error.stack;});
