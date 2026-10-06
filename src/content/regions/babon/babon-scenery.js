/** Babon's living forest: tall closed canopy, buttressed elders, palms and a
 * layered shade floor. The atlas still keeps its broad coastal plain open.
 * Every visible woody tree is registered once, including young palms. */
import * as THREE from 'three';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { BABON_BOUNDS, BABON_RIVERS, babonOwns, babonHabitat, babonClear, babonRiverAt } from './babon-world.js';
import { babonWildlifeClear } from './babon-wildlife.js';

const TAU=Math.PI*2,CHUNK=150;
function leafGeometry(palm=false) {
  const p=[],tri=(a,b,c)=>{p.push(...a,...b,...c,...a,...c,...b);};
  if(palm)for(let i=0;i<6;i++) {
    const a=i/6,b=(i+1)/6,wa=Math.sin(a*Math.PI)*.16,wb=Math.sin(b*Math.PI)*.16;
    const y=t=>Math.sin(t*Math.PI)*.17-t*t*.2;
    const ca=[0,y(a),a],cb=[0,y(b),b];
    for(const side of [-1,1]) {
      tri(ca,[wa*side,y(a)-.04,a],cb);tri([wa*side,y(a)-.04,a],[wb*side,y(b)-.04,b],cb);
    }
  } else {
    const a=[0,0,0],b=[-.3,.08,.4],c=[0,.17,.52],d=[.3,.08,.4],e=[0,-.035,1];
    for(const v of [[a,b,c],[a,c,d],[b,e,c],[c,e,d]])tri(...v);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}
function fernGeometry() {
  const p=[],tri=(a,b,c)=>p.push(...a,...b,...c,...a,...c,...b);
  for(let k=0;k<5;k++) {
    const a=k*TAU/5,co=Math.cos(a),si=Math.sin(a),at=(u,v,y)=>[co*u-si*v,y,si*u+co*v];
    for(let j=0;j<4;j++) {
      const t=j/4,n=(j+1)/4,y=Math.sin(t*Math.PI*.85)*.48,ny=Math.sin(n*Math.PI*.85)*.48;
      tri(at(t,-.012,y),at(t,.012,y),at(n,0,ny));
      if(!j)continue;
      const spread=(1-t)*.35+.04;
      for(const side of [-1,1])tri(at(t,0,y),at(t-.1,spread*side,y-.08),at(t+.17,spread*.35*side,y+.02));
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}
function rootGeometry() {
  // A thin triangular buttress, high at the trunk and tapered to a buried toe.
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([
    -.5,0,0,.5,0,0,0,1,0, -.12,0,1,.12,0,1,0,.035,1],3));
  g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);
  const plain=g.toNonIndexed();plain.computeVertexNormals();g.dispose();return plain;
}
const geometry={
  trunk:new THREE.CylinderGeometry(.64,1,1,7),crown:new THREE.IcosahedronGeometry(1,0),
  stem:new THREE.CylinderGeometry(.62,1,1,5),root:rootGeometry(),leaf:leafGeometry(),
  frond:leafGeometry(true),fern:fernGeometry(),rock:new THREE.IcosahedronGeometry(1,0),
};
const tones={
  kapok:['#766f59','#426143'],mahogany:['#706049','#34583b'],
  'strangler-fig':['#8a846a','#3b6141'],'coconut-palm':['#8f8060','#4e7443'],
};

export const createBabonScenery=(...args)=>finishBuild(createBabonScenerySteps(...args));
export function* createBabonScenerySteps({parent,heightAt,renderedGroundHeight=heightAt,colliders}) {
  const root=new THREE.Group();root.name='Babon — ancient layered jungle';parent.add(root);
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.97,flatShading:true});
  const metrics={trees:0,canopy:0,emergents:0,palms:0,youngPalms:0,buttresses:0,lianas:0,epiphytes:0,
    ferns:0,broadLeaves:0,litter:0,rocks:0,rivers:0,batches:0,instances:0,triangles:0,materials:1};
  const batches=new Map(),pending=[],placements=[],treeBuckets=new Map(),dummy=new THREE.Object3D(),color=new THREE.Color();
  let seed=600719,work=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const range=(a,b)=>a+random()*(b-a),ground=renderedGroundHeight;
  const clear=(x,z,r=0)=>babonClear(x,z,r)||babonWildlifeClear(x,z,r);
  const grade=(x,z)=>Math.hypot(ground(x+1,z)-ground(x-1,z),ground(x,z+1)-ground(x,z-1))/2;
  const bucket=(x,z)=>`${Math.floor(x/8)},${Math.floor(z/8)}`;
  function nearTree(x,z,d) {
    const ix=Math.floor(x/8),iz=Math.floor(z/8);
    for(let xx=ix-1;xx<=ix+1;xx++)for(let zz=iz-1;zz<=iz+1;zz++)
      for(const p of treeBuckets.get(`${xx},${zz}`)??[])if(Math.hypot(x-p.x,z-p.z)<d+p.radius)return true;
    return false;
  }
  function part(type,tint,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0) {
    const key=`${Math.floor(x/CHUNK)},${Math.floor(z/CHUNK)}:${type}`;
    if(!batches.has(key))batches.set(key,{type,pieces:[]});
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
    const p={matrix:dummy.matrix.clone(),tint};batches.get(key).pieces.push(p);metrics.instances++;return p;
  }
  function beam(tint,a,b,r) {
    const v=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z),p=part('stem',tint,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,v.length(),r);
    p.matrix.compose(new THREE.Vector3((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()),new THREE.Vector3(r,Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),r));
    return p;
  }
  function tree(x,z,species,height,young=false) {
    const y=ground(x,z),palm=species==='coconut-palm',[bark,leaf]=tones[species],pieces=[];
    const elder=species==='kapok'||species==='strangler-fig',radius=palm?height*.021:height*(elder?.027:.021);
    const bole=height*(palm?.94:.77),lean=palm?range(-.05,.05):range(-.013,.013);
    const trunk=part('trunk',bark,x-Math.sin(lean)*bole/2,y+bole/2,z,radius,bole,radius,0,0,lean);
    const offset=treeGroundingOffset(trunk.matrix,ground,{radius:1,segments:7,embed:.055});
    trunk.matrix.elements[13]+=offset;pieces.push(trunk);
    const baseY=trunk.matrix.elements[13]-.5*trunk.matrix.elements[5],crownX=x-Math.sin(lean)*bole*.95,crownY=baseY+bole;
    if(palm) {
      for(let j=0;j<8;j++) {
        const a=j*TAU/8+range(-.12,.12),length=height*(young?.56:.37);
        pieces.push(part('frond',j%3===0?'#66884c':leaf,crownX,crownY,z,length,length*.56,length,a));
      }
      // Rings make the slim pale palm shaft read differently from giant boles.
      if(!young)for(let j=1;j<5;j++)pieces.push(part('stem','#80785c',x-Math.sin(lean)*bole*j/5,baseY+bole*j/5,z,radius*(1-j*.065),.08,radius*(1-j*.065)));
      if(young)metrics.youngPalms++;else metrics.palms++;
    } else {
      const spread=species==='strangler-fig'?.3:.235;
      for(let j=0;j<3;j++) {
        const a=j*TAU/3+x*.017,dx=Math.cos(a)*height*.12,dz=Math.sin(a)*height*.12;
        const end={x:crownX+dx,y:baseY+height*(.77+j*.045),z:z+dz};
        pieces.push(beam(bark,{x,y:baseY+height*.52,z},end,radius*.34));
        pieces.push(part('crown',j===1?'#4c6c47':leaf,end.x,end.y,end.z,height*spread,height*.17,height*spread,range(0,TAU)));
      }
      metrics.canopy++;if(species==='kapok')metrics.emergents++;
      if(elder)for(let j=0;j<5;j++) {
        const a=j*TAU/5+range(-.1,.1),len=radius*range(2.2,3),rx=x+Math.sin(a)*radius*.48,rz=z+Math.cos(a)*radius*.48;
        const tipX=rx+Math.sin(a)*len,tipZ=rz+Math.cos(a)*len;
        if(clear(tipX,tipZ,.3)||!babonOwns(tipX,tipZ)||babonRiverAt(tipX,tipZ,.5))continue;
        const foot=Math.min(ground(rx,rz),ground(tipX,tipZ))-.07;
        pieces.push(part('root',bark,rx,foot,rz,radius*.75,radius*1.7,len,a));metrics.buttresses++;
      }
      // Fig aerial roots cling to the living trunk; they are harvested with it,
      // never left floating when the underlying registered tree falls.
      if(species==='strangler-fig')for(let j=0;j<3;j++) {
        const a=j*TAU/3,px=x+Math.sin(a)*radius*.93,pz=z+Math.cos(a)*radius*.93;
        const foot=ground(px,pz)-.04;
        pieces.push(beam('#918b70',{x:px,y:foot,z:pz},{x:crownX+Math.sin(a)*height*.13,y:baseY+height*.71,z:z+Math.cos(a)*height*.13},.13));
      }
      if(elder&&random()<.72) {
        const a=range(0,TAU),sx=x+Math.sin(a)*height*.1,sz=z+Math.cos(a)*height*.1;
        const low=Math.max(ground(sx,sz)+2.7,baseY+height*.19);
        const anchors=[{x:sx,y:baseY+height*.76,z:sz},{x:sx+.55,y:baseY+height*.52,z:sz+.35},
          {x:sx+.9,y:low,z:sz+.12},{x:sx+1.65,y:low+.35,z:sz-.25}];
        for(let j=1;j<anchors.length;j++)pieces.push(beam('#4a5940',anchors[j-1],anchors[j],.058));metrics.lianas++;
      }
      if(random()<.32) {
        const a=range(0,TAU),px=x+Math.cos(a)*radius*.85,pz=z+Math.sin(a)*radius*.85,py=baseY+height*range(.2,.48);
        for(let j=0;j<4;j++)pieces.push(part('leaf',j===0?'#819057':'#587544',px,py,pz,.66,.7,.95,j*TAU/4));
        metrics.epiphytes++;
      }
    }
    const id=worldTreeId('babon-tree',x,z),collider={x,z,r:radius*.94,minY:baseY,maxY:baseY+bole,kind:'babon-tree'};
    colliders.push(collider);
    const descriptor={id,region:'Babon',species,x,z,y:baseY,height,radius,base:{x,y:baseY,z},harvestable:true};
    pending.push({descriptor,collider,pieces,trunk});
    const key=bucket(x,z);if(!treeBuckets.has(key))treeBuckets.set(key,[]);treeBuckets.get(key).push({x,z,radius});
  }

  const b=BABON_BOUNDS;
  for(let z0=b.minZ+5;z0<b.maxZ;z0+=10.5)for(let x0=b.minX+5;x0<b.maxX;x0+=10.5) {
    if(++work%20===0)yield;
    const x=x0+range(-2.7,2.7),z=z0+range(-2.7,2.7),h=babonHabitat(x,z);
    if(!h||h.height<1.2||h.shore<5||clear(x,z,3)||babonRiverAt(x,z,4)||grade(x,z)>1.15)continue;
    const density=.15+.8*h.canopy;
    if(random()>density||nearTree(x,z,3.6))continue;
    const coast=h.shore<35||h.kind==='coastal-plain',v=random();
    const species=coast?(v<.74?'coconut-palm':'mahogany'):(v<.15?'kapok':v<.38?'strangler-fig':v<.5?'coconut-palm':'mahogany');
    const height=species==='kapok'?range(35,47):species==='strangler-fig'?range(26,35):species==='coconut-palm'?range(10,18):range(21,33);
    tree(x,z,species,height);
  }

  for(let z0=b.minZ+3;z0<b.maxZ;z0+=6.8)for(let x0=b.minX+3;x0<b.maxX;x0+=6.8) {
    if(++work%24===0)yield;
    const x=x0+range(-2.1,2.1),z=z0+range(-2.1,2.1),h=babonHabitat(x,z);
    if(!h||h.height<.85||h.shore<2.5||babonRiverAt(x,z,1.4))continue;
    const y=ground(x,z),slope=grade(x,z),onWay=babonClear(x,z,.5),animal=babonWildlifeClear(x,z,.3);
    const cover=h.canopy*(h.wet>.55?1:.82),v=random();
    if(!onWay&&!animal&&slope<.9&&v<cover*.1&&!nearTree(x,z,1.6)&&!clear(x,z,1)) {
      tree(x,z,'coconut-palm',range(2.4,4.8),true);
    } else if(!onWay&&!animal&&slope<1.05&&v<cover*.69) {
      const scale=range(.9,1.8)*(h.wet>.55?1.18:1);
      part('fern',h.wet>.6?'#456b46':'#3b6240',x,y-.025,z,scale,scale,scale,range(0,TAU));
      placements.push({x,z,y:y-.025,kind:'fern'});metrics.ferns++;
    } else if(!onWay&&!animal&&slope<.8&&v<cover*.94) {
      const scale=range(1.1,2.15),a=range(0,TAU);
      for(let j=0;j<4;j++)part('leaf',j===1?'#5b7b4c':'#315b3e',x,y+.035,z,scale*.74,scale*.8,scale,a+j*TAU/4,range(-.3,-.13));
      placements.push({x,z,y:y+.035,kind:'broad-leaf'});metrics.broadLeaves++;
    }
    // Walkable dark organic litter is visible in the open gaps. The coastal
    // rock collar and scoured ravine chips are embedded, with no hidden walls.
    if(random()<.37&&slope<1.25) {
      const rock=h.shore<18||h.kind==='ravine'&&random()<.5;
      const rx=rock?range(.25,1.2):range(.22,.48),rz=rx*range(.55,1.15),ry=rock?rx*.3:.045;
      const foot=Math.min(y,ground(x+rx,z),ground(x-rx,z),ground(x,z+rz),ground(x,z-rz))-.025;
      part('rock',rock?(h.shore<18?'#7c8578':'#667561'):'#625b3c',x,foot+ry*.35,z,rx,ry,rz,range(0,TAU));
      placements.push({x,z,y:foot,kind:rock?'rock':'litter'});if(rock)metrics.rocks++;else metrics.litter++;
    }
  }

  for(const [key,batch] of batches) {
    yield;
    const mesh=new THREE.InstancedMesh(geometry[batch.type],material,batch.pieces.length);
    mesh.name=`Babon ${key}`;mesh.castShadow=['trunk','crown','stem','root'].includes(batch.type);mesh.receiveShadow=true;
    for(let i=0;i<batch.pieces.length;i++) {
      if(i&&i%64===0)yield;
      const p=batch.pieces[i];mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,color.set(p.tint));p.handle={mesh,index:i};
    }
    mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);metrics.batches++;
    metrics.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;
  }
  // These narrow silt-carrying streams use the atlas courses and the exact
  // sloping water profile queried by swimming, rather than level blue strips.
  // Their geometry is small enough to remain one cullable ribbon per course.
  const waterMaterial=new THREE.MeshStandardMaterial({color:'#667e73',roughness:.26,metalness:.08});
  const waterMeshes=[];metrics.materials++;
  for(const river of BABON_RIVERS){
    const positions=[],indices=[],s=river.samples;
    const face=(a,b,c)=>{
      const ux=positions[b*3]-positions[a*3],uz=positions[b*3+2]-positions[a*3+2];
      const vx=positions[c*3]-positions[a*3],vz=positions[c*3+2]-positions[a*3+2];
      const up=uz*vx-ux*vz;
      if(Math.abs(up)<1e-8)return;
      if(up>0)indices.push(a,b,c);else indices.push(a,c,b);
    };
    for(let i=0;i<s.length;i++){
      if(i&&i%64===0)yield;
      const p=s[i],w=p.halfWidth;
      positions.push(p.x+p.nx*w,p.y+.012,p.z+p.nz*w,p.x-p.nx*w,p.y+.012,p.z-p.nz*w);
      if(i){
        const a=(i-1)*2,b=a+1,c=i*2,d=c+1;
        // Keep winding upward even if the atlas line reverses direction.
        face(a,c,b);face(b,c,d);
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setIndex(indices);g.computeVertexNormals();
    // The two vertices coincide where the spring tapers to zero width. The
    // unused one shares the other's normal rather than producing a black tip.
    const normals=g.attributes.normal;
    for(let i=0;i<normals.count;i++)if(Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i))<.1){
      const pair=i^1;normals.setXYZ(i,normals.getX(pair),normals.getY(pair),normals.getZ(pair));
    }
    g.computeBoundingBox();g.computeBoundingSphere();
    const mesh=new THREE.Mesh(g,waterMaterial);mesh.name=`Babon water ${river.id}`;
    mesh.userData.riverId=river.id;mesh.receiveShadow=true;root.add(mesh);waterMeshes.push(mesh);
    metrics.triangles+=indices.length/3;metrics.rivers++;yield;
  }
  const trees=[],treeVisuals=[];
  for(const t of pending) {
    if(++work%24===0)yield;
    const handles=t.pieces.map(p=>p.handle),registered=registerWorldTree(colliders,t.descriptor,handles,t.collider);
    trees.push(registered);treeVisuals.push({id:registered.id,trunk:t.trunk.handle,pieces:handles});
  }
  metrics.trees=trees.length;root.userData.metrics=metrics;
  return {root,metrics,trees,treeVisuals,placements,waterMeshes,renderedGroundHeight};
}
