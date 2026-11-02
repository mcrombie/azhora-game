import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {FOOD_DEMO_SCENARIO,FOOD_WORLD_KEY} from '../src/app/food-world/scenario.js';
import {farmCondition} from '../src/app/food-world/conditions.js';
import {foodExplanations} from '../src/app/food-world/explanations.js';
import {createFoodDemoPlayer,NESDOR_DEMO_STEPS} from '../src/app/food-world/demo-plan.js';
import {validateWorldWarSave,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {sourceModule} from './module-loader.js';

test('lookout terrain keeps exact seams, stays below field overlays, and restores travel geometry',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createLookoutTerrainGeometry,createLookoutTerrainDetail}=await sourceModule('../src/app/food-world/lookout-terrain.js');
  const width=24,depth=24,positions=[],indices=[];
  for(let z=0;z<=depth;z++)for(let x=0;x<=width;x++){
    positions.push(x,20+.3*Math.sin(x*.21)*Math.cos(z*.17)+(x>17&&z>17?Math.sin(x*2+z)*.8:0),z);
    if(x&&z){const k=z*(width+1)+x;indices.push(k-width-2,k-1,k-width-1,k-width-1,k-1,k);}
  }
  const source=new THREE.BufferGeometry();source.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));source.setIndex(indices);
  const before=source.attributes.position.array.slice(),result=createLookoutTerrainGeometry(source,width,depth);
  assert(result.triangles<result.sourceTriangles*.7,'Flat and rolling terrain use fewer triangles');
  assert.deepEqual(source.attributes.position.array,before,'Walking/collision source geometry stays untouched');
  for(let z=0;z<=depth;z++)for(let x=0;x<=width;x++)if(x%8===0||z%8===0){
    const id=z*(width+1)+x;assert.equal(result.geometry.attributes.position.getY(id),source.attributes.position.getY(id),'Tile and block edges stay exact');
  }
  function height(geometry,x,z){
    const p=geometry.attributes.position,ii=geometry.index.array;
    for(let i=0;i<ii.length;i+=3){
      const a=ii[i],b=ii[i+1],c=ii[i+2],ax=p.getX(a),az=p.getZ(a),bx=p.getX(b)-ax,bz=p.getZ(b)-az,cx=p.getX(c)-ax,cz=p.getZ(c)-az;
      const determinant=bx*cz-bz*cx,u=((x-ax)*cz-(z-az)*cx)/determinant,v=(bx*(z-az)-bz*(x-ax))/determinant;
      if(u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8)return p.getY(a)+(p.getY(b)-p.getY(a))*u+(p.getY(c)-p.getY(a))*v;
    }throw Error('Sample escaped terrain');
  }
  for(let i=0;i<2500;i++){
    const x=i<625?i%25:((i*.61803398875)%1)*width,z=i<625?Math.floor(i/25):((i*.41421356237)%1)*depth;
    const delta=height(source,x,z)-height(result.geometry,x,z);
    assert(delta>=-.00001,`Coarse terrain must not cover roads: ${delta}`);
    assert(delta<=.20001,`Height error stays within twenty centimetres: ${delta}`);
  }
  const root=new THREE.Group(),mesh=new THREE.Mesh(source,new THREE.MeshBasicMaterial());mesh.userData.reviewedTerrainGrid={width,depth};root.add(mesh);
  const detail=createLookoutTerrainDetail(root);assert(!detail.state().ready);detail.setActive(true);
  assert.notEqual(mesh.geometry,source);assert(detail.state().active);assert.equal(detail.state().triangles,result.triangles);
  detail.setActive(false);assert.equal(mesh.geometry,source);detail.setActive(true);detail.dispose();assert.equal(mesh.geometry,source);
  result.geometry.dispose();source.dispose();mesh.material.dispose();
});

test('lookout countryside mask keeps reviewed farms while retaining neighbouring actual regions',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createLookoutCountrysideMask}=await sourceModule('../src/app/food-world/lookout-mask.js');
  const {FARMLAND_REGIONS}=await sourceModule('../src/app/farmland-review/regions.js');
  const {REGION_CELLS}=await import('../src/world/terrain/region-world.js');
  const mask=createLookoutCountrysideMask([16,17,25,13,14],{minX:-3300,maxX:-950,minZ:-450,maxZ:1250});
  for(const layout of Object.values(FARMLAND_REGIONS))assert(mask.contains(...layout.spawns.town),layout.name+' is reviewed scenery');
  for(const name of ['Elagos','Telemonia','East Pyros','West Lotharn Mountains']){
    const point=REGION_CELLS[name][Math.floor(REGION_CELLS[name].length/2)];
    assert(!mask.contains(point.x,point.z),name+' is retained from the actual distant scene');
  }
  const original=new THREE.MeshStandardMaterial({color:0x7ab34c}),geometry=new THREE.BoxGeometry(2,2,2),near=new THREE.Group(),far=new THREE.Group();
  const a=new THREE.Mesh(geometry,original),b=new THREE.Mesh(geometry,original);
  a.position.set(-2308,30,60);b.position.copy(a.position);near.add(a);far.add(b);
  const crossing=new THREE.Mesh(geometry,original);crossing.scale.setScalar(5000);near.add(crossing);
  const grove=new THREE.InstancedMesh(geometry,original,2);
  grove.setMatrixAt(0,new THREE.Matrix4().makeTranslation(-2308,30,60));
  grove.setMatrixAt(1,new THREE.Matrix4().makeTranslation(-2315,30,65));near.add(grove);
  assert.equal(grove.boundingSphere,null,'First lookout can precede the first exterior render');
  mask.apply(near,true);mask.apply(far,false);mask.setActive(true);
  assert(a.visible,'Current Minora remains');assert(!b.visible,'Old Minora is not submitted a second time');
  assert(grove.visible,'Instance placements, not an origin-centred template sphere, determine visibility');
  assert.equal(a.material,original,'Whole objects within a retained region need no clipping shader');
  assert.notEqual(crossing.material,original,'Only cross-border batches need a cloned clipping material');
  assert.equal(original.onBeforeCompile.toString(),new THREE.MeshStandardMaterial().onBeforeCompile.toString());
  mask.setActive(false);assert(a.visible&&b.visible,'Returning to exterior removes the lookout-only mask');
  mask.dispose();assert.equal(a.material,original);assert.equal(b.material,original);grove.dispose();geometry.dispose();original.dispose();
});

test('lookout masking preserves water animation uniforms and original shader ownership',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createLookoutCountrysideMask}=await sourceModule('../src/app/food-world/lookout-mask.js');
  const root=new THREE.Group(),clock={value:0},material=new THREE.ShaderMaterial({uniforms:{time:clock},
    vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(1.);}'});
  const geometry=new THREE.PlaneGeometry(5000,5000),mesh=new THREE.Mesh(geometry,material);root.add(mesh);
  const mask=createLookoutCountrysideMask([16],{minX:-2400,maxX:-2200,minZ:-50,maxZ:150},{resolution:32});
  mask.apply(root,false);mask.setActive(true);clock.value=12;
  assert.equal(mesh.material.uniforms.time.value,12,'Actual-scene water clock still reaches its displayed material');
  assert.equal(material.uniforms.reviewedMask,undefined,'Original uniforms stay untouched');
  assert(!material.fragmentShader.includes('discard'),'Shared water shader stays untouched');
  mask.dispose();assert.equal(mesh.material,material);geometry.dispose();material.dispose();
});

test('reviewed Caricas standards recolor cloth without rebuilding the market',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createReviewedCaricasStandards}=await sourceModule('../src/app/food-world/standards.js');
  const parent=new THREE.Group(),standards=createReviewedCaricasStandards(parent,()=>12),mesh=parent.children[0];
  const positions=mesh.geometry.attributes.position.array.slice();
  standards.setColor('#245c59');assert.equal(standards.state().color,'#245c59');assert.equal(standards.state().count,3);
  standards.setColor('#ab8241');assert.equal(standards.state().color,'#ab8241');
  assert.deepEqual(mesh.geometry.attributes.position.array,positions);assert.equal(parent.children.length,3);
  for(const m of parent.children){m.geometry.dispose();m.material.dispose();}
});

test('named demonstration shows trade, real shortages and gradual recovery with exact replay',()=>{
  const c=createCampaign(FOOD_DEMO_SCENARIO),states=[];
  const player=createFoodDemoPlayer({day:()=>c.snapshot().day,advance:()=>c.step(),action:c.foodAction,present:step=>states.push({step,state:c.snapshot()})});
  for(let i=0;i<30&&!player.state().complete;i++)player.next();
  assert.equal(states.length,NESDOR_DEMO_STEPS.length);
  const [normal,disrupted,relief,shortage,restored,meals,recovered]=states.map(x=>x.state);
  assert.equal(normal.regions.nesdor.food.civilianRation,1);
  assert.equal(farmCondition(FOOD_DEMO_SCENARIO,disrupted,'nesdor').label,'Disrupted');
  assert(relief.food.last.transfers.some(t=>t.from==='caricas'&&t.to==='nesdor'));
  assert(shortage.regions.nesdor.food.civilianRation<1);assert(shortage.regions.nesdor.food.readiness<1);
  assert.equal(farmCondition(FOOD_DEMO_SCENARIO,restored,'nesdor').label,'Recovering');
  assert.equal(meals.regions.nesdor.food.civilianRation,1);assert(meals.regions.nesdor.food.unrest>0);
  assert.equal(farmCondition(FOOD_DEMO_SCENARIO,recovered,'nesdor').label,'Productive');
  assert(recovered.food.last.transfers.some(t=>t.from==='caricas'&&t.to==='isareos'));
  assert(recovered.regions.isareos.food.store<normal.regions.isareos.food.store);
  assert.deepEqual(replayCampaign(FOOD_DEMO_SCENARIO,recovered).snapshot(),recovered);
  for(const {state} of states){assert.equal(state.regions.nesdor.housing.capacity,950);assert.equal(state.regions.nesdor.food.population,750);assert.equal(state.engagements.length,0);}
});

test('demo clock pauses, uses 20x days, and fails clearly if the host cannot advance',()=>{
  let day=0,shown=0;const p=createFoodDemoPlayer({day:()=>day,advance:()=>day++,action:()=>({ok:true}),present:()=>shown++});
  p.tick(1);assert.equal(day,0);p.toggle();p.tick(20);assert.equal(day,0);p.toggle();p.tick(.5);assert.equal(day,1);p.tick(1.5);assert.equal(day,2);assert.equal(shown,1);
  const stalled=createFoodDemoPlayer({day:()=>0,advance(){},action(){},present(){}});
  assert.throws(()=>stalled.next(),/could not advance/);
});

test('map explanations use delivered quantities, distinguish pending changes, and respect unknown names',()=>{
  const c=createCampaign(FOOD_DEMO_SCENARIO);c.step(2);c.foodAction({type:'production',region:'nesdor',condition:.25});c.step();
  const s=c.snapshot(),text=foodExplanations(FOOD_DEMO_SCENARIO,s,'caricas').join(' ');
  assert.match(text,/supplied 40 food to Nesdor/);assert.match(text,/5 then went to Minora/);
  assert.match(text,/Stores fell by 10/);
  assert(!foodExplanations(FOOD_DEMO_SCENARIO,s,'caricas',id=>id==='caricas').join(' ').includes('Nesdor'));
  c.foodAction({type:'route',from:'caricas',to:'nesdor',blocked:true});
  assert.match(foodExplanations(FOOD_DEMO_SCENARIO,c.snapshot(),'nesdor').join(' '),/closed now/);
});

test('temporary demo checkpoints cannot enter either persistent campaign slot',()=>{
  const w=createWorldWar(null,FOOD_DEMO_SCENARIO),exploration={version:1,character:'teresod',position:{x:-2308,y:20,z:60},camera:{yaw:0,pitch:.3,distance:8},heading:0,elapsed:0,cells:[]};
  for(const key of [FOOD_WORLD_KEY,WORLD_WAR_KEY])assert(!validateWorldWarSave({version:1,format:key,exploration,...w.checkpoint()},key));
});

test('farm visuals update existing buffers and restore exactly without changing buildings or capacity',async()=>{
  const THREE=await import('../vendor/three.module.js');
  const {createAgricultureSteps}=await sourceModule('../src/world/scenery/agriculture-scenery.js');
  const {createFarmConditionView}=await sourceModule('../src/app/food-world/farm-view.js');
  const view=createFarmConditionView(),parent=new THREE.Group(),colliders=[];
  const layout={farms:[{id:'test',name:'Test farm',home:[30,0],fields:[{x:0,z:0,width:20,depth:20,crop:'grain',capacity:85}]}],buildings:[{kind:'house',x:30,z:12,w:8,d:8,h:5,housingCapacity:950}],lanes:[]};
  const build=createAgricultureSteps({parent,heightAt:(x,z)=>2+x*.1+z*.03,colliders,layout,onFarmBuilt:p=>view.add('nesdor',p)});while(!build.next().done){}
  const c=createCampaign(FOOD_DEMO_SCENARIO),count=parent.children.length,collision=structuredClone(colliders);
  const field=parent.children.find(m=>m.name.endsWith('/ fields')),plants=parent.children.find(m=>m.name.endsWith('/ crops'));
  const color=field.geometry.attributes.color.array.slice(),pos=plants.geometry.attributes.position.array.slice();
  view.update(FOOD_DEMO_SCENARIO,c.snapshot());c.foodAction({type:'production',region:'nesdor',condition:.25});view.update(FOOD_DEMO_SCENARIO,c.snapshot());
  assert.notDeepEqual(field.geometry.attributes.color.array,color);assert.notDeepEqual(plants.geometry.attributes.position.array,pos);
  const crop=plants.geometry.attributes;
  for(let i=0;i<crop.position.count;i++){
    if(crop.uv.getY(i)===0)assert.equal(crop.position.getY(i),pos[i*3+1],'Disruption must not pull uphill roots beneath the ground');
    assert(crop.position.getY(i)>=crop.cropGround.getX(i)-.00001,'Crop vertices remain above their own sloping base');
  }
  assert.equal(parent.children.length,count);assert.deepEqual(colliders,collision);assert.equal(layout.farms[0].fields[0].capacity,85);
  c.foodAction({type:'production',region:'nesdor',condition:1});view.update(FOOD_DEMO_SCENARIO,c.snapshot());
  assert.deepEqual(field.geometry.attributes.color.array,color);assert.deepEqual(plants.geometry.attributes.position.array,pos);
  assert.equal(view.state().nesdor.label,'Productive');
});
