import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {scopedWorld} from './scoped-world.js';
import {sourceModule} from './module-loader.js';
import {createAlezhorBankGround} from '../src/content/regions/alezhor/alezhor-bank-ground.js';
import {goldReach} from '../src/content/regions/alezhor/alezhor-world.js';
import {ibenwoodForestTrees} from '../src/content/regions/ibenwood/ibenwood-environment.js';
import {ALEZHOR_WILDLIFE_ZONES} from '../src/content/regions/alezhor/alezhor-wildlife.js';
import {createCelderRouteController} from './celder-route-controller.js';

const scene=new THREE.Scene(),world=await scopedWorld(scene,[64,35]);
scene.updateMatrixWorld(true);
const banks=createAlezhorBankGround(world.ibenwoodRivers),baseline=JSON.parse(readFileSync(new URL('./fixtures/alezhor-corrected-layout.json',import.meta.url)));
const ground=scene.getObjectByName('The ground of Azhora').children.filter(m=>m.isMesh);
for(const mesh of ground)mesh.geometry.computeBoundingBox();
const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
function drawn(x,z){ray.ray.origin.set(x,1000,z);return ray.intersectObjects(ground.filter(m=>{const b=m.geometry.boundingBox;return x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z;}),false)[0]?.point.y??-Infinity;}
const report={scope:'Actual scoped Alezhor plus loaded neighboring forest; retained Float32 triangles, original catalogs and novice controller.',bounds:banks.bounds,edges:[],outerBanks:[],roots:[],route:null};
mkdirSync(new URL('./artifacts/', import.meta.url), {recursive:true});
const save=()=>writeFileSync(new URL('./artifacts/alezhor-bank-review.json',import.meta.url),JSON.stringify(report,null,2)+'\n');

test('the actual gold-outlet bank covers the retained water edges and leaves its deep channel exposed',()=>{
  for(const edge of banks.edges)for(let i=1;i<edge.length;i++){
    const a=edge[i-1],b=edge[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.35);
    for(let j=0;j<n;j++){const t=j/n,along=a.along+(b.along-a.along)*t;if(along < -28 || along > 34)continue;
      const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t,h=drawn(x,z);
      report.edges.push({x,z,along,water:y,drawn:h,gap:y-h});
    }
  }
  report.worstEdge=report.edges.reduce((a,b)=>a.gap>b.gap?a:b);save();
  assert.ok(report.edges.length>250);assert.ok(report.edges.every(p=>Number.isFinite(p.drawn)));
  assert.ok(report.worstEdge.gap<=.08,JSON.stringify(report.worstEdge));
  for(const edge of banks.edges)for(const p of edge)if(p.along>=-20&&p.along<=-3)for(const d of [.5,2,4,6]){
    const x=p.x+p.nx*d,z=p.z+p.nz*d,h=drawn(x,z);report.outerBanks.push({x,z,d,water:p.y,drawn:h,clearance:h-p.y});
  }
  save();assert.ok(report.outerBanks.every(p=>p.clearance>=-.08),'the raised edge joins the outer bank without a dry trough below the waterline');
  for(const along of [15,18,25]){const p=goldReach().samples.reduce((a,b)=>Math.abs(a.along-along)<Math.abs(b.along-along)?a:b);assert.ok(p.surface-drawn(p.x,p.z)>.7,JSON.stringify(p));}
  for(const [x,z] of [[-4100,870],[-4541,900],[-3950,924],[-3600,86],[0,0]])assert.equal(banks.ground(x,z,17.25),17.25,'no remote, west-stream, ford or access change');
});

test('the repaired bank preserves old trees, all Alezhor non-Y transforms, fauna homes and actual root contact',async()=>{
  const hash=createHash('sha256');let batches=0,instances=0;
  world.alezhor.root.traverse(m=>{if(!m.isInstancedMesh)return;batches++;instances+=m.count;hash.update(m.name);const v=m.instanceMatrix.array.slice();for(let i=13;i<v.length;i+=16)v[i]=0;hash.update(Buffer.from(v.buffer));if(m.instanceColor)hash.update(Buffer.from(m.instanceColor.array.buffer));});
  report.layout={batches,instances,hash:hash.digest('hex')};
  assert.deepEqual(report.layout,{batches:baseline.batches,instances:baseline.instances,hash:baseline.hash});
  assert.deepEqual(world.treeRegistry.trees.filter(t=>t.id.startsWith('alezhor-')).map(t=>[t.id,t.species,t.x,t.z]),baseline.trees);
  const waterClear=(x,z,padding=0)=>{const hit=world.ibenwoodRivers.nearest(x,z,20);return !hit||hit.distance>hit.half+padding+2;};
  const oldForest=ibenwoodForestTrees({waterClear}).map(t=>[t.id,t.species,t.x,t.z]);
  assert.deepEqual(world.treeRegistry.trees.filter(t=>t.id.startsWith('ibenwood-regional-')).map(t=>[t.id,t.species,t.x,t.z]),oldForest);
  report.forestTrees=oldForest.length;
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),box=banks.bounds;
  scene.traverse(m=>{if(!m.isInstancedMesh||!(/typed living trunks/.test(m.name)||m.name.endsWith(':trunk')))return;
    const pos=m.geometry.attributes.position;let min=Infinity;for(let v=0;v<pos.count;v++)min=Math.min(min,pos.getY(v));
    for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);matrix.premultiply(m.matrixWorld);const x=matrix.elements[12],z=matrix.elements[14];if(x<box.minX-3||x>box.maxX+3||z<box.minZ-3||z>box.maxZ+3)continue;
      let maxGap=-Infinity;for(let v=0;v<pos.count;v++)if(pos.getY(v)<=min+1e-5){p.fromBufferAttribute(pos,v).applyMatrix4(matrix);maxGap=Math.max(maxGap,p.y-drawn(p.x,p.z));}
      report.roots.push({name:m.name,index:i,x,z,maxGap});
    }
  });
  assert.ok(report.roots.every(r=>Number.isFinite(r.maxGap)&&r.maxGap<=.025),JSON.stringify(report.roots.filter(r=>r.maxGap>.025)));
  const {createWestLife}=await sourceModule('../src/content/regions/western-regions/west-regions-life.js'),life=createWestLife(new THREE.Scene(),world,{zones:ALEZHOR_WILDLIFE_ZONES});
  try{const creatures=life.state().creatures;report.fauna=creatures.map(a=>({id:a.id,x:a.x,z:a.z}));
    // No simulation tick has run: the public live positions are authored homes.
    for(const zone of ALEZHOR_WILDLIFE_ZONES)assert.deepEqual(creatures.filter(a=>a.id.startsWith(zone.id+'-')).map(a=>[a.x,a.z]),zone.sites.map(p=>[...p]));
  }finally{life.dispose();}
  save();
});

test('ordinary novice input walks down the repaired gold bank into water and returns without damage',()=>{
  const p=world.ibenwoodRivers.profiles.find(p=>p.course.id==='ibenwood-central-south-river').samples.at(-3);
  const start={x:p.x-p.nx*(p.half+2),z:p.z-p.nz*(p.half+2)},wet={x:p.x-p.nx*.7,z:p.z-p.nz*.7};
  const controller=createCelderRouteController(world,start),enter=controller.leg(wet),leave=controller.leg(start),final=controller.snapshot();
  report.route={start,wet,enter,leave,final};save();
  assert.ok(enter.complete&&leave.complete,JSON.stringify(report.route));assert.equal(final.damage,0);assert.equal(final.falls.length,0);assert.ok(final.dryFinish);
  assert.ok(final.swum>0&&final.windSpent>0&&final.leastWind>0);assert.ok(final.waterTransitions.some(t=>t.entered)&&final.waterTransitions.some(t=>!t.entered));
});
