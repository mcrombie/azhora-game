import * as THREE from 'three';
import {createFarmlandTerrain,yieldBuild} from './terrain.js';
import {buildFarmlandDecks} from './decks.js';
import {FARMLAND_REGIONS} from './regions.js';
import {cityRiverView} from '../../dev/checks/city-river-view.js';
import {createSceneryBuilder} from '../../world/scenery/scenery-builder.js';
import {SEA_LEVEL} from '../../world/terrain/region-world.js';
import {createCharacter} from '../../content/characters/characters.js';
import {ROLLO_LOOK} from '../../content/characters/rollo-look.js';
import {getMovementInput,moveCharacter,canStand} from '../../gameplay/movement/locomotion.js';
import {createCampaign} from '../../simulation/campaign.js';
import {foodSummary} from '../../simulation/food.js';
import {housingSummary} from '../../simulation/housing.js';
import {foodReport as describeFood,importSources} from '../lizeem/food-report.js';
import {createLizeemFoodScenario} from '../../content/scenarios/lizeem-food.js';
import {createCameraObstruction} from '../exploration/camera-obstruction.js';

let config=FARMLAND_REGIONS[new URLSearchParams(location.search).get('region')]??FARMLAND_REGIONS.nethereum;
const landscapes=new Map();
const $=id=>document.getElementById(id),scene=new THREE.Scene();scene.background=new THREE.Color('#bacbc5');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;document.body.prepend(renderer.domElement);
renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Nethereum landscape');
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.15,2200),target=new THREE.Vector3();
scene.add(new THREE.HemisphereLight(0xfff0d2,0x718370,2.1));
const sun=new THREE.DirectionalLight(0xfff2d1,2.5);sun.position.set(-2320,600,600);sun.target.position.set(-2500,0,350);scene.add(sun,sun.target);
sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-560,right:560,top:430,bottom:-430,near:1,far:1200});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.15;sun.shadow.bias=-.0001;
let mode='orbit',yaw=.1,pitch=1.1,distance=800,drag=null,world,cameraObstruction,actor,metrics,ready=false,last=performance.now(),time=0;
let colliders=[];
const keys=new Set(),position=new THREE.Vector3(),movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
const scenario=createLizeemFoodScenario();
let campaign=createCampaign(scenario),switching=false,readyMs=0;
const number=n=>n.toLocaleString('en-US',{maximumFractionDigits:1});
function regionPanel(){
  $('region').value=config.id;$('region-name').textContent=config.name;$('region-description').textContent=config.description;
  $('food-description').textContent=config.foodDescription??'The productive parcels feed the region and supply Minora. Capacity is represented by the land; the campaign calculates each day\'s output.';
  $('import-routes').hidden=config.id!=='isareos';
  $('loading-region').textContent=config.name;document.title=`Azhora · ${config.name} farmland`;
  renderer.domElement.setAttribute('aria-label',`${config.name} landscape`);
  document.querySelector('[data-view=wildland]').textContent=config.wildlandLabel;
  $('farm-budget').replaceChildren();
  $('farm-caption').textContent=config.abstractEconomy?'Representative farms':'Daily capacity';
  for(const farm of config.farms){const tr=document.createElement('tr');tr.innerHTML=`<td>${farm.name}</td><td>${config.abstractEconomy?farm.fields.length+' parcels':number(farm.fields.reduce((n,f)=>n+f.capacity,0))}</td>`;$('farm-budget').append(tr);}
  foodReport();
}
function foodReport(){
  const s=campaign.snapshot(),report=foodSummary(s),f=report.regions.find(r=>r.id===config.id),minora=report.regions.find(r=>r.id==='isareos');
  const delivered=(s.food.last?.transfers??[]).filter(t=>t.from===config.id&&t.to==='isareos').reduce((n,t)=>n+t.amount,0);
  const transfers=s.food.last?.transfers??[],name=id=>id==='isareos'?'Minora':FARMLAND_REGIONS[id]?.name??id;
  $('food-transfers').replaceChildren();
  for(const t of transfers.filter(t=>t.from===config.id||t.to===config.id)){
    const p=document.createElement('p');p.className='note';p.textContent=t.to===config.id?`Received from ${name(t.from)}: ${number(t.amount)}`:`Sent to ${name(t.to)}: ${number(t.amount)}`;$('food-transfers').append(p);
  }
  const food=s.regions[config.id].food,pending=s.commands.some(c=>c.type==='food-action'&&c.day===s.day);
  for(const source of importSources)$(`import-${source}`).checked=!s.food.blockedRoutes.includes([source,'isareos'].sort().join('|'));
  $('food-balance').textContent=describeFood(scenario,s,s,config.id).reserveNote;
  const housing=housingSummary(s.regions[config.id]);
  $('housing-report').innerHTML=`<p>Actual population: <strong>${number(housing.population)}</strong><br>Housing capacity: <strong>${number(housing.capacity)}</strong> people<br>${housing.overCapacity?`Population above capacity: ${number(housing.overCapacity)}`:`Spare capacity: ${number(housing.spareCapacity)} people`}${housing.occupancy===null?'':`<br>Capacity used: ${number(housing.occupancy*100)}%`}</p>`;
  $('condition').value=String(food.condition);
  $('capacity').textContent=`${number(food.production)} / day`;
  const stores=`Regional stores: ${number(f.store)}`+(config.id==='isareos'?'':`<br>Minora stores: ${number(minora.store)}`);
  const deliveries=config.id==='isareos'?'':`<br>Delivered to Minora: ${number(delivered)}`;
  $('ledger').innerHTML=`<strong>Campaign day ${s.day}</strong><br>Capacity: ${number(food.production)} / day · ${number(food.population)} people<br>Production condition: ${number(food.condition*100)}%<br>${stores}<p class="note">${pending?'Production changes take effect next day. Route settings apply to the next deliveries. ':''}${s.day?`Figures below describe completed day ${s.day}.`:'Advance one day to measure production and deliveries.'}</p>${s.day?`Produced: ${number(f.production)}<br>Daily need: ${number(f.demand)}<br>Food received: ${number(f.imports)}<br>Food sent: ${number(f.exports)}${deliveries}<br>Civilian rations: ${number(f.civilianRation*100)}% · Stability: ${number(f.stability*100)}%`:''}`;
}
function advance(days){campaign.step(days);foodReport();return campaign.snapshot();}
function condition(value){const result=campaign.foodAction({type:'production',region:config.id,condition:value});if(!result.ok)throw Error(result.reason);$('condition').value=String(value);foodReport();}
for(const source of importSources)$(`import-${source}`).onchange=e=>{
  const result=campaign.foodAction({type:'route',from:source,to:'isareos',blocked:!e.target.checked});
  if(!result.ok)throw Error(result.reason);foodReport();
};
$('day').onclick=()=>advance(1);$('week').onclick=()=>advance(7);$('condition').onchange=e=>condition(Number(e.target.value));
$('reset').onclick=()=>{campaign=createCampaign(createLizeemFoodScenario());$('condition').value='1';foodReport();};regionPanel();

function select(name){const v=config.views[name];if(!v)return;mode='orbit';keys.clear();drag=null;actor&&(actor.group.visible=false);target.set(...v.target);({yaw,pitch,distance}=v);$('controls').textContent='Drag to orbit · Shift-drag to pan · Scroll to zoom';$('place').textContent=`${config.name} · ${config.faction}`;for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===name));}
function walk(place='town'){
  if(!ready)return;mode='walk';keys.clear();const spawn=config.spawns[place]??config.spawns.town;position.set(spawn[0],0,spawn[1]);position.y=world.heightAt(position.x,position.z);actor.group.visible=true;actor.group.position.copy(position);yaw=spawn[2];pitch=.22;distance=9;
  actor.group.rotation.y=yaw+Math.PI;renderer.domElement.focus();
  $('controls').textContent='WASD / arrows walk · Shift run · Drag to look · Scroll zoom · Esc overview';
  for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed','false');
}
$('walk-town').onclick=()=>walk();$('walk-fields').onclick=()=>walk('fields');for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>select(b.dataset.view);
function move(input,dt,run=false){
  const speed=run?9:3.8,dx=(input.side*Math.cos(yaw)-input.forward*Math.sin(yaw))*speed*dt,dz=(-input.side*Math.sin(yaw)-input.forward*Math.cos(yaw))*speed*dt;
  const x=position.x,z=position.z;moveCharacter(position,dx,dz,world,.34);position.y=world.heightAt(position.x,position.z);
  const actual=Math.hypot(position.x-x,position.z-z)/Math.max(dt,.001);actor.group.position.copy(position);
  if(actual>.05)actor.group.rotation.y=Math.atan2(position.x-x,position.z-z);
  actor.animate(time,actual,true,{action:'idle',progress:0});return actual;
}
function render(){
  // A walking near plane loses depth precision hundreds of metres above the
  // fields, making their thin ground layers flicker through the terrain.
  const near=mode==='walk'?.15:Math.max(.5,distance*.01);
  if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix();}
  if(mode==='walk'&&actor){target.copy(position);target.y+=1.6;}
  camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);
  if(world)camera.position.y=Math.max(camera.position.y,world.heightAt(camera.position.x,camera.position.z)+.7);
  if(mode==='walk'&&cameraObstruction)camera.position.lerpVectors(target,camera.position,cameraObstruction(target,camera.position));
  camera.lookAt(target);renderer.render(scene,camera);
}
function tick(now){const dt=Math.min(.045,(now-last)/1000);last=now;time+=dt;
  if(ready&&mode==='walk'){
    // Hidden/native windows can change activeElement without emitting focusin.
    if(document.activeElement!==renderer.domElement)keys.clear();
    move(getMovementInput(keys),dt,keys.has('ShiftLeft')||keys.has('ShiftRight'));
    const field=config.fieldAt(position.x,position.z);$('place').textContent=field?`${config.farms.find(f=>f.fields.includes(field)).name} · ${field.crop} · ${config.abstractEconomy?'Regional production shown in the food report':field.capacity+' food / day capacity'}`:config.inWildland(position.x,position.z)?config.wildlandDescription:`${config.name} · farm lanes and river town`;
  }
  if(ready){landscapes.get(config.id)?.livestock?.update(dt,mode==='walk'?position:target);render();}requestAnimationFrame(tick);
}
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointerdown',e=>{renderer.domElement.focus();drag={x:e.clientX,y:e.clientY,pan:e.shiftKey};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(drag.pan&&mode==='orbit'){const s=distance*.0012;target.x-=dx*Math.cos(yaw)*s;target.z+=dx*Math.sin(yaw)*s;target.x+=dy*Math.sin(yaw)*s;target.z+=dy*Math.cos(yaw)*s;}
  else{yaw-=dx*.006;pitch=Math.max(mode==='walk'?-.08:.15,Math.min(1.5,pitch+dy*.005));}drag.x=e.clientX;drag.y=e.clientY;
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>drag=null);
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(mode==='walk'?3:15,Math.min(mode==='walk'?20:1200,distance*Math.exp(e.deltaY*.001)));},{passive:false});
addEventListener('keydown',e=>{
  if(e.code==='Escape'){e.preventDefault();select('overview');renderer.domElement.focus();return;}
  if(e.target.closest?.('select,input,button,summary'))return;
  if(mode==='walk'&&movementKeys.has(e.code)){keys.add(e.code);e.preventDefault();}
});
addEventListener('focusin',e=>{if(e.target!==renderer.domElement){keys.clear();drag=null;}});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();drag=null;});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
async function buildLandscape(){
  const group=new THREE.Group();scene.add(group);const localColliders=[];
  const terrain=await createFarmlandTerrain(group,text=>$('progress').textContent=text,config);const localWorld={...terrain,heightAt:terrain.walkHeight,colliders:localColliders,nearColliders:()=>localColliders};
  const water=new THREE.MeshStandardMaterial({color:0x6d9a9c,roughness:.55,metalness:.05});const b=config.box;
  cityRiverView(group,config.courses,[b.x,b.z,b.width,b.depth],water);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(b.width,b.depth),water);sea.rotation.x=-Math.PI/2;sea.position.set(b.x+b.width/2,SEA_LEVEL,b.z+b.depth/2);group.add(sea);
  const steps=config.createScenery({parent:group,heightAt:terrain.heightAt,surface:terrain.surface,waterAt:terrain.waterAt,colliders:localColliders});let next,end=performance.now()+12;
  do{next=steps.next();if(typeof next.value==='string')$('progress').textContent=`Building ${next.value.replaceAll('-',' ')}…`;if(performance.now()>end){await yieldBuild();end=performance.now()+12;}}while(!next.done);const detail=next.value;
  const bridges=createSceneryBuilder('Meadow drain crossings');
  buildFarmlandDecks(bridges,terrain.decks);
  const q=terrain.quay;
  if(q){
  for(let along=10;along<Math.abs(q.end-q.bank);along+=4)for(const side of [-1,1]){
    const x=q.bank+along*q.dir;
    bridges.block(0x68543a,x,q.y-2,q.z+side*(q.width/2-.1),.24,2.8,.24);
    localColliders.push({x,z:q.z+side*(q.width/2-.1),hx:.12,hz:.12,minY:q.y-2,maxY:q.y+.8,kind:'quay-rail'});
    if(along+4<Math.abs(q.end-q.bank)){
      bridges.beam(0x796648,[x,q.y+.65,q.z+side*(q.width/2-.1)],[x+4*q.dir,q.y+.65,q.z+side*(q.width/2-.1)],.14);
      localColliders.push({x:x+2*q.dir,z:q.z+side*(q.width/2-.1),hx:2,hz:.07,minY:q.y,maxY:q.y+.8,kind:'quay-rail'});
    }
  }
  const boatY=localWorld.waterAt(q.end-3*q.dir,q.z+6);
  bridges.frame(q.end-3*q.dir,boatY,q.z+6,Math.PI/2,()=>{
    bridges.block(0x6d4f30,0,-.3,0,2.4,.5,6.2);
    for(const side of [-1,1]){
      bridges.sheet(0x997548,[side*1.2,0,-3.1],[side*1.2,0,3.1],[side*1.35,.7,3.1],[side*1.35,.7,-3.1]);
      bridges.sheet(0x8a633f,[side*1.2,0,3.1],[0,.2,4.5],[0,1,4.5],[side*1.35,.7,3.1]);
    }
    for(let i=0;i<4;i++)bridges.cylinder(0xb7a37c,(i%2-.5)*.9,.3,Math.floor(i/2)*1.1-1,.4,.8);
    bridges.cylinder(0x735936,0,.3,1,.09,3.7);
    bridges.sheet(0xd3c59f,[0,1.6,1],[0,3.8,1],[0,3.8,-1.5],[0,1.6,-1.5]);
  });
  }
  bridges.finish(group);
  const {livestock,...metrics}=detail;livestock?.refreshColliders();
  return {group,world:localWorld,metrics,livestock};
}

async function changeRegion(id){
  if(switching||!FARMLAND_REGIONS[id])return;
  switching=true;ready=false;keys.clear();drag=null;$('region').disabled=true;$('loading').hidden=false;
  if(actor)actor.group.visible=false;
  for(const cached of landscapes.values())cached.group.visible=false;
  config=FARMLAND_REGIONS[id];regionPanel();select('overview');
  const started=performance.now();
  try{
    if(!landscapes.has(id))landscapes.set(id,await buildLandscape());
    const cached=landscapes.get(id);cached.group.visible=true;world=cached.world;colliders=world.colliders;metrics=cached.metrics;
    cameraObstruction=createCameraObstruction(world);
    if(!actor){
      actor=createCharacter({role:'traveler',look:ROLLO_LOOK,armed:true,hat:false});actor.setWeapon('oak-staff');scene.add(actor.group);actor.group.visible=false;
      actor.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});
    }
    const [cx,,cz]=config.views.overview.target;sun.position.set(cx+180,600,cz+245);sun.target.position.set(cx,0,cz);
    // Submit complete static geometry before the first review frame.
    await renderer.compileAsync(scene,camera);ready=true;select('overview');renderer.shadowMap.needsUpdate=true;render();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));$('loading').hidden=true;
    readyMs=Math.round(performance.now()-started);
    const url=new URL(location.href);url.searchParams.set('region',id);history.replaceState(null,'',url);
  }finally{switching=false;$('region').disabled=false;}
}
function buildError(error){console.error(error);$('progress').textContent=error.message;window.__FARMLAND_REVIEW_ERROR__=error.stack;}
$('region').onchange=e=>changeRegion(e.target.value).catch(buildError);
  window.__FARMLAND_REVIEW__={view:select,walk,advance,condition,snapshot:()=>campaign.snapshot(),get ready(){return ready&&!switching;},region:()=>config.id,selectRegion:changeRegion,
    get metrics(){return {...metrics,capacity:config.capacity(),readyMs};},
    stats:()=>({...renderer.info.render,geometries:renderer.info.memory.geometries}),livestock:()=>landscapes.get(config.id)?.livestock?.state(),
    inspectParcel:(crop)=>{
      if(!ready)return false;
      const farm=config.farms.find(f=>f.fields.some(p=>p.crop===crop)),field=farm?.fields.find(p=>p.crop===crop);if(!field)return false;
      mode='orbit';keys.clear();actor.group.visible=false;
      let x=field.x,z=field.z;
      if(crop==='pasture'){
        const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);},index=farm.fields.indexOf(field);
        x+=(random(index*19)-.5)*(field.width-6);z+=(random(150+index*19)-.5)*(field.depth-6);
      }
      target.set(x,world.heightAt(x,z)+.6,z);yaw=.65;pitch=crop==='pasture'?.27:.2;distance=crop==='pasture'?6:18;
      $('place').textContent=`${config.name} · ${farm.name} · ${crop}`;render();return true;
    },
    position:()=>position.toArray(),walkFor:(seconds,input={forward:1,side:0})=>{for(let t=0;t<seconds;t+=1/60){time+=1/60;move(input,1/60);}return position.toArray();},
    canStandAt:(x,z)=>canStand(x,z,world,.34),colliders:()=>colliders.length,
    look:(angle,elevation,zoom)=>{yaw=angle;pitch=elevation;distance=zoom;render();return {focus:target.toArray(),position:camera.position.toArray()};},
    routeAudit:()=>{const blocked=[];for(const [laneIndex,lane] of config.lanes.entries())for(let i=1;i<lane.length;i++){
      const [ax,az]=lane[i-1],[bx,bz]=lane[i],n=Math.ceil(Math.hypot(bx-ax,bz-az));for(let j=0;j<=n;j++){const x=ax+(bx-ax)*j/n,z=az+(bz-az)*j/n;if(!canStand(x,z,world,.34))blocked.push({lane:laneIndex,x,z});}
    }return blocked;},
  };
select('overview');requestAnimationFrame(tick);
changeRegion(config.id).catch(buildError);
