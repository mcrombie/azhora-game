import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { registerWorldTree } from '../../../world/scenery/tree-registry.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { IBENWOOD_NAMES, IBENWOOD_GROVES, IBENWOOD_ARRIVALS, IBENWOOD_PATHS, IBENWOOD_PROTECTION, ibenwoodForestTreesSteps, ibenwoodFeatureClear, ibenwoodWaterClear } from './ibenwood-environment.js';

const CHUNK=125;
const geometries={trunk:new THREE.CylinderGeometry(.72,1,1,7),crown:new THREE.IcosahedronGeometry(1,0),veteran:new THREE.IcosahedronGeometry(1,1),fir:new THREE.ConeGeometry(1,1,6),box:new THREE.BoxGeometry(1,1,1)};
const fern=new THREE.BufferGeometry();
fern.setAttribute('position',new THREE.Float32BufferAttribute([-.9,0,0,0,.85,0,.9,0,0,0,0,-.9,0,.85,0,0,0,.9,-.6,0,-.6,0,.7,0,.6,0,.6],3));fern.computeVertexNormals();geometries.fern=fern;
const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.96,flatShading:true});
const fernMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true,side:THREE.DoubleSide});
const tones={
  'grey-vault':['#696653','#446446'],'pale-witness':['#bdb99f','#798963'],bloodoak:['#70432e','#617644'],
  'midnight-elm':['#514a3c','#2c5048'],ridgeback:['#82715a','#537348'],deeproot:['#645743','#3b6650'],
  'silver-birch':['#b2b3a0','#718554'],'silver-fir':['#645a4a','#36594c'],'red-cedar':['#73553e','#4c6550'],
  'stone-pine':['#786448','#6a7447'],'holm-oak':['#766951','#667147'],'black-alder':['#675b4c','#446847'],
  'black-willow':['#706449','#537c54'],'bald-cypress':['#796c55','#647b4d'],sycamore:['#a5a18a','#67844e'],
  beech:['#898776','#58734a'],'white-oak':['#80735c','#5e794c'],'sweet-chestnut':['#77624a','#62844c'],'black-walnut':['#66543e','#496d46'],
};
const conifer=new Set(['silver-fir','red-cedar','stone-pine']);

export function createIbenwoodRegionalScenery(...args) { return finishBuild(createIbenwoodRegionalScenerySteps(...args)); }
export function* createIbenwoodRegionalScenerySteps({parent,heightAt,colliders,renderedGroundHeight=heightAt,waterClear=ibenwoodWaterClear}) {
  let buildWork = 0;
  const root=new THREE.Group();root.name='Ibenwood regional forest';parent.add(root);
  const batches=new Map(),dummy=new THREE.Object3D(),descriptors=[],walkSurfaces=[],walkRoutes=[],walkTreads=[],walkLandings=[],groves=[];
  const builders=new Map();
  const chunkKey=(x,z)=>`${Math.floor(x/CHUNK)},${Math.floor(z/CHUNK)}`;
  function builder(x,z) {const k=chunkKey(x,z);if(!builders.has(k))builders.set(k,createSceneryBuilder(`Ibenwood details ${k}`));return builders.get(k);}
  function part(type,tint,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0) {
    const k=`${chunkKey(x,z)}:${type}`;
    if(!batches.has(k))batches.set(k,{type,parts:[]});
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
    const p={matrix:dummy.matrix.clone(),tint};batches.get(k).parts.push(p);return p;
  }
  function tree(t) {
    const y=renderedGroundHeight(t.x,t.z),[bark,leaf]=tones[t.species],h=t.height,r=t.radius,pieces=[];
    const bole=h*(t.species==='pale-witness'?.9:.76);
    const trunk=part('trunk',bark,t.x,y+bole/2,t.z,r,bole,r);
    const offset=treeGroundingOffset(trunk.matrix,renderedGroundHeight,{radius:1,segments:7,embed:.07});
    trunk.matrix.elements[13]+=offset;pieces.push(trunk);
    const spread=t.species==='grey-vault'?.35:t.species==='pale-witness'?.23:.29;
    for(let j=0;j<(conifer.has(t.species)?3:2);j++) {
      const a=j*Math.PI+t.x*.03,dx=conifer.has(t.species)?0:Math.sin(a)*h*.09,dz=conifer.has(t.species)?0:Math.cos(a)*h*.09;
      pieces.push(part(conifer.has(t.species)?'fir':t.age==='veteran'&&t.harvestable===false?'veteran':'crown',leaf,
        t.x+dx,y+offset+h*(conifer.has(t.species)?.48+j*.17:.76+j*.08),t.z+dz,
        h*spread*(conifer.has(t.species)?1-j*.23:1),h*(conifer.has(t.species)?.45:.19),h*spread*(conifer.has(t.species)?1-j*.23:1),0,a,0));
    }
    if(t.age==='veteran'&&!t.harvestable)for(let j=0;j<4;j++) {
      const a=j*Math.PI/2+.4;
      pieces.push(part('trunk',bark,t.x+Math.sin(a)*r,y+r*.6,t.z+Math.cos(a)*r,r*.4,r*2.3,r*.4,.45*Math.cos(a),0,-.45*Math.sin(a)));
    }
    const collider={x:t.x,z:t.z,r,kind:'tree'};colliders.push(collider);
    descriptors.push({tree:{...t,y,base:{x:t.x,y,z:t.z}},pieces,collider});
  }
  const forest=yield* ibenwoodForestTreesSteps({waterClear});for (const [buildIndex, buildItem] of forest.entries()) { if ((++buildWork & 31) === 0) yield;  tree(buildItem, buildIndex); }
  // Sparse fallen giants and fern mosaics, all kept off useful lanes.
  for (const [i, t] of forest.entries()) { if ((++buildWork & 31) === 0) yield;
    if(i%3===0) {
      const x=t.x+1.7,z=t.z+1.4;
      if(ibenwoodFeatureClear(x,z,.8)&&waterClear(x,z,2))part('fern',t.region==='Central Ibenwood'&&i%201===0?'#a8b497':t.region==='East Ibenwood'?'#6c7950':'#4c7455',x,renderedGroundHeight(x,z),z,1.2,.6+i%4*.13,1.2,0,i,0);
    }
    if(i%173===0) {
      const x=t.x+4,z=t.z+3;
      if(!ibenwoodFeatureClear(x,z,7)||!waterClear(x,z,8))continue;
      const y=renderedGroundHeight(x,z),s=builder(x,z),angle=i*.37;
      s.box('#695a43',x,y+.42,z,.85,.85,7,angle);s.rock('#5e7150',x,y+.8,z,1,.2,2.6,angle);
      for(let j=-6;j<=6;j++){ if ((++buildWork & 31) === 0) yield; colliders.push({x:x+Math.sin(angle)*j*.5,z:z+Math.cos(angle)*j*.5,r:.48,kind:'fallen-log'}); }
    }
    if(t.region==='North Ibenwood'&&i%67===0&&ibenwoodFeatureClear(t.x+3,t.z,3)) {
      const x=t.x+3,z=t.z;builder(x,z).rock('#858979',x,renderedGroundHeight(x,z)+.4,z,1.7,1.1,1.4,i);
      colliders.push({x,z,r:1.4,kind:'rock'});
    }
  }
  // Thin dirt strips follow the rendered ground; many paths end in woodland gaps.
  for(const path of IBENWOOD_PATHS){ if ((++buildWork & 31) === 0) yield; for(let j=1;j<path.points.length;j++) { if ((++buildWork & 31) === 0) yield;
    const a=path.points[j-1],b=path.points[j],length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/3);
    for(let i=0;i<n;i++) { if ((++buildWork & 31) === 0) yield;
      const x=a.x+(b.x-a.x)*(i+.5)/n,z=a.z+(b.z-a.z)*(i+.5)/n;
      if(!waterClear(x,z,2)||Math.hypot(x+3100.0019279391277,z-375.41016151377545)<88)continue;
      builder(x,z).patch('#7e8060',renderedGroundHeight,x,z,1.7,length/n+.12,Math.atan2(b.x-a.x,b.z-a.z),.025,1);
    }
  } }
  function home(s,x,z,y,kind) {
    const stone=kind==='stone',w=stone?7:kind==='branch'?5:8,depth=stone?5:4;
    s.block(stone?'#979b80':'#75634b',x,y,z,w,stone?4.2:3.2,depth);
    if(kind==='root') {s.rock('#53674e',x,y+3.1,z,5,1.4,3);s.beam('#81735a',[x-w/2,y,z+2.2],[x,y+4,z+2.2],.4);}
    else s.roof('#435d50',x,y+(stone?4.2:3.2),z,w+1.4,depth+1.5,kind==='branch'?2.4:1.3);
    s.block('#273d32',x,y,z-depth/2-.025,1.25,2.35,.09);
    for(const dx of [-.8,.8])s.block('#b1b091',x+dx,y,z-depth/2-.1,.22,2.6,.3);
    s.box('#b1b091',x,y+2.6,z-depth/2-.1,1.85,.24,.3);
    s.box('#b9ad7b',x+w*.3,y+2,z-depth/2-.08,.55,.7,.08);
    colliders.push({x,z,hx:w/2,hz:depth/2,minY:y,maxY:y+4.5,kind:'building'});
    return {x,z,y,kind};
  }
  function canopy(g,s) {
    const x=g.x-17,z=g.z-12,start=renderedGroundHeight(x,z),end=renderedGroundHeight(x,g.z+12);
    const top=Math.max(start,end)+8;
    const points=[{x,y:start,z},{x:x+24,y:top,z},{x:x+24,y:top,z:g.z+12},{x,y:end,z:g.z+12}];
    function landing(id,cx,y,cz,width,depth) {
      const surface={id,kind:'deck',a:{x:cx-width/2,y,z:cz},b:{x:cx+width/2,y,z:cz},width:depth};
      walkSurfaces.push(surface);
      const piece=part('box','#806b4e',cx,y-.13,cz,width,.26,depth);
      walkLandings.push({surfaceId:id,x:cx,y,z:cz,width,depth,piece});
      return surface;
    }
    points.forEach((p,i)=>landing(`${g.id}-landing-${i}`,p.x,p.y,p.z,3.5,3.5));
    // Each stair joins the edges of the flat landings, without a raised lip.
    // Rises <= .25m, horizontal treads >= .4m, slope <= .5. Two ground approaches.
    for(let j=1;j<points.length;j++) {
      const from=points[j-1],to=points[j],span=Math.hypot(to.x-from.x,to.z-from.z),ux=(to.x-from.x)/span,uz=(to.z-from.z)/span;
      const a={x:from.x+ux*1.75,y:from.y,z:from.z+uz*1.75},b={x:to.x-ux*1.75,y:to.y,z:to.z-uz*1.75};
      const length=Math.hypot(b.x-a.x,b.z-a.z),rise=b.y-a.y;
      const surface={id:`${g.id}-walk-${j}`,kind:rise?'ramp':'deck',a:{...a},b:{...b},width:3.2};walkSurfaces.push(surface);
      const n=rise?Math.ceil(Math.abs(rise)/.2):Math.ceil(length/2);
      for(let i=0;i<n;i++) {
        const t0=i/n,t1=(i+1)/n,m=(t0+t1)/2,px=a.x+(b.x-a.x)*m,pz=a.z+(b.z-a.z)*m;
        // Tread top follows the linear support to within half a step.
        const y=a.y+rise*m,piece=part('box','#806b4e',px,y-.12,pz,3.2,.24,length/n+.12,0,Math.atan2(b.x-a.x,b.z-a.z),0);
        walkTreads.push({surfaceId:surface.id,x:px,z:pz,y,rise:Math.abs(rise)/n,depth:length/n,piece});
      }
      const nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length;
      for(const side of [-1,1]) {
        s.beam('#695a43',[a.x+nx*side*1.3,a.y-.3,a.z+nz*side*1.3],[b.x+nx*side*1.3,b.y-.3,b.z+nz*side*1.3],.28,.38);
        const aa=[a.x+nx*side*1.8,a.y+1,a.z+nz*side*1.8],bb=[b.x+nx*side*1.8,b.y+1,b.z+nz*side*1.8];
        const at=t=>aa.map((v,i)=>v+(bb[i]-v)*t);
        const rail=(first,last)=>{
          s.beam('#8c7957',first,last,.12);
          // Short height-bounded sections follow the sloping beam and stay solid
          // between its posts, while leaving the space under the stairs open.
          const count=Math.max(1,Math.ceil(Math.hypot(last[0]-first[0],last[2]-first[2])/.5));
          for(let k=0;k<count;k++) {
            const a=first.map((v,i)=>v+(last[i]-v)*k/count),b=first.map((v,i)=>v+(last[i]-v)*(k+1)/count);
            colliders.push({x:(a[0]+b[0])/2,z:(a[2]+b[2])/2,hx:Math.abs(b[0]-a[0])/2+.06,hz:Math.abs(b[2]-a[2])/2+.06,minY:Math.min(a[1],b[1])-1,maxY:Math.max(a[1],b[1])+.1,kind:'canopy-rail'});
          }
        };
        if(j===2&&side===-1) {
          rail(at(0),at((g.z-7.5-a.z)/length));
          rail(at((g.z-1.5-a.z)/length),at(1));
        } else rail(at(0),at(1));
        for(let i=1;i<Math.ceil(length/3);i++) {
          const t=i/Math.ceil(length/3),px=a.x+(b.x-a.x)*t+nx*side*1.8,pz=a.z+(b.z-a.z)*t+nz*side*1.8,py=a.y+rise*t;
          if(j===2&&side===-1&&Math.abs(pz-(g.z-4))<3)continue;
          s.block('#8c7957',px,py,pz,.12,1.05,.12);
        }
      }
    }
    // A broad landing opens sideways toward the exterior branch-home doorway.
    landing(`${g.id}-door-deck`,x+28,top,g.z-4,11,4);
    const approach={x:x+24,y:top,z:g.z-4.5},door={x:x+31,y:top,z:g.z-4.5};
    const dwelling=home(s,x+31,g.z-1.9,top,'branch');
    // Living supports stand outside both walking lanes. Beams visibly meet trunks.
    for(const dz of [-8,8]) {
      const tx=x+29,tz=g.z+dz,ground=renderedGroundHeight(tx,tz);
      tree({id:`${g.id}-support-${dz}`,region:g.region,x:tx,z:tz,height:32,radius:2,age:'veteran',species:'grey-vault',harvestable:false,protectedReason:IBENWOOD_PROTECTION});
      s.beam('#77664b',[tx,ground+5,tz],[x+24,top-.3,tz],.6,.6);
      s.beam('#77664b',[tx,ground+5,tz],[x+24,top-.3,g.z+(dz<0?-12:12)],.55,.55);
    }
    walkRoutes.push({id:`${g.id}-canopy-loop`,points}, {id:`${g.id}-door-approach`,points:[points[0],points[1],approach,door]});
    return dwelling;
  }
  for(const g of IBENWOOD_GROVES) { if ((++buildWork & 31) === 0) yield;
    const s=builder(g.x,g.z),homes=[];
    if(g.kind==='royal') {
      for(let i=0;i<6;i++) { if ((++buildWork & 31) === 0) yield;
        const a=i*Math.PI/3,x=g.x+Math.sin(a)*27,z=g.z+Math.cos(a)*27;
        tree({id:`${g.id}-ancient-${i}`,region:g.region,x,z,height:42+i,radius:3,age:'veteran',species:i%2?'pale-witness':'grey-vault',harvestable:false,protectedReason:IBENWOOD_PROTECTION});
        s.rock('#a5a68d',x+5,renderedGroundHeight(x+5,z)+.6,z,2,1.3,1.4,a);
      }
      s.patch('#7b8463',renderedGroundHeight,g.x,g.z,17,15,0,.03,5);
    } else {
      for(let i=0;i<6;i++) { if ((++buildWork & 31) === 0) yield;
        const a=i*Math.PI/3+.2,x=g.x+Math.sin(a)*(g.radius-5),z=g.z+Math.cos(a)*(g.radius-5);
        tree({id:`${g.id}-shelter-${i}`,region:g.region,x,z,height:25+i,radius:1.3,age:'veteran',species:['ridgeback','deeproot','pale-witness','bloodoak','midnight-elm','grey-vault'][i],harvestable:false,protectedReason:IBENWOOD_PROTECTION});
      }
      homes.push(home(s,g.x-12,g.z+24,renderedGroundHeight(g.x-12,g.z+24),'root'));
      homes.push(home(s,g.x+16,g.z+24,renderedGroundHeight(g.x+16,g.z+24),'stone'));
      if(g.kind!=='root')homes.push(canopy(g,s));
      else tree({id:`${g.id}-root-veteran`,region:g.region,x:g.x-20,z:g.z+15,height:33,radius:2.6,age:'veteran',species:'ridgeback',harvestable:false,protectedReason:IBENWOOD_PROTECTION});
      s.patch('#85876a',renderedGroundHeight,g.x,g.z+18,33,2,0,.03,8);
    }
    groves.push({...g,homes});
  }
  for(const [key,batch] of batches) { if ((++buildWork & 31) === 0) yield;
    const mesh=new THREE.InstancedMesh(geometries[batch.type],batch.type==='fern'?fernMaterial:material,batch.parts.length);
    mesh.name=`Ibenwood chunk ${key}`;mesh.castShadow=batch.type!=='fern';mesh.receiveShadow=true;
    for (const [index, p] of batch.parts.entries()) { if ((++buildWork & 31) === 0) yield; mesh.setMatrixAt(index,p.matrix);mesh.setColorAt(index,new THREE.Color(p.tint));p.handle={mesh,index};}
    mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);
  }
  const trees=[];for(const d of descriptors) { if ((++buildWork & 31) === 0) yield; trees.push(registerWorldTree(colliders,d.tree,d.pieces.map(p=>p.handle),d.collider)); }
  for(const s of builders.values()){ if ((++buildWork & 31) === 0) yield; s.finish(root); }
  let triangles=0,meshes=0;root.traverse(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1);}});
  const perRegion=Object.fromEntries(IBENWOOD_NAMES.map(n=>[n,trees.filter(t=>t.region===n).length]));
  const groveArea=IBENWOOD_GROVES.reduce((a,g)=>a+Math.PI*g.radius*g.radius,0);
  const wildArea=159*8660.254-groveArea-Math.PI*87*87;
  return {root,trees,groves,arrivals:IBENWOOD_ARRIVALS,walkSurfaces,walkRoutes,walkLandings:walkLandings.map(({piece,...t})=>({...t,handle:piece.handle})),walkTreads:walkTreads.map(({piece,...t})=>({...t,handle:piece.handle})),metrics:{trees:trees.length,perRegion,treeBatches:batches.size,staticMeshes:builders.size,meshes,triangles,chunkSize:CHUNK,wildTrees:forest.length,groveTrees:trees.length-forest.length,wildTreesPerHectare:forest.length/wildArea*10000,groveTreesPerHectare:(trees.length-forest.length)/groveArea*10000}};
}
