import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { getTreeRegistry, registerWorldTree } = await sourceModule('../src/world/scenery/tree-registry.js');

test('cutting one batched tree removes its trunk and crown together, preserves its neighbor, and restores the original transforms and blocker', () => {
  const root = new THREE.Group(), parent = new THREE.Group(), colliders = [];
  parent.position.set(24, 0, -13); parent.rotation.y = Math.PI / 2; root.add(parent);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .4, 1), new THREE.MeshBasicMaterial(), 2);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1), new THREE.MeshBasicMaterial(), 2);
  parent.add(trunks, crowns);
  const original = [new THREE.Matrix4().makeTranslation(0, 3, 0), new THREE.Matrix4().makeTranslation(10, 3, 0)];
  for (let i = 0; i < 2; i++) { trunks.setMatrixAt(i, original[i]); crowns.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 10, 6, 0)); }
  let changes = 0;
  const registry = getTreeRegistry(colliders).configure({root,reindex:()=>changes++});
  const blocker = {x:24,z:-13,r:.5}; colliders.push(blocker);
  const oak = registerWorldTree(colliders, {id:'a',species:'white-oak',x:24,z:-13,y:0}, [{mesh:trunks,index:0},{mesh:crowns,index:0}], blocker);
  registerWorldTree(colliders, {id:'b',species:'silver-fir',x:24,z:-23,y:0}, [{mesh:trunks,index:1},{mesh:crowns,index:1}]);
  assert.equal(oak.name,'White oak'); assert.equal(blocker.species,'white-oak');
  assert.equal(registry.fell('a',{x:24,z:-16}),true);
  assert.equal(colliders.length,0); assert.equal(changes,1);
  const matrix = new THREE.Matrix4(); registry.update(.1); trunks.getMatrixAt(0,matrix);
  assert.notDeepEqual(matrix.elements,original[0].elements,'The existing trunk visibly tips from its root');
  trunks.getMatrixAt(1,matrix); assert.deepEqual(matrix.elements,original[1].elements,'The adjacent slot does not move');
  for(let i=0;i<25;i++)registry.update(.1);
  for(const mesh of [trunks,crowns]) { mesh.getMatrixAt(0,matrix); assert.equal(matrix.elements[0],0); assert.equal(matrix.elements[5],0); }
  assert.equal(root.getObjectByName('White oak stump').visible,true);
  registry.regrow('a'); trunks.getMatrixAt(0,matrix);
  assert.deepEqual(matrix.elements,original[0].elements); assert.equal(colliders[0],blocker);
  registry.set('a',false); registry.set('a',false); assert.equal(colliders.length,0,'Restoring a stump is idempotent');
  registry.set('a',true); registry.set('a',true); assert.equal(colliders.length,1,'Restoring a standing tree cannot duplicate a collider');
});

test('ordinary mesh tree parts stay out of static batching and restore without changing their neighboring props', () => {
  const root=new THREE.Group(),colliders=[],registry=getTreeRegistry(colliders).configure({root});
  const trunk=new THREE.Mesh(new THREE.BoxGeometry(1,4,1),new THREE.MeshBasicMaterial()); trunk.position.set(5,2,9); root.add(trunk);
  registerWorldTree(colliders,{id:'mesh-oak',species:'white-oak',x:5,z:9,y:0},[{mesh:trunk}]);
  assert.equal(trunk.userData.liveTree,true); registry.set('mesh-oak',false); assert.equal(trunk.visible,false);
  registry.set('mesh-oak',true); assert.equal(trunk.visible,true); assert.equal(trunk.matrix.elements[12],5); assert.equal(trunk.matrix.elements[13],2);
});

test('tree discovery measures reach from bark, allows stump filters, and refuses unidentified species', () => {
  const colliders=[],registry=getTreeRegistry(colliders);
  registerWorldTree(colliders,{id:'large',species:'white-oak',x:13,z:0,y:0,radius:5});
  registerWorldTree(colliders,{id:'protected',species:'apple',x:0,z:0,y:0,harvestable:false,reason:'This orchard supplies the village.'});
  assert.equal(registry.nearest({x:7,z:0},1.1)?.id,'large','A large trunk can be reached across spatial cell boundaries');
  registry.set('large',false); assert.equal(registry.nearest({x:7,z:0},1.1,(_tree,standing)=>standing),null);
  assert.equal(registry.fell('protected'),false); assert.match(registry.get('protected').reason,/orchard/);
  assert.throws(()=>registerWorldTree(colliders,{id:'bad',species:'mystery',x:0,z:0}),/Unknown tree species/);
});

test('all built ordinary forest trunks carry species and individually removable visual handles', async () => {
  const {createWorld}=await sourceModule('../src/world.js');
  const world=createWorld(new THREE.Scene());
  const registry=world.treeRegistry, catalog=new Map(registry.trees.map(tree=>[tree.id,tree]));
  const kinds=new Set(['village-tree','avrel-edge-tree','region-tree','feradom-tree','lotharn-tree','west-lotharn-tree','ascarth-tree','gala-tree','oves-tree','meneth-tree','caricas-tree','nesdor-tree','eer-tree','isareos-tree','nethereum-tree','olive-tree','thorn-tree','iscare-tree']);
  const trunks=world.colliders.filter(collider=>kinds.has(collider.kind));
  assert.ok(trunks.length>3000,'Checks the actual generated country, including ordinary background woods');
  for(const trunk of trunks) {
    assert.ok(trunk.species,`${trunk.kind} at ${trunk.x},${trunk.z} is named`);
    const tree=catalog.get(trunk.id); assert.ok(tree,`${trunk.kind} ${trunk.id} is enrolled`);
    assert.equal(tree.species,trunk.species); assert.equal(tree.harvestable,true);
  }
  assert.equal(catalog.size,registry.trees.length,'Every tree has a distinct persistent identity');
  for(const prefix of ['oak-','pine-','country-','pueth-','amod-','lotharn-','feradom-','ascarth-','gala-tree-','oves-tree-','peblos-','izol-'])
    assert.ok(registry.trees.some(tree=>tree.id.startsWith(prefix)),`${prefix} trees are included`);
  for(const tree of registry.trees.filter(tree=>tree.id.startsWith('oak-')).slice(0,3)) {
    const blocker=world.colliders.find(collider=>collider.id===tree.id);
    registry.set(tree.id,false); assert.ok(!world.colliders.includes(blocker));
    registry.set(tree.id,true); if(blocker)assert.ok(world.colliders.includes(blocker));
  }
});
