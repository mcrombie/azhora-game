import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {createBirdLifeList,BIRD_LIFE_KEY} from '../src/app/exploration/bird-life-list.js';
import {createTreeLifeList,TREE_LIFE_KEY} from '../src/app/exploration/tree-life-list.js';
import {findObservableTree} from '../src/app/exploration/tree-observation.js';
const {getTreeRegistry,registerWorldTree}=await sourceModule('../src/world/scenery/tree-registry.js');

function fixture(){
  const scene=new THREE.Scene(),root=new THREE.Group(),colliders=[];scene.add(root);
  const registry=getTreeRegistry(colliders).configure({root});
  const world={heightAt:()=>0,readyAt:()=>true,canExploreAt:()=>true,nearColliders:()=>colliders};
  function add(id,x,z,{species='white-oak',radius=.5,harvestable=true}={}){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,5),new THREE.MeshBasicMaterial());
    trunk.position.set(x,2.5,z);root.add(trunk);
    const collider={id,x,z,r:radius,minY:0,maxY:5,kind:'tree'};colliders.push(collider);
    const tree=registerWorldTree(colliders,{id,x,z,y:0,radius,species,harvestable},[{mesh:trunk}],collider);
    return {tree,trunk};
  }
  return {scene,root,registry,world,colliders,add,at:position=>findObservableTree(registry,world,position)};
}

test('observation identifies the actual standing tree, including protected trees and broad trunks across cells',()=>{
  const f=fixture();f.add('protected',0,0,{harvestable:false});
  assert.equal(f.at({x:0,y:0,z:2})?.id,'protected','Protection from cutting does not prevent looking');
  assert.equal(f.registry.fell('protected'),false);
  f.add('large',13,0,{radius:5});
  assert.equal(f.at({x:7,y:0,z:0})?.id,'large','Reach is measured from bark, across spatial cell boundaries');
  assert.equal(f.at({x:7,y:0,z:0})?.name,'White oak');
  f.registry.set('large',false);
  assert.equal(f.at({x:7,y:0,z:0}),null,'A stump is not a living specimen');
  f.registry.regrow('large');assert.equal(f.at({x:7,y:0,z:0})?.id,'large');
});

test('parked, hidden, removed and restored scenery follows its real render lifecycle without duplicate trees',()=>{
  const f=fixture(),{tree,trunk}=f.add('oak',0,0),p={x:0,y:0,z:2};
  assert.equal(f.at(p)?.id,'oak');
  f.root.visible=false;assert.equal(f.at(p),null,'A hidden ancestor hides its tree targets');
  f.root.visible=true;trunk.visible=false;assert.equal(f.at(p),null,'A hidden trunk cannot be observed');
  trunk.visible=true;f.root.removeFromParent();assert.equal(f.at(p),null,'Parking keeps descriptors but removes observation targets');
  assert.equal(f.registry.get('oak'),tree,'CPU identity survives parking');
  f.scene.add(f.root);assert.equal(f.at(p)?.id,'oak');assert.equal(f.registry.trees.length,1);
  f.registry.remove('oak');assert.equal(f.at(p),null,'Clearing scenery removes its observation target');
});

test('individual hidden instance slots do not identify an invisible tree from a shared forest batch',()=>{
  const f=fixture(),mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.5,.5,5),new THREE.MeshBasicMaterial(),2);
  f.root.add(mesh);mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,2.5,0));mesh.setMatrixAt(1,new THREE.Matrix4().makeTranslation(8,2.5,0));
  for(const [index,x] of [0,8].entries())registerWorldTree(f.colliders,{id:'batch-'+index,x,z:0,y:0,radius:.5,species:'white-oak'},[{mesh,index}]);
  assert.equal(f.at({x:0,y:0,z:2})?.id,'batch-0');
  mesh.setMatrixAt(0,new THREE.Matrix4().makeScale(0,0,0));
  assert.equal(f.at({x:0,y:0,z:2}),null,'A zero-scale slot stays unobservable while its neighbor remains drawn');
  assert.equal(f.at({x:8,y:0,z:2})?.id,'batch-1');
});

test('protected trees merged into scenery follow their owner visibility without becoming harvestable',()=>{
  const f=fixture();
  registerWorldTree(f.colliders,{id:'orchard',x:0,z:0,y:0,species:'apple',harvestable:false},[],null,f.root);
  assert.equal(f.at({x:0,y:0,z:2})?.id,'orchard');assert.equal(f.registry.fell('orchard'),false);
  f.root.visible=false;assert.equal(f.at({x:0,y:0,z:2}),null);
  f.root.visible=true;f.root.removeFromParent();assert.equal(f.at({x:0,y:0,z:2}),null);
  f.scene.add(f.root);assert.equal(f.at({x:0,y:0,z:2})?.id,'orchard');
  assert.ok(!Object.values(f.registry.get('orchard')).includes(f.root),'Scene ownership stays outside serializable tree facts');
});

test('tree observations require a clear eye-level sight line on the same ground floor and loaded terrain',()=>{
  const f=fixture();f.add('oak',0,0);const p={x:0,y:0,z:3};
  assert.equal(f.at(p)?.id,'oak','The target trunk does not block sight to its own near bark');
  f.colliders[0].r=1.2;
  assert.equal(f.at(p)?.id,'oak','Wider movement clearance around the target does not hide its visible bark');
  f.colliders.push({x:0,z:1.5,hx:1,hz:.2,minY:0,maxY:4,kind:'wall'});
  assert.equal(f.at(p),null,'An intervening wall hides the tree');f.colliders.pop();
  assert.equal(f.at({...p,y:8}),null,'A visitor on an upper floor cannot identify the trunk below');
  f.world.readyAt=()=>false;assert.equal(f.at(p),null,'An unprepared region has no observation targets');
  f.world.readyAt=()=>true;f.world.canExploreAt=()=>false;assert.equal(f.at(p),null,'Backdrop trees outside the playable world are not targets');
});

test('tree notes are durable species discoveries and preserve existing bird and campaign save formats',()=>{
  const birds=JSON.stringify({version:1,species:['barn-owl']}),campaign='{"existing":"checkpoint"}';
  const data=new Map([[BIRD_LIFE_KEY,birds],['campaign',campaign]]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const journal=createTreeLifeList(storage);
  assert.deepEqual(journal.species(),[],'Older saves with no tree key start with empty tree notes');
  assert.deepEqual(journal.observe('white-oak'),{ok:true,added:true});
  assert.deepEqual(journal.observe('white-oak'),{ok:true,added:false});
  assert.deepEqual(createTreeLifeList(storage).species(),['white-oak']);
  assert.deepEqual(createBirdLifeList(storage).species(),['barn-owl']);
  assert.equal(data.get(BIRD_LIFE_KEY),birds);assert.equal(data.get('campaign'),campaign);
  const copy=journal.species();copy.push('apple');assert.deepEqual(journal.species(),['white-oak'],'Callers cannot mutate observations without saving');
});

test('unknown trees and storage failure cannot invent a recorded sighting; old duplicate entries are filtered',()=>{
  const broken=createTreeLifeList({getItem:()=>null,setItem(){throw Error('disk full');}});
  assert.equal(broken.observe('white-oak').ok,false);assert.deepEqual(broken.species(),[]);
  let writes=0;
  const saved=JSON.stringify({version:1,species:['white-oak','mystery-tree','white-oak',null]});
  const storage={getItem:key=>key===TREE_LIFE_KEY?saved:null,setItem(){writes++;}},journal=createTreeLifeList(storage);
  assert.deepEqual(journal.species(),['white-oak']);assert.equal(journal.observe('mystery-tree').ok,false);assert.equal(writes,0);
  for(const raw of ['broken',JSON.stringify({version:9,species:['white-oak']})])assert.deepEqual(createTreeLifeList({getItem:()=>raw}).species(),[]);
});

test('regional names identify one real botanical species without changing the placed tree or old timber identity',()=>{
  const f=fixture();f.add('vault',0,0,{species:'grey-vault',harvestable:false});
  const target=f.at({x:0,y:0,z:2});
  assert.equal(target.species,'european-beech');assert.equal(target.instanceSpecies,'grey-vault');
  assert.equal(target.localName,'Grey Vault');assert.equal(target.name,'European beech');
  assert.equal(f.registry.get('vault').species,'grey-vault','Observation cannot rewrite the world instance identity');
  const data=new Map([[TREE_LIFE_KEY,JSON.stringify({version:1,species:['grey-vault','european-beech']})]]);
  const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},life=createTreeLifeList(storage);
  assert.deepEqual(life.species(),['european-beech'],'Older regional and official observations deduplicate when read');
  assert.deepEqual(life.observe('grey-vault'),{ok:true,added:false});
  assert.deepEqual(life.observe('acor'),{ok:true,added:true});
  assert.deepEqual(life.observe('english-oak'),{ok:true,added:false});
  assert.deepEqual(JSON.parse(data.get(TREE_LIFE_KEY)).species,['european-beech','english-oak'],'New observations persist the official species IDs only');
});

test('the active tower sanctuary exposes its living trees without leaking targets between rooms or floors',async()=>{
  const {createTowerWorld}=await sourceModule('../src/app/exploration/tower-world.js');
  const {SANCTUARY_ENTRY}=await import('../src/content/regions/minora-frontier/guild-sanctuary-layout.js');
  const {TOWER}=await import('../src/app/exploration/tower-state.js');
  const entry={...SANCTUARY_ENTRY,x:SANCTUARY_ENTRY.x-3};
  const world=await createTowerWorld(new THREE.Scene(),()=>{},{inside:true,position:entry,enabledRegions:[16]});
  try{
    world.update(0,0,entry);
    const registry=world.treeRegistry,tree=registry?.get('sanctuary-porch-0');
    assert.ok(tree,'The real lazy-built sanctuary shares its registry with the active world');
    assert.equal(tree.harvestable,false);
    const point={x:tree.x+2,y:tree.base.y,z:tree.z};world.update(0,0,point);
    assert.equal(world.treeTarget(point)?.id,tree.id,'The porch specimen is identifiable through the normal world target');
    assert.equal(world.treeTarget({...point,y:TOWER.y}),null,'The same horizontal location on a lower floor is not a sanctuary target');
    world.show('temple');
    assert.equal(world.treeRegistry,null);assert.equal(world.treeTarget(point),null,'A different interior cannot observe the hidden sanctuary');
    world.showLimbo();assert.equal(world.treeRegistry,null);assert.equal(world.treeTarget(point),null);
    world.show('tower');world.update(0,0,{...TOWER});assert.equal(world.treeRegistry,null,'Leaving the sanctuary landing hides its trees');
    world.update(0,0,point);assert.equal(world.treeRegistry,registry);assert.equal(world.treeTarget(point)?.id,tree.id,'Re-entry restores the same registered specimen');
    assert.equal(world.state().exteriorLoaded,false,'Interior observation does not load or consult the exterior');
  }finally{world.dispose();}
});

test('Bowden\u2019s live woodlot can be observed through felling and regrowth without joining the wild timber controller',async()=>{
  const {createWoodlot}=await sourceModule('../src/world/scenery/woodlot-world.js');
  const {WOODLOT_TREES,createWoodcutting}=await import('../src/gameplay/skills/woodcutting/woodcutting.js');
  const {createSkills}=await import('../src/gameplay/skills/skills.js');
  const scene=new THREE.Scene(),colliders=[],round=new THREE.SphereGeometry(1,8,5),cylinder=new THREE.CylinderGeometry(1,1,1,7),cube=new THREE.BoxGeometry(1,1,1);
  const material=(color,options={})=>new THREE.MeshStandardMaterial({color,...options});
  const mesh=(geometry,mat,x,y,z,sx,sy,sz,parent)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;};
  const box=(mat,x,y,z,sx,sy,sz,parent)=>mesh(cube,mat,x,y,z,sx,sy,sz,parent);
  const post=(mat,x,y,z,r,h,parent)=>mesh(cylinder,mat,x,y,z,r,h,r,parent);
  const world={heightAt:()=>0,readyAt:()=>true,canExploreAt:()=>true,nearColliders:()=>colliders};
  const lot=createWoodlot({parent:scene,material,mesh,box,post,round,cylinder,heightAt:world.heightAt,colliders,signs:{place(){}},movingGroups:new Set()});
  const ordinary=getTreeRegistry(colliders),pine=WOODLOT_TREES.find(t=>t.kind==='pine');
  const point={x:pine.x,y:0,z:pine.z+1.8},observe=()=>findObservableTree([ordinary,lot.treeRegistry],world,point);
  assert.equal(ordinary.trees.length,0,'Observation cannot add duplicate trees to the wild-timber or developer-destruction catalog');
  assert.equal(lot.treeRegistry.trees.length,WOODLOT_TREES.length);
  assert.equal(observe()?.id,pine.id);assert.equal(observe()?.species,pine.species);
  const wood=createWoodcutting({skills:createSkills(),trees:ordinary.trees,random:()=>0});
  assert.equal(wood.tree(pine.id).harvestable,true,'The original lesson still owns a harvestable pine');
  assert.equal(wood.swing(pine.id,id=>id==='bronze-axe').log,'pine-logs');
  lot.fell(pine.id);assert.equal(observe()?.id===pine.id,false,'A falling trunk immediately stops being a standing observation');
  for(let i=0;i<30;i++)lot.update(.1,i*.1);
  assert.equal(lot.standing(pine.id),false);assert.equal(observe()?.id===pine.id,false,'The stump cannot be observed as a living tree');
  lot.regrow(pine.id);assert.equal(observe()?.id,pine.id,'The existing regrowth restores the same species record');
  lot.set(pine.id,false);assert.equal(observe()?.id===pine.id,false);
  lot.set(pine.id,true);assert.equal(observe()?.id,pine.id);
  lot.root.visible=false;assert.equal(observe(),null);lot.root.visible=true;
  lot.root.removeFromParent();assert.equal(observe(),null,'Unloaded woodlot scenery has no targets');
  assert.equal(colliders.filter(c=>c.kind==='woodlot-tree').length,WOODLOT_TREES.length,'Observation does not add or remove movement blockers');
  const geometries=new Set(),materials=new Set();lot.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material??[]))materials.add(m);});
  for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}
});
