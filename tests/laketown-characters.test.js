import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {createLaketownCouncilMember,createLaketownResident,LAKETOWN_SPECIES,ROWAN_APPEARANCE}=await sourceModule('../src/content/regions/minora-frontier/laketown-characters.js');
const {createCharacter,disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
const {createDwarf}=await sourceModule('../src/world/actors/dwarf-model.js');

function visibleStats(root){
  root.updateMatrixWorld(true);const bounds=new THREE.Box3();let meshes=0,triangles=0;
  root.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;meshes++;const geo=mesh.geometry;triangles+=(geo.index?.count??geo.attributes.position.count)/3;
    assert(geo.attributes.position.array.every(Number.isFinite));assert(mesh.matrixWorld.elements.every(Number.isFinite));
    geo.computeBoundingBox();bounds.union(geo.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  });return {bounds,meshes,triangles};
}
function colorBounds(root,color,relativeTo=root){
  const target=new THREE.Color(color),bounds=new THREE.Box3(),point=new THREE.Vector3();root.updateWorldMatrix(true,true);
  const inverse=relativeTo.matrixWorld.clone().invert();
  root.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color,transform=inverse.clone().multiply(mesh.matrixWorld);
    for(let i=0;i<p.count;i++){
      const close=c?Math.abs(c.getX(i)-target.r)+Math.abs(c.getY(i)-target.g)+Math.abs(c.getZ(i)-target.b)<.002:mesh.material.color.distanceTo?.(target)<.002||mesh.material.color.equals(target);
      if(close)bounds.expandByPoint(point.fromBufferAttribute(p,i).applyMatrix4(transform));
    }
  });return bounds;
}

test('Councillor Rowan has rendered green eyes, full copper curls and a long beard on a young unarmed figure',()=>{
  const a=createLaketownCouncilMember();a.animate(0);const stats=visibleStats(a.group),head=a.rig.head;
  assert.equal(a.metadata.name,'Councillor Rowan');assert.equal(a.metadata.gender,'male');assert.equal(a.metadata.age,'young adult');
  for(const name of ['Left green eye','Right green eye','Rowan / full curly red crown','Rowan / long curled red beard','Rowan / council mantle and leaf clasp'])assert(a.group.getObjectByName(name),name);
  const iris=colorBounds(head,ROWAN_APPEARANCE.eyes,head);assert(!iris.isEmpty());assert(iris.min.x<-.05&&iris.max.x>.05);assert(iris.min.y>.20&&iris.max.y<.26);
  const hair=colorBounds(head,ROWAN_APPEARANCE.hair,head);assert(hair.max.y>.39);assert(hair.min.y<-.34,'beard reaches the upper chest');assert(hair.min.z<-.19,'crown and back are covered');
  assert(stats.meshes<35,`${stats.meshes} draw calls`);assert(stats.triangles<18000,`${stats.triangles} triangles`);assert(stats.bounds.max.y>1.7&&stats.bounds.max.y<1.95);
  for(let i=0;i<20;i++)a.animate(i/10,i>10?.7:0);visibleStats(a.group);a.dispose();
});

test('Laketown species have distinct silhouettes with articulated horns, hooves, ears and quadruped bodies',()=>{
  const sizes={};
  for(const species of LAKETOWN_SPECIES){
    const a=createLaketownResident({species,variant:0,occupation:'resident'});assert.equal(a.root,a.group);assert.equal(a.metadata.species,species);
    a.animate(0);const stats=visibleStats(a.group);sizes[species]=stats.bounds.getSize(new THREE.Vector3());
    assert(stats.meshes<47,`${species}: ${stats.meshes} draw calls`);assert(stats.triangles<19000,`${species}: ${stats.triangles} triangles`);
    if(species==='elf')assert(a.rig.head.userData.elven,'actual pointed ears are built');
    if(species==='dwarf')assert(sizes[species].y<1.5);
    if(species==='satyr')for(const side of ['Left','Right'])for(const type of ['satyr horn','satyr hock','satyr cloven hoof'])assert(a.group.getObjectByName(`${side} ${type}`));
    if(species==='centaur'){
      let legs=0;a.group.traverseVisible(o=>{if(/^(Left|Right) (Fore|Hind) Hip$/.test(o.name))legs++;});assert.equal(legs,4);assert(a.group.getObjectByName('Broad animal muzzle'));
    }else for(const key of ['shoulders','elbows','wrists','hips','knees','ankles'])assert(a.rig[key].every(Boolean));
    for(let frame=0;frame<12;frame++){a.animate(frame/6,frame<4?0:.8);visibleStats(a.group);}a.dispose();
  }
  assert(sizes.elf.y>sizes.human.y);assert(sizes.dwarf.x>sizes.human.x);assert(sizes.centaur.z>sizes.human.z*2);
  assert.throws(()=>createLaketownResident({species:'unknown'}),RangeError);
});

test('female residents retain full crown hair, and a fisherman exposes the working rig and optional rod',()=>{
  for(const species of ['human','elf','dwarf','satyr']){
    const a=createLaketownResident({species,variant:1,gender:'female'});a.animate(0);
    assert.equal(a.metadata.gender,'female');const hair=colorBounds(a.rig.head,0x956034,a.rig.head);
    assert(!hair.isEmpty());assert(hair.max.y>.34&&hair.min.z<-.16,'full crown and rear hair');visibleStats(a.group);a.dispose();
  }
  const fisher=createLaketownResident({species:'human',occupation:'Fisherman and net keeper'});
  assert(fisher.group.getObjectByName('mercenary-garment-bare-forearms'),'authored occupation titles select working sleeves regardless of capitalization');
  assert.equal(fisher.rig.hips[0].position.y,.74);assert.equal(fisher.rig.knees[0].position.y,-.325);assert.equal(fisher.fishingTip(),null);
  assert(fisher.setFishing(true));fisher.animate(3,0);assert(fisher.fishingTip().toArray().every(Number.isFinite));
  assert(fisher.setFishing(false));assert.equal(fisher.fishingTip(),null);
  fisher.animate(4,0);for(const hip of fisher.rig.hips)hip.rotation.x=-Math.PI/2;for(const knee of fisher.rig.knees)knee.rotation.x=Math.PI/2;
  visibleStats(fisher.group);fisher.dispose();assert.equal(fisher.setFishing(true),false);
});

test('town actor disposal is idempotent and never disposes another actor or shared rig resources',()=>{
  const outside=[createCharacter(),createDwarf({variant:0,role:'artisan'})],borrowed=new Set();
  for(const a of outside)a.group.traverse(o=>{if(o.isMesh){borrowed.add(o.geometry);for(const m of [].concat(o.material))borrowed.add(m);}});
  let sharedDisposed=0;for(const item of borrowed)item.addEventListener('dispose',()=>sharedDisposed++);
  for(const species of LAKETOWN_SPECIES){
    const a=createLaketownResident({species,occupation:'Boatwright'}),scene=new THREE.Group();scene.add(a.group);
    if(species==='dwarf')assert(a.group.getObjectByName('Dwarf work apron'));
    const owned=new Set();a.group.traverse(o=>{if(o.isMesh&&!borrowed.has(o.geometry))owned.add(o.geometry);});
    let released=0;for(const item of owned)item.addEventListener('dispose',()=>released++);
    a.dispose();const count=released;a.dispose();assert.equal(released,count);assert(released>0);assert.equal(a.group.parent,null);assert.equal(sharedDisposed,0,species);
  }
  const council=createLaketownCouncilMember();council.dispose();council.dispose();assert.equal(sharedDisposed,0);
  for(const a of outside)disposeCharacter(a);
});
