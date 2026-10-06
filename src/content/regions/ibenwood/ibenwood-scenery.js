import { forEachBuild } from '../../../world/loading/build-each.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { registerWorldTree } from '../../../world/scenery/tree-registry.js';
import { createGroveGroundSteps } from './ibenwood-ground.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { IBENWOOD, grovePoint, groveTrees, routeDistance, GROVE_PROTECTION } from './ibenwood-pilot.js';

const TONES = {
  'grey-vault':['#696653','#446446'], 'pale-witness':['#c0bb9e','#6b8053'],
  bloodoak:['#70432e','#688247'], 'midnight-elm':['#5c5140','#2c5048'],
  ridgeback:['#82715a','#537348'], deeproot:['#645743','#3b6650'],
};
export function createIbenwoodScenery(...args) { return finishBuild(createIbenwoodScenerySteps(...args)); }

export function* createIbenwoodScenerySteps({parent,heightAt,colliders,terrain,terrainRoot}) {
  let buildWork = 0;
  const root=new THREE.Group();root.name='East Ibenwood partial grove pilot';parent.add(root);
  const trees=groveTrees(),batches=new Map(),dummy=new THREE.Object3D();
  const geometries={trunk:new THREE.CylinderGeometry(.72,1,1,9),crown:new THREE.IcosahedronGeometry(1,1),branch:new THREE.CylinderGeometry(.55,1,1,7)};
  const buttress=new THREE.BufferGeometry();buttress.setAttribute('position',new THREE.Float32BufferAttribute([
    -1,0,-.5, 1,0,-.5, -1,1,-.5, 1,1,-.5, -.25,0,.5, .25,0,.5, -.25,.1,.5, .25,.1,.5],3));
  buttress.setIndex([0,2,1,1,2,3,4,5,6,5,7,6,0,4,2,2,4,6,1,3,5,3,7,5,2,6,3,3,6,7,0,1,4,1,5,4]);
  geometries.root=buttress.toNonIndexed();geometries.root.computeVertexNormals();
  function part(type,tint,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
    const key=type+tint;if(!batches.has(key))batches.set(key,{type,tint,parts:[]});
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
    const p={matrix:dummy.matrix.clone(),handle:null};batches.get(key).parts.push(p);return p;
  }
  const descriptors=[];
  for(const tree of trees){ if (++buildWork % 32 === 0) yield;
    const y=heightAt(tree.x,tree.z),[bark,leaf]=TONES[tree.species],h=tree.height,r=tree.radius,pieces=[];
    const bole=h*(tree.species==='pale-witness'?.91:.83);
    const trunk=part('trunk',bark,tree.x,y+bole/2-.12,tree.z,r,bole,r);
    trunk.matrix.elements[13]+=treeGroundingOffset(trunk.matrix,heightAt,{radius:1,segments:9,embed:.08});pieces.push(trunk);
    // Pale Witness keeps a high open bole; Grey Vault has a broad, low spreading crown.
    const crownY=tree.species==='pale-witness'?.88:.78,spread=tree.species==='grey-vault'?.38:tree.species==='midnight-elm'?.3:.27;
    for(let j=0;j<3;j++){ if (++buildWork % 32 === 0) yield;
      const a=j*2.094+Number(tree.id.slice(-1))*.3,dx=Math.sin(a)*h*.14,dz=Math.cos(a)*h*.14;
      pieces.push(part('crown',leaf,tree.x+dx,y+h*crownY+j*.6,tree.z+dz,h*spread,h*.18,h*spread));
      if(tree.age==='veteran'){
        const start=new THREE.Vector3(tree.x,y+h*.62,tree.z),end=new THREE.Vector3(tree.x+dx,y+h*.82,tree.z+dz),vector=end.clone().sub(start);
        const limb=part('branch',bark,0,0,0,1,1,1);
        limb.matrix.compose(start.clone().add(end).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),vector.clone().normalize()),new THREE.Vector3(r*.55,vector.length(),r*.55));pieces.push(limb);
      }
    }
    const collider={x:tree.x,z:tree.z,r,kind:'tree'};colliders.push(collider);
    // Buttress toes are individually draped, never floating spokes on a level plane.
    if(tree.age==='veteran')for(let j=0;j<5;j++){ if (++buildWork % 32 === 0) yield;
      const a=j*Math.PI*2/5+.35,len=tree.species==='ridgeback'?8:tree.species==='deeproot'?9:5;
      for(let k=0;k<4;k++){ if (++buildWork % 32 === 0) yield;
        const d=r+(k+.5)*len/4,x=tree.x+Math.sin(a)*d,z=tree.z+Math.cos(a)*d;
        if(routeDistance(x,z)<2.1)continue;
        const ry=heightAt(x,z),width=Math.max(.2,r*.62*(1-k/4));
        const rise=tree.species==='ridgeback'?(4-k)*.7:tree.species==='deeproot'?(4-k)*.35:width*.5;
        pieces.push(part('root',bark,x,ry-.08,z,width,.3+rise,len/4+.35,0,a,0));
        if(width>.55)colliders.push({x,z,r:width*.7,kind:'root'});
      }
    }
    descriptors.push({tree:{...tree,y,base:{x:tree.x,y,z:tree.z},harvestable:false,protectedReason:GROVE_PROTECTION},pieces,collider});
  }
  for(const batch of batches.values()){ if (++buildWork % 32 === 0) yield;
    const mesh=new THREE.InstancedMesh(geometries[batch.type],new THREE.MeshStandardMaterial({color:batch.tint,roughness:.96,flatShading:true}),batch.parts.length);
    mesh.name=`Ibenwood ${batch.type} ${batch.tint}`;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    yield* forEachBuild(batch.parts, function* (p, index) {mesh.setMatrixAt(index,p.matrix);p.handle={mesh,index};});mesh.computeBoundingSphere();
  }
  for(const d of descriptors){ if (++buildWork % 32 === 0) yield; registerWorldTree(colliders,d.tree,d.pieces.map(p=>p.handle),d.collider); }

  const s=createSceneryBuilder(); const stone='#9b9d80',wood='#776047',roof='#435c50',dark='#26382e',gold='#dbc18a';
  const buildings=[];
  function home(x,z,y,kind,yaw=0){
    const p=grovePoint(x,z),base=heightAt(p.x,p.z)+y;
    s.frame(p.x,base,p.z,yaw,()=>{
      s.cylinder(wood,0,0,0,3.5,.3);s.cylinder(kind==='stone'?stone:wood,0,.3,0,2.9,3.7);
      s.cone(roof,0,4,0,4.1,2.5,.3);s.cylinder(gold,0,6.3,0,.12,.4);
      // Deep dark inset, pale jambs, lintel, and a small warm window: a maintained home.
      s.block(dark,0,.3,2.91,1.2,2.3,.08);s.block(stone,-.76,.3,3,.26,2.5,.35);s.block(stone,.76,.3,3,.26,2.5,.35);
      s.box(stone,0,2.85,3,1.8,.35,.5);s.box(gold,1.8,2.1,2.25,.6,.7,.12,.65);
      s.box(wood,0,.4,3.7,3,.2,1.7);s.block(wood,-1.3,.45,4.3,.12,.9,.12);s.block(wood,1.3,.45,4.3,.12,.9,.12);
      s.box(wood,0,1.3,4.3,2.7,.12,.12);
      // Pots and stacked household wood supply domestic scale without new residents.
      s.cylinder('#957653',2.1,.5,3.6,.35,.55);s.rock('#658649',2.1,1.15,3.6,.55,.5,.55);
    });
    if(!y)colliders.push({x:p.x,z:p.z,r:3.5,kind:'building'});
    buildings.push({...p,y:base,kind});
  }
  home(-27,-14,0,'root',-.5);home(-47,-22,0,'stone',.35);
  const v=grovePoint(-39,-33),vy=heightAt(v.x,v.z),platformY=vy+14.8;
  for(const [x,z,yaw] of [[-35,-32,.1],[-42,-36,1.3]]){ if (++buildWork % 32 === 0) yield;const p=grovePoint(x,z);home(x,z,platformY+.15-heightAt(p.x,p.z),'branch',yaw);}
  // A modest canopy balcony joins two homes within the Grey Vault crown; exterior only.
  s.box(wood,v.x,platformY,v.z,16,.3,14,.15);
  const supports=[];
  for(const [dx,dz] of [[-6,-5],[6,-5],[-6,5],[6,5]]){ if (++buildWork % 32 === 0) yield;
    const a=[v.x,vy+9,v.z],b=[v.x+dx,platformY-.15,v.z+dz];s.beam(wood,a,b,.65,.65);supports.push({a,b,width:.65});
    s.beam(wood,[v.x-7,platformY-.45,v.z+dz],[v.x+7,platformY-.45,v.z+dz],.6,.6);
  }
  for(let i=0;i<9;i++){ if (++buildWork % 32 === 0) yield;s.block(wood,v.x-6+i*1.5,vy+15,v.z+4,.12,1,.12);}
  s.box(wood,v.x,vy+16,v.z+4,13,.12,.15);
  // Old inhabited stone portico: real open passage between substantial colliding piers.
  const a=grovePoint(-31,-9),ay=heightAt(a.x,a.z);
  for(const dx of [-3.4,3.4]){ if (++buildWork % 32 === 0) yield;
    s.block(stone,a.x+dx,ay,a.z,1.6,4.3,1.8);s.box('#b1b197',a.x+dx,ay+4.1,a.z,2,.35,2.1);
    colliders.push({x:a.x+dx,z:a.z,hx:.8,hz:.9,kind:'stone-pier'});
  }
  s.box(stone,a.x,ay+4.6,a.z,8.5,.9,2);s.box('#657754',a.x,ay+5.1,a.z,8.8,.16,2.2);
  for(let i=0;i<4;i++){ if (++buildWork % 32 === 0) yield; s.box('#79816a',a.x-3.8+i*.24,ay+1.5+i*.8,a.z+1.05,.6,.4,.12); }
  // Fern fans, mossy boulders, decaying wood, and saplings occupy gaps away from walking lanes.
  for(let i=0;i<420;i++){ if (++buildWork % 32 === 0) yield;
    const x=Math.sin(i*91.71)*79,z=Math.sin(i*17.31+2)*79,p=grovePoint(x,z);
    if(Math.hypot(x,z)>79||routeDistance(p.x,p.z)<2.2||buildings.some(b=>!['branch'].includes(b.kind)&&Math.hypot(p.x-b.x,p.z-b.z)<5))continue;
    const y=heightAt(p.x,p.z);
    for(let j=0;j<6;j++){ if (++buildWork % 32 === 0) yield;
      const a=j*Math.PI/3+i*.4,fern=i%71===0?'#b0c3a0':'#497455';
      // Rising pinnate fronds with paired leaflets, rather than flat cross-shaped bars.
      for(let k=1;k<=4;k++){ if (++buildWork % 32 === 0) yield;
        const d=k*.2,fx=p.x+Math.sin(a)*d,fz=p.z+Math.cos(a)*d,fy=y+.18+Math.sin(k/5*Math.PI)*.55;
        const along=[Math.sin(a),Math.cos(a)],across=[Math.cos(a),-Math.sin(a)];
        s.sheet(fern,[fx-across[0]*.025,fy,fz-across[1]*.025],[fx+across[0]*.025,fy,fz+across[1]*.025],
          [fx+along[0]*.19,fy+.04,fz+along[1]*.19],[fx+along[0]*.19-across[0]*.025,fy+.04,fz+along[1]*.19-across[1]*.025]);
        for(const side of [-1,1]){ if (++buildWork % 32 === 0) yield; s.sheet(fern,[fx,fy,fz],
          [fx+across[0]*side*.17-along[0]*.08,fy+.035,fz+across[1]*side*.17-along[1]*.08],
          [fx+across[0]*side*.3,fy,fz+across[1]*side*.3],
          [fx+across[0]*side*.17+along[0]*.06,fy-.02,fz+across[1]*side*.17+along[1]*.06]); }
      }
    }
    if(i%24===0){s.rock('#7e8270',p.x,y+.5,p.z,1.4,.9,1.1,i);colliders.push({x:p.x,z:p.z,r:1.1,kind:'rock'});}
  }
  const logs=[];
  for(const [x,z,angle] of [[22,-48,.7],[-60,35,1.2],[45,12,2]]){ if (++buildWork % 32 === 0) yield;
    const p=grovePoint(x,z),y=heightAt(p.x,p.z);s.box('#6b5840',p.x,y+.45,p.z,.9,.9,7,angle);
    // End beads overlap the visible end corners; spacing also covers both long edges.
    logs.push({...p,angle,length:7,width:.9});
    for(let j=-7;j<=7;j++){ if (++buildWork % 32 === 0) yield;const d=j*.5,q={x:p.x+Math.sin(angle)*d,z:p.z+Math.cos(angle)*d};colliders.push({...q,r:.52,kind:'fallen-log'});}
    s.rock('#596b47',p.x,y+.8,p.z,1,.2,3,angle);
  }
  const detail=(yield* s.finishSteps(root));
  const {floor,apron}=yield* createGroveGroundSteps({heightAt,terrain,terrainRoot});
  const colours=[];const vertices=floor.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){ if (++buildWork % 32 === 0) yield;
    const x=vertices.getX(i),z=vertices.getZ(i),d=Math.hypot(x-IBENWOOD.x,z-IBENWOOD.z);
    const c=new THREE.Color(routeDistance(x,z)<1.5?'#9c9270':d>78?'#75864f':'#5c7049');colours.push(c.r,c.g,c.b);
  }
  floor.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));floor.receiveShadow=true;root.add(floor,apron);
  let triangles=0;root.traverse(mesh=>{if(mesh.isMesh)triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);});
  return {root,trees:descriptors.map(d=>d.tree),buildings,floor,apron,logs,supports,platform:{...v,y:platformY},metrics:{trees:trees.length,treeBatches:batches.size,staticMeshes:3,triangles},detail};
}
