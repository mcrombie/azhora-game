import {confirmTowerCampaign} from './tower-smoke.js';
import {FARMLAND_REGIONS} from '../../app/farmland-review/regions.js';
import {TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {FOOD_WORLD_ID,FOOD_WORLD_KEY} from '../../app/food-world/scenario.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {createWorldWar,FOOD_WORLD_SCENARIO} from '../../app/exploration/world-war.js';
import {createSkirmishGround} from '../../app/exploration/skirmish-ground.js';
import {REGION_IDS} from '../../world/terrain/region-world.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const f=()=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF',bubbles:true}));
export async function checkFoodWorld(api){
  assert(api.state().launch==='food-world','Separate launch mode');
  assert(api.war.state().campaign.scenario===FOOD_WORLD_ID,'Food campaign is authoritative');
  await api.visit({...TALETH_SPOT,z:TALETH_SPOT.z+2});f();
  confirmTowerCampaign(api);
  assert(api.tower.state().briefed,'Standard hero briefing retained');
  await api.visit({...TOWER_DOOR,z:TOWER_DOOR.z-1});f();
  const deadline=performance.now()+240000;
  while(api.state().mode==='loading'){if(performance.now()>deadline)throw Error('Food exterior timed out');await new Promise(r=>setTimeout(r,100));}
  assert(!api.tower.state().inside,'Tower exits into reviewed countryside');api.war.pause();
  const geometry=api.testWorld.agricultureState();
  assert(geometry&&Object.keys(geometry.regions).length===5&&!geometry.legacyFarms,'Exactly five new agricultural layouts');
  const views=[];
  for(const region of Object.values(FARMLAND_REGIONS)){
    const [x,z]=region.spawns.town;await api.visit({x,z});
    assert(api.groundProbe(x,z).clear,region.name+' town arrival clear');
    assert(geometry.regions[region.id].capacity===api.war.state().campaign.regions[region.id].food.production,'Physical farm capacity matches '+region.name);
    const battlefield=FOOD_WORLD_SCENARIO.regions.find(r=>r.id===region.id).battlefield;
    if(battlefield){
      const ground=createSkirmishGround(api.testWorld,battlefield,REGION_IDS[region.name],70);
      assert(ground.stage(0,3,false),'Interception staging '+region.name);
      assert(ground.assaultStage(0,5,3),'Allied assault staging '+region.name);
    }
    for(const lane of region.lanes)for(let i=1;i<lane.length;i++){
      const [ax,az]=lane[i-1],[bx,bz]=lane[i],n=Math.ceil(Math.hypot(bx-ax,bz-az)/2);
      for(let j=0;j<=n;j++)assert(canStand(ax+(bx-ax)*j/n,az+(bz-az)*j/n,api.testWorld,.34),region.name+' farm lane is walkable');
    }
    api.look({distance:20,pitch:.45});await frame();views.push({region:region.id,render:api.renderStats()});
  }
  const state=api.war.state().campaign;
  api.war.advance(1);const next=api.war.state().campaign;
  assert(next.day===state.day+1&&next.food.last,'One campaign step updates food');
  assert(next.armies.some(a=>a.supply),'Campaign armies carry actual supplies');
  assert(api.save().ok,'Food world saves');
  const saved=api.store.read().data;assert(saved.format===FOOD_WORLD_KEY,'Dedicated food save format');
  const expected=JSON.stringify(api.war.state().campaign);
  api.war.advance(1);await api.loadSaved();api.war.pause();
  assert(JSON.stringify(api.war.state().campaign)===expected,'Hero and economic campaign restore together');
  api.openMap();document.getElementById('food-world-report').open=true;await frame();
  assert(document.getElementById('food-world-report').textContent.includes('Housing capacity'),'Map has readable food/housing report');
  assert(!performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/src/world.js'),'Food world never loads legacy world builder');
  assert(api.state().frameErrors.length===0,'No frame errors');
  return {checks:['Separate startup and checkpoint','Actual reviewed scenery in all five regions','All farm lanes walkable','Physical capacities match campaign','Daily food and army supplies','Save/reload exact campaign','Folded map food and housing report','Legacy world not loaded'],geometry,views};
}

export async function viewFoodRegion(api,id){
  api.resume();api.war.pause();
  const r=FARMLAND_REGIONS[id],[x,z]=r.spawns.town;
  await api.visit({x,z});for(let i=0;i<15;i++)api.step(.04);api.look({distance:20,pitch:.45,yaw:r.spawns.town[2]});await frame();
  return api.renderStats();
}

export async function enterFoodBattle(api){
  api.resume();
  const fresh=createWorldWar(null,FOOD_WORLD_SCENARIO);fresh.advance(3);
  api.war.restore({...fresh.checkpoint(),reportReadThrough:999});
  const b=api.war.state().campaign.engagements.find(b=>b.status==='active'&&b.region==='caricas');
  assert(b,'Opening Caricas battle exists');
  await api.visit(b.location);api.war.sync();
  if(!api.war.state().campaign.pending)assert(api.war.join(b.id).ok,'Physical battle entry');
  await api.war.help('west','intercept');
  await frame();
  assert(api.state().mode==='skirmish','Hero combat starts on reviewed farmland');
  for(let i=0;i<60;i++)api.step(1/60);
  assert(api.state().fieldActors.length>0,'Combat has physical soldiers');
  assert(api.state().fieldActors.every(a=>a.clear),'Soldiers placed clear of farm buildings');
  assert(api.state().frameErrors.length===0,'Battle has no frame errors');
  return {actors:api.state().fieldActors.length,day:api.war.state().campaign.day,render:api.renderStats()};
}

let beforeDemo=null;
export async function startFoodDemo(api){
  api.resume();api.war.pause();api.war.sync();
  beforeDemo={campaign:api.war.state().campaign,hero:api.snapshot(),save:api.store.read(),geometry:api.testWorld.agricultureState().regions};
  api.openDeveloper();document.getElementById('food-demo-start').click();
  assert(api.foodDemo.state().active,'Named F8 food demonstration starts');
  document.getElementById('food-demo-pause').click();
  assert(api.foodDemo.state().paused,'Demonstration pause works');
  assert(api.state().mode==='map','Demonstration opens the map');
  assert(!api.save().ok,'Exercise cannot overwrite saved game');
  document.getElementById('exploration-status').hidden=true;
  return foodDemoStage(api,0);
}
export async function foodDemoStage(api,index){
  let attempts=0;
  while((api.foodDemo.state().index!==index||!api.foodDemo.state().arrived)&&attempts++<20)document.getElementById('food-demo-next').click();
  assert(api.foodDemo.state().index===index&&api.foodDemo.state().arrived,'Reached demonstration stage '+index);
  await frame();await new Promise(resolve=>setTimeout(resolve,160));await frame();
  const c=api.war.state().campaign,conditions=api.testWorld.agricultureState().conditions;
  if(index===1)assert(conditions.nesdor.label==='Disrupted','Fields show disruption');
  if(index===3)assert(c.regions.nesdor.food.civilianRation<1&&c.regions.nesdor.food.readiness<1,'Real food and military shortages');
  if(index===4)assert(conditions.nesdor.label==='Recovering','Restored fields still reflect unrest');
  if(index===5)assert(c.regions.nesdor.food.unrest>0&&c.regions.nesdor.food.civilianRation===1,'Meals return before stability');
  if(index===6)assert(conditions.nesdor.label==='Productive','Fields productive after recovery');
  assert(JSON.stringify(api.testWorld.agricultureState().regions)===JSON.stringify(beforeDemo.geometry),'Farm and housing capacity unchanged');
  assert(api.state().frameErrors.length===0,'No demo rendering errors');
  return {stage:index,day:c.day,mode:api.state().mode,nesdor:conditions.nesdor,rations:c.regions.nesdor.food.civilianRation,render:api.renderStats()};
}
export async function finishFoodDemo(api){
  await api.foodDemo.stop();
  assert(!api.foodDemo.state().active,'Returned from demonstration');
  assert(JSON.stringify(api.war.state().campaign)===JSON.stringify(beforeDemo.campaign),'Original campaign and unsaved commands restored exactly');
  const hero=api.snapshot();
  assert(JSON.stringify(hero.position)===JSON.stringify(beforeDemo.hero.position),'Original hero position restored');
  assert(JSON.stringify(hero.cells)===JSON.stringify(beforeDemo.hero.cells),'Original discoveries restored');
  assert(JSON.stringify(api.store.read())===JSON.stringify(beforeDemo.save),'Persistent save untouched');
  return {restored:true};
}
