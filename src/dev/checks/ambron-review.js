import {ambronGroundTint} from '../../content/regions/ambron/elagos-world.js';
import * as THREE from 'three';
import {createElagosScenerySteps} from '../../content/regions/ambron/elagos-scenery.js';
import {groundWithRiver} from '../../world/terrain/world-terrain.js';
import {AMBRON_PALACE,ambronGroundLevel} from '../../content/regions/ambron/ambron-city-layout.js';
import {AMBRON_HARBOURS,AMBRON_FORTRESSES} from '../../content/regions/ambron/ambron-capital.js';

const scene=new THREE.Scene();scene.background=new THREE.Color('#bbc9c5');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
document.body.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.2,2200);
scene.add(new THREE.HemisphereLight('#fff1ce','#617f74',2.4));
const sun=new THREE.DirectionalLight('#ffe5ad',2.6);sun.position.set(-850,600,-350);sun.target.position.set(-1160,20,0);scene.add(sun.target);scene.add(sun);
sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-540,right:540,top:540,bottom:-540,near:1,far:1500});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.35;sun.shadow.bias=-.00025;
const target=new THREE.Vector3(-1160,24,5);let yaw=.53,pitch=.69,distance=730,drag=null;
function render(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);renderer.render(scene,camera);}
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function build(){
  const positions=[],colors=[],indices=[],color=new THREE.Color(),n=380,minX=-1660,minZ=-455,size=1050;
  for(let j=0;j<=n;j++){
    for(let i=0;i<=n;i++){
      const x=minX+size*i/n,z=minZ+size*j/n,y=groundWithRiver(x,z);
      positions.push(x,y,z);color.set(ambronGroundTint(x,z)??(y<16?'#797f67':(i+j)%3?'#819664':'#879b68'));colors.push(color.r,color.g,color.b);
      if(i&&j){const a=j*(n+1)+i;indices.push(a,a-n-2,a-1,a,a-n-1,a-n-2);}
    }
    if(j%12===0)await frame();
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const terrain=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain);
  const colliders=[],steps=createElagosScenerySteps({parent:scene,heightAt:groundWithRiver,colliders,signs:{place(){},direction(){},notice(){},hanging(){}},roadDistance:()=>Infinity});
  let step,deadline=performance.now()+12;
  do{step=steps.next();if(performance.now()>deadline){await frame();deadline=performance.now()+12;}}while(!step.done);
  const built=step.value;
  document.getElementById('loading').hidden=true;
  const views={overview:{at:[-1190,25,0],yaw:.53,pitch:.77,distance:910},
    palace:{at:[AMBRON_PALACE.x,83,AMBRON_PALACE.z],yaw:.4,pitch:.26,distance:180},
    harbour:{at:[-1010,20,-135],yaw:2.8,pitch:.45,distance:150},
    street:{at:[-1014,21,-68],yaw:1.1,pitch:.65,distance:125},
    fortress:{at:[AMBRON_FORTRESSES[1].x,48,AMBRON_FORTRESSES[1].z],yaw:.65,pitch:.4,distance:135},
    walls:{at:[-1182,39,225],yaw:.25,pitch:.13,distance:150},
    farmland:{at:[-1115,22,325],yaw:.4,pitch:.36,distance:275},
    civic:{at:[-1168,48,-109],yaw:-1.2,pitch:.48,distance:145},
    merchants:{at:[-1111,34,151],yaw:.6,pitch:.65,distance:100},
    records:{at:[-1105,48,-112],yaw:.6,pitch:.37,distance:75},
    market:{at:[-1140,30,5],yaw:.7,pitch:.65,distance:55}};
  function view(id){const v=views[id];target.set(...v.at);yaw=v.yaw;pitch=v.pitch;distance=v.distance;render();return id;}
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
  addEventListener('keydown',e=>{const id=e.key.toLowerCase()==='f'?'market':Object.keys(views)[e.key==='0'?9:Number(e.key)-1];if(id)view(id);});
  window.__AMBRON_REVIEW__={view,metrics:built.metrics,stats:()=>({...renderer.info.render,geometries:renderer.info.memory.geometries}),harbours:AMBRON_HARBOURS,palaceLevel:ambronGroundLevel(AMBRON_PALACE.x,AMBRON_PALACE.z)};
  renderer.shadowMap.needsUpdate=true;view('overview');
}
renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.007;pitch=Math.max(.08,Math.min(1.5,pitch+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};render();});
renderer.domElement.addEventListener('pointerup',()=>drag=null);
renderer.domElement.addEventListener('wheel',e=>{distance=Math.max(18,Math.min(1300,distance*Math.exp(e.deltaY*.001)));render();},{passive:true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);render();});
build().catch(error=>{console.error(error);document.getElementById('loading').textContent=error.message;window.__AMBRON_REVIEW_ERROR__=error.stack;});
